// src/services/policyService.js
// Financial Policy Engine API calls
import axiosInstance from './axiosConfig';

export const getAdminPoliciesList = (params = {}, options = {}) => {
  return axiosInstance.get('/api/v1/admin/policies', {
    params,
    signal: options.signal,
  });
};

export const getAdminPolicyDetail = (id, options = {}) => {
  return axiosInstance.get(`/api/v1/admin/policies/${id}`, {
    signal: options.signal,
  });
};

export const createAdminPolicy = (data, options = {}) => {
  return axiosInstance.post('/api/v1/admin/policies', data, {
    signal: options.signal,
  });
};

export const createAdminPolicyVersion = (id, data, options = {}) => {
  return axiosInstance.post(`/api/v1/admin/policies/${id}/new-version`, data, {
    signal: options.signal,
  });
};

export const updateAdminPolicyDraft = (id, data, options = {}) => {
  return axiosInstance.put(`/api/v1/admin/policies/${id}`, data, {
    signal: options.signal,
  });
};

export const seedDefaultAdminPolicies = (options = {}) => {
  return axiosInstance.post('/api/v1/admin/policies/seed-defaults', {}, {
    signal: options.signal,
  });
};
