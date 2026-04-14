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
    <div className="rating-modal__overlay" onClick={handleClose}>
      <div className="rating-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="rating-modal__header">
          <h3 className="rating-modal__title">
            <i className="fas fa-star" /> <FormattedMessage id="rating.modal-title" />
          </h3>
          <button className="rating-modal__close" onClick={handleClose}>✕</button>
        </div>

        {/* Star Rating */}
        <div className="rating-modal__body">
          <label className="rating-modal__label">
            <FormattedMessage id="rating.star-label" />
          </label>
          <div className="rating-modal__stars">
            {[1, 2, 3, 4, 5].map((star) => (
              <i
                key={star}
                className={`fas fa-star rating-star ${
                  star <= (hoverRating || rating) ? 'rating-star--active' : ''
                }`}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(star)}
              />
            ))}
            {rating > 0 && <span className="rating-value">{rating}/5</span>}
          </div>

          {/* Comment */}
          <label className="rating-modal__label">
            <FormattedMessage id="rating.comment-label" />
          </label>
          <textarea
            className="rating-modal__textarea"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            placeholder={intl.formatMessage({ id: 'rating.comment-placeholder' })}
          />
        </div>

        {/* Footer */}
        <div className="rating-modal__footer">
          <button
            className="rating-modal__btn rating-modal__btn--cancel"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            <FormattedMessage id="rating.cancel-btn" />
          </button>
          <button
            className="rating-modal__btn rating-modal__btn--submit"
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
