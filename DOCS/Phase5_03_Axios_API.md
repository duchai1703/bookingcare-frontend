# 🔌 BƯỚC 3 — CẤU HÌNH AXIOS + JWT INTERCEPTOR + TẤT CẢ API SERVICES

> **Mục tiêu:** Tạo Axios instance có JWT auto-attach, auto-logout khi token hết hạn, và tất cả API service files kết nối 30 endpoints backend  
> **Thời gian:** Ngày 2-3  
> **SRS liên quan:** REQ-AU-003 (JWT), REQ-AU-006 (auto logout), REQ-AU-008 (chặn route)

---

## 3.1 Axios Instance + JWT Interceptor — `src/services/axiosConfig.js`

```js
// src/services/axiosConfig.js
// Axios instance dùng chung cho toàn bộ app — tự gắn JWT token vào mọi request
import axios from 'axios';
import { store } from '../redux/store';
import { processLogout } from '../redux/slices/userSlice';

// Tạo instance với baseURL từ .env
const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 giây timeout
});

// ===== REQUEST INTERCEPTOR =====
// Tự động gắn JWT token vào header Authorization của MỌI request
axiosInstance.interceptors.request.use(
  (config) => {
    // Lấy token từ Redux store
    const state = store.getState();
    const token = state.user?.accessToken;

    // Nếu có token → gắn vào header
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ===== RESPONSE INTERCEPTOR =====
// Xử lý lỗi 401/403 → tự động logout (REQ-AU-006)
axiosInstance.interceptors.response.use(
  // Response thành công → trả data
  (response) => {
    return response.data;  // Trả thẳng response.data (bỏ wrapper axios)
  },
  // Response lỗi
  (error) => {
    const status = error.response?.status;

    if (status === 401 || status === 403) {
      // Token hết hạn hoặc không hợp lệ → auto logout
      console.warn('>>> Token expired or invalid, auto logout...');
      store.dispatch(processLogout());

      // Redirect về trang login
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
```

**Giải thích flow:**

```
Component gọi API
       │
       ▼
  axiosInstance.get('/api/v1/...')
       │
  REQUEST INTERCEPTOR
  ┌─── Đọc Redux state.user.accessToken
  ├─── Gắn vào headers.Authorization = "Bearer abc123..."
  └─── Gửi request đến Backend
       │
  Backend xử lý
       │
  RESPONSE INTERCEPTOR
  ┌─── 200 OK → return response.data (bỏ wrapper)
  ├─── 401/403 → dispatch(processLogout()) + redirect /login
  └─── Lỗi khác → reject promise (component tự xử lý)
```

> 💡 **Quan trọng:** Dòng `return response.data` giúp tất cả service functions nhận được thẳng `{errCode, message, data}` thay vì phải `.data.data`.

---

## 3.2 User Service — `src/services/userService.js`

```js
// src/services/userService.js
// API calls cho: Auth, User CRUD, Allcode, Search
import axiosInstance from './axiosConfig';

// ===== AUTHENTICATION (SRS 3.1) =====

// REQ-AU-001: Đăng nhập email + password
export const handleLoginApi = (email, password) => {
  return axiosInstance.post('/api/v1/auth/login', { email, password });
};

// ===== USER CRUD — Chỉ Admin gọi (SRS 3.2) =====

// REQ-AM-001: Lấy danh sách users
// id = 'ALL' → tất cả users, hoặc id cụ thể → 1 user
export const getAllUsers = (id) => {
  return axiosInstance.get('/api/v1/users', { params: { id } });
};

// REQ-AM-002: Tạo user mới
export const createNewUser = (data) => {
  // data = {email, password, firstName, lastName, address, phoneNumber, gender, roleId, image}
  return axiosInstance.post('/api/v1/users', data);
};

// REQ-AM-003: Sửa user
export const editUser = (data) => {
  // data = {id, firstName, lastName, address, phoneNumber, gender, roleId, image}
  return axiosInstance.put(`/api/v1/users/${data.id}`, data);
};

// REQ-AM-004: Xóa user
export const deleteUser = (id) => {
  return axiosInstance.delete(`/api/v1/users/${id}`, { data: { id } });
};

// ===== ALLCODE (SRS Section 4.2) =====

// Lấy allcode theo type: ROLE, GENDER, TIME, STATUS, POSITION, PRICE, PAYMENT, PROVINCE
export const getAllCode = (type) => {
  return axiosInstance.get('/api/v1/allcode', { params: { type } });
};

// ===== SEARCH (SRS REQ-PT-002) =====

// Tìm kiếm bác sĩ/chuyên khoa/phòng khám
export const searchApi = (keyword) => {
  return axiosInstance.get('/api/v1/search', { params: { keyword } });
};
```

---

## 3.3 Doctor Service — `src/services/doctorService.js`

```js
// src/services/doctorService.js
// API calls cho: Doctor info, Schedule, Patient list, Remedy, Cancel  
import axiosInstance from './axiosConfig';

// ===== PUBLIC — Bệnh nhân xem (SRS 3.7, 3.8) =====

// REQ-PT-003: Lấy top bác sĩ nổi bật
export const getTopDoctors = (limit = 10) => {
  return axiosInstance.get('/api/v1/doctors/top', { params: { limit } });
};

// REQ-PT-007→011: Lấy chi tiết bác sĩ
export const getDoctorDetail = (id) => {
  return axiosInstance.get(`/api/v1/doctors/${id}`);
};

// REQ-PT-009: Lấy lịch khám theo ngày
export const getScheduleByDate = (doctorId, date) => {
  return axiosInstance.get(`/api/v1/doctors/${doctorId}/schedules`, {
    params: { date },
  });
};

// ===== ADMIN — Quản lý bác sĩ (SRS 3.3) =====

// REQ-AM-006, 007, 009, 022: Tạo/Cập nhật hồ sơ bác sĩ
export const saveInfoDoctor = (data) => {
  // data = {doctorId, contentHTML, contentMarkdown, description,
  //         specialtyId, clinicId, priceId, provinceId, paymentId, note}
  return axiosInstance.post('/api/v1/doctors', data);
};

// REQ-AM-010: Xóa hồ sơ bác sĩ
export const deleteDoctorInfo = (doctorId) => {
  return axiosInstance.delete(`/api/v1/doctors/${doctorId}`);
};

// ===== ADMIN — Quản lý lịch khám (SRS 3.6) =====

// REQ-AM-018: Tạo lịch bulk
export const bulkCreateSchedule = (data) => {
  // data = {arrSchedule: [{doctorId, date, timeType, maxNumber}]}
  return axiosInstance.post('/api/v1/schedules/bulk', data);
};

// REQ-AM-021: Xóa lịch khám
export const deleteSchedule = (data) => {
  return axiosInstance.delete(`/api/v1/schedules/${data.id || 0}`, { data });
};

// ===== DOCTOR — Dashboard (SRS 3.11, 3.12, 3.13) =====

// REQ-DR-001, 002, 003: Lấy danh sách bệnh nhân
export const getListPatientForDoctor = (doctorId, date, statusId) => {
  return axiosInstance.get(`/api/v1/doctors/${doctorId}/patients`, {
    params: { date, statusId },
  });
};

// REQ-DR-008, 009, 010: Gửi kết quả khám (S2 → S3)
export const sendRemedy = (bookingId, data) => {
  // data = {email, doctorId, patientId, imageBase64, doctorName, language}
  return axiosInstance.post(`/api/v1/bookings/${bookingId}/remedy`, data);
};

// REQ-DR-004: Hủy lịch hẹn (S2 → S4)
export const cancelBooking = (bookingId, data) => {
  return axiosInstance.patch(`/api/v1/bookings/${bookingId}/cancel`, data);
};

// REQ-DR-007: Lịch sử booking của bệnh nhân
export const getPatientBookingHistory = (patientId) => {
  return axiosInstance.get(`/api/v1/patients/${patientId}/bookings`);
};
```

---

## 3.4 Patient Service — `src/services/patientService.js`

```js
// src/services/patientService.js
// API calls cho: Đặt lịch khám, Xác nhận email
import axiosInstance from './axiosConfig';

// ===== BOOKING (SRS 3.9) =====

// REQ-PT-013→023: Đặt lịch khám bệnh
export const postBookAppointment = (data) => {
  // data = {fullName, email, phoneNumber, address, reason, date,
  //         birthday, doctorId, timeType, gender, language,
  //         doctorName, timeString, dateString}
  return axiosInstance.post('/api/v1/bookings', data);
};

// ===== EMAIL VERIFICATION (SRS 3.10) =====

// REQ-PT-019, 020: Xác nhận lịch hẹn qua link email
export const postVerifyBookAppointment = (data) => {
  // data = {token, doctorId}
  return axiosInstance.post('/api/v1/bookings/verify', data);
};
```

---

## 3.5 Specialty Service — `src/services/specialtyService.js`

```js
// src/services/specialtyService.js
import axiosInstance from './axiosConfig';

// ===== PUBLIC =====

// REQ-PT-005: Lấy tất cả chuyên khoa
export const getAllSpecialty = () => {
  return axiosInstance.get('/api/v1/specialties');
};

// REQ-PT-006: Lấy chi tiết chuyên khoa + danh sách bác sĩ
export const getDetailSpecialtyById = (id, location = 'ALL') => {
  return axiosInstance.get(`/api/v1/specialties/${id}`, {
    params: { location },
  });
};

// ===== ADMIN (SRS 3.5) =====

// REQ-AM-015: Tạo chuyên khoa
export const createSpecialty = (data) => {
  return axiosInstance.post('/api/v1/specialties', data);
};

// REQ-AM-016: Sửa chuyên khoa
export const editSpecialty = (data) => {
  return axiosInstance.put(`/api/v1/specialties/${data.id}`, data);
};

// REQ-AM-017: Xóa chuyên khoa
export const deleteSpecialty = (id) => {
  return axiosInstance.delete(`/api/v1/specialties/${id}`);
};
```

---

## 3.6 Clinic Service — `src/services/clinicService.js`

```js
// src/services/clinicService.js
import axiosInstance from './axiosConfig';

// ===== PUBLIC =====

// REQ-PT-004: Lấy tất cả phòng khám
export const getAllClinic = () => {
  return axiosInstance.get('/api/v1/clinics');
};

// REQ-PT-006: Lấy chi tiết phòng khám + danh sách bác sĩ
export const getDetailClinicById = (id) => {
  return axiosInstance.get(`/api/v1/clinics/${id}`);
};

// ===== ADMIN (SRS 3.4) =====

// REQ-AM-011: Tạo phòng khám
export const createClinic = (data) => {
  return axiosInstance.post('/api/v1/clinics', data);
};

// REQ-AM-012: Sửa phòng khám
export const editClinic = (data) => {
  return axiosInstance.put(`/api/v1/clinics/${data.id}`, data);
};

// REQ-AM-013: Xóa phòng khám
export const deleteClinic = (id) => {
  return axiosInstance.delete(`/api/v1/clinics/${id}`);
};
```

---

## 3.7 Bảng Mapping API Đầy Đủ

| # | Method | Backend Endpoint | Frontend Function | File | Auth |
|---|--------|-----------------|-------------------|------|------|
| 1 | POST | `/api/v1/auth/login` | `handleLoginApi()` | userService | No |
| 2 | GET | `/api/v1/users` | `getAllUsers()` | userService | Admin |
| 3 | POST | `/api/v1/users` | `createNewUser()` | userService | Admin |
| 4 | PUT | `/api/v1/users/:id` | `editUser()` | userService | Admin |
| 5 | DELETE | `/api/v1/users/:id` | `deleteUser()` | userService | Admin |
| 6 | GET | `/api/v1/allcode` | `getAllCode()` | userService | No |
| 7 | GET | `/api/v1/search` | `searchApi()` | userService | No |
| 8 | GET | `/api/v1/doctors/top` | `getTopDoctors()` | doctorService | No |
| 9 | GET | `/api/v1/doctors/:id` | `getDoctorDetail()` | doctorService | No |
| 10 | POST | `/api/v1/doctors` | `saveInfoDoctor()` | doctorService | Admin |
| 11 | DELETE | `/api/v1/doctors/:id` | `deleteDoctorInfo()` | doctorService | Admin |
| 12 | GET | `/api/v1/doctors/:id/schedules` | `getScheduleByDate()` | doctorService | No |
| 13 | POST | `/api/v1/schedules/bulk` | `bulkCreateSchedule()` | doctorService | Admin |
| 14 | DELETE | `/api/v1/schedules/:id` | `deleteSchedule()` | doctorService | Admin |
| 15 | GET | `/api/v1/specialties` | `getAllSpecialty()` | specialtyService | No |
| 16 | GET | `/api/v1/specialties/:id` | `getDetailSpecialtyById()` | specialtyService | No |
| 17 | POST | `/api/v1/specialties` | `createSpecialty()` | specialtyService | Admin |
| 18 | PUT | `/api/v1/specialties/:id` | `editSpecialty()` | specialtyService | Admin |
| 19 | DELETE | `/api/v1/specialties/:id` | `deleteSpecialty()` | specialtyService | Admin |
| 20 | GET | `/api/v1/clinics` | `getAllClinic()` | clinicService | No |
| 21 | GET | `/api/v1/clinics/:id` | `getDetailClinicById()` | clinicService | No |
| 22 | POST | `/api/v1/clinics` | `createClinic()` | clinicService | Admin |
| 23 | PUT | `/api/v1/clinics/:id` | `editClinic()` | clinicService | Admin |
| 24 | DELETE | `/api/v1/clinics/:id` | `deleteClinic()` | clinicService | Admin |
| 25 | POST | `/api/v1/bookings` | `postBookAppointment()` | patientService | No |
| 26 | POST | `/api/v1/bookings/verify` | `postVerifyBookAppointment()` | patientService | No |
| 27 | GET | `/api/v1/doctors/:id/patients` | `getListPatientForDoctor()` | doctorService | Doctor |
| 28 | POST | `/api/v1/bookings/:id/remedy` | `sendRemedy()` | doctorService | Doctor |
| 29 | PATCH | `/api/v1/bookings/:id/cancel` | `cancelBooking()` | doctorService | Doctor |
| 30 | GET | `/api/v1/patients/:id/bookings` | `getPatientBookingHistory()` | doctorService | Doctor |

---

## ✅ Checklist Bước 3

- [ ] `src/services/axiosConfig.js` — Axios instance + JWT interceptor
- [ ] `src/services/userService.js` — 7 functions (login, CRUD, allcode, search)
- [ ] `src/services/doctorService.js` — 11 functions
- [ ] `src/services/patientService.js` — 2 functions (book, verify) 
- [ ] `src/services/specialtyService.js` — 5 functions
- [ ] `src/services/clinicService.js` — 5 functions
- [ ] Tổng: **30 API functions** khớp **30 backend endpoints**

---

> 📖 **Tiếp theo:** Mở file [Phase5_04_Routing_i18n.md](Phase5_04_Routing_i18n.md) để cấu hình routing và đa ngôn ngữ.
