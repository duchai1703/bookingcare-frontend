// src/redux/slices/doctorSlice.js
// Redux slice cho Doctor — Dashboard bác sĩ + Patient module
// [ĐỢT 2] Thêm: bookAppointment, verifyBooking async thunks
// [DEEP-SCAN FIX-1] Clear state khi logout (chống rò rỉ dữ liệu bệnh nhân)

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  getListPatientForDoctor,
  sendRemedy,
  cancelBooking,
  getPatientBookingHistory,
} from '../../services/doctorService';
import {
  postBookAppointment,
  postVerifyBookAppointment,
} from '../../services/patientService';
import { processLogout } from './userSlice';

// ===== ASYNC THUNKS — DOCTOR DASHBOARD =====

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

// ===== ASYNC THUNKS — PATIENT MODULE (ĐỢT 2) =====

// REQ-PT-013→023: Đặt lịch khám bệnh
// Trả toàn bộ response (bao gồm errCode) để component xử lý UI
export const bookAppointment = createAsyncThunk(
  'doctor/bookAppointment',
  async (bookingData, { rejectWithValue }) => {
    try {
      const res = await postBookAppointment(bookingData);
      // Trả toàn bộ response để BookingModal kiểm tra errCode (0/2/4)
      if (res) return res;
      return rejectWithValue('Không nhận được phản hồi từ server');
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// REQ-PT-019, 020: Xác nhận lịch hẹn qua email (S1 → S2)
// Trả toàn bộ response để VerifyEmail kiểm tra errCode
export const verifyBooking = createAsyncThunk(
  'doctor/verifyBooking',
  async ({ token, doctorId }, { rejectWithValue }) => {
    try {
      const res = await postVerifyBookAppointment({ token, doctorId });
      if (res) return res;
      return rejectWithValue('Không nhận được phản hồi từ server');
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// ===== SLICE =====
const doctorSlice = createSlice({
  name: 'doctor',

  initialState: {
    // Doctor Dashboard state
    patientList: [],         // DS bệnh nhân đặt lịch hôm nay
    patientHistory: [],      // Lịch sử booking 1 bệnh nhân
    isLoadingDoctor: false,

    // Patient Module state (ĐỢT 2)
    currentDoctor: null,       // Thông tin bác sĩ đang xem chi tiết
    currentSchedules: [],      // Lịch khám bác sĩ đang xem
    currentSpecialty: null,    // Chuyên khoa đang xem
    currentClinic: null,       // Phòng khám đang xem
    bookingStatus: 'idle',     // 'idle' | 'loading' | 'succeeded' | 'failed'
    isLoadingSchedule: false,
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
      // ===== Fetch Patient List =====
      .addCase(fetchPatientList.pending, (state) => { state.isLoadingDoctor = true; })
      .addCase(fetchPatientList.fulfilled, (state, action) => {
        state.isLoadingDoctor = false;
        state.patientList = action.payload;
      })
      .addCase(fetchPatientList.rejected, (state) => { state.isLoadingDoctor = false; })

      // ===== Send Remedy =====
      .addCase(sendRemedyAction.pending, (state) => { state.isLoadingDoctor = true; })
      .addCase(sendRemedyAction.fulfilled, (state) => { state.isLoadingDoctor = false; })
      .addCase(sendRemedyAction.rejected, (state) => { state.isLoadingDoctor = false; })

      // ===== Cancel Booking =====
      .addCase(cancelBookingAction.pending, (state) => { state.isLoadingDoctor = true; })
      .addCase(cancelBookingAction.fulfilled, (state) => { state.isLoadingDoctor = false; })
      .addCase(cancelBookingAction.rejected, (state) => { state.isLoadingDoctor = false; })

      // ===== Fetch Patient History =====
      .addCase(fetchPatientHistory.pending, (state) => { state.isLoadingDoctor = true; })
      .addCase(fetchPatientHistory.fulfilled, (state, action) => {
        state.isLoadingDoctor = false;
        state.patientHistory = action.payload;
      })
      .addCase(fetchPatientHistory.rejected, (state) => { state.isLoadingDoctor = false; })

      // ===== Book Appointment (ĐỢT 2) =====
      .addCase(bookAppointment.pending, (state) => {
        state.bookingStatus = 'loading';
      })
      .addCase(bookAppointment.fulfilled, (state) => {
        state.bookingStatus = 'succeeded';
      })
      .addCase(bookAppointment.rejected, (state) => {
        state.bookingStatus = 'failed';
      })

      // ===== Verify Booking (ĐỢT 2) =====
      .addCase(verifyBooking.pending, (state) => {
        state.isLoadingDoctor = true;
      })
      .addCase(verifyBooking.fulfilled, (state) => {
        state.isLoadingDoctor = false;
      })
      .addCase(verifyBooking.rejected, (state) => {
        state.isLoadingDoctor = false;
      })

      // ✅ [DEEP-SCAN FIX-1] CLEAR STATE KHI LOGOUT (Chống rò rỉ dữ liệu bệnh nhân)
      // Khi user đăng xuất, redux-persist vẫn giữ state trong localStorage.
      // Nếu KHÔNG clear, user kế tiếp mở trang có thể thấy dữ liệu bác sĩ cũ (privacy leak).
      .addCase(processLogout, (state) => {
        state.patientList = [];
        state.patientHistory = [];
        state.currentDoctor = null;
        state.currentSchedules = [];
        state.currentSpecialty = null;
        state.currentClinic = null;
        state.bookingStatus = 'idle';
        state.isLoadingDoctor = false;
        state.isLoadingSchedule = false;
      });
  },
});

export const { clearPatientList, clearPatientHistory } = doctorSlice.actions;
export default doctorSlice.reducer;
