# 🔬 BƯỚC 5 — QUẢN LÝ CHUYÊN KHOA (SPECIALTY MANAGE)

> **Mục tiêu:** CRUD Specialties — tạo/sửa/xóa chuyên khoa với upload ảnh và Markdown mô tả
> **Thời gian:** Ngày 8
> **SRS:** REQ-AM-015, 016, 017
> **API:** `getAllSpecialty()`, `createSpecialty(data)`, `editSpecialty(data)`, `deleteSpecialty(id)`

---

## 5.1 Tổng Quan Giao Diện

```
┌──────────────────────────────────────────────────────────┐
│  🔬 Quản Lý Chuyên Khoa               [+ Thêm mới]      │
├──────────────────────────────────────────────────────────┤
│  ┌─── Form ───────────────────────────────────────────┐  │
│  │ Tên chuyên khoa* | Ảnh (upload+preview tròn)       │  │
│  │ Mô tả (Markdown Editor)                             │  │
│  │                         [💾 Lưu]     [✕ Huỷ]      │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌─── Danh sách Grid 4 cột (BookingCare style) ───────┐  │
│  │  [🫀]          [🦷]          [🧠]          [🦷]     │  │
│  │  Tim Mạch       Nha Khoa      Thần Kinh     ...      │  │
│  │  [✏️] [🗑️]      [✏️] [🗑️]    [✏️] [🗑️]             │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

> 💡 **Chuẩn BookingCare:** Chuyên khoa hiển thị dạng grid với ảnh tròn + tên dưới đây — giống như trang chủ carousel

---

## 5.2 Tạo `SpecialtyManage.jsx`

```jsx
// src/containers/System/Admin/SpecialtyManage.jsx
// Quản lý chuyên khoa (REQ-AM-015, 016, 017)
import React, { useEffect, useState } from 'react';
import MDEditor from '@uiw/react-md-editor';
import Swal from 'sweetalert2';
import {
  getAllSpecialty,
  createSpecialty,
  editSpecialty,
  deleteSpecialty,
} from '../../../services/specialtyService';
import CommonUtils from '../../../utils/CommonUtils'; // ⚠️ Default export (không dùng { CommonUtils })
import './SpecialtyManage.scss';

const INIT_FORM = {
  id: '',
  name: '',
  descriptionMarkdown: '',
  descriptionHTML: '',
  previewImgURL: '',
  imageBase64: '',
};

const SpecialtyManage = () => {
  const [specialties, setSpecialties] = useState([]);
  const [formData, setFormData] = useState(INIT_FORM);
  const [isEditing, setIsEditing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => { fetchSpecialties(); }, []);

  const fetchSpecialties = async () => {
    setIsLoading(true);
    try {
      const res = await getAllSpecialty();
      if (res.errCode === 0) setSpecialties(res.data || []);
    } catch (err) { console.error(err); }
    setIsLoading(false);
  };

  const handleInput = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleMarkdownChange = (value = '') => {
    setFormData((prev) => ({
      ...prev,
      descriptionMarkdown: value,
      descriptionHTML: value,
    }));
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      Swal.fire('Lỗi!', 'Ảnh không được vượt quá 5MB', 'error');
      return;
    }
    const base64 = await CommonUtils.getBase64(file);
    setFormData((prev) => ({
      ...prev,
      previewImgURL: URL.createObjectURL(file),
      imageBase64: base64,
    }));
  };

  const handleAddNew = () => {
    setFormData(INIT_FORM);
    setIsEditing(false);
    setShowForm(true);
  };

  const handleEdit = (specialty) => {
    setFormData({
      id: specialty.id,
      name: specialty.name || '',
      descriptionMarkdown: specialty.descriptionMarkdown || '',
      descriptionHTML: specialty.descriptionHTML || '',
      previewImgURL: specialty.image ? `data:image/jpeg;base64,${specialty.image}` : '',
      imageBase64: '',
    });
    setIsEditing(true);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (specialty) => {
    const result = await Swal.fire({
      title: 'Xác nhận xóa?',
      text: `Xóa chuyên khoa "${specialty.name}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      confirmButtonText: 'Xóa',
      cancelButtonText: 'Huỷ',
    });

    if (result.isConfirmed) {
      try {
        const res = await deleteSpecialty(specialty.id);
        if (res.errCode === 0) {
          Swal.fire('Đã xóa!', '', 'success');
          fetchSpecialties();
        } else {
          Swal.fire('Lỗi!', res.message, 'error');
        }
      } catch (err) { Swal.fire('Lỗi!', 'Kết nối server lỗi', 'error'); }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) {
      Swal.fire('Thiếu thông tin!', 'Vui lòng nhập tên chuyên khoa.', 'warning');
      return;
    }

    try {
      const payload = {
        name: formData.name,
        descriptionMarkdown: formData.descriptionMarkdown,
        descriptionHTML: formData.descriptionHTML,
        imageBase64: formData.imageBase64 || undefined,
      };

      let res;
      if (isEditing) {
        res = await editSpecialty({ ...payload, id: formData.id });
      } else {
        res = await createSpecialty(payload);
      }

      if (res.errCode === 0) {
        Swal.fire('Thành công!', isEditing ? 'Đã cập nhật chuyên khoa.' : 'Đã tạo chuyên khoa mới.', 'success');
        setShowForm(false);
        setFormData(INIT_FORM);
        fetchSpecialties();
      } else {
        Swal.fire('Lỗi!', res.message, 'error');
      }
    } catch (err) { Swal.fire('Lỗi!', 'Kết nối server lỗi', 'error'); }
  };

  return (
    <div className="specialty-manage">
      <div className="manage-header">
        <h2 className="manage-title">🔬 Quản Lý Chuyên Khoa</h2>
        <button className="btn-add" onClick={handleAddNew}>+ Thêm mới</button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="form-card">
          <h4 className="form-title">{isEditing ? '✏️ Sửa chuyên khoa' : '➕ Thêm chuyên khoa mới'}</h4>
          <form onSubmit={handleSubmit}>
            <div className="form-top">
              {/* Ảnh tròn — BookingCare style */}
              <div className="form-group img-group">
                <label>Ảnh chuyên khoa (tròn)</label>
                <label className="img-upload-label" htmlFor="spec-img">
                  {formData.previewImgURL
                    ? <img src={formData.previewImgURL} alt="preview" className="img-preview-round" />
                    : <span>📷 Chọn ảnh</span>
                  }
                </label>
                <input id="spec-img" type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
              </div>

              {/* Tên */}
              <div className="form-group flex-1">
                <label>Tên chuyên khoa <span className="required">*</span></label>
                <input
                  type="text" name="name" value={formData.name}
                  onChange={handleInput} className="form-control"
                  placeholder="Tim Mạch, Nha Khoa, Thần Kinh..."
                />
              </div>
            </div>

            {/* Markdown */}
            <div className="form-group">
              <label>Mô tả chuyên khoa (Markdown)</label>
              <div data-color-mode="light">
                <MDEditor
                  value={formData.descriptionMarkdown}
                  onChange={handleMarkdownChange}
                  height={280}
                  preview="live"
                  placeholder="## Chuyên khoa Tim Mạch&#10;..."
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-save">💾 Lưu lại</button>
              <button type="button" className="btn-cancel" onClick={() => setShowForm(false)}>✕ Huỷ</button>
            </div>
          </form>
        </div>
      )}

      {/* Danh sách dạng grid — BookingCare style */}
      <div className="specialty-grid">
        {isLoading ? (
          <p className="loading-text">Đang tải...</p>
        ) : specialties.length === 0 ? (
          <p className="no-data">Chưa có chuyên khoa nào.</p>
        ) : (
          specialties.map((spec) => (
            <div key={spec.id} className="specialty-card">
              <div className="spec-img-wrap">
                {spec.image
                  ? <img src={`data:image/jpeg;base64,${spec.image}`} alt={spec.name} className="spec-img" />
                  : <div className="spec-img-placeholder">🔬</div>
                }
              </div>
              <h5 className="spec-name">{spec.name}</h5>
              <div className="spec-actions">
                <button className="btn-edit" onClick={() => handleEdit(spec)}>✏️</button>
                <button className="btn-delete" onClick={() => handleDelete(spec)}>🗑️</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SpecialtyManage;
```

---

## 5.3 Tạo `SpecialtyManage.scss`

```scss
// src/containers/System/Admin/SpecialtyManage.scss
@import '../../../styles/variables';

.specialty-manage {
  .manage-header {
    display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;
    .manage-title { font-size: 1.4rem; font-weight: 700; color: #333; margin: 0; }
    .btn-add {
      background: $primary; color: #fff; border: none;
      padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer;
      &:hover { background: darken($primary, 10%); }
    }
  }

  .form-card {
    background: #fff; border-radius: 12px; padding: 24px;
    margin-bottom: 20px; box-shadow: 0 2px 12px rgba(0,0,0,0.08);
    border-left: 4px solid $primary;

    .form-title { font-size: 1.1rem; font-weight: 600; margin-bottom: 16px; }

    .form-top {
      display: flex; align-items: flex-start; gap: 20px; margin-bottom: 16px;
      .flex-1 { flex: 1; }
    }

    .form-group {
      display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px;
      label { font-size: 0.85rem; font-weight: 600; color: #555; .required { color: #dc3545; } }
      .form-control {
        padding: 8px 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 0.9rem;
        &:focus { outline: none; border-color: $primary; }
      }
    }

    // Upload ảnh tròn — giống avatar bác sĩ
    .img-group {
      .img-upload-label {
        width: 100px; height: 100px; border-radius: 50%;
        border: 2px dashed #ddd; display: flex; align-items: center; justify-content: center;
        cursor: pointer; background: #f9f9f9; color: #888; overflow: hidden;
        font-size: 0.8rem; text-align: center; transition: 0.2s;
        &:hover { border-color: $primary; color: $primary; }
        .img-preview-round { width: 100%; height: 100%; object-fit: cover; }
      }
    }

    .form-actions {
      display: flex; gap: 12px; margin-top: 16px; padding-top: 16px; border-top: 1px solid #eee;
      .btn-save { background: $primary; color: #fff; border: none; padding: 10px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; &:hover { background: darken($primary, 10%); } }
      .btn-cancel { background: #f5f5f5; color: #666; border: 1px solid #ddd; padding: 10px 24px; border-radius: 8px; cursor: pointer; }
    }
  }

  // Grid chuyên khoa — BookingCare style
  .specialty-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;

    @media (max-width: 1024px) { grid-template-columns: repeat(3, 1fr); }
    @media (max-width: 768px) { grid-template-columns: repeat(2, 1fr); }

    .loading-text, .no-data { grid-column: 1/-1; text-align: center; color: #888; padding: 40px; }

    .specialty-card {
      background: #fff; border-radius: 12px; padding: 20px 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.07); text-align: center;
      transition: all 0.2s; cursor: default;
      &:hover { box-shadow: 0 4px 20px rgba(0,0,0,0.12); transform: translateY(-2px); }

      .spec-img-wrap {
        margin-bottom: 10px;
        .spec-img {
          width: 80px; height: 80px; border-radius: 50%;
          object-fit: cover; border: 3px solid rgba(69,195,210,0.3);
          margin: 0 auto; display: block;
        }
        .spec-img-placeholder {
          width: 80px; height: 80px; border-radius: 50%; margin: 0 auto;
          background: #e8f9fb; display: flex; align-items: center; justify-content: center;
          font-size: 2rem; border: 3px solid rgba(69,195,210,0.3);
        }
      }

      .spec-name {
        font-size: 0.9rem; font-weight: 700; color: #333; margin: 0 0 10px;
        display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
      }

      .spec-actions {
        display: flex; justify-content: center; gap: 8px;
        button {
          border: none; padding: 5px 10px; border-radius: 6px; cursor: pointer;
          font-size: 0.9rem; transition: 0.2s;
          &.btn-edit { background: #fff3cd; &:hover { background: #ffc107; } }
          &.btn-delete { background: #f8d7da; &:hover { background: #dc3545; color: #fff; } }
        }
      }
    }
  }
}
```

---

## ✅ Checklist Bước 5

- [ ] `SpecialtyManage.jsx` — Form + grid 4 cột BookingCare style
- [ ] `SpecialtyManage.scss` — Grid, ảnh tròn, hover card
- [ ] Test REQ-AM-015: Tạo chuyên khoa Nội Khoa → ảnh tròn → lưu → hiện trong grid
- [ ] Test REQ-AM-016: Nhấn ✏️ → form điền sẵn → sửa tên → lưu
- [ ] Test REQ-AM-017: Nhấn 🗑️ → confirm → card biến mất
- [ ] Kiểm tra: Chuyên khoa mới tạo hiện trên trang chủ `/` trong section Specialty carousel

---

> 📖 **Tiếp theo:** [Phase6_06_ScheduleManage.md](Phase6_06_ScheduleManage.md)
