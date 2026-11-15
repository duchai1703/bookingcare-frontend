// src/services/axiosConfig.js
// Axios instance dùng chung cho toàn bộ app — tự gắn JWT token vào mọi request
// [Phase 9.3] Session Hard Reset Protocol trên 401
import axios from 'axios';
import { store, persistor } from '../redux/store';
import { processLogout } from '../redux/slices/userSlice';

// [SRE PRODUCTION FIX] Tự động chọn baseURL phù hợp:
// Khi chạy trên domain production (không phải localhost), dùng relative path "" để Nginx Gateway proxy /api/ thẳng vào backend
const getBaseURL = () => {
  if (typeof window !== 'undefined') {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isLocalhost) {
      return ''; // Relative path: gọi trực tiếp /api/ trên cùng domain đang truy cập
    }
  }
  return import.meta.env.VITE_BACKEND_URL || '';
};

// Tạo instance với baseURL tương thích cả dev và production
const axiosInstance = axios.create({
  baseURL: getBaseURL(),
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
// [Phase 9.3] Session Hard Reset Protocol — Dọn sạch MỌI state khi token bị revoke
axiosInstance.interceptors.response.use(
  // Response thành công → trả data
  (response) => {
    return response.data;  // Trả thẳng response.data (bỏ wrapper axios)
  },
  // Response lỗi
  (error) => {
    const status = error.response?.status;

    if (status === 401) {
      // ✅ [FIX] Phân biệt 401 từ login (sai mật khẩu) vs 401 từ protected route (token expired/revoked)
      // Nếu request URL chứa '/auth/login' → KHÔNG logout, để component xử lý lỗi
      const requestUrl = error.config?.url || '';
      if (!requestUrl.includes('/auth/login')) {
        // ═══════════════════════════════════════════════════════════
        // [Phase 9.3] SESSION HARD RESET PROTOCOL
        // Khi Backend trả 401 (tokenVersion mismatch, token expired, etc.)
        // → Phải dọn sạch TOÀN BỘ state trước khi redirect
        // Thứ tự BẮT BUỘC: Redux → localStorage → persistor → redirect
        // ═══════════════════════════════════════════════════════════

        // 1. Xóa Redux state (isLoggedIn=false, userInfo=null, accessToken=null)
        store.dispatch(processLogout());

        // 2. Xóa persist keys trong localStorage (tránh persist rehydrate lại state cũ)
        localStorage.removeItem('persist:root');
        localStorage.removeItem('persist:user');

        // 3. Purge toàn bộ persistor (đảm bảo không còn sót cache)
        persistor.purge();

        // 4. Hard redirect → Login page
        window.location.href = '/login';
      }
    }
    // 403 = no permission → để component tự xử lý lỗi, không logout

    return Promise.reject(error);
  }
);

export default axiosInstance;
