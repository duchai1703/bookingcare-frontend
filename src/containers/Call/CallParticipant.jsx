// src/containers/Call/CallParticipant.jsx
import React from 'react';
import { Phone, Video } from 'lucide-react';
import Avatar from '../../components/Common/Avatar';
import './CallParticipant.scss';

/**
 * CallParticipant — Single Center-Axis Component for Caller / Callee Identity
 * Reusable across Incoming Call Modal, Active Call Audio Placeholder, and Video Calls.
 * Guarantees 100% vertical center-alignment of Avatar, Name, Role, Booking ID, and Call Type.
 */
const CallParticipant = ({
  avatar,
  name,
  role,
  bookingId,
  callType = 'VIDEO',
  showCallType = true,
  status = null,
  pulseRing = false,
  avatarSize = 104,
  subTitle = null,
  className = '',
}) => {
  const isVideo = String(callType).toUpperCase() === 'VIDEO';

  // Normalize role label
  let roleLabel = 'Người dùng';
  if (role === 'R2' || role === 'Bác sĩ' || role === 'Doctor') {
    roleLabel = 'Bác sĩ';
  } else if (role === 'R3' || role === 'Bệnh nhân' || role === 'Patient') {
    roleLabel = 'Bệnh nhân';
  } else if (typeof role === 'string' && role.trim()) {
    roleLabel = role;
  }

  const callTypeLabel = isVideo ? 'Cuộc gọi video sau khám' : 'Cuộc gọi thoại sau khám';

  return (
    <div className={`call-participant-root ${className}`}>
      {/* 1. Center Avatar Block */}
      <div className="participant-avatar-container">
        <Avatar
          src={avatar}
          name={name || 'User'}
          size={avatarSize}
          pulseRing={pulseRing}
          status={status}
        />
      </div>

      {/* 2. Center Identity Info (Name, Role & Booking ID) */}
      <div className="participant-meta-container">
        <h3 className="participant-display-name" title={name || 'Người dùng'}>
          {name || 'Người dùng'}
        </h3>

        <div className="participant-role-line">
          <span className="role-text">{roleLabel}</span>
          {bookingId && (
            <>
              <span className="dot-divider">•</span>
              <span className="booking-ref">Lịch khám #{bookingId}</span>
            </>
          )}
        </div>

        {subTitle && <p className="participant-extra-subtitle">{subTitle}</p>}
      </div>

      {/* 3. Center Call Type Badge / Pill */}
      {showCallType && (
        <div className={`call-type-center-pill type-${isVideo ? 'video' : 'audio'}`}>
          <div className="type-icon-box">
            {isVideo ? <Video size={16} /> : <Phone size={16} />}
          </div>
          <span className="type-label-text">{callTypeLabel}</span>
        </div>
      )}
    </div>
  );
};

export default CallParticipant;
