# 🏥 BƯỚC 4 — QUẢN LÝ PHÒNG KHÁM (CLINIC MANAGE)

> **Mục tiêu:** CRUD Clinics — tạo/sửa/xóa phòng khám với upload ảnh, mô tả Markdown
> **Thời gian:** Ngày 7
> **SRS:** REQ-AM-011, 012, 013, 014
> **API:** `getAllClinic()`, `createClinic(data)`, `editClinic(data)`, `deleteClinic(id)`

---

## 4.1 Tổng Quan Giao Diện

```
┌─────────────────────────────────────────────────────────┐
│  🏥 Quản Lý Phòng Khám                [+ Thêm mới]     │
├─────────────────────────────────────────────────────────┤
│  ┌─── Form (toggle) ────────────────────────────────┐   │
│  │ Tên PK* | Địa chỉ* | Ảnh (upload+preview)        │   │
│  │ Mô tả chi tiết (Markdown Editor)                  │   │
│  │                        [💾 Lưu]   [✕ Huỷ]        │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─── Danh sách Cards ──────────────────────────────┐   │
│  │  [Ảnh]  Bệnh Viện Chợ Rẫy         [✏️] [🗑️]      │   │
│  │  [Ảnh]  Phòng Khám Quốc Tế        [✏️] [🗑️]      │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## 4.2 Tạo `ClinicManage.jsx`

```jsx
// src/containers/System/Admin/ClinicManage.jsx
// Quản lý phòng khám (REQ-AM-011, 012, 013, 014)
import React, { useEffect, useState } from 'react';
import MDEditor from '@uiw/react-md-editor';
import Swal from 'sweetalert2';
import {
  getAllClinic,
  createClinic,
  editClinic,
  deleteClinic,
} from '../../../services/clinicService';
import CommonUtils from '../../../utils/CommonUtils'; // ⚠️ Default export (không dùng { CommonUtils })
import './ClinicManage.scss';

const INIT_FORM = {
  id: '',
  name: '',
  address: '',
  descriptionMarkdown: '',
  descriptionHTML: '',
  previewImgURL: '',
  imageBase64: '',
};

const ClinicManage = () => {
  const [clinics, setClinics] = useState([]);
  const [formData, setFormData] = useState(INIT_FORM);
  const [isEditing, setIsEditing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => { fetchClinics(); }, []);

  const fetchClinics = async () => {
    setIsLoading(true);
    try {
      const res = await getAllClinic();
      if (res.errCode === 0) setClinics(res.data || []);
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

  const handleEdit = (clinic) => {
    setFormData({
      id: clinic.id,
      name: clinic.name || '',
      address: clinic.address || '',
      descriptionMarkdown: clinic.descriptionMarkdown || '',
      descriptionHTML: clinic.descriptionHTML || '',
      previewImgURL: clinic.image ? `data:image/jpeg;base64,${clinic.image}` : '',
      imageBase64: '',
    });
    setIsEditing(true);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (clinic) => {
    const result = await Swal.fire({
      title: 'Xác nhận xóa?',
      text: `Xóa phòng khám "${clinic.name}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      confirmButtonText: 'Xóa',
      cancelButtonText: 'Huỷ',
    });

    if (result.isConfirmed) {
      try {
        const res = await deleteClinic(clinic.id);
        if (res.errCode === 0) {
          Swal.fire('Đã xóa!', '', 'success');
          fetchClinics();
        } else {
          Swal.fire('Lỗi!', res.message, 'error');
        }
      } catch (err) { Swal.fire('Lỗi!', 'Không thể kết nối server', 'error'); }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.address) {
      Swal.fire('Thiếu thông tin!', 'Vui lòng điền tên và địa chỉ phòng khám.', 'warning');
      return;
    }

    try {
      const payload = {
        name: formData.name,
        address: formData.address,
        descriptionMarkdown: formData.descriptionMarkdown,
        descriptionHTML: formData.descriptionHTML,
        imageBase64: formData.imageBase64 || undefined,
      };

      let res;
      if (isEditing) {
        res = await editClinic({ ...payload, id: formData.id });
      } else {
        res = await createClinic(payload);
      }

      if (res.errCode === 0) {
        Swal.fire('Thành công!', isEditing ? 'Đã cập nhật phòng khám.' : 'Đã tạo phòng khám mới.', 'success');
        setShowForm(false);
        setFormData(INIT_FORM);
        fetchClinics();
      } else {
        Swal.fire('Lỗi!', res.message, 'error');
      }
    } catch (err) { Swal.fire('Lỗi!', 'Không thể kết nối server', 'error'); }
  };

  return (
    <div className="clinic-manage">
      <div className="manage-header">
        <h2 className="manage-title">🏥 Quản Lý Phòng Khám</h2>
        <button className="btn-add" onClick={handleAddNew}>+ Thêm mới</button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="form-card">
          <h4 className="form-title">{isEditing ? '✏️ Sửa phòng khám' : '➕ Thêm phòng khám mới'}</h4>
          <form onSubmit={handleSubmit}>
            <div className="form-row-2">
              <div className="form-group">
                <label>Tên phòng khám <span className="required">*</span></label>
                <input type="text" name="name" value={formData.name} onChange={handleInput} className="form-control" placeholder="Bệnh viện Chợ Rẫy" />
              </div>
              <div className="form-group">
                <label>Địa chỉ <span className="required">*</span></label>
                <input type="text" name="address" value={formData.address} onChange={handleInput} className="form-control" placeholder="201 Nguyễn Chí Thanh, Q.5, TP.HCM" />
              </div>
            </div>

            {/* Ảnh upload */}
            <div className="form-group">
              <label>Ảnh đại diện (max 5MB)</label>
              <div className="image-upload-row">
                <label className="image-upload-label" htmlFor="clinic-img">
                  {formData.previewImgURL
                    ? <img src={formData.previewImgURL} alt="preview" className="image-preview-rect" />
                    : <span>📷 Chọn ảnh</span>
                  }
                </label>
                <input id="clinic-img" type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
              </div>
            </div>

            {/* Markdown editor */}
            <div className="form-group">
              <label>Mô tả chi tiết (Markdown)</label>
              <div data-color-mode="light">
                <MDEditor
                  value={formData.descriptionMarkdown}
                  onChange={handleMarkdownChange}
                  height={300}
                  preview="live"
                  placeholder="## Giới thiệu phòng khám..."
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

      {/* Danh sách — REQ-AM-014 */}
      <div className="clinic-list">
        {isLoading ? (
          <p className="loading-text">Đang tải...</p>
        ) : clinics.length === 0 ? (
          <p className="no-data">Chưa có phòng khám nào. Hãy thêm mới!</p>
        ) : (
          clinics.map((clinic) => (
            <div key={clinic.id} className="clinic-card">
              <div className="clinic-img-wrap">
                {clinic.image
                  ? <img src={`data:image/jpeg;base64,${clinic.image}`} alt={clinic.name} className="clinic-img" />
                  : <div className="clinic-img-placeholder">🏥</div>
                }
              </div>
              <div className="clinic-info">
                <h4 className="clinic-name">{clinic.name}</h4>
                <p className="clinic-address">📍 {clinic.address}</p>
              </div>
              <div className="clinic-actions">
                <button className="btn-edit" onClick={() => handleEdit(clinic)} title="Sửa">✏️ Sửa</button>
                <button className="btn-delete" onClick={() => handleDelete(clinic)} title="Xóa">🗑️ Xóa</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ClinicManage;
```

---

## 4.3 Tạo `ClinicManage.scss`

```scss
// src/containers/System/Admin/ClinicManage.scss
@import '../../../styles/variables';
@import '../../../styles/mixins';

.clinic-manage {
  .manage-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;

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

    .form-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

    .form-group {
      display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px;
      label { font-size: 0.85rem; font-weight: 600; color: #555; .required { color: #dc3545; } }
      .form-control {
        padding: 8px 12px; border: 1px solid #ddd; border-radius: 8px;
        &:focus { outline: none; border-color: $primary; }
      }
    }

    .image-upload-row {
      .image-upload-label {
        display: inline-flex; align-items: center; justify-content: center;
        width: 200px; height: 120px; border: 2px dashed #ddd; border-radius: 8px;
        cursor: pointer; background: #f9f9f9; color: #888; transition: 0.2s;
        &:hover { border-color: $primary; color: $primary; }
        .image-preview-rect { width: 100%; height: 100%; object-fit: cover; border-radius: 6px; }
      }
    }

    .form-actions {
      display: flex; gap: 12px; margin-top: 16px; padding-top: 16px; border-top: 1px solid #eee;
      .btn-save { background: $primary; color: #fff; border: none; padding: 10px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; &:hover { background: darken($primary, 10%); } }
      .btn-cancel { background: #f5f5f5; color: #666; border: 1px solid #ddd; padding: 10px 24px; border-radius: 8px; cursor: pointer; }
    }
  }

  // Danh sách cards
  .clinic-list {
    display: flex; flex-direction: column; gap: 12px;
    .loading-text, .no-data { text-align: center; color: #888; padding: 40px; }

    .clinic-card {
      background: #fff; border-radius: 12px; padding: 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.07);
      display: flex; align-items: center; gap: 16px;
      transition: box-shadow 0.2s;
      &:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.12); }

      .clinic-img-wrap {
        flex-shrink: 0;
        .clinic-img {
          width: 80px; height: 60px; object-fit: cover; border-radius: 8px;
          border: 1px solid #eee;
        }
        .clinic-img-placeholder {
          width: 80px; height: 60px; background: #f0f0f0; border-radius: 8px;
          display: flex; align-items: center; justify-content: center; font-size: 1.8rem;
        }
      }

      .clinic-info {
        flex: 1;
        .clinic-name { font-size: 1rem; font-weight: 700; margin: 0 0 4px; color: #333; }
        .clinic-address { font-size: 0.85rem; color: #777; margin: 0; }
      }

      .clinic-actions {
        display: flex; gap: 8px; flex-shrink: 0;
        button {
          padding: 7px 14px; border-radius: 6px; font-size: 0.85rem;
          font-weight: 600; cursor: pointer; border: none; transition: 0.2s;
        }
        .btn-edit { background: #fff3cd; color: #856404; &:hover { background: #ffc107; color: #fff; } }
        .btn-delete { background: #f8d7da; color: #721c24; &:hover { background: #dc3545; color: #fff; } }
      }
    }
  }
}
```

---

## ✅ Checklist Bước 4

- [ ] `ClinicManage.jsx` — Form tạo/sửa + danh sách card
- [ ] `ClinicManage.scss` — Card layout, ảnh chữ nhật
- [ ] Test REQ-AM-011: Thêm phòng khám → lưu → hiện trong danh sách
- [ ] Test REQ-AM-012: Nhấn "Sửa" → form điền sẵn → sửa tên → lưu
- [ ] Test REQ-AM-013: Nhấn "Xóa" → confirm → card biến mất
- [ ] Test REQ-AM-014: Danh sách hiện ảnh + tên + địa chỉ
- [ ] Test Markdown: Nhập nội dung → preview đúng

---

> 📖 **Tiếp theo:** [Phase6_05_SpecialtyManage.md](Phase6_05_SpecialtyManage.md)
