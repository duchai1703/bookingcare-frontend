// src/containers/System/Doctor/EncounterWorkspace.jsx
// [Encounter Workspace] 3-Zone Clinical Workstation
// Phục vụ bác sĩ làm việc trong một phiên khám hoàn chỉnh:
// Zone 1: Patient Context & Lịch sử khám
// Zone 2: Clinical Workspace (Triệu chứng, Khám lâm sàng, Chẩn đoán, Kế hoạch, Upload nhiều tài liệu có phân loại, Đơn thuốc cấu trúc)
// Zone 3: Patient Records & Resources (Bộ lọc tài liệu, Lightbox Preview, Đơn thuốc, Follow-up Care)
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { QRCodeSVG } from 'qrcode.react';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  FileText,
  Upload,
  Plus,
  Trash2,
  Eye,
  Download,
  AlertCircle,
  Save,
  QrCode,
  Calendar,
  User,
  Phone,
  MapPin,
  Stethoscope,
  Activity,
  Pill,
  MessageSquare,
  Video,
  ExternalLink,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  X,
  Printer,
} from 'lucide-react';
import {
  getDoctorEncounter,
  saveDoctorEncounter,
  uploadEncounterAttachments,
  deleteEncounterAttachment,
} from '../../../services/doctorService';
import { getAllMedicines } from '../../../services/catalogService';
import './EncounterWorkspace.scss';

const DOCUMENT_CATEGORIES = [
  { key: 'xray', label: '🩻 X-quang / CĐHA', icon: '🩻' },
  { key: 'lab', label: '🧪 Xét nghiệm máu/sinh hóa', icon: '🧪' },
  { key: 'mri', label: '🧲 MRI / CT Scanner', icon: '🧲' },
  { key: 'record', label: '📄 Hồ sơ bệnh án / Tuyến trước', icon: '📄' },
  { key: 'prescription', label: '💊 Đơn thuốc ngoài / Giấy tờ khác', icon: '💊' },
];

const SUGGESTED_ICD10 = [
  { code: 'M17', name: 'Thoái hóa khớp gối (Gonarthrosis)' },
  { code: 'M25.5', name: 'Đau khớp không đặc hiệu' },
  { code: 'M54.5', name: 'Đau thắt lưng (Low back pain)' },
  { code: 'M50', name: 'Bệnh lý đĩa đệm cột sống cổ' },
  { code: 'M19', name: 'Viêm xương khớp khác' },
  { code: 'M75', name: 'Tổn thương vai (Viêm quanh khớp vai)' },
];

const EncounterWorkspace = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();

  // Encounter data
  const [encounter, setEncounter] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState('');
  const [isDirty, setIsDirty] = useState(false);

  // Medicines catalog
  const [medicineCatalog, setMedicineCatalog] = useState([]);

  // Clinical Form state
  const [form, setForm] = useState({
    chiefComplaint: '',
    symptoms: '',
    symptomOnset: '1-2 tuần',
    symptomSeverity: 'moderate', // 'mild' | 'moderate' | 'severe'
    clinicalNotes: '',
    diagnosis: '',
    treatmentPlan: '',
    careInstructions: '',
    followUpDate: '',
    noFollowUpNeeded: false,
    encounterStatus: 'in_progress',
  });

  // Medicines in prescription
  const [medicines, setMedicines] = useState([]);

  // Attachments in current encounter
  const [attachments, setAttachments] = useState([]);
  const [selectedRecordCategory, setSelectedRecordCategory] = useState('all');

  // Modals state
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState(null);
  const [viewHistoryItem, setViewHistoryItem] = useState(null);

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFiles, setUploadFiles] = useState([]);
  const [uploadCategory, setUploadCategory] = useState('xray');
  const [uploadExamDate, setUploadExamDate] = useState(new Date().toISOString().slice(0, 10));
  const [uploadNote, setUploadNote] = useState('');
  const [uploadSource, setUploadSource] = useState('DOCTOR');
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef(null);
  const autoSaveTimerRef = useRef(null);

  // 1. Fetch initial data
  const loadEncounterData = async () => {
    try {
      setIsLoading(true);
      const [resEncounter, resMedicines] = await Promise.all([
        getDoctorEncounter(bookingId),
        getAllMedicines({ isActive: true }).catch(() => ({ data: [] })),
      ]);

      if (resEncounter && resEncounter.errCode === 0 && resEncounter.data) {
        const d = resEncounter.data;
        setEncounter(d);
        setForm({
          chiefComplaint: d.chiefComplaint || d.reason || '',
          symptoms: d.symptoms || '',
          symptomOnset: 'Khoảng 1 - 2 tuần gần đây',
          symptomSeverity: 'moderate',
          clinicalNotes: d.clinicalNotes || '',
          diagnosis: d.diagnosis || '',
          treatmentPlan: d.treatmentPlan || '',
          careInstructions: d.careInstructions || '',
          followUpDate: d.followUpDate || '',
          noFollowUpNeeded: !d.followUpDate && d.statusId === 'S3',
          encounterStatus: d.encounterStatus || (d.statusId === 'S3' ? 'completed' : 'in_progress'),
        });

        // Map existing medicines
        if (d.bookingMedicines && Array.isArray(d.bookingMedicines)) {
          setMedicines(
            d.bookingMedicines.map((bm) => ({
              medicineId: bm.medicineId,
              name: bm.medicineData?.name || 'Thuốc',
              quantity: bm.quantity || 1,
              unit: bm.medicineData?.unit || 'Viên',
              dosage: bm.dosage || '',
              usageInstructions: bm.usageInstructions || '',
            }))
          );
        }

        // Attachments
        if (d.attachments && Array.isArray(d.attachments)) {
          setAttachments(d.attachments);
        }

        const now = new Date();
        setLastSavedTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
      } else {
        toast.error(resEncounter?.message || 'Không thể tải phiên khám.');
      }

      // Catalog
      const medList = Array.isArray(resMedicines?.data)
        ? resMedicines.data
        : (Array.isArray(resMedicines?.data?.data) ? resMedicines.data.data : []);
      setMedicineCatalog(medList);
    } catch (err) {
      console.error('Error loading encounter workspace:', err);
      toast.error('Lỗi khi tải dữ liệu phiên khám.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEncounterData();
  }, [bookingId]);

  // 2. Auto-save trigger
  const handlePerformSave = async (action = 'draft', showNotification = false) => {
    if (!encounter) return;
    try {
      setIsSaving(true);
      const payload = {
        action,
        chiefComplaint: form.chiefComplaint,
        symptoms: form.symptoms,
        clinicalNotes: form.clinicalNotes,
        diagnosis: form.diagnosis,
        treatmentPlan: form.treatmentPlan,
        careInstructions: form.careInstructions,
        followUpDate: form.noFollowUpNeeded ? '' : form.followUpDate,
        encounterStatus: action === 'complete' ? 'completed' : form.encounterStatus,
        medicines: medicines.map((m) => ({
          medicineId: m.medicineId,
          quantity: m.quantity,
          dosage: m.dosage,
          usageInstructions: m.usageInstructions,
        })),
      };

      const res = await saveDoctorEncounter(bookingId, payload);
      if (res && res.errCode === 0) {
        setIsDirty(false);
        const now = new Date();
        setLastSavedTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
        if (showNotification) {
          toast.success(action === 'complete' ? '🎉 Đã hoàn tất phiên khám!' : '✓ Đã lưu thông tin phiên khám.');
        }
        if (action === 'complete') {
          setForm((prev) => ({ ...prev, encounterStatus: 'completed' }));
          setEncounter((prev) => ({ ...prev, statusId: 'S3', encounterStatus: 'completed' }));
          setShowFinishModal(false);
        }
      } else if (showNotification) {
        toast.error(res?.message || 'Lỗi khi lưu.');
      }
    } catch (err) {
      console.error('Error saving encounter:', err);
      if (showNotification) toast.error('Không thể lưu phiên khám.');
    } finally {
      setIsSaving(false);
    }
  };

  // Debounced auto-save on change
  useEffect(() => {
    if (isDirty && encounter && form.encounterStatus !== 'completed') {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = setTimeout(() => {
        handlePerformSave('draft', false);
      }, 15000); // 15 seconds debounced
    }
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [form, medicines, isDirty]);

  const updateFormField = (field, val) => {
    setForm((prev) => ({ ...prev, [field]: val }));
    setIsDirty(true);
  };

  // 3. Medicines management
  const handleAddMedicine = () => {
    setMedicines((prev) => [
      ...prev,
      {
        medicineId: '',
        name: '',
        quantity: 1,
        unit: 'Viên',
        dosage: '1 viên x 2 lần/ngày',
        usageInstructions: 'Uống sau bữa ăn sáng và tối',
      },
    ]);
    setIsDirty(true);
  };

  const handleSelectMedicine = (index, medId) => {
    const found = medicineCatalog.find((m) => String(m.id) === String(medId));
    setMedicines((prev) => {
      const arr = [...prev];
      arr[index] = {
        ...arr[index],
        medicineId: medId,
        name: found?.name || '',
        unit: found?.unit || 'Viên',
      };
      return arr;
    });
    setIsDirty(true);
  };

  const handleUpdateMedicineField = (index, field, val) => {
    setMedicines((prev) => {
      const arr = [...prev];
      arr[index] = { ...arr[index], [field]: val };
      return arr;
    });
    setIsDirty(true);
  };

  const handleRemoveMedicine = (index) => {
    setMedicines((prev) => prev.filter((_, i) => i !== index));
    setIsDirty(true);
  };

  // 4. File attachments upload
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const readPromises = files.map((file) => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          resolve({
            fileName: file.name,
            fileType: file.type || 'image/jpeg',
            fileSize: file.size,
            fileData: event.target.result,
          });
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readPromises).then((loaded) => {
      setUploadFiles((prev) => [...prev, ...loaded]);
      setShowUploadModal(true);
    });
  };

  const handleConfirmUpload = async () => {
    if (!uploadFiles.length) {
      toast.warning('Vui lòng chọn ít nhất một tệp.');
      return;
    }

    try {
      setIsUploading(true);
      const prepared = uploadFiles.map((f) => ({
        ...f,
        category: uploadCategory,
        examinationDate: uploadExamDate,
        note: uploadNote,
        uploadedBy: uploadSource,
      }));

      const res = await uploadEncounterAttachments(bookingId, { attachments: prepared });
      if (res && res.errCode === 0) {
        toast.success(`Đã tải lên ${prepared.length} tài liệu thành công!`);
        setShowUploadModal(false);
        setUploadFiles([]);
        setUploadNote('');
        // Reload encounter attachments
        const refetched = await getDoctorEncounter(bookingId);
        if (refetched?.data?.attachments) {
          setAttachments(refetched.data.attachments);
        }
      } else {
        toast.error(res?.message || 'Lỗi khi tải tài liệu.');
      }
    } catch (err) {
      console.error('Error uploading attachments:', err);
      toast.error('Không thể tải tài liệu lên.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId) => {
    if (!window.confirm('Bạn có chắc chắn muốn gỡ bỏ tài liệu này khỏi hồ sơ ca khám?')) return;
    try {
      const res = await deleteEncounterAttachment(bookingId, attachmentId);
      if (res && res.errCode === 0) {
        toast.success('Đã gỡ bỏ tài liệu.');
        setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
        if (previewAttachment?.id === attachmentId) setPreviewAttachment(null);
      } else {
        toast.error(res?.message || 'Lỗi khi xóa.');
      }
    } catch (err) {
      toast.error('Lỗi kết nối khi xóa tài liệu.');
    }
  };

  // Filtered attachments for Zone 3
  const filteredAttachments = useMemo(() => {
    if (selectedRecordCategory === 'all') return attachments;
    return attachments.filter((a) => a.category === selectedRecordCategory);
  }, [attachments, selectedRecordCategory]);

  if (isLoading) {
    return (
      <div className="ew-loading-screen">
        <div className="ew-loading-spinner" />
        <h3>Đang khởi tạo Encounter Workspace...</h3>
        <p>Đang chuẩn bị hồ sơ bệnh nhân, tiền sử y khoa và công cụ phiên khám.</p>
      </div>
    );
  }

  if (!encounter) {
    return (
      <div className="ew-error-screen">
        <AlertCircle size={44} className="text-danger" />
        <h2>Không tìm thấy phiên khám</h2>
        <p>Lịch hẹn không tồn tại hoặc bác sĩ không có quyền thao tác trên ca khám này.</p>
        <button type="button" className="btn-return" onClick={() => navigate('/doctor-dashboard/manage-patient')}>
          Quay lại danh sách lịch hẹn
        </button>
      </div>
    );
  }

  const patientName = encounter.patientName || `${encounter.patientData?.lastName || ''} ${encounter.patientData?.firstName || ''}`.trim() || 'Bệnh nhân';
  const patientGender = encounter.patientGender === 'M' || encounter.patientData?.gender === 'M' ? 'Nam' : 'Nữ';
  const isCompleted = encounter.statusId === 'S3' || form.encounterStatus === 'completed';

  return (
    <div className="encounter-workspace">
      {/* ──────────────────────────────────────────────────────── */}
      {/* TOP WORKSPACE NAVIGATION BAR                             */}
      {/* ──────────────────────────────────────────────────────── */}
      <header className="ew-header">
        <div className="ew-header__left">
          <Link to="/doctor-dashboard/manage-patient" className="btn-back-nav" title="Quay lại danh sách lịch hẹn">
            <ArrowLeft size={18} />
            <span>Lịch khám</span>
          </Link>

          <div className="ew-header__divider" />

          <div className="ew-header__title-block">
            <div className="ew-header__encounter-code">
              <span className="code-pill">{encounter.bookingCode || `#BK-${encounter.id}`}</span>
              <span className={`status-pill ${isCompleted ? 'status-pill--completed' : 'status-pill--in-progress'}`}>
                {isCompleted ? '🟢 Đã hoàn tất' : '🟡 Đang khám'}
              </span>
              <span className="autosave-tag" title="Tự động lưu định kỳ">
                {isSaving ? '⏳ Đang lưu...' : `✓ Đã tự động lưu ${lastSavedTime}`}
              </span>
            </div>
            <h1 className="ew-header__patient-summary">
              {patientName} <span className="meta">· {encounter.patientAge || 35} tuổi · {patientGender} · {encounter.patientCode || `#PT-${encounter.patientId}`}</span>
            </h1>
          </div>
        </div>

        <div className="ew-header__right">
          <button
            type="button"
            className="btn-ew-action btn-ew-qr"
            onClick={() => setShowQrModal(true)}
            title="Mở mã QR tiếp nhận bệnh nhân"
          >
            <QrCode size={16} />
            <span>Xem mã QR</span>
          </button>

          <button
            type="button"
            className="btn-ew-action btn-ew-save"
            onClick={() => handlePerformSave('draft', true)}
            disabled={isSaving}
            title="Lưu bản nháp hiện tại"
          >
            <Save size={16} />
            <span>{isSaving ? 'Đang lưu...' : 'Lưu nháp'}</span>
          </button>

          {!isCompleted ? (
            <button
              type="button"
              className="btn-ew-action btn-ew-finish"
              onClick={() => setShowFinishModal(true)}
              title="Xem lại và kết thúc phiên khám bệnh"
            >
              <CheckCircle2 size={16} />
              <span>Hoàn tất phiên khám</span>
            </button>
          ) : (
            <div className="completed-badge">
              <ShieldCheck size={18} />
              <span>Phiên khám đã lưu trữ</span>
            </div>
          )}
        </div>
      </header>

      {/* ──────────────────────────────────────────────────────── */}
      {/* 3-ZONE CLINICAL LAYOUT                                   */}
      {/* ──────────────────────────────────────────────────────── */}
      <div className="ew-layout">
        {/* ══════════════════════════════════════════════════════ */}
        {/* ZONE 1: LEFT — PATIENT CONTEXT & VISIT HISTORY        */}
        {/* ══════════════════════════════════════════════════════ */}
        <aside className="ew-zone ew-zone--left">
          {/* Card: Patient Identity */}
          <div className="ew-card ew-card--patient">
            <div className="patient-avatar-wrap">
              <div className="patient-avatar-circle">
                {encounter.patientData?.image ? (
                  <img src={encounter.patientData.image} alt={patientName} />
                ) : (
                  <span>{patientName.slice(0, 2).toUpperCase()}</span>
                )}
              </div>
              <div className="patient-main-info">
                <h3>{patientName}</h3>
                <span className="patient-code-tag">{encounter.patientCode}</span>
              </div>
            </div>

            <div className="patient-meta-list">
              <div className="meta-row">
                <span className="meta-label">Tuổi & Giới tính:</span>
                <span className="meta-value">{encounter.patientAge} tuổi · {patientGender}</span>
              </div>
              <div className="meta-row">
                <span className="meta-label">Số điện thoại:</span>
                <a href={`tel:${encounter.patientPhoneNumber || encounter.patientData?.phoneNumber}`} className="meta-value link-phone">
                  <Phone size={13} />
                  <span>{encounter.patientPhoneNumber || encounter.patientData?.phoneNumber || 'Chưa có SĐT'}</span>
                </a>
              </div>
              <div className="meta-row">
                <span className="meta-label">Địa chỉ:</span>
                <span className="meta-value text-truncate" title={encounter.patientAddress || encounter.patientData?.address}>
                  {encounter.patientAddress || encounter.patientData?.address || 'TP. Hồ Chí Minh'}
                </span>
              </div>
            </div>
          </div>

          {/* Card: Current Encounter Info */}
          <div className="ew-card ew-card--encounter-meta">
            <div className="ew-card__header">
              <h4>Thông tin phiên khám</h4>
              <span className="badge-today">Hôm nay</span>
            </div>

            <div className="encounter-specs">
              <div className="spec-item">
                <Clock size={14} className="spec-icon" />
                <div>
                  <label>Khung giờ khám:</label>
                  <strong>{encounter.timeTypeBooking?.valueVi || '10:00 - 11:00'}</strong>
                </div>
              </div>

              <div className="spec-item">
                <Calendar size={14} className="spec-icon" />
                <div>
                  <label>Ngày khám:</label>
                  <strong>{encounter.date}</strong>
                </div>
              </div>

              <div className="spec-item">
                <Stethoscope size={14} className="spec-icon" />
                <div>
                  <label>Chuyên khoa & Bác sĩ:</label>
                  <span>{encounter.doctorBookingData?.doctorInfoData?.specialtyData?.name || 'Cơ xương khớp'}</span>
                </div>
              </div>

              <div className="spec-item">
                <MapPin size={14} className="spec-icon" />
                <div>
                  <label>Cơ sở tiếp nhận:</label>
                  <span>{encounter.doctorBookingData?.doctorInfoData?.clinicData?.name || 'Cơ sở BookingCare'}</span>
                </div>
              </div>
            </div>

            <div className="payment-status-box">
              <span className={`pill-pay ${encounter.paymentStatus === 'paid' ? 'paid' : 'unpaid'}`}>
                {encounter.paymentStatus === 'paid' ? '✓ Đã thanh toán trực tuyến' : '⏳ Thanh toán tại phòng khám'}
              </span>
            </div>
          </div>

          {/* Card: Patient Medical History Timeline */}
          <div className="ew-card ew-card--history">
            <div className="ew-card__header">
              <h4>Lịch sử khám bệnh</h4>
              <span className="history-count">{encounter.patientHistory?.length || 0} lần</span>
            </div>

            <div className="history-timeline">
              {/* Current visit marker */}
              <div className="history-node history-node--current">
                <div className="node-dot" />
                <div className="node-content">
                  <div className="node-date">
                    <strong>{encounter.date}</strong>
                    <span className="badge-active-now">Đang khám</span>
                  </div>
                  <p className="node-dx">{form.diagnosis || 'Phiên khám hiện tại'}</p>
                </div>
              </div>

              {/* Past visits */}
              {encounter.patientHistory && encounter.patientHistory.length > 0 ? (
                encounter.patientHistory.map((hist) => (
                  <div
                    key={hist.id}
                    className="history-node"
                    onClick={() => setViewHistoryItem(hist)}
                    title="Bấm để xem chi tiết ca khám cũ này"
                  >
                    <div className="node-dot" />
                    <div className="node-content">
                      <div className="node-date">
                        <span>{hist.date}</span>
                        {hist.attachmentsCount > 0 && (
                          <span className="node-att-badge">{hist.attachmentsCount} tài liệu</span>
                        )}
                      </div>
                      <p className="node-dx">{hist.diagnosis}</p>
                      <small className="node-doc">BS. {hist.doctorName}</small>
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-history-hint">
                  <em>Chưa có tiền sử khám hoàn thành nào trước đây tại hệ thống.</em>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* ══════════════════════════════════════════════════════ */}
        {/* ZONE 2: CENTER — CLINICAL WORKSPACE                  */}
        {/* ══════════════════════════════════════════════════════ */}
        <main className="ew-zone ew-zone--center">
          {/* Section 1: Chief Complaint */}
          <div className="clinical-section">
            <div className="section-title">
              <span className="num-pill">1</span>
              <h3>Lý do đến khám (Chief Complaint)</h3>
            </div>
            <div className="section-body">
              <input
                type="text"
                className="ew-input ew-input--lg"
                placeholder="VD: Bệnh nhân đau nhiều khớp gối phải khi leo cầu thang, có tiếng kêu lục cục..."
                value={form.chiefComplaint}
                onChange={(e) => updateFormField('chiefComplaint', e.target.value)}
              />
            </div>
          </div>

          {/* Section 2: Symptoms */}
          <div className="clinical-section">
            <div className="section-title">
              <span className="num-pill">2</span>
              <h3>Triệu chứng cơ năng bệnh nhân cung cấp</h3>
            </div>
            <div className="section-body">
              <textarea
                rows={3}
                className="ew-textarea"
                placeholder="Mô tả diễn biến triệu chứng bệnh nhân phản ánh, cơn đau âm ỉ hay nhói buốt..."
                value={form.symptoms}
                onChange={(e) => updateFormField('symptoms', e.target.value)}
              />

              <div className="symptom-meta-row">
                <div className="meta-col">
                  <label>Thời gian xuất hiện:</label>
                  <input
                    type="text"
                    className="ew-input ew-input--sm"
                    value={form.symptomOnset}
                    onChange={(e) => updateFormField('symptomOnset', e.target.value)}
                    placeholder="VD: 2 tuần gần đây"
                  />
                </div>

                <div className="meta-col">
                  <label>Mức độ khó chịu:</label>
                  <div className="severity-selector">
                    <button
                      type="button"
                      className={`btn-sev ${form.symptomSeverity === 'mild' ? 'btn-sev--active' : ''}`}
                      onClick={() => updateFormField('symptomSeverity', 'mild')}
                    >
                      Nhẹ
                    </button>
                    <button
                      type="button"
                      className={`btn-sev ${form.symptomSeverity === 'moderate' ? 'btn-sev--active' : ''}`}
                      onClick={() => updateFormField('symptomSeverity', 'moderate')}
                    >
                      Trung bình
                    </button>
                    <button
                      type="button"
                      className={`btn-sev ${form.symptomSeverity === 'severe' ? 'btn-sev--active' : ''}`}
                      onClick={() => updateFormField('symptomSeverity', 'severe')}
                    >
                      Dữ dội
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Clinical Examination */}
          <div className="clinical-section">
            <div className="section-title">
              <span className="num-pill">3</span>
              <h3>Khám lâm sàng & Dấu hiệu thực thể</h3>
            </div>
            <div className="section-body">
              <textarea
                rows={3}
                className="ew-textarea"
                placeholder="Kết quả quan sát, sờ nắn, gõ, nghe, tầm vận động khớp, các nghiệm pháp đặc hiệu..."
                value={form.clinicalNotes}
                onChange={(e) => updateFormField('clinicalNotes', e.target.value)}
              />
            </div>
          </div>

          {/* Section 4: Diagnosis */}
          <div className="clinical-section">
            <div className="section-title">
              <span className="num-pill">4</span>
              <h3>Chẩn đoán xác định & Phân loại ICD-10</h3>
            </div>
            <div className="section-body">
              <input
                type="text"
                className="ew-input ew-input--bold"
                placeholder="Nhập chẩn đoán kết luận..."
                value={form.diagnosis}
                onChange={(e) => updateFormField('diagnosis', e.target.value)}
              />

              <div className="icd-quick-chips">
                <span className="chip-label">Gợi ý nhanh ICD-10:</span>
                {SUGGESTED_ICD10.map((icd) => (
                  <button
                    key={icd.code}
                    type="button"
                    className="btn-icd-chip"
                    onClick={() => {
                      const newDx = form.diagnosis
                        ? `${form.diagnosis}, [${icd.code}] ${icd.name}`
                        : `[${icd.code}] ${icd.name}`;
                      updateFormField('diagnosis', newDx);
                    }}
                  >
                    <strong>[{icd.code}]</strong> {icd.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 5: Treatment Plan & Follow-up */}
          <div className="clinical-section">
            <div className="section-title">
              <span className="num-pill">5</span>
              <h3>Kế hoạch điều trị & Dặn dò chăm sóc</h3>
            </div>
            <div className="section-body">
              <textarea
                rows={3}
                className="ew-textarea"
                placeholder="Hướng xử trí điều trị, phương pháp can thiệp, bài tập vật lý trị liệu..."
                value={form.treatmentPlan}
                onChange={(e) => updateFormField('treatmentPlan', e.target.value)}
              />

              <div className="followup-box">
                <div className="followup-left">
                  <label>Ngày hẹn tái khám:</label>
                  <input
                    type="date"
                    className="ew-input ew-input--date"
                    disabled={form.noFollowUpNeeded}
                    value={form.followUpDate}
                    onChange={(e) => updateFormField('followUpDate', e.target.value)}
                  />
                </div>

                <div className="followup-right">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={form.noFollowUpNeeded}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        updateFormField('noFollowUpNeeded', checked);
                        if (checked) updateFormField('followUpDate', '');
                      }}
                    />
                    <span>Không yêu cầu tái khám trực tiếp</span>
                  </label>
                </div>
              </div>

              <div className="care-instruction-box">
                <label>Dặn dò chế độ dinh dưỡng & sinh hoạt tại nhà:</label>
                <input
                  type="text"
                  className="ew-input"
                  placeholder="VD: Nghỉ ngơi hạn chế leo cầu thang, chườm lạnh 15 phút mỗi tối..."
                  value={form.careInstructions}
                  onChange={(e) => updateFormField('careInstructions', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Section 6: Clinical Attachments (Upload Multi) */}
          <div className="clinical-section">
            <div className="section-title section-title--between">
              <div className="title-left">
                <span className="num-pill">6</span>
                <h3>Tài liệu y tế phiên khám ({attachments.length} tệp)</h3>
              </div>
              <button
                type="button"
                className="btn-upload-trigger"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={15} />
                <span>+ Đính kèm nhiều tài liệu (X-quang/Xét nghiệm)</span>
              </button>
            </div>

            <div className="section-body">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,application/pdf"
                style={{ display: 'none' }}
                onChange={handleFileSelect}
              />

              {attachments.length > 0 ? (
                <div className="attachments-grid">
                  {attachments.map((att) => (
                    <div key={att.id} className="attachment-card">
                      <div className="att-thumb-preview" onClick={() => setPreviewAttachment(att)}>
                        {att.fileType?.includes('pdf') ? (
                          <div className="pdf-thumb">
                            <FileText size={32} />
                            <span>PDF</span>
                          </div>
                        ) : (
                          <img src={att.fileData} alt={att.fileName} />
                        )}
                        <div className="att-hover-overlay">
                          <Eye size={18} />
                          <span>Xem nhanh</span>
                        </div>
                      </div>

                      <div className="att-info">
                        <div className="att-cat-tag">
                          {DOCUMENT_CATEGORIES.find((c) => c.key === att.category)?.label || '📄 Tài liệu'}
                        </div>
                        <h5 className="att-name" title={att.fileName}>{att.fileName}</h5>
                        <div className="att-meta">
                          <span>{att.uploadedBy === 'PATIENT' ? '👤 Bệnh nhân' : '👨‍⚕️ Bác sĩ'}</span>
                          <span>•</span>
                          <span>{att.examinationDate || '18/09/2026'}</span>
                        </div>
                        {att.note && <p className="att-note">"{att.note}"</p>}
                      </div>

                      <div className="att-actions">
                        <button
                          type="button"
                          className="btn-att-preview"
                          onClick={() => setPreviewAttachment(att)}
                          title="Xem phóng to tài liệu"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          type="button"
                          className="btn-att-delete"
                          onClick={() => handleDeleteAttachment(att.id)}
                          title="Gỡ bỏ tài liệu này"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  className="drag-drop-placeholder"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={32} className="drag-icon" />
                  <h4>Kéo thả phim X-quang, kết quả xét nghiệm vào đây</h4>
                  <p>Hỗ trợ định dạng hình ảnh (JPG, PNG, WEBP) và tài liệu PDF. Có thể chọn cùng lúc nhiều file.</p>
                  <button type="button" className="btn-choose-files">
                    Chọn nhiều file từ máy tính
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Section 7: Structured Prescription Module */}
          <div className="clinical-section">
            <div className="section-title section-title--between">
              <div className="title-left">
                <span className="num-pill">7</span>
                <h3>Đơn thuốc điện tử ({medicines.length} loại)</h3>
              </div>
              <button
                type="button"
                className="btn-add-med"
                onClick={handleAddMedicine}
              >
                <Plus size={15} />
                <span>+ Thêm thuốc</span>
              </button>
            </div>

            <div className="section-body">
              {medicines.length > 0 ? (
                <div className="prescription-table-wrap">
                  <table className="prescription-table">
                    <thead>
                      <tr>
                        <th style={{ width: '35%' }}>Tên thuốc & Hoạt chất</th>
                        <th style={{ width: '15%' }}>Số lượng</th>
                        <th style={{ width: '25%' }}>Liều dùng</th>
                        <th style={{ width: '20%' }}>Hướng dẫn sử dụng</th>
                        <th style={{ width: '5%' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {medicines.map((med, idx) => (
                        <tr key={idx}>
                          <td>
                            <select
                              className="ew-select"
                              value={med.medicineId}
                              onChange={(e) => handleSelectMedicine(idx, e.target.value)}
                            >
                              <option value="">-- Chọn thuốc từ danh mục --</option>
                              {medicineCatalog.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.name} {m.concentration ? `(${m.concentration})` : ''} - {m.unit}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <div className="quantity-box">
                              <input
                                type="number"
                                min={1}
                                className="ew-input ew-input--qty"
                                value={med.quantity}
                                onChange={(e) => handleUpdateMedicineField(idx, 'quantity', e.target.value)}
                              />
                              <span className="unit-label">{med.unit || 'Viên'}</span>
                            </div>
                          </td>
                          <td>
                            <input
                              type="text"
                              className="ew-input"
                              placeholder="VD: 1 viên x 2 lần/ngày"
                              value={med.dosage}
                              onChange={(e) => handleUpdateMedicineField(idx, 'dosage', e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              className="ew-input"
                              placeholder="VD: Uống sau ăn sáng - chiều"
                              value={med.usageInstructions}
                              onChange={(e) => handleUpdateMedicineField(idx, 'usageInstructions', e.target.value)}
                            />
                          </td>
                          <td className="text-center">
                            <button
                              type="button"
                              className="btn-del-med"
                              onClick={() => handleRemoveMedicine(idx)}
                              title="Xóa thuốc này"
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="no-medicine-box">
                  <Pill size={24} className="text-muted" />
                  <span>Chưa kê thuốc cho ca khám này. Nhấp <strong>"+ Thêm thuốc"</strong> để tạo đơn thuốc điện tử.</span>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* ══════════════════════════════════════════════════════ */}
        {/* ZONE 3: RIGHT — PATIENT RECORDS & RESOURCES          */}
        {/* ══════════════════════════════════════════════════════ */}
        <aside className="ew-zone ew-zone--right">
          {/* Card: Medical Attachments Filter & Gallery */}
          <div className="ew-card ew-card--records">
            <div className="ew-card__header">
              <h4>Hồ sơ & Tài liệu y tế</h4>
              <span className="record-total">{attachments.length} tệp</span>
            </div>

            <div className="record-filter-tabs">
              <button
                type="button"
                className={`filter-tab ${selectedRecordCategory === 'all' ? 'active' : ''}`}
                onClick={() => setSelectedRecordCategory('all')}
              >
                Tất cả
              </button>
              <button
                type="button"
                className={`filter-tab ${selectedRecordCategory === 'xray' ? 'active' : ''}`}
                onClick={() => setSelectedRecordCategory('xray')}
              >
                🩻 X-quang
              </button>
              <button
                type="button"
                className={`filter-tab ${selectedRecordCategory === 'lab' ? 'active' : ''}`}
                onClick={() => setSelectedRecordCategory('lab')}
              >
                🧪 Xét nghiệm
              </button>
              <button
                type="button"
                className={`filter-tab ${selectedRecordCategory === 'record' ? 'active' : ''}`}
                onClick={() => setSelectedRecordCategory('record')}
              >
                📄 Hồ sơ
              </button>
            </div>

            <div className="records-list">
              {filteredAttachments.length > 0 ? (
                filteredAttachments.map((item) => (
                  <div
                    key={item.id}
                    className="record-row"
                    onClick={() => setPreviewAttachment(item)}
                    title="Nhấp để phóng to xem ngay lập tức"
                  >
                    <div className="record-icon">
                      {item.category === 'xray' ? '🩻' : item.category === 'lab' ? '🧪' : item.category === 'mri' ? '🧲' : '📄'}
                    </div>
                    <div className="record-info">
                      <div className="record-name">{item.fileName}</div>
                      <div className="record-date">{item.examinationDate || '18/09/2026'} · {item.uploadedBy === 'PATIENT' ? 'Bệnh nhân' : 'Bác sĩ'}</div>
                    </div>
                    <button type="button" className="btn-quick-view">
                      <Eye size={13} />
                    </button>
                  </div>
                ))
              ) : (
                <div className="no-record-match">
                  <span>Không có tài liệu nào trong danh mục này.</span>
                </div>
              )}
            </div>
          </div>

          {/* Card: Active Prescription Summary */}
          <div className="ew-card ew-card--med-summary">
            <div className="ew-card__header">
              <h4>Đơn thuốc đã kê</h4>
              <span className="med-count">{medicines.length} thuốc</span>
            </div>

            {medicines.length > 0 ? (
              <div className="med-summary-list">
                {medicines.map((m, i) => (
                  <div key={i} className="med-summary-row">
                    <div className="med-bullet">•</div>
                    <div className="med-text">
                      <strong>{m.name || 'Thuốc'}</strong> — {m.quantity} {m.unit}
                      <div className="med-sub">{m.dosage}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-med-hint">Chưa có thuốc trong phiên khám.</div>
            )}
          </div>

          {/* Card: Follow-up Care Entitlements */}
          <div className="ew-card ew-card--followup">
            <div className="ew-card__header">
              <h4>Quyền lợi hỗ trợ sau khám</h4>
              <span className="badge-care">Follow-up</span>
            </div>

            <p className="followup-desc">
              Sau khi bác sĩ hoàn tất phiên khám, hệ thống tự động cấp quyền lợi chăm sóc kết nối cho người bệnh:
            </p>

            <div className="followup-items">
              <div className="followup-item">
                <div className="fu-icon"><MessageSquare size={16} /></div>
                <div className="fu-info">
                  <strong>Chat hỏi đáp kết quả:</strong>
                  <span>Thời hạn 7 ngày kể từ ngày khám</span>
                </div>
                <span className={`fu-status ${isCompleted ? 'active' : 'pending'}`}>
                  {isCompleted ? '✓ Khả dụng' : 'Chờ hoàn tất'}
                </span>
              </div>

              <div className="followup-item">
                <div className="fu-icon"><Video size={16} /></div>
                <div className="fu-info">
                  <strong>Video tái khám ngắn:</strong>
                  <span>1 lượt (15 phút) trong 7 ngày</span>
                </div>
                <span className={`fu-status ${isCompleted ? 'active' : 'pending'}`}>
                  {isCompleted ? '✓ Khả dụng' : 'Chờ hoàn tất'}
                </span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* ──────────────────────────────────────────────────────── */}
      {/* MODAL 1: FINISH ENCOUNTER CONFIRMATION                   */}
      {/* ──────────────────────────────────────────────────────── */}
      {showFinishModal && (
        <div className="ew-modal-backdrop" onClick={() => setShowFinishModal(false)}>
          <div className="ew-modal ew-modal--finish" onClick={(e) => e.stopPropagation()}>
            <div className="ew-modal__header">
              <div className="finish-title-row">
                <CheckCircle2 size={24} className="text-success" />
                <h3>Xác nhận hoàn tất phiên khám bệnh</h3>
              </div>
              <button type="button" className="btn-modal-close" onClick={() => setShowFinishModal(false)}>
                ✕
              </button>
            </div>

            <div className="ew-modal__body">
              <p className="finish-lead">
                Bạn chuẩn bị kết thúc phiên khám cho bệnh nhân <strong>{patientName}</strong> (#{encounter.bookingCode || encounter.id}). Vui lòng kiểm tra lại các thông tin đã ghi nhận:
              </p>

              <div className="finish-checklist">
                <div className="check-row">
                  <span className="icon">✓</span>
                  <div className="content">
                    <strong>Lý do khám & Triệu chứng:</strong> {form.chiefComplaint || 'Đã ghi nhận'}
                  </div>
                </div>
                <div className="check-row">
                  <span className="icon">✓</span>
                  <div className="content">
                    <strong>Chẩn đoán:</strong> {form.diagnosis || 'Chưa ghi chẩn đoán'}
                  </div>
                </div>
                <div className="check-row">
                  <span className="icon">✓</span>
                  <div className="content">
                    <strong>Kế hoạch điều trị:</strong> {form.treatmentPlan || 'Nghỉ ngơi và theo dõi'}
                  </div>
                </div>
                <div className="check-row">
                  <span className="icon">✓</span>
                  <div className="content">
                    <strong>Đơn thuốc điện tử:</strong> {medicines.length} loại thuốc được chỉ định
                  </div>
                </div>
                <div className="check-row">
                  <span className="icon">✓</span>
                  <div className="content">
                    <strong>Tài liệu y tế đính kèm:</strong> {attachments.length} tệp (X-quang, xét nghiệm)
                  </div>
                </div>
                <div className="check-row">
                  <span className="icon">✓</span>
                  <div className="content">
                    <strong>Chăm sóc sau khám:</strong> Kích hoạt Chat 7 ngày & Video 1x 15 phút
                  </div>
                </div>
              </div>

              <div className="finish-warning">
                <AlertCircle size={16} />
                <span>Sau khi bấm xác nhận, ca khám sẽ chuyển trạng thái "Đã khám xong (S3)" và lưu chính thức vào lịch sử bệnh án của bệnh nhân.</span>
              </div>
            </div>

            <div className="ew-modal__footer">
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => setShowFinishModal(false)}
                disabled={isSaving}
              >
                Quay lại bổ sung
              </button>
              <button
                type="button"
                className="btn-modal-confirm"
                onClick={() => handlePerformSave('complete', true)}
                disabled={isSaving}
              >
                {isSaving ? '⏳ Đang xử lý...' : '✓ Xác nhận hoàn tất phiên khám'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────── */}
      {/* MODAL 2: QR CODE MODAL                                   */}
      {/* ──────────────────────────────────────────────────────── */}
      {showQrModal && (
        <div className="ew-modal-backdrop" onClick={() => setShowQrModal(false)}>
          <div className="ew-modal ew-modal--qr" onClick={(e) => e.stopPropagation()}>
            <div className="ew-modal__header">
              <h3>Mã QR định danh lịch hẹn</h3>
              <button type="button" className="btn-modal-close" onClick={() => setShowQrModal(false)}>
                ✕
              </button>
            </div>

            <div className="ew-modal__body text-center">
              <div className="qr-container">
                <QRCodeSVG
                  value={encounter.qrToken || `BOOKINGCARE_${encounter.id}_${encounter.patientId}`}
                  size={200}
                  level="H"
                  includeMargin={true}
                />
              </div>
              <div className="qr-code-text">{encounter.bookingCode || `#BK-${encounter.id}`}</div>
              <div className="qr-patient-info">
                <strong>{patientName}</strong> • {encounter.patientAge} tuổi
              </div>
              <p className="qr-hint">
                Mã QR này được dùng để nhân viên y tế hoặc bác sĩ quét tiếp nhận ca khám nhanh chóng bằng máy quét chuyên dụng.
              </p>
            </div>

            <div className="ew-modal__footer">
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => window.print()}
              >
                <Printer size={15} /> In mã QR
              </button>
              <button
                type="button"
                className="btn-modal-primary"
                onClick={() => setShowQrModal(false)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────── */}
      {/* MODAL 3: UPLOAD ATTACHMENTS MODAL                        */}
      {/* ──────────────────────────────────────────────────────── */}
      {showUploadModal && (
        <div className="ew-modal-backdrop" onClick={() => setShowUploadModal(false)}>
          <div className="ew-modal ew-modal--upload" onClick={(e) => e.stopPropagation()}>
            <div className="ew-modal__header">
              <h3>Tải lên tài liệu y tế ({uploadFiles.length} tệp đã chọn)</h3>
              <button type="button" className="btn-modal-close" onClick={() => setShowUploadModal(false)}>
                ✕
              </button>
            </div>

            <div className="ew-modal__body">
              <div className="upload-meta-grid">
                <div className="upload-field">
                  <label>Phân loại tài liệu y tế *</label>
                  <select
                    className="ew-select"
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value)}
                  >
                    {DOCUMENT_CATEGORIES.map((cat) => (
                      <option key={cat.key} value={cat.key}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="upload-field">
                  <label>Ngày thực hiện / chụp chiếu</label>
                  <input
                    type="date"
                    className="ew-input"
                    value={uploadExamDate}
                    onChange={(e) => setUploadExamDate(e.target.value)}
                  />
                </div>

                <div className="upload-field">
                  <label>Nguồn cung cấp tài liệu</label>
                  <select
                    className="ew-select"
                    value={uploadSource}
                    onChange={(e) => setUploadSource(e.target.value)}
                  >
                    <option value="DOCTOR">👨‍⚕️ Bác sĩ / Cơ sở y tế thêm</option>
                    <option value="PATIENT">👤 Bệnh nhân tự nộp</option>
                  </select>
                </div>

                <div className="upload-field upload-field--full">
                  <label>Ghi chú lâm sàng cho tập tài liệu này</label>
                  <input
                    type="text"
                    className="ew-input"
                    placeholder="VD: Phim X-quang khớp gối tư thế đứng thẳng và nghiêng..."
                    value={uploadNote}
                    onChange={(e) => setUploadNote(e.target.value)}
                  />
                </div>
              </div>

              <div className="selected-files-list">
                <label>Danh sách tệp chuẩn bị lưu:</label>
                {uploadFiles.map((f, i) => (
                  <div key={i} className="selected-file-row">
                    <span className="file-name">{f.fileName}</span>
                    <span className="file-size">{(f.fileSize / 1024).toFixed(1)} KB</span>
                    <button
                      type="button"
                      className="btn-remove-selected"
                      onClick={() => setUploadFiles((prev) => prev.filter((_, idx) => idx !== i))}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="ew-modal__footer">
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => setShowUploadModal(false)}
                disabled={isUploading}
              >
                Hủy
              </button>
              <button
                type="button"
                className="btn-modal-confirm"
                onClick={handleConfirmUpload}
                disabled={isUploading}
              >
                {isUploading ? '⏳ Đang lưu...' : `Tải lên & Lưu ${uploadFiles.length} tệp`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────── */}
      {/* MODAL 4: INSTANT LIGHTBOX DOCUMENT PREVIEW               */}
      {/* ──────────────────────────────────────────────────────── */}
      {previewAttachment && (
        <div className="ew-modal-backdrop ew-lightbox" onClick={() => setPreviewAttachment(null)}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <div className="lightbox-header">
              <div className="lightbox-meta">
                <span className="lightbox-cat">
                  {DOCUMENT_CATEGORIES.find((c) => c.key === previewAttachment.category)?.label || 'Tài liệu'}
                </span>
                <h3>{previewAttachment.fileName}</h3>
                <span className="lightbox-sub">
                  Ngày: {previewAttachment.examinationDate || '18/09/2026'} • Nguồn: {previewAttachment.uploadedBy === 'PATIENT' ? 'Bệnh nhân cung cấp' : 'Bác sĩ thêm'}
                </span>
              </div>
              <button type="button" className="btn-lightbox-close" onClick={() => setPreviewAttachment(null)}>
                ✕
              </button>
            </div>

            <div className="lightbox-viewport">
              {previewAttachment.fileType?.includes('pdf') ? (
                <iframe
                  src={previewAttachment.fileData}
                  title={previewAttachment.fileName}
                  className="pdf-frame"
                />
              ) : (
                <img
                  src={previewAttachment.fileData}
                  alt={previewAttachment.fileName}
                  className="preview-image"
                />
              )}
            </div>

            {previewAttachment.note && (
              <div className="lightbox-footer">
                <strong>Ghi chú:</strong> {previewAttachment.note}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────── */}
      {/* MODAL 5: PAST VISIT HISTORY DETAIL                       */}
      {/* ──────────────────────────────────────────────────────── */}
      {viewHistoryItem && (
        <div className="ew-modal-backdrop" onClick={() => setViewHistoryItem(null)}>
          <div className="ew-modal ew-modal--history-detail" onClick={(e) => e.stopPropagation()}>
            <div className="ew-modal__header">
              <h3>Chi tiết ca khám cũ: Ngày {viewHistoryItem.date}</h3>
              <button type="button" className="btn-modal-close" onClick={() => setViewHistoryItem(null)}>
                ✕
              </button>
            </div>

            <div className="ew-modal__body">
              <div className="history-detail-grid">
                <div className="hd-item">
                  <label>Bác sĩ phụ trách:</label>
                  <span>BS. {viewHistoryItem.doctorName}</span>
                </div>
                <div className="hd-item">
                  <label>Khung giờ khám:</label>
                  <span>{viewHistoryItem.timeType}</span>
                </div>
                <div className="hd-item hd-item--full">
                  <label>Triệu chứng đã ghi nhận:</label>
                  <p>{viewHistoryItem.symptoms || 'Không có mô tả triệu chứng'}</p>
                </div>
                <div className="hd-item hd-item--full">
                  <label>Chẩn đoán kết luận:</label>
                  <strong className="text-primary">{viewHistoryItem.diagnosis}</strong>
                </div>
                {viewHistoryItem.clinicalNotes && (
                  <div className="hd-item hd-item--full">
                    <label>Ghi chú lâm sàng:</label>
                    <p>{viewHistoryItem.clinicalNotes}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="ew-modal__footer">
              <button type="button" className="btn-modal-primary" onClick={() => setViewHistoryItem(null)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EncounterWorkspace;
