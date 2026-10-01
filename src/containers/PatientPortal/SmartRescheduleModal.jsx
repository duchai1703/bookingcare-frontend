// src/containers/PatientPortal/SmartRescheduleModal.jsx
// [Phase 2] Đổi Lịch Khám Thông Minh (Smart 1-Click Patient Reschedule Engine)
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import moment from 'moment';
import 'moment/locale/vi';
import { getRescheduleOptions, rescheduleBooking } from '../../services/patientService';
import CommonUtils from '../../utils/CommonUtils';
import './SmartRescheduleModal.scss';

const SmartRescheduleModal = ({ isOpen, bookingId, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [optionsData, setOptionsData] = useState(null);

  // Selection states
  const [activeTab, setActiveTab] = useState('same_doctor'); // 'same_doctor' | 'alternative_doctor'
  const [selectedDoctorId, setSelectedDoctorId] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null); // { timeType, valueVi }
  const [note, setNote] = useState('');

  useEffect(() => {
    if (isOpen && bookingId) {
      fetchOptions();
    } else {
      setOptionsData(null);
      setSelectedDoctorId(null);
      setSelectedDate('');
      setSelectedSlot(null);
      setNote('');
    }
  }, [isOpen, bookingId]);

  const fetchOptions = async () => {
    try {
      setLoading(true);
      const res = await getRescheduleOptions(bookingId);
      if (res && res.errCode === 0 && res.data) {
        setOptionsData(res.data);
        const docId = res.data.booking?.doctor?.id;
        setSelectedDoctorId(docId);

        // Tự động chọn ngày đầu tiên có slot trống của bác sĩ này
        const schedules = res.data.doctorSchedules || [];
        if (schedules.length > 0) {
          setSelectedDate(schedules[0].date);
        }
      } else {
        toast.error(res?.message || 'Không thể lấy thông tin đổi lịch khám!');
        onClose();
      }
    } catch (err) {
      console.error('fetchOptions error:', err);
      toast.error('Lỗi kết nối khi tải tùy chọn đổi lịch!');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const booking = optionsData?.booking;
  const patientWallet = optionsData?.patientWallet;
  const doctorSchedules = optionsData?.doctorSchedules || [];
  const alternativeDoctors = optionsData?.alternativeDoctors || [];

  // Group doctorSchedules by date
  const schedulesByDate = {};
  doctorSchedules.forEach((s) => {
    if (!schedulesByDate[s.date]) schedulesByDate[s.date] = [];
    schedulesByDate[s.date].push(s);
  });

  const uniqueDates = Object.keys(schedulesByDate);

  // Lấy các slots của ngày đang chọn
  const activeSlotsForSelectedDate = selectedDate ? schedulesByDate[selectedDate] || [] : [];

  const handleSelectSlot = (slot) => {
    setSelectedSlot(slot);
  };

  const handleSubmitReschedule = async () => {
    if (!selectedDate || !selectedSlot) {
      toast.warning('Vui lòng chọn ngày và khung giờ khám mới!');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        newDoctorId: selectedDoctorId,
        newDate: selectedDate,
        newTimeType: selectedSlot.timeType,
        reason: note.trim() || 'Đổi lịch khám thông minh do Bác sĩ bận',
      };

      const res = await rescheduleBooking(bookingId, payload);
      if (res && res.errCode === 0) {
        toast.success(res.message || 'Đổi lịch khám thành công!');
        if (onSuccess) onSuccess(res.data);
        onClose();
      } else {
        toast.error(res?.message || 'Đổi lịch không thành công!');
      }
    } catch (err) {
      console.error('handleSubmitReschedule error:', err);
      toast.error(err?.response?.data?.message || 'Lỗi server khi đổi lịch khám!');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDateDisplay = (dateVal) => {
    if (!dateVal) return '';
    try {
      if (typeof dateVal === 'string' && dateVal.length === 8) {
        return moment(dateVal, 'YYYYMMDD').locale('vi').format('dddd, DD/MM/YYYY');
      }
      return moment(Number(dateVal)).locale('vi').format('dddd, DD/MM/YYYY');
    } catch {
      return dateVal;
    }
  };

  const currentPrice = booking?.bookingPrice || 0;
  const walletBalance = patientWallet?.availableBalance || 0;
  const balanceAfter = walletBalance - currentPrice;

  return (
    <div className="smart-reschedule-backdrop" onClick={onClose}>
      <div className="smart-reschedule-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="reschedule-modal-header">
          <div className="header-icon-box">
            <i className="fas fa-calendar-alt" />
          </div>
          <div className="header-text">
            <h3>Đổi Lịch Khám Thông Minh (1-Click)</h3>
            <p>Bác sĩ báo bận đột xuất — Tiền khám đã hoàn 100% về ví BookingCare. Chọn lịch mới miễn phí ngay bên dưới!</p>
          </div>
          <button type="button" className="btn-close-modal" onClick={onClose}>
            <i className="fas fa-times" />
          </button>
        </div>

        {loading ? (
          <div className="reschedule-modal-loading">
            <i className="fas fa-spinner fa-spin fa-2x text-primary" />
            <p>Đang tải các khung giờ khám còn trống...</p>
          </div>
        ) : (
          <div className="reschedule-modal-body">
            {/* Banner Thông Tin Ca Bị Hủy & Lý Do */}
            {booking && (
              <div className="cancellation-summary-card">
                <div className="summary-col-info">
                  <div className="doc-avatar-box">
                    {booking.doctor?.image ? (
                      <img src={booking.doctor.image} alt={booking.doctor.lastName} />
                    ) : (
                      <i className="fas fa-user-md" />
                    )}
                  </div>
                  <div className="doc-details">
                    <h4>Bác sĩ: {booking.doctor?.lastName} {booking.doctor?.firstName}</h4>
                    <span className="specialty-label">
                      <i className="fas fa-stethoscope me-1" />
                      {booking.specialty?.name || 'Chuyên khoa'} • {booking.clinic?.name || 'Cơ sở y tế'}
                    </span>
                    <div className="old-time">
                      <span>Lịch hẹn cũ: <b>{booking.timeTypeName} - {formatDateDisplay(booking.date)}</b></span>
                    </div>
                  </div>
                </div>

                <div className="summary-col-reason">
                  <div className="reason-badge">
                    <i className="fas fa-exclamation-triangle me-1" />
                    Lý do bác sĩ báo bận:
                  </div>
                  <div className="reason-content">
                    "{booking.cancellationReason || 'Có lịch phẫu thuật/hội chẩn khẩn cấp đột xuất'}"
                  </div>
                  <div className="refund-guarantee-pill">
                    <i className="fas fa-check-circle me-1" />
                    Đã hoàn 100%: <b>{CommonUtils.formatCurrency(booking.refundAmount || currentPrice)} ₫</b> vào Ví
                  </div>
                </div>
              </div>
            )}

            {/* Tabs chọn đối tượng: Cùng Bác sĩ hoặc Bác sĩ khác */}
            <div className="doctor-choice-tabs">
              <button
                type="button"
                className={`tab-btn ${activeTab === 'same_doctor' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('same_doctor');
                  setSelectedDoctorId(booking?.doctor?.id);
                  if (uniqueDates.length > 0) setSelectedDate(uniqueDates[0]);
                  setSelectedSlot(null);
                }}
              >
                <i className="fas fa-user-md me-1" />
                Tiếp tục khám với Bác sĩ {booking?.doctor?.firstName} ({doctorSchedules.length} slot khả dụng)
              </button>

              {alternativeDoctors.length > 0 && (
                <button
                  type="button"
                  className={`tab-btn ${activeTab === 'alternative_doctor' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab('alternative_doctor');
                    setSelectedSlot(null);
                  }}
                >
                  <i className="fas fa-users-cog me-1" />
                  Chọn Bác sĩ khác cùng Chuyên khoa ({alternativeDoctors.length} bác sĩ)
                </button>
              )}
            </div>

            {/* TAB 1: CÙNG BÁC SĨ */}
            {activeTab === 'same_doctor' && (
              <div className="schedule-picker-section">
                {uniqueDates.length === 0 ? (
                  <div className="empty-slots-alert">
                    <i className="fas fa-calendar-times fa-2x mb-2" />
                    <h5>Bác sĩ hiện chưa có thêm khung giờ khám nào khả dụng trong 14 ngày tới.</h5>
                    <p>Vui lòng chuyển sang tab <b>"Chọn Bác sĩ khác cùng Chuyên khoa"</b> để được phục vụ sớm nhất!</p>
                  </div>
                ) : (
                  <>
                    {/* Danh sách ngày khám */}
                    <div className="date-pills-row">
                      <span className="field-label">1. Chọn ngày khám mới:</span>
                      <div className="pills-scroll">
                        {uniqueDates.map((d) => (
                          <button
                            key={d}
                            type="button"
                            className={`date-pill ${selectedDate === d ? 'active' : ''}`}
                            onClick={() => {
                              setSelectedDate(d);
                              setSelectedSlot(null);
                            }}
                          >
                            <span className="pill-day">{formatDateDisplay(d)}</span>
                            <span className="pill-count">
                              {schedulesByDate[d]?.length || 0} slot trống
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Danh sách khung giờ của ngày đã chọn */}
                    <div className="slots-grid-section">
                      <span className="field-label">2. Chọn khung giờ khám:</span>
                      <div className="slots-grid">
                        {activeSlotsForSelectedDate.map((s) => {
                          const isSelected = selectedSlot?.timeType === s.timeType;
                          const remaining = (s.maxNumber || 10) - (s.currentNumber || 0);
                          return (
                            <button
                              key={s.id}
                              type="button"
                              className={`slot-card ${isSelected ? 'selected' : ''}`}
                              onClick={() => handleSelectSlot(s)}
                            >
                              <div className="slot-time">
                                <i className="far fa-clock me-1" />
                                {s.timeTypeData?.valueVi || s.timeType}
                              </div>
                              <div className="slot-capacity">
                                Còn {remaining} chỗ
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* TAB 2: BÁC SĨ KHÁC CÙNG CHUYÊN KHOA */}
            {activeTab === 'alternative_doctor' && (
              <div className="alt-doctors-section">
                <p className="section-hint">
                  Nếu bác sĩ của bạn đang có lịch bận kéo dài, bạn có thể lựa chọn bác sĩ cùng chuyên khoa dưới đây để được khám sớm nhất:
                </p>
                <div className="alt-doctors-list">
                  {alternativeDoctors.map((alt) => (
                    <div key={alt.doctor?.id} className="alt-doctor-card">
                      <div className="alt-doc-header">
                        <div className="alt-avatar">
                          {alt.doctor?.image ? (
                            <img src={alt.doctor.image} alt={alt.doctor.lastName} />
                          ) : (
                            <i className="fas fa-user-md" />
                          )}
                        </div>
                        <div className="alt-info">
                          <h5>Bác sĩ {alt.doctor?.lastName} {alt.doctor?.firstName}</h5>
                          <span className="alt-clinic">{alt.clinic?.name}</span>
                          <span className="alt-price">
                            Giá khám: <b>{alt.price?.valueVi || 'Theo quy định'}</b>
                          </span>
                        </div>
                      </div>

                      {/* Các slot của bác sĩ thay thế */}
                      <div className="alt-slots-list">
                        <span className="slots-title">Khung giờ gần nhất:</span>
                        {(!alt.upcomingSchedules || alt.upcomingSchedules.length === 0) ? (
                          <span className="text-muted small">Hiện chưa mở slot</span>
                        ) : (
                          <div className="alt-chips-row">
                            {alt.upcomingSchedules.slice(0, 4).map((s) => {
                              const isSelected = selectedDoctorId === alt.doctor?.id && selectedSlot?.timeType === s.timeType && selectedDate === s.date;
                              return (
                                <button
                                  key={s.id}
                                  type="button"
                                  className={`alt-slot-chip ${isSelected ? 'active' : ''}`}
                                  onClick={() => {
                                    setSelectedDoctorId(alt.doctor?.id);
                                    setSelectedDate(s.date);
                                    setSelectedSlot(s);
                                  }}
                                >
                                  {formatDateDisplay(s.date).split(',')[0]} • {s.timeTypeData?.valueVi || s.timeType}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Note & Financial Settlement Summary */}
            <div className="reschedule-settlement-box">
              <div className="settlement-row">
                <span className="st-label">Giá khám ca mới:</span>
                <span className="st-val">{CommonUtils.formatCurrency(currentPrice)} ₫</span>
              </div>
              <div className="settlement-row">
                <span className="st-label">Số dư Ví BookingCare hiện tại:</span>
                <span className="st-val text-primary font-bold">{CommonUtils.formatCurrency(walletBalance)} ₫</span>
              </div>
              <div className="settlement-row highlight">
                <span className="st-label">
                  <i className="fas fa-shield-alt text-success me-1" />
                  Số tiền thanh toán qua Ví (100% Tự động):
                </span>
                <span className="st-val text-success font-bold">
                  {CommonUtils.formatCurrency(currentPrice)} ₫
                </span>
              </div>
              <div className="settlement-note">
                <i className="fas fa-info-circle me-1" />
                Số dư ví sau khi đổi lịch: <b>{CommonUtils.formatCurrency(Math.max(0, balanceAfter))} ₫</b>. Không mất thêm bất kỳ chi phí phát sinh nào.
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="reschedule-modal-footer">
          <button type="button" className="btn-cancel" onClick={onClose} disabled={submitting}>
            Đóng
          </button>
          <button
            type="button"
            className="btn-confirm-reschedule"
            onClick={handleSubmitReschedule}
            disabled={!selectedSlot || submitting || loading}
          >
            {submitting ? (
              <>
                <i className="fas fa-spinner fa-spin me-2" />
                Đang xử lý đổi lịch...
              </>
            ) : (
              <>
                <i className="fas fa-check-circle me-2" />
                Xác Nhận Đổi Lịch Khám (Miễn Phí)
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SmartRescheduleModal;
