import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { Bell } from 'lucide-react';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from '../../services/notificationService';
import chatSocketService from '../../services/chatSocketService';
import NotificationDropdown from './NotificationDropdown';
import './Notification.scss';

const PAGE_SIZE = 15;

const NotificationBell = ({ role = 'patient', className = '', style = {} }) => {
  const isLoggedIn = useSelector((state) => state.user?.isLoggedIn);
  const userInfo = useSelector((state) => state.user?.userInfo);

  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [activeFilter, setActiveFilter] = useState('all');

  const containerRef = useRef(null);

  // 1. Initial Unread Count Fetch
  const fetchUnreadCount = useCallback(async () => {
    if (!isLoggedIn) return;
    try {
      const res = await getUnreadCount();
      const errCode = res?.errCode !== undefined ? res.errCode : res?.data?.errCode;
      if (errCode === 0) {
        const payload = res?.data !== undefined && res?.data?.unreadCount !== undefined ? res.data : (res?.data || res);
        const count = payload?.unreadCount ?? (res?.unreadCount ?? 0);
        setUnreadCount(Number(count || 0));
      }
    } catch (err) {
      console.warn('Failed to fetch unread notification count:', err);
    }
  }, [isLoggedIn]);

  // 2. Fetch Notification List
  const fetchNotificationList = useCallback(
    async (nextOffset = 0, isInitial = false) => {
      if (!isLoggedIn) return;
      if (isInitial) setIsLoading(true);
      else setIsLoadingMore(true);

      try {
        const res = await getNotifications({
          limit: PAGE_SIZE,
          offset: nextOffset,
        });

        const errCode = res?.errCode !== undefined ? res.errCode : res?.data?.errCode;
        if (errCode === 0) {
          const payload = res?.data?.rows !== undefined ? res.data : (res?.data || res);
          const rows = payload?.rows || payload?.notifications || [];
          const count = payload?.count || payload?.total || 0;

          setNotifications((prev) => {
            if (isInitial) return rows;
            // Prevent duplicate entries
            const existingIds = new Set(prev.map((n) => n.id));
            const newUnique = rows.filter((n) => !existingIds.has(n.id));
            return [...prev, ...newUnique];
          });

          setOffset(nextOffset);
          setHasMore(nextOffset + rows.length < count);
        }
      } catch (err) {
        console.error('Failed to fetch notifications:', err);
      } finally {
        if (isInitial) setIsLoading(false);
        else setIsLoadingMore(false);
      }
    },
    [isLoggedIn]
  );

  // 3. Mark Single Notification as Read
  const handleMarkAsRead = useCallback(
    async (id) => {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((item) => (item.id === id ? { ...item, isRead: true } : item))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      try {
        await markAsRead(id);
      } catch (err) {
        console.error('Failed to mark notification as read:', err);
        // Re-sync unread count on error
        fetchUnreadCount();
      }
    },
    [fetchUnreadCount]
  );

  // 4. Mark All Notifications as Read
  const handleMarkAllAsRead = useCallback(async () => {
    if (unreadCount === 0) return;

    // Optimistic update
    setNotifications((prev) =>
      prev.map((item) => ({ ...item, isRead: true }))
    );
    setUnreadCount(0);

    try {
      await markAllAsRead();
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
      fetchUnreadCount();
    }
  }, [unreadCount, fetchUnreadCount]);

  // 5. Load More Pagination
  const handleLoadMore = useCallback(() => {
    if (!hasMore || isLoadingMore) return;
    const nextOffset = offset + PAGE_SIZE;
    fetchNotificationList(nextOffset, false);
  }, [hasMore, isLoadingMore, offset, fetchNotificationList]);

  // 6. Realtime Socket Setup & Unread Fetch
  useEffect(() => {
    if (!isLoggedIn) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    fetchUnreadCount();

    // Ensure socket connected
    chatSocketService.connect();

    // Event 1: New Realtime Notification
    const unsubNew = chatSocketService.on('notification:new', (payload) => {
      if (!payload?.notification) return;

      const newNotif = payload.notification;

      setNotifications((prev) => {
        // Prevent duplicate appending
        if (prev.some((n) => n.id === newNotif.id)) return prev;
        return [newNotif, ...prev];
      });

      if (typeof payload.unreadCount === 'number') {
        setUnreadCount(payload.unreadCount);
      } else {
        setUnreadCount((prev) => prev + 1);
      }
    });

    // Event 2: Notification Updated (Read) from another tab/client
    const unsubUpdate = chatSocketService.on('notification:updated', (payload) => {
      if (!payload?.id) return;
      setNotifications((prev) =>
        prev.map((n) => (n.id === payload.id ? { ...n, isRead: true } : n))
      );
      if (typeof payload.unreadCount === 'number') {
        setUnreadCount(payload.unreadCount);
      }
    });

    // Event 3: All Read from another tab
    const unsubReadAll = chatSocketService.on('notification:read-all', (payload) => {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    });

    return () => {
      unsubNew();
      unsubUpdate();
      unsubReadAll();
    };
  }, [isLoggedIn, userInfo?.id, fetchUnreadCount]);

  // 7. Click Outside Listener to Close Dropdown
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isOpen]);

  // 8. Toggle Dropdown & Fetch if first time
  const handleToggleDropdown = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (nextState && notifications.length === 0) {
      fetchNotificationList(0, true);
    }
  };

  if (!isLoggedIn) {
    return null;
  }

  return (
    <div
      className={`notification-bell-container ${className}`}
      style={style}
      ref={containerRef}
    >
      <button
        type="button"
        className={`notification-bell-btn ${isOpen ? 'has-active-dropdown' : ''}`}
        onClick={handleToggleDropdown}
        title="Thông báo"
        aria-label="Thông báo"
        aria-expanded={isOpen}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <NotificationDropdown
          notifications={notifications}
          unreadCount={unreadCount}
          isLoading={isLoading}
          isLoadingMore={isLoadingMore}
          hasMore={hasMore}
          role={role}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          onMarkAsRead={handleMarkAsRead}
          onMarkAllAsRead={handleMarkAllAsRead}
          onLoadMore={handleLoadMore}
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default NotificationBell;
