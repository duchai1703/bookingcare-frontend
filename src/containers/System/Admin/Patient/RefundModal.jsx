// src/containers/System/Admin/Patient/RefundModal.jsx
// Healthcare Financial Flow: Dedicated Refund Processing & Policy Calculation Modal
import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import {
  CircleDollarSign,
  X,
  CheckCircle2,
  AlertTriangle,
  Building2,
  CreditCard,
  User,
  Clock,
  Wallet,
  Landmark,
  QrCode,
  Copy,
  Check,
  Zap,
  ArrowRight
} from 'lucide-react';
import { processAdminRefund } from '../../../../services/patientManageService';

const formatCurrencyVND = (num) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0);
};

const RefundModal = ({ booking, patient, onClose, onSuccess }) => {
  const language = useSelector((state) => state.app.language);
  const primaryBank = patient?.primaryBankAccount || patient?.bankAccounts?.find((b) => b.isPrimary) || null;

  // Policy calculation
  const originalPrice = booking?.bookingPrice || 0;
  const policy = booking?.policyEstimate || {
    hoursSinceCreation: 12,
    suggestedRate: 100,
    suggestedAmount: originalPrice,
    penaltyFee: 0,
  };

  const [refundChannel, setRefundChannel] = useState('WALLET'); // 'WALLET' | 'BANK_TRANSFER'
  const [refundRate, setRefundRate] = useState(booking?.refundRate || policy.suggestedRate || 100);
  const [refundAmount, setRefundAmount] = useState(booking?.refundAmount || policy.suggestedAmount || originalPrice);
  const [bankName, setBankName] = useState(booking?.bankName || primaryBank?.bankName || 'Vietcombank');
  const [accountNumber, setAccountNumber] = useState(booking?.bankAccountNumber || primaryBank?.accountNumber || '');
  const [accountHolder, setAccountHolder] = useState(booking?.bankAccountName || primaryBank?.accountHolder || patient?.fullName || '');
  const [transactionRef, setTransactionRef] = useState(`RF-VCB-${Date.now().toString().slice(-6)}`);
  const [showQr, setShowQr] = useState(false);
  const [copiedStk, setCopiedStk] = useState(false);
  const [notes, setNotes] = useState('Hoàn tiền theo chính sách hủy lịch khám y tế');
  const [submitting, setSubmitting] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

  // VietQR Dynamic URL (Chuẩn Napas 247)
  const vietQrUrl = `https://img.vietqr.io/image/${encodeURIComponent(bankName)}-${encodeURIComponent(accountNumber)}-compact2.png?amount=${refundAmount || 0}&addInfo=${encodeURIComponent(transactionRef)}&accountName=${encodeURIComponent(accountHolder)}`;

  const handleCopyStk = () => {
    if (accountNumber) {
      navigator.clipboard.writeText(accountNumber);
      setCopiedStk(true);
      setTimeout(() => setCopiedStk(false), 2000);
    }
  };

  const handleConfirmRefund = async () => {
    if (refundChannel === 'BANK_TRANSFER' && (!accountNumber || !accountHolder)) {
      toast.error('Vui lòng nhập đầy đủ thông tin tài khoản ngân hàng thụ hưởng!');
      return;
    }

    setSubmitting(true);
    try {
      const res = await processAdminRefund({
        bookingId: booking.id,
        refundRate,
        refundAmount,
        refundChannel,
        bankName: refundChannel === 'BANK_TRANSFER' ? bankName : null,
        accountNumber: refundChannel === 'BANK_TRANSFER' ? accountNumber : null,
        accountHolder: refundChannel === 'BANK_TRANSFER' ? accountHolder : null,
        transactionRef: refundChannel === 'BANK_TRANSFER' ? transactionRef : null,
        notes: `${notes} [Kênh: ${refundChannel === 'WALLET' ? 'Ví BookingCare' : 'Ngân hàng'}]`,
      });

      if (res && res.errCode === 0) {
        toast.success(refundChannel === 'WALLET' ? 'Đã hoàn tiền tức thì vào Ví BookingCare!' : 'Xác nhận hoàn tiền ngân hàng thành công!');
        setReceiptData(res.data);
        if (onSuccess) onSuccess(res.data);
      } else {
        toast.error(res?.errMessage || 'Không thể xử lý hoàn tiền');
      }
    } catch (err) {
      console.error('>>> Refund submit error:', err);
      toast.error('Lỗi khi gửi yêu cầu hoàn tiền');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="refund-modal-backdrop" onClick={onClose}>
      <div className="refund-modal-card" style={{ maxWidth: 580 }} onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CircleDollarSign size={20} color="#087F8C" />
            <h3 className="modal-title">
              {receiptData
                ? 'Phiếu Xác Nhận Hoàn Tiền Thành Công'
                : `Xử Lý Hoàn Tiền — Ca khám ${booking?.bookingCode || `#BK-${booking?.id}`}`}
            </h3>
          </div>
          <button className="btn-close-modal" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ maxHeight: '78vh', overflowY: 'auto' }}>
          {receiptData ? (
            /* Receipt Confirmation View */
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <CheckCircle2 size={48} color="#059669" style={{ margin: '0 auto 12px auto' }} />
              <h4 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', marginBottom: 4 }}>
                Giao Dịch Hoàn Tiền Đã Được Ghi Nhận
              </h4>
              <p style={{ fontSize: '0.85rem', color: '#64748B', marginBottom: 16 }}>
                Mã phiếu kiểm toán: <strong style={{ color: '#087F8C', fontFamily: 'monospace' }}>{receiptData.refundReceiptCode}</strong>
              </p>

              <div className="policy-box" style={{ textAlign: 'left' }}>
                <div className="policy-row">
                  <span>Kênh hoàn tiền:</span>
                  <strong style={{ color: '#087F8C' }}>
                    {receiptData.refundChannel === 'WALLET' ? 'Ví BookingCare nội bộ (Tức thì)' : 'Chuyển khoản Ngân hàng Trực tiếp'}
                  </strong>
                </div>
                <div className="policy-row">
                  <span>Số tiền đã hoàn:</span>
                  <strong style={{ color: '#059669', fontSize: '1.05rem' }}>{formatCurrencyVND(receiptData.refundAmount)}</strong>
                </div>
                {receiptData.refundChannel === 'BANK_TRANSFER' && (
                  <>
                    <div className="policy-row">
                      <span>Ngân hàng thụ hưởng:</span>
                      <strong>{receiptData.bankName} - {receiptData.accountNumber}</strong>
                    </div>
                    <div className="policy-row">
                      <span>Chủ tài khoản:</span>
                      <strong>{receiptData.accountHolder}</strong>
                    </div>
                  </>
                )}
                {receiptData.refundChannel === 'WALLET' && (
                  <div className="policy-row">
                    <span>Trạng thái Sổ cái:</span>
                    <span style={{ color: '#059669', fontWeight: 700 }}>✓ Đã ghi Có Sổ cái kép (CREDIT)</span>
                  </div>
                )}
                <div className="policy-row">
                  <span>Người thực hiện:</span>
                  <strong>{receiptData.processedBy}</strong>
                </div>
              </div>
            </div>
          ) : (
            /* Refund Flow Form */
            <>
              {/* Context Summary */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', marginBottom: 14, color: '#475569' }}>
                <div>
                  <strong>Bệnh nhân:</strong> {patient?.fullName} ({patient?.patientCode})
                </div>
                <div>
                  <strong>Bác sĩ:</strong> {booking?.doctorName}
                </div>
              </div>

              {/* Policy Engine Breakdown */}
              <div className="policy-box">
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#087F8C', textTransform: 'uppercase', marginBottom: 6 }}>
                  Quy Tắc Tính Hoàn Tiền Tự Động
                </div>
                <div className="policy-row">
                  <span>Giá khám ban đầu:</span>
                  <strong>{formatCurrencyVND(originalPrice)}</strong>
                </div>
                <div className="policy-row">
                  <span>Thời gian từ khi đặt đến khi hủy:</span>
                  <span>{policy.hoursSinceCreation} giờ</span>
                </div>
                <div className="policy-row">
                  <span>Chính sách áp dụng:</span>
                  <span style={{ fontWeight: 600, color: '#059669' }}>
                    {policy.hoursSinceCreation <= 24 ? 'Hủy ≤ 24h (Hoàn 100%)' : policy.hoursSinceCreation <= 72 ? 'Hủy 24h-72h (Hoàn 75%)' : 'Hủy > 72h (Hoàn 50%)'}
                  </span>
                </div>
                <div className="policy-row total-highlight">
                  <span>Số tiền được hoàn:</span>
                  <span className="refund-amt">{formatCurrencyVND(refundAmount)}</span>
                </div>
              </div>

              {/* Refund Channel Selector */}
              <div style={{ margin: '16px 0 12px 0' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A', display: 'block', marginBottom: 8 }}>
                  Chọn Kênh Hoàn Tiền:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div
                    onClick={() => setRefundChannel('WALLET')}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 8,
                      border: `2px solid ${refundChannel === 'WALLET' ? '#087F8C' : '#E2E8F0'}`,
                      background: refundChannel === 'WALLET' ? '#F0FDFA' : '#F8FAFC',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: '0.86rem', color: refundChannel === 'WALLET' ? '#087F8C' : '#1E293B' }}>
                        <Wallet size={16} />
                        <span>Ví BookingCare</span>
                      </div>
                      <span style={{ fontSize: '0.68rem', background: '#CCFBF1', color: '#0F766E', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                        Khuyên dùng
                      </span>
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#64748B' }}>
                      Hoàn tiền tức thì vào ví, tự động ghi Có Sổ cái kép.
                    </div>
                  </div>

                  <div
                    onClick={() => setRefundChannel('BANK_TRANSFER')}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 8,
                      border: `2px solid ${refundChannel === 'BANK_TRANSFER' ? '#087F8C' : '#E2E8F0'}`,
                      background: refundChannel === 'BANK_TRANSFER' ? '#F0FDFA' : '#F8FAFC',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: '0.86rem', color: refundChannel === 'BANK_TRANSFER' ? '#087F8C' : '#1E293B', marginBottom: 4 }}>
                      <Landmark size={16} />
                      <span>Chuyển khoản Ngân hàng</span>
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#64748B' }}>
                      Chuyển trực tiếp về tài khoản ngân hàng của bệnh nhân.
                    </div>
                  </div>
                </div>
              </div>

              {/* Conditional Channel Details */}
              {refundChannel === 'WALLET' ? (
                <div style={{ padding: '12px 14px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, marginTop: 10, marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#166534', fontWeight: 600, fontSize: '0.82rem', marginBottom: 4 }}>
                    <Zap size={16} color="#16A34A" />
                    <span>Hoàn tiền Tức thì & Minh bạch Kế toán:</span>
                  </div>
                  <p style={{ fontSize: '0.76rem', color: '#15803D', margin: 0, lineHeight: 1.45 }}>
                    Số tiền <strong>{formatCurrencyVND(refundAmount)}</strong> sẽ được cộng ngay vào ví bệnh nhân. Bệnh nhân có thể sử dụng đặt ca khám mới hoặc tự tạo lệnh rút tiền theo quy định SLA.
                  </p>
                </div>
              ) : (
                /* Bank Transfer Details */
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>
                    Thông Tin Tài Khoản Ngân Hàng Thụ Hưởng
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div className="form-group">
                      <label>Ngân hàng:</label>
                      <input
                        type="text"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        placeholder="VD: BIDV, Vietcombank..."
                      />
                    </div>
                    <div className="form-group">
                      <label>Số tài khoản:</label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="text"
                          value={accountNumber}
                          onChange={(e) => setAccountNumber(e.target.value)}
                          placeholder="Nhập số tài khoản..."
                        />
                        {accountNumber && (
                          <button
                            type="button"
                            onClick={handleCopyStk}
                            style={{ position: 'absolute', right: 6, top: 8, background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: 4, padding: '2px 6px', fontSize: '0.7rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                          >
                            {copiedStk ? <Check size={12} color="#16A34A" /> : <Copy size={12} />}
                            <span>{copiedStk ? 'Đã chép' : 'Chép'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Tên chủ tài khoản (in hoa):</label>
                    <input
                      type="text"
                      value={accountHolder}
                      onChange={(e) => setAccountHolder(e.target.value)}
                      placeholder="VD: NGUYEN VAN A"
                    />
                  </div>

                  {/* VietQR Quick Scan Toggle */}
                  <div style={{ marginBottom: 12 }}>
                    <button
                      type="button"
                      onClick={() => setShowQr(!showQr)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        padding: '8px 12px',
                        background: showQr ? '#F1F5F9' : '#EFF6FF',
                        border: '1px solid #BFDBFE',
                        borderRadius: 6,
                        color: '#1D4ED8',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      <QrCode size={16} />
                      <span>{showQr ? 'Ẩn mã VietQR' : 'Mở mã VietQR chuyển khoản (NAPAS 247)'}</span>
                    </button>

                    {showQr && (
                      <div style={{ marginTop: 10, padding: 12, background: '#FFFFFF', border: '1px dashed #93C5FD', borderRadius: 8, textAlign: 'center' }}>
                        <p style={{ fontSize: '0.75rem', color: '#475569', marginBottom: 8 }}>
                          Dùng app ngân hàng bất kỳ quét mã để tự động điền STK, số tiền và nội dung hoàn tiền:
                        </p>
                        <img
                          src={vietQrUrl}
                          alt="VietQR Refund"
                          style={{ maxWidth: 220, maxHeight: 220, margin: '0 auto', display: 'block', borderRadius: 6, border: '1px solid #E2E8F0' }}
                        />
                        <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: 6 }}>
                          Nội dung CK: <strong style={{ color: '#0F172A' }}>{transactionRef}</strong>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label>Mã giao dịch chuyển khoản ngân hàng (nếu có):</label>
                    <input
                      type="text"
                      value={transactionRef}
                      onChange={(e) => setTransactionRef(e.target.value)}
                      placeholder="Mã FT/Trace ngân hàng..."
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          {receiptData ? (
            <button className="btn-confirm-refund" onClick={onClose} style={{ background: '#087F8C' }}>
              Hoàn tất & Đóng
            </button>
          ) : (
            <>
              <button className="btn-cancel" onClick={onClose} disabled={submitting}>
                Hủy bỏ
              </button>
              <button
                className="btn-confirm-refund"
                onClick={handleConfirmRefund}
                disabled={submitting}
                style={{ background: refundChannel === 'WALLET' ? '#087F8C' : '#059669' }}
              >
                {submitting ? 'Đang xử lý...' : `Xác nhận hoàn ${formatCurrencyVND(refundAmount)} ${refundChannel === 'WALLET' ? 'vào Ví' : 'qua Ngân hàng'}`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default RefundModal;

