// ═══════════════════════════════════════════════════════════════════════
// [Phase 06B — IN-CHAT CANCELLATION] CancellationErrorCard.jsx
// Displays Cancellation Failure States (Ineligible, Expired token, Completed)
// ═══════════════════════════════════════════════════════════════════════

import React, { memo } from 'react';
import {
  AlertTriangle,
  Calendar,
  ExternalLink,
} from 'lucide-react';

const CancellationErrorCard = memo(({ error, onViewBookings }) => {
  if (!error || typeof error !== 'object') return null;

  const data = error.data || error;
  const errorCode = data.error || data.code || 'cancel_error';
  const errorMessage = data.message || 'Không thể hủy lịch khám bệnh vào lúc này.';

  let friendlyDesc = 'Yêu cầu hủy lịch chưa thể thực hiện được. Bạn có thể kiểm tra lại thông tin lịch hẹn tại trang Lịch sử khám bệnh.';
  if (errorCode === 'booking_not_cancellable') {
    friendlyDesc = 'Lịch hẹn ở trạng thái hiện tại không thể hủy qua trợ lý AI. Vui lòng liên hệ trực tiếp phòng khám hoặc quản trị viên.';
  } else if (errorCode === 'consultation_completed') {
    friendlyDesc = 'Lịch hẹn này đã hoàn tất buổi khám (S3), do đó không thể hủy.';
  } else if (errorCode === 'unauthorized_booking') {
    friendlyDesc = 'Bạn không có quyền thực hiện thao tác trên lịch hẹn này.';
  } else if (errorCode === 'draft_expired' || errorCode === 'invalid_token') {
    friendlyDesc = 'Phiếu xác nhận hủy đã hết hiệu lực. Bạn vui lòng yêu cầu hủy lại để nhận phiếu mới nhé.';
  } else if (errorCode === 'booking_not_found') {
    friendlyDesc = 'Không tìm thấy thông tin lịch hẹn trong hệ thống. Vui lòng kiểm tra lại mã lịch.';
  }

  return (
    <div className="ai-cancellation-error-card" role="alert" aria-label="Thông báo lỗi hủy lịch">
      <div className="error-header cancel-error-header">
        <div className="error-icon-box">
          <AlertTriangle size={20} className="error-icon" />
        </div>
        <div className="error-header-text">
          <h4 className="error-title">Chưa thể hủy lịch khám</h4>
          <span className="error-code-badge">{errorCode}</span>
        </div>
      </div>

      <div className="error-body">
        <p className="error-main-msg">{errorMessage}</p>
        <p className="error-desc-msg">{friendlyDesc}</p>
      </div>

      <div className="error-actions">
        {onViewBookings ? (
          <button
            type="button"
            className="error-btn-primary"
            onClick={onViewBookings}
            title="Xem danh sách lịch hẹn của bạn"
          >
            <Calendar size={14} />
            <span>Xem lịch khám của tôi</span>
          </button>
        ) : (
          <a
            href="/patient/history"
            className="error-btn-primary"
            title="Đến trang Lịch sử khám bệnh"
          >
            <Calendar size={14} />
            <span>Xem lịch sử khám</span>
            <ExternalLink size={12} />
          </a>
        )}
      </div>
    </div>
  );
});

CancellationErrorCard.displayName = 'CancellationErrorCard';

export default CancellationErrorCard;
