// src/containers/Call/IncomingCallModal.jsx
import React from 'react';
import { useCall } from './CallContext';
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
    <div className="incoming-call-modal-overlay">
      <div className="incoming-call-card">
        <div className="caller-avatar-wrapper">
          <div className="avatar-pulse-ring" />
          {callerAvatar ? (
            <img src={callerAvatar} alt={callerName} className="caller-avatar" />
          ) : (
            <div className="avatar-placeholder">
              {callerName ? callerName.charAt(0).toUpperCase() : 'U'}
            </div>
          )}
          <div className="call-type-badge">
            <i className={`fas ${isVideo ? 'fa-video' : 'fa-phone-alt'}`} />
          </div>
        </div>

        <h3 className="caller-name">{callerName || 'Người dùng'}</h3>
        <p className="caller-role-booking">
          {roleLabel} • Lịch khám #{bookingId}
        </p>
        <span className="call-type-label">
          <i className={`fas ${isVideo ? 'fa-video' : 'fa-phone-alt'} mr-1`} />
          {isVideo ? 'Cuộc gọi Video sau khám' : 'Cuộc gọi Thoại sau khám'}
        </span>

        <div className="actions-row">
          <button
            type="button"
            className="btn-call-action reject"
            onClick={rejectIncomingCall}
            id="btn-reject-incoming-call"
            title="Từ chối cuộc gọi"
          >
            <div className="action-circle reject">
              <i className="fas fa-phone-slash" />
            </div>
            <span className="action-text">Từ chối</span>
          </button>

          <button
            type="button"
            className="btn-call-action accept"
            onClick={acceptIncomingCall}
            id="btn-accept-incoming-call"
            title="Trả lời cuộc gọi"
          >
            <div className="action-circle accept">
              <i className={`fas ${isVideo ? 'fa-video' : 'fa-phone-alt'}`} />
            </div>
            <span className="action-text">Trả lời</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallModal;
