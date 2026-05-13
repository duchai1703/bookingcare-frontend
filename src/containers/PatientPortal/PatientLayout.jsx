// src/containers/PatientPortal/PatientLayout.jsx
// Layout giao diện Patient Portal — Sidebar trái + Outlet phải
// [Phase 9.4] Tương tự SystemLayout nhưng dành riêng cho bệnh nhân (R3)
// [Phase 11 — v19.0] Xóa badge, thay Link "Trang chủ" bằng nút Logout
import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { FormattedMessage, useIntl } from 'react-intl';
import { processLogout } from '../../redux/slices/userSlice';
import { persistor } from '../../redux/store';
import './PatientLayout.scss';

const PatientLayout = () => {
  const { userInfo } = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  // Fix i18n: useIntl cho thuộc tính title
  const intl = useIntl();

  // ═══════════════════════════════════════════════════════════════════════
  // [Phase 11 — v20.6 Sec 3.4] handleLogout
  // Tuần tự: dispatch(processLogout()) → persistor.flush() → navigate("/login")
  // CẤM persistor.purge() — CẤM localStorage.removeItem('persist:user')
  // ═══════════════════════════════════════════════════════════════════════
  const handleLogout = async () => {
    dispatch(processLogout()); // Reset userSlice → initialState
    await persistor.flush(); // Ghi vào persist:root (app/language giữ nguyên)
    navigate('/login');
    // CẤM persistor.purge() — CẤM localStorage.removeItem('persist:user')
  };

  return (
    <div className="patient-layout">
      {/* ===== SIDEBAR TRÁI ===== */}
      <aside className="patient-sidebar">
        <NavLink to="/" className="sidebar-logo" title={intl.formatMessage({ id: 'patient-portal.layout.back-to-home' })}>
          {/* [Fix Bug 9.5] Chuỗi "BookingCare" phải dùng i18n */}
          <span className="logo-text"><FormattedMessage id="common.brand-name" /></span>
          <span className="logo-sub"><FormattedMessage id="patient-portal.sidebar.title" /></span>
        </NavLink>

        {/* Menu */}
        <nav className="sidebar-nav">
          {/* NavLink active class tự động khi URL match */}
          <NavLink
            to="/patient/profile"
            className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
          >
            <i className="fas fa-user" />
            <FormattedMessage id="patient-portal.sidebar.profile" />
          </NavLink>

          <NavLink
            to="/patient/history"
            className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
          >
            <i className="fas fa-calendar-alt" />
            <FormattedMessage id="patient-portal.sidebar.appointments" />
          </NavLink>
        </nav>

        {/* ✅ [v19.0] Xóa Link "Trang chủ" cũ, thay bằng nút Đăng xuất */}
        <div className="sidebar-footer">
          <button
            className="sidebar-item sidebar-item--logout"
            onClick={handleLogout}
          >
            <i className="fas fa-sign-out-alt" />
            <FormattedMessage id="patient-portal.sidebar.logout" defaultMessage="Đăng xuất" />
          </button>
        </div>
      </aside>

      {/* ===== NỘI DUNG PHẢI ===== */}
      <main className="patient-content">
        <div className="patient-header">
          <div className="header-left" />

          <div className="header-right">
            <span className="patient-name">
              {userInfo?.lastName} {userInfo?.firstName}
            </span>
          </div>
        </div>

        {/* Trang con render ở đây */}
        <div className="patient-body">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default PatientLayout;
