// src/containers/Auth/ResetPassword.jsx
// Trang đặt mật khẩu mới (từ link email) — Phase 9.3
// Lấy ?token= từ URL Query Params
import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { FormattedMessage, useIntl } from 'react-intl';
import { toast } from 'react-toastify';
import { resetPassword } from '../../services/userService';
import { path } from '../../utils/constants';
import './Login.scss';

const ResetPassword = () => {
  const navigate = useNavigate();
  const intl = useIntl();
  const [searchParams] = useSearchParams();

  // Lấy token từ URL: /reset-password?token=abc123
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Guard: nếu không có token trong URL → báo lỗi
  if (!token) {
    return (
      <div className="login-background">
        <div className="login-container">
          <div className="login-form">
            <h2 className="login-title">
              <i className="fas fa-exclamation-triangle" style={{ color: '#e74c3c' }} />
            </h2>
            <div className="error-message">
              <i className="fas fa-exclamation-circle" />{' '}
              <FormattedMessage id="reset-password.invalid-token" />
            </div>
            <div className="auth-links">
              <Link to={path.LOGIN} className="auth-link">
                <i className="fas fa-arrow-left" /> <FormattedMessage id="forgot-password.login-link" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate min-length
    if (newPassword.length < 6) {
      setErrorMsg(intl.formatMessage({ id: 'reset-password.password-min-length' }));
      return;
    }

    // Validate khớp
    if (newPassword !== confirmPassword) {
      setErrorMsg(intl.formatMessage({ id: 'reset-password.password-mismatch' }));
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const result = await resetPassword({ token, newPassword });

      if (result.errCode === 0) {
        toast.success(intl.formatMessage({ id: 'reset-password.success' }));
        navigate(path.LOGIN, { replace: true });
      } else {
        setErrorMsg(result.message || intl.formatMessage({ id: 'auth.common.system-error' }));
      }
    } catch (err) {
      const apiMsg = err.response?.data?.message;
      setErrorMsg(apiMsg || intl.formatMessage({ id: 'auth.common.system-error' }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-background">
      <div className="login-container">
        <form className="login-form" onSubmit={handleSubmit}>
          <h2 className="login-title">
            <i className="fas fa-shield-alt" /> <FormattedMessage id="reset-password.title" />
          </h2>

          {/* New Password */}
          <div className="form-group">
            <label>
              <i className="fas fa-lock" /> <FormattedMessage id="reset-password.new-password" />
            </label>
            <input
              id="reset-new-password"
              type="password"
              className="form-input"
              placeholder={intl.formatMessage({ id: 'reset-password.new-password-placeholder' })}
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); setErrorMsg(''); }}
              autoFocus
            />
          </div>

          {/* Confirm Password */}
          <div className="form-group">
            <label>
              <i className="fas fa-lock" /> <FormattedMessage id="reset-password.confirm-password" />
            </label>
            <input
              id="reset-confirm-password"
              type="password"
              className="form-input"
              placeholder={intl.formatMessage({ id: 'reset-password.confirm-password-placeholder' })}
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setErrorMsg(''); }}
            />
          </div>

          {/* Error */}
          {errorMsg && (
            <div className="error-message shake">
              <i className="fas fa-exclamation-circle" /> {errorMsg}
            </div>
          )}

          {/* Submit */}
          <button
            id="reset-submit-btn"
            type="submit"
            className="login-btn"
            disabled={!newPassword || !confirmPassword || isSubmitting}
          >
            {isSubmitting ? (
              <><i className="fas fa-spinner fa-spin" /> <FormattedMessage id="reset-password.submitting" /></>
            ) : (
              <FormattedMessage id="reset-password.submit-btn" />
            )}
          </button>

          {/* Link quay lại đăng nhập */}
          <div className="auth-links">
            <Link to={path.LOGIN} className="auth-link">
              <i className="fas fa-arrow-left" /> <FormattedMessage id="forgot-password.login-link" />
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
