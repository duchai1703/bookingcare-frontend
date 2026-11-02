// src/containers/System/Doctor/PastEncounterDetailModal.jsx
// [EMR CLINICAL WORKSTATION] Giao diện Xem Lại Phiên Khám Quá Khứ Chi Tiết (Full Past Encounter Inspector)
// Tái hiện chính xác giao diện lúc bác sĩ khám trong quá khứ ở chế độ Lưu trữ Bệnh án Điện tử (Read-only EMR)
import React, { useState, useEffect } from 'react';
import {
  X,
  ExternalLink,
  Copy,
  Pill,
  FileText,
  Calendar,
  Clock,
  Stethoscope,
  Building2,
  CheckCircle2,
  ShieldCheck,
  Download,
  AlertCircle,
  Eye,
  Activity,
  User,
  HeartPulse,
  Printer
} from 'lucide-react';
import { toast } from 'react-toastify';
import { getDoctorEncounter } from '../../../services/doctorService';
import './PastEncounterDetailModal.scss';

const formatDateDisplay = (rawDate) => {
  if (!rawDate) return '';
  const num = Number(rawDate);
  if (!isNaN(num) && num > 1000000000) {
    const d = new Date(num);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    }
  }
  return String(rawDate);
};

export default function PastEncounterDetailModal({
  isOpen,
  encounterItem,
  patientInfo = {},
  onClose,
  onInheritDiagnosis,
  onInheritMedicines,
}) {
  const [fullData, setFullData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !encounterItem?.id) {
      setFullData(null);
      return;
    }

    let isMounted = true;
    const fetchFullEncounter = async () => {
      setLoading(true);
      try {
        const res = await getDoctorEncounter(encounterItem.id);
        if (isMounted && res && res.errCode === 0 && res.data) {
          setFullData(res.data);
        } else if (isMounted) {
          // Dùng dữ liệu sẵn có từ lịch sử
          setFullData(encounterItem);
        }
      } catch (err) {
        console.warn('Could not fetch remote full encounter, using local item:', err);
        if (isMounted) setFullData(encounterItem);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchFullEncounter();

    return () => {
      isMounted = false;
    };
  }, [isOpen, encounterItem]);

  if (!isOpen || !encounterItem) return null;

  const data = fullData || encounterItem;
  const bookingId = data.id || encounterItem.id;
  const dateFormatted = formatDateDisplay(data.date || encounterItem.date);
  const doctorName = data.doctorName || (data.doctorBookingData ? `${data.doctorBookingData.lastName || ''} ${data.doctorBookingData.firstName || ''}`.trim() : 'Bác sĩ BookingCare');
  const specialtyName = data.specialtyName || data.doctorBookingData?.doctorInfoData?.specialtyData?.name || '';
  const clinicName = data.clinicName || data.doctorBookingData?.doctorInfoData?.clinicData?.name || 'Phòng khám Đa khoa BookingCare';
  const clinicAddress = data.doctorBookingData?.doctorInfoData?.clinicData?.address || '';

  const medicines = data.bookingMedicines || encounterItem.bookingMedicines || [];
  const attachments = data.attachments || encounterItem.attachments || [];

  const handleOpenNewTab = () => {
    window.open(`/doctor-dashboard/encounter/${bookingId}`, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyDiagnosis = () => {
    if (data.diagnosis && onInheritDiagnosis) {
      onInheritDiagnosis(data.diagnosis);
      toast.success('Đã kế thừa chẩn đoán vào phiên khám hiện tại!');
    }
  };

  const handleCopyRx = () => {
    if (medicines.length > 0 && onInheritMedicines) {
      onInheritMedicines(medicines);
      toast.success(`Đã sao chép ${medicines.length} thuốc vào đơn hiện tại!`);
    } else {
      toast.info('Ca khám này không có đơn thuốc điện tử để sao chép.');
    }
  };

  return (
    <div className="past-encounter-overlay" onClick={onClose}>
      <div className="past-encounter-modal" onClick={(e) => e.stopPropagation()}>
        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* MODAL TOP WORKSPACE BAR                                         */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <header className="pem-header">
          <div className="pem-header__left">
            <div className="pem-badge-archive">
              <ShieldCheck size={14} />
              <span>HỒ SƠ BỆNH ÁN ĐIỆN TỬ (EMR) · LƯU TRỮ PHIÊN KHÁM QUÁ KHỨ</span>
            </div>

            <div className="pem-header__meta-row">
              <span className="code-pill">#BK-{bookingId}</span>
              <span className="status-pill status-pill--completed">🟢 Đã hoàn tất khám (S3)</span>
              <span className="date-pill">
                <Calendar size={13} /> Ngày khám: <strong>{dateFormatted}</strong>
              </span>
              <span className="time-pill">
                <Clock size={13} /> {data.timeType || data.timeTypeBooking?.valueVi || '9:00 - 10:00'}
              </span>
            </div>

            <h2 className="pem-header__title">
              {patientInfo.patientName || data.effectivePatientName || 'Bệnh nhân'}
              <span className="patient-sub">
                {' '}· {patientInfo.patientAge || (data.patientAge ? `${data.patientAge} tuổi` : '')} · {patientInfo.patientGender || data.patientGenderVi || ''} · {patientInfo.patientCode || data.patientCode || `PT-${data.patientId || ''}`}
              </span>
            </h2>
          </div>

          <div className="pem-header__right">
            <button
              type="button"
              className="btn-pem-action secondary"
              onClick={handlePrint}
              title="In phiếu khám bệnh"
            >
              <Printer size={15} />
              <span>In bệnh án</span>
            </button>

            <button
              type="button"
              className="btn-pem-action secondary"
              onClick={handleOpenNewTab}
              title="Mở toàn màn hình phiên khám này trong tab trình duyệt mới"
            >
              <ExternalLink size={15} />
              <span>Mở tab mới</span>
            </button>

            <button
              type="button"
              className="btn-pem-close"
              onClick={onClose}
              title="Đóng cửa sổ xem bệnh án"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* BANNER BÁC SĨ PHỤ TRÁCH & CƠ SỞ                                 */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="pem-doctor-banner">
          <div className="doctor-identity">
            <div className="avatar-box">
              <Stethoscope size={20} />
            </div>
            <div>
              <div className="doctor-name">Bác sĩ khám: <strong>BS. {doctorName}</strong></div>
              <div className="doctor-sub">
                {specialtyName && <span>Chuyên khoa: <strong>{specialtyName}</strong> · </span>}
                <Building2 size={12} className="tw-inline" /> {clinicName}
                {clinicAddress && <span className="address-text"> ({clinicAddress})</span>}
              </div>
            </div>
          </div>

          <div className="pem-inherit-quick-bar">
            {data.diagnosis && (
              <button type="button" className="btn-quick-inherit inherit-dx" onClick={handleCopyDiagnosis}>
                <Copy size={13} />
                <span>Kế thừa Chẩn đoán</span>
              </button>
            )}
            {medicines.length > 0 && (
              <button type="button" className="btn-quick-inherit inherit-rx" onClick={handleCopyRx}>
                <Pill size={13} />
                <span>Sao chép {medicines.length} thuốc</span>
              </button>
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* CLINICAL SECTIONS (TÁI HIỆN CHÍNH XÁC ENCOUNTER WORKSPACE)      */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="pem-body">
          <div className="pem-clinical-layout">
            {/* CỘT CHÍNH (70%): BỆNH ÁN CHI TIẾT */}
            <div className="pem-column-main">
              {/* Mục 1: Lý do đến khám */}
              <div className="pem-section">
                <div className="section-header">
                  <span className="num-pill">1</span>
                  <h3>LÝ DO ĐẾN KHÁM (CHIEF COMPLAINT)</h3>
                </div>
                <div className="section-content text-box">
                  {data.chiefComplaint || data.symptoms || (
                    <em className="text-muted">Bệnh nhân đến khám theo lịch hẹn định kỳ.</em>
                  )}
                </div>
              </div>

              {/* Mục 2: Triệu chứng cơ năng */}
              <div className="pem-section">
                <div className="section-header">
                  <span className="num-pill">2</span>
                  <h3>TRIỆU CHỨNG CƠ NĂNG BỆNH NHÂN CUNG CẤP & BỆNH SỬ</h3>
                </div>
                <div className="section-content text-box">
                  {data.symptoms || data.historyOfPresentIllness ? (
                    <p>{data.symptoms || data.historyOfPresentIllness}</p>
                  ) : (
                    <em className="text-muted">Không có mô tả triệu chứng cơ năng bổ sung.</em>
                  )}
                </div>
              </div>

              {/* Mục 3: Khám lâm sàng & Dấu hiệu thực thể */}
              <div className="pem-section">
                <div className="section-header">
                  <span className="num-pill">3</span>
                  <h3>KHÁM LÂM SÀNG & DẤU HIỆU THỰC THỂ (PHYSICAL EXAMINATION)</h3>
                </div>
                <div className="section-content text-box">
                  {data.physicalExam || data.clinicalNotes ? (
                    <p style={{ whiteSpace: 'pre-line' }}>{data.physicalExam || data.clinicalNotes}</p>
                  ) : (
                    <em className="text-muted">Khám lâm sàng toàn diện bình thường, dấu hiệu sinh tồn ổn định.</em>
                  )}
                </div>
              </div>

              {/* Mục 4: Chẩn đoán xác định & ICD-10 */}
              <div className="pem-section highlight-dx">
                <div className="section-header">
                  <span className="num-pill">4</span>
                  <h3>CHẨN ĐOÁN XÁC ĐỊNH & PHÂN LOẠI ICD-10</h3>
                </div>
                <div className="section-content">
                  <div className="dx-result-box">
                    <div className="dx-title">
                      <HeartPulse size={18} className="text-emerald" />
                      <strong>{data.diagnosis || 'Đã hoàn tất khám bệnh'}</strong>
                    </div>
                    {data.icd10Code && (
                      <div className="dx-icd10">
                        <span className="icd-badge font-mono">ICD-10: {data.icd10Code}</span>
                        {data.icd10Name && <span className="icd-desc">{data.icd10Name}</span>}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Mục 5: Kê đơn thuốc ngoại trú */}
              <div className="pem-section">
                <div className="section-header" style={{ justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="num-pill">5</span>
                    <h3>KÊ ĐƠN THUỐC NGOẠI TRÚ (PRESCRIPTION)</h3>
                    <span className="count-pill">{medicines.length} loại thuốc</span>
                  </div>
                  {medicines.length > 0 && (
                    <button type="button" className="btn-inherit-text" onClick={handleCopyRx}>
                      <Copy size={12} /> Sao chép đơn thuốc vào ca hiện tại
                    </button>
                  )}
                </div>

                <div className="section-content">
                  {medicines.length === 0 ? (
                    <div className="empty-rx-box">
                      <Pill size={20} className="text-muted" />
                      <span>Không kê đơn thuốc điện tử trong ca khám này (chỉ định theo dõi hoặc điều trị không dùng thuốc).</span>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="pem-table-rx">
                        <thead>
                          <tr>
                            <th style={{ width: 40 }}>STT</th>
                            <th>Tên thuốc & Hoạt chất</th>
                            <th style={{ width: 90, textAlign: 'center' }}>Số lượng</th>
                            <th>Cách dùng / Liều dùng</th>
                            <th>Ghi chú</th>
                          </tr>
                        </thead>
                        <tbody>
                          {medicines.map((m, idx) => {
                            const medName = m.medicineData?.name || m.medicineName || m.name || `Thuốc #${idx + 1}`;
                            const medIngredient = m.medicineData?.activeIngredient || m.activeIngredient || '';
                            const medUnit = m.medicineData?.unit || m.unit || 'Viên';
                            const quantity = m.quantity || m.amount || 1;
                            const dosage = m.dosageInstruction || m.usage || m.dosage || [
                              m.morningDose ? `Sáng: ${m.morningDose}` : null,
                              m.noonDose ? `Trưa: ${m.noonDose}` : null,
                              m.afternoonDose ? `Chiều: ${m.afternoonDose}` : null,
                              m.eveningDose ? `Tối: ${m.eveningDose}` : null,
                            ].filter(Boolean).join(' - ') || 'Theo chỉ định của bác sĩ';

                            return (
                              <tr key={m.id || idx}>
                                <td style={{ textAlign: 'center', color: '#94a3b8' }}>{idx + 1}</td>
                                <td>
                                  <strong className="med-name">{medName}</strong>
                                  {medIngredient && <div className="med-ing">{medIngredient}</div>}
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  <span className="font-mono med-qty">{quantity}</span> {medUnit}
                                </td>
                                <td>
                                  <div className="med-dosage">{dosage}</div>
                                </td>
                                <td>
                                  <div className="med-note">{m.note || m.advice || 'Uống sau ăn'}</div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Mục 6: Tài liệu cận lâm sàng đính kèm */}
              <div className="pem-section">
                <div className="section-header">
                  <span className="num-pill">6</span>
                  <h3>CHỈ ĐỊNH CẬN LÂM SÀNG & TÀI LIỆU Y TẾ ĐÍNH KÈM</h3>
                  <span className="count-pill">{attachments.length} tệp</span>
                </div>
                <div className="section-content">
                  {attachments.length === 0 ? (
                    <div className="empty-files-box">
                      <FileText size={20} className="text-muted" />
                      <span>Không có tài liệu hoặc kết quả cận lâm sàng đính kèm trong ca này.</span>
                    </div>
                  ) : (
                    <div className="pem-attachments-grid">
                      {attachments.map((att) => (
                        <div key={att.id} className="att-card">
                          <div className="att-icon">
                            <FileText size={20} />
                          </div>
                          <div className="att-info">
                            <div className="att-name" title={att.fileName}>{att.fileName}</div>
                            <div className="att-meta">
                              <span className="att-cat">{att.category || 'Hồ sơ'}</span>
                              {att.examinationDate && (
                                <span> · {formatDateDisplay(att.examinationDate)}</span>
                              )}
                            </div>
                          </div>
                          {att.fileData && (
                            <a
                              href={att.fileData}
                              download={att.fileName || 'tai-lieu-y-te'}
                              className="btn-download-att"
                              title="Tải về tài liệu"
                            >
                              <Download size={14} />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Mục 7: Lời dặn & Kế hoạch điều trị */}
              <div className="pem-section">
                <div className="section-header">
                  <span className="num-pill">7</span>
                  <h3>LỜI DẶN CỦA BÁC SĨ & KẾ HOẠCH THEO DÕI ĐIỀU TRỊ</h3>
                </div>
                <div className="section-content text-box">
                  <p>{data.doctorAdvice || data.treatmentPlan || data.careInstructions || 'Bệnh nhân tái khám khi hết thuốc hoặc có dấu hiệu bất thường.'}</p>
                  {data.followUpDate && (
                    <div className="followup-box">
                      <Calendar size={14} className="text-blue" />
                      <span>Hẹn ngày tái khám: <strong>{formatDateDisplay(data.followUpDate)}</strong></span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* CỘT PHỤ (30%): TÓM TẮT THÔNG TIN PHIÊN KHÁM & QUYỀN LỢI */}
            <div className="pem-column-side">
              {/* Card 1: Tổng quan phiên khám */}
              <div className="pem-side-card">
                <div className="side-card-title">
                  <Activity size={16} className="text-primary" />
                  <h4>Thông Tin Phiên Khám Quá Khứ</h4>
                </div>

                <div className="side-info-list">
                  <div className="info-row">
                    <span className="label">Mã ca khám:</span>
                    <strong className="val font-mono">#BK-{bookingId}</strong>
                  </div>
                  <div className="info-row">
                    <span className="label">Ngày khám:</span>
                    <strong className="val">{dateFormatted}</strong>
                  </div>
                  <div className="info-row">
                    <span className="label">Khung giờ:</span>
                    <span className="val">{data.timeType || data.timeTypeBooking?.valueVi || '9:00 - 10:00'}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">Bác sĩ khám:</span>
                    <strong className="val text-emerald">BS. {doctorName}</strong>
                  </div>
                  <div className="info-row">
                    <span className="label">Chuyên khoa:</span>
                    <span className="val">{specialtyName || 'Đa khoa'}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">Cơ sở tiếp nhận:</span>
                    <span className="val">{clinicName}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">Trạng thái:</span>
                    <span className="badge-done">✓ Đã khám xong</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Bệnh nhân thụ hưởng */}
              <div className="pem-side-card">
                <div className="side-card-title">
                  <User size={16} className="text-primary" />
                  <h4>Thông Tin Bệnh Nhân</h4>
                </div>

                <div className="side-info-list">
                  <div className="info-row">
                    <span className="label">Họ và tên:</span>
                    <strong className="val">{patientInfo.patientName || data.effectivePatientName}</strong>
                  </div>
                  <div className="info-row">
                    <span className="label">Mã bệnh nhân:</span>
                    <span className="val font-mono">{patientInfo.patientCode || data.patientCode || `PT-${data.patientId}`}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">Tuổi & Giới tính:</span>
                    <span className="val">{patientInfo.patientAge || (data.patientAge ? `${data.patientAge} tuổi` : '')} · {patientInfo.patientGender || data.patientGenderVi || ''}</span>
                  </div>
                </div>
              </div>

              {/* Card 3: Thao tác kế thừa */}
              <div className="pem-side-card pem-action-card">
                <div className="side-card-title">
                  <Copy size={16} className="text-amber" />
                  <h4>Thao Tác Kế Thừa Nhanh</h4>
                </div>
                <p className="side-hint">
                  Nạp nhanh dữ liệu ca khám cũ vào phiên khám đang thực hiện để tiết kiệm thời gian gõ văn bản:
                </p>

                <div className="side-actions-group">
                  <button type="button" className="btn-side-act" onClick={handleCopyDiagnosis}>
                    <Copy size={14} />
                    <span>Nạp Chẩn đoán vào ca hiện tại</span>
                  </button>

                  <button type="button" className="btn-side-act" onClick={handleCopyRx}>
                    <Pill size={14} />
                    <span>Sao chép toàn bộ Đơn thuốc</span>
                  </button>

                  <button type="button" className="btn-side-act secondary" onClick={handleOpenNewTab}>
                    <ExternalLink size={14} />
                    <span>Mở riêng ở Tab mới</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* MODAL FOOTER                                                   */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <footer className="pem-footer">
          <div className="footer-left">
            <span className="text-muted">
              Đang xem ở chế độ Bệnh án điện tử lưu trữ (Read-only) · Mọi thao tác kế thừa sẽ được lưu vào ca khám đang mở.
            </span>
          </div>
          <div className="footer-right">
            <button type="button" className="btn-footer-close" onClick={onClose}>
              Đóng cửa sổ
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
