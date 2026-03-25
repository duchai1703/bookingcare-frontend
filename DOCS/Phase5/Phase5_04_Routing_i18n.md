# 🗺️ BƯỚC 4 — ROUTING (REACT ROUTER V6) + ĐA NGÔN NGỮ (REACT-INTL)

> **Mục tiêu:** Cấu hình tất cả routes, PrivateRoute bảo vệ, và hệ thống đa ngôn ngữ Vi/En  
> **Thời gian:** Ngày 3-4  
> **SRS liên quan:** REQ-AU-005 (menu theo role), REQ-AU-008 (chặn route), IL-001→007 (đa ngôn ngữ)

---

## 4.1 Constants — `src/utils/constants.js`

Tạo file chứa tất cả hằng số dùng chung:

```js
// src/utils/constants.js

// ===== ROLES (SRS REQ-AU-004) =====
export const ROLE = {
  ADMIN: 'R1',
  DOCTOR: 'R2',
  PATIENT: 'R3',
};

// ===== BOOKING STATUS (SRS State Machine) =====
export const STATUS = {
  NEW: 'S1',           // Lịch hẹn mới
  CONFIRMED: 'S2',     // Đã xác nhận (qua email)
  DONE: 'S3',          // Đã khám xong
  CANCELLED: 'S4',     // Đã hủy
};

// ===== LANGUAGES (SRS IL-001) =====
export const LANGUAGE = {
  VI: 'vi',
  EN: 'en',
};

// ===== PATH CONSTANTS =====
export const path = {
  HOME: '/',
  LOGIN: '/login',
  DOCTOR_DETAIL: '/doctor/:id',
  SPECIALTY_DETAIL: '/specialty/:id',
  CLINIC_DETAIL: '/clinic/:id',
  VERIFY_BOOKING: '/verify-booking',

  // System (Admin)
  SYSTEM: '/system',
  USER_MANAGE: '/system/user-manage',
  DOCTOR_MANAGE: '/system/doctor-manage',
  CLINIC_MANAGE: '/system/clinic-manage',
  SPECIALTY_MANAGE: '/system/specialty-manage',
  SCHEDULE_MANAGE: '/system/schedule-manage',

  // Doctor Dashboard
  DOCTOR_DASHBOARD: '/doctor-dashboard',
  MANAGE_PATIENT: '/doctor-dashboard/manage-patient',
};
```

---

## 4.2 Common Utils — `src/utils/CommonUtils.js`

```js
// src/utils/CommonUtils.js
// Helper functions dùng chung

class CommonUtils {

  // Chuyển file thành base64 string (dùng cho upload ảnh)
  static getBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  }

  // Decode base64 image để hiển thị
  static decodeBase64Image(base64String) {
    if (!base64String) return '';
    // Nếu đã có prefix data:image → trả luôn
    if (typeof base64String === 'string' && base64String.startsWith('data:image')) {
      return base64String;
    }
    // Nếu là Buffer/Blob → decode
    try {
      const imageBase64 = Buffer.from(base64String, 'base64').toString('binary');
      return imageBase64;
    } catch (e) {
      return base64String;
    }
  }
}

export default CommonUtils;
```

---

## 4.3 PrivateRoute — `src/routes/PrivateRoute.jsx`

Component bọc các route cần đăng nhập (REQ-AU-008):

```jsx
// src/routes/PrivateRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { path } from '../utils/constants';

/**
 * PrivateRoute — Bảo vệ route cần đăng nhập (REQ-AU-008)
 * 
 * @param {string} allowedRole - Role được phép: 'R1' (Admin) hoặc 'R2' (Doctor)
 * @param {ReactNode} children - Component con (trang được bảo vệ)
 * 
 * Logic:
 * 1. Chưa đăng nhập → redirect /login
 * 2. Đã đăng nhập nhưng sai role → redirect /
 * 3. Đã đăng nhập đúng role → render children
 */
const PrivateRoute = ({ allowedRole, children }) => {
  const { isLoggedIn, userInfo } = useSelector((state) => state.user);

  // Chưa đăng nhập → redirect về Login
  if (!isLoggedIn) {
    return <Navigate to={path.LOGIN} replace />;
  }

  // Đã đăng nhập nhưng không đúng role → redirect về Home
  if (allowedRole && userInfo?.roleId !== allowedRole) {
    return <Navigate to={path.HOME} replace />;
  }

  // Đúng role → render component
  return children;
};

export default PrivateRoute;
```

**Ví dụ sử dụng:**
```jsx
// Chỉ Admin (R1) mới vào được
<Route path="/system/*" element={
  <PrivateRoute allowedRole="R1">
    <SystemLayout />
  </PrivateRoute>
} />

// Chỉ Doctor (R2) mới vào được
<Route path="/doctor-dashboard/*" element={
  <PrivateRoute allowedRole="R2">
    <ManagePatient />
  </PrivateRoute>
} />
```

---

## 4.4 App.jsx — Tất Cả Routes — `src/containers/App.jsx`

```jsx
// src/containers/App.jsx
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { path } from '../utils/constants';
import PrivateRoute from '../routes/PrivateRoute';

// Public pages
import HomePage from './HomePage/HomePage';
import Login from './Auth/Login';
// Các page dưới đây sẽ tạo ở các giai đoạn sau, hiện tại tạo placeholder
import DoctorDetail from './Patient/Doctor/DoctorDetail';
import SpecialtyDetail from './Patient/Specialty/SpecialtyDetail';
import ClinicDetail from './Patient/Clinic/ClinicDetail';
import VerifyEmail from './Patient/VerifyEmail';

// System pages (placeholder cho giai đoạn 6, 8)
import SystemLayout from './System/SystemLayout';

import './App.scss';

const App = () => {
  return (
    <div className="app-container">
      <Routes>
        {/* ===== PUBLIC ROUTES ===== */}
        <Route path={path.HOME} element={<HomePage />} />
        <Route path={path.LOGIN} element={<Login />} />
        <Route path={path.DOCTOR_DETAIL} element={<DoctorDetail />} />
        <Route path={path.SPECIALTY_DETAIL} element={<SpecialtyDetail />} />
        <Route path={path.CLINIC_DETAIL} element={<ClinicDetail />} />
        <Route path={path.VERIFY_BOOKING} element={<VerifyEmail />} />

        {/* ===== ADMIN ROUTES — Chỉ R1 (REQ-AU-004, 008) ===== */}
        <Route
          path="/system/*"
          element={
            <PrivateRoute allowedRole="R1">
              <SystemLayout />
            </PrivateRoute>
          }
        />

        {/* ===== DOCTOR ROUTES — Chỉ R2 (REQ-AU-004, 008) ===== */}
        <Route
          path="/doctor-dashboard/*"
          element={
            <PrivateRoute allowedRole="R2">
              <SystemLayout />
            </PrivateRoute>
          }
        />

        {/* ===== 404 ===== */}
        <Route path="*" element={<div className="not-found"><h2>404 — Trang không tồn tại</h2></div>} />
      </Routes>
    </div>
  );
};

export default App;
```

**Tạo file SCSS cho App:**

```scss
// src/containers/App.scss
.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.not-found {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 60vh;
  font-size: 1.5rem;
  color: $text-light;
}
```

---

## 4.5 Placeholder Pages (Tạm)

Tạo placeholder cho các page chưa làm (sẽ hoàn thiện ở giai đoạn 6, 7, 8):

### `src/containers/Patient/Doctor/DoctorDetail.jsx`
```jsx
import React from 'react';
import { useParams } from 'react-router-dom';
const DoctorDetail = () => {
  const { id } = useParams();
  return <div className="container mt-4"><h2>Chi tiết bác sĩ #{id}</h2><p>Sẽ hoàn thiện ở giai đoạn 7</p></div>;
};
export default DoctorDetail;
```

### `src/containers/Patient/Specialty/SpecialtyDetail.jsx`
```jsx
import React from 'react';
import { useParams } from 'react-router-dom';
const SpecialtyDetail = () => {
  const { id } = useParams();
  return <div className="container mt-4"><h2>Chuyên khoa #{id}</h2><p>Sẽ hoàn thiện ở giai đoạn 7</p></div>;
};
export default SpecialtyDetail;
```

### `src/containers/Patient/Clinic/ClinicDetail.jsx`
```jsx
import React from 'react';
import { useParams } from 'react-router-dom';
const ClinicDetail = () => {
  const { id } = useParams();
  return <div className="container mt-4"><h2>Phòng khám #{id}</h2><p>Sẽ hoàn thiện ở giai đoạn 7</p></div>;
};
export default ClinicDetail;
```

### `src/containers/Patient/VerifyEmail.jsx`
```jsx
import React from 'react';
const VerifyEmail = () => {
  return <div className="container mt-4"><h2>Xác nhận lịch hẹn</h2><p>Sẽ hoàn thiện ở giai đoạn 7</p></div>;
};
export default VerifyEmail;
```

### `src/containers/System/SystemLayout.jsx`
```jsx
import React from 'react';
const SystemLayout = () => {
  return <div className="container mt-4"><h2>System Dashboard</h2><p>Sẽ hoàn thiện ở giai đoạn 6, 8</p></div>;
};
export default SystemLayout;
```

---

## 4.6 Đa Ngôn Ngữ (react-intl)

### 4.6.1 File translation Tiếng Việt — `src/translations/vi.json`

```json
{
  "homeheader.specialty": "Chuyên khoa",
  "homeheader.health-facility": "Cơ sở y tế",
  "homeheader.doctor": "Bác sĩ",
  "homeheader.fee": "Phí khám",
  "homeheader.support": "Hỗ trợ",
  "homeheader.login": "Đăng nhập",
  "homeheader.logout": "Đăng xuất",
  "homeheader.welcome": "Xin chào, ",

  "banner.title1": "NỀN TẢNG Y TẾ",
  "banner.title2": "CHĂM SÓC SỨC KHỎE TOÀN DIỆN",
  "banner.search-placeholder": "Tìm kiếm bác sĩ, chuyên khoa, phòng khám...",

  "homepage.outstanding-doctor": "Bác sĩ nổi bật tuần qua",
  "homepage.specialty-popular": "Chuyên khoa phổ biến",
  "homepage.medical-facility": "Cơ sở y tế nổi bật",
  "homepage.see-more": "Xem thêm",

  "login.title": "Đăng nhập",
  "login.email": "Email",
  "login.password": "Mật khẩu",
  "login.btn-login": "Đăng nhập",
  "login.forgot-password": "Quên mật khẩu?",

  "doctor.schedule": "LỊCH KHÁM",
  "doctor.choose-date": "Chọn ngày",
  "doctor.no-schedule": "Bác sĩ không có lịch khám trong ngày này",
  "doctor.price": "GIÁ KHÁM:",
  "doctor.address": "ĐỊA CHỈ KHÁM",
  "doctor.insurance": "BẢO HIỂM",
  "doctor.see-detail": "Xem chi tiết",
  "doctor.hide-detail": "Ẩn bảng giá",
  "doctor.book": "Đặt lịch",

  "booking.title": "Thông tin đặt lịch khám bệnh",
  "booking.fullName": "Họ và tên",
  "booking.phoneNumber": "Số điện thoại",
  "booking.email": "Email",
  "booking.address": "Địa chỉ",
  "booking.reason": "Lý do khám",
  "booking.birthday": "Ngày sinh",
  "booking.gender": "Giới tính",
  "booking.confirm": "Xác nhận đặt lịch",
  "booking.cancel": "Hủy",

  "patient.verify.success": "Xác nhận lịch hẹn thành công!",
  "patient.verify.fail": "Lịch hẹn không tồn tại hoặc đã được xác nhận!",

  "menu.admin.user": "Quản lý người dùng",
  "menu.admin.doctor": "Quản lý bác sĩ",
  "menu.admin.clinic": "Quản lý phòng khám",
  "menu.admin.specialty": "Quản lý chuyên khoa",
  "menu.admin.schedule": "Quản lý lịch khám",

  "menu.doctor.manage-patient": "Quản lý bệnh nhân",

  "common.close": "Đóng",
  "common.save": "Lưu",
  "common.add": "Thêm",
  "common.edit": "Sửa",
  "common.delete": "Xóa",
  "common.confirm": "Xác nhận",
  "common.cancel": "Hủy",
  "common.loading": "Đang tải..."
}
```

### 4.6.2 File translation Tiếng Anh — `src/translations/en.json`

```json
{
  "homeheader.specialty": "Specialty",
  "homeheader.health-facility": "Health Facility",
  "homeheader.doctor": "Doctor",
  "homeheader.fee": "Examination Fee",
  "homeheader.support": "Support",
  "homeheader.login": "Login",
  "homeheader.logout": "Logout",
  "homeheader.welcome": "Welcome, ",

  "banner.title1": "MEDICAL PLATFORM",
  "banner.title2": "COMPREHENSIVE HEALTHCARE",
  "banner.search-placeholder": "Search for doctors, specialties, clinics...",

  "homepage.outstanding-doctor": "Outstanding Doctor of the Week",
  "homepage.specialty-popular": "Popular Specialties",
  "homepage.medical-facility": "Outstanding Medical Facilities",
  "homepage.see-more": "See More",

  "login.title": "Login",
  "login.email": "Email",
  "login.password": "Password",
  "login.btn-login": "Login",
  "login.forgot-password": "Forgot password?",

  "doctor.schedule": "SCHEDULE",
  "doctor.choose-date": "Choose date",
  "doctor.no-schedule": "No schedule available for this date",
  "doctor.price": "PRICE:",
  "doctor.address": "CLINIC ADDRESS",
  "doctor.insurance": "INSURANCE",
  "doctor.see-detail": "See details",
  "doctor.hide-detail": "Hide price",
  "doctor.book": "Book",

  "booking.title": "Booking Information",
  "booking.fullName": "Full Name",
  "booking.phoneNumber": "Phone Number",
  "booking.email": "Email",
  "booking.address": "Address",
  "booking.reason": "Reason for visit",
  "booking.birthday": "Date of Birth",
  "booking.gender": "Gender",
  "booking.confirm": "Confirm Booking",
  "booking.cancel": "Cancel",

  "patient.verify.success": "Appointment confirmed successfully!",
  "patient.verify.fail": "Appointment not found or already confirmed!",

  "menu.admin.user": "User Management",
  "menu.admin.doctor": "Doctor Management",
  "menu.admin.clinic": "Clinic Management",
  "menu.admin.specialty": "Specialty Management",
  "menu.admin.schedule": "Schedule Management",

  "menu.doctor.manage-patient": "Manage Patients",

  "common.close": "Close",
  "common.save": "Save",
  "common.add": "Add",
  "common.edit": "Edit",
  "common.delete": "Delete",
  "common.confirm": "Confirm",
  "common.cancel": "Cancel",
  "common.loading": "Loading..."
}
```

### 4.6.3 IntlProviderWrapper — `src/containers/IntlProviderWrapper.jsx`

Thay nội dung placeholder đã tạo ở Bước 1:

```jsx
// src/containers/IntlProviderWrapper.jsx
// Đọc language từ Redux → chọn file translation → bọc IntlProvider
import React from 'react';
import { IntlProvider } from 'react-intl';
import { useSelector } from 'react-redux';
import { LANGUAGE } from '../utils/constants';

// Import translation files
import messagesVi from '../translations/vi.json';
import messagesEn from '../translations/en.json';

// Map language code → messages
const messages = {
  [LANGUAGE.VI]: messagesVi,
  [LANGUAGE.EN]: messagesEn,
};

const IntlProviderWrapper = ({ children }) => {
  // Đọc ngôn ngữ hiện tại từ Redux store
  const language = useSelector((state) => state.app.language);

  return (
    <IntlProvider
      locale={language}
      messages={messages[language]}
      defaultLocale={LANGUAGE.VI}  // Fallback mặc định tiếng Việt (IL-006)
    >
      {children}
    </IntlProvider>
  );
};

export default IntlProviderWrapper;
```

### 4.6.4 Cách Sử Dụng Trong Component

```jsx
import { FormattedMessage } from 'react-intl';

// Cách 1: Render text
<h1><FormattedMessage id="banner.title1" /></h1>
// Vi → "NỀN TẢNG Y TẾ"
// En → "MEDICAL PLATFORM"

// Cách 2: Dùng làm placeholder (useIntl hook)
import { useIntl } from 'react-intl';

const MyComponent = () => {
  const intl = useIntl();
  return (
    <input 
      placeholder={intl.formatMessage({ id: 'banner.search-placeholder' })}
    />
  );
};

// Cách 3: Chuyển đổi ngôn ngữ
import { useDispatch } from 'react-redux';
import { changeLanguage } from '../redux/slices/appSlice';
import { LANGUAGE } from '../utils/constants';

const dispatch = useDispatch();
// Khi user click nút "EN"
dispatch(changeLanguage(LANGUAGE.EN));
```

---

## ✅ Checklist Bước 4

- [ ] `src/utils/constants.js` — ROLE, STATUS, LANGUAGE, path
- [ ] `src/utils/CommonUtils.js` — getBase64, decodeBase64Image
- [ ] `src/routes/PrivateRoute.jsx` — Check login + role → redirect
- [ ] `src/containers/App.jsx` — Tất cả routes (public + protected)
- [ ] `src/containers/App.scss` — Style cơ bản
- [ ] 5 placeholder pages tạm cho giai đoạn sau
- [ ] `src/translations/vi.json` — ~60 translation keys tiếng Việt
- [ ] `src/translations/en.json` — ~60 translation keys tiếng Anh
- [ ] `src/containers/IntlProviderWrapper.jsx` — Chọn messages theo Redux language
- [ ] Chuyển đổi ngôn ngữ hoạt động (không cần reload trang — IL-002)

---

> 📖 **Tiếp theo:** Mở file [Phase5_05_Layout_Components.md](Phase5_05_Layout_Components.md) để xây dựng Header, Footer và global styles.
