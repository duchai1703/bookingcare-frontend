// src/containers/Call/ActiveCallModal.jsx
import React, { useRef, useEffect } from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff } from 'lucide-react';
import { useCall } from './CallContext';
import Avatar from '../../components/Common/Avatar';
import './Call.scss';

const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const ActiveCallModal = () => {
  const {
    activeCall,
    callStatus,
    callDuration,
    localStream,
    remoteStream,
    isAudioMuted,
    isVideoMuted,
    toggleMic,
    toggleCamera,
    endActiveCall,
  } = useCall();

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);

  // Attach local stream to local video element
  useEffect(() => {
    if (localVideoRef.current) {
      if (localStream) {
        localVideoRef.current.srcObject = localStream;
      } else {
        localVideoRef.current.srcObject = null;
      }
    }
  }, [localStream]);

  // Attach remote stream to remote video element
  useEffect(() => {
    if (remoteVideoRef.current) {
      if (remoteStream) {
        remoteVideoRef.current.srcObject = remoteStream;
      } else {
        remoteVideoRef.current.srcObject = null;
      }
    }
  }, [remoteStream]);

  // [FIX] Attach remote stream to hidden audio element — ensures audio playback
  // for BOTH audio-only and video calls.
  useEffect(() => {
    if (remoteAudioRef.current) {
      if (remoteStream) {
        remoteAudioRef.current.srcObject = remoteStream;
        remoteAudioRef.current.play().catch(() => {});
      } else {
        remoteAudioRef.current.srcObject = null;
      }
    }
  }, [remoteStream]);

  if (!activeCall) return null;

  const {
    partnerName,
    partnerAvatar,
    partnerRole,
    callType = 'VIDEO',
    bookingId,
    isCaller,
  } = activeCall;

  const isVideo = callType === 'VIDEO';
  const roleLabel = partnerRole === 'R2' ? 'Bác sĩ' : 'Bệnh nhân';

  // Determine status display
  let statusText = 'Đang kết nối...';
  let statusClass = 'connecting';
  if (callStatus === 'RINGING') {
    statusText = isCaller ? 'Đang đổ chuông...' : 'Cuộc gọi đến...';
    statusClass = 'ringing';
  } else if (callStatus === 'CONNECTED') {
    statusText = formatDuration(callDuration);
    statusClass = 'connected';
  } else if (callStatus === 'DISCONNECTED') {
    statusText = 'Mất kết nối';
    statusClass = 'disconnected';
  } else if (callStatus === 'ENDED') {
    statusText = 'Cuộc gọi đã kết thúc';
    statusClass = 'ended';
  }

  const hasRemoteVideo =
    isVideo &&
    remoteStream &&
    remoteStream.getVideoTracks &&
    remoteStream.getVideoTracks().length > 0 &&
    remoteStream.getVideoTracks().some((t) => t.enabled);

  return (
    <div className="active-call-modal-overlay">
      <div className="active-call-container">
        {/* Hidden audio element — always plays remote audio stream */}
        <audio
          ref={remoteAudioRef}
          autoPlay
          playsInline
          style={{ display: 'none' }}
          id="remote-audio-player"
        />

        {/* Top Header Bar */}
        <div className="call-top-bar">
          <div className="partner-info">
            <Avatar
              src={partnerAvatar}
              name={partnerName || 'User'}
              size={40}
            />
            <div className="name-wrapper">
              <h4 className="partner-name-display">{partnerName || 'Đối tác'}</h4>
              <p className="call-subtitle">
                {roleLabel} • Lịch khám #{bookingId}
              </p>
            </div>
          </div>

          <div className="status-pill">
            <span className={`status-dot ${statusClass}`} />
            <span>{statusText}</span>
          </div>
        </div>

        {/* Video Stage Area */}
        <div className="video-stage-area">
          {hasRemoteVideo ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="remote-video-element"
              id="remote-video-feed"
            />
          ) : (
            <div className="remote-audio-placeholder">
              <div
                className={`avatar-huge-wrapper ${
                  callStatus === 'CONNECTED' ? 'talking' : ''
                }`}
              >
                <Avatar
                  src={partnerAvatar}
                  name={partnerName || 'User'}
                  size={104}
                  pulseRing={callStatus === 'RINGING'}
                />
              </div>
              <h3 style={{ color: '#f8fafc', margin: '12px 0 4px', fontSize: '1.25rem' }}>{partnerName}</h3>
              <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>
                {callStatus === 'RINGING' ? 'Đang đợi trả lời...' : 'Cuộc gọi thoại bảo mật P2P'}
              </p>
              {callStatus === 'CONNECTED' && (
                <div className="audio-wave-animation">
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
              )}
            </div>
          )}

          {/* Local Picture-in-Picture Preview */}
          {isVideo && (
            <div className="local-pip-wrapper">
              {!isVideoMuted ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="local-video-element"
                  id="local-video-preview"
                />
              ) : (
                <div className="local-video-off">
                  <VideoOff size={20} />
                  <span className="ml-1">Camera tắt</span>
                </div>
              )}
              <span className="pip-label">Bạn</span>
            </div>
          )}
        </div>

        {/* Bottom Call Controls */}
        <div className="call-bottom-controls">
          {/* Mute Mic */}
          <button
            type="button"
            className={`ctrl-btn ${isAudioMuted ? 'muted' : ''}`}
            onClick={toggleMic}
            title={isAudioMuted ? 'Bật micro' : 'Tắt micro'}
            id="btn-toggle-mic"
            aria-label={isAudioMuted ? 'Bật micro' : 'Tắt micro'}
          >
            {isAudioMuted ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          {/* Toggle Camera */}
          {isVideo && (
            <button
              type="button"
              className={`ctrl-btn ${isVideoMuted ? 'off' : ''}`}
              onClick={toggleCamera}
              title={isVideoMuted ? 'Bật camera' : 'Tắt camera'}
              id="btn-toggle-camera"
              aria-label={isVideoMuted ? 'Bật camera' : 'Tắt camera'}
            >
              {isVideoMuted ? <VideoOff size={20} /> : <Video size={20} />}
            </button>
          )}

          {/* Hang up / Cancel */}
          <button
            type="button"
            className="ctrl-btn btn-hangup"
            onClick={endActiveCall}
            title="Kết thúc cuộc gọi"
            id="btn-end-active-call"
            aria-label="Kết thúc cuộc gọi"
          >
            <PhoneOff size={22} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActiveCallModal;
