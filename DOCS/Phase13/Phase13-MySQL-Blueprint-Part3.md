# PHASE 13 — BẢN THIẾT KẾ KIẾN TRÚC HẠ TẦNG MYSQL-NATIVE (PHẦN 3/3)

---

# MA TRẬN PHÂN TÍCH TÁC ĐỘNG HẠ TẦNG

## Bảng phân tích tài nguyên phần cứng khi gộp Phase 11 + Phase 12 lên Phase 13

| Chiều phân tích | HTTP Thường | AI SSE Stream | VNPay Webhook & Cron |
|---|---|---|---|
| **RAM nền** | 45MB | 120MB + lũy tiến theo Context Window (max 1024MB khi 15 streams × ~68MB mỗi stream) | 60MB |
| **Socket** | Short-lived (ms-level) | Long-lived (tối đa 60s timeout — aiController dòng 209) | Short-lived (ms-level) |
| **Đĩa cứng IOPS** | Thấp (đọc tĩnh) | Trung bình (Redis cache ghi đệm Sliding Window History) | Cực cao (MySQL khóa hàng transaction — GET_LOCK + row LOCK.UPDATE + Advisory Lock) |
| **Kết nối DB** | 1 connection/request | 1-5 connections/stream (tối đa 5 function calls × Sequelize query) | 2-3 connections/webhook (Booking LOCK + Schedule LOCK + raw SQL) |
| **Kết nối Redis** | 0 (không dùng) | 1 connection/stream (Sliding Window + idempotency) | 1 connection/cron (idempotency store) |
| **CPU** | Thấp | Trung bình (JSON parse + regex Zalgo clean + function dispatch) | Cao (crypto.createHmac SHA512 + qs.stringify sort + transaction retry) |
| **Băng thông ra** | 0 | Cao (Gemini API gọi liên tục — 443 HTTPS tới googleapis.com) | Trung bình (VNPay QueryDR — 443 HTTPS tới vnpayment.vn) |
| **Concurrent max** | Không giới hạn (rate limit 10r/s) | 15 streams đồng thời (aiController dòng 14-15: MAX_STREAMS=15) | 5 batch song song (paymentController dòng 643: batch size 5) |

### Tổng hợp tài nguyên tối đa (Worst Case)

| Tài nguyên | Giá trị tối đa | Cách tính |
|---|---|---|
| RAM Backend | 1024MB (heap) + 1024MB (C++ Allocator overhead) = 2048MB | `--max-old-space-size=1024` + native overhead headroom |
| MySQL connections | 150 (max_connections) | 120 pool (max=120, min=10) + 30 dự phòng |
| Redis memory | 128MB (maxmemory) | volatile-lru eviction (chỉ xóa key có TTL) |
| Active sockets | 15 SSE + 32 upstream keepalive + 64 Gemini sockets | aiController + nginx + https.Agent |
| Disk temp | 0 bytes Nginx temp | `proxy_max_temp_file_size 0` + `proxy_request_buffering off` |

---

# SƠ ĐỒ KỸ THUẬT BẮT BUỘC

## Khối 1: Sơ đồ chu kỳ vòng đời kết nối lâu (SSE Lifecycle — Phân Khu 3 & 7)

```mermaid
sequenceDiagram
    participant Client as Browser/ChatInput.jsx
    participant Nginx as Nginx Proxy
    participant Backend as Node.js Backend
    participant Gemini as Gemini API
    participant MySQL as MySQL DB
    participant Redis as Redis Cache

    Client->>Nginx: POST /api/v1/ai/chat (SSE)
    Note over Nginx: location /api/v1/ai/chat<br/>proxy_buffering off<br/>gzip off<br/>proxy_read_timeout 60s

    Nginx->>Backend: Proxy pass (keepalive 32)
    Note over Backend: Guard #2: activeStreams++ (max 15)<br/>Guard #8: SSE Headers<br/>Guard #9: Heartbeat 15s<br/>Guard #10: Hard Timeout 60s

    Backend->>Gemini: sendMessageStream (HTTPS 443)
    Note over Gemini: keepAlive Agent<br/>maxSockets 64

    loop Function Calling Loop (max 5 calls)
        Gemini-->>Backend: functionCall request
        Backend->>MySQL: Sequelize query (Op.eq on date)
        MySQL-->>Backend: DB Result
        Backend->>Redis: Cache Sliding Window (TTL 7200s)
        Redis-->>Backend: OK
        Backend->>Gemini: functionResponse
    end

    loop Streaming chunks
        Gemini-->>Backend: delta text chunk
        Backend-->>Nginx: data: {"text": "[STREAM_CHUNK_DATA]"}\n\n
        Nginx-->>Client: SSE event (no buffering)
    end

    alt User closes tab
        Client-xNginx: TCP FIN
        Note over Nginx: proxy_ignore_client_abort off<br/>→ Close upstream immediately
        Nginx-xBackend: Connection close
        Note over Backend: req.on('close')<br/>isClientConnected = false<br/>RELEASE_LOCK if held<br/>redis.discard() if pipeline open
    end

    alt Hard Timeout 60s
        Note over Backend: setTimeout 60s → ac.abort()<br/>res.write('[TIMEOUT]')<br/>res.end()
    end

    Note over Backend: finally block:<br/>clearInterval(heartbeat)<br/>clearTimeout(hardTimeout)<br/>activeStreams-- (Math.max 0)<br/>res.write('[DONE]')<br/>res.end()
```

## Khối 2: Sơ đồ lớp proxy bảo vệ và dồn cổng kết nối (Phần 1 & 2)

```mermaid
graph TB
    subgraph Internet
        CF[Cloudflare CDN<br/>CF-Connecting-IP]
        VNPay[VNPay Gateway<br/>*.vnpayment.vn:443]
        Gmail[Gmail SMTP<br/>smtp.gmail.com:587/465]
        GeminiAPI[Gemini API<br/>*.googleapis.com:443]
    end

    subgraph DockerHost["Docker Host (daemon.json: userland-proxy=false)"]
        subgraph FrontNet["frontend-net (MTU 1400)"]
            subgraph FE["app-frontend (256M RAM)"]
                NGINX[Nginx Unprivileged<br/>:8080 internal<br/>worker_rlimit_nofile 8192]
            end
        end

        subgraph BackNet["backend-net (MTU 1400)"]
            subgraph BE["app-backend (2048M RAM, init:true)"]
                NODE[Node.js :8080<br/>TZ=Asia/Ho_Chi_Minh<br/>max-old-space-size=1024<br/>15 SSE streams max]
            end

            subgraph DB["db-mysql (1024M RAM)"]
                MYSQL_DB[MySQL 8.0<br/>TZ=UTC<br/>max_connections=150<br/>innodb_buffer_pool_size=256M<br/>table_open_cache=2000<br/>mysql_native_password]
            end

            subgraph CACHE["redis-cache (512M RAM)"]
                REDIS_DB[Redis 7<br/>maxmemory 128mb<br/>volatile-lru<br/>appendonly yes]
            end
        end
    end

    CF -->|"0.0.0.0:80→8080"| NGINX
    NGINX -->|"upstream keepalive 32<br/>/api/ proxy_buffering on<br/>/api/v1/ai/chat proxy_buffering off<br/>/socket.io/ Upgrade WebSocket<br/>proxy_next_upstream error invalid_header"| NODE
    NODE -->|"Pool max=120 min=10<br/>idle=10000 acquire=5000<br/>afterConnect SET tz +07:00"| MYSQL_DB
    NODE -->|"ioredis family:4<br/>enableOfflineQueue:false<br/>TTL 7200s"| REDIS_DB
    NODE -->|"https.Agent keepAlive<br/>maxSockets 64"| GeminiAPI
    NODE -->|"axios timeout 10s"| VNPay
    NODE -->|"nodemailer family:4"| Gmail

    MYSQL_DB -.->|"CẤM expose 3306"| Internet
    REDIS_DB -.->|"CẤM expose 6379"| Internet

    style MYSQL_DB fill:#e74c3c,color:#fff
    style REDIS_DB fill:#e74c3c,color:#fff
    style NGINX fill:#2ecc71,color:#fff
    style NODE fill:#3498db,color:#fff
```

## Khối 3: Sơ đồ máy trạng thái FSM đặt lịch khám (Phân Khu 8)

```mermaid
stateDiagram-v2
    [*] --> S1: POST /bookings<br/>createPaymentUrl<br/>Schedule.increment(currentNumber)

    S1 --> S1_CHECK: Cutoff Check<br/>createdAt < UTC_TIMESTAMP()-20min?

    S1_CHECK --> S4_EXPIRED: YES - Expired<br/>paymentStatus=expired<br/>Schedule.decrement(currentNumber)

    S1_CHECK --> S1_RESUME: NO - Resume<br/>Reuse paymentToken<br/>Rebuild VNPay URL

    S1 --> S1_5: POST /verify-book-appointment<br/>Email verification confirmed<br/>statusId=S1.5

    S1_5 --> VNPAY_REDIRECT: POST /create-payment-url-by-token<br/>buildVnpayUrl(paymentToken, price)

    S1_5 --> S2_FREE: bookingPrice === 0<br/>Bypass VNPay<br/>paymentStatus=paid

    VNPAY_REDIRECT --> VNPAY_GATEWAY: Redirect to VNPay<br/>SHA512 HMAC checksum

    VNPAY_GATEWAY --> IPN_SUCCESS: vnp_ResponseCode=00<br/>IPN webhook received

    VNPAY_GATEWAY --> IPN_FAIL: vnp_ResponseCode!=00<br/>IPN webhook received

    IPN_SUCCESS --> S2: statusId=S2<br/>paymentStatus=paid<br/>Lock Booking FIRST<br/>vnpayTransactionNo saved<br/>generateReceiptToken<br/>sendBookingEmail async

    IPN_FAIL --> S4_FAILED: statusId=S4<br/>paymentStatus=failed<br/>Lock Booking FIRST<br/>Lock Schedule SECOND<br/>Schedule.decrement(currentNumber)

    S1_5 --> CRON_CHECK: cleanupS1 Cronjob<br/>GET_LOCK cron_cleanup_s1 30s<br/>updatedAt < UTC_TIMESTAMP()-20min?

    CRON_CHECK --> STRIKE1: reconcileFirstSeenAt IS NULL<br/>Mark first seen

    STRIKE1 --> CRON_CHECK: Wait next cron cycle

    CRON_CHECK --> QUERYDR: reconcileFirstSeenAt < UTC_TIMESTAMP()-10min<br/>vnpayQuerydr OUTSIDE transaction

    QUERYDR --> S2_RECONCILE: qdr.status=paid<br/>Short transaction:<br/>Lock Booking<br/>statusId=S2<br/>generateReceiptToken

    QUERYDR --> S4_RECONCILE: qdr.status!=paid<br/>Short transaction:<br/>Lock Booking<br/>Lock Schedule<br/>statusId=S4<br/>Schedule.decrement

    S2 --> S3: Doctor confirms<br/>POST /bookings/:id/remedy<br/>statusId=S3

    S3 --> REVIEW: POST /reviews<br/>UNIQUE(bookingId)<br/>rating 1-5

    S4_EXPIRED --> [*]
    S4_FAILED --> [*]
    S4_RECONCILE --> [*]

    note right of S1
        Lock Order: Schedule FIRST → Booking SECOND
        Guard #37: Prevent deadlock
        Guard #44: Composite unique index
        (doctorId, date, timeType)
    end note

    note right of IPN_SUCCESS
        LOCK ORDER EXCEPTION (IPN):
        Booking FIRST → Schedule SECOND
        Guard #38: Retry errno 1213/1205
        Guard #40: timingSafeEqual
    end note

    note right of CRON_CHECK
        Guard #36: GET_LOCK advisory
        Guard #52: 2-Strike reconcile
        Guard #15: Batch=5 concurrent
        Deadlock retry: 3 attempts max
        Exponential Backoff: 100ms base
        Delay = 100ms * 2^(attempt-1)
        Attempt 1: 100ms, Attempt 2: 200ms, Attempt 3: 400ms
    end note
```

---

# PHÁN QUYẾT CUỐI CÙNG

> [!IMPORTANT]
> ## [🚀 ARCHITECTURAL SPECIFICATION COMPLETE: BẢN THIẾT KẾ KIẾN TRÚC HẠ TẦNG SẴN SÀNG CHUYỂN GIAO CHO ĐỘI NGŨ PHÁT TRIỂN LẬP TRÌNH!]

### Tổng kết bản thiết kế:

| Hạng mục | Số lượng |
|---|---|
| Phân khu thẩm định | 8 phân khu (PK1-PK8) |
| Quy tắc ràng buộc kỹ thuật | 56 quy tắc (QT-1.1 đến QT-8.7) |
| Phần đầu ra đặc tả | 3 phần (nginx.conf, docker-compose.yml, .env) |
| Sơ đồ kiến trúc Mermaid | 3 khối (SSE Lifecycle, Proxy Shield, Booking FSM) |
| Raw SQL đã rà soát | 11 câu lệnh |
| CamelCase Aliases xác nhận | 22 aliases |
| BLOB tables xác nhận | 3 bảng (Users, Clinics, Specialties) |
| Composite Indexes xác nhận | 7 indexes trên Booking + Schedule + Review + Token |
| Models đã đọc hiểu | 10 files (9 models + index.js) |
| Controllers đã rà soát | 9 controllers |
| Services đã phân tích | 12 services |
| Guards kế thừa Phase 11 | 64 guards |
| Guards kế thừa Phase 12 | 29+ guards |

### Điểm khác biệt cốt lõi so với tài liệu Phase 13 cũ (PostgreSQL):

| Hạng mục | Tài liệu cũ | Tài liệu mới (MySQL-Native) |
|---|---|---|
| Database | PostgreSQL 16 | MySQL 8.0 |
| Advisory Lock | `pg_advisory_lock` | `GET_LOCK / RELEASE_LOCK` |
| Date function | `NOW() - INTERVAL '20 minutes'` | `DATE_SUB(NOW(), INTERVAL 20 MINUTE)` |
| Deadlock errno | `40P01` | `1213 / 1205` |
| Timezone check | `SHOW timezone` | `SELECT @@session.time_zone` |
| Driver | `pg` + `pg-hstore` | `mysql2` (giữ nguyên) |
| afterConnect hook | Không cần | BẮT BUỘC giữ `SET time_zone = '+07:00'` |
| table_names | Case-insensitive | `lower-case-table-names=0` (case-sensitive Linux) |
| Block AI SSE riêng | Không có | Có — `location /api/v1/ai/chat` riêng biệt |
| Redis production | Chưa đặc tả TTL | TTL 7200s + enableOfflineQueue false + MULTI/EXEC |
| Graceful Shutdown | Đơn giản | 8 bước chi tiết + RELEASE_LOCK + redis.discard() |
| Entropy Guard | Không có | `/dev/urandom:/dev/urandom:ro` mount 4 containers |
| MySQL tuning | Không có | `table_open_cache=2000 innodb_buffer_pool_size=256M` |
| Pool formula | Không có | `(max_connections - 30) / instances` |
