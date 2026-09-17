// src/components/Navigator/Navigator.jsx
// [Phase C] Sidebar phân nhóm master-detail — Collapsible Submenus & Clinical Vector Icons
import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
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
  Wallet,
  Contact,
  ChevronDown,
  ChevronRight,
  BarChart3
} from 'lucide-react';
import './Navigator.scss';

// Icon mapping cho từng menu item (Lucide icons chuẩn y tế)
const MENU_ICONS = {
  // Admin Analytics & Master
  'menu.admin.dashboard': LayoutDashboard,
  'menu.admin.analytics-bookings': CalendarCheck,
  'menu.admin.analytics-revenue': CircleDollarSign,
  'menu.admin.analytics-doctors': UserCheck,
  'menu.admin.analytics-patients': Users,
  'menu.admin.analytics-specialties': Building2,

  // Admin Clinical Operations
  'menu.admin.manage-patient': Contact,
  'menu.admin.manage-doctor': Stethoscope,
  'menu.admin.manage-schedule': Calendar,
  'menu.admin.manage-clinic': Building2,
  'menu.admin.manage-specialty': Layers,
  'menu.admin.medical-catalog': ClipboardList,
  'menu.admin.medicine': Pill,

  // Admin System
  'menu.admin.financial-policies': CircleDollarSign,
  'menu.admin.manage-user': Users,
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
  const location = useLocation();
  const { formatMessage } = useIntl();
  const { userInfo } = useSelector((state) => state.user);

  // Trạng thái mở/đóng submenu theo tên menu item
  const [expandedMenus, setExpandedMenus] = useState({});

  // Lấy menu theo role (REQ-AU-005)
  const menuItems =
    userInfo?.roleId === 'R1'
      ? adminMenu
      : userInfo?.roleId === 'R2'
        ? doctorMenu
        : [];

  // Tự động mở submenu nếu đường dẫn hiện tại khớp với submenu con
  useEffect(() => {
    menuItems.forEach((item) => {
      if (item.subMenus && item.subMenus.some((sub) => location.pathname === sub.link)) {
        setExpandedMenus((prev) => ({ ...prev, [item.name]: true }));
      }
    });
  }, [location.pathname, menuItems]);

  const toggleSubmenu = (menuName) => {
    setExpandedMenus((prev) => ({
      ...prev,
      [menuName]: !prev[menuName],
    }));
  };

  const handleLogout = () => {
    dispatch(processLogout());
    navigate(path.LOGIN);
  };

  return (
    <nav className="navigator">
      <ul className="nav-list">
        {menuItems.map((item, index) => {
          // Render group header label
          if (item.type === 'group') {
            return (
              <li key={`group-${index}`} className="nav-group-label">
                <span>{item.label}</span>
              </li>
            );
          }

          const IconComponent = MENU_ICONS[item.name] || Settings;
          const hasSubmenus = Array.isArray(item.subMenus) && item.subMenus.length > 0;
          const isSubActive = hasSubmenus && item.subMenus.some((sub) => location.pathname === sub.link);
          const isExpanded = expandedMenus[item.name] ?? isSubActive;

          if (hasSubmenus) {
            return (
              <li key={index} className={`nav-item has-submenus${isSubActive ? ' child-active' : ''}`}>
                <div className="nav-master-row">
                  <NavLink
                    to={item.link}
                    end={item.link === '/system/dashboard'}
                    className={({ isActive }) => `nav-link master-link${isActive ? ' active' : ''}`}
                  >
                    <span className="nav-icon">
                      <IconComponent size={17} strokeWidth={2} />
                    </span>
                    <span className="nav-label">
                      {formatMessage({ id: item.name })}
                    </span>
                  </NavLink>

                  <button
                    type="button"
                    className={`btn-submenu-toggle${isExpanded ? ' expanded' : ''}`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleSubmenu(item.name);
                    }}
                    title={isExpanded ? 'Thu gọn báo cáo' : 'Mở rộng báo cáo'}
                  >
                    {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                  </button>
                </div>

                {/* Danh sách sub-reports theo dạng Master - Detail */}
                {isExpanded && (
                  <ul className="nav-sub-list">
                    {item.subMenus.map((sub, sIdx) => {
                      const SubIcon = MENU_ICONS[sub.name] || BarChart3;
                      return (
                        <li key={`sub-${sIdx}`} className="nav-sub-item">
                          <NavLink
                            to={sub.link}
                            className={({ isActive }) => `nav-sub-link${isActive ? ' active' : ''}`}
                          >
                            <span className="nav-sub-icon">
                              <SubIcon size={14} strokeWidth={2} />
                            </span>
                            <span className="nav-sub-label">
                              {formatMessage({ id: sub.name })}
                            </span>
                          </NavLink>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          }

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
