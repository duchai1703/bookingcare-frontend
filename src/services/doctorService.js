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

// REQ-PT-009: Lấy lịch khám theo ngày (Patient — chỉ slot còn chỗ)
export const getScheduleByDate = (doctorId, date) => {
  return axiosInstance.get(`/api/v1/doctors/${doctorId}/schedules`, {
    params: { date },
  });
};

// FIX BUG-06: Admin version — includes fully booked slots
export const getScheduleByDateAdmin = (doctorId, date) => {
  return axiosInstance.get(`/api/v1/doctors/${doctorId}/schedules`, {
    params: { date, includeAll: 'true' },
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

// GAP-04 (REQ-AM-021): Chỉnh sửa lịch khám (vd: maxNumber)
export const editSchedule = (data) => {
  // data = { id, maxNumber, ... }
  return axiosInstance.put(`/api/v1/schedules/${data.id}`, data);
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
