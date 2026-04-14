# 📋 Giai Đoạn 9: Patient Portal, Rating & Strict Auth Flow — Design Document

> **Version:** 3.0 — Final Security Hardened (Codex Audit)  
> **Ngày tạo:** 2026-04-04 | **Cập nhật:** 2026-04-04  
> **Vai trò:** Principal Software Architect & Senior Fullstack Developer  
> **Trạng thái:** Production-Ready — Final Security Audit Passed

---

## Mục Lục

1. [Tổng Quan & Quyết Định Cốt Lõi](#1-tổng-quan--quyết-định-cốt-lõi)
2. [Kiến Trúc Hệ Thống Hiện Tại (Baseline)](#2-kiến-trúc-hệ-thống-hiện-tại)
3. [Thiết Kế Database — Bảng Reviews](#3-thiết-kế-database--bảng-reviews)
4. [API Backend Specs](#4-api-backend-specs)
5. [Thiết Kế Frontend — Components & UI](#5-thiết-kế-frontend--components--ui)
6. [Refactor Luồng Đặt Lịch](#6-refactor-luồng-đặt-lịch)
7. [Quy Tắc Bắt Buộc — Liên Kết Hệ Thống Cũ](#7-quy-tắc-bắt-buộc--liên-kết-hệ-thống-cũ)
8. [Lộ Trình Triển Khai Chi Tiết](#8-lộ-trình-triển-khai-chi-tiết)

---

## 1. Tổng Quan & Quyết Định Cốt Lõi

### 1.1 Mục tiêu Giai đoạn 9

Xây dựng **Patient Portal** — phân hệ quản lý cá nhân cho bệnh nhân (R3), tích hợp hệ thống **đánh giá bác sĩ (Rating)**, và chuyển đổi toàn bộ luồng đặt lịch sang **Strict Authentication Flow** (bắt buộc đăng nhập).

### 1.2 Quyết định kiến trúc

| Quyết định | Chi tiết |
|---|---|
| **Hủy bỏ Guest Checkout** | Bệnh nhân BẮT BUỘC phải đăng nhập (R3) mới được đặt lịch khám |
| **Homepage giữ nguyên** | Trang chủ vẫn là trang chính, không thay đổi |
| **Patient Portal riêng biệt** | Truy cập qua menu Avatar dropdown trên Header → `/patient/*` |
| **Xử lý Guest cũ** | Email có `password = null` → yêu cầu xác minh quyền sở hữu email qua luồng Quên mật khẩu trước khi đặt mật khẩu (**v2.0 — Security Fix**) |

### 1.3 Phạm vi thay đổi

```
BACKEND
├── models/review.js              [NEW]
├── services/patientService.js    [MODIFY - Major]
├── services/userService.js       [MODIFY - Login response]
├── services/reviewService.js     [NEW]
├── controllers/patientController.js [MODIFY]
├── routes/web.js                 [MODIFY - Thêm routes mới]
├── middleware/authMiddleware.js   [MODIFY - Thêm checkPatientRole]
├── models/index.js               [MODIFY - Thêm Review associations]

FRONTEND
├── containers/Auth/Register.jsx          [NEW]
├── containers/Auth/ForgotPassword.jsx    [NEW]
├── containers/Auth/ResetPassword.jsx     [NEW]
├── containers/Auth/Auth.scss             [NEW]
├── containers/PatientPortal/             [NEW - Toàn bộ module]
│   ├── PatientLayout.jsx
│   ├── PatientProfile.jsx
│   ├── AppointmentHistory.jsx
│   └── RatingModal.jsx
├── containers/Patient/DoctorReviewList.jsx [NEW]
├── containers/Patient/BookingModal.jsx   [MODIFY - Major refactor]
├── containers/Patient/DoctorDetail.jsx   [MODIFY - Thêm Reviews]
├── components/Header/Header.jsx          [MODIFY - Avatar dropdown]
├── containers/App.jsx                    [MODIFY - Thêm routes]
├── redux/slices/userSlice.js             [MODIFY - Thêm actions]
├── services/patientService.js            [MODIFY - Thêm API calls]
├── services/userService.js               [MODIFY - Thêm auth APIs]
├── utils/constants.js                    [MODIFY - Thêm paths]
├── translations/vi.json                  [MODIFY - Thêm keys]
├── translations/en.json                  [MODIFY - Thêm keys]
```

---

## 2. Kiến Trúc Hệ Thống Hiện Tại

### 2.1 Tech Stack đang sử dụng

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite, Redux Toolkit + redux-persist, react-router-dom v6, react-intl (i18n), react-toastify, axios |
| Backend | Node.js + Express, Sequelize ORM, MySQL, JWT (jsonwebtoken), bcryptjs, nodemailer |
| Auth | JWT Bearer Token (Header `Authorization: Bearer <token>`), 2h expiry |

### 2.2 Cấu trúc Redux Store hiện tại

```
store
├── app       (language, genders, roles, positions, times, prices, payments, provinces, isLoading)
├── user      (isLoggedIn, userInfo, accessToken, loginError)
├── admin     (users, doctors, specialties, clinics)
└── doctor    (patients, booking history)
```

> **Quan trọng:** `user` slice đang persist vào localStorage (whitelist: `['user', 'app']`).

### 2.3 Login Response hiện tại (CẦN BỔ SUNG)

```javascript
// HIỆN TẠI — userService.js:handleUserLogin()
return {
  user: { id, email, roleId, firstName, lastName },  // ← THIẾU phoneNumber, address, gender, image
  accessToken: token,
};
```

### 2.4 Axios Instance, Interceptors & Session Hard Reset

- **File:** `src/services/axiosConfig.js`
- **Request Interceptor:** Tự động gắn `Authorization: Bearer <token>` từ Redux store
- **Response Interceptor:** Bắt 401 → thực hiện **Session Hard Reset** (trừ URL chứa `/auth/login`)

> ⚠️ **[v2.0 SECURITY FIX #1] Session Hard Reset Protocol**
>
> Khi gặp lỗi `401 Unauthorized` (token hết hạn) hoặc khi user bấm **Đăng xuất**, BẮT BUỘC thực hiện **đúng thứ tự** chuỗi lệnh sau để xóa sạch phiên làm việc:

```javascript
// === SESSION HARD RESET — Chuỗi lệnh BẮT BUỘC (đúng thứ tự) ===
import { store, persistor } from '../redux/store';
import { processLogout } from '../redux/slices/userSlice';

const performSessionHardReset = () => {
  // 1. Dispatch Redux logout → clear state in-memory
  store.dispatch(processLogout());

  // 2. Xóa persist data trong localStorage (cả key mới và key cũ)
  localStorage.removeItem('persist:root');
  localStorage.removeItem('persist:user');  // Tương thích key cũ

  // 3. Purge persistor → đảm bảo redux-persist không rehydrate data cũ
  persistor.purge();

  // 4. Xóa cookie auth (nếu có — phòng trường hợp tương lai dùng cookie)
  document.cookie = 'accessToken=; Max-Age=0; path=/';
  document.cookie = 'refreshToken=; Max-Age=0; path=/';

  // 5. Redirect về /login (CUỐI CÙNG — sau khi đã xóa sạch)
  window.location.href = '/login';
};
```

> **Lý do:** Nếu chỉ `dispatch(processLogout())` mà không xóa `persist:root` trong localStorage, redux-persist sẽ rehydrate lại `userInfo` + `accessToken` cũ khi user refresh trang → zombie session.

**Áp dụng tại 2 điểm:**
1. **Axios Response Interceptor** (`axiosConfig.js`): Khi bắt 401 từ protected route
2. **Header Logout Button** (`Header.jsx`): Khi user bấm "Đăng xuất"

### 2.5 Hàm xử lý ảnh BLOB (BẮT BUỘC tuân thủ)

| Thao tác | Hàm | File |
|---|---|---|
| **LƯU** ảnh Base64 vào DB | `stripBase64Prefix(data.image)` | `src/utils/stripBase64Prefix.js` |
| **ĐỌC** ảnh BLOB từ DB | `convertBlobToBase64(blob)` | `src/utils/convertBlobToBase64.js` |
| **VALIDATE** ảnh trước khi lưu | `validateBase64Image(data.image)` | `src/utils/validateBase64Image.js` |

> ⛔ **TUYỆT ĐỐI KHÔNG** dùng `Buffer.from(blob).toString('base64')` — gây Double-Encoding.

---

## 3. Thiết Kế Database — Bảng Reviews, Tokens & Indexing

### 3.1 Schema

```
Bảng: Reviews
┌─────────────┬──────────────┬──────────────────────────────────────┐
│ Column       │ Type         │ Constraints                          │
├─────────────┼──────────────┼──────────────────────────────────────┤
│ id           │ INT          │ PK, AUTO_INCREMENT                   │
│ doctorId     │ INT          │ FK → Users.id, NOT NULL, INDEX       │
│ patientId    │ INT          │ FK → Users.id, NOT NULL, INDEX       │
│ bookingId    │ INT          │ FK → Bookings.id, NOT NULL, UNIQUE   │
│ rating       │ INTEGER      │ NOT NULL, CHECK(1-5)                 │
│ comment      │ TEXT         │ NULLABLE                             │
│ createdAt    │ DATETIME     │ Auto                                 │
│ updatedAt    │ DATETIME     │ Auto                                 │
└─────────────┴──────────────┴──────────────────────────────────────┘
```

> ⚠️ **[v2.0 SECURITY FIX #2] Database Indexing**
>
> BẮT BUỘC đánh **Index** cho các cột `doctorId`, `patientId`, và `bookingId` để tối ưu truy vấn khi dữ liệu lớn. Sequelize UNIQUE constraint tự tạo index cho `bookingId`, nhưng `doctorId` và `patientId` phải khai báo tường minh.

### 3.2 Sequelize Model — `src/models/review.js`

```javascript
module.exports = (sequelize, DataTypes) => {
  const Review = sequelize.define('Review', {
    id:        { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    doctorId:  { type: DataTypes.INTEGER, allowNull: false },
    patientId: { type: DataTypes.INTEGER, allowNull: false },
    bookingId: { type: DataTypes.INTEGER, allowNull: false, unique: true }, // Chống click đúp + auto index
    rating:    { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1, max: 5 } },
    comment:   { type: DataTypes.TEXT, allowNull: true },
  }, {
    // [v2.0] Đánh index cho doctorId, patientId
    indexes: [
      { fields: ['doctorId'], name: 'idx_reviews_doctorId' },   // Tối ưu GET /doctors/:id/reviews
      { fields: ['patientId'], name: 'idx_reviews_patientId' }, // Tối ưu query theo bệnh nhân
    ],
  });
  return Review;
};
```

### 3.3 Associations — Bổ sung vào `models/index.js`

```javascript
// 🔗 User (Doctor) ↔ Review (1:N)
db.User.hasMany(db.Review, { foreignKey: 'doctorId', as: 'doctorReviews' });
db.Review.belongsTo(db.User, { foreignKey: 'doctorId', as: 'reviewDoctorData' });

// 🔗 User (Patient) ↔ Review (1:N)
db.User.hasMany(db.Review, { foreignKey: 'patientId', as: 'patientReviews' });
db.Review.belongsTo(db.User, { foreignKey: 'patientId', as: 'reviewPatientData' });

// 🔗 Booking ↔ Review (1:1)
db.Booking.hasOne(db.Review, { foreignKey: 'bookingId', as: 'reviewData' });
db.Review.belongsTo(db.Booking, { foreignKey: 'bookingId', as: 'bookingData' });
```

### 3.4 Ràng buộc nghiệp vụ

- Chỉ cho phép `INSERT` review khi `Booking.statusId === 'S3'` (đã khám xong)
- `UNIQUE(bookingId)` → mỗi booking chỉ được review 1 lần (chống click đúp)
- Validate `rating` trong khoảng 1–5 ở cả Backend service lẫn Frontend form
- **[v2.0]** Index trên `doctorId` và `patientId` → tối ưu JOIN/WHERE khi dữ liệu lớn

### 3.5 [v3.0] Bảng Tokens — One-Time Token Store

> ⚠️ **[v3.0 SECURITY FIX #1a] Bắt buộc hóa One-Time Token bằng Database**
>
> JWT `pwFingerprint` (v2.0) là lớp bảo vệ phụ. v3.0 yêu cầu **bảng Tokens** trong DB để đảm bảo token chỉ dùng **đúng 1 lần** và có thể audit trail.

```
Bảng: Tokens
┌─────────────┬──────────────┬──────────────────────────────────────┐
│ Column       │ Type         │ Constraints                          │
├─────────────┼──────────────┼──────────────────────────────────────┤
│ id           │ INT          │ PK, AUTO_INCREMENT                   │
│ tokenHash    │ STRING(64)   │ NOT NULL, UNIQUE, INDEX              │
│ userId       │ INT          │ FK → Users.id, NOT NULL, INDEX       │
│ type         │ STRING(20)   │ NOT NULL ('RESET_PW', 'VERIFY_EMAIL')│
│ isUsed       │ BOOLEAN      │ DEFAULT false                        │
│ expiredAt    │ DATETIME     │ NOT NULL                             │
│ createdAt    │ DATETIME     │ Auto                                 │
│ updatedAt    │ DATETIME     │ Auto                                 │
└─────────────┴──────────────┴──────────────────────────────────────┘
```

**Sequelize Model — `src/models/token.js`:**
```javascript
module.exports = (sequelize, DataTypes) => {
  const Token = sequelize.define('Token', {
    id:        { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    tokenHash: { type: DataTypes.STRING(64), allowNull: false, unique: true },
    userId:    { type: DataTypes.INTEGER, allowNull: false },
    type:      { type: DataTypes.STRING(20), allowNull: false },  // 'RESET_PW', 'VERIFY_EMAIL'
    isUsed:    { type: DataTypes.BOOLEAN, defaultValue: false },
    expiredAt: { type: DataTypes.DATE, allowNull: false },
  }, {
    indexes: [
      { fields: ['tokenHash'], name: 'idx_tokens_hash', unique: true },
      { fields: ['userId'], name: 'idx_tokens_userId' },
    ],
  });
  return Token;
};
```

**Luồng sử dụng:**
1. **Forgot Password:** Tạo JWT → hash JWT bằng `crypto.createHash('sha256')` → INSERT vào bảng Tokens (`isUsed: false`, `expiredAt: now + 15m`)
2. **Reset Password:** Verify JWT → hash JWT → tìm Token WHERE `{ tokenHash, isUsed: false }` → nếu `isUsed === true` → reject → nếu OK → UPDATE `isUsed = true` → đổi mật khẩu
3. **Cleanup:** Cron job hoặc tự xóa tokens expired (tùy chọn)

### 3.6 [v3.0] Tối ưu Index cho Bảng Bookings hiện tại

> ⚠️ **[v3.0 FIX #3] Bắt buộc đánh Index cho Bảng Bookings**
>
> Bảng Bookings hiện tại (`src/models/booking.js`) CHƯA có index cho các cột truy vấn thường xuyên. Khi dữ liệu lớn, truy vấn `GET /api/v1/patient/bookings` (lọc theo `patientId` + `statusId`) sẽ full table scan.

**Cập nhật `src/models/booking.js`:**
```javascript
module.exports = (sequelize, DataTypes) => {
  const Booking = sequelize.define('Booking', {
    // ... giữ nguyên các cột hiện tại ...
  }, {
    // [v3.0] Đánh index cho các cột truy vấn thường xuyên
    indexes: [
      { fields: ['patientId'], name: 'idx_bookings_patientId' },           // GET /patient/bookings
      { fields: ['statusId'], name: 'idx_bookings_statusId' },             // Filter theo tab (S1-S4)
      { fields: ['patientId', 'statusId'], name: 'idx_bookings_patient_status' }, // Composite index
      { fields: ['doctorId', 'date'], name: 'idx_bookings_doctor_date' },  // getListPatientForDoctor
    ],
  });
  return Booking;
};
```

**Lý do:** API `GET /api/v1/patient/bookings?status=S1,S2` luôn filter theo `patientId` (từ JWT) + `statusId` (từ tab). Composite index `(patientId, statusId)` tối ưu truy vấn này xuống O(log n).

---

## 4. API Backend Specs

### 4.1 Nhóm 1: API Protected — Đi qua JWT Middleware

> **Bảo mật IDOR:** BẮT BUỘC lấy `patientId` từ `req.user.id` (JWT payload). TUYỆT ĐỐI KHÔNG lấy từ query/body.

#### 4.1.1 Profile APIs

| Method | Endpoint | Middleware | Mô tả |
|---|---|---|---|
| `GET` | `/api/v1/patient/profile` | `verifyToken`, `checkPatientRole` | Lấy thông tin cá nhân (include genderData) |
| `PUT` | `/api/v1/patient/profile` | `verifyToken`, `checkPatientRole` | Cập nhật profile + avatar |
| `PUT` | `/api/v1/patient/change-password` | `verifyToken`, `checkPatientRole` | Đổi mật khẩu (check oldPassword) |

**PUT `/api/v1/patient/profile` — Request Body:**
```json
{
  "firstName": "Văn A",
  "lastName": "Nguyễn",
  "phoneNumber": "0912345678",
  "address": "123 Lê Lợi, Q1, HCM",
  "gender": "G1",
  "image": "data:image/jpeg;base64,/9j/4AAQ..."
}
```

**Logic xử lý ảnh:**
1. `validateBase64Image(data.image)` → validate MIME + size < 5MB
2. `stripBase64Prefix(data.image)` → cắt prefix
3. Lưu vào DB

**Sau khi lưu thành công:** Trả về `updatedUser` object (bao gồm image đã `convertBlobToBase64`) → Frontend dispatch update Redux.

**PUT `/api/v1/patient/change-password` — Request Body:**
```json
{ "oldPassword": "abc123", "newPassword": "xyz789" }
```

**Logic:**
1. `bcrypt.compare(oldPassword, user.password)` → nếu sai → `errCode: 2`
2. `bcrypt.hash(newPassword, 10)` → lưu DB

#### 4.1.2 Booking Flow APIs

| Method | Endpoint | Middleware | Mô tả |
|---|---|---|---|
| `POST` | `/api/v1/bookings` | `verifyToken`, `checkPatientRole` | ⚠️ **CHUYỂN từ Public → Protected** |
| `GET` | `/api/v1/patient/bookings` | `verifyToken`, `checkPatientRole` | Lấy lịch sử booking (3 tabs) |
| `PUT` | `/api/v1/patient/bookings/:bookingId/cancel` | `verifyToken`, `checkPatientRole` | Hủy lịch (S1/S2 → S4) |

**POST `/api/v1/bookings` — Refactor Logic:**
```
TRƯỚC ĐÂY:                          SAU KHI REFACTOR:
─────────────────────────────────   ─────────────────────────────────
1. Nhận data.email từ body          1. Lấy patientId từ req.user.id (JWT)
2. findOrCreate User (R3)           2. Tìm User bằng patientId
3. Tạo booking với patient.id       3. Tạo booking trực tiếp
4. Gửi email xác nhận               4. Gửi email xác nhận
```

**GET `/api/v1/patient/bookings` — Response:**

> ⚠️ **[v2.0 SECURITY FIX #7b] Pagination cho Patient Bookings**
>
> API này BẮT BUỘC tích hợp phân trang: `?page=1&limit=10&status=S1,S2` (default: page=1, limit=10).

```javascript
// Include để trả đủ data cho 3 tabs
const { page = 1, limit = 10, status } = req.query;
const offset = (page - 1) * limit;
const safeLimit = Math.min(parseInt(limit), 50); // Cap tối đa 50

const whereClause = { patientId: req.user.id };
if (status) { whereClause.statusId = status.split(','); } // Filter theo tab

const { count, rows } = await db.Booking.findAndCountAll({
  where: whereClause,
  limit: safeLimit,
  offset,
  order: [['createdAt', 'DESC']],
  include: [
    // Thông tin bác sĩ
    { model: db.User, as: 'doctorBookingData',
      attributes: ['id', 'firstName', 'lastName', 'image'],
      include: [{ model: db.Allcode, as: 'positionData', attributes: ['valueVi', 'valueEn'] }]
    },
    // Doctor_Info (tên phòng khám, chuyên khoa)
    { model: db.Doctor_Info, /* through doctorId */ },
    // Allcode: timeType, status
    { model: db.Allcode, as: 'timeTypeBooking', attributes: ['valueVi', 'valueEn'] },
    { model: db.Allcode, as: 'statusData', attributes: ['valueVi', 'valueEn'] },
    // Review (kiểm tra đã đánh giá chưa)
    { model: db.Review, as: 'reviewData', attributes: ['id'] },
  ],
});
// Response:
// { errCode: 0, data: rows (với isReviewed), pagination: { page, limit, totalItems: count, totalPages } }
```

Trả thêm cờ `isReviewed: !!booking.reviewData` cho mỗi booking.

**PUT `/api/v1/patient/bookings/:bookingId/cancel` — Logic:**

> ⚠️ **[v2.0 SECURITY FIX #3] Race Condition Prevention + Idempotency**
>
> BắT BUỘC dùng Sequelize Transaction kết hợp **Pessimistic Row Lock** (`FOR UPDATE`) khi kiểm tra trạng thái Booking và Schedule. Đảm bảo idempotency: một booking đã hủy (S4) không thể bị trừ slot thêm lần nữa.

```javascript
const t = await db.sequelize.transaction();
try {
  // 1. Tìm Booking với PESSIMISTIC LOCK — IDOR prevention
  const booking = await db.Booking.findOne({
    where: { id: bookingId, patientId: req.user.id },
    transaction: t,
    lock: t.LOCK.UPDATE,  // ✅ Row lock — chặn concurrent cancel
  });
  if (!booking) { await t.rollback(); return { errCode: 2, message: 'Không tìm thấy lịch hẹn' }; }

  // 2. Idempotency check — đã hủy rồi thì không làm gì
  if (booking.statusId === 'S4') {
    await t.rollback();
    return { errCode: 0, message: 'Lịch hẹn đã được hủy trước đó' };
  }

  // 3. Chỉ cho hủy khi status là S1 hoặc S2
  if (!['S1', 'S2'].includes(booking.statusId)) {
    await t.rollback();
    return { errCode: 3, message: 'Không thể hủy lịch hẹn ở trạng thái này' };
  }

  const oldStatus = booking.statusId;

  // 4. Update status → S4
  booking.statusId = 'S4';
  await booking.save({ transaction: t });

  // 5. Trả slot CHỈ KHI status cũ là S2 (đã xác nhận = đã tăng slot)
  if (oldStatus === 'S2') {
    // Lock Schedule row để tránh race condition
    const schedule = await db.Schedule.findOne({
      where: { doctorId: booking.doctorId, date: booking.date, timeType: booking.timeType },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    // Guard clause: Chỉ trừ nếu currentNumber > 0 (tránh số âm)
    if (schedule && schedule.currentNumber > 0) {
      await schedule.decrement('currentNumber', { by: 1, transaction: t });
    }
  }
  // (Không trừ slot nếu oldStatus = 'S1' vì S1 chưa tăng slot)

  await t.commit();
  return { errCode: 0, message: 'Hủy lịch hẹn thành công' };
} catch (err) {
  await t.rollback();
  throw err;
}
```

#### 4.1.3 Review API

| Method | Endpoint | Middleware | Mô tả |
|---|---|---|---|
| `POST` | `/api/v1/reviews` | `verifyToken`, `checkPatientRole` | Submit đánh giá |

**POST `/api/v1/reviews` — Request Body:**
```json
{ "bookingId": 42, "doctorId": 5, "rating": 5, "comment": "Bác sĩ rất tận tâm" }
```

**Logic bảo mật:**
1. Lấy `patientId` từ `req.user.id`
2. Tìm Booking WHERE `{ id: bookingId, patientId, doctorId, statusId: 'S3' }`
3. Nếu không tìm thấy → `errCode: 2` ("Booking không hợp lệ")
4. Kiểm tra Review đã tồn tại cho bookingId → `errCode: 3` ("Đã đánh giá")
5. `Review.create({ doctorId, patientId, bookingId, rating, comment })`

### 4.2 Nhóm 2: API Public — KHÔNG đi qua JWT Middleware

#### 4.2.1 Auth Core

| Method | Endpoint | Mô tả |
|---|---|---|
| `POST` | `/api/v1/auth/login` | ⚠️ **Bổ sung response** trả thêm `phoneNumber, address, gender, image` |
| `POST` | `/api/v1/auth/register` | Đăng ký bệnh nhân (R3) |

**POST `/api/v1/auth/login` — Response mới:**
```javascript
return {
  user: {
    id, email, roleId, firstName, lastName,
    phoneNumber,                  // [MỚI]
    address,                      // [MỚI]
    gender,                       // [MỚI]
    image: convertBlobToBase64(user.image),  // [MỚI] — BẮT BUỘC dùng convertBlobToBase64
  },
  accessToken: token,
};
```

**POST `/api/v1/auth/register` — Request Body:**
```json
{
  "firstName": "Văn A", "lastName": "Nguyễn",
  "email": "a@test.com", "phoneNumber": "0912345678",
  "password": "abc123"
}
```

**Logic (Edge Case Guest cũ):**

> ⚠️ **[v2.0 SECURITY FIX #4] Xác Minh Quyền Sở Hữu Email Cho Guest Cũ**
>
> **HỦY BỎ** việc tự động UPDATE mật khẩu ngay lập tức cho email có `password = null`.
> Thay thế bằng quy trình bảo mật: yêu cầu người dùng xác minh quyền sở hữu email trước khi đặt mật khẩu.

```
1. Validate required fields (firstName, lastName, email, phoneNumber, password)
2. Tìm User WHERE { email }
3. IF user tồn tại:
   a. IF user.password IS NOT NULL → errCode: 2 "Email đã tồn tại"
   b. IF user.password IS NULL (guest cũ từ luồng Guest Checkout cũ):
      → TRẢ VỀ errCode: 10, message: "Email này đã được sử dụng để đặt lịch.
         Vui lòng sử dụng chức năng 'Quên mật khẩu' để xác minh và tạo mật khẩu."
      → Frontend hiển thị toast + link đến /forgot-password
      → Khi user thực hiện forgot-password:
         API forgot-password phát hiện user.password === null
         → Gửi email chứa link SET password (không phải RESET)
         → API reset-password: UPDATE password + firstName, lastName, phoneNumber
      → GIỮ NGUYÊN lịch sử booking cũ của email đó
4. IF user KHÔNG tồn tại:
   → CREATE { ..., roleId: 'R3', password: bcrypt.hash() }
```

> **Lý do bảo mật:** Nếu cho phép bất kỳ ai nhập email guest cũ và tự đặt mật khẩu, kẻ tấn công có thể chiếm đoạt tài khoản và xem lịch sử khám bệnh của người khác (vi phạm HIPAA/GDPR). Buộc xác minh qua email đảm bảo chỉ chủ sở hữu email mới có thể claim tài khoản.

#### 4.2.2 Password Recovery

| Method | Endpoint | Mô tả |
|---|---|---|
| `POST` | `/api/v1/auth/forgot-password` | Gửi email link reset |
| `POST` | `/api/v1/auth/reset-password` | Đặt mật khẩu mới |

**POST `/api/v1/auth/forgot-password` — Request Body:**
```json
{ "email": "a@test.com", "language": "vi" }
```

> ⚠️ **[v2.0 SECURITY FIX #5] Chống Replay Attack — One-Time Reset Token**
>
> Token reset mật khẩu phải là **one-time use**. JWT payload phải chứa thêm mã hash mật khẩu hiện tại để tự động vô hiệu hóa khi mật khẩu đã được đổi.

**Logic Forgot Password:**
1. Tìm user bằng email. Nếu không tìm thấy → vẫn trả `errCode: 0` (chống email enumeration)
2. Tạo JWT token với payload đặc biệt:
```javascript
// [v2.0] Embed password hash để token tự vô hiệu hóa sau khi đổi mật khẩu
const resetToken = jwt.sign(
  {
    id: user.id,
    email: user.email,
    // Lấy 10 ký tự cuối của password hash làm "fingerprint"
    pwFingerprint: user.password ? user.password.slice(-10) : 'NO_PW',
  },
  process.env.JWT_SECRET,
  { expiresIn: '15m' }
);
```
3. Gửi email (via Nodemailer) chứa link: `${URL_REACT}/reset-password?token=<jwt>`
4. Email content theo `language` (vi/en)
5. **Edge case Guest cũ:** Nếu `user.password === null`, vẫn gửi email với `pwFingerprint: 'NO_PW'`

**POST `/api/v1/auth/reset-password` — Request Body:**
```json
{ "token": "<jwt_from_email>", "newPassword": "xyz789" }
```

**Logic (v3.0 — Final Security Hardened):**

> ⚠️ **[v3.0 SECURITY FIX #1b] Strict Session Revocation — BẮT BUỘC**
>
> Việc vô hiệu hóa các JWT đăng nhập cũ sau khi đổi mật khẩu là **STRICT REQUIREMENT** (Yêu cầu bắt buộc), KHÔNG còn là tùy chọn. Backend PHẢI thực thi logic này.

```javascript
const crypto = require('crypto');

// 1. Verify JWT
const decoded = jwt.verify(token, process.env.JWT_SECRET);
// Nếu hết hạn → jwt.verify tự throw TokenExpiredError → errCode: 2

// 2. [v3.0] ONE-TIME CHECK qua bảng Tokens (LỚP BẢO VỆ CHÍNH)
const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
const tokenRecord = await db.Token.findOne({
  where: { tokenHash, type: 'RESET_PW', isUsed: false },
});
if (!tokenRecord) {
  // Token đã dùng HOẶC không tồn tại → reject ngay
  return { errCode: 4, message: 'Link đặt lại mật khẩu đã được sử dụng hoặc không hợp lệ!' };
}

// 3. Tìm user
const user = await db.User.findByPk(decoded.id);
if (!user) return { errCode: 3, message: 'User không tồn tại' };

// 4. [v2.0] LỚP BẢO VỆ PHỤ: So sánh pwFingerprint với password hiện tại
const currentFingerprint = user.password ? user.password.slice(-10) : 'NO_PW';
if (decoded.pwFingerprint !== currentFingerprint) {
  return { errCode: 4, message: 'Link đặt lại mật khẩu đã được sử dụng hoặc không hợp lệ!' };
}

// ==== TRANSACTION: Đổi MK + Đánh dấu token + Revoke sessions ====
const t = await db.sequelize.transaction();
try {
  // 5. Hash + lưu mật khẩu mới
  user.password = await bcrypt.hash(newPassword, 10);
  // Nếu là guest cũ (password cũ = null), cập nhật thêm thông tin nếu có
  // [v3.0] Tăng tokenVersion → vô hiệu hóa MỌI JWT đăng nhập cũ
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save({ transaction: t });

  // 6. [v3.0] Đánh dấu token đã sử dụng → chống replay
  tokenRecord.isUsed = true;
  await tokenRecord.save({ transaction: t });

  await t.commit();
} catch (err) {
  await t.rollback();
  throw err;
}
```

> **[v3.0] Cơ chế Revoke Session — Strict Requirement:**
>
> - **User model** phải bổ sung cột `tokenVersion` (INT, DEFAULT 0)
> - **JWT Login payload** phải chứa `tokenVersion` hiện tại của user
> - **`verifyToken` middleware** BẮT BUỘC kiểm tra:
>   ```javascript
>   // authMiddleware.js — verifyToken (v3.0 hardened)
>   const user = await db.User.findByPk(decoded.id, { attributes: ['id', 'tokenVersion'] });
>   if (!user || decoded.tokenVersion !== user.tokenVersion) {
>     return res.status(401).json({ errCode: -2, message: 'Phiên đăng nhập đã bị thu hồi!' });
>   }
>   ```
> - Khi password thay đổi → `tokenVersion++` → tất cả JWT cũ chứa `tokenVersion` cũ sẽ bị reject ngay lập tức
>
> ⛔ **Đây là STRICT REQUIREMENT.** Cấm bỏ qua bước này trong quá trình triển khai.

⚠️ Token reset dùng trong **body**, KHÔNG dùng Header `Authorization`

#### 4.2.3 Doctor Reviews (Public Read)

| Method | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/api/v1/doctors/:doctorId/reviews` | Lấy danh sách đánh giá + trung bình |

**Response:**
```json
{
  "errCode": 0,
  "data": {
    "averageRating": 4.5,
    "totalReviews": 12,
    "reviews": [
      {
        "id": 1,
        "rating": 5,
        "comment": "Bác sĩ rất tận tâm",
        "createdAt": "2026-04-01T10:00:00Z",
        "reviewPatientData": { "firstName": "A", "lastName": "Nguyễn" }
      }
    ]
  }
}
```

---

## 5. Thiết Kế Frontend — Components & UI

### 5.1 i18n — Tất cả text tĩnh PHẢI dùng react-intl

Sử dụng `<FormattedMessage id="key" />` hoặc `useIntl().formatMessage({ id: 'key' })`.

**Các key mới cần thêm vào `vi.json` / `en.json`:**

```
// Auth Module
auth.register.title, auth.register.confirm-password, auth.register.btn,
auth.register.have-account, auth.forgot-password.title, auth.forgot-password.btn,
auth.reset-password.title, auth.reset-password.btn,

// Patient Portal
patient-portal.sidebar.profile, patient-portal.sidebar.appointments,
patient-portal.profile.title, patient-portal.profile.personal-info,
patient-portal.profile.change-password, patient-portal.profile.edit-btn,
patient-portal.profile.save-btn, patient-portal.profile.upload-avatar,

// Appointment History
patient-portal.appointments.title, patient-portal.appointments.tab-upcoming,
patient-portal.appointments.tab-completed, patient-portal.appointments.tab-cancelled,
patient-portal.appointments.btn-detail, patient-portal.appointments.btn-cancel,
patient-portal.appointments.btn-result, patient-portal.appointments.btn-rate,
patient-portal.appointments.btn-rebook, patient-portal.appointments.confirm-cancel,

// Rating
rating.title, rating.placeholder, rating.submit, rating.success,

// Header dropdown
header.my-profile, header.logout,
```

### 5.2 Bổ sung `utils/constants.js`

```javascript
// Patient Portal (R3)
PATIENT_PORTAL: '/patient',
PATIENT_PROFILE: '/patient/profile',
PATIENT_APPOINTMENTS: '/patient/appointments',

// Auth
REGISTER: '/register',
FORGOT_PASSWORD: '/forgot-password',
RESET_PASSWORD: '/reset-password',
```

### 5.3 Auth Module

#### 5.3.1 Bổ sung `authMiddleware.js` — `checkPatientRole`

```javascript
const checkPatientRole = (req, res, next) => {
  if (!req.user || req.user.roleId !== 'R3') {
    return res.status(403).json({ errCode: -1, message: 'Bạn không có quyền bệnh nhân!' });
  }
  next();
};
```

#### 5.3.2 `Login.jsx` — Cập nhật

- Thêm link "Đăng ký" → `/register`
- Thêm link "Quên mật khẩu" → `/forgot-password` (thay `href="#!"` hiện tại)
- Redirect R3 → Homepage `/` (giữ nguyên logic hiện tại)

> ⚠️ **[v2.0 SECURITY FIX #6] Chống Open Redirect**
>
> Hàm xử lý `redirect` query param BẮT BUỘC validate **allowlist**. Chỉ chấp nhận các đường dẫn nội bộ (bắt đầu bằng `/`), từ chối tuyệt đối các URL tuyệt đối.

```javascript
// [v2.0] Validate redirect param — Chống Open Redirect Attack
const validateRedirectUrl = (redirectUrl) => {
  if (!redirectUrl) return '/';
  // Chỉ chấp nhận path nội bộ, bắt đầu bằng '/'
  // Từ chối: '//evil.com', 'http://evil.com', 'javascript:', 'data:'
  if (
    redirectUrl.startsWith('/') &&
    !redirectUrl.startsWith('//') &&
    !redirectUrl.includes('://')
  ) {
    return redirectUrl;
  }
  return '/'; // Fallback về homepage
};

// Sử dụng trong useEffect redirect:
const redirectUrl = validateRedirectUrl(searchParams.get('redirect'));
navigate(redirectUrl, { replace: true });
```

#### 5.3.3 `Register.jsx` [NEW]

```
Layout: Dùng chung Auth background (login-background class)
Fields: lastName, firstName, email, phoneNumber, password, confirmPassword
Submit: POST /api/v1/auth/register → Toast success → Redirect /login
Validation: email regex, phone 10 số, password >= 6 ký tự, confirmPassword match
```

#### 5.3.4 `ForgotPassword.jsx` [NEW]

```
Layout: Auth background
Fields: email
Submit: POST /api/v1/auth/forgot-password (kèm language từ Redux)
Success: Toast "Vui lòng kiểm tra email"
```

#### 5.3.5 `ResetPassword.jsx` [NEW]

```
Layout: Auth background
Fields: newPassword, confirmPassword
URL Params: ?token=<jwt> (lấy từ useSearchParams)
Submit: POST /api/v1/auth/reset-password { token, newPassword }
Success: Toast → Redirect /login
```

### 5.4 Header Navigation — Cập nhật

**Thay đổi cho role R3 (Patient):**

```
HIỆN TẠI:                           SAU KHI CẬP NHẬT:
─────────────────────────           ─────────────────────────
"Xin chào, {name}"                  Avatar circle (image từ Redux)
[Dashboard btn] (ẩn cho R3)         Click → Dropdown menu:
[Logout btn]                          ├── "Trang cá nhân" → /patient/profile
                                      └── "Đăng xuất" → processLogout()
```

**Logic Avatar:** Lấy `userInfo.image` từ Redux. **[v2.0 FIX #8]** KHÔNG hardcode `data:image/jpeg` — phải detect MIME type thực tế từ dữ liệu base64 (xem Mục 7.1 quy tắc #11). Nếu không có image → hiển thị icon default (fas fa-user-circle).

### 5.5 Patient Portal Module

#### 5.5.1 `PatientLayout.jsx` [NEW]

```
┌─────────────────────────────────────────────────┐
│ Header (existing)                                │
├──────────┬──────────────────────────────────────┤
│ Sidebar  │ <Outlet />                            │
│          │                                       │
│ 👤 Profile│ (PatientProfile / AppointmentHistory) │
│ 📋 Lịch hẹn│                                      │
│          │                                       │
├──────────┴──────────────────────────────────────┤
│ Footer (existing)                                │
└─────────────────────────────────────────────────┘
```

- Route: `/patient` → `PrivateRoute` allowedRoles `['R3']`
- Default redirect: `/patient` → `/patient/profile`

#### 5.5.2 `PatientProfile.jsx` [NEW]

**Giao diện 2 khối:**

```
┌────────────────────────────────────────────────┐
│ ★ Thông tin cá nhân                  [Chỉnh sửa] │
├────────────────────────────────────────────────┤
│  ┌────────┐                                     │
│  │ Avatar │  Email: a@test.com (readOnly)        │
│  │ Upload │  Họ:     [_________]                 │
│  └────────┘  Tên:    [_________]                 │
│              SĐT:    [_________]                 │
│              Địa chỉ:[_________]                 │
│              Giới tính: [▼ Dropdown]             │
│                                        [Lưu]    │
├────────────────────────────────────────────────┤
│ 🔒 Đổi mật khẩu                                 │
├────────────────────────────────────────────────┤
│  Mật khẩu cũ:   [_________]                     │
│  Mật khẩu mới:  [_________]                     │
│  Xác nhận MK:   [_________]                     │
│                                     [Đổi MK]    │
└────────────────────────────────────────────────┘
```

**State Management:**
- `mode`: `'view'` | `'edit'` — toggle khi bấm "Chỉnh sửa" / "Lưu"
- Fetch `Allcode(type: GENDER)` → render dropdown giới tính
- Avatar upload: `FileReader.readAsDataURL()` → validate < 5MB → preview
- **Khi lưu thành công:** `dispatch(updateUserInfo(updatedUser))` → Header đồng bộ ngay

**Redux action mới trong `userSlice.js`:**
```javascript
reducers: {
  // ... existing
  updateUserInfo: (state, action) => {
    state.userInfo = { ...state.userInfo, ...action.payload };
  },
},
```

#### 5.5.3 `AppointmentHistory.jsx` [NEW]

**3 Tabs:**

| Tab | Filter | Hiển thị | Actions |
|---|---|---|---|
| **Sắp tới** | `statusId IN ('S1','S2')` | Tên BS, Giờ khám (timeTypeData), Ngày, Trạng thái | `[Xem chi tiết]` `[Hủy lịch]` |
| **Đã khám** | `statusId = 'S3'` | Tên BS, Giờ, Ngày | `[Xem kết quả]` `[Đánh giá]*` `[Đặt lại]` |
| **Đã hủy** | `statusId = 'S4'` | Tên BS, Giờ, Ngày | `[Đặt lại]` |

> `*` Nút [Đánh giá] chỉ hiển thị khi `isReviewed === false`

**Nút [Hủy lịch] — UX Flow:**
1. Click → Mở `Modal Confirm` ("Bạn có chắc chắn muốn hủy lịch hẹn này?")
2. Xác nhận → `PUT /api/v1/patient/bookings/:id/cancel`
3. Success → Toast + Refresh list
4. ⚠️ KHÔNG cho hủy trực tiếp khi click — bắt buộc qua Modal Confirm

**Nút [Đặt lại]:** Navigate tới `/doctor/:doctorId` để bệnh nhân đặt lại từ đầu.

#### 5.5.4 `RatingModal.jsx` [NEW]

```
┌─────────────────────────────────┐
│ ★ Đánh giá bác sĩ              │
├─────────────────────────────────┤
│                                  │
│   ☆ ☆ ☆ ☆ ☆  (Click to rate)   │
│                                  │
│   ┌─────────────────────────┐   │
│   │ Nhận xét (tuỳ chọn)... │   │
│   │                         │   │
│   └─────────────────────────┘   │
│                                  │
│        [Hủy]  [Gửi đánh giá]   │
└─────────────────────────────────┘
```

**Props:** `{ isOpen, onClose, bookingId, doctorId, onSuccess }`
**Submit:** `POST /api/v1/reviews` → Toast success → `onSuccess()` (refresh list) → close

### 5.6 `DoctorReviewList.jsx` [NEW] — Bổ sung vào DoctorDetail

```
┌─────────────────────────────────┐
│ ⭐ Đánh giá từ bệnh nhân        │
├─────────────────────────────────┤
│ ★ 4.5/5 (12 đánh giá)          │
├─────────────────────────────────┤
│  ★★★★★  Nguyễn Văn A           │
│  "Bác sĩ rất tận tâm"           │
│  01/04/2026                      │
│─────────────────────────────────│
│  ★★★★☆  Trần Thị B             │
│  "Khám nhanh, chuyên nghiệp"    │
│  30/03/2026                      │
└─────────────────────────────────┘
```

**Vị trí:** Chèn vào `DoctorDetail.jsx` giữa **PHẦN 3** (Bài viết) và **PHẦN 4** (Facebook Comment).

**API:** `GET /api/v1/doctors/:doctorId/reviews` (Public — không cần auth)

> ⚠️ **[v2.0 SECURITY FIX #7a] Pagination cho Doctor Reviews**
>
> API `GET /api/v1/doctors/:doctorId/reviews` BẮT BUỘC tích hợp phân trang.

```
Query params: ?page=1&limit=10 (default: page=1, limit=10, max limit=50)
Response bổ sung:
  "pagination": { "page": 1, "limit": 10, "totalItems": 45, "totalPages": 5 }
```

Frontend: Component `DoctorReviewList` render nút "Xem thêm" hoặc infinite scroll để tải trang tiếp theo.

---

## 6. Refactor Luồng Đặt Lịch

### 6.1 BookingModal.jsx — Luồng mới

```
TRƯỚC ĐÂY (Guest Checkout):         SAU KHI REFACTOR (Strict Auth):
──────────────────────────           ──────────────────────────────
1. Click khung giờ                   1. Click khung giờ
2. Mở modal → Form trống            2. Check Redux isLoggedIn
3. User tự điền 7 fields            3. IF false → redirect /login (return URL)
4. Submit → findOrCreate            4. IF true → Mở modal
                                     5. Auto-fill: fullName, phone, gender, address
                                     6. Email: DISABLED (readOnly, lấy từ Redux)
                                     7. Submit → dùng patientId từ JWT
```

### 6.2 Backend `postBookAppointment` — Refactor

```javascript
// TRƯỚC: lấy từ body
const [patient] = await db.User.findOrCreate({ where: { email: data.email }, ... });

// SAU: lấy từ JWT
const patientId = req.user.id;  // Từ authMiddleware
const patient = await db.User.findByPk(patientId);
if (!patient) { return { errCode: 5, message: 'User không tồn tại' }; }
// ... tạo booking với patient.id
```

### 6.3 Xử lý redirect trở lại

Khi redirect sang `/login` từ BookingModal, lưu URL hiện tại:
```javascript
navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
```

Login.jsx đọc `redirect` query param → sau login R3 → redirect back thay vì `/`.

### 6.4 [v3.0] Lộ trình Rollout cho API Bookings (Backward Compatibility)

> ⚠️ **[v3.0 FIX #2] Chiến lược Tương thích ngược**
>
> Vì `POST /api/v1/bookings` chuyển từ **Public** sang **Protected** (JWT required), cần thiết kế **Deprecation Window** để tránh gây lỗi cho các client cũ chưa cập nhật.

**Giai đoạn chuyển tiếp (7 ngày):**

| Ngày | Chế độ | Chi tiết |
|---|---|---|
| 1–7 | **Dual Mode** | API hỗ trợ song song: Ưu tiên JWT; nếu không có token → fallback Guest + cảnh báo |
| 8+ | **Strict Mode** | JWT bắt buộc. Request không có token → `401 Unauthorized` |

**Logic Backend trong Deprecation Window:**

```javascript
// src/services/patientService.js — postBookAppointment (Dual Mode)
let postBookAppointment = async (req) => {
  let patientId = null;
  let isDeprecatedGuestFlow = false;

  // Ƭu tiên 1: Lấy patientId từ JWT (luồng mới)
  if (req.user && req.user.id) {
    patientId = req.user.id;
  }
  // Fallback: Luồng Guest cũ (chỉ trong deprecation window)
  else if (process.env.BOOKING_GUEST_MODE === 'true') {
    isDeprecatedGuestFlow = true;
    // Sử dụng findOrCreate cũ (giữ tương thích)
    const [patient] = await db.User.findOrCreate({
      where: { email: req.body.email },
      defaults: { roleId: 'R3', firstName: req.body.firstName, ... }
    });
    patientId = patient.id;
  }
  else {
    return { errCode: -1, message: 'Unauthorized — Vui lòng đăng nhập để đặt lịch' };
  }

  // ... tiếp tục logic đặt lịch ...

  // Trả về cảnh báo nếu dùng luồng cũ
  return {
    errCode: 0,
    message: 'Booking thành công',
    deprecationWarning: isDeprecatedGuestFlow
      ? 'CHÚ Ý: Guest Checkout sẽ ngừng hỗ trợ sau 7 ngày. Vui lòng đăng nhập để tiếp tục sử dụng dịch vụ.'
      : null,
  };
};
```

**Biến môi trường (`.env`):**
```
# Bật/tắt chế độ Guest cũ trong deprecation window
BOOKING_GUEST_MODE=true   # Ngày 1–7: true
# BOOKING_GUEST_MODE=false  # Ngày 8+: false hoặc xóa biến
```

**Frontend:** Nếu response chứa `deprecationWarning`, hiển thị Toast warning: *"Vui lòng đăng nhập để tiếp tục đặt lịch trong tương lai."*

**Sau ngày 8:** Set `BOOKING_GUEST_MODE=false` → loại bỏ toàn bộ fallback Guest → chỉ còn JWT.

---

## 7. Quy Tắc Bắt Buộc — Liên Kết Hệ Thống Cũ

### 7.1 Checklist Tuân Thủ

| # | Quy tắc | Chi tiết |
|---|---|---|
| 1 | **Axios Instance** | BẮT BUỘC dùng `axiosConfig.js` đã có. KHÔNG tạo axios instance mới |
| 2 | **react-toastify** | Dùng `toast.success()` / `toast.error()`. KHÔNG dùng `alert()` |
| 3 | **Redux Store** | Tái sử dụng `userSlice.js`, thêm actions mới vào đó. KHÔNG tạo slice mới cho user |
| 4 | **stripBase64Prefix** | BẮT BUỘC khi LƯU ảnh vào DB |
| 5 | **convertBlobToBase64** | BẮT BUỘC khi ĐỌC ảnh từ DB. CẤM `Buffer.from().toString('base64')` |
| 6 | **body-parser 8mb** | GIỮ NGUYÊN config trong `server.js`. KHÔNG reset về mặc định |
| 7 | **bcrypt** | BẮT BUỘC hash password trước khi lưu (register, reset-password) |
| 8 | **react-intl** | TẤT CẢ text tĩnh phải dùng `<FormattedMessage>` hoặc `useIntl()` |
| 9 | **IDOR Prevention** | Lấy userId từ `req.user.id` (JWT). CẤM lấy từ query/body |
| 10 | **Transactions** | Dùng Sequelize transaction + **Row Lock** cho cancel booking (update status + decrement slot) |
| 11 | **MIME Type động** | ⚠️ **[v2.0 FIX #8]** CẤM hardcode `data:image/jpeg`. Phải detect MIME type thực tế từ base64 header hoặc lưu riêng trường `imageType` |
| 12 | **Chống Stored XSS** | ⚠️ **[v2.0 FIX #9]** TẤT CẢ input text (review comment, profile text, address) phải Sanitize ở Backend + Escape ở Frontend |

> ⚠️ **[v2.0 SECURITY FIX #8] Quy Tắc MIME Type Động**
>
> **CẤM** hardcode `data:image/jpeg;base64,...`. Hệ thống phải lưu và trả về chính xác MIME type thực tế:
>
> ```javascript
> // Backend — Khi trả ảnh từ DB về Frontend:
> const getImageDataUri = (base64Data) => {
>   if (!base64Data) return '';
>   // Detect MIME từ magic bytes của base64
>   const signatures = {
>     '/9j/': 'image/jpeg',      // JPEG
>     'iVBORw': 'image/png',     // PNG
>     'UklGR': 'image/webp',     // WebP
>     'R0lGOD': 'image/gif',     // GIF
>   };
>   let mime = 'image/png'; // Default fallback
>   for (const [sig, type] of Object.entries(signatures)) {
>     if (base64Data.startsWith(sig)) { mime = type; break; }
>   }
>   return `data:${mime};base64,${base64Data}`;
> };
>
> // Frontend — CommonUtils.decodeBase64Image() phải dùng logic tương tự
> ```

> ⚠️ **[v2.0 SECURITY FIX #9] Chống Stored XSS — Input Sanitization**
>
> TẤT CẢ dữ liệu đầu vào text từ người dùng phải được xử lý 2 lớp:
>
> **Lớp 1 — Backend (Sanitize trước khi lưu DB):**
> ```javascript
> // Sử dụng hàm sanitizeHtml.js đã có trong dự án (src/utils/sanitizeHtml.js)
> const { sanitizeInput } = require('../utils/sanitizeHtml');
>
> // Áp dụng cho TẤT CẢ fields text trước khi lưu:
> const cleanComment = sanitizeInput(data.comment);     // Review comment
> const cleanAddress = sanitizeInput(data.address);      // Profile address
> const cleanReason  = sanitizeInput(data.reason);       // Booking reason
> const cleanFirstName = sanitizeInput(data.firstName);  // Profile name
> const cleanLastName  = sanitizeInput(data.lastName);
> ```
>
> **Lớp 2 — Frontend (Escape khi hiển thị):**
> - KHÔNG dùng `dangerouslySetInnerHTML` cho bất kỳ dữ liệu user-generated nào
> - React tự escape JSX text content bằng mặc định → ĐỦ AN TOÀN nếu render qua `{variable}`
> - Review comment, address, tên: Luôn render qua `{text}` (JSX auto-escape), KHÔNG qua `dangerouslySetInnerHTML`

---

## 8. Lộ Trình Triển Khai Chi Tiết

### Tổng quan tiểu giai đoạn

```
GĐ 9.1 ─── Database & Backend Auth Foundation ──────── (2 ngày)
GĐ 9.2 ─── Backend Patient APIs ────────────────────── (2 ngày)
GĐ 9.3 ─── Frontend Auth Module ────────────────────── (2 ngày)
GĐ 9.4 ─── Frontend Patient Portal UI ──────────────── (3 ngày)
GĐ 9.5 ─── Refactor Booking Flow ───────────────────── (2 ngày)
GĐ 9.6 ─── Rating System (Full-stack) ──────────────── (2 ngày)
GĐ 9.7 ─── Integration Testing & Polish ────────────── (1 ngày)
```

---

### GĐ 9.1 — Database & Backend Auth Foundation

**Mục tiêu:** Tạo bảng Reviews, bổ sung Auth APIs (register, forgot/reset password), update Login response.

**Files tạo mới:**
- `src/models/review.js` — Sequelize model
- `src/services/authService.js` — register, forgotPassword, resetPassword

**Files sửa:**
- `src/models/index.js` — Thêm Review associations
- `src/middleware/authMiddleware.js` — Thêm `checkPatientRole`, export
- `src/services/userService.js` — Bổ sung Login response (thêm phone, address, gender, image)
- `src/controllers/userController.js` — Thêm handler cho register, forgot/reset password
- `src/routes/web.js` — Thêm auth routes
- `src/services/emailService.js` — Thêm `sendEmailResetPassword()`

**Thứ tự thực hiện:**
1. Tạo `review.js` model → sync DB → verify bảng tạo thành công
2. Cập nhật `index.js` associations
3. Thêm `checkPatientRole` vào `authMiddleware.js`
4. Bổ sung Login response trong `userService.js` (thêm fields + `convertBlobToBase64`)
5. Tạo `authService.js` (register với edge case guest, forgot/reset password)
6. Cập nhật controller + routes
7. Test bằng Postman/curl

**Dependency:** Không phụ thuộc module nào trước đó.

---

### GĐ 9.2 — Backend Patient APIs

**Mục tiêu:** Xây dựng các API cho Patient Portal (Profile, Bookings, Cancel, Reviews).

**Files tạo mới:**
- `src/services/reviewService.js` — submitReview, getDoctorReviews

**Files sửa:**
- `src/services/patientService.js` — Thêm getPatientProfile, editPatientProfile, changePassword, getPatientBookings, cancelBooking
- `src/controllers/patientController.js` — Thêm handlers
- `src/routes/web.js` — Thêm patient routes + review routes

**Thứ tự thực hiện:**
1. Profile APIs (get, edit, change-password)
2. Get Patient Bookings (with includes: doctorData, timeTypeData, statusData, reviewData)
3. Cancel Booking (transaction + slot decrement)
4. Submit Review + Get Doctor Reviews
5. Đưa `POST /api/v1/bookings` qua JWT middleware (chuẩn bị cho GĐ 9.5)
6. Test từng API

**Dependency:** GĐ 9.1 phải hoàn thành (Review model + checkPatientRole).

---

### GĐ 9.3 — Frontend Auth Module

**Mục tiêu:** Xây dựng Register, ForgotPassword, ResetPassword pages + cập nhật Login.

**Files tạo mới:**
- `src/containers/Auth/Register.jsx`
- `src/containers/Auth/ForgotPassword.jsx`
- `src/containers/Auth/ResetPassword.jsx`
- `src/containers/Auth/Auth.scss` (shared styles)

**Files sửa:**
- `src/containers/Auth/Login.jsx` — Thêm links, redirect query param support
- `src/containers/App.jsx` — Thêm routes cho register, forgot/reset password
- `src/services/userService.js` — Thêm API calls: registerPatient, forgotPassword, resetPassword
- `src/utils/constants.js` — Thêm path constants
- `src/redux/slices/userSlice.js` — Thêm `updateUserInfo` reducer
- `src/translations/vi.json`, `en.json` — Thêm auth keys

**Thứ tự thực hiện:**
1. Thêm path constants + i18n keys
2. Thêm `updateUserInfo` reducer vào userSlice
3. Thêm API service functions
4. Build Register.jsx → test đăng ký
5. Build ForgotPassword.jsx → test gửi email
6. Build ResetPassword.jsx → test reset mật khẩu
7. Cập nhật Login.jsx (links + redirect param)
8. Cập nhật App.jsx routes

**Dependency:** GĐ 9.1 (backend auth APIs).

---

### GĐ 9.4 — Frontend Patient Portal UI

**Mục tiêu:** Xây dựng Patient Portal module (Layout, Profile, Appointment History).

**Files tạo mới:**
- `src/containers/PatientPortal/PatientLayout.jsx`
- `src/containers/PatientPortal/PatientLayout.scss`
- `src/containers/PatientPortal/PatientProfile.jsx`
- `src/containers/PatientPortal/PatientProfile.scss`
- `src/containers/PatientPortal/AppointmentHistory.jsx`
- `src/containers/PatientPortal/AppointmentHistory.scss`

**Files sửa:**
- `src/components/Header/Header.jsx` — Avatar dropdown cho R3
- `src/components/Header/Header.scss` — Styles dropdown
- `src/containers/App.jsx` — Thêm patient portal routes
- `src/services/patientService.js` — Thêm API calls
- `src/translations/vi.json`, `en.json` — Thêm portal keys

**Thứ tự thực hiện:**
1. Cập nhật Header (Avatar + dropdown cho R3)
2. Build PatientLayout (sidebar + Outlet)
3. Build PatientProfile (view/edit mode, avatar upload, change password)
4. Build AppointmentHistory (3 tabs, data fetching, cancel confirm modal)
5. Cập nhật App.jsx routes (PrivateRoute cho R3)
6. Test toàn bộ flow

**Dependency:** GĐ 9.2 (backend APIs) + GĐ 9.3 (userSlice updateUserInfo).

---

### GĐ 9.5 — Refactor Booking Flow

**Mục tiêu:** Chuyển đổi BookingModal từ Guest Checkout sang Strict Auth.

**Files sửa:**
- `src/containers/Patient/BookingModal.jsx` — Major refactor
- `src/containers/Patient/DoctorSchedule.jsx` — Auth check trước khi mở modal
- `src/services/patientService.js` — Cập nhật booking API call
- `src/redux/slices/doctorSlice.js` — Cập nhật bookAppointment thunk (nếu cần)

**Backend sửa:**
- `src/services/patientService.js` — postBookAppointment: bỏ findOrCreate, lấy patientId từ JWT
- `src/routes/web.js` — Di chuyển `POST /api/v1/bookings` vào nhóm authenticated

**Thứ tự thực hiện:**
1. Backend: Refactor `postBookAppointment` (loại bỏ findOrCreate)
2. Backend: Di chuyển route qua JWT middleware
3. Frontend: Cập nhật BookingModal (auth check, auto-fill, disable email)
4. Frontend: Cập nhật DoctorSchedule (check login trước khi mở modal)
5. Test full flow: chưa login → redirect → login → quay lại → đặt lịch

**Dependency:** GĐ 9.3 (Login redirect param).

---

### GĐ 9.6 — Rating System (Full-stack)

**Mục tiêu:** Xây dựng RatingModal và DoctorReviewList.

**Files tạo mới:**
- `src/containers/PatientPortal/RatingModal.jsx`
- `src/containers/PatientPortal/RatingModal.scss`
- `src/containers/Patient/DoctorReviewList.jsx`
- `src/containers/Patient/DoctorReviewList.scss`

**Files sửa:**
- `src/containers/PatientPortal/AppointmentHistory.jsx` — Tích hợp RatingModal
- `src/containers/Patient/DoctorDetail.jsx` — Chèn DoctorReviewList
- `src/services/patientService.js` — Thêm submitReview API
- `src/services/doctorService.js` — Thêm getDoctorReviews API

**Thứ tự thực hiện:**
1. Build RatingModal (star selection UI + textarea)
2. Tích hợp vào AppointmentHistory (tab "Đã khám", nút [Đánh giá])
3. Build DoctorReviewList (hiển thị average + danh sách)
4. Chèn vào DoctorDetail.jsx
5. Test: đánh giá → verify hiển thị trên trang bác sĩ

**Dependency:** GĐ 9.2 (Review APIs) + GĐ 9.4 (AppointmentHistory).

---

### GĐ 9.7 — Integration Testing & Polish

**Mục tiêu:** Test end-to-end, fix bugs, polish UX.

**Checklist:**
- [ ] Flow Đăng ký → Đăng nhập → Đặt lịch → Xác nhận email → Khám xong → Đánh giá
- [ ] Flow Guest cũ (email có, password null) → Đăng ký → **bị yêu cầu Quên MK** → Verify email → Đặt MK
- [ ] Flow Quên mật khẩu → Email → Reset → Login lại
- [ ] Flow Hủy lịch (S1, S2) → Kiểm tra slot trả lại
- [ ] IDOR test: Thử cancel booking của người khác
- [ ] Token expired → **Session Hard Reset** → redirect /login
- [ ] Profile update → Header đồng bộ Avatar/Tên
- [ ] i18n: Switch Vi/En → kiểm tra tất cả text
- [ ] Responsive: Test trên mobile/tablet
- [ ] **[v2.0]** Session Hard Reset: Verify `persist:root` đã bị xóa sau logout
- [ ] **[v2.0]** Open Redirect: Thử `/login?redirect=http://evil.com` → phải fallback về `/`
- [ ] **[v2.0]** Reset Password Replay: Dùng link reset 2 lần → lần 2 phải bị từ chối
- [ ] **[v2.0]** Cancel Race Condition: Gửi 2 request cancel đồng thời → slot chỉ trừ 1
- [ ] **[v2.0]** XSS: Nhập `<script>alert(1)</script>` vào review comment → không execute
- [ ] **[v2.0]** MIME Type: Upload ảnh PNG, WebP → kiểm tra hiển thị đúng (không bị ép JPEG)
- [ ] **[v2.0]** Pagination: Tải trang 2 bookings/reviews → verify data đúng
- [ ] **[v3.0]** One-Time Token (DB): Reset password → check bảng Tokens `isUsed = true` → dùng lại link → bị reject
- [ ] **[v3.0]** Strict Session Revoke: Reset password → JWT đăng nhập cũ bị reject (tokenVersion mismatch)
- [ ] **[v3.0]** Verify Race Condition: Click xác nhận email 2 lần đồng thời → slot chỉ tăng 1
- [ ] **[v3.0]** Verify Overflow Guard: currentNumber = maxNumber → verify → bị reject "Khung giờ đã đầy"
- [ ] **[v3.0]** Backward Compat: `BOOKING_GUEST_MODE=true` → guest đặt lịch → nhận deprecation warning
- [ ] **[v3.0]** Strict Mode: `BOOKING_GUEST_MODE=false` → guest đặt lịch → 401 Unauthorized
- [ ] **[v3.0]** Bookings Index: EXPLAIN query `SELECT * FROM Bookings WHERE patientId=? AND statusId=?` → verify dùng index

**Dependency:** Tất cả GĐ 9.1–9.6 hoàn thành.

---

## Phụ Lục: Sơ Đồ Luồng Chính

### A. Luồng Đặt Lịch Mới (Strict Auth)

```
Bệnh nhân (Browser)                Backend                    Database
       │                               │                          │
       │─── Click khung giờ ──────────►│                          │
       │    [Check Redux isLoggedIn]   │                          │
       │    IF false → /login?redirect │                          │
       │    IF true → Mở BookingModal  │                          │
       │                               │                          │
       │─── POST /api/v1/bookings ────►│                          │
       │    (JWT Header)               │── verifyToken ──────────►│
       │                               │── checkPatientRole ─────►│
       │                               │── req.user.id = patientId│
       │                               │── findOne Schedule ─────►│ Check slot
       │                               │── create Booking ───────►│ statusId: S1
       │                               │── sendEmailBooking ─────►│
       │◄── 200 OK ──────────────────│                          │
```

### A.1 [v3.0] Luồng Xác Nhận Lịch Hẹn (Verify — Armor-Plated)

> ⚠️ **[v3.0 FIX #4] Bảo Toàn Slot — Transaction + Row Lock cho Verify Flow**
>
> Luồng Verify (`POST /bookings/verify`) BẮT BUỘC áp dụng thiết kế "bọc thép" tương tự luồng Hủy: Sequelize Transaction + Pessimistic Row Lock (FOR UPDATE) + Guard clause.

```
Bệnh nhân (Email)                  Backend                    Database
       │                               │                          │
       │─── Click link xác nhận ────►│                          │
       │    POST /bookings/verify      │                          │
       │    { token, doctorId }        │                          │
       │                               │── BEGIN TRANSACTION      │
       │                               │── findOne Booking        │
       │                               │   { token, statusId }    │
       │                               │   + LOCK.UPDATE ────────►│ Row Lock
       │                               │── Guard: status === S1?  │
       │                               │   IF ≠ S1 → return      │ Idempotency
       │                               │── status S1 → S2 ──────►│
       │                               │── findOne Schedule       │
       │                               │   + LOCK.UPDATE ────────►│ Row Lock
       │                               │── Guard: curr < max?     │
       │                               │   IF curr >= max → reject│ Overflow Guard
       │                               │   increment slot ────────►│
       │                               │── COMMIT                 │
       │◄── Xác nhận thành công ────│                          │
```

**Code chi tiết:**
```javascript
let postVerifyBookAppointment = async (data) => {
  const t = await db.sequelize.transaction();
  try {
    // 1. Tìm booking với PESSIMISTIC LOCK
    const booking = await db.Booking.findOne({
      where: { token: data.token, doctorId: data.doctorId },
      transaction: t,
      lock: t.LOCK.UPDATE,  // ✅ Row Lock — chặn concurrent verify
    });
    if (!booking) {
      await t.rollback();
      return { errCode: 2, message: 'Booking không tồn tại hoặc token không hợp lệ' };
    }

    // 2. [v3.0] GUARD: Chỉ verify khi status = S1 (Idempotency check)
    if (booking.statusId !== 'S1') {
      await t.rollback();
      // Nếu S2 → đã xác nhận rồi (idempotent OK)
      if (booking.statusId === 'S2') {
        return { errCode: 0, message: 'Lịch hẹn đã được xác nhận trước đó' };
      }
      // Nếu S3/S4 → không thể verify
      return { errCode: 3, message: 'Không thể xác nhận lịch hẹn ở trạng thái này' };
    }

    // 3. Cập nhật trạng thái S1 → S2
    booking.statusId = 'S2';
    await booking.save({ transaction: t });

    // 4. [v3.0] Tăng slot với PESSIMISTIC LOCK + GUARD
    const schedule = await db.Schedule.findOne({
      where: {
        doctorId: booking.doctorId,
        date: booking.date,
        timeType: booking.timeType,
      },
      transaction: t,
      lock: t.LOCK.UPDATE,  // ✅ Row Lock
    });

    if (!schedule) {
      await t.rollback();
      return { errCode: 4, message: 'Không tìm thấy lịch khám' };
    }

    // [v3.0] GUARD: Không vượt quá maxNumber (tránh overflow)
    if (schedule.currentNumber >= schedule.maxNumber) {
      // Rollback: Hoàn tác status về S1 (hoặc reject)
      await t.rollback();
      return { errCode: 5, message: 'Khung giờ đã đầy, không thể xác nhận' };
    }

    await schedule.increment('currentNumber', { by: 1, transaction: t });

    // 5. Commit
    await t.commit();
    return { errCode: 0, message: 'Xác nhận lịch hẹn thành công' };
  } catch (err) {
    await t.rollback();
    throw err;
  }
};
```

**Ràng buộc bảo toàn slot:**
- `status S1` → booking chưa xác nhận → slot CHƯA tăng
- `status S2` → đã xác nhận → slot ĐÃ tăng (idempotent: click lần 2 không tăng thêm)
- `currentNumber < maxNumber` → đảm bảo không vượt quá giới hạn slot

### B. Luồng Hủy Lịch (v2.0 — Race Condition Hardened)

```
Bệnh nhân                          Backend                    Database
       │                               │                          │
       │─── PUT /cancel ──────────────►│                          │
       │    (JWT + bookingId)          │── verifyToken            │
       │                               │── BEGIN TRANSACTION      │
       │                               │── findOne WHERE          │
       │                               │   { id, patientId }      │ IDOR check
       │                               │   + LOCK.UPDATE ────────►│ Row Lock
       │                               │── Idempotency:           │
       │                               │   IF S4 → return OK     │ (no-op)
       │                               │── Check IN(S1,S2)        │
       │                               │── status → S4 ──────────►│
       │                               │── IF old=S2:             │
       │                               │   findOne Schedule       │
       │                               │   + LOCK.UPDATE ────────►│ Row Lock
       │                               │   IF currentNumber > 0:  │
       │                               │     decrement slot ──────►│ Guard
       │                               │── COMMIT                 │
       │◄── 200 OK ──────────────────│                          │
```

---

> **Lưu ý cuối:** Document này là bản thiết kế chi tiết v3.0 (Final Security Hardened). Khi triển khai code, mỗi tiểu giai đoạn nên tạo Pull Request riêng để review và tránh conflict. Thứ tự code BẮT BUỘC: 9.1 → 9.2 → 9.3 → 9.4 → 9.5 → 9.6 → 9.7.
