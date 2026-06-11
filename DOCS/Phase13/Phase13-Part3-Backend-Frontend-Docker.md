# PHASE 13 — PHẦN 4: BACKEND DOCKERIZATION

> Multi-Stage Build — EACCES Safe — OOM Safe

---

## 4.1. Dockerfile Backend

**File:** `bookingcare-backend/Dockerfile`

```dockerfile
# ═══════════════════════════════════════════════════════════════════════
# [Phase 13] BACKEND DOCKERFILE — Multi-Stage Build
# Stage 1: Build (cài native dependencies)
# Stage 2: Production (slim image)
# ═══════════════════════════════════════════════════════════════════════

# ── Stage 1: Builder ──────────────────────────────────────────────────
FROM node:18-bookworm AS builder

WORKDIR /app

# [THE NATIVE BUILDER TRAP GUARD]: Cài build tools TRƯỚC npm ci
RUN apt-get update && apt-get install -y python3 make g++ && \
    rm -rf /var/lib/apt/lists/*

# Copy package files trước (layer cache)
COPY package.json package-lock.json ./

# Cài dependencies + pg driver
RUN npm install pg pg-hstore && \
    npm ci --omit=dev && \
    npm prune --production && \
    npm cache clean --force

# ── Stage 2: Production ──────────────────────────────────────────────
FROM node:18-bookworm-slim

WORKDIR /app

# [THE VOLUME TRAVERSAL PERMISSION GUARD]:
# Tạo thư mục upload VÀ chmod 777 TRƯỚC chown
RUN mkdir -p /app/uploads && \
    chmod 777 /app/uploads && \
    chown -R node:node /app

# Copy node_modules từ builder
COPY --from=builder --chown=node:node /app/node_modules ./node_modules

# Copy source code
COPY --chown=node:node . .

# Đảm bảo uploads writable sau COPY
RUN chmod 777 /app/uploads

# [THE V8 OOM GUARD (RUNTIME ONLY)] + [THE NODE 18 IPv6 DEADLOCK GUARD]
ENV NODE_OPTIONS="--max-old-space-size=512 --dns-result-order=ipv4first"

# Non-root user
USER node

EXPOSE 8080

CMD ["node", "src/server.js"]
```

---

## 4.2. .dockerignore Backend

**File:** `bookingcare-backend/.dockerignore`

```
# [THE CROSS-LEAK IGNORE GUARD]: Chặn chéo
node_modules
npm-debug.log*
.git
.gitignore
.env
DOCS
*.md
.vscode
.idea
Thumbs.db
.DS_Store

# Chặn frontend leak
../bookingcare-frontend
```

---

# PHẦN 5: FRONTEND PRODUCTION (THE NON-ROOT NGINX SHIELD)

---

## 5.1. Dockerfile Frontend

**File:** `bookingcare-frontend/Dockerfile`

```dockerfile
# ═══════════════════════════════════════════════════════════════════════
# [Phase 13] FRONTEND DOCKERFILE — Non-Root Nginx Shield
# Stage 1: Build React app
# Stage 2: Serve static files via Nginx Unprivileged
# ═══════════════════════════════════════════════════════════════════════

# ── Stage 1: Builder ──────────────────────────────────────────────────
FROM node:18-alpine AS builder

WORKDIR /app

# [THE STRICT FE ENV ISOLATION GUARD]: Nạp biến qua ARG/ENV
ARG VITE_BACKEND_URL
ARG VITE_APP_NAME

ENV VITE_BACKEND_URL=$VITE_BACKEND_URL
ENV VITE_APP_NAME=$VITE_APP_NAME

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Stage 2: Nginx Unprivileged ──────────────────────────────────────
FROM nginxinc/nginx-unprivileged:1.27-alpine

# [THE ALPINE TZDATA VOID GUARD]: Cài tzdata
USER root
RUN apk add --no-cache tzdata wget
USER nginx

# [THE UNPRIVILEGED PID CRASH GUARD]: pid ở /tmp
# (nginx-unprivileged mặc định đã cấu hình)

# Copy Nginx config
COPY --chown=nginx:nginx nginx/nginx.conf /etc/nginx/nginx.conf

# Copy built assets
COPY --from=builder --chown=nginx:nginx /app/dist /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=5s --retries=5 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/ || exit 1
```

---

## 5.2. .dockerignore Frontend

**File:** `bookingcare-frontend/.dockerignore`

```
# [THE STRICT FE ENV ISOLATION GUARD]: CHẶN .env
.env
.env.local
.env.*.local
node_modules
npm-debug.log*
.git
.gitignore
dist
DOCS
*.md
.vscode
.idea
Thumbs.db
.DS_Store

# [THE CROSS-LEAK IGNORE GUARD]: Chặn backend leak
../bookingcare-backend
```

---

## 5.3. nginx.conf — Cấu hình đầy đủ

**File:** `bookingcare-frontend/nginx/nginx.conf`

```nginx
# ═══════════════════════════════════════════════════════════════════════
# [Phase 13] NGINX PRODUCTION CONFIG — BookingCare Frontend
# Tập hợp TẤT CẢ ETERNAL GUARDS
# ═══════════════════════════════════════════════════════════════════════

# [THE UNPRIVILEGED PID CRASH GUARD]
pid /tmp/nginx.pid;

# [THE CPU AFFINITY THRASHING GUARD]
worker_processes auto;
worker_cpu_affinity auto;

# [THE NGINX FILE DESCRIPTOR LIMIT GUARD]
worker_rlimit_nofile 4096;

events {
    # [THE NGINX MULTI-CORE SYNC GUARD]
    worker_connections 2048;
    multi_accept on;
}

http {
    # [THE MIME TYPE CSS/JS GUARD]
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    # [THE NGINX PORT LEAK GUARD]
    port_in_redirect off;

    # [THE SYSCALL OPEN_FILE_CACHE GUARD]
    open_file_cache max=10000 inactive=20s;
    open_file_cache_valid 30s;
    open_file_cache_errors on;

    # [THE INFINITE LOG BOMB GUARD]
    access_log /dev/stdout;
    error_log  /dev/stderr;

    # [THE BANDWIDTH COMPRESSION GUARD]
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css application/json application/javascript
               text/xml application/xml application/xml+rss text/javascript
               image/svg+xml;
    gzip_min_length 256;

    # [THE NGINX DISK I/O ASPHYXIATION GUARD]
    client_max_body_size 50M;
    client_body_buffer_size 16M;

    # [THE SLOWLORIS BLEED GUARD]
    client_body_timeout 10s;
    client_header_timeout 10s;

    # [THE HANDSHAKE EXHAUSTION GUARD]
    keepalive_timeout 65;
    keepalive_requests 1000;

    # [THE NGINX HEADER HASH OVERFLOW GUARD]
    proxy_headers_hash_max_size 512;
    proxy_headers_hash_bucket_size 128;

    # [THE DOCKER DNS CACHE BOMB GUARD]
    resolver 127.0.0.11 ipv6=off valid=30s;

    # ═══ Cloudflare Real IP ═══
    # [THE CLOUDFLARE SPOOFING PREVENTION GUARD]
    real_ip_header CF-Connecting-IP;

    # [THE CLOUDFLARE IPv6 BYPASS GUARD]: ĐẦY ĐỦ dải IPv4 VÀ IPv6
    # IPv4
    set_real_ip_from 173.245.48.0/20;
    set_real_ip_from 103.21.244.0/22;
    set_real_ip_from 103.22.200.0/22;
    set_real_ip_from 103.31.4.0/22;
    set_real_ip_from 141.101.64.0/18;
    set_real_ip_from 108.162.192.0/18;
    set_real_ip_from 190.93.240.0/20;
    set_real_ip_from 188.114.96.0/20;
    set_real_ip_from 197.234.240.0/22;
    set_real_ip_from 198.41.128.0/17;
    set_real_ip_from 162.158.0.0/15;
    set_real_ip_from 104.16.0.0/13;
    set_real_ip_from 104.24.0.0/14;
    set_real_ip_from 172.64.0.0/13;
    set_real_ip_from 131.0.72.0/22;
    # IPv6
    set_real_ip_from 2400:cb00::/32;
    set_real_ip_from 2606:4700::/32;
    set_real_ip_from 2803:f800::/32;
    set_real_ip_from 2405:b500::/32;
    set_real_ip_from 2405:8100::/32;
    set_real_ip_from 2a06:98c0::/29;
    set_real_ip_from 2c0f:f248::/32;

    # [THE DOCKER-PROXY TRUST TRAP GUARD]: Dải Docker internal
    set_real_ip_from 172.16.0.0/12;
    set_real_ip_from 192.168.0.0/16;

    # [THE ANTI-DDOS RATE LIMIT GUARD]
    limit_req_zone $binary_remote_addr zone=api_zone:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=general_zone:10m rate=30r/s;

    # [THE WEBSOCKET / KEEPALIVE PARADOX GUARD]
    map $http_upgrade $connection_upgrade {
        default upgrade;
        ''      close;
    }

    server {
        listen 8080;
        server_name _;

        root /usr/share/nginx/html;
        index index.html;

        # [THE MIME SNIFFING BYPASS GUARD]
        add_header X-Content-Type-Options "nosniff" always;

        # [THE SSL STRIPPING & VNPAY DOWNGRADE GUARD]: HSTS
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

        # ═══ API Proxy — [THE DYNAMIC RESOLVER TRAP GUARD] ═══
        location /api/ {
            # [THE API FALLBACK TRAP GUARD]: CẤM trả về index.html
            # Dùng biến động cho proxy_pass
            set $backend "http://app-backend:8080";
            proxy_pass $backend;

            # Rate Limit
            limit_req zone=api_zone burst=20 nodelay;

            # [THE HOST HEADER PRESERVATION GUARD]
            proxy_set_header Host $http_host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

            # [THE SSL STRIPPING & VNPAY DOWNGRADE GUARD]
            proxy_set_header X-Forwarded-Proto https;

            # [THE REDIRECT PORT LEAK GUARD]
            proxy_set_header X-Forwarded-Port 443;

            # [THE WEBSOCKET SIGNALING GUARD]
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection $connection_upgrade;

            # [THE NGINX JWT & 502 BUFFER GUARD]
            proxy_buffer_size 128k;
            proxy_buffers 4 256k;
            proxy_busy_buffers_size 256k;

            # [THE NODE.JS THREAD ASPHYXIATION GUARD]: Buffer bình thường cho API
            proxy_buffering on;

            # [THE WEBRTC SEND-TIMEOUT GUARD]: Timeout 3600s cho long-polling/websocket
            proxy_read_timeout 3600s;
            proxy_send_timeout 3600s;
        }

        # ═══ WebRTC Location (nếu cần) — proxy_buffering off ═══
        location /api/v1/webrtc/ {
            set $backend "http://app-backend:8080";
            proxy_pass $backend;

            proxy_set_header Host $http_host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection $connection_upgrade;

            # CHỈ proxy_buffering off cho WebRTC
            proxy_buffering off;
            proxy_read_timeout 3600s;
            proxy_send_timeout 3600s;
        }

        # ═══ [THE NGINX STATIC OFFLOAD GUARD]: Phục vụ ảnh trực tiếp ═══
        location /uploads/ {
            alias /usr/share/nginx/uploads/;
            expires 30d;
            add_header Cache-Control "public, immutable";

            # [THE UPLOAD XSS PREVENTION GUARD]
            add_header Content-Security-Policy "default-src 'none'; img-src 'self'" always;
            add_header X-Content-Type-Options "nosniff" always;
        }

        # ═══ [THE VITE ASSET BANDWIDTH GUARD]: Cache Immutable ═══
        location /assets/ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            add_header X-Content-Type-Options "nosniff" always;
        }

        # ═══ [THE SPA 200-OK ASSET GUARD]: Chặn 404 asset rác ═══
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|map)$ {
            try_files $uri =404;
            expires 30d;
            add_header Cache-Control "public";
        }

        # ═══ [THE SPA INDEX.HTML WHITE-SCREEN GUARD] ═══
        location / {
            limit_req zone=general_zone burst=50 nodelay;
            try_files $uri $uri/ /index.html?$args;

            # CHỐNG CACHE index.html
            location = /index.html {
                add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate";
                add_header Pragma "no-cache";
                add_header Expires "0";
            }
        }
    }
}
```
