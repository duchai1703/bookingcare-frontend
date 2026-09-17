// src/containers/System/Admin/Doctor/DoctorPayoutModal.jsx
import React, { useState } from 'react';
import { X, CreditCard, CheckCircle2, AlertCircle, Building, Landmark } from 'lucide-react';
import { createDoctorPayout } from '../../../../services/doctorManageService';

const formatCurrencyVND = (num) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0);
};

const DoctorPayoutModal = ({ isOpen, onClose, doctor, onSuccess }) => {
  if (!isOpen || !doctor) return null;

  const defaultAmount = doctor.pendingPayout > 0 ? doctor.pendingPayout : 0;
  const [amount, setAmount] = useState(defaultAmount);
  const [transactionRef, setTransactionRef] = useState(`PAY-VCB-${Date.now().toString().slice(-6)}`);
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Số tiền thanh toán phải lớn hơn 0 VNĐ!');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await createDoctorPayout(doctor.id, {
        amount: parsedAmount,
        transactionRef,
        paymentMethod,
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
      <div className="ops-modal-content" onClick={(e) => e.stopPropagation()}>
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
          <div className="modal-body">
            {error && (
              <div style={{ padding: '10px 12px', background: '#FEF2F2', border: '1px solid #FECDD3', borderRadius: 6, color: '#B91C1C', fontSize: '0.8rem', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertCircle size={14} />
                <span>{error}</span>
              </div>
            )}

            {/* Doctor & Bank Card */}
            <div style={{ padding: '12px 14px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0F172A' }}>
                  {doctor.doctorName || doctor.name}
                </div>
                <span style={{ fontSize: '0.78rem', color: '#059669', background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>
                  Hoa hồng: {doctor.commissionRate || 15}%
                </span>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#475569', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Landmark size={14} style={{ color: '#087F8C' }} />
                <span>Ngân hàng: <strong>{doctor.bankName || 'Vietcombank'}</strong></span>
                <span>• STK: <strong>{doctor.bankAccountNumber || '9876000000'}</strong></span>
              </div>
              <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: 4 }}>
                Chủ TK: <strong>{doctor.bankAccountName || doctor.doctorName}</strong>
              </div>
            </div>

            {/* Pending payout balance */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 8, marginBottom: 16 }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#92400E' }}>
                Số dư thực nhận chờ thanh toán:
              </span>
              <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#B45309' }}>
                {formatCurrencyVND(doctor.pendingPayout)}
              </span>
            </div>

            <div className="form-group">
              <label>Số tiền thanh toán thực chuyển (VNĐ) *</label>
              <input
                type="number"
                step="10000"
                min="1000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
              <div style={{ fontSize: '0.76rem', color: '#087F8C', fontWeight: 600, marginTop: 4 }}>
                = {formatCurrencyVND(amount)}
              </div>
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
                <option value="cash">Tiền mặt tại phòng tài chính</option>
                <option value="other">Hình thức khác</option>
              </select>
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
              Hủy
            </button>
            <button type="submit" className="btn-submit" disabled={loading} style={{ background: '#059669', borderColor: '#059669' }}>
              <CheckCircle2 size={14} />
              <span>{loading ? 'Đang chuyển...' : 'Xác nhận Thanh toán'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DoctorPayoutModal;
