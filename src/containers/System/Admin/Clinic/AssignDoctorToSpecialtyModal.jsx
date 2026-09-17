import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import clinicHierarchyService from '../../../../services/clinicHierarchyService';

const AssignDoctorToSpecialtyModal = ({
  isOpen,
  onClose,
  clinicId,
  specialtyId,
  clinicName,
  specialtyName,
  availableDoctors = [],
  editData = null, // Nếu truyền editData thì là chế độ chỉnh sửa phân bổ
  onSuccess,
}) => {
  const [doctorId, setDoctorId] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [priceId, setPriceId] = useState('PRI1');
  const [commissionRate, setCommissionRate] = useState(15.0);
  const [workingStatus, setWorkingStatus] = useState('active');
  const [isPrimary, setIsPrimary] = useState(false);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editData) {
      setDoctorId(editData.doctorId || '');
      setRoomNumber(editData.roomNumber || '');
      setPriceId(editData.priceId || 'PRI1');
      setCommissionRate(editData.commissionRate || 15.0);
      setWorkingStatus(editData.workingStatus || 'active');
      setIsPrimary(!!editData.isPrimary);
      setNote(editData.note || '');
    } else {
      setDoctorId('');
      setRoomNumber('');
      setPriceId('PRI1');
      setCommissionRate(15.0);
      setWorkingStatus('active');
      setIsPrimary(false);
      setNote('');
    }
  }, [editData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!editData && !doctorId) {
      toast.warning('Vui lòng chọn bác sĩ để phân bổ');
      return;
    }

    setLoading(true);
    try {
      if (editData) {
        // Chế độ chỉnh sửa
        const res = await clinicHierarchyService.updateDoctorAssignment(editData.id, {
          roomNumber,
          priceId,
          commissionRate: parseFloat(commissionRate),
          workingStatus,
          isPrimary,
          note,
        });
        if (res && res.errCode === 0) {
          toast.success('Cập nhật phân bổ bác sĩ thành công!');
          onSuccess && onSuccess();
          onClose();
        } else {
          toast.error(res?.message || 'Có lỗi khi cập nhật phân bổ');
        }
      } else {
        // Chế độ thêm mới phân bổ
        const res = await clinicHierarchyService.assignDoctorToClinicSpecialty(clinicId, specialtyId, {
          doctorId: parseInt(doctorId, 10),
          roomNumber: roomNumber || 'Phòng khám chuyên khoa',
          priceId,
          commissionRate: parseFloat(commissionRate),
          workingStatus,
          isPrimary,
          note,
        });
        if (res && res.errCode === 0) {
          toast.success('Phân bổ bác sĩ vào chuyên khoa thành công!');
          onSuccess && onSuccess();
          onClose();
        } else {
          toast.error(res?.message || 'Có lỗi khi phân bổ bác sĩ');
        }
      }
    } catch (error) {
      console.error('Error in assign doctor modal:', error);
      toast.error(error?.response?.data?.message || 'Không thể kết nối đến máy chủ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="custom-modal-overlay" onClick={onClose}>
      <div className="custom-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '620px' }}>
        <div className="custom-modal-header">
          <div>
            <h5 className="modal-title">
              {editData ? '⚙️ Chỉnh sửa Phân bổ Bác sĩ' : '👨‍⚕️ Phân bổ Bác sĩ vào Chuyên khoa'}
            </h5>
            <span className="modal-subtitle">
              {clinicName} &bull; <strong>{specialtyName}</strong>
            </span>
          </div>
          <button type="button" className="btn-close-custom" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="custom-modal-body">
            {!editData ? (
              <div className="mb-3">
                <label className="form-label fw-bold">Chọn Bác sĩ từ danh bạ y tế <span className="text-danger">*</span></label>
                <select
                  className="form-select custom-input"
                  value={doctorId}
                  onChange={(e) => setDoctorId(e.target.value)}
                  required
                >
                  <option value="">-- Chọn bác sĩ toàn sàn --</option>
                  {availableDoctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} {d.isOriginalSpecialist ? '★ (Đúng chuyên môn)' : ''}
                    </option>
                  ))}
                </select>
                <small className="text-muted d-block mt-1">
                  Bác sĩ đã có profile trong hệ thống sẽ được tái sử dụng, không sinh trùng lặp tài khoản.
                </small>
              </div>
            ) : (
              <div className="mb-3 p-3 rounded" style={{ background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                <strong>Bác sĩ:</strong> {editData.doctorName} ({editData.email})
              </div>
            )}

            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label fw-bold">Số phòng khám tại cơ sở</label>
                <input
                  type="text"
                  className="form-control custom-input"
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                  placeholder="Ví dụ: Phòng 302 - Khu A"
                />
              </div>

              <div className="col-md-6 mb-3">
                <label className="form-label fw-bold">Khung giá khám tại cơ sở</label>
                <select
                  className="form-select custom-input"
                  value={priceId}
                  onChange={(e) => setPriceId(e.target.value)}
                >
                  <option value="PRI1">200.000 VNĐ</option>
                  <option value="PRI2">300.000 VNĐ</option>
                  <option value="PRI3">400.000 VNĐ</option>
                  <option value="PRI4">500.000 VNĐ</option>
                </select>
              </div>
            </div>

            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label fw-bold">Tỷ lệ Hoa hồng Sàn riêng (%)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="50"
                  className="form-control custom-input"
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(e.target.value)}
                />
                <small className="text-muted">Mặc định 15% hoặc thỏa thuận riêng</small>
              </div>

              <div className="col-md-6 mb-3">
                <label className="form-label fw-bold">Trạng thái công tác</label>
                <select
                  className="form-select custom-input"
                  value={workingStatus}
                  onChange={(e) => setWorkingStatus(e.target.value)}
                >
                  <option value="active">Đang nhận bệnh (Active)</option>
                  <option value="paused">Tạm dừng nhận bệnh (Paused)</option>
                  <option value="suspended">Ngừng tiếp nhận (Suspended)</option>
                </select>
              </div>
            </div>

            <div className="mb-3 form-check form-switch pt-2">
              <input
                className="form-check-input"
                type="checkbox"
                id="isPrimarySwitch"
                checked={isPrimary}
                onChange={(e) => setIsPrimary(e.target.checked)}
              />
              <label className="form-check-label fw-bold ms-2" htmlFor="isPrimarySwitch">
                Đánh dấu là Cơ sở & Chuyên khoa làm việc chính (Primary Workplace)
              </label>
              <small className="text-muted d-block mt-1">
                Khi kích hoạt, hệ thống sẽ tự động đồng bộ sang hồ sơ công khai của bác sĩ để phục vụ tìm kiếm mặc định.
              </small>
            </div>

            <div className="mb-3">
              <label className="form-label fw-bold">Ghi chú phân bổ</label>
              <textarea
                className="form-control custom-input"
                rows="2"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ví dụ: Khám các ngày Thứ 2, 4, 6 sáng..."
              ></textarea>
            </div>
          </div>

          <div className="custom-modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Hủy bỏ
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Đang lưu...' : editData ? 'Lưu Thay đổi' : 'Xác nhận Phân bổ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssignDoctorToSpecialtyModal;
