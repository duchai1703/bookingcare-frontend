// src/containers/System/Admin/Clinic/ClinicControlCenter.jsx
// Healthcare Facility & Clinic Operations Control Center
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Building2,
  ArrowLeft,
  Users,
  Calendar,
  Layers,
  Activity,
  FileText,
  TrendingUp,
  MapPin,
  Phone,
  Mail,
  CheckCircle2,
  PauseCircle,
  Percent,
  Star,
  UserPlus,
  RotateCw,
  Plus,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import { toast } from 'react-toastify';
import {
  getAdminClinicControlCenter,
  updateClinicWorkingStatus,
  updateClinicCommission,
} from '../../../../services/clinicManageService';
import clinicHierarchyService from '../../../../services/clinicHierarchyService';
import AssignDoctorModal from './AssignDoctorModal';
import AssignSpecialtyModal from './AssignSpecialtyModal';
import ContextBreadcrumbs from '../../../../components/ContextBreadcrumbs/ContextBreadcrumbs';
import CommonUtils from '../../../../utils/CommonUtils';
import '../MedicalOperations.scss';

const formatCurrencyVND = (amount) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
};

const ClinicControlCenter = () => {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'overview';
  const [activeTab, setActiveTab] = useState(initialTab);
  const language = useSelector((state) => state.app.language) || 'vi';

  const [clinicData, setClinicData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showAssignSpecialtyModal, setShowAssignSpecialtyModal] = useState(false);
  const [hierarchySpecialties, setHierarchySpecialties] = useState([]);
  const [availableSpecialties, setAvailableSpecialties] = useState([]);

  const fetchHierarchySpecialties = useCallback(async () => {
    try {
      const res = await clinicHierarchyService.getClinicSpecialties(id);
      if (res && res.errCode === 0) {
        setHierarchySpecialties(res.data.specialties || []);
        setAvailableSpecialties(res.data.availableSpecialties || []);
      }
    } catch (err) {
      console.error('Error fetching hierarchy specialties:', err);
    }
  }, [id]);

  useEffect(() => {
    fetchHierarchySpecialties();
  }, [fetchHierarchySpecialties]);

  const handleUnassignSpecialty = async (sp) => {
    if (!window.confirm(`Bạn có chắc muốn gỡ chuyên khoa [${sp.specialtyName}] khỏi cơ sở này không?`)) {
      return;
    }
    try {
      const res = await clinicHierarchyService.unassignSpecialtyFromClinic(id, sp.specialtyId);
      if (res && res.errCode === 0) {
        toast.success(res.message || 'Gỡ chuyên khoa thành công!');
        fetchHierarchySpecialties();
        fetchWorkspace();
      } else {
        toast.error(res?.message || 'Không thể gỡ chuyên khoa');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message);
    }
  };

  const fetchWorkspace = useCallback(async (signal) => {
    setLoading(true);
    setError('');
    try {
      const res = await getAdminClinicControlCenter(id, { signal });
      if (res && res.errCode === 0) {
        setClinicData(res.data);
      } else {
        setError(res?.errMessage || 'Không thể tải trung tâm điều hành cơ sở');
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

  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams, activeTab]);

  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    setSearchParams({ tab: tabKey });
  };

  const handleToggleStatus = async () => {
    if (!clinicData) return;
    const nextStatus = clinicData.profile.status === 'active' ? 'paused' : 'active';
    try {
      const res = await updateClinicWorkingStatus(id, { status: nextStatus });
      if (res && res.errCode === 0) {
        fetchWorkspace();
      } else {
        alert(res?.errMessage || 'Không thể cập nhật trạng thái');
      }
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  const handleUpdateCommission = async () => {
    if (!clinicData) return;
    const input = window.prompt(
      `Cập nhật tỷ lệ hoa hồng chiết khấu cho [${clinicData.profile.name}] (%):`,
      clinicData.profile.commissionRate
    );
    if (input === null) return;
    const rate = parseFloat(input);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      alert('Tỷ lệ hoa hồng không hợp lệ (0 - 100%)');
      return;
    }
    try {
      const res = await updateClinicCommission(id, { commissionRate: rate });
      if (res && res.errCode === 0) {
        fetchWorkspace();
      } else {
        alert(res?.errMessage || 'Cập nhật hoa hồng thất bại');
      }
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  if (loading && !clinicData) {
    return (
      <div className="operations-workspace-container" style={{ textAlign: 'center', padding: '80px 0' }}>
        <RotateCw size={32} className="fa-spin" style={{ color: '#087F8C', marginBottom: 12 }} />
        <div style={{ color: '#64748B', fontSize: '0.9rem' }}>Đang nạp dữ liệu Clinic Control Center...</div>
      </div>
    );
  }

  if (error || !clinicData) {
    return (
      <div className="operations-workspace-container" style={{ padding: 30 }}>
        <Link to="/system/clinics" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#087F8C', textDecoration: 'none', marginBottom: 16 }}>
          <ArrowLeft size={16} /> Quay lại danh sách cơ sở
        </Link>
        <div style={{ padding: 20, background: '#FEF2F2', color: '#B91C1C', borderRadius: 8 }}>
          {error || 'Không tìm thấy cơ sở y tế'}
        </div>
      </div>
    );
  }

  const { profile, kpis, doctors, specialties, weeklySchedule, recentBookings, performance } = clinicData;

  return (
    <div className="operations-workspace-container">
      {/* Breadcrumb */}
      <ContextBreadcrumbs
        items={[
          { label: language === 'vi' ? 'Cơ sở Y tế' : 'Clinic Operations', path: '/system/clinics' },
          { label: profile.name, badge: 'Control Center' },
        ]}
      />

      {/* Control Header Card */}
      <header className="workspace-header-card">
        <div className="header-top-row">
          <div className="profile-meta">
            {profile.image ? (
              <img
                src={CommonUtils.decodeBase64Image(profile.image)}
                alt={profile.name}
                className="avatar-lg"
                onError={(e) => {
                  e.target.style.display = 'none';
                  if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                }}
              />
            ) : null}
            <div
              className="fallback-avatar-lg"
              style={{ display: profile.image ? 'none' : 'flex' }}
            >
              {profile.name?.[0] || 'C'}
            </div>

            <div className="profile-titles">
              <div className="badge-row">
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '3px 8px',
                    borderRadius: 6,
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    background: profile.status === 'active' ? '#ECFDF5' : '#FEF2F2',
                    color: profile.status === 'active' ? '#047857' : '#B91C1C',
                  }}
                >
                  ● {profile.status === 'active' ? 'Đang hoạt động' : 'Tạm ngưng'}
                </span>
                <span style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 600 }}>
                  Mã: CLI{String(profile.id).padStart(4, '0')}
                </span>
              </div>

              <h1 className="name-lg">{profile.name}</h1>

              <div className="contact-sub">
                <span>
                  <MapPin size={13} style={{ display: 'inline', marginRight: 4, color: '#087F8C' }} />
                  {profile.address}
                </span>
                <span>
                  <Phone size={13} style={{ display: 'inline', marginRight: 4, color: '#087F8C' }} />
                  {profile.phone}
                </span>
                <span>
                  <Mail size={13} style={{ display: 'inline', marginRight: 4, color: '#087F8C' }} />
                  {profile.email}
                </span>
              </div>
            </div>
          </div>

          <div className="header-actions-group">
            <button className="btn-ws-action primary" onClick={() => setShowAssignModal(true)}>
              <UserPlus size={14} />
              <span>{language === 'vi' ? 'Gán Bác sĩ' : 'Assign Doctor'}</span>
            </button>

            <button className="btn-ws-action secondary" onClick={handleUpdateCommission}>
              <Percent size={14} />
              <span>Hoa hồng ({profile.commissionRate}%)</span>
            </button>

            <button className="btn-ws-action secondary" onClick={handleToggleStatus}>
              {profile.status === 'active' ? (
                <>
                  <PauseCircle size={14} style={{ color: '#D97706' }} />
                  <span>Tạm ngưng</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={14} style={{ color: '#059669' }} />
                  <span>Kích hoạt</span>
                </>
              )}
            </button>

            <button className="btn-ws-action secondary" onClick={() => fetchWorkspace()} title="Làm mới">
              <RotateCw size={14} />
            </button>
          </div>
        </div>

        {/* Header KPI Row */}
        <div className="header-kpi-row">
          <div className="mini-kpi">
            <div className="kpi-lbl">Tổng bác sĩ</div>
            <div className="kpi-val">{kpis.totalDoctors}</div>
          </div>
          <div className="mini-kpi">
            <div className="kpi-lbl">Chuyên khoa</div>
            <div className="kpi-val" style={{ color: '#087F8C' }}>{kpis.specialtiesCount}</div>
          </div>
          <div className="mini-kpi">
            <div className="kpi-lbl">Slot tuần này</div>
            <div className="kpi-val">{kpis.weeklySlots}</div>
          </div>
          <div className="mini-kpi">
            <div className="kpi-lbl">Lấp đầy slot</div>
            <div className="kpi-val" style={{ color: '#2563EB' }}>{kpis.utilizationRate}%</div>
          </div>
          <div className="mini-kpi">
            <div className="kpi-lbl">Ca khám hoàn tất</div>
            <div className="kpi-val" style={{ color: '#059669' }}>{kpis.completedBookings}</div>
          </div>
          <div className="mini-kpi">
            <div className="kpi-lbl">Doanh thu gộp</div>
            <div className="kpi-val" style={{ color: '#0F172A' }}>{formatCurrencyVND(kpis.grossRevenue)}</div>
          </div>
          <div className="mini-kpi">
            <div className="kpi-lbl">Đánh giá</div>
            <div className="kpi-val" style={{ color: '#D97706' }}>
              <Star size={14} style={{ display: 'inline', fill: '#D97706', marginRight: 3 }} />
              {kpis.avgRating}
            </div>
          </div>
        </div>
      </header>

      {/* Tabs Navigation */}
      <nav className="workspace-nav-tabs">
        <button
          className={`nav-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => handleTabChange('overview')}
        >
          <TrendingUp size={15} />
          <span>{language === 'vi' ? 'Tổng quan & Hiệu suất' : 'Overview & Performance'}</span>
        </button>

        <button
          className={`nav-tab-btn ${activeTab === 'doctors' ? 'active' : ''}`}
          onClick={() => handleTabChange('doctors')}
        >
          <Users size={15} />
          <span>{language === 'vi' ? `Đội ngũ Bác sĩ (${doctors.length})` : `Medical Staff (${doctors.length})`}</span>
        </button>

        <button
          className={`nav-tab-btn ${activeTab === 'specialties' ? 'active' : ''}`}
          onClick={() => handleTabChange('specialties')}
        >
          <Layers size={15} />
          <span>{language === 'vi' ? `Chuyên khoa (${specialties.length})` : `Specialties (${specialties.length})`}</span>
        </button>

        <button
          className={`nav-tab-btn ${activeTab === 'schedule' ? 'active' : ''}`}
          onClick={() => handleTabChange('schedule')}
        >
          <Calendar size={15} />
          <span>{language === 'vi' ? 'Ma trận Lịch khám tuần' : 'Weekly Schedule'}</span>
        </button>

        <button
          className={`nav-tab-btn ${activeTab === 'bookings' ? 'active' : ''}`}
          onClick={() => handleTabChange('bookings')}
        >
          <Activity size={15} />
          <span>{language === 'vi' ? `Lịch sử Ca khám (${recentBookings.length})` : `Bookings (${recentBookings.length})`}</span>
        </button>

        <button
          className={`nav-tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => handleTabChange('profile')}
        >
          <FileText size={15} />
          <span>{language === 'vi' ? 'Hồ sơ & Giới thiệu' : 'Facility Profile'}</span>
        </button>
      </nav>

      {/* Tab Content */}
      <main className="workspace-tab-card">
        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <div>
            <h3 className="tab-section-title">
              <TrendingUp size={18} style={{ color: '#087F8C' }} />
              <span>Diễn biến Đặt khám 7 Ngày qua</span>
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 24 }}>
              {performance.map((p, idx) => (
                <div
                  key={idx}
                  style={{
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: 8,
                    padding: 12,
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '0.74rem', color: '#64748B', marginBottom: 4 }}>{p.date}</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#087F8C' }}>{p.bookingsCount} ca</div>
                  <div style={{ fontSize: '0.7rem', color: '#059669', marginTop: 2 }}>{formatCurrencyVND(p.estimatedRevenue)}</div>
                </div>
              ))}
            </div>

            <h3 className="tab-section-title">
              <Layers size={18} style={{ color: '#2563EB' }} />
              <span>Chuyên khoa Phục vụ tại Cơ sở</span>
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
              {specialties.map((sp) => (
                <div
                  key={sp.id}
                  style={{
                    border: '1px solid #E2E8F0',
                    borderRadius: 8,
                    padding: 14,
                    background: '#ffffff',
                  }}
                >
                  <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.9rem', marginBottom: 6 }}>
                    {sp.name}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#64748B', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Bác sĩ thường trực:</span>
                    <strong>{sp.doctorCount} BS</strong>
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#64748B', display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                    <span>Ca khám thành công:</span>
                    <strong style={{ color: '#059669' }}>{sp.totalBookings} ca</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Doctors Staff */}
        {activeTab === 'doctors' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 className="tab-section-title" style={{ margin: 0 }}>
                <Users size={18} style={{ color: '#087F8C' }} />
                <span>Danh sách Bác sĩ Công tác tại Cơ sở</span>
              </h3>
              <button
                onClick={() => setShowAssignModal(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  background: '#087F8C',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <UserPlus size={13} />
                <span>Gán Bác sĩ Mới</span>
              </button>
            </div>

            <div className="table-responsive" style={{ minHeight: 'auto', paddingBottom: 0 }}>
              <table className="operations-table">
                <thead>
                  <tr>
                    <th>Bác sĩ</th>
                    <th>Chuyên khoa</th>
                    <th>Vị trí</th>
                    <th>Slot tuần</th>
                    <th>Ca hoàn tất</th>
                    <th>Trạng thái</th>
                    <th>Chi tiết</th>
                  </tr>
                </thead>
                <tbody>
                  {doctors.map((doc) => (
                    <tr key={doc.doctorId}>
                      <td>
                        <div className="entity-cell">
                          {doc.avatar ? (
                            <img
                              src={CommonUtils.decodeBase64Image(doc.avatar)}
                              alt={doc.doctorName}
                              className="entity-avatar"
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          ) : (
                            <div className="fallback-avatar">{doc.doctorName?.[0] || 'D'}</div>
                          )}
                          <div className="entity-info">
                            <div className="entity-name">{doc.doctorName}</div>
                            <div className="entity-sub">{doc.email || doc.phone}</div>
                          </div>
                        </div>
                      </td>
                      <td>{doc.specialtyName}</td>
                      <td>{doc.positionVi}</td>
                      <td><strong>{doc.weeklySlots} slot</strong> ({doc.occupiedSlots} đặt)</td>
                      <td style={{ color: '#059669', fontWeight: 700 }}>{doc.completedBookings} ca</td>
                      <td>
                        <span className={`status-pill ${doc.workingStatus === 'active' ? 'optimal' : 'paused'}`}>
                          ● {doc.workingStatus === 'active' ? 'Hoạt động' : 'Tạm nghỉ'}
                        </span>
                      </td>
                      <td>
                        <Link
                          to={`/system/doctors/${doc.doctorId}`}
                          style={{ color: '#087F8C', textDecoration: 'none', fontWeight: 600, fontSize: '0.8rem' }}
                        >
                          Xem Workspace &rarr;
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Specialties */}
        {activeTab === 'specialties' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 className="tab-section-title" style={{ margin: 0 }}>
                <Layers size={18} style={{ color: '#087F8C' }} />
                <span>Chuyên khoa Triển khai tại Cơ sở</span>
              </h3>
              <button
                onClick={() => setShowAssignSpecialtyModal(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  background: '#087F8C',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Plus size={13} />
                <span>Thêm Chuyên khoa vào Cơ sở</span>
              </button>
            </div>

            {hierarchySpecialties.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', background: '#F8FAFC', borderRadius: 8 }}>
                <Layers size={36} style={{ color: '#94A3B8', marginBottom: 10 }} />
                <div style={{ fontWeight: 600, color: '#334155' }}>Cơ sở chưa triển khai chuyên khoa nào</div>
                <p style={{ fontSize: '0.8rem', color: '#64748B', marginTop: 4 }}>
                  Bấm "Thêm Chuyên khoa vào Cơ sở" để chọn từ danh mục y tế toàn sàn.
                </p>
                <button
                  className="btn btn-sm btn-primary"
                  onClick={() => setShowAssignSpecialtyModal(true)}
                  style={{ background: '#087F8C', borderColor: '#087F8C' }}
                >
                  <Plus size={14} style={{ marginRight: 4 }} /> Thêm Chuyên khoa
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
                {hierarchySpecialties.map((sp) => (
                  <div
                    key={sp.id}
                    style={{
                      border: '1px solid #E2E8F0',
                      borderRadius: 10,
                      padding: 16,
                      background: '#ffffff',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {sp.specialtyAvatar ? (
                            <img
                              src={`data:image/jpeg;base64,${sp.specialtyAvatar}`}
                              alt={sp.specialtyName}
                              style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }}
                            />
                          ) : (
                            <div
                              style={{
                                width: 40,
                                height: 40,
                                borderRadius: 8,
                                background: 'rgba(8, 127, 140, 0.1)',
                                color: '#087F8C',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                              }}
                            >
                              CK
                            </div>
                          )}
                          <div>
                            <h4 style={{ margin: 0, fontSize: '0.98rem', color: '#0F172A', fontWeight: 700 }}>
                              {sp.specialtyName}
                            </h4>
                            <span style={{ fontSize: '0.72rem', color: sp.status === 'active' ? '#059669' : '#D97706' }}>
                              ● {sp.status === 'active' ? 'Đang nhận bệnh' : 'Tạm dừng'}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleUnassignSpecialty(sp)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#EF4444',
                            cursor: 'pointer',
                            padding: 4,
                          }}
                          title="Gỡ chuyên khoa khỏi cơ sở"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      <p style={{ margin: '0 0 12px 0', fontSize: '0.78rem', color: '#64748B', lineHeight: 1.4 }}>
                        {sp.description || 'Chuyên khoa thuộc danh mục khám chữa bệnh của cơ sở.'}
                      </p>

                      <div style={{ background: '#F8FAFC', borderRadius: 6, padding: '8px 10px', fontSize: '0.76rem', marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ color: '#64748B' }}>Trưởng khoa:</span>
                          <strong style={{ color: '#0F172A' }}>{sp.headDoctor?.name || 'Chưa bổ nhiệm'}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ color: '#64748B' }}>Bác sĩ thường trực:</span>
                          <strong style={{ color: '#087F8C' }}>{sp.activeDoctorsCount} BS hoạt động</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#64748B' }}>Chỉ tiêu công suất:</span>
                          <strong style={{ color: '#059669' }}>{sp.targetCapacity || 50} ca/tuần</strong>
                        </div>
                      </div>
                    </div>

                    <Link
                      to={`/system/clinics/${id}/specialties/${sp.specialtyId}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        padding: '8px 12px',
                        background: 'rgba(8, 127, 140, 0.08)',
                        color: '#087F8C',
                        borderRadius: 6,
                        textDecoration: 'none',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        border: '1px solid rgba(8, 127, 140, 0.2)',
                      }}
                    >
                      <span>Vào Chuyên khoa</span>
                      <ExternalLink size={13} />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Schedule */}
        {activeTab === 'schedule' && (
          <div>
            <h3 className="tab-section-title">
              <Calendar size={18} style={{ color: '#087F8C' }} />
              <span>Lịch khám Tuần của Cơ sở</span>
            </h3>
            <div className="table-responsive" style={{ minHeight: 'auto', paddingBottom: 0 }}>
              <table className="operations-table">
                <thead>
                  <tr>
                    <th>Bác sĩ trực</th>
                    <th>Khung giờ</th>
                    <th>Đã đặt / Tối đa</th>
                    <th>Tỷ lệ lấp đầy</th>
                  </tr>
                </thead>
                <tbody>
                  {weeklySchedule.map((slot) => {
                    const fill = slot.maxNumber > 0 ? Math.round((slot.currentNumber / slot.maxNumber) * 100) : 0;
                    return (
                      <tr key={slot.id}>
                        <td style={{ fontWeight: 600 }}>{slot.doctorName}</td>
                        <td>{slot.timeVi}</td>
                        <td>{slot.currentNumber} / {slot.maxNumber}</td>
                        <td>
                          <span className={`status-pill ${fill > 70 ? 'optimal' : 'low_capacity'}`}>
                            {fill}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 5: Bookings */}
        {activeTab === 'bookings' && (
          <div>
            <h3 className="tab-section-title">
              <Activity size={18} style={{ color: '#087F8C' }} />
              <span>Lịch sử Ca khám tại Cơ sở</span>
            </h3>
            <div className="table-responsive" style={{ minHeight: 'auto', paddingBottom: 0 }}>
              <table className="operations-table">
                <thead>
                  <tr>
                    <th>Bệnh nhân</th>
                    <th>Số điện thoại</th>
                    <th>Bác sĩ phụ trách</th>
                    <th>Khung giờ</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {recentBookings.map((b) => (
                    <tr key={b.id}>
                      <td style={{ fontWeight: 600 }}>{b.patientName}</td>
                      <td>{b.patientPhone}</td>
                      <td>{b.doctorName}</td>
                      <td>{b.timeVi}</td>
                      <td>
                        <span className={`status-pill ${b.statusId === 'S3' ? 'optimal' : b.statusId === 'S4' ? 'paused' : 'low_capacity'}`}>
                          ● {b.statusVi}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 6: Profile & Description */}
        {activeTab === 'profile' && (
          <div>
            <h3 className="tab-section-title">
              <FileText size={18} style={{ color: '#087F8C' }} />
              <span>Hồ sơ & Giới thiệu Cơ sở Y tế</span>
            </h3>

            <div style={{ marginBottom: 20 }}>
              <h4 style={{ fontSize: '0.9rem', color: '#334155', marginBottom: 8 }}>Mô tả Markdown:</h4>
              <div
                style={{
                  background: '#F8FAFC',
                  padding: 16,
                  borderRadius: 8,
                  border: '1px solid #E2E8F0',
                  fontSize: '0.84rem',
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'monospace',
                }}
              >
                {profile.descriptionMarkdown || 'Chưa có mô tả chi tiết'}
              </div>
            </div>

            {profile.descriptionHTML && (
              <div>
                <h4 style={{ fontSize: '0.9rem', color: '#334155', marginBottom: 8 }}>Xem trước HTML:</h4>
                <div
                  style={{
                    padding: 16,
                    borderRadius: 8,
                    border: '1px solid #E2E8F0',
                    background: '#ffffff',
                    fontSize: '0.88rem',
                    lineHeight: 1.6,
                  }}
                  dangerouslySetInnerHTML={{ __html: profile.descriptionHTML }}
                />
              </div>
            )}
          </div>
        )}
      </main>

      {/* Assign Doctor Modal */}
      {showAssignModal && (
        <AssignDoctorModal
          isOpen={showAssignModal}
          clinic={profile}
          onClose={() => setShowAssignModal(false)}
          onSuccess={() => fetchWorkspace()}
        />
      )}

      {/* Assign Specialty Modal */}
      <AssignSpecialtyModal
        isOpen={showAssignSpecialtyModal}
        onClose={() => setShowAssignSpecialtyModal(false)}
        clinicId={id}
        clinicName={profile.name}
        availableSpecialties={availableSpecialties}
        clinicDoctors={doctors}
        onSuccess={() => {
          fetchHierarchySpecialties();
          fetchWorkspace();
        }}
      />
    </div>
  );
};

export default ClinicControlCenter;
