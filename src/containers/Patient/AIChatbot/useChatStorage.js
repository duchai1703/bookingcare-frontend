// ═══════════════════════════════════════════════════════════════════════
// [Phase 01 Stabilization] useChatStorage — Custom Hook quản lý Chat History
// Driver: IndexedDB (localForage)
// Fallback: In-Memory Store
// Normalization: Corrupted history recovery & message sanitization
// ═══════════════════════════════════════════════════════════════════════

import localforage from 'localforage';
import { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';

// ═══ In-Memory Fallback ═══
let inMemoryStore = {};

// ═══ Khởi tạo localForage Instance ═══
const chatStore = localforage.createInstance({
  name: 'bookingcare-ai',
  storeName: 'chat_history',
  driver: [localforage.INDEXEDDB],
});

// ═══ Request Persistent Storage ═══
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

// ═══ Normalizer chống Corrupted Data trong IndexedDB ═══
function normalizeStoredMessages(rawList) {
  if (!Array.isArray(rawList)) return [];

  const seenIds = new Set();
  const validMessages = [];

  for (const item of rawList) {
    if (!item || typeof item !== 'object') continue;

    const text = typeof item.text === 'string'
      ? item.text
      : (typeof item.content === 'string' ? item.content : '');

    const hasImage = Boolean(item.hasImage || item.imageId || item.imagePreview);

    // Bỏ qua các tin nhắn rỗng không có text, không có ảnh và không có thẻ structured card
    if (
      !text.trim() &&
      !hasImage &&
      !item.visionAnalysis &&
      !item.healthAssessment &&
      !item.doctorSearchResults &&
      !item.slotSearchResults &&
      !item.bookingDraft &&
      !item.bookingResult &&
      !item.bookingError
    ) continue;

    const id = item.id || uuidv4();
    if (seenIds.has(id)) continue;
    seenIds.add(id);

    const roleHint = item.role || item.sender;
    const role = roleHint === 'user' ? 'user' : 'model';

    validMessages.push({
      id,
      role,
      text: text.trim(),
      hasImage,
      imageId: item.imageId || undefined,
      visionAnalysis: item.visionAnalysis || undefined,
      healthAssessment: item.healthAssessment || undefined,
      doctorSearchResults: item.doctorSearchResults || undefined,
      slotSearchResults: item.slotSearchResults || undefined,
      bookingDraft: item.bookingDraft || undefined,
      bookingResult: item.bookingResult || undefined,
      bookingError: item.bookingError || undefined,
      isLocal: Boolean(item.isLocal),
      createdAt: item.createdAt || Date.now(),
    });
  }

  // Giữ tối đa 50 tin nhắn gần nhất
  return validMessages.slice(-50);
}

// ═══════════════════════════════════════════════════════════════════════
// Hook: useChatStorage(userId)
// ═══════════════════════════════════════════════════════════════════════
export function useChatStorage(userId) {
  const [messages, setMessages] = useState([]);
  const persistedMsgIds = useRef(new Set());
  const isMounted = useRef(true);

  // ──── Load on mount ────
  useEffect(() => {
    isMounted.current = true;
    requestPersist();

    const storageKey = `chat_${userId}`;
    safeGet(storageKey)
      .then((saved) => {
        if (!isMounted.current) return;
        const normalized = normalizeStoredMessages(saved);
        setMessages(normalized);
        normalized.forEach((m) => {
          if (m.id) persistedMsgIds.current.add(m.id);
        });
      })
      .catch(() => {
        if (isMounted.current) setMessages([]);
      });

    return () => {
      isMounted.current = false;
    };
  }, [userId]);

  // ──── Save ────
  const saveMessages = useCallback(
    async (msgs) => {
      const storageKey = `chat_${userId}`;
      const toSave = normalizeStoredMessages(msgs);
      await safeSet(storageKey, toSave);
    },
    [userId]
  );

  // ──── Add Message ────
  const addMessage = useCallback(
    (msg) => {
      const newMsg = { ...msg, id: msg.id || uuidv4() };
      setMessages((prev) => {
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
