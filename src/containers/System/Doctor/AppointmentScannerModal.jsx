import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { verifyDoctorCheckin } from '../../../services/doctorService';
import {
  QrCode,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  Calendar,
  Phone,
  CreditCard,
  ArrowRight,
  X,
  Sparkles,
  Stethoscope,
} from 'lucide-react';
import './AppointmentScannerModal.scss';

const AppointmentScannerModal = ({ isOpen, onClose, onSelectBooking }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('manual'); // 'manual' | 'qr'
  const [inputCode, setInputCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [checkinResult, setCheckinResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setInputCode('');
      setCheckinResult(null);
      setErrorMsg('');
      setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 150);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    const query = inputCode.trim();
    if (!query) {
      toast.warning('Vui lòng nhập mã khám bệnh (Ví dụ: #BK-459 hoặc 459)!');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setCheckinResult(null);

    try {
      const res = await verifyDoctorCheckin(query);
      if (res && res.errCode === 0 && res.data) {
        setCheckinResult(res.data);
        toast.success('Tìm thấy thông tin lịch hẹn!');
      } else {
        setErrorMsg(res?.message || 'Không tìm thấy lịch hẹn phù hợp!');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Mã tiếp nhận không hợp lệ hoặc bạn không có quyền xử lý!';
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmCheckin = () => {
    if (!checkinResult) return;
    if (onSelectBooking) {
      onSelectBooking(checkinResult);
    }
    onClose();
  };

  const renderStatusBadge = (statusId) => {
    switch (statusId) {
      case 'S1':
        return <span className="sc-badge sc-badge--pending">⏳ Chờ xác nhận</span>;
      case 'S2':
        return <span className="sc-badge sc-badge--confirmed">🟢 Đã xác nhận (Chờ khám)</span>;
      case 'S3':
        return <span className="sc-badge sc-badge--done">✅ Đã khám xong</span>;
      case 'S4':
        return <span className="sc-badge sc-badge--cancelled">🚫 Đã hủy</span>;
      default:
        return <span className="sc-badge">{statusId}</span>;
    }
  };

  return (
    <div className="appointment-scanner-overlay" onClick={onClose}>
      <div className="appointment-scanner-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sc-header">
          <div className="sc-title-group">
            <div className="sc-icon-box">
              <QrCode size={22} />
            </div>
            <div>
              <h3>Tiếp nhận khám bệnh</h3>
              <p>Tra cứu nhanh qua mã khám #BK-xxx hoặc mã QR bệnh nhân</p>
            </div>
          </div>
          <button type="button" className="btn-close-scanner" onClick={onClose} title="Đóng">
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="sc-tabs">
          <button
            type="button"
            className={`sc-tab-btn ${activeTab === 'manual' ? 'active' : ''}`}
            onClick={() => setActiveTab('manual')}
          >
            <Search size={16} />
            <span>Nhập mã khám bệnh</span>
          </button>
          <button
            type="button"
            className={`sc-tab-btn ${activeTab === 'qr' ? 'active' : ''}`}
            onClick={() => setActiveTab('qr')}
          >
            <QrCode size={16} />
            <span>Dán chuỗi QR Code</span>
          </button>
        </div>

        {/* Body */}
        <div className="sc-body">
          {/* Form tìm kiếm */}
          <form onSubmit={handleSearch} className="sc-search-form">
            <div className="sc-input-wrapper">
              <span className="sc-prefix-icon">
                {activeTab === 'manual' ? '#' : <QrCode size={18} />}
              </span>
              <input
                ref={inputRef}
                type="text"
                className="sc-input"
                placeholder={
                  activeTab === 'manual'
                    ? 'Nhập mã khám (Ví dụ: #BK-459, BK-459, 459)...'
                    : 'Dán toàn bộ chuỗi token hoặc quét mã QR...'
                }
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                disabled={isLoading}
              />
              {inputCode && (
                <button
                  type="button"
                  className="btn-clear-input"
                  onClick={() => setInputCode('')}
                  title="Xóa"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="btn-sc-submit"
              disabled={isLoading || !inputCode.trim()}
            >
              {isLoading ? (
                <>
                  <span className="sc-spinner" /> Đang tra cứu...
                </>
              ) : (
                <>
                  <Search size={16} /> Tra cứu
                </>
              )}
            </button>
          </form>

          {/* Hướng dẫn nhanh */}
          <div className="sc-hint-box">
            <Sparkles size={14} />
            <span>
              Mẹo: Bệnh nhân có thể xuất trình mã khám từ mục <strong>Lịch sử khám</strong> trên điện thoại.
            </span>
          </div>

          {/* Lỗi cảnh báo */}
          {errorMsg && (
            <div className="sc-alert-error">
              <AlertCircle size={18} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Kết quả tìm kiếm */}
          {checkinResult && (
            <div className="sc-result-card">
              <div className="sc-result-header">
                <div className="sc-booking-code">
                  <span className="code-tag">MÃ LỊCH HẸN</span>
                  <strong>#BK-{checkinResult.id}</strong>
                </div>
                <div>{renderStatusBadge(checkinResult.statusId)}</div>
              </div>

              <div className="sc-result-grid">
                <div className="sc-info-item">
                  <User size={15} className="item-icon" />
                  <div>
                    <label>Bệnh nhân</label>
                    <strong>
                      {checkinResult.patientName ||
                        `${checkinResult.patientData?.lastName || ''} ${checkinResult.patientData?.firstName || ''}`.trim() ||
                        'Chưa cập nhật'}
                    </strong>
                  </div>
                </div>

                <div className="sc-info-item">
                  <Phone size={15} className="item-icon" />
                  <div>
                    <label>Số điện thoại</label>
                    <span>
                      {checkinResult.patientPhoneNumber ||
                        checkinResult.patientData?.phoneNumber ||
                        'Chưa cung cấp'}
                    </span>
                  </div>
                </div>

                <div className="sc-info-item">
                  <Clock size={15} className="item-icon" />
                  <div>
                    <label>Khung giờ hẹn</label>
                    <span>
                      {checkinResult.timeTypeBooking?.valueVi ||
                        checkinResult.timeType ||
                        '--'}
                    </span>
                  </div>
                </div>

                <div className="sc-info-item">
                  <Calendar size={15} className="item-icon" />
                  <div>
                    <label>Ngày khám</label>
                    <span>{checkinResult.date || '--'}</span>
                  </div>
                </div>

                <div className="sc-info-item full-row">
                  <CreditCard size={15} className="item-icon" />
                  <div>
                    <label>Thanh toán</label>
                    <span className={`payment-pill ${checkinResult.paymentStatus === 'paid' ? 'paid' : 'unpaid'}`}>
                      {checkinResult.paymentStatus === 'paid' ? '✓ Đã thanh toán trực tuyến' : '⏳ Thanh toán tại cơ sở y tế'}
                    </span>
                  </div>
                </div>

                {checkinResult.reason && (
                  <div className="sc-info-item full-row reason-item">
                    <label>Lý do khám:</label>
                    <p>{checkinResult.reason}</p>
                  </div>
                )}
              </div>

              {/* Action */}
              <div className="sc-result-actions">
                <button
                  type="button"
                  className="btn-start-encounter-now"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    background: '#10b981',
                    color: '#fff',
                    border: 'none',
                    padding: '10px 18px',
                    borderRadius: '8px',
                    fontWeight: '700',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    marginBottom: '8px',
                    width: '100%',
                  }}
                  onClick={() => {
                    onClose();
                    navigate(`/doctor-dashboard/encounter/${checkinResult.id}`);
                  }}
                >
                  <Stethoscope size={17} />
                  <span>Bắt đầu phiên khám ngay (Encounter Workspace)</span>
                  <ArrowRight size={17} />
                </button>

                <button
                  type="button"
                  className="btn-confirm-select"
                  onClick={handleConfirmCheckin}
                >
                  <CheckCircle2 size={16} />
                  <span>Mở chi tiết trên danh sách ca khám</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sc-footer">
          <button type="button" className="btn-sc-close" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default AppointmentScannerModal;
