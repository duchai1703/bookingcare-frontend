// src/containers/PatientPortal/PatientLayout.jsx
// [Redesign] Patient Portal Layout đồng bộ Design System BookingCare
// Tích hợp Header/Footer công khai, loại bỏ dark navy sidebar, layout thẻ y tế trang nhã
import React from 'react';
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { processLogout } from '../../redux/slices/userSlice';
import { persistor } from '../../redux/store';
import Header from '../../components/Header/Header';
import Footer from '../../components/Footer/Footer';
import Breadcrumb from '../../components/Common/Breadcrumb';
import './PatientLayout.scss';

const PatientLayout = () => {
  const { userInfo } = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = async () => {
    dispatch(processLogout());
    await persistor.flush();
    navigate('/login');
  };

  const renderAvatar = () => {
    const img = userInfo?.image;
    if (img) {
      const src = typeof img === 'string' && img.startsWith('data:') ? img : `data:image/jpeg;base64,${img}`;
      return <img src={src} alt="Avatar" className="pl-avatar-img" />;
    }
    return <div className="pl-avatar-fallback">{userInfo?.firstName ? userInfo.firstName.charAt(0).toUpperCase() : '👤'}</div>;
  };

  return (
    <div className="patient-portal-root">
      {/* 1. Header chung của BookingCare */}
      <Header />

      {/* 2. Breadcrumb / Banner định hướng */}
      <div className="patient-portal-breadcrumb-bar">
        <div className="portal-container">
          <Breadcrumb
            items={[
              { label: 'Trang chủ', link: '/' },
              { label: 'Cổng bệnh nhân' },
            ]}
          />
        </div>
      </div>

      {/* 3. Nội dung chính: 2 Cột chuẩn mực */}
      <div className="patient-portal-body">
        <div className="portal-container">
          <div className="portal-grid">
            {/* CỘT TRÁI: Patient Navigation Card */}
            <aside className="portal-sidebar-card">
              <div className="patient-mini-profile">
                <div className="patient-avatar-box">{renderAvatar()}</div>
                <div className="patient-text-box">
                  <h3 className="patient-fullname">
                    {userInfo?.lastName} {userInfo?.firstName}
                  </h3>
                  <span className="patient-role-pill">Bệnh nhân</span>
                  {userInfo?.email && <span className="patient-email-text">{userInfo.email}</span>}
                </div>
              </div>

              <div className="sidebar-menu-divider" />

              <nav className="portal-nav-list">
                <NavLink
                  to="/patient/overview"
                  className={({ isActive }) => `portal-nav-item ${isActive ? 'active' : ''}`}
                >
                  <i className="fas fa-th-large" />
                  <span>Tổng quan</span>
                </NavLink>

                <NavLink
                  to="/patient/history"
                  className={({ isActive }) => `portal-nav-item ${isActive ? 'active' : ''}`}
                >
                  <i className="far fa-calendar-alt" />
                  <span>Lịch khám của tôi</span>
                </NavLink>

                <NavLink
                  to="/patient/profile"
                  className={({ isActive }) => `portal-nav-item ${isActive ? 'active' : ''}`}
                >
                  <i className="far fa-user-circle" />
                  <span>Hồ sơ cá nhân</span>
                </NavLink>

                <button type="button" className="portal-nav-item portal-nav-item--logout" onClick={handleLogout}>
                  <i className="fas fa-sign-out-alt" />
                  <span>Đăng xuất</span>
                </button>
              </nav>

              <div className="sidebar-extra-tip">
                <p>
                  Cần hỗ trợ y tế khẩn cấp?
                  <br />
                  <strong>Hotline: 1900-2805</strong>
                </p>
              </div>
            </aside>

            {/* CỘT PHẢI: Nội dung trang con */}
            <main className="portal-main-content">
              <Outlet />
            </main>
          </div>
        </div>
      </div>

      {/* 4. Footer chung của BookingCare */}
      <Footer />
    </div>
  );
};

export default PatientLayout;
