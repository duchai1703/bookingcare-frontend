import React from 'react';
import moment from 'moment';
import { Phone, Video, VideoOff, PhoneIncoming, PhoneOutgoing, PhoneMissed, PhoneOff, RotateCcw } from 'lucide-react';

const CALL_HISTORY_STYLES = `
.bc-call-history-row {
  display: flex;
  justify-content: center;
  margin: 14px 0;
  width: 100%;
  animation: fadeInCallRow 0.25s ease-out;
}
.bc-call-history-row .call-history-card {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  border-radius: 16px;
  padding: 10px 16px;
  min-width: 280px;
  max-width: 420px;
  transition: all 0.2s ease;
}
.bc-call-history-row .call-history-card:hover {
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
  border-color: #cbd5e1;
}
.bc-call-history-row .call-history-card .call-icon-bubble {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: transform 0.2s;
}
.bc-call-history-row .call-history-card .call-icon-bubble.type-audio {
  background: #ecfdf5;
  color: #10b981;
}
.bc-call-history-row .call-history-card .call-icon-bubble.type-video {
  background: #eff6ff;
  color: #2563eb;
}
.bc-call-history-row .call-history-card .call-icon-bubble.status-missed,
.bc-call-history-row .call-history-card .call-icon-bubble.status-rejected,
.bc-call-history-row .call-history-card .call-icon-bubble.status-cancelled,
.bc-call-history-row .call-history-card .call-icon-bubble.status-failed {
  background: #fee2e2 !important;
  color: #ef4444 !important;
}
.bc-call-history-row .call-history-card .call-info-body {
  flex: 1;
  min-width: 0;
}
.bc-call-history-row .call-history-card .call-info-body .call-header-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 3px;
}
.bc-call-history-row .call-history-card .call-info-body .call-header-line .call-title {
  font-size: 0.88rem;
  font-weight: 600;
  color: #1e293b;
}
.bc-call-history-row .call-history-card .call-info-body .call-header-line .call-time {
  font-size: 0.72rem;
  color: #94a3b8;
  font-weight: 500;
}
.bc-call-history-row .call-history-card .call-info-body .call-sub-line {
  display: flex;
  align-items: center;
}
.bc-call-history-row .call-history-card .call-info-body .call-sub-line .call-status-badge {
  font-size: 0.76rem;
  font-weight: 500;
  color: #64748b;
}
.bc-call-history-row .call-history-card .call-info-body .call-sub-line .call-status-badge.status-success {
  color: #059669;
  font-weight: 600;
}
.bc-call-history-row .call-history-card .call-info-body .call-sub-line .call-status-badge.status-missed,
.bc-call-history-row .call-history-card .call-info-body .call-sub-line .call-status-badge.status-rejected,
.bc-call-history-row .call-history-card .call-info-body .call-sub-line .call-status-badge.status-cancelled,
.bc-call-history-row .call-history-card .call-info-body .call-sub-line .call-status-badge.status-failed {
  color: #dc2626 !important;
  font-weight: 600;
}
.bc-call-history-row .call-history-card .btn-call-again {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 0.76rem;
  font-weight: 600;
  color: #0d9488;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
  flex-shrink: 0;
}
.bc-call-history-row .call-history-card .btn-call-again:hover {
  background: #0d9488;
  color: #ffffff;
  border-color: #0d9488;
}
.bc-call-history-row .call-history-card .btn-call-again:active {
  transform: scale(0.96);
}
@keyframes fadeInCallRow {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}
`;

const formatCallDuration = (seconds) => {
  if (!seconds || seconds <= 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs} giây`;
  if (secs === 0) return `${mins} phút`;
  return `${mins} phút ${secs} giây`;
};

/**
 * CallHistoryItem — Enterprise Timeline Item for Audio & Video Call Records
 */
const CallHistoryItem = ({
  call,
  currentUserId,
  onCallAgain,
  canCallAgain = false,
}) => {
  if (!call) return null;

  const rawCallType = (call.callType || call.type || '').toUpperCase();
  const isVideo = rawCallType === 'VIDEO';
  const isCaller = call.callerId === currentUserId;
  const callTimestamp = call.createdAt || call.startedAt || call.endedAt || Date.now();
  const timeStr = moment(callTimestamp).format('HH:mm');
  const dateStr = moment(callTimestamp).format('DD/MM/YYYY');

  // Status mapping
  const status = (call.status || '').toUpperCase();
  let statusText = 'Cuộc gọi';
  let statusType = 'normal'; // 'success' | 'missed' | 'rejected' | 'failed'
  let IconComponent = isVideo ? Video : Phone;

  switch (status) {
    case 'CONNECTED':
    case 'ENDED':
      statusType = 'success';
      statusText = call.duration > 0 ? formatCallDuration(call.duration) : 'Đã kết nối';
      IconComponent = isVideo ? Video : Phone;
      break;

    case 'MISSED':
      statusType = 'missed';
      statusText = isCaller ? 'Không có phản hồi' : 'Cuộc gọi nhỡ';
      IconComponent = isVideo ? VideoOff : PhoneMissed;
      break;

    case 'REJECTED':
      statusType = 'rejected';
      statusText = isCaller ? 'Đối phương đã từ chối' : 'Đã từ chối';
      IconComponent = isVideo ? VideoOff : PhoneOff;
      break;

    case 'CANCELLED':
      statusType = 'cancelled';
      statusText = 'Cuộc gọi đã hủy';
      IconComponent = isVideo ? VideoOff : PhoneOff;
      break;

    case 'FAILED':
      statusType = 'failed';
      statusText = 'Cuộc gọi thất bại';
      IconComponent = isVideo ? VideoOff : PhoneOff;
      break;

    case 'EXPIRED':
      statusType = 'failed';
      statusText = 'Hết thời gian chờ';
      IconComponent = isVideo ? VideoOff : PhoneOff;
      break;

    default:
      statusText = call.duration > 0 ? formatCallDuration(call.duration) : 'Cuộc gọi kết thúc';
      IconComponent = isVideo ? Video : Phone;
      break;
  }

  const callTypeLabel = isVideo ? 'Cuộc gọi video' : 'Cuộc gọi thoại';

  return (
    <div className={`bc-call-history-row status-${statusType} ${isCaller ? 'is-outgoing' : 'is-incoming'}`}>
      <style>{CALL_HISTORY_STYLES}</style>
      <div className="call-history-card">
        <div className={`call-icon-bubble type-${isVideo ? 'video' : 'audio'} status-${statusType}`}>
          <IconComponent size={18} />
        </div>

        <div className="call-info-body">
          <div className="call-header-line">
            <span className="call-title">{callTypeLabel}</span>
            <span className="call-time">{timeStr}</span>
          </div>

          <div className="call-sub-line">
            <span className={`call-status-badge status-${statusType}`}>
              {statusText}
            </span>
          </div>
        </div>

        {canCallAgain && onCallAgain && (
          <button
            type="button"
            className="btn-call-again"
            onClick={() => onCallAgain(call.callType || 'AUDIO')}
            title={`Gọi lại (${callTypeLabel})`}
            id={`btn-call-again-${call.callId || call.id}`}
          >
            <RotateCcw size={13} />
            <span>Gọi lại</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default CallHistoryItem;
