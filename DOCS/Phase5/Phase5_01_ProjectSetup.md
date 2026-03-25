# 📦 BƯỚC 1 — KHỞI TẠO PROJECT REACT + VITE

> **Mục tiêu:** Tạo project React.js với Vite, cài đặt toàn bộ dependencies, cấu hình cơ bản  
> **Thời gian:** Ngày 1  
> **Điều kiện tiên quyết:** Node.js v18+, npm v9+

---

## 1.1 Khởi Tạo Project Vite

Mở terminal, trỏ đến thư mục `bookingcare-frontend`:

```bash
cd c:\Users\USER\Documents\DOAN1\bookingcare-frontend
```

Khởi tạo Vite project:

```bash
npx -y create-vite@latest ./ --template react
```

> ⚠️ Nếu hỏi "Current directory is not empty", chọn **Yes** để tiếp tục (vì đã có folder `DOCS`).

Sau khi tạo xong, cấu trúc mặc định của Vite:

```
bookingcare-frontend/
├── public/
│   └── vite.svg
├── src/
│   ├── App.css
│   ├── App.jsx
│   ├── index.css
│   ├── main.jsx
│   └── assets/
│       └── react.svg
├── .gitignore
├── index.html
├── package.json
└── vite.config.js
```

---

## 1.2 Cài Đặt Dependencies

### Dependencies chính (production):

```bash
npm install react-router-dom@6 axios @reduxjs/toolkit react-redux redux-persist react-intl bootstrap react-bootstrap sass react-slick slick-carousel react-markdown moment lodash sweetalert2
```

**Giải thích từng package:**

| Package | Mục đích | SRS liên quan |
|---------|----------|---------------|
| `react-router-dom@6` | Routing giữa các trang (SPA) | SRS 2.4 #5 |
| `axios` | Gửi HTTP request đến Backend API | Kết nối 30 endpoints |
| `@reduxjs/toolkit` | State management (modern Redux) | SRS 2.4 #5 |
| `react-redux` | Kết nối Redux với React components | SRS 2.4 #5 |
| `redux-persist` | Lưu Redux state vào localStorage | REQ-AU-009, IL-007 |
| `react-intl` | Đa ngôn ngữ Vi/En | SRS Section 7 (IL-001→007) |
| `bootstrap` | CSS Framework responsive | SRS 5.1 |
| `react-bootstrap` | Bootstrap components cho React | SRS 5.1 |
| `sass` | SCSS compiler | Custom styling |
| `react-slick` | Carousel/Slider component | REQ-PT-001, 003, 004, 005 |
| `slick-carousel` | CSS cho react-slick | Đi kèm react-slick |
| `react-markdown` | Render bài viết Markdown bác sĩ | REQ-PT-008 |
| `moment` | Format ngày giờ | Hiển thị lịch khám |
| `lodash` | Utility functions (debounce, etc.) | Search bar, helpers |
| `sweetalert2` | Dialog xác nhận/thông báo đẹp | UX tốt hơn alert() |

---

## 1.3 Tạo File `.env`

Tạo file `.env` ở thư mục gốc `bookingcare-frontend/`:

```env
# Backend API URL (khớp với backend PORT=8080)
VITE_BACKEND_URL=http://localhost:8080

# App Name
VITE_APP_NAME=BookingCare
```

> **Lưu ý Vite:** Tất cả biến môi trường trong Vite **BẮT BUỘC** phải bắt đầu bằng `VITE_`.  
> Trong code truy cập qua: `import.meta.env.VITE_BACKEND_URL`  
> (Khác CRA dùng `REACT_APP_` và `process.env.REACT_APP_`)

---

## 1.4 Cấu Hình `vite.config.js`

Mở `vite.config.js` và thay toàn bộ nội dung:

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,       // Khớp với backend URL_REACT=http://localhost:3000
    open: true,        // Tự mở browser khi chạy dev
  },
  css: {
    preprocessorOptions: {
      scss: {
        // Tự động import biến SCSS vào mọi file .scss
        additionalData: `
          @use "src/styles/_variables" as *;
          @use "src/styles/_mixins" as *;
        `,
      },
    },
  },
});
```

**Giải thích:**
- `port: 3000` → Backend đã cấu hình `URL_REACT=http://localhost:3000` cho CORS, nên frontend **bắt buộc** chạy port 3000
- `open: true` → Tự động mở browser khi chạy `npm run dev`
- `additionalData` → Tự động inject biến SCSS (`$primary`, `$mobile`, ...) vào **mọi file** `.scss` mà không cần `@import` thủ công

---

## 1.5 Cập Nhật `.gitignore`

Thêm vào `.gitignore`:

```gitignore
# Dependencies
node_modules/

# Environment
.env
.env.local
.env.*.local

# Build output
dist/

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db
```

---

## 1.6 Dọn Dẹp Files Mặc Định

Xóa các file mặc định không cần:

```bash
# Xóa file demo
del src\App.css
del src\index.css
del src\assets\react.svg
del public\vite.svg
```

---

## 1.7 Tạo Cấu Trúc Thư Mục

Tạo tất cả thư mục con theo kiến trúc:

```bash
# Assets
mkdir src\assets\images

# Components
mkdir src\components\Header
mkdir src\components\Footer
mkdir src\components\Loading
mkdir src\components\Navigator

# Containers
mkdir src\containers\Auth
mkdir src\containers\HomePage\Sections
mkdir src\containers\Patient\Doctor
mkdir src\containers\Patient\Specialty
mkdir src\containers\Patient\Clinic
mkdir src\containers\System\Admin
mkdir src\containers\System\Doctor

# Redux
mkdir src\redux\slices

# Services
mkdir src\services

# Translations
mkdir src\translations

# Styles
mkdir src\styles

# Utils
mkdir src\utils

# Routes
mkdir src\routes
```

---

## 1.8 Tạo File Entry Point `src/main.jsx`

Thay toàn bộ nội dung `src/main.jsx`:

```jsx
// src/main.jsx
// Entry point — Wrap App với Redux Provider, Redux-Persist, React-Intl, Router
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { BrowserRouter } from 'react-router-dom';
import { store, persistor } from './redux/store';
import IntlProviderWrapper from './containers/IntlProviderWrapper';
import App from './containers/App';

// Import Bootstrap CSS
import 'bootstrap/dist/css/bootstrap.min.css';

// Import Slick Carousel CSS
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';

// Import Global SCSS
import './styles/global.scss';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <BrowserRouter>
          <IntlProviderWrapper>
            <App />
          </IntlProviderWrapper>
        </BrowserRouter>
      </PersistGate>
    </Provider>
  </React.StrictMode>
);
```

**Giải thích thứ tự bọc (từ ngoài → trong):**

```
<Provider>                  ← Redux Store (toàn cục)
  <PersistGate>             ← Đợi redux-persist rehydrate xong
    <BrowserRouter>         ← React Router
      <IntlProviderWrapper> ← Đa ngôn ngữ (đọc language từ Redux)
        <App/>              ← Component gốc + Routes
```

> 💡 **IntlProviderWrapper** là component tự tạo (ở Bước 4), nó đọc `language` từ Redux store rồi chọn file translation phù hợp.

---

## 1.9 Tạo Placeholder `src/containers/App.jsx`

Tạm tạo file App.jsx đơn giản để test:

```jsx
// src/containers/App.jsx
// Placeholder — sẽ hoàn thiện ở Bước 4 (Routing)
import React from 'react';

const App = () => {
  return (
    <div className="app-container">
      <h1>BookingCare Frontend</h1>
      <p>Phase 5 — Frontend cơ bản đang được xây dựng...</p>
    </div>
  );
};

export default App;
```

---

## 1.10 Tạo Placeholder `IntlProviderWrapper`

```jsx
// src/containers/IntlProviderWrapper.jsx
// Placeholder — sẽ hoàn thiện ở Bước 4
import React from 'react';

const IntlProviderWrapper = ({ children }) => {
  return <>{children}</>;
};

export default IntlProviderWrapper;
```

---

## 1.11 Test Chạy Lần Đầu

```bash
npm run dev
```

**Kết quả mong đợi:**
- Terminal hiện: `VITE v6.x.x ready in xxx ms`
- Browser tự mở `http://localhost:3000`
- Hiển thị: "BookingCare Frontend"
- Không có lỗi trong Console

---

## ✅ Checklist Bước 1

- [ ] Project Vite khởi tạo thành công
- [ ] Tất cả dependencies đã cài 
- [ ] File `.env` đã tạo với `VITE_BACKEND_URL`
- [ ] `vite.config.js` đã cấu hình port 3000 + SCSS
- [ ] Cấu trúc thư mục `src/` đã tạo đầy đủ
- [ ] `main.jsx` đã cấu hình Provider/PersistGate/Router
- [ ] `npm run dev` chạy thành công trên `localhost:3000`

---

> 📖 **Tiếp theo:** Mở file [Phase5_02_Redux_Store.md](Phase5_02_Redux_Store.md) để thiết lập Redux store.
