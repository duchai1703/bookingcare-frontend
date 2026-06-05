// ═══════════════════════════════════════════════════════════════════════
// [Phase 12.4 — PREMIUM UI] MessageItem — React.memo + DOMPurify + Markdown
// CẤM rehype-raw — chỉ remarkGfm
// + Copy Button + AI Avatar + Fade Animation
// ═══════════════════════════════════════════════════════════════════════

import React, { memo, useMemo, useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import DOMPurify from 'dompurify';
import { FormattedMessage } from 'react-intl';
import { Copy, Check } from 'lucide-react';

// ═══ [DOMPurify: Cấm style/class/script] ═══
const purifyConfig = {
  FORBID_TAGS: ['style', 'script', 'iframe', 'object', 'embed', 'form'],
  FORBID_ATTR: ['style', 'class', 'onclick', 'onerror', 'onload'],
};

// ═══ [Auto-close Markdown] ═══
// Đếm ``` chưa đóng — tự bổ sung closing backticks khi stream bị cắt giữa chừng
function autoCloseMarkdown(text) {
  if (!text) return '';
  const backtickCount = (text.match(/```/g) || []).length;
  if (backtickCount % 2 !== 0) return text + '\n```';
  return text;
}

// ═══ [Component Memoization] — React.memo đóng băng tin nhắn cũ ═══
const MessageItem = memo(({ msg }) => {
  const [copied, setCopied] = useState(false);

  // ═══ [useMemo] — DOMPurify chỉ chạy khi text thay đổi ═══
  const sanitizedText = useMemo(() => {
    if (!msg.text) return '';
    const closed = autoCloseMarkdown(msg.text);
    return DOMPurify.sanitize(closed, purifyConfig);
  }, [msg.text]);

  // ═══ [AI Homograph Phishing Guard] ═══
  const linkRenderer = useMemo(
    () => ({
      a: ({ href, children }) => {
        // [Block javascript:/data: URI]
        if (/^(javascript|data):/i.test(href || '')) {
          return <span>{children}</span>;
        }
        // [Internal Link — SPA]
        const isLocal = href?.startsWith('/') && !href.startsWith('//');
        if (isLocal) {
          return <a href={href}>{children}</a>;
        }
        // [External Link — ⚠️ + nofollow noopener noreferrer]
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
    }),
    []
  );

  // ═══ [Copy to Clipboard] ═══
  const handleCopy = useCallback(() => {
    if (!msg.text) return;
    navigator.clipboard.writeText(msg.text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = msg.text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [msg.text]);

  // ═══ [User Message — Simple Bubble] ═══
  if (msg.role === 'user') {
    return (
      <div
        className="message-item user-msg"
        translate="no" /* [Browser Auto-Translate Ban] */
      >
        <p>{msg.text}</p>
      </div>
    );
  }

  // ═══ [AI Message — Avatar + Bubble + Copy] ═══
  // [AST Depth <= 2] — remarkGfm only, no nested plugins
  return (
    <div className="ai-msg-wrapper" translate="no">
      <div className="ai-avatar-small">🤖</div>
      <div className="ai-msg-content">
        <div className="ai-msg">
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              /* [Cấm rehype-raw] — KHÔNG dùng rehypePlugins */
              components={linkRenderer}
            >
              {sanitizedText}
            </ReactMarkdown>
          </div>
        </div>

        {/* Copy Button — Hiện khi hover */}
        {msg.text && (
          <button
            className={`copy-btn ${copied ? 'copied' : ''}`}
            onClick={handleCopy}
            type="button"
            aria-label={copied ? "Copied" : "Copy"}
          >
            {copied ? (
              <>
                <Check /> <FormattedMessage id="chatbot.btn-copied" />
              </>
            ) : (
              <>
                <Copy /> <FormattedMessage id="chatbot.btn-copy" />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
});

MessageItem.displayName = 'MessageItem';
export default MessageItem;
