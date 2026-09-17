// src/containers/System/Admin/Specialty/SpecialtyMaster.jsx
// Medical Disciplines & Clinical Specialization Center (Master Page)
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Layers,
  Search,
  RotateCw,
  Plus,
  MoreVertical,
  Eye,
  Users,
  Building2,
  AlertTriangle,
  CheckCircle2,
  PauseCircle,
  TrendingUp,
  Pencil,
} from 'lucide-react';
import {
  getAdminSpecialtiesList,
  updateSpecialtyWorkingStatus,
} from '../../../../services/specialtyManageService';
import CommonUtils from '../../../../utils/CommonUtils';
import AddSpecialtyModal from './AddSpecialtyModal';
import EditSpecialtyModal from './EditSpecialtyModal';
import '../MedicalOperations.scss';

const formatCurrencyVND = (amount) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
};

const SpecialtyMaster = () => {
  const language = useSelector((state) => state.app.language) || 'vi';
  const navigate = useNavigate();

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [limit] = useState(15);

  // Data state
  const [specialties, setSpecialties] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, totalCount: 0, totalPages: 1 });
  const [summaryKpis, setSummaryKpis] = useState({
    totalSpecialties: 0,
    activeSpecialties: 0,
    totalSpecialists: 0,
    totalHospitalsCovered: 0,
    totalRevenue: 0,
  });
  const [actionAlerts, setActionAlerts] = useState({
    shortageCount: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeMenuSpecialtyId, setActiveMenuSpecialtyId] = useState(null);
  const [showAddSpecialtyModal, setShowAddSpecialtyModal] = useState(false);
  const [editingSpecialty, setEditingSpecialty] = useState(null);

  const fetchSpecialties = useCallback(async (signal) => {
    setLoading(true);
    setError('');
    try {
      const res = await getAdminSpecialtiesList(
        {
          page,
          limit,
          search: searchTerm,
          status: statusFilter,
        },
        { signal }
      );
      if (res && res.errCode === 0) {
        setSpecialties(res.data?.specialties || []);
        setPagination(res.data?.pagination || { page: 1, limit: 15, totalCount: 0, totalPages: 1 });
        setSummaryKpis(res.data?.summaryKpis || {});
        setActionAlerts(res.data?.actionAlerts || {});
      } else {
        setError(res?.errMessage || 'Không thể tải danh sách chuyên khoa');
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
    fetchSpecialties(controller.signal);
    return () => controller.abort();
  }, [fetchSpecialties]);

  // Click outside listener for dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target) return;
      if (typeof e.target.closest === 'function' && e.target.closest('.action-menu-wrapper')) return;
      setActiveMenuSpecialtyId(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleStatus = async (sp) => {
    const nextStatus = sp.status === 'active' ? 'paused' : 'active';
    try {
      const res = await updateSpecialtyWorkingStatus(sp.id, { status: nextStatus });
      if (res && res.errCode === 0) {
        fetchSpecialties();
      } else {
        alert(res?.errMessage || 'Không thể cập nhật trạng thái chuyên khoa');
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
            <Layers size={13} strokeWidth={2.5} />
            <span>Medical Disciplines & Clinical Specialization</span>
          </div>
          <h1 className="page-title">
            {language === 'vi' ? 'Quản lý & Điều hành Chuyên khoa' : 'Specialty Intelligence Center'}
          </h1>
          <p className="page-subtitle">
            {language === 'vi'
              ? 'Trung tâm giám sát danh mục chuyên môn, lực lượng bác sĩ chuyên khoa, độ phủ cơ sở và cân bằng Cung - Cầu'
              : 'Medical discipline oversight: specialist capacity, hospital coverage, market demand balance and clinical output'}
          </p>
        </div>

        <div className="header-actions">
          <button className="btn-sync" onClick={() => fetchSpecialties()} title="Làm mới dữ liệu">
            <RotateCw size={14} className={loading ? 'fa-spin' : ''} />
            <span>{language === 'vi' ? 'Làm mới' : 'Refresh'}</span>
          </button>

          <button
            className="btn-primary-action"
            onClick={() => setShowAddSpecialtyModal(true)}
          >
            <Plus size={14} />
            <span>{language === 'vi' ? 'Thêm chuyên khoa' : 'Add Specialty'}</span>
          </button>
        </div>
      </header>

      {/* Action Alerts */}
      <div className="action-alerts-bar">
        <div className="alerts-title">
          <AlertTriangle size={15} />
          <span>{language === 'vi' ? 'Chỉ số Cân bằng Thị trường:' : 'Market Demand Alerts:'}</span>
        </div>

        {actionAlerts.shortageCount > 0 && (
          <div
            className="alert-chip danger"
            onClick={() => { setStatusFilter('active'); setPage(1); }}
            title="Lọc các chuyên khoa nhu cầu cao nhưng thiếu bác sĩ"
          >
            <AlertTriangle size={13} />
            <span>{actionAlerts.shortageCount} {language === 'vi' ? 'chuyên khoa đang thiếu bác sĩ tiếp nhận' : 'specialties facing specialist shortage'}</span>
          </div>
        )}

        <div className="alert-chip info" title="Độ phủ các cơ sở y tế">
          <Building2 size={13} />
          <span>{summaryKpis.totalHospitalsCovered} {language === 'vi' ? 'bệnh viện & phòng khám trong mạng lưới' : 'facilities in network'}</span>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="master-kpi-strip">
        <div className="kpi-card">
          <div className="kpi-title">{language === 'vi' ? 'Tổng số chuyên khoa' : 'Total Specialties'}</div>
          <div className="kpi-num">{summaryKpis.totalSpecialties}</div>
          <div className="kpi-desc">{language === 'vi' ? 'Danh mục y khoa chuẩn' : 'Registered medical disciplines'}</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-title">{language === 'vi' ? 'Đang mở tiếp nhận' : 'Active Disciplines'}</div>
          <div className="kpi-num" style={{ color: '#059669' }}>
            {summaryKpis.activeSpecialties}
          </div>
          <div className="kpi-desc">{language === 'vi' ? 'Sẵn sàng phục vụ khám' : 'Available for booking'}</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-title">{language === 'vi' ? 'Bác sĩ chuyên khoa' : 'Total Specialists'}</div>
          <div className="kpi-num" style={{ color: '#087F8C' }}>
            {summaryKpis.totalSpecialists}
          </div>
          <div className="kpi-desc">{language === 'vi' ? 'Bác sĩ trực thuộc các khoa' : 'Practicing specialists'}</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-title">{language === 'vi' ? 'Cơ sở triển khai' : 'Hospital Coverage'}</div>
          <div className="kpi-num" style={{ color: '#2563EB' }}>
            {summaryKpis.totalHospitalsCovered}
          </div>
          <div className="kpi-desc">{language === 'vi' ? 'Viện & phòng khám có khoa' : 'Hospitals offering care'}</div>
        </div>

        <div className="kpi-card highlight">
          <div className="kpi-title">{language === 'vi' ? 'Doanh thu toàn chuyên khoa' : 'Specialty Gross Revenue'}</div>
          <div className="kpi-num">
            {formatCurrencyVND(summaryKpis.totalRevenue)}
          </div>
          <div className="kpi-desc">{language === 'vi' ? 'Tổng giá trị khám hoàn tất' : 'Gross booking volume'}</div>
        </div>
      </div>

      {/* Filter Card */}
      <div className="filter-card">
        <div className="filter-row">
          <div className="search-box">
            <Search size={15} className="search-icon" />
            <input
              type="text"
              placeholder={language === 'vi' ? 'Tìm theo tên chuyên khoa (Tim mạch, Cơ xương khớp, Nhi khoa...)' : 'Search specialty name...'}
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
                <th>{language === 'vi' ? 'Chuyên khoa' : 'Medical Discipline'}</th>
                <th>{language === 'vi' ? 'Mạng lưới cơ sở' : 'Hospitals'}</th>
                <th>{language === 'vi' ? 'Bác sĩ phụ trách' : 'Specialists'}</th>
                <th>{language === 'vi' ? 'Cân bằng Cung - Cầu' : 'Supply / Demand Health'}</th>
                <th>{language === 'vi' ? 'Lượt khám hoàn tất' : 'Completed Bookings'}</th>
                <th>{language === 'vi' ? 'Doanh thu gộp' : 'Gross Revenue'}</th>
                <th>{language === 'vi' ? 'Trạng thái' : 'Status'}</th>
                <th style={{ textAlign: 'center' }}>{language === 'vi' ? 'Thao tác' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {specialties.length === 0 && !loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px 0', color: '#94A3B8' }}>
                    {language === 'vi' ? 'Không tìm thấy chuyên khoa phù hợp' : 'No specialties found'}
                  </td>
                </tr>
              ) : (
                specialties.map((sp) => {
                  let healthClass = 'optimal';
                  let healthText = language === 'vi' ? 'Cân bằng Cung - Cầu' : 'Balanced';
                  if (sp.healthBalance === 'shortage') {
                    healthClass = 'understaffed';
                    healthText = language === 'vi' ? 'Thiếu Bác sĩ' : 'Doctor Shortage';
                  } else if (sp.healthBalance === 'low_demand') {
                    healthClass = 'high_load';
                    healthText = language === 'vi' ? 'Dư thừa Năng lực' : 'Surplus Capacity';
                  } else if (sp.healthBalance === 'inactive') {
                    healthClass = 'paused';
                    healthText = language === 'vi' ? 'Tạm đóng' : 'Inactive';
                  }

                  return (
                    <tr key={sp.id}>
                      {/* Name & Icon */}
                      <td>
                        <div className="entity-cell">
                          {sp.image ? (
                            <img
                              src={CommonUtils.decodeBase64Image(sp.image)}
                              alt={sp.name}
                              className="entity-avatar"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div
                            className="fallback-avatar"
                            style={{ display: sp.image ? 'none' : 'flex' }}
                          >
                            {sp.name?.[0] || 'S'}
                          </div>

                          <div className="entity-info">
                            <Link to={`/system/specialties/${sp.id}`} className="entity-name">
                              {sp.name}
                            </Link>
                            <div className="entity-sub">
                              Mã danh mục: SPC{String(sp.id).padStart(4, '0')}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Hospitals Coverage */}
                      <td>
                        <div style={{ fontWeight: 600, color: '#0F172A' }}>
                          {sp.totalClinics} {language === 'vi' ? 'cơ sở tiếp nhận' : 'facilities'}
                        </div>
                        <div style={{ fontSize: '0.73rem', color: '#64748B', maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {sp.clinics?.slice(0, 2).join(', ') || 'Chưa phân bổ viện'}
                        </div>
                      </td>

                      {/* Specialists */}
                      <td>
                        <div className="avatar-stack">
                          {sp.doctorAvatars && sp.doctorAvatars.length > 0 ? (
                            sp.doctorAvatars.map((doc, idx) => (
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
                            {sp.totalDoctors} {language === 'vi' ? 'bác sĩ' : 'doctors'}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: 2 }}>
                          {sp.activeDoctors} {language === 'vi' ? 'đang nhận lịch' : 'active'}
                        </div>
                      </td>

                      {/* Health / Demand balance */}
                      <td>
                        <span className={`status-pill ${healthClass}`}>
                          ● {healthText}
                        </span>
                      </td>

                      {/* Completed bookings */}
                      <td>
                        <span style={{ fontWeight: 700, color: '#059669' }}>
                          {sp.completedBookings} {language === 'vi' ? 'ca' : 'cases'}
                        </span>
                      </td>

                      {/* Revenue */}
                      <td style={{ fontWeight: 600 }}>
                        {formatCurrencyVND(sp.grossRevenue)}
                      </td>

                      {/* Status */}
                      <td>
                        <span className={`status-pill ${sp.status === 'active' ? 'optimal' : 'paused'}`}>
                          ● {sp.status === 'active' ? (language === 'vi' ? 'Hoạt động' : 'Active') : (language === 'vi' ? 'Tạm ngưng' : 'Paused')}
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
                              setActiveMenuSpecialtyId((prev) => (prev === sp.id ? null : sp.id));
                            }}
                            title="Tùy chọn thao tác"
                          >
                            <MoreVertical size={16} />
                          </button>

                          {activeMenuSpecialtyId === sp.id && (
                            <div className="action-dropdown-menu dropdown-menu show" onClick={(e) => e.stopPropagation()}>
                              <Link to={`/system/specialties/${sp.id}`} className="action-dropdown-item dropdown-item">
                                <Eye size={13} style={{ color: '#087F8C' }} />
                                <span>{language === 'vi' ? 'Xem Intelligence Hub' : 'View Intelligence Hub'}</span>
                              </Link>

                              <Link to={`/system/specialties/${sp.id}?tab=doctors`} className="action-dropdown-item dropdown-item">
                                <Users size={13} style={{ color: '#3B82F6' }} />
                                <span>{language === 'vi' ? 'Bác sĩ chuyên khoa' : 'Specialists List'}</span>
                              </Link>

                              <Link to={`/system/specialties/${sp.id}?tab=clinics`} className="action-dropdown-item dropdown-item">
                                <Building2 size={13} style={{ color: '#059669' }} />
                                <span>{language === 'vi' ? 'Mạng lưới cơ sở' : 'Hospitals Network'}</span>
                              </Link>

                              <button
                                type="button"
                                className="action-dropdown-item dropdown-item"
                                onClick={() => {
                                  setEditingSpecialty(sp);
                                  setActiveMenuSpecialtyId(null);
                                }}
                              >
                                <Pencil size={13} style={{ color: '#087F8C' }} />
                                <span>{language === 'vi' ? 'Chỉnh sửa hồ sơ' : 'Edit Profile'}</span>
                              </button>

                              <div className="dropdown-divider" />

                              <button
                                type="button"
                                className="action-dropdown-item dropdown-item"
                                onClick={() => { handleToggleStatus(sp); setActiveMenuSpecialtyId(null); }}
                              >
                                {sp.status === 'active' ? (
                                  <>
                                    <PauseCircle size={13} style={{ color: '#D97706' }} />
                                    <span>{language === 'vi' ? 'Tạm ngưng chuyên khoa' : 'Pause Specialty'}</span>
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 size={13} style={{ color: '#059669' }} />
                                    <span>{language === 'vi' ? 'Kích hoạt lại' : 'Activate Specialty'}</span>
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
            {language === 'vi' ? 'Hiển thị' : 'Showing'} {specialties.length} / {pagination.totalCount} {language === 'vi' ? 'chuyên khoa' : 'specialties'}
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

      {/* Modals */}
      <AddSpecialtyModal
        isOpen={showAddSpecialtyModal}
        onClose={() => setShowAddSpecialtyModal(false)}
        onSuccess={() => fetchSpecialties()}
      />

      <EditSpecialtyModal
        isOpen={!!editingSpecialty}
        onClose={() => setEditingSpecialty(null)}
        specialty={editingSpecialty}
        onSuccess={() => fetchSpecialties()}
      />
    </div>
  );
};

export default SpecialtyMaster;
