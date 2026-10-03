// ═══════════════════════════════════════════════════════════════════════
// [Phase 06C — IN-CHAT RESCHEDULE] RescheduleSuccessCard.jsx
// Displays Real Domain Reschedule Result (Old -> New Booking)
// STRICT: NO FAKE SUCCESS, displays actual DB booking IDs & slots
// ═══════════════════════════════════════════════════════════════════════

import React, { memo } from 'react';
import {
  CheckCircle2,
  Calendar,
  Clock,
  ExternalLink,
  Stethoscope,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

const RescheduleSuccessCard = memo(({ result }) => {
  if (!result || typeof result !== 'object') return null;

  const data = result.data || result;
  const oldBookingId = data.oldBookingId;
  const newBookingId = data.newBookingId;
  const oldBookingCode = data.oldBookingCode || `#BK-${oldBookingId}`;
  const newBookingCode = data.newBookingCode || `#BK-${newBookingId}`;
  const oldDoctor = data.oldDoctor || {};
  const newDoctor = data.newDoctor || {};
  const newSchedule = data.newSchedule || {};
  const financialImpact = data.financialImpact || {};

  return (
    <div className="ai-reschedule-success-card" role="region" aria-label="Kết quả đổi lịch khám">
      {/* Header */}
      <div className="reschedule-success-header">
        <div className="reschedule-success-icon-badge">
          <CheckCircle2 size={24} className="check-icon" />
        </div>
        <div className="reschedule-success-header-text">
          <h4 className="reschedule-success-title">Đổi lịch khám thành công!</h4>
          <span className="booking-id-tag reschedule-id-tag">
            Mã lịch mới: {newBookingCode}
          </span>
        </div>
      </div>

      <div className="reschedule-success-body">
        {/* Transition Summary */}
        <div className="reschedule-transition-summary">
          <span className="transition-badge old-badge">Ca cũ: {oldBookingCode} (Đã hủy)</span>
          <ArrowRight size={16} className="transition-arrow" />
          <span className="transition-badge new-badge">Ca mới: {newBookingCode} (Đã xác nhận)</span>
        </div>

        {/* New Doctor Info */}
        {(newDoctor.name || data.doctorName) && (
          <div className="reschedule-row">
            <Stethoscope size={16} className="row-icon" />
            <div className="row-content">
              <span className="row-title">
                {newDoctor.position ? `${newDoctor.position} ` : 'Bác sĩ '}
                {newDoctor.name || data.doctorName}
              </span>
              {newDoctor.specialtyName && (
                <span className="row-subtitle">Chuyên khoa: {newDoctor.specialtyName}</span>
              )}
            </div>
          </div>
        )}

        {/* New Date & Time */}
        {(newSchedule.date || data.date) && (
          <div className="reschedule-row">
            <Calendar size={16} className="row-icon" />
            <div className="row-content">
              <span className="row-title">
                {newSchedule.dateFormatted ? `Ngày khám mới: ${newSchedule.dateFormatted}` : `Ngày: ${newSchedule.date || data.date}`}
              </span>
              {(newSchedule.timeLabel || data.timeType) && (
                <div className="time-meta">
                  <Clock size={12} className="time-clock" />
                  <span>{newSchedule.timeLabel || data.timeType}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Financial Status */}
        {financialImpact.policyExplanation && (
          <div className="reschedule-row financial-summary-row">
            <ShieldCheck size={16} className="row-icon" />
            <div className="row-content">
              <span className="row-subtitle">{financialImpact.policyExplanation}</span>
            </div>
          </div>
        )}

        {/* Message */}
        <div className="reschedule-success-note">
          <p>
            {data.message || 'Lịch hẹn mới đã được lưu trên hệ thống. Bạn có thể theo dõi trong danh sách Lịch khám của tôi.'}
          </p>
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="reschedule-success-footer">
        <a
          href="/patient/history"
          className="history-link-btn"
          title="Xem danh sách lịch hẹn của tôi"
        >
          <span>Xem lịch khám của tôi</span>
          <ExternalLink size={14} />
        </a>
      </div>
    </div>
  );
});

RescheduleSuccessCard.displayName = 'RescheduleSuccessCard';

export default RescheduleSuccessCard;
