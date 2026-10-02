import { io } from 'socket.io-client';
import { store } from '../redux/store';

/**
 * ChatSocketService — Singleton Socket.IO Client Manager
 * Manages WebSocket lifecycle, auto-reconnect, room management, and event subscriptions.
 */
class ChatSocketService {
  constructor() {
    this.socket = null;
    this.currentConversationId = null;
    this.connectionState = 'disconnected'; // 'connected' | 'connecting' | 'disconnected'
    this.listeners = new Map(); // event -> Set of callbacks
    this.activeToken = null;
  }

  /**
   * Register an event listener
   * Returns an unsubscribe function for React useEffect cleanup
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);

    return () => {
      const cbs = this.listeners.get(event);
      if (cbs) {
        cbs.delete(callback);
        if (cbs.size === 0) {
          this.listeners.delete(event);
        }
      }
    };
  }

  /**
   * Notify local subscribers
   */
  notifyListeners(event, data) {
    const cbs = this.listeners.get(event);
    if (cbs) {
      cbs.forEach((cb) => {
        try {
          cb(data);
        } catch (err) {
          console.error(`Error in socket listener for ${event}:`, err);
        }
      });
    }
  }

  /**
   * Connect or return existing active socket
   */
  connect() {
    const state = store.getState();
    const token = state.user?.accessToken;

    if (!token) {
      this.disconnect();
      return null;
    }

    // If socket exists and token changed (e.g. relogin with another user)
    if (this.socket && this.activeToken !== token) {
      this.disconnect();
    }

    if (this.socket && (this.socket.connected || this.connectionState === 'connecting')) {
      return this.socket;
    }

    this.activeToken = token;
    const backendUrl =
      (window.location.port === '80' || !window.location.port)
        ? window.location.origin
        : (import.meta.env.VITE_BACKEND_URL || window.location.origin);
    this.connectionState = 'connecting';
    this.notifyListeners('connection_change', this.connectionState);

    this.socket = io(backendUrl, {
      path: '/socket.io/',
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    this.socket.on('connect', () => {
      this.connectionState = 'connected';
      this.notifyListeners('connection_change', 'connected');

      // Re-join conversation room if reconnecting
      if (this.currentConversationId) {
        this.joinConversation(this.currentConversationId);
      }
    });

    this.socket.on('disconnect', (reason) => {
      this.connectionState = 'disconnected';
      this.notifyListeners('connection_change', 'disconnected');
    });

    this.socket.on('connect_error', (err) => {
      this.connectionState = 'disconnected';
      this.notifyListeners('connection_change', 'disconnected');
      this.notifyListeners('chat:error', { message: err?.message || 'Không thể kết nối máy chủ chat.' });
    });

    // Register handlers for server-emitted events
    const events = [
      'chat:message:new',
      'chat:message:read',
      'chat:typing',
      'chat:conversation:updated',
      'chat:error',
      // WebRTC Call events
      'call:incoming',
      'call:ringing',
      'call:accepted',
      'call:rejected',
      'call:cancelled',
      'call:ended',
      'call:timeout',
      'call:busy',
      'call:signal:offer',
      'call:signal:answer',
      'call:signal:ice-candidate',
      'call:signal:media-state',
      'call:error',
      // Global Notification events
      'notification:new',
      'notification:updated',
      'notification:read-all',
    ];

    events.forEach((evt) => {
      this.socket.on(evt, (data) => {
        this.notifyListeners(evt, data);
      });
    });

    return this.socket;
  }

  /**
   * Disconnect and cleanup
   */
  disconnect() {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.currentConversationId = null;
    this.activeToken = null;
    this.connectionState = 'disconnected';
    this.notifyListeners('connection_change', 'disconnected');
  }

  /**
   * Join a conversation room
   */
  joinConversation(conversationId) {
    this.currentConversationId = conversationId;
    const socket = this.connect();
    if (!socket) return Promise.reject(new Error('No socket connection'));

    return new Promise((resolve, reject) => {
      socket.emit('chat:conversation:join', { conversationId }, (response) => {
        if (response && response.success) {
          resolve(response);
        } else {
          reject(new Error(response?.error || 'Không thể tham gia cuộc trò chuyện.'));
        }
      });
    });
  }

  /**
   * Leave conversation room
   */
  leaveConversation(conversationId) {
    if (this.currentConversationId === conversationId) {
      this.currentConversationId = null;
    }
    if (this.socket && this.socket.connected) {
      this.socket.emit('chat:conversation:leave', { conversationId });
    }
  }

  /**
   * Send a message through socket (Persist before broadcast handled on server)
   */
  sendMessage({ conversationId, clientMessageId, content, messageType = 'TEXT' }) {
    const socket = this.connect();
    if (!socket || !socket.connected) {
      return Promise.reject(new Error('Chưa kết nối tới máy chủ thời gian thực.'));
    }

    return new Promise((resolve, reject) => {
      socket.emit(
        'chat:message:send',
        { conversationId, clientMessageId, content, messageType },
        (response) => {
          if (response && response.success) {
            resolve(response.data);
          } else {
            reject(new Error(response?.error || 'Gửi tin nhắn thất bại.'));
          }
        }
      );
    });
  }

  /**
   * Mark messages in conversation as read
   */
  markAsRead(conversationId) {
    const socket = this.connect();
    if (!socket || !socket.connected) return;

    socket.emit('chat:message:read', { conversationId }, (response) => {
      if (response && response.success) {
        this.notifyListeners('chat:message:read', {
          conversationId,
          readAt: response.data.readAt,
        });
      }
    });
  }

  /**
   * Send typing status
   */
  sendTyping(conversationId, isTyping) {
    const socket = this.connect();
    if (!socket || !socket.connected) return;

    socket.emit('chat:typing', { conversationId, isTyping: Boolean(isTyping) });
  }

  /**
   * WebRTC Call Signaling Methods
   */
  initiateCall({ bookingId, receiverId, callType = 'VIDEO' }) {
    const socket = this.connect();
    if (!socket || !socket.connected) {
      return Promise.reject(new Error('Chưa kết nối tới máy chủ cuộc gọi.'));
    }
    return new Promise((resolve, reject) => {
      socket.emit('call:initiate', { bookingId, receiverId, callType }, (res) => {
        if (res && res.success) {
          resolve(res.data);
        } else {
          reject(new Error(res?.error || 'Không thể bắt đầu cuộc gọi.'));
        }
      });
    });
  }

  acceptCall(callId) {
    const socket = this.connect();
    if (!socket || !socket.connected) return Promise.reject(new Error('Không có kết nối'));
    return new Promise((resolve, reject) => {
      socket.emit('call:accept', { callId }, (res) => {
        if (res && res.success) resolve(res.data);
        else reject(new Error(res?.error || 'Không thể chấp nhận cuộc gọi.'));
      });
    });
  }

  rejectCall(callId, reason = 'REJECTED') {
    const socket = this.connect();
    if (!socket || !socket.connected) return Promise.resolve();
    return new Promise((resolve) => {
      socket.emit('call:reject', { callId, reason }, (res) => {
        resolve(res);
      });
    });
  }

  cancelCall(callId) {
    const socket = this.connect();
    if (!socket || !socket.connected) return Promise.resolve();
    return new Promise((resolve) => {
      socket.emit('call:cancel', { callId }, (res) => {
        resolve(res);
      });
    });
  }

  endCall(callId, reason = 'NORMAL') {
    const socket = this.connect();
    if (!socket || !socket.connected) return Promise.resolve();
    return new Promise((resolve) => {
      socket.emit('call:end', { callId, reason }, (res) => {
        resolve(res);
      });
    });
  }

  sendSignalOffer(callId, sdp) {
    const socket = this.connect();
    if (socket && socket.connected) {
      socket.emit('call:signal:offer', { callId, sdp });
    }
  }

  sendSignalAnswer(callId, sdp) {
    const socket = this.connect();
    if (socket && socket.connected) {
      socket.emit('call:signal:answer', { callId, sdp });
    }
  }

  sendSignalIceCandidate(callId, candidate) {
    const socket = this.connect();
    if (socket && socket.connected) {
      socket.emit('call:signal:ice-candidate', { callId, candidate });
    }
  }

  sendSignalConnected(callId) {
    const socket = this.connect();
    if (socket && socket.connected) {
      socket.emit('call:signal:connected', { callId });
    }
  }

  sendSignalMediaState(callId, { audioMuted, videoMuted }) {
    const socket = this.connect();
    if (socket && socket.connected) {
      socket.emit('call:signal:media-state', { callId, audioMuted, videoMuted });
    }
  }

  /**
   * Get current connection state
   */
  getConnectionState() {
    return this.connectionState;
  }
}

const chatSocketService = new ChatSocketService();
export default chatSocketService;
