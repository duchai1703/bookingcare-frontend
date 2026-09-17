// src/containers/System/Admin/Patient/PatientMaster.jsx
// Healthcare Enterprise Patient Base: Master List, Lifecycle Filters & Action Hub
import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  RotateCw,
  CalendarCheck,
  AlertTriangle,
  CreditCard,
  ChevronRight,
  UserCheck,
  Filter,
  Eye,
  CircleDollarSign
} from 'lucide-react';
import { getAdminPatientsList } from '../../../../services/patientManageService';
import { path } from '../../../../utils/constants';
import RefundModal from './RefundModal';
import './PatientWorkspace.scss';

const PatientMaster = () => {
  const language = useSelector((state) => state.app.language);
  const navigate = useNavigate();

  // Filters & Pagination State
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'upcoming', 'pending_refund', 'frequent'

  // Data State
  const [patients, setPatients] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, totalCount: 0, totalPages: 1 });
  const [summaryKpis, setSummaryKpis] = useState({ totalPatients: 0, upcomingPatients: 0, pendingRefundPatients: 0, newPatients30d: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Refund modal state for instant action from table
  const [selectedRefundPatient, setSelectedRefundPatient] = useState(null);

  const fetchPatients = useCallback(async (signal) => {
    setLoading(true);
    setError('');
    try {
      const res = await getAdminPatientsList({
        page,
        limit,
        search: searchTerm,
        filter: activeFilter,
      }, { signal });

      if (res && res.errCode === 0) {
        setPatients(res.data.patients || []);
        setPagination(res.data.pagination || { page: 1, limit: 15, totalCount: 0, totalPages: 1 });
        setSummaryKpis(res.data.summaryKpis || { totalPatients: 0, upcomingPatients: 0, pendingRefundPatients: 0, newPatients30d: 0 });
      } else {
        setError(res?.errMessage || 'Không thể tải danh sách bệnh nhân');
      }
    } catch (err) {
      if (err.name !== 'CanceledError' && err.name !== 'AbortError') {
        setError('Lỗi kết nối máy chủ');
      }
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchTerm, activeFilter]);

  useEffect(() => {
    const controller = new AbortController();
    fetchPatients(controller.signal);
    return () => controller.abort();
  }, [fetchPatients]);

  const handleFilterChange = (filterKey) => {
    setActiveFilter(filterKey);
    setPage(1);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchPatients();
  };

  return (
    <div className="patient-master-container">
      {/* Header */}
      <header className="master-header">
        <div className="header-left">
          <div className="header-badge">
            <Users size={13} strokeWidth={2.5} />
            <span>Clinical Patient Registry</span>
          </div>
          <h1 className="page-title">
            {language === 'vi' ? 'Quản lý Hồ sơ Bệnh nhân' : 'Patient Base & Lifecycle Operations'}
          </h1>
          <p className="page-subtitle">
            {language === 'vi'
              ? 'Hồ sơ bệnh nhân đa tầng, theo dõi lịch sử ca khám, tình trạng hoàn tiền và đối soát tài chính'
              : 'Enterprise patient registry, consultation history, refund processing, and financial audit logs'}
          </p>
        </div>

        <div className="header-actions">
          <button className="btn-sync" onClick={() => fetchPatients()}>
            <RotateCw size={14} className={loading ? 'fa-spin' : ''} />
            <span>{loading ? 'Đang đồng bộ...' : 'Làm mới'}</span>
          </button>
        </div>
      </header>

      {/* Summary KPI Strip */}
      <div className="summary-metrics-strip">
        <div className="metric-card">
          <div className="metric-label">{language === 'vi' ? 'Tổng số bệnh nhân' : 'Total Patients'}</div>
          <div className="metric-value">{summaryKpis.totalPatients.toLocaleString()}</div>
          <div className="metric-note">Đã tạo hồ sơ trên hệ thống</div>
        </div>

        <div className="metric-card highlight-upcoming">
          <div className="metric-label">{language === 'vi' ? 'Có lịch sắp tới' : 'Upcoming Bookings'}</div>
          <div className="metric-value">{summaryKpis.upcomingPatients.toLocaleString()}</div>
          <div className="metric-note">Có ca hẹn chưa khám</div>
        </div>

        <div className="metric-card highlight-pending">
          <div className="metric-label">{language === 'vi' ? 'Chờ hoàn tiền (S4)' : 'Pending Refunds'}</div>
          <div className="metric-value">{summaryKpis.pendingRefundPatients.toLocaleString()}</div>
          <div className="metric-note">Yêu cầu hoàn tiền cần duyệt</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">{language === 'vi' ? 'Bệnh nhân mới (30 ngày)' : 'New Patients (30d)'}</div>
          <div className="metric-value" style={{ color: '#059669' }}>
            {summaryKpis.newPatients30d.toLocaleString()}
          </div>
          <div className="metric-note">Đăng ký trong tháng này</div>
        </div>
      </div>

      {/* Master Filter Bar */}
      <div className="master-filter-bar">
        <form className="search-box" onSubmit={handleSearchSubmit}>
          <Search size={15} className="search-icon" />
          <input
            type="text"
            placeholder={language === 'vi' ? 'Tìm tên, SĐT, email, mã BN-XXXXXX...' : 'Search name, phone, email, BN-code...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </form>

        <div className="filter-tabs">
          <button
            className={`btn-tab ${activeFilter === 'all' ? 'active' : ''}`}
            onClick={() => handleFilterChange('all')}
          >
            {language === 'vi' ? 'Tất cả' : 'All'}
          </button>
          <button
            className={`btn-tab ${activeFilter === 'upcoming' ? 'active' : ''}`}
            onClick={() => handleFilterChange('upcoming')}
          >
            {language === 'vi' ? 'Có lịch sắp tới' : 'Upcoming'}
          </button>
          <button
            className={`btn-tab has-badge ${activeFilter === 'pending_refund' ? 'active' : ''}`}
            onClick={() => handleFilterChange('pending_refund')}
          >
            <span>{language === 'vi' ? 'Cần hoàn tiền' : 'Pending Refund'}</span>
            {summaryKpis.pendingRefundPatients > 0 && (
              <span className="badge-count">{summaryKpis.pendingRefundPatients}</span>
            )}
          </button>
          <button
            className={`btn-tab ${activeFilter === 'frequent' ? 'active' : ''}`}
            onClick={() => handleFilterChange('frequent')}
          >
            {language === 'vi' ? 'Khám thường xuyên (≥3)' : 'Frequent (≥3)'}
          </button>
        </div>
      </div>

      {/* Enterprise Table Container */}
      <div className="table-card">
        <div style={{ overflowX: 'auto' }}>
          <table className="enterprise-table">
            <thead>
              <tr>
                <th>Mã BN</th>
                <th>Bệnh nhân</th>
                <th>Thông tin liên hệ</th>
                <th>Lần khám</th>
                <th>Lần gần nhất</th>
                <th>Tài khoản hoàn tiền</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {patients && patients.length > 0 ? (
                patients.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <span className="code-badge">{p.patientCode}</span>
                    </td>
                    <td>
                      <div className="patient-cell">
                        <div className="patient-avatar">
                          {p.fullName ? p.fullName.charAt(0).toUpperCase() : 'B'}
                        </div>
                        <div className="patient-info">
                          <Link to={`/system/patients/${p.id}`} className="patient-name">
                            {p.fullName}
                          </Link>
                          <div className="patient-meta">
                            {p.gender} · {p.birthday || 'Chưa cập nhật ngày sinh'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div>{p.phoneNumber}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{p.email}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700 }}>
                        {p.completedCount} / {p.totalBookings} ca
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#059669' }}>
                        {p.completedCount} đã khám
                      </div>
                    </td>
                    <td>{p.lastBookingDate}</td>
                    <td>
                      {p.primaryBankAccount ? (
                        <span className="bank-badge">
                          <CreditCard size={12} color="#087F8C" />
                          <span>{p.primaryBankAccount.bankName} ({p.primaryBankAccount.accountNumber})</span>
                        </span>
                      ) : (
                        <span style={{ color: '#94A3B8', fontSize: '0.75rem' }}>Chưa lưu STK</span>
                      )}
                    </td>
                    <td>
                      <span className={`status-pill ${p.statusTag}`}>
                        {p.statusLabelVi}
                      </span>
                    </td>
                    <td>
                      <div className="action-btn-group">
                        <Link to={`/system/patients/${p.id}`} className="btn-view-workspace">
                          <Eye size={13} />
                          <span>Hồ sơ</span>
                        </Link>

                        {p.pendingRefundCount > 0 && (
                          <Link
                            to={`/system/patients/${p.id}?tab=payments`}
                            className="btn-quick-refund"
                            title="Có ca khám đã hủy cần duyệt hoàn tiền"
                          >
                            <CircleDollarSign size={13} />
                            <span>Hoàn tiền</span>
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '40px 20px', color: '#94A3B8' }}>
                    {loading ? 'Đang tải dữ liệu bệnh nhân...' : 'Không tìm thấy bệnh nhân phù hợp điều kiện lọc'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="table-pagination">
          <div>
            Hiển thị <strong>{patients.length}</strong> trên tổng số <strong>{pagination.totalCount}</strong> bệnh nhân
          </div>

          <div className="pagination-controls">
            <button
              disabled={page <= 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            >
              Trang trước
            </button>
            <span style={{ margin: '0 8px', fontWeight: 600 }}>
              Trang {pagination.page} / {pagination.totalPages}
            </span>
            <button
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((prev) => Math.min(pagination.totalPages, prev + 1))}
            >
              Trang sau
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientMaster;
