# 🗄️ BƯỚC 2 — THIẾT LẬP REDUX STORE + PERSIST

> **Mục tiêu:** Tạo Redux store với Redux Toolkit, cấu hình redux-persist, tạo tất cả slices  
> **Thời gian:** Ngày 1-2  
> **SRS liên quan:** REQ-AU-009 (lưu user vào store), IL-007 (lưu ngôn ngữ)

---

## 2.1 Tạo Redux Store — `src/redux/store.js`

```js
// src/redux/store.js
import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage'; // Dùng localStorage
import { combineReducers } from 'redux';

import appReducer from './slices/appSlice';
import userReducer from './slices/userSlice';
import adminReducer from './slices/adminSlice';
import doctorReducer from './slices/doctorSlice';

// ===== CẤU HÌNH PERSIST =====
// Chỉ persist những slice cần thiết
const persistConfig = {
  key: 'root',          // Key trong localStorage
  storage,              // localStorage (mặc định)
  whitelist: ['user', 'app'],  // CHỈ persist user (token, info) và app (language)
  // Không persist admin (fetch lại mỗi lần mở)
};

// Combine tất cả reducers
const rootReducer = combineReducers({
  app: appReducer,        // language, loading, allcodes
  user: userReducer,      // isLoggedIn, userInfo, accessToken
  admin: adminReducer,    // users, doctors, specialties, clinics
  doctor: doctorReducer,  // doctor dashboard: patients, booking history
});

// Wrap rootReducer với persist
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Tạo store
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Bỏ qua warning serialize của redux-persist
        ignoredActions: [
          'persist/PERSIST',
          'persist/REHYDRATE',
          'persist/PAUSE',
          'persist/PURGE',
          'persist/REGISTER',
          'persist/FLUSH',
        ],
      },
    }),
});

// Tạo persistor (dùng trong PersistGate ở main.jsx)
export const persistor = persistStore(store);
```

**Giải thích chi tiết:**

| Khái niệm | Vai trò |
|-----------|---------|
| `persistConfig.whitelist` | Chỉ lưu `user` và `app` vào localStorage. Slice `admin` KHÔNG persist vì dữ liệu CRUD nên fetch mới |
| `serializableCheck` | Redux Toolkit mặc định warn nếu action không serializable. redux-persist có actions đặc biệt nên phải bỏ qua |
| `persistor` | Object dùng trong `<PersistGate>` ở `main.jsx` để đợi rehydrate xong mới render UI |

---

## 2.2 App Slice — `src/redux/slices/appSlice.js`

Quản lý: ngôn ngữ, trạng thái loading, dữ liệu Allcode

```js
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
```

**Cách dùng trong component:**

```jsx
import { useDispatch, useSelector } from 'react-redux';
import { changeLanguage, fetchAllcodeByType } from '../redux/slices/appSlice';

// Đọc state
const language = useSelector(state => state.app.language);
const genders = useSelector(state => state.app.genders);

// Dispatch action
dispatch(changeLanguage('en'));                 // Chuyển sang tiếng Anh
dispatch(fetchAllcodeByType('GENDER'));         // Fetch danh sách giới tính
```

---

## 2.3 User Slice — `src/redux/slices/userSlice.js`

Quản lý: trạng thái đăng nhập, thông tin user, JWT token

```js
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
```

**Flow đăng nhập (State Machine):**

```
[Chưa login] ----loginUser()----> [pending] ----thành công----> [isLoggedIn: true]
                                              ----thất bại----> [loginError: "Sai mật khẩu"]

[Đã login] ----processLogout()----> [Chưa login] (xóa token, userInfo)
```

---

## 2.4 Admin Slice — `src/redux/slices/adminSlice.js`

Quản lý state cho các trang Admin CRUD (sẽ dùng ở giai đoạn 6):

```js
// src/redux/slices/adminSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  getAllUsers,
  createNewUser,
  editUser as editUserApi,
  deleteUser as deleteUserApi,
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
```

> 💡 **Lưu ý:** Slice này sẽ được mở rộng thêm nhiều thunks ở giai đoạn 6 (Admin FE). Hiện tại chỉ cần `fetchAllUsers` và `fetchTopDoctors` cho HomePage.

---

## 2.5 Doctor Slice — `src/redux/slices/doctorSlice.js`

Quản lý state cho Doctor Dashboard (sẽ dùng ở giai đoạn 8):

```js
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
```

> 💡 **Lưu ý:** Slice này chủ yếu dùng ở giai đoạn 8 (Doctor FE). Tạo sẵn bây giờ để store hoàn chỉnh.

---

## 2.6 Kiểm Tra Redux Store

Sau khi tạo xong **4 slices**, cấu trúc Redux:

```
src/redux/
├── store.js                    ← configureStore + persist
└── slices/
    ├── appSlice.js             ← language, allcodes, loading
    ├── userSlice.js            ← isLoggedIn, userInfo, token 
    ├── adminSlice.js           ← users, topDoctors
    └── doctorSlice.js          ← patientList, patientHistory
```

**Redux State Tree:**

```js
{
  app: {
    language: 'vi',           // 'vi' | 'en'
    genders: [...],           // [{id, type, keyMap, valueVi, valueEn}]
    roles: [...],
    positions: [...],
    times: [...],
    prices: [...],
    payments: [...],
    provinces: [...],
    isLoading: false,
  },
  user: {
    isLoggedIn: false,
    userInfo: null,            // hoặc {id, email, roleId, firstName, lastName}
    accessToken: null,         // hoặc "eyJhbGciOiJ..."
    loginError: null,
  },
  admin: {
    users: [],
    topDoctors: [],
    isLoadingAdmin: false,
  },
  doctor: {
    patientList: [],           // DS bệnh nhân đặt lịch
    patientHistory: [],        // Lịch sử 1 bệnh nhân
    isLoadingDoctor: false,
  },
}
```

**Sau khi login thành công, `localStorage` sẽ có:**

```
Key: persist:root
Value: {"app":"{\"language\":\"vi\",...}","user":"{\"isLoggedIn\":true,...}"}
```

---

## 2.7 Cài Redux DevTools (Khuyến nghị)

Cài extension **Redux DevTools** trên Chrome:
1. Mở Chrome Web Store
2. Tìm "Redux DevTools"
3. Nhấn "Add to Chrome"

Sau khi cài, mở `http://localhost:3000` → F12 → Tab "Redux" sẽ thấy state tree và tất cả actions.

---

## ✅ Checklist Bước 2

- [ ] `src/redux/store.js` đã tạo với persist config (4 slices)
- [ ] `src/redux/slices/appSlice.js` hoạt động (language + allcodes)
- [ ] `src/redux/slices/userSlice.js` hoạt động (login/logout)
- [ ] `src/redux/slices/adminSlice.js` đã tạo cơ bản
- [ ] `src/redux/slices/doctorSlice.js` đã tạo (patient list, remedy, cancel, history)
- [ ] Redux DevTools hiển thị state tree khi mở browser
- [ ] `localStorage` có key `persist:root` sau khi app load

---

> 📖 **Tiếp theo:** Mở file [Phase5_03_Axios_API.md](Phase5_03_Axios_API.md) để cấu hình Axios kết nối Backend.
