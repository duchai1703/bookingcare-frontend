# GĐ 10: ĐẠI TU UI/UX THEO FIGMA & XÂY DỰNG ANALYTICS DASHBOARD

## Tài liệu Đặc tả Kiến trúc Chi tiết — Version 2.0 (Final Architecture — PASS 100)

**Ngày lập:** 2026-04-14 | **Cập nhật lần cuối:** 2026-04-15 (43 Audit Fixes applied)
**Nguyên tắc tối thượng:** "THAY VỎ GIỮ RUỘT" — ĐÓNG BĂNG MỌI LOGIC CỐT LÕI

---

## MỤC LỤC

1. [PHẦN 1: TỔNG QUAN KIẾN TRÚC & HẠ TẦNG](#phần-1-tổng-quan-kiến-trúc--hạ-tầng)
2. [PHẦN 2: ROUTING & CẤU TRÚC LAYOUT](#phần-2-routing--cấu-trúc-layout)
3. [PHẦN 3: BACKEND API & FRONTEND INTEGRATION](#phần-3-backend-api--frontend-integration)
4. [PHẦN 4: KHU VỰC ADMIN (UI REFACTOR & DASHBOARD)](#phần-4-khu-vực-admin-ui-refactor--dashboard)
5. [PHẦN 5: KHU VỰC BÁC SĨ](#phần-5-khu-vực-bác-sĩ)
6. [PHẦN 6: KHU VỰC BỆNH NHÂN & BẢO VỆ CHẤT LƯỢNG](#phần-6-khu-vực-bệnh-nhân--bảo-vệ-chất-lượng)
7. [PHẦN 7: LỘ TRÌNH THỰC THI (10.1 – 10.5)](#phần-7-lộ-trình-thực-thi-101--105)

---

## KIỂM KÊ HẠ TẦNG HIỆN TẠI (Source-of-Truth từ Source Code)

| Thành phần | Version hiện tại | Ghi chú |
|---|---|---|
| React | `^18.3.1` | Function Components, Hooks |
| react-router-dom | `^6.30.3` | v6 — `<Routes>`, `<Outlet>`, `useNavigate` |
| @reduxjs/toolkit | `^2.11.2` | `createSlice`, `createAsyncThunk` |
| redux-persist | `^6.0.0` | whitelist: `['user', 'app']` |
| Build Tool | **Vite** `^6.0.0` | `@vitejs/plugin-react ^4.3.4` — **KHÔNG PHẢI CRA** |
| CSS Preprocessor | `sass ^1.98.0` | SCSS module, auto-import `_variables` + `_mixins` |
| Bootstrap | `^5.3.8` | Import global tại `main.jsx` |
| react-intl | `^10.0.0` | `vi.json`, `en.json` |
| moment | `^2.30.1` | Timestamp xử lý ngày |
| react-toastify | `^11.0.5` | `theme="colored"` |
| sweetalert2 | `^11.26.23` | `confirmDelete()` |
| @uiw/react-md-editor | `^4.0.11` | `MarkdownEditorField.jsx` component |
| axios | `^1.13.6` | Custom instance `axiosConfig.js` |

> [!CAUTION]
> **Dự án dùng Vite, KHÔNG phải CRA.** Do đó **KHÔNG cần `@craco/craco`**. Tailwind CSS sẽ tích hợp qua plugin PostCSS native của Vite.

> [!IMPORTANT]
> **Toàn bộ khu vực Admin/Doctor hiện tại ĐÃ LÀ Function Component + Hooks.** TUYỆT ĐỐI KHÔNG convert ngược về Class Component hay làm sai lệch cấu trúc hiện có. Tiếp tục sử dụng Function Component cho các tính năng mới (Dashboard, v.v.). Do đó KHÔNG có `componentDidMount`, `componentDidUpdate`, `this.state`, `this.setState` — chỉ dùng `useEffect` + cleanup function + `useRef` cho `isMounted`.

---

## PHẦN 1: TỔNG QUAN KIẾN TRÚC & HẠ TẦNG

### 1.1 — [ADD] Cài đặt Dependencies mới

```bash
# Tailwind CSS v3 — tương thích 100% với Vite 6 + React 18
npm install -D tailwindcss@3.4.17 postcss@8.4.49 autoprefixer@10.4.20

# Recharts — Biểu đồ thống kê Dashboard (tương thích React 18)
npm install recharts@2.15.3

# Lucide React — Icon hiện đại cho Dashboard mới
npm install lucide-react@0.469.0
```

> [!IMPORTANT]
> **Version Lock chính xác:**
> - `tailwindcss@3.4.17` — v3 stable cuối, tương thích PostCSS 8
> - `postcss@8.4.49` — Vite 6 yêu cầu PostCSS 8
> - `autoprefixer@10.4.20` — đi kèm PostCSS 8
> - `recharts@2.15.3` — hỗ trợ React 18, `<ResponsiveContainer>`
> - `lucide-react@0.469.0` — tree-shakable, nhẹ hơn FontAwesome

### 1.2 — [ADD] File cấu hình Tailwind CSS

#### [ADD] [postcss.config.js](file:///c:/Users/USER/Documents/DOAN1/bookingcare-frontend/postcss.config.js) — root frontend, ngang hàng `vite.config.js`

```js
// postcss.config.js
// [Phase 10] — PostCSS config cho Tailwind CSS v3 (Vite native)
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

#### [ADD] [tailwind.config.js](file:///c:/Users/USER/Documents/DOAN1/bookingcare-frontend/tailwind.config.js) — root frontend, ngang hàng `vite.config.js`

```js
// tailwind.config.js
// [Phase 10] — Tailwind CSS v3 config
// ĐẶC BIỆT: prefix 'tw-' để tránh xung đột với Bootstrap 5 + SCSS cũ

/** @type {import('tailwindcss').Config} */
export default {
  // QUAN TRỌNG: prefix tránh xung đột Bootstrap
  prefix: 'tw-',

  // TẮT preflight (CSS Reset) — để Bootstrap + SCSS cũ không bị ghi đè
  corePlugins: {
    preflight: false,
  },

  // BẬT !important — đảm bảo class Tailwind luôn thắng Bootstrap specificity
  // ⚠️ [v1.9] KỶ LUẬT: `important` chỉ để thắng Bootstrap specificity.
  // Dev PHẢI tự kỷ luật phạm vi class khi refactor — TUYỆT ĐỐI KHÔNG dùng
  // Tailwind để override các thuộc tính layout toàn cục của Phase 1-9
  // (VD: KHÔNG dùng tw-* để ghi đè width/height/margin của .system-layout,
  // .system-sidebar, .system-content đã định nghĩa trong SCSS cũ).
  important: true,

  // [AUDIT FIX — Future-proof] Quét tất cả JS/JSX/TS/TSX files trong src/
  // Bao phủ cả TypeScript để sẵn sàng migrate trong tương lai
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],

  theme: {
    extend: {
      colors: {
        // Đồng bộ với $primary trong _variables.scss
        primary: {
          DEFAULT: '#45c3d2',
          dark: '#39a8b5',
          light: '#e8f7f9',
        },
        secondary: '#ffc107',
        success: '#28a745',
        danger: '#dc3545',
        info: '#17a2b8',
        sidebar: '#1a1a2e',
        'text-main': '#333333',
        'text-sub': '#666666',
        'text-light': '#999999',
        'bg-light': '#f5f5f5',
        'bg-page': '#f0f2f5',
        // Dashboard riêng
        'chart-blue': '#4F46E5',
        'chart-green': '#10B981',
        'chart-amber': '#F59E0B',
        'chart-rose': '#F43F5E',
      },
      fontFamily: {
        primary: ['Roboto', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      borderRadius: {
        'card': '12px',
        'badge': '20px',
      },
      boxShadow: {
        'card': '0 2px 12px rgba(0, 0, 0, 0.08)',
        'card-hover': '0 4px 20px rgba(0, 0, 0, 0.12)',
      },
    },
  },

  plugins: [],
};
```

### 1.3 — [ADD] File Tailwind Directives + [MODIFY] main.jsx

#### [ADD] `src/styles/tailwind.css`

```css
/* src/styles/tailwind.css */
/* [Phase 10] — Tailwind CSS directives */
/* KHÔNG import @tailwind base; vì đã tắt preflight */

@tailwind components;
@tailwind utilities;
```

#### [MODIFY] [main.jsx](file:///c:/Users/USER/Documents/DOAN1/bookingcare-frontend/src/main.jsx)

```diff
 // Import Global SCSS
 import './styles/global.scss';

+// [Phase 10] Import Tailwind CSS — PHẢI ĐẶT SAU global.scss
+import './styles/tailwind.css';
```

> [!WARNING]
> **THỨ TỰ IMPORT BẮT BUỘC trong `main.jsx`:**
> 1. `bootstrap.min.css`
> 2. Slick Carousel CSS
> 3. `react-toastify` CSS
> 4. `global.scss` — Custom SCSS cũ
> 5. **`tailwind.css` — CUỐI CÙNG** (Tailwind `!important` + `tw-` prefix có ưu tiên cao nhất)

### 1.4 — [MODIFY] `vite.config.js` — KHÔNG CẦN SỬA

> Vite **tự động** detect `postcss.config.js` ở root. Config SCSS hiện tại (`silenceDeprecations`, `loadPaths`, `additionalData`) giữ nguyên 100%.

### 1.5 — [MODIFY] `vi.json` & `en.json` — Thêm key i18n Dashboard

**TUYỆT ĐỐI giữ nguyên** tất cả key cũ. Chỉ **APPEND** key mới.

```json
// ═══ THÊM VÀO vi.json ═══
{
  "dashboard.title": "Bảng điều khiển",
  "dashboard.stat-total-bookings": "Tổng lượt đặt lịch",
  "dashboard.stat-total-doctors": "Bác sĩ hoạt động",
  "dashboard.stat-total-patients": "Bệnh nhân mới",
  "dashboard.stat-revenue": "Lượt khám hoàn thành",
  "dashboard.chart-bookings-by-day": "Lượt đặt lịch theo ngày",
  "dashboard.chart-bookings-by-status": "Phân bổ trạng thái",
  "dashboard.chart-bookings-by-specialty": "Top chuyên khoa",
  "dashboard.chart-bookings-by-doctor": "Top bác sĩ",
  "dashboard.filter-range": "Khoảng thời gian",
  "dashboard.filter-7d": "7 ngày",
  "dashboard.filter-30d": "30 ngày",
  "dashboard.filter-90d": "90 ngày",
  "dashboard.filter-custom": "Tùy chỉnh",
  "dashboard.filter-from": "Từ ngày",
  "dashboard.filter-to": "Đến ngày",
  "dashboard.filter-apply": "Áp dụng",
  "dashboard.no-data": "Không có dữ liệu trong khoảng thời gian này",
  "dashboard.loading": "Đang tải dữ liệu...",
  "dashboard.error": "Lỗi khi tải dữ liệu thống kê",
  "menu.admin.dashboard": "Bảng điều khiển",
  "admin.layout.toggle-sidebar": "Đóng/Mở sidebar"
}
```

```json
// ═══ THÊM VÀO en.json ═══
{
  "dashboard.title": "Dashboard",
  "dashboard.stat-total-bookings": "Total Bookings",
  "dashboard.stat-total-doctors": "Active Doctors",
  "dashboard.stat-total-patients": "New Patients",
  "dashboard.stat-revenue": "Completed Visits",
  "dashboard.chart-bookings-by-day": "Bookings by Day",
  "dashboard.chart-bookings-by-status": "Status Distribution",
  "dashboard.chart-bookings-by-specialty": "Top Specialties",
  "dashboard.chart-bookings-by-doctor": "Top Doctors",
  "dashboard.filter-range": "Time Range",
  "dashboard.filter-7d": "7 days",
  "dashboard.filter-30d": "30 days",
  "dashboard.filter-90d": "90 days",
  "dashboard.filter-custom": "Custom",
  "dashboard.filter-from": "From",
  "dashboard.filter-to": "To",
  "dashboard.filter-apply": "Apply",
  "dashboard.no-data": "No data available for this time range",
  "dashboard.loading": "Loading statistics...",
  "dashboard.error": "Error loading statistics",
  "menu.admin.dashboard": "Dashboard",
  "admin.layout.toggle-sidebar": "Toggle sidebar"
}
```

---

## PHẦN 2: ROUTING & CẤU TRÚC LAYOUT

### 2.1 — [MODIFY] [constants.js](file:///c:/Users/USER/Documents/DOAN1/bookingcare-frontend/src/utils/constants.js) — Thêm path Dashboard

> ⚠️ **CẢNH BÁO:** Đây là mã minh họa (Pseudo-diff). Dev cần merge thủ công vào đúng vị trí trong file hiện tại, tuyệt đối không thay thế toàn bộ nội dung file.

```diff
   // Admin (R1)
   SYSTEM: '/system',
+  DASHBOARD: '/system/dashboard',
   USER_MANAGE: '/system/user-manage',
```

### 2.2 — [MODIFY] [App.jsx](file:///c:/Users/USER/Documents/DOAN1/bookingcare-frontend/src/containers/App.jsx) — Thêm Route Dashboard

> ⚠️ **CẢNH BÁO:** Đây là mã minh họa (Pseudo-diff). Dev cần merge thủ công vào đúng vị trí trong file hiện tại, tuyệt đối không thay thế toàn bộ nội dung file.

> [!IMPORTANT]
> **React Router v6:** Route `dashboard` là **nested route** bên trong `<Route path={path.SYSTEM}>`. V6 tự match chính xác nhất — **KHÔNG cần lo thứ tự route** như v5. Giữ nguyên `<PrivateRoute allowedRoles={[USER_ROLE.ADMIN]} />`.

```diff
 // ===== Protected Pages =====
 import SystemLayout from './System/SystemLayout';
+import Dashboard from './System/Admin/Dashboard';
 import UserManage from './System/Admin/UserManage';
```

```diff
         <Route element={<PrivateRoute allowedRoles={[USER_ROLE.ADMIN]} />}>
           <Route path={path.SYSTEM} element={<SystemLayout />}>
-            {/* /system → redirect /system/user-manage */}
-            <Route index element={<Navigate to="user-manage" replace />} />
+            {/* /system → redirect /system/dashboard */}
+            <Route index element={<Navigate to="dashboard" replace />} />
+            <Route path="dashboard" element={<Dashboard />} />
             <Route path="user-manage" element={<UserManage />} />
             <Route path="doctor-manage" element={<DoctorManage />} />
             <Route path="clinic-manage" element={<ClinicManage />} />
             <Route path="specialty-manage" element={<SpecialtyManage />} />
             <Route path="schedule-manage" element={<ScheduleManage />} />
           </Route>
         </Route>
```

### 2.3 — [MODIFY] [MenuData.js](file:///c:/Users/USER/Documents/DOAN1/bookingcare-frontend/src/components/Header/MenuData.js) — Thêm menu Dashboard

> ⚠️ **CẢNH BÁO:** Đây là mã minh họa (Pseudo-diff). Dev cần merge thủ công vào đúng vị trí trong file hiện tại, tuyệt đối không thay thế toàn bộ nội dung file.

```diff
+import { path } from '../../utils/constants';
+
 export const adminMenu = [
+  {
+    name: 'menu.admin.dashboard',
+    link: '/system/dashboard',
+  },
   {
     name: 'menu.admin.manage-user',
     link: path.USER_MANAGE,
   },
```

### 2.4 — [MODIFY] [Navigator.jsx](file:///c:/Users/USER/Documents/DOAN1/bookingcare-frontend/src/components/Navigator/Navigator.jsx) — Thêm icon Dashboard

> ⚠️ **CẢNH BÁO:** Đây là mã minh họa (Pseudo-diff). Dev cần merge thủ công vào đúng vị trí trong file hiện tại, tuyệt đối không thay thế toàn bộ nội dung file.

```diff
 const MENU_ICONS = {
+  'menu.admin.dashboard': '📊',
   'menu.admin.manage-user': '👥',
```

### 2.5 — [MODIFY] [SystemLayout.jsx](file:///c:/Users/USER/Documents/DOAN1/bookingcare-frontend/src/containers/System/SystemLayout.jsx) — Toggle Mobile Sidebar

> ⚠️ **CẢNH BÁO:** Đây là mã minh họa (Pseudo-diff). Dev cần merge thủ công vào đúng vị trí trong file hiện tại, tuyệt đối không thay thế toàn bộ nội dung file.

> [!IMPORTANT]
> **VÁ LỖ HỔNG HEADER REDUX (AUDIT FIX #4 — Mất Language Switch):** SystemLayout hiện tại **KHÔNG import `<Header />`** — nó dùng `<Navigator />` cho sidebar (chứa nút Logout nhưng **KHÔNG CÓ nút đổi ngôn ngữ VN/EN**). `<Header />` chỉ render ở public route, do đó Admin đang vào `/system/*` sẽ **không thể đổi ngôn ngữ**. Layout mới sẽ thêm logic **toggle sidebar** và **BẮT BUỘC phải import và tích hợp khối Language Switch** (lấy logic từ `Header.jsx` — `changeLanguage(LANGUAGES.VI/EN)` dispatch qua `appSlice`) **vào bên trong top-bar (`system-header`) của SystemLayout mới** để Admin/Doctor có thể đổi ngôn ngữ ngay trong dashboard.

> [!CAUTION]
> **ACCEPTANCE CRITERION — Z-INDEX LAYERING (AUDIT FIX — Lỗi Layering UI):**
> Thứ tự ưu tiên z-index tuyệt đối (**v1.7 — Vá lỗi G2**):
>
> | Layer | Element | z-index | Ghi chú |
> |---|---|---|---|
> | **TOP-MOST** | SweetAlert2 (Alert/Confirm) | `10002` | Luôn đè mọi thứ |
> | Portal Menu | `react-select` dropdown (`menuPortalTarget={document.body}`) | `10001` | Nổi trên Toast, dưới Alert |
> | Toast | react-toastify (`Toastify__toast-container`) | `10000` | Notification layer |
> | Header bar | `system-header` | ≤ `1000` | Layout Admin |
> | Sidebar | `system-sidebar` | ≤ `900` | Layout Admin |
>
> - **CẤM** gán z-index ≥ `10000` cho bất kỳ element layout (sidebar, header, card) nào.
> - Override SweetAlert2: thêm `.swal2-container { z-index: 10002 !important; }` vào `global.scss`.
> - Override react-select portal: `menuPortalTarget={document.body}` + `styles={{ menuPortal: (base) => ({ ...base, zIndex: 10001 }) }}`.
> - DEV phải kiểm tra thủ công: mở SweetAlert2 confirm khi dropdown đang mở → Alert **PHẢI** đè dropdown.

```diff
-import React from 'react';
+import React, { useState } from 'react';
 import { Outlet, Link } from 'react-router-dom';

 const SystemLayout = () => {
   const intl = useIntl();
   const { userInfo } = useSelector((state) => state.user);
+  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

   return (
-    <div className="system-layout">
+    <div className={`system-layout ${!isSidebarOpen ? 'sidebar-collapsed' : ''}`}>
       {/* ===== SIDEBAR TRÁI ===== */}
-      <div className="system-sidebar">
+      <div className={`system-sidebar ${!isSidebarOpen ? 'collapsed' : ''}`}>
         {/* ... giữ nguyên toàn bộ nội dung sidebar ... */}
       </div>

       <div className="system-content">
         <div className="system-header">
           <div className="header-left">
+            <button
+              className="toggle-sidebar-btn"
+              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
+              title={intl.formatMessage({ id: 'admin.layout.toggle-sidebar' })}
+            >
+              <i className={`fas ${isSidebarOpen ? 'fa-chevron-left' : 'fa-bars'}`} />
+            </button>
             <Link to="/" className="home-link" ...>
```

### 2.6 — [MODIFY] [SystemLayout.scss](file:///c:/Users/USER/Documents/DOAN1/bookingcare-frontend/src/containers/System/SystemLayout.scss) — Thêm CSS toggle

> ⚠️ **CẢNH BÁO:** Đây là mã minh họa (Pseudo-diff). Dev cần merge thủ công vào đúng vị trí trong file hiện tại, tuyệt đối không thay thế toàn bộ nội dung file.

**APPEND** vào cuối file (KHÔNG xóa/sửa rule cũ):

```scss
// [Phase 10] Sidebar toggle
.system-layout.sidebar-collapsed {
  .system-sidebar {
    width: 0;
    overflow: hidden;
    padding: 0;
  }
  .system-content {
    margin-left: 0;
  }
}

.toggle-sidebar-btn {
  background: none;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  padding: 6px 10px;
  cursor: pointer;
  color: #666;
  margin-right: 8px;
  transition: all 0.2s;
  &:hover {
    background: rgba(69, 195, 210, 0.1);
    color: $primary;
    border-color: $primary;
  }
}

@media (max-width: 768px) {
  .system-layout {
    .system-sidebar {
      position: fixed;
      transform: translateX(-100%);
      transition: transform 0.3s;
      &:not(.collapsed) {
        transform: translateX(0);
      }
    }
    .system-content {
      margin-left: 0;
    }
  }
}
```

---

## PHẦN 3: BACKEND API & FRONTEND INTEGRATION

### 3.1 — [ADD] `src/controllers/statisticController.js` (Backend)

Toàn bộ 5 handler bọc `try...catch` → trả `errCode: -1` nếu lỗi. Tất cả đều **validate** `from` + `to` query params.

```js
// src/controllers/statisticController.js
const statisticService = require('../services/statisticService');

const getOverviewStatistics = async (req, res) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) {
      return res.status(400).json({ errCode: 1, message: 'Missing required params: from, to' });
    }
    const data = await statisticService.getOverviewStatistics(Number(from), Number(to));
    return res.status(200).json({ errCode: 0, data });
  } catch (err) {
    console.error('>>> getOverviewStatistics error:', err);
    return res.status(500).json({ errCode: -1, message: 'Server error' });
  }
};

const getBookingsByDay = async (req, res) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) {
      return res.status(400).json({ errCode: 1, message: 'Missing required params: from, to' });
    }
    const data = await statisticService.getBookingsByDay(Number(from), Number(to));
    return res.status(200).json({ errCode: 0, data });
  } catch (err) {
    console.error('>>> getBookingsByDay error:', err);
    return res.status(500).json({ errCode: -1, message: 'Server error' });
  }
};

const getBookingsByStatus = async (req, res) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) {
      return res.status(400).json({ errCode: 1, message: 'Missing required params: from, to' });
    }
    const data = await statisticService.getBookingsByStatus(Number(from), Number(to));
    return res.status(200).json({ errCode: 0, data });
  } catch (err) {
    console.error('>>> getBookingsByStatus error:', err);
    return res.status(500).json({ errCode: -1, message: 'Server error' });
  }
};

const getTopSpecialties = async (req, res) => {
  try {
    const { from, to, limit } = req.query;
    if (!from || !to) {
      return res.status(400).json({ errCode: 1, message: 'Missing required params: from, to' });
    }
    const data = await statisticService.getTopSpecialties(Number(from), Number(to), Number(limit) || 5);
    return res.status(200).json({ errCode: 0, data });
  } catch (err) {
    console.error('>>> getTopSpecialties error:', err);
    return res.status(500).json({ errCode: -1, message: 'Server error' });
  }
};

const getTopDoctors = async (req, res) => {
  try {
    const { from, to, limit } = req.query;
    if (!from || !to) {
      return res.status(400).json({ errCode: 1, message: 'Missing required params: from, to' });
    }
    const data = await statisticService.getTopDoctors(Number(from), Number(to), Number(limit) || 5);
    return res.status(200).json({ errCode: 0, data });
  } catch (err) {
    console.error('>>> getTopDoctors error:', err);
    return res.status(500).json({ errCode: -1, message: 'Server error' });
  }
};

module.exports = { getOverviewStatistics, getBookingsByDay, getBookingsByStatus, getTopSpecialties, getTopDoctors };
```

### 3.2 — [ADD] `src/services/statisticService.js` (Backend)

> [!CAUTION]
> **CHIẾN LƯỢC TIMEZONE THỐNG NHẤT (CODEX AUDIT FIX — Anti Double-Shift):**
> - Cột `date` trong bảng `Bookings` lưu **timestamp millisecond** dạng `STRING(20)` (VD: `"1712016000000"`).
> - **CHIẾN LƯỢC 2 LỚP ĐỘC LẬP (chọn 1, KHÔNG dùng cả 2 cùng lúc):**
>   - **Lớp 1 (ƯU TIÊN):** Set `timezone: '+07:00'` trong `models/index.js` → MySQL session tự hiểu `+07:00`. Khi đó trong Raw Query chỉ cần `DATE(FROM_UNIXTIME(CAST(date AS UNSIGNED) / 1000))` — **KHÔNG CẦN `CONVERT_TZ`** vì session đã ở +07:00.
>   - **Lớp 2 (Fallback):** Nếu KHÔNG thể sửa `models/index.js`, thì dùng `CONVERT_TZ(FROM_UNIXTIME(...), '+00:00', '+07:00')` trong Raw Query.
> - ⚠️ **CẤM dùng cả 2 lớp cùng lúc** — sẽ gây **cộng dồn +14 tiếng** (Double-Shift).
> - Dùng **Raw Query + `replacements`** (CHỐNG SQL Injection).
> - **BẮT BUỘC ORDER BY ASC** để biểu đồ Recharts không bị vẽ zigzag.
>
> **🔒 HARD-FAIL BOOT CHECK (v2.0 — Zero Trust cho Dữ liệu Y tế):**
> Ngay sau khi Sequelize sync thành công, **BẮT BUỘC** kiểm tra timezone.
> **TUYỆT ĐỐI KHÔNG chấp nhận auto-fix.** Nếu phát hiện sai múi giờ, hệ thống **PHẢI dừng hoạt động ngay lập tức** để bảo vệ tính toàn vẹn của dữ liệu y tế:
> ```js
> // Trong file khởi tạo server (server.js hoặc app.js), SAU khi Sequelize sync thành công:
> const [tzResult] = await db.sequelize.query("SELECT @@session.time_zone AS tz");
> const sessionTz = tzResult[0]?.tz;
> if (sessionTz !== '+07:00') {
>   // ❌ HARD FAIL — TUYỆT ĐỐI KHÔNG tự sửa, KHÔNG tiếp tục khởi động
>   console.error(`\n❌ [FATAL — TIMEZONE MISMATCH]`);
>   console.error(`   Session timezone = '${sessionTz}', expected '+07:00'.`);
>   console.error(`   → Kiểm tra cấu hình models/index.js: timezone + hooks.afterConnect`);
>   console.error(`   → Server DỮNG NGAY để bảo vệ tính toàn vẹn dữ liệu y tế.\n`);
>   process.exit(1); // ← Dừng server, TUYỆT ĐỐI KHÔNG auto-fix
> }
> console.log('✅ [TIMEZONE OK] Session timezone = +07:00');
> ```
> **Lý do TUYỆT ĐỐI KHÔNG auto-fix:** Trong hệ thống y tế, việc tự động sửa timezone trong runtime có thể gây sai lệch dữ liệu lịch khám giữa các request đang xử lý đồng thời. `process.exit(1)` buộc DevOps phải sửa đúng cấu hình **TRƯỚC KHI** hệ thống phục vụ bệnh nhân.

> [!WARNING]
> **NGOẠI LỆ ĐẶC QUYỀN — Sequelize Timezone Config (AUDIT FIX — Xung đột Timezone & Models):**
> Quy tắc "TUYỆT ĐỐI KHÔNG SỬA Backend models" có **MỘT NGOẠI LỆ DUY NHẤT**: cho phép chỉnh sửa file `src/models/index.js` để thêm cấu hình timezone vào object khởi tạo Sequelize:
> ```js
> // src/models/index.js — NGOẠI LỆ ĐẶC QUYỀN Phase 10 (v2.0 — Zero Trust)
> const sequelize = new Sequelize(dbName, dbUser, dbPass, {
>   ...existingConfig,
>   timezone: '+07:00', // ← Khóa timezone tầng Sequelize
>   dialectOptions: {
>     useUTC: false,     // CHỐNG tự động convert về UTC
>     dateStrings: true, // Trả date dạng string, không auto-parse
>     typeCast: true,
>   },
>   // [🔒 TZ-POOL-001 v2.0] Khóa timezone cho TẤT CẢ kết nối bằng Manual Promise
>   // ⚠️ KHÔNG dùng `async/await connection.query()` vì driver mysql2
>   //   sử dụng cơ chế Callback — `await` có thể resolve TRƯỚC KHI query thực sự hoàn tất.
>   // ⚠️ KHÔNG dùng pool.afterConnect (không được hỗ trợ chính thức trong Sequelize v6)
>   // ✅ Dùng hooks.afterConnect + new Promise() — đảm bảo connection CHỈ được trả về pool
>   //   SAU KHI MySQL xác nhận SET time_zone thành công (callback được gọi).
>   hooks: {
>     afterConnect: (connection) => {
>       return new Promise((resolve, reject) => {
>         connection.query("SET time_zone = '+07:00';", (err) => {
>           if (err) {
>             console.error('❌ [FATAL] Timezone Hook Failed:', err);
>             return reject(err); // Connection bị từ chối — không đưa vào pool
>           }
>           resolve(); // MySQL xác nhận thành công → connection sẵn sàng
>         });
>       });
>     },
>   },
> });
> ```
> **Giải thích `hooks.afterConnect` (Manual Promise — Zero Trust):** Driver `mysql2` của MySQL dùng **callback-based API** cho `connection.query()`. Việc dùng `async/await` trực tiếp có thể không đảm bảo query đã thực sự hoàn tất trước khi connection được sử dụng. Bằng cách bọc `new Promise()`, ta đảm bảo:
> - `resolve()` chỉ được gọi **SAU KHI** MySQL callback xác nhận `SET time_zone` thành công.
> - `reject(err)` nếu query thất bại → connection bị từ chối, không đưa vào pool.
> - **Không có connection nào thoát** khỏi timezone `+07:00`.
>
> **Phương án dự phòng (Fallback):** Nếu không thể sửa `index.js` (ví dụ: file bị lock bởi quy trình deploy), Dev **PHẢI** thực hiện lệnh `SET time_zone = '+07:00'` ngay sau khi khởi tạo connection, hoặc kiểm tra session timezone bằng `SELECT @@session.time_zone` trước khi chạy bất kỳ query thống kê nào.

> [!IMPORTANT]
> **KỊCH BẢN KIỂM THỬ HỒI QUY — Timezone Regression Test Playbook:**
> Sau khi sửa `models/index.js` thêm `timezone: '+07:00'`, **BẮT BUỘC** kiểm tra 3 luồng cũ trước khi deploy:
> 1. **Lịch đặt mới:** Tạo booking mới → kiểm tra giờ hiển thị có đúng giờ VN (GMT+7) không? So sánh với timestamp lưu trong DB.
> 2. **Record cũ:** Mở các booking đã tạo trước Phase 10 → kiểm tra `createdAt` / `updatedAt` hiển thị có bị **nhảy giờ** (±7h) so với trước khi sửa không? Nếu bị lệch, Sequelize đang convert lại timestamp cũ.
> 3. **Hàm moment() Phases 1-9:** Kiểm tra các hàm `moment.utc(...)` đang dùng trong ScheduleManage, ManagePatient, BookingVerify → kết quả có bị **lệch 7 tiếng** so với trước không? Đặc biệt chú ý `moment.utc(selectedDate).startOf('day').valueOf()`.
>
> Nếu bất kỳ luồng nào FAIL → rollback `models/index.js` và chuyển sang **Lớp 2 (Fallback)**: dùng `CONVERT_TZ` trong Raw Query thay thế.

> [!NOTE]
> **GHI CHÚ HIỆU NĂNG (CODEX AUDIT FIX — Index Optimization):**
> Việc dùng `CAST(date AS UNSIGNED)` ở vế trái trong `WHERE` clause khiến MySQL **không thể sử dụng Index** trên cột `date` (Full Table Scan). Trong Giai đoạn 10, **chấp nhận** dùng `CAST` vì:
> - Dữ liệu thống kê chỉ Admin xem, tần suất thấp.
> - Bảng Bookings hiện tại chưa lớn.
>
> **Khuyến nghị cho tương lai (Phase 11+):**
> - Refactor cột `date` từ `STRING(20)` sang `BIGINT` để tận dụng B-Tree Index.
> - Hoặc thêm cột `dateNumeric BIGINT GENERATED ALWAYS AS (CAST(date AS UNSIGNED)) STORED` + Index.
> - Trong khi chờ refactor, **BẮT BUỘC** bổ sung `ORDER BY bookingDate ASC` để tận dụng sort tối ưu ở tầng MySQL.
>
> **⚠️ NGƯỠNG CẢNH BÁO (v1.6):** Nếu bảng `Bookings` vượt **50.000 records**, **PHẢI triển khai ngay** Generated Column:
> ```sql
> ALTER TABLE Bookings
>   ADD COLUMN dateNumeric BIGINT GENERATED ALWAYS AS (CAST(date AS UNSIGNED)) STORED,
>   ADD INDEX idx_bookings_dateNumeric (dateNumeric);
> ```
> Sau đó thay `WHERE CAST(date AS UNSIGNED) >= :from` thành `WHERE dateNumeric >= :from` trong các Raw Query.

```js
// src/services/statisticService.js
const db = require('../models');

// [CODEX AUDIT FIX] Sequelize đã set timezone: '+07:00' trong models/index.js
// => MySQL session tự hiểu +07:00 => KHÔNG CẦN CONVERT_TZ trong Raw Query.
// => Chỉ cần FROM_UNIXTIME đơn giản.

// 1. Overview — 4 KPI
const getOverviewStatistics = async (fromTimestamp, toTimestamp) => {
  const fromStr = String(fromTimestamp);
  const toStr = String(toTimestamp);

  const [bookingResult] = await db.sequelize.query(
    `SELECT COUNT(*) AS totalBookings FROM Bookings
     WHERE CAST(date AS UNSIGNED) >= :from AND CAST(date AS UNSIGNED) <= :to`,
    { replacements: { from: fromStr, to: toStr }, type: db.sequelize.QueryTypes.SELECT }
  );

  const [doctorResult] = await db.sequelize.query(
    `SELECT COUNT(DISTINCT doctorId) AS totalDoctors FROM Schedules
     WHERE CAST(date AS UNSIGNED) >= :from AND CAST(date AS UNSIGNED) <= :to`,
    { replacements: { from: fromStr, to: toStr }, type: db.sequelize.QueryTypes.SELECT }
  );

  const [patientResult] = await db.sequelize.query(
    `SELECT COUNT(DISTINCT patientId) AS totalPatients FROM Bookings
     WHERE CAST(date AS UNSIGNED) >= :from AND CAST(date AS UNSIGNED) <= :to`,
    { replacements: { from: fromStr, to: toStr }, type: db.sequelize.QueryTypes.SELECT }
  );

  const [revenueResult] = await db.sequelize.query(
    `SELECT COUNT(*) AS completedBookings FROM Bookings
     WHERE statusId = 'S3'
       AND CAST(date AS UNSIGNED) >= :from AND CAST(date AS UNSIGNED) <= :to`,
    { replacements: { from: fromStr, to: toStr }, type: db.sequelize.QueryTypes.SELECT }
  );

  return {
    totalBookings: bookingResult?.totalBookings || 0,
    totalDoctors: doctorResult?.totalDoctors || 0,
    totalPatients: patientResult?.totalPatients || 0,
    completedBookings: revenueResult?.completedBookings || 0,
  };
};

// 2. Bookings by Day — Line Chart
// [CODEX AUDIT FIX] Không dùng CONVERT_TZ vì Sequelize đã set timezone: '+07:00'
// FROM_UNIXTIME sẽ tự hiểu theo session timezone (+07:00) → kết quả đúng.
// ORDER BY ASC — tránh Recharts zigzag
const getBookingsByDay = async (fromTimestamp, toTimestamp) => {
  const fromStr = String(fromTimestamp);
  const toStr = String(toTimestamp);

  const results = await db.sequelize.query(
    `SELECT
       DATE(FROM_UNIXTIME(CAST(date AS UNSIGNED) / 1000)) AS bookingDate,
       COUNT(*) AS count
     FROM Bookings
     WHERE CAST(date AS UNSIGNED) >= :from AND CAST(date AS UNSIGNED) <= :to
     GROUP BY bookingDate
     ORDER BY bookingDate ASC`,
    { replacements: { from: fromStr, to: toStr }, type: db.sequelize.QueryTypes.SELECT }
  );
  return results;
};

// 3. Bookings by Status — Pie Chart
const getBookingsByStatus = async (fromTimestamp, toTimestamp) => {
  const fromStr = String(fromTimestamp);
  const toStr = String(toTimestamp);

  const results = await db.sequelize.query(
    `SELECT b.statusId, a.valueVi AS statusNameVi, a.valueEn AS statusNameEn, COUNT(*) AS count
     FROM Bookings b
     LEFT JOIN Allcodes a ON b.statusId = a.keyMap AND a.type = 'STATUS'
     WHERE CAST(b.date AS UNSIGNED) >= :from AND CAST(b.date AS UNSIGNED) <= :to
     GROUP BY b.statusId, a.valueVi, a.valueEn
     ORDER BY count DESC`,
    { replacements: { from: fromStr, to: toStr }, type: db.sequelize.QueryTypes.SELECT }
  );
  return results;
};

// 4. Top Specialties — Bar Chart
const getTopSpecialties = async (fromTimestamp, toTimestamp, limit) => {
  const fromStr = String(fromTimestamp);
  const toStr = String(toTimestamp);

  const results = await db.sequelize.query(
    `SELECT s.name AS specialtyName, COUNT(*) AS count
     FROM Bookings b
     INNER JOIN Doctor_Infos di ON b.doctorId = di.doctorId
     INNER JOIN Specialties s ON di.specialtyId = s.id
     WHERE CAST(b.date AS UNSIGNED) >= :from AND CAST(b.date AS UNSIGNED) <= :to
     GROUP BY s.id, s.name
     ORDER BY count DESC
     LIMIT :limit`,
    { replacements: { from: fromStr, to: toStr, limit }, type: db.sequelize.QueryTypes.SELECT }
  );
  return results;
};

// 5. Top Doctors — Bar Chart
const getTopDoctors = async (fromTimestamp, toTimestamp, limit) => {
  const fromStr = String(fromTimestamp);
  const toStr = String(toTimestamp);

  const results = await db.sequelize.query(
    `SELECT u.id AS doctorId, CONCAT(u.lastName, ' ', u.firstName) AS doctorName, COUNT(*) AS count
     FROM Bookings b
     INNER JOIN Users u ON b.doctorId = u.id
     WHERE CAST(b.date AS UNSIGNED) >= :from AND CAST(b.date AS UNSIGNED) <= :to
     GROUP BY u.id, u.lastName, u.firstName
     ORDER BY count DESC
     LIMIT :limit`,
    { replacements: { from: fromStr, to: toStr, limit }, type: db.sequelize.QueryTypes.SELECT }
  );
  return results;
};

module.exports = { getOverviewStatistics, getBookingsByDay, getBookingsByStatus, getTopSpecialties, getTopDoctors };
```

### 3.3 — [MODIFY] [web.js](file:///c:/Users/USER/Documents/DOAN1/bookingcare-backend/src/routes/web.js) — 5 endpoint mới

> ⚠️ **CẢNH BÁO:** Đây là mã minh họa (Pseudo-diff). Dev cần merge thủ công vào đúng vị trí trong file hiện tại, tuyệt đối không thay thế toàn bộ nội dung file.

Tất cả route đều qua `verifyToken` + `checkAdminRole` (roleId === 'R1').

```diff
 const clinicController = require('../controllers/clinicController');
+const statisticController = require('../controllers/statisticController');
 const { verifyToken, checkAdminRole, ... } = require('../middleware/authMiddleware');
```

Thêm khối route **SAU** Clinic Management, **TRƯỚC** `// ===== DOCTOR ROUTES`:

```diff
   app.delete('/api/v1/clinics/:id', verifyToken, checkAdminRole, clinicController.deleteClinic);

+  // [Phase 10] STATISTICS — Admin only (roleId === 'R1')
+  app.get('/api/v1/statistics/overview',           verifyToken, checkAdminRole, statisticController.getOverviewStatistics);
+  app.get('/api/v1/statistics/bookings-by-day',    verifyToken, checkAdminRole, statisticController.getBookingsByDay);
+  app.get('/api/v1/statistics/bookings-by-status', verifyToken, checkAdminRole, statisticController.getBookingsByStatus);
+  app.get('/api/v1/statistics/top-specialties',    verifyToken, checkAdminRole, statisticController.getTopSpecialties);
+  app.get('/api/v1/statistics/top-doctors',        verifyToken, checkAdminRole, statisticController.getTopDoctors);

   // ===== DOCTOR ROUTES ...
```

### 3.4 — [ADD] `src/services/statisticService.js` (Frontend)

```js
// src/services/statisticService.js
// [Phase 10] FE API calls — dùng custom axios instance
// [v1.4] Tất cả hàm đều nhận `options = {}` để hỗ trợ AbortController signal
import axiosInstance from './axiosConfig';

export const getOverviewStatistics = (from, to, options = {}) => {
  return axiosInstance.get('/api/v1/statistics/overview', {
    params: { from, to },
    signal: options.signal, // ← AbortController signal
  });
};

export const getBookingsByDay = (from, to, options = {}) => {
  return axiosInstance.get('/api/v1/statistics/bookings-by-day', {
    params: { from, to },
    signal: options.signal,
  });
};

export const getBookingsByStatus = (from, to, options = {}) => {
  return axiosInstance.get('/api/v1/statistics/bookings-by-status', {
    params: { from, to },
    signal: options.signal,
  });
};

export const getTopSpecialties = (from, to, limit = 5, options = {}) => {
  return axiosInstance.get('/api/v1/statistics/top-specialties', {
    params: { from, to, limit },
    signal: options.signal,
  });
};

export const getTopDoctorsStatistic = (from, to, limit = 5, options = {}) => {
  return axiosInstance.get('/api/v1/statistics/top-doctors', {
    params: { from, to, limit },
    signal: options.signal,
  });
};
```

---

## PHẦN 4: KHU VỰC ADMIN (UI REFACTOR & DASHBOARD)

### 4.1 — [ADD] `src/containers/System/Admin/Dashboard.jsx`

> [!IMPORTANT]
> **Quy tắc kỹ thuật:**
> - **REQUEST CANCELLATION:** Dùng `AbortController` trong `useEffect` + truyền `signal` vào API calls + `controller.abort()` trong cleanup. **KHÔNG dùng `useRef(isMounted)` đơn thuần** vì nó chỉ chặn `setState` mà không hủy request HTTP đang bay.
> - **AXIOS CONTRACT:** `axiosConfig.js` response interceptor trả `response.data` (đã strip wrapper axios). Do đó khi nhận kết quả từ service, biến `res` đã là `{ errCode: 0, data: [...] }`. Truy xuất payload bằng `res.data` — **KHÔNG PHẢI `res.data.data`**.
> - **NULL SAFETY:** BẮT BUỘC normalize mọi payload `null`/`undefined` thành mảng rỗng `[]` trước khi đưa vào state (VD: `setBookingsByDay(res.data || [])`). Nếu không, Recharts sẽ crash khi nhận `null` làm `data` prop.
> - **EMPTY STATE:** `isLoading` → Spinner; chỉ render Recharts khi `data.length > 0`.
> - **RECHARTS CONTAINER:** `<ResponsiveContainer>` bọc trong `tw-w-full tw-h-[300px] tw-min-w-0`.
> - **FILTER:** Bộ lọc preset 7d/30d/90d/Custom + `moment.utc()` để tạo timestamp.
> - **ICON:** Dùng `lucide-react` (`BarChart3`, `Users`, `CalendarCheck`, `Activity`). **GIỮ NGUYÊN** FontAwesome ở trang cũ.
> - **CSS:** 100% class `tw-*` — **KHÔNG tạo file SCSS mới** cho Dashboard.

**Skeleton code — xem chi tiết trong implementation:**

```jsx
import React, { useState, useEffect, useCallback } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useSelector } from 'react-redux';
import moment from 'moment';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { BarChart3, Users, CalendarCheck, Activity } from 'lucide-react';
import {
  getOverviewStatistics, getBookingsByDay, getBookingsByStatus,
  getTopSpecialties, getTopDoctorsStatistic,
} from '../../../services/statisticService';

const CHART_COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#F43F5E', '#8B5CF6'];

const Dashboard = () => {
  const intl = useIntl();
  const language = useSelector((state) => state.app.language);

  const [range, setRange] = useState(/* 30 ngày mặc định */);
  const [isLoading, setIsLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [bookingsByDay, setBookingsByDay] = useState([]);
  const [bookingsByStatus, setBookingsByStatus] = useState([]);
  const [topSpecialties, setTopSpecialties] = useState([]);
  const [topDoctors, setTopDoctors] = useState([]);

  // [CODEX AUDIT FIX] Dùng AbortController thay vì useRef(isMounted)
  // → Hủy cả request HTTP lẫn chặn setState khi unmount hoặc khi deps thay đổi.
  // [AUDIT FIX #3] BẮT BUỘC phụ thuộc vào `language` để re-fetch khi đổi ngôn ngữ.
  const fetchAllData = useCallback(async (from, to, signal) => {
    setIsLoading(true);
    try {
      const [overviewRes, byDayRes, byStatusRes, specialtiesRes, doctorsRes] =
        await Promise.all([
          getOverviewStatistics(from, to, { signal }),
          getBookingsByDay(from, to, { signal }),
          getBookingsByStatus(from, to, { signal }),
          getTopSpecialties(from, to, 5, { signal }),
          getTopDoctorsStatistic(from, to, 5, { signal }),
        ]);

      // [v1.5 FIX — Axios Contract] axiosConfig interceptor trả response.data
      // => res ở đây đã là { errCode, data } => truy xuất bằng res.data (KHÔNG phải res.data.data)
      // [CODEX AUDIT FIX — Null Safety] Normalize null/undefined → []
      setOverview(overviewRes.data || null);
      setBookingsByDay(byDayRes.data || []);
      setBookingsByStatus(byStatusRes.data || []);
      setTopSpecialties(specialtiesRes.data || []);
      setTopDoctors(doctorsRes.data || []);
    } catch (err) {
      if (err.name === 'CanceledError' || err.name === 'AbortError') return;
      // axiosConfig đã xử lý 401
    } finally {
      setIsLoading(false);
    }
  }, [language]); // ← [AUDIT FIX #3] PHẢI có `language` trong dependency

  useEffect(() => {
    // [CODEX AUDIT FIX — AbortController] Hủy request khi unmount HOẶC khi deps thay đổi
    const controller = new AbortController();
    fetchAllData(range.from, range.to, controller.signal);
    return () => { controller.abort(); }; // ← Cleanup: hủy mọi request đang bay
  }, [range, language, fetchAllData]); // ← [AUDIT FIX #3] PHẢI có `language`

  return (
    <div className="tw-space-y-6">
      {/* Filter Bar + KPI Cards + 4 Charts */}
      {/* Mỗi chart: tw-bg-white tw-rounded-card tw-shadow-card tw-p-6 */}
      {/* ResponsiveContainer: tw-w-full tw-h-[300px] tw-min-w-0 */}
    </div>
  );
};

export default Dashboard;
```

### 4.2 — [MODIFY] [UserManage.jsx](file:///c:/Users/USER/Documents/DOAN1/bookingcare-frontend/src/containers/System/Admin/UserManage.jsx)

**GIỮ NGUYÊN 100%:**

| Thành phần | Tên chính xác | Vị trí |
|---|---|---|
| State | `users`, `formData`, `isEditing`, `showForm`, `genders`, `roles`, `positions`, `isLoading`, `searchText` | Line 29-38 |
| Init | `INIT_FORM` = `{ id, email, password, firstName, lastName, address, phoneNumber, gender, roleId, positionId, previewImgURL, imageBase64 }` | Line 12-25 |
| Handler | `handleInput(e)` — `e.target.name/value` | Line 77-79 |
| Handler | `handleAddNew()`, `handleEdit(user)`, `handleDeleteUser(user)`, `handleSubmit(e)` | Line 82-176 |
| Fetch | `fetchUsers()`, `fetchAllcodes()` | Line 45-75 |
| Derived | `filteredUsers` — `users.filter(...)` | Line 188-192 |
| Component | `<ImageUploadInput>` + `onChange={({base64, objectUrl}) => ...}` | Line 226-233 |
| Two-way | Tất cả `value={formData.xxx}` + `onChange={handleInput}` | Throughout |

**UI Refactor:** Đắp class `tw-*` vào JSX. **KHÔNG XÓA** `UserManage.scss`.

> [!CAUTION]
> **BẢO TOÀN VALIDATION (CODEX AUDIT FIX — Hợp đồng Validation):**
> Quy tắc này áp dụng cho **TẤT CẢ các trang Manage** (UserManage, DoctorManage, ClinicManage, SpecialtyManage, ScheduleManage, ManagePatient):
> **BẢO TOÀN TOÀN BỘ** điều kiện validation inline bên trong các hàm `handleSubmit` hoặc `handleSave` hiện tại. **KHÔNG được rút gọn, bỏ bớt, hay thay đổi logic kiểm tra dữ liệu đầu vào** nếu chưa có bộ test tương đương để đảm bảo regression-safe.
>
> **Mô tả chính xác theo code legacy (đã đối chiếu source):**
> - `UserManage.handleSubmit`: Giữ nguyên validation hiện có trong code legacy — **KHÔNG thêm, KHÔNG bớt** điều kiện check so với code gốc. Dùng `showWarning()` để báo lỗi.
> - `ClinicManage.handleSubmit`: kiểm tra `!formData.name || !formData.address` → `showWarning()`
> - `SpecialtyManage.handleSubmit`: kiểm tra `!formData.name` → `showWarning()`
> - `ScheduleManage.handleSave`: Sử dụng hàm `showWarning()` (KHÔNG phải `toast.error()`) và kiểm tra biến `newTimes` (mảng time slots mới cần lưu) thay vì `selectedTimes.length` để khớp 100% hành vi di sản.
> - Các guard `if (!file)`, `file.size > MAX`, file type check trong `handleImageChange` / `handleAvatarChange` → **GIỮ NGUYÊN 100%**

> [!WARNING]
> **GUARD ALLCODE DEPENDENCY (v1.7 — Vá lỗi G4):**
> Khi `fetchAllcodes()` chạy, các state `genders`, `roles`, `positions` được populate từ API Allcode. Nếu API trả về **rỗng hoặc lỗi**, các giá trị default (`genders[0]?.keyMap`) sẽ là `undefined` → gửi `roleId: null` lên BE gây lỗi.
> **BẮT BUỘC:** Dev phải thêm nhánh xử lý:
> - Hiển thị **loading skeleton** hoặc **spinner** khi Allcode chưa load xong.
> - Nếu Allcode API trả về rỗng (`genders.length === 0 || roles.length === 0`), **disable nút Submit** + hiển thông báo `toast.error('Lỗi tải dữ liệu hệ thống')`.
> - **KHÔNG** cho user submit form khi Allcode chưa load thành công.

### 4.3 — [MODIFY] [DoctorManage.jsx](file:///c:/Users/USER/Documents/DOAN1/bookingcare-frontend/src/containers/System/Admin/DoctorManage.jsx)

**GIỮ NGUYÊN 100%:**
- `INIT_INFO`, `handleSelectDoctor(e)`, `handleInput(e)`, `handleSave()`, `handleDelete()`
- `MarkdownEditorField` + `onChange={(val) => setDoctorInfo(prev => ({...prev, contentMarkdown: val}))}`
- `ImageUploadInput` + `onChange={({base64, objectUrl}) => ...}`
- `marked.parse(doctorInfo.contentMarkdown || '')` — render Markdown → HTML trước khi gửi BE

> [!CAUTION]
> **CẤM** `tw-overflow-hidden` ở Card chứa `<select>` dropdown — sẽ cắt/ẩn menu.

### 4.4 — [MODIFY] [ClinicManage.jsx](file:///c:/Users/USER/Documents/DOAN1/bookingcare-frontend/src/containers/System/Admin/ClinicManage.jsx) & [SpecialtyManage.jsx](file:///c:/Users/USER/Documents/DOAN1/bookingcare-frontend/src/containers/System/Admin/SpecialtyManage.jsx)

Cùng pattern: đắp `tw-*` class. Giữ nguyên `INIT_FORM`, `handleInput`, `handleSubmit`, `handleEdit`, `handleDelete*`, `MarkdownEditorField`, `ImageUploadInput`.

### 4.5 — [MODIFY] [ScheduleManage.jsx](file:///c:/Users/USER/Documents/DOAN1/bookingcare-frontend/src/containers/System/Admin/ScheduleManage.jsx)

**GIỮ NGUYÊN 100%:**
- `TIME_FRAMES` array (T1-T8)
- `selectedDoctorId`, `selectedDate`, `selectedTimes`, `existingSchedules`
- `toggleTime(timeKey)`, `handleSave()`, `handleDeleteSchedule(schedule)`
- `loadExistingSchedules()` — `moment.utc(selectedDate, 'YYYY-MM-DD').startOf('day').valueOf()`
- `useEffect` dependency: `[selectedDoctorId, selectedDate]`
- `AbortController` cleanup pattern

---

## PHẦN 5: KHU VỰC BÁC SĨ

### 5.1 — [MODIFY] [ManagePatient.jsx](file:///c:/Users/USER/Documents/DOAN1/bookingcare-frontend/src/containers/System/Doctor/ManagePatient.jsx)

**State giữ nguyên 100%:**
- `currentDate` — `useState(() => moment.utc(moment().format('YYYY-MM-DD')).valueOf())`
- `statusFilter` — `useState('S2')`
- `dataPatient`, `isOpenRemedyModal`, `dataModal`, `isLoading`

**Hàm giữ nguyên 100%:**
- `fetchPatientList(date, statusId)` — `getListPatientForDoctor(userInfo.id, date, statusId)`
- `handleOnChangeDatePicker(date)` — 2-step: `moment(date).format('YYYY-MM-DD')` → `moment.utc(dateString).valueOf()`
- `handleStatusFilterChange(e)` — `setStatusFilter(e.target.value)`
- `handleCancelBooking(booking)` — `cancelBooking(booking.id, {})`
- `isActionable(item)` — `item.statusId === BOOKING_STATUS.CONFIRMED` (chỉ S2 mới hiện nút)

**UI Refactor:** Table → Card expandable row. Đắp `tw-*` classes. Giữ `<DatePicker>` component + `<RemedyModal>`.

### 5.2 — [MODIFY] [RemedyModal.jsx](file:///c:/Users/USER/Documents/DOAN1/bookingcare-frontend/src/containers/System/Doctor/RemedyModal.jsx)

**GIỮ NGUYÊN 100%:**
- Props: `isOpen`, `dataModal`, `onClose`, `onSendSuccess`
- `email` pre-fill từ `dataModal.patientData.email` — `readOnly`, `tabIndex={-1}`
- `handleImageChange` — validate 5MB + JPEG/PNG + `CommonUtils.getBase64`
- `handleSendRemedy` — `sendRemedy(dataModal.id, { patientId, imageBase64, doctorName, language })`
- `useEffect` cleanup `URL.revokeObjectURL(previewUrl)` — MEMORY LEAK fix
- Modal overlay `onClick={handleCloseModal}` + inner `onClick={e.stopPropagation()}`

---

## PHẦN 6: KHU VỰC BỆNH NHÂN & BẢO VỆ CHẤT LƯỢNG

### 6.1 — [MODIFY] [RatingModal.jsx](file:///c:/Users/USER/Documents/DOAN1/bookingcare-frontend/src/containers/PatientPortal/RatingModal.jsx)

**GIỮ NGUYÊN 100%:**
- Props: `isOpen`, `onClose`, `bookingData` `({ bookingId, doctorId })`, `onSuccess`
- `handleSubmit` → `submitReview({ bookingId, doctorId, rating, comment })` → thứ tự: (1) `handleClose()` → (2) `toast.success()` → (3) `onSuccess()`
- Star hover/click: `[1,2,3,4,5].map(star => ...)` + `onMouseEnter/onMouseLeave/onClick`
- Guard: `rating === 0` → `toast.warn()`

### 6.2 — [MODIFY] [PatientProfile.jsx](file:///c:/Users/USER/Documents/DOAN1/bookingcare-frontend/src/containers/PatientPortal/PatientProfile.jsx)

**GIỮ NGUYÊN 100%:**
- `fileInputRef` — `useRef(null)` — **giữ ref**
- State `profile` = `{ firstName, lastName, phoneNumber, address, gender, image, email }`
- `handleAvatarChange` — FileReader → Base64, guard `MAX_FILE_SIZE`
- `handleSaveProfile` → `editPatientProfile(dataToSend)` → `dispatch(updateUserInfo({firstName, lastName, image}))`
- `handleChangePassword` → `changePassword({currentPassword, newPassword})` → `dispatch(processLogout())` → `navigate('/login')`
- `handleProfileChange(e)` — `e.target.name/value` two-way binding

### 6.3 — [MODIFY] [AppointmentHistory.jsx](file:///c:/Users/USER/Documents/DOAN1/bookingcare-frontend/src/containers/PatientPortal/AppointmentHistory.jsx)

- Giữ nguyên toàn bộ logic fetch, pagination, cancel booking, rating modal integration
- UI: đắp `tw-*` classes

> [!WARNING]
> **NGOẠI LỆ LOGIC — AUDIT FIX #5 (Lệch Contract FE/BE):**
> Đây là trường hợp **NGOẠI LỆ** cho quy tắc "Đóng băng logic". Code gốc `AppointmentHistory.jsx` đang bị **lệch contract** giữa Frontend và Backend:
> - **FE đang đọc:** `item.doctorData` và `item.timeTypeData` để hiển thị tên bác sĩ và khung giờ.
> - **BE thực tế trả về:** `item.doctorBookingData` và `item.timeTypeBooking` (do cấu hình `as:` alias trong Sequelize include).
>
> **Yêu cầu DEV:** PHẢI FIX lỗi mapping object này **ngay trong quá trình refactor UI** để dữ liệu hiển thị đúng. Cụ thể: đổi `item.doctorData` → `item.doctorBookingData` và `item.timeTypeData` → `item.timeTypeBooking` tại mọi vị trí render trong component. Kiểm tra response thực tế từ API `/api/v1/patient/bookings` để xác nhận đúng tên alias trước khi deploy.

---

## AUDIT CHECKLIST — FINAL QUALITY GATE (27 items)

| # | Hạng mục | Kiểm tra | ⬜ |
|---|---|---|---|
| 1 | **Version Tailwind** | `tailwindcss@3.4.17` + Vite 6. **KHÔNG cần `@craco/craco`** | ⬜ |
| 2 | **SCSS Conflict** | `prefix: 'tw-'`, `preflight: false`, `important: true`. File `.scss` cũ KHÔNG XÓA | ⬜ |
| 3 | **Mất ref** | `fileInputRef` (PatientProfile) + `dropdownRef` (Header) giữ nguyên | ⬜ |
| 4 | **Route Nuốt** | v6 nested routes. `<Navigate to="dashboard">` thay `user-manage` | ⬜ |
| 5 | **Dropdown Clipping** | CẤM `tw-overflow-hidden` trên Card chứa `<select>` | ⬜ |
| 6 | **Role Security** | 5 endpoint stats: `verifyToken` + `checkAdminRole` | ⬜ |
| 7 | **Form Binding** | `value={state.xxx}` + `onChange={handler}` — KHÔNG đổi event structure | ⬜ |
| 8 | **Redux Persist** | Whitelist `['user', 'app']` — không thay đổi | ⬜ |
| 9 | **Recharts Height** | `<ResponsiveContainer>` trong `tw-w-full tw-h-[300px] tw-min-w-0` | ⬜ |
| 10 | **Fullscreen Markdown** | **Given:** Viewport `375px` (Mobile), Sidebar đang mở. **When:** User click nút Fullscreen trên `MarkdownEditorField`. **Then:** Editor **PHẢI che phủ hoàn toàn** Sidebar + Header (z-index Editor ≥ `1001`, đè `system-header` `1000`) | ⬜ |
| 11 | **AbortController** | Dashboard `useEffect`: `new AbortController()` + `signal` → API calls + `controller.abort()` trong cleanup. FE `statisticService.js` tất cả hàm nhận `options.signal`. **KHÔNG dùng `useRef(isMounted)` đơn thuần** | ⬜ |
| 12 | **API Try-Catch** | Toàn bộ Controller BE: `try...catch` → `errCode: -1` | ⬜ |
| 13 | **SQL Injection** | Raw Query dùng `replacements: {}` — KHÔNG concatenation | ⬜ |
| 14 | **SQL Timezone** | Sequelize `timezone: '+07:00'` + Raw Query `FROM_UNIXTIME(...)` đơn giản. **CẤM** dùng cả 2 lớp cùng lúc. **Verify Hard-Fail boot check:** nếu `@@session.time_zone !== '+07:00'` → server `process.exit(1)`. **Chạy 3 bước Regression Playbook** | ⬜ |
| 15 | **Recharts Zigzag** | `ORDER BY bookingDate ASC` trong mọi GROUP BY ngày | ⬜ |
| 16 | **i18n Dynamic** | **Given:** Dashboard đang hiển thị biểu đồ (Pie Chart có label trạng thái S1/S2/S3). **When:** User nhấn nút `EN` trên system-header. **Then:** Tên các trạng thái **PHẢI chuyển sang tiếng Anh ngay lập tức** mà không cần F5. **Edge case — Abort:** Đổi ngôn ngữ nhanh liên tục → request trước bị abort, UI không crash. **Edge case — Text Overflow:** Kiểm tra label tiếng Anh dài hơn tiếng Việt (VD: "Confirmed" vs "Xác nhận") → chart **KHÔNG vỡ layout**, text không bị tràn ra ngoài container | ⬜ |
| 17 | **Icon Integrity** | Trang cũ: FontAwesome GIỮ NGUYÊN. Dashboard: `lucide-react` | ⬜ |
| 18 | **Component Type** | Tất cả Function Component — KHÔNG convert, KHÔNG Class Component | ⬜ |
| 19 | **Image Encode/Decode** | `CommonUtils.decodeBase64Image`, `getBase64` — KHÔNG can thiệp | ⬜ |
| 20 | **Moment Timezone** | Pattern: `moment.utc(dateString).startOf('day').valueOf()` giữ nguyên | ⬜ |
| 21 | **SCSS Toàn cục** | TUYỆT ĐỐI KHÔNG xóa bất kỳ file `.scss` nào trong `src/` — bảo tồn nguyên trạng Phases 1-9 | ⬜ |
| 22 | **Sequelize Timezone** | `models/index.js` phải có `timezone: '+07:00'` + `dialectOptions.useUTC: false` + **`hooks: { afterConnect }`** dùng **Manual Promise** (`new Promise` + callback). Verify: `resolve()` CHỈ được gọi SAU KHI MySQL callback xác nhận `SET time_zone` thành công; `reject(err)` nếu thất bại. **KHÔNG dùng `async/await connection.query`** (mysql2 callback-based). **KHÔNG dùng `pool.afterConnect`** | ⬜ |
| 23 | **Validation Inline** | Validation khớp 100% code legacy. ScheduleManage dùng `showWarning()` + check `newTimes` | ⬜ |
| 24 | **Z-Index / Portal Layering** | **Given:** Trang Admin có `react-select` dropdown. **When:** User click mở dropdown với `menuPortalTarget={document.body}`. **Then:** Menu portal có `z-index: 10001` (nổi trên Toast `10000` + Header `1000`). Khi SweetAlert2 mở (`z-index: 10002`) → Alert **PHẢI đè** dropdown. Thứ tự: `SweetAlert(10002) > Portal(10001) > Toast(10000) > Header(1000) > Sidebar(900)` | ⬜ |
| 25 | **Tailwind Content** | `content: ["./src/**/*.{js,jsx,ts,tsx}"]` — future-proof cho TypeScript migration | ⬜ |
| 26 | **Null Safety** | Dashboard: mọi `setState(res.data || [])` — normalize null/undefined → `[]` trước khi đưa vào Recharts. **LƯU Ý:** dùng `res.data` (KHÔNG phải `res.data.data`) vì interceptor đã strip wrapper | ⬜ |
| 27 | **DB Index Perf** | Chấp nhận `CAST(date AS UNSIGNED)` GĐ 10. **Trigger refactor:** Bookings ≥ 50k records **HOẶC** p95 query time vượt `500ms` (bất kể số lượng record) → PHẢI thêm Generated Column `dateNumeric BIGINT` + Index | ⬜ |

---

## PHẦN 7: LỘ TRÌNH THỰC THI (10.1 – 10.5)

### 📋 GĐ 10.1 — HẠ TẦNG & CẤU HÌNH (1 ngày)

- [ ] Cài `tailwindcss@3.4.17`, `postcss@8.4.49`, `autoprefixer@10.4.20` — `[ADD] package.json`
- [ ] Cài `recharts@2.15.3`, `lucide-react@0.469.0` — `[ADD] package.json`
- [ ] Tạo `postcss.config.js` — `[ADD] root FE`
- [ ] Tạo `tailwind.config.js` (prefix, colors, preflight off) — `[ADD] root FE`
- [ ] Tạo `src/styles/tailwind.css` — `[ADD] src/styles/`
- [ ] Thêm import `tailwind.css` vào `main.jsx` — `[MODIFY] src/main.jsx`
- [ ] Thêm key i18n Dashboard vào `vi.json` + `en.json` — `[MODIFY] src/translations/`
- [ ] **Kiểm tra:** `npm run dev` — build thành công, SCSS không lỗi, tw-* classes hoạt động

### 📋 GĐ 10.2 — BACKEND API STATISTICS (1 ngày)

- [ ] Tạo `statisticService.js` (5 hàm Raw Query) — `[ADD] BE: src/services/`
- [ ] Tạo `statisticController.js` (5 handler, try-catch) — `[ADD] BE: src/controllers/`
- [ ] Thêm 5 route vào `web.js` (verifyToken + checkAdminRole) — `[MODIFY] BE: src/routes/web.js`
- [ ] Tạo `statisticService.js` FE (5 hàm API) — `[ADD] FE: src/services/`
- [ ] **Kiểm tra:** Postman test 5 endpoint — data đúng, timezone đúng, sort ASC
- [ ] **Kiểm tra Pool Timezone (v1.8):** Mở **10 tab Dashboard cùng lúc** để ép Sequelize tạo nhiều connection trong pool → kiểm tra log database xác nhận lệnh `SET time_zone = '+07:00'` được gọi tương ứng cho **mỗi connection**. Verify: `SELECT @@session.time_zone` trên mỗi connection đều trả `+07:00`

### 📋 GĐ 10.3 — ROUTING + LAYOUT + DASHBOARD (2 ngày)

- [ ] Thêm `DASHBOARD` path vào `constants.js` — `[MODIFY]`
- [ ] Thêm Dashboard route vào `App.jsx` — `[MODIFY]`
- [ ] Thêm menu Dashboard vào `MenuData.js` — `[MODIFY]`
- [ ] Thêm icon Dashboard vào `Navigator.jsx` — `[MODIFY]`
- [ ] Thêm toggle sidebar vào `SystemLayout.jsx` + `.scss` — `[MODIFY]`
- [ ] Tạo `Dashboard.jsx` (KPI + 4 Charts + Filter) — `[ADD]`
- [ ] **Kiểm tra:** Login R1 → /system → redirect /system/dashboard. Charts render. Filter hoạt động.

### 📋 GĐ 10.4 — UI ADMIN + DOCTOR REFACTOR (2 ngày)

- [ ] Refactor `UserManage.jsx` — tw-* classes — `[MODIFY]`
- [ ] Refactor `DoctorManage.jsx` — tw-* classes — `[MODIFY]`
- [ ] Refactor `ClinicManage.jsx` — tw-* classes — `[MODIFY]`
- [ ] Refactor `SpecialtyManage.jsx` — tw-* classes — `[MODIFY]`
- [ ] Refactor `ScheduleManage.jsx` — tw-* classes — `[MODIFY]`
- [ ] Refactor `ManagePatient.jsx` — tw-* classes — `[MODIFY]`
- [ ] Refactor `RemedyModal.jsx` — tw-* classes — `[MODIFY]`
- [ ] **Kiểm tra:** CRUD Users/Doctors/Clinics/Specialties/Schedules. Doctor flow. Form binding OK.

### 📋 GĐ 10.5 — UI PATIENT + FINAL AUDIT (1 ngày)

- [ ] Refactor `PatientProfile.jsx` — tw-* classes — `[MODIFY]`
- [ ] Refactor `AppointmentHistory.jsx` — tw-* classes — `[MODIFY]`
- [ ] Refactor `RatingModal.jsx` — tw-* classes — `[MODIFY]`
- [ ] Chạy **Final Audit Checklist** (27 items)
- [ ] Full flow test: R1 → Dashboard → CRUD; R2 → ManagePatient → Remedy; R3 → Profile → History → Rating
- [ ] Verify: Không SCSS conflict, không mất ref, không dropdown clipping, không memory leak

---

> [!NOTE]
> **Tổng thời gian ước tính: 7 ngày làm việc**

> [!WARNING]
> **SCSS — QUY TẮC TỐI THƯỢNG (AUDIT FIX — Rò rỉ SCSS):**
> **TUYỆT ĐỐI KHÔNG xóa bất kỳ file `.scss` hiện có nào trong thư mục `src/`.** Danh sách dưới đây chỉ là **minh họa**, quy tắc tối thượng là **bảo tồn nguyên trạng toàn bộ hạ tầng SCSS của Phases 1-9**, bao gồm nhưng không giới hạn: `UserManage.scss`, `DoctorManage.scss`, `ClinicManage.scss`, `SpecialtyManage.scss`, `ScheduleManage.scss`, `ManagePatient.scss`, `SystemLayout.scss`, `PatientProfile.scss`, `AppointmentHistory.scss`, `RatingModal.scss`, `Header.scss`, `Navigator.scss`, `PatientLayout.scss`, `global.scss`, `_variables.scss`, `_mixins.scss`, và mọi file `.scss` khác tồn tại trong `src/`.
>
> **File TUYỆT ĐỐI KHÔNG SỬA LOGIC:** `axiosConfig.js`, `userService.js`, `doctorService.js`, `patientService.js`, `reviewService.js`, `clinicService.js`, `specialtyService.js`, `userSlice.js`, `adminSlice.js`, `appSlice.js`, `doctorSlice.js`, `store.js`, `PrivateRoute.jsx`, `IntlProviderWrapper.jsx`, `CommonUtils.js`, `confirmDelete.js`, toàn bộ Backend models + middleware.
>
> **NGOẠI LỆ DUY NHẤT cho Backend models (v2.0 — Zero Trust):** Cho phép chỉnh sửa **sâu** file `src/models/index.js` bao gồm: cấu hình `timezone: '+07:00'`, `dialectOptions` (`useUTC: false`, `dateStrings: true`, `typeCast: true`), và `hooks: { afterConnect }` dùng **Manual Promise** (`new Promise` + callback) để khóa chặt múi giờ cho mọi kết nối. **KHÔNG dùng `async/await connection.query`** (mysql2 callback-based). **KHÔNG dùng `pool.afterConnect`**. Quy tắc này **nhất quán** với Mục 3.2.

---

## PHỤ LỤC A: GUARD VALIDATION CỦA USERMANAGE (Source-of-Truth)

> [!IMPORTANT]
> **Phụ lục này liệt kê CHÍNH XÁC logic validation trong `UserManage.handleSubmit` theo code legacy thực tế (đã đối chiếu source).** Dev PHẢI bảo tồn nguyên trạng khi refactor UI. KHÔNG thêm, KHÔNG bớt, KHÔNG thay đổi thứ tự.

```js
// File: src/containers/System/Admin/UserManage.jsx — handleSubmit (line 127-176)

// Guard 1: Email bắt buộc. Password bắt buộc khi TẠO MỚI (isEditing=false).
if (!formData.email || (!isEditing && !formData.password)) {
  showWarning(
    intl.formatMessage({ id: 'admin.manage.user.toast-missing-info' }),
    intl.formatMessage({ id: 'admin.manage.user.toast-missing-info-desc' })
  );
  return;
}

// Guard 2: Password tối thiểu 6 ký tự (chỉ khi tạo mới).
if (!isEditing && formData.password.length < 6) {
  showWarning(
    intl.formatMessage({ id: 'admin.manage.user.toast-password-short' }),
    intl.formatMessage({ id: 'admin.manage.user.toast-password-short-desc' })
  );
  return;
}

// Payload gửi BE — Lưu ý:
// - gender, roleId, positionId: được init từ allcode defaults (genders[0], roles[0], positions[0])
//   → Luôn có giá trị hợp lệ, KHÔNG cần validate riêng.
// - firstName, lastName, address, phoneNumber: KHÔNG có guard riêng — BE xử lý nếu thiếu.
// - image: gửi imageBase64 || undefined (không validate ở FE).
// - password: CHỈ gửi khi tạo mới (!isEditing), KHÔNG gửi khi edit.
```

> [!WARNING]
> **CÁC TRƯỜNG KHÔNG CÓ GUARD RIÊNG Ở FE (theo code legacy) — ĐÍNH CHÍNH v1.7 (Vá lỗi G3):**
> - `firstName`, `lastName` — **KHÔNG** check rỗng ở FE (để giữ nguyên UI legacy), **NHƯNG LÀ TRƯỜNG BẮT BUỘC (Required) ở tầng Backend**. Dev phải đảm bảo dữ liệu không được rỗng khi gửi API. Nếu Backend trả `errCode !== 0` do thiếu firstName/lastName, FE phải hiển thị thông báo lỗi từ `res.message`.
> - `gender` — default từ `genders[0]?.keyMap` khi form mở → không bao giờ rỗng (**nếu Allcode load thành công** — xem Guard G4 ở Mục 4.2)
> - `roleId` — default từ `roles[0]?.keyMap` → không bao giờ rỗng (**nếu Allcode load thành công**)
> - `positionId` — default từ `positions[0]?.keyMap` → không bao giờ rỗng (**nếu Allcode load thành công**)
> - `phoneNumber`, `address` — optional, không guard
>
> Dev **TUYỆT ĐỐI KHÔNG** thêm guard validation mới cho các trường này khi refactor UI, trừ khi có yêu cầu feature mới rõ ràng.
