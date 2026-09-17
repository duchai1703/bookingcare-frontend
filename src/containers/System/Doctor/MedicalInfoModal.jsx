// src/containers/System/Doctor/MedicalInfoModal.jsx
// [Phase D.6] Modal bác sĩ ghi nhận thông tin khám bệnh + đơn thuốc
import React, { useEffect, useState } from 'react';
import { getAllMedicines } from '../../../services/catalogService';
import { updateMedicalInfo } from '../../../services/doctorService';
import './MedicalInfoModal.scss';

const MedicalInfoModal = ({ booking, onClose, onSaved }) => {
  const [form, setForm] = useState({
    symptoms: booking?.symptoms || '',
    clinicalNotes: booking?.clinicalNotes || '',
    diagnosis: booking?.diagnosis || '',
    followUpDate: booking?.followUpDate || '',
    careInstructions: booking?.careInstructions || '',
  });
  const [medicines, setMedicines] = useState(
    (booking?.bookingMedicines || []).map(bm => ({
      medicineId: bm.medicineId || '',
      quantity: bm.quantity || 1,
      dosage: bm.dosage || '',
    }))
  );
  const [allMedicines, setAllMedicines] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getAllMedicines({ isActive: true })
      .then(res => {
        const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res?.data?.data) ? res.data.data : []);
        if (res?.errCode === 0 || res?.data?.errCode === 0) setAllMedicines(list);
      })
      .catch(console.error);
  }, []);

  const updateField = (field, value) => setForm(p => ({ ...p, [field]: value }));

  const addMedicine = () => {
    setMedicines(prev => [...prev, { medicineId: '', quantity: 1, dosage: '' }]);
  };

  const updateMedicineRow = (i, field, value) => {
    setMedicines(prev => {
      const arr = [...prev];
      arr[i] = { ...arr[i], [field]: value };
      return arr;
    });
  };

  const removeMedicine = (i) => {
    setMedicines(prev => prev.filter((_, j) => j !== i));
  };

  const handleSave = async () => {
    setError('');
    setSaving(true);
    try {
      const validMedicines = medicines.filter(m => m.medicineId);
      const res = await updateMedicalInfo(booking.id, {
        ...form,
        medicines: validMedicines,
      });
      if (res?.errCode === 0 || res?.data?.errCode === 0) {
        onSaved();
      } else {
        setError(res?.message || res?.data?.message || 'Có lỗi xảy ra');
      }
    } catch (err) {
      setError('Không thể lưu. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="medical-modal-overlay" onClick={onClose}>
      <div className="medical-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <h3>📝 Ghi nhận thông tin khám</h3>
            <p className="patient-name">
              Bệnh nhân: <strong>{booking?.patientName || 'N/A'}</strong>
              {' · '}{booking?.date} · {booking?.timeTypeBooking?.valueVi}
            </p>
          </div>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {error && <div className="error-banner">{error}</div>}

          <div className="field-group">
            <label>🤒 Triệu chứng</label>
            <textarea
              rows={3}
              placeholder="Mô tả triệu chứng bệnh nhân báo cáo..."
              value={form.symptoms}
              onChange={e => updateField('symptoms', e.target.value)}
            />
          </div>

          <div className="field-group">
            <label>🔬 Ghi chú lâm sàng</label>
            <textarea
              rows={3}
              placeholder="Kết quả khám, quan sát lâm sàng..."
              value={form.clinicalNotes}
              onChange={e => updateField('clinicalNotes', e.target.value)}
            />
          </div>

          <div className="field-group">
            <label>📋 Chẩn đoán</label>
            <textarea
              rows={2}
              placeholder="Chẩn đoán cuối cùng..."
              value={form.diagnosis}
              onChange={e => updateField('diagnosis', e.target.value)}
            />
          </div>

          <div className="field-row">
            <div className="field-group">
              <label>📅 Ngày tái khám</label>
              <input
                type="date"
                value={form.followUpDate}
                onChange={e => updateField('followUpDate', e.target.value)}
              />
            </div>
          </div>

          <div className="field-group">
            <label>🏠 Hướng dẫn chăm sóc tại nhà</label>
            <textarea
              rows={2}
              placeholder="Hướng dẫn chế độ ăn uống, sinh hoạt..."
              value={form.careInstructions}
              onChange={e => updateField('careInstructions', e.target.value)}
            />
          </div>

          {/* Đơn thuốc */}
          <div className="medicine-section">
            <div className="medicine-header">
              <label>💊 Đơn thuốc</label>
              <button className="btn-add-medicine" onClick={addMedicine}>
                + Thêm thuốc
              </button>
            </div>

            {medicines.length === 0 && (
              <p className="empty-medicines">Chưa có thuốc trong đơn. Nhấn "+ Thêm thuốc" để kê đơn.</p>
            )}

            {medicines.map((m, i) => (
              <div key={i} className="medicine-row">
                <select
                  value={m.medicineId}
                  onChange={e => updateMedicineRow(i, 'medicineId', e.target.value)}
                >
                  <option value="">-- Chọn thuốc --</option>
                  {allMedicines.map(med => (
                    <option key={med.id} value={med.id}>
                      {med.name} {med.concentration ? `(${med.concentration})` : ''}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  placeholder="SL"
                  value={m.quantity}
                  onChange={e => updateMedicineRow(i, 'quantity', e.target.value)}
                  style={{ width: '70px' }}
                />
                <input
                  placeholder="Liều dùng (vd: 1 viên/ngày sau ăn)"
                  value={m.dosage}
                  onChange={e => updateMedicineRow(i, 'dosage', e.target.value)}
                />
                <button className="btn-remove" onClick={() => removeMedicine(i)}>✕</button>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose} disabled={saving}>Hủy</button>
          <button className="btn-save" onClick={handleSave} disabled={saving}>
            {saving ? '⏳ Đang lưu...' : '💾 Lưu thông tin'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MedicalInfoModal;
