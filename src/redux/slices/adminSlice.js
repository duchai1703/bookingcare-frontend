// src/redux/slices/adminSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  getAllUsers,
} from '../../services/userService';
import { getTopDoctors } from '../../services/doctorService';

// ===== ASYNC THUNKS =====

// Fetch tất cả users — REQ-AM-001
export const fetchAllUsers = createAsyncThunk(
  'admin/fetchAllUsers',
  async (_, { rejectWithValue }) => {
    try {
      const res = await getAllUsers('ALL');
      if (res && res.errCode === 0) return res.data;
      return rejectWithValue(res?.message);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// Fetch top doctors — REQ-PT-003
export const fetchTopDoctors = createAsyncThunk(
  'admin/fetchTopDoctors',
  async (limit = 10, { rejectWithValue }) => {
    try {
      const res = await getTopDoctors(limit);
      if (res && res.errCode === 0) return res.data;
      return rejectWithValue(res?.message);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// ===== SLICE =====
const adminSlice = createSlice({
  name: 'admin',

  initialState: {
    users: [],            // Danh sách tất cả users
    topDoctors: [],       // Top bác sĩ nổi bật
    isLoadingAdmin: false,
  },

  reducers: {},

  extraReducers: (builder) => {
    builder
      // Fetch All Users
      .addCase(fetchAllUsers.pending, (state) => { state.isLoadingAdmin = true; })
      .addCase(fetchAllUsers.fulfilled, (state, action) => {
        state.isLoadingAdmin = false;
        state.users = action.payload;
      })
      .addCase(fetchAllUsers.rejected, (state) => { state.isLoadingAdmin = false; })

      // Fetch Top Doctors
      .addCase(fetchTopDoctors.pending, (state) => { state.isLoadingAdmin = true; })
      .addCase(fetchTopDoctors.fulfilled, (state, action) => {
        state.isLoadingAdmin = false;
        state.topDoctors = action.payload;
      })
      .addCase(fetchTopDoctors.rejected, (state) => { state.isLoadingAdmin = false; });
  },
});

export default adminSlice.reducer;
