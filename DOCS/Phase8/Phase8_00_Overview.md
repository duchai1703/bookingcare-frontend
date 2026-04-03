# 📋 Phase 8 – Giai đoạn 8: Doctor Dashboard — Tổng quan

> **Phiên bản:** 1.0  
> **Ngày tạo:** 02/04/2026  
> **SRS Sections:** 3.11, 3.12, 3.13 | **REQ:** DR-001 → DR-011  
> **Tác giả:** Trần Đức Hải & Đặng Ngọc Trường Giang

---

## 1. Mục tiêu Giai đoạn 8

Giai đoạn 8 xây dựng **module Bác sĩ (Doctor Dashboard)** — cho phép bác sĩ:

| # | Tính năng | SRS Ref | Priority |
|---|-----------|---------|----------|
| 1 | Xem danh sách bệnh nhân đã xác nhận (S2) theo ngày | REQ-DR-001, 002, 011 | High |
| 2 | Lọc bệnh nhân theo trạng thái (S1/S2/S3/S4/ALL) | REQ-DR-003 | High |
| 3 | Gửi kết quả khám + chuyển trạng thái S2 → S3 | REQ-DR-004, 008, 009, 010 | High |
| 4 | Hủy lịch hẹn S2 → S4 | REQ-DR-004 | High |
| 5 | Xem lịch sử booking của bệnh nhân | REQ-DR-007 | Medium |

---

## 2. Luồng chuyển trạng thái S2 → S3 (Core Flow)

Đây là luồng chính mà Doctor Dashboard xử lý:

```
                         ┌──────────────────────────────────────────────────┐
                         │              DOCTOR DASHBOARD                     │
                         │                                                  │
  ┌─────────────┐        │  ┌──────────┐    ┌───────────────┐              │
  │ Bệnh nhân   │  S1→S2 │  │ Danh sách│    │ RemedyModal   │              │
  │ click email  │───────►│  │ bệnh nhân│───►│ (Gửi kết quả) │              │
  │ xác nhận     │  (auto)│  │ S2       │    │ - Email        │              │
  └─────────────┘        │  └──────────┘    │ - Ảnh đính kèm │              │
                         │       │          └───────┬───────┘              │
                         │       │                  │                       │
                         │       │          ┌───────▼───────┐              │
                         │       │          │  Backend API   │              │
                         │       │          │  POST /remedy  │              │
                         │       │          └───────┬───────┘              │
                         │       │                  │                       │
                         │       │          ┌───────▼───────┐              │
                         │       │          │ 1. Update S2→S3│              │
                         │       │          │ 2. Send Email  │              │
                         │       │          │    (Nodemailer) │              │
                         │       │          └───────────────┘              │
                         │       │                                          │
                         │       │  ┌──────────────┐                       │
                         │       └─►│ Hủy booking   │  S2 → S4             │
                         │          │ PATCH /cancel  │                       │
                         │          └──────────────┘                       │
                         └──────────────────────────────────────────────────┘
```

### Quy tắc State Machine (nhắc lại từ SRS 3.11):

| Từ | Sang | Ai? | Action |
|----|------|-----|--------|
| S2 (Đã xác nhận) | S3 (Đã khám xong) | Bác sĩ | Nhấn "Gửi kết quả" → sendRemedy |
| S2 (Đã xác nhận) | S4 (Đã hủy) | Bác sĩ | Nhấn "Hủy" → cancelBooking |

> ⚠️ **QUAN TRỌNG:** Chỉ booking ở trạng thái **S2** mới được chuyển sang S3/S4. S1, S3, S4 là trạng thái không thể thay đổi từ Doctor Dashboard.

---

## 3. Sơ đồ Data Flow tổng quan

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React.js)                                │
│                                                                          │
│  ┌────────────────┐   ┌──────────────────┐   ┌─────────────────┐       │
│  │  ManagePatient  │   │  RemedyModal      │   │  doctorService  │       │
│  │  .jsx           │──►│  .jsx             │──►│  .js (axios)    │       │
│  │                 │   │                   │   │                 │       │
│  │ State:          │   │ State:            │   │ API calls:      │       │
│  │ - currentDate   │   │ - email           │   │ - getListPatient│       │
│  │ - dataPatient[] │   │ - imageBase64     │   │ - sendRemedy    │       │
│  │ - isOpenModal   │   │ - isSubmitting    │   │ - cancelBooking │       │
│  │ - dataModal     │   │                   │   │                 │       │
│  └────────────────┘   └──────────────────┘   └────────┬────────┘       │
│                                                        │                 │
└────────────────────────────────────────────────────────│─────────────────┘
                                                         │
                                           HTTP (Bearer JWT Token)
                                                         │
┌────────────────────────────────────────────────────────│─────────────────┐
│                        BACKEND (Node.js + Express)     │                 │
│                                                        ▼                 │
│  ┌───────────┐    ┌──────────────┐    ┌──────────────────────┐         │
│  │  web.js    │───►│ authMiddleware│───►│  doctorController    │         │
│  │  (Routes)  │    │ verifyToken   │    │  .js                 │         │
│  │            │    │ checkDoctor   │    │                      │         │
│  └───────────┘    └──────────────┘    └──────────┬───────────┘         │
│                                                   │                     │
│                                          ┌────────▼────────┐           │
│                                          │  doctorService   │           │
│                                          │  .js             │           │
│                                          │                  │           │
│                                          │  Sequelize ORM   │           │
│                                          │  + emailService   │           │
│                                          └────────┬────────┘           │
│                                                   │                     │
│                                          ┌────────▼────────┐           │
│                                          │   MySQL/PgSQL    │           │
│                                          │   Booking table  │           │
│                                          └─────────────────┘           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Danh sách API Endpoints (Phase 8)

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| `GET` | `/api/v1/doctors/:doctorId/patients?date=X&statusId=Y` | Lấy danh sách bệnh nhân (REQ-DR-001, 002, 003) | `verifyToken` + `checkDoctorRole` |
| `POST` | `/api/v1/bookings/:bookingId/remedy` | Gửi kết quả khám, S2→S3 (REQ-DR-008, 009, 010) | `verifyToken` + `checkDoctorRole` |
| `PATCH` | `/api/v1/bookings/:bookingId/cancel` | Hủy lịch hẹn, S2→S4 (REQ-DR-004) | `verifyToken` + `checkDoctorRole` |
| `GET` | `/api/v1/patients/:patientId/bookings` | Lịch sử booking bệnh nhân (REQ-DR-007) | `verifyToken` + `checkDoctorRole` |

> 🔒 **Bảo mật:** Tất cả endpoint đều bọc `verifyToken` + `checkDoctorRole`. `doctorId` luôn lấy từ `req.user.id` (JWT), không bao giờ tin `req.body` hay `req.query` để chặn IDOR/BOLA.

---

## 5. Cấu trúc thư mục mới (Phase 8)

```
bookingcare-frontend/src/
├── containers/
│   └── System/
│       └── Doctor/                          ← [NEW FOLDER]
│           ├── ManagePatient.jsx            ← [NEW] Component chính
│           ├── ManagePatient.scss           ← [NEW] Styling
│           └── RemedyModal.jsx              ← [NEW] Modal gửi kết quả
│
├── components/
│   └── Header/
│       └── MenuData.js                      ← [MODIFY] Đã có sẵn doctorMenu
│
├── containers/
│   └── App.jsx                              ← [MODIFY] Thay placeholder → ManagePatient
│
├── services/
│   └── doctorService.js                     ← [ĐÃ CÓ SẴN] API calls đầy đủ
│
└── translations/
    ├── vi.json                              ← [MODIFY] Thêm keys doctor dashboard
    └── en.json                              ← [MODIFY] Thêm keys doctor dashboard
```

---

## 6. Code hướng dẫn: Cập nhật App.jsx và MenuData.js

### 6.1 Cập nhật `App.jsx` — Thay thế DoctorPlaceholder

**Trước đó (GĐ7)**, App.jsx có placeholder tạm:

```jsx
// ===== Placeholders (GĐ7, GĐ8 sẽ thay thế) =====
const DoctorPlaceholder = () => (
  <div style={{ padding: '60px', textAlign: 'center', color: '#555' }}>
    <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🩺</div>
    <h3>Tính năng đang phát triển</h3>
    <p>Module quản lý bệnh nhân sẽ có ở Giai đoạn 8.</p>
  </div>
);
```

**Phase 8 — thay thế bằng component thật:**

```jsx
// src/containers/App.jsx
// ===== THAY ĐỔI GĐ8 =====

// 1. THÊM IMPORT — Thay thế placeholder
import ManagePatient from './System/Doctor/ManagePatient';

// 2. XÓA toàn bộ block DoctorPlaceholder (dòng 32-38)

// 3. THAY ĐỔI ROUTE — trong phần DOCTOR ROUTES
// TÌM:
<Route path="manage-patient" element={<DoctorPlaceholder />} />
// THAY BẰNG:
<Route path="manage-patient" element={<ManagePatient />} />
```

**Kết quả cuối cùng trong App.jsx (phần Doctor Routes):**

```jsx
{/* ===== DOCTOR ROUTES — Chỉ Doctor R2 (SRS REQ-AU-005) ===== */}
<Route element={<PrivateRoute allowedRoles={[USER_ROLE.DOCTOR]} />}>
  <Route path={path.DOCTOR_DASHBOARD} element={<SystemLayout />}>
    <Route index element={<Navigate to="manage-patient" replace />} />
    {/* ✅ GĐ8: Component thật thay thế placeholder */}
    <Route path="manage-patient" element={<ManagePatient />} />
  </Route>
</Route>
```

### 6.2 Xác nhận `MenuData.js` — Đã có sẵn từ GĐ trước

```javascript
// src/components/Header/MenuData.js
// ĐÃ CÓ SẴN — Không cần chỉnh sửa

// ===== DOCTOR MENU (R2) — 1 item =====
export const doctorMenu = [
  {
    name: 'menu.doctor.manage-patient',   // i18n key → "Quản lý lịch hẹn bệnh nhân"
    link: path.MANAGE_PATIENT,            // → '/doctor-dashboard/manage-patient'
  },
];
```

> ✅ `doctorMenu` đã được khai báo từ GĐ trước. Navigator component đã tự render menu theo role. Không cần thêm code mới.

### 6.3 Xác nhận `constants.js` — Đã có sẵn

```javascript
// src/utils/constants.js — ĐÃ CÓ SẴN

export const path = {
  // ...
  // Doctor (R2)
  DOCTOR_DASHBOARD: '/doctor-dashboard',
  MANAGE_PATIENT: '/doctor-dashboard/manage-patient',
};

export const BOOKING_STATUS = {
  NEW: 'S1',
  CONFIRMED: 'S2',
  DONE: 'S3',
  CANCELLED: 'S4',
};
```

---

## 7. Danh sách Dependencies đã có sẵn

Phase 8 **KHÔNG cần cài thêm package mới**. Tận dụng hoàn toàn các dependency đã có:

| Package | Vai trò trong Phase 8 |
|---------|----------------------|
| `react-datepicker` | DatePicker chọn ngày lọc lịch hẹn |
| `moment` | Xử lý timezone UTC cho date |
| `react-toastify` | Thông báo thành công/lỗi |
| `axios` (via `axiosConfig.js`) | Gọi API có tự động gắn JWT |
| `react-intl` | Đa ngôn ngữ cho toàn bộ label |
| `nodemailer` (backend) | Gửi email kết quả khám |

---

## 8. Checklist tổng quan Phase 8

- [ ] Tạo `ManagePatient.jsx` — UI chính với DatePicker + Table
- [ ] Tạo `ManagePatient.scss` — Styling BEM
- [ ] Tạo `RemedyModal.jsx` — Modal gửi kết quả khám
- [ ] Cập nhật `App.jsx` — Thay placeholder thành component thật
- [ ] Thêm i18n keys vào `vi.json` / `en.json`
- [ ] Backend: Verify tất cả API endpoints đã hoạt động (đã code ở GĐ trước)
- [ ] Test: UTC timezone, 401 expired, IDOR, state leak

---

> **Tiếp theo:** [Phase8_01_ManagePatient_UI.md](./Phase8_01_ManagePatient_UI.md) — Xây dựng giao diện ManagePatient.jsx
