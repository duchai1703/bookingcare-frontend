# 📋 GIAI ĐOẠN 6 — MODULE ADMIN FRONTEND

> **Thời gian:** 06/04 – 16/04/2026 (10 ngày)
> **Mục tiêu:** Xây dựng hoàn chỉnh Dashboard Admin — CRUD Users, Doctors, Specialties, Clinics, Schedules với giao diện BookingCare-style
> **Backend:** Tất cả 14 Admin API đã sẵn sàng tại `http://localhost:8080/api/v1/`
> **Frontend route:** `/system/*` (đã PrivateRoute R1)

---

## 📚 Danh Sách Tài Liệu Hướng Dẫn

| # | File | Nội dung | Thời gian |
|---|------|----------|-----------| 
| 1 | [Phase6_01_SystemLayout.md](Phase6_01_SystemLayout.md) | Sidebar Navigation + Layout chung Admin/Doctor | Ngày 1 |
| 2 | [Phase6_02_UserManage.md](Phase6_02_UserManage.md) | CRUD Users — Bảng danh sách, form tạo/sửa, xóa | Ngày 2-3 |
| 3 | [Phase6_03_DoctorManage.md](Phase6_03_DoctorManage.md) | Doctor profile — Markdown editor, ảnh base64, allcode dropdowns | Ngày 4-6 |
| 4 | [Phase6_04_ClinicManage.md](Phase6_04_ClinicManage.md) | CRUD Clinics — Upload ảnh, Markdown description | Ngày 7 |
| 5 | [Phase6_05_SpecialtyManage.md](Phase6_05_SpecialtyManage.md) | CRUD Specialties — Upload ảnh, Markdown description | Ngày 8 |
| 6 | [Phase6_06_ScheduleManage.md](Phase6_06_ScheduleManage.md) | Quản lý lịch khám bác sĩ — Bulk create 8 khung giờ | Ngày 9-10 |
| 7 | [Phase6_07_SharedComponents.md](Phase6_07_SharedComponents.md) | **Shared Components** — ImageUploadInput, MarkdownEditorField, confirmDelete | Refactor sau GĐ6 |

---

## 🏗️ Kiến Trúc Tổng Quan GĐ6

```
/system/        ← PrivateRoute (chỉ R1 Admin)
    ├── index   → redirect /system/user-manage
    ├── /user-manage       ─── UserManage.jsx
    ├── /doctor-manage     ─── DoctorManage.jsx
    ├── /clinic-manage     ─── ClinicManage.jsx
    ├── /specialty-manage  ─── SpecialtyManage.jsx
    └── /schedule-manage   ─── ScheduleManage.jsx

SystemLayout.jsx (Sidebar + Header + <Outlet/>)
    ├── Navigator.jsx ← Sidebar menu theo role
    └── <Outlet/>     ← Nội dung trang con
```

---

## 🎨 Chuẩn Giao Diện BookingCare Admin

| Element | Màu / Style |
|---------|------------|
| Sidebar nền | `#1a1a2e` (dark navy) |
| Sidebar active | `#45c3d2` (primary teal) |
| Header admin | Trắng + border-bottom nhạt |
| Nút "Thêm mới" | `#45c3d2` (primary) |
| Nút "Sửa" | `#ffc107` (warning yellow) |
| Nút "Xóa" | `#dc3545` (danger red) |
| Bảng danh sách | Bootstrap Table striped, bordered |
| Form | Bootstrap Form Groups, validation |
| Modal | SweetAlert2 (confirm delete) |

---

## 📁 Files Sẽ Tạo Mới Trong GĐ6

```
src/
├── components/
│   ├── Common/                    ← [MỚI GĐ6-B7] Shared components
│   │   ├── ImageUploadInput.jsx   ← Upload ảnh (tròn/chữ nhật) + base64
│   │   ├── ImageUploadInput.scss
│   │   ├── MarkdownEditorField.jsx ← Wrapper MDEditor live preview
│   │   └── MarkdownEditorField.scss
│   └── Navigator/
│       ├── Navigator.jsx          ← [MỚI] Sidebar menu
│       └── Navigator.scss         ← [MỚI] Sidebar styles
├── containers/
│   └── System/
│       ├── SystemLayout.jsx       ← [SỬA] Thêm Sidebar + Header
│       ├── SystemLayout.scss      ← [MỚI] Dashboard layout styles
│       ├── Admin/
│       │   ├── UserManage.jsx + .scss     ← [MỚI]
│       │   ├── DoctorManage.jsx + .scss   ← [MỚI]
│       │   ├── ClinicManage.jsx + .scss   ← [MỚI]
│       │   ├── SpecialtyManage.jsx + .scss ← [MỚI]
│       │   └── ScheduleManage.jsx + .scss  ← [MỚI]
│       └── Doctor/
│           ├── ManagePatient.jsx   ← [placeholder—GĐ8]
│           └── RemedyModal.jsx     ← [placeholder—GĐ8]
└── utils/
    ├── constants.js
    ├── CommonUtils.js
    ├── confirmDelete.js   ← [MỚI GĐ6-B7] SweetAlert2 helpers
└── translations/
    ├── vi.json   ← [SỬA] Thêm 13 keys admin
    └── en.json   ← [SỬA] Thêm 13 keys admin
```

---

## 🔗 API Admin Đã Có Sẵn (Không Cần Sửa Backend)

| # | Endpoint | Service Function | Dùng ở |
|---|---------|-----------------|--------|
| 1 | GET `/api/v1/users` | `getAllUsers('ALL')` | UserManage |
| 2 | POST `/api/v1/users` | `createNewUser(data)` | UserManage |
| 3 | PUT `/api/v1/users/:id` | `editUser(data)` | UserManage |
| 4 | DELETE `/api/v1/users/:id` | `deleteUser(id)` | UserManage |
| 5 | POST `/api/v1/doctors` | `saveInfoDoctor(data)` | DoctorManage |
| 6 | DELETE `/api/v1/doctors/:id` | `deleteDoctorInfo(id)` | DoctorManage |
| 7 | GET `/api/v1/doctors/top` | `getTopDoctors(100)` | DoctorManage |
| 8 | GET `/api/v1/doctors/:id` | `getDoctorDetail(id)` | DoctorManage |
| 9 | POST `/api/v1/specialties` | `createSpecialty(data)` | SpecialtyManage |
| 10 | PUT `/api/v1/specialties/:id` | `editSpecialty(data)` | SpecialtyManage |
| 11 | DELETE `/api/v1/specialties/:id` | `deleteSpecialty(id)` | SpecialtyManage |
| 12 | POST `/api/v1/clinics` | `createClinic(data)` | ClinicManage |
| 13 | PUT `/api/v1/clinics/:id` | `editClinic(data)` | ClinicManage |
| 14 | DELETE `/api/v1/clinics/:id` | `deleteClinic(id)` | ClinicManage |
| 15 | POST `/api/v1/schedules/bulk` | `bulkCreateSchedule(data)` | ScheduleManage |
| 16 | DELETE `/api/v1/schedules/:id` | `deleteSchedule(data)` | ScheduleManage |
| 17 | GET `/api/v1/allcode?type=` | `getAllCode(type)` | Tất cả (dropdown) |

---

## ⚡ Yêu Cầu Trước Khi Bắt Đầu

1. Backend đang chạy: `npm run dev` tại `bookingcare-backend/`
2. MySQL đang chạy (XAMPP) và đã seed: `npm run seed`
3. Frontend đang chạy: `npm run dev` tại `bookingcare-frontend/`
4. Đã đăng nhập bằng `admin@bookingcare.vn` / `123456`
5. GĐ5 hoàn thành — `SystemLayout.jsx` có `<Outlet />`

---

> 📖 **Bắt đầu:** Mở [Phase6_01_SystemLayout.md](Phase6_01_SystemLayout.md)
