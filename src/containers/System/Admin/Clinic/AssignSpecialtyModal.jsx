import React, { useState } from 'react';
import { toast } from 'react-toastify';
import clinicHierarchyService from '../../../../services/clinicHierarchyService';

const AssignSpecialtyModal = ({
  isOpen,
  onClose,
  clinicId,
  clinicName,
  availableSpecialties = [],
  clinicDoctors = [],
  onSuccess,
}) => {
  const [specialtyId, setSpecialtyId] = useState('');
  const [headDoctorId, setHeadDoctorId] = useState('');
  const [targetCapacity, setTargetCapacity] = useState(50);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!specialtyId) {
      toast.warning('Vui lòng chọn chuyên khoa cần triển khai');
      return;
    }

    setLoading(true);
    try {
      const res = await clinicHierarchyService.assignSpecialtyToClinic(clinicId, {
        specialtyId: parseInt(specialtyId, 10),
        headDoctorId: headDoctorId ? parseInt(headDoctorId, 10) : null,
        targetCapacity: parseInt(targetCapacity, 10) || 50,
        description,
        status: 'active',
      });

      if (res && res.errCode === 0) {
        toast.success(res.message || 'Triển khai chuyên khoa vào cơ sở y tế thành công!');
        onSuccess && onSuccess();
        onClose();
      } else {
        toast.error(res?.message || 'Có lỗi khi triển khai chuyên khoa');
      }
    } catch (error) {
      console.error('Error assigning specialty:', error);
      toast.error(error?.response?.data?.message || 'Không thể kết nối đến máy chủ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="custom-modal-overlay" onClick={onClose}>
      <div className="custom-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px' }}>
        <div className="custom-modal-header">
          <div>
            <h5 className="modal-title">🏥 Triển khai Chuyên khoa tại Cơ sở</h5>
            <span className="modal-subtitle">
              Cơ sở y tế: <strong>{clinicName}</strong>
            </span>
          </div>
          <button type="button" className="btn-close-custom" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="custom-modal-body">
            <div className="mb-3">
              <label className="form-label fw-bold">Chọn Chuyên khoa <span className="text-danger">*</span></label>
              <select
                className="form-select custom-input"
                value={specialtyId}
                onChange={(e) => setSpecialtyId(e.target.value)}
                required
              >
                <option value="">-- Chọn chuyên khoa từ danh mục y tế --</option>
                {availableSpecialties.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} (Mã #{s.id})
                  </option>
                ))}
              </select>
              <small className="text-muted d-block mt-1">
                Chỉ hiển thị các chuyên khoa chưa được triển khai tại cơ sở này.
              </small>
            </div>

            <div className="mb-3">
              <label className="form-label fw-bold">Trưởng khoa phụ trách (Tùy chọn)</label>
              <select
                className="form-select custom-input"
                value={headDoctorId}
                onChange={(e) => setHeadDoctorId(e.target.value)}
              >
                <option value="">-- Chọn Trưởng khoa (nếu đã có bác sĩ) --</option>
                {clinicDoctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.doctorName || `${d.lastName} ${d.firstName}`} ({d.email || `BS #${d.id}`})
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-3">
              <label className="form-label fw-bold">Chỉ tiêu Công suất Khám (Ca/Tuần)</label>
              <input
                type="number"
                min="10"
                max="500"
                className="form-control custom-input"
                value={targetCapacity}
                onChange={(e) => setTargetCapacity(e.target.value)}
                placeholder="Ví dụ: 50"
              />
            </div>

            <div className="mb-3">
              <label className="form-label fw-bold">Mô tả / Giới thiệu Chuyên khoa tại Cơ sở</label>
              <textarea
                className="form-control custom-input"
                rows="3"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ví dụ: Khoa Tim mạch Bệnh viện Chợ Rẫy với 10 phòng khám hiện đại và máy siêu âm Doppler..."
              ></textarea>
            </div>
          </div>

          <div className="custom-modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Hủy bỏ
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Đang lưu...' : 'Xác nhận Triển khai'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssignSpecialtyModal;
