// src/containers/DoctorPortal/DoctorLayout.jsx
// [Doctor Portal Redesign] Clinical Workspace Layout — Giao diện chuyên biệt cho Bác sĩ (Doctor Portal)
// Phân biệt hoàn toàn với Admin Panel: Clinical Teal/Slate Palette, Medical Identity, Doctor Profile Card, Smooth Collapse
import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { processLogout } from '../../redux/slices/userSlice';
import { changeLanguage } from '../../redux/slices/appSlice';
import { path, LANGUAGES } from '../../utils/constants';
import {
  Stethoscope,
  CalendarDays,
  CalendarCheck,
  Wallet,
  UserCog,
  LogOut,
  Bell,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Activity,
  HeartPulse,
  Sun,
  Moon,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import './DoctorLayout.scss';

const DOCTOR_NAV_GROUPS = [
  {
    groupTitle: 'LÂM SÀNG & KHÁM BỆNH',
    items: [
      {
        icon: CalendarDays,
        label: 'Lịch khám & Bệnh nhân',
        to: '/doctor-dashboard/manage-patient',
        badge: 'Hôm nay',
      },
      {
        icon: CalendarCheck,
        label: 'Lịch trực & Ca khám',
        to: '/doctor-dashboard/manage-schedule',
      },
    ],
  },
  {
    groupTitle: 'TÀI CHÍNH & BÁO CÁO',
    items: [
      {
        icon: Wallet,
        label: 'Thu nhập & Thống kê',
        to: '/doctor-dashboard/doctor-revenue',
      },
    ],
  },
  {
    groupTitle: 'CÀI ĐẶT & HỆ THỐNG',
    items: [
      {
        icon: UserCog,
        label: 'Hồ sơ & Cài đặt',
        to: '/doctor-dashboard/doctor-profile',
      },
    ],
  },
];

const DoctorLayout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { userInfo } = useSelector((state) => state.user);
  const language = useSelector((state) => state.app.language);
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    dispatch(processLogout());
    navigate(path.LOGIN);
  };

  const doctorName = userInfo
    ? `${userInfo.lastName || ''} ${userInfo.firstName || ''}`.trim()
    : 'Bác sĩ';

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Chào buổi sáng' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';

  const todayStr = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return (
    <div className={`doctor-portal-layout${collapsed ? ' is-collapsed' : ''}`}>
      {/* ========================================================= */}
      {/* 1. CLINICAL SIDEBAR                                      */}
      {/* ========================================================= */}
      <aside className="dp-sidebar">
        {/* Header: Logo & Identity */}
        <div className="dp-sidebar__brand">
          <div className="brand-icon-wrapper" onClick={() => navigate('/doctor-dashboard/manage-patient')}>
            <Stethoscope size={22} className="brand-stethoscope" />
            <span className="brand-pulse-dot" />
          </div>

          {!collapsed && (
            <div className="brand-info">
              <span className="brand-title">BookingCare</span>
              <span className="brand-badge-doctor">
                <HeartPulse size={11} className="badge-icon" />
                DOCTOR PORTAL
              </span>
            </div>
          )}

          <button
            type="button"
            className="dp-collapse-toggle"
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
            aria-label="Toggle sidebar"
          >
            {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>
        </div>

        {/* Doctor Mini Profile Card */}
        <div className="dp-doctor-card">
          <div className="doctor-avatar-wrap">
            {userInfo?.image ? (
              <img
                src={
                  userInfo.image.startsWith('data:')
                    ? userInfo.image
                    : `data:image/jpeg;base64,${userInfo.image}`
                }
                alt={doctorName}
                className="doctor-avatar-img"
              />
            ) : (
              <div className="doctor-avatar-placeholder">
                {doctorName.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="doctor-status-dot online" title="Đang trực ca" />
          </div>

          {!collapsed && (
            <div className="doctor-meta">
              <h4 className="doctor-name" title={`BS. ${doctorName}`}>
                BS. {doctorName}
              </h4>
              <p className="doctor-title">Bác sĩ Chuyên khoa</p>
              <div className="doctor-status-pill">
                <span className="pulse-circle" />
                <span>Sẵn sàng khám</span>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Menu */}
        <nav className="dp-nav-container">
          {DOCTOR_NAV_GROUPS.map((group, gIdx) => (
            <div key={gIdx} className="dp-nav-group">
              {!collapsed && (
                <div className="dp-nav-group-title">
                  <span>{group.groupTitle}</span>
                </div>
              )}

              <ul className="dp-nav-list">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    location.pathname === item.to ||
                    (item.to === '/doctor-dashboard/manage-patient' &&
                      location.pathname.startsWith('/doctor-dashboard/encounter'));

                  return (
                    <li key={item.to} className="dp-nav-item">
                      <NavLink
                        to={item.to}
                        className={`dp-nav-link${isActive ? ' active' : ''}`}
                        title={collapsed ? item.label : undefined}
                      >
                        <span className="nav-icon">
                          <Icon size={18} strokeWidth={2} />
                        </span>

                        {!collapsed && (
                          <span className="nav-label">{item.label}</span>
                        )}

                        {!collapsed && item.badge && (
                          <span className="nav-badge-pill">{item.badge}</span>
                        )}

                        {isActive && <span className="active-indicator-bar" />}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Bottom Actions: Logout */}
        <div className="dp-sidebar-footer">
          <button
            type="button"
            className="dp-logout-btn"
            onClick={handleLogout}
            title={collapsed ? 'Đăng xuất' : undefined}
          >
            <span className="logout-icon">
              <LogOut size={17} strokeWidth={2} />
            </span>
            {!collapsed && <span className="logout-text">Đăng xuất</span>}
          </button>
        </div>
      </aside>

      {/* ========================================================= */}
      {/* 2. MAIN VIEWPORT & CLINICAL TOPBAR                        */}
      {/* ========================================================= */}
      <div className="dp-viewport">
        {/* Clinical Topbar */}
        <header className="dp-topbar">
          <div className="topbar-left">
            <div className="topbar-greeting">
              <div className="greeting-main">
                {hour < 18 ? (
                  <Sun size={17} className="sun-icon" />
                ) : (
                  <Moon size={17} className="moon-icon" />
                )}
                <span>
                  {greeting},{' '}
                  <strong className="name-highlight">BS. {doctorName}</strong>
                </span>
              </div>
              <div className="greeting-sub">
                <Clock size={13} className="clock-icon" />
                <span>{todayStr}</span>
                <span className="dot-sep">•</span>
                <span className="badge-active-shift">
                  <ShieldCheck size={12} />
                  Ca trực: Đang mở
                </span>
              </div>
            </div>
          </div>

          <div className="topbar-right">
            {/* Language Switcher */}
            <div className="dp-lang-switcher">
              <button
                type="button"
                className={`dp-lang-btn ${language === LANGUAGES.VI ? 'active' : ''}`}
                onClick={() => dispatch(changeLanguage(LANGUAGES.VI))}
                title="Tiếng Việt"
              >
                VN
              </button>
              <button
                type="button"
                className={`dp-lang-btn ${language === LANGUAGES.EN ? 'active' : ''}`}
                onClick={() => dispatch(changeLanguage(LANGUAGES.EN))}
                title="English"
              >
                EN
              </button>
            </div>

            {/* Notification Bell */}
            <button type="button" className="dp-icon-action-btn" title="Thông báo phòng khám">
              <Bell size={18} />
              <span className="action-badge-dot" />
            </button>

            {/* Topbar User Snippet */}
            <div
              className="dp-user-snippet"
              onClick={() => navigate('/doctor-dashboard/doctor-profile')}
              title="Xem hồ sơ chuyên môn"
            >
              {userInfo?.image ? (
                <img
                  src={
                    userInfo.image.startsWith('data:')
                      ? userInfo.image
                      : `data:image/jpeg;base64,${userInfo.image}`
                  }
                  alt={doctorName}
                  className="snippet-avatar"
                />
              ) : (
                <div className="snippet-avatar-fallback">
                  {doctorName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="snippet-text">
                <span className="snippet-name">BS. {doctorName}</span>
                <span className="snippet-role">Bác sĩ</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content Body */}
        <main className="dp-main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DoctorLayout;
