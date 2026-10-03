// ═══════════════════════════════════════════════════════════════════════
// [Phase 06B — IN-CHAT CANCELLATION] CancellationDraftCard.jsx
// Displays backend-validated CANCELLATION_DRAFT with refund preview
// Enforces: No auto-submit, double-click protection, explicit confirmation
// ═══════════════════════════════════════════════════════════════════════

import React, { memo, useState } from 'react';
import {
  Calendar,
  Clock,
  User,
  MapPin,
  AlertTriangle,
  Loader2,
  XCircle,
  CheckCircle2,
  Stethoscope,
  Banknote,
  ShieldAlert,
} from 'lucide-react';

const CancellationDraftCard = memo(({
  draft,
  onConfirmCancel,
  onKeepBooking,
  isProcessing = false,
}) => {
  const [internalProcessing, setInternalProcessing] = useState(false);

  if (!draft || typeof draft !== 'object') return null;

  const data = draft.data || draft;
  const doctor = data.doctor || {};
  const schedule = data.schedule || {};
  const patient = data.patient || {};
  const refundPreview = data.refundPreview || {};
  const bookingCode = data.bookingCode || `#BK-${data.bookingId}`;

  const busy = isProcessing || internalProcessing;

  const handleConfirm = async () => {
    if (busy || !onConfirmCancel) return;
    setInternalProcessing(true);
    try {
      await onConfirmCancel(data);
    } finally {
      setInternalProcessing(false);
    }
  };

  return (
    <div className="ai-cancellation-draft-card" role="region" aria-label="Phiếu xác nhận hủy lịch khám">
      {/* Header Banner */}
      <div className="draft-header cancel-draft-header">
        <div className="draft-header-title">
          <ShieldAlert size={18} className="header-alert-icon" />
          <span>Phiếu xác nhận hủy lịch khám</span>
        </div>
        <span className="draft-badge cancel-badge">Bản nháp hủy ({bookingCode})</span>
      </div>

      <div className="draft-body">
        {/* Doctor Information */}
        <div className="draft-section doctor-section">
          <div className="section-icon">
            <Stethoscope size={18} />
          </div>
          <div className="section-content">
            <div className="doctor-title-row">
              <span className="doctor-name">
                {doctor.position ? `${doctor.position} ` : 'Bác sĩ '}
                {doctor.name || 'Bác sĩ'}
              </span>
            </div>
            {doctor.specialtyName && (
              <span className="doctor-specialty">Chuyên khoa: {doctor.specialtyName}</span>
            )}
            {doctor.clinicName && (
              <div className="doctor-clinic">
                <MapPin size={13} className="pin-icon" />
                <span>{doctor.clinicName}</span>
              </div>
            )}
            {doctor.clinicAddress && (
              <span className="doctor-address">{doctor.clinicAddress}</span>
            )}
          </div>
        </div>

        {/* Schedule & Time */}
        <div className="draft-section schedule-section">
          <div className="section-icon">
            <Calendar size={18} />
          </div>
          <div className="section-content">
            <div className="schedule-row">
              <span className="schedule-date">
                {schedule.dateFormatted ? `Ngày: ${schedule.dateFormatted}` : `Ngày khám: ${schedule.date}`}
              </span>
            </div>
            <div className="schedule-time-row">
              <Clock size={13} className="clock-icon" />
              <span className="schedule-time">{schedule.displayTime || schedule.timeLabel || 'Khung giờ khám'}</span>
            </div>
          </div>
        </div>

        {/* Patient Information */}
        <div className="draft-section patient-section">
          <div className="section-icon">
            <User size={18} />
          </div>
          <div className="section-content">
            <div className="patient-name-row">
              <span className="patient-label">Bệnh nhân:</span>
              <span className="patient-name">{patient.patientName || patient.displayName || 'Bệnh nhân'}</span>
            </div>
            <div className="status-row">
              <span className="status-label">Trạng thái hiện tại:</span>
              <span className="status-current-badge">{data.statusLabel || data.statusId}</span>
            </div>
          </div>
        </div>

        {/* Policy-Engine Refund Preview */}
        <div className="draft-section refund-preview-section">
          <div className="section-icon">
            <Banknote size={18} />
          </div>
          <div className="section-content">
            <div className="refund-title-row">
              <span className="refund-label">Dự kiến hoàn tiền:</span>
              <span className={`refund-amount ${refundPreview.isRefundable ? 'has-refund' : 'no-refund'}`}>
                {refundPreview.formattedRefundAmount || '0 VNĐ'}
                {refundPreview.refundRate > 0 && ` (${refundPreview.refundRate}%)`}
              </span>
            </div>
            {refundPreview.policyMessage && (
              <p className="refund-policy-msg">{refundPreview.policyMessage}</p>
            )}
            {refundPreview.note && (
              <p className="refund-note">{refundPreview.note}</p>
            )}
          </div>
        </div>

        {/* Reason if provided */}
        {data.cancellationReason && (
          <div className="draft-reason-row">
            <span className="reason-label">Lý do hủy:</span>
            <span className="reason-text">{data.cancellationReason}</span>
          </div>
        )}

        {/* Real-time Policy & Irrevocable Disclaimer */}
        <div className="draft-disclaimer cancel-disclaimer">
          <AlertTriangle size={14} className="disclaimer-icon" />
          <p className="disclaimer-text">
            Việc hủy lịch sẽ giải phóng khung giờ khám cho bệnh nhân khác. Số tiền hoàn (nếu có) sẽ được tính lại chính xác theo thời điểm xác nhận hủy.
          </p>
        </div>
      </div>

      {/* Action Buttons: Keep vs Confirm Cancel */}
      <div className="draft-actions cancel-actions">
        {onKeepBooking && (
          <button
            type="button"
            className="draft-btn-secondary keep-booking-btn"
            onClick={onKeepBooking}
            disabled={busy}
            title="Giữ lại lịch khám không hủy"
          >
            <CheckCircle2 size={15} />
            <span>Giữ lại lịch</span>
          </button>
        )}
        <button
          type="button"
          className="draft-btn-danger confirm-cancel-btn"
          onClick={handleConfirm}
          disabled={busy}
          title="Xác nhận hủy lịch khám này"
        >
          {busy ? (
            <>
              <Loader2 size={16} className="btn-spinner" />
              <span>Đang xử lý hủy...</span>
            </>
          ) : (
            <>
              <XCircle size={16} />
              <span>Xác nhận hủy lịch</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
});

CancellationDraftCard.displayName = 'CancellationDraftCard';

export default CancellationDraftCard;
