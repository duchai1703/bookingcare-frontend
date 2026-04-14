// src/containers/System/Admin/UserManage.jsx
// Quản lý Users — CRUD (REQ-AM-001 → REQ-AM-005)
// [Phase 9 Final] Full i18n — useIntl + FormattedMessage
import React, { useEffect, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { getAllUsers, createNewUser, editUser, deleteUser, getAllCode } from '../../../services/userService';
import { confirmDelete, showSuccess, showError, showWarning } from '../../../utils/confirmDelete';
import CommonUtils from '../../../utils/CommonUtils';
import ImageUploadInput from '../../../components/Common/ImageUploadInput';
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

  return (
    <div className="user-manage">
      <div className="manage-header">
        <h2 className="manage-title"><FormattedMessage id="admin.manage.user.title" /></h2>
        <button className="btn-add" onClick={handleAddNew}><FormattedMessage id="admin.manage.user.btn-add" /></button>
      </div>

      {/* GAP-03: Search bar */}
      <div className="search-bar-wrap">
        <input
          type="text"
          className="form-control search-input"
          placeholder={intl.formatMessage({ id: 'admin.manage.user.placeholder-search' })}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
        {searchText && (
          <span className="search-count">
            {intl.formatMessage({ id: 'common.results-count' }, { filtered: filteredUsers.length, total: users.length })}
          </span>
        )}
      </div>

      {/* ===== FORM ===== */}
      {showForm && (
        <div className="form-card">
          <h4 className="form-title">
            <FormattedMessage id={isEditing ? 'admin.manage.user.form-title-edit' : 'admin.manage.user.form-title-add'} />
          </h4>
          <form onSubmit={handleSubmit}>
            <div className="form-top-row">
              {/* Ảnh đại diện */}
              <ImageUploadInput
                previewUrl={formData.previewImgURL}
                inputId="user-img-upload"
                shape="round"
                onChange={({ base64, objectUrl }) =>
                  setFormData((prev) => ({ ...prev, previewImgURL: objectUrl, imageBase64: base64 }))
                }
              />
              <div className="form-fields">
                <div className="form-row-2">
                  <div className="form-group">
                    <label><FormattedMessage id="admin.manage.user.label-last-name" /> <span className="required">*</span></label>
                    <input name="lastName" value={formData.lastName} onChange={handleInput} className="form-control" placeholder={intl.formatMessage({ id: 'admin.manage.user.placeholder-last-name' })} />
                  </div>
                  <div className="form-group">
                    <label><FormattedMessage id="admin.manage.user.label-first-name" /> <span className="required">*</span></label>
                    <input name="firstName" value={formData.firstName} onChange={handleInput} className="form-control" placeholder={intl.formatMessage({ id: 'admin.manage.user.placeholder-first-name' })} />
                  </div>
                  <div className="form-group">
                    <label><FormattedMessage id="admin.manage.user.label-email" /> <span className="required">*</span></label>
                    <input name="email" type="email" value={formData.email} onChange={handleInput} className="form-control" placeholder={intl.formatMessage({ id: 'admin.manage.user.placeholder-email' })} disabled={isEditing} />
                  </div>
                  {!isEditing && (
                    <div className="form-group">
                      <label><FormattedMessage id="admin.manage.user.label-password" /> <span className="required">*</span></label>
                      <input name="password" type="password" value={formData.password} onChange={handleInput} className="form-control" placeholder={intl.formatMessage({ id: 'admin.manage.user.placeholder-password' })} />
                    </div>
                  )}
                  <div className="form-group">
                    <label><FormattedMessage id="admin.manage.user.label-phone" /></label>
                    <input name="phoneNumber" value={formData.phoneNumber} onChange={handleInput} className="form-control" placeholder={intl.formatMessage({ id: 'admin.manage.user.placeholder-phone' })} />
                  </div>
                  <div className="form-group">
                    <label><FormattedMessage id="admin.manage.user.label-address" /></label>
                    <input name="address" value={formData.address} onChange={handleInput} className="form-control" placeholder={intl.formatMessage({ id: 'admin.manage.user.placeholder-address' })} />
                  </div>
                  <div className="form-group">
                    <label><FormattedMessage id="admin.manage.user.label-gender" /></label>
                    <select name="gender" value={formData.gender} onChange={handleInput} className="form-control">
                      {genders.map((g) => <option key={g.keyMap} value={g.keyMap}>{g.valueVi}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label><FormattedMessage id="admin.manage.user.label-role" /> <span className="required">*</span></label>
                    <select name="roleId" value={formData.roleId} onChange={handleInput} className="form-control">
                      {roles.map((r) => <option key={r.keyMap} value={r.keyMap}>{r.valueVi}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label><FormattedMessage id="admin.manage.user.label-position" /></label>
                    <select name="positionId" value={formData.positionId} onChange={handleInput} className="form-control">
                      {positions.map((p) => <option key={p.keyMap} value={p.keyMap}>{p.valueVi}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn-save"><FormattedMessage id="admin.manage.user.btn-save" /></button>
              <button type="button" className="btn-cancel" onClick={() => setShowForm(false)}><FormattedMessage id="admin.manage.user.btn-cancel" /></button>
            </div>
          </form>
        </div>
      )}

      {/* ===== TABLE ===== */}
      <div className="table-card">
        {isLoading ? (
          <p className="loading-text"><FormattedMessage id="admin.manage.user.loading" /></p>
        ) : (
          <div className="table-wrap">
            <table className="user-table">
              <thead>
                <tr>
                  <th><FormattedMessage id="admin.manage.user.col-index" /></th>
                  <th><FormattedMessage id="admin.manage.user.col-avatar" /></th>
                  <th><FormattedMessage id="admin.manage.user.col-fullname" /></th>
                  <th><FormattedMessage id="admin.manage.user.col-email" /></th>
                  <th><FormattedMessage id="admin.manage.user.col-phone" /></th>
                  <th><FormattedMessage id="admin.manage.user.col-role" /></th>
                  <th><FormattedMessage id="admin.manage.user.col-actions" /></th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr><td colSpan={7} className="no-data">
                    {searchText
                      ? intl.formatMessage({ id: 'admin.manage.user.no-search-result' }, { keyword: searchText })
                      : intl.formatMessage({ id: 'admin.manage.user.no-data' })
                    }
                  </td></tr>
                ) : filteredUsers.map((user, idx) => {
                  const badge = getRoleBadge(user.roleId);
                  return (
                    <tr key={user.id}>
                      <td>{idx + 1}</td>
                      <td>
                        <div className="user-avatar">
                        {user.image && typeof user.image === 'string'
                            ? <img src={CommonUtils.decodeBase64Image(user.image)} alt="avatar" />
                            : <span>{(user.lastName || '?')[0]}</span>
                          }
                        </div>
                      </td>
                      <td><span className="user-name">{user.lastName} {user.firstName}</span></td>
                      <td className="user-email">{user.email}</td>
                      <td>{user.phoneNumber || '—'}</td>
                      <td><span className={`role-badge ${badge.cls}`}>{badge.labelId ? intl.formatMessage({ id: badge.labelId }) : user.roleId}</span></td>
                      <td>
                        <button className="btn-edit" onClick={() => handleEdit(user)}><FormattedMessage id="admin.manage.user.btn-edit" /></button>
                        <button className="btn-delete" onClick={() => handleDeleteUser(user)}><FormattedMessage id="admin.manage.user.btn-delete" /></button>
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
