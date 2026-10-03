// src/containers/System/Admin/Doctor/DoctorPayoutModal.jsx
import React, { useState } from 'react';
import {
  X,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Building,
  Landmark,
  QrCode,
  UploadCloud,
  Copy,
  Check,
  Info,
  ExternalLink
} from 'lucide-react';
import { createDoctorPayout } from '../../../../services/doctorManageService';

const formatCurrencyVND = (num) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0);
};

const DoctorPayoutModal = ({ isOpen, onClose, doctor, onSuccess }) => {
  if (!isOpen || !doctor) return null;

  const pendingBal = Number(doctor.pendingPayout) || 0;
  const isZeroBalance = pendingBal <= 0;

  const [amount, setAmount] = useState(pendingBal > 0 ? pendingBal : 0);
  const [transactionRef, setTransactionRef] = useState(`PAY-VCB-${Date.now().toString().slice(-6)}`);
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [note, setNote] = useState('');
  const [receiptImage, setReceiptImage] = useState(null);
  const [showQr, setShowQr] = useState(false);
  const [copiedStk, setCopiedStk] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const bankName = doctor.bankName || 'Vietcombank';
  const bankAccNo = doctor.bankAccountNumber || '9876000000';
  const bankAccName = doctor.bankAccountName || doctor.doctorName || doctor.name || '';

  // VietQR Dynamic URL (Chuẩn Napas 247)
  const vietQrUrl = `https://img.vietqr.io/image/${encodeURIComponent(bankName)}-${encodeURIComponent(bankAccNo)}-compact2.png?amount=${amount || 0}&addInfo=${encodeURIComponent(transactionRef)}&accountName=${encodeURIComponent(bankAccName)}`;

  const handleCopyStk = () => {
    if (bankAccNo) {
      navigator.clipboard.writeText(bankAccNo);
      setCopiedStk(true);
      setTimeout(() => setCopiedStk(false), 2000);
    }
  };

  const handleFillMaxAmount = () => {
    setAmount(pendingBal);
    setError('');
  };

  const handleReceiptUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('Kích thước ảnh biên lai tối đa 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setReceiptImage(reader.result);
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isZeroBalance) {
      setError('Bác sĩ không có thù lao chờ quyết toán (Số dư: 0 VNĐ)!');
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Số tiền thanh toán phải lớn hơn 0 VNĐ!');
      return;
    }

    if (parsedAmount > pendingBal) {
      setError(`Số tiền chuyển (${formatCurrencyVND(parsedAmount)}) không được vượt quá số dư chờ thanh toán (${formatCurrencyVND(pendingBal)})!`);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await createDoctorPayout(doctor.id, {
        amount: parsedAmount,
        transactionRef,
        paymentMethod,
        receiptImage,
        note: note || 'Thanh toán đối soát kỳ khám qua chuyển khoản ngân hàng',
      });

      if (res && res.errCode === 0) {
        if (onSuccess) onSuccess(res.data);
        onClose();
      } else {
        setError(res?.errMessage || 'Không thể ghi nhận thanh toán');
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ops-modal-backdrop" onClick={onClose}>
      <div className="ops-modal-content" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CreditCard size={18} style={{ color: '#059669' }} />
            <h3 className="modal-title">Quyết toán Thanh toán cho Bác sĩ</h3>
          </div>
          <button className="btn-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ maxHeight: '78vh', overflowY: 'auto' }}>
            {error && (
              <div style={{ padding: '10px 12px', background: '#FEF2F2', border: '1px solid #FECDD3', borderRadius: 6, color: '#B91C1C', fontSize: '0.8rem', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {/* Doctor & Bank Card */}
            <div style={{ padding: '12px 14px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#0F172A' }}>
                  {doctor.doctorName || doctor.name}
                </div>
                <span style={{ fontSize: '0.78rem', color: '#059669', background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>
                  Hoa hồng: {doctor.commissionRate || 15}%
                </span>
              </div>

              <div style={{ fontSize: '0.8rem', color: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Landmark size={14} style={{ color: '#087F8C' }} />
                  <span>Ngân hàng: <strong>{bankName}</strong></span>
                  <span>• STK: <strong style={{ color: '#0369A1' }}>{bankAccNo}</strong></span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyStk}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 6px', fontSize: '0.72rem', background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: 4, cursor: 'pointer', color: '#475569' }}
                >
                  {copiedStk ? <Check size={12} color="#16A34A" /> : <Copy size={12} />}
                  <span>{copiedStk ? 'Đã chép' : 'Sao chép'}</span>
                </button>
              </div>

              <div style={{ fontSize: '0.76rem', color: '#64748B', marginTop: 6 }}>
                Chủ TK: <strong style={{ color: '#0F172A' }}>{bankAccName}</strong>
              </div>
            </div>

            {/* Pending payout balance */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 14px',
              background: isZeroBalance ? '#F0FDF4' : '#FEF3C7',
              border: `1px solid ${isZeroBalance ? '#BBF7D0' : '#FDE68A'}`,
              borderRadius: 8,
              marginBottom: 16
            }}>
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: isZeroBalance ? '#166534' : '#92400E' }}>
                  {isZeroBalance ? 'Thù lao đã được thanh toán đầy đủ:' : 'Số dư thực nhận chờ thanh toán:'}
                </div>
                {isZeroBalance && (
                  <div style={{ fontSize: '0.72rem', color: '#15803D', marginTop: 2 }}>
                    Bác sĩ hiện không có ca khám nào tồn đọng chưa quyết toán.
                  </div>
                )}
              </div>
              <span style={{ fontSize: '1.15rem', fontWeight: 800, color: isZeroBalance ? '#15803D' : '#B45309' }}>
                {formatCurrencyVND(pendingBal)}
              </span>
            </div>

            {/* Amount input with 100% button */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <label style={{ margin: 0 }}>Số tiền thanh toán thực chuyển (VNĐ) *</label>
                {!isZeroBalance && (
                  <button
                    type="button"
                    onClick={handleFillMaxAmount}
                    style={{ fontSize: '0.72rem', color: '#059669', background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '2px 8px', borderRadius: 4, cursor: 'pointer', fontWeight: 600 }}
                  >
                    Thanh toán tối đa 100%
                  </button>
                )}
              </div>
              <input
                type="number"
                step="10000"
                min="1000"
                max={pendingBal > 0 ? pendingBal : undefined}
                value={amount}
                disabled={isZeroBalance}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
              <div style={{ fontSize: '0.76rem', color: '#087F8C', fontWeight: 600, marginTop: 4 }}>
                = {formatCurrencyVND(amount)}
              </div>
            </div>

            {/* VietQR Quick Scan Toggle */}
            <div style={{ marginBottom: 14 }}>
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
                    Dùng app ngân hàng bất kỳ quét mã để tự động điền STK, số tiền và nội dung chuyển:
                  </p>
                  <img
                    src={vietQrUrl}
                    alt="VietQR Payout"
                    style={{ maxWidth: 240, maxHeight: 240, margin: '0 auto', display: 'block', borderRadius: 6, border: '1px solid #E2E8F0' }}
                  />
                  <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: 6 }}>
                    Nội dung CK: <strong style={{ color: '#0F172A' }}>{transactionRef}</strong>
                  </div>
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Mã tham chiếu Giao dịch Ngân hàng *</label>
              <input
                type="text"
                placeholder="VD: FT26091700921, VCB-8899..."
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Hình thức thanh toán</label>
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                <option value="bank_transfer">Chuyển khoản Ngân hàng (Internet Banking / 247)</option>
                <option value="wallet">Chuyển vào Ví Bác sĩ nội bộ (Doctor Wallet)</option>
                <option value="cash">Tiền mặt tại phòng tài chính</option>
                <option value="other">Hình thức khác</option>
              </select>
            </div>

            {/* Receipt Upload */}
            <div className="form-group">
              <label>Ảnh chụp Ủy nhiệm chi / Biên lai chuyển khoản (Tùy chọn)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <label style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  background: '#F8FAFC',
                  border: '1px solid #CBD5E1',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: '0.78rem',
                  color: '#334155'
                }}>
                  <UploadCloud size={15} />
                  <span>Chọn tệp biên lai...</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleReceiptUpload}
                    style={{ display: 'none' }}
                  />
                </label>
                {receiptImage && (
                  <span style={{ fontSize: '0.74rem', color: '#059669', fontWeight: 600 }}>
                    ✓ Đã tải ảnh lên
                  </span>
                )}
              </div>
              {receiptImage && (
                <div style={{ marginTop: 8, position: 'relative', display: 'inline-block' }}>
                  <img
                    src={receiptImage}
                    alt="Biên lai"
                    style={{ maxHeight: 90, borderRadius: 4, border: '1px solid #E2E8F0' }}
                  />
                  <button
                    type="button"
                    onClick={() => setReceiptImage(null)}
                    style={{ position: 'absolute', top: -6, right: -6, background: '#EF4444', color: '#fff', border: 'none', borderRadius: '50%', width: 18, height: 18, fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    ×
                  </button>
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Ghi chú quyết toán</label>
              <textarea
                rows={2}
                placeholder="Ghi chú đợt quyết toán..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-cancel" onClick={onClose} disabled={loading}>
              Đóng
            </button>
            <button
              type="submit"
              className="btn-submit"
              disabled={loading || isZeroBalance}
              style={{
                background: isZeroBalance ? '#94A3B8' : '#059669',
                borderColor: isZeroBalance ? '#94A3B8' : '#059669',
                cursor: isZeroBalance ? 'not-allowed' : 'pointer'
              }}
            >
              <CheckCircle2 size={14} />
              <span>{loading ? 'Đang chuyển...' : isZeroBalance ? 'Không có thù lao chờ' : 'Xác nhận Thanh toán'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DoctorPayoutModal;
