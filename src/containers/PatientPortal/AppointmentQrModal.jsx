// src/containers/PatientPortal/AppointmentQrModal.jsx
// [Enterprise Medical UI] Modal hiển thị Mã QR khám bệnh bảo mật & Mã tra cứu #BK-xxx
import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'react-toastify';
import './AppointmentQrModal.scss';

const AppointmentQrModal = ({ isOpen, onClose, booking }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !booking) return null;

  // Payload mã QR định danh an toàn (Zero-leak PII): BKQ:{id}:{qrToken}
  const qrPayload = `BKQ:${booking.id}:${booking.qrToken || 'NO_TOKEN'}`;
  const displayCode = `BK-${booking.id}`;

  const handleCopyCode = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(displayCode);
      setCopied(true);
      toast.success(`Đã sao chép mã khám: #${displayCode}`);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  // Status mapping
  const renderStatus = () => {
    switch (booking.statusId) {
      case 'S1':
        return <span className="qr-badge qr-badge--pending">Chờ xác nhận</span>;
      case 'S2':
        return <span className="qr-badge qr-badge--confirmed">Đã xác nhận</span>;
      case 'S3':
        return <span className="qr-badge qr-badge--done">Đã khám</span>;
      case 'S4':
        return <span className="qr-badge qr-badge--cancelled">Đã hủy</span>;
      default:
        return <span className="qr-badge">Chưa xác định</span>;
    }
  };

  const doctorName = booking.doctorBookingData
    ? `BS. ${booking.doctorBookingData.lastName || ''} ${booking.doctorBookingData.firstName || ''}`.trim()
    : 'Bác sĩ phụ trách';

  return (
    <div className="appointment-qr-overlay" onClick={onClose}>
      <div className="appointment-qr-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="qr-card-header">
          <div className="qr-card-title">
            <i className="fas fa-qrcode" />
            <h3>Mã tiếp nhận khám bệnh</h3>
          </div>
          <button type="button" className="btn-close-qr" onClick={onClose} title="Đóng">
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="qr-card-body">
          <div className="qr-status-row">
            <span className="status-label">Trạng thái:</span>
            {renderStatus()}
          </div>

          {/* QR Code Container */}
          <div className="qr-visual-wrapper">
            <div className="qr-frame">
              <QRCodeSVG
                value={qrPayload}
                size={172}
                level="H"
                includeMargin={false}
                fgColor="#0f172a"
                bgColor="#ffffff"
              />
            </div>
          </div>

          {/* Reference Code & Copy Action */}
          <div className="qr-code-strip">
            <div className="code-text-group">
              <span className="code-label">MÃ KHÁM BỆNH</span>
              <strong className="code-val">#{displayCode}</strong>
            </div>
            <button
              type="button"
              className={`btn-copy-code ${copied ? 'copied' : ''}`}
              onClick={handleCopyCode}
              title="Sao chép mã khám"
            >
              <i className={`fas ${copied ? 'fa-check' : 'fa-copy'}`} />
              <span>{copied ? 'Đã chép' : 'Sao chép'}</span>
            </button>
          </div>

          {/* Summary Metadata */}
          <div className="qr-meta-summary">
            <div className="meta-row">
              <span className="meta-k">Bệnh nhân:</span>
              <strong className="meta-v">{booking.patientName || '--'}</strong>
            </div>
            <div className="meta-row">
              <span className="meta-k">Bác sĩ:</span>
              <span className="meta-v">{doctorName}</span>
            </div>
          </div>

          {/* Clinical Instruction */}
          <div className="qr-notice-box">
            <i className="fas fa-info-circle" />
            <p>
              Vui lòng đưa mã QR này hoặc cung cấp mã khám <strong>#{displayCode}</strong> cho bác sĩ hoặc nhân viên tiếp đón tại cơ sở y tế để tra cứu và tiếp nhận lượt khám nhanh chóng.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="qr-card-footer">
          <button type="button" className="btn-qr-done" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default AppointmentQrModal;
