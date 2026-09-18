// src/containers/System/Doctor/CreateScheduleModal.jsx
// [Doctor Capacity Workspace] Modal Tạo lịch đa năng 3-in-1: Tạo theo ngày, Sao chép sang nhiều ngày, Lịch lặp định kỳ
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import moment from 'moment';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

import {
  bulkCreateSchedule,
  copyDoctorSchedule,
  createRecurringSchedule,
} from '../../../services/doctorService';

import {
  Calendar,
  Copy,
  Repeat,
  Clock,
  Users,
  CheckCircle2,
  X,
  Sparkles,
  CalendarDays,
  ArrowRight,
} from 'lucide-react';

import './CreateScheduleModal.scss';

const TIME_FRAMES = [
  { key: 'T1', label: '8:00 – 9:00' },
  { key: 'T2', label: '9:00 – 10:00' },
  { key: 'T3', label: '10:00 – 11:00' },
  { key: 'T4', label: '11:00 – 12:00' },
  { key: 'T5', label: '13:00 – 14:00' },
  { key: 'T6', label: '14:00 – 15:00' },
  { key: 'T7', label: '15:00 – 16:00' },
  { key: 'T8', label: '16:00 – 17:00' },
];

const DAYS_OF_WEEK = [
  { key: 1, label: 'Thứ 2' },
  { key: 2, label: 'Thứ 3' },
  { key: 3, label: 'Thứ 4' },
  { key: 4, label: 'Thứ 5' },
  { key: 5, label: 'Thứ 6' },
  { key: 6, label: 'Thứ 7' },
  { key: 7, label: 'Chủ nhật' },
];

const CreateScheduleModal = ({ isOpen, onClose, doctorId, initialDate, onSaved }) => {
  const [activeTab, setActiveTab] = useState('single'); // 'single' | 'copy' | 'recurring'
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Tab 1: Single Date State
  const [singleDate, setSingleDate] = useState(() => new Date(initialDate || Date.now()));
  const [singleTimes, setSingleTimes] = useState(['T1', 'T2', 'T3', 'T4']);
  const [singleCapacity, setSingleCapacity] = useState(10);

  // Tab 2: Copy State
  const [sourceDate, setSourceDate] = useState(() => new Date(initialDate || Date.now()));
  const [targetDaysCount, setTargetDaysCount] = useState(7); // 3, 7, 14

  // Tab 3: Recurring State
  const [recurringDays, setRecurringDays] = useState([1, 2, 3, 4, 5]); // Mon - Fri
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d;
  });
  const [recurringTimes, setRecurringTimes] = useState(['T1', 'T2', 'T3', 'T4', 'T5', 'T6']);
  const [recurringCapacity, setRecurringCapacity] = useState(10);

  useEffect(() => {
    if (isOpen && initialDate) {
      setSingleDate(new Date(initialDate));
      setSourceDate(new Date(initialDate));
    }
  }, [isOpen, initialDate]);

  if (!isOpen) return null;

  // Toggle time selection
  const toggleTimeSelection = (key, list, setList) => {
    setList(list.includes(key) ? list.filter((t) => t !== key) : [...list, key]);
  };

  // Toggle day of week selection
  const toggleDaySelection = (dayKey) => {
    setRecurringDays((prev) =>
      prev.includes(dayKey) ? prev.filter((d) => d !== dayKey) : [...prev, dayKey]
    );
  };

  // 1. Submit Single Date
  const handleSaveSingle = async (e) => {
    e.preventDefault();
    if (singleTimes.length === 0) {
      toast.warning('Vui lòng chọn ít nhất 1 khung giờ khám!');
      return;
    }

    setIsSubmitting(true);
    try {
      const dateStr = moment(singleDate).format('YYYY-MM-DD');
      const timestamp = moment.utc(dateStr).valueOf();

      const arrSchedule = singleTimes.map((timeType) => ({
        doctorId,
        date: timestamp,
        timeType,
        maxNumber: parseInt(singleCapacity, 10) || 10,
      }));

      const res = await bulkCreateSchedule({ arrSchedule });
      if (res && res.errCode === 0) {
        toast.success(`Đã tạo thành công ${singleTimes.length} slot khám cho ngày ${moment(singleDate).format('DD/MM/YYYY')}!`);
        if (onSaved) onSaved();
        onClose();
      } else {
        toast.error(res?.message || 'Lỗi khi tạo lịch khám!');
      }
    } catch (err) {
      toast.error('Lỗi server khi tạo lịch khám!');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Submit Copy
  const handleSaveCopy = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const srcStr = moment(sourceDate).format('YYYY-MM-DD');
      const srcTimestamp = moment.utc(srcStr).valueOf();

      // Sinh danh sách ngày đích
      const targetDates = [];
      for (let i = 1; i <= targetDaysCount; i++) {
        const nextDayStr = moment(sourceDate).add(i, 'days').format('YYYY-MM-DD');
        targetDates.push(moment.utc(nextDayStr).valueOf());
      }

      const res = await copyDoctorSchedule({
        sourceDate: srcTimestamp,
        targetDates,
      });

      if (res && res.errCode === 0) {
        toast.success(res.message || 'Sao chép lịch khám thành công!');
        if (onSaved) onSaved();
        onClose();
      } else {
        toast.error(res?.message || 'Không thể sao chép lịch!');
      }
    } catch (err) {
      toast.error('Lỗi khi sao chép lịch khám!');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Submit Recurring
  const handleSaveRecurring = async (e) => {
    e.preventDefault();
    if (recurringDays.length === 0) {
      toast.warning('Vui lòng chọn ít nhất 1 thứ trong tuần!');
      return;
    }
    if (recurringTimes.length === 0) {
      toast.warning('Vui lòng chọn ít nhất 1 khung giờ khám!');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createRecurringSchedule({
        daysOfWeek: recurringDays,
        startDate: moment(startDate).format('YYYY-MM-DD'),
        endDate: moment(endDate).format('YYYY-MM-DD'),
        timeTypes: recurringTimes,
        maxNumber: parseInt(recurringCapacity, 10) || 10,
      });

      if (res && res.errCode === 0) {
        toast.success(res.message || 'Thiết lập lịch định kỳ thành công!');
        if (onSaved) onSaved();
        onClose();
      } else {
        toast.error(res?.message || 'Không thể tạo lịch định kỳ!');
      }
    } catch (err) {
      toast.error('Lỗi khi tạo lịch định kỳ!');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="create-schedule-overlay" onClick={onClose}>
      <div className="create-schedule-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="csm-header">
          <div className="csm-title-group">
            <div className="csm-icon-box">
              <CalendarDays size={22} />
            </div>
            <div>
              <h3>Thiết lập lịch làm việc & Năng lực tiếp nhận</h3>
              <p>Mở slot khám, nhân bản lịch hoặc thiết lập lịch lặp theo tuần</p>
            </div>
          </div>
          <button type="button" className="btn-close-csm" onClick={onClose} title="Đóng">
            <X size={18} />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="csm-tabs">
          <button
            type="button"
            className={`csm-tab-btn ${activeTab === 'single' ? 'active' : ''}`}
            onClick={() => setActiveTab('single')}
          >
            <Calendar size={16} />
            <span>Tạo cho một ngày</span>
          </button>
          <button
            type="button"
            className={`csm-tab-btn ${activeTab === 'copy' ? 'active' : ''}`}
            onClick={() => setActiveTab('copy')}
          >
            <Copy size={16} />
            <span>Sao chép lịch có sẵn</span>
          </button>
          <button
            type="button"
            className={`csm-tab-btn ${activeTab === 'recurring' ? 'active' : ''}`}
            onClick={() => setActiveTab('recurring')}
          >
            <Repeat size={16} />
            <span>Lịch lặp định kỳ</span>
          </button>
        </div>

        {/* Body */}
        <div className="csm-body">
          {/* ──────────────────────────────────────────────────────── */}
          {/* TAB 1: TẠO CHO MỘT NGÀY                                 */}
          {/* ──────────────────────────────────────────────────────── */}
          {activeTab === 'single' && (
            <form onSubmit={handleSaveSingle} className="csm-form">
              <div className="csm-field-group">
                <label className="field-label">
                  <Calendar size={15} /> Ngày khám
                </label>
                <div className="datepicker-custom-wrapper">
                  <DatePicker
                    className="csm-datepicker-input"
                    selected={singleDate}
                    onChange={(date) => setSingleDate(date)}
                    dateFormat="dd/MM/yyyy"
                    minDate={new Date()}
                  />
                </div>
              </div>

              <div className="csm-field-group">
                <div className="field-label-row">
                  <label className="field-label">
                    <Clock size={15} /> Chọn các khung giờ mở khám ({singleTimes.length} đã chọn)
                  </label>
                  <div className="quick-select-links">
                    <button
                      type="button"
                      onClick={() => setSingleTimes(TIME_FRAMES.map((t) => t.key))}
                    >
                      Chọn tất cả
                    </button>
                    <span>·</span>
                    <button type="button" onClick={() => setSingleTimes([])}>
                      Bỏ chọn
                    </button>
                  </div>
                </div>

                <div className="times-grid">
                  {TIME_FRAMES.map((tf) => {
                    const isSelected = singleTimes.includes(tf.key);
                    return (
                      <button
                        key={tf.key}
                        type="button"
                        className={`time-chip-btn ${isSelected ? 'selected' : ''}`}
                        onClick={() => toggleTimeSelection(tf.key, singleTimes, setSingleTimes)}
                      >
                        <span>{tf.label}</span>
                        {isSelected && <CheckCircle2 size={14} className="chip-check" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="csm-field-group">
                <label className="field-label">
                  <Users size={15} /> Sức chứa tối đa mỗi slot
                </label>
                <div className="capacity-input-row">
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={singleCapacity}
                    onChange={(e) => setSingleCapacity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="capacity-input"
                  />
                  <span className="unit-label">bệnh nhân / slot</span>
                </div>
                <p className="field-help">Mỗi khung giờ sẽ tiếp nhận tối đa số lượng bệnh nhân này.</p>
              </div>

              <div className="csm-form-actions">
                <button type="button" className="btn-cancel" onClick={onClose}>
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn-submit-primary"
                  disabled={isSubmitting || singleTimes.length === 0}
                >
                  {isSubmitting ? 'Đang lưu...' : `Lưu ${singleTimes.length} khung giờ khám`}
                </button>
              </div>
            </form>
          )}

          {/* ──────────────────────────────────────────────────────── */}
          {/* TAB 2: SAO CHÉP LỊCH                                    */}
          {/* ──────────────────────────────────────────────────────── */}
          {activeTab === 'copy' && (
            <form onSubmit={handleSaveCopy} className="csm-form">
              <div className="csm-hint-card">
                <Sparkles size={16} />
                <span>
                  Hệ thống sẽ sao chép toàn bộ các khung giờ và sức chứa từ <strong>Ngày nguồn</strong> sang các ngày tiếp theo mà bạn không cần phải tạo lại từng slot.
                </span>
              </div>

              <div className="csm-field-group">
                <label className="field-label">
                  <Calendar size={15} /> Ngày nguồn (đã có lịch)
                </label>
                <div className="datepicker-custom-wrapper">
                  <DatePicker
                    className="csm-datepicker-input"
                    selected={sourceDate}
                    onChange={(date) => setSourceDate(date)}
                    dateFormat="dd/MM/yyyy"
                  />
                </div>
              </div>

              <div className="csm-field-group">
                <label className="field-label">
                  <Copy size={15} /> Sao chép sang bao nhiêu ngày tiếp theo?
                </label>
                <div className="copy-days-presets">
                  <button
                    type="button"
                    className={`preset-btn ${targetDaysCount === 3 ? 'active' : ''}`}
                    onClick={() => setTargetDaysCount(3)}
                  >
                    3 ngày tiếp theo
                  </button>
                  <button
                    type="button"
                    className={`preset-btn ${targetDaysCount === 7 ? 'active' : ''}`}
                    onClick={() => setTargetDaysCount(7)}
                  >
                    1 tuần (7 ngày)
                  </button>
                  <button
                    type="button"
                    className={`preset-btn ${targetDaysCount === 14 ? 'active' : ''}`}
                    onClick={() => setTargetDaysCount(14)}
                  >
                    2 tuần (14 ngày)
                  </button>
                </div>
              </div>

              <div className="copy-summary-box">
                <ArrowRight size={16} />
                <span>
                  Sao chép từ <strong>{moment(sourceDate).format('DD/MM/YYYY')}</strong> sang{' '}
                  <strong>{targetDaysCount} ngày</strong> liên tiếp kế tiếp (từ{' '}
                  {moment(sourceDate).add(1, 'days').format('DD/MM/YYYY')} đến{' '}
                  {moment(sourceDate).add(targetDaysCount, 'days').format('DD/MM/YYYY')}).
                </span>
              </div>

              <div className="csm-form-actions">
                <button type="button" className="btn-cancel" onClick={onClose}>
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn-submit-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Đang sao chép...' : 'Thực hiện sao chép'}
                </button>
              </div>
            </form>
          )}

          {/* ──────────────────────────────────────────────────────── */}
          {/* TAB 3: LỊCH ĐỊNH KỲ LẶP TUẦN                           */}
          {/* ──────────────────────────────────────────────────────── */}
          {activeTab === 'recurring' && (
            <form onSubmit={handleSaveRecurring} className="csm-form">
              <div className="csm-field-group">
                <div className="field-label-row">
                  <label className="field-label">
                    <Repeat size={15} /> Lặp lại vào các ngày trong tuần
                  </label>
                  <div className="quick-select-links">
                    <button
                      type="button"
                      onClick={() => setRecurringDays([1, 2, 3, 4, 5])}
                    >
                      Thứ 2 - Thứ 6
                    </button>
                    <span>·</span>
                    <button type="button" onClick={() => setRecurringDays([1, 2, 3, 4, 5, 6, 7])}>
                      Cả tuần
                    </button>
                  </div>
                </div>

                <div className="days-chip-grid">
                  {DAYS_OF_WEEK.map((dow) => {
                    const isSelected = recurringDays.includes(dow.key);
                    return (
                      <button
                        key={dow.key}
                        type="button"
                        className={`dow-btn ${isSelected ? 'selected' : ''}`}
                        onClick={() => toggleDaySelection(dow.key)}
                      >
                        {dow.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="csm-grid-2">
                <div className="csm-field-group">
                  <label className="field-label">Từ ngày</label>
                  <DatePicker
                    className="csm-datepicker-input"
                    selected={startDate}
                    onChange={(d) => setStartDate(d)}
                    dateFormat="dd/MM/yyyy"
                    minDate={new Date()}
                  />
                </div>
                <div className="csm-field-group">
                  <label className="field-label">Đến ngày</label>
                  <DatePicker
                    className="csm-datepicker-input"
                    selected={endDate}
                    onChange={(d) => setEndDate(d)}
                    dateFormat="dd/MM/yyyy"
                    minDate={startDate}
                  />
                </div>
              </div>

              <div className="csm-field-group">
                <label className="field-label">
                  <Clock size={15} /> Khung giờ áp dụng ({recurringTimes.length} đã chọn)
                </label>
                <div className="times-grid">
                  {TIME_FRAMES.map((tf) => {
                    const isSelected = recurringTimes.includes(tf.key);
                    return (
                      <button
                        key={tf.key}
                        type="button"
                        className={`time-chip-btn ${isSelected ? 'selected' : ''}`}
                        onClick={() => toggleTimeSelection(tf.key, recurringTimes, setRecurringTimes)}
                      >
                        <span>{tf.label}</span>
                        {isSelected && <CheckCircle2 size={14} className="chip-check" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="csm-field-group">
                <label className="field-label">
                  <Users size={15} /> Sức chứa mỗi slot
                </label>
                <div className="capacity-input-row">
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={recurringCapacity}
                    onChange={(e) => setRecurringCapacity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="capacity-input"
                  />
                  <span className="unit-label">bệnh nhân / slot</span>
                </div>
              </div>

              <div className="csm-form-actions">
                <button type="button" className="btn-cancel" onClick={onClose}>
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn-submit-primary"
                  disabled={isSubmitting || recurringDays.length === 0 || recurringTimes.length === 0}
                >
                  {isSubmitting ? 'Đang thiết lập...' : 'Áp dụng lịch lặp định kỳ'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateScheduleModal;
