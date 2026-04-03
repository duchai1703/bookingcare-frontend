# 📋 Phase 8 – File 2: ManagePatient.jsx — Giao diện & Logic

> **Component:** `src/containers/System/Doctor/ManagePatient.jsx`  
> **SRS Sections:** 3.11, 3.12 | **REQ:** DR-001, DR-002, DR-003, DR-004, DR-011  
> **Phiên bản:** 3.0 (Enterprise Audit Fix — Timezone Offset Edge Case)  
> **Mục tiêu:** Bác sĩ xem danh sách bệnh nhân đã đặt lịch theo ngày, **lọc theo trạng thái**, hủy hoặc gửi kết quả khám.

---

## CHANGELOG

| Version | Bug ID | Mô tả | Trạng thái |
|---------|--------|-------|-----------|
| v2.0 | BUG-004 | `moment(date).startOf('day')` → lệch timezone | ✅ FIXED → `moment.utc()` |
| v2.0 | BUG-005 | Thiếu `<select>` lọc statusId | ✅ FIXED → dropdown filter |
| **v3.0** | **BUG-007** | **`moment.utc(date)` vẫn lệch nếu `date` là JS Date object mang local offset** | ✅ **FIXED → format string trước** |

---

## ⚠️ [v3.0] Giải thích lỗi Timezone Offset Edge Case (BUG-007)

```
❌ TRƯỚC (v2.0) — VẪN CÒN LỖI ẨN:

  const formattedDate = moment.utc(date).startOf('day').valueOf();

  VẤN ĐỀ:
  - DatePicker trả về JS Date object: new Date("2026-04-02T00:00:00+07:00")
  - Khi truyền Date object vào moment.utc(date):
    → moment KHÔNG "chuyển đổi" sang UTC, mà "diễn giải lại" timestamp UTC của Date
    → Date("2026-04-02T00:00:00+07:00").getTime() = 1743526800000
    → moment.utc(1743526800000) = "2026-04-01T17:00:00Z"  ← VẪN LÀ NGÀY HÔM TRƯỚC!
    → .startOf('day') = "2026-04-01T00:00:00Z"  ← SAI NGÀY!

  NGUYÊN NHÂN GỐC:
  - moment.utc(dateObject) giữ nguyên timestamp gốc, chỉ đổi HIỂN THỊ sang UTC
  - Nó KHÔNG thay đổi giá trị timestamp bên trong
  - Khi DatePicker ở GMT+7 trả Date cho ngày 2/4, timestamp thực tế là 1/4 17:00 UTC
  - → startOf('day') cắt về 1/4 00:00 UTC → SAI!

✅ SAU (v3.0) — AN TOÀN TUYỆT ĐỐI:

  const dateString = moment(date).format('YYYY-MM-DD');  // "2026-04-02" (pure string)
  const formattedDate = moment.utc(dateString).valueOf(); // UTC midnight 2026-04-02

  GIẢI THÍCH:
  - Bước 1: moment(date).format('YYYY-MM-DD')
    → Chuyển Date object thành CHUỖI "2026-04-02"
    → Chuỗi này KHÔNG CÓ thông tin timezone → thuần túy là "ngày mà user đã chọn"

  - Bước 2: moment.utc("2026-04-02").valueOf()
    → Parse chuỗi thuần thành UTC midnight: "2026-04-02T00:00:00.000Z"
    → .valueOf() = 1743552000000
    → ĐÚNG cho mọi timezone!
```

### Bảng so sánh 3 cách — Cùng user ở GMT+7, chọn ngày 02/04/2026:

| Cách | Code | Kết quả UTC | Timestamp | Đúng? |
|------|------|------------|-----------|-------|
| v1.0 | `moment(date).startOf('day').valueOf()` | `2026-04-02T00:00:00+07:00` | `1743526800000` | ❌ |
| v2.0 | `moment.utc(date).startOf('day').valueOf()` | `2026-04-01T00:00:00Z` | `1743465600000` | ❌ |
| **v3.0** | `moment.utc(moment(date).format('YYYY-MM-DD')).valueOf()` | `2026-04-02T00:00:00Z` | `1743552000000` | ✅ |

---

## 1. Mô tả giao diện

ManagePatient là component chính của Doctor Dashboard, hiển thị trong `SystemLayout` ở phần `<Outlet />`.

```
┌────────────────────────────────────────────────────────────────┐
│ 🩺 Doctor Dashboard  │  🩺 Bác sĩ │ Nguyễn Văn A            │
├──────────────────────┼─────────────────────────────────────────┤
│                      │                                         │
│ ▸ Quản lý lịch hẹn  │  📅 Quản lý lịch hẹn bệnh nhân         │
│   bệnh nhân         │  ┌──────────────────────────────────┐   │
│                      │  │  [📅 DatePicker] [Lọc: ▼ S2   ] │   │
│                      │  └──────────────────────────────────┘   │
│                      │                                         │
│                      │  ┌─────────────────────────────────────┐│
│                      │  │ # │ Tên    │ SĐT   │ Lý do │ Giờ  ││
│                      │  │ 1 │ Trần B │ 0912..│ Đau.. │ 8-9  ││
│                      │  │   │       [Gửi KQ] [Hủy]          ││
│                      │  │ 2 │ Lê C   │ 0987..│ Khám..│ 9-10 ││
│                      │  │   │       [Gửi KQ] [Hủy]          ││
│                      │  └─────────────────────────────────────┘│
│                      │                                         │
│                      │  (hoặc: 📭 Không có bệnh nhân hôm nay) │
└──────────────────────┴─────────────────────────────────────────┘
```

---

## 2. Cấu trúc State

```javascript
// STATE CỦA ManagePatient.jsx — v3.0
const [currentDate, setCurrentDate] = useState(() => {
  // ✅ [FIX v3.0] format sang string trước → ép UTC midnight
  return moment.utc(moment().format('YYYY-MM-DD')).valueOf();
});
const [statusFilter, setStatusFilter] = useState('S2');   // Filter trạng thái
const [dataPatient, setDataPatient] = useState([]);       // Mảng booking data
const [isOpenRemedyModal, setIsOpenRemedyModal] = useState(false);
const [dataModal, setDataModal] = useState({});            // Booking item đang chọn
const [isLoading, setIsLoading] = useState(false);         // Loading table
```

### Giải thích chi tiết:

| State | Kiểu | Mô tả |
|-------|------|-------|
| `currentDate` | `number` | Timestamp UTC midnight (ms). **v3.0:** `moment.utc(moment().format('YYYY-MM-DD')).valueOf()` |
| `statusFilter` | `string` | Trạng thái lọc: `'S2'` mặc định, `'S1'`, `'S3'`, `'S4'`, hoặc `'ALL'` |
| `dataPatient` | `Array<Booking>` | Danh sách booking kèm nested data |
| `isOpenRemedyModal` | `boolean` | Điều khiển hiển thị RemedyModal |
| `dataModal` | `Object` | Dữ liệu booking item khi bác sĩ nhấn "Gửi kết quả" |
| `isLoading` | `boolean` | Loading spinner khi gọi API |

---

## 3. Code hướng dẫn chi tiết

### 3.1 Import và Setup cơ bản

```jsx
// src/containers/System/Doctor/ManagePatient.jsx
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
```

---

### 3.2 ⭐ [v3.0] useEffect + useState initializer

```jsx
const ManagePatient = () => {
  const dispatch = useDispatch();
  const intl = useIntl();
  const { userInfo } = useSelector((state) => state.user);
  const language = useSelector((state) => state.app.language);

  // ===== STATE =====
  // ✅ [v3.0] Lazy initializer — chỉ tính 1 lần khi mount
  const [currentDate, setCurrentDate] = useState(() => {
    return moment.utc(moment().format('YYYY-MM-DD')).valueOf();
  });
  const [statusFilter, setStatusFilter] = useState('S2');
  const [dataPatient, setDataPatient] = useState([]);
  const [isOpenRemedyModal, setIsOpenRemedyModal] = useState(false);
  const [dataModal, setDataModal] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  // ===== GỌI API LẦN ĐẦU + MỖI KHI currentDate HOẶC statusFilter THAY ĐỔI =====
  useEffect(() => {
    if (userInfo?.id) {
      fetchPatientList(currentDate, statusFilter);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate, statusFilter, userInfo?.id]);

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
      if (err.response && err.response.status === 401) {
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
```

---

### 3.3 ⭐ [v3.0] handleOnChangeDatePicker — Format string trước, rồi mới UTC

```jsx
  // ===== ⭐ [FIX v3.0] XỬ LÝ DATE PICKER — CẮT TIMEZONE BẰNG STRING =====
  //
  // LOGIC 2 BƯỚC (BULLET-PROOF):
  //
  //   Bước 1: moment(date).format('YYYY-MM-DD')
  //   ────────────────────────────────────────────
  //   - Input: Date object từ DatePicker (VD: Thu Apr 02 2026 00:00:00 GMT+0700)
  //   - moment(date) → giữ nguyên thông tin local
  //   - .format('YYYY-MM-DD') → xuất CHUỖI thuần: "2026-04-02"
  //   - Chuỗi này KHÔNG CHỨA timezone → an toàn 100%
  //
  //   Bước 2: moment.utc("2026-04-02").valueOf()
  //   ────────────────────────────────────────────
  //   - Parse chuỗi "YYYY-MM-DD" dưới dạng UTC midnight
  //   - = "2026-04-02T00:00:00.000Z"
  //   - .valueOf() = 1743552000000
  //   - ĐÚNG cho user ở BẤT KỲ timezone nào

  const handleOnChangeDatePicker = (date) => {
    if (!date) return;

    // ✅ [v3.0] 2-step: String → UTC midnight
    const dateString = moment(date).format('YYYY-MM-DD'); // "2026-04-02" (pure)
    const formattedDate = moment.utc(dateString).valueOf(); // UTC midnight timestamp

    setCurrentDate(formattedDate);
    // useEffect sẽ tự gọi fetchPatientList(formattedDate, statusFilter)
  };
```

> ⚠️ **Tại sao v2.0 vẫn sai?**
>
> ```javascript
> // v2.0: moment.utc(date).startOf('day').valueOf()
> //
> // date = new Date("2026-04-02T00:00:00+07:00")  ← DatePicker output ở GMT+7
> // date.getTime() = 1743526800000                 ← Timestamp = 2026-04-01T17:00:00Z
> //
> // moment.utc(date)
> //   → moment giữ nguyên timestamp 1743526800000
> //   → Chỉ "hiển thị" dưới dạng UTC: "2026-04-01T17:00:00Z"
> //
> // .startOf('day')
> //   → Cắt về đầu ngày UTC: "2026-04-01T00:00:00Z"
> //   → valueOf() = 1743465600000
> //   → ĐÂY LÀ NGÀY 01/04, KHÔNG PHẢI 02/04!
>
> // v3.0: moment.utc(moment(date).format('YYYY-MM-DD')).valueOf()
> //
> // moment(date).format('YYYY-MM-DD') = "2026-04-02"  ← Pure string, no timezone
> // moment.utc("2026-04-02").valueOf() = 1743552000000 ← 2026-04-02T00:00:00Z ✅
> ```

---

### 3.4 handleStatusFilterChange — Dropdown lọc trạng thái (REQ-DR-003)

```jsx
  const handleStatusFilterChange = (e) => {
    setStatusFilter(e.target.value);
  };
```

---

### 3.5 Khối try/catch khi gọi API — Bắt lỗi 401

```jsx
  // ===== PATTERN BẮT LỖI 401 — Dùng cho TẤT CẢ API calls =====
  const handleApiCall = async (apiFunction, ...args) => {
    try {
      const res = await apiFunction(...args);
      return res;
    } catch (err) {
      if (err.response && err.response.status === 401) {
        toast.error(
          intl.formatMessage({ id: 'doctor.manage-patient.session-expired' })
        );
        dispatch(processLogout());
        return null;
      }
      if (err.response && err.response.status === 403) {
        toast.error(
          intl.formatMessage({ id: 'doctor.manage-patient.no-permission' })
        );
        return null;
      }
      toast.error(
        intl.formatMessage({ id: 'doctor.manage-patient.load-error' })
      );
      console.error('>>> API error:', err);
      return null;
    }
  };
```

---

### 3.6 Handler Hủy lịch hẹn (S2 → S4)

```jsx
  const handleCancelBooking = async (booking) => {
    const isConfirm = window.confirm(
      language === LANGUAGES.VI
        ? `Bạn có chắc muốn hủy lịch hẹn của ${booking.patientName || 'bệnh nhân'}?`
        : `Are you sure you want to cancel the appointment of ${booking.patientName || 'patient'}?`
    );
    if (!isConfirm) return;

    try {
      const res = await cancelBooking(booking.id, {});
      if (res && res.errCode === 0) {
        toast.success(
          intl.formatMessage({ id: 'doctor.manage-patient.cancel-success' })
        );
        await fetchPatientList(currentDate, statusFilter);
      } else {
        toast.error(res?.message || 'Error');
      }
    } catch (err) {
      if (err.response?.status === 401) {
        toast.error(intl.formatMessage({ id: 'doctor.manage-patient.session-expired' }));
        dispatch(processLogout());
        return;
      }
      toast.error(intl.formatMessage({ id: 'doctor.manage-patient.cancel-error' }));
    }
  };
```

---

### 3.7 Handler mở RemedyModal

```jsx
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
```

---

### 3.8 Khung UI JSX — Table + Status Filter + Empty State

```jsx
  const isActionable = (item) => item.statusId === BOOKING_STATUS.CONFIRMED;

  return (
    <div className="manage-patient-container">
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

        {/* Status Filter — REQ-DR-003 */}
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

      {/* ===== TABLE ===== */}
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
                      <span className="status-badge">
                        {item.statusId === 'S3' ? '✅' : item.statusId === 'S4' ? '🚫' : '⏳'}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <div className="manage-patient__empty">
          <div className="empty-icon">📭</div>
          <p>{intl.formatMessage({ id: 'doctor.manage-patient.no-patient' })}</p>
        </div>
      )}

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
```

---

## 4. Data Flow Diagram

```
                  ┌──────────────────────────────────────────┐
                  │           ManagePatient.jsx               │
                  │                                          │
  User chọn ngày  │  DatePicker → date (JS Date object)     │
  ─────────────►  │    │                                     │
                  │    ▼                                     │
                  │  handleOnChangeDatePicker                 │
                  │    │                                     │
                  │    ▼  Bước 1: moment(date)               │
                  │       .format('YYYY-MM-DD')              │  ← [v3.0]
                  │       = "2026-04-02" (pure string)       │
                  │    │                                     │
                  │    ▼  Bước 2: moment.utc("2026-04-02")   │  ← [v3.0]
                  │       .valueOf() = 1743552000000         │
                  │    │                                     │
                  │    ▼  setCurrentDate(1743552000000)      │
                  │    │                                     │
  User đổi filter │    │   setStatusFilter(value)            │
  ─────────────►  │    │     │                               │
                  │    ▼     ▼                               │
                  │  useEffect [currentDate, statusFilter]    │
                  │    │                                     │
                  │    ▼                                     │
                  │  fetchPatientList(date, statusId)         │
                  │    │                                     │
                  │    ▼  Table | EmptyState                  │
                  └──────────────────────────────────────────┘
```

---

## 5. Lưu ý quan trọng

### 5.1 IDOR Prevention
- Frontend gửi `doctorId` trong URL chỉ để routing, backend **BỎ QUA**.
- Backend controller luôn dùng `req.user.id` từ JWT token.

### 5.2 ⭐ [v3.0] UTC Date — Quy tắc vàng
```
KHÔNG BAO GIỜ truyền JS Date object trực tiếp vào moment.utc().
LUÔN LUÔN đi qua .format('YYYY-MM-DD') trước để cắt timezone.
```

### 5.3 Status Filter UX
- Mặc định **S2** — trạng thái bác sĩ thao tác nhiều nhất.
- Booking S3/S4/S1 chỉ hiện badge, **KHÔNG** có nút thao tác.

---

> **Tiếp theo:** [Phase8_02_RemedyModal_UI.md](./Phase8_02_RemedyModal_UI.md) — Modal gửi kết quả khám
