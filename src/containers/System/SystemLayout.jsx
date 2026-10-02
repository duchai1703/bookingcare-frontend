// src/containers/System/SystemLayout.jsx
// [Upgrade - Phương án A] Enterprise Admin Console Shell & Royal Indigo Deep Midnight Theme
import React, { useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { FormattedMessage, useIntl } from 'react-intl';
import {
  ShieldCheck,
  Crown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { changeLanguage } from '../../redux/slices/appSlice';
import { LANGUAGES } from '../../utils/constants';
import Navigator from '../../components/Navigator/Navigator';
import NotificationBell from '../../components/Notification/NotificationBell';
import './SystemLayout.scss';

const SystemLayout = () => {
  const intl = useIntl();
  const dispatch = useDispatch();
  const { userInfo } = useSelector((state) => state.user);
  const language = useSelector((state) => state.app.language);

  // Trạng thái thu gọn/mở rộng sidebar (lưu vào localStorage)
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('admin_sidebar_collapsed') === 'true';
  });

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('admin_sidebar_collapsed', String(next));
      return next;
    });
  };

  const adminFullName = `${userInfo?.lastName || ''} ${userInfo?.firstName || 'Admin'}`.trim();

  return (
    <div className={`system-layout${collapsed ? ' is-collapsed' : ''}`}>
      {/* ===== SIDEBAR TRÁI: ENTERPRISE ADMIN CONSOLE ===== */}
      <aside className="system-sidebar">
        {/* Brand Header: Logo & Identity */}
        <div className="admin-brand-header">
          <Link
            to="/"
            className="brand-link"
            title={intl.formatMessage({ id: 'admin.manage.system-layout.back-to-home' })}
          >
            <div className="brand-logo-icon">
              <ShieldCheck size={21} strokeWidth={2.4} />
              <span className="brand-pulse-indigo" />
            </div>

            {!collapsed && (
              <div className="brand-text-block">
                <span className="brand-title">BookingCare</span>
                <span className="brand-badge-admin">
                  <Crown size={10} className="badge-crown" />
                  ADMIN CONSOLE
                </span>
              </div>
            )}
          </Link>

          <button
            type="button"
            className="btn-collapse-toggle"
            onClick={toggleCollapse}
            title={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
            aria-label="Toggle sidebar"
          >
            {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>
        </div>

        {/* Admin Executive Profile Card (Glassmorphism Card) */}
        <div className="admin-executive-card">
          <div className="admin-avatar-wrap">
            {userInfo?.image ? (
              <img
                src={
                  userInfo.image.startsWith('data:')
                    ? userInfo.image
                    : `data:image/jpeg;base64,${userInfo.image}`
                }
                alt={adminFullName}
                className="admin-avatar-img"
              />
            ) : (
              <div className="admin-avatar-placeholder">
                {(userInfo?.firstName || 'A').charAt(0).toUpperCase()}
              </div>
            )}
            <span className="admin-status-dot online" title="Hệ thống đang hoạt động an toàn" />
          </div>

          {!collapsed && (
            <div className="admin-meta">
              <h4 className="admin-fullname" title={adminFullName}>
                {adminFullName}
              </h4>
              <p className="admin-role-title">Quản trị Tối cao (Super Admin)</p>
              <div className="admin-status-pill">
                <span className="pulse-circle" />
                <span>Hệ thống An toàn</span>
              </div>
            </div>
          )}
        </div>

        {/* Navigator Menu */}
        <Navigator collapsed={collapsed} />
      </aside>

      {/* ===== NỘI DUNG PHẢI ===== */}
      <div className="system-content tw-bg-[#F4F7FE]">
        {/* Header top bar */}
        <header className="system-header">
          <div className="header-left">
            <span className="header-page-context">
              <ShieldCheck size={16} className="text-indigo-600 mr-2 inline" />
              <strong className="text-slate-800">BookingCare Management Center</strong>
            </span>
          </div>

          <div className="header-right">
            {/* Language Switcher */}
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

            {/* Admin Realtime Global Notification Bell */}
            <NotificationBell role="admin" className="admin-notification-bell" />

            <span className="admin-badge">
              <FormattedMessage
                id={
                  userInfo?.roleId === 'R1'
                    ? 'admin.manage.system-layout.role-admin'
                    : 'admin.manage.system-layout.role-doctor'
                }
              />
            </span>

            <span className="admin-name">
              {adminFullName}
            </span>
          </div>
        </header>

        {/* Trang con render ở đây */}
        <main className="system-body">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default SystemLayout;
