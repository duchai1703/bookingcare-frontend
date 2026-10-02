// src/containers/PatientPortal/FamilyMembers.jsx
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import moment from 'moment';
import {
  getFamilyMembers,
  createFamilyMember,
  updateFamilyMember,
  deleteFamilyMember,
} from '../../services/familyMemberService';
import './FamilyMembers.scss';

const RELATIONSHIP_OPTIONS = [
  { value: 'CHILD', label: 'Con cái', icon: 'fas fa-child', color: '#0284c7' },
  { value: 'PARENT', label: 'Bố / Mẹ', icon: 'fas fa-user-friends', color: '#0d9488' },
  { value: 'SPOUSE', label: 'Vợ / Chồng', icon: 'fas fa-heart', color: '#e11d48' },
  { value: 'OTHER', label: 'Người thân khác', icon: 'fas fa-user', color: '#64748b' },
];

const GENDER_OPTIONS = [
  { value: 'MALE', label: 'Nam' },
  { value: 'FEMALE', label: 'Nữ' },
  { value: 'OTHER', label: 'Khác' },
];

const FamilyMembers = () => {
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterRelation, setFilterRelation] = useState('ALL');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentMemberId, setCurrentMemberId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    relationship: 'CHILD',
    gender: 'MALE',
    birthday: '',
    phoneNumber: '',
    address: '',
    nationalId: '',
    medicalHistory: '',
    notes: '',
  });

  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    fetchFamilyMembers();
  }, []);

  const fetchFamilyMembers = async () => {
    setIsLoading(true);
    try {
      const res = await getFamilyMembers();
      if (res && res.errCode === 0 && Array.isArray(res.data)) {
        setMembers(res.data);
      } else {
        toast.error(res?.message || 'Không thể tải danh sách sổ y bạ!');
      }
    } catch (err) {
      toast.error('Lỗi kết nối khi tải danh sách người thân!');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setIsEditing(false);
    setCurrentMemberId(null);
    setFormData({
      fullName: '',
      relationship: 'CHILD',
      gender: 'MALE',
      birthday: '',
      phoneNumber: '',
      address: '',
      nationalId: '',
      medicalHistory: '',
      notes: '',
    });
    setFormErrors({});
    setShowModal(true);
  };

  const handleOpenEditModal = (member) => {
    setIsEditing(true);
    setCurrentMemberId(member.id);
    setFormData({
      fullName: member.fullName || '',
      relationship: member.relationship || 'CHILD',
      gender: member.gender || 'MALE',
      birthday: member.birthday ? moment(member.birthday).format('YYYY-MM-DD') : '',
      phoneNumber: member.phoneNumber || '',
      address: member.address || '',
      nationalId: member.nationalId || '',
      medicalHistory: member.medicalHistory || '',
      notes: member.notes || '',
    });
    setFormErrors({});
    setShowModal(true);
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.fullName || formData.fullName.trim().length < 2) {
      errors.fullName = 'Họ và tên tối thiểu 2 ký tự!';
    }
    if (formData.phoneNumber) {
      const phoneRegex = /^[0-9]{10,11}$/;
      if (!phoneRegex.test(formData.phoneNumber)) {
        errors.phoneNumber = 'Số điện thoại không hợp lệ (10-11 số)!';
      }
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      let res;
      if (isEditing) {
        res = await updateFamilyMember(currentMemberId, formData);
      } else {
        res = await createFamilyMember(formData);
      }

      if (res && res.errCode === 0) {
        toast.success(isEditing ? 'Cập nhật hồ sơ thành công!' : 'Thêm hồ sơ người thân thành công!');
        setShowModal(false);
        fetchFamilyMembers();
      } else {
        toast.error(res?.message || 'Thao tác không thành công!');
      }
    } catch (err) {
      toast.error('Lỗi khi lưu thông tin người thân!');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa hồ sơ của "${name}" khỏi Sổ Y Bạ Gia Đình?`)) {
      return;
    }
    try {
      const res = await deleteFamilyMember(id);
      if (res && res.errCode === 0) {
        toast.success('Đã xóa hồ sơ thành công!');
        fetchFamilyMembers();
      } else {
        toast.error(res?.message || 'Không thể xóa hồ sơ này!');
      }
    } catch (err) {
      toast.error('Lỗi khi xóa hồ sơ!');
    }
  };

  const getRelationshipInfo = (rel) => {
    return RELATIONSHIP_OPTIONS.find((o) => o.value === rel) || RELATIONSHIP_OPTIONS[3];
  };

  const calculateAge = (birthday) => {
    if (!birthday) return null;
    const diff = moment().diff(moment(birthday), 'years');
    if (diff === 0) {
      const months = moment().diff(moment(birthday), 'months');
      return months > 0 ? `${months} tháng tuổi` : 'Dưới 1 tháng tuổi';
    }
    return `${diff} tuổi`;
  };

  const filteredMembers = filterRelation === 'ALL'
    ? members
    : members.filter((m) => m.relationship === filterRelation);

  return (
    <div className="family-portal-root">
      {/* Banner / Header */}
      <div className="family-hero-card">
        <div className="family-hero-content">
          <div className="family-badge">
            <i className="fas fa-heartbeat" /> Sổ Y Bạ Gia Đình • HL7 FHIR Standard
          </div>
          <h1 className="family-hero-title">Quản lý Hồ sơ Người thân</h1>
          <p className="family-hero-desc">
            Lưu trữ thông tin y tế, tiền sử bệnh lý và đặt lịch khám cho con nhỏ, cha mẹ, vợ chồng. Bác sĩ sẽ tiếp nhận hồ sơ lâm sàng chính xác mà không làm ảnh hưởng tài khoản người giám hộ.
          </p>
        </div>
        <div className="family-hero-action">
          <button className="btn-add-member" onClick={handleOpenAddModal}>
            <i className="fas fa-user-plus" />
            <span>Thêm hồ sơ người thân</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="family-filter-bar">
        <div className="filter-group">
          <button
            className={`filter-btn ${filterRelation === 'ALL' ? 'active' : ''}`}
            onClick={() => setFilterRelation('ALL')}
          >
            Tất cả ({members.length})
          </button>
          {RELATIONSHIP_OPTIONS.map((opt) => {
            const count = members.filter((m) => m.relationship === opt.value).length;
            return (
              <button
                key={opt.value}
                className={`filter-btn ${filterRelation === opt.value ? 'active' : ''}`}
                onClick={() => setFilterRelation(opt.value)}
              >
                <i className={opt.icon} style={{ color: opt.color, marginRight: 6 }} />
                {opt.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid of Members */}
      {isLoading ? (
        <div className="family-loading">
          <i className="fas fa-circle-notch fa-spin" />
          <p>Đang tải dữ liệu Sổ Y Bạ Gia Đình...</p>
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="family-empty-card">
          <div className="empty-icon-circle">
            <i className="fas fa-users" />
          </div>
          <h3>Chưa có hồ sơ người thân nào</h3>
          <p>
            Tạo hồ sơ cho con nhỏ hoặc cha mẹ để dễ dàng đặt lịch khám bệnh trực tuyến và theo dõi lịch sử khám bệnh tập trung.
          </p>
          <button className="btn-empty-add" onClick={handleOpenAddModal}>
            <i className="fas fa-plus" /> Thêm người thân đầu tiên
          </button>
        </div>
      ) : (
        <div className="family-cards-grid">
          {filteredMembers.map((member) => {
            const relInfo = getRelationshipInfo(member.relationship);
            const ageStr = calculateAge(member.birthday);

            return (
              <div key={member.id} className="family-member-card">
                <div className="card-top-header">
                  <div className="avatar-relation-box">
                    <div className="member-avatar" style={{ backgroundColor: `${relInfo.color}15`, color: relInfo.color }}>
                      <i className={relInfo.icon} />
                    </div>
                    <div className="member-main-info">
                      <h3 className="member-name">{member.fullName}</h3>
                      <span className="member-relationship-badge" style={{ backgroundColor: `${relInfo.color}18`, color: relInfo.color }}>
                        {relInfo.label}
                      </span>
                    </div>
                  </div>

                  <div className="card-actions">
                    <button
                      className="action-icon-btn edit-btn"
                      onClick={() => handleOpenEditModal(member)}
                      title="Chỉnh sửa hồ sơ"
                    >
                      <i className="fas fa-pen" />
                    </button>
                    <button
                      className="action-icon-btn delete-btn"
                      onClick={() => handleDelete(member.id, member.fullName)}
                      title="Xóa hồ sơ"
                    >
                      <i className="fas fa-trash-alt" />
                    </button>
                  </div>
                </div>

                <div className="member-details-list">
                  <div className="detail-item">
                    <span className="detail-label"><i className="fas fa-venus-mars" /> Giới tính:</span>
                    <span className="detail-val">
                      {member.gender === 'MALE' ? 'Nam' : member.gender === 'FEMALE' ? 'Nữ' : 'Khác'}
                    </span>
                  </div>

                  <div className="detail-item">
                    <span className="detail-label"><i className="fas fa-birthday-cake" /> Ngày sinh:</span>
                    <span className="detail-val">
                      {member.birthday ? (
                        <>
                          {moment(member.birthday).format('DD/MM/YYYY')}{' '}
                          {ageStr && <span className="age-tag">({ageStr})</span>}
                        </>
                      ) : (
                        'Chưa cập nhật'
                      )}
                    </span>
                  </div>

                  {member.phoneNumber && (
                    <div className="detail-item">
                      <span className="detail-label"><i className="fas fa-phone-alt" /> SĐT:</span>
                      <span className="detail-val">{member.phoneNumber}</span>
                    </div>
                  )}

                  {member.address && (
                    <div className="detail-item">
                      <span className="detail-label"><i className="fas fa-map-marker-alt" /> Địa chỉ:</span>
                      <span className="detail-val">{member.address}</span>
                    </div>
                  )}
                </div>

                {/* Tiền sử bệnh lý / Dị ứng */}
                {member.medicalHistory ? (
                  <div className="member-medical-card">
                    <div className="medical-header">
                      <i className="fas fa-notes-medical" /> Tiền sử dị ứng & bệnh lý
                    </div>
                    <p className="medical-content">{member.medicalHistory}</p>
                  </div>
                ) : (
                  <div className="member-medical-card empty">
                    <i className="fas fa-info-circle" /> Chưa ghi nhận dị ứng hoặc tiền sử bệnh lý.
                  </div>
                )}

                {member.notes && (
                  <div className="member-notes-box">
                    <span className="notes-label">Ghi chú:</span> {member.notes}
                  </div>
                )}

                <div className="card-footer-action">
                  <a href="/doctors" className="btn-book-for-member">
                    <i className="fas fa-calendar-plus" /> Đặt lịch khám cho {member.fullName}
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Thêm / Chỉnh sửa hồ sơ người thân */}
      {showModal && (
        <div className="family-modal-overlay" onClick={() => !isSubmitting && setShowModal(false)}>
          <div className="family-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-row">
                <div className="modal-header-icon">
                  <i className={isEditing ? 'fas fa-user-edit' : 'fas fa-user-plus'} />
                </div>
                <div>
                  <h2>{isEditing ? 'Chỉnh sửa hồ sơ người thân' : 'Thêm hồ sơ người thân mới'}</h2>
                  <p className="modal-subtitle">Đồng bộ chuẩn y tế HL7 FHIR RelatedPerson</p>
                </div>
              </div>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => !isSubmitting && setShowModal(false)}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form-body">
              <div className="form-group">
                <label className="form-label">
                  Họ và tên người thân <span className="req">*</span>
                </label>
                <input
                  type="text"
                  className={`form-input ${formErrors.fullName ? 'is-invalid' : ''}`}
                  placeholder="Ví dụ: Bé Nguyễn Gia An, Bà Trần Thị Mai..."
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  autoFocus
                />
                {formErrors.fullName && <span className="form-error">{formErrors.fullName}</span>}
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">
                    Quan hệ với chủ tài khoản <span className="req">*</span>
                  </label>
                  <select
                    className="form-select"
                    value={formData.relationship}
                    onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                  >
                    {RELATIONSHIP_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Giới tính <span className="req">*</span>
                  </label>
                  <select
                    className="form-select"
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  >
                    {GENDER_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">Ngày sinh</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.birthday}
                    onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Số điện thoại liên hệ (nếu có)</label>
                  <input
                    type="tel"
                    className={`form-input ${formErrors.phoneNumber ? 'is-invalid' : ''}`}
                    placeholder="Bỏ trống nếu dùng SĐT của bạn"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  />
                  {formErrors.phoneNumber && (
                    <span className="form-error">{formErrors.phoneNumber}</span>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Địa chỉ</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Địa chỉ cư trú..."
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  <i className="fas fa-allergies" style={{ color: '#e11d48', marginRight: 4 }} />
                  Tiền sử bệnh lý & Dị ứng thuốc
                </label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  placeholder="Ví dụ: Dị ứng kháng sinh Amoxicillin, hen suyễn bẩm sinh, tim bẩm sinh..."
                  value={formData.medicalHistory}
                  onChange={(e) => setFormData({ ...formData, medicalHistory: e.target.value })}
                />
                <span className="form-hint">
                  Thông tin này sẽ hiển thị cảnh báo trực tiếp cho Bác sĩ khi khám bệnh.
                </span>
              </div>

              <div className="form-group">
                <label className="form-label">Ghi chú thêm</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ghi chú đặc biệt khi đi khám..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              <div className="modal-actions-bar">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowModal(false)}
                  disabled={isSubmitting}
                >
                  Hủy bỏ
                </button>
                <button type="submit" className="btn-submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <i className="fas fa-spinner fa-spin" /> Đang lưu...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-check" /> {isEditing ? 'Lưu thay đổi' : 'Thêm hồ sơ'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FamilyMembers;
