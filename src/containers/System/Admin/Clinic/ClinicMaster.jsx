// src/containers/System/Admin/Clinic/ClinicMaster.jsx
// Healthcare Facility & Clinic Operations Center (Master Page)
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Building2,
  Search,
  RotateCw,
  Plus,
  MoreVertical,
  Eye,
  Users,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  PauseCircle,
  Percent,
  MapPin,
  Phone,
  Pencil,
} from 'lucide-react';
import {
  getAdminClinicsList,
  updateClinicWorkingStatus,
  updateClinicCommission,
} from '../../../../services/clinicManageService';
import AssignDoctorModal from './AssignDoctorModal';
import AddClinicModal from './AddClinicModal';
import EditClinicModal from './EditClinicModal';
import CommonUtils from '../../../../utils/CommonUtils';
import '../MedicalOperations.scss';

const formatCurrencyVND = (amount) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
};

const ClinicMaster = () => {
  const language = useSelector((state) => state.app.language) || 'vi';
  const navigate = useNavigate();

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [limit] = useState(15);

  // Data state
  const [clinics, setClinics] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, totalCount: 0, totalPages: 1 });
  const [summaryKpis, setSummaryKpis] = useState({
    totalClinics: 0,
    activeClinics: 0,
    pausedClinics: 0,
    totalAssignedDoctors: 0,
    avgUtilizationRate: 0,
    totalGrossRevenue: 0,
  });
  const [actionAlerts, setActionAlerts] = useState({
    understaffedCount: 0,
    lowCapacityCount: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Dropdown menu & Modals
  const [activeMenuClinicId, setActiveMenuClinicId] = useState(null);
  const [selectedAssignClinic, setSelectedAssignClinic] = useState(null);
  const [showAddClinicModal, setShowAddClinicModal] = useState(false);
  const [editingClinic, setEditingClinic] = useState(null);

  // Fetch clinics
  const fetchClinics = useCallback(async (signal) => {
    setLoading(true);
    setError('');
    try {
      const res = await getAdminClinicsList(
        {
          page,
          limit,
          search: searchTerm,
          status: statusFilter,
        },
        { signal }
      );
      if (res && res.errCode === 0) {
        setClinics(res.data?.clinics || []);
        setPagination(res.data?.pagination || { page: 1, limit: 15, totalCount: 0, totalPages: 1 });
        setSummaryKpis(res.data?.summaryKpis || {});
        setActionAlerts(res.data?.actionAlerts || {});
      } else {
        setError(res?.errMessage || 'Không thể tải danh sách cơ sở y tế');
      }
    } catch (err) {
      if (err.name !== 'CanceledError' && err.name !== 'AbortError') {
        setError('Lỗi kết nối máy chủ');
      }
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchTerm, statusFilter]);

  useEffect(() => {
    const controller = new AbortController();
    fetchClinics(controller.signal);
    return () => controller.abort();
  }, [fetchClinics]);

  // Click outside listener for dropdown action menu
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target) return;
      if (typeof e.target.closest === 'function' && e.target.closest('.action-menu-wrapper')) return;
      setActiveMenuClinicId(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Toggle clinic working status
  const handleToggleStatus = async (clinic) => {
    const nextStatus = clinic.status === 'active' ? 'paused' : 'active';
    try {
      const res = await updateClinicWorkingStatus(clinic.id, { status: nextStatus });
      if (res && res.errCode === 0) {
        fetchClinics();
      } else {
        alert(res?.errMessage || 'Không thể cập nhật trạng thái cơ sở');
      }
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  // Quick commission update
  const handleUpdateCommission = async (clinic) => {
    const currentRate = clinic.commissionRate || 15;
    const input = window.prompt(
      `Điều chỉnh tỷ lệ chiết khấu sàn cho [${clinic.name}] (%):`,
      currentRate
    );
    if (input === null) return;
    const newRate = parseFloat(input);
    if (isNaN(newRate) || newRate < 0 || newRate > 100) {
      alert('Tỷ lệ hoa hồng không hợp lệ (0 - 100%)');
      return;
    }
    try {
      const res = await updateClinicCommission(clinic.id, { commissionRate: newRate });
      if (res && res.errCode === 0) {
        fetchClinics();
      } else {
        alert(res?.errMessage || 'Cập nhật hoa hồng thất bại');
      }
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  return (
    <div className="medical-operations-container">
      {/* Header */}
      <header className="master-header">
        <div className="header-left">
          <div className="header-badge">
            <Building2 size={13} strokeWidth={2.5} />
            <span>Clinic Operations & Healthcare Facility Management</span>
          </div>
          <h1 className="page-title">
            {language === 'vi' ? 'Quản lý & Điều hành Cơ sở Y tế' : 'Clinic Operations Center'}
          </h1>
          <p className="page-subtitle">
            {language === 'vi'
              ? 'Trung tâm giám sát hạ tầng phòng khám, đội ngũ y bác sĩ, công suất slot lịch và hiệu suất doanh thu cơ sở'
              : 'Enterprise facility governance: medical staff, weekly slot capacity, bookings and institutional revenue'}
          </p>
        </div>

        <div className="header-actions">
          <button className="btn-sync" onClick={() => fetchClinics()} title="Làm mới dữ liệu">
            <RotateCw size={14} className={loading ? 'fa-spin' : ''} />
            <span>{language === 'vi' ? 'Làm mới' : 'Refresh'}</span>
          </button>

          <button
            className="btn-primary-action"
            onClick={() => setShowAddClinicModal(true)}
          >
            <Plus size={14} />
            <span>{language === 'vi' ? 'Thêm cơ sở' : 'Add Facility'}</span>
          </button>
        </div>
      </header>

      {/* Action Center Alerts */}
      <div className="action-alerts-bar">
        <div className="alerts-title">
          <AlertTriangle size={15} />
          <span>{language === 'vi' ? 'Cảnh báo vận hành:' : 'Operational Alerts:'}</span>
        </div>

        {actionAlerts.understaffedCount > 0 && (
          <div
            className="alert-chip warning"
            onClick={() => { setStatusFilter('active'); setPage(1); }}
            title="Lọc các cơ sở có ít hơn 2 bác sĩ thường trực"
          >
            <Users size={13} />
            <span>{actionAlerts.understaffedCount} {language === 'vi' ? 'cơ sở đang thiếu nhân lực bác sĩ' : 'understaffed facilities'}</span>
          </div>
        )}

        {actionAlerts.lowCapacityCount > 0 && (
          <div
            className="alert-chip danger"
            onClick={() => { setStatusFilter('active'); setPage(1); }}
            title="Lọc các cơ sở có dưới 10 slot lịch trong tuần"
          >
            <Calendar size={13} />
            <span>{actionAlerts.lowCapacityCount} {language === 'vi' ? 'cơ sở chưa đủ lịch mở tuần này' : 'facilities with low slot capacity'}</span>
          </div>
        )}
      </div>

      {/* Master KPI Strip */}
      <div className="master-kpi-strip">
        <div className="kpi-card">
          <div className="kpi-title">{language === 'vi' ? 'Tổng số cơ sở' : 'Total Facilities'}</div>
          <div className="kpi-num">{summaryKpis.totalClinics}</div>
          <div className="kpi-desc">{language === 'vi' ? 'Bệnh viện & Phòng khám đối tác' : 'Partner hospitals & clinics'}</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-title">{language === 'vi' ? 'Đang hoạt động' : 'Active Facilities'}</div>
          <div className="kpi-num" style={{ color: '#059669' }}>
            {summaryKpis.activeClinics}
          </div>
          <div className="kpi-desc">{language === 'vi' ? 'Tiếp nhận đặt lịch bình thường' : 'Open for patient bookings'}</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-title">{language === 'vi' ? 'Bác sĩ trực thuộc' : 'Assigned Doctors'}</div>
          <div className="kpi-num" style={{ color: '#087F8C' }}>
            {summaryKpis.totalAssignedDoctors}
          </div>
          <div className="kpi-desc">{language === 'vi' ? 'Y bác sĩ đang công tác' : 'Physicians in network'}</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-title">{language === 'vi' ? 'Lấp đầy trung bình' : 'Avg Utilization'}</div>
          <div className="kpi-num" style={{ color: '#2563EB' }}>
            {summaryKpis.avgUtilizationRate}%
          </div>
          <div className="kpi-desc">{language === 'vi' ? 'Tỷ lệ khai thác slot lịch tuần' : 'Slot fill rate across facilities'}</div>
        </div>

        <div className="kpi-card highlight">
          <div className="kpi-title">{language === 'vi' ? 'Doanh thu toàn mạng lưới' : 'Network Gross Revenue'}</div>
          <div className="kpi-num">
            {formatCurrencyVND(summaryKpis.totalGrossRevenue)}
          </div>
          <div className="kpi-desc">{language === 'vi' ? 'Tổng giá trị ca khám hoàn tất' : 'Gross booking volume'}</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="filter-card">
        <div className="filter-row">
          <div className="search-box">
            <Search size={15} className="search-icon" />
            <input
              type="text"
              placeholder={language === 'vi' ? 'Tìm theo tên cơ sở, địa chỉ bệnh viện...' : 'Search facility name, address...'}
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
            />
          </div>

          <div className="filter-controls">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            >
              <option value="all">{language === 'vi' ? 'Tất cả trạng thái' : 'All Statuses'}</option>
              <option value="active">{language === 'vi' ? '● Đang hoạt động' : '● Active'}</option>
              <option value="paused">{language === 'vi' ? '● Tạm ngưng' : '● Paused'}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Master Table */}
      <div className="master-table-card">
        {error && (
          <div style={{ padding: 14, background: '#FEF2F2', color: '#B91C1C', fontSize: '0.82rem' }}>
            {error}
          </div>
        )}

        <div className="table-responsive">
          <table className="operations-table">
            <thead>
              <tr>
                <th>{language === 'vi' ? 'Cơ sở Y tế' : 'Healthcare Facility'}</th>
                <th>{language === 'vi' ? 'Đội ngũ Bác sĩ' : 'Doctor Staff'}</th>
                <th>{language === 'vi' ? 'Chuyên khoa thế mạnh' : 'Specialties'}</th>
                <th>{language === 'vi' ? 'Công suất tuần này' : 'Weekly Capacity'}</th>
                <th>{language === 'vi' ? 'Doanh thu gộp' : 'Gross Revenue'}</th>
                <th>{language === 'vi' ? 'Hoa hồng sàn' : 'Commission'}</th>
                <th>{language === 'vi' ? 'Trạng thái' : 'Status'}</th>
                <th style={{ textAlign: 'center' }}>{language === 'vi' ? 'Thao tác' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {clinics.length === 0 && !loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px 0', color: '#94A3B8' }}>
                    {language === 'vi' ? 'Không tìm thấy cơ sở y tế phù hợp' : 'No facilities found'}
                  </td>
                </tr>
              ) : (
                clinics.map((clinic) => {
                  const statusClass = clinic.status === 'active' ? 'optimal' : 'paused';
                  const statusText = clinic.status === 'active' ? (language === 'vi' ? 'Hoạt động' : 'Active') : (language === 'vi' ? 'Tạm ngưng' : 'Paused');

                  return (
                    <tr key={clinic.id}>
                      {/* Clinic name & logo */}
                      <td>
                        <div className="entity-cell">
                          {clinic.image ? (
                            <img
                              src={CommonUtils.decodeBase64Image(clinic.image)}
                              alt={clinic.name}
                              className="entity-avatar"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div
                            className="fallback-avatar"
                            style={{ display: clinic.image ? 'none' : 'flex' }}
                          >
                            {clinic.name?.[0] || 'C'}
                          </div>

                          <div className="entity-info">
                            <Link to={`/system/clinics/${clinic.id}`} className="entity-name">
                              {clinic.name}
                            </Link>
                            <div className="entity-sub">
                              <MapPin size={11} style={{ display: 'inline', marginRight: 3 }} />
                              {clinic.address}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Doctors staff */}
                      <td>
                        <div className="avatar-stack">
                          {clinic.doctorAvatars && clinic.doctorAvatars.length > 0 ? (
                            clinic.doctorAvatars.map((doc, idx) => (
                              <img
                                key={idx}
                                src={CommonUtils.decodeBase64Image(doc.avatar)}
                                alt={doc.name}
                                title={doc.name}
                                className="stack-img"
                                onError={(e) => { e.target.style.display = 'none'; }}
                              />
                            ))
                          ) : null}
                          <span className="stack-count">
                            {clinic.totalDoctors} {language === 'vi' ? 'bác sĩ' : 'doctors'}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: 2 }}>
                          {clinic.activeDoctors} {language === 'vi' ? 'đang mở lịch' : 'active'}
                        </div>
                      </td>

                      {/* Specialties */}
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxWidth: 220 }}>
                          {clinic.specialties && clinic.specialties.length > 0 ? (
                            clinic.specialties.slice(0, 3).map((sp, idx) => (
                              <span
                                key={idx}
                                style={{
                                  background: '#F1F5F9',
                                  color: '#334155',
                                  padding: '2px 6px',
                                  borderRadius: 4,
                                  fontSize: '0.73rem',
                                  fontWeight: 500,
                                }}
                              >
                                {sp}
                              </span>
                            ))
                          ) : (
                            <span style={{ fontSize: '0.74rem', color: '#94A3B8' }}>Đa khoa</span>
                          )}
                          {clinic.specialties && clinic.specialties.length > 3 && (
                            <span style={{ fontSize: '0.73rem', color: '#087F8C', fontWeight: 600 }}>
                              +{clinic.specialties.length - 3}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Capacity */}
                      <td>
                        <div>
                          <span className="capacity-bar">
                            <span
                              className="bar-inner"
                              style={{
                                width: `${clinic.utilizationRate || 0}%`,
                                background: clinic.utilizationRate > 75 ? '#059669' : clinic.utilizationRate < 30 ? '#D97706' : '#087F8C',
                              }}
                            />
                          </span>
                          <span style={{ fontWeight: 600 }}>{clinic.weeklySlots} slot</span>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                          {clinic.occupiedSlots} {language === 'vi' ? 'lượt đặt' : 'booked'} ({clinic.utilizationRate}%)
                        </div>
                      </td>

                      {/* Gross Revenue */}
                      <td style={{ fontWeight: 600 }}>
                        {formatCurrencyVND(clinic.grossRevenue)}
                        <div style={{ fontSize: '0.72rem', color: '#059669' }}>
                          {clinic.completedBookings} {language === 'vi' ? 'ca hoàn tất' : 'completed'}
                        </div>
                      </td>

                      {/* Commission */}
                      <td>
                        <span style={{ background: '#F1F5F9', padding: '2px 6px', borderRadius: 4, fontWeight: 700, fontSize: '0.78rem' }}>
                          {clinic.commissionRate}%
                        </span>
                      </td>

                      {/* Status */}
                      <td>
                        <span className={`status-pill ${statusClass}`}>
                          ● {statusText}
                        </span>
                      </td>

                      {/* Action Menu */}
                      <td style={{ textAlign: 'center' }}>
                        <div className="action-menu-wrapper">
                          <button
                            type="button"
                            className="btn-more"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuClinicId((prev) => (prev === clinic.id ? null : clinic.id));
                            }}
                            title="Tùy chọn thao tác"
                          >
                            <MoreVertical size={16} />
                          </button>

                          {activeMenuClinicId === clinic.id && (
                            <div className="action-dropdown-menu dropdown-menu show" onClick={(e) => e.stopPropagation()}>
                              <Link to={`/system/clinics/${clinic.id}`} className="action-dropdown-item dropdown-item">
                                <Eye size={13} style={{ color: '#087F8C' }} />
                                <span>{language === 'vi' ? 'Xem Control Center' : 'View Control Center'}</span>
                              </Link>

                              <Link to={`/system/clinics/${clinic.id}?tab=doctors`} className="action-dropdown-item dropdown-item">
                                <Users size={13} style={{ color: '#3B82F6' }} />
                                <span>{language === 'vi' ? 'Đội ngũ bác sĩ' : 'Doctor Staff'}</span>
                              </Link>

                              <Link to={`/system/clinics/${clinic.id}?tab=schedule`} className="action-dropdown-item dropdown-item">
                                <Calendar size={13} style={{ color: '#059669' }} />
                                <span>{language === 'vi' ? 'Ma trận lịch khám' : 'Weekly Schedule'}</span>
                              </Link>

                              <button
                                type="button"
                                className="action-dropdown-item dropdown-item"
                                onClick={() => { setSelectedAssignClinic(clinic); setActiveMenuClinicId(null); }}
                              >
                                <Users size={13} style={{ color: '#8B5CF6' }} />
                                <span>{language === 'vi' ? 'Gán thêm bác sĩ' : 'Assign Doctor'}</span>
                              </button>

                              <button
                                type="button"
                                className="action-dropdown-item dropdown-item"
                                onClick={() => { handleUpdateCommission(clinic); setActiveMenuClinicId(null); }}
                              >
                                <Percent size={13} style={{ color: '#F59E0B' }} />
                                <span>{language === 'vi' ? 'Cấu hình hoa hồng viện' : 'Config Commission'}</span>
                              </button>

                              <button
                                type="button"
                                className="action-dropdown-item dropdown-item"
                                onClick={() => { setEditingClinic(clinic); setActiveMenuClinicId(null); }}
                              >
                                <Pencil size={13} style={{ color: '#087F8C' }} />
                                <span>{language === 'vi' ? 'Chỉnh sửa hồ sơ' : 'Edit Profile'}</span>
                              </button>

                              <div className="dropdown-divider" />

                              <button
                                type="button"
                                className="action-dropdown-item dropdown-item"
                                onClick={() => { handleToggleStatus(clinic); setActiveMenuClinicId(null); }}
                              >
                                {clinic.status === 'active' ? (
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
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="table-pagination">
          <div>
            {language === 'vi' ? 'Hiển thị' : 'Showing'} {clinics.length} / {pagination.totalCount} {language === 'vi' ? 'cơ sở y tế' : 'facilities'}
          </div>
          <div className="page-btns">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              &lt;
            </button>
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((pNum) => (
              <button
                key={pNum}
                className={pNum === page ? 'active' : ''}
                onClick={() => setPage(pNum)}
              >
                {pNum}
              </button>
            ))}
            <button
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
            >
              &gt;
            </button>
          </div>
        </div>
      </div>

      {/* Assign Doctor Modal */}
      {selectedAssignClinic && (
        <AssignDoctorModal
          isOpen={Boolean(selectedAssignClinic)}
          clinic={selectedAssignClinic}
          onClose={() => setSelectedAssignClinic(null)}
          onSuccess={() => fetchClinics()}
        />
      )}

      {/* Add Clinic Modal */}
      <AddClinicModal
        isOpen={showAddClinicModal}
        onClose={() => setShowAddClinicModal(false)}
        onSuccess={() => fetchClinics()}
      />

      {/* Edit Clinic Modal */}
      <EditClinicModal
        isOpen={!!editingClinic}
        onClose={() => setEditingClinic(null)}
        clinic={editingClinic}
        onSuccess={() => fetchClinics()}
      />
    </div>
  );
};

export default ClinicMaster;
