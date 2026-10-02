import axiosInstance from './axiosConfig';

/**
 * NotificationService — REST API Client for BookingCare Global Notifications
 */
export const getNotifications = ({ limit = 20, offset = 0, isRead } = {}) => {
  const params = { limit, offset };
  if (isRead !== undefined && isRead !== null) {
    params.isRead = isRead;
  }
  return axiosInstance.get('/api/v1/notifications', { params });
};

export const getUnreadCount = () => {
  return axiosInstance.get('/api/v1/notifications/unread-count');
};

export const markAsRead = (notificationId) => {
  return axiosInstance.patch(`/api/v1/notifications/${notificationId}/read`);
};

export const markAllAsRead = () => {
  return axiosInstance.patch('/api/v1/notifications/mark-all-read');
};

export default {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
};
