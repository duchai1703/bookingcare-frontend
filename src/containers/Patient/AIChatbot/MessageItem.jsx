// ═══════════════════════════════════════════════════════════════════════
// [Phase 12.4] MessageItem — React.memo + DOMPurify + Markdown
// CẤM rehype-raw — chỉ remarkGfm
// ═══════════════════════════════════════════════════════════════════════

import React, { memo, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import DOMPurify from 'dompurify';

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
