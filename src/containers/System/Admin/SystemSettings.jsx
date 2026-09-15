// src/containers/System/Admin/SystemSettings.jsx
// [Phase D.12] Admin quản lý cài đặt hệ thống (tỷ lệ hoàn tiền, phí dịch vụ)
import React, { useEffect, useState } from 'react';
import { getSystemSettings, updateSystemSetting } from '../../../services/catalogService';
import './SystemSettings.scss';

const SETTING_LABELS = {
  refund_rate_cancel_before_24h: { label: 'Tỷ lệ hoàn tiền — Hủy trước 24h', unit: '%', icon: '⏰', description: 'Phần trăm hoàn tiền khi bệnh nhân hủy lịch trước 24 giờ' },
  refund_rate_cancel_after_24h:  { label: 'Tỷ lệ hoàn tiền — Hủy sau 24h',   unit: '%', icon: '⚠️', description: 'Phần trăm hoàn tiền khi bệnh nhân hủy lịch sau 24 giờ' },
  service_fee_rate:              { label: 'Phí dịch vụ hệ thống',              unit: '%', icon: '💳', description: 'Phần trăm phí dịch vụ thu trên mỗi lịch khám thành công' },
};

const SystemSettings = () => {
  const [settings, setSettings] = useState([]);
  const [editing, setEditing]   = useState({});  // { [key]: newValue }
  const [saving, setSaving]     = useState('');
  const [msg, setMsg]           = useState({ type: '', text: '', key: '' });

  const fetchSettings = async () => {
    const res = await getSystemSettings();
    if (res?.data?.errCode === 0) setSettings(res.data.data || []);
  };

  useEffect(() => { fetchSettings(); }, []);

  const handleEdit = (key, value) => {
    setEditing(p => ({ ...p, [key]: value }));
  };

  const handleSave = async (key, description) => {
    const value = editing[key];
    if (value === undefined || value === '') return;
    setSaving(key);
    try {
      const res = await updateSystemSetting(key, value, description);
      if (res?.data?.errCode === 0) {
        setMsg({ type: 'success', text: 'Cập nhật thành công!', key });
        await fetchSettings();
        setEditing(p => { const n = { ...p }; delete n[key]; return n; });
        setTimeout(() => setMsg({ type: '', text: '', key: '' }), 3000);
      }
    } catch {
      setMsg({ type: 'error', text: 'Có lỗi xảy ra!', key });
    } finally {
      setSaving('');
    }
  };

  return (
    <div className="system-settings-page">
      <div className="ss-header">
        <h2>⚙️ Cài đặt hệ thống</h2>
        <p>Quản lý tỷ lệ hoàn tiền, phí dịch vụ và các thông số toàn hệ thống</p>
      </div>

      <div className="ss-cards">
        {settings.map(s => {
          const meta = SETTING_LABELS[s.key] || { label: s.key, unit: '', icon: '⚙️', description: s.description };
          const currentVal = editing[s.key] !== undefined ? editing[s.key] : s.value;
          const isDirty = editing[s.key] !== undefined && editing[s.key] !== s.value;

          return (
            <div key={s.key} className={`ss-card${isDirty ? ' ss-card--dirty' : ''}`}>
              <div className="ss-card-header">
                <span className="ss-icon">{meta.icon}</span>
                <div>
                  <h4>{meta.label}</h4>
                  <p className="ss-desc">{meta.description || s.description}</p>
                </div>
              </div>

              {msg.key === s.key && msg.text && (
                <div className={`ss-msg ss-msg--${msg.type}`}>{msg.text}</div>
              )}

              <div className="ss-control">
                <div className="ss-input-wrap">
                  <input
                    type="number"
                    min="0"
                    max={meta.unit === '%' ? 100 : undefined}
                    value={currentVal || ''}
                    onChange={e => handleEdit(s.key, e.target.value)}
                  />
                  {meta.unit && <span className="ss-unit">{meta.unit}</span>}
                </div>
                <button
                  className="btn-save-setting"
                  disabled={!isDirty || saving === s.key}
                  onClick={() => handleSave(s.key, meta.description)}
                >
                  {saving === s.key ? '⏳' : '💾'} Lưu
                </button>
              </div>
            </div>
          );
        })}

        {settings.length === 0 && (
          <div className="ss-empty">
            <p>Chưa có cài đặt nào. Vui lòng chạy seed data.</p>
            <code>npm run seed</code>
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemSettings;
