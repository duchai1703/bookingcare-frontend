// src/containers/System/Admin/SpecialtyManage.jsx
// Quản lý chuyên khoa (REQ-AM-015→017)
import React, { useEffect, useState } from 'react';
import { getAllSpecialty, createSpecialty, editSpecialty, deleteSpecialty } from '../../../services/specialtyService';
import { confirmDelete, showSuccess, showError, showWarning } from '../../../utils/confirmDelete';
import CommonUtils from '../../../utils/CommonUtils';
import ImageUploadInput from '../../../components/Common/ImageUploadInput';
import MarkdownEditorField from '../../../components/Common/MarkdownEditorField';
import { marked } from 'marked'; // BUG-08: render markdown → HTML trước khi gửi backend
import './SpecialtyManage.scss';

const INIT_FORM = { id: '', name: '', descriptionMarkdown: '', descriptionHTML: '', previewImgURL: '', imageBase64: '' };

const SpecialtyManage = () => {
  const [specialties, setSpecialties] = useState([]);
  const [formData, setFormData] = useState(INIT_FORM);
  const [isEditing, setIsEditing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => { fetchSpecialties(); }, []);

  const fetchSpecialties = async () => {
    setIsLoading(true);
    try {
      const res = await getAllSpecialty();
      if (res.errCode === 0) setSpecialties(res.data || []);
    } catch { /* silent */ }
    setIsLoading(false);
  };

  const handleInput = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddNew = () => { setFormData(INIT_FORM); setIsEditing(false); setShowForm(true); };

  const handleEdit = (spec) => {
    setFormData({
      id: spec.id, name: spec.name || '',
      descriptionMarkdown: spec.descriptionMarkdown || '', descriptionHTML: spec.descriptionHTML || '',
      previewImgURL: spec.image ? CommonUtils.decodeBase64Image(spec.image) : '', imageBase64: '',
    });
    setIsEditing(true); setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteSpec = async (spec) => {
    const ok = await confirmDelete(spec.name);
    if (!ok) return;
    try {
      const res = await deleteSpecialty(spec.id);
      if (res.errCode === 0) { showSuccess('Đã xóa chuyên khoa.'); fetchSpecialties(); }
      else showError(res.message || 'Xóa thất bại');
    } catch { showError('Không thể kết nối server'); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) { showWarning('Thiếu thông tin!', 'Vui lòng nhập tên chuyên khoa.'); return; }
    try {
      const payload = { name: formData.name, descriptionMarkdown: formData.descriptionMarkdown, descriptionHTML: marked.parse(formData.descriptionMarkdown || ''), imageBase64: formData.imageBase64 || undefined };
      const res = isEditing ? await editSpecialty({ ...payload, id: formData.id }) : await createSpecialty(payload);
      if (res.errCode === 0) { showSuccess(isEditing ? 'Đã cập nhật chuyên khoa.' : 'Đã tạo chuyên khoa mới.'); setShowForm(false); setFormData(INIT_FORM); fetchSpecialties(); }
      else showError(res.message || 'Lưu thất bại');
    } catch { showError('Không thể kết nối server'); }
  };

  return (
    <div className="specialty-manage">
      <div className="manage-header">
        <h2 className="manage-title">🔬 Quản Lý Chuyên Khoa</h2>
        <button className="btn-add" onClick={handleAddNew}>+ Thêm mới</button>
      </div>

      {showForm && (
        <div className="form-card">
          <h4 className="form-title">{isEditing ? '✏️ Sửa chuyên khoa' : '➕ Thêm chuyên khoa mới'}</h4>
          <form onSubmit={handleSubmit}>
            <div className="form-top">
              <div className="img-col">
                <label className="small-label">Ảnh chuyên khoa</label>
                <ImageUploadInput
                  previewUrl={formData.previewImgURL}
                  inputId="spec-img-upload"
                  shape="round"
                  onChange={({ base64, objectUrl }) => setFormData((prev) => ({ ...prev, previewImgURL: objectUrl, imageBase64: base64 }))}
                />
              </div>
              <div className="form-group flex-1">
                <label>Tên chuyên khoa <span className="required">*</span></label>
                <input type="text" name="name" value={formData.name} onChange={handleInput} className="form-control" placeholder="Tim Mạch, Nha Khoa, Thần Kinh..." />
              </div>
            </div>
            <MarkdownEditorField
              value={formData.descriptionMarkdown}
              onChange={(val) => setFormData((prev) => ({ ...prev, descriptionMarkdown: val, descriptionHTML: val }))}
              height={280} label="Mô tả chuyên khoa (Markdown)"
            />
            <div className="form-actions">
              <button type="submit" className="btn-save">💾 Lưu lại</button>
              <button type="button" className="btn-cancel" onClick={() => setShowForm(false)}>✕ Huỷ</button>
            </div>
          </form>
        </div>
      )}

      {/* Grid 4 cột — BookingCare style */}
      <div className="specialty-grid">
        {isLoading ? <p className="loading-text">Đang tải...</p> :
         specialties.length === 0 ? <p className="no-data">Chưa có chuyên khoa nào.</p> :
         specialties.map((spec) => (
          <div key={spec.id} className="specialty-card">
            <div className="spec-img-wrap">
              {spec.image
                ? <img src={CommonUtils.decodeBase64Image(spec.image)} alt={spec.name} className="spec-img" />
                : <div className="spec-img-placeholder">🔬</div>
              }
            </div>
            <h5 className="spec-name">{spec.name}</h5>
            <div className="spec-actions">
              <button className="btn-edit" onClick={() => handleEdit(spec)} title="Sửa">✏️</button>
              <button className="btn-delete" onClick={() => handleDeleteSpec(spec)} title="Xóa">🗑️</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SpecialtyManage;
