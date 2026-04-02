// src/containers/System/Admin/DoctorManage.jsx
// Hồ sơ bác sĩ (REQ-AM-006→010, REQ-AM-022)
import React, { useEffect, useState } from 'react';
import { getAllUsers, getAllCode } from '../../../services/userService';
import { getDoctorDetail, saveInfoDoctor, deleteDoctorInfo } from '../../../services/doctorService';
import CommonUtils from '../../../utils/CommonUtils';
import { getAllSpecialty } from '../../../services/specialtyService';
import { getAllClinic } from '../../../services/clinicService';
import { confirmDelete, showSuccess, showError, showWarning } from '../../../utils/confirmDelete';
import ImageUploadInput from '../../../components/Common/ImageUploadInput';
import MarkdownEditorField from '../../../components/Common/MarkdownEditorField';
import { marked } from 'marked'; // GAP-01: render markdown → HTML trước khi gửi backend
import './DoctorManage.scss';

const INIT_INFO = {
  doctorId: '',
  specialtyId: '',
  clinicId: '',
  priceId: '',
  provinceId: '',
  paymentId: '',
  positionId: 'P0',
  note: '',
  description: '',
  contentMarkdown: '',
  contentHTML: '',
  previewImgURL: '',
  imageBase64: '',
};

const DoctorManage = () => {
  const [doctorList, setDoctorList] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [doctorInfo, setDoctorInfo] = useState(INIT_INFO);
  const [specialties, setSpecialties] = useState([]);
  const [clinics, setClinics] = useState([]);
  const [prices, setPrices] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [payments, setPayments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasExistingInfo, setHasExistingInfo] = useState(false);

  useEffect(() => {
    fetchDoctorList();
    fetchAllcodes();
    fetchSpecialtiesAndClinics();
  }, []);

  const fetchDoctorList = async () => {
    try {
      const res = await getAllUsers('ALL');
      if (res.errCode === 0)
        setDoctorList((res.data || []).filter((u) => u.roleId === 'R2'));
    } catch { /* silent */ }
  };

  const fetchAllcodes = async () => {
    try {
      const [priceRes, provRes, payRes, posRes] = await Promise.all([
        getAllCode('PRICE'), getAllCode('PROVINCE'),
        getAllCode('PAYMENT'), getAllCode('POSITION'),
      ]);
      if (priceRes.errCode === 0) setPrices(priceRes.data);
      if (provRes.errCode === 0) setProvinces(provRes.data);
      if (payRes.errCode === 0) setPayments(payRes.data);
      if (posRes.errCode === 0) setPositions(posRes.data);
    } catch { /* silent */ }
  };

  const fetchSpecialtiesAndClinics = async () => {
    try {
      const [specRes, clinicRes] = await Promise.all([getAllSpecialty(), getAllClinic()]);
      if (specRes.errCode === 0) setSpecialties(specRes.data);
      if (clinicRes.errCode === 0) setClinics(clinicRes.data);
    } catch { /* silent */ }
  };

  const handleSelectDoctor = async (e) => {
    const doctorId = e.target.value;
    setSelectedDoctorId(doctorId);
    if (!doctorId) { setDoctorInfo(INIT_INFO); setHasExistingInfo(false); return; }

    setIsLoading(true);
    try {
      const res = await getDoctorDetail(doctorId);
      if (res.errCode === 0 && res.data?.doctorInfoData) {
        const info = res.data.doctorInfoData;
        setDoctorInfo({
          doctorId,
          specialtyId: info.specialtyId || '',
          clinicId: info.clinicId || '',
          priceId: info.priceId || '',
          provinceId: info.provinceId || '',
          paymentId: info.paymentId || '',
          positionId: info.positionId || 'P0',
          note: info.note || '',
          description: info.description || '',
          contentMarkdown: info.contentMarkdown || '',
          contentHTML: info.contentHTML || '',
          previewImgURL: res.data.image ? CommonUtils.decodeBase64Image(res.data.image) : '',
          imageBase64: '',
        });
        setHasExistingInfo(true);
      } else {
        setDoctorInfo({ ...INIT_INFO, doctorId });
        setHasExistingInfo(false);
      }
    } catch { /* silent */ }
    setIsLoading(false);
  };

  const handleInput = (e) => {
    const { name, value } = e.target;
    setDoctorInfo((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!selectedDoctorId) { showWarning('Chưa chọn bác sĩ!', 'Vui lòng chọn bác sĩ.'); return; }
    if (!doctorInfo.specialtyId || !doctorInfo.clinicId || !doctorInfo.priceId) {
      showWarning('Thiếu thông tin!', 'Vui lòng chọn chuyên khoa, phòng khám và giá khám.');
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        doctorId: selectedDoctorId,
        specialtyId: doctorInfo.specialtyId,
        clinicId: doctorInfo.clinicId,
        priceId: doctorInfo.priceId,
        provinceId: doctorInfo.provinceId,
        paymentId: doctorInfo.paymentId,
        positionId: doctorInfo.positionId,
        note: doctorInfo.note,
        description: doctorInfo.description,
        contentMarkdown: doctorInfo.contentMarkdown,
        // GAP-01: dùng marked.parse() → lưu HTML đã render (REQ-AM-007)
        contentHTML: marked.parse(doctorInfo.contentMarkdown || ''),
        image: doctorInfo.imageBase64 || undefined,
      };
      const res = await saveInfoDoctor(payload);
      if (res.errCode === 0) { showSuccess('Đã lưu hồ sơ bác sĩ.'); setHasExistingInfo(true); }
      else showError(res.message || 'Lưu thất bại');
    } catch { showError('Không thể kết nối server'); }
    setIsSaving(false);
  };

  const handleDelete = async () => {
    const ok = await confirmDelete('hồ sơ bác sĩ này', 'Toàn bộ thông tin hồ sơ sẽ bị xóa.');
    if (!ok) return;
    try {
      const res = await deleteDoctorInfo(selectedDoctorId);
      if (res.errCode === 0) {
        showSuccess('Đã xóa hồ sơ bác sĩ.');
        setDoctorInfo({ ...INIT_INFO, doctorId: selectedDoctorId });
        setHasExistingInfo(false);
      } else showError(res.message || 'Xóa thất bại');
    } catch { showError('Không thể kết nối server'); }
  };

  return (
    <div className="doctor-manage">
      <div className="manage-header">
        <h2 className="manage-title">🩺 Quản Lý Hồ Sơ Bác Sĩ</h2>
        {hasExistingInfo && <span className="existing-badge">✅ Đã có hồ sơ</span>}
      </div>

      {/* Chọn bác sĩ (REQ-AM-022 — chỉ R2) */}
      <div className="form-card">
        <div className="form-group">
          <label>Chọn bác sĩ <span className="required">*</span></label>
          <select className="form-control select-lg" value={selectedDoctorId} onChange={handleSelectDoctor}>
            <option value="">-- Chọn bác sĩ (User role R2) --</option>
            {doctorList.map((doc) => (
              <option key={doc.id} value={doc.id}>{doc.lastName} {doc.firstName} — {doc.email}</option>
            ))}
          </select>
          <small className="hint">💡 Chỉ hiện user có role Bác sĩ (R2). Cần gán role R2 trước ở Quản lý Người dùng.</small>
        </div>
      </div>

      {selectedDoctorId && (isLoading ? (
        <p className="loading-text">Đang tải hồ sơ...</p>
      ) : (
        <>
          {/* Thông tin chuyên môn */}
          <div className="form-card">
            <h4 className="card-subtitle">📋 Thông Tin Chuyên Môn</h4>
            <div className="form-grid-3">
              <div className="form-group">
                <label>Chuyên khoa <span className="required">*</span></label>
                <select name="specialtyId" value={doctorInfo.specialtyId} onChange={handleInput} className="form-control">
                  <option value="">-- Chọn chuyên khoa --</option>
                  {specialties.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Phòng khám <span className="required">*</span></label>
                <select name="clinicId" value={doctorInfo.clinicId} onChange={handleInput} className="form-control">
                  <option value="">-- Chọn phòng khám --</option>
                  {clinics.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Giá khám <span className="required">*</span></label>
                <select name="priceId" value={doctorInfo.priceId} onChange={handleInput} className="form-control">
                  <option value="">-- Chọn giá --</option>
                  {prices.map((p) => <option key={p.keyMap} value={p.keyMap}>{p.valueVi}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Tỉnh/Thành phố</label>
                <select name="provinceId" value={doctorInfo.provinceId} onChange={handleInput} className="form-control">
                  <option value="">-- Chọn tỉnh --</option>
                  {provinces.map((p) => <option key={p.keyMap} value={p.keyMap}>{p.valueVi}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Phương thức thanh toán</label>
                <select name="paymentId" value={doctorInfo.paymentId} onChange={handleInput} className="form-control">
                  <option value="">-- Chọn thanh toán --</option>
                  {payments.map((p) => <option key={p.keyMap} value={p.keyMap}>{p.valueVi}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Chức danh</label>
                <select name="positionId" value={doctorInfo.positionId} onChange={handleInput} className="form-control">
                  {positions.map((p) => <option key={p.keyMap} value={p.keyMap}>{p.valueVi}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group mt-12">
              <label>Mô tả ngắn (hiển thị trang chủ)</label>
              <textarea name="description" value={doctorInfo.description} onChange={handleInput} className="form-control" rows={3} placeholder="BS. Nguyễn Văn A có hơn 10 năm kinh nghiệm..." />
            </div>
            <div className="form-group">
              <label>Ghi chú (Admin)</label>
              <input type="text" name="note" value={doctorInfo.note} onChange={handleInput} className="form-control" placeholder="Ghi chú nội bộ..." />
            </div>
            <div className="form-group">
              <label>Ảnh đại diện (max 5MB)</label>
              <ImageUploadInput
                previewUrl={doctorInfo.previewImgURL}
                inputId="doctor-img-upload"
                shape="round"
                onChange={({ base64, objectUrl }) =>
                  setDoctorInfo((prev) => ({ ...prev, previewImgURL: objectUrl, imageBase64: base64 }))
                }
              />
            </div>
          </div>

          {/* Markdown editor (REQ-AM-007) */}
          <div className="form-card">
            <MarkdownEditorField
              value={doctorInfo.contentMarkdown}
              onChange={(val) => setDoctorInfo((prev) => ({ ...prev, contentMarkdown: val }))}
              height={420}
              label="📝 Bài Giới Thiệu Bác Sĩ (Markdown)"
              placeholder="## Giới thiệu&#10;&#10;BS. Nguyễn Văn A..."
            />
          </div>

          {/* Actions */}
          <div className="action-footer">
            <button className="btn-save" onClick={handleSave} disabled={isSaving}>
              {isSaving ? '⏳ Đang lưu...' : '💾 Lưu hồ sơ'}
            </button>
            {hasExistingInfo && (
              <button className="btn-delete-outline" onClick={handleDelete}>🗑️ Xóa hồ sơ</button>
            )}
          </div>
        </>
      ))}
    </div>
  );
};

export default DoctorManage;
