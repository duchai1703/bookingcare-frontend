// src/services/catalogService.js
// [Phase C] API calls cho: MedicalCatalog, Medicine, SystemSettings
import axiosInstance from './axiosConfig';

// ── MedicalCatalog ──────────────────────────────────────
export const getAllMedicalCatalogs = (params = {}) => {
  return axiosInstance.get('/api/v1/medical-catalogs', { params });
};
export const createMedicalCatalog = (data) => {
  return axiosInstance.post('/api/v1/medical-catalogs', data);
};
export const editMedicalCatalog = (id, data) => {
  return axiosInstance.put(`/api/v1/medical-catalogs/${id}`, data);
};
export const deleteMedicalCatalog = (id) => {
  return axiosInstance.delete(`/api/v1/medical-catalogs/${id}`);
};

// ── Medicine ────────────────────────────────────────────
export const getAllMedicines = (params = {}) => {
  return axiosInstance.get('/api/v1/medicines', { params });
};
export const createMedicine = (data) => {
  return axiosInstance.post('/api/v1/medicines', data);
};
export const editMedicine = (id, data) => {
  return axiosInstance.put(`/api/v1/medicines/${id}`, data);
};
export const deleteMedicine = (id) => {
  return axiosInstance.delete(`/api/v1/medicines/${id}`);
};

// ── SystemSettings ──────────────────────────────────────
// Public read — không cần token (bệnh nhân đọc chính sách hoàn tiền)
export const getSystemSettings = () => {
  return axiosInstance.get('/api/v1/system-settings');
};
// Admin write
export const updateSystemSetting = (key, value, description) => {
  return axiosInstance.put(`/api/v1/system-settings/${key}`, { value, description });
};
export const updateBulkSystemSettings = (settings) => {
  return axiosInstance.post('/api/v1/system-settings/bulk', { settings });
};
export const resetSystemSettings = () => {
  return axiosInstance.post('/api/v1/system-settings/reset');
};

