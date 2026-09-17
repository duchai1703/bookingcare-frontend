import React, { useState } from 'react';
import { toast } from 'react-toastify';
import {
  approveAdminOnboarding,
  requestAdminOnboardingChanges,
  rejectAdminOnboarding,
} from '../../../../services/doctorOnboardingService';

const DoctorVerificationReviewModal = ({ isOpen, onClose, requestData, onRefresh, navigate }) => {
  const [activeTab, setActiveTab] = useState('profile'); // 'profile', 'documents', 'audit'
  const [selectedImage, setSelectedImage] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [requiredFields, setRequiredFields] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmApprove, setShowConfirmApprove] = useState(false);

  if (!isOpen || !requestData) return null;

  const licenseImages = Array.isArray(requestData.licenseImages) ? requestData.licenseImages : [];
  const riskFlags = Array.isArray(requestData.riskFlags) ? requestData.riskFlags : [];

  const handleFieldToggle = (field) => {
    setRequiredFields(prev =>
      prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field]
    );
  };

  // 1. Approve
  const handleApprove = async () => {
    try {
      setSubmitting(true);
      const res = await approveAdminOnboarding(requestData.id);
      if (res && res.errCode === 0) {
        toast.success(res.message || 'Phê duyệt hồ sơ bác sĩ thành công!');
        onRefresh();
        onClose();
        if (res.data && res.data.doctorId && navigate) {
          // Chuyển sang trang Doctor Workspace
          navigate(`/system/doctors/${res.data.doctorId}`);
        }
      } else {
        toast.error(res.message || 'Phê duyệt hồ sơ thất bại!');
      }
    } catch (err) {
      console.error('Error approving doctor onboarding:', err);
      toast.error(err.response?.data?.message || 'Lỗi hệ thống khi phê duyệt!');
    } finally {
      setSubmitting(false);
      setShowConfirmApprove(false);
    }
  };

  // 2. Request Changes
  const handleRequestChanges = async () => {
    if (!feedback.trim()) {
      toast.error('Vui lòng nhập lý do hoặc nội dung chi tiết cần Bác sĩ bổ sung!');
      return;
    }
    try {
      setSubmitting(true);
      const res = await requestAdminOnboardingChanges(requestData.id, {
        feedback,
        requiredFields,
      });
      if (res && res.errCode === 0) {
        toast.success('Đã gửi yêu cầu bổ sung hồ sơ tới Bác sĩ!');
        onRefresh();
        onClose();
      } else {
        toast.error(res.message || 'Lỗi khi gửi yêu cầu bổ sung!');
      }
    } catch (err) {
      console.error('Error requesting changes:', err);
      toast.error(err.response?.data?.message || 'Lỗi hệ thống!');
    } finally {
      setSubmitting(false);
    }
  };

  // 3. Reject
  const handleReject = async () => {
    if (!feedback.trim()) {
      toast.error('Vui lòng nhập lý do từ chối hồ sơ!');
      return;
    }
    if (!window.confirm('Bạn có chắc chắn muốn từ chối hồ sơ này không?')) return;

    try {
      setSubmitting(true);
      const res = await rejectAdminOnboarding(requestData.id, { reason: feedback });
      if (res && res.errCode === 0) {
        toast.warning('Đã từ chối hồ sơ đăng ký của Bác sĩ!');
        onRefresh();
        onClose();
      } else {
        toast.error(res.message || 'Lỗi khi từ chối hồ sơ!');
      }
    } catch (err) {
      console.error('Error rejecting doctor onboarding:', err);
      toast.error(err.response?.data?.message || 'Lỗi hệ thống!');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="verification-modal-backdrop">
      <div className="verification-review-modal glass-panel">

        {/* Modal Header */}
        <div className="modal-header-section">
          <div className="doctor-header-meta">
            <div className="avatar-wrap">
              {requestData.avatar ? (
                <img src={requestData.avatar} alt="Avatar" />
              ) : (
                <div className="avatar-placeholder"><i className="fas fa-user-md"></i></div>
              )}
            </div>
            <div className="meta-text">
              <div className="d-flex align-items-center gap-2">
                <h4 className="doctor-name m-0">
                  {requestData.qualificationDegree} {requestData.lastName} {requestData.firstName}
                </h4>
                <span className={`status-badge badge-${requestData.status.toLowerCase()}`}>
                  {requestData.status === 'SUBMITTED' ? 'Chờ thẩm định' :
                   requestData.status === 'CHANGES_REQUESTED' ? 'Cần bổ sung' :
                   requestData.status === 'APPROVED' ? 'Đã kích hoạt' : 'Đã từ chối'}
                </span>
              </div>
              <div className="meta-sub">
                <span><i className="fas fa-envelope me-1"></i>{requestData.email}</span>
                <span className="dot">•</span>
                <span><i className="fas fa-phone me-1"></i>{requestData.phoneNumber}</span>
                <span className="dot">•</span>
                <span>Mã đơn: <code>#REQ-{requestData.id}</code></span>
              </div>
            </div>
          </div>

          <div className="header-actions">
            <div className="completeness-pill">
              <span className="label">Độ hoàn thiện:</span>
              <span className="score">{requestData.completenessScore}%</span>
            </div>
            <button className="btn-close-modal" onClick={onClose}><i className="fas fa-times"></i></button>
          </div>
        </div>

        {/* Risk Flags Banner nếu có cảnh báo */}
        {riskFlags.length > 0 && (
          <div className="risk-flags-alert-bar">
            <i className="fas fa-exclamation-triangle text-warning me-2 fs-5"></i>
            <div className="flags-list">
              <strong>Hệ thống phát hiện {riskFlags.length} điểm lưu ý nghiệp vụ:</strong>
              <ul>
                {riskFlags.map((flag, idx) => (
                  <li key={idx}>
                    <span className={`flag-level ${flag.level?.toLowerCase()}`}>{flag.level}</span>: {flag.message}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Split View Body */}
        <div className="modal-split-body">
          {/* CỘT TRÁI: THÔNG TIN HỒ SƠ CHI TIẾT */}
          <div className="split-column left-column">
            <div className="column-inner-card">
              <h5 className="sub-title"><i className="fas fa-user-circle text-primary me-2"></i>Thông Tin Kê Khai Ứng Viên</h5>

              <div className="detail-field-group">
                <div className="field-row">
                  <span className="field-label">Giới tính / Ngày sinh:</span>
                  <span className="field-value">
                    {requestData.gender === 'G1' || requestData.gender === 'M' ? 'Nam' : 'Nữ'} ({requestData.birthday || '---'})
                  </span>
                </div>
                <div className="field-row">
                  <span className="field-label">Số CCCD / Hộ chiếu:</span>
                  <span className="field-value font-monospace">{requestData.nationalId || 'Chưa cung cấp'}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Địa chỉ liên hệ:</span>
                  <span className="field-value">{requestData.address || 'Chưa cập nhật'}</span>
                </div>
              </div>

              <h5 className="sub-title mt-4"><i className="fas fa-stethoscope text-primary me-2"></i>Năng Lực Chuyên Môn & CCHN</h5>
              <div className="detail-field-group">
                <div className="field-row">
                  <span className="field-label">Chuyên khoa chính:</span>
                  <span className="field-value badge-specialty">
                    {requestData.specialtyData?.name || `Chuyên khoa #${requestData.specialtyId}`}
                  </span>
                </div>
                <div className="field-row">
                  <span className="field-label">Số Giấy phép hành nghề:</span>
                  <span className="field-value text-danger fw-bold">{requestData.licenseNumber}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Nơi cấp CCHN:</span>
                  <span className="field-value">{requestData.licenseIssuePlace || '---'}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Ngày cấp:</span>
                  <span className="field-value">{requestData.licenseIssueDate || '---'}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Kinh nghiệm hành nghề:</span>
                  <span className="field-value">{requestData.experienceYears} năm</span>
                </div>
              </div>

              <h5 className="sub-title mt-4"><i className="fas fa-hospital text-primary me-2"></i>Đăng Ký Cơ Sở & Nhận Thanh Toán</h5>
              <div className="detail-field-group">
                <div className="field-row">
                  <span className="field-label">Cơ sở y tế công tác:</span>
                  <span className="field-value text-primary fw-bold">
                    {requestData.clinicData?.name || `Cơ sở #${requestData.clinicId}`}
                  </span>
                </div>
                <div className="field-row">
                  <span className="field-label">Phòng khám đề xuất:</span>
                  <span className="field-value">{requestData.proposedRoom || 'Phòng khám đa khoa'}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Mức giá khám:</span>
                  <span className="field-value">{requestData.priceTypeData?.valueVi || requestData.priceId}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">Tài khoản thù lao:</span>
                  <span className="field-value font-monospace">
                    {requestData.bankName} - {requestData.bankAccountNumber} ({requestData.bankAccountName})
                  </span>
                </div>
              </div>

              {requestData.bioDescription && (
                <div className="bio-box mt-3">
                  <span className="field-label d-block mb-1">Tiểu sử & Giới thiệu:</span>
                  <p className="bio-text">{requestData.bioDescription}</p>
                </div>
              )}
            </div>
          </div>

          {/* CỘT PHẢI: BẢN SCAN CCHN, VĂN BẰNG & AUDIT CHECKLIST */}
          <div className="split-column right-column">
            <div className="column-inner-card">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="sub-title m-0">
                  <i className="fas fa-file-medical text-success me-2"></i>Văn Bằng & Giấy Phép Scan ({licenseImages.length})
                </h5>
                <span className="text-muted small">Nhấp vào ảnh để phóng to kiểm tra</span>
              </div>

              {/* Gallery ảnh chứng chỉ */}
              {licenseImages.length > 0 ? (
                <div className="document-gallery-grid">
                  {licenseImages.map((img, idx) => (
                    <div
                      key={idx}
                      className={`doc-thumb-box ${selectedImage === img ? 'selected' : ''}`}
                      onClick={() => setSelectedImage(img)}
                    >
                      <img src={img} alt={`Document scan ${idx + 1}`} />
                      <span className="doc-tag">Văn bằng #{idx + 1}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-docs-warning">
                  <i className="fas fa-file-excel fa-2x mb-2 text-danger"></i>
                  <p className="m-0">Ứng viên chưa tải lên bản scan Giấy phép hành nghề y tế!</p>
                </div>
              )}

              {/* Phóng to ảnh xem chi tiết */}
              {selectedImage && (
                <div className="document-zoom-viewer mt-3">
                  <div className="viewer-header">
                    <span>Xem chi tiết văn bằng</span>
                    <button className="btn btn-sm btn-outline-secondary" onClick={() => setSelectedImage(null)}>
                      <i className="fas fa-compress me-1"></i>Thu nhỏ
                    </button>
                  </div>
                  <div className="viewer-body">
                    <img src={selectedImage} alt="Document Zoom" />
                  </div>
                </div>
              )}

              {/* Checklist thẩm định tiêu chuẩn của hệ thống */}
              <div className="audit-system-checklist mt-4">
                <h6 className="audit-heading"><i className="fas fa-clipboard-check text-primary me-2"></i>Checklist Thẩm Định Nghiệp Vụ</h6>
                <div className="checklist-items">
                  <label className="check-item">
                    <input type="checkbox" defaultChecked={!!requestData.licenseNumber} />
                    <span>Số CCHN hợp lệ theo chuẩn Bộ Y tế</span>
                  </label>
                  <label className="check-item">
                    <input type="checkbox" defaultChecked={licenseImages.length > 0} />
                    <span>Bản scan CCHN/Bằng cấp rõ nét, không tẩy xóa</span>
                  </label>
                  <label className="check-item">
                    <input type="checkbox" defaultChecked={!!requestData.specialtyId} />
                    <span>Đã phân bổ đúng Chuyên khoa chính</span>
                  </label>
                  <label className="check-item">
                    <input type="checkbox" defaultChecked={!!requestData.clinicId} />
                    <span>Cơ sở y tế tiếp nhận đã xác nhận vị trí làm việc</span>
                  </label>
                  <label className="check-item">
                    <input type="checkbox" defaultChecked={!!requestData.bankAccountNumber} />
                    <span>Thông tin tài khoản ngân hàng chính xác</span>
                  </label>
                </div>
              </div>

              {/* Form Yêu cầu bổ sung / Ghi chú phản hồi */}
              {requestData.status !== 'APPROVED' && (
                <div className="admin-feedback-action-box mt-4">
                  <h6 className="feedback-heading">
                    <i className="fas fa-comment-dots text-warning me-2"></i>Ghi Chú Phản Hồi / Yêu Cầu Bổ Sung
                  </h6>
                  <div className="quick-request-tags mb-2">
                    <span
                      className={`quick-tag ${requiredFields.includes('licenseImages') ? 'active' : ''}`}
                      onClick={() => handleFieldToggle('licenseImages')}
                    >
                      + Yêu cầu scan CCHN rõ nét
                    </span>
                    <span
                      className={`quick-tag ${requiredFields.includes('bankAccount') ? 'active' : ''}`}
                      onClick={() => handleFieldToggle('bankAccount')}
                    >
                      + Bổ sung TK ngân hàng chính chủ
                    </span>
                    <span
                      className={`quick-tag ${requiredFields.includes('degree') ? 'active' : ''}`}
                      onClick={() => handleFieldToggle('degree')}
                    >
                      + Bổ sung Bằng Thạc sĩ/Tiến sĩ
                    </span>
                  </div>
                  <textarea
                    rows="2"
                    className="form-control feedback-input"
                    placeholder="Nhập ghi chú phản hồi gửi cho Bác sĩ (nếu yêu cầu sửa đổi hoặc từ chối)..."
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                  ></textarea>
                </div>
              )}

            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="modal-footer-section">
          <button className="btn btn-outline-secondary" onClick={onClose} disabled={submitting}>
            Đóng
          </button>

          {requestData.status !== 'APPROVED' ? (
            <div className="d-flex gap-2">
              <button
                className="btn btn-outline-danger"
                onClick={handleReject}
                disabled={submitting}
              >
                <i className="fas fa-ban me-1"></i>Từ chối hồ sơ
              </button>
              <button
                className="btn btn-outline-warning"
                onClick={handleRequestChanges}
                disabled={submitting}
              >
                <i className="fas fa-reply me-1"></i>Yêu cầu bổ sung thông tin
              </button>
              <button
                className="btn btn-success px-4"
                onClick={() => setShowConfirmApprove(true)}
                disabled={submitting}
              >
                <i className="fas fa-check-circle me-1"></i>Phê Duyệt & Kích Hoạt Bác Sĩ
              </button>
            </div>
          ) : (
            <div className="text-success fw-bold">
              <i className="fas fa-check-double me-2"></i>Hồ sơ này đã được phê duyệt và kích hoạt trên toàn hệ thống.
            </div>
          )}
        </div>

        {/* Confirm Approve Modal Mini Overlay */}
        {showConfirmApprove && (
          <div className="confirm-approve-dialog-overlay">
            <div className="confirm-dialog-card glass-panel">
              <div className="icon-wrap"><i className="fas fa-shield-alt"></i></div>
              <h5>Xác Nhận Phê Duyệt Hồ Sơ Bác Sĩ</h5>
              <p>
                Khi xác nhận, hệ thống sẽ thực hiện giao dịch tự động:
                <br />
                1. Kích hoạt tài khoản User role <strong>Bác sĩ (R2)</strong>.
                <br />
                2. Khởi tạo hồ sơ <strong>Doctor_Info</strong> liên kết Chuyên khoa & Cơ sở.
                <br />
                3. Thiết lập phân bổ công tác <strong>Doctor_Assignment</strong> tại {requestData.clinicData?.name || 'cơ sở'}.
              </p>
              <div className="d-flex justify-content-end gap-2 mt-4">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowConfirmApprove(false)}
                  disabled={submitting}
                >
                  Hủy bỏ
                </button>
                <button
                  className="btn btn-success"
                  onClick={handleApprove}
                  disabled={submitting}
                >
                  {submitting ? 'Đang kích hoạt...' : 'Đồng ý & Kích hoạt'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default DoctorVerificationReviewModal;
