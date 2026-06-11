# ==========================================
# BOOKINGCARE FRONTEND DOCKERFILE — PHASE 13 BLUEPRINT COMPLIANT
# Multi-stage build: node:18-alpine (Vite Builder) -> nginx:1.25-alpine (Runtime)
# Phiên bản: 2.0-MySQL | Ngày: 2026-05-25
# ==========================================

# STAGE 1: Cài đặt và build mã nguồn tĩnh ứng dụng React/Vite
FROM node:18-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --quiet --legacy-peer-deps
COPY . .
# Nhận các tham số build-args truyền từ docker-compose để tiêm vào runtime
ARG VITE_BACKEND_URL
ARG VITE_APP_NAME
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL
ENV VITE_APP_NAME=$VITE_APP_NAME
RUN npm run build

# STAGE 2: Sử dụng Alpine Nginx chịu tải Enterprise để phân phối file tĩnh
FROM nginx:1.25-alpine AS frontend-runtime
# Nạp file cấu hình biên Gateway bọc thép đã nghiệm thu
COPY nginx/nginx.conf /etc/nginx/nginx.conf
# Sao chép toàn bộ asset tĩnh đã được build sang thư mục phân phối của Nginx
COPY --from=frontend-builder /app/dist /usr/share/nginx/html

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
