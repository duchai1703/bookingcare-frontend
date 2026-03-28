# 🩺 BƯỚC 3 — QUẢN LÝ BÁC SĨ (DOCTOR MANAGE)

> **Mục tiêu:** Trang phức tạp nhất — Admin gán hồ sơ chuyên môn cho bác sĩ (User đã có role R2): chọn bác sĩ, điền thông tin, viết giới thiệu bằng Markdown editor, upload ảnh
> **Thời gian:** Ngày 4–6
> **SRS:** REQ-AM-006, 007, 008, 009, 010, 022
> **API:** `getTopDoctors(100)`, `getDoctorDetail(id)`, `saveInfoDoctor(data)`, `deleteDoctorInfo(id)`

---

## 3.1 Cài Package Markdown Editor

```bash
npm install @uiw/react-md-editor
```

> `@uiw/react-md-editor` — hỗ trợ edit + preview Markdown cùng lúc, phổ biến và nhẹ

---

## 3.2 Tổng Quan Giao Diện

```
┌──────────────────────────────────────────────────────────────────────┐
│  🩺 Quản Lý Bác Sĩ                                                   │
├──────────────────────────────────────────────────────────────────────┤
│  ┌─── CHỌN BÁC SĨ (từ danh sách user có role R2) ─────────────────┐ │
│  │ [Dropdown: Chọn bác sĩ...]                                       │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌─── THÔNG TIN HỒ SƠ BÁC SĨ ─────────────────────────────────────┐ │
│  │ Chuyên khoa*  | Phòng khám*  | Giá khám*  | Tỉnh/Thành*        │ │
│  │ Thanh toán*   | Chức danh    | Mô tả ngắn  | Ảnh avatar          │ │
│  ├─────────────────────────────────────────────────────────────────┤ │
│  │ Ghi chú (note) cho Admin                                         │ │
│  ├─────────────────────────────────────────────────────────────────┤ │
│  │ Bài giới thiệu (Markdown Editor — 2 cột Edit | Preview)         │ │
│  ├─────────────────────────────────────────────────────────────────┤ │
│  │                         [💾 Lưu hồ sơ]  [🗑️ Xóa hồ sơ]        │ │
│  └─────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 3.3 Tạo `DoctorManage.jsx`

```jsx
// src/containers/System/Admin/DoctorManage.jsx
// Quản lý hồ sơ bác sĩ (REQ-AM-006 → REQ-AM-010, REQ-AM-022)
import React, { useEffect, useState } from 'react';
import MDEditor from '@uiw/react-md-editor';
import Swal from 'sweetalert2';
import { useSelector } from 'react-redux';
import { getAllUsers, getAllCode } from '../../../services/userService';
import {
  getDoctorDetail,
  saveInfoDoctor,
  deleteDoctorInfo,
} from '../../../services/doctorService';
import { getAllSpecialty } from '../../../services/specialtyService';
import { getAllClinic } from '../../../services/clinicService';
import CommonUtils from '../../../utils/CommonUtils'; // ⚠️ Default export (không dùng { CommonUtils })
import './DoctorManage.scss';

// ===== INIT FORM STATE =====
const INIT_INFO = {
  doctorId: '',
  specialtyId: '',
  clinicId: '',
  priceId: '',
  provinceId: '',
  paymentId: '',
  positionId: 'P0',
  note: '',
  description: '',       // Mô tả ngắn hiển thị trên trang chủ
  contentMarkdown: '',   // Markdown gốc (REQ-AM-007)
  contentHTML: '',       // HTML đã render (REQ-AM-007)
  previewImgURL: '',
  imageBase64: '',
};

const DoctorManage = () => {
  // ===== STATE =====
  const [doctorList, setDoctorList] = useState([]);    // Danh sách users có role R2
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [doctorInfo, setDoctorInfo] = useState(INIT_INFO);
  const [specialties, setSpecialties] = useState([]);
  const [clinics, setClinics] = useState([]);
  const [prices, setPrices] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [payments, setPayments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasExistingInfo, setHasExistingInfo] = useState(false); // Đã có hồ sơ?

  // ===== FETCH DATA =====
  useEffect(() => {
    fetchDoctorList();
    fetchAllcodes();
    fetchSpecialtiesAndClinics();
  }, []);

  // Lấy tất cả users có role R2 (Doctor) — REQ-AM-022
  const fetchDoctorList = async () => {
    try {
      const res = await getAllUsers('ALL');
      if (res.errCode === 0) {
        const doctors = (res.data || []).filter((u) => u.roleId === 'R2');
        setDoctorList(doctors);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAllcodes = async () => {
    try {
      const [priceRes, provinceRes, paymentRes, posRes] = await Promise.all([
        getAllCode('PRICE'),
        getAllCode('PROVINCE'),
        getAllCode('PAYMENT'),
        getAllCode('POSITION'),
      ]);
      if (priceRes.errCode === 0) setPrices(priceRes.data);
      if (provinceRes.errCode === 0) setProvinces(provinceRes.data);
      if (paymentRes.errCode === 0) setPayments(paymentRes.data);
      if (posRes.errCode === 0) setPositions(posRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSpecialtiesAndClinics = async () => {
    try {
      const [specRes, clinicRes] = await Promise.all([
        getAllSpecialty(),
        getAllClinic(),
      ]);
      if (specRes.errCode === 0) setSpecialties(specRes.data);
      if (clinicRes.errCode === 0) setClinics(clinicRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  // ===== KHI CHỌN BÁC SĨ TỪ DROPDOWN =====
  const handleSelectDoctor = async (e) => {
    const doctorId = e.target.value;
    setSelectedDoctorId(doctorId);

    if (!doctorId) {
      setDoctorInfo(INIT_INFO);
      setHasExistingInfo(false);
      return;
    }

    // Load hồ sơ hiện tại nếu đã có
    setIsLoading(true);
    try {
      const res = await getDoctorDetail(doctorId);
      if (res.errCode === 0 && res.data?.doctorInfoData) {
        const info = res.data.doctorInfoData;
        setDoctorInfo({
          doctorId,
          specialtyId: info.specialtyId || '',
          clinicId: info.clinicId || '',
          priceId: info.priceId || '',
          provinceId: info.provinceId || '',
          paymentId: info.paymentId || '',
          positionId: info.positionId || 'P0',
          note: info.note || '',
          description: info.description || '',
          contentMarkdown: info.contentMarkdown || '',
          contentHTML: info.contentHTML || '',
          previewImgURL: res.data.image
            ? `data:image/jpeg;base64,${res.data.image}`
            : '',
          imageBase64: '',
        });
        setHasExistingInfo(true);
      } else {
        // Chưa có hồ sơ — reset form
        setDoctorInfo({ ...INIT_INFO, doctorId });
        setHasExistingInfo(false);
      }
    } catch (err) {
      console.error(err);
    }
    setIsLoading(false);
  };

  // ===== HANDLE INPUT =====
  const handleInput = (e) => {
    const { name, value } = e.target;
    setDoctorInfo((prev) => ({ ...prev, [name]: value }));
  };

  // ===== MARKDOWN EDITOR CHANGE (REQ-AM-007) =====
  // Lưu đồng thời contentMarkdown (markdown gốc) và contentHTML (HTML render)
  const handleMarkdownChange = (value = '') => {
    // contentHTML: convert markdown → HTML đơn giản
    // Backend hoặc react-markdown sẽ render khi hiển thị cho bệnh nhân
    setDoctorInfo((prev) => ({
      ...prev,
      contentMarkdown: value,
      contentHTML: value, // Gửi lên BE, BE lưu nguyên — khi hiển thị dùng react-markdown
    }));
  };

  // ===== UPLOAD ẢNH (REQ-AM-008) =====
  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      Swal.fire('Lỗi!', 'Ảnh không được vượt quá 5MB', 'error');
      return;
    }
    const base64 = await CommonUtils.getBase64(file);
    setDoctorInfo((prev) => ({
      ...prev,
      previewImgURL: URL.createObjectURL(file),
      imageBase64: base64,
    }));
  };

  // ===== LƯU HỒ SƠ (REQ-AM-006, 007, 009) =====
  const handleSave = async () => {
    if (!selectedDoctorId) {
      Swal.fire('Chưa chọn bác sĩ!', 'Vui lòng chọn bác sĩ từ danh sách.', 'warning');
      return;
    }
    if (!doctorInfo.specialtyId || !doctorInfo.clinicId || !doctorInfo.priceId) {
      Swal.fire('Thiếu thông tin!', 'Vui lòng chọn chuyên khoa, phòng khám và giá khám.', 'warning');
      return;
    }

    try {
      const payload = {
        doctorId: selectedDoctorId,
        specialtyId: doctorInfo.specialtyId,
        clinicId: doctorInfo.clinicId,
        priceId: doctorInfo.priceId,
        provinceId: doctorInfo.provinceId,
        paymentId: doctorInfo.paymentId,
        positionId: doctorInfo.positionId,
        note: doctorInfo.note,
        description: doctorInfo.description,
        contentMarkdown: doctorInfo.contentMarkdown,
        contentHTML: doctorInfo.contentHTML,
        image: doctorInfo.imageBase64 || undefined,
      };

      const res = await saveInfoDoctor(payload);
      if (res.errCode === 0) {
        Swal.fire('Thành công!', 'Đã lưu hồ sơ bác sĩ thành công.', 'success');
        setHasExistingInfo(true);
      } else {
        Swal.fire('Lỗi!', res.message || 'Lưu thất bại', 'error');
      }
    } catch (err) {
      Swal.fire('Lỗi!', 'Không thể kết nối server', 'error');
    }
  };

  // ===== XÓA HỒ SƠ (REQ-AM-010) =====
  const handleDelete = async () => {
    if (!selectedDoctorId) return;

    const result = await Swal.fire({
      title: 'Xác nhận xóa hồ sơ?',
      text: 'Toàn bộ thông tin hồ sơ bác sĩ sẽ bị xóa. Không thể khôi phục!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Xóa',
      cancelButtonText: 'Huỷ',
    });

    if (result.isConfirmed) {
      try {
        const res = await deleteDoctorInfo(selectedDoctorId);
        if (res.errCode === 0) {
          Swal.fire('Đã xóa!', 'Hồ sơ bác sĩ đã xóa thành công.', 'success');
          setDoctorInfo({ ...INIT_INFO, doctorId: selectedDoctorId });
          setHasExistingInfo(false);
        } else {
          Swal.fire('Lỗi!', res.message || 'Xóa thất bại', 'error');
        }
      } catch (err) {
        Swal.fire('Lỗi!', 'Không thể kết nối server', 'error');
      }
    }
  };

  // ===== RENDER =====
  return (
    <div className="doctor-manage">
      <div className="manage-header">
        <h2 className="manage-title">🩺 Quản Lý Hồ Sơ Bác Sĩ</h2>
        {hasExistingInfo && (
          <span className="existing-badge">✅ Đã có hồ sơ</span>
        )}
      </div>

      {/* ===== CHỌN BÁC SĨ (R2) — REQ-AM-022 ===== */}
      <div className="form-card">
        <div className="form-group">
          <label>Chọn bác sĩ (User có role Bác sĩ) <span className="required">*</span></label>
          <select
            className="form-control select-doctor"
            value={selectedDoctorId}
            onChange={handleSelectDoctor}
          >
            <option value="">-- Chọn bác sĩ --</option>
            {doctorList.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.lastName} {doc.firstName} — {doc.email}
              </option>
            ))}
          </select>
          <small className="hint">
            💡 Chỉ hiển thị user có role "Bác sĩ (R2)". Nếu không thấy, hãy gán role R2 trước ở Quản lý Người dùng.
          </small>
        </div>
      </div>

      {/* ===== FORM HỒ SƠ (chỉ hiện khi đã chọn bác sĩ) ===== */}
      {selectedDoctorId && (
        <>
          {isLoading ? (
            <div className="loading-text">Đang tải hồ sơ...</div>
          ) : (
            <>
              {/* Thông tin chuyên môn */}
              <div className="form-card">
                <h4 className="card-subtitle">📋 Thông Tin Chuyên Môn</h4>
                <div className="form-row">
                  {/* Chuyên khoa — REQ-AM-009 */}
                  <div className="form-group">
                    <label>Chuyên khoa <span className="required">*</span></label>
                    <select name="specialtyId" value={doctorInfo.specialtyId} onChange={handleInput} className="form-control">
                      <option value="">-- Chọn chuyên khoa --</option>
                      {specialties.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Phòng khám — REQ-AM-009 */}
                  <div className="form-group">
                    <label>Phòng khám <span className="required">*</span></label>
                    <select name="clinicId" value={doctorInfo.clinicId} onChange={handleInput} className="form-control">
                      <option value="">-- Chọn phòng khám --</option>
                      {clinics.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Giá khám */}
                  <div className="form-group">
                    <label>Giá khám <span className="required">*</span></label>
                    <select name="priceId" value={doctorInfo.priceId} onChange={handleInput} className="form-control">
                      <option value="">-- Chọn giá --</option>
                      {prices.map((p) => (
                        <option key={p.keyMap} value={p.keyMap}>{p.valueVi}</option>
                      ))}
                    </select>
                  </div>

                  {/* Tỉnh/Thành */}
                  <div className="form-group">
                    <label>Tỉnh/Thành phố</label>
                    <select name="provinceId" value={doctorInfo.provinceId} onChange={handleInput} className="form-control">
                      <option value="">-- Chọn tỉnh --</option>
                      {provinces.map((p) => (
                        <option key={p.keyMap} value={p.keyMap}>{p.valueVi}</option>
                      ))}
                    </select>
                  </div>

                  {/* Thanh toán */}
                  <div className="form-group">
                    <label>Phương thức thanh toán</label>
                    <select name="paymentId" value={doctorInfo.paymentId} onChange={handleInput} className="form-control">
                      <option value="">-- Chọn thanh toán --</option>
                      {payments.map((p) => (
                        <option key={p.keyMap} value={p.keyMap}>{p.valueVi}</option>
                      ))}
                    </select>
                  </div>

                  {/* Chức danh */}
                  <div className="form-group">
                    <label>Chức danh</label>
                    <select name="positionId" value={doctorInfo.positionId} onChange={handleInput} className="form-control">
                      {positions.map((p) => (
                        <option key={p.keyMap} value={p.keyMap}>{p.valueVi}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Mô tả ngắn */}
                <div className="form-group full-width">
                  <label>Mô tả ngắn (hiển thị trên trang chủ)</label>
                  <textarea
                    name="description"
                    value={doctorInfo.description}
                    onChange={handleInput}
                    className="form-control"
                    rows={3}
                    placeholder="BS. Nguyễn Văn A có hơn 10 năm kinh nghiệm..."
                  />
                </div>

                {/* Ghi chú Admin */}
                <div className="form-group full-width">
                  <label>Ghi chú (chỉ Admin thấy)</label>
                  <input
                    type="text"
                    name="note"
                    value={doctorInfo.note}
                    onChange={handleInput}
                    className="form-control"
                    placeholder="Ghi chú nội bộ..."
                  />
                </div>

                {/* Upload ảnh — REQ-AM-008 */}
                <div className="form-group">
                  <label>Ảnh đại diện bác sĩ (max 5MB)</label>
                  <div className="image-upload-wrap">
                    <label className="image-upload-label" htmlFor="doctor-img-upload">
                      {doctorInfo.previewImgURL ? (
                        <img src={doctorInfo.previewImgURL} alt="preview" className="image-preview" />
                      ) : (
                        <span>📷 Chọn ảnh</span>
                      )}
                    </label>
                    <input
                      id="doctor-img-upload"
                      type="file"
                      accept="image/jpeg,image/png"
                      onChange={handleImageChange}
                      style={{ display: 'none' }}
                    />
                  </div>
                </div>
              </div>

              {/* Markdown Editor — REQ-AM-007 */}
              <div className="form-card">
                <h4 className="card-subtitle">📝 Bài Giới Thiệu Bác Sĩ (Markdown)</h4>
                <p className="hint">
                  💡 Viết nội dung theo cú pháp Markdown. Cột trái là editor, cột phải là preview cho bệnh nhân.
                </p>
                <div data-color-mode="light">
                  <MDEditor
                    value={doctorInfo.contentMarkdown}
                    onChange={handleMarkdownChange}
                    height={400}
                    preview="live"
                    placeholder="## Giới thiệu bác sĩ&#10;&#10;Nhập nội dung Markdown ở đây..."
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="action-footer">
                <button className="btn-save" onClick={handleSave}>
                  💾 Lưu hồ sơ
                </button>
                {hasExistingInfo && (
                  <button className="btn-delete" onClick={handleDelete}>
                    🗑️ Xóa hồ sơ
                  </button>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default DoctorManage;
```

---

## 3.4 Tạo `DoctorManage.scss`

```scss
// src/containers/System/Admin/DoctorManage.scss
@import '../../../styles/variables';
@import '../../../styles/mixins';

.doctor-manage {
  .manage-header {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 20px;

    .manage-title {
      font-size: 1.4rem;
      font-weight: 700;
      color: #333;
      margin: 0;
    }

    .existing-badge {
      background: #e8f5e9;
      color: #2e7d32;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 600;
    }
  }

  .form-card {
    background: #fff;
    border-radius: 12px;
    padding: 24px;
    margin-bottom: 20px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);

    .card-subtitle {
      font-size: 1rem;
      font-weight: 700;
      color: #333;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 2px solid $primary;
      display: inline-block;
    }

    .form-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;

      @include mobile {
        grid-template-columns: 1fr;
      }
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;

      &.full-width {
        grid-column: 1 / -1;
      }

      label {
        font-size: 0.85rem;
        font-weight: 600;
        color: #555;

        .required { color: #dc3545; }
      }

      .form-control {
        padding: 8px 12px;
        border: 1px solid #ddd;
        border-radius: 8px;
        font-size: 0.9rem;
        transition: border-color 0.2s;

        &:focus {
          outline: none;
          border-color: $primary;
          box-shadow: 0 0 0 3px rgba(69, 195, 210, 0.1);
        }
      }

      .hint {
        font-size: 0.75rem;
        color: #888;
        font-style: italic;
      }

      &.select-doctor {
        font-size: 1rem;
        padding: 10px;
      }

      .image-upload-wrap {
        .image-upload-label {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 110px;
          height: 110px;
          border: 2px dashed #ddd;
          border-radius: 50%;
          cursor: pointer;
          overflow: hidden;
          background: #f9f9f9;
          color: #888;
          transition: border-color 0.2s;
          font-size: 0.85rem;
          text-align: center;

          &:hover { border-color: $primary; color: $primary; }

          .image-preview {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
        }
      }
    }
  }

  .loading-text {
    text-align: center;
    padding: 40px;
    color: #888;
  }

  .action-footer {
    display: flex;
    gap: 12px;
    padding: 16px 0;

    .btn-save {
      background: $primary;
      color: #fff;
      border: none;
      padding: 12px 28px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 1rem;
      cursor: pointer;
      transition: all 0.2s;

      &:hover {
        background: darken($primary, 10%);
        box-shadow: 0 4px 12px rgba(69, 195, 210, 0.4);
      }
    }

    .btn-delete {
      background: #fff;
      color: #dc3545;
      border: 2px solid #dc3545;
      padding: 12px 28px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 1rem;
      cursor: pointer;
      transition: all 0.2s;

      &:hover {
        background: #dc3545;
        color: #fff;
      }
    }
  }
}
```

---

## ✅ Checklist Bước 3

- [ ] Cài `@uiw/react-md-editor`: `npm install @uiw/react-md-editor`
- [ ] `DoctorManage.jsx` — Dropdown chọn bác sĩ (R2), form thông tin, Markdown editor, upload ảnh
- [ ] `DoctorManage.scss` — Card layout, grid 3 cột, ảnh tròn
- [ ] Test REQ-AM-022: Dropdown chỉ show user role R2
- [ ] Test REQ-AM-006: Điền đủ thông tin (specialty, clinic, price, payment, province)
- [ ] Test REQ-AM-007: Markdown editor edit + preview live hoạt động → Lưu → `contentMarkdown` và `contentHTML` đều được lưu
- [ ] Test REQ-AM-008: Upload ảnh .jpg/.png → preview tròn → lưu → ảnh hiện trên trang chi tiết
- [ ] Test REQ-AM-009: Gán được chuyên khoa và phòng khám cho bác sĩ
- [ ] Test REQ-AM-010: Xóa hồ sơ → form reset → badge "Đã có hồ sơ" biến mất
- [ ] Test load lại: Chọn lại cùng bác sĩ → form tự điền thông tin cũ

---

> 📖 **Tiếp theo:** [Phase6_04_ClinicManage.md](Phase6_04_ClinicManage.md)
