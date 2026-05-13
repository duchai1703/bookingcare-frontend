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
import { persistor } from '../../redux/store'; // ✅ [Fix 3.2] Import persistor
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
      // [Phase 10.5 Hotfix] BE expects 'oldPassword', not 'currentPassword'
      const result = await changePassword({ oldPassword: currentPassword, newPassword });

      if (result.errCode === 0) {
        toast.success(intl.formatMessage({ id: 'patient-portal.change-password.success' }));

        // ✅ [Fix 3.2] BẮT BUỘC: Logout + flush persistor vì token cũ đã bị revoke
        setTimeout(async () => {
          dispatch(processLogout());
          await persistor.flush(); // ✅ [Fix 3.2] Xóa sạch storage
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
    <div className="patient-profile tw-space-y-6">
      {/* ═══════ KHỐI 1: Thông tin cá nhân ═══════ */}
      <div className="tw-bg-white tw-rounded-card tw-shadow-card tw-p-6">
        <h2 className="tw-text-xl tw-font-bold tw-text-text-main tw-mb-5 tw-flex tw-items-center tw-gap-2">
          <i className="fas fa-user-edit tw-text-primary" /> <FormattedMessage id="patient-portal.profile.title" />
        </h2>

        <div className="tw-flex tw-flex-col md:tw-flex-row tw-gap-6">
          {/* Avatar */}
          <div className="tw-flex tw-flex-col tw-items-center tw-gap-3 tw-flex-shrink-0">
            <div className="tw-w-28 tw-h-28 tw-rounded-full tw-overflow-hidden tw-bg-bg-light tw-flex tw-items-center tw-justify-center tw-border-4 tw-border-primary-light tw-shadow-md">
              {previewAvatar ? (
                <img src={previewAvatar} alt="Avatar" className="tw-w-full tw-h-full tw-object-cover" />
              ) : (
                <i className="fas fa-user-circle tw-text-6xl tw-text-text-light" />
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
              className="tw-px-4 tw-py-1.5 tw-bg-primary-light tw-text-primary tw-rounded-lg tw-text-xs tw-font-medium tw-border-0 tw-cursor-pointer hover:tw-bg-primary hover:tw-text-white tw-transition-colors tw-flex tw-items-center tw-gap-1.5"
              onClick={() => fileInputRef.current?.click()}
            >
              <i className="fas fa-camera" /> <FormattedMessage id="patient-portal.profile.change-avatar" />
            </button>
          </div>

          {/* Form fields */}
          <div className="tw-flex-1 tw-space-y-4">
            <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 tw-gap-4">
              <div>
                <label className="tw-block tw-text-sm tw-font-medium tw-text-text-main tw-mb-1"><FormattedMessage id="patient-portal.profile.last-name" /></label>
                <input
                  type="text"
                  name="lastName"
                  className="tw-w-full tw-px-3 tw-py-2 tw-border tw-border-gray-300 tw-rounded-lg tw-text-sm focus:tw-outline-none focus:tw-border-primary"
                  placeholder={intl.formatMessage({ id: 'patient-portal.profile.last-name-placeholder' })}
                  value={profile.lastName}
                  onChange={handleProfileChange}
                />
              </div>
              <div>
                <label className="tw-block tw-text-sm tw-font-medium tw-text-text-main tw-mb-1"><FormattedMessage id="patient-portal.profile.first-name" /></label>
                <input
                  type="text"
                  name="firstName"
                  className="tw-w-full tw-px-3 tw-py-2 tw-border tw-border-gray-300 tw-rounded-lg tw-text-sm focus:tw-outline-none focus:tw-border-primary"
                  placeholder={intl.formatMessage({ id: 'patient-portal.profile.first-name-placeholder' })}
                  value={profile.firstName}
                  onChange={handleProfileChange}
                />
              </div>
            </div>

            <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 tw-gap-4">
              <div>
                <label className="tw-block tw-text-sm tw-font-medium tw-text-text-main tw-mb-1"><FormattedMessage id="patient-portal.profile.email" /></label>
                <input
                  type="email"
                  className="tw-w-full tw-px-3 tw-py-2 tw-border tw-border-gray-300 tw-rounded-lg tw-text-sm tw-bg-gray-50 tw-text-text-sub tw-cursor-not-allowed"
                  value={profile.email}
                  disabled
                />
              </div>
              <div>
                <label className="tw-block tw-text-sm tw-font-medium tw-text-text-main tw-mb-1"><FormattedMessage id="patient-portal.profile.phone" /></label>
                <input
                  type="tel"
                  name="phoneNumber"
                  className="tw-w-full tw-px-3 tw-py-2 tw-border tw-border-gray-300 tw-rounded-lg tw-text-sm focus:tw-outline-none focus:tw-border-primary"
                  placeholder={intl.formatMessage({ id: 'patient-portal.profile.phone-placeholder' })}
                  value={profile.phoneNumber}
                  onChange={handleProfileChange}
                />
              </div>
            </div>

            <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 tw-gap-4">
              <div>
                <label className="tw-block tw-text-sm tw-font-medium tw-text-text-main tw-mb-1"><FormattedMessage id="patient-portal.profile.address" /></label>
                <input
                  type="text"
                  name="address"
                  className="tw-w-full tw-px-3 tw-py-2 tw-border tw-border-gray-300 tw-rounded-lg tw-text-sm focus:tw-outline-none focus:tw-border-primary"
                  placeholder={intl.formatMessage({ id: 'patient-portal.profile.address-placeholder' })}
                  value={profile.address}
                  onChange={handleProfileChange}
                />
              </div>
              <div>
                <label className="tw-block tw-text-sm tw-font-medium tw-text-text-main tw-mb-1"><FormattedMessage id="patient-portal.profile.gender" /></label>
                <select
                  name="gender"
                  className="tw-w-full tw-px-3 tw-py-2 tw-border tw-border-gray-300 tw-rounded-lg tw-text-sm tw-bg-white focus:tw-outline-none focus:tw-border-primary"
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
              className="tw-px-6 tw-py-2.5 tw-bg-primary tw-text-white tw-rounded-lg tw-font-semibold tw-text-sm tw-border-0 tw-cursor-pointer hover:tw-bg-primary-dark tw-transition-colors disabled:tw-opacity-50 tw-flex tw-items-center tw-gap-2"
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
      <div className="tw-bg-white tw-rounded-card tw-shadow-card tw-p-6">
        <h2 className="tw-text-xl tw-font-bold tw-text-text-main tw-mb-5 tw-flex tw-items-center tw-gap-2">
          <i className="fas fa-key tw-text-amber-500" /> <FormattedMessage id="patient-portal.change-password.title" />
        </h2>

        <form className="tw-space-y-4" onSubmit={handleChangePassword}>
          <div>
            <label className="tw-block tw-text-sm tw-font-medium tw-text-text-main tw-mb-1"><FormattedMessage id="patient-portal.change-password.current" /></label>
            <input
              type="password"
              className="tw-w-full tw-px-3 tw-py-2 tw-border tw-border-gray-300 tw-rounded-lg tw-text-sm focus:tw-outline-none focus:tw-border-primary"
              placeholder={intl.formatMessage({ id: 'patient-portal.change-password.current-placeholder' })}
              value={pwdForm.currentPassword}
              onChange={(e) => setPwdForm((p) => ({ ...p, currentPassword: e.target.value }))}
            />
          </div>
          <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 tw-gap-4">
            <div>
              <label className="tw-block tw-text-sm tw-font-medium tw-text-text-main tw-mb-1"><FormattedMessage id="patient-portal.change-password.new" /></label>
              <input
                type="password"
                className="tw-w-full tw-px-3 tw-py-2 tw-border tw-border-gray-300 tw-rounded-lg tw-text-sm focus:tw-outline-none focus:tw-border-primary"
                placeholder={intl.formatMessage({ id: 'patient-portal.change-password.new-placeholder' })}
                value={pwdForm.newPassword}
                onChange={(e) => setPwdForm((p) => ({ ...p, newPassword: e.target.value }))}
              />
            </div>
            <div>
              <label className="tw-block tw-text-sm tw-font-medium tw-text-text-main tw-mb-1"><FormattedMessage id="patient-portal.change-password.confirm" /></label>
              <input
                type="password"
                className="tw-w-full tw-px-3 tw-py-2 tw-border tw-border-gray-300 tw-rounded-lg tw-text-sm focus:tw-outline-none focus:tw-border-primary"
                placeholder={intl.formatMessage({ id: 'patient-portal.change-password.confirm-placeholder' })}
                value={pwdForm.confirmPassword}
                onChange={(e) => setPwdForm((p) => ({ ...p, confirmPassword: e.target.value }))}
              />
            </div>
          </div>

          <button
            id="change-password-btn"
            type="submit"
            className="tw-px-6 tw-py-2.5 tw-bg-amber-500 tw-text-white tw-rounded-lg tw-font-semibold tw-text-sm tw-border-0 tw-cursor-pointer hover:tw-bg-amber-600 tw-transition-colors disabled:tw-opacity-50 tw-flex tw-items-center tw-gap-2"
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
