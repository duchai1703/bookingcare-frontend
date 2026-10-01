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
