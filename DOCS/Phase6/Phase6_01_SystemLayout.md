# 🏗️ BƯỚC 1 — HỆ THỐNG LAYOUT ADMIN (SIDEBAR + HEADER)

> **Mục tiêu:** Xây dựng khung giao diện Admin: Sidebar điều hướng theo role, Header, main content area với React Router `<Outlet/>`
> **Thời gian:** Ngày 1
> **SRS:** REQ-AU-005 (Menu hiển thị động theo role)

---

## 1.1 Cài Thêm Package Hỗ Trợ

Cài tất cả packages cần thiết cho GĐ6 ngay từ đầu:

```bash
npm install @uiw/react-md-editor
```

> `@uiw/react-md-editor` — Markdown editor có live preview, dùng trong DoctorManage, ClinicManage, SpecialtyManage (Bước 3, 4, 5)

---

## 1.2 Cập Nhật `SystemLayout.jsx`

Sửa file placeholder thành layout đầy đủ: **Sidebar trái + Content phải**

```jsx
// src/containers/System/SystemLayout.jsx
// Layout wrapper chung cho Admin (R1) và Doctor (R2) Dashboard
import React from 'react';
import { Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Navigator from '../../components/Navigator/Navigator';
import './SystemLayout.scss';

const SystemLayout = () => {
  // Lấy thông tin user từ Redux để điều chỉnh layout nếu cần
  const { userInfo } = useSelector((state) => state.user);

  return (
    <div className="system-layout">
      {/* ===== SIDEBAR TRÁI ===== */}
      <div className="system-sidebar">
        {/* Logo khu vực Admin */}
        <div className="sidebar-logo">
          <span className="logo-icon">🏥</span>
          <span className="logo-text">BookingCare</span>
          <span className="logo-sub">Admin Panel</span>
        </div>

        {/* Menu điều hướng theo role */}
        <Navigator />
      </div>

      {/* ===== NỘI DUNG PHẢI ===== */}
      <div className="system-content">
        {/* Header barTop */}
        <div className="system-header">
          <div className="header-left">
            <span className="breadcrumb">Dashboard</span>
          </div>
          <div className="header-right">
            <span className="admin-name">
              👤 {userInfo?.firstName} {userInfo?.lastName}
            </span>
          </div>
        </div>

        {/* Trang con (UserManage, DoctorManage, ...) */}
        <div className="system-body">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default SystemLayout;
```

---

## 1.3 Tạo `SystemLayout.scss`

```scss
// src/containers/System/SystemLayout.scss

@import '../../styles/variables';

.system-layout {
  display: flex;
  min-height: 100vh;
  background-color: #f0f2f5;

  // ===== SIDEBAR =====
  .system-sidebar {
    width: 250px;
    min-height: 100vh;
    background-color: #1a1a2e; // Dark navy — BookingCare admin style
    color: #fff;
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    z-index: 100;
    box-shadow: 2px 0 8px rgba(0, 0, 0, 0.3);

    .sidebar-logo {
      padding: 24px 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;

      .logo-icon {
        font-size: 2rem;
        display: block;
        margin-bottom: 6px;
      }

      .logo-text {
        font-size: 1.2rem;
        font-weight: 700;
        color: $primary;
        display: block;
      }

      .logo-sub {
        font-size: 0.7rem;
        color: rgba(255, 255, 255, 0.5);
        text-transform: uppercase;
        letter-spacing: 2px;
        display: block;
        margin-top: 2px;
      }
    }
  }

  // ===== MAIN CONTENT =====
  .system-content {
    flex: 1;
    margin-left: 250px; // Offset sidebar
    display: flex;
    flex-direction: column;
    min-height: 100vh;

    .system-header {
      height: 60px;
      background: #fff;
      border-bottom: 1px solid #e8e8e8;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 24px;
      position: sticky;
      top: 0;
      z-index: 99;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06);

      .breadcrumb {
        font-weight: 600;
        color: #333;
        font-size: 1rem;
      }

      .admin-name {
        font-size: 0.9rem;
        color: #666;
        background: #f5f5f5;
        padding: 6px 12px;
        border-radius: 20px;
      }
    }

    .system-body {
      flex: 1;
      padding: 24px;
    }
  }
}
```

---

## 1.4 Tạo `Navigator.jsx`

Component sidebar menu — **tự động hiển thị đúng menu theo role R1/R2**

```jsx
// src/components/Navigator/Navigator.jsx
// Sidebar navigation — menu theo role (REQ-AU-005)
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useIntl } from 'react-intl';
import { path, USER_ROLE } from '../../utils/constants';
import { processLogout } from '../../redux/slices/userSlice';
import MenuData from '../Header/MenuData';
import './Navigator.scss';

const Navigator = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { formatMessage } = useIntl();
  const { userInfo } = useSelector((state) => state.user);

  // Lấy menu phù hợp theo role
  const menuItems = MenuData.getMenuByRole(userInfo?.roleId);

  const handleLogout = () => {
    dispatch(processLogout());
    navigate(path.LOGIN);
  };

  return (
    <nav className="navigator">
      {/* Menu Items */}
      <ul className="nav-list">
        {menuItems.map((item, index) => (
          <li key={index} className="nav-item">
            <NavLink
              to={item.link}
              className={({ isActive }) =>
                `nav-link ${isActive ? 'active' : ''}`
              }
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">
                {formatMessage({ id: item.messageId })}
              </span>
            </NavLink>
          </li>
        ))}
      </ul>

      {/* Nút Đăng xuất */}
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
```

---

## 1.5 Tạo `Navigator.scss`

```scss
// src/components/Navigator/Navigator.scss

@import '../../styles/variables';

.navigator {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 16px 0;
  overflow-y: auto;

  .nav-list {
    list-style: none;
    margin: 0;
    padding: 0;
    flex: 1;
  }

  .nav-item {
    margin: 2px 8px;
  }

  .nav-link {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 16px;
    border-radius: 8px;
    text-decoration: none;
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.9rem;
    transition: all 0.2s ease;

    .nav-icon {
      font-size: 1.1rem;
      width: 24px;
      text-align: center;
      flex-shrink: 0;
    }

    .nav-label {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    &:hover {
      background: rgba(69, 195, 210, 0.15);
      color: $primary;
      transform: translateX(3px);
    }

    &.active {
      background: $primary;
      color: #fff;
      font-weight: 600;
      box-shadow: 0 4px 12px rgba(69, 195, 210, 0.4);

      .nav-icon {
        filter: brightness(0) invert(1);
      }
    }
  }

  .nav-footer {
    padding: 16px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    margin-top: auto;

    .btn-logout {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 10px;
      background: rgba(220, 53, 69, 0.15);
      color: #ff6b7a;
      border: 1px solid rgba(220, 53, 69, 0.3);
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.9rem;
      transition: all 0.2s;

      &:hover {
        background: #dc3545;
        color: #fff;
        border-color: #dc3545;
      }
    }
  }
}
```

---

## 1.6 Cập Nhật `MenuData.js` — Giữ Nguyên (Đã Đúng)

> ⚠️ **LƯU Ý (Cập nhật từ code thực tế):** File `MenuData.js` hiện có sẵn và đã đúng cấu trúc. KHÔNG dùng `messageId` hay `getMenuByRole()`. Giữ nguyên file gốc.

```js
// src/components/Header/MenuData.js (file hiện tại — GIỮ NGUYÊN)
import { path } from '../../utils/constants';

// ===== ADMIN MENU (R1) — 5 items =====
export const adminMenu = [
  { name: 'menu.admin.manage-user', link: path.USER_MANAGE },
  { name: 'menu.admin.manage-doctor', link: '/system/doctor-manage' },
  { name: 'menu.admin.manage-schedule', link: '/system/schedule-manage' },
  { name: 'menu.admin.manage-specialty', link: '/system/specialty-manage' },
  { name: 'menu.admin.manage-clinic', link: '/system/clinic-manage' },
];

// ===== DOCTOR MENU (R2) — 1 item =====
export const doctorMenu = [
  { name: 'menu.doctor.manage-patient', link: path.MANAGE_PATIENT },
];
```

> Icon cho từng menu được xử lý trong `Navigator.jsx` thông qua `MENU_ICONS` lookup table — **không** thêm trực tiếp vào `MenuData.js`.


---

## 1.7 Cập Nhật App.jsx — Thêm Routes Admin

Sửa `App.jsx` để thêm các route con cho từng trang quản trị:

```jsx
// Thêm imports ở đầu file App.jsx:
import UserManage from './System/Admin/UserManage';
import DoctorManage from './System/Admin/DoctorManage';
import ClinicManage from './System/Admin/ClinicManage';
import SpecialtyManage from './System/Admin/SpecialtyManage';
import ScheduleManage from './System/Admin/ScheduleManage';

// Thay route Admin hiện tại:
// CŨ:
<Route path={`${path.SYSTEM}/*`} element={<SystemLayout />} />

// MỚI:
import { Navigate } from 'react-router-dom'; // đã import sẵn trong App.jsx

<Route path={path.SYSTEM} element={<SystemLayout />}>
  {/* Default: /system → redirect /system/user-manage */}
  <Route index element={<Navigate to="user-manage" replace />} />
  <Route path="user-manage" element={<UserManage />} />
  <Route path="doctor-manage" element={<DoctorManage />} />
  <Route path="clinic-manage" element={<ClinicManage />} />
  <Route path="specialty-manage" element={<SpecialtyManage />} />
  <Route path="schedule-manage" element={<ScheduleManage />} />
</Route>
```

---

## 1.8 Translation Keys — Kiểm Tra (Keys Đã Có Sẵn)

> ⚠️ **LƯU Ý (Cập nhật từ code thực tế):** Các keys admin đã có sẵn trong `vi.json` từ các giai đoạn trước. KHÔNG cần thêm. Keys dùng đúng trong code là:

```json
// vi.json — Đã có sẵn (KHÔNG cần thêm):
{
  "menu.admin.manage-user": "Quản lý người dùng",
  "menu.admin.manage-doctor": "Quản lý bác sĩ",
  "menu.admin.manage-schedule": "Quản lý lịch khám bác sĩ",
  "menu.admin.manage-specialty": "Quản lý chuyên khoa",
  "menu.admin.manage-clinic": "Quản lý phòng khám",
  "menu.doctor.manage-patient": "Quản lý lịch hẹn bệnh nhân",
  "common.save": "Lưu",
  "common.cancel": "Hủy",
  "common.delete": "Xóa",
  "common.no-data": "Không có dữ liệu"
}
```

> `admin.add-new`, `admin.edit`, v.v. KHÔNG được dùng trong code (code dùng string tĩnh + emoji). Không cần thêm.


---

## ✅ Checklist Bước 1

- [ ] `SystemLayout.jsx` — Có sidebar + header + `<Outlet/>`
- [ ] `SystemLayout.scss` — Layout flexbox, sidebar cố định 250px
- [ ] `Navigator.jsx` — NavLink theo role + nút logout
- [ ] `Navigator.scss` — Dark sidebar, active teal
- [ ] `MenuData.js` — Có `icon` field cho 5 admin items + 1 doctor item
- [ ] `App.jsx` — Routes admin nest vào `<SystemLayout>`
- [ ] `vi.json` & `en.json` — Admin keys đã thêm
- [ ] Test: Đăng nhập admin → `/system/user-manage` → Sidebar hiển thị 5 mục, mục active highlight teal

---

> 📖 **Tiếp theo:** [Phase6_02_UserManage.md](Phase6_02_UserManage.md)
