# PHASE 13 — ĐẠI PHẪU DOCKER & POSTGRESQL MIGRATION

## Tài liệu Kiến trúc Triển khai Production — BookingCare

> **Version:** 1.0 | **Ngày:** 2026-04-28 | **Tác giả:** Principal Cloud Architect
> **Dựa trên:** Phase 11 Architectural Specification v20.6 — 64 Guards

---

# PHẦN 1: BƯỚC CHUẨN BỊ BẮT BUỘC (PRE-DOCKER CHECKLIST)

> [!CAUTION]
> MỌI THAY ĐỔI TRONG PHẦN NÀY **BẮT BUỘC** THỰC HIỆN TRƯỚC KHI BUILD DOCKER.
> Nếu bỏ qua → hệ thống SẼ SẬP khi lên Production.

---

## 1.1. Sửa CORS — Thêm `maxAge: 86400`

**File:** `bookingcare-backend/src/server.js`

```diff
 app.use(cors({
   origin: [process.env.URL_REACT, 'https://sandbox.vnpayment.vn'],
   methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
   credentials: true,
+  maxAge: 86400,
 }));
```

---

## 1.2. Trust Proxy — Dải nội bộ Docker

**File:** `bookingcare-backend/src/server.js`

```diff
-app.set('trust proxy', 1);
+// [THE EXPRESS PROXY DEPTH GUARD]: Trust proxy dải nội bộ Docker
+app.set('trust proxy', ['loopback', 'linklocal', 'uniquelocal']);
```

---

## 1.3. Express Body Limit — 50MB

**File:** `bookingcare-backend/src/server.js`

Thay thế `bodyParser` bằng `express.json()` native (Express 5 tích hợp sẵn):

```diff
-const bodyParser = require('body-parser');
 // ... (bỏ require body-parser)

-app.use(bodyParser.json({ limit: '8mb' }));
-app.use(bodyParser.urlencoded({ limit: '8mb', extended: true }));
+// [GUARD] express.json/urlencoded limit 50mb
+app.use(express.json({ limit: '50mb' }));
+app.use(express.urlencoded({ limit: '50mb', extended: true }));
```

---

## 1.4. Bcrypt Salt ≤ 10

**Trạng thái:** ✅ ĐÃ TUÂN THỦ

- `seedAllcode.js` dòng 197: `bcrypt.genSaltSync(10)` → OK
- `userService.js` dòng 8: dùng `bcrypt.hash()` async → cần xác nhận salt rounds ≤ 10

---

## 1.5. NodeMailer — Ép IPv4

**File:** `bookingcare-backend/src/services/emailService.js`

```diff
 const transporter = nodemailer.createTransport({
   host: 'smtp.gmail.com',
   port: 587,
   secure: false,
+  // [THE NODE 18 IPv6 DEADLOCK GUARD]: Ép IPv4 cho SMTP
+  family: 4,
   auth: {
     user: process.env.EMAIL_APP_USERNAME,
     pass: process.env.EMAIL_APP_PASSWORD,
   },
 });
```

---

## 1.6. VNP_RETURN_URL — Đổi sang domain Production

**File:** `bookingcare-backend/.env`

```diff
-VNP_RETURN_URL=http://localhost:3000/payment-result
+VNP_RETURN_URL=https://YOUR_DOMAIN.com/payment-result
```

> [!WARNING]
> Giá trị `localhost` sẽ khiến VNPay redirect về sai địa chỉ trên Production.

---

## 1.7. Seed sau Sync — Đảm bảo thứ tự

**Trạng thái:** ✅ ĐÃ TUÂN THỦ

`seedAllcode.js` dòng 189: `await db.sequelize.sync({ force: true })` chạy TRƯỚC seed data.

---

## 1.8. vite.config.js — Tắt Source Map Production

**File:** `bookingcare-frontend/vite.config.js`

```diff
 export default defineConfig({
   plugins: [react()],
+  // [THE VITE SOURCE MAP GUARD]: Tắt source map production
+  build: {
+    sourcemap: false,
+  },
   server: {
     port: 3000,
     open: true,
   },
```

---

## 1.9. Graceful Shutdown — SIGTERM Handler

**File:** `bookingcare-backend/src/server.js` — THÊM VÀO CUỐI FILE:

```javascript
// ═══════════════════════════════════════════════════════════════════════
// [Ultimate Graceful Shutdown Guard]
// process.on('SIGTERM') → Hủy CronJob → setTimeout → sequelize.close()
// ═══════════════════════════════════════════════════════════════════════
let server; // Thay app.listen() thành: server = app.listen(...)

process.on("SIGTERM", () => {
  console.log("⚠️ [SIGTERM] Graceful shutdown initiated...");

  // 1. Hủy CronJob (nếu có)
  // cleanupCronJob?.stop();

  // 2. Dừng nhận request mới
  server.close(() => {
    console.log("✅ HTTP server closed");
  });

  // 3. Chờ request đang xử lý hoàn tất (10s), rồi đóng DB
  setTimeout(async () => {
    // [THE SHUTDOWN DEADLOCK GUARD]: Ép thoát sau 5s nếu DB treo
    setTimeout(() => process.exit(1), 5000).unref();

    try {
      await db.sequelize.close();
      console.log("✅ Database connection closed");
    } catch (err) {
      console.error("❌ Error closing DB:", err);
    }
    process.exit(0);
  }, 10000);
});
```

> [!IMPORTANT]
> Đổi `app.listen(PORT, ...)` thành `server = app.listen(PORT, ...)`

---

## 1.10. .env — Xóa ngoặc kép, ESCAPE dấu `$`, CẤM `#` và khoảng trắng trong Secret

**File:** `bookingcare-backend/.env`

Quy tắc:

- ❌ `JWT_SECRET="bookingcare-secret"` → ✅ `JWT_SECRET=bookingcare-secret`
- ❌ `PASS=abc$123` → ✅ `PASS=abc\$123` (escape dấu `$`)
- ❌ `SECRET=abc#xyz` → ✅ `SECRET=abcxyz` (xóa `#`)
- ❌ `SECRET=abc def` → ✅ `SECRET=abcdef` (xóa khoảng trắng)

**Trạng thái hiện tại:** ✅ Không có ngoặc kép. Cần kiểm tra lại khi đổi secret thật.

---

## 1.11. MULTER GUARD (Nếu thêm upload feature)

> [!CAUTION]
> **CẢNH BÁO TỬ THẦN 1:** MULTER CHỈ DÙNG `diskStorage()`. TUYỆT ĐỐI CẤM `.svg` TRONG FILTER ĐỂ CHỐNG XSS BOMBS.
> **CẢNH BÁO TỬ THẦN 2:** TRONG CONTROLLER BẮT BUỘC XÓA FILE TRONG KHỐI `catch` VÀ CÓ `req.on('aborted', () => {...unlink...})`.

Hiện tại project **KHÔNG** sử dụng Multer. Nếu bổ sung:

```javascript
const multer = require("multer");
const fs = require("fs");
const path = require("path");

// [THE MULTER OOM GUARD]: BẮT BUỘC DÙNG diskStorage(), TUYỆT ĐỐI CẤM memoryStorage()
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "./uploads"),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  // ⛔ CẤM .svg — XSS Bomb vector
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error("File type not allowed"), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 },
});

// Controller pattern:
async function handleUpload(req, res) {
  // ⚠️ [THE DANGLING FILE GUARD]: BẮT BUỘC DÙNG unlinkSync KHI ABORTED
  req.on("aborted", () => {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
  });

  try {
    // ... logic
  } catch (err) {
    // ⚠️ [THE DANGLING FILE GUARD]: BẮT BUỘC DÙNG unlinkSync TRONG CATCH
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(500).json({ errCode: -1 });
  }
}
```

---

## 1.12. [CẢNH BÁO BẢO MẬT & WEBRTC]

- **Chống Docker Bypass UFW:** Docker mặc định bypass tường lửa UFW của Linux. Để chặn IP lạ chọc thẳng vào cổng 80/443 của Nginx (qua mặt Cloudflare), **BẮT BUỘC** phải cấu hình Cloudflare Tunnels (`cloudflared`) HOẶC sử dụng Cloudflare Authenticated Origin Pulls (mTLS) trên Nginx.
- **Firewall UDP (10000-20000)** — bắt buộc mở cho WebRTC media nếu triển khai video call.
- Cấu hình **STUN/TURN** server riêng.

---

# PHẦN 2: TỔNG QUAN HẠ TẦNG (DOCKER NETWORK)

```
┌─────────────────────────────────────────────────────────┐
│                  booking-network (MTU 1450)              │
│                                                          │
│  ┌──────────┐    ┌──────────────┐    ┌───────────────┐  │
│  │  Nginx   │───▶│  app-backend │───▶│  db-postgres  │  │
│  │ (FE+Proxy│    │  (Node 18)   │    │ (PostgreSQL)  │  │
│  │  :8080)  │    │  expose:8080 │    │  TÀNG HÌNH    │  │
│  └──────────┘    └──────────────┘    └───────────────┘  │
│       │                │                                 │
│       │                ▼                                 │
│  LỘ PORT 80     ┌──────────────┐                        │
│  (0.0.0.0:80    │  redis-cache │                        │
│   → 8080)       │  TÀNG HÌNH   │                        │
│                  └──────────────┘                        │
└─────────────────────────────────────────────────────────┘
```

**Nguyên tắc:**

- **Nginx** là cổng duy nhất lộ ra ngoài (port 80 → 8080 internal).
- **Postgres** và **Redis** KHÔNG expose port ra host — chỉ giao tiếp nội bộ.
- **MTU 1450** — [THE DOCKER MTU BLACKHOLE GUARD] tránh packet fragmentation trong overlay network.

---

## 2.1. [⚠️ BẮT BUỘC - OUTBOUND EGRESS POLICY]

> [!CAUTION]
> Hệ thống có giao tiếp với các dịch vụ bên ngoài. Container **app-backend** BẮT BUỘC phải được cấp quyền truy cập **Outbound (Internet chiều ra)** tới các đích sau. Nếu dùng Firewall Cloud (AWS Security Group / VPC), **phải whitelist**:

| Đích (Destination)         | Port | Protocol | Mục đích                        |
|----------------------------|------|----------|---------------------------------|
| VNPay API (`*.vnpayment.vn`) | 443  | HTTPS    | Thanh toán & QueryDR            |
| Gmail SMTP (`smtp.gmail.com`) | 587  | TLS      | Gửi email xác nhận lịch hẹn    |
| Gmail SMTP (`smtp.gmail.com`) | 465  | SSL      | Fallback nếu port 587 bị chặn  |

> [!WARNING]
> Nếu Egress bị chặn → VNPay IPN sẽ không thể verify, email xác nhận sẽ không gửi được → **hệ thống tê liệt**.
