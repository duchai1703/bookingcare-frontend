// src/services/axiosConfig.js
// Axios instance dùng chung cho toàn bộ app — tự gắn JWT token vào mọi request
import axios from 'axios';
import { store } from '../redux/store';
import { processLogout } from '../redux/slices/userSlice';

// Tạo instance với baseURL từ .env
const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 giây timeout
});

// ===== REQUEST INTERCEPTOR =====
// Tự động gắn JWT token vào header Authorization của MỌI request
axiosInstance.interceptors.request.use(
  (config) => {
    // Lấy token từ Redux store
    const state = store.getState();
    const token = state.user?.accessToken;

    // Nếu có token → gắn vào header
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ===== RESPONSE INTERCEPTOR =====
// Xử lý lỗi 401/403 → tự động logout (REQ-AU-006)
axiosInstance.interceptors.response.use(
  // Response thành công → trả data
  (response) => {
    return response.data;  // Trả thẳng response.data (bỏ wrapper axios)
  },
  // Response lỗi
  (error) => {
    const status = error.response?.status;

    if (status === 401 || status === 403) {
      // Token hết hạn hoặc không hợp lệ → auto logout
      console.warn('>>> Token expired or invalid, auto logout...');
      store.dispatch(processLogout());

      // Redirect về trang login
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
