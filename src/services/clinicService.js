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
