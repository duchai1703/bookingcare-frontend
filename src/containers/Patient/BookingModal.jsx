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

import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import moment from 'moment';
import { toast } from 'react-toastify';
import { FormattedMessage, useIntl } from 'react-intl';
import { v4 as uuidv4 } from 'uuid';
import { fetchAllcodeByType } from '../../redux/slices/appSlice';
import { LANGUAGES, ALLCODE_TYPES } from '../../utils/constants';
import { callWithRetry, createPaymentUrl } from '../../services/paymentService';
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
  const accessToken = useSelector((state) => state.user.accessToken);

  const [formData, setFormData] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState(INITIAL_ERRORS);
  // [Phase 11] VNPay UI states: idle | loading | retrying | cancelled | failed
  const [uiState, setUiState] = useState('idle');
  const [retryInfo, setRetryInfo] = useState(null);
  const abortRef = useRef(new AbortController());

  // Fetch gender allcode on mount
  useEffect(() => {
    if (!genders || genders.length === 0) {
      dispatch(fetchAllcodeByType(ALLCODE_TYPES.GENDER));
    }
  }, [dispatch, genders]);

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
    setRetryInfo(null);
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

    // fullName: required, trim(), length >= 2
    if (!formData.fullName || formData.fullName.trim().length < 2) {
      newErrors.fullName = intl.formatMessage({ id: 'booking-modal.err-fullname' });
      isValid = false;
    }

    // phoneNumber: required, VN format 10 digits
    const phoneRegex = /^(0[3|5|7|8|9])\d{8}$/;
    if (!formData.phoneNumber || !phoneRegex.test(formData.phoneNumber)) {
      newErrors.phoneNumber = intl.formatMessage({ id: 'booking-modal.err-phone' });
      isValid = false;
    }

    // address: required
    if (!formData.address || formData.address.trim().length === 0) {
      newErrors.address = intl.formatMessage({ id: 'booking-modal.err-address' });
      isValid = false;
    }

    // reason: required
    if (!formData.reason || formData.reason.trim().length === 0) {
      newErrors.reason = intl.formatMessage({ id: 'booking-modal.err-reason' });
      isValid = false;
    }

    // birthday: required, valid date
    if (!formData.birthday) {
      newErrors.birthday = intl.formatMessage({ id: 'booking-modal.err-birthday' });
      isValid = false;
    }

    // gender: required, must be G1|G2|G3
    if (!formData.gender || !['G1', 'G2', 'G3'].includes(formData.gender)) {
      newErrors.gender = intl.formatMessage({ id: 'booking-modal.err-gender' });
      isValid = false;
    }

    return { isValid, errors: newErrors };
  };

  // ═══════════════════════════════════════════════════════════════════════
  // [Phase 11] VNPay Submit handler — callWithRetry + idempotency
  // ═══════════════════════════════════════════════════════════════════════
  const handleSubmit = async () => {
    const { isValid, errors: validationErrors } = validateForm();
    if (!isValid) {
      setErrors(validationErrors);
      return;
    }

    if (['loading', 'retrying'].includes(uiState)) return;
    setUiState('loading');

    const idempotencyKey = uuidv4();

    try {
      const result = await callWithRetry(
        (signal) =>
          createPaymentUrl(
            {
              doctorId,
              date,
              timeType: timeSlot.timeType,
              price: price,
              fullName: formData.fullName,
              email: userInfo?.email || '',
              phoneNumber: formData.phoneNumber,
              address: formData.address,
              reason: formData.reason,
              birthday: formData.birthday,
              gender: formData.gender,
              language: language,
            },
            accessToken,
            idempotencyKey,
            signal,
          ),
        {
          onRetry: (a, d) => {
            setUiState('retrying');
            setRetryInfo({ attempt: a, delay: d, maxRetry: 5 });
          },
          signal: abortRef.current.signal,
        },
      );
      if (result.isResume) toast.info('Tiếp tục giao dịch trước đó...');
      window.location.href = result.paymentUrl;
    } catch (err) {
      setUiState(abortRef.current.signal.aborted ? 'cancelled' : 'failed');
      if (!abortRef.current.signal.aborted)
        toast.error('Không thể tạo giao dịch');
      setRetryInfo(null);
    }
  };

  // ═══ Hủy retry — abort current request ═══
  const handleCancelRetry = () => {
    abortRef.current.abort();
    abortRef.current = new AbortController();
    setUiState('cancelled');
    setRetryInfo(null);
  };

  if (!isOpen) return null;

  return (
    <div className="booking-modal__overlay" onClick={handleCloseModal}>
      <div className="booking-modal" onClick={(e) => e.stopPropagation()}>
        {/* ===== HEADER ===== */}
        <div className="booking-modal__header">
          <h2 className="booking-modal__title">
            <FormattedMessage id="booking-modal.title" />
          </h2>
          <button
            className="booking-modal__close-btn"
            onClick={handleCloseModal}
          >
            ✕
          </button>
        </div>

        {/* ===== RETRY OVERLAY — [Phase 11] ===== */}
        {uiState === 'retrying' && retryInfo && (
          <div className="retry-overlay tw-bg-yellow-50 tw-border tw-border-yellow-200 tw-rounded tw-p-4 tw-mb-4 tw-text-center">
            <p className="tw-text-yellow-700 tw-font-medium">
              Đang thử lại giao dịch... (Lần {retryInfo.attempt}/{retryInfo.maxRetry})
            </p>
            <button
              className="tw-mt-2 tw-px-4 tw-py-1 tw-bg-red-500 tw-text-white tw-rounded tw-text-sm"
              onClick={handleCancelRetry}
            >
              Hủy bỏ
            </button>
          </div>
        )}

        {/* ===== INFO SECTION — Thông tin lịch khám đã chọn ===== */}
        <div className="booking-modal__info">
          <div className="booking-modal__info-row">
            <span className="booking-modal__info-icon">🕐</span>
            <span>
              {language === LANGUAGES.VI
                ? timeSlot.timeTypeData?.valueVi
                : timeSlot.timeTypeData?.valueEn}{' '}
              -{' '}
              {moment(parseInt(date, 10)).format(
                language === LANGUAGES.VI ? 'DD/MM/YYYY' : 'MM/DD/YYYY'
              )}
            </span>
          </div>
          <div className="booking-modal__info-row">
            <span className="booking-modal__info-label">
              <FormattedMessage id="booking-modal.free-booking" />
            </span>
          </div>
        </div>

        {/* ===== FORM — 6 fields (email disabled riêng) — 100% i18n ===== */}
        <div className="booking-modal__form">
          {/* Full Name */}
          <div className="booking-modal__field">
            <label className="booking-modal__label">
              <FormattedMessage id="booking-modal.fullname-label" /> *
            </label>
            <input
              type="text"
              name="fullName"
              className={`booking-modal__input ${errors.fullName ? 'input-error' : ''}`}
              value={formData.fullName}
              onChange={handleInputChange}
              placeholder={intl.formatMessage({ id: 'booking-modal.fullname-placeholder' })}
            />
            {errors.fullName && (
              <span className="error-text">{errors.fullName}</span>
            )}
          </div>

          {/* Email — [Fix Bug 9.7] HOÀN TOÀN từ userInfo, KHÔNG dùng state */}
          <div className="booking-modal__field">
            <label className="booking-modal__label">
              <FormattedMessage id="booking-modal.email-label" /> *
            </label>
            <input
              type="email"
              name="email"
              className="booking-modal__input booking-modal__input--disabled"
              value={userInfo && userInfo.email ? userInfo.email : ''}
              disabled={true}
            />
          </div>

          {/* Phone + Address */}
          <div className="booking-modal__row">
            <div className="booking-modal__field">
              <label className="booking-modal__label">
                <FormattedMessage id="booking-modal.phone-label" /> *
              </label>
              <input
                type="tel"
                name="phoneNumber"
                className={`booking-modal__input ${errors.phoneNumber ? 'input-error' : ''}`}
                value={formData.phoneNumber}
                onChange={handleInputChange}
                placeholder={intl.formatMessage({ id: 'booking-modal.phone-placeholder' })}
              />
              {errors.phoneNumber && (
                <span className="error-text">{errors.phoneNumber}</span>
              )}
            </div>
            <div className="booking-modal__field">
              <label className="booking-modal__label">
                <FormattedMessage id="booking-modal.address-label" /> *
              </label>
              <input
                type="text"
                name="address"
                className={`booking-modal__input ${errors.address ? 'input-error' : ''}`}
                value={formData.address}
                onChange={handleInputChange}
                placeholder={intl.formatMessage({ id: 'booking-modal.address-placeholder' })}
              />
              {errors.address && (
                <span className="error-text">{errors.address}</span>
              )}
            </div>
          </div>

          {/* Reason */}
          <div className="booking-modal__field">
            <label className="booking-modal__label">
              <FormattedMessage id="booking-modal.reason-label" /> *
            </label>
            <textarea
              name="reason"
              className={`booking-modal__textarea ${errors.reason ? 'input-error' : ''}`}
              value={formData.reason}
              onChange={handleInputChange}
              rows={3}
              placeholder={intl.formatMessage({ id: 'booking-modal.reason-placeholder' })}
            />
            {errors.reason && (
              <span className="error-text">{errors.reason}</span>
            )}
          </div>

          {/* Birthday + Gender */}
          <div className="booking-modal__row">
            <div className="booking-modal__field">
              <label className="booking-modal__label">
                <FormattedMessage id="booking-modal.birthday-label" /> *
              </label>
              <input
                type="date"
                name="birthday"
                className={`booking-modal__input ${errors.birthday ? 'input-error' : ''}`}
                value={formData.birthday}
                onChange={handleInputChange}
              />
              {errors.birthday && (
                <span className="error-text">{errors.birthday}</span>
              )}
            </div>
            <div className="booking-modal__field">
              <label className="booking-modal__label">
                <FormattedMessage id="booking-modal.gender-label" /> *
              </label>
              <select
                name="gender"
                className={`booking-modal__select ${errors.gender ? 'input-error' : ''}`}
                value={formData.gender}
                onChange={handleInputChange}
              >
                <option value="">
                  {intl.formatMessage({ id: 'booking-modal.gender-select' })}
                </option>
                {genders &&
                  genders.length > 0 &&
                  genders.map((g) => (
                    <option key={g.keyMap} value={g.keyMap}>
                      {language === LANGUAGES.VI ? g.valueVi : g.valueEn}
                    </option>
                  ))}
              </select>
              {errors.gender && (
                <span className="error-text">{errors.gender}</span>
              )}
            </div>
          </div>
        </div>

        {/* ===== FOOTER — [Phase 11] VNPay button states ===== */}
        <div className="booking-modal__footer">
          <button
            className="booking-modal__btn booking-modal__btn--cancel"
            onClick={handleCloseModal}
          >
            <FormattedMessage id="booking-modal.cancel-btn" />
          </button>
          <button
            className="booking-modal__btn booking-modal__btn--confirm"
            onClick={handleSubmit}
            disabled={['loading', 'retrying'].includes(uiState)}
          >
            {uiState === 'loading' ? (
              <><i className="fas fa-spinner fa-spin" /> Đang xử lý...</>
            ) : uiState === 'retrying' ? (
              <><i className="fas fa-spinner fa-spin" /> Đang thử lại...</>
            ) : (
              'Thanh toán VNPay'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookingModal;
