// src/containers/System/SystemLayout.jsx
// Layout wrapper chung cho Admin (R1) và Doctor (R2) Dashboard
// [Phase 9 Final] Full i18n — useIntl + FormattedMessage
import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { FormattedMessage, useIntl } from 'react-intl';
import Navigator from '../../components/Navigator/Navigator';
import './SystemLayout.scss';

const SystemLayout = () => {
  const intl = useIntl();
  const { userInfo } = useSelector((state) => state.user);

  return (
    <div className="system-layout">
      {/* ===== SIDEBAR TRÁI ===== */}
      <div className="system-sidebar">
        <Link to="/" className="sidebar-logo" title={intl.formatMessage({ id: 'admin.manage.system-layout.back-to-home' })}>
          <span className="logo-icon">🏥</span>
          <span className="logo-text">BookingCare</span>
          <span className="logo-sub"><FormattedMessage id="admin.manage.system-layout.admin-panel" /></span>
        </Link>
        <Navigator />
      </div>

      {/* ===== NỘI DUNG PHẢI ===== */}
      <div className="system-content">
        {/* Header top bar */}
        <div className="system-header">
          <div className="header-left">
            <Link to="/" className="home-link" title={intl.formatMessage({ id: 'admin.manage.system-layout.back-to-home' })}>
              <i className="fas fa-home" /> <FormattedMessage id="admin.manage.system-layout.home" />
            </Link>
          </div>
          <div className="header-right">
            <span className="admin-badge">
              <FormattedMessage id={userInfo?.roleId === 'R1' ? 'admin.manage.system-layout.role-admin' : 'admin.manage.system-layout.role-doctor'} />
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
