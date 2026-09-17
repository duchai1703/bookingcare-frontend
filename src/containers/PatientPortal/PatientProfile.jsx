// src/containers/PatientPortal/PatientProfile.jsx
// [Phase 9.4] Trang Thông tin cá nhân + Quản lý tài khoản hoàn tiền + Đổi mật khẩu
import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { FormattedMessage, useIntl } from 'react-intl';
import { toast } from 'react-toastify';

import { processLogout, updateUserInfo } from '../../redux/slices/userSlice';
import { persistor } from '../../redux/store'; // ✅ [Fix 3.2] Import persistor
import { fetchAllcodeByType } from '../../redux/slices/appSlice';
import {
  getPatientProfile,
  editPatientProfile,
  changePassword,
  getPatientBankAccounts,
  addPatientBankAccount,
  setPrimaryBankAccount,
  deletePatientBankAccount,
} from '../../services/patientService';
import { ALLCODE_TYPES } from '../../utils/constants';
import './PatientProfile.scss';

const MAX_FILE_SIZE = 5000000; // 5MB

const POPULAR_BANKS = [
  'Vietcombank',
  'BIDV',
  'VietinBank',
  'Techcombank',
  'MB Bank',
  'Agribank',
  'ACB',
  'VPBank',
  'TPBank',
  'Sacombank',
  'HDBank',
  'VIB',
  'SHB',
  'SeABank',
  'OCB',
  'MSB',
];

const PatientProfile = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const intl = useIntl();
  const fileInputRef = useRef(null);

  const language = useSelector((state) => state.app.language);
  const genders = useSelector((state) => state.app.genders);
  const userInfo = useSelector((state) => state.user.userInfo);

  // ═══════ Thông tin cá nhân ═══════
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    birthday: '',
    address: '',
    gender: '',
    image: '',
    email: userInfo?.email || '',
  });
  const [previewAvatar, setPreviewAvatar] = useState('');
  const [avatarChanged, setAvatarChanged] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // ═══════ Tài khoản hoàn tiền ═══════
  const [bankAccounts, setBankAccounts] = useState([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [showAddBankModal, setShowAddBankModal] = useState(false);
  const [newBankForm, setNewBankForm] = useState({
    bankName: 'Vietcombank',
    accountNumber: '',
    accountHolder: '',
    isPrimary: false,
  });
  const [isSavingBank, setIsSavingBank] = useState(false);

  // ═══════ Đổi mật khẩu ═══════
  const [pwdForm, setPwdForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isChangingPwd, setIsChangingPwd] = useState(false);

  // Đồng bộ email từ userInfo nếu có
  useEffect(() => {
    if (userInfo?.email && !profile.email) {
      setProfile((prev) => ({ ...prev, email: userInfo.email }));
    }
  }, [userInfo]);

  // Fetch gender allcode + profile + bank accounts on mount
  useEffect(() => {
    if (!genders || genders.length === 0) {
      dispatch(fetchAllcodeByType(ALLCODE_TYPES.GENDER));
    }
    loadProfile();
    loadBankAccounts();
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
          birthday: d.birthday || '',
          address: d.address || '',
          gender: d.gender || '',
          image: d.image || '',
          email: d.email || userInfo?.email || '',
        });
        if (d.image) {
          const src =
            typeof d.image === 'string' && d.image.startsWith('data:')
              ? d.image
              : `data:image/jpeg;base64,${d.image}`;
          setPreviewAvatar(src);
        }
        if (d.bankAccounts && Array.isArray(d.bankAccounts)) {
          setBankAccounts(d.bankAccounts);
        }
      }
    } catch (err) {
      console.error('loadProfile error:', err);
    }
  };

  const loadBankAccounts = async () => {
    setIsLoadingAccounts(true);
    try {
      const res = await getPatientBankAccounts();
      if (res.errCode === 0 && Array.isArray(res.data)) {
        setBankAccounts(res.data);
      }
    } catch (err) {
      console.error('loadBankAccounts error:', err);
    } finally {
      setIsLoadingAccounts(false);
    }
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      toast.error(intl.formatMessage({ id: 'patient-portal.profile.avatar-too-large' }));
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result;
      setPreviewAvatar(base64);
      setProfile((prev) => ({ ...prev, image: base64 }));
      setAvatarChanged(true);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const dataToSend = {
        firstName: profile.firstName,
        lastName: profile.lastName,
        phoneNumber: profile.phoneNumber,
        birthday: profile.birthday,
        address: profile.address,
        gender: profile.gender,
      };

      if (avatarChanged) {
        dataToSend.image = profile.image;
      }

      const result = await editPatientProfile(dataToSend);

      if (result.errCode === 0) {
        toast.success(intl.formatMessage({ id: 'patient-portal.profile.save-success' }));
        setAvatarChanged(false);
        dispatch(
          updateUserInfo({
            firstName: profile.firstName,
            lastName: profile.lastName,
            ...(avatarChanged ? { image: profile.image } : {}),
          })
        );
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
  // Quản lý Tài khoản hoàn tiền
  // ═══════════════════════════════════════════════════════════
  const handleOpenAddBankModal = () => {
    const defaultHolder = `${profile.lastName} ${profile.firstName}`.trim().toUpperCase();
    setNewBankForm({
      bankName: 'Vietcombank',
      accountNumber: '',
      accountHolder: defaultHolder,
      isPrimary: bankAccounts.length === 0,
    });
    setShowAddBankModal(true);
  };

  const handleSaveBankAccount = async (e) => {
    e.preventDefault();
    if (!newBankForm.bankName || !newBankForm.accountNumber || !newBankForm.accountHolder) {
      toast.error('Vui lòng điền đầy đủ thông tin tài khoản!');
      return;
    }

    setIsSavingBank(true);
    try {
      const res = await addPatientBankAccount({
        ...newBankForm,
        accountHolderName: newBankForm.accountHolder,
      });
      if (res.errCode === 0) {
        toast.success(intl.formatMessage({ id: 'patient-portal.bank.add-success' }));
        setShowAddBankModal(false);
        loadBankAccounts();
      } else {
        toast.error(res.message || 'Thêm tài khoản thất bại!');
      }
    } catch (err) {
      toast.error('Lỗi hệ thống khi thêm tài khoản!');
    } finally {
      setIsSavingBank(false);
    }
  };

  const handleSetPrimary = async (accountId) => {
    try {
      const res = await setPrimaryBankAccount(accountId);
      if (res.errCode === 0) {
        toast.success(intl.formatMessage({ id: 'patient-portal.bank.set-primary-success' }));
        loadBankAccounts();
      } else {
        toast.error(res.message || 'Không thể đặt tài khoản làm chính!');
      }
    } catch (err) {
      toast.error('Lỗi khi cập nhật tài khoản chính!');
    }
  };

  const handleDeleteAccount = async (accountId) => {
    const confirmMsg = intl.formatMessage({ id: 'patient-portal.bank.delete-confirm' });
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await deletePatientBankAccount(accountId);
      if (res.errCode === 0) {
        toast.success(intl.formatMessage({ id: 'patient-portal.bank.delete-success' }));
        loadBankAccounts();
      } else {
        toast.error(res.message || 'Không thể xóa tài khoản!');
      }
    } catch (err) {
      toast.error('Lỗi khi xóa tài khoản!');
    }
  };

  // ═══════════════════════════════════════════════════════════
  // Đổi mật khẩu
  // ═══════════════════════════════════════════════════════════
  const handleChangePassword = async (e) => {
    e.preventDefault();
    const { currentPassword, newPassword, confirmPassword } = pwdForm;

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
      const result = await changePassword({ oldPassword: currentPassword, newPassword });

      if (result.errCode === 0) {
        toast.success(intl.formatMessage({ id: 'patient-portal.change-password.success' }));
        setTimeout(async () => {
          dispatch(processLogout());
          await persistor.flush();
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
                <label className="tw-block tw-text-sm tw-font-medium tw-text-text-main tw-mb-1">
                  <FormattedMessage id="patient-portal.profile.last-name" />
                </label>
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
                <label className="tw-block tw-text-sm tw-font-medium tw-text-text-main tw-mb-1">
                  <FormattedMessage id="patient-portal.profile.first-name" />
                </label>
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
                <label className="tw-block tw-text-sm tw-font-medium tw-text-text-main tw-mb-1">
                  <FormattedMessage id="patient-portal.profile.email" />
                </label>
                <input
                  type="email"
                  className="tw-w-full tw-px-3 tw-py-2 tw-border tw-border-gray-300 tw-rounded-lg tw-text-sm tw-bg-gray-50 tw-text-text-sub tw-cursor-not-allowed"
                  value={profile.email}
                  disabled
                />
              </div>
              <div>
                <label className="tw-block tw-text-sm tw-font-medium tw-text-text-main tw-mb-1">
                  <FormattedMessage id="patient-portal.profile.phone" />
                </label>
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
                <label className="tw-block tw-text-sm tw-font-medium tw-text-text-main tw-mb-1 tw-flex tw-items-center tw-justify-between">
                  <span>
                    <FormattedMessage id="patient-portal.profile.birthday" />
                  </span>
                  <span className="tw-text-xs tw-text-teal-600 tw-font-medium tw-bg-teal-50 tw-px-2 tw-py-0.5 tw-rounded tw-border tw-border-teal-100">
                    dd/mm/yyyy
                  </span>
                </label>
                <input
                  type="date"
                  name="birthday"
                  className="tw-w-full tw-px-3 tw-py-2 tw-border tw-border-gray-300 tw-rounded-lg tw-text-sm focus:tw-outline-none focus:tw-border-primary"
                  value={profile.birthday}
                  onChange={handleProfileChange}
                />
                <span className="tw-text-[11px] tw-text-slate-400 tw-mt-1 tw-block">
                  <i className="fas fa-info-circle tw-mr-1" />
                  Gợi ý định dạng: ngày/tháng/năm (dd/mm/yyyy)
                </span>
              </div>
              <div>
                <label className="tw-block tw-text-sm tw-font-medium tw-text-text-main tw-mb-1">
                  <FormattedMessage id="patient-portal.profile.gender" />
                </label>
                <select
                  name="gender"
                  className="tw-w-full tw-px-3 tw-py-2 tw-border tw-border-gray-300 tw-rounded-lg tw-text-sm tw-bg-white focus:tw-outline-none focus:tw-border-primary"
                  value={profile.gender}
                  onChange={handleProfileChange}
                >
                  <option value="">{intl.formatMessage({ id: 'patient-portal.profile.select-gender' })}</option>
                  {genders &&
                    genders.map((g) => (
                      <option key={g.keyMap} value={g.keyMap}>
                        {language === 'vi' ? g.valueVi : g.valueEn}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div>
              <label className="tw-block tw-text-sm tw-font-medium tw-text-text-main tw-mb-1">
                <FormattedMessage id="patient-portal.profile.address" />
              </label>
              <input
                type="text"
                name="address"
                className="tw-w-full tw-px-3 tw-py-2 tw-border tw-border-gray-300 tw-rounded-lg tw-text-sm focus:tw-outline-none focus:tw-border-primary"
                placeholder={intl.formatMessage({ id: 'patient-portal.profile.address-placeholder' })}
                value={profile.address}
                onChange={handleProfileChange}
              />
            </div>

            <button
              id="save-profile-btn"
              className="tw-px-6 tw-py-2.5 tw-bg-primary tw-text-white tw-rounded-lg tw-font-semibold tw-text-sm tw-border-0 tw-cursor-pointer hover:tw-bg-primary-dark tw-transition-colors disabled:tw-opacity-50 tw-flex tw-items-center tw-gap-2"
              onClick={handleSaveProfile}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <i className="fas fa-spinner fa-spin" /> <FormattedMessage id="patient-portal.profile.saving" />
                </>
              ) : (
                <>
                  <i className="fas fa-save" /> <FormattedMessage id="patient-portal.profile.save-btn" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ═══════ KHỐI 2: Tài khoản nhận tiền hoàn ═══════ */}
      <div className="tw-bg-white tw-rounded-card tw-shadow-card tw-p-6">
        <div className="tw-flex tw-flex-col sm:tw-flex-row sm:tw-items-center tw-justify-between tw-gap-4 tw-mb-4 tw-pb-3 tw-border-b tw-border-slate-100">
          <div>
            <h2 className="tw-text-xl tw-font-bold tw-text-text-main tw-flex tw-items-center tw-gap-2">
              <i className="fas fa-university tw-text-primary" /> <FormattedMessage id="patient-portal.bank.title" />
            </h2>
            <p className="tw-text-xs tw-text-text-sub tw-mt-1">
              <FormattedMessage id="patient-portal.bank.subtitle" />
            </p>
          </div>
          <button
            type="button"
            className="tw-inline-flex tw-items-center tw-gap-1.5 tw-px-3.5 tw-py-2 tw-bg-teal-50 tw-text-teal-700 tw-border tw-border-teal-200 tw-rounded-lg tw-text-xs tw-font-semibold hover:tw-bg-teal-100 tw-transition-colors tw-cursor-pointer"
            onClick={handleOpenAddBankModal}
          >
            <i className="fas fa-plus" /> <FormattedMessage id="patient-portal.bank.add-btn" />
          </button>
        </div>

        {isLoadingAccounts ? (
          <div className="tw-py-8 tw-text-center tw-text-text-sub tw-text-sm">
            <i className="fas fa-spinner fa-spin tw-mr-2" /> Đang tải tài khoản...
          </div>
        ) : bankAccounts.length === 0 ? (
          <div className="tw-py-8 tw-px-4 tw-text-center tw-bg-slate-50 tw-rounded-xl tw-border tw-border-dashed tw-border-slate-200">
            <i className="fas fa-credit-card tw-text-3xl tw-text-slate-300 tw-mb-2" />
            <p className="tw-text-sm tw-text-slate-500 tw-mb-3">
              <FormattedMessage id="patient-portal.bank.empty" />
            </p>
            <button
              type="button"
              className="tw-inline-flex tw-items-center tw-gap-1.5 tw-px-4 tw-py-2 tw-bg-primary tw-text-white tw-rounded-lg tw-text-xs tw-font-medium hover:tw-bg-primary-dark tw-transition-colors"
              onClick={handleOpenAddBankModal}
            >
              <i className="fas fa-plus" /> <FormattedMessage id="patient-portal.bank.add-btn" />
            </button>
          </div>
        ) : (
          <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 tw-gap-4">
            {bankAccounts.map((acc) => (
              <div
                key={acc.id}
                className={`tw-relative tw-p-4 tw-rounded-xl tw-border tw-transition-all ${
                  acc.isPrimary
                    ? 'tw-border-teal-500 tw-bg-teal-50/20 tw-shadow-sm'
                    : 'tw-border-slate-200 tw-bg-white hover:tw-border-slate-300'
                }`}
              >
                <div className="tw-flex tw-items-start tw-justify-between tw-gap-2 tw-mb-2">
                  <div className="tw-flex tw-items-center tw-gap-2">
                    <div className="tw-w-8 tw-h-8 tw-rounded-lg tw-bg-slate-100 tw-flex tw-items-center tw-justify-center tw-text-primary tw-font-bold tw-text-xs">
                      <i className="fas fa-university" />
                    </div>
                    <div>
                      <div className="tw-font-semibold tw-text-slate-800 tw-text-sm">{acc.bankName}</div>
                      <div className="tw-text-xs tw-text-slate-500 tw-font-mono">{acc.accountNumber}</div>
                    </div>
                  </div>
                  {acc.isPrimary && (
                    <span className="tw-inline-flex tw-items-center tw-gap-1 tw-px-2.5 tw-py-0.5 tw-bg-emerald-50 tw-text-emerald-700 tw-border tw-border-emerald-200 tw-rounded-full tw-text-[11px] tw-font-medium">
                      <i className="fas fa-check-circle tw-text-[10px]" />{' '}
                      <FormattedMessage id="patient-portal.bank.primary-badge" />
                    </span>
                  )}
                </div>

                <div className="tw-text-xs tw-text-slate-600 tw-font-medium tw-tracking-wide tw-mt-2">
                  <span className="tw-text-slate-400 tw-mr-1">CHỦ TK:</span>
                  {acc.accountHolder || acc.accountHolderName}
                </div>

                <div className="tw-flex tw-items-center tw-justify-end tw-gap-3 tw-mt-3 tw-pt-2 tw-border-t tw-border-slate-100">
                  {!acc.isPrimary && (
                    <button
                      type="button"
                      className="tw-text-xs tw-text-teal-600 hover:tw-text-teal-800 tw-font-medium tw-bg-transparent tw-border-0 tw-cursor-pointer tw-p-0"
                      onClick={() => handleSetPrimary(acc.id)}
                    >
                      <FormattedMessage id="patient-portal.bank.set-primary" />
                    </button>
                  )}
                  <button
                    type="button"
                    className="tw-text-xs tw-text-rose-500 hover:tw-text-rose-700 tw-bg-transparent tw-border-0 tw-cursor-pointer tw-p-0"
                    title={intl.formatMessage({ id: 'patient-portal.bank.delete' })}
                    onClick={() => handleDeleteAccount(acc.id)}
                  >
                    <i className="fas fa-trash-alt tw-mr-1" />
                    <FormattedMessage id="patient-portal.bank.delete" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ═══════ Modal Thêm tài khoản ngân hàng ═══════ */}
      {showAddBankModal && (
        <div className="tw-fixed tw-inset-0 tw-z-50 tw-bg-black/50 tw-flex tw-items-center tw-justify-center tw-p-4">
          <div className="tw-bg-white tw-rounded-2xl tw-shadow-2xl tw-w-full tw-max-w-md tw-overflow-hidden tw-animate-fadeIn">
            <div className="tw-px-6 tw-py-4 tw-border-b tw-border-slate-100 tw-flex tw-items-center tw-justify-between">
              <h3 className="tw-text-base tw-font-bold tw-text-slate-800 tw-flex tw-items-center tw-gap-2">
                <i className="fas fa-credit-card tw-text-primary" />{' '}
                <FormattedMessage id="patient-portal.bank.modal-title" />
              </h3>
              <button
                type="button"
                className="tw-text-slate-400 hover:tw-text-slate-600 tw-text-lg tw-bg-transparent tw-border-0 tw-cursor-pointer"
                onClick={() => setShowAddBankModal(false)}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveBankAccount} className="tw-p-6 tw-space-y-4">
              <div>
                <label className="tw-block tw-text-xs tw-font-semibold tw-text-slate-700 tw-mb-1">
                  <FormattedMessage id="patient-portal.bank.bank-name" /> *
                </label>
                <select
                  className="tw-w-full tw-px-3 tw-py-2 tw-border tw-border-slate-300 tw-rounded-lg tw-text-sm focus:tw-outline-none focus:tw-border-primary"
                  value={newBankForm.bankName}
                  onChange={(e) => setNewBankForm((p) => ({ ...p, bankName: e.target.value }))}
                >
                  {POPULAR_BANKS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="tw-block tw-text-xs tw-font-semibold tw-text-slate-700 tw-mb-1">
                  <FormattedMessage id="patient-portal.bank.account-number" /> *
                </label>
                <input
                  type="text"
                  className="tw-w-full tw-px-3 tw-py-2 tw-border tw-border-slate-300 tw-rounded-lg tw-text-sm focus:tw-outline-none focus:tw-border-primary"
                  placeholder="Ví dụ: 0123456789"
                  value={newBankForm.accountNumber}
                  onChange={(e) =>
                    setNewBankForm((p) => ({ ...p, accountNumber: e.target.value.replace(/\s+/g, '') }))
                  }
                  required
                />
              </div>

              <div>
                <label className="tw-block tw-text-xs tw-font-semibold tw-text-slate-700 tw-mb-1">
                  <FormattedMessage id="patient-portal.bank.account-holder" /> *
                </label>
                <input
                  type="text"
                  className="tw-w-full tw-px-3 tw-py-2 tw-border tw-border-slate-300 tw-rounded-lg tw-text-sm focus:tw-outline-none focus:tw-border-primary tw-uppercase"
                  placeholder="Ví dụ: NGUYEN VAN A"
                  value={newBankForm.accountHolder}
                  onChange={(e) =>
                    setNewBankForm((p) => ({ ...p, accountHolder: e.target.value.toUpperCase() }))
                  }
                  required
                />
              </div>

              <div className="tw-flex tw-items-center tw-gap-2 tw-pt-1">
                <input
                  type="checkbox"
                  id="primaryBankCheckbox"
                  checked={newBankForm.isPrimary}
                  onChange={(e) => setNewBankForm((p) => ({ ...p, isPrimary: e.target.checked }))}
                  className="tw-rounded tw-text-primary focus:tw-ring-primary"
                />
                <label htmlFor="primaryBankCheckbox" className="tw-text-xs tw-text-slate-700 tw-cursor-pointer">
                  <FormattedMessage id="patient-portal.bank.is-primary" />
                </label>
              </div>

              <div className="tw-flex tw-items-center tw-justify-end tw-gap-2 tw-pt-4 tw-border-t tw-border-slate-100">
                <button
                  type="button"
                  className="tw-px-4 tw-py-2 tw-text-xs tw-font-medium tw-text-slate-600 hover:tw-bg-slate-100 tw-rounded-lg tw-transition-colors"
                  onClick={() => setShowAddBankModal(false)}
                >
                  <FormattedMessage id="patient-portal.bank.cancel" />
                </button>
                <button
                  type="submit"
                  disabled={isSavingBank}
                  className="tw-px-4 tw-py-2 tw-text-xs tw-font-semibold tw-text-white tw-bg-primary hover:tw-bg-primary-dark tw-rounded-lg tw-transition-colors tw-flex tw-items-center tw-gap-1.5"
                >
                  {isSavingBank ? (
                    <i className="fas fa-spinner fa-spin" />
                  ) : (
                    <i className="fas fa-check" />
                  )}
                  <FormattedMessage id="patient-portal.bank.save" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════ KHỐI 3: Đổi mật khẩu ═══════ */}
      <div className="tw-bg-white tw-rounded-card tw-shadow-card tw-p-6">
        <h2 className="tw-text-xl tw-font-bold tw-text-text-main tw-mb-5 tw-flex tw-items-center tw-gap-2">
          <i className="fas fa-key tw-text-amber-500" /> <FormattedMessage id="patient-portal.change-password.title" />
        </h2>

        <form className="tw-space-y-4" onSubmit={handleChangePassword}>
          <div>
            <label className="tw-block tw-text-sm tw-font-medium tw-text-text-main tw-mb-1">
              <FormattedMessage id="patient-portal.change-password.current" />
            </label>
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
              <label className="tw-block tw-text-sm tw-font-medium tw-text-text-main tw-mb-1">
                <FormattedMessage id="patient-portal.change-password.new" />
              </label>
              <input
                type="password"
                className="tw-w-full tw-px-3 tw-py-2 tw-border tw-border-gray-300 tw-rounded-lg tw-text-sm focus:tw-outline-none focus:tw-border-primary"
                placeholder={intl.formatMessage({ id: 'patient-portal.change-password.new-placeholder' })}
                value={pwdForm.newPassword}
                onChange={(e) => setPwdForm((p) => ({ ...p, newPassword: e.target.value }))}
              />
            </div>
            <div>
              <label className="tw-block tw-text-sm tw-font-medium tw-text-text-main tw-mb-1">
                <FormattedMessage id="patient-portal.change-password.confirm" />
              </label>
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
              <>
                <i className="fas fa-spinner fa-spin" />{' '}
                <FormattedMessage id="patient-portal.change-password.submitting" />
              </>
            ) : (
              <>
                <i className="fas fa-lock" />{' '}
                <FormattedMessage id="patient-portal.change-password.submit-btn" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PatientProfile;

