# 📋 Phase 8 – File 6: Translations (i18n) và Test Cases

> **Files:** `src/translations/vi.json`, `src/translations/en.json`  
> **Mục tiêu:** Thêm i18n keys cho Doctor Dashboard, bảng test cases chi tiết từng bước.

---

## 1. JSON Keys — Copy-paste được luôn

### 1.1 Vietnamese (`vi.json`) — Thêm vào cuối file

```json
{
  "doctor.manage-patient.title": "Quản lý lịch hẹn bệnh nhân",
  "doctor.manage-patient.select-date": "Chọn ngày khám",
  "doctor.manage-patient.filter-status": "Lọc trạng thái",
  "doctor.manage-patient.status-all": "Tất cả",
  "doctor.manage-patient.status-confirmed": "Đã xác nhận",
  "doctor.manage-patient.status-done": "Đã khám xong",
  "doctor.manage-patient.status-cancelled": "Đã hủy",

  "doctor.manage-patient.col-name": "Tên bệnh nhân",
  "doctor.manage-patient.col-phone": "Số điện thoại",
  "doctor.manage-patient.col-address": "Địa chỉ",
  "doctor.manage-patient.col-gender": "Giới tính",
  "doctor.manage-patient.col-time": "Khung giờ",
  "doctor.manage-patient.col-reason": "Lý do khám",
  "doctor.manage-patient.col-actions": "Thao tác",

  "doctor.manage-patient.btn-send-remedy": "Gửi kết quả",
  "doctor.manage-patient.btn-cancel": "Hủy lịch",
  "doctor.manage-patient.no-patient": "Không có bệnh nhân nào trong ngày này",

  "doctor.manage-patient.remedy-title": "Gửi kết quả khám bệnh",
  "doctor.manage-patient.patient-name": "Bệnh nhân",
  "doctor.manage-patient.email-label": "Email bệnh nhân",
  "doctor.manage-patient.image-label": "Đính kèm ảnh kết quả (JPEG/PNG, tối đa 5MB)",
  "doctor.manage-patient.btn-send": "Gửi",
  "doctor.manage-patient.sending": "Đang gửi...",

  "doctor.manage-patient.send-success": "Gửi kết quả khám thành công!",
  "doctor.manage-patient.send-error": "Gửi kết quả thất bại, vui lòng thử lại.",
  "doctor.manage-patient.cancel-success": "Hủy lịch hẹn thành công!",
  "doctor.manage-patient.cancel-error": "Hủy lịch thất bại, vui lòng thử lại.",
  "doctor.manage-patient.load-error": "Lỗi tải danh sách bệnh nhân!",
  "doctor.manage-patient.session-expired": "Phiên đăng nhập đã hết hạn! Vui lòng đăng nhập lại.",
  "doctor.manage-patient.no-permission": "Bạn không có quyền truy cập chức năng này!",
  "doctor.manage-patient.email-required": "Vui lòng nhập email bệnh nhân!",
  "doctor.manage-patient.image-required": "Vui lòng đính kèm ảnh kết quả khám!"
}
```

### 1.2 English (`en.json`) — Thêm vào cuối file

```json
{
  "doctor.manage-patient.title": "Patient Appointment Management",
  "doctor.manage-patient.select-date": "Select date",
  "doctor.manage-patient.filter-status": "Filter by status",
  "doctor.manage-patient.status-all": "All",
  "doctor.manage-patient.status-confirmed": "Confirmed",
  "doctor.manage-patient.status-done": "Done",
  "doctor.manage-patient.status-cancelled": "Cancelled",

  "doctor.manage-patient.col-name": "Patient Name",
  "doctor.manage-patient.col-phone": "Phone Number",
  "doctor.manage-patient.col-address": "Address",
  "doctor.manage-patient.col-gender": "Gender",
  "doctor.manage-patient.col-time": "Time Slot",
  "doctor.manage-patient.col-reason": "Reason",
  "doctor.manage-patient.col-actions": "Actions",

  "doctor.manage-patient.btn-send-remedy": "Send Result",
  "doctor.manage-patient.btn-cancel": "Cancel",
  "doctor.manage-patient.no-patient": "No patients found for this date",

  "doctor.manage-patient.remedy-title": "Send Medical Examination Results",
  "doctor.manage-patient.patient-name": "Patient",
  "doctor.manage-patient.email-label": "Patient Email",
  "doctor.manage-patient.image-label": "Attach result image (JPEG/PNG, max 5MB)",
  "doctor.manage-patient.btn-send": "Send",
  "doctor.manage-patient.sending": "Sending...",

  "doctor.manage-patient.send-success": "Medical results sent successfully!",
  "doctor.manage-patient.send-error": "Failed to send results, please try again.",
  "doctor.manage-patient.cancel-success": "Appointment cancelled successfully!",
  "doctor.manage-patient.cancel-error": "Failed to cancel appointment, please try again.",
  "doctor.manage-patient.load-error": "Error loading patient list!",
  "doctor.manage-patient.session-expired": "Session expired! Please log in again.",
  "doctor.manage-patient.no-permission": "You do not have permission to access this feature!",
  "doctor.manage-patient.email-required": "Please enter patient email!",
  "doctor.manage-patient.image-required": "Please attach the examination result image!"
}
```

### 1.3 Hướng dẫn thêm vào file hiện tại

```diff
  // vi.json — Thêm TRƯỚC dấu "}" cuối cùng
  
  "patient.social-plugin.like-share": "Thích và chia sẻ",
+
+ "doctor.manage-patient.title": "Quản lý lịch hẹn bệnh nhân",
+ "doctor.manage-patient.select-date": "Chọn ngày khám",
  ... (tất cả keys ở mục 1.1)
  }
```

> ⚠️ **LƯU Ý:** Đảm bảo dấu phẩy `,` sau key cuối cùng hiện tại trước khi thêm block mới. JSON không cho phép trailing comma.

---

## 2. Bảng Test Cases chi tiết

### TC-01: Hiển thị danh sách bệnh nhân ngày hiện tại (REQ-DR-011)

| Bước | Hành động | Kết quả mong đợi | Verify |
|------|-----------|------------------|--------|
| 1 | Đăng nhập với tài khoản Doctor (role R2) | Redirect đến `/doctor-dashboard/manage-patient` | URL chính xác |
| 2 | Quan sát DatePicker | Ngày mặc định = ngày hiện tại | DatePicker hiển thị đúng ngày |
| 3 | Quan sát Table | Hiển thị danh sách bệnh nhân có booking S2 trong ngày | Có dữ liệu nếu DB có |
| 4 | Chuyển ngôn ngữ sang English | Tất cả label/header chuyển sang tiếng Anh | Column headers = "Patient Name", "Phone Number", v.v. |
| 5 | Chuyển lại tiếng Việt | Labels trở về tiếng Việt | Column headers = "Tên bệnh nhân", "Số điện thoại", v.v. |

---

### TC-02: Lọc bệnh nhân theo ngày (REQ-DR-002)

| Bước | Hành động | Kết quả mong đợi | Verify |
|------|-----------|------------------|--------|
| 1 | Click vào DatePicker | Calendar popup hiện ra | Visual |
| 2 | Chọn một ngày KHÁC có booking S2 | Table reload với data ngày mới | Số lượng bệnh nhân thay đổi |
| 3 | Chọn ngày KHÔNG có booking | Empty State hiện: "📭 Không có bệnh nhân nào trong ngày này" | Empty state visible |
| 4 | Quay lại ngày ban đầu | Data cũ hiện lại | Consistent |

---

### TC-03: ⭐ UTC Timezone Consistency

> **Đây là test QUAN TRỌNG NHẤT — nơi bug hay xảy ra nhất.**

| Bước | Hành động | Kết quả mong đợi | Verify |
|------|-----------|------------------|--------|
| 1 | Mở DevTools → Console | — | — |
| 2 | Trong ManagePatient.jsx, thêm log: `console.log('currentDate:', currentDate)` | — | — |
| 3 | Chọn ngày 02/04/2026 trong DatePicker | Console hiện timestamp | — |
| 4 | **Tính toán UTC midnight** | `moment('2026-04-02').startOf('day').valueOf()` = **một giá trị cụ thể** | — |
| 5 | So sánh Console log với giá trị tính toán | **PHẢI KHỚP** | ✅ Nếu khớp → UTC đúng |
| 6 | Kiểm tra Network tab — API call params | `?date=<timestamp>` phải khớp với giá trị ở bước 5 | ✅ Nếu khớp → query đúng |
| 7 | Kiểm tra DB — Booking.date | Giá trị `date` trong DB phải khớp | MySQL Workbench verify |

**Cách verify nhanh trong Console:**

```javascript
// Chạy trong browser DevTools
const testDate = new Date('2026-04-02');
console.log('Local getTime():', testDate.getTime());              // ❌ Có thể sai
console.log('Moment UTC:',     moment('2026-04-02').startOf('day').valueOf()); // ✅ Đúng
```

**Bảng ví dụ timezone:**

| Timezone | `new Date('2026-04-02').getTime()` | `moment('2026-04-02').startOf('day').valueOf()` | Match DB? |
|----------|--------|--------|-----------|
| GMT+0 | 1743552000000 | 1743552000000 | ✅ |
| GMT+7 | 1743526800000 | 1743552000000 | ❌ vs ✅ |
| GMT-5 | 1743570000000 | 1743552000000 | ❌ vs ✅ |

> **Kết luận:** `moment().startOf('day').valueOf()` luôn cho kết quả **nhất quán** bất kể timezone.

---

### TC-04: ⭐ Lỗi 401 — Token hết hạn (REQ-AU-006)

| Bước | Hành động | Kết quả mong đợi | Verify |
|------|-----------|------------------|--------|
| 1 | Đăng nhập Doctor bình thường | Dashboard hiển thị | ✅ |
| 2 | **Mô phỏng token hết hạn:** Mở DevTools → Application → Local Storage → Tìm key `persist:root` → Sửa `accessToken` thành giá trị sai (VD: `"expired_token_xxx"`) | — | — |
| 3 | Chọn ngày mới trong DatePicker (trigger API call) | — | — |
| 4 | Quan sát Toast notification | Hiện toast đỏ: "Phiên đăng nhập đã hết hạn! Vui lòng đăng nhập lại." | ✅ Toast error |
| 5 | Quan sát redirect | Tự động chuyển về `/login` | ✅ URL = `/login` |
| 6 | Kiểm tra Redux state | `isLoggedIn = false`, `userInfo = null`, `accessToken = null` | DevTools Redux |

**Cách mô phỏng nhanh hơn (backend):**

```javascript
// Tạm thời đổi JWT_SECRET trong .env thành giá trị khác
// → Mọi token hiện tại sẽ bị invalid
JWT_SECRET=wrong_secret_for_testing
// Restart backend → tất cả request sẽ trả 401
```

---

### TC-05: Gửi kết quả khám thành công (REQ-DR-008, 009, 010)

| Bước | Hành động | Kết quả mong đợi | Verify |
|------|-----------|------------------|--------|
| 1 | Trong bảng, nhấn "📧 Gửi kết quả" cho một bệnh nhân | RemedyModal mở ra | Modal visible |
| 2 | Kiểm tra email pre-fill | Email tự động điền từ `booking.patientData.email` | Email hiển thị đúng |
| 3 | Click "📎 Chọn ảnh" → chọn file JPEG < 5MB | Ảnh preview hiện trong modal | Preview visible |
| 4 | Thử chọn file > 5MB | Toast error: "Ảnh không được vượt quá 5MB!" | Toast hiện, ảnh KHÔNG set |
| 5 | Thử chọn file .gif | Toast error: "Chỉ hỗ trợ ảnh JPEG và PNG!" | Toast hiện, ảnh KHÔNG set |
| 6 | Chọn lại ảnh JPEG hợp lệ | Preview update | ✅ |
| 7 | Nhấn "📧 Gửi" | Nút chuyển thành "🔄 Đang gửi..." + disabled | Button disabled + spinner |
| 8 | Đợi 3-10 giây (gửi email) | Toast xanh: "Gửi kết quả khám thành công!" | ✅ Toast success |
| 9 | Modal tự đóng | Modal close | ✅ |
| 10 | Table reload | Bệnh nhân vừa gửi biến mất khỏi danh sách (đã chuyển S3) | ✅ Count giảm 1 |
| 11 | Kiểm tra email bệnh nhân | Email đến với file ảnh đính kèm | Open email + download file |

---

### TC-06: ⭐ Data Leak Modal Test

> **Test này kiểm tra xem modal có bị lẫn data giữa 2 bệnh nhân không.**

| Bước | Hành động | Kết quả mong đợi | Verify |
|------|-----------|------------------|--------|
| 1 | Nhấn "Gửi kết quả" cho bệnh nhân A (email: a@gmail.com) | Modal mở, email = a@gmail.com | ✅ |
| 2 | Chọn ảnh kết quả (ảnh A) | Preview ảnh A hiện | ✅ |
| 3 | **ĐÓNG modal** (nhấn X hoặc Hủy) — KHÔNG gửi | Modal đóng | ✅ |
| 4 | Nhấn "Gửi kết quả" cho bệnh nhân B (email: b@gmail.com) | Modal mở | — |
| 5 | Kiểm tra email | **PHẢI LÀ b@gmail.com** (KHÔNG phải a@gmail.com) | ✅ Email = b@gmail.com |
| 6 | Kiểm tra ảnh preview | **KHÔNG CÓ ảnh** (đã clear) | ✅ Preview trống |
| 7 | Nếu email = a@gmail.com hoặc ảnh A vẫn hiện | **❌ BUG: Data leak!** Phải fix `handleCloseModal` | ❌ FAIL |

**Root cause nếu fail:** `handleCloseModal` không clear `setEmail('')` và `setImageBase64('')`.

---

### TC-07: Hủy lịch hẹn (REQ-DR-004)

| Bước | Hành động | Kết quả mong đợi | Verify |
|------|-----------|------------------|--------|
| 1 | Nhấn "❌ Hủy lịch" cho bệnh nhân | Confirm dialog hiện: "Bạn có chắc muốn hủy...?" | Dialog visible |
| 2 | Nhấn "Cancel" trên confirm | Không có gì xảy ra | ✅ Data unchanged |
| 3 | Nhấn "❌ Hủy lịch" lần nữa → Nhấn "OK" | Toast xanh: "Hủy lịch hẹn thành công!" | ✅ Toast success |
| 4 | Table reload | Bệnh nhân biến mất khỏi danh sách | ✅ Count giảm 1 |
| 5 | Kiểm tra DB: Booking.statusId | = 'S4' | MySQL verify |
| 6 | Kiểm tra DB: Schedule.currentNumber | Giảm 1 so với trước khi hủy | MySQL verify |

---

### TC-08: Phân quyền — Ngăn truy cập trái phép

| Bước | Hành động | Kết quả mong đợi | Verify |
|------|-----------|------------------|--------|
| 1 | Đăng nhập với tài khoản Admin (R1) | Redirect đến `/system/user-manage` | ✅ |
| 2 | Truy cập trực tiếp URL `/doctor-dashboard/manage-patient` | Redirect về `/login` hoặc trang lỗi | ✅ PrivateRoute chặn |
| 3 | Đăng nhập Patient (R3) | Redirect về `/` | ✅ |
| 4 | Truy cập `/doctor-dashboard/manage-patient` | Redirect về `/login` | ✅ PrivateRoute chặn |

---

### TC-09: IDOR/BOLA Test (API Level)

> **Test này dùng Postman hoặc curl để kiểm tra bảo mật API.**

| Bước | Hành động | Kết quả mong đợi | Verify |
|------|-----------|------------------|--------|
| 1 | Đăng nhập Doctor A → lấy JWT token A | Token A | — |
| 2 | Đăng nhập Doctor B → lấy JWT token B | Token B | — |
| 3 | Gọi `GET /api/v1/doctors/999/patients?date=xxx` với token A | Trả về booking của Doctor A (KHÔNG phải 999) | ✅ Data scope đúng |
| 4 | Gọi `POST /api/v1/bookings/<bookingIdCuaDoctorB>/remedy` với token A | `errCode: 3` — "Không tìm thấy lịch hẹn" | ✅ IDOR blocked |
| 5 | Gọi `PATCH /api/v1/bookings/<bookingIdCuaDoctorB>/cancel` với token A | `errCode: 3` — "Không tìm thấy lịch hẹn" | ✅ IDOR blocked |

**Curl ví dụ:**

```bash
# Doctor A cố gắng hủy booking của Doctor B
curl -X PATCH \
  http://localhost:8080/api/v1/bookings/42/cancel \
  -H "Authorization: Bearer <TOKEN_DOCTOR_A>" \
  -H "Content-Type: application/json"

# Expected response:
# {"errCode": 3, "message": "Không tìm thấy lịch hẹn hoặc bạn không có quyền hủy!"}
```

---

### TC-10: Empty State

| Bước | Hành động | Kết quả mong đợi | Verify |
|------|-----------|------------------|--------|
| 1 | Chọn ngày trong tương lai xa (VD: 01/01/2027) | Không có booking | — |
| 2 | Quan sát giao diện | Hiện "📭 Không có bệnh nhân nào trong ngày này" | ✅ Empty state |
| 3 | Không có bảng/hàng trống | Bảng KHÔNG hiện (ẩn hoàn toàn) | ✅ Table hidden |
| 4 | Chuyển ngôn ngữ sang English | "📭 No patients found for this date" | ✅ i18n |

---

## 3. Tổng hợp Test Coverage

| # | Test Case | SRS REQ | Priority | Risk Area |
|---|-----------|---------|----------|-----------|
| TC-01 | Hiển thị mặc định | DR-011 | High | Basic functionality |
| TC-02 | Lọc theo ngày | DR-002 | High | Date filtering |
| TC-03 | UTC timezone | DR-002 | **Critical** | Timezone bug |
| TC-04 | Lỗi 401 expired | AU-006 | **Critical** | Security |
| TC-05 | Gửi kết quả | DR-008, 009, 010 | High | Core feature |
| TC-06 | Data leak modal | — | **Critical** | State management bug |
| TC-07 | Hủy lịch S2→S4 | DR-004 | High | State machine |
| TC-08 | Phân quyền UI | AU-004, 005 | High | Authorization |
| TC-09 | IDOR/BOLA API | — | **Critical** | Security |
| TC-10 | Empty state | — | Medium | UX |

---

## 4. Regression Checklist (từ GĐ trước)

Sau khi implement Phase 8, verify các tính năng trước KHÔNG bị ảnh hưởng:

| # | Tính năng | File | Verify |
|---|-----------|------|--------|
| 1 | Patient booking flow | `BookingModal.jsx` | Đặt lịch vẫn hoạt động |
| 2 | Email verification (S1→S2) | `VerifyEmail.jsx` | Click link xác nhận vẫn OK |
| 3 | Admin CRUD users | `UserManage.jsx` | Tạo/sửa/xóa user vẫn OK |
| 4 | Admin Doctor info | `DoctorManage.jsx` | Lưu thông tin bác sĩ vẫn OK |
| 5 | Schedule management | `ScheduleManage.jsx` | Tạo/xóa lịch khám vẫn OK |
| 6 | Homepage top doctors | `TopDoctor.jsx` | Hiển thị bác sĩ nổi bật vẫn OK |
| 7 | Login/Logout | `Login.jsx`, `userSlice.js` | Đăng nhập/xuất vẫn OK |

---

> **📌 Hoàn tất tài liệu Phase 8 — Doctor Dashboard Development Guide.**  
> Quay lại: [Phase8_00_Overview.md](./Phase8_00_Overview.md)
