import React from 'react';
import { FormattedMessage } from 'react-intl';
import { Check, Inbox, Loader2 } from 'lucide-react';
import NotificationItem from './NotificationItem';

const NotificationDropdown = ({
  notifications = [],
  unreadCount = 0,
  isLoading = false,
  isLoadingMore = false,
  hasMore = false,
  role = 'patient',
  activeFilter = 'all',
  onFilterChange,
  onMarkAsRead,
  onMarkAllAsRead,
  onLoadMore,
  onClose,
}) => {
  const filteredNotifications =
    activeFilter === 'unread'
      ? notifications.filter((n) => !n.isRead)
      : notifications;

  return (
    <div className="notification-dropdown" onClick={(e) => e.stopPropagation()}>
      {/* Header */}
      <div className="dropdown-header">
        <div className="header-title-box">
          <h3 className="header-title">
            <FormattedMessage id="notification.title" defaultMessage="Thông báo" />
          </h3>
          {unreadCount > 0 && (
            <span className="header-unread-chip">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>

        <button
          type="button"
          className="mark-all-read-btn"
          onClick={onMarkAllAsRead}
          disabled={unreadCount === 0 || isLoading}
          title="Đánh dấu tất cả thông báo là đã đọc"
          aria-label="Đánh dấu tất cả thông báo là đã đọc"
        >
          <Check size={14} strokeWidth={2.4} />
          <span>
            <FormattedMessage id="notification.mark-all-read" defaultMessage="Đánh dấu đã đọc" />
          </span>
        </button>
      </div>

      {/* Tabs */}
      <div className="dropdown-tabs">
        <button
          type="button"
          className={`tab-btn ${activeFilter === 'all' ? 'active' : ''}`}
          onClick={() => onFilterChange && onFilterChange('all')}
        >
          <FormattedMessage id="notification.tab-all" defaultMessage="Tất cả" />
        </button>
        <button
          type="button"
          className={`tab-btn ${activeFilter === 'unread' ? 'active' : ''}`}
          onClick={() => onFilterChange && onFilterChange('unread')}
        >
          <FormattedMessage id="notification.tab-unread" defaultMessage="Chưa đọc" />
          {unreadCount > 0 && ` (${unreadCount > 99 ? '99+' : unreadCount})`}
        </button>
      </div>

      {/* Body List */}
      <div className="dropdown-body">
        {isLoading && notifications.length === 0 ? (
          <div className="loading-notifications">
            {[1, 2, 3].map((idx) => (
              <div key={idx} className="skeleton-item">
                <div className="skeleton-icon" />
                <div className="skeleton-content">
                  <div className="skeleton-line line-title" />
                  <div className="skeleton-line line-msg" />
                  <div className="skeleton-line line-time" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="empty-notifications">
            <div className="empty-icon">
              <Inbox size={24} />
            </div>
            <p>
              {activeFilter === 'unread' ? (
                <FormattedMessage
                  id="notification.empty-unread"
                  defaultMessage="Bạn đã đọc hết tất cả thông báo!"
                />
              ) : (
                <FormattedMessage
                  id="notification.empty"
                  defaultMessage="Không có thông báo nào"
                />
              )}
            </p>
          </div>
        ) : (
          <ul className="notification-list">
            {filteredNotifications.map((notif) => (
              <NotificationItem
                key={notif.id}
                notification={notif}
                role={role}
                onMarkAsRead={onMarkAsRead}
                onCloseDropdown={onClose}
              />
            ))}
          </ul>
        )}
      </div>

      {/* Footer / Load more */}
      {hasMore && activeFilter === 'all' && (
        <div className="dropdown-footer">
          <button
            type="button"
            className="load-more-btn"
            onClick={onLoadMore}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? (
              <Loader2 size={14} className="animate-spin inline mr-1" />
            ) : null}
            <FormattedMessage id="notification.load-more" defaultMessage="Xem thêm thông báo" />
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
