// src/services/patientService.js
// [Phase 9.4] API calls cho Patient Portal — Protected bởi JWT Interceptor
import axiosInstance from './axiosConfig';

// ===== PATIENT PROFILE =====

// Lấy thông tin cá nhân bệnh nhân
export const getPatientProfile = () => {
  return axiosInstance.get('/api/v1/patient/profile');
};

// Cập nhật thông tin cá nhân
export const editPatientProfile = (data) => {
  // data = { firstName, lastName, phoneNumber, address, gender, image }
  return axiosInstance.put('/api/v1/patient/profile', data);
};

// Đổi mật khẩu (token sẽ bị revoke sau khi đổi thành công)
export const changePassword = (data) => {
  // data = { currentPassword, newPassword }
  return axiosInstance.put('/api/v1/patient/change-password', data);
};

// ===== PATIENT BOOKINGS =====

// Lấy danh sách lịch hẹn theo status + pagination
export const getPatientBookings = (params) => {
  // params = { status: 'S1,S2', page: 1, limit: 5 }
  return axiosInstance.get('/api/v1/patient/bookings', { params });
};

// Hủy lịch hẹn (S1/S2 → S4)
export const cancelBooking = (bookingId) => {
  return axiosInstance.put(`/api/v1/patient/bookings/${bookingId}/cancel`);
};

// ═══════════════════════════════════════════════════════════════════════
// [Fix Bug 9.5] Bổ sung 2 hàm bị thiếu export — Redux slice đang gọi nhưng chưa export
// ═══════════════════════════════════════════════════════════════════════

// Đặt lịch khám (Protected — JWT required)
export const postBookAppointment = (data) => {
  return axiosInstance.post('/api/v1/bookings', data);
};

// FINAL FIX 9.7 — Đồng bộ URL chuẩn với Backend: /api/v1/verify-book-appointment
export const postVerifyBookAppointment = (data) => {
  return axiosInstance.post('/api/v1/verify-book-appointment', data); // FINAL FIX 9.7
};

// ===== PATIENT ATTACHMENTS (Tài liệu đính kèm y tế) =====

// Lấy danh sách tệp đính kèm của lịch hẹn
export const getBookingAttachments = (bookingId) => {
  return axiosInstance.get(`/api/v1/patient/bookings/${bookingId}/attachments`);
};

// Tải lên tệp đính kèm mới (PDF, PNG, JPG, WEBP)
export const uploadBookingAttachment = (bookingId, data) => {
  return axiosInstance.post(`/api/v1/patient/bookings/${bookingId}/attachments`, data);
};

// Tải về tệp đính kèm an toàn dạng Blob
export const downloadBookingAttachment = (bookingId, attachmentId, mode = 'attachment') => {
  return axiosInstance.get(`/api/v1/patient/bookings/${bookingId}/attachments/${attachmentId}/download?mode=${mode}`, {
    responseType: 'blob',
  });
};

// Xóa tệp đính kèm
export const deleteBookingAttachment = (bookingId, attachmentId) => {
  return axiosInstance.delete(`/api/v1/patient/bookings/${bookingId}/attachments/${attachmentId}`);
};

// ===== PATIENT BANK ACCOUNTS (Tài khoản nhận tiền hoàn) =====

// Lấy danh sách tài khoản ngân hàng của bệnh nhân
export const getPatientBankAccounts = () => {
  return axiosInstance.get('/api/v1/patient/bank-accounts');
};

// Thêm tài khoản ngân hàng mới
export const addPatientBankAccount = (data) => {
  // data = { bankName, accountNumber, accountHolder, isPrimary }
  return axiosInstance.post('/api/v1/patient/bank-accounts', data);
};

// Đặt tài khoản làm chính
export const setPrimaryBankAccount = (id) => {
  return axiosInstance.put(`/api/v1/patient/bank-accounts/${id}/primary`);
};

// Xóa tài khoản ngân hàng
export const deletePatientBankAccount = (id) => {
  return axiosInstance.delete(`/api/v1/patient/bank-accounts/${id}`);
};


