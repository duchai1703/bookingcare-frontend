# 🔌 TÀI LIỆU HƯỚNG DẪN PROMPT TÍCH HỢP MOBILE APP (ANDROID STUDIO) VỚI BACKEND BOOKINGCARE

> **Dự án:** BookingCare – Hệ thống đặt lịch khám bệnh trực tuyến  
> **Tài liệu:** Đồ án 2 (UIT) – Phase 0: Chuẩn bị  
> **Phiên bản:** 1.0 | **Ngày tạo:** 01/09/2026  
> **Tác giả:** Đặng Ngọc Trường Giang & Trần Đức Hải  
> **Mục tiêu:** Hướng dẫn sinh Prompt chuẩn xác cho AI trong Android Studio (Kotlin / Jetpack Compose / React Native) để gọi đúng API, parse đúng JSON & hiển thị chuẩn dữ liệu từ Backend Express.js + PostgreSQL.  
> **Vị trí file:** `DOCS-DoAn2/Phase0-ChuanBi/08_TaiLieu_Prompt_TichHop_Mobile_Backend.md`

---

## MỤC LỤC

1. [Cấu hình Hạ tầng Mạng & Kết nối Android Emulator](#1-cấu-hình-hạ-tầng-mạng--kết-nối-android-emulator)
2. [Quy chuẩn Cấu trúc Dữ liệu API (API Schema Contract)](#2-quy-chuẩn-cấu-trúc-dữ-liệu-api-api-schema-contract)
3. [Quy tắc Xử lý Dữ liệu Đặc thù (Data Converters & Parsers)](#3-quy-tắc-xử-lý-dữ-liệu-đặc-thù-data-converters--parsers)
4. [Bộ Prompt Mẫu Tích hợp Backend (Master Integration Prompts)](#4-bộ-prompt-mẫu-tích-hợp-backend-master-integration-prompts)
   - [PROMPT A: Khởi tạo Network Module & Axios/Retrofit Client](#prompt-a-khởi-tạo-network-module--axiosretrofit-client)
   - [PROMPT B: Data Models & Response Parsers](#prompt-b-data-models--response-parsers)
   - [PROMPT C: Tích hợp Xác thực Auth (Login / Register / JWT Token Store)](#prompt-c-tích-hợp-xác-thực-auth-login--register--jwt-token-store)
   - [PROMPT D: Tích hợp Màn hình Trang chủ, Chuyên khoa & Cơ sở Y tế](#prompt-d-tích-hợp-màn-hình-trang-chủ-chuyên-khoa--cơ-sở-y-tế)
   - [PROMPT E: Tích hợp Chi tiết Bác sĩ & Selector Lịch khám theo Ngày](#prompt-e-tích-hợp-chi-tiết-bác-sĩ--selector-lịch-khám-theo-ngày)
   - [PROMPT F: Tích hợp Luồng Đặt lịch Khám & Thanh toán VNPay Sandbox](#prompt-f-tích-hợp-luồng-đặt-lịch-khám--thanh-toán-vnpay-sandbox)
   - [PROMPT G: Tích hợp Màn hình Quản lý Lịch hẹn & Render QR Code Check-in](#prompt-g-tích-hợp-màn-hình-quản-lý-lịch-hẹn--render-qr-code-check-in)
   - [PROMPT H: Tích hợp Trợ lý Y tế AI Chatbot Gemini (SSE Stream text)](#prompt-h-tích-hợp-trợ-lý-y-tế-ai-chatbot-gemini-sse-stream-text)
5. [Checklist Kiểm tra Tích hợp Mạng & Khắc phục Lỗi Thường gặp](#5-checklist-kiểm-tra-tích-hợp-mạng--khắc-phục-lỗi-thường-gặp)

---

## 1. CẤU HÌNH HẠ TẦNG MẠNG & KẾ NỐI ANDROID EMULATOR

### 1.1. Địa chỉ IP & Cổng kết nối (Network Endpoints)

| Môi trường | Base URL Backend | Ghi chú |
|------------|------------------|---------|
| **Android Emulator (Default)** | `http://10.0.2.2:3001/api/v1` | `10.0.2.2` trỏ tới `localhost` của máy tính Host |
| **Thiết bị thật Android (Cùng WiFi)** | `http://<IP_MAY_TINH>:3001/api/v1` | Ví dụ: `http://192.168.1.15:3001/api/v1` |
| **Production Server** | `https://api.bookingcare.domain.vn/api/v1` | Khi deploy Docker VPS |

> ⚠️ **LƯU Ý QUAN TRỌNG:** Trên Android OS từ phiên bản 9.0 (API 28) trở lên, hệ thống mặc định **CHẶN** kết nối `http://` (Cleartext HTTP). Phải bật quyền Cleartext Traffic trong `AndroidManifest.xml`.

### 1.2. Cấu hình `AndroidManifest.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <!-- Cấp quyền Internet -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.CAMERA" />

    <application
        android:usesCleartextTraffic="true"
        android:networkSecurityConfig="@xml/network_security_config"
        ... >
    </application>
</manifest>
```

---

## 2. QUY CHUẨN CẤU TRÚC DỮ LIỆU API (API SCHEMA CONTRACT)

Toàn bộ các Endpoint của Backend Express.js trả về dữ liệu theo cấu trúc chuẩn:

```json
{
  "errCode": 0,
  "message": "OK",
  "data": { ... } // Hoặc danh sách array [ ... ]
}
```

### 2.1. Quy chuẩn Mã lỗi `errCode`

| `errCode` | Ý nghĩa | Hành động hiển thị trên Mobile App |
|-----------|---------|------------------------------------|
| `0` | Thành công | Parse dữ liệu trong trường `data` và render UI |
| `1` / `2` / `3` | Thiếu tham số input / Dữ liệu không hợp lệ | Hiển thị Toast thông báo lỗi cụ thể |
| `-1` | Không tìm thấy tài khoản / Mật khẩu không đúng | Báo lỗi ngay dưới ô Input Form |
| `-2` | Xung đột Idempotency / Request đang xử lý | Hiển thị Dialog chờ 3s rồi retry |
| `401` / `403` | Token JWT hết hạn hoặc Không có quyền (R3) | Tự động đăng xuất & đẩy về `S01_LoginScreen` |
| `429` | Quá nhiều request (Rate-limit) | Báo "Thao tác quá nhanh, vui lòng thử lại sau 15 phút" |

---

## 3. QUY TẮC XỬ LÝ DỮ LIỆU ĐẶC THÙ (DATA CONVERTERS & PARSERS)

### 3.1. Xử lý Ảnh đại diện (PostgreSQL BYTEA → Base64 Image)
Backend trả về ảnh dưới dạng chuỗi Pure Base64 (được decode từ kiểu dữ liệu `BYTEA` trong PostgreSQL).
- **Format trả về:** Chuỗi mã hóa Base64 không chứa prefix (VD: `"iVBORw0KGgoAAAANSUhEUgAA..."`).
- **Quy tắc render trên Mobile:**
  - Cần nối thêm Prefix `data:image/jpeg;base64,` trước khi nạp vào ImageView/Image Component.
  - Nếu trường `image` bị null hoặc rỗng → Dùng ảnh mặc định Placeholder (`default_avatar.png`).

```javascript
// React Native Image Render
const imageUri = user.image 
  ? `data:image/jpeg;base64,${user.image}` 
  : require('../assets/images/default_avatar.png');
```

```kotlin
// Kotlin Jetpack Compose Image Render
val imageBytes = Base64.decode(base64String, Base64.DEFAULT)
val bitmap = BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.size)
Image(bitmap = bitmap.asImageBitmap(), contentDescription = null)
```

### 3.2. Xử lý Timestamp Ngày khám (Unix Epoch ms → Date String)
Trường `date` trong bảng `Schedules` và `Bookings` lưu Timestamp mili-giây dạng String (VD: `"1788220800000"`).
- **Múi giờ bắt buộc:** `Asia/Ho_Chi_Minh` (`+07:00`).
- **Chuyển đổi:** `1788220800000` → `"Thứ Tư, 02/09/2026"`.

### 3.3. Ánh xạ Mã Giá tiền & Trạng thái Khám (Allcode Map)

| Loại (`type`) | KeyMap | ValueVi (Tiếng Việt) | ValueEn (Tiếng Anh) |
|---------------|--------|----------------------|--------------------|
| **STATUS** | `S1` | Lịch mới tạo (Chờ xác nhận) | New Booking |
| **STATUS** | `S1.5` | Chờ thanh toán VNPay | Awaiting Payment |
| **STATUS** | `S2` | Đã xác nhận (Đã thanh toán) | Confirmed |
| **STATUS** | `S3` | Đã hoàn thành khám | Completed |
| **STATUS** | `S4` | Đã hủy lịch | Cancelled |
| **PRICE** | `PRI1` | 200.000 VNĐ | $10 |
| **PRICE** | `PRI2` | 300.000 VNĐ | $15 |
| **PRICE** | `PRI3` | 500.000 VNĐ | $25 |

---

## 4. BỘ PROMPT MẪU TÍCH HỢP BACKEND (MASTER INTEGRATION PROMPTS)

Gửi từng Prompt dưới đây vào AI Assistant trong Android Studio để tạo từng tầng mã nguồn.

---

### 🟢 PROMPT A: Khởi tạo Network Module & Axios/Retrofit Client

```text
Hãy tạo cho tôi file NetworkModule kết nối tới Backend BookingCare Node.js Express:

CẤU HÌNH KẾT NỐI:
- Base URL: http://10.0.2.2:3001/api/v1 (Cho Android Emulator)
- Timeout: Connect 10 giây, Read 30 giây.
- Header mặc định: Content-Type: application/json

CHỨC NĂNG CẦN CÓ (INTERCEPTORS):
1. Request Interceptor: Tự động đọc JWT Token từ Secure Storage (SharedPreferences / EncryptedStorage) và gắn vào Header: `Authorization: Bearer <TOKEN>`.
2. Response Interceptor: 
   - Nếu nhận HTTP 401 hoặc 403: Tự động xóa Token đã lưu, đưa ứng dụng về Màn hình Đăng nhập (S01_LoginScreen) và hiển thị thông báo "Phiên đăng nhập hết hạn".
   - Nếu nhận HTTP 429: Báo lỗi "Bạn đã gửi quá nhiều request. Vui lòng thử lại sau 15 phút".

Hãy viết code sạch sẽ, mở rộng dễ dàng và có log request/response chi tiết trong môi trường Debug.
```

---

### 🟢 PROMPT B: Data Models & Response Parsers

```text
Hãy sinh các Data Class / Type Interface khớp 100% với JSON Schema trả về từ Backend PostgreSQL BookingCare:

1. UserData:
   - id: Int, email: String, firstName: String, lastName: String, address: String?, phoneNumber: String?, gender: String?, roleId: String, image: String? (Base64)

2. DoctorInfo:
   - doctorId: Int, specialtyId: Int, clinicId: Int, priceId: String, provinceId: String, paymentId: String, note: String?
   - specialtyData: SpecialtyData?, clinicData: ClinicData?, priceData: AllcodeData?, provinceData: AllcodeData?, paymentData: AllcodeData?

3. SpecialtyData & ClinicData:
   - id: Int, name: String, image: String? (Base64), descriptionHTML: String?, descriptionMarkdown: String?, address: String? (Clinic)

4. ScheduleData:
   - id: Int, doctorId: Int, date: String (Timestamp ms), timeType: String, maxNumber: Int, currentNumber: Int
   - timeTypeData: AllcodeData (keyMap, valueVi, valueEn)

5. BookingData:
   - id: Int, statusId: String, doctorId: Int, patientId: Int, date: String, timeType: String, patientName: String, patientPhoneNumber: String, patientEmail: String, patientAddress: String, patientReason: String, paymentStatus: String, receiptToken: String?, receiptExpiredAt: String?
   - doctorBookingData: UserData?, statusData: AllcodeData?, timeTypeBooking: AllcodeData?

6. BaseResponse<T>:
   - errCode: Int, message: String, data: T?
```

---

### 🟢 PROMPT C: Tích hợp Xác thực Auth (Login / Register / JWT Token Store)

```text
Hãy viết Service và ViewModel xử lý luồng Đăng nhập & Đăng ký kết nối Backend:

1. XỬ LÝ ĐĂNG NHẬP (S01_LoginScreen):
   - Endpoint: POST /api/v1/auth/login
   - Request Body: { "email": "patient@gmail.com", "password": "123" }
   - Response khi errCode == 0: { "errCode": 0, "message": "OK", "user": { ... }, "token": "eyJhbGciOi..." }
   - Sau khi thành công: Lưu `token` và `user` vào Redux/State Manager & Storage, chuyển sang S05_HomeScreen.
   - Nếu errCode != 0 (VD -1: Wrong password): Báo lỗi lên UI.

2. XỬ LÝ ĐĂNG KÝ BỆNH NHÂN (S02_RegisterScreen):
   - Endpoint: POST /api/v1/auth/register
   - Request Body: { "email": "...", "password": "...", "firstName": "...", "lastName": "...", "phoneNumber": "...", "gender": "M", "roleId": "R3" }
   - Xử lý thông báo thành công và tự động chuyển sang trang Đăng nhập.

3. XỬ LÝ QUÊN MẬT KHẨU (S03_ForgotPasswordScreen):
   - Endpoint: POST /api/v1/auth/forgot-password
   - Request Body: { "email": "..." }
```

---

### 🟢 PROMPT D: Tích hợp Màn hình Trang chủ, Chuyên khoa & Cơ sở Y tế

```text
Hãy viết Repository & ViewModel nạp dữ liệu cho S05_HomeScreen, S07_SpecialtyDetailScreen và S08_ClinicDetailScreen:

1. TRANG CHỦ (S05_HomeScreen):
   - Gọi đồng thời 3 API:
     + GET /api/v1/specialties?limit=10 (Danh sách Chuyên khoa)
     + GET /api/v1/clinics?limit=10 (Danh sách Cơ sở Y tế)
     + GET /api/v1/doctors/top?limit=10 (Danh sách Bác sĩ Nổi bật)
   - Render ảnh đại diện: Decode chuỗi Base64 từ trường `image` của từng item sang ImageView.

2. CHI TIẾT CHUYÊN KHOA (S07_SpecialtyDetailScreen):
   - GET /api/v1/specialties/:id -> Trả về thông tin chuyên khoa + danh sách bác sĩ thuộc khoa.
   - Render phần `descriptionHTML` bằng HTML WebView / Markwon Renderer.

3. CHI TIẾT CƠ SỞ Y TẾ (S08_ClinicDetailScreen):
   - GET /api/v1/clinics/:id -> Trả về thông tin phòng khám + danh sách bác sĩ.
   - Nút "Chỉ đường": Lấy trường `address` để tạo Intent mở Google Maps (`geo:0,0?q=address`).
```

---

### 🟢 PROMPT E: Tích hợp Chi tiết Bác sĩ & Selector Lịch khám theo Ngày

```text
Hãy viết ViewModel xử lý chọn Lịch khám tại màn hình S09_DoctorDetailScreen:

LUỒNG THAO TÁC:
1. Load Chi tiết Bác sĩ: GET /api/v1/doctors/:id -> Lấy tên, học hàm, avatar, thông tin phòng khám, giá khám.
2. Load Đánh giá Bác sĩ: GET /api/v1/doctors/:doctorId/reviews?page=1&limit=5
3. Select Ngày khám (Horizontal Date Bar):
   - Khi chọn một Ngày (Timestamp ms đại diện 00:00:00 của ngày đó):
     + Gọi API: GET /api/v1/doctors/:doctorId/schedules?date=<TIMESTAMP_MS>
     + Response trả về mảng `schedules`: các khung giờ `timeType` ('T1' đến 'T8').
     + Render các ô khung giờ (VD: T1 = 08:00 - 09:00).
     + Nếu `currentNumber >= maxNumber` -> Disable ô đó (kèm mờ).
4. Khi Bệnh nhân bấm chọn 1 Ô khung giờ còn trống -> Lưu `selectedDoctor`, `selectedDate`, `selectedSchedule` và chuyển sang S10_BookingFormScreen.
```

---

### 🟢 PROMPT F: Tích hợp Luồng Đặt lịch Khám & Thanh toán VNPay Sandbox

```text
Hãy viết Service xử lý Đặt lịch khám và Thanh toán VNPay Sandbox (S10 & S11):

1. GỬI ĐƠN ĐẶT LỊCH (S10_BookingFormScreen):
   - Endpoint: POST /api/v1/bookings
   - Request Body:
     {
       "doctorId": 5,
       "patientId": 12,
       "date": "1788220800000",
       "timeType": "T2",
       "patientName": "Nguyễn Văn A",
       "patientPhoneNumber": "0987654321",
       "patientEmail": "nguyenvana@gmail.com",
       "patientAddress": "123 Lý Thường Kiệt, Q10",
       "patientReason": "Đau đầu kéo dài 3 ngày",
       "patientGender": "M",
       "paymentMethod": "PAY_LATER" // Hoặc "VNPAY"
     }

2. THANH TOÁN VNPAY SANDBOX (S11_PaymentWebViewScreen):
   - Nếu `paymentMethod == "VNPAY"`:
     + Gọi API tạo URL: POST /api/v1/payment/create-payment-url-by-token
     + Trả về `vnpayUrl` -> Load URL này trong WebView.
     + Lắng nghe WebNavigation state: Khi URL chuyển sang có vnp_ResponseCode=00 -> Xác nhận thành công -> Mở Modal Mã QR Receipt Token -> Chuyển về S12_BookingHistoryScreen.
```

---

### 🟢 PROMPT G: Tích hợp Màn hình Quản lý Lịch hẹn & Render QR Code Check-in

```text
Hãy viết ViewModel cho S12_BookingHistoryScreen (Quản lý Lịch hẹn Bệnh nhân):

1. TẢI DANH SÁCH LỊCH HẸN:
   - Endpoint: GET /api/v1/patient/bookings (Cần Bearer Token)
   - Màn hình phân làm 3 Tabs dựa theo `statusId`:
     + Tab "Sắp khám": Lịch có `statusId` thuộc ['S1', 'S1.5', 'S2']
     + Tab "Đã khám": Lịch có `statusId` == 'S3'
     + Tab "Đã hủy": Lịch có `statusId` == 'S4'

2. RENDER MÃ QR CODE CHECK-IN:
   - Khi bấm nút "Mã QR Check-in" trên từng Card lịch hẹn:
     + Lấy chuỗi `receiptToken` trong booking record.
     + Sử dụng thư viện QR Code Generator mã hóa chuỗi `receiptToken` thành mã QR hiển thị trên Modal Popup cho bệnh nhân đưa cho Lễ tân quét.

3. HỦY LỊCH HẸN:
   - Gọi API: PUT /api/v1/patient/bookings/:id/cancel
   - Cập nhật ngay danh sách UI sang trạng thái 'S4' (Đã hủy).

4. ĐÁNH GIÁ BÁC SĨ (Cho lịch S3):
   - Gọi API: POST /api/v1/reviews { "bookingId": id, "doctorId": docId, "rating": 5, "comment": "..." }
```

---

### 🟢 PROMPT H: Tích hợp Trợ lý Y tế AI Chatbot Gemini (SSE Stream text)

```text
Hãy viết Service kết nối AI Chatbot Gemini cho S13_AIChatScreen:

1. GỬI TIN NHẮN CHAT STREAM (Server-Sent Events):
   - Endpoint: POST /api/v1/ai/chat
   - Header: Authorization: Bearer <TOKEN>, Content-Type: application/json
   - Request Body: { "message": "Tôi bị sốt 38.5 độ kèm ho đờm thì nên khám chuyên khoa nào?" }

2. XỬ LÝ RESPONSE SSE STREAM:
   - Lắng nghe luồng dữ liệu stream trả về liên tục (Chunk by chunk).
   - Cập nhật nội dung câu trả lời từng từ một lên UI AI Message Bubble thời gian thực (giống ChatGPT/Gemini UI).
   - Hỗ trợ render định dạng Markdown (In đậm, gạch đầu dòng danh sách).

3. XỬ LÝ FUNCTION CALLING (GỢI Ý BÁC SĨ):
   - Nếu AI payload chứa `recommendedDoctors`: Render ngay Card gợi ý Bác sĩ dạng rút gọn trong luồng chat.
   - Bấm vào Card Bác sĩ gợi ý -> Chuyển hướng thẳng sang S09_DoctorDetailScreen.
```

---

## 5. CHECKLIST KIỂM TRA TÍCH HỢP MẠNG & KHẮC PHỤC LỖI THƯỜNG GẶP

### 5.1. Checklist Kiểm tra Tích hợp Mạng

- [ ] Backend Express.js đã chạy và nghe cổng `3001` (`http://localhost:3001/api/health`).
- [ ] Database PostgreSQL 16 container `db-postgres` ở trạng thái **Healthy** (Cổng `5433`).
- [ ] Android Emulator gọi qua IP `http://10.0.2.2:3001/api/v1/health` trả về `{ "errCode": 0, "message": "BookingCare Backend is running!" }`.
- [ ] File `AndroidManifest.xml` đã thêm `android:usesCleartextTraffic="true"`.
- [ ] Chuỗi ảnh Base64 từ trường `image` được tự động gắn prefix `data:image/jpeg;base64,`.
- [ ] Token JWT được đính kèm vào Header `Authorization: Bearer <TOKEN>` cho các API cần xác thực.

### 5.2. Hướng dẫn Khắc phục Lỗi Thường gặp (Troubleshooting Guide)

| Lỗi gặp phải | Nguyên nhân chính | Cách khắc phục trên Android Studio |
|--------------|-------------------|-----------------------------------|
| `java.net.UnknownHostException: localhost` | Emulator không hiểu `localhost` của máy host | Đổi `localhost` thành `10.0.2.2` |
| `java.io.IOException: Cleartext HTTP traffic not permitted` | Android chặn HTTP không mã hóa | Thêm `android:usesCleartextTraffic="true"` trong `AndroidManifest.xml` |
| `HTTP 401 Unauthorized` | Thiếu hoặc sai định dạng JWT Token Header | Kiểm tra Header dạng `Bearer <token>` (phải có dấu cách giữa Bearer và token) |
| `Image render lỗi / Màn hình trắng` | Ảnh Base64 thiếu prefix hoặc là string rỗng | Kiểm tra null check & gắn prefix `data:image/jpeg;base64,` trước khi nạp |
| `Date timestamp ra năm 1970` | Parse sai mili-giây sang giây | Nhân Timestamp với `1000L` trước khi parse thành `Date` |

---

> **Tài liệu này hoàn tất bộ hướng dẫn Prompt tích hợp cho Mobile App với Backend PostgreSQL.**  
> **Phiên bản:** 1.0 | **Cập nhật lần cuối:** 01/09/2026  
> **Trạng thái:** 🟢 Đã hoàn thiện — Sẵn sàng đưa vào Android Studio AI Assistant
