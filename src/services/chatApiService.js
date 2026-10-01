import axiosInstance from './axiosConfig';

/**
 * ChatApiService — REST Client for Post-Consultation Chat APIs
 */
export const getUserConversations = () => {
  return axiosInstance.get('/api/v1/chat/conversations');
};

export const getOrCreateConversationForBooking = (bookingId) => {
  return axiosInstance.post(`/api/v1/chat/bookings/${bookingId}/conversation`);
};

export const getConversationMessages = (conversationId, { beforeCursor, limit = 30 } = {}) => {
  const params = {};
  if (beforeCursor) params.beforeCursor = beforeCursor;
  if (limit) params.limit = limit;
  return axiosInstance.get(`/api/v1/chat/conversations/${conversationId}/messages`, { params });
};

export const markMessagesAsRead = (conversationId) => {
  return axiosInstance.patch(`/api/v1/chat/conversations/${conversationId}/read`);
};

export const updateConversationStatus = (conversationId, status) => {
  return axiosInstance.patch(`/api/v1/chat/conversations/${conversationId}/status`, { status });
};

export const getIceServers = () => {
  return axiosInstance.get('/api/v1/chat/webrtc/ice-servers');
};

export const getBookingCallHistory = (bookingId) => {
  return axiosInstance.get(`/api/v1/chat/bookings/${bookingId}/call-history`);
};

export const getActiveCall = () => {
  return axiosInstance.get('/api/v1/chat/active-call');
};
