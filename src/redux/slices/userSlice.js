// src/redux/slices/userSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { handleLoginApi } from '../../services/userService';

// ===== ASYNC THUNKS =====

// Đăng nhập — SRS REQ-AU-001
export const loginUser = createAsyncThunk(
  'user/loginUser',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const res = await handleLoginApi(email, password);
      if (res && res.errCode === 0) {
        // Trả về user + token
        return {
          user: res.user,           // {id, email, roleId, firstName, lastName}
          accessToken: res.accessToken,
        };
      }
      // Login thất bại → trả message lỗi (REQ-AU-007)
      return rejectWithValue(res.message || 'Đăng nhập thất bại!');
    } catch (err) {
      return rejectWithValue(err.message || 'Lỗi kết nối server!');
    }
  }
);

// ===== SLICE =====
const userSlice = createSlice({
  name: 'user',

  initialState: {
    isLoggedIn: false,      // true nếu đã login
    userInfo: null,         // {id, email, roleId, firstName, lastName} — REQ-AU-009
    accessToken: null,      // JWT token — REQ-AU-003
    loginError: null,       // Message lỗi khi login thất bại
  },

  reducers: {
    // Đăng xuất — xóa hết state
    processLogout: (state) => {
      state.isLoggedIn = false;
      state.userInfo = null;
      state.accessToken = null;
      state.loginError = null;
    },

    // Xóa lỗi login (khi user bắt đầu gõ lại)
    clearLoginError: (state) => {
      state.loginError = null;
    },
  },

  extraReducers: (builder) => {
    builder
      // Login pending
      .addCase(loginUser.pending, (state) => {
        state.loginError = null;
      })
      // Login thành công
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoggedIn = true;
        state.userInfo = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.loginError = null;
      })
      // Login thất bại — REQ-AU-007
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoggedIn = false;
        state.userInfo = null;
        state.accessToken = null;
        state.loginError = action.payload; // "Email không tồn tại" hoặc "Sai mật khẩu"
      });
  },
});

export const { processLogout, clearLoginError } = userSlice.actions;
export default userSlice.reducer;
