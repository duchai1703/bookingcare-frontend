// ═══════════════════════════════════════════════════════════════════════
// [Phase 04 — REAL SLOT DISCOVERY] SlotPicker
// Renders Real Available Schedule Slots from Backend SSOT
// Groups into Morning & Afternoon, maintains Selection state
// STRICT RULE: No booking transaction, selection only
// ═══════════════════════════════════════════════════════════════════════

import React, { memo } from 'react';
import {
  Calendar,
  Clock,
  Sun,
  Sunset,
  CheckCircle2,
  AlertCircle,
  Globe,
} from 'lucide-react';

const SlotPicker = memo(({
  slotData,
  selectedScheduleId,
  onSelectSlot,
}) => {
  if (!slotData || typeof slotData !== 'object') return null;

  const data = slotData.data || slotData;
  const doctor = data.doctor || {};
  const dateLabel = data.dateLabel || 'Ngày khám';
  const timezone = data.timezone || 'Asia/Ho_Chi_Minh';
  const slots = Array.isArray(data.slots) ? data.slots : [];
  const emptyMessage = data.message || 'Hiện tại chưa có khung giờ khám trống cho ngày đã chọn.';

  // Tách thành 2 nhóm: Buổi sáng & Buổi chiều
  const morningSlots = slots.filter(
    (s) => s.period === 'morning' || ['T1', 'T2', 'T3', 'T4'].includes(s.timeType)
  );
  const afternoonSlots = slots.filter(
    (s) => s.period === 'afternoon' || ['T5', 'T6', 'T7', 'T8'].includes(s.timeType)
  );

  const selectedSlot = slots.find((s) => s.scheduleId === selectedScheduleId);

  const handleSlotClick = (slot) => {
    if (onSelectSlot) {
      onSelectSlot(slot, doctor);
    }
  };

  return (
    <div className="ai-slot-picker-card">
      {/* Header: Bác sĩ, Ngày & Múi giờ */}
      <div className="slot-picker-header">
        <div className="header-left">
          <Calendar size={16} className="header-icon" />
          <div className="header-meta">
            <span className="header-title">
              Lịch khám của {doctor.name || 'Bác sĩ'}
            </span>
            <span className="header-date">{dateLabel}</span>
          </div>
        </div>
        <div className="header-right">
          <span className="timezone-tag" title={`Múi giờ chuẩn: ${timezone}`}>
            <Globe size={11} className="globe-icon" />
            <span>{timezone}</span>
          </span>
        </div>
      </div>

      {/* Empty State */}
      {slots.length === 0 ? (
        <div className="slot-empty-state">
          <AlertCircle size={18} className="empty-icon" />
          <p className="empty-text">{emptyMessage}</p>
        </div>
      ) : (
        <div className="slot-groups-container">
          {/* Nhóm Buổi Sáng */}
          {morningSlots.length > 0 && (
            <div className="slot-group">
              <div className="group-title">
                <Sun size={14} className="group-icon morning" />
                <span>Buổi sáng</span>
                <span className="slot-count">({morningSlots.length} khung giờ)</span>
              </div>
              <div className="slot-chips-grid">
                {morningSlots.map((slot) => {
                  const isSelected = selectedScheduleId === slot.scheduleId;
                  return (
                    <button
                      key={slot.scheduleId}
                      type="button"
                      className={`slot-chip ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleSlotClick(slot)}
                      title={`Chọn khung giờ ${slot.displayTime}`}
                    >
                      <Clock size={12} className="chip-clock-icon" />
                      <span className="chip-time">{slot.displayTime}</span>
                      {isSelected && (
                        <CheckCircle2 size={12} className="chip-check-icon" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Nhóm Buổi Chiều */}
          {afternoonSlots.length > 0 && (
            <div className="slot-group">
              <div className="group-title">
                <Sunset size={14} className="group-icon afternoon" />
                <span>Buổi chiều</span>
                <span className="slot-count">({afternoonSlots.length} khung giờ)</span>
              </div>
              <div className="slot-chips-grid">
                {afternoonSlots.map((slot) => {
                  const isSelected = selectedScheduleId === slot.scheduleId;
                  return (
                    <button
                      key={slot.scheduleId}
                      type="button"
                      className={`slot-chip ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleSlotClick(slot)}
                      title={`Chọn khung giờ ${slot.displayTime}`}
                    >
                      <Clock size={12} className="chip-clock-icon" />
                      <span className="chip-time">{slot.displayTime}</span>
                      {isSelected && (
                        <CheckCircle2 size={12} className="chip-check-icon" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Selected Slot Notice Banner (Chuyển sang bước chuẩn bị Booking Draft) */}
      {selectedSlot && (
        <div className="selected-slot-banner">
          <div className="banner-left">
            <CheckCircle2 size={16} className="banner-icon" />
            <div className="banner-content">
              <span className="banner-title">
                Đã chọn: {selectedSlot.displayTime} — {dateLabel}
              </span>
              <span className="banner-hint">
                Nhấn &quot;Tiến hành đặt lịch&quot; để tạo phiếu xác nhận lịch khám.
              </span>
            </div>
          </div>
          <button
            type="button"
            className="slot-proceed-btn"
            onClick={() => handleSlotClick(selectedSlot)}
            title="Tạo phiếu thông tin đặt lịch"
          >
            <span>Tiến hành đặt lịch</span>
          </button>
        </div>
      )}

      {/* Availability Disclaimer (Real-time availability note) */}
      <div className="slot-picker-footer">
        <span className="footer-note">
          💡 Khung giờ thực tế tại thời điểm kiểm tra. Tình trạng lịch có thể thay đổi trước khi hoàn tất đặt khám.
        </span>
      </div>
    </div>
  );
});

SlotPicker.displayName = 'SlotPicker';

export default SlotPicker;
