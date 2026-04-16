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
import { Microscope, Plus, Pencil, Trash2 } from 'lucide-react';
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
      {/* ===== HEADER ===== */}
      <div className="tw-flex tw-items-center tw-justify-between tw-mb-6">
        <div className="tw-flex tw-items-center tw-gap-3">
          <div className="tw-w-10 tw-h-10 tw-rounded-xl tw-bg-primary/10 tw-flex tw-items-center tw-justify-center">
            <Microscope size={20} className="tw-text-primary" />
          </div>
          <h2 className="tw-text-xl tw-font-bold tw-text-text-main"><FormattedMessage id="admin.manage.specialty.title" /></h2>
        </div>
        <button className="!tw-inline-flex !tw-items-center !tw-justify-center tw-gap-2 tw-px-5 tw-py-2.5 tw-bg-primary tw-text-white tw-rounded-full tw-font-semibold tw-text-sm tw-border-0 tw-cursor-pointer hover:tw-bg-primary-dark tw-transition-colors tw-shadow-sm" onClick={handleAddNew}>
          <Plus size={16} className="!tw-inline-flex" /> <span className="!tw-leading-none"><FormattedMessage id="admin.manage.specialty.btn-add" /></span>
        </button>
      </div>

      {showForm && (
        <div className="tw-bg-white tw-rounded-2xl tw-shadow-card tw-p-6 tw-mb-6">
          <h4 className="tw-text-lg tw-font-semibold tw-text-text-main tw-mb-4">
            <FormattedMessage id={isEditing ? 'admin.manage.specialty.form-title-edit' : 'admin.manage.specialty.form-title-add'} />
          </h4>
          <form onSubmit={handleSubmit}>
            <div className="tw-flex tw-gap-5 tw-items-start tw-mb-4">
              <div className="tw-flex-shrink-0">
                <label className="tw-block tw-text-xs tw-font-medium tw-text-text-sub tw-mb-1"><FormattedMessage id="admin.manage.specialty.label-image" /></label>
                <ImageUploadInput
                  previewUrl={formData.previewImgURL}
                  inputId="spec-img-upload"
                  shape="round"
                  onChange={({ base64, objectUrl }) => setFormData((prev) => ({ ...prev, previewImgURL: objectUrl, imageBase64: base64 }))}
                />
              </div>
              <div className="tw-flex-1">
                <label className="tw-block tw-text-sm tw-font-medium tw-text-text-main tw-mb-1"><FormattedMessage id="admin.manage.specialty.label-name" /> <span className="tw-text-danger">*</span></label>
                <input type="text" name="name" value={formData.name} onChange={handleInput} className="tw-w-full tw-px-3 tw-py-2 tw-border tw-border-gray-200 tw-rounded-xl tw-text-sm focus:tw-outline-none focus:tw-border-primary tw-transition-colors" placeholder={intl.formatMessage({ id: 'admin.manage.specialty.placeholder-name' })} />
              </div>
            </div>
            <MarkdownEditorField
              value={formData.descriptionMarkdown}
              onChange={(val) => setFormData((prev) => ({ ...prev, descriptionMarkdown: val }))}
              height={280}
              label={intl.formatMessage({ id: 'admin.manage.specialty.label-markdown' })}
            />
            <div className="tw-flex tw-gap-3 tw-justify-end tw-pt-4 tw-border-t tw-border-gray-100 tw-mt-4">
              <button type="submit" className="tw-flex tw-items-center tw-justify-center tw-gap-2 tw-px-5 tw-py-2 tw-bg-primary tw-text-white tw-rounded-xl tw-font-semibold tw-text-sm tw-border-0 tw-cursor-pointer hover:tw-bg-primary-dark tw-transition-colors"><FormattedMessage id="admin.manage.specialty.btn-save" /></button>
              <button type="button" className="tw-flex tw-items-center tw-justify-center tw-gap-2 tw-px-5 tw-py-2 tw-bg-gray-100 tw-text-text-sub tw-rounded-xl tw-font-medium tw-text-sm tw-border tw-border-gray-200 tw-cursor-pointer hover:tw-bg-gray-200 tw-transition-colors" onClick={() => setShowForm(false)}><FormattedMessage id="admin.manage.specialty.btn-cancel" /></button>
            </div>
          </form>
        </div>
      )}

      {/* ===== SPECIALTY GRID ===== */}
      <div className="tw-grid tw-grid-cols-2 md:tw-grid-cols-3 lg:tw-grid-cols-4 tw-gap-4">
        {isLoading ? <p className="tw-col-span-full tw-text-center tw-py-8 tw-text-text-sub"><FormattedMessage id="admin.manage.specialty.loading" /></p> :
         specialties.length === 0 ? <p className="tw-col-span-full tw-text-center tw-py-12 tw-text-text-light"><FormattedMessage id="admin.manage.specialty.no-data" /></p> :
         specialties.map((spec) => (
          <div key={spec.id} className="tw-bg-white tw-rounded-2xl tw-shadow-card tw-p-5 tw-text-center hover:tw-shadow-lg tw-transition-all tw-group">
            <div className="tw-w-16 tw-h-16 tw-rounded-full tw-overflow-hidden tw-mx-auto tw-mb-3 tw-bg-gray-100 tw-flex tw-items-center tw-justify-center">
              {spec.image && typeof spec.image === 'string'
                ? <img src={CommonUtils.decodeBase64Image(spec.image)} alt={spec.name} className="tw-w-full tw-h-full tw-object-cover" />
                : <Microscope size={24} className="tw-text-gray-400" />
              }
            </div>
            <h5 className="tw-font-semibold tw-text-text-main tw-text-sm tw-mb-3 tw-truncate">{spec.name}</h5>
            <div className="tw-flex tw-justify-center tw-gap-1 tw-opacity-0 group-hover:tw-opacity-100 tw-transition-opacity">
              <button className="tw-p-2 tw-rounded-lg tw-text-blue-500 hover:tw-bg-blue-50 tw-transition-colors tw-border-0 tw-bg-transparent tw-cursor-pointer" onClick={() => handleEdit(spec)} title={intl.formatMessage({ id: 'common.edit' })}>
                <Pencil size={15} />
              </button>
              <button className="tw-p-2 tw-rounded-lg tw-text-red-400 hover:tw-bg-red-50 tw-transition-colors tw-border-0 tw-bg-transparent tw-cursor-pointer" onClick={() => handleDeleteSpec(spec)} title={intl.formatMessage({ id: 'common.delete' })}>
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SpecialtyManage;
