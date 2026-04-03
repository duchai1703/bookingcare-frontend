# 📋 Phase 8 – File 3: RemedyModal.jsx — Modal gửi kết quả khám

> **Component:** `src/containers/System/Doctor/RemedyModal.jsx`  
> **SRS Sections:** 3.13 | **REQ:** DR-008, DR-009, DR-010  
> **Phiên bản:** 2.0 (Security Audit Fix — Email readonly, Memory leak cleanup)  
> **Mục tiêu:** Bác sĩ gửi kết quả khám (ảnh đính kèm) cho bệnh nhân qua email, đồng thời chuyển booking S2 → S3.

---

## CHANGELOG v2.0 — Security Audit Fixes

| # | Bug ID | Mô tả | Trạng thái |
|---|--------|-------|-----------|
| 1 | **BUG-003** | Email input cho phép chỉnh sửa → rò rỉ dữ liệu y tế | ✅ FIXED → `readOnly` |
| 2 | **BUG-006** | Thiếu useEffect cleanup → memory leak Object URL | ✅ FIXED → cleanup on unmount |
| 3 | **QA-001** | Thiếu nút [❌] Remove Image trên preview (từ v1.1) | ✅ Giữ nguyên |

---

## 1. Mô tả giao diện RemedyModal

```
┌──────────────────────────────────────────────────┐
│                                              [X] │
│          📧 Gửi kết quả khám bệnh                │
│                                                  │
│  Bệnh nhân: Trần Văn B                          │
│  Thời gian:  8:00 – 9:00, 02/04/2026            │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │ Email bệnh nhân *                          │  │
│  │ tranvanb@gmail.com            🔒 READONLY  │  │  ← [FIX #3]
│  └────────────────────────────────────────────┘  │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │ 📎 Đính kèm ảnh kết quả                   │  │
│  │                                            │  │
│  │  ┌──────────────────────────────────┐      │  │
│  │  │ [Preview ảnh]              [❌]  │      │  │  ← NÚT REMOVE
│  │  └──────────────────────────────────┘      │  │
│  │                                            │  │
│  │  📷 Chọn ảnh (Max 5MB — JPEG, PNG)         │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│         [🔄 Đang gửi...]  hoặc  [📧 Gửi]  [Hủy]│
└──────────────────────────────────────────────────┘
```

> ⚠️ **[FIX #3] CRITICAL — Email READONLY:** Trường email **KHÔNG cho phép chỉnh sửa**. Giá trị luôn lấy từ `dataModal.patientData.email` (pre-fill từ Database). Backend cũng **KHÔNG đọc email từ req.body** — backend tự lấy từ DB.

---

## 2. Luồng hoạt động Mở/Đóng Modal

```
ManagePatient.jsx                    RemedyModal.jsx
─────────────────                    ────────────────
     │                                    │
     │ handleOpenRemedyModal(booking)     │
     │ ─────────────────────────────►     │
     │   setIsOpenRemedyModal(true)       │
     │   setDataModal(booking)            │
     │                                    │
     │                              ┌─────▼─────────┐
     │                              │ Render Modal   │
     │                              │ - Pre-fill     │
     │                              │   email từ     │
     │                              │   booking data │
     │                              │ - 🔒 READONLY  │ ← [FIX #3]
     │                              └─────┬─────────┘
     │                                    │
     │       User chọn ảnh ──────────────►│ handleImageChange()
     │                                    │   → setImageBase64(base64)
     │                                    │   → setPreviewUrl(objectUrl)
     │                                    │   → Preview hiện + nút [❌]
     │                                    │
     │       User nhấn [❌] trên ảnh ─────│ handleRemoveImage()
     │                                    │   → clear imageBase64
     │                                    │   → revoke + clear previewUrl
     │                                    │
     │         ← User nhấn [Hủy] ────────│
     │   hoặc  ← User nhấn [X]  ─────────│
     │                                    │
     │ handleCloseRemedyModal()           │
     │ ◄─────────────────────────────     │
     │   setIsOpenRemedyModal(false)      │
     │   setDataModal({})  ← CLEAR DATA  │
     │                                    │
     │         ← User nhấn [Gửi] ────────│
     │                                    │
     │                              ┌─────▼─────────┐
     │                              │ POST /remedy   │
     │                              │ S2 → S3        │
     │                              │ + Send email   │
     │                              │ (email từ DB!) │ ← [FIX #3]
     │                              └─────┬─────────┘
     │                                    │
     │ handleSendRemedySuccess()          │
     │ ◄─────────────────────────────     │
     │   handleCloseRemedyModal()         │
     │   fetchPatientList(currentDate)    │
```

---

## 3. Cấu trúc State của RemedyModal

```javascript
// STATE CỦA RemedyModal.jsx
const [email, setEmail] = useState('');            // Email bệnh nhân (READONLY, chỉ display)
const [imageBase64, setImageBase64] = useState(''); // Ảnh base64 full (có prefix)
const [previewUrl, setPreviewUrl] = useState('');   // Object URL để preview
const [isSubmitting, setIsSubmitting] = useState(false); // Loading khi gửi
```

> ⚠️ **[FIX #3] `email` state chỉ dùng để HIỂN THỊ** — frontend **KHÔNG gửi email trong API request**. Backend tự lấy email từ Database khi query booking + include patientData.

---

## 4. Code hướng dẫn chi tiết

### 4.1 Import và Setup

```jsx
// src/containers/System/Doctor/RemedyModal.jsx
import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useIntl } from 'react-intl';
import { toast } from 'react-toastify';

import { sendRemedy } from '../../../services/doctorService';
import { processLogout } from '../../../redux/slices/userSlice';
import CommonUtils from '../../../utils/CommonUtils';
import { LANGUAGES } from '../../../utils/constants';
```

---

### 4.2 ⭐ Pre-fill email (READONLY) + [FIX #6] useEffect cleanup

```jsx
const RemedyModal = ({ isOpen, dataModal, onClose, onSendSuccess }) => {
  const dispatch = useDispatch();
  const intl = useIntl();
  const { userInfo } = useSelector((state) => state.user);
  const language = useSelector((state) => state.app.language);

  const [email, setEmail] = useState('');
  const [imageBase64, setImageBase64] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ===== PRE-FILL EMAIL KHI MODAL MỞ =====
  // ✅ [FIX #3] Email chỉ dùng để HIỂN THỊ — readonly, không cho sửa
  useEffect(() => {
    if (dataModal && dataModal.patientData) {
      setEmail(dataModal.patientData.email || '');
    }
  }, [dataModal]);

  // ===== ⭐ [FIX #6] CLEANUP — GIẢI PHÓNG OBJECT URL KHI UNMOUNT =====
  //
  // TẠI SAO CẦN CLEANUP?
  //   Mỗi lần gọi URL.createObjectURL(file) → browser cấp một Blob URL.
  //   Nếu component unmount mà chưa gọi URL.revokeObjectURL() → URL bị giữ
  //   trong bộ nhớ browser → MEMORY LEAK tích lũy theo thời gian.
  //
  // KỊCH BẢN GÂY LEAK:
  //   1. Bác sĩ mở modal → chọn ảnh → previewUrl = "blob:http://..."
  //   2. Navigate sang trang khác (unmount component)
  //   3. Blob URL KHÔNG được giải phóng → chiếm RAM browser
  //   4. Nếu bác sĩ mở/đóng modal 50 lần trong 1 session → 50 Blob URLs tồn đọng

  useEffect(() => {
    // Cleanup function — chạy khi component unmount
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // ...
};
```

> **📌 Giải thích pattern cleanup:**
>
> ```javascript
> useEffect(() => {
>   return () => { /* cleanup code */ };
> }, [dependency]);
> ```
>
> - `return () => {...}` là **cleanup function** — React gọi nó khi:
>   1. Component **unmount** (navigate đi).
>   2. **dependency thay đổi** (trước khi chạy effect mới).
> - `[previewUrl]` → mỗi khi `previewUrl` thay đổi, URL cũ sẽ được revoke trước khi set URL mới.

---

### 4.3 ⭐ handleImageChange — Xử lý ảnh base64 GIỮ NGUYÊN PREFIX

```jsx
  // ===== ⭐ XỬ LÝ CHỌN ẢNH — BẮT BUỘC giữ nguyên prefix =====
  //
  // CommonUtils.getBase64(file) trả về chuỗi:
  //   "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ..."
  //
  // ✅ GIỮ NGUYÊN chuỗi này (bao gồm prefix "data:image/...;base64,")
  // ✅ Backend emailService.js sẽ tự tách raw data bằng .split('base64,')[1]
  // ✅ Backend validateBase64Image() cần prefix để detect MIME type
  //
  // ❌ KHÔNG ĐƯỢC .split('base64,')[1] ở frontend — sẽ làm mất MIME info

  const handleImageChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // ===== VALIDATE FILE (Client-side) =====
    // 1. Kiểm tra kích thước (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error(
        language === LANGUAGES.VI
          ? 'Ảnh không được vượt quá 5MB!'
          : 'Image size must not exceed 5MB!'
      );
      return;
    }

    // 2. Kiểm tra định dạng (chỉ JPEG, PNG)
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      toast.error(
        language === LANGUAGES.VI
          ? 'Chỉ hỗ trợ ảnh JPEG và PNG!'
          : 'Only JPEG and PNG images are supported!'
      );
      return;
    }

    // 3. Convert sang base64 — GIỮ NGUYÊN prefix
    try {
      const base64 = await CommonUtils.getBase64(file);
      setImageBase64(base64);  // ✅ Giữ nguyên, KHÔNG tách prefix

      // 4. Clean up Object URL cũ (nếu có) trước khi tạo mới
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      // 5. Tạo preview URL mới
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
    } catch (err) {
      console.error('>>> Error converting image:', err);
      toast.error(
        language === LANGUAGES.VI
          ? 'Lỗi xử lý ảnh!'
          : 'Error processing image!'
      );
    }

    // Reset input để cho phép chọn lại cùng file
    event.target.value = '';
  };
```

---

### 4.4 ⭐ handleRemoveImage — Nút [X] xóa ảnh đã chọn (từ v1.1)

```jsx
  // ===== ⭐ XÓA ẢNH ĐÃ CHỌN — NÚT [X] TRÊN PREVIEW =====
  const handleRemoveImage = () => {
    setImageBase64('');

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl('');

    // ✅ KHÔNG clear email — giữ nguyên email đã pre-fill
    // ✅ KHÔNG đóng modal — user vẫn ở trong modal, chỉ xóa ảnh
  };
```

---

### 4.5 ⭐ closeModal — BẮT BUỘC clear state

```jsx
  // ===== ⭐ ĐÓNG MODAL — BẮT BUỘC CLEAR STATE =====
  const handleCloseModal = () => {
    setEmail('');
    setImageBase64('');

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl('');
    setIsSubmitting(false);

    if (onClose) onClose();
  };
```

> ⚠️ **So sánh `handleRemoveImage` vs `handleCloseModal`:**
>
> | | `handleRemoveImage` | `handleCloseModal` |
> |---|---|---|
> | Clear `imageBase64` | ✅ | ✅ |
> | Clear `previewUrl` | ✅ | ✅ |
> | Clear `email` | ❌ (giữ nguyên) | ✅ |
> | Clear `isSubmitting` | ❌ | ✅ |
> | Gọi `onClose()` | ❌ | ✅ |
> | Đóng modal | ❌ | ✅ |

---

### 4.6 ⭐ [FIX #3] handleSendRemedy — KHÔNG gửi email trong request body

```jsx
  // ===== ⭐ [FIX #3] GỬI KẾT QUẢ KHÁM — KHÔNG GỬI EMAIL TỪ FRONTEND =====
  //
  // ❌ BUG CŨ: Frontend gửi { email: email } trong req.body
  //    → Bác sĩ A (hoặc attacker) có thể sửa email thành attacker@evil.com
  //    → Kết quả khám Y TẾ CỦA BỆNH NHÂN bị gửi đến email giả mạo
  //    → RÒ RỈ DỮ LIỆU Y TẾ + VI PHẠM HIPAA/Luật ATTP
  //
  // ✅ FIX: Frontend KHÔNG gửi email. Backend tự lấy email từ Database
  //    bằng cách include patientData khi query booking.
  //    → Email luôn là email THẬT đã đăng ký → không thể giả mạo.

  const handleSendRemedy = async () => {
    // ===== 1. VALIDATE — Chỉ kiểm tra ảnh =====
    // ✅ [FIX #3] KHÔNG validate email vì email là readonly + backend tự lấy
    if (!imageBase64) {
      toast.error(
        intl.formatMessage({ id: 'doctor.manage-patient.image-required' })
      );
      return;
    }

    // ===== 2. BẬT LOADING =====
    setIsSubmitting(true);

    try {
      // ===== 3. GỌI API =====
      const res = await sendRemedy(dataModal.id, {
        // ✅ [FIX #1] dataModal.id = bookingId — để backend query WHERE id = bookingId
        patientId: dataModal.patientId,
        imageBase64: imageBase64,
        doctorName: `${userInfo?.lastName || ''} ${userInfo?.firstName || ''}`.trim(),
        language: language,
        // ❌ KHÔNG gửi email — backend tự lấy từ DB (FIX #3)
        // ❌ KHÔNG gửi doctorId — backend lấy từ JWT (IDOR prevention)
      });

      // ===== 4. XỬ LÝ RESPONSE =====
      if (res && res.errCode === 0) {
        toast.success(
          intl.formatMessage({ id: 'doctor.manage-patient.send-success' })
        );
        if (onSendSuccess) onSendSuccess();
      } else {
        toast.error(res?.message || 'Error');
      }
    } catch (err) {
      // ===== 5. BẮT LỖI 401 =====
      if (err.response && err.response.status === 401) {
        toast.error(
          intl.formatMessage({ id: 'doctor.manage-patient.session-expired' })
        );
        dispatch(processLogout());
        return;
      }
      toast.error(
        intl.formatMessage({ id: 'doctor.manage-patient.send-error' })
      );
    } finally {
      setIsSubmitting(false);
    }
  };
```

### So sánh request body TRƯỚC và SAU fix:

```
❌ TRƯỚC (v1.x) — NGUY HIỂM:
POST /api/v1/bookings/42/remedy
{
  "email": "attacker@evil.com",    ← Bác sĩ/attacker có thể sửa!
  "patientId": 23,
  "imageBase64": "data:image/...",
  "doctorName": "BS. Nguyễn",
  "language": "vi"
}

✅ SAU (v2.0) — AN TOÀN:
POST /api/v1/bookings/42/remedy
{
  "patientId": 23,
  "imageBase64": "data:image/...",
  "doctorName": "BS. Nguyễn",
  "language": "vi"
}
→ Backend tự query: booking.patientData.email = "real_patient@gmail.com"
```

---

### 4.7 ⭐ [FIX #3] Khung UI JSX — Email READONLY + Nút Remove Image

```jsx
  if (!isOpen) return null;

  return (
    <div className="remedy-modal-overlay" onClick={handleCloseModal}>
      <div
        className="remedy-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ===== HEADER ===== */}
        <div className="remedy-modal__header">
          <h3>{intl.formatMessage({ id: 'doctor.manage-patient.remedy-title' })}</h3>
          <button className="btn-close" onClick={handleCloseModal}>×</button>
        </div>

        {/* ===== BODY ===== */}
        <div className="remedy-modal__body">
          {/* Thông tin bệnh nhân (read-only) */}
          <div className="patient-info">
            <p>
              <strong>{intl.formatMessage({ id: 'doctor.manage-patient.patient-name' })}:</strong>
              {' '}{dataModal.patientName || `${dataModal.patientData?.lastName} ${dataModal.patientData?.firstName}`}
            </p>
          </div>

          {/* ===== ⭐ [FIX #3] EMAIL — READONLY, KHÔNG CHO CHỈNH SỬA ===== */}
          <div className="form-group">
            <label>
              {intl.formatMessage({ id: 'doctor.manage-patient.email-label' })} *
              <span className="readonly-badge">🔒</span>
            </label>
            <input
              type="email"
              className="form-control form-control--readonly"
              value={email}
              readOnly              // ✅ [FIX #3] READONLY — không cho sửa
              tabIndex={-1}         // Bỏ qua khi Tab → UX rõ ràng "không tương tác"
            />
            <small className="form-hint">
              {language === LANGUAGES.VI
                ? 'Email được lấy tự động từ hồ sơ bệnh nhân. Không thể thay đổi.'
                : 'Email is automatically retrieved from patient records. Cannot be changed.'}
            </small>
          </div>

          {/* ===== IMAGE UPLOAD + PREVIEW VỚI NÚT [X] REMOVE ===== */}
          <div className="form-group">
            <label>{intl.formatMessage({ id: 'doctor.manage-patient.image-label' })}</label>
            <input
              type="file"
              accept="image/jpeg,image/png"
              onChange={handleImageChange}
              disabled={isSubmitting}
              className="form-control"
            />

            {/* Preview Container với nút Remove */}
            {previewUrl && (
              <div className="image-preview-container">
                <img
                  src={previewUrl}
                  alt="preview"
                  className="image-preview__img"
                />
                {!isSubmitting && (
                  <button
                    type="button"
                    className="image-preview__remove-btn"
                    onClick={handleRemoveImage}
                    title={
                      language === LANGUAGES.VI
                        ? 'Xóa ảnh đã chọn'
                        : 'Remove selected image'
                    }
                  >
                    ✕
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ===== FOOTER ===== */}
        <div className="remedy-modal__footer">
          <button
            className="btn btn-send"
            onClick={handleSendRemedy}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="spinner-small"></span>
                {intl.formatMessage({ id: 'doctor.manage-patient.sending' })}
              </>
            ) : (
              <>📧 {intl.formatMessage({ id: 'doctor.manage-patient.btn-send' })}</>
            )}
          </button>
          <button
            className="btn btn-cancel"
            onClick={handleCloseModal}
            disabled={isSubmitting}
          >
            {intl.formatMessage({ id: 'common.cancel' })}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RemedyModal;
```

---

### 4.8 CSS bổ sung

```scss
// ManagePatient.scss hoặc RemedyModal.scss

// ===== [FIX #3] READONLY EMAIL STYLING =====
.form-control--readonly {
  background-color: #f5f5f5;    // Nền xám nhạt → trực quan "không sửa được"
  color: #555;
  cursor: not-allowed;
  border: 1px solid #ddd;
  user-select: none;            // Không cho bôi đen copy (optional)
}

.readonly-badge {
  margin-left: 6px;
  font-size: 12px;
}

.form-hint {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: #888;
  font-style: italic;
}

// ===== PREVIEW CONTAINER VỚI NÚT [X] =====
.image-preview-container {
  position: relative;
  display: inline-block;
  margin-top: 12px;
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid #e0e0e0;
  max-width: 300px;

  .image-preview__img {
    display: block;
    width: 100%;
    height: auto;
    max-height: 200px;
    object-fit: cover;
  }

  .image-preview__remove-btn {
    position: absolute;
    top: 6px;
    right: 6px;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: none;
    background-color: rgba(0, 0, 0, 0.6);
    color: #fff;
    font-size: 14px;
    font-weight: bold;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.2s ease;
    z-index: 2;

    &:hover {
      background-color: rgba(220, 53, 69, 0.9);
    }
  }
}
```

---

## 5. Sơ đồ bảo mật Email — TRƯỚC vs SAU fix

```
❌ TRƯỚC (v1.x) — LỖ HỔNG BẢO MẬT:
┌──────────────┐         ┌──────────────┐         ┌───────────┐
│ RemedyModal   │ ──────► │ Backend API  │ ──────► │ Email     │
│               │         │              │         │ Service   │
│ email = input │         │ email =      │         │           │
│ (USER có thể │         │ req.body     │         │ Gửi đến   │
│  sửa thành   │         │ .email       │         │ email     │
│  bất kỳ ai!) │         │ (TIN USER!)  │         │ GIẢM MẠO! │
└──────────────┘         └──────────────┘         └───────────┘

✅ SAU (v2.0) — AN TOÀN:
┌──────────────┐         ┌──────────────┐         ┌───────────┐
│ RemedyModal   │ ──────► │ Backend API  │ ──────► │ Email     │
│               │         │              │         │ Service   │
│ email =       │         │ 1. Query     │         │           │
│ READONLY      │         │    Booking   │         │ Gửi đến   │
│ (KHÔNG gửi   │         │ 2. Include   │         │ email     │
│  trong body!) │         │    patient   │         │ THẬT từ   │
│               │         │ 3. email =   │         │ DATABASE! │
│               │         │    booking   │         │           │
│               │         │    .patient  │         │           │
│               │         │    Data      │         │           │
│               │         │    .email    │         │           │
└──────────────┘         └──────────────┘         └───────────┘
```

---

## 6. Tóm tắt checklist RemedyModal (v2.0)

| # | Logic | Code pattern | v1.x | v2.0 |
|---|-------|-------------|------|------|
| 1 | Pre-fill email | `useEffect([dataModal])` → `setEmail(...)` | ✅ | ✅ |
| 2 | **Email READONLY** | **`readOnly` + `tabIndex={-1}` + CSS `not-allowed`** | ❌ **Editable** | ✅ **FIXED** |
| 3 | **KHÔNG gửi email trong body** | **Request body không có field `email`** | ❌ **Gửi email** | ✅ **FIXED** |
| 4 | Chọn ảnh + giữ prefix | `CommonUtils.getBase64()` | ✅ | ✅ |
| 5 | Validate ảnh (5MB, JPEG/PNG) | `file.size`, `file.type` check | ✅ | ✅ |
| 6 | Remove ảnh (nút [❌]) | `handleRemoveImage()` | ✅ | ✅ |
| 7 | Close modal clear state | `setEmail('')`, `setImageBase64('')`, `URL.revokeObjectURL()` | ✅ | ✅ |
| 8 | Loading spinner | `setIsSubmitting(true/false)` + `finally` | ✅ | ✅ |
| 9 | Bắt lỗi 401 | `err.response.status === 401` | ✅ | ✅ |
| 10 | **useEffect cleanup** | **`return () => URL.revokeObjectURL(previewUrl)`** | ❌ **THIẾU** | ✅ **FIXED** |
| 11 | IDOR prevention | Không gửi doctorId | ✅ | ✅ |

---

> **Tiếp theo:** [Phase8_03_Backend_API.md](./Phase8_03_Backend_API.md) — Backend API và Sequelize queries
