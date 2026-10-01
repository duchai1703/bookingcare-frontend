import axiosInstance from './axiosConfig';

/**
 * Xem trước ảnh hưởng (Impact Preview)
 */
export const previewDoctorCancellation = (data) => {
  return axiosInstance.post('/api/v1/doctor-cancellations/preview', data);
};

/**
 * Thực thi hủy lịch khám & hoàn tiền 100% vào Ví Bệnh nhân
 */
export const executeDoctorCancellation = (data) => {
  return axiosInstance.post('/api/v1/doctor-cancellations/execute', data);
};

/**
 * Tra cứu lịch sử các đợt hủy lịch (Admin & Doctor Console)
 */
export const getDoctorCancellationHistory = (params) => {
  return axiosInstance.get('/api/v1/doctor-cancellations/history', { params });
};

/**
 * Lấy chi tiết 1 đợt hủy lịch kèm danh sách targets
 */
export const getDoctorCancellationDetail = (id) => {
  return axiosInstance.get(`/api/v1/doctor-cancellations/${id}`);
};

/**
 * [PHASE 3] Khôi phục / Mở lại khung giờ khám đã từng bị báo bận (Reopen Slot)
 */
export const reopenDoctorScheduleSlot = (data) => {
  return axiosInstance.post('/api/v1/doctor-cancellations/reopen-schedule', data);
};

/**
 * [PHASE 3] Lấy điểm số độ tin cậy và thống kê chất lượng của bác sĩ
 */
export const getDoctorReliabilityScore = (doctorId, params) => {
  const url = doctorId
    ? `/api/v1/doctor-cancellations/doctor-reliability/${doctorId}`
    : '/api/v1/doctor-cancellations/doctor-reliability';
  return axiosInstance.get(url, { params });
};

/**
 * [PHASE 3] Báo cáo thống kê toàn diện & Quản trị độ tin cậy toàn sàn (Admin)
 */
export const getCancellationAnalytics = (params) => {
  return axiosInstance.get('/api/v1/doctor-cancellations/analytics', { params });
};
