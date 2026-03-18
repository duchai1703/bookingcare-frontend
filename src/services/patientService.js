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
