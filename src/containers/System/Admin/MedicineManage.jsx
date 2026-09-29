// src/containers/System/Admin/MedicineManage.jsx
// [Upgrade - Phương án 1] Admin CRUD danh mục thuốc: Royal Indigo Theme, KPI Cards, Modal Dialog & Quick Toggle
import React, { useEffect, useState, useMemo } from 'react';
import {
  Pill,
  Plus,
  Search,
  X,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Activity,
  Layers,
  Sparkles,
  Package
} from 'lucide-react';
import {
  getAllMedicines,
  createMedicine,
  editMedicine,
  deleteMedicine,
} from '../../../services/catalogService';
import './CatalogManage.scss';

const emptyForm = {
  name: '',
  activeIngredient: '',
  unit: '',
  dosageForm: '',
  concentration: '',
  isActive: true,
};

const POPULAR_UNITS = ['Viên', 'Vỉ', 'Hộp', 'Chai', 'Lọ', 'Gói', 'Ống', 'Tuýp'];
const POPULAR_DOSAGE_FORMS = [
  'Viên nén',
  'Viên nang',
  'Siro',
  'Dung dịch uống',
  'Dung dịch tiêm',
  'Hỗn dịch',
  'Thuốc mỡ',
  'Bột pha uống',
];

const MedicineManage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  // Filters
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterUnit, setFilterUnit] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await getAllMedicines();
      const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res?.data?.data) ? res.data.data : []);
      if (res?.errCode === 0 || res?.data?.errCode === 0 || Array.isArray(list)) {
        setItems(list);
      }
    } catch (err) {
      console.error('Error fetching medicines:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  // Unique units extracted from current dataset + popular list
  const availableUnits = useMemo(() => {
    const set = new Set(POPULAR_UNITS);
    items.forEach((item) => {
      if (item.unit) set.add(item.unit);
    });
    return Array.from(set);
  }, [items]);

  // Client-side filtering for live search and multiple criteria
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // 1. Search keyword (Name, Active Ingredient, Concentration)
      if (searchKeyword.trim()) {
        const kw = searchKeyword.toLowerCase();
        const matchName = item.name?.toLowerCase().includes(kw);
        const matchIng = item.activeIngredient?.toLowerCase().includes(kw);
        const matchConc = item.concentration?.toLowerCase().includes(kw);
        if (!matchName && !matchIng && !matchConc) return false;
      }
      // 2. Unit filter
      if (filterUnit && item.unit !== filterUnit) return false;
      // 3. Status filter
      if (filterStatus === 'active' && !item.isActive) return false;
      if (filterStatus === 'inactive' && item.isActive) return false;

      return true;
    });
  }, [items, searchKeyword, filterUnit, filterStatus]);

  // KPI Calculations
  const stats = useMemo(() => {
    const total = items.length;
    const active = items.filter((i) => i.isActive).length;
    const dosageFormsCount = new Set(items.map((i) => i.dosageForm).filter(Boolean)).size;
    const activeRate = total > 0 ? Math.round((active / total) * 100) : 100;
    return { total, active, dosageFormsCount, activeRate };
  }, [items]);

  const handleOpenAdd = () => {
    setForm(emptyForm);
    setEditId(null);
    setShowModal(true);
  };

  const handleOpenEdit = (item) => {
    setForm({
      name: item.name,
      activeIngredient: item.activeIngredient || '',
      unit: item.unit || '',
      dosageForm: item.dosageForm || '',
      concentration: item.concentration || '',
      isActive: Boolean(item.isActive),
    });
    setEditId(item.id);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setMsg({ type: 'error', text: 'Vui lòng nhập tên thuốc!' });
      return;
    }
    try {
      const payload = {
        name: form.name.trim(),
        activeIngredient: form.activeIngredient.trim() || null,
        unit: form.unit.trim() || null,
        dosageForm: form.dosageForm.trim() || null,
        concentration: form.concentration.trim() || null,
        isActive: form.isActive,
      };

      const res = editId
        ? await editMedicine(editId, payload)
        : await createMedicine(payload);

      if (res?.errCode === 0 || res?.data?.errCode === 0) {
        setMsg({
          type: 'success',
          text: editId ? 'Cập nhật thuốc thành công!' : 'Đã thêm thuốc mới vào danh mục kê đơn!',
        });
        setShowModal(false);
        setEditId(null);
        setForm(emptyForm);
        fetchItems();
        setTimeout(() => setMsg({ type: '', text: '' }), 3500);
      } else {
        setMsg({ type: 'error', text: res?.message || 'Có lỗi xảy ra khi lưu thuốc!' });
      }
    } catch {
      setMsg({ type: 'error', text: 'Lỗi kết nối máy chủ khi lưu thuốc!' });
    }
  };

  // Quick Toggle Active/Inactive status directly from table
  const handleToggleStatus = async (item) => {
    try {
      const nextStatus = !item.isActive;
      const res = await editMedicine(item.id, { isActive: nextStatus });
      if (res?.errCode === 0 || res?.data?.errCode === 0) {
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, isActive: nextStatus } : i))
        );
        setMsg({
          type: 'success',
          text: `Đã đổi trạng thái "${item.name}" sang ${nextStatus ? 'Hoạt động' : 'Tạm ngừng'}!`,
        });
        setTimeout(() => setMsg({ type: '', text: '' }), 2500);
      }
    } catch {
      setMsg({ type: 'error', text: 'Không thể cập nhật trạng thái thuốc!' });
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Xác nhận xóa thuốc "${name}" khỏi danh mục?`)) return;
    try {
      const res = await deleteMedicine(id);
      if (res?.errCode === 0 || res?.data?.errCode === 0) {
        setMsg({ type: 'success', text: `Đã xóa thuốc "${name}"!` });
        fetchItems();
        setTimeout(() => setMsg({ type: '', text: '' }), 3000);
      }
    } catch {
      setMsg({ type: 'error', text: 'Có lỗi xảy ra khi xóa thuốc!' });
    }
  };

  return (
    <div className="catalog-manage-page">
      {/* ── 1. Page Header ── */}
      <div className="cm-header">
        <div className="cm-header-left">
          <div className="cm-header-icon">
            <Pill size={24} strokeWidth={2.2} />
          </div>
          <div className="cm-header-titles">
            <h2>Danh mục Thuốc</h2>
            <p>Quản lý cơ sở dữ liệu thuốc phục vụ việc kê đơn và điều trị của Bác sĩ</p>
          </div>
        </div>
        <button className="btn-add" onClick={handleOpenAdd}>
          <Plus size={18} strokeWidth={2.4} />
          <span>Thêm thuốc mới</span>
        </button>
      </div>

      {/* ── 2. KPI Stat Cards Grid ── */}
      <div className="cm-stats-grid">
        <div className="stat-card">
          <div className="stat-icon-wrap indigo">
            <Pill size={22} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Tổng đầu thuốc</span>
            <div className="stat-value-row">
              <span className="stat-value">{stats.total}</span>
              <span className="stat-subtext">sản phẩm</span>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap emerald">
            <Activity size={22} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Đang kê đơn</span>
            <div className="stat-value-row">
              <span className="stat-value">{stats.active}</span>
              <span className="stat-subtext">({stats.activeRate}% sẵn sàng)</span>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap amber">
            <Package size={22} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Dạng bào chế</span>
            <div className="stat-value-row">
              <span className="stat-value">{stats.dosageFormsCount}</span>
              <span className="stat-subtext">dạng bào chế</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Alert Notification ── */}
      {msg.text && (
        <div className={`alert alert--${msg.type}`}>
          {msg.type === 'success' ? (
            <CheckCircle2 size={18} className="flex-shrink-0" />
          ) : (
            <AlertCircle size={18} className="flex-shrink-0" />
          )}
          <span>{msg.text}</span>
        </div>
      )}

      {/* ── 3. Filter & Search Toolbar ── */}
      <div className="cm-toolbar">
        <div className="toolbar-left">
          <div className="search-box">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Tìm theo tên thuốc, hoạt chất, hàm lượng (VD: Paracetamol 500mg)..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
            />
            {searchKeyword && (
              <button
                type="button"
                className="btn-clear-search"
                onClick={() => setSearchKeyword('')}
                title="Xóa tìm kiếm"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <select
            className="filter-select"
            value={filterUnit}
            onChange={(e) => setFilterUnit(e.target.value)}
          >
            <option value="">Tất cả đơn vị</option>
            {availableUnits.map((u) => (
              <option key={u} value={u}>
                Đơn vị: {u}
              </option>
            ))}
          </select>

          <select
            className="filter-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang hoạt động</option>
            <option value="inactive">Tạm ngừng</option>
          </select>
        </div>

        <div className="toolbar-right">
          <span className="results-count">
            Hiển thị <strong>{filteredItems.length}</strong> / {items.length} loại thuốc
          </span>
        </div>
      </div>

      {/* ── 4. Data Table Card ── */}
      <div className="cm-table-card">
        {loading ? (
          <div className="cm-loading-wrap">
            <Activity className="animate-spin text-indigo-500" size={28} />
            <span>Đang tải danh mục thuốc...</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="cm-empty-state">
            <div className="empty-icon-box">
              <Pill size={28} />
            </div>
            <h4>Không tìm thấy thuốc phù hợp</h4>
            <p>
              {searchKeyword || filterUnit || filterStatus !== 'all'
                ? 'Thử điều chỉnh từ khóa tìm kiếm hoặc bỏ bớt các bộ lọc.'
                : 'Chưa có thuốc nào được cập nhật trong hệ thống.'}
            </p>
            {(!searchKeyword && !filterUnit && filterStatus === 'all') && (
              <button className="btn-add" onClick={handleOpenAdd}>
                <Plus size={16} />
                <span>Thêm thuốc đầu tiên</span>
              </button>
            )}
          </div>
        ) : (
          <table className="cm-table">
            <thead>
              <tr>
                <th style={{ width: '30%' }}>Tên biệt dược</th>
                <th style={{ width: '22%' }}>Hoạt chất chính</th>
                <th style={{ width: '14%' }}>Hàm lượng</th>
                <th style={{ width: '12%' }}>Đơn vị tính</th>
                <th style={{ width: '12%' }}>Trạng thái</th>
                <th style={{ width: '10%', textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className="item-name-cell">
                      <span className="primary-name">{item.name}</span>
                      {item.dosageForm && (
                        <span className="sub-desc" title={`Dạng bào chế: ${item.dosageForm}`}>
                          {item.dosageForm}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    {item.activeIngredient ? (
                      <span className="text-slate-700 font-medium">{item.activeIngredient}</span>
                    ) : (
                      <span className="text-slate-400 text-xs">—</span>
                    )}
                  </td>
                  <td>
                    {item.concentration ? (
                      <code className="item-code">{item.concentration}</code>
                    ) : (
                      <span className="text-slate-400 text-xs">—</span>
                    )}
                  </td>
                  <td>
                    {item.unit ? (
                      <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded bg-slate-100 text-slate-600">
                        {item.unit}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs">—</span>
                    )}
                  </td>
                  <td>
                    <button
                      type="button"
                      className={`btn-status-toggle ${item.isActive ? 'active' : 'inactive'}`}
                      onClick={() => handleToggleStatus(item)}
                      title="Bấm để bật/tắt nhanh trạng thái"
                    >
                      <span className="dot" />
                      <span>{item.isActive ? 'Hoạt động' : 'Tạm ngừng'}</span>
                    </button>
                  </td>
                  <td>
                    <div className="action-buttons-wrap" style={{ justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        className="btn-action-icon edit"
                        onClick={() => handleOpenEdit(item)}
                        title="Chỉnh sửa thông tin thuốc"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        className="btn-action-icon delete"
                        onClick={() => handleDelete(item.id, item.name)}
                        title="Xóa thuốc khỏi danh mục"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── 5. Modal Dialog Thêm / Sửa ── */}
      {showModal && (
        <div className="cm-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="cm-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <div className="modal-header-icon">
                  <Pill size={20} />
                </div>
                <h3>{editId ? 'Chỉnh sửa thông tin thuốc' : 'Thêm thuốc mới vào danh mục'}</h3>
              </div>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setShowModal(false)}
                title="Đóng cửa sổ"
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div className="modal-form-grid">
                <div className="form-field full-width">
                  <label>
                    Tên thuốc / Biệt dược <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="VD: Paracetamol, Augmentin, Glucosamine Sulfate..."
                    autoFocus
                  />
                </div>

                <div className="form-field">
                  <label>Hoạt chất chính</label>
                  <input
                    type="text"
                    value={form.activeIngredient}
                    onChange={(e) => setForm((p) => ({ ...p, activeIngredient: e.target.value }))}
                    placeholder="VD: Acetaminophen, Amoxicillin..."
                  />
                </div>

                <div className="form-field">
                  <label>Hàm lượng</label>
                  <input
                    type="text"
                    value={form.concentration}
                    onChange={(e) => setForm((p) => ({ ...p, concentration: e.target.value }))}
                    placeholder="VD: 500mg, 1g, 250mg/5ml..."
                  />
                </div>

                <div className="form-field">
                  <label>Đơn vị đóng gói / cấp phát</label>
                  <input
                    type="text"
                    list="units-datalist"
                    value={form.unit}
                    onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))}
                    placeholder="VD: Viên, Vỉ, Hộp, Chai..."
                  />
                  <datalist id="units-datalist">
                    {POPULAR_UNITS.map((u) => (
                      <option key={u} value={u} />
                    ))}
                  </datalist>
                </div>

                <div className="form-field">
                  <label>Dạng bào chế</label>
                  <input
                    type="text"
                    list="dosage-forms-datalist"
                    value={form.dosageForm}
                    onChange={(e) => setForm((p) => ({ ...p, dosageForm: e.target.value }))}
                    placeholder="VD: Viên nén bao phim, Siro, Dung dịch..."
                  />
                  <datalist id="dosage-forms-datalist">
                    {POPULAR_DOSAGE_FORMS.map((d) => (
                      <option key={d} value={d} />
                    ))}
                  </datalist>
                </div>

                <div className="form-field full-width">
                  <label>Trạng thái kê đơn</label>
                  <select
                    value={String(form.isActive)}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, isActive: e.target.value === 'true' }))
                    }
                  >
                    <option value="true">● Hoạt động (Cho phép Bác sĩ tìm kiếm và kê vào đơn thuốc)</option>
                    <option value="false">○ Tạm ngừng (Tạm khóa không xuất hiện khi kê đơn)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => setShowModal(false)}
              >
                Hủy bỏ
              </button>
              <button type="button" className="btn-modal-save" onClick={handleSave}>
                <CheckCircle2 size={16} />
                <span>{editId ? 'Lưu thay đổi' : 'Thêm thuốc'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicineManage;
