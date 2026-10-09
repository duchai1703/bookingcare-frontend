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
import { getMyWallet, createDepositPaymentUrl } from '../../services/walletService';
import { getSystemSettings } from '../../services/catalogService';
import { getFamilyMembers, createFamilyMember } from '../../services/familyMemberService';
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

  // Ví BookingCare & Phương thức thanh toán (Chuẩn hóa 100% qua Ví)
  const [walletInfo, setWalletInfo] = useState(null);
  const [isTopUpLoading, setIsTopUpLoading] = useState(false);
  const [isRefreshingWallet, setIsRefreshingWallet] = useState(false);
  const paymentMethod = 'WALLET';

  // [Family Members & Dependents] Đặt cho Bản thân hay Người thân
  const [bookingFor, setBookingFor] = useState('SELF'); // 'SELF' | 'FAMILY'
  const [familyMembers, setFamilyMembers] = useState([]);
  const [selectedFamilyMember, setSelectedFamilyMember] = useState(null);
  const [isLoadingFamily, setIsLoadingFamily] = useState(false);
  const [showAddFamilyModal, setShowAddFamilyModal] = useState(false);
  const [newFamilyForm, setNewFamilyForm] = useState({
    fullName: '',
    relationship: 'CHILD',
    gender: 'MALE',
    birthday: '',
    phoneNumber: '',
    medicalHistory: '',
  });
  const [isSavingFamily, setIsSavingFamily] = useState(false);

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
      if (userInfo) {
        loadFamilyMembers();
      }
    }
  }, [isOpen, userInfo]);

  const loadFamilyMembers = async () => {
    setIsLoadingFamily(true);
    try {
      const res = await getFamilyMembers();
      if (res && res.errCode === 0 && Array.isArray(res.data)) {
        setFamilyMembers(res.data);
        if (res.data.length > 0 && !selectedFamilyMember) {
          setSelectedFamilyMember(res.data[0]);
        }
      }
    } catch (err) {
      console.error('loadFamilyMembers error:', err);
    } finally {
      setIsLoadingFamily(false);
    }
  };

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
        await loadPatientWallet();
      }
    } catch (e) {
      console.error('loadPatientDetails error:', e);
    }
  };

  const loadPatientWallet = async () => {
    setIsRefreshingWallet(true);
    try {
      const wRes = await getMyWallet();
      if (wRes && wRes.errCode === 0 && wRes.data) {
        setWalletInfo(wRes.data);
      }
    } catch (wErr) {
      console.error('loadWallet error:', wErr);
    } finally {
      setIsRefreshingWallet(false);
    }
  };

  const handleQuickTopUp = async () => {
    const avail = walletInfo?.availableBalance || 0;
    const missing = Math.max(10000, numericPrice - avail);
    setIsTopUpLoading(true);
    try {
      const res = await createDepositPaymentUrl({ amount: missing });
      if (res && res.errCode === 0 && res.data?.paymentUrl) {
        window.open(res.data.paymentUrl, '_blank');
        toast.info(
          `Đã mở cổng VNPay nạp ${missing.toLocaleString('vi-VN')} ₫. Sau khi hoàn tất, vui lòng bấm "Làm mới số dư" để đặt lịch ngay!`
        );
      } else {
        toast.error(res?.errMessage || 'Không thể tạo liên kết nạp tiền VNPay');
      }
    } catch (err) {
      toast.error('Lỗi khi kết nối cổng thanh toán VNPay');
    } finally {
      setIsTopUpLoading(false);
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

  // Lưu hồ sơ người thân mới (Quick Add ngay trong Modal)
  const handleSaveNewFamilyMember = async (e) => {
    e.preventDefault();
    if (!newFamilyForm.fullName || newFamilyForm.fullName.trim().length < 2) {
      toast.error('Họ và tên người thân tối thiểu 2 ký tự!');
      return;
    }
    setIsSavingFamily(true);
    try {
      const res = await createFamilyMember({
        ...newFamilyForm,
        phoneNumber: newFamilyForm.phoneNumber || patientData.phoneNumber,
        address: patientData.address,
      });
      if (res && res.errCode === 0) {
        toast.success('Đã thêm hồ sơ người thân vào Sổ Y Bạ Gia Đình!');
        setShowAddFamilyModal(false);
        setNewFamilyForm({
          fullName: '',
          relationship: 'CHILD',
          gender: 'MALE',
          birthday: '',
          phoneNumber: '',
          medicalHistory: '',
        });
        const listRes = await getFamilyMembers();
        if (listRes && listRes.errCode === 0 && Array.isArray(listRes.data)) {
          setFamilyMembers(listRes.data);
          const created = listRes.data.find((m) => m.id === res.data.id) || listRes.data[0];
          setSelectedFamilyMember(created);
        }
      } else {
        toast.error(res?.message || 'Không thể thêm hồ sơ người thân!');
      }
    } catch (err) {
      toast.error('Lỗi khi lưu hồ sơ người thân!');
    } finally {
      setIsSavingFamily(false);
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

    if (bookingFor === 'FAMILY' && !selectedFamilyMember) {
      toast.error('Vui lòng chọn hoặc thêm hồ sơ người thân để đặt lịch!');
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
        fullName: bookingFor === 'FAMILY' ? selectedFamilyMember?.fullName : patientData.fullName,
        email: patientData.email || userInfo?.email || '',
        phoneNumber: bookingFor === 'FAMILY' ? (selectedFamilyMember?.phoneNumber || patientData.phoneNumber) : patientData.phoneNumber,
        address: bookingFor === 'FAMILY' ? (selectedFamilyMember?.address || patientData.address) : patientData.address,
        reason: reason.trim(),
        birthday: bookingFor === 'FAMILY' ? (selectedFamilyMember?.birthday || '') : patientData.birthday,
        gender: bookingFor === 'FAMILY' ? (selectedFamilyMember?.gender || 'G1') : (patientData.gender || undefined),
        language: language,
        // Context Đặt lịch cho người thân
        bookingFor: bookingFor,
        familyMemberId: bookingFor === 'FAMILY' ? selectedFamilyMember?.id : null,
        relationship: bookingFor === 'FAMILY' ? selectedFamilyMember?.relationship : null,
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
              ? `Đặt lịch và thanh toán cho ${activePatientName} thành công! Lịch hẹn đã được xác nhận trực tiếp.`
              : `Appointment for ${activePatientName} booked & paid successfully!`
          );
        } else {
          toast.success(
            language === LANGUAGES.VI
              ? `Đặt lịch cho ${activePatientName} thành công! Vui lòng kiểm tra email để xác nhận và thanh toán.`
              : `Booking for ${activePatientName} successful! Please check your email to confirm and pay.`
          );
        }
        handleCloseModal();
      } else {
        toast.error(response?.message || response?.errMessage || 'Lỗi đặt lịch khám!');
        setUiState('idle');
      }
    } catch (err) {
      const errorMsg =
        err.response?.data?.message ||
        err.response?.data?.errMessage ||
        err.message ||
        'Lỗi kết nối máy chủ!';
      toast.error(errorMsg);
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

  const getRelationshipLabel = (rel) => {
    switch (rel) {
      case 'CHILD': return 'Con';
      case 'PARENT': return 'Bố/Mẹ';
      case 'SPOUSE': return 'Vợ/Chồng';
      default: return 'Người thân';
    }
  };

  const activePatientName = bookingFor === 'SELF'
    ? (patientData.fullName || 'tôi')
    : (selectedFamilyMember?.fullName || 'người thân');

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
            {/* THẺ ĐỊNH DANH NỔI BẬT: NGƯỜI ĐƯỢC ĐẶT LỊCH KHÁM */}
            <div className="bm__patient-identity-card">
              <div className="bm__identity-header">
                <span className="bm__identity-eyebrow">Người được đặt khám</span>
                <span className={`bm__identity-tag ${bookingFor === 'SELF' ? 'self' : 'family'}`}>
                  {bookingFor === 'SELF' ? 'Bản thân' : `Người thân · ${getRelationshipLabel(selectedFamilyMember?.relationship)}`}
                </span>
              </div>
              <p className="bm__identity-name">
                {bookingFor === 'SELF' ? (patientData.fullName || 'Chưa cập nhật') : (selectedFamilyMember?.fullName || 'Chưa chọn')}
              </p>
              <div className="bm__identity-meta">
                <span>
                  <i className="far fa-calendar-alt tw-mr-1" />
                  {bookingFor === 'SELF'
                    ? (patientData.birthday ? moment(patientData.birthday).format('DD/MM/YYYY') : '—')
                    : (selectedFamilyMember?.birthday ? moment(selectedFamilyMember.birthday).format('DD/MM/YYYY') : '—')}
                </span>
                <span>
                  <i className="fas fa-venus-mars tw-mr-1" />
                  {bookingFor === 'SELF'
                    ? getGenderLabel()
                    : (selectedFamilyMember?.gender === 'FEMALE' ? 'Nữ' : 'Nam')}
                </span>
              </div>
              <div className="bm__identity-funder">
                <i className="fas fa-user-shield tw-mr-1" />
                <span>
                  Người đặt: <strong>{userInfo?.firstName ? `${userInfo.lastName || ''} ${userInfo.firstName}`.trim() : (patientData.fullName || 'Tài khoản')}</strong>
                </span>
              </div>
              {bookingFor === 'FAMILY' && (
                <button
                  type="button"
                  className="bm__identity-switch-btn"
                  onClick={() => {
                    const el = document.getElementById('section-patient-info');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  <i className="fas fa-exchange-alt tw-mr-1" /> Đổi người khám
                </button>
              )}
            </div>

            <div className="bm__summary-divider" />

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

            {/* 2. ĐỐI TƯỢNG & THÔNG TIN NGƯỜI KHÁM */}
            <div className="bm__section" id="section-patient-info">
              <div className="bm__section-header tw-flex tw-justify-between tw-items-center">
                <div className="tw-flex tw-items-center tw-gap-2">
                  <span className="bm__section-badge">2</span>
                  <h3 className="bm__section-title">Thông tin người khám</h3>
                </div>
                {bookingFor === 'SELF' ? (
                  <button
                    type="button"
                    className="bm__edit-profile-btn"
                    onClick={handleOpenEditPatient}
                    title="Chỉnh sửa thông tin hồ sơ"
                  >
                    <i className="fas fa-pencil-alt" /> <span>Chỉnh sửa</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="bm__edit-profile-btn"
                    onClick={() => setShowAddFamilyModal(true)}
                    title="Thêm hồ sơ người thân mới"
                  >
                    <i className="fas fa-user-plus" /> <span>+ Thêm người thân</span>
                  </button>
                )}
              </div>

              {/* Segmented Control Chọn Bản thân hay Người thân */}
              <div className="bm__booking-for-tabs">
                <button
                  type="button"
                  className={`bm__booking-for-btn ${bookingFor === 'SELF' ? 'active' : ''}`}
                  onClick={() => setBookingFor('SELF')}
                >
                  <i className="fas fa-user" />
                  <span>Đặt cho Bản thân</span>
                </button>
                <button
                  type="button"
                  className={`bm__booking-for-btn ${bookingFor === 'FAMILY' ? 'active' : ''}`}
                  onClick={() => {
                    setBookingFor('FAMILY');
                    if (familyMembers.length > 0 && !selectedFamilyMember) {
                      setSelectedFamilyMember(familyMembers[0]);
                    }
                  }}
                >
                  <i className="fas fa-users" />
                  <span>Đặt cho Người thân</span>
                  {familyMembers.length > 0 && (
                    <span className="bm__booking-for-badge">{familyMembers.length}</span>
                  )}
                </button>
              </div>

              {bookingFor === 'SELF' ? (
                <>
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
                </>
              ) : (
                <>
                  <p className="bm__section-desc">
                    Hồ sơ khám bệnh và tiền sử dị ứng sẽ được ghi nhận riêng cho người thân. Bác sĩ tiếp nhận thông tin bệnh nhân chính xác (ví dụ: con nhỏ 3 tuổi).
                  </p>

                  {/* Danh sách người thân để chọn */}
                  {isLoadingFamily ? (
                    <div className="bm__family-loading">
                      <i className="fas fa-spinner fa-spin" /> Đang tải danh sách người thân...
                    </div>
                  ) : familyMembers.length === 0 ? (
                    <div className="bm__family-empty">
                      <div className="bm__family-empty-icon">
                        <i className="fas fa-user-friends" />
                      </div>
                      <p>Bạn chưa lưu hồ sơ người thân nào trong Sổ Y Bạ Gia Đình.</p>
                      <button
                        type="button"
                        className="bm__btn-quick-add-family"
                        onClick={() => setShowAddFamilyModal(true)}
                      >
                        <i className="fas fa-plus" /> Thêm hồ sơ người thân ngay
                      </button>
                    </div>
                  ) : (
                    <div className="bm__family-selector">
                      <div className="bm__family-pill-list">
                        {familyMembers.map((fm) => {
                          const isSel = selectedFamilyMember?.id === fm.id;
                          const relText = fm.relationship === 'CHILD' ? 'Con' : fm.relationship === 'PARENT' ? 'Bố/Mẹ' : fm.relationship === 'SPOUSE' ? 'Vợ/Chồng' : 'Người thân';
                          return (
                            <button
                              key={fm.id}
                              type="button"
                              className={`bm__family-pill ${isSel ? 'selected' : ''}`}
                              onClick={() => setSelectedFamilyMember(fm)}
                            >
                              <span className="fm-icon">
                                <i className={fm.relationship === 'CHILD' ? 'fas fa-child' : fm.relationship === 'PARENT' ? 'fas fa-user-friends' : 'fas fa-user'} />
                              </span>
                              <span className="fm-name">{fm.fullName}</span>
                              <span className="fm-rel">({relText})</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Thẻ chi tiết người thân được chọn */}
                      {selectedFamilyMember && (
                        <div className="bm__selected-member-card">
                          <div className="sm-header">
                            <div className="sm-name-row">
                              <span className="sm-name">{selectedFamilyMember.fullName}</span>
                              <span className="sm-rel-badge">
                                {selectedFamilyMember.relationship === 'CHILD' ? '👶 Con cái' : selectedFamilyMember.relationship === 'PARENT' ? '🧓 Bố/Mẹ' : selectedFamilyMember.relationship === 'SPOUSE' ? '❤️ Vợ/Chồng' : '👤 Người thân'}
                              </span>
                            </div>
                            <span className="sm-gender">
                              {selectedFamilyMember.gender === 'FEMALE' ? 'Nữ' : 'Nam'}
                            </span>
                          </div>

                          <div className="sm-body-grid">
                            <div className="sm-item">
                              <span className="sm-label">Ngày sinh:</span>
                              <span className="sm-val">
                                {selectedFamilyMember.birthday ? moment(selectedFamilyMember.birthday).format('DD/MM/YYYY') : 'Chưa cập nhật'}
                              </span>
                            </div>
                            <div className="sm-item">
                              <span className="sm-label">SĐT liên hệ:</span>
                              <span className="sm-val">
                                {selectedFamilyMember.phoneNumber || patientData.phoneNumber || 'Theo người giám hộ'}
                              </span>
                            </div>
                          </div>

                          {selectedFamilyMember.medicalHistory && (
                            <div className="sm-medical-alert">
                              <i className="fas fa-exclamation-triangle" />
                              <div>
                                <strong>Tiền sử dị ứng / bệnh lý: </strong>
                                <span>{selectedFamilyMember.medicalHistory}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Thẻ thông tin Người giám hộ & Tài khoản thanh toán */}
                  <div className="bm__guardian-card">
                    <div className="bm__guardian-icon">
                      <i className="fas fa-shield-alt" />
                    </div>
                    <div className="bm__guardian-info">
                      <div className="guardian-title">Người giám hộ & Đặt lịch</div>
                      <div className="guardian-detail">
                        <strong>{patientData.fullName}</strong> • {patientData.email}
                      </div>
                      <div className="guardian-note">
                        Phiếu khám và link theo dõi sẽ được gửi về email tài khoản của bạn.
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* 3. PHƯƠNG THỨC THANH TOÁN (CHUẨN HÓA 100% QUA VÍ BOOKINGCARE) */}
            <div className="bm__section">
              <div className="bm__section-header tw-flex tw-justify-between tw-items-center">
                <div className="tw-flex tw-items-center tw-gap-2">
                  <span className="bm__section-badge">3</span>
                  <h3 className="bm__section-title">Thanh toán qua Ví BookingCare</h3>
                </div>
                <button
                  type="button"
                  className="tw-text-xs tw-text-teal-700 hover:tw-underline tw-font-semibold tw-flex tw-items-center tw-gap-1.5 tw-bg-transparent tw-border-none tw-cursor-pointer"
                  onClick={loadPatientWallet}
                  title="Kiểm tra lại số dư ví mới nhất"
                  disabled={isRefreshingWallet}
                >
                  <i className={`fas fa-sync-alt ${isRefreshingWallet ? 'fa-spin tw-text-teal-600' : ''}`} />
                  <span>{isRefreshingWallet ? 'Đang cập nhật...' : 'Làm mới số dư'}</span>
                </button>
              </div>
              <p className="bm__section-desc">
                Nền tảng thanh toán chuẩn hóa qua Ví BookingCare để xác nhận lịch ngay lập tức và tự động hoàn tiền 100% trong 0 giây nếu hủy lịch hợp lệ.
              </p>

              {/* Thẻ Ví BookingCare tinh gọn cao cấp */}
              <div className="bm__wallet-guarantee-card">
                <div className="wallet-card-header">
                  <div className="wallet-brand-row">
                    <div className="wallet-icon-box">
                      <i className="fas fa-wallet" />
                    </div>
                    <div className="wallet-brand-meta">
                      <span className="wallet-title">Ví điện tử BookingCare</span>
                      <span className="wallet-badge">Phương thức thanh toán chính thức · Xác nhận tức thì</span>
                    </div>
                  </div>
                  <div className="wallet-balance-box">
                    <span className="balance-label">Số dư khả dụng</span>
                    <span className="balance-value">
                      {walletInfo ? (walletInfo.availableBalance || 0).toLocaleString('vi-VN') + ' ₫' : 'Đang kiểm tra...'}
                    </span>
                  </div>
                </div>

                {/* Trạng thái đối chiếu số dư */}
                <div className="wallet-status-row">
                  {walletInfo ? (
                    walletInfo.availableBalance >= numericPrice ? (
                      <div className="tw-flex tw-items-center tw-gap-2 tw-text-emerald-700 tw-bg-emerald-50 tw-p-3 tw-rounded-lg tw-border tw-border-emerald-200 tw-text-xs tw-font-semibold tw-w-full">
                        <i className="fas fa-check-circle tw-text-base tw-text-emerald-600" />
                        <span>
                          Số dư khả dụng đủ thanh toán phí khám ({numericPrice.toLocaleString('vi-VN')} ₫). Sau khi xác nhận, lịch khám sẽ được duyệt và cấp vé ngay lập tức!
                        </span>
                      </div>
                    ) : (
                      <div className="tw-flex tw-items-center tw-justify-between tw-flex-wrap tw-gap-2 tw-text-amber-900 tw-bg-amber-50 tw-p-3 tw-rounded-lg tw-border tw-border-amber-200 tw-text-xs tw-w-full">
                        <div className="tw-flex tw-items-center tw-gap-2">
                          <i className="fas fa-exclamation-triangle tw-text-base tw-text-amber-600" />
                          <span>
                            Số dư ví còn thiếu <strong>{(numericPrice - (walletInfo.availableBalance || 0)).toLocaleString('vi-VN')} ₫</strong> để thanh toán ca khám này.
                          </span>
                        </div>
                        <button
                          type="button"
                          className="tw-bg-teal-700 hover:tw-bg-teal-800 tw-text-white tw-px-3 tw-py-1.5 tw-rounded-md tw-font-bold tw-transition-all tw-flex tw-items-center tw-gap-1.5 tw-border-none tw-cursor-pointer"
                          onClick={handleQuickTopUp}
                          disabled={isTopUpLoading}
                        >
                          {isTopUpLoading ? (
                            <i className="fas fa-spinner fa-spin" />
                          ) : (
                            <i className="fas fa-bolt" />
                          )}
                          <span>Nạp thiếu {(numericPrice - (walletInfo.availableBalance || 0)).toLocaleString('vi-VN')} ₫ qua VNPay</span>
                        </button>
                      </div>
                    )
                  ) : (
                    <div className="tw-text-xs tw-text-slate-400 tw-italic">Đang kiểm tra số dư ví...</div>
                  )}
                </div>

                {/* Chính sách bảo chứng hoàn tiền tức thì */}
                <div className="wallet-guarantee-footer">
                  <i className="fas fa-shield-alt text-teal" />
                  <span>
                    <strong>Bảo chứng Zero-Admin:</strong> Khi hủy lịch hợp lệ theo chính sách, tiền hoàn sẽ được hệ thống cộng tự động 100% vào Ví của bạn ngay tức thì, không cần chờ Admin xét duyệt hay chuyển khoản ngân hàng.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ===== FOOTER ===== */}
        <div className="bm__footer">
          <button className="bm__btn bm__btn--cancel" onClick={handleCloseModal}>
            <FormattedMessage id="booking-modal.cancel-btn" />
          </button>

          {walletInfo && (walletInfo.availableBalance || 0) < numericPrice ? (
            <button
              className="bm__btn bm__btn--confirm tw-bg-teal-700 hover:tw-bg-teal-800 tw-text-white tw-font-bold"
              onClick={handleQuickTopUp}
              disabled={isTopUpLoading}
              title={`Nạp nhanh số tiền còn thiếu qua VNPay để hoàn tất đặt lịch cho ${activePatientName}`}
            >
              {isTopUpLoading ? (
                <>
                  <i className="fas fa-spinner fa-spin tw-mr-1.5" /> Đang chuyển hướng VNPay...
                </>
              ) : (
                <>
                  <i className="fas fa-bolt tw-mr-1.5" /> Nạp thiếu {(numericPrice - (walletInfo.availableBalance || 0)).toLocaleString('vi-VN')} ₫ & Đặt lịch cho {activePatientName}
                </>
              )}
            </button>
          ) : (
            <button
              className="bm__btn bm__btn--confirm"
              onClick={handleSubmit}
              disabled={uiState === 'loading'}
            >
              {uiState === 'loading' ? (
                <>
                  <i className="fas fa-spinner fa-spin tw-mr-1.5" /> Đang xử lý...
                </>
              ) : language === LANGUAGES.VI ? (
                `Xác nhận đặt lịch cho ${activePatientName}`
              ) : (
                `Confirm booking for ${activePatientName}`
              )}
            </button>
          )}
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

      {/* ===== POPUP 4: THÊM HỒ SƠ NGƯỜI THÂN (QUICK ADD) ===== */}
      {showAddFamilyModal && (
        <div className="bm-submodal-overlay" onClick={() => !isSavingFamily && setShowAddFamilyModal(false)}>
          <div className="bm-submodal" onClick={(e) => e.stopPropagation()}>
            <div className="bm-submodal__header">
              <h3>
                <i className="fas fa-user-plus tw-text-teal-600 tw-mr-2" /> Thêm hồ sơ người thân vào Sổ Y Bạ
              </h3>
              <button
                type="button"
                className="bm-submodal__close"
                onClick={() => !isSavingFamily && setShowAddFamilyModal(false)}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveNewFamilyMember} className="bm-submodal__form">
              <div className="bm-submodal__field">
                <label className="bm__label">
                  Họ và tên người thân <span className="tw-text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="bm__input"
                  placeholder="Ví dụ: Bé Nguyễn Gia An, Bà Trần Thị Mai..."
                  value={newFamilyForm.fullName}
                  onChange={(e) => setNewFamilyForm((p) => ({ ...p, fullName: e.target.value }))}
                  required
                  autoFocus
                />
              </div>

              <div className="tw-grid tw-grid-cols-2 tw-gap-3">
                <div className="bm-submodal__field">
                  <label className="bm__label">
                    Quan hệ <span className="tw-text-red-500">*</span>
                  </label>
                  <select
                    className="bm__select"
                    value={newFamilyForm.relationship}
                    onChange={(e) => setNewFamilyForm((p) => ({ ...p, relationship: e.target.value }))}
                  >
                    <option value="CHILD">Con cái</option>
                    <option value="PARENT">Bố / Mẹ</option>
                    <option value="SPOUSE">Vợ / Chồng</option>
                    <option value="OTHER">Người thân khác</option>
                  </select>
                </div>

                <div className="bm-submodal__field">
                  <label className="bm__label">
                    Giới tính <span className="tw-text-red-500">*</span>
                  </label>
                  <select
                    className="bm__select"
                    value={newFamilyForm.gender}
                    onChange={(e) => setNewFamilyForm((p) => ({ ...p, gender: e.target.value }))}
                  >
                    <option value="MALE">Nam</option>
                    <option value="FEMALE">Nữ</option>
                    <option value="OTHER">Khác</option>
                  </select>
                </div>
              </div>

              <div className="tw-grid tw-grid-cols-2 tw-gap-3">
                <div className="bm-submodal__field">
                  <label className="bm__label">Ngày sinh</label>
                  <input
                    type="date"
                    className="bm__input"
                    value={newFamilyForm.birthday}
                    onChange={(e) => setNewFamilyForm((p) => ({ ...p, birthday: e.target.value }))}
                  />
                </div>

                <div className="bm-submodal__field">
                  <label className="bm__label">SĐT liên hệ</label>
                  <input
                    type="tel"
                    className="bm__input"
                    placeholder="Để trống nếu dùng SĐT của bạn"
                    value={newFamilyForm.phoneNumber}
                    onChange={(e) => setNewFamilyForm((p) => ({ ...p, phoneNumber: e.target.value }))}
                  />
                </div>
              </div>

              <div className="bm-submodal__field">
                <label className="bm__label">
                  <i className="fas fa-allergies tw-text-rose-500 tw-mr-1" /> Tiền sử dị ứng & bệnh lý
                </label>
                <input
                  type="text"
                  className="bm__input"
                  placeholder="Ví dụ: Dị ứng Amoxicillin, hen suyễn..."
                  value={newFamilyForm.medicalHistory}
                  onChange={(e) => setNewFamilyForm((p) => ({ ...p, medicalHistory: e.target.value }))}
                />
                <span className="tw-text-[11px] tw-text-slate-500 tw-mt-1">
                  Thông tin này sẽ được cảnh báo trực tiếp cho Bác sĩ khi khám.
                </span>
              </div>

              <div className="bm-submodal__footer">
                <button
                  type="button"
                  className="bm__btn bm__btn--cancel"
                  onClick={() => setShowAddFamilyModal(false)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="bm__btn bm__btn--confirm"
                  disabled={isSavingFamily}
                >
                  {isSavingFamily ? <i className="fas fa-spinner fa-spin" /> : 'Lưu hồ sơ người thân'}
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

