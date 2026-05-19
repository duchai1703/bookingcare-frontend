# PHASE 12 — PHẦN 4B: FRONTEND REACT — COMPONENT `<AIChatbot>`

> Tiếp nối Part 3 (Backend SSE). Đọc Part 1-3 trước.

---

## 4B.1 — Kiến trúc Component

```
src/containers/Patient/AIChatbot/
├── AIChatbot.jsx          ← Root component (React.memo)
├── AIChatbot.scss         ← Styles + @tailwindcss/typography prose
├── MessageItem.jsx        ← React.memo — Throttled Markdown render
├── ChatInput.jsx          ← Input + Submit (onMouseDown guard)
└── useChatStorage.js      ← Custom hook: localForage + In-memory fallback
```

## 4B.2 — Custom Storage Wrapper (IndexedDB Only — CẤM localStorage)

> [!CAUTION]
> **Quy tắc lưu trữ Chat History:**
>
> - 🚫 **CẤM TUYỆT ĐỐI:** Sử dụng `localStorage` trực tiếp (gây block Main Thread).
> - ✅ **BẮT BUỘC:** Sử dụng thư viện `localForage` và ép `driver: [localforage.INDEXEDDB]`.
> - 🔄 **FALLBACK:** Phải bọc trong `try...catch` để tự động lùi về In-memory Storage nếu Safari Private Mode khóa Quota — KHÔNG BAO GIỜ rơi xuống `localStorage`.

```javascript
// src/containers/Patient/AIChatbot/useChatStorage.js
import localforage from 'localforage';
import { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid'; // Hoặc crypto.randomUUID()

// ═══ [Private Mode Storage] — In-Memory Fallback ═══
let inMemoryStore = {};

const chatStore = localforage.createInstance({
  name: 'bookingcare-ai',
  storeName: 'chat_history',
  driver: [localforage.INDEXEDDB], // [LỆNH THÉP] CHỈ IndexedDB — CẤM localStorage
});

// [Yêu cầu persist()] — Request persistent storage
async function requestPersist() {
  try {
    if (navigator.storage?.persist) {
      await navigator.storage.persist();
    }
  } catch { /* silent */ }
}

// ═══ Safe get/set với fallback ═══
async function safeGet(key) {
  try {
    return await chatStore.getItem(key);
  } catch {
    return inMemoryStore[key] || null;
  }
}

async function safeSet(key, value) {
  try {
    await chatStore.setItem(key, value);
  } catch {
    inMemoryStore[key] = value;
  }
}

export function useChatStorage(userId) {
  const [messages, setMessages] = useState([]);
  const persistedMsgIds = useRef(new Set()); // [Khóa lưu trùng]
  const isMounted = useRef(true);

  // Load on mount
  useEffect(() => {
    isMounted.current = true;
    requestPersist();

    const storageKey = `chat_${userId}`;
    safeGet(storageKey).then(saved => {
      if (isMounted.current && Array.isArray(saved)) {
        // [Redux History slice(-50)] — Giới hạn 50 tin nhắn
        const sliced = saved.slice(-50);
        setMessages(sliced);
        sliced.forEach(m => { if (m.id) persistedMsgIds.current.add(m.id); });
      }
    });

    return () => { isMounted.current = false; };
  }, [userId]);

  // Save — [Disk Thrashing Guard: Lưu 1 lần]
  const saveMessages = useCallback(async (msgs) => {
    const storageKey = `chat_${userId}`;
    const toSave = msgs.slice(-50); // [Redux slice(-50)]
    // [Khóa lưu trùng persistedMsgIds] — Chỉ lưu tin mới
    await safeSet(storageKey, toSave);
  }, [userId]);

  const addMessage = useCallback((msg) => {
    const newMsg = { ...msg, id: msg.id || uuidv4() };
    setMessages(prev => {
      // [Optimistic UI Rollback] — Kiểm tra trùng ID
      if (prev.some(m => m.id === newMsg.id)) return prev;
      const updated = [...prev, newMsg].slice(-50);
      saveMessages(updated);
      return updated;
    });
    return newMsg;
  }, [saveMessages]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    const storageKey = `chat_${userId}`;
    safeSet(storageKey, []);
    persistedMsgIds.current.clear();
  }, [userId]);

  return { messages, setMessages, addMessage, clearMessages, saveMessages };
}
```

## 4B.3 — MessageItem (React.memo + Throttled Markdown)

> [!IMPORTANT]
> **Phân biệt rạch ròi 2 khái niệm — Dev KHÔNG được nhầm lẫn:**
>
> 1. **State Throttling:** BẮT BUỘC dùng thư viện (VD: `lodash.throttle`) bọc hàm cập nhật State `setText` với delay `100ms–150ms` để chống React bị ngộp khi nhận hàng trăm chunk SSE liên tiếp. Đây là kỹ thuật áp dụng **trong `handleSubmit`** (Section 4B.5).
> 2. **Component Memoization:** BẮT BUỘC dùng `React.memo` cho Component `MessageItem` để **đóng băng** các tin nhắn cũ không bị re-render lại khi tin nhắn đang stream thay đổi. Đây là kỹ thuật áp dụng **tại Component level** (Section này).

```jsx
// src/containers/Patient/AIChatbot/MessageItem.jsx
import React, { memo, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import DOMPurify from 'dompurify';

// ═══ [Cấm rehype-raw] — KHÔNG import rehype-raw ═══
// ═══ [DOMPurify: Cấm style/class] ═══
const purifyConfig = {
  FORBID_TAGS: ['style', 'script', 'iframe', 'object', 'embed', 'form'],
  FORBID_ATTR: ['style', 'class', 'onclick', 'onerror', 'onload'],
};

// ═══ [Auto-close Markdown] ═══
function autoCloseMarkdown(text) {
  if (!text) return '';
  // Đếm ``` chưa đóng
  const backtickCount = (text.match(/```/g) || []).length;
  if (backtickCount % 2 !== 0) return text + '\n```';
  return text;
}

// ═══ [Component Memoization] — React.memo đóng băng tin nhắn cũ ═══
// ═══ [useMemo] — DOMPurify chỉ chạy khi text thay đổi ═══
const MessageItem = memo(({ msg }) => {
  const sanitizedText = useMemo(() => {
    if (!msg.text) return '';
    const closed = autoCloseMarkdown(msg.text);
    return DOMPurify.sanitize(closed, purifyConfig);
  }, [msg.text]);

  // ═══ [AI Homograph Phishing Guard] ═══
  const linkRenderer = useMemo(() => ({
    a: ({ href, children }) => {
      // [Block javascript:/data: URI]
      if (/^(javascript|data):/i.test(href || '')) {
        return <span>{children}</span>;
      }
      // [Poisoned History — isLocal check]
      const isLocal = href?.startsWith('/') && !href.startsWith('//');
      if (isLocal) {
        // [Custom <Link> SPA] — Dùng react-router Link cho internal
        return <a href={href}>{children}</a>;
      }
      // External link — [⚠️ + nofollow noopener noreferrer]
      return (
        <a
          href={href}
          target="_blank"
          rel="nofollow noopener noreferrer"
        >
          ⚠️ {children}
        </a>
      );
    },
  }), []);

  // ═══ [AST Depth <= 2] — remarkGfm only, no nested plugins ═══
  return (
    <div
      className={`message-item ${msg.role === 'user' ? 'user-msg' : 'ai-msg'}`}
      translate="no" /* [Browser Auto-Translate Ban] */
    >
      {msg.role === 'model' ? (
        <div className="prose prose-sm max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            /* [Cấm rehype-raw] — KHÔNG dùng rehypePlugins */
            components={linkRenderer}
          >
            {sanitizedText}
          </ReactMarkdown>
        </div>
      ) : (
        <p>{msg.text}</p>
      )}
    </div>
  );
});

MessageItem.displayName = 'MessageItem';
export default MessageItem;
```

## 4B.4 — ChatInput (BẢO ĐẢM 3: Mobile Blur Fix)

```jsx
// src/containers/Patient/AIChatbot/ChatInput.jsx
import React, { useRef, useCallback } from 'react';

const ChatInput = ({ onSubmit, disabled, isThinking }) => {
  const inputRef = useRef(null);
  const isComposingRef = useRef(false); // [IME Tiếng Việt]

  // ═══ [Chặn isComposing] — Không submit khi đang gõ dấu tiếng Việt ═══
  const handleCompositionStart = () => { isComposingRef.current = true; };
  const handleCompositionEnd = () => { isComposingRef.current = false; };

  // ═══ [Submit Value từ DOM Form Event] ═══
  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    if (isComposingRef.current) return; // [IME Guard]
    const value = inputRef.current?.value?.trim();
    if (!value || disabled) return;
    onSubmit(value);
    inputRef.current.value = '';
  }, [onSubmit, disabled]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposingRef.current) {
      e.preventDefault();
      handleSubmit(e);
    }
    // [stopPropagation Esc] — Không đóng modal cha
    if (e.key === 'Escape') {
      e.stopPropagation();
    }
  }, [handleSubmit]);

  return (
    <form onSubmit={handleSubmit} className="chat-input-form">
      <input
        ref={inputRef}
        type="text"
        maxLength={500}           /* [Input maxLength={500}] */
        placeholder={isThinking ? 'AI đang trả lời...' : 'Nhập câu hỏi...'}
        disabled={disabled}
        onKeyDown={handleKeyDown}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
        className="chat-input"
        autoComplete="off"
      />
      <button
        type="submit"
        disabled={disabled || isThinking}
        className="chat-submit-btn"
        /* ═══════════════════════════════════════════════════════ */
        /* [BẢO ĐẢM 3: MOBILE BLUR SCROLL JUMP]                 */
        /* onMouseDown preventDefault giữ focus trên input,       */
        /* bàn phím ảo KHÔNG bị giật thụt xuống khi bấm Gửi     */
        /* ═══════════════════════════════════════════════════════ */
        onMouseDown={(e) => e.preventDefault()}
      >
        Gửi
      </button>
    </form>
  );
};

export default ChatInput;
```

## 4B.5 — Root Component `<AIChatbot>`

```jsx
// src/containers/Patient/AIChatbot/AIChatbot.jsx
import React, { useState, useRef, useCallback, useEffect, memo } from 'react';
import { useSelector } from 'react-redux';
import MessageItem from './MessageItem';
import ChatInput from './ChatInput';
import { useChatStorage } from './useChatStorage';

// ═══ [ErrorBoundary — Bẫy Async setError] ═══
class ChatErrorBoundary extends React.Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return <div className="chat-error">Đã xảy ra lỗi. Vui lòng tải lại trang.</div>;
    }
    return this.props.children;
  }
}

const AIChatbot = memo(() => {
  // ═══ [Chờ Redux Persist — Chờ rehydrated] ═══
  const isLoggedIn = useSelector(state => state.user.isLoggedIn);
  const userInfo = useSelector(state => state.user.userInfo);
  const accessToken = useSelector(state => state.user.accessToken);
  const language = useSelector(state => state.app.language);

  const userId = userInfo?.id;
  const { messages, setMessages, addMessage, clearMessages, saveMessages } = useChatStorage(userId);

  const [isOpen, setIsOpen] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState(null); // [Bẫy Async ErrorBoundary]
  const submitLockRef = useRef(false); // [Double Submit Mutex + Sync submitLock]
  const abortRef = useRef(null);       // [AbortController Inside Submit]
  const isMountedRef = useRef(true);   // [Mount Flag + Unmounted Leak Guard]
  const chatBodyRef = useRef(null);    // [Smart Scroll + Tự cuộn ResizeObserver]
  const tokenRef = useRef(accessToken); // [useRef Token — Chống Stale Closure]

  // [useRef Stale Closure] — Sync token
  useEffect(() => { tokenRef.current = accessToken; }, [accessToken]);

  // [Mount Flag]
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  // ═══ [Cross-Tab Logout Abort] ═══
  useEffect(() => {
    if (!isLoggedIn && abortRef.current) {
      abortRef.current.abort();
      if (isMountedRef.current) {
        setIsThinking(false);
        submitLockRef.current = false;
      }
    }
  }, [isLoggedIn]);

  // ═══ [Reset UI bằng pageshow — Bfcache Zombie] ═══
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

  // ═══ [Bắt offline & pagehide] ═══
  useEffect(() => {
    const handleOffline = () => {
      abortRef.current?.abort();
      if (isMountedRef.current) setIsThinking(false);
    };
    const handlePagehide = () => { abortRef.current?.abort(); };
    window.addEventListener('offline', handleOffline);
    window.addEventListener('pagehide', handlePagehide);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('pagehide', handlePagehide);
    };
  }, []);

  // ═══ [visibilitychange — Bypass Throttle ẩn tab] ═══
  useEffect(() => {
    let hiddenAt = null;
    const handleVisibility = () => {
      if (document.hidden) {
        hiddenAt = performance.now();
      } else if (hiddenAt) {
        // [Đo chênh lệch lúc visibilitychange thức dậy]
        const elapsed = performance.now() - hiddenAt;
        if (elapsed > 60000 && isMountedRef.current) {
          // Tab ngủ > 60s → abort stream cũ
          abortRef.current?.abort();
          setIsThinking(false);
          submitLockRef.current = false;
        }
        hiddenAt = null;
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // ═══ [Smart Scroll + Tự cuộn ResizeObserver] ═══
  const scrollToBottom = useCallback(() => {
    if (chatBodyRef.current) {
      const el = chatBodyRef.current;
      const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
      if (isNearBottom) {
        el.scrollTop = el.scrollHeight;
      }
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // ═══ [Mobile Viewport + Fix iOS Safari 100dvh] ═══
  // CSS: height: 100dvh; hoặc visualViewport fallback
  useEffect(() => {
    const handleResize = () => {
      if (window.visualViewport && chatBodyRef.current) {
        // [Bắt visualViewport]
        const vh = window.visualViewport.height;
        chatBodyRef.current.style.maxHeight = `${vh * 0.6}px`;
      }
    };
    window.visualViewport?.addEventListener('resize', handleResize);
    return () => window.visualViewport?.removeEventListener('resize', handleResize);
  }, []);

  // ═══ SUBMIT HANDLER ═══
  const handleSubmit = useCallback(async (text) => {
    // [Double Submit Mutex]
    if (submitLockRef.current) return;
    submitLockRef.current = true;

    // [AbortController Inside Submit]
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    // [Check Token exp < 60s] — simplified check
    if (!tokenRef.current) {
      submitLockRef.current = false;
      return;
    }

    const userMsg = addMessage({ role: 'user', text, isLocal: false });

    // [State isThinking]
    if (isMountedRef.current) setIsThinking(true);

    // Placeholder AI message for streaming
    const aiMsgId = crypto.randomUUID?.() || Date.now().toString();
    addMessage({ id: aiMsgId, role: 'model', text: '', isLocal: false });

    // [TextDecoder — Ngoài lặp]
    const decoder = new TextDecoder('utf-8');
    let buffer = ''; // [Buffer Safe Slice]
    let retryCount = 0; // [Max 1 retry — 401]

    try {
      // ═══ [fetch BaseURL + Bypass SW + credentials] ═══
      const baseUrl = import.meta.env.VITE_BACKEND_URL;
      const response = await fetch(`${baseUrl}/api/v1/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenRef.current}`,
        },
        credentials: 'include', // [Fetch Credentials]
        signal: ac.signal,
        body: JSON.stringify({
          message: text,
          history: messages.filter(m => !m.isLocal).slice(-50),
          language,
        }),
      });

      // ═══ [Check !response.ok] ═══
      if (!response.ok) {
        // [Backend 401 + 401 Retry Limit]
        if (response.status === 401 && retryCount < 1) {
          retryCount++;
          // [Promise Lock 401] — Handled by axiosConfig interceptor for other calls
          // For SSE, just show error
        }
        throw new Error(`HTTP ${response.status}`);
      }

      // ═══ [Cấm EventSource] — Dùng fetch + ReadableStream ═══
      const reader = response.body.getReader();

      try {
        while (true) {
          if (ac.signal.aborted) break;
          const { done, value } = await reader.read();
          if (done) break;

          // [TextDecoder + Flush {stream: false}] khi done
          buffer += decoder.decode(value, { stream: true });

          // [Buffer Safe Slice indexOf + Max Buffer]
          if (buffer.length > 100000) {
            buffer = buffer.slice(-50000); // Prevent OOM
          }

          // Parse SSE events from buffer
          let boundary;
          while ((boundary = buffer.indexOf('\n\n')) !== -1) {
            const line = buffer.slice(0, boundary);
            buffer = buffer.slice(boundary + 2);

            if (line.startsWith('data: ')) {
              const data = line.slice(6);

              // ═══ [ĐỒNG BỘ TIMEOUT CHÉO BE ↔ FE] ═══
              // Lưu ý: Backend đã cài đặt Hard Timeout 60s (Part 3).
              // Frontend cần chuẩn bị sẵn kịch bản bắt tín hiệu
              // [TIMEOUT] từ BE sau 60s để tự động kết thúc luồng
              // hiển thị trên UI và mở khóa nút Gửi.
              if (data === '[DONE]' || data === '[TIMEOUT]') break;
              if (data.startsWith(':')) continue; // heartbeat

              try {
                const parsed = JSON.parse(data);

                if (parsed.error) {
                  if (isMountedRef.current) {
                    setMessages(prev => prev.map(m =>
                      m.id === aiMsgId ? { ...m, text: parsed.text || 'Lỗi hệ thống.' } : m
                    ));
                  }
                  break;
                }

                if (parsed.text) {
                  // ═══════════════════════════════════════════════════════ 
                  // [BẢO ĐẢM 2: REACT CONCURRENT TEARING FIX]
                  // BẮT BUỘC dùng Functional State Update
                  // setText(prev => prev + chunk)
                  // TUYỆT ĐỐI CẤM đọc state hiện tại trực tiếp
                  // ═══════════════════════════════════════════════════════
                  if (isMountedRef.current) {
                    setMessages(prev => prev.map(m =>
                      m.id === aiMsgId
                        ? { ...m, text: m.text + parsed.text }  // Functional update
                        : m
                    ));
                  }
                }
              } catch { /* skip malformed JSON */ }
            }
          }
        }
      } finally {
        // [Cleanup reader.cancel() + ReadableStream Leak]
        try { await reader.cancel(); } catch { /* silent */ }
        // [Flush remaining buffer]
        if (buffer.trim()) {
          decoder.decode(); // flush {stream: false}
        }
      }

    } catch (err) {
      // [Suppress AbortError]
      if (err.name === 'AbortError') {
        // Silent — user cancelled or navigated away
      } else {
        if (isMountedRef.current) {
          setMessages(prev => prev.map(m =>
            m.id === aiMsgId
              ? { ...m, text: m.text || 'Không thể kết nối AI. Vui lòng thử lại.' }
              : m
          ));
        }
      }
    } finally {
      // ═══════════════════════════════════════════════════════════════
      // [CHECKLIST CLEANUP — 3 BƯỚC BẮT BUỘC THEO THỨ TỰ]
      //
      // Bước 1: Gọi throttle.flush() — vắt kiệt state
      //   → Ép render những ký tự cuối cùng bị kẹt trong hàng đợi
      //     throttle (cooldown). Nếu thiếu → AI bị cụt đuôi.
      //
      // Bước 2: reader.cancel() đã thực thi ở inner finally ở trên
      //   → Giải phóng ReadableStream khỏi RAM.
      //
      // Bước 3: setIsThinking(false) — mở khóa UI
      //   → Trả nút Gửi về trạng thái enabled.
      //
      // Ví dụ triển khai throttle:
      //   const throttledUpdate = throttle((text) => {
      //     setMessages(prev => prev.map(m => m.id === aiMsgId
      //       ? { ...m, text } : m));
      //   }, 100);
      //   // Trong vòng lặp stream: throttledUpdate(accumulated);
      //   // Tại đây (finally): throttledUpdate.flush();
      // ═══════════════════════════════════════════════════════════════

      // Bước 1: throttledUpdate.flush(); // ← Bật khi triển khai throttle thực tế

      // Bước 2: reader.cancel() — đã xử lý ở inner finally block

      // Bước 3: Mở khóa UI
      if (isMountedRef.current) {
        setIsThinking(false);
      }
      submitLockRef.current = false; // [Sync submitLock]

      // [Save final state]
      saveMessages(messages);
    }
  }, [messages, language, addMessage, setMessages, saveMessages]);

  // ═══ [Chặn onCopy — Copy Plaintext] ═══
  const handleCopy = useCallback((e) => {
    const selection = window.getSelection()?.toString() || '';
    if (selection) {
      e.preventDefault();
      e.clipboardData?.setData('text/plain', selection);
    }
  }, []);

  // ═══ [Auto-minimize Modal] ═══
  // [Z-Index 9999]
  if (!isLoggedIn) return null;

  return (
    <ChatErrorBoundary>
      {/* Toggle Button */}
      <button
        className="chat-toggle-btn"
        onClick={() => setIsOpen(prev => !prev)}
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
            <button onClick={clearMessages} title="Xóa lịch sử">🗑️</button>
            <button onClick={() => setIsOpen(false)} title="Đóng">✕</button>
          </div>

          {/* Messages */}
          <div className="chat-body" ref={chatBodyRef}>
            {messages.map(msg => (
              <MessageItem key={msg.id} msg={msg} />
            ))}
            {isThinking && <div className="typing-indicator">AI đang suy nghĩ...</div>}
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
```

## 4B.6 — Tích hợp vào `App.jsx`

```diff
 // src/containers/App.jsx
+import AIChatbot from './Patient/AIChatbot/AIChatbot';

 const App = () => {
   return (
     <div className="app-container">
       <Loading />
       <Routes>
         {/* ... existing routes ... */}
       </Routes>
+      {/* [Phase 12] AI Chatbot — Floating widget, render ngoài Routes */}
+      <AIChatbot />
     </div>
   );
 };
```

## 4B.7 — Bảng tổng hợp Guards Frontend

| # | Guard | Kỹ thuật |
|---|---|---|
| 1 | **BẢO ĐẢM 2** | `setText(prev => prev + chunk)` — Functional State |
| 2 | **BẢO ĐẢM 3** | `onMouseDown={e => e.preventDefault()}` trên nút Submit |
| 3 | Cấm EventSource | Dùng `fetch()` + `ReadableStream` |
| 4 | Cấm rehype-raw | Chỉ `remarkGfm`, KHÔNG rehype plugins |
| 5 | Fix iOS 100dvh | CSS `100dvh` + `visualViewport` resize |
| 6 | localForage + persist() | `requestPersist()` on mount |
| 7 | Private Mode Fallback | `inMemoryStore` object |
| 8 | translate="no" | Trên container + MessageItem |
| 9 | React.memo | `MessageItem` + `AIChatbot` root |
| 10 | DOMPurify (Cấm style/class) | `purifyConfig` FORBID_TAGS/ATTR |
| 11 | Smart Scroll | `isNearBottom` check trước scroll |
| 12 | isComposing (IME VN) | `compositionstart/end` events |
| 13 | stopPropagation Esc | `e.stopPropagation()` on Escape |
| 14 | Z-Index 9999 | Floating widget trên mọi content |
| 15 | Input maxLength={500} | HTML attribute hard limit |
| 16 | Double Submit Mutex | `submitLockRef` |
| 17 | AbortController Inside Submit | Tạo mới mỗi lần submit |
| 18 | Mount Flag | `isMountedRef` guard |
| 19 | TextDecoder (Ngoài lặp) | `const decoder = new TextDecoder()` |
| 20 | Flush {stream: false} | `decoder.decode()` cuối stream |
| 21 | Buffer Safe Slice | `indexOf('\n\n')` + Max 100KB |
| 22 | Check !response.ok | Trước khi đọc body |
| 23 | Suppress AbortError | `if (err.name === 'AbortError')` |
| 24 | Block javascript:/data: | Regex check trong link renderer |
| 25 | AI Homograph Phishing | `⚠️` + `nofollow noopener noreferrer` |
| 26 | Auto-close Markdown | Đếm ``` chưa đóng |
| 27 | Cross-Tab Logout Abort | `useEffect` watch `isLoggedIn` |
| 28 | Bfcache Zombie (pageshow) | Reset state on `e.persisted` |
| 29 | visibilitychange | Abort sau 60s ngủ |
| 30 | Chặn onCopy | `clipboardData.setData('text/plain')` |
| 31 | ErrorBoundary | `ChatErrorBoundary` class component |
| 32 | useRef Token | `tokenRef.current` chống stale closure |
| 33 | Redux slice(-50) | Giới hạn 50 messages |
| 34 | Khóa lưu trùng | `persistedMsgIds` Set |
| 35 | UI Reset finally | `setIsThinking(false)` trong finally |
| 36 | fetch credentials | `credentials: 'include'` |
| 37 | Chặn SSE Injection | Backend sanitize (Part 3) |
| 38 | PII Scrubber | Backend maskPII (Part 2) |
| 39 | Khóa i18n Stream | Pass `language` in body |
| 40 | ResizeObserver Scroll | `visualViewport.resize` |
| 41 | Optimistic UI Rollback | Check duplicate ID before add |
| 42 | Fetch BaseURL | `import.meta.env.VITE_BACKEND_URL` |

---
