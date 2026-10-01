import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import chatSocketService from '../../services/chatSocketService';
import { getIceServers } from '../../services/chatApiService';
import { soundSynthesizer, WebRTCManager } from '../../services/webrtcService';
import IncomingCallModal from './IncomingCallModal';
import ActiveCallModal from './ActiveCallModal';

const CallContext = createContext(null);

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return context;
};

export const CallProvider = ({ children }) => {
  // [Fix Multi-Tab] Only connect socket and fetch ICE when user is authenticated
  const isLoggedIn = useSelector((state) => state.user?.isLoggedIn);

  const [activeCall, setActiveCall] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [callStatus, setCallStatus] = useState(null); // 'RINGING' | 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'ENDED'
  const [callDuration, setCallDuration] = useState(0);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const webrtcManagerRef = useRef(null);
  const durationTimerRef = useRef(null);
  const iceServersRef = useRef([{ urls: 'stun:stun.l.google.com:19302' }]);

  // Load ICE servers configuration on mount — only when authenticated
  useEffect(() => {
    if (!isLoggedIn) return;

    getIceServers()
      .then((res) => {
        if (res?.data?.errCode === 0 && res?.data?.data?.iceServers) {
          iceServersRef.current = res.data.data.iceServers;
        }
      })
      .catch(() => {
        // Fallback STUN is already set
      });
  }, [isLoggedIn]);

  // Duration Timer when CONNECTED
  useEffect(() => {
    if (callStatus === 'CONNECTED') {
      setCallDuration(0);
      durationTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
        durationTimerRef.current = null;
      }
    }
    return () => {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
      }
    };
  }, [callStatus]);

  // Safe Cleanup
  const cleanupCallSession = useCallback(() => {
    soundSynthesizer.stopAllSounds();

    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }

    if (webrtcManagerRef.current) {
      webrtcManagerRef.current.close();
      webrtcManagerRef.current = null;
    }

    setLocalStream(null);
    setRemoteStream(null);
    setIsAudioMuted(false);
    setIsVideoMuted(false);
    setCallDuration(0);
  }, []);

  // Finish call with brief UI display
  const finishCall = useCallback(
    (reasonText = null) => {
      setCallStatus('ENDED');
      cleanupCallSession();
      setTimeout(() => {
        setActiveCall(null);
        setCallStatus(null);
        setErrorMessage(null);
      }, 1500);
    },
    [cleanupCallSession]
  );

  // ─────────────────────────────────────────────────────────────
  // SOCKET EVENT LISTENERS (Global Incoming & Signaling Manager)
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    // [Fix Multi-Tab] Don't connect socket when not authenticated
    if (!isLoggedIn) return;

    // Ensure socket is connected
    chatSocketService.connect();

    const unsubIncoming = chatSocketService.on('call:incoming', (data) => {
      // Backend sends flat structure: { callId, bookingId, callType, caller, booking }
      const { callId: inCallId, bookingId: inBookingId, callType: inCallType, caller, booking } = data;
      // If already in active call, ignore or auto-reject as busy
      if (activeCall) {
        chatSocketService.rejectCall(inCallId, 'BUSY');
        return;
      }

      setIncomingCall({
        callId: inCallId,
        bookingId: inBookingId,
        callerId: caller?.id,
        callerName: caller ? `${caller.firstName || ''} ${caller.lastName || ''}`.trim() : 'Người dùng',
        callerAvatar: caller?.image?.data
          ? `data:image/jpeg;base64,${btoa(
              String.fromCharCode.apply(null, new Uint8Array(caller.image.data))
            )}`
          : null,
        callerRole: caller?.roleId,
        callType: inCallType,
      });

      soundSynthesizer.startIncomingRinging();
    });

    const unsubRinging = chatSocketService.on('call:ringing', () => {
      setCallStatus('RINGING');
    });

    const unsubAccepted = chatSocketService.on('call:accepted', async (data) => {
      soundSynthesizer.stopAllSounds();
      setCallStatus('CONNECTING');

      // As Caller, generate offer now
      if (webrtcManagerRef.current) {
        try {
          const offer = await webrtcManagerRef.current.createOffer();
          chatSocketService.sendSignalOffer(data.callId, offer);
        } catch (err) {
          console.error('Error generating offer on accept:', err);
        }
      }
    });

    const unsubOffer = chatSocketService.on('call:signal:offer', async (data) => {
      if (webrtcManagerRef.current) {
        try {
          const answer = await webrtcManagerRef.current.handleOffer(data.sdp);
          if (answer) {
            chatSocketService.sendSignalAnswer(data.callId, answer);
          }
        } catch (err) {
          console.error('Error handling offer:', err);
        }
      }
    });

    const unsubAnswer = chatSocketService.on('call:signal:answer', async (data) => {
      if (webrtcManagerRef.current) {
        try {
          await webrtcManagerRef.current.handleAnswer(data.sdp);
        } catch (err) {
          console.error('Error handling answer:', err);
        }
      }
    });

    const unsubIce = chatSocketService.on('call:signal:ice-candidate', async (data) => {
      if (webrtcManagerRef.current) {
        try {
          await webrtcManagerRef.current.addIceCandidate(data.candidate);
        } catch (err) {
          console.error('Error adding remote ice candidate:', err);
        }
      }
    });

    const unsubRejected = chatSocketService.on('call:rejected', () => {
      soundSynthesizer.playBusyTone();
      finishCall('Cuộc gọi bị từ chối');
    });

    const unsubCancelled = chatSocketService.on('call:cancelled', () => {
      soundSynthesizer.stopAllSounds();
      setIncomingCall(null);
      finishCall('Cuộc gọi đã bị người gọi hủy');
    });

    const unsubEnded = chatSocketService.on('call:ended', () => {
      soundSynthesizer.stopAllSounds();
      finishCall('Cuộc gọi đã kết thúc');
    });

    const unsubTimeout = chatSocketService.on('call:timeout', () => {
      soundSynthesizer.playBusyTone();
      setIncomingCall(null);
      finishCall('Không có phản hồi');
    });

    const unsubBusy = chatSocketService.on('call:busy', () => {
      soundSynthesizer.playBusyTone();
      finishCall('Người dùng đang bận trong cuộc gọi khác');
    });

    return () => {
      unsubIncoming();
      unsubRinging();
      unsubAccepted();
      unsubOffer();
      unsubAnswer();
      unsubIce();
      unsubRejected();
      unsubCancelled();
      unsubEnded();
      unsubTimeout();
      unsubBusy();
    };
  }, [isLoggedIn, activeCall, finishCall]);

  // ─────────────────────────────────────────────────────────────
  // CALL ACTIONS
  // ─────────────────────────────────────────────────────────────

  /**
   * Initiate Outgoing Audio / Video Call
   */
  const initiateCall = async ({
    bookingId,
    receiverId,
    callType = 'VIDEO',
    partnerName,
    partnerAvatar,
    partnerRole,
  }) => {
    if (activeCall) return;

    let createdCallId = null;
    let acquiredStream = null;

    try {
      setErrorMessage(null);

      // STEP 1: Verify browser media capabilities & acquire local media FIRST
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Trình duyệt của bạn không hỗ trợ gọi âm thanh/video WebRTC.');
      }

      const tempManager = new WebRTCManager({
        callId: 'temp',
        isCaller: true,
        callType,
        iceServers: iceServersRef.current,
      });

      try {
        acquiredStream = await tempManager.acquireLocalStream(callType);
      } catch (mediaErr) {
        let msg = 'Không thể truy cập Microphone/Camera.';
        if (mediaErr.name === 'NotAllowedError' || mediaErr.name === 'PermissionDeniedError') {
          msg = 'Vui lòng cho phép quyền truy cập Microphone và Camera trên trình duyệt để gọi.';
        } else if (mediaErr.name === 'NotFoundError' || mediaErr.name === 'DevicesNotFoundError') {
          msg = 'Không tìm thấy thiết bị Microphone hoặc Camera trên máy tính của bạn.';
        }
        throw new Error(msg);
      }

      // STEP 2: Call backend initiate (only after media device is confirmed accessible)
      const resData = await chatSocketService.initiateCall({
        bookingId,
        receiverId,
        callType: tempManager.callType,
      });

      // Backend ack returns { success: true, data: sessionObject }
      // chatSocketService.initiateCall resolves with res.data → sessionObject directly
      createdCallId = resData.callId;

      // STEP 3: Create permanent manager and transfer local stream
      const manager = new WebRTCManager({
        callId: createdCallId,
        isCaller: true,
        callType: tempManager.callType,
        iceServers: iceServersRef.current,
        onRemoteStream: (stream) => {
          setRemoteStream(stream);
        },
        onConnectionStateChange: (state) => {
          if (state === 'connected') {
            soundSynthesizer.stopAllSounds();
            setCallStatus('CONNECTED');
            chatSocketService.sendSignalConnected(createdCallId);
          } else if (state === 'disconnected' || state === 'failed') {
            setCallStatus('DISCONNECTED');
          }
        },
        onIceCandidate: (candidate) => {
          chatSocketService.sendSignalIceCandidate(createdCallId, candidate);
        },
        onError: (err) => {
          console.error('WebRTC Manager error:', err);
        },
      });

      manager.localStream = acquiredStream;
      webrtcManagerRef.current = manager;
      setLocalStream(acquiredStream);

      setActiveCall({
        callId: createdCallId,
        bookingId,
        partnerName,
        partnerAvatar,
        partnerRole,
        callType: tempManager.callType,
        isCaller: true,
      });

      setCallStatus('RINGING');
      soundSynthesizer.startOutgoingRinging();

      manager.initPeerConnection();
    } catch (err) {
      console.error('initiateCall failed:', err);
      soundSynthesizer.stopAllSounds();

      // Clean up local media stream tracks if acquired
      if (acquiredStream) {
        acquiredStream.getTracks().forEach((t) => {
          try { t.stop(); } catch (e) {}
        });
      }

      // If backend session was created before error, cancel it immediately!
      if (createdCallId) {
        try {
          await chatSocketService.cancelCall(createdCallId);
        } catch (cErr) {}
      }

      cleanupCallSession();
      setActiveCall(null);
      setCallStatus(null);
      const msg = err.message || 'Không thể bắt đầu cuộc gọi.';
      setErrorMessage(msg);
      toast.error(msg);
    }
  };

  /**
   * Accept Incoming Call
   */
  const acceptIncomingCall = async () => {
    if (!incomingCall) return;

    soundSynthesizer.stopAllSounds();
    const { callId, bookingId, callerName, callerAvatar, callerRole, callType } = incomingCall;

    try {
      setIncomingCall(null);
      setCallStatus('CONNECTING');

      setActiveCall({
        callId,
        bookingId,
        partnerName: callerName,
        partnerAvatar: callerAvatar,
        partnerRole: callerRole,
        callType,
        isCaller: false,
      });

      // 1. Notify server
      await chatSocketService.acceptCall(callId);

      // 2. Create WebRTC Manager
      const manager = new WebRTCManager({
        callId,
        isCaller: false,
        callType,
        iceServers: iceServersRef.current,
        onRemoteStream: (stream) => {
          setRemoteStream(stream);
        },
        onConnectionStateChange: (state) => {
          if (state === 'connected') {
            setCallStatus('CONNECTED');
            chatSocketService.sendSignalConnected(callId);
          } else if (state === 'disconnected' || state === 'failed') {
            setCallStatus('DISCONNECTED');
          }
        },
        onIceCandidate: (candidate) => {
          chatSocketService.sendSignalIceCandidate(callId, candidate);
        },
        onError: (err) => {
          console.error('WebRTC Manager error:', err);
        },
      });

      webrtcManagerRef.current = manager;

      // 3. Acquire local media stream
      const stream = await manager.acquireLocalStream(callType);
      setLocalStream(stream);
      manager.initPeerConnection();
    } catch (err) {
      console.error('acceptIncomingCall error:', err);
      finishCall('Không thể kết nối cuộc gọi');
    }
  };

  /**
   * Reject Incoming Call
   */
  const rejectIncomingCall = async () => {
    if (!incomingCall) return;
    soundSynthesizer.stopAllSounds();
    const callId = incomingCall.callId;
    setIncomingCall(null);
    await chatSocketService.rejectCall(callId, 'REJECTED');
  };

  /**
   * End or Cancel Active Call
   */
  const endActiveCall = async () => {
    if (!activeCall) return;

    const callId = activeCall.callId;
    if (callStatus === 'RINGING' && activeCall.isCaller) {
      await chatSocketService.cancelCall(callId);
    } else {
      await chatSocketService.endCall(callId, 'NORMAL');
    }

    finishCall();
  };

  /**
   * Toggle Microphone Mute
   */
  const toggleMic = () => {
    if (webrtcManagerRef.current) {
      const nextMuted = !isAudioMuted;
      webrtcManagerRef.current.toggleAudio(!nextMuted);
      setIsAudioMuted(nextMuted);
      if (activeCall) {
        chatSocketService.sendSignalMediaState(activeCall.callId, {
          audioMuted: nextMuted,
          videoMuted: isVideoMuted,
        });
      }
    }
  };

  /**
   * Toggle Camera Off/On
   */
  const toggleCamera = () => {
    if (webrtcManagerRef.current) {
      const nextMuted = !isVideoMuted;
      webrtcManagerRef.current.toggleVideo(!nextMuted);
      setIsVideoMuted(nextMuted);
      if (activeCall) {
        chatSocketService.sendSignalMediaState(activeCall.callId, {
          audioMuted: isAudioMuted,
          videoMuted: nextMuted,
        });
      }
    }
  };

  const value = {
    activeCall,
    incomingCall,
    callStatus,
    callDuration,
    localStream,
    remoteStream,
    isAudioMuted,
    isVideoMuted,
    errorMessage,
    initiateCall,
    acceptIncomingCall,
    rejectIncomingCall,
    endActiveCall,
    toggleMic,
    toggleCamera,
  };

  return (
    <CallContext.Provider value={value}>
      {children}
      <IncomingCallModal />
      <ActiveCallModal />
    </CallContext.Provider>
  );
};

export default CallContext;
