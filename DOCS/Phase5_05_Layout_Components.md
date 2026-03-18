# 🎨 BƯỚC 5 — LAYOUT: HEADER, FOOTER, GLOBAL STYLES

> **Mục tiêu:** Xây dựng Header (logo, navigation, language toggle, login), Footer, và global SCSS  
> **Thời gian:** Ngày 4-5  
> **SRS liên quan:** REQ-AU-005 (menu theo role), IL-002 (chuyển ngôn ngữ), QA-US-004 (responsive)

---

## 5.1 Global Styles — `src/styles/_variables.scss`

```scss
// src/styles/_variables.scss
// ===== COLOR TOKENS (Theme BookingCare) =====
$primary:       #45c3d2;       // Xanh BookingCare chính
$primary-dark:  #2d8f9e;       // Xanh đậm (hover)
$primary-light: #e8f8fa;       // Xanh nhạt (background)

$secondary:     #f5f5f5;       // Xám nhạt (background section)
$bg-white:      #ffffff;
$bg-dark:       #1a1a2e;       // Nền tối (footer)

$text-primary:  #333333;       // Text chính
$text-secondary:#666666;       // Text phụ
$text-light:    #999999;       // Text nhạt
$text-white:    #ffffff;

$danger:        #e74c3c;       // Đỏ (lỗi, xóa)
$success:       #27ae60;       // Xanh lá (thành công)
$warning:       #f39c12;       // Cam (cảnh báo)

$border-color:  #e0e0e0;       // Viền

// ===== FONT =====
$font-family:   'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
$font-size-base: 14px;
$font-size-sm:   12px;
$font-size-lg:   16px;
$font-size-xl:   20px;

// ===== SPACING =====
$spacing-xs:    4px;
$spacing-sm:    8px;
$spacing-md:    16px;
$spacing-lg:    24px;
$spacing-xl:    40px;

// ===== BREAKPOINTS (QA-US-004: responsive) =====
$mobile:        768px;
$tablet:        1024px;
$desktop:       1200px;

// ===== SHADOWS =====
$shadow-sm:     0 1px 3px rgba(0, 0, 0, 0.08);
$shadow-md:     0 4px 12px rgba(0, 0, 0, 0.1);
$shadow-lg:     0 8px 24px rgba(0, 0, 0, 0.12);

// ===== BORDER RADIUS =====
$radius-sm:     4px;
$radius-md:     8px;
$radius-lg:     12px;
$radius-round:  50%;
```

---

## 5.2 Mixins — `src/styles/_mixins.scss`

```scss
// src/styles/_mixins.scss

// Responsive breakpoints
@mixin mobile {
  @media (max-width: $mobile) {
    @content;
  }
}

@mixin tablet {
  @media (max-width: $tablet) {
    @content;
  }
}

@mixin desktop {
  @media (min-width: $desktop) {
    @content;
  }
}

// Flexbox center
@mixin flex-center {
  display: flex;
  justify-content: center;
  align-items: center;
}

// Text ellipsis (1 dòng)
@mixin text-ellipsis {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

// Section padding chuẩn
@mixin section-padding {
  padding: $spacing-xl 0;
  @include mobile {
    padding: $spacing-lg 0;
  }
}
```

---

## 5.3 Global Styles — `src/styles/global.scss`

```scss
// src/styles/global.scss
// Import Google Fonts
@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap');

// ===== RESET & BASE =====
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html {
  font-size: $font-size-base;
  scroll-behavior: smooth;
}

body {
  font-family: $font-family;
  color: $text-primary;
  background-color: $bg-white;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

a {
  text-decoration: none;
  color: $primary;
  &:hover {
    color: $primary-dark;
  }
}

img {
  max-width: 100%;
  height: auto;
}

// ===== UTILITY CLASSES =====
.text-center { text-align: center; }
.text-primary { color: $primary !important; }
.text-danger { color: $danger !important; }

.section-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: $text-primary;
  margin-bottom: $spacing-lg;
  text-transform: uppercase;
}

.section-container {
  max-width: $desktop;
  margin: 0 auto;
  padding: 0 $spacing-md;
}

// ===== SLICK CAROUSEL CUSTOMIZATION =====
.slick-prev, .slick-next {
  z-index: 2;
  width: 40px;
  height: 40px;
  &::before {
    font-size: 30px;
    color: $primary;
  }
}
.slick-prev { left: -10px; }
.slick-next { right: -10px; }

.slick-dots li button::before {
  color: $primary;
}

// ===== SWEETALERT2 CUSTOM =====
.swal2-confirm {
  background-color: $primary !important;
}
```

---

## 5.4 Menu Data — `src/components/Header/MenuData.js` (REQ-AU-005)

Tách menu items ra file riêng để dễ quản lý. Menu hiển thị **động theo role** của user:

```js
// src/components/Header/MenuData.js
// Menu quản trị động theo role — SRS REQ-AU-005

// Menu cho Admin (R1) — hiển thị trên Sidebar/Navigator ở System Dashboard
export const adminMenuItems = [
  {
    label: 'menu.admin.user',           // key i18n
    link: '/system/user-manage',
    icon: 'fas fa-users',
  },
  {
    label: 'menu.admin.doctor',
    link: '/system/doctor-manage',
    icon: 'fas fa-user-md',
  },
  {
    label: 'menu.admin.clinic',
    link: '/system/clinic-manage',
    icon: 'fas fa-hospital',
  },
  {
    label: 'menu.admin.specialty',
    link: '/system/specialty-manage',
    icon: 'fas fa-stethoscope',
  },
  {
    label: 'menu.admin.schedule',
    link: '/system/schedule-manage',
    icon: 'fas fa-calendar-alt',
  },
];

// Menu cho Doctor (R2)
export const doctorMenuItems = [
  {
    label: 'menu.doctor.manage-patient',
    link: '/doctor-dashboard/manage-patient',
    icon: 'fas fa-procedures',
  },
];

/**
 * Lấy menu items theo roleId
 * @param {string} roleId - 'R1' (Admin), 'R2' (Doctor)
 * @returns {Array} menu items phù hợp
 */
export const getMenuByRole = (roleId) => {
  switch (roleId) {
    case 'R1': return adminMenuItems;
    case 'R2': return doctorMenuItems;
    default: return [];
  }
};
```

**Cách dùng:**
```jsx
import { getMenuByRole } from './MenuData';

// Trong component
const menuItems = getMenuByRole(userInfo?.roleId);
// R1 → [{label: 'menu.admin.user', link: '/system/user-manage', icon: '...'}, ...]
// R2 → [{label: 'menu.doctor.manage-patient', ...}]
// R3 → []
```

> 💡 **File này cũng sẽ được dùng bởi Navigator component** (sidebar trong System Dashboard) ở giai đoạn 6.

---

## 5.5 Header Component — `src/components/Header/Header.jsx`

```jsx
// src/components/Header/Header.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';
import { useSelector, useDispatch } from 'react-redux';
import { changeLanguage } from '../../redux/slices/appSlice';
import { processLogout } from '../../redux/slices/userSlice';
import { LANGUAGE, ROLE, path } from '../../utils/constants';
import { getMenuByRole } from './MenuData';
import './Header.scss';

const Header = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { language } = useSelector((state) => state.app);
  const { isLoggedIn, userInfo } = useSelector((state) => state.user);
  const [showMenu, setShowMenu] = useState(false);

  // Chuyển đổi ngôn ngữ — SRS IL-002
  const handleChangeLanguage = (lang) => {
    dispatch(changeLanguage(lang));
  };

  // Đăng xuất
  const handleLogout = () => {
    dispatch(processLogout());
    navigate(path.HOME);
  };

  // Chuyển đến dashboard theo role — REQ-AU-005
  const handleNavigateToDashboard = () => {
    if (!userInfo) return;
    if (userInfo.roleId === ROLE.ADMIN) {
      navigate(path.USER_MANAGE);
    } else if (userInfo.roleId === ROLE.DOCTOR) {
      navigate(path.MANAGE_PATIENT);
    }
  };

  return (
    <div className="home-header-container">
      <div className="home-header-content">
        {/* ===== LEFT: Logo + Menu ===== */}
        <div className="left-content">
          <div className="header-logo" onClick={() => navigate(path.HOME)}>
            <span className="logo-text">BookingCare</span>
          </div>

          <ul className="header-menu">
            <li>
              <Link to={path.HOME}>
                <FormattedMessage id="homeheader.specialty" />
              </Link>
            </li>
            <li>
              <Link to={path.HOME}>
                <FormattedMessage id="homeheader.health-facility" />
              </Link>
            </li>
            <li>
              <Link to={path.HOME}>
                <FormattedMessage id="homeheader.doctor" />
              </Link>
            </li>
          </ul>
        </div>

        {/* ===== RIGHT: Language + Auth ===== */}
        <div className="right-content">
          {/* Nút chuyển ngôn ngữ — IL-002, IL-005 */}
          <div className="language-switcher">
            <span
              className={language === LANGUAGE.VI ? 'active' : ''}
              onClick={() => handleChangeLanguage(LANGUAGE.VI)}
            >
              VN
            </span>
            <span
              className={language === LANGUAGE.EN ? 'active' : ''}
              onClick={() => handleChangeLanguage(LANGUAGE.EN)}
            >
              EN
            </span>
          </div>

          {/* Auth buttons */}
          {isLoggedIn ? (
            <div className="user-actions">
              <span className="welcome-text">
                <FormattedMessage id="homeheader.welcome" />
                {userInfo?.firstName}
              </span>
              {/* Nút vào Dashboard (nếu Admin/Doctor) */}
              {(userInfo?.roleId === ROLE.ADMIN || userInfo?.roleId === ROLE.DOCTOR) && (
                <button className="btn-dashboard" onClick={handleNavigateToDashboard}>
                  Dashboard
                </button>
              )}
              <button className="btn-logout" onClick={handleLogout}>
                <FormattedMessage id="homeheader.logout" />
              </button>
            </div>
          ) : (
            <Link to={path.LOGIN} className="btn-login">
              <FormattedMessage id="homeheader.login" />
            </Link>
          )}

          {/* Hamburger menu (mobile) */}
          <div className="hamburger" onClick={() => setShowMenu(!showMenu)}>
            <i className="fas fa-bars"></i>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;
```

---

## 5.6 Header SCSS — `src/components/Header/Header.scss`

```scss
// src/components/Header/Header.scss
.home-header-container {
  background-color: $bg-white;
  box-shadow: $shadow-sm;
  position: sticky;
  top: 0;
  z-index: 100;
  height: 60px;

  .home-header-content {
    max-width: $desktop;
    margin: 0 auto;
    height: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 $spacing-md;
  }

  .left-content {
    display: flex;
    align-items: center;
    gap: $spacing-lg;

    .header-logo {
      cursor: pointer;
      .logo-text {
        font-size: 1.5rem;
        font-weight: 700;
        color: $primary;
      }
    }

    .header-menu {
      display: flex;
      list-style: none;
      gap: $spacing-lg;

      li a {
        color: $text-primary;
        font-size: $font-size-base;
        font-weight: 500;
        transition: color 0.2s;
        &:hover {
          color: $primary;
        }
      }

      @include mobile {
        display: none;
      }
    }
  }

  .right-content {
    display: flex;
    align-items: center;
    gap: $spacing-md;

    .language-switcher {
      display: flex;
      gap: $spacing-xs;

      span {
        padding: 4px 8px;
        cursor: pointer;
        font-weight: 500;
        font-size: $font-size-sm;
        border-radius: $radius-sm;
        color: $text-secondary;
        transition: all 0.2s;

        &.active {
          background-color: $primary;
          color: $text-white;
        }

        &:hover:not(.active) {
          background-color: $primary-light;
        }
      }
    }

    .btn-login {
      padding: 6px 16px;
      background-color: $primary;
      color: $text-white;
      border-radius: $radius-md;
      font-weight: 500;
      transition: background-color 0.2s;
      &:hover {
        background-color: $primary-dark;
        color: $text-white;
      }
    }

    .user-actions {
      display: flex;
      align-items: center;
      gap: $spacing-sm;

      .welcome-text {
        font-size: $font-size-sm;
        color: $text-secondary;
      }

      .btn-dashboard {
        padding: 4px 12px;
        background-color: $primary-light;
        color: $primary;
        border: 1px solid $primary;
        border-radius: $radius-sm;
        cursor: pointer;
        font-size: $font-size-sm;
        &:hover {
          background-color: $primary;
          color: $text-white;
        }
      }

      .btn-logout {
        padding: 4px 12px;
        background-color: $danger;
        color: $text-white;
        border: none;
        border-radius: $radius-sm;
        cursor: pointer;
        font-size: $font-size-sm;
        &:hover {
          opacity: 0.9;
        }
      }
    }

    .hamburger {
      display: none;
      cursor: pointer;
      font-size: 1.3rem;

      @include mobile {
        display: block;
      }
    }
  }
}
```

---

## 5.7 Footer Component — `src/components/Footer/Footer.jsx`

```jsx
// src/components/Footer/Footer.jsx
import React from 'react';
import './Footer.scss';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-left">
          <h3 className="footer-logo">BookingCare</h3>
          <p>Công ty Cổ phần Công nghệ BookingCare</p>
          <p>📍 28 Thành Thái, Phường 14, Quận 10, TP.HCM</p>
          <p>📞 024-7301-2468 (7h – 18h)</p>
        </div>
        <div className="footer-right">
          <p>© 2026 BookingCare — UIT VNU-HCM</p>
          <p>Đồ án 1 — Trần Đức Hải & Đặng Ngọc Trường Giang</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
```

```scss
// src/components/Footer/Footer.scss
.footer {
  background-color: $bg-dark;
  color: $text-white;
  padding: $spacing-xl $spacing-md;
  margin-top: auto;

  .footer-content {
    max-width: $desktop;
    margin: 0 auto;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: $spacing-lg;

    @include mobile {
      flex-direction: column;
      text-align: center;
    }
  }

  .footer-left {
    .footer-logo {
      color: $primary;
      font-size: 1.5rem;
      margin-bottom: $spacing-sm;
    }
    p {
      font-size: $font-size-sm;
      color: rgba(255, 255, 255, 0.7);
      margin-bottom: $spacing-xs;
    }
  }

  .footer-right {
    text-align: right;
    @include mobile {
      text-align: center;
    }
    p {
      font-size: $font-size-sm;
      color: rgba(255, 255, 255, 0.7);
      margin-bottom: $spacing-xs;
    }
  }
}
```

---

## 5.8 Loading Component — `src/components/Loading/Loading.jsx`

```jsx
// src/components/Loading/Loading.jsx
import React from 'react';
import { useSelector } from 'react-redux';

const Loading = () => {
  const isLoading = useSelector((state) => state.app.isLoading);

  if (!isLoading) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.3)', display: 'flex',
      justifyContent: 'center', alignItems: 'center', zIndex: 9999,
    }}>
      <div className="spinner-border text-light" role="status" style={{ width: '3rem', height: '3rem' }}>
        <span className="visually-hidden">Loading...</span>
      </div>
    </div>
  );
};

export default Loading;
```

---

## ✅ Checklist Bước 5

- [ ] `src/styles/_variables.scss` — Color, font, spacing, breakpoint tokens
- [ ] `src/styles/_mixins.scss` — Responsive + flexbox mixins
- [ ] `src/styles/global.scss` — Reset, base, slick custom, utilities
- [ ] `src/components/Header/MenuData.js` — Menu items theo role (REQ-AU-005)
- [ ] `src/components/Header/Header.jsx` — Logo, menu, language switch, auth buttons
- [ ] `src/components/Header/Header.scss` — Responsive header styling
- [ ] `src/components/Footer/Footer.jsx` — Thông tin công ty, copyright
- [ ] `src/components/Footer/Footer.scss` — Dark footer styling
- [ ] `src/components/Loading/Loading.jsx` — Full-screen spinner overlay
- [ ] Header responsive: menu ẩn trên mobile, hamburger hiện
- [ ] Language switch VN/EN hoạt động (text chuyển ngay không reload)

---

> 📖 **Tiếp theo:** Mở file [Phase5_06_HomePage.md](Phase5_06_HomePage.md) để xây dựng Trang chủ.
