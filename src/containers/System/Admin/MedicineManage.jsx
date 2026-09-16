// src/containers/System/Admin/MedicineManage.jsx
// [Phase D.11] Admin CRUD danh mục thuốc
import React, { useEffect, useState } from 'react';
import { getAllMedicines, createMedicine, editMedicine, deleteMedicine } from '../../../services/catalogService';
import './CatalogManage.scss';

const emptyForm = { name: '', activeIngredient: '', unit: '', dosageForm: '', concentration: '', isActive: true };

const MedicineManage = () => {
  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(false);
  const [form, setForm]         = useState(emptyForm);
  const [editId, setEditId]     = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch]     = useState('');
  const [msg, setMsg]           = useState({ type: '', text: '' });

  const fetchItems = async () => {
    setLoading(true);
    const res = await getAllMedicines(search ? { search } : {});
    const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res?.data?.data) ? res.data.data : []);
    if (res?.errCode === 0 || res?.data?.errCode === 0) setItems(list);
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, []);

  const handleSave = async () => {
    if (!form.name) {
      setMsg({ type: 'error', text: 'Vui lòng nhập tên thuốc!' });
      return;
    }
    try {
      const res = editId ? await editMedicine(editId, form) : await createMedicine(form);
      if (res?.errCode === 0 || res?.data?.errCode === 0) {
        setMsg({ type: 'success', text: editId ? 'Cập nhật thành công!' : 'Thêm thành công!' });
        setShowForm(false); setEditId(null); setForm(emptyForm);
        fetchItems();
        setTimeout(() => setMsg({ type: '', text: '' }), 3000);
      }
    } catch { setMsg({ type: 'error', text: 'Có lỗi xảy ra!' }); }
  };

  const handleEdit = (item) => {
    setForm({ name: item.name, activeIngredient: item.activeIngredient || '', unit: item.unit || '', dosageForm: item.dosageForm || '', concentration: item.concentration || '', isActive: item.isActive });
    setEditId(item.id); setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Xác nhận xóa thuốc này?')) return;
    await deleteMedicine(id); fetchItems();
  };

  return (
    <div className="catalog-manage-page">
      <div className="cm-header">
        <div><h2>💊 Danh mục thuốc</h2><p>Quản lý danh sách thuốc dùng trong kê đơn</p></div>
        <button className="btn-add" onClick={() => { setShowForm(true); setEditId(null); setForm(emptyForm); }}>+ Thêm thuốc</button>
      </div>

      {msg.text && <div className={`alert alert--${msg.type}`}>{msg.text}</div>}

      <div className="cm-filters">
        <input
          type="text" placeholder="🔍 Tìm theo tên thuốc..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && fetchItems()}
        />
        <button className="btn-search" onClick={fetchItems}>Tìm</button>
      </div>

      {showForm && (
        <div className="cm-form-card">
          <h4>{editId ? 'Chỉnh sửa' : 'Thêm'} thuốc</h4>
          <div className="cm-form-grid">
            <div className="form-field"><label>Tên thuốc *</label><input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="VD: Paracetamol" /></div>
            <div className="form-field"><label>Hoạt chất</label><input value={form.activeIngredient} onChange={e => setForm(p => ({ ...p, activeIngredient: e.target.value }))} placeholder="VD: Acetaminophen" /></div>
            <div className="form-field"><label>Hàm lượng</label><input value={form.concentration} onChange={e => setForm(p => ({ ...p, concentration: e.target.value }))} placeholder="VD: 500mg" /></div>
            <div className="form-field"><label>Đơn vị</label><input value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))} placeholder="VD: Viên, Chai" /></div>
            <div className="form-field"><label>Dạng bào chế</label><input value={form.dosageForm} onChange={e => setForm(p => ({ ...p, dosageForm: e.target.value }))} placeholder="VD: Viên nén, Siro" /></div>
            <div className="form-field"><label>Trạng thái</label><select value={form.isActive} onChange={e => setForm(p => ({ ...p, isActive: e.target.value === 'true' }))}><option value="true">Hoạt động</option><option value="false">Ngừng</option></select></div>
          </div>
          <div className="form-actions">
            <button className="btn-cancel" onClick={() => setShowForm(false)}>Hủy</button>
            <button className="btn-save" onClick={handleSave}>Lưu</button>
          </div>
        </div>
      )}

      {loading ? <div className="cm-loading">Đang tải...</div> : (
        <div className="cm-table-wrap">
          <table className="cm-table">
            <thead><tr><th>Tên thuốc</th><th>Hoạt chất</th><th>Hàm lượng</th><th>Đơn vị</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
            <tbody>
              {items.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', color: '#aaa', padding: '20px' }}>Chưa có thuốc nào</td></tr>}
              {items.map(item => (
                <tr key={item.id}>
                  <td><strong>{item.name}</strong></td>
                  <td>{item.activeIngredient || '—'}</td>
                  <td>{item.concentration   || '—'}</td>
                  <td>{item.unit            || '—'}</td>
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

export default MedicineManage;
