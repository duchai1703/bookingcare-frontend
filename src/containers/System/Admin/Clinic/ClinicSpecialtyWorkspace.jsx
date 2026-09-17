import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  Hospital,
  Activity,
  UserCheck,
  Calendar,
  DollarSign,
  Plus,
  ArrowLeft,
  Settings,
  MoreVertical,
  Edit,
  ExternalLink,
  UserMinus,
  ShieldCheck,
} from 'lucide-react';
import ContextBreadcrumbs from '../../../../components/ContextBreadcrumbs/ContextBreadcrumbs';
import AssignDoctorToSpecialtyModal from './AssignDoctorToSpecialtyModal';
import clinicHierarchyService from '../../../../services/clinicHierarchyService';
import '../MedicalOperations.scss';

const ClinicSpecialtyWorkspace = () => {
  const { clinicId, specialtyId } = useParams();
  const navigate = useNavigate();

  const [workspaceData, setWorkspaceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeMenuId, setActiveMenuId] = useState(null);

  // Modal State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);

  const fetchWorkspace = async () => {
    setLoading(true);
    try {
      const res = await clinicHierarchyService.getClinicSpecialtyWorkspace(clinicId, specialtyId);
      if (res && res.errCode === 0) {
        setWorkspaceData(res.data);
      } else {
        toast.error(res?.message || 'Không thể tải dữ liệu chuyên khoa tại cơ sở');
      }
    } catch (error) {
      console.error('Error fetching clinic specialty workspace:', error);
      toast.error('Lỗi khi tải thông tin chuyên khoa');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (clinicId && specialtyId) {
      fetchWorkspace();
    }
  }, [clinicId, specialtyId]);

  // Đóng dropdown menu khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.action-menu-dropdown')) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleOpenEdit = (assignment) => {
    setEditingAssignment(assignment);
    setIsAssignModalOpen(true);
    setActiveMenuId(null);
  };

  const handleOpenCreate = () => {
    setEditingAssignment(null);
    setIsAssignModalOpen(true);
  };

  const handleUnassignDoctor = async (assignment) => {
    setActiveMenuId(null);
    if (!window.confirm(`Bạn có chắc chắn muốn rút bác sĩ ${assignment.doctorName} khỏi chuyên khoa tại cơ sở này không?`)) {
      return;
    }

    try {
      const res = await clinicHierarchyService.unassignDoctorFromClinicSpecialty(assignment.id);
      if (res && res.errCode === 0) {
        toast.success(res.message || 'Rút bác sĩ khỏi chuyên khoa thành công!');
        fetchWorkspace();
      } else {
        toast.error(res?.message || 'Không thể rút bác sĩ khỏi chuyên khoa');
      }
    } catch (error) {
      console.error('Error unassigning doctor:', error);
      toast.error(error?.response?.data?.message || 'Lỗi khi rút bác sĩ');
    }
  };

  if (loading && !workspaceData) {
    return (
      <div className="medical-operations-container">
        <div className="text-center py-5">
          <div className="spinner-border text-teal" role="status"></div>
          <p className="mt-2 text-muted">Đang tải Trung tâm Điều hành Chuyên khoa tại Cơ sở...</p>
        </div>
      </div>
    );
  }

  const { clinic, specialty, clinicSpecialty, assignments = [], availableDoctors = [], kpis = {} } = workspaceData || {};

  const breadcrumbs = [
    { label: 'Cơ sở Y tế', path: '/system/clinics', icon: <Hospital size={14} /> },
    { label: clinic?.name || 'Cơ sở', path: `/system/clinics/${clinicId}?tab=specialties` },
    { label: specialty?.name || 'Chuyên khoa', badge: 'Khoa trực thuộc' },
  ];

  return (
    <div className="medical-operations-container">
      {/* 1. Context Breadcrumbs Bar */}
      <ContextBreadcrumbs items={breadcrumbs} />

      {/* 2. Context Header Banner */}
      <div className="workspace-header-card mb-4">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
          <div className="d-flex align-items-center gap-3">
            {specialty?.avatar ? (
              <img
                src={`data:image/jpeg;base64,${specialty.avatar}`}
                alt={specialty.name}
                className="workspace-avatar"
                style={{ width: '64px', height: '64px', borderRadius: '12px', objectFit: 'cover' }}
              />
            ) : (
              <div
                className="workspace-avatar-placeholder"
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '12px',
                  background: 'rgba(56, 189, 248, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#38bdf8',
                }}
              >
                <Activity size={32} />
              </div>
            )}
            <div>
              <div className="d-flex align-items-center gap-2 mb-1">
                <span className="badge bg-teal" style={{ background: '#0ea5e9' }}>
                  🏥 {clinic?.name}
                </span>
                <span className={`badge ${clinicSpecialty?.status === 'active' ? 'bg-success' : 'bg-warning'}`}>
                  ● {clinicSpecialty?.status === 'active' ? 'Đang nhận bệnh' : 'Tạm dừng'}
                </span>
              </div>
              <h2 className="workspace-title mb-1" style={{ fontSize: '1.6rem', color: '#f8fafc' }}>
                Khoa {specialty?.name}
              </h2>
              <p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>
                {clinicSpecialty?.description || `Chuyên khoa triển khai tại ${clinic?.name}`}
                {clinicSpecialty?.headDoctorName && (
                  <span className="ms-2 text-info">
                    &bull; Trưởng khoa: <strong>{clinicSpecialty.headDoctorName}</strong>
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="d-flex align-items-center gap-2">
            <button
              type="button"
              className="btn btn-outline-secondary d-flex align-items-center gap-2"
              onClick={() => navigate(`/system/clinics/${clinicId}?tab=specialties`)}
            >
              <ArrowLeft size={16} /> Quay lại Cơ sở
            </button>
            <button
              type="button"
              className="btn btn-primary d-flex align-items-center gap-2"
              onClick={handleOpenCreate}
            >
              <Plus size={16} /> Phân bổ Bác sĩ vào Khoa
            </button>
          </div>
        </div>
      </div>

      {/* 3. KPI Strip */}
      <div className="row g-3 mb-4">
        <div className="col-md-3 col-sm-6">
          <div className="kpi-metric-card">
            <div className="kpi-icon-box bg-blue">
              <UserCheck size={22} />
            </div>
            <div className="kpi-info">
              <span className="kpi-label">Tổng Bác sĩ Phân bổ</span>
              <h3 className="kpi-value">{kpis.totalDoctors || 0}</h3>
              <span className="kpi-subtext text-success">
                {kpis.activeDoctors || 0} đang nhận bệnh
              </span>
            </div>
          </div>
        </div>

        <div className="col-md-3 col-sm-6">
          <div className="kpi-metric-card">
            <div className="kpi-icon-box bg-teal">
              <Calendar size={22} />
            </div>
            <div className="kpi-info">
              <span className="kpi-label">Chỉ tiêu Công suất</span>
              <h3 className="kpi-value">{kpis.targetCapacity || 50}</h3>
              <span className="kpi-subtext text-info">Ca khám / tuần</span>
            </div>
          </div>
        </div>

        <div className="col-md-3 col-sm-6">
          <div className="kpi-metric-card">
            <div className="kpi-icon-box bg-emerald">
              <ShieldCheck size={22} />
            </div>
            <div className="kpi-info">
              <span className="kpi-label">Ca Khám Hoàn thành</span>
              <h3 className="kpi-value">{kpis.totalDeptCompleted || 0}</h3>
              <span className="kpi-subtext text-muted">Trọn đời tại cơ sở</span>
            </div>
          </div>
        </div>

        <div className="col-md-3 col-sm-6">
          <div className="kpi-metric-card">
            <div className="kpi-icon-box bg-purple">
              <DollarSign size={22} />
            </div>
            <div className="kpi-info">
              <span className="kpi-label">Doanh thu Chuyên khoa</span>
              <h3 className="kpi-value">
                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(kpis.totalDeptRevenue || 0)}
              </h3>
              <span className="kpi-subtext text-muted">Từ bác sĩ trực thuộc</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Table of Doctor Assignments */}
      <div className="master-table-card">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h5 className="mb-0 text-light fw-bold">Đội ngũ Bác sĩ Công tác tại Khoa</h5>
            <small className="text-muted">
              Quản lý phân bổ, xếp phòng khám, giá dịch vụ và hoa hồng riêng cho từng bác sĩ tại cơ sở này.
            </small>
          </div>
          <span className="badge bg-secondary">
            {assignments.length} Bác sĩ được phân bổ
          </span>
        </div>

        {assignments.length === 0 ? (
          <div className="empty-state py-5 text-center">
            <UserCheck size={48} className="text-muted mb-3" />
            <h5 className="text-light">Chưa có bác sĩ nào được phân bổ vào chuyên khoa này</h5>
            <p className="text-muted">
              Hãy nhấn nút <strong>"Phân bổ Bác sĩ vào Khoa"</strong> để chọn bác sĩ từ danh bạ y tế.
            </p>
            <button
              type="button"
              className="btn btn-primary btn-sm mt-2"
              onClick={handleOpenCreate}
            >
              <Plus size={14} /> Phân bổ Bác sĩ ngay
            </button>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table operations-table mb-0">
              <thead>
                <tr>
                  <th>BÁC SĨ</th>
                  <th>PHÒNG KHÁM</th>
                  <th>GIÁ DỊCH VỤ</th>
                  <th>HOA HỒNG</th>
                  <th>NƠI LÀM VIỆC CHÍNH</th>
                  <th>TRẠNG THÁI</th>
                  <th>CA KHÁM / DOANH THU</th>
                  <th className="text-end">THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        {a.avatar ? (
                          <img
                            src={`data:image/jpeg;base64,${a.avatar}`}
                            alt={a.doctorName}
                            className="entity-avatar"
                          />
                        ) : (
                          <div className="entity-avatar-placeholder">BS</div>
                        )}
                        <div>
                          <div className="fw-bold text-light">{a.doctorName}</div>
                          <small className="text-muted">{a.email}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="badge bg-dark border border-secondary text-info">
                        📍 {a.roomNumber}
                      </span>
                    </td>
                    <td>
                      <strong className="text-teal">{a.priceText}</strong>
                    </td>
                    <td>
                      <span className="badge bg-secondary">{a.commissionRate}%</span>
                    </td>
                    <td>
                      {a.isPrimary ? (
                        <span className="badge bg-success">★ Cơ sở chính</span>
                      ) : (
                        <span className="badge bg-dark text-muted">Cơ sở kiêm nhiệm</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${a.workingStatus === 'active' ? 'bg-success' : 'bg-warning'}`}>
                        ● {a.workingStatus === 'active' ? 'Đang nhận bệnh' : 'Tạm dừng'}
                      </span>
                    </td>
                    <td>
                      <div className="small text-light">
                        <strong>{a.totalCompletedBookings}</strong> ca hoàn tất
                      </div>
                      <small className="text-muted">
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(a.totalRevenue)}
                      </small>
                    </td>
                    <td className="text-end">
                      <div className="action-menu-dropdown position-relative d-inline-block">
                        <button
                          type="button"
                          className="btn-action-trigger"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(activeMenuId === a.id ? null : a.id);
                          }}
                        >
                          <MoreVertical size={16} />
                        </button>

                        {activeMenuId === a.id && (
                          <div className="action-dropdown-menu">
                            <button
                              type="button"
                              className="dropdown-item"
                              onClick={() => handleOpenEdit(a)}
                            >
                              <Edit size={14} /> Chỉnh sửa phân bổ
                            </button>
                            <button
                              type="button"
                              className="dropdown-item"
                              onClick={() => {
                                setActiveMenuId(null);
                                navigate(`/system/doctors/${a.doctorId}`);
                              }}
                            >
                              <ExternalLink size={14} /> Xem Hồ sơ Bác sĩ
                            </button>
                            <div className="dropdown-divider"></div>
                            <button
                              type="button"
                              className="dropdown-item text-danger"
                              onClick={() => handleUnassignDoctor(a)}
                            >
                              <UserMinus size={14} /> Rút khỏi chuyên khoa
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Modal Phân bổ / Chỉnh sửa Bác sĩ */}
      <AssignDoctorToSpecialtyModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        clinicId={clinicId}
        specialtyId={specialtyId}
        clinicName={clinic?.name || ''}
        specialtyName={specialty?.name || ''}
        availableDoctors={availableDoctors}
        editData={editingAssignment}
        onSuccess={fetchWorkspace}
      />
    </div>
  );
};

export default ClinicSpecialtyWorkspace;
