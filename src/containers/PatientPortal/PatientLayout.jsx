// src/containers/PatientPortal/PatientLayout.jsx
// Layout giao diện Patient Portal — Sidebar trái + Outlet phải
// [Phase 9.4] Tương tự SystemLayout nhưng dành riêng cho bệnh nhân (R3)
import React from 'react';
import { Outlet, NavLink, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { FormattedMessage, useIntl } from 'react-intl';
import './PatientLayout.scss';

const PatientLayout = () => {
  const { userInfo } = useSelector((state) => state.user);
  // Fix i18n: useIntl cho thuộc tính title
  const intl = useIntl();

  return (
    <div className="patient-layout">
      {/* ===== SIDEBAR TRÁI ===== */}
      <aside className="patient-sidebar">
        <Link to="/" className="sidebar-logo" title={intl.formatMessage({ id: 'patient-portal.layout.back-to-home' })}>
          {/* [Fix Bug 9.5] Chuỗi "BookingCare" phải dùng i18n */}
          <span className="logo-text"><FormattedMessage id="common.brand-name" /></span>
          <span className="logo-sub"><FormattedMessage id="patient-portal.sidebar.title" /></span>
        </Link>

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

        {/* Link về trang chủ */}
        <div className="sidebar-footer">
          <Link to="/" className="sidebar-item sidebar-item--home">
            <i className="fas fa-home" />
            <FormattedMessage id="patient-portal.sidebar.home" />
          </Link>
        </div>
      </aside>

      {/* ===== NỘI DUNG PHẢI ===== */}
      <main className="patient-content">
        {/* Top bar */}
        <div className="patient-header">
          <div className="header-left">
            <span className="patient-badge">👤 <FormattedMessage id="patient-portal.sidebar.title" /></span>
          </div>
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
