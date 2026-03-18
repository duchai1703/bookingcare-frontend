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
