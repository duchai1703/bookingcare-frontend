// src/containers/Auth/ForgotPassword.jsx
// Trang quên mật khẩu — Phase 9.3
// Gửi email link reset, truyền language từ Redux
import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { FormattedMessage, useIntl } from 'react-intl';
import { toast } from 'react-toastify';
import { forgotPassword } from '../../services/userService';
import { path } from '../../utils/constants';
import './Login.scss';

const ForgotPassword = () => {
  const intl = useIntl();
  const language = useSelector((state) => state.app.language);

  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;

    setIsSubmitting(true);
    try {
      // Gửi kèm language để backend gửi email đúng ngôn ngữ
      await forgotPassword({ email, language });

      // [SECURITY] Anti-Email Enumeration: Luôn hiện message thành công
      // dù email có tồn tại hay không
      toast.success(intl.formatMessage({ id: 'forgot-password.success' }), {
        autoClose: 5000,
      });
      setEmail(''); // Clear form sau khi gửi
    } catch {
      // Backend trả generic message → vẫn hiện success (anti-enumeration)
      toast.success(intl.formatMessage({ id: 'forgot-password.success' }), {
        autoClose: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-background">
      <div className="login-container">
        <form className="login-form" onSubmit={handleSubmit}>
          <h2 className="login-title">
            <i className="fas fa-key" /> <FormattedMessage id="forgot-password.title" />
          </h2>

          <p className="form-description">
            <FormattedMessage id="forgot-password.description" />
          </p>

          {/* Email */}
          <div className="form-group">
            <label>
              <i className="fas fa-envelope" /> <FormattedMessage id="forgot-password.email" />
            </label>
            <input
              id="forgot-email"
              type="email"
              className="form-input"
              placeholder={intl.formatMessage({ id: 'forgot-password.email-placeholder' })}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
          </div>

          {/* Submit */}
          <button
            id="forgot-submit-btn"
            type="submit"
            className="login-btn"
            disabled={!email || isSubmitting}
          >
            {isSubmitting ? (
              <><i className="fas fa-spinner fa-spin" /> <FormattedMessage id="forgot-password.submitting" /></>
            ) : (
              <FormattedMessage id="forgot-password.submit-btn" />
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

export default ForgotPassword;
