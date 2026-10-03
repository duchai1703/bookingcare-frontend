// ═══════════════════════════════════════════════════════════════════════
// [Phase 06C — IN-CHAT RESCHEDULE] RescheduleErrorCard.jsx
// Displays backend validation errors or failures during reschedule flow
// ═══════════════════════════════════════════════════════════════════════

import React, { memo } from 'react';
import { AlertCircle, RefreshCw, Calendar } from 'lucide-react';

const RescheduleErrorCard = memo(({ error, onRetry, onViewBookings }) => {
  if (!error) return null;

  const errorMessage =
    typeof error === 'string'
      ? error
      : error.message || 'Không thể thực hiện đổi lịch khám vào thời điểm này.';

  const errorCode = typeof error === 'object' ? error.error || error.errCode : null;

  return (
    <div className="ai-reschedule-error-card" role="alert" aria-live="assertive">
      <div className="error-header">
        <div className="error-icon-badge">
          <AlertCircle size={22} className="alert-icon" />
        </div>
        <div className="error-header-text">
          <h4 className="error-title">Đổi lịch khám không thành công</h4>
          {errorCode && <span className="error-code-badge">Mã lỗi: {errorCode}</span>}
        </div>
      </div>

      <div className="error-body">
        <p className="error-desc">{errorMessage}</p>
      </div>

      <div className="error-actions">
        {onRetry && (
          <button
            type="button"
            className="error-btn-primary"
            onClick={onRetry}
            title="Thử lại thao tác đổi lịch"
          >
            <RefreshCw size={14} />
            <span>Chọn lại giờ khám</span>
          </button>
        )}
        {onViewBookings && (
          <button
            type="button"
            className="error-btn-secondary"
            onClick={onViewBookings}
            title="Xem danh sách lịch hẹn của tôi"
          >
            <Calendar size={14} />
            <span>Xem lịch khám của tôi</span>
          </button>
        )}
      </div>
    </div>
  );
});

RescheduleErrorCard.displayName = 'RescheduleErrorCard';

export default RescheduleErrorCard;
