import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { MessageSquare, AlertCircle, Users, User } from 'lucide-react';
import { getOrCreateConversationForBooking } from '../../services/chatApiService';
import { FEATURES } from '../../config/features';
import ChatWindow from '../Chat/ChatWindow';
import './PatientChatModal.scss';

// Ánh xạ relationship code sang tên tiếng Việt
const RELATIONSHIP_LABEL = {
  CHILD: 'Con',
  PARENT: 'Bố / Mẹ',
  SPOUSE: 'Vợ / Chồng',
  SIBLING: 'Anh / Chị / Em',
  GRANDPARENT: 'Ông / Bà',
  RELATIVE: 'Người thân',
};

/**
 * [Phase 3] Medical Context Banner
 * Hiển thị cảnh báo y khoa rõ ràng khi phiên tư vấn dành cho người thân,
 * giúp bác sĩ không nhầm lẫn giữa chủ tài khoản và người được khám.
 */
const MedicalContextBanner = ({ familyContext, guardianName }) => {
  if (!familyContext || !familyContext.isFamilyBooking) return null;

  const relLabel = RELATIONSHIP_LABEL[familyContext.relationship] || 'Người thân';

  return (
    <div className="medical-context-banner">
      <div className="banner-icon-wrap">
        <Users size={20} />
      </div>
      <div className="banner-body">
        <div className="banner-title">
          <span className="badge-family">Khám cho người thân</span>
          Phiên tư vấn này dành cho{' '}
          <strong>{familyContext.patientName}</strong>
          {' '}({relLabel})
        </div>
        <div className="banner-meta">
          <span>
            <i className="fas fa-user-shield me-1" />
            Người đặt / Giám hộ:{' '}
            <strong>{guardianName || 'Chủ tài khoản'}</strong>
          </span>
          {familyContext.medicalHistory && (
            <span className="banner-allergy">
              <i className="fas fa-exclamation-triangle me-1 text-warning" />
              Tiền sử:{' '}
              <strong>{familyContext.medicalHistory}</strong>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

const PatientChatModal = ({ isOpen, onClose, booking, guardianName }) => {
  const [conversation, setConversation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [familyContext, setFamilyContext] = useState(null);

  useEffect(() => {
    if (!isOpen || !booking?.id) {
      setConversation(null);
      setErrorMsg(null);
      setFamilyContext(null);
      return;
    }

    if (booking.statusId !== 'S3') {
      setErrorMsg('Chức năng nhắn tin chỉ khả dụng cho các lịch khám đã hoàn tất (S3).');
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setErrorMsg(null);

    getOrCreateConversationForBooking(booking.id)
      .then((res) => {
        if (!isMounted) return;
        if (res && res.errCode === 0 && res.data) {
          setConversation(res.data);
          // [Phase 3] Nhận familyContext từ API response
          if (res.data.familyContext) {
            setFamilyContext(res.data.familyContext);
          }
        } else {
          setErrorMsg(res?.message || 'Không thể mở cuộc trò chuyện với bác sĩ.');
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Error opening chat for booking:', err);
        setErrorMsg(err?.response?.data?.message || 'Lỗi kết nối máy chủ khi mở cuộc hội thoại.');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, booking]);

  if (!isOpen || !FEATURES.ENABLE_CHAT) return null;

  return (
    <div className="patient-chat-modal-backdrop" onClick={onClose}>
      <div className="patient-chat-modal-dialog" onClick={(e) => e.stopPropagation()}>
        {isLoading && (
          <div className="chat-modal-loading">
            <div className="spinner-border text-teal" role="status" />
            <p>Đang chuẩn bị phiên trao đổi với bác sĩ...</p>
          </div>
        )}

        {!isLoading && errorMsg && (
          <div className="chat-modal-error">
            <div className="error-icon-wrap">
              <AlertCircle size={36} />
            </div>
            <h4>Không thể mở cuộc trò chuyện</h4>
            <p>{errorMsg}</p>
            <button type="button" className="btn-close-error" onClick={onClose}>
              Đóng lại
            </button>
          </div>
        )}

        {!isLoading && conversation && (
          <>
            {/* [Phase 3] Medical Context Banner — hiển thị trên đầu chat nếu booking cho người thân */}
            <MedicalContextBanner
              familyContext={familyContext}
              guardianName={guardianName}
            />
            <ChatWindow
              conversation={conversation}
              onClose={onClose}
              onStatusChange={(newStatus) => {
                setConversation((prev) => (prev ? { ...prev, status: newStatus } : prev));
              }}
              isDrawer={false}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default PatientChatModal;
