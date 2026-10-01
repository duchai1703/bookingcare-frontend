import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  CheckCheck,
  RotateCcw,
  Wifi,
  WifiOff,
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
import CommonUtils from '../../utils/CommonUtils';
import './ChatWindow.scss';

const ChatWindow = ({
  conversation,
  onClose,
  onStatusChange,
  isDrawer = false,
}) => {
  const { userInfo } = useSelector((state) => state.user);
  const isDoctor = userInfo?.roleId === 'R2';

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(chatSocketService.getConnectionState());
  const [currentStatus, setCurrentStatus] = useState(conversation?.status || 'OPEN');

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const conversationId = conversation?.id;
  const { initiateCall } = useCall();

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

  const handleStartCall = (callType) => {
    if (!isFollowUpActive || currentStatus === 'CLOSED' || isReadOnly) {
      toast.warning('Cuộc gọi chỉ khả dụng khi lịch hẹn trong thời hạn 7 ngày và cuộc trò chuyện đang mở.');
      return;
    }
    const receiverId = isDoctor ? conversation.patientId : conversation.doctorId;
    const partnerAvatar = partner?.image ? CommonUtils.decodeBase64Image(partner.image) : null;

    initiateCall({
      bookingId: conversation.bookingId,
      receiverId,
      callType,
      partnerName,
      partnerAvatar,
      partnerRole: partner?.roleId || (isDoctor ? 'R3' : 'R2'),
    });
  };

  // 1. Initial Load of Messages
  const loadMessages = useCallback(async () => {
    if (!conversationId) return;
    try {
      setIsLoading(true);
      const res = await getConversationMessages(conversationId, { limit: 40 });
      if (res && res.errCode === 0 && res.data) {
        setMessages(res.data.messages || []);
        setHasMore(res.data.hasMore || false);
        setNextCursor(res.data.nextCursor || null);
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
      toast.error('Không thể tải tin nhắn.');
    } finally {
      setIsLoading(false);
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
          // Check if message already exists by id or clientMessageId
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
      unsubError();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [conversationId, loadMessages, userInfo?.id]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (!isLoadingMore && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoadingMore]);

  // Handle typing debounce
  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputText(val);

    if (!conversationId) return;

    // Emit typing true
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

    // Stop typing state
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
      setInputText('');
    } catch (err) {
      console.error('Send message error:', err);
      toast.error(err.message || 'Gửi tin nhắn thất bại. Vui lòng thử lại.');
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

  // Handle Doctor closing / reopening conversation
  const handleToggleStatus = async () => {
    if (!isDoctor || !conversationId) return;
    const newStatus = currentStatus === 'OPEN' ? 'CLOSED' : 'OPEN';
    const actionText = newStatus === 'CLOSED' ? 'đóng' : 'mở lại';

    try {
      const res = await updateConversationStatus(conversationId, newStatus);
      if (res && res.errCode === 0) {
        setCurrentStatus(newStatus);
        toast.success(`Đã ${actionText} cuộc trao đổi.`);
        if (onStatusChange) {
          onStatusChange(newStatus);
        }
      } else {
        toast.error(res?.message || `Không thể ${actionText} cuộc trao đổi.`);
      }
    } catch (err) {
      toast.error(`Lỗi khi ${actionText} cuộc trao đổi.`);
    }
  };

  return (
    <div className={`chat-window-container ${isDrawer ? 'as-drawer' : 'as-embedded'}`}>
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. CHAT HEADER                                               */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="chat-window-header">
        <div className="header-partner-info">
          <div className="partner-avatar">
            {partner?.image ? (
              <img src={CommonUtils.decodeBase64Image(partner.image)} alt={partnerName} />
            ) : (
              <div className="avatar-fallback">
                {isDoctor ? <User size={20} /> : <Stethoscope size={20} />}
              </div>
            )}
            <span
              className={`online-indicator ${connectionStatus === 'connected' ? 'is-online' : 'is-offline'}`}
              title={connectionStatus === 'connected' ? 'Đã kết nối' : 'Mất kết nối'}
            />
          </div>

          <div className="partner-meta">
            <div className="name-status-row">
              <h4 className="partner-title">{partnerName}</h4>
              <span className={`status-pill status-${currentStatus.toLowerCase()}`}>
                {currentStatus === 'OPEN' ? (
                  <>
                    <Unlock size={12} /> Đang mở
                  </>
                ) : (
                  <>
                    <Lock size={12} /> Đã đóng
                  </>
                )}
              </span>
            </div>

            <div className="partner-sub">
              {isDoctor ? (
                <span>Bệnh nhân • Khám ngày {bookingDate}</span>
              ) : (
                <span>{specialtyName || 'Bác sĩ điều trị'} • Lịch khám {bookingDate}</span>
              )}
            </div>
          </div>
        </div>

        <div className="header-actions">
          {/* WebRTC Audio & Video Call buttons */}
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
          >
            <Phone size={14} />
            <span>Gọi thoại</span>
          </button>

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
          >
            <Video size={14} />
            <span>Gọi video</span>
          </button>

          {/* Status toggle button for Doctors */}
          {isDoctor && (
            <button
              type="button"
              className={`btn-toggle-status ${currentStatus === 'OPEN' ? 'btn-close-conv' : 'btn-reopen-conv'}`}
              onClick={handleToggleStatus}
              title={currentStatus === 'OPEN' ? 'Đóng phiên tư vấn' : 'Mở lại phiên tư vấn'}
            >
              {currentStatus === 'OPEN' ? (
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

          {/* Close button (when rendered inside drawer/modal) */}
          {onClose && (
            <button
              type="button"
              className="btn-chat-close"
              onClick={onClose}
              title="Đóng cửa sổ chat"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. 7-DAY FOLLOW-UP ACCESS WINDOW BANNER                       */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isFollowUpActive ? (
        <div className="followup-window-banner active">
          <Clock size={16} className="banner-icon" />
          <div className="banner-content">
            <strong>Thời hạn tư vấn sau khám 7 ngày:</strong> Có hiệu lực đến{' '}
            {followUpExpiresAt ? moment(followUpExpiresAt).format('HH:mm DD/MM/YYYY') : 'hết 168 giờ'}.
            Bạn có thể trao đổi tin nhắn và gọi thoại/video trực tiếp.
          </div>
        </div>
      ) : (
        <div className="followup-window-banner expired">
          <AlertTriangle size={16} className="banner-icon" />
          <div className="banner-content">
            <strong>Thời hạn hỗ trợ sau khám 7 ngày đã kết thúc</strong>
            {followUpExpiresAt ? ` (Hết hạn lúc ${moment(followUpExpiresAt).format('HH:mm DD/MM/YYYY')})` : ''}.
            Toàn bộ lịch sử trao đổi được bảo lưu ở chế độ chỉ đọc. Không thể gửi tin nhắn hoặc bắt đầu cuộc gọi mới.
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. MEDICAL ADVISORY DISCLAIMER BANNER                         */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="medical-chat-disclaimer">
        <AlertTriangle size={16} className="disclaimer-icon" />
        <div className="disclaimer-content">
          <strong>Lưu ý theo dõi sau khám:</strong> Kênh chat dùng để hỏi đáp và làm rõ hướng dẫn
          chăm sóc sau buổi khám đã hoàn tất. Bác sĩ có thể không phản hồi tức thời. Trong trường
          hợp cấp cứu, vui lòng đến ngay cơ sở y tế gần nhất.
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. MESSAGE STREAM                                            */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="chat-messages-stream" ref={messagesContainerRef}>
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
        {!isLoading && messages.length === 0 && (
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

        {/* Messages List */}
        {!isLoading &&
          messages.map((msg, index) => {
            const isMe = msg.senderId === userInfo?.id;
            const msgTime = moment(msg.createdAt).format('HH:mm');

            return (
              <div
                key={msg.id || msg.clientMessageId || index}
                className={`chat-bubble-row ${isMe ? 'row-me' : 'row-partner'}`}
              >
                {!isMe && (
                  <div className="bubble-avatar">
                    {msg.sender?.image ? (
                      <img src={CommonUtils.decodeBase64Image(msg.sender.image)} alt="" />
                    ) : (
                      <div className="bubble-avatar-fallback">
                        {isDoctor ? <User size={14} /> : <Stethoscope size={14} />}
                      </div>
                    )}
                  </div>
                )}

                <div className="bubble-payload">
                  {!isMe && (
                    <span className="bubble-sender-name">
                      {msg.sender ? `${msg.sender.lastName || ''} ${msg.sender.firstName || ''}`.trim() : partnerName}
                    </span>
                  )}

                  <div className="bubble-card">
                    {/* Safe plain text render — ZERO dangerouslySetInnerHTML */}
                    <div className="bubble-text">{msg.content}</div>

                    <div className="bubble-meta">
                      <span className="bubble-time">{msgTime}</span>
                      {isMe && (
                        <span className="bubble-read-status" title={msg.readAt ? 'Đã xem' : 'Đã gửi'}>
                          {msg.readAt ? (
                            <CheckCheck size={14} className="icon-read" />
                          ) : (
                            <Check size={14} className="icon-sent" />
                          )}
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
      {/* 4. CHAT INPUT BAR                                            */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="chat-input-toolbar">
        {currentStatus === 'CLOSED' ? (
          <div className="chat-closed-notice">
            <Lock size={16} />
            <span>
              Phiên tư vấn này đã kết thúc. Bạn có thể xem lại lịch sử nhưng không thể gửi tin nhắn
              mới.
            </span>
          </div>
        ) : (!isFollowUpActive || isReadOnly) ? (
          <div className="chat-closed-notice">
            <Lock size={16} />
            <span>
              Thời hạn hỗ trợ sau khám 7 ngày đã kết thúc. Cuộc trò chuyện đã chuyển sang chế độ xem lại (chỉ đọc).
            </span>
          </div>
        ) : (
          <form className="chat-input-form" onSubmit={handleSendMessage}>
            <textarea
              className="chat-textarea"
              placeholder="Nhập nội dung trao đổi (Enter để gửi, Shift+Enter để xuống dòng)..."
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              rows={2}
              maxLength={2000}
              disabled={isSending}
            />

            <div className="input-actions-bar">
              <span className="char-counter">{inputText.length}/2000</span>
              <button
                type="submit"
                className="btn-send-message"
                disabled={isSending || !inputText.trim()}
              >
                {isSending ? (
                  <span className="spinner-border spinner-border-sm" />
                ) : (
                  <>
                    <span>Gửi</span> <Send size={15} />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ChatWindow;
