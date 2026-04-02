// src/containers/System/Admin/ClinicManage.jsx
// Quản lý phòng khám (REQ-AM-011→014)
import React, { useEffect, useState } from 'react';
import { getAllClinic, createClinic, editClinic, deleteClinic } from '../../../services/clinicService';
import { confirmDelete, showSuccess, showError, showWarning } from '../../../utils/confirmDelete';
import CommonUtils from '../../../utils/CommonUtils';
import ImageUploadInput from '../../../components/Common/ImageUploadInput';
import MarkdownEditorField from '../../../components/Common/MarkdownEditorField';
import { marked } from 'marked'; // BUG-08: render markdown → HTML trước khi gửi backend
import './ClinicManage.scss';

const INIT_FORM = { id: '', name: '', address: '', descriptionMarkdown: '', descriptionHTML: '', previewImgURL: '', imageBase64: '' };

const ClinicManage = () => {
  const [clinics, setClinics] = useState([]);
  const [formData, setFormData] = useState(INIT_FORM);
  const [isEditing, setIsEditing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => { fetchClinics(); }, []);

  const fetchClinics = async () => {
    setIsLoading(true);
    try {
      const res = await getAllClinic();
      if (res.errCode === 0) setClinics(res.data || []);
    } catch { /* silent */ }
    setIsLoading(false);
  };

  const handleInput = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddNew = () => { setFormData(INIT_FORM); setIsEditing(false); setShowForm(true); };

  const handleEdit = (clinic) => {
    setFormData({
      id: clinic.id, name: clinic.name || '', address: clinic.address || '',
      descriptionMarkdown: clinic.descriptionMarkdown || '', descriptionHTML: clinic.descriptionHTML || '',
      previewImgURL: clinic.image && typeof clinic.image === 'string' ? CommonUtils.decodeBase64Image(clinic.image) : '', imageBase64: '',
    });
    setIsEditing(true); setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteClinic = async (clinic) => {
    const ok = await confirmDelete(clinic.name);
    if (!ok) return;
    try {
      const res = await deleteClinic(clinic.id);
      if (res.errCode === 0) { showSuccess('Đã xóa phòng khám.'); fetchClinics(); }
      else showError(res.message || 'Xóa thất bại');
    } catch { showError('Không thể kết nối server'); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.address) { showWarning('Thiếu thông tin!', 'Vui lòng điền tên và địa chỉ.'); return; }
    try {
      const payload = { name: formData.name, address: formData.address, descriptionMarkdown: formData.descriptionMarkdown, descriptionHTML: marked.parse(formData.descriptionMarkdown || ''), imageBase64: formData.imageBase64 || undefined };
      const res = isEditing ? await editClinic({ ...payload, id: formData.id }) : await createClinic(payload);
      if (res.errCode === 0) { showSuccess(isEditing ? 'Đã cập nhật phòng khám.' : 'Đã tạo phòng khám mới.'); setShowForm(false); setFormData(INIT_FORM); fetchClinics(); }
      else showError(res.message || 'Lưu thất bại');
    } catch { showError('Không thể kết nối server'); }
  };

  return (
    <div className="clinic-manage">
      <div className="manage-header">
        <h2 className="manage-title">🏥 Quản Lý Phòng Khám</h2>
        <button className="btn-add" onClick={handleAddNew}>+ Thêm mới</button>
      </div>

      {showForm && (
        <div className="form-card">
          <h4 className="form-title">{isEditing ? '✏️ Sửa phòng khám' : '➕ Thêm phòng khám mới'}</h4>
          <form onSubmit={handleSubmit}>
            <div className="form-row-2">
              <div className="form-group">
                <label>Tên phòng khám <span className="required">*</span></label>
                <input type="text" name="name" value={formData.name} onChange={handleInput} className="form-control" placeholder="Bệnh viện Chợ Rẫy" />
              </div>
              <div className="form-group">
                <label>Địa chỉ <span className="required">*</span></label>
                <input type="text" name="address" value={formData.address} onChange={handleInput} className="form-control" placeholder="201 Nguyễn Chí Thanh, Q.5" />
              </div>
            </div>
            <div className="form-group">
              <label>Ảnh phòng khám (max 5MB)</label>
              <ImageUploadInput
                previewUrl={formData.previewImgURL}
                inputId="clinic-img-upload"
                shape="rect"
                onChange={({ base64, objectUrl }) => setFormData((prev) => ({ ...prev, previewImgURL: objectUrl, imageBase64: base64 }))}
              />
            </div>
            <MarkdownEditorField
              value={formData.descriptionMarkdown}
              onChange={(val) => setFormData((prev) => ({ ...prev, descriptionMarkdown: val }))}
              height={300} label="Mô tả chi tiết (Markdown)" placeholder="## Giới thiệu phòng khám..."
            />
            <div className="form-actions">
              <button type="submit" className="btn-save">💾 Lưu lại</button>
              <button type="button" className="btn-cancel" onClick={() => setShowForm(false)}>✕ Huỷ</button>
            </div>
          </form>
        </div>
      )}

      <div className="clinic-list">
        {isLoading ? <p className="loading-text">Đang tải...</p> :
         clinics.length === 0 ? <p className="no-data">Chưa có phòng khám nào.</p> :
         clinics.map((clinic) => (
          <div key={clinic.id} className="clinic-card">
            <div className="clinic-img-wrap">
              {clinic.image && typeof clinic.image === 'string'
                ? <img src={CommonUtils.decodeBase64Image(clinic.image)} alt={clinic.name} className="clinic-img" />
                : <div className="clinic-img-placeholder">🏥</div>
              }
            </div>
            <div className="clinic-info">
              <h4 className="clinic-name">{clinic.name}</h4>
              <p className="clinic-address">📍 {clinic.address}</p>
            </div>
            <div className="clinic-actions">
              <button className="btn-edit" onClick={() => handleEdit(clinic)}>✏️ Sửa</button>
              <button className="btn-delete" onClick={() => handleDeleteClinic(clinic)}>🗑️ Xóa</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ClinicManage;
