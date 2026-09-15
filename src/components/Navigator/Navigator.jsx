// src/components/Navigator/Navigator.jsx
// [Phase C] Sidebar phân nhóm master-detail — type:'group' support
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { FormattedMessage, useIntl } from 'react-intl';
import { path } from '../../utils/constants';
import { processLogout } from '../../redux/slices/userSlice';
import { adminMenu, doctorMenu } from '../Header/MenuData';
import './Navigator.scss';

// Icon mapping cho từng menu item
const MENU_ICONS = {
  // Admin
  'menu.admin.dashboard':        '📊',
  'menu.admin.manage-user':      '👥',
  'menu.admin.manage-doctor':    '🩺',
  'menu.admin.manage-schedule':  '📅',
  'menu.admin.manage-specialty': '🔬',
  'menu.admin.manage-clinic':    '🏥',
  // [Phase C] Admin new
  'menu.admin.medical-catalog':  '📋',
  'menu.admin.medicine':         '💊',
  'menu.admin.system-settings':  '⚙️',
  // Doctor
  'menu.doctor.manage-patient':  '🗓️',
  'menu.doctor.manage-schedule': '📅',
  // [Phase C] Doctor new
  'menu.doctor.revenue':         '💰',
  'menu.doctor.profile':         '👤',
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
          // Render normal link (giữ nguyên behavior cũ)
          return (
            <li key={index} className="nav-item">
              <NavLink
                to={item.link}
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              >
                <span className="nav-icon">{MENU_ICONS[item.name] || '⚙️'}</span>
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
          <span>🚪</span>
          <span><FormattedMessage id="common.logout" /></span>
        </button>
      </div>
    </nav>
  );
};

export default Navigator;
