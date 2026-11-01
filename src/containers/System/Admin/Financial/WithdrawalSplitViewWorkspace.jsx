// src/containers/System/Admin/Financial/WithdrawalSplitViewWorkspace.jsx
// [RAMP FINTECH DESIGN SYSTEM] Cửa Sổ Làm Việc Duyệt Chi & Rút Tiền 2 Cột (Split-View Workspace Window)
// Học tập 100% từ hình ảnh 3 (ramp_ui_3.png) & hình ảnh 4 (ramp_ui_4.png) của Ramp:
// - Pane Trái (50%): Chứng từ thanh toán ngân hàng (Payment Order) / VietQR / Sao kê với thanh zoom công cụ.
// - Pane Phải (50%): Bóc tách tính an toàn, thông tin người thụ hưởng, liên kết ca khám 90/10, ô nhập Mã GD Ngân hàng thật ("số gd").
// - Sticky Footer: Nút Vàng Chanh Ramp Primary (#D4FF00) ghim cố định ở đáy.

import React, { useState } from 'react';
import moment from 'moment';
import { toast } from 'react-toastify';
import {
  X,
  Copy,
  Check,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Building2,
  FileText,
  User,
  ShieldCheck,
  ArrowRight,
  Clock,
  CheckCircle2,
  XCircle,
  ExternalLink,
  DollarSign,
  Maximize2
} from 'lucide-react';
import './WithdrawalSplitViewWorkspace.scss';

const formatVND = (amount) => {
  return (Number(amount) || 0).toLocaleString('vi-VN') + ' ₫';
};

export default function WithdrawalSplitViewWorkspace({
  isOpen,
  withdrawal,
  onClose,
  onSubmitAction,
  isProcessing
}) {
  const [activeLeftTab, setActiveLeftTab] = useState('voucher'); // 'voucher' | 'qr'
  const [activeRightTab, setActiveRightTab] = useState('overview'); // 'overview' | 'activity'
  const [zoomScale, setZoomScale] = useState(1);
  const [copiedSTK, setCopiedSTK] = useState(false);

  // Form states
  const [actionType, setActionType] = useState('TRANSFER'); // 'TRANSFER' | 'REJECT'
  const [bankTxnRef, setBankTxnRef] = useState(withdrawal?.bankTransactionRef || '');
  const [adminNote, setAdminNote] = useState(withdrawal?.adminNote || '');

  if (!isOpen || !withdrawal) return null;

  const owner = withdrawal.wallet?.owner;
  const isDoctor = withdrawal.wallet?.walletType === 'DOCTOR';
  const isPending = withdrawal.status === 'PENDING';

  const handleCopySTK = () => {
    if (withdrawal.accountNumber) {
      navigator.clipboard.writeText(withdrawal.accountNumber);
      setCopiedSTK(true);
      toast.success('Đã sao chép số tài khoản: ' + withdrawal.accountNumber);
      setTimeout(() => setCopiedSTK(false), 2000);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (actionType === 'TRANSFER' && !bankTxnRef.trim()) {
      toast.warning('Vui lòng nhập Mã tham chiếu GD ngân hàng thật (VD: VCB-FT260918)');
      return;
    }
    onSubmitAction({
      action: actionType,
      bankTxnRef: bankTxnRef.trim(),
      adminNote: adminNote.trim(),
    });
  };

  // Tạo URL VietQR Quick Transfer tự động
  const vietQrUrl = `https://img.vietqr.io/image/${encodeURIComponent(withdrawal.bankName || 'VCB')}-${encodeURIComponent(withdrawal.accountNumber || '')}-compact2.png?amount=${withdrawal.amount}&addInfo=${encodeURIComponent(`BKCARE WTH${withdrawal.id}`)}&accountName=${encodeURIComponent(withdrawal.accountHolderName || '')}`;

  return (
    <div className="ramp-splitview-backdrop" onClick={() => !isProcessing && onClose()}>
      <div className="ramp-splitview-container" onClick={(e) => e.stopPropagation()}>
        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* TOP BAR: Navigation Breadcrumbs & Close Action Button         */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="ramp-splitview-topbar">
          <div className="topbar-left">
            <span className="ramp-brand-mark">BookingCare Cashflow</span>
            <span className="divider">/</span>
            <span className="workspace-title">
              Ủy nhiệm chi #{withdrawal.id} — {owner?.lastName} {owner?.firstName}
            </span>
            {isDoctor && <span className="ramp-tag-role doctor">Bác sĩ</span>}
            <span className={`ramp-tag-status ${withdrawal.status?.toLowerCase()}`}>
              {withdrawal.status === 'PENDING' && '● Chờ phê duyệt'}
              {withdrawal.status === 'TRANSFERRED' && '● Đã giải ngân'}
              {withdrawal.status === 'REJECTED' && '● Đã từ chối'}
              {withdrawal.status === 'CANCELLED' && '● Đã hủy'}
            </span>
          </div>

          <div className="topbar-right">
            <button
              type="button"
              className="topbar-close-btn"
              onClick={() => !isProcessing && onClose()}
              title="Đóng cửa sổ (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* MAIN 2-COLUMN WORKSPACE                                       */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="ramp-splitview-body">
          {/* ───────────────────────────────────────────────────────────── */}
          {/* PANE TRÁI (50%): CHỨNG TỪ THANH TOÁN & VIETQR CHUYỂN KHOẢN    */}
          {/* ───────────────────────────────────────────────────────────── */}
          <div className="splitview-pane pane-left">
            <div className="pane-header-tabs">
              <button
                type="button"
                className={`pane-tab-item ${activeLeftTab === 'voucher' ? 'active' : ''}`}
                onClick={() => setActiveLeftTab('voucher')}
              >
                <FileText size={14} />
                <span>Ủy nhiệm chi (Payment Order)</span>
              </button>
              <button
                type="button"
                className={`pane-tab-item ${activeLeftTab === 'qr' ? 'active' : ''}`}
                onClick={() => setActiveLeftTab('qr')}
              >
                <DollarSign size={14} />
                <span>Mã VietQR quét nhanh</span>
              </button>

              <div className="pane-zoom-toolbar">
                <button
                  type="button"
                  title="Thu nhỏ"
                  onClick={() => setZoomScale((s) => Math.max(0.7, s - 0.1))}
                >
                  <ZoomOut size={13} />
                </button>
                <span className="zoom-level">{Math.round(zoomScale * 100)}%</span>
                <button
                  type="button"
                  title="Phóng to"
                  onClick={() => setZoomScale((s) => Math.min(1.4, s + 0.1))}
                >
                  <ZoomIn size={13} />
                </button>
                <button
                  type="button"
                  title="Đặt lại zoom"
                  onClick={() => setZoomScale(1)}
                >
                  <RotateCcw size={13} />
                </button>
              </div>
            </div>

            <div className="pane-content-viewport">
              <div
                className="voucher-canvas-wrapper"
                style={{ transform: `scale(${zoomScale})`, transformOrigin: 'top center' }}
              >
                {activeLeftTab === 'voucher' ? (
                  /* Phiếu Ủy Nhiệm Chi Điện Tử Chuẩn Ngân Hàng */
                  <div className="bank-voucher-paper">
                    <div className="voucher-header">
                      <div className="bank-logo-box">
                        <Building2 size={24} className="bank-icon" />
                        <div>
                          <div className="bank-corp-name">NGÂN HÀNG THƯƠNG MẠI CỔ PHẦN VIỆT NAM</div>
                          <div className="voucher-meta">HỆ THỐNG THANH TOÁN ĐỐI SOÁT TỰ ĐỘNG T+0</div>
                        </div>
                      </div>
                      <div className="voucher-title-box">
                        <h3 className="voucher-title">LỆNH CHI TIỀN / PAYMENT VOUCHER</h3>
                        <div className="voucher-code">Số: UNC-{withdrawal.id.toString().padStart(6, '0')}</div>
                        <div className="voucher-date">
                          Ngày tạo: {moment(withdrawal.createdAt).format('DD/MM/YYYY HH:mm')}
                        </div>
                      </div>
                    </div>

                    <div className="voucher-divider" />

                    {/* Khối đơn vị trích tiền */}
                    <div className="voucher-section">
                      <div className="section-title">A. ĐƠN VỊ TRÍCH TIỀN (SÀN BOOKINGCARE):</div>
                      <div className="section-grid">
                        <div className="grid-label">Đơn vị trả tiền:</div>
                        <div className="grid-val font-semibold">CÔNG TY CỔ PHẦN BOOKINGCARE VIỆT NAM</div>
                        <div className="grid-label">Tài khoản thanh toán:</div>
                        <div className="grid-val font-mono">0011001234567 — VCB HỘI SỞ CHÍNH</div>
                        <div className="grid-label">Nguồn quỹ bảo chứng:</div>
                        <div className="grid-val">Tài khoản Ngân Hàng Thật VCB Cty (Khối Vốn #1)</div>
                      </div>
                    </div>

                    {/* Khối người thụ hưởng */}
                    <div className="voucher-section beneficiary-section">
                      <div className="section-title">B. ĐƠN VỊ THỤ HƯỞNG (BENEFICIARY):</div>
                      <div className="section-grid">
                        <div className="grid-label">Người nhận tiền:</div>
                        <div className="grid-val highlight-beneficiary">
                          {withdrawal.accountHolderName?.toUpperCase() || `${owner?.lastName} ${owner?.firstName}`.toUpperCase()}
                        </div>
                        <div className="grid-label">Ngân hàng thụ hưởng:</div>
                        <div className="grid-val font-semibold">{withdrawal.bankName}</div>
                        <div className="grid-label">Số tài khoản nhận:</div>
                        <div className="grid-val font-mono highlight-stk">
                          {withdrawal.accountNumber}
                        </div>
                        <div className="grid-label">Số tiền bằng số:</div>
                        <div className="grid-val highlight-amount ramp-tabular-num">
                          {formatVND(withdrawal.amount)}
                        </div>
                        <div className="grid-label">Nội dung chuyển:</div>
                        <div className="grid-val">
                          {isDoctor
                            ? `Quyet toan thu lao ca kham #WTH-${withdrawal.id} BookingCare`
                            : `Rut tien vi dien tu #WTH-${withdrawal.id} BookingCare`}
                        </div>
                      </div>
                    </div>

                    {/* Chữ ký điện tử */}
                    <div className="voucher-signatures">
                      <div className="sig-block">
                        <div className="sig-title">Người Lập Lệnh</div>
                        <div className="sig-stamp">HỆ THỐNG VÍ TỰ ĐỘNG</div>
                        <div className="sig-sub">Đã xác thực OTP</div>
                      </div>
                      <div className="sig-block">
                        <div className="sig-title">Kế Toán Trưởng</div>
                        <div className="sig-stamp approved">ĐÃ KIỂM SOÁT</div>
                        <div className="sig-sub">Bảo chứng 100% Tiền Mặt</div>
                      </div>
                      <div className="sig-block">
                        <div className="sig-title">Người Phê Duyệt (Admin)</div>
                        <div className="sig-stamp pending">
                          {withdrawal.status === 'TRANSFERRED' ? 'ĐÃ GIẢI NGÂN' : 'CHỜ KÝ DUYỆT'}
                        </div>
                        <div className="sig-sub">
                          {withdrawal.admin
                            ? `${withdrawal.admin.lastName} ${withdrawal.admin.firstName}`
                            : 'Ban Giám Đốc'}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Hiển thị Mã VietQR để Admin quét bằng App Ngân Hàng Thật */
                  <div className="vietqr-canvas-box">
                    <div className="qr-guide-header">
                      <div className="qr-guide-title">Quét Mã VietQR Bằng App Ngân Hàng (VCB Digibank)</div>
                      <div className="qr-guide-sub">
                        Hệ thống tự động điền STK, Số tiền ({formatVND(withdrawal.amount)}) và Nội dung chuyển tiền chính xác.
                      </div>
                    </div>

                    <div className="qr-image-container">
                      <img
                        src={vietQrUrl}
                        alt="VietQR Quick Payment"
                        className="vietqr-image"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    </div>

                    <div className="qr-manual-info">
                      <div className="info-row">
                        <span>Ngân hàng nhận:</span>
                        <strong>{withdrawal.bankName}</strong>
                      </div>
                      <div className="info-row">
                        <span>Số tài khoản:</span>
                        <strong className="font-mono">{withdrawal.accountNumber}</strong>
                        <button type="button" className="copy-btn-inline" onClick={handleCopySTK}>
                          {copiedSTK ? <Check size={12} /> : <Copy size={12} />}
                        </button>
                      </div>
                      <div className="info-row">
                        <span>Số tiền cần chuyển:</span>
                        <strong className="text-red font-mono">{formatVND(withdrawal.amount)}</strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ───────────────────────────────────────────────────────────── */}
          {/* PANE PHẢI (50%): BÓC TÁCH AN TOÀN & FORM DUYỆT CHUẨN RAMP     */}
          {/* ───────────────────────────────────────────────────────────── */}
          <div className="splitview-pane pane-right">
            <div className="pane-header-tabs">
              <button
                type="button"
                className={`pane-tab-item ${activeRightTab === 'overview' ? 'active' : ''}`}
                onClick={() => setActiveRightTab('overview')}
              >
                <span>Tổng quan & Phê duyệt</span>
              </button>
              <button
                type="button"
                className={`pane-tab-item ${activeRightTab === 'activity' ? 'active' : ''}`}
                onClick={() => setActiveRightTab('activity')}
              >
                <span>Nhật ký truy vết (Audit Trail)</span>
              </button>
            </div>

            <div className="pane-right-scrollable">
              {activeRightTab === 'overview' ? (
                <div className="overview-form-content">
                  {/* Hộp Cảnh Báo An Toàn Thanh Khoản Chuẩn Ramp */}
                  <div className="ramp-anomaly-box">
                    <div className="anomaly-header">
                      <ShieldCheck size={16} className="anomaly-icon" />
                      <strong>Xác nhận điều kiện giải ngân thực tế (Solvency Gatekeeper)</strong>
                    </div>
                    <ul className="anomaly-checklist">
                      <li>
                        Số dư tiền mặt tại VCB Công ty hiện hữu được kiểm tra trước khi hạch toán giải ngân.
                      </li>
                      <li>
                        Số tiền <strong>{formatVND(withdrawal.amount)}</strong> đã được đóng băng tại ví của người yêu cầu (không bị chi tiêu kép).
                      </li>
                      {withdrawal.isOverdue && (
                        <li className="warning-item">
                          <AlertTriangle size={13} />
                          Yêu cầu đã quá hạn SLA cam kết ({withdrawal.appliedSlaDays || 1} ngày). Cần ưu tiên giải quyết ngay!
                        </li>
                      )}
                    </ul>
                  </div>

                  {/* Thẻ Thông Tin Người Thụ Hưởng (Vendor / Beneficiary Card) */}
                  <div className="entity-card">
                    <div className="entity-header">
                      <div className="entity-avatar">
                        <User size={18} />
                      </div>
                      <div className="entity-details">
                        <div className="entity-name">
                          {owner?.lastName} {owner?.firstName}
                          {isDoctor && <span className="entity-badge">Bác sĩ chuyên khoa</span>}
                        </div>
                        <div className="entity-sub">{owner?.email} • {owner?.phoneNumber || 'Chưa cập nhật SĐT'}</div>
                      </div>
                    </div>

                    <div className="bank-account-strip">
                      <div className="strip-item">
                        <span className="strip-label">Ngân hàng:</span>
                        <span className="strip-val">{withdrawal.bankName}</span>
                      </div>
                      <div className="strip-item">
                        <span className="strip-label">Số tài khoản:</span>
                        <span className="strip-val font-mono">{withdrawal.accountNumber}</span>
                        <button type="button" className="copy-btn-mini" onClick={handleCopySTK}>
                          {copiedSTK ? <Check size={11} /> : <Copy size={11} />}
                        </button>
                      </div>
                      <div className="strip-item">
                        <span className="strip-label">Chủ tài khoản:</span>
                        <span className="strip-val">{withdrawal.accountHolderName}</span>
                      </div>
                    </div>
                  </div>

                  {/* Bóc Tách Luồng Tiền Gắn Với Ca Khám (90/10 Whiteboard Linkage) */}
                  <div className="cashflow-breakdown-card">
                    <div className="breakdown-title">
                      Bóc tách cơ cấu giải ngân thù lao (Mô hình Escrow 3 bước)
                    </div>
                    <div className="breakdown-table">
                      <div className="breakdown-row">
                        <span>Số tiền yêu cầu rút ra ngân hàng thật:</span>
                        <strong className="ramp-tabular-num text-red">{formatVND(withdrawal.amount)}</strong>
                      </div>
                      <div className="breakdown-row sub">
                        <span>• Tỷ lệ thù lao bác sĩ hưởng (Bước 3):</span>
                        <span className="font-semibold text-emerald-700">90% tổng phí dịch vụ ca khám</span>
                      </div>
                      <div className="breakdown-row sub">
                        <span>• Tỷ lệ hoa hồng nền tảng giữ lại (Lời sàn):</span>
                        <span className="font-semibold text-indigo-700">10% tích lũy vào Quỹ Doanh Thu</span>
                      </div>
                      <div className="breakdown-row total">
                        <span>Biến động số dư VCB Công ty sau giải ngân:</span>
                        <strong className="ramp-tabular-num text-red">-{formatVND(withdrawal.amount)}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Form Phê Duyệt / Từ Chối */}
                  {isPending ? (
                    <form id="ramp-approval-form" onSubmit={handleFormSubmit} className="approval-form-block">
                      <div className="form-group">
                        <label className="form-label">Hành động phê duyệt:</label>
                        <div className="action-toggle-group">
                          <button
                            type="button"
                            className={`toggle-btn ${actionType === 'TRANSFER' ? 'active-transfer' : ''}`}
                            onClick={() => setActionType('TRANSFER')}
                          >
                            <CheckCircle2 size={15} />
                            <span>Đã Chuyển Khoản Ngân Hàng (Duyệt)</span>
                          </button>
                          <button
                            type="button"
                            className={`toggle-btn ${actionType === 'REJECT' ? 'active-reject' : ''}`}
                            onClick={() => setActionType('REJECT')}
                          >
                            <XCircle size={15} />
                            <span>Từ Chối & Hoàn Tiền Về Ví</span>
                          </button>
                        </div>
                      </div>

                      {actionType === 'TRANSFER' ? (
                        <div className="form-group">
                          <label className="form-label required">
                            Mã Giao Dịch Ngân Hàng Thật (Số GD VCB / NAPAS) *:
                          </label>
                          <input
                            type="text"
                            className="ramp-input font-mono"
                            placeholder="Ví dụ: VCB-FT26091800192, NAPAS-9812..."
                            value={bankTxnRef}
                            onChange={(e) => setBankTxnRef(e.target.value)}
                            required
                          />
                          <div className="form-help">
                            Bắt buộc ghi lại Mã giao dịch chuyển khoản thật từ App VCB để lưu cố định vào Sổ cái bất biến.
                          </div>
                        </div>
                      ) : (
                        <div className="form-group">
                          <label className="form-label required">Lý do từ chối giải ngân *:</label>
                          <textarea
                            className="ramp-textarea"
                            placeholder="Nhập lý do chi tiết để thông báo cho người dùng (ví dụ: Sai số tài khoản ngân hàng thụ hưởng, tài khoản bị khóa...)"
                            value={adminNote}
                            onChange={(e) => setAdminNote(e.target.value)}
                            rows={3}
                            required
                          />
                        </div>
                      )}

                      <div className="form-group">
                        <label className="form-label">Ghi chú đối soát nội bộ (Tùy chọn):</label>
                        <input
                          type="text"
                          className="ramp-input"
                          placeholder="Nhập ghi chú cho kế toán / kiểm toán viên..."
                          value={actionType === 'TRANSFER' ? adminNote : ''}
                          onChange={(e) => setAdminNote(e.target.value)}
                        />
                      </div>
                    </form>
                  ) : (
                    <div className="processed-summary-box">
                      <div className="box-title">Yêu cầu này đã được xử lý</div>
                      <div className="box-grid">
                        <div className="grid-label">Trạng thái:</div>
                        <div className="grid-val font-semibold">{withdrawal.status}</div>
                        {withdrawal.bankTransactionRef && (
                          <>
                            <div className="grid-label">Mã GD Ngân Hàng:</div>
                            <div className="grid-val font-mono font-bold text-emerald-700">
                              {withdrawal.bankTransactionRef}
                            </div>
                          </>
                        )}
                        {withdrawal.admin && (
                          <>
                            <div className="grid-label">Người xử lý:</div>
                            <div className="grid-val">
                              {withdrawal.admin.lastName} {withdrawal.admin.firstName}
                            </div>
                          </>
                        )}
                        {withdrawal.adminNote && (
                          <>
                            <div className="grid-label">Ghi chú xử lý:</div>
                            <div className="grid-val">{withdrawal.adminNote}</div>
                          </>
                        )}
                        {withdrawal.transferredAt && (
                          <>
                            <div className="grid-label">Thời gian giải ngân:</div>
                            <div className="grid-val">
                              {moment(withdrawal.transferredAt).format('DD/MM/YYYY HH:mm:ss')}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Tab Nhật Ký Truy Vết (Audit Trail) */
                <div className="activity-trail-content">
                  <div className="trail-timeline">
                    <div className="trail-item">
                      <div className="trail-bullet completed" />
                      <div className="trail-body">
                        <div className="trail-title">Tạo yêu cầu rút tiền</div>
                        <div className="trail-time">
                          {moment(withdrawal.createdAt).format('DD/MM/YYYY HH:mm:ss')}
                        </div>
                        <div className="trail-desc">
                          Người dùng tạo lệnh rút {formatVND(withdrawal.amount)} về tài khoản {withdrawal.bankName} - {withdrawal.accountNumber}.
                        </div>
                      </div>
                    </div>

                    <div className="trail-item">
                      <div className="trail-bullet completed" />
                      <div className="trail-body">
                        <div className="trail-title">Khóa số dư khả dụng (Escrow Lock)</div>
                        <div className="trail-time">
                          {moment(withdrawal.createdAt).format('DD/MM/YYYY HH:mm:ss')}
                        </div>
                        <div className="trail-desc">
                          Hệ thống tự động trừ available_balance và tăng locked_balance trên ví để chống gian lận rút kép.
                        </div>
                      </div>
                    </div>

                    {withdrawal.status === 'TRANSFERRED' && (
                      <div className="trail-item">
                        <div className="trail-bullet success" />
                        <div className="trail-body">
                          <div className="trail-title">Phê duyệt & Chuyển khoản thành công</div>
                          <div className="trail-time">
                            {moment(withdrawal.transferredAt || withdrawal.updatedAt).format('DD/MM/YYYY HH:mm:ss')}
                          </div>
                          <div className="trail-desc">
                            Mã GD ngân hàng: <strong>{withdrawal.bankTransactionRef}</strong>. Trừ locked_balance về 0.
                          </div>
                        </div>
                      </div>
                    )}

                    {withdrawal.status === 'REJECTED' && (
                      <div className="trail-item">
                        <div className="trail-bullet danger" />
                        <div className="trail-body">
                          <div className="trail-title">Yêu cầu bị từ chối</div>
                          <div className="trail-time">
                            {moment(withdrawal.updatedAt).format('DD/MM/YYYY HH:mm:ss')}
                          </div>
                          <div className="trail-desc">
                            Lý do: {withdrawal.adminNote || 'Không có ghi chú'}. Số tiền đã được hoàn trả lại ví khả dụng.
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* STICKY FOOTER: Nút Vàng Chanh Ramp Primary                */}
            {/* ═══════════════════════════════════════════════════════════ */}
            <div className="ramp-splitview-footer">
              <div className="footer-left">
                <span className="sla-indicator">
                  <Clock size={13} />
                  <span>SLA xử lý: {withdrawal.appliedSlaDays || 1} ngày làm việc</span>
                </span>
              </div>

              <div className="footer-actions">
                <button
                  type="button"
                  className="ramp-btn-secondary"
                  onClick={() => !isProcessing && onClose()}
                  disabled={isProcessing}
                >
                  <span>{isPending ? 'Hủy bỏ' : 'Đóng'}</span>
                </button>

                {isPending && (
                  <button
                    type="submit"
                    form="ramp-approval-form"
                    className="ramp-btn-primary"
                    disabled={isProcessing}
                  >
                    <span>
                      {isProcessing
                        ? 'Đang hạch toán...'
                        : actionType === 'TRANSFER'
                        ? 'Phê duyệt & Giải ngân ->'
                        : 'Xác nhận từ chối ->'}
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

