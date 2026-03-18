// src/containers/Auth/Login.jsx
// Trang đăng nhập — SRS REQ-AU-001, 007, 009
import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { loginUser, clearLoginError } from '../../redux/slices/userSlice';
import { USER_ROLE } from '../../utils/constants';
import './Login.scss';

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Redux state
  const { isLoggedIn, userInfo, loginError } = useSelector((state) => state.user);

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect nếu đã login — SRS REQ-AU-005
  useEffect(() => {
    if (isLoggedIn && userInfo) {
      switch (userInfo.roleId) {
        case USER_ROLE.ADMIN:
          navigate('/system/user-manage', { replace: true });
          break;
        case USER_ROLE.DOCTOR:
          navigate('/doctor-dashboard/manage-patient', { replace: true });
          break;
        default:
          navigate('/', { replace: true });
          break;
      }
    }
  }, [isLoggedIn, userInfo, navigate]);

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
            <i className="fas fa-user-circle" /> Đăng nhập
          </h2>

          {/* Email */}
          <div className="form-group">
            <label>
              <i className="fas fa-envelope" /> Email
            </label>
            <input
              type="email"
              className="form-input"
              placeholder="Nhập email của bạn"
              value={email}
              onChange={handleInputChange(setEmail)}
              autoFocus
            />
          </div>

          {/* Password */}
          <div className="form-group">
            <label>
              <i className="fas fa-lock" /> Mật khẩu
            </label>
            <div className="password-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="Nhập mật khẩu"
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
            type="submit"
            className="login-btn"
            disabled={!email || !password || isSubmitting}
          >
            {isSubmitting ? (
              <><i className="fas fa-spinner fa-spin" /> Đang đăng nhập...</>
            ) : (
              'Đăng nhập'
            )}
          </button>

          {/* Forgot password */}
          <div className="forgot-password">
            <a href="#!">Quên mật khẩu?</a>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
