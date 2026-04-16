// src/containers/System/Doctor/ManagePatient.jsx
// Phase 8 — Doctor Dashboard: Quản lý bệnh nhân
// SRS Sections: 3.11, 3.12 | REQ: DR-001, DR-002, DR-003, DR-004, DR-011
// Version: 3.0 (Enterprise Audit Fix — Timezone Offset Edge Case)
import React, { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useIntl } from 'react-intl';
import { toast } from 'react-toastify';
import moment from 'moment';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

import { getListPatientForDoctor, cancelBooking } from '../../../services/doctorService';
import { processLogout } from '../../../redux/slices/userSlice';
import { LANGUAGES, BOOKING_STATUS } from '../../../utils/constants';
import RemedyModal from './RemedyModal';
import './ManagePatient.scss';

const ManagePatient = () => {
  const dispatch = useDispatch();
  const intl = useIntl();
  const { userInfo } = useSelector((state) => state.user);
  const language = useSelector((state) => state.app.language);

  // ===== STATE =====
  // ✅ [v3.0] Lazy initializer — chỉ tính 1 lần khi mount
  // RÀNG BUỘC #1: Chuẩn hóa Timezone UTC — 2-step: format string → moment.utc
  const [currentDate, setCurrentDate] = useState(() => {
    return moment.utc(moment().format('YYYY-MM-DD')).valueOf();
  });

  // RÀNG BUỘC #2: Lọc trạng thái — mặc định S2
  const [statusFilter, setStatusFilter] = useState('S2');
  const [dataPatient, setDataPatient] = useState([]);
  const [isOpenRemedyModal, setIsOpenRemedyModal] = useState(false);
  const [dataModal, setDataModal] = useState({});

  // RÀNG BUỘC #7: Loading state
  const [isLoading, setIsLoading] = useState(false);

  // ===== GỌI API LẦN ĐẦU + MỖI KHI currentDate HOẶC statusFilter THAY ĐỔI =====
  useEffect(() => {
    if (userInfo?.id) {
      fetchPatientList(currentDate, statusFilter);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate, statusFilter, userInfo?.id]);

  // ===== FETCH PATIENT LIST =====
  // RÀNG BUỘC #2: Lấy data theo cả currentDate và statusFilter
  const fetchPatientList = useCallback(async (date, statusId) => {
    setIsLoading(true);
    try {
      const res = await getListPatientForDoctor(userInfo.id, date, statusId);
      if (res && res.errCode === 0) {
        setDataPatient(res.data || []);
      } else {
        setDataPatient([]);
      }
    } catch (err) {
      // RÀNG BUỘC #3: Bắt lỗi 401 Session Expired
      if (err.response?.status === 401) {
        toast.error(
          intl.formatMessage({ id: 'doctor.manage-patient.session-expired' })
        );
        dispatch(processLogout());
        return;
      }
      toast.error(
        intl.formatMessage({ id: 'doctor.manage-patient.load-error' })
      );
    } finally {
      setIsLoading(false);
    }
  }, [userInfo?.id, intl, dispatch]);

  // ===== ⭐ [v3.0] XỬ LÝ DATE PICKER — CẮT TIMEZONE BẰNG STRING =====
  // RÀNG BUỘC #1: Chuẩn hóa Timezone UTC
  //
  // LOGIC 2 BƯỚC (BULLET-PROOF):
  //   Bước 1: moment(date).format('YYYY-MM-DD') → chuỗi thuần, ko timezone
  //   Bước 2: moment.utc(dateString).valueOf()  → UTC midnight timestamp
  //
  // TUYỆT ĐỐI KHÔNG truyền trực tiếp Date object vào moment.utc()
  const handleOnChangeDatePicker = (date) => {
    if (!date) return;

    // ✅ [v3.0] 2-step: String → UTC midnight
    const dateString = moment(date).format('YYYY-MM-DD'); // "2026-04-02" (pure)
    const formattedDate = moment.utc(dateString).valueOf(); // UTC midnight timestamp

    setCurrentDate(formattedDate);
    // useEffect sẽ tự gọi fetchPatientList(formattedDate, statusFilter)
  };

  // ===== DROPDOWN STATUS FILTER — REQ-DR-003 =====
  const handleStatusFilterChange = (e) => {
    setStatusFilter(e.target.value);
  };

  // ===== HỦY LỊCH HẸN — S2 → S4 =====
  // RÀNG BUỘC #4: Chống IDOR — chỉ gửi bookingId, KHÔNG gửi doctorId
  const handleCancelBooking = async (booking) => {
    // RÀNG BUỘC #4: window.confirm đa ngôn ngữ
    const isConfirm = window.confirm(
      language === LANGUAGES.VI
        ? `Bạn có chắc muốn hủy lịch hẹn của ${booking.patientName || 'bệnh nhân'}?`
        : `Are you sure you want to cancel the appointment of ${booking.patientName || 'patient'}?`
    );
    if (!isConfirm) return;

    try {
      // RÀNG BUỘC #4: Payload chỉ gửi bookingId: booking.id
      // TUYỆT ĐỐI KHÔNG gửi doctorId
      const res = await cancelBooking(booking.id, {});
      if (res && res.errCode === 0) {
        toast.success(
          intl.formatMessage({ id: 'doctor.manage-patient.cancel-success' })
        );
        // RÀNG BUỘC #4: Hủy thành công phải gọi lại fetchPatientList
        await fetchPatientList(currentDate, statusFilter);
      } else {
        toast.error(res?.message || 'Error');
      }
    } catch (err) {
      // RÀNG BUỘC #3: Bắt lỗi 401 Session Expired
      if (err.response?.status === 401) {
        toast.error(
          intl.formatMessage({ id: 'doctor.manage-patient.session-expired' })
        );
        dispatch(processLogout());
        return;
      }
      toast.error(
        intl.formatMessage({ id: 'doctor.manage-patient.cancel-error' })
      );
    }
  };

  // ===== MỞ/ĐÓNG REMEDY MODAL =====
  const handleOpenRemedyModal = (booking) => {
    setDataModal(booking);
    setIsOpenRemedyModal(true);
  };

  const handleCloseRemedyModal = () => {
    setIsOpenRemedyModal(false);
    setDataModal({});
  };

  const handleSendRemedySuccess = () => {
    handleCloseRemedyModal();
    fetchPatientList(currentDate, statusFilter);
  };

  // RÀNG BUỘC #5: Nút thao tác CHỈ HIỂN THỊ khi item.statusId === 'S2'
  const isActionable = (item) => item.statusId === BOOKING_STATUS.CONFIRMED;

  return (
    <div className="manage-patient-container">
      {/* RÀNG BUỘC #6: Đa ngôn ngữ — toàn bộ text tĩnh dùng intl.formatMessage */}
      <h2 className="tw-text-xl tw-font-bold tw-text-text-main tw-mb-5">
        {intl.formatMessage({ id: 'doctor.manage-patient.title' })}
      </h2>

      {/* ===== BỘ LỌC ===== */}
      <div className="tw-bg-white tw-rounded-card tw-shadow-card tw-p-5 tw-mb-5">
        <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 tw-gap-4">
          <div className="filter-date">
            <label className="tw-block tw-text-sm tw-font-medium tw-text-text-main tw-mb-1">{intl.formatMessage({ id: 'doctor.manage-patient.select-date' })}</label>
            <DatePicker
              className="tw-w-full tw-px-3 tw-py-2 tw-border tw-border-gray-300 tw-rounded-lg tw-text-sm"
              selected={new Date(currentDate)}
              onChange={handleOnChangeDatePicker}
              dateFormat="dd/MM/yyyy"
            />
          </div>

          {/* RÀNG BUỘC #2: Status Filter — REQ-DR-003 */}
          <div className="filter-status">
            <label className="tw-block tw-text-sm tw-font-medium tw-text-text-main tw-mb-1">{intl.formatMessage({ id: 'doctor.manage-patient.filter-status' })}</label>
            <select
              className="tw-w-full tw-px-3 tw-py-2 tw-border tw-border-gray-300 tw-rounded-lg tw-text-sm tw-bg-white focus:tw-outline-none focus:tw-border-primary"
              value={statusFilter}
              onChange={handleStatusFilterChange}
            >
              <option value="ALL">{intl.formatMessage({ id: 'doctor.manage-patient.status-all' })}</option>
              <option value="S1">{intl.formatMessage({ id: 'doctor.manage-patient.status-new' })}</option>
              <option value="S2">{intl.formatMessage({ id: 'doctor.manage-patient.status-confirmed' })}</option>
              <option value="S3">{intl.formatMessage({ id: 'doctor.manage-patient.status-done' })}</option>
              <option value="S4">{intl.formatMessage({ id: 'doctor.manage-patient.status-cancelled' })}</option>
            </select>
          </div>
        </div>
      </div>

      {/* ===== TABLE / LOADING / EMPTY ===== */}
      {/* RÀNG BUỘC #7: Loading & Empty State */}
      {isLoading ? (
        <div className="tw-flex tw-items-center tw-justify-center tw-gap-3 tw-py-12 tw-text-text-sub">
          <div className="tw-animate-spin tw-w-6 tw-h-6 tw-border-3 tw-border-primary tw-border-t-transparent tw-rounded-full"></div>
          <span>{intl.formatMessage({ id: 'common.loading' })}</span>
        </div>
      ) : dataPatient && dataPatient.length > 0 ? (
        <div className="tw-bg-white tw-rounded-card tw-shadow-card tw-overflow-x-auto">
          <table className="tw-w-full tw-text-sm">
            <thead>
              <tr className="tw-bg-bg-light tw-border-b tw-border-gray-200">
                <th className="tw-px-4 tw-py-3 tw-text-left tw-font-semibold tw-text-text-sub">#</th>
                <th className="tw-px-4 tw-py-3 tw-text-left tw-font-semibold tw-text-text-sub">{intl.formatMessage({ id: 'doctor.manage-patient.col-name' })}</th>
                <th className="tw-px-4 tw-py-3 tw-text-left tw-font-semibold tw-text-text-sub">{intl.formatMessage({ id: 'doctor.manage-patient.col-phone' })}</th>
                <th className="tw-px-4 tw-py-3 tw-text-left tw-font-semibold tw-text-text-sub">{intl.formatMessage({ id: 'doctor.manage-patient.col-address' })}</th>
                <th className="tw-px-4 tw-py-3 tw-text-left tw-font-semibold tw-text-text-sub">{intl.formatMessage({ id: 'doctor.manage-patient.col-gender' })}</th>
                <th className="tw-px-4 tw-py-3 tw-text-left tw-font-semibold tw-text-text-sub">{intl.formatMessage({ id: 'doctor.manage-patient.col-time' })}</th>
                <th className="tw-px-4 tw-py-3 tw-text-left tw-font-semibold tw-text-text-sub">{intl.formatMessage({ id: 'doctor.manage-patient.col-reason' })}</th>
                <th className="tw-px-4 tw-py-3 tw-text-left tw-font-semibold tw-text-text-sub">{intl.formatMessage({ id: 'doctor.manage-patient.col-actions' })}</th>
              </tr>
            </thead>
            <tbody>
              {dataPatient.map((item, index) => {
                const genderLabel = language === LANGUAGES.VI
                  ? item.patientData?.genderData?.valueVi
                  : item.patientData?.genderData?.valueEn;
                const timeLabel = language === LANGUAGES.VI
                  ? item.timeTypeBooking?.valueVi
                  : item.timeTypeBooking?.valueEn;

                return (
                  <tr key={item.id || index} className="tw-border-b tw-border-gray-100 hover:tw-bg-primary-light/30 tw-transition-colors">
                    <td className="tw-px-4 tw-py-3 tw-text-text-sub">{index + 1}</td>
                    <td className="tw-px-4 tw-py-3 tw-font-medium tw-text-text-main">{item.patientName || `${item.patientData?.lastName} ${item.patientData?.firstName}`}</td>
                    <td className="tw-px-4 tw-py-3 tw-text-text-sub">{item.patientData?.phoneNumber || item.patientPhoneNumber}</td>
                    <td className="tw-px-4 tw-py-3 tw-text-text-sub tw-max-w-[150px] tw-truncate">{item.patientData?.address || item.patientAddress}</td>
                    <td className="tw-px-4 tw-py-3 tw-text-text-sub">{genderLabel || '—'}</td>
                    <td className="tw-px-4 tw-py-3"><span className="tw-px-2 tw-py-0.5 tw-bg-indigo-50 tw-text-indigo-700 tw-rounded-md tw-text-xs tw-font-medium">{timeLabel || '—'}</span></td>
                    <td className="tw-px-4 tw-py-3 tw-text-text-sub tw-max-w-[150px] tw-truncate">{item.reason || '—'}</td>
                    <td className="tw-px-4 tw-py-3">
                      {/* RÀNG BUỘC #5: Nút "Gửi kết quả" và "Hủy lịch" CHỈ HIỂN THỊ khi S2 */}
                      {isActionable(item) ? (
                        <div className="tw-flex tw-gap-2">
                          <button
                            className="tw-px-3 tw-py-1.5 tw-bg-emerald-50 tw-text-emerald-700 tw-rounded-md tw-text-xs tw-font-medium tw-border tw-border-emerald-200 tw-cursor-pointer hover:tw-bg-emerald-100 tw-transition-colors"
                            onClick={() => handleOpenRemedyModal(item)}
                            title={intl.formatMessage({ id: 'doctor.manage-patient.btn-send-remedy' })}
                          >
                            📧 {intl.formatMessage({ id: 'doctor.manage-patient.btn-send-remedy' })}
                          </button>
                          <button
                            className="tw-px-3 tw-py-1.5 tw-bg-red-50 tw-text-red-600 tw-rounded-md tw-text-xs tw-font-medium tw-border tw-border-red-200 tw-cursor-pointer hover:tw-bg-red-100 tw-transition-colors"
                            onClick={() => handleCancelBooking(item)}
                            title={intl.formatMessage({ id: 'doctor.manage-patient.btn-cancel' })}
                          >
                            ❌ {intl.formatMessage({ id: 'doctor.manage-patient.btn-cancel' })}
                          </button>
                        </div>
                      ) : (
                        /* RÀNG BUỘC #5: Trạng thái khác chỉ hiện Badge text */
                        <span className={`tw-px-2.5 tw-py-1 tw-rounded-badge tw-text-xs tw-font-semibold ${item.statusId === 'S3' ? 'tw-bg-emerald-100 tw-text-emerald-700' : item.statusId === 'S4' ? 'tw-bg-red-100 tw-text-red-700' : 'tw-bg-amber-100 tw-text-amber-700'}`}>
                          {item.statusId === 'S3' ? '✅ ' : item.statusId === 'S4' ? '🚫 ' : '⏳ '}
                          {item.statusId === 'S3'
                            ? (language === LANGUAGES.VI ? 'Đã khám' : 'Done')
                            : item.statusId === 'S4'
                              ? (language === LANGUAGES.VI ? 'Đã hủy' : 'Cancelled')
                              : (language === LANGUAGES.VI ? 'Chờ xác nhận' : 'Pending')}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* RÀNG BUỘC #7: Empty State với Icon 📭 */
        <div className="tw-text-center tw-py-16 tw-bg-white tw-rounded-card tw-shadow-card">
          <div className="tw-text-5xl tw-mb-3">📭</div>
          <p className="tw-text-text-sub">{intl.formatMessage({ id: 'doctor.manage-patient.no-patient' })}</p>
        </div>
      )}

      {/* ===== REMEDY MODAL ===== */}
      {isOpenRemedyModal && (
        <RemedyModal
          isOpen={isOpenRemedyModal}
          dataModal={dataModal}
          onClose={handleCloseRemedyModal}
          onSendSuccess={handleSendRemedySuccess}
        />
      )}
    </div>
  );
};

export default ManagePatient;
