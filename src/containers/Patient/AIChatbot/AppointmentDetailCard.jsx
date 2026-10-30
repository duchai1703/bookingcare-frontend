// ═══════════════════════════════════════════════════════════════════════
// [Phase 06E — AI PATIENT ASSISTANT] AppointmentDetailCard.jsx
// Displays Real Appointment Detail matching Normal Domain Patient Portal
// Full Clinical, Doctor, Schedule, Financial & Refund Parity
// ═══════════════════════════════════════════════════════════════════════

import React, { memo } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Stethoscope,
  User,
  Phone,
  FileText,
  Pill,
  ShieldCheck,
  CreditCard,
  RotateCcw,
  Star,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

const STATUS_MAP = {
  S1: { label: 'Chờ xác nhận', className: 'status-s1' },
  'S1.5': { label: 'Đã thanh toán - Chờ xác nhận', className: 'status-s2' },
  S2: { label: 'Đã xác nhận', className: 'status-s2' },
  S3: { label: 'Đã khám xong', className: 'status-s3' },
  S4: { label: 'Đã hủy lịch', className: 'status-s4' },
};

const normalizeGender = (g) => {
  if (!g) return '';
  const val = String(g).trim().toUpperCase();
  if (val === 'G1' || val === 'MALE' || val === 'NAM') return 'Nam';
  if (val === 'G2' || val === 'FEMALE' || val === 'NU' || val === 'NỮ') return 'Nữ';
  if (val === 'G3' || val === 'OTHER' || val === 'KHAC' || val === 'KHÁC') return 'Khác';
  return g;
};

const AppointmentDetailCard = memo(({ appointmentDetail }) => {
  if (!appointmentDetail || typeof appointmentDetail !== 'object') return null;

  const data = appointmentDetail.data || appointmentDetail;
  const bookingId = data.id || data.bookingId;
  const bookingCode = `#BK-${bookingId}`;
  
  const isNoShow = Boolean(
    data.cancellation?.isNoShow ||
    data.bookingStatus?.isNoShow ||
    data.appointmentStatus?.isNoShow ||
    data.cancellationReason === 'PATIENT_NO_SHOW' ||
    data.cancellationType === 'SYSTEM_NO_SHOW' ||
    data.cancellationType === 'NO_SHOW'
  );

  const statusCode = data.status?.code || data.status?.statusId || data.statusId || data.bookingStatus?.statusId || data.appointmentStatus?.statusId;
  const statusInfo = isNoShow
    ? { label: 'Vắng mặt (No-Show)', className: 'status-s4' }
    : (STATUS_MAP[statusCode] || {
        label: data.statusLabel || data.bookingStatus?.statusLabel || data.appointmentStatus?.statusLabel || data.status?.statusLabel || data.status?.label || (statusCode ? `Trạng thái: ${statusCode}` : 'Không xác định'),
        className: 'status-unknown',
      });

  const doctor = data.doctor || {};
  const schedule = data.schedule || {};
  const clinical = data.clinical || {};
  const financial = data.financial || {};
  const patient = data.patient || {};
  const familyMember = data.familyMember || {};
  const review = data.review;

  const patientName = patient.name || data.patientName || '—';
  const patientPhone = patient.phone || data.patientPhone || data.patientPhoneNumber;
  const patientGender = normalizeGender(patient.gender || data.patientGender);
  const patientBirthday = patient.birthday || data.patientBirthday;
  const familyMemberName = familyMember.name || data.familyMemberName;

  const hasClinical = Boolean(
    (clinical.diagnosis && String(clinical.diagnosis).trim()) ||
    (clinical.anamnesis && String(clinical.anamnesis).trim()) ||
    (clinical.reason && String(clinical.reason).trim()) ||
    (clinical.symptoms && String(clinical.symptoms).trim()) ||
    (clinical.clinicalNotes && String(clinical.clinicalNotes).trim()) ||
    (Array.isArray(clinical.medicines) && clinical.medicines.length > 0) ||
    (clinical.careInstructions && String(clinical.careInstructions).trim()) ||
    clinical.followUpDate
  );

  return (
    <div className="ai-appointment-detail-card" role="region" aria-label={`Chi tiết lịch khám ${bookingCode}`}>
      {/* Header */}
      <div className="appt-detail-header">
        <div className="appt-header-title">
          <FileText size={18} className="header-icon" />
          <span>Chi tiết lịch khám</span>
          <span className="booking-code-badge">{bookingCode}</span>
        </div>
        <span className={`status-badge ${statusInfo.className}`}>
          {statusInfo.label}
        </span>
      </div>

      <div className="appt-detail-body">
        {/* Patient Profile */}
        <div className="detail-section patient-section">
          <div className="section-title">
            <User size={14} />
            <span>Thông tin người khám</span>
          </div>
          <div className="detail-grid">
            <div className="grid-item">
              <span className="item-label">Họ tên:</span>
              <span className="item-value font-semibold">
                {patientName}
                {data.bookingFor === 'FAMILY' && (
                  <span className="family-pill">Người thân ({familyMemberName || 'Hồ sơ'})</span>
                )}
              </span>
            </div>
            {patientPhone && (
              <div className="grid-item">
                <span className="item-label">Số điện thoại:</span>
                <span className="item-value">{patientPhone}</span>
              </div>
            )}
            {patientGender && (
              <div className="grid-item">
                <span className="item-label">Giới tính:</span>
                <span className="item-value">{patientGender}</span>
              </div>
            )}
            {patientBirthday && (
              <div className="grid-item">
                <span className="item-label">Ngày sinh:</span>
                <span className="item-value">{patientBirthday}</span>
              </div>
            )}
          </div>
        </div>

        {/* Doctor & Clinic */}
        <div className="detail-section doctor-section">
          <div className="section-title">
            <Stethoscope size={14} />
            <span>Bác sĩ & Cơ sở y tế</span>
          </div>
          <div className="detail-info-row">
            <span className="item-label">Bác sĩ:</span>
            <span className="item-value font-semibold">{doctor.name || 'Bác sĩ phụ trách'}</span>
          </div>
          {doctor.specialty && (
            <div className="detail-info-row">
              <span className="item-label">Chuyên khoa:</span>
              <span className="item-value">{doctor.specialty}</span>
            </div>
          )}
          {doctor.clinic && (
            <div className="detail-info-row">
              <span className="item-label">Cơ sở khám:</span>
              <span className="item-value">
                <MapPin size={12} className="inline-icon" />
                {doctor.clinic} {doctor.clinicAddress ? `(${doctor.clinicAddress})` : ''}
              </span>
            </div>
          )}
        </div>

        {/* Schedule */}
        <div className="detail-section schedule-section">
          <div className="section-title">
            <Calendar size={14} />
            <span>Thời gian khám</span>
          </div>
          <div className="detail-grid">
            <div className="grid-item">
              <span className="item-label">Ngày khám:</span>
              <span className="item-value font-semibold text-primary">
                {schedule.dateFormatted || schedule.date || '—'}
              </span>
            </div>
            <div className="grid-item">
              <span className="item-label">Khung giờ:</span>
              <span className="item-value time-tag font-semibold">
                <Clock size={12} className="inline-icon" />
                {schedule.timeSlot || schedule.timeType || '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Financial & Payment */}
        <div className="detail-section financial-section">
          <div className="section-title">
            <CreditCard size={14} />
            <span>Chi phí & Thanh toán</span>
          </div>
          <div className="detail-grid">
            {financial.price !== undefined && (
              <div className="grid-item">
                <span className="item-label">Giá khám:</span>
                <span className="item-value font-semibold text-emerald-700">
                  {Number(financial.price).toLocaleString('vi-VN')} ₫
                </span>
              </div>
            )}
            {/* Payment Method & Status */}
            {(() => {
              const isPaid = financial.isPaid !== undefined
                ? financial.isPaid
                : (data.status?.isPaid !== undefined
                  ? data.status.isPaid
                  : (data.status?.paymentStatus === 'paid' || data.appointmentStatus?.paymentStatus === 'paid' || data.bookingStatus?.paymentStatus === 'paid' || statusCode === 'S2' || statusCode === 'S3'));

              const isRefunded = financial.isRefunded || financial.refund?.isRefunded || financial.refundStatus === 'completed' || data.status?.paymentStatus === 'refunded' || data.appointmentStatus?.paymentStatus === 'refunded' || (statusCode === 'S4' && (Number(financial.refundAmount || financial.refund?.refundAmount) > 0 || financial.refundRate > 0));

              const method = financial.paymentMethod || data.status?.paymentMethod || data.appointmentStatus?.paymentMethod || data.bookingStatus?.paymentMethod || (isPaid || isRefunded ? 'WALLET' : 'Chưa chọn');

              return (
                <>
                  <div className="grid-item">
                    <span className="item-label">Phương thức:</span>
                    <span className="item-value">
                      {method === 'WALLET' ? 'Ví BookingCare'
                        : method === 'VNPAY' ? 'VNPay Gateway'
                        : method === 'CASH' ? 'Tiền mặt tại cơ sở'
                        : method}
                    </span>
                  </div>
                  <div className="grid-item">
                    <span className="item-label">Tình trạng:</span>
                    <span className="item-value">
                      {isRefunded ? (
                        <span className="badge-refunded"><RotateCcw size={12} /> Đã hoàn tiền</span>
                      ) : isPaid ? (
                        <span className="badge-paid"><CheckCircle2 size={12} /> Đã thanh toán</span>
                      ) : (
                        <span className="badge-unpaid">Chưa thanh toán</span>
                      )}
                    </span>
                  </div>
                </>
              );
            })()}
          </div>

          {/* Refund Details if Cancelled */}
          {(financial.refundRate || (financial.refund && financial.refund.isRefunded)) && (
            <div className="refund-box">
              <div className="refund-title">
                <RotateCcw size={13} />
                <span>Thông tin hoàn tiền:</span>
              </div>
              <div className="refund-content">
                <span>Tỷ lệ hoàn: <strong>{financial.refundRate || financial.refund?.refundRate}%</strong></span>
                {(financial.refundAmount || financial.refund?.refundAmount) > 0 && (
                  <span>Số tiền hoàn: <strong>{Number(financial.refundAmount || financial.refund?.refundAmount).toLocaleString('vi-VN')} ₫</strong></span>
                )}
                {(financial.refundMethod || financial.refund?.refundMethod) && (
                  <span>Kênh hoàn: <strong>{(financial.refundMethod || financial.refund?.refundMethod) === 'WALLET' ? 'Ví BookingCare (Tức thì)' : (financial.refundMethod || financial.refund?.refundMethod)}</strong></span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Clinical Info (S3 / Completed) */}
        {hasClinical && (
          <div className="detail-section clinical-section">
            <div className="section-title">
              <FileText size={14} />
              <span>Hồ sơ bệnh án & Kết luận sau khám</span>
            </div>

            {clinical.anamnesis && (
              <div className="clinical-field">
                <span className="field-label">Tiền sử / Lý do khám:</span>
                <p className="field-value">{clinical.anamnesis}</p>
              </div>
            )}

            {clinical.diagnosis && (
              <div className="clinical-field">
                <span className="field-label">Chẩn đoán của bác sĩ:</span>
                <p className="field-value diagnosis-text">{clinical.diagnosis}</p>
              </div>
            )}

            {clinical.clinicalNotes && (
              <div className="clinical-field">
                <span className="field-label">Ghi chú điều trị:</span>
                <p className="field-value">{clinical.clinicalNotes}</p>
              </div>
            )}

            {/* Prescriptions */}
            {Array.isArray(clinical.medicines) && clinical.medicines.length > 0 && (
              <div className="medicines-block">
                <div className="medicines-title">
                  <Pill size={13} />
                  <span>Đơn thuốc chỉ định ({clinical.medicines.length} loại):</span>
                </div>
                <div className="medicines-table-wrapper">
                  <table className="mini-medicines-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Tên thuốc</th>
                        <th>SL</th>
                        <th>Liều dùng</th>
                        <th>Cách dùng</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clinical.medicines.map((m, idx) => (
                        <tr key={idx}>
                          <td>{idx + 1}</td>
                          <td className="font-semibold">{m.name}</td>
                          <td>{m.quantity} {m.unit || ''}</td>
                          <td>{m.dosage || '—'}</td>
                          <td>{m.usage || 'Theo chỉ dẫn'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {clinical.careInstructions && (
              <div className="clinical-field">
                <span className="field-label">Hướng dẫn chăm sóc tại nhà:</span>
                <p className="field-value">{clinical.careInstructions}</p>
              </div>
            )}

            {clinical.followUpDate && (
              <div className="followup-alert">
                <Calendar size={14} />
                <span>Hẹn ngày tái khám: <strong>{clinical.followUpDate}</strong></span>
              </div>
            )}
          </div>
        )}

        {/* Review status if available */}
        {review && (
          <div className="detail-section review-section">
            <div className="section-title">
              <Star size={14} className="text-amber-500" />
              <span>Đánh giá của bạn ({review.rating} sao)</span>
            </div>
            {review.comment && <p className="review-comment">"{review.comment}"</p>}
          </div>
        )}
      </div>
    </div>
  );
});

AppointmentDetailCard.displayName = 'AppointmentDetailCard';

export default AppointmentDetailCard;
