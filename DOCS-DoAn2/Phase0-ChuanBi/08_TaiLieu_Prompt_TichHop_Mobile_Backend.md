# 🔌 TÀI LIỆU HƯỚNG DẪN PROMPT TÍCH HỢP MOBILE APP (ANDROID STUDIO) VỚI BACKEND BOOKINGCARE

> **Dự án:** BookingCare – Hệ thống đặt lịch khám bệnh trực tuyến  
> **Tài liệu:** Đồ án 2 (UIT) – Phase 0: Chuẩn bị  
> **Phiên bản:** 2.0 (Audit & Verified 100% với Codebase Backend) | **Ngày:** 01/09/2026  
> **Tác giả:** Đặng Ngọc Trường Giang & Trần Đức Hải  
> **Mục tiêu:** Kiểm tra và chuẩn hóa 100% các Prompt cho AI Assistant trong Android Studio (Kotlin Jetpack Compose / React Native) để khớp hoàn toàn với Backend Node.js Express + PostgreSQL.  
> **Vị trí file:** `DOCS-DoAn2/Phase0-ChuanBi/08_TaiLieu_Prompt_TichHop_Mobile_Backend.md`

---

## MỤC LỤC

1. [Kết quả Audit & Xác minh Tính Khớp nối với Codebase Backend](#1-kết-quả-audit--xác-minh-tính-khớp-nối-với-codebase-backend)
2. [Cấu hình Hạ tầng Mạng & IP Kết nối](#2-cấu-hình-hạ-tầng-mạng--ip-kết-nối)
3. [Quy chuẩn RESTful API Endpoints & Request/Response Contracts](#3-quy-chuẩn-restful-api-endpoints--requestresponse-contracts)
4. [Quy tắc Data Converters & Parsers (BYTEA Image, Timestamp, Allcodes)](#4-quy-tắc-data-converters--parsers-bytea-image-timestamp-allcodes)
5. [Bộ Master Integration Prompts Chuẩn hóa 100% cho AI Android Studio](#5-bộ-master-integration-prompts-chuẩn-hóa-100-cho-ai-android-studio)
   - [PROMPT A: Network Module & Interceptors](#prompt-a-network-module--interceptors)
   - [PROMPT B: Data Models & Response Parsers](#prompt-b-data-models--response-parsers)
   - [PROMPT C: Auth Module (Login / Register Patient / Forgot Pass)](#prompt-c-auth-module-login--register-patient--forgot-pass)
   - [PROMPT D: Discovery Module (Home 3-in-1, Search Live, Specialty, Clinic)](#prompt-d-discovery-module-home-3-in-1-search-live-specialty-clinic)
   - [PROMPT E: Doctor Detail & Schedules Selector](#prompt-e-doctor-detail--schedules-selector)
   - [PROMPT F: Booking Appointment & VNPay Sandbox Payment](#prompt-f-booking-appointment--vnpay-sandbox-payment)
   - [PROMPT G: Booking History (3 Tabs), QR Check-in & Review](#prompt-g-booking-history-3-tabs-qr-check-in--review)
   - [PROMPT H: AI Chatbot Gemini (SSE Stream & Doctor Cards)](#prompt-h-ai-chatbot-gemini-sse-stream--doctor-cards)
6. [Checklist Kiểm thử Kết nối & Troubleshooting](#6-checklist-kiểm-thử-kết-nối--troubleshooting)

---

## 1. KẾT QUẢ AUDIT & XÁC MINH TÍNH KHỚP NỐI VỚI CODEBASE BACKEND

Sau khi rà soát toàn bộ source code Backend (`src/routes/web.js`, `src/controllers/`, `src/services/`, `src/models/`), tài liệu này đã được **chuẩn hóa 100%** khớp với logic thực tế:

| Thành phần | Trạng thái Audit | Ghi chú điều chỉnh chính xác |
|------------|------------------|------------------------------|
| **Base Router** | ✅ 100% Khớp | Tất cả API đều ở tiền tố `/api/v1/` |
| **Auth Payload** | ✅ 100% Khớp | Login gửi `{ email, password }`, Register gửi `{ email, password, firstName, lastName, phoneNumber, gender, roleId: "R3" }` |
| **User Profile** | ✅ 100% Khớp | `GET /api/v1/patient/profile` và `PUT /api/v1/patient/profile` (IDOR Protected via JWT `req.user.id`) |
| **Booking Payload** | ✅ 100% Khớp | `POST /api/v1/bookings` bắt buộc: `email`, `fullName`, `doctorId`, `date`, `timeType`, `phoneNumber` |
| **VNPay Token API** | ✅ 100% Khớp | `POST /api/v1/payment/create-payment-url-by-token` nhận Body param `{ "token": "<paymentToken>" }` |
| **Patient Bookings** | ✅ 100% Khớp | `GET /api/v1/patient/bookings?page=1&limit=10&status=S1,S1.5,S2` trả thêm cờ `isReviewed` boolean |
| **Search API** | ✅ 100% Khớp | `GET /api/v1/search?keyword=...` trả về object `{ doctors, specialties, clinics }` |
| **PostgreSQL Image**| ✅ 100% Khớp | Decode từ `BYTEA` sang Pure Base64 string -> Client nối prefix `data:image/jpeg;base64,` |

---

## 2. CẤU HÌNH HẠ TẦNG MẠNG & IP KẾT NỐI

```
┌────────────────────────────────────────────────────────────────────────┐
│                      CẤU HÌNH BASE URL KẾT NỐI                         │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  1. Điện thoại thật (Physical Device) - Kết nối cùng mạng Wi-Fi:      │
│     Base URL: http://192.168.1.11:3001/api/v1                         │
│                                                                        │
│  2. Máy ảo Android (Android Emulator):                                 │
│     Base URL: http://10.0.2.2:3001/api/v1                            │
│                                                                        │
│  3. Server Production (VPS Docker):                                    │
│     Base URL: https://api.bookingcare.domain.vn/api/v1                 │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### Cấu hình `AndroidManifest.xml` (Bắt buộc cho HTTP Cleartext):
```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.CAMERA" />

    <application
        android:usesCleartextTraffic="true"
        ... >
    </application>
</manifest>
```

---

## 3. QUY CHUẨN RESTFUL API ENDPOINTS & REQUEST/RESPONSE CONTRACTS

Tất cả Endpoint đều trả về Response JSON có định dạng:
```json
{
  "errCode": 0,
  "message": "OK",
  "data": { ... }
}
```

### Danh sách Endpoint Chi tiết cho Mobile App:

| # | Method | Endpoint | Yêu cầu JWT | Request Body / Query Params | Response `data` |
|---|--------|----------|-------------|-----------------------------|-----------------|
| 1 | `POST` | `/api/v1/auth/login` | ❌ No | `{ email, password }` | `{ user, token }` |
| 2 | `POST` | `/api/v1/auth/register` | ❌ No | `{ email, password, firstName, lastName, phoneNumber, gender, roleId: "R3" }` | `{ message }` |
| 3 | `POST` | `/api/v1/auth/forgot-password` | ❌ No | `{ email }` | `{ message }` |
| 4 | `GET` | `/api/v1/patient/profile` | 🔒 Yes (R3) | Header Authorization | `{ id, email, firstName, lastName, phoneNumber, address, gender, image }` |
| 5 | `PUT` | `/api/v1/patient/profile` | 🔒 Yes (R3) | `{ firstName, lastName, address, phoneNumber, gender, image }` | `{ updatedUser }` |
| 6 | `PUT` | `/api/v1/patient/change-password` | 🔒 Yes (R3) | `{ oldPassword, newPassword }` | `{ message }` |
| 7 | `GET` | `/api/v1/specialties` | ❌ No | Không | `[ { id, name, image, descriptionHTML } ]` |
| 8 | `GET` | `/api/v1/specialties/:id` | ❌ No | `?location=ALL` | `{ specialty, doctorSpecialty }` |
| 9 | `GET` | `/api/v1/clinics` | ❌ No | Không | `[ { id, name, address, image } ]` |
| 10 | `GET` | `/api/v1/clinics/:id` | ❌ No | Không | `{ clinic, doctorClinic }` |
| 11 | `GET` | `/api/v1/doctors/top` | ❌ No | `?limit=10` | `[ { id, firstName, lastName, image, positionData, doctorInfoData } ]` |
| 12 | `GET` | `/api/v1/doctors/:id` | ❌ No | Không | `{ id, firstName, lastName, image, positionData, doctorInfoData }` |
| 13 | `GET` | `/api/v1/doctors/:doctorId/schedules` | ❌ No | `?date=1788220800000` | `[ { id, doctorId, date, timeType, currentNumber, maxNumber, timeTypeData } ]` |
| 14 | `GET` | `/api/v1/doctors/:doctorId/reviews` | ❌ No | `?page=1&limit=5` | `[ { id, rating, comment, createdAt } ]` |
| 15 | `GET` | `/api/v1/search` | ❌ No | `?keyword=tim+mach` | `{ doctors: [], specialties: [], clinics: [] }` |
| 16 | `POST` | `/api/v1/bookings` | 🔒 Yes (R3) | `{ doctorId, date, timeType, email, fullName, phoneNumber, address, gender, reason }` | `{ errCode: 0, message }` |
| 17 | `POST` | `/api/v1/payment/create-payment-url-by-token` | ❌ No | `{ "token": "<paymentToken>" }` | `{ errCode: 0, paymentUrl }` |
| 18 | `GET` | `/api/v1/patient/bookings` | 🔒 Yes (R3) | `?page=1&limit=10&status=S1,S1.5,S2` | `[ { id, statusId, date, timeType, receiptToken, isReviewed, doctorBookingData } ]` |
| 19 | `PUT` | `/api/v1/patient/bookings/:id/cancel` | 🔒 Yes (R3) | URL Param `:id` | `{ errCode: 0, message }` |
| 20 | `POST` | `/api/v1/reviews` | 🔒 Yes (R3) | `{ bookingId, rating, comment }` | `{ errCode: 0, message }` |
| 21 | `POST` | `/api/v1/ai/chat` | 🔒 Yes (R3) | `{ "message": "Tôi bị sốt nhẹ..." }` | Event-Stream text (SSE) |

---

## 4. QUY TẮC DATA CONVERTERS & PARSERS (BYTEA IMAGE, TIMESTAMP, ALLCODES)

### 4.1. Decode Ảnh PostgreSQL `BYTEA` → Base64 Image Component
```javascript
// React Native Renderer Utility
export const formatBase64Image = (base64Str) => {
  if (!base64Str) return require('../assets/images/default_avatar.png');
  if (base64Str.startsWith('data:image')) return { uri: base64Str };
  return { uri: `data:image/jpeg;base64,${base64Str}` };
};
```

### 4.2. Timestamp Ngày khám
Trường `date` trả về chuỗi Mili-giây (VD: `"1788220800000"`). Parse như sau:
```javascript
const formattedDate = moment(parseInt(item.date, 10)).locale('vi').format('dddd - DD/MM/YYYY');
// Trả về: "Thứ Tư - 02/09/2026"
```

---

## 5. BỘ MASTER INTEGRATION PROMPTS CHUẨN HÓA 100% CHO AI ANDROID STUDIO

---

### 🟢 PROMPT A: Network Module & Interceptors

```text
Hãy tạo cho tôi file NetworkModule kết nối tới Backend BookingCare Node.js Express + PostgreSQL:

CẤU HÌNH BASE URL:
- Khi chạy trên Điện thoại thật (Cùng Wi-Fi): http://192.168.1.11:3001/api/v1
- Khi chạy trên Android Emulator: http://10.0.2.2:3001/api/v1
- Timeout: Connect 10s, Read 30s. Header mặc định: Content-Type: application/json.

CHỨC NĂNG CẦN CÓ (INTERCEPTORS):
1. Request Interceptor: Đọc JWT Token từ Secure Storage (EncryptedSharedPreferences) và gắn vào Header: `Authorization: Bearer <TOKEN>`.
2. Response Interceptor: 
   - HTTP 401/403: Xóa Token đã lưu, đẩy về Màn hình Login (S01_LoginScreen) kèm Toast "Phiên đăng nhập đã hết hạn".
   - HTTP 429: Thông báo "Bạn đã thao tác quá nhanh, vui lòng thử lại sau 15 phút".
3. Log Interceptor: In toàn bộ URL, Header, Request Body và Response JSON trong môi trường Debug.
```

---

### 🟢 PROMPT B: Data Models & Response Parsers

```text
Hãy sinh toàn bộ Data Class / Model chuẩn 100% với Backend PostgreSQL:

1. UserData:
   - id: Int, email: String, firstName: String, lastName: String, address: String?, phoneNumber: String?, gender: String?, roleId: String, image: String?

2. DoctorInfoData:
   - doctorId: Int, specialtyId: Int, clinicId: Int, priceId: String, provinceId: String, paymentId: String, note: String?
   - specialtyData: SpecialtyData?, clinicData: ClinicData?, priceData: AllcodeData?, provinceData: AllcodeData?, paymentData: AllcodeData?

3. SpecialtyData & ClinicData:
   - id: Int, name: String, image: String?, descriptionHTML: String?, descriptionMarkdown: String?, address: String? (chỉ Clinic)

4. ScheduleData:
   - id: Int, doctorId: Int, date: String, timeType: String, maxNumber: Int, currentNumber: Int
   - timeTypeData: AllcodeData (keyMap: String, valueVi: String, valueEn: String)

5. BookingData:
   - id: Int, statusId: String, doctorId: Int, patientId: Int, date: String, timeType: String, patientName: String, patientPhoneNumber: String, patientEmail: String, patientAddress: String, patientReason: String, paymentStatus: String, receiptToken: String?, receiptExpiredAt: String?, isReviewed: Boolean = false
   - doctorBookingData: UserData?, statusData: AllcodeData?, timeTypeBooking: AllcodeData?

6. BaseResponse<T>:
   - errCode: Int, message: String, data: T?, pagination: PaginationData?
```

---

### 🟢 PROMPT C: Auth Module (Login / Register Patient / Forgot Pass)

```text
Hãy sinh Service và ViewModel cho Luồng Xác thực Bệnh nhân (Auth Flow):

1. ĐĂNG NHẬP (S01_LoginScreen):
   - API: POST /api/v1/auth/login
   - Request Body: { "email": "...", "password": "..." }
   - Xử lý Response: Khi `errCode == 0`, lưu `token` và object `user` vào Storage & Redux/State, chuyển đến HomeScreen. Lỗi `errCode != 0` hiển thị thông báo dưới Form.

2. ĐĂNG KÝ BỆNH NHÂN (S02_RegisterScreen):
   - API: POST /api/v1/auth/register
   - Request Body: { "email": "...", "password": "...", "firstName": "...", "lastName": "...", "phoneNumber": "...", "gender": "M", "roleId": "R3" }
   - Khi đăng ký thành công -> Thông báo và chuyển sang trang Đăng nhập.

3. QUÊN MẬT KHẨU (S03_ForgotPasswordScreen):
   - API: POST /api/v1/auth/forgot-password
   - Request Body: { "email": "..." }
```

---

### 🟢 PROMPT D: Discovery Module (Home 3-in-1, Search Live, Specialty, Clinic)

```text
Hãy sinh Repository và ViewModel cho Trang chủ & Tìm kiếm (S05, S06, S07, S08):

1. TRANG CHỦ (S05_HomeScreen):
   - Gọi đồng thời 3 API:
     + GET /api/v1/specialties?limit=10
     + GET /api/v1/clinics?limit=10
     + GET /api/v1/doctors/top?limit=10
   - Xử lý Image Base64: Tự động đính kèm prefix "data:image/jpeg;base64," trước khi render lên ImageView.

2. TÌM KIẾM TỰ ĐỘNG (S06_SearchFilterScreen):
   - API: GET /api/v1/search?keyword={text} (Sử dụng Debounce 400ms khi người dùng gõ từ khóa).
   - Parse kết quả object `data`: `{ doctors: [], specialties: [], clinics: [] }`.

3. CHI TIẾT CHUYÊN KHOA & CƠ SỞ Y TẾ (S07 & S08):
   - GET /api/v1/specialties/:id?location=ALL
   - GET /api/v1/clinics/:id
   - Render phần `descriptionHTML` bằng HTML WebView / Markwon Component.
```

---

### 🟢 PROMPT E: Doctor Detail & Schedules Selector

```text
Hãy sinh ViewModel xử lý Màn hình Chi tiết Bác sĩ & Chọn Lịch khám (S09_DoctorDetailScreen):

1. LOAD CHI TIẾT BÁC SĨ & REVIEW:
   - GET /api/v1/doctors/:id
   - GET /api/v1/doctors/:doctorId/reviews?page=1&limit=5

2. CHỌN NGÀY & LOAD KHUNG GIỜ KHÁM:
   - Khi bệnh nhân chọn Ngày trên thanh Date Bar (Timestamp ms ở 00:00:00 của ngày chọn):
     + Gọi API: GET /api/v1/doctors/:doctorId/schedules?date=<TIMESTAMP_MS>
     + Nhận danh sách các ô giờ `timeType` ('T1' đến 'T8').
     + Render các ô giờ: Ô nào có `currentNumber >= maxNumber` -> Set trạng thái Disabled & mờ.
   - Khi bấm vào ô giờ còn trống -> Chuyển sang S10_BookingFormScreen kèm dữ liệu đã chọn.
```

---

### 🟢 PROMPT F: Booking Appointment & VNPay Sandbox Payment

```text
Hãy sinh Service xử lý Đặt lịch khám và Thanh toán VNPay (S10 & S11):

1. FORM ĐẶT LỊCH KHÁM (S10_BookingFormScreen):
   - API: POST /api/v1/bookings (Yêu cầu Header Authorization Bearer Token)
   - Request Body:
     {
       "doctorId": 5,
       "date": "1788220800000",
       "timeType": "T2",
       "email": "nguyenvana@gmail.com",
       "fullName": "Nguyễn Văn A",
       "phoneNumber": "0987654321",
       "address": "123 Lý Thường Kiệt, Q10",
       "reason": "Đau đầu kéo dài",
       "gender": "M"
     }
   - Trả về response: `{ errCode: 0, message: "Đặt lịch thành công! Vui lòng kiểm tra email." }`.

2. THANH TOÁN VNPAY SANDBOX (S11_PaymentWebViewScreen):
   - Nếu bệnh nhân bấm nút Thanh toán VNPay:
     + Gọi API: POST /api/v1/payment/create-payment-url-by-token với Body: `{ "token": "<paymentToken>" }`
     + Nhận Response `{ errCode: 0, paymentUrl: "https://sandbox.vnpayment.vn/..." }`.
     + Load `paymentUrl` trong WebView -> Khi URL chuyển về vnp_ResponseCode=00 -> Báo thành công & mở Modal QR Check-in.
```

---

### 🟢 PROMPT G: Booking History (3 Tabs), QR Check-in & Review

```text
Hãy sinh ViewModel cho Màn hình Quản lý Lịch hẹn Bệnh nhân (S12_BookingHistoryScreen):

1. TẢI DANH SÁCH LỊCH HẸN:
   - API: GET /api/v1/patient/bookings?page=1&limit=10&status=S1,S1.5,S2 (Tab Sắp khám)
   - GET /api/v1/patient/bookings?page=1&limit=10&status=S3 (Tab Đã khám)
   - GET /api/v1/patient/bookings?page=1&limit=10&status=S4 (Tab Đã hủy)

2. RENDER MÃ QR CODE CHECK-IN:
   - Khi bấm nút [Mã QR Check-in]: Mã hóa chuỗi `receiptToken` thành mã QR SVG/Bitmap hiển thị trên Modal Popup.

3. HỦY LỊCH HẸN:
   - API: PUT /api/v1/patient/bookings/:id/cancel (Truyền ID lên URL path)

4. ĐÁNH GIÁ BÁC SĨ (Cho lịch S3 chưa review - cờ `isReviewed == false`):
   - API: POST /api/v1/reviews với Body: `{ "bookingId": 42, "rating": 5, "comment": "Bác sĩ tận tâm" }`
```

---

### 🟢 PROMPT H: AI Chatbot Gemini (SSE Stream & Doctor Cards)

```text
Hãy sinh Service kết nối Trợ lý Y tế AI Chatbot Gemini cho S13_AIChatScreen:

1. GỬI TIN NHẮN CHAT STREAM (SSE):
   - API: POST /api/v1/ai/chat (Yêu cầu Bearer Token)
   - Request Body: { "message": "Tôi bị triệu chứng ho sốt nhẹ thì nên làm gì?" }
   - Lắng nghe luồng dữ liệu `EventSource` / `text/event-stream` để append từng từ một vào AI Message Bubble.

2. GỢI Ý BÁC SĨ (Function Calling):
   - Nếu Stream payload chứa object `recommendedDoctors` -> Render Card Bác sĩ ngắn gọn ngay trong luồng chat kèm nút "Đặt lịch ngay".
```

---

## 6. CHECKLIST KIỂM THỬ KẾT NỐI & TROUBLESHOOTING

- [x] Backend đang chạy ở cổng `3001` (`http://localhost:3001/api/health`).
- [x] PostgreSQL 16 container `db-postgres` đang chạy cổng `5433` (Healthy).
- [x] Điện thoại thật và Máy tính bắt chung một tên Wi-Fi.
- [x] Đã chạy lệnh mở cổng `3001` trên Windows Firewall:
  ```powershell
  New-NetFirewallRule -DisplayName "BookingCare 3001" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow
  ```
- [x] Tất cả Prompt đã được kiểm tra trùng khớp 100% với tên Endpoint và JSON Key trong Backend Express.js.
