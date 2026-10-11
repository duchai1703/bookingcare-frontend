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
  Zap,
  Copy,
  RotateCcw,
} from 'lucide-react';
import {
  getDoctorEncounter,
  saveDoctorEncounter,
  uploadEncounterAttachments,
  deleteEncounterAttachment,
  searchSymptomsApi,
  getEncounterContextSuggestionsApi,
} from '../../../services/doctorService';
import { getAllMedicines, createMedicine } from '../../../services/catalogService';
import SmartMedicalSearch from './SmartMedicalSearch';
import ClinicalSnippetToolbar from './ClinicalSnippetToolbar';
import SmartShorthandInput from './SmartShorthandInput';
import SmartShorthandTextarea from './SmartShorthandTextarea';
import './EncounterWorkspace.scss';

const DOCUMENT_CATEGORIES = [
  { key: 'xray', label: '🩻 X-quang / CĐHA', icon: '🩻' },
  { key: 'lab', label: '🧪 Xét nghiệm máu/sinh hóa', icon: '🧪' },
  { key: 'mri', label: '🧲 MRI / CT Scanner', icon: '🧲' },
  { key: 'record', label: '📄 Hồ sơ bệnh án / Tuyến trước', icon: '📄' },
  { key: 'prescription', label: '💊 Đơn thuốc ngoài / Giấy tờ khác', icon: '💊' },
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

  // Side reference panel tab state (30% panel on the right)
  const [sideActiveTab, setSideActiveTab] = useState('history'); // 'history' | 'records' | 'meds' | 'all'

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

  // Quick Add Medicine Modal State
  const [showQuickAddMedicineModal, setShowQuickAddMedicineModal] = useState(false);
  const [quickMedForm, setQuickMedForm] = useState({
    name: '',
    activeIngredient: '',
    concentration: '',
    unit: 'Viên',
    dosageForm: 'Viên nén',
  });
  const [isCreatingQuickMed, setIsCreatingQuickMed] = useState(false);

  const fileInputRef = useRef(null);
  const autoSaveTimerRef = useRef(null);

  // [Smart Clinical Assistant States & Refs]
  const icdSearchInputRef = useRef(null);
  const clinicalNotesTextareaRef = useRef(null);
  const treatmentPlanTextareaRef = useRef(null);
  const [symptomCatalog, setSymptomCatalog] = useState([]);
  const [activeIcdRecommendations, setActiveIcdRecommendations] = useState([]);

  // Tải danh mục triệu chứng lâm sàng
  useEffect(() => {
    const loadSymptoms = async () => {
      try {
        const res = await searchSymptomsApi({ limit: 12 });
        if (res && res.errCode === 0) {
          setSymptomCatalog(res.data || []);
        }
      } catch (err) {
        console.error('Lỗi tải danh mục triệu chứng:', err);
      }
    };
    loadSymptoms();
  }, []);

  // [Productivity Hotkeys] Ctrl+K (Tìm ICD) và Ctrl+S (Lưu nháp)
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        icdSearchInputRef.current?.focus();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handlePerformSave('draft', true);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [form, medicines, encounter]);

  // Chèn text tại con trỏ (Caret position) của textarea
  const insertTextAtField = (field, textToInsert, targetRef) => {
    const currentVal = form[field] || '';
    const el = targetRef?.current;
    if (el && typeof el.selectionStart === 'number') {
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const before = currentVal.substring(0, start);
      const after = currentVal.substring(end);
      const separator = before && !before.endsWith('\n') && !before.endsWith(' ') ? '\n' : '';
      const newVal = `${before}${separator}${textToInsert}${after}`;
      updateFormField(field, newVal);
      setTimeout(() => {
        el.focus();
        const nextPos = start + separator.length + textToInsert.length;
        el.setSelectionRange(nextPos, nextPos);
      }, 50);
    } else {
      const newVal = currentVal ? `${currentVal}\n${textToInsert}` : textToInsert;
      updateFormField(field, newVal);
    }
  };

  // Thêm chip triệu chứng nhanh và kích hoạt gợi ý ICD-10 liên quan
  const handleAddSymptomChip = (symp) => {
    const curSymptoms = (form.symptoms || '').trim();
    if (curSymptoms.toLowerCase().includes(symp.nameVi.toLowerCase())) {
      toast.info(`Triệu chứng "${symp.nameVi}" đã có trong diễn biến bệnh.`);
      return;
    }
    const nextSymptoms = curSymptoms ? `${curSymptoms}, ${symp.nameVi}` : symp.nameVi;
    updateFormField('symptoms', nextSymptoms);

    // Kích hoạt gợi ý ICD-10 tương ứng
    if (symp.suggestedIcdCodes) {
      const codes = symp.suggestedIcdCodes.split(',').map((c) => c.trim()).filter(Boolean);
      setActiveIcdRecommendations((prev) => Array.from(new Set([...prev, ...codes])));
    }
  };

  // Nút Hẹn tái khám nhanh (+1 tuần, +2 tuần, +1 tháng)
  const handleSetQuickFollowUp = (days) => {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + days);
    const yyyy = targetDate.getFullYear();
    const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
    const dd = String(targetDate.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    updateFormField('followUpDate', dateStr);
    updateFormField('noFollowUpNeeded', false);
    toast.success(`✓ Đã đặt hẹn tái khám vào ${dd}/${mm}/${yyyy}`, { autoClose: 1800 });
  };

  // Kế thừa chẩn đoán từ ca khám cũ trong lịch sử
  const handleInheritDiagnosis = (pastDiagnosis) => {
    if (!pastDiagnosis) return;
    if (form.diagnosis) {
      if (window.confirm('Bạn muốn GHI ĐÈ chẩn đoán cũ vào ca hiện tại?\n- Bấm OK để GHI ĐÈ\n- Bấm Cancel để NỐI TIẾP')) {
        updateFormField('diagnosis', pastDiagnosis);
      } else {
        updateFormField('diagnosis', `${form.diagnosis}; ${pastDiagnosis}`);
      }
    } else {
      updateFormField('diagnosis', pastDiagnosis);
    }
    toast.success('📋 Đã kế thừa chẩn đoán từ ca khám trước!');
  };

  // Kế thừa danh mục thuốc từ ca khám cũ
  const handleInheritMedicines = (pastMedicines) => {
    if (!pastMedicines || !Array.isArray(pastMedicines) || pastMedicines.length === 0) {
      toast.info('Ca khám này không có thông tin đơn thuốc.');
      return;
    }
    const cloned = pastMedicines.map((m) => ({
      medicineId: m.medicineId,
      name: m.medicineData?.name || m.name || 'Thuốc',
      quantity: m.quantity || 1,
      unit: m.medicineData?.unit || m.unit || 'Viên',
      dosage: m.dosage || '1 viên x 2 lần/ngày',
      usageInstructions: m.usageInstructions || 'Uống sau ăn',
    }));
    setMedicines(cloned);
    setIsDirty(true);
    toast.success(`💊 Đã sao chép ${cloned.length} loại thuốc từ ca trước!`);
  };

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

  const handleSaveQuickMedicine = async (e) => {
    if (e) e.preventDefault();
    if (!quickMedForm.name.trim()) {
      toast.warning('Vui lòng nhập tên thuốc!');
      return;
    }
    try {
      setIsCreatingQuickMed(true);
      const res = await createMedicine({
        name: quickMedForm.name.trim(),
        activeIngredient: quickMedForm.activeIngredient.trim(),
        concentration: quickMedForm.concentration.trim(),
        unit: quickMedForm.unit || 'Viên',
        dosageForm: quickMedForm.dosageForm || 'Viên nén',
        isActive: true,
      });

      if (res && (res.errCode === 0 || res.status === 201) && (res.data || res.medicine)) {
        const newMed = res.data || res.medicine;
        toast.success(`🎉 Đã thêm thuốc "${newMed.name}" vào danh mục thành công!`);

        // Cập nhật danh mục thuốc của phiên khám
        setMedicineCatalog((prev) => [newMed, ...prev]);

        // Tự động thêm ngay 1 dòng đơn thuốc mới dùng thuốc vừa tạo
        setMedicines((prev) => [
          ...prev,
          {
            medicineId: newMed.id,
            name: newMed.name,
            quantity: 1,
            unit: newMed.unit || 'Viên',
            dosage: '1 viên x 2 lần/ngày',
            usageInstructions: 'Uống sau bữa ăn sáng và tối',
          },
        ]);
        setIsDirty(true);

        // Đóng modal & reset form
        setShowQuickAddMedicineModal(false);
        setQuickMedForm({
          name: '',
          activeIngredient: '',
          concentration: '',
          unit: 'Viên',
          dosageForm: 'Viên nén',
        });
      } else {
        toast.error(res?.message || 'Không thể tạo thuốc mới.');
      }
    } catch (err) {
      console.error('Error creating medicine quickly:', err);
      toast.error('Lỗi kết nối khi thêm thuốc mới vào danh mục.');
    } finally {
      setIsCreatingQuickMed(false);
    }
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

  const patientName = encounter.effectivePatientName || encounter.patientName || `${encounter.patientData?.lastName || ''} ${encounter.patientData?.firstName || ''}`.trim() || 'Bệnh nhân';

  // Chuẩn hóa giới tính: hỗ trợ G1/G2, M/F, MALE/FEMALE, và ưu tiên người thân
  const rawGender = encounter.bookingFor === 'FAMILY' && encounter.familyMemberData?.gender
    ? encounter.familyMemberData.gender
    : (encounter.patientGenderVi || encounter.patientGender || encounter.patientData?.gender || '');

  const patientGender = (rawGender === 'G1' || rawGender === 'M' || rawGender === 'MALE' || rawGender === 'Nam')
    ? 'Nam'
    : (rawGender === 'G2' || rawGender === 'F' || rawGender === 'FEMALE' || rawGender === 'Nữ')
    ? 'Nữ'
    : (encounter.patientGenderVi || 'Chưa cập nhật');

  const patientAgeDisplay = encounter.patientAge ? `${encounter.patientAge} tuổi` : 'Chưa cập nhật tuổi';
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
              {patientName} <span className="meta">· {patientAgeDisplay} · {patientGender} {encounter.bookingFor === 'FAMILY' ? `· 👨‍👩‍👧 ${encounter.relationship === 'CHILD' ? 'Con cái' : encounter.relationship === 'PARENT' ? 'Bố/Mẹ' : encounter.relationship === 'SPOUSE' ? 'Vợ/Chồng' : 'Người thân'}` : ''} · {encounter.patientCode || `#PT-${encounter.patientId}`}</span>
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
      {/* 2-ZONE CLINICAL LAYOUT (70% Nhập liệu bên Trái : 30% Tham khảo bên Phải) */}
      {/* ──────────────────────────────────────────────────────── */}
      <div className="ew-layout">
        {/* ══════════════════════════════════════════════════════ */}
        {/* KHỐI 70% (BÊN TRÁI): KHU VỰC NHẬP LIỆU LÂM SÀNG TRUNG TÂM */}
        {/* ══════════════════════════════════════════════════════ */}
        <main className="ew-zone ew-zone--main ew-zone--center">
          {/* Section 1: Chief Complaint */}
          <div className="clinical-section">
            <div className="section-title">
              <span className="num-pill">1</span>
              <h3>Lý do đến khám (Chief Complaint)</h3>
            </div>
            <div className="section-body">
              <SmartShorthandInput
                className="ew-input--lg"
                targetField="chiefComplaint"
                doctorId={encounter?.doctorId}
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
              {/* Gợi ý triệu chứng nhanh */}
              {symptomCatalog.length > 0 && (
                <div className="symptom-quick-chips">
                  <span className="chip-label">Gợi ý triệu chứng nhanh:</span>
                  <div className="chips-wrap">
                    {symptomCatalog.map((symp) => (
                      <button
                        key={symp.id}
                        type="button"
                        className="btn-symp-chip"
                        onClick={() => handleAddSymptomChip(symp)}
                        title={`Thêm triệu chứng "${symp.nameVi}"`}
                      >
                        + {symp.nameVi}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <SmartShorthandTextarea
                rows={3}
                targetField="symptoms"
                doctorId={encounter?.doctorId}
                placeholder="Mô tả diễn biến triệu chứng bệnh nhân phản ánh, cơn đau âm ỉ hay nhói buốt... (Gõ vài ký tự để bung từ viết tắt)"
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
            <div className="section-title section-title--between">
              <div className="title-left">
                <span className="num-pill">3</span>
                <h3>Khám lâm sàng & Dấu hiệu thực thể</h3>
              </div>
              <ClinicalSnippetToolbar
                doctorId={encounter?.doctorId}
                section="clinicalNotes"
                targetFieldLabel="khám thực thể"
                onInsertText={(text) => insertTextAtField('clinicalNotes', text, clinicalNotesTextareaRef)}
              />
            </div>
            <div className="section-body">
              <SmartShorthandTextarea
                textareaRef={clinicalNotesTextareaRef}
                rows={3}
                targetField="clinicalNotes"
                doctorId={encounter?.doctorId}
                placeholder="Kết quả quan sát, sờ nắn, gõ, nghe, tầm vận động khớp, các nghiệm pháp đặc hiệu... (Gõ các từ viết tắt như ktp, kkg, kcs để bung nội dung)"
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
              {/* Bộ tìm kiếm y khoa thông minh ICD-10 */}
              <SmartMedicalSearch
                value={form.diagnosis}
                onChange={(newVal) => updateFormField('diagnosis', newVal)}
                doctorId={encounter?.doctorId}
                specialtyId={encounter?.doctorBookingData?.doctorInfoData?.specialtyId}
                inputRef={icdSearchInputRef}
              />

              {/* Các gợi ý ICD-10 liên kết từ triệu chứng được chọn */}
              {activeIcdRecommendations.length > 0 && (
                <div className="linked-icd-suggestions">
                  <span className="linked-label">Mã ICD-10 gợi ý từ triệu chứng:</span>
                  <div className="linked-chips">
                    {activeIcdRecommendations.map((code) => {
                      const isAdded = (form.diagnosis || '').includes(`[${code}]`);
                      return (
                        <button
                          key={code}
                          type="button"
                          className={`btn-linked-icd ${isAdded ? 'btn-linked-icd--added' : ''}`}
                          onClick={() => {
                            if (!isAdded) {
                              const nextVal = form.diagnosis ? `${form.diagnosis}; [${code}]` : `[${code}]`;
                              updateFormField('diagnosis', nextVal);
                            }
                          }}
                        >
                          <strong>[{code}]</strong> {isAdded ? '✓ Đã thêm' : '+ Chèn'}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div style={{ marginTop: '8px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#64748b', marginBottom: '4px', fontWeight: 600 }}>
                  Chuỗi chẩn đoán kết luận hoàn chỉnh (có thể gõ bổ sung văn bản tự do):
                </label>
                <SmartShorthandInput
                  className="ew-input--bold"
                  targetField="diagnosis"
                  doctorId={encounter?.doctorId}
                  placeholder="Nhập chẩn đoán kết luận... (Gõ tha, vkdt, thkg...)"
                  value={form.diagnosis}
                  onChange={(e) => updateFormField('diagnosis', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Section 5: Treatment Plan & Follow-up */}
          <div className="clinical-section">
            <div className="section-title section-title--between">
              <div className="title-left">
                <span className="num-pill">5</span>
                <h3>Kế hoạch điều trị & Dặn dò chăm sóc</h3>
              </div>
              <ClinicalSnippetToolbar
                doctorId={encounter?.doctorId}
                section="treatmentPlan"
                targetFieldLabel="kế hoạch điều trị"
                onInsertText={(text) => insertTextAtField('treatmentPlan', text, treatmentPlanTextareaRef)}
              />
            </div>
            <div className="section-body">
              <SmartShorthandTextarea
                textareaRef={treatmentPlanTextareaRef}
                rows={3}
                targetField="treatmentPlan"
                doctorId={encounter?.doctorId}
                placeholder="Hướng xử trí điều trị, phương pháp can thiệp, bài tập vật lý trị liệu... (Gõ vltt để bung mẫu)"
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

                  {/* Bộ nút Ngày tái khám nhanh */}
                  <div className="quick-followup-buttons">
                    <button
                      type="button"
                      className="btn-quick-followup"
                      disabled={form.noFollowUpNeeded}
                      onClick={() => handleSetQuickFollowUp(7)}
                      title="Hẹn tái khám sau 1 tuần"
                    >
                      +1 tuần
                    </button>
                    <button
                      type="button"
                      className="btn-quick-followup"
                      disabled={form.noFollowUpNeeded}
                      onClick={() => handleSetQuickFollowUp(14)}
                      title="Hẹn tái khám sau 2 tuần"
                    >
                      +2 tuần
                    </button>
                    <button
                      type="button"
                      className="btn-quick-followup"
                      disabled={form.noFollowUpNeeded}
                      onClick={() => handleSetQuickFollowUp(30)}
                      title="Hẹn tái khám sau 1 tháng"
                    >
                      +1 tháng
                    </button>
                  </div>
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
                <SmartShorthandInput
                  targetField="careInstructions"
                  doctorId={encounter?.doctorId}
                  placeholder="VD: Nghỉ ngơi hạn chế leo cầu thang (Gõ kcl, ankn, tk1w, tk2w...)"
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
              <div className="title-actions" style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn-quick-new-med"
                  style={{
                    background: '#ecfdf5',
                    color: '#059669',
                    border: '1px solid #a7f3d0',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onClick={() => setShowQuickAddMedicineModal(true)}
                  title="Thêm thuốc mới vào danh mục dược y tế"
                >
                  <Plus size={15} />
                  <span>+ Thêm thuốc mới vào danh mục</span>
                </button>
                <button
                  type="button"
                  className="btn-add-med"
                  onClick={handleAddMedicine}
                >
                  <Plus size={15} />
                  <span>+ Thêm dòng thuốc</span>
                </button>
              </div>
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
                            <SmartShorthandInput
                              targetField="medicineUsage"
                              doctorId={encounter?.doctorId}
                              placeholder="VD: 1 viên x 2 lần/ngày"
                              value={med.dosage}
                              onChange={(e) => handleUpdateMedicineField(idx, 'dosage', e.target.value)}
                            />
                          </td>
                          <td>
                            <SmartShorthandInput
                              targetField="medicineUsage"
                              doctorId={encounter?.doctorId}
                              placeholder="VD: Uống sau ăn (Gõ u2v, u1v...)"
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
        {/* KHỐI 30% (BÊN PHẢI): TOÀN BỘ CÁC PHẦN THAM KHẢO & HỒ SƠ */}
        {/* ══════════════════════════════════════════════════════ */}
        <aside className="ew-zone ew-zone--side ew-zone--right">
          {/* 1. Card: Patient Identity */}
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
              {encounter.bookingFor === 'FAMILY' && (
                <div className="meta-row" style={{ background: '#f0fdfa', padding: '6px 8px', borderRadius: '6px', border: '1px solid #ccfbf1' }}>
                  <span className="meta-label" style={{ color: '#0f766e', fontWeight: 700 }}>Đối tượng khám:</span>
                  <span className="meta-value" style={{ color: '#0d9488', fontWeight: 700 }}>
                    👨‍👩‍👧 {encounter.relationship === 'CHILD' ? 'Con cái' : encounter.relationship === 'PARENT' ? 'Bố/Mẹ' : encounter.relationship === 'SPOUSE' ? 'Vợ/Chồng' : 'Người thân'}
                  </span>
                </div>
              )}
              <div className="meta-row">
                <span className="meta-label">Tuổi & Giới tính:</span>
                <span className="meta-value">{patientAgeDisplay} · {patientGender}</span>
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

              {encounter.bookingFor === 'FAMILY' && encounter.patientData && (
                <div className="meta-row" style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #e2e8f0' }}>
                  <span className="meta-label" style={{ color: '#64748b' }}>Người giám hộ:</span>
                  <span className="meta-value" style={{ fontWeight: 600, color: '#334155' }}>
                    {encounter.patientData.lastName} {encounter.patientData.firstName} {encounter.patientData.phoneNumber ? `(${encounter.patientData.phoneNumber})` : ''}
                  </span>
                </div>
              )}
            </div>

            {/* Cảnh báo tiền sử dị ứng / bệnh lý của người thân */}
            {encounter.familyMemberData?.medicalHistory && (
              <div style={{ marginTop: '12px', background: '#fff1f2', border: '1px solid #ffe4e6', borderRadius: '8px', padding: '8px 10px', fontSize: '0.8rem', color: '#be123c' }}>
                <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px', color: '#e11d48' }}>
                  <AlertCircle size={14} /> Tiền sử bệnh & Dị ứng:
                </div>
                <div>{encounter.familyMemberData.medicalHistory}</div>
              </div>
            )}
          </div>

          {/* 2. Card: Current Encounter Info */}
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

          {/* 3. Thanh điều hướng Tab tra cứu 30% */}
          <div className="ew-side-nav-tabs">
            <button
              type="button"
              className={`side-nav-tab ${sideActiveTab === 'history' ? 'active' : ''}`}
              onClick={() => setSideActiveTab('history')}
              title="Xem lịch sử các lần khám trước"
            >
              <Clock size={13} />
              <span>Lịch sử khám</span>
              <span className="tab-badge">{encounter.patientHistory?.length || 0}</span>
            </button>

            <button
              type="button"
              className={`side-nav-tab ${sideActiveTab === 'records' ? 'active' : ''}`}
              onClick={() => setSideActiveTab('records')}
              title="Xem ảnh X-quang, Xét nghiệm, Hồ sơ"
            >
              <FileText size={13} />
              <span>Tài liệu CLS</span>
              <span className="tab-badge">{attachments?.length || 0}</span>
            </button>

            <button
              type="button"
              className={`side-nav-tab ${sideActiveTab === 'meds' ? 'active' : ''}`}
              onClick={() => setSideActiveTab('meds')}
              title="Xem tóm tắt đơn thuốc & quyền lợi"
            >
              <Pill size={13} />
              <span>Đơn thuốc & Hỗ trợ</span>
              <span className="tab-badge">{medicines?.length || 0}</span>
            </button>

            <button
              type="button"
              className={`side-nav-tab ${sideActiveTab === 'all' ? 'active' : ''}`}
              onClick={() => setSideActiveTab('all')}
              title="Cuộn xem tất cả"
            >
              <span>Tất cả</span>
            </button>
          </div>

          {/* 4. Khối Tab: Lịch sử khám bệnh */}
          {(sideActiveTab === 'history' || sideActiveTab === 'all') && (
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

                        {/* Quick Inherit Bar */}
                        <div className="node-inherit-actions" onClick={(e) => e.stopPropagation()}>
                          {hist.diagnosis && (
                            <button
                              type="button"
                              className="btn-inherit-dx"
                              onClick={() => handleInheritDiagnosis(hist.diagnosis)}
                              title="Kế thừa chẩn đoán này vào ca hiện tại"
                            >
                              <Copy size={11} /> Kế thừa CĐ
                            </button>
                          )}
                          {(hist.bookingMedicines?.length > 0 || hist.medicines?.length > 0) && (
                            <button
                              type="button"
                              className="btn-inherit-rx"
                              onClick={() => handleInheritMedicines(hist.bookingMedicines || hist.medicines)}
                              title="Sao chép đơn thuốc từ ca khám này"
                            >
                              <Pill size={11} /> Đơn thuốc
                            </button>
                          )}
                        </div>
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
          )}

          {/* 5. Khối Tab: Hồ sơ & Tài liệu y tế */}
          {(sideActiveTab === 'records' || sideActiveTab === 'all') && (
            <div className="ew-card ew-card--records">
              <div className="ew-card__header">
                <h4>Hồ sơ & Tài liệu y tế</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    className="btn-action-upload"
                    onClick={() => setShowUploadModal(true)}
                    style={{
                      background: '#2563eb',
                      color: '#ffffff',
                      border: 'none',
                      padding: '3px 8px',
                      borderRadius: '5px',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Upload size={11} /> Tải lên
                  </button>
                  <span className="record-total">{attachments.length} tệp</span>
                </div>
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
          )}

          {/* 6. Khối Tab: Đơn thuốc đã kê & Quyền lợi hỗ trợ sau khám */}
          {(sideActiveTab === 'meds' || sideActiveTab === 'all') && (
            <>
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
            </>
          )}
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

      {/* ──────────────────────────────────────────────────────── */}
      {/* MODAL 6: QUICK ADD MEDICINE TO CATALOG                   */}
      {/* ──────────────────────────────────────────────────────── */}
      {showQuickAddMedicineModal && (
        <div className="ew-modal-backdrop" onClick={() => !isCreatingQuickMed && setShowQuickAddMedicineModal(false)}>
          <div className="ew-modal ew-modal--quick-med" style={{ maxWidth: '580px' }} onClick={(e) => e.stopPropagation()}>
            <div className="ew-modal__header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Pill size={20} className="text-primary" />
                <h3 style={{ margin: 0 }}>Thêm thuốc mới vào danh mục y tế</h3>
              </div>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => !isCreatingQuickMed && setShowQuickAddMedicineModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveQuickMedicine}>
              <div className="ew-modal__body" style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px 20px' }}>
                <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748b' }}>
                  Thuốc mới sẽ được lưu vào danh mục dược dùng chung của hệ thống, đồng bộ tức thì cho Bác sĩ và Quản trị viên (Admin).
                </p>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Tên thuốc / Biệt dược <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="ew-input"
                    placeholder="VD: Paracetamol, Augmentin, Panadol Extra..."
                    value={quickMedForm.name}
                    onChange={(e) => setQuickMedForm({ ...quickMedForm, name: e.target.value })}
                    required
                    autoFocus
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Hoạt chất chính
                    </label>
                    <input
                      type="text"
                      className="ew-input"
                      placeholder="VD: Acetaminophen, Amoxicillin..."
                      value={quickMedForm.activeIngredient}
                      onChange={(e) => setQuickMedForm({ ...quickMedForm, activeIngredient: e.target.value })}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Hàm lượng / Nồng độ
                    </label>
                    <input
                      type="text"
                      className="ew-input"
                      placeholder="VD: 500mg, 625mg, 10ml..."
                      value={quickMedForm.concentration}
                      onChange={(e) => setQuickMedForm({ ...quickMedForm, concentration: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Đơn vị tính
                    </label>
                    <select
                      className="ew-select"
                      value={quickMedForm.unit}
                      onChange={(e) => setQuickMedForm({ ...quickMedForm, unit: e.target.value })}
                    >
                      <option value="Viên">Viên</option>
                      <option value="Gói">Gói</option>
                      <option value="Chai">Chai</option>
                      <option value="Lọ">Lọ</option>
                      <option value="Ống">Ống</option>
                      <option value="Hộp">Hộp</option>
                      <option value="Vỉ">Vỉ</option>
                      <option value="Tuýp">Tuýp</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Dạng bào chế
                    </label>
                    <select
                      className="ew-select"
                      value={quickMedForm.dosageForm}
                      onChange={(e) => setQuickMedForm({ ...quickMedForm, dosageForm: e.target.value })}
                    >
                      <option value="Viên nén">Viên nén</option>
                      <option value="Viên nang">Viên nang</option>
                      <option value="Siro / Hỗn dịch">Siro / Hỗn dịch</option>
                      <option value="Dung dịch tiêm">Dung dịch tiêm</option>
                      <option value="Bột pha hỗn dịch">Bột pha hỗn dịch</option>
                      <option value="Kem / Mỡ bôi">Kem / Mỡ bôi</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="ew-modal__footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn-modal-cancel"
                  style={{
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    color: '#475569',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                  onClick={() => setShowQuickAddMedicineModal(false)}
                  disabled={isCreatingQuickMed}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="btn-modal-primary"
                  style={{
                    background: '#0d9488',
                    border: 'none',
                    color: '#fff',
                    padding: '8px 20px',
                    borderRadius: '8px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                  disabled={isCreatingQuickMed || !quickMedForm.name.trim()}
                >
                  {isCreatingQuickMed ? (
                    <>
                      <span className="spinner-border spinner-border-sm" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <Plus size={16} />
                      <span>Lưu & Kê vào đơn</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EncounterWorkspace;
