// src/containers/App.jsx
// Main application component — Chứa tất cả routes
// [Phase 9.3] Auth Pages + [Phase 9.4] Patient Portal
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';
import { path, USER_ROLE } from '../utils/constants';
import PrivateRoute from '../routes/PrivateRoute';

// ===== Public Pages =====
import HomePage from './HomePage/HomePage';
import Login from './Auth/Login';
import Register from './Auth/Register';
import ForgotPassword from './Auth/ForgotPassword';
import ResetPassword from './Auth/ResetPassword';
import DoctorDetail from './Patient/DoctorDetail';
import SpecialtyDetail from './Patient/SpecialtyDetail';
import ClinicDetail from './Patient/ClinicDetail';
import VerifyEmail from './Patient/VerifyEmail';
import PaymentResult from './PatientPortal/PaymentResult';

// ===== Protected Pages =====
import SystemLayout from './System/SystemLayout';
import UserManage from './System/Admin/UserManage';
import DoctorManage from './System/Admin/DoctorManage';
import ClinicManage from './System/Admin/ClinicManage';
import SpecialtyManage from './System/Admin/SpecialtyManage';
import ScheduleManage from './System/Admin/ScheduleManage';
import Dashboard from './System/Admin/Dashboard';
import ManagePatient from './System/Doctor/ManagePatient';

// [Phase 9.4] Patient Portal
import PatientLayout from './PatientPortal/PatientLayout';
import PatientProfile from './PatientPortal/PatientProfile';
import AppointmentHistory from './PatientPortal/AppointmentHistory';

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

        {/* [Phase 9.3] Auth Pages — Public */}
        <Route path={path.LOGIN} element={<Login />} />
        <Route path={path.REGISTER} element={<Register />} />
        <Route path={path.FORGOT_PASSWORD} element={<ForgotPassword />} />
        <Route path={path.RESET_PASSWORD} element={<ResetPassword />} />

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

        {/* Kết quả thanh toán VNPay */}
        <Route path={path.PAYMENT_RESULT} element={<PaymentResult />} />

        {/* ===== ADMIN ROUTES — Chỉ Admin R1 (SRS REQ-AU-005) ===== */}
        <Route element={<PrivateRoute allowedRoles={[USER_ROLE.ADMIN]} />}>
          <Route path={path.SYSTEM} element={<SystemLayout />}>
            {/* /system → redirect /system/dashboard */}
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
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
            <Route path="manage-patient" element={<ManagePatient />} />
            <Route path="manage-schedule" element={<ScheduleManage />} />
          </Route>
        </Route>

        {/* ===== PATIENT ROUTES — Chỉ Patient R3 (Phase 9.4) ===== */}
        <Route element={<PrivateRoute allowedRoles={[USER_ROLE.PATIENT]} />}>
          <Route path={path.PATIENT_PORTAL} element={<PatientLayout />}>
            {/* /patient → redirect /patient/profile */}
            <Route index element={<Navigate to="profile" replace />} />
            <Route path="profile" element={<PatientProfile />} />
            <Route path="history" element={<AppointmentHistory />} />
          </Route>
        </Route>

        {/* ===== 404 — Not Found ===== */}
        <Route
          path="*"
          element={
            <div style={{ textAlign: 'center', padding: '80px' }}>
              <h2 style={{ fontSize: '4rem', color: '#45c3d2' }}>404</h2>
              <p style={{ color: '#666' }}><FormattedMessage id="common.page-not-found" /></p>
              <a href="/" style={{ color: '#45c3d2', fontWeight: 600 }}><FormattedMessage id="common.back-to-home" /></a>
            </div>
          }
        />
      </Routes>
    </div>
  );
};

export default App;
