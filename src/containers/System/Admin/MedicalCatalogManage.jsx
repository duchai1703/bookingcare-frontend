// src/containers/System/Admin/MedicalCatalogManage.jsx
// [Upgrade - Phương án 1] Admin CRUD danh mục y khoa: Royal Indigo Theme, KPI Cards, Modal Dialog & Quick Toggle
import React, { useEffect, useState, useMemo } from 'react';
import {
  ClipboardList,
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
  FileText
} from 'lucide-react';
import {
  getAllMedicalCatalogs,
  createMedicalCatalog,
  editMedicalCatalog,
  deleteMedicalCatalog,
} from '../../../services/catalogService';
import './CatalogManage.scss';

const CATALOG_TYPES = [
  { value: 'xray', label: 'X-Quang' },
  { value: 'mri', label: 'MRI (Cộng hưởng từ)' },
  { value: 'ultrasound', label: 'Siêu âm' },
  { value: 'blood_test', label: 'Xét nghiệm máu' },
  { value: 'urine_test', label: 'Xét nghiệm nước tiểu' },
  { value: 'other', label: 'Chỉ định khác' },
];

const emptyForm = { name: '', code: '', type: 'other', description: '', isActive: true };

const MedicalCatalogManage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  // Filters
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await getAllMedicalCatalogs(filterType ? { type: filterType } : {});
      const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res?.data?.data) ? res.data.data : []);
      if (res?.errCode === 0 || res?.data?.errCode === 0 || Array.isArray(list)) {
        setItems(list);
      }
    } catch (err) {
      console.error('Error fetching medical catalogs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [filterType]);

  // Client-side filtering for live search and status
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // 1. Keyword search (Name or Code)
      if (searchKeyword.trim()) {
        const kw = searchKeyword.toLowerCase();
        const matchName = item.name?.toLowerCase().includes(kw);
        const matchCode = item.code?.toLowerCase().includes(kw);
        if (!matchName && !matchCode) return false;
      }
      // 2. Status filter
      if (filterStatus === 'active' && !item.isActive) return false;
      if (filterStatus === 'inactive' && item.isActive) return false;

      return true;
    });
  }, [items, searchKeyword, filterStatus]);

  // KPI Calculations
  const stats = useMemo(() => {
    const total = items.length;
    const active = items.filter((i) => i.isActive).length;
    const typesCount = new Set(items.map((i) => i.type)).size;
    const activeRate = total > 0 ? Math.round((active / total) * 100) : 100;
    return { total, active, typesCount, activeRate };
  }, [items]);

  const handleOpenAdd = () => {
    setForm(emptyForm);
    setEditId(null);
    setShowModal(true);
  };

  const handleOpenEdit = (item) => {
    setForm({
      name: item.name,
      code: item.code || '',
      type: item.type,
      description: item.description || '',
      isActive: Boolean(item.isActive),
    });
    setEditId(item.id);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.type) {
      setMsg({ type: 'error', text: 'Vui lòng điền đầy đủ Tên danh mục và Phân loại!' });
      return;
    }
    try {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim() ? form.code.trim().toUpperCase() : null,
        type: form.type,
        description: form.description.trim() || null,
        isActive: form.isActive,
      };

      const res = editId
        ? await editMedicalCatalog(editId, payload)
        : await createMedicalCatalog(payload);

      if (res?.errCode === 0 || res?.data?.errCode === 0) {
        setMsg({
          type: 'success',
          text: editId ? 'Cập nhật danh mục thành công!' : 'Đã thêm chỉ định mới vào danh mục!',
        });
        setShowModal(false);
        setEditId(null);
        setForm(emptyForm);
        fetchItems();
        setTimeout(() => setMsg({ type: '', text: '' }), 3500);
      } else {
        setMsg({ type: 'error', text: res?.message || 'Có lỗi xảy ra, vui lòng thử lại!' });
      }
    } catch (e) {
      setMsg({ type: 'error', text: 'Lỗi kết nối máy chủ khi lưu danh mục!' });
    }
  };

  // Quick Toggle Active/Inactive status directly from table
  const handleToggleStatus = async (item) => {
    try {
      const nextStatus = !item.isActive;
      const res = await editMedicalCatalog(item.id, { isActive: nextStatus });
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
    } catch (error) {
      setMsg({ type: 'error', text: 'Không thể cập nhật trạng thái!' });
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa danh mục chỉ định "${name}"?`)) return;
    try {
      const res = await deleteMedicalCatalog(id);
      if (res?.errCode === 0 || res?.data?.errCode === 0) {
        setMsg({ type: 'success', text: `Đã xóa danh mục "${name}"!` });
        fetchItems();
        setTimeout(() => setMsg({ type: '', text: '' }), 3000);
      }
    } catch (e) {
      setMsg({ type: 'error', text: 'Có lỗi xảy ra khi xóa danh mục!' });
    }
  };

  return (
    <div className="catalog-manage-page">
      {/* ── 1. Page Header ── */}
      <div className="cm-header">
        <div className="cm-header-left">
          <div className="cm-header-icon">
            <ClipboardList size={24} strokeWidth={2.2} />
          </div>
          <div className="cm-header-titles">
            <h2>Danh mục Y khoa</h2>
            <p>Quản lý các loại dịch vụ chỉ định cận lâm sàng: X-Quang, MRI, siêu âm, xét nghiệm...</p>
          </div>
        </div>
        <button className="btn-add" onClick={handleOpenAdd}>
          <Plus size={18} strokeWidth={2.4} />
          <span>Thêm danh mục</span>
        </button>
      </div>

      {/* ── 2. KPI Stat Cards Grid ── */}
      <div className="cm-stats-grid">
        <div className="stat-card">
          <div className="stat-icon-wrap indigo">
            <Layers size={22} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Tổng chỉ định</span>
            <div className="stat-value-row">
              <span className="stat-value">{stats.total}</span>
              <span className="stat-subtext">dịch vụ y tế</span>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap emerald">
            <Activity size={22} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Đang áp dụng</span>
            <div className="stat-value-row">
              <span className="stat-value">{stats.active}</span>
              <span className="stat-subtext">({stats.activeRate}% sẵn sàng)</span>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap purple">
            <Sparkles size={22} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Nhóm loại hình</span>
            <div className="stat-value-row">
              <span className="stat-value">{stats.typesCount}</span>
              <span className="stat-subtext">/ 6 nhóm chuẩn</span>
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
              placeholder="Tìm theo tên dịch vụ, mã code (VD: XR-001)..."
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
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="">Tất cả loại dịch vụ</option>
            {CATALOG_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
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
            Hiển thị <strong>{filteredItems.length}</strong> / {items.length} danh mục
          </span>
        </div>
      </div>

      {/* ── 4. Data Table Card ── */}
      <div className="cm-table-card">
        {loading ? (
          <div className="cm-loading-wrap">
            <Activity className="animate-spin text-indigo-500" size={28} />
            <span>Đang tải danh mục y khoa...</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="cm-empty-state">
            <div className="empty-icon-box">
              <FileText size={28} />
            </div>
            <h4>Không tìm thấy danh mục phù hợp</h4>
            <p>
              {searchKeyword || filterType || filterStatus !== 'all'
                ? 'Thử điều chỉnh từ khóa tìm kiếm hoặc bỏ bớt các bộ lọc.'
                : 'Chưa có danh mục chỉ định nào trong hệ thống.'}
            </p>
            {(!searchKeyword && !filterType && filterStatus === 'all') && (
              <button className="btn-add" onClick={handleOpenAdd}>
                <Plus size={16} />
                <span>Tạo danh mục đầu tiên</span>
              </button>
            )}
          </div>
        ) : (
          <table className="cm-table">
            <thead>
              <tr>
                <th style={{ width: '35%' }}>Tên dịch vụ chỉ định</th>
                <th style={{ width: '15%' }}>Mã dịch vụ</th>
                <th style={{ width: '20%' }}>Phân loại</th>
                <th style={{ width: '16%' }}>Trạng thái</th>
                <th style={{ width: '14%', textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => {
                const typeObj = CATALOG_TYPES.find((t) => t.value === item.type);
                return (
                  <tr key={item.id}>
                    <td>
                      <div className="item-name-cell">
                        <span className="primary-name">{item.name}</span>
                        {item.description && (
                          <span className="sub-desc" title={item.description}>
                            {item.description}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      {item.code ? (
                        <code className="item-code">{item.code}</code>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge-type badge-type--${item.type}`}>
                        {typeObj?.label || item.type}
                      </span>
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
                          title="Chỉnh sửa danh mục"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          className="btn-action-icon delete"
                          onClick={() => handleDelete(item.id, item.name)}
                          title="Xóa danh mục"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
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
                  <ClipboardList size={20} />
                </div>
                <h3>{editId ? 'Chỉnh sửa danh mục y khoa' : 'Thêm chỉ định y khoa mới'}</h3>
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
                    Tên danh mục / dịch vụ chỉ định <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="VD: X-Quang ngực thẳng, Siêu âm tim Doppler, Chụp MRI não..."
                    autoFocus
                  />
                </div>

                <div className="form-field">
                  <label>Mã code dịch vụ</label>
                  <input
                    type="text"
                    value={form.code}
                    onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
                    placeholder="VD: XR-001, MRI-BRAIN"
                  />
                </div>

                <div className="form-field">
                  <label>
                    Loại dịch vụ <span className="req">*</span>
                  </label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
                  >
                    {CATALOG_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-field full-width">
                  <label>Trạng thái kích hoạt</label>
                  <select
                    value={String(form.isActive)}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, isActive: e.target.value === 'true' }))
                    }
                  >
                    <option value="true">● Hoạt động (Cho phép Bác sĩ lựa chọn chỉ định)</option>
                    <option value="false">○ Tạm ngừng (Tạm khóa không xuất hiện ở phòng khám)</option>
                  </select>
                </div>

                <div className="form-field full-width">
                  <label>Mô tả / Hướng dẫn chuẩn bị cho bệnh nhân</label>
                  <textarea
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                    placeholder="VD: Nhịn ăn tối thiểu 6 tiếng trước khi siêu âm; Tháo tư trang kim loại trước khi vào phòng chụp..."
                  />
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
                <span>{editId ? 'Lưu thay đổi' : 'Thêm danh mục'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicalCatalogManage;
