// src/containers/PatientPortal/AppointmentHistory.jsx
// [Redesign] Quản lý Lịch Khám Bệnh Nhân — Unified Design System BookingCare
// Chế độ xem: Thẻ lịch hẹn (Appointment Cards) mặc định + Bảng dữ liệu hiện đại
// Modal: Chi tiết lịch khám phân cấp 2 khối chuẩn y tế (Lịch hẹn -> Lâm sàng)
import React, { useState, useEffect, useCallback } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';
import moment from 'moment';
import 'moment/locale/vi';

import {
  getPatientBookings,
  cancelBooking,
  getBookingAttachments,
  uploadBookingAttachment,
  downloadBookingAttachment,
  deleteBookingAttachment,
} from '../../services/patientService';
import { LANGUAGES, path } from '../../utils/constants';
import CommonUtils from '../../utils/CommonUtils';
import RatingModal from './RatingModal';
import AppointmentQrModal from './AppointmentQrModal';
import './AppointmentHistory.scss';

// Bộ lọc trạng thái
const TABS = [
  { key: 'all',       status: '',      labelVi: 'Tất cả',     labelEn: 'All' },
  { key: 'upcoming',  status: 'S1,S2', labelVi: 'Sắp tới',    labelEn: 'Upcoming' },
  { key: 'done',      status: 'S3',    labelVi: 'Đã khám',    labelEn: 'Completed' },
  { key: 'cancelled', status: 'S4',    labelVi: 'Đã hủy',     labelEn: 'Cancelled' },
];

const PAGE_SIZE = 6;

const AppointmentHistory = () => {
  const intl = useIntl();
  const language = useSelector((state) => state.app.language);

  // State
  const [activeTab, setActiveTab]       = useState('upcoming');
  const [viewMode, setViewMode]         = useState('cards'); // 'cards' | 'table'
  const [bookings, setBookings]         = useState([]);
  const [totalPages, setTotalPages]     = useState(1);
  const [totalItems, setTotalItems]     = useState(0);
  const [currentPage, setCurrentPage]   = useState(1);
  const [isLoading, setIsLoading]       = useState(false);

  // Modals state
  const [cancelModal, setCancelModal]   = useState({ isOpen: false, bookingId: null, booking: null, isCancelling: false });
  const [ratingModal, setRatingModal]   = useState({ isOpen: false, bookingData: null });
  const [detailBooking, setDetailBooking] = useState(null);
  const [showQrModal, setShowQrModal]   = useState(false);

  // Attachments state
  const [attachmentsList, setAttachmentsList] = useState([]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const fileInputRef = React.useRef(null);

  // Sync attachments khi mở detailBooking
  useEffect(() => {
    if (detailBooking) {
      if (detailBooking.attachments && Array.isArray(detailBooking.attachments)) {
        setAttachmentsList(detailBooking.attachments);
      } else {
        setAttachmentsList([]);
      }
      getBookingAttachments(detailBooking.id)
        .then((res) => {
          if (res && res.errCode === 0 && res.data) {
            setAttachmentsList(res.data);
          }
        })
        .catch(() => {});
    } else {
      setAttachmentsList([]);
    }
  }, [detailBooking]);

  const formatFileSize = (bytes) => {
    if (!bytes || bytes <= 0) return '0 KB';
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    return `${Math.round(bytes / 1024)} KB`;
  };

  const getFileTypeLabel = (type) => {
    if (!type) return 'FILE';
    if (type.includes('pdf')) return 'PDF';
    if (type.includes('image')) return 'IMG';
    return 'FILE';
  };

  const getFileTypeClass = (type) => {
    if (!type) return '';
    if (type.includes('pdf')) return 'att-type-pill--pdf';
    if (type.includes('image')) return 'att-type-pill--img';
    return '';
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !detailBooking) return;
    e.target.value = '';

    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      toast.error('Dung lượng tệp vượt quá giới hạn 10 MB!');
      return;
    }

    const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!ALLOWED_TYPES.includes(file.type.toLowerCase())) {
      toast.error('Chỉ chấp nhận các tệp định dạng PDF, JPG, PNG, WEBP!');
      return;
    }

    setIsUploadingAttachment(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = reader.result;
        const res = await uploadBookingAttachment(detailBooking.id, {
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          fileData: base64Data,
        });

        if (res && res.errCode === 0) {
          toast.success('Đính kèm tài liệu thành công!');
          if (res.data) {
            setAttachmentsList((prev) => [res.data, ...prev]);
          }
        } else {
          toast.error(res?.message || 'Không thể tải lên tài liệu!');
        }
      } catch (err) {
        toast.error('Lỗi khi tải lên tài liệu!');
      } finally {
        setIsUploadingAttachment(false);
      }
    };
    reader.onerror = () => {
      toast.error('Lỗi khi đọc tệp từ máy tính!');
      setIsUploadingAttachment(false);
    };
    reader.readAsDataURL(file);
  };

  const handleViewAttachment = async (att) => {
    try {
      const res = await downloadBookingAttachment(detailBooking.id, att.id, 'inline');
      const blob = new Blob([res], { type: att.fileType });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
    } catch (err) {
      toast.error('Không thể mở tệp xem trước!');
    }
  };

  const handleDownloadAttachment = async (att) => {
    try {
      const res = await downloadBookingAttachment(detailBooking.id, att.id, 'attachment');
      const blob = new Blob([res], { type: att.fileType });
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = att.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      toast.error('Không thể tải xuống tệp!');
    }
  };

  const handleDeleteAttachment = async (attachmentId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa tài liệu này không?')) return;
    try {
      const res = await deleteBookingAttachment(detailBooking.id, attachmentId);
      if (res && res.errCode === 0) {
        toast.success('Đã xóa tệp đính kèm!');
        setAttachmentsList((prev) => prev.filter((a) => a.id !== attachmentId));
      } else {
        toast.error(res?.message || 'Không thể xóa tệp!');
      }
    } catch (err) {
      toast.error('Lỗi khi xóa tệp!');
    }
  };

  // Fetch bookings
  const fetchBookings = useCallback(async () => {
    setIsLoading(true);
    try {
      const tabConfig = TABS.find((t) => t.key === activeTab) || TABS[0];
      const params = {
        page: currentPage,
        limit: PAGE_SIZE,
      };
      if (tabConfig.status) {
        params.status = tabConfig.status;
      }

      const result = await getPatientBookings(params);
      if (result && result.errCode === 0) {
        const list = result.data?.data || result.data || [];
        setBookings(list);
        setTotalPages(result.pagination?.totalPages || result.data?.pagination?.totalPages || 1);
        setTotalItems(result.pagination?.totalItems || result.data?.pagination?.totalItems || list.length);
      } else {
        setBookings([]);
        setTotalPages(1);
        setTotalItems(0);
      }
    } catch (err) {
      console.error('Failed to fetch patient bookings:', err);
      setBookings([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, currentPage]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const handleChangeTab = (tabKey) => {
    setActiveTab(tabKey);
    setCurrentPage(1);
  };

  // Hủy lịch
  const handleOpenCancelModal = (bookingOrId) => {
    const bookingObj = typeof bookingOrId === 'object'
      ? bookingOrId
      : bookings.find((b) => b.id === bookingOrId) || (detailBooking?.id === bookingOrId ? detailBooking : null);
    setCancelModal({
      isOpen: true,
      bookingId: bookingObj?.id || bookingOrId,
      booking: bookingObj,
      isCancelling: false,
    });
  };

  const handleCloseCancelModal = () => {
    setCancelModal({ isOpen: false, bookingId: null, booking: null, isCancelling: false });
  };

  const handleConfirmCancel = async () => {
    if (!cancelModal.bookingId) return;
    setCancelModal((prev) => ({ ...prev, isCancelling: true }));
    try {
      const result = await cancelBooking(cancelModal.bookingId);
      if (result.errCode === 0) {
        toast.success(result.message || intl.formatMessage({ id: 'patient-portal.appointments.cancel-success' }, { defaultMessage: 'Hủy lịch khám thành công!' }));
        handleCloseCancelModal();
        if (detailBooking && detailBooking.id === cancelModal.bookingId) {
          setDetailBooking(null);
        }
        fetchBookings();
      } else {
        toast.error(result.message || 'Hủy lịch thất bại');
        setCancelModal((prev) => ({ ...prev, isCancelling: false }));
      }
    } catch {
      toast.error('Có lỗi xảy ra khi kết nối');
      setCancelModal((prev) => ({ ...prev, isCancelling: false }));
    }
  };

  // Helper: Format ngày tạo lịch (createdAt)
  const formatCreatedAt = (dateStr) => {
    if (!dateStr) return '--';
    const m = moment(dateStr);
    if (!m.isValid()) return '--';
    return m.format('DD/MM/YYYY HH:mm');
  };

  // Helper: Tính toán thời gian từ lúc đặt tới lúc hủy và ước tính hoàn tiền
  const getRefundEstimate = (booking) => {
    if (!booking) return { hours: 0, rate: 100, amount: 0, price: 0 };
    const created = booking.createdAt ? new Date(booking.createdAt).getTime() : Date.now();
    const now = Date.now();
    const hours = Math.max(0, Math.round((now - created) / (1000 * 60 * 60)));
    let rate = 100;
    if (hours <= 24) {
      rate = 100;
    } else if (hours <= 72) {
      rate = 75;
    } else {
      rate = 50;
    }
    const price = parseInt(booking.bookingPrice, 10) || 0;
    const amount = Math.round((price * rate) / 100);
    return { hours, rate, amount, price };
  };

  // Helper: Format Date chuẩn xác (tránh hiển thị raw timestamp)
  const formatDateTime = (rawDate, timeTypeBooking, isDetailed = false) => {
    if (!rawDate) return '--';
    const num = parseInt(rawDate, 10);
    const m = isNaN(num) ? moment(rawDate) : moment(num);
    
    if (language === LANGUAGES.VI) {
      m.locale('vi');
      const dateFormatted = m.isValid() ? m.format('DD/MM/YYYY') : rawDate;
      const dayOfWeek = m.isValid() ? m.format('dddd') : '';
      const timeSlot = timeTypeBooking?.valueVi || '';
      if (isDetailed) {
        return `${timeSlot ? timeSlot + ' · ' : ''}${dayOfWeek ? dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1) + ', ' : ''}${dateFormatted}`;
      }
      return dateFormatted;
    } else {
      m.locale('en');
      const dateFormatted = m.isValid() ? m.format('MM/DD/YYYY') : rawDate;
      const dayOfWeek = m.isValid() ? m.format('dddd') : '';
      const timeSlot = timeTypeBooking?.valueEn || '';
      if (isDetailed) {
        return `${timeSlot ? timeSlot + ' · ' : ''}${dayOfWeek ? dayOfWeek + ', ' : ''}${dateFormatted}`;
      }
      return dateFormatted;
    }
  };

  const getTimeSlot = (b) => {
    if (b?.timeTypeBooking) {
      return language === LANGUAGES.VI ? b.timeTypeBooking.valueVi : b.timeTypeBooking.valueEn;
    }
    return b?.timeType || '--';
  };

  const getDoctorName = (b) => {
    const doc = b?.doctorBookingData;
    if (!doc) return `#${b.doctorId}`;
    const prefix = language === LANGUAGES.VI ? 'BS. ' : 'Dr. ';
    return `${prefix}${doc.lastName || ''} ${doc.firstName || ''}`.trim();
  };

  const getPositionName = (b) => {
    const pos = b?.doctorBookingData?.positionData;
    if (!pos) return '';
    return language === LANGUAGES.VI ? pos.valueVi : pos.valueEn;
  };

  const getSpecialtyName = (b) => {
    return b?.doctorBookingData?.doctorInfoData?.specialtyData?.name || '';
  };

  const getClinicName = (b) => {
    return b?.doctorBookingData?.doctorInfoData?.clinicData?.name || '';
  };

  const getClinicAddress = (b) => {
    return b?.doctorBookingData?.doctorInfoData?.clinicData?.address || '';
  };

  // Render Status Badge
  const renderStatusBadge = (statusId) => {
    switch (statusId) {
      case 'S1':
        return (
          <span className="appt-badge appt-badge--pending">
            <span className="badge-dot" />
            <FormattedMessage id="patient-portal.appointments.status-s1" defaultMessage="Chờ xác nhận" />
          </span>
        );
      case 'S2':
        return (
          <span className="appt-badge appt-badge--confirmed">
            <span className="badge-dot" />
            <FormattedMessage id="patient-portal.appointments.status-s2" defaultMessage="Đã xác nhận" />
          </span>
        );
      case 'S3':
        return (
          <span className="appt-badge appt-badge--done">
            <span className="badge-dot" />
            <FormattedMessage id="patient-portal.appointments.status-s3" defaultMessage="Đã khám" />
          </span>
        );
      case 'S4':
        return (
          <span className="appt-badge appt-badge--cancelled">
            <span className="badge-dot" />
            <FormattedMessage id="patient-portal.appointments.status-s4" defaultMessage="Đã hủy" />
          </span>
        );
      default:
        return <span className="appt-badge appt-badge--default">{statusId}</span>;
    }
  };

  // Render Payment Badge
  const renderPaymentBadge = (paymentStatus) => {
    if (!paymentStatus || paymentStatus === 'unpaid') {
      return <span className="payment-tag payment-tag--unpaid">Chưa thanh toán</span>;
    }
    if (paymentStatus === 'paid') {
      return <span className="payment-tag payment-tag--paid">Đã thanh toán (VNPay)</span>;
    }
    if (paymentStatus === 'refund_pending') {
      return <span className="payment-tag payment-tag--refund-pending">Chờ hoàn tiền</span>;
    }
    if (paymentStatus === 'refunded') {
      return <span className="payment-tag payment-tag--refunded">Đã hoàn tiền</span>;
    }
    return <span className="payment-tag">{paymentStatus}</span>;
  };

  return (
    <div className="appointment-history-page">
      {/* ===== HEADER BAR ===== */}
      <div className="ah-header-bar">
        <div className="ah-title-wrap">
          <h2>Lịch khám của tôi</h2>
          <p>Quản lý các lịch khám đã đặt và theo dõi trạng thái khám bệnh.</p>
        </div>

        <div className="ah-header-actions">
          {/* Chế độ xem: Cards / Table */}
          <div className="view-mode-toggle">
            <button
              type="button"
              className={`btn-toggle-view ${viewMode === 'cards' ? 'active' : ''}`}
              onClick={() => setViewMode('cards')}
              title="Xem dạng thẻ"
            >
              <i className="fas fa-th-large" /> Thẻ
            </button>
            <button
              type="button"
              className={`btn-toggle-view ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              title="Xem dạng bảng"
            >
              <i className="fas fa-list" /> Bảng
            </button>
          </div>

          <Link to={path.DOCTOR_LIST} className="btn-new-appointment">
            <i className="fas fa-plus" /> Đặt lịch mới
          </Link>
        </div>
      </div>

      {/* ===== FILTER TABS ===== */}
      <div className="ah-filter-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => handleChangeTab(tab.key)}
          >
            {language === LANGUAGES.VI ? tab.labelVi : tab.labelEn}
          </button>
        ))}
      </div>

      {/* ===== CONTENT LIST ===== */}
      {isLoading ? (
        <div className="ah-loading-box">
          <i className="fas fa-spinner fa-spin" /> Đang tải danh sách lịch khám...
        </div>
      ) : bookings.length === 0 ? (
        <div className="ah-empty-state">
          <div className="empty-icon-wrap">
            <i className="far fa-calendar-check" />
          </div>
          <h4>Chưa có lịch khám nào trong mục này</h4>
          <p>Lịch khám của bạn sẽ xuất hiện tại đây sau khi bạn hoàn tất đặt lịch.</p>
          <Link to={path.DOCTOR_LIST} className="btn-empty-book">
            <i className="fas fa-search" /> Tìm bác sĩ đặt lịch
          </Link>
        </div>
      ) : viewMode === 'cards' ? (
        /* ===== CHẾ ĐỘ THẺ (APPOINTMENT CARDS) ===== */
        <div className="ah-cards-grid">
          {bookings.map((b) => {
            const specialtyName = getSpecialtyName(b);
            const clinicName = getClinicName(b);
            const clinicAddress = getClinicAddress(b);
            const pos = getPositionName(b);

            return (
              <div key={b.id} className={`appointment-card card-status--${b.statusId?.toLowerCase()}`}>
                {/* Header Card */}
                <div className="card-top-bar">
                  <div className="badge-group">
                    {renderStatusBadge(b.statusId)}
                    {b.paymentStatus && renderPaymentBadge(b.paymentStatus)}
                  </div>
                  <span className="booking-code">#BK-{b.id}</span>
                </div>

                {/* Doctor Info */}
                <div className="card-doctor-info">
                  <div className="doctor-avatar-circle">
                    {b.doctorBookingData?.image ? (
                      <img src={CommonUtils.decodeBase64Image(b.doctorBookingData.image)} alt="Doctor" />
                    ) : (
                      <i className="fas fa-user-md" />
                    )}
                  </div>
                  <div className="doctor-text-details">
                    <h4 className="doctor-name">{getDoctorName(b)}</h4>
                    {pos && <span className="doctor-position">{pos}</span>}
                    {specialtyName && (
                      <span className="doctor-specialty-tag">
                        <i className="fas fa-stethoscope" /> {specialtyName}
                      </span>
                    )}
                  </div>
                </div>

                {/* Facility & Location */}
                {clinicName && (
                  <div className="card-facility-row">
                    <i className="fas fa-hospital-alt" />
                    <div className="facility-text">
                      <strong className="facility-name">{clinicName}</strong>
                      {clinicAddress && <span className="facility-address">{clinicAddress}</span>}
                    </div>
                  </div>
                )}

                {/* Appointment Time Box */}
                <div className="card-time-box">
                  <div className="time-item">
                    <span className="time-label">Ngày khám:</span>
                    <span className="time-val font-semibold">{formatDateTime(b.date, b.timeTypeBooking)}</span>
                  </div>
                  <div className="time-item">
                    <span className="time-label">Khung giờ:</span>
                    <span className="time-val text-primary font-bold">{getTimeSlot(b)}</span>
                  </div>
                  <div className="time-item">
                    <span className="time-label">Ngày đặt:</span>
                    <span className="time-val text-slate-500 font-medium">{formatCreatedAt(b.createdAt)}</span>
                  </div>
                  {b.statusId === 'S4' && b.refundRate > 0 && (
                    <div className="time-item">
                      <span className="time-label">Hoàn tiền:</span>
                      <span className="time-val text-emerald-600 font-semibold">
                        {b.refundRate}% ({CommonUtils.formatCurrency(b.refundAmount)} ₫)
                      </span>
                    </div>
                  )}
                  {b.reason && (
                    <div className="reason-item">
                      <span className="time-label">Lý do khám:</span>
                      <span className="reason-text">{b.reason}</span>
                    </div>
                  )}
                </div>

                {/* Footer Action Buttons */}
                <div className="card-actions-footer">
                  <button
                    type="button"
                    className="btn-card-action btn-card-detail"
                    onClick={() => setDetailBooking(b)}
                  >
                    <i className="far fa-file-alt" /> Xem chi tiết
                  </button>

                  {/* Nút hủy: chỉ hiện khi S1 hoặc S2 */}
                  {(b.statusId === 'S1' || b.statusId === 'S2') && (
                    <button
                      type="button"
                      className="btn-card-action btn-card-cancel"
                      onClick={() => handleOpenCancelModal(b)}
                    >
                      <i className="fas fa-ban" /> Hủy lịch
                    </button>
                  )}

                  {/* Nút đánh giá: chỉ hiện khi S3 */}
                  {b.statusId === 'S3' && (
                    b.isReviewed ? (
                      <span className="reviewed-badge">
                        <i className="fas fa-check" /> Đã đánh giá
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="btn-card-action btn-card-review"
                        onClick={() => setRatingModal({
                          isOpen: true,
                          bookingData: { bookingId: b.id, doctorId: b.doctorId },
                        })}
                      >
                        <i className="fas fa-star" /> Đánh giá bác sĩ
                      </button>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ===== CHẾ ĐỘ BẢNG (TABLE VIEW) ===== */
        <div className="ah-table-container">
          <table className="ah-modern-table">
            <thead>
              <tr>
                <th>Mã</th>
                <th>Bác sĩ</th>
                <th>Chuyên khoa & Cơ sở</th>
                <th>Thời gian</th>
                <th>Ngày đặt</th>
                <th>Trạng thái</th>
                <th className="text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id}>
                  <td className="font-mono text-muted">#BK-{b.id}</td>
                  <td>
                    <div className="table-doc-cell">
                      <strong>{getDoctorName(b)}</strong>
                      {getPositionName(b) && <small>{getPositionName(b)}</small>}
                    </div>
                  </td>
                  <td>
                    <div className="table-facility-cell">
                      <span>{getSpecialtyName(b) || '--'}</span>
                      <small>{getClinicName(b) || ''}</small>
                    </div>
                  </td>
                  <td>
                    <div className="table-time-cell">
                      <span className="time-badge">{getTimeSlot(b)}</span>
                      <span>{formatDateTime(b.date, b.timeTypeBooking)}</span>
                    </div>
                  </td>
                  <td className="text-xs text-slate-500 font-mono">
                    {formatCreatedAt(b.createdAt)}
                  </td>
                  <td>{renderStatusBadge(b.statusId)}</td>
                  <td className="text-right">
                    <div className="table-actions-cell">
                      <button
                        type="button"
                        className="btn-tbl-detail"
                        onClick={() => setDetailBooking(b)}
                        title="Xem chi tiết"
                      >
                        Chi tiết
                      </button>
                      {(b.statusId === 'S1' || b.statusId === 'S2') && (
                        <button
                          type="button"
                          className="btn-tbl-cancel"
                          onClick={() => handleOpenCancelModal(b)}
                          title="Hủy lịch"
                        >
                          Hủy
                        </button>
                      )}
                      {b.statusId === 'S3' && !b.isReviewed && (
                        <button
                          type="button"
                          className="btn-tbl-review"
                          onClick={() => setRatingModal({
                            isOpen: true,
                            bookingData: { bookingId: b.id, doctorId: b.doctorId },
                          })}
                          title="Đánh giá"
                        >
                          Đánh giá
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ===== PHÂN TRANG (PAGINATION) ===== */}
      {totalPages > 1 && (
        <div className="ah-pagination-bar">
          <button
            type="button"
            className="btn-page-nav"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => p - 1)}
          >
            <i className="fas fa-chevron-left" /> Trang trước
          </button>
          <span className="page-indicator">
            Trang {currentPage} / {totalPages} (Tổng {totalItems} lịch hẹn)
          </span>
          <button
            type="button"
            className="btn-page-nav"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
          >
            Trang sau <i className="fas fa-chevron-right" />
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          MODAL: CHI TIẾT LỊCH KHÁM (REDESIGN CHUẨN Y TẾ)
      ═══════════════════════════════════════════════════════════ */}
      {detailBooking && (
        <div className="detail-modal-overlay" onClick={() => setDetailBooking(null)}>
          <div className="detail-modal-card" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="modal-top-header">
              <div className="modal-header-titles">
                <h3>Chi tiết lịch khám</h3>
                <div className="modal-ref-strip">
                  <span className="modal-booking-id">Mã lịch hẹn: <strong>#BK-{detailBooking.id}</strong></span>
                  <button
                    type="button"
                    className="btn-modal-qr"
                    onClick={() => setShowQrModal(true)}
                    title="Xem mã QR tiếp nhận khám bệnh"
                  >
                    <i className="fas fa-qrcode" />
                    <span>Mã QR</span>
                  </button>
                </div>
              </div>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setDetailBooking(null)}
                title="Đóng"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="modal-scroll-body">
              {/* Status Header Strip */}
              <div className="status-summary-strip">
                <div className="strip-item">
                  <span className="strip-label">Trạng thái khám:</span>
                  {renderStatusBadge(detailBooking.statusId)}
                </div>
                <div className="strip-item">
                  <span className="strip-label">Thanh toán:</span>
                  {renderPaymentBadge(detailBooking.paymentStatus)}
                </div>
              </div>

              {/* ═════ KHỐI 1: THÔNG TIN LỊCH HẸN ═════ */}
              <div className="detail-section-block">
                <div className="block-title">
                  <i className="fas fa-calendar-alt block-icon" />
                  <h4>Thông tin lịch hẹn</h4>
                </div>

                <div className="info-fields-grid">
                  {detailBooking.reason && (
                    <div className="field-item full-width">
                      <span className="field-label">Lý do khám đăng ký:</span>
                      <p className="field-reason-box">{detailBooking.reason}</p>
                    </div>
                  )}

                  <div className="field-item">
                    <span className="field-label">Bác sĩ phụ trách:</span>
                    <strong className="field-value text-dark">{getDoctorName(detailBooking)}</strong>
                    {getPositionName(detailBooking) && <small className="field-sub">{getPositionName(detailBooking)}</small>}
                  </div>

                  <div className="field-item">
                    <span className="field-label">Chuyên khoa:</span>
                    <span className="field-value text-teal font-semibold">
                      {getSpecialtyName(detailBooking) || 'Khám chuyên khoa'}
                    </span>
                  </div>

                  <div className="field-item full-width">
                    <span className="field-label">Cơ sở y tế & Địa điểm:</span>
                    <strong className="field-value">{getClinicName(detailBooking) || 'Phòng khám / Bệnh viện đối tác'}</strong>
                    {getClinicAddress(detailBooking) && (
                      <span className="field-sub location-sub">
                        <i className="fas fa-map-marker-alt" /> {getClinicAddress(detailBooking)}
                      </span>
                    )}
                  </div>

                  <div className="field-item">
                    <span className="field-label">Thời gian hẹn khám:</span>
                    <strong className="field-value text-primary">
                      {formatDateTime(detailBooking.date, detailBooking.timeTypeBooking, true)}
                    </strong>
                  </div>

                  <div className="field-item">
                    <span className="field-label">Ngày đặt lịch:</span>
                    <span className="field-value text-slate-700 font-medium">
                      {formatCreatedAt(detailBooking.createdAt)}
                    </span>
                  </div>

                  {detailBooking.statusId === 'S4' && (
                    <>
                      <div className="field-item">
                        <span className="field-label">Thời điểm hủy:</span>
                        <span className="field-value text-rose-600 font-medium">
                          {formatCreatedAt(detailBooking.cancelledAt || detailBooking.updatedAt)}
                        </span>
                      </div>
                      <div className="field-item">
                        <span className="field-label">Chính sách hoàn tiền:</span>
                        <span className="field-value text-emerald-600 font-semibold">
                          {detailBooking.refundRate
                            ? `${detailBooking.refundRate}% · ${CommonUtils.formatCurrency(detailBooking.refundAmount)} ₫ (${detailBooking.refundStatus === 'done' ? 'Đã hoàn tiền' : 'Đang xử lý'})`
                            : 'Không áp dụng hoàn tiền'}
                        </span>
                      </div>
                    </>
                  )}

                  <div className="field-item">
                    <span className="field-label">Bệnh nhân đặt khám:</span>
                    <span className="field-value">{detailBooking.patientName || '--'}</span>
                  </div>
                </div>
              </div>

              {/* ═════ KHỐI 2: TÀI LIỆU ĐÍNH KÈM Y TẾ ═════ */}
              <div className="detail-section-block">
                <div className="block-title block-title--split">
                  <div className="title-left">
                    <i className="fas fa-paperclip block-icon" />
                    <h4>Tài liệu đính kèm</h4>
                  </div>
                  {attachmentsList && attachmentsList.length > 0 && attachmentsList.length < 5 && detailBooking.statusId !== 'S3' && detailBooking.statusId !== 'S4' && (
                    <button
                      type="button"
                      className="btn-add-more-att"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingAttachment}
                    >
                      <i className="fas fa-plus" /> Thêm tệp
                    </button>
                  )}
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                  onChange={handleFileSelect}
                />

                {isUploadingAttachment && (
                  <div className="att-uploading-bar">
                    <i className="fas fa-spinner fa-spin" /> Đang tải lên tài liệu...
                  </div>
                )}

                {attachmentsList && attachmentsList.length > 0 ? (
                  <div className="attachments-list">
                    {attachmentsList.map((att) => (
                      <div className="att-item-row" key={att.id}>
                        <div className="att-info-main">
                          <span className={`att-type-pill ${getFileTypeClass(att.fileType)}`}>
                            {getFileTypeLabel(att.fileType)}
                          </span>
                          <div className="att-texts">
                            <span className="att-name" title={att.fileName}>{att.fileName}</span>
                            <span className="att-meta">
                              {formatFileSize(att.fileSize)} • {att.createdAt ? moment(att.createdAt).format('DD/MM/YYYY HH:mm') : ''}
                            </span>
                          </div>
                        </div>
                        <div className="att-actions">
                          <button
                            type="button"
                            className="btn-att-action"
                            onClick={() => handleViewAttachment(att)}
                            title="Xem tệp"
                          >
                            Xem
                          </button>
                          <button
                            type="button"
                            className="btn-att-action"
                            onClick={() => handleDownloadAttachment(att)}
                            title="Tải xuống tệp"
                          >
                            Tải xuống
                          </button>
                          {detailBooking.statusId !== 'S3' && detailBooking.statusId !== 'S4' && (
                            <button
                              type="button"
                              className="btn-att-action btn-att-action--delete"
                              onClick={() => handleDeleteAttachment(att.id)}
                              title="Xóa tệp"
                            >
                              Xóa
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="attachments-empty-state">
                    <p className="empty-text">Chưa có tài liệu được đính kèm cho lịch khám này.</p>
                    {detailBooking.statusId !== 'S3' && detailBooking.statusId !== 'S4' ? (
                      <div className="empty-action-wrap">
                        <button
                          type="button"
                          className="btn-att-upload-primary"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploadingAttachment}
                        >
                          <i className="fas fa-plus" /> Thêm tài liệu
                        </button>
                        <span className="upload-hint">
                          Hỗ trợ định dạng PDF, JPG, PNG, WEBP • Tối đa 10 MB/tệp
                        </span>
                      </div>
                    ) : (
                      <span className="upload-hint">Lịch khám đã hoàn tất hoặc đã hủy, không thể bổ sung thêm tệp.</span>
                    )}
                  </div>
                )}
              </div>

              {/* ═════ KHỐI 3: THÔNG TIN KHÁM BỆNH & LÂM SÀNG ═════ */}
              <div className="detail-section-block">
                <div className="block-title">
                  <i className="fas fa-notes-medical block-icon" />
                  <h4>Thông tin khám bệnh & Kết quả lâm sàng</h4>
                </div>

                <div className="medical-fields-stack">
                  <div className="med-row">
                    <span className="med-label">Triệu chứng bệnh nhân báo:</span>
                    <div className="med-content">
                      {detailBooking.symptoms ? (
                        <p>{detailBooking.symptoms}</p>
                      ) : (
                        <span className="text-muted-italic">Chưa có thông tin ghi nhận</span>
                      )}
                    </div>
                  </div>

                  <div className="med-row">
                    <span className="med-label">Ghi chú lâm sàng của bác sĩ:</span>
                    <div className="med-content">
                      {detailBooking.clinicalNotes ? (
                        <p>{detailBooking.clinicalNotes}</p>
                      ) : (
                        <span className="text-muted-italic">Chưa có thông tin ghi nhận</span>
                      )}
                    </div>
                  </div>

                  <div className="med-row">
                    <span className="med-label">Chẩn đoán y khoa:</span>
                    <div className="med-content highlight-diagnosis">
                      {detailBooking.diagnosis ? (
                        <strong>{detailBooking.diagnosis}</strong>
                      ) : (
                        <span className="text-muted-italic">Chưa có kết luận chẩn đoán</span>
                      )}
                    </div>
                  </div>

                  {/* Đơn thuốc */}
                  <div className="med-row">
                    <span className="med-label">Đơn thuốc chỉ định:</span>
                    <div className="med-content">
                      {detailBooking.bookingMedicines && detailBooking.bookingMedicines.length > 0 ? (
                        <table className="prescription-table">
                          <thead>
                            <tr>
                              <th>Tên thuốc</th>
                              <th>Số lượng</th>
                              <th>Liều dùng & Hướng dẫn</th>
                            </tr>
                          </thead>
                          <tbody>
                            {detailBooking.bookingMedicines.map((bm) => (
                              <tr key={bm.id}>
                                <td className="font-semibold">{bm.medicineData?.name || `#${bm.medicineId}`}</td>
                                <td>{bm.quantity} {bm.medicineData?.unit || ''}</td>
                                <td>{bm.dosage || 'Theo chỉ dẫn của bác sĩ'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <span className="text-muted-italic">Không có đơn thuốc chỉ định</span>
                      )}
                    </div>
                  </div>

                  {/* Hướng dẫn chăm sóc & Tái khám */}
                  {detailBooking.careInstructions && (
                    <div className="med-row">
                      <span className="med-label">Hướng dẫn chăm sóc:</span>
                      <div className="med-content">
                        <p>{detailBooking.careInstructions}</p>
                      </div>
                    </div>
                  )}

                  {detailBooking.followUpDate && (
                    <div className="med-row">
                      <span className="med-label">Lịch hẹn tái khám:</span>
                      <div className="med-content text-teal font-semibold">
                        <i className="far fa-calendar-alt" /> {detailBooking.followUpDate}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="modal-bottom-actions">
              {(detailBooking.statusId === 'S1' || detailBooking.statusId === 'S2') && (
                <button
                  type="button"
                  className="btn-footer-cancel"
                  onClick={() => handleOpenCancelModal(detailBooking)}
                >
                  <i className="fas fa-ban" /> Hủy lịch hẹn này
                </button>
              )}
              <button
                type="button"
                className="btn-footer-close"
                onClick={() => setDetailBooking(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          MODAL CONFIRM HỦY LỊCH — TÓM TẮT CHÍNH SÁCH HOÀN TIỀN
      ═══════════════════════════════════════════════════════════ */}
      {cancelModal.isOpen && (
        <div className="cancel-modal-backdrop" onClick={handleCloseCancelModal}>
          <div className="cancel-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="cancel-header">
              <div className="cancel-icon-wrap">
                <i className="fas fa-calendar-times" />
              </div>
              <div className="cancel-header-text">
                <h3>Xác nhận hủy lịch khám?</h3>
                <span className="booking-subcode">Mã lịch hẹn: #BK-{cancelModal.bookingId}</span>
              </div>
            </div>

            {(() => {
              const estimate = getRefundEstimate(cancelModal.booking);
              const b = cancelModal.booking;
              return (
                <div className="cancel-summary-box">
                  {b && (
                    <div className="cancel-appt-info">
                      <div className="info-row">
                        <span className="label">Bác sĩ:</span>
                        <span className="val font-semibold">{getDoctorName(b)}</span>
                      </div>
                      <div className="info-row">
                        <span className="label">Thời gian khám:</span>
                        <span className="val text-primary font-semibold">
                          {formatDateTime(b.date, b.timeTypeBooking)} ({getTimeSlot(b)})
                        </span>
                      </div>
                      <div className="info-row">
                        <span className="label">Ngày đặt lịch:</span>
                        <span className="val">{formatCreatedAt(b.createdAt)}</span>
                      </div>
                    </div>
                  )}

                  <div className="cancel-refund-policy">
                    <div className="policy-header">
                      <i className="fas fa-shield-alt text-teal" />
                      <span>Chính sách hoàn tiền dựa trên thời gian:</span>
                    </div>
                    <div className="policy-calc-row">
                      <span>Thời gian từ khi đặt tới lúc hủy:</span>
                      <strong>{estimate.hours} giờ</strong>
                    </div>
                    <div className="policy-calc-row">
                      <span>Tỷ lệ hoàn tiền áp dụng:</span>
                      <strong className="text-emerald-600">✓ Hoàn {estimate.rate}%</strong>
                    </div>
                    {estimate.price > 0 && (
                      <div className="policy-calc-row policy-calc-row--highlight">
                        <span>Số tiền hoàn dự kiến:</span>
                        <strong className="text-emerald-700">{CommonUtils.formatCurrency(estimate.amount)} ₫</strong>
                      </div>
                    )}
                  </div>

                  <div className="cancel-account-note">
                    <i className="fas fa-info-circle text-teal" />
                    <span>Tiền hoàn sẽ được đối soát và chuyển về tài khoản ngân hàng nhận hoàn tiền trong hồ sơ của bạn.</span>
                  </div>
                </div>
              );
            })()}

            <div className="cancel-actions">
              <button
                type="button"
                className="btn-cancel-back"
                disabled={cancelModal.isCancelling}
                onClick={handleCloseCancelModal}
              >
                Giữ lại lịch hẹn
              </button>
              <button
                type="button"
                className="btn-cancel-confirm"
                disabled={cancelModal.isCancelling}
                onClick={handleConfirmCancel}
              >
                {cancelModal.isCancelling ? (
                  <>
                    <i className="fas fa-spinner fa-spin" /> Đang xử lý...
                  </>
                ) : (
                  'Xác nhận hủy lịch'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          MODAL ĐÁNH GIÁ BÁC SĨ
      ═══════════════════════════════════════════════════════════ */}
      <RatingModal
        isOpen={ratingModal.isOpen}
        onClose={() => setRatingModal({ isOpen: false, bookingData: null })}
        bookingData={ratingModal.bookingData}
        onSuccess={() => fetchBookings()}
      />

      {/* ═══════════════════════════════════════════════════════════
          MODAL MÃ QR KHÁM BỆNH BẢO MẬT
      ═══════════════════════════════════════════════════════════ */}
      <AppointmentQrModal
        isOpen={showQrModal}
        onClose={() => setShowQrModal(false)}
        booking={detailBooking}
      />
    </div>
  );
};

export default AppointmentHistory;
