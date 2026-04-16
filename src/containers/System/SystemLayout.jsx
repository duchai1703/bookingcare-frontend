// src/containers/System/SystemLayout.jsx
// Layout wrapper chung cho Admin (R1) và Doctor (R2) Dashboard
// [Phase 10] Toggle sidebar + Language Switcher (VN/EN) cho Admin/Doctor
import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { FormattedMessage, useIntl } from 'react-intl';
import { changeLanguage } from '../../redux/slices/appSlice';
import { LANGUAGES } from '../../utils/constants';
import Navigator from '../../components/Navigator/Navigator';
import './SystemLayout.scss';

const SystemLayout = () => {
  const intl = useIntl();
  const dispatch = useDispatch();
  const { userInfo } = useSelector((state) => state.user);
  const language = useSelector((state) => state.app.language);

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
      <div className="system-content tw-bg-[#F4F7FE]">
        {/* Header top bar */}
        <div className="system-header">
          <div className="header-left" />
          <div className="header-right">
            {/* [Phase 10] Language Switcher — Admin/Doctor có thể đổi ngôn ngữ */}
            <div className="language-switcher">
              <button
                className={`lang-btn ${language === LANGUAGES.VI ? 'active' : ''}`}
                onClick={() => dispatch(changeLanguage(LANGUAGES.VI))}
                title="Tiếng Việt"
              >
                VN
              </button>
              <button
                className={`lang-btn ${language === LANGUAGES.EN ? 'active' : ''}`}
                onClick={() => dispatch(changeLanguage(LANGUAGES.EN))}
                title="English"
              >
                EN
              </button>
            </div>
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
