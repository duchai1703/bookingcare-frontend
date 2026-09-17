// src/services/patientManageService.js
// Admin Patient Management & Refund Processing API calls
import axiosInstance from './axiosConfig';

export const getAdminPatientsList = (params = {}, options = {}) => {
  return axiosInstance.get('/api/v1/admin/patients', {
    params,
    signal: options.signal,
  });
};

export const getAdminPatientWorkspace = (patientId, options = {}) => {
  return axiosInstance.get(`/api/v1/admin/patients/${patientId}/workspace`, {
    signal: options.signal,
  });
};

export const processAdminRefund = (refundData, options = {}) => {
  return axiosInstance.post('/api/v1/admin/patients/refund', refundData, {
    signal: options.signal,
  });
};
