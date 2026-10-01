// src/containers/Auth/Login.jsx
// Trang đăng nhập — SRS REQ-AU-001, 007, 009
// [Phase 9.3] Thêm link Đăng ký + Quên MK + Open Redirect Protection
// [Fix Multi-Tab] Cho phép đăng nhập tài khoản khác khi đã có phiên đăng nhập từ tab khác
import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { FormattedMessage, useIntl } from 'react-intl';
import { loginUser, clearLoginError, processLogout } from '../../redux/slices/userSlice';
import { USER_ROLE, path } from '../../utils/constants';
import chatSocketService from '../../services/chatSocketService';
import './Login.scss';

// ═══════════════════════════════════════════════════════════════════════
// [Phase 9.3 SECURITY] Open Redirect Prevention
// Chỉ chấp nhận redirect URL bắt đầu bằng "/" và KHÔNG chứa "://"
// Chặn: https://evil.com, //evil.com, javascript:alert()
// ═══════════════════════════════════════════════════════════════════════
const validateRedirectUrl = (url) => {
  if (!url || typeof url !== 'string') return null;
  // Chỉ chấp nhận relative path bắt đầu bằng /
  if (!url.startsWith('/')) return null;
  // Chặn protocol injection (://), double-slash (//) ở đầu
  if (url.includes('://') || url.startsWith('//')) return null;
  return url;
};

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const intl = useIntl();

  // Redux state
  const { isLoggedIn, userInfo, loginError } = useSelector((state) => state.user);

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // [Fix Multi-Tab] Track whether user wants to switch accounts
  // When true, we show the login form even if already logged in
  const [wantsSwitchAccount, setWantsSwitchAccount] = useState(false);
  // Track if the current login was initiated by THIS form submission (not rehydrated)
  const justLoggedInRef = useRef(false);

  // [Fix Multi-Tab] Auto-detect switchAccount query param
  // URL: /login?switchAccount=true → auto-logout and show login form
  useEffect(() => {
    if (searchParams.get('switchAccount') === 'true') {
      chatSocketService.disconnect();
      dispatch(processLogout());
      setWantsSwitchAccount(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Redirect nếu đã login — SRS REQ-AU-005
  // [Fix Multi-Tab] Chỉ redirect khi user THỰC SỰ login từ form này (justLoggedInRef),
  // KHÔNG redirect nếu state được rehydrate từ tab khác
  useEffect(() => {
    if (isLoggedIn && userInfo && justLoggedInRef.current) {
      justLoggedInRef.current = false; // Reset flag

      const redirectTo = validateRedirectUrl(searchParams.get('redirect'));

      if (redirectTo) {
        navigate(redirectTo, { replace: true });
        return;
      }

      // Default redirect theo role
      switch (userInfo.roleId) {
        case USER_ROLE.ADMIN:
          navigate('/system/dashboard', { replace: true });
          break;
        case USER_ROLE.DOCTOR:
          navigate('/doctor-dashboard/manage-patient', { replace: true });
          break;
        case USER_ROLE.PATIENT:
          navigate('/', { replace: true });
          break;
        default:
          navigate('/', { replace: true });
          break;
      }
    }
  }, [isLoggedIn, userInfo, navigate, searchParams]);

  // Submit login
  const handleLogin = async (e) => {
    e.preventDefault();

    if (!email || !password) return;

    setIsSubmitting(true);
    try {
      // [Fix Multi-Tab] Nếu đang có phiên đăng nhập cũ → logout trước
      if (isLoggedIn) {
        chatSocketService.disconnect();
        dispatch(processLogout());
        // Chờ 1 tick để Redux state cập nhật
        await new Promise((r) => setTimeout(r, 50));
      }

      justLoggedInRef.current = true; // Mark that THIS form initiated the login
      await dispatch(loginUser({ email, password })).unwrap();
      setWantsSwitchAccount(false);
      // Redirect sẽ được xử lý bởi useEffect ở trên
    } catch {
      justLoggedInRef.current = false;
      // Lỗi đã được lưu vào loginError qua Redux rejected
    } finally {
      setIsSubmitting(false);
    }
  };

  // [Fix Multi-Tab] Handler to switch accounts
  const handleSwitchAccount = () => {
    chatSocketService.disconnect();
    dispatch(processLogout());
    setWantsSwitchAccount(true);
  };

  // Xóa lỗi khi user gõ lại
  const handleInputChange = (setter) => (e) => {
    setter(e.target.value);
    if (loginError) {
      dispatch(clearLoginError());
    }
  };

  // [Fix Multi-Tab] Nếu đã đăng nhập VÀ user chưa chọn switch → hiển thị "Already logged in" UI
  // Điều này xảy ra khi user mở /login ở tab mới trong khi tab cũ đã đăng nhập
  if (isLoggedIn && userInfo && !wantsSwitchAccount) {
    const getRoleDashboard = () => {
      switch (userInfo.roleId) {
        case USER_ROLE.ADMIN: return '/system/dashboard';
        case USER_ROLE.DOCTOR: return '/doctor-dashboard/manage-patient';
        default: return '/';
      }
    };
    const getRoleName = () => {
      switch (userInfo.roleId) {
        case USER_ROLE.ADMIN: return 'Admin';
        case USER_ROLE.DOCTOR: return 'Bác sĩ';
        default: return 'Bệnh nhân';
      }
    };

    return (
      <div className="login-background">
        <div className="login-container">
          <div className="login-form" style={{ textAlign: 'center' }}>
            <h2 className="login-title">
              <i className="fas fa-user-check" /> Đã đăng nhập
            </h2>
            <div style={{ margin: '20px 0', color: '#555', lineHeight: 1.6 }}>
              <p>Bạn đang đăng nhập với tài khoản:</p>
              <p style={{ fontWeight: 700, fontSize: '1.1rem', color: '#45c3d2' }}>
                {userInfo.email || `${userInfo.firstName || ''} ${userInfo.lastName || ''}`.trim()}
              </p>
              <p style={{ fontSize: '0.9rem', color: '#888' }}>
                ({getRoleName()})
              </p>
            </div>
            <button
              className="login-btn"
              onClick={() => navigate(getRoleDashboard(), { replace: true })}
              style={{ marginBottom: '12px' }}
            >
              <i className="fas fa-arrow-right" /> Tiếp tục vào hệ thống
            </button>
            <button
              className="login-btn"
              onClick={handleSwitchAccount}
              style={{
                background: 'transparent',
                color: '#45c3d2',
                border: '2px solid #45c3d2',
              }}
            >
              <i className="fas fa-exchange-alt" /> Đăng nhập tài khoản khác
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-background">
      <div className="login-container">
        <form className="login-form" onSubmit={handleLogin}>
          {/* Title */}
          <h2 className="login-title">
            <i className="fas fa-user-circle" /> <FormattedMessage id="login.title" />
          </h2>

          {/* Email */}
          <div className="form-group">
            <label>
              <i className="fas fa-envelope" /> <FormattedMessage id="login.email" />
            </label>
            <input
              id="login-email"
              type="email"
              className="form-input"
              placeholder={intl.formatMessage({ id: 'auth.login.email-placeholder' })}
              value={email}
              onChange={handleInputChange(setEmail)}
              autoFocus
            />
          </div>

          {/* Password */}
          <div className="form-group">
            <label>
              <i className="fas fa-lock" /> <FormattedMessage id="login.password" />
            </label>
            <div className="password-wrapper">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder={intl.formatMessage({ id: 'auth.login.password-placeholder' })}
                value={password}
                onChange={handleInputChange(setPassword)}
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} />
              </button>
            </div>
          </div>

          {/* Error message — REQ-AU-007 */}
          {loginError && (
            <div className="error-message shake">
              <i className="fas fa-exclamation-circle" /> {loginError}
            </div>
          )}

          {/* Login button */}
          <button
            id="login-submit-btn"
            type="submit"
            className="login-btn"
            disabled={!email || !password || isSubmitting}
          >
            {isSubmitting ? (
              <><i className="fas fa-spinner fa-spin" /> <FormattedMessage id="login.logging-in" /></>
            ) : (
              <FormattedMessage id="login.login-btn" />
            )}
          </button>

          {/* [Phase 9.3] Links: Quên MK + Đăng ký */}
          <div className="auth-links">
            <Link to={path.FORGOT_PASSWORD} className="auth-link">
              <FormattedMessage id="login.forgot-password" />
            </Link>
            <Link to={path.REGISTER} className="auth-link auth-link--register">
              <FormattedMessage id="login.register-link" />
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
