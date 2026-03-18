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
