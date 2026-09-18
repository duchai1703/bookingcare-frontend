// src/containers/System/Doctor/ManagePatient.jsx
// [Doctor Workspace Redesign] Lịch khám lâm sàng — Kiến trúc Master - Detail, Smart QR Check-in, Advanced Filter & Sort
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import moment from 'moment';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

import { getListPatientForDoctor, cancelBooking } from '../../../services/doctorService';
import { processLogout } from '../../../redux/slices/userSlice';
import { LANGUAGES, BOOKING_STATUS } from '../../../utils/constants';
import RemedyModal from './RemedyModal';
import MedicalInfoModal from './MedicalInfoModal';
import AppointmentScannerModal from './AppointmentScannerModal';

import {
  CalendarDays,
  QrCode,
  Search,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  User,
  Phone,
  MapPin,
  Clock,
  Calendar,
  CreditCard,
  FileText,
  Stethoscope,
  Send,
  XCircle,
  PlusCircle,
  Sparkles,
  Paperclip,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Eye,
  FileCheck,
} from 'lucide-react';

import './ManagePatient.scss';

const ManagePatient = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const intl = useIntl();
  const { userInfo } = useSelector((state) => state.user);
  const language = useSelector((state) => state.app.language);

  // ===== DATE STATE (UTC Midnight bullet-proof) =====
  const [currentDate, setCurrentDate] = useState(() => {
    return moment.utc(moment().format('YYYY-MM-DD')).valueOf();
  });

  // ===== DATA & FILTER STATE =====
  const [dataPatient, setDataPatient] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Active status filter: 'ALL' | 'S1' | 'S2' | 'S3' | 'S4'
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Search keyword (Patient name, Phone, #BK-id)
  const [searchKeyword, setSearchKeyword] = useState('');

  // Payment filter: 'ALL' | 'PAID' | 'UNPAID'
  const [paymentFilter, setPaymentFilter] = useState('ALL');

  // Sort criteria: 'time_asc' | 'time_desc' | 'name_asc' | 'id_asc'
  const [sortBy, setSortBy] = useState('time_asc');

  // View mode: 'timeline' | 'table'
  const [viewMode, setViewMode] = useState('timeline');

  // Selected Booking for Detail Panel
  const [selectedBooking, setSelectedBooking] = useState(null);

  // Modals state
  const [isOpenScanner, setIsOpenScanner] = useState(false);
  const [isOpenRemedyModal, setIsOpenRemedyModal] = useState(false);
  const [dataRemedyModal, setDataRemedyModal] = useState({});
  const [medicalModal, setMedicalModal] = useState(null);

  // ===== FETCH PATIENT LIST (Luôn lấy statusId='ALL' để tính counters đầy đủ) =====
  const fetchPatientList = useCallback(async (dateTimestamp) => {
    if (!userInfo?.id) return;
    setIsLoading(true);
    try {
      const res = await getListPatientForDoctor(userInfo.id, dateTimestamp, 'ALL');
      if (res && res.errCode === 0) {
        const list = res.data || [];
        setDataPatient(list);

        // Auto select first item if none or old selection not in new list
        setSelectedBooking((prev) => {
          if (!prev && list.length > 0) return list[0];
          const exists = list.find((b) => b.id === prev?.id);
          return exists || (list.length > 0 ? list[0] : null);
        });
      } else {
        setDataPatient([]);
        setSelectedBooking(null);
      }
    } catch (err) {
      if (err.response?.status === 401) {
        toast.error('Phiên đăng nhập đã hết hạn! Vui lòng đăng nhập lại.');
        dispatch(processLogout());
        return;
      }
      toast.error('Lỗi khi tải danh sách lịch khám!');
    } finally {
      setIsLoading(false);
    }
  }, [userInfo?.id, dispatch]);

  useEffect(() => {
    fetchPatientList(currentDate);
  }, [currentDate, fetchPatientList]);

  // ===== DATE STEPPING =====
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

  // ===== APPOINTMENT SUMMARY COUNTERS =====
  const counters = useMemo(() => {
    const total = dataPatient.length;
    const s1 = dataPatient.filter((b) => b.statusId === 'S1').length;
    const s2 = dataPatient.filter((b) => b.statusId === 'S2').length;
    const s3 = dataPatient.filter((b) => b.statusId === 'S3').length;
    const s4 = dataPatient.filter((b) => b.statusId === 'S4').length;
    return { total, s1, s2, s3, s4 };
  }, [dataPatient]);

  // ===== FILTER & SORT PIPELINE =====
  const filteredAndSortedList = useMemo(() => {
    let list = [...dataPatient];

    // 1. Filter by Status
    if (statusFilter !== 'ALL') {
      list = list.filter((b) => b.statusId === statusFilter);
    }

    // 2. Filter by Payment
    if (paymentFilter === 'PAID') {
      list = list.filter((b) => b.paymentStatus === 'paid');
    } else if (paymentFilter === 'UNPAID') {
      list = list.filter((b) => b.paymentStatus !== 'paid');
    }

    // 3. Search keyword
    if (searchKeyword.trim()) {
      const q = searchKeyword.toLowerCase().trim();
      list = list.filter((b) => {
        const name = (b.patientName || `${b.patientData?.lastName || ''} ${b.patientData?.firstName || ''}`).toLowerCase();
        const phone = (b.patientPhoneNumber || b.patientData?.phoneNumber || '').toLowerCase();
        const code = `bk-${b.id}`.toLowerCase();
        const rawId = String(b.id);
        return name.includes(q) || phone.includes(q) || code.includes(q) || rawId === q;
      });
    }

    // 4. Sorting
    list.sort((a, b) => {
      if (sortBy === 'time_asc') {
        return (a.timeType || '').localeCompare(b.timeType || '') || a.id - b.id;
      }
      if (sortBy === 'time_desc') {
        return (b.timeType || '').localeCompare(a.timeType || '') || b.id - a.id;
      }
      if (sortBy === 'name_asc') {
        const nameA = a.patientName || a.patientData?.firstName || '';
        const nameB = b.patientName || b.patientData?.firstName || '';
        return nameA.localeCompare(nameB);
      }
      if (sortBy === 'id_asc') {
        return a.id - b.id;
      }
      return 0;
    });

    return list;
  }, [dataPatient, statusFilter, paymentFilter, searchKeyword, sortBy]);

  // Update selected booking if current selection is not in filtered list
  useEffect(() => {
    if (filteredAndSortedList.length > 0) {
      const stillThere = filteredAndSortedList.find((b) => b.id === selectedBooking?.id);
      if (!stillThere) {
        setSelectedBooking(filteredAndSortedList[0]);
      }
    } else {
      setSelectedBooking(null);
    }
  }, [filteredAndSortedList]);

  // ===== SMART CHECK-IN SELECT FROM SCANNER =====
  const handleScannerSelect = (scannedBooking) => {
    if (!scannedBooking) return;
    // Kiểm tra nếu booking ngày khác, đổi sang ngày đó
    if (scannedBooking.date) {
      const bDateStr = moment(scannedBooking.date).format('YYYY-MM-DD');
      const bTimestamp = moment.utc(bDateStr).valueOf();
      if (bTimestamp !== currentDate) {
        setCurrentDate(bTimestamp);
        toast.info(`Đã chuyển sang ngày hẹn: ${moment(scannedBooking.date).format('DD/MM/YYYY')}`);
      }
    }
    // Set status filter về ALL để hiển thị ca này
    setStatusFilter('ALL');
    setSearchKeyword(`BK-${scannedBooking.id}`);
    setSelectedBooking(scannedBooking);
  };

  // ===== HỦY LỊCH HẸN =====
  const handleCancelBooking = async (booking) => {
    const patientName = booking.patientName || booking.patientData?.firstName || 'bệnh nhân';
    const isConfirm = window.confirm(
      `Bạn có chắc chắn muốn hủy lịch hẹn #${booking.id} của ${patientName}?`
    );
    if (!isConfirm) return;

    try {
      const res = await cancelBooking(booking.id, {});
      if (res && res.errCode === 0) {
        toast.success('Hủy lịch hẹn thành công!');
        fetchPatientList(currentDate);
      } else {
        toast.error(res?.message || 'Không thể hủy lịch!');
      }
    } catch (err) {
      toast.error('Lỗi khi thực hiện hủy lịch hẹn!');
    }
  };

  // ===== HELPER: RENDER STATUS BADGE =====
  const renderStatusBadge = (statusId) => {
    switch (statusId) {
      case 'S1':
        return <span className="dw-badge dw-badge--pending">⏳ Chờ xác nhận</span>;
      case 'S2':
        return <span className="dw-badge dw-badge--confirmed">🟢 Đã xác nhận</span>;
      case 'S3':
        return <span className="dw-badge dw-badge--done">✅ Đã khám xong</span>;
      case 'S4':
        return <span className="dw-badge dw-badge--cancelled">🚫 Đã hủy</span>;
      default:
        return <span className="dw-badge">{statusId}</span>;
    }
  };

  // Format date display
  const dateFormatted = moment.utc(currentDate).format('DD/MM/YYYY');
  const dayOfWeekVi = moment.utc(currentDate).locale('vi').format('dddd');
  const isToday = moment.utc(currentDate).isSame(moment.utc(moment().format('YYYY-MM-DD')), 'day');

  return (
    <div className="doctor-workspace-page">
      {/* ────────────────────────────────────────────────────── */}
      {/* 1. TOP HEADER BAR                                      */}
      {/* ────────────────────────────────────────────────────── */}
      <div className="dw-header">
        <div className="dw-header-left">
          <div className="dw-title-row">
            <h1 className="dw-title">Lịch khám</h1>
            <span className="dw-role-badge">Doctor Workspace</span>
          </div>
          <p className="dw-subtitle">Quản lý ca khám bệnh, tiếp nhận nhanh và ghi nhận lâm sàng</p>
        </div>

        <div className="dw-header-actions">
          <button
            type="button"
            className="btn-dw-secondary"
            onClick={() => navigate('/doctor-dashboard/manage-schedule')}
            title="Tạo thêm khung giờ làm việc"
          >
            <PlusCircle size={16} />
            <span>Thiết lập lịch</span>
          </button>

          <button
            type="button"
            className="btn-dw-primary btn-pulse"
            onClick={() => setIsOpenScanner(true)}
            title="Quét mã QR hoặc tra cứu mã khám #BK-xxx"
          >
            <QrCode size={18} />
            <span>Quét mã tiếp nhận</span>
          </button>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────── */}
      {/* 2. DATE NAVIGATION & VIEW SWITCHER                      */}
      {/* ────────────────────────────────────────────────────── */}
      <div className="dw-date-bar">
        <div className="dw-date-nav">
          <button
            type="button"
            className="btn-nav-arrow"
            onClick={() => handleStepDay(-1)}
            title="Ngày trước"
          >
            <ChevronLeft size={20} />
          </button>

          <div className="dw-date-picker-wrapper">
            <CalendarDays size={18} className="icon-calendar" />
            <DatePicker
              className="dw-date-input"
              selected={new Date(currentDate)}
              onChange={handleOnChangeDatePicker}
              dateFormat="dd/MM/yyyy"
            />
            <span className="dw-date-label">
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

        {/* View Switcher */}
        <div className="dw-view-switcher">
          <button
            type="button"
            className={`btn-view-opt ${viewMode === 'timeline' ? 'active' : ''}`}
            onClick={() => setViewMode('timeline')}
          >
            <Clock size={16} />
            <span>Timeline</span>
          </button>
          <button
            type="button"
            className={`btn-view-opt ${viewMode === 'table' ? 'active' : ''}`}
            onClick={() => setViewMode('table')}
          >
            <FileText size={16} />
            <span>Danh sách</span>
          </button>
          <button
            type="button"
            className="btn-reload"
            onClick={() => fetchPatientList(currentDate)}
            title="Tải lại dữ liệu"
          >
            <RefreshCw size={15} className={isLoading ? 'tw-animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────── */}
      {/* 3. APPOINTMENT SUMMARY METRIC CARDS                    */}
      {/* ────────────────────────────────────────────────────── */}
      <div className="dw-summary-cards">
        <div
          className={`dw-stat-card ${statusFilter === 'ALL' ? 'active' : ''}`}
          onClick={() => setStatusFilter('ALL')}
        >
          <div className="stat-label">Hôm nay</div>
          <div className="stat-val">{counters.total}</div>
          <div className="stat-sub">Tổng lịch khám</div>
        </div>

        <div
          className={`dw-stat-card stat-pending ${statusFilter === 'S1' ? 'active' : ''}`}
          onClick={() => setStatusFilter('S1')}
        >
          <div className="stat-label">Đang chờ</div>
          <div className="stat-val">{counters.s1}</div>
          <div className="stat-sub">Chờ xác nhận</div>
        </div>

        <div
          className={`dw-stat-card stat-confirmed ${statusFilter === 'S2' ? 'active' : ''}`}
          onClick={() => setStatusFilter('S2')}
        >
          <div className="stat-label">Đã xác nhận</div>
          <div className="stat-val">{counters.s2}</div>
          <div className="stat-sub">Sẵn sàng tiếp nhận</div>
        </div>

        <div
          className={`dw-stat-card stat-done ${statusFilter === 'S3' ? 'active' : ''}`}
          onClick={() => setStatusFilter('S3')}
        >
          <div className="stat-label">Đã khám</div>
          <div className="stat-val">{counters.s3}</div>
          <div className="stat-sub">Đã hoàn tất ca</div>
        </div>

        <div
          className={`dw-stat-card stat-cancelled ${statusFilter === 'S4' ? 'active' : ''}`}
          onClick={() => setStatusFilter('S4')}
        >
          <div className="stat-label">Đã hủy</div>
          <div className="stat-val">{counters.s4}</div>
          <div className="stat-sub">Vắng / Hủy ca</div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────── */}
      {/* 4. UNIVERSAL SEARCH & FILTER TOOLBAR                   */}
      {/* ────────────────────────────────────────────────────── */}
      <div className="dw-toolbar">
        <div className="dw-search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Tìm tên bệnh nhân, số điện thoại, #BK-xxx..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
          />
          {searchKeyword && (
            <button
              type="button"
              className="btn-clear-search"
              onClick={() => setSearchKeyword('')}
            >
              ×
            </button>
          )}
        </div>

        <div className="dw-filter-group">
          {/* Thanh toán filter */}
          <div className="dw-select-wrapper">
            <CreditCard size={15} className="select-icon" />
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
            >
              <option value="ALL">Tất cả thanh toán</option>
              <option value="PAID">Đã thanh toán (Online)</option>
              <option value="UNPAID">Chưa thanh toán</option>
            </select>
          </div>

          {/* Sắp xếp */}
          <div className="dw-select-wrapper">
            <ArrowUpDown size={15} className="select-icon" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="time_asc">Giờ khám: Sớm → Muộn</option>
              <option value="time_desc">Giờ khám: Muộn → Sớm</option>
              <option value="name_asc">Tên bệnh nhân: A → Z</option>
              <option value="id_asc">Mã lịch: Tăng dần</option>
            </select>
          </div>

          {(statusFilter !== 'ALL' || paymentFilter !== 'ALL' || searchKeyword) && (
            <button
              type="button"
              className="btn-reset-filters"
              onClick={() => {
                setStatusFilter('ALL');
                setPaymentFilter('ALL');
                setSearchKeyword('');
              }}
              title="Xóa bộ lọc"
            >
              Xóa lọc
            </button>
          )}
        </div>
      </div>

      {/* ────────────────────────────────────────────────────── */}
      {/* 5. MASTER - DETAIL WORKSPACE CONTAINER                 */}
      {/* ────────────────────────────────────────────────────── */}
      <div className="dw-workspace-grid">
        {/* ── CỘT TRÁI: MASTER LIST (TIMELINE / LIST) ── */}
        <div className="dw-master-column">
          <div className="dw-column-header">
            <span className="col-title">DANH SÁCH LỊCH HẸN</span>
            <span className="col-count">{filteredAndSortedList.length} ca</span>
          </div>

          {isLoading ? (
            <div className="dw-loading-state">
              <span className="dw-spinner" />
              <p>Đang tải danh sách lịch khám...</p>
            </div>
          ) : filteredAndSortedList.length > 0 ? (
            <div className="dw-appointment-items">
              {filteredAndSortedList.map((item) => {
                const isSelected = selectedBooking?.id === item.id;
                const pName =
                  item.patientName ||
                  `${item.patientData?.lastName || ''} ${item.patientData?.firstName || ''}`.trim() ||
                  'Bệnh nhân';
                const timeStr = item.timeTypeBooking?.valueVi || item.timeType || '—';
                const isPaid = item.paymentStatus === 'paid';

                return (
                  <div
                    key={item.id}
                    className={`dw-appointment-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedBooking(item)}
                  >
                    <div className="card-top-row">
                      <span className="time-badge">
                        <Clock size={13} /> {timeStr}
                      </span>
                      <span className="code-badge">#BK-{item.id}</span>
                    </div>

                    <div className="patient-name-row">
                      <strong>{pName}</strong>
                      {item.patientData?.genderData && (
                        <span className="gender-tag">
                          {language === LANGUAGES.VI
                            ? item.patientData.genderData.valueVi
                            : item.patientData.genderData.valueEn}
                        </span>
                      )}
                    </div>

                    {item.reason && (
                      <p className="card-reason" title={item.reason}>
                        {item.reason}
                      </p>
                    )}

                    <div className="card-bottom-row">
                      <div className="status-cell">{renderStatusBadge(item.statusId)}</div>
                      <span className={`payment-dot ${isPaid ? 'paid' : 'unpaid'}`} title={isPaid ? 'Đã thanh toán' : 'Chưa thanh toán'}>
                        {isPaid ? '✓ Đã thanh toán' : '⏳ Chưa TT'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="dw-empty-master">
              {dataPatient.length === 0 ? (
                <>
                  <div className="empty-icon">📅</div>
                  <h4>Chưa có lịch khám trong ngày này</h4>
                  <p>Bạn chưa có ca khám nào được đặt vào {dateFormatted}.</p>
                  <button
                    type="button"
                    className="btn-create-schedule-link"
                    onClick={() => navigate('/doctor-dashboard/manage-schedule')}
                  >
                    + Thiết lập lịch khám
                  </button>
                </>
              ) : (
                <>
                  <div className="empty-icon">🔍</div>
                  <h4>Không tìm thấy kết quả phù hợp</h4>
                  <p>Hãy thử thay đổi từ khóa tìm kiếm hoặc bỏ bớt tiêu chí lọc.</p>
                  <button
                    type="button"
                    className="btn-reset-filters-link"
                    onClick={() => {
                      setStatusFilter('ALL');
                      setPaymentFilter('ALL');
                      setSearchKeyword('');
                    }}
                  >
                    Xóa tất cả bộ lọc
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── CỘT PHẢI: DETAIL PANEL (STICKY CLINICAL WORKSPACE) ── */}
        <div className="dw-detail-column">
          {selectedBooking ? (
            <div className="dw-detail-panel">
              {/* Panel Header */}
              <div className="detail-header">
                <div className="dh-left">
                  <span className="dh-code">#BK-{selectedBooking.id}</span>
                  <div className="dh-time-group">
                    <Clock size={15} />
                    <span>
                      {selectedBooking.timeTypeBooking?.valueVi || selectedBooking.timeType} · {dateFormatted}
                    </span>
                  </div>
                </div>
                <div>{renderStatusBadge(selectedBooking.statusId)}</div>
              </div>

              <div className="detail-body">
                {/* 1. THÔNG TIN BỆNH NHÂN */}
                <div className="detail-section">
                  <div className="sec-header">
                    <User size={16} className="sec-icon" />
                    <h4>Thông tin bệnh nhân</h4>
                  </div>
                  <div className="sec-grid">
                    <div className="sec-item">
                      <label>Họ và tên</label>
                      <strong>
                        {selectedBooking.patientName ||
                          `${selectedBooking.patientData?.lastName || ''} ${selectedBooking.patientData?.firstName || ''}`.trim() ||
                          'Chưa cập nhật'}
                      </strong>
                    </div>

                    <div className="sec-item">
                      <label>Số điện thoại</label>
                      <span className="phone-val">
                        <Phone size={13} />
                        {selectedBooking.patientPhoneNumber ||
                          selectedBooking.patientData?.phoneNumber ||
                          'Chưa cung cấp'}
                      </span>
                    </div>

                    <div className="sec-item">
                      <label>Giới tính</label>
                      <span>
                        {selectedBooking.genderBookingData?.valueVi ||
                          selectedBooking.patientData?.genderData?.valueVi ||
                          '—'}
                      </span>
                    </div>

                    <div className="sec-item">
                      <label>Địa chỉ</label>
                      <span className="address-val">
                        <MapPin size={13} />
                        {selectedBooking.patientAddress ||
                          selectedBooking.patientData?.address ||
                          'Chưa cập nhật'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. THÔNG TIN ĐẶT LỊCH & THANH TOÁN */}
                <div className="detail-section">
                  <div className="sec-header">
                    <CreditCard size={16} className="sec-icon" />
                    <h4>Thông tin đặt khám & Tài chính</h4>
                  </div>
                  <div className="sec-grid">
                    <div className="sec-item full-col">
                      <label>Lý do khám bệnh</label>
                      <div className="reason-bubble">
                        {selectedBooking.reason || 'Bệnh nhân không để lại ghi chú.'}
                      </div>
                    </div>

                    <div className="sec-item">
                      <label>Hình thức</label>
                      <span className="tag-inperson">Khám trực tiếp tại cơ sở</span>
                    </div>

                    <div className="sec-item">
                      <label>Trạng thái thanh toán</label>
                      <span className={`payment-pill ${selectedBooking.paymentStatus === 'paid' ? 'paid' : 'unpaid'}`}>
                        {selectedBooking.paymentStatus === 'paid'
                          ? '✓ Đã thanh toán trực tuyến'
                          : '⏳ Thanh toán tại phòng khám'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. HỒ SƠ LÂM SÀNG & TỆP ĐÍNH KÈM (Nếu có) */}
                {(selectedBooking.symptoms ||
                  selectedBooking.diagnosis ||
                  selectedBooking.clinicalNotes ||
                  selectedBooking.careInstructions ||
                  selectedBooking.clinicalAttachments) && (
                  <div className="detail-section clinical-summary-box">
                    <div className="sec-header">
                      <FileCheck size={16} className="sec-icon" />
                      <h4>Hồ sơ lâm sàng đã ghi nhận</h4>
                    </div>

                    {selectedBooking.symptoms && (
                      <div className="clinical-row">
                        <label>Triệu chứng ban đầu:</label>
                        <p>{selectedBooking.symptoms}</p>
                      </div>
                    )}

                    {selectedBooking.diagnosis && (
                      <div className="clinical-row">
                        <label>Chẩn đoán:</label>
                        <p className="diagnosis-text">{selectedBooking.diagnosis}</p>
                      </div>
                    )}

                    {selectedBooking.careInstructions && (
                      <div className="clinical-row">
                        <label>Dặn dò & Tái khám:</label>
                        <p>{selectedBooking.careInstructions}</p>
                      </div>
                    )}

                    {/* Tệp đính kèm cận lâm sàng */}
                    {selectedBooking.clinicalAttachments && (
                      <div className="clinical-row">
                        <label>
                          <Paperclip size={13} /> Tài liệu cận lâm sàng (
                          {Array.isArray(selectedBooking.clinicalAttachments)
                            ? selectedBooking.clinicalAttachments.length
                            : 0}{' '}
                          tệp)
                        </label>
                        <div className="attachments-mini-list">
                          {Array.isArray(selectedBooking.clinicalAttachments) &&
                            selectedBooking.clinicalAttachments.map((att, idx) => (
                              <span key={idx} className="att-mini-chip">
                                📎 {att.name || `Tệp ${idx + 1}`}
                              </span>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ────────────────────────────────────────────────────── */}
              {/* CONTEXTUAL QUICK ACTIONS (Phụ thuộc trạng thái)        */}
              {/* ────────────────────────────────────────────────────── */}
              <div className="detail-footer-actions">
                {/* Trạng thái S1: Chờ xác nhận */}
                {selectedBooking.statusId === 'S1' && (
                  <div className="actions-cluster">
                    <button
                      type="button"
                      className="btn-action-cancel"
                      onClick={() => handleCancelBooking(selectedBooking)}
                    >
                      <XCircle size={15} />
                      <span>Hủy lịch</span>
                    </button>
                    <button
                      type="button"
                      className="btn-action-start"
                      onClick={() => setMedicalModal(selectedBooking)}
                    >
                      <Stethoscope size={16} />
                      <span>Tiếp nhận & Khám bệnh</span>
                    </button>
                  </div>
                )}

                {/* Trạng thái S2: Đã xác nhận (Sẵn sàng khám) */}
                {selectedBooking.statusId === 'S2' && (
                  <div className="actions-cluster">
                    <button
                      type="button"
                      className="btn-action-cancel"
                      onClick={() => handleCancelBooking(selectedBooking)}
                      title="Hủy lịch hẹn"
                    >
                      <XCircle size={15} />
                      <span>Hủy lịch</span>
                    </button>

                    <button
                      type="button"
                      className="btn-action-remedy"
                      onClick={() => {
                        setDataRemedyModal(selectedBooking);
                        setIsOpenRemedyModal(true);
                      }}
                      title="Gửi hóa đơn và kết quả qua email"
                    >
                      <Send size={15} />
                      <span>Gửi kết quả (Email)</span>
                    </button>

                    <button
                      type="button"
                      className="btn-action-start"
                      onClick={() => setMedicalModal(selectedBooking)}
                      title="Ghi nhận triệu chứng, chẩn đoán, kê đơn và tải file xét nghiệm"
                    >
                      <Stethoscope size={16} />
                      <span>Bắt đầu phiên khám</span>
                    </button>
                  </div>
                )}

                {/* Trạng thái S3: Đã khám xong */}
                {selectedBooking.statusId === 'S3' && (
                  <div className="actions-cluster">
                    <button
                      type="button"
                      className="btn-action-remedy"
                      onClick={() => {
                        setDataRemedyModal(selectedBooking);
                        setIsOpenRemedyModal(true);
                      }}
                    >
                      <Send size={15} />
                      <span>Gửi lại kết quả</span>
                    </button>

                    <button
                      type="button"
                      className="btn-action-view-history"
                      onClick={() => setMedicalModal(selectedBooking)}
                    >
                      <Eye size={16} />
                      <span>Xem / Sửa hồ sơ khám</span>
                    </button>
                  </div>
                )}

                {/* Trạng thái S4: Đã hủy */}
                {selectedBooking.statusId === 'S4' && (
                  <div className="cancelled-notice">
                    <AlertTriangle size={16} />
                    <span>Lịch hẹn này đã bị hủy. Không thể thực hiện thao tác khám.</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="dw-no-selection">
              <div className="no-sel-icon">👈</div>
              <h3>Chọn một lịch hẹn để xem chi tiết</h3>
              <p>Nhấp vào một ca khám từ danh sách bên trái hoặc quét mã QR tiếp nhận để bắt đầu phiên làm việc.</p>
            </div>
          )}
        </div>
      </div>

      {/* ────────────────────────────────────────────────────── */}
      {/* 6. MODALS                                              */}
      {/* ────────────────────────────────────────────────────── */}
      {/* Scanner & Quick Check-in Modal */}
      {isOpenScanner && (
        <AppointmentScannerModal
          isOpen={isOpenScanner}
          onClose={() => setIsOpenScanner(false)}
          onSelectBooking={handleScannerSelect}
        />
      )}

      {/* Send Remedy Modal (Email result) */}
      {isOpenRemedyModal && (
        <RemedyModal
          isOpen={isOpenRemedyModal}
          dataModal={dataRemedyModal}
          onClose={() => {
            setIsOpenRemedyModal(false);
            setDataRemedyModal({});
          }}
          onSendSuccess={() => {
            setIsOpenRemedyModal(false);
            fetchPatientList(currentDate);
          }}
        />
      )}

      {/* Medical Info & Clinical Attachments Modal */}
      {medicalModal && (
        <MedicalInfoModal
          booking={medicalModal}
          onClose={() => setMedicalModal(null)}
          onSaved={() => {
            setMedicalModal(null);
            fetchPatientList(currentDate);
          }}
        />
      )}
    </div>
  );
};

export default ManagePatient;
