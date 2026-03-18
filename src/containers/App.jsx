// src/containers/App.jsx
// Main application component — Chứa tất cả routes
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { path, USER_ROLE } from '../utils/constants';
import PrivateRoute from '../routes/PrivateRoute';

// ===== Public Pages =====
import HomePage from './HomePage/HomePage';
import Login from './Auth/Login';
import DoctorDetail from './Patient/DoctorDetail';
import SpecialtyDetail from './Patient/SpecialtyDetail';
import ClinicDetail from './Patient/ClinicDetail';
import VerifyEmail from './Patient/VerifyEmail';

// ===== Protected Pages =====
import SystemLayout from './System/SystemLayout';

// ===== Layout =====
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import Loading from '../components/Loading/Loading';

import './App.scss';

const App = () => {
  return (
    <div className="app-container">
      {/* Loading spinner overlay */}
      <Loading />

      <Routes>
        {/* ===== PUBLIC ROUTES ===== */}
        {/* Trang chủ */}
        <Route
          path={path.HOME}
          element={
            <>
              <Header />
              <HomePage />
              <Footer />
            </>
          }
        />

        {/* Trang đăng nhập */}
        <Route path={path.LOGIN} element={<Login />} />

        {/* Chi tiết bác sĩ — SRS 3.8 */}
        <Route
          path={path.DOCTOR_DETAIL}
          element={
            <>
              <Header />
              <DoctorDetail />
              <Footer />
            </>
          }
        />

        {/* Chi tiết chuyên khoa — SRS 3.7 */}
        <Route
          path={path.SPECIALTY_DETAIL}
          element={
            <>
              <Header />
              <SpecialtyDetail />
              <Footer />
            </>
          }
        />

        {/* Chi tiết phòng khám — SRS 3.7 */}
        <Route
          path={path.CLINIC_DETAIL}
          element={
            <>
              <Header />
              <ClinicDetail />
              <Footer />
            </>
          }
        />

        {/* Xác thực email — SRS 3.10 */}
        <Route path={path.VERIFY_BOOKING} element={<VerifyEmail />} />

        {/* ===== ADMIN ROUTES — Chỉ Admin R1 (SRS REQ-AU-005) ===== */}
        <Route
          element={<PrivateRoute allowedRoles={[USER_ROLE.ADMIN]} />}
        >
          <Route path={`${path.SYSTEM}/*`} element={<SystemLayout />} />
        </Route>

        {/* ===== DOCTOR ROUTES — Chỉ Doctor R2 (SRS REQ-AU-005) ===== */}
        <Route
          element={<PrivateRoute allowedRoles={[USER_ROLE.DOCTOR]} />}
        >
          <Route
            path={`${path.DOCTOR_DASHBOARD}/*`}
            element={<SystemLayout />}
          />
        </Route>

        {/* ===== 404 — Not Found ===== */}
        <Route
          path="*"
          element={
            <div className="not-found">
              <h2>404</h2>
              <p>Trang bạn tìm không tồn tại</p>
              <Navigate to={path.HOME} replace />
            </div>
          }
        />
      </Routes>
    </div>
  );
};

export default App;
