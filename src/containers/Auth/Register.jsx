// src/containers/Auth/Register.jsx
// Trang đăng ký bệnh nhân (R3) — Phase 9.3
// Xử lý errCode 10 (Guest cũ) → Toast vàng + gợi ý Quên MK
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FormattedMessage, useIntl } from 'react-intl';
import { toast } from 'react-toastify';
import { registerPatient } from '../../services/userService';
import { path } from '../../utils/constants';
import './Login.scss';

const Register = () => {
  const navigate = useNavigate();
  const intl = useIntl();

  const [formData, setFormData] = useState({
    lastName: '',
    firstName: '',
    phoneNumber: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errorMsg) setErrorMsg('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { lastName, firstName, phoneNumber, email, password, confirmPassword } = formData;

    // Validate tất cả field
    if (!lastName || !firstName || !phoneNumber || !email || !password || !confirmPassword) {
      setErrorMsg(intl.formatMessage({ id: 'register.missing-fields' }));
      return;
    }

    // Validate min-length mật khẩu
    if (password.length < 6) {
      setErrorMsg(intl.formatMessage({ id: 'register.password-min-length' }));
      return;
    }

    // Validate khớp mật khẩu
    if (password !== confirmPassword) {
      setErrorMsg(intl.formatMessage({ id: 'register.password-mismatch' }));
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await registerPatient({ email, password, firstName, lastName, phoneNumber });

      if (result.errCode === 0) {
        toast.success(intl.formatMessage({ id: 'register.success' }));
        navigate(path.LOGIN, { replace: true });
      } else if (result.errCode === 10) {
        toast.warn(intl.formatMessage({ id: 'auth.register.guest-warning' }), {
          autoClose: 8000,
        });
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
            <i className="fas fa-user-plus" /> <FormattedMessage id="register.title" />
          </h2>

          {/* Họ + Tên (2 cột) */}
          <div className="form-row">
            <div className="form-group form-group--half">
              <label>
                <i className="fas fa-user" /> <FormattedMessage id="register.last-name" />
              </label>
              <input
                id="register-last-name"
                type="text"
                name="lastName"
                className="form-input"
                placeholder={intl.formatMessage({ id: 'register.last-name-placeholder' })}
                value={formData.lastName}
                onChange={handleChange}
                autoFocus
              />
            </div>
            <div className="form-group form-group--half">
              <label>
                <i className="fas fa-user" /> <FormattedMessage id="register.first-name" />
              </label>
              <input
                id="register-first-name"
                type="text"
                name="firstName"
                className="form-input"
                placeholder={intl.formatMessage({ id: 'register.first-name-placeholder' })}
                value={formData.firstName}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* SĐT */}
          <div className="form-group">
            <label>
              <i className="fas fa-phone" /> <FormattedMessage id="register.phone" />
            </label>
            <input
              id="register-phone"
              type="tel"
              name="phoneNumber"
              className="form-input"
              placeholder={intl.formatMessage({ id: 'register.phone-placeholder' })}
              value={formData.phoneNumber}
              onChange={handleChange}
            />
          </div>

          {/* Email */}
          <div className="form-group">
            <label>
              <i className="fas fa-envelope" /> <FormattedMessage id="register.email" />
            </label>
            <input
              id="register-email"
              type="email"
              name="email"
              className="form-input"
              placeholder={intl.formatMessage({ id: 'register.email-placeholder' })}
              value={formData.email}
              onChange={handleChange}
            />
          </div>

          {/* Password */}
          <div className="form-group">
            <label>
              <i className="fas fa-lock" /> <FormattedMessage id="register.password" />
            </label>
            <input
              id="register-password"
              type="password"
              name="password"
              className="form-input"
              placeholder={intl.formatMessage({ id: 'register.password-placeholder' })}
              value={formData.password}
              onChange={handleChange}
            />
          </div>

          {/* Confirm Password */}
          <div className="form-group">
            <label>
              <i className="fas fa-lock" /> <FormattedMessage id="register.confirm-password" />
            </label>
            <input
              id="register-confirm-password"
              type="password"
              name="confirmPassword"
              className="form-input"
              placeholder={intl.formatMessage({ id: 'register.confirm-password-placeholder' })}
              value={formData.confirmPassword}
              onChange={handleChange}
            />
          </div>

          {/* Error */}
          {errorMsg && (
            <div className="error-message shake">
              <i className="fas fa-exclamation-circle" /> {errorMsg}
            </div>
          )}

          {/* Submit button */}
          <button
            id="register-submit-btn"
            type="submit"
            className="login-btn"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <><i className="fas fa-spinner fa-spin" /> <FormattedMessage id="register.submitting" /></>
            ) : (
              <FormattedMessage id="register.submit-btn" />
            )}
          </button>

          {/* Link đăng nhập */}
          <div className="auth-links">
            <Link to={path.LOGIN} className="auth-link auth-link--register">
              <FormattedMessage id="register.login-link" />
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
