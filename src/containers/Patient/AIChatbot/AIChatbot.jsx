// ═══════════════════════════════════════════════════════════════════════
// [Phase 12.5] AIChatbot — Root Component + SSE Streaming
// 42 Guards — BẮT BUỘC fetch + ReadableStream
// ═══════════════════════════════════════════════════════════════════════

import React, { useState, useRef, useCallback, useEffect, memo } from 'react';
import { useSelector } from 'react-redux';
import MessageItem from './MessageItem';
import ChatInput from './ChatInput';
import { useChatStorage } from './useChatStorage';
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
  // ═══ [Chờ Redux Persist — Chờ rehydrated] ═══
  const isLoggedIn = useSelector((state) => state.user.isLoggedIn);
  const userInfo = useSelector((state) => state.user.userInfo);
  const accessToken = useSelector((state) => state.user.accessToken);
  const language = useSelector((state) => state.app.language);

  const userId = userInfo?.id;
  const { messages, setMessages, addMessage, clearMessages, saveMessages } =
    useChatStorage(userId);

  const [isOpen, setIsOpen] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const submitLockRef = useRef(false);   // [Double Submit Mutex]
  const abortControllerRef = useRef(null); // [AbortController Inside Submit]
  const streamTextRef = useRef('');      // [Stream Text Buffer]
  const isMountedRef = useRef(true);     // [Mount Flag]
  const chatBodyRef = useRef(null);      // [Smart Scroll]
  const tokenRef = useRef(accessToken);  // [useRef Token — Chống Stale Closure]
  const latestMessagesRef = useRef([]);  // [Stale Closure Breaker — finally dùng ref này]

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
  // SUBMIT HANDLER — TRÁI TIM FRONTEND
  // ═══════════════════════════════════════════════════════════════════
  const handleSubmit = useCallback(
    async (text) => {
      console.log('🔵 [FE_STREAM] 1. Bắt đầu gửi câu hỏi. Đã gọi e.preventDefault() chưa?');
      // [Double Submit Mutex]
      if (submitLockRef.current) return;
      submitLockRef.current = true;

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

      // Thêm tin nhắn user
      addMessage({ role: 'user', text, isLocal: false });

      // [State isThinking]
      if (isMountedRef.current) setIsThinking(true);

      // Placeholder AI message for streaming
      const aiMsgId = crypto.randomUUID?.() || Date.now().toString();
      addMessage({ id: aiMsgId, role: 'model', text: '', isLocal: false });

      // [TextDecoder — Ngoài lặp]
      const decoder = new TextDecoder('utf-8');
      let buffer = ''; // [Buffer Safe Slice]
      let reader; // [HOISTED] — Khai báo ngoài try để finally truy cập được

      // ═══════════════════════════════════════════════════════════════
      // [Phase 12.6 — CHUNK APPEND THUẦN KHIẾT]
      // Backend gửi DELTA text (phần mới), KHÔNG gửi cumulative text.
      // => TUYỆT ĐỐI KHÔNG dùng Overlap Merge. Chỉ APPEND.
      //
      // Overlap Merge cũ (mergeStreamText) gây nuốt ký tự ở biên:
      //   chunk_1 = "16:0", chunk_2 = "0"
      //   Overlap tìm current.slice(-1)==="0" === incoming.slice(0,1)==="0"
      //   → Nuốt số 0 → Output "16:0" thay vì "16:00"
      //
      // Giải pháp: Pure Append — miễn nhiễm hoàn toàn với:
      //   ✅ Number boundary (16:0 + 0 → 16:00)
      //   ✅ Unicode boundary (Bác s + ĩ → Bác sĩ)
      //   ✅ Markdown boundary ([Nhấn vào  + đây](/link))
      // ═══════════════════════════════════════════════════════════════

      try {
        // ═══ [fetch BaseURL + Bypass SW + credentials] ═══
        const baseUrl = import.meta.env.VITE_BACKEND_URL;
        const historySource = latestMessagesRef.current.length
          ? latestMessagesRef.current
          : messages;
        const historyPayload = historySource
          .filter((m) => !m.isLocal && typeof m.text === 'string' && m.text.trim() !== '')
          .map((m) => ({ role: m.role || m.sender, text: m.text }));
        const response = await fetch(`${baseUrl}/api/v1/ai/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${tokenRef.current}`,
          },
          credentials: 'include', // [Fetch Credentials]
          signal,
          body: JSON.stringify({
            message: text,
            history: historyPayload,
            language,
          }),
        });

        // ═══ [Check !response.ok] ═══
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        // ═══ Dùng fetch + ReadableStream ═══
        reader = response.body.getReader();

        while (true) {
          if (signal.aborted) break;
          const { done, value } = await reader.read();
          if (done) break;

          // [TextDecoder + stream: true]
          // stream: true giữ lại byte dở dang ở cuối chunk,
          // đợi chunk tiếp theo ghép đủ ký tự UTF-8 mới giải mã.
          // => Chống mất ký tự tiếng Việt có dấu ở biên chunk.
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

                if (parsed.text) {
                  // ═══════════════════════════════════════════════
                  // [BẢO ĐẢM 2: REACT CONCURRENT TEARING FIX]
                  // BẮT BUỘC dùng Functional State Update
                  // TUYỆT ĐỐI CẤM đọc state hiện tại trực tiếp
                  //
                  // PURE APPEND — Không overlap, không cắt, không nuốt
                  // ═══════════════════════════════════════════════
                  if (isMountedRef.current) {
                    streamTextRef.current += parsed.text;
                    setMessages((prevMessages) => {
                      const newMessages = [...prevMessages];
                      const lastIndex = newMessages.length - 1;

                      if (lastIndex >= 0) {
                        newMessages[lastIndex] = {
                          ...newMessages[lastIndex],
                          text: streamTextRef.current,
                        };
                      }

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
          if (isMountedRef.current) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === aiMsgId
                  ? {
                      ...m,
                      text:
                        m.text ||
                        'Không thể kết nối AI. Vui lòng thử lại.',
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
        if (isMountedRef.current) {
          setIsThinking(false);
        }
        submitLockRef.current = false;

        // ĐỌC TỪ REF MỚI NHẤT, TUYỆT ĐỐI KHÔNG ĐỌC TỪ BIẾN 'messages' BỊ ĐÓNG BĂNG
        if (latestMessagesRef.current.length > 0 && typeof saveMessages === 'function') {
          saveMessages(latestMessagesRef.current);
        }
      }
    },
    [messages, language, addMessage, setMessages, saveMessages]
  );

  // ═══ [Chặn onCopy — Copy Plaintext] ═══
  const handleCopy = useCallback((e) => {
    const selection = window.getSelection()?.toString() || '';
    if (selection) {
      e.preventDefault();
      e.clipboardData?.setData('text/plain', selection);
    }
  }, []);

  // ═══ [Auto-minimize Modal] ═══
  if (!isLoggedIn) return null;

  return (
    <ChatErrorBoundary>
      {/* Toggle Button */}
      <button
        className="chat-toggle-btn"
        onClick={() => setIsOpen((prev) => !prev)}
        style={{ zIndex: 9999 }}
        aria-label="Toggle AI Chat"
      >
        💬
      </button>

      {isOpen && (
        <div
          className="chat-container"
          style={{ zIndex: 9999 }}
          onCopy={handleCopy}
          translate="no"
        >
          {/* Header */}
          <div className="chat-header">
            <span>🤖 Trợ lý AI BookingCare</span>
            <button onClick={clearMessages} title="Xóa lịch sử">
              🗑️
            </button>
            <button onClick={() => setIsOpen(false)} title="Đóng">
              ✕
            </button>
          </div>

          {/* Messages */}
          <div className="chat-body" ref={chatBodyRef}>
            {messages.map((msg) => (
              <MessageItem key={msg.id} msg={msg} />
            ))}
            {isThinking && (
              <div className="typing-indicator">AI đang suy nghĩ...</div>
            )}
          </div>

          {/* Input — BẢO ĐẢM 3 */}
          <ChatInput
            onSubmit={handleSubmit}
            disabled={!isLoggedIn || isThinking}
            isThinking={isThinking}
          />
        </div>
      )}
    </ChatErrorBoundary>
  );
});

AIChatbot.displayName = 'AIChatbot';
export default AIChatbot;
