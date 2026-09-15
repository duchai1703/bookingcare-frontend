// src/containers/System/Admin/MedicalCatalogManage.jsx
// [Phase D.10] Admin CRUD danh mục y khoa
import React, { useEffect, useState } from 'react';
import {
  getAllMedicalCatalogs,
  createMedicalCatalog,
  editMedicalCatalog,
  deleteMedicalCatalog,
} from '../../../services/catalogService';
import './CatalogManage.scss';

const CATALOG_TYPES = [
  { value: 'xray',       label: 'X-Quang' },
  { value: 'mri',        label: 'MRI' },
  { value: 'ultrasound', label: 'Siêu âm' },
  { value: 'blood_test', label: 'Xét nghiệm máu' },
  { value: 'urine_test', label: 'Xét nghiệm nước tiểu' },
  { value: 'other',      label: 'Khác' },
];

const emptyForm = { name: '', code: '', type: 'other', description: '', isActive: true };

const MedicalCatalogManage = () => {
  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(false);
  const [form, setForm]         = useState(emptyForm);
  const [editId, setEditId]     = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg]           = useState({ type: '', text: '' });
  const [filterType, setFilterType] = useState('');

  const fetchItems = async () => {
    setLoading(true);
    const res = await getAllMedicalCatalogs(filterType ? { type: filterType } : {});
    if (res?.data?.errCode === 0) setItems(res.data.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, [filterType]);

  const handleSave = async () => {
    if (!form.name || !form.type) {
      setMsg({ type: 'error', text: 'Vui lòng nhập tên và loại danh mục!' });
      return;
    }
    try {
      const res = editId
        ? await editMedicalCatalog(editId, form)
        : await createMedicalCatalog(form);
      if (res?.data?.errCode === 0) {
        setMsg({ type: 'success', text: editId ? 'Cập nhật thành công!' : 'Thêm thành công!' });
        setShowForm(false);
        setEditId(null);
        setForm(emptyForm);
        fetchItems();
        setTimeout(() => setMsg({ type: '', text: '' }), 3000);
      }
    } catch (e) {
      setMsg({ type: 'error', text: 'Có lỗi xảy ra!' });
    }
  };

  const handleEdit = (item) => {
    setForm({ name: item.name, code: item.code || '', type: item.type, description: item.description || '', isActive: item.isActive });
    setEditId(item.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Xác nhận xóa danh mục này?')) return;
    await deleteMedicalCatalog(id);
    fetchItems();
  };

  return (
    <div className="catalog-manage-page">
      <div className="cm-header">
        <div>
          <h2>📋 Danh mục y khoa</h2>
          <p>Quản lý các loại chỉ định: X-Quang, MRI, xét nghiệm...</p>
        </div>
        <button className="btn-add" onClick={() => { setShowForm(true); setEditId(null); setForm(emptyForm); }}>
          + Thêm danh mục
        </button>
      </div>

      {msg.text && <div className={`alert alert--${msg.type}`}>{msg.text}</div>}

      {/* Filter */}
      <div className="cm-filters">
        <select value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">Tất cả loại</option>
          {CATALOG_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      {/* Form */}
      {showForm && (
        <div className="cm-form-card">
          <h4>{editId ? 'Chỉnh sửa' : 'Thêm'} danh mục</h4>
          <div className="cm-form-grid">
            <div className="form-field">
              <label>Tên danh mục *</label>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="VD: X-Quang ngực thẳng" />
            </div>
            <div className="form-field">
              <label>Mã code</label>
              <input value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} placeholder="VD: XR-001" />
            </div>
            <div className="form-field">
              <label>Loại *</label>
              <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                {CATALOG_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label>Trạng thái</label>
              <select value={form.isActive} onChange={e => setForm(p => ({ ...p, isActive: e.target.value === 'true' }))}>
                <option value="true">Hoạt động</option>
                <option value="false">Ngừng</option>
              </select>
            </div>
            <div className="form-field full-width">
              <label>Mô tả</label>
              <textarea rows={2} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Mô tả thêm..." />
            </div>
          </div>
          <div className="form-actions">
            <button className="btn-cancel" onClick={() => setShowForm(false)}>Hủy</button>
            <button className="btn-save" onClick={handleSave}>Lưu</button>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? <div className="cm-loading">Đang tải...</div> : (
        <div className="cm-table-wrap">
          <table className="cm-table">
            <thead>
              <tr><th>Tên</th><th>Mã</th><th>Loại</th><th>Trạng thái</th><th>Thao tác</th></tr>
            </thead>
            <tbody>
              {items.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: '#aaa', padding: '20px' }}>Chưa có danh mục nào</td></tr>}
              {items.map(item => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td><code>{item.code || '—'}</code></td>
                  <td><span className={`badge badge--${item.type}`}>{CATALOG_TYPES.find(t => t.value === item.type)?.label || item.type}</span></td>
                  <td><span className={`status ${item.isActive ? 'status--active' : 'status--inactive'}`}>{item.isActive ? '● Hoạt động' : '○ Ngừng'}</span></td>
                  <td>
                    <button className="btn-edit" onClick={() => handleEdit(item)}>✏️</button>
                    <button className="btn-delete" onClick={() => handleDelete(item.id)}>🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MedicalCatalogManage;
