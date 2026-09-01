# 🔌 TÀI LIỆU HƯỚNG DẪN PROMPT TÍCH HỢP MOBILE APP (ANDROID STUDIO) VỚI BACKEND BOOKINGCARE

> **Dự án:** BookingCare – Hệ thống đặt lịch khám bệnh trực tuyến  
> **Tài liệu:** Đồ án 2 (UIT) – Phase 0: Chuẩn bị  
> **Phiên bản:** 3.0 (Đầy đủ 100% Cấu trúc Chi tiết Bác sĩ, Chuyên khoa, Phòng khám & Lịch khám) | **Ngày:** 01/09/2026  
> **Tác giả:** Đặng Ngọc Trường Giang & Trần Đức Hải  
> **Mục tiêu:** Cung cấp đầy đủ Cấu trúc JSON Chi tiết (Full JSON Response Schema) cho Bác sĩ, Chuyên khoa, Phòng khám, Lịch khám, Đánh giá và Allcode để AI Assistant trong Android Studio (Kotlin Jetpack Compose / React Native) sinh code hiển thị chính xác 100%.  
> **Vị trí file:** `DOCS-DoAn2/Phase0-ChuanBi/08_TaiLieu_Prompt_TichHop_Mobile_Backend.md`

---

## MỤC LỤC

1. [Đánh giá Độ đầy đủ & Bổ sung Cấu trúc Dữ liệu Chi tiết](#1-đánh-giá-độ-đầy-đủ--bổ-sung-cấu-trúc-dữ-liệu-chi-tiết)
2. [Chi tiết Cấu trúc JSON Trả về cho từng Màn hình (Full Response Schemas)](#2-chi-tiết-cấu-trúc-json-trả-về-cho-từng-màn-hình-full-response-schemas)
   - [2.1. Chi tiết Bác sĩ (Doctor Detail Schema)](#21-chi-tiết-bác-sĩ-doctor-detail-schema)
   - [2.2. Chi tiết Chuyên khoa & Danh sách Bác sĩ thuộc khoa (Specialty Detail Schema)](#22-chi-tiết-chuyên-khoa--danh-sách-bác-sĩ-thuộc-khoa-specialty-detail-schema)
   - [2.3. Chi tiết Phòng khám & Danh sách Bác sĩ (Clinic Detail Schema)](#23-chi-tiết-phòng-khám--danh-sách-bác-sĩ-clinic-detail-schema)
   - [2.4. Bảng Lịch khám theo Ngày & Giờ (Schedule Schema)](#24-bảng-lịch-khám-theo-ngày--giờ-schedule-schema)
   - [2.5. Danh mục Tra cứu Allcode (Allcode Filter Schema)](#25-danh-mục-tra-cứu-allcode-allcode-filter-schema)
3. [Danh sách API Endpoints Toàn diện (Full Endpoints Matrix)](#3-danh-sách-api-endpoints-toàn-diện-full-endpoints-matrix)
4. [Bộ Master Integration Prompts Chuẩn hóa 100% cho AI Android Studio](#4-bộ-master-integration-prompts-chuẩn-hóa-100-cho-ai-android-studio)
   - [PROMPT A: Network Module & Interceptors (IP `192.168.1.11:3001`)](#prompt-a-network-module--interceptors-ip-1921681113001)
   - [PROMPT B: Complete Data Models & Parsers](#prompt-b-complete-data-models--parsers)
   - [PROMPT C: Auth Module (Login / Register Patient / Forgot Pass)](#prompt-c-auth-module-login--register-patient--forgot-pass)
   - [PROMPT D: Discovery Module (Home 3-in-1, Search Live, Specialty Detail, Clinic Detail)](#prompt-d-discovery-module-home-3-in-1-search-live-specialty-detail-clinic-detail)
   - [PROMPT E: Doctor Detail & Schedules Selector & Reviews](#prompt-e-doctor-detail--schedules-selector--reviews)
   - [PROMPT F: Booking Appointment & VNPay Sandbox Payment](#prompt-f-booking-appointment--vnpay-sandbox-payment)
   - [PROMPT G: Booking History (3 Tabs), QR Check-in & Review](#prompt-g-booking-history-3-tabs-qr-check-in--review)
   - [PROMPT H: AI Chatbot Gemini (SSE Stream & Doctor Cards)](#prompt-h-ai-chatbot-gemini-sse-stream--doctor-cards)
5. [Checklist Kiểm thử Kết nối & Troubleshooting](#5-checklist-kiểm-thử-kết-nối--troubleshooting)

---

## 1. ĐÁNH GIÁ ĐỘ ĐẦY ĐỦ & BỔ SUNG CẤU TRÚC DỮ LIỆU CHI TIẾT

Phiên bản 3.0 này đã **bổ sung trọn vẹn 100%** các cấu trúc JSON chi tiết (Nested JSON Object) cho Bác sĩ, Chuyên khoa, Bệnh viện, Lịch khám, Đánh giá và Allcode. Điều này đảm bảo AI trong Android Studio không bao giờ parse sai tên trường (field name) hay thiếu các trường thông tin hiển thị như:
- **Thông tin Bác sĩ:** Học hàm/Học vị (`positionData`), Giá khám (`priceData`), Chuyên khoa (`specialtyData`), Bệnh viện/Địa chỉ (`clinicData`), Phương thức thanh toán (`paymentData`), Tỉnh/Thành (`provinceData`), Bài viết giới thiệu (`contentHTML`/`contentMarkdown`).
- **Thông tin Chuyên khoa:** Bài viết mô tả (`descriptionHTML`), Danh sách bác sĩ thuộc khoa kèm bộ lọc Tỉnh/Thành (`location`).
- **Thông tin Phòng khám:** Bài viết giới thiệu, Địa chỉ, Danh sách bác sĩ làm việc tại phòng khám.
- **Lịch khám:** Danh sách khung giờ `timeType` ('T1' đến 'T8'), số lượng đã đặt `currentNumber`, tối đa `maxNumber`.

---

## 2. CHI TIẾT CẤU TRÚC JSON TRẢ VỀ CHO TỪNG MÀN HÌNH (FULL RESPONSE SCHEMAS)

### 2.1. Chi tiết Bác sĩ (Doctor Detail Schema)
- **Endpoint:** `GET /api/v1/doctors/:id`
- **JSON Response Structure:**
```json
{
  "errCode": 0,
  "data": {
    "id": 5,
    "email": "doctor_son@bookingcare.vn",
    "firstName": "Quốc",
    "lastName": "Giáo sư Sơn Đỗ",
    "phoneNumber": "0912345678",
    "address": "Hà Nội",
    "gender": "M",
    "image": "iVBORw0KGgoAAAANSUhEUgAA...",
    "positionData": {
      "keyMap": "P0",
      "valueVi": "Giáo sư",
      "valueEn": "Professor"
    },
    "doctorInfoData": {
      "doctorId": 5,
      "specialtyId": 1,
      "clinicId": 2,
      "priceId": "PRI2",
      "provinceId": "PRO1",
      "paymentId": "PAY3",
      "note": "Khám ngoài giờ từ 17h00",
      "description": "Bác sĩ có 15 năm kinh nghiệm trong lĩnh vực Tim mạch...",
      "contentHTML": "<p>Quá trình đào tạo: Tốt nghiệp Đại học Y Hà Nội...</p>",
      "contentMarkdown": "Quá trình đào tạo: Tốt nghiệp Đại học Y Hà Nội...",
      "priceData": {
        "valueVi": "300.000đ",
        "valueEn": "$15"
      },
      "paymentData": {
        "valueVi": "Tiền mặt, VNPay",
        "valueEn": "Cash, VNPay"
      },
      "provinceData": {
        "valueVi": "Hà Nội",
        "valueEn": "Ha Noi"
      },
      "specialtyData": {
        "name": "Chuyên khoa Tim mạch"
      },
      "clinicData": {
        "name": "Bệnh viện Bạch Mai",
        "address": "78 Giải Phóng, Phương Mai, Đống Đa, Hà Nội"
      }
    }
  }
}
```

---

### 2.2. Chi tiết Chuyên khoa & Danh sách Bác sĩ thuộc khoa (Specialty Detail Schema)
- **Endpoint:** `GET /api/v1/specialties/:id?location=ALL` (Hoặc `location=PRO1` cho Hà Nội, `PRO2` cho TP.HCM)
- **JSON Response Structure:**
```json
{
  "errCode": 0,
  "data": {
    "specialty": {
      "id": 1,
      "name": "Chuyên khoa Tim mạch",
      "image": "iVBORw0KGgoAAAANSUhEUgAA...",
      "descriptionHTML": "<p>Chuyên khoa Tim mạch chẩn đoán và điều trị các bệnh lý tim mạch...</p>",
      "descriptionMarkdown": "Chuyên khoa Tim mạch chẩn đoán..."
    },
    "doctorList": [
      {
        "id": 5,
        "firstName": "Quốc",
        "lastName": "Giáo sư Sơn Đỗ",
        "image": "iVBORw0KGgoAAAANSUhEUgAA...",
        "positionData": {
          "valueVi": "Giáo sư",
          "valueEn": "Professor"
        },
        "Doctor_Info": {
          "specialtyData": { "name": "Chuyên khoa Tim mạch" },
          "clinicData": {
            "name": "Bệnh viện Bạch Mai",
            "address": "78 Giải Phóng, Đống Đa, Hà Nội"
          },
          "description": "Bác sĩ có 15 năm kinh nghiệm...",
          "provinceId": "PRO1"
        }
      }
    ]
  }
}
```

---

### 2.3. Chi tiết Phòng khám & Danh sách Bác sĩ (Clinic Detail Schema)
- **Endpoint:** `GET /api/v1/clinics/:id`
- **JSON Response Structure:**
```json
{
  "errCode": 0,
  "data": {
    "clinic": {
      "id": 2,
      "name": "Bệnh viện Bạch Mai",
      "address": "78 Giải Phóng, Phương Mai, Đống Đa, Hà Nội",
      "image": "iVBORw0KGgoAAAANSUhEUgAA...",
      "descriptionHTML": "<p>Bệnh viện Bạch Mai là một trong những bệnh viện đa khoa lớn nhất Việt Nam...</p>",
      "descriptionMarkdown": "Bệnh viện Bạch Mai là một trong những..."
    },
    "doctorList": [
      {
        "id": 5,
        "firstName": "Quốc",
        "lastName": "Giáo sư Sơn Đỗ",
        "image": "iVBORw0KGgoAAAANSUhEUgAA...",
        "positionData": {
          "valueVi": "Giáo sư",
          "valueEn": "Professor"
        },
        "Doctor_Info": {
          "specialtyData": { "name": "Chuyên khoa Tim mạch" },
          "description": "Bác sĩ có 15 năm kinh nghiệm..."
        }
      }
    ]
  }
}
```

---

### 2.4. Bảng Lịch khám theo Ngày & Giờ (Schedule Schema)
- **Endpoint:** `GET /api/v1/doctors/:doctorId/schedules?date=1788220800000`
- **JSON Response Structure:**
```json
{
  "errCode": 0,
  "data": [
    {
      "id": 102,
      "doctorId": 5,
      "date": "1788220800000",
      "timeType": "T1",
      "maxNumber": 10,
      "currentNumber": 3,
      "timeTypeData": {
        "keyMap": "T1",
        "type": "TIME",
        "valueVi": "08:00 - 09:00",
        "valueEn": "8:00 AM - 9:00 AM"
      }
    },
    {
      "id": 103,
      "doctorId": 5,
      "date": "1788220800000",
      "timeType": "T2",
      "maxNumber": 10,
      "currentNumber": 10,
      "timeTypeData": {
        "keyMap": "T2",
        "type": "TIME",
        "valueVi": "09:00 - 10:00",
        "valueEn": "9:00 AM - 10:00 AM"
      }
    }
  ]
}
```
*(Ghi chú: Khi `currentNumber >= maxNumber` như ô `T2`, Mobile App phải hiển thị ô giờ xám Disabled).*

---

### 2.5. Danh mục Tra cứu Allcode (Allcode Filter Schema)
- **Endpoints:**
  - `GET /api/v1/allcode?type=PROVINCE` (Lấy danh sách Tỉnh/Thành cho Bộ lọc Chuyên khoa)
  - `GET /api/v1/allcode?type=PRICE` (Lấy danh sách Bảng giá)
  - `GET /api/v1/allcode?type=PAYMENT` (Lấy phương thức thanh toán)
- **JSON Response Structure:**
```json
{
  "errCode": 0,
  "data": [
    {
      "id": 1,
      "keyMap": "ALL",
      "type": "PROVINCE",
      "valueVi": "Toàn quốc",
      "valueEn": "Nationwide"
    },
    {
      "id": 2,
      "keyMap": "PRO1",
      "type": "PROVINCE",
      "valueVi": "Hà Nội",
      "valueEn": "Ha Noi"
    },
    {
      "id": 3,
      "keyMap": "PRO2",
      "type": "PROVINCE",
      "valueVi": "Hồ Chí Minh",
      "valueEn": "Ho Chi Minh"
    }
  ]
}
```

---

## 3. DANH SÁCH API ENDPOINTS TOÀN DIỆN (FULL ENDPOINTS MATRIX)

| # | Method | Endpoint | Yêu cầu JWT | Mô tả chức năng & Nơi sử dụng |
|---|--------|----------|-------------|-------------------------------|
| 1 | `POST` | `/api/v1/auth/login` | ❌ No | Đăng nhập lấy Bearer Token JWT (`S01`) |
| 2 | `POST` | `/api/v1/auth/register` | ❌ No | Đăng ký tài khoản bệnh nhân (`S02`) |
| 3 | `POST` | `/api/v1/auth/forgot-password` | ❌ No | Yêu cầu khôi phục mật khẩu qua Email (`S03`) |
| 4 | `GET` | `/api/v1/patient/profile` | 🔒 Yes (R3) | Lấy thông tin cá nhân bệnh nhân (`S04`) |
| 5 | `PUT` | `/api/v1/patient/profile` | 🔒 Yes (R3) | Cập nhật thông tin & Avatar Base64 (`S04`) |
| 6 | `PUT` | `/api/v1/patient/change-password` | 🔒 Yes (R3) | Đổi mật khẩu bệnh nhân (`S04`) |
| 7 | `GET` | `/api/v1/specialties` | ❌ No | Lấy danh sách tất cả Chuyên khoa (`S05`) |
| 8 | `GET` | `/api/v1/specialties/:id` | ❌ No | Lấy chi tiết Chuyên khoa & DS Bác sĩ (`S07`) |
| 9 | `GET` | `/api/v1/clinics` | ❌ No | Lấy danh sách tất cả Cơ sở y tế (`S05`) |
| 10 | `GET` | `/api/v1/clinics/:id` | ❌ No | Lấy chi tiết Phòng khám & DS Bác sĩ (`S08`) |
| 11 | `GET` | `/api/v1/doctors/top` | ❌ No | Lấy danh sách Bác sĩ nổi bật (`S05`) |
| 12 | `GET` | `/api/v1/doctors/:id` | ❌ No | Lấy chi tiết Bác sĩ, Giá khám, Địa chỉ (`S09`) |
| 13 | `GET` | `/api/v1/doctors/:doctorId/schedules` | ❌ No | Lấy danh sách khung giờ khám theo ngày (`S09`) |
| 14 | `GET` | `/api/v1/doctors/:doctorId/reviews` | ❌ No | Lấy danh sách đánh giá của Bác sĩ (`S09`) |
| 15 | `GET` | `/api/v1/allcode` | ❌ No | Tra cứu Allcode (`?type=PROVINCE/PRICE...`) |
| 16 | `GET` | `/api/v1/search` | ❌ No | Tìm kiếm Live `?keyword=...` (`S06`) |
| 17 | `POST` | `/api/v1/bookings` | 🔒 Yes (R3) | Đặt lịch khám mới (`S10`) |
| 18 | `POST` | `/api/v1/payment/create-payment-url-by-token` | ❌ No | Tạo URL thanh toán VNPay Sandbox (`S11`) |
| 19 | `GET` | `/api/v1/patient/bookings` | 🔒 Yes (R3) | Lấy danh sách lịch hẹn 3 Tabs (`S12`) |
| 20 | `PUT` | `/api/v1/patient/bookings/:id/cancel` | 🔒 Yes (R3) | Hủy lịch hẹn (`S12`) |
| 21 | `POST` | `/api/v1/reviews` | 🔒 Yes (R3) | Gửi đánh giá Bác sĩ (`S12`) |
| 22 | `POST` | `/api/v1/ai/chat` | 🔒 Yes (R3) | Chat y tế AI Gemini SSE Stream (`S13`) |

---

## 4. BỘ MASTER INTEGRATION PROMPTS CHUẨN HÓA 100% CHO AI ANDROID STUDIO

---

### 🟢 PROMPT A: Network Module & Interceptors (IP `192.168.1.11:3001`)

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

### 🟢 PROMPT B: Complete Data Models & Parsers

```text
Hãy sinh toàn bộ Data Class / Model chuẩn 100% với Backend PostgreSQL BookingCare:

1. UserData:
   - id: Int, email: String, firstName: String, lastName: String, address: String?, phoneNumber: String?, gender: String?, roleId: String, image: String?

2. DoctorInfoData:
   - doctorId: Int, specialtyId: Int, clinicId: Int, priceId: String, provinceId: String, paymentId: String, note: String?, description: String?, contentHTML: String?, contentMarkdown: String?
   - specialtyData: SpecialtyData?, clinicData: ClinicData?, priceData: AllcodeData?, provinceData: AllcodeData?, paymentData: AllcodeData?

3. SpecialtyData & ClinicData:
   - id: Int, name: String, image: String?, descriptionHTML: String?, descriptionMarkdown: String?, address: String? (chỉ Clinic)

4. SpecialtyDetailResponse:
   - specialty: SpecialtyData, doctorList: List<DoctorInSpecialtyOrClinic>

5. ClinicDetailResponse:
   - clinic: ClinicData, doctorList: List<DoctorInSpecialtyOrClinic>

6. ScheduleData:
   - id: Int, doctorId: Int, date: String, timeType: String, maxNumber: Int, currentNumber: Int
   - timeTypeData: AllcodeData (keyMap: String, valueVi: String, valueEn: String)

7. BookingData:
   - id: Int, statusId: String, doctorId: Int, patientId: Int, date: String, timeType: String, patientName: String, patientPhoneNumber: String, patientEmail: String, patientAddress: String, patientReason: String, paymentStatus: String, receiptToken: String?, receiptExpiredAt: String?, isReviewed: Boolean = false
   - doctorBookingData: UserData?, statusData: AllcodeData?, timeTypeBooking: AllcodeData?

8. BaseResponse<T>:
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

### 🟢 PROMPT D: Discovery Module (Home 3-in-1, Search Live, Specialty Detail, Clinic Detail)

```text
Hãy sinh Repository và ViewModel cho Trang chủ & Chi tiết Chuyên khoa / Bệnh viện (S05, S06, S07, S08):

1. TRANG CHỦ (S05_HomeScreen):
   - Gọi đồng thời 3 API:
     + GET /api/v1/specialties?limit=10
     + GET /api/v1/clinics?limit=10
     + GET /api/v1/doctors/top?limit=10
   - Xử lý Image Base64: Tự động đính kèm prefix "data:image/jpeg;base64," trước khi render lên ImageView.

2. TÌM KIẾM TỰ ĐỘNG (S06_SearchFilterScreen):
   - API: GET /api/v1/search?keyword={text} (Sử dụng Debounce 400ms khi người dùng gõ từ khóa).
   - Parse kết quả object `data`: `{ doctors: [], specialties: [], clinics: [] }`.

3. CHI TIẾT CHUYÊN KHOA (S07_SpecialtyDetailScreen):
   - API: GET /api/v1/specialties/:id?location={locationCode}
   - Gọi thêm API Allcode lấy danh sách tỉnh thành bộ lọc: GET /api/v1/allcode?type=PROVINCE
   - Parse `data`: `{ specialty: { name, descriptionHTML, image }, doctorList: [ ... ] }`.
   - Render phần `descriptionHTML` bằng HTML WebView Component.

4. CHI TIẾT CƠ SỞ Y TẾ (S08_ClinicDetailScreen):
   - API: GET /api/v1/clinics/:id
   - Parse `data`: `{ clinic: { name, address, descriptionHTML, image }, doctorList: [ ... ] }`.
   - Nút "Chỉ đường": Mở Intent Google Maps trỏ đến `address`.
```

---

### 🟢 PROMPT E: Doctor Detail & Schedules Selector & Reviews

```text
Hãy sinh ViewModel xử lý Màn hình Chi tiết Bác sĩ & Chọn Lịch khám (S09_DoctorDetailScreen):

1. LOAD CHI TIẾT BÁC SĨ & REVIEW:
   - GET /api/v1/doctors/:id -> Trả về object doctor chứa `positionData`, `doctorInfoData` (bao gồm `priceData`, `clinicData`, `paymentData`, `contentHTML`).
   - GET /api/v1/doctors/:doctorId/reviews?page=1&limit=5 -> Danh sách đánh giá bệnh nhân.

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

## 5. CHECKLIST KIỂM THỬ KẾT NỐI & TROUBLESHOOTING

- [x] Backend đang chạy ở cổng `3001` (`http://localhost:3001/api/health`).
- [x] PostgreSQL 16 container `db-postgres` đang chạy cổng `5433` (Healthy).
- [x] Điện thoại thật và Máy tính bắt chung một tên Wi-Fi (`192.168.1.11`).
- [x] Đã mở cổng `3001` trên Windows Firewall.
- [x] Đã bổ sung 100% Cấu trúc JSON Chi tiết (Doctor, Specialty, Clinic, Schedule, Review, Allcode).
