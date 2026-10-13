// src/containers/System/Doctor/DoctorActionConfirmModal.jsx
// Modal Xác nhận Hủy lịch & Vắng mặt (No-Show) chuẩn Enterprise FinTech cho Bác sĩ
import React, { useState, useEffect } from 'react';
import {
  X,
  AlertTriangle,
  UserX,
  Clock,
  User,
  Phone,
  ShieldCheck,
  Scale,
  Calendar,
  CheckCircle2,
  FileText,
  AlertCircle
} from 'lucide-react';
import './DoctorActionConfirmModal.scss';

const CANCEL_PRESET_REASONS = [
  'Bác sĩ bận lịch phẫu thuật cấp cứu',
  'Bác sĩ có lịch hội chẩn khẩn cấp',
  'Bác sĩ có việc đột xuất / Bận công tác',
  'Sự cố phòng khám / Cơ sở y tế',
  'Lý do chuyên môn khác'
];

const NOSHOW_PRESET_NOTES = [
  'Đã quá giờ hẹn 30 phút, gọi điện không liên lạc được',
  'Bệnh nhân xác nhận bận việc không thể đến khám',
  'Gọi tên 3 lần tại sảnh chờ nhưng bệnh nhân không có mặt',
  'Người nhà báo bệnh nhân chuyển tuyến đột xuất'
];

export default function DoctorActionConfirmModal({
  isOpen,
  mode = 'CANCEL', // 'CANCEL' | 'NO_SHOW'
  booking,
  onClose,
  onConfirm,
  loading = false,
}) {
  const [selectedPreset, setSelectedPreset] = useState('');
  const [customText, setCustomText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (mode === 'CANCEL') {
        setSelectedPreset(CANCEL_PRESET_REASONS[0]);
        setCustomText('');
      } else {
        setSelectedPreset(NOSHOW_PRESET_NOTES[0]);
        setCustomText('');
      }
      setErrorMsg('');
    }
  }, [isOpen, mode]);

  if (!isOpen || !booking) return null;

  const isCancel = mode === 'CANCEL';
  const patientName = booking.patientName || booking.patientData?.firstName || 'Bệnh nhân';
  const phoneNumber = booking.patientPhoneNumber || booking.patientData?.phoneNumber || 'Chưa cập nhật';
  const timeSlot = booking.timeTypeData?.valueVi || booking.timeType || 'Khung giờ khám';
  const bookingDate = booking.date ? new Date(Number(booking.date) || booking.date).toLocaleDateString('vi-VN') : '';
  const price = Number(booking.bookingPrice || booking.totalAmount || 300000);

  // Financial calculations for No-Show preview (75% - 20% / 80%)
  const refundAmount = Math.round(price * 0.75);
  const retainedAmount = Math.max(0, price - refundAmount);
  const doctorCompensation = Math.round(retainedAmount * 0.8);
  const platformFee = Math.max(0, retainedAmount - doctorCompensation);

  const formatMoney = (val) => (Number(val) || 0).toLocaleString('vi-VN') + ' ₫';

  const handleSubmit = (e) => {
    e.preventDefault();
    const finalReason = customText.trim() || selectedPreset;

    if (isCancel && !finalReason) {
      setErrorMsg('Vui lòng chọn hoặc nhập lý do hủy ca khám!');
      return;
    }

    onConfirm({
      reason: finalReason,
      note: finalReason,
      isNoShow: !isCancel,
    });
  };

  return (
    <div className="doc-confirm-modal-overlay" onClick={onClose}>
      <div className="doc-confirm-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={`modal-header ${isCancel ? 'header-cancel' : 'header-noshow'}`}>
          <div className="header-title-group">
            <div className="icon-badge">
              {isCancel ? <AlertTriangle size={22} /> : <UserX size={22} />}
            </div>
            <div>
              <h3 className="modal-title">
                {isCancel ? 'Xác Nhận Hủy Lịch Khám' : 'Xác Nhận Bệnh Nhân Vắng Mặt (No-Show)'}
              </h3>
              <p className="modal-subtitle">
                {isCancel
                  ? `Hủy phiên khám #${booking.id} và kích hoạt quy trình hoàn tiền người bệnh`
                  : `Hồ sơ vắng mặt ca khám #${booking.id} theo Quy chế bảo vệ quyền lợi hai bên`}
              </p>
            </div>
          </div>
          <button type="button" className="btn-close" onClick={onClose} disabled={loading}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="modal-body">
          {errorMsg && (
            <div className="error-alert">
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Patient Card Info */}
          <div className="patient-summary-box">
            <div className="booking-id-pill">
              <span>Mã ca: <strong>#{booking.id}</strong></span>
              <span className="price-tag">{formatMoney(price)}</span>
            </div>
            <div className="info-grid">
              <div className="info-item">
                <User size={14} className="item-icon" />
                <span className="item-label">Bệnh nhân:</span>
                <strong className="item-value">{patientName}</strong>
              </div>
              <div className="info-item">
                <Phone size={14} className="item-icon" />
                <span className="item-label">SĐT:</span>
                <span className="item-value">{phoneNumber}</span>
              </div>
              <div className="info-item full-width">
                <Clock size={14} className="item-icon" />
                <span className="item-label">Thời gian hẹn:</span>
                <span className="item-value">{timeSlot} - {bookingDate}</span>
              </div>
            </div>
          </div>

          {/* Specific Mode Content */}
          {isCancel ? (
            <div className="cancel-content-block">
              <label className="section-label">
                Lý do bác sĩ hủy lịch hẹn <span className="text-danger">*</span>
              </label>
              
              {/* Preset Chips */}
              <div className="preset-chips-list">
                {CANCEL_PRESET_REASONS.map((reason, idx) => (
                  <button
                    type="button"
                    key={idx}
                    className={`preset-chip ${selectedPreset === reason ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedPreset(reason);
                      setErrorMsg('');
                    }}
                  >
                    {reason}
                  </button>
                ))}
              </div>

              {/* Custom Reason Input */}
              <div className="form-group-custom">
                <label className="sub-label">Ghi chú bổ sung hoặc lý do chi tiết:</label>
                <textarea
                  rows="2"
                  className="custom-textarea"
                  placeholder="Nhập ghi chú chi tiết gửi tới bệnh nhân..."
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                />
              </div>

              {/* Policy Protection Banner */}
              <div className="policy-notice-card notice-rose">
                <div className="notice-icon">
                  <ShieldCheck size={18} />
                </div>
                <div className="notice-text">
                  <strong>Chính sách Bảo vệ Người bệnh BookingCare:</strong>
                  <p>
                    Khi bác sĩ chủ động hủy lịch, hệ thống sẽ tự động hoàn trả <strong>100% chi phí ({formatMoney(price)})</strong> vào Ví Bệnh nhân và gửi thông báo khẩn qua Email & SMS.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="noshow-content-block">
              {/* Financial Breakdown Preview */}
              <div className="noshow-financial-panel">
                <div className="panel-header">
                  <span className="panel-title">Bóc tách tài chính ca No-Show ({formatMoney(price)})</span>
                  <span className="panel-badge">
                    <Scale size={12} /> Cân bằng sổ cái 100%
                  </span>
                </div>

                <div className="financial-preview-grid">
                  <div className="metric-box patient-box">
                    <div className="metric-top">
                      <span>Hoàn Ví Khách</span>
                      <span className="metric-pill teal">75%</span>
                    </div>
                    <div className="metric-num text-teal">{formatMoney(refundAmount)}</div>
                    <div className="metric-desc">Tự động hoàn ví ngay</div>
                  </div>

                  <div className="metric-box doctor-box">
                    <div className="metric-top">
                      <span>Bồi Thường Bác Sĩ</span>
                      <span className="metric-pill emerald">80% giữ lại</span>
                    </div>
                    <div className="metric-num text-emerald">{formatMoney(doctorCompensation)}</div>
                    <div className="metric-desc">Bù thời gian giữ chỗ</div>
                  </div>

                  <div className="metric-box platform-box">
                    <div className="metric-top">
                      <span>Phí Điều Phối Sàn</span>
                      <span className="metric-pill slate">20% giữ lại</span>
                    </div>
                    <div className="metric-num text-slate">{formatMoney(platformFee)}</div>
                    <div className="metric-desc">Phí đối soát BookingCare</div>
                  </div>
                </div>
              </div>

              {/* Preset Notes */}
              <label className="section-label">Ghi nhận tình trạng người bệnh vắng mặt:</label>
              <div className="preset-chips-list">
                {NOSHOW_PRESET_NOTES.map((note, idx) => (
                  <button
                    type="button"
                    key={idx}
                    className={`preset-chip chip-amber ${selectedPreset === note ? 'active-amber' : ''}`}
                    onClick={() => {
                      setSelectedPreset(note);
                      setErrorMsg('');
                    }}
                  >
                    {note}
                  </button>
                ))}
              </div>

              {/* Custom Note */}
              <div className="form-group-custom">
                <textarea
                  rows="2"
                  className="custom-textarea"
                  placeholder="Ghi chú chi tiết thêm của bác sĩ (nếu có)..."
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                />
              </div>

              {/* Assurance Banner */}
              <div className="policy-notice-card notice-amber">
                <div className="notice-icon">
                  <Scale size={18} />
                </div>
                <div className="notice-text">
                  <strong>Quy chế Hạch toán Bất biến:</strong>
                  <p>
                    Hồ sơ No-Show sẽ tự động được ghi nhận vào Sổ cái kế toán kép (Double-entry Ledger), giải phóng slot khám của bác sĩ và bảo toàn uy tín chuyên môn.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="modal-footer">
            <button
              type="button"
              className="btn-cancel"
              onClick={onClose}
              disabled={loading}
            >
              Hủy bỏ / Quay lại
            </button>
            <button
              type="submit"
              className={`btn-submit ${isCancel ? 'btn-submit-danger' : 'btn-submit-warning'}`}
              disabled={loading}
            >
              {loading ? (
                <span>Đang xử lý...</span>
              ) : isCancel ? (
                <>
                  <AlertTriangle size={16} />
                  <span>Xác nhận Hủy ca khám</span>
                </>
              ) : (
                <>
                  <UserX size={16} />
                  <span>Xác nhận Vắng mặt (No-Show)</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
