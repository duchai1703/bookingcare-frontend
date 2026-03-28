// src/containers/System/SystemLayout.jsx
// Layout wrapper chung cho Admin (R1) và Doctor (R2) Dashboard
import React from 'react';
import { Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Navigator from '../../components/Navigator/Navigator';
import './SystemLayout.scss';

const SystemLayout = () => {
  const { userInfo } = useSelector((state) => state.user);

  return (
    <div className="system-layout">
      {/* ===== SIDEBAR TRÁI ===== */}
      <div className="system-sidebar">
        <div className="sidebar-logo">
          <span className="logo-icon">🏥</span>
          <span className="logo-text">BookingCare</span>
          <span className="logo-sub">Admin Panel</span>
        </div>
        <Navigator />
      </div>

      {/* ===== NỘI DUNG PHẢI ===== */}
      <div className="system-content">
        {/* Header top bar */}
        <div className="system-header">
          <div className="header-left">
            <span className="breadcrumb">Dashboard</span>
          </div>
          <div className="header-right">
            <span className="admin-badge">
              {userInfo?.roleId === 'R1' ? '🛡️ Admin' : '🩺 Bác sĩ'}
            </span>
            <span className="admin-name">
              {userInfo?.lastName} {userInfo?.firstName}
            </span>
          </div>
        </div>

        {/* Trang con render ở đây */}
        <div className="system-body">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default SystemLayout;
