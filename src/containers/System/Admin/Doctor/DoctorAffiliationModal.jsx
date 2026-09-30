import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { X, Building2, Stethoscope, DoorOpen, DollarSign, Percent, ShieldCheck, Check, AlertCircle } from 'lucide-react';
import clinicHierarchyService from '../../../../services/clinicHierarchyService';
import { getAllClinic } from '../../../../services/clinicService';
import { getAllSpecialty } from '../../../../services/specialtyService';

const PRICE_OPTIONS = [
  { keyMap: 'PRI1', label: '200.000 VNĐ' },
  { keyMap: 'PRI2', label: '250.000 VNĐ' },
  { keyMap: 'PRI3', label: '300.000 VNĐ' },
  { keyMap: 'PRI4', label: '400.000 VNĐ' },
  { keyMap: 'PRI5', label: '500.000 VNĐ' },
];

const DoctorAffiliationModal = ({
  isOpen,
  onClose,
  doctorId,
  doctorName,
  editData = null,
  onSuccess,
}) => {
  const [clinics, setClinics] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [clinicId, setClinicId] = useState('');
  const [specialtyId, setSpecialtyId] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [priceId, setPriceId] = useState('PRI3');
  const [commissionRate, setCommissionRate] = useState(15.0);
  const [workingStatus, setWorkingStatus] = useState('active');
  const [isPrimary, setIsPrimary] = useState(false);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingCatalogs, setFetchingCatalogs] = useState(false);

  // Nạp danh mục clinics và specialties khi mở modal
  useEffect(() => {
    if (!isOpen) return;

    const loadCatalogs = async () => {
      setFetchingCatalogs(true);
      try {
        const [resClinics, resSpecs] = await Promise.all([
          getAllClinic(),
          getAllSpecialty(),
        ]);
        if (resClinics && resClinics.errCode === 0) {
          setClinics(resClinics.data || []);
        }
        if (resSpecs && resSpecs.errCode === 0) {
          setSpecialties(resSpecs.data || []);
        }
      } catch (err) {
        console.error('Error loading clinics/specialties catalogs:', err);
      } finally {
        setFetchingCatalogs(false);
      }
    };

    loadCatalogs();
  }, [isOpen]);

  // Cập nhật form state khi editData hoặc isOpen thay đổi
  useEffect(() => {
    if (editData) {
      setClinicId(editData.clinicId || '');
      setSpecialtyId(editData.specialtyId || '');
      setRoomNumber(editData.roomNumber || '');
      setPriceId(editData.priceId || 'PRI3');
      setCommissionRate(editData.commissionRate !== undefined ? editData.commissionRate : 15.0);
      setWorkingStatus(editData.workingStatus || 'active');
      setIsPrimary(!!editData.isPrimary);
      setNote(editData.note || '');
    } else {
      setClinicId('');
      setSpecialtyId('');
      setRoomNumber('');
      setPriceId('PRI3');
      setCommissionRate(15.0);
      setWorkingStatus('active');
      setIsPrimary(false);
      setNote('');
    }
  }, [editData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!editData) {
      if (!clinicId) {
        toast.warning('Vui lòng chọn cơ sở y tế');
        return;
      }
      if (!specialtyId) {
        toast.warning('Vui lòng chọn chuyên khoa');
        return;
      }
    }

    setLoading(true);
    try {
      if (editData) {
        // Cập nhật phân bổ
        const res = await clinicHierarchyService.updateDoctorAssignment(editData.id, {
          roomNumber,
          priceId,
          commissionRate: parseFloat(commissionRate),
          workingStatus,
          isPrimary,
          note,
        });

        if (res && res.errCode === 0) {
          toast.success('Cập nhật phân bổ công tác thành công!');
          onSuccess && onSuccess();
          onClose();
        } else {
          toast.error(res?.message || 'Có lỗi khi cập nhật phân bổ');
        }
      } else {
        // Thêm phân bổ mới
        const res = await clinicHierarchyService.assignDoctorToClinicSpecialty(
          clinicId,
          specialtyId,
          {
            doctorId: parseInt(doctorId, 10),
            roomNumber: roomNumber || 'Phòng khám chuyên khoa',
            priceId,
            commissionRate: parseFloat(commissionRate),
            workingStatus,
            isPrimary,
            note,
          }
        );

        if (res && res.errCode === 0) {
          toast.success('Phân bổ bác sĩ vào cơ sở y tế thành công!');
          onSuccess && onSuccess();
          onClose();
        } else {
          toast.error(res?.message || 'Có lỗi khi phân bổ bác sĩ');
        }
      }
    } catch (error) {
      console.error('Error submitting doctor affiliation:', error);
      toast.error(error?.response?.data?.message || 'Không thể kết nối đến máy chủ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ops-modal-backdrop" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        className="ops-modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 620, borderRadius: 12, padding: 0, overflow: 'hidden' }}
      >
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
            color: '#FFFFFF',
            padding: '18px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Building2 size={20} style={{ color: '#38BDF8' }} />
              {editData ? 'Chỉnh sửa Phân bổ Công tác' : 'Phân bổ Bác sĩ vào Cơ sở Y tế'}
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#94A3B8' }}>
              Bác sĩ: <strong>{doctorName}</strong> (#{doctorId})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94A3B8',
              cursor: 'pointer',
              padding: 4,
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {fetchingCatalogs ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: '#64748B' }}>
              Đang tải danh mục cơ sở và chuyên khoa...
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Row 1: Clinic & Specialty */}
              {editData ? (
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: '0.82rem', color: '#64748B' }}>Cơ sở y tế:</span>
                    <strong style={{ fontSize: '0.9rem', color: '#0F172A' }}>{editData.clinicName}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.82rem', color: '#64748B' }}>Chuyên khoa:</span>
                    <strong style={{ fontSize: '0.9rem', color: '#087F8C' }}>{editData.specialtyName}</strong>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                      Cơ sở Y tế <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <select
                      value={clinicId}
                      onChange={(e) => setClinicId(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: 6,
                        border: '1px solid #CBD5E1',
                        fontSize: '0.86rem',
                        outline: 'none',
                        background: '#FFFFFF',
                      }}
                    >
                      <option value="">-- Chọn Cơ sở y tế --</option>
                      {clinics.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                      Chuyên khoa <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <select
                      value={specialtyId}
                      onChange={(e) => setSpecialtyId(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: 6,
                        border: '1px solid #CBD5E1',
                        fontSize: '0.86rem',
                        outline: 'none',
                        background: '#FFFFFF',
                      }}
                    >
                      <option value="">-- Chọn Chuyên khoa --</option>
                      {specialties.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Row 2: Room Number & Price */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                    Phòng khám số / Khu vực
                  </label>
                  <input
                    type="text"
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    placeholder="Ví dụ: Phòng 302 - Tòa A"
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 6,
                      border: '1px solid #CBD5E1',
                      fontSize: '0.86rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                    Giá dịch vụ riêng tại cơ sở
                  </label>
                  <select
                    value={priceId}
                    onChange={(e) => setPriceId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 6,
                      border: '1px solid #CBD5E1',
                      fontSize: '0.86rem',
                      outline: 'none',
                      background: '#FFFFFF',
                    }}
                  >
                    {PRICE_OPTIONS.map((p) => (
                      <option key={p.keyMap} value={p.keyMap}>
                        {p.label} ({p.keyMap})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 3: Commission Rate & Status */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                    Hoa hồng sàn riêng (%)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="100"
                      value={commissionRate}
                      onChange={(e) => setCommissionRate(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 36px 9px 12px',
                        borderRadius: 6,
                        border: '1px solid #CBD5E1',
                        fontSize: '0.86rem',
                        outline: 'none',
                      }}
                    />
                    <span style={{ position: 'absolute', right: 12, top: 10, color: '#94A3B8', fontSize: '0.85rem' }}>%</span>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                    Trạng thái hoạt động
                  </label>
                  <select
                    value={workingStatus}
                    onChange={(e) => setWorkingStatus(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 6,
                      border: '1px solid #CBD5E1',
                      fontSize: '0.86rem',
                      outline: 'none',
                      background: '#FFFFFF',
                    }}
                  >
                    <option value="active">Đang hoạt động (active)</option>
                    <option value="paused">Tạm dừng nhận lịch (paused)</option>
                  </select>
                </div>
              </div>

              {/* Row 4: Primary Facility Checkbox */}
              <div
                style={{
                  background: isPrimary ? '#F0FDFA' : '#F8FAFC',
                  border: isPrimary ? '1.5px solid #0D9488' : '1px solid #E2E8F0',
                  borderRadius: 8,
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onClick={() => setIsPrimary(!isPrimary)}
              >
                <input
                  type="checkbox"
                  checked={isPrimary}
                  onChange={(e) => setIsPrimary(e.target.checked)}
                  style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#0D9488' }}
                  onClick={(e) => e.stopPropagation()}
                />
                <div>
                  <strong style={{ fontSize: '0.86rem', color: '#0F172A', display: 'block' }}>
                    Đặt làm Cơ sở công tác chính (Primary Facility)
                  </strong>
                  <span style={{ fontSize: '0.76rem', color: '#64748B' }}>
                    Thông tin địa chỉ và cơ sở này sẽ được hiển thị làm mặc định trên trang cá nhân của bác sĩ.
                  </span>
                </div>
              </div>

              {/* Row 5: Notes */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  Ghi chú nội bộ
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  placeholder="Ghi chú phân bổ, lịch trực thỏa thuận riêng..."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid #CBD5E1',
                    fontSize: '0.86rem',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div
            style={{
              marginTop: 24,
              paddingTop: 16,
              borderTop: '1px solid #E2E8F0',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 10,
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                borderRadius: 6,
                border: '1px solid #CBD5E1',
                background: '#FFFFFF',
                color: '#475569',
                fontSize: '0.86rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading || fetchingCatalogs}
              style={{
                padding: '8px 20px',
                borderRadius: 6,
                border: 'none',
                background: '#087F8C',
                color: '#FFFFFF',
                fontSize: '0.86rem',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {loading ? 'Đang lưu...' : editData ? 'Lưu thay đổi' : 'Xác nhận phân bổ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DoctorAffiliationModal;
