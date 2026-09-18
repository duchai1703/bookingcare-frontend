// src/containers/DoctorPortal/DoctorLayout.jsx
// [Doctor Portal Redesign] Clinical Workspace Layout — DoctorLayout rieng biet khoi SystemLayout
import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { processLogout } from '../../redux/slices/userSlice';
import { path } from '../../utils/constants';
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Wallet,
  User,
  LogOut,
  Bell,
  ChevronLeft,
  ChevronRight,
  Stethoscope,
} from 'lucide-react';
import './DoctorLayout.scss';

const NAV_ITEMS = [
  {
    icon: LayoutDashboard,
    label: 'Tong quan',
    to: '/doctor-dashboard/dashboard',
  },
  {
    icon: CalendarDays,
    label: 'Lich kham',
    to: '/doctor-dashboard/appointments',
  },
  {
    icon: Users,
    label: 'Benh nhan',
    to: '/doctor-dashboard/patients',
  },
  {
    icon: Wallet,
    label: 'Thu nhap',
    to: '/doctor-dashboard/income',
  },
];

const BOTTOM_NAV = [
  {
    icon: User,
    label: 'Ho so & Cai dat',
    to: '/doctor-dashboard/profile',
  },
];

const DoctorLayout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { userInfo } = useSelector((state) => state.user);
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    dispatch(processLogout());
    navigate(path.LOGIN);
  };

  const doctorName = userInfo
    ? `${userInfo.lastName || ''} ${userInfo.firstName || ''}`.trim()
    : 'Bac si';

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Chao buoi sang' : hour < 18 ? 'Chao buoi chieu' : 'Chao buoi toi';

  const today = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return (
    <div className={`doctor-layout${collapsed ? ' collapsed' : ''}`}>
      <aside className="dl-sidebar">
        <div className="dl-logo">
          <div className="dl-logo__icon">
            <Stethoscope size={22} strokeWidth={2} />
          </div>
          {!collapsed && (
            <div className="dl-logo__text">
              <span className="dl-logo__brand">BookingCare</span>
              <span className="dl-logo__role">Khong gian Bac si</span>
            </div>
          )}
        </div>

        <button
          className="dl-collapse-btn"
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? 'Mo rong' : 'Thu gon'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        <nav className="dl-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `dl-nav__item${isActive ? ' active' : ''}`
              }
              title={collapsed ? item.label : undefined}
            >
              <span className="dl-nav__icon">
                <item.icon size={18} strokeWidth={2} />
              </span>
              {!collapsed && <span className="dl-nav__label">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="dl-nav-bottom">
          <div className="dl-divider" />
          {BOTTOM_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `dl-nav__item${isActive ? ' active' : ''}`
              }
              title={collapsed ? item.label : undefined}
            >
              <span className="dl-nav__icon">
                <item.icon size={18} strokeWidth={2} />
              </span>
              {!collapsed && <span className="dl-nav__label">{item.label}</span>}
            </NavLink>
          ))}

          <button
            className="dl-nav__item dl-nav__item--logout"
            onClick={handleLogout}
            title={collapsed ? 'Dang xuat' : undefined}
          >
            <span className="dl-nav__icon">
              <LogOut size={18} strokeWidth={2} />
            </span>
            {!collapsed && <span className="dl-nav__label">Dang xuat</span>}
          </button>
        </div>
      </aside>

      <div className="dl-main">
        <header className="dl-header">
          <div className="dl-header__greeting">
            <p className="dl-header__hi">
              {greeting}, <strong>BS. {doctorName}</strong>
            </p>
            <p className="dl-header__date">{today}</p>
          </div>

          <div className="dl-header__actions">
            <button className="dl-icon-btn" title="Thong bao">
              <Bell size={18} strokeWidth={2} />
              <span className="dl-notif-dot" />
            </button>

            <div className="dl-header__avatar" title={`BS. ${doctorName}`}>
              {userInfo?.image ? (
                <img
                  src={
                    userInfo.image.startsWith('data:')
                      ? userInfo.image
                      : `data:image/jpeg;base64,${userInfo.image}`
                  }
                  alt={doctorName}
                />
              ) : (
                <span>{doctorName.charAt(0).toUpperCase()}</span>
              )}
            </div>
          </div>
        </header>

        <main className="dl-body">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DoctorLayout;
