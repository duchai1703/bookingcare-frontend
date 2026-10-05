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
  Stethoscope,
  ChevronRight,
  PanelRightClose,
  PanelRightOpen,
  Calendar,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { getUserConversations, getConversationWorkspace } from '../../../services/chatApiService';
import chatSocketService from '../../../services/chatSocketService';
import ChatWindow from '../../Chat/ChatWindow';
import EncounterContextPanel from './EncounterContextPanel';
import CommonUtils from '../../../utils/CommonUtils';
import './DoctorMessagesWorkspace.scss';

const DoctorMessagesWorkspace = () => {
  const { conversationId: routeConvId } = useParams();
  const navigate = useNavigate();
  const { userInfo } = useSelector((state) => state.user);

  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [workspaceData, setWorkspaceData] = useState(null);
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(window.innerWidth >= 1200);
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

  // 2. Fetch Clinical Encounter Workspace whenever selected conversation changes
  useEffect(() => {
    if (!selectedConversation?.id) {
      setWorkspaceData(null);
      return;
    }

    let isMounted = true;
    const fetchWorkspace = async () => {
      try {
        setIsLoadingWorkspace(true);
        const res = await getConversationWorkspace(selectedConversation.id);
        if (isMounted && res && res.errCode === 0 && res.data) {
          setWorkspaceData(res.data);
        }
      } catch (err) {
        console.error('Error fetching conversation workspace:', err);
      } finally {
        if (isMounted) setIsLoadingWorkspace(false);
      }
    };

    fetchWorkspace();

    return () => {
      isMounted = false;
    };
  }, [selectedConversation?.id]);

  // 3. Real-time updates for conversation list
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
    const patientIdentity = c.patientIdentity;
    const actualName = (patientIdentity?.actualPatientName || '').toLowerCase();
    const ownerName = (patientIdentity?.accountOwnerName || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    const queryMatch = !searchQuery || actualName.includes(query) || ownerName.includes(query);

    if (!queryMatch) return false;

    if (filterTab === 'UNREAD') return (c.unreadCount || 0) > 0;
    if (filterTab === 'OPEN') return c.status === 'OPEN';
    if (filterTab === 'CLOSED') return c.status === 'CLOSED';
    return true;
  });

  return (
    <div className={`doctor-messages-workspace ${isPanelOpen ? 'has-context-panel' : ''}`}>
      {/* ───────────────────────────────────────────────────────────── */}
      {/* CỘT 1: DANH SÁCH CUỘC HỘI THOẠI (MASTER PANE)                 */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="messages-master-pane">
        <div className="master-header">
          <div className="master-title-row">
            <div className="title-with-badge">
              <div className="title-text-wrap">
                <h3>Chăm sóc sau khám</h3>
                <span className="title-subtitle">Theo dõi & hỗ trợ sau ca khám</span>
              </div>
              <span className="total-badge">{conversations.length}</span>
            </div>
          </div>

          {/* Search Bar */}
          <div className="master-search-bar">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Tìm bệnh nhân hoặc người thân..."
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
              <span>Đang tải danh sách theo dõi...</span>
            </div>
          )}

          {!isLoading && filteredConversations.length === 0 && (
            <div className="conv-empty-state">
              <MessageSquare size={28} />
              <p>Không có cuộc trao đổi nào phù hợp.</p>
            </div>
          )}

          {!isLoading &&
            filteredConversations.map((c) => {
              const isSelected = selectedConversation?.id === c.id;
              const identity = c.patientIdentity;
              const actualPatientName = identity?.actualPatientName || 'Bệnh nhân';
              const accountOwnerName = identity?.accountOwnerName || '';
              const isFamily = identity?.isFamilyMember;

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
                    {c.patientUser?.image ? (
                      <img src={CommonUtils.decodeBase64Image(c.patientUser.image)} alt={actualPatientName} />
                    ) : (
                      <div className={`avatar-fallback ${isFamily ? 'family' : ''}`}>
                        <User size={18} />
                      </div>
                    )}
                  </div>

                  <div className="item-body">
                    {/* Tầng 1: Tên bệnh nhân thực tế */}
                    <div className="item-top-row">
                      <div className="name-and-tag">
                        <h4 className="item-patient-name">{actualPatientName}</h4>
                        {isFamily && (
                          <span className="badge-member-tag">Người thân</span>
                        )}
                      </div>
                      <span className="item-time">{lastTime}</span>
                    </div>

                    {/* Tầng 2: Nếu là Người thân -> Hiện tên người giám hộ / Chủ TK */}
                    {isFamily && accountOwnerName && (
                      <div className="item-guardian-row">
                        <span>Chủ TK: <strong>{accountOwnerName}</strong></span>
                      </div>
                    )}

                    {/* Tầng 3: Ngữ cảnh ca khám & Trạng thái */}
                    <div className="item-sub-row">
                      <span className="item-booking-tag">
                        <Calendar size={11} className="tag-icon" /> Khám: {bookingDate}
                      </span>
                      <span className={`item-status-tag tag-${c.status.toLowerCase()}`}>
                        {c.status === 'OPEN' ? 'Đang mở' : 'Đã đóng'}
                      </span>
                      {c.isFollowUpActive === false && (
                        <span className="item-status-tag tag-expired">Hết hạn</span>
                      )}
                    </div>

                    {/* Tầng 4: Đoạn trích tin nhắn cuối & Số chưa đọc */}
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
      {/* CỘT 2: KHUNG CHAT & HỘI THOẠI TRỰC TIẾP (DETAIL PANE)        */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="messages-detail-pane">
        {selectedConversation ? (
          <div className="active-chat-wrapper">
            {/* Top Toolbar for toggling Clinical Context Panel */}
            <div className="workspace-action-bar">
              <button
                type="button"
                className={`btn-toggle-context-panel ${isPanelOpen ? 'is-active' : ''}`}
                onClick={() => setIsPanelOpen(!isPanelOpen)}
                title={isPanelOpen ? 'Thu gọn hồ sơ ca khám' : 'Mở rộng hồ sơ ca khám'}
                id="btn-toggle-encounter-panel"
              >
                <Stethoscope size={15} />
                <span>{isPanelOpen ? 'Ẩn hồ sơ ca khám' : 'Xem hồ sơ ca khám'}</span>
                {isPanelOpen ? <PanelRightClose size={15} /> : <PanelRightOpen size={15} />}
              </button>
            </div>

            <ChatWindow
              key={selectedConversation.id}
              conversation={selectedConversation}
              workspaceData={workspaceData}
              onStatusChange={handleStatusChange}
              isDrawer={false}
            />
          </div>
        ) : (
          <div className="no-chat-selected-placeholder">
            <div className="placeholder-icon-wrap">
              <Stethoscope size={48} />
            </div>
            <h3>Không gian Chăm sóc Sau khám</h3>
            <p>
              Chọn một cuộc hội thoại từ danh sách bên trái để tiếp tục theo dõi tình trạng bệnh
              nhân, xem lại kết quả chẩn đoán, đơn thuốc đã kê và giải đáp thắc mắc.
            </p>
          </div>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* CỘT 3: HỒ SƠ CA KHÁM LÂM SÀNG & PATIENT CONTEXT (CONTEXT PANE) */}
      {/* ───────────────────────────────────────────────────────────── */}
      {selectedConversation && isPanelOpen && (
        <div className="messages-context-pane">
          <EncounterContextPanel
            workspaceData={workspaceData}
            isLoading={isLoadingWorkspace}
            onClose={() => setIsPanelOpen(false)}
          />
        </div>
      )}
    </div>
  );
};

export default DoctorMessagesWorkspace;
