# 🔐 BƯỚC 7 — TRANG ĐĂNG NHẬP + XỬ LÝ AUTHENTICATION

> **Mục tiêu:** Xây dựng trang Login, xử lý đăng nhập/đăng xuất, redirect theo role  
> **Thời gian:** Ngày 8-9  
> **SRS liên quan:** REQ-AU-001 (đăng nhập), REQ-AU-003 (JWT), REQ-AU-005 (redirect role), REQ-AU-007 (lỗi cụ thể)

---

## 7.1 Login Component — `src/containers/Auth/Login.jsx`

```jsx
// src/containers/Auth/Login.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { FormattedMessage, useIntl } from 'react-intl';
import { loginUser, clearLoginError } from '../../redux/slices/userSlice';
import { ROLE, path } from '../../utils/constants';
import './Login.scss';

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const intl = useIntl();

  // Redux state
  const { isLoggedIn, userInfo, loginError } = useSelector((state) => state.user);

  // Local state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Nếu đã đăng nhập → redirect theo role (REQ-AU-005)
  useEffect(() => {
    if (isLoggedIn && userInfo) {
      redirectByRole(userInfo.roleId);
    }
  }, [isLoggedIn, userInfo]);

  // Redirect theo role
  const redirectByRole = (roleId) => {
    switch (roleId) {
      case ROLE.ADMIN:
        navigate(path.USER_MANAGE, { replace: true });
        break;
      case ROLE.DOCTOR:
        navigate(path.MANAGE_PATIENT, { replace: true });
        break;
      default:
        navigate(path.HOME, { replace: true });
        break;
    }
  };

  // Xử lý submit form (REQ-AU-001)
  const handleLogin = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const result = await dispatch(loginUser({ email, password })).unwrap();
      // Nếu thành công, useEffect ở trên sẽ tự redirect
    } catch (err) {
      // loginError đã được set trong userSlice (REQ-AU-007)
      console.log('>>> Login failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Xử lý nhấn Enter
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleLogin(e);
    }
  };

  // Clear lỗi khi user bắt đầu gõ lại
  const handleInputChange = (setter) => (e) => {
    setter(e.target.value);
    if (loginError) {
      dispatch(clearLoginError());
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        {/* Header */}
        <div className="login-header">
          <h1 className="login-logo" onClick={() => navigate(path.HOME)}>
            BookingCare
          </h1>
          <h2 className="login-title">
            <FormattedMessage id="login.title" />
          </h2>
        </div>

        {/* Form */}
        <form className="login-form" onSubmit={handleLogin}>
          {/* Email */}
          <div className="form-group">
            <label htmlFor="login-email">
              <FormattedMessage id="login.email" />
            </label>
            <div className="input-wrapper">
              <i className="fas fa-envelope input-icon"></i>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={handleInputChange(setEmail)}
                onKeyDown={handleKeyDown}
                placeholder={intl.formatMessage({ id: 'login.email' })}
                autoFocus
                required
              />
            </div>
          </div>

          {/* Password */}
          <div className="form-group">
            <label htmlFor="login-password">
              <FormattedMessage id="login.password" />
            </label>
            <div className="input-wrapper">
              <i className="fas fa-lock input-icon"></i>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={handleInputChange(setPassword)}
                onKeyDown={handleKeyDown}
                placeholder={intl.formatMessage({ id: 'login.password' })}
                required
              />
              {/* Toggle show/hide password */}
              <i
                className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'} toggle-password`}
                onClick={() => setShowPassword(!showPassword)}
              ></i>
            </div>
          </div>

          {/* Hiển thị lỗi — REQ-AU-007 */}
          {loginError && (
            <div className="login-error">
              <i className="fas fa-exclamation-circle"></i>
              <span>{loginError}</span>
            </div>
          )}

          {/* Nút đăng nhập */}
          <button
            type="submit"
            className="btn-login"
            disabled={isSubmitting || !email || !password}
          >
            {isSubmitting ? (
              <>
                <span className="spinner-border spinner-border-sm me-2"></span>
                <FormattedMessage id="common.loading" />
              </>
            ) : (
              <FormattedMessage id="login.btn-login" />
            )}
          </button>

          {/* Quên mật khẩu (tạm thời placeholder) */}
          <div className="login-footer">
            <span className="forgot-password">
              <FormattedMessage id="login.forgot-password" />
            </span>
          </div>
        </form>

        {/* Quay về trang chủ */}
        <div className="back-home">
          <span onClick={() => navigate(path.HOME)}>
            ← Quay về trang chủ
          </span>
        </div>
      </div>
    </div>
  );
};

export default Login;
```

---

## 7.2 Login SCSS — `src/containers/Auth/Login.scss`

```scss
// src/containers/Auth/Login.scss
.login-page {
  min-height: 100vh;
  @include flex-center;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  padding: $spacing-md;

  .login-container {
    width: 100%;
    max-width: 420px;
    background: $bg-white;
    border-radius: $radius-lg;
    padding: $spacing-xl;
    box-shadow: $shadow-lg;
  }

  .login-header {
    text-align: center;
    margin-bottom: $spacing-xl;

    .login-logo {
      font-size: 2rem;
      font-weight: 700;
      color: $primary;
      cursor: pointer;
      margin-bottom: $spacing-sm;
    }

    .login-title {
      font-size: 1.2rem;
      color: $text-secondary;
      font-weight: 400;
    }
  }

  .login-form {
    .form-group {
      margin-bottom: $spacing-md;

      label {
        display: block;
        font-size: $font-size-sm;
        font-weight: 500;
        color: $text-secondary;
        margin-bottom: $spacing-xs;
      }

      .input-wrapper {
        position: relative;
        display: flex;
        align-items: center;

        .input-icon {
          position: absolute;
          left: 14px;
          color: $text-light;
          font-size: 0.9rem;
        }

        input {
          width: 100%;
          padding: 12px 40px;
          border: 1px solid $border-color;
          border-radius: $radius-md;
          font-size: $font-size-base;
          transition: border-color 0.2s;
          outline: none;

          &:focus {
            border-color: $primary;
            box-shadow: 0 0 0 3px rgba($primary, 0.1);
          }

          &::placeholder {
            color: $text-light;
          }
        }

        .toggle-password {
          position: absolute;
          right: 14px;
          cursor: pointer;
          color: $text-light;
          &:hover { color: $text-primary; }
        }
      }
    }

    .login-error {
      display: flex;
      align-items: center;
      gap: $spacing-sm;
      padding: $spacing-sm $spacing-md;
      background-color: rgba($danger, 0.08);
      color: $danger;
      border-radius: $radius-sm;
      font-size: $font-size-sm;
      margin-bottom: $spacing-md;
      animation: shake 0.4s ease-in-out;

      i { font-size: 0.9rem; }
    }

    .btn-login {
      width: 100%;
      padding: 12px;
      background-color: $primary;
      color: $text-white;
      border: none;
      border-radius: $radius-md;
      font-size: $font-size-lg;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      @include flex-center;

      &:hover:not(:disabled) {
        background-color: $primary-dark;
        transform: translateY(-1px);
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }

    .login-footer {
      text-align: center;
      margin-top: $spacing-md;

      .forgot-password {
        color: $primary;
        font-size: $font-size-sm;
        cursor: pointer;
        &:hover { text-decoration: underline; }
      }
    }
  }

  .back-home {
    text-align: center;
    margin-top: $spacing-md;
    padding-top: $spacing-md;
    border-top: 1px solid $border-color;

    span {
      color: $text-light;
      cursor: pointer;
      font-size: $font-size-sm;
      &:hover { color: $primary; }
    }
  }
}

// Shake animation khi login lỗi
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}
```

---

## 7.3 Flow Đăng Nhập Hoàn Chỉnh

```
                     ┌──────────────────┐
                     │   Trang Login    │
                     │   (/login)       │
                     └────────┬─────────┘
                              │
                     User nhập email + password
                              │
                     ┌────────▼─────────┐
                     │  dispatch(       │
                     │  loginUser())    │
                     └────────┬─────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
          errCode=0       errCode=1       errCode=3
          (Thành công)    (Email sai)     (MK sai)
              │               │               │
    ┌─────────▼─────────┐    ▼               ▼
    │ Redux state:      │  loginError =   loginError =
    │ isLoggedIn: true  │  "Email không   "Sai mật khẩu!"
    │ userInfo: {...}   │   tồn tại!"
    │ accessToken: JWT  │
    └─────────┬─────────┘
              │
     useEffect → redirect
              │
     ┌────────┼──────────┐
     │        │          │
   R1=Admin  R2=Doctor   R3=Patient
     │        │          │
     ▼        ▼          ▼
  /system/  /doctor-    / (home)
  user-     dashboard/
  manage    manage-
            patient
```

---

## 7.4 Tích Hợp Font Awesome Icons

Các icon sử dụng trong Login và Header cần Font Awesome. Thêm CDN vào `index.html`:

```html
<!-- public/index.html hoặc index.html (Vite) -->
<head>
  <!-- ... existing head ... -->
  
  <!-- Font Awesome -->
  <link 
    rel="stylesheet" 
    href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" 
  />
  
  <!-- Google Fonts: Roboto -->
  <link 
    rel="stylesheet" 
    href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap" 
  />

  <title>BookingCare — Đặt lịch khám bệnh trực tuyến</title>
</head>
```

---

## 7.5 Test Đăng Nhập

### Chuẩn bị:
1. **Backend đang chạy:** `cd bookingcare-backend && npm run dev` → `http://localhost:8080`
2. **Database đã seed:** Admin account `admin@bookingcare.vn` / `123456`
3. **Frontend đang chạy:** `cd bookingcare-frontend && npm run dev` → `http://localhost:3000`

### Test cases:

| # | Hành động | Kết quả mong đợi |
|---|-----------|-----------------|
| 1 | Mở `/login` | Hiển thị form đăng nhập với email + password |
| 2 | Nhấn Đăng nhập khi chưa nhập | Nút disabled (không click được) |
| 3 | Nhập email sai → Login | Hiện "Email không tồn tại!" + shake animation |
| 4 | Nhập email đúng, password sai | Hiện "Sai mật khẩu!" |
| 5 | Nhập `admin@bookingcare.vn` + `123456` | Redirect → `/system/user-manage` |
| 6 | Mở Redux DevTools | `user.isLoggedIn: true`, `user.accessToken: "eyJ..."` |
| 7 | Mở Application → localStorage | Key `persist:root` chứa user info |
| 8 | Refresh trang | Vẫn đăng nhập (redux-persist) |
| 9 | Click Đăng xuất | Redirect → `/`, token bị xóa |
| 10 | Truy cập `/system/user-manage` khi chưa login | Redirect → `/login` |
| 11 | Click nút VN/EN | Text chuyển đổi ngay (không reload) |

---

## ✅ Checklist Bước 7

- [ ] `src/containers/Auth/Login.jsx` — Form login hoàn chỉnh
- [ ] `src/containers/Auth/Login.scss` — UI đẹp, gradient background, animations
- [ ] Show/hide password toggle hoạt động
- [ ] Hiển thị lỗi cụ thể từ backend (REQ-AU-007)
- [ ] Redirect theo role sau login (REQ-AU-005)
- [ ] Token lưu vào Redux → localStorage (REQ-AU-009, redux-persist)
- [ ] Auto logout khi token hết hạn (REQ-AU-006, axios interceptor)
- [ ] PrivateRoute chặn truy cập khi chưa login (REQ-AU-008)
- [ ] Font Awesome + Google Fonts tích hợp
- [ ] Test tất cả 11 test cases trên

---

## 🎉 Hoàn Thành Giai Đoạn 5!

Sau khi hoàn thành tất cả 7 bước, bạn có:

| Thành phần | Số lượng | Chi tiết |
|-----------|----------|---------|
| **Pages** | 2 hoàn chỉnh + 5 placeholder | HomePage, Login + DoctorDetail, SpecialtyDetail, ClinicDetail, VerifyEmail, SystemLayout |
| **Components** | 4 | Header, Footer, Loading, Banner/Search |
| **Redux Slices** | 3 | appSlice, userSlice, adminSlice |
| **API Services** | 5 files, 30 functions | Tất cả endpoints backend |
| **i18n** | 2 files, ~60 keys | vi.json, en.json |
| **Routes** | 10+ | Public + Admin (R1) + Doctor (R2) |
| **Styles** | SCSS theme hoàn chỉnh | variables, mixins, global |

### Giai Đoạn Tiếp Theo:
- **Giai đoạn 6 (06/04 – 16/04):** Module Admin Frontend — CRUD Users, Doctors, Clinics, Specialties, Schedules
- **Giai đoạn 7 (17/04 – 30/04):** Module Patient Frontend — DoctorDetail, BookingModal, VerifyEmail
- **Giai đoạn 8 (01/05 – 12/05):** Module Doctor Frontend — ManagePatient, SendRemedy

---

> 📖 **Quay lại tổng quan:** [Phase5_00_Overview.md](Phase5_00_Overview.md)
