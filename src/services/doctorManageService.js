// src/services/doctorManageService.js
// Admin Doctor Operations Center, Commission & Settlement API calls
import axiosInstance from './axiosConfig';

export const getAdminDoctorsList = (params = {}, options = {}) => {
  return axiosInstance.get('/api/v1/admin/doctors', {
    params,
    signal: options.signal,
  });
};

export const getAdminDoctorWorkspace = (doctorId, options = {}) => {
  return axiosInstance.get(`/api/v1/admin/doctors/${doctorId}/workspace`, {
    signal: options.signal,
  });
};

export const updateDoctorCommission = (doctorId, data = {}, options = {}) => {
  return axiosInstance.post(`/api/v1/admin/doctors/${doctorId}/commission`, data, {
    signal: options.signal,
  });
};

export const updateDoctorWorkingStatus = (doctorId, data = {}, options = {}) => {
  return axiosInstance.post(`/api/v1/admin/doctors/${doctorId}/status`, data, {
    signal: options.signal,
  });
};

export const createDoctorPayout = (doctorId, data = {}, options = {}) => {
  return axiosInstance.post(`/api/v1/admin/doctors/${doctorId}/payout`, data, {
    signal: options.signal,
  });
};

export const updateDoctorScheduleSlots = (doctorId, data = {}, options = {}) => {
  return axiosInstance.post(`/api/v1/admin/doctors/${doctorId}/schedules`, data, {
    signal: options.signal,
  });
};

export const getDoctorFinancialTerms = (doctorId, options = {}) => {
  return axiosInstance.get(`/api/v1/admin/doctors/${doctorId}/financial-terms`, {
    signal: options.signal,
  });
};

export const setDoctorFinancialTerms = (doctorId, data = {}, options = {}) => {
  return axiosInstance.post(`/api/v1/admin/doctors/${doctorId}/financial-terms`, data, {
    signal: options.signal,
  });
};
