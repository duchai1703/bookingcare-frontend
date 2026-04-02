// src/containers/System/Admin/ScheduleManage.jsx
// Quản lý lịch khám bác sĩ (REQ-AM-018, 019, 021, 023)
import React, { useEffect, useState } from 'react';
import moment from 'moment';
import { getAllUsers } from '../../../services/userService';
import { bulkCreateSchedule, deleteSchedule, editSchedule, getScheduleByDateAdmin } from '../../../services/doctorService';
import { confirmDelete, showSuccess, showError, showWarning } from '../../../utils/confirmDelete';
import './ScheduleManage.scss';

// 8 khung giờ theo SRS REQ-AM-019
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
  const [doctorList, setDoctorList] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [selectedDate, setSelectedDate] = useState(moment().format('YYYY-MM-DD'));
  const [selectedTimes, setSelectedTimes] = useState([]);
  const [existingSchedules, setExistingSchedules] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // DS-07 FIX: AbortController để cancel request khi unmount
    const controller = new AbortController();
    fetchDoctorList(controller.signal);
    return () => controller.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedDoctorId && selectedDate) {
      const controller = new AbortController();
      loadExistingSchedules(controller.signal);
      return () => controller.abort();
    } else {
      setExistingSchedules([]);
      setSelectedTimes([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDoctorId, selectedDate]);

  const fetchDoctorList = async (signal) => {
    try {
      const res = await getAllUsers('ALL');
      if (res.errCode === 0)
        setDoctorList((res.data || []).filter((u) => u.roleId === 'R2'));
    } catch (err) {
      if (err.name !== 'CanceledError') console.error(err); // bỏ qua AbortError
    }
  };

  const loadExistingSchedules = async () => {
    setIsLoading(true);
    try {
      // BUG-01: dùng moment.utc() — tránh lệch múi giờ GMT+7 vs UTC
      const timestamp = moment.utc(selectedDate, 'YYYY-MM-DD').startOf('day').valueOf();
      const res = await getScheduleByDateAdmin(selectedDoctorId, timestamp);
      if (res.errCode === 0) {
        setExistingSchedules(res.data || []);
        setSelectedTimes((res.data || []).map((s) => s.timeType));
      } else {
        setExistingSchedules([]); setSelectedTimes([]);
      }
    } catch {
      setExistingSchedules([]); setSelectedTimes([]);
    }
    setIsLoading(false);
  };

  const toggleTime = (timeKey) => {
    const alreadyExists = existingSchedules.some((s) => s.timeType === timeKey);
    if (alreadyExists) return; // Đã có lịch → không toggle (chỉ xóa bằng nút xóa)
    setSelectedTimes((prev) =>
      prev.includes(timeKey) ? prev.filter((t) => t !== timeKey) : [...prev, timeKey]
    );
  };

  const handleSave = async () => {
    if (!selectedDoctorId) { showWarning('Chưa chọn bác sĩ!', 'Vui lòng chọn bác sĩ.'); return; }
    const newTimes = selectedTimes.filter((t) => !existingSchedules.some((s) => s.timeType === t));
    if (newTimes.length === 0) { showWarning('Không có gì mới!', 'Tất cả khung giờ đã tồn tại hoặc chưa chọn giờ mới.'); return; }

    setIsSaving(true);
    try {
      // BUG-01: dùng moment.utc() — đồng nhất với loadExistingSchedules
      const timestamp = moment.utc(selectedDate, 'YYYY-MM-DD').startOf('day').valueOf();
      const arrSchedule = newTimes.map((timeType) => ({
        doctorId: selectedDoctorId,
        date: timestamp,
        timeType,
        maxNumber: 10, // REQ-AM-023
      }));
      const res = await bulkCreateSchedule({ arrSchedule });
      if (res.errCode === 0) {
        showSuccess(`Đã tạo ${newTimes.length} lịch khám.`);
        loadExistingSchedules();
      } else showError(res.message || 'Tạo lịch thất bại');
    } catch { showError('Không thể kết nối server'); }
    setIsSaving(false);
  };

  const handleDeleteSchedule = async (schedule) => {
    const frame = TIME_FRAMES.find((t) => t.key === schedule.timeType);
    const ok = await confirmDelete(`khung giờ ${frame?.label || schedule.timeType}`);
    if (!ok) return;
    try {
      const res = await deleteSchedule({ id: schedule.id });
      if (res.errCode === 0) { showSuccess('Đã xóa lịch khám.'); loadExistingSchedules(); }
      else showError(res.message || 'Xóa thất bại');
    } catch { showError('Không thể kết nối server'); }
  };

  return (
    <div className="schedule-manage">
      <div className="manage-header">
        <h2 className="manage-title">📅 Quản Lý Lịch Khám</h2>
      </div>

      {/* Chọn bác sĩ & ngày */}
      <div className="filter-card">
        <div className="filter-row">
          <div className="form-group">
            <label>Chọn bác sĩ</label>
            <select className="form-control" value={selectedDoctorId} onChange={(e) => setSelectedDoctorId(e.target.value)}>
              <option value="">-- Chọn bác sĩ (R2) --</option>
              {doctorList.map((doc) => (
                <option key={doc.id} value={doc.id}>{doc.lastName} {doc.firstName}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Chọn ngày khám</label>
            <input type="date" className="form-control" value={selectedDate}
              min={moment().format('YYYY-MM-DD')}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Khung giờ (chỉ hiện khi đã chọn bác sĩ + ngày) */}
      {selectedDoctorId && selectedDate && (
        <>
          <div className="timeslot-card">
            <h4 className="card-title">
              ⏰ Khung giờ cho ngày {moment(selectedDate).format('DD/MM/YYYY')}
            </h4>
            <p className="hint">
              <span className="dot-teal" /> Đã tạo (không thể bỏ chọn) &nbsp;
              <span className="dot-green" /> Sẽ tạo mới (click để chọn)
            </p>

            {isLoading ? <p className="loading-text">Đang tải lịch...</p> : (
              <div className="timeslot-grid">
                {TIME_FRAMES.map((frame) => {
                  const alreadyExists = existingSchedules.some((s) => s.timeType === frame.key);
                  const isSelected = selectedTimes.includes(frame.key);
                  return (
                    <div
                      key={frame.key}
                      className={`timeslot-item${alreadyExists ? ' exists' : ''}${isSelected && !alreadyExists ? ' selected' : ''}`}
                      onClick={() => toggleTime(frame.key)}
                      title={alreadyExists ? 'Đã có lịch — dùng nút Xóa bên dưới' : 'Click để chọn/bỏ chọn'}
                    >
                      <span className="time-label">{frame.label}</span>
                      {alreadyExists && <span className="time-badge exists">✅ Đã tạo</span>}
                      {isSelected && !alreadyExists && <span className="time-badge new">➕ Sẽ tạo</span>}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="timeslot-footer">
              <span className="count-text">
                Sẽ tạo mới: <strong>{selectedTimes.filter((t) => !existingSchedules.some((s) => s.timeType === t)).length}</strong> khung giờ
              </span>
              <button className="btn-save" onClick={handleSave} disabled={isSaving}>
                {isSaving ? '⏳ Đang lưu...' : '💾 Lưu lịch khám'}
              </button>
            </div>
          </div>

          {/* Lịch đã tạo — xóa từng cái (REQ-AM-021) */}
          {existingSchedules.length > 0 && (
            <div className="existing-card">
              <h4 className="card-title">📋 Lịch Đã Tạo</h4>
              <div className="existing-list">
                {existingSchedules.map((schedule) => {
                  const frame = TIME_FRAMES.find((t) => t.key === schedule.timeType);
                  return (
                    <div key={schedule.id} className="existing-item">
                      <span className="existing-time">⏰ {frame?.label || schedule.timeType}</span>
                      <span className="existing-quota">👥 {schedule.currentNumber || 0}/{schedule.maxNumber} bệnh nhân</span>
                      {/* GAP-04: Inline edit maxNumber (REQ-AM-021) */}
                      <div className="quota-edit">
                        <label className="quota-label">Tối đa:</label>
                        <input
                          type="number"
                          className="quota-input"
                          min={schedule.currentNumber || 1}
                          max={50}
                          defaultValue={schedule.maxNumber}
                          onBlur={async (e) => {
                            const newMax = parseInt(e.target.value, 10);
                            if (isNaN(newMax) || newMax < (schedule.currentNumber || 0)) {
                              showWarning('Không hợp lệ!', `Số tối đa phải ≥ số đã đặt (${schedule.currentNumber || 0}).`);
                              e.target.value = schedule.maxNumber;
                              return;
                            }
                            if (newMax === schedule.maxNumber) return; // không đổi
                            try {
                              const res = await editSchedule({ id: schedule.id, maxNumber: newMax });
                              if (res.errCode === 0) {
                                showSuccess(`Đã cập nhật số lượng tối đa → ${newMax}.`);
                                loadExistingSchedules(); // FIX BUG-08: Refresh from server instead of mutating state
                              } else {
                                showError(res.message || 'Cập nhật thất bại.');
                                e.target.value = schedule.maxNumber;
                              }
                            } catch {
                              showError('Không thể kết nối server.');
                              e.target.value = schedule.maxNumber;
                            }
                          }}
                        />
                        <span className="quota-unit">người</span>
                      </div>
                      <button className="btn-delete-sm" onClick={() => handleDeleteSchedule(schedule)}>🗑️ Xóa</button>
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
