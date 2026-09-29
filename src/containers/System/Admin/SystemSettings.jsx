// src/containers/System/Admin/SystemSettings.jsx
// [Upgrade - Phương án 1] Admin Cài đặt & Vận hành Nền tảng (Platform Operations & Configuration)
// Tách biệt hoàn toàn khỏi Chính sách Tài chính/Phí sàn (được quản lý tại /system/policies)
import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Settings,
  Clock,
  UserCheck,
  AlertCircle,
  MailCheck,
  FileText,
  Bell,
  PhoneCall,
  Mail,
  MapPin,
  ShieldAlert,
  Lock,
  ShieldCheck,
  ArrowRight,
  RotateCw,
  Save,
  Check,
  CheckCircle2,
  AlertTriangle,
  Server,
  CreditCard,
  Send,
  Zap,
} from 'lucide-react';
import {
  getSystemSettings,
  updateSystemSetting,
  updateBulkSystemSettings,
  resetSystemSettings,
} from '../../../services/catalogService';
import './SystemSettings.scss';

// Cấu hình định nghĩa các tham số vận hành nền tảng BookingCare
const SETTING_DEFINITIONS = {
  // ═════ 1. VẬN HÀNH & ĐẶT KHÁM ═════
  booking_hold_timeout_minutes: {
    label: 'Thời gian giữ chỗ chờ thanh toán VNPay',
    unit: 'phút',
    icon: Clock,
    type: 'number',
    badgeColor: 'primary',
    category: 'operations',
    description: 'Khoảng thời gian tối đa để bệnh nhân hoàn tất thanh toán trước khi hệ thống tự động hủy và hoàn trả slot khám.',
    min: 5,
    max: 60,
    step: 5,
    presets: [10, 15, 20, 30],
  },
  max_daily_bookings_per_patient: {
    label: 'Giới hạn lịch hẹn trong ngày / Bệnh nhân',
    unit: 'lịch',
    icon: UserCheck,
    type: 'number',
    badgeColor: 'primary',
    category: 'operations',
    description: 'Số lịch hẹn tối đa một tài khoản bệnh nhân được đặt trong cùng 1 ngày (nhằm ngăn chặn đầu cơ hoặc spam giữ chỗ ảo).',
    min: 1,
    max: 10,
    step: 1,
    presets: [2, 3, 5],
  },
  min_hours_before_booking_cancel: {
    label: 'Hạn chót cho phép tự hủy lịch khám',
    unit: 'giờ',
    icon: AlertCircle,
    type: 'number',
    badgeColor: 'primary',
    category: 'operations',
    description: 'Bệnh nhân chỉ có thể tự hủy lịch trên cổng cá nhân nếu cách giờ hẹn khám tối thiểu khoảng thời gian này.',
    min: 1,
    max: 24,
    step: 1,
    presets: [1, 2, 4, 12],
  },

  // ═════ 2. KÊNH THÔNG BÁO & EMAIL TỰ ĐỘNG ═════
  auto_email_booking_confirmation: {
    label: 'Tự động gửi email xác nhận đặt lịch',
    icon: MailCheck,
    type: 'boolean',
    badgeColor: 'success',
    category: 'notifications',
    description: 'Gửi email xác nhận đặt lịch kèm mã QR tiếp nhận cho bệnh nhân ngay khi lịch khám chuyển sang trạng thái sẵn sàng.',
  },
  auto_email_remedy_prescription: {
    label: 'Tự động gửi hóa đơn & đơn thuốc sau khám',
    icon: FileText,
    type: 'boolean',
    badgeColor: 'success',
    category: 'notifications',
    description: 'Tự động gửi email chứa đơn thuốc, hướng dẫn chăm sóc y tế và các tệp đính kèm khi bác sĩ hoàn tất phiên khám.',
  },
  appointment_reminder_hours_before: {
    label: 'Gửi thông báo nhắc lịch khám trước',
    unit: 'giờ',
    icon: Bell,
    type: 'number',
    badgeColor: 'success',
    category: 'notifications',
    description: 'Tự động kích hoạt email hoặc thông báo nhắc nhở bệnh nhân trước khi khung giờ khám diễn ra.',
    min: 1,
    max: 24,
    step: 1,
    presets: [1, 2, 4],
  },

  // ═════ 3. THƯƠNG HIỆU & HỖ TRỢ CSKH ═════
  platform_support_hotline: {
    label: 'Hotline tổng đài CSKH (24/7)',
    icon: PhoneCall,
    type: 'text',
    badgeColor: 'info',
    category: 'branding',
    description: 'Đường dây nóng hỗ trợ bệnh nhân và bác sĩ hiển thị trên trang chủ, ứng dụng và chân trang email thông báo.',
    placeholder: 'Ví dụ: 1900-2115',
  },
  platform_support_email: {
    label: 'Hòm thư tiếp nhận hỗ trợ & phản hồi',
    icon: Mail,
    type: 'text',
    badgeColor: 'info',
    category: 'branding',
    description: 'Địa chỉ email CSKH chính thức tiếp nhận thắc mắc, khiếu nại và hóa đơn hoàn tiền của người dùng.',
    placeholder: 'Ví dụ: hotro@bookingcare.vn',
  },
  platform_headquarters_address: {
    label: 'Địa chỉ trụ sở công ty',
    icon: MapPin,
    type: 'text',
    badgeColor: 'info',
    category: 'branding',
    description: 'Địa chỉ văn phòng công ty hiển thị trên hóa đơn y tế điện tử, phiếu thu và chân trang website.',
    placeholder: 'Ví dụ: 28 Thành Thái, Dịch Vọng Hậu, Cầu Giấy, Hà Nội',
  },

  // ═════ 4. BẢO MẬT & HỆ THỐNG ═════
  maintenance_mode: {
    label: 'Chế độ bảo trì toàn sàn (Maintenance Mode)',
    icon: ShieldAlert,
    type: 'boolean',
    badgeColor: 'warning',
    category: 'security',
    description: 'Khi kích hoạt, cổng bệnh nhân sẽ tạm ngưng tiếp nhận đặt lịch mới và hiển thị màn hình thông báo nâng cấp hạ tầng.',
  },
  session_timeout_hours: {
    label: 'Thời hạn hiệu lực phiên làm việc',
    unit: 'giờ',
    icon: Lock,
    type: 'number',
    badgeColor: 'warning',
    category: 'security',
    description: 'Khoảng thời gian hiệu lực của phiên đăng nhập quản trị & bác sĩ trước khi hệ thống yêu cầu xác thực lại.',
    min: 1,
    max: 24,
    step: 1,
    presets: [2, 4, 8, 24],
  },
};

const SystemSettings = () => {
  const [settings, setSettings] = useState([]);
  const [editing, setEditing] = useState({}); // { [key]: newValue }
  const [saving, setSaving] = useState(''); // key đang lưu, hoặc 'ALL', hoặc 'RESET'
  const [bannerMsg, setBannerMsg] = useState({ type: '', text: '' });
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  // Chuẩn hóa trích xuất danh sách settings
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
      } else {
        setBannerMsg({ type: 'error', text: res?.message || 'Lưu thất bại!' });
      }
    } catch (err) {
      console.error(`Save ${key} error:`, err);
      setBannerMsg({ type: 'error', text: 'Lỗi máy chủ khi lưu cài đặt!' });
    } finally {
      setSaving('');
    }
  };

  // Lưu tất cả các setting đang có thay đổi
  const handleSaveAll = async () => {
    if (!hasDirtySettings) return;
    setSaving('ALL');
    try {
      const payload = Object.keys(editing)
        .filter((key) => {
          const original = settings.find((s) => s.key === key)?.value;
          return editing[key] !== undefined && String(editing[key]) !== String(original);
        })
        .map((key) => {
          const original = settings.find((s) => s.key === key);
          return {
            key,
            value: editing[key],
            description: SETTING_DEFINITIONS[key]?.description || original?.description || '',
          };
        });

      const res = await updateBulkSystemSettings(payload);
      const isOk = res?.errCode === 0 || res?.data?.errCode === 0;

      if (isOk) {
        setBannerMsg({ type: 'success', text: `Đã lưu thành công tất cả ${payload.length} cấu hình hệ thống!` });
        await fetchSettings();
        setEditing({});
      } else {
        setBannerMsg({ type: 'error', text: res?.message || 'Lưu hàng loạt thất bại!' });
      }
    } catch (err) {
      console.error('Save all error:', err);
      setBannerMsg({ type: 'error', text: 'Lỗi máy chủ khi lưu tất cả cài đặt!' });
    } finally {
      setSaving('');
    }
  };

  // Khôi phục cài đặt mặc định
  const handleResetDefaults = async () => {
    setSaving('RESET');
    setShowConfirmReset(false);
    try {
      const res = await resetSystemSettings();
      const isOk = res?.errCode === 0 || res?.data?.errCode === 0;

      if (isOk) {
        setBannerMsg({ type: 'success', text: 'Đã khôi phục toàn bộ cài đặt vận hành về giá trị chuẩn!' });
        await fetchSettings();
        setEditing({});
      } else {
        setBannerMsg({ type: 'error', text: res?.message || 'Khôi phục mặc định thất bại!' });
      }
    } catch (err) {
      console.error('Reset error:', err);
      setBannerMsg({ type: 'error', text: 'Lỗi máy chủ khi khôi phục cài đặt mặc định!' });
    } finally {
      setSaving('');
    }
  };

  // Phân nhóm settings theo category
  const categorizedSettings = useMemo(() => {
    const groups = {
      operations: [],
      notifications: [],
      branding: [],
      security: [],
      other: [],
    };

    settings.forEach((s) => {
      const def = SETTING_DEFINITIONS[s.key];
      const cat = def?.category || 'other';
      if (groups[cat]) {
        groups[cat].push(s);
      } else {
        groups.other.push(s);
      }
    });

    return groups;
  }, [settings]);

  // Render từng card cấu hình
  const renderSettingCard = (s) => {
    const def = SETTING_DEFINITIONS[s.key] || {
      label: s.description || s.key,
      unit: '',
      icon: Settings,
      type: 'text',
      badgeColor: 'primary',
      description: s.description || '',
    };

    const currentValue = editing[s.key] !== undefined ? editing[s.key] : s.value;
    const isDirty = editing[s.key] !== undefined && String(editing[s.key]) !== String(s.value);
    const IconComp = def.icon || Settings;

    return (
      <div className={`setting-card ${isDirty ? 'card-dirty' : ''}`} key={s.key}>
        <div className="card-top">
          <div className="card-identity">
            <span className={`icon-badge badge-${def.badgeColor || 'primary'}`}>
              <IconComp size={18} strokeWidth={2.2} />
            </span>
            <div className="title-wrap">
              <h4 className="setting-label">{def.label}</h4>
              <span className="setting-key-tag">{s.key}</span>
            </div>
          </div>

          <div className="card-status-pill">
            {isDirty ? (
              <span className="pill-dirty">Chưa lưu</span>
            ) : (
              <span className="pill-synced">
                <Check size={12} strokeWidth={3} /> Đã lưu
              </span>
            )}
          </div>
        </div>

        <p className="setting-desc">{def.description}</p>

        {/* Dynamic Controls based on field type */}
        <div className="card-controls-area">
          {def.type === 'boolean' ? (
            <div className="toggle-control-row">
              <label className="switch-toggle">
                <input
                  type="checkbox"
                  checked={String(currentValue) === 'true'}
                  onChange={(e) => handleEdit(s.key, String(e.target.checked))}
                />
                <span className="slider round" />
              </label>
              <span className="toggle-status-label">
                {String(currentValue) === 'true' ? (
                  <strong className="text-emerald-600">Đang bật (Active)</strong>
                ) : (
                  <span className="text-slate-400">Đang tắt (Disabled)</span>
                )}
              </span>
            </div>
          ) : def.type === 'number' ? (
            <div className="number-control-group">
              <div className="input-number-wrap">
                <input
                  type="number"
                  min={def.min ?? 0}
                  max={def.max ?? 9999}
                  step={def.step ?? 1}
                  value={currentValue}
                  onChange={(e) => handleEdit(s.key, e.target.value)}
                  className="field-number-input"
                />
                {def.unit && <span className="field-unit-suffix">{def.unit}</span>}
              </div>

              {def.presets && def.presets.length > 0 && (
                <div className="presets-strip">
                  <span className="presets-label">Mẫu nhanh:</span>
                  {def.presets.map((preset) => (
                    <button
                      type="button"
                      key={preset}
                      className={`btn-preset ${Number(currentValue) === Number(preset) ? 'active' : ''}`}
                      onClick={() => handleEdit(s.key, String(preset))}
                    >
                      {preset} {def.unit}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-control-group">
              <input
                type="text"
                value={currentValue}
                placeholder={def.placeholder || ''}
                onChange={(e) => handleEdit(s.key, e.target.value)}
                className="field-text-input"
              />
            </div>
          )}

          {/* Nút lưu đơn lẻ */}
          <div className="single-save-wrap">
            <button
              type="button"
              className={`btn-single-save ${isDirty ? 'dirty' : ''}`}
              disabled={!isDirty || saving === s.key}
              onClick={() => handleSaveSingle(s.key)}
            >
              {saving === s.key ? (
                <>
                  <RotateCw size={14} className="fa-spin" /> Lưu...
                </>
              ) : isDirty ? (
                <>
                  <Save size={14} /> Lưu thay đổi
                </>
              ) : (
                <>
                  <Check size={14} strokeWidth={2.5} /> Chuẩn khớp
                </>
              )}
            </button>
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
          <div className="header-badge">
            <Settings size={14} strokeWidth={2.5} />
            <span>Platform Configuration & Operations</span>
          </div>
          <h2>Cài đặt & Vận hành Nền tảng</h2>
          <p>
            Trung tâm giám sát cấu hình vận hành đặt lịch, thời gian giữ chỗ thanh toán, kênh thông báo tự động và thông tin liên hệ sàn BookingCare.
          </p>
        </div>

        <div className="header-actions">
          <button
            type="button"
            className="btn-action-reset"
            onClick={() => setShowConfirmReset(true)}
            disabled={saving !== ''}
            title="Khôi phục lại toàn bộ cài đặt vận hành về giá trị chuẩn"
          >
            <RotateCw size={14} /> Khôi phục mặc định
          </button>

          <button
            type="button"
            className={`btn-action-save-all ${hasDirtySettings ? 'has-changes' : ''}`}
            disabled={!hasDirtySettings || saving !== ''}
            onClick={handleSaveAll}
          >
            {saving === 'ALL' ? (
              <>
                <RotateCw size={14} className="fa-spin" /> Đang lưu tất cả...
              </>
            ) : (
              <>
                <Save size={15} /> Lưu tất cả cấu hình
                {dirtyCount > 0 && <span className="dirty-pill">{dirtyCount}</span>}
              </>
            )}
          </button>
        </div>
      </div>

      {/* ===== BANNER MESSAGE ===== */}
      {bannerMsg.text && (
        <div className={`settings-banner banner-${bannerMsg.type}`}>
          <span className="banner-icon">
            {bannerMsg.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          </span>
          <span className="banner-content">{bannerMsg.text}</span>
          <button type="button" className="banner-close" onClick={() => setBannerMsg({ type: '', text: '' })}>
            ✕
          </button>
        </div>
      )}

      {/* ===== MODAL XÁC NHẬN RESET ===== */}
      {showConfirmReset && (
        <div className="settings-modal-backdrop">
          <div className="settings-modal-box">
            <div className="modal-icon-warn">
              <AlertTriangle size={32} />
            </div>
            <h3>Xác nhận khôi phục cài đặt mặc định?</h3>
            <p>
              Toàn bộ thông số vận hành nền tảng sẽ được đặt lại theo giá trị chuẩn ban đầu:
              <br />• Giữ chỗ thanh toán: <strong>15 phút</strong>
              <br />• Giới hạn đặt khám / ngày: <strong>3 lịch</strong>
              <br />• Hạn chót tự hủy lịch: <strong>2 giờ</strong>
              <br />• Hotline CSKH: <strong>1900-2115</strong>
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
        {/* CỘT TRÁI: CÁC NHÓM CẤU HÌNH VẬN HÀNH */}
        <div className="settings-cards-column">
          {/* Nhóm 1: Vận hành & Quy tắc Đặt khám */}
          {categorizedSettings.operations.length > 0 && (
            <div className="settings-section">
              <div className="section-header">
                <span className="section-dot dot-blue" />
                <h3>Vận hành & Quy tắc Đặt khám (Booking Operations)</h3>
              </div>
              <div className="cards-wrapper">
                {categorizedSettings.operations.map(renderSettingCard)}
              </div>
            </div>
          )}

          {/* Nhóm 2: Kênh Thông báo & Tự động hóa */}
          {categorizedSettings.notifications.length > 0 && (
            <div className="settings-section">
              <div className="section-header">
                <span className="section-dot dot-green" />
                <h3>Kênh Thông báo & Tự động hóa Email (Notifications)</h3>
              </div>
              <div className="cards-wrapper">
                {categorizedSettings.notifications.map(renderSettingCard)}
              </div>
            </div>
          )}

          {/* Nhóm 3: Thông tin Thương hiệu & Hỗ trợ */}
          {categorizedSettings.branding.length > 0 && (
            <div className="settings-section">
              <div className="section-header">
                <span className="section-dot dot-purple" />
                <h3>Thông tin Thương hiệu & Đường dây CSKH</h3>
              </div>
              <div className="cards-wrapper">
                {categorizedSettings.branding.map(renderSettingCard)}
              </div>
            </div>
          )}

          {/* Nhóm 4: An toàn & Bảo trì */}
          {categorizedSettings.security.length > 0 && (
            <div className="settings-section">
              <div className="section-header">
                <span className="section-dot dot-amber" />
                <h3>Bảo mật & Trạng thái Hệ thống</h3>
              </div>
              <div className="cards-wrapper">
                {categorizedSettings.security.map(renderSettingCard)}
              </div>
            </div>
          )}

          {/* Nhóm khác nếu có */}
          {categorizedSettings.other.length > 0 && (
            <div className="settings-section">
              <div className="section-header">
                <span className="section-dot dot-slate" />
                <h3>Các thông số bổ sung</h3>
              </div>
              <div className="cards-wrapper">
                {categorizedSettings.other.map(renderSettingCard)}
              </div>
            </div>
          )}
        </div>

        {/* CỘT PHẢI: TRẠNG THÁI HẠ TẦNG & ĐIỀU HƯỚNG TÀI CHÍNH */}
        <div className="settings-sidebar-column">
          {/* Card 1: Trạng thái Vận hành Hạ tầng */}
          <div className="health-status-card">
            <div className="health-card-header">
              <div className="header-title-row">
                <Server size={18} className="text-teal-600" />
                <h4>Trạng thái Hạ tầng & Kết nối</h4>
              </div>
              <span className="health-online-pill">
                <span className="pulsing-dot" /> Online
              </span>
            </div>

            <div className="health-items-list">
              <div className="health-item">
                <div className="item-left">
                  <CreditCard size={15} />
                  <span>Cổng thanh toán:</span>
                </div>
                <strong className="item-value text-emerald-600">VNPay Sandbox (Active)</strong>
              </div>

              <div className="health-item">
                <div className="item-left">
                  <Send size={15} />
                  <span>Dịch vụ Email:</span>
                </div>
                <strong className="item-value text-emerald-600">Nodemailer SMTP (Ready)</strong>
              </div>

              <div className="health-item">
                <div className="item-left">
                  <Zap size={15} />
                  <span>Bộ đệm hệ thống:</span>
                </div>
                <strong className="item-value text-cyan-600">Sequelize Connection Pool</strong>
              </div>

              <div className="health-item">
                <div className="item-left">
                  <Clock size={15} />
                  <span>Múi giờ chuẩn:</span>
                </div>
                <span className="item-value font-mono">Asia/Ho_Chi_Minh (GMT+7)</span>
              </div>
            </div>
          </div>

          {/* Card 2: Phân định Phân hệ Chính sách Phí & Hoàn tiền */}
          <div className="policy-redirection-card">
            <div className="policy-card-top">
              <div className="policy-badge-icon">
                <ShieldCheck size={24} />
              </div>
              <div className="policy-card-headings">
                <h4>Chính sách Phí & Hoàn tiền</h4>
                <span>Kiến trúc Sổ cái Bất biến (Immutable Ledger)</span>
              </div>
            </div>

            <p className="policy-card-desc">
              Tỷ lệ phân bổ phí dịch vụ sàn và quy định hoàn tiền viện phí theo bậc thang thời gian hiện được quản lý độc lập tại phân hệ <strong>Chính sách & Tỷ lệ phí</strong> để đảm bảo 100% tính toàn vẹn dữ liệu kế toán và đối soát.
            </p>

            <Link to="/system/policies" className="btn-goto-policy">
              <span>Đến trang Chính sách & Tỷ lệ phí</span>
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemSettings;
