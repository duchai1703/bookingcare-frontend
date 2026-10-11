// src/containers/DoctorPortal/DoctorPatientManage.jsx
// [Doctor Patient Relationship & Clinical Dossier Hub]
// Quản lý quan hệ và hồ sơ bệnh nhân dành riêng cho Bác sĩ — Enterprise Healthcare Standard
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Users,
  Search,
  Filter,
  Calendar,
  Clock,
  Phone,
  UserCheck,
  Activity,
  CalendarClock,
  MessageSquare,
  Video,
  FileText,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  RotateCcw,
  Building2,
  AlertCircle,
  Eye,
  Stethoscope,
  X,
  ExternalLink,
  ShieldAlert,
  User,
  HeartPulse,
  Pill,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'react-toastify';
import {
  getDoctorPatientsApi,
  getDoctorPatientSummaryApi,
} from '../../services/doctorService';
import './DoctorPatientManage.scss';

const DoctorPatientManage = () => {
  const navigate = useNavigate();
  const userInfo = useSelector((state) => state.user.userInfo);

  // Dữ liệu danh sách & KPIs
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [patients, setPatients] = useState([]);
  const [clinics, setClinics] = useState([]);
  const [kpis, setKpis] = useState({
    totalPatients: 0,
    monitoringCount: 0,
    needFollowupCount: 0,
    unreadMessagesCount: 0,
  });

  // Bộ lọc
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClinic, setSelectedClinic] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedTimeRange, setSelectedTimeRange] = useState('all');
  const [selectedFollowUp, setSelectedFollowUp] = useState('all');
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);

  // Phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalRows, setTotalRows] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Modal / Drawer xem hồ sơ chi tiết (Clinical Dossier)
  const [activeDossierKey, setActiveDossierKey] = useState(null);
  const [dossierLoading, setDossierLoading] = useState(false);
  const [dossierData, setDossierData] = useState(null);
  const [dossierTab, setDossierTab] = useState('overview'); // 'overview' | 'timeline' | 'followup'

  // Load danh sách bệnh nhân
  const fetchPatients = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const params = {
        page: currentPage,
        limit: pageSize,
        keyword: searchTerm,
        clinicId: selectedClinic || undefined,
        patientStatus: selectedStatus !== 'all' ? selectedStatus : undefined,
        timeRange: selectedTimeRange !== 'all' ? selectedTimeRange : undefined,
        followUpStatus: selectedFollowUp !== 'all' ? selectedFollowUp : undefined,
      };

      const res = await getDoctorPatientsApi(params);
      const isSuccess = res && (res.errCode === 0 || res.data?.errCode === 0);
      const payload = res?.errCode === 0 ? res.data : (res?.data?.data || res?.data);

      if (isSuccess && payload) {
        setPatients(payload.patients || []);
        setKpis(payload.kpis || {
          totalPatients: 0,
          monitoringCount: 0,
          needFollowupCount: 0,
          unreadMessagesCount: 0,
        });
        setClinics(payload.clinics || []);
        if (payload.pagination) {
          setTotalRows(payload.pagination.totalRows || 0);
          setTotalPages(payload.pagination.totalPages || 1);
        }
      } else {
        toast.error(res?.message || res?.data?.message || 'Không thể tải danh sách bệnh nhân');
      }
    } catch (err) {
      console.error('Fetch doctor patients error:', err);
      const errorMsg = err?.response?.data?.message || err?.message || 'Không thể tải danh sách bệnh nhân';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentPage, pageSize, searchTerm, selectedClinic, selectedStatus, selectedTimeRange, selectedFollowUp]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  // Reset bộ lọc
  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedClinic('');
    setSelectedStatus('all');
    setSelectedTimeRange('all');
    setSelectedFollowUp('all');
    setCurrentPage(1);
  };

  // Mở hồ sơ bệnh nhân (Dossier)
  const handleOpenDossier = async (patientKey) => {
    setActiveDossierKey(patientKey);
    setDossierTab('overview');
    setDossierLoading(true);
    try {
      const res = await getDoctorPatientSummaryApi(patientKey);
      const isSuccess = res && (res.errCode === 0 || res.data?.errCode === 0);
      const payload = res?.errCode === 0 ? res.data : (res?.data?.data || res?.data);

      if (isSuccess && payload) {
        setDossierData(payload);
      } else {
        toast.error(res?.message || res?.data?.message || 'Không thể mở hồ sơ bệnh nhân');
        setActiveDossierKey(null);
      }
    } catch (err) {
      console.error('Fetch patient summary error:', err);
      const errorMsg = err?.response?.data?.message || err?.message || 'Lỗi khi tải chi tiết hồ sơ bệnh nhân';
      toast.error(errorMsg);
      setActiveDossierKey(null);
    } finally {
      setDossierLoading(false);
    }
  };

  // Điều hướng tới Chat
  const handleStartChat = (patient) => {
    if (patient.conversationId) {
      navigate(`/doctor-dashboard/messages/${patient.conversationId}`);
    } else {
      navigate(`/doctor-dashboard/messages?patientId=${patient.patientId}${patient.familyMemberId ? `&familyMemberId=${patient.familyMemberId}` : ''}`);
    }
  };

  // Format ngày hiển thị chuẩn Việt Nam dd/mm/yyyy
  const formatDateDisplay = (raw) => {
    if (!raw) return '—';
    if (!isNaN(raw) && String(raw).length >= 10) {
      const d = new Date(Number(raw));
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
      }
    }
    const d = new Date(raw);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
    return String(raw);
  };

  // Chữ cái đại diện avatar
  const getInitials = (name) => {
    if (!name) return 'BN';
    const words = name.trim().split(' ');
    if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  };

  return (
    <div className="doctor-patient-manage-container">
      {/* ── Top Header ────────────────────────────────────────────── */}
      <div className="dpm-header">
        <div className="dpm-header-left">
          <div className="dpm-title-badge">
            <Users className="icon-title" size={20} />
            <span>Phân hệ Quản lý Bệnh nhân</span>
          </div>
          <h1 className="dpm-title">Danh sách Bệnh nhân & Hồ sơ Lâm sàng</h1>
          <p className="dpm-subtitle">
            Tra cứu bệnh nhân thuộc phạm vi hành nghề của bạn, theo dõi diễn tiến điều trị, kế hoạch tái khám và tư vấn sau khám.
          </p>
        </div>

        <div className="dpm-header-actions">
          <button
            type="button"
            className={`btn-refresh ${refreshing ? 'is-spinning' : ''}`}
            onClick={() => fetchPatients(true)}
            title="Làm mới dữ liệu"
          >
            <RotateCcw size={16} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* ── 4 Thẻ KPI Thực Tế ─────────────────────────────────────── */}
      <div className="dpm-kpi-grid">
        <div className="dpm-kpi-card card-total">
          <div className="kpi-icon-wrapper">
            <Users size={24} />
          </div>
          <div className="kpi-content">
            <div className="kpi-value">{kpis.totalPatients.toLocaleString()}</div>
            <div className="kpi-label">Tổng bệnh nhân</div>
            <div className="kpi-desc">Đã từng hoặc đang khám với bác sĩ</div>
          </div>
        </div>

        <div className="dpm-kpi-card card-monitoring">
          <div className="kpi-icon-wrapper">
            <Activity size={24} />
          </div>
          <div className="kpi-content">
            <div className="kpi-value">{kpis.monitoringCount.toLocaleString()}</div>
            <div className="kpi-label">Đang theo dõi</div>
            <div className="kpi-desc">Có lộ trình & bệnh án theo dõi</div>
          </div>
        </div>

        <div className="dpm-kpi-card card-followup">
          <div className="kpi-icon-wrapper">
            <CalendarClock size={24} />
          </div>
          <div className="kpi-content">
            <div className="kpi-value">{kpis.needFollowupCount.toLocaleString()}</div>
            <div className="kpi-label">Cần tái khám</div>
            <div className="kpi-desc">Đến hạn hoặc quá hạn hẹn khám</div>
          </div>
        </div>

        <div className="dpm-kpi-card card-unread">
          <div className="kpi-icon-wrapper">
            <MessageSquare size={24} />
          </div>
          <div className="kpi-content">
            <div className="kpi-value">{kpis.unreadMessagesCount.toLocaleString()}</div>
            <div className="kpi-label">Tin nhắn chờ</div>
            <div className="kpi-desc">Hội thoại sau khám cần phản hồi</div>
          </div>
        </div>
      </div>

      {/* ── Bộ Lọc Tìm Kiếm Đa Điều Kiện ─────────────────────────── */}
      <div className="dpm-filter-panel">
        <div className="filter-row-primary">
          {/* Ô tìm kiếm từ khóa */}
          <div className="filter-search-box">
            <Search className="search-icon" size={18} />
            <input
              type="text"
              placeholder="Tìm theo tên bệnh nhân, mã BN, số điện thoại, chẩn đoán..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
            {searchTerm && (
              <button
                type="button"
                className="btn-clear-search"
                onClick={() => setSearchTerm('')}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Lọc theo cơ sở y tế */}
          <div className="filter-select-wrapper">
            <Building2 className="select-icon" size={16} />
            <select
              value={selectedClinic}
              onChange={(e) => {
                setSelectedClinic(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">Tất cả cơ sở y tế</option>
              {clinics.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Lọc theo trạng thái bệnh nhân */}
          <div className="filter-select-wrapper">
            <UserCheck className="select-icon" size={16} />
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="monitoring">Đang theo dõi</option>
              <option value="need_followup">Cần tái khám</option>
              <option value="new">Bệnh nhân mới</option>
            </select>
          </div>

          {/* Nút Toggle nâng cao & Reset */}
          <div className="filter-actions-group">
            <button
              type="button"
              className={`btn-toggle-advanced ${showAdvancedFilter ? 'active' : ''}`}
              onClick={() => setShowAdvancedFilter(!showAdvancedFilter)}
            >
              <Filter size={15} />
              <span>{showAdvancedFilter ? 'Thu gọn' : 'Bộ lọc nâng cao'}</span>
            </button>

            {(searchTerm || selectedClinic || selectedStatus !== 'all' || selectedTimeRange !== 'all' || selectedFollowUp !== 'all') && (
              <button
                type="button"
                className="btn-reset-filters"
                onClick={handleResetFilters}
                title="Xóa bộ lọc"
              >
                <RotateCcw size={14} />
                <span>Đặt lại</span>
              </button>
            )}
          </div>
        </div>

        {/* Hàng bộ lọc nâng cao (Tầng 2) */}
        {showAdvancedFilter && (
          <div className="filter-row-secondary">
            <div className="secondary-item">
              <label>Thời gian khám gần nhất</label>
              <select
                value={selectedTimeRange}
                onChange={(e) => {
                  setSelectedTimeRange(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="all">Toàn bộ thời gian</option>
                <option value="today">Hôm nay</option>
                <option value="this_week">Trong vòng 7 ngày qua</option>
                <option value="this_month">Trong vòng 30 ngày qua</option>
                <option value="past_3_months">Trong 3 tháng gần nhất</option>
              </select>
            </div>

            <div className="secondary-item">
              <label>Trạng thái lịch hẹn tái khám</label>
              <select
                value={selectedFollowUp}
                onChange={(e) => {
                  setSelectedFollowUp(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="all">Tất cả lịch hẹn</option>
                <option value="due">Đến hạn (trong 7 ngày tới)</option>
                <option value="overdue">Đã quá hạn tái khám</option>
                <option value="upcoming">Sắp tới (trên 7 ngày)</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* ── Bảng Dữ Liệu Master Table ─────────────────────────────── */}
      <div className="dpm-table-card">
        <div className="dpm-table-header-info">
          <div className="info-title">
            <span>Danh sách bệnh nhân</span>
            <span className="info-badge-count">{totalRows} bệnh nhân</span>
          </div>
          <div className="info-tip">
            Nhấn vào hàng bệnh nhân hoặc nút &quot;Xem hồ sơ&quot; để tra cứu toàn bộ lịch sử khám lâm sàng
          </div>
        </div>

        {loading ? (
          <div className="dpm-loading-state">
            <div className="pulse-spinner" />
            <span>Đang tổng hợp dữ liệu hồ sơ bệnh nhân...</span>
          </div>
        ) : patients.length === 0 ? (
          <div className="dpm-empty-state">
            <div className="empty-illustration">
              <Users size={48} />
            </div>
            <h3>Không tìm thấy bệnh nhân nào</h3>
            <p>
              {searchTerm || selectedClinic || selectedStatus !== 'all'
                ? 'Không có kết quả nào phù hợp với bộ lọc hiện tại. Thử xóa hoặc thay đổi điều kiện lọc.'
                : 'Bác sĩ chưa có ca khám bệnh nhân nào được lưu trong hệ thống.'}
            </p>
            {(searchTerm || selectedClinic || selectedStatus !== 'all') && (
              <button
                type="button"
                className="btn-empty-reset"
                onClick={handleResetFilters}
              >
                Đặt lại bộ lọc
              </button>
            )}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="dpm-master-table">
              <thead>
                <tr>
                  <th style={{ width: '280px' }}>Bệnh nhân</th>
                  <th style={{ width: '130px' }}>Độ tuổi / Giới tính</th>
                  <th style={{ width: '150px' }}>Số điện thoại</th>
                  <th style={{ width: '220px' }}>Lịch sử ca khám</th>
                  <th style={{ width: '170px' }}>Trạng thái theo dõi</th>
                  <th style={{ width: '160px' }}>Tư vấn sau khám</th>
                  <th style={{ width: '130px', textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((p) => {
                  return (
                    <tr
                      key={p.patientKey}
                      className="dpm-patient-row"
                      onClick={() => handleOpenDossier(p.patientKey)}
                    >
                      {/* Cột Bệnh nhân */}
                      <td>
                        <div className="patient-identity-cell">
                          <div className="patient-avatar-box">
                            {p.avatar ? (
                              <img
                                src={p.avatar}
                                alt={p.name}
                                className="avatar-img"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div
                              className="avatar-fallback"
                              style={{ display: p.avatar ? 'none' : 'flex' }}
                            >
                              {getInitials(p.name)}
                            </div>
                          </div>

                          <div className="patient-name-info">
                            <div className="name-with-badge">
                              <span className="patient-full-name">{p.name}</span>
                              {p.isFamilyMember && (
                                <span className="badge-family" title="Đặt khám theo diện người thân gia đình">
                                  Người thân
                                </span>
                              )}
                            </div>
                            <div className="patient-code-meta">
                              <span className="code-tag">{p.patientCode}</span>
                              {p.accountOwner && (
                                <span className="guardian-tag" title={`Tài khoản đặt: ${p.accountOwner.name} (${p.accountOwner.relationship})`}>
                                  · Đặt bởi: {p.accountOwner.name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Cột Độ tuổi & Giới tính */}
                      <td>
                        <div className="age-gender-cell">
                          <span className={`gender-pill ${p.gender === 'G1' || p.gender === 'M' ? 'male' : p.gender === 'G2' || p.gender === 'F' ? 'female' : 'other'}`}>
                            {p.genderVi}
                          </span>
                          <span className="age-text">
                            {p.age !== null ? `${p.age} tuổi` : 'Chưa rõ tuổi'}
                          </span>
                        </div>
                      </td>

                      {/* Cột Số điện thoại */}
                      <td>
                        <div className="phone-cell">
                          {p.phoneNumber ? (
                            <span className="phone-number">
                              <Phone size={13} className="phone-icon" />
                              {p.phoneNumber}
                            </span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </div>
                      </td>

                      {/* Cột Lịch sử ca khám */}
                      <td>
                        <div className="history-cell">
                          <div className="visits-badge">
                            <span className="visit-count">{p.totalVisits} lần khám</span>
                          </div>
                          <div className="latest-visit-date">
                            <Clock size={12} />
                            <span>Gần nhất: {formatDateDisplay(p.latestVisitDate)}</span>
                          </div>
                          {p.latestDiagnosis && (
                            <div className="latest-diagnosis-text" title={p.latestDiagnosis}>
                              {p.latestDiagnosis}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Cột Trạng thái theo dõi */}
                      <td>
                        <div className="status-cell">
                          {p.statusTag === 'need_followup' && (
                            <span className="status-badge badge-warning">
                              <AlertCircle size={13} />
                              <span>{p.statusTagLabel}</span>
                            </span>
                          )}
                          {p.statusTag === 'monitoring' && (
                            <span className="status-badge badge-monitoring">
                              <span className="pulse-dot" />
                              <span>{p.statusTagLabel}</span>
                            </span>
                          )}
                          {p.statusTag === 'new' && (
                            <span className="status-badge badge-info">
                              <span>{p.statusTagLabel}</span>
                            </span>
                          )}

                          {p.followUpDate && (
                            <div className={`followup-meta ${p.followUpStatus}`}>
                              Hẹn: {formatDateDisplay(p.followUpDate)} ({p.followUpLabel})
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Cột Tư vấn sau khám (Chat & Video) */}
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="contact-actions-cell">
                          <button
                            type="button"
                            className={`btn-contact-action btn-chat ${p.unreadCount > 0 ? 'has-unread' : ''}`}
                            onClick={() => handleStartChat(p)}
                            title={p.unreadCount > 0 ? `${p.unreadCount} tin nhắn chưa đọc` : 'Nhắn tin sau khám'}
                          >
                            <MessageSquare size={15} />
                            {p.unreadCount > 0 && <span className="unread-dot">{p.unreadCount}</span>}
                          </button>

                          <button
                            type="button"
                            className={`btn-contact-action btn-video ${!p.canVideo ? 'disabled' : ''}`}
                            onClick={() => {
                              if (!p.canVideo) {
                                toast.info('Thời hạn tư vấn từ xa của ca khám đã hết hoặc chưa có lịch.');
                                return;
                              }
                              handleStartChat(p);
                            }}
                            title={p.canVideo ? 'Tư vấn video từ xa' : 'Đã hết hạn hỗ trợ tư vấn'}
                          >
                            <Video size={15} />
                          </button>
                        </div>
                      </td>

                      {/* Cột Thao tác */}
                      <td onClick={(e) => e.stopPropagation()} style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn-view-dossier"
                          onClick={() => handleOpenDossier(p.patientKey)}
                          title="Xem hồ sơ chi tiết"
                        >
                          <Eye size={14} />
                          <span>Hồ sơ</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Phân Trang Chuyên Nghiệp ──────────────────────────────── */}
        {totalRows > 0 && (
          <div className="dpm-pagination-bar">
            <div className="pagination-info">
              Hiển thị <strong>{Math.min((currentPage - 1) * pageSize + 1, totalRows)}</strong> -{' '}
              <strong>{Math.min(currentPage * pageSize, totalRows)}</strong> trên tổng số{' '}
              <strong>{totalRows}</strong> bệnh nhân
            </div>

            <div className="pagination-controls">
              <div className="page-size-selector">
                <span>Dòng / trang:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <div className="pagination-buttons">
                <button
                  type="button"
                  className="page-btn"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(1)}
                  title="Trang đầu"
                >
                  <ChevronsLeft size={16} />
                </button>
                <button
                  type="button"
                  className="page-btn"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  title="Trang trước"
                >
                  <ChevronLeft size={16} />
                </button>

                <span className="current-page-badge">
                  Trang {currentPage} / {totalPages}
                </span>

                <button
                  type="button"
                  className="page-btn"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  title="Trang tiếp"
                >
                  <ChevronRight size={16} />
                </button>
                <button
                  type="button"
                  className="page-btn"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                  title="Trang cuối"
                >
                  <ChevronsRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal / Drawer Hồ Sơ Bệnh Nhân (Clinical Dossier Drawer) ── */}
      {activeDossierKey && (
        <div className="dossier-drawer-backdrop" onClick={() => setActiveDossierKey(null)}>
          <div className="dossier-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="dossier-header">
              <div className="dossier-header-title">
                <div className="dossier-tag">Hồ Sơ Y Tế Lâm Sàng</div>
                <h2>{dossierData ? dossierData.profile.name : 'Chi tiết bệnh nhân'}</h2>
                <div className="dossier-code-meta">
                  {dossierData && (
                    <>
                      <span className="badge-code">{dossierData.profile.patientCode}</span>
                      <span>·</span>
                      <span>{dossierData.profile.genderVi}</span>
                      <span>·</span>
                      <span>{dossierData.profile.age !== null ? `${dossierData.profile.age} tuổi` : 'Chưa rõ tuổi'}</span>
                    </>
                  )}
                </div>
              </div>

              <button
                type="button"
                className="btn-close-drawer"
                onClick={() => setActiveDossierKey(null)}
              >
                <X size={20} />
              </button>
            </div>

            {/* Navigation Tabs trong Hồ sơ */}
            <div className="dossier-tabs-nav">
              <button
                type="button"
                className={`tab-btn ${dossierTab === 'overview' ? 'active' : ''}`}
                onClick={() => setDossierTab('overview')}
              >
                <User size={15} />
                <span>Tổng quan & Định danh</span>
              </button>
              <button
                type="button"
                className={`tab-btn ${dossierTab === 'timeline' ? 'active' : ''}`}
                onClick={() => setDossierTab('timeline')}
              >
                <Stethoscope size={15} />
                <span>Lịch sử khám ({dossierData ? dossierData.totalVisits : 0})</span>
              </button>
              <button
                type="button"
                className={`tab-btn ${dossierTab === 'followup' ? 'active' : ''}`}
                onClick={() => setDossierTab('followup')}
              >
                <CalendarClock size={15} />
                <span>Tái khám & Hướng dẫn</span>
              </button>
            </div>

            {/* Nội dung Drawer */}
            <div className="dossier-body">
              {dossierLoading ? (
                <div className="dossier-loading">
                  <div className="pulse-spinner" />
                  <span>Đang tải thông tin hồ sơ bệnh nhân...</span>
                </div>
              ) : !dossierData ? (
                <div className="dossier-error">
                  <AlertCircle size={32} />
                  <p>Không thể nạp dữ liệu hồ sơ bệnh nhân.</p>
                </div>
              ) : (
                <>
                  {/* TAB 1: TỔNG QUAN */}
                  {dossierTab === 'overview' && (
                    <div className="tab-pane-overview">
                      <div className="overview-card identity-card">
                        <div className="card-heading">
                          <User size={16} />
                          <h3>Thông tin định danh</h3>
                        </div>
                        <div className="info-grid-2">
                          <div className="info-item">
                            <span className="label">Họ và tên:</span>
                            <span className="value font-medium">{dossierData.profile.name}</span>
                          </div>
                          <div className="info-item">
                            <span className="label">Mã bệnh nhân:</span>
                            <span className="value text-primary font-mono">{dossierData.profile.patientCode}</span>
                          </div>
                          <div className="info-item">
                            <span className="label">Giới tính:</span>
                            <span className="value">{dossierData.profile.genderVi}</span>
                          </div>
                          <div className="info-item">
                            <span className="label">Ngày sinh / Tuổi:</span>
                            <span className="value">
                              {dossierData.profile.birthday || '—'} {dossierData.profile.age !== null ? `(${dossierData.profile.age} tuổi)` : ''}
                            </span>
                          </div>
                          <div className="info-item">
                            <span className="label">Số điện thoại:</span>
                            <span className="value">{dossierData.profile.phoneNumber || '—'}</span>
                          </div>
                          <div className="info-item">
                            <span className="label">Địa chỉ liên hệ:</span>
                            <span className="value">{dossierData.profile.address || '—'}</span>
                          </div>
                          {dossierData.profile.nationalId && (
                            <div className="info-item">
                              <span className="label">CCCD / Mã BHYT:</span>
                              <span className="value">{dossierData.profile.nationalId}</span>
                            </div>
                          )}
                        </div>

                        {/* Nếu là người thân */}
                        {dossierData.profile.isFamilyMember && dossierData.profile.accountOwner && (
                          <div className="family-guardian-box">
                            <div className="guardian-title">
                              <ShieldAlert size={14} />
                              <span>Người giám hộ / Tài khoản đặt lịch</span>
                            </div>
                            <div className="guardian-content">
                              <div><strong>Chủ tài khoản:</strong> {dossierData.profile.accountOwner.name}</div>
                              <div><strong>Mối quan hệ:</strong> {dossierData.profile.accountOwner.relationship}</div>
                              <div><strong>Số điện thoại:</strong> {dossierData.profile.accountOwner.phoneNumber}</div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Tiền sử bệnh */}
                      {dossierData.profile.medicalHistory && (
                        <div className="overview-card history-notes-card">
                          <div className="card-heading">
                            <HeartPulse size={16} />
                            <h3>Tiền sử bệnh & Dị ứng đã ghi nhận</h3>
                          </div>
                          <p className="medical-history-text">{dossierData.profile.medicalHistory}</p>
                        </div>
                      )}

                      {/* Tóm tắt ca khám gần nhất */}
                      {dossierData.latestVisit && (
                        <div className="overview-card latest-encounter-card">
                          <div className="card-heading">
                            <Stethoscope size={16} />
                            <h3>Ca khám gần nhất</h3>
                            <span className="badge-date">{formatDateDisplay(dossierData.latestVisit.date)}</span>
                          </div>
                          <div className="latest-encounter-details">
                            <div className="detail-line">
                              <span className="detail-label">Cơ sở:</span>
                              <span className="detail-value">{dossierData.latestVisit.clinicName || 'Cơ sở khám chính'}</span>
                            </div>
                            <div className="detail-line">
                              <span className="detail-label">Lý do khám:</span>
                              <span className="detail-value">{dossierData.latestVisit.chiefComplaint || '—'}</span>
                            </div>
                            <div className="detail-line">
                              <span className="detail-label">Chẩn đoán:</span>
                              <span className="detail-value text-primary font-medium">{dossierData.latestVisit.diagnosis || 'Chưa ghi nhận'}</span>
                            </div>
                            {dossierData.latestVisit.treatmentPlan && (
                              <div className="detail-line">
                                <span className="detail-label">Kế hoạch điều trị:</span>
                                <span className="detail-value">{dossierData.latestVisit.treatmentPlan}</span>
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            className="btn-open-workspace"
                            onClick={() => {
                              setActiveDossierKey(null);
                              navigate(`/doctor-dashboard/encounter/${dossierData.latestVisit.bookingId}`);
                            }}
                          >
                            <span>Mở phòng khám ca này</span>
                            <ExternalLink size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 2: DÒNG THỜI GIAN LÂM SÀNG (TIMELINE) */}
                  {dossierTab === 'timeline' && (
                    <div className="tab-pane-timeline">
                      <div className="clinical-timeline">
                        {dossierData.timeline.map((enc, idx) => (
                          <div key={enc.bookingId} className="timeline-item">
                            <div className="timeline-marker">
                              <div className="marker-dot" />
                              {idx < dossierData.timeline.length - 1 && <div className="marker-line" />}
                            </div>
                            <div className="timeline-card">
                              <div className="enc-header">
                                <div className="enc-date-meta">
                                  <span className="enc-date">{formatDateDisplay(enc.date)}</span>
                                  <span className="enc-slot">{enc.timeSlotLabel}</span>
                                </div>
                                <div className="enc-status-badge">
                                  {enc.statusLabel}
                                </div>
                              </div>

                              <div className="enc-clinic-info">
                                <Building2 size={13} />
                                <span>{enc.clinicName}</span>
                              </div>

                              <div className="enc-body">
                                <div className="enc-field">
                                  <span className="field-name">Lý do khám:</span>
                                  <span className="field-val">{enc.chiefComplaint || '—'}</span>
                                </div>
                                {enc.symptoms && (
                                  <div className="enc-field">
                                    <span className="field-name">Triệu chứng:</span>
                                    <span className="field-val">{enc.symptoms}</span>
                                  </div>
                                )}
                                <div className="enc-field">
                                  <span className="field-name">Chẩn đoán lâm sàng:</span>
                                  <span className="field-val text-primary font-medium">{enc.diagnosis || 'Chưa ghi nhận'}</span>
                                </div>
                                {enc.treatmentPlan && (
                                  <div className="enc-field">
                                    <span className="field-name">Phác đồ & Kế hoạch:</span>
                                    <span className="field-val">{enc.treatmentPlan}</span>
                                  </div>
                                )}
                                {enc.clinicalNotes && (
                                  <div className="enc-field">
                                    <span className="field-name">Ghi chú bác sĩ:</span>
                                    <span className="field-val italic-text">{enc.clinicalNotes}</span>
                                  </div>
                                )}
                              </div>

                              <div className="enc-footer">
                                <button
                                  type="button"
                                  className="btn-goto-encounter"
                                  onClick={() => {
                                    setActiveDossierKey(null);
                                    navigate(`/doctor-dashboard/encounter/${enc.bookingId}`);
                                  }}
                                >
                                  <span>Xem chi tiết ca khám #{enc.bookingId}</span>
                                  <ExternalLink size={13} />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* TAB 3: TÁI KHÁM & HƯỚNG DẪN */}
                  {dossierTab === 'followup' && (
                    <div className="tab-pane-followup">
                      <div className="followup-box">
                        <div className="box-title">
                          <CalendarClock size={18} />
                          <h3>Kế hoạch tái khám & Hẹn lịch</h3>
                        </div>

                        {dossierData.latestVisit && dossierData.latestVisit.followUpDate ? (
                          <div className="active-followup-info">
                            <div className="followup-date-highlight">
                              <span className="lbl">Ngày tái khám dự kiến:</span>
                              <span className="val">{formatDateDisplay(dossierData.latestVisit.followUpDate)}</span>
                            </div>
                            <p className="followup-notes">
                              Bác sĩ đã lên kế hoạch tái khám sau khi hoàn tất phiên khám ngày {formatDateDisplay(dossierData.latestVisit.date)}.
                            </p>
                          </div>
                        ) : (
                          <div className="no-followup-info">
                            <CheckCircle2 size={24} className="text-muted" />
                            <p>Bệnh nhân hiện chưa có lịch hẹn tái khám cụ thể.</p>
                          </div>
                        )}
                      </div>

                      {dossierData.latestVisit && dossierData.latestVisit.careInstructions && (
                        <div className="care-instructions-box">
                          <div className="box-title">
                            <Sparkles size={18} />
                            <h3>Lời dặn & Hướng dẫn tự chăm sóc tại nhà</h3>
                          </div>
                          <div className="instructions-content">
                            {dossierData.latestVisit.careInstructions}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer của Drawer */}
            <div className="dossier-footer">
              <button
                type="button"
                className="btn-drawer-close"
                onClick={() => setActiveDossierKey(null)}
              >
                Đóng hồ sơ
              </button>

              {dossierData && (
                <button
                  type="button"
                  className="btn-drawer-chat"
                  onClick={() => {
                    const latestBooking = dossierData.latestVisit;
                    if (latestBooking && latestBooking.conversationId) {
                      navigate(`/doctor-dashboard/messages/${latestBooking.conversationId}`);
                    } else {
                      navigate(`/doctor-dashboard/messages?patientId=${dossierData.profile.accountOwner ? dossierData.profile.accountOwner.id : (dossierData.profile.patientKey.replace('user_', ''))}`);
                    }
                  }}
                >
                  <MessageSquare size={15} />
                  <span>Mở hội thoại sau khám</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorPatientManage;
