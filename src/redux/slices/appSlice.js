// src/redux/slices/appSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getAllCode } from '../../services/userService';

// ===== ASYNC THUNKS =====

// Fetch Allcode theo type (ROLE, GENDER, TIME, STATUS, POSITION, PRICE, PAYMENT, PROVINCE)
export const fetchAllcodeByType = createAsyncThunk(
  'app/fetchAllcodeByType',
  async (type, { rejectWithValue }) => {
    try {
      const res = await getAllCode(type);
      if (res && res.errCode === 0) {
        return { type, data: res.data };
      }
      return rejectWithValue(`Lỗi khi fetch allcode type: ${type}`);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// ===== SLICE =====
const appSlice = createSlice({
  name: 'app',

  initialState: {
    // Ngôn ngữ: 'vi' (mặc định) hoặc 'en' — SRS IL-006
    language: 'vi',

    // Dữ liệu Allcode (tra cứu)
    genders: [],       // G1, G2, G3
    roles: [],         // R1, R2, R3
    positions: [],     // P1-P5
    times: [],         // T1-T8
    prices: [],        // PRI1-PRI6
    payments: [],      // PAY1-PAY3
    provinces: [],     // PRO1-PRO6

    // UI state
    isLoading: false,
  },

  reducers: {
    // Chuyển đổi ngôn ngữ Vi ↔ En — SRS IL-002
    changeLanguage: (state, action) => {
      state.language = action.payload; // 'vi' hoặc 'en'
    },

    // Set loading
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(fetchAllcodeByType.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchAllcodeByType.fulfilled, (state, action) => {
        state.isLoading = false;
        const { type, data } = action.payload;
        // Map type → state key
        const typeMap = {
          GENDER: 'genders',
          ROLE: 'roles',
          POSITION: 'positions',
          TIME: 'times',
          PRICE: 'prices',
          PAYMENT: 'payments',
          PROVINCE: 'provinces',
        };
        const key = typeMap[type];
        if (key) {
          state[key] = data;
        }
      })
      .addCase(fetchAllcodeByType.rejected, (state, action) => {
        state.isLoading = false;
        console.error('>>> fetchAllcodeByType failed:', action.payload);
      });
  },
});

// Export actions (dùng trong component: dispatch(changeLanguage('en')))
export const { changeLanguage, setLoading } = appSlice.actions;

// Export reducer (dùng trong store.js)
export default appSlice.reducer;
