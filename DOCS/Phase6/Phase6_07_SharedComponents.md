# 🧩 BƯỚC 7 — SHARED COMPONENTS (TÁI SỬ DỤNG)

> **Mục tiêu:** Tách các logic lặp lại ra thành shared components dùng chung cho toàn bộ module Admin (GĐ6), Patient (GĐ7), Doctor (GĐ8)
> **Thời gian:** Có thể làm song song với Bước 2–6, hoặc refactor sau khi hoàn thành GĐ6
> **Lợi ích:** Giảm code lặp ~60%, dễ bảo trì, nhất quán UI xuyên suốt

---

## 7.1 Tổng Quan — Pattern Lặp Lại

| Logic | Xuất hiện ở | Số lần lặp |
|-------|------------|-----------|
| Upload ảnh → base64 + preview + size check | UserManage, DoctorManage, ClinicManage, SpecialtyManage | **4 lần** |
| Markdown editor wrapper | DoctorManage, ClinicManage, SpecialtyManage | **3 lần** |
| SweetAlert2 confirm delete | UserManage, DoctorManage, ClinicManage, SpecialtyManage, ScheduleManage | **5 lần** |

---

## 7.2 Tạo Folder `src/components/Common/`

```
src/components/Common/
├── ImageUploadInput.jsx    ← Upload ảnh + preview + base64
├── ImageUploadInput.scss   ← Styles cho upload
├── MarkdownEditorField.jsx ← Wrapper @uiw/react-md-editor
└── confirmDelete.js        ← SweetAlert2 helper
```

---

## 7.3 `ImageUploadInput.jsx`

```jsx
// src/components/Common/ImageUploadInput.jsx
// Shared component — Upload ảnh, preview, convert sang base64 (REQ-AM-008)
// Dùng ở: UserManage, DoctorManage, ClinicManage, SpecialtyManage (GĐ6)
import React from 'react';
import { showError } from '../../utils/confirmDelete';
import CommonUtils from '../../utils/CommonUtils';  // ⚠️ Default export
import './ImageUploadInput.scss';

/**
 * @param {string}   previewUrl  — URL preview hiện tại (base64 string hoặc object URL)
 * @param {Function} onChange    — callback({ base64, objectUrl }) khi chọn ảnh mới
 * @param {string}   shape       — 'round' | 'rect' (tròn hoặc chữ nhật)
 * @param {number}   maxSizeMB   — Giới hạn MB, mặc định 5
 * @param {string}   inputId     — ID unique cho input (tránh conflict nếu có nhiều trên 1 trang)
 * @param {string}   label       — Label hiển thị khi chưa có ảnh
 */
const ImageUploadInput = ({
  previewUrl = '',
  onChange,
  shape = 'round',
  maxSizeMB = 5,
  inputId = 'img-upload-default',
  label = '📷 Chọn ảnh',
}) => {
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Kiểm tra kích thước (SRS Constraint #7 — max 5MB, JPEG/PNG)
    if (file.size > maxSizeMB * 1024 * 1024) {
      showError(`Ảnh không được vượt quá ${maxSizeMB}MB`);
      return;
    }

    // Kiểm tra định dạng (chỉ JPEG/PNG)
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      showError('Chỉ hỗ trợ định dạng JPEG và PNG');
      return;
    }

    // ⚠️ FIX QUAN TRỌNG: getBase64() trả data URL đầy đủ (data:image/jpeg;base64,XXXX)
    // Backend chỉ cần raw base64 — phải strip prefix trước khi gửi
    const dataUrl = await CommonUtils.getBase64(file);
    const base64 = dataUrl.split(',')[1] || dataUrl;  // raw base64 only
    const objectUrl = URL.createObjectURL(file);

    if (onChange) {
      onChange({ base64, objectUrl });
    }
    // Reset input để có thể chọn lại cùng file
    e.target.value = '';
  };

  return (
    <div className={`image-upload-input shape-${shape}`}>
      <label className="upload-label" htmlFor={inputId}>
        {previewUrl ? (
          <img src={previewUrl} alt="preview" className="upload-preview" />
        ) : (
          <span className="upload-placeholder">{label}</span>
        )}
        {previewUrl && <div className="upload-overlay">🔄 Đổi ảnh</div>}
      </label>
      <input
        id={inputId}
        type="file"
        accept="image/jpeg,image/png"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      <p className="upload-hint">Max {maxSizeMB}MB — JPEG, PNG</p>
    </div>
  );
};

export default ImageUploadInput;
```

> **Các điểm khác biệt so với thiết kế ban đầu:**
> 1. Import `CommonUtils` là **default export** (không dùng `{ CommonUtils }`)
> 2. Dùng `showError()` từ `confirmDelete.js` thay vì `Swal.fire` trực tiếp
> 3. **Bắt buộc** strip base64 prefix với `.split(',')[1]` trước khi cầm onChange

---

## 7.4 `ImageUploadInput.scss`

```scss
// src/components/Common/ImageUploadInput.scss
@import '../../styles/variables';

.image-upload-input {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;

  .upload-label {
    cursor: pointer;
    position: relative;
    overflow: hidden;
    border: 2px dashed #ddd;
    background: #f9f9f9;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: border-color 0.2s;

    &:hover {
      border-color: $primary;

      .upload-overlay {
        opacity: 1;
      }
    }

    .upload-preview {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .upload-placeholder {
      color: #888;
      font-size: 0.85rem;
      text-align: center;
      padding: 8px;
    }

    .upload-overlay {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: rgba(0, 0, 0, 0.5);
      color: #fff;
      text-align: center;
      padding: 4px;
      font-size: 0.75rem;
      opacity: 0;
      transition: opacity 0.2s;
    }
  }

  .upload-hint {
    font-size: 0.72rem;
    color: #aaa;
    margin: 0;
  }

  // ===== SHAPE VARIANTS =====

  // Tròn — dùng cho bác sĩ, chuyên khoa, avatar user
  &.shape-round .upload-label {
    width: 110px;
    height: 110px;
    border-radius: 50%;

    .upload-overlay {
      bottom: 0;
      height: 30px;
      border-radius: 0 0 50% 50%;
    }
  }

  // Chữ nhật — dùng cho phòng khám, banner
  &.shape-rect .upload-label {
    width: 200px;
    height: 120px;
    border-radius: 8px;
  }
}
```

---

## 7.5 Sử Dụng `ImageUploadInput` Trong Các Component

### Thay thế trong `UserManage.jsx`

```jsx
// XÓA code cũ:
<div className="image-upload-wrap">
  <label className="image-upload-label" htmlFor="user-image-upload">
    {formData.previewImgURL
      ? <img src={formData.previewImgURL} alt="preview" className="image-preview" />
      : <span>📷 Chọn ảnh (max 5MB)</span>
    }
  </label>
  <input id="user-image-upload" type="file" accept="image/jpeg,image/png" onChange={handleImageChange} style={{ display: 'none' }} />
</div>

// THAY BẰNG:
import ImageUploadInput from '../../../components/Common/ImageUploadInput';

<ImageUploadInput
  previewUrl={formData.previewImgURL}
  inputId="user-img-upload"
  shape="round"
  onChange={({ base64, objectUrl }) => setFormData(prev => ({
    ...prev,
    previewImgURL: objectUrl,
    imageBase64: base64,
  }))}
/>
```

### Thay thế trong `DoctorManage.jsx`
```jsx
<ImageUploadInput
  previewUrl={doctorInfo.previewImgURL}
  inputId="doctor-img-upload"
  shape="round"
  onChange={({ base64, objectUrl }) => setDoctorInfo(prev => ({
    ...prev,
    previewImgURL: objectUrl,
    imageBase64: base64,
  }))}
/>
```

### Thay thế trong `ClinicManage.jsx`
```jsx
<ImageUploadInput
  previewUrl={formData.previewImgURL}
  inputId="clinic-img-upload"
  shape="rect"       // ← chữ nhật cho phòng khám
  onChange={({ base64, objectUrl }) => setFormData(prev => ({
    ...prev,
    previewImgURL: objectUrl,
    imageBase64: base64,
  }))}
/>
```

### Thay thế trong `SpecialtyManage.jsx`
```jsx
<ImageUploadInput
  previewUrl={formData.previewImgURL}
  inputId="spec-img-upload"
  shape="round"
  onChange={({ base64, objectUrl }) => setFormData(prev => ({
    ...prev,
    previewImgURL: objectUrl,
    imageBase64: base64,
  }))}
/>
```

> **Lưu ý:** Khi dùng `ImageUploadInput`, **xóa** `handleImageChange` function và `CommonUtils.getBase64` import ra khỏi từng component (logic đã được đưa vào shared component).

---

## 7.6 `MarkdownEditorField.jsx`

```jsx
// src/components/Common/MarkdownEditorField.jsx
// Wrapper cho @uiw/react-md-editor — tái sử dụng trong DoctorManage, ClinicManage, SpecialtyManage
import React from 'react';
import MDEditor from '@uiw/react-md-editor';
import '@uiw/react-md-editor/markdown-editor.css';  // ⚠️ BẮt buộc — thiếu sẽ không có CSS toolbar
import './MarkdownEditorField.scss';

/**
 * @param {string}   value       — Nội dung Markdown hiện tại
 * @param {Function} onChange    — callback(markdownString)
 * @param {number}   height      — Chiều cao editor, mặc định 300
 * @param {string}   placeholder — Placeholder text
 * @param {string}   label       — Label trên editor
 */
const MarkdownEditorField = ({
  value = '',
  onChange,
  height = 300,
  placeholder = '# Tiêu đề\n\nNhập nội dung Markdown...',
  label = 'Mô tả chi tiết (Markdown)',
}) => {
  return (
    <div className="markdown-editor-field">
      {label && <label className="editor-label">{label}</label>}
      <p className="editor-hint">
        💡 Cột trái — viết Markdown | Cột phải — preview thực tế
      </p>
      <div data-color-mode="light">
        <MDEditor
          value={value}
          onChange={(val = '') => onChange && onChange(val)}
          height={height}
          preview="live"
          placeholder={placeholder}
        />
      </div>
    </div>
  );
};

export default MarkdownEditorField;
```

> **Điểm khác biệt:** Thêm `import '@uiw/react-md-editor/markdown-editor.css'` — bẫt buộc cho toolbar và split-pane có CSS.

---

## 7.7 `MarkdownEditorField.scss`

```scss
// src/components/Common/MarkdownEditorField.scss
.markdown-editor-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 16px;

  .editor-label {
    font-size: 0.85rem;
    font-weight: 600;
    color: #555;
  }

  .editor-hint {
    font-size: 0.78rem;
    color: #888;
    font-style: italic;
    margin: 0;
  }

  // Override MDEditor border radius
  .w-md-editor {
    border-radius: 8px !important;
    border: 1px solid #ddd !important;

    &:focus-within {
      border-color: #45c3d2 !important;
      box-shadow: 0 0 0 3px rgba(69, 195, 210, 0.1) !important;
    }
  }
}
```

---

## 7.8 Sử Dụng `MarkdownEditorField` Trong Các Component

### Thay thế trong `DoctorManage.jsx`
```jsx
// XÓA:
import MDEditor from '@uiw/react-md-editor';
<div data-color-mode="light">
  <MDEditor value={...} onChange={...} height={400} preview="live" />
</div>

// THAY BẰNG:
import MarkdownEditorField from '../../../components/Common/MarkdownEditorField';

<MarkdownEditorField
  value={doctorInfo.contentMarkdown}
  onChange={(val) => setDoctorInfo(prev => ({
    ...prev,
    contentMarkdown: val,
    contentHTML: val,  // Backend lưu cả 2 (REQ-AM-007)
  }))}
  height={400}
  label="Bài Giới Thiệu Bác Sĩ (Markdown)"
  placeholder="## Giới thiệu bác sĩ&#10;&#10;..."
/>
```

### Thay thế trong `ClinicManage.jsx`
```jsx
<MarkdownEditorField
  value={formData.descriptionMarkdown}
  onChange={(val) => setFormData(prev => ({
    ...prev,
    descriptionMarkdown: val,
    descriptionHTML: val,
  }))}
  height={300}
  label="Mô tả chi tiết phòng khám (Markdown)"
/>
```

### Thay thế trong `SpecialtyManage.jsx`
```jsx
<MarkdownEditorField
  value={formData.descriptionMarkdown}
  onChange={(val) => setFormData(prev => ({
    ...prev,
    descriptionMarkdown: val,
    descriptionHTML: val,
  }))}
  height={280}
  label="Mô tả chuyên khoa (Markdown)"
/>
```

---

## 7.9 `confirmDelete.js` — SweetAlert2 Helper

```js
// src/utils/confirmDelete.js
// Helper nhất quán cho tất cả confirm delete dialogs
import Swal from 'sweetalert2';

/**
 * Hiển thị modal xác nhận xóa — BookingCare admin style
 * @param {string} itemName   — Tên item cần xóa (hiển thị trong nội dung)
 * @param {string} extraText  — Nội dung bổ sung (optional)
 * @returns {Promise<boolean>} — true nếu user nhấn Xóa, false nếu nhấn Huỷ
 */
export const confirmDelete = async (itemName, extraText = '') => {
  const result = await Swal.fire({
    title: 'Xác nhận xóa?',
    text: extraText || `Bạn có chắc muốn xóa "${itemName}"? Hành động này không thể khôi phục.`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#dc3545',
    cancelButtonColor: '#6c757d',
    confirmButtonText: '🗑️ Xóa',
    cancelButtonText: 'Huỷ',
    reverseButtons: true,
  });
  return result.isConfirmed;
};

export const showSuccess = (message) => {
  return Swal.fire({
    icon: 'success', title: 'Thành công!', text: message,
    timer: 1800, showConfirmButton: false,
  });
};

export const showError = (message) => {
  return Swal.fire({ icon: 'error', title: 'Lỗi!', text: message });
};

// ⚠️ Thêm showWarning (không có trong thiết kế ban đầu, bổ sung trong lúc code)
export const showWarning = (title, message) => {
  return Swal.fire({ icon: 'warning', title, text: message });
};
```

### Sử Dụng Trong Các Component

```jsx
// import:
import { confirmDelete, showSuccess, showError } from '../../../utils/confirmDelete';

// Thay Swal.fire confirm + Swal.fire success + Swal.fire error bằng:
const handleDelete = async (user) => {
  const confirmed = await confirmDelete(`${user.lastName} ${user.firstName}`);
  if (!confirmed) return;

  try {
    const res = await deleteUser(user.id);
    if (res.errCode === 0) {
      await showSuccess('Người dùng đã xóa thành công.');
      fetchUsers();
    } else {
      showError(res.message || 'Xóa thất bại');
    }
  } catch {
    showError('Không thể kết nối server');
  }
};
```

---

## 7.10 Cấu Trúc File Sau Khi Áp Dụng Shared Components

```
src/
├── components/
│   ├── Common/
│   │   ├── ImageUploadInput.jsx   ← [MỚI GĐ6-B7]
│   │   ├── ImageUploadInput.scss  ← [MỚI GĐ6-B7]
│   │   ├── MarkdownEditorField.jsx  ← [MỚI GĐ6-B7]
│   │   └── MarkdownEditorField.scss ← [MỚI GĐ6-B7]
│   ├── Header/
│   │   ├── Header.jsx
│   │   ├── Header.scss
│   │   └── MenuData.js
│   ├── Footer/Footer.jsx
│   ├── Loading/Loading.jsx
│   └── Navigator/
│       ├── Navigator.jsx
│       └── Navigator.scss
├── utils/
│   ├── constants.js
│   ├── CommonUtils.js
│   └── confirmDelete.js  ← [MỚI GĐ6-B7]
└── containers/System/Admin/
    ├── UserManage.jsx + .scss     (dùng ImageUploadInput)
    ├── DoctorManage.jsx + .scss   (dùng ImageUploadInput + MarkdownEditorField)
    ├── ClinicManage.jsx + .scss   (dùng ImageUploadInput + MarkdownEditorField)
    ├── SpecialtyManage.jsx + .scss (dùng ImageUploadInput + MarkdownEditorField)
    └── ScheduleManage.jsx + .scss
```

---

## ✅ Checklist Bước 7

- [x] `src/components/Common/` folder tạo xong
- [x] `ImageUploadInput.jsx` + `.scss` — đúng default `CommonUtils` import + base64 strip fix
- [x] `MarkdownEditorField.jsx` + `.scss` — có `@uiw/react-md-editor/markdown-editor.css` import
- [x] `src/utils/confirmDelete.js` — `confirmDelete()`, `showSuccess()`, `showError()`, `showWarning()`
- [x] **UserManage.jsx** — dùng ImageUploadInput + confirmDelete + không gửi password khi edit
- [x] **DoctorManage.jsx** — dùng ImageUploadInput (round) + MarkdownEditorField + confirmDelete
- [x] **ClinicManage.jsx** — dùng ImageUploadInput (rect) + MarkdownEditorField + confirmDelete
- [x] **SpecialtyManage.jsx** — dùng ImageUploadInput (round) + MarkdownEditorField + confirmDelete
- [x] **ScheduleManage.jsx** — dùng confirmDelete + showSuccess + showError + showWarning
- [x] Build production: ✅ **1381 modules transformed, exit 0**

---

> ✅ Sau Bước 7, GĐÔ6 hoàn chỉnh 100% — sẵn sàng cho **Giai Đoạn 7: Module Patient**
