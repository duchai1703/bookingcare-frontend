// src/redux/slices/doctorSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  getListPatientForDoctor,
  sendRemedy,
  cancelBooking,
  getPatientBookingHistory,
} from '../../services/doctorService';

// ===== ASYNC THUNKS =====

// REQ-DR-001, 002, 003: Lấy danh sách bệnh nhân theo ngày + trạng thái
export const fetchPatientList = createAsyncThunk(
  'doctor/fetchPatientList',
  async ({ doctorId, date, statusId }, { rejectWithValue }) => {
    try {
      const res = await getListPatientForDoctor(doctorId, date, statusId);
      if (res && res.errCode === 0) return res.data;
      return rejectWithValue(res?.message);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// REQ-DR-008, 009, 010: Gửi kết quả khám (S2 → S3)
export const sendRemedyAction = createAsyncThunk(
  'doctor/sendRemedy',
  async ({ bookingId, data }, { rejectWithValue }) => {
    try {
      const res = await sendRemedy(bookingId, data);
      if (res && res.errCode === 0) return res;
      return rejectWithValue(res?.message);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// REQ-DR-004: Hủy lịch hẹn (S2 → S4)
export const cancelBookingAction = createAsyncThunk(
  'doctor/cancelBooking',
  async ({ bookingId, data }, { rejectWithValue }) => {
    try {
      const res = await cancelBooking(bookingId, data);
      if (res && res.errCode === 0) return res;
      return rejectWithValue(res?.message);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// REQ-DR-007: Lấy lịch sử booking của bệnh nhân
export const fetchPatientHistory = createAsyncThunk(
  'doctor/fetchPatientHistory',
  async (patientId, { rejectWithValue }) => {
    try {
      const res = await getPatientBookingHistory(patientId);
      if (res && res.errCode === 0) return res.data;
      return rejectWithValue(res?.message);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// ===== SLICE =====
const doctorSlice = createSlice({
  name: 'doctor',

  initialState: {
    patientList: [],         // DS bệnh nhân đặt lịch hôm nay
    patientHistory: [],      // Lịch sử booking 1 bệnh nhân
    isLoadingDoctor: false,
  },

  reducers: {
    // Reset patient list khi đổi ngày/trạng thái
    clearPatientList: (state) => {
      state.patientList = [];
    },
    clearPatientHistory: (state) => {
      state.patientHistory = [];
    },
  },

  extraReducers: (builder) => {
    builder
      // Fetch Patient List
      .addCase(fetchPatientList.pending, (state) => { state.isLoadingDoctor = true; })
      .addCase(fetchPatientList.fulfilled, (state, action) => {
        state.isLoadingDoctor = false;
        state.patientList = action.payload;
      })
      .addCase(fetchPatientList.rejected, (state) => { state.isLoadingDoctor = false; })

      // Send Remedy
      .addCase(sendRemedyAction.pending, (state) => { state.isLoadingDoctor = true; })
      .addCase(sendRemedyAction.fulfilled, (state) => { state.isLoadingDoctor = false; })
      .addCase(sendRemedyAction.rejected, (state) => { state.isLoadingDoctor = false; })

      // Cancel Booking
      .addCase(cancelBookingAction.pending, (state) => { state.isLoadingDoctor = true; })
      .addCase(cancelBookingAction.fulfilled, (state) => { state.isLoadingDoctor = false; })
      .addCase(cancelBookingAction.rejected, (state) => { state.isLoadingDoctor = false; })

      // Fetch Patient History
      .addCase(fetchPatientHistory.pending, (state) => { state.isLoadingDoctor = true; })
      .addCase(fetchPatientHistory.fulfilled, (state, action) => {
        state.isLoadingDoctor = false;
        state.patientHistory = action.payload;
      })
      .addCase(fetchPatientHistory.rejected, (state) => { state.isLoadingDoctor = false; });
  },
});

export const { clearPatientList, clearPatientHistory } = doctorSlice.actions;
export default doctorSlice.reducer;
