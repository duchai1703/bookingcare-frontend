// ═══════════════════════════════════════════════════════════════════════
// [Phase 06 / Test 5 Parity] AppointmentListCard.jsx
// Displays Real Patient Bookings List matching Normal Domain Patient Portal
// Full Self & Family Filtering, Status Badges, and Quick Actions
// ═══════════════════════════════════════════════════════════════════════

import React, { memo } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Stethoscope,
  User,
  FileText,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  XCircle,
  ArrowRight,
  CreditCard,
} from 'lucide-react';

const STATUS_MAP = {
  S1: { label: 'Chờ xác nhận', className: 'status-s1' },
  'S1.5': { label: 'Đã thanh toán - Chờ xác nhận', className: 'status-s2' },
  S2: { label: 'Đã xác nhận', className: 'status-s2' },
  S3: { label: 'Đã khám', className: 'status-s3' },
  S4: { label: 'Đã hủy', className: 'status-s4' },
};

const AppointmentListCard = memo(({
  appointmentList,
  onViewDetail,
  onReschedule,
  onCancel,
}) => {
  if (!appointmentList || typeof appointmentList !== 'object') return null;

  const data = appointmentList.data || appointmentList;
  const bookings = Array.isArray(data.bookings) ? data.bookings : [];
  const total = typeof data.total === 'number' ? data.total : bookings.length;

  return (
    <div className="ai-appointment-list-card" role="region" aria-label="Danh sách lịch khám">
      {/* Header */}
      <div className="appt-list-header">
        <div className="appt-list-title">
          <Calendar size={18} className="header-icon" />
          <span>Lịch khám của bạn</span>
          <span className="count-badge">{total} lịch</span>
        </div>
      </div>

      {/* Body */}
      <div className="appt-list-body">
        {bookings.length === 0 ? (
          <div className="appt-empty-state">
            <AlertCircle size={24} className="empty-icon" />
            <p className="empty-text">Bạn hiện chưa có lịch khám nào phù hợp với yêu cầu tra cứu.</p>
          </div>
        ) : (
          <div className="appt-items-wrapper">
            {bookings.map((booking) => {
              const bookingId = booking.bookingId || booking.id;
              const bookingCode = booking.bookingCode || `#BK-${bookingId}`;
              const statusCode = booking.statusId;
              const isNoShow = Boolean(
                booking.isNoShow ||
                booking.cancellationReason === 'PATIENT_NO_SHOW' ||
                booking.cancellationType === 'SYSTEM_NO_SHOW' ||
                booking.cancellationType === 'NO_SHOW'
              );
              const statusInfo = isNoShow
                ? { label: 'Vắng mặt (No-Show)', className: 'status-s4' }
                : (STATUS_MAP[statusCode] || {
                    label: booking.status || 'Đang xử lý',
                    className: 'status-unknown',
                  });

              const isActive = ['S1', 'S1.5', 'S2'].includes(statusCode);
              const isPaid = booking.isPaid || booking.paymentStatus === 'paid' || statusCode === 'S2' || statusCode === 'S3';

              return (
                <div key={bookingId} className="appt-item-card">
                  {/* Top Bar: Code + Status */}
                  <div className="appt-item-top">
                    <div className="appt-code-group">
                      <span className="booking-code font-bold">{bookingCode}</span>
                      {booking.bookingFor === 'FAMILY' ? (
                        <span className="subject-pill family">
                          <User size={11} /> {booking.patientTarget || 'Người thân'}
                        </span>
                      ) : (
                        <span className="subject-pill self">
                          <User size={11} /> Bản thân
                        </span>
                      )}
                    </div>
                    <span className={`status-pill ${statusInfo.className}`}>
                      {statusInfo.label}
                    </span>
                  </div>

                  {/* Doctor & Clinic */}
                  <div className="appt-item-details">
                    <div className="detail-line doctor-line">
                      <Stethoscope size={13} className="line-icon" />
                      <span className="line-text font-semibold">{booking.doctor || 'Bác sĩ phụ trách'}</span>
                      {booking.specialty && (
                        <span className="specialty-sub">({booking.specialty})</span>
                      )}
                    </div>

                    {booking.clinic && (
                      <div className="detail-line clinic-line">
                        <MapPin size={13} className="line-icon" />
                        <span className="line-text text-muted">{booking.clinic}</span>
                      </div>
                    )}

                    {/* Schedule */}
                    <div className="detail-line time-line">
                      <Clock size={13} className="line-icon" />
                      <span className="line-text">
                        <strong>{booking.time || 'Giờ hẹn'}</strong> — {booking.dateFormatted || booking.date || ''}
                      </span>
                    </div>

                    {/* Financial / Payment */}
                    <div className="detail-line payment-line">
                      <CreditCard size={13} className="line-icon" />
                      <span className="price-tag font-semibold">{booking.priceFormatted || '—'}</span>
                      {isPaid ? (
                        <span className="badge-paid-sm">
                          <CheckCircle2 size={11} /> Đã thanh toán
                        </span>
                      ) : (
                        <span className="badge-unpaid-sm">Chưa thanh toán</span>
                      )}
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="appt-item-actions">
                    <button
                      type="button"
                      className="btn-action btn-detail"
                      onClick={() => onViewDetail && onViewDetail(bookingId)}
                      title="Xem chi tiết ca khám"
                    >
                      <FileText size={12} />
                      <span>Chi tiết</span>
                    </button>

                    {isActive && (
                      <button
                        type="button"
                        className="btn-action btn-cancel"
                        onClick={() => onCancel && onCancel(bookingId)}
                        title="Hủy lịch hẹn khám này"
                      >
                        <XCircle size={12} />
                        <span>Hủy lịch</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
});

AppointmentListCard.displayName = 'AppointmentListCard';
export default AppointmentListCard;
