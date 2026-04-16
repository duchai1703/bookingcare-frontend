// src/containers/System/Admin/DoctorManage.jsx
// Hồ sơ bác sĩ (REQ-AM-006→010, REQ-AM-022)
// [Phase 9 Final] Full i18n — useIntl + FormattedMessage
import React, { useEffect, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { getAllUsers, getAllCode } from '../../../services/userService';
import { getDoctorDetail, saveInfoDoctor, deleteDoctorInfo } from '../../../services/doctorService';
import CommonUtils from '../../../utils/CommonUtils';
import { getAllSpecialty } from '../../../services/specialtyService';
import { getAllClinic } from '../../../services/clinicService';
import { confirmDelete, showSuccess, showError, showWarning } from '../../../utils/confirmDelete';
import ImageUploadInput from '../../../components/Common/ImageUploadInput';
import MarkdownEditorField from '../../../components/Common/MarkdownEditorField';
import { marked } from 'marked'; // GAP-01: render markdown → HTML trước khi gửi backend
import { Stethoscope, Save, Trash2, Loader2 } from 'lucide-react';
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
  const intl = useIntl();
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
    if (!selectedDoctorId) {
      showWarning(
        intl.formatMessage({ id: 'admin.manage.doctor.toast-no-doctor' }),
        intl.formatMessage({ id: 'admin.manage.doctor.toast-no-doctor-desc' })
      );
      return;
    }
    if (!doctorInfo.specialtyId || !doctorInfo.clinicId || !doctorInfo.priceId) {
      showWarning(
        intl.formatMessage({ id: 'admin.manage.doctor.toast-missing-info' }),
        intl.formatMessage({ id: 'admin.manage.doctor.toast-missing-info-desc' })
      );
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
      if (res.errCode === 0) {
        showSuccess(intl.formatMessage({ id: 'admin.manage.doctor.toast-save-success' }));
        setHasExistingInfo(true);
      } else showError(res.message || intl.formatMessage({ id: 'admin.manage.doctor.toast-save-error' }));
    } catch { showError(intl.formatMessage({ id: 'admin.manage.doctor.toast-server-error' })); }
    setIsSaving(false);
  };

  const handleDelete = async () => {
    const ok = await confirmDelete(
      intl.formatMessage({ id: 'admin.manage.doctor.toast-delete-confirm' }),
      intl.formatMessage({ id: 'admin.manage.doctor.toast-delete-confirm-desc' })
    );
    if (!ok) return;
    try {
      const res = await deleteDoctorInfo(selectedDoctorId);
      if (res.errCode === 0) {
        showSuccess(intl.formatMessage({ id: 'admin.manage.doctor.toast-delete-success' }));
        setDoctorInfo({ ...INIT_INFO, doctorId: selectedDoctorId });
        setHasExistingInfo(false);
      } else showError(res.message || intl.formatMessage({ id: 'admin.manage.doctor.toast-delete-error' }));
    } catch { showError(intl.formatMessage({ id: 'admin.manage.doctor.toast-server-error' })); }
  };

  return (
    <div className="doctor-manage">
      {/* ===== HEADER ===== */}
      <div className="tw-flex tw-items-center tw-justify-between tw-mb-6">
        <div className="tw-flex tw-items-center tw-gap-3">
          <div className="tw-w-10 tw-h-10 tw-rounded-xl tw-bg-primary/10 tw-flex tw-items-center tw-justify-center">
            <Stethoscope size={20} className="tw-text-primary" />
          </div>
          <h2 className="tw-text-xl tw-font-bold tw-text-text-main"><FormattedMessage id="admin.manage.doctor.title" /></h2>
        </div>
        {hasExistingInfo && <span className="tw-px-3 tw-py-1 tw-bg-emerald-100 tw-text-emerald-700 tw-rounded-full tw-text-xs tw-font-semibold"><FormattedMessage id="admin.manage.doctor.existing-badge" /></span>}
      </div>

      {/* Chọn bác sĩ */}
      <div className="tw-bg-white tw-rounded-2xl tw-shadow-card tw-p-6 tw-mb-5">
        <div>
          <label className="tw-block tw-text-sm tw-font-medium tw-text-text-main tw-mb-1.5"><FormattedMessage id="admin.manage.doctor.label-select-doctor" /> <span className="tw-text-danger">*</span></label>
          <select className="tw-w-full tw-px-3 tw-py-2.5 tw-border tw-border-gray-200 tw-rounded-xl tw-text-sm focus:tw-outline-none focus:tw-border-primary tw-bg-white tw-font-medium tw-transition-colors" value={selectedDoctorId} onChange={handleSelectDoctor}>
            <option value="">{intl.formatMessage({ id: 'admin.manage.doctor.select-default' })}</option>
            {doctorList.map((doc) => (
              <option key={doc.id} value={doc.id}>{doc.lastName} {doc.firstName} — {doc.email}</option>
            ))}
          </select>
          <small className="tw-text-xs tw-text-text-light tw-mt-1 tw-block"><FormattedMessage id="admin.manage.doctor.hint" /></small>
        </div>
      </div>

      {selectedDoctorId && (isLoading ? (
        <div className="tw-flex tw-items-center tw-justify-center tw-py-10 tw-text-text-sub tw-gap-2">
          <Loader2 size={18} className="tw-animate-spin" /> <FormattedMessage id="admin.manage.doctor.loading" />
        </div>
      ) : (
        <>
          {/* Thông tin chuyên môn */}
          <div className="tw-bg-white tw-rounded-2xl tw-shadow-card tw-p-6 tw-mb-5">
            <h4 className="tw-text-base tw-font-semibold tw-text-text-main tw-mb-4"><FormattedMessage id="admin.manage.doctor.card-subtitle" /></h4>
            <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 lg:tw-grid-cols-3 tw-gap-4">
              <div>
                <label className="tw-block tw-text-sm tw-font-medium tw-text-text-main tw-mb-1"><FormattedMessage id="admin.manage.doctor.label-specialty" /> <span className="tw-text-danger">*</span></label>
                <select name="specialtyId" value={doctorInfo.specialtyId} onChange={handleInput} className="tw-w-full tw-px-3 tw-py-2 tw-border tw-border-gray-200 tw-rounded-xl tw-text-sm tw-bg-white focus:tw-outline-none focus:tw-border-primary tw-transition-colors">
                  <option value="">{intl.formatMessage({ id: 'admin.manage.doctor.select-specialty' })}</option>
                  {specialties.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="tw-block tw-text-sm tw-font-medium tw-text-text-main tw-mb-1"><FormattedMessage id="admin.manage.doctor.label-clinic" /> <span className="tw-text-danger">*</span></label>
                <select name="clinicId" value={doctorInfo.clinicId} onChange={handleInput} className="tw-w-full tw-px-3 tw-py-2 tw-border tw-border-gray-200 tw-rounded-xl tw-text-sm tw-bg-white focus:tw-outline-none focus:tw-border-primary tw-transition-colors">
                  <option value="">{intl.formatMessage({ id: 'admin.manage.doctor.select-clinic' })}</option>
                  {clinics.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="tw-block tw-text-sm tw-font-medium tw-text-text-main tw-mb-1"><FormattedMessage id="admin.manage.doctor.label-price" /> <span className="tw-text-danger">*</span></label>
                <select name="priceId" value={doctorInfo.priceId} onChange={handleInput} className="tw-w-full tw-px-3 tw-py-2 tw-border tw-border-gray-200 tw-rounded-xl tw-text-sm tw-bg-white focus:tw-outline-none focus:tw-border-primary tw-transition-colors">
                  <option value="">{intl.formatMessage({ id: 'admin.manage.doctor.select-price' })}</option>
                  {prices.map((p) => <option key={p.keyMap} value={p.keyMap}>{p.valueVi}</option>)}
                </select>
              </div>
              <div>
                <label className="tw-block tw-text-sm tw-font-medium tw-text-text-main tw-mb-1"><FormattedMessage id="admin.manage.doctor.label-province" /></label>
                <select name="provinceId" value={doctorInfo.provinceId} onChange={handleInput} className="tw-w-full tw-px-3 tw-py-2 tw-border tw-border-gray-200 tw-rounded-xl tw-text-sm tw-bg-white focus:tw-outline-none focus:tw-border-primary tw-transition-colors">
                  <option value="">{intl.formatMessage({ id: 'admin.manage.doctor.select-province' })}</option>
                  {provinces.map((p) => <option key={p.keyMap} value={p.keyMap}>{p.valueVi}</option>)}
                </select>
              </div>
              <div>
                <label className="tw-block tw-text-sm tw-font-medium tw-text-text-main tw-mb-1"><FormattedMessage id="admin.manage.doctor.label-payment" /></label>
                <select name="paymentId" value={doctorInfo.paymentId} onChange={handleInput} className="tw-w-full tw-px-3 tw-py-2 tw-border tw-border-gray-200 tw-rounded-xl tw-text-sm tw-bg-white focus:tw-outline-none focus:tw-border-primary tw-transition-colors">
                  <option value="">{intl.formatMessage({ id: 'admin.manage.doctor.select-payment' })}</option>
                  {payments.map((p) => <option key={p.keyMap} value={p.keyMap}>{p.valueVi}</option>)}
                </select>
              </div>
              <div>
                <label className="tw-block tw-text-sm tw-font-medium tw-text-text-main tw-mb-1"><FormattedMessage id="admin.manage.doctor.label-position" /></label>
                <select name="positionId" value={doctorInfo.positionId} onChange={handleInput} className="tw-w-full tw-px-3 tw-py-2 tw-border tw-border-gray-200 tw-rounded-xl tw-text-sm tw-bg-white focus:tw-outline-none focus:tw-border-primary tw-transition-colors">
                  {positions.map((p) => <option key={p.keyMap} value={p.keyMap}>{p.valueVi}</option>)}
                </select>
              </div>
            </div>

            <div className="tw-mt-4">
              <label className="tw-block tw-text-sm tw-font-medium tw-text-text-main tw-mb-1"><FormattedMessage id="admin.manage.doctor.label-description" /></label>
              <textarea name="description" value={doctorInfo.description} onChange={handleInput} className="tw-w-full tw-px-3 tw-py-2 tw-border tw-border-gray-200 tw-rounded-xl tw-text-sm focus:tw-outline-none focus:tw-border-primary tw-resize-y tw-transition-colors" rows={3} placeholder={intl.formatMessage({ id: 'admin.manage.doctor.placeholder-description' })} />
            </div>
            <div className="tw-mt-3">
              <label className="tw-block tw-text-sm tw-font-medium tw-text-text-main tw-mb-1"><FormattedMessage id="admin.manage.doctor.label-note" /></label>
              <input type="text" name="note" value={doctorInfo.note} onChange={handleInput} className="tw-w-full tw-px-3 tw-py-2 tw-border tw-border-gray-200 tw-rounded-xl tw-text-sm focus:tw-outline-none focus:tw-border-primary tw-transition-colors" placeholder={intl.formatMessage({ id: 'admin.manage.doctor.placeholder-note' })} />
            </div>
            <div className="tw-mt-3">
              <label className="tw-block tw-text-sm tw-font-medium tw-text-text-main tw-mb-1"><FormattedMessage id="admin.manage.doctor.label-avatar" /></label>
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

          {/* Markdown editor */}
          <div className="tw-bg-white tw-rounded-2xl tw-shadow-card tw-p-6 tw-mb-5">
            <MarkdownEditorField
              value={doctorInfo.contentMarkdown}
              onChange={(val) => setDoctorInfo((prev) => ({ ...prev, contentMarkdown: val }))}
              height={420}
              label={intl.formatMessage({ id: 'admin.manage.doctor.label-markdown' })}
              placeholder={intl.formatMessage({ id: 'admin.manage.doctor.placeholder-markdown' })}
            />
          </div>

          {/* Actions */}
          <div className="tw-flex tw-gap-3 tw-mb-6">
            <button className="!tw-inline-flex !tw-items-center !tw-justify-center tw-gap-2 tw-px-6 tw-py-2.5 tw-bg-primary tw-text-white tw-rounded-xl tw-font-semibold tw-text-sm tw-border-0 tw-cursor-pointer hover:tw-bg-primary-dark tw-transition-colors disabled:tw-opacity-50 tw-shadow-sm" onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 size={16} className="tw-animate-spin !tw-inline-flex" /> : <Save size={16} className="!tw-inline-flex" />}
              <span className="!tw-leading-none"><FormattedMessage id={isSaving ? 'admin.manage.doctor.btn-saving' : 'admin.manage.doctor.btn-save'} /></span>
            </button>
            {hasExistingInfo && (
              <button className="!tw-inline-flex !tw-items-center !tw-justify-center tw-gap-2 tw-px-5 tw-py-2.5 tw-bg-white tw-text-red-500 tw-rounded-xl tw-font-medium tw-text-sm tw-border tw-border-red-200 tw-cursor-pointer hover:tw-bg-red-50 tw-transition-colors" onClick={handleDelete}>
                <Trash2 size={16} className="!tw-inline-flex" /> <span className="!tw-leading-none"><FormattedMessage id="admin.manage.doctor.btn-delete" /></span>
              </button>
            )}
          </div>
        </>
      ))}
    </div>
  );
};

export default DoctorManage;
