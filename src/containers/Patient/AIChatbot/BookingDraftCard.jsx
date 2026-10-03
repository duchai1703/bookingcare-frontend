// ═══════════════════════════════════════════════════════════════════════
// [Phase 05 — REAL IN-CHAT BOOKING] BookingDraftCard.jsx
// Displays backend-validated BOOKING_DRAFT with explicit confirmation
// Enforces: No auto-submit, double-click protection, clear pricing & disclaimer
// ═══════════════════════════════════════════════════════════════════════

import React, { memo, useState } from 'react';
import {
  Calendar,
  Clock,
  User,
  MapPin,
  CreditCard,
  ShieldCheck,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ArrowLeft,
  Stethoscope,
} from 'lucide-react';

const BookingDraftCard = memo(({
  draft,
  onConfirm,
  onCancel,
  isProcessing = false,
}) => {
  const [internalProcessing, setInternalProcessing] = useState(false);

  if (!draft || typeof draft !== 'object') return null;

  const data = draft.data || draft;
  const doctor = data.doctor || {};
  const schedule = data.schedule || {};
  const patient = data.patient || {};
  const price = data.price || {};
  const familyMember = data.familyMember;
  const isFamily = data.bookingFor === 'FAMILY' && familyMember;

  const busy = isProcessing || internalProcessing;

  const handleConfirmClick = async () => {
    if (busy || !onConfirm) return;
    setInternalProcessing(true);
    try {
      await onConfirm(data);
    } finally {
      setInternalProcessing(false);
    }
  };

  return (
    <div className="ai-booking-draft-card" role="region" aria-label="Phiếu xác nhận đặt lịch khám">
      {/* Header Banner */}
      <div className="draft-header">
        <div className="draft-header-title">
          <ShieldCheck size={18} className="header-shield-icon" />
          <span>Phiếu xác nhận đặt lịch khám</span>
        </div>
        <span className="draft-badge">Bản nháp (Draft)</span>
      </div>

      <div className="draft-body">
        {/* Doctor Information */}
        <div className="draft-section doctor-section">
          <div className="section-icon">
            <Stethoscope size={18} />
          </div>
          <div className="section-content">
            <div className="doctor-title-row">
              <span className="doctor-name">
                {doctor.position ? `${doctor.position} ` : 'Bác sĩ '}
                {doctor.name || 'Chuyên khoa'}
              </span>
            </div>
            {doctor.specialtyName && (
              <span className="doctor-specialty">Chuyên khoa: {doctor.specialtyName}</span>
            )}
            {doctor.clinicName && (
              <div className="doctor-clinic">
                <MapPin size={13} className="pin-icon" />
                <span>{doctor.clinicName}</span>
              </div>
            )}
            {doctor.clinicAddress && (
              <span className="doctor-address">{doctor.clinicAddress}</span>
            )}
          </div>
        </div>

        {/* Schedule & Time */}
        <div className="draft-section schedule-section">
          <div className="section-icon">
            <Calendar size={18} />
          </div>
          <div className="section-content">
            <div className="schedule-row">
              <span className="schedule-date">
                {schedule.dateFormatted ? `Ngày: ${schedule.dateFormatted}` : `Ngày khám: ${schedule.date}`}
              </span>
            </div>
            <div className="schedule-time-row">
              <Clock size={13} className="clock-icon" />
              <span className="schedule-time">{schedule.displayTime || schedule.timeLabel || 'Khung giờ khám'}</span>
              <span className="timezone-tag">({schedule.timezone || 'Asia/Ho_Chi_Minh'})</span>
            </div>
          </div>
        </div>

        {/* Patient / Family Member Information */}
        <div className="draft-section patient-section">
          <div className="section-icon">
            <User size={18} />
          </div>
          <div className="section-content">
            <div className="patient-name-row">
              <span className="patient-label">Bệnh nhân:</span>
              <span className="patient-name">
                {isFamily ? `${familyMember.fullName} (Người thân)` : (patient.displayName || 'Bệnh nhân')}
              </span>
            </div>
            {patient.phoneNumber && (
              <span className="patient-phone">SĐT: {patient.phoneNumber}</span>
            )}
            {patient.email && (
              <span className="patient-email">Email: {patient.email}</span>
            )}
          </div>
        </div>

        {/* Price & Payment */}
        <div className="draft-section price-section">
          <div className="section-icon">
            <CreditCard size={18} />
          </div>
          <div className="section-content">
            <div className="price-row">
              <span className="price-label">Giá khám:</span>
              <span className="price-value">{price.formatted || 'Theo quy định'}</span>
            </div>
            <span className="payment-note">Hình thức: Thanh toán / Xác nhận theo quy trình bệnh viện</span>
          </div>
        </div>

        {/* Real-time Availability Disclaimer */}
        <div className="draft-disclaimer">
          <AlertCircle size={14} className="disclaimer-icon" />
          <p className="disclaimer-text">
            {data.disclaimer || 'Thông tin lịch khám được kiểm tra tại thời điểm tạo draft. Lịch hẹn chưa được lưu vào hệ thống cho đến khi bạn xác nhận.'}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="draft-actions">
        {onCancel && (
          <button
            type="button"
            className="draft-btn-secondary"
            onClick={onCancel}
            disabled={busy}
            title="Quay lại chọn khung giờ khác"
          >
            <ArrowLeft size={15} />
            <span>Quay lại</span>
          </button>
        )}
        <button
          type="button"
          className="draft-btn-primary"
          onClick={handleConfirmClick}
          disabled={busy}
          title="Xác nhận đặt lịch khám chính thức"
        >
          {busy ? (
            <>
              <Loader2 size={16} className="btn-spinner" />
              <span>Đang xử lý đặt lịch...</span>
            </>
          ) : (
            <>
              <CheckCircle2 size={16} />
              <span>Xác nhận đặt lịch</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
});

BookingDraftCard.displayName = 'BookingDraftCard';

export default BookingDraftCard;
