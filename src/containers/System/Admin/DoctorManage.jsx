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
      <div className="manage-header">
        <h2 className="manage-title"><FormattedMessage id="admin.manage.doctor.title" /></h2>
        {hasExistingInfo && <span className="existing-badge"><FormattedMessage id="admin.manage.doctor.existing-badge" /></span>}
      </div>

      {/* Chọn bác sĩ (REQ-AM-022 — chỉ R2) */}
      <div className="form-card">
        <div className="form-group">
          <label><FormattedMessage id="admin.manage.doctor.label-select-doctor" /> <span className="required">*</span></label>
          <select className="form-control select-lg" value={selectedDoctorId} onChange={handleSelectDoctor}>
            <option value="">{intl.formatMessage({ id: 'admin.manage.doctor.select-default' })}</option>
            {doctorList.map((doc) => (
              <option key={doc.id} value={doc.id}>{doc.lastName} {doc.firstName} — {doc.email}</option>
            ))}
          </select>
          <small className="hint"><FormattedMessage id="admin.manage.doctor.hint" /></small>
        </div>
      </div>

      {selectedDoctorId && (isLoading ? (
        <p className="loading-text"><FormattedMessage id="admin.manage.doctor.loading" /></p>
      ) : (
        <>
          {/* Thông tin chuyên môn */}
          <div className="form-card">
            <h4 className="card-subtitle"><FormattedMessage id="admin.manage.doctor.card-subtitle" /></h4>
            <div className="form-grid-3">
              <div className="form-group">
                <label><FormattedMessage id="admin.manage.doctor.label-specialty" /> <span className="required">*</span></label>
                <select name="specialtyId" value={doctorInfo.specialtyId} onChange={handleInput} className="form-control">
                  <option value="">{intl.formatMessage({ id: 'admin.manage.doctor.select-specialty' })}</option>
                  {specialties.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label><FormattedMessage id="admin.manage.doctor.label-clinic" /> <span className="required">*</span></label>
                <select name="clinicId" value={doctorInfo.clinicId} onChange={handleInput} className="form-control">
                  <option value="">{intl.formatMessage({ id: 'admin.manage.doctor.select-clinic' })}</option>
                  {clinics.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label><FormattedMessage id="admin.manage.doctor.label-price" /> <span className="required">*</span></label>
                <select name="priceId" value={doctorInfo.priceId} onChange={handleInput} className="form-control">
                  <option value="">{intl.formatMessage({ id: 'admin.manage.doctor.select-price' })}</option>
                  {prices.map((p) => <option key={p.keyMap} value={p.keyMap}>{p.valueVi}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label><FormattedMessage id="admin.manage.doctor.label-province" /></label>
                <select name="provinceId" value={doctorInfo.provinceId} onChange={handleInput} className="form-control">
                  <option value="">{intl.formatMessage({ id: 'admin.manage.doctor.select-province' })}</option>
                  {provinces.map((p) => <option key={p.keyMap} value={p.keyMap}>{p.valueVi}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label><FormattedMessage id="admin.manage.doctor.label-payment" /></label>
                <select name="paymentId" value={doctorInfo.paymentId} onChange={handleInput} className="form-control">
                  <option value="">{intl.formatMessage({ id: 'admin.manage.doctor.select-payment' })}</option>
                  {payments.map((p) => <option key={p.keyMap} value={p.keyMap}>{p.valueVi}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label><FormattedMessage id="admin.manage.doctor.label-position" /></label>
                <select name="positionId" value={doctorInfo.positionId} onChange={handleInput} className="form-control">
                  {positions.map((p) => <option key={p.keyMap} value={p.keyMap}>{p.valueVi}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group mt-12">
              <label><FormattedMessage id="admin.manage.doctor.label-description" /></label>
              <textarea name="description" value={doctorInfo.description} onChange={handleInput} className="form-control" rows={3} placeholder={intl.formatMessage({ id: 'admin.manage.doctor.placeholder-description' })} />
            </div>
            <div className="form-group">
              <label><FormattedMessage id="admin.manage.doctor.label-note" /></label>
              <input type="text" name="note" value={doctorInfo.note} onChange={handleInput} className="form-control" placeholder={intl.formatMessage({ id: 'admin.manage.doctor.placeholder-note' })} />
            </div>
            <div className="form-group">
              <label><FormattedMessage id="admin.manage.doctor.label-avatar" /></label>
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
              label={intl.formatMessage({ id: 'admin.manage.doctor.label-markdown' })}
              placeholder={intl.formatMessage({ id: 'admin.manage.doctor.placeholder-markdown' })}
            />
          </div>

          {/* Actions */}
          <div className="action-footer">
            <button className="btn-save" onClick={handleSave} disabled={isSaving}>
              <FormattedMessage id={isSaving ? 'admin.manage.doctor.btn-saving' : 'admin.manage.doctor.btn-save'} />
            </button>
            {hasExistingInfo && (
              <button className="btn-delete-outline" onClick={handleDelete}><FormattedMessage id="admin.manage.doctor.btn-delete" /></button>
            )}
          </div>
        </>
      ))}
    </div>
  );
};

export default DoctorManage;
