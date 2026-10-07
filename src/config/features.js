/**
 * Feature Flags Configuration for BookingCare
 * 
 * Allows toggling specific experimental or under-review features
 * (e.g. Telemedicine Chat & Video Call) without touching core business logic or deleting codebase.
 */

// Key reset nhằm đảm bảo ép về false cho buổi demo, xóa bỏ cờ true đã lưu trước đó trong trình duyệt
const DEMO_RESET_KEY = 'BC_FEATURES_DEMO_OFF_INIT';

if (typeof window !== 'undefined') {
  try {
    if (!localStorage.getItem(DEMO_RESET_KEY)) {
      // Đặt mặc định false cho cả 2 tính năng theo yêu cầu người dùng
      localStorage.setItem('ENABLE_VIDEO_CALL', 'false');
      localStorage.setItem('ENABLE_CHAT', 'false');
      localStorage.setItem(DEMO_RESET_KEY, 'done');
    }
  } catch (e) {
    console.warn('[Feature Flag] Error resetting localStorage:', e);
  }
}

const getInitialVideoCallState = () => {
  try {
    // 1. Prioritize Runtime LocalStorage override
    const stored = localStorage.getItem('ENABLE_VIDEO_CALL');
    if (stored !== null) {
      return stored === 'true';
    }

    // 2. Fallback to Vite Environment Variable (if set)
    if (import.meta.env && import.meta.env.VITE_ENABLE_VIDEO_CALL !== undefined) {
      return String(import.meta.env.VITE_ENABLE_VIDEO_CALL).toLowerCase() === 'true';
    }
  } catch (err) {
    console.warn('[Feature Flag] Error checking localStorage:', err);
  }

  // 3. Default state for demonstration: Hidden (false)
  return false;
};

const getInitialChatState = () => {
  try {
    // 1. Prioritize Runtime LocalStorage override
    const stored = localStorage.getItem('ENABLE_CHAT');
    if (stored !== null) {
      return stored === 'true';
    }

    // 2. Fallback to Vite Environment Variable (if set)
    if (import.meta.env && import.meta.env.VITE_ENABLE_CHAT !== undefined) {
      return String(import.meta.env.VITE_ENABLE_CHAT).toLowerCase() === 'true';
    }
  } catch (err) {
    console.warn('[Feature Flag] Error checking localStorage:', err);
  }

  // 3. Default state for demonstration: Hidden (false)
  return false;
};

export const FEATURES = {
  // Video and Audio Call in Chat / Telemedicine
  ENABLE_VIDEO_CALL: getInitialVideoCallState(),

  // After-care Chat (Tin nhắn sau khám cho Bác sĩ & Bệnh nhân)
  ENABLE_CHAT: getInitialChatState(),
};

/**
 * Global helpers attached to window for instant toggling from Browser DevTools Console
 * Usage in Console:
 *   window.toggleChat(true)          // Bật tính năng Chat sau khám bên bác sĩ & bệnh nhân
 *   window.toggleChat(false)         // Ẩn tính năng Chat sau khám
 *   window.toggleVideoCall(true)     // Bật Video & Audio Call
 *   window.toggleVideoCall(false)    // Ẩn Video & Audio Call
 *   window.toggleAll(true)           // Bật cả Chat lẫn Video Call
 *   window.toggleAll(false)          // Tắt cả Chat lẫn Video Call
 */
if (typeof window !== 'undefined') {
  window.toggleVideoCall = (enable) => {
    const nextState = enable !== undefined ? Boolean(enable) : !FEATURES.ENABLE_VIDEO_CALL;
    try {
      localStorage.setItem('ENABLE_VIDEO_CALL', nextState ? 'true' : 'false');
      console.log(
        `%c[Feature Flag] Video & Audio Call is now ${nextState ? '🟢 ENABLED' : '🔴 DISABLED'}. Reloading page...`,
        'color: #0d9488; font-weight: bold; font-size: 14px;'
      );
      setTimeout(() => {
        window.location.reload();
      }, 250);
    } catch (e) {
      console.error('[Feature Flag] Failed to update localStorage:', e);
    }
  };

  window.toggleChat = (enable) => {
    const nextState = enable !== undefined ? Boolean(enable) : !FEATURES.ENABLE_CHAT;
    try {
      localStorage.setItem('ENABLE_CHAT', nextState ? 'true' : 'false');
      console.log(
        `%c[Feature Flag] After-Care Chat is now ${nextState ? '🟢 ENABLED' : '🔴 DISABLED'}. Reloading page...`,
        'color: #0d9488; font-weight: bold; font-size: 14px;'
      );
      setTimeout(() => {
        window.location.reload();
      }, 250);
    } catch (e) {
      console.error('[Feature Flag] Failed to update localStorage:', e);
    }
  };

  window.toggleAll = (enable) => {
    const nextState = enable !== undefined ? Boolean(enable) : (!FEATURES.ENABLE_CHAT || !FEATURES.ENABLE_VIDEO_CALL);
    try {
      localStorage.setItem('ENABLE_CHAT', nextState ? 'true' : 'false');
      localStorage.setItem('ENABLE_VIDEO_CALL', nextState ? 'true' : 'false');
      console.log(
        `%c[Feature Flag] Telemedicine (Chat & Video Call) is now ${nextState ? '🟢 ENABLED' : '🔴 DISABLED'}. Reloading page...`,
        'color: #0d9488; font-weight: bold; font-size: 14px;'
      );
      setTimeout(() => {
        window.location.reload();
      }, 250);
    } catch (e) {
      console.error('[Feature Flag] Failed to update localStorage:', e);
    }
  };

  // Alias
  window.toggleTelemedicine = window.toggleAll;

  // Log status on app init for developer convenience
  console.groupCollapsed('%c[BookingCare Feature Flags Status]', 'color: #0d9488; font-weight: bold;');
  console.log(`💬 Chat sau khám (Bác sĩ & Bệnh nhân): ${FEATURES.ENABLE_CHAT ? '🟢 BẬT' : '🔴 TẮT (Ẩn menu & giao diện)'}`);
  console.log(`📹 Video/Audio Call: ${FEATURES.ENABLE_VIDEO_CALL ? '🟢 BẬT' : '🔴 TẮT (Ẩn nút gọi)'}`);
  console.log('📌 Lệnh Console nhanh:');
  console.log('   - toggleChat(true/false)        : Bật/Tắt Chat sau khám bên bác sĩ & bệnh nhân');
  console.log('   - toggleVideoCall(true/false)   : Bật/Tắt Video & Audio Call');
  console.log('   - toggleAll(true/false)         : Bật/Tắt CẢ HAI tính năng');
  console.groupEnd();
}
