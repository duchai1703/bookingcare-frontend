// src/services/familyMemberService.js
import axios from './axiosConfig';

/**
 * Lấy danh sách thành viên gia đình của bệnh nhân
 */
export const getFamilyMembers = () => {
  return axios.get('/api/v1/patient/family-members');
};

/**
 * Lấy chi tiết một thành viên gia đình
 */
export const getFamilyMemberById = (id) => {
  return axios.get(`/api/v1/patient/family-members/${id}`);
};

/**
 * Tạo mới hồ sơ người thân trong sổ y bạ
 * @param {Object} data { fullName, relationship, gender, birthday, phoneNumber, address, medicalHistory, notes }
 */
export const createFamilyMember = (data) => {
  return axios.post('/api/v1/patient/family-members', data);
};

/**
 * Cập nhật thông tin người thân
 * @param {number|string} id
 * @param {Object} data
 */
export const updateFamilyMember = (id, data) => {
  return axios.put(`/api/v1/patient/family-members/${id}`, data);
};

/**
 * Xóa hồ sơ người thân
 * @param {number|string} id
 */
export const deleteFamilyMember = (id) => {
  return axios.delete(`/api/v1/patient/family-members/${id}`);
};
