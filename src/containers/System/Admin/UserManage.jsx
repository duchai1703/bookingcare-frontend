// src/containers/System/Admin/UserManage.jsx
// Quản lý Users — CRUD (REQ-AM-001 → REQ-AM-005)
// [Phase 9 Final] Full i18n — useIntl + FormattedMessage
import React, { useEffect, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { getAllUsers, createNewUser, editUser, deleteUser, getAllCode } from '../../../services/userService';
import { confirmDelete, showSuccess, showError, showWarning } from '../../../utils/confirmDelete';
import CommonUtils from '../../../utils/CommonUtils';
import ImageUploadInput from '../../../components/Common/ImageUploadInput';
import { Search, Plus, Pencil, Trash2, Users, Stethoscope, UserCheck, ShieldCheck, TrendingUp } from 'lucide-react';
import './UserManage.scss';

const INIT_FORM = {
  id: '',
  email: '',
  password: '',
  firstName: '',
  lastName: '',
  address: '',
  phoneNumber: '',
  gender: '',      // FIX BUG-01: dynamic from allcodes (was 'M' → FK violation)
  roleId: '',      // FIX BUG-01: dynamic from allcodes (was 'R3')
  positionId: '',  // FIX BUG-01: dynamic from allcodes (was 'P0')
  previewImgURL: '',
  imageBase64: '',
};

const UserManage = () => {
  const intl = useIntl();
  const [users, setUsers] = useState([]);
  const [formData, setFormData] = useState(INIT_FORM);
  const [isEditing, setIsEditing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [genders, setGenders] = useState([]);
  const [roles, setRoles] = useState([]);
  const [positions, setPositions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  // GAP-03: search filter (client-side — users đã load ALL)
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    fetchUsers();
    fetchAllcodes();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await getAllUsers('ALL');
      if (res.errCode === 0) setUsers(res.data || []);
    } catch { /* silent */ }
    setIsLoading(false);
  };

  const fetchAllcodes = async () => {
    try {
      const [gRes, rRes, pRes] = await Promise.all([
        getAllCode('GENDER'),
        getAllCode('ROLE'),
        getAllCode('POSITION'),
      ]);
      // FIX BUG-01: Set allcode arrays + init INIT_FORM defaults from first entry
      if (gRes.errCode === 0) {
        setGenders(gRes.data);
        setFormData((prev) => prev.gender === '' ? { ...prev, gender: gRes.data[0]?.keyMap || '' } : prev);
      }
      if (rRes.errCode === 0) {
        setRoles(rRes.data);
        setFormData((prev) => prev.roleId === '' ? { ...prev, roleId: rRes.data[0]?.keyMap || '' } : prev);
      }
      if (pRes.errCode === 0) {
        setPositions(pRes.data);
        setFormData((prev) => prev.positionId === '' ? { ...prev, positionId: pRes.data[0]?.keyMap || '' } : prev);
      }
    } catch { /* silent */ }
  };

  const handleInput = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddNew = () => {
    // FIX BUG-01: Reset form with current allcode defaults
    setFormData({
      ...INIT_FORM,
      gender: genders[0]?.keyMap || '',
      roleId: roles[0]?.keyMap || '',
      positionId: positions[0]?.keyMap || '',
    });
    setIsEditing(false);
    setShowForm(true);
  };

  const handleEdit = (user) => {
    setFormData({
      id: user.id,
      email: user.email,
      password: '',
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      address: user.address || '',
      phoneNumber: user.phoneNumber || '',
      gender: user.gender || 'M',
      roleId: user.roleId || 'R3',
      positionId: user.positionId || 'P0',
      previewImgURL: user.image ? CommonUtils.decodeBase64Image(user.image) : '',
      imageBase64: '',
    });
    setIsEditing(true);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteUser = async (user) => {
    const fullName = `${user.lastName} ${user.firstName}`;
    const ok = await confirmDelete(fullName);
    if (!ok) return;
    try {
      const res = await deleteUser(user.id);
      if (res.errCode === 0) {
        showSuccess(intl.formatMessage({ id: 'admin.manage.user.toast-delete-success' }, { name: fullName }));
        fetchUsers();
      } else showError(res.message || intl.formatMessage({ id: 'admin.manage.user.toast-delete-error' }));
    } catch { showError(intl.formatMessage({ id: 'admin.manage.user.toast-server-error' })); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || (!isEditing && !formData.password)) {
      showWarning(
        intl.formatMessage({ id: 'admin.manage.user.toast-missing-info' }),
        intl.formatMessage({ id: 'admin.manage.user.toast-missing-info-desc' })
      );
      return;
    }
    // GAP-02: validate độ dài password tối thiểu 6 ký tự
    if (!isEditing && formData.password.length < 6) {
      showWarning(
        intl.formatMessage({ id: 'admin.manage.user.toast-password-short' }),
        intl.formatMessage({ id: 'admin.manage.user.toast-password-short-desc' })
      );
      return;
    }

    try {
      const payload = {
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        address: formData.address,
        phoneNumber: formData.phoneNumber,
        gender: formData.gender,
        roleId: formData.roleId,
        positionId: formData.positionId,
        image: formData.imageBase64 || undefined,
        // Chỉ gửi password khi tạo mới (khi edit không gửi để tránh ghi đè)
        ...(!isEditing && { password: formData.password }),
      };

      let res;
      if (isEditing) {
        res = await editUser({ ...payload, id: formData.id });
      } else {
        res = await createNewUser(payload);
      }

      if (res.errCode === 0) {
        showSuccess(intl.formatMessage({
          id: isEditing ? 'admin.manage.user.toast-save-success-edit' : 'admin.manage.user.toast-save-success-create'
        }));
        setShowForm(false);
        setFormData(INIT_FORM);
        fetchUsers();
      } else showError(res.message || intl.formatMessage({ id: 'admin.manage.user.toast-save-error' }));
    } catch { showError(intl.formatMessage({ id: 'admin.manage.user.toast-server-error' })); }
  };

  const getRoleBadge = (roleId) => {
    const map = {
      R1: { labelId: 'admin.manage.user.role-admin', cls: 'badge-admin' },
      R2: { labelId: 'admin.manage.user.role-doctor', cls: 'badge-doctor' },
      R3: { labelId: 'admin.manage.user.role-patient', cls: 'badge-patient' },
    };
    return map[roleId] || { labelId: '', cls: '' };
  };

  // GAP-03: derived list — lọc theo họ tên + email
  const filteredUsers = users.filter((u) =>
    `${u.lastName || ''} ${u.firstName || ''} ${u.email || ''}`
      .toLowerCase()
      .includes(searchText.toLowerCase())
  );

  // [Phase 10 — Allcode Guard] Disable submit nếu allcodes chưa sẵn sàng
  const isAllcodeReady = genders.length > 0 && roles.length > 0 && positions.length > 0;

  // KPI Stats — computed from loaded users
  const totalUsers = users.length;
  const totalDoctors = users.filter((u) => u.roleId === 'R2').length;
  const totalPatients = users.filter((u) => u.roleId === 'R3').length;
  const totalAdmins = users.filter((u) => u.roleId === 'R1').length;

  const kpiCards = [
    { icon: Users, labelId: 'admin.manage.user.kpi-total-users', value: totalUsers, color: 'tw-from-blue-500 tw-to-indigo-600', bgLight: 'tw-bg-blue-50', textColor: 'tw-text-blue-600', growth: '+12%' },
    { icon: Stethoscope, labelId: 'admin.manage.user.kpi-doctors', value: totalDoctors, color: 'tw-from-teal-500 tw-to-cyan-600', bgLight: 'tw-bg-teal-50', textColor: 'tw-text-teal-600', growth: '+5%' },
    { icon: UserCheck, labelId: 'admin.manage.user.kpi-patients', value: totalPatients, color: 'tw-from-emerald-500 tw-to-green-600', bgLight: 'tw-bg-emerald-50', textColor: 'tw-text-emerald-600', growth: '+18%' },
    { icon: ShieldCheck, labelId: 'admin.manage.user.kpi-admins', value: totalAdmins, color: 'tw-from-purple-500 tw-to-violet-600', bgLight: 'tw-bg-purple-50', textColor: 'tw-text-purple-600', growth: '—' },
  ];

  return (
    <div className="user-manage">
      {/* ===== KPI STAT CARDS ===== */}
      <div className="tw-grid tw-grid-cols-1 sm:tw-grid-cols-2 lg:tw-grid-cols-4 tw-gap-5 tw-mb-6">
        {kpiCards.map((card, i) => (
          <div key={i} className="tw-bg-white tw-rounded-2xl tw-shadow-card tw-p-5 tw-flex tw-items-center tw-gap-4 tw-transition-transform hover:tw-scale-[1.02]">
            <div className={`tw-w-12 tw-h-12 tw-rounded-xl ${card.bgLight} tw-flex tw-items-center tw-justify-center tw-flex-shrink-0`}>
              <card.icon size={22} className={card.textColor} />
            </div>
            <div className="tw-flex-1 tw-min-w-0">
              <p className="tw-text-xs tw-text-text-sub tw-mb-0.5 tw-truncate">{intl.formatMessage({ id: card.labelId })}</p>
              <div className="tw-flex tw-items-baseline tw-gap-2">
                <span className="tw-text-2xl tw-font-bold tw-text-text-main">{card.value.toLocaleString()}</span>
                {card.growth !== '—' && (
                  <span className="tw-text-xs tw-font-medium tw-text-emerald-500 tw-flex tw-items-center tw-gap-0.5">
                    <TrendingUp size={12} /> {card.growth}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ===== TOOLBAR ===== */}
      <div className="tw-flex tw-items-center tw-justify-between tw-gap-4 tw-mb-5">
        <div className="tw-flex tw-items-center tw-bg-gray-50 tw-border tw-border-gray-200 tw-rounded-full tw-px-4 tw-h-[42px] tw-flex-1 tw-max-w-md focus-within:tw-border-primary focus-within:tw-bg-white tw-transition-all">
          <Search size={16} className="!tw-flex !tw-items-center !tw-justify-center tw-text-gray-400 tw-mr-3 tw-flex-shrink-0" />
          <input
            type="text"
            className="tw-flex-1 tw-bg-transparent !tw-border-none !tw-outline-none tw-text-gray-700 tw-text-sm tw-h-full tw-min-w-0"
            placeholder={intl.formatMessage({ id: 'admin.manage.user.placeholder-search' })}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
        <div className="tw-flex tw-items-center tw-gap-3">
          {searchText && (
            <span className="tw-text-sm tw-text-text-sub tw-whitespace-nowrap">
              {intl.formatMessage({ id: 'common.results-count' }, { filtered: filteredUsers.length, total: users.length })}
            </span>
          )}
          <button className="!tw-inline-flex !tw-items-center !tw-justify-center tw-gap-2 tw-px-5 tw-py-2.5 tw-bg-primary tw-text-white tw-rounded-full tw-font-semibold tw-text-sm tw-border-0 tw-cursor-pointer hover:tw-bg-primary-dark tw-transition-colors tw-shadow-sm" onClick={handleAddNew}>
            <Plus size={16} className="!tw-inline-flex" /> <span className="!tw-leading-none"><FormattedMessage id="admin.manage.user.btn-add" /></span>
          </button>
        </div>
      </div>

      {/* [Phase 10 — Allcode Guard] Loading skeleton khi allcodes chưa sẵn sàng */}
      {!isAllcodeReady && showForm && (
        <div className="tw-bg-yellow-50 tw-border tw-border-yellow-200 tw-text-yellow-800 tw-px-4 tw-py-3 tw-rounded-2xl tw-mb-4 tw-text-sm">
          <FormattedMessage id="admin.manage.user.loading-allcode" />
        </div>
      )}

      {/* ===== FORM ===== */}
      {showForm && (
        <div className="tw-bg-white tw-rounded-2xl tw-shadow-card tw-p-6 tw-mb-6">
          <h4 className="tw-text-lg tw-font-semibold tw-text-text-main tw-mb-4">
            <FormattedMessage id={isEditing ? 'admin.manage.user.form-title-edit' : 'admin.manage.user.form-title-add'} />
          </h4>
          <form onSubmit={handleSubmit}>
            <div className="tw-flex tw-gap-6 tw-mb-4">
              {/* Ảnh đại diện */}
              <ImageUploadInput
                previewUrl={formData.previewImgURL}
                inputId="user-img-upload"
                shape="round"
                onChange={({ base64, objectUrl }) =>
                  setFormData((prev) => ({ ...prev, previewImgURL: objectUrl, imageBase64: base64 }))
                }
              />
              <div className="tw-flex-1">
                <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 lg:tw-grid-cols-3 tw-gap-4">
                  <div>
                    <label className="tw-block tw-text-sm tw-font-medium tw-text-text-main tw-mb-1"><FormattedMessage id="admin.manage.user.label-last-name" /> <span className="tw-text-danger">*</span></label>
                    <input name="lastName" value={formData.lastName} onChange={handleInput} className="tw-w-full tw-px-3 tw-py-2 tw-border tw-border-gray-200 tw-rounded-xl tw-text-sm focus:tw-outline-none focus:tw-border-primary tw-transition-colors" placeholder={intl.formatMessage({ id: 'admin.manage.user.placeholder-last-name' })} />
                  </div>
                  <div>
                    <label className="tw-block tw-text-sm tw-font-medium tw-text-text-main tw-mb-1"><FormattedMessage id="admin.manage.user.label-first-name" /> <span className="tw-text-danger">*</span></label>
                    <input name="firstName" value={formData.firstName} onChange={handleInput} className="tw-w-full tw-px-3 tw-py-2 tw-border tw-border-gray-200 tw-rounded-xl tw-text-sm focus:tw-outline-none focus:tw-border-primary tw-transition-colors" placeholder={intl.formatMessage({ id: 'admin.manage.user.placeholder-first-name' })} />
                  </div>
                  <div>
                    <label className="tw-block tw-text-sm tw-font-medium tw-text-text-main tw-mb-1"><FormattedMessage id="admin.manage.user.label-email" /> <span className="tw-text-danger">*</span></label>
                    <input name="email" type="email" value={formData.email} onChange={handleInput} className="tw-w-full tw-px-3 tw-py-2 tw-border tw-border-gray-200 tw-rounded-xl tw-text-sm focus:tw-outline-none focus:tw-border-primary tw-transition-colors disabled:tw-bg-gray-100 disabled:tw-cursor-not-allowed" placeholder={intl.formatMessage({ id: 'admin.manage.user.placeholder-email' })} disabled={isEditing} />
                  </div>
                  {!isEditing && (
                    <div>
                      <label className="tw-block tw-text-sm tw-font-medium tw-text-text-main tw-mb-1"><FormattedMessage id="admin.manage.user.label-password" /> <span className="tw-text-danger">*</span></label>
                      <input name="password" type="password" value={formData.password} onChange={handleInput} className="tw-w-full tw-px-3 tw-py-2 tw-border tw-border-gray-200 tw-rounded-xl tw-text-sm focus:tw-outline-none focus:tw-border-primary tw-transition-colors" placeholder={intl.formatMessage({ id: 'admin.manage.user.placeholder-password' })} />
                    </div>
                  )}
                  <div>
                    <label className="tw-block tw-text-sm tw-font-medium tw-text-text-main tw-mb-1"><FormattedMessage id="admin.manage.user.label-phone" /></label>
                    <input name="phoneNumber" value={formData.phoneNumber} onChange={handleInput} className="tw-w-full tw-px-3 tw-py-2 tw-border tw-border-gray-200 tw-rounded-xl tw-text-sm focus:tw-outline-none focus:tw-border-primary tw-transition-colors" placeholder={intl.formatMessage({ id: 'admin.manage.user.placeholder-phone' })} />
                  </div>
                  <div>
                    <label className="tw-block tw-text-sm tw-font-medium tw-text-text-main tw-mb-1"><FormattedMessage id="admin.manage.user.label-address" /></label>
                    <input name="address" value={formData.address} onChange={handleInput} className="tw-w-full tw-px-3 tw-py-2 tw-border tw-border-gray-200 tw-rounded-xl tw-text-sm focus:tw-outline-none focus:tw-border-primary tw-transition-colors" placeholder={intl.formatMessage({ id: 'admin.manage.user.placeholder-address' })} />
                  </div>
                  <div>
                    <label className="tw-block tw-text-sm tw-font-medium tw-text-text-main tw-mb-1"><FormattedMessage id="admin.manage.user.label-gender" /></label>
                    <select name="gender" value={formData.gender} onChange={handleInput} className="tw-w-full tw-px-3 tw-py-2 tw-border tw-border-gray-200 tw-rounded-xl tw-text-sm focus:tw-outline-none focus:tw-border-primary tw-bg-white">
                      {genders.map((g) => <option key={g.keyMap} value={g.keyMap}>{g.valueVi}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="tw-block tw-text-sm tw-font-medium tw-text-text-main tw-mb-1"><FormattedMessage id="admin.manage.user.label-role" /> <span className="tw-text-danger">*</span></label>
                    <select name="roleId" value={formData.roleId} onChange={handleInput} className="tw-w-full tw-px-3 tw-py-2 tw-border tw-border-gray-200 tw-rounded-xl tw-text-sm focus:tw-outline-none focus:tw-border-primary tw-bg-white">
                      {roles.map((r) => <option key={r.keyMap} value={r.keyMap}>{r.valueVi}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="tw-block tw-text-sm tw-font-medium tw-text-text-main tw-mb-1"><FormattedMessage id="admin.manage.user.label-position" /></label>
                    <select name="positionId" value={formData.positionId} onChange={handleInput} className="tw-w-full tw-px-3 tw-py-2 tw-border tw-border-gray-200 tw-rounded-xl tw-text-sm focus:tw-outline-none focus:tw-border-primary tw-bg-white">
                      {positions.map((p) => <option key={p.keyMap} value={p.keyMap}>{p.valueVi}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>
            <div className="tw-flex tw-gap-3 tw-justify-end tw-pt-4 tw-border-t tw-border-gray-100">
              {/* [Phase 10 — Allcode Guard] Disable submit khi allcodes chưa load */}
              <button type="submit" disabled={!isAllcodeReady} className="tw-flex tw-items-center tw-justify-center tw-gap-2 tw-px-5 tw-py-2 tw-bg-primary tw-text-white tw-rounded-xl tw-font-semibold tw-text-sm tw-border-0 tw-cursor-pointer hover:tw-bg-primary-dark tw-transition-colors disabled:tw-opacity-50 disabled:tw-cursor-not-allowed"><FormattedMessage id="admin.manage.user.btn-save" /></button>
              <button type="button" className="tw-flex tw-items-center tw-justify-center tw-gap-2 tw-px-5 tw-py-2 tw-bg-gray-100 tw-text-text-sub tw-rounded-xl tw-font-medium tw-text-sm tw-border tw-border-gray-200 tw-cursor-pointer hover:tw-bg-gray-200 tw-transition-colors" onClick={() => setShowForm(false)}><FormattedMessage id="admin.manage.user.btn-cancel" /></button>
            </div>
          </form>
        </div>
      )}

      {/* ===== TABLE ===== */}
      <div className="tw-bg-white tw-rounded-2xl tw-shadow-card tw-overflow-hidden">
        {isLoading ? (
          <p className="tw-text-center tw-py-8 tw-text-text-sub"><FormattedMessage id="admin.manage.user.loading" /></p>
        ) : (
          <div className="tw-overflow-x-auto">
            <table className="tw-w-full tw-text-sm">
              <thead>
                <tr className="tw-bg-gray-50/80">
                  <th className="tw-px-5 tw-py-3.5 tw-text-left tw-font-semibold tw-text-xs tw-text-gray-500 tw-uppercase tw-tracking-wider tw-align-middle"><FormattedMessage id="admin.manage.user.col-index" /></th>
                  <th className="tw-px-5 tw-py-3.5 tw-text-left tw-font-semibold tw-text-xs tw-text-gray-500 tw-uppercase tw-tracking-wider tw-align-middle"><FormattedMessage id="admin.manage.user.col-fullname" /></th>
                  <th className="tw-px-5 tw-py-3.5 tw-text-left tw-font-semibold tw-text-xs tw-text-gray-500 tw-uppercase tw-tracking-wider tw-align-middle"><FormattedMessage id="admin.manage.user.col-email" /></th>
                  <th className="tw-px-5 tw-py-3.5 tw-text-left tw-font-semibold tw-text-xs tw-text-gray-500 tw-uppercase tw-tracking-wider tw-align-middle"><FormattedMessage id="admin.manage.user.col-phone" /></th>
                  <th className="tw-px-5 tw-py-3.5 tw-text-left tw-font-semibold tw-text-xs tw-text-gray-500 tw-uppercase tw-tracking-wider tw-align-middle"><FormattedMessage id="admin.manage.user.col-role" /></th>
                  <th className="tw-px-5 tw-py-3.5 tw-text-right tw-font-semibold tw-text-xs tw-text-gray-500 tw-uppercase tw-tracking-wider tw-align-middle"><FormattedMessage id="admin.manage.user.col-actions" /></th>
                </tr>
              </thead>
              <tbody className="tw-divide-y tw-divide-gray-100">
                {filteredUsers.length === 0 ? (
                  <tr><td colSpan={6} className="tw-text-center tw-py-12 tw-text-text-light">
                    {searchText
                      ? intl.formatMessage({ id: 'admin.manage.user.no-search-result' }, { keyword: searchText })
                      : intl.formatMessage({ id: 'admin.manage.user.no-data' })
                    }
                  </td></tr>
                ) : filteredUsers.map((user, idx) => {
                  const badge = getRoleBadge(user.roleId);
                  const avatarColors = [
                    'tw-bg-blue-100 tw-text-blue-600', 'tw-bg-teal-100 tw-text-teal-600',
                    'tw-bg-purple-100 tw-text-purple-600', 'tw-bg-amber-100 tw-text-amber-600',
                    'tw-bg-pink-100 tw-text-pink-600', 'tw-bg-emerald-100 tw-text-emerald-600',
                  ];
                  const avatarColor = avatarColors[idx % avatarColors.length];
                  return (
                    <tr key={user.id} className="hover:tw-bg-gray-50/60 tw-transition-colors">
                      <td className="tw-px-5 tw-py-3.5 tw-text-text-sub tw-font-medium tw-align-middle">{idx + 1}</td>
                      <td className="tw-px-5 tw-py-3.5 tw-align-middle">
                        <div className="tw-flex tw-items-center tw-gap-3">
                          <div className={`tw-w-9 tw-h-9 tw-rounded-full tw-overflow-hidden tw-flex tw-items-center tw-justify-center tw-text-sm tw-font-bold tw-flex-shrink-0 ${user.image && typeof user.image === 'string' ? '' : avatarColor}`}>
                            {user.image && typeof user.image === 'string'
                              ? <img src={CommonUtils.decodeBase64Image(user.image)} alt="" className="tw-w-full tw-h-full tw-object-cover" />
                              : <span>{(user.lastName || '?')[0]}</span>
                            }
                          </div>
                          <span className="tw-font-medium tw-text-text-main">{user.lastName} {user.firstName}</span>
                        </div>
                      </td>
                      <td className="tw-px-5 tw-py-3.5 tw-text-text-sub tw-align-middle">{user.email}</td>
                      <td className="tw-px-5 tw-py-3.5 tw-text-text-sub tw-align-middle">{user.phoneNumber || '—'}</td>
                      <td className="tw-px-5 tw-py-3.5 tw-align-middle">
                        <span className={`tw-inline-flex tw-items-center tw-px-2.5 tw-py-1 tw-rounded-full tw-text-xs tw-font-semibold ${
                          badge.cls === 'badge-admin' ? 'tw-bg-purple-100 tw-text-purple-700' :
                          badge.cls === 'badge-doctor' ? 'tw-bg-blue-100 tw-text-blue-700' :
                          'tw-bg-emerald-100 tw-text-emerald-700'
                        }`}>
                          {badge.labelId ? intl.formatMessage({ id: badge.labelId }) : user.roleId}
                        </span>
                      </td>
                      <td className="tw-px-5 tw-py-3.5 tw-align-middle">
                        <div className="tw-flex tw-items-center tw-justify-end tw-gap-1">
                          <button className="tw-p-2 tw-rounded-lg tw-text-blue-500 hover:tw-bg-blue-50 tw-transition-colors tw-border-0 tw-bg-transparent tw-cursor-pointer" title={intl.formatMessage({ id: 'admin.manage.user.btn-edit' })} onClick={() => handleEdit(user)}>
                            <Pencil size={16} />
                          </button>
                          <button className="tw-p-2 tw-rounded-lg tw-text-red-400 hover:tw-bg-red-50 tw-transition-colors tw-border-0 tw-bg-transparent tw-cursor-pointer" title={intl.formatMessage({ id: 'admin.manage.user.btn-delete' })} onClick={() => handleDeleteUser(user)}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManage;
