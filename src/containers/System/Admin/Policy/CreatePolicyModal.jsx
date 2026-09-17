// src/containers/System/Admin/Policy/CreatePolicyModal.jsx
import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  Percent,
  Calendar,
  AlertCircle,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  Building,
  User,
  Globe,
  Sliders,
  Sparkles
} from 'lucide-react';
import { createAdminPolicy, createAdminPolicyVersion } from '../../../../services/policyService';

const CreatePolicyModal = ({ isOpen, onClose, existingPolicy = null, isNewVersion = false, onSuccess }) => {
  if (!isOpen) return null;

  // Form states
  const [policyType, setPolicyType] = useState(existingPolicy?.policyType || 'REVENUE_SHARE');
  const [code, setCode] = useState(existingPolicy?.code || (policyType === 'REVENUE_SHARE' ? 'POL_REVENUE_SHARE' : 'POL_REFUND_RULE'));
  const [name, setName] = useState(
    isNewVersion
      ? `${existingPolicy?.name} (v${existingPolicy.version + 1})`
      : existingPolicy?.name || ''
  );
  const [scopeType, setScopeType] = useState(existingPolicy?.scopeType || 'GLOBAL');
  const [scopeId, setScopeId] = useState(existingPolicy?.scopeId || '');
  const [status, setStatus] = useState('ACTIVE');
  const [description, setDescription] = useState(existingPolicy?.description || '');

  // Effective dates
  const nowStr = new Date().toISOString().slice(0, 16);
  const [effectiveFrom, setEffectiveFrom] = useState(nowStr);
  const [effectiveTo, setEffectiveTo] = useState('');

  // Revenue Share Rules
  const existingRules = existingPolicy?.parsedRules || {};
  const [platformFee, setPlatformFee] = useState(
    existingRules.platformFeePercent !== undefined ? existingRules.platformFeePercent : 15
  );
  const [clinicShare, setClinicShare] = useState(
    existingRules.clinicSharePercent !== undefined ? existingRules.clinicSharePercent : 0
  );
  const doctorShare = Math.max(0, 100 - platformFee - clinicShare);

  // Refund Rules Tiers
  const defaultTiers = [
    { minHoursBefore: 24, refundPercent: 100, label: 'Hủy trước 24 giờ' },
    { minHoursBefore: 12, refundPercent: 75, label: 'Hủy trước từ 12 - 24 giờ' },
    { minHoursBefore: 0, refundPercent: 50, label: 'Hủy sát giờ khám (< 12 giờ)' },
  ];
  const [tiers, setTiers] = useState(
    Array.isArray(existingRules.tiers) && existingRules.tiers.length > 0
      ? existingRules.tiers
      : defaultTiers
  );
  const [defaultRefundPercent, setDefaultRefundPercent] = useState(
    existingRules.defaultRefundPercent !== undefined ? existingRules.defaultRefundPercent : 0
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Auto-sync code when policy type changes if creating new
  useEffect(() => {
    if (!existingPolicy && !isNewVersion) {
      if (policyType === 'REVENUE_SHARE') {
        setCode('POL_REVENUE_SHARE');
        if (!name) setName('Chính sách Phân bổ Doanh thu Khám chữa bệnh');
      } else {
        setCode('POL_REFUND_RULE');
        if (!name) setName('Quy định Hoàn phí khi Hủy lịch khám');
      }
    }
  }, [policyType, existingPolicy, isNewVersion]);

  // Handle Revenue Sliders
  const handlePlatformFeeChange = (val) => {
    const num = Math.min(100, Math.max(0, parseInt(val, 10) || 0));
    setPlatformFee(num);
    if (num + clinicShare > 100) {
      setClinicShare(100 - num);
    }
  };

  const handleClinicShareChange = (val) => {
    const num = Math.min(100 - platformFee, Math.max(0, parseInt(val, 10) || 0));
    setClinicShare(num);
  };

  // Handle Tiers
  const handleTierChange = (index, field, value) => {
    const newTiers = [...tiers];
    newTiers[index][field] = field === 'label' ? value : Math.max(0, parseInt(value, 10) || 0);
    setTiers(newTiers);
  };

  const handleAddTier = () => {
    setTiers([...tiers, { minHoursBefore: 6, refundPercent: 25, label: 'Mốc thời gian mới' }]);
  };

  const handleRemoveTier = (index) => {
    if (tiers.length <= 1) return;
    setTiers(tiers.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Vui lòng nhập tên chính sách!');
      return;
    }
    if (!code.trim()) {
      setError('Vui lòng nhập mã chính sách!');
      return;
    }

    setLoading(true);
    setError('');

    let rulesObj = {};
    if (policyType === 'REVENUE_SHARE') {
      rulesObj = {
        platformFeePercent: platformFee,
        doctorSharePercent: doctorShare,
        clinicSharePercent: clinicShare,
        note: description || 'Áp dụng theo quy chế chia sẻ doanh thu BookingCare'
      };
    } else {
      // Sort tiers descending
      const sortedTiers = [...tiers].sort((a, b) => b.minHoursBefore - a.minHoursBefore);
      rulesObj = {
        tiers: sortedTiers,
        defaultRefundPercent: parseInt(defaultRefundPercent, 10) || 0,
        note: description || 'Áp dụng theo điều khoản hoàn trả BookingCare'
      };
    }

    const payload = {
      code,
      policyType,
      name,
      scopeType,
      scopeId: (scopeType === 'CLINIC' || scopeType === 'DOCTOR') && scopeId ? parseInt(scopeId, 10) : null,
      effectiveFrom,
      effectiveTo: effectiveTo ? effectiveTo : null,
      status,
      rules: rulesObj,
      description
    };

    try {
      let res;
      if (isNewVersion && existingPolicy) {
        res = await createAdminPolicyVersion(existingPolicy.id, payload);
      } else {
        res = await createAdminPolicy(payload);
      }

      if (res && res.errCode === 0) {
        if (onSuccess) onSuccess(res.data);
        onClose();
      } else {
        setError(res?.message || 'Có lỗi xảy ra khi lưu chính sách');
      }
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Lỗi kết nối máy chủ');
    } finally {
      setLoading(false);
    }
  };

  // Sample calculations
  const sampleAmount = 500000;
  const samplePlatform = Math.round((sampleAmount * platformFee) / 100);
  const sampleClinic = Math.round((sampleAmount * clinicShare) / 100);
  const sampleDoctor = sampleAmount - samplePlatform - sampleClinic;

  return (
    <div className="policy-modal-backdrop" onClick={onClose}>
      <div className="policy-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header-custom">
          <div className="header-info">
            <div className="icon-badge">
              <ShieldCheck size={20} className="badge-icon" />
            </div>
            <div>
              <h3 className="modal-title">
                {isNewVersion
                  ? `Nâng cấp Phiên bản mới (v${(existingPolicy?.version || 1) + 1})`
                  : 'Ban hành Chính sách Tài chính Mới'}
              </h3>
              <p className="modal-subtitle">
                {isNewVersion
                  ? `Bảo toàn tính bất biến của dữ liệu lịch sử và các booking đã tham chiếu`
                  : 'Cấu hình tỷ lệ hoa hồng phân bổ doanh thu & bậc thang hoàn phí'}
              </p>
            </div>
          </div>
          <button className="btn-close-modal" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="modal-form-content">
          {error && (
            <div className="alert-error-box">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {isNewVersion && (
            <div className="alert-version-info">
              <Sparkles size={16} className="text-amber-500" />
              <div>
                <strong>Quy chuẩn Bất biến:</strong> Bản ghi phiên bản cũ (v{existingPolicy?.version}) sẽ tự động
                được khóa mốc ngày kết thúc và chuyển trạng thái sang <code>SUPERSEDED</code>. Mọi giao dịch đã đặt
                sẽ tiếp tục giữ snapshot nguyên vẹn.
              </div>
            </div>
          )}

          {/* Row 1: Policy Type & Scope */}
          <div className="form-row-grid">
            <div className="form-group">
              <label className="form-label">Loại chính sách *</label>
              <select
                className="form-control"
                value={policyType}
                onChange={(e) => setPolicyType(e.target.value)}
                disabled={isNewVersion}
              >
                <option value="REVENUE_SHARE">Phân bổ Doanh thu (Hoa hồng)</option>
                <option value="REFUND_RULE">Quy định Hoàn tiền (Hủy lịch)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Mã chính sách (Code) *</label>
              <input
                type="text"
                className="form-control"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="VD: POL_REVENUE_SHARE"
                disabled={isNewVersion}
              />
            </div>
          </div>

          {/* Row 2: Name */}
          <div className="form-group">
            <label className="form-label">Tên hiển thị chính sách *</label>
            <input
              type="text"
              className="form-control"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Chính sách Phân bổ Doanh thu Tiêu chuẩn v2"
            />
          </div>

          {/* Row 3: Scope Selection */}
          <div className="form-row-grid">
            <div className="form-group">
              <label className="form-label">Phạm vi áp dụng (Scope) *</label>
              <select
                className="form-control"
                value={scopeType}
                onChange={(e) => setScopeType(e.target.value)}
                disabled={isNewVersion}
              >
                <option value="GLOBAL">Toàn sàn (Mặc định toàn hệ thống)</option>
                <option value="CLINIC">Riêng từng Cơ sở y tế (Clinic)</option>
                <option value="DOCTOR">Riêng từng Bác sĩ (Doctor)</option>
              </select>
            </div>

            {scopeType !== 'GLOBAL' && (
              <div className="form-group">
                <label className="form-label">
                  {scopeType === 'CLINIC' ? 'ID Cơ sở y tế *' : 'ID Bác sĩ *'}
                </label>
                <input
                  type="number"
                  className="form-control"
                  value={scopeId}
                  onChange={(e) => setScopeId(e.target.value)}
                  placeholder="Nhập ID số"
                  disabled={isNewVersion}
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Trạng thái phát hành</label>
              <select
                className="form-control"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="ACTIVE">Kích hoạt ngay (ACTIVE)</option>
                <option value="DRAFT">Lưu bản thảo (DRAFT)</option>
              </select>
            </div>
          </div>

          {/* Row 4: Dates */}
          <div className="form-row-grid">
            <div className="form-group">
              <label className="form-label">Bắt đầu có hiệu lực (Effective From) *</label>
              <input
                type="datetime-local"
                className="form-control"
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Hết hiệu lực (Effective To - Để trống nếu vô thời hạn)</label>
              <input
                type="datetime-local"
                className="form-control"
                value={effectiveTo}
                onChange={(e) => setEffectiveTo(e.target.value)}
              />
            </div>
          </div>

          {/* DYNAMIC RULE BUILDER SECTION */}
          {policyType === 'REVENUE_SHARE' ? (
            <div className="rules-builder-box">
              <div className="rules-header">
                <div className="flex items-center gap-2">
                  <Sliders size={16} className="text-teal-600" />
                  <span className="font-semibold text-gray-800">Cấu hình Tỷ lệ % Chia sẻ Doanh thu</span>
                </div>
                <span className="text-xs text-gray-500">Tổng 3 bên luôn tự động khớp 100%</span>
              </div>

              <div className="sliders-container">
                {/* Platform Fee */}
                <div className="slider-row">
                  <div className="slider-label-row">
                    <span className="label-text">
                      <span className="color-dot bg-teal-500" /> Phí Sàn BookingCare:
                    </span>
                    <div className="input-percent-group">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={platformFee}
                        onChange={(e) => handlePlatformFeeChange(e.target.value)}
                      />
                      <span>%</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={platformFee}
                    onChange={(e) => handlePlatformFeeChange(e.target.value)}
                    className="slider-range accent-teal-600"
                  />
                </div>

                {/* Clinic Share */}
                <div className="slider-row">
                  <div className="slider-label-row">
                    <span className="label-text">
                      <span className="color-dot bg-blue-500" /> Cơ sở Y tế (Clinic Share):
                    </span>
                    <div className="input-percent-group">
                      <input
                        type="number"
                        min="0"
                        max={100 - platformFee}
                        value={clinicShare}
                        onChange={(e) => handleClinicShareChange(e.target.value)}
                      />
                      <span>%</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={100 - platformFee}
                    value={clinicShare}
                    onChange={(e) => handleClinicShareChange(e.target.value)}
                    className="slider-range accent-blue-600"
                  />
                </div>

                {/* Doctor Share (Auto-computed) */}
                <div className="slider-row doctor-row">
                  <div className="slider-label-row">
                    <span className="label-text font-bold text-emerald-700">
                      <span className="color-dot bg-emerald-500" /> Bác sĩ thụ hưởng (Doctor Share):
                    </span>
                    <div className="doctor-share-badge">
                      <strong>{doctorShare}%</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Real-time Calculation Simulation Card */}
              <div className="calculation-preview-card">
                <div className="preview-title">
                  Mô phỏng Phân bổ Thực tế trên ca khám mẫu <strong>500.000 đ</strong>:
                </div>
                <div className="preview-grid">
                  <div className="preview-item">
                    <span className="item-label">Sàn BookingCare:</span>
                    <span className="item-val text-teal-700 font-semibold">
                      {new Intl.NumberFormat('vi-VN').format(samplePlatform)} đ ({platformFee}%)
                    </span>
                  </div>
                  {clinicShare > 0 && (
                    <div className="preview-item">
                      <span className="item-label">Cơ sở Y tế:</span>
                      <span className="item-val text-blue-700 font-semibold">
                        {new Intl.NumberFormat('vi-VN').format(sampleClinic)} đ ({clinicShare}%)
                      </span>
                    </div>
                  )}
                  <div className="preview-item">
                    <span className="item-label">Bác sĩ nhận ví:</span>
                    <span className="item-val text-emerald-700 font-bold">
                      {new Intl.NumberFormat('vi-VN').format(sampleDoctor)} đ ({doctorShare}%)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rules-builder-box">
              <div className="rules-header">
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-amber-600" />
                  <span className="font-semibold text-gray-800">Cấu hình Bậc thang Hoàn tiền khi Bệnh nhân Hủy lịch</span>
                </div>
                <button
                  type="button"
                  className="btn-add-tier"
                  onClick={handleAddTier}
                >
                  <Plus size={14} /> Thêm mốc thời gian
                </button>
              </div>

              <div className="tiers-table-wrapper">
                <table className="tiers-table">
                  <thead>
                    <tr>
                      <th>Số giờ trước giờ khám (tối thiểu)</th>
                      <th>Tỷ lệ hoàn tiền (%)</th>
                      <th>Nhãn mô tả hiển thị cho bệnh nhân</th>
                      <th style={{ width: 40 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {tiers.map((tier, idx) => (
                      <tr key={idx}>
                        <td>
                          <div className="input-with-unit">
                            <input
                              type="number"
                              min="0"
                              value={tier.minHoursBefore}
                              onChange={(e) => handleTierChange(idx, 'minHoursBefore', e.target.value)}
                              className="tier-input"
                            />
                            <span>giờ</span>
                          </div>
                        </td>
                        <td>
                          <div className="input-with-unit">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={tier.refundPercent}
                              onChange={(e) => handleTierChange(idx, 'refundPercent', e.target.value)}
                              className="tier-input"
                            />
                            <span>%</span>
                          </div>
                        </td>
                        <td>
                          <input
                            type="text"
                            value={tier.label || ''}
                            onChange={(e) => handleTierChange(idx, 'label', e.target.value)}
                            className="tier-input"
                            placeholder="VD: Hủy trước 24 giờ"
                          />
                        </td>
                        <td>
                          {tiers.length > 1 && (
                            <button
                              type="button"
                              className="btn-remove-tier"
                              onClick={() => handleRemoveTier(idx)}
                              title="Xóa mốc này"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="fallback-refund-row">
                <span className="text-sm text-gray-600">
                  Tỷ lệ hoàn tiền mặc định nếu hủy sau các mốc trên (hoặc vắng mặt):
                </span>
                <div className="input-with-unit" style={{ width: 100 }}>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={defaultRefundPercent}
                    onChange={(e) => setDefaultRefundPercent(e.target.value)}
                    className="tier-input"
                  />
                  <span>%</span>
                </div>
              </div>
            </div>
          )}

          {/* Row 5: Notes & Description */}
          <div className="form-group">
            <label className="form-label">Căn cứ pháp lý & Ghi chú lý do ban hành</label>
            <textarea
              className="form-control"
              rows="2"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="VD: Căn cứ quyết định ban hành phí dịch vụ quý 3/2026..."
            />
          </div>

          {/* Modal Footer */}
          <div className="modal-footer-custom">
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
                'Đang xử lý...'
              ) : isNewVersion ? (
                <>
                  <Sparkles size={16} /> Phát hành Phiên bản v{(existingPolicy?.version || 1) + 1}
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} /> Ban hành Chính sách
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePolicyModal;
