// ═══════════════════════════════════════════════════════════════════════
// [Phase 12.5 — PREMIUM UI] SuggestionChips — Empty State Component
// Hiển thị khi chưa có tin nhắn, click chip → gửi câu hỏi tự động
// ═══════════════════════════════════════════════════════════════════════

import React, { memo, useCallback } from 'react';
import { Sparkles, ChevronRight } from 'lucide-react';
import { FormattedMessage, useIntl } from 'react-intl';

const SUGGESTIONS = [
  { emoji: '🩺', key: 'chatbot.suggest-symptom' },
  { emoji: '📅', key: 'chatbot.suggest-booking' },
  { emoji: '🏢', key: 'chatbot.suggest-specialty' },
  { emoji: '💊', key: 'chatbot.suggest-medicine' },
];

const SuggestionChips = memo(({ onSubmit, disabled }) => {
  const intl = useIntl();

  const handleChipClick = useCallback(
    (key) => {
      if (!disabled) {
        const translatedText = intl.formatMessage({ id: key });
        onSubmit(translatedText);
      }
    },
    [onSubmit, disabled, intl]
  );

  return (
    <div className="empty-state">
      <div className="empty-icon">
        <Sparkles />
      </div>
      <div className="empty-title">
        <FormattedMessage id="chatbot.empty-title" />
      </div>
      <div className="empty-subtitle">
        <FormattedMessage id="chatbot.empty-subtitle" />
      </div>

      <div className="suggestion-chips">
        {SUGGESTIONS.map((item) => (
          <button
            key={item.key}
            className="suggestion-chip"
            onClick={() => handleChipClick(item.key)}
            disabled={disabled}
            type="button"
          >
            <span className="chip-emoji">{item.emoji}</span>
            <span className="chip-text">
              <FormattedMessage id={item.key} />
            </span>
            <span className="chip-arrow">
              <ChevronRight />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
});

SuggestionChips.displayName = 'SuggestionChips';
export default SuggestionChips;
