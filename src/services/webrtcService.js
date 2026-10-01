// src/services/webrtcService.js
'use strict';

/**
 * SoundSynthesizer — Pure Web Audio API Tone Synthesizer
 * Provides standard telephony call sounds without requiring external audio assets.
 */
class SoundSynthesizer {
  constructor() {
    this.audioCtx = null;
    this.timer = null;
    this.activeNodes = [];
  }

  getAudioContext() {
    if (!this.audioCtx || this.audioCtx.state === 'closed') {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  playTone(freq1, freq2, durationMs, gainLevel = 0.15) {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const osc1 = ctx.createOscillator();
      const osc2 = freq2 ? ctx.createOscillator() : null;
      const gain = ctx.createGain();

      osc1.frequency.value = freq1;
      if (osc2) osc2.frequency.value = freq2;

      gain.gain.setValueAtTime(gainLevel, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationMs / 1000);

      osc1.connect(gain);
      if (osc2) osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      if (osc2) osc2.start();

      osc1.stop(ctx.currentTime + durationMs / 1000);
      if (osc2) osc2.stop(ctx.currentTime + durationMs / 1000);

      this.activeNodes.push(osc1);
      if (osc2) this.activeNodes.push(osc2);
    } catch (e) {
      console.warn('SoundSynthesizer playTone error:', e);
    }
  }

  /**
   * Outgoing Ringback Tone: 440Hz + 480Hz, 1.5s on, 3s off
   */
  startOutgoingRinging() {
    this.stopAllSounds();
    const playCadence = () => {
      this.playTone(440, 480, 1500, 0.12);
    };
    playCadence();
    this.timer = setInterval(playCadence, 4000);
  }

  /**
   * Incoming Phone Ring Tone: Dual European/US telephone ring cadence
   */
  startIncomingRinging() {
    this.stopAllSounds();
    const playCadence = () => {
      this.playTone(440, 480, 400, 0.2);
      setTimeout(() => {
        this.playTone(440, 480, 400, 0.2);
      }, 500);
    };
    playCadence();
    this.timer = setInterval(playCadence, 3000);
  }

  /**
   * Busy / Call Ended Tone: 480Hz + 620Hz fast beeps
   */
  playBusyTone() {
    this.stopAllSounds();
    let count = 0;
    const playCadence = () => {
      this.playTone(480, 620, 250, 0.15);
      count++;
      if (count >= 4) {
        this.stopAllSounds();
      }
    };
    playCadence();
    this.timer = setInterval(playCadence, 500);
  }

  stopAllSounds() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.activeNodes.forEach((node) => {
      try {
        node.stop();
        node.disconnect();
      } catch (e) {}
    });
    this.activeNodes = [];
  }
}

export const soundSynthesizer = new SoundSynthesizer();

/**
 * WebRTCManager — PeerConnection, ICE Candidate Queue, Media Lifecycle
 */
export class WebRTCManager {
  constructor({
    callId,
    isCaller,
    callType = 'VIDEO',
    iceServers = [],
    onRemoteStream,
    onConnectionStateChange,
    onIceCandidate,
    onError,
  }) {
    this.callId = callId;
    this.isCaller = isCaller;
    this.callType = callType;
    this.iceServers = iceServers && iceServers.length > 0
      ? iceServers
      : [{ urls: 'stun:stun.l.google.com:19302' }];

    this.onRemoteStream = onRemoteStream;
    this.onConnectionStateChange = onConnectionStateChange;
    this.onIceCandidate = onIceCandidate;
    this.onError = onError;

    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = new MediaStream();
    this.iceCandidateQueue = [];
    this.isRemoteDescriptionSet = false;
    this.isClosed = false;

    // Perfect Negotiation attributes
    this.makingOffer = false;
    this.ignoreOffer = false;
    this.isPolite = !isCaller; // Receiver is polite, Caller is impolite
  }

  /**
   * Request user media (audio + video or audio only)
   */
  async acquireLocalStream(callType = this.callType) {
    if (this.localStream) {
      return this.localStream;
    }

    const wantVideo = callType === 'VIDEO';
    const constraints = {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: wantVideo
        ? {
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
            frameRate: { ideal: 24, max: 30 },
            facingMode: 'user',
          }
        : false,
    };

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      return this.localStream;
    } catch (err) {
      // If camera access failed, fallback to audio only if video was requested
      if (wantVideo) {
        console.warn('>>> Video capture failed, falling back to audio only:', err);
        try {
          this.localStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
            video: false,
          });
          this.callType = 'AUDIO';
          return this.localStream;
        } catch (audioErr) {
          console.error('>>> Microphone capture failed:', audioErr);
          throw audioErr;
        }
      }
      throw err;
    }
  }

  /**
   * Initialize PeerConnection
   */
  initPeerConnection() {
    if (this.peerConnection) return;

    const config = {
      iceServers: this.iceServers,
      iceCandidatePoolSize: 2,
    };

    this.peerConnection = new RTCPeerConnection(config);

    // Attach local tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        this.peerConnection.addTrack(track, this.localStream);
      });
    }

    // Handle remote track arrival
    // Use event.streams[0] directly to get a proper MediaStream reference
    // that React can detect as a new value (triggers re-render)
    this.peerConnection.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        // Use the stream from the event directly — this is the correct MediaStream
        this.remoteStream = event.streams[0];
      } else if (event.track) {
        // Fallback: add track to existing stream
        this.remoteStream.addTrack(event.track);
      }
      if (this.onRemoteStream) {
        this.onRemoteStream(this.remoteStream);
      }
    };

    // Handle ICE Candidate generated locally
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.onIceCandidate) {
        this.onIceCandidate(event.candidate);
      }
    };

    // Monitor connection states
    this.peerConnection.onconnectionstatechange = () => {
      if (!this.peerConnection) return;
      const state = this.peerConnection.connectionState;
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange(state);
      }
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      if (!this.peerConnection) return;
      const iceState = this.peerConnection.iceConnectionState;
      if (iceState === 'failed') {
        this.peerConnection.restartIce();
      }
    };
  }

  /**
   * Create and set local SDP Offer
   */
  async createOffer() {
    this.initPeerConnection();
    try {
      this.makingOffer = true;
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: this.callType === 'VIDEO',
      });
      await this.peerConnection.setLocalDescription(offer);
      return this.peerConnection.localDescription;
    } catch (err) {
      console.error('>>> Error creating offer:', err);
      if (this.onError) this.onError(err);
      throw err;
    } finally {
      this.makingOffer = false;
    }
  }

  /**
   * Handle incoming remote SDP Offer and produce SDP Answer
   */
  async handleOffer(sdpOffer) {
    this.initPeerConnection();
    try {
      const offerCollision =
        this.makingOffer || this.peerConnection.signalingState !== 'stable';

      this.ignoreOffer = !this.isPolite && offerCollision;
      if (this.ignoreOffer) {
        console.warn('>>> [WebRTC] Impolite peer ignoring colliding offer');
        return null;
      }

      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(sdpOffer));
      this.isRemoteDescriptionSet = true;
      await this.flushIceCandidateQueue();

      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      return this.peerConnection.localDescription;
    } catch (err) {
      console.error('>>> Error handling offer:', err);
      if (this.onError) this.onError(err);
      throw err;
    }
  }

  /**
   * Handle incoming remote SDP Answer
   */
  async handleAnswer(sdpAnswer) {
    if (!this.peerConnection) return;
    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(sdpAnswer));
      this.isRemoteDescriptionSet = true;
      await this.flushIceCandidateQueue();
    } catch (err) {
      console.error('>>> Error handling answer:', err);
      if (this.onError) this.onError(err);
      throw err;
    }
  }

  /**
   * Add ICE Candidate safely with queueing for candidates arriving before remote description
   */
  async addIceCandidate(candidateInit) {
    if (this.isClosed || !candidateInit) return;

    if (!this.peerConnection || !this.isRemoteDescriptionSet) {
      // Queue until remote description is set
      this.iceCandidateQueue.push(candidateInit);
      return;
    }

    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidateInit));
    } catch (err) {
      if (!this.ignoreOffer) {
        console.warn('>>> addIceCandidate error:', err);
      }
    }
  }

  /**
   * Flush queued candidates after setRemoteDescription
   */
  async flushIceCandidateQueue() {
    if (!this.peerConnection || !this.isRemoteDescriptionSet) return;

    const queue = [...this.iceCandidateQueue];
    this.iceCandidateQueue = [];

    for (const candidate of queue) {
      try {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn('>>> Queued candidate add error:', err);
      }
    }
  }

  /**
   * Toggle Audio Mute
   */
  toggleAudio(enabled) {
    if (!this.localStream) return false;
    this.localStream.getAudioTracks().forEach((track) => {
      track.enabled = enabled;
    });
    return enabled;
  }

  /**
   * Toggle Video Mute / Camera Off
   */
  toggleVideo(enabled) {
    if (!this.localStream) return false;
    this.localStream.getVideoTracks().forEach((track) => {
      track.enabled = enabled;
    });
    return enabled;
  }

  /**
   * Comprehensive Cleanup: Stop tracks, close PeerConnection, clear queues
   */
  close() {
    if (this.isClosed) return;
    this.isClosed = true;

    // 1. Stop local media tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {}
      });
      this.localStream = null;
    }

    // 2. Stop remote media tracks
    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {}
      });
      this.remoteStream = null;
    }

    // 3. Close RTCPeerConnection
    if (this.peerConnection) {
      try {
        this.peerConnection.ontrack = null;
        this.peerConnection.onicecandidate = null;
        this.peerConnection.onconnectionstatechange = null;
        this.peerConnection.oniceconnectionstatechange = null;
        this.peerConnection.close();
      } catch (e) {}
      this.peerConnection = null;
    }

    // 4. Clear queues and state
    this.iceCandidateQueue = [];
    this.isRemoteDescriptionSet = false;
  }
}
