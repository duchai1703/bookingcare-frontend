// src/containers/System/Admin/UserManage.jsx
// [Upgrade - Phương án 2] Full-stack User Management: Royal Indigo Theme, Role Tabs, Modals, Pagination, Lock/Unlock & Reset Password
import React, { useEffect, useState, useMemo } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import {
  getAllUsers,
  createNewUser,
  editUser,
  deleteUser,
  getAllCode,
  toggleUserStatus,
  resetUserPasswordApi,
} from '../../../services/userService';
import { confirmDelete, showSuccess, showError, showWarning } from '../../../utils/confirmDelete';
import CommonUtils from '../../../utils/CommonUtils';
import ImageUploadInput from '../../../components/Common/ImageUploadInput';
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Users,
  Stethoscope,
  UserCheck,
  ShieldCheck,
  TrendingUp,
  KeyRound,
  X,
  CheckCircle2,
  AlertCircle,
  Copy,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  ShieldAlert,
} from 'lucide-react';
import './UserManage.scss';

const INIT_FORM = {
  id: '',
  email: '',
  password: '',
  firstName: '',
  lastName: '',
  address: '',
  phoneNumber: '',
  gender: '',
  roleId: '',
  positionId: '',
  previewImgURL: '',
  imageBase64: '',
  isActive: true,
};

const UserManage = () => {
  const intl = useIntl();
  const [users, setUsers] = useState([]);
  const [formData, setFormData] = useState(INIT_FORM);
  const [isEditing, setIsEditing] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);

  // Reset Password Modal State
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetTargetUser, setResetTargetUser] = useState(null);
  const [newPasswordInput, setNewPasswordInput] = useState('BookingCare@123');
  const [resetSuccessData, setResetSuccessData] = useState(null);
  const [copied, setCopied] = useState(false);

  const [genders, setGenders] = useState([]);
  const [roles, setRoles] = useState([]);
  const [positions, setPositions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filters & Pagination
  const [searchText, setSearchText] = useState('');
  const [selectedRoleTab, setSelectedRoleTab] = useState('ALL'); // 'ALL' | 'R2' | 'R3' | 'R1'
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    fetchUsers();
    fetchAllcodes();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await getAllUsers('ALL');
      if (res.errCode === 0) setUsers(res.data || []);
    } catch {
      /* silent */
    }
    setIsLoading(false);
  };

  const fetchAllcodes = async () => {
    try {
      const [gRes, rRes, pRes] = await Promise.all([
        getAllCode('GENDER'),
        getAllCode('ROLE'),
        getAllCode('POSITION'),
      ]);
      if (gRes.errCode === 0) {
        setGenders(gRes.data);
        setFormData((prev) => (prev.gender === '' ? { ...prev, gender: gRes.data[0]?.keyMap || '' } : prev));
      }
      if (rRes.errCode === 0) {
        setRoles(rRes.data);
        setFormData((prev) => (prev.roleId === '' ? { ...prev, roleId: rRes.data[0]?.keyMap || '' } : prev));
      }
      if (pRes.errCode === 0) {
        setPositions(pRes.data);
        setFormData((prev) => (prev.positionId === '' ? { ...prev, positionId: pRes.data[0]?.keyMap || '' } : prev));
      }
    } catch {
      /* silent */
    }
  };

  // KPI Stats
  const totalUsers = users.length;
  const totalDoctors = users.filter((u) => u.roleId === 'R2').length;
  const totalPatients = users.filter((u) => u.roleId === 'R3').length;
  const totalAdmins = users.filter((u) => u.roleId === 'R1').length;

  const kpiCards = [
    {
      icon: Users,
      labelId: 'admin.manage.user.kpi-total-users',
      value: totalUsers,
      colorClass: 'blue',
      growth: '+12%',
    },
    {
      icon: Stethoscope,
      labelId: 'admin.manage.user.kpi-doctors',
      value: totalDoctors,
      colorClass: 'teal',
      growth: '+5%',
    },
    {
      icon: UserCheck,
      labelId: 'admin.manage.user.kpi-patients',
      value: totalPatients,
      colorClass: 'emerald',
      growth: '+18%',
    },
    {
      icon: ShieldCheck,
      labelId: 'admin.manage.user.kpi-admins',
      value: totalAdmins,
      colorClass: 'purple',
      growth: '—',
    },
  ];

  // Filtered Users by Search and Role Tab
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // 1. Role Tab Filter
      if (selectedRoleTab !== 'ALL' && u.roleId !== selectedRoleTab) return false;

      // 2. Search Text
      if (searchText.trim()) {
        const query = searchText.toLowerCase();
        const fullName = `${u.lastName || ''} ${u.firstName || ''}`.toLowerCase();
        const email = (u.email || '').toLowerCase();
        const phone = (u.phoneNumber || '').toLowerCase();
        if (!fullName.includes(query) && !email.includes(query) && !phone.includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [users, selectedRoleTab, searchText]);

  // Reset page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchText, selectedRoleTab, pageSize]);

  // Paginated Slice
  const totalPages = Math.ceil(filteredUsers.length / pageSize) || 1;
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, currentPage, pageSize]);

  const handleInput = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddNew = () => {
    setFormData({
      ...INIT_FORM,
      gender: genders[0]?.keyMap || '',
      roleId: roles[0]?.keyMap || '',
      positionId: positions[0]?.keyMap || '',
      isActive: true,
    });
    setIsEditing(false);
    setShowFormModal(true);
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
      gender: user.gender || genders[0]?.keyMap || '',
      roleId: user.roleId || roles[0]?.keyMap || 'R3',
      positionId: user.positionId || positions[0]?.keyMap || 'P0',
      previewImgURL: user.image ? CommonUtils.decodeBase64Image(user.image) : '',
      imageBase64: '',
      isActive: user.isActive !== false,
    });
    setIsEditing(true);
    setShowFormModal(true);
  };

  // Quick Toggle Active/Inactive
  const handleToggleStatus = async (user) => {
    const nextStatus = user.isActive === false ? true : false;
    try {
      const res = await toggleUserStatus(user.id, nextStatus);
      if (res.errCode === 0) {
        setUsers((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, isActive: nextStatus } : u))
        );
        showSuccess(
          `Đã ${nextStatus ? 'mở khóa' : 'tạm khóa'} tài khoản "${user.lastName} ${user.firstName}"!`
        );
      } else {
        showError(res.message || 'Không thể đổi trạng thái tài khoản!');
      }
    } catch {
      showError('Lỗi kết nối khi cập nhật trạng thái!');
    }
  };

  // Open Reset Password Modal
  const handleOpenResetPassword = (user) => {
    setResetTargetUser(user);
    setNewPasswordInput('BookingCare@123');
    setResetSuccessData(null);
    setCopied(false);
    setShowResetModal(true);
  };

  const handleExecuteResetPassword = async () => {
    if (!resetTargetUser) return;
    if (!newPasswordInput || newPasswordInput.trim().length < 6) {
      showWarning('Mật khẩu không hợp lệ', 'Mật khẩu mới phải có tối thiểu 6 ký tự!');
      return;
    }
    try {
      const res = await resetUserPasswordApi(resetTargetUser.id, newPasswordInput.trim());
      if (res.errCode === 0) {
        setResetSuccessData({
          userName: `${resetTargetUser.lastName} ${resetTargetUser.firstName}`,
          email: resetTargetUser.email,
          newPassword: res.newPassword || newPasswordInput.trim(),
        });
      } else {
        showError(res.message || 'Đặt lại mật khẩu thất bại!');
      }
    } catch {
      showError('Lỗi server khi đặt lại mật khẩu!');
    }
  };

  const handleCopyPassword = () => {
    if (resetSuccessData?.newPassword) {
      navigator.clipboard.writeText(resetSuccessData.newPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
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
      } else {
        showError(res.message || intl.formatMessage({ id: 'admin.manage.user.toast-delete-error' }));
      }
    } catch {
      showError(intl.formatMessage({ id: 'admin.manage.user.toast-server-error' }));
    }
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
        isActive: formData.isActive,
        image: formData.imageBase64 || undefined,
        ...(!isEditing && { password: formData.password }),
      };

      let res;
      if (isEditing) {
        res = await editUser({ ...payload, id: formData.id });
      } else {
        res = await createNewUser(payload);
      }

      if (res.errCode === 0) {
        showSuccess(
          intl.formatMessage({
            id: isEditing
              ? 'admin.manage.user.toast-save-success-edit'
              : 'admin.manage.user.toast-save-success-create',
          })
        );
        setShowFormModal(false);
        setFormData(INIT_FORM);
        fetchUsers();
      } else {
        showError(res.message || intl.formatMessage({ id: 'admin.manage.user.toast-save-error' }));
      }
    } catch {
      showError(intl.formatMessage({ id: 'admin.manage.user.toast-server-error' }));
    }
  };

  const getRoleBadge = (roleId) => {
    const map = {
      R1: { labelId: 'admin.manage.user.role-admin', cls: 'role-admin' },
      R2: { labelId: 'admin.manage.user.role-doctor', cls: 'role-doctor' },
      R3: { labelId: 'admin.manage.user.role-patient', cls: 'role-patient' },
    };
    return map[roleId] || { labelId: '', cls: '' };
  };

  const isAllcodeReady = genders.length > 0 && roles.length > 0 && positions.length > 0;

  return (
    <div className="user-manage-page">
      {/* ── 1. KPI Stat Cards Grid ── */}
      <div className="user-kpi-grid">
        {kpiCards.map((card, i) => (
          <div key={i} className="kpi-card">
            <div className={`kpi-icon-wrap ${card.colorClass}`}>
              <card.icon size={22} />
            </div>
            <div className="kpi-content">
              <span className="kpi-label">{intl.formatMessage({ id: card.labelId })}</span>
              <div className="kpi-value-row">
                <span className="kpi-value">{card.value.toLocaleString()}</span>
                {card.growth !== '—' && (
                  <span className="kpi-growth">
                    <TrendingUp size={12} /> {card.growth}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── 2. Role Filter Tabs Bar & Add Button ── */}
      <div className="user-role-tabs-wrap">
        <div className="role-tabs-list">
          <button
            type="button"
            className={`tab-item ${selectedRoleTab === 'ALL' ? 'active' : ''}`}
            onClick={() => setSelectedRoleTab('ALL')}
          >
            <span>Tất cả</span>
            <span className="tab-badge">{totalUsers}</span>
          </button>
          <button
            type="button"
            className={`tab-item ${selectedRoleTab === 'R2' ? 'active' : ''}`}
            onClick={() => setSelectedRoleTab('R2')}
          >
            <span>Bác sĩ</span>
            <span className="tab-badge">{totalDoctors}</span>
          </button>
          <button
            type="button"
            className={`tab-item ${selectedRoleTab === 'R3' ? 'active' : ''}`}
            onClick={() => setSelectedRoleTab('R3')}
          >
            <span>Bệnh nhân</span>
            <span className="tab-badge">{totalPatients}</span>
          </button>
          <button
            type="button"
            className={`tab-item ${selectedRoleTab === 'R1' ? 'active' : ''}`}
            onClick={() => setSelectedRoleTab('R1')}
          >
            <span>Quản trị viên</span>
            <span className="tab-badge">{totalAdmins}</span>
          </button>
        </div>

        <button className="btn-add-user" onClick={handleAddNew}>
          <Plus size={18} strokeWidth={2.4} />
          <span>Thêm người dùng</span>
        </button>
      </div>

      {/* ── 3. Toolbar: Search Box & Counter ── */}
      <div className="user-toolbar">
        <div className="search-wrap">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder={intl.formatMessage({ id: 'admin.manage.user.placeholder-search' })}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          {searchText && (
            <button
              type="button"
              className="btn-clear"
              onClick={() => setSearchText('')}
              title="Xóa tìm kiếm"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="toolbar-info">
          Hiển thị <strong>{filteredUsers.length}</strong> / {totalUsers} người dùng
        </div>
      </div>

      {/* ── 4. Main Data Table Card ── */}
      <div className="user-table-card">
        {isLoading ? (
          <p className="tw-text-center tw-py-12 tw-text-slate-400">
            <FormattedMessage id="admin.manage.user.loading" />
          </p>
        ) : (
          <div className="table-wrap">
            <table className="user-table">
              <thead>
                <tr>
                  <th style={{ width: '5%' }}>#</th>
                  <th style={{ width: '30%' }}>Họ và tên</th>
                  <th style={{ width: '22%' }}>Email</th>
                  <th style={{ width: '13%' }}>Số điện thoại</th>
                  <th style={{ width: '10%' }}>Vai trò</th>
                  <th style={{ width: '10%' }}>Trạng thái</th>
                  <th style={{ width: '10%', textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="tw-text-center tw-py-12 tw-text-slate-400">
                      {searchText
                        ? intl.formatMessage({ id: 'admin.manage.user.no-search-result' }, { keyword: searchText })
                        : intl.formatMessage({ id: 'admin.manage.user.no-data' })}
                    </td>
                  </tr>
                ) : (
                  paginatedUsers.map((user, idx) => {
                    const badge = getRoleBadge(user.roleId);
                    const rowNumber = (currentPage - 1) * pageSize + idx + 1;
                    const isInactive = user.isActive === false;
                    const positionObj = positions.find((p) => p.keyMap === user.positionId);

                    return (
                      <tr key={user.id} className={isInactive ? 'is-inactive' : ''}>
                        <td>
                          <span className="tw-font-medium tw-text-slate-400">{rowNumber}</span>
                        </td>
                        <td>
                          <div className="user-profile-cell">
                            <div className="avatar-wrap tw-bg-indigo-100 tw-text-indigo-600">
                              {user.image && typeof user.image === 'string' ? (
                                <img src={CommonUtils.decodeBase64Image(user.image)} alt="" />
                              ) : (
                                <span>{(user.lastName || user.firstName || '?')[0].toUpperCase()}</span>
                              )}
                            </div>
                            <div className="user-names-col">
                              <span className="user-fullname">
                                {user.lastName} {user.firstName}
                              </span>
                              {positionObj && user.roleId === 'R2' && (
                                <span className="user-position">{positionObj.valueVi}</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="tw-text-slate-600 font-mono text-xs">{user.email}</span>
                        </td>
                        <td>
                          <span className="tw-text-slate-600">{user.phoneNumber || '—'}</span>
                        </td>
                        <td>
                          <span className={`user-role-badge ${badge.cls}`}>
                            {badge.labelId ? intl.formatMessage({ id: badge.labelId }) : user.roleId}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className={`btn-status-toggle ${user.isActive !== false ? 'active' : 'inactive'}`}
                            onClick={() => handleToggleStatus(user)}
                            title="Bấm để Khóa / Mở khóa tài khoản"
                          >
                            <span className="dot" />
                            <span>{user.isActive !== false ? 'Hoạt động' : 'Đã khóa'}</span>
                          </button>
                        </td>
                        <td>
                          <div className="actions-wrap">
                            <button
                              type="button"
                              className="btn-action edit"
                              title={intl.formatMessage({ id: 'admin.manage.user.btn-edit' })}
                              onClick={() => handleEdit(user)}
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              type="button"
                              className="btn-action key"
                              title="Đặt lại mật khẩu"
                              onClick={() => handleOpenResetPassword(user)}
                            >
                              <KeyRound size={15} />
                            </button>
                            <button
                              type="button"
                              className="btn-action delete"
                              title={intl.formatMessage({ id: 'admin.manage.user.btn-delete' })}
                              onClick={() => handleDeleteUser(user)}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Pagination Footer ── */}
        {filteredUsers.length > 0 && (
          <div className="table-pagination-footer">
            <div className="page-size-selector">
              <span>Hiển thị mỗi trang:</span>
              <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
                <option value={10}>10 dòng</option>
                <option value={20}>20 dòng</option>
                <option value={50}>50 dòng</option>
              </select>
            </div>

            <div className="pagination-controls">
              <button
                type="button"
                className="btn-page-nav"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              >
                <ChevronLeft size={16} />
                <span>Trước</span>
              </button>

              {Array.from({ length: totalPages }).map((_, i) => {
                const pNum = i + 1;
                // Show first, last, and window around current page
                if (
                  pNum === 1 ||
                  pNum === totalPages ||
                  (pNum >= currentPage - 1 && pNum <= currentPage + 1)
                ) {
                  return (
                    <button
                      key={pNum}
                      type="button"
                      className={`page-num-btn ${currentPage === pNum ? 'active' : ''}`}
                      onClick={() => setCurrentPage(pNum)}
                    >
                      {pNum}
                    </button>
                  );
                }
                if (pNum === currentPage - 2 || pNum === currentPage + 2) {
                  return (
                    <span key={pNum} className="tw-px-1 tw-text-slate-400">
                      ...
                    </span>
                  );
                }
                return null;
              })}

              <button
                type="button"
                className="btn-page-nav"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              >
                <span>Sau</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── 5. Modal Dialog: Thêm / Sửa Người dùng ── */}
      {showFormModal && (
        <div className="modal-overlay" onClick={() => setShowFormModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title-group">
                <div className="modal-icon">
                  <UserPlus size={22} />
                </div>
                <h3>
                  <FormattedMessage
                    id={
                      isEditing
                        ? 'admin.manage.user.form-title-edit'
                        : 'admin.manage.user.form-title-add'
                    }
                  />
                </h3>
              </div>
              <button
                type="button"
                className="btn-close"
                onClick={() => setShowFormModal(false)}
                title="Đóng cửa sổ"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="user-form-layout">
                  {/* Cột trái: Ảnh đại diện */}
                  <div className="avatar-col">
                    <ImageUploadInput
                      previewUrl={formData.previewImgURL}
                      inputId="user-img-upload-modal"
                      shape="round"
                      onChange={({ base64, objectUrl }) =>
                        setFormData((prev) => ({
                          ...prev,
                          previewImgURL: objectUrl,
                          imageBase64: base64,
                        }))
                      }
                    />
                    <span className="tw-text-xs tw-text-slate-400 tw-text-center">
                      Ảnh chân dung (JPG, PNG)
                    </span>
                  </div>

                  {/* Cột phải: Form Fields Grid */}
                  <div className="fields-col">
                    <div className="fields-grid">
                      <div className="field-item">
                        <label>
                          <FormattedMessage id="admin.manage.user.label-last-name" />{' '}
                          <span className="req">*</span>
                        </label>
                        <input
                          name="lastName"
                          value={formData.lastName}
                          onChange={handleInput}
                          placeholder={intl.formatMessage({
                            id: 'admin.manage.user.placeholder-last-name',
                          })}
                          autoFocus
                        />
                      </div>

                      <div className="field-item">
                        <label>
                          <FormattedMessage id="admin.manage.user.label-first-name" />{' '}
                          <span className="req">*</span>
                        </label>
                        <input
                          name="firstName"
                          value={formData.firstName}
                          onChange={handleInput}
                          placeholder={intl.formatMessage({
                            id: 'admin.manage.user.placeholder-first-name',
                          })}
                        />
                      </div>

                      <div className="field-item">
                        <label>
                          <FormattedMessage id="admin.manage.user.label-email" />{' '}
                          <span className="req">*</span>
                        </label>
                        <input
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleInput}
                          placeholder={intl.formatMessage({
                            id: 'admin.manage.user.placeholder-email',
                          })}
                          disabled={isEditing}
                        />
                      </div>

                      {!isEditing && (
                        <div className="field-item">
                          <label>
                            <FormattedMessage id="admin.manage.user.label-password" />{' '}
                            <span className="req">*</span>
                          </label>
                          <input
                            name="password"
                            type="password"
                            value={formData.password}
                            onChange={handleInput}
                            placeholder={intl.formatMessage({
                              id: 'admin.manage.user.placeholder-password',
                            })}
                          />
                        </div>
                      )}

                      <div className="field-item">
                        <label>
                          <FormattedMessage id="admin.manage.user.label-phone" />
                        </label>
                        <input
                          name="phoneNumber"
                          value={formData.phoneNumber}
                          onChange={handleInput}
                          placeholder={intl.formatMessage({
                            id: 'admin.manage.user.placeholder-phone',
                          })}
                        />
                      </div>

                      <div className="field-item">
                        <label>
                          <FormattedMessage id="admin.manage.user.label-gender" />
                        </label>
                        <select name="gender" value={formData.gender} onChange={handleInput}>
                          {genders.map((g) => (
                            <option key={g.keyMap} value={g.keyMap}>
                              {g.valueVi}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="field-item">
                        <label>
                          <FormattedMessage id="admin.manage.user.label-role" />{' '}
                          <span className="req">*</span>
                        </label>
                        <select name="roleId" value={formData.roleId} onChange={handleInput}>
                          {roles.map((r) => (
                            <option key={r.keyMap} value={r.keyMap}>
                              {r.valueVi}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="field-item">
                        <label>
                          <FormattedMessage id="admin.manage.user.label-position" />
                        </label>
                        <select
                          name="positionId"
                          value={formData.positionId}
                          onChange={handleInput}
                        >
                          {positions.map((p) => (
                            <option key={p.keyMap} value={p.keyMap}>
                              {p.valueVi}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="field-item full-width">
                        <label>Trạng thái tài khoản</label>
                        <select
                          name="isActive"
                          value={String(formData.isActive)}
                          onChange={(e) =>
                            setFormData((p) => ({ ...p, isActive: e.target.value === 'true' }))
                          }
                        >
                          <option value="true">● Hoạt động (Được phép đăng nhập hệ thống)</option>
                          <option value="false">○ Đã khóa (Tạm ngừng quyền truy cập)</option>
                        </select>
                      </div>

                      <div className="field-item full-width">
                        <label>
                          <FormattedMessage id="admin.manage.user.label-address" />
                        </label>
                        <input
                          name="address"
                          value={formData.address}
                          onChange={handleInput}
                          placeholder={intl.formatMessage({
                            id: 'admin.manage.user.placeholder-address',
                          })}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-foot">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowFormModal(false)}
                >
                  <FormattedMessage id="admin.manage.user.btn-cancel" />
                </button>
                <button type="submit" disabled={!isAllcodeReady} className="btn-save">
                  <CheckCircle2 size={16} />
                  <span>
                    <FormattedMessage id="admin.manage.user.btn-save" />
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 6. Modal Dialog: Đặt lại Mật khẩu ── */}
      {showResetModal && resetTargetUser && (
        <div className="modal-overlay" onClick={() => setShowResetModal(false)}>
          <div className="modal-box modal-small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title-group">
                <div className="modal-icon amber">
                  <KeyRound size={22} />
                </div>
                <h3>Đặt lại Mật khẩu</h3>
              </div>
              <button
                type="button"
                className="btn-close"
                onClick={() => setShowResetModal(false)}
                title="Đóng"
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div className="reset-pwd-box">
                <div className="user-preview-pill">
                  <div className="avatar-wrap tw-w-9 tw-h-9 tw-rounded-full tw-bg-indigo-100 tw-text-indigo-600 tw-flex tw-items-center tw-justify-center tw-font-bold tw-text-sm">
                    {(resetTargetUser.lastName || resetTargetUser.firstName || '?')[0].toUpperCase()}
                  </div>
                  <div className="u-info">
                    <strong>
                      {resetTargetUser.lastName} {resetTargetUser.firstName}
                    </strong>
                    <span>{resetTargetUser.email}</span>
                  </div>
                </div>

                {!resetSuccessData ? (
                  <>
                    <div className="pwd-input-wrap">
                      <label>Mật khẩu mới khởi tạo</label>
                      <input
                        type="text"
                        value={newPasswordInput}
                        onChange={(e) => setNewPasswordInput(e.target.value)}
                        placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)..."
                      />
                      <span className="tw-text-xs tw-text-slate-400">
                        Gợi ý: Mặc định là <code>BookingCare@123</code>. Tất cả phiên đăng nhập cũ của người dùng này sẽ bị hủy.
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="pwd-success-alert">
                    <div className="success-title">
                      <CheckCircle2 size={18} />
                      <span>Mật khẩu đã được đặt lại thành công!</span>
                    </div>
                    <p className="tw-text-xs tw-text-slate-600 tw-m-0">
                      Hãy cung cấp mật khẩu dưới đây cho người dùng để họ đăng nhập:
                    </p>
                    <div className="password-copy-row">
                      <code>{resetSuccessData.newPassword}</code>
                      <button type="button" className="btn-copy" onClick={handleCopyPassword}>
                        {copied ? 'Đã sao chép!' : 'Sao chép'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-foot">
              {!resetSuccessData ? (
                <>
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={() => setShowResetModal(false)}
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    className="btn-save"
                    onClick={handleExecuteResetPassword}
                  >
                    <KeyRound size={16} />
                    <span>Xác nhận đặt lại</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="btn-save"
                  onClick={() => setShowResetModal(false)}
                >
                  <span>Hoàn tất</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManage;
