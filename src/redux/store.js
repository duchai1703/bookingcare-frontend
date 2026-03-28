// src/redux/store.js
import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer, createTransform } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { combineReducers } from 'redux';

import appReducer from './slices/appSlice';
import userReducer from './slices/userSlice';
import adminReducer from './slices/adminSlice';
import doctorReducer from './slices/doctorSlice';

// DS-03 FIX: Loại accessToken khỏi persist — không lưu JWT vào localStorage (ngăn XSS)
const userTransform = createTransform(
  (inboundState) => ({ ...inboundState, accessToken: null }), // trước khi ghi vào storage: xóa accessToken
  (outboundState) => outboundState,                            // sau khi đọc lại: giữ nguyên (null)
  { whitelist: ['user'] }
);

const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['user', 'app'],  // persist user (isLoggedIn, userInfo) và app (language)
  transforms: [userTransform], // DS-03: loại accessToken khỏi storage
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
