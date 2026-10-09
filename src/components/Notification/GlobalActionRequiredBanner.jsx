// src/components/Notification/GlobalActionRequiredBanner.jsx
// [Enterprise Healthcare] Thanh thông báo khẩn cấp toàn trang cho Bệnh nhân (Global Action Required Banner)
// Xuất hiện trên tất cả các trang bên ngoài (Trang chủ, Chi tiết Bác sĩ, Cơ sở y tế, Chuyên khoa...)
// Nhằm cảnh báo ngay lập tức khi Bác sĩ báo bận / Hủy lịch khám, nhắc lịch khám hôm nay, v.v.

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import moment from 'moment';
import 'moment/locale/vi';
import { toast } from 'react-toastify';

import { getPatientBookings } from '../../services/patientService';
import { getNotifications } from '../../services/notificationService';
import chatSocketService from '../../services/chatSocketService';
import SmartRescheduleModal from '../../containers/PatientPortal/SmartRescheduleModal';
import { USER_ROLE } from '../../utils/constants';

import './GlobalActionRequiredBanner.scss';

const GlobalActionRequiredBanner = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn, userInfo } = useSelector((state) => state.user);

  // States
  const [activeAlert, setActiveAlert] = useState(null);
  const [rescheduleModal, setRescheduleModal] = useState({ isOpen: false, bookingId: null });
  const [dismissedAlertIds, setDismissedAlertIds] = useState(() => {
    try {
      const stored = sessionStorage.getItem('dismissed_global_action_alerts');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Tạm ẩn thông báo trong session làm việc
  const handleDismiss = (alertId) => {
    if (!alertId) return;
    setDismissedAlertIds((prev) => {
      const next = [...prev, alertId];
      try {
        sessionStorage.setItem('dismissed_global_action_alerts', JSON.stringify(next));
      } catch (e) {
        // ignore
      }
      return next;
    });
    setActiveAlert(null);
  };

  // Tải dữ liệu các sự kiện cần hành động
  const fetchActionAlerts = useCallback(async () => {
    if (!isLoggedIn || userInfo?.roleId !== USER_ROLE.PATIENT) {
      setActiveAlert(null);
      return;
    }

    try {
      const [cancelledRes, upcomingRes, notifRes] = await Promise.all([
        getPatientBookings({ status: 'S4', page: 1, limit: 3 }).catch(() => null),
        getPatientBookings({ status: 'S1,S2', page: 1, limit: 3 }).catch(() => null),
        getNotifications({ limit: 5, offset: 0, isRead: false }).catch(() => null),
      ]);

      const alerts = [];

      // 1. ƯU TIÊN 1 (Cao nhất): Lịch bị hủy do bác sĩ/admin báo bận -> Cần Đổi lịch thông minh ngay
      const cancelledList = cancelledRes?.data || [];
      if (Array.isArray(cancelledList) && cancelledList.length > 0) {
        // Lấy lịch bị hủy gần nhất
        const latestCancelled = cancelledList[0];
        const alertId = `cancelled-${latestCancelled.id}`;

        if (!dismissedAlertIds.includes(alertId)) {
          const timeStr = latestCancelled.timeTypeBooking?.valueVi || latestCancelled.timeType || '';
          const dateStr = moment(parseInt(latestCancelled.date, 10)).format('DD/MM/YYYY');
          const doctorName = `${latestCancelled.doctorBookingData?.lastName || ''} ${latestCancelled.doctorBookingData?.firstName || ''}`.trim();

          alerts.push({
            id: alertId,
            type: 'SMART_RESCHEDULE',
            severity: 'warning',
            icon: 'fas fa-exclamation-triangle',
            badge: 'LỊCH KHÁM BỊ HỦY · CẦN XỬ LÝ GẤP',
            title: `Lịch hẹn #${latestCancelled.id} với BS. ${doctorName || 'phụ trách'} đã bị hủy`,
            message: `Lịch khám lúc ${timeStr} ngày ${dateStr} bị hủy do bác sĩ có lịch bận đột xuất. Vui lòng chọn bác sĩ tương đương hoặc khung giờ mới để không bị gián đoạn quá trình khám.`,
            ctaText: 'Đổi lịch thông minh ngay',
            bookingId: latestCancelled.id,
          });
        }
      }

      // 2. ƯU TIÊN 2: Lịch khám diễn ra ngay trong ngày hôm nay
      const upcomingList = upcomingRes?.data || [];
      if (alerts.length === 0 && Array.isArray(upcomingList) && upcomingList.length > 0) {
        const todayBooking = upcomingList.find((b) =>
          moment(parseInt(b.date, 10)).isSame(moment(), 'day')
        );

        if (todayBooking) {
          const alertId = `today-${todayBooking.id}`;
          if (!dismissedAlertIds.includes(alertId)) {
            const timeStr = todayBooking.timeTypeBooking?.valueVi || todayBooking.timeType || '';
            const doctorName = `${todayBooking.doctorBookingData?.lastName || ''} ${todayBooking.doctorBookingData?.firstName || ''}`.trim();
            const clinicName = todayBooking.doctorBookingData?.doctorInfoData?.clinicData?.name || 'Cơ sở Y tế BookingCare';

            alerts.push({
              id: alertId,
              type: 'LINK',
              severity: 'info',
              icon: 'fas fa-calendar-check',
              badge: 'LỊCH HẸN HÔM NAY',
              title: `Hôm nay bạn có lịch khám với BS. ${doctorName || 'phụ trách'} (${timeStr})`,
              message: `Tại ${clinicName}. Xin vui lòng có mặt trước giờ hẹn 15 phút để hoàn tất thủ tục khám bệnh.`,
              ctaText: 'Xem chi tiết lịch hẹn',
              link: '/patient/history',
            });
          }
        }
      }

      // 3. ƯU TIÊN 3: Thông báo hoàn tiền Ví BookingCare
      if (alerts.length === 0) {
        const notifList = notifRes?.data?.rows || notifRes?.data || [];
        if (Array.isArray(notifList)) {
          const refundNotif = notifList.find((n) => n.type === 'REFUND_SUCCESS' && !n.isRead);
          if (refundNotif) {
            const alertId = `refund-${refundNotif.id}`;
            if (!dismissedAlertIds.includes(alertId)) {
              alerts.push({
                id: alertId,
                type: 'LINK',
                severity: 'success',
                icon: 'fas fa-wallet',
                badge: 'VÍ BOOKINGCARE',
                title: refundNotif.title || 'Tiền hoàn đã được cộng vào Ví của bạn',
                message: refundNotif.message || 'Hệ thống đã tự động hoàn tiền vào số dư khả dụng trên Ví BookingCare.',
                ctaText: 'Kiểm tra số dư Ví',
                link: '/patient/wallet',
              });
            }
          }
        }
      }

      setActiveAlert(alerts.length > 0 ? alerts[0] : null);
    } catch (err) {
      console.warn('Cannot fetch global action alerts:', err);
    }
  }, [isLoggedIn, userInfo, dismissedAlertIds]);

  // Fetch khi mount và lắng nghe socket realtime
  useEffect(() => {
    fetchActionAlerts();

    // Kết nối socket realtime
    chatSocketService.connect();

    const unsubNotif = chatSocketService.on('notification:new', (payload) => {
      fetchActionAlerts();
    });

    return () => {
      if (typeof unsubNotif === 'function') unsubNotif();
    };
  }, [fetchActionAlerts]);

  // Đổi lịch thành công -> đóng modal & refresh alert
  const handleRescheduleSuccess = () => {
    setRescheduleModal({ isOpen: false, bookingId: null });
    toast.success('Đổi lịch khám thông minh thành công!');
    fetchActionAlerts();
  };

  // Điều kiện hiển thị:
  // 1. Phải đăng nhập vai trò Patient
  // 2. Phải có activeAlert
  // 3. Không hiển thị trên trang `/patient/overview` (đã có Action Required Hub trong trang)
  if (!isLoggedIn || userInfo?.roleId !== USER_ROLE.PATIENT) return null;
  if (!activeAlert) return null;
  if (location.pathname === '/patient/overview') return null;

  return (
    <>
      <div className={`global-action-banner global-action-banner--${activeAlert.severity}`}>
        <div className="global-action-banner__inner">
          {/* Cột trái: Icon sống động với Pulse Effect */}
          <div className="banner-icon-container">
            <span className="banner-icon-pulse" />
            <div className="banner-icon-box">
              <i className={activeAlert.icon} />
            </div>
          </div>

          {/* Cột giữa: Badge + Tiêu đề + Nội dung */}
          <div className="banner-content">
            <div className="banner-meta">
              <span className="banner-badge">{activeAlert.badge}</span>
            </div>
            <div className="banner-text-row">
              <h4 className="banner-title">{activeAlert.title}</h4>
              <p className="banner-message">{activeAlert.message}</p>
            </div>
          </div>

          {/* Cột phải: Nút CTA hành động 1-click + Nút đóng */}
          <div className="banner-actions">
            {activeAlert.type === 'SMART_RESCHEDULE' ? (
              <button
                type="button"
                className="banner-cta-btn banner-cta-btn--reschedule"
                onClick={() => setRescheduleModal({ isOpen: true, bookingId: activeAlert.bookingId })}
              >
                <i className="fas fa-calendar-alt tw-mr-1.5" />
                <span>{activeAlert.ctaText}</span>
              </button>
            ) : activeAlert.type === 'LINK' ? (
              <Link to={activeAlert.link} className="banner-cta-btn banner-cta-btn--link">
                <span>{activeAlert.ctaText}</span>
                <i className="fas fa-arrow-right tw-ml-1.5" />
              </Link>
            ) : null}

            <button
              type="button"
              className="banner-dismiss-btn"
              title="Tạm ẩn thông báo này"
              aria-label="Đóng"
              onClick={() => handleDismiss(activeAlert.id)}
            >
              <i className="fas fa-times" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal Đổi lịch thông minh ngay tại chỗ (Zero-Navigation) */}
      <SmartRescheduleModal
        isOpen={rescheduleModal.isOpen}
        bookingId={rescheduleModal.bookingId}
        onClose={() => setRescheduleModal({ isOpen: false, bookingId: null })}
        onSuccess={handleRescheduleSuccess}
      />
    </>
  );
};

export default GlobalActionRequiredBanner;
