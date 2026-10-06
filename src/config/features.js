/**
 * Feature Flags Configuration for BookingCare
 * 
 * Allows toggling specific experimental or under-review features
 * without touching core business logic or deleting codebase.
 */

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

export const FEATURES = {
  // Video and Audio Call in Chat / Telemedicine
  ENABLE_VIDEO_CALL: getInitialVideoCallState(),
};

/**
 * Global helper attached to window for instant toggling from Browser DevTools Console
 * Usage in Console:
 *   window.toggleVideoCall(true)  // Bật Video Call
 *   window.toggleVideoCall(false) // Ẩn Video Call
 *   window.toggleVideoCall()      // Đảo trạng thái hiện tại
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
      }, 300);
    } catch (e) {
      console.error('[Feature Flag] Failed to update localStorage:', e);
    }
  };

  // Log status on app init for developer convenience
  console.log(
    `%c[BookingCare Features] Video Call: ${FEATURES.ENABLE_VIDEO_CALL ? 'ENABLED' : 'DISABLED (Run toggleVideoCall(true) to show)'}`,
    FEATURES.ENABLE_VIDEO_CALL ? 'color: #10b981;' : 'color: #f59e0b;'
  );
}
