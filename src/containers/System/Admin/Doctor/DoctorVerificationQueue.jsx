import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getAdminVerificationQueue } from '../../../../services/doctorOnboardingService';
import DoctorVerificationReviewModal from './DoctorVerificationReviewModal';
import './DoctorVerificationQueue.scss';

const TABS = [
  { key: 'ALL', label: 'Tất cả hồ sơ', badgeKey: 'all', icon: 'fa-list-ul' },
  { key: 'SUBMITTED', label: 'Chờ thẩm định', badgeKey: 'submitted', icon: 'fa-clock', alert: true },
  { key: 'CHANGES_REQUESTED', label: 'Cần bổ sung', badgeKey: 'changesRequested', icon: 'fa-exclamation-circle' },
  { key: 'APPROVED', label: 'Đã phê duyệt', badgeKey: 'approved', icon: 'fa-check-circle' },
  { key: 'REJECTED', label: 'Đã từ chối', badgeKey: 'rejected', icon: 'fa-times-circle' },
];

const DoctorVerificationQueue = () => {
  const navigate = useNavigate();
  const [currentTab, setCurrentTab] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [queueData, setQueueData] = useState({
    items: [],
    totalItems: 0,
    totalPages: 1,
    currentPage: 1,
    summary: { all: 0, submitted: 0, changesRequested: 0, approved: 0, rejected: 0 },
  });

  // Review Modal State
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchQueue = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getAdminVerificationQueue({
        status: currentTab,
        search: searchTerm,
        page: 1,
        limit: 20,
      });

      if (res && res.errCode === 0) {
        setQueueData(res.data);
      } else {
        toast.error(res.message || 'Lỗi khi tải danh sách thẩm định!');
      }
    } catch (err) {
      console.error('Error fetching verification queue:', err);
      toast.error('Không thể kết nối đến máy chủ!');
    } finally {
      setLoading(false);
    }
  }, [currentTab, searchTerm]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const handleOpenReview = (request) => {
    setSelectedRequest(request);
    setIsModalOpen(true);
  };

  const handleCloseReview = () => {
    setIsModalOpen(false);
    setSelectedRequest(null);
  };

  return (
    <div className="doctor-verification-queue-page">
      {/* Header & Breadcrumb */}
      <div className="page-header-wrapper">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <div className="page-breadcrumb">
              <span>Hệ thống</span> / <span>Vận hành Y tế</span> / <span className="active">Thẩm định Bác sĩ</span>
            </div>
            <h2 className="page-title">Hàng Đợi Thẩm Định Hồ Sơ Bác Sĩ (Doctor Verification Queue)</h2>
            <p className="page-desc">
              Kiểm duyệt hồ sơ Bác sĩ tự đăng ký, xác minh Giấy phép hành nghề y tế (CCHN) và tự động kích hoạt tài khoản liên kết toàn hệ thống.
            </p>
          </div>
          <div className="header-action-buttons">
            <button
              className="btn btn-outline-primary me-2"
              onClick={fetchQueue}
              disabled={loading}
              title="Làm mới dữ liệu"
            >
              <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''} me-2`}></i>Làm mới
            </button>
            <button
              className="btn btn-primary"
              onClick={() => navigate('/doctor-register')}
              target="_blank"
            >
              <i className="fas fa-plus me-2"></i>Mở Form Đăng Ký Mẫu
            </button>
          </div>
        </div>

        {/* KPI Metrics Cards */}
        <div className="kpi-metrics-row mt-4">
          <div className="kpi-card glass-panel card-all">
            <div className="kpi-icon"><i className="fas fa-folder-open"></i></div>
            <div className="kpi-body">
              <span className="kpi-label">Tổng hồ sơ tiếp nhận</span>
              <h3 className="kpi-value">{queueData.summary.all}</h3>
            </div>
          </div>

          <div className="kpi-card glass-panel card-submitted">
            <div className="kpi-icon"><i className="fas fa-hourglass-half"></i></div>
            <div className="kpi-body">
              <span className="kpi-label">Chờ thẩm định ngay</span>
              <h3 className="kpi-value text-primary">{queueData.summary.submitted}</h3>
            </div>
            {queueData.summary.submitted > 0 && <span className="kpi-tag">Cần xử lý</span>}
          </div>

          <div className="kpi-card glass-panel card-changes">
            <div className="kpi-icon"><i className="fas fa-exclamation-triangle"></i></div>
            <div className="kpi-body">
              <span className="kpi-label">Yêu cầu bổ sung</span>
              <h3 className="kpi-value text-warning">{queueData.summary.changesRequested}</h3>
            </div>
          </div>

          <div className="kpi-card glass-panel card-approved">
            <div className="kpi-icon"><i className="fas fa-user-check"></i></div>
            <div className="kpi-body">
              <span className="kpi-label">Bác sĩ đã kích hoạt</span>
              <h3 className="kpi-value text-success">{queueData.summary.approved}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area: Tabs + Filters + Table */}
      <div className="content-card glass-panel mt-4">
        {/* Nav Tabs */}
        <div className="queue-tabs-row d-flex justify-content-between align-items-center">
          <div className="nav-tabs-wrapper">
            {TABS.map(tab => {
              const count = queueData.summary[tab.badgeKey] || 0;
              const isActive = currentTab === tab.key;
              return (
                <button
                  key={tab.key}
                  className={`queue-tab-btn ${isActive ? 'active' : ''}`}
                  onClick={() => setCurrentTab(tab.key)}
                >
                  <i className={`fas ${tab.icon} me-2`}></i>
                  {tab.label}
                  <span className={`badge-count ${tab.alert && count > 0 ? 'badge-alert' : ''}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="search-box-wrapper">
            <div className="input-group">
              <span className="input-group-text"><i className="fas fa-search"></i></span>
              <input
                type="text"
                className="form-control"
                placeholder="Tìm theo tên, email, sđt, CCHN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button className="btn btn-clear-search" onClick={() => setSearchTerm('')}>
                  <i className="fas fa-times"></i>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Table View */}
        <div className="table-responsive mt-3">
          <table className="table custom-queue-table align-middle">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>#</th>
                <th style={{ width: '280px' }}>Bác sĩ ứng viên</th>
                <th style={{ width: '200px' }}>Chuyên khoa đề xuất</th>
                <th style={{ width: '220px' }}>Cơ sở y tế công tác</th>
                <th style={{ width: '160px' }}>Số CCHN</th>
                <th style={{ width: '150px' }}>Độ hoàn thiện</th>
                <th style={{ width: '150px' }}>Cảnh báo hệ thống</th>
                <th style={{ width: '140px' }}>Trạng thái</th>
                <th style={{ width: '130px' }} className="text-end">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" className="text-center py-5">
                    <div className="spinner-border text-primary me-2"></div>
                    <span>Đang tải hàng đợi thẩm định...</span>
                  </td>
                </tr>
              ) : queueData.items && queueData.items.length > 0 ? (
                queueData.items.map((item, idx) => {
                  const riskCount = Array.isArray(item.riskFlags) ? item.riskFlags.length : 0;
                  return (
                    <tr key={item.id} className={`queue-row row-status-${item.status.toLowerCase()}`}>
                      <td className="text-muted small">{idx + 1}</td>

                      {/* Doctor Profile */}
                      <td>
                        <div className="doctor-cell d-flex align-items-center">
                          <div className="doc-avatar-wrap me-3">
                            {item.avatar ? (
                              <img src={item.avatar} alt="Avatar" />
                            ) : (
                              <div className="placeholder-avatar"><i className="fas fa-user-md"></i></div>
                            )}
                          </div>
                          <div className="doc-meta">
                            <span className="doc-name fw-bold d-block">
                              {item.qualificationDegree} {item.lastName} {item.firstName}
                            </span>
                            <small className="text-muted d-block">{item.email}</small>
                            <small className="text-muted">{item.phoneNumber}</small>
                          </div>
                        </div>
                      </td>

                      {/* Specialty */}
                      <td>
                        <span className="specialty-badge">
                          <i className="fas fa-stethoscope me-1"></i>
                          {item.specialtyData?.name || `Khoa #${item.specialtyId}`}
                        </span>
                      </td>

                      {/* Clinic */}
                      <td>
                        <span className="clinic-text fw-semibold d-block">
                          {item.clinicData?.name || `Cơ sở #${item.clinicId}`}
                        </span>
                        <small className="text-muted text-truncate d-block" style={{ maxWidth: '200px' }}>
                          {item.proposedRoom || 'Phòng khám đa khoa'}
                        </small>
                      </td>

                      {/* License */}
                      <td>
                        <code className="license-code">{item.licenseNumber}</code>
                        <small className="text-muted d-block">KN: {item.experienceYears} năm</small>
                      </td>

                      {/* Completeness Score */}
                      <td>
                        <div className="completeness-cell">
                          <div className="d-flex justify-content-between small fw-bold mb-1">
                            <span>{item.completenessScore}%</span>
                          </div>
                          <div className="progress" style={{ height: '6px' }}>
                            <div
                              className={`progress-bar ${item.completenessScore >= 80 ? 'bg-success' : item.completenessScore >= 50 ? 'bg-warning' : 'bg-danger'}`}
                              style={{ width: `${item.completenessScore}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>

                      {/* Risk Flags */}
                      <td>
                        {riskCount > 0 ? (
                          <span className="badge-risk-warning" title={`${riskCount} điểm lưu ý`}>
                            <i className="fas fa-exclamation-triangle me-1"></i>{riskCount} cảnh báo
                          </span>
                        ) : (
                          <span className="badge-risk-clear">
                            <i className="fas fa-check me-1"></i>Hợp lệ
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td>
                        <span className={`status-pill pill-${item.status.toLowerCase()}`}>
                          {item.status === 'SUBMITTED' ? 'Chờ thẩm định' :
                           item.status === 'CHANGES_REQUESTED' ? 'Cần bổ sung' :
                           item.status === 'APPROVED' ? 'Đã kích hoạt' : 'Đã từ chối'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="text-end">
                        <button
                          className="btn btn-sm btn-outline-primary btn-review-action"
                          onClick={() => handleOpenReview(item)}
                        >
                          <i className="fas fa-eye me-1"></i>Thẩm định
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="9" className="text-center py-5">
                    <div className="empty-state-wrap">
                      <i className="fas fa-folder-open fa-3x text-muted mb-3"></i>
                      <h5 className="text-secondary">Không có hồ sơ nào trong trạng thái này</h5>
                      <p className="text-muted small">Các hồ sơ do Bác sĩ tự đăng ký sẽ hiển thị tại đây để Admin thẩm định.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Split-View Review Modal */}
      {isModalOpen && selectedRequest && (
        <DoctorVerificationReviewModal
          isOpen={isModalOpen}
          onClose={handleCloseReview}
          requestData={selectedRequest}
          onRefresh={fetchQueue}
          navigate={navigate}
        />
      )}
    </div>
  );
};

export default DoctorVerificationQueue;
