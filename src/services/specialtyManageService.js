// src/services/specialtyManageService.js
// Admin Specialty Intelligence & Operations API calls
import axiosInstance from './axiosConfig';

export const getAdminSpecialtiesList = (params = {}, options = {}) => {
  return axiosInstance.get('/api/v1/admin/specialties-manage', {
    params,
    signal: options.signal,
  });
};

export const getAdminSpecialtyWorkspace = (specialtyId, options = {}) => {
  return axiosInstance.get(`/api/v1/admin/specialties-manage/${specialtyId}/workspace`, {
    signal: options.signal,
  });
};

export const updateSpecialtyWorkingStatus = (specialtyId, data = {}, options = {}) => {
  return axiosInstance.post(`/api/v1/admin/specialties-manage/${specialtyId}/status`, data, {
    signal: options.signal,
  });
};
