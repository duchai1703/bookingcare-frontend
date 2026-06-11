# PHASE 13 — PHẦN 7 & 8: VẬN HÀNH, GIÁM SÁT & LỘ TRÌNH THỰC THI

---

# PHẦN 7: VẬN HÀNH & GIÁM SÁT (OPS CHECKLIST)

---

## 7.1. Lệnh build chuẩn

```bash
# [THE DOCKER V2 COMPOSE GUARD]: Dùng docker compose (V2)
cd bookingcare-backend

# Build và chạy tất cả services
docker compose up --build -d --remove-orphans
```

---

## 7.2. Kiểm tra trạng thái

```bash
# Xem log tất cả services
docker compose logs -f

# Kiểm tra healthcheck
docker compose ps

# Xem log từng service
docker compose logs -f app-backend
docker compose logs -f app-frontend
docker compose logs -f db-postgres
docker compose logs -f redis-cache
```

---

## 7.3. Seed dữ liệu lần đầu

```bash
# Seed sẽ tự động chạy khi database trống (qua syncSchema trong models/index.js)
# Hoặc chạy thủ công:
docker compose exec app-backend node src/seeders/seedAllcode.js
```

---

## 7.4. CẢNH BÁO SINH TỬ

> [!CAUTION]
>
> ### CẢNH BÁO SINH TỬ 1: KHÔNG DÙNG `docker compose down -v`
>
> Flag `-v` XÓA TẤT CẢ volumes → MẤT TOÀN BỘ dữ liệu PostgreSQL + Redis!
>
> ```bash
> # ✅ ĐÚNG:
> docker compose down
> # ❌ SAI — MẤT DỮ LIỆU VĨNH VIỄN:
> docker compose down -v
> ```

> [!CAUTION]
>
> ### CẢNH BÁO SINH TỬ 2: REBUILD FE KHI ĐỔI BIẾN VITE\_
>
> [THE BUILD CACHE MIRAGE GUARD]: Biến VITE\_ được bake vào lúc build.
> Đổi biến PHẢI rebuild với `--no-cache`:
>
> ```bash
> docker compose build --no-cache app-frontend
> docker compose up -d app-frontend
> ```

> [!CAUTION]
>
> ### CẢNH BÁO SINH TỬ 3: DỌN RÁC IMAGE
>
> [THE DANGLING IMAGE SSD DRAIN GUARD]: ```bash
>
> docker image prune -f
>
> ```
>
> ```

> [!CAUTION]
>
> ### CẢNH BÁO SINH TỬ 4: KHÔNG SCALE BACKEND > 1
>
> [THE REPLICA SYNC DEADLOCK WARNING]: `sequelize.sync()` CHỈ CHẠY 1 CONTAINER BE.
>
> ```bash
> # ❌ CẤM:
> docker compose up --scale app-backend=3
> ```

---

## 7.5. Lệnh bảo trì

```bash
# Restart service cụ thể
docker compose restart app-backend

# Xem resource usage
docker stats

# Vào shell container
docker compose exec app-backend sh
docker compose exec db-postgres psql -U bookingcare_user -d bookingcare

# Backup database
docker compose exec db-postgres pg_dump -U bookingcare_user bookingcare > backup_$(date +%Y%m%d).sql

# Restore database
cat backup_20260428.sql | docker compose exec -T db-postgres psql -U bookingcare_user -d bookingcare
```

---

## 7.6. Redis Client File (Cần tạo mới)

**File:** `bookingcare-backend/src/utils/redisClient.js`

```javascript
// ═══════════════════════════════════════════════════════════════════════
// [Phase 13] Redis Client — Kết nối Redis cho Idempotency Store
// ═══════════════════════════════════════════════════════════════════════
const Redis = require("ioredis");

const redis = new Redis({
  host: process.env.REDIS_HOST || "redis-cache",
  port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  // [THE NODE 18 IPv6 DEADLOCK GUARD]: Ép IPv4
  family: 4,
  lazyConnect: true,
});

redis.on("error", (err) => {
  console.error("[REDIS ERROR]", err.message);
});

redis.on("connect", () => {
  console.log("✅ [REDIS] Connected");
});

module.exports = redis;
```

> [!IMPORTANT]
> Thêm `ioredis` vào `package.json`:
>
> ```bash
> npm install ioredis
> ```

---

# PHẦN 8: LỘ TRÌNH THỰC THI (12.1 ĐẾN 12.3)

---

## 12.1. GĐ 12.1 — PRE-DOCKER HARDENING (Ngày 1)

| #   | Công việc                            | File                       | Trạng thái |
| --- | ------------------------------------ | -------------------------- | ---------- |
| 1   | Sửa CORS thêm `maxAge: 86400`        | `server.js`                | ⬜         |
| 2   | Trust proxy dải nội bộ               | `server.js`                | ⬜         |
| 3   | Express body limit 50mb              | `server.js`                | ⬜         |
| 4   | NodeMailer ép IPv4 (`family: 4`)     | `emailService.js`          | ⬜         |
| 5   | Đổi VNP_RETURN_URL                   | `.env`                     | ⬜         |
| 6   | Tắt source map Vite                  | `vite.config.js`           | ⬜         |
| 7   | Graceful Shutdown (SIGTERM)          | `server.js`                | ⬜         |
| 8   | Kiểm tra .env (xóa quotes, escape $) | `.env`                     | ⬜         |
| 9   | Tạo `redisClient.js`                 | `src/utils/redisClient.js` | ⬜         |
| 10  | Cài `ioredis`, `pg`, `pg-hstore`     | `package.json`             | ⬜         |

---

## 12.2. GĐ 12.2 — DATABASE MIGRATION & DOCKERIZATION (Ngày 2-3)

| #   | Công việc                                   | File                   | Trạng thái |
| --- | ------------------------------------------- | ---------------------- | ---------- |
| 1   | Chuyển models/index.js sang PostgreSQL      | `models/index.js`      | ⬜         |
| 2   | Sửa paymentController.js (8 chỗ MySQL → PG) | `paymentController.js` | ⬜         |
| 3   | Sửa server.js timezone check                | `server.js`            | ⬜         |
| 4   | Sửa .env sang PostgreSQL config             | `.env`                 | ⬜         |
| 5   | `syncSchema()` bọc `alter: { drop: false }` | `models/index.js`      | ⬜         |
| 6   | Tạo Dockerfile Backend (multi-stage)        | `Dockerfile` (BE)      | ⬜         |
| 7   | Tạo Dockerfile Frontend (non-root Nginx)    | `Dockerfile` (FE)      | ⬜         |
| 8   | Tạo .dockerignore cho BE và FE              | `.dockerignore` × 2    | ⬜         |
| 9   | Tạo nginx.conf (đầy đủ Guards)              | `nginx/nginx.conf`     | ⬜         |
| 10  | Tạo docker-compose.yml                      | `docker-compose.yml`   | ⬜         |

---

## 12.3. GĐ 12.3 — TESTING & OPS (Ngày 4)

| #   | Công việc                                | Lệnh/Chi tiết                                   | Trạng thái |
| --- | ---------------------------------------- | ----------------------------------------------- | ---------- |
| 1   | Build toàn bộ hệ thống                   | `docker compose up --build -d --remove-orphans` | ⬜         |
| 2   | Kiểm tra healthcheck tất cả services     | `docker compose ps`                             | ⬜         |
| 3   | Kiểm tra logs không có lỗi               | `docker compose logs -f`                        | ⬜         |
| 4   | Kiểm tra seed data                       | `docker compose exec db-postgres psql ...`      | ⬜         |
| 5   | Test API health                          | `curl http://localhost/api/health`              | ⬜         |
| 6   | Test frontend tải được                   | Truy cập `http://localhost`                     | ⬜         |
| 7   | Test VNPay flow (sandbox)                | Tạo payment URL → redirect                      | ⬜         |
| 8   | Test graceful shutdown                   | `docker compose stop app-backend`               | ⬜         |
| 9   | Dọn rác image                            | `docker image prune -f`                         | ⬜         |
| 10  | Cấu hình Cloudflare Tunnels (nếu deploy) | Dashboard Cloudflare                            | ⬜         |

---

## CHECKLIST TỔNG KẾT — ETERNAL GUARDS COMPLIANCE

| Guard                                      | Status | Ghi chú                                  |
| ------------------------------------------ | ------ | ---------------------------------------- |
| THE POSTGRES PERSISTENCE GUARD             | ✅     | `postgres_data:/var/lib/postgresql/data` |
| THE WEBSOCKET SIGNALING GUARD              | ✅     | Upgrade + Connection headers trong nginx |
| THE HEALTHCHECK TIMING GUARD               | ✅     | interval:10s, timeout:5s, retries:5      |
| THE BUILD-ARG VOID GUARD                   | ✅     | VITE\_ args trong compose build          |
| THE DOCKER ULIMIT DECAPITATION GUARD       | ✅     | FE + DB ulimits nofile 65536             |
| THE DOCKER-PROXY TRUST TRAP GUARD          | ✅     | 172.16.0.0/12 + 192.168.0.0/16           |
| THE DYNAMIC RESOLVER TRAP GUARD            | ✅     | `set $backend` + `proxy_pass $backend`   |
| THE SYSCALL OPEN_FILE_CACHE GUARD          | ✅     | open_file_cache max=10000                |
| THE POSTGRES WAL CORRUPTION GUARD          | ✅     | stop_grace_period: 60s                   |
| THE IPv4 DOCKER BINDING GUARD              | ✅     | `0.0.0.0:80:8080`                        |
| THE CPU AFFINITY THRASHING GUARD           | ✅     | worker_cpu_affinity auto                 |
| THE INFINITE LOG BOMB GUARD                | ✅     | stdout/stderr                            |
| THE NGINX DISK I/O ASPHYXIATION GUARD      | ✅     | 16M + 50M                                |
| THE CLOUDFLARE IPv6 BYPASS GUARD           | ✅     | Full IPv4 + IPv6 ranges                  |
| THE REDIS AMNESIA GUARD                    | ✅     | redis_data:/data                         |
| THE NGINX PORT LEAK GUARD                  | ✅     | port_in_redirect off                     |
| THE POSTGRES RAM EXHAUSTION GUARD          | ✅     | max_connections=50                       |
| THE NATIVE BUILDER TRAP GUARD              | ✅     | python3 make g++                         |
| THE REDIS AOF FORK OOM GUARD               | ✅     | 384M > 2×128mb                           |
| THE ABSOLUTE UTC ENFORCEMENT GUARD         | ✅     | TZ=UTC, CẤM /etc/localtime cho DB        |
| THE EXPRESS PROXY DEPTH GUARD              | ✅     | Trust proxy dải nội bộ                   |
| THE NGINX TMPFS OOM BOMB GUARD             | ✅     | 100M/50M/10M                             |
| THE DANGLING IMAGE SSD DRAIN GUARD         | ✅     | Checklist prune                          |
| THE NGINX MULTI-CORE SYNC GUARD            | ✅     | worker_connections 2048, multi_accept on |
| THE BANDWIDTH COMPRESSION GUARD            | ✅     | gzip on                                  |
| THE REPLICA SYNC DEADLOCK WARNING          | ✅     | CHỈ 1 CONTAINER BE                       |
| THE POSTGRES SHARED_BUFFERS ILLUSION GUARD | ✅     | shared_buffers=256MB                     |
| THE SLOWLORIS BLEED GUARD                  | ✅     | body/header timeout 10s                  |
| THE REDIRECT PORT LEAK GUARD               | ✅     | X-Forwarded-Port 443                     |
| THE CLOUDFLARE SPOOFING PREVENTION GUARD   | ✅     | CF-Connecting-IP                         |
| THE ALPINE TZDATA VOID GUARD               | ✅     | apk add tzdata                           |
| THE DOCKER V2 COMPOSE GUARD                | ✅     | `docker compose`                         |
| THE HANDSHAKE EXHAUSTION GUARD             | ✅     | keepalive 65/1000                        |
| THE ZOMBIE TRANSACTION LOCK GUARD          | ✅     | idle_in_transaction=60000                |
| THE MIME TYPE CSS/JS GUARD                 | ✅     | include mime.types                       |
| THE MIME SNIFFING BYPASS GUARD             | ✅     | X-Content-Type-Options nosniff           |
| THE NODE 18 IPv6 DEADLOCK GUARD            | ✅     | dns-result-order=ipv4first               |
| THE UNPRIVILEGED PID CRASH GUARD           | ✅     | pid /tmp/nginx.pid                       |
| THE BUILD CACHE MIRAGE GUARD               | ✅     | --no-cache checklist                     |
| THE SPA INDEX.HTML WHITE-SCREEN GUARD      | ✅     | no-store, no-cache                       |
| THE NGINX HEADER HASH OVERFLOW GUARD       | ✅     | 512/128                                  |
| THE FRONTEND BLINDNESS GUARD               | ✅     | wget healthcheck                         |
| THE NODE.JS THREAD ASPHYXIATION GUARD      | ✅     | proxy_buffering on cho API               |
| THE TCP KEEPALIVE BLACKHOLE GUARD          | ✅     | tcp*keepalives*\*                        |
| THE MISSING DB LINK GUARD                  | ✅     | depends_on db + redis                    |
| THE SSL STRIPPING & VNPAY DOWNGRADE GUARD  | ✅     | X-Forwarded-Proto + HSTS                 |
| THE VOLUME TRAVERSAL PERMISSION GUARD      | ✅     | chmod 777 TRƯỚC chown                    |
| THE WEBSOCKET / KEEPALIVE PARADOX GUARD    | ✅     | map $http_upgrade                        |
| THE API FALLBACK TRAP GUARD                | ✅     | /api/ CẤM index.html                     |
| THE CGROUPS MEMORY ISOLATION GUARD         | ✅     | Limits cho tất cả services               |
| THE NGINX FILE DESCRIPTOR LIMIT GUARD      | ✅     | worker_rlimit_nofile 4096                |
| THE DOCKER DNS CACHE BOMB GUARD            | ✅     | resolver 127.0.0.11 valid=30s            |
| THE POSTGRES TRUE-READY GUARD              | ✅     | pg_isready                               |
| THE DEBIAN HEALTHCHECK GUARD               | ✅     | Node fetch                               |
| THE REDIS PROCESS-LEAK GUARD               | ✅     | REDISCLI_AUTH                            |
| THE SPA 200-OK ASSET GUARD                 | ✅     | try_files $uri =404                      |
| THE HOST HEADER PRESERVATION GUARD         | ✅     | $http_host                               |
| THE SYNC-SEED DEADLOCK GUARD               | ✅     | Seed trong syncSchema                    |
| THE ANTI-DDOS RATE LIMIT GUARD             | ✅     | burst=20 nodelay                         |
| THE HARDWARE TIME-SYNC GUARD               | ✅     | /etc/localtime:ro                        |
| THE VITE ASSET BANDWIDTH GUARD             | ✅     | Cache-Control immutable                  |
| THE UPLOAD XSS PREVENTION GUARD            | ✅     | CSP on /uploads/                         |
| THE DOCKER MTU BLACKHOLE GUARD             | ✅     | MTU 1450                                 |
| THE STRICT FE ENV ISOLATION GUARD          | ✅     | .dockerignore + ARG/ENV                  |
| THE NGINX STATIC OFFLOAD GUARD             | ✅     | Volume read-only                         |
| THE VITE SOURCE MAP GUARD                  | ✅     | sourcemap: false                         |
| THE WEBRTC SEND-TIMEOUT GUARD              | ✅     | 3600s                                    |
| THE SEQUELIZE ZOMBIE DROP GUARD            | ✅     | ssl: false                               |
| THE CROSS-LEAK IGNORE GUARD                | ✅     | .dockerignore chặn chéo                  |
| THE NGINX JWT & 502 BUFFER GUARD           | ✅     | 128k/4×256k/256k                         |
| THE V8 OOM GUARD                           | ✅     | max-old-space-size=512                   |

---

> **[KẾT THÚC TÀI LIỆU PHASE 13]**
> Tổng: 5 phần tài liệu | 8 sections | 70+ Guards compliance
