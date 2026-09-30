// src/containers/System/Admin/Patient/PatientDetailWorkspace.jsx
// Healthcare Enterprise Patient Workspace: Profile, Clinical Appointments, Payments/Refunds & Activity Timeline
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import moment from 'moment';
import {
  ArrowLeft,
  CalendarCheck,
  CircleDollarSign,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CreditCard,
  History,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCw,
  PlusCircle,
  Building2,
  Stethoscope,
  ChevronRight
} from 'lucide-react';
import { getAdminPatientWorkspace } from '../../../../services/patientManageService';
import { path } from '../../../../utils/constants';
import RefundModal from './RefundModal';
import './PatientWorkspace.scss';

const formatCurrencyVND = (num) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0);
};

const PatientDetailWorkspace = () => {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const language = useSelector((state) => state.app.language);

  const initialTab = searchParams.get('tab') || 'overview';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [appointmentFilter, setAppointmentFilter] = useState('all'); // 'all', 'upcoming', 'completed', 'cancelled'

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Selected booking for refund modal
  const [refundBooking, setRefundBooking] = useState(null);

  const fetchWorkspace = useCallback(async (signal) => {
    setLoading(true);
    setError('');
    try {
      const res = await getAdminPatientWorkspace(id, { signal });
      if (res && res.errCode === 0) {
        setData(res.data);
      } else {
        setError(res?.errMessage || 'Không tìm thấy thông tin bệnh nhân');
      }
    } catch (err) {
      if (err.name !== 'CanceledError' && err.name !== 'AbortError') {
        setError('Lỗi kết nối máy chủ');
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

  const profile = data?.profile || {};
  const kpis = data?.kpis || { totalBookings: 0, completedCount: 0, cancelledCount: 0, upcomingCount: 0, totalSpent: 0, totalRefunded: 0 };
  const appointments = data?.appointments || [];
  const paymentHistory = data?.paymentHistory || [];
  const refundHistory = data?.refundHistory || [];
  const activities = data?.activities || [];

  const filteredAppointments = appointments.filter((a) => {
    if (appointmentFilter === 'upcoming') {
      return ['S1', 'S1.5', 'S2'].includes(a.statusId) && Number(a.date) >= Date.now();
    }
    if (appointmentFilter === 'completed') return a.statusId === 'S3';
    if (appointmentFilter === 'cancelled') return a.statusId === 'S4';
    return true;
  });

  const nextBooking = appointments.find((a) => ['S1', 'S1.5', 'S2'].includes(a.statusId) && Number(a.date) >= Date.now()) || appointments[0];

  const pendingRefundBooking = appointments.find((a) => a.statusId === 'S4' && (a.refundStatus === 'pending' || a.paymentStatus === 'refund_pending'));

  return (
    <div className="patient-workspace-container">
      {/* Breadcrumb */}
      <div className="workspace-breadcrumb">
        <Link to={path.PATIENT_MANAGE}>
          <ArrowLeft size={14} />
          <span>{language === 'vi' ? 'Quản lý Bệnh nhân' : 'Patient Base'}</span>
        </Link>
        <span className="bc-separator">/</span>
        <span style={{ color: '#0F172A', fontWeight: 700 }}>
          {profile.patientCode || `BN-${id}`} — {profile.fullName}
        </span>
      </div>

      {/* Workspace Master Hero Card */}
      <div className="workspace-hero-card">
        <div className="hero-top-row">
          <div className="patient-identity">
            <div className="avatar-lg">
              {profile.firstName ? profile.firstName.charAt(0).toUpperCase() : 'BN'}
            </div>
            <div className="name-group">
              <div className="name-row">
                <h1 className="patient-name">{profile.fullName}</h1>
                <span className="code-pill">{profile.patientCode}</span>
                {kpis.upcomingCount > 0 && (
                  <span style={{ background: '#e0f2fe', color: '#0369a1', fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: 4 }}>
                    Có ca sắp khám
                  </span>
                )}
              </div>
              <div className="join-date">
                {language === 'vi' ? 'Tham gia hệ thống từ:' : 'Member since:'}{' '}
                {profile.createdAt ? moment(profile.createdAt).format('DD/MM/YYYY') : '—'}
              </div>
            </div>
          </div>

          <div className="hero-quick-actions">
            {pendingRefundBooking && (
              <button
                className="btn-action-refund"
                onClick={() => setRefundBooking(pendingRefundBooking)}
              >
                <CircleDollarSign size={16} />
                <span>{language === 'vi' ? 'Xử lý hoàn tiền chờ duyệt' : 'Process Pending Refund'}</span>
              </button>
            )}

            <button
              className="btn-action-primary"
              onClick={() => handleTabChange('appointments')}
            >
              <CalendarCheck size={16} />
              <span>{language === 'vi' ? 'Xem lịch khám' : 'Appointments'}</span>
            </button>
          </div>
        </div>

        {/* Quick Contact Details Row */}
        <div className="contact-details-row">
          <div className="contact-item">
            <Phone size={15} className="ci-icon" />
            <span>SĐT: <strong>{profile.phoneNumber || 'Chưa cập nhật'}</strong></span>
          </div>
          <div className="contact-item">
            <Mail size={15} className="ci-icon" />
            <span>Email: <strong>{profile.email}</strong></span>
          </div>
          <div className="contact-item">
            <MapPin size={15} className="ci-icon" />
            <span>Địa chỉ: <strong>{profile.address || 'Chưa cập nhật'}</strong></span>
          </div>
          <div className="contact-item">
            <CreditCard size={15} className="ci-icon" />
            <span>
              STK hoàn tiền:{' '}
              <strong>
                {profile.primaryBankAccount
                  ? `${profile.primaryBankAccount.bankName} (${profile.primaryBankAccount.accountNumber})`
                  : 'Chưa liên kết'}
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* Workspace Tabs Nav */}
      <nav className="workspace-tabs-nav">
        <button
          className={`ws-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => handleTabChange('overview')}
        >
          <User size={16} />
          <span>{language === 'vi' ? 'Tổng quan' : 'Overview'}</span>
        </button>

        <button
          className={`ws-tab-btn ${activeTab === 'appointments' ? 'active' : ''}`}
          onClick={() => handleTabChange('appointments')}
        >
          <CalendarCheck size={16} />
          <span>{language === 'vi' ? 'Lịch khám' : 'Appointments'}</span>
          <span className="tab-badge">{kpis.totalBookings}</span>
        </button>

        <button
          className={`ws-tab-btn ${activeTab === 'payments' ? 'active' : ''}`}
          onClick={() => handleTabChange('payments')}
        >
          <CircleDollarSign size={16} />
          <span>{language === 'vi' ? 'Thanh toán & Hoàn tiền' : 'Payments & Refunds'}</span>
          {kpis.pendingRefundCount > 0 && (
            <span className="tab-badge highlight">{kpis.pendingRefundCount} chờ hoàn</span>
          )}
        </button>

        <button
          className={`ws-tab-btn ${activeTab === 'activity' ? 'active' : ''}`}
          onClick={() => handleTabChange('activity')}
        >
          <History size={16} />
          <span>{language === 'vi' ? 'Dòng hoạt động' : 'Activity Timeline'}</span>
        </button>
      </nav>

      {/* Tab Content Area */}
      <div className="tab-content-area">
        {/* ===== TAB 1: OVERVIEW ===== */}
        {activeTab === 'overview' && (
          <>
            {/* 4 Personal KPIs */}
            <div className="personal-kpis-grid">
              <div className="pk-card">
                <div className="pk-label">{language === 'vi' ? 'Tổng lượt đặt khám' : 'Total Bookings'}</div>
                <div className="pk-val">{kpis.totalBookings}</div>
                <div className="pk-sub">Tổng số ca đã tạo</div>
              </div>

              <div className="pk-card">
                <div className="pk-label">{language === 'vi' ? 'Khám hoàn tất' : 'Completed'}</div>
                <div className="pk-val" style={{ color: '#059669' }}>
                  {kpis.completedCount}
                </div>
                <div className="pk-sub">Đã khám thành công</div>
              </div>

              <div className="pk-card">
                <div className="pk-label">{language === 'vi' ? 'Ca đã hủy' : 'Cancelled'}</div>
                <div className="pk-val" style={{ color: '#E11D48' }}>
                  {kpis.cancelledCount}
                </div>
                <div className="pk-sub">Đã hủy ca hẹn</div>
              </div>

              <div className="pk-card">
                <div className="pk-label">{language === 'vi' ? 'Tổng chi tiêu' : 'Total Spent'}</div>
                <div className="pk-val" style={{ color: '#087F8C' }}>
                  {formatCurrencyVND(kpis.totalSpent)}
                </div>
                <div className="pk-sub">Hoàn tiền: {formatCurrencyVND(kpis.totalRefunded)}</div>
              </div>
            </div>

            {/* 2-col Layout */}
            <div className="workspace-grid-2col">
              {/* Left Col: Next/Recent Booking Card */}
              <div>
                <div className="ws-card">
                  <h2 className="ws-card-title">
                    <span>{language === 'vi' ? 'Ca Khám Gần Nhất' : 'Recent Appointment'}</span>
                    {nextBooking && (
                      <span style={{ fontSize: '0.78rem', color: '#087F8C' }}>{nextBooking.bookingCode}</span>
                    )}
                  </h2>

                  {nextBooking ? (
                    <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                        <div>
                          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>
                            {nextBooking.doctorName}
                          </div>
                          <div style={{ fontSize: '0.82rem', color: '#64748B' }}>
                            {nextBooking.specialtyName} · {nextBooking.clinicName}
                          </div>
                        </div>
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: 4,
                          background: nextBooking.statusId === 'S3' ? '#D1FAE5' : nextBooking.statusId === 'S4' ? '#FEE2E2' : '#DBEAFE',
                          color: nextBooking.statusId === 'S3' ? '#047857' : nextBooking.statusId === 'S4' ? '#B91C1C' : '#1D4ED8',
                        }}>
                          {nextBooking.statusLabelVi}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: 16, fontSize: '0.82rem', color: '#475569', marginBottom: 12 }}>
                        <span>📅 Ngày: <strong>{nextBooking.dateFormatted}</strong></span>
                        <span>⏰ Giờ: <strong>{nextBooking.timeSlot}</strong></span>
                        <span>💰 Giá: <strong>{formatCurrencyVND(nextBooking.bookingPrice)}</strong></span>
                      </div>

                      {nextBooking.statusId === 'S4' && (nextBooking.refundStatus === 'pending' || nextBooking.paymentStatus === 'refund_pending') && (
                        <button
                          className="btn-action-refund"
                          style={{ width: '100%', justifyContent: 'center' }}
                          onClick={() => setRefundBooking(nextBooking)}
                        >
                          <CircleDollarSign size={16} />
                          <span>Xử lý hoàn tiền cho ca này</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '30px 20px', color: '#94A3B8' }}>
                      Chưa có lịch sử ca khám
                    </div>
                  )}
                </div>

                {/* Bank Accounts */}
                <div className="ws-card">
                  <h2 className="ws-card-title">
                    <span>{language === 'vi' ? 'Tài Khoản Nhận Tiền Hoàn' : 'Refund Bank Accounts'}</span>
                    <span style={{ fontSize: '0.78rem', color: '#64748B' }}>{profile.bankAccounts?.length || 0} tài khoản</span>
                  </h2>

                  <div className="bank-account-list">
                    {profile.bankAccounts && profile.bankAccounts.length > 0 ? (
                      profile.bankAccounts.map((b) => (
                        <div key={b.id} className="bank-item">
                          <div className="bank-info">
                            <CreditCard size={18} color="#087F8C" />
                            <div>
                              <div>
                                <span className="bank-name">{b.bankName}</span> — <span className="acc-num">{b.accountNumber}</span>
                              </div>
                              <div className="holder">{b.accountHolder}</div>
                            </div>
                          </div>
                          {b.isPrimary && <span className="tag-primary">Tài khoản chính</span>}
                        </div>
                      ))
                    ) : (
                      <div style={{ padding: '16px', textAlign: 'center', color: '#94A3B8', fontSize: '0.82rem' }}>
                        Bệnh nhân chưa lưu tài khoản ngân hàng nào trong profile
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Col: Recent Activities Snippet */}
              <div>
                <div className="ws-card">
                  <h2 className="ws-card-title">
                    <span>{language === 'vi' ? 'Hoạt Động Gần Nhất' : 'Recent Activities'}</span>
                    <button
                      style={{ border: 'none', background: 'transparent', color: '#087F8C', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                      onClick={() => handleTabChange('activity')}
                    >
                      Xem toàn bộ →
                    </button>
                  </h2>

                  <div className="timeline-list">
                    {activities.slice(0, 4).map((act, idx) => (
                      <div key={idx} className="timeline-entry">
                        <span className={`tl-dot ${act.type.toLowerCase()}`} />
                        <div className="tl-time">{act.dateStr}</div>
                        <div className="tl-title">{act.title}</div>
                        <div className="tl-desc">{act.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ===== TAB 2: APPOINTMENTS ===== */}
        {activeTab === 'appointments' && (
          <div className="ws-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', gap: 6, background: '#F1F5F9', padding: 3, borderRadius: 6 }}>
                {[
                  { key: 'all', label: 'Tất cả' },
                  { key: 'upcoming', label: 'Sắp khám' },
                  { key: 'completed', label: 'Đã hoàn thành' },
                  { key: 'cancelled', label: 'Đã hủy' },
                ].map((f) => (
                  <button
                    key={f.key}
                    style={{
                      border: 'none',
                      background: appointmentFilter === f.key ? '#fff' : 'transparent',
                      padding: '5px 12px',
                      borderRadius: 4,
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      color: appointmentFilter === f.key ? '#0F172A' : '#64748B',
                    }}
                    onClick={() => setAppointmentFilter(f.key)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <span style={{ fontSize: '0.82rem', color: '#64748B' }}>
                {filteredAppointments.length} ca khám
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #CBD5E1', textAlign: 'left' }}>
                    <th style={{ padding: '10px 12px' }}>Mã ca</th>
                    <th style={{ padding: '10px 12px' }}>Ngày giờ khám</th>
                    <th style={{ padding: '10px 12px' }}>Bác sĩ & Chuyên khoa</th>
                    <th style={{ padding: '10px 12px' }}>Cơ sở y tế</th>
                    <th style={{ padding: '10px 12px' }}>Giá khám</th>
                    <th style={{ padding: '10px 12px' }}>Trạng thái</th>
                    <th style={{ padding: '10px 12px' }}>Hoàn tiền</th>
                    <th style={{ padding: '10px 12px' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAppointments.map((a) => (
                    <tr key={a.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '12px', fontWeight: 700 }}>{a.bookingCode}</td>
                      <td style={{ padding: '12px' }}>
                        <div>{a.dateFormatted}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{a.timeSlot}</div>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: 600 }}>{a.doctorName}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{a.specialtyName}</div>
                      </td>
                      <td style={{ padding: '12px', color: '#475569' }}>{a.clinicName}</td>
                      <td style={{ padding: '12px', fontWeight: 600 }}>{formatCurrencyVND(a.bookingPrice)}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: 4,
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: a.statusId === 'S3' ? '#D1FAE5' : a.statusId === 'S4' ? '#FEE2E2' : '#DBEAFE',
                          color: a.statusId === 'S3' ? '#047857' : a.statusId === 'S4' ? '#B91C1C' : '#1D4ED8',
                        }}>
                          {a.statusLabelVi}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        {a.statusId === 'S4' ? (
                          a.refundStatus === 'refunded' ? (
                            <span style={{ color: '#059669', fontWeight: 700, fontSize: '0.78rem' }}>
                              ✓ Đã hoàn {formatCurrencyVND(a.refundAmount)}
                            </span>
                          ) : (
                            <span style={{ color: '#D97706', fontWeight: 700, fontSize: '0.78rem' }}>
                              Chờ hoàn tiền ({a.policyEstimate?.suggestedRate || 100}%)
                            </span>
                          )
                        ) : (
                          <span style={{ color: '#94A3B8' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '12px' }}>
                        {a.statusId === 'S4' && a.refundStatus !== 'refunded' ? (
                          <button
                            style={{
                              background: '#FEF3C7',
                              color: '#92400E',
                              border: '1px solid #FDE68A',
                              borderRadius: 4,
                              padding: '4px 8px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                            onClick={() => setRefundBooking(a)}
                          >
                            Hoàn tiền
                          </button>
                        ) : (
                          <span style={{ color: '#64748B', fontSize: '0.78rem' }}>Chi tiết</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===== TAB 3: PAYMENTS & REFUNDS ===== */}
        {activeTab === 'payments' && (
          <>
            {/* Payment history */}
            <div className="ws-card">
              <h2 className="ws-card-title">
                <span>Giao Dịch Thanh Toán Khám Bệnh</span>
                <span style={{ fontSize: '0.8rem', color: '#64748B' }}>{paymentHistory.length} giao dịch</span>
              </h2>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #CBD5E1', textAlign: 'left' }}>
                      <th style={{ padding: '10px 12px' }}>Mã ca</th>
                      <th style={{ padding: '10px 12px' }}>Ngày tạo</th>
                      <th style={{ padding: '10px 12px' }}>Dịch vụ khám</th>
                      <th style={{ padding: '10px 12px' }}>Số tiền</th>
                      <th style={{ padding: '10px 12px' }}>Trạng thái thanh toán</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentHistory.map((p) => (
                      <tr key={p.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '12px', fontWeight: 700 }}>{p.bookingCode}</td>
                        <td style={{ padding: '12px' }}>{p.dateFormatted}</td>
                        <td style={{ padding: '12px' }}>{p.doctorName} ({p.specialtyName})</td>
                        <td style={{ padding: '12px', fontWeight: 700, color: '#0F172A' }}>
                          {formatCurrencyVND(p.amount)}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span style={{ background: '#D1FAE5', color: '#047857', padding: '3px 8px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 700 }}>
                            {p.paymentStatus === 'refunded' ? 'Đã hoàn tiền' : 'Thành công'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Refund history */}
            <div className="ws-card">
              <h2 className="ws-card-title">
                <span>Đối Soát & Lịch Sử Hoàn Tiền Hủy Lịch</span>
                <span style={{ fontSize: '0.8rem', color: '#E11D48' }}>{refundHistory.length} ca hoàn tiền</span>
              </h2>

              {refundHistory && refundHistory.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #CBD5E1', textAlign: 'left' }}>
                        <th style={{ padding: '10px 12px' }}>Mã ca</th>
                        <th style={{ padding: '10px 12px' }}>Thời điểm hủy</th>
                        <th style={{ padding: '10px 12px' }}>Giá gốc</th>
                        <th style={{ padding: '10px 12px' }}>Tỷ lệ hoàn</th>
                        <th style={{ padding: '10px 12px' }}>Số tiền hoàn</th>
                        <th style={{ padding: '10px 12px' }}>Tài khoản nhận tiền</th>
                        <th style={{ padding: '10px 12px' }}>Trạng thái</th>
                        <th style={{ padding: '10px 12px' }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {refundHistory.map((r) => (
                        <tr key={r.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '12px', fontWeight: 700 }}>{r.bookingCode}</td>
                          <td style={{ padding: '12px' }}>
                            {r.cancelledAt ? moment(r.cancelledAt).format('HH:mm DD/MM/YYYY') : '—'}
                          </td>
                          <td style={{ padding: '12px' }}>{formatCurrencyVND(r.originalPrice)}</td>
                          <td style={{ padding: '12px', fontWeight: 700 }}>{r.refundRate}%</td>
                          <td style={{ padding: '12px', fontWeight: 700, color: '#059669' }}>
                            {formatCurrencyVND(r.refundAmount)}
                          </td>
                          <td style={{ padding: '12px' }}>
                            <div style={{ fontWeight: 600 }}>{r.bankName}</div>
                            <div style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#64748B' }}>{r.accountNumber}</div>
                          </td>
                          <td style={{ padding: '12px' }}>
                            <span style={{
                              padding: '3px 8px',
                              borderRadius: 4,
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              background: r.refundStatus === 'refunded' ? '#D1FAE5' : '#FEF3C7',
                              color: r.refundStatus === 'refunded' ? '#047857' : '#92400E',
                            }}>
                              {r.refundStatus === 'refunded' ? 'Đã hoàn tiền' : 'Chờ chuyển khoản'}
                            </span>
                          </td>
                          <td style={{ padding: '12px' }}>
                            {r.refundStatus !== 'refunded' && (
                              <button
                                style={{
                                  background: '#FEF3C7',
                                  color: '#92400E',
                                  border: '1px solid #FDE68A',
                                  borderRadius: 4,
                                  padding: '4px 8px',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                }}
                                onClick={() => setRefundBooking(r)}
                              >
                                Hoàn tiền ngay
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '30px 20px', color: '#94A3B8' }}>
                  Chưa có yêu cầu hoàn tiền nào từ bệnh nhân này
                </div>
              )}
            </div>
          </>
        )}

        {/* ===== TAB 4: ACTIVITY TIMELINE ===== */}
        {activeTab === 'activity' && (
          <div className="ws-card">
            <h2 className="ws-card-title">
              <span>Dòng Thời Gian Lịch Sử Bệnh Nhân (Audit Timeline)</span>
              <span style={{ fontSize: '0.8rem', color: '#64748B' }}>{activities.length} sự kiện</span>
            </h2>

            <div className="timeline-list">
              {activities.map((act, idx) => (
                <div key={idx} className="timeline-entry">
                  <span className={`tl-dot ${act.type.toLowerCase()}`} />
                  <div className="tl-time">{act.dateStr}</div>
                  <div className="tl-title">{act.title}</div>
                  <div className="tl-desc">{act.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Dedicated Refund Modal */}
      {refundBooking && (
        <RefundModal
          booking={refundBooking}
          patient={profile}
          onClose={() => setRefundBooking(null)}
          onSuccess={() => {
            fetchWorkspace();
          }}
        />
      )}
    </div>
  );
};

export default PatientDetailWorkspace;
