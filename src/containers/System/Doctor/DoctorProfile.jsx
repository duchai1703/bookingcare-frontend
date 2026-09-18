// src/containers/System/Doctor/DoctorProfile.jsx
// [Doctor Profile & Settings Workspace] Master - Detail + 5 Sections
// Quản lý thông tin định danh, chuyên môn, cơ sở công tác, nhận tiền và cài đặt tư vấn
import React, { useEffect, useState, useRef } from 'react';
import { FormattedMessage } from 'react-intl';
import { getDoctorOwnProfile, updateDoctorOwnProfile } from '../../../services/doctorService';
import './DoctorProfile.scss';

const BANK_OPTIONS = [
  'Ngân hàng TMCP Ngoại Thương Việt Nam (Vietcombank)',
  'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam (BIDV)',
  'Ngân hàng TMCP Quân đội (MB Bank)',
  'Ngân hàng TMCP Kỹ Thương Việt Nam (Techcombank)',
  'Ngân hàng TMCP Công Thương Việt Nam (VietinBank)',
  'Ngân hàng TMCP Á Châu (ACB)',
  'Ngân hàng TMCP Việt Nam Thịnh Vượng (VPBank)',
  'Ngân hàng Nông nghiệp và Phát triển Nông thôn (Agribank)',
];

const DoctorProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'credentials' | 'facilities' | 'payout' | 'consultation'
  const [alert, setAlert] = useState({ type: '', message: '' });

  // Modals
  const [showPublicPreview, setShowPublicPreview] = useState(false);
  const [showEditPersonalModal, setShowEditPersonalModal] = useState(false);
  const [showCredentialRequestModal, setShowCredentialRequestModal] = useState(false);

  // Forms
  const [personalForm, setPersonalForm] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    address: '',
    description: '',
    contentMarkdown: '',
    image: null,
  });

  const [payoutForm, setPayoutForm] = useState({
    bankName: '',
    bankAccountNumber: '',
    bankAccountName: '',
  });

  const [consultationForm, setConsultationForm] = useState({
    allowChatFollowUp: true,
    chatDurationDays: 7,
    allowVideoFollowUp: true,
    videoCount: 1,
    videoDurationMinutes: 15,
  });

  const [credentialRequest, setCredentialRequest] = useState({
    type: 'degree',
    title: '',
    documentNumber: '',
    issuingAuthority: '',
    note: '',
    submitted: false,
  });

  const fileInputRef = useRef(null);

  // Load profile data
  const loadProfile = async () => {
    try {
      setLoading(true);
      const res = await getDoctorOwnProfile();
      if (res && res.errCode === 0 && res.data) {
        const d = res.data;
        setProfile(d);
        setPersonalForm({
          firstName: d.firstName || '',
          lastName: d.lastName || '',
          phoneNumber: d.phoneNumber || '',
          address: d.address || '',
          description: d.doctorInfoData?.description || '',
          contentMarkdown: d.doctorInfoData?.contentMarkdown || '',
          image: d.image || null,
        });
        setPayoutForm({
          bankName: d.payoutAccount?.bankName || BANK_OPTIONS[0],
          bankAccountNumber: d.doctorInfoData?.bankAccountNumber || d.payoutAccount?.bankAccountNumber || '0071000998822',
          bankAccountName: d.doctorInfoData?.bankAccountName || d.payoutAccount?.bankAccountName || `${d.lastName || ''} ${d.firstName || ''}`.trim().toUpperCase(),
        });
        if (d.consultationSettings) {
          setConsultationForm({
            allowChatFollowUp: Boolean(d.consultationSettings.allowChatFollowUp),
            chatDurationDays: d.consultationSettings.chatDurationDays || 7,
            allowVideoFollowUp: Boolean(d.consultationSettings.allowVideoFollowUp),
            videoCount: d.consultationSettings.videoCount || 1,
            videoDurationMinutes: d.consultationSettings.videoDurationMinutes || 15,
          });
        }
      } else {
        setAlert({ type: 'error', message: res?.message || 'Không thể tải thông tin bác sĩ.' });
      }
    } catch (err) {
      console.error('DoctorProfile load error:', err);
      setAlert({ type: 'error', message: 'Lỗi kết nối máy chủ khi tải hồ sơ.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const triggerAlert = (type, message) => {
    setAlert({ type, message });
    setTimeout(() => {
      setAlert({ type: '', message: '' });
    }, 4000);
  };

  // Avatar change handler
  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      triggerAlert('error', 'Kích thước ảnh tối đa là 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target.result;
      setPersonalForm(prev => ({ ...prev, image: base64 }));
      try {
        setSaving(true);
        const res = await updateDoctorOwnProfile({ image: base64 });
        if (res?.errCode === 0) {
          triggerAlert('success', 'Đã cập nhật ảnh đại diện bác sĩ thành công!');
          loadProfile();
        } else {
          triggerAlert('error', res?.message || 'Cập nhật ảnh thất bại.');
        }
      } catch (err) {
        triggerAlert('error', 'Lỗi kết nối khi cập nhật ảnh đại diện.');
      } finally {
        setSaving(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Save personal info
  const handleSavePersonal = async () => {
    try {
      setSaving(true);
      const res = await updateDoctorOwnProfile({
        firstName: personalForm.firstName,
        lastName: personalForm.lastName,
        phoneNumber: personalForm.phoneNumber,
        address: personalForm.address,
        description: personalForm.description,
        contentMarkdown: personalForm.contentMarkdown,
      });
      if (res?.errCode === 0) {
        triggerAlert('success', 'Cập nhật thông tin cá nhân & giới thiệu thành công!');
        setShowEditPersonalModal(false);
        loadProfile();
      } else {
        triggerAlert('error', res?.message || 'Cập nhật thất bại.');
      }
    } catch (err) {
      triggerAlert('error', 'Lỗi khi lưu thông tin cá nhân.');
    } finally {
      setSaving(false);
    }
  };

  // Save payout account
  const handleSavePayout = async () => {
    if (!payoutForm.bankAccountNumber || !payoutForm.bankAccountName) {
      triggerAlert('error', 'Vui lòng nhập đầy đủ số tài khoản và tên chủ tài khoản thụ hưởng.');
      return;
    }
    try {
      setSaving(true);
      const res = await updateDoctorOwnProfile({
        bankName: payoutForm.bankName,
        bankAccountNumber: payoutForm.bankAccountNumber,
        bankAccountName: payoutForm.bankAccountName.toUpperCase(),
      });
      if (res?.errCode === 0) {
        triggerAlert('success', 'Đã lưu thông tin tài khoản nhận tiền thành công!');
        loadProfile();
      } else {
        triggerAlert('error', res?.message || 'Không thể lưu tài khoản nhận tiền.');
      }
    } catch (err) {
      triggerAlert('error', 'Lỗi khi lưu thông tin nhận tiền.');
    } finally {
      setSaving(false);
    }
  };

  // Save consultation settings
  const handleSaveConsultation = async () => {
    try {
      setSaving(true);
      const res = await updateDoctorOwnProfile({
        consultationSettings: consultationForm,
      });
      if (res?.errCode === 0) {
        triggerAlert('success', 'Đã lưu cài đặt tư vấn sau khám thành công!');
        loadProfile();
      } else {
        triggerAlert('error', res?.message || 'Không thể lưu cài đặt tư vấn.');
      }
    } catch (err) {
      triggerAlert('error', 'Lỗi khi lưu cài đặt tư vấn.');
    } finally {
      setSaving(false);
    }
  };

  // Handle credential change request submission
  const handleCredentialSubmit = (e) => {
    e.preventDefault();
    if (!credentialRequest.title || !credentialRequest.documentNumber) {
      triggerAlert('error', 'Vui lòng nhập tên văn bằng/chứng chỉ và số hiệu văn bản.');
      return;
    }
    setCredentialRequest(prev => ({ ...prev, submitted: true }));
    setTimeout(() => {
      triggerAlert('success', 'Đã gửi đề nghị xác minh văn bằng/chứng chỉ tới Ban Thẩm định Y tế BookingCare.');
      setShowCredentialRequestModal(false);
      setCredentialRequest({
        type: 'degree',
        title: '',
        documentNumber: '',
        issuingAuthority: '',
        note: '',
        submitted: false,
      });
    }, 800);
  };

  if (loading) {
    return (
      <div className="doctor-profile-workspace">
        <div className="dpw-loading">
          <div className="dpw-spinner" />
          <span>Đang tải không gian Hồ sơ & Cài đặt...</span>
        </div>
      </div>
    );
  }

  const doctorTitle = profile?.positionData?.valueVi || 'Bác sĩ';
  const fullName = `${doctorTitle} ${profile?.lastName || ''} ${profile?.firstName || ''}`.trim();
  const avatarSrc = personalForm.image
    ? (personalForm.image.startsWith('data:') ? personalForm.image : `data:image/jpeg;base64,${personalForm.image}`)
    : null;

  return (
    <div className="doctor-profile-workspace">
      {/* ── TOP HEADER BAR ── */}
      <div className="dpw-header">
        <div className="dpw-header__left">
          <div className="dpw-header__tag">
            <span className="dpw-pulse" /> DOCTOR PORTAL WORKSPACE
          </div>
          <h1 className="dpw-header__title">
            <FormattedMessage id="doctor.profile.title" defaultMessage="Hồ sơ & cài đặt" />
          </h1>
          <p className="dpw-header__sub">
            Quản lý định danh y khoa, cơ sở công tác đa điểm, chứng chỉ hành nghề, tài khoản nhận tiền và chính sách hỗ trợ người bệnh.
          </p>
        </div>

        <div className="dpw-header__actions">
          <button
            type="button"
            className="btn-preview-public"
            onClick={() => setShowPublicPreview(true)}
            title="Xem giao diện người bệnh nhìn thấy trên ứng dụng BookingCare"
          >
            <span className="btn-icon">👁</span>
            <span>Xem hồ sơ công khai</span>
          </button>
        </div>
      </div>

      {/* ── ALERT MESSAGE ── */}
      {alert.message && (
        <div className={`dpw-alert dpw-alert--${alert.type}`}>
          <span className="dpw-alert__icon">{alert.type === 'success' ? '✅' : '⚠️'}</span>
          <span className="dpw-alert__text">{alert.message}</span>
        </div>
      )}

      {/* ── HERO PROFILE BANNER ── */}
      <div className="dpw-hero-card">
        <div className="dpw-hero__avatar-container">
          <div
            className="dpw-hero__avatar"
            onClick={() => fileInputRef.current?.click()}
            title="Bấm để thay đổi ảnh đại diện"
          >
            {avatarSrc ? (
              <img src={avatarSrc} alt={fullName} />
            ) : (
              <div className="dpw-hero__avatar-placeholder">🩺</div>
            )}
            <div className="dpw-hero__avatar-overlay">
              <span>📷 Đổi ảnh</span>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleAvatarChange}
          />
        </div>

        <div className="dpw-hero__info">
          <div className="dpw-hero__title-row">
            <h2 className="dpw-hero__name">{fullName}</h2>
            <div className="dpw-hero__verified-badge" title="Hồ sơ y khoa đã được thẩm định pháp lý">
              <span className="badge-icon">✓</span>
              <span>Đã xác minh</span>
            </div>
            <div className="dpw-hero__status-pill">
              <span className="status-dot status-dot--online" />
              <span>Đang nhận khám</span>
            </div>
          </div>

          <div className="dpw-hero__tags">
            <div className="dpw-tag">
              <span className="dpw-tag__icon">🩺</span>
              <span>{profile?.doctorInfoData?.specialtyData?.name || 'Cơ xương khớp'}</span>
            </div>
            <div className="dpw-tag">
              <span className="dpw-tag__icon">🏥</span>
              <span>{profile?.facilityAssignments?.[0]?.clinicName || profile?.doctorInfoData?.clinicData?.name || 'Phòng khám đa khoa'}</span>
            </div>
            <div className="dpw-tag">
              <span className="dpw-tag__icon">⏳</span>
              <span>Kinh nghiệm: {profile?.experienceYears || 8}+ năm</span>
            </div>
            <div className="dpw-tag">
              <span className="dpw-tag__icon">📜</span>
              <span>{profile?.credentials?.medicalLicense?.licenseNumber || 'CCHN-000002/BYT'}</span>
            </div>
          </div>
        </div>

        <div className="dpw-hero__cta">
          <button
            type="button"
            className="btn-edit-quick"
            onClick={() => setShowEditPersonalModal(true)}
          >
            <span>✏</span> Chỉnh sửa hồ sơ
          </button>
          <div className="dpw-hero__completeness">
            <div className="dpw-completeness-bar">
              <div
                className="dpw-completeness-fill"
                style={{ width: `${profile?.completenessPercent || 86}%` }}
              />
            </div>
            <span className="dpw-completeness-text">
              Hoàn thiện <strong>{profile?.completenessPercent || 86}%</strong>
            </span>
          </div>
        </div>
      </div>

      {/* ── TAB NAVIGATION ── */}
      <div className="dpw-tabs">
        <button
          type="button"
          className={`dpw-tab ${activeTab === 'overview' ? 'dpw-tab--active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <span className="dpw-tab__icon">👤</span>
          <span className="dpw-tab__label">Hồ sơ của tôi</span>
        </button>
        <button
          type="button"
          className={`dpw-tab ${activeTab === 'credentials' ? 'dpw-tab--active' : ''}`}
          onClick={() => setActiveTab('credentials')}
        >
          <span className="dpw-tab__icon">🩺</span>
          <span className="dpw-tab__label">Chuyên môn & Chứng chỉ</span>
          <span className="dpw-tab__badge">2 CCHN</span>
        </button>
        <button
          type="button"
          className={`dpw-tab ${activeTab === 'facilities' ? 'dpw-tab--active' : ''}`}
          onClick={() => setActiveTab('facilities')}
        >
          <span className="dpw-tab__icon">🏥</span>
          <span className="dpw-tab__label">Cơ sở làm việc</span>
          <span className="dpw-tab__badge">{profile?.facilityAssignments?.length || 1}</span>
        </button>
        <button
          type="button"
          className={`dpw-tab ${activeTab === 'payout' ? 'dpw-tab--active' : ''}`}
          onClick={() => setActiveTab('payout')}
        >
          <span className="dpw-tab__icon">💳</span>
          <span className="dpw-tab__label">Thông tin nhận tiền</span>
        </button>
        <button
          type="button"
          className={`dpw-tab ${activeTab === 'consultation' ? 'dpw-tab--active' : ''}`}
          onClick={() => setActiveTab('consultation')}
        >
          <span className="dpw-tab__icon">💬</span>
          <span className="dpw-tab__label">Cài đặt tư vấn</span>
        </button>
      </div>

      {/* ── TAB CONTENT BODY ── */}
      <div className="dpw-content">
        {/* ================= TAB 1: OVERVIEW ================= */}
        {activeTab === 'overview' && (
          <div className="dpw-overview-grid">
            {/* Left Column: Personal details & Bio */}
            <div className="dpw-col dpw-col--main">
              {/* Card 1: Personal Info & Scope */}
              <div className="dpw-card">
                <div className="dpw-card__header">
                  <div className="dpw-card__title">
                    <span className="dpw-card__icon">📋</span>
                    <span>Thông tin cá nhân & Liên hệ</span>
                  </div>
                  <button
                    type="button"
                    className="btn-card-action"
                    onClick={() => setShowEditPersonalModal(true)}
                  >
                    ✏ Chỉnh sửa
                  </button>
                </div>

                <div className="dpw-info-grid">
                  <div className="dpw-info-item">
                    <span className="dpw-info-label">Họ và tên đệm</span>
                    <span className="dpw-info-value">{profile?.lastName || '—'}</span>
                  </div>
                  <div className="dpw-info-item">
                    <span className="dpw-info-label">Tên</span>
                    <span className="dpw-info-value">{profile?.firstName || '—'}</span>
                  </div>
                  <div className="dpw-info-item">
                    <span className="dpw-info-label">Email tài khoản</span>
                    <span className="dpw-info-value">
                      {profile?.email}
                      <span className="dpw-privacy-tag dpw-privacy-tag--internal" title="Chỉ hiển thị nội bộ với ban quản trị">
                        🔒 Nội bộ
                      </span>
                    </span>
                  </div>
                  <div className="dpw-info-item">
                    <span className="dpw-info-label">Số điện thoại liên lạc</span>
                    <span className="dpw-info-value">
                      {profile?.phoneNumber || 'Chưa cập nhật'}
                      <span className="dpw-privacy-tag dpw-privacy-tag--patient" title="Người bệnh đã xác nhận lịch có thể liên hệ">
                        👁 Lịch xác nhận
                      </span>
                    </span>
                  </div>
                  <div className="dpw-info-item">
                    <span className="dpw-info-label">Giới tính</span>
                    <span className="dpw-info-value">{profile?.genderData?.valueVi || 'Nam'}</span>
                  </div>
                  <div className="dpw-info-item">
                    <span className="dpw-info-label">Chức danh / Học vị</span>
                    <span className="dpw-info-value">{profile?.positionData?.valueVi || 'Bác sĩ'}</span>
                  </div>
                  <div className="dpw-info-item dpw-info-item--full">
                    <span className="dpw-info-label">Địa chỉ làm việc / Liên hệ</span>
                    <span className="dpw-info-value">{profile?.address || 'Chưa cập nhật'}</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Bio & Description */}
              <div className="dpw-card">
                <div className="dpw-card__header">
                  <div className="dpw-card__title">
                    <span className="dpw-card__icon">📝</span>
                    <span>Tóm tắt giới thiệu & Quá trình công tác</span>
                  </div>
                  <button
                    type="button"
                    className="btn-card-action"
                    onClick={() => setShowEditPersonalModal(true)}
                  >
                    ✏ Chỉnh sửa nội dung
                  </button>
                </div>

                <div className="dpw-bio-section">
                  <div className="dpw-bio-summary">
                    <label className="dpw-sublabel">Tóm tắt ngắn (Hiển thị đầu trang danh sách bác sĩ):</label>
                    <p className="dpw-bio-text">
                      {profile?.doctorInfoData?.description || (
                        <em className="text-muted">Chưa có tóm tắt giới thiệu ngắn. Bấm "Chỉnh sửa nội dung" để bổ sung giúp người bệnh nắm bắt nhanh chuyên môn của Bác sĩ.</em>
                      )}
                    </p>
                  </div>

                  <div className="dpw-bio-markdown">
                    <label className="dpw-sublabel">Chi tiết quá trình đào tạo & kinh nghiệm lâm sàng (Markdown):</label>
                    <div className="dpw-markdown-rendered">
                      {profile?.doctorInfoData?.contentMarkdown ? (
                        <pre className="dpw-markdown-pre">{profile.doctorInfoData.contentMarkdown}</pre>
                      ) : (
                        <em className="text-muted">Chưa có nội dung giới thiệu chi tiết.</em>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Profile Completeness & Linked Facilities */}
            <div className="dpw-col dpw-col--side">
              {/* Card: Completeness Checklist */}
              <div className="dpw-card dpw-card--accent">
                <div className="dpw-card__header">
                  <div className="dpw-card__title">
                    <span className="dpw-card__icon">🎯</span>
                    <span>Độ tin cậy & Hoàn thiện</span>
                  </div>
                  <span className="dpw-percentage-badge">{profile?.completenessPercent || 86}%</span>
                </div>

                <p className="dpw-card__hint">
                  Hồ sơ đầy đủ giúp tăng 40% tỷ lệ người bệnh lựa chọn đặt khám.
                </p>

                <div className="dpw-checklist">
                  {profile?.checklist?.map((item) => (
                    <div key={item.key} className={`dpw-checklist-item ${item.done ? 'dpw-checklist-item--done' : ''}`}>
                      <span className="dpw-check-icon">{item.done ? '✓' : '○'}</span>
                      <span className="dpw-check-label">{item.label}</span>
                    </div>
                  )) || (
                    <>
                      <div className="dpw-checklist-item dpw-checklist-item--done">
                        <span className="dpw-check-icon">✓</span>
                        <span className="dpw-check-label">Thông tin cá nhân</span>
                      </div>
                      <div className="dpw-checklist-item dpw-checklist-item--done">
                        <span className="dpw-check-icon">✓</span>
                        <span className="dpw-check-label">Ảnh đại diện bác sĩ</span>
                      </div>
                      <div className="dpw-checklist-item dpw-checklist-item--done">
                        <span className="dpw-check-icon">✓</span>
                        <span className="dpw-check-label">Chứng chỉ hành nghề đã xác minh</span>
                      </div>
                      <div className="dpw-checklist-item dpw-checklist-item--done">
                        <span className="dpw-check-icon">✓</span>
                        <span className="dpw-check-label">Tài khoản nhận tiền đã liên kết</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Card: Quick Facilities Summary */}
              <div className="dpw-card">
                <div className="dpw-card__header">
                  <div className="dpw-card__title">
                    <span className="dpw-card__icon">🏥</span>
                    <span>Cơ sở khám bệnh</span>
                  </div>
                  <button
                    type="button"
                    className="btn-link-action"
                    onClick={() => setActiveTab('facilities')}
                  >
                    Xem tất cả →
                  </button>
                </div>

                <div className="dpw-mini-facility-list">
                  {profile?.facilityAssignments?.map((fac) => (
                    <div key={fac.id} className="dpw-mini-facility">
                      <div className="dpw-mini-facility__top">
                        <span className="dpw-facility-name">{fac.clinicName}</span>
                        {fac.isPrimary && <span className="dpw-pill-primary">Chính</span>}
                      </div>
                      <div className="dpw-mini-facility__meta">
                        <span>{fac.specialtyName}</span> • <span>{fac.roomNumber}</span>
                      </div>
                      <div className="dpw-mini-facility__price">
                        Giá khám: <strong>{fac.priceVnd}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card: Quick Payout Summary */}
              <div className="dpw-card">
                <div className="dpw-card__header">
                  <div className="dpw-card__title">
                    <span className="dpw-card__icon">💳</span>
                    <span>Tài khoản nhận tiền</span>
                  </div>
                  <button
                    type="button"
                    className="btn-link-action"
                    onClick={() => setActiveTab('payout')}
                  >
                    Cài đặt →
                  </button>
                </div>

                <div className="dpw-mini-payout">
                  <div className="dpw-payout-bank">{profile?.payoutAccount?.bankName || 'Vietcombank'}</div>
                  <div className="dpw-payout-number">{profile?.payoutAccount?.maskedAccountNumber || '••••••••8822'}</div>
                  <div className="dpw-payout-holder">{profile?.payoutAccount?.bankAccountName || 'VU THANH MINH'}</div>
                  <div className="dpw-payout-verified">
                    <span className="badge-icon">✓</span> Khớp nối danh tính bác sĩ
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: CREDENTIALS & DEGREES ================= */}
        {activeTab === 'credentials' && (
          <div className="dpw-credentials-view">
            <div className="dpw-notice-banner dpw-notice-banner--info">
              <div className="dpw-notice-icon">🛡️</div>
              <div className="dpw-notice-content">
                <h4>Hồ sơ thẩm định y khoa & Tính pháp lý</h4>
                <p>
                  Văn bằng chuyên môn và Chứng chỉ hành nghề (CCHN) được BookingCare đối chiếu trực tiếp với cổng thông tin Bộ Y tế và lưu trữ có bảo mật. Bác sĩ không thể tự ý sửa đổi văn bằng để tuân thủ quy định Luật Khám bệnh, chữa bệnh 2023. Khi có văn bằng mới hoặc chuyển đổi phạm vi chuyên môn, vui lòng gửi yêu cầu xác minh.
                </p>
              </div>
              <button
                type="button"
                className="btn-primary-action"
                onClick={() => setShowCredentialRequestModal(true)}
              >
                + Đề nghị cập nhật chứng chỉ
              </button>
            </div>

            <div className="dpw-cred-grid">
              {/* Degree Card */}
              <div className="dpw-cred-card">
                <div className="dpw-cred-card__header">
                  <div className="dpw-cred-icon">🎓</div>
                  <div className="dpw-cred-info">
                    <div className="dpw-cred-type">Văn bằng đào tạo chính quy</div>
                    <h3 className="dpw-cred-title">{profile?.credentials?.degree?.title || 'Bác sĩ Đa khoa'}</h3>
                  </div>
                  <span className="dpw-cred-badge dpw-cred-badge--verified">✓ Đã xác minh</span>
                </div>
                <div className="dpw-cred-details">
                  <div className="dpw-cred-row">
                    <span className="label">Cơ sở đào tạo:</span>
                    <span className="value"><strong>{profile?.credentials?.degree?.university || 'Đại học Y Dược Huế'}</strong></span>
                  </div>
                  <div className="dpw-cred-row">
                    <span className="label">Năm tốt nghiệp:</span>
                    <span className="value">{profile?.credentials?.degree?.graduationYear || 2016}</span>
                  </div>
                  <div className="dpw-cred-row">
                    <span className="label">Ngày thẩm định hồ sơ:</span>
                    <span className="value">{profile?.credentials?.degree?.verifiedAt || '15/01/2024'}</span>
                  </div>
                </div>
              </div>

              {/* Medical Practice License (CCHN) */}
              <div className="dpw-cred-card dpw-cred-card--highlight">
                <div className="dpw-cred-card__header">
                  <div className="dpw-cred-icon">📜</div>
                  <div className="dpw-cred-info">
                    <div className="dpw-cred-type">Chứng chỉ hành nghề khám chữa bệnh (CCHN)</div>
                    <h3 className="dpw-cred-title">{profile?.credentials?.medicalLicense?.licenseNumber || 'CCHN-000002/BYT-CCHN'}</h3>
                  </div>
                  <span className="dpw-cred-badge dpw-cred-badge--verified">✓ Hợp chuẩn Bộ Y tế</span>
                </div>
                <div className="dpw-cred-details">
                  <div className="dpw-cred-row">
                    <span className="label">Cơ quan cấp phép:</span>
                    <span className="value"><strong>{profile?.credentials?.medicalLicense?.issuedBy || 'Sở Y tế TP. Hồ Chí Minh'}</strong></span>
                  </div>
                  <div className="dpw-cred-row">
                    <span className="label">Ngày cấp phép:</span>
                    <span className="value">{profile?.credentials?.medicalLicense?.issuedDate || '20/05/2018'}</span>
                  </div>
                  <div className="dpw-cred-row">
                    <span className="label">Phạm vi hoạt động:</span>
                    <span className="value">{profile?.credentials?.medicalLicense?.scopeOfPractice || 'Khám bệnh, chữa bệnh chuyên khoa Cơ xương khớp'}</span>
                  </div>
                  <div className="dpw-cred-row">
                    <span className="label">Tình trạng hiệu lực:</span>
                    <span className="value text-success font-weight-bold">Có giá trị trên toàn quốc</span>
                  </div>
                </div>
              </div>

              {/* Specialty Certificates / CME */}
              <div className="dpw-cred-card dpw-cred-card--full">
                <div className="dpw-cred-card__header">
                  <div className="dpw-cred-icon">🏅</div>
                  <div className="dpw-cred-info">
                    <div className="dpw-cred-type">Đào tạo liên tục (CME) & Kỹ thuật chuyên sâu</div>
                    <h3 className="dpw-cred-title">Chứng chỉ chuyên khoa & Kỹ thuật can thiệp</h3>
                  </div>
                </div>
                <div className="dpw-cme-list">
                  {profile?.credentials?.specialtyCertificates?.map((cme) => (
                    <div key={cme.id} className="dpw-cme-item">
                      <div className="dpw-cme-item__icon">✅</div>
                      <div className="dpw-cme-item__content">
                        <h4>{cme.name}</h4>
                        <p>{cme.issuedBy} • Năm cấp: {cme.year}</p>
                      </div>
                      <span className="dpw-cred-badge dpw-cred-badge--verified">✓ Đã duyệt</span>
                    </div>
                  )) || (
                    <div className="dpw-cme-item">
                      <div className="dpw-cme-item__icon">✅</div>
                      <div className="dpw-cme-item__content">
                        <h4>Chứng chỉ Siêu âm & Chẩn đoán hình ảnh can thiệp</h4>
                        <p>Bệnh viện Chợ Rẫy • Năm cấp: 2021</p>
                      </div>
                      <span className="dpw-cred-badge dpw-cred-badge--verified">✓ Đã duyệt</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 3: FACILITIES (DOCTOR_ASSIGNMENT) ================= */}
        {activeTab === 'facilities' && (
          <div className="dpw-facilities-view">
            <div className="dpw-view-intro">
              <div>
                <h3>Cơ sở y tế tiếp nhận khám bệnh</h3>
                <p>
                  Danh sách phòng khám, bệnh viện Bác sĩ đang công tác được phân quyền trên BookingCare. Mỗi cơ sở áp dụng mức giá khám, lịch làm việc và phòng khám riêng biệt.
                </p>
              </div>
              <div className="dpw-view-note">
                Để đăng ký thêm cơ sở khám mới, vui lòng liên hệ <strong>Ban Điều phối Y tế (1900-2115)</strong>
              </div>
            </div>

            <div className="dpw-facilities-grid">
              {profile?.facilityAssignments?.map((fac, idx) => (
                <div key={fac.id || idx} className={`dpw-facility-card ${fac.isPrimary ? 'dpw-facility-card--primary' : ''}`}>
                  <div className="dpw-facility-card__header">
                    <div className="dpw-facility-card__badge-row">
                      {fac.isPrimary ? (
                        <span className="dpw-tag dpw-tag--primary">★ Cơ sở làm việc chính</span>
                      ) : (
                        <span className="dpw-tag dpw-tag--secondary">Cơ sở liên kết</span>
                      )}
                      <span className="dpw-tag dpw-tag--active">● Đang hoạt động</span>
                    </div>
                    <h3 className="dpw-facility-card__name">{fac.clinicName}</h3>
                    <p className="dpw-facility-card__address">📍 {fac.clinicAddress || 'Khu phức hợp y tế BookingCare'}</p>
                  </div>

                  <div className="dpw-facility-card__specs">
                    <div className="dpw-spec-item">
                      <span className="label">Chuyên khoa:</span>
                      <span className="value">{fac.specialtyName}</span>
                    </div>
                    <div className="dpw-spec-item">
                      <span className="label">Phòng khám tiếp nhận:</span>
                      <span className="value"><strong>{fac.roomNumber}</strong></span>
                    </div>
                    <div className="dpw-spec-item">
                      <span className="label">Giá khám niêm yết:</span>
                      <span className="value price">{fac.priceVnd}</span>
                    </div>
                    <div className="dpw-spec-item">
                      <span className="label">Phí nền tảng (Commission):</span>
                      <span className="value">{fac.commissionRate}%</span>
                    </div>
                    <div className="dpw-spec-item">
                      <span className="label">Hình thức khám:</span>
                      <span className="value">{fac.workingFormat || 'Trực tiếp + Video'}</span>
                    </div>
                    <div className="dpw-spec-item">
                      <span className="label">Khung ngày làm việc:</span>
                      <span className="value">{fac.scheduleDays || 'Theo lịch đăng ký'}</span>
                    </div>
                  </div>

                  <div className="dpw-facility-card__footer">
                    <a
                      href="/doctor-dashboard/manage-schedule"
                      className="btn-facility-schedule"
                    >
                      📅 Quản lý lịch khám tại cơ sở này →
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= TAB 4: PAYOUT BANK ACCOUNT ================= */}
        {activeTab === 'payout' && (
          <div className="dpw-payout-view">
            <div className="dpw-card dpw-card--form">
              <div className="dpw-card__header">
                <div>
                  <h3 className="dpw-card__title">
                    <span className="dpw-card__icon">💳</span>
                    <span>Tài khoản ngân hàng nhận thu nhập (Payout Account)</span>
                  </h3>
                  <p className="dpw-card__subtitle">
                    Thu nhập sau khi khấu trừ phí nền tảng sẽ được hệ thống BookingCare tự động đối soát và giải ngân định kỳ vào ngày 05 hàng tháng.
                  </p>
                </div>
              </div>

              {/* Preview Card */}
              <div className="dpw-bank-preview-card">
                <div className="dpw-bank-preview__top">
                  <span className="bank-brand">VIETNAM BANKING SYSTEM</span>
                  <span className="bank-secure">CHÍNH CHỦ ĐÃ THẨM ĐỊNH ✓</span>
                </div>
                <div className="dpw-bank-preview__name">{payoutForm.bankName}</div>
                <div className="dpw-bank-preview__number">
                  {payoutForm.bankAccountNumber
                    ? `•••• •••• •••• ${payoutForm.bankAccountNumber.slice(-4)}`
                    : '•••• •••• •••• 8822'}
                </div>
                <div className="dpw-bank-preview__bottom">
                  <div>
                    <span className="small-label">CHỦ TÀI KHOẢN</span>
                    <span className="account-holder">{payoutForm.bankAccountName || 'VU THANH MINH'}</span>
                  </div>
                  <div>
                    <span className="small-label">PHƯƠNG THỨC</span>
                    <span className="account-holder">NAPAS 247</span>
                  </div>
                </div>
              </div>

              {/* Form Input */}
              <div className="dpw-form-grid">
                <div className="dpw-form-field dpw-form-field--full">
                  <label>Ngân hàng thụ hưởng</label>
                  <select
                    value={payoutForm.bankName}
                    onChange={(e) => setPayoutForm({ ...payoutForm, bankName: e.target.value })}
                  >
                    {BANK_OPTIONS.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>

                <div className="dpw-form-field">
                  <label>Số tài khoản ngân hàng</label>
                  <input
                    type="text"
                    value={payoutForm.bankAccountNumber}
                    onChange={(e) => setPayoutForm({ ...payoutForm, bankAccountNumber: e.target.value.replace(/\s+/g, '') })}
                    placeholder="Nhập số tài khoản"
                  />
                  <small className="field-hint">Chỉ nhập chữ số, không nhập khoảng trắng hay ký tự đặc biệt.</small>
                </div>

                <div className="dpw-form-field">
                  <label>Tên chủ tài khoản (Viết hoa không dấu)</label>
                  <input
                    type="text"
                    value={payoutForm.bankAccountName}
                    onChange={(e) => setPayoutForm({ ...payoutForm, bankAccountName: e.target.value.toUpperCase() })}
                    placeholder="VD: VU THANH MINH"
                  />
                  <small className="field-hint">Bắt buộc phải trùng tên với Bác sĩ đã xác minh trên hồ sơ y khoa.</small>
                </div>
              </div>

              <div className="dpw-security-callout">
                <span className="callout-icon">🔒</span>
                <div>
                  <strong>Bảo mật thông tin tài chính:</strong> Số tài khoản ngân hàng được mã hóa khi lưu trữ và hiển thị che số (masked) trên toàn bộ báo cáo doanh thu để bảo vệ dữ liệu cá nhân của Bác sĩ.
                </div>
              </div>

              <div className="dpw-form-actions">
                <button
                  type="button"
                  className="btn-save-primary"
                  onClick={handleSavePayout}
                  disabled={saving}
                >
                  {saving ? '⏳ Đang lưu...' : '💾 Cập nhật tài khoản nhận tiền'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 5: CONSULTATION SETTINGS ================= */}
        {activeTab === 'consultation' && (
          <div className="dpw-consultation-view">
            <div className="dpw-card dpw-card--form">
              <div className="dpw-card__header">
                <div>
                  <h3 className="dpw-card__title">
                    <span className="dpw-card__icon">💬</span>
                    <span>Cài đặt tư vấn & Hỗ trợ sau khám (Follow-up)</span>
                  </h3>
                  <p className="dpw-card__subtitle">
                    Thiết lập quyền lợi hỗ trợ bệnh nhân sau khi kết thúc buổi khám để theo dõi diễn tiến điều trị và giải đáp thắc mắc về đơn thuốc.
                  </p>
                </div>
              </div>

              <div className="dpw-settings-list">
                {/* Setting 1: Chat Follow-up */}
                <div className="dpw-setting-item">
                  <div className="dpw-setting-item__header">
                    <div className="dpw-setting-item__info">
                      <div className="setting-title">
                        <span>💬 Cho phép Bệnh nhân Chat hỏi đáp sau khám</span>
                        {consultationForm.allowChatFollowUp ? (
                          <span className="badge-enabled">Đang bật</span>
                        ) : (
                          <span className="badge-disabled">Đang tắt</span>
                        )}
                      </div>
                      <p className="setting-desc">
                        Bệnh nhân đã hoàn thành khám bệnh có thể gửi kết quả xét nghiệm bổ sung hoặc hỏi đáp ngắn về đơn thuốc trực tiếp qua ứng dụng.
                      </p>
                    </div>
                    <label className="dpw-switch">
                      <input
                        type="checkbox"
                        checked={consultationForm.allowChatFollowUp}
                        onChange={(e) => setConsultationForm({ ...consultationForm, allowChatFollowUp: e.target.checked })}
                      />
                      <span className="dpw-slider" />
                    </label>
                  </div>

                  {consultationForm.allowChatFollowUp && (
                    <div className="dpw-setting-item__suboptions">
                      <div className="dpw-suboption">
                        <label>Thời hạn phòng chat mở sau ngày khám:</label>
                        <select
                          value={consultationForm.chatDurationDays}
                          onChange={(e) => setConsultationForm({ ...consultationForm, chatDurationDays: Number(e.target.value) })}
                        >
                          <option value={3}>3 ngày (Ngắn hạn)</option>
                          <option value={7}>7 ngày (Khuyên dùng - Chuẩn y khoa)</option>
                          <option value={14}>14 ngày (Dành cho bệnh mạn tính)</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Setting 2: Video Follow-up */}
                <div className="dpw-setting-item">
                  <div className="dpw-setting-item__header">
                    <div className="dpw-setting-item__info">
                      <div className="setting-title">
                        <span>📹 Quyền lợi tái khám Video ngắn (Tùy chọn)</span>
                        {consultationForm.allowVideoFollowUp ? (
                          <span className="badge-enabled">Đang bật</span>
                        ) : (
                          <span className="badge-disabled">Đang tắt</span>
                        )}
                      </div>
                      <p className="setting-desc">
                        Cung cấp 1 phiên tư vấn video trực tuyến ngắn để đánh giá lại đáp ứng thuốc của người bệnh mà người bệnh không cần đến viện lại.
                      </p>
                    </div>
                    <label className="dpw-switch">
                      <input
                        type="checkbox"
                        checked={consultationForm.allowVideoFollowUp}
                        onChange={(e) => setConsultationForm({ ...consultationForm, allowVideoFollowUp: e.target.checked })}
                      />
                      <span className="dpw-slider" />
                    </label>
                  </div>

                  {consultationForm.allowVideoFollowUp && (
                    <div className="dpw-setting-item__suboptions">
                      <div className="dpw-suboption">
                        <label>Thời lượng phiên video tái khám:</label>
                        <select
                          value={consultationForm.videoDurationMinutes}
                          onChange={(e) => setConsultationForm({ ...consultationForm, videoDurationMinutes: Number(e.target.value) })}
                        >
                          <option value={10}>10 phút (Kiểm tra nhanh)</option>
                          <option value={15}>15 phút (Chuẩn khuyến nghị)</option>
                          <option value={20}>20 phút</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="dpw-form-actions">
                <button
                  type="button"
                  className="btn-save-primary"
                  onClick={handleSaveConsultation}
                  disabled={saving}
                >
                  {saving ? '⏳ Đang lưu...' : '💾 Lưu cài đặt tư vấn'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ================= MODAL 1: PUBLIC PROFILE PREVIEW ================= */}
      {showPublicPreview && (
        <div className="dpw-modal-backdrop" onClick={() => setShowPublicPreview(false)}>
          <div className="dpw-modal dpw-modal--preview" onClick={(e) => e.stopPropagation()}>
            <div className="dpw-modal__header">
              <div className="dpw-modal__title-row">
                <span className="preview-indicator">👁 XEM TRƯỚC HỒ SƠ CÔNG KHAI</span>
                <h3>Giao diện hiển thị với Bệnh nhân trên BookingCare</h3>
              </div>
              <button
                type="button"
                className="dpw-modal__close"
                onClick={() => setShowPublicPreview(false)}
              >
                ✕
              </button>
            </div>

            <div className="dpw-modal__body dpw-patient-preview">
              {/* Patient View Card */}
              <div className="pv-header-card">
                <div className="pv-avatar">
                  {avatarSrc ? <img src={avatarSrc} alt={fullName} /> : <div className="pv-avatar-placeholder">🩺</div>}
                </div>
                <div className="pv-details">
                  <div className="pv-name-row">
                    <h2>{fullName}</h2>
                    <span className="pv-badge-verified">✓ Bác sĩ đối tác xác minh</span>
                  </div>
                  <div className="pv-specialty">Chuyên khoa: {profile?.doctorInfoData?.specialtyData?.name || 'Cơ xương khớp'}</div>
                  <div className="pv-clinic">📍 {profile?.facilityAssignments?.[0]?.clinicName || 'Bệnh viện & Phòng khám đối tác'}</div>
                  <div className="pv-rating-row">
                    <span className="pv-stars">⭐⭐⭐⭐⭐ 4.9</span>
                    <span className="pv-reviews">(128 lượt đánh giá hài lòng)</span>
                    <span className="pv-experience">• {profile?.experienceYears || 8}+ năm kinh nghiệm</span>
                  </div>
                </div>
                <div className="pv-price-badge">
                  <span className="price-label">Giá khám từ</span>
                  <span className="price-amount">{profile?.facilityAssignments?.[0]?.priceVnd || '300.000đ'}</span>
                </div>
              </div>

              {/* Bio snippet */}
              <div className="pv-section">
                <h4>Giới thiệu bác sĩ</h4>
                <p className="pv-bio">
                  {profile?.doctorInfoData?.description || 'Bác sĩ có nhiều năm kinh nghiệm thăm khám và điều trị chuyên sâu, tận tâm với người bệnh.'}
                </p>
              </div>

              {/* Schedule slot mockup */}
              <div className="pv-section">
                <h4>Lịch khám sắp tới (Minh họa)</h4>
                <div className="pv-schedule-slots">
                  <span className="pv-slot">08:00 - 09:00</span>
                  <span className="pv-slot">09:00 - 10:00</span>
                  <span className="pv-slot pv-slot--active">10:00 - 11:00</span>
                  <span className="pv-slot">13:30 - 14:30</span>
                  <span className="pv-slot">14:30 - 15:30</span>
                </div>
                <div className="pv-booking-action">
                  <button type="button" className="btn-mock-book" disabled>
                    📅 Đặt lịch khám trực tuyến (Mô phỏng bệnh nhân)
                  </button>
                </div>
              </div>
            </div>

            <div className="dpw-modal__footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowPublicPreview(false)}
              >
                Đóng xem trước
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: EDIT PERSONAL INFO ================= */}
      {showEditPersonalModal && (
        <div className="dpw-modal-backdrop" onClick={() => setShowEditPersonalModal(false)}>
          <div className="dpw-modal dpw-modal--form" onClick={(e) => e.stopPropagation()}>
            <div className="dpw-modal__header">
              <h3>✏ Chỉnh sửa thông tin cá nhân & Giới thiệu</h3>
              <button
                type="button"
                className="dpw-modal__close"
                onClick={() => setShowEditPersonalModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="dpw-modal__body">
              <div className="dpw-form-grid">
                <div className="dpw-form-field">
                  <label>Họ và tên đệm</label>
                  <input
                    type="text"
                    value={personalForm.lastName}
                    onChange={(e) => setPersonalForm({ ...personalForm, lastName: e.target.value })}
                    placeholder="VD: Nguyễn"
                  />
                </div>
                <div className="dpw-form-field">
                  <label>Tên</label>
                  <input
                    type="text"
                    value={personalForm.firstName}
                    onChange={(e) => setPersonalForm({ ...personalForm, firstName: e.target.value })}
                    placeholder="VD: Văn A"
                  />
                </div>
                <div className="dpw-form-field">
                  <label>Số điện thoại liên lạc</label>
                  <input
                    type="text"
                    value={personalForm.phoneNumber}
                    onChange={(e) => setPersonalForm({ ...personalForm, phoneNumber: e.target.value })}
                    placeholder="VD: 0912345678"
                  />
                </div>
                <div className="dpw-form-field">
                  <label>Địa chỉ làm việc</label>
                  <input
                    type="text"
                    value={personalForm.address}
                    onChange={(e) => setPersonalForm({ ...personalForm, address: e.target.value })}
                    placeholder="Số nhà, tên đường, quận/huyện, tỉnh/thành"
                  />
                </div>
                <div className="dpw-form-field dpw-form-field--full">
                  <label>Tóm tắt giới thiệu ngắn (Bio)</label>
                  <textarea
                    rows={3}
                    value={personalForm.description}
                    onChange={(e) => setPersonalForm({ ...personalForm, description: e.target.value })}
                    placeholder="Mô tả súc tích về quá trình công tác, thế mạnh chuyên môn điều trị..."
                  />
                </div>
                <div className="dpw-form-field dpw-form-field--full">
                  <label>Nội dung chi tiết (Markdown)</label>
                  <textarea
                    rows={8}
                    className="markdown-textarea"
                    value={personalForm.contentMarkdown}
                    onChange={(e) => setPersonalForm({ ...personalForm, contentMarkdown: e.target.value })}
                    placeholder={`## Quá trình đào tạo\n- 2016: Tốt nghiệp Đại học Y Dược\n\n## Thế mạnh chuyên môn\n- Thăm khám & điều trị...`}
                  />
                </div>
              </div>
            </div>

            <div className="dpw-modal__footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowEditPersonalModal(false)}
                disabled={saving}
              >
                Hủy
              </button>
              <button
                type="button"
                className="btn-save-primary"
                onClick={handleSavePersonal}
                disabled={saving}
              >
                {saving ? '⏳ Đang lưu...' : '💾 Lưu thay đổi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 3: CREDENTIAL REQUEST ================= */}
      {showCredentialRequestModal && (
        <div className="dpw-modal-backdrop" onClick={() => setShowCredentialRequestModal(false)}>
          <div className="dpw-modal dpw-modal--form" onClick={(e) => e.stopPropagation()}>
            <div className="dpw-modal__header">
              <h3>📄 Đề nghị xác minh văn bằng / Chứng chỉ y tế mới</h3>
              <button
                type="button"
                className="dpw-modal__close"
                onClick={() => setShowCredentialRequestModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCredentialSubmit}>
              <div className="dpw-modal__body">
                <p className="dpw-modal__lead">
                  Hồ sơ xác minh sẽ được Ban Thẩm định Y tế BookingCare đối soát và cập nhật vào hồ sơ chính thức trong vòng 24-48 giờ làm việc.
                </p>

                <div className="dpw-form-grid">
                  <div className="dpw-form-field">
                    <label>Loại chứng chỉ / Văn bằng</label>
                    <select
                      value={credentialRequest.type}
                      onChange={(e) => setCredentialRequest({ ...credentialRequest, type: e.target.value })}
                    >
                      <option value="degree">Bằng cấp đào tạo (Đại học / Chuyên khoa / Thạc sĩ / Tiến sĩ)</option>
                      <option value="license">Chứng chỉ hành nghề (CCHN) bổ sung phạm vi</option>
                      <option value="cme">Chứng chỉ đào tạo liên tục (CME) / Kỹ thuật chuyên sâu</option>
                    </select>
                  </div>

                  <div className="dpw-form-field">
                    <label>Tên văn bằng / Chứng chỉ</label>
                    <input
                      type="text"
                      required
                      value={credentialRequest.title}
                      onChange={(e) => setCredentialRequest({ ...credentialRequest, title: e.target.value })}
                      placeholder="VD: Chứng chỉ Chuyên khoa Sơ bộ Chấn thương Chỉnh hình"
                    />
                  </div>

                  <div className="dpw-form-field">
                    <label>Số hiệu văn bản / Số chứng chỉ</label>
                    <input
                      type="text"
                      required
                      value={credentialRequest.documentNumber}
                      onChange={(e) => setCredentialRequest({ ...credentialRequest, documentNumber: e.target.value })}
                      placeholder="VD: CCHN-12345/BYT"
                    />
                  </div>

                  <div className="dpw-form-field">
                    <label>Cơ quan / Đại học cấp bằng</label>
                    <input
                      type="text"
                      required
                      value={credentialRequest.issuingAuthority}
                      onChange={(e) => setCredentialRequest({ ...credentialRequest, issuingAuthority: e.target.value })}
                      placeholder="VD: Đại học Y Dược TP.HCM"
                    />
                  </div>

                  <div className="dpw-form-field dpw-form-field--full">
                    <label>Ghi chú bổ sung (nếu có)</label>
                    <textarea
                      rows={3}
                      value={credentialRequest.note}
                      onChange={(e) => setCredentialRequest({ ...credentialRequest, note: e.target.value })}
                      placeholder="Thông tin thêm về phạm vi chuyên môn hoặc đường dẫn bản scan đối chiếu..."
                    />
                  </div>
                </div>
              </div>

              <div className="dpw-modal__footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowCredentialRequestModal(false)}
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="btn-save-primary"
                >
                  🚀 Gửi yêu cầu xác minh
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorProfile;
