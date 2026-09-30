// src/containers/Patient/BookingModal.jsx
// Modal Đặt Lịch Khám — BookingCare v2.0
// Tối ưu hóa trải nghiệm:
// 1. "Lý do khám" đặt ở đầu tiên.
// 2. Thông tin bệnh nhân lấy từ Profile, hiển thị dạng thẻ tĩnh (read-only) sạch sẽ, có icon bút chì để sửa nhanh tại chỗ.
// 3. Email gắn liền với tài khoản, hiển thị cố định và không thể chỉnh sửa.
// 4. Hiển thị tài khoản hoàn tiền chính từ Profile của bệnh nhân, hỗ trợ đổi hoặc thêm tài khoản mới.
// 5. Lưu snapshot dữ liệu cá nhân & ngân hàng vào Booking tại thời điểm đặt khám.

import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import moment from 'moment';
import { toast } from 'react-toastify';
import { FormattedMessage, useIntl } from 'react-intl';
import { fetchAllcodeByType } from '../../redux/slices/appSlice';
import { updateUserInfo } from '../../redux/slices/userSlice';
import { LANGUAGES, ALLCODE_TYPES } from '../../utils/constants';
import {
  postBookAppointment,
  getPatientProfile,
  editPatientProfile,
  getPatientBankAccounts,
  addPatientBankAccount,
  setPrimaryBankAccount,
} from '../../services/patientService';
import { getMyWallet } from '../../services/walletService';
import { getSystemSettings } from '../../services/catalogService';
import './BookingModal.scss';

const POPULAR_BANKS = [
  'Vietcombank',
  'BIDV',
  'VietinBank',
  'Techcombank',
  'MB Bank',
  'Agribank',
  'ACB',
  'VPBank',
  'TPBank',
  'Sacombank',
  'HDBank',
  'VIB',
  'SHB',
  'SeABank',
  'OCB',
  'MSB',
];

const BookingModal = ({ isOpen, onClose, doctorId, timeSlot, date, price, selectedPractice }) => {
  const dispatch = useDispatch();
  const intl = useIntl();
  const language = useSelector((state) => state.app.language);
  const genders = useSelector((state) => state.app.genders);
  const userInfo = useSelector((state) => state.user.userInfo);

  // Lý do khám (nhập mỗi lần)
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState('');

  // Thông tin bệnh nhân (lấy từ Profile)
  const [patientData, setPatientData] = useState({
    fullName: '',
    phoneNumber: '',
    birthday: '',
    gender: '',
    address: '',
    email: '',
  });

  // Quick edit modal cho thông tin bệnh nhân
  const [showEditPatientModal, setShowEditPatientModal] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: '',
    phoneNumber: '',
    birthday: '',
    gender: '',
    address: '',
  });
  const [isSavingPatient, setIsSavingPatient] = useState(false);

  // Tài khoản ngân hàng hoàn tiền
  const [bankAccounts, setBankAccounts] = useState([]);
  const [selectedBank, setSelectedBank] = useState(null);
  const [showBankSelectModal, setShowBankSelectModal] = useState(false);
  const [showAddBankModal, setShowAddBankModal] = useState(false);
  const [newBankForm, setNewBankForm] = useState({
    bankName: 'Vietcombank',
    accountNumber: '',
    accountHolder: '',
    isPrimary: true,
  });
  const [isSavingBank, setIsSavingBank] = useState(false);

  // Ví BookingCare & Phương thức thanh toán
  const [walletInfo, setWalletInfo] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('WALLET'); // 'WALLET' | 'VNPAY'

  // Tính giá khám dạng số
  const rawPriceStr = selectedPractice?.priceTypeData?.valueVi || String(price || '0');
  const numericPrice = parseInt(rawPriceStr.replace(/[^0-9]/g, ''), 10) || 0;

  // Refund policy & UI submission state
  const [refundPolicy, setRefundPolicy] = useState({ before24h: '100', after24h: '50', thresholdHours: '24' });
  const [uiState, setUiState] = useState('idle');

  // Fetch gender allcode
  useEffect(() => {
    if (!genders || genders.length === 0) {
      dispatch(fetchAllcodeByType(ALLCODE_TYPES.GENDER));
    }
  }, [dispatch, genders]);

  // Fetch refund policy
  useEffect(() => {
    getSystemSettings()
      .then((res) => {
        const data = Array.isArray(res?.data) ? res.data : (Array.isArray(res?.data?.data) ? res.data.data : null);
        const errCode = res?.errCode !== undefined ? res.errCode : res?.data?.errCode;
        if (errCode === 0 && Array.isArray(data)) {
          setRefundPolicy({
            before24h: data.find((s) => s.key === 'refund_rate_cancel_before_24h')?.value || '100',
            after24h: data.find((s) => s.key === 'refund_rate_cancel_after_24h')?.value || '50',
            thresholdHours: data.find((s) => s.key === 'refund_threshold_hours')?.value || '24',
          });
        }
      })
      .catch(() => {});
  }, []);

  // Tải dữ liệu bệnh nhân & tài khoản ngân hàng khi modal mở
  useEffect(() => {
    if (isOpen) {
      loadPatientDetails();
      loadPatientBanks();
    }
  }, [isOpen, userInfo]);

  const loadPatientDetails = async () => {
    try {
      const res = await getPatientProfile();
      if (res.errCode === 0 && res.data) {
        const u = res.data;
        const name = [u.lastName || '', u.firstName || ''].filter(Boolean).join(' ');
        setPatientData({
          fullName: name || (userInfo ? `${userInfo.lastName || ''} ${userInfo.firstName || ''}`.trim() : ''),
          phoneNumber: u.phoneNumber || userInfo?.phoneNumber || '',
          birthday: u.birthday || '',
          gender: u.gender || userInfo?.gender || '',
          address: u.address || userInfo?.address || '',
          email: u.email || userInfo?.email || '',
        });
      } else if (userInfo) {
        setPatientData({
          fullName: `${userInfo.lastName || ''} ${userInfo.firstName || ''}`.trim(),
          phoneNumber: userInfo.phoneNumber || '',
          birthday: userInfo.birthday || '',
          gender: userInfo.gender || '',
          address: userInfo.address || '',
          email: userInfo.email || '',
        });
      }

      // Tải thông tin ví nếu đã đăng nhập
      if (userInfo) {
        try {
          const wRes = await getMyWallet();
          if (wRes && wRes.errCode === 0) {
            setWalletInfo(wRes.data);
          }
        } catch (wErr) {
          console.error('loadWallet error:', wErr);
        }
      }
    } catch (e) {
      console.error('loadPatientDetails error:', e);
    }
  };

  const loadPatientBanks = async () => {
    try {
      const res = await getPatientBankAccounts();
      if (res.errCode === 0 && Array.isArray(res.data)) {
        setBankAccounts(res.data);
        const primary = res.data.find((a) => a.isPrimary) || res.data[0] || null;
        setSelectedBank(primary);
      }
    } catch (e) {
      console.error('loadPatientBanks error:', e);
    }
  };

  const handleCloseModal = () => {
    setReason('');
    setReasonError('');
    setUiState('idle');
    setShowEditPatientModal(false);
    setShowBankSelectModal(false);
    setShowAddBankModal(false);
    onClose();
  };

  // Mở modal Quick Edit
  const handleOpenEditPatient = () => {
    setEditForm({
      fullName: patientData.fullName,
      phoneNumber: patientData.phoneNumber,
      birthday: patientData.birthday,
      gender: patientData.gender,
      address: patientData.address,
    });
    setShowEditPatientModal(true);
  };

  // Lưu Quick Edit
  const handleSavePatientInfo = async (e) => {
    e.preventDefault();
    if (!editForm.fullName || editForm.fullName.trim().length < 2) {
      toast.error('Họ và tên không hợp lệ!');
      return;
    }
    const phoneRegex = /^[0-9]{10,11}$/;
    if (!editForm.phoneNumber || !phoneRegex.test(editForm.phoneNumber)) {
      toast.error('Số điện thoại phải từ 10-11 chữ số!');
      return;
    }

    setIsSavingPatient(true);
    try {
      const res = await editPatientProfile(editForm);
      if (res.errCode === 0) {
        toast.success('Cập nhật thông tin thành công!');
        setPatientData((prev) => ({
          ...prev,
          fullName: editForm.fullName,
          phoneNumber: editForm.phoneNumber,
          birthday: editForm.birthday,
          gender: editForm.gender,
          address: editForm.address,
        }));

        // Đồng bộ Redux
        if (res.data) {
          dispatch(
            updateUserInfo({
              firstName: res.data.firstName,
              lastName: res.data.lastName,
              phoneNumber: res.data.phoneNumber,
              address: res.data.address,
              gender: res.data.gender,
              birthday: res.data.birthday,
            })
          );
        }

        setShowEditPatientModal(false);
      } else {
        toast.error(res.message || 'Cập nhật thông tin thất bại!');
      }
    } catch (err) {
      toast.error('Lỗi khi lưu thông tin!');
    } finally {
      setIsSavingPatient(false);
    }
  };

  // Chọn tài khoản ngân hàng khác
  const handleSelectBankAccount = (acc) => {
    setSelectedBank(acc);
    setShowBankSelectModal(false);
  };

  // Mở form thêm tài khoản ngân hàng mới
  const handleOpenAddBank = () => {
    setNewBankForm({
      bankName: 'Vietcombank',
      accountNumber: '',
      accountHolder: patientData.fullName.toUpperCase().trim(),
      isPrimary: bankAccounts.length === 0,
    });
    setShowBankSelectModal(false);
    setShowAddBankModal(true);
  };

  // Lưu tài khoản ngân hàng mới
  const handleSaveNewBank = async (e) => {
    e.preventDefault();
    if (!newBankForm.bankName || !newBankForm.accountNumber || !newBankForm.accountHolder) {
      toast.error('Vui lòng điền đầy đủ thông tin tài khoản!');
      return;
    }

    setIsSavingBank(true);
    try {
      const res = await addPatientBankAccount({
        ...newBankForm,
        accountHolderName: newBankForm.accountHolder,
      });
      if (res.errCode === 0) {
        toast.success('Thêm tài khoản ngân hàng thành công!');
        setShowAddBankModal(false);
        const listRes = await getPatientBankAccounts();
        if (listRes.errCode === 0 && Array.isArray(listRes.data)) {
          setBankAccounts(listRes.data);
          const current = listRes.data.find((a) => a.id === res.data.id) || listRes.data[0];
          setSelectedBank(current);
        }
      } else {
        toast.error(res.message || 'Thêm tài khoản thất bại!');
      }
    } catch (err) {
      toast.error('Lỗi khi thêm tài khoản ngân hàng!');
    } finally {
      setIsSavingBank(false);
    }
  };

  // Xử lý gửi đặt lịch khám
  const handleSubmit = async () => {
    if (!reason || reason.trim().length === 0) {
      setReasonError('Vui lòng nhập lý do khám bệnh!');
      return;
    }
    setReasonError('');

    if (!patientData.fullName || patientData.fullName.trim().length < 2) {
      toast.error('Vui lòng cập nhật đầy đủ Họ và tên của bạn!');
      handleOpenEditPatient();
      return;
    }

    if (!patientData.phoneNumber) {
      toast.error('Vui lòng cập nhật Số điện thoại liên hệ!');
      handleOpenEditPatient();
      return;
    }

    // Kiểm tra số dư ví nếu chọn thanh toán bằng Ví BookingCare
    if (paymentMethod === 'WALLET') {
      if (!walletInfo) {
        toast.error('Không tìm thấy thông tin Ví BookingCare. Vui lòng kiểm tra lại tài khoản!');
        return;
      }
      if ((walletInfo.availableBalance || 0) < numericPrice) {
        toast.error(
          `Số dư Ví BookingCare không đủ để thanh toán (Hiện có: ${(walletInfo.availableBalance || 0).toLocaleString('vi-VN')} ₫, Cần: ${numericPrice.toLocaleString('vi-VN')} ₫). Vui lòng nạp thêm tiền hoặc chọn hình thức khác!`
        );
        return;
      }
    }

    if (uiState === 'loading') return;
    setUiState('loading');

    try {
      const response = await postBookAppointment({
        doctorId,
        date,
        timeType: timeSlot.timeType,
        fullName: patientData.fullName,
        email: patientData.email || userInfo?.email || '',
        phoneNumber: patientData.phoneNumber,
        address: patientData.address,
        reason: reason.trim(),
        birthday: patientData.birthday,
        gender: patientData.gender,
        language: language,
        // Multi-Facility Context
        clinicId: selectedPractice?.clinicId || null,
        doctorAssignmentId: selectedPractice?.id || null,
        // Phương thức thanh toán
        paymentMethod: paymentMethod, // 'WALLET' | 'VNPAY'
        // Snapshot thông tin tài khoản hoàn tiền
        bankAccountNumber: selectedBank ? selectedBank.accountNumber : '',
        bankAccountName: selectedBank ? (selectedBank.accountHolder || selectedBank.accountHolderName) : '',
        bankName: selectedBank ? selectedBank.bankName : '',
      });

      if (response && response.errCode === 0) {
        if (paymentMethod === 'WALLET') {
          toast.success(
            language === LANGUAGES.VI
              ? 'Đặt lịch và thanh toán bằng Ví BookingCare thành công! Lịch hẹn đã được xác nhận trực tiếp.'
              : 'Booking and payment via BookingCare Wallet successful! Appointment confirmed.'
          );
        } else {
          toast.success(
            language === LANGUAGES.VI
              ? 'Đặt lịch thành công! Vui lòng kiểm tra email để xác nhận và thanh toán.'
              : 'Booking successful! Please check your email to confirm and pay.'
          );
        }
        handleCloseModal();
      } else {
        toast.error(response?.message || response?.errMessage || 'Lỗi đặt lịch khám!');
        setUiState('idle');
      }
    } catch (err) {
      toast.error('Lỗi kết nối máy chủ!');
      setUiState('idle');
    }
  };

  if (!isOpen) return null;

  const formattedDate = moment(parseInt(date, 10)).format(
    language === LANGUAGES.VI ? 'dddd, DD/MM/YYYY' : 'dddd, MM/DD/YYYY'
  );
  const timeLabel = language === LANGUAGES.VI ? timeSlot.timeTypeData?.valueVi : timeSlot.timeTypeData?.valueEn;

  // Render label giới tính
  const getGenderLabel = () => {
    if (!patientData.gender) return 'Chưa cập nhật';
    const found = genders && genders.find((g) => g.keyMap === patientData.gender);
    if (found) return language === LANGUAGES.VI ? found.valueVi : found.valueEn;
    if (patientData.gender === 'G1') return 'Nam';
    if (patientData.gender === 'G2') return 'Nữ';
    return 'Khác';
  };

  return (
    <div className="bm-overlay" onClick={handleCloseModal}>
      <div className="bm" onClick={(e) => e.stopPropagation()}>
        {/* ===== HEADER ===== */}
        <div className="bm__header">
          <div className="bm__header-title">
            <span className="bm__header-icon">
              <i className="fas fa-calendar-check" />
            </span>
            <h2>
              <FormattedMessage id="booking-modal.title" />
            </h2>
          </div>
          <button className="bm__close" onClick={handleCloseModal} aria-label="Đóng">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* ===== BODY ===== */}
        <div className="bm__body">
          {/* --- CỘT TRÁI: Tóm tắt lịch hẹn & chính sách --- */}
          <div className="bm__summary">
            <div className="bm__summary-section">
              <p className="bm__summary-label">Thời gian khám</p>
              <p className="bm__summary-value bm__summary-value--highlight">{timeLabel}</p>
              <p className="bm__summary-date">{formattedDate}</p>
            </div>

            {/* Thông tin Cơ sở khám bệnh (Multi-Facility) */}
            {selectedPractice?.clinicData?.name && (
              <>
                <div className="bm__summary-divider" />
                <div className="bm__summary-section">
                  <p className="bm__summary-label">Cơ sở khám bệnh</p>
                  <p className="bm__summary-value" style={{ fontWeight: 700, color: '#0f172a' }}>
                    {selectedPractice.clinicData.name}
                  </p>
                  {selectedPractice.roomNumber && (
                    <p className="bm__summary-date" style={{ color: '#087f8c', fontWeight: 600 }}>
                      Phòng khám: {selectedPractice.roomNumber}
                    </p>
                  )}
                  {selectedPractice.clinicData.address && (
                    <p className="bm__summary-date" style={{ fontSize: '0.78rem' }}>
                      {selectedPractice.clinicData.address}
                    </p>
                  )}
                </div>
              </>
            )}

            <div className="bm__summary-divider" />

            <div className="bm__summary-section">
              <p className="bm__summary-label">Giá khám dịch vụ</p>
              <p className="bm__summary-value" style={{ color: '#059669', fontWeight: 700 }}>
                {selectedPractice?.priceTypeData?.valueVi || (price ? `${price} VNĐ` : 'Miễn phí đặt lịch')}
              </p>
            </div>

            <div className="bm__summary-divider" />

            <div className="bm__summary-section">
              <p className="bm__summary-label">Chính sách hoàn tiền</p>
              <div className="bm__refund-item bm__refund-item--ok">
                <span className="bm__refund-dot" />
                <span>
                  Hủy trước {refundPolicy.thresholdHours || 24}h: hoàn <strong>{refundPolicy.before24h}%</strong>
                </span>
              </div>
              <div className="bm__refund-item bm__refund-item--warn">
                <span className="bm__refund-dot" />
                <span>
                  Hủy sau {refundPolicy.thresholdHours || 24}h: hoàn <strong>{refundPolicy.after24h}%</strong>
                </span>
              </div>
            </div>
          </div>

          {/* --- CỘT PHẢI: Form đặt lịch theo bố cục mới --- */}
          <div className="bm__form">
            {/* 1. LÝ DO KHÁM BỆNH (ĐẶT Ở ĐẦU TIÊN) */}
            <div className="bm__section bm__section--primary">
              <div className="bm__section-header">
                <span className="bm__section-badge">1</span>
                <h3 className="bm__section-title">Lý do khám bệnh <span className="bm__required">*</span></h3>
              </div>
              <p className="bm__section-desc">Mô tả triệu chứng, tình trạng sức khỏe hoặc nhu cầu tư vấn của bạn để bác sĩ chuẩn bị tốt nhất.</p>
              <textarea
                className={`bm__textarea${reasonError ? ' bm__textarea--error' : ''}`}
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (reasonError) setReasonError('');
                }}
                rows={3}
                placeholder="Ví dụ: Đau đầu kéo dài kèm chóng mặt, muốn kiểm tra huyết áp..."
                autoFocus
              />
              {reasonError && <span className="bm__error">{reasonError}</span>}
            </div>

            {/* 2. THÔNG TIN BỆNH NHÂN (DẠNG THẺ TĨNH CÓ BÚT CHÌ CHỈNH SỬA) */}
            <div className="bm__section">
              <div className="bm__section-header tw-flex tw-justify-between tw-items-center">
                <div className="tw-flex tw-items-center tw-gap-2">
                  <span className="bm__section-badge">2</span>
                  <h3 className="bm__section-title">Thông tin người khám</h3>
                </div>
                <button
                  type="button"
                  className="bm__edit-profile-btn"
                  onClick={handleOpenEditPatient}
                  title="Chỉnh sửa thông tin hồ sơ"
                >
                  <i className="fas fa-pencil-alt" /> <span>Chỉnh sửa</span>
                </button>
              </div>
              <p className="bm__section-desc">Thông tin cố định từ hồ sơ cá nhân của bạn, được lưu độc lập vào hồ sơ lịch hẹn này.</p>

              {/* Lưới thẻ thông tin cá nhân */}
              <div className="bm__profile-grid">
                <div className="bm__info-tile">
                  <span className="bm__info-tile-label">Họ và tên</span>
                  <span className="bm__info-tile-val">{patientData.fullName || '—'}</span>
                </div>

                <div className="bm__info-tile">
                  <span className="bm__info-tile-label">Số điện thoại</span>
                  <span className="bm__info-tile-val">{patientData.phoneNumber || '—'}</span>
                </div>

                <div className="bm__info-tile">
                  <span className="bm__info-tile-label">Ngày sinh</span>
                  <span className="bm__info-tile-val">
                    {patientData.birthday ? moment(patientData.birthday).format('DD/MM/YYYY') : 'Chưa cập nhật'}
                  </span>
                </div>

                <div className="bm__info-tile">
                  <span className="bm__info-tile-label">Giới tính</span>
                  <span className="bm__info-tile-val">{getGenderLabel()}</span>
                </div>

                <div className="bm__info-tile bm__info-tile--full">
                  <span className="bm__info-tile-label">Địa chỉ</span>
                  <span className="bm__info-tile-val">{patientData.address || 'Chưa cập nhật'}</span>
                </div>
              </div>

              {/* Email cố định liên kết tài khoản */}
              <div className="bm__email-card">
                <div className="bm__email-card-icon">
                  <i className="fas fa-envelope-open-text" />
                </div>
                <div className="bm__email-card-info">
                  <div className="tw-flex tw-items-center tw-gap-2">
                    <span className="bm__email-val">{patientData.email}</span>
                    <span className="bm__email-badge">Tài khoản</span>
                  </div>
                  <span className="bm__email-hint">Email nhận vé khám và link thanh toán trực tuyến (không thể thay đổi).</span>
                </div>
              </div>
            </div>

            {/* 3. PHƯƠNG THỨC THANH TOÁN */}
            <div className="bm__section">
              <div className="bm__section-header tw-flex tw-justify-between tw-items-center">
                <div className="tw-flex tw-items-center tw-gap-2">
                  <span className="bm__section-badge">3</span>
                  <h3 className="bm__section-title">Phương thức thanh toán</h3>
                </div>
              </div>
              <p className="bm__section-desc">Chọn phương thức thanh toán an toàn và tiện lợi nhất cho bạn.</p>

              {/* Bộ chọn phương thức thanh toán */}
              <div className="bm__payment-methods">
                {/* 1. VÍ ĐIỆN TỬ BOOKINGCARE */}
                <div
                  className={`bm__payment-option ${paymentMethod === 'WALLET' ? 'bm__payment-option--selected' : ''}`}
                  onClick={() => setPaymentMethod('WALLET')}
                >
                  <input
                    type="radio"
                    className="payment-radio"
                    checked={paymentMethod === 'WALLET'}
                    onChange={() => setPaymentMethod('WALLET')}
                  />
                  <div className="payment-icon-wrap payment-icon-wrap--wallet">
                    <i className="fas fa-wallet" />
                  </div>
                  <div className="payment-content">
                    <div className="payment-title-row">
                      <span className="payment-title">Ví BookingCare</span>
                      <span className="recommended-pill">Khuyên dùng · Xác nhận tức thì</span>
                    </div>
                    <p className="payment-desc">
                      Xác nhận lịch khám ngay lập tức không cần chờ duyệt. Hoàn tiền tự động 100% về ví trong tích tắc nếu hủy lịch hợp lệ.
                    </p>
                    <div className="payment-balance-badge">
                      {walletInfo ? (
                        walletInfo.availableBalance >= numericPrice ? (
                          <span className="tw-inline-flex tw-items-center tw-gap-1.5 tw-px-2.5 tw-py-1 tw-rounded-md tw-text-xs tw-font-semibold tw-bg-emerald-50 tw-text-emerald-700 tw-border tw-border-emerald-200">
                            <i className="fas fa-check-circle" /> Số dư khả dụng: {walletInfo.availableBalance.toLocaleString('vi-VN')} ₫ (Đủ thanh toán)
                          </span>
                        ) : (
                          <div className="tw-flex tw-items-center tw-gap-2 tw-flex-wrap">
                            <span className="tw-inline-flex tw-items-center tw-gap-1.5 tw-px-2.5 tw-py-1 tw-rounded-md tw-text-xs tw-font-semibold tw-bg-amber-50 tw-text-amber-700 tw-border tw-border-amber-200">
                              <i className="fas fa-exclamation-triangle" /> Số dư khả dụng: {walletInfo.availableBalance.toLocaleString('vi-VN')} ₫ (Thiếu {(numericPrice - walletInfo.availableBalance).toLocaleString('vi-VN')} ₫)
                            </span>
                            <a
                              href="/patient/wallet"
                              target="_blank"
                              rel="noreferrer"
                              className="tw-text-xs tw-font-bold tw-text-teal-700 hover:tw-underline tw-inline-flex tw-items-center tw-gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <i className="fas fa-plus-circle" /> Nạp tiền vào ví
                            </a>
                          </div>
                        )
                      ) : (
                        <span className="tw-text-xs tw-text-slate-400">Đang kiểm tra số dư ví...</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. CỔNG THANH TOÁN VNPAY */}
                <div
                  className={`bm__payment-option ${paymentMethod === 'VNPAY' ? 'bm__payment-option--selected' : ''}`}
                  onClick={() => setPaymentMethod('VNPAY')}
                >
                  <input
                    type="radio"
                    className="payment-radio"
                    checked={paymentMethod === 'VNPAY'}
                    onChange={() => setPaymentMethod('VNPAY')}
                  />
                  <div className="payment-icon-wrap payment-icon-wrap--vnpay">
                    <i className="fas fa-credit-card" />
                  </div>
                  <div className="payment-content">
                    <div className="payment-title-row">
                      <span className="payment-title">Cổng thanh toán VNPay / Thẻ ngân hàng</span>
                    </div>
                    <p className="payment-desc">
                      Nhận email hướng dẫn thanh toán. Nếu hủy lịch, tiền hoàn sẽ được chuyển khoản thủ công về tài khoản ngân hàng sau khi đối soát.
                    </p>
                  </div>
                </div>
              </div>

              {/* Nếu chọn VNPAY: Hiển thị mục cấu hình tài khoản ngân hàng nhận tiền hoàn thủ công */}
              {paymentMethod === 'VNPAY' && (
                <div className="tw-mt-3 tw-pt-3 tw-border-t tw-border-slate-200">
                  <div className="tw-flex tw-justify-between tw-items-center tw-mb-2">
                    <span className="tw-text-xs tw-font-bold tw-text-slate-700">Tài khoản nhận hoàn tiền (VNPay):</span>
                    {bankAccounts.length > 1 && (
                      <button
                        type="button"
                        className="bm__switch-bank-btn"
                        onClick={() => setShowBankSelectModal(true)}
                      >
                        <i className="fas fa-exchange-alt" /> Đổi tài khoản
                      </button>
                    )}
                  </div>

                  {selectedBank ? (
                    <div className="bm__bank-card">
                      <div className="bm__bank-card-icon">
                        <i className="fas fa-university" />
                      </div>
                      <div className="bm__bank-card-details">
                        <div className="tw-flex tw-items-center tw-gap-2">
                          <span className="bm__bank-card-name">{selectedBank.bankName}</span>
                          {selectedBank.isPrimary && <span className="bm__bank-card-primary">Chính</span>}
                        </div>
                        <span className="bm__bank-card-number">{selectedBank.accountNumber}</span>
                        <span className="bm__bank-card-holder">Chủ TK: {selectedBank.accountHolder || selectedBank.accountHolderName}</span>
                      </div>
                      <button
                        type="button"
                        className="bm__bank-card-edit"
                        onClick={() => setShowBankSelectModal(true)}
                        title="Thay đổi tài khoản"
                      >
                        <i className="fas fa-pencil-alt" />
                      </button>
                    </div>
                  ) : (
                    <div className="bm__bank-empty">
                      <span>Chưa có tài khoản hoàn tiền trong hồ sơ.</span>
                      <button
                        type="button"
                        className="bm__bank-add-btn"
                        onClick={handleOpenAddBank}
                      >
                        <i className="fas fa-plus" /> Thêm tài khoản ngân hàng
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ===== FOOTER ===== */}
        <div className="bm__footer">
          <button className="bm__btn bm__btn--cancel" onClick={handleCloseModal}>
            <FormattedMessage id="booking-modal.cancel-btn" />
          </button>
          <button
            className="bm__btn bm__btn--confirm"
            onClick={handleSubmit}
            disabled={uiState === 'loading'}
          >
            {uiState === 'loading' ? (
              <>
                <i className="fas fa-spinner fa-spin" /> Đang xử lý...
              </>
            ) : language === LANGUAGES.VI ? (
              'Xác nhận đặt lịch'
            ) : (
              'Confirm Booking'
            )}
          </button>
        </div>
      </div>

      {/* ===== POPUP 1: CHỈNH SỬA THÔNG TIN BỆNH NHÂN (QUICK EDIT) ===== */}
      {showEditPatientModal && (
        <div className="bm-submodal-overlay" onClick={() => setShowEditPatientModal(false)}>
          <div className="bm-submodal" onClick={(e) => e.stopPropagation()}>
            <div className="bm-submodal__header">
              <h3>
                <i className="fas fa-user-edit tw-text-teal-600 tw-mr-2" /> Chỉnh sửa thông tin bệnh nhân
              </h3>
              <button
                type="button"
                className="bm-submodal__close"
                onClick={() => setShowEditPatientModal(false)}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSavePatientInfo} className="bm-submodal__body">
              <div className="bm__field">
                <label className="bm__label">Họ và tên *</label>
                <input
                  type="text"
                  className="bm__input"
                  value={editForm.fullName}
                  onChange={(e) => setEditForm((p) => ({ ...p, fullName: e.target.value }))}
                  required
                />
              </div>

              <div className="bm__row">
                <div className="bm__field">
                  <label className="bm__label">Số điện thoại *</label>
                  <input
                    type="tel"
                    className="bm__input"
                    value={editForm.phoneNumber}
                    onChange={(e) => setEditForm((p) => ({ ...p, phoneNumber: e.target.value }))}
                    required
                  />
                </div>

                <div className="bm__field">
                  <label className="bm__label tw-flex tw-justify-between tw-items-center">
                    <span>Ngày sinh</span>
                    <span className="tw-text-xs tw-text-teal-600 tw-font-normal">dd/mm/yyyy</span>
                  </label>
                  <input
                    type="date"
                    className="bm__input"
                    value={editForm.birthday}
                    onChange={(e) => setEditForm((p) => ({ ...p, birthday: e.target.value }))}
                  />
                  <span className="tw-text-[11px] tw-text-slate-400 tw-mt-0.5 tw-block">
                    Định dạng: ngày/tháng/năm (dd/mm/yyyy)
                  </span>
                </div>
              </div>

              <div className="bm__row">
                <div className="bm__field">
                  <label className="bm__label">Giới tính</label>
                  <select
                    className="bm__select"
                    value={editForm.gender}
                    onChange={(e) => setEditForm((p) => ({ ...p, gender: e.target.value }))}
                  >
                    <option value="">-- Chọn giới tính --</option>
                    {genders &&
                      genders.map((g) => (
                        <option key={g.keyMap} value={g.keyMap}>
                          {language === LANGUAGES.VI ? g.valueVi : g.valueEn}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="bm__field">
                  <label className="bm__label">Địa chỉ</label>
                  <input
                    type="text"
                    className="bm__input"
                    value={editForm.address}
                    onChange={(e) => setEditForm((p) => ({ ...p, address: e.target.value }))}
                    placeholder="Quận/Huyện, Tỉnh/Thành phố"
                  />
                </div>
              </div>

              <p className="bm-submodal__notice">
                <i className="fas fa-info-circle tw-mr-1" />
                Thay đổi sẽ được cập nhật đồng bộ vào Hồ sơ bệnh nhân và lưu độc lập cho lịch khám này.
              </p>

              <div className="bm-submodal__footer">
                <button
                  type="button"
                  className="bm__btn bm__btn--cancel"
                  onClick={() => setShowEditPatientModal(false)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="bm__btn bm__btn--confirm"
                  disabled={isSavingPatient}
                >
                  {isSavingPatient ? <i className="fas fa-spinner fa-spin" /> : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== POPUP 2: CHỌN HOẶC THÊM TÀI KHOẢN NGÂN HÀNG ===== */}
      {showBankSelectModal && (
        <div className="bm-submodal-overlay" onClick={() => setShowBankSelectModal(false)}>
          <div className="bm-submodal" onClick={(e) => e.stopPropagation()}>
            <div className="bm-submodal__header">
              <h3>
                <i className="fas fa-university tw-text-teal-600 tw-mr-2" /> Chọn tài khoản nhận tiền hoàn
              </h3>
              <button
                type="button"
                className="bm-submodal__close"
                onClick={() => setShowBankSelectModal(false)}
              >
                &times;
              </button>
            </div>

            <div className="bm-submodal__body">
              <div className="bm-submodal__bank-list">
                {bankAccounts.map((acc) => (
                  <div
                    key={acc.id}
                    className={`bm-submodal__bank-item${selectedBank?.id === acc.id ? ' bm-submodal__bank-item--selected' : ''}`}
                    onClick={() => handleSelectBankAccount(acc)}
                  >
                    <div className="tw-flex tw-items-center tw-gap-3">
                      <div className="bm-submodal__bank-icon">
                        <i className="fas fa-credit-card" />
                      </div>
                      <div>
                        <div className="tw-flex tw-items-center tw-gap-2">
                          <span className="tw-font-semibold tw-text-slate-800 tw-text-sm">{acc.bankName}</span>
                          {acc.isPrimary && (
                            <span className="tw-text-[10px] tw-bg-emerald-50 tw-text-emerald-700 tw-border tw-border-emerald-200 tw-px-1.5 tw-py-0.5 tw-rounded">
                              Mặc định
                            </span>
                          )}
                        </div>
                        <div className="tw-text-xs tw-text-slate-500 tw-font-mono">{acc.accountNumber}</div>
                        <div className="tw-text-[11px] tw-text-slate-600">{acc.accountHolder || acc.accountHolderName}</div>
                      </div>
                    </div>
                    {selectedBank?.id === acc.id && (
                      <i className="fas fa-check-circle tw-text-teal-600 tw-text-lg" />
                    )}
                  </div>
                ))}
              </div>

              <div className="tw-pt-3 tw-border-t tw-border-slate-100 tw-flex tw-justify-between tw-items-center">
                <button
                  type="button"
                  className="bm__bank-add-btn"
                  onClick={handleOpenAddBank}
                >
                  <i className="fas fa-plus" /> Thêm tài khoản mới
                </button>
                <button
                  type="button"
                  className="bm__btn bm__btn--cancel"
                  onClick={() => setShowBankSelectModal(false)}
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== POPUP 3: THÊM TÀI KHOẢN NGÂN HÀNG MỚI ===== */}
      {showAddBankModal && (
        <div className="bm-submodal-overlay" onClick={() => setShowAddBankModal(false)}>
          <div className="bm-submodal" onClick={(e) => e.stopPropagation()}>
            <div className="bm-submodal__header">
              <h3>
                <i className="fas fa-plus-circle tw-text-teal-600 tw-mr-2" /> Thêm tài khoản ngân hàng mới
              </h3>
              <button
                type="button"
                className="bm-submodal__close"
                onClick={() => setShowAddBankModal(false)}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveNewBank} className="bm-submodal__body">
              <div className="bm__field">
                <label className="bm__label">Ngân hàng *</label>
                <select
                  className="bm__select"
                  value={newBankForm.bankName}
                  onChange={(e) => setNewBankForm((p) => ({ ...p, bankName: e.target.value }))}
                >
                  {POPULAR_BANKS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              <div className="bm__field">
                <label className="bm__label">Số tài khoản *</label>
                <input
                  type="text"
                  className="bm__input"
                  placeholder="Ví dụ: 0123456789"
                  value={newBankForm.accountNumber}
                  onChange={(e) =>
                    setNewBankForm((p) => ({ ...p, accountNumber: e.target.value.replace(/\s+/g, '') }))
                  }
                  required
                />
              </div>

              <div className="bm__field">
                <label className="bm__label">Tên chủ tài khoản *</label>
                <input
                  type="text"
                  className="bm__input tw-uppercase"
                  placeholder="Ví dụ: NGUYEN VAN A"
                  value={newBankForm.accountHolder}
                  onChange={(e) =>
                    setNewBankForm((p) => ({ ...p, accountHolder: e.target.value.toUpperCase() }))
                  }
                  required
                />
              </div>

              <div className="bm-submodal__footer">
                <button
                  type="button"
                  className="bm__btn bm__btn--cancel"
                  onClick={() => setShowAddBankModal(false)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="bm__btn bm__btn--confirm"
                  disabled={isSavingBank}
                >
                  {isSavingBank ? <i className="fas fa-spinner fa-spin" /> : 'Lưu tài khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingModal;

