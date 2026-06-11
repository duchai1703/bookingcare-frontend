# PHASE 13 — BẢN THIẾT KẾ KIẾN TRÚC HẠ TẦNG MYSQL-NATIVE (PHẦN 1/3)

## Tài liệu Hướng dẫn Thiết kế Kỹ thuật — BookingCare Production Hardening

> **Version:** 2.0-MySQL | **Ngày:** 2026-05-23
> **Nền tảng:** Phase 11 (VNPay FSM 64 Guards) + Phase 12 (AI Chatbot Gemini SSE) trên MySQL Database
> **Vai trò:** CTO / Principal System Auditor / DevSecOps Director

---

# CHỨNG MINH KHẢO SÁT THỰC ĐỊA

## A. CamelCase Alias Map — 22 Aliases đã xác nhận từ `models/index.js`

| Association | Alias | FK | AI truy vấn? |
|---|---|---|---|
| User → Doctor_Info | `doctorInfoData` | `doctorId` | universalSystemSearch(doctor) |
| Doctor_Info → User | `doctorData` | `doctorId` | searchDoctorsBySpecialty |
| Doctor_Info → Specialty | `specialtyData` | `specialtyId` | getDoctorDetail |
| Doctor_Info → Clinic | `clinicData` | `clinicId` | getDoctorDetail |
| Schedule → Allcode | `timeTypeData` | `timeType→keyMap` | getAvailableSchedules |
| Booking → User (doctor) | `doctorBookingData` | `doctorId` | vnpayIpn, bookingByToken |
| Booking → Allcode (status) | `statusData` | `statusId→keyMap` | getMyBookings |
| Booking → Allcode (timeType) | `timeTypeBooking` | `timeType→keyMap` | getMyBookings |
| Review → User (doctor) | `reviewDoctorData` | `doctorId` | universalSystemSearch(review) |
| Review → User (patient) | `reviewPatientData` | `patientId` | universalSystemSearch(review) |
| Allcode → User (position) | `positionData` | `positionId→keyMap` | searchDoctorsBySpecialty |
| Allcode → User (role) | `roleData` | `roleId→keyMap` | getAvailableSchedules (R2) |
| Allcode → Doctor_Info (price) | `priceData` | `priceId→keyMap` | getDoctorDetail |

## B. Trường ảnh nhị phân BLOB('long') — 3 bảng

| Bảng | Cột | Kích thước tối đa |
|---|---|---|
| `Users` | `image` | LONGBLOB — 4GB |
| `Clinics` | `image` | LONGBLOB — 4GB |
| `Specialties` | `image` | LONGBLOB — 4GB |

## C. Trường ngày dạng chuỗi số Timestamp

Xác nhận từ `seedAllcode.js` dòng 163-164: `Date.UTC(y, m, d).toString()` → STRING(20) chứa milliseconds UTC.

---

# PHÂN KHU 1: MA TRẬN CHUẨN HÓA TRUY VẤN MySQL

## 1.1. Ràng buộc toán tử chuỗi số — Chống Implicit Type Casting

Trường `date` trong bảng Booking (dòng 8) và Schedule (dòng 6) lưu dạng `STRING(20)`.

| Quy tắc | Chi tiết |
|---|---|
| **QT-1.1a** | BẮT BUỘC dùng `[Op.eq]` khi truy vấn trường `date`. CẤM `[Op.like]`. Lý do: dữ liệu `"1779667200000"` là chuỗi số thuần — `LIKE` gây Full Table Scan, phá hủy index `idx_schedule_doctor_date_timeType` (Schedule dòng 19) và `idx_bookings_doctor_date` (Booking dòng 36), nghẽn pool kết nối khi 15 luồng SSE AI hoạt động song song. |
| **QT-1.1b** | BẮT BUỘC chuẩn hóa biến ngày `date` thành chuỗi ký tự đúng 13 chữ số (string milliseconds) tại tầng ứng dụng **TRƯỚC KHI** truyền vào toán tử so sánh `[Op.eq]`. CẤM tuyệt đối hành vi so sánh trực tiếp với kiểu số thô (`Number` / `BigInt`). Lý do: MySQL thực hiện Implicit Type Casting khi so sánh cột `VARCHAR` với giá trị kiểu `Number`, khiến engine chuyển đổi **toàn bộ cột** sang `DOUBLE` trước khi so sánh — hành vi này bẻ gãy Composite Index hoàn toàn dưới tải cao. |

**Mẫu chuẩn hóa bắt buộc tại tầng ứng dụng:**

```javascript
// ✅ ĐÚNG: Ép kiểu chuỗi 13 ký tự số trước khi truyền vào Sequelize
const dateValue = String(Date.UTC(year, month, day)); // "1779667200000" — STRING 13 chars
const result = await Schedule.findAll({
  where: {
    doctorId: doctorId,
    date: { [Op.eq]: dateValue } // So sánh VARCHAR vs VARCHAR — Index được bảo toàn
  }
});

// ❌ SAI: Truyền kiểu Number thô — MySQL Implicit Cast phá hủy index
const dateNumber = Date.UTC(year, month, day); // 1779667200000 — NUMBER
await Schedule.findAll({
  where: { date: { [Op.eq]: dateNumber } } // VARCHAR vs NUMBER → Full Table Scan
});
```

## 1.2. Advisory Lock Lifeline Guard

Bằng chứng: `paymentController.js` dòng 596 `GET_LOCK('cron_cleanup_s1', 30)`, dòng 800 `RELEASE_LOCK('cron_cleanup_s1')`.

| Quy tắc | Chi tiết |
|---|---|
| **QT-1.2a** | Trong hook `req.on('close')` của luồng SSE Chatbot (`aiController.js` dòng 218), nếu có Advisory Lock đang mở, BẮT BUỘC thực thi `SELECT RELEASE_LOCK(:lockName)` lập tức. |
| **QT-1.2b** | Trong handler `process.on('SIGTERM')`, BẮT BUỘC giải phóng tất cả Advisory Lock trước khi đóng pool Sequelize. |
| **QT-1.2c** | Giữ nguyên timeout `30` giây. CẤM tăng vượt `30`. |

## 1.3. Chuẩn hóa Raw Query

Toàn bộ 11 câu SQL thuần đã xác nhận trong codebase:

| File | Dòng | Raw SQL | Quy tắc |
|---|---|---|---|
| paymentController | 172 | `SET SESSION innodb_lock_wait_timeout=5` | Giữ nguyên |
| paymentController | 222 | `FROM Bookings WHERE id=:id` | Bọc backtick: `` `Bookings` `` |
| paymentController | 407 | `DATE_ADD(NOW(),INTERVAL 24 HOUR)` | Giữ nguyên cú pháp MySQL |
| paymentController | 596 | `GET_LOCK('cron_cleanup_s1', 30)` | Giữ nguyên |
| paymentController | 700 | `FROM Bookings WHERE id=:id` | Bọc backtick |
| paymentController | 767 | `FROM Bookings WHERE id=:id` | Bọc backtick |
| paymentController | 800 | `RELEASE_LOCK('cron_cleanup_s1')` | Giữ nguyên |
| server.js | 83 | `SELECT @@session.time_zone AS tz` | Giữ nguyên |
| models/index.js | 40 | `SET time_zone = '+07:00'` | Giữ nguyên |

**Quy tắc QT-1.3:** Trên Docker Linux, MySQL mặc định `lower_case_table_names=0` (case-sensitive). BẮT BUỘC bọc backtick hoặc viết đúng CamelCase: `` `Bookings` ``, `` `Schedules` ``. Tên cột: `createdAt`, `reconcileFirstSeenAt` — CẤM `created_at`.

---

# PHÂN KHU 2: ĐỒNG BỘ MÚI GIỜ 3 TẦNG ĐỘC LẬP

## 2.1. Kiến trúc đồng bộ thời gian

| Tầng | Container | Biến môi trường | Cơ chế | Lý do |
|---|---|---|---|---|
| **Dữ liệu** | db-mysql | `TZ=UTC` + `--default-time-zone=+00:00` | MySQL system timezone | Giữ tính toàn vẹn createdAt/updatedAt/expiredAt |
| **Ứng dụng** | app-backend | `TZ=Asia/Ho_Chi_Minh` | Node.js process | Đồng bộ `moment().tz('Asia/Ho_Chi_Minh')` tại paymentController dòng 56-62 cho vnp_CreateDate/vnp_ExpireDate |
| **Driver** | models/index.js | `timezone: '+07:00'` + hook afterConnect | Sequelize per-connection | Ép driver nhận múi giờ VN, triệt tiêu lệch pha 7h khi kiểm tra Token.expiredAt |
| **AI** | aiFunctionHandlers.js | `normalizeDateToTimestamp()` dòng 295-328 | `Date.UTC(Y,M-1,D).toString()` | Khớp trường `date` STRING(20) trong Schedule/Booking |

## 2.2. Quy tắc kiểm tra khởi động

Giữ nguyên `server.js` dòng 83-91: `SELECT @@session.time_zone AS tz` phải trả `'+07:00'`. Nếu sai → `process.exit(1)`.

---

# PHÂN KHU 3: ĐẶC TẢ LỚP CHẮN NGINX SHIELD

## 3.1. Block riêng biệt cho AI SSE Stream

**Đường dẫn:** `location /api/v1/ai/chat`
**Route thực tế:** `web.js` dòng 155 — `POST /api/v1/ai/chat`

| Chỉ thị Nginx | Giá trị | Lý do |
|---|---|---|
| `proxy_buffering` | `off` | Giải phóng ngay chunk text SSE, triệt tiêu độ trễ 200ms |
| `tcp_nodelay` | `on` | Tắt Nagle — đẩy packet nhỏ ngay lập tức |
| `tcp_nopush` | `off` | Phối hợp tcp_nodelay cho SSE real-time |
| `proxy_read_timeout` | `60s` | Khớp Hard Timeout 60s tại aiController dòng 209 |
| `proxy_send_timeout` | `60s` | Đồng bộ cả hai chiều |
| `gzip` | `off` | Tránh Nginx giữ lại gói text stream để nén |
| `proxy_set_header Accept-Encoding` | `""` | Triệt tiêu tiêu đề nén từ client |
| `proxy_ignore_client_abort` | `off` | Khi user tắt tab, Nginx đóng kết nối với Backend ngay, kích hoạt `req.on('close')` dòng 218 |
| `proxy_http_version` | `1.1` | Bật keepalive upstream |
| `proxy_set_header Connection` | `""` | Tái sử dụng socket keepalive |
| `proxy_max_temp_file_size` | `0` | Pure streaming pass-through, giải phóng đĩa |
| `proxy_set_header X-Accel-Buffering` | `no` | Bypass buffering tầng Nginx (khớp header dòng 193 aiController) |

## 3.2. Block bảo vệ API chung

**Đường dẫn:** `location /api/`

> **[!IMPORTANT]**
> Chỉ thị `limit_req_zone` PHẢI được khai báo tại phân vùng `http {}` toàn cục của tệp `nginx.conf`, KHÔNG được đặt bên trong bất kỳ block `location` nào. Xem chi tiết tại **Phần 1 — Tham số HTTP Level** (Part2.md).

| Chỉ thị Nginx | Giá trị | Lý do |
|---|---|---|
| `proxy_buffering` | `on` | Bật đệm cho API thông thường |
| `proxy_buffer_size` | `128k` | Chống tràn header khi nhận webhook VNPay IPN + JWT token lớn |
| `proxy_buffers` | `4 256k` | Đệm response body VNPay |
| `proxy_busy_buffers_size` | `256k` | Tránh 502 khi response lớn |
| `client_max_body_size` | `50M` | Hỗ trợ tải Base64 BLOB('long') từ Clinic/Specialty/User |
| `real_ip_header` | `CF-Connecting-IP` | Định danh IP thực qua Cloudflare |
| `limit_req` | `zone=api_zone burst=20 nodelay` | Áp dụng rate-limit zone đã khai báo tại http global |
| `proxy_max_temp_file_size` | `0` | Chống tràn đĩa tạm khi upload ảnh Base64 lớn |

### 3.2.1. Cô lập loại trừ Rate-Limit cho kết nối lâu

Hai tuyến endpoint kết nối lâu (long-lived) PHẢI được cô lập riêng biệt **TRƯỚC** block `location /api/` và **KHÔNG** áp dụng chỉ thị `limit_req`:

**Tuyến 1 — WebRTC Signaling Handshake:**

| Chỉ thị | Giá trị | Lý do |
|---|---|---|
| `location /socket.io/` | Block riêng biệt | Kết nối WebSocket lâu dài — rate-limit sẽ ngắt handshake |
| `limit_req` | **KHÔNG ÁP DỤNG** | WebSocket upgrade là kết nối đơn lẻ duy trì hàng giờ (proxy_read_timeout 3600s), áp rate-limit sẽ từ chối reconnect hàng loạt khi mạng chập chờn |

**Tuyến 2 — AI Stream SSE:**

| Chỉ thị | Giá trị | Lý do |
|---|---|---|
| `location /api/v1/ai/chat` | Block riêng biệt | Kết nối SSE lâu dài tối đa 60s — rate-limit sẽ cắt stream giữa chừng |
| `limit_req` | **KHÔNG ÁP DỤNG** | SSE stream giữ kết nối mở liên tục 60s, đã có guard `MAX_STREAMS=15` tại aiController dòng 14-15 kiểm soát tải song song |

## 3.3. Block VNPay IPN

**Đường dẫn:** `location = /api/v1/payment/vnpay-ipn`

| Chỉ thị Nginx | Giá trị | Lý do |
|---|---|---|
| `proxy_buffering` | `off` | VNPay IPN yêu cầu response tức thì RspCode |
| `proxy_read_timeout` | `15s` | IPN phải xử lý nhanh |

## 3.4. Block Socket.IO / WebRTC Signaling

**Đường dẫn:** `location /socket.io/`

| Chỉ thị Nginx | Giá trị | Lý do |
|---|---|---|
| `proxy_set_header Upgrade` | `$http_upgrade` | Nâng cấp giao thức WebSocket |
| `proxy_set_header Connection` | `"Upgrade"` | Bắt buộc cho WS handshake |
| `proxy_set_header X-Forwarded-Proto` | `$scheme` | Chống Mixed Content |
| `proxy_read_timeout` | `3600s` | Giữ kết nối WS 1 giờ |
| `proxy_http_version` | `1.1` | WS yêu cầu HTTP/1.1 |

---

# PHÂN KHU 4: KIÊN CỐ HÓA ĐƯỜNG TRUYỀN, REDIS TTL VÀ KERNEL ENTROPY

## 4.1. Outbound Egress Whitelist

| Đích | Port | Protocol | Mục đích | Bằng chứng mã nguồn |
|---|---|---|---|---|
| `*.vnpayment.vn` | 443 | HTTPS | Thanh toán VNPay + QueryDR | paymentController dòng 574 `axios.post(VNP_API_URL)` |
| `smtp.gmail.com` | 587 | TLS | Email thông báo | emailService dòng 4-6 `host: 'smtp.gmail.com', port: 587` |
| `smtp.gmail.com` | 465 | SSL | Fallback email | Kèm quy tắc ép IPv4 `family: 4` |
| `*.googleapis.com` | 443 | HTTPS | Gemini API | aiController dòng 11, aiService dòng 14 `GoogleGenerativeAI` |

## 4.2. Mạng nội bộ cô lập & Redis

**Mạng Docker Bridge:**

| Tham số | Giá trị | Lý do |
|---|---|---|
| `com.docker.network.driver.mtu` | `1400` | Tránh vỡ mảnh gói tin Base64 ảnh lớn 50M qua Docker overlay |
| db-mysql port 3306 | CẤM expose ra host | Chỉ giao tiếp nội bộ booking-network |
| redis-cache port 6379 | CẤM expose ra host | Chỉ giao tiếp nội bộ |

**Cấu hình Redis:**

| Tham số | Giá trị | Lý do |
|---|---|---|
| `REDIS_HOST` | `redis-cache` | Tên service nội bộ Docker |
| `REDIS_PORT` | `6379` | Port mặc định Redis |
| `maxmemory` | `128mb` | Giới hạn cứng RAM Redis |
| `maxmemory-policy` | `volatile-lru` | Chỉ evict xóa key có TTL (lịch sử chat AI) — bảo vệ Idempotency Key VNPay không có TTL |
| `appendonly` | `yes` | Tránh mất dữ liệu khi container restart |
| `enableOfflineQueue` | `false` | Tắt hàng đợi ngoại tuyến tại `redisClient.js` — tránh treo RAM Backend |
| TTL cho Sliding Window History | `EXPIRE key 7200` (2 giờ) | Giới hạn thời gian sống key phiên chat AI |

## 4.3. Entropy Starvation Guard

| Cấu hình Docker Compose | Giá trị | Lý do |
|---|---|---|
| Volume mount Backend | `/dev/urandom:/dev/urandom:ro` | Đảm bảo crypto.randomUUID() (paymentController dòng 163, 263) và crypto.createHmac() (VNPay checksum) luôn đủ Entropy, chống Freeze luồng Node.js khi tải cao |

---

# PHÂN KHU 5: TIÊU CHUẨN AN TOÀN FILE .ENV VÀ BẪY BIẾN FRONTEND

## 5.1. Quy tắc an toàn tệp .env

| Quy tắc | Ví dụ đúng | Ví dụ sai |
|---|---|---|
| CẤM ngoặc kép/đơn bao giá trị | `JWT_SECRET=bookingcare-key` | `JWT_SECRET="bookingcare-key"` |
| Escape ký tự `$` bằng `\` | `PASSWORD=abc\$123` | `PASSWORD=abc$123` |
| CẤM khoảng trắng trong Secret | `SECRET=abcxyz` | `SECRET=abc xyz` |
| CẤM dấu thăng `#` trong Secret | `SECRET=abcxyz` | `SECRET=abc#xyz` |
| Nhân đôi `$$` cho Docker Compose | `API_KEY=abc$$$$123` | `API_KEY=abc$$123` (Docker nội suy biến dạng) |

### 5.1.1. Quy trình phân quyền cứng tệp .env trên Production Host

| Bước | Lệnh Linux | Lý do |
|---|---|---|
| **Bước 1** | `chmod 600 .env.production` | Ép phân quyền cứng: chỉ chủ sở hữu (owner) được đọc/ghi, chặn hoàn toàn truy cập từ group và other |
| **Bước 2** | `chown root:root .env.production` | Chuyển đổi quyền sở hữu về tài khoản root, ngăn chặn tiến trình non-root đọc được secret |
| **Xác minh** | `ls -la .env.production` | Kết quả kỳ vọng: `-rw------- 1 root root` |

> **[!CAUTION]**
> Quy trình này BẮT BUỘC thực thi trên mọi môi trường máy host vật lý Production trước khi khởi chạy `docker compose up`. Nếu tệp `.env.production` có quyền `644` hoặc `755`, bất kỳ tiến trình nào trên host đều có thể đọc được toàn bộ secret bao gồm `VNP_HASH_SECRET`, `GEMINI_API_KEY`, và `JWT_SECRET`.

## 5.2. Bẫy biến VITE_ (Frontend Isolation Guard)

| Quy tắc | Chi tiết |
|---|---|
| **QT-5.2a** | Biến `VITE_BACKEND_URL` và `VITE_APP_NAME` BẮT BUỘC nạp qua `ARG` trong Dockerfile Frontend tại thời điểm Build-Time. |
| **QT-5.2b** | CẤM truyền biến `VITE_*` qua block `environment` của Docker Compose (Run-Time) vì Vite bake biến lúc build — truyền lúc runtime hoàn toàn vô tác dụng, gây trắng trang. |
| **QT-5.2c** | Khi đổi giá trị `VITE_*`, BẮT BUỘC rebuild với `--no-cache`: `docker compose build --no-cache app-frontend` |

---

# PHÂN KHU 6: BỌC THÉP KHỞI TẠO, THỨ TỰ SEED VÀ CÔ LẬP HEALTHCHECK

## 6.1. Sync & Seed Order

Bằng chứng: `models/index.js` dòng 211: `db.syncSchema = () => sequelize.sync({ alter: true })`.

| Quy tắc | Chi tiết |
|---|---|
| **QT-6.1a** | Thay `alter: true` thành `alter: { drop: false }` — cập nhật cấu trúc bảng Phase 11/12 mà KHÔNG xóa dữ liệu lịch sử bệnh nhân. |
| **QT-6.1b** | Bọc hàm kiểm tra `Allcode.count() === 0` bằng Transaction Lock: `SELECT GET_LOCK('seed_lock', 10)` trước khi kích hoạt seeder, chặn race condition khi chạy nhiều instance trên Docker. |
| **QT-6.1c** | Thứ tự thực thi: `sequelize.sync()` → `Allcode.count()` check → Seed nếu `=== 0` → `RELEASE_LOCK('seed_lock')`. |

## 6.2. Anti-Deadlock Healthcheck

Bằng chứng: `web.js` dòng 32: `app.get('/api/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }))` — hiện tại endpoint health chỉ trả JSON tĩnh, KHÔNG gọi DB.

| Quy tắc | Chi tiết |
|---|---|
| **QT-6.2a** | Endpoint `/api/health` TUYỆT ĐỐI KHÔNG được gọi `db.sequelize.authenticate()` hoặc Redis PING mà không cài timeout cứng dưới 2 giây. |
| **QT-6.2b** | Thiết kế hàm check trạng thái bộ nhớ độc lập: `process.memoryUsage().heapUsed < threshold` + biến trạng thái `isDbReady` được set `true` sau khi boot thành công. |
| **QT-6.2c** | Nếu DB đang chạy seed hoặc sync, healthcheck trả HTTP 200 với `{ status: 'warming' }` thay vì gọi `authenticate()` gây nghẽn pool → Docker restart loop vô hạn. |
