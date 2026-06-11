# PHASE 13 — BẢN THIẾT KẾ KIẾN TRÚC HẠ TẦNG MYSQL-NATIVE (PHẦN 2/3)

---

# PHÂN KHU 7: QUY TẮC AN TOÀN TÀI NGUYÊN KHI XỬ LÝ PAYLOAD NHỊ PHÂN VÀ STREAMING AI

## 7.1. Chống cạn kiệt cổng kết nối Upstream

| Quy tắc | Chi tiết |
|---|---|
| **QT-7.1a** | Tại `nginx.conf`, block `/api/` và block AI Stream BẮT BUỘC thêm: `proxy_http_version 1.1;` `proxy_set_header Connection "";`. Đối với block điều hướng luồng API xử lý thanh toán (phương thức POST phi định danh — Non-idempotent), chỉ thị BẮT BUỘC: `proxy_next_upstream error invalid_header;`. LOẠI Bỏ HOÀN TOÀN hai cờ lệnh `timeout` và `http_503` ra khỏi dải `proxy_next_upstream` để ngăn chặn hành vi Nginx tự động gửi lại request làm nhân bản giao dịch VNPay hoặc lặp cuộc gọi tốn tài nguyên sang Gemini API. |
| **QT-7.1b** | Phối hợp khối `upstream backend_nodes { server app-backend:8080; keepalive 32; }` để Nginx tái sử dụng socket, triệt tiêu nguy cơ sập dải cổng hệ thống. Port backend duy nhất: `8080` (server.js dòng 68). CẤM sử dụng cổng `3000` — giá trị lỗi thời đã bị loại bỏ vĩnh viễn. |
| **QT-7.1c** | `client_max_body_size 50M;` — đồng bộ với Express `bodyParser.json({ limit: '50mb' })` để hỗ trợ BLOB('long'). Giá trị 50mb là mốc chuẩn duy nhất cho toàn hệ thống lớp parser JSON. |

## 7.2. Triệt tiêu lỗi tràn đĩa tạm Nginx

| Quy tắc | Chi tiết |
|---|---|
| **QT-7.2** | Tại block `/api/` và tuyến AI stream: `proxy_max_temp_file_size 0;` — ép Nginx hoạt động pure streaming pass-through, đẩy data thô từ socket client sang Backend, giải phóng ổ đĩa host. |

## 7.3. Chống khóa chết Event Loop do log dữ liệu lớn

Bằng chứng: `sanitizeLog.js` dòng 7-11 đã có SENSITIVE_KEYS filter, nhưng CHƯA lọc Base64.

| Quy tắc | Chi tiết |
|---|---|
| **QT-7.3** | BẮT BUỘC bổ sung filter loại bỏ trường chứa Base64 (image) trước khi xuất log stdout/stderr: Kiểm tra giá trị bắt đầu bằng `data:image/` hoặc có độ dài vượt 10000 ký tự → thay thế bằng `[BASE64_STRIPPED length=N]`. Tránh Node.js block đồng bộ render hàng triệu ký tự. |

## 7.4. Chống treo cứng đơn luồng khi giải mã JSON ảnh cực đại

Bằng chứng: Express `bodyParser.json({ limit: '50mb' })` (server.js dòng 44) parse synchronous. Giá trị `50mb` đã được chuẩn hóa đồng bộ với `client_max_body_size 50M` của Nginx (xem QT-7.1c).

| Quy tắc | Chi tiết |
|---|---|
| **QT-7.4** | Lập trình viên xử lý endpoint tạo mới Clinic/Specialty/User nhận Base64 lớn BẮT BUỘC: (a) Tách biệt cấu hình stream-parser hoặc busboy cho luồng Buffer thô bất đồng bộ, HOẶC (b) Bọc tiến trình xử lý Base64 nặng vào `worker_threads` độc lập. Mục đích: bảo vệ Event Loop lõi thông suốt, không đóng băng Heartbeat 15s (`aiController.js` dòng 202) của 15 kết nối SSE đang hoạt động. |

## 7.5. Tái sử dụng socket cho Gemini API

Bằng chứng: `aiService.js` dòng 14 `new GoogleGenerativeAI(process.env.GEMINI_API_KEY)` — mỗi request tạo kết nối mới.

| Quy tắc | Chi tiết |
|---|---|
| **QT-7.5** | BẮT BUỘC khởi tạo tại tệp gọi Gemini API: `const agent = new https.Agent({ keepAlive: true, maxSockets: 64, keepAliveMsecs: 5000 });` để tái sử dụng socket chiều ra, triệt tiêu hao phí bắt tay TLS. Truyền agent vào cấu hình request options. |

---

# PHÂN KHU 8: KIÊN CỐ HÓA TÀI NGUYÊN VÀ PHÒNG THỦ KHÓA PHÂN TÁN MySQL

## 8.1. Tối ưu hóa bộ nhớ đệm Table Cache

Bằng chứng: AI Chatbot `universalSystemSearch` thực hiện JOIN chéo qua 9 bảng (User → Doctor_Info → Specialty → Clinic → Allcode) với limit 10 records.

| Tham số MySQL | Giá trị | Lý do |
|---|---|---|
| `--table_open_cache` | `2000` | Cache file descriptor cho 9 bảng × nhiều kết nối đồng thời |
| `--table_definition_cache` | `2000` | Cache cấu trúc bảng trong RAM |
| `--max_connections` | `150` | Đủ cho pool Sequelize + cronjob + maintenance |
| `--innodb_buffer_pool_size` | `256M` | Xử lý toàn bộ index trên RAM, chặn I/O đĩa dưới tải concurrent |

Nhúng tham số qua `command:` của service `db-mysql` trong docker-compose.yml.

## 8.2. Khóa hàng bảo vệ Booking FSM

Bằng chứng: `paymentController.js` dòng 187 `lock: t.LOCK.UPDATE` cho Schedule, dòng 373 cho Booking trong IPN.

| Quy tắc | Chi tiết |
|---|---|
| **QT-8.2a** | Khi cập nhật trạng thái lịch hẹn (S1→S2→S3→S4) hoặc tăng/giảm `currentNumber` tại Schedule, BẮT BUỘC dùng `lock: transaction.LOCK.UPDATE`. |
| **QT-8.2b** | Lock Order: `createPaymentUrl` → Schedule TRƯỚC → Booking SAU (paymentController dòng 177). `vnpayIpn` → Booking TRƯỚC → Schedule SAU (dòng 369 — Lock Order Exception). Deadlock được kiểm soát bởi retry errno 1213/1205 (dòng 785). |

## 8.3. Tính nguyên tử Redis cho lịch sử chat

| Quy tắc | Chi tiết |
|---|---|
| **QT-8.3a** | Thao tác mảng lịch sử chat trên Redis BẮT BUỘC bọc `MULTI/EXEC` hoặc Redis Pipeline (ioredis). |
| **QT-8.3b** | Nội dung Lua script phải là chuỗi ký tự tĩnh. Tham số bệnh nhân truyền qua `KEYS` và `ARGV`. |
| **QT-8.3c** | Khi user ngắt tab SSE, Backend BẮT BUỘC gọi `await redis.discard()` để xóa hàng đợi pipeline, giải phóng socket tức thì. |

## 8.4. Công thức Pool kết nối Sequelize

```
Sequelize_Max_Pool = (MySQL_Max_Connections - 30) / Total_Backend_Instances
```

Với `max_connections=150` và 1 Backend instance: `(150 - 30) / 1 = 120`.
Dự phòng 30 kết nối cho cronjob `cleanupS1` và bảo trì nội bộ.

Bằng chứng hiện tại: `models/index.js` dòng 20-22 chỉ có `pool: { acquire: 5000 }` — thiếu `max`, `min`, `idle`. BẮT BUỘC bổ sung.

**Cấu hình pool bọc cứng Enterprise bắt buộc tại `models/index.js`:**

```javascript
const sequelize = new Sequelize(dbName, dbUser, dbPass, {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  dialect: 'mysql',
  timezone: '+07:00',
  logging: false,
  pool: {
    max: 120,      // Trị số cứng: (150 - 30) / 1 = 120 kết nối tối đa
    min: 10,       // Duy trì 10 kết nối nền ổn định cho hệ thống
    idle: 10000,   // Giải phóng kết nối thừa sau 10 giây không hoạt động
    acquire: 5000  // Hard timeout: ngắt nếu không cấp phát socket sau 5 giây
  },
  dialectOptions: {
    connectTimeout: 5000
  }
});
```

| Tham số | Giá trị | Lý do |
|---|---|---|
| `pool.max` | `120` | Định lượng cứng: (150 - 30) / 1 = 120 — tối đa hóa throughput mà không xâm lấn dải dự phòng |
| `pool.min` | `10` | Duy trì mạch kết nối nền ổn định, tránh cold-start delay khi burst request |
| `pool.idle` | `10000` | Giải phóng kết nối dư thừa về trạng thái nghỉ sau 10 giây |
| `pool.acquire` | `5000` | Hard timeout 5 giây: ngắt nếu pool cạn kiệt, tránh treo Event Loop |

## 8.5. Graceful Shutdown

| Bước | Timeout | Chi tiết |
|---|---|---|
| 1. Nhận SIGTERM/SIGINT | 0s | Chuyển trạng thái `isDraining = true` |
| 2. `server.close()` | 0s | Tắt tiếp nhận request mới |
| 3. Chờ SSE streams | 10s | Giải phóng tối đa 15 kết nối SSE đang hoạt động |
| 4. Commit/Rollback transactions | 10s | Hoàn tất hoặc hủy toàn bộ transaction pending |
| 5. RELEASE_LOCK | 10s | Giải phóng tất cả Advisory Lock GET_LOCK đang mở |
| 6. `sequelize.close()` | 5s | Đóng pool kết nối MySQL |
| 7. `redis.disconnect()` | 2s | Đóng kết nối Redis |
| 8. `process.exit(0)` | — | Thoát an toàn |

Hard deadline: `setTimeout(() => process.exit(1), 15000).unref()` — thoát cưỡng bức nếu vượt 15s.

## 8.6. Socket.IO Proxy Upgrade

| Chỉ thị Nginx | Giá trị |
|---|---|
| `proxy_set_header Upgrade` | `$http_upgrade` |
| `proxy_set_header Connection` | `"Upgrade"` |
| `proxy_set_header X-Forwarded-Proto` | `$scheme` |
| `proxy_read_timeout` | `3600s` |
| `proxy_http_version` | `1.1` |
| Keepalive upstream | `keepalive 32` |

Đặt tại block `location /socket.io/` riêng biệt.

## 8.7. Tắt Userland Proxy Docker

| Cấu hình | Chi tiết |
|---|---|
| File | `/etc/docker/daemon.json` trên host vật lý |
| Nội dung | `{"userland-proxy": false}` |
| Lý do | Docker sử dụng trực tiếp iptables, bảo toàn hiệu năng mạng lõi |

---

# PHẦN 1: BẢN THIẾT KẾ CẤU HÌNH nginx.conf

## Đặc tả đầy đủ các khối lệnh

**Tham số Worker Level:**

| Chỉ thị | Giá trị | Lý do |
|---|---|---|
| `worker_processes` | `auto` | Auto-detect số CPU core |
| `worker_cpu_affinity` | `auto` | Pin worker vào core, chống thrashing |
| `worker_rlimit_nofile` | `8192` | Chặn nghẽn file descriptor — đảm bảo quy tắc kiến trúc hở: `worker_rlimit_nofile >= worker_connections * 2` (8192 >= 2048 * 2) tránh lỗi cạn kiệt File Descriptor (EMFILE) |
| `worker_connections` | `2048` | Tối đa kết nối per worker |
| `multi_accept` | `on` | Accept nhiều kết nối 1 lượt |

**Upstream Block:**

| Chỉ thị | Giá trị |
|---|---|
| `upstream backend_nodes` | `server app-backend:8080;` |
| `keepalive` | `32` |
| `keepalive_timeout` | `65s` |
| `keepalive_requests` | `10000` |

> **[!IMPORTANT]**
> **Quy tắc đồng bộ keepalive bắt buộc:** Backend Node.js PHẢI cấu hình tham số `server.maxRequestsPerSocket = 10000` đồng điệu với `keepalive_requests 10000` của Nginx. Nếu Backend tự ngắt kết nối sớm hơn Nginx kỳ vọng, Nginx sẽ nhận gói tin `TCP RST` và trả về lỗi `502 Bad Gateway` cho client.

**Block nhận payload nhị phân ảnh Base64 phòng khám cực đại (bổ sung cho location `/api/`):**

| Chỉ thị | Giá trị | Lý do |
|---|---|---|
| `client_body_buffer_size` | `50M` | Ép Nginx luân chuyển luồng dữ liệu thô trực tiếp trên RAM, triệt tiêu hoàn toàn hành vi ghi đệm xuống phân vùng đĩa tạm vật lý `/var/cache/nginx/client_body_temp` |
| `proxy_request_buffering` | `off` | Truyền luồng request body thẳng từ client sang Backend mà không đệm lên đĩa, phối hợp `client_body_buffer_size 50M` để giải phóng I/O |

**Tham số HTTP Level:**

| Chỉ thị | Giá trị | Lý do |
|---|---|---|
| `client_max_body_size` | `50M` | BLOB('long') Base64 upload |
| `proxy_connect_timeout` | `75s` | Chống NAT firewall drop |
| `proxy_headers_hash_max_size` | `512` | Header hash overflow |
| `proxy_headers_hash_bucket_size` | `128` | Bucket size |
| `resolver` | `127.0.0.11 ipv6=off valid=30s` | Docker DNS |
| `limit_req_zone` | `$binary_remote_addr zone=api_zone:10m rate=10r/s` | Anti-DDoS |
| `real_ip_header` | `CF-Connecting-IP` | Cloudflare IP |
| `set_real_ip_from` | Danh sách đầy đủ 14 dải IPv4 + 7 dải IPv6 Cloudflare | Chống giả mạo |
| `gzip_types` | `text/plain text/css application/json application/javascript text/xml application/xml` | Nén static |
| `gzip_min_length` | `256` | Tối thiểu 256 bytes mới nén |

---

# PHẦN 2: BẢN THIẾT KẾ DÀN XẾP docker-compose.yml

## Đặc tả chi tiết từng Service

### Service: db-mysql

| Tham số | Giá trị |
|---|---|
| Image | `mysql:8.0` |
| `TZ` | `UTC` |
| `MYSQL_ROOT_PASSWORD` | Từ `env_file` |
| `MYSQL_DATABASE` | `bookingcare` |
| `MYSQL_USER` | `bookingcare_user` |
| `MYSQL_PASSWORD` | Từ `env_file` |
| command | `--default-authentication-plugin=mysql_native_password --default-time-zone=+00:00 --table_open_cache=2000 --table_definition_cache=2000 --max_connections=150 --innodb_buffer_pool_size=256M --lower-case-table-names=0 --character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci` |
| Volume | `mysql_data:/var/lib/mysql` |
| Healthcheck | `mysqladmin ping -h localhost -u root -p$$MYSQL_ROOT_PASSWORD` |
| Deploy limits memory | `1024M` |
| Deploy limits cpus | `1.0` |
| ulimits nofile soft/hard | `65536` / `65536` |
| Logging max-size | `10m` |
| Logging max-file | `3` |
| Entropy mount | `/dev/urandom:/dev/urandom:ro` |
| CẤM ports expose | Chỉ nội bộ backend-net |

### Service: redis-cache

| Tham số | Giá trị |
|---|---|
| Image | `redis:7-alpine` |
| `env_file` | `.env` |
| command | `redis-server --requirepass $REDIS_PASSWORD --maxmemory 128mb --maxmemory-policy volatile-lru --appendonly yes` |
| Volume | `redis_data:/data` |
| Healthcheck | `REDISCLI_AUTH=$$REDIS_PASSWORD redis-cli ping` |
| Deploy limits memory | `512M` |
| Logging | `10m` / `3` files |
| Entropy mount | `/dev/urandom:/dev/urandom:ro` |
| CẤM ports expose | Chỉ nội bộ backend-net |

> **[!IMPORTANT]**
> **Chính sách eviction `volatile-lru`:** Redis chỉ được phép evict xóa bỏ các key có cài đặt TTL (chuỗi lịch sử chat AI cũ — TTL 7200s). Các mốc khóa Idempotency Key không có TTL của giao dịch thanh toán VNPay được bảo vệ tuyệt đối khỏi việc bị xóa tự động. RAM nâng lên `512M` để tạo khoảng trống headroom an toàn cho cơ chế lưu file sao lưu AOF đĩa cứng ngầm.

### Service: app-backend

| Tham số | Giá trị |
|---|---|
| Build context | `.` (bookingcare-backend) |
| Dockerfile | `Dockerfile` |
| `env_file` | `.env` |
| `init` | `true` — Giải phóng Node.js khỏi vai trò PID 1, bảo đảm bắt trọn vẹn tín hiệu dừng SIGTERM phục vụ quy trình 8 bước Graceful Shutdown |
| `TZ` | `Asia/Ho_Chi_Minh` |
| `NODE_OPTIONS` | `--max-old-space-size=1024` |
| Deploy limits memory | `2048M` (heap 1024M + C++ Allocator native overhead 1024M — triệt tiêu lỗi sập nguồn container Exit Code 137) |
| Deploy limits cpus | `1.5` |
| ulimits nofile | `65536` / `65536` |
| expose | `8080` (nội bộ, CẤM ports) |
| `dns` | `8.8.8.8` |
| Healthcheck | `node -e "fetch('http://localhost:8080/api/health').then(r=>{if(!r.ok)throw 1}).catch(()=>process.exit(1))"` timeout 2s |
| depends_on | `db-mysql: condition: service_healthy`, `redis-cache: condition: service_healthy` |
| Volumes | `backend_uploads:/app/uploads`, `/dev/urandom:/dev/urandom:ro` |
| Logging | `10m` / `3` files |
| stop_grace_period | `30s` |
| networks | `frontend-net`, `backend-net` |

### Service: app-frontend

| Tham số | Giá trị |
|---|---|
| Build context | `../bookingcare-frontend` |
| Build args | `VITE_BACKEND_URL`, `VITE_APP_NAME` (Build-Time ARG) |
| ports | `0.0.0.0:80:8080` |
| Deploy limits memory | `256M` |
| ulimits nofile | `65536` / `65536` |
| tmpfs | `/tmp:size=256M`, `/var/cache/nginx:size=128M` |
| Volumes | `backend_uploads:/usr/share/nginx/uploads:ro` |
| Healthcheck | `wget --spider http://localhost:8080/` |
| depends_on | `app-backend: condition: service_healthy` |
| Logging | `10m` / `3` files |
| Entropy mount | `/dev/urandom:/dev/urandom:ro` |
| networks | `frontend-net` |

### Networks — Mô hình cô lập 3-Tier Network

> **[!IMPORTANT]**
> **NGHIÊM CẤM** sử dụng mạng phẳng bridge duy nhất cho toàn bộ 4 dịch vụ. Container Frontend (app-frontend) KHÔNG ĐƯỢC nhìn thấy hoặc giao tiếp trực tiếp với cổng thô của database (db-mysql:3306) hoặc cache (redis-cache:6379).

| Mạng | Dịch vụ tham gia | Mục đích cô lập | Driver | MTU |
|---|---|---|---|---|
| `frontend-net` | `app-frontend`, `app-backend` | Cô lập luồng Nginx ↔ Frontend ↔ Backend Node.js | `bridge` | `1400` |
| `backend-net` | `app-backend`, `db-mysql`, `redis-cache` | Cô lập hoàn toàn luồng Backend Node.js ↔ MySQL ↔ Redis | `bridge` | `1400` |

**Phân bổ mạng theo dịch vụ:**

| Dịch vụ | `frontend-net` | `backend-net` |
|---|---|---|
| `app-frontend` | ✅ | ❌ |
| `app-backend` | ✅ | ✅ |
| `db-mysql` | ❌ | ✅ |
| `redis-cache` | ❌ | ✅ |

### Volumes

| Volume | Driver |
|---|---|
| `mysql_data` | `local` |
| `redis_data` | `local` |
| `backend_uploads` | `local` |

### Host Config

| File | Nội dung |
|---|---|
| `/etc/docker/daemon.json` | `{"userland-proxy": false}` |

---

# PHẦN 3: TỆP ĐẶC TẢ THAM SỐ MÔI TRƯỜNG .env Production

| Biến | Giá trị mẫu | Ghi chú |
|---|---|---|
| `PORT` | `8080` | Port nội bộ Backend |
| `DB_HOST` | `db-mysql` | Tên service Docker |
| `DB_USERNAME` | `bookingcare_user` | User MySQL |
| `DB_PASSWORD` | `StrongP@ssw0rd2026` | CẤM ngoặc kép, escape `$` |
| `DB_NAME` | `bookingcare` | Tên database |
| `DB_PORT` | `3306` | Port MySQL nội bộ |
| `DB_DIALECT` | `mysql` | Driver Sequelize |
| `REDIS_HOST` | `redis-cache` | Tên service Docker |
| `REDIS_PORT` | `6379` | Port Redis nội bộ |
| `REDIS_PASSWORD` | `StrongRedisP@ss2026` | CẤM ký tự `#`, `$` phải escape |
| `EMAIL_APP_USERNAME` | `your-email@gmail.com` | Gmail SMTP |
| `EMAIL_APP_PASSWORD` | `xxxx xxxx xxxx xxxx` | App Password Gmail |
| `JWT_SECRET` | `bookingcare-secret-key-2026-production` | CẤM `#`, khoảng trắng |
| `URL_REACT` | `https://YOUR_DOMAIN.com` | CORS + email link |
| `VNP_TMN_CODE` | `YOUR_TMN_CODE` | Mã terminal VNPay |
| `VNP_HASH_SECRET` | `YOUR_HASH_SECRET` | Secret VNPay — nhân đôi `$$` nếu chứa `$` |
| `VNP_URL` | `https://sandbox.vnpayment.vn/paymentv2/vpcpay.html` | Gateway URL |
| `VNP_API_URL` | `https://sandbox.vnpayment.vn/merchant_webapi/api/transaction` | QueryDR URL |
| `VNP_RETURN_URL` | `https://YOUR_DOMAIN.com/payment-result` | Redirect sau thanh toán |
| `API_CRON_SECRET` | `your-cron-secret-key-production` | Header x-cron-secret cho cleanupS1 |
| `RECEIPT_FALLBACK_SECRET` | `your-64-byte-minimum-secret` | Receipt token generation |
| `GEMINI_API_KEY` | `AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX` | Google Gemini API |
| `AI_CHATBOT_ENABLED` | `true` | Kill-switch AI (aiController dòng 33) |
| `VITE_BACKEND_URL` | `https://YOUR_DOMAIN.com` | Build-Time ARG cho Frontend |
| `VITE_APP_NAME` | `BookingCare` | Build-Time ARG cho Frontend |
| `MYSQL_ROOT_PASSWORD` | `StrongRootP@ss2026` | Root password MySQL container |
