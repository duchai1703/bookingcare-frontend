import React from 'react';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { useCall } from './CallContext';
import CallParticipant from './CallParticipant';
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

  return (
    <div className="incoming-call-modal-overlay" role="dialog" aria-modal="true" aria-label="Cuộc gọi đến">
      <div className="incoming-call-card">
        {/* Unified Call Participant Info on Perfect Center Axis */}
        <CallParticipant
          avatar={callerAvatar}
          name={callerName || 'Người dùng'}
          role={callerRole}
          bookingId={bookingId}
          callType={callType}
          showCallType={true}
          status="ringing"
          pulseRing={true}
          avatarSize={104}
        />

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
