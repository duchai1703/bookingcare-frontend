import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getAllSpecialty } from '../../services/specialtyService';
import { getAllClinic } from '../../services/clinicService';
import { getAllCode } from '../../services/userService';
import { submitDoctorOnboarding } from '../../services/doctorOnboardingService';
import CommonUtils from '../../utils/CommonUtils';
import './DoctorRegisterWizard.scss';

const STEPS = [
  { id: 1, title: 'Tài khoản & Định danh', subtitle: 'Thông tin cá nhân & bảo mật' },
  { id: 2, title: 'Chuyên môn & Chứng chỉ', subtitle: 'Văn bằng & CCHN y tế' },
  { id: 3, title: 'Nơi công tác & Tài chính', subtitle: 'Cơ sở y tế & Tài khoản thù lao' },
  { id: 4, title: 'Kiểm tra & Xác nhận', subtitle: 'Thẩm định mức độ hoàn thiện' },
];

const QUALIFICATIONS = [
  'Bác sĩ đa khoa',
  'Bác sĩ chuyên khoa I (CK1)',
  'Bác sĩ chuyên khoa II (CK2)',
  'Thạc sĩ Y khoa',
  'Tiến sĩ Y khoa',
  'Phó Giáo sư, Tiến sĩ',
  'Giáo sư, Tiến sĩ',
];

const BANKS = [
  'Vietcombank (VCB)',
  'Techcombank (TCB)',
  'BIDV',
  'VietinBank',
  'MB Bank (Quân đội)',
  'ACB (Á Châu)',
  'VPBank',
  'TPBank',
  'Sacombank',
];

const DoctorRegisterWizard = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);

  // Master Data
  const [specialties, setSpecialties] = useState([]);
  const [clinics, setClinics] = useState([]);
  const [priceList, setPriceList] = useState([]);

  // Form State
  const [formData, setFormData] = useState({
    // Step 1
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    gender: 'M',
    birthday: '',
    address: '',
    nationalId: '',
    avatar: '',
    avatarPreview: '',

    // Step 2
    specialtyId: '',
    qualificationDegree: 'Bác sĩ chuyên khoa I (CK1)',
    experienceYears: 5,
    licenseNumber: '',
    licenseIssueDate: '',
    licenseIssuePlace: 'Sở Y tế TP. Hồ Chí Minh',
    licenseImages: [],
    bioDescription: '',

    // Step 3
    clinicId: '',
    isIndependentDoctor: false,
    proposedRoom: '',
    priceId: 'PRI1',
    bankName: 'Vietcombank (VCB)',
    bankAccountNumber: '',
    bankAccountName: '',

    // Step 4
    agreedTerms: false,
  });

  // Khôi phục bản lưu nháp từ LocalStorage nếu có
  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem('bookingcare_doctor_onboard_draft');
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        if (parsed && (parsed.email || parsed.firstName)) {
          setFormData(prev => ({ ...prev, ...parsed }));
          toast.info('Đã tự động nạp lại bản lưu nháp hồ sơ trước đó của bạn.');
        }
      }
    } catch (err) {
      console.error('Error loading draft from localStorage:', err);
    }
  }, []);

  // Xử lý Lưu nháp
  const handleSaveDraft = async () => {
    try {
      localStorage.setItem('bookingcare_doctor_onboard_draft', JSON.stringify(formData));
      if (formData.email && formData.phoneNumber && formData.firstName && formData.lastName) {
        await submitDoctorOnboarding({ ...formData, isDraft: true });
      }
      toast.success('Đã lưu nháp hồ sơ! Bạn có thể thoát ra và tiếp tục hoàn thiện sau.');
    } catch (err) {
      console.error('Error saving draft:', err);
      toast.error('Lỗi khi lưu nháp hồ sơ!');
    }
  };

  // Load Master Data
  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const [specRes, clinicRes, priceRes] = await Promise.all([
          getAllSpecialty(),
          getAllClinic(),
          getAllCode('PRICE'),
        ]);

        if (specRes && specRes.errCode === 0) setSpecialties(specRes.data || []);
        if (clinicRes && clinicRes.errCode === 0) setClinics(clinicRes.data || []);
        if (priceRes && priceRes.errCode === 0) setPriceList(priceRes.data || []);
      } catch (err) {
        console.error('Error fetching master data:', err);
      }
    };
    fetchMasterData();
  }, []);

  // Tính điểm Completeness Score Client-side (0-100%)
  const calculateCompleteness = () => {
    let score = 0;
    if (formData.email && formData.phoneNumber) score += 10;
    if (formData.firstName && formData.lastName) score += 10;
    if (formData.gender && formData.birthday) score += 5;
    if (formData.avatar) score += 5;

    if (formData.specialtyId) score += 10;
    if (formData.licenseNumber) score += 10;
    if (formData.licenseIssueDate && formData.licenseIssuePlace) score += 5;
    if (formData.licenseImages.length > 0) score += 10;
    if (formData.qualificationDegree) score += 5;

    if (formData.clinicId) score += 10;
    if (formData.proposedRoom) score += 5;
    if (formData.priceId) score += 5;
    if (formData.bankAccountNumber && formData.bankAccountName) score += 10;

    return Math.min(score, 100);
  };

  const completeness = calculateCompleteness();

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Upload Avatar
  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Kích thước ảnh đại diện không được vượt quá 2MB!');
        return;
      }
      const base64 = await CommonUtils.getBase64(file);
      setFormData(prev => ({
        ...prev,
        avatar: base64,
        avatarPreview: URL.createObjectURL(file),
      }));
    }
  };

  // Upload License Images
  const handleLicenseImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length + formData.licenseImages.length > 5) {
      toast.warning('Chỉ tải lên tối đa 5 ảnh scan tài liệu/bằng cấp!');
      return;
    }

    const newImages = [];
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`Ảnh ${file.name} vượt quá 5MB!`);
        continue;
      }
      const base64 = await CommonUtils.getBase64(file);
      newImages.push(base64);
    }

    setFormData(prev => ({
      ...prev,
      licenseImages: [...prev.licenseImages, ...newImages],
    }));
  };

  const removeLicenseImage = (index) => {
    setFormData(prev => ({
      ...prev,
      licenseImages: prev.licenseImages.filter((_, idx) => idx !== index),
    }));
  };

  // Validate Next Step
  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!formData.email || !formData.phoneNumber || !formData.firstName || !formData.lastName) {
        toast.error('Vui lòng điền đầy đủ Email, Số điện thoại và Họ tên!');
        return;
      }
      if (!formData.password || formData.password.length < 6) {
        toast.error('Mật khẩu phải có tối thiểu 6 ký tự!');
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        toast.error('Mật khẩu xác nhận không khớp!');
        return;
      }
    } else if (currentStep === 2) {
      if (!formData.specialtyId) {
        toast.error('Vui lòng chọn Chuyên khoa chính từ danh mục Master!');
        return;
      }
      if (!formData.licenseNumber) {
        toast.error('Vui lòng nhập số Giấy phép hành nghề y tế (CCHN)!');
        return;
      }
      if (formData.licenseImages.length === 0) {
        toast.warning('Khuyến nghị tải lên bản scan CCHN để hồ sơ được duyệt nhanh hơn!');
      }
    } else if (currentStep === 3) {
      if (!formData.clinicId) {
        toast.error('Vui lòng chọn Cơ sở y tế đăng ký làm việc!');
        return;
      }
    }

    setCurrentStep(prev => Math.min(prev + 1, 4));
  };

  const handlePrevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  // Submit Request
  const handleSubmitOnboarding = async () => {
    if (!formData.agreedTerms) {
      toast.error('Vui lòng cam kết tính trung thực của hồ sơ trước khi gửi!');
      return;
    }

    try {
      setLoading(true);
      const res = await submitDoctorOnboarding(formData);
      if (res && res.errCode === 0) {
        toast.success(res.message || 'Gửi hồ sơ đăng ký thành công!');
        setSubmittedData(res.data);
      } else {
        toast.error(res.message || 'Lỗi khi gửi hồ sơ đăng ký!');
      }
    } catch (err) {
      console.error('Error submitting onboarding:', err);
      toast.error(err.response?.data?.message || 'Lỗi kết nối máy chủ!');
    } finally {
      setLoading(false);
    }
  };

  // Nếu nộp thành công -> Hiển thị Success Dashboard
  if (submittedData) {
    return (
      <div className="doctor-onboarding-success-page">
        <div className="success-card glass-panel">
          <div className="success-icon-badge">
            <i className="fas fa-check-circle"></i>
          </div>
          <span className="badge-pill">Đã tiếp nhận hồ sơ</span>
          <h2 className="success-title">Hồ Sơ Đăng Ký Bác Sĩ Đã Được Gửi Thẩm Định!</h2>
          <p className="success-desc">
            Cảm ơn <strong>Bác sĩ {formData.lastName} {formData.firstName}</strong> đã gửi thông tin đăng ký hợp tác cùng BookingCare.
            Hồ sơ của Bác sĩ đang được Ban Giám đốc Y khoa & Ban Quản trị thẩm định chuyên môn.
          </p>

          <div className="info-summary-box">
            <div className="summary-item">
              <span className="label">Mã tra cứu hồ sơ:</span>
              <span className="value code">#DOC-REQ-{submittedData.requestId}</span>
            </div>
            <div className="summary-item">
              <span className="label">Độ hoàn thiện hồ sơ:</span>
              <span className="value score">{submittedData.completenessScore}%</span>
            </div>
            <div className="summary-item">
              <span className="label">Thời gian dự kiến xét duyệt:</span>
              <span className="value time">24 - 48 giờ làm việc</span>
            </div>
            <div className="summary-item">
              <span className="label">Email liên hệ:</span>
              <span className="value">{formData.email}</span>
            </div>
          </div>

          <div className="next-steps-guide">
            <h5><i className="fas fa-tasks me-2"></i>Các bước tiếp theo</h5>
            <ol>
              <li>Admin kiểm tra số CCHN <code>{formData.licenseNumber}</code> và văn bằng scan.</li>
              <li>Hệ thống kích hoạt tài khoản và tự động kết nối phân bổ tại cơ sở đã chọn.</li>
              <li>Thông báo kết quả phê duyệt và hướng dẫn nhận lịch khám sẽ được gửi qua email.</li>
            </ol>
          </div>

          <div className="action-buttons">
            <button className="btn btn-outline-primary" onClick={() => navigate('/')}>
              <i className="fas fa-home me-2"></i>Về trang chủ BookingCare
            </button>
            <button className="btn btn-primary ms-3" onClick={() => navigate('/login')}>
              <i className="fas fa-sign-in-alt me-2"></i>Đến trang đăng nhập
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="doctor-onboarding-wizard-wrapper">
      {/* Top Banner & Header */}
      <div className="wizard-hero-banner">
        <div className="container">
          <div className="banner-content">
            <div className="partner-badge">
              <i className="fas fa-user-md me-2"></i>BookingCare Doctor Onboarding Portal
            </div>
            <h1 className="hero-title">Đăng Ký & Khởi Tạo Hồ Sơ Bác Sĩ</h1>
            <p className="hero-subtitle">
              Quy trình tự phục vụ chuẩn hóa: Tự khai năng lực, upload chứng chỉ hành nghề, kết nối trực tiếp với Chuyên khoa & Cơ sở y tế.
            </p>

            {/* Completeness Meter */}
            <div className="completeness-bar-container">
              <div className="bar-header">
                <span><i className="fas fa-tachometer-alt me-2"></i>Mức độ hoàn thiện hồ sơ</span>
                <span className="score-badge">{completeness}%</span>
              </div>
              <div className="progress-track">
                <div
                  className={`progress-fill ${completeness >= 80 ? 'high' : completeness >= 50 ? 'medium' : 'low'}`}
                  style={{ width: `${completeness}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stepper Navigation */}
      <div className="wizard-stepper-container container">
        <div className="stepper-track">
          {STEPS.map((step, idx) => {
            const isPassed = currentStep > step.id;
            const isCurrent = currentStep === step.id;
            return (
              <div key={step.id} className={`step-node ${isPassed ? 'completed' : ''} ${isCurrent ? 'active' : ''}`}>
                <div className="node-circle" onClick={() => isPassed && setCurrentStep(step.id)}>
                  {isPassed ? <i className="fas fa-check"></i> : step.id}
                </div>
                <div className="node-info">
                  <div className="node-title">{step.title}</div>
                  <div className="node-subtitle">{step.subtitle}</div>
                </div>
                {idx < STEPS.length - 1 && <div className="step-connector"></div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Wizard Form Body */}
      <div className="container wizard-body-container">
        <div className="wizard-card glass-panel">

          {/* ══════════ STEP 1: Tài khoản & Định danh ══════════ */}
          {currentStep === 1 && (
            <div className="wizard-step-content step-1 animate-fade-in">
              <div className="section-header">
                <h3 className="section-title"><i className="fas fa-id-card me-2 text-primary"></i>1. Thông Tin Tài Khoản & Định Danh Cá Nhân</h3>
                <p className="section-desc">Thông tin cơ bản để tạo tài khoản bác sĩ và liên hệ công tác.</p>
              </div>

              <div className="row g-4 mt-2">
                <div className="col-md-3 text-center">
                  <div className="avatar-upload-box">
                    <div className="avatar-preview">
                      {formData.avatarPreview || formData.avatar ? (
                        <img src={formData.avatarPreview || formData.avatar} alt="Doctor Avatar" />
                      ) : (
                        <div className="avatar-placeholder">
                          <i className="fas fa-user-circle"></i>
                          <span>Tải ảnh đại diện</span>
                        </div>
                      )}
                    </div>
                    <label className="btn btn-sm btn-outline-primary mt-2">
                      <i className="fas fa-camera me-1"></i>Chọn ảnh chân dung
                      <input type="file" accept="image/*" onChange={handleAvatarChange} hidden />
                    </label>
                    <small className="text-muted d-block mt-1">Ảnh áo blouse hoặc chân dung trang trọng</small>
                  </div>
                </div>

                <div className="col-md-9">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label required">Họ và tên đệm</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Ví dụ: Nguyễn Văn"
                        value={formData.lastName}
                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label required">Tên Bác sĩ</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Ví dụ: An"
                        value={formData.firstName}
                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label required">Email liên hệ công việc</label>
                      <input
                        type="email"
                        className="form-control"
                        placeholder="doctor@hospital.vn"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label required">Số điện thoại di động</label>
                      <input
                        type="tel"
                        className="form-control"
                        placeholder="0987xxxxxx"
                        value={formData.phoneNumber}
                        onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label required">Mật khẩu đăng nhập</label>
                      <input
                        type="password"
                        className="form-control"
                        placeholder="Tối thiểu 6 ký tự"
                        value={formData.password}
                        onChange={(e) => handleInputChange('password', e.target.value)}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label required">Xác nhận mật khẩu</label>
                      <input
                        type="password"
                        className="form-control"
                        placeholder="Nhập lại mật khẩu"
                        value={formData.confirmPassword}
                        onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label">Giới tính</label>
                      <select
                        className="form-select"
                        value={formData.gender}
                        onChange={(e) => handleInputChange('gender', e.target.value)}
                      >
                        <option value="M">Nam</option>
                        <option value="F">Nữ</option>
                        <option value="O">Khác</option>
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Ngày sinh</label>
                      <input
                        type="date"
                        className="form-control"
                        value={formData.birthday}
                        onChange={(e) => handleInputChange('birthday', e.target.value)}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Số CCCD / Hộ chiếu</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Số định danh công dân"
                        value={formData.nationalId}
                        onChange={(e) => handleInputChange('nationalId', e.target.value)}
                      />
                    </div>

                    <div className="col-md-12">
                      <label className="form-label">Địa chỉ liên hệ</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành"
                        value={formData.address}
                        onChange={(e) => handleInputChange('address', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════ STEP 2: Chuyên môn & Chứng chỉ ══════════ */}
          {currentStep === 2 && (
            <div className="wizard-step-content step-2 animate-fade-in">
              <div className="section-header">
                <h3 className="section-title"><i className="fas fa-stethoscope me-2 text-primary"></i>2. Năng Lực Chuyên Môn & Giấy Phép Hành Nghề (CCHN)</h3>
                <p className="section-desc">Kê khai văn bằng và giấy phép hành nghề y tế theo quy định của Bộ Y tế.</p>
              </div>

              <div className="row g-4 mt-2">
                <div className="col-md-6">
                  <label className="form-label required">Chuyên khoa chính (Specialty Master)</label>
                  <select
                    className="form-select"
                    value={formData.specialtyId}
                    onChange={(e) => handleInputChange('specialtyId', e.target.value)}
                  >
                    <option value="">-- Chọn chuyên khoa được cấp phép --</option>
                    {specialties.map(spec => (
                      <option key={spec.id} value={spec.id}>{spec.name}</option>
                    ))}
                  </select>
                  <small className="text-muted">Bác sĩ chọn từ danh mục chuẩn hóa để bệnh nhân tìm kiếm chính xác.</small>
                </div>

                <div className="col-md-6">
                  <label className="form-label required">Học vị / Học hàm cao nhất</label>
                  <select
                    className="form-select"
                    value={formData.qualificationDegree}
                    onChange={(e) => handleInputChange('qualificationDegree', e.target.value)}
                  >
                    {QUALIFICATIONS.map(deg => (
                      <option key={deg} value={deg}>{deg}</option>
                    ))}
                  </select>
                </div>

                <div className="col-md-4">
                  <label className="form-label required">Số Chứng chỉ hành nghề (CCHN)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="VD: 012345/BYT-CCHN"
                    value={formData.licenseNumber}
                    onChange={(e) => handleInputChange('licenseNumber', e.target.value)}
                  />
                </div>

                <div className="col-md-4">
                  <label className="form-label">Ngày cấp CCHN</label>
                  <input
                    type="date"
                    className="form-control"
                    value={formData.licenseIssueDate}
                    onChange={(e) => handleInputChange('licenseIssueDate', e.target.value)}
                  />
                </div>

                <div className="col-md-4">
                  <label className="form-label">Nơi cấp CCHN</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Sở Y tế TP.HCM / Bộ Y tế"
                    value={formData.licenseIssuePlace}
                    onChange={(e) => handleInputChange('licenseIssuePlace', e.target.value)}
                  />
                </div>

                <div className="col-md-4">
                  <label className="form-label">Số năm kinh nghiệm hành nghề</label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    className="form-control"
                    value={formData.experienceYears}
                    onChange={(e) => handleInputChange('experienceYears', e.target.value)}
                  />
                </div>

                {/* Upload Scan CCHN & Bằng cấp */}
                <div className="col-md-12">
                  <label className="form-label required">
                    Tải lên bản scan Giấy phép hành nghề & Bằng cấp chuyên môn ({formData.licenseImages.length}/5)
                  </label>
                  <div className="license-upload-dropzone">
                    <input
                      type="file"
                      id="license-files"
                      multiple
                      accept="image/*"
                      onChange={handleLicenseImageUpload}
                      hidden
                    />
                    <label htmlFor="license-files" className="dropzone-label">
                      <i className="fas fa-cloud-upload-alt fa-2x mb-2 text-primary"></i>
                      <span>Nhấp để tải lên hoặc kéo thả ảnh scan CCHN, bằng đại học/chuyên khoa</span>
                      <small className="text-muted">Hỗ trợ JPG, PNG, WEBP (Tối đa 5 ảnh, dung lượng &lt; 5MB/ảnh)</small>
                    </label>
                  </div>

                  {formData.licenseImages.length > 0 && (
                    <div className="license-preview-grid mt-3">
                      {formData.licenseImages.map((img, idx) => (
                        <div key={idx} className="preview-item">
                          <img src={img} alt={`Document ${idx + 1}`} />
                          <button
                            type="button"
                            className="btn-remove-preview"
                            onClick={() => removeLicenseImage(idx)}
                            title="Xóa ảnh này"
                          >
                            <i className="fas fa-times"></i>
                          </button>
                          <span className="file-index-badge">Tài liệu #{idx + 1}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="col-md-12">
                  <label className="form-label">Tóm tắt quá trình công tác / Giới thiệu bản thân</label>
                  <textarea
                    rows="3"
                    className="form-control"
                    placeholder="Bác sĩ có thể mô tả quá trình đào tạo, thế mạnh khám chữa bệnh và các đề tài nghiên cứu..."
                    value={formData.bioDescription}
                    onChange={(e) => handleInputChange('bioDescription', e.target.value)}
                  ></textarea>
                </div>
              </div>
            </div>
          )}

          {/* ══════════ STEP 3: Nơi công tác & Tài chính ══════════ */}
          {currentStep === 3 && (
            <div className="wizard-step-content step-3 animate-fade-in">
              <div className="section-header">
                <h3 className="section-title"><i className="fas fa-hospital me-2 text-primary"></i>3. Nơi Đăng Ký Công Tác & Tài Khoản Nhận Thù Lao</h3>
                <p className="section-desc">Lựa chọn cơ sở y tế làm việc hoặc đăng ký hành nghề độc lập, cung cấp số tài khoản nhận đối soát doanh thu khám.</p>
              </div>

              <div className="row g-4 mt-2">
                {/* Switch Bác sĩ độc lập */}
                <div className="col-md-12">
                  <div className="p-3 bg-light rounded-3 border d-flex align-items-start gap-3">
                    <input
                      type="checkbox"
                      className="form-check-input mt-1"
                      id="independentDoctorCheck"
                      checked={formData.isIndependentDoctor}
                      onChange={(e) => handleInputChange('isIndependentDoctor', e.target.checked)}
                      style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
                    />
                    <label className="form-check-label mb-0" htmlFor="independentDoctorCheck" style={{ cursor: 'pointer' }}>
                      <strong className="text-dark d-block">
                        <i className="fas fa-user-md text-primary me-2"></i>Tôi là Bác sĩ hành nghề độc lập (Chưa trực thuộc cơ sở y tế cố định nào)
                      </strong>
                      <span className="text-muted small">
                        Hồ sơ chuyên môn của bạn vẫn được thẩm định và phê duyệt bình thường. Admin sẽ hỗ trợ kết nối cơ sở y tế phù hợp sau hoặc cho phép bạn tư vấn/hội chẩn trực tuyến độc lập.
                      </span>
                    </label>
                  </div>
                </div>

                {!formData.isIndependentDoctor ? (
                  <div className="col-md-6">
                    <label className="form-label required">Cơ sở y tế công tác (Clinic Master)</label>
                    <select
                      className="form-select"
                      value={formData.clinicId}
                      onChange={(e) => handleInputChange('clinicId', e.target.value)}
                    >
                      <option value="">-- Chọn bệnh viện / phòng khám làm việc --</option>
                      {clinics.map(clinic => (
                        <option key={clinic.id} value={clinic.id}>{clinic.name}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="col-md-6">
                    <label className="form-label text-muted">Cơ sở y tế công tác</label>
                    <input
                      type="text"
                      className="form-control bg-light text-muted"
                      value="Bác sĩ độc lập (Chờ Ban Quản trị phân bổ cơ sở sau)"
                      disabled
                    />
                  </div>
                )}

                <div className="col-md-6">
                  <label className="form-label">Phòng khám / Vị trí làm việc đề xuất</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder={formData.isIndependentDoctor ? "Ví dụ: Phòng khám trực tuyến / Khám từ xa" : "Ví dụ: Phòng 302 - Khoa khám theo yêu cầu"}
                    value={formData.proposedRoom}
                    onChange={(e) => handleInputChange('proposedRoom', e.target.value)}
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label">Mức giá khám đề xuất</label>
                  <select
                    className="form-select"
                    value={formData.priceId}
                    onChange={(e) => handleInputChange('priceId', e.target.value)}
                  >
                    {priceList.length > 0 ? (
                      priceList.map(p => (
                        <option key={p.keyMap} value={p.keyMap}>
                          {p.valueVi} ({p.keyMap})
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="PRI1">200.000 VNĐ</option>
                        <option value="PRI2">300.000 VNĐ</option>
                        <option value="PRI3">500.000 VNĐ</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="col-md-6">
                  <label className="form-label">Tỷ lệ hoa hồng nền tảng áp dụng</label>
                  <input
                    type="text"
                    className="form-control bg-light"
                    value="Mặc định theo Chính sách Sàn BookingCare (15%)"
                    disabled
                  />
                  <small className="text-muted">Tỷ lệ có thể được điều chỉnh sau khi Admin thẩm định.</small>
                </div>

                {/* Thông tin ngân hàng */}
                <div className="col-md-12 mt-4">
                  <h5 className="sub-heading"><i className="fas fa-university me-2 text-success"></i>Thông Tin Tài Khoản Nhận Thanh Toán Đối Soát</h5>
                  <div className="row g-3 mt-1">
                    <div className="col-md-4">
                      <label className="form-label required">Ngân hàng</label>
                      <select
                        className="form-select"
                        value={formData.bankName}
                        onChange={(e) => handleInputChange('bankName', e.target.value)}
                      >
                        {BANKS.map(bank => (
                          <option key={bank} value={bank}>{bank}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label required">Số tài khoản ngân hàng</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Nhập số tài khoản"
                        value={formData.bankAccountNumber}
                        onChange={(e) => handleInputChange('bankAccountNumber', e.target.value)}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label required">Tên chủ tài khoản (Viết hoa không dấu)</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="VD: NGUYEN VAN AN"
                        value={formData.bankAccountName}
                        onChange={(e) => handleInputChange('bankAccountName', e.target.value.toUpperCase())}
                      />
                      <small className="text-muted">Hệ thống đối soát tên chủ tài khoản với tên Bác sĩ.</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════ STEP 4: Kiểm tra & Xác nhận ══════════ */}
          {currentStep === 4 && (
            <div className="wizard-step-content step-4 animate-fade-in">
              <div className="section-header">
                <h3 className="section-title"><i className="fas fa-clipboard-check me-2 text-primary"></i>4. Kiểm Tra & Gửi Thẩm Định Hồ Sơ</h3>
                <p className="section-desc">Vui lòng rà soát lại thông tin trước khi chuyển hồ sơ cho Ban Quản trị xét duyệt.</p>
              </div>

              {/* Bảng tóm tắt hồ sơ */}
              <div className="review-summary-grid mt-3">
                <div className="review-section">
                  <h6><i className="fas fa-user-tie me-2 text-primary"></i>Thông tin cá nhân & Tài khoản</h6>
                  <div className="summary-row"><span>Họ và tên:</span> <strong>{formData.lastName} {formData.firstName}</strong></div>
                  <div className="summary-row"><span>Email đăng nhập:</span> <strong>{formData.email}</strong></div>
                  <div className="summary-row"><span>Số điện thoại:</span> <strong>{formData.phoneNumber}</strong></div>
                  <div className="summary-row"><span>Giới tính / Ngày sinh:</span> <strong>{formData.gender === 'M' ? 'Nam' : formData.gender === 'F' ? 'Nữ' : 'Khác'} | {formData.birthday || 'Chưa cập nhật'}</strong></div>
                  <div className="summary-row"><span>Số CCCD:</span> <strong>{formData.nationalId || 'Chưa cập nhật'}</strong></div>
                </div>

                <div className="review-section">
                  <h6><i className="fas fa-graduation-cap me-2 text-primary"></i>Năng lực chuyên môn & CCHN</h6>
                  <div className="summary-row">
                    <span>Chuyên khoa chính:</span>
                    <strong>{specialties.find(s => s.id === Number(formData.specialtyId))?.name || 'Chưa chọn'}</strong>
                  </div>
                  <div className="summary-row"><span>Học vị:</span> <strong>{formData.qualificationDegree}</strong></div>
                  <div className="summary-row"><span>Số CCHN:</span> <strong className="text-danger">{formData.licenseNumber}</strong></div>
                  <div className="summary-row"><span>Nơi cấp / Ngày cấp:</span> <strong>{formData.licenseIssuePlace} ({formData.licenseIssueDate || 'Chưa rõ'})</strong></div>
                  <div className="summary-row"><span>Tài liệu scan:</span> <strong>{formData.licenseImages.length} tài liệu đã đính kèm</strong></div>
                </div>

                <div className="review-section">
                  <h6><i className="fas fa-hospital-alt me-2 text-primary"></i>Cơ sở công tác & Tài chính</h6>
                  <div className="summary-row">
                    <span>Cơ sở y tế:</span>
                    <strong>{clinics.find(c => c.id === Number(formData.clinicId))?.name || 'Chưa chọn'}</strong>
                  </div>
                  <div className="summary-row"><span>Phòng khám:</span> <strong>{formData.proposedRoom || 'Phòng khám đa khoa'}</strong></div>
                  <div className="summary-row"><span>Tài khoản thù lao:</span> <strong>{formData.bankName} - {formData.bankAccountNumber || '---'} ({formData.bankAccountName || '---'})</strong></div>
                </div>
              </div>

              {/* Completeness Card */}
              <div className="completeness-summary-card mt-4">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="fw-bold"><i className="fas fa-check-double text-success me-2"></i>Điểm thẩm định tính đầy đủ hồ sơ:</span>
                  <span className="fs-5 fw-bold text-success">{completeness}% / 100%</span>
                </div>
                <div className="progress" style={{ height: '10px' }}>
                  <div className="progress-bar bg-success" style={{ width: `${completeness}%` }}></div>
                </div>
                <div className="completeness-checklist mt-3">
                  <span className={`check-pill ${formData.email && formData.phoneNumber ? 'valid' : 'invalid'}`}>
                    <i className={`fas ${formData.email && formData.phoneNumber ? 'fa-check' : 'fa-times'} me-1`}></i>Định danh & Tài khoản
                  </span>
                  <span className={`check-pill ${formData.specialtyId && formData.licenseNumber ? 'valid' : 'invalid'}`}>
                    <i className={`fas ${formData.specialtyId && formData.licenseNumber ? 'fa-check' : 'fa-times'} me-1`}></i>Số CCHN & Chuyên khoa
                  </span>
                  <span className={`check-pill ${formData.licenseImages.length > 0 ? 'valid' : 'invalid'}`}>
                    <i className={`fas ${formData.licenseImages.length > 0 ? 'fa-check' : 'fa-times'} me-1`}></i>Bản scan Giấy phép ({formData.licenseImages.length})
                  </span>
                  <span className={`check-pill ${formData.clinicId ? 'valid' : 'invalid'}`}>
                    <i className={`fas ${formData.clinicId ? 'fa-check' : 'fa-times'} me-1`}></i>Cơ sở y tế
                  </span>
                  <span className={`check-pill ${formData.bankAccountNumber ? 'valid' : 'invalid'}`}>
                    <i className={`fas ${formData.bankAccountNumber ? 'fa-check' : 'fa-times'} me-1`}></i>Tài khoản ngân hàng
                  </span>
                </div>
              </div>

              {/* Cam kết */}
              <div className="terms-agreement-box mt-4">
                <div className="form-check">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="agreeCheck"
                    checked={formData.agreedTerms}
                    onChange={(e) => handleInputChange('agreedTerms', e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="agreeCheck">
                    Tôi cam kết toàn bộ thông tin kê khai, số Giấy phép hành nghề y tế và các văn bằng đính kèm là hoàn toàn chính xác và chịu hoàn toàn trách nhiệm pháp lý theo Luật Khám bệnh, chữa bệnh hiện hành.
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Wizard Footer Controls */}
          <div className="wizard-footer-controls d-flex justify-content-between align-items-center mt-4 pt-3 border-top">
            <div className="d-flex gap-2">
              {currentStep > 1 && (
                <button
                  type="button"
                  className="btn btn-outline-secondary px-3"
                  onClick={handlePrevStep}
                  disabled={loading}
                >
                  <i className="fas fa-arrow-left me-2"></i>Quay lại
                </button>
              )}
              <button
                type="button"
                className="btn btn-outline-primary px-3"
                onClick={handleSaveDraft}
                title="Lưu tiến trình vào máy để tiếp tục hoàn thiện sau"
              >
                <i className="fas fa-save me-2"></i>Lưu nháp hồ sơ
              </button>
            </div>

            <div className="d-flex align-items-center gap-3">
              <button
                type="button"
                className="btn btn-link text-decoration-none text-muted small p-0"
                onClick={() => navigate('/doctor-onboarding-status')}
              >
                <i className="fas fa-search me-1"></i>Tra cứu hồ sơ đã nộp
              </button>

              {currentStep < 4 ? (
                <button
                  type="button"
                  className="btn btn-primary px-4 btn-next-step"
                  onClick={handleNextStep}
                >
                  Tiếp tục bước tiếp theo<i className="fas fa-arrow-right ms-2"></i>
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-success px-5 btn-submit-onboard"
                  onClick={handleSubmitOnboarding}
                  disabled={loading || !formData.agreedTerms}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Đang gửi hồ sơ...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-paper-plane me-2"></i>Gửi Hồ Sơ Thẩm Định Cho Admin
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default DoctorRegisterWizard;
