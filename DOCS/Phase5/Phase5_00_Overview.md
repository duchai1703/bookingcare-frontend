# 📋 GIAI ĐOẠN 5 — TỔNG QUAN XÂY DỰNG FRONTEND CƠ BẢN

> **Thời gian:** 21/03 – 05/04/2026 (16 ngày)  
> **Mục tiêu:** Khởi tạo project React.js, thiết lập kiến trúc, kết nối Backend API, đa ngôn ngữ, xây dựng trang chủ + trang đăng nhập  
> **Backend API:** `http://localhost:8080/api/v1/`  
> **Frontend URL:** `http://localhost:3000`

---

## 📚 Danh Sách Tài Liệu Hướng Dẫn

| #   | File                                                             | Nội dung                                                | Thời gian |
| --- | ---------------------------------------------------------------- | ------------------------------------------------------- | --------- |
| 1   | [Phase5_01_ProjectSetup.md](Phase5_01_ProjectSetup.md)           | Khởi tạo Vite + React, cài dependencies, cấu hình       | Ngày 1    |
| 2   | [Phase5_02_Redux_Store.md](Phase5_02_Redux_Store.md)             | Redux Toolkit + redux-persist, tất cả slices            | Ngày 1-2  |
| 3   | [Phase5_03_Axios_API.md](Phase5_03_Axios_API.md)                 | Axios config, JWT interceptor, tất cả service files     | Ngày 2-3  |
| 4   | [Phase5_04_Routing_i18n.md](Phase5_04_Routing_i18n.md)           | React Router v6, đa ngôn ngữ react-intl, PrivateRoute   | Ngày 3-4  |
| 5   | [Phase5_05_Layout_Components.md](Phase5_05_Layout_Components.md) | Header, Footer, global styles (SCSS), constants         | Ngày 4-5  |
| 6   | [Phase5_06_HomePage.md](Phase5_06_HomePage.md)                   | Trang chủ: Banner, Search, TopDoctor, Specialty, Clinic | Ngày 5-8  |
| 7   | [Phase5_07_Login_Auth.md](Phase5_07_Login_Auth.md)               | Trang đăng nhập, xử lý auth, redirect theo role         | Ngày 8-9  |

---

## 🏗️ Tech Stack (theo SRS + Đề Cương)

| Công nghệ            | Version | Vai trò                            |
| -------------------- | ------- | ---------------------------------- |
| **React.js**         | 18.x    | UI Library (SPA)                   |
| **Vite**             | 6.x     | Build tool (nhanh, HMR tức thời)   |
| **Redux Toolkit**    | latest  | State management toàn cục          |
| **redux-persist**    | latest  | Lưu state vào localStorage         |
| **React Router DOM** | 6.x     | Client-side routing                |
| **Axios**            | latest  | HTTP client gọi API                |
| **react-intl**       | latest  | Đa ngôn ngữ Vi/En (SRS IL-001→007) |
| **Bootstrap 5**      | 5.x     | CSS Framework responsive           |
| **SCSS/Sass**        | latest  | CSS preprocessor                   |
| **react-slick**      | latest  | Carousel/Slider                    |
| **react-markdown**   | latest  | Render markdown bác sĩ             |
| **Sweetalert2**      | latest  | Alert/Confirm dialogs đẹp          |
| **Moment.js**        | latest  | Date formatting                    |
| **Lodash**           | latest  | Utility functions                  |

---

## 📁 Cấu Trúc Thư Mục Hoàn Chỉnh

```
bookingcare-frontend/
├── DOCS/                               ← Tài liệu (đang đọc)
├── public/
│   ├── index.html
│   └── favicon.ico
├── src/
│   ├── assets/                         ← Hình ảnh, logo, icons
│   │   └── images/
│   │       ├── logo.svg
│   │       └── banner-bg.jpg
│   │
│   ├── components/                     ← Components dùng chung (shared)
│   │   ├── Header/
│   │   │   ├── Header.jsx
│   │   │   ├── Header.scss
│   │   │   └── MenuData.js            ← Menu động theo role
│   │   ├── Footer/
│   │   │   ├── Footer.jsx
│   │   │   └── Footer.scss
│   │   ├── Loading/
│   │   │   └── Loading.jsx            ← Spinner khi loading
│   │   └── Navigator/
│   │       ├── Navigator.jsx          ← Sidebar cho Admin/Doctor
│   │       └── Navigator.scss
│   │
│   ├── containers/                     ← Trang (page-level components)
│   │   ├── App.jsx                    ← Root component + tất cả Routes
│   │   ├── App.scss
│   │   │
│   │   ├── Auth/                      ← Trang đăng nhập
│   │   │   ├── Login.jsx
│   │   │   └── Login.scss
│   │   │
│   │   ├── HomePage/                  ← Module Trang chủ (bệnh nhân)
│   │   │   ├── HomePage.jsx
│   │   │   ├── HomePage.scss
│   │   │   └── Sections/
│   │   │       ├── Banner.jsx
│   │   │       ├── Banner.scss
│   │   │       ├── TopDoctor.jsx
│   │   │       ├── TopDoctor.scss
│   │   │       ├── Specialty.jsx
│   │   │       ├── Specialty.scss
│   │   │       ├── MedicalFacility.jsx     ← Phòng khám (Clinic)
│   │   │       └── MedicalFacility.scss
│   │   │
│   │   ├── Patient/                   ← Module Bệnh nhân
│   │   │   ├── Doctor/
│   │   │   │   ├── DoctorDetail.jsx        ← Chi tiết bác sĩ
│   │   │   │   ├── DoctorDetail.scss
│   │   │   │   ├── DoctorSchedule.jsx      ← Lịch khám theo ngày
│   │   │   │   ├── DoctorExtraInfo.jsx     ← Giá, phòng khám, thanh toán
│   │   │   │   └── BookingModal.jsx        ← Modal đặt lịch
│   │   │   ├── Specialty/
│   │   │   │   ├── SpecialtyDetail.jsx     ← DS bác sĩ theo chuyên khoa
│   │   │   │   └── SpecialtyDetail.scss
│   │   │   ├── Clinic/
│   │   │   │   ├── ClinicDetail.jsx        ← DS bác sĩ theo phòng khám
│   │   │   │   └── ClinicDetail.scss
│   │   │   └── VerifyEmail.jsx             ← Xác nhận lịch hẹn qua email
│   │   │
│   │   └── System/                    ← Module Quản trị (Admin + Doctor)
│   │       ├── SystemLayout.jsx       ← Layout chung (Sidebar + Content)
│   │       ├── Admin/                 ← Giai đoạn 6 (06/04 – 16/04)
│   │       │   ├── UserManage.jsx
│   │       │   ├── DoctorManage.jsx
│   │       │   ├── ClinicManage.jsx
│   │       │   ├── SpecialtyManage.jsx
│   │       │   └── ScheduleManage.jsx
│   │       └── Doctor/               ← Giai đoạn 8 (01/05 – 12/05)
│   │           ├── ManagePatient.jsx
│   │           └── RemedyModal.jsx
│   │
│   ├── redux/                         ← Redux store + slices
│   │   ├── store.js
│   │   └── slices/
│   │       ├── appSlice.js            ← language, allcodes
│   │       ├── userSlice.js           ← auth, user info, token
│   │       ├── adminSlice.js          ← admin CRUD state
│   │       └── doctorSlice.js         ← doctor dashboard state
│   │
│   ├── services/                      ← Gọi API backend
│   │   ├── axiosConfig.js             ← Axios instance + JWT interceptor
│   │   ├── userService.js
│   │   ├── doctorService.js
│   │   ├── patientService.js
│   │   ├── specialtyService.js
│   │   └── clinicService.js
│   │
│   ├── translations/                  ← Đa ngôn ngữ
│   │   ├── vi.json                    ← Tiếng Việt
│   │   └── en.json                    ← Tiếng Anh
│   │
│   ├── styles/                        ← Global styles
│   │   ├── _variables.scss            ← Color, font, spacing tokens
│   │   ├── _mixins.scss               ← Responsive mixins
│   │   └── global.scss                ← Reset + global CSS
│   │
│   ├── utils/                         ← Helper functions
│   │   ├── constants.js               ← Role IDs, Status IDs, paths
│   │   └── CommonUtils.js             ← Format date, image base64 helpers
│   │
│   ├── routes/
│   │   └── PrivateRoute.jsx           ← Protected route wrapper
│   │
│   └── main.jsx                       ← Entry point (Vite)
│
├── .env                               ← VITE_BACKEND_URL
├── .gitignore
├── package.json
├── vite.config.js
└── README.md
```

---

## 🔗 Liên Kết Với Giai Đoạn Trước & Sau

| Giai đoạn                    | Thời gian     | Trạng thái        | Liên quan gì đến GĐ5?                                |
| ---------------------------- | ------------- | ----------------- | ---------------------------------------------------- |
| **GĐ 4 — Backend**           | 06/03 – 20/03 | ✅ Hoàn thành     | Frontend kết nối đến 30 API endpoints                |
| **GĐ 5 — Frontend cơ bản**   | 21/03 – 05/04 | 🟡 Đang thực hiện | Project setup, Redux, routing, i18n, HomePage, Login |
| **GĐ 6 — Module Admin FE**   | 06/04 – 16/04 | ⏳ Chưa bắt đầu   | Dựa trên layout + API đã kết nối ở GĐ5               |
| **GĐ 7 — Module Patient FE** | 17/04 – 30/04 | ⏳ Chưa bắt đầu   | Dựa trên HomePage + routing ở GĐ5                    |
| **GĐ 8 — Module Doctor FE**  | 01/05 – 12/05 | ⏳ Chưa bắt đầu   | Dựa trên auth + API ở GĐ5                            |

---

## ⚡ Lưu Ý Quan Trọng Trước Khi Bắt Đầu

1. **Đảm bảo Backend đang chạy** trên `http://localhost:8080` trước khi test frontend
2. **MySQL (XAMPP)** phải đang chạy và đã seed data: `npm run seed`
3. **Node.js version** tối thiểu v18+ (cho Vite 6.x)
4. **npm version** tối thiểu v9+
5. **Đọc từng file doc theo thứ tự** 01 → 02 → 03 → ... → 07, mỗi bước đều phụ thuộc bước trước

---

> 📖 **Bắt đầu:** Mở file [Phase5_01_ProjectSetup.md](Phase5_01_ProjectSetup.md) để tiến hành khởi tạo project.
