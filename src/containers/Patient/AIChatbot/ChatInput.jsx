// ═══════════════════════════════════════════════════════════════════════
// [Phase 12.4 — PREMIUM UI] ChatInput — Textarea Auto-resize + Send Icon
// IME Guard + BẢO ĐẢM 3 (Mobile Blur Fix) — Logic giữ nguyên 100%
// ═══════════════════════════════════════════════════════════════════════

import React, { useRef, useCallback, useState } from 'react';
import { Send } from 'lucide-react';
import { useIntl } from 'react-intl';

const ChatInput = ({ onSubmit, disabled, isThinking }) => {
  const intl = useIntl();
  const inputRef = useRef(null);
  const isComposingRef = useRef(false); // [IME Tiếng Việt]
  const [charCount, setCharCount] = useState(0);
  const MAX_LENGTH = 500;

  // ═══ [Chặn isComposing] — Không submit khi đang gõ dấu tiếng Việt ═══
  const handleCompositionStart = () => {
    isComposingRef.current = true;
  };
  const handleCompositionEnd = () => {
    isComposingRef.current = false;
  };

  // ═══ [Auto-resize Textarea] ═══
  const handleInput = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    // Enforce maxLength manually for textarea
    if (el.value.length > MAX_LENGTH) {
      el.value = el.value.slice(0, MAX_LENGTH);
    }
    setCharCount(el.value.length);
    // Reset height → recalculate
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 96) + 'px'; // max 4 lines ~96px
  }, []);

  // ═══ [Submit Value từ DOM Form Event] ═══
  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      if (isComposingRef.current) return; // [IME Guard]
      const value = inputRef.current?.value?.trim();
      if (!value || disabled) return;
      onSubmit(value);
      inputRef.current.value = '';
      inputRef.current.style.height = 'auto'; // Reset height after submit
      setCharCount(0);
    },
    [onSubmit, disabled]
  );

  // ═══ [Keydown Handler] ═══
  const handleKeyDown = useCallback(
    (e) => {
      // Enter (không Shift, không composing) → submit
      if (e.key === 'Enter' && !e.shiftKey && !isComposingRef.current) {
        e.preventDefault();
        handleSubmit(e);
      }
      // [stopPropagation Esc] — Không đóng modal cha
      if (e.key === 'Escape') {
        e.stopPropagation();
      }
    },
    [handleSubmit]
  );

  // ═══ Character counter class ═══
  const counterClass = charCount >= MAX_LENGTH
    ? 'char-counter at-limit'
    : charCount >= MAX_LENGTH * 0.8
      ? 'char-counter near-limit'
      : 'char-counter';

  const placeholderText = isThinking
    ? intl.formatMessage({ id: 'chatbot.placeholder-thinking' })
    : intl.formatMessage({ id: 'chatbot.placeholder-input' });

  return (
    <form onSubmit={handleSubmit} className="chat-input-form">
      <div className="chat-input-wrapper">
        <textarea
          ref={inputRef}
          rows={1}
          maxLength={MAX_LENGTH}
          placeholder={placeholderText}
          disabled={disabled}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          className="chat-input"
          autoComplete="off"
        />
        {charCount > 0 && (
          <span className={counterClass}>
            {charCount}/{MAX_LENGTH}
          </span>
        )}
      </div>
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
        aria-label="Gửi tin nhắn"
      >
        <Send />
      </button>
    </form>
  );
};

export default ChatInput;
