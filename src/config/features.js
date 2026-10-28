/**
 * Feature Flags Configuration for BookingCare
 * 
 * Chat & Video Call are permanently enabled across the application.
 */

// Đảm bảo dọn dẹp cờ cũ và kích hoạt vĩnh viễn trong localStorage của trình duyệt
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('BC_FEATURES_DEMO_OFF_INIT');
    localStorage.setItem('ENABLE_VIDEO_CALL', 'true');
    localStorage.setItem('ENABLE_CHAT', 'true');
  } catch (e) {
    console.warn('[Feature Flag] Error updating localStorage:', e);
  }
}

export const FEATURES = {
  // Video and Audio Call in Chat / Telemedicine
  ENABLE_VIDEO_CALL: true,

  // After-care Chat (Tin nhắn sau khám cho Bác sĩ & Bệnh nhân)
  ENABLE_CHAT: true,
};

export default FEATURES;
