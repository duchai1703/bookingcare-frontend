// src/containers/System/Admin/Specialty/SpecialtyDetailWorkspace.jsx
// Medical Discipline Intelligence Hub & Clinical Workspace
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Layers,
  ArrowLeft,
  Users,
  Building2,
  TrendingUp,
  FileText,
  Activity,
  CheckCircle2,
  PauseCircle,
  Tag,
  RotateCw,
  Clock,
  Star,
} from 'lucide-react';
import {
  getAdminSpecialtyWorkspace,
  updateSpecialtyWorkingStatus,
} from '../../../../services/specialtyManageService';
import CommonUtils from '../../../../utils/CommonUtils';
import '../MedicalOperations.scss';

const formatCurrencyVND = (amount) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
};

const SpecialtyDetailWorkspace = () => {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'overview';
  const [activeTab, setActiveTab] = useState(initialTab);
  const language = useSelector((state) => state.app.language) || 'vi';

  const [specialtyData, setSpecialtyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchWorkspace = useCallback(async (signal) => {
    setLoading(true);
    setError('');
    try {
      const res = await getAdminSpecialtyWorkspace(id, { signal });
      if (res && res.errCode === 0) {
        setSpecialtyData(res.data);
      } else {
        setError(res?.errMessage || 'Không thể tải trung tâm chuyên khoa');
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
    if (!specialtyData) return;
    const nextStatus = specialtyData.profile.status === 'active' ? 'paused' : 'active';
    try {
      const res = await updateSpecialtyWorkingStatus(id, { status: nextStatus });
      if (res && res.errCode === 0) {
        fetchWorkspace();
      } else {
        alert(res?.errMessage || 'Không thể cập nhật trạng thái');
      }
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  if (loading && !specialtyData) {
    return (
      <div className="operations-workspace-container" style={{ textAlign: 'center', padding: '80px 0' }}>
        <RotateCw size={32} className="fa-spin" style={{ color: '#087F8C', marginBottom: 12 }} />
        <div style={{ color: '#64748B', fontSize: '0.9rem' }}>Đang nạp dữ liệu Specialty Intelligence Hub...</div>
      </div>
    );
  }

  if (error || !specialtyData) {
    return (
      <div className="operations-workspace-container" style={{ padding: 30 }}>
        <Link to="/system/specialties" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#087F8C', textDecoration: 'none', marginBottom: 16 }}>
          <ArrowLeft size={16} /> Quay lại danh sách chuyên khoa
        </Link>
        <div style={{ padding: 20, background: '#FEF2F2', color: '#B91C1C', borderRadius: 8 }}>
          {error || 'Không tìm thấy chuyên khoa'}
        </div>
      </div>
    );
  }

  const { profile, kpis, doctors, clinics, priceLevels, demandIntelligence, recentBookings } = specialtyData;

  return (
    <div className="operations-workspace-container">
      {/* Breadcrumb */}
      <nav className="workspace-breadcrumb">
        <Link to="/system/specialties">
          <ArrowLeft size={14} />
          <span>{language === 'vi' ? 'Quản lý Chuyên khoa' : 'Specialties Hub'}</span>
        </Link>
        <span className="bc-separator">/</span>
        <span className="bc-current">{profile.name}</span>
      </nav>

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
              {profile.name?.[0] || 'S'}
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
                  ● {profile.status === 'active' ? 'Đang tiếp nhận' : 'Tạm dừng'}
                </span>
                <span style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 600 }}>
                  Mã: SPC{String(profile.id).padStart(4, '0')}
                </span>
              </div>

              <h1 className="name-lg">{profile.name}</h1>
              <div className="contact-sub">
                <span>Chuyên khoa trọng điểm của hệ thống BookingCare</span>
                <span>Chỉ tiêu năng lực: {profile.targetCapacity} ca/tuần</span>
              </div>
            </div>
          </div>

          <div className="header-actions-group">
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
            <div className="kpi-lbl">Bác sĩ chuyên khoa</div>
            <div className="kpi-val" style={{ color: '#087F8C' }}>{kpis.totalDoctors}</div>
          </div>
          <div className="mini-kpi">
            <div className="kpi-lbl">Bệnh viện tiếp nhận</div>
            <div className="kpi-val">{kpis.clinicsCount}</div>
          </div>
          <div className="mini-kpi">
            <div className="kpi-lbl">Ca khám hoàn tất</div>
            <div className="kpi-val" style={{ color: '#059669' }}>{kpis.completedBookings}</div>
          </div>
          <div className="mini-kpi">
            <div className="kpi-lbl">Tăng trưởng</div>
            <div className="kpi-val" style={{ color: '#2563EB' }}>{kpis.growthRate}</div>
          </div>
          <div className="mini-kpi">
            <div className="kpi-lbl">Tỷ lệ hủy ca</div>
            <div className="kpi-val" style={{ color: kpis.cancellationRate > 15 ? '#E11D48' : '#64748B' }}>
              {kpis.cancellationRate}%
            </div>
          </div>
          <div className="mini-kpi">
            <div className="kpi-lbl">Doanh thu gộp</div>
            <div className="kpi-val" style={{ color: '#0F172A' }}>{formatCurrencyVND(kpis.grossRevenue)}</div>
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
          <span>{language === 'vi' ? 'Tổng quan & Cung - Cầu' : 'Demand Intelligence'}</span>
        </button>

        <button
          className={`nav-tab-btn ${activeTab === 'doctors' ? 'active' : ''}`}
          onClick={() => handleTabChange('doctors')}
        >
          <Users size={15} />
          <span>{language === 'vi' ? `Bác sĩ Chuyên khoa (${doctors.length})` : `Specialists (${doctors.length})`}</span>
        </button>

        <button
          className={`nav-tab-btn ${activeTab === 'clinics' ? 'active' : ''}`}
          onClick={() => handleTabChange('clinics')}
        >
          <Building2 size={15} />
          <span>{language === 'vi' ? `Mạng lưới Cơ sở (${clinics.length})` : `Hospitals (${clinics.length})`}</span>
        </button>

        <button
          className={`nav-tab-btn ${activeTab === 'pricing' ? 'active' : ''}`}
          onClick={() => handleTabChange('pricing')}
        >
          <Tag size={15} />
          <span>{language === 'vi' ? 'Khung giá Dịch vụ' : 'Price Tiers'}</span>
        </button>

        <button
          className={`nav-tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => handleTabChange('profile')}
        >
          <FileText size={15} />
          <span>{language === 'vi' ? 'Hồ sơ & Phác đồ' : 'Clinical Guidelines'}</span>
        </button>
      </nav>

      {/* Tab Content */}
      <main className="workspace-tab-card">
        {/* Tab 1: Demand Intelligence */}
        {activeTab === 'overview' && (
          <div>
            <h3 className="tab-section-title">
              <TrendingUp size={18} style={{ color: '#087F8C' }} />
              <span>Chỉ số Nhu cầu Khám & Khung giờ Cao điểm</span>
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 24 }}>
              <div style={{ border: '1px solid #E2E8F0', borderRadius: 8, padding: 14, background: '#F8FAFC' }}>
                <div style={{ fontSize: '0.74rem', color: '#64748B', marginBottom: 4 }}>Trạng thái nhu cầu</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#087F8C' }}>{demandIntelligence.demandSummary}</div>
                <div style={{ fontSize: '0.72rem', color: '#059669', marginTop: 4 }}>Dựa trên lưu lượng booking toàn quốc</div>
              </div>

              <div style={{ border: '1px solid #E2E8F0', borderRadius: 8, padding: 14, background: '#F8FAFC' }}>
                <div style={{ fontSize: '0.74rem', color: '#64748B', marginBottom: 4 }}>Khung giờ cao điểm nhất</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#2563EB' }}>{demandIntelligence.peakHour}</div>
                <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: 4 }}>
                  Sáng: {demandIntelligence.morningBookings} ca • Chiều: {demandIntelligence.afternoonBookings} ca
                </div>
              </div>

              <div style={{ border: '1px solid #E2E8F0', borderRadius: 8, padding: 14, background: '#F8FAFC' }}>
                <div style={{ fontSize: '0.74rem', color: '#64748B', marginBottom: 4 }}>Mức độ hài lòng</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#D97706' }}>
                  <Star size={16} style={{ display: 'inline', fill: '#D97706', marginRight: 4 }} />
                  {kpis.avgRating} / 5.0
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: 4 }}>Đánh giá thực tế từ bệnh nhân</div>
              </div>
            </div>

            <h3 className="tab-section-title">
              <Activity size={18} style={{ color: '#059669' }} />
              <span>Ca khám Gần đây của Chuyên khoa</span>
            </h3>

            <div className="table-responsive" style={{ minHeight: 'auto', paddingBottom: 0 }}>
              <table className="operations-table">
                <thead>
                  <tr>
                    <th>Bệnh nhân</th>
                    <th>Bác sĩ thực hiện</th>
                    <th>Khung giờ</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {recentBookings.map((b) => (
                    <tr key={b.id}>
                      <td style={{ fontWeight: 600 }}>{b.patientName}</td>
                      <td>{b.doctorName}</td>
                      <td>{b.timeVi}</td>
                      <td>
                        <span className="status-pill optimal">● {b.statusVi}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Specialists */}
        {activeTab === 'doctors' && (
          <div>
            <h3 className="tab-section-title">
              <Users size={18} style={{ color: '#087F8C' }} />
              <span>Đội ngũ Bác sĩ thuộc Chuyên khoa</span>
            </h3>
            <div className="table-responsive" style={{ minHeight: 'auto', paddingBottom: 0 }}>
              <table className="operations-table">
                <thead>
                  <tr>
                    <th>Bác sĩ</th>
                    <th>Bệnh viện / Cơ sở</th>
                    <th>Học hàm / Vị trí</th>
                    <th>Ca hoàn tất</th>
                    <th>Trạng thái</th>
                    <th>Hành động</th>
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
                      <td style={{ fontWeight: 600 }}>{doc.clinicName}</td>
                      <td>{doc.positionVi}</td>
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

        {/* Tab 3: Clinics Network */}
        {activeTab === 'clinics' && (
          <div>
            <h3 className="tab-section-title">
              <Building2 size={18} style={{ color: '#087F8C' }} />
              <span>Mạng lưới Cơ sở Triển khai Chuyên khoa</span>
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
              {clinics.map((c) => (
                <div key={c.id} style={{ border: '1px solid #E2E8F0', borderRadius: 8, padding: 16, background: '#ffffff' }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '1rem', color: '#0F172A', fontWeight: 700 }}>{c.name}</h4>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748B', marginBottom: 6 }}>
                    <span>Bác sĩ thường trực:</span>
                    <strong>{c.doctorCount} BS</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748B', marginBottom: 12 }}>
                    <span>Lượt khám thành công:</span>
                    <strong style={{ color: '#059669' }}>{c.totalBookings} ca</strong>
                  </div>
                  <Link
                    to={`/system/clinics/${c.id}`}
                    style={{ color: '#087F8C', fontSize: '0.78rem', textDecoration: 'none', fontWeight: 700 }}
                  >
                    Xem Control Center của Viện &rarr;
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Price Tiers */}
        {activeTab === 'pricing' && (
          <div>
            <h3 className="tab-section-title">
              <Tag size={18} style={{ color: '#087F8C' }} />
              <span>Khung Giá Dịch vụ Tiêu chuẩn</span>
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
              {priceLevels.map((p, idx) => (
                <div key={idx} style={{ border: '1px solid #E2E8F0', borderRadius: 8, padding: 14, background: '#F8FAFC', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.74rem', color: '#64748B', marginBottom: 4 }}>Mức giá tiêu chuẩn #{idx + 1}</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#087F8C' }}>{p}</div>
                  <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: 4 }}>Áp dụng cho khám lâm sàng</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 5: Profile */}
        {activeTab === 'profile' && (
          <div>
            <h3 className="tab-section-title">
              <FileText size={18} style={{ color: '#087F8C' }} />
              <span>Hồ sơ Chuyên môn & Tài liệu Y khoa</span>
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
                {profile.descriptionMarkdown || 'Chưa có tài liệu chuyên môn'}
              </div>
            </div>

            {profile.descriptionHTML && (
              <div>
                <h4 style={{ fontSize: '0.9rem', color: '#334155', marginBottom: 8 }}>Nội dung giới thiệu bệnh học (HTML):</h4>
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
    </div>
  );
};

export default SpecialtyDetailWorkspace;
