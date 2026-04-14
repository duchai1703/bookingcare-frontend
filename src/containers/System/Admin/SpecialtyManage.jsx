// src/containers/System/Admin/SpecialtyManage.jsx
// Quản lý chuyên khoa (REQ-AM-015→017)
// [Phase 9 Final] Full i18n — useIntl + FormattedMessage
import React, { useEffect, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { getAllSpecialty, createSpecialty, editSpecialty, deleteSpecialty } from '../../../services/specialtyService';
import { confirmDelete, showSuccess, showError, showWarning } from '../../../utils/confirmDelete';
import CommonUtils from '../../../utils/CommonUtils';
import ImageUploadInput from '../../../components/Common/ImageUploadInput';
import MarkdownEditorField from '../../../components/Common/MarkdownEditorField';
import { marked } from 'marked'; // BUG-08: render markdown → HTML trước khi gửi backend
import './SpecialtyManage.scss';

const INIT_FORM = { id: '', name: '', descriptionMarkdown: '', descriptionHTML: '', previewImgURL: '', imageBase64: '' };

const SpecialtyManage = () => {
  const intl = useIntl();
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
      previewImgURL: spec.image && typeof spec.image === 'string' ? CommonUtils.decodeBase64Image(spec.image) : '', imageBase64: '',
    });
    setIsEditing(true); setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteSpec = async (spec) => {
    const ok = await confirmDelete(spec.name);
    if (!ok) return;
    try {
      const res = await deleteSpecialty(spec.id);
      if (res.errCode === 0) {
        showSuccess(intl.formatMessage({ id: 'admin.manage.specialty.toast-delete-success' }, { name: spec.name }));
        fetchSpecialties();
      } else showError(res.message || intl.formatMessage({ id: 'admin.manage.specialty.toast-delete-error' }));
    } catch { showError(intl.formatMessage({ id: 'admin.manage.specialty.toast-server-error' })); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) {
      showWarning(
        intl.formatMessage({ id: 'admin.manage.specialty.toast-missing-info' }),
        intl.formatMessage({ id: 'admin.manage.specialty.toast-missing-info-desc' })
      );
      return;
    }
    try {
      const payload = { name: formData.name, descriptionMarkdown: formData.descriptionMarkdown, descriptionHTML: marked.parse(formData.descriptionMarkdown || ''), imageBase64: formData.imageBase64 || undefined };
      const res = isEditing ? await editSpecialty({ ...payload, id: formData.id }) : await createSpecialty(payload);
      if (res.errCode === 0) {
        showSuccess(intl.formatMessage({
          id: isEditing ? 'admin.manage.specialty.toast-save-success-edit' : 'admin.manage.specialty.toast-save-success-create'
        }));
        setShowForm(false); setFormData(INIT_FORM); fetchSpecialties();
      } else showError(res.message || intl.formatMessage({ id: 'admin.manage.specialty.toast-save-error' }));
    } catch { showError(intl.formatMessage({ id: 'admin.manage.specialty.toast-server-error' })); }
  };

  return (
    <div className="specialty-manage">
      <div className="manage-header">
        <h2 className="manage-title"><FormattedMessage id="admin.manage.specialty.title" /></h2>
        <button className="btn-add" onClick={handleAddNew}><FormattedMessage id="admin.manage.specialty.btn-add" /></button>
      </div>

      {showForm && (
        <div className="form-card">
          <h4 className="form-title">
            <FormattedMessage id={isEditing ? 'admin.manage.specialty.form-title-edit' : 'admin.manage.specialty.form-title-add'} />
          </h4>
          <form onSubmit={handleSubmit}>
            <div className="form-top">
              <div className="img-col">
                <label className="small-label"><FormattedMessage id="admin.manage.specialty.label-image" /></label>
                <ImageUploadInput
                  previewUrl={formData.previewImgURL}
                  inputId="spec-img-upload"
                  shape="round"
                  onChange={({ base64, objectUrl }) => setFormData((prev) => ({ ...prev, previewImgURL: objectUrl, imageBase64: base64 }))}
                />
              </div>
              <div className="form-group flex-1">
                <label><FormattedMessage id="admin.manage.specialty.label-name" /> <span className="required">*</span></label>
                <input type="text" name="name" value={formData.name} onChange={handleInput} className="form-control" placeholder={intl.formatMessage({ id: 'admin.manage.specialty.placeholder-name' })} />
              </div>
            </div>
            <MarkdownEditorField
              value={formData.descriptionMarkdown}
              onChange={(val) => setFormData((prev) => ({ ...prev, descriptionMarkdown: val }))}
              height={280}
              label={intl.formatMessage({ id: 'admin.manage.specialty.label-markdown' })}
            />
            <div className="form-actions">
              <button type="submit" className="btn-save"><FormattedMessage id="admin.manage.specialty.btn-save" /></button>
              <button type="button" className="btn-cancel" onClick={() => setShowForm(false)}><FormattedMessage id="admin.manage.specialty.btn-cancel" /></button>
            </div>
          </form>
        </div>
      )}

      {/* Grid 4 cột — BookingCare style */}
      <div className="specialty-grid">
        {isLoading ? <p className="loading-text"><FormattedMessage id="admin.manage.specialty.loading" /></p> :
         specialties.length === 0 ? <p className="no-data"><FormattedMessage id="admin.manage.specialty.no-data" /></p> :
         specialties.map((spec) => (
          <div key={spec.id} className="specialty-card">
            <div className="spec-img-wrap">
              {spec.image && typeof spec.image === 'string'
                ? <img src={CommonUtils.decodeBase64Image(spec.image)} alt={spec.name} className="spec-img" />
                : <div className="spec-img-placeholder">🔬</div>
              }
            </div>
            <h5 className="spec-name">{spec.name}</h5>
            <div className="spec-actions">
              <button className="btn-edit" onClick={() => handleEdit(spec)} title={intl.formatMessage({ id: 'common.edit' })}>✏️</button>
              <button className="btn-delete" onClick={() => handleDeleteSpec(spec)} title={intl.formatMessage({ id: 'common.delete' })}>🗑️</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SpecialtyManage;
