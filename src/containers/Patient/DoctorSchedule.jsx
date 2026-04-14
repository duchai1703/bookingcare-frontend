// src/containers/Patient/DoctorSchedule.jsx
// Lịch Khám Theo Ngày — SRS 3.8 (REQ-PT-009)
// [CTO-FIX-1] Lọc khung giờ quá khứ (chống đặt lịch quá khứ)
// [CTO-FIX-2] Dùng moment.utc để đồng bộ timezone với Backend
// [CROSS-VALIDATION] maxNumber / currentNumber kiểm tra slot đầy
// [Phase 9.5] GUARD: Bắt buộc đăng nhập trước khi mở BookingModal

import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { FormattedMessage, useIntl } from 'react-intl';
import moment from 'moment';
import { toast } from 'react-toastify';
import { getScheduleByDate } from '../../services/doctorService';
import { LANGUAGES } from '../../utils/constants';
import BookingModal from './BookingModal';
import './DoctorSchedule.scss';

// ✅ [CTO-FIX-1] Bảng ánh xạ timeType → giờ bắt đầu (SRS REQ-AM-019: 8 khung giờ T1-T8)
const TIME_SLOT_START = {
  T1: 8,
  T2: 9,
  T3: 10,
  T4: 11,
  T5: 13,
  T6: 14,
  T7: 15,
  T8: 16,
};

const DoctorSchedule = ({ doctorId }) => {
  const language = useSelector((state) => state.app.language);
  // [Phase 9.5] Lấy trạng thái đăng nhập từ Redux
  const isLoggedIn = useSelector((state) => state.user.isLoggedIn);
  const navigate = useNavigate();
  const intl = useIntl();

  // STATE
  const [availableDays, setAvailableDays] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [schedules, setSchedules] = useState([]);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);

  // BookingModal state
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);

  // ✅ [CTO-FIX-2] Hàm tạo mảng 7 ngày, value dùng moment.utc để đồng bộ Backend
  const getArrDays = (lang) => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const dateMoment = moment().add(i, 'days');

      // Tên ngày theo ngôn ngữ
      const dayOfWeek =
        lang === LANGUAGES.VI
          ? ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'][dateMoment.day()]
          : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dateMoment.day()];

      // Label hiển thị đa ngôn ngữ
      let label =
        lang === LANGUAGES.VI
          ? `${dayOfWeek} - ${dateMoment.format('DD/MM')}`
          : `${dayOfWeek} - ${dateMoment.format('MM/DD')}`;

      // Hôm nay → label đặc biệt
      if (i === 0) {
        label =
          lang === LANGUAGES.VI
            ? `Hôm nay - ${dateMoment.format('DD/MM')}`
            : `Today - ${dateMoment.format('MM/DD')}`;
      }

      // ✅ [CTO-FIX-2] BẮT BUỘC dùng moment.utc để đồng bộ timezone với Backend
      const utcTimestamp = moment
        .utc(dateMoment.format('YYYY-MM-DD'))
        .startOf('day')
        .valueOf();

      days.push({ label, value: utcTimestamp.toString() });
    }
    return days;
  };

  // Cập nhật danh sách ngày khi language thay đổi
  useEffect(() => {
    const days = getArrDays(language);
    setAvailableDays(days);
    if (days.length > 0) {
      setSelectedDate(days[0].value);
    }
  }, [language]);

  // Gọi API khi selectedDate hoặc doctorId thay đổi
  useEffect(() => {
    const fetchSchedule = async () => {
      if (!doctorId || !selectedDate) return;

      setIsLoadingSchedule(true);
      try {
        const res = await getScheduleByDate(doctorId, selectedDate);
        if (res && res.errCode === 0) {
          setSchedules(res.data || []);
        } else {
          setSchedules([]);
        }
      } catch (err) {
        setSchedules([]);
      } finally {
        setIsLoadingSchedule(false);
      }
    };

    fetchSchedule();
  }, [doctorId, selectedDate]);

  // ===== LỌC KHUNG GIỜ KHẢ DỤNG =====
  const getDisplaySlots = () => {
    if (!schedules || schedules.length === 0) return [];

    const availableSlots = schedules.filter(
      (slot) => slot.currentNumber < slot.maxNumber
    );

    // ✅ [CTO-FIX-1] Nếu là ngày hôm nay → loại bỏ khung giờ đã trôi qua
    const now = moment();
    const isToday = moment
      .utc(parseInt(selectedDate, 10))
      .isSame(moment.utc().startOf('day'));

    const displaySlots = availableSlots.filter((slot) => {
      if (!isToday) return true;
      const startHour = TIME_SLOT_START[slot.timeType];
      return now.hour() < startHour;
    });

    return displaySlots;
  };

  const handleChangeDate = (e) => {
    setSelectedDate(e.target.value);
  };

  // ═══════════════════════════════════════════════════════════════════════
  // [Phase 9.5] GUARD CLAUSE: Kiểm tra đăng nhập trước khi mở Modal
  // NẾU CHƯA ĐĂNG NHẬP → redirect sang /login?redirect=<URL hiện tại>
  // NẾU ĐÃ ĐĂNG NHẬP → mở BookingModal bình thường
  // ═══════════════════════════════════════════════════════════════════════
  const handleClickTimeSlot = (slot) => {
    if (!isLoggedIn) {
      // Toast thông báo yêu cầu đăng nhập
      toast.info(intl.formatMessage({ id: 'schedule.login-required' }));
      // Redirect sang Login, kèm URL hiện tại để quay lại sau khi login
      navigate('/login?redirect=' + encodeURIComponent(window.location.pathname));
      return; // TUYỆT ĐỐI không mở modal
    }

    // Đã đăng nhập → cho phép mở Modal
    setSelectedTimeSlot(slot);
    setShowBookingModal(true);
  };

  const handleCloseModal = () => {
    setShowBookingModal(false);
    setSelectedTimeSlot(null);
  };

  const displaySlots = getDisplaySlots();

  return (
    <div className="doctor-schedule" id="doctor-schedule">
      {/* ===== HEADER: Tiêu đề + Dropdown chọn ngày ===== */}
      <div className="doctor-schedule__header">
        <span className="doctor-schedule__title">
          <i className="fas fa-calendar-alt"></i>
          <FormattedMessage id="doctor.choose-schedule" />
        </span>

        <select
          className="doctor-schedule__date-select"
          value={selectedDate}
          onChange={handleChangeDate}
          id="schedule-date-select"
        >
          {availableDays &&
            availableDays.length > 0 &&
            availableDays.map((day, index) => (
              <option key={index} value={day.value}>
                {day.label}
              </option>
            ))}
        </select>
      </div>

      {/* ===== BODY: Danh sách khung giờ ===== */}
      <div className="doctor-schedule__body">
        {/* Loading — Fix i18n */}
        {isLoadingSchedule && (
          <div className="doctor-schedule__loading">
            <div className="doctor-schedule__loading-spinner"></div>
            <span><FormattedMessage id="schedule.loading" /></span>
          </div>
        )}

        {/* Hiển thị các khung giờ */}
        {!isLoadingSchedule && displaySlots.length > 0 && (
          <>
            <div className="doctor-schedule__slots">
              {displaySlots.map((slot, index) => (
                <button
                  key={index}
                  className="doctor-schedule__slot-btn"
                  onClick={() => handleClickTimeSlot(slot)}
                  id={`time-slot-${slot.timeType}`}
                >
                  {language === LANGUAGES.VI
                    ? slot.timeTypeData?.valueVi
                    : slot.timeTypeData?.valueEn}
                </button>
              ))}
            </div>

            {/* Ghi chú đặt lịch — Fix i18n */}
            <div className="doctor-schedule__note">
              <span className="doctor-schedule__note-icon">🗓</span>
              <span className="doctor-schedule__note-text">
                <FormattedMessage id="schedule.note" />
              </span>
            </div>
          </>
        )}

        {/* Không có lịch khám — Fix i18n */}
        {!isLoadingSchedule && displaySlots.length === 0 && (
          <div className="doctor-schedule__empty">
            <span className="doctor-schedule__empty-icon">📋</span>
            <p className="doctor-schedule__empty-text">
              <FormattedMessage id="schedule.empty" />
            </p>
          </div>
        )}
      </div>

      {/* ===== BOOKING MODAL ===== */}
      {showBookingModal && selectedTimeSlot && (
        <BookingModal
          isOpen={showBookingModal}
          onClose={handleCloseModal}
          doctorId={doctorId}
          timeSlot={selectedTimeSlot}
          date={selectedDate}
        />
      )}
    </div>
  );
};

export default DoctorSchedule;
