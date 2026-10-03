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
import { Copy, Check, Eye, ShieldAlert } from 'lucide-react';
import HealthAssessmentCard from './HealthAssessmentCard';
import DoctorCard from './DoctorCard';
import SlotPicker from './SlotPicker';
import BookingDraftCard from './BookingDraftCard';
import BookingSuccessCard from './BookingSuccessCard';
import BookingErrorCard from './BookingErrorCard';
import CancellationDraftCard from './CancellationDraftCard';
import CancellationSuccessCard from './CancellationSuccessCard';
import CancellationErrorCard from './CancellationErrorCard';
import RescheduleDraftCard from './RescheduleDraftCard';
import RescheduleSuccessCard from './RescheduleSuccessCard';
import RescheduleErrorCard from './RescheduleErrorCard';
import PaymentActionCard from './PaymentActionCard';

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
const MessageItem = memo(({
  msg,
  onQuestionClick,
  onSpecialtyClick,
  onSelectDoctor,
  onSelectSlot,
  selectedDoctorId,
  selectedScheduleId,
  onConfirmBooking,
  onCancelDraft,
  onRetrySlot,
  onFindDoctor,
  isBookingProcessing,
  onConfirmCancelBooking,
  onKeepBooking,
  onRetryCancellation,
  isCancelProcessing,
  onConfirmRescheduleBooking,
  onRetryReschedule,
  isRescheduleProcessing,
}) => {
  const [copied, setCopied] = useState(false);

  // ═══ [useMemo] — DOMPurify chỉ chạy khi text thay đổi ═══
  const sanitizedText = useMemo(() => {
    if (!msg.text) return '';
    let text = msg.text;
    // Ẩn khối raw JSON khi đã có Health Assessment Card hiển thị
    if (msg.healthAssessment) {
      text = text.replace(/```(?:json)?[\s\S]*?```/gi, '').trim();
    }
    const closed = autoCloseMarkdown(text);
    return DOMPurify.sanitize(closed, purifyConfig);
  }, [msg.text, msg.healthAssessment]);

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

  // ═══ [User Message — Image Preview + Bubble] ═══
  if (msg.role === 'user') {
    return (
      <div
        className="message-item user-msg"
        translate="no" /* [Browser Auto-Translate Ban] */
      >
        {msg.hasImage && (
          <div className="user-msg-image-container">
            {msg.previewUrl ? (
              <img
                src={msg.previewUrl}
                alt="Ảnh đã gửi"
                className="user-msg-image"
                loading="lazy"
              />
            ) : (
              <div className="user-msg-image-expired">
                <span className="expired-badge">📷 [Ảnh đã hết hạn]</span>
              </div>
            )}
          </div>
        )}
        {msg.text && <p className="user-msg-text">{msg.text}</p>}
      </div>
    );
  }

  // ═══ [AI Message — Avatar + Vision Card + Text Bubble + Copy] ═══
  return (
    <div className="ai-msg-wrapper" translate="no">
      <div className="ai-avatar-small">🤖</div>
      <div className="ai-msg-content">
        {/* Structured Health Assessment Card (Phase 03) */}
        {msg.healthAssessment && (
          <HealthAssessmentCard
            assessment={msg.healthAssessment}
            onQuestionClick={onQuestionClick}
            onSpecialtyClick={onSpecialtyClick}
          />
        )}

        {/* Structured Doctor Discovery Search Results (Phase 04) */}
        {msg.doctorSearchResults && (
          <div className="ai-doctor-results-block">
            {msg.doctorSearchResults.data?.specialtyName && (
              <div className="doctor-results-title">
                <span>Chuyên khoa: <strong>{msg.doctorSearchResults.data.specialtyName}</strong></span>
              </div>
            )}
            {Array.isArray(msg.doctorSearchResults.data?.doctors) && msg.doctorSearchResults.data.doctors.length > 0 ? (
              <div className="ai-doctor-cards-list">
                {msg.doctorSearchResults.data.doctors.map((doctor) => (
                  <DoctorCard
                    key={doctor.doctorId}
                    doctor={doctor}
                    onSelectDoctor={onSelectDoctor}
                    isSelected={selectedDoctorId === doctor.doctorId}
                  />
                ))}
              </div>
            ) : (
              <div className="ai-doctor-empty-box">
                <p>{msg.doctorSearchResults.data?.message || 'Không tìm thấy bác sĩ phù hợp.'}</p>
              </div>
            )}
          </div>
        )}

        {/* Structured Slot Discovery Search Results (Phase 04) */}
        {msg.slotSearchResults && (
          <div className="ai-slot-results-block">
            <SlotPicker
              slotData={msg.slotSearchResults}
              selectedScheduleId={selectedScheduleId}
              onSelectSlot={onSelectSlot}
            />
          </div>
        )}

        {/* Structured Booking Draft Card (Phase 05) */}
        {msg.bookingDraft && (
          <div className="ai-booking-draft-block">
            <BookingDraftCard
              draft={msg.bookingDraft}
              onConfirm={onConfirmBooking}
              onCancel={onCancelDraft}
              isProcessing={isBookingProcessing}
            />
          </div>
        )}

        {/* Structured Booking Success Card (Phase 05) */}
        {(msg.bookingResult || msg.bookingSuccess) && (
          <div className="ai-booking-success-block">
            <BookingSuccessCard
              bookingResult={msg.bookingResult || msg.bookingSuccess}
            />
          </div>
        )}

        {/* Structured Booking Error Card (Phase 05) */}
        {msg.bookingError && (
          <div className="ai-booking-error-block">
            <BookingErrorCard
              bookingError={msg.bookingError}
              onRetrySlot={onRetrySlot}
              onFindDoctor={onFindDoctor}
            />
          </div>
        )}

        {/* Structured Cancellation Draft Card (Phase 06B) */}
        {msg.cancellationDraft && (
          <div className="ai-cancellation-draft-block">
            <CancellationDraftCard
              draft={msg.cancellationDraft}
              onConfirmCancel={onConfirmCancelBooking}
              onKeepBooking={() => onKeepBooking && onKeepBooking(msg.id)}
              isProcessing={isCancelProcessing}
            />
          </div>
        )}

        {/* Structured Cancellation Success Card (Phase 06B) */}
        {msg.cancellationResult && (
          <div className="ai-cancellation-success-block">
            <CancellationSuccessCard
              result={msg.cancellationResult}
            />
          </div>
        )}

        {/* Structured Cancellation Error Card (Phase 06B) */}
        {msg.cancellationError && (
          <div className="ai-cancellation-error-block">
            <CancellationErrorCard
              error={msg.cancellationError}
              onViewBookings={onRetryCancellation}
            />
          </div>
        )}

        {/* Structured Reschedule Draft Card (Phase 06C) */}
        {msg.rescheduleDraft && (
          <div className="ai-reschedule-draft-block">
            <RescheduleDraftCard
              draft={msg.rescheduleDraft}
              onConfirmReschedule={onConfirmRescheduleBooking}
              onKeepBooking={() => onKeepBooking && onKeepBooking(msg.id)}
              isProcessing={isRescheduleProcessing}
            />
          </div>
        )}

        {/* Structured Reschedule Success Card (Phase 06C) */}
        {msg.rescheduleResult && (
          <div className="ai-reschedule-success-block">
            <RescheduleSuccessCard
              result={msg.rescheduleResult}
            />
          </div>
        )}

        {/* Structured Reschedule Error Card (Phase 06C) */}
        {msg.rescheduleError && (
          <div className="ai-reschedule-error-block">
            <RescheduleErrorCard
              error={msg.rescheduleError}
              onRetry={onRetryReschedule}
            />
          </div>
        )}

        {/* Structured Payment Action Card (Phase 06D) */}
        {msg.paymentData && (
          <div className="ai-payment-action-block">
            <PaymentActionCard
              paymentData={msg.paymentData}
            />
          </div>
        )}

        {/* Structured Vision Analysis Card (Phase 02 Fallback khi chưa có Assessment Card) */}
        {!msg.healthAssessment && msg.visionAnalysis && (
          <div className="vision-analysis-card">
            <div className="vision-card-header">
              <Eye size={16} className="vision-header-icon" />
              <span className="vision-header-title">Phân tích hình ảnh (Sơ bộ)</span>
            </div>

            {msg.visionAnalysis.summary && (
              <div className="vision-section vision-summary">
                <p>{msg.visionAnalysis.summary}</p>
              </div>
            )}

            {Array.isArray(msg.visionAnalysis.observations) && msg.visionAnalysis.observations.length > 0 && (
              <div className="vision-section">
                <div className="vision-section-title">🔍 Quan sát trực quan:</div>
                <ul className="vision-list">
                  {msg.visionAnalysis.observations.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {Array.isArray(msg.visionAnalysis.ocrText) && msg.visionAnalysis.ocrText.length > 0 && (
              <div className="vision-section">
                <div className="vision-section-title">📝 Văn bản nhận diện (OCR):</div>
                <ul className="vision-list vision-ocr-list">
                  {msg.visionAnalysis.ocrText.map((text, idx) => (
                    <li key={idx}><code>{text}</code></li>
                  ))}
                </ul>
              </div>
            )}

            {msg.visionAnalysis.uncertainty && (
              <div className="vision-section vision-uncertainty">
                <div className="vision-section-title">⚠️ Mức độ chắc chắn & Giới hạn:</div>
                <p className="vision-note">{msg.visionAnalysis.uncertainty}</p>
              </div>
            )}

            {Array.isArray(msg.visionAnalysis.followUpQuestions) && msg.visionAnalysis.followUpQuestions.length > 0 && (
              <div className="vision-section">
                <div className="vision-section-title">❓ Câu hỏi gợi ý làm rõ:</div>
                <ul className="vision-list">
                  {msg.visionAnalysis.followUpQuestions.map((q, idx) => (
                    <li key={idx}>{q}</li>
                  ))}
                </ul>
              </div>
            )}

            {msg.visionAnalysis.safetyNotice && (
              <div className="vision-safety-banner">
                <ShieldAlert size={14} className="safety-icon" />
                <span>{msg.visionAnalysis.safetyNotice}</span>
              </div>
            )}
          </div>
        )}

        {/* Regular Markdown Stream Text */}
        {msg.text && (
          <div className="ai-msg">
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={linkRenderer}
              >
                {sanitizedText}
              </ReactMarkdown>
            </div>
          </div>
        )}

        {/* Knowledge Citations / Provenance (Phase 07) */}
        {Array.isArray(msg.citations) && msg.citations.length > 0 && (
          <div className="knowledge-citations-bar">
            <span className="citations-label">
              📚 <FormattedMessage id="chatbot.sources-label" defaultMessage="Nguồn tham khảo chính thức:" />
            </span>
            <div className="citations-list">
              {msg.citations.map((c, idx) => (
                <span key={idx} className="citation-tag" title={c.source}>
                  {c.title}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Copy Button — Hiện khi có text */}
        {msg.text && (
          <button
            className={`copy-btn ${copied ? 'copied' : ''}`}
            onClick={handleCopy}
            type="button"
            aria-label={copied ? "Copied" : "Copy"}
          >
            {copied ? (
              <>
                <Check size={14} /> <FormattedMessage id="chatbot.btn-copied" />
              </>
            ) : (
              <>
                <Copy size={14} /> <FormattedMessage id="chatbot.btn-copy" />
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
