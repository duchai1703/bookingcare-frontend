// src/containers/System/Admin/Doctor/DoctorDetailWorkspace.jsx
// Healthcare Enterprise Doctor Workspace: Profile, Weekly Schedule, Patients Network, Finance & Commissions, Audit Logs
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import moment from 'moment';
import {
  ArrowLeft,
  Calendar,
  CreditCard,
  Percent,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCw,
  Users,
  FileText,
  Activity,
  TrendingUp,
  AlertCircle,
  ChevronRight,
  Landmark,
  ShieldCheck,
  Stethoscope,
  Building,
  Star,
  Plus,
  Save,
  PauseCircle,
  PlayCircle,
  User,
  Hospital,
} from 'lucide-react';
import {
  getAdminDoctorWorkspace,
  updateDoctorWorkingStatus,
  updateDoctorScheduleSlots
} from '../../../../services/doctorManageService';
import { saveInfoDoctor } from '../../../../services/doctorService';
import clinicHierarchyService from '../../../../services/clinicHierarchyService';
import ContextBreadcrumbs from '../../../../components/ContextBreadcrumbs/ContextBreadcrumbs';
import CommonUtils from '../../../../utils/CommonUtils';
import CommissionModal from './CommissionModal';
import DoctorPayoutModal from './DoctorPayoutModal';
import './DoctorWorkspace.scss';

const TIME_FRAMES = [
  { key: 'T1', label: '8:00 – 9:00' },
  { key: 'T2', label: '9:00 – 10:00' },
  { key: 'T3', label: '10:00 – 11:00' },
  { key: 'T4', label: '11:00 – 12:00' },
  { key: 'T5', label: '13:00 – 14:00' },
  { key: 'T6', label: '14:00 – 15:00' },
  { key: 'T7', label: '15:00 – 16:00' },
  { key: 'T8', label: '16:00 – 17:00' },
];

const formatCurrencyVND = (num) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0);
};

const DoctorDetailWorkspace = () => {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const language = useSelector((state) => state.app.language);

  const initialTab = searchParams.get('tab') || 'overview';
  const [activeTab, setActiveTab] = useState(initialTab);

  // Data State
  const [data, setData] = useState(null);
  const [doctorAssignments, setDoctorAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Modals state
  const [isCommissionModalOpen, setIsCommissionModalOpen] = useState(false);
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);

  // Slot Detail Modal (Khi admin bấm vào slot có ca khám)
  const [selectedSlotForDetail, setSelectedSlotForDetail] = useState(null);

  // Quick Schedule Form State
  const [selectedScheduleDate, setSelectedScheduleDate] = useState(moment().format('YYYY-MM-DD'));
  const [selectedTimeKeys, setSelectedTimeKeys] = useState([]);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [scheduleSuccessMsg, setScheduleSuccessMsg] = useState('');

  // Profile Edit Form State
  const [profileForm, setProfileForm] = useState({
    description: '',
    contentMarkdown: '',
    note: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');

  // 1. Fetch Workspace Data
  const fetchWorkspace = useCallback(async (signal) => {
    setLoading(true);
    setError('');
    try {
      const res = await getAdminDoctorWorkspace(id, { signal });
      if (res && res.errCode === 0) {
        setData(res.data);
        if (res.data.profile) {
          setProfileForm({
            description: res.data.profile.description || '',
            contentMarkdown: res.data.profile.contentMarkdown || '',
            note: res.data.profile.note || '',
          });
        }
      } else {
        setError(res?.errMessage || 'Không tìm thấy hồ sơ bác sĩ');
      }

      // Fetch Multi-Clinic Affiliations & Assignments
      try {
        const asRes = await clinicHierarchyService.getDoctorAssignments(id);
        if (asRes && asRes.errCode === 0) {
          setDoctorAssignments(asRes.data || []);
        }
      } catch (asErr) {
        console.error('Error fetching doctor assignments:', asErr);
      }
    } catch (err) {
      if (err.name !== 'CanceledError' && err.name !== 'AbortError') {
        setError('Lỗi kết nối máy chủ: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const controller = new AbortController();
    fetchWorkspace(controller.signal);
    return () => controller.abort();
  }, [fetchWorkspace]);

  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    setSearchParams({ tab: tabKey });
  };

  // Sync selected times when date changes in quick schedule
  useEffect(() => {
    if (!data?.weeklySchedule) return;
    const targetTimestamp = moment.utc(selectedScheduleDate, 'YYYY-MM-DD').startOf('day').valueOf();
    const existingSlotsForDate = data.weeklySchedule.filter(
      (s) => String(s.date) === String(targetTimestamp)
    );
    setSelectedTimeKeys(existingSlotsForDate.map((s) => s.timeType));
    setScheduleSuccessMsg('');
  }, [selectedScheduleDate, data?.weeklySchedule]);

  // Toggle doctor working status
  const handleToggleStatus = async () => {
    if (!data?.profile) return;
    const currentStatus = data.profile.workingStatus;
    const nextStatus = currentStatus === 'active' ? 'paused' : 'active';
    try {
      const res = await updateDoctorWorkingStatus(id, { status: nextStatus });
      if (res && res.errCode === 0) {
        fetchWorkspace();
      } else {
        alert(res?.errMessage || 'Không thể cập nhật trạng thái');
      }
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  // Toggle quick schedule time key
  const handleToggleTimeKey = (key) => {
    setSelectedTimeKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  // Save quick schedule
  const handleSaveSchedule = async (e) => {
    e.preventDefault();
    setSavingSchedule(true);
    setScheduleSuccessMsg('');
    try {
      const timestamp = moment.utc(selectedScheduleDate, 'YYYY-MM-DD').startOf('day').valueOf();
      const res = await updateDoctorScheduleSlots(id, {
        date: timestamp,
        timeTypes: selectedTimeKeys,
      });
      if (res && res.errCode === 0) {
        setScheduleSuccessMsg('Đã cập nhật khung giờ làm việc thành công!');
        fetchWorkspace();
      } else {
        alert(res?.errMessage || 'Lỗi khi cập nhật lịch khám');
      }
    } catch (err) {
      alert('Lỗi kết nối: ' + err.message);
    } finally {
      setSavingSchedule(false);
    }
  };

  // Save profile Markdown / Note
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileSuccessMsg('');
    try {
      const res = await saveInfoDoctor({
        doctorId: id,
        description: profileForm.description,
        contentMarkdown: profileForm.contentMarkdown,
        contentHTML: profileForm.contentMarkdown, // Simplified or marked
        note: profileForm.note,
        specialtyId: profile.specialtyId,
        clinicId: profile.clinicId,
      });
      if (res && res.errCode === 0) {
        setProfileSuccessMsg('Đã lưu thông tin giới thiệu thành công!');
        fetchWorkspace();
      } else {
        alert(res?.errMessage || 'Lỗi khi lưu hồ sơ');
      }
    } catch (err) {
      alert('Lỗi kết nối: ' + err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="doctor-workspace-container" style={{ textAlign: 'center', padding: '100px 20px' }}>
        <RotateCw className="fa-spin" size={32} style={{ color: '#087F8C', marginBottom: 12 }} />
        <div style={{ fontWeight: 600, color: '#64748B' }}>Đang nạp hồ sơ điều hành bác sĩ...</div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="doctor-workspace-container" style={{ padding: '40px' }}>
        <div style={{ background: '#FEF2F2', border: '1px solid #FECDD3', padding: '20px', borderRadius: 8, color: '#B91C1C' }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Không thể tải Workspace bác sĩ</div>
          <div>{error}</div>
          <button className="btn-ws-action secondary" onClick={() => fetchWorkspace()} style={{ marginTop: 12 }}>
            <RotateCw size={14} /> Thử lại
          </button>
        </div>
      </div>
    );
  }

  const profile = data?.profile || {};
  const kpis = data?.kpis || {};
  const weeklySchedule = data?.weeklySchedule || [];
  const monthlyRevenue = data?.monthlyRevenue || [];
  const patients = data?.patients || [];
  const settlements = data?.settlements || [];
  const commissionLogs = data?.commissionLogs || [];

  const isPaused = profile.workingStatus === 'paused';
  const isSuspended = profile.workingStatus === 'suspended';
  const statusBadgeClass = isSuspended ? 'suspended' : isPaused ? 'paused' : 'active';
  const statusBadgeText = isSuspended ? 'Ngừng HĐ' : isPaused ? 'Tạm nghỉ nhận lịch' : 'Đang hoạt động';

  return (
    <div className="doctor-workspace-container">
      {/* Breadcrumb */}
      <ContextBreadcrumbs
        items={[
          { label: language === 'vi' ? 'Quản lý Bác sĩ' : 'Doctor Operations', path: '/system/doctors' },
          { label: `${profile.doctorCode || ''} — ${profile.doctorName || ''}`, badge: 'Hồ sơ Bác sĩ' },
        ]}
      />

      {/* Header Card */}
      <div className="workspace-header-card">
        <div className="header-top-row">
          <div className="profile-meta">
            {profile.avatar ? (
              <img
                src={CommonUtils.decodeBase64Image(profile.avatar)}
                alt={profile.doctorName}
                className="avatar-lg"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const fb = e.currentTarget.parentElement?.querySelector('.avatar-fallback');
                  if (fb) fb.style.display = 'flex';
                }}
              />
            ) : null}
            <div
              className="avatar-lg avatar-fallback"
              style={{
                display: profile.avatar ? 'none' : 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '1.4rem',
                color: '#087F8C',
                background: '#F0FDFA',
              }}
            >
              {profile.firstName?.[0] || profile.doctorName?.[0] || 'D'}
            </div>

            <div className="profile-titles">
              <div className="badge-row">
                <span className={`status-pill ${statusBadgeClass}`}>● {statusBadgeText}</span>
                <span style={{ fontSize: '0.75rem', background: '#F1F5F9', color: '#475569', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>
                  {profile.doctorCode}
                </span>
                <span style={{ fontSize: '0.75rem', background: '#EFF6FF', color: '#1D4ED8', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
                  {profile.positionVi || profile.positionEn}
                </span>
              </div>

              <h1 className="name-lg">{profile.doctorName}</h1>

              <div className="contact-sub">
                <span><strong>CK:</strong> {profile.specialtyName}</span>
                <span><strong>Cơ sở:</strong> {profile.clinicName}</span>
                <span><strong>Email:</strong> {profile.email}</span>
                <span><strong>SĐT:</strong> {profile.phoneNumber}</span>
              </div>
            </div>
          </div>

          <div className="header-actions-group">
            <button
              className="btn-ws-action secondary"
              onClick={() => handleTabChange('schedule')}
              title="Quản lý lịch khám và khung giờ"
            >
              <Calendar size={14} />
              <span>Lịch khám</span>
            </button>

            <button
              className="btn-ws-action primary"
              onClick={() => setIsPayoutModalOpen(true)}
              title="Tạo lệnh chi trả thanh toán tiền khám"
            >
              <CreditCard size={14} />
              <span>Quyết toán ({formatCurrencyVND(kpis.pendingPayout)})</span>
            </button>

            <button
              className="btn-ws-action secondary"
              onClick={() => setIsCommissionModalOpen(true)}
              title="Điều chỉnh hoa hồng riêng"
            >
              <Percent size={14} />
              <span>Hoa hồng ({profile.commissionRate}%)</span>
            </button>

            <button
              className="btn-ws-action secondary"
              onClick={handleToggleStatus}
              title={isPaused ? 'Mở lại tiếp nhận đặt lịch' : 'Tạm dừng nhận bệnh nhân mới'}
            >
              {isPaused ? <PlayCircle size={14} style={{ color: '#059669' }} /> : <PauseCircle size={14} style={{ color: '#D97706' }} />}
              <span>{isPaused ? 'Tiếp tục nhận lịch' : 'Tạm nghỉ'}</span>
            </button>

            <button className="btn-ws-action secondary" onClick={() => fetchWorkspace()} title="Làm mới">
              <RotateCw size={14} className={loading ? 'fa-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Mini KPI Counters */}
        <div className="mini-kpi-counters">
          <div className="counter-item">
            <div className="label">Tổng ca khám</div>
            <div className="val">{kpis.totalBookings || 0}</div>
          </div>

          <div className="counter-item">
            <div className="label">Đã hoàn thành</div>
            <div className="val" style={{ color: '#059669' }}>
              {kpis.completedBookings || 0}
            </div>
          </div>

          <div className="counter-item">
            <div className="label">Tỷ lệ hủy ca</div>
            <div className="val" style={{ color: kpis.cancellationRate > 15 ? '#E11D48' : '#475569' }}>
              {kpis.cancellationRate || 0}%
            </div>
          </div>

          <div className="counter-item">
            <div className="label">Doanh thu gộp</div>
            <div className="val">{formatCurrencyVND(kpis.grossRevenue)}</div>
          </div>

          <div className="counter-item">
            <div className="label">Hoa hồng sàn ({kpis.commissionRate}%)</div>
            <div className="val" style={{ color: '#087F8C' }}>
              {formatCurrencyVND(kpis.platformFee)}
            </div>
          </div>

          <div className="counter-item">
            <div className="label">Bác sĩ thực nhận</div>
            <div className="val">{formatCurrencyVND(kpis.netRevenue)}</div>
          </div>

          <div className="counter-item">
            <div className="label">Đã quyết toán</div>
            <div className="val" style={{ color: '#059669' }}>
              {formatCurrencyVND(kpis.totalPaid)}
            </div>
          </div>

          <div className="counter-item">
            <div className="label">Chờ thanh toán</div>
            <div className="val" style={{ color: kpis.pendingPayout > 0 ? '#D97706' : '#64748B' }}>
              {formatCurrencyVND(kpis.pendingPayout)}
            </div>
          </div>

          <div className="counter-item">
            <div className="label">Đánh giá bệnh nhân</div>
            <div className="val" style={{ color: '#F59E0B', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Star size={18} fill="#F59E0B" />
              <span>{kpis.avgRating || 0}</span>
              <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 500 }}>({kpis.reviewCount})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <nav className="workspace-tabs-nav">
        <button
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => handleTabChange('overview')}
        >
          <TrendingUp size={15} />
          <span>Tổng quan & Doanh thu</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'schedule' ? 'active' : ''}`}
          onClick={() => handleTabChange('schedule')}
        >
          <Calendar size={15} />
          <span>Lịch làm việc tuần ({weeklySchedule.length})</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'patients' ? 'active' : ''}`}
          onClick={() => handleTabChange('patients')}
        >
          <Users size={15} />
          <span>Mạng lưới Bệnh nhân ({patients.length})</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'finance' ? 'active' : ''}`}
          onClick={() => handleTabChange('finance')}
        >
          <CreditCard size={15} />
          <span>Tài chính & Hoa hồng ({settlements.length})</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => handleTabChange('profile')}
        >
          <FileText size={15} />
          <span>Hồ sơ chuyên môn</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'activity' ? 'active' : ''}`}
          onClick={() => handleTabChange('activity')}
        >
          <Activity size={15} />
          <span>Nhật ký điều hành</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'affiliations' ? 'active' : ''}`}
          onClick={() => handleTabChange('affiliations')}
        >
          <Hospital size={15} />
          <span>Cơ sở công tác ({doctorAssignments.length})</span>
        </button>
      </nav>

      {/* Tab Panels */}
      <div className="tab-panel">
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20 }}>
            {/* Bank & Payout Card */}
            <div style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: 10, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <Landmark size={18} style={{ color: '#087F8C' }} />
                <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#0F172A' }}>
                  Thông tin Tài khoản Thụ hưởng
                </h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.84rem', color: '#334155' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid #F1F5F9' }}>
                  <span style={{ color: '#64748B' }}>Ngân hàng thụ hưởng:</span>
                  <span style={{ fontWeight: 700 }}>{profile.bankName || 'Chưa cập nhật'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid #F1F5F9' }}>
                  <span style={{ color: '#64748B' }}>Số tài khoản:</span>
                  <span style={{ fontWeight: 800, color: '#0F766E', letterSpacing: 0.5 }}>
                    {profile.bankAccountNumber || 'Chưa cập nhật'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid #F1F5F9' }}>
                  <span style={{ color: '#64748B' }}>Tên chủ tài khoản:</span>
                  <span style={{ fontWeight: 700, textTransform: 'uppercase' }}>
                    {profile.bankAccountName || profile.doctorName}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid #F1F5F9' }}>
                  <span style={{ color: '#64748B' }}>Tỷ lệ hoa hồng thỏa thuận:</span>
                  <span style={{ fontWeight: 800, color: '#D97706' }}>
                    {profile.commissionRate}% phí sàn
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Số dư khả dụng chờ thanh toán:</span>
                  <span style={{ fontWeight: 800, color: kpis.pendingPayout > 0 ? '#B45309' : '#059669' }}>
                    {formatCurrencyVND(kpis.pendingPayout)}
                  </span>
                </div>
              </div>

              {kpis.pendingPayout > 0 && (
                <div style={{ marginTop: 16, background: '#FFFBEB', border: '1px solid #FDE68A', padding: '10px 12px', borderRadius: 8, fontSize: '0.8rem', color: '#B45309', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Bác sĩ có số dư cần quyết toán</span>
                  <button
                    className="btn-ws-action primary"
                    style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                    onClick={() => setIsPayoutModalOpen(true)}
                  >
                    Thanh toán ngay
                  </button>
                </div>
              )}
            </div>

            {/* 6-Month Revenue Trend */}
            <div style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: 10, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <TrendingUp size={18} style={{ color: '#059669' }} />
                <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#0F172A' }}>
                  Doanh thu 6 Tháng gần nhất
                </h3>
              </div>

              {monthlyRevenue.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', color: '#94A3B8', fontSize: '0.83rem' }}>
                  Chưa có dữ liệu doanh thu phát sinh trong 6 tháng qua
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', textAlign: 'left' }}>
                        <th style={{ padding: '8px 10px' }}>Tháng</th>
                        <th style={{ padding: '8px 10px' }}>Số ca hoàn thành</th>
                        <th style={{ padding: '8px 10px' }}>Doanh thu gộp</th>
                        <th style={{ padding: '8px 10px' }}>Phí sàn ({kpis.commissionRate}%)</th>
                        <th style={{ padding: '8px 10px' }}>Thực nhận</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyRevenue.map((row) => {
                        const fee = Math.round(row.grossRevenue * (kpis.commissionRate / 100));
                        const net = Math.max(0, row.grossRevenue - fee);
                        return (
                          <tr key={row.month} style={{ borderBottom: '1px solid #F1F5F9' }}>
                            <td style={{ padding: '8px 10px', fontWeight: 600 }}>{row.month}</td>
                            <td style={{ padding: '8px 10px' }}>{row.completedBookings} ca</td>
                            <td style={{ padding: '8px 10px', fontWeight: 600 }}>{formatCurrencyVND(row.grossRevenue)}</td>
                            <td style={{ padding: '8px 10px', color: '#087F8C' }}>{formatCurrencyVND(fee)}</td>
                            <td style={{ padding: '8px 10px', fontWeight: 700, color: '#059669' }}>{formatCurrencyVND(net)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: SCHEDULE */}
        {activeTab === 'schedule' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Quick Schedule Management Tool */}
            <div style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: 10, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Calendar size={18} style={{ color: '#087F8C' }} />
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#0F172A' }}>
                    Thiết lập Khung giờ Làm việc theo Ngày
                  </h3>
                </div>
                {scheduleSuccessMsg && (
                  <span style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <CheckCircle2 size={14} /> {scheduleSuccessMsg}
                  </span>
                )}
              </div>

              <form onSubmit={handleSaveSchedule} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', color: '#64748B', fontWeight: 600, marginBottom: 4 }}>
                    Chọn Ngày khám
                  </label>
                  <input
                    type="date"
                    value={selectedScheduleDate}
                    onChange={(e) => setSelectedScheduleDate(e.target.value)}
                    min={moment().format('YYYY-MM-DD')}
                    style={{ padding: '7px 12px', border: '1px solid #CBD5E1', borderRadius: 6, fontSize: '0.83rem' }}
                  />
                </div>

                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.74rem', color: '#64748B', fontWeight: 600, marginBottom: 4 }}>
                    Khung giờ nhận khám (Chọn khung giờ bác sĩ làm việc)
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {TIME_FRAMES.map((tf) => {
                      const isSelected = selectedTimeKeys.includes(tf.key);
                      return (
                        <button
                          key={tf.key}
                          type="button"
                          onClick={() => handleToggleTimeKey(tf.key)}
                          style={{
                            padding: '6px 10px',
                            borderRadius: 6,
                            fontSize: '0.76rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            border: isSelected ? '1px solid #087F8C' : '1px solid #CBD5E1',
                            background: isSelected ? '#F0FDFA' : '#FFFFFF',
                            color: isSelected ? '#0F766E' : '#475569',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {tf.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={{ alignSelf: 'flex-end' }}>
                  <button
                    type="submit"
                    className="btn-ws-action primary"
                    disabled={savingSchedule}
                    style={{ height: 36 }}
                  >
                    <Save size={14} />
                    <span>{savingSchedule ? 'Đang lưu...' : 'Lưu khung giờ'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Weekly Calendar Grid (7 Days) */}
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', marginBottom: 12 }}>
                Lịch Khám Tuần Tới (7 Ngày)
              </h3>

              {weeklySchedule.length === 0 ? (
                <div style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: 10, padding: 30, textAlign: 'center', color: '#94A3B8' }}>
                  Bác sĩ chưa có lịch làm việc được mở trong 7 ngày tới. Hãy sử dụng công cụ phía trên để mở khung giờ.
                </div>
              ) : (
                <div className="schedule-week-grid">
                  {[0, 1, 2, 3, 4, 5, 6].map((dayOffset) => {
                    const dateMoment = moment().add(dayOffset, 'days');
                    const dateStr = dateMoment.format('DD/MM/YYYY');
                    const dayName = dayOffset === 0 ? 'Hôm nay' : dateMoment.format('dddd');
                    const daySlots = weeklySchedule.filter((s) => s.dateStr === dateStr);

                    return (
                      <div key={dayOffset} className="day-column">
                        <div className="day-header">
                          <div className="day-title">{dayName}</div>
                          <div className="day-date">{dateStr}</div>
                        </div>

                        <div className="slots-list">
                          {daySlots.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '14px 6px', color: '#94A3B8', fontSize: '0.72rem' }}>
                              Không có slot
                            </div>
                          ) : (
                            daySlots.map((slot) => {
                              const tf = TIME_FRAMES.find((t) => t.key === slot.timeType);
                              const hasBookings = slot.bookings && slot.bookings.length > 0;
                              return (
                                <div
                                  key={slot.id}
                                  className={`slot-card ${hasBookings ? 'has-bookings' : ''}`}
                                  onClick={() => setSelectedSlotForDetail(slot)}
                                  title="Bấm để xem chi tiết ca bệnh nhân đặt"
                                >
                                  <div className="slot-time">{tf?.label || slot.timeType}</div>
                                  <div className="slot-capacity">
                                    Đã đặt: {slot.currentNumber}/{slot.maxNumber}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: PATIENTS NETWORK */}
        {activeTab === 'patients' && (
          <div style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Users size={18} style={{ color: '#087F8C' }} />
                <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#0F172A' }}>
                  Danh sách Bệnh nhân từng Khám ({patients.length})
                </h3>
              </div>
              <span style={{ fontSize: '0.76rem', color: '#64748B' }}>
                Liên kết trực tiếp tới Hồ sơ Bệnh nhân (Patient Workspace)
              </span>
            </div>

            {patients.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8', fontSize: '0.84rem' }}>
                Chưa có bệnh nhân nào đặt khám với bác sĩ này
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', textAlign: 'left' }}>
                      <th style={{ padding: '10px 14px' }}>Bệnh nhân</th>
                      <th style={{ padding: '10px 14px' }}>Liên hệ</th>
                      <th style={{ padding: '10px 14px' }}>Lần khám gần nhất</th>
                      <th style={{ padding: '10px 14px' }}>Tổng lượt khám</th>
                      <th style={{ padding: '10px 14px' }}>Hoàn tất</th>
                      <th style={{ padding: '10px 14px' }}>Tổng chi trả</th>
                      <th style={{ padding: '10px 14px', textAlign: 'center' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patients.map((p) => (
                      <tr key={p.patientId} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: '50%',
                                background: '#E2E8F0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                                color: '#475569',
                                fontSize: '0.78rem',
                              }}
                            >
                              {p.patientName?.[0] || 'P'}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, color: '#0F172A' }}>{p.patientName}</div>
                              <div style={{ fontSize: '0.72rem', color: '#64748B' }}>PAT{String(p.patientId).padStart(4, '0')}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <div>{p.phoneNumber || '—'}</div>
                          <div style={{ fontSize: '0.72rem', color: '#64748B' }}>{p.email || '—'}</div>
                        </td>
                        <td style={{ padding: '10px 14px', fontWeight: 600 }}>{p.lastVisitDateStr}</td>
                        <td style={{ padding: '10px 14px', fontWeight: 700 }}>{p.totalVisits} lần</td>
                        <td style={{ padding: '10px 14px', color: '#059669', fontWeight: 600 }}>{p.completedVisits} lần</td>
                        <td style={{ padding: '10px 14px', fontWeight: 700 }}>{formatCurrencyVND(p.totalSpent)}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          <Link
                            to={`/system/patients/${p.patientId}`}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              fontSize: '0.75rem',
                              color: '#087F8C',
                              fontWeight: 600,
                              textDecoration: 'none',
                              padding: '4px 8px',
                              background: '#F0FDFA',
                              borderRadius: 6,
                              border: '1px solid #CCFBF1',
                            }}
                          >
                            <span>Xem hồ sơ</span>
                            <ChevronRight size={12} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: FINANCE & COMMISSION */}
        {activeTab === 'finance' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Top Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
              {/* Commission Card */}
              <div style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: 10, padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Percent size={18} style={{ color: '#087F8C' }} />
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#0F172A' }}>
                      Cấu hình Tỷ lệ Hoa hồng
                    </h3>
                  </div>
                  <button className="btn-ws-action secondary" onClick={() => setIsCommissionModalOpen(true)}>
                    Điều chỉnh
                  </button>
                </div>

                <div style={{ background: '#F8FAFC', padding: 14, borderRadius: 8, marginBottom: 14 }}>
                  <div style={{ fontSize: '0.76rem', color: '#64748B' }}>Tỷ lệ hoa hồng BookingCare khấu trừ:</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#087F8C', margin: '4px 0' }}>
                    {profile.commissionRate}%
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                    Bác sĩ nhận <strong>{100 - profile.commissionRate}%</strong> doanh thu mỗi ca khám thành công.
                  </div>
                </div>

                {/* Commission audit logs list */}
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 8 }}>
                  Lịch sử Thay đổi Tỷ lệ Hoa hồng ({commissionLogs.length})
                </div>
                {commissionLogs.length === 0 ? (
                  <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Chưa có thay đổi hoa hồng nào được ghi nhận</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 160, overflowY: 'auto' }}>
                    {commissionLogs.map((log) => (
                      <div key={log.id} style={{ background: '#FFFFFF', border: '1px solid #F1F5F9', padding: '6px 10px', borderRadius: 6, fontSize: '0.74rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                          <span>{log.oldRate}% → <strong style={{ color: '#087F8C' }}>{log.newRate}%</strong></span>
                          <span style={{ color: '#94A3B8' }}>{moment(log.createdAt).format('DD/MM/YYYY HH:mm')}</span>
                        </div>
                        <div style={{ color: '#64748B', marginTop: 2 }}>{log.reason}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Settlement Summary Card */}
              <div style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: 10, padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CreditCard size={18} style={{ color: '#059669' }} />
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#0F172A' }}>
                      Đối soát Tài chính & Quyết toán
                    </h3>
                  </div>
                  <button className="btn-ws-action primary" onClick={() => setIsPayoutModalOpen(true)}>
                    Tạo lệnh thanh toán
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.82rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 6, borderBottom: '1px solid #F1F5F9' }}>
                    <span style={{ color: '#64748B' }}>1. Tổng doanh thu gộp:</span>
                    <span style={{ fontWeight: 700 }}>{formatCurrencyVND(kpis.grossRevenue)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 6, borderBottom: '1px solid #F1F5F9' }}>
                    <span style={{ color: '#64748B' }}>2. Khấu trừ phí sàn ({kpis.commissionRate}%):</span>
                    <span style={{ fontWeight: 700, color: '#087F8C' }}>- {formatCurrencyVND(kpis.platformFee)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 6, borderBottom: '1px solid #F1F5F9' }}>
                    <span style={{ color: '#64748B' }}>3. Bác sĩ thực nhận:</span>
                    <span style={{ fontWeight: 700, color: '#059669' }}>= {formatCurrencyVND(kpis.netRevenue)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 6, borderBottom: '1px solid #F1F5F9' }}>
                    <span style={{ color: '#64748B' }}>4. Đã thanh toán (lũy kế):</span>
                    <span style={{ fontWeight: 700, color: '#059669' }}>- {formatCurrencyVND(kpis.totalPaid)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 4 }}>
                    <span style={{ fontWeight: 700, color: '#0F172A' }}>5. Số dư khả dụng cần chi trả:</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: kpis.pendingPayout > 0 ? '#D97706' : '#64748B' }}>
                      {formatCurrencyVND(kpis.pendingPayout)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Settlements History Table */}
            <div style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #E2E8F0', fontWeight: 700, fontSize: '0.92rem', color: '#0F172A' }}>
                Lịch sử các Đợt Quyết toán Chi trả ({settlements.length})
              </div>

              {settlements.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', color: '#94A3B8', fontSize: '0.82rem' }}>
                  Chưa có lệnh thanh toán nào được thực hiện cho bác sĩ này.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', textAlign: 'left' }}>
                        <th style={{ padding: '10px 14px' }}>Mã giao dịch</th>
                        <th style={{ padding: '10px 14px' }}>Ngày chi trả</th>
                        <th style={{ padding: '10px 14px' }}>Số tiền chuyển</th>
                        <th style={{ padding: '10px 14px' }}>Phương thức</th>
                        <th style={{ padding: '10px 14px' }}>Trạng thái</th>
                        <th style={{ padding: '10px 14px' }}>Ghi chú đối soát</th>
                      </tr>
                    </thead>
                    <tbody>
                      {settlements.map((s) => (
                        <tr key={s.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '10px 14px', fontWeight: 700, color: '#087F8C' }}>
                            {s.transactionRef}
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            {s.paidAt ? moment(s.paidAt).format('DD/MM/YYYY HH:mm') : moment(s.createdAt).format('DD/MM/YYYY')}
                          </td>
                          <td style={{ padding: '10px 14px', fontWeight: 700, color: '#059669' }}>
                            {formatCurrencyVND(s.netPayout)}
                          </td>
                          <td style={{ padding: '10px 14px', textTransform: 'capitalize' }}>
                            {s.paymentMethod?.replace('_', ' ')}
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <span style={{ padding: '3px 8px', borderRadius: 4, fontSize: '0.72rem', fontWeight: 700, background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0' }}>
                              ● {s.payoutStatus === 'paid' ? 'Đã chuyển' : s.payoutStatus}
                            </span>
                          </td>
                          <td style={{ padding: '10px 14px', color: '#64748B' }}>
                            {s.note || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: PROFESSIONAL PROFILE */}
        {activeTab === 'profile' && (
          <div style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: 10, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileText size={18} style={{ color: '#087F8C' }} />
                <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#0F172A' }}>
                  Hồ sơ Chuyên môn & Bài viết Giới thiệu
                </h3>
              </div>
              {profileSuccessMsg && (
                <span style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <CheckCircle2 size={14} /> {profileSuccessMsg}
                </span>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, background: '#F8FAFC', padding: 16, borderRadius: 8, marginBottom: 20 }}>
              <div>
                <span style={{ fontSize: '0.74rem', color: '#64748B', display: 'block' }}>Chuyên khoa:</span>
                <strong style={{ fontSize: '0.85rem' }}>{profile.specialtyName}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.74rem', color: '#64748B', display: 'block' }}>Cơ sở khám bệnh:</span>
                <strong style={{ fontSize: '0.85rem' }}>{profile.clinicName}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.74rem', color: '#64748B', display: 'block' }}>Giá khám niêm yết:</span>
                <strong style={{ fontSize: '0.85rem', color: '#059669' }}>{profile.priceVi}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.74rem', color: '#64748B', display: 'block' }}>Hình thức thanh toán:</span>
                <strong style={{ fontSize: '0.85rem' }}>{profile.paymentVi}</strong>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  Mô tả ngắn (Hiển thị đầu trang hồ sơ bệnh nhân)
                </label>
                <textarea
                  rows={3}
                  value={profileForm.description}
                  onChange={(e) => setProfileForm({ ...profileForm, description: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #CBD5E1', borderRadius: 6, fontSize: '0.83rem', boxSizing: 'border-box' }}
                  placeholder="Bác sĩ có hơn 15 năm kinh nghiệm điều trị chuyên sâu..."
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  Bài viết chi tiết quá trình công tác, thành tựu & quá trình đào tạo (Markdown)
                </label>
                <textarea
                  rows={10}
                  value={profileForm.contentMarkdown}
                  onChange={(e) => setProfileForm({ ...profileForm, contentMarkdown: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #CBD5E1', borderRadius: 6, fontSize: '0.83rem', fontFamily: 'monospace', boxSizing: 'border-box' }}
                  placeholder="### Quá trình đào tạo..."
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  Ghi chú nội bộ cho bệnh nhân khi đến khám (Địa điểm phòng, lưu ý nhịn ăn...)
                </label>
                <input
                  type="text"
                  value={profileForm.note}
                  onChange={(e) => setProfileForm({ ...profileForm, note: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #CBD5E1', borderRadius: 6, fontSize: '0.83rem', boxSizing: 'border-box' }}
                  placeholder="Phòng khám 302 tầng 3, vui lòng mang theo kết quả xét nghiệm cũ..."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                <button type="submit" className="btn-ws-action primary" disabled={savingProfile}>
                  <Save size={14} />
                  <span>{savingProfile ? 'Đang lưu...' : 'Lưu hồ sơ chuyên môn'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 6: AUDIT & ACTIVITY TIMELINE */}
        {activeTab === 'activity' && (
          <div style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: 10, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
              <Activity size={18} style={{ color: '#087F8C' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#0F172A' }}>
                Nhật ký Điều hành & Kiểm toán Hoạt động Bác sĩ
              </h3>
            </div>

            <div style={{ position: 'relative', paddingLeft: 24, borderLeft: '2px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Event 1: Creation */}
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: -31, top: 2, width: 12, height: 12, borderRadius: '50%', background: '#087F8C', border: '2px solid #FFFFFF' }} />
                <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>{moment(profile.createdAt).format('DD/MM/YYYY HH:mm')}</div>
                <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.85rem' }}>Khởi tạo hồ sơ bác sĩ</div>
                <div style={{ fontSize: '0.8rem', color: '#64748B' }}>
                  Bác sĩ gia nhập hệ thống BookingCare tại cơ sở {profile.clinicName}, chuyên khoa {profile.specialtyName}.
                </div>
              </div>

              {/* Event 2: Commission Changes */}
              {commissionLogs.map((log) => (
                <div key={log.id} style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: -31, top: 2, width: 12, height: 12, borderRadius: '50%', background: '#D97706', border: '2px solid #FFFFFF' }} />
                  <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>{moment(log.createdAt).format('DD/MM/YYYY HH:mm')}</div>
                  <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.85rem' }}>
                    Điều chỉnh tỷ lệ hoa hồng ({log.oldRate}% → {log.newRate}%)
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748B' }}>{log.reason}</div>
                </div>
              ))}

              {/* Event 3: Settlements */}
              {settlements.map((s) => (
                <div key={s.id} style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: -31, top: 2, width: 12, height: 12, borderRadius: '50%', background: '#059669', border: '2px solid #FFFFFF' }} />
                  <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>{moment(s.paidAt || s.createdAt).format('DD/MM/YYYY HH:mm')}</div>
                  <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.85rem' }}>
                    Quyết toán chi trả: {formatCurrencyVND(s.netPayout)}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748B' }}>
                    Mã GD: {s.transactionRef} ({s.paymentMethod}). {s.note}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 7: MULTI-CLINIC AFFILIATIONS */}
        {activeTab === 'affiliations' && (
          <div style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: 10, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Hospital size={18} style={{ color: '#087F8C' }} />
                <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#0F172A' }}>
                  Cơ sở Y tế & Chuyên khoa Bác sĩ Đang Công tác
                </h3>
              </div>
              <span className="badge bg-secondary" style={{ background: '#087F8C', color: '#fff' }}>
                {doctorAssignments.length} Cơ sở phân bổ
              </span>
            </div>

            {doctorAssignments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94A3B8' }}>
                <Hospital size={36} style={{ marginBottom: 10, opacity: 0.5 }} />
                <div>Bác sĩ chưa được phân bổ vào cơ sở y tế nào</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
                {doctorAssignments.map((asg) => (
                  <div
                    key={asg.id}
                    style={{
                      border: '1px solid #E2E8F0',
                      borderRadius: 10,
                      padding: 16,
                      background: '#F8FAFC',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '0.96rem', color: '#0F172A', fontWeight: 700 }}>
                            {asg.clinicName}
                          </h4>
                          <small style={{ color: '#64748B', fontSize: '0.76rem' }}>{asg.clinicAddress}</small>
                        </div>
                        {asg.isPrimary ? (
                          <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 9999, background: '#ECFDF5', color: '#047857', fontWeight: 700 }}>
                            ★ Cơ sở chính
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 9999, background: '#F1F5F9', color: '#64748B' }}>
                            Kiêm nhiệm
                          </span>
                        )}
                      </div>

                      <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8, padding: 12, margin: '10px 0', fontSize: '0.78rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ color: '#64748B' }}>Chuyên khoa:</span>
                          <strong style={{ color: '#087F8C' }}>{asg.specialtyName}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ color: '#64748B' }}>Phòng khám:</span>
                          <strong>{asg.roomNumber || 'Chưa xếp phòng'}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ color: '#64748B' }}>Giá dịch vụ:</span>
                          <strong style={{ color: '#059669' }}>{asg.priceText}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#64748B' }}>Hoa hồng sàn riêng:</span>
                          <strong style={{ color: '#D97706' }}>{asg.commissionRate}%</strong>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <Link
                        to={`/system/clinics/${asg.clinicId}`}
                        style={{
                          flex: 1,
                          textAlign: 'center',
                          padding: '6px 10px',
                          background: '#FFFFFF',
                          border: '1px solid #CBD5E1',
                          borderRadius: 6,
                          fontSize: '0.78rem',
                          color: '#334155',
                          textDecoration: 'none',
                          fontWeight: 600,
                        }}
                      >
                        Vào Cơ sở
                      </Link>
                      <Link
                        to={`/system/clinics/${asg.clinicId}/specialties/${asg.specialtyId}`}
                        style={{
                          flex: 1,
                          textAlign: 'center',
                          padding: '6px 10px',
                          background: '#087F8C',
                          border: '1px solid #087F8C',
                          borderRadius: 6,
                          fontSize: '0.78rem',
                          color: '#FFFFFF',
                          textDecoration: 'none',
                          fontWeight: 600,
                        }}
                      >
                        Vào Chuyên khoa
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL 1: Commission Modal */}
      <CommissionModal
        isOpen={isCommissionModalOpen}
        onClose={() => setIsCommissionModalOpen(false)}
        doctor={profile}
        onSuccess={() => fetchWorkspace()}
      />

      {/* MODAL 2: Doctor Payout Modal */}
      <DoctorPayoutModal
        isOpen={isPayoutModalOpen}
        onClose={() => setIsPayoutModalOpen(false)}
        doctor={{
          ...profile,
          pendingPayout: kpis.pendingPayout,
        }}
        onSuccess={() => fetchWorkspace()}
      />

      {/* MODAL 3: Slot Bookings Detail Popup */}
      {selectedSlotForDetail && (
        <div className="ops-modal-backdrop" onClick={() => setSelectedSlotForDetail(null)}>
          <div className="ops-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Clock size={18} style={{ color: '#087F8C' }} />
                <h3 className="modal-title">
                  Chi tiết Ca khám: {selectedSlotForDetail.dayOfWeek} ({selectedSlotForDetail.dateStr}) — {TIME_FRAMES.find((t) => t.key === selectedSlotForDetail.timeType)?.label || selectedSlotForDetail.timeType}
                </h3>
              </div>
              <button className="btn-close" onClick={() => setSelectedSlotForDetail(null)}>
                <XCircle size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: '0.82rem' }}>
                <span>Trạng thái lấp đầy:</span>
                <strong>{selectedSlotForDetail.currentNumber} / {selectedSlotForDetail.maxNumber} chỗ</strong>
              </div>

              {!selectedSlotForDetail.bookings || selectedSlotForDetail.bookings.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#94A3B8', fontSize: '0.84rem' }}>
                  Chưa có bệnh nhân nào đặt lịch trong khung giờ này.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {selectedSlotForDetail.bookings.map((b) => (
                    <div
                      key={b.id}
                      style={{
                        background: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        padding: '10px 14px',
                        borderRadius: 8,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.84rem' }}>{b.patientName}</div>
                        <div style={{ fontSize: '0.74rem', color: '#64748B' }}>
                          SĐT: {b.patientPhoneNumber || '—'} • Mã: #{b.id}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            background: b.statusId === 'S3' ? '#ECFDF5' : '#EFF6FF',
                            color: b.statusId === 'S3' ? '#059669' : '#1D4ED8',
                          }}
                        >
                          {b.statusId === 'S3' ? 'Đã khám' : b.statusId === 'S2' ? 'Đã xác nhận' : 'Chờ xác nhận'}
                        </span>
                        <div style={{ fontSize: '0.76rem', fontWeight: 600, color: '#334155', marginTop: 2 }}>
                          {formatCurrencyVND(b.bookingPrice)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setSelectedSlotForDetail(null)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorDetailWorkspace;
