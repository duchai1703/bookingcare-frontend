// src/containers/PatientPortal/PatientOverview.jsx
// [Redesign] Trang Tổng quan Cổng Bệnh Nhân BookingCare
// Hiển thị lời chào, thống kê lịch hẹn, thẻ lịch khám sắp tới và các thao tác nhanh
import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import moment from 'moment';
import { getPatientBookings, cancelBooking } from '../../services/patientService';
import { getMyWallet } from '../../services/walletService';
import { getNotifications } from '../../services/notificationService';
import SmartRescheduleModal from './SmartRescheduleModal';
import { path, LANGUAGES } from '../../utils/constants';
import CommonUtils from '../../utils/CommonUtils';
import { toast } from 'react-toastify';
import './PatientOverview.scss';

const PatientOverview = () => {
  const navigate = useNavigate();
  const { userInfo } = useSelector((state) => state.user);
  const language = useSelector((state) => state.app.language);

  const [stats, setStats] = useState({
    upcoming: 0,
    done: 0,
    cancelled: 0,
  });
  const [walletBalance, setWalletBalance] = useState(0);
  const [nearestBooking, setNearestBooking] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Cancel modal state
  const [cancelModal, setCancelModal] = useState({
    isOpen: false,
    bookingId: null,
    isCancelling: false,
  });

  // Smart reschedule modal state
  const [rescheduleModal, setRescheduleModal] = useState({
    isOpen: false,
    bookingId: null,
  });

  // Actionable alerts for Action Required Hub
  const [actionableAlerts, setActionableAlerts] = useState([]);
  const [dismissedAlertIds, setDismissedAlertIds] = useState(() => {
    try {
      const stored = sessionStorage.getItem('dismissed_patient_alerts');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const handleDismissAlert = (alertId) => {
    setDismissedAlertIds((prev) => {
      const updated = [...prev, alertId];
      try {
        sessionStorage.setItem('dismissed_patient_alerts', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    setActionableAlerts((prev) => prev.filter((a) => a.id !== alertId));
  };

  const fetchOverviewData = async () => {
    setIsLoading(true);
    try {
      const [upcomingRes, doneRes, cancelledRes, walletRes, notifRes] = await Promise.all([
        getPatientBookings({ status: 'S1,S2', page: 1, limit: 5 }),
        getPatientBookings({ status: 'S3', page: 1, limit: 1 }),
        getPatientBookings({ status: 'S4', page: 1, limit: 3 }),
        getMyWallet().catch(() => null),
        getNotifications({ limit: 5, offset: 0, isRead: false }).catch(() => null),
      ]);

      const upcomingCount = upcomingRes?.pagination?.totalItems ?? (upcomingRes?.data?.length || 0);
      const doneCount = doneRes?.pagination?.totalItems ?? (doneRes?.data?.length || 0);
      const cancelledCount = cancelledRes?.pagination?.totalItems ?? (cancelledRes?.data?.length || 0);

      setStats({
        upcoming: upcomingCount,
        done: doneCount,
        cancelled: cancelledCount,
      });

      if (walletRes && walletRes.errCode === 0 && walletRes.data) {
        setWalletBalance(walletRes.data.availableBalance || 0);
      }

      const upcomingList = upcomingRes?.data || [];
      if (upcomingList.length > 0) {
        // Tìm lịch gần nhất
        setNearestBooking(upcomingList[0]);
      } else {
        setNearestBooking(null);
      }

      // Xây dựng danh sách Sự kiện quan trọng (Action Required Alerts)
      const alerts = [];

      // 1. Lịch bị hủy (ưu tiên hành động Đổi lịch thông minh)
      const cancelledList = cancelledRes?.data || [];
      if (cancelledList.length > 0) {
        const latestCancelled = cancelledList[0];
        const timeStr = latestCancelled.timeTypeBooking?.valueVi || latestCancelled.timeType || '';
        const dateStr = moment(parseInt(latestCancelled.date, 10)).format('DD/MM/YYYY');
        alerts.push({
          id: `cancelled-${latestCancelled.id}`,
          severity: 'warning',
          icon: 'fas fa-exclamation-triangle',
          badge: 'Lịch khám bị hủy · Cần xử lý',
          time: moment(latestCancelled.updatedAt || latestCancelled.createdAt).fromNow(),
          title: `Lịch hẹn #${latestCancelled.id} đã bị hủy (BS. ${latestCancelled.doctorBookingData?.lastName || ''} ${latestCancelled.doctorBookingData?.firstName || ''})`,
          message: `Lịch hẹn lúc ${timeStr} ngày ${dateStr} đã bị hủy. Bạn có thể sử dụng tính năng Đổi lịch thông minh để chọn bác sĩ tương đương hoặc khung giờ mới ngay lập tức.`,
          actionType: 'SMART_RESCHEDULE',
          bookingId: latestCancelled.id,
        });
      }

      // 2. Lịch khám diễn ra ngay hôm nay
      if (upcomingList.length > 0) {
        const firstUpcoming = upcomingList[0];
        const isToday = moment(parseInt(firstUpcoming.date, 10)).isSame(moment(), 'day');
        if (isToday) {
          const timeStr = firstUpcoming.timeTypeBooking?.valueVi || firstUpcoming.timeType || '';
          alerts.push({
            id: `today-${firstUpcoming.id}`,
            severity: 'info',
            icon: 'fas fa-clock',
            badge: 'Lịch khám hôm nay',
            time: `Hôm nay · ${timeStr}`,
            title: `Lịch hẹn khám hôm nay với BS. ${firstUpcoming.doctorBookingData?.lastName || ''} ${firstUpcoming.doctorBookingData?.firstName || ''}`,
            message: `Địa điểm: ${firstUpcoming.doctorBookingData?.doctorInfoData?.clinicData?.name || 'Phòng khám chuyên khoa'}. Vui lòng chuẩn bị và có mặt trước 15 phút.`,
            actionType: 'LINK',
            actionLink: '/patient/history',
            actionText: 'Xem chi tiết lịch hẹn',
          });
        }
      }

      // 3. Thông báo hoàn tiền / Tin nhắn từ notification service
      const notifList = notifRes?.data || [];
      if (Array.isArray(notifList)) {
        notifList.forEach((n) => {
          if (n.type === 'REFUND_SUCCESS' && !alerts.some((a) => a.id === `notif-${n.id}`)) {
            alerts.push({
              id: `notif-${n.id}`,
              severity: 'success',
              icon: 'fas fa-hand-holding-usd',
              badge: 'Hoàn tiền thành công',
              time: moment(n.createdAt).fromNow(),
              title: n.title,
              message: n.message,
              actionType: 'LINK',
              actionLink: '/patient/wallet',
              actionText: 'Kiểm tra Ví',
            });
          } else if (n.type === 'NEW_MESSAGE' && !alerts.some((a) => a.id === `notif-${n.id}`)) {
            alerts.push({
              id: `notif-${n.id}`,
              severity: 'primary',
              icon: 'fas fa-comment-medical',
              badge: 'Tin nhắn Bác sĩ mới',
              time: moment(n.createdAt).fromNow(),
              title: n.title,
              message: n.message,
              actionType: 'LINK',
              actionLink: '/patient/chat',
              actionText: 'Mở hội thoại',
            });
          }
        });
      }

      // Lọc các alerts đã bị đóng
      const storedDismissed = (() => {
        try {
          const s = sessionStorage.getItem('dismissed_patient_alerts');
          return s ? JSON.parse(s) : [];
        } catch {
          return [];
        }
      })();
      setActionableAlerts(alerts.filter((a) => !storedDismissed.includes(a.id)));
    } catch (err) {
      console.error('Error fetching patient overview:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOverviewData();
  }, []);

  const handleConfirmCancel = async () => {
    if (!cancelModal.bookingId) return;
    setCancelModal((prev) => ({ ...prev, isCancelling: true }));
    try {
      const res = await cancelBooking(cancelModal.bookingId);
      if (res && res.errCode === 0) {
        toast.success(res.message || 'Hủy lịch khám thành công!');
        setCancelModal({ isOpen: false, bookingId: null, isCancelling: false });
        fetchOverviewData();
      } else {
        toast.error(res?.message || 'Không thể hủy lịch khám!');
        setCancelModal((prev) => ({ ...prev, isCancelling: false }));
      }
    } catch (err) {
      toast.error('Lỗi khi kết nối máy chủ!');
      setCancelModal((prev) => ({ ...prev, isCancelling: false }));
    }
  };

  // Avatar source helper
  const renderAvatar = () => {
    const img = userInfo?.image;
    if (img) {
      const src = typeof img === 'string' && img.startsWith('data:') ? img : `data:image/jpeg;base64,${img}`;
      return <img src={src} alt="Avatar" className="po-avatar-img" />;
    }
    return <div className="po-avatar-placeholder">{userInfo?.firstName ? userInfo.firstName.charAt(0).toUpperCase() : '👤'}</div>;
  };

  // Format date helper
  const formatDate = (rawDate) => {
    if (!rawDate) return '--';
    const num = parseInt(rawDate, 10);
    const m = isNaN(num) ? moment(rawDate) : moment(num);
    return m.isValid() ? m.format(language === LANGUAGES.VI ? 'DD/MM/YYYY' : 'MM/DD/YYYY') : rawDate;
  };

  const getTimeSlot = (b) => {
    if (b?.timeTypeBooking) {
      return language === LANGUAGES.VI ? b.timeTypeBooking.valueVi : b.timeTypeBooking.valueEn;
    }
    return b?.timeType || '--';
  };

  return (
    <div className="patient-overview-container">
      {/* ===== HERO GREETING CARD ===== */}
      <div className="po-welcome-card">
        <div className="po-user-info-row">
          <div className="po-avatar-wrapper">{renderAvatar()}</div>
          <div className="po-text-info">
            <h2>
              Xin chào, {userInfo?.lastName} {userInfo?.firstName}!
            </h2>
            <p className="po-welcome-sub">
              Chào mừng bạn đến với Cổng bệnh nhân BookingCare. Quản lý lịch hẹn khám và theo dõi kết quả y tế của bạn dễ dàng.
            </p>
            <div className="po-user-contact">
              {userInfo?.email && (
                <span className="contact-tag">
                  <i className="far fa-envelope" /> {userInfo.email}
                </span>
              )}
              {userInfo?.phoneNumber && (
                <span className="contact-tag">
                  <i className="fas fa-phone-alt" /> {userInfo.phoneNumber}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ===== TẦNG 1: ACTION REQUIRED HUB ("CẦN BẠN CHÚ Ý") ===== */}
      {actionableAlerts.length > 0 && (
        <div className="po-action-hub">
          <div className="po-action-hub__header">
            <div className="po-action-hub__title">
              <span className="po-action-hub__pulse" />
              <h3>Cần bạn chú ý</h3>
              <span className="po-action-hub__counter">{actionableAlerts.length}</span>
            </div>
            <span className="po-action-hub__desc">
              Sự kiện và yêu cầu hành động cần bạn xử lý sớm
            </span>
          </div>

          <div className="po-action-hub__list">
            {actionableAlerts.map((alert) => (
              <div key={alert.id} className={`po-action-card po-action-card--${alert.severity}`}>
                <div className="po-action-card__icon-box">
                  <i className={alert.icon} />
                </div>
                <div className="po-action-card__body">
                  <div className="po-action-card__meta">
                    <span className="po-action-card__badge">{alert.badge}</span>
                    <span className="po-action-card__time">
                      <i className="far fa-clock tw-mr-1" />
                      {alert.time}
                    </span>
                  </div>
                  <h4 className="po-action-card__heading">{alert.title}</h4>
                  <p className="po-action-card__message">{alert.message}</p>
                </div>
                <div className="po-action-card__ctas">
                  {alert.actionType === 'SMART_RESCHEDULE' ? (
                    <button
                      type="button"
                      className="po-cta-btn po-cta-btn--warning"
                      onClick={() => setRescheduleModal({ isOpen: true, bookingId: alert.bookingId })}
                    >
                      <i className="fas fa-calendar-alt tw-mr-1.5" /> Đổi lịch thông minh ngay
                    </button>
                  ) : alert.actionType === 'LINK' ? (
                    <Link to={alert.actionLink} className="po-cta-btn po-cta-btn--primary">
                      {alert.actionText} <i className="fas fa-arrow-right tw-ml-1" />
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    className="po-cta-dismiss"
                    onClick={() => handleDismissAlert(alert.id)}
                    title="Ẩn thông báo này"
                    aria-label="Ẩn"
                  >
                    <i className="fas fa-times" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== STATS COUNTER ROW ===== */}
      <div className="po-stats-grid">
        <Link to="/patient/history" className="po-stat-card po-stat-card--upcoming">
          <div className="stat-icon-wrap">
            <i className="far fa-calendar-check" />
          </div>
          <div className="stat-details">
            <span className="stat-count">{isLoading ? '...' : stats.upcoming}</span>
            <span className="stat-label">Lịch khám sắp tới</span>
          </div>
          <span className="stat-arrow">→</span>
        </Link>

        <Link to="/patient/history" className="po-stat-card po-stat-card--done">
          <div className="stat-icon-wrap">
            <i className="fas fa-check-circle" />
          </div>
          <div className="stat-details">
            <span className="stat-count">{isLoading ? '...' : stats.done}</span>
            <span className="stat-label">Lịch khám hoàn thành</span>
          </div>
          <span className="stat-arrow">→</span>
        </Link>

        <Link to="/patient/history" className="po-stat-card po-stat-card--cancelled">
          <div className="stat-icon-wrap">
            <i className="fas fa-calendar-times" />
          </div>
          <div className="stat-details">
            <span className="stat-count">{isLoading ? '...' : stats.cancelled}</span>
            <span className="stat-label">Lịch khám đã hủy</span>
          </div>
          <span className="stat-arrow">→</span>
        </Link>

        <Link to="/patient/wallet" className="po-stat-card po-stat-card--wallet">
          <div className="stat-icon-wrap">
            <i className="fas fa-wallet" />
          </div>
          <div className="stat-details">
            <span className="stat-count">{isLoading ? '...' : (walletBalance ? Number(walletBalance).toLocaleString('vi-VN') + ' đ' : '0 đ')}</span>
            <span className="stat-label">Ví BookingCare (Nạp/Xem)</span>
          </div>
          <span className="stat-arrow">→</span>
        </Link>
      </div>

      {/* ===== UPCOMING APPOINTMENT HIGHLIGHT ===== */}
      <div className="po-section-card">
        <div className="section-card-header">
          <div className="header-title-group">
            <span className="header-indicator dot-teal" />
            <h3>Lịch khám sắp diễn ra gần nhất</h3>
          </div>
          <Link to="/patient/history" className="header-view-all">
            Xem tất cả lịch hẹn <i className="fas fa-arrow-right" />
          </Link>
        </div>

        {isLoading ? (
          <div className="po-loading-state">
            <i className="fas fa-spinner fa-spin" /> Đang tải thông tin lịch khám...
          </div>
        ) : nearestBooking ? (
          <div className="po-highlight-card">
            <div className="hl-badge-row">
              <span className="hl-tag-upcoming">
                <i className="fas fa-clock" /> Sắp diễn ra
              </span>
              <span className="hl-status-badge">
                {nearestBooking.statusId === 'S1' ? 'Chờ xác nhận' : 'Đã xác nhận'}
              </span>
            </div>

            <div className="hl-content-grid">
              <div className="hl-doctor-block">
                <div className="doctor-avatar">
                  {nearestBooking.doctorBookingData?.image ? (
                    <img src={CommonUtils.decodeBase64Image(nearestBooking.doctorBookingData.image)} alt="Doctor" />
                  ) : (
                    <i className="fas fa-user-md" />
                  )}
                </div>
                <div className="doctor-meta">
                  <h4 className="doctor-name">
                    BS. {nearestBooking.doctorBookingData?.lastName} {nearestBooking.doctorBookingData?.firstName}
                  </h4>
                  {nearestBooking.doctorBookingData?.doctorInfoData?.specialtyData?.name && (
                    <span className="doctor-specialty">
                      Chuyên khoa: {nearestBooking.doctorBookingData.doctorInfoData.specialtyData.name}
                    </span>
                  )}
                  {nearestBooking.doctorBookingData?.doctorInfoData?.clinicData?.name && (
                    <span className="doctor-clinic">
                      <i className="fas fa-hospital" /> {nearestBooking.doctorBookingData.doctorInfoData.clinicData.name}
                    </span>
                  )}
                </div>
              </div>

              <div className="hl-time-block">
                <div className="time-item">
                  <span className="item-label">Ngày khám:</span>
                  <strong className="item-value">{formatDate(nearestBooking.date)}</strong>
                </div>
                <div className="time-item">
                  <span className="item-label">Khung giờ:</span>
                  <strong className="item-value text-teal">{getTimeSlot(nearestBooking)}</strong>
                </div>
                {nearestBooking.reason && (
                  <div className="time-item">
                    <span className="item-label">Lý do khám:</span>
                    <span className="item-reason">{nearestBooking.reason}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="hl-actions-row">
              <Link to="/patient/history" className="btn-hl-view">
                <i className="fas fa-file-medical-alt" /> Xem chi tiết lịch khám
              </Link>
              <button
                type="button"
                className="btn-hl-cancel"
                onClick={() => setCancelModal({ isOpen: true, bookingId: nearestBooking.id, isCancelling: false })}
              >
                <i className="fas fa-ban" /> Hủy lịch
              </button>
            </div>
          </div>
        ) : (
          <div className="po-empty-upcoming">
            <div className="empty-icon-circle">
              <i className="far fa-calendar-plus" />
            </div>
            <h4>Bạn chưa có lịch khám nào sắp diễn ra</h4>
            <p>Khám phá các chuyên khoa và đặt lịch khám với các bác sĩ hàng đầu ngay hôm nay.</p>
            <Link to={path.DOCTOR_LIST} className="btn-book-now">
              <i className="fas fa-plus" /> Đặt lịch khám mới
            </Link>
          </div>
        )}
      </div>

      {/* ===== QUICK ACTIONS SHORTCUTS ===== */}
      <div className="po-quick-actions-row">
        <Link to={path.DOCTOR_LIST} className="quick-action-card">
          <span className="qa-icon qa-icon--blue">👨‍⚕️</span>
          <div>
            <h5>Tìm bác sĩ</h5>
            <p>Danh sách bác sĩ giỏi theo chuyên khoa</p>
          </div>
        </Link>
        <Link to={path.SPECIALTY_LIST} className="quick-action-card">
          <span className="qa-icon qa-icon--teal">🩺</span>
          <div>
            <h5>Chuyên khoa</h5>
            <p>Khám tổng quát, Cơ xương khớp, Thần kinh...</p>
          </div>
        </Link>
        <Link to={path.CLINIC_LIST} className="quick-action-card">
          <span className="qa-icon qa-icon--purple">🏥</span>
          <div>
            <h5>Cơ sở y tế</h5>
            <p>Bệnh viện tuyến trung ương & phòng khám uy tín</p>
          </div>
        </Link>
        <Link to="/patient/profile" className="quick-action-card">
          <span className="qa-icon qa-icon--amber">⚙️</span>
          <div>
            <h5>Hồ sơ cá nhân</h5>
            <p>Cập nhật số điện thoại, địa chỉ, ảnh đại diện</p>
          </div>
        </Link>
      </div>

      {/* ===== MODAL CONFIRM HỦY LỊCH ===== */}
      {cancelModal.isOpen && (
        <div className="po-modal-backdrop" onClick={() => setCancelModal({ isOpen: false, bookingId: null, isCancelling: false })}>
          <div className="po-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title-row">
              <i className="fas fa-exclamation-triangle warning-icon" />
              <h3>Xác nhận hủy lịch khám?</h3>
            </div>
            <p className="modal-msg">
              Bạn có chắc chắn muốn hủy lịch khám này không? Số tiền hoàn lại (nếu đã thanh toán) sẽ tuân theo Chính sách hoàn tiền của hệ thống.
            </p>
            <div className="modal-actions-row">
              <button
                type="button"
                className="btn-modal-back"
                disabled={cancelModal.isCancelling}
                onClick={() => setCancelModal({ isOpen: false, bookingId: null, isCancelling: false })}
              >
                Quay lại
              </button>
              <button
                type="button"
                className="btn-modal-agree"
                disabled={cancelModal.isCancelling}
                onClick={handleConfirmCancel}
              >
                {cancelModal.isCancelling ? <><i className="fas fa-spinner fa-spin" /> Đang xử lý...</> : 'Đồng ý hủy'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL ĐỔI LỊCH THÔNG MINH ===== */}
      {rescheduleModal.isOpen && (
        <SmartRescheduleModal
          isOpen={rescheduleModal.isOpen}
          bookingId={rescheduleModal.bookingId}
          onClose={() => setRescheduleModal({ isOpen: false, bookingId: null })}
          onSuccess={() => {
            fetchOverviewData();
            setRescheduleModal({ isOpen: false, bookingId: null });
          }}
        />
      )}
    </div>
  );
};

export default PatientOverview;
