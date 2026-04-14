// src/components/Header/Header.jsx
// Header component — Logo, nav, VN/EN switch, login/logout
// [Phase 9.4] Thêm Avatar dropdown cho Patient (R3)
import React, { useState, useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';

import { changeLanguage } from '../../redux/slices/appSlice';
import { processLogout } from '../../redux/slices/userSlice';
import { LANGUAGES, USER_ROLE, path } from '../../utils/constants';
import { adminMenu, doctorMenu } from './MenuData';

import './Header.scss';

const Header = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Redux state
  const language = useSelector((state) => state.app.language);
  const { isLoggedIn, userInfo } = useSelector((state) => state.user);

  // Mobile menu toggle
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // [Phase 9.4] Patient avatar dropdown toggle
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // [Phase 9.4] Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Chuyển đổi ngôn ngữ — SRS IL-002
  const handleChangeLanguage = (lang) => {
    dispatch(changeLanguage(lang));
  };

  // Đăng xuất — SRS REQ-AU-006
  const handleLogout = () => {
    setIsDropdownOpen(false);
    dispatch(processLogout());
    navigate(path.LOGIN);
  };

  // Đi đến dashboard theo role
  const handleGoToDashboard = () => {
    if (userInfo?.roleId === USER_ROLE.ADMIN) {
      navigate(path.USER_MANAGE);
    } else if (userInfo?.roleId === USER_ROLE.DOCTOR) {
      navigate(path.MANAGE_PATIENT);
    }
  };

  // Lấy menu theo role
  const getMenuByRole = () => {
    if (!isLoggedIn || !userInfo) return [];
    if (userInfo.roleId === USER_ROLE.ADMIN) return adminMenu;
    if (userInfo.roleId === USER_ROLE.DOCTOR) return doctorMenu;
    return [];
  };

  // ═══════════════════════════════════════════════════════════
  // [Phase 9.4] Render avatar cho Patient (R3)
  // Ưu tiên 1: userInfo.image (Base64 từ DB)
  // Fallback:  Icon mặc định (fas fa-user-circle)
  // ═══════════════════════════════════════════════════════════
  const renderPatientAvatar = () => {
    const imageUrl = userInfo?.image;
    if (imageUrl) {
      // Nếu image là Buffer từ DB, convert sang src hiển thị được
      const src = typeof imageUrl === 'string' && imageUrl.startsWith('data:')
        ? imageUrl
        : `data:image/jpeg;base64,${imageUrl}`;
      return <img src={src} alt="Avatar" className="patient-avatar-img" />;
    }
    // Fallback: icon mặc định
    return <i className="fas fa-user-circle patient-avatar-icon" />;
  };

  return (
    <header className="header-container">
      <div className="header-content">
        {/* ===== LEFT: Logo + Hamburger ===== */}
        <div className="header-left">
          <button
            className="hamburger-btn"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <i className={`fas ${isMenuOpen ? 'fa-times' : 'fa-bars'}`} />
          </button>

          <Link to={path.HOME} className="header-logo" title="BookingCare">
            <span className="logo-text">BookingCare</span>
          </Link>
        </div>

        {/* ===== CENTER: Navigation Links ===== */}
        <nav className={`header-nav ${isMenuOpen ? 'open' : ''}`}>
          <Link to={path.HOME} className="nav-item">
            <strong><FormattedMessage id="header.specialty" /></strong>
            <span><FormattedMessage id="header.find-doctor" /></span>
          </Link>
          <Link to={path.HOME} className="nav-item">
            <strong><FormattedMessage id="header.health-facility" /></strong>
            <span><FormattedMessage id="header.find-doctor" /></span>
          </Link>
          <Link to={path.HOME} className="nav-item">
            <strong><FormattedMessage id="header.doctor" /></strong>
            <span><FormattedMessage id="header.find-doctor" /></span>
          </Link>
          <Link to={path.HOME} className="nav-item">
            <strong><FormattedMessage id="header.fee" /></strong>
            <span><FormattedMessage id="header.find-doctor" /></span>
          </Link>
        </nav>

        {/* ===== RIGHT: Language + Auth ===== */}
        <div className="header-right">
          {/* Nút chuyển ngôn ngữ */}
          <div className="language-switch">
            <button
              className={`lang-btn ${language === LANGUAGES.VI ? 'active' : ''}`}
              onClick={() => handleChangeLanguage(LANGUAGES.VI)}
            >
              VN
            </button>
            <button
              className={`lang-btn ${language === LANGUAGES.EN ? 'active' : ''}`}
              onClick={() => handleChangeLanguage(LANGUAGES.EN)}
            >
              EN
            </button>
          </div>

          {/* Auth buttons */}
          {isLoggedIn ? (
            <div className="auth-actions">
              {/* ═══════════════════════════════════
                  [Phase 9.4] Patient (R3): Avatar + Dropdown
                  Admin/Doctor: Welcome text + dashboard btn
              ═══════════════════════════════════ */}
              {userInfo?.roleId === USER_ROLE.PATIENT ? (
                // Patient → Avatar dropdown
                <div className="patient-dropdown" ref={dropdownRef}>
                  <button
                    className="patient-avatar-btn"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    title={userInfo?.firstName || ''}
                  >
                    {renderPatientAvatar()}
                  </button>

                  {/* Dropdown menu */}
                  {isDropdownOpen && (
                    <div className="patient-dropdown-menu">
                      <div className="dropdown-user-info">
                        <span className="dropdown-user-name">
                          {userInfo?.lastName} {userInfo?.firstName}
                        </span>
                        <span className="dropdown-user-email">{userInfo?.email}</span>
                      </div>
                      <div className="dropdown-divider" />
                      <Link
                        to="/patient/profile"
                        className="dropdown-item"
                        onClick={() => setIsDropdownOpen(false)}
                      >
                        <i className="fas fa-user" />
                        <FormattedMessage id="header.patient-portal" />
                      </Link>
                      <button className="dropdown-item dropdown-item--danger" onClick={handleLogout}>
                        <i className="fas fa-sign-out-alt" />
                        <FormattedMessage id="header.patient-logout" />
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                // Admin/Doctor → Welcome + Dashboard + Logout buttons
                <>
                  <span className="welcome-text">
                    <FormattedMessage id="common.welcome" />
                    {userInfo?.firstName || ''}
                  </span>
                  <button
                    className="dashboard-btn"
                    onClick={handleGoToDashboard}
                    title="Dashboard"
                  >
                    <i className="fas fa-th-large" />
                  </button>
                  <button className="logout-btn" onClick={handleLogout}>
                    <i className="fas fa-sign-out-alt" />
                  </button>
                </>
              )}
            </div>
          ) : (
            <button
              className="login-btn"
              onClick={() => navigate(path.LOGIN)}
            >
              <FormattedMessage id="common.login" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
