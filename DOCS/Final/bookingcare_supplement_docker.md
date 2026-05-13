# BÁO CÁO ĐỒ ÁN 1 – BOOKINGCARE
# BỔ SUNG PHẦN 2: DOCKER & INFRASTRUCTURE

---

## [BỔ SUNG C1.3 – PHẠM VI: TRIỂN KHAI]

- Ứng dụng được containerize bằng **Docker** với multi-stage build cho cả Frontend và Backend.
- Frontend phục vụ qua **Nginx Unprivileged** (non-root) với cấu hình bảo mật 70+ guards.
- Backend chạy trong container **Node.js 18** với graceful shutdown (SIGTERM handler).
- Database sử dụng **PostgreSQL 16** (Docker container) thay cho MySQL local, với persistent volume.
- Cache layer sử dụng **Redis 7** cho idempotency store và session management.
- Toàn bộ hệ thống orchestrate bằng **Docker Compose** (4 services trên 1 bridge network).

> [!NOTE]
> Project hiện **CHƯA** có CI/CD pipeline (GitHub Actions/Jenkins). Quy trình triển khai là thủ công qua `docker compose up --build`. **[CẦN BỔ SUNG]** nếu muốn thêm phần CI/CD vào báo cáo.

---

## [BỔ SUNG C1.6 – CÔNG NGHỆ SỬ DỤNG: DEVOPS]

### DevOps & Infrastructure

| Công nghệ | Phiên bản | Mô tả |
|-----------|-----------|-------|
| Docker | (Engine) | Nền tảng containerization, đóng gói ứng dụng |
| Docker Compose | V2 | Orchestrate multi-container (4 services) |
| Nginx Unprivileged | 1.27-alpine | Reverse proxy + static file server cho Frontend (non-root) |
| Node.js | 18-bookworm / 18-bookworm-slim | Base image cho Backend (multi-stage build) |
| PostgreSQL | 16-alpine | Database container (thay MySQL cho production) |
| Redis | 7-alpine | In-memory cache cho idempotency store |
| Alpine Linux | (base image) | Image OS nhẹ cho FE, DB, Redis containers |

> [!IMPORTANT]
> **CI/CD:** Project hiện CHƯA triển khai pipeline CI/CD tự động. Deployment thực hiện thủ công qua `docker compose up --build -d`.
> **Container Registry / Cloud Provider:** Chưa cấu hình. Tài liệu Phase 13 đã chuẩn bị hướng dẫn cho Cloudflare Tunnels nhưng chưa triển khai thực tế.

---

## [BỔ SUNG CƠ SỞ LÝ THUYẾT – CHƯƠNG 2: DOCKER & INFRASTRUCTURE]

### 2.14. Docker

**Giới thiệu:** Docker là nền tảng containerization mã nguồn mở do Docker, Inc. phát triển (2013), cho phép đóng gói ứng dụng cùng tất cả dependencies vào một container độc lập, chạy nhất quán trên mọi môi trường. Trong BookingCare, Docker được sử dụng để containerize 4 thành phần: Frontend (Nginx), Backend (Node.js), Database (PostgreSQL), và Cache (Redis), đảm bảo môi trường production đồng nhất với development.

**Ưu điểm:**
- Đảm bảo tính nhất quán: "Works on my machine" → "Works everywhere" — loại bỏ sự khác biệt môi trường giữa development và production
- Cách ly hoàn toàn: mỗi service chạy trong container riêng, không xung đột dependencies
- Multi-stage build giảm kích thước image (chỉ giữ production dependencies), tối ưu bảo mật

**Nhược điểm:**
- Tăng độ phức tạp vận hành: cần hiểu Docker networking, volume, cgroups, và debugging container
- Tốn tài nguyên bộ nhớ hơn so với chạy trực tiếp trên host (overhead container runtime)
- Learning curve cho đội phát triển chưa quen với containerization

### 2.15. Docker Compose

**Giới thiệu:** Docker Compose là công cụ chính thức của Docker để định nghĩa và quản lý ứng dụng multi-container thông qua file YAML. Trong BookingCare, Docker Compose V2 orchestrate 4 services (Backend, Frontend/Nginx, PostgreSQL, Redis) trên một bridge network duy nhất (`booking-network`), với health checks, resource limits, và volume persistence.

**Ưu điểm:**
- Một lệnh `docker compose up` khởi động toàn bộ hệ thống (4 services + network + volumes)
- Quản lý dependency ordering: Backend chờ DB + Redis healthy trước khi khởi động
- Hỗ trợ health checks, resource limits (cgroups), restart policies built-in

**Nhược điểm:**
- Không phù hợp cho orchestration quy mô lớn (cần Kubernetes cho horizontal scaling)
- Giới hạn 1 container Backend (không scale được do `sequelize.sync()` conflict)

### 2.16. Nginx

**Giới thiệu:** Nginx là web server và reverse proxy hiệu suất cao, mã nguồn mở do Igor Sysoev phát triển (2004). Trong BookingCare, phiên bản `nginx-unprivileged:1.27-alpine` được sử dụng với 2 vai trò: (1) phục vụ static files của React build (SPA), và (2) reverse proxy chuyển tiếp API requests đến Backend container. Cấu hình bao gồm 30+ security guards.

**Ưu điểm:**
- Hiệu suất cực cao phục vụ static files, giảm tải cho Backend Node.js
- Reverse proxy với đầy đủ security headers (HSTS, nosniff, CSP), rate limiting, gzip compression
- Non-root mode (nginx-unprivileged) tăng cường bảo mật container

**Nhược điểm:**
- Cấu hình phức tạp, dễ sai gây 502/504 nếu thiếu kinh nghiệm
- Cần hiểu sâu về HTTP/TCP để tối ưu cho SSE streaming (proxy_buffering, tcp_nodelay)

---

## [BỔ SUNG D3.7.1 – KIẾN TRÚC: DOCKER]

### Kiến trúc Containerized (4 Containers)

```
┌───────────────────────────────────────────────────────────────┐
│              booking-network (bridge, MTU 1450)                │
│                                                                │
│  ┌──────────────────┐      ┌──────────────────────────────┐   │
│  │  app-frontend    │      │  app-backend                 │   │
│  │  (Nginx 1.27)    │─────▶│  (Node.js 18)                │   │
│  │                  │ API  │  expose: 8080 (internal)     │   │
│  │  Port: 80→8080   │proxy │  Memory: 768MB max           │   │
│  │  Memory: 256MB   │      │  NODE_OPTIONS: --max-old=512 │   │
│  │                  │      │  TZ: Asia/Ho_Chi_Minh        │   │
│  │  Static files:   │      └──────┬───────────┬───────────┘   │
│  │  /usr/share/     │             │           │               │
│  │  nginx/html      │             │           │               │
│  └──────────────────┘             │           │               │
│         ▲                         ▼           ▼               │
│    0.0.0.0:80              ┌──────────┐ ┌───────────┐         │
│    (Host port)             │db-postgres│ │redis-cache│         │
│                            │(PG 16)   │ │(Redis 7)  │         │
│                            │INVISIBLE │ │INVISIBLE  │         │
│                            │Port: 5432│ │Port: 6379 │         │
│                            │Mem: 512MB│ │Mem: 384MB │         │
│                            │TZ: UTC   │ │128mb max  │         │
│                            │shm: 256mb│ │AOF: yes   │         │
│                            └──────────┘ └───────────┘         │
└───────────────────────────────────────────────────────────────┘

Volumes (Persistent):
├── postgres_data → /var/lib/postgresql/data
├── redis_data → /data
└── backend_uploads → /app/uploads (BE write) + /usr/share/nginx/uploads (FE read-only)
```

### Nguyên tắc thiết kế

- **Nginx là cổng duy nhất** lộ ra ngoài (port 80). PostgreSQL và Redis KHÔNG expose port ra host.
- **MTU 1450** trên bridge network tránh packet fragmentation trong Docker overlay.
- **Health checks** cho tất cả 4 services: interval 10s, timeout 5s, retries 5.
- **Resource limits** (cgroups): mỗi container có memory limit riêng, tổng ~1.9GB.
- **Volume sharing**: `backend_uploads` shared giữa Backend (read-write) và Frontend/Nginx (read-only).

---

## [BỔ SUNG D3.7.2 – BẢNG THÀNH PHẦN: DOCKER]

| STT | Thành phần | Mô tả |
|-----|-----------|-------|
| 19 | Docker Container – Frontend (Nginx) | `app-frontend` — Nginx Unprivileged 1.27 phục vụ React build + reverse proxy API |
| 20 | Docker Container – Backend (Node.js) | `app-backend` — Node.js 18 chạy Express API, graceful shutdown |
| 21 | Docker Container – Database (PostgreSQL) | `db-postgres` — PostgreSQL 16, persistent volume, shared_buffers=256MB |
| 22 | Docker Container – Cache (Redis) | `redis-cache` — Redis 7, AOF persistence, maxmemory=128MB, LRU eviction |
| 23 | Docker Network | `booking-network` — Bridge network MTU 1450 kết nối 4 containers |
| 24 | Docker Volumes | 3 named volumes: postgres_data, redis_data, backend_uploads |

---

## [BỔ SUNG E4 – TRIỂN KHAI VỚI DOCKER]

### E4.3. Giới thiệu Docker và Docker Compose

BookingCare chọn Docker để containerize toàn bộ hệ thống nhằm giải quyết 3 vấn đề chính: (1) đảm bảo môi trường chạy nhất quán giữa development và production, (2) cách ly các service (Frontend, Backend, Database, Cache) tránh xung đột dependencies, và (3) đơn giản hóa quy trình triển khai — chỉ cần một lệnh `docker compose up --build` để khởi động toàn bộ hệ thống.

Docker Compose V2 được sử dụng để orchestrate 4 services trên một bridge network. Mỗi service có health check riêng, resource limits (cgroups memory), và restart policy (`unless-stopped`). Dependency ordering đảm bảo Backend chỉ khởi động khi Database và Redis đã healthy.

### E4.4. Cấu hình Dockerfile

#### Backend Dockerfile (Multi-Stage Build)

- **Stage 1 (Builder):** Base image `node:18-bookworm`. Cài build tools (python3, make, g++) cho native modules. Chạy `npm ci --omit=dev` + `npm prune --production` để chỉ giữ production dependencies.
- **Stage 2 (Production):** Base image `node:18-bookworm-slim` (nhẹ hơn). Copy `node_modules` từ Stage 1. Tạo thư mục `/app/uploads` với quyền ghi. Chạy với user `node` (non-root). Expose port 8080. `NODE_OPTIONS="--max-old-space-size=512 --dns-result-order=ipv4first"`.
- **CMD:** `node src/server.js` (không dùng nodemon trong production).

#### Frontend Dockerfile (Non-Root Nginx)

- **Stage 1 (Builder):** Base image `node:18-alpine`. Nhận `VITE_BACKEND_URL` và `VITE_APP_NAME` qua `ARG/ENV` (bake vào lúc build). Chạy `npm ci` + `npm run build` → output `/app/dist`.
- **Stage 2 (Nginx):** Base image `nginxinc/nginx-unprivileged:1.27-alpine`. Cài `tzdata` và `wget` (cho healthcheck). Copy `nginx.conf` và built assets. Expose port 8080 (non-privileged). Healthcheck bằng `wget --spider`.

### E4.5. Cấu hình Docker Compose

**File:** `bookingcare-backend/docker-compose.yml`

**4 Services:**

| Service | Image | Port | Memory | Health Check |
|---------|-------|------|--------|-------------|
| `redis-cache` | redis:7-alpine | 6379 (internal) | 384MB | `redis-cli ping \| grep PONG` |
| `db-postgres` | postgres:16-alpine | 5432 (internal) | 512MB | `pg_isready` |
| `app-backend` | node:18 (custom build) | 8080 (internal) | 768MB | `node fetch /api/health` |
| `app-frontend` | nginx-unprivileged:1.27 (custom) | **80 → 8080** (public) | 256MB | `wget --spider localhost:8080` |

**Environment:**
- Backend: `.env` file + `TZ=Asia/Ho_Chi_Minh`
- Database: `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `TZ=UTC`
- Redis: `--requirepass`, `--maxmemory 128mb`, `--appendonly yes`
- Frontend: `VITE_BACKEND_URL`, `VITE_APP_NAME` (build args)

**Volumes:** `postgres_data` (DB persistence), `redis_data` (cache persistence), `backend_uploads` (shared BE→FE)

**Network:** `booking-network` (bridge, MTU 1450)

**Dependency chain:** `db-postgres` + `redis-cache` → `app-backend` → `app-frontend`

### E4.6. Nginx Reverse Proxy

Nginx đóng vai trò kép: (1) phục vụ React SPA static files và (2) reverse proxy API requests đến Backend. Cấu hình bao gồm:

- **Security:** HSTS, X-Content-Type-Options nosniff, Cloudflare Real IP, rate limiting (10r/s API, 30r/s general)
- **Performance:** Gzip compression (level 6), open_file_cache (10000 files), static asset caching (1 year immutable)
- **SPA Support:** `try_files $uri $uri/ /index.html` với no-cache cho index.html
- **Proxy:** API forwarding đến `app-backend:8080`, buffer 128k/256k, timeout 3600s
- **Anti-DDoS:** Slowloris protection (10s timeouts), keepalive 65s/1000 requests

### E4.7. CI/CD Pipeline

> [!WARNING]
> **[CẦN BỔ SUNG]** — Project hiện CHƯA có CI/CD pipeline tự động. Triển khai được thực hiện thủ công:
> ```bash
> cd bookingcare-backend
> docker compose up --build -d --remove-orphans
> ```

**Hướng triển khai CI/CD (khuyến nghị):** GitHub Actions với workflow: lint → build → push image → deploy via SSH. Tài liệu Phase 13 đã chuẩn bị hướng dẫn Cloudflare Tunnels cho deployment.

### E4.8. Lợi ích đạt được

1. **Tính nhất quán:** Loại bỏ hoàn toàn vấn đề "Works on my machine" — 4 containers chạy giống nhau trên mọi máy.
2. **Cách ly bảo mật:** PostgreSQL và Redis không expose port ra ngoài, chỉ giao tiếp qua internal network.
3. **Triển khai nhanh:** Một lệnh `docker compose up` khởi động toàn bộ hệ thống trong 30-60 giây.
4. **Quản lý tài nguyên:** Cgroups memory limits cho mỗi container, tổng ~1.9GB, phù hợp VPS 2-4GB RAM.
5. **Dữ liệu an toàn:** Named volumes đảm bảo data PostgreSQL và Redis persist qua restart/rebuild.

---

## [CẬP NHẬT C1.8 – HƯỚNG PHÁT TRIỂN]

> Đã loại bỏ AI Chatbot và Docker khỏi danh sách (vì đã triển khai).

- Phát triển ứng dụng **mobile** (React Native / Flutter) để mở rộng đối tượng người dùng di động.
- Tích hợp thêm **cổng thanh toán** (MoMo, ZaloPay) bên cạnh VNPay.
- Triển khai **thông báo real-time** (WebSocket/Socket.IO) khi có lịch hẹn mới hoặc thay đổi.
- Tích hợp lịch khám vào **Google Calendar / Apple Calendar** để nhắc nhở bệnh nhân.
- Thiết lập **CI/CD pipeline** tự động (GitHub Actions) với workflow: lint → test → build → deploy.
- Tích hợp tính năng **Telemedicine** (video call) cho khám bệnh từ xa.
- Bổ sung **unit test và integration test** tự động (Jest, Supertest) để nâng cao chất lượng code.
- Mở rộng **AI Chatbot** với khả năng đặt lịch trực tiếp qua chat (write operations) và tích hợp RAG (Retrieval-Augmented Generation) cho tư vấn y tế chuyên sâu hơn.

---

## [BỔ SUNG TÀI LIỆU THAM KHẢO]

[16] Google DeepMind, "Gemini API Documentation — Function Calling," Truy cập ngày 13 tháng 5 năm 2026. [Online]. Có sẵn tại: https://ai.google.dev/docs

[17] Google, "@google/generative-ai — Google Generative AI SDK for Node.js," Truy cập ngày 13 tháng 5 năm 2026. [Online]. Có sẵn tại: https://www.npmjs.com/package/@google/generative-ai

[18] Docker, Inc., "Docker Documentation — Get Started," Truy cập ngày 13 tháng 5 năm 2026. [Online]. Có sẵn tại: https://docs.docker.com/

[19] Docker, Inc., "Docker Compose V2 — Overview," Truy cập ngày 13 tháng 5 năm 2026. [Online]. Có sẵn tại: https://docs.docker.com/compose/

[20] Nginx, Inc., "Nginx Documentation — Admin Guide," Truy cập ngày 13 tháng 5 năm 2026. [Online]. Có sẵn tại: https://nginx.org/en/docs/

[21] The PostgreSQL Global Development Group, "PostgreSQL 16 Documentation," Truy cập ngày 13 tháng 5 năm 2026. [Online]. Có sẵn tại: https://www.postgresql.org/docs/16/

[22] Redis Ltd., "Redis Documentation," Truy cập ngày 13 tháng 5 năm 2026. [Online]. Có sẵn tại: https://redis.io/docs/

[23] Mozilla Developer Network, "Server-Sent Events (SSE) — Using server-sent events," Truy cập ngày 13 tháng 5 năm 2026. [Online]. Có sẵn tại: https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events
