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
      <h2 className="manage-patient__title">
        {intl.formatMessage({ id: 'doctor.manage-patient.title' })}
      </h2>

      {/* ===== BỘ LỌC ===== */}
      <div className="manage-patient__filter">
        <div className="filter-date">
          <label>{intl.formatMessage({ id: 'doctor.manage-patient.select-date' })}</label>
          <DatePicker
            className="form-control"
            selected={new Date(currentDate)}
            onChange={handleOnChangeDatePicker}
            dateFormat="dd/MM/yyyy"
          />
        </div>

        {/* RÀNG BUỘC #2: Status Filter — REQ-DR-003 */}
        <div className="filter-status">
          <label>{intl.formatMessage({ id: 'doctor.manage-patient.filter-status' })}</label>
          <select
            className="form-control"
            value={statusFilter}
            onChange={handleStatusFilterChange}
          >
            <option value="ALL">
              {intl.formatMessage({ id: 'doctor.manage-patient.status-all' })}
            </option>
            <option value="S1">
              {intl.formatMessage({ id: 'doctor.manage-patient.status-new' })}
            </option>
            <option value="S2">
              {intl.formatMessage({ id: 'doctor.manage-patient.status-confirmed' })}
            </option>
            <option value="S3">
              {intl.formatMessage({ id: 'doctor.manage-patient.status-done' })}
            </option>
            <option value="S4">
              {intl.formatMessage({ id: 'doctor.manage-patient.status-cancelled' })}
            </option>
          </select>
        </div>
      </div>

      {/* ===== TABLE / LOADING / EMPTY ===== */}
      {/* RÀNG BUỘC #7: Loading & Empty State */}
      {isLoading ? (
        <div className="manage-patient__loading">
          <div className="spinner"></div>
          <span>{intl.formatMessage({ id: 'common.loading' })}</span>
        </div>
      ) : dataPatient && dataPatient.length > 0 ? (
        <table className="manage-patient__table">
          <thead>
            <tr>
              <th>#</th>
              <th>{intl.formatMessage({ id: 'doctor.manage-patient.col-name' })}</th>
              <th>{intl.formatMessage({ id: 'doctor.manage-patient.col-phone' })}</th>
              <th>{intl.formatMessage({ id: 'doctor.manage-patient.col-address' })}</th>
              <th>{intl.formatMessage({ id: 'doctor.manage-patient.col-gender' })}</th>
              <th>{intl.formatMessage({ id: 'doctor.manage-patient.col-time' })}</th>
              <th>{intl.formatMessage({ id: 'doctor.manage-patient.col-reason' })}</th>
              <th>{intl.formatMessage({ id: 'doctor.manage-patient.col-actions' })}</th>
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
                <tr key={item.id || index}>
                  <td>{index + 1}</td>
                  <td>{item.patientName || `${item.patientData?.lastName} ${item.patientData?.firstName}`}</td>
                  <td>{item.patientData?.phoneNumber || item.patientPhoneNumber}</td>
                  <td>{item.patientData?.address || item.patientAddress}</td>
                  <td>{genderLabel || '—'}</td>
                  <td>{timeLabel || '—'}</td>
                  <td className="reason-cell">{item.reason || '—'}</td>
                  <td className="action-cell">
                    {/* RÀNG BUỘC #5: Nút "Gửi kết quả" và "Hủy lịch" CHỈ HIỂN THỊ khi S2 */}
                    {isActionable(item) ? (
                      <>
                        <button
                          className="btn-remedy"
                          onClick={() => handleOpenRemedyModal(item)}
                          title={intl.formatMessage({ id: 'doctor.manage-patient.btn-send-remedy' })}
                        >
                          📧 {intl.formatMessage({ id: 'doctor.manage-patient.btn-send-remedy' })}
                        </button>
                        <button
                          className="btn-cancel"
                          onClick={() => handleCancelBooking(item)}
                          title={intl.formatMessage({ id: 'doctor.manage-patient.btn-cancel' })}
                        >
                          ❌ {intl.formatMessage({ id: 'doctor.manage-patient.btn-cancel' })}
                        </button>
                      </>
                    ) : (
                      /* RÀNG BUỘC #5: Trạng thái khác chỉ hiện Badge text */
                      <span className="status-badge">
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
      ) : (
        /* RÀNG BUỘC #7: Empty State với Icon 📭 */
        <div className="manage-patient__empty">
          <div className="empty-icon">📭</div>
          <p>{intl.formatMessage({ id: 'doctor.manage-patient.no-patient' })}</p>
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
