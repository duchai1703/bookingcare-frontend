// ═══════════════════════════════════════════════════════════════════════
// [Phase 06C — IN-CHAT RESCHEDULE] RescheduleDraftCard.jsx
// Displays backend-validated RESCHEDULE_DRAFT with comparison & financial impact
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
  CheckCircle2,
  Stethoscope,
  Banknote,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';

const RescheduleDraftCard = memo(({
  draft,
  onConfirmReschedule,
  onKeepBooking,
  isProcessing = false,
}) => {
  const [internalProcessing, setInternalProcessing] = useState(false);

  if (!draft || typeof draft !== 'object') return null;

  const data = draft.data || draft;
  const oldDoctor = data.oldDoctor || {};
  const oldSchedule = data.oldSchedule || {};
  const newDoctor = data.newDoctor || {};
  const newSchedule = data.newSchedule || {};
  const patient = data.patient || {};
  const financialImpact = data.financialImpact || {};
  const bookingCode = data.bookingCode || `#BK-${data.bookingId}`;

  const busy = isProcessing || internalProcessing;

  const handleConfirm = async () => {
    if (busy || !onConfirmReschedule) return;
    setInternalProcessing(true);
    try {
      await onConfirmReschedule(data);
    } finally {
      setInternalProcessing(false);
    }
  };

  return (
    <div className="ai-reschedule-draft-card" role="region" aria-label="Phiếu xác nhận đổi lịch khám">
      {/* Header Banner */}
      <div className="draft-header reschedule-draft-header">
        <div className="draft-header-title">
          <RefreshCw size={18} className="header-alert-icon" />
          <span>Phiếu xác nhận đổi lịch khám</span>
        </div>
        <span className="draft-badge reschedule-badge">Bản nháp đổi lịch ({bookingCode})</span>
      </div>

      <div className="draft-body">
        {/* Comparison: Old vs New Appointment */}
        <div className="reschedule-comparison-grid">
          {/* Old Appointment Box */}
          <div className="reschedule-box old-appointment-box">
            <div className="box-tag old-tag">Lịch khám hiện tại</div>
            <div className="box-doctor-name">
              <Stethoscope size={14} />
              <span>{oldDoctor.name || 'Bác sĩ'}</span>
            </div>
            {oldDoctor.specialtyName && (
              <div className="box-sub">{oldDoctor.specialtyName}</div>
            )}
            <div className="box-datetime">
              <Calendar size={13} />
              <span>{oldSchedule.dateFormatted || oldSchedule.date}</span>
            </div>
            <div className="box-time">
              <Clock size={13} />
              <span>{oldSchedule.timeLabel || oldSchedule.timeType}</span>
            </div>
            {data.oldBookingPrice && (
              <div className="box-price">
                {Number(data.oldBookingPrice).toLocaleString('vi-VN')} VNĐ
              </div>
            )}
          </div>

          <div className="reschedule-arrow-divider">
            <ArrowRight size={22} className="arrow-icon" />
          </div>

          {/* New Appointment Box */}
          <div className="reschedule-box new-appointment-box">
            <div className="box-tag new-tag">Lịch khám mới</div>
            <div className="box-doctor-name">
              <Stethoscope size={14} />
              <span>{newDoctor.name || 'Bác sĩ'}</span>
            </div>
            {newDoctor.specialtyName && (
              <div className="box-sub">{newDoctor.specialtyName}</div>
            )}
            <div className="box-datetime">
              <Calendar size={13} />
              <span>{newSchedule.dateFormatted || newSchedule.date}</span>
            </div>
            <div className="box-time">
              <Clock size={13} />
              <span>{newSchedule.timeLabel || newSchedule.timeType}</span>
            </div>
            {data.newBookingPrice && (
              <div className="box-price new-price-tag">
                {Number(data.newBookingPrice).toLocaleString('vi-VN')} VNĐ
              </div>
            )}
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
              <span className="patient-name">{patient.patientName || 'Bệnh nhân'}</span>
            </div>
          </div>
        </div>

        {/* Financial Impact & Differential */}
        <div className="draft-section financial-impact-section">
          <div className="section-icon">
            <Banknote size={18} />
          </div>
          <div className="section-content">
            <div className="financial-title-row">
              <span className="financial-label">Ảnh hưởng tài chính:</span>
              <span className="financial-status-badge">
                {financialImpact.isPaid ? 'Đã thanh toán ca cũ' : 'Chưa thanh toán'}
              </span>
            </div>
            {financialImpact.policyExplanation && (
              <p className="financial-explanation">{financialImpact.policyExplanation}</p>
            )}
          </div>
        </div>

        {/* Reason if provided */}
        {data.reason && (
          <div className="draft-reason-row">
            <span className="reason-label">Lý do đổi lịch:</span>
            <span className="reason-text">{data.reason}</span>
          </div>
        )}

        {/* Real-time Policy Disclaimer */}
        <div className="draft-disclaimer reschedule-disclaimer">
          <AlertTriangle size={14} className="disclaimer-icon" />
          <p className="disclaimer-text">
            Khung giờ mới sẽ được đặt và khung giờ cũ sẽ được giải phóng ngay sau khi bạn xác nhận.
          </p>
        </div>
      </div>

      {/* Action Buttons: Keep vs Confirm Reschedule */}
      <div className="draft-actions reschedule-actions">
        {onKeepBooking && (
          <button
            type="button"
            className="draft-btn-secondary keep-booking-btn"
            onClick={onKeepBooking}
            disabled={busy}
            title="Giữ nguyên lịch khám hiện tại"
          >
            <CheckCircle2 size={15} />
            <span>Giữ lịch hiện tại</span>
          </button>
        )}
        <button
          type="button"
          className="draft-btn-primary confirm-reschedule-btn"
          onClick={handleConfirm}
          disabled={busy}
          title="Xác nhận thực hiện đổi sang lịch mới"
        >
          {busy ? (
            <>
              <Loader2 size={16} className="spin-loader" />
              <span>Đang xử lý đổi lịch...</span>
            </>
          ) : (
            <>
              <RefreshCw size={15} />
              <span>Xác nhận đổi lịch</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
});

RescheduleDraftCard.displayName = 'RescheduleDraftCard';

export default RescheduleDraftCard;
