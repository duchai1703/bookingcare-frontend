# BÁO CÁO ĐỒ ÁN 1 – BOOKINGCARE
# CHƯƠNG 3 – PHÂN TÍCH VÀ THIẾT KẾ (Phần 3: Thiết kế hệ thống & Dữ liệu)

---

## D3.7. THIẾT KẾ HỆ THỐNG

### D3.7.1. KIẾN TRÚC HỆ THỐNG

BookingCare sử dụng **kiến trúc Client-Server** với mô hình **3-Layer Architecture**:

**Layer 1 – Presentation Layer (Frontend):**
React.js (Vite) → Giao diện SPA, giao tiếp với Backend qua Axios HTTP Client

**Layer 2 – Business Logic Layer (Backend):**
Express.js → RESTful API `/api/v1/` → Controllers → Services → Models

**Layer 3 – Data Layer:**
MySQL → Sequelize ORM → 9 bảng dữ liệu quan hệ

**Mô tả sơ đồ kiến trúc (để vẽ):**

```
┌─────────────────────────────────────────────────┐
│               CLIENT (Browser)                   │
│  React 18 + Redux + React Router + Vite          │
│  Port: 3000                                      │
└──────────────────┬──────────────────────────────┘
                   │ HTTP/HTTPS (Axios)
                   ▼
┌─────────────────────────────────────────────────┐
│              SERVER (Express.js)                 │
│  Port: 8080                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │Middleware │→│Controller│→│    Service        │ │
│  │(CORS,JWT, │ │(Route    │ │(Business Logic)  │ │
│  │RateLimit) │ │ Handler) │ │                  │ │
│  └──────────┘ └──────────┘ └────────┬─────────┘ │
└──────────────────────────────────────┼──────────┘
                                       │ Sequelize ORM
                                       ▼
┌─────────────────────────────────────────────────┐
│              DATABASE (MySQL)                    │
│  9 Tables: Users, Bookings, Schedules,           │
│  Doctor_Infos, Specialties, Clinics,             │
│  Allcodes, Reviews, Tokens                       │
└─────────────────────────────────────────────────┘

External Services:
├── VNPay Sandbox (Payment Gateway)
├── Gmail SMTP (Nodemailer – Email Service)
```

### D3.7.2. BẢNG MÔ TẢ THÀNH PHẦN

| STT | Thành phần | Mô tả |
|-----|-----------|-------|
| 1 | Frontend (React + Vite) | Giao diện SPA, quản lý state bằng Redux Toolkit, routing bằng React Router |
| 2 | Backend (Express.js) | REST API server, xử lý business logic, authentication, authorization |
| 3 | Auth Middleware | Xác thực JWT, kiểm tra tokenVersion, phân quyền RBAC (R1/R2/R3) |
| 4 | User Module | CRUD người dùng, đăng ký, đăng nhập, quên/đặt lại mật khẩu |
| 5 | Doctor Module | Quản lý thông tin bác sĩ, xem bệnh nhân, gửi kết quả khám |
| 6 | Patient Module | Đặt lịch, xác nhận email, quản lý hồ sơ, lịch sử, hủy lịch |
| 7 | Payment Module | Tích hợp VNPay (create URL, IPN handler, querydr, cleanup cron) |
| 8 | Review Module | Đánh giá bác sĩ (submit, get reviews) |
| 9 | Specialty Module | CRUD chuyên khoa |
| 10 | Clinic Module | CRUD phòng khám |
| 11 | Statistic Module | 5 API thống kê cho Admin Dashboard |
| 12 | Email Service | Gửi email xác nhận, kết quả khám, reset mật khẩu (Nodemailer) |
| 13 | Database (MySQL) | Lưu trữ dữ liệu quan hệ, hỗ trợ transactions, indexing |

### D3.7.3. SƠ ĐỒ LỚP (Class Diagram)

> [!IMPORTANT]
> [CẦN VẼ THỦ CÔNG] — Dưới đây là danh sách Class/Model

| STT | Tên lớp | Mô tả |
|-----|---------|-------|
| 1 | User | Người dùng hệ thống (Admin/Doctor/Patient) |
| 2 | Doctor_Info | Thông tin chi tiết bác sĩ (chuyên khoa, phòng khám, giá, mô tả) |
| 3 | Schedule | Lịch khám của bác sĩ (ngày, khung giờ, số lượng tối đa) |
| 4 | Booking | Lịch hẹn khám bệnh (trạng thái, thanh toán, thông tin BN) |
| 5 | Specialty | Chuyên khoa y tế |
| 6 | Clinic | Phòng khám / Bệnh viện |
| 7 | Allcode | Bảng tra cứu mã chung (ROLE, GENDER, TIME, STATUS, PRICE, ...) |
| 8 | Review | Đánh giá bác sĩ (rating 1-5, comment) |
| 9 | Token | Token dùng 1 lần (reset password, verify email) |

---

## D3.8. THIẾT KẾ DỮ LIỆU

### D3.8.1. SƠ ĐỒ CƠ SỞ DỮ LIỆU

> [!IMPORTANT]
> [CẦN VẼ THỦ CÔNG] — Dưới đây là mô tả quan hệ giữa các bảng

**Quan hệ:**
- User (1) ↔ (1) Doctor_Info (qua doctorId)
- User (1) ↔ (N) Schedule (qua doctorId)
- User (1) ↔ (N) Booking (qua doctorId — phía bác sĩ)
- User (1) ↔ (N) Booking (qua patientId — phía bệnh nhân)
- User (1) ↔ (N) Review (qua doctorId)
- User (1) ↔ (N) Review (qua patientId)
- User (1) ↔ (N) Token (qua userId)
- Specialty (1) ↔ (N) Doctor_Info (qua specialtyId)
- Clinic (1) ↔ (N) Doctor_Info (qua clinicId)
- Booking (1) ↔ (1) Review (qua bookingId — UNIQUE)
- Allcode ↔ User (gender, positionId, roleId qua keyMap)
- Allcode ↔ Doctor_Info (priceId, provinceId, paymentId qua keyMap)
- Allcode ↔ Schedule (timeType qua keyMap)
- Allcode ↔ Booking (statusId, timeType, patientGender qua keyMap)

### D3.8.2. MÔ TẢ CÁC BẢNG

#### Bảng Users

| STT | Tên thuộc tính | Kiểu dữ liệu | Mô tả |
|-----|---------------|--------------|-------|
| 1 | id | INTEGER (PK, AI) | Mã người dùng |
| 2 | email | STRING(255), UNIQUE, NOT NULL | Email đăng nhập |
| 3 | password | STRING(255), NULL | Mật khẩu bcrypt hash |
| 4 | firstName | STRING(255), NOT NULL | Tên |
| 5 | lastName | STRING(255), NOT NULL | Họ |
| 6 | address | STRING(255), NULL | Địa chỉ |
| 7 | phoneNumber | STRING(20), NULL | Số điện thoại |
| 8 | gender | STRING(10), NULL | Giới tính (FK→Allcode.keyMap) |
| 9 | roleId | STRING(10), NOT NULL | Vai trò: R1/R2/R3 (FK→Allcode.keyMap) |
| 10 | image | BLOB(long), NULL | Ảnh đại diện (base64) |
| 11 | positionId | STRING(10), NULL | Chức vụ (FK→Allcode.keyMap) |
| 12 | tokenVersion | INTEGER, DEFAULT 0 | Phiên bản token (tăng khi đổi MK) |

#### Bảng Bookings

| STT | Tên thuộc tính | Kiểu dữ liệu | Mô tả |
|-----|---------------|--------------|-------|
| 1 | id | INTEGER (PK, AI) | Mã lịch hẹn |
| 2 | statusId | STRING(10), NOT NULL | Trạng thái: S1/S1.5/S2/S3/S4 |
| 3 | doctorId | INTEGER, NOT NULL | FK→Users.id (bác sĩ) |
| 4 | patientId | INTEGER, NOT NULL | FK→Users.id (bệnh nhân) |
| 5 | date | STRING(20), NOT NULL | Ngày khám (timestamp UTC) |
| 6 | timeType | STRING(10), NOT NULL | Khung giờ: T1-T8 |
| 7 | token | STRING(255), NOT NULL | Token xác thực email |
| 8 | reason | TEXT, NULL | Lý do khám |
| 9 | patientName | STRING(255), NULL | Tên bệnh nhân |
| 10 | patientPhoneNumber | STRING(20), NULL | SĐT bệnh nhân |
| 11 | patientAddress | STRING(255), NULL | Địa chỉ bệnh nhân |
| 12 | patientGender | STRING(10), NULL | Giới tính BN |
| 13 | patientBirthday | STRING(20), NULL | Ngày sinh BN |
| 14 | paymentToken | STRING(255), UNIQUE, NULL | Token thanh toán VNPay |
| 15 | paymentStatus | STRING(10), DEFAULT 'unpaid' | Trạng thái TT: unpaid/paid/failed/expired |
| 16 | bookingPrice | INTEGER, DEFAULT 0 | Giá khám (VND) |
| 17 | vnpayTransactionNo | STRING(50), NULL | Mã giao dịch VNPay |
| 18 | vnp_PayDate | STRING(20), NULL | Ngày thanh toán VNPay |
| 19 | publicReceiptToken | STRING(100), UNIQUE, NULL | Token biên lai công khai |
| 20 | receiptExpiredAt | DATE, NULL | Hạn biên lai |
| 21 | reconcileFirstSeenAt | DATE, NULL | Thời điểm đối soát lần đầu |
| 22 | lastQuerydrCode | STRING(4), NULL | Mã QueryDR cuối |

#### Bảng Schedules

| STT | Tên thuộc tính | Kiểu dữ liệu | Mô tả |
|-----|---------------|--------------|-------|
| 1 | id | INTEGER (PK, AI) | Mã lịch |
| 2 | doctorId | INTEGER, NOT NULL | FK→Users.id |
| 3 | date | STRING(20), NOT NULL | Ngày (timestamp UTC) |
| 4 | timeType | STRING(10), NOT NULL | Khung giờ: T1-T8 |
| 5 | maxNumber | INTEGER, DEFAULT 10 | Số BN tối đa/slot |
| 6 | currentNumber | INTEGER, DEFAULT 0 | Số BN hiện tại |
> UNIQUE(doctorId, date, timeType)

#### Bảng Doctor_Infos

| STT | Tên thuộc tính | Kiểu dữ liệu | Mô tả |
|-----|---------------|--------------|-------|
| 1 | id | INTEGER (PK, AI) | Mã |
| 2 | doctorId | INTEGER, NOT NULL | FK→Users.id |
| 3 | specialtyId | INTEGER, NULL | FK→Specialties.id |
| 4 | clinicId | INTEGER, NULL | FK→Clinics.id |
| 5 | priceId | STRING(10), NULL | FK→Allcode.keyMap (giá khám) |
| 6 | provinceId | STRING(10), NULL | FK→Allcode.keyMap (tỉnh/thành) |
| 7 | paymentId | STRING(10), NULL | FK→Allcode.keyMap (hình thức TT) |
| 8 | contentHTML | TEXT, NULL | Mô tả bác sĩ (HTML) |
| 9 | contentMarkdown | TEXT, NULL | Mô tả bác sĩ (Markdown) |
| 10 | description | TEXT, NULL | Giới thiệu ngắn |
| 11 | note | TEXT, NULL | Ghi chú |
| 12 | count | INTEGER, DEFAULT 0 | Lượt khám |

#### Bảng Specialties

| STT | Tên thuộc tính | Kiểu dữ liệu | Mô tả |
|-----|---------------|--------------|-------|
| 1 | id | INTEGER (PK, AI) | Mã chuyên khoa |
| 2 | name | STRING(255), NOT NULL | Tên chuyên khoa |
| 3 | image | BLOB(long), NULL | Ảnh chuyên khoa |
| 4 | descriptionHTML | TEXT, NULL | Mô tả (HTML) |
| 5 | descriptionMarkdown | TEXT, NULL | Mô tả (Markdown) |

#### Bảng Clinics

| STT | Tên thuộc tính | Kiểu dữ liệu | Mô tả |
|-----|---------------|--------------|-------|
| 1 | id | INTEGER (PK, AI) | Mã phòng khám |
| 2 | name | STRING(255), NOT NULL | Tên phòng khám |
| 3 | address | STRING(255), NOT NULL | Địa chỉ |
| 4 | image | BLOB(long), NULL | Ảnh phòng khám |
| 5 | descriptionHTML | TEXT, NULL | Mô tả (HTML) |
| 6 | descriptionMarkdown | TEXT, NULL | Mô tả (Markdown) |

#### Bảng Allcodes

| STT | Tên thuộc tính | Kiểu dữ liệu | Mô tả |
|-----|---------------|--------------|-------|
| 1 | id | INTEGER (PK, AI) | Mã |
| 2 | type | STRING(50), NOT NULL | Loại: ROLE/GENDER/TIME/STATUS/POSITION/PRICE/PAYMENT/PROVINCE |
| 3 | keyMap | STRING(10), UNIQUE, NOT NULL | Mã key (R1, G1, T1, S1, ...) |
| 4 | valueVi | STRING(255), NOT NULL | Giá trị tiếng Việt |
| 5 | valueEn | STRING(255), NOT NULL | Giá trị tiếng Anh |

#### Bảng Reviews

| STT | Tên thuộc tính | Kiểu dữ liệu | Mô tả |
|-----|---------------|--------------|-------|
| 1 | id | INTEGER (PK, AI) | Mã đánh giá |
| 2 | doctorId | INTEGER, NOT NULL | FK→Users.id (bác sĩ) |
| 3 | patientId | INTEGER, NOT NULL | FK→Users.id (bệnh nhân) |
| 4 | bookingId | INTEGER, NOT NULL, UNIQUE | FK→Bookings.id (1 booking = 1 review) |
| 5 | rating | INTEGER, NOT NULL | Điểm đánh giá (1-5) |
| 6 | comment | TEXT, NULL | Nhận xét |

#### Bảng Tokens

| STT | Tên thuộc tính | Kiểu dữ liệu | Mô tả |
|-----|---------------|--------------|-------|
| 1 | id | INTEGER (PK, AI) | Mã |
| 2 | tokenHash | STRING(64), UNIQUE, NOT NULL | SHA256 hash của token |
| 3 | userId | INTEGER, NOT NULL | FK→Users.id |
| 4 | type | STRING(20), NOT NULL | Loại: RESET_PW / VERIFY_EMAIL |
| 5 | isUsed | BOOLEAN, DEFAULT false | Đã dùng chưa |
| 6 | expiredAt | DATE, NOT NULL | Thời hạn |

---

## D3.9. THIẾT KẾ GIAO DIỆN

### D3.9.1. DANH SÁCH MÀN HÌNH

| STT | Tên màn hình | Route | Mô tả |
|-----|-------------|-------|-------|
| 1 | Trang chủ | `/` | Banner, chuyên khoa nổi bật, bác sĩ nổi bật, phòng khám |
| 2 | Đăng nhập | `/login` | Form email/password, link quên MK, link đăng ký |
| 3 | Đăng ký | `/register` | Form đăng ký bệnh nhân |
| 4 | Quên mật khẩu | `/forgot-password` | Nhập email để nhận link reset |
| 5 | Đặt lại mật khẩu | `/reset-password` | Nhập mật khẩu mới từ link email |
| 6 | Chi tiết bác sĩ | `/doctor/:id` | Thông tin BS, lịch khám, giá, đánh giá, nút đặt lịch |
| 7 | Chi tiết chuyên khoa | `/specialty/:id` | Mô tả CK, danh sách BS theo CK |
| 8 | Chi tiết phòng khám | `/clinic/:id` | Mô tả PK, danh sách BS theo PK |
| 9 | Xác thực lịch hẹn | `/verify-booking` | Xác nhận booking từ link email |
| 10 | Modal đặt lịch | (Modal overlay) | Form nhập thông tin BN để đặt lịch |
| 11 | Kết quả thanh toán | `/payment-result` | Hiển thị kết quả thanh toán VNPay |
| 12 | Dashboard Admin | `/system/dashboard` | 4 KPI + 4 biểu đồ |
| 13 | Quản lý người dùng | `/system/user-manage` | CRUD users (bảng + form) |
| 14 | Quản lý bác sĩ | `/system/doctor-manage` | Thêm/sửa thông tin BS (Markdown editor) |
| 15 | Quản lý chuyên khoa | `/system/specialty-manage` | CRUD specialties |
| 16 | Quản lý phòng khám | `/system/clinic-manage` | CRUD clinics |
| 17 | Quản lý lịch khám | `/system/schedule-manage` | Tạo bulk, sửa, xóa schedules |
| 18 | Quản lý bệnh nhân (BS) | `/doctor-dashboard/manage-patient` | Danh sách BN theo ngày + KPI |
| 19 | Hồ sơ bệnh nhân | `/patient/profile` | Xem/sửa thông tin cá nhân |
| 20 | Lịch sử khám | `/patient/history` | Danh sách booking, filter, hủy, đánh giá |
| 21 | Modal gửi kết quả | (Modal overlay) | Upload ảnh kết quả, gửi email |
| 22 | Modal đánh giá | (Modal overlay) | Rating 1-5 sao + comment |

### D3.9.2. SƠ ĐỒ LUỒNG MÀN HÌNH

> [!IMPORTANT]
> [CẦN VẼ THỦ CÔNG] — Mô tả luồng điều hướng:

**Luồng Guest:**
Trang chủ → Tìm kiếm → Chi tiết CK/PK/BS → (cần đăng nhập để đặt lịch)
Trang chủ → Đăng nhập → (theo role) → Dashboard/Portal

**Luồng Patient:**
Đăng nhập → Trang chủ → Chi tiết BS → Modal đặt lịch → Email xác nhận → Xác thực → Thanh toán VNPay → Kết quả
Đăng nhập → Patient Portal → Hồ sơ / Lịch sử → Modal đánh giá

**Luồng Doctor:**
Đăng nhập → Doctor Dashboard → Quản lý BN → Modal gửi kết quả
Đăng nhập → Doctor Dashboard → Quản lý lịch khám

**Luồng Admin:**
Đăng nhập → System → Dashboard / User Manage / Doctor Manage / Specialty Manage / Clinic Manage / Schedule Manage
