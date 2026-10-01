// src/containers/Call/IncomingCallModal.jsx
import React from 'react';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { useCall } from './CallContext';
import Avatar from '../../components/Common/Avatar';
import './Call.scss';

const IncomingCallModal = () => {
  const { incomingCall, acceptIncomingCall, rejectIncomingCall } = useCall();

  if (!incomingCall) return null;

  const {
    callerName,
    callerAvatar,
    callerRole,
    callType = 'VIDEO',
    bookingId,
  } = incomingCall;

  const isVideo = callType === 'VIDEO';
  const roleLabel = callerRole === 'R2' ? 'Bác sĩ' : 'Bệnh nhân';

  return (
    <div className="incoming-call-modal-overlay" role="dialog" aria-modal="true" aria-label="Cuộc gọi đến">
      <div className="incoming-call-card">
        {/* Caller Avatar with Pulse Ring */}
        <div className="caller-avatar-wrapper">
          <Avatar
            src={callerAvatar}
            name={callerName || 'User'}
            size={104}
            pulseRing={true}
            status="ringing"
          />
        </div>

        {/* Caller Identity */}
        <h3 className="caller-name">{callerName || 'Người dùng'}</h3>
        <p className="caller-role-booking">
          {roleLabel} • Lịch khám #{bookingId}
        </p>

        {/* Call Type Badge (Isolated block with clear spacing) */}
        <div className="call-type-pill">
          {isVideo ? <Video size={16} className="pill-icon" /> : <Phone size={16} className="pill-icon" />}
          <span className="pill-text">
            {isVideo ? 'Cuộc gọi video sau khám' : 'Cuộc gọi thoại sau khám'}
          </span>
        </div>

        {/* Action Buttons: Reject (Left) & Accept (Right) */}
        <div className="actions-row">
          {/* Reject Call */}
          <button
            type="button"
            className="btn-call-action reject"
            onClick={rejectIncomingCall}
            id="btn-reject-incoming-call"
            aria-label="Từ chối cuộc gọi"
          >
            <div className="action-circle reject">
              <PhoneOff size={28} />
            </div>
            <span className="action-text">Từ chối</span>
          </button>

          {/* Accept Call */}
          <button
            type="button"
            className="btn-call-action accept"
            onClick={acceptIncomingCall}
            id="btn-accept-incoming-call"
            aria-label="Trả lời cuộc gọi"
          >
            <div className="action-circle accept">
              {isVideo ? <Video size={28} /> : <Phone size={28} />}
            </div>
            <span className="action-text">Trả lời</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallModal;
