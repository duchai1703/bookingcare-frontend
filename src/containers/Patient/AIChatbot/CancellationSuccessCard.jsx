// ═══════════════════════════════════════════════════════════════════════
// [Phase 06B — IN-CHAT CANCELLATION] CancellationSuccessCard.jsx
// Displays Real Domain Cancellation Result (Status S4 + Final Refund)
// STRICT: NO FAKE SUCCESS, displays actual DB bookingId & refund result
// ═══════════════════════════════════════════════════════════════════════

import React, { memo } from 'react';
import {
  CheckCircle2,
  Calendar,
  Clock,
  ExternalLink,
  Stethoscope,
  Tag,
  Banknote,
  BellRing,
} from 'lucide-react';

const CancellationSuccessCard = memo(({ result }) => {
  if (!result || typeof result !== 'object') return null;

  const data = result.data || result;
  const bookingId = data.bookingId;
  const bookingCode = data.bookingCode || `#BK-${bookingId}`;
  const doctor = data.doctor || {};
  const schedule = data.schedule || {};
  const refund = data.refund || {};
  const alreadyCancelled = !!result.alreadyCancelled || !!data.alreadyCancelled;

  return (
    <div className="ai-cancellation-success-card" role="region" aria-label="Kết quả hủy lịch khám">
      {/* Header */}
      <div className="cancel-success-header">
        <div className="cancel-success-icon-badge">
          <CheckCircle2 size={24} className="check-icon" />
        </div>
        <div className="cancel-success-header-text">
          <h4 className="cancel-success-title">
            {alreadyCancelled ? 'Lịch hẹn đã được hủy trước đó' : 'Hủy lịch khám thành công!'}
          </h4>
          {bookingCode && (
            <span className="booking-id-tag cancel-id-tag">Mã lịch hẹn: {bookingCode}</span>
          )}
        </div>
      </div>

      <div className="cancel-success-body">
        {/* Doctor Info */}
        {doctor.name && (
          <div className="cancel-row">
            <Stethoscope size={16} className="row-icon" />
            <div className="row-content">
              <span className="row-title">
                {doctor.position ? `${doctor.position} ` : 'Bác sĩ '}
                {doctor.name}
              </span>
              {doctor.specialtyName && (
                <span className="row-subtitle">Chuyên khoa: {doctor.specialtyName}</span>
              )}
            </div>
          </div>
        )}

        {/* Date & Time */}
        {schedule.date && (
          <div className="cancel-row">
            <Calendar size={16} className="row-icon" />
            <div className="row-content">
              <span className="row-title">
                {schedule.dateFormatted ? `Ngày: ${schedule.dateFormatted}` : `Ngày: ${schedule.date}`}
              </span>
              {schedule.timeLabel && (
                <div className="time-meta">
                  <Clock size={12} className="time-clock" />
                  <span>{schedule.timeLabel}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Status */}
        <div className="cancel-row">
          <Tag size={16} className="row-icon" />
          <div className="row-content">
            <div className="status-pill-row">
              <span className="status-label">Trạng thái:</span>
              <span className="status-badge status-s4">Đã hủy (S4)</span>
            </div>
          </div>
        </div>

        {/* Refund Status */}
        <div className="cancel-row">
          <Banknote size={16} className="row-icon" />
          <div className="row-content">
            <div className="refund-summary-row">
              <span className="refund-label">Hoàn tiền:</span>
              <span className="refund-value">
                {refund.formattedRefundAmount || (refund.refundAmount > 0 ? `${Number(refund.refundAmount).toLocaleString('vi-VN')} VNĐ` : '0 VNĐ')}
                {refund.refundRate > 0 && ` (${refund.refundRate}%)`}
              </span>
            </div>
            {refund.refundStatus && refund.refundStatus !== 'none' && (
              <span className="refund-status-tag">Trạng thái hoàn: {refund.refundStatus}</span>
            )}
          </div>
        </div>

        {/* Domain Notification Confirmation */}
        <div className="cancel-notice-box">
          <BellRing size={15} className="notice-icon" />
          <p className="notice-text">
            Hệ thống BookingCare đã tự động gửi thông báo hủy lịch hẹn đến Bác sĩ phụ trách.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="cancel-success-footer">
        <a
          href="/patient/history"
          className="view-history-btn"
          title="Xem danh sách lịch hẹn của bạn"
        >
          <span>Xem Lịch sử khám bệnh</span>
          <ExternalLink size={13} />
        </a>
      </div>
    </div>
  );
});

CancellationSuccessCard.displayName = 'CancellationSuccessCard';

export default CancellationSuccessCard;
