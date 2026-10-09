// src/containers/PatientPortal/Messages/PatientMessagesWorkspace.jsx
// [Redesign] Không gian Chat & Theo Dõi Sau Khám — Patient Portal BookingCare
// Thiết kế chuẩn Healthcare Enterprise Tier 1:
// 1. Danh sách Bác sĩ bên trái sắp xếp ưu tiên theo thời hạn chat còn lại giảm dần, hết hạn làm mờ (chỉ xem).
// 2. Luồng chat liên tục giữa Bệnh nhân và Bác sĩ kèm các Mốc phiên khám (Encounter Milestones) trên dòng thời gian.
// 3. Clinical Encounter Record Drawer xem chi tiết kết quả khám & đơn thuốc mà không rời khung chat.

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import moment from 'moment';
import 'moment/locale/vi';
import { toast } from 'react-toastify';
import {
  getUserConversations,
  getConversationWorkspace,
  getOrCreateConversationForBooking,
  getConversationMessages,
  markMessagesAsRead,
} from '../../../services/chatApiService';
import chatSocketService from '../../../services/chatSocketService';
import { downloadBookingAttachment } from '../../../services/patientService';
import CommonUtils from '../../../utils/CommonUtils';
import { path } from '../../../utils/constants';
import './PatientMessagesWorkspace.scss';

// Helper format thời gian còn lại thân thiện
const formatRemainingTime = (remainingMs) => {
  if (!remainingMs || remainingMs <= 0) return 'Đã hết hạn';
  const totalHours = Math.floor(remainingMs / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  if (days > 0) {
    return `Còn ${days} ngày ${hours} giờ`;
  }
  const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) {
    return `Còn ${hours} giờ ${minutes} phút`;
  }
  return `Còn ${minutes} phút`;
};

// Helper format dung lượng tệp
const formatFileSize = (bytes) => {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Helper chuẩn hoá data URL ảnh từ base64
const getAttachmentDataUrl = (att) => {
  if (!att || !att.fileData) return null;
  if (att.fileData.startsWith('data:')) return att.fileData;
  const mime = att.fileType || 'image/png';
  return `data:${mime};base64,${att.fileData}`;
};

// Helper chuyển base64 sang Blob an toàn
const b64toBlob = (b64Data, contentType = '', sliceSize = 512) => {
  let cleanB64 = b64Data || '';
  if (cleanB64.includes(';base64,')) {
    cleanB64 = cleanB64.split(';base64,')[1];
  }
  const byteCharacters = atob(cleanB64);
  const byteArrays = [];

  for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    const slice = byteCharacters.slice(offset, offset + sliceSize);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }

  return new Blob(byteArrays, { type: contentType });
};

// Helper lấy nhãn phân loại tài liệu & icon trực quan
const getCategoryMeta = (cat) => {
  switch (cat) {
    case 'xray':
      return { label: 'Chụp X-quang', icon: 'fas fa-x-ray', color: '#0d9488' };
    case 'lab':
      return { label: 'Xét nghiệm', icon: 'fas fa-vial', color: '#2563eb' };
    case 'mri':
      return { label: 'Chụp MRI / CT', icon: 'fas fa-procedures', color: '#7c3aed' };
    case 'prescription':
      return { label: 'Đơn thuốc', icon: 'fas fa-prescription-bottle-alt', color: '#ea580c' };
    case 'record':
      return { label: 'Hồ sơ bệnh án', icon: 'fas fa-file-medical', color: '#059669' };
    default:
      return { label: 'Tài liệu y tế', icon: 'fas fa-file-medical-alt', color: '#0d9488' };
  }
};

// Helper format nhãn người thân
const getRelationshipBadge = (identity) => {
  if (!identity || !identity.isFamilyMember) {
    return { label: 'Bản thân', cls: 'badge-self' };
  }
  const rel = identity.relationship;
  switch (rel) {
    case 'CHILD':
      return { label: 'Con cái', cls: 'badge-family' };
    case 'PARENT':
      return { label: 'Bố / Mẹ', cls: 'badge-family' };
    case 'SPOUSE':
      return { label: 'Vợ / Chồng', cls: 'badge-family' };
    default:
      return { label: 'Người thân', cls: 'badge-family' };
  }
};

const PatientMessagesWorkspace = () => {
  const navigate = useNavigate();
  const { conversationId: routeConvId } = useParams();
  const [searchParams] = useSearchParams();
  const queryBookingId = searchParams.get('bookingId');

  const { userInfo } = useSelector((state) => state.user);

  // States danh sách hội thoại
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'UNREAD' | 'EXPIRED'

  // States không gian làm việc phiên khám (Workspace Context)
  const [workspaceData, setWorkspaceData] = useState(null);
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(false);
  const [selectedEncounterForDrawer, setSelectedEncounterForDrawer] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // States tin nhắn
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Cuộn xuống tin nhắn mới nhất
  const scrollToBottom = (behavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // 1. Tải danh sách cuộc trò chuyện của bệnh nhân
  const fetchConversations = useCallback(async () => {
    try {
      setIsLoadingConversations(true);
      const res = await getUserConversations();
      if (res && res.errCode === 0 && Array.isArray(res.data)) {
        setConversations(res.data);

        // Xử lý auto-select từ routeConvId hoặc queryBookingId
        if (queryBookingId) {
          const matchBooking = res.data.find(
            (c) => c.bookingId === parseInt(queryBookingId, 10) || c.bookingData?.id === parseInt(queryBookingId, 10)
          );
          if (matchBooking) {
            setSelectedConversation(matchBooking);
            return;
          }
          // Nếu chưa có conversation cho booking này, gọi khởi tạo
          try {
            const initRes = await getOrCreateConversationForBooking(queryBookingId);
            if (initRes && initRes.errCode === 0 && initRes.data) {
              fetchConversations();
              setSelectedConversation(initRes.data);
              return;
            }
          } catch (e) {
            console.warn('Cannot init conversation for booking:', e);
          }
        }

        if (routeConvId) {
          const matchId = res.data.find((c) => c.id === parseInt(routeConvId, 10));
          if (matchId) setSelectedConversation(matchId);
        } else if (!selectedConversation && res.data.length > 0) {
          // Mặc định chọn hội thoại đầu tiên (hội thoại còn nhiều hạn nhất)
          setSelectedConversation(res.data[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching patient conversations:', err);
      toast.error('Không thể tải danh sách cuộc trò chuyện.');
    } finally {
      setIsLoadingConversations(false);
    }
  }, [routeConvId, queryBookingId, selectedConversation]);

  useEffect(() => {
    fetchConversations();
  }, []);

  // 2. Tải Workspace lâm sàng khi chọn hội thoại
  useEffect(() => {
    if (!selectedConversation?.id) {
      setWorkspaceData(null);
      return;
    }

    let isMounted = true;
    setIsLoadingWorkspace(true);
    getConversationWorkspace(selectedConversation.id)
      .then((res) => {
        if (isMounted && res && res.errCode === 0 && res.data) {
          setWorkspaceData(res.data);
        }
      })
      .catch((err) => {
        console.error('Error loading conversation workspace:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingWorkspace(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedConversation?.id]);

  // 3. Tải tin nhắn & Đánh dấu đã đọc
  const fetchMessages = useCallback(async (convId) => {
    if (!convId) return;
    try {
      setIsLoadingMessages(true);
      const res = await getConversationMessages(convId, { limit: 50 });
      if (res && res.errCode === 0) {
        setMessages(res.data?.messages || res.data || []);
        setTimeout(() => scrollToBottom('instant'), 80);
        // Đánh dấu đã đọc
        markMessagesAsRead(convId).catch(() => {});
      }
    } catch (err) {
      console.error('Error loading messages:', err);
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    if (selectedConversation?.id) {
      fetchMessages(selectedConversation.id);
    } else {
      setMessages([]);
    }
  }, [selectedConversation?.id, fetchMessages]);

  // 4. Kết nối Socket Realtime cho cuộc hội thoại được chọn
  useEffect(() => {
    if (!selectedConversation?.id) return;

    chatSocketService.connect();
    chatSocketService.joinConversation(selectedConversation.id).catch((err) => {
      console.warn('Failed to join conversation room:', err);
    });

    const unsubNewMessage = chatSocketService.on('chat:message:new', (data) => {
      const msg = data?.message || data;
      if (data?.conversationId === selectedConversation.id || msg?.conversationId === selectedConversation.id) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        setTimeout(() => scrollToBottom('smooth'), 50);
        markMessagesAsRead(selectedConversation.id).catch(() => {});
      }
    });

    const unsubTyping = chatSocketService.on('chat:typing', (data) => {
      if (data?.conversationId === selectedConversation.id && data?.userId !== userInfo?.id) {
        setPartnerTyping(true);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setPartnerTyping(false), 2500);
      }
    });

    return () => {
      if (typeof unsubNewMessage === 'function') unsubNewMessage();
      if (typeof unsubTyping === 'function') unsubTyping();
      chatSocketService.leaveConversation(selectedConversation.id);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [selectedConversation?.id, userInfo?.id]);

  // Gửi tin nhắn
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || isSending || !selectedConversation?.id) return;

    if (selectedConversation.isReadOnly) {
      toast.warning('Thời hạn tư vấn cho phiên khám này đã kết thúc. Bạn chỉ có quyền xem lịch sử.');
      return;
    }

    setIsSending(true);
    try {
      chatSocketService.sendMessage({
        conversationId: selectedConversation.id,
        content: trimmed,
        messageType: 'TEXT',
      });
      setInputText('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    } catch (err) {
      toast.error('Lỗi khi gửi tin nhắn!');
    } finally {
      setIsSending(false);
    }
  };

  // Phím tắt Enter gửi tin
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Lọc danh sách hội thoại
  const filteredConversations = useMemo(() => {
    let list = [...conversations];

    // Lọc theo search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((c) => {
        const docName = `${c.doctorUser?.lastName || ''} ${c.doctorUser?.firstName || ''}`.toLowerCase();
        const patName = (c.patientIdentity?.actualPatientName || c.bookingData?.patientName || '').toLowerCase();
        const specName = (c.doctorUser?.doctorInfoData?.specialtyData?.name || '').toLowerCase();
        return docName.includes(q) || patName.includes(q) || specName.includes(q);
      });
    }

    // Lọc theo tab
    if (filterTab === 'ACTIVE') {
      list = list.filter((c) => c.isFollowUpActive);
    } else if (filterTab === 'UNREAD') {
      list = list.filter((c) => c.unreadCount > 0);
    } else if (filterTab === 'EXPIRED') {
      list = list.filter((c) => !c.isFollowUpActive);
    }

    return list;
  }, [conversations, searchQuery, filterTab]);

  // Danh sách mốc phiên khám từ Workspace
  const encounterMilestones = useMemo(() => {
    if (!workspaceData?.allEncounters) {
      return workspaceData?.encounter ? [workspaceData.encounter] : [];
    }
    return workspaceData.allEncounters;
  }, [workspaceData]);

  // States xem trước tài liệu & kết quả xét nghiệm (Preview Lightbox)
  const [previewModal, setPreviewModal] = useState({
    isOpen: false,
    attachment: null,
    srcUrl: '',
    blobToRevoke: null,
    isPdf: false,
    isImage: false,
    zoom: 1,
    rotation: 0,
    isLoading: false,
  });

  // Đóng modal xem trước tài liệu
  const handleClosePreview = useCallback(() => {
    setPreviewModal((prev) => {
      if (prev.blobToRevoke) {
        try {
          URL.revokeObjectURL(prev.blobToRevoke);
        } catch (e) {
          // ignore
        }
      }
      return {
        isOpen: false,
        attachment: null,
        srcUrl: '',
        blobToRevoke: null,
        isPdf: false,
        isImage: false,
        zoom: 1,
        rotation: 0,
        isLoading: false,
      };
    });
  }, []);

  // Lắng nghe phím Escape để đóng preview modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && previewModal.isOpen) {
        handleClosePreview();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewModal.isOpen, handleClosePreview]);

  // Tải tài liệu về máy tính
  const handleDownloadAttachment = async (e, att) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (!att) return;

    const bookingId = selectedEncounterForDrawer?.bookingId || selectedEncounterForDrawer?.id;

    try {
      if (att.fileData) {
        const mimeType = att.fileType || 'application/octet-stream';
        const blob = b64toBlob(att.fileData, mimeType);
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = att.fileName || 'tai-lieu-y-te';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
        toast.success(`Đã tải về tệp: ${att.fileName}`);
        return;
      }

      if (!bookingId) {
        toast.error('Không tìm thấy phiên khám tương ứng để tải tệp.');
        return;
      }

      const res = await downloadBookingAttachment(bookingId, att.id, 'attachment');
      const blob = new Blob([res], { type: att.fileType || 'application/octet-stream' });
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = att.fileName || 'tai-lieu-y-te';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      toast.success(`Đã tải về tệp: ${att.fileName}`);
    } catch (err) {
      console.error('Lỗi khi tải xuống tài liệu:', err);
      toast.error('Không thể tải xuống tệp. Vui lòng thử lại!');
    }
  };

  // Mở tài liệu xét nghiệm xem trực tiếp
  const handleOpenAttachment = async (att) => {
    if (!att) return;
    const isPdf = att.fileType === 'application/pdf' || /\.pdf$/i.test(att.fileName || '');
    const isImage = att.fileType?.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(att.fileName || '');

    // Trường hợp 1: Có dữ liệu base64 sẵn từ server (tốc độ mở ngay lập tức)
    if (att.fileData) {
      if (isImage) {
        const dataUrl = getAttachmentDataUrl(att);
        setPreviewModal({
          isOpen: true,
          attachment: att,
          srcUrl: dataUrl,
          blobToRevoke: null,
          isPdf: false,
          isImage: true,
          zoom: 1,
          rotation: 0,
          isLoading: false,
        });
        return;
      }
      if (isPdf) {
        try {
          const blob = b64toBlob(att.fileData, 'application/pdf');
          const blobUrl = URL.createObjectURL(blob);
          setPreviewModal({
            isOpen: true,
            attachment: att,
            srcUrl: blobUrl,
            blobToRevoke: blobUrl,
            isPdf: true,
            isImage: false,
            zoom: 1,
            rotation: 0,
            isLoading: false,
          });
          return;
        } catch (e) {
          console.warn('Cannot parse PDF base64 to blob:', e);
        }
      }
    }

    // Trường hợp 2: Chưa có base64 hoặc định dạng cần gọi API download stream
    const bookingId = selectedEncounterForDrawer?.bookingId || selectedEncounterForDrawer?.id;
    if (!bookingId) {
      toast.error('Không tìm thấy thông tin phiên khám để tải tài liệu.');
      return;
    }

    setPreviewModal({
      isOpen: true,
      attachment: att,
      srcUrl: '',
      blobToRevoke: null,
      isPdf,
      isImage,
      zoom: 1,
      rotation: 0,
      isLoading: true,
    });

    try {
      const res = await downloadBookingAttachment(bookingId, att.id, 'inline');
      const blob = new Blob([res], { type: att.fileType || (isPdf ? 'application/pdf' : 'image/png') });
      const blobUrl = URL.createObjectURL(blob);
      setPreviewModal((prev) => ({
        ...prev,
        srcUrl: blobUrl,
        blobToRevoke: blobUrl,
        isLoading: false,
      }));
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu xem trước:', err);
      toast.error('Không thể mở xem trước. Đang chuyển hướng tải file về máy...');
      handleClosePreview();
      handleDownloadAttachment(null, att);
    }
  };

  // Mở Drawer xem hồ sơ
  const handleOpenDrawer = (enc) => {
    setSelectedEncounterForDrawer(enc || workspaceData?.encounter);
    setIsDrawerOpen(true);
  };

  return (
    <div className="patient-messages-workspace">
      {/* ========================================================= */}
      {/* CỘT 1: DANH SÁCH BÁC SĨ (SORT THEO HẠN CHAT GIẢM DẦN) */}
      {/* ========================================================= */}
      <aside className="pmw-sidebar">
        <div className="pmw-sidebar__header">
          <div className="pmw-sidebar__title-row">
            <h2>Tin nhắn với Bác sĩ</h2>
            <span className="pmw-sidebar__counter">{conversations.length}</span>
          </div>
          <p className="pmw-sidebar__subtitle">Trao đổi và theo dõi chuyên môn sau khám</p>

          {/* Ô tìm kiếm */}
          <div className="pmw-search-box">
            <i className="fas fa-search pmw-search-icon" />
            <input
              type="text"
              placeholder="Tìm bác sĩ hoặc người khám..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button type="button" className="pmw-search-clear" onClick={() => setSearchQuery('')}>
                <i className="fas fa-times" />
              </button>
            )}
          </div>

          {/* Tabs bộ lọc */}
          <div className="pmw-filter-tabs">
            <button
              type="button"
              className={`pmw-tab-btn ${filterTab === 'ALL' ? 'active' : ''}`}
              onClick={() => setFilterTab('ALL')}
            >
              Tất cả
            </button>
            <button
              type="button"
              className={`pmw-tab-btn ${filterTab === 'ACTIVE' ? 'active' : ''}`}
              onClick={() => setFilterTab('ACTIVE')}
            >
              Còn hạn
            </button>
            <button
              type="button"
              className={`pmw-tab-btn ${filterTab === 'UNREAD' ? 'active' : ''}`}
              onClick={() => setFilterTab('UNREAD')}
            >
              Chưa đọc
            </button>
            <button
              type="button"
              className={`pmw-tab-btn ${filterTab === 'EXPIRED' ? 'active' : ''}`}
              onClick={() => setFilterTab('EXPIRED')}
            >
              Hết hạn
            </button>
          </div>
        </div>

        {/* Danh sách cuộc hội thoại */}
        <div className="pmw-conv-list">
          {isLoadingConversations ? (
            <div className="pmw-list-loading">
              <i className="fas fa-spinner fa-spin" /> Đang tải danh sách bác sĩ...
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="pmw-list-empty">
              <i className="far fa-comments" />
              <p>Không tìm thấy cuộc trò chuyện nào phù hợp.</p>
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isSelected = selectedConversation?.id === conv.id;
              const doc = conv.doctorUser;
              const docName = doc ? `BS. ${doc.lastName || ''} ${doc.firstName || ''}`.trim() : 'Bác sĩ phụ trách';
              const specialty = doc?.doctorInfoData?.specialtyData?.name || 'Chuyên khoa';
              const identity = conv.patientIdentity;
              const relBadge = getRelationshipBadge(identity);
              const isExpired = !conv.isFollowUpActive;

              return (
                <div
                  key={conv.id}
                  className={`pmw-conv-item ${isSelected ? 'selected' : ''} ${isExpired ? 'expired' : ''}`}
                  onClick={() => setSelectedConversation(conv)}
                >
                  {/* Avatar bác sĩ */}
                  <div className="pmw-conv-avatar">
                    {doc?.image ? (
                      <img src={CommonUtils.decodeBase64Image(doc.image)} alt={docName} />
                    ) : (
                      <div className="pmw-avatar-fallback">👨‍⚕️</div>
                    )}
                    {conv.isFollowUpActive && <span className="pmw-online-dot" title="Còn trong thời hạn tư vấn" />}
                  </div>

                  {/* Thông tin chính */}
                  <div className="pmw-conv-body">
                    <div className="pmw-conv-top">
                      <h4 className="pmw-doc-name">{docName}</h4>
                      <span className="pmw-conv-time">
                        {conv.latestMessage?.createdAt
                          ? moment(conv.latestMessage.createdAt).format('HH:mm')
                          : moment(conv.lastMessageAt || conv.createdAt).format('DD/MM')}
                      </span>
                    </div>

                    <div className="pmw-doc-specialty">{specialty}</div>

                    {/* Danh tính người được khám */}
                    <div className="pmw-patient-identity-row">
                      <span className={`pmw-rel-badge ${relBadge.cls}`}>{relBadge.label}</span>
                      <span className="pmw-patient-name">{identity?.actualPatientName || 'Bệnh nhân'}</span>
                    </div>

                    {/* Tin nhắn gần nhất */}
                    <p className="pmw-last-message">
                      {conv.latestMessage?.content ? conv.latestMessage.content : 'Nhấn để bắt đầu theo dõi sau khám'}
                    </p>

                    {/* Badge thời hạn còn lại */}
                    <div className="pmw-entitlement-row">
                      {conv.isFollowUpActive ? (
                        <span className="pmw-entitlement-badge pmw-entitlement-badge--active">
                          <i className="fas fa-hourglass-half tw-mr-1" />
                          {formatRemainingTime(conv.remainingTimeMs)}
                        </span>
                      ) : (
                        <span className="pmw-entitlement-badge pmw-entitlement-badge--expired">
                          <i className="fas fa-lock tw-mr-1" /> Đã hết hạn · Chỉ xem
                        </span>
                      )}

                      {conv.unreadCount > 0 && (
                        <span className="pmw-unread-badge">{conv.unreadCount}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* ========================================================= */}
      {/* CỘT 2: KHUNG CHAT LIÊN TỤC + ENCOUNTER MILESTONES */}
      {/* ========================================================= */}
      <main className="pmw-main">
        {selectedConversation ? (
          <>
            {/* Header khung chat */}
            <header className="pmw-chat-header">
              <div className="pmw-chat-header__doctor">
                <div className="pmw-doc-avatar-lg">
                  {selectedConversation.doctorUser?.image ? (
                    <img
                      src={CommonUtils.decodeBase64Image(selectedConversation.doctorUser.image)}
                      alt="Doctor"
                    />
                  ) : (
                    <span>👨‍⚕️</span>
                  )}
                </div>
                <div className="pmw-doc-header-info">
                  <h3>
                    BS. {selectedConversation.doctorUser?.lastName} {selectedConversation.doctorUser?.firstName}
                  </h3>
                  <div className="pmw-doc-meta-sub">
                    <span>{selectedConversation.doctorUser?.doctorInfoData?.specialtyData?.name || 'Chuyên khoa'}</span>
                    <span className="pmw-meta-dot">·</span>
                    <span className="pmw-patient-context">
                      Hồ sơ người khám: <strong>{selectedConversation.patientIdentity?.actualPatientName}</strong>{' '}
                      ({getRelationshipBadge(selectedConversation.patientIdentity).label})
                    </span>
                  </div>
                </div>
              </div>

              {/* Trạng thái quyền chat & Nút mở hồ sơ */}
              <div className="pmw-chat-header__actions">
                {selectedConversation.isFollowUpActive ? (
                  <div className="pmw-header-status-pill pmw-header-status-pill--active">
                    <span className="status-dot" />
                    <span>Quyền chat {formatRemainingTime(selectedConversation.remainingTimeMs)}</span>
                  </div>
                ) : (
                  <div className="pmw-header-status-pill pmw-header-status-pill--readonly">
                    <i className="fas fa-eye tw-mr-1" />
                    <span>Chế độ chỉ xem hồ sơ</span>
                  </div>
                )}

                <button
                  type="button"
                  className="pmw-btn-view-records"
                  onClick={() => handleOpenDrawer()}
                  title="Mở hồ sơ chẩn đoán & đơn thuốc"
                >
                  <i className="fas fa-file-medical tw-mr-1.5" /> Hồ sơ phiên khám
                </button>
              </div>
            </header>

            {/* Thân dòng thời gian chat */}
            <div className="pmw-chat-body">
              {/* Sticky Context Bar nếu có */}
              {workspaceData?.encounter && (
                <div className="pmw-context-sticky-bar">
                  <div className="csb-left">
                    <i className="fas fa-stethoscope tw-mr-1.5 text-teal" />
                    <span>
                      Đang trao đổi sau phiên khám ngày{' '}
                      <strong>{moment(parseInt(workspaceData.encounter.date, 10)).format('DD/MM/YYYY')}</strong>
                    </span>
                  </div>
                  <span className="csb-diag">
                    Chẩn đoán: <strong>{workspaceData.encounter.diagnosis}</strong>
                  </span>
                </div>
              )}

              {/* Danh sách tin nhắn & Mốc phiên khám */}
              <div className="pmw-messages-stream">
                {/* 1. Mốc phiên khám đầu tiên hoặc các mốc khám */}
                {encounterMilestones.map((enc, idx) => (
                  <React.Fragment key={`enc-${enc.id || idx}`}>
                    <div className="pmw-encounter-milestone">
                      <div className="milestone-line" />
                      <div className="milestone-card">
                        <div className="milestone-card__header">
                          <span className="milestone-tag">📌 Mốc Phiên Khám #{enc.bookingId || enc.id}</span>
                          <span className="milestone-date">
                            {moment(parseInt(enc.date, 10)).isValid()
                              ? moment(parseInt(enc.date, 10)).format('dddd, DD/MM/YYYY')
                              : enc.date}
                          </span>
                        </div>
                        <h4 className="milestone-diagnosis">{enc.diagnosis || 'Đang theo dõi sức khỏe tổng quát'}</h4>
                        <p className="milestone-clinic">{enc.clinicName || 'Cơ sở Y tế BookingCare'}</p>

                        <div className="milestone-actions">
                          <button
                            type="button"
                            className="milestone-btn-open"
                            onClick={() => handleOpenDrawer(enc)}
                          >
                            <i className="fas fa-prescription-bottle-alt tw-mr-1" /> Xem hồ sơ & đơn thuốc phiên này
                          </button>
                        </div>
                      </div>
                      <div className="milestone-line" />
                    </div>
                  </React.Fragment>
                ))}

                {/* 2. Luồng tin nhắn chat */}
                {isLoadingMessages ? (
                  <div className="pmw-stream-loading">
                    <i className="fas fa-spinner fa-spin" /> Đang tải lịch sử trao đổi...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="pmw-stream-empty">
                    <p>Chưa có tin nhắn nào trong hội thoại này. Bạn có thể gửi câu hỏi hoặc thắc mắc sau buổi khám.</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.senderId === userInfo?.id;
                    return (
                      <div key={msg.id} className={`pmw-msg-bubble-wrap ${isMe ? 'me' : 'other'}`}>
                        <div className="pmw-msg-bubble">
                          <p className="pmw-msg-text">{msg.content}</p>
                          <span className="pmw-msg-meta">
                            {moment(msg.createdAt).format('HH:mm')}
                            {isMe && <i className="fas fa-check tw-ml-1" style={{ fontSize: 10 }} />}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}

                {partnerTyping && (
                  <div className="pmw-typing-indicator">
                    <span>Bác sĩ đang nhập tin nhắn...</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Footer nhập tin nhắn / Banner hết hạn */}
            <footer className="pmw-chat-footer">
              {selectedConversation.isFollowUpActive ? (
                <form className="pmw-input-box" onSubmit={handleSendMessage}>
                  <textarea
                    ref={textareaRef}
                    rows={1}
                    className="pmw-textarea"
                    placeholder="Nhập nội dung trao đổi sau khám với bác sĩ (nhấn Enter để gửi)..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                  <button
                    type="submit"
                    className="pmw-send-btn"
                    disabled={!inputText.trim() || isSending}
                    title="Gửi tin nhắn"
                  >
                    {isSending ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-paper-plane" />}
                  </button>
                </form>
              ) : (
                <div className="pmw-expired-notice">
                  <div className="pmw-expired-icon">
                    <i className="fas fa-history" />
                  </div>
                  <div className="pmw-expired-text">
                    <h4>Thời gian tư vấn qua chat cho phiên khám này đã kết thúc</h4>
                    <p>Bạn vẫn có thể xem lại toàn bộ lịch sử trao đổi và hồ sơ y tế trước đây mà không bị giới hạn.</p>
                  </div>
                  <Link to={path.DOCTOR_LIST} className="pmw-btn-rebook">
                    <i className="fas fa-calendar-plus tw-mr-1.5" /> Đặt lịch tái khám
                  </Link>
                </div>
              )}
            </footer>
          </>
        ) : (
          <div className="pmw-no-selection">
            <div className="pmw-no-selection__box">
              <span className="no-selection-icon">💬</span>
              <h3>Chọn bác sĩ để xem cuộc trò chuyện</h3>
              <p>Chọn một bác sĩ từ danh sách bên trái để theo dõi hồ sơ điều trị và trao đổi sau khám.</p>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================= */}
      {/* DRAWER BÊN PHẢI: CLINICAL ENCOUNTER RECORD DRAWER */}
      {/* ========================================================= */}
      {isDrawerOpen && (
        <div className="pmw-drawer-overlay" onClick={() => setIsDrawerOpen(false)}>
          <div className="pmw-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="pmw-drawer__header">
              <div className="pmw-drawer__title">
                <i className="fas fa-file-medical-alt text-teal tw-mr-2" />
                <h3>Hồ sơ phiên khám #{selectedEncounterForDrawer?.bookingId || selectedEncounterForDrawer?.id}</h3>
              </div>
              <button
                type="button"
                className="pmw-drawer__close"
                onClick={() => setIsDrawerOpen(false)}
                aria-label="Đóng"
              >
                &times;
              </button>
            </div>

            <div className="pmw-drawer__body">
              {/* 1. Thông tin chung phiên khám */}
              <div className="drawer-section">
                <h4 className="drawer-sec-title">Thông tin buổi khám</h4>
                <div className="drawer-grid">
                  <div className="drawer-field">
                    <span className="label">Ngày khám:</span>
                    <span className="value">
                      {moment(parseInt(selectedEncounterForDrawer?.date, 10)).isValid()
                        ? moment(parseInt(selectedEncounterForDrawer?.date, 10)).format('DD/MM/YYYY')
                        : selectedEncounterForDrawer?.date}
                    </span>
                  </div>
                  <div className="drawer-field">
                    <span className="label">Cơ sở khám:</span>
                    <span className="value">{selectedEncounterForDrawer?.clinicName || 'BookingCare'}</span>
                  </div>
                  <div className="drawer-field">
                    <span className="label">Người khám:</span>
                    <span className="value text-teal font-bold">
                      {workspaceData?.patientIdentity?.actualPatientName || 'Bệnh nhân'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Chẩn đoán & Lời dặn */}
              <div className="drawer-section">
                <h4 className="drawer-sec-title">Chẩn đoán & Hướng dẫn</h4>
                <div className="drawer-callout drawer-callout--primary">
                  <span className="callout-label">Chẩn đoán chuyên môn:</span>
                  <p className="callout-text">{selectedEncounterForDrawer?.diagnosis || 'Đang theo dõi sức khỏe tổng quát'}</p>
                </div>
                {selectedEncounterForDrawer?.careInstructions && (
                  <div className="drawer-callout drawer-callout--info">
                    <span className="callout-label">Lời dặn của Bác sĩ:</span>
                    <p className="callout-text">{selectedEncounterForDrawer?.careInstructions}</p>
                  </div>
                )}
              </div>

              {/* 3. Đơn thuốc điện tử */}
              <div className="drawer-section">
                <h4 className="drawer-sec-title">
                  <i className="fas fa-pills tw-mr-1.5 text-teal" /> Đơn thuốc điện tử (
                  {(selectedEncounterForDrawer?.medicines || []).length})
                </h4>
                {(selectedEncounterForDrawer?.medicines || []).length === 0 ? (
                  <p className="drawer-empty-text">Không có chỉ định dùng thuốc trong phiên khám này.</p>
                ) : (
                  <div className="drawer-med-list">
                    {selectedEncounterForDrawer.medicines.map((med, idx) => (
                      <div key={idx} className="drawer-med-item">
                        <div className="med-header">
                          <span className="med-name">{med.name}</span>
                          <span className="med-qty">
                            {med.quantity} {med.unit}
                          </span>
                        </div>
                        {med.concentration && <span className="med-conc">Hàm lượng: {med.concentration}</span>}
                        {med.dosage && <p className="med-usage">Liều dùng: {med.dosage}</p>}
                        {med.instructions && <p className="med-instr">Hướng dẫn: {med.instructions}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 4. Tệp đính kèm & Kết quả xét nghiệm */}
              <div className="drawer-section">
                <h4 className="drawer-sec-title">
                  <i className="fas fa-paperclip tw-mr-1.5 text-teal" /> Tài liệu & Kết quả xét nghiệm (
                  {(selectedEncounterForDrawer?.attachments || []).length})
                </h4>
                {(selectedEncounterForDrawer?.attachments || []).length === 0 ? (
                  <p className="drawer-empty-text">Chưa có tệp đính kèm nào được tải lên cho phiên khám này.</p>
                ) : (
                  <div className="drawer-attachment-list">
                    {selectedEncounterForDrawer.attachments.map((att) => {
                      const isImg = att.fileType?.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(att.fileName || '');
                      const catMeta = getCategoryMeta(att.category);
                      const dataUrl = isImg ? getAttachmentDataUrl(att) : null;

                      return (
                        <div
                          key={att.id}
                          className="drawer-att-item"
                          onClick={() => handleOpenAttachment(att)}
                          title={`Nhấn để mở xem: ${att.fileName}`}
                        >
                          <div className="att-thumb-wrap">
                            {dataUrl ? (
                              <img src={dataUrl} alt={att.fileName} className="att-thumb-img" />
                            ) : (
                              <div className="att-thumb-placeholder" style={{ color: catMeta.color }}>
                                <i className={catMeta.icon} />
                              </div>
                            )}
                          </div>
                          <div className="att-info">
                            <span className="att-name" title={att.fileName}>
                              {att.fileName}
                            </span>
                            <div className="att-meta-row">
                              <span
                                className="att-category-badge"
                                style={{
                                  backgroundColor: `${catMeta.color}18`,
                                  color: catMeta.color,
                                }}
                              >
                                <i className={`${catMeta.icon} tw-mr-1`} />
                                {catMeta.label}
                              </span>
                              {att.fileSize > 0 && (
                                <span className="att-size">{formatFileSize(att.fileSize)}</span>
                              )}
                            </div>
                          </div>
                          <div className="att-actions">
                            <button
                              type="button"
                              className="att-btn-action"
                              title="Xem chi tiết tài liệu"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenAttachment(att);
                              }}
                            >
                              <i className="fas fa-eye" />
                            </button>
                            <button
                              type="button"
                              className="att-btn-action"
                              title="Tải tệp về máy"
                              onClick={(e) => handleDownloadAttachment(e, att)}
                            >
                              <i className="fas fa-download" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="pmw-drawer__footer">
              <button
                type="button"
                className="pmw-drawer-btn-close"
                onClick={() => setIsDrawerOpen(false)}
              >
                Đóng hồ sơ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* LIGHTBOX / PREVIEW MODAL XEM TÀI LIỆU & KẾT QUẢ XÉT NGHIỆM */}
      {/* ========================================================= */}
      {previewModal.isOpen && (
        <div className="pmw-preview-overlay" onClick={handleClosePreview}>
          <div className="pmw-preview-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="pmw-preview-header">
              <div className="pmw-preview-title-box">
                <div
                  className="preview-cat-icon-badge"
                  style={{
                    backgroundColor: `${getCategoryMeta(previewModal.attachment?.category).color}20`,
                    color: getCategoryMeta(previewModal.attachment?.category).color,
                  }}
                >
                  <i className={getCategoryMeta(previewModal.attachment?.category).icon} />
                </div>
                <div className="preview-title-text">
                  <h4 className="preview-filename" title={previewModal.attachment?.fileName}>
                    {previewModal.attachment?.fileName}
                  </h4>
                  <span className="preview-meta">
                    {getCategoryMeta(previewModal.attachment?.category).label}
                    {previewModal.attachment?.fileSize > 0 && ` • ${formatFileSize(previewModal.attachment?.fileSize)}`}
                    {selectedEncounterForDrawer && ` • Phiên khám #${selectedEncounterForDrawer.id}`}
                  </span>
                </div>
              </div>

              <div className="pmw-preview-toolbar">
                {previewModal.isImage && !previewModal.isLoading && (
                  <>
                    <button
                      type="button"
                      className="preview-tool-btn"
                      title="Thu nhỏ"
                      onClick={() => setPreviewModal((prev) => ({ ...prev, zoom: Math.max(prev.zoom - 0.25, 0.5) }))}
                    >
                      <i className="fas fa-search-minus" />
                    </button>
                    <span className="preview-zoom-indicator">{Math.round(previewModal.zoom * 100)}%</span>
                    <button
                      type="button"
                      className="preview-tool-btn"
                      title="Phóng to"
                      onClick={() => setPreviewModal((prev) => ({ ...prev, zoom: Math.min(prev.zoom + 0.25, 3) }))}
                    >
                      <i className="fas fa-search-plus" />
                    </button>
                    <button
                      type="button"
                      className="preview-tool-btn"
                      title="Xoay 90 độ"
                      onClick={() => setPreviewModal((prev) => ({ ...prev, rotation: (prev.rotation + 90) % 360 }))}
                    >
                      <i className="fas fa-redo" />
                    </button>
                    <button
                      type="button"
                      className="preview-tool-btn"
                      title="Kích thước gốc"
                      onClick={() => setPreviewModal((prev) => ({ ...prev, zoom: 1, rotation: 0 }))}
                    >
                      <i className="fas fa-compress-arrows-alt" />
                    </button>
                    <div className="preview-divider" />
                  </>
                )}

                {previewModal.srcUrl && (
                  <button
                    type="button"
                    className="preview-tool-btn"
                    title="Mở trong thẻ mới"
                    onClick={() => window.open(previewModal.srcUrl, '_blank')}
                  >
                    <i className="fas fa-external-link-alt" />
                  </button>
                )}

                <button
                  type="button"
                  className="preview-tool-btn"
                  title="Tải tệp về máy"
                  onClick={(e) => handleDownloadAttachment(e, previewModal.attachment)}
                >
                  <i className="fas fa-download" />
                </button>

                <button
                  type="button"
                  className="preview-tool-btn preview-close-btn"
                  title="Đóng (Phím Esc)"
                  onClick={handleClosePreview}
                >
                  <i className="fas fa-times" />
                </button>
              </div>
            </div>

            <div className="pmw-preview-body">
              {previewModal.isLoading ? (
                <div className="preview-loading-spinner">
                  <i className="fas fa-circle-notch fa-spin" />
                  <span>Đang tải tài liệu xét nghiệm y tế...</span>
                </div>
              ) : previewModal.isImage ? (
                <div className="preview-viewport">
                  <img
                    src={previewModal.srcUrl}
                    alt={previewModal.attachment?.fileName}
                    className="preview-image-element"
                    style={{
                      transform: `scale(${previewModal.zoom}) rotate(${previewModal.rotation}deg)`,
                      transition: 'transform 0.2s ease',
                    }}
                  />
                </div>
              ) : previewModal.isPdf ? (
                <div className="preview-pdf-viewport">
                  <iframe
                    src={previewModal.srcUrl}
                    title={previewModal.attachment?.fileName}
                    className="preview-pdf-iframe"
                  />
                </div>
              ) : (
                <div className="preview-unsupported">
                  <div className="unsupported-icon-wrap">
                    <i className="fas fa-file-medical-alt" />
                  </div>
                  <h5>Định dạng tài liệu y tế</h5>
                  <p>Tệp này không hỗ trợ trình xem trực tiếp trên trình duyệt. Vui lòng tải về máy để mở.</p>
                  <button
                    type="button"
                    className="preview-btn-download-big"
                    onClick={(e) => handleDownloadAttachment(e, previewModal.attachment)}
                  >
                    <i className="fas fa-download tw-mr-2" /> Tải về máy tính
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientMessagesWorkspace;
