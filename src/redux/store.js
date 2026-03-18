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
