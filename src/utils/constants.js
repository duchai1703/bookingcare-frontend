// src/utils/constants.js
// Hằng số dùng chung cho toàn bộ app — SRS Section 2

// ===== ROLES — SRS REQ-AU-004 =====
export const USER_ROLE = {
  ADMIN: 'R1',     // Quản trị viên
  DOCTOR: 'R2',    // Bác sĩ
  PATIENT: 'R3',   // Bệnh nhân
};

// ===== BOOKING STATUS — SRS 3.11 State Machine =====
export const BOOKING_STATUS = {
  NEW: 'S1',           // Mới (bệnh nhân vừa đặt)
  CONFIRMED: 'S2',     // Đã xác nhận (click link email)
  DONE: 'S3',          // Đã khám xong
  CANCELLED: 'S4',     // Đã hủy
};

// ===== LANGUAGES — SRS IL-002 =====
export const LANGUAGES = {
  VI: 'vi',
  EN: 'en',
};

// ===== ROUTE PATHS =====
export const path = {
  // Trang công khai
  HOME: '/',
  LOGIN: '/login',
  DOCTOR_DETAIL: '/doctor/:id',
  SPECIALTY_DETAIL: '/specialty/:id',
  CLINIC_DETAIL: '/clinic/:id',
  VERIFY_BOOKING: '/verify-booking',

  // Admin (R1)
  SYSTEM: '/system',
  USER_MANAGE: '/system/user-manage',
  DOCTOR_MANAGE: '/system/doctor-manage',
  SCHEDULE_MANAGE: '/system/schedule-manage',
  SPECIALTY_MANAGE: '/system/specialty-manage',
  CLINIC_MANAGE: '/system/clinic-manage',

  // Doctor (R2)
  DOCTOR_DASHBOARD: '/doctor-dashboard',
  MANAGE_PATIENT: '/doctor-dashboard/manage-patient',
};

// ===== ALLCODE TYPES — SRS Section 4.2 =====
export const ALLCODE_TYPES = {
  ROLE: 'ROLE',
  GENDER: 'GENDER',
  TIME: 'TIME',
  STATUS: 'STATUS',
  POSITION: 'POSITION',
  PRICE: 'PRICE',
  PAYMENT: 'PAYMENT',
  PROVINCE: 'PROVINCE',
};
