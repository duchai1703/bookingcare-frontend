// src/containers/System/Doctor/DoctorScheduleWorkspace.jsx
// [Doctor Capacity Workspace] Master - Detail Slot Architecture & Availability Management
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import moment from 'moment';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

import {
  getScheduleByDateAdmin,
  deleteSchedule,
  editSchedule,
  getDoctorOwnProfile,
  toggleCloseScheduleSlot,
} from '../../../services/doctorService';
import { processLogout } from '../../../redux/slices/userSlice';
import CreateScheduleModal from './CreateScheduleModal';

import {
  CalendarDays,
  Clock,
  PlusCircle,
  Building2,
  Stethoscope,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Users,
  CheckCircle2,
  AlertCircle,
  Lock,
  Unlock,
  Trash2,
  ExternalLink,
  Phone,
  User,
  Sparkles,
  Copy,
  Minus,
  Plus,
} from 'lucide-react';

import './DoctorScheduleWorkspace.scss';

const DoctorScheduleWorkspace = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { userInfo } = useSelector((state) => state.user);

  // Date State (UTC Midnight bullet-proof)
  const [currentDate, setCurrentDate] = useState(() => {
    return moment.utc(moment().format('YYYY-MM-DD')).valueOf();
  });

  // Doctor profile metadata (Facility, Specialty)
  const [doctorProfile, setDoctorProfile] = useState(null);

  // Schedule list
  const [schedules, setSchedules] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filter & Selected Slot
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'OPEN' | 'FULL' | 'CLOSED'
  const [selectedSlot, setSelectedSlot] = useState(null);

  // Edit capacity in detail panel
  const [editCapacityVal, setEditCapacityVal] = useState(10);
  const [isUpdatingCapacity, setIsUpdatingCapacity] = useState(false);

  // Modal
  const [isOpenCreateModal, setIsOpenCreateModal] = useState(false);

  // 1. Fetch Doctor Profile (Facility, Specialty)
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await getDoctorOwnProfile();
        if (res && res.errCode === 0) {
          setDoctorProfile(res.data);
        }
      } catch (err) {
        console.error('Error fetching doctor profile:', err);
      }
    };
    if (userInfo?.id) {
      fetchProfile();
    }
  }, [userInfo?.id]);

  // 2. Fetch Schedules for current date
  const fetchSchedules = useCallback(async (dateTimestamp) => {
    if (!userInfo?.id) return;
    setIsLoading(true);
    try {
      // includeAll = true để lấy đầy đủ cả slot đã đầy & danh sách slotBookings
      const res = await getScheduleByDateAdmin(userInfo.id, dateTimestamp);
      if (res && res.errCode === 0) {
        const list = res.data || [];
        setSchedules(list);

        // Auto select slot
        setSelectedSlot((prev) => {
          if (!prev && list.length > 0) return list[0];
          const exists = list.find((s) => s.id === prev?.id);
          return exists || (list.length > 0 ? list[0] : null);
        });
      } else {
        setSchedules([]);
        setSelectedSlot(null);
      }
    } catch (err) {
      if (err.response?.status === 401) {
        toast.error('Phiên đăng nhập đã hết hạn! Vui lòng đăng nhập lại.');
        dispatch(processLogout());
        return;
      }
      toast.error('Lỗi khi tải lịch làm việc!');
    } finally {
      setIsLoading(false);
    }
  }, [userInfo?.id, dispatch]);

  useEffect(() => {
    fetchSchedules(currentDate);
  }, [currentDate, fetchSchedules]);

  // Sync editCapacityVal when selectedSlot changes
  useEffect(() => {
    if (selectedSlot) {
      setEditCapacityVal(selectedSlot.maxNumber || 10);
    }
  }, [selectedSlot]);

  // Date Navigation
  const handleStepDay = (step) => {
    const currentMoment = moment.utc(currentDate);
    const nextDate = currentMoment.add(step, 'days').format('YYYY-MM-DD');
    setCurrentDate(moment.utc(nextDate).valueOf());
  };

  const handleJumpToday = () => {
    const today = moment.utc(moment().format('YYYY-MM-DD')).valueOf();
    setCurrentDate(today);
  };

  const handleOnChangeDatePicker = (date) => {
    if (!date) return;
    const dateString = moment(date).format('YYYY-MM-DD');
    setCurrentDate(moment.utc(dateString).valueOf());
  };

  // Helper: Xác định trạng thái của Slot
  const getSlotStatus = (slot) => {
    const current = slot.currentNumber || 0;
    const max = slot.maxNumber || 10;
    if (max === 0 || max === current) {
      return current > 0 ? 'FULL' : 'CLOSED';
    }
    if (current >= max) return 'FULL';
    if (max - current <= 1) return 'NEAR_FULL';
    return 'OPEN';
  };

  // Summary Metrics Counters
  const counters = useMemo(() => {
    const totalSlots = schedules.length;
    let openSlots = 0;
    let fullSlots = 0;
    let closedSlots = 0;
    let totalBooked = 0;
    let totalAvailable = 0;

    schedules.forEach((s) => {
      const status = getSlotStatus(s);
      const current = s.currentNumber || 0;
      const max = s.maxNumber || 10;

      totalBooked += current;
      totalAvailable += Math.max(0, max - current);

      if (status === 'OPEN' || status === 'NEAR_FULL') openSlots++;
      else if (status === 'FULL') fullSlots++;
      else if (status === 'CLOSED') closedSlots++;
    });

    return { totalSlots, openSlots, fullSlots, closedSlots, totalBooked, totalAvailable };
  }, [schedules]);

  // Filtered slots
  const filteredSlots = useMemo(() => {
    if (statusFilter === 'ALL') return schedules;
    return schedules.filter((s) => {
      const status = getSlotStatus(s);
      if (statusFilter === 'OPEN') return status === 'OPEN' || status === 'NEAR_FULL';
      if (statusFilter === 'FULL') return status === 'FULL';
      if (statusFilter === 'CLOSED') return status === 'CLOSED';
      return true;
    });
  }, [schedules, statusFilter]);

  // Thao tác: Cập nhật Capacity
  const handleUpdateCapacity = async (newVal) => {
    if (!selectedSlot) return;
    const target = newVal !== undefined ? newVal : editCapacityVal;

    if (target < (selectedSlot.currentNumber || 0)) {
      toast.warning(`Không thể giảm sức chứa xuống dưới số lượng đã đặt (${selectedSlot.currentNumber} người)!`);
      setEditCapacityVal(selectedSlot.maxNumber);
      return;
    }

    setIsUpdatingCapacity(true);
    try {
      const res = await editSchedule({ id: selectedSlot.id, maxNumber: target });
      if (res && res.errCode === 0) {
        toast.success(`Đã cập nhật sức chứa slot thành ${target} bệnh nhân!`);
        fetchSchedules(currentDate);
      } else {
        toast.error(res?.message || 'Không thể cập nhật sức chứa!');
      }
    } catch (err) {
      toast.error('Lỗi khi cập nhật sức chứa!');
    } finally {
      setIsUpdatingCapacity(false);
    }
  };

  // Thao tác: Đóng / Mở slot
  const handleToggleCloseSlot = async (slot) => {
    const isCurrentlyClosed = slot.maxNumber === slot.currentNumber;
    const actionText = isCurrentlyClosed ? 'mở lại' : 'đóng nhận lịch';

    const isConfirm = window.confirm(
      `Bạn có chắc muốn ${actionText} cho khung giờ ${slot.timeTypeData?.valueVi || slot.timeType}?`
    );
    if (!isConfirm) return;

    try {
      const res = await toggleCloseScheduleSlot(slot.id, isCurrentlyClosed ? false : true);
      if (res && res.errCode === 0) {
        toast.success(res.message);
        fetchSchedules(currentDate);
      } else {
        toast.error(res?.message || 'Lỗi thao tác!');
      }
    } catch (err) {
      toast.error('Lỗi server khi đóng/mở slot!');
    }
  };

  // Thao tác: Xóa slot an toàn
  const handleDeleteSlot = async (slot) => {
    if (slot.currentNumber > 0) {
      toast.error(`Khung giờ này đã có ${slot.currentNumber} bệnh nhân đặt chỗ! Không được phép xóa. Bạn có thể chọn "Đóng nhận lịch".`);
      return;
    }

    const isConfirm = window.confirm(
      `Bạn có chắc chắn muốn xóa khung giờ ${slot.timeTypeData?.valueVi || slot.timeType}?`
    );
    if (!isConfirm) return;

    try {
      const res = await deleteSchedule({ id: slot.id });
      if (res && res.errCode === 0) {
        toast.success('Xóa khung giờ thành công!');
        fetchSchedules(currentDate);
      } else {
        toast.error(res?.message || 'Không thể xóa khung giờ này!');
      }
    } catch (err) {
      toast.error('Lỗi server khi xóa slot!');
    }
  };

  // Render Badge trạng thái Slot
  const renderSlotStatusBadge = (slot) => {
    const status = getSlotStatus(slot);
    switch (status) {
      case 'OPEN':
        return <span className="slot-badge slot-badge--open">🟢 Đang mở</span>;
      case 'NEAR_FULL':
        return <span className="slot-badge slot-badge--near-full">🟠 Gần đầy</span>;
      case 'FULL':
        return <span className="slot-badge slot-badge--full">🔴 Đã đầy</span>;
      case 'CLOSED':
        return <span className="slot-badge slot-badge--closed">⚪ Đã đóng</span>;
      default:
        return null;
    }
  };

  const dateFormatted = moment.utc(currentDate).format('DD/MM/YYYY');
  const dayOfWeekVi = moment.utc(currentDate).locale('vi').format('dddd');
  const isToday = moment.utc(currentDate).isSame(moment.utc(moment().format('YYYY-MM-DD')), 'day');

  const facilityName = doctorProfile?.doctorInfoData?.clinicData?.name || 'Cơ sở khám BookingCare';
  const specialtyName = doctorProfile?.doctorInfoData?.specialtyData?.name || 'Chuyên khoa';

  return (
    <div className="doctor-schedule-workspace-page">
      {/* ────────────────────────────────────────────────────── */}
      {/* 1. TOP HEADER BAR                                      */}
      {/* ────────────────────────────────────────────────────── */}
      <div className="dsw-header">
        <div className="dsw-header-left">
          <div className="dsw-title-row">
            <h1 className="dsw-title">Lịch khám của tôi</h1>
            <span className="dsw-role-badge">Availability & Capacity</span>
          </div>
          <p className="dsw-subtitle">Thiết lập thời gian làm việc và số lượng bệnh nhân có thể tiếp nhận</p>

          <div className="dsw-meta-context">
            <div className="meta-chip">
              <Building2 size={14} className="meta-icon" />
              <span>{facilityName}</span>
            </div>
            <div className="meta-chip">
              <Stethoscope size={14} className="meta-icon" />
              <span>{specialtyName}</span>
            </div>
          </div>
        </div>

        <div className="dsw-header-actions">
          <button
            type="button"
            className="btn-dsw-primary"
            onClick={() => setIsOpenCreateModal(true)}
          >
            <PlusCircle size={18} />
            <span>+ Tạo lịch khám</span>
          </button>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────── */}
      {/* 2. DATE NAVIGATION BAR                                 */}
      {/* ────────────────────────────────────────────────────── */}
      <div className="dsw-date-bar">
        <div className="dsw-date-nav">
          <button
            type="button"
            className="btn-nav-arrow"
            onClick={() => handleStepDay(-1)}
            title="Ngày trước"
          >
            <ChevronLeft size={20} />
          </button>

          <div className="dsw-date-picker-wrapper">
            <CalendarDays size={18} className="icon-calendar" />
            <DatePicker
              className="dsw-date-input"
              selected={new Date(currentDate)}
              onChange={handleOnChangeDatePicker}
              dateFormat="dd/MM/yyyy"
            />
            <span className="dsw-date-label">
              {dayOfWeekVi}, {dateFormatted}
            </span>
          </div>

          <button
            type="button"
            className="btn-nav-arrow"
            onClick={() => handleStepDay(1)}
            title="Ngày sau"
          >
            <ChevronRight size={20} />
          </button>

          {!isToday && (
            <button
              type="button"
              className="btn-jump-today"
              onClick={handleJumpToday}
            >
              Hôm nay
            </button>
          )}
        </div>

        <div className="dsw-bar-right">
          <button
            type="button"
            className="btn-reload"
            onClick={() => fetchSchedules(currentDate)}
            title="Tải lại lịch"
          >
            <RefreshCw size={15} className={isLoading ? 'tw-animate-spin' : ''} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────── */}
      {/* 3. CAPACITY SUMMARY METRIC CARDS                       */}
      {/* ────────────────────────────────────────────────────── */}
      <div className="dsw-summary-cards">
        <div
          className={`dsw-stat-card ${statusFilter === 'ALL' ? 'active' : ''}`}
          onClick={() => setStatusFilter('ALL')}
        >
          <div className="stat-label">Tổng slot</div>
          <div className="stat-val">{counters.totalSlots}</div>
          <div className="stat-sub">Khung giờ trong ngày</div>
        </div>

        <div
          className={`dsw-stat-card stat-open ${statusFilter === 'OPEN' ? 'active' : ''}`}
          onClick={() => setStatusFilter('OPEN')}
        >
          <div className="stat-label">Đang mở</div>
          <div className="stat-val">{counters.openSlots}</div>
          <div className="stat-sub">Sẵn sàng nhận lịch</div>
        </div>

        <div className="dsw-stat-card stat-booked">
          <div className="stat-label">Đã đặt</div>
          <div className="stat-val">{counters.totalBooked}</div>
          <div className="stat-sub">Bệnh nhân đã đăng ký</div>
        </div>

        <div className="dsw-stat-card stat-available">
          <div className="stat-label">Còn trống</div>
          <div className="stat-val">{counters.totalAvailable}</div>
          <div className="stat-sub">Chỗ có thể nhận thêm</div>
        </div>

        <div
          className={`dsw-stat-card stat-full ${statusFilter === 'FULL' ? 'active' : ''}`}
          onClick={() => setStatusFilter('FULL')}
        >
          <div className="stat-label">Đã đầy</div>
          <div className="stat-val">{counters.fullSlots}</div>
          <div className="stat-sub">Hết chỗ nhận</div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────── */}
      {/* 4. MASTER - DETAIL WORKSPACE CONTAINER                 */}
      {/* ────────────────────────────────────────────────────── */}
      <div className="dsw-workspace-grid">
        {/* ── CỘT TRÁI: MASTER SLOT LIST ── */}
        <div className="dsw-master-column">
          <div className="dsw-column-header">
            <span className="col-title">DANH SÁCH SLOT KHÁM</span>
            <span className="col-count">{filteredSlots.length} slot</span>
          </div>

          {isLoading ? (
            <div className="dsw-loading-state">
              <span className="dsw-spinner" />
              <p>Đang tải danh sách khung giờ...</p>
            </div>
          ) : filteredSlots.length > 0 ? (
            <div className="dsw-slot-items">
              {filteredSlots.map((slot) => {
                const isSelected = selectedSlot?.id === slot.id;
                const timeLabel = slot.timeTypeData?.valueVi || slot.timeType;
                const current = slot.currentNumber || 0;
                const max = slot.maxNumber || 10;
                const pct = max > 0 ? Math.min((current / max) * 100, 100) : 0;
                const isClosed = max === current && current === 0;

                return (
                  <div
                    key={slot.id}
                    className={`dsw-slot-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedSlot(slot)}
                  >
                    <div className="slot-top-row">
                      <div className="slot-time-badge">
                        <Clock size={14} />
                        <strong>{timeLabel}</strong>
                      </div>
                      <div>{renderSlotStatusBadge(slot)}</div>
                    </div>

                    <div className="slot-meta-line">
                      <span>{specialtyName}</span>
                      <span>·</span>
                      <span>Khám trực tiếp</span>
                    </div>

                    {/* Capacity Progress Bar */}
                    <div className="slot-capacity-bar-group">
                      <div className="capacity-labels">
                        <span className="cap-count">
                          {current} / {max} chỗ
                        </span>
                        <span className="cap-avail">
                          {max > current ? `Còn ${max - current} chỗ` : 'Hết chỗ'}
                        </span>
                      </div>
                      <div className="progress-track">
                        <div
                          className={`progress-fill ${pct >= 100 ? 'fill-full' : pct >= 80 ? 'fill-near' : 'fill-open'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="dsw-empty-master">
              {schedules.length === 0 ? (
                <>
                  <div className="empty-icon">📅</div>
                  <h4>Chưa có lịch làm việc ngày {dateFormatted}</h4>
                  <p>Bạn chưa mở slot khám nào trong ngày này. Hãy bấm tạo lịch hoặc sao chép từ ngày khác.</p>
                  <div className="empty-actions">
                    <button
                      type="button"
                      className="btn-create-now"
                      onClick={() => setIsOpenCreateModal(true)}
                    >
                      <PlusCircle size={15} /> Tạo lịch ngay
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="empty-icon">🔍</div>
                  <h4>Không có slot nào theo bộ lọc</h4>
                  <button
                    type="button"
                    className="btn-clear-filter"
                    onClick={() => setStatusFilter('ALL')}
                  >
                    Xem tất cả slot
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── CỘT PHẢI: DETAIL PANEL (STICKY SLOT CONTROLS) ── */}
        <div className="dsw-detail-column">
          {selectedSlot ? (
            <div className="dsw-detail-panel">
              {/* Header */}
              <div className="detail-slot-header">
                <div className="dsh-time-group">
                  <div className="clock-icon-box">
                    <Clock size={20} />
                  </div>
                  <div>
                    <h3>{selectedSlot.timeTypeData?.valueVi || selectedSlot.timeType}</h3>
                    <p>{dayOfWeekVi}, {dateFormatted}</p>
                  </div>
                </div>
                <div>{renderSlotStatusBadge(selectedSlot)}</div>
              </div>

              <div className="detail-slot-body">
                {/* Section 1: Thông tin cơ sở & chuyên khoa */}
                <div className="slot-info-box">
                  <div className="info-row">
                    <span className="info-label">Cơ sở khám:</span>
                    <strong className="info-val">{facilityName}</strong>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Chuyên khoa:</span>
                    <strong className="info-val">{specialtyName}</strong>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Hình thức:</span>
                    <span className="type-pill">Khám trực tiếp tại phòng khám</span>
                  </div>
                </div>

                {/* Section 2: Năng lực tiếp nhận (Capacity Adjustment) */}
                <div className="capacity-control-card">
                  <div className="cc-header">
                    <Users size={16} />
                    <h4>Sức chứa & Tiếp nhận bệnh nhân</h4>
                  </div>

                  <div className="cc-metric-row">
                    <div className="metric-box">
                      <label>Đã đặt chỗ</label>
                      <strong className="text-booked">{selectedSlot.currentNumber || 0}</strong>
                    </div>
                    <div className="metric-box">
                      <label>Sức chứa tối đa</label>
                      <strong className="text-max">{selectedSlot.maxNumber || 10}</strong>
                    </div>
                    <div className="metric-box">
                      <label>Còn trống</label>
                      <strong className="text-avail">
                        {Math.max(0, (selectedSlot.maxNumber || 10) - (selectedSlot.currentNumber || 0))}
                      </strong>
                    </div>
                  </div>

                  {/* Sức chứa stepper input */}
                  <div className="stepper-action-row">
                    <label>Điều chỉnh sức chứa:</label>
                    <div className="stepper-controls">
                      <button
                        type="button"
                        className="btn-step"
                        onClick={() => {
                          const nextVal = Math.max(selectedSlot.currentNumber || 0, editCapacityVal - 1);
                          setEditCapacityVal(nextVal);
                        }}
                        disabled={editCapacityVal <= (selectedSlot.currentNumber || 0)}
                        title="Giảm sức chứa"
                      >
                        <Minus size={15} />
                      </button>

                      <input
                        type="number"
                        className="stepper-input"
                        value={editCapacityVal}
                        min={selectedSlot.currentNumber || 0}
                        max={50}
                        onChange={(e) => setEditCapacityVal(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      />

                      <button
                        type="button"
                        className="btn-step"
                        onClick={() => setEditCapacityVal(editCapacityVal + 1)}
                        title="Tăng sức chứa"
                      >
                        <Plus size={15} />
                      </button>

                      {editCapacityVal !== selectedSlot.maxNumber && (
                        <button
                          type="button"
                          className="btn-apply-capacity"
                          disabled={isUpdatingCapacity}
                          onClick={() => handleUpdateCapacity()}
                        >
                          {isUpdatingCapacity ? 'Lưu...' : 'Áp dụng'}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="business-rule-note">
                    <Sparkles size={13} />
                    <span>
                      Quy tắc an toàn: Không thể giảm sức chứa xuống dưới{' '}
                      <strong>{selectedSlot.currentNumber || 0}</strong> chỗ để bảo vệ lịch hẹn của bệnh nhân đã đặt trước.
                    </span>
                  </div>
                </div>

                {/* Section 3: Danh sách Bệnh nhân đã đặt chỗ trong Slot */}
                <div className="slot-bookings-section">
                  <div className="sbs-header">
                    <div className="sbs-title">
                      <CalendarDays size={16} />
                      <h4>Danh sách đặt lịch ({selectedSlot.slotBookings?.length || 0})</h4>
                    </div>
                    <button
                      type="button"
                      className="btn-go-appointments"
                      onClick={() => navigate('/doctor-dashboard/manage-patient')}
                    >
                      <span>Mở Lịch khám</span>
                      <ExternalLink size={13} />
                    </button>
                  </div>

                  {selectedSlot.slotBookings && selectedSlot.slotBookings.length > 0 ? (
                    <div className="bookings-mini-list">
                      {selectedSlot.slotBookings.map((bk, idx) => {
                        const bName =
                          bk.patientName ||
                          `${bk.patientData?.lastName || ''} ${bk.patientData?.firstName || ''}`.trim() ||
                          'Bệnh nhân';
                        const bPhone = bk.patientPhoneNumber || bk.patientData?.phoneNumber || '--';

                        return (
                          <div key={bk.id || idx} className="booking-mini-item">
                            <div className="bmi-left">
                              <div className="bmi-avatar">
                                <User size={14} />
                              </div>
                              <div className="bmi-info">
                                <strong>{bName}</strong>
                                <span className="bmi-phone">
                                  <Phone size={11} /> {bPhone}
                                </span>
                              </div>
                            </div>
                            <div className="bmi-right">
                              <span className="bmi-code">#BK-{bk.id}</span>
                              <span className={`bmi-status ${bk.statusId === 'S2' ? 'status-confirmed' : bk.statusId === 'S3' ? 'status-done' : 'status-pending'}`}>
                                {bk.statusId === 'S2' ? 'Đã xác nhận' : bk.statusId === 'S3' ? 'Đã khám' : 'Chờ xác nhận'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="no-bookings-hint">
                      <p>Khung giờ này hiện chưa có bệnh nhân nào đặt lịch.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Slot Action Footer */}
              <div className="detail-slot-footer">
                <div className="dsf-left">
                  <button
                    type="button"
                    className="btn-delete-slot"
                    onClick={() => handleDeleteSlot(selectedSlot)}
                    disabled={(selectedSlot.currentNumber || 0) > 0}
                    title={
                      (selectedSlot.currentNumber || 0) > 0
                        ? 'Khung giờ đã có người đặt, không thể xóa'
                        : 'Xóa khung giờ này'
                    }
                  >
                    <Trash2 size={15} />
                    <span>Xóa slot</span>
                  </button>
                </div>

                <div className="dsf-right">
                  <button
                    type="button"
                    className={`btn-toggle-slot ${selectedSlot.maxNumber === selectedSlot.currentNumber ? 'btn-open-slot' : 'btn-close-slot'}`}
                    onClick={() => handleToggleCloseSlot(selectedSlot)}
                  >
                    {selectedSlot.maxNumber === selectedSlot.currentNumber ? (
                      <>
                        <Unlock size={15} />
                        <span>Mở lại nhận lịch</span>
                      </>
                    ) : (
                      <>
                        <Lock size={15} />
                        <span>Đóng nhận lịch</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="dsw-no-selection">
              <div className="no-sel-icon">👈</div>
              <h3>Chọn một khung giờ để xem chi tiết</h3>
              <p>Nhấp vào một khung giờ bên trái để quản lý năng lực tiếp nhận hoặc xem danh sách bệnh nhân đã đặt.</p>
            </div>
          )}
        </div>
      </div>

      {/* ────────────────────────────────────────────────────── */}
      {/* 5. MODAL TẠO LỊCH 3-IN-1                               */}
      {/* ────────────────────────────────────────────────────── */}
      {isOpenCreateModal && (
        <CreateScheduleModal
          isOpen={isOpenCreateModal}
          onClose={() => setIsOpenCreateModal(false)}
          doctorId={userInfo?.id}
          initialDate={currentDate}
          onSaved={() => fetchSchedules(currentDate)}
        />
      )}
    </div>
  );
};

export default DoctorScheduleWorkspace;
