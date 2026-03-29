// src/containers/Patient/BookingModal.jsx
// Modal Đặt Lịch Khám — SRS 3.9 (REQ-PT-012 → 023)
// [CTO-FIX-4] Dọn rác khi đóng modal (chống data leak)
// [ĐỢT 2] Nâng cấp: Thay alert() bằng react-toastify, dispatch Redux thunk

import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import moment from 'moment';
import { toast } from 'react-toastify';
import { bookAppointment } from '../../redux/slices/doctorSlice';
import { fetchAllcodeByType } from '../../redux/slices/appSlice';
import { LANGUAGES, ALLCODE_TYPES } from '../../utils/constants';
import './BookingModal.scss';

// Constants
const INITIAL_FORM = {
  fullName: '',
  email: '',
  phoneNumber: '',
  address: '',
  reason: '',
  birthday: '',
  gender: '',
};

const INITIAL_ERRORS = {
  fullName: '',
  email: '',
  phoneNumber: '',
  address: '',
  reason: '',
  birthday: '',
  gender: '',
};

const BookingModal = ({ isOpen, onClose, doctorId, timeSlot, date }) => {
  const dispatch = useDispatch();
  const language = useSelector((state) => state.app.language);
  const genders = useSelector((state) => state.app.genders);

  const [formData, setFormData] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState(INITIAL_ERRORS);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch gender allcode on mount
  useEffect(() => {
    if (!genders || genders.length === 0) {
      dispatch(fetchAllcodeByType(ALLCODE_TYPES.GENDER));
    }
  }, [dispatch, genders]);

  // ✅ [CTO-FIX-4] Dọn rác khi đóng modal — reset toàn bộ state
  const handleCloseModal = () => {
    setFormData(INITIAL_FORM);
    setErrors(INITIAL_ERRORS);
    setIsSubmitting(false);
    onClose();
  };

  // Handle input change + clear error cho field đó
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Lỗi tự dismiss khi user bắt đầu nhập lại
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  // ===== Validate form (REQ-PT-014, REQ-PT-021) =====
  const validateForm = () => {
    const newErrors = { ...INITIAL_ERRORS };
    let isValid = true;

    // fullName: required, trim(), length >= 2
    if (!formData.fullName || formData.fullName.trim().length < 2) {
      newErrors.fullName =
        language === LANGUAGES.VI
          ? 'Vui lòng nhập họ tên (tối thiểu 2 ký tự)'
          : 'Please enter full name (minimum 2 characters)';
      isValid = false;
    }

    // email: required, regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email || !emailRegex.test(formData.email)) {
      newErrors.email =
        language === LANGUAGES.VI
          ? 'Email không đúng định dạng'
          : 'Invalid email format';
      isValid = false;
    }

    // phoneNumber: required, VN format 10 digits
    const phoneRegex = /^(0[3|5|7|8|9])\d{8}$/;
    if (!formData.phoneNumber || !phoneRegex.test(formData.phoneNumber)) {
      newErrors.phoneNumber =
        language === LANGUAGES.VI
          ? 'Số điện thoại không hợp lệ (10 số, đầu 03/05/07/08/09)'
          : 'Invalid phone number (10 digits, starts with 03/05/07/08/09)';
      isValid = false;
    }

    // address: required
    if (!formData.address || formData.address.trim().length === 0) {
      newErrors.address =
        language === LANGUAGES.VI
          ? 'Vui lòng nhập địa chỉ'
          : 'Please enter address';
      isValid = false;
    }

    // reason: required
    if (!formData.reason || formData.reason.trim().length === 0) {
      newErrors.reason =
        language === LANGUAGES.VI
          ? 'Vui lòng nhập lý do khám'
          : 'Please enter reason';
      isValid = false;
    }

    // birthday: required, valid date
    if (!formData.birthday) {
      newErrors.birthday =
        language === LANGUAGES.VI
          ? 'Vui lòng nhập ngày sinh hợp lệ'
          : 'Please enter a valid date of birth';
      isValid = false;
    }

    // gender: required, must be G1|G2|G3
    if (!formData.gender || !['G1', 'G2', 'G3'].includes(formData.gender)) {
      newErrors.gender =
        language === LANGUAGES.VI
          ? 'Vui lòng chọn giới tính'
          : 'Please select gender';
      isValid = false;
    }

    return { isValid, errors: newErrors };
  };

  // ===== Submit handler (REQ-PT-015) =====
  // [ĐỢT 2] Dùng dispatch(bookAppointment) thay vì gọi service trực tiếp
  // [ĐỢT 2] Dùng toast thay vì alert()
  // try/catch/finally đảm bảo isSubmitting luôn được reset
  const handleSubmit = async () => {
    const { isValid, errors: validationErrors } = validateForm();
    if (!isValid) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true); // ← a) disable nút, hiển thị spinner
    try {
      const bookingData = {
        fullName: formData.fullName,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        address: formData.address,
        reason: formData.reason,
        date: date, // ← UTC timestamp từ DoctorSchedule (moment.utc)
        birthday: formData.birthday,
        doctorId: doctorId,
        timeType: timeSlot.timeType,
        gender: formData.gender,
        language: language, // vi hoặc en — để backend gửi email đúng ngôn ngữ
        timeString:
          language === LANGUAGES.VI
            ? timeSlot.timeTypeData?.valueVi // "8:00 – 9:00"
            : timeSlot.timeTypeData?.valueEn, // "8:00 AM – 9:00 AM"
        dateString: moment(parseInt(date, 10)).format(
          language === LANGUAGES.VI ? 'DD/MM/YYYY' : 'MM/DD/YYYY'
        ),
      };

      // Dispatch Redux thunk — unwrap() để bắt được errCode
      const result = await dispatch(bookAppointment(bookingData)).unwrap();

      // ✅ [ĐỢT 2] Thay alert() bằng toast — REQ-PT-023
      if (result.errCode === 0) {
        toast.success(
          language === LANGUAGES.VI
            ? 'Đặt lịch thành công! Vui lòng kiểm tra email để xác nhận.'
            : 'Booking successful! Please check your email to confirm.'
        );
        handleCloseModal(); // ← dọn rác + đóng modal
      } else if (result.errCode === 2) {
        toast.error(
          language === LANGUAGES.VI
            ? 'Lịch hẹn đã tồn tại. Vui lòng chọn khung giờ khác.'
            : 'Appointment already exists. Please choose another time slot.'
        );
      } else if (result.errCode === 4) {
        toast.error(
          language === LANGUAGES.VI
            ? 'Khung giờ này đã hết chỗ! Vui lòng chọn khung giờ khác.'
            : 'This time slot is full! Please choose another time slot.'
        );
      } else {
        toast.error(
          language === LANGUAGES.VI
            ? 'Có lỗi xảy ra, vui lòng thử lại sau.'
            : 'An error occurred. Please try again later.'
        );
      }
    } catch (err) {
      console.error('>>> Error booking appointment:', err);
      toast.error(
        language === LANGUAGES.VI
          ? 'Có lỗi xảy ra, vui lòng thử lại sau.'
          : 'An error occurred. Please try again later.'
      );
    } finally {
      setIsSubmitting(false); // ← e) LUÔN tắt spinner dù thành công hay lỗi
    }
  };

  if (!isOpen) return null;

  return (
    <div className="booking-modal__overlay" onClick={handleCloseModal}>
      <div className="booking-modal" onClick={(e) => e.stopPropagation()}>
        {/* ===== HEADER ===== */}
        <div className="booking-modal__header">
          <h2 className="booking-modal__title">
            {language === LANGUAGES.VI
              ? 'Thông tin đặt lịch khám bệnh'
              : 'Book Appointment Information'}
          </h2>
          <button
            className="booking-modal__close-btn"
            onClick={handleCloseModal}
          >
            ✕
          </button>
        </div>

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
              {language === LANGUAGES.VI ? 'Miễn phí đặt lịch' : 'Free booking'}
            </span>
          </div>
        </div>

        {/* ===== FORM — 7 fields (REQ-PT-013) ===== */}
        <div className="booking-modal__form">
          {/* Full Name */}
          <div className="booking-modal__field">
            <label className="booking-modal__label">
              {language === LANGUAGES.VI ? 'Họ tên' : 'Full name'} *
            </label>
            <input
              type="text"
              name="fullName"
              className={`booking-modal__input ${errors.fullName ? 'input-error' : ''}`}
              value={formData.fullName}
              onChange={handleInputChange}
              placeholder={
                language === LANGUAGES.VI ? 'Nhập họ tên...' : 'Enter full name...'
              }
            />
            {errors.fullName && (
              <span className="error-text">{errors.fullName}</span>
            )}
          </div>

          {/* Email */}
          <div className="booking-modal__field">
            <label className="booking-modal__label">Email *</label>
            <input
              type="email"
              name="email"
              className={`booking-modal__input ${errors.email ? 'input-error' : ''}`}
              value={formData.email}
              onChange={handleInputChange}
              placeholder={
                language === LANGUAGES.VI ? 'Nhập email...' : 'Enter email...'
              }
            />
            {errors.email && (
              <span className="error-text">{errors.email}</span>
            )}
          </div>

          {/* Phone + Address */}
          <div className="booking-modal__row">
            <div className="booking-modal__field">
              <label className="booking-modal__label">
                {language === LANGUAGES.VI ? 'Số điện thoại' : 'Phone number'} *
              </label>
              <input
                type="tel"
                name="phoneNumber"
                className={`booking-modal__input ${errors.phoneNumber ? 'input-error' : ''}`}
                value={formData.phoneNumber}
                onChange={handleInputChange}
                placeholder={
                  language === LANGUAGES.VI ? 'Nhập SĐT...' : 'Enter phone...'
                }
              />
              {errors.phoneNumber && (
                <span className="error-text">{errors.phoneNumber}</span>
              )}
            </div>
            <div className="booking-modal__field">
              <label className="booking-modal__label">
                {language === LANGUAGES.VI ? 'Địa chỉ' : 'Address'} *
              </label>
              <input
                type="text"
                name="address"
                className={`booking-modal__input ${errors.address ? 'input-error' : ''}`}
                value={formData.address}
                onChange={handleInputChange}
                placeholder={
                  language === LANGUAGES.VI ? 'Nhập địa chỉ...' : 'Enter address...'
                }
              />
              {errors.address && (
                <span className="error-text">{errors.address}</span>
              )}
            </div>
          </div>

          {/* Reason */}
          <div className="booking-modal__field">
            <label className="booking-modal__label">
              {language === LANGUAGES.VI ? 'Lý do khám' : 'Reason for visit'} *
            </label>
            <textarea
              name="reason"
              className={`booking-modal__textarea ${errors.reason ? 'input-error' : ''}`}
              value={formData.reason}
              onChange={handleInputChange}
              rows={3}
              placeholder={
                language === LANGUAGES.VI ? 'Nhập lý do khám...' : 'Enter reason...'
              }
            />
            {errors.reason && (
              <span className="error-text">{errors.reason}</span>
            )}
          </div>

          {/* Birthday + Gender */}
          <div className="booking-modal__row">
            <div className="booking-modal__field">
              <label className="booking-modal__label">
                {language === LANGUAGES.VI ? 'Ngày sinh' : 'Date of birth'} *
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
                {language === LANGUAGES.VI ? 'Giới tính' : 'Gender'} *
              </label>
              <select
                name="gender"
                className={`booking-modal__select ${errors.gender ? 'input-error' : ''}`}
                value={formData.gender}
                onChange={handleInputChange}
              >
                <option value="">
                  {language === LANGUAGES.VI ? '-- Chọn --' : '-- Select --'}
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

        {/* ===== FOOTER — Nút Hủy + Xác nhận ===== */}
        <div className="booking-modal__footer">
          <button
            className="booking-modal__btn booking-modal__btn--cancel"
            onClick={handleCloseModal}
          >
            {language === LANGUAGES.VI ? 'Hủy' : 'Cancel'}
          </button>
          <button
            className="booking-modal__btn booking-modal__btn--confirm"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting
              ? language === LANGUAGES.VI
                ? '⏳ Đang xử lý...'
                : '⏳ Processing...'
              : language === LANGUAGES.VI
              ? 'Xác nhận đặt lịch'
              : 'Confirm booking'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookingModal;
