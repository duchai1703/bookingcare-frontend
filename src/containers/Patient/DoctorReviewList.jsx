// src/containers/Patient/DoctorReviewList.jsx
// [Phase 9.6] Danh sách đánh giá bác sĩ — nhúng trong DoctorDetail
// Props: doctorId
// Hiển thị: Điểm trung bình + Tổng lượt đánh giá + Danh sách nhận xét (ẩn danh)
// Phân trang: Nút "Xem thêm" (Load more)
import React, { useState, useEffect, useCallback } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { getDoctorReviews } from '../../services/reviewService';
import './DoctorReviewList.scss';

const PAGE_SIZE = 5;

const DoctorReviewList = ({ doctorId }) => {
  const intl = useIntl();

  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // [Fix Bug 9.6] Fetch reviews — sửa đọc đúng API contract
  // Backend trả: { errCode, data: { reviews: [], pagination: { totalPages, ... }, averageRating } }
  const fetchReviews = useCallback(async (page, append = false) => {
    if (!doctorId) return;
    setIsLoading(true);
    try {
      const result = await getDoctorReviews(doctorId, page, PAGE_SIZE);
      if (result.errCode === 0) {
        // FINAL FIX 9.7 — Đọc đúng contract Backend: { data: { totalReviews, pagination: { totalItems, totalPages }, averageRating } }
        const rows = result.data?.reviews || [];
        const count = result.data?.totalReviews || result.data?.pagination?.totalItems || 0; // FINAL FIX 9.7
        const pages = result.data?.pagination?.totalPages || 1;
        const avg = result.data?.averageRating || 0;

        if (append) {
          setReviews((prev) => [...prev, ...rows]);
        } else {
          setReviews(rows);
        }
        setTotalCount(count);
        setAverageRating(parseFloat(avg).toFixed(1));
        setTotalPages(Math.max(1, pages));
      }
    } catch {
      // [Phase 9.7] Đã xóa console.error — Production cleanup
    } finally {
      setIsLoading(false);
    }
  }, [doctorId]);

  // Fetch page 1 on mount
  useEffect(() => {
    setCurrentPage(1);
    fetchReviews(1, false);
  }, [fetchReviews]);

  // "Xem thêm" — fetch tiếp trang kế
  const handleLoadMore = () => {
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    fetchReviews(nextPage, true); // append = true
  };

  // ═══════════════════════════════════════════════════════════
  // Ẩn danh tên người dùng: "Nguyễn Văn An" → "Nguyễn Văn ***"
  // Lấy firstName → thay bằng "***"
  // ═══════════════════════════════════════════════════════════
  const anonymizeName = (lastName, firstName) => {
    const last = lastName || '';
    const suffix = intl.formatMessage({ id: 'review-list.anonymous-suffix' });
    return `${last} ${suffix}`.trim();
  };

  // Render sao tĩnh (hiển thị, không interactive)
  const renderStars = (count) => {
    return [1, 2, 3, 4, 5].map((star) => (
      <i
        key={star}
        className={`fas fa-star review-star ${star <= count ? 'review-star--filled' : ''}`}
      />
    ));
  };

  return (
    <div className="doctor-review-list">
      <h2 className="review-list__title">
        <i className="fas fa-comments" /> <FormattedMessage id="review-list.title" />
      </h2>

      {/* Tổng quan: Điểm + Lượt */}
      {totalCount > 0 && (
        <div className="review-list__summary">
          <div className="review-list__average">
            <span className="average-number">{averageRating}</span>
            <span className="average-max">/5</span>
            <span className="average-label">
              <FormattedMessage id="review-list.average" />
            </span>
          </div>
          <div className="review-list__stars-big">
            {renderStars(Math.round(averageRating))}
          </div>
          <span className="review-list__count">
            ({totalCount} <FormattedMessage id="review-list.total-reviews" />)
          </span>
        </div>
      )}

      {/* Danh sách reviews */}
      {reviews.length === 0 && !isLoading ? (
        <div className="review-list__empty">
          <i className="fas fa-comment-slash" />
          <p><FormattedMessage id="review-list.no-reviews" /></p>
        </div>
      ) : (
        <div className="review-list__items">
          {reviews.map((r, idx) => (
            <div className="review-item" key={r.id || idx}>
              <div className="review-item__header">
                <span className="review-item__name">
                  <i className="fas fa-user-circle" />
                  {anonymizeName(
                    (r.reviewPatientData || r.patientData)?.lastName,
                    (r.reviewPatientData || r.patientData)?.firstName
                  )}
                </span>
                <div className="review-item__stars">
                  {renderStars(r.rating)}
                </div>
              </div>
              {r.comment && (
                <p className="review-item__comment">{r.comment}</p>
              )}
              {r.createdAt && (
                <span className="review-item__date">
                  {new Date(r.createdAt).toLocaleDateString()}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="review-list__loading">
          <i className="fas fa-spinner fa-spin" /> <FormattedMessage id="common.loading" />
        </div>
      )}

      {/* Nút "Xem thêm" — chỉ hiện nếu còn trang */}
      {!isLoading && currentPage < totalPages && (
        <button className="review-list__load-more" onClick={handleLoadMore}>
          <FormattedMessage id="review-list.load-more" /> <i className="fas fa-chevron-down" />
        </button>
      )}
    </div>
  );
};

export default DoctorReviewList;
