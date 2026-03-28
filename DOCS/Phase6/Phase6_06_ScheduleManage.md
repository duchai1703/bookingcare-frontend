# 📅 BƯỚC 6 — QUẢN LÝ LỊCH KHÁM BÁC SĨ (SCHEDULE MANAGE)

> **Mục tiêu:** Admin chọn bác sĩ + ngày → chọn các khung giờ (T1–T8) → bulk create lịch khám. Xem + xóa lịch đã tạo
> **Thời gian:** Ngày 9–10
> **SRS:** REQ-AM-018, 019, 020, 021, 023
> **API:** `bulkCreateSchedule(data)`, `deleteSchedule(data)`, `getScheduleByDate(doctorId, date)`

---

## 6.1 Tổng Quan Giao Diện

```
┌─────────────────────────────────────────────────────────────────┐
│  📅 Quản Lý Lịch Khám Bác Sĩ                                   │
├─────────────────────────────────────────────────────────────────┤
│  ┌─── Chọn bác sĩ & ngày ──────────────────────────────────┐   │
│  │ [Dropdown bác sĩ R2...]    [📆 Chọn ngày]               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─── Chọn khung giờ (REQ-AM-019) ─────────────────────────┐   │
│  │  [✓ 8:00-9:00]  [✓ 9:00-10:00]  [ 10:00-11:00]          │   │
│  │  [✓11:00-12:00] [  13:00-14:00]  [✓ 14:00-15:00]         │   │
│  │  [✓15:00-16:00] [  16:00-17:00]                           │   │
│  │                                    [💾 Lưu lịch khám]    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─── Lịch đã tạo trong ngày ─────────────────────────────┐   │
│  │  8:00-9:00   [🗑️]  |  9:00-10:00  [🗑️]  |  ...         │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6.2 Tạo `ScheduleManage.jsx`

```jsx
// src/containers/System/Admin/ScheduleManage.jsx
// Quản lý lịch khám bác sĩ (REQ-AM-018, 019, 021, 023)
import React, { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import moment from 'moment';
import { useSelector } from 'react-redux';
import { getAllUsers, getAllCode } from '../../../services/userService';
import {
  bulkCreateSchedule,
  deleteSchedule,
  getScheduleByDate,
} from '../../../services/doctorService';
import './ScheduleManage.scss';

// ===== 8 KHUNG GIỜ THEO SRS REQ-AM-019 =====
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

const ScheduleManage = () => {
  // ===== STATE =====
  const [doctorList, setDoctorList] = useState([]);       // Danh sách bác sĩ R2
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [selectedDate, setSelectedDate] = useState(
    moment().format('YYYY-MM-DD')                          // Mặc định hôm nay
  );
  const [selectedTimes, setSelectedTimes] = useState([]); // Các timeKey đã chọn ['T1','T3',...]
  const [existingSchedules, setExistingSchedules] = useState([]); // Lịch đã tạo trong ngày
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // ===== FETCH DANH SÁCH BÁC SĨ =====
  useEffect(() => { fetchDoctorList(); }, []);

  const fetchDoctorList = async () => {
    try {
      const res = await getAllUsers('ALL');
      if (res.errCode === 0) {
        const doctors = (res.data || []).filter((u) => u.roleId === 'R2');
        setDoctorList(doctors);
      }
    } catch (err) { console.error(err); }
  };

  // ===== LOAD LỊCH KHI ĐỔI BÁC SĨ HOẶC NGÀY =====
  useEffect(() => {
    if (selectedDoctorId && selectedDate) {
      loadExistingSchedules();
    } else {
      setExistingSchedules([]);
    }
  }, [selectedDoctorId, selectedDate]);

  const loadExistingSchedules = async () => {
    setIsLoading(true);
    try {
      // Convert ngày YYYY-MM-DD → timestamp
      const timestamp = moment(selectedDate, 'YYYY-MM-DD').startOf('day').valueOf();
      const res = await getScheduleByDate(selectedDoctorId, timestamp);
      if (res.errCode === 0) {
        setExistingSchedules(res.data || []);
        // Đánh dấu sẵn những khung giờ đã có lịch
        const bookedKeys = (res.data || []).map((s) => s.timeType);
        setSelectedTimes(bookedKeys);
      } else {
        setExistingSchedules([]);
        setSelectedTimes([]);
      }
    } catch (err) {
      console.error(err);
      setExistingSchedules([]);
    }
    setIsLoading(false);
  };

  // ===== TOGGLE CHỌN KHUNG GIỜ =====
  // Không toggle nếu khung giờ đó đã có lịch (đã được đặt)
  const toggleTime = (timeKey) => {
    const alreadyExists = existingSchedules.some((s) => s.timeType === timeKey);
    if (alreadyExists) {
      // Nhắc admin: muốn xóa thì dùng nút xóa riêng
      return;
    }
    setSelectedTimes((prev) =>
      prev.includes(timeKey)
        ? prev.filter((t) => t !== timeKey)
        : [...prev, timeKey]
    );
  };

  // ===== LƯU LỊCH KHÁM (BULK CREATE — REQ-AM-018) =====
  const handleSave = async () => {
    if (!selectedDoctorId) {
      Swal.fire('Chưa chọn bác sĩ!', 'Vui lòng chọn bác sĩ.', 'warning');
      return;
    }
    if (!selectedDate) {
      Swal.fire('Chưa chọn ngày!', 'Vui lòng chọn ngày khám.', 'warning');
      return;
    }

    // Chỉ gửi những khung giờ chưa có trong database
    const newTimes = selectedTimes.filter(
      (t) => !existingSchedules.some((s) => s.timeType === t)
    );

    if (newTimes.length === 0) {
      Swal.fire('Không có gì mới!', 'Tất cả khung giờ đã được chọn đã tồn tại.', 'info');
      return;
    }

    setIsSaving(true);
    try {
      const timestamp = moment(selectedDate, 'YYYY-MM-DD').startOf('day').valueOf();

      // Tạo mảng schedule theo REQ-AM-023 (có maxNumber mặc định 10)
      const arrSchedule = newTimes.map((timeType) => ({
        doctorId: selectedDoctorId,
        date: timestamp,
        timeType,
        maxNumber: 10,   // REQ-AM-023: mặc định 10 bệnh nhân/khung giờ
      }));

      const res = await bulkCreateSchedule({ arrSchedule });
      if (res.errCode === 0) {
        Swal.fire('Thành công!', `Đã tạo ${newTimes.length} lịch khám cho bác sĩ.`, 'success');
        loadExistingSchedules(); // Reload để cập nhật UI
      } else {
        Swal.fire('Lỗi!', res.message || 'Tạo lịch thất bại', 'error');
      }
    } catch (err) {
      Swal.fire('Lỗi!', 'Không thể kết nối server', 'error');
    }
    setIsSaving(false);
  };

  // ===== XÓA LỊCH (REQ-AM-021) =====
  const handleDeleteSchedule = async (schedule) => {
    const timeLabel = TIME_FRAMES.find((t) => t.key === schedule.timeType)?.label || schedule.timeType;

    const result = await Swal.fire({
      title: 'Xóa lịch khám?',
      text: `Xóa khung giờ ${timeLabel}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      confirmButtonText: 'Xóa',
      cancelButtonText: 'Huỷ',
    });

    if (result.isConfirmed) {
      try {
        const res = await deleteSchedule({ id: schedule.id });
        if (res.errCode === 0) {
          Swal.fire('Đã xóa!', '', 'success');
          loadExistingSchedules();
        } else {
          Swal.fire('Lỗi!', res.message, 'error');
        }
      } catch (err) {
        Swal.fire('Lỗi!', 'Không thể kết nối server', 'error');
      }
    }
  };

  // ===== RENDER =====
  return (
    <div className="schedule-manage">
      <div className="manage-header">
        <h2 className="manage-title">📅 Quản Lý Lịch Khám</h2>
      </div>

      {/* ===== CHỌN BÁC SĨ & NGÀY ===== */}
      <div className="filter-card">
        <div className="filter-row">
          <div className="form-group">
            <label>Chọn bác sĩ</label>
            <select
              className="form-control"
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
            >
              <option value="">-- Chọn bác sĩ --</option>
              {doctorList.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.lastName} {doc.firstName}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Chọn ngày</label>
            <input
              type="date"
              className="form-control"
              value={selectedDate}
              min={moment().format('YYYY-MM-DD')} // Không chọn ngày quá khứ
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ===== CHỌN KHUNG GIỜ (chỉ hiện khi đã chọn bác sĩ + ngày) ===== */}
      {selectedDoctorId && selectedDate && (
        <>
          <div className="timeslot-card">
            <h4 className="card-title">
              ⏰ Chọn khung giờ cho ngày {moment(selectedDate).format('DD/MM/YYYY')}
            </h4>
            <p className="hint">
              💡 Khung giờ <span className="badge-exists">Đã tạo</span> = đã có lịch, không thể bỏ chọn (dùng nút xóa bên dưới).
              Khung giờ <span className="badge-selected">Chọn thêm</span> = sẽ được tạo khi nhấn Lưu.
            </p>

            {isLoading ? (
              <p className="loading-text">Đang tải lịch...</p>
            ) : (
              <div className="timeslot-grid">
                {TIME_FRAMES.map((frame) => {
                  const alreadyExists = existingSchedules.some((s) => s.timeType === frame.key);
                  const isSelected = selectedTimes.includes(frame.key);

                  return (
                    <div
                      key={frame.key}
                      className={`timeslot-item
                        ${alreadyExists ? 'exists' : ''}
                        ${isSelected && !alreadyExists ? 'selected' : ''}
                      `}
                      onClick={() => toggleTime(frame.key)}
                      title={alreadyExists ? 'Đã có lịch — dùng nút Xóa bên dưới để xóa' : 'Click để chọn/bỏ chọn'}
                    >
                      <span className="time-label">{frame.label}</span>
                      {alreadyExists && <span className="time-badge">✅ Đã tạo</span>}
                      {isSelected && !alreadyExists && <span className="time-badge new">➕ Sẽ tạo</span>}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="timeslot-footer">
              <div className="selected-count">
                Sẽ tạo mới: <strong>
                  {selectedTimes.filter(t => !existingSchedules.some(s => s.timeType === t)).length}
                </strong> khung giờ
              </div>
              <button
                className="btn-save"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? '⏳ Đang lưu...' : '💾 Lưu lịch khám'}
              </button>
            </div>
          </div>

          {/* ===== LỊCH ĐÃ TẠO — CÓ THỂ XÓA (REQ-AM-021) ===== */}
          {existingSchedules.length > 0 && (
            <div className="existing-card">
              <h4 className="card-title">📋 Lịch Đã Tạo — Có Thể Xóa</h4>
              <div className="existing-list">
                {existingSchedules.map((schedule) => {
                  const frame = TIME_FRAMES.find((t) => t.key === schedule.timeType);
                  return (
                    <div key={schedule.id} className="existing-item">
                      <span className="existing-time">⏰ {frame?.label || schedule.timeType}</span>
                      <span className="existing-quota">
                        👥 {schedule.currentNumber}/{schedule.maxNumber} bệnh nhân
                      </span>
                      <button
                        className="btn-delete-schedule"
                        onClick={() => handleDeleteSchedule(schedule)}
                        title="Xóa lịch này"
                      >
                        🗑️ Xóa
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ScheduleManage;
```

---

## 6.3 Tạo `ScheduleManage.scss`

```scss
// src/containers/System/Admin/ScheduleManage.scss
@import '../../../styles/variables';

.schedule-manage {
  .manage-header {
    margin-bottom: 20px;
    .manage-title { font-size: 1.4rem; font-weight: 700; color: #333; margin: 0; }
  }

  // Filter card
  .filter-card {
    background: #fff; border-radius: 12px; padding: 20px;
    margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.07);

    .filter-row {
      display: grid; grid-template-columns: 1fr 1fr; gap: 16px;
      @media (max-width: 768px) { grid-template-columns: 1fr; }
    }

    .form-group {
      display: flex; flex-direction: column; gap: 6px;
      label { font-size: 0.85rem; font-weight: 600; color: #555; }
      .form-control {
        padding: 8px 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 0.9rem;
        &:focus { outline: none; border-color: $primary; }
      }
    }
  }

  // Timeslot card
  .timeslot-card {
    background: #fff; border-radius: 12px; padding: 24px;
    margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.07);

    .card-title { font-size: 1.05rem; font-weight: 700; color: #333; margin-bottom: 8px; }

    .hint {
      font-size: 0.82rem; color: #666; margin-bottom: 16px;
      .badge-exists { background: $primary; color: #fff; padding: 2px 8px; border-radius: 10px; font-size: 0.75rem; }
      .badge-selected { background: #28a745; color: #fff; padding: 2px 8px; border-radius: 10px; font-size: 0.75rem; }
    }

    .loading-text { text-align: center; color: #888; padding: 20px; }

    // Grid 4x2 cho 8 khung giờ
    .timeslot-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 20px;

      @media (max-width: 768px) { grid-template-columns: repeat(2, 1fr); }

      .timeslot-item {
        border: 2px solid #e0e0e0;
        border-radius: 10px;
        padding: 14px 10px;
        text-align: center;
        cursor: pointer;
        transition: all 0.2s;
        background: #fafafa;
        user-select: none;

        .time-label {
          display: block;
          font-size: 0.9rem;
          font-weight: 600;
          color: #555;
          margin-bottom: 6px;
        }

        .time-badge {
          font-size: 0.7rem;
          padding: 2px 8px;
          border-radius: 10px;
          background: #e0e0e0;
          color: #666;

          &.new {
            background: #d4edda;
            color: #155724;
          }
        }

        // Trạng thái: đã tạo
        &.exists {
          border-color: $primary;
          background: rgba(69, 195, 210, 0.08);
          cursor: not-allowed;

          .time-label { color: darken($primary, 10%); }
          .time-badge { background: $primary; color: #fff; }
        }

        // Trạng thái: đang chọn thêm
        &.selected {
          border-color: #28a745;
          background: rgba(40, 167, 69, 0.08);

          .time-label { color: #155724; }
        }

        // Hover (chỉ khi chưa exists)
        &:not(.exists):hover {
          border-color: #28a745;
          background: rgba(40, 167, 69, 0.05);
          transform: translateY(-2px);
          box-shadow: 0 3px 10px rgba(0,0,0,0.1);
        }
      }
    }

    .timeslot-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 16px;
      border-top: 1px solid #eee;

      .selected-count {
        font-size: 0.9rem;
        color: #555;
        strong { color: #28a745; font-size: 1.1rem; }
      }

      .btn-save {
        background: $primary;
        color: #fff;
        border: none;
        padding: 11px 28px;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        font-size: 0.95rem;
        transition: all 0.2s;

        &:hover:not(:disabled) {
          background: darken($primary, 10%);
          box-shadow: 0 4px 12px rgba(69, 195, 210, 0.4);
        }

        &:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
      }
    }
  }

  // Lịch đã tạo có thể xóa
  .existing-card {
    background: #fff;
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.07);

    .card-title { font-size: 1.05rem; font-weight: 700; color: #333; margin-bottom: 12px; }

    .existing-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .existing-item {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 10px 14px;
      background: #f8f9fa;
      border-radius: 8px;
      border-left: 3px solid $primary;

      .existing-time {
        font-weight: 700;
        color: #333;
        min-width: 140px;
      }

      .existing-quota {
        font-size: 0.85rem;
        color: #666;
        flex: 1;
      }

      .btn-delete-schedule {
        background: #f8d7da;
        color: #721c24;
        border: none;
        padding: 6px 12px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.85rem;
        transition: all 0.2s;
        flex-shrink: 0;

        &:hover {
          background: #dc3545;
          color: #fff;
        }
      }
    }
  }
}
```

---

## ✅ Checklist Bước 6

- [ ] `ScheduleManage.jsx` — Dropdown bác sĩ + datepicker + 8 timeslot boxes + bulk create + delete
- [ ] `ScheduleManage.scss` — Grid 4x2, màu teal cho đã tạo, xanh cho chọn thêm
- [ ] Test REQ-AM-018: Chọn bác sĩ + ngày → chọn T1, T3, T5 → Lưu → xuất hiện trong "Lịch đã tạo"
- [ ] Test REQ-AM-019: Grid có đúng 8 khung giờ (T1–T8)
- [ ] Test REQ-AM-021: Nhấn 🗑️ Xóa trên lịch đã tạo → confirm → biến mất
- [ ] Test REQ-AM-023: `maxNumber=10` được gửi lên → backend lưu đúng
- [ ] Test logic: Chọn ngày khác → grid reset, không còn đánh dấu khung giờ cũ
- [ ] Test: Trang chi tiết bác sĩ (`/doctor/:id`) hiển thị đúng lịch khám vừa tạo

---

## 📊 TỔNG KẾT GIAI ĐOẠN 6

| # | File | SRS | Trạng thái |
|---|------|-----|-----------|
| 1 | `SystemLayout.jsx` + `Navigator.jsx` | REQ-AU-005 | ✅ |
| 2 | `UserManage.jsx` | REQ-AM-001→005 | ✅ |
| 3 | `DoctorManage.jsx` | REQ-AM-006→010, 022 | ✅ |
| 4 | `ClinicManage.jsx` | REQ-AM-011→014 | ✅ |
| 5 | `SpecialtyManage.jsx` | REQ-AM-015→017 | ✅ |
| 6 | `ScheduleManage.jsx` | REQ-AM-018→023 | ✅ |
| **Tổng REQ** | | **23 REQs Admin** | **100%** |

---

> 📖 **Giai đoạn tiếp theo:** Giai đoạn 7 — Module Patient (DoctorDetail, BookingModal, VerifyEmail)
