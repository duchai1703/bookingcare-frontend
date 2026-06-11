# PHASE 13 — PHẦN 6: DÀN XẾP HỆ THỐNG (DOCKER COMPOSE)

---

## 6.1. docker-compose.yml — Mã nguồn đầy đủ

**File:** `bookingcare-backend/docker-compose.yml` (đặt tại root project)

```yaml
# ═══════════════════════════════════════════════════════════════════════
# [Phase 13] Docker Compose — BookingCare Production
# [THE DOCKER V2 COMPOSE GUARD]: Dùng `docker compose` (V2)
# ═══════════════════════════════════════════════════════════════════════

services:
  # ─────────────────────────────────────────────────────────────────────
  # REDIS CACHE
  # ─────────────────────────────────────────────────────────────────────
  redis-cache:
    image: redis:7-alpine
    container_name: bookingcare-redis
    restart: unless-stopped

    # [THE REDIS AMNESIA GUARD]: Persist data
    volumes:
      - redis_data:/data
      # [THE HARDWARE TIME-SYNC GUARD]
      - /etc/localtime:/etc/localtime:ro

    command: >
      redis-server
      --requirepass ${REDIS_PASSWORD:-StrongRedisP@ss2026}
      --maxmemory 128mb
      --maxmemory-policy allkeys-lru
      --appendonly yes

    # [THE REDIS PROCESS-LEAK GUARD]: Healthcheck dùng REDISCLI_AUTH
    healthcheck:
      test:
        [
          "CMD-SHELL",
          "REDISCLI_AUTH=$${REDIS_PASSWORD:-StrongRedisP@ss2026} redis-cli ping | grep PONG",
        ]
      interval: 10s
      timeout: 5s
      retries: 5

    # [THE CGROUPS MEMORY ISOLATION GUARD]
    # [THE REDIS AOF FORK OOM GUARD]: Limit > gấp đôi maxmemory (128mb)
    deploy:
      resources:
        limits:
          memory: 384M

    networks:
      - booking-network

  # ─────────────────────────────────────────────────────────────────────
  # POSTGRESQL DATABASE
  # ─────────────────────────────────────────────────────────────────────
  db-postgres:
    image: postgres:16-alpine
    container_name: bookingcare-db
    restart: unless-stopped

    # [THE ABSOLUTE UTC ENFORCEMENT GUARD]: CẤM MAP /etc/localtime
    environment:
      - POSTGRES_DB=${DB_NAME:-bookingcare}
      - POSTGRES_USER=${DB_USERNAME:-bookingcare_user}
      - POSTGRES_PASSWORD=${DB_PASSWORD:-StrongP@ssw0rd2026}
      - TZ=UTC

    # [THE POSTGRES PERSISTENCE GUARD]: Map volume vĩnh viễn
    volumes:
      - postgres_data:/var/lib/postgresql/data

    # [THE DOCKER ULIMIT DECAPITATION GUARD]
    ulimits:
      nofile:
        soft: 65536
        hard: 65536

    # Shared memory cho PostgreSQL
    shm_size: 256mb

    # [THE POSTGRES WAL CORRUPTION GUARD]
    stop_grace_period: 60s

    # [THE POSTGRES SHARED_BUFFERS ILLUSION GUARD]
    # [THE POSTGRES RAM EXHAUSTION GUARD]: max_connections=50
    # [THE ZOMBIE TRANSACTION LOCK GUARD]: idle_in_transaction_session_timeout
    # [THE TCP KEEPALIVE BLACKHOLE GUARD]
    command: >
      postgres
      -c shared_buffers=256MB
      -c max_connections=50
      -c idle_in_transaction_session_timeout=60000
      -c tcp_keepalives_idle=600
      -c tcp_keepalives_interval=30
      -c tcp_keepalives_count=10

    # [THE POSTGRES TRUE-READY GUARD]
    # [THE HEALTHCHECK TIMING GUARD]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $${POSTGRES_USER} -d $${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5

    # [THE CGROUPS MEMORY ISOLATION GUARD]
    deploy:
      resources:
        limits:
          memory: 512M

    networks:
      - booking-network

  # ─────────────────────────────────────────────────────────────────────
  # BACKEND (Node.js 18)
  # ─────────────────────────────────────────────────────────────────────
  app-backend:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: bookingcare-backend
    restart: unless-stopped

    env_file: .env

    # [⚠️ BẮT BUỘC - VNPAY TIMEZONE SYNC]:
    # Container app-backend BẮT BUỘC phải được truyền biến môi trường
    # TZ=Asia/Ho_Chi_Minh để đồng bộ thời gian với VNPay.
    # (Lưu ý: Database vẫn giữ nguyên UTC để chuẩn hóa lưu trữ).
    environment:
      - TZ=Asia/Ho_Chi_Minh

    # Backend chỉ expose nội bộ, KHÔNG ra host
    expose:
      - "8080"

    # [THE HARDWARE TIME-SYNC GUARD]
    volumes:
      - backend_uploads:/app/uploads
      - /etc/localtime:/etc/localtime:ro

    stop_grace_period: 30s

    # [THE DEBIAN HEALTHCHECK GUARD]: Dùng Node Fetch API
    # [THE HEALTHCHECK TIMING GUARD]
    healthcheck:
      test:
        [
          "CMD-SHELL",
          'node -e "fetch(''http://localhost:8080/api/health'').then(r=>{if(!r.ok)throw 1}).catch(()=>process.exit(1))"',
        ]
      interval: 10s
      timeout: 5s
      retries: 5

    # [THE CGROUPS MEMORY ISOLATION GUARD]
    deploy:
      resources:
        limits:
          memory: 768M

    # [THE MISSING DB LINK GUARD]
    depends_on:
      db-postgres:
        condition: service_healthy
      redis-cache:
        condition: service_healthy

    networks:
      - booking-network

  # ─────────────────────────────────────────────────────────────────────
  # FRONTEND (Nginx Unprivileged)
  # ─────────────────────────────────────────────────────────────────────
  app-frontend:
    build:
      context: ../bookingcare-frontend
      dockerfile: Dockerfile
      # [THE BUILD-ARG VOID GUARD]: Map biến VITE_ vào build
      args:
        - VITE_BACKEND_URL=${VITE_BACKEND_URL:-https://YOUR_DOMAIN.com}
        - VITE_APP_NAME=${VITE_APP_NAME:-BookingCare}
    container_name: bookingcare-frontend
    restart: unless-stopped

    # [THE DOCKER ULIMIT DECAPITATION GUARD]
    ulimits:
      nofile:
        soft: 65536
        hard: 65536

    # [THE IPv4 DOCKER BINDING GUARD]: Ép cứng IPv4
    ports:
      - "0.0.0.0:80:8080"

    # [THE NGINX STATIC OFFLOAD GUARD]: Volume Read-Only cho uploads
    volumes:
      - backend_uploads:/usr/share/nginx/uploads:ro
      # [THE HARDWARE TIME-SYNC GUARD]
      - /etc/localtime:/etc/localtime:ro

    # [THE NGINX TMPFS OOM BOMB GUARD]: Giới hạn cứng tmpfs
    tmpfs:
      - /tmp:size=100M
      - /var/cache/nginx:size=50M
      - /var/run:size=10M

    # [THE FRONTEND BLINDNESS GUARD]: Healthcheck wget
    # [THE HEALTHCHECK TIMING GUARD]
    healthcheck:
      test:
        [
          "CMD",
          "wget",
          "--no-verbose",
          "--tries=1",
          "--spider",
          "http://localhost:8080/",
        ]
      interval: 10s
      timeout: 5s
      retries: 5

    # [THE CGROUPS MEMORY ISOLATION GUARD]
    deploy:
      resources:
        limits:
          memory: 256M

    depends_on:
      app-backend:
        condition: service_healthy

    networks:
      - booking-network

# ─────────────────────────────────────────────────────────────────────
# VOLUMES — Named volumes cho persistence
# ─────────────────────────────────────────────────────────────────────
volumes:
  # [THE POSTGRES PERSISTENCE GUARD]
  postgres_data:
    driver: local
  # [THE REDIS AMNESIA GUARD]
  redis_data:
    driver: local
  # Upload files shared giữa BE và FE(Nginx)
  backend_uploads:
    driver: local

# ─────────────────────────────────────────────────────────────────────
# NETWORK
# ─────────────────────────────────────────────────────────────────────
networks:
  booking-network:
    driver: bridge
    # [THE DOCKER MTU BLACKHOLE GUARD]
    driver_opts:
      com.docker.network.driver.mtu: "1450"
```

---

## 6.2. .env cho Docker Compose

**File:** `bookingcare-backend/.env` (Production version)

```env
# ═══════════════════════════════════════════════════════════════════════
# [Phase 13] Production Environment Variables
# QUY TẮC: KHÔNG ngoặc kép. ESCAPE dấu $. CẤM # và khoảng trắng trong secret.
# ═══════════════════════════════════════════════════════════════════════

# Server
PORT=8080

# Database (PostgreSQL)
DB_HOST=db-postgres
DB_USERNAME=bookingcare_user
DB_PASSWORD=StrongP@ssw0rd2026
DB_NAME=bookingcare
DB_PORT=5432
DB_DIALECT=postgres

# Redis
REDIS_HOST=redis-cache
REDIS_PORT=6379
REDIS_PASSWORD=StrongRedisP@ss2026

# Email (NodeMailer — IPv4 enforced)
EMAIL_APP_USERNAME=haitran17032005@gmail.com
EMAIL_APP_PASSWORD=lrpb xnpu iczt lwti

# JWT Secret — CẤM dấu # và khoảng trắng
JWT_SECRET=bookingcare-secret-key-2026-production

# Frontend URL (cho CORS và email link)
URL_REACT=https://YOUR_DOMAIN.com

# VNPay Payment
VNP_TMN_CODE=YOUR_TMN_CODE
VNP_HASH_SECRET=YOUR_HASH_SECRET
VNP_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNP_API_URL=https://sandbox.vnpayment.vn/merchant_webapi/api/transaction
VNP_RETURN_URL=https://YOUR_DOMAIN.com/payment-result
VNP_IPN_URL=https://YOUR_DOMAIN.com/api/v1/payment/vnpay-ipn

# Cron & Security
API_CRON_SECRET=your-cron-secret-key-production
RECEIPT_FALLBACK_SECRET=your-64-byte-minimum-secret-for-receipt-fallback-prod

# Frontend Build Args (dùng bởi docker-compose)
VITE_BACKEND_URL=https://YOUR_DOMAIN.com
VITE_APP_NAME=BookingCare
```
