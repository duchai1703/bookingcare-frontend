import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import moment from 'moment';
import {
  MessageSquare,
  Search,
  CheckCheck,
  User,
  Clock,
  Lock,
  Unlock,
  AlertCircle,
  ExternalLink,
  Filter,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { getUserConversations } from '../../../services/chatApiService';
import chatSocketService from '../../../services/chatSocketService';
import ChatWindow from '../../Chat/ChatWindow';
import CommonUtils from '../../../utils/CommonUtils';
import './DoctorMessagesWorkspace.scss';

const DoctorMessagesWorkspace = () => {
  const { conversationId: routeConvId } = useParams();
  const navigate = useNavigate();
  const { userInfo } = useSelector((state) => state.user);

  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState('ALL'); // 'ALL' | 'UNREAD' | 'OPEN' | 'CLOSED'

  // 1. Fetch Conversations
  const fetchConversations = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await getUserConversations();
      if (res && res.errCode === 0 && res.data) {
        setConversations(res.data);

        // If route has conversationId, auto-select it
        if (routeConvId) {
          const match = res.data.find((c) => c.id === parseInt(routeConvId, 10));
          if (match) setSelectedConversation(match);
        } else if (!selectedConversation && res.data.length > 0) {
          // Default select first conversation on desktop
          if (window.innerWidth > 768) {
            setSelectedConversation(res.data[0]);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching doctor conversations:', err);
      toast.error('Không thể tải danh sách cuộc trò chuyện.');
    } finally {
      setIsLoading(false);
    }
  }, [routeConvId, selectedConversation]);

  useEffect(() => {
    fetchConversations();
  }, []);

  // 2. Real-time updates for conversation list
  useEffect(() => {
    chatSocketService.connect();

    // Listen for conversation updates (new message sent/received)
    const unsubConvUpdate = chatSocketService.on('chat:conversation:updated', (data) => {
      if (!data) return;
      setConversations((prev) => {
        const index = prev.findIndex((c) => c.id === data.conversationId);
        if (index !== -1) {
          const updated = { ...prev[index] };
          if (data.latestMessage) {
            updated.latestMessage = data.latestMessage;
            updated.lastMessageAt = data.latestMessage.createdAt;
          }
          if (selectedConversation?.id !== data.conversationId) {
            updated.unreadCount = (updated.unreadCount || 0) + 1;
          }
          const filtered = prev.filter((c) => c.id !== data.conversationId);
          return [updated, ...filtered];
        } else {
          // New conversation not yet in list: refetch
          fetchConversations();
          return prev;
        }
      });
    });

    // Also update if new message arrives in active room
    const unsubNewMsg = chatSocketService.on('chat:message:new', (data) => {
      if (!data) return;
      setConversations((prev) => {
        const index = prev.findIndex((c) => c.id === data.conversationId);
        if (index !== -1) {
          const updated = { ...prev[index] };
          updated.latestMessage = data.message;
          updated.lastMessageAt = data.message.createdAt;
          if (selectedConversation?.id === data.conversationId) {
            updated.unreadCount = 0;
          }
          const filtered = prev.filter((c) => c.id !== data.conversationId);
          return [updated, ...filtered];
        }
        return prev;
      });
    });

    // Realtime conversation status changes (OPEN / CLOSED via reopen or close)
    const unsubStatusUpdate = chatSocketService.on('chat:conversation:status', (data) => {
      if (!data) return;
      setConversations((prev) =>
        prev.map((c) => (c.id === data.conversationId ? { ...c, status: data.status } : c))
      );
      setSelectedConversation((prev) => {
        if (prev && prev.id === data.conversationId) {
          return { ...prev, status: data.status };
        }
        return prev;
      });
    });

    return () => {
      unsubConvUpdate();
      unsubNewMsg();
      unsubStatusUpdate();
    };
  }, [selectedConversation, fetchConversations]);

  // Select conversation handler
  const handleSelectConversation = (conv) => {
    setSelectedConversation(conv);
    // Clear unread badge locally
    setConversations((prev) =>
      prev.map((c) => (c.id === conv.id ? { ...c, unreadCount: 0 } : c))
    );
  };

  // Status change handler (OPEN / CLOSED)
  const handleStatusChange = useCallback((newStatus) => {
    setSelectedConversation((prev) => {
      if (!prev) return null;
      const updated = { ...prev, status: newStatus };
      setConversations((cList) =>
        cList.map((c) => (c.id === updated.id ? updated : c))
      );
      return updated;
    });
  }, []);

  // Filter conversations
  const filteredConversations = conversations.filter((c) => {
    const patientName = `${c.patientUser?.lastName || ''} ${c.patientUser?.firstName || ''}`.toLowerCase();
    const queryMatch = !searchQuery || patientName.includes(searchQuery.toLowerCase());

    if (!queryMatch) return false;

    if (filterTab === 'UNREAD') return (c.unreadCount || 0) > 0;
    if (filterTab === 'OPEN') return c.status === 'OPEN';
    if (filterTab === 'CLOSED') return c.status === 'CLOSED';
    return true;
  });

  return (
    <div className="doctor-messages-workspace">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* LEFT PANE: CONVERSATION LIST (MASTER)                         */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="messages-master-pane">
        <div className="master-header">
          <div className="master-title-row">
            <div className="title-with-badge">
              <h3>Tin nhắn sau khám</h3>
              <span className="total-badge">{conversations.length}</span>
            </div>
          </div>

          {/* Search Bar */}
          <div className="master-search-bar">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Tìm bệnh nhân theo tên..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Filter Tabs */}
          <div className="master-filter-tabs">
            <button
              type="button"
              className={`filter-btn ${filterTab === 'ALL' ? 'is-active' : ''}`}
              onClick={() => setFilterTab('ALL')}
            >
              Tất cả
            </button>
            <button
              type="button"
              className={`filter-btn ${filterTab === 'UNREAD' ? 'is-active' : ''}`}
              onClick={() => setFilterTab('UNREAD')}
            >
              Chưa đọc
              {conversations.filter((c) => (c.unreadCount || 0) > 0).length > 0 && (
                <span className="unread-dot" />
              )}
            </button>
            <button
              type="button"
              className={`filter-btn ${filterTab === 'OPEN' ? 'is-active' : ''}`}
              onClick={() => setFilterTab('OPEN')}
            >
              Đang mở
            </button>
            <button
              type="button"
              className={`filter-btn ${filterTab === 'CLOSED' ? 'is-active' : ''}`}
              onClick={() => setFilterTab('CLOSED')}
            >
              Đã đóng
            </button>
          </div>
        </div>

        {/* Conversation List */}
        <div className="conversations-scroll-list">
          {isLoading && (
            <div className="conv-loading-state">
              <div className="spinner-border spinner-border-sm text-teal" />
              <span>Đang tải danh sách tin nhắn...</span>
            </div>
          )}

          {!isLoading && filteredConversations.length === 0 && (
            <div className="conv-empty-state">
              <MessageSquare size={28} />
              <p>Không có cuộc trò chuyện nào phù hợp.</p>
            </div>
          )}

          {!isLoading &&
            filteredConversations.map((c) => {
              const isSelected = selectedConversation?.id === c.id;
              const patient = c.patientUser;
              const patientName = patient
                ? `${patient.lastName || ''} ${patient.firstName || ''}`.trim() || patient.email
                : 'Bệnh nhân';

              const bookingDate = c.bookingData?.date
                ? moment(parseInt(c.bookingData.date, 10)).format('DD/MM/YYYY')
                : '';

              const lastTime = c.lastMessageAt
                ? moment(c.lastMessageAt).format('HH:mm DD/MM')
                : '';

              const snippet = c.latestMessage?.content || 'Chưa có tin nhắn...';

              return (
                <div
                  key={c.id}
                  className={`conversation-item-card ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => handleSelectConversation(c)}
                >
                  <div className="item-avatar">
                    {patient?.image ? (
                      <img src={CommonUtils.decodeBase64Image(patient.image)} alt={patientName} />
                    ) : (
                      <div className="avatar-fallback">
                        <User size={18} />
                      </div>
                    )}
                  </div>

                  <div className="item-body">
                    <div className="item-top-row">
                      <h4 className="item-patient-name">{patientName}</h4>
                      <span className="item-time">{lastTime}</span>
                    </div>

                    <div className="item-sub-row">
                      <span className="item-booking-tag">Khám: {bookingDate}</span>
                      <span className={`item-status-tag tag-${c.status.toLowerCase()}`}>
                        {c.status === 'OPEN' ? 'Đang mở' : 'Đã đóng'}
                      </span>
                      {c.isFollowUpActive === false && (
                        <span
                          className="item-status-tag tag-expired"
                          style={{
                            background: '#fef2f2',
                            color: '#dc2626',
                            borderColor: '#fecaca',
                            fontSize: '11px',
                          }}
                        >
                          Hết hạn
                        </span>
                      )}
                    </div>

                    <div className="item-bottom-row">
                      <p className="item-snippet">{snippet}</p>
                      {c.unreadCount > 0 && (
                        <span className="item-unread-badge">{c.unreadCount}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* RIGHT PANE: ACTIVE CHAT WINDOW (DETAIL)                       */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="messages-detail-pane">
        {selectedConversation ? (
          <div className="active-chat-wrapper">
            <ChatWindow
              key={selectedConversation.id}
              conversation={selectedConversation}
              onStatusChange={handleStatusChange}
              isDrawer={false}
            />
          </div>
        ) : (
          <div className="no-chat-selected-placeholder">
            <div className="placeholder-icon-wrap">
              <MessageSquare size={48} />
            </div>
            <h3>Hộp thư tư vấn sau khám</h3>
            <p>
              Chọn một cuộc hội thoại từ danh sách bên trái để xem lại lịch sử trao đổi hoặc phản
              hồi bệnh nhân theo thời gian thực.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DoctorMessagesWorkspace;
