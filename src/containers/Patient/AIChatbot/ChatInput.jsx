// ═══════════════════════════════════════════════════════════════════════
// [Phase 12.4] ChatInput — IME Guard + BẢO ĐẢM 3 (Mobile Blur Fix)
// ═══════════════════════════════════════════════════════════════════════

import React, { useRef, useCallback } from 'react';

const ChatInput = ({ onSubmit, disabled, isThinking }) => {
  const inputRef = useRef(null);
  const isComposingRef = useRef(false); // [IME Tiếng Việt]

  // ═══ [Chặn isComposing] — Không submit khi đang gõ dấu tiếng Việt ═══
  const handleCompositionStart = () => {
    isComposingRef.current = true;
  };
  const handleCompositionEnd = () => {
    isComposingRef.current = false;
  };

  // ═══ [Submit Value từ DOM Form Event] ═══
  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      if (isComposingRef.current) return; // [IME Guard]
      const value = inputRef.current?.value?.trim();
      if (!value || disabled) return;
      onSubmit(value);
      inputRef.current.value = '';
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

  return (
    <form onSubmit={handleSubmit} className="chat-input-form">
      <input
        ref={inputRef}
        type="text"
        maxLength={500} /* [Input maxLength={500}] */
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
