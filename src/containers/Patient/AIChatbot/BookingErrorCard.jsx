// ═══════════════════════════════════════════════════════════════════════
// [Phase 05 — REAL IN-CHAT BOOKING] BookingErrorCard.jsx
// Displays Booking Failure States (Slot unavailable, expired, duplicate)
// Provides clear recovery paths without resetting the chatbot
// ═══════════════════════════════════════════════════════════════════════

import React, { memo } from 'react';
import {
  AlertTriangle,
  RefreshCw,
  Search,
  Calendar,
} from 'lucide-react';

const BookingErrorCard = memo(({
  bookingError,
  onRetrySlot,
  onFindDoctor,
}) => {
  if (!bookingError || typeof bookingError !== 'object') return null;

  const data = bookingError.data || bookingError;
  const errorCode = data.error || data.code || 'booking_error';
  const errorMessage = data.message || 'Không thể tạo lịch hẹn khám bệnh vào lúc này.';

  let friendlyDesc = 'Rất tiếc, yêu cầu đặt lịch chưa hoàn tất. Bạn có thể chọn khung giờ khác hoặc tìm bác sĩ khác.';
  if (errorCode === 'slot_no_longer_available') {
    friendlyDesc = 'Khung giờ khám bạn chọn vừa có người khác đặt trước hoặc đã hết chỗ. Vui lòng chọn một khung giờ khác phù hợp.';
  } else if (errorCode === 'duplicate_booking') {
    friendlyDesc = 'Bạn đã có một lịch hẹn với bác sĩ này trong cùng khung giờ. Vui lòng kiểm tra lại trang Lịch sử khám bệnh.';
  } else if (errorCode === 'draft_invalid_or_expired' || errorCode === 'draft_expired') {
    friendlyDesc = 'Phiếu thông tin đặt lịch đã quá hạn 15 phút. Bạn vui lòng chọn lại khung giờ để tạo phiếu mới nhé.';
  } else if (errorCode === 'doctor_unavailable' || errorCode === 'doctor_paused') {
    friendlyDesc = 'Bác sĩ hiện đang tạm nghỉ nhận lịch khám. Bạn có thể tìm các bác sĩ cùng chuyên khoa khác.';
  }

  return (
    <div className="ai-booking-error-card" role="alert" aria-label="Thông báo lỗi đặt lịch">
      <div className="error-header">
        <div className="error-icon-box">
          <AlertTriangle size={20} className="error-icon" />
        </div>
        <div className="error-header-text">
          <h4 className="error-title">Chưa thể hoàn tất đặt lịch</h4>
          <span className="error-code-badge">{errorCode}</span>
        </div>
      </div>

      <div className="error-body">
        <p className="error-main-msg">{errorMessage}</p>
        <p className="error-desc-msg">{friendlyDesc}</p>
      </div>

      <div className="error-actions">
        {onRetrySlot && (
          <button
            type="button"
            className="error-btn-primary"
            onClick={onRetrySlot}
            title="Xem lại các khung giờ trống của bác sĩ"
          >
            <Calendar size={14} />
            <span>Chọn khung giờ khác</span>
          </button>
        )}
        {onFindDoctor && (
          <button
            type="button"
            className="error-btn-secondary"
            onClick={onFindDoctor}
            title="Tìm kiếm bác sĩ khác"
          >
            <Search size={14} />
            <span>Tìm bác sĩ khác</span>
          </button>
        )}
      </div>
    </div>
  );
});

BookingErrorCard.displayName = 'BookingErrorCard';

export default BookingErrorCard;
