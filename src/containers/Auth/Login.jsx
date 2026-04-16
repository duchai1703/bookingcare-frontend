// src/containers/Auth/Login.jsx
// Trang đăng nhập — SRS REQ-AU-001, 007, 009
// [Phase 9.3] Thêm link Đăng ký + Quên MK + Open Redirect Protection
import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { FormattedMessage, useIntl } from 'react-intl';
import { loginUser, clearLoginError } from '../../redux/slices/userSlice';
import { USER_ROLE, path } from '../../utils/constants';
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

  // Redirect nếu đã login — SRS REQ-AU-005
  // [Phase 9.5] Luồng: DoctorSchedule redirect → /login?redirect=/doctor/123
  // Sau khi login thành công → useEffect chạy → lấy ?redirect → validate → navigate CHÍNH XÁC về trang cũ
  useEffect(() => {
    if (isLoggedIn && userInfo) {
      // [Phase 9.5] Lấy redirect URL từ query params (khi bị chặn từ DoctorSchedule hoặc PrivateRoute)
      // validateRedirectUrl() đảm bảo Open Redirect Prevention — chỉ chấp nhận relative path
      const redirectTo = validateRedirectUrl(searchParams.get('redirect'));

      if (redirectTo) {
        // Redirect CHÍNH XÁC về trang Chi tiết Bác sĩ (hoặc bất kỳ trang nội bộ nào)
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
      await dispatch(loginUser({ email, password })).unwrap();
      // Redirect sẽ được xử lý bởi useEffect ở trên
    } catch {
      // Lỗi đã được lưu vào loginError qua Redux rejected
    } finally {
      setIsSubmitting(false);
    }
  };

  // Xóa lỗi khi user gõ lại
  const handleInputChange = (setter) => (e) => {
    setter(e.target.value);
    if (loginError) {
      dispatch(clearLoginError());
    }
  };

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
