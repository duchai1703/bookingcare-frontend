// src/containers/System/Doctor/DoctorProfile.jsx
// [Phase D.8] Bác sĩ tự quản lý hồ sơ cá nhân
import React, { useEffect, useState, useRef } from 'react';
import { getDoctorOwnProfile, updateDoctorOwnProfile } from '../../../services/doctorService';
import './DoctorProfile.scss';

const DoctorProfile = () => {
  const [profile, setProfile]   = useState(null);
  const [form, setForm]         = useState({});
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [success, setSuccess]   = useState('');
  const [error, setError]       = useState('');
  const fileInputRef            = useRef(null);

  useEffect(() => {
    getDoctorOwnProfile()
      .then(res => {
        if (res?.data?.errCode === 0) {
          const d = res.data.data;
          setProfile(d);
          setForm({
            firstName:       d.firstName       || '',
            lastName:        d.lastName        || '',
            address:         d.address         || '',
            phoneNumber:     d.phoneNumber     || '',
            description:     d.doctorInfoData?.description     || '',
            contentMarkdown: d.doctorInfoData?.contentMarkdown || '',
            image:           d.image           || null,
          });
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('Ảnh tối đa 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => setForm(p => ({ ...p, image: ev.target.result }));
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccess('');
    setError('');
    try {
      const res = await updateDoctorOwnProfile(form);
      if (res?.data?.errCode === 0) {
        setSuccess('✅ Cập nhật hồ sơ thành công!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(res?.data?.message || 'Có lỗi xảy ra');
      }
    } catch {
      setError('Không thể lưu. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="dp-loading">Đang tải hồ sơ...</div>;

  const avatarSrc = form.image
    ? (form.image.startsWith('data:') ? form.image : `data:image/jpeg;base64,${form.image}`)
    : null;

  return (
    <div className="doctor-profile-page">
      <h2>👤 Hồ sơ cá nhân</h2>

      {success && <div className="alert alert--success">{success}</div>}
      {error   && <div className="alert alert--error">{error}</div>}

      <div className="dp-layout">
        {/* Avatar section */}
        <div className="dp-avatar-section">
          <div
            className="dp-avatar"
            onClick={() => fileInputRef.current?.click()}
            title="Nhấn để đổi ảnh"
          >
            {avatarSrc
              ? <img src={avatarSrc} alt="Avatar" />
              : <div className="dp-avatar-placeholder">
                  <span>🩺</span>
                  <small>Nhấn để thêm ảnh</small>
                </div>
            }
            <div className="dp-avatar-overlay">📷 Đổi ảnh</div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleImageChange}
          />
          <div className="dp-info-readonly">
            <p><strong>Email:</strong> {profile?.email}</p>
            <p><strong>Chuyên khoa:</strong> {profile?.doctorInfoData?.specialtyData?.name || '—'}</p>
            <p><strong>Phòng khám:</strong> {profile?.doctorInfoData?.clinicData?.name || '—'}</p>
          </div>
        </div>

        {/* Form section */}
        <div className="dp-form-section">
          <div className="dp-row">
            <div className="dp-field">
              <label>Họ</label>
              <input
                value={form.lastName}
                onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))}
                placeholder="Nguyễn"
              />
            </div>
            <div className="dp-field">
              <label>Tên</label>
              <input
                value={form.firstName}
                onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))}
                placeholder="Văn A"
              />
            </div>
          </div>

          <div className="dp-field">
            <label>Số điện thoại</label>
            <input
              value={form.phoneNumber}
              onChange={e => setForm(p => ({ ...p, phoneNumber: e.target.value }))}
              placeholder="0912345678"
            />
          </div>

          <div className="dp-field">
            <label>Địa chỉ</label>
            <input
              value={form.address}
              onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
              placeholder="Số nhà, đường, quận, TP"
            />
          </div>

          <div className="dp-field">
            <label>Giới thiệu ngắn</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Mô tả ngắn về chuyên môn, kinh nghiệm..."
            />
          </div>

          <div className="dp-field">
            <label>Nội dung giới thiệu chi tiết (Markdown)</label>
            <textarea
              rows={6}
              value={form.contentMarkdown}
              onChange={e => setForm(p => ({ ...p, contentMarkdown: e.target.value }))}
              placeholder="## Giới thiệu bác sĩ&#10;&#10;Nội dung markdown..."
              className="markdown-input"
            />
          </div>

          <div className="dp-actions">
            <button className="btn-save" onClick={handleSave} disabled={saving}>
              {saving ? '⏳ Đang lưu...' : '💾 Lưu hồ sơ'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorProfile;
