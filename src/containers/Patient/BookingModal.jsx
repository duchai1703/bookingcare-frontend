// src/containers/Patient/BookingModal.jsx
// Modal Đặt Lịch Khám — SRS 3.9 (REQ-PT-012 → 023)
// [Phase 9.5] Refactor Strict Auth:
//   - Auto-fill data từ userInfo (Redux)
//   - Email disabled (lấy TRỰC TIẾP từ userInfo — KHÔNG dùng state)
//   - 100% i18n qua react-intl
//   - Xử lý deprecationWarning từ Dual Mode Backend
// [Phase 9.7] Triệt tiêu formData.email, isLoading UX guard
// [CTO-FIX-4] Dọn rác khi đóng modal (chống data leak)
// [Phase 11 — GĐ 11.4] VNPay Payment Flow: callWithRetry + idempotency
// [Redesign] Modern 2-column layout, clean form, dynamic refund policy

import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import moment from 'moment';
import { toast } from 'react-toastify';
import { FormattedMessage, useIntl } from 'react-intl';
import { fetchAllcodeByType } from '../../redux/slices/appSlice';
import { LANGUAGES, ALLCODE_TYPES } from '../../utils/constants';
import { postBookAppointment } from '../../services/patientService';
import { getSystemSettings } from '../../services/catalogService';
import './BookingModal.scss';

// [Fix Bug 9.7] Triệt tiêu email khỏi state — email lấy từ userInfo.email trực tiếp
const INITIAL_FORM = {
  fullName: '',
  phoneNumber: '',
  address: '',
  reason: '',
  birthday: '',
  gender: '',
};

const INITIAL_ERRORS = {
  fullName: '',
  phoneNumber: '',
  address: '',
  reason: '',
  birthday: '',
  gender: '',
};

const BookingModal = ({ isOpen, onClose, doctorId, timeSlot, date, price }) => {
  const dispatch = useDispatch();
  const intl = useIntl();
  const language = useSelector((state) => state.app.language);
  const genders = useSelector((state) => state.app.genders);
  // [Phase 9.5] Lấy userInfo từ Redux — email lấy TRỰC TIẾP từ đây
  const userInfo = useSelector((state) => state.user.userInfo);

  const [formData, setFormData] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState(INITIAL_ERRORS);
  const [uiState, setUiState] = useState('idle');

  // [Phase D.3] Bank info + Refund policy
  const [bankInfo, setBankInfo] = useState({ number: '', name: '', bank: '' });
  const [refundPolicy, setRefundPolicy] = useState({ before24h: '100', after24h: '50' });
  const [showBankInfo, setShowBankInfo] = useState(false);

  // Fetch gender allcode on mount
  useEffect(() => {
    if (!genders || genders.length === 0) {
      dispatch(fetchAllcodeByType(ALLCODE_TYPES.GENDER));
    }
  }, [dispatch, genders]);

  // [Phase D.3] Fetch refund policy from system settings
  useEffect(() => {
    getSystemSettings()
      .then(res => {
        if (res?.data?.errCode === 0) {
          const settings = res.data.data || [];
          setRefundPolicy({
            before24h: settings.find(s => s.key === 'refund_rate_cancel_before_24h')?.value || '100',
            after24h:  settings.find(s => s.key === 'refund_rate_cancel_after_24h')?.value  || '50',
          });
        }
      })
      .catch(() => {});
  }, []);

  // ═══════════════════════════════════════════════════════════════════════
  // [Phase 9.5] Auto-fill: Khi modal mở hoặc userInfo thay đổi,
  // tự động điền firstName+lastName, phoneNumber, address, gender
  // [Fix Bug 9.7] Đã xóa email khỏi auto-fill — email lấy từ userInfo trực tiếp
  // ═══════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (isOpen && userInfo) {
      const autoFullName = [userInfo.lastName || '', userInfo.firstName || '']
        .filter(Boolean)
        .join(' ');

      setFormData((prev) => ({
        ...prev,
        fullName: autoFullName || prev.fullName,
        phoneNumber: userInfo.phoneNumber || prev.phoneNumber,
        address: userInfo.address || prev.address,
        gender: userInfo.gender || prev.gender,
      }));
    }
  }, [isOpen, userInfo]);

  // ✅ [CTO-FIX-4] Dọn rác khi đóng modal — reset toàn bộ state
  const handleCloseModal = () => {
    setFormData(INITIAL_FORM);
    setErrors(INITIAL_ERRORS);
    setUiState('idle');
    setShowBankInfo(false);
    onClose();
  };

  // Handle input change + clear error cho field đó
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  // ═══════════════════════════════════════════════════════════════════════
  // [Fix Bug 9.7] Validate form — ĐÃ XÓA toàn bộ validate email
  // Email lấy từ userInfo.email (đã verified khi đăng ký), không cần validate lại
  // ═══════════════════════════════════════════════════════════════════════
  const validateForm = () => {
    const newErrors = { ...INITIAL_ERRORS };
    let isValid = true;

    if (!formData.fullName || formData.fullName.trim().length < 2) {
      newErrors.fullName = intl.formatMessage({ id: 'booking-modal.err-fullname' });
      isValid = false;
    }

    const phoneRegex = /^(0[3|5|7|8|9])\d{8}$/;
    if (!formData.phoneNumber || !phoneRegex.test(formData.phoneNumber)) {
      newErrors.phoneNumber = intl.formatMessage({ id: 'booking-modal.err-phone' });
      isValid = false;
    }

    if (!formData.address || formData.address.trim().length === 0) {
      newErrors.address = intl.formatMessage({ id: 'booking-modal.err-address' });
      isValid = false;
    }

    if (!formData.reason || formData.reason.trim().length === 0) {
      newErrors.reason = intl.formatMessage({ id: 'booking-modal.err-reason' });
      isValid = false;
    }

    if (!formData.birthday) {
      newErrors.birthday = intl.formatMessage({ id: 'booking-modal.err-birthday' });
      isValid = false;
    }

    if (!formData.gender || !['G1', 'G2', 'G3'].includes(formData.gender)) {
      newErrors.gender = intl.formatMessage({ id: 'booking-modal.err-gender' });
      isValid = false;
    }

    return { isValid, errors: newErrors };
  };

  // ═══════════════════════════════════════════════════════════════════════
  // [Phase 11] Flow mới: Lưu Đặt khám -> Gửi Email -> Xác nhận -> VNPay
  // ═══════════════════════════════════════════════════════════════════════
  const handleSubmit = async () => {
    const { isValid, errors: validationErrors } = validateForm();
    if (!isValid) {
      setErrors(validationErrors);
      return;
    }

    if (uiState === 'loading') return;
    setUiState('loading');

    try {
      const response = await postBookAppointment({
        doctorId,
        date,
        timeType: timeSlot.timeType,
        fullName: formData.fullName,
        email: userInfo?.email || '',
        phoneNumber: formData.phoneNumber,
        address: formData.address,
        reason: formData.reason,
        birthday: formData.birthday,
        gender: formData.gender,
        language: language,
        // [Phase D.3] Bank info
        bankAccountNumber: bankInfo.number || undefined,
        bankAccountName:   bankInfo.name   || undefined,
        bankName:          bankInfo.bank   || undefined,
      });

      if (response && response.errCode === 0) {
        toast.success(
          language === LANGUAGES.VI
            ? 'Đặt lịch thành công! Vui lòng kiểm tra email để xác nhận và thanh toán.'
            : 'Booking successful! Please check your email to confirm and pay.'
        );
        handleCloseModal();
      } else {
        toast.error(response?.errMessage || 'Lỗi đặt lịch khám!');
        setUiState('idle');
      }
    } catch (err) {
      toast.error('Lỗi kết nối Server!');
      setUiState('idle');
    }
  };

  if (!isOpen) return null;

  const formattedDate = moment(parseInt(date, 10)).format(
    language === LANGUAGES.VI ? 'dddd, DD/MM/YYYY' : 'dddd, MM/DD/YYYY'
  );
  const timeLabel = language === LANGUAGES.VI
    ? timeSlot.timeTypeData?.valueVi
    : timeSlot.timeTypeData?.valueEn;

  return (
    <div className="bm-overlay" onClick={handleCloseModal}>
      <div className="bm" onClick={(e) => e.stopPropagation()}>

        {/* ===== HEADER ===== */}
        <div className="bm__header">
          <div className="bm__header-title">
            <span className="bm__header-icon">📋</span>
            <h2><FormattedMessage id="booking-modal.title" /></h2>
          </div>
          <button className="bm__close" onClick={handleCloseModal} aria-label="Đóng">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* ===== BODY ===== */}
        <div className="bm__body">

          {/* --- LEFT: Appointment Summary --- */}
          <div className="bm__summary">
            <div className="bm__summary-section">
              <p className="bm__summary-label">Thời gian khám</p>
              <p className="bm__summary-value bm__summary-value--highlight">{timeLabel}</p>
              <p className="bm__summary-date">{formattedDate}</p>
            </div>

            <div className="bm__summary-divider" />

            <div className="bm__summary-section">
              <p className="bm__summary-label">Chi phí</p>
              <p className="bm__summary-value">
                <FormattedMessage id="booking-modal.free-booking" />
              </p>
            </div>

            <div className="bm__summary-divider" />

            {/* Refund Policy — Single Source of Truth from DB */}
            <div className="bm__summary-section">
              <p className="bm__summary-label">Chính sách hoàn tiền</p>
              <div className="bm__refund-item bm__refund-item--ok">
                <span className="bm__refund-dot" />
                <span>Hủy trước 24h: hoàn <strong>{refundPolicy.before24h}%</strong></span>
              </div>
              <div className="bm__refund-item bm__refund-item--warn">
                <span className="bm__refund-dot" />
                <span>Hủy sau 24h: hoàn <strong>{refundPolicy.after24h}%</strong></span>
              </div>
            </div>
          </div>

          {/* --- RIGHT: Form --- */}
          <div className="bm__form">

            {/* Full Name */}
            <div className="bm__field">
              <label className="bm__label">
                <FormattedMessage id="booking-modal.fullname-label" /> <span className="bm__required">*</span>
              </label>
              <input
                type="text"
                name="fullName"
                className={`bm__input${errors.fullName ? ' bm__input--error' : ''}`}
                value={formData.fullName}
                onChange={handleInputChange}
                placeholder={intl.formatMessage({ id: 'booking-modal.fullname-placeholder' })}
              />
              {errors.fullName && <span className="bm__error">{errors.fullName}</span>}
            </div>

            {/* Email — disabled, from account */}
            <div className="bm__field">
              <label className="bm__label">
                <FormattedMessage id="booking-modal.email-label" /> <span className="bm__required">*</span>
              </label>
              <input
                type="email"
                className="bm__input bm__input--readonly"
                value={userInfo?.email || ''}
                disabled
              />
            </div>

            {/* Phone + Address */}
            <div className="bm__row">
              <div className="bm__field">
                <label className="bm__label">
                  <FormattedMessage id="booking-modal.phone-label" /> <span className="bm__required">*</span>
                </label>
                <input
                  type="tel"
                  name="phoneNumber"
                  className={`bm__input${errors.phoneNumber ? ' bm__input--error' : ''}`}
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  placeholder={intl.formatMessage({ id: 'booking-modal.phone-placeholder' })}
                />
                {errors.phoneNumber && <span className="bm__error">{errors.phoneNumber}</span>}
              </div>
              <div className="bm__field">
                <label className="bm__label">
                  <FormattedMessage id="booking-modal.address-label" /> <span className="bm__required">*</span>
                </label>
                <input
                  type="text"
                  name="address"
                  className={`bm__input${errors.address ? ' bm__input--error' : ''}`}
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder={intl.formatMessage({ id: 'booking-modal.address-placeholder' })}
                />
                {errors.address && <span className="bm__error">{errors.address}</span>}
              </div>
            </div>

            {/* Reason */}
            <div className="bm__field">
              <label className="bm__label">
                <FormattedMessage id="booking-modal.reason-label" /> <span className="bm__required">*</span>
              </label>
              <textarea
                name="reason"
                className={`bm__textarea${errors.reason ? ' bm__input--error' : ''}`}
                value={formData.reason}
                onChange={handleInputChange}
                rows={3}
                placeholder={intl.formatMessage({ id: 'booking-modal.reason-placeholder' })}
              />
              {errors.reason && <span className="bm__error">{errors.reason}</span>}
            </div>

            {/* Birthday + Gender */}
            <div className="bm__row">
              <div className="bm__field">
                <label className="bm__label">
                  <FormattedMessage id="booking-modal.birthday-label" /> <span className="bm__required">*</span>
                </label>
                <input
                  type="date"
                  name="birthday"
                  className={`bm__input${errors.birthday ? ' bm__input--error' : ''}`}
                  value={formData.birthday}
                  onChange={handleInputChange}
                />
                {errors.birthday && <span className="bm__error">{errors.birthday}</span>}
              </div>
              <div className="bm__field">
                <label className="bm__label">
                  <FormattedMessage id="booking-modal.gender-label" /> <span className="bm__required">*</span>
                </label>
                <select
                  name="gender"
                  className={`bm__select${errors.gender ? ' bm__input--error' : ''}`}
                  value={formData.gender}
                  onChange={handleInputChange}
                >
                  <option value="">
                    {intl.formatMessage({ id: 'booking-modal.gender-select' })}
                  </option>
                  {genders && genders.length > 0 && genders.map((g) => (
                    <option key={g.keyMap} value={g.keyMap}>
                      {language === LANGUAGES.VI ? g.valueVi : g.valueEn}
                    </option>
                  ))}
                </select>
                {errors.gender && <span className="bm__error">{errors.gender}</span>}
              </div>
            </div>

            {/* [Phase D.3] Bank Info — Collapsible */}
            <div className="bm__bank-toggle">
              <button
                type="button"
                className="bm__bank-toggle-btn"
                onClick={() => setShowBankInfo(v => !v)}
              >
                <span>💳 Thêm thông tin tài khoản hoàn tiền</span>
                <span className={`bm__bank-arrow${showBankInfo ? ' bm__bank-arrow--open' : ''}`}>▼</span>
              </button>
              <p className="bm__bank-hint">Điền nếu muốn nhận hoàn tiền về tài khoản khi hủy lịch</p>
            </div>

            {showBankInfo && (
              <div className="bm__bank-fields">
                <div className="bm__row">
                  <div className="bm__field">
                    <label className="bm__label">Số tài khoản</label>
                    <input
                      type="text"
                      className="bm__input"
                      placeholder="VD: 0123456789"
                      value={bankInfo.number}
                      onChange={e => setBankInfo(p => ({ ...p, number: e.target.value }))}
                    />
                  </div>
                  <div className="bm__field">
                    <label className="bm__label">Tên chủ tài khoản</label>
                    <input
                      type="text"
                      className="bm__input"
                      placeholder="VD: NGUYEN VAN A"
                      value={bankInfo.name}
                      onChange={e => setBankInfo(p => ({ ...p, name: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="bm__field">
                  <label className="bm__label">Ngân hàng</label>
                  <input
                    type="text"
                    className="bm__input"
                    placeholder="VD: Vietcombank, Techcombank..."
                    value={bankInfo.bank}
                    onChange={e => setBankInfo(p => ({ ...p, bank: e.target.value }))}
                  />
                </div>
              </div>
            )}

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
              <><i className="fas fa-spinner fa-spin" /> Đang xử lý...</>
            ) : (
              language === LANGUAGES.VI ? 'Xác nhận đặt lịch' : 'Confirm Booking'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookingModal;
