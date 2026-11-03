// ═══════════════════════════════════════════════════════════════════════
// [Phase 05 — REAL IN-CHAT BOOKING] BookingSuccessCard.jsx
// Displays Real Booking Confirmation after Backend Transaction Success
// STRICT: NO FAKE SUCCESS, displays actual DB bookingId & statusId (S1/S2)
// ═══════════════════════════════════════════════════════════════════════

import React, { memo } from 'react';
import {
  CheckCircle2,
  Calendar,
  Clock,
  MapPin,
  Mail,
  ExternalLink,
  Stethoscope,
  Tag,
} from 'lucide-react';

const BookingSuccessCard = memo(({ bookingResult }) => {
  if (!bookingResult || typeof bookingResult !== 'object') return null;

  const data = bookingResult.data || bookingResult;
  const bookingId = data.bookingId;
  const bookingStatus = data.bookingStatus || data.statusId || 'S1';
  const doctor = data.doctor || {};
  const schedule = data.schedule || {};
  const patient = data.patient || {};
  const price = data.price || {};
  const isPaid = data.paymentStatus === 'paid';
  const paymentMethod = data.paymentMethod || (data.vnpayTransactionNo ? 'VNPAY' : null);
  const isWalletPaid = paymentMethod === 'WALLET' && isPaid;
  const isVnpayPaid = (paymentMethod === 'VNPAY' || Boolean(data.vnpayTransactionNo)) && isPaid;

  const getBookingStatusText = (status) => {
    switch (status) {
      case 'S1': return 'Chờ xác nhận';
      case 'S1.5': return 'Chờ thanh toán';
      case 'S2': return 'Đã xác nhận';
      case 'S3': return 'Đã khám xong';
      case 'S4': return 'Đã hủy';
      default: return status || 'Đang xử lý';
    }
  };

  const statusLabel = getBookingStatusText(bookingStatus);
  const paymentMethodLabel = isWalletPaid
    ? 'Thanh toán qua Ví BookingCare'
    : (isVnpayPaid ? 'Thanh toán qua Cổng VNPay' : (paymentMethod ? `Thanh toán qua ${paymentMethod}` : (isPaid ? 'Đã thanh toán' : 'Chưa thanh toán')));

  const message = data.message || (isPaid
    ? (isWalletPaid ? 'Đặt lịch khám và thanh toán bằng Ví BookingCare thành công!' : 'Đặt lịch khám và thanh toán thành công!')
    : 'Đặt lịch thành công! Vui lòng kiểm tra email để xác nhận lịch hẹn.');

  const nextStep = (data.nextStep && !data.nextStep.includes('(S2)'))
    ? data.nextStep
    : (isPaid
        ? 'Lịch khám của bạn đã được thanh toán và xác nhận thành công. Vui lòng đến đúng giờ hẹn tại cơ sở y tế.'
        : 'Kiểm tra hộp thư email của bạn để xác nhận lịch hẹn chính thức.');

  return (
    <div className="ai-booking-success-card" role="region" aria-label="Kết quả đặt lịch thành công">
      {/* Success Header */}
      <div className="success-header">
        <div className="success-icon-badge">
          <CheckCircle2 size={24} className="check-icon" />
        </div>
        <div className="success-header-text">
          <h4 className="success-title">Đặt lịch khám thành công!</h4>
          {bookingId && (
            <span className="booking-id-tag">Mã lịch hẹn: #{bookingId}</span>
          )}
        </div>
      </div>

      <div className="success-body">
        {/* Doctor & Clinic */}
        <div className="success-row">
          <Stethoscope size={16} className="row-icon" />
          <div className="row-content">
            <span className="row-title">
              {doctor.position ? `${doctor.position} ` : 'Bác sĩ '}
              {doctor.name || 'Chuyên khoa'}
            </span>
            {doctor.specialtyName && (
              <span className="row-subtitle">Chuyên khoa: {doctor.specialtyName}</span>
            )}
            {doctor.clinicName && (
              <div className="clinic-meta">
                <MapPin size={12} className="clinic-pin" />
                <span>{doctor.clinicName}</span>
              </div>
            )}
          </div>
        </div>

        {/* Date & Time */}
        <div className="success-row">
          <Calendar size={16} className="row-icon" />
          <div className="row-content">
            <span className="row-title">
              {schedule.dateFormatted ? `Ngày: ${schedule.dateFormatted}` : `Ngày: ${schedule.date}`}
            </span>
            <div className="time-meta">
              <Clock size={12} className="time-clock" />
              <span>{schedule.displayTime || schedule.timeLabel || 'Khung giờ khám'}</span>
            </div>
          </div>
        </div>

        {/* Status & Payment */}
        <div className="success-row">
          <Tag size={16} className="row-icon" />
          <div className="row-content">
            <div className="status-pill-row">
              <span className="status-label">Trạng thái:</span>
              <span className={`status-badge ${bookingStatus === 'S2' ? 'status-s2' : 'status-s1'}`}>
                {statusLabel}
              </span>
              {isPaid && (
                <span className="payment-method-pill" style={{ marginLeft: 8, fontSize: '0.78rem', background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: 4, fontWeight: 500 }}>
                  {paymentMethodLabel}
                </span>
              )}
            </div>
            {price.formatted && (
              <span className="price-tag">Chi phí: {price.formatted}</span>
            )}
          </div>
        </div>

        {/* Next Step / Guidance */}
        <div className="success-next-step">
          {isWalletPaid ? (
            <CheckCircle2 size={16} className="check-icon text-success" />
          ) : (
            <Mail size={15} className="mail-icon" />
          )}
          <div className="next-step-content">
            <p className="next-step-title">Bước tiếp theo:</p>
            <p className="next-step-desc">{nextStep}</p>
          </div>
        </div>
      </div>

      {/* Card Actions */}
      <div className="success-footer">
        <a
          href="/patient/history"
          className="view-history-btn"
          title="Xem danh sách lịch hẹn của bạn"
        >
          <span>Xem Lịch sử khám bệnh</span>
          <ExternalLink size={13} />
        </a>
      </div>
    </div>
  );
});

BookingSuccessCard.displayName = 'BookingSuccessCard';

export default BookingSuccessCard;
