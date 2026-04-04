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
// Xử lý lỗi 401 TokenExpired → tự động logout (REQ-AU-006)
axiosInstance.interceptors.response.use(
  // Response thành công → trả data
  (response) => {
    return response.data;  // Trả thẳng response.data (bỏ wrapper axios)
  },
  // Response lỗi
  (error) => {
    const status = error.response?.status;

    if (status === 401) {
      // ✅ [FIX] Phân biệt 401 từ login (sai mật khẩu) vs 401 từ protected route (token expired)
      // Nếu request URL chứa '/auth/login' → KHÔNG logout, để component xử lý lỗi
      const requestUrl = error.config?.url || '';
      if (!requestUrl.includes('/auth/login')) {
        // DS-02 FIX: chỉ logout khi token expired (401 từ protected route)
        console.warn('>>> Token expired, auto logout...');
        store.dispatch(processLogout());
        window.location.href = '/login';
      }
    }
    // 403 = no permission → để component tự xử lý lỗi, không logout

    return Promise.reject(error);
  }
);

export default axiosInstance;
