// src/containers/System/Admin/ClinicManage.jsx
// Quản lý phòng khám (REQ-AM-011→014)
// [Phase 9 Final] Full i18n — useIntl + FormattedMessage
import React, { useEffect, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { getAllClinic, createClinic, editClinic, deleteClinic } from '../../../services/clinicService';
import { confirmDelete, showSuccess, showError, showWarning } from '../../../utils/confirmDelete';
import CommonUtils from '../../../utils/CommonUtils';
import ImageUploadInput from '../../../components/Common/ImageUploadInput';
import MarkdownEditorField from '../../../components/Common/MarkdownEditorField';
import { marked } from 'marked'; // BUG-08: render markdown → HTML trước khi gửi backend
import './ClinicManage.scss';

const INIT_FORM = { id: '', name: '', address: '', descriptionMarkdown: '', descriptionHTML: '', previewImgURL: '', imageBase64: '' };

const ClinicManage = () => {
  const intl = useIntl();
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
      if (res.errCode === 0) {
        showSuccess(intl.formatMessage({ id: 'admin.manage.clinic.toast-delete-success' }, { name: clinic.name }));
        fetchClinics();
      } else showError(res.message || intl.formatMessage({ id: 'admin.manage.clinic.toast-delete-error' }));
    } catch { showError(intl.formatMessage({ id: 'admin.manage.clinic.toast-server-error' })); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.address) {
      showWarning(
        intl.formatMessage({ id: 'admin.manage.clinic.toast-missing-info' }),
        intl.formatMessage({ id: 'admin.manage.clinic.toast-missing-info-desc' })
      );
      return;
    }
    try {
      const payload = { name: formData.name, address: formData.address, descriptionMarkdown: formData.descriptionMarkdown, descriptionHTML: marked.parse(formData.descriptionMarkdown || ''), imageBase64: formData.imageBase64 || undefined };
      const res = isEditing ? await editClinic({ ...payload, id: formData.id }) : await createClinic(payload);
      if (res.errCode === 0) {
        showSuccess(intl.formatMessage({
          id: isEditing ? 'admin.manage.clinic.toast-save-success-edit' : 'admin.manage.clinic.toast-save-success-create'
        }));
        setShowForm(false); setFormData(INIT_FORM); fetchClinics();
      } else showError(res.message || intl.formatMessage({ id: 'admin.manage.clinic.toast-save-error' }));
    } catch { showError(intl.formatMessage({ id: 'admin.manage.clinic.toast-server-error' })); }
  };

  return (
    <div className="clinic-manage">
      <div className="manage-header">
        <h2 className="manage-title"><FormattedMessage id="admin.manage.clinic.title" /></h2>
        <button className="btn-add" onClick={handleAddNew}><FormattedMessage id="admin.manage.clinic.btn-add" /></button>
      </div>

      {showForm && (
        <div className="form-card">
          <h4 className="form-title">
            <FormattedMessage id={isEditing ? 'admin.manage.clinic.form-title-edit' : 'admin.manage.clinic.form-title-add'} />
          </h4>
          <form onSubmit={handleSubmit}>
            <div className="form-row-2">
              <div className="form-group">
                <label><FormattedMessage id="admin.manage.clinic.label-name" /> <span className="required">*</span></label>
                <input type="text" name="name" value={formData.name} onChange={handleInput} className="form-control" placeholder={intl.formatMessage({ id: 'admin.manage.clinic.placeholder-name' })} />
              </div>
              <div className="form-group">
                <label><FormattedMessage id="admin.manage.clinic.label-address" /> <span className="required">*</span></label>
                <input type="text" name="address" value={formData.address} onChange={handleInput} className="form-control" placeholder={intl.formatMessage({ id: 'admin.manage.clinic.placeholder-address' })} />
              </div>
            </div>
            <div className="form-group">
              <label><FormattedMessage id="admin.manage.clinic.label-image" /></label>
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
              height={300}
              label={intl.formatMessage({ id: 'admin.manage.clinic.label-markdown' })}
              placeholder={intl.formatMessage({ id: 'admin.manage.clinic.placeholder-markdown' })}
            />
            <div className="form-actions">
              <button type="submit" className="btn-save"><FormattedMessage id="admin.manage.clinic.btn-save" /></button>
              <button type="button" className="btn-cancel" onClick={() => setShowForm(false)}><FormattedMessage id="admin.manage.clinic.btn-cancel" /></button>
            </div>
          </form>
        </div>
      )}

      <div className="clinic-list">
        {isLoading ? <p className="loading-text"><FormattedMessage id="admin.manage.clinic.loading" /></p> :
         clinics.length === 0 ? <p className="no-data"><FormattedMessage id="admin.manage.clinic.no-data" /></p> :
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
              <button className="btn-edit" onClick={() => handleEdit(clinic)}><FormattedMessage id="admin.manage.clinic.btn-edit" /></button>
              <button className="btn-delete" onClick={() => handleDeleteClinic(clinic)}><FormattedMessage id="admin.manage.clinic.btn-delete" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ClinicManage;
