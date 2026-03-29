# Hướng Dẫn Chi Tiết – Giai Đoạn 7: Phát Triển Module Bệnh Nhân

**Thời gian:** 17/04/2026 – 30/04/2026 (14 ngày)  
**Kết quả mong đợi:** Chức năng đặt lịch hoàn chỉnh: form → email xác thực → xác nhận  
**Tham chiếu:** [SRS_Document.md](file:///c:/Users/USER/Documents/DOAN1/bookingcare-backend/DOCS/SRS_Document.md) | [Đề cương](file:///c:/Users/USER/Documents/DOAN1/bookingcare-backend/DOCS/Detailed_Project_Proposal_for_Language_Learning_Application.md)

---

## Mục lục

1. [Tổng quan giai đoạn](#1-tổng-quan-giai-đoạn)
2. [Mapping SRS – Yêu cầu chức năng](#2-mapping-srs--yêu-cầu-chức-năng)
3. [Kiến trúc thành phần & File Map](#3-kiến-trúc-thành-phần--file-map)
4. [Component 1: Trang Chi Tiết Bác Sĩ (DoctorDetail)](#4-component-1-trang-chi-tiết-bác-sĩ-doctordetail)
5. [Component 2: Lịch Khám Theo Ngày (DoctorSchedule)](#5-component-2-lịch-khám-theo-ngày-doctorschedule)
6. [Component 3: Thông Tin Phòng Khám & Giá Khám (DoctorExtraInfo)](#6-component-3-thông-tin-phòng-khám--giá-khám-doctorextrainfo)
7. [Component 4: Modal Đặt Lịch Khám (BookingModal)](#7-component-4-modal-đặt-lịch-khám-bookingmodal)
8. [Component 5: Trang Xác Nhận Email (VerifyEmail)](#8-component-5-trang-xác-nhận-email-verifyemail)
9. [Component 6: Chi Tiết Chuyên Khoa (SpecialtyDetail)](#9-component-6-chi-tiết-chuyên-khoa-specialtydetail)
10. [Component 7: Chi Tiết Phòng Khám (ClinicDetail)](#10-component-7-chi-tiết-phòng-khám-clinicdetail)
11. [Redux – Patient Slice](#11-redux--patient-slice)
12. [Đa ngôn ngữ (i18n)](#12-đa-ngôn-ngữ-i18n)
13. [Tích hợp Facebook Social Plugin](#13-tích-hợp-facebook-social-plugin)
14. [Kiểm thử & Verification](#14-kiểm-thử--verification)
15. [Lịch trình 14 ngày](#15-lịch-trình-14-ngày)

---

## 1. Tổng quan giai đoạn

### Công việc chính (theo đề cương – Giai đoạn 7):

- Hiển thị bác sĩ nổi bật, chi tiết bác sĩ
- Xây dựng hệ thống lịch hẹn theo thời gian
- Thiết kế modal đặt lịch khám bệnh
- Tích hợp Nodemailer gửi email xác thực

### Tiền đề đã hoàn thành (từ các giai đoạn trước):

| Giai đoạn                 | Đã hoàn thành                                                                                      | Tái sử dụng cho GĐ7                                                                 |
| ------------------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| **GĐ4 – Backend**         | Tất cả API endpoints (SRS 5.2)                                                                     | API: getDoctorDetail, getScheduleByDate, postBookAppointment, verifyBookAppointment |
| **GĐ5 – Frontend cơ bản** | HomePage (Banner, TopDoctor, Specialty, MedicalFacility), Header, Footer, đa ngôn ngữ, Redux store | Tái sử dụng Header/Footer layout, i18n, Redux slices                                |
| **GĐ6 – Module Admin**    | CRUD User, Doctor, Clinic, Specialty, Schedule                                                     | Dữ liệu đã có sẵn trong DB để hiển thị cho bệnh nhân                                |

### Placeholder files cần thay thế:

| File hiện tại                 | Trạng thái  | Cần làm               |
| ----------------------------- | ----------- | --------------------- |
| `Patient/DoctorDetail.jsx`    | Placeholder | **Hoàn thiện đầy đủ** |
| `Patient/SpecialtyDetail.jsx` | Placeholder | **Hoàn thiện đầy đủ** |
| `Patient/ClinicDetail.jsx`    | Placeholder | **Hoàn thiện đầy đủ** |
| `Patient/VerifyEmail.jsx`     | Placeholder | **Hoàn thiện đầy đủ** |

---

## 2. Mapping SRS – Yêu cầu chức năng

### 2.0 Luồng 4 bước đặt lịch (SRS 3.9 – BẮT BUỘC TUÂN THỦ)

> **[CROSS-VALIDATION ADDED]** SRS 1.3 định nghĩa quy trình 4 bước đặt lịch. Mỗi bước ánh xạ rõ ràng sang component:

```
BƯỚC 1 – Chọn bác sĩ & khung giờ:
  → Route: /doctor/:id
  → Component: DoctorDetail + DoctorSchedule
  → Action: User click vào khung giờ → setShowBookingModal(true)

BƯỚC 2 – Điền form thông tin:
  → Component: BookingModal (hiển thị overlay)
  → Fields: fullName*, email*, phoneNumber*, address*, reason*, birthday*, gender*
  → Validate TRƯỚC KHI submit (REQ-PT-014, 021)

BƯỚC 3 – Xác nhận đặt lịch (submit):
  → Action: dispatch(postBookAppointment(bookingData))
  → API: POST /api/v1/bookings
  → Success: Toast "Đặt lịch thành công! Vui lòng kiểm tra email" (REQ-PT-023)

BƯỚC 4 – Xác nhận qua email:
  → Route: /verify-booking?token=xxx&doctorId=yyy
  → Component: VerifyEmail
  → Action: dispatch(verifyBooking({ token, doctorId })) → S1 → S2
```

### Bảng mapping đầy đủ REQ → Component → API:

| REQ ID         | Mô tả yêu cầu                                                  | Component Frontend                | API Backend                                              | Priority |
| -------------- | -------------------------------------------------------------- | --------------------------------- | -------------------------------------------------------- | -------- |
| **REQ-PT-007** | Hiển thị hồ sơ chuyên môn bác sĩ                               | `DoctorDetail`                    | `GET /api/v1/doctors/:id`                                | High     |
| **REQ-PT-008** | Hiển thị bài viết Markdown bác sĩ                              | `DoctorDetail` (react-markdown)   | `GET /api/v1/doctors/:id` → contentHTML                  | High     |
| **REQ-PT-009** | Hiển thị lịch khám khả dụng theo ngày                          | `DoctorSchedule`                  | `GET /api/v1/doctors/:id/schedules?date=`                | High     |
| **REQ-PT-010** | Hiển thị giá khám (Allcode priceId)                            | `DoctorExtraInfo`                 | `GET /api/v1/doctors/:id` → priceData                    | High     |
| **REQ-PT-011** | Hiển thị thông tin phòng khám                                  | `DoctorExtraInfo`                 | `GET /api/v1/doctors/:id` → clinicData                   | High     |
| **REQ-PT-012** | Modal/form đặt lịch khi chọn khung giờ                         | `BookingModal`                    | — (UI only)                                              | High     |
| **REQ-PT-013** | Form: Họ tên, Email, SĐT, Lý do, Ngày sinh, Giới tính, Địa chỉ | `BookingModal`                    | — (UI only)                                              | High     |
| **REQ-PT-014** | Validate dữ liệu đầu vào                                       | `BookingModal`                    | Backend cũng validate                                    | High     |
| **REQ-PT-015** | Lưu lịch hẹn vào database                                      | `BookingModal` → dispatch         | `POST /api/v1/bookings`                                  | High     |
| **REQ-PT-016** | Gửi email xác thực sau đặt lịch                                | Backend tự động                   | `emailService.sendEmailBooking()`                        | High     |
| **REQ-PT-017** | Gửi qua Nodemailer Gmail SMTP                                  | Backend                           | `emailService.js`                                        | High     |
| **REQ-PT-018** | Email chứa: tên BS, chuyên khoa, ngày/giờ, link xác nhận       | Backend                           | `emailService.js`                                        | High     |
| **REQ-PT-019** | Link xác nhận duy nhất                                         | Backend (UUID token)              | `patientService.js`                                      | High     |
| **REQ-PT-020** | Cập nhật trạng thái S1→S2 khi click link                       | `VerifyEmail`                     | `POST /api/v1/bookings/verify`                           | High     |
| **REQ-PT-021** | Thông báo lỗi validate rõ ràng                                 | `BookingModal`                    | —                                                        | High     |
| **REQ-PT-022** | Không cho đặt lịch trùng                                       | Backend kiểm tra                  | `patientService.js`                                      | High     |
| **REQ-PT-023** | Thông báo thành công + hướng dẫn check email                   | `BookingModal`                    | —                                                        | High     |
| **REQ-PT-006** | Xem danh sách BS theo phòng khám/chuyên khoa                   | `SpecialtyDetail`, `ClinicDetail` | `GET /api/v1/specialties/:id`, `GET /api/v1/clinics/:id` | High     |
| **REQ-SI-001** | Nút Like Facebook trên trang BS                                | `DoctorDetail`                    | —                                                        | Medium   |
| **REQ-SI-002** | Nút Share Facebook                                             | `DoctorDetail`                    | —                                                        | Medium   |

---

## 3. Kiến trúc thành phần & File Map

### 3.1 Cấu trúc thư mục mục tiêu (sau khi hoàn thành GĐ7)

```
bookingcare-frontend/src/
├── containers/
│   └── Patient/
│       ├── DoctorDetail.jsx          ← [SỬA] Thay placeholder
│       ├── DoctorDetail.scss         ← [MỚI]
│       ├── DoctorSchedule.jsx        ← [MỚI] Component con
│       ├── DoctorSchedule.scss       ← [MỚI]
│       ├── DoctorExtraInfo.jsx       ← [MỚI] Component con
│       ├── DoctorExtraInfo.scss      ← [MỚI]
│       ├── BookingModal.jsx          ← [MỚI] Modal đặt lịch
│       ├── BookingModal.scss         ← [MỚI]
│       ├── SpecialtyDetail.jsx       ← [SỬA] Thay placeholder
│       ├── SpecialtyDetail.scss      ← [MỚI]
│       ├── ClinicDetail.jsx          ← [SỬA] Thay placeholder
│       ├── ClinicDetail.scss         ← [MỚI]
│       ├── VerifyEmail.jsx           ← [SỬA] Thay placeholder
│       ├── VerifyEmail.scss          ← [MỚI]
│       └── SocialPlugin.jsx          ← [MỚI] Facebook Like/Share
├── redux/
│   └── slices/
│       └── doctorSlice.js            ← [SỬA] Thêm async thunks cho patient
├── translations/
│   ├── vi.json                       ← [SỬA] Thêm key mới cho module bệnh nhân
│   └── en.json                       ← [SỬA] Thêm key mới cho module bệnh nhân
└── services/
    ├── doctorService.js              ← [CÓ SẴN] getDoctorDetail, getScheduleByDate
    ├── patientService.js             ← [CÓ SẴN] postBookAppointment, postVerifyBookAppointment
    ├── specialtyService.js           ← [CÓ SẴN] getDetailSpecialtyById
    └── clinicService.js              ← [CÓ SẴN] getDetailClinicById
```

### 3.2 Sơ đồ quan hệ Component

```
DoctorDetail (trang chính)
├── DoctorSchedule (lịch khám theo ngày)
│   └── BookingModal (modal đặt lịch)
├── DoctorExtraInfo (giá khám, phòng khám, bảo hiểm)
├── SocialPlugin (Like, Share Facebook)
└── contentHTML (bài viết BS – render bằng dangerouslySetInnerHTML)

SpecialtyDetail (trang chuyên khoa)
├── DoctorSchedule (tái sử dụng)
│   └── BookingModal (tái sử dụng)
└── DoctorExtraInfo (tái sử dụng)

ClinicDetail (trang phòng khám)
├── DoctorSchedule (tái sử dụng)
│   └── BookingModal (tái sử dụng)
└── DoctorExtraInfo (tái sử dụng)

VerifyEmail (trang xác nhận – độc lập)
```

### 3.3 Luồng dữ liệu (Data Flow)

```
[User clicks bác sĩ]
       │
       ▼
DoctorDetail ──GET /api/v1/doctors/:id──► Backend ──► DB
       │                                    │
       │◄──── {doctorInfo, markdown, ────────┘
       │       specialty, clinic, price}
       │
       ├──► DoctorSchedule ──GET /schedules?date──► Backend
       │         │
       │         │◄── [{timeType, currentNumber, maxNumber}]
       │         │
       │    [User chọn khung giờ]
       │         │
       │         ▼
       │    BookingModal (hiển thị)
       │         │
       │    [User điền form + submit]
       │         │
       │         ▼
       │    POST /api/v1/bookings ──► Backend
       │         │                      │
       │         │                 [Lưu DB + Gửi email]
       │         │                      │
       │         │◄── {errCode: 0} ─────┘
       │         │
       │    [Hiển thị: "Đặt lịch thành công, kiểm tra email"]
       │
       └──► DoctorExtraInfo (giá, phòng khám, thanh toán)

[User click link email]
       │
       ▼
VerifyEmail ──POST /api/v1/bookings/verify──► Backend
       │                                        │
       │                                   [Update S1→S2]
       │◄── {errCode: 0, message} ──────────────┘
       │
  [Hiển thị: "Xác nhận thành công"]
```

---

## 4. Component 1: Trang Chi Tiết Bác Sĩ (DoctorDetail)

### 4.1 Mô tả (SRS 3.8)

Trang hiển thị đầy đủ thông tin bác sĩ, gồm: hồ sơ chuyên môn, bài viết Markdown, lịch khám, giá khám, nút Like/Share.

### 4.2 Giao diện (Layout)

```
┌──────────────────────────────────────────────────────────┐
│  Header (đã có sẵn từ GĐ5)                              │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────┐  Tên bác sĩ (lastName firstName)           │
│  │  Avatar  │  Chức danh (positionData.valueVi/En)       │
│  │  (image) │  Mô tả ngắn (description)                 │
│  └─────────┘  [Like] [Share] ← Facebook Plugin           │
│                                                          │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌────────────────────┐  ┌─────────────────────────────┐ │
│  │  LỊCH KHÁM         │  │  GIÁ KHÁM                   │ │
│  │  (DoctorSchedule)  │  │  (DoctorExtraInfo)          │ │
│  │                    │  │                             │ │
│  │  [Chọn ngày ▼]    │  │  Giá: 200.000đ              │ │
│  │                    │  │  Thanh toán: Tiền mặt       │ │
│  │  ┌─────┐ ┌─────┐  │  │  Phòng khám: ABC           │ │
│  │  │ T1  │ │ T2  │  │  │  Địa chỉ: 123 Đường XYZ   │ │
│  │  │8:00 │ │9:00 │  │  │                             │ │
│  │  └─────┘ └─────┘  │  └─────────────────────────────┘ │
│  │  ┌─────┐ ┌─────┐  │                                  │
│  │  │ T3  │ │ T4  │  │                                  │
│  │  └─────┘ └─────┘  │                                  │
│  └────────────────────┘                                  │
│                                                          │
├──────────────────────────────────────────────────────────┤
│  BÀI VIẾT GIỚI THIỆU BÁC SĨ                            │
│  (contentHTML – render bằng dangerouslySetInnerHTML)     │
│  ─────────────────────────────────────────────           │
│  Nội dung Markdown đã render thành HTML...               │
│                                                          │
├──────────────────────────────────────────────────────────┤
│  BÌNH LUẬN FACEBOOK (Comment Plugin – SRS REQ-SI-003)    │
├──────────────────────────────────────────────────────────┤
│  Footer (đã có sẵn từ GĐ5)                              │
└──────────────────────────────────────────────────────────┘
```

### 4.3 Logic chính

```javascript
// File: src/containers/Patient/DoctorDetail.jsx
// SRS Sections: 3.8 (REQ-PT-007 → 011)

// 1. Lấy doctorId từ URL params (useParams)
// 2. Gọi API getDoctorDetail(id) khi mount (useEffect)
// 3. Hiển thị: avatar (base64 → image), tên, chức danh, mô tả
// 4. Render contentHTML bằng dangerouslySetInnerHTML — XEM CHÚ Ý QUAN TRỌNG BÊN DƯỚI
// 5. Mount DoctorSchedule, DoctorExtraInfo, SocialPlugin

// ⚠️ [CROSS-VALIDATION ADDED] CHÚ Ý QUAN TRỌNG – dangerouslySetInnerHTML:
// REQ-AM-007 yêu cầu Admin lưu ĐỒNG THỜI contentMarkdown VÀ contentHTML.
// Backend (saveInfoDoctor) đã render Markdown → HTML và lưu vào DB.
// Do đó Frontend PHẢI:
//   ✅ ĐÚNG: <div dangerouslySetInnerHTML={{ __html: doctor.doctorInfoData.contentHTML }} />
//   ❌ SAI:  <ReactMarkdown>{doctor.doctorInfoData.contentMarkdown}</ReactMarkdown>
//
// Lý do: Nếu dùng ReactMarkdown sẽ render 2 lần (Admin đã render 1 lần ở Backend),
// gây ra HTML entities bị escape và nội dung hiển thị sai.
// Mapping REQ: REQ-PT-008 ghi "render từ React-markdown" trong SRS là chỉ PHÍA ADMIN
// (khi Admin nhập liệu). Phía Patient display PHẢI dùng dangerouslySetInnerHTML.

// ✅ [DEEP-SCAN FIX-2] SKELETON LOADING – CHỐNG GIẬT MÀN HÌNH:
// Khi API getDoctorDetail đang chờ (isLoadingDoctor === true), trang SẼ BỊ TRẮNG
// nếu không có placeholder. Bắt buộc render Skeleton trước khi data về.
//
// STATE: const [isLoading, setIsLoading] = useState(true);
//
// Pattern:
//   if (isLoading) {
//     return (
//       <div className="doctor-detail-skeleton">
//         <div className="skeleton-avatar" />       {/* hình tròn avatar */}
//         <div className="skeleton-text long" />    {/* tên bác sĩ */}
//         <div className="skeleton-text short" />   {/* chức danh */}
//         <div className="skeleton-block" />        {/* vùng lịch khám */}
//       </div>
//     );
//   }
//   return <div className="doctor-detail">...</div>;
//
// CSS Skeleton (animation shimmer):
//   .skeleton-avatar, .skeleton-text, .skeleton-block {
//     background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
//     background-size: 200% 100%;
//     animation: shimmer 1.5s infinite;
//     border-radius: 4px;
//   }
//   @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
//
// Áp dụng tương tự cho: SpecialtyDetail, ClinicDetail khi fetch danh sách bác sĩ.

// API Response cần xử lý:
// {
//   errCode: 0,
//   data: {
//     id, email, firstName, lastName, image,
//     positionData: { valueVi, valueEn },       ← Allcode POSITION
//     Doctor_Info: {
//       specialtyId, clinicId, priceId,
//       contentHTML, contentMarkdown, description, note,
//       priceData: { valueVi, valueEn },         ← Allcode PRICE
//       paymentData: { valueVi, valueEn },        ← Allcode PAYMENT
//       provinceData: { valueVi, valueEn },       ← Allcode PROVINCE
//       specialtyData: { name },                  ← Specialty
//       clinicData: { name, address }             ← Clinic
//     }
//   }
// }
```

### 4.4 Xử lý hình ảnh BLOB (SRS Constraint #7)

```javascript
// Backend trả image dạng Buffer/BLOB
// Frontend cần convert sang base64 string để hiển thị
const imageBase64 = "";
if (doctor.image) {
  // Nếu image là Buffer object từ API
  imageBase64 = Buffer.isBuffer(doctor.image)
    ? new Buffer(doctor.image, "base64").toString("binary")
    : doctor.image;
}
// Sử dụng: <img src={imageBase64} />
// Hoặc nếu backend đã trả base64 string: dùng trực tiếp
```

---

## 5. Component 2: Lịch Khám Theo Ngày (DoctorSchedule)

### 5.1 Mô tả (SRS 3.8 – REQ-PT-009)

Component hiển thị dropdown chọn ngày và các khung giờ khả dụng (T1-T8). Khi user click vào khung giờ → mở BookingModal.

### 5.2 Props

```javascript
// Props nhận từ DoctorDetail (hoặc SpecialtyDetail/ClinicDetail):
// - doctorId: number (ID bác sĩ)
```

### 5.3 Logic chính

```javascript
// File: src/containers/Patient/DoctorSchedule.jsx
// SRS: REQ-PT-009, REQ-AM-019 (8 khung giờ T1-T8), REQ-AM-023 (maxNumber/currentNumber)

// STATE:
// - selectedDate: string (timestamp) — ngày được chọn
// - availableDays: array — danh sách 7 ngày kế tiếp
// - schedules: array — lịch khám từ API
// - showBookingModal: boolean
// - selectedTimeSlot: object — khung giờ được chọn

// 1. Tạo danh sách 7 ngày kế tiếp (bao gồm hôm nay)
//    Format: { label: "Thứ 2 - 17/04", value: timestamp }
//    ► Phải hỗ trợ đa ngôn ngữ (SRS IL-001): "Monday - 04/17" vs "Thứ 2 - 17/04"

// 2. Khi selectedDate thay đổi → gọi API:
//    getScheduleByDate(doctorId, selectedDate)

// 3. Lọc khung giờ khả dụng:
//    schedule.filter(s => s.currentNumber < s.maxNumber)
//    ► REQ-AM-023: Khi currentNumber >= maxNumber → KHÔNG hiển thị slot đó
//
// ⚠️ [CROSS-VALIDATION ADDED] UX KHI SLOT HẾT CHỖ:
//    - Khi Backend trả về slot có currentNumber >= maxNumber:
//      Option A: Không render khung giờ đó (ẩn hoàn toàn) — RECOMMENDED
//      Option B: Render nhưng disabled + text "Đã đầy" + cursor: not-allowed
//    - Nếu TẤT CẢ khung giờ trong ngày đều đầy:
//      → Hiển thị thông báo: "🚫 Bác sĩ không còn lịch trống vào ngày này."
//      → Gợi ý user chọn ngày khác trong dropdown
//    - Frontend KHÔNG NÊN hiển thị lỗi sau khi submit (quá muộn)
//      → Backend vẫn check lại (errCode: 4) nhưng UX phải proactive

// ✅ [CTO-FIX-1] LỌC KHUNG GIỜ TRONG QUÁ KHỨ (Chống bug đặt lịch quá khứ):
// Khi selectedDate là NGÀY HÔM NAY, phải lọc bỏ các khung giờ đã trôi qua.
// Bảng ánh xạ timeType → giờ bắt đầu (theo SRS REQ-AM-019):
//   const TIME_SLOT_START: { T1: 8, T2: 9, T3: 10, T4: 11, T5: 13, T6: 14, T7: 15, T8: 16 }
//
// Logic lọc kết hợp:
//   const now = moment(); // giờ hiện tại
//   const isToday = moment.utc(selectedDate).isSame(moment.utc().startOf('day'));
//   const displaySlots = availableSlots.filter(slot => {
//     if (!isToday) return true; // ngày tương lai → hiển thị hết
//     const startHour = TIME_SLOT_START[slot.timeType]; // T1 → 8
//     return now.hour() < startHour; // chỉ giữ slot chưa đến giờ
//   });
//   // Nếu displaySlots.length === 0 → hiển thị "Hết lịch khám hôm nay"

// 4. Click khung giờ → setSelectedTimeSlot(slot) + setShowBookingModal(true)

// 5. Hiển thị text khung giờ từ Allcode:
//    language === 'vi' ? slot.timeTypeData.valueVi : slot.timeTypeData.valueEn
//    T1: "8:00 – 9:00" / "8:00 AM – 9:00 AM"

// ⚠️ [CROSS-VALIDATION ADDED] BẮT BUỘC – TIMEZONE ĐỒNG BỘ VỚI BACKEND:
// Backend lưu `date` dưới dạng UNIX timestamp (milliseconds) của 00:00:00 UTC
// của ngày đó. Nếu FE gửi timestamp local (UTC+7) thì DB sẽ KHÔNG MATCH.
//
// CÁCH ĐÚNG khi tạo availableDays và khi gọi API:
//   import moment from 'moment';
//   const dateTimestamp = moment.utc(date).startOf('day').valueOf();
//   // Ví dụ: ngày 17/04/2026 (UTC+7) phải gửi = 1744934400000 (UTC 00:00)
//
// Áp dụng tại 2 điểm:
//   A. Trong getArrDays(): value của mỗi ngày PHẢI dùng moment.utc().valueOf()
//      days.push({ label, value: moment.utc(date).startOf('day').valueOf().toString() });
//   B. Khi gọi API: getScheduleByDate(doctorId, selectedDate)
//      → selectedDate đã là timestamp UTC từ bước A → dùng trực tiếp
//   C. Khi submit BookingModal: bookingData.date = props.date (đã là UTC timestamp)
//      → KHÔNG được dùng new Date().setHours(0,0,0,0) vì sẽ ra UTC+7 local time
```

### 5.4 Giao diện

```
┌─────────────────────────────────────┐
│  📅 LỊCH KHÁM                      │
│                                     │
│  [Hôm nay - 17/04 ▼]   ← Dropdown  │
│                                     │
│  ┌──────┐ ┌──────┐ ┌──────┐        │
│  │ T1   │ │ T2   │ │ T3   │        │
│  │8:00  │ │9:00  │ │10:00 │        │
│  │-9:00 │ │-10:00│ │-11:00│        │
│  └──────┘ └──────┘ └──────┘        │
│  ┌──────┐ ┌──────┐                 │
│  │ T5   │ │ T6   │  (T4 đã đầy)   │
│  │13:00 │ │14:00 │                 │
│  └──────┘ └──────┘                 │
│                                     │
│  🗓 Chọn và đặt lịch (miễn phí)    │
└─────────────────────────────────────┘
```

---

## 6. Component 3: Thông Tin Phòng Khám & Giá Khám (DoctorExtraInfo)

### 6.1 Mô tả (SRS 3.8 – REQ-PT-010, 011)

Hiển thị giá khám, phương thức thanh toán, tên phòng khám, địa chỉ phòng khám.

### 6.2 Props

```javascript
// Props:
// - doctorId: number
// Hoặc nhận trực tiếp extraInfo object từ parent
```

### 6.3 Logic chính

```javascript
// File: src/containers/Patient/DoctorExtraInfo.jsx
// SRS: REQ-PT-010 (giá khám), REQ-PT-011 (phòng khám)

// Dữ liệu từ Doctor_Info (đã có trong API getDoctorDetail):
// - priceData.valueVi / valueEn    → "200.000đ" / "200,000 VND"
// - paymentData.valueVi / valueEn  → "Tiền mặt" / "Cash"
// - provinceData.valueVi / valueEn → "TP. Hồ Chí Minh" / "Ho Chi Minh City"
// - clinicData.name                → "Phòng khám ABC"
// - clinicData.address             → "123 Đường XYZ, Quận 1"
// - note                          → Ghi chú thêm

// STATE:
// - showPriceDetail: boolean — toggle hiển thị chi tiết giá

// Hiển thị đa ngôn ngữ (SRS IL-004):
// language === 'vi' ? priceData.valueVi : priceData.valueEn
```

### 6.4 Giao diện

```
┌─────────────────────────────────────┐
│  ĐỊA CHỈ KHÁM                      │
│  ─────────                          │
│  📍 Phòng khám ABC                  │
│  123 Đường XYZ, Quận 1, TP.HCM     │
│                                     │
│  GIÁ KHÁM                          │
│  ─────────                          │
│  💰 200.000đ   [Xem chi tiết ▼]    │
│  ┌─ Chi tiết (khi expand) ────────┐│
│  │ Giá khám: 200.000đ             ││
│  │ Thanh toán: Tiền mặt           ││
│  │ BHYT: Không áp dụng            ││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

---

## 7. Component 4: Modal Đặt Lịch Khám (BookingModal)

### 7.1 Mô tả (SRS 3.9 – Quy trình 4 bước)

Modal overlay hiển thị khi bệnh nhân chọn khung giờ. Bao gồm form điền thông tin + button xác nhận.

### 7.2 Props

```javascript
// Props:
// - isOpen: boolean
// - onClose: function
// - doctorId: number
// - doctorName: string (lastName + firstName)
// - timeSlot: object { timeType, timeTypeData: { valueVi, valueEn } }
// - date: string (timestamp ngày khám)
```

### 7.3 Form Fields (SRS REQ-PT-013)

| Field         | Type     | Label Vi      | Label En     | Validation (REQ-PT-014)          |
| ------------- | -------- | ------------- | ------------ | -------------------------------- |
| `fullName`    | text     | Họ tên        | Full name    | Required, min 2 chars            |
| `email`       | email    | Email         | Email        | Required, email format           |
| `phoneNumber` | tel      | Số điện thoại | Phone number | Required, 10-11 digits           |
| `address`     | text     | Địa chỉ       | Address      | Required                         |
| `reason`      | textarea | Lý do khám    | Reason       | Required                         |
| `birthday`    | date     | Ngày sinh     | Birthday     | Required                         |
| `gender`      | select   | Giới tính     | Gender       | Required (G1/G2/G3 from Allcode) |

### 7.4 Logic chính

```javascript
// File: src/containers/Patient/BookingModal.jsx
// SRS: REQ-PT-012→023

// CONSTANTS:
// const INITIAL_FORM = { fullName: '', email: '', phoneNumber: '',
//                         address: '', reason: '', birthday: '', gender: '' };
// const INITIAL_ERRORS = { fullName: '', email: '', phoneNumber: '',
//                           address: '', reason: '', birthday: '', gender: '' };

// STATE:
// - formData: { fullName, email, phoneNumber, address, reason, birthday, gender }
// - errors: { fullName: '', email: '', phoneNumber: '', address: '', reason: '',
//             birthday: '', gender: '' }  // ← [CV ADDED] Dùng để hiển thị lỗi đỏ
// - isSubmitting: boolean                 // ← [CV ADDED] Loading spinner chống spam
// - genderOptions: array — từ Allcode type=GENDER

// LOGIC:
// 1. Mount → lấy danh sách gender từ Redux (Allcode GENDER)
//
// ✅ [CTO-FIX-4] DỌN RÁC KHI ĐÓNG MODAL (Chống data leak giữa các lần mở):
//    BẮT BUỘC định nghĩa hàm handleCloseModal và truyền vào prop onClose:
//
//    const handleCloseModal = () => {
//      setFormData(INITIAL_FORM);    // ← reset toàn bộ form về trạng thái rỗng
//      setErrors(INITIAL_ERRORS);   // ← xóa hết lỗi đỏ
//      setIsSubmitting(false);       // ← reset spinner (phòng trường hợp đóng giữa chừng)
//      props.onClose();              // ← gọi callback đóng modal từ parent
//    };
//
//    Áp dụng cho: nút "Hủy", nút "✕" góc phải, click overlay ngoài modal.
//    Nếu KHÔNG làm: user mở modal lần 2 sẽ thấy dữ liệu cũ từ lần trước (bug UX).
//
// 2. Validate form (REQ-PT-014, REQ-PT-021):
//    Hàm validateForm() → trả về { isValid, errors }:
//    - fullName: required, trim(), length >= 2
//      Nếu sai: errors.fullName = 'Vui lòng nhập họ tên (tối thiểu 2 ký tự)'
//    - email: required, regex /^[^\s@]+@[^\s@]+\.[^\s@]+$/
//      Nếu sai: errors.email = 'Email không đúng định dạng'
//    - phoneNumber: required, regex /^(0[3|5|7|8|9])\d{8}$/ (VN format)
//      Nếu sai: errors.phoneNumber = 'Số điện thoại không hợp lệ (10 số, đầu 03/05/07/08/09)'
//    - address: required
//      Nếu sai: errors.address = 'Vui lòng nhập địa chỉ'
//    - reason: required
//      Nếu sai: errors.reason = 'Vui lòng nhập lý do khám'
//    - birthday: required, valid date
//      Nếu sai: errors.birthday = 'Vui lòng nhập ngày sinh hợp lệ'
//    - gender: required, must be G1|G2|G3
//      Nếu sai: errors.gender = 'Vui lòng chọn giới tính'
//
// ⚠️ [CROSS-VALIDATION ADDED] UX HIỂN THỊ LỖI ĐỎ:
//    Sau validateForm(), setErrors(errors) để React re-render.
//    Mỗi field input PHẢI có element lỗi kèm theo:
//    <input className={errors.fullName ? 'input-error' : ''} .../>
//    {errors.fullName && <span className="error-text">{errors.fullName}</span>}
//    CSS: .input-error { border: 1px solid red; }
//         .error-text  { color: red; font-size: 12px; margin-top: 4px; display: block; }
//    Lỗi tự dismiss khi user bắt đầu nhập lại (onChange → clear error cho field đó)
//
// 3. Submit (REQ-PT-015):
// ⚠️ [CROSS-VALIDATION ADDED] LOADING SPINNER CHỐNG SPAM:
//    Luồng submit BẮT BUỘC (dùng try/finally để đảm bảo isSubmitting luôn được reset):
//    const handleSubmit = async () => {
//      const { isValid, errors } = validateForm();
//      if (!isValid) { setErrors(errors); return; }
//      setIsSubmitting(true); // ← a) disable nút
//      try {
//        const result = await dispatch(postBookAppointment(bookingData)).unwrap();
//        // c) Gọi API
//        if (result.errCode === 0) {
//          toast.success(t('patient.booking-modal.success'));
//          handleCloseModal(); // ← dọn rác + đóng modal
//        } else if (result.errCode === 2) {
//          toast.error(t('patient.booking-modal.duplicate'));
//        } else if (result.errCode === 4) {
//          toast.error('Khung giờ này đã hết chỗ! Vui lòng chọn khung giờ khác');
//        } else {
//          toast.error(t('patient.booking-modal.error'));
//        }
//      } catch (err) {
//        toast.error(t('patient.booking-modal.error'));
//      } finally {
//        setIsSubmitting(false); // ← e) LUÔN tắt spinner dù thành công hay lỗi
//      }
//    };
//
//    Nút submit khi isSubmitting = true:
//    <button disabled={isSubmitting} onClick={handleSubmit}>
//      {isSubmitting ? <Spinner size="sm" /> : t('patient.booking-modal.confirm')}
//    </button>
//
//    const bookingData = {
//      fullName: formData.fullName,
//      email: formData.email,
//      phoneNumber: formData.phoneNumber,
//      address: formData.address,
//      reason: formData.reason,
//      date: props.date,           // ← UTC timestamp từ DoctorSchedule (moment.utc)
//      birthday: formData.birthday,
//      doctorId: props.doctorId,
//      timeType: props.timeSlot.timeType,
//      gender: formData.gender,
//      language: language,           // vi hoặc en — để backend gửi email đúng ngôn ngữ
//      doctorName: props.doctorName, // Hiển thị trong email
//      timeString: language === 'vi'
//        ? props.timeSlot.timeTypeData.valueVi   // "8:00 – 9:00"
//        : props.timeSlot.timeTypeData.valueEn,  // "8:00 AM – 9:00 AM"
//      dateString: moment(props.date).format(language === 'vi' ? 'DD/MM/YYYY' : 'MM/DD/YYYY'),
//    };
//
// 4. Xử lý response: (đã tích hợp vào handleSubmit ở trên)
//    - errCode === 0 → toast.success + handleCloseModal() (REQ-PT-023)
//    - errCode === 1 → toast.error "Thiếu thông tin bắt buộc"
//    - errCode === 2 → toast.error "Lịch hẹn đã tồn tại" (REQ-PT-022)
//    - errCode === 4 → toast.error "Khung giờ đã hết chỗ"
//    - errCode !== 0 / catch → toast.error "Có lỗi xảy ra"
```

### 7.5 Giao diện Modal

```
┌──────────────────────────────────────────────┐
│  ✕  THÔNG TIN ĐẶT LỊCH KHÁM BỆNH           │
├──────────────────────────────────────────────┤
│                                              │
│  👨‍⚕️ Bác sĩ: PGS.TS Nguyễn Văn A             │
│  🕐 Thời gian: 8:00 – 9:00, 17/04/2026      │
│  💰 Giá khám: 200.000đ                      │
│                                              │
│  ────────────────────────────────────        │
│                                              │
│  Họ tên *          [________________]        │
│                    ← Vui lòng nhập họ tên    │  ← [CV] Error text (màu đỏ)
│  Email *           [________________]        │
│  Số điện thoại *   [________________]        │
│                    ← SĐT không hợp lệ       │  ← [CV] Error text (màu đỏ)
│  Địa chỉ *        [________________]        │
│  Lý do khám *     [________________]        │
│                    [________________]        │
│  Ngày sinh *       [____/____/______]        │
│  Giới tính *       [Nam ▼          ]        │
│                                              │
│  (* Trường bắt buộc)                        │
│                                              │
│  [    Hủy    ]  [ ⏳ Đang xử lý... ]        │  ← [CV] isSubmitting=true
│  [    Hủy    ]  [  Xác nhận đặt lịch  ]     │  ← [CV] isSubmitting=false
│  Lưu ý: Nút "Xác nhận" bị DISABLED khi      │
│  isSubmitting=true để chống spam click        │
└──────────────────────────────────────────────┘
```

---

## 8. Component 5: Trang Xác Nhận Email (VerifyEmail)

### 8.1 Mô tả (SRS 3.10 – REQ-PT-019, 020)

Trang người dùng truy cập khi click link xác nhận từ email. URL format:

```
{FRONTEND_URL}/verify-booking?token=xxx&doctorId=yyy
```

### 8.2 Logic chính

```javascript
// File: src/containers/Patient/VerifyEmail.jsx
// SRS: REQ-PT-019, REQ-PT-020

// 1. Lấy token và doctorId từ URL search params:
//    const location = useLocation();
//    const params = new URLSearchParams(location.search);
//    const token = params.get('token');
//    const doctorId = params.get('doctorId');
//    ⚠️ NẾU token hoặc doctorId null → hiển thị lỗi ngay, KHÔNG gọi API

// ✅ [CTO-FIX-3] CHỐNG REACT 18 STRICT MODE DOUBLE-INVOKE (Race Condition S1→S2):
//    React 18 Strict Mode mount component 2 lần trong Development.
//    Nếu useEffect([]) gọi API 2 lần → booking bị verify 2 lần → lần 2 trả errCode 3
//    gây ra hiển thị lỗi dù thực ra đã thành công.
//
//    GIẢI PHÁP: Dùng useRef(false) làm guard:
//    const hasCalled = useRef(false);
//
//    useEffect(() => {
//      if (!token || !doctorId) {
//        setStatus('error');
//        setMessage('Link xác nhận không hợp lệ!');
//        return;
//      }
//      if (hasCalled.current) return; // ← BLOCK lần gọi thứ 2 (Strict Mode)
//      hasCalled.current = true;       // ← Đánh dấu đã gọi
//
//      const verifyAppointment = async () => {
//        setStatus('loading');
//        try {
//          const result = await dispatch(verifyBooking({ token, doctorId })).unwrap();
//          if (result.errCode === 0) {
//            setStatus('success');
//          } else if (result.errCode === 3) {
//            setStatus('error');
//            setMessage('Link đã hết hạn hoặc lịch hẹn không tồn tại');
//          } else {
//            setStatus('error');
//            setMessage('Xác nhận thất bại, vui lòng liên hệ hỗ trợ');
//          }
//        } catch (err) {
//          setStatus('error');
//          setMessage('Lỗi kết nối, vui lòng thử lại');
//        }
//        // Không cần finally vì status đã được set trong cả 2 nhánh
//      };
//      verifyAppointment();
//    }, []); // ← dependency array rỗng, chỉ chạy 1 lần sau mount

// 2. [CROSS-VALIDATION ADDED] State Machine S1 → S2:
//    Gọi API: postVerifyBookAppointment({ token, doctorId })
//    Backend (patientService.js) thực hiện:
//      - findOne({ where: { token, doctorId, statusId: 'S1' } })
//      - booking.statusId = 'S2' → booking.save()
//      - Schedule.increment('currentNumber') ← slot chính thức bị trừ
//    Lưu ý quan trọng:
//      - Đây là lý do FE KHÔNG INCREMENT slot ngay lúc submit form
//      - chỉ sau khi user VERIFY EMAIL thì slot mới bị trừ (anti-hoarding)

// 3. State: { status: 'loading' | 'success' | 'error', message: string }

// 4. Hiển thị kết quả:
//    status === 'loading' → Spinner (đang xác nhận...)
//    status === 'success' → "✅ Xác nhận lịch hẹn thành công!"
//    status === 'error'   → "❌ {message}"

// 5. Nút "Về trang chủ" → navigate('/')
```

### 8.3 Giao diện

```
┌──────────────────────────────────────────┐
│  Header (có sẵn)                         │
├──────────────────────────────────────────┤
│                                          │
│           ✅ (hoặc ❌)                    │
│                                          │
│   Xác nhận lịch hẹn thành công!         │
│                                          │
│   Cảm ơn bạn đã xác nhận lịch hẹn      │
│   khám bệnh. Vui lòng đến đúng giờ.    │
│                                          │
│        [ ← Về trang chủ ]               │
│                                          │
├──────────────────────────────────────────┤
│  Footer (có sẵn)                         │
└──────────────────────────────────────────┘
```

---

## 9. Component 6: Chi Tiết Chuyên Khoa (SpecialtyDetail)

### 9.1 Mô tả (SRS 3.7 – REQ-PT-006)

Hiển thị thông tin chuyên khoa + danh sách bác sĩ thuộc chuyên khoa đó, kèm lịch khám và giá khám.

### 9.2 Logic chính

```javascript
// File: src/containers/Patient/SpecialtyDetail.jsx
// SRS: REQ-PT-006

// 1. Lấy specialtyId từ URL params
// 2. Gọi API getDetailSpecialtyById(id, location)
//    - location = 'ALL' (tất cả tỉnh) hoặc 'PRO1', 'PRO2', 'PRO3'
// 3. Response: { specialty: { name, descriptionHTML }, doctorList: [...] }
// 4. Hiển thị:
//    - Mô tả chuyên khoa (descriptionHTML)
//    - Dropdown lọc theo tỉnh/thành phố (Allcode PROVINCE)
//    - Danh sách bác sĩ, mỗi bác sĩ gồm:
//      ├── Avatar + tên + chức danh
//      ├── DoctorSchedule (tái sử dụng)
//      └── DoctorExtraInfo (tái sử dụng)
```

### 9.3 Giao diện

```
┌──────────────────────────────────────────────────────────┐
│  Header                                                  │
├──────────────────────────────────────────────────────────┤
│  MÔ TẢ CHUYÊN KHOA (descriptionHTML)                     │
│  Background image blur, text overlay                     │
│  [Xem thêm ▼] — collapse/expand                         │
├──────────────────────────────────────────────────────────┤
│  Lọc theo: [Toàn quốc ▼]  ← Province dropdown           │
├──────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────┐  │
│  │ 👨‍⚕️ PGS.TS Nguyễn Văn A                            │  │
│  │ Chuyên khoa: Tim mạch                              │  │
│  │                                                    │  │
│  │  [DoctorSchedule]         [DoctorExtraInfo]        │  │
│  │  📅 [Hôm nay ▼]          💰 Giá: 200.000đ         │  │
│  │  [T1][T2][T3]            📍 PK ABC, Q1            │  │
│  └────────────────────────────────────────────────────┘  │
│  ── Separator ──────────────────────────────────────────  │
│  ┌────────────────────────────────────────────────────┐  │
│  │ 👨‍⚕️ TS Trần Văn B                                  │  │
│  │ ...                                                │  │
│  └────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────┤
│  Footer                                                  │
└──────────────────────────────────────────────────────────┘
```

---

## 10. Component 7: Chi Tiết Phòng Khám (ClinicDetail)

### 10.1 Mô tả (SRS 3.7 – REQ-PT-006)

Tương tự SpecialtyDetail nhưng theo phòng khám. Hiển thị thông tin phòng khám + danh sách bác sĩ.

### 10.2 Logic chính

```javascript
// File: src/containers/Patient/ClinicDetail.jsx
// SRS: REQ-PT-006, REQ-AM-014

// 1. Lấy clinicId từ URL params
// 2. Gọi API getDetailClinicById(id)
// 3. Response: { clinic: { name, address, descriptionHTML, image }, doctorList: [...] }
// 4. Hiển thị:
//    - Banner phòng khám (image + name + address)
//    - Mô tả descriptionHTML
//    - Danh sách bác sĩ:
//      ├── Avatar + tên + chức danh
//      ├── DoctorSchedule (tái sử dụng)
//      └── DoctorExtraInfo (tái sử dụng)
```

---

## 11. Redux – Patient Slice

### 11.1 Thêm async thunks cho doctorSlice.js

```javascript
// File: src/redux/slices/doctorSlice.js — THÊM MỚI

// Async thunks cần thêm:
// 1. fetchDoctorDetail(id) — gọi getDoctorDetail(id)
// 2. fetchScheduleByDate({doctorId, date}) — gọi getScheduleByDate()
// 3. bookAppointment(data) — gọi postBookAppointment(data)
// 4. verifyBooking(data) — gọi postVerifyBookAppointment(data)
// 5. fetchSpecialtyDetail({id, location}) — gọi getDetailSpecialtyById()
// 6. fetchClinicDetail(id) — gọi getDetailClinicById()

// State mới cần thêm:
// - currentDoctor: object | null
// - currentSchedules: array
// - currentSpecialty: object | null
// - currentClinic: object | null
// - bookingStatus: 'idle' | 'loading' | 'succeeded' | 'failed'
// - isLoadingDoctor: boolean  // ← [DEEP-SCAN] Skeleton loading cho DoctorDetail
// - isLoadingSchedule: boolean

// ✅ [DEEP-SCAN FIX-1] CLEAR STATE KHI LOGOUT (Chống rò rỉ dữ liệu bệnh nhân):
// Khi user đăng xuất, redux-persist vẫn giữ state trong localStorage.
// Nếu KHÔNG clear, user kế tiếp mở trang có thể thấy dữ liệu bác sĩ cũ (privacy leak).
//
// Cần thêm extraReducer lắng nghe action logout từ authSlice:
//   builder.addCase(logoutUser.fulfilled, (state) => {
//     state.currentDoctor     = null;
//     state.currentSchedules  = [];
//     state.currentSpecialty  = null;
//     state.currentClinic     = null;
//     state.bookingStatus     = 'idle';
//     state.isLoadingDoctor   = false;
//     state.isLoadingSchedule = false;
//   });
//
// HOẶC dùng redux-persist blacklist cho doctorSlice nếu không cần persist:
//   persistConfig: { blacklist: ['currentDoctor', 'currentSchedules', ...] }
```

---

## 12. Đa ngôn ngữ (i18n)

### 12.1 Các key cần thêm vào translations

```json
// ===== vi.json — Thêm section "patient" =====
{
  "patient": {
    "doctor-detail": {
      "schedule": "LỊCH KHÁM",
      "select-date": "Chọn ngày khám",
      "no-schedule": "Bác sĩ không có lịch khám vào ngày này",
      "book-free": "Chọn 🗓 và đặt (miễn phí)",
      "price": "GIÁ KHÁM",
      "see-detail": "Xem chi tiết",
      "hide-detail": "Ẩn bảng giá",
      "payment": "Thanh toán",
      "insurance": "Bảo hiểm",
      "clinic-address": "ĐỊA CHỈ KHÁM"
    },
    "booking-modal": {
      "title": "Thông tin đặt lịch khám bệnh",
      "full-name": "Họ tên",
      "email": "Email",
      "phone": "Số điện thoại",
      "address": "Địa chỉ",
      "reason": "Lý do khám",
      "birthday": "Ngày sinh",
      "gender": "Giới tính",
      "confirm": "Xác nhận đặt lịch",
      "cancel": "Hủy",
      "booking-for": "Đặt lịch cho",
      "free-booking": "Miễn phí đặt lịch",
      "success": "Đặt lịch thành công! Vui lòng kiểm tra email để xác nhận.",
      "duplicate": "Lịch hẹn đã tồn tại. Vui lòng chọn khung giờ khác.",
      "error": "Có lỗi xảy ra, vui lòng thử lại sau."
    },
    "verify-email": {
      "success": "Xác nhận lịch hẹn thành công!",
      "success-desc": "Cảm ơn bạn đã xác nhận. Vui lòng đến đúng giờ hẹn.",
      "failed": "Xác nhận thất bại!",
      "failed-desc": "Link xác nhận không hợp lệ hoặc đã được sử dụng.",
      "go-home": "Về trang chủ"
    },
    "specialty-detail": {
      "filter-province": "Toàn quốc",
      "see-more": "Xem thêm"
    }
  }
}

// ===== en.json — tương tự nhưng bằng tiếng Anh =====
```

### 12.2 Hiển thị ngày tháng đa ngôn ngữ

```javascript
// ✅ [CTO-FIX-2] PHIÊN BẢN CHÍNH THỨC – ĐÃ XÓA date.setHours(0,0,0,0)
// Dùng moment.utc() để đồng bộ timezone với Backend (lưu 00:00 UTC)
// ❌ CŨ (SAI): days.push({ label, value: date.setHours(0,0,0,0).toString() });
// ✅ MỚI (ĐÚNG): days.push({ label, value: moment.utc(...).startOf('day').valueOf().toString() });

import moment from 'moment';

const getArrDays = (language) => {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const dateMoment = moment().add(i, 'days');

    const dayOfWeek = language === 'vi'
      ? ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'][dateMoment.day()]
      : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dateMoment.day()];

    let label = language === 'vi'
      ? `${dayOfWeek} - ${dateMoment.format('DD/MM')}`
      : `${dayOfWeek} - ${dateMoment.format('MM/DD')}`;

    if (i === 0) {
      label = language === 'vi'
        ? `Hôm nay - ${dateMoment.format('DD/MM')}`
        : `Today - ${dateMoment.format('MM/DD')}`;
    }

    // ✅ [CTO-FIX-2] BẮT BUỘC dùng moment.utc để đồng bộ Timezone với Backend
    // Backend lưu date = UNIX timestamp of 00:00:00 UTC
    // Nếu dùng setHours(0,0,0,0) → ra 00:00:00 LOCAL (UTC+7) → lệch 7 tiếng → API trả rỗng
    const utcTimestamp = moment.utc(dateMoment.format('YYYY-MM-DD')).startOf('day').valueOf();
    days.push({ label, value: utcTimestamp.toString() });
  }
  return days;
};
// Gọi lại mỗi khi language thay đổi (useEffect([language]))
```

---

## 13. Tích hợp Facebook Social Plugin

### 13.1 Mô tả (SRS 3.14 – REQ-SI-001, 002, 003)

```javascript
// File: src/containers/Patient/SocialPlugin.jsx
// SRS: REQ-SI-001 (Like), REQ-SI-002 (Share), REQ-SI-003 (Comment)

// 1. Nhúng Facebook SDK vào <head> (chỉ 1 lần)
// 2. Sử dụng div với class fb-like, fb-share-button, fb-comments
// 3. Gọi FB.XFBML.parse() sau khi component mount

// Component nhận prop: dataHref (URL trang hiện tại)

// Lưu ý: Cần Facebook App ID từ Facebook Developer Portal
// Cấu hình trong .env: VITE_FB_APP_ID=your_app_id
```

### 13.2 Nhúng SDK

```html
<!-- Thêm vào index.html hoặc load động -->
<div id="fb-root"></div>
<script
  async
  defer
  crossorigin="anonymous"
  src="https://connect.facebook.net/vi_VN/sdk.js#xfbml=1&version=v18.0&appId=YOUR_APP_ID"
></script>
```

---

## 14. Kiểm thử & Verification

### 14.1 Checklist kiểm thử theo REQ

| #   | Test Case                      | REQ             | Expected                               | Cách kiểm tra                        |
| --- | ------------------------------ | --------------- | -------------------------------------- | ------------------------------------ |
| 1   | Xem chi tiết bác sĩ            | REQ-PT-007      | Hiển thị avatar, tên, chức danh, mô tả | Truy cập `/doctor/1`, verify dữ liệu |
| 2   | Xem bài viết Markdown          | REQ-PT-008      | Render HTML từ contentHTML             | Kiểm tra DOM có nội dung HTML        |
| 3   | Chọn ngày → hiển thị khung giờ | REQ-PT-009      | Hiển thị T1-T8 khả dụng                | Chọn ngày, verify số khung giờ       |
| 4   | Hiển thị giá khám              | REQ-PT-010      | Hiển thị đúng giá từ Allcode           | So sánh với DB                       |
| 5   | Hiển thị thông tin phòng khám  | REQ-PT-011      | Tên + địa chỉ phòng khám               | Verify UI                            |
| 6   | Click khung giờ → mở modal     | REQ-PT-012      | Modal hiển thị                         | Click T1, verify modal open          |
| 7   | Modal có đủ 7 fields           | REQ-PT-013      | Tất cả fields hiển thị                 | Đếm fields trong modal               |
| 8   | Submit form trống → lỗi        | REQ-PT-014, 021 | Thông báo lỗi cụ thể                   | Submit rỗng, verify error messages   |
| 9   | Submit hợp lệ → thành công     | REQ-PT-015      | errCode=0, toast thành công            | Điền đủ → submit                     |
| 10  | Email xác thực được gửi        | REQ-PT-016, 017 | Nhận email                             | Kiểm tra inbox                       |
| 11  | Click link email → S1→S2       | REQ-PT-020      | Trang xác nhận thành công              | Click link email                     |
| 12  | Đặt lịch trùng → từ chối       | REQ-PT-022      | errCode=2                              | Submit cùng thông tin 2 lần          |
| 13  | Chuyển ngôn ngữ                | IL-001→007      | UI chuyển Vi↔En mượt mà                | Toggle language button               |
| 14  | Xem DS bác sĩ theo chuyên khoa | REQ-PT-006      | Hiển thị danh sách                     | Truy cập `/specialty/1`              |
| 15  | Xem DS bác sĩ theo phòng khám  | REQ-PT-006      | Hiển thị danh sách                     | Truy cập `/clinic/1`                 |
| 16  | Nút Like/Share Facebook        | REQ-SI-001, 002 | Nút hiển thị                           | Verify DOM elements                  |

### 14.2 Test trên trình duyệt (SRS OT-009)

- [ ] Google Chrome (v90+)
- [ ] Mozilla Firefox (v80+)
- [ ] Microsoft Edge (v90+)
- [ ] Responsive: Desktop (≥1024px) và Mobile (≤768px) — SRS QA-US-004

---

## 15. Lịch trình 14 ngày

| Ngày    | Công việc                           | Files                                    | REQs                        |
| ------- | ----------------------------------- | ---------------------------------------- | --------------------------- |
| **1-2** | DoctorDetail + DoctorDetail.scss    | `DoctorDetail.jsx`, `.scss`              | REQ-PT-007, 008             |
| **3-4** | DoctorSchedule + hiển thị khung giờ | `DoctorSchedule.jsx`, `.scss`            | REQ-PT-009, REQ-AM-019, 023 |
| **5**   | DoctorExtraInfo (giá, phòng khám)   | `DoctorExtraInfo.jsx`, `.scss`           | REQ-PT-010, 011             |
| **6-7** | BookingModal (form + validate)      | `BookingModal.jsx`, `.scss`              | REQ-PT-012→014, 021         |
| **8**   | BookingModal → API submit + toast   | `BookingModal.jsx`, `doctorSlice.js`     | REQ-PT-015, 022, 023        |
| **9**   | VerifyEmail (xác nhận S1→S2)        | `VerifyEmail.jsx`, `.scss`               | REQ-PT-019, 020             |
| **10**  | SpecialtyDetail (DS bác sĩ theo CK) | `SpecialtyDetail.jsx`, `.scss`           | REQ-PT-006                  |
| **11**  | ClinicDetail (DS bác sĩ theo PK)    | `ClinicDetail.jsx`, `.scss`              | REQ-PT-006                  |
| **12**  | Đa ngôn ngữ (i18n) + Social Plugin  | `vi.json`, `en.json`, `SocialPlugin.jsx` | IL-001→007, REQ-SI-001→003  |
| **13**  | Redux integration + kiểm thử        | `doctorSlice.js`                         | All REQs                    |
| **14**  | Responsive + bug fix + browser test | All files                                | QA-US-004, OT-009           |

---

## Phụ Lục A: Dependencies cần cài thêm

```bash
# Trong bookingcare-frontend/
npm install react-datepicker  # Date picker cho Birthday field
npm install react-toastify    # Toast notifications (nếu chưa có)
npm install moment            # Format ngày tháng (nếu chưa có)
```

## Phụ Lục B: Tham chiếu nhanh API Endpoints

| Mục đích               | Method | Endpoint                              | Service Function                       |
| ---------------------- | ------ | ------------------------------------- | -------------------------------------- |
| Chi tiết bác sĩ        | GET    | `/api/v1/doctors/:id`                 | `getDoctorDetail(id)`                  |
| Lịch khám theo ngày    | GET    | `/api/v1/doctors/:id/schedules?date=` | `getScheduleByDate(doctorId, date)`    |
| Đặt lịch khám          | POST   | `/api/v1/bookings`                    | `postBookAppointment(data)`            |
| Xác nhận email         | POST   | `/api/v1/bookings/verify`             | `postVerifyBookAppointment(data)`      |
| Chi tiết chuyên khoa   | GET    | `/api/v1/specialties/:id?location=`   | `getDetailSpecialtyById(id, location)` |
| Chi tiết phòng khám    | GET    | `/api/v1/clinics/:id`                 | `getDetailClinicById(id)`              |
| Allcode (gender, etc.) | GET    | `/api/v1/allcodes?type=GENDER`        | `getAllCode('GENDER')`                 |

## Phụ Lục C: Booking State Machine (SRS 3.11 – tham chiếu)

```
Bệnh nhân đặt lịch → [S1: Mới] → Click link email → [S2: Đã xác nhận]
                                                          │
                                              ┌───────────┴───────────┐
                                         BS "Hoàn thành"        BS "Hủy"
                                              │                       │
                                       [S3: Đã khám xong]     [S4: Đã hủy]
```

---

_Hết tài liệu hướng dẫn Giai đoạn 7 – Phiên bản 1.0_
