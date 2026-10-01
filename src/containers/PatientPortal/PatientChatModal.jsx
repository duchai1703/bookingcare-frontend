import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { MessageSquare, AlertCircle } from 'lucide-react';
import { getOrCreateConversationForBooking } from '../../services/chatApiService';
import ChatWindow from '../Chat/ChatWindow';
import './PatientChatModal.scss';

const PatientChatModal = ({ isOpen, onClose, booking }) => {
  const [conversation, setConversation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    if (!isOpen || !booking?.id) {
      setConversation(null);
      setErrorMsg(null);
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

  if (!isOpen) return null;

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
          <ChatWindow
            conversation={conversation}
            onClose={onClose}
            onStatusChange={(newStatus) => {
              setConversation((prev) => (prev ? { ...prev, status: newStatus } : prev));
            }}
            isDrawer={false}
          />
        )}
      </div>
    </div>
  );
};

export default PatientChatModal;
