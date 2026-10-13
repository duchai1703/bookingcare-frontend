// ═══════════════════════════════════════════════════════════════════════
// [Phase 06E — AI PATIENT ASSISTANT] NotificationListCard.jsx
// Displays Real Patient Notifications with Unread Count
// Parity with Notification Dropdown / System Notifications
// ═══════════════════════════════════════════════════════════════════════

import React, { memo } from 'react';
import {
  Bell,
  CheckCircle2,
  Calendar,
  Wallet,
  Clock,
  Info,
} from 'lucide-react';

const NOTIF_ICONS = {
  BOOKING: Calendar,
  BOOKING_CONFIRMED: CheckCircle2,
  WALLET: Wallet,
  DEFAULT: Info,
};

const NotificationListCard = memo(({ notificationList }) => {
  if (!notificationList || typeof notificationList !== 'object') return null;

  const data = notificationList.data || notificationList;
  const unreadCount = data.unreadCount || 0;
  const notifications = Array.isArray(data.notifications) ? data.notifications : [];

  return (
    <div className="ai-notification-list-card" role="region" aria-label="Danh sách thông báo của bạn">
      <div className="notif-card-header">
        <div className="notif-header-title">
          <Bell size={18} className="header-icon" />
          <span>Thông báo của bạn</span>
        </div>
        {unreadCount > 0 ? (
          <span className="unread-badge">{unreadCount} chưa đọc</span>
        ) : (
          <span className="all-read-badge">Đã đọc tất cả</span>
        )}
      </div>

      <div className="notif-card-body">
        {notifications.length === 0 ? (
          <div className="empty-notif-box">
            <span>Bạn hiện không có thông báo nào.</span>
          </div>
        ) : (
          <div className="notif-items-list">
            {notifications.map((item, idx) => {
              const IconComp = NOTIF_ICONS[item.type] || NOTIF_ICONS.DEFAULT;
              return (
                <div
                  key={item.id || idx}
                  className={`notif-item ${item.isRead ? 'read' : 'unread'}`}
                >
                  <div className="notif-icon-col">
                    <IconComp size={15} />
                  </div>
                  <div className="notif-content-col">
                    <div className="notif-top-row">
                      <span className="notif-item-title">{item.title}</span>
                      {!item.isRead && <span className="unread-dot" />}
                    </div>
                    <p className="notif-item-msg">{item.message}</p>
                    <div className="notif-meta-row">
                      <Clock size={11} />
                      <span>{item.createdAt ? new Date(item.createdAt).toLocaleString('vi-VN') : '—'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
});

NotificationListCard.displayName = 'NotificationListCard';

export default NotificationListCard;
