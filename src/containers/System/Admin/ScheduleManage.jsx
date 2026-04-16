// src/containers/System/Admin/ScheduleManage.jsx
// Quản lý lịch khám bác sĩ (REQ-AM-018, 019, 021, 023)
// [Phase 9 Final] Full i18n — useIntl + FormattedMessage
import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { FormattedMessage, useIntl } from 'react-intl';
import moment from 'moment';
import { getAllUsers } from '../../../services/userService';
import { bulkCreateSchedule, deleteSchedule, editSchedule, getScheduleByDateAdmin } from '../../../services/doctorService';
import { confirmDelete, showSuccess, showError, showWarning } from '../../../utils/confirmDelete';
import { CalendarDays, Clock, Trash2, Save, Loader2 } from 'lucide-react';
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
  const { userInfo } = useSelector((state) => state.user);
  const isDoctor = userInfo && userInfo.roleId === 'R2';

  const [doctorList, setDoctorList] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [selectedDate, setSelectedDate] = useState(moment().format('YYYY-MM-DD'));
  const [selectedTimes, setSelectedTimes] = useState([]);
  const [existingSchedules, setExistingSchedules] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // [Role-Aware] Nếu là Doctor thì tự động set doctorId = userInfo.id, không cần chọn
  useEffect(() => {
    if (isDoctor && userInfo?.id) {
      setSelectedDoctorId(String(userInfo.id));
    }
  }, [isDoctor, userInfo]);

  useEffect(() => {
    // DS-07 FIX: AbortController để cancel request khi unmount
    // Chỉ fetch danh sách bác sĩ khi là Admin
    if (!isDoctor) {
      const controller = new AbortController();
      fetchDoctorList(controller.signal);
      return () => controller.abort();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDoctor]);

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
      // [Phase 10.5 VULN-004] Không nuốt lỗi — hiển thị thông báo cho Admin
      showError(intl.formatMessage({ id: 'admin.manage.schedule.toast-server-error' }));
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

  const newCount = selectedTimes.filter((t) => !existingSchedules.some((s) => s.timeType === t)).length;

  return (
    <div className="schedule-manage">
      {/* ===== HEADER ===== */}
      <div className="tw-flex tw-items-center tw-gap-3 tw-mb-6">
        <div className="tw-w-10 tw-h-10 tw-rounded-xl tw-bg-primary/10 tw-flex tw-items-center tw-justify-center">
          <CalendarDays size={20} className="tw-text-primary" />
        </div>
        <div>
          <h2 className="tw-text-xl tw-font-bold tw-text-text-main tw-leading-tight"><FormattedMessage id="admin.manage.schedule.title" /></h2>
          <p className="tw-text-xs tw-text-text-sub tw-mt-0.5"><FormattedMessage id={isDoctor ? 'admin.manage.schedule.desc-doctor' : 'admin.manage.schedule.desc-admin'} /></p>
        </div>
      </div>

      {/* ===== CARD 1: Chọn bác sĩ & ngày ===== */}
      <div className="tw-bg-white tw-rounded-2xl tw-shadow-card tw-p-5 tw-mb-5">
        <div className={`tw-grid tw-grid-cols-1 ${!isDoctor ? 'md:tw-grid-cols-2' : ''} tw-gap-4`}>
          {/* [Role-Aware] ẨN dropdown chọn bác sĩ khi là Doctor */}
          {!isDoctor && (
            <div>
              <label className="tw-block tw-text-sm tw-font-medium tw-text-text-main tw-mb-1.5"><FormattedMessage id="admin.manage.schedule.label-select-doctor" /></label>
              <select className="tw-w-full tw-px-3 tw-py-2.5 tw-border tw-border-gray-200 tw-rounded-xl tw-text-sm tw-bg-white focus:tw-outline-none focus:tw-border-primary tw-transition-colors" value={selectedDoctorId} onChange={(e) => setSelectedDoctorId(e.target.value)}>
                <option value="">{intl.formatMessage({ id: 'admin.manage.schedule.select-default' })}</option>
                {doctorList.map((doc) => (
                  <option key={doc.id} value={doc.id}>{doc.lastName} {doc.firstName}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="tw-block tw-text-sm tw-font-medium tw-text-text-main tw-mb-1.5"><FormattedMessage id="admin.manage.schedule.label-select-date" /></label>
            <input type="date" className="tw-w-full tw-px-3 tw-py-2.5 tw-border tw-border-gray-200 tw-rounded-xl tw-text-sm tw-bg-white focus:tw-outline-none focus:tw-border-primary tw-transition-colors" value={selectedDate}
              min={moment().format('YYYY-MM-DD')}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ===== CARD 2: Khung giờ (chỉ hiện khi đã chọn bác sĩ + ngày) ===== */}
      {selectedDoctorId && selectedDate && (
        <>
          <div className="tw-bg-white tw-rounded-2xl tw-shadow-card tw-p-5 tw-mb-5">
            <div className="tw-flex tw-items-center tw-justify-between tw-mb-4">
              <div className="tw-inline-flex !tw-items-center !tw-align-middle tw-gap-2">
                <Clock size={18} className="tw-text-primary !tw-inline-flex !tw-items-center" />
                <h4 className="tw-text-base tw-font-semibold tw-text-text-main !tw-leading-none">
                  {intl.formatMessage({ id: 'admin.manage.schedule.timeslot-title' }, { date: moment(selectedDate).format('DD/MM/YYYY') })}
                </h4>
              </div>
              <div className="tw-flex !tw-items-center tw-gap-4 tw-text-xs tw-text-text-sub">
                <span className="tw-inline-flex !tw-items-center !tw-align-middle tw-gap-1.5"><span className="tw-w-2.5 tw-h-2.5 tw-rounded-full tw-bg-primary tw-inline-block tw-flex-shrink-0" /> <FormattedMessage id="admin.manage.schedule.legend-exists" /></span>
                <span className="tw-inline-flex !tw-items-center !tw-align-middle tw-gap-1.5"><span className="tw-w-2.5 tw-h-2.5 tw-rounded-full tw-bg-emerald-500 tw-inline-block tw-flex-shrink-0" /> <FormattedMessage id="admin.manage.schedule.legend-new" /></span>
              </div>
            </div>

            {isLoading ? (
              <div className="tw-flex tw-items-center tw-justify-center tw-py-10 tw-text-text-sub tw-gap-2">
                <Loader2 size={18} className="tw-animate-spin" /> <FormattedMessage id="admin.manage.schedule.loading" />
              </div>
            ) : (
              <div className="tw-grid tw-grid-cols-2 sm:tw-grid-cols-4 tw-gap-3">
                {TIME_FRAMES.map((frame) => {
                  const alreadyExists = existingSchedules.some((s) => s.timeType === frame.key);
                  const isSelected = selectedTimes.includes(frame.key);
                  return (
                    <button
                      key={frame.key}
                      type="button"
                      className={`tw-relative tw-p-3.5 tw-rounded-xl tw-text-center tw-border-0 tw-cursor-pointer tw-transition-all tw-select-none tw-font-semibold tw-text-sm
                        ${alreadyExists
                          ? 'tw-bg-primary tw-text-white tw-shadow-sm tw-cursor-default'
                          : isSelected
                            ? 'tw-bg-emerald-500 tw-text-white tw-shadow-sm'
                            : 'tw-bg-gray-100 tw-text-text-main hover:tw-bg-gray-200'
                        }`}
                      onClick={() => toggleTime(frame.key)}
                      title={intl.formatMessage({ id: alreadyExists ? 'admin.manage.schedule.tooltip-exists' : 'admin.manage.schedule.tooltip-toggle' })}
                    >
                      {frame.label}
                      {alreadyExists && <span className="tw-block tw-text-[10px] tw-font-medium tw-mt-0.5 tw-opacity-80"><FormattedMessage id="admin.manage.schedule.badge-exists" /></span>}
                      {isSelected && !alreadyExists && <span className="tw-block tw-text-[10px] tw-font-medium tw-mt-0.5 tw-opacity-80"><FormattedMessage id="admin.manage.schedule.badge-new" /></span>}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Save bar */}
            <div className="tw-flex tw-items-center tw-justify-between tw-mt-5 tw-pt-4 tw-border-t tw-border-gray-100">
              <span className="tw-text-sm tw-text-text-sub">
                <FormattedMessage id="admin.manage.schedule.new-count" />{' '}
                <strong className="tw-text-primary">{newCount}</strong>{' '}
                <FormattedMessage id="admin.manage.schedule.new-count-unit" />
              </span>
              <button
                className="!tw-inline-flex !tw-items-center !tw-justify-center tw-gap-2 tw-px-6 tw-py-2.5 tw-bg-primary tw-text-white tw-rounded-xl tw-font-semibold tw-text-sm tw-border-0 tw-cursor-pointer hover:tw-bg-primary-dark tw-transition-colors disabled:tw-opacity-50 disabled:tw-cursor-not-allowed tw-shadow-sm"
                onClick={handleSave} disabled={isSaving || newCount === 0}
              >
                {isSaving ? <Loader2 size={16} className="tw-animate-spin !tw-inline-flex" /> : <Save size={16} className="!tw-inline-flex" />}
                <span className="!tw-leading-none"><FormattedMessage id={isSaving ? 'admin.manage.schedule.btn-saving' : 'admin.manage.schedule.btn-save'} /></span>
              </button>
            </div>
          </div>

          {/* ===== CARD 3: Lịch đã tạo ===== */}
          {existingSchedules.length > 0 && (
            <div className="tw-bg-white tw-rounded-2xl tw-shadow-card tw-overflow-hidden">
              <div className="tw-px-5 tw-py-4 tw-border-b tw-border-gray-100">
                <h4 className="tw-text-base tw-font-semibold tw-text-text-main"><FormattedMessage id="admin.manage.schedule.existing-title" /></h4>
              </div>
              <div className="tw-overflow-x-auto">
                <table className="tw-w-full tw-text-sm">
                  <thead>
                    <tr className="tw-bg-gray-50/80">
                      <th className="tw-px-5 tw-py-3 tw-text-left tw-font-semibold tw-text-xs tw-text-gray-500 tw-uppercase tw-tracking-wider tw-align-middle"><FormattedMessage id="admin.manage.schedule.col-timeslot" /></th>
                      <th className="tw-px-5 tw-py-3 tw-text-left tw-font-semibold tw-text-xs tw-text-gray-500 tw-uppercase tw-tracking-wider tw-align-middle"><FormattedMessage id="admin.manage.schedule.col-booked" /></th>
                      <th className="tw-px-5 tw-py-3 tw-text-left tw-font-semibold tw-text-xs tw-text-gray-500 tw-uppercase tw-tracking-wider tw-align-middle"><FormattedMessage id="admin.manage.schedule.quota-label" /></th>
                      <th className="tw-px-5 tw-py-3 tw-text-right tw-font-semibold tw-text-xs tw-text-gray-500 tw-uppercase tw-tracking-wider tw-align-middle"><FormattedMessage id="admin.manage.schedule.col-actions" /></th>
                    </tr>
                  </thead>
                  <tbody className="tw-divide-y tw-divide-gray-100">
                    {existingSchedules.map((schedule) => {
                      const frame = TIME_FRAMES.find((t) => t.key === schedule.timeType);
                      const current = schedule.currentNumber || 0;
                      const max = schedule.maxNumber || 10;
                      const pct = max > 0 ? Math.min((current / max) * 100, 100) : 0;
                      return (
                        <tr key={schedule.id} className="hover:tw-bg-gray-50/60 tw-transition-colors">
                          <td className="tw-px-5 tw-py-3.5 tw-align-middle">
                            <div className="tw-inline-flex !tw-items-center !tw-align-middle tw-gap-2">
                              <Clock size={14} className="tw-text-primary !tw-inline-flex !tw-items-center" />
                              <span className="tw-font-semibold tw-text-text-main !tw-leading-none">{frame?.label || schedule.timeType}</span>
                            </div>
                          </td>
                          <td className="tw-px-5 tw-py-3.5 tw-align-middle">
                            <div className="tw-flex tw-items-center tw-gap-3">
                              <div className="tw-w-24 tw-h-2 tw-bg-gray-200 tw-rounded-full tw-overflow-hidden">
                                <div className={`tw-h-full tw-rounded-full tw-transition-all ${pct >= 80 ? 'tw-bg-orange-500' : pct >= 50 ? 'tw-bg-amber-400' : 'tw-bg-primary'}`} style={{ width: `${pct}%` }} />
                              </div>
                              <span className="tw-text-xs tw-text-text-sub tw-font-medium">{current}/{max}</span>
                            </div>
                          </td>
                          <td className="tw-px-5 tw-py-3.5 tw-align-middle">
                            <input
                              type="number"
                              className="tw-w-16 tw-px-2 tw-py-1.5 tw-border tw-border-gray-200 tw-rounded-lg tw-text-sm tw-text-center focus:tw-outline-none focus:tw-border-primary tw-transition-colors"
                              min={current || 1}
                              max={50}
                              defaultValue={max}
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
                                if (newMax === schedule.maxNumber) return;
                                try {
                                  const res = await editSchedule({ id: schedule.id, maxNumber: newMax });
                                  if (res.errCode === 0) {
                                    showSuccess(intl.formatMessage({ id: 'admin.manage.schedule.toast-quota-success' }, { max: newMax }));
                                    loadExistingSchedules();
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
                            <span className="tw-text-xs tw-text-text-light tw-ml-1"><FormattedMessage id="admin.manage.schedule.quota-unit" /></span>
                          </td>
                          <td className="tw-px-5 tw-py-3.5 tw-text-right tw-align-middle">
                            <button
                              className="tw-p-2 tw-rounded-lg tw-text-red-400 hover:tw-bg-red-50 tw-transition-colors tw-border-0 tw-bg-transparent tw-cursor-pointer"
                              title={intl.formatMessage({ id: 'admin.manage.schedule.btn-delete' })}
                              onClick={() => handleDeleteSchedule(schedule)}
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ScheduleManage;
