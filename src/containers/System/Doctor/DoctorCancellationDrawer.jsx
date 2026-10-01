// src/containers/System/Doctor/DoctorCancellationDrawer.jsx
// Drawer Báo bận / Hủy lịch khám chuyên sâu với Live Impact Preview & Hoàn tiền Ví 100%
import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-toastify';
import moment from 'moment';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import {
  X,
  AlertTriangle,
  Calendar,
  Clock,
  User,
  Wallet,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ShieldAlert,
  Loader2,
  ArrowRight,
  Info,
} from 'lucide-react';
import {
  previewDoctorCancellation,
  executeDoctorCancellation,
} from '../../../services/doctorCancellationService';
import './DoctorCancellationDrawer.scss';

const QUICK_REASONS = [
  'Bác sĩ có ca phẫu thuật / cấp cứu khẩn cấp',
  'Bác sĩ bận hội chẩn chuyên khoa đột xuất',
  'Lịch công tác y khoa đột xuất ngoài dự kiến',
  'Bác sĩ gặp sự cố sức khỏe đột xuất',
  'Cơ sở y tế điều chỉnh phân bổ phòng khám',
];

const DoctorCancellationDrawer = ({
  isOpen,
  onClose,
  doctorId,
  currentDate, // unix ms
  schedules = [],
  selectedSlot = null,
  onSuccess,
}) => {
  const [scope, setScope] = useState('SLOT'); // 'SLOT' | 'DAY' | 'BOOKING' | 'DATE_RANGE'
  const [selectedTimeType, setSelectedTimeType] = useState('');
  const [selectedBookingId, setSelectedBookingId] = useState('');
  const [rangeFromDate, setRangeFromDate] = useState(() => new Date(currentDate || Date.now()));
  const [rangeToDate, setRangeToDate] = useState(() => new Date(currentDate || Date.now()));
  const [reason, setReason] = useState('');

  // Live Preview State
  const [previewData, setPreviewData] = useState(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Chuẩn hóa ngày dạng unix string (hoặc YYYYMMDD / YYYY-MM-DD theo convention backend)
  const dateStr = useMemo(() => {
    return currentDate ? String(currentDate) : String(moment().startOf('day').valueOf());
  }, [currentDate]);

  // Danh sách các booking hiện có trong ngày để phục vụ scope BOOKING
  const allBookingsInDay = useMemo(() => {
    const list = [];
    schedules.forEach((sch) => {
      if (sch.slotBookings && Array.isArray(sch.slotBookings)) {
        sch.slotBookings.forEach((b) => {
          if (b.statusId !== 'S4') {
            list.push({
              ...b,
              slotTimeLabel: sch.timeTypeData?.valueVi || sch.timeType,
            });
          }
        });
      }
    });
    return list;
  }, [schedules]);

  // Khởi tạo giá trị khi mở Drawer
  useEffect(() => {
    if (isOpen) {
      if (selectedSlot) {
        setScope('SLOT');
        setSelectedTimeType(selectedSlot.timeType);
      } else {
        setScope('DAY');
        if (schedules.length > 0) {
          setSelectedTimeType(schedules[0].timeType);
        }
      }
      if (allBookingsInDay.length > 0) {
        setSelectedBookingId(allBookingsInDay[0].id);
      }
      setReason('');
    }
  }, [isOpen, selectedSlot, schedules, allBookingsInDay]);

  // Tự động gọi Impact Preview khi scope hoặc các tiêu chí thay đổi
  useEffect(() => {
    if (!isOpen || !doctorId) return;

    let isMounted = true;
    const fetchPreview = async () => {
      setIsLoadingPreview(true);
      try {
        const payload = {
          doctorId,
          scope,
          date: dateStr,
        };

        if (scope === 'SLOT') {
          payload.timeType = selectedTimeType;
        } else if (scope === 'BOOKING') {
          payload.bookingId = selectedBookingId;
        } else if (scope === 'DATE_RANGE') {
          payload.fromDate = String(moment(rangeFromDate).startOf('day').valueOf());
          payload.toDate = String(moment(rangeToDate).endOf('day').valueOf());
        }

        const res = await previewDoctorCancellation(payload);
        if (isMounted) {
          if (res && res.errCode === 0 && res.data) {
            setPreviewData(res.data);
          } else {
            setPreviewData(null);
          }
        }
      } catch (err) {
        console.error('fetchPreview error:', err);
        if (isMounted) setPreviewData(null);
      } finally {
        if (isMounted) setIsLoadingPreview(false);
      }
    };

    fetchPreview();

    return () => {
      isMounted = false;
    };
  }, [
    isOpen,
    doctorId,
    scope,
    dateStr,
    selectedTimeType,
    selectedBookingId,
    rangeFromDate,
    rangeToDate,
  ]);

  const handleSelectQuickReason = (r) => {
    setReason(r);
  };

  const handleConfirmCancel = async () => {
    if (!reason || reason.trim().length < 5) {
      toast.warning('Vui lòng nhập lý do hủy lịch rõ ràng (tối thiểu 5 ký tự)!');
      return;
    }

    if (scope === 'SLOT' && !selectedTimeType) {
      toast.warning('Vui lòng chọn khung giờ cần hủy!');
      return;
    }

    if (scope === 'BOOKING' && !selectedBookingId) {
      toast.warning('Vui lòng chọn ca khám cần hủy!');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        doctorId,
        scope,
        date: dateStr,
        reason: reason.trim(),
      };

      if (scope === 'SLOT') {
        payload.timeType = selectedTimeType;
      } else if (scope === 'BOOKING') {
        payload.bookingId = selectedBookingId;
      } else if (scope === 'DATE_RANGE') {
        payload.fromDate = String(moment(rangeFromDate).startOf('day').valueOf());
        payload.toDate = String(moment(rangeToDate).endOf('day').valueOf());
      }

      const res = await executeDoctorCancellation(payload);
      if (res && res.errCode === 0) {
        toast.success(res.message || 'Hủy lịch khám và hoàn tiền cho bệnh nhân thành công!');
        if (onSuccess) onSuccess();
        onClose();
      } else {
        toast.error(res?.message || 'Lỗi khi thực hiện hủy lịch khám!');
      }
    } catch (err) {
      console.error('handleConfirmCancel error:', err);
      toast.error('Lỗi kết nối máy chủ!');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="doc-cancel-drawer-overlay" onClick={onClose}>
      <div className="doc-cancel-drawer" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="doc-cancel-drawer__header">
          <div className="tw-flex tw-items-center tw-gap-3">
            <div className="doc-cancel-drawer__icon-box">
              <ShieldAlert className="tw-w-6 tw-h-6 tw-text-rose-600" />
            </div>
            <div>
              <h2 className="doc-cancel-drawer__title">Báo bận / Hủy lịch khám</h2>
              <p className="doc-cancel-drawer__subtitle">
                Đóng khung giờ làm việc và tự động hoàn tiền 100% vào Ví điện tử Bệnh nhân
              </p>
            </div>
          </div>
          <button
            type="button"
            className="doc-cancel-drawer__close-btn"
            onClick={onClose}
            disabled={isSubmitting}
          >
            <X className="tw-w-5 tw-h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="doc-cancel-drawer__body">
          {/* 1. Chọn phạm vi hủy */}
          <div className="doc-cancel-drawer__section">
            <label className="doc-cancel-drawer__label">
              <span className="step-num">1</span> Chọn phạm vi hủy lịch
            </label>
            <div className="doc-cancel-drawer__scope-grid">
              <div
                className={`scope-card ${scope === 'SLOT' ? 'scope-card--active' : ''}`}
                onClick={() => setScope('SLOT')}
              >
                <div className="scope-card__radio">
                  <div className="inner-dot" />
                </div>
                <div className="scope-card__info">
                  <span className="scope-card__name">Một khung giờ (Slot)</span>
                  <span className="scope-card__desc">Hủy và đóng 1 ca khám cụ thể trong ngày</span>
                </div>
              </div>

              <div
                className={`scope-card ${scope === 'DAY' ? 'scope-card--active' : ''}`}
                onClick={() => setScope('DAY')}
              >
                <div className="scope-card__radio">
                  <div className="inner-dot" />
                </div>
                <div className="scope-card__info">
                  <span className="scope-card__name">Cả ngày khám</span>
                  <span className="scope-card__desc">Hủy toàn bộ các slot và ca khám trong ngày</span>
                </div>
              </div>

              <div
                className={`scope-card ${scope === 'BOOKING' ? 'scope-card--active' : ''}`}
                onClick={() => setScope('BOOKING')}
              >
                <div className="scope-card__radio">
                  <div className="inner-dot" />
                </div>
                <div className="scope-card__info">
                  <span className="scope-card__name">Một bệnh nhân</span>
                  <span className="scope-card__desc">Hủy riêng 1 ca khám, giữ lại slot cho người khác</span>
                </div>
              </div>

              <div
                className={`scope-card ${scope === 'DATE_RANGE' ? 'scope-card--active' : ''}`}
                onClick={() => setScope('DATE_RANGE')}
              >
                <div className="scope-card__radio">
                  <div className="inner-dot" />
                </div>
                <div className="scope-card__info">
                  <span className="scope-card__name">Khoảng ngày (Nghỉ dài)</span>
                  <span className="scope-card__desc">Nghỉ phép hoặc công tác nhiều ngày liên tiếp</span>
                </div>
              </div>
            </div>

            {/* Chi tiết lựa chọn theo scope */}
            <div className="scope-detail-box">
              {scope === 'SLOT' && (
                <div className="tw-flex tw-flex-col tw-gap-1.5">
                  <label className="sub-label">Chọn khung giờ cần báo bận / hủy:</label>
                  <select
                    className="doc-cancel-select"
                    value={selectedTimeType}
                    onChange={(e) => setSelectedTimeType(e.target.value)}
                  >
                    {schedules.map((s) => (
                      <option key={s.id} value={s.timeType}>
                        {s.timeTypeData?.valueVi || s.timeType} ({s.currentNumber}/{s.maxNumber} bệnh nhân) - {s.status === 'CLOSED_BY_DOCTOR' ? 'Đã đóng' : 'Đang mở'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {scope === 'DAY' && (
                <div className="tw-text-xs tw-text-slate-600 tw-flex tw-items-center tw-gap-2 tw-bg-slate-50 tw-p-2.5 tw-rounded-lg">
                  <Calendar className="tw-w-4 tw-h-4 tw-text-teal-600" />
                  <span>
                    Áp dụng cho toàn bộ lịch làm việc ngày: <strong>{moment(parseInt(dateStr, 10)).format('dddd, DD/MM/YYYY')}</strong>
                  </span>
                </div>
              )}

              {scope === 'BOOKING' && (
                <div className="tw-flex tw-flex-col tw-gap-1.5">
                  <label className="sub-label">Chọn ca khám cần hủy:</label>
                  {allBookingsInDay.length > 0 ? (
                    <select
                      className="doc-cancel-select"
                      value={selectedBookingId}
                      onChange={(e) => setSelectedBookingId(e.target.value)}
                    >
                      {allBookingsInDay.map((b) => (
                        <option key={b.id} value={b.id}>
                          #{b.id} - {b.patientName} [{b.slotTimeLabel}] - Phí: {(Number(b.bookingPrice) || 0).toLocaleString('vi-VN')} ₫
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="tw-text-xs tw-text-amber-700 tw-bg-amber-50 tw-p-2.5 tw-rounded-lg">
                      Không có bệnh nhân nào đặt lịch trong ngày này để hủy theo ca.
                    </div>
                  )}
                </div>
              )}

              {scope === 'DATE_RANGE' && (
                <div className="tw-grid tw-grid-cols-2 tw-gap-3">
                  <div>
                    <label className="sub-label">Từ ngày:</label>
                    <DatePicker
                      selected={rangeFromDate}
                      onChange={(d) => setRangeFromDate(d)}
                      dateFormat="dd/MM/yyyy"
                      className="doc-cancel-date-input"
                    />
                  </div>
                  <div>
                    <label className="sub-label">Đến ngày:</label>
                    <DatePicker
                      selected={rangeToDate}
                      onChange={(d) => setRangeToDate(d)}
                      dateFormat="dd/MM/yyyy"
                      className="doc-cancel-date-input"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 2. LIVE IMPACT PREVIEW */}
          <div className="doc-cancel-drawer__section">
            <div className="tw-flex tw-items-center tw-justify-between tw-mb-2">
              <label className="doc-cancel-drawer__label tw-mb-0">
                <span className="step-num">2</span> Đánh giá tác động & Dự toán hoàn tiền
              </label>
              {isLoadingPreview && (
                <span className="tw-text-xs tw-text-teal-600 tw-flex tw-items-center tw-gap-1 tw-font-medium">
                  <Loader2 className="tw-w-3.5 tw-h-3.5 tw-animate-spin" /> Đang tính toán...
                </span>
              )}
            </div>

            {/* Impact Metric Cards */}
            <div className="impact-metrics-grid">
              <div className="impact-metric-card">
                <span className="impact-metric-card__label">Khung giờ (Slot) sẽ đóng</span>
                <span className="impact-metric-card__val text-slate">
                  {previewData?.affectedSlotsCount ?? 0}
                </span>
              </div>
              <div className="impact-metric-card">
                <span className="impact-metric-card__label">Bệnh nhân bị ảnh hưởng</span>
                <span className="impact-metric-card__val text-rose">
                  {previewData?.affectedBookingsCount ?? 0}
                </span>
              </div>
              <div className="impact-metric-card">
                <span className="impact-metric-card__label">Tổng tiền tự động hoàn về Ví</span>
                <span className="impact-metric-card__val text-teal">
                  {(previewData?.totalRefundAmount ?? 0).toLocaleString('vi-VN')} ₫
                </span>
              </div>
            </div>

            {/* Danh sách ca khám bị hủy */}
            {previewData && previewData.affectedBookings && previewData.affectedBookings.length > 0 ? (
              <div className="affected-bookings-box">
                <div className="affected-bookings-header">
                  <span>Danh sách bệnh nhân sẽ nhận tiền hoàn 100%:</span>
                </div>
                <div className="affected-bookings-list">
                  {previewData.affectedBookings.map((b) => (
                    <div key={b.id} className="affected-booking-row">
                      <div className="tw-flex tw-items-center tw-gap-2.5">
                        <div className="booking-badge">{b.timeLabel || b.timeType}</div>
                        <div>
                          <div className="tw-font-semibold tw-text-slate-800 tw-text-xs">
                            {b.patientName} (#{b.id})
                          </div>
                          <div className="tw-text-[11px] tw-text-slate-500">{b.phoneNumber || 'Không có SĐT'}</div>
                        </div>
                      </div>
                      <div className="tw-text-right">
                        <div className="tw-text-xs tw-font-bold tw-text-teal-700">
                          +{b.bookingPrice.toLocaleString('vi-VN')} ₫
                        </div>
                        <div className="tw-text-[10px] tw-text-emerald-600 tw-flex tw-items-center tw-gap-0.5 tw-justify-end">
                          <CheckCircle2 className="tw-w-3 tw-h-3" /> Ví BookingCare
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="empty-affected-box">
                <CheckCircle2 className="tw-w-5 tw-h-5 tw-text-emerald-600" />
                <span>Không có bệnh nhân nào bị ảnh hưởng trong phạm vi đã chọn. Lịch sẽ được đóng an toàn mà không phát sinh hoàn tiền.</span>
              </div>
            )}
          </div>

          {/* 3. Lý do hủy lịch */}
          <div className="doc-cancel-drawer__section">
            <label className="doc-cancel-drawer__label">
              <span className="step-num">3</span> Lý do bác sĩ bận việc đột xuất *
            </label>
            <div className="quick-reasons-row">
              {QUICK_REASONS.map((r, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={`quick-reason-chip ${reason === r ? 'quick-reason-chip--selected' : ''}`}
                  onClick={() => handleSelectQuickReason(r)}
                >
                  {r}
                </button>
              ))}
            </div>

            <textarea
              className="doc-cancel-textarea"
              rows={3}
              placeholder="Nhập chi tiết lý do bác sĩ bận đột xuất (nội dung này sẽ được ghi vào Sổ cái và gửi thông báo lịch sự đến người bệnh)..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
          </div>

          {/* Guarantee Box */}
          <div className="zero-admin-guarantee-card">
            <div className="tw-flex tw-items-start tw-gap-3">
              <ShieldAlert className="tw-w-5 tw-h-5 tw-text-teal-600 tw-shrink-0 tw-mt-0.5" />
              <div className="tw-text-xs tw-text-slate-700">
                <strong>Cam kết Zero-Admin & Sổ cái Bất biến:</strong> Khi bạn xác nhận, toàn bộ số tiền {(previewData?.totalRefundAmount ?? 0).toLocaleString('vi-VN')} ₫ sẽ được hệ thống cộng tức thì vào Ví điện tử của từng bệnh nhân mà không cần chờ Admin đối soát hay chuyển khoản thủ công. Khung giờ khám sẽ được đóng ngay lập tức để ngăn bệnh nhân mới đặt lịch.
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="doc-cancel-drawer__footer">
          <button
            type="button"
            className="drawer-btn drawer-btn--cancel"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Hủy thao tác
          </button>

          <button
            type="button"
            className="drawer-btn drawer-btn--confirm"
            onClick={handleConfirmCancel}
            disabled={isSubmitting || !reason || reason.trim().length < 5}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="tw-w-4 tw-h-4 tw-animate-spin" /> Đang xử lý & hoàn tiền...
              </>
            ) : (
              <>
                <ShieldAlert className="tw-w-4 tw-h-4" /> Xác nhận Hủy lịch & Hoàn 100% về Ví
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DoctorCancellationDrawer;
