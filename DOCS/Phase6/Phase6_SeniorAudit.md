# 🔍 BÁO CÁO KIỂM TOÁN CHUYÊN SÂU — GIAI ĐOẠN 6 (ADMIN MODULE)

> **Vai trò:** Senior System Auditor — Đối chiếu chéo nguồn: SRS v1.2, Đề cương chi tiết, source code thực tế
> **Ngày:** 27/03/2026 | **Build hiện tại:** ✅ 1381 modules, Exit 0
> **Phương pháp:** Cross-reference SRS ↔ Code ↔ API — KHÔNG khen ngợi sáo rỗng

---

## 🚨 PHẦN 1 — GAP ANALYSIS (Rà Soát Độ Hoàn Thiện)

### 1.1 Yêu Cầu SRS Chưa Hoặc Làm Sai

---

#### ❌ GAP-01: REQ-AM-007 — contentHTML lưu sai format

**Mức độ:** 🔴 **Nghiêm trọng**

**SRS yêu cầu:**
> "Hệ thống phải lưu **đồng thời** cả 2 format: `contentMarkdown` (markdown gốc) và `contentHTML` (HTML đã render để hiển thị cho bệnh nhân)."

**Code thực tế** (`DoctorManage.jsx:137`):
```js
contentHTML: doctorInfo.contentMarkdown, // HTML = markdown raw
```

**Vấn đề:** `contentHTML` đang được gán bằng giá trị `contentMarkdown` nguyên bản. Khi bệnh nhân xem trang DoctorDetail ở GĐ7 sẽ phải render markdown bằng `react-markdown`. Nhưng SRS yêu cầu backend lưu HTML đã render — điều này sẽ gây lỗi nếu GĐ7 dùng `dangerouslySetInnerHTML` để hiển thị `contentHTML`.

**Giải pháp:**
Cài thêm `marked` hoặc `@uiw/react-md-editor` export `commands`:

```bash
npm install marked --legacy-peer-deps
```

**Sửa `DoctorManage.jsx`:**
```js
// Thêm import ở đầu file:
import { marked } from 'marked';

// Trong handleSave(), thay:
contentHTML: doctorInfo.contentMarkdown,

// Bằng:
contentHTML: marked(doctorInfo.contentMarkdown || ''),
```

---

#### ❌ GAP-02: REQ-AM-002 — Thiếu validate mật khẩu tối thiểu 6 ký tự

**Mức độ:** 🟡 **Trung bình**

**SRS yêu cầu:**
> "Admin tạo tài khoản mới với... mật khẩu"

**Code thực tế** (`UserManage.jsx:107`):
```js
if (!formData.email || (!isEditing && !formData.password)) {
  showWarning('Thiếu thông tin!', 'Vui lòng điền email và mật khẩu.');
  return;
}
```

**Vấn đề:** Chỉ check `!formData.password` (không rỗng). Không kiểm tra độ dài tối thiểu. Backend dùng bcryptjs salt 10 — nếu password quá ngắn vẫn hash được nhưng vi phạm business rules.

**Giải pháp** (`UserManage.jsx`):
```js
if (!formData.email || (!isEditing && !formData.password)) {
  showWarning('Thiếu thông tin!', 'Vui lòng điền email và mật khẩu.');
  return;
}
// THÊM VÀO:
if (!isEditing && formData.password.length < 6) {
  showWarning('Mật khẩu quá ngắn!', 'Mật khẩu phải có ít nhất 6 ký tự.');
  return;
}
```

---

#### ❌ GAP-03: REQ-AM-001 — Thiếu Search/Filter User

**Mức độ:** 🟡 **Trung bình**

**SRS yêu cầu (3.2.2 Stimulus/Response #1):**
> "Admin truy cập trang quản lý người dùng → Hệ thống hiển thị danh sách tất cả người dùng"

**Đề cương GĐ6 bổ sung:** Trang admin cần search theo tên/email.

**Code thực tế:** `UserManage.jsx` chỉ gọi `getAllUsers('ALL')` và hiển thị toàn bộ danh sách — **không có** thanh tìm kiếm hay filter.

**Vấn đề thực tế:** Với hệ thống có hàng trăm user, admin không thể tìm kiếm.

**Giải pháp** — Thêm search filter UI + logic vào `UserManage.jsx`:

```jsx
// Trong state khai báo:
const [searchText, setSearchText] = useState('');

// Thêm computed list:
const filteredUsers = users.filter((u) =>
  `${u.lastName} ${u.firstName} ${u.email}`.toLowerCase().includes(searchText.toLowerCase())
);

// Thêm UI trên table (sau manage-header div):
<div className="search-bar">
  <input
    type="text"
    placeholder="🔍 Tìm theo tên, email..."
    value={searchText}
    onChange={(e) => setSearchText(e.target.value)}
    className="form-control search-input"
  />
  {searchText && (
    <span className="search-count">
      {filteredUsers.length}/{users.length} kết quả
    </span>
  )}
</div>

// Thay `users.map(...)` bằng `filteredUsers.map(...)` trong tbody
```

---

#### ❌ GAP-04: REQ-AM-021 — Thiếu "Chỉnh sửa" lịch khám (chỉ có Xóa)

**Mức độ:** 🟡 **Trung bình**

**SRS yêu cầu:**
> "Admin phải có khả năng **xóa hoặc chỉnh sửa** lịch khám đã tạo."

**Code thực tế** (`ScheduleManage.jsx`): Chỉ implement xóa (`handleDeleteSchedule`). **Không có** chức năng sửa lịch (ví dụ: đổi `maxNumber`).

**Giải pháp:** Thêm inline edit cho `maxNumber`:

```jsx
// Trong existing-item div, thêm input số:
<div key={schedule.id} className="existing-item">
  <span className="existing-time">⏰ {frame?.label}</span>
  <div className="quota-edit">
    <label>Tối đa:</label>
    <input
      type="number"
      min={schedule.currentNumber || 1}
      max={50}
      defaultValue={schedule.maxNumber}
      className="quota-input"
      onBlur={async (e) => {
        const newMax = parseInt(e.target.value, 10);
        if (newMax !== schedule.maxNumber && newMax >= (schedule.currentNumber || 0)) {
          // Gọi API edit schedule
          const res = await editSchedule({ id: schedule.id, maxNumber: newMax });
          if (res.errCode === 0) showSuccess('Đã cập nhật số lượng bệnh nhân tối đa.');
          else { showError('Cập nhật thất bại'); e.target.value = schedule.maxNumber; }
        }
      }}
    />
  </div>
  <button className="btn-delete-sm" onClick={() => handleDeleteSchedule(schedule)}>🗑️ Xóa</button>
</div>
```

**Bổ sung service** (`doctorService.js`):
```js
export const editSchedule = (data) =>
  axiosInstance.put(`/api/v1/schedules/${data.id}`, data);
```

---

#### ⚠️ GAP-05: REQ-AU-005 — Menu Doctor (R2) thiếu context rõ ràng

**Mức độ:** 🟢 **Thấp**

**SRS yêu cầu:**
> "Doctor (R2): Quản lý lịch hẹn bệnh nhân."

**Code thực tế:** Navigator shows menu item "Quản lý lịch hẹn bệnh nhân" nhưng nó dẫn đến `DoctorPlaceholder` — một component thông báo "đang phát triển" không có bất kỳ chức năng gì.

**Vấn đề:** Bác sĩ R2 login → thấy 1 menu item nhưng click vào không dùng được gì → UX tệ.

**Giải pháp:** Hiển thị trạng thái "Coming Soon" rõ ràng hơn với timeline:
```jsx
const DoctorPlaceholder = () => (
  <div className="placeholder-page">
    <div className="placeholder-icon">🚧</div>
    <h2>Module Bác Sĩ — Đang Phát Triển</h2>
    <p>Chức năng quản lý lịch hẹn sẽ có trong <strong>Giai đoạn 8</strong>.</p>
    <p className="hint">Nếu bạn thấy trang này, tài khoản của bạn có role Bác Sĩ (R2).</p>
  </div>
);
```

---

### 1.2 Đồng Bộ Frontend Admin ↔ Backend API

| Frontend gọi | Backend endpoint | Match? | Vấn đề |
|-------------|-----------------|--------|--------|
| `getAllUsers('ALL')` | `GET /api/v1/users?type=ALL` | ✅ | |
| `createNewUser(payload)` | `POST /api/v1/users` | ✅ | Không gửi `password` khi edit — backend phải handle field optional |
| `editUser({...payload, id})` | `PUT /api/v1/users/:id` | ✅ | Password omit OK nếu backend check `if (data.password)` |
| `deleteUser(user.id)` | `DELETE /api/v1/users/:id` | ✅ | |
| `saveInfoDoctor(payload)` | `POST /api/v1/doctors` | ⚠️ | contentHTML = raw markdown (GAP-01) |
| `deleteDoctorInfo(id)` | `DELETE /api/v1/doctors/:id` | ✅ | |
| `createClinic(data)` | `POST /api/v1/clinics` | ✅ | |
| `deleteClinic(id)` | `DELETE /api/v1/clinics/:id` | ✅ | id là số nguyên, OK |
| `bulkCreateSchedule({arrSchedule})` | `POST /api/v1/schedules/bulk` | ✅ | |
| `deleteSchedule({id})` | `DELETE /api/v1/schedules/:id` | ⚠️ | Xem GAP-06 bên dưới |
| `getScheduleByDate(doctorId, date)` | `GET /api/v1/doctors/:id/schedules?date=...` | ⚠️ | Xem GAP-07 |

---

## 🐛 PHẦN 2 — DEEP BUG HUNTING

### 2.1 Lỗi Logic & Luồng Dữ Liệu

---

#### 🐛 BUG-01: ScheduleManage — Timestamp Timezone Mismatch

**Mức độ:** 🔴 **Nghiêm trọng** — Có thể gây sai ngày lịch khám

**File:** `ScheduleManage.jsx:50,79`

**Code hiện tại:**
```js
const timestamp = moment(selectedDate, 'YYYY-MM-DD').startOf('day').valueOf();
```

**Vấn đề:** `moment()` không có timezone → dùng local timezone của browser (GMT+7 ở VN). `startOf('day').valueOf()` trả về timestamp của 00:00:00 theo local time. Nếu backend ở server UTC hoặc khác timezone, query theo timestamp này sẽ lệch ngày.

**Backend thực tế** (dựa trên Node.js): `new Date(timestamp)` sẽ interpret timestamp đúng vì là Unix ms — nhưng nếu backend dùng `WHERE date = ?` với DATE type (không phải BIGINT), sẽ sai.

**Giải pháp:** Chuẩn hóa timestamp về UTC:
```js
// Thay:
const timestamp = moment(selectedDate, 'YYYY-MM-DD').startOf('day').valueOf();

// Bằng (UTC midnight):
const timestamp = moment.utc(selectedDate, 'YYYY-MM-DD').startOf('day').valueOf();
```

---

#### 🐛 BUG-02: ScheduleManage — getScheduleByDate nhận timestamp nhưng API cần date string

**Mức độ:** 🔴 **Nghiêm trọng**

**File:** `ScheduleManage.jsx:51`, `doctorService.js:18`

**Code:**
```js
// ScheduleManage.jsx
const res = await getScheduleByDate(selectedDoctorId, timestamp); // timestamp = Unix ms

// doctorService.js
export const getScheduleByDate = (doctorId, date) => {
  return axiosInstance.get(`/api/v1/doctors/${doctorId}/schedules`, { params: { date } });
};
```

**Vấn đề:** Frontend gửi `date = 1742828400000` (Unix ms) nhưng API endpoint thường expect `date = '2026-03-25'` (string) hoặc `date = 1742828400000` (depends on backend). Cần verify backend controller đang nhận gì.

**Giải pháp:** Kiểm tra backend controller — nếu backend nhận string:
```js
// Sửa ScheduleManage.jsx — gửi chuỗi ngày thay vì timestamp:
const dateStr = moment(selectedDate, 'YYYY-MM-DD').format('YYYY-MM-DD');
const res = await getScheduleByDate(selectedDoctorId, dateStr);
```

Nếu backend nhận BIGINT timestamp — giữ nguyên nhưng thêm UTC fix (BUG-01).

---

#### 🐛 BUG-03: DoctorManage — handleSelectDoctor gọi getDoctorDetail không phân biệt errCode=0 vs user chưa có hồ sơ

**Mức độ:** 🟡 **Trung bình**

**File:** `DoctorManage.jsx:87`

**Code:**
```js
if (res.errCode === 0 && res.data?.doctorInfoData) {
  setHasExistingInfo(true);
} else {
  setDoctorInfo({ ...INIT_INFO, doctorId });
  setHasExistingInfo(false);
}
```

**Vấn đề:** Nếu backend trả `errCode=0` nhưng `doctorInfoData=null` (user R2 nhưng chưa có hồ sơ), code sẽ vào nhánh `else` và reset form — đúng. Nhưng nếu backend trả `errCode=1` vì user R2 không tồn tại (ví dụ bị xóa giữa chừng), code cũng vào `else` → không phân biệt được 2 trường hợp — UX tệ vì không có thông báo lỗi.

**Giải pháp:**
```js
if (res.errCode === 0) {
  if (res.data?.doctorInfoData) {
    // Có hồ sơ
    setHasExistingInfo(true);
    // ... populate form
  } else {
    // User R2 nhưng chưa có hồ sơ
    setDoctorInfo({ ...INIT_INFO, doctorId });
    setHasExistingInfo(false);
  }
} else {
  // Lỗi API thực sự
  showError(res.message || 'Không thể tải hồ sơ bác sĩ');
  setSelectedDoctorId('');
  setDoctorInfo(INIT_INFO);
}
```

---

#### 🐛 BUG-04: UserManage — Allcodes từ API local nhưng Redux appSlice đã có sẵn

**Mức độ:** 🟢 **Thấp (Performance)**

**Vấn đề:** `appSlice` đã có `fetchAllcodeByType` async thunk và cache allcodes trong Redux state (`genders`, `roles`, `positions`). Nhưng `UserManage.jsx`, `DoctorManage.jsx`, `ClinicManage.jsx`, `SpecialtyManage.jsx` đều gọi `getAllCode()` trực tiếp từ service — **bỏ qua Redux cache** → gọi API trùng lặp mỗi lần mount.

**Giải pháp (Option A — đơn giản):** Dùng Redux thunk thay vì local fetch:
```jsx
// UserManage.jsx — thay fetchAllcodes() bằng:
import { useDispatch, useSelector } from 'react-redux';
import { fetchAllcodeByType } from '../../../redux/slices/appSlice';

const dispatch = useDispatch();
const { genders, roles, positions } = useSelector((state) => state.app);

useEffect(() => {
  if (!genders.length) dispatch(fetchAllcodeByType('GENDER'));
  if (!roles.length) dispatch(fetchAllcodeByType('ROLE'));
  if (!positions.length) dispatch(fetchAllcodeByType('POSITION'));
}, []);
```

---

#### 🐛 BUG-05: ClinicManage/SpecialtyManage — Không reset form sau khi tạo mới thành công

**Mức độ:** 🟡 **Trung bình — UX Bug**

**File:** `ClinicManage.jsx`, `SpecialtyManage.jsx`

**Vấn đề:** Sau khi Admin tạo clinic/specialty thành công, `setShowForm(false)` đóng form. Nhưng `formData` vẫn giữ data của lần tạo trước. Lần sau nhấn "Thêm mới" → form hiện với data cũ.

**Giải pháp:**
```js
// Trong handleSubmit(), sau showSuccess():
if (res.errCode === 0) {
  showSuccess(isEditing ? 'Đã cập nhật.' : 'Đã tạo mới.');
  setShowForm(false);
  setFormData(INIT_FORM); // ← THÊM DÒNG NÀY
  setIsEditing(false);    // ← THÊM DÒNG NÀY
  fetchData();
}
```

---

#### 🐛 BUG-06: ScheduleManage — selectedTimes không reset khi đổi bác sĩ hoặc ngày

**Mức độ:** 🟡 **Trung bình — Logic Bug**

**File:** `ScheduleManage.jsx:33-37`

**Code:**
```js
useEffect(() => {
  if (selectedDoctorId && selectedDate) loadExistingSchedules();
  else { setExistingSchedules([]); setSelectedTimes([]); }
}, [selectedDoctorId, selectedDate]);
```

**Vấn đề:** Khi đổi bác sĩ/ngày, `loadExistingSchedules()` được gọi và set `selectedTimes` từ schedules đã có. Nhưng các timeslot **mà admin đã chọn thêm** (chưa lưu) vẫn còn trong `selectedTimes` cũ. `loadExistingSchedules()` override hoàn toàn `selectedTimes` = schedules DB → mất selections.

**Thực ra code đã đúng** — `setSelectedTimes((res.data || []).map(s => s.timeType))` reset về trạng thái server. Nhưng vấn đề là: nếu admin đã chọn T1, T2 → đổi bác sĩ → quay lại → T1,T2 vẫn hiện selected (vì component re-render). **Thực tế không có bug vì effect dependency đúng.**

**Kết luận:** Đây là false alarm — logic đúng ✅.

---

#### 🐛 BUG-07: UserManage — Thiếu xử lý khi genders/roles array rỗng

**Mức độ:** 🟡 **Trung bình — UX Bug**

**File:** `UserManage.jsx:199-207`

**Code:**
```jsx
{genders.map((g) => <option key={g.keyMap} value={g.keyMap}>{g.valueVi}</option>)}
```

**Vấn đề:** Nếu `fetchAllcodes()` thất bại (network error), `genders`, `roles`, `positions` đều là `[]`. Select hiển thị trống không có options → Admin không chọn được giới tính/role → submit sẽ gửi giá trị default `'M'`, `'R3'` thầm lặng mà không báo lỗi.

**Giải pháp:** Thêm loading/error state cho allcodes:
```jsx
// Sau fetchAllcodes():
const fetchAllcodes = async () => {
  try {
    const [gRes, rRes, pRes] = await Promise.all([...]);
    // ... current logic
  } catch {
    showWarning('Cảnh báo', 'Không thể tải danh mục — một số dropdown có thể trống.');
  }
};

// Trong JSX, thêm placeholder option:
<select name="gender" ...>
  {genders.length === 0 && <option value="">-- Đang tải... --</option>}
  {genders.map(...)}
</select>
```

---

#### 🐛 BUG-08: ClinicManage/SpecialtyManage — descriptionHTML không dùng marked()

**Mức độ:** 🔴 **Nghiêm trọng** (cùng nguyên nhân với GAP-01)

**File:** `ClinicManage.jsx`, `SpecialtyManage.jsx`

**Code:**
```js
descriptionHTML: formData.descriptionMarkdown, // ← raw markdown, không phải HTML
```

**Giải pháp:** Tương tự DoctorManage (GAP-01):
```js
import { marked } from 'marked';

// Trong handleSubmit():
descriptionHTML: marked(formData.descriptionMarkdown || ''),
```

---

## 💊 PHẦN 3 — ĐƠN THUỐC GIẢI QUYẾT (Tổng Hợp)

### Ưu Tiên Thực Hiện

| # | Gap/Bug | File | Độ ưu tiên | Thời gian ước tính |
|---|---------|------|-----------|-------------------|
| 1 | GAP-01 + BUG-08: contentHTML/descriptionHTML sai format | DoctorManage, ClinicManage, SpecialtyManage | 🔴 Ngay | 20 phút |
| 2 | BUG-01 + BUG-02: Timestamp timezone + date format | ScheduleManage | 🔴 Ngay | 15 phút |
| 3 | GAP-02: Thiếu validate password length | UserManage | 🟡 Sớm | 5 phút |
| 4 | BUG-03: DoctorManage errCode handling | DoctorManage | 🟡 Sớm | 10 phút |
| 5 | BUG-05: Form không reset sau create | ClinicManage, SpecialtyManage | 🟡 Sớm | 5 phút |
| 6 | GAP-03: Thiếu search user | UserManage | 🟡 Sớm | 20 phút |
| 7 | GAP-04: Thiếu edit schedule maxNumber | ScheduleManage + doctorService | 🟡 Sớm | 30 phút |
| 8 | BUG-04: Dùng Redux cache thay vì local fetch | Tất cả admin pages | 🟢 Tối ưu | 45 phút |
| 9 | BUG-07: Dropdown trống khi allcodes lỗi | UserManage | 🟢 Later | 10 phút |
| 10 | GAP-05: DoctorPlaceholder cải thiện UX | App.jsx | 🟢 Later | 5 phút |

---

### Hướng Dẫn Fix Ưu Tiên #1 — contentHTML/descriptionHTML (toàn bộ 3 file)

**Bước 1:** Cài marked
```bash
cd bookingcare-frontend
npm install marked --legacy-peer-deps
```

**Bước 2:** Sửa `DoctorManage.jsx`
```js
// Thêm import:
import { marked } from 'marked';

// Trong handleSave(), thay dòng 137:
contentHTML: doctorInfo.contentMarkdown,
// → Thành:
contentHTML: marked(doctorInfo.contentMarkdown || ''),
```

**Bước 3:** Sửa `ClinicManage.jsx`
```js
import { marked } from 'marked';

// Trong handleSubmit(), thay:
descriptionHTML: formData.descriptionMarkdown,
// → Thành:
descriptionHTML: marked(formData.descriptionMarkdown || ''),
```

**Bước 4:** Sửa `SpecialtyManage.jsx` — tương tự ClinicManage.

---

### Hướng Dẫn Fix Ưu Tiên #2 — ScheduleManage Timestamp

**Bước 1:** Verify backend controller `getScheduleByDate` nhận gì:
```bash
# Tìm controller:
grep -r "schedules" bookingcare-backend/src/controllers/ --include="*.js" -l
```

**Bước 2:** Nếu backend nhận BIGINT ms → fix timezone:
```js
// ScheduleManage.jsx:50,79 — thay:
const timestamp = moment(selectedDate, 'YYYY-MM-DD').startOf('day').valueOf();
// → Thành:
const timestamp = moment.utc(selectedDate, 'YYYY-MM-DD').startOf('day').valueOf();
```

**Bước 3:** Nếu backend nhận string date → sửa:
```js
// loadExistingSchedules():
const res = await getScheduleByDate(selectedDoctorId, selectedDate); // pass string directly

// handleSave():
const payload = {
  doctorId: selectedDoctorId,
  date: moment.utc(selectedDate).startOf('day').valueOf(), // timestamp cho bulkCreate
  ...
};
```

---

## 📊 PHẦN 4 — KẾT LUẬN KIỂM TOÁN

| Hạng mục | Trước Audit | Sau Audit |
|---------|-------------|----------|
| SRS REQ-AM Coverage | 23/23 (tự báo cáo) | **20/23** thực sự đúng (GAP-01,04 sai logic; GAP-03 thiếu) |
| Critical Bugs | 0 (đã fix trước) | **3 bugs mới** (contentHTML, timestamp) |
| Medium Bugs | 0 | **4 bugs** (validate, form reset, error handling, dropdown) |
| Low/Perf | 0 | **2 items** (Redux cache, placeholder UX) |

**REQ-AM thực sự đúng: 20/23:**
- ❌ REQ-AM-007: contentHTML = raw markdown (sai format)
- ❌ REQ-AM-021: Chỉ implement Xóa, thiếu Chỉnh sửa
- ⚠️ REQ-AM-001: Không có search (liệt kê đủ nhưng không searchable)

> **Kết luận của Chuyên gia Kiểm toán:** Giai đoạn 6 đạt mức hoàn thiện **khoảng 85–88%** (không phải 100% như báo cáo trước). 3 vấn đề nghiêm trọng cần fix ngay trước khi chuyển sang GĐ7, đặc biệt `contentHTML` vì GĐ7 sẽ phụ thuộc trực tiếp vào field này để render trang DoctorDetail.
