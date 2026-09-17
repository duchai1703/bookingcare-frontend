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
import SpecialtyList from './Patient/SpecialtyList';
import ClinicList from './Patient/ClinicList';
import DoctorList from './Patient/DoctorList';
import ExaminationFee from './Patient/ExaminationFee';
import VerifyEmail from './Patient/VerifyEmail';
import PaymentResult from './PatientPortal/PaymentResult';
import ClinicSpecialtyBridge from './Patient/ClinicSpecialtyBridge'; // [Phase D.1]
import SpecialtyDoctorBridge from './Patient/SpecialtyDoctorBridge'; // [Phase D.1]

// ===== Protected Pages =====
import SystemLayout from './System/SystemLayout';
import UserManage from './System/Admin/UserManage';
import DoctorManage from './System/Admin/DoctorManage';
import ClinicManage from './System/Admin/ClinicManage';
import SpecialtyManage from './System/Admin/SpecialtyManage';
import ScheduleManage from './System/Admin/ScheduleManage';
import Dashboard from './System/Admin/Dashboard';
import ManagePatient from './System/Doctor/ManagePatient';

// [Phase C] Doctor new pages
import DoctorProfile  from './System/Doctor/DoctorProfile';
import DoctorRevenue  from './System/Doctor/DoctorRevenue';

// [Phase C] Admin new pages
import MedicalCatalogManage from './System/Admin/MedicalCatalogManage';
import MedicineManage       from './System/Admin/MedicineManage';
import SystemSettings       from './System/Admin/SystemSettings';

// [Phase E] Admin Detail Analytics pages
import BookingAnalytics         from './System/Admin/Analytics/BookingAnalytics';
import RevenueAnalytics         from './System/Admin/Analytics/RevenueAnalytics';
import DoctorAnalytics          from './System/Admin/Analytics/DoctorAnalytics';
import PatientAnalytics         from './System/Admin/Analytics/PatientAnalytics';
import SpecialtyClinicAnalytics from './System/Admin/Analytics/SpecialtyClinicAnalytics';

// [Phase F] Admin Patient Enterprise Management
import PatientMaster            from './System/Admin/Patient/PatientMaster';
import PatientDetailWorkspace   from './System/Admin/Patient/PatientDetailWorkspace';

// [Doctor Operations Center] Enterprise Master & Detail Workspace
import DoctorMaster             from './System/Admin/Doctor/DoctorMaster';
import DoctorDetailWorkspace    from './System/Admin/Doctor/DoctorDetailWorkspace';

// [Clinic Operations Center] Facility Master & Control Center
import ClinicMaster             from './System/Admin/Clinic/ClinicMaster';
import ClinicControlCenter      from './System/Admin/Clinic/ClinicControlCenter';
import ClinicSpecialtyWorkspace from './System/Admin/Clinic/ClinicSpecialtyWorkspace';

// [Specialty Intelligence Center] Disciplines Master & Workspace
import SpecialtyMaster          from './System/Admin/Specialty/SpecialtyMaster';
import SpecialtyDetailWorkspace from './System/Admin/Specialty/SpecialtyDetailWorkspace';

// [Phase 9.4] Patient Portal
import PatientLayout from './PatientPortal/PatientLayout';
import PatientOverview from './PatientPortal/PatientOverview';
import PatientProfile from './PatientPortal/PatientProfile';
import AppointmentHistory from './PatientPortal/AppointmentHistory';

// ===== Layout =====
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import Loading from '../components/Loading/Loading';

// [Phase 12] AI Chatbot — Floating widget
import AIChatbot from './Patient/AIChatbot/AIChatbot';

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

        {/* Trang tổng hợp danh sách — Public */}
        <Route
          path={path.SPECIALTY_LIST}
          element={
            <>
              <Header />
              <SpecialtyList />
              <Footer />
            </>
          }
        />
        <Route
          path={path.CLINIC_LIST}
          element={
            <>
              <Header />
              <ClinicList />
              <Footer />
            </>
          }
        />
        <Route
          path={path.DOCTOR_LIST}
          element={
            <>
              <Header />
              <DoctorList />
              <Footer />
            </>
          }
        />

        <Route
          path={path.EXAMINATION_FEE}
          element={<Navigate to="/doctors?view=fee" replace />}
        />

        {/* Xác thực email — SRS 3.10 */}
        <Route path={path.VERIFY_BOOKING} element={<VerifyEmail />} />

        {/* Kết quả thanh toán VNPay */}
        <Route path={path.PAYMENT_RESULT} element={<PaymentResult />} />

        {/* [Phase D.1] Clinic → Specialty → Doctor bridge */}
        <Route
          path="/clinics/:clinicId/specialties"
          element={<><Header /><ClinicSpecialtyBridge /><Footer /></>}
        />
        <Route
          path="/clinics/:clinicId/specialties/:specialtyId/doctors"
          element={<><Header /><SpecialtyDoctorBridge /><Footer /></>}
        />

        {/* ===== ADMIN ROUTES — Chỉ Admin R1 (SRS REQ-AU-005) ===== */}
        <Route element={<PrivateRoute allowedRoles={[USER_ROLE.ADMIN]} />}>
          <Route path={path.SYSTEM} element={<SystemLayout />}>
            {/* /system → redirect /system/dashboard */}
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="user-manage" element={<UserManage />} />
            {/* [Doctor Operations Center] Master & Workspace */}
            <Route path="doctor-manage" element={<DoctorMaster />} />
            <Route path="doctors" element={<DoctorMaster />} />
            <Route path="doctors/:id" element={<DoctorDetailWorkspace />} />
            <Route path="schedule-manage" element={<DoctorMaster />} />
            {/* [Clinic Operations Center] Master & Control Center */}
            <Route path="clinic-manage" element={<ClinicMaster />} />
            <Route path="clinics" element={<ClinicMaster />} />
            <Route path="clinics/:id" element={<ClinicControlCenter />} />
            <Route path="clinics/:clinicId/specialties/:specialtyId" element={<ClinicSpecialtyWorkspace />} />

            {/* [Specialty Intelligence Center] Master & Workspace */}
            <Route path="specialty-manage" element={<SpecialtyMaster />} />
            <Route path="specialties" element={<SpecialtyMaster />} />
            <Route path="specialties/:id" element={<SpecialtyDetailWorkspace />} />
            {/* [Phase C] Admin new pages */}
            <Route path="medical-catalog-manage"  element={<MedicalCatalogManage />} />
            <Route path="medicine-manage"          element={<MedicineManage />} />
            <Route path="system-settings"          element={<SystemSettings />} />
            {/* [Phase F] Patient Enterprise Management & Workspace */}
            <Route path="patient-manage"          element={<PatientMaster />} />
            <Route path="patients"                element={<PatientMaster />} />
            <Route path="patients/:id"            element={<PatientDetailWorkspace />} />

            {/* [Phase E] Admin Detail Analytics pages */}
            <Route path="analytics/bookings"            element={<BookingAnalytics />} />
            <Route path="analytics/revenue"             element={<RevenueAnalytics />} />
            <Route path="analytics/doctors"             element={<DoctorAnalytics />} />
            <Route path="analytics/patients"            element={<PatientAnalytics />} />
            <Route path="analytics/specialties-clinics" element={<SpecialtyClinicAnalytics />} />
          </Route>
        </Route>

        {/* ===== DOCTOR ROUTES — Chỉ Doctor R2 (SRS REQ-AU-005) ===== */}
        <Route element={<PrivateRoute allowedRoles={[USER_ROLE.DOCTOR]} />}>
          <Route path={path.DOCTOR_DASHBOARD} element={<SystemLayout />}>
            <Route index element={<Navigate to="manage-patient" replace />} />
            <Route path="manage-patient"  element={<ManagePatient />} />
            <Route path="manage-schedule" element={<ScheduleManage />} />
            {/* [Phase C] Doctor new pages */}
            <Route path="doctor-profile"  element={<DoctorProfile />} />
            <Route path="doctor-revenue"  element={<DoctorRevenue />} />
          </Route>
        </Route>

        {/* ===== PATIENT ROUTES — Chỉ Patient R3 (Phase 9.4) ===== */}
        <Route element={<PrivateRoute allowedRoles={[USER_ROLE.PATIENT]} />}>
          <Route path={path.PATIENT_PORTAL} element={<PatientLayout />}>
            {/* /patient → redirect /patient/overview */}
            <Route index element={<Navigate to="overview" replace />} />
            <Route path="overview" element={<PatientOverview />} />
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

      {/* [Phase 12] AI Chatbot — Floating widget, render ngoài Routes */}
      <AIChatbot />
    </div>
  );
};

export default App;
