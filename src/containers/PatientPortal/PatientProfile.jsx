// src/containers/PatientPortal/PatientProfile.jsx
// [Phase 9.4] Trang Thông tin cá nhân + Đổi mật khẩu
// Luồng avatar: input[file] → FileReader → Base64 → state → API
// Luồng đổi MK: submit → API → logout (token revoked)
import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { FormattedMessage, useIntl } from 'react-intl';
import { toast } from 'react-toastify';

import { processLogout, updateUserInfo } from '../../redux/slices/userSlice';
import { fetchAllcodeByType } from '../../redux/slices/appSlice';
import { getPatientProfile, editPatientProfile, changePassword } from '../../services/patientService';
import { ALLCODE_TYPES } from '../../utils/constants';
import './PatientProfile.scss';

const MAX_FILE_SIZE = 5000000; // 5MB

const PatientProfile = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const intl = useIntl();
  const fileInputRef = useRef(null);

  const language = useSelector((state) => state.app.language);
  const genders = useSelector((state) => state.app.genders);

  // ═══════ Thông tin cá nhân ═══════
  const [profile, setProfile] = useState({
    firstName: '', lastName: '', phoneNumber: '',
    address: '', gender: '', image: '',
    email: '',
  });
  const [previewAvatar, setPreviewAvatar] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // ═══════ Đổi mật khẩu ═══════
  const [pwdForm, setPwdForm] = useState({
    currentPassword: '', newPassword: '', confirmPassword: '',
  });
  const [isChangingPwd, setIsChangingPwd] = useState(false);

  // Fetch gender allcode + profile on mount
  useEffect(() => {
    if (!genders || genders.length === 0) {
      dispatch(fetchAllcodeByType(ALLCODE_TYPES.GENDER));
    }
    loadProfile();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadProfile = async () => {
    try {
      const result = await getPatientProfile();
      if (result.errCode === 0 && result.data) {
        const d = result.data;
        setProfile({
          firstName: d.firstName || '',
          lastName: d.lastName || '',
          phoneNumber: d.phoneNumber || '',
          address: d.address || '',
          gender: d.gender || '',
          image: d.image || '',
          email: d.email || '',
        });
        // Hiển thị avatar preview nếu có image
        if (d.image) {
          const src = typeof d.image === 'string' && d.image.startsWith('data:')
            ? d.image
            : `data:image/jpeg;base64,${d.image}`;
          setPreviewAvatar(src);
        }
      }
    } catch (err) {
    }
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  // ═══════════════════════════════════════════════════════════
  // Avatar Upload: FileReader → Base64
  // GUARD: file.size < 5MB (5,000,000 bytes)
  // Nếu vượt mức → toast lỗi + return ngay, KHÔNG write vào state
  // ═══════════════════════════════════════════════════════════
  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // GUARD: Kiểm tra kích thước file
    if (file.size > MAX_FILE_SIZE) {
      toast.error(intl.formatMessage({ id: 'patient-portal.profile.avatar-too-large' }));
      // Reset input để user có thể chọn lại
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Convert file sang Base64 bằng FileReader
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result; // "data:image/png;base64,iVBOR..."
      setPreviewAvatar(base64);
      // Lưu phần data thuần (bỏ prefix "data:image/...;base64,") để gửi API
      const pureBase64 = base64.split(',')[1] || base64;
      setProfile((prev) => ({ ...prev, image: pureBase64 }));
    };
    reader.readAsDataURL(file);
  };

  // ═══════════════════════════════════════════════════════════
  // Lưu thông tin cá nhân
  // CỰC KỲ QUAN TRỌNG: Sau khi API thành công → dispatch(updateUserInfo)
  // để đồng bộ Avatar/Tên lên Header NGAY LẬP TỨC
  // ═══════════════════════════════════════════════════════════
  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const dataToSend = {
        firstName: profile.firstName,
        lastName: profile.lastName,
        phoneNumber: profile.phoneNumber,
        address: profile.address,
        gender: profile.gender,
        image: profile.image,
      };

      const result = await editPatientProfile(dataToSend);

      if (result.errCode === 0) {
        toast.success(intl.formatMessage({ id: 'patient-portal.profile.save-success' }));

        // ✅ BẮT BUỘC: Đồng bộ Redux userInfo → Header cập nhật ngay
        dispatch(updateUserInfo({
          firstName: profile.firstName,
          lastName: profile.lastName,
          image: profile.image,
        }));
      } else {
        toast.error(result.message || intl.formatMessage({ id: 'patient-portal.profile.save-error' }));
      }
    } catch (err) {
      toast.error(intl.formatMessage({ id: 'auth.common.system-error' }));
    } finally {
      setIsSaving(false);
    }
  };

  // ═══════════════════════════════════════════════════════════
  // Đổi mật khẩu
  // Submit → API changePassword → Thành công → LOGOUT BẮT BUỘC
  // (vì backend đã revoke tokenVersion cũ → session hiện tại không còn valid)
  // ═══════════════════════════════════════════════════════════
  const handleChangePassword = async (e) => {
    e.preventDefault();
    const { currentPassword, newPassword, confirmPassword } = pwdForm;

    // Validate fields
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error(intl.formatMessage({ id: 'patient-portal.change-password.missing-fields' }));
      return;
    }
    if (newPassword.length < 6) {
      toast.error(intl.formatMessage({ id: 'patient-portal.change-password.min-length' }));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(intl.formatMessage({ id: 'patient-portal.change-password.mismatch' }));
      return;
    }

    setIsChangingPwd(true);
    try {
      const result = await changePassword({ currentPassword, newPassword });

      if (result.errCode === 0) {
        toast.success(intl.formatMessage({ id: 'patient-portal.change-password.success' }));

        // ✅ BẮT BUỘC: Logout vì token cũ đã bị revoke (tokenVersion++)
        setTimeout(() => {
          dispatch(processLogout());
          navigate('/login', { replace: true });
        }, 1500);
      } else {
        toast.error(result.message || intl.formatMessage({ id: 'auth.common.system-error' }));
      }
    } catch (err) {
      const apiMsg = err.response?.data?.message;
      toast.error(apiMsg || intl.formatMessage({ id: 'auth.common.system-error' }));
    } finally {
      setIsChangingPwd(false);
    }
  };

  return (
    <div className="patient-profile">
      {/* ═══════ KHỐI 1: Thông tin cá nhân ═══════ */}
      <div className="profile-section">
        <h2 className="section-title">
          <i className="fas fa-user-edit" /> <FormattedMessage id="patient-portal.profile.title" />
        </h2>

        <div className="profile-content">
          {/* Avatar */}
          <div className="avatar-section">
            <div className="avatar-preview">
              {previewAvatar ? (
                <img src={previewAvatar} alt="Avatar" />
              ) : (
                <i className="fas fa-user-circle avatar-placeholder" />
              )}
            </div>
            <input
              ref={fileInputRef}
              id="avatar-upload"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatarChange}
              style={{ display: 'none' }}
            />
            <button
              className="avatar-btn"
              onClick={() => fileInputRef.current?.click()}
            >
              <i className="fas fa-camera" /> <FormattedMessage id="patient-portal.profile.change-avatar" />
            </button>
          </div>

          {/* Form fields */}
          <div className="profile-form">
            <div className="form-row">
              <div className="form-group">
                <label><FormattedMessage id="patient-portal.profile.last-name" /></label>
                <input
                  type="text"
                  name="lastName"
                  className="form-input"
                  placeholder={intl.formatMessage({ id: 'patient-portal.profile.last-name-placeholder' })}
                  value={profile.lastName}
                  onChange={handleProfileChange}
                />
              </div>
              <div className="form-group">
                <label><FormattedMessage id="patient-portal.profile.first-name" /></label>
                <input
                  type="text"
                  name="firstName"
                  className="form-input"
                  placeholder={intl.formatMessage({ id: 'patient-portal.profile.first-name-placeholder' })}
                  value={profile.firstName}
                  onChange={handleProfileChange}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label><FormattedMessage id="patient-portal.profile.email" /></label>
                <input
                  type="email"
                  className="form-input form-input--disabled"
                  value={profile.email}
                  disabled
                />
              </div>
              <div className="form-group">
                <label><FormattedMessage id="patient-portal.profile.phone" /></label>
                <input
                  type="tel"
                  name="phoneNumber"
                  className="form-input"
                  placeholder={intl.formatMessage({ id: 'patient-portal.profile.phone-placeholder' })}
                  value={profile.phoneNumber}
                  onChange={handleProfileChange}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label><FormattedMessage id="patient-portal.profile.address" /></label>
                <input
                  type="text"
                  name="address"
                  className="form-input"
                  placeholder={intl.formatMessage({ id: 'patient-portal.profile.address-placeholder' })}
                  value={profile.address}
                  onChange={handleProfileChange}
                />
              </div>
              <div className="form-group">
                <label><FormattedMessage id="patient-portal.profile.gender" /></label>
                <select
                  name="gender"
                  className="form-input"
                  value={profile.gender}
                  onChange={handleProfileChange}
                >
                  <option value="">
                    {intl.formatMessage({ id: 'patient-portal.profile.select-gender' })}
                  </option>
                  {genders && genders.map((g) => (
                    <option key={g.keyMap} value={g.keyMap}>
                      {language === 'vi' ? g.valueVi : g.valueEn}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              id="save-profile-btn"
              className="btn-primary"
              onClick={handleSaveProfile}
              disabled={isSaving}
            >
              {isSaving ? (
                <><i className="fas fa-spinner fa-spin" /> <FormattedMessage id="patient-portal.profile.saving" /></>
              ) : (
                <><i className="fas fa-save" /> <FormattedMessage id="patient-portal.profile.save-btn" /></>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ═══════ KHỐI 2: Đổi mật khẩu ═══════ */}
      <div className="profile-section">
        <h2 className="section-title">
          <i className="fas fa-key" /> <FormattedMessage id="patient-portal.change-password.title" />
        </h2>

        <form className="password-form" onSubmit={handleChangePassword}>
          <div className="form-group">
            <label><FormattedMessage id="patient-portal.change-password.current" /></label>
            <input
              type="password"
              className="form-input"
              placeholder={intl.formatMessage({ id: 'patient-portal.change-password.current-placeholder' })}
              value={pwdForm.currentPassword}
              onChange={(e) => setPwdForm((p) => ({ ...p, currentPassword: e.target.value }))}
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label><FormattedMessage id="patient-portal.change-password.new" /></label>
              <input
                type="password"
                className="form-input"
                placeholder={intl.formatMessage({ id: 'patient-portal.change-password.new-placeholder' })}
                value={pwdForm.newPassword}
                onChange={(e) => setPwdForm((p) => ({ ...p, newPassword: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label><FormattedMessage id="patient-portal.change-password.confirm" /></label>
              <input
                type="password"
                className="form-input"
                placeholder={intl.formatMessage({ id: 'patient-portal.change-password.confirm-placeholder' })}
                value={pwdForm.confirmPassword}
                onChange={(e) => setPwdForm((p) => ({ ...p, confirmPassword: e.target.value }))}
              />
            </div>
          </div>

          <button
            id="change-password-btn"
            type="submit"
            className="btn-warning"
            disabled={isChangingPwd}
          >
            {isChangingPwd ? (
              <><i className="fas fa-spinner fa-spin" /> <FormattedMessage id="patient-portal.change-password.submitting" /></>
            ) : (
              <><i className="fas fa-lock" /> <FormattedMessage id="patient-portal.change-password.submit-btn" /></>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PatientProfile;
