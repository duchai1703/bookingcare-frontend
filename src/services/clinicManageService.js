// src/services/clinicManageService.js
// Admin Clinic Control Center & Facility Operations API calls
import axiosInstance from './axiosConfig';

export const getAdminClinicsList = (params = {}, options = {}) => {
  return axiosInstance.get('/api/v1/admin/clinics-manage', {
    params,
    signal: options.signal,
  });
};

export const getAdminClinicControlCenter = (clinicId, options = {}) => {
  return axiosInstance.get(`/api/v1/admin/clinics-manage/${clinicId}/control-center`, {
    signal: options.signal,
  });
};

export const updateClinicWorkingStatus = (clinicId, data = {}, options = {}) => {
  return axiosInstance.post(`/api/v1/admin/clinics-manage/${clinicId}/status`, data, {
    signal: options.signal,
  });
};

export const updateClinicCommission = (clinicId, data = {}, options = {}) => {
  return axiosInstance.post(`/api/v1/admin/clinics-manage/${clinicId}/commission`, data, {
    signal: options.signal,
  });
};

export const assignDoctorToClinic = (clinicId, data = {}, options = {}) => {
  return axiosInstance.post(`/api/v1/admin/clinics-manage/${clinicId}/assign-doctor`, data, {
    signal: options.signal,
  });
};
