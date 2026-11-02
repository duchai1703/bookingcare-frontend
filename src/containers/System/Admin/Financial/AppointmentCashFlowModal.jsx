// src/containers/System/Admin/Financial/AppointmentCashFlowModal.jsx
// [RAMP FINTECH] Màn Hình 2: Chi Tiết Dòng Tiền Của Một Lịch Khám (Appointment Cash Flow Drill-Down)
// Minh họa chi tiết 4 giai đoạn dòng tiền: Nạp tiền -> Đặt khám -> Phân chia 2 ngăn -> Ca khám hoàn tất.

import React from 'react';
import {
  X,
  ArrowRight,
  ArrowDown,
  CheckCircle2,
  Clock,
  ShieldCheck,
  CreditCard,
  Building2,
  FileSpreadsheet,
  User,
  Coins,
  ChevronRight,
  DollarSign
} from 'lucide-react';
import './AppointmentCashFlowModal.scss';

const formatMoney = (val) => (Number(val) || 0).toLocaleString('vi-VN') + ' ₫';

export default function AppointmentCashFlowModal({
  isOpen,
  onClose,
  bookingData,
  onNavigateTab
}) {
  if (!isOpen) return null;

  // Dữ liệu hiển thị (kết hợp dữ liệu ca khám thực tế hoặc mẫu đối chuẩn 500k - 300k - 270k)
  const booking = bookingData || {
    id: 'APT-0001',
    bookingId: 102,
    patientName: 'Nguyễn Văn A',
    patientEmail: 'nguyen.vana@gmail.com',
    doctorName: 'Bác sĩ Nguyễn Văn B',
    specialtyName: 'Tai - Mũi - Họng',
    status: 'COMPLETED',
    bookingPrice: 300000,
    doctorShare: 270000,
    platformFee: 30000,
    depositAmount: 500000,
    patientRemainingBalance: 200000,
    vnpayTxCode: 'VNP-15716601',
    paymentMethod: 'VNPAY',
    createdAt: '01/11/2026 09:30',
    completedAt: '01/11/2026 10:45',
  };

  const bookingPrice = Number(booking.bookingPrice) || 300000;
  const doctorShare = Number(booking.doctorShare) || 270000;
  const platformFee = Number(booking.platformFee) || 30000;
  const depositAmount = Number(booking.depositAmount) || 500000;
  const remainingBalance = Number(booking.patientRemainingBalance) || (depositAmount - bookingPrice);

  return (
    <div className="ramp-modal-backdrop" onClick={onClose}>
      <div className="ramp-modal-panel appointment-cashflow-modal" onClick={(e) => e.stopPropagation()}>
        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* HEADER: Tiêu đề & Thông tin định danh ca khám                 */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="modal-header">
          <div className="header-left">
            <button type="button" className="ramp-btn-ghost back-btn" onClick={onClose}>
              ← Quay lại
            </button>
            <div className="title-group">
              <h2 className="modal-title">CHI TIẾT DÒNG TIỀN CA KHÁM</h2>
              <span className="booking-ref-badge">Mã lịch khám: #{booking.id || booking.bookingId}</span>
            </div>
          </div>

          <div className="header-right">
            <span className="status-badge success">
              <CheckCircle2 size={13} />
              <span>Trạng thái: Đã hoàn tất</span>
            </span>
            <button type="button" className="close-icon-btn" onClick={onClose} title="Đóng">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* THÔNG TIN CHỦ THỂ */}
        <div className="appointment-meta-bar">
          <div className="meta-item">
            <User size={14} className="meta-icon" />
            <span className="meta-label">Bệnh nhân:</span>
            <strong className="meta-val">{booking.patientName}</strong>
          </div>
          <div className="meta-divider" />
          <div className="meta-item">
            <Coins size={14} className="meta-icon" />
            <span className="meta-label">Bác sĩ phụ trách:</span>
            <strong className="meta-val">{booking.doctorName}</strong>
          </div>
          <div className="meta-divider" />
          <div className="meta-item">
            <Clock size={14} className="meta-icon" />
            <span className="meta-label">Thời gian khám:</span>
            <span className="meta-val">{booking.completedAt || booking.createdAt}</span>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* 4 KHỐI DIỄN TIẾN DÒNG TIỀN THEO CHIỀU DỌC                      */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="flow-vertical-stack">
          {/* KHỐI 1: BỆNH NHÂN NẠP TIỀN */}
          <div className="flow-card-box step-1">
            <div className="card-top">
              <span className="step-pill">1. BỆNH NHÂN NẠP TIỀN</span>
              <span className="amount-tag text-emerald">+{formatMoney(depositAmount)}</span>
            </div>

            <div className="flow-pipeline">
              <div className="pipe-node">
                <span className="node-title">Bệnh nhân A</span>
                <span className="node-sub">VCB cá nhân</span>
              </div>
              <ArrowRight size={16} className="pipe-arrow" />
              <div className="pipe-node highlight">
                <span className="node-title">Giao dịch nạp VNPay</span>
                <span className="node-sub">Mã GD: {booking.vnpayTxCode || 'VNP-15716601'}</span>
              </div>
              <ArrowRight size={16} className="pipe-arrow" />
              <div className="pipe-node target">
                <span className="node-title">Ví Bệnh Nhân</span>
                <span className="node-sub">+{formatMoney(depositAmount)} Khả dụng</span>
              </div>
            </div>

            <div className="card-footer-meta">
              <span>Cổng thanh toán: <strong>VNPAY Sandbox</strong></span>
              <span>Mã giao dịch: <strong>{booking.vnpayTxCode || 'VNP-15716601'}</strong></span>
              <span className="text-emerald">Trạng thái: <strong>Thành công (IPN 00)</strong></span>
            </div>
          </div>

          <div className="flow-vertical-connector">
            <ArrowDown size={18} />
          </div>

          {/* KHỐI 2: BỆNH NHÂN ĐẶT LỊCH */}
          <div className="flow-card-box step-2">
            <div className="card-top">
              <span className="step-pill">2. BỆNH NHÂN ĐẶT LỊCH</span>
              <span className="amount-tag text-red">-{formatMoney(bookingPrice)}</span>
            </div>

            <div className="balance-calc-grid">
              <div className="calc-item">
                <span className="calc-label">Số dư ví trước đặt:</span>
                <strong className="calc-val">{formatMoney(depositAmount)}</strong>
              </div>
              <div className="calc-item highlight-minus">
                <span className="calc-label">Thanh toán lịch khám:</span>
                <strong className="calc-val text-red">-{formatMoney(bookingPrice)}</strong>
              </div>
              <div className="calc-item highlight-remaining">
                <span className="calc-label">Số dư ví sau thanh toán:</span>
                <strong className="calc-val text-body">{formatMoney(remainingBalance)}</strong>
              </div>
            </div>
            <p className="step-note">
              * Khoản tiền 300.000 ₫ được giữ trong két Ký quỹ Escrow (Two-Phase Commit). Tiền thật tại VCB Công ty được bảo toàn 100%.
            </p>
          </div>

          <div className="flow-vertical-connector">
            <ArrowDown size={18} />
          </div>

          {/* KHỐI 3: PHÂN CHIA DOANH THU */}
          <div className="flow-card-box step-3">
            <div className="card-top">
              <span className="step-pill">3. PHÂN CHIA DOANH THU (90% - 10%)</span>
              <span className="amount-tag text-indigo">Tổng thanh toán: {formatMoney(bookingPrice)}</span>
            </div>

            <div className="split-branches-container">
              <div className="branch-card doctor">
                <div className="branch-header">
                  <span className="branch-role">THÙ LAO BÁC SĨ (90%)</span>
                  <span className="branch-pct">90%</span>
                </div>
                <div className="branch-amount text-emerald">{formatMoney(doctorShare)}</div>
                <div className="branch-status">
                  <Clock size={12} />
                  <span>Trạng thái: Chờ hoàn tất ca khám</span>
                </div>
              </div>

              <div className="branch-card platform">
                <div className="branch-header">
                  <span className="branch-role">DOANH THU NỀN TẢNG (10%)</span>
                  <span className="branch-pct">10%</span>
                </div>
                <div className="branch-amount text-amber">{formatMoney(platformFee)}</div>
                <div className="branch-status">
                  <CheckCircle2 size={12} />
                  <span>Trạng thái: Đã phân bổ (Kế toán Sàn)</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flow-vertical-connector">
            <ArrowDown size={18} />
          </div>

          {/* KHỐI 4: CA KHÁM HOÀN TẤT */}
          <div className="flow-card-box step-4">
            <div className="card-top">
              <span className="step-pill success">4. CA KHÁM HOÀN TẤT & GIẢI NGÂN</span>
              <span className="amount-tag text-emerald">Đã ghi có ví Bác sĩ: +{formatMoney(doctorShare)}</span>
            </div>

            <div className="completion-summary-row">
              <div className="comp-item">
                <span className="comp-label">Khoản phải trả bác sĩ:</span>
                <strong className="comp-val">{formatMoney(doctorShare)}</strong>
              </div>
              <ArrowRight size={16} className="pipe-arrow" />
              <div className="comp-item highlight">
                <span className="comp-label">Ví Bác sĩ BS 01 ghi có:</span>
                <strong className="comp-val text-emerald">+{formatMoney(doctorShare)}</strong>
              </div>
              <div className="comp-item status">
                <span className="comp-label">Trạng thái số dư:</span>
                <span className="ramp-pill success">● Khả dụng (Được phép rút)</span>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* FOOTER: Nút thao tác đối soát & xem sổ cái                     */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="modal-footer">
          <div className="footer-actions">
            <button
              type="button"
              className="ramp-btn-secondary"
              onClick={() => {
                onClose();
                onNavigateTab && onNavigateTab('ledger');
              }}
            >
              <FileSpreadsheet size={13} />
              <span>Xem Sổ Cái Kép</span>
            </button>

            <button
              type="button"
              className="ramp-btn-secondary"
              onClick={() => {
                onClose();
                onNavigateTab && onNavigateTab('settlements');
              }}
            >
              <Coins size={13} />
              <span>Xem Quản Lý Rút Tiền</span>
            </button>

            <button
              type="button"
              className="ramp-btn-primary"
              onClick={onClose}
            >
              <span>Đóng Cửa Sổ</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

