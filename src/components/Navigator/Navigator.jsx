// src/components/Navigator/Navigator.jsx
// Sidebar navigation — menu theo role (REQ-AU-005)
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useIntl } from 'react-intl';
import { path } from '../../utils/constants';
import { processLogout } from '../../redux/slices/userSlice';
import { adminMenu, doctorMenu } from '../Header/MenuData';
import './Navigator.scss';

// Icon mapping cho từng menu item
const MENU_ICONS = {
  'menu.admin.manage-user': '👥',
  'menu.admin.manage-doctor': '🩺',
  'menu.admin.manage-schedule': '📅',
  'menu.admin.manage-specialty': '🔬',
  'menu.admin.manage-clinic': '🏥',
  'menu.doctor.manage-patient': '🗓️',
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
        {menuItems.map((item, index) => (
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
        ))}
      </ul>

      <div className="nav-footer">
        <button className="btn-logout" onClick={handleLogout}>
          <span>🚪</span>
          <span>Đăng xuất</span>
        </button>
      </div>
    </nav>
  );
};

export default Navigator;
