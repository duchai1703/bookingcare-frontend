// src/components/Navigator/Navigator.jsx
// [Phase C] Sidebar phân nhóm master-detail — type:'group' support
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { FormattedMessage, useIntl } from 'react-intl';
import { path } from '../../utils/constants';
import { processLogout } from '../../redux/slices/userSlice';
import { adminMenu, doctorMenu } from '../Header/MenuData';
import {
  LayoutDashboard,
  CalendarCheck,
  CircleDollarSign,
  UserCheck,
  Users,
  Building2,
  Stethoscope,
  Calendar,
  Layers,
  ClipboardList,
  Pill,
  Settings,
  LogOut,
  CalendarDays,
  User,
  Wallet
} from 'lucide-react';
import './Navigator.scss';

// Icon mapping cho từng menu item (Lucide icons)
const MENU_ICONS = {
  // Admin Analytics & Master
  'menu.admin.dashboard': LayoutDashboard,
  'menu.admin.analytics-bookings': CalendarCheck,
  'menu.admin.analytics-revenue': CircleDollarSign,
  'menu.admin.analytics-doctors': UserCheck,
  'menu.admin.analytics-patients': Users,
  'menu.admin.analytics-specialties': Building2,

  // Admin Operations
  'menu.admin.manage-user': Users,
  'menu.admin.manage-doctor': Stethoscope,
  'menu.admin.manage-schedule': Calendar,
  'menu.admin.manage-specialty': Layers,
  'menu.admin.manage-clinic': Building2,
  'menu.admin.medical-catalog': ClipboardList,
  'menu.admin.medicine': Pill,
  'menu.admin.system-settings': Settings,

  // Doctor
  'menu.doctor.manage-patient': CalendarDays,
  'menu.doctor.manage-schedule': Calendar,
  'menu.doctor.revenue': Wallet,
  'menu.doctor.profile': User,
};

const Navigator = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { formatMessage } = useIntl();
  const { userInfo } = useSelector((state) => state.user);

  // Lấy menu theo role (REQ-AU-005)
  const menuItems =
    userInfo?.roleId === 'R1'
      ? adminMenu
      : userInfo?.roleId === 'R2'
        ? doctorMenu
        : [];

  const handleLogout = () => {
    dispatch(processLogout());
    navigate(path.LOGIN);
  };

  return (
    <nav className="navigator">
      <ul className="nav-list">
        {menuItems.map((item, index) => {
          // [Phase C] Render group header label
          if (item.type === 'group') {
            return (
              <li key={`group-${index}`} className="nav-group-label">
                <span>{item.label}</span>
              </li>
            );
          }
          const IconComponent = MENU_ICONS[item.name] || Settings;
          return (
            <li key={index} className="nav-item">
              <NavLink
                to={item.link}
                end={item.link === '/system/dashboard'}
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              >
                <span className="nav-icon">
                  <IconComponent size={17} strokeWidth={2} />
                </span>
                <span className="nav-label">
                  {formatMessage({ id: item.name })}
                </span>
              </NavLink>
            </li>
          );
        })}
      </ul>

      <div className="nav-footer">
        <button className="btn-logout" onClick={handleLogout}>
          <LogOut size={16} strokeWidth={2} />
          <span><FormattedMessage id="common.logout" /></span>
        </button>
      </div>
    </nav>
  );
};

export default Navigator;
