// src/services/doctorOnboardingService.js
// Doctor Self-Onboarding & Verification Center API calls
import axiosInstance from './axiosConfig';

// Bác sĩ nộp hồ sơ đăng ký tự phục vụ
export const submitDoctorOnboarding = (data, options = {}) => {
  return axiosInstance.post('/api/v1/doctor-onboarding/submit', data, {
    signal: options.signal,
  });
};

// Tra cứu trạng thái hồ sơ theo email hoặc id
export const getDoctorOnboardingStatus = (identifier, options = {}) => {
  return axiosInstance.get(`/api/v1/doctor-onboarding/status/${identifier}`, {
    signal: options.signal,
  });
};

// Admin: Lấy danh sách hàng đợi thẩm định hồ sơ (Verification Queue)
export const getAdminVerificationQueue = (params = {}, options = {}) => {
  return axiosInstance.get('/api/v1/admin/doctor-onboarding/queue', {
    params,
    signal: options.signal,
  });
};

// Admin: Lấy chi tiết hồ sơ thẩm định
export const getAdminOnboardingDetail = (id, options = {}) => {
  return axiosInstance.get(`/api/v1/admin/doctor-onboarding/${id}`, {
    signal: options.signal,
  });
};

// Admin: Yêu cầu bổ sung hồ sơ (Request Changes)
export const requestAdminOnboardingChanges = (id, data, options = {}) => {
  return axiosInstance.post(`/api/v1/admin/doctor-onboarding/${id}/request-changes`, data, {
    signal: options.signal,
  });
};

// Admin: Từ chối hồ sơ (Reject)
export const rejectAdminOnboarding = (id, data, options = {}) => {
  return axiosInstance.post(`/api/v1/admin/doctor-onboarding/${id}/reject`, data, {
    signal: options.signal,
  });
};

// Admin: Phê duyệt hồ sơ & Kích hoạt tài khoản Bác sĩ (Approve)
export const approveAdminOnboarding = (id, options = {}) => {
  return axiosInstance.post(`/api/v1/admin/doctor-onboarding/${id}/approve`, {}, {
    signal: options.signal,
  });
};
