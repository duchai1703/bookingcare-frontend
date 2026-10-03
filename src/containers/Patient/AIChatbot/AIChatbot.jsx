// ═══════════════════════════════════════════════════════════════════════
// [Phase 12.5 — PREMIUM UI] AIChatbot — Root Component + SSE Streaming
// 42 Guards — BẮT BUỘC fetch + ReadableStream
// + Lucide Icons, Header redesign, Scroll FAB, Typing Dots, Empty State
// ═══════════════════════════════════════════════════════════════════════

import React, { useState, useRef, useCallback, useEffect, memo } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { MessageCircle, Trash2, X, ChevronDown } from 'lucide-react';
import MessageItem from './MessageItem';
import ChatInput from './ChatInput';
import SuggestionChips from './SuggestionChips';
import { useChatStorage } from './useChatStorage';
import { FormattedMessage, useIntl } from 'react-intl';
import { USER_ROLE } from '../../../utils/constants';
import './AIChatbot.scss';

// ═══ [ErrorBoundary — Bẫy Async setError] ═══
class ChatErrorBoundary extends React.Component {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="chat-error">
          Đã xảy ra lỗi. Vui lòng tải lại trang.
        </div>
      );
    }
    return this.props.children;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Root Component — React.memo
// ═══════════════════════════════════════════════════════════════════════
const AIChatbot = memo(() => {
  const intl = useIntl();
  const navigate = useNavigate();
  const location = useLocation();
  const handleLoginRedirect = useCallback(() => {
    setIsOpen(false);
    navigate('/login');
  }, [navigate]);
  // ═══ [Chờ Redux Persist — Chờ rehydrated] ═══
  const isLoggedIn = useSelector((state) => state.user.isLoggedIn);
  const userInfo = useSelector((state) => state.user.userInfo);
  const accessToken = useSelector((state) => state.user.accessToken);
  const language = useSelector((state) => state.app.language);

  // Role-based Chatbot Guard:
  // Patient / Guest browsing portal -> AI Chatbot is VISIBLE
  // Doctor (R2) / Admin (R1) -> AI Chatbot is STRICTLY HIDDEN
  const isDoctorOrAdmin =
    userInfo?.roleId === USER_ROLE.ADMIN ||
    userInfo?.roleId === USER_ROLE.DOCTOR ||
    location.pathname.startsWith('/system') ||
    location.pathname.startsWith('/doctor-dashboard');

  const userId = userInfo?.id;
  const { messages, setMessages, addMessage, clearMessages, saveMessages } =
    useChatStorage(userId);

  const [isOpen, setIsOpen] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState(null);
  const [selectedScheduleId, setSelectedScheduleId] = useState(null);
  const [isBookingProcessing, setIsBookingProcessing] = useState(false);
  const [isCancelProcessing, setIsCancelProcessing] = useState(false);
  const [isRescheduleProcessing, setIsRescheduleProcessing] = useState(false);
  const submitLockRef = useRef(false);   // [Double Submit Mutex]
  const abortControllerRef = useRef(null); // [AbortController Inside Submit]
  const streamTextRef = useRef('');      // [Stream Text Buffer]
  const isMountedRef = useRef(true);     // [Mount Flag]
  const chatBodyRef = useRef(null);      // [Smart Scroll]
  const tokenRef = useRef(accessToken);  // [useRef Token — Chống Stale Closure]
  const latestMessagesRef = useRef([]);  // [Stale Closure Breaker — finally dùng ref này]
  const activeRequestIdRef = useRef(null); // [Active Request ID Ref — Chống Race Condition]

  // ──── [Guard: useRef Stale Closure] — Sync token ────
  useEffect(() => {
    tokenRef.current = accessToken;
  }, [accessToken]);

  // ──── [Guard: Mount Flag] ────
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      if (abortControllerRef.current) {
        console.log('🛑 [REAL_UNMOUNT] Component thực sự tắt, hủy kết nối mạng!');
        abortControllerRef.current.abort();
      }
      isMountedRef.current = false;
    };
  }, []);

  // ──── [Guard: Cross-Tab Logout Abort] ────
  useEffect(() => {
    if (!isLoggedIn && abortControllerRef.current) {
      console.warn('⚠️ [FE_ABORT] Logout, abort active request.');
      abortControllerRef.current.abort();
      if (isMountedRef.current) {
        setIsThinking(false);
        submitLockRef.current = false;
      }
    }
  }, [isLoggedIn]);

  // ──── [Guard: Bfcache Zombie — Reset UI bằng pageshow] ────
  useEffect(() => {
    const handler = (e) => {
      if (e.persisted && isMountedRef.current) {
        setIsThinking(false);
        submitLockRef.current = false;
      }
    };
    window.addEventListener('pageshow', handler);
    return () => window.removeEventListener('pageshow', handler);
  }, []);

  // ──── [Guard: Bắt offline & pagehide] ────
  useEffect(() => {
    const handleOffline = () => {
      console.warn('⚠️ [FE_ABORT] Offline, abort active request.');
      abortControllerRef.current?.abort();
      if (isMountedRef.current) setIsThinking(false);
    };
    const handlePagehide = () => {
      console.warn('⚠️ [FE_ABORT] Pagehide, abort active request.');
      abortControllerRef.current?.abort();
    };
    window.addEventListener('offline', handleOffline);
    window.addEventListener('pagehide', handlePagehide);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('pagehide', handlePagehide);
    };
  }, []);

  // ──── [Guard: Visibility Throttle — Abort sau 60s ngủ] ────
  useEffect(() => {
    let hiddenAt = null;
    const handleVisibility = () => {
      if (document.hidden) {
        hiddenAt = performance.now();
      } else if (hiddenAt) {
        const elapsed = performance.now() - hiddenAt;
        if (elapsed > 60000 && isMountedRef.current) {
          console.warn('🟠 [FE_VISIBILITY] Tab ẩn quá lâu, tự động Abort luồng Stream.');
          abortControllerRef.current?.abort();
          setIsThinking(false);
          submitLockRef.current = false;
        }
        hiddenAt = null;
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () =>
      document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // ──── [Guard: Smart Scroll + Tự cuộn] ────
  const scrollToBottom = useCallback(() => {
    if (chatBodyRef.current) {
      const el = chatBodyRef.current;
      const isNearBottom =
        el.scrollHeight - el.scrollTop - el.clientHeight < 100;
      if (isNearBottom) {
        el.scrollTop = el.scrollHeight;
      }
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);


  // ──── [Scroll-to-bottom FAB — Show/Hide Logic] ────
  const handleChatScroll = useCallback(() => {
    if (chatBodyRef.current) {
      const el = chatBodyRef.current;
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      setShowScrollBtn(distanceFromBottom > 120);
    }
  }, []);

  const handleScrollToBottomClick = useCallback(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTo({
        top: chatBodyRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, []);

  // ──── [Guard: Mobile Viewport Fix — iOS Safari 100dvh] ────
  useEffect(() => {
    const handleResize = () => {
      if (window.visualViewport && chatBodyRef.current) {
        const vh = window.visualViewport.height;
        chatBodyRef.current.style.maxHeight = `${vh * 0.6}px`;
      }
    };
    window.visualViewport?.addEventListener('resize', handleResize);
    return () =>
      window.visualViewport?.removeEventListener('resize', handleResize);
  }, []);

  // ═══════════════════════════════════════════════════════════════════
  // ═══════════════════════════════════════════════════════════════════
  // SUBMIT HANDLER — TRÁI TIM FRONTEND (Hỗ trợ Text + Image Vision)
  // ═══════════════════════════════════════════════════════════════════
  const handleSubmit = useCallback(
    async (payload, force = false) => {
      console.log('🔵 [FE_STREAM] 1. Bắt đầu gửi câu hỏi hoặc hình ảnh.');
      // [Double Submit Mutex]
      if (submitLockRef.current && !force) return;
      submitLockRef.current = true;

      // Chuẩn hóa input (string từ suggestion chips hoặc object từ ChatInput)
      let userText = '';
      let imageFile = null;
      let previewUrl = null;

      if (typeof payload === 'string') {
        userText = payload.trim();
      } else if (payload && typeof payload === 'object') {
        userText = (payload.text || '').trim();
        imageFile = payload.imageFile || null;
        previewUrl = payload.previewUrl || null;
      }

      // Nếu chỉ có ảnh không có text, đặt prompt mặc định cho AI phân tích
      const displayText = userText || (imageFile ? 'Phân tích hình ảnh này' : '');
      if (!displayText && !imageFile) {
        submitLockRef.current = false;
        return;
      }

      const requestId = crypto.randomUUID?.() || Date.now().toString();
      activeRequestIdRef.current = requestId;

      // Reset stream buffer for new request
      streamTextRef.current = '';

      // [AbortController Inside Submit]
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      // [Check Token]
      if (!tokenRef.current) {
        submitLockRef.current = false;
        return;
      }

      // Thêm tin nhắn user (kèm ảnh preview nếu có)
      const userMsgId = crypto.randomUUID?.() || Date.now().toString();
      addMessage({
        id: userMsgId,
        role: 'user',
        text: displayText,
        hasImage: Boolean(imageFile),
        previewUrl: previewUrl || undefined,
        isLocal: false,
      });

      // [State isThinking]
      if (isMountedRef.current) setIsThinking(true);

      // Placeholder AI message for streaming
      const aiMsgId = crypto.randomUUID?.() || (Date.now() + 1).toString();
      addMessage({ id: aiMsgId, role: 'model', text: '', isLocal: false });

      // [TextDecoder — Ngoài lặp]
      const decoder = new TextDecoder('utf-8');
      let buffer = ''; // [Buffer Safe Slice]
      let reader; // [HOISTED] — Khai báo ngoài try để finally truy cập được

      try {
        const baseUrl = import.meta.env.VITE_BACKEND_URL;
        let uploadedImageId = null;

        // ═══ Bước 1: Upload ảnh nếu có ═══
        if (imageFile) {
          const uploadFormData = new FormData();
          uploadFormData.append('image', imageFile);

          const uploadRes = await fetch(`${baseUrl}/api/v1/ai/upload-image`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${tokenRef.current}`,
            },
            credentials: 'include',
            signal,
            body: uploadFormData,
          });

          if (!uploadRes.ok) {
            let uploadErrDetail = 'Tải ảnh lên thất bại.';
            try {
              const errJson = await uploadRes.json();
              if (errJson?.message) uploadErrDetail = errJson.message;
            } catch (_) {}
            const uploadErr = new Error(uploadErrDetail);
            uploadErr.status = uploadRes.status;
            throw uploadErr;
          }

          const uploadData = await uploadRes.json();
          uploadedImageId = uploadData.imageId;
        }

        // ═══ Bước 2: Chuẩn bị History & SSE Chat Request ═══
        const historySource = latestMessagesRef.current.length
          ? latestMessagesRef.current
          : messages;
        const historyPayload = historySource
          .filter((m) => !m.isLocal && typeof m.text === 'string' && m.text.trim() !== '')
          .map((m) => ({ role: m.role || m.sender, text: m.text, hasImage: m.hasImage }));

        const response = await fetch(`${baseUrl}/api/v1/ai/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${tokenRef.current}`,
          },
          credentials: 'include', // [Fetch Credentials]
          signal,
          body: JSON.stringify({
            message: displayText,
            history: historyPayload,
            imageId: uploadedImageId || undefined,
            language,
          }),
        });

        // ═══ [Check !response.ok] ═══
        if (!response.ok) {
          let errDetail = `HTTP ${response.status}`;
          try {
            const errJson = await response.json();
            if (errJson?.message) errDetail = errJson.message;
          } catch (_) {}
          const httpErr = new Error(errDetail);
          httpErr.status = response.status;
          throw httpErr;
        }

        // ═══ Dùng fetch + ReadableStream ═══
        reader = response.body.getReader();

        while (true) {
          if (signal.aborted) break;
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // [Buffer Safe Slice — Max Buffer 100KB]
          if (buffer.length > 100000) {
            buffer = buffer.slice(-50000);
          }

          // Parse SSE events from buffer
          let boundary;
          while ((boundary = buffer.indexOf('\n\n')) !== -1) {
            const line = buffer.slice(0, boundary);
            buffer = buffer.slice(boundary + 2);

            if (line.startsWith('data: ')) {
              const data = line.slice(6);

              // ═══ [ĐỒNG BỘ TIMEOUT CHÉO BE ↔ FE] ═══
              if (data === '[DONE]' || data === '[TIMEOUT]') break;
              if (data.startsWith(':')) continue; // heartbeat

              try {
                const parsed = JSON.parse(data);

                if (parsed.error) {
                  if (isMountedRef.current) {
                    setMessages((prev) => {
                      const nextState = prev.map((m) =>
                        m.id === aiMsgId
                          ? {
                            ...m,
                            text: parsed.text || 'Lỗi hệ thống.',
                          }
                          : m
                      );
                      latestMessagesRef.current = nextState;
                      return nextState;
                    });
                  }
                  break;
                }

                // ═══ [Vision Analysis Structured Event (Phase 02)] ═══
                if (parsed.visionAnalysis || parsed.type === 'VISION_ANALYSIS' || parsed.event === 'vision:analysis') {
                  const visionResult = parsed.visionAnalysis || parsed.data;
                  if (visionResult && isMountedRef.current) {
                    setMessages((prev) => {
                      const nextState = prev.map((m) =>
                        m.id === aiMsgId
                          ? { ...m, visionAnalysis: visionResult }
                          : m
                      );
                      latestMessagesRef.current = nextState;
                      return nextState;
                    });
                  }
                }

                // ═══ [Health Assessment Structured Event (Phase 03)] ═══
                if (parsed.healthAssessment || parsed.type === 'HEALTH_ASSESSMENT' || parsed.event === 'health:assessment') {
                  const assessmentResult = parsed.healthAssessment || (parsed.type === 'HEALTH_ASSESSMENT' ? parsed.data : null) || parsed.data;
                  if (assessmentResult && isMountedRef.current) {
                    setMessages((prev) => {
                      const nextState = prev.map((m) =>
                        m.id === aiMsgId
                          ? { ...m, healthAssessment: assessmentResult }
                          : m
                      );
                      latestMessagesRef.current = nextState;
                      return nextState;
                    });
                  }
                }

                // ═══ [Doctor Discovery Structured Event (Phase 04)] ═══
                if (parsed.doctorSearchResults || parsed.type === 'DOCTOR_SEARCH_RESULTS' || parsed.event === 'doctor:search') {
                  const docResults = parsed.doctorSearchResults || (parsed.type === 'DOCTOR_SEARCH_RESULTS' ? parsed : null) || parsed.data;
                  if (docResults && isMountedRef.current) {
                    setMessages((prev) => {
                      const nextState = prev.map((m) =>
                        m.id === aiMsgId
                          ? { ...m, doctorSearchResults: docResults }
                          : m
                      );
                      latestMessagesRef.current = nextState;
                      return nextState;
                    });
                  }
                }

                // ═══ [Slot Discovery Structured Event (Phase 04)] ═══
                if (parsed.slotSearchResults || parsed.type === 'SLOT_SEARCH_RESULTS' || parsed.event === 'slot:search') {
                  const slotResults = parsed.slotSearchResults || (parsed.type === 'SLOT_SEARCH_RESULTS' ? parsed : null) || parsed.data;
                  if (slotResults && isMountedRef.current) {
                    setMessages((prev) => {
                      const nextState = prev.map((m) =>
                        m.id === aiMsgId
                          ? { ...m, slotSearchResults: slotResults }
                          : m
                      );
                      latestMessagesRef.current = nextState;
                      return nextState;
                    });
                  }
                }

                // ═══ [Booking Draft Structured Event (Phase 05)] ═══
                if (parsed.bookingDraft || parsed.type === 'BOOKING_DRAFT' || parsed.event === 'booking:draft') {
                  const draftData = parsed.bookingDraft || (parsed.type === 'BOOKING_DRAFT' ? parsed.data : null) || parsed.data;
                  if (draftData && isMountedRef.current) {
                    setMessages((prev) => {
                      const nextState = prev.map((m) =>
                        m.id === aiMsgId
                          ? { ...m, bookingDraft: draftData }
                          : m
                      );
                      latestMessagesRef.current = nextState;
                      return nextState;
                    });
                  }
                }

                // ═══ [Booking Success Structured Event (Phase 05)] ═══
                if (parsed.bookingResult || parsed.type === 'BOOKING_SUCCESS' || parsed.event === 'booking:success') {
                  const successData = parsed.bookingResult || (parsed.type === 'BOOKING_SUCCESS' ? parsed.data : null) || parsed.data;
                  if (successData && isMountedRef.current) {
                    setMessages((prev) => {
                      const nextState = prev.map((m) =>
                        m.id === aiMsgId
                          ? { ...m, bookingResult: successData, bookingDraft: null }
                          : m
                      );
                      latestMessagesRef.current = nextState;
                      return nextState;
                    });
                  }
                }

                // ═══ [Booking Error Structured Event (Phase 05)] ═══
                if (parsed.bookingError || parsed.type === 'BOOKING_ERROR' || parsed.event === 'booking:error') {
                  const errData = parsed.bookingError || (parsed.type === 'BOOKING_ERROR' ? parsed.data : null) || parsed.data;
                  if (errData && isMountedRef.current) {
                    setMessages((prev) => {
                      const nextState = prev.map((m) =>
                        m.id === aiMsgId
                          ? { ...m, bookingError: errData }
                          : m
                      );
                      latestMessagesRef.current = nextState;
                      return nextState;
                    });
                  }
                }

                // ═══ [Booking Cancellation Draft Structured Event (Phase 06B)] ═══
                if (parsed.cancellationDraft || parsed.type === 'BOOKING_CANCEL_DRAFT' || parsed.event === 'booking:cancel-draft') {
                  const cancelDraftData = parsed.cancellationDraft || (parsed.type === 'BOOKING_CANCEL_DRAFT' ? parsed.data : null) || parsed.data;
                  if (cancelDraftData && isMountedRef.current) {
                    setMessages((prev) => {
                      const nextState = prev.map((m) =>
                        m.id === aiMsgId
                          ? { ...m, cancellationDraft: cancelDraftData }
                          : m
                      );
                      latestMessagesRef.current = nextState;
                      return nextState;
                    });
                  }
                }

                // ═══ [Booking Cancellation Success Structured Event (Phase 06B)] ═══
                if (parsed.cancellationResult || parsed.type === 'BOOKING_CANCEL_SUCCESS' || parsed.event === 'booking:cancel-success') {
                  const cancelSuccessData = parsed.cancellationResult || (parsed.type === 'BOOKING_CANCEL_SUCCESS' ? parsed.data : null) || parsed.data;
                  if (cancelSuccessData && isMountedRef.current) {
                    setMessages((prev) => {
                      const nextState = prev.map((m) =>
                        m.id === aiMsgId
                          ? { ...m, cancellationResult: cancelSuccessData, cancellationDraft: null }
                          : m
                      );
                      latestMessagesRef.current = nextState;
                      return nextState;
                    });
                  }
                }

                // ═══ [Booking Cancellation Error Structured Event (Phase 06B)] ═══
                if (parsed.cancellationError || parsed.type === 'BOOKING_CANCEL_ERROR' || parsed.event === 'booking:cancel-error') {
                  const cancelErrData = parsed.cancellationError || (parsed.type === 'BOOKING_CANCEL_ERROR' ? parsed.data : null) || parsed.data;
                  if (cancelErrData && isMountedRef.current) {
                    setMessages((prev) => {
                      const nextState = prev.map((m) =>
                        m.id === aiMsgId
                          ? { ...m, cancellationError: cancelErrData }
                          : m
                      );
                      latestMessagesRef.current = nextState;
                      return nextState;
                    });
                  }
                }

                // ═══ [Booking Reschedule Draft Structured Event (Phase 06C)] ═══
                if (parsed.rescheduleDraft || parsed.type === 'BOOKING_RESCHEDULE_DRAFT' || parsed.event === 'booking:reschedule-draft') {
                  const rescheduleDraftData = parsed.rescheduleDraft || (parsed.type === 'BOOKING_RESCHEDULE_DRAFT' ? parsed.data : null) || parsed.data;
                  if (rescheduleDraftData && isMountedRef.current) {
                    setMessages((prev) => {
                      const nextState = prev.map((m) =>
                        m.id === aiMsgId
                          ? { ...m, rescheduleDraft: rescheduleDraftData }
                          : m
                      );
                      latestMessagesRef.current = nextState;
                      return nextState;
                    });
                  }
                }

                // ═══ [Booking Reschedule Success Structured Event (Phase 06C)] ═══
                if (parsed.rescheduleResult || parsed.type === 'BOOKING_RESCHEDULE_SUCCESS' || parsed.event === 'booking:reschedule-success') {
                  const rescheduleSuccessData = parsed.rescheduleResult || (parsed.type === 'BOOKING_RESCHEDULE_SUCCESS' ? parsed.data : null) || parsed.data;
                  if (rescheduleSuccessData && isMountedRef.current) {
                    setMessages((prev) => {
                      const nextState = prev.map((m) =>
                        m.id === aiMsgId
                          ? { ...m, rescheduleResult: rescheduleSuccessData, rescheduleDraft: null }
                          : m
                      );
                      latestMessagesRef.current = nextState;
                      return nextState;
                    });
                  }
                }

                // ═══ [Booking Reschedule Error Structured Event (Phase 06C)] ═══
                if (parsed.rescheduleError || parsed.type === 'BOOKING_RESCHEDULE_ERROR' || parsed.event === 'booking:reschedule-error') {
                  const rescheduleErrData = parsed.rescheduleError || (parsed.type === 'BOOKING_RESCHEDULE_ERROR' ? parsed.data : null) || parsed.data;
                  if (rescheduleErrData && isMountedRef.current) {
                    setMessages((prev) => {
                      const nextState = prev.map((m) =>
                        m.id === aiMsgId
                          ? { ...m, rescheduleError: rescheduleErrData }
                          : m
                      );
                      latestMessagesRef.current = nextState;
                      return nextState;
                    });
                  }
                }

                // ═══ [Payment Action Structured Event (Phase 06D)] ═══
                if (parsed.paymentData || parsed.type === 'PAYMENT_ACTION' || parsed.event === 'payment:action') {
                  const paymentActionData = parsed.paymentData || (parsed.type === 'PAYMENT_ACTION' ? parsed.data : null) || parsed.data;
                  if (paymentActionData && isMountedRef.current) {
                    setMessages((prev) => {
                      const nextState = prev.map((m) =>
                        m.id === aiMsgId
                          ? { ...m, paymentData: paymentActionData }
                          : m
                      );
                      latestMessagesRef.current = nextState;
                      return nextState;
                    });
                  }
                }
                if (parsed.text) {
                  // PURE APPEND
                  if (isMountedRef.current) {
                    streamTextRef.current += parsed.text;
                    setMessages((prevMessages) => {
                      const newMessages = prevMessages.map((m) =>
                        m.id === aiMsgId
                          ? {
                            ...m,
                            text: streamTextRef.current,
                          }
                          : m
                      );
                      latestMessagesRef.current = newMessages; // Đồng bộ Ref thời gian thực
                      return newMessages;
                    });
                  }
                }
              } catch {
                /* skip malformed JSON */
              }
            }
          }
        }
      } catch (err) {
        // [Suppress AbortError]
        if (err.name === 'AbortError') {
          console.log('⚠️ [FE_ABORT] Chủ động ngắt request cũ, không phải lỗi.');
          return;
        } else {
          console.error('🔴 [FE_STREAM_ERROR] Luồng Stream bị văng lỗi/ngắt tại FE:', err.name, err.message);
          let friendlyMsg = 'Không thể kết nối AI. Vui lòng thử lại.';
          if (err.status === 429) {
            friendlyMsg = err.message || 'Bạn đã sử dụng AI quá nhanh. Vui lòng thử lại sau.';
          } else if (err.status === 403) {
            friendlyMsg = err.message || 'Tính năng AI Chatbot chỉ dành cho Bệnh nhân.';
          } else if (err.status === 413) {
            friendlyMsg = 'Ảnh vượt quá dung lượng tối đa 5MB.';
          } else if (err.status === 415) {
            friendlyMsg = 'Định dạng ảnh không được hỗ trợ. Chỉ chấp nhận JPEG, PNG, WebP.';
          } else if (err.message && !err.message.startsWith('HTTP ')) {
            friendlyMsg = err.message;
          }

          if (isMountedRef.current) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === aiMsgId
                  ? {
                    ...m,
                    text: m.text || friendlyMsg,
                  }
                  : m
              )
            );
          }
        }
      } finally {
        if (reader) {
          try { await reader.cancel(); } catch (e) { console.error('Reader cancel fail:', e); }
        }
        if (activeRequestIdRef.current === requestId) {
          if (isMountedRef.current) {
            setIsThinking(false);
          }
          submitLockRef.current = false;
        }

        // ĐỌC TỪ REF MỚI NHẤT, TUYỆT ĐỐI KHÔNG ĐỌC TỪ BIẾN 'messages' BỊ ĐÓNG BĂNG
        if (latestMessagesRef.current.length > 0 && typeof saveMessages === 'function') {
          saveMessages(latestMessagesRef.current);
        }
      }
    },
    [messages, language, addMessage, setMessages, saveMessages]
  );

  // ──── [Phase 04: Doctor Discovery Selection Callback] ────
  const handleSelectDoctor = useCallback((doctor) => {
    if (!doctor) return;
    setSelectedDoctorId(doctor.doctorId);
    const doctorName = doctor.name || 'bác sĩ';
    handleSubmit(`Xem lịch khám của bác sĩ ${doctorName}`);
  }, [handleSubmit]);

  // ──── [Phase 04: Slot Discovery Selection -> Phase 05 Booking Draft] ────
  const handleSelectSlot = useCallback(async (slot, doctor) => {
    if (!slot) return;
    setSelectedScheduleId(slot.scheduleId);
    console.log(`[FE_SLOT_SELECTED] Doctor: ${doctor?.doctorId || 'unknown'}, Schedule: ${slot.scheduleId}, Time: ${slot.displayTime}`);

    const baseUrl = import.meta.env.VITE_BACKEND_URL;
    if (!tokenRef.current) return;

    // Hiển thị thông điệp người dùng chọn slot
    const userMsgId = crypto.randomUUID?.() || Date.now().toString();
    addMessage({
      id: userMsgId,
      role: 'user',
      text: `Đặt lịch khám với ${doctor?.name || 'bác sĩ'} vào ${slot.displayTime}`,
      isLocal: false,
    });

    const aiMsgId = crypto.randomUUID?.() || (Date.now() + 1).toString();
    addMessage({
      id: aiMsgId,
      role: 'model',
      text: 'Đang chuẩn bị phiếu thông tin đặt lịch khám cho bạn...',
      isLocal: false,
    });

    try {
      const res = await fetch(`${baseUrl}/api/v1/ai/booking/draft`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenRef.current}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          doctorId: doctor?.doctorId,
          scheduleId: slot.scheduleId,
        }),
      });

      const data = await res.json();
      if (res.ok && data.status === 'success' && data.draft) {
        setMessages((prev) => {
          const next = prev.map((m) =>
            m.id === aiMsgId
              ? {
                ...m,
                text: 'Mình đã chuẩn bị xong phiếu thông tin đặt lịch khám. Bạn vui lòng kiểm tra các thông tin bên dưới và bấm "Xác nhận đặt lịch" để hoàn tất nhé:',
                bookingDraft: data.draft,
              }
              : m
          );
          latestMessagesRef.current = next;
          if (typeof saveMessages === 'function') saveMessages(next);
          return next;
        });
      } else {
        setMessages((prev) => {
          const next = prev.map((m) =>
            m.id === aiMsgId
              ? {
                ...m,
                text: 'Chưa thể tạo bản nháp đặt lịch cho khung giờ này.',
                bookingError: {
                  error: data.error || 'draft_failed',
                  message: data.message || 'Không thể tạo bản nháp đặt lịch.',
                },
              }
              : m
          );
          latestMessagesRef.current = next;
          if (typeof saveMessages === 'function') saveMessages(next);
          return next;
        });
      }
    } catch (err) {
      console.error('[FE_DRAFT_ERR]', err);
      setMessages((prev) => {
        const next = prev.map((m) =>
          m.id === aiMsgId
            ? {
              ...m,
              text: 'Không thể kết nối đến máy chủ để tạo bản nháp đặt lịch.',
              bookingError: {
                error: 'network_error',
                message: 'Lỗi mạng khi kết nối máy chủ.',
              },
            }
            : m
        );
        latestMessagesRef.current = next;
        return next;
      });
    }
  }, [addMessage, saveMessages]);

  // ──── [Phase 05: Explicit Confirmation Handler] ────
  const handleConfirmBooking = useCallback(async (draft) => {
    if (!draft || !draft.draftId || isBookingProcessing) return;
    setIsBookingProcessing(true);

    const baseUrl = import.meta.env.VITE_BACKEND_URL;
    if (!tokenRef.current) {
      setIsBookingProcessing(false);
      return;
    }

    try {
      const res = await fetch(`${baseUrl}/api/v1/ai/booking/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenRef.current}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          draftId: draft.draftId,
          confirmationToken: draft.confirmationToken,
        }),
      });

      const resData = await res.json();
      if (res.ok && resData.status === 'success' && resData.data) {
        setMessages((prev) => {
          const next = prev.map((m) => {
            if (m.bookingDraft && m.bookingDraft.draftId === draft.draftId) {
              return {
                ...m,
                bookingDraft: null,
                bookingResult: resData.data,
                text: '🎉 Đặt lịch khám thành công! Hệ thống đã ghi nhận lịch hẹn của bạn. Vui lòng kiểm tra email để xác nhận lịch khám.',
              };
            }
            return m;
          });
          latestMessagesRef.current = next;
          if (typeof saveMessages === 'function') saveMessages(next);
          return next;
        });
      } else {
        setMessages((prev) => {
          const next = prev.map((m) => {
            if (m.bookingDraft && m.bookingDraft.draftId === draft.draftId) {
              return {
                ...m,
                bookingError: {
                  error: resData.error || 'confirm_failed',
                  message: resData.message || 'Xác nhận đặt lịch không thành công.',
                },
              };
            }
            return m;
          });
          latestMessagesRef.current = next;
          if (typeof saveMessages === 'function') saveMessages(next);
          return next;
        });
      }
    } catch (err) {
      console.error('[FE_CONFIRM_ERR]', err);
    } finally {
      setIsBookingProcessing(false);
    }
  }, [isBookingProcessing, saveMessages]);

  const handleCancelDraft = useCallback((msgId) => {
    setMessages((prev) => {
      const next = prev.map((m) => (m.id === msgId ? { ...m, bookingDraft: null } : m));
      latestMessagesRef.current = next;
      if (typeof saveMessages === 'function') saveMessages(next);
      return next;
    });
  }, [saveMessages]);

  const handleRetrySlot = useCallback(() => {
    handleSubmit('Xem lại các khung giờ khám còn trống');
  }, [handleSubmit]);

  const handleFindDoctor = useCallback(() => {
    handleSubmit('Tìm bác sĩ khám bệnh');
  }, [handleSubmit]);

  // ──── [Phase 06B: Explicit Cancellation Confirmation Handler] ────
  const handleConfirmCancelBooking = useCallback(async (draft) => {
    if (!draft || !draft.draftId || isCancelProcessing) return;
    setIsCancelProcessing(true);

    const baseUrl = import.meta.env.VITE_BACKEND_URL;
    if (!tokenRef.current) {
      setIsCancelProcessing(false);
      return;
    }

    try {
      const res = await fetch(`${baseUrl}/api/v1/ai/booking/cancel-confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenRef.current}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          draftId: draft.draftId,
          confirmationToken: draft.confirmationToken,
          reason: draft.cancellationReason,
        }),
      });

      const resData = await res.json();
      if (res.ok && resData.status === 'success' && (resData.data || resData.alreadyCancelled)) {
        setMessages((prev) => {
          const next = prev.map((m) => {
            if (m.cancellationDraft && m.cancellationDraft.draftId === draft.draftId) {
              return {
                ...m,
                cancellationDraft: null,
                cancellationResult: resData.data || resData,
                text: resData.alreadyCancelled
                  ? 'Lịch hẹn này đã được hủy trước đó.'
                  : '✅ Lịch khám đã được hủy thành công theo yêu cầu của bạn. Bác sĩ phụ trách đã nhận được thông báo.',
              };
            }
            return m;
          });
          latestMessagesRef.current = next;
          if (typeof saveMessages === 'function') saveMessages(next);
          return next;
        });
      } else {
        setMessages((prev) => {
          const next = prev.map((m) => {
            if (m.cancellationDraft && m.cancellationDraft.draftId === draft.draftId) {
              return {
                ...m,
                cancellationError: {
                  error: resData.error || 'cancel_failed',
                  message: resData.message || 'Xác nhận hủy lịch không thành công.',
                },
              };
            }
            return m;
          });
          latestMessagesRef.current = next;
          if (typeof saveMessages === 'function') saveMessages(next);
          return next;
        });
      }
    } catch (err) {
      console.error('[FE_CANCEL_CONFIRM_ERR]', err);
    } finally {
      setIsCancelProcessing(false);
    }
  }, [isCancelProcessing, saveMessages]);

  const handleKeepBooking = useCallback((msgId) => {
    setMessages((prev) => {
      const next = prev.map((m) => {
        if (m.id === msgId) {
          return {
            ...m,
            cancellationDraft: null,
            text: (m.text ? m.text + '\n\n' : '') + '👍 Bạn đã chọn giữ lại lịch khám. Lịch hẹn vẫn được bảo lưu bình thường.',
          };
        }
        return m;
      });
      latestMessagesRef.current = next;
      if (typeof saveMessages === 'function') saveMessages(next);
      return next;
    });
  }, [saveMessages]);

  const handleRetryCancellation = useCallback(() => {
    handleSubmit('Xem danh sách lịch hẹn của tôi');
  }, [handleSubmit]);

  // ──── [Phase 06C: Explicit Reschedule Confirmation Handler] ────
  const handleConfirmRescheduleBooking = useCallback(async (draft) => {
    if (!draft || !draft.draftId || isRescheduleProcessing) return;
    setIsRescheduleProcessing(true);

    const baseUrl = import.meta.env.VITE_BACKEND_URL;
    if (!tokenRef.current) {
      setIsRescheduleProcessing(false);
      return;
    }

    try {
      const res = await fetch(`${baseUrl}/api/v1/ai/booking/reschedule-confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenRef.current}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          draftId: draft.draftId,
          confirmationToken: draft.confirmationToken,
          reason: draft.reason,
        }),
      });

      const resData = await res.json();
      if (res.ok && resData.status === 'success' && resData.data) {
        setMessages((prev) => {
          const next = prev.map((m) => {
            if (m.rescheduleDraft && m.rescheduleDraft.draftId === draft.draftId) {
              return {
                ...m,
                rescheduleDraft: null,
                rescheduleResult: resData.data,
                text: '🎉 Đổi lịch khám thành công! Hệ thống đã cập nhật lịch hẹn mới của bạn.',
              };
            }
            return m;
          });
          latestMessagesRef.current = next;
          if (typeof saveMessages === 'function') saveMessages(next);
          return next;
        });
      } else {
        setMessages((prev) => {
          const next = prev.map((m) => {
            if (m.rescheduleDraft && m.rescheduleDraft.draftId === draft.draftId) {
              return {
                ...m,
                rescheduleError: {
                  error: resData.error || 'reschedule_failed',
                  message: resData.message || 'Xác nhận đổi lịch không thành công.',
                },
              };
            }
            return m;
          });
          latestMessagesRef.current = next;
          if (typeof saveMessages === 'function') saveMessages(next);
          return next;
        });
      }
    } catch (err) {
      console.error('[FE_RESCHEDULE_CONFIRM_ERR]', err);
    } finally {
      setIsRescheduleProcessing(false);
    }
  }, [isRescheduleProcessing, saveMessages]);

  const handleRetryReschedule = useCallback(() => {
    handleSubmit('Xem danh sách lịch hẹn của tôi');
  }, [handleSubmit]);

  // ──── [Phase 04: Specialty Click Callback from Health Assessment] ────
  const handleSpecialtyClick = useCallback((specialtyName) => {
    if (!specialtyName) return;
    handleSubmit(`Tìm bác sĩ chuyên khoa ${specialtyName}`);
  }, [handleSubmit]);

  // Lắng nghe event click "Tư vấn AI" từ doctor card
  useEffect(() => {
    const handleOpenChat = (e) => {
      setIsOpen(true);
      if (isLoggedIn && e.detail?.prompt) {
        handleSubmit(e.detail.prompt, true);
      }
    };
    window.addEventListener('open-ai-chat', handleOpenChat);
    return () => window.removeEventListener('open-ai-chat', handleOpenChat);
  }, [handleSubmit, isLoggedIn]);

  // ═══ [Chặn onCopy — Copy Plaintext] ═══
  const handleCopy = useCallback((e) => {
    const selection = window.getSelection()?.toString() || '';
    if (selection) {
      e.preventDefault();
      e.clipboardData?.setData('text/plain', selection);
    }
  }, []);

  const clearHistoryTitle = intl.formatMessage({ id: 'chatbot.btn-clear-history' });
  const closeTitle = intl.formatMessage({ id: 'chatbot.btn-close' });
  const scrollDownTitle = intl.formatMessage({ id: 'chatbot.btn-scroll-down' });

  if (isDoctorOrAdmin) {
    return null;
  }

  return (
    <ChatErrorBoundary>
      {/* Toggle Button */}
      <button
        className="chat-toggle-btn"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Toggle AI Chat"
      >
        <MessageCircle />
      </button>

      {isOpen && (
        <div
          className="chat-container"
          onCopy={handleCopy}
          translate="no"
        >
          {/* ═══ Header — Premium Design ═══ */}
          <div className="chat-header">
            <div className="header-avatar">
              🤖
              <span className="status-dot" />
            </div>
            <div className="header-info">
              <div className="header-title">
                <FormattedMessage id="chatbot.header-title" />
              </div>
              <div className="header-subtitle">
                <FormattedMessage id="chatbot.header-subtitle" />
              </div>
            </div>
            <div className="header-actions">
              {isLoggedIn && (
                <button
                  className="header-btn header-btn-trash"
                  onClick={clearMessages}
                  title={clearHistoryTitle}
                  type="button"
                >
                  <Trash2 />
                </button>
              )}
              <button
                className="header-btn header-btn-close"
                onClick={() => setIsOpen(false)}
                title={closeTitle}
                type="button"
              >
                <X />
              </button>
            </div>
          </div>

          {!isLoggedIn ? (
            <div className="chat-login-prompt-body">
              <div className="lock-icon-wrapper">
                <div className="lock-icon">🔒</div>
              </div>
              <h3 className="login-prompt-title">
                <FormattedMessage id="chatbot.login-prompt-title" />
              </h3>
              <p className="login-prompt-desc">
                <FormattedMessage id="chatbot.login-prompt-desc" />
              </p>
              <button className="btn-login-now" onClick={handleLoginRedirect}>
                <FormattedMessage id="chatbot.btn-login-now" />
              </button>
            </div>
          ) : (
            <>
              {/* ═══ Messages / Empty State ═══ */}
              {messages.length === 0 && !isThinking ? (
                <div className="chat-body" ref={chatBodyRef}>
                  <SuggestionChips
                    onSubmit={handleSubmit}
                    disabled={!isLoggedIn || isThinking}
                  />
                </div>
              ) : (
                <div
                  className="chat-body"
                  ref={chatBodyRef}
                  onScroll={handleChatScroll}
                >
                  {messages.map((msg) => (
                    <MessageItem
                      key={msg.id}
                      msg={msg}
                      onQuestionClick={handleSubmit}
                      onSpecialtyClick={handleSpecialtyClick}
                      onSelectDoctor={handleSelectDoctor}
                      onSelectSlot={handleSelectSlot}
                      selectedDoctorId={selectedDoctorId}
                      selectedScheduleId={selectedScheduleId}
                      onConfirmBooking={handleConfirmBooking}
                      onCancelDraft={() => handleCancelDraft(msg.id)}
                      onRetrySlot={handleRetrySlot}
                      onFindDoctor={handleFindDoctor}
                      isBookingProcessing={isBookingProcessing}
                      onConfirmCancelBooking={handleConfirmCancelBooking}
                      onKeepBooking={handleKeepBooking}
                      onRetryCancellation={handleRetryCancellation}
                      isCancelProcessing={isCancelProcessing}
                      onConfirmRescheduleBooking={handleConfirmRescheduleBooking}
                      onRetryReschedule={handleRetryReschedule}
                      isRescheduleProcessing={isRescheduleProcessing}
                    />
                  ))}

                  {/* Typing Indicator — Bouncing Dots */}
                  {isThinking && (!messages.length || messages[messages.length - 1].role !== 'model' || !messages[messages.length - 1].text) && (
                    <div className="typing-indicator">
                      <div className="ai-avatar-small">🤖</div>
                      <div className="dots-bubble">
                        <span className="dot" />
                        <span className="dot" />
                        <span className="dot" />
                      </div>
                    </div>
                  )}

                  {/* Scroll-to-bottom FAB */}
                  {showScrollBtn && (
                    <button
                      className="scroll-to-bottom-btn"
                      onClick={handleScrollToBottomClick}
                      type="button"
                      aria-label={scrollDownTitle}
                      title={scrollDownTitle}
                    >
                      <ChevronDown />
                    </button>
                  )}
                </div>
              )}

              {/* Input — BẢO ĐẢM 3 */}
              <ChatInput
                onSubmit={handleSubmit}
                disabled={!isLoggedIn || isThinking}
                isThinking={isThinking}
              />
            </>
          )}
        </div>
      )}
    </ChatErrorBoundary>
  );
});

AIChatbot.displayName = 'AIChatbot';
export default AIChatbot;
