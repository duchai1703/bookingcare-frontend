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
import UserManage from './System/Admin/UserManage';
import DoctorManage from './System/Admin/DoctorManage';
import ClinicManage from './System/Admin/ClinicManage';
import SpecialtyManage from './System/Admin/SpecialtyManage';
import ScheduleManage from './System/Admin/ScheduleManage';
import ManagePatient from './System/Doctor/ManagePatient';

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
        <Route element={<PrivateRoute allowedRoles={[USER_ROLE.ADMIN]} />}>
          <Route path={path.SYSTEM} element={<SystemLayout />}>
            {/* /system → redirect /system/user-manage */}
            <Route index element={<Navigate to="user-manage" replace />} />
            <Route path="user-manage" element={<UserManage />} />
            <Route path="doctor-manage" element={<DoctorManage />} />
            <Route path="clinic-manage" element={<ClinicManage />} />
            <Route path="specialty-manage" element={<SpecialtyManage />} />
            <Route path="schedule-manage" element={<ScheduleManage />} />
          </Route>
        </Route>

        {/* ===== DOCTOR ROUTES — Chỉ Doctor R2 (SRS REQ-AU-005) ===== */}
        <Route element={<PrivateRoute allowedRoles={[USER_ROLE.DOCTOR]} />}>
          <Route path={path.DOCTOR_DASHBOARD} element={<SystemLayout />}>
            <Route index element={<Navigate to="manage-patient" replace />} />
            {/* ✅ GĐ8: Component thật thay thế placeholder */}
            <Route path="manage-patient" element={<ManagePatient />} />
          </Route>
        </Route>

        {/* ===== 404 — Not Found ===== */}
        {/* FIX #3: Dùng <a> thay vì <Navigate> trong JSX */}
        <Route
          path="*"
          element={
            <div style={{ textAlign: 'center', padding: '80px' }}>
              <h2 style={{ fontSize: '4rem', color: '#45c3d2' }}>404</h2>
              <p style={{ color: '#666' }}>Trang bạn tìm không tồn tại</p>
              <a href="/" style={{ color: '#45c3d2', fontWeight: 600 }}>← Về trang chủ</a>
            </div>
          }
        />
      </Routes>
    </div>
  );
};

export default App;
