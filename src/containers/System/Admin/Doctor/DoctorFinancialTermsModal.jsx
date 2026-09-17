// src/containers/System/Admin/Doctor/DoctorFinancialTermsModal.jsx
import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  Percent,
  Calendar,
  AlertCircle,
  Sliders,
  CheckCircle2,
  Sparkles,
  RotateCcw,
  Clock,
  Info
} from 'lucide-react';
import { setDoctorFinancialTerms } from '../../../../services/doctorManageService';

const DoctorFinancialTermsModal = ({ isOpen, onClose, doctor, financialTerms, onSuccess }) => {
  if (!isOpen || !doctor) return null;

  const currentTerm = financialTerms?.currentTerm || {};
  const globalDefault = financialTerms?.globalDefault || { platformFeePercent: 15, doctorSharePercent: 85 };
  const isCurrentlyCustom = financialTerms?.isCustom || false;

  // Form states
  const [isOverride, setIsOverride] = useState(isCurrentlyCustom);
  const [platformFee, setPlatformFee] = useState(
    isCurrentlyCustom
      ? currentTerm.platformFeePercent || 7
      : globalDefault.platformFeePercent || 15
  );
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().slice(0, 16));
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const doctorShare = Math.max(0, 100 - platformFee);

  // Simulation calculation on 500,000 VND
  const sampleAmount = 500000;
  const samplePlatform = Math.round((sampleAmount * platformFee) / 100);
  const sampleDoctor = sampleAmount - samplePlatform;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isOverride && (!reason.trim() || reason.trim().length < 5)) {
      setError('Vui lòng nhập lý do / căn cứ văn bản thỏa thuận (tối thiểu 5 ký tự)!');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        isOverride,
        platformFeePercent: platformFee,
        effectiveFrom,
        reason: reason.trim() || (isOverride ? 'Thỏa thuận hoa hồng riêng' : 'Hoàn nguyên về chính sách sàn')
      };

      const res = await setDoctorFinancialTerms(doctor.id, payload);
      if (res && res.errCode === 0) {
        if (onSuccess) onSuccess(res);
        onClose();
      } else {
        setError(res?.errMessage || 'Có lỗi khi lưu điều khoản');
      }
    } catch (err) {
      setError(err?.response?.data?.errMessage || err.message || 'Lỗi kết nối máy chủ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="policy-modal-backdrop" onClick={onClose}>
      <div className="policy-modal-container" style={{ maxWidth: 620 }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header-custom">
          <div className="header-info">
            <div className="icon-badge">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3 className="modal-title">Điều khoản Tài chính & Hoa hồng Bác sĩ</h3>
              <p className="modal-subtitle">
                BS. {doctor.lastName} {doctor.firstName} (#{doctor.id})
              </p>
            </div>
          </div>
          <button className="btn-close-modal" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="modal-form-content">
          {error && (
            <div className="alert-error-box">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Policy Choice: Inherit Global vs Custom Override */}
          <div className="mb-4">
            <label className="form-label font-bold text-gray-800 mb-2 block">
              Phương thức xác định tỷ lệ hoa hồng:
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* Option 1: Global Inherit */}
              <div
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  !isOverride
                    ? 'border-teal-500 bg-teal-50 shadow-sm ring-2 ring-teal-500/20'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
                onClick={() => {
                  setIsOverride(false);
                  setPlatformFee(globalDefault.platformFeePercent);
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <input
                    type="radio"
                    name="policyChoice"
                    checked={!isOverride}
                    onChange={() => {
                      setIsOverride(false);
                      setPlatformFee(globalDefault.platformFeePercent);
                    }}
                    className="accent-teal-600"
                  />
                  <span className="font-semibold text-gray-900 text-sm">Chính sách Sàn (Mặc định)</span>
                </div>
                <div className="text-xs text-gray-500 pl-5">
                  Áp dụng theo toàn hệ thống: Sàn thu <strong>{globalDefault.platformFeePercent}%</strong>, Bác sĩ hưởng <strong>{globalDefault.doctorSharePercent}%</strong>.
                </div>
              </div>

              {/* Option 2: Custom Override */}
              <div
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  isOverride
                    ? 'border-teal-500 bg-teal-50 shadow-sm ring-2 ring-teal-500/20'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
                onClick={() => setIsOverride(true)}
              >
                <div className="flex items-center gap-2 mb-1">
                  <input
                    type="radio"
                    name="policyChoice"
                    checked={isOverride}
                    onChange={() => setIsOverride(true)}
                    className="accent-teal-600"
                  />
                  <span className="font-semibold text-gray-900 text-sm">Thỏa thuận Riêng (Override)</span>
                </div>
                <div className="text-xs text-gray-500 pl-5">
                  Thiết lập tỷ lệ ưu đãi hoặc thỏa thuận hợp tác riêng cho bác sĩ này.
                </div>
              </div>
            </div>
          </div>

          {/* Custom Term Slider & Details */}
          {isOverride ? (
            <div className="rules-builder-box">
              <div className="rules-header">
                <div className="flex items-center gap-2">
                  <Sliders size={16} className="text-teal-600" />
                  <span className="font-semibold text-gray-800 text-sm">Tỷ lệ Phí Sàn Thỏa Thuận:</span>
                </div>
                <span className="text-xs text-teal-700 font-bold">
                  {isCurrentlyCustom ? `Sẽ nâng cấp lên v${(currentTerm.version || 1) + 1}` : 'Ban hành v1 mới'}
                </span>
              </div>

              {/* Slider */}
              <div className="slider-row mt-2">
                <div className="slider-label-row flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Phí Sàn BookingCare:</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={platformFee}
                      onChange={(e) => setPlatformFee(Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0)))}
                      className="w-16 text-right px-2 py-1 border border-gray-300 rounded font-bold text-teal-700"
                    />
                    <span className="text-sm font-bold text-gray-600">%</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={platformFee}
                  onChange={(e) => setPlatformFee(parseInt(e.target.value, 10))}
                  className="w-full accent-teal-600 cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>0% (Miễn phí sàn)</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Doctor Share Badge */}
              <div className="flex items-center justify-between mt-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                <span className="text-sm text-emerald-900 font-medium">Bác sĩ thực nhận vào ví:</span>
                <span className="text-base font-bold text-emerald-700">{doctorShare}%</span>
              </div>

              {/* Real-time simulation */}
              <div className="calculation-preview-card mt-3">
                <div className="preview-title text-xs text-gray-500 mb-1">
                  Mô phỏng phân bổ ca khám mẫu <strong>500.000 đ</strong>:
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-gray-50 rounded">
                    <span className="text-gray-500 block">Sàn thu:</span>
                    <strong className="text-teal-700 text-sm">{new Intl.NumberFormat('vi-VN').format(samplePlatform)} đ</strong>
                  </div>
                  <div className="p-2 bg-emerald-50 rounded">
                    <span className="text-emerald-800 block">Bác sĩ nhận:</span>
                    <strong className="text-emerald-700 text-sm">{new Intl.NumberFormat('vi-VN').format(sampleDoctor)} đ</strong>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 flex items-start gap-2 mb-3">
              <Info size={16} className="mt-0.5 text-blue-600 shrink-0" />
              <div>
                Bác sĩ sẽ kế thừa chính sách sàn <strong>{globalDefault.code} (v{globalDefault.version})</strong>. Khi hệ thống cập nhật chính sách toàn sàn trong tương lai, tỷ lệ của bác sĩ này sẽ tự động thay đổi theo.
              </div>
            </div>
          )}

          {/* Effective Date & Reason */}
          <div className="grid grid-cols-1 gap-3 mt-3">
            <div className="form-group">
              <label className="form-label text-xs font-semibold text-gray-700 mb-1 block">
                Thời điểm bắt đầu có hiệu lực *
              </label>
              <input
                type="datetime-local"
                className="form-control text-sm"
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label text-xs font-semibold text-gray-700 mb-1 block">
                Căn cứ / Lý do thỏa thuận {isOverride ? '*' : '(Tùy chọn)'}
              </label>
              <textarea
                className="form-control text-sm"
                rows="2"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={
                  isOverride
                    ? 'VD: Thỏa thuận hợp tác ưu đãi bác sĩ chuyên khoa giỏi quý 4/2026...'
                    : 'Ghi chú lý do hoàn nguyên về chính sách sàn...'
                }
                required={isOverride}
              />
            </div>
          </div>

          <div className="text-xs text-gray-500 flex items-center gap-1.5 mt-2 bg-gray-50 p-2.5 rounded border border-gray-200">
            <Clock size={13} className="text-gray-400" />
            <span>
              <strong>Nguyên tắc Bất biến:</strong> Các ca khám bệnh nhân đã đặt trước thời điểm này sẽ giữ nguyên snapshot hoa hồng cũ, không bị thay đổi hồi tố.
            </span>
          </div>

          {/* Footer */}
          <div className="modal-footer-custom mt-4 pt-3 border-t flex justify-end gap-2">
            <button
              type="button"
              className="btn-cancel"
              onClick={onClose}
              disabled={loading}
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="btn-submit"
              disabled={loading}
            >
              {loading ? (
                'Đang lưu...'
              ) : isOverride ? (
                <>
                  <Sparkles size={15} /> Xác nhận Thỏa thuận
                </>
              ) : (
                <>
                  <RotateCcw size={15} /> Kế thừa Chính sách Sàn
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DoctorFinancialTermsModal;
