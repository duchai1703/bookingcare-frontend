// src/containers/System/Admin/SystemSettings.jsx
// [Phase D.12 + Redesign] Admin quản lý cài đặt hệ thống & chính sách hoàn tiền
// Cung cấp giao diện tùy chỉnh: Tỷ lệ hoàn tiền, Mốc giờ hủy lịch, Phí sàn, và Live Simulator
import React, { useEffect, useState, useMemo } from 'react';
import {
  getSystemSettings,
  updateSystemSetting,
  updateBulkSystemSettings,
  resetSystemSettings,
} from '../../../services/catalogService';
import './SystemSettings.scss';

const SETTING_DEFINITIONS = {
  refund_rate_cancel_before_24h: {
    label: 'Tỷ lệ hoàn tiền — Hủy trước hạn',
    unit: '%',
    icon: '✅',
    badgeColor: 'success',
    category: 'refund',
    description: 'Phần trăm viện phí bệnh nhân được hoàn lại khi hủy lịch trước mốc thời gian quy định.',
    min: 0,
    max: 100,
    step: 5,
    presets: [100, 90, 80, 70],
  },
  refund_rate_cancel_after_24h: {
    label: 'Tỷ lệ hoàn tiền — Hủy sau hạn',
    unit: '%',
    icon: '⚠️',
    badgeColor: 'warning',
    category: 'refund',
    description: 'Phần trăm viện phí bệnh nhân được hoàn lại khi hủy lịch sát giờ (sau mốc thời gian quy định).',
    min: 0,
    max: 100,
    step: 5,
    presets: [50, 30, 20, 0],
  },
  refund_threshold_hours: {
    label: 'Mốc thời gian quy định hủy lịch',
    unit: 'giờ',
    icon: '⏰',
    badgeColor: 'info',
    category: 'refund',
    description: 'Khoảng thời gian (tính bằng giờ trước giờ khám) dùng làm căn cứ áp dụng mức hoàn tiền.',
    min: 1,
    max: 72,
    step: 1,
    presets: [12, 24, 48],
  },
  service_fee_rate: {
    label: 'Phí dịch vụ nền tảng (sàn)',
    unit: '%',
    icon: '💳',
    badgeColor: 'primary',
    category: 'fee',
    description: 'Phần trăm phí nền tảng hệ thống trích lại trên mỗi lịch khám hoàn thành thành công.',
    min: 0,
    max: 30,
    step: 1,
    presets: [0, 3, 5, 10],
  },
};

const SAMPLE_PRICES = [150000, 300000, 500000, 1000000];

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
};

const SystemSettings = () => {
  const [settings, setSettings] = useState([]);
  const [editing, setEditing]   = useState({}); // { [key]: newValue }
  const [saving, setSaving]     = useState(''); // key đang lưu, hoặc 'ALL', hoặc 'RESET'
  const [bannerMsg, setBannerMsg] = useState({ type: '', text: '' });
  const [samplePrice, setSamplePrice] = useState(300000);
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  // Chuẩn hóa trích xuất danh sách settings bất kể axios có bóc tách response.data hay không
  const extractSettingsArray = (res) => {
    if (!res) return null;
    if (Array.isArray(res.data)) return res.data;
    if (Array.isArray(res.data?.data)) return res.data.data;
    if (Array.isArray(res)) return res;
    return null;
  };

  const fetchSettings = async () => {
    try {
      const res = await getSystemSettings();
      const list = extractSettingsArray(res);
      if (list) {
        setSettings(list);
      }
    } catch (err) {
      console.error('Failed to fetch system settings:', err);
      setBannerMsg({ type: 'error', text: 'Không thể tải cấu hình hệ thống. Vui lòng thử lại!' });
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleEdit = (key, value) => {
    setEditing((prev) => ({ ...prev, [key]: value }));
  };

  const hasDirtySettings = useMemo(() => {
    return Object.keys(editing).some((key) => {
      const original = settings.find((s) => s.key === key)?.value;
      return editing[key] !== undefined && String(editing[key]) !== String(original);
    });
  }, [editing, settings]);

  const dirtyCount = useMemo(() => {
    return Object.keys(editing).filter((key) => {
      const original = settings.find((s) => s.key === key)?.value;
      return editing[key] !== undefined && String(editing[key]) !== String(original);
    }).length;
  }, [editing, settings]);

  // Lưu 1 setting đơn lẻ
  const handleSaveSingle = async (key) => {
    const value = editing[key];
    if (value === undefined || value === '') return;
    setSaving(key);
    try {
      const original = settings.find((s) => s.key === key);
      const desc = SETTING_DEFINITIONS[key]?.description || original?.description || '';
      const res = await updateSystemSetting(key, value, desc);
      const isOk = res?.errCode === 0 || res?.data?.errCode === 0;

      if (isOk) {
        setBannerMsg({ type: 'success', text: `Đã lưu thành công thông số "${SETTING_DEFINITIONS[key]?.label || key}"!` });
        await fetchSettings();
        setEditing((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
        setTimeout(() => setBannerMsg({ type: '', text: '' }), 3500);
      } else {
        setBannerMsg({ type: 'error', text: res?.message || 'Có lỗi xảy ra khi lưu!' });
      }
    } catch (err) {
      setBannerMsg({ type: 'error', text: 'Không thể kết nối máy chủ để lưu cài đặt!' });
    } finally {
      setSaving('');
    }
  };

  // Lưu tất cả các settings đang thay đổi
  const handleSaveAll = async () => {
    const changedItems = Object.keys(editing)
      .filter((key) => {
        const original = settings.find((s) => s.key === key)?.value;
        return editing[key] !== undefined && String(editing[key]) !== String(original);
      })
      .map((key) => ({
        key,
        value: editing[key],
        description: SETTING_DEFINITIONS[key]?.description || settings.find((s) => s.key === key)?.description || '',
      }));

    if (changedItems.length === 0) return;

    setSaving('ALL');
    try {
      const res = await updateBulkSystemSettings(changedItems);
      const isOk = res?.errCode === 0 || res?.data?.errCode === 0;

      if (isOk) {
        setBannerMsg({ type: 'success', text: `Đã cập nhật thành công ${changedItems.length} thông số hệ thống!` });
        await fetchSettings();
        setEditing({});
        setTimeout(() => setBannerMsg({ type: '', text: '' }), 3500);
      } else {
        setBannerMsg({ type: 'error', text: res?.message || 'Có lỗi khi cập nhật hàng loạt!' });
      }
    } catch (err) {
      setBannerMsg({ type: 'error', text: 'Lỗi lưu thay đổi toàn hệ thống!' });
    } finally {
      setSaving('');
    }
  };

  // Khôi phục cài đặt gốc
  const handleResetDefaults = async () => {
    setShowConfirmReset(false);
    setSaving('RESET');
    try {
      const res = await resetSystemSettings();
      const isOk = res?.errCode === 0 || res?.data?.errCode === 0;

      if (isOk) {
        setBannerMsg({ type: 'success', text: 'Đã khôi phục toàn bộ chính sách hoàn tiền về mặc định!' });
        await fetchSettings();
        setEditing({});
        setTimeout(() => setBannerMsg({ type: '', text: '' }), 4000);
      } else {
        setBannerMsg({ type: 'error', text: res?.message || 'Có lỗi khi khôi phục mặc định!' });
      }
    } catch (err) {
      setBannerMsg({ type: 'error', text: 'Không thể kết nối máy chủ để reset!' });
    } finally {
      setSaving('');
    }
  };

  // Lấy giá trị hiện tại (đang chỉnh sửa hoặc trong DB)
  const getCurrentValue = (key, fallback = '') => {
    if (editing[key] !== undefined) return editing[key];
    const found = settings.find((s) => s.key === key);
    return found ? found.value : fallback;
  };

  // Tính toán số liệu cho Live Simulation
  const rateBefore = Number(getCurrentValue('refund_rate_cancel_before_24h', 100)) || 0;
  const rateAfter = Number(getCurrentValue('refund_rate_cancel_after_24h', 50)) || 0;
  const thresholdHours = Number(getCurrentValue('refund_threshold_hours', 24)) || 24;
  const feeRate = Number(getCurrentValue('service_fee_rate', 5)) || 0;

  const simRefundBefore = Math.round((samplePrice * rateBefore) / 100);
  const simPenaltyBefore = Math.max(0, samplePrice - simRefundBefore);

  const simRefundAfter = Math.round((samplePrice * rateAfter) / 100);
  const simPenaltyAfter = Math.max(0, samplePrice - simRefundAfter);

  const simPlatformFee = Math.round((samplePrice * feeRate) / 100);

  // Phân nhóm settings
  const refundSettings = settings.filter((s) => SETTING_DEFINITIONS[s.key]?.category === 'refund');
  const feeSettings = settings.filter((s) => SETTING_DEFINITIONS[s.key]?.category === 'fee');
  const otherSettings = settings.filter((s) => !SETTING_DEFINITIONS[s.key]);

  const renderSettingCard = (s) => {
    const meta = SETTING_DEFINITIONS[s.key] || {
      label: s.key,
      unit: '',
      icon: '⚙️',
      badgeColor: 'info',
      description: s.description || 'Cài đặt hệ thống',
      min: 0,
      max: 1000,
      step: 1,
      presets: [],
    };

    const currentVal = getCurrentValue(s.key, s.value);
    const isDirty = editing[s.key] !== undefined && String(editing[s.key]) !== String(s.value);
    const isSavingThis = saving === s.key || saving === 'ALL';

    return (
      <div key={s.key} className={`setting-card ${isDirty ? 'setting-card--dirty' : ''}`}>
        <div className="setting-card-top">
          <div className="setting-title-wrap">
            <span className="setting-icon">{meta.icon}</span>
            <div>
              <h4 className="setting-title">{meta.label}</h4>
              <p className="setting-desc">{meta.description}</p>
            </div>
          </div>
          <div className={`setting-badge badge-${meta.badgeColor}`}>
            {currentVal} {meta.unit}
          </div>
        </div>

        <div className="setting-controls">
          {/* Slider */}
          <div className="slider-row">
            <input
              type="range"
              min={meta.min}
              max={meta.max}
              step={meta.step}
              value={currentVal || 0}
              onChange={(e) => handleEdit(s.key, e.target.value)}
              className="setting-slider"
            />
          </div>

          <div className="input-actions-row">
            {/* Quick Presets */}
            {meta.presets && meta.presets.length > 0 && (
              <div className="preset-buttons">
                <span className="preset-label">Mẫu nhanh:</span>
                {meta.presets.map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={`btn-preset ${String(currentVal) === String(p) ? 'active' : ''}`}
                    onClick={() => handleEdit(s.key, p)}
                  >
                    {p}{meta.unit}
                  </button>
                ))}
              </div>
            )}

            {/* Direct Number Input & Save */}
            <div className="direct-input-group">
              <div className="input-unit-wrap">
                <input
                  type="number"
                  min={meta.min}
                  max={meta.max}
                  value={currentVal || ''}
                  onChange={(e) => handleEdit(s.key, e.target.value)}
                  className="setting-number-input"
                />
                <span className="input-unit">{meta.unit}</span>
              </div>

              <button
                type="button"
                className="btn-save-single"
                disabled={!isDirty || isSavingThis}
                onClick={() => handleSaveSingle(s.key)}
                title="Lưu thay đổi cho mục này"
              >
                {saving === s.key ? '⏳ Đang lưu...' : isDirty ? '💾 Lưu' : '✓ Đã lưu'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="system-settings-page">
      {/* ===== HEADER ===== */}
      <div className="settings-page-header">
        <div className="header-text">
          <h2>⚙️ Cài đặt hệ thống & Chính sách hoàn tiền</h2>
          <p>
            Tùy chỉnh tỷ lệ hoàn tiền hủy lịch, mốc thời gian quy định, phí dịch vụ sàn và kiểm tra mô phỏng trực quan.
          </p>
        </div>

        <div className="header-actions">
          <button
            type="button"
            className="btn-action-reset"
            onClick={() => setShowConfirmReset(true)}
            disabled={saving !== ''}
            title="Khôi phục lại tỷ lệ hoàn tiền gốc ban đầu"
          >
            🔄 Khôi phục mặc định
          </button>

          <button
            type="button"
            className={`btn-action-save-all ${hasDirtySettings ? 'has-changes' : ''}`}
            disabled={!hasDirtySettings || saving !== ''}
            onClick={handleSaveAll}
          >
            {saving === 'ALL' ? (
              '⏳ Đang lưu tất cả...'
            ) : (
              <>
                💾 Lưu tất cả {dirtyCount > 0 && <span className="dirty-pill">{dirtyCount}</span>}
              </>
            )}
          </button>
        </div>
      </div>

      {/* ===== BANNER MESSAGE ===== */}
      {bannerMsg.text && (
        <div className={`settings-banner banner-${bannerMsg.type}`}>
          <span className="banner-icon">{bannerMsg.type === 'success' ? '✅' : '⚠️'}</span>
          <span>{bannerMsg.text}</span>
          <button type="button" className="banner-close" onClick={() => setBannerMsg({ type: '', text: '' })}>
            ✕
          </button>
        </div>
      )}

      {/* ===== MODAL XÁC NHẬN RESET ===== */}
      {showConfirmReset && (
        <div className="settings-modal-backdrop">
          <div className="settings-modal-box">
            <h3>⚠️ Xác nhận khôi phục cài đặt mặc định?</h3>
            <p>
              Toàn bộ thông số chính sách hoàn tiền sẽ được đặt lại:
              <br />• Hủy trước 24h: <strong>100%</strong>
              <br />• Hủy sau 24h: <strong>50%</strong>
              <br />• Mốc thời gian: <strong>24 giờ</strong>
              <br />• Phí dịch vụ sàn: <strong>5%</strong>
            </p>
            <div className="modal-btn-row">
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => setShowConfirmReset(false)}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="btn-modal-confirm"
                onClick={handleResetDefaults}
              >
                Đồng ý khôi phục
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== NỘI DUNG CHÍNH: 2 CỘT ===== */}
      <div className="settings-grid-layout">
        {/* CỘT TRÁI: DANH SÁCH CÀI ĐẶT */}
        <div className="settings-cards-column">
          {/* Nhóm 1: Chính sách hoàn tiền */}
          <div className="settings-section">
            <div className="section-header">
              <span className="section-dot dot-green" />
              <h3>Chính sách hoàn tiền khi hủy lịch hẹn</h3>
            </div>
            <div className="cards-wrapper">
              {refundSettings.map(renderSettingCard)}
            </div>
          </div>

          {/* Nhóm 2: Phí dịch vụ sàn */}
          <div className="settings-section">
            <div className="section-header">
              <span className="section-dot dot-purple" />
              <h3>Thông số tài chính & Phí sàn BookingCare</h3>
            </div>
            <div className="cards-wrapper">
              {feeSettings.map(renderSettingCard)}
            </div>
          </div>

          {/* Nhóm khác nếu có */}
          {otherSettings.length > 0 && (
            <div className="settings-section">
              <div className="section-header">
                <span className="section-dot dot-blue" />
                <h3>Các thông số khác</h3>
              </div>
              <div className="cards-wrapper">
                {otherSettings.map(renderSettingCard)}
              </div>
            </div>
          )}

          {settings.length === 0 && (
            <div className="settings-empty-state">
              <p>Đang tải cấu hình hệ thống...</p>
            </div>
          )}
        </div>

        {/* CỘT PHẢI: LIVE SIMULATION CALCULATOR */}
        <div className="settings-simulation-column">
          <div className="sim-panel sticky-panel">
            <div className="sim-header">
              <span className="sim-icon">🧪</span>
              <div>
                <h4>Mô phỏng chính sách (Live Preview)</h4>
                <p>Xem trước số tiền bệnh nhân nhận được khi hủy lịch</p>
              </div>
            </div>

            <div className="sim-price-input-box">
              <label>Giá khám thử nghiệm:</label>
              <div className="sim-price-row">
                <input
                  type="number"
                  step="50000"
                  min="0"
                  value={samplePrice}
                  onChange={(e) => setSamplePrice(Number(e.target.value) || 0)}
                  className="sim-input"
                />
                <span className="sim-unit">VNĐ</span>
              </div>
              <div className="sim-price-chips">
                {SAMPLE_PRICES.map((price) => (
                  <button
                    key={price}
                    type="button"
                    className={`price-chip ${samplePrice === price ? 'active' : ''}`}
                    onClick={() => setSamplePrice(price)}
                  >
                    {price / 1000}k
                  </button>
                ))}
              </div>
            </div>

            <div className="sim-results">
              {/* Kịch bản 1: Trước mốc quy định */}
              <div className="sim-card sim-card--ok">
                <div className="sim-card-top">
                  <span className="badge-scenario">Kịch bản 1</span>
                  <span className="scenario-label">Hủy trước {thresholdHours} giờ khám</span>
                </div>
                <div className="sim-rate-badge">Hoàn {rateBefore}%</div>
                <div className="sim-amount-row">
                  <span>Bệnh nhân nhận:</span>
                  <strong className="text-success">{formatCurrency(simRefundBefore)}</strong>
                </div>
                <div className="sim-sub-row">
                  <span>Phí phạt hủy:</span>
                  <span>{formatCurrency(simPenaltyBefore)}</span>
                </div>
              </div>

              {/* Kịch bản 2: Sau mốc quy định */}
              <div className="sim-card sim-card--warn">
                <div className="sim-card-top">
                  <span className="badge-scenario badge-scenario--warn">Kịch bản 2</span>
                  <span className="scenario-label">Hủy sau {thresholdHours} giờ khám</span>
                </div>
                <div className="sim-rate-badge sim-rate-badge--warn">Hoàn {rateAfter}%</div>
                <div className="sim-amount-row">
                  <span>Bệnh nhân nhận:</span>
                  <strong className="text-warning">{formatCurrency(simRefundAfter)}</strong>
                </div>
                <div className="sim-sub-row">
                  <span>Phí phạt hủy:</span>
                  <span>{formatCurrency(simPenaltyAfter)}</span>
                </div>
              </div>

              {/* Sàn thu */}
              <div className="sim-fee-box">
                <div className="fee-title">
                  <span>💳 Phí sàn ước tính khi khám thành công ({feeRate}%):</span>
                  <strong>{formatCurrency(simPlatformFee)}</strong>
                </div>
              </div>
            </div>

            <div className="sim-footer-note">
              <small>
                💡 Lưu ý: Các thay đổi sẽ được áp dụng ngay lập tức trên <strong>Modal Đặt Lịch</strong> của bệnh nhân và khi bệnh nhân gửi yêu cầu hủy lịch.
              </small>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemSettings;
