// ═══════════════════════════════════════════════════════════════════════
// [Phase 12.3] useChatStorage — Custom Hook quản lý Chat History
// Driver: IndexedDB (localForage) — CẤM TUYỆT ĐỐI Browser_Storage
// Fallback: In-Memory Store (Safari Private Mode)
// ═══════════════════════════════════════════════════════════════════════

import localforage from 'localforage';
import { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';

// ═══ [Private Mode Storage] — In-Memory Fallback ═══
// Khi Safari Private Mode hoặc browser khóa IndexedDB Quota,
// tự động lùi về object in-memory — KHÔNG BAO GIỜ rơi xuống Browser_Storage.
let inMemoryStore = {};

// ═══ Khởi tạo localForage Instance ═══
// [LỆNH THÉP] CHỈ IndexedDB — CẤM Browser_Storage
const chatStore = localforage.createInstance({
  name: 'bookingcare-ai',
  storeName: 'chat_history',
  driver: [localforage.INDEXEDDB],
});

// ═══ Request Persistent Storage ═══
// Yêu cầu browser không tự xóa IndexedDB data
async function requestPersist() {
  try {
    if (navigator.storage?.persist) {
      await navigator.storage.persist();
    }
  } catch {
    /* silent — browser không hỗ trợ */
  }
}

// ═══ Safe get/set với fallback ═══
// Bọc chatStore trong try/catch — nếu IndexedDB bị khóa,
// tự động lùi về inMemoryStore
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

// ═══════════════════════════════════════════════════════════════════════
// Hook: useChatStorage(userId)
// ═══════════════════════════════════════════════════════════════════════
export function useChatStorage(userId) {
  const [messages, setMessages] = useState([]);
  const persistedMsgIds = useRef(new Set()); // [Khóa lưu trùng]
  const isMounted = useRef(true);

  // ──── Load on mount ────
  useEffect(() => {
    isMounted.current = true;
    requestPersist();

    const storageKey = `chat_${userId}`;
    safeGet(storageKey).then((saved) => {
      if (isMounted.current && Array.isArray(saved)) {
        // [Redux History slice(-50)] — Giới hạn 50 tin nhắn
        const sliced = saved.slice(-50);
        setMessages(sliced);
        sliced.forEach((m) => {
          if (m.id) persistedMsgIds.current.add(m.id);
        });
      }
    });

    return () => {
      isMounted.current = false;
    };
  }, [userId]);

  // ──── Save — [Disk Thrashing Guard: Lưu 1 lần] ────
  const saveMessages = useCallback(
    async (msgs) => {
      const storageKey = `chat_${userId}`;
      const toSave = msgs.slice(-50); // [Redux slice(-50)]
      await safeSet(storageKey, toSave);
    },
    [userId]
  );

  // ──── Add Message — [Optimistic UI Guard] ────
  const addMessage = useCallback(
    (msg) => {
      const newMsg = { ...msg, id: msg.id || uuidv4() };
      setMessages((prev) => {
        // [Optimistic UI Rollback] — Kiểm tra trùng ID
        // Ngăn React Strict Mode render trùng lặp
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        const updated = [...prev, newMsg].slice(-50);
        saveMessages(updated);
        return updated;
      });
      return newMsg;
    },
    [saveMessages]
  );

  // ──── Clear Messages ────
  const clearMessages = useCallback(() => {
    setMessages([]);
    const storageKey = `chat_${userId}`;
    safeSet(storageKey, []);
    persistedMsgIds.current.clear();
  }, [userId]);

  return { messages, setMessages, addMessage, clearMessages, saveMessages };
}
