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
  Clock
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

  const [refundRate, setRefundRate] = useState(booking?.refundRate || policy.suggestedRate || 100);
  const [refundAmount, setRefundAmount] = useState(booking?.refundAmount || policy.suggestedAmount || originalPrice);
  const [bankName, setBankName] = useState(booking?.bankName || primaryBank?.bankName || 'BIDV');
  const [accountNumber, setAccountNumber] = useState(booking?.bankAccountNumber || primaryBank?.accountNumber || '');
  const [accountHolder, setAccountHolder] = useState(booking?.bankAccountName || primaryBank?.accountHolder || patient?.fullName || '');
  const [transactionRef, setTransactionRef] = useState('');
  const [notes, setNotes] = useState('Hoàn tiền theo chính sách hủy lịch khám y tế');
  const [submitting, setSubmitting] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

  const handleRateChange = (newRate) => {
    setRefundRate(newRate);
    const amt = Math.round((originalPrice * newRate) / 100);
    setRefundAmount(amt);
  };

  const handleConfirmRefund = async () => {
    if (!accountNumber || !accountHolder) {
      toast.error('Vui lòng nhập đầy đủ thông tin tài khoản ngân hàng thụ hưởng!');
      return;
    }

    setSubmitting(true);
    try {
      const res = await processAdminRefund({
        bookingId: booking.id,
        refundRate,
        refundAmount,
        bankName,
        accountNumber,
        accountHolder,
        notes: `${notes} [Mã GD: ${transactionRef || 'N/A'}]`,
      });

      if (res && res.errCode === 0) {
        toast.success('Xác nhận hoàn tiền thành công!');
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
      <div className="refund-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CircleDollarSign size={20} color="#38BDF8" />
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
        <div className="modal-body">
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
                  <span>Số tiền đã hoàn:</span>
                  <strong style={{ color: '#059669', fontSize: '1.05rem' }}>{formatCurrencyVND(receiptData.refundAmount)}</strong>
                </div>
                <div className="policy-row">
                  <span>Ngân hàng thụ hưởng:</span>
                  <strong>{receiptData.bankName} - {receiptData.accountNumber}</strong>
                </div>
                <div className="policy-row">
                  <span>Chủ tài khoản:</span>
                  <strong>{receiptData.accountHolder}</strong>
                </div>
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

              {/* Bank Account Selection / Input */}
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A', margin: '14px 0 8px 0' }}>
                Tài Khoản Ngân Hàng Nhận Tiền
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
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="Nhập số tài khoản..."
                  />
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

              <div className="form-group">
                <label>Mã giao dịch chuyển khoản ngân hàng (nếu có):</label>
                <input
                  type="text"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  placeholder="Mã FT/Trace ngân hàng..."
                />
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          {receiptData ? (
            <button className="btn-confirm-refund" onClick={onClose}>
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
              >
                {submitting ? 'Đang xử lý...' : `Xác nhận hoàn ${formatCurrencyVND(refundAmount)}`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default RefundModal;
