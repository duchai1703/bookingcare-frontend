import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import moment from 'moment';
import { v4 as uuidv4 } from 'uuid';
import {
  Send,
  Lock,
  Unlock,
  AlertTriangle,
  Clock,
  Check,
  RotateCcw,
  User,
  Stethoscope,
  X,
  FileText,
  Phone,
  Video,
} from 'lucide-react';
import { toast } from 'react-toastify';
import chatSocketService from '../../services/chatSocketService';
import {
  getConversationMessages,
  markMessagesAsRead,
  updateConversationStatus,
} from '../../services/chatApiService';
import { useCall } from '../Call/CallContext';
import Avatar from '../../components/Common/Avatar';
import CallHistoryItem from './CallHistoryItem';
import { FEATURES } from '../../config/features';
import './ChatWindow.scss';

const ChatWindow = ({
  conversation,
  workspaceData = null,
  onClose,
  onStatusChange,
  isDrawer = false,
}) => {
  const { userInfo } = useSelector((state) => state.user);
  const isDoctor = userInfo?.roleId === 'R2';

  const [messages, setMessages] = useState([]);
  const [callHistory, setCallHistory] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(chatSocketService.getConnectionState());
  const [currentStatus, setCurrentStatus] = useState(conversation?.status || 'OPEN');

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const textareaRef = useRef(null);

  const onStatusChangeRef = useRef(onStatusChange);
  useEffect(() => {
    onStatusChangeRef.current = onStatusChange;
  });

  const conversationBookingId = conversation?.bookingId || conversation?.bookingData?.id;
  const bookingIdRef = useRef(conversationBookingId);
  useEffect(() => {
    bookingIdRef.current = conversationBookingId;
  });

  const isNearBottomRef = useRef(true);
  const isInitialLoadDoneRef = useRef(false);

  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    // Consider near bottom if within 120px of the bottom
    isNearBottomRef.current = scrollHeight - scrollTop - clientHeight < 120;
  }, []);

  const conversationId = conversation?.id;
  const { initiateCall } = useCall();

  // Sync currentStatus when conversation prop updates
  useEffect(() => {
    if (conversation?.status) {
      setCurrentStatus(conversation.status);
    }
  }, [conversation?.status]);

  // Determine follow-up 7-day window status
  const consultationCompletedAt =
    conversation?.consultationCompletedAt ||
    conversation?.bookingData?.consultationCompletedAt;

  const followUpExpiresAt =
    conversation?.followUpExpiresAt ||
    conversation?.bookingData?.followUpExpiresAt;

  const isFollowUpActive =
    conversation?.isFollowUpActive !== undefined
      ? Boolean(conversation.isFollowUpActive)
      : Boolean(followUpExpiresAt && new Date() < new Date(followUpExpiresAt));

  const isReadOnly =
    conversation?.isReadOnly !== undefined
      ? Boolean(conversation.isReadOnly)
      : !isFollowUpActive;

  // Determine partner details
  const partner = isDoctor
    ? conversation?.patientUser
    : conversation?.doctorUser;

  const partnerName = partner
    ? `${partner.lastName || ''} ${partner.firstName || ''}`.trim() || partner.email
    : isDoctor ? 'Bệnh nhân' : 'Bác sĩ';

  const specialtyName = conversation?.doctorUser?.doctorInfoData?.specialtyData?.name || '';
  const bookingDate = conversation?.bookingData?.date
    ? moment(parseInt(conversation.bookingData.date, 10)).format('DD/MM/YYYY')
    : '';

  const handleStartCall = useCallback((callType) => {
    if (!isFollowUpActive || currentStatus === 'CLOSED' || isReadOnly) {
      toast.warning('Cuộc gọi chỉ khả dụng khi lịch hẹn trong thời hạn 7 ngày và cuộc trò chuyện đang mở.');
      return;
    }
    const receiverId = isDoctor ? conversation.patientId : conversation.doctorId;
    const partnerAvatar = partner?.image || null;

    initiateCall({
      bookingId: conversation.bookingId,
      receiverId,
      callType,
      partnerName,
      partnerAvatar,
      partnerRole: partner?.roleId || (isDoctor ? 'R3' : 'R2'),
    });
  }, [isFollowUpActive, currentStatus, isReadOnly, isDoctor, conversation, partner, partnerName, initiateCall]);

  // 1. Initial Load of Messages & Call History
  const loadMessages = useCallback(async (isSilent = false) => {
    if (!conversationId) return;
    try {
      if (!isSilent) setIsLoading(true);
      const res = await getConversationMessages(conversationId, { limit: 40 });
      if (res && res.errCode === 0 && res.data) {
        setMessages(res.data.messages || []);
        setCallHistory(res.data.callHistory || res.meta?.callHistory || []);
        setHasMore(res.data.hasMore || false);
        setNextCursor(res.data.nextCursor || null);
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
      if (!isSilent) toast.error('Không thể tải tin nhắn.');
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  }, [conversationId]);

  // 2. Load more older messages (cursor pagination)
  const handleLoadMore = async () => {
    if (!nextCursor || isLoadingMore || !conversationId) return;
    try {
      setIsLoadingMore(true);
      const scrollHeightBefore = messagesContainerRef.current?.scrollHeight || 0;

      const res = await getConversationMessages(conversationId, {
        beforeCursor: nextCursor,
        limit: 30,
      });

      if (res && res.errCode === 0 && res.data) {
        setMessages((prev) => [...res.data.messages, ...prev]);
        setHasMore(res.data.hasMore || false);
        setNextCursor(res.data.nextCursor || null);

        // Maintain scroll position after prepending
        setTimeout(() => {
          if (messagesContainerRef.current) {
            const scrollHeightAfter = messagesContainerRef.current.scrollHeight;
            messagesContainerRef.current.scrollTop = scrollHeightAfter - scrollHeightBefore;
          }
        }, 50);
      }
    } catch (err) {
      console.error('Failed to load older messages:', err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // 3. Socket Connection & Event Listeners
  useEffect(() => {
    if (!conversationId) return;

    isInitialLoadDoneRef.current = false;
    chatSocketService.connect();

    // Join conversation room
    chatSocketService.joinConversation(conversationId)
      .then((res) => {
        if (res && res.status) {
          setCurrentStatus(res.status);
        }
      })
      .catch((err) => {
        console.error('Failed to join conversation room:', err);
      });

    // Mark messages as read
    chatSocketService.markAsRead(conversationId);
    markMessagesAsRead(conversationId).catch(() => {});

    // Listen for incoming new messages
    const unsubNewMessage = chatSocketService.on('chat:message:new', (data) => {
      if (data && data.conversationId === conversationId && data.message) {
        setMessages((prev) => {
          const exists = prev.some(
            (m) => m.id === data.message.id || (m.clientMessageId && m.clientMessageId === data.message.clientMessageId)
          );
          if (exists) {
            return prev.map((m) =>
              (m.id === data.message.id || m.clientMessageId === data.message.clientMessageId)
                ? data.message
                : m
            );
          }
          return [...prev, data.message];
        });

        // If message is from partner, mark as read
        if (data.message.senderId !== userInfo?.id) {
          chatSocketService.markAsRead(conversationId);
        }
      }
    });

    // Listen for read receipts
    const unsubMessageRead = chatSocketService.on('chat:message:read', (data) => {
      if (data && data.conversationId === conversationId) {
        setMessages((prev) =>
          prev.map((m) => {
            if (m.senderId === userInfo?.id && !m.readAt) {
              return { ...m, readAt: data.readAt };
            }
            return m;
          })
        );
      }
    });

    // Listen for typing indicator
    const unsubTyping = chatSocketService.on('chat:typing', (data) => {
      if (data && data.conversationId === conversationId && data.userId !== userInfo?.id) {
        setPartnerTyping(Boolean(data.isTyping));
      }
    });

    // Listen for connection changes
    const unsubConn = chatSocketService.on('connection_change', (status) => {
      setConnectionStatus(status);
    });

    // Listen for realtime conversation status changes (OPEN / CLOSED)
    const unsubStatusChange = chatSocketService.on('chat:conversation:status', (data) => {
      if (data && data.conversationId === conversationId && data.status) {
        setCurrentStatus(data.status);
        if (onStatusChangeRef.current) {
          onStatusChangeRef.current(data.status);
        }
      }
    });

    // Listen for realtime Call History records
    const handleCallHistoryRecord = (data) => {
      if (!data) return;
      const dataConvId = data.conversationId ? parseInt(data.conversationId, 10) : null;
      const curConvId = conversationId ? parseInt(conversationId, 10) : null;
      const dataBookId = data.bookingId ? parseInt(data.bookingId, 10) : null;
      const curBookId = bookingIdRef.current ? parseInt(bookingIdRef.current, 10) : null;

      const isMatch =
        (dataConvId && curConvId && dataConvId === curConvId) ||
        (dataBookId && curBookId && dataBookId === curBookId);

      if (isMatch) {
        setCallHistory((prev) => {
          const exists = prev.some(
            (c) =>
              (c.callId && data.callId && c.callId === data.callId) ||
              (c.id && data.callSessionId && c.id === data.callSessionId) ||
              (c.id && data.id && c.id === data.id)
          );
          if (exists) {
            return prev.map((c) =>
              ((c.callId && c.callId === data.callId) ||
                (c.id && (c.id === data.callSessionId || c.id === data.id)))
                ? { ...c, ...data }
                : c
            );
          }
          return [...prev, data];
        });
      }
    };

    const unsubCallHistory = chatSocketService.on('call:history:record', handleCallHistoryRecord);

    // Also auto-refresh call history when signaling completes to guarantee zero-reload parity
    const unsubCallEnded = chatSocketService.on('call:ended', () => {
      setTimeout(() => loadMessages(true), 350);
    });
    const unsubCallCancelled = chatSocketService.on('call:cancelled', () => {
      setTimeout(() => loadMessages(true), 350);
    });
    const unsubCallRejected = chatSocketService.on('call:rejected', () => {
      setTimeout(() => loadMessages(true), 350);
    });
    const unsubCallTimeout = chatSocketService.on('call:timeout', () => {
      setTimeout(() => loadMessages(true), 350);
    });
    const unsubCallMissed = chatSocketService.on('call:missed', () => {
      setTimeout(() => loadMessages(true), 350);
    });

    // Listen for errors
    const unsubError = chatSocketService.on('chat:error', (data) => {
      if (data?.message) {
        toast.warning(data.message);
      }
    });

    loadMessages();

    // Cleanup on unmount or conversation change
    return () => {
      chatSocketService.leaveConversation(conversationId);
      unsubNewMessage();
      unsubMessageRead();
      unsubTyping();
      unsubConn();
      unsubStatusChange();
      unsubCallHistory();
      unsubCallEnded();
      unsubCallCancelled();
      unsubCallRejected();
      unsubCallTimeout();
      unsubCallMissed();
      unsubError();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [conversationId, loadMessages]);

  // Combine and sort messages and call history items chronologically into a single timeline stream
  const timelineItems = useMemo(() => {
    const formattedMessages = messages.map((m) => ({
      ...m,
      _timelineType: 'MESSAGE',
      _sortTime: new Date(m.createdAt).getTime() || 0,
      _key: `msg_${m.id || m.clientMessageId}`,
    }));

    const formattedCalls = callHistory.map((c) => ({
      ...c,
      _timelineType: 'CALL',
      _sortTime: new Date(c.createdAt || c.startedAt || c.endedAt || Date.now()).getTime() || 0,
      _key: `call_${c.callId || c.id}`,
    }));

    return [...formattedMessages, ...formattedCalls].sort((a, b) => a._sortTime - b._sortTime);
  }, [messages, callHistory]);

  // 1. Initial load: immediately jump to bottom with NO smooth animated travel from top
  useEffect(() => {
    if (!isLoading && messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      isInitialLoadDoneRef.current = true;
    }
  }, [isLoading]);

  // 2. Realtime messages arrival: if user is at bottom, keep them at bottom without jarring animations
  useEffect(() => {
    if (!isInitialLoadDoneRef.current || isLoadingMore || !messagesContainerRef.current) return;

    if (isNearBottomRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
    // If user is reading older messages higher up, do NOT force scroll down!
  }, [timelineItems.length, isLoadingMore]);

  // Auto-grow textarea
  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollH = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(Math.max(scrollH, 42), 120)}px`;
    }
  };

  // Handle typing debounce
  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputText(val);
    adjustTextareaHeight();

    if (!conversationId) return;

    chatSocketService.sendTyping(conversationId, true);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      chatSocketService.sendTyping(conversationId, false);
    }, 2000);
  };

  // Handle send message
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || isSending || !conversationId) return;

    if (!isFollowUpActive || isReadOnly) {
      toast.warning('Thời hạn hỗ trợ sau khám 7 ngày đã kết thúc. Không thể gửi tin nhắn mới.');
      return;
    }

    if (currentStatus === 'CLOSED') {
      toast.warning('Cuộc hội thoại đã đóng. Không thể gửi tin nhắn.');
      return;
    }

    if (trimmed.length > 2000) {
      toast.warning('Tin nhắn không được vượt quá 2000 ký tự.');
      return;
    }

    const clientMsgId = uuidv4();
    setIsSending(true);

    // Optimistic message: renders instantly at bottom without any page or container scroll animation
    const optimisticMsg = {
      id: null,
      clientMessageId: clientMsgId,
      conversationId,
      senderId: userInfo?.id,
      content: trimmed,
      messageType: 'TEXT',
      createdAt: new Date().toISOString(),
      sender: {
        id: userInfo?.id,
        firstName: userInfo?.firstName,
        lastName: userInfo?.lastName,
        image: userInfo?.image,
        roleId: userInfo?.roleId,
      },
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setInputText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = '42px';
    }

    isNearBottomRef.current = true;
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    chatSocketService.sendTyping(conversationId, false);

    try {
      await chatSocketService.sendMessage({
        conversationId,
        clientMessageId: clientMsgId,
        content: trimmed,
        messageType: 'TEXT',
      });
    } catch (err) {
      console.error('Send message error:', err);
      toast.error(err.message || 'Gửi tin nhắn thất bại. Vui lòng thử lại.');
      // Rollback optimistic message on failure
      setMessages((prev) => prev.filter((m) => m.clientMessageId !== clientMsgId));
    } finally {
      setIsSending(false);
    }
  };

  // Handle Enter key (Shift+Enter for newline)
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Handle Doctor closing / reopening conversation with robust error handling
  const handleToggleStatus = async () => {
    if (!isDoctor || !conversationId || isTogglingStatus) return;
    const newStatus = currentStatus === 'OPEN' ? 'CLOSED' : 'OPEN';
    const actionText = newStatus === 'CLOSED' ? 'đóng' : 'mở lại';

    // Strict frontend validation: Cannot reopen expired conversation
    if (newStatus === 'OPEN' && !isFollowUpActive) {
      toast.warning('Thời hạn hỗ trợ 7 ngày sau khám đã kết thúc. Không thể mở lại cuộc trò chuyện.');
      return;
    }

    try {
      setIsTogglingStatus(true);
      const res = await updateConversationStatus(conversationId, newStatus);
      if (res && res.errCode === 0) {
        setCurrentStatus(newStatus);
        toast.success(`Đã ${actionText} cuộc trao đổi thành công.`);
        if (onStatusChange) {
          onStatusChange(newStatus);
        }
      } else {
        toast.error(res?.message || `Không thể ${actionText} cuộc trao đổi.`);
      }
    } catch (err) {
      const errorMsg =
        err?.response?.data?.message ||
        err?.message ||
        `Lỗi máy chủ khi ${actionText} cuộc trao đổi.`;
      toast.error(errorMsg);
    } finally {
      setIsTogglingStatus(false);
    }
  };

  const actualPatient = workspaceData?.patientIdentity?.actualPatient;
  const accountOwner = workspaceData?.patientIdentity?.accountOwner;
  const isFamilyMember = workspaceData?.patientIdentity?.isFamilyMember;

  const displayTitle = isDoctor && actualPatient?.name
    ? actualPatient.name
    : partnerName;

  const displaySub = isDoctor ? (
    isFamilyMember ? (
      <span className="partner-guardian-note">
        Người đại diện: <strong>{accountOwner?.name}</strong> ({actualPatient?.relationshipLabel || 'Người thân'}) • Khám: {bookingDate}
      </span>
    ) : (
      <span>Bệnh nhân chính chủ • Khám ngày {bookingDate}</span>
    )
  ) : (
    <span>{specialtyName || 'Bác sĩ điều trị'} • Lịch khám {bookingDate}</span>
  );

  return (
    <div className={`chat-window-container ${isDrawer ? 'is-drawer-view' : 'is-full-view'}`}>
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. CHAT HEADER                                                */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="chat-window-header">
        <div className="partner-profile-summary">
          <Avatar
            src={partner?.image}
            name={displayTitle}
            size={42}
            status={connectionStatus === 'connected' ? 'online' : 'offline'}
          />

          <div className="partner-meta">
            <div className="name-status-row">
              <h4 className="partner-title">{displayTitle}</h4>
              {isDoctor && isFamilyMember && (
                <span className="badge-patient-family">Người thân được khám</span>
              )}
              <span className={`status-pill status-${currentStatus.toLowerCase()}`}>
                {currentStatus === 'OPEN' ? (
                  <>
                    <Unlock size={12} /> <span>Đang mở</span>
                  </>
                ) : (
                  <>
                    <Lock size={12} /> <span>Đã đóng</span>
                  </>
                )}
              </span>
            </div>

            <div className="partner-sub">
              {displaySub}
            </div>
          </div>
        </div>

        <div className="header-actions">
          {/* Audio Call Button (Feature Flag) */}
          {FEATURES.ENABLE_VIDEO_CALL && (
            <button
              type="button"
              className="btn-call-trigger btn-audio-call"
              onClick={() => handleStartCall('AUDIO')}
              disabled={!isFollowUpActive || currentStatus === 'CLOSED' || isReadOnly}
              title={
                !isFollowUpActive
                  ? 'Thời hạn 7 ngày sau khám đã kết thúc'
                  : currentStatus === 'CLOSED'
                  ? 'Cuộc trò chuyện đã đóng'
                  : 'Gọi thoại bảo mật P2P'
              }
              id="btn-chat-audio-call"
              aria-label="Gọi thoại"
            >
              <Phone size={15} />
              <span>Gọi thoại</span>
            </button>
          )}

          {/* Video Call Button (Feature Flag) */}
          {FEATURES.ENABLE_VIDEO_CALL && (
            <button
              type="button"
              className="btn-call-trigger btn-video-call"
              onClick={() => handleStartCall('VIDEO')}
              disabled={!isFollowUpActive || currentStatus === 'CLOSED' || isReadOnly}
              title={
                !isFollowUpActive
                  ? 'Thời hạn 7 ngày sau khám đã kết thúc'
                  : currentStatus === 'CLOSED'
                  ? 'Cuộc trò chuyện đã đóng'
                  : 'Gọi video trực tiếp sau khám'
              }
              id="btn-chat-video-call"
              aria-label="Gọi video"
            >
              <Video size={15} />
              <span>Gọi video</span>
            </button>
          )}

          {/* Status Toggle Button (Doctor only) */}
          {isDoctor && (
            <button
              type="button"
              className={`btn-toggle-status ${currentStatus === 'OPEN' ? 'btn-close-conv' : 'btn-reopen-conv'}`}
              onClick={handleToggleStatus}
              disabled={isTogglingStatus || (currentStatus === 'CLOSED' && !isFollowUpActive)}
              title={
                currentStatus === 'OPEN'
                  ? 'Đóng phiên tư vấn'
                  : !isFollowUpActive
                  ? 'Thời hạn 7 ngày sau khám đã kết thúc. Không thể mở lại.'
                  : 'Mở lại phiên tư vấn'
              }
              aria-label={currentStatus === 'OPEN' ? 'Đóng phiên' : 'Mở lại'}
            >
              {isTogglingStatus ? (
                <span className="spinner-border spinner-border-sm" />
              ) : currentStatus === 'OPEN' ? (
                <>
                  <Lock size={14} /> <span>Đóng phiên</span>
                </>
              ) : (
                <>
                  <RotateCcw size={14} /> <span>Mở lại</span>
                </>
              )}
            </button>
          )}

          {/* Close button (when inside modal/drawer) */}
          {onClose && (
            <button
              type="button"
              className="btn-chat-close"
              onClick={onClose}
              title="Đóng cửa sổ chat"
              aria-label="Đóng cửa sổ"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. COMPACT FOLLOW-UP STRIP & MEDICAL ADVISORY NOTICE          */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className={`followup-compact-chip ${isFollowUpActive ? 'active' : 'expired'}`}>
        <div className="chip-main">
          <Clock size={13} className="chip-icon" />
          <span className="chip-text">
            {isFollowUpActive ? (
              <>
                <strong>Theo dõi sau khám 7 ngày:</strong> Có hiệu lực đến{' '}
                {followUpExpiresAt ? moment(followUpExpiresAt).format('HH:mm DD/MM/YYYY') : 'hết 168 giờ'}.
              </>
            ) : (
              <>
                <strong>Hết hạn 7 ngày sau khám:</strong> Cuộc trò chuyện đang ở chế độ chỉ đọc.
              </>
            )}
          </span>
        </div>
        <span className="chip-emergency-hint">
          (Khẩn cấp vui lòng gọi 115 hoặc đến CSYT gần nhất)
        </span>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. CHAT TIMELINE STREAM (Messages + Call History)             */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="chat-messages-stream" ref={messagesContainerRef} onScroll={handleScroll}>
        {/* Load more button */}
        {hasMore && (
          <div className="load-more-container">
            <button
              type="button"
              className="btn-load-more"
              onClick={handleLoadMore}
              disabled={isLoadingMore}
            >
              {isLoadingMore ? 'Đang tải tin nhắn cũ...' : 'Xem tin nhắn trước đó'}
            </button>
          </div>
        )}

        {/* Loading skeleton */}
        {isLoading && (
          <div className="chat-loading-state">
            <div className="skeleton-bubble skeleton-left" />
            <div className="skeleton-bubble skeleton-right" />
            <div className="skeleton-bubble skeleton-left" />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && timelineItems.length === 0 && (
          <div className="chat-empty-state">
            <div className="empty-icon-wrap">
              <FileText size={32} />
            </div>
            <h5>Chưa có tin nhắn nào</h5>
            <p>
              Hãy đặt câu hỏi về kết quả khám, đơn thuốc hoặc hướng dẫn chăm sóc để bắt đầu trao
              đổi với bác sĩ.
            </p>
          </div>
        )}

        {/* Unified Timeline: Chronological messages and call items */}
        {!isLoading &&
          timelineItems.map((item) => {
            // Render Call History Item
            if (item._timelineType === 'CALL') {
              if (!FEATURES.ENABLE_VIDEO_CALL) return null;
              return (
                <CallHistoryItem
                  key={item._key}
                  call={item}
                  currentUserId={userInfo?.id}
                  onCallAgain={handleStartCall}
                  canCallAgain={isFollowUpActive && currentStatus === 'OPEN' && !isReadOnly}
                />
              );
            }

            // Render Message Bubble
            const isMe = item.senderId === userInfo?.id;
            const msgTime = moment(item.createdAt).format('HH:mm');

            // Sender display label: If doctor viewing patient message for a family member
            let displaySenderName = item.sender
              ? `${item.sender.lastName || ''} ${item.sender.firstName || ''}`.trim()
              : partnerName;

            if (isDoctor && !isMe) {
              if (isFamilyMember) {
                displaySenderName = `${accountOwner?.name || displaySenderName} (${actualPatient?.relationshipLabel || 'Người giám hộ'})`;
              } else if (actualPatient?.name) {
                displaySenderName = actualPatient.name;
              }
            }

            return (
              <div
                key={item._key}
                className={`chat-bubble-row ${isMe ? 'row-me' : 'row-partner'}`}
              >
                {!isMe && (
                  <div className="bubble-avatar-wrap">
                    <Avatar
                      src={item.sender?.image}
                      name={displaySenderName}
                      size={32}
                    />
                  </div>
                )}

                <div className="bubble-payload">
                  {!isMe && (
                    <span className="bubble-sender-name">{displaySenderName}</span>
                  )}

                  <div className="bubble-card">
                    <div className="bubble-text">{item.content}</div>

                    <div className="bubble-meta">
                      <span className="bubble-time">{msgTime}</span>
                      {/* FIX: Exactly 1 clean check status supported by real backend */}
                      {isMe && (
                        <span
                          className={`bubble-status-icon ${item.readAt ? 'is-read' : 'is-sent'}`}
                          title={item.readAt ? `Đã xem (${moment(item.readAt).format('HH:mm')})` : 'Đã gửi'}
                        >
                          <Check size={13} strokeWidth={2.4} />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

        {/* Partner Typing Indicator */}
        {partnerTyping && (
          <div className="chat-typing-indicator">
            <span className="typing-dots">
              <span className="dot" />
              <span className="dot" />
              <span className="dot" />
            </span>
            <span className="typing-label">{partnerName} đang soạn tin...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 5. BALANCED MESSAGE COMPOSER                                 */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="chat-input-toolbar">
        {currentStatus === 'CLOSED' ? (
          <div className="chat-closed-notice">
            <Lock size={16} />
            <span>
              Phiên tư vấn này đã đóng. Bạn có thể xem lại toàn bộ lịch sử trao đổi.
              {isDoctor && isFollowUpActive && ' Nhấn "Mở lại" ở thanh tiêu đề nếu cần tiếp tục hỗ trợ.'}
            </span>
          </div>
        ) : (!isFollowUpActive || isReadOnly) ? (
          <div className="chat-closed-notice expired-notice">
            <Lock size={16} />
            <span>
              Thời hạn hỗ trợ sau khám 7 ngày đã kết thúc. Cuộc trò chuyện chuyển sang chế độ chỉ đọc.
            </span>
          </div>
        ) : (
          <form className="chat-composer-row" onSubmit={handleSendMessage}>
            <div className="composer-textarea-container">
              <textarea
                ref={textareaRef}
                className="chat-textarea"
                placeholder="Nhập nội dung trao đổi (Enter để gửi, Shift+Enter để xuống dòng)..."
                value={inputText}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                rows={1}
                maxLength={2000}
                disabled={isSending}
              />
              {inputText.length > 1500 && (
                <span className="composer-char-counter">{inputText.length}/2000</span>
              )}
            </div>

            <button
              type="submit"
              className="btn-send-message"
              disabled={isSending || !inputText.trim()}
              title="Gửi tin nhắn (Enter)"
              aria-label="Gửi tin nhắn"
            >
              {isSending ? (
                <span className="spinner-border spinner-border-sm" />
              ) : (
                <Send size={18} />
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ChatWindow;
