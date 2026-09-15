// src/containers/System/Doctor/DoctorProfile.jsx
// [Phase D.8 - Extended] Bác sĩ tự quản lý hồ sơ cá nhân đầy đủ
// Bao gồm cả thông tin chuyên môn: chuyên khoa, phòng khám, giá khám, tỉnh thành, hình thức thanh toán
import React, { useEffect, useState, useRef } from 'react';
import { getDoctorOwnProfile, updateDoctorOwnProfile } from '../../../services/doctorService';
import { getAllCode } from '../../../services/userService';
import { getAllSpecialty } from '../../../services/specialtyService';
import { getAllClinic } from '../../../services/clinicService';
import './DoctorProfile.scss';

const DoctorProfile = () => {
  const [profile, setProfile]     = useState(null);
  const [form, setForm]           = useState({});
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [success, setSuccess]     = useState('');
  const [error, setError]         = useState('');
  const fileInputRef              = useRef(null);

  // Lookup data for dropdowns
  const [specialties, setSpecialties] = useState([]);
  const [clinics, setClinics]         = useState([]);
  const [prices, setPrices]           = useState([]);
  const [provinces, setProvinces]     = useState([]);
  const [payments, setPayments]       = useState([]);

  // Load profile + all dropdown data in parallel
  useEffect(() => {
    const loadAll = async () => {
      try {
        const [profileRes, specialtyRes, clinicRes, priceRes, provinceRes, paymentRes] =
          await Promise.all([
            getDoctorOwnProfile(),
            getAllSpecialty(),
            getAllClinic(),
            getAllCode('PRICE'),
            getAllCode('PROVINCE'),
            getAllCode('PAYMENT'),
          ]);

        // axiosConfig interceptor returns response.data directly → res.errCode (flat)
        if (specialtyRes?.errCode === 0) setSpecialties(specialtyRes.data || []);
        if (clinicRes?.errCode    === 0) setClinics(clinicRes.data        || []);
        if (priceRes?.errCode     === 0) setPrices(priceRes.data          || []);
        if (provinceRes?.errCode  === 0) setProvinces(provinceRes.data    || []);
        if (paymentRes?.errCode   === 0) setPayments(paymentRes.data      || []);

        // Load doctor profile
        if (profileRes?.errCode === 0) {
          const d = profileRes.data;
          setProfile(d);
          setForm({
            firstName:       d.firstName       || '',
            lastName:        d.lastName        || '',
            address:         d.address         || '',
            phoneNumber:     d.phoneNumber     || '',
            description:     d.doctorInfoData?.description     || '',
            contentMarkdown: d.doctorInfoData?.contentMarkdown || '',
            image:           d.image           || null,
            // Professional fields
            specialtyId:     d.doctorInfoData?.specialtyId  || '',
            clinicId:        d.doctorInfoData?.clinicId     || '',
            priceId:         d.doctorInfoData?.priceId      || '',
            provinceId:      d.doctorInfoData?.provinceId   || '',
            paymentId:       d.doctorInfoData?.paymentId    || '',
            note:            d.doctorInfoData?.note         || '',
          });
        }
      } catch (err) {
        console.error('DoctorProfile load error:', err);
        setError('Không thể tải dữ liệu. Vui lòng thử lại.');
      } finally {
        setLoading(false);
      }
    };

    loadAll();
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

  const handleChange = (field) => (e) =>
    setForm(p => ({ ...p, [field]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    setSuccess('');
    setError('');
    try {
      const res = await updateDoctorOwnProfile(form);
      // axiosConfig interceptor returns response.data directly (flat)
      if (res?.errCode === 0) {
        setSuccess('✅ Cập nhật hồ sơ thành công!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(res?.message || 'Có lỗi xảy ra');
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
        {/* ── Avatar & Readonly info ── */}
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
            <p><strong>Role:</strong> Bác sĩ</p>
          </div>
        </div>

        {/* ── Form ── */}
        <div className="dp-form-section">

          {/* ── Section 1: Thông tin cá nhân ── */}
          <div className="dp-section-title">📋 Thông tin cá nhân</div>

          <div className="dp-row">
            <div className="dp-field">
              <label>Họ</label>
              <input
                value={form.lastName}
                onChange={handleChange('lastName')}
                placeholder="Nguyễn"
              />
            </div>
            <div className="dp-field">
              <label>Tên</label>
              <input
                value={form.firstName}
                onChange={handleChange('firstName')}
                placeholder="Văn A"
              />
            </div>
          </div>

          <div className="dp-field">
            <label>Số điện thoại</label>
            <input
              value={form.phoneNumber}
              onChange={handleChange('phoneNumber')}
              placeholder="0912345678"
            />
          </div>

          <div className="dp-field">
            <label>Địa chỉ</label>
            <input
              value={form.address}
              onChange={handleChange('address')}
              placeholder="Số nhà, đường, quận, TP"
            />
          </div>

          {/* ── Section 2: Thông tin chuyên môn ── */}
          <div className="dp-section-title">🩺 Thông tin chuyên môn</div>

          <div className="dp-row">
            <div className="dp-field">
              <label>Chuyên khoa</label>
              <select value={form.specialtyId} onChange={handleChange('specialtyId')}>
                <option value="">-- Chọn chuyên khoa --</option>
                {specialties.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="dp-field">
              <label>Phòng khám</label>
              <select value={form.clinicId} onChange={handleChange('clinicId')}>
                <option value="">-- Chọn phòng khám --</option>
                {clinics.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="dp-row">
            <div className="dp-field">
              <label>Giá khám</label>
              <select value={form.priceId} onChange={handleChange('priceId')}>
                <option value="">-- Chọn mức giá --</option>
                {prices.map(p => (
                  <option key={p.keyMap} value={p.keyMap}>{p.valueVi}</option>
                ))}
              </select>
            </div>
            <div className="dp-field">
              <label>Tỉnh / Thành phố</label>
              <select value={form.provinceId} onChange={handleChange('provinceId')}>
                <option value="">-- Chọn tỉnh thành --</option>
                {provinces.map(p => (
                  <option key={p.keyMap} value={p.keyMap}>{p.valueVi}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="dp-field">
            <label>Hình thức thanh toán</label>
            <select value={form.paymentId} onChange={handleChange('paymentId')}>
              <option value="">-- Chọn hình thức --</option>
              {payments.map(p => (
                <option key={p.keyMap} value={p.keyMap}>{p.valueVi}</option>
              ))}
            </select>
          </div>

          <div className="dp-field">
            <label>Ghi chú (dành cho bệnh nhân)</label>
            <input
              value={form.note}
              onChange={handleChange('note')}
              placeholder="Ví dụ: Khám vào buổi sáng các ngày trong tuần"
            />
          </div>

          {/* ── Section 3: Nội dung giới thiệu ── */}
          <div className="dp-section-title">📝 Giới thiệu</div>

          <div className="dp-field">
            <label>Giới thiệu ngắn</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={handleChange('description')}
              placeholder="Mô tả ngắn về chuyên môn, kinh nghiệm..."
            />
          </div>

          <div className="dp-field">
            <label>Nội dung giới thiệu chi tiết (Markdown)</label>
            <textarea
              rows={8}
              value={form.contentMarkdown}
              onChange={handleChange('contentMarkdown')}
              placeholder={`## Giới thiệu bác sĩ\n\nNội dung markdown...`}
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
