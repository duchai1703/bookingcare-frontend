// src/containers/System/Admin/Doctor/DoctorMaster.jsx
// Healthcare Enterprise Doctor Operations Center: Master List, Smart Alerts, Filters & Actions
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import {
  UserCheck,
  Search,
  RotateCw,
  Calendar,
  AlertTriangle,
  CreditCard,
  Percent,
  MoreVertical,
  ChevronRight,
  Eye,
  SlidersHorizontal,
  Clock,
  CheckCircle2,
  PauseCircle,
  XCircle,
  Plus
} from 'lucide-react';
import { getAdminDoctorsList, updateDoctorWorkingStatus } from '../../../../services/doctorManageService';
import { getAllSpecialty } from '../../../../services/specialtyService';
import { getAllClinic } from '../../../../services/clinicService';
import CommissionModal from './CommissionModal';
import DoctorPayoutModal from './DoctorPayoutModal';
import './DoctorWorkspace.scss';

const formatCurrencyVND = (num) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0);
};

const DoctorMaster = () => {
  const language = useSelector((state) => state.app.language);
  const navigate = useNavigate();

  // Filters & Pagination State
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [specialtyFilter, setSpecialtyFilter] = useState('all');
  const [clinicFilter, setClinicFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');

  // Metadata dropdowns
  const [specialties, setSpecialties] = useState([]);
  const [clinics, setClinics] = useState([]);

  // Data State
  const [doctors, setDoctors] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, totalCount: 0, totalPages: 1 });
  const [summaryKpis, setSummaryKpis] = useState({
    totalDoctors: 0,
    activeDoctors: 0,
    pausedDoctors: 0,
    suspendedDoctors: 0,
    pendingPayoutDoctors: 0,
    totalPendingPayout: 0,
    totalGrossRevenue: 0,
  });
  const [actionAlerts, setActionAlerts] = useState({
    unpaidDoctorsCount: 0,
    noScheduleDoctorsCount: 0,
    highCancelDoctorsCount: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Dropdown action menu state
  const [activeMenuDoctorId, setActiveMenuDoctorId] = useState(null);

  // Modals state
  const [selectedCommissionDoc, setSelectedCommissionDoc] = useState(null);
  const [selectedPayoutDoc, setSelectedPayoutDoc] = useState(null);

  // 1. Fetch metadata (specialties & clinics)
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [spRes, clRes] = await Promise.all([
          getAllSpecialty(),
          getAllClinic(),
        ]);
        if (spRes && spRes.errCode === 0) setSpecialties(spRes.data || []);
        if (clRes && clRes.errCode === 0) setClinics(clRes.data || []);
      } catch (err) {
        console.error('Failed to load metadata:', err);
      }
    };
    fetchMetadata();
  }, []);

  // 2. Fetch doctors list
  const fetchDoctors = useCallback(async (signal) => {
    setLoading(true);
    setError('');
    try {
      const res = await getAdminDoctorsList(
        {
          page,
          limit,
          search: searchTerm,
          status: statusFilter,
          specialtyId: specialtyFilter,
          clinicId: clinicFilter,
          paymentStatus: paymentFilter,
        },
        { signal }
      );

      if (res && res.errCode === 0) {
        setDoctors(res.data.doctors || []);
        setPagination(res.data.pagination || { page: 1, limit: 15, totalCount: 0, totalPages: 1 });
        setSummaryKpis(res.data.summaryKpis || {});
        setActionAlerts(res.data.actionAlerts || {});
      } else {
        setError(res?.errMessage || 'Không thể tải danh sách bác sĩ');
      }
    } catch (err) {
      if (err.name !== 'CanceledError' && err.name !== 'AbortError') {
        setError('Lỗi kết nối máy chủ');
      }
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchTerm, statusFilter, specialtyFilter, clinicFilter, paymentFilter]);

  useEffect(() => {
    const controller = new AbortController();
    fetchDoctors(controller.signal);
    return () => controller.abort();
  }, [fetchDoctors]);

  // Click outside to close action dropdown
  useEffect(() => {
    const handleClickOutside = () => setActiveMenuDoctorId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  // Handle toggle doctor working status
  const handleToggleStatus = async (doctor) => {
    const nextStatus = doctor.workingStatus === 'active' ? 'paused' : 'active';
    try {
      const res = await updateDoctorWorkingStatus(doctor.id, { status: nextStatus });
      if (res && res.errCode === 0) {
        fetchDoctors();
      } else {
        alert(res?.errMessage || 'Không thể cập nhật trạng thái');
      }
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  return (
    <div className="doctor-master-container">
      {/* Header */}
      <header className="master-header">
        <div className="header-left">
          <div className="header-badge">
            <UserCheck size={13} strokeWidth={2.5} />
            <span>Doctor Operations & Workforce Management</span>
          </div>
          <h1 className="page-title">
            {language === 'vi' ? 'Quản lý & Điều hành Bác sĩ' : 'Doctor Operations Center'}
          </h1>
          <p className="page-subtitle">
            {language === 'vi'
              ? 'Trung tâm giám sát hồ sơ, lịch làm việc, hiệu suất ca khám, tỷ lệ hoa hồng và đối soát thanh toán'
              : 'Medical workforce oversight: profiles, schedules, clinical load, custom commissions and settlements'}
          </p>
        </div>

        <div className="header-actions">
          <button className="btn-sync" onClick={() => fetchDoctors()} title="Làm mới dữ liệu">
            <RotateCw size={14} className={loading ? 'fa-spin' : ''} />
            <span>{language === 'vi' ? 'Làm mới' : 'Refresh'}</span>
          </button>

          <Link to="/system/user-manage" className="btn-primary-action">
            <Plus size={14} />
            <span>{language === 'vi' ? 'Thêm bác sĩ' : 'Add Doctor'}</span>
          </Link>
        </div>
      </header>

      {/* Action Center Smart Alerts */}
      <div className="action-alerts-bar">
        <div className="alerts-title">
          <AlertTriangle size={15} />
          <span>{language === 'vi' ? 'Cần xử lý:' : 'Action Center:'}</span>
        </div>

        {actionAlerts.unpaidDoctorsCount > 0 && (
          <div
            className="alert-chip warning"
            onClick={() => { setPaymentFilter('pending'); setPage(1); }}
            title="Lọc các bác sĩ đang có số dư chờ thanh toán"
          >
            <CreditCard size={13} />
            <span>{actionAlerts.unpaidDoctorsCount} {language === 'vi' ? 'bác sĩ chờ thanh toán hoa hồng' : 'doctors pending payout'}</span>
          </div>
        )}

        {actionAlerts.noScheduleDoctorsCount > 0 && (
          <div
            className="alert-chip danger"
            onClick={() => { setStatusFilter('active'); setPage(1); }}
            title="Lọc bác sĩ đang active nhưng chưa mở lịch"
          >
            <Clock size={13} />
            <span>{actionAlerts.noScheduleDoctorsCount} {language === 'vi' ? 'bác sĩ chưa có lịch tuần tới' : 'active doctors with no slots'}</span>
          </div>
        )}

        {actionAlerts.highCancelDoctorsCount > 0 && (
          <div
            className="alert-chip info"
            onClick={() => { setStatusFilter('all'); setPage(1); }}
            title="Xem bác sĩ có tỷ lệ hủy lịch cao"
          >
            <AlertTriangle size={13} />
            <span>{actionAlerts.highCancelDoctorsCount} {language === 'vi' ? 'bác sĩ có tỷ lệ hủy ≥ 15%' : 'doctors with high cancel rate'}</span>
          </div>
        )}
      </div>

      {/* KPI Cards Strip */}
      <div className="master-kpi-strip">
        <div className="kpi-card">
          <div className="kpi-title">{language === 'vi' ? 'Tổng số bác sĩ' : 'Total Doctors'}</div>
          <div className="kpi-num">{summaryKpis.totalDoctors}</div>
          <div className="kpi-desc">{language === 'vi' ? 'Nhân sự y tế trên sàn' : 'Registered clinical staff'}</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-title">{language === 'vi' ? 'Đang nhận lịch (Active)' : 'Active Doctors'}</div>
          <div className="kpi-num" style={{ color: '#059669' }}>
            {summaryKpis.activeDoctors}
          </div>
          <div className="kpi-desc">{language === 'vi' ? 'Sẵn sàng tiếp nhận bệnh nhân' : 'Available for bookings'}</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-title">{language === 'vi' ? 'Tạm nghỉ nhận lịch' : 'Temporarily Paused'}</div>
          <div className="kpi-num" style={{ color: '#D97706' }}>
            {summaryKpis.pausedDoctors}
          </div>
          <div className="kpi-desc">{language === 'vi' ? 'Tạm ngưng đặt hẹn mới' : 'Not accepting appointments'}</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-title">{language === 'vi' ? 'Ngừng hợp tác' : 'Suspended'}</div>
          <div className="kpi-num" style={{ color: '#E11D48' }}>
            {summaryKpis.suspendedDoctors}
          </div>
          <div className="kpi-desc">{language === 'vi' ? 'Đã khóa nhận lịch' : 'Account deactivated'}</div>
        </div>

        <div className="kpi-card" style={{ background: '#FFFBEB', borderColor: '#FDE68A' }}>
          <div className="kpi-title" style={{ color: '#92400E' }}>
            {language === 'vi' ? 'Chờ thanh toán cho BS' : 'Pending Payouts'}
          </div>
          <div className="kpi-num" style={{ color: '#B45309', fontSize: '1.35rem' }}>
            {formatCurrencyVND(summaryKpis.totalPendingPayout)}
          </div>
          <div className="kpi-desc" style={{ color: '#A16207' }}>
            {summaryKpis.pendingPayoutDoctors} {language === 'vi' ? 'bác sĩ có số dư thực nhận' : 'doctors with balance'}
          </div>
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="master-filters-card">
        <div className="filter-row">
          <div className="search-wrapper">
            <Search size={15} className="search-icon" />
            <input
              type="text"
              placeholder={language === 'vi' ? 'Tìm theo tên, email, SĐT, mã bác sĩ, khoa, viện...' : 'Search by name, email, phone, code...'}
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
            />
          </div>

          <div className="filter-controls">
            {/* Status Filter */}
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="all">{language === 'vi' ? 'Tất cả trạng thái' : 'All Statuses'}</option>
              <option value="active">{language === 'vi' ? 'Đang hoạt động (Active)' : 'Active'}</option>
              <option value="paused">{language === 'vi' ? 'Tạm nghỉ (Paused)' : 'Paused'}</option>
              <option value="suspended">{language === 'vi' ? 'Ngừng hợp tác (Suspended)' : 'Suspended'}</option>
            </select>

            {/* Specialty Filter */}
            <select value={specialtyFilter} onChange={(e) => { setSpecialtyFilter(e.target.value); setPage(1); }}>
              <option value="all">{language === 'vi' ? 'Tất cả chuyên khoa' : 'All Specialties'}</option>
              {specialties.map((sp) => (
                <option key={sp.id} value={sp.id}>{sp.name}</option>
              ))}
            </select>

            {/* Clinic Filter */}
            <select value={clinicFilter} onChange={(e) => { setClinicFilter(e.target.value); setPage(1); }}>
              <option value="all">{language === 'vi' ? 'Tất cả cơ sở y tế' : 'All Clinics'}</option>
              {clinics.map((cl) => (
                <option key={cl.id} value={cl.id}>{cl.name}</option>
              ))}
            </select>

            {/* Payment Filter */}
            <select value={paymentFilter} onChange={(e) => { setPaymentFilter(e.target.value); setPage(1); }}>
              <option value="all">{language === 'vi' ? 'Tất cả tình trạng thanh toán' : 'All Payment States'}</option>
              <option value="pending">{language === 'vi' ? 'Chờ thanh toán (> 0đ)' : 'Pending Payout'}</option>
              <option value="paid">{language === 'vi' ? 'Đã quyết toán hết' : 'Settled'}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Doctor Table Card */}
      <div className="doctor-table-card">
        {error && (
          <div style={{ padding: 16, background: '#FEF2F2', color: '#B91C1C', fontSize: '0.84rem' }}>
            {error}
          </div>
        )}

        <div className="table-responsive">
          <table className="doctor-table">
            <thead>
              <tr>
                <th>Bác sĩ</th>
                <th>Chuyên khoa & Cơ sở</th>
                <th>Trạng thái</th>
                <th>Lịch tuần này</th>
                <th>Lượt khám</th>
                <th>Doanh thu gộp</th>
                <th>Hoa hồng</th>
                <th>Cần thanh toán</th>
                <th style={{ textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {doctors.map((doc) => {
                const isPaused = doc.workingStatus === 'paused';
                const isSuspended = doc.workingStatus === 'suspended';
                const statusClass = isSuspended ? 'suspended' : isPaused ? 'paused' : 'active';
                const statusText = isSuspended
                  ? (language === 'vi' ? 'Ngừng HĐ' : 'Suspended')
                  : isPaused
                    ? (language === 'vi' ? 'Tạm nghỉ' : 'Paused')
                    : (language === 'vi' ? 'Hoạt động' : 'Active');

                return (
                  <tr key={doc.id}>
                    {/* Doctor info */}
                    <td>
                      <div className="doc-cell">
                        {doc.avatar ? (
                          <img src={doc.avatar} alt={doc.doctorName} className="doc-avatar" />
                        ) : (
                          <div className="doc-avatar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#087F8C' }}>
                            {doc.firstName?.[0] || 'D'}
                          </div>
                        )}
                        <div className="doc-info">
                          <Link to={`/system/doctors/${doc.id}`} className="doc-name" style={{ textDecoration: 'none' }}>
                            {doc.doctorName}
                          </Link>
                          <div className="doc-sub">
                            {doc.doctorCode} • {doc.positionVi || doc.positionEn}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Specialty & Clinic */}
                    <td>
                      <div style={{ fontWeight: 600, color: '#0F172A' }}>{doc.specialtyName}</div>
                      <div style={{ fontSize: '0.74rem', color: '#64748B' }}>{doc.clinicName}</div>
                    </td>

                    {/* Status */}
                    <td>
                      <span className={`status-pill ${statusClass}`}>
                        ● {statusText}
                      </span>
                    </td>

                    {/* Weekly slots */}
                    <td>
                      <div>
                        <span className="capacity-bar">
                          <span
                            className="bar-inner"
                            style={{
                              width: `${doc.utilizationRate || 0}%`,
                              background: doc.utilizationRate > 80 ? '#059669' : doc.utilizationRate < 30 ? '#D97706' : '#087F8C',
                            }}
                          />
                        </span>
                        <span style={{ fontWeight: 600 }}>{doc.weeklySlots} slot</span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                        {doc.occupiedSlots} ca đặt ({doc.utilizationRate}%)
                      </div>
                    </td>

                    {/* Completed Bookings */}
                    <td>
                      <span style={{ fontWeight: 700, color: '#059669' }}>
                        {doc.completedBookings} ca
                      </span>
                      {doc.cancelledBookings > 0 && (
                        <div style={{ fontSize: '0.72rem', color: '#E11D48' }}>
                          {doc.cancelledBookings} ca hủy ({doc.cancellationRate}%)
                        </div>
                      )}
                    </td>

                    {/* Gross Revenue */}
                    <td style={{ fontWeight: 600 }}>
                      {formatCurrencyVND(doc.grossRevenue)}
                    </td>

                    {/* Commission Rate */}
                    <td>
                      <span style={{ background: '#F1F5F9', padding: '2px 6px', borderRadius: 4, fontWeight: 700, fontSize: '0.78rem' }}>
                        {doc.commissionRate}%
                      </span>
                    </td>

                    {/* Pending Payout */}
                    <td>
                      <span style={{ fontWeight: 800, color: doc.pendingPayout > 0 ? '#B45309' : '#64748B' }}>
                        {formatCurrencyVND(doc.pendingPayout)}
                      </span>
                    </td>

                    {/* Action Menu */}
                    <td style={{ textAlign: 'center' }}>
                      <div className="action-menu-wrapper" onClick={(e) => e.stopPropagation()}>
                        <button
                          className="btn-more"
                          onClick={() => setActiveMenuDoctorId(activeMenuDoctorId === doc.id ? null : doc.id)}
                          title="Tùy chọn thao tác"
                        >
                          <MoreVertical size={16} />
                        </button>

                        {activeMenuDoctorId === doc.id && (
                          <div className="dropdown-menu">
                            <Link to={`/system/doctors/${doc.id}`} className="dropdown-item">
                              <Eye size={13} style={{ color: '#087F8C' }} />
                              <span>{language === 'vi' ? 'Xem hồ sơ vận hành' : 'View Workspace'}</span>
                            </Link>

                            <Link to={`/system/doctors/${doc.id}?tab=schedule`} className="dropdown-item">
                              <Calendar size={13} style={{ color: '#3B82F6' }} />
                              <span>{language === 'vi' ? 'Quản lý lịch khám' : 'Manage Schedule'}</span>
                            </Link>

                            <button
                              type="button"
                              className="dropdown-item"
                              onClick={() => { setSelectedPayoutDoc(doc); setActiveMenuDoctorId(null); }}
                            >
                              <CreditCard size={13} style={{ color: '#059669' }} />
                              <span>{language === 'vi' ? 'Thanh toán cho BS' : 'Payout Settlement'}</span>
                            </button>

                            <button
                              type="button"
                              className="dropdown-item"
                              onClick={() => { setSelectedCommissionDoc(doc); setActiveMenuDoctorId(null); }}
                            >
                              <Percent size={13} style={{ color: '#F59E0B' }} />
                              <span>{language === 'vi' ? 'Cấu hình hoa hồng' : 'Config Commission'}</span>
                            </button>

                            <div className="dropdown-divider" />

                            <button
                              type="button"
                              className="dropdown-item"
                              onClick={() => { handleToggleStatus(doc); setActiveMenuDoctorId(null); }}
                            >
                              {doc.workingStatus === 'active' ? (
                                <>
                                  <PauseCircle size={13} style={{ color: '#D97706' }} />
                                  <span>{language === 'vi' ? 'Tạm ngưng nhận lịch' : 'Pause Bookings'}</span>
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 size={13} style={{ color: '#059669' }} />
                                  <span>{language === 'vi' ? 'Kích hoạt nhận lịch' : 'Activate Bookings'}</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="table-pagination">
          <div>
            {language === 'vi'
              ? `Hiển thị ${doctors.length} trên tổng số ${pagination.totalCount} bác sĩ (Trang ${pagination.page}/${pagination.totalPages})`
              : `Showing ${doctors.length} of ${pagination.totalCount} doctors (Page ${pagination.page}/${pagination.totalPages})`}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn-page"
              disabled={pagination.page <= 1}
              onClick={() => setPage(page - 1)}
            >
              {language === 'vi' ? '← Trang trước' : '← Previous'}
            </button>
            <button
              className="btn-page"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPage(page + 1)}
            >
              {language === 'vi' ? 'Trang sau →' : 'Next →'}
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {selectedCommissionDoc && (
        <CommissionModal
          isOpen={Boolean(selectedCommissionDoc)}
          doctor={selectedCommissionDoc}
          onClose={() => setSelectedCommissionDoc(null)}
          onSuccess={() => { fetchDoctors(); setSelectedCommissionDoc(null); }}
        />
      )}

      {selectedPayoutDoc && (
        <DoctorPayoutModal
          isOpen={Boolean(selectedPayoutDoc)}
          doctor={selectedPayoutDoc}
          onClose={() => setSelectedPayoutDoc(null)}
          onSuccess={() => { fetchDoctors(); setSelectedPayoutDoc(null); }}
        />
      )}
    </div>
  );
};

export default DoctorMaster;
