// src/containers/System/Admin/Doctor/CommissionModal.jsx
import React, { useState } from 'react';
import { X, Percent, Save, AlertCircle } from 'lucide-react';
import { updateDoctorCommission } from '../../../../services/doctorManageService';

const CommissionModal = ({ isOpen, onClose, doctor, onSuccess }) => {
  if (!isOpen || !doctor) return null;

  const [commissionRate, setCommissionRate] = useState(doctor.commissionRate || 15);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const rate = parseFloat(commissionRate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      setError('Tỷ lệ hoa hồng phải từ 0% đến 100%');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await updateDoctorCommission(doctor.id, {
        newRate: rate,
        reason: reason || 'Điều chỉnh hoa hồng định kỳ',
      });

      if (res && res.errCode === 0) {
        if (onSuccess) onSuccess(res.data);
        onClose();
      } else {
        setError(res?.errMessage || 'Không thể cập nhật hoa hồng');
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
            <Percent size={18} style={{ color: '#087F8C' }} />
            <h3 className="modal-title">Cấu hình Hoa hồng Bác sĩ</h3>
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

            <div style={{ padding: '10px 12px', background: '#F8FAFC', borderRadius: 8, marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0F172A' }}>
                {doctor.doctorName || doctor.name}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748B' }}>
                Mã: {doctor.doctorCode || `#${doctor.id}`} • Chuyên khoa: {doctor.specialtyName || '—'}
              </div>
            </div>

            <div className="form-group">
              <label>Tỷ lệ Hoa hồng Nền tảng giữ lại (%) *</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(e.target.value)}
                  required
                />
                <span style={{ position: 'absolute', right: 12, top: 9, color: '#64748B', fontWeight: 600 }}>%</span>
              </div>
              <small style={{ color: '#64748B', fontSize: '0.74rem' }}>
                Doanh thu thực nhận của bác sĩ = Doanh thu gộp × (100% - {commissionRate || 0}%)
              </small>
            </div>

            <div className="form-group">
              <label>Lý do điều chỉnh (Lưu vào Audit Log)</label>
              <textarea
                rows={3}
                placeholder="VD: Điều chỉnh theo phụ lục hợp đồng năm 2026..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-cancel" onClick={onClose} disabled={loading}>
              Hủy
            </button>
            <button type="submit" className="btn-submit" disabled={loading}>
              <Save size={14} />
              <span>{loading ? 'Đang lưu...' : 'Lưu tỷ lệ'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CommissionModal;
