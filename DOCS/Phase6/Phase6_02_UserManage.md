# 👥 BƯỚC 2 — QUẢN LÝ NGƯỜI DÙNG (USER MANAGE)

> **Mục tiêu:** Trang CRUD Users: danh sách dạng bảng, form tạo/sửa inline, xác nhận xóa Modal
> **Thời gian:** Ngày 2–3
> **SRS:** REQ-AM-001, 002, 003, 004, 005
> **API:** `getAllUsers`, `createNewUser`, `editUser`, `deleteUser`

---

## 2.1 Tổng Quan Giao Diện

```
┌─────────────────────────────────────────────────────────────────┐
│  👥 Quản Lý Người Dùng                        [+ Thêm mới]     │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Form Tạo / Sửa (toggle show/hide)                       │   │
│  │  Email*  | Mật khẩu  | Họ | Tên | SĐT | Địa chỉ       │   │
│  │  Giới tính* | Role*  | Ảnh (upload preview)             │   │
│  │                              [Lưu lại]  [Huỷ]          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─── Bảng Danh Sách ──────────────────────────────────────┐   │
│  │ # | Ảnh | Họ Tên | Email | Số ĐT | Giới tính | Role | Action │
│  │ 1 | 👤  | Nguyen | admin@.. | 09.. | Nam | Admin | ✏️🗑️ │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2.2 Tạo `UserManage.jsx`

```jsx
// src/containers/System/Admin/UserManage.jsx
// Quản lý Users — CRUD: REQ-AM-001, 002, 003, 004, 005
import React, { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import Swal from 'sweetalert2';
import { getAllUsers, createNewUser, editUser, deleteUser } from '../../../services/userService';
import { getAllCode } from '../../../services/userService';
import CommonUtils from '../../../utils/CommonUtils'; // ⚠️ Default export (không dùng { CommonUtils })
import './UserManage.scss';

// ===== INITIAL FORM STATE =====
const INIT_FORM = {
  id: '',
  email: '',
  password: '',
  firstName: '',
  lastName: '',
  phoneNumber: '',
  address: '',
  gender: 'M', // M hoặc F
  roleId: 'R3',
  positionId: 'P0',
  previewImgURL: '',
  imageBase64: '',
};

const UserManage = () => {
  const { formatMessage } = useIntl();

  // ===== STATE =====
  const [users, setUsers] = useState([]);              // Danh sách users
  const [genders, setGenders] = useState([]);          // Allcode giới tính
  const [roles, setRoles] = useState([]);              // Allcode roles
  const [positions, setPositions] = useState([]);      // Allcode positions
  const [formData, setFormData] = useState(INIT_FORM); // Form data
  const [isEditing, setIsEditing] = useState(false);  // Đang sửa hay tạo mới
  const [showForm, setShowForm] = useState(false);     // Hiển thị/ẩn form
  const [isLoading, setIsLoading] = useState(false);

  // ===== FETCH DATA KHI MOUNT =====
  useEffect(() => {
    fetchUsers();
    fetchAllcodes();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await getAllUsers('ALL');
      if (res.errCode === 0) {
        setUsers(res.data || []);
      }
    } catch (err) {
      console.error('Fetch users error:', err);
    }
    setIsLoading(false);
  };

  const fetchAllcodes = async () => {
    try {
      const [genderRes, roleRes, posRes] = await Promise.all([
        getAllCode('GENDER'),
        getAllCode('ROLE'),
        getAllCode('POSITION'),
      ]);
      if (genderRes.errCode === 0) setGenders(genderRes.data);
      if (roleRes.errCode === 0) setRoles(roleRes.data);
      if (posRes.errCode === 0) setPositions(posRes.data);
    } catch (err) {
      console.error('Fetch allcodes error:', err);
    }
  };

  // ===== HANDLE INPUT =====
  const handleInput = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // ===== UPLOAD ẢNH → BASE64 =====
  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Kiểm tra kích thước (max 5MB — SRS Constraint #7)
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

  // ===== THÊM MỚI (show form trống) =====
  const handleAddNew = () => {
    setFormData(INIT_FORM);
    setIsEditing(false);
    setShowForm(true);
  };

  // ===== SỬA (REQ-AM-003) =====
  const handleEdit = (user) => {
    setFormData({
      id: user.id,
      email: user.email,
      password: '',            // Không hiển thị password cũ
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      phoneNumber: user.phoneNumber || '',
      address: user.address || '',
      gender: user.gender || 'M',
      roleId: user.roleId || 'R3',
      positionId: user.positionId || 'P0',
      previewImgURL: user.image
        ? `data:image/jpeg;base64,${user.image}`
        : '',
      imageBase64: '',
    });
    setIsEditing(true);
    setShowForm(true);
    // Scroll lên đầu để thấy form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ===== XÓA (REQ-AM-004) =====
  const handleDelete = async (user) => {
    const result = await Swal.fire({
      title: 'Xác nhận xóa?',
      text: `Bạn có chắc muốn xóa người dùng "${user.firstName} ${user.lastName}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Xóa',
      cancelButtonText: 'Huỷ',
    });

    if (result.isConfirmed) {
      try {
        const res = await deleteUser(user.id);
        if (res.errCode === 0) {
          Swal.fire('Đã xóa!', 'Người dùng đã được xóa thành công.', 'success');
          fetchUsers(); // Refresh danh sách
        } else {
          Swal.fire('Lỗi!', res.message || 'Xóa thất bại', 'error');
        }
      } catch (err) {
        Swal.fire('Lỗi!', 'Không thể kết nối server', 'error');
      }
    }
  };

  // ===== SUBMIT FORM (Tạo mới hoặc Sửa) =====
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate bắt buộc
    if (!formData.email || !formData.firstName || !formData.lastName) {
      Swal.fire('Thiếu thông tin!', 'Vui lòng điền đầy đủ email, họ và tên.', 'warning');
      return;
    }
    if (!isEditing && !formData.password) {
      Swal.fire('Thiếu thông tin!', 'Vui lòng nhập mật khẩu.', 'warning');
      return;
    }

    try {
      let res;
      if (isEditing) {
        // REQ-AM-003: Sửa user
        res = await editUser({
          id: formData.id,
          firstName: formData.firstName,
          lastName: formData.lastName,
          phoneNumber: formData.phoneNumber,
          address: formData.address,
          gender: formData.gender,
          roleId: formData.roleId,
          positionId: formData.positionId,
          image: formData.imageBase64 || undefined,
        });
      } else {
        // REQ-AM-002: Tạo mới
        res = await createNewUser({
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
          phoneNumber: formData.phoneNumber,
          address: formData.address,
          gender: formData.gender,
          roleId: formData.roleId,
          positionId: formData.positionId,
          image: formData.imageBase64 || undefined,
        });
      }

      if (res.errCode === 0) {
        Swal.fire('Thành công!', isEditing ? 'Cập nhật thành công.' : 'Tạo người dùng thành công.', 'success');
        setShowForm(false);
        setFormData(INIT_FORM);
        fetchUsers();
      } else {
        Swal.fire('Lỗi!', res.message || 'Thao tác thất bại', 'error');
      }
    } catch (err) {
      Swal.fire('Lỗi!', 'Không thể kết nối server', 'error');
    }
  };

  // ===== RENDER =====
  return (
    <div className="user-manage">
      {/* ===== TIÊU ĐỀ + NÚT THÊM ===== */}
      <div className="manage-header">
        <h2 className="manage-title">👥 Quản Lý Người Dùng</h2>
        <button className="btn-add" onClick={handleAddNew}>
          + Thêm mới
        </button>
      </div>

      {/* ===== FORM TẠO / SỬA ===== */}
      {showForm && (
        <div className="user-form-card">
          <h4 className="form-title">
            {isEditing ? '✏️ Chỉnh sửa người dùng' : '➕ Tạo người dùng mới'}
          </h4>
          <form onSubmit={handleSubmit} className="user-form">
            <div className="form-row">
              {/* Email */}
              <div className="form-group">
                <label>Email <span className="required">*</span></label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInput}
                  disabled={isEditing}   // Không cho sửa email
                  className="form-control"
                  placeholder="email@example.com"
                />
              </div>

              {/* Mật khẩu (chỉ khi tạo mới) */}
              {!isEditing && (
                <div className="form-group">
                  <label>Mật khẩu <span className="required">*</span></label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInput}
                    className="form-control"
                    placeholder="Tối thiểu 6 ký tự"
                  />
                </div>
              )}

              {/* Họ */}
              <div className="form-group">
                <label>Họ <span className="required">*</span></label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInput}
                  className="form-control"
                  placeholder="Nguyễn"
                />
              </div>

              {/* Tên */}
              <div className="form-group">
                <label>Tên <span className="required">*</span></label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInput}
                  className="form-control"
                  placeholder="Văn A"
                />
              </div>

              {/* Số điện thoại */}
              <div className="form-group">
                <label>Số điện thoại</label>
                <input
                  type="text"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleInput}
                  className="form-control"
                  placeholder="0901234567"
                />
              </div>

              {/* Địa chỉ */}
              <div className="form-group">
                <label>Địa chỉ</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInput}
                  className="form-control"
                  placeholder="123 Đường ABC, TP.HCM"
                />
              </div>

              {/* Giới tính */}
              <div className="form-group">
                <label>Giới tính</label>
                <select name="gender" value={formData.gender} onChange={handleInput} className="form-control">
                  {genders.map((g) => (
                    <option key={g.keyMap} value={g.keyMap}>
                      {g.valueVi}
                    </option>
                  ))}
                </select>
              </div>

              {/* Role — REQ-AM-005 */}
              <div className="form-group">
                <label>Role <span className="required">*</span></label>
                <select name="roleId" value={formData.roleId} onChange={handleInput} className="form-control">
                  {roles.map((r) => (
                    <option key={r.keyMap} value={r.keyMap}>
                      {r.valueVi}
                    </option>
                  ))}
                </select>
              </div>

              {/* Chức danh */}
              <div className="form-group">
                <label>Chức danh</label>
                <select name="positionId" value={formData.positionId} onChange={handleInput} className="form-control">
                  {positions.map((p) => (
                    <option key={p.keyMap} value={p.keyMap}>
                      {p.valueVi}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Upload ảnh — REQ-AM-008 */}
            <div className="form-group image-group">
              <label>Ảnh đại diện</label>
              <div className="image-upload-wrap">
                <label className="image-upload-label" htmlFor="user-image-upload">
                  {formData.previewImgURL
                    ? <img src={formData.previewImgURL} alt="preview" className="image-preview" />
                    : <span>📷 Chọn ảnh (max 5MB)</span>
                  }
                </label>
                <input
                  id="user-image-upload"
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={handleImageChange}
                  style={{ display: 'none' }}
                />
              </div>
            </div>

            {/* Buttons */}
            <div className="form-actions">
              <button type="submit" className="btn-save">💾 Lưu lại</button>
              <button type="button" className="btn-cancel" onClick={() => setShowForm(false)}>✕ Huỷ</button>
            </div>
          </form>
        </div>
      )}

      {/* ===== BẢNG DANH SÁCH — REQ-AM-001 ===== */}
      <div className="user-table-card">
        {isLoading ? (
          <div className="loading-text">Đang tải dữ liệu...</div>
        ) : (
          <table className="user-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Ảnh</th>
                <th>Họ tên</th>
                <th>Email</th>
                <th>Số ĐT</th>
                <th>Giới tính</th>
                <th>Role</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="no-data">Chưa có người dùng nào</td>
                </tr>
              ) : (
                users.map((user, index) => (
                  <tr key={user.id}>
                    <td>{index + 1}</td>
                    <td>
                      {user.image ? (
                        <img
                          src={`data:image/jpeg;base64,${user.image}`}
                          alt="avatar"
                          className="table-avatar"
                        />
                      ) : (
                        <div className="avatar-placeholder">👤</div>
                      )}
                    </td>
                    <td>{user.lastName} {user.firstName}</td>
                    <td>{user.email}</td>
                    <td>{user.phoneNumber || '—'}</td>
                    <td>{user.genderData?.valueVi || user.gender || '—'}</td>
                    <td>
                      <span className={`role-badge role-${user.roleId?.toLowerCase()}`}>
                        {user.roleData?.valueVi || user.roleId}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn-edit"
                          onClick={() => handleEdit(user)}
                          title="Sửa"
                        >
                          ✏️
                        </button>
                        <button
                          className="btn-delete"
                          onClick={() => handleDelete(user)}
                          title="Xóa"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default UserManage;
```

---

## 2.3 Tạo `UserManage.scss`

```scss
// src/containers/System/Admin/UserManage.scss
@import '../../../styles/variables';
@import '../../../styles/mixins';

.user-manage {
  // ===== HEADER =====
  .manage-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;

    .manage-title {
      font-size: 1.4rem;
      font-weight: 700;
      color: #333;
      margin: 0;
    }

    .btn-add {
      background: $primary;
      color: #fff;
      border: none;
      padding: 10px 20px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;

      &:hover {
        background: darken($primary, 10%);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(69, 195, 210, 0.4);
      }
    }
  }

  // ===== FORM CARD =====
  .user-form-card {
    background: #fff;
    border-radius: 12px;
    padding: 24px;
    margin-bottom: 20px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
    border-left: 4px solid $primary;

    .form-title {
      font-size: 1.1rem;
      font-weight: 600;
      color: #333;
      margin-bottom: 20px;
    }

    .user-form {
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

        label {
          font-size: 0.85rem;
          font-weight: 600;
          color: #555;

          .required {
            color: #dc3545;
            margin-left: 2px;
          }
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

          &:disabled {
            background: #f5f5f5;
            cursor: not-allowed;
          }
        }
      }

      // Upload ảnh
      .image-group {
        grid-column: 1 / -1;

        .image-upload-wrap {
          .image-upload-label {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 120px;
            height: 120px;
            border: 2px dashed #ddd;
            border-radius: 50%;
            cursor: pointer;
            overflow: hidden;
            transition: border-color 0.2s;
            background: #f9f9f9;
            color: #888;

            &:hover {
              border-color: $primary;
              color: $primary;
            }

            .image-preview {
              width: 100%;
              height: 100%;
              object-fit: cover;
            }
          }
        }
      }

      // Buttons
      .form-actions {
        display: flex;
        gap: 12px;
        margin-top: 20px;
        padding-top: 16px;
        border-top: 1px solid #eee;

        .btn-save {
          background: $primary;
          color: #fff;
          border: none;
          padding: 10px 24px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;

          &:hover {
            background: darken($primary, 10%);
          }
        }

        .btn-cancel {
          background: #f5f5f5;
          color: #666;
          border: 1px solid #ddd;
          padding: 10px 24px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;

          &:hover {
            background: #e0e0e0;
          }
        }
      }
    }
  }

  // ===== TABLE CARD =====
  .user-table-card {
    background: #fff;
    border-radius: 12px;
    padding: 16px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
    overflow-x: auto;

    .loading-text, .no-data {
      text-align: center;
      color: #888;
      padding: 40px;
    }

    .user-table {
      width: 100%;
      border-collapse: collapse;

      th {
        background: #f8f9fa;
        padding: 12px 16px;
        text-align: left;
        font-size: 0.85rem;
        font-weight: 700;
        color: #555;
        border-bottom: 2px solid #eee;
      }

      td {
        padding: 10px 16px;
        border-bottom: 1px solid #f0f0f0;
        font-size: 0.9rem;
        color: #333;
        vertical-align: middle;
      }

      tr:hover td {
        background: #f9fffe;
      }

      .table-avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        object-fit: cover;
        border: 2px solid #eee;
      }

      .avatar-placeholder {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: #f0f0f0;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.2rem;
      }

      .role-badge {
        padding: 3px 10px;
        border-radius: 12px;
        font-size: 0.75rem;
        font-weight: 600;

        &.role-r1 { background: #e3f2fd; color: #1565c0; }  // Admin - blue
        &.role-r2 { background: #e8f5e9; color: #2e7d32; }  // Doctor - green
        &.role-r3 { background: #f3e5f5; color: #7b1fa2; }  // Patient - purple
      }

      .action-buttons {
        display: flex;
        gap: 6px;

        button {
          border: none;
          background: none;
          cursor: pointer;
          padding: 6px 10px;
          border-radius: 6px;
          font-size: 1rem;
          transition: all 0.2s;

          &.btn-edit:hover { background: #fff3cd; }
          &.btn-delete:hover { background: #f8d7da; }
        }
      }
    }
  }
}
```

---

## 2.4 Cập Nhật `CommonUtils.js`

Đảm bảo có `getBase64` helper:

```js
// src/utils/CommonUtils.js
export const CommonUtils = {
  // Chuyển File object → base64 string (REQ-AM-008)
  getBase64: (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        // Tách lấy phần base64 (bỏ "data:image/jpeg;base64,")
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
    });
  },

  // Decode base64 → URL để hiển thị ảnh
  decodeBase64Image: (base64) => {
    if (!base64) return null;
    return `data:image/jpeg;base64,${base64}`;
  },
};

export default CommonUtils;
```

---

## ✅ Checklist Bước 2

- [ ] `UserManage.jsx` — Form tạo/sửa + bảng danh sách
- [ ] `UserManage.scss` — Styles card, table, badges, form
- [ ] `CommonUtils.js` — Có `getBase64()` helper
- [ ] Test REQ-AM-001: `/system/user-manage` → bảng danh sách load data
- [ ] Test REQ-AM-002: Nhấn "Thêm mới" → form hiện → điền → lưu → user xuất hiện trong bảng
- [ ] Test REQ-AM-003: Nhấn ✏️ → form hiện với data cũ → sửa → lưu
- [ ] Test REQ-AM-004: Nhấn 🗑️ → Modal confirm → xóa → user biến mất
- [ ] Test REQ-AM-005: Dropdown Role có 3 options (Admin, Bác sĩ, Bệnh nhân)
- [ ] Test upload ảnh: Chọn file → preview avatar tròn → lưu → ảnh hiện trong bảng

---

> 📖 **Tiếp theo:** [Phase6_03_DoctorManage.md](Phase6_03_DoctorManage.md)
