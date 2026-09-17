import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getDoctorOnboardingStatus } from '../../services/doctorOnboardingService';
import './DoctorApplicationStatus.scss';

const DoctorApplicationStatus = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);
  const initialEmail = queryParams.get('email') || '';

  const [identifier, setIdentifier] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [applicationData, setApplicationData] = useState(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (targetId = identifier) => {
    if (!targetId || !targetId.trim()) {
      toast.warning('Vui lòng nhập Email hoặc Mã hồ sơ để tra cứu!');
      return;
    }

    try {
      setLoading(true);
      setSearched(true);
      const cleanId = targetId.trim().replace('#DOC-REQ-', '').replace('#REQ-', '');
      const res = await getDoctorOnboardingStatus(cleanId);

      if (res && res.errCode === 0 && res.data) {
        setApplicationData(res.data);
      } else {
        setApplicationData(null);
        toast.info(res?.message || 'Không tìm thấy hồ sơ đăng ký nào khớp với thông tin!');
      }
    } catch (err) {
      console.error('Error searching onboarding status:', err);
      setApplicationData(null);
      toast.error('Lỗi khi tra cứu trạng thái hồ sơ!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialEmail) {
      handleSearch(initialEmail);
    }
  }, [initialEmail]);

  // Nút Cập nhật hồ sơ (chuyển sang Wizard và nạp lại dữ liệu)
  const handleUpdateApplication = () => {
    if (!applicationData) return;
    try {
      localStorage.setItem('bookingcare_doctor_onboard_draft', JSON.stringify({
        ...applicationData,
        password: '', // Bác sĩ nhập lại hoặc giữ nguyên
        confirmPassword: '',
      }));
      toast.success('Đang chuyển sang màn hình cập nhật hồ sơ...');
      navigate('/doctor-register');
    } catch (err) {
      console.error('Error preparing draft:', err);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'APPROVED':
        return <span className="status-badge badge-approved"><i className="fas fa-check-circle me-1"></i>Đã phê duyệt & Kích hoạt</span>;
      case 'CHANGES_REQUESTED':
        return <span className="status-badge badge-changes"><i className="fas fa-exclamation-triangle me-1"></i>Yêu cầu bổ sung hồ sơ</span>;
      case 'REJECTED':
        return <span className="status-badge badge-rejected"><i className="fas fa-times-circle me-1"></i>Đã từ chối</span>;
      case 'SUBMITTED':
      default:
        return <span className="status-badge badge-submitted"><i className="fas fa-hourglass-half me-1"></i>Đang chờ Ban Quản trị thẩm định</span>;
    }
  };

  return (
    <div className="doctor-status-tracker-page">
      {/* Top Banner */}
      <div className="tracker-hero-banner">
        <div className="container text-center">
          <div className="badge-pill mb-2">
            <i className="fas fa-search me-2"></i>Tra Cứu Hồ Sơ Trực Tuyến
          </div>
          <h1 className="hero-title">Tình Trạng Thẩm Định Hồ Sơ Bác Sĩ</h1>
          <p className="hero-subtitle">
            Nhập Email đăng ký hoặc Mã hồ sơ để kiểm tra tiến độ xét duyệt và nhận phản hồi từ Ban Giám đốc Y khoa BookingCare.
          </p>

          {/* Search Box */}
          <div className="search-bar-card glass-panel">
            <div className="input-group">
              <span className="input-group-text"><i className="fas fa-user-md"></i></span>
              <input
                type="text"
                className="form-control form-control-lg"
                placeholder="Nhập địa chỉ email đăng ký (hoặc mã hồ sơ #DOC-REQ-...)"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button
                className="btn btn-primary px-4"
                onClick={() => handleSearch()}
                disabled={loading}
              >
                {loading ? <span className="spinner-border spinner-border-sm me-2"></span> : <i className="fas fa-search me-2"></i>}
                Tra cứu ngay
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Result Container */}
      <div className="container tracker-body-container">
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary me-2"></div>
            <p className="text-muted mt-2">Đang kiểm tra dữ liệu hồ sơ...</p>
          </div>
        ) : applicationData ? (
          <div className="result-card glass-panel animate-fade-in">
            {/* Header thông tin hồ sơ */}
            <div className="result-header d-flex justify-content-between align-items-center">
              <div>
                <div className="d-flex align-items-center gap-2">
                  <h3 className="applicant-name m-0">
                    Bác sĩ {applicationData.lastName} {applicationData.firstName}
                  </h3>
                  {getStatusBadge(applicationData.status)}
                </div>
                <div className="applicant-meta mt-1 text-muted small">
                  <span>Mã hồ sơ: <code>#DOC-REQ-{applicationData.id}</code></span>
                  <span className="mx-2">•</span>
                  <span>Email: <strong>{applicationData.email}</strong></span>
                  <span className="mx-2">•</span>
                  <span>SĐT: <strong>{applicationData.phoneNumber}</strong></span>
                </div>
              </div>

              <div className="completeness-box text-end">
                <span className="small text-muted d-block">Độ hoàn thiện</span>
                <span className="score-number fw-bold text-success fs-5">{applicationData.completenessScore}%</span>
              </div>
            </div>

            {/* State Machine Visualizer */}
            <div className="timeline-stepper mt-4">
              <div className="timeline-track">
                <div className="timeline-node active">
                  <div className="node-icon"><i className="fas fa-file-alt"></i></div>
                  <div className="node-label">Nộp hồ sơ</div>
                </div>
                <div className="timeline-connector active"></div>

                <div className={`timeline-node ${applicationData.status !== 'DRAFT' ? 'active' : ''}`}>
                  <div className="node-icon"><i className="fas fa-clipboard-check"></i></div>
                  <div className="node-label">Thẩm định CCHN</div>
                </div>
                <div className={`timeline-connector ${applicationData.status === 'APPROVED' ? 'active' : ''}`}></div>

                <div className={`timeline-node ${applicationData.status === 'APPROVED' ? 'completed' : applicationData.status === 'CHANGES_REQUESTED' ? 'warning' : applicationData.status === 'REJECTED' ? 'danger' : ''}`}>
                  <div className="node-icon">
                    <i className={`fas ${applicationData.status === 'APPROVED' ? 'fa-check' : applicationData.status === 'CHANGES_REQUESTED' ? 'fa-exclamation' : applicationData.status === 'REJECTED' ? 'fa-times' : 'fa-clock'}`}></i>
                  </div>
                  <div className="node-label">
                    {applicationData.status === 'APPROVED' ? 'Đã kích hoạt' :
                     applicationData.status === 'CHANGES_REQUESTED' ? 'Cần bổ sung' :
                     applicationData.status === 'REJECTED' ? 'Từ chối' : 'Kết quả duyệt'}
                  </div>
                </div>
              </div>
            </div>

            {/* Notification / Feedback Banner của Admin */}
            {applicationData.status === 'CHANGES_REQUESTED' && (
              <div className="changes-requested-banner mt-4">
                <div className="banner-icon"><i className="fas fa-exclamation-triangle"></i></div>
                <div className="banner-body">
                  <h5 className="banner-title">Hồ Sơ Cần Bổ Sung Thông Tin Theo Yêu Cầu Của Admin</h5>
                  <p className="banner-feedback">"{applicationData.adminFeedback || 'Vui lòng bổ sung bản scan văn bằng/chứng chỉ hành nghề y tế rõ nét hơn.'}"</p>
                  {Array.isArray(applicationData.requiredFields) && applicationData.requiredFields.length > 0 && (
                    <div className="fields-required-tags mt-2">
                      <span className="small fw-bold me-2">Mục cần cập nhật:</span>
                      {applicationData.requiredFields.map((f, i) => (
                        <span key={i} className="field-tag">{f}</span>
                      ))}
                    </div>
                  )}
                  <div className="mt-3">
                    <button className="btn btn-warning fw-bold px-4" onClick={handleUpdateApplication}>
                      <i className="fas fa-edit me-2"></i>Cập Nhật & Gửi Lại Hồ Sơ Ngay
                    </button>
                  </div>
                </div>
              </div>
            )}

            {applicationData.status === 'APPROVED' && (
              <div className="approved-success-banner mt-4">
                <div className="banner-icon"><i className="fas fa-shield-check"></i></div>
                <div className="banner-body">
                  <h5 className="banner-title">Chúc Mừng! Tài Khoản Bác Sĩ Đã Được Kích Hoạt Thành Công</h5>
                  <p className="banner-desc">
                    Hồ sơ năng lực và số Chứng chỉ hành nghề của bạn đã được xác minh hợp lệ. Bạn đã được phân bổ công tác tại cơ sở <strong>{applicationData.clinicData?.name || 'BookingCare Partner'}</strong>.
                  </p>
                  <div className="mt-3">
                    <button className="btn btn-success fw-bold px-4" onClick={() => navigate('/login')}>
                      <i className="fas fa-sign-in-alt me-2"></i>Đăng Nhập Vào Cổng Quản Lý Bác Sĩ
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Thông tin kê khai tóm tắt */}
            <div className="application-details-grid mt-4">
              <div className="detail-panel">
                <h6><i className="fas fa-user-md me-2 text-primary"></i>Năng lực chuyên môn</h6>
                <div className="detail-row"><span>Chuyên khoa:</span> <strong>{applicationData.specialtyData?.name || '---'}</strong></div>
                <div className="detail-row"><span>Số CCHN:</span> <strong className="text-danger">{applicationData.licenseNumber}</strong></div>
                <div className="detail-row"><span>Học vị:</span> <strong>{applicationData.qualificationDegree}</strong></div>
                <div className="detail-row"><span>Kinh nghiệm:</span> <strong>{applicationData.experienceYears} năm</strong></div>
              </div>

              <div className="detail-panel">
                <h6><i className="fas fa-hospital me-2 text-primary"></i>Nơi công tác & Thù lao</h6>
                <div className="detail-row">
                  <span>Cơ sở y tế:</span>
                  <strong>{applicationData.clinicData?.name || 'Bác sĩ độc lập (Tự do)'}</strong>
                </div>
                <div className="detail-row"><span>Phòng khám:</span> <strong>{applicationData.proposedRoom || 'Phòng khám đa khoa'}</strong></div>
                <div className="detail-row"><span>Tài khoản thù lao:</span> <strong>{applicationData.bankName} - {applicationData.bankAccountNumber}</strong></div>
              </div>
            </div>

            <div className="text-center mt-4 pt-3 border-top">
              <button className="btn btn-outline-secondary btn-sm" onClick={() => navigate('/')}>
                <i className="fas fa-home me-2"></i>Về trang chủ
              </button>
              <button className="btn btn-outline-primary btn-sm ms-2" onClick={() => navigate('/doctor-register')}>
                <i className="fas fa-user-plus me-2"></i>Mở form đăng ký Bác sĩ mới
              </button>
            </div>
          </div>
        ) : searched ? (
          <div className="empty-search-card text-center py-5 glass-panel">
            <i className="fas fa-search-minus fa-3x text-muted mb-3"></i>
            <h5>Không Tìm Thấy Hồ Sơ Đăng Ký</h5>
            <p className="text-muted small">
              Vui lòng kiểm tra lại địa chỉ email hoặc mã đơn đăng ký (ví dụ: bs.nguyenvana@gmail.com).
            </p>
            <button className="btn btn-primary mt-2" onClick={() => navigate('/doctor-register')}>
              <i className="fas fa-plus me-2"></i>Đăng Ký Hồ Sơ Bác Sĩ Mới
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default DoctorApplicationStatus;
