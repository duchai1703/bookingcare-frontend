// src/containers/PatientPortal/AppointmentHistory.jsx
// [Phase 9.4] Quản lý Lịch hẹn — 3 Tabs + Pagination + Cancel Modal
// Luồng Hủy: Click "Hủy lịch" → Mở Modal Confirm → User bấm "Đồng ý" → API cancelBooking → Toast → Refetch
// Luồng Đánh giá: Ẩn nút "Đánh giá" nếu isReviewed === true
import React, { useState, useEffect, useCallback } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import moment from 'moment';

import { getPatientBookings, cancelBooking } from '../../services/patientService';
import { LANGUAGES } from '../../utils/constants';
import RatingModal from './RatingModal';
import './AppointmentHistory.scss';

// Tab config: mỗi tab map với status codes gửi lên API
const TABS = [
  { key: 'upcoming', status: 'S1,S2', icon: 'fa-clock' },
  { key: 'done', status: 'S3', icon: 'fa-check-circle' },
  { key: 'cancelled', status: 'S4', icon: 'fa-times-circle' },
];

const PAGE_SIZE = 5;

const AppointmentHistory = () => {
  const intl = useIntl();
  const language = useSelector((state) => state.app.language);

  // State
  const [activeTab, setActiveTab] = useState('upcoming');
  const [bookings, setBookings] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Cancel modal state
  const [cancelModal, setCancelModal] = useState({
    isOpen: false,
    bookingId: null,
    isCancelling: false,
  });

  // [Phase 9.6] Rating modal state
  const [ratingModal, setRatingModal] = useState({
    isOpen: false,
    bookingData: null, // { bookingId, doctorId }
  });

  // ═══════════════════════════════════════════════════════════
  // Fetch bookings khi tab hoặc page thay đổi
  // ═══════════════════════════════════════════════════════════
  const fetchBookings = useCallback(async () => {
    setIsLoading(true);
    try {
      const tabConfig = TABS.find((t) => t.key === activeTab);
      const result = await getPatientBookings({
        status: tabConfig.status,
        page: currentPage,
        limit: PAGE_SIZE,
      });

      if (result.errCode === 0) {
        setBookings(result.data?.rows || result.data || []);
        const total = result.data?.count || result.totalCount || 0;
        setTotalPages(Math.max(1, Math.ceil(total / PAGE_SIZE)));
      } else {
        setBookings([]);
      }
    } catch (err) {
      setBookings([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, currentPage]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Khi chuyển tab → reset về trang 1
  const handleChangeTab = (tabKey) => {
    setActiveTab(tabKey);
    setCurrentPage(1);
  };

  // ═══════════════════════════════════════════════════════════
  // Hủy lịch: KHÔNG gọi API ngay khi click
  // Phải mở Modal Confirm trước, user bấm "Đồng ý" mới gọi API
  // ═══════════════════════════════════════════════════════════
  const handleOpenCancelModal = (bookingId) => {
    setCancelModal({ isOpen: true, bookingId, isCancelling: false });
  };

  const handleCloseCancelModal = () => {
    setCancelModal({ isOpen: false, bookingId: null, isCancelling: false });
  };

  const handleConfirmCancel = async () => {
    setCancelModal((prev) => ({ ...prev, isCancelling: true }));
    try {
      const result = await cancelBooking(cancelModal.bookingId);
      if (result.errCode === 0) {
        toast.success(intl.formatMessage({ id: 'patient-portal.appointments.cancel-success' }));
        // Fetch lại danh sách sau khi hủy thành công
        fetchBookings();
      } else {
        toast.error(result.message || intl.formatMessage({ id: 'patient-portal.appointments.cancel-error' }));
      }
    } catch {
      toast.error(intl.formatMessage({ id: 'auth.common.system-error' }));
    } finally {
      handleCloseCancelModal();
    }
  };

  // Render status badge
  const renderStatusBadge = (statusId) => {
    const statusMap = {
      S1: { id: 'patient-portal.appointments.status-new', cls: 'badge--new' },
      S2: { id: 'patient-portal.appointments.status-confirmed', cls: 'badge--confirmed' },
      S3: { id: 'patient-portal.appointments.status-done', cls: 'badge--done' },
      S4: { id: 'patient-portal.appointments.status-cancelled', cls: 'badge--cancelled' },
    };
    const s = statusMap[statusId] || { id: 'common.no-data', cls: '' };
    return <span className={`status-badge ${s.cls}`}><FormattedMessage id={s.id} /></span>;
  };

  return (
    <div className="appointment-history">
      <h2 className="page-title">
        <i className="fas fa-calendar-check" /> <FormattedMessage id="patient-portal.appointments.title" />
      </h2>

      {/* ===== 3 TABS ===== */}
      <div className="tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => handleChangeTab(tab.key)}
          >
            <i className={`fas ${tab.icon}`} />
            <FormattedMessage id={`patient-portal.appointments.tab-${tab.key}`} />
          </button>
        ))}
      </div>

      {/* ===== TABLE ===== */}
      {isLoading ? (
        <div className="loading-state">
          <i className="fas fa-spinner fa-spin" /> <FormattedMessage id="common.loading" />
        </div>
      ) : bookings.length === 0 ? (
        <div className="empty-state">
          <i className="fas fa-inbox" />
          <p><FormattedMessage id="patient-portal.appointments.no-data" /></p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="booking-table">
            <thead>
              <tr>
                <th>#</th>
                <th><FormattedMessage id="patient-portal.appointments.col-doctor" /></th>
                <th><FormattedMessage id="patient-portal.appointments.col-date" /></th>
                <th><FormattedMessage id="patient-portal.appointments.col-time" /></th>
                <th><FormattedMessage id="patient-portal.appointments.col-reason" /></th>
                <th><FormattedMessage id="patient-portal.appointments.col-status" /></th>
                <th><FormattedMessage id="patient-portal.appointments.col-actions" /></th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b, idx) => {
                // Hiển thị tên bác sĩ từ association
                const doctorName = b.doctorData
                  ? `${b.doctorData.lastName || ''} ${b.doctorData.firstName || ''}`.trim()
                  : `#${b.doctorId}`;

                // Hiển thị khung giờ từ timeTypeData
                const timeSlot = b.timeTypeData
                  ? (language === LANGUAGES.VI ? b.timeTypeData.valueVi : b.timeTypeData.valueEn)
                  : b.timeType;

                // Format ngày khám
                const dateStr = b.date
                  ? moment(parseInt(b.date, 10)).format(language === LANGUAGES.VI ? 'DD/MM/YYYY' : 'MM/DD/YYYY')
                  : '--';

                return (
                  <tr key={b.id || idx}>
                    <td>{(currentPage - 1) * PAGE_SIZE + idx + 1}</td>
                    <td className="td-doctor">{doctorName}</td>
                    <td>{dateStr}</td>
                    <td>{timeSlot}</td>
                    <td className="td-reason">{b.reason || '--'}</td>
                    <td>{renderStatusBadge(b.statusId)}</td>
                    <td className="td-actions">
                      {/* Tab Sắp tới: Nút Hủy lịch */}
                      {activeTab === 'upcoming' && (b.statusId === 'S1' || b.statusId === 'S2') && (
                        <button
                          className="action-btn action-btn--cancel"
                          onClick={() => handleOpenCancelModal(b.id)}
                        >
                          <i className="fas fa-ban" />
                          <FormattedMessage id="patient-portal.appointments.btn-cancel" />
                        </button>
                      )}

                      {/* Tab Đã khám: Nút Đánh giá (ẨN nếu isReviewed === true) */}
                      {activeTab === 'done' && b.statusId === 'S3' && (
                        b.isReviewed ? (
                          <span className="reviewed-badge">
                            <i className="fas fa-check" /> <FormattedMessage id="patient-portal.appointments.reviewed" />
                          </span>
                        ) : (
                          <button
                            className="action-btn action-btn--review"
                            onClick={() => setRatingModal({
                              isOpen: true,
                              bookingData: { bookingId: b.id, doctorId: b.doctorId },
                            })}
                          >
                            <i className="fas fa-star" />
                            <FormattedMessage id="patient-portal.appointments.btn-review" />
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ===== PAGINATION ===== */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="page-btn"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => p - 1)}
          >
            <i className="fas fa-chevron-left" /> <FormattedMessage id="patient-portal.appointments.prev-page" />
          </button>
          <span className="page-info">{currentPage} / {totalPages}</span>
          <button
            className="page-btn"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
          >
            <FormattedMessage id="patient-portal.appointments.next-page" /> <i className="fas fa-chevron-right" />
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          MODAL CONFIRM HỦY LỊCH
          KHÔNG gọi API khi click nút Hủy → phải qua modal này
      ═══════════════════════════════════════════════════════════ */}
      {cancelModal.isOpen && (
        <div className="modal-overlay" onClick={handleCloseCancelModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">
              <i className="fas fa-exclamation-triangle" />
              <FormattedMessage id="patient-portal.appointments.cancel-confirm-title" />
            </h3>
            <p className="modal-message">
              <FormattedMessage id="patient-portal.appointments.cancel-confirm-msg" />
            </p>
            <div className="modal-actions">
              <button
                className="modal-btn modal-btn--cancel"
                onClick={handleCloseCancelModal}
                disabled={cancelModal.isCancelling}
              >
                <FormattedMessage id="patient-portal.appointments.btn-close" />
              </button>
              <button
                className="modal-btn modal-btn--confirm"
                onClick={handleConfirmCancel}
                disabled={cancelModal.isCancelling}
              >
                {cancelModal.isCancelling ? (
                  <><i className="fas fa-spinner fa-spin" /> ...</>
                ) : (
                  <FormattedMessage id="patient-portal.appointments.btn-agree" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          [Phase 9.6] RATING MODAL — Đánh giá bác sĩ
          Khi onSuccess → fetchBookings() lại để ẩn nút Đánh giá
      ═══════════════════════════════════════════════════════════ */}
      <RatingModal
        isOpen={ratingModal.isOpen}
        onClose={() => setRatingModal({ isOpen: false, bookingData: null })}
        bookingData={ratingModal.bookingData}
        onSuccess={() => fetchBookings()}
      />
    </div>
  );
};

export default AppointmentHistory;
