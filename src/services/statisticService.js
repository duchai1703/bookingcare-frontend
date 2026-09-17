// src/services/statisticService.js
// [Phase 10] FE API calls — dùng custom axios instance
// [v1.4] Tất cả hàm đều nhận `options = {}` để hỗ trợ AbortController signal
import axiosInstance from './axiosConfig';

export const getOverviewStatistics = (from, to, options = {}) => {
  return axiosInstance.get('/api/v1/statistics/overview', {
    params: { from, to },
    signal: options.signal, // ← AbortController signal
  });
};

export const getBookingsByDay = (from, to, options = {}) => {
  return axiosInstance.get('/api/v1/statistics/bookings-by-day', {
    params: { from, to },
    signal: options.signal,
  });
};

export const getBookingsByStatus = (from, to, options = {}) => {
  return axiosInstance.get('/api/v1/statistics/bookings-by-status', {
    params: { from, to },
    signal: options.signal,
  });
};

export const getTopSpecialties = (from, to, limit = 5, options = {}) => {
  return axiosInstance.get('/api/v1/statistics/top-specialties', {
    params: { from, to, limit },
    signal: options.signal,
  });
};

export const getTopDoctors = (from, to, limit = 5, options = {}) => {
  return axiosInstance.get('/api/v1/statistics/top-doctors', {
    params: { from, to, limit },
    signal: options.signal,
  });
};

// ═══════════════════════════════════════════════════════════════════════
// [Phase E] Executive Master Dashboard & Detail Analytics
// ═══════════════════════════════════════════════════════════════════════

export const getExecutiveMaster = (from, to, compareFrom, compareTo, options = {}) => {
  return axiosInstance.get('/api/v1/statistics/executive-master', {
    params: { from, to, compareFrom, compareTo },
    signal: options.signal,
  });
};

export const getBookingAnalytics = (from, to, options = {}) => {
  return axiosInstance.get('/api/v1/statistics/analytics/bookings', {
    params: { from, to },
    signal: options.signal,
  });
};

export const getRevenueAnalytics = (from, to, options = {}) => {
  return axiosInstance.get('/api/v1/statistics/analytics/revenue', {
    params: { from, to },
    signal: options.signal,
  });
};

export const getDoctorCapacityAnalytics = (from, to, options = {}) => {
  return axiosInstance.get('/api/v1/statistics/analytics/doctors', {
    params: { from, to },
    signal: options.signal,
  });
};

export const getPatientAnalytics = (from, to, options = {}) => {
  return axiosInstance.get('/api/v1/statistics/analytics/patients', {
    params: { from, to },
    signal: options.signal,
  });
};

// Aliases for seamless imports across components
export const getBookingAnalyticsDetail = getBookingAnalytics;
export const getRevenueAnalyticsDetail = getRevenueAnalytics;
export const getDoctorCapacityDetail = getDoctorCapacityAnalytics;
export const getPatientAnalyticsDetail = getPatientAnalytics;


