# 📋 Phase 8 – File 5: Email Service — Gửi kết quả khám kèm ảnh

> **File:** `src/services/emailService.js`  
> **SRS Sections:** 3.13 | **REQ:** DR-008, DR-009, DR-010  
> **Mục tiêu:** Gửi email chứa kết quả khám bệnh (hóa đơn/toa thuốc) kèm ảnh đính kèm cho bệnh nhân.

---

## 1. Tổng quan Email Remedy Flow

```
RemedyModal (Frontend)              Backend                    Gmail SMTP
─────────────────────              ───────                    ──────────
      │                               │                           │
      │ POST /remedy                  │                           │
      │ {email, imageBase64,          │                           │
      │  doctorName, language}        │                           │
      │ ─────────────────────────►    │                           │
      │                               │                           │
      │                    ┌──────────▼──────────┐               │
      │                    │ doctorService.js     │               │
      │                    │ 1. Validate image    │               │
      │                    │ 2. Update S2 → S3    │               │
      │                    │ 3. Call emailService  │               │
      │                    └──────────┬──────────┘               │
      │                               │                           │
      │                    ┌──────────▼──────────┐               │
      │                    │ emailService.js      │               │
      │                    │ sendEmailRemedy()    │               │
      │                    │                      │               │
      │                    │ 1. Build HTML content │               │
      │                    │ 2. Parse base64 image │               │
      │                    │ 3. Detect MIME → ext  │               │
      │                    │ 4. Attach file        │               │
      │                    └──────────┬──────────┘               │
      │                               │                           │
      │                               │  SMTP (port 587)         │
      │                               │ ────────────────────►    │
      │                               │                           │
      │                               │    Email sent ✅          │
      │    { errCode: 0 }             │ ◄────────────────────    │
      │ ◄────────────────────────     │                           │
```

---

## 2. Template HTML gửi email bệnh nhân

### 2.1 Template Tiếng Việt

```html
<h3>Xin chào,</h3>
<p>Bạn nhận được kết quả khám bệnh từ bác sĩ <b>${doctorName}</b>.</p>
<p>Thông tin kết quả khám được gửi trong file đính kèm.</p>
<p>Xin chân thành cảm ơn!</p>
```

### 2.2 Template Tiếng Anh

```html
<h3>Dear Patient,</h3>
<p>You have received medical results from Dr. <b>${doctorName}</b>.</p>
<p>Please find the results in the attached file.</p>
<p>Thank you!</p>
```

### 2.3 Bảng Subject theo ngôn ngữ

| Language | Subject Line |
|----------|-------------|
| `vi` | `Kết quả khám bệnh` |
| `en` | `Medical Examination Results` |

---

## 3. Code hướng dẫn: `sendEmailRemedy` (Nodemailer)

### 3.1 ⭐ Khung code Nodemailer đầy đủ

```javascript
// src/services/emailService.js
const nodemailer = require('nodemailer');

// ===== CẤU HÌNH TRANSPORTER (Gmail SMTP) =====
// SRS REQ-DR-009: Hỗ trợ đính kèm file (PDF, hình ảnh)
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,            // TLS
  secure: false,        // true cho port 465, false cho port 587
  auth: {
    user: process.env.EMAIL_APP_USERNAME,   // Gmail address
    pass: process.env.EMAIL_APP_PASSWORD,   // App Password (16 ký tự)
  },
});

// ===== GỬI EMAIL KẾT QUẢ KHÁM (REQ-DR-008, 009, 010) =====
const sendEmailRemedy = async (data) => {
  // ===== 1. BUILD HTML CONTENT — ĐA NGÔN NGỮ =====
  const htmlContent = data.language === 'vi'
    ? `<h3>Xin chào,</h3>
       <p>Bạn nhận được kết quả khám bệnh từ bác sĩ <b>${data.doctorName}</b>.</p>
       <p>Thông tin kết quả khám được gửi trong file đính kèm.</p>
       <p>Xin chân thành cảm ơn!</p>`
    : `<h3>Dear Patient,</h3>
       <p>You have received medical results from Dr. <b>${data.doctorName}</b>.</p>
       <p>Please find the results in the attached file.</p>
       <p>Thank you!</p>`;

  // ===== 2. ⭐ XỬ LÝ CHUỖI ẢNH BASE64 (CRITICAL) =====
  //
  // Frontend gửi chuỗi đầy đủ:
  //   "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ..."
  //
  // Nodemailer attachments yêu cầu RAW base64 (không có prefix):
  //   "/9j/4AAQSkZJRgABAQ..."
  //
  // → Phải tách prefix ra bằng .split('base64,')[1]

  // ✅ Kiểm tra có chứa prefix 'base64,' không
  const base64Raw = data.imageBase64.includes('base64,')
    ? data.imageBase64.split('base64,')[1]   // Tách lấy phần RAW
    : data.imageBase64;                       // Đã là raw rồi → dùng luôn

  // ===== 3. DETECT MIME TYPE → FILE EXTENSION =====
  // Từ prefix "data:image/jpeg;base64," → lấy "jpeg" → extension "jpg"
  const mimeMatch = data.imageBase64.match(/^data:(image\/[a-zA-Z+]+);base64,/);
  const ext = mimeMatch
    ? mimeMatch[1].split('/')[1].replace('jpeg', 'jpg')  // jpeg → jpg
    : 'png';  // Fallback nếu không detect được

  // ===== 4. GỬI EMAIL VỚI ATTACHMENT =====
  await transporter.sendMail({
    from: '"BookingCare" <noreply@bookingcare.vn>',
    to: data.email,
    subject: data.language === 'vi'
      ? 'Kết quả khám bệnh'
      : 'Medical Examination Results',
    html: htmlContent,
    attachments: [
      {
        filename: `ket-qua-kham-${Date.now()}.${ext}`,  // VD: ket-qua-kham-1743552000000.jpg
        content: base64Raw,     // ✅ RAW base64 — KHÔNG có prefix
        encoding: 'base64',     // Nói cho Nodemailer biết content là base64
      },
    ],
  });
};
```

---

### 3.2 ⭐ Giải thích chi tiết xử lý chuỗi ảnh Base64

Đây là phần **dễ gây bug nhất** trong toàn bộ Phase 8:

```
FRONTEND                           BACKEND emailService.js            NODEMAILER
──────────                         ─────────────────────────          ──────────

CommonUtils.getBase64(file)
       │
       ▼
"data:image/jpeg;base64,/9j/4A..."  ──► data.imageBase64
                                              │
                                    ┌─────────▼──────────┐
                                    │ STEP 1: Kiểm tra   │
                                    │ .includes('base64,')│
                                    │ → true              │
                                    └─────────┬──────────┘
                                              │
                                    ┌─────────▼──────────┐
                                    │ STEP 2: Tách raw   │
                                    │ .split('base64,')  │
                                    │ [1]                │
                                    │ → "/9j/4A..."       │
                                    └─────────┬──────────┘
                                              │
                                    ┌─────────▼──────────┐
                                    │ STEP 3: Detect ext │
                                    │ .match(regex)       │
                                    │ → "jpeg" → "jpg"    │
                                    └─────────┬──────────┘
                                              │
                                              ▼
                                    attachments: [{
                                      filename: "ket-qua-kham-xxx.jpg",
                                      content: "/9j/4A...",     ──► Base64 decode
                                      encoding: 'base64'              → Binary file
                                    }]                                  → Attached ✅
```

### 3.3 Bảng các trường hợp xử lý chuỗi

| Input `data.imageBase64` | `.includes('base64,')` | `base64Raw` | `ext` |
|--------------------------|----------------------|-------------|-------|
| `"data:image/jpeg;base64,/9j/4A..."` | ✅ true | `"/9j/4A..."` | `jpg` |
| `"data:image/png;base64,iVBORw0K..."` | ✅ true | `"iVBORw0K..."` | `png` |
| `"/9j/4AAQSkZJR..."` (raw, no prefix) | ❌ false | `"/9j/4AAQ..."` | `png` (fallback) |

### 3.4 ⚠️ Các BUG phổ biến nếu xử lý sai

| Bug | Nguyên nhân | Hậu quả |
|-----|------------|---------|
| **File đính kèm 0 bytes** | Frontend tách prefix trước khi gửi → backend `.split()` lần nữa → empty string | Bệnh nhân nhận email nhưng file trống |
| **File đính kèm bị hỏng** | Gửi full string (có prefix) làm base64 content → Nodemailer decode sai | File ảnh không mở được |
| **Extension sai** | Không detect MIME → dùng fallback `.png` cho JPEG → client hiển thị sai icon | Ảnh mở được nhưng extension confusing |
| **Encoding sai** | Quên `encoding: 'base64'` → Nodemailer coi `content` là plain text | File đính kèm chứa text base64 raw |

---

## 4. Cấu hình Environment Variables

```bash
# .env (backend)
EMAIL_APP_USERNAME=bookingcare.noreply@gmail.com
EMAIL_APP_PASSWORD=abcd efgh ijkl mnop    # Gmail App Password (16 ký tự)
```

### Cách tạo Gmail App Password:
1. Đăng nhập Google Account → Security
2. Bật **2-Step Verification** (bắt buộc)
3. Vào **App passwords** → Generate
4. Chọn "Mail" → Copy 16 ký tự vào `.env`

---

## 5. Tóm tắt checklist Email Service

| # | Logic | Chi tiết |
|---|-------|---------|
| 1 | Transporter config | Gmail SMTP, port 587, TLS |
| 2 | HTML template | Đa ngôn ngữ vi/en, có tên bác sĩ |
| 3 | Base64 parse | `.includes('base64,')` → `.split('base64,')[1]` |
| 4 | MIME detection | Regex match → extract extension |
| 5 | `jpeg` → `jpg` | `.replace('jpeg', 'jpg')` cho tên file chuẩn |
| 6 | Attachment config | `content: rawBase64`, `encoding: 'base64'` |
| 7 | Filename unique | `ket-qua-kham-${Date.now()}.${ext}` |

---

> **Tiếp theo:** [Phase8_05_Translations_And_Tests.md](./Phase8_05_Translations_And_Tests.md) — i18n keys và Test Cases
