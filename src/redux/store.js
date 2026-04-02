// src/redux/store.js
import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { combineReducers } from 'redux';

import appReducer from './slices/appSlice';
import userReducer from './slices/userSlice';
import adminReducer from './slices/adminSlice';
import doctorReducer from './slices/doctorSlice';

// FIX AUTO-LOGOUT: Giữ accessToken trong persist để không bị logout khi F5
// (DS-03 cũ: strip accessToken — gây auto-logout liên tục, user không thể sử dụng)
const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['user', 'app'],  // persist user (isLoggedIn, userInfo, accessToken) và app (language)
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
