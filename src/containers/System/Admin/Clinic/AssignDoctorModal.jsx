// src/containers/System/Admin/Clinic/AssignDoctorModal.jsx
import React, { useState, useEffect } from 'react';
import { X, UserPlus, AlertCircle, CheckCircle2 } from 'lucide-react';
import { getAdminDoctorsList } from '../../../../services/doctorManageService';
import { assignDoctorToClinic } from '../../../../services/clinicManageService';

const AssignDoctorModal = ({ isOpen, onClose, clinic, onSuccess }) => {
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (!isOpen) return;
    const fetchDoctors = async () => {
      setLoading(true);
      try {
        const res = await getAdminDoctorsList({ page: 1, limit: 100 });
        if (res && res.errCode === 0) {
          setDoctors(res.data?.doctors || []);
        }
      } catch (err) {
        console.error('Failed to load doctors:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDoctors();
    setSelectedDoctorId('');
    setMessage({ type: '', text: '' });
  }, [isOpen]);

  if (!isOpen || !clinic) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDoctorId) {
      setMessage({ type: 'error', text: 'Vui lòng chọn bác sĩ để phân bổ vào cơ sở' });
      return;
    }

    setSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      const res = await assignDoctorToClinic(clinic.id, { doctorId: selectedDoctorId });
      if (res && res.errCode === 0) {
        setMessage({ type: 'success', text: 'Gán bác sĩ vào cơ sở thành công!' });
        setTimeout(() => {
          if (onSuccess) onSuccess();
          onClose();
        }, 800);
      } else {
        setMessage({ type: 'error', text: res?.errMessage || 'Không thể gán bác sĩ' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Lỗi: ' + err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(3px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: 12,
          maxWidth: 480,
          width: '100%',
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
          overflow: 'hidden',
          animation: 'modalSlideUp 0.18s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: '#F0FDFA',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#087F8C',
              }}
            >
              <UserPlus size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#0F172A' }}>
                Gán Bác sĩ vào Cơ sở Y tế
              </h3>
              <div style={{ fontSize: '0.76rem', color: '#64748B', marginTop: 2 }}>
                {clinic.name}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#94A3B8',
              padding: 4,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ padding: 20 }}>
          {message.text && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 8,
                marginBottom: 16,
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: message.type === 'success' ? '#ECFDF5' : '#FEF2F2',
                color: message.type === 'success' ? '#047857' : '#B91C1C',
                border: `1px solid ${message.type === 'success' ? '#A7F3D0' : '#FECDD3'}`,
              }}
            >
              {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{message.text}</span>
            </div>
          )}

          <div style={{ marginBottom: 18 }}>
            <label
              style={{
                display: 'block',
                fontSize: '0.78rem',
                fontWeight: 700,
                color: '#334155',
                marginBottom: 6,
              }}
            >
              Chọn Bác sĩ điều động / công tác:
            </label>
            <select
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              disabled={loading || submitting}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #CBD5E1',
                fontSize: '0.85rem',
                outline: 'none',
                background: '#ffffff',
                boxSizing: 'border-box',
              }}
            >
              <option value="">-- Chọn bác sĩ ({doctors.length} nhân sự) --</option>
              {doctors.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.doctorName} — {doc.specialtyName || 'Chuyên khoa'} ({doc.doctorCode})
                </option>
              ))}
            </select>
          </div>

          <div
            style={{
              padding: 12,
              background: '#F8FAFC',
              borderRadius: 8,
              border: '1px solid #E2E8F0',
              fontSize: '0.76rem',
              color: '#64748B',
              marginBottom: 20,
              lineHeight: 1.5,
            }}
          >
            💡 <strong>Lưu ý:</strong> Khi gán bác sĩ vào cơ sở y tế này, toàn bộ lịch khám và các lượt đặt khám tiếp theo của bác sĩ sẽ được liên kết trực tiếp vào cơ sở.
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={{
                padding: '8px 16px',
                borderRadius: 6,
                border: '1px solid #CBD5E1',
                background: '#ffffff',
                fontSize: '0.82rem',
                fontWeight: 600,
                color: '#475569',
                cursor: 'pointer',
              }}
            >
              Đóng
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedDoctorId}
              style={{
                padding: '8px 18px',
                borderRadius: 6,
                border: '1px solid #087F8C',
                background: '#087F8C',
                fontSize: '0.82rem',
                fontWeight: 700,
                color: '#ffffff',
                cursor: submitting || !selectedDoctorId ? 'not-allowed' : 'pointer',
                opacity: submitting || !selectedDoctorId ? 0.7 : 1,
              }}
            >
              {submitting ? 'Đang xử lý...' : 'Xác nhận Gán'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssignDoctorModal;
