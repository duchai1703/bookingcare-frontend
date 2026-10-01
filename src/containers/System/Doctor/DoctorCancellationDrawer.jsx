// src/containers/System/Doctor/DoctorCancellationDrawer.jsx
// Drawer Báo bận / Hủy lịch khám chuyên sâu với Cấu trúc phân cấp Tree-Picker 2 cột & Live Impact Preview
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'react-toastify';
import moment from 'moment';
import {
  X,
  Search,
  Trash2,
  Calendar,
  Clock,
  User,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronRight,
  ChevronDown,
  CheckSquare,
  Square,
  MinusSquare,
  Folder,
  FolderOpen,
} from 'lucide-react';
import {
  previewDoctorCancellation,
  executeDoctorCancellation,
} from '../../../services/doctorCancellationService';
import { getScheduleByDateAdmin } from '../../../services/doctorService';
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
  schedules: initialSchedules = [],
  selectedSlot = null,
  onSuccess,
}) => {
  // 1. Quản lý dữ liệu lịch khám đa ngày (Tree Data)
  const [treeData, setTreeData] = useState([]);
  const [isLoadingTree, setIsLoadingTree] = useState(false);

  // 2. Trạng thái Expand / Collapse của cây phân cấp
  const [expandedNodes, setExpandedNodes] = useState(new Set());

  // 3. Search query
  const [searchQuery, setSearchQuery] = useState('');

  // 4. Trạng thái Selection:
  // selectedScheduleIds: Set các ID Schedule (Slot) cần đóng
  // selectedBookingIds: Set các ID Booking (Ca khám của bệnh nhân) cần hủy & hoàn tiền
  const [selectedScheduleIds, setSelectedScheduleIds] = useState(new Set());
  const [selectedBookingIds, setSelectedBookingIds] = useState(new Set());

  // 5. Form state
  const [reason, setReason] = useState('');
  const [previewData, setPreviewData] = useState(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ════════════════════════════════════════════════════════════════════════
  // FETCH LỊCH KHÁM CÁC NGÀY KẾ TIẾP ĐỂ XÂY DỰNG CÂY PHÂN CẤP ĐẦY ĐỦ
  // ════════════════════════════════════════════════════════════════════════
  const loadFullTreeSchedules = useCallback(async () => {
    if (!doctorId) return;
    setIsLoadingTree(true);

    try {
      const baseDate = currentDate ? Number(currentDate) : Date.now();
      // Tải 7 ngày kế tiếp (bao gồm cả ngày hiện tại)
      const dateList = [0, 1, 2, 3, 4, 5, 6].map((offset) => {
        return moment(baseDate).add(offset, 'days').startOf('day').valueOf();
      });

      const promises = dateList.map(async (dTimestamp, index) => {
        // Ngày đầu tiên nếu trùng currentDate và có initialSchedules thì dùng trước
        if (index === 0 && initialSchedules && initialSchedules.length > 0) {
          return {
            dateTimestamp: dTimestamp,
            dateLabel: moment(dTimestamp).format('dddd, DD/MM/YYYY'),
            isToday: moment(dTimestamp).isSame(moment(), 'day'),
            schedules: initialSchedules,
          };
        }

        try {
          const res = await getScheduleByDateAdmin(doctorId, dTimestamp, null);
          const scheds = (res && res.errCode === 0 && Array.isArray(res.data)) ? res.data : [];
          return {
            dateTimestamp: dTimestamp,
            dateLabel: moment(dTimestamp).format('dddd, DD/MM/YYYY'),
            isToday: moment(dTimestamp).isSame(moment(), 'day'),
            schedules: scheds,
          };
        } catch {
          return {
            dateTimestamp: dTimestamp,
            dateLabel: moment(dTimestamp).format('dddd, DD/MM/YYYY'),
            isToday: moment(dTimestamp).isSame(moment(), 'day'),
            schedules: [],
          };
        }
      });

      const results = await Promise.all(promises);
      // Lọc các ngày có lịch khám (hoặc giữ ít nhất ngày hiện tại)
      const validTree = results.filter((day, idx) => idx === 0 || day.schedules.length > 0);
      setTreeData(validTree);

      // Auto expand ngày đầu tiên và slot được chọn (nếu có)
      const initialExpanded = new Set();
      if (validTree.length > 0) {
        const firstDayKey = `day_${validTree[0].dateTimestamp}`;
        initialExpanded.add(firstDayKey);

        validTree[0].schedules.forEach((sch) => {
          initialExpanded.add(`slot_${sch.id}`);
        });
      }
      setExpandedNodes(initialExpanded);

      // Nếu mở drawer từ 1 Slot cụ thể, auto select slot đó
      if (selectedSlot) {
        const newSchedIds = new Set([selectedSlot.id]);
        const newBookIds = new Set();
        if (selectedSlot.slotBookings && Array.isArray(selectedSlot.slotBookings)) {
          selectedSlot.slotBookings.forEach((b) => {
            if (b.statusId !== 'S4') newBookIds.add(b.id);
          });
        }
        setSelectedScheduleIds(newSchedIds);
        setSelectedBookingIds(newBookIds);
      }
    } catch (err) {
      console.error('Error loading tree schedules:', err);
    } finally {
      setIsLoadingTree(false);
    }
  }, [doctorId, currentDate, initialSchedules, selectedSlot]);

  useEffect(() => {
    if (isOpen) {
      loadFullTreeSchedules();
      setReason('');
    } else {
      setSelectedScheduleIds(new Set());
      setSelectedBookingIds(new Set());
      setPreviewData(null);
    }
  }, [isOpen, loadFullTreeSchedules]);

  // ════════════════════════════════════════════════════════════════════════
  // TOGGLE EXPAND / COLLAPSE TREE NODES
  // ════════════════════════════════════════════════════════════════════════
  const toggleExpand = (nodeKey) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeKey)) {
        next.delete(nodeKey);
      } else {
        next.add(nodeKey);
      }
      return next;
    });
  };

  const expandAll = () => {
    const all = new Set();
    treeData.forEach((day) => {
      all.add(`day_${day.dateTimestamp}`);
      day.schedules.forEach((sch) => {
        all.add(`slot_${sch.id}`);
      });
    });
    setExpandedNodes(all);
  };

  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  // ════════════════════════════════════════════════════════════════════════
  // CHECKBOX SELECTION CASCADING LOGIC
  // ════════════════════════════════════════════════════════════════════════

  // Kiểm tra trạng thái chọn của 1 Khung giờ (Slot)
  const getSlotCheckState = useCallback((schedule) => {
    const activeBookings = (schedule.slotBookings || []).filter((b) => b.statusId !== 'S4');
    const isSlotSelected = selectedScheduleIds.has(schedule.id);

    if (activeBookings.length === 0) {
      return isSlotSelected ? 'checked' : 'unchecked';
    }

    const selectedCount = activeBookings.filter((b) => selectedBookingIds.has(b.id)).length;

    if (isSlotSelected || selectedCount === activeBookings.length) {
      return 'checked';
    }
    if (selectedCount > 0) {
      return 'indeterminate';
    }
    return 'unchecked';
  }, [selectedScheduleIds, selectedBookingIds]);

  // Kiểm tra trạng thái chọn của 1 Ngày (Day)
  const getDayCheckState = useCallback((day) => {
    if (!day.schedules || day.schedules.length === 0) return 'unchecked';

    let totalSlots = day.schedules.length;
    let checkedSlots = 0;
    let hasAnyChildChecked = false;

    day.schedules.forEach((sch) => {
      const st = getSlotCheckState(sch);
      if (st === 'checked') {
        checkedSlots += 1;
        hasAnyChildChecked = true;
      } else if (st === 'indeterminate') {
        hasAnyChildChecked = true;
      }
    });

    if (checkedSlots === totalSlots) return 'checked';
    if (hasAnyChildChecked) return 'indeterminate';
    return 'unchecked';
  }, [getSlotCheckState]);

  // Handler: Toggle Bệnh nhân (Booking)
  const handleToggleBooking = (booking, schedule) => {
    const nextBookings = new Set(selectedBookingIds);
    const nextSchedules = new Set(selectedScheduleIds);

    if (nextBookings.has(booking.id)) {
      nextBookings.delete(booking.id);
      // Nếu bỏ chọn bệnh nhân thì slot cha cũng không thể là full-close nữa
      nextSchedules.delete(schedule.id);
    } else {
      nextBookings.add(booking.id);
      // Nếu tất cả bệnh nhân trong slot đều đã được chọn, có thể tự động đóng slot
      const activeBookings = (schedule.slotBookings || []).filter((b) => b.statusId !== 'S4');
      const allSelected = activeBookings.every((b) => nextBookings.has(b.id));
      if (allSelected) {
        nextSchedules.add(schedule.id);
      }
    }

    setSelectedBookingIds(nextBookings);
    setSelectedScheduleIds(nextSchedules);
  };

  // Handler: Toggle Khung giờ (Slot)
  const handleToggleSlot = (schedule) => {
    const currentState = getSlotCheckState(schedule);
    const nextSchedules = new Set(selectedScheduleIds);
    const nextBookings = new Set(selectedBookingIds);
    const activeBookings = (schedule.slotBookings || []).filter((b) => b.statusId !== 'S4');

    if (currentState === 'checked') {
      // Bỏ chọn slot và toàn bộ bệnh nhân của slot
      nextSchedules.delete(schedule.id);
      activeBookings.forEach((b) => nextBookings.delete(b.id));
    } else {
      // Chọn slot và toàn bộ bệnh nhân của slot
      nextSchedules.add(schedule.id);
      activeBookings.forEach((b) => nextBookings.add(b.id));
    }

    setSelectedScheduleIds(nextSchedules);
    setSelectedBookingIds(nextBookings);
  };

  // Handler: Toggle Ngày (Day)
  const handleToggleDay = (day) => {
    const currentState = getDayCheckState(day);
    const nextSchedules = new Set(selectedScheduleIds);
    const nextBookings = new Set(selectedBookingIds);

    if (currentState === 'checked') {
      // Bỏ chọn toàn bộ schedules và bookings trong ngày
      day.schedules.forEach((sch) => {
        nextSchedules.delete(sch.id);
        const activeBookings = (sch.slotBookings || []).filter((b) => b.statusId !== 'S4');
        activeBookings.forEach((b) => nextBookings.delete(b.id));
      });
    } else {
      // Chọn toàn bộ schedules và bookings trong ngày
      day.schedules.forEach((sch) => {
        nextSchedules.add(sch.id);
        const activeBookings = (sch.slotBookings || []).filter((b) => b.statusId !== 'S4');
        activeBookings.forEach((b) => nextBookings.add(b.id));
      });
    }

    setSelectedScheduleIds(nextSchedules);
    setSelectedBookingIds(nextBookings);
  };

  // Xóa sạch toàn bộ lựa chọn (Clear All)
  const handleClearAll = () => {
    setSelectedScheduleIds(new Set());
    setSelectedBookingIds(new Set());
  };

  // Xóa 1 mục cụ thể từ danh sách đã chọn bên phải
  const handleRemoveSelectedItem = (item) => {
    if (item.type === 'BOOKING') {
      const nextBookings = new Set(selectedBookingIds);
      nextBookings.delete(item.id);
      setSelectedBookingIds(nextBookings);

      // Nếu slot cha đang được chọn, gỡ slot cha ra khỏi list full-close
      if (item.scheduleId && selectedScheduleIds.has(item.scheduleId)) {
        const nextSchedules = new Set(selectedScheduleIds);
        nextSchedules.delete(item.scheduleId);
        setSelectedScheduleIds(nextSchedules);
      }
    } else if (item.type === 'SLOT') {
      const nextSchedules = new Set(selectedScheduleIds);
      nextSchedules.delete(item.id);
      setSelectedScheduleIds(nextSchedules);
    }
  };

  // ════════════════════════════════════════════════════════════════════════
  // DANH SÁCH CÁC MỤC ĐÃ CHỌN (RIGHT COLUMN DATA)
  // ════════════════════════════════════════════════════════════════════════
  const selectedItemsList = useMemo(() => {
    const list = [];

    treeData.forEach((day) => {
      day.schedules.forEach((sch) => {
        const timeLabel = sch.timeTypeData?.valueVi || sch.timeType;
        const activeBookings = (sch.slotBookings || []).filter((b) => b.statusId !== 'S4');

        // Thêm các bệnh nhân được chọn
        activeBookings.forEach((b) => {
          if (selectedBookingIds.has(b.id)) {
            list.push({
              key: `booking_${b.id}`,
              type: 'BOOKING',
              id: b.id,
              scheduleId: sch.id,
              name: b.patientName || `Bệnh nhân #${b.id}`,
              phoneNumber: b.patientData?.phoneNumber || b.phoneNumber,
              timeLabel,
              dateLabel: day.dateLabel,
              price: Number(b.bookingPrice) || 0,
            });
          }
        });

        // Nếu slot được chọn nhưng KHÔNG có bệnh nhân nào đặt lịch (Slot trống cần đóng)
        if (selectedScheduleIds.has(sch.id) && activeBookings.length === 0) {
          list.push({
            key: `slot_${sch.id}`,
            type: 'SLOT',
            id: sch.id,
            name: `Khung giờ ${timeLabel} (Trống)`,
            subtitle: 'Đóng khung giờ làm việc',
            timeLabel,
            dateLabel: day.dateLabel,
            price: 0,
          });
        }
      });
    });

    return list;
  }, [treeData, selectedScheduleIds, selectedBookingIds]);

  // ════════════════════════════════════════════════════════════════════════
  // TÌM KIẾM TRÊN CÂY PHÂN CẤP (SEARCH FILTERING)
  // ════════════════════════════════════════════════════════════════════════
  const filteredTreeData = useMemo(() => {
    if (!searchQuery.trim()) return treeData;

    const q = searchQuery.toLowerCase().trim();

    return treeData
      .map((day) => {
        const dayMatches = day.dateLabel.toLowerCase().includes(q);

        const filteredSchedules = day.schedules
          .map((sch) => {
            const timeLabel = (sch.timeTypeData?.valueVi || sch.timeType).toLowerCase();
            const slotMatches = timeLabel.includes(q);

            const filteredBookings = (sch.slotBookings || []).filter((b) => {
              if (b.statusId === 'S4') return false;
              const nameMatches = (b.patientName || '').toLowerCase().includes(q);
              const phoneMatches = (b.patientData?.phoneNumber || b.phoneNumber || '').includes(q);
              return nameMatches || phoneMatches;
            });

            if (slotMatches || filteredBookings.length > 0 || dayMatches) {
              return {
                ...sch,
                slotBookings: slotMatches || dayMatches ? sch.slotBookings : filteredBookings,
              };
            }
            return null;
          })
          .filter(Boolean);

        if (filteredSchedules.length > 0) {
          return {
            ...day,
            schedules: filteredSchedules,
          };
        }
        return null;
      })
      .filter(Boolean);
  }, [treeData, searchQuery]);

  // ════════════════════════════════════════════════════════════════════════
  // LIVE IMPACT PREVIEW (TỰ ĐỘNG DỰ TOÁN KHI LỰA CHỌN THAY ĐỔI)
  // ════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!isOpen || !doctorId) return;

    const schedIds = Array.from(selectedScheduleIds);
    const bookIds = Array.from(selectedBookingIds);

    if (schedIds.length === 0 && bookIds.length === 0) {
      setPreviewData(null);
      return;
    }

    let isMounted = true;
    const fetchPreview = async () => {
      setIsLoadingPreview(true);
      try {
        const payload = {
          doctorId,
          scope: 'BATCH',
          scheduleIds: schedIds,
          bookingIds: bookIds,
        };

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
  }, [isOpen, doctorId, selectedScheduleIds, selectedBookingIds]);

  // ════════════════════════════════════════════════════════════════════════
  // SUBMIT XÁC NHẬN HỦY LỊCH & HOÀN TIỀN
  // ════════════════════════════════════════════════════════════════════════
  const handleConfirmCancel = async () => {
    const schedIds = Array.from(selectedScheduleIds);
    const bookIds = Array.from(selectedBookingIds);

    if (schedIds.length === 0 && bookIds.length === 0) {
      toast.warning('Vui lòng tích chọn ít nhất một ca khám hoặc khung giờ trong cây phân cấp!');
      return;
    }

    if (!reason || reason.trim().length < 5) {
      toast.warning('Vui lòng chọn hoặc nhập lý do bác sĩ bận đột xuất (tối thiểu 5 ký tự)!');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        doctorId,
        scope: 'BATCH',
        scheduleIds: schedIds,
        bookingIds: bookIds,
        reason: reason.trim(),
      };

      const res = await executeDoctorCancellation(payload);
      if (res && res.errCode === 0) {
        toast.success(res.message || 'Hủy lịch khám thành công & Đã tự động hoàn tiền 100% về Ví Bệnh nhân!');
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
      <div className="doc-cancel-drawer doc-cancel-drawer--hierarchical" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="doc-cancel-drawer__header">
          <div className="tw-flex tw-items-center tw-gap-3">
            <div className="doc-cancel-drawer__icon-box">
              <ShieldAlert className="tw-w-6 tw-h-6 tw-text-emerald-600" />
            </div>
            <div>
              <h2 className="doc-cancel-drawer__title">Báo bận / Hủy lịch khám theo phân cấp</h2>
              <p className="doc-cancel-drawer__subtitle">
                Cấu trúc phân cấp Ngày &rarr; Khung giờ &rarr; Bệnh nhân | Tự động hoàn tiền 100% vào Ví điện tử Bệnh nhân
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

        {/* Body Content: 2-Column Hierarchy Layout */}
        <div className="doc-cancel-drawer__body">
          {/* STEP 1: CẤU TRÚC PHÂN CẤP 2 CỘT (MATCHING ZKBio Zlink STYLE) */}
          <div className="hierarchical-picker-container">
            {/* CỘT TRÁI: CÂY PHÂN CẤP (TREE VIEW) */}
            <div className="tree-picker-left-col">
              {/* Search Bar at Top */}
              <div className="tree-search-bar">
                <div className="search-input-wrapper">
                  <Search className="tw-w-4 tw-h-4 search-icon" />
                  <input
                    type="text"
                    className="tree-search-input"
                    placeholder="Tìm kiếm theo tên bệnh nhân, SĐT, khung giờ..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      className="search-clear-btn"
                      onClick={() => setSearchQuery('')}
                    >
                      &times;
                    </button>
                  )}
                  <button type="button" className="btn-search-trigger">
                    Tìm kiếm
                  </button>
                </div>
                <div className="tree-action-links">
                  <button type="button" onClick={expandAll}>Mở rộng</button>
                  <span>|</span>
                  <button type="button" onClick={collapseAll}>Thu gọn</button>
                </div>
              </div>

              {/* Tree Content */}
              <div className="tree-content-viewport">
                {isLoadingTree ? (
                  <div className="tree-loading-state">
                    <Loader2 className="tw-w-6 tw-h-6 tw-animate-spin tw-text-emerald-600" />
                    <span>Đang tải danh sách lịch khám...</span>
                  </div>
                ) : filteredTreeData.length === 0 ? (
                  <div className="tree-empty-state">
                    <AlertCircle className="tw-w-6 tw-h-6 tw-text-slate-400" />
                    <span>Không tìm thấy lịch khám nào phù hợp</span>
                  </div>
                ) : (
                  <div className="tree-nodes-list">
                    {filteredTreeData.map((day) => {
                      const dayKey = `day_${day.dateTimestamp}`;
                      const isDayExpanded = expandedNodes.has(dayKey);
                      const dayCheck = getDayCheckState(day);

                      // Đếm tổng bệnh nhân trong ngày
                      const totalBookingsInDay = day.schedules.reduce((acc, s) => {
                        return acc + (s.slotBookings || []).filter((b) => b.statusId !== 'S4').length;
                      }, 0);

                      return (
                        <div key={dayKey} className="tree-node tree-node--level-1">
                          {/* Dòng Ngày Khám */}
                          <div className="tree-node-row tree-node-row--day">
                            <button
                              type="button"
                              className="node-expand-toggle"
                              onClick={() => toggleExpand(dayKey)}
                            >
                              {isDayExpanded ? (
                                <ChevronDown className="tw-w-4 tw-h-4 text-emerald" />
                              ) : (
                                <ChevronRight className="tw-w-4 tw-h-4 text-slate" />
                              )}
                            </button>

                            <div
                              className="node-checkbox-wrapper"
                              onClick={() => handleToggleDay(day)}
                            >
                              {dayCheck === 'checked' ? (
                                <CheckSquare className="tw-w-4 tw-h-4 checkbox-icon checked" />
                              ) : dayCheck === 'indeterminate' ? (
                                <MinusSquare className="tw-w-4 tw-h-4 checkbox-icon indeterminate" />
                              ) : (
                                <Square className="tw-w-4 tw-h-4 checkbox-icon unchecked" />
                              )}
                            </div>

                            <div
                              className="node-label-box"
                              onClick={() => toggleExpand(dayKey)}
                            >
                              <div className="node-icon-circle node-icon-circle--day">
                                {isDayExpanded ? (
                                  <FolderOpen className="tw-w-3.5 tw-h-3.5 tw-text-emerald-700" />
                                ) : (
                                  <Folder className="tw-w-3.5 tw-h-3.5 tw-text-emerald-700" />
                                )}
                              </div>
                              <span className="node-title">
                                {day.dateLabel} {day.isToday && <span className="today-badge">Hôm nay</span>}
                              </span>
                              <span className="node-badge">
                                {day.schedules.length} slot &bull; {totalBookingsInDay} bệnh nhân
                              </span>
                            </div>
                          </div>

                          {/* Danh sách Khung giờ con (Slots) */}
                          {isDayExpanded && (
                            <div className="tree-children-container">
                              {day.schedules.map((sch) => {
                                const slotKey = `slot_${sch.id}`;
                                const isSlotExpanded = expandedNodes.has(slotKey);
                                const slotCheck = getSlotCheckState(sch);
                                const timeLabel = sch.timeTypeData?.valueVi || sch.timeType;
                                const activeBookings = (sch.slotBookings || []).filter(
                                  (b) => b.statusId !== 'S4'
                                );

                                return (
                                  <div key={slotKey} className="tree-node tree-node--level-2">
                                    {/* Dòng Khung Giờ */}
                                    <div className="tree-node-row tree-node-row--slot">
                                      {activeBookings.length > 0 ? (
                                        <button
                                          type="button"
                                          className="node-expand-toggle"
                                          onClick={() => toggleExpand(slotKey)}
                                        >
                                          {isSlotExpanded ? (
                                            <ChevronDown className="tw-w-3.5 tw-h-3.5 text-emerald" />
                                          ) : (
                                            <ChevronRight className="tw-w-3.5 tw-h-3.5 text-slate" />
                                          )}
                                        </button>
                                      ) : (
                                        <span className="node-expand-spacer" />
                                      )}

                                      <div
                                        className="node-checkbox-wrapper"
                                        onClick={() => handleToggleSlot(sch)}
                                      >
                                        {slotCheck === 'checked' ? (
                                          <CheckSquare className="tw-w-4 tw-h-4 checkbox-icon checked" />
                                        ) : slotCheck === 'indeterminate' ? (
                                          <MinusSquare className="tw-w-4 tw-h-4 checkbox-icon indeterminate" />
                                        ) : (
                                          <Square className="tw-w-4 tw-h-4 checkbox-icon unchecked" />
                                        )}
                                      </div>

                                      <div
                                        className="node-label-box"
                                        onClick={() => {
                                          if (activeBookings.length > 0) toggleExpand(slotKey);
                                          else handleToggleSlot(sch);
                                        }}
                                      >
                                        <div className="node-icon-circle node-icon-circle--slot">
                                          <Clock className="tw-w-3.5 tw-h-3.5 tw-text-teal-700" />
                                        </div>
                                        <span className="node-title slot-name">{timeLabel}</span>
                                        <span className={`slot-capacity-tag ${activeBookings.length > 0 ? 'has-patients' : 'empty'}`}>
                                          {activeBookings.length}/{sch.maxNumber || 10} ca khám
                                        </span>
                                        {sch.status === 'CLOSED_BY_DOCTOR' && (
                                          <span className="slot-closed-tag">Đã đóng</span>
                                        )}
                                      </div>
                                    </div>

                                    {/* Danh sách Bệnh nhân con (Bookings) */}
                                    {isSlotExpanded && activeBookings.length > 0 && (
                                      <div className="tree-children-container tree-children-container--patients">
                                        {activeBookings.map((b) => {
                                          const isChecked = selectedBookingIds.has(b.id);
                                          return (
                                            <div
                                              key={b.id}
                                              className={`tree-node-row tree-node-row--patient ${isChecked ? 'selected' : ''}`}
                                              onClick={() => handleToggleBooking(b, sch)}
                                            >
                                              <span className="node-expand-spacer" />
                                              <div className="node-checkbox-wrapper">
                                                {isChecked ? (
                                                  <CheckSquare className="tw-w-4 tw-h-4 checkbox-icon checked" />
                                                ) : (
                                                  <Square className="tw-w-4 tw-h-4 checkbox-icon unchecked" />
                                                )}
                                              </div>

                                              {/* Avatar xanh lá tròn y hệt trong ảnh ZKBio Zlink */}
                                              <div className="patient-avatar-badge">
                                                <User className="tw-w-3.5 tw-h-3.5 tw-text-white" />
                                              </div>

                                              <div className="patient-details">
                                                <div className="patient-name">
                                                  {b.patientName || `Bệnh nhân #${b.id}`}
                                                  <span className="booking-id-tag">#{b.id}</span>
                                                </div>
                                                <div className="patient-sub">
                                                  <span>{b.patientData?.phoneNumber || b.phoneNumber || 'Không SĐT'}</span>
                                                  <span>&bull;</span>
                                                  <span className="price-tag">
                                                    {(Number(b.bookingPrice) || 0).toLocaleString('vi-VN')} ₫
                                                  </span>
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* CỘT PHẢI: DANH SÁCH ĐÃ CHỌN (SELECTED ITEMS PANEL) */}
            <div className="tree-picker-right-col">
              {/* Header: Đã chọn: X nhân sự / ca khám | Nút Xóa sạch đỏ */}
              <div className="selected-panel-header">
                <div className="selected-count-label">
                  Đã chọn: <strong>{selectedItemsList.length}</strong> mục
                </div>
                {selectedItemsList.length > 0 && (
                  <button
                    type="button"
                    className="btn-clear-all"
                    onClick={handleClearAll}
                    title="Xóa toàn bộ các mục đã chọn"
                  >
                    <Trash2 className="tw-w-3.5 tw-h-3.5" />
                    <span>Xóa sạch</span>
                  </button>
                )}
              </div>

              {/* Danh sách các item đã chọn */}
              <div className="selected-items-viewport">
                {selectedItemsList.length === 0 ? (
                  <div className="selected-empty-state">
                    <CheckCircle2 className="tw-w-7 tw-h-7 tw-text-slate-300" />
                    <span>Chưa có ca khám hoặc khung giờ nào được chọn.</span>
                    <p>Hãy tích chọn từ cây phân cấp bên trái.</p>
                  </div>
                ) : (
                  <div className="selected-items-list">
                    {selectedItemsList.map((item) => (
                      <div key={item.key} className="selected-item-row">
                        {/* Avatar xanh lá tròn như ảnh mẫu ZKBio Zlink */}
                        <div className={`selected-avatar ${item.type === 'SLOT' ? 'selected-avatar--slot' : 'selected-avatar--patient'}`}>
                          {item.type === 'SLOT' ? (
                            <Clock className="tw-w-4 tw-h-4 tw-text-white" />
                          ) : (
                            <User className="tw-w-4 tw-h-4 tw-text-white" />
                          )}
                        </div>

                        {/* Thông tin item */}
                        <div className="selected-item-info">
                          <div className="item-name" title={item.name}>
                            {item.name}
                          </div>
                          <div className="item-sub">
                            {item.timeLabel} &bull; {item.dateLabel}
                          </div>
                          {item.price > 0 && (
                            <div className="item-refund-badge">
                              Hoàn: +{item.price.toLocaleString('vi-VN')} ₫
                            </div>
                          )}
                        </div>

                        {/* Nút xóa X bên phải */}
                        <button
                          type="button"
                          className="btn-remove-item"
                          onClick={() => handleRemoveSelectedItem(item)}
                          title="Bỏ chọn mục này"
                        >
                          <X className="tw-w-4 tw-h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* STEP 2: LIVE IMPACT PREVIEW (DỰ TOÁN TỰ ĐỘNG HOÀN TIỀN VÀ KHUNG GIỜ ĐÓNG) */}
          <div className="doc-cancel-drawer__section">
            <div className="tw-flex tw-items-center tw-justify-between tw-mb-2">
              <label className="doc-cancel-drawer__label tw-mb-0">
                <span className="step-num">2</span> Đánh giá tác động & Dự toán hoàn tiền
              </label>
              {isLoadingPreview && (
                <span className="tw-text-xs tw-text-emerald-700 tw-flex tw-items-center tw-gap-1 tw-font-medium">
                  <Loader2 className="tw-w-3.5 tw-h-3.5 tw-animate-spin" /> Đang tính toán...
                </span>
              )}
            </div>

            {/* Metric Cards */}
            <div className="impact-metrics-grid">
              <div className="impact-metric-card">
                <span className="impact-metric-card__label">Khung giờ (Slot) sẽ đóng</span>
                <span className="impact-metric-card__val text-slate">
                  {previewData?.affectedSlotsCount ?? selectedScheduleIds.size}
                </span>
              </div>
              <div className="impact-metric-card">
                <span className="impact-metric-card__label">Bệnh nhân bị ảnh hưởng</span>
                <span className="impact-metric-card__val text-rose">
                  {previewData?.affectedBookingsCount ?? selectedBookingIds.size}
                </span>
              </div>
              <div className="impact-metric-card">
                <span className="impact-metric-card__label">Tổng tiền tự động hoàn về Ví</span>
                <span className="impact-metric-card__val text-teal">
                  {(previewData?.totalRefundAmount ?? 0).toLocaleString('vi-VN')} ₫
                </span>
              </div>
            </div>
          </div>

          {/* STEP 3: LÝ DO HỦY LỊCH */}
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
                  onClick={() => setReason(r)}
                >
                  {r}
                </button>
              ))}
            </div>

            <textarea
              className="doc-cancel-textarea"
              rows={2}
              placeholder="Nhập chi tiết lý do bác sĩ bận đột xuất (nội dung này sẽ được ghi vào Sổ cái và gửi email xin lỗi lịch sự đến người bệnh)..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
          </div>

          {/* Zero-Admin Guarantee Box */}
          <div className="zero-admin-guarantee-card">
            <div className="tw-flex tw-items-start tw-gap-3">
              <ShieldAlert className="tw-w-5 tw-h-5 tw-text-emerald-700 tw-shrink-0 tw-mt-0.5" />
              <div className="tw-text-xs tw-text-slate-700">
                <strong>Cam kết Zero-Admin & Sổ cái Bất biến:</strong> Khi bạn xác nhận, số tiền {(previewData?.totalRefundAmount ?? 0).toLocaleString('vi-VN')} ₫ sẽ được hệ thống hoàn tức thì 100% vào Ví BookingCare của từng bệnh nhân mà không cần chờ Admin phê duyệt. Khung giờ khám được chọn sẽ được đóng ngay lập tức.
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions (Matching ZKBio Zlink bottom action bar) */}
        <div className="doc-cancel-drawer__footer">
          <button
            type="button"
            className="drawer-btn drawer-btn--cancel"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Hủy bỏ
          </button>

          <button
            type="button"
            className="drawer-btn drawer-btn--confirm-green"
            onClick={handleConfirmCancel}
            disabled={isSubmitting || selectedItemsList.length === 0 || !reason || reason.trim().length < 5}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="tw-w-4 tw-h-4 tw-animate-spin" /> Đang hủy lịch & hoàn tiền...
              </>
            ) : (
              <>
                <CheckCircle2 className="tw-w-4 tw-h-4" /> Xác nhận ({selectedItemsList.length} mục)
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DoctorCancellationDrawer;
