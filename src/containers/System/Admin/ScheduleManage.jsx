// src/containers/System/Admin/ScheduleManage.jsx
// Quản lý lịch khám bác sĩ (REQ-AM-018, 019, 021, 023)
// [Phase 9 Final] Full i18n — useIntl + FormattedMessage
import React, { useEffect, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
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
  const intl = useIntl();
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
    if (!selectedDoctorId) {
      showWarning(
        intl.formatMessage({ id: 'admin.manage.schedule.toast-no-doctor' }),
        intl.formatMessage({ id: 'admin.manage.schedule.toast-no-doctor-desc' })
      );
      return;
    }
    const newTimes = selectedTimes.filter((t) => !existingSchedules.some((s) => s.timeType === t));
    if (newTimes.length === 0) {
      showWarning(
        intl.formatMessage({ id: 'admin.manage.schedule.toast-no-new' }),
        intl.formatMessage({ id: 'admin.manage.schedule.toast-no-new-desc' })
      );
      return;
    }

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
        showSuccess(intl.formatMessage({ id: 'admin.manage.schedule.toast-create-success' }, { count: newTimes.length }));
        loadExistingSchedules();
      } else showError(res.message || intl.formatMessage({ id: 'admin.manage.schedule.toast-create-error' }));
    } catch { showError(intl.formatMessage({ id: 'admin.manage.schedule.toast-server-error' })); }
    setIsSaving(false);
  };

  const handleDeleteSchedule = async (schedule) => {
    const frame = TIME_FRAMES.find((t) => t.key === schedule.timeType);
    const ok = await confirmDelete(intl.formatMessage({ id: 'admin.manage.schedule.toast-delete-confirm' }, { timeLabel: frame?.label || schedule.timeType }));
    if (!ok) return;
    try {
      const res = await deleteSchedule({ id: schedule.id });
      if (res.errCode === 0) {
        showSuccess(intl.formatMessage({ id: 'admin.manage.schedule.toast-delete-success' }));
        loadExistingSchedules();
      } else showError(res.message || intl.formatMessage({ id: 'admin.manage.schedule.toast-delete-error' }));
    } catch { showError(intl.formatMessage({ id: 'admin.manage.schedule.toast-server-error' })); }
  };

  return (
    <div className="schedule-manage">
      <div className="manage-header">
        <h2 className="manage-title"><FormattedMessage id="admin.manage.schedule.title" /></h2>
      </div>

      {/* Chọn bác sĩ & ngày */}
      <div className="filter-card">
        <div className="filter-row">
          <div className="form-group">
            <label><FormattedMessage id="admin.manage.schedule.label-select-doctor" /></label>
            <select className="form-control" value={selectedDoctorId} onChange={(e) => setSelectedDoctorId(e.target.value)}>
              <option value="">{intl.formatMessage({ id: 'admin.manage.schedule.select-default' })}</option>
              {doctorList.map((doc) => (
                <option key={doc.id} value={doc.id}>{doc.lastName} {doc.firstName}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label><FormattedMessage id="admin.manage.schedule.label-select-date" /></label>
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
              {intl.formatMessage({ id: 'admin.manage.schedule.timeslot-title' }, { date: moment(selectedDate).format('DD/MM/YYYY') })}
            </h4>
            <p className="hint">
              <span className="dot-teal" /> <FormattedMessage id="admin.manage.schedule.legend-exists" /> &nbsp;
              <span className="dot-green" /> <FormattedMessage id="admin.manage.schedule.legend-new" />
            </p>

            {isLoading ? <p className="loading-text"><FormattedMessage id="admin.manage.schedule.loading" /></p> : (
              <div className="timeslot-grid">
                {TIME_FRAMES.map((frame) => {
                  const alreadyExists = existingSchedules.some((s) => s.timeType === frame.key);
                  const isSelected = selectedTimes.includes(frame.key);
                  return (
                    <div
                      key={frame.key}
                      className={`timeslot-item${alreadyExists ? ' exists' : ''}${isSelected && !alreadyExists ? ' selected' : ''}`}
                      onClick={() => toggleTime(frame.key)}
                      title={intl.formatMessage({ id: alreadyExists ? 'admin.manage.schedule.tooltip-exists' : 'admin.manage.schedule.tooltip-toggle' })}
                    >
                      <span className="time-label">{frame.label}</span>
                      {alreadyExists && <span className="time-badge exists"><FormattedMessage id="admin.manage.schedule.badge-exists" /></span>}
                      {isSelected && !alreadyExists && <span className="time-badge new"><FormattedMessage id="admin.manage.schedule.badge-new" /></span>}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="timeslot-footer">
              <span className="count-text">
                <FormattedMessage id="admin.manage.schedule.new-count" />{' '}
                <strong>{selectedTimes.filter((t) => !existingSchedules.some((s) => s.timeType === t)).length}</strong>{' '}
                <FormattedMessage id="admin.manage.schedule.new-count-unit" />
              </span>
              <button className="btn-save" onClick={handleSave} disabled={isSaving}>
                <FormattedMessage id={isSaving ? 'admin.manage.schedule.btn-saving' : 'admin.manage.schedule.btn-save'} />
              </button>
            </div>
          </div>

          {/* Lịch đã tạo — xóa từng cái (REQ-AM-021) */}
          {existingSchedules.length > 0 && (
            <div className="existing-card">
              <h4 className="card-title"><FormattedMessage id="admin.manage.schedule.existing-title" /></h4>
              <div className="existing-list">
                {existingSchedules.map((schedule) => {
                  const frame = TIME_FRAMES.find((t) => t.key === schedule.timeType);
                  return (
                    <div key={schedule.id} className="existing-item">
                      <span className="existing-time">⏰ {frame?.label || schedule.timeType}</span>
                      <span className="existing-quota">
                        {intl.formatMessage({ id: 'admin.manage.schedule.existing-quota' }, { current: schedule.currentNumber || 0, max: schedule.maxNumber })}
                      </span>
                      {/* GAP-04: Inline edit maxNumber (REQ-AM-021) */}
                      <div className="quota-edit">
                        <label className="quota-label"><FormattedMessage id="admin.manage.schedule.quota-label" /></label>
                        <input
                          type="number"
                          className="quota-input"
                          min={schedule.currentNumber || 1}
                          max={50}
                          defaultValue={schedule.maxNumber}
                          onBlur={async (e) => {
                            const newMax = parseInt(e.target.value, 10);
                            if (isNaN(newMax) || newMax < (schedule.currentNumber || 0)) {
                              showWarning(
                                intl.formatMessage({ id: 'admin.manage.schedule.toast-quota-invalid' }),
                                intl.formatMessage({ id: 'admin.manage.schedule.toast-quota-invalid-desc' }, { current: schedule.currentNumber || 0 })
                              );
                              e.target.value = schedule.maxNumber;
                              return;
                            }
                            if (newMax === schedule.maxNumber) return; // không đổi
                            try {
                              const res = await editSchedule({ id: schedule.id, maxNumber: newMax });
                              if (res.errCode === 0) {
                                showSuccess(intl.formatMessage({ id: 'admin.manage.schedule.toast-quota-success' }, { max: newMax }));
                                loadExistingSchedules(); // FIX BUG-08: Refresh from server instead of mutating state
                              } else {
                                showError(res.message || intl.formatMessage({ id: 'admin.manage.schedule.toast-quota-error' }));
                                e.target.value = schedule.maxNumber;
                              }
                            } catch {
                              showError(intl.formatMessage({ id: 'admin.manage.schedule.toast-server-error' }));
                              e.target.value = schedule.maxNumber;
                            }
                          }}
                        />
                        <span className="quota-unit"><FormattedMessage id="admin.manage.schedule.quota-unit" /></span>
                      </div>
                      <button className="btn-delete-sm" onClick={() => handleDeleteSchedule(schedule)}><FormattedMessage id="admin.manage.schedule.btn-delete" /></button>
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
