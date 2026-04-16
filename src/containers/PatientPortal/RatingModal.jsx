// src/containers/PatientPortal/RatingModal.jsx
// [Phase 9.6] Modal Đánh Giá Bác sĩ
// Props: isOpen, onClose, bookingData ({ bookingId, doctorId }), onSuccess
// UI: 5 ngôi sao (hover+click) + textarea nhận xét + Gửi đánh giá
// Submit → API submitReview → thành công → đóng modal → toast → onSuccess()
import React, { useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { toast } from 'react-toastify';
import { submitReview } from '../../services/reviewService';
import './RatingModal.scss';

const RatingModal = ({ isOpen, onClose, bookingData, onSuccess }) => {
  const intl = useIntl();

  // State: Số sao (1-5) và nhận xét
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset state khi đóng modal
  const handleClose = () => {
    setRating(0);
    setHoverRating(0);
    setComment('');
    setIsSubmitting(false);
    onClose();
  };

  // ═══════════════════════════════════════════════════════════════════════
  // [Phase 9.6] Submit Review
  // Validate: phải chọn ít nhất 1 sao
  // API: submitReview({ bookingId, doctorId, rating, comment })
  // Thành công → đóng modal → toast → gọi onSuccess() để component cha reload
  // ═══════════════════════════════════════════════════════════════════════
  const handleSubmit = async () => {
    // GUARD: Phải chọn sao
    if (rating === 0) {
      toast.warn(intl.formatMessage({ id: 'rating.star-required' }));
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitReview({
        bookingId: bookingData.bookingId,
        doctorId: bookingData.doctorId,
        rating,
        comment: comment.trim(),
      });

      if (result.errCode === 0) {
        // ═══════════════════════════════════════════════════════════
        // [Fix Bug 9.6] THỨ TỰ BẮT BUỘC khi API thành công:
        // (1) Đóng modal trước (reset state + gọi onClose)
        // (2) Toast thông báo thành công
        // (3) Gọi onSuccess() để component cha (AppointmentHistory) fetch lại data
        // ═══════════════════════════════════════════════════════════
        handleClose();                                                     // (1) Đóng modal
        toast.success(intl.formatMessage({ id: 'rating.success' }));       // (2) Toast
        if (onSuccess) onSuccess();                                        // (3) Refetch
      } else {
        toast.error(result.message || intl.formatMessage({ id: 'rating.error' }));
      }
    } catch {
      // [Phase 9.7] Đã xóa console.error — Production cleanup
      toast.error(intl.formatMessage({ id: 'rating.error' }));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="tw-fixed tw-inset-0 tw-bg-black/50 tw-flex tw-items-center tw-justify-center tw-p-4 tw-z-[9999]" onClick={handleClose}>
      <div className="tw-bg-white tw-rounded-card tw-shadow-2xl tw-w-full tw-max-w-md" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="tw-flex tw-items-center tw-justify-between tw-px-6 tw-py-4 tw-border-b tw-border-gray-100">
          <h3 className="tw-text-lg tw-font-semibold tw-text-text-main tw-flex tw-items-center tw-gap-2">
            <i className="fas fa-star tw-text-amber-400" /> <FormattedMessage id="rating.modal-title" />
          </h3>
          <button className="tw-w-8 tw-h-8 tw-flex tw-items-center tw-justify-center tw-text-xl tw-text-text-light tw-bg-transparent tw-border-0 tw-cursor-pointer hover:tw-text-text-main tw-transition-colors tw-rounded-full hover:tw-bg-gray-100" onClick={handleClose}>✕</button>
        </div>

        {/* Star Rating */}
        <div className="tw-px-6 tw-py-5 tw-space-y-4">
          <label className="tw-block tw-text-sm tw-font-medium tw-text-text-main">
            <FormattedMessage id="rating.star-label" />
          </label>
          <div className="tw-flex tw-items-center tw-gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <i
                key={star}
                className={`fas fa-star tw-text-3xl tw-cursor-pointer tw-transition-all tw-duration-150 ${
                  star <= (hoverRating || rating)
                    ? 'tw-text-amber-400 tw-scale-110'
                    : 'tw-text-gray-300 hover:tw-text-amber-200'
                }`}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(star)}
              />
            ))}
            {rating > 0 && <span className="tw-ml-2 tw-text-sm tw-font-semibold tw-text-amber-600">{rating}/5</span>}
          </div>

          {/* Comment */}
          <div>
            <label className="tw-block tw-text-sm tw-font-medium tw-text-text-main tw-mb-1">
              <FormattedMessage id="rating.comment-label" />
            </label>
            <textarea
              className="tw-w-full tw-px-3 tw-py-2 tw-border tw-border-gray-300 tw-rounded-lg tw-text-sm tw-resize-y focus:tw-outline-none focus:tw-border-primary"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              placeholder={intl.formatMessage({ id: 'rating.comment-placeholder' })}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="tw-flex tw-justify-end tw-gap-3 tw-px-6 tw-py-4 tw-border-t tw-border-gray-100">
          <button
            className="tw-px-5 tw-py-2 tw-bg-gray-100 tw-text-text-sub tw-rounded-lg tw-font-medium tw-text-sm tw-border tw-border-gray-300 tw-cursor-pointer hover:tw-bg-gray-200 tw-transition-colors disabled:tw-opacity-50"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            <FormattedMessage id="rating.cancel-btn" />
          </button>
          <button
            className="tw-px-5 tw-py-2 tw-bg-primary tw-text-white tw-rounded-lg tw-font-semibold tw-text-sm tw-border-0 tw-cursor-pointer hover:tw-bg-primary-dark tw-transition-colors disabled:tw-opacity-50 tw-flex tw-items-center tw-gap-2"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <><i className="fas fa-spinner fa-spin" /> <FormattedMessage id="rating.submitting" /></>
            ) : (
              <><i className="fas fa-paper-plane" /> <FormattedMessage id="rating.submit-btn" /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RatingModal;
