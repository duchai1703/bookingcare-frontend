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
import { Building2, Plus, Pencil, Trash2, MapPin } from 'lucide-react';
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
      {/* ===== HEADER ===== */}
      <div className="tw-flex tw-items-center tw-justify-between tw-mb-6">
        <div className="tw-flex tw-items-center tw-gap-3">
          <div className="tw-w-10 tw-h-10 tw-rounded-xl tw-bg-primary/10 tw-flex tw-items-center tw-justify-center">
            <Building2 size={20} className="tw-text-primary" />
          </div>
          <h2 className="tw-text-xl tw-font-bold tw-text-text-main"><FormattedMessage id="admin.manage.clinic.title" /></h2>
        </div>
        <button className="!tw-inline-flex !tw-items-center !tw-justify-center tw-gap-2 tw-px-5 tw-py-2.5 tw-bg-primary tw-text-white tw-rounded-full tw-font-semibold tw-text-sm tw-border-0 tw-cursor-pointer hover:tw-bg-primary-dark tw-transition-colors tw-shadow-sm" onClick={handleAddNew}>
          <Plus size={16} className="!tw-inline-flex" /> <span className="!tw-leading-none"><FormattedMessage id="admin.manage.clinic.btn-add" /></span>
        </button>
      </div>

      {showForm && (
        <div className="tw-bg-white tw-rounded-2xl tw-shadow-card tw-p-6 tw-mb-6">
          <h4 className="tw-text-lg tw-font-semibold tw-text-text-main tw-mb-4">
            <FormattedMessage id={isEditing ? 'admin.manage.clinic.form-title-edit' : 'admin.manage.clinic.form-title-add'} />
          </h4>
          <form onSubmit={handleSubmit}>
            <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 tw-gap-4 tw-mb-4">
              <div>
                <label className="tw-block tw-text-sm tw-font-medium tw-text-text-main tw-mb-1"><FormattedMessage id="admin.manage.clinic.label-name" /> <span className="tw-text-danger">*</span></label>
                <input type="text" name="name" value={formData.name} onChange={handleInput} className="tw-w-full tw-px-3 tw-py-2 tw-border tw-border-gray-200 tw-rounded-xl tw-text-sm focus:tw-outline-none focus:tw-border-primary tw-transition-colors" placeholder={intl.formatMessage({ id: 'admin.manage.clinic.placeholder-name' })} />
              </div>
              <div>
                <label className="tw-block tw-text-sm tw-font-medium tw-text-text-main tw-mb-1"><FormattedMessage id="admin.manage.clinic.label-address" /> <span className="tw-text-danger">*</span></label>
                <input type="text" name="address" value={formData.address} onChange={handleInput} className="tw-w-full tw-px-3 tw-py-2 tw-border tw-border-gray-200 tw-rounded-xl tw-text-sm focus:tw-outline-none focus:tw-border-primary tw-transition-colors" placeholder={intl.formatMessage({ id: 'admin.manage.clinic.placeholder-address' })} />
              </div>
            </div>
            <div className="tw-mb-4">
              <label className="tw-block tw-text-sm tw-font-medium tw-text-text-main tw-mb-1"><FormattedMessage id="admin.manage.clinic.label-image" /></label>
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
            <div className="tw-flex tw-gap-3 tw-justify-end tw-pt-4 tw-border-t tw-border-gray-100 tw-mt-4">
              <button type="submit" className="tw-flex tw-items-center tw-justify-center tw-gap-2 tw-px-5 tw-py-2 tw-bg-primary tw-text-white tw-rounded-xl tw-font-semibold tw-text-sm tw-border-0 tw-cursor-pointer hover:tw-bg-primary-dark tw-transition-colors"><FormattedMessage id="admin.manage.clinic.btn-save" /></button>
              <button type="button" className="tw-flex tw-items-center tw-justify-center tw-gap-2 tw-px-5 tw-py-2 tw-bg-gray-100 tw-text-text-sub tw-rounded-xl tw-font-medium tw-text-sm tw-border tw-border-gray-200 tw-cursor-pointer hover:tw-bg-gray-200 tw-transition-colors" onClick={() => setShowForm(false)}><FormattedMessage id="admin.manage.clinic.btn-cancel" /></button>
            </div>
          </form>
        </div>
      )}

      {/* ===== CLINIC LIST ===== */}
      <div className="tw-bg-white tw-rounded-2xl tw-shadow-card tw-overflow-hidden">
        {isLoading ? <p className="tw-text-center tw-py-8 tw-text-text-sub"><FormattedMessage id="admin.manage.clinic.loading" /></p> :
         clinics.length === 0 ? <p className="tw-text-center tw-py-12 tw-text-text-light"><FormattedMessage id="admin.manage.clinic.no-data" /></p> : (
          <div className="tw-divide-y tw-divide-gray-100">
            {clinics.map((clinic) => (
              <div key={clinic.id} className="tw-flex tw-items-center tw-gap-4 tw-px-5 tw-py-4 hover:tw-bg-gray-50/60 tw-transition-colors">
                <div className="tw-w-14 tw-h-14 tw-rounded-xl tw-overflow-hidden tw-flex-shrink-0 tw-bg-gray-100 tw-flex tw-items-center tw-justify-center">
                  {clinic.image && typeof clinic.image === 'string'
                    ? <img src={CommonUtils.decodeBase64Image(clinic.image)} alt={clinic.name} className="tw-w-full tw-h-full tw-object-cover" />
                    : <Building2 size={24} className="tw-text-gray-400" />
                  }
                </div>
                <div className="tw-flex-1 tw-min-w-0">
                  <h4 className="tw-font-semibold tw-text-text-main tw-text-sm">{clinic.name}</h4>
                  <p className="tw-text-xs tw-text-text-sub tw-mt-0.5 tw-flex tw-items-center tw-gap-1">
                    <MapPin size={12} className="tw-text-gray-400" /> {clinic.address}
                  </p>
                </div>
                <div className="tw-flex tw-items-center tw-gap-1 tw-flex-shrink-0">
                  <button className="tw-p-2 tw-rounded-lg tw-text-blue-500 hover:tw-bg-blue-50 tw-transition-colors tw-border-0 tw-bg-transparent tw-cursor-pointer" title={intl.formatMessage({ id: 'admin.manage.clinic.btn-edit' })} onClick={() => handleEdit(clinic)}>
                    <Pencil size={16} />
                  </button>
                  <button className="tw-p-2 tw-rounded-lg tw-text-red-400 hover:tw-bg-red-50 tw-transition-colors tw-border-0 tw-bg-transparent tw-cursor-pointer" title={intl.formatMessage({ id: 'admin.manage.clinic.btn-delete' })} onClick={() => handleDeleteClinic(clinic)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClinicManage;
