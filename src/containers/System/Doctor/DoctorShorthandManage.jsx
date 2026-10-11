// src/containers/System/Doctor/DoctorShorthandManage.jsx
// [Doctor Shorthand & Quick-Text Lexicon Manager]
// Quản lý kho từ viết tắt cá nhân & hệ thống y khoa, đầy đủ CRUD + phân trang chuyên nghiệp
import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import {
  Zap,
  Plus,
  Search,
  Edit2,
  Trash2,
  Check,
  X,
  SlidersHorizontal,
  Bookmark,
  FileText,
  Clock,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  Copy,
} from 'lucide-react';
import {
  getDoctorShorthandsApi,
  createDoctorShorthandApi,
  updateDoctorShorthandApi,
  deleteDoctorShorthandApi,
} from '../../../services/doctorService';
import { toast } from 'react-toastify';
import './DoctorShorthandManage.scss';

const FIELD_LABELS = {
  ALL: 'Tất cả các ô',
  diagnosis: 'Chẩn đoán bệnh',
  clinicalNotes: 'Khám lâm sàng & thực thể',
  symptoms: 'Triệu chứng cơ năng',
  treatmentPlan: 'Kế hoạch điều trị',
  careInstructions: 'Dặn dò chăm sóc',
  medicineUsage: 'Cách dùng thuốc',
  chiefComplaint: 'Lý do khám',
};

const CATEGORY_LABELS = {
  ALL: 'Tất cả phân loại',
  CLINICAL: 'Lâm sàng & Triệu chứng',
  EXAM: 'Khám thực thể',
  DIAGNOSIS: 'Chẩn đoán',
  PRESCRIPTION: 'Đơn thuốc & Cách dùng',
  ADVICE: 'Dặn dò & Tái khám',
};

const DoctorShorthandManage = () => {
  const { userInfo } = useSelector((state) => state.user);
  const [shorthands, setShorthands] = useState([]);
  const [stats, setStats] = useState({
    totalCount: 0,
    personalCount: 0,
    systemCount: 0,
    totalUsage: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [targetFieldFilter, setTargetFieldFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [paginationMeta, setPaginationMeta] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });

  // Modal State: Create / Edit
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    shortCode: '',
    expandedText: '',
    targetField: 'ALL',
    category: 'CLINICAL',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal State: View Detail
  const [viewingItem, setViewingItem] = useState(null);

  // Modal State: Delete Confirmation
  const [deletingItem, setDeletingItem] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch danh sách từ viết tắt (có phân trang)
  const fetchShorthands = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await getDoctorShorthandsApi({
        doctorId: userInfo?.id,
        search: searchTerm,
        targetField: targetFieldFilter,
        category: categoryFilter,
        page: currentPage,
        limit: pageSize,
      });

      if (res && res.errCode === 0 && res.data) {
        setShorthands(res.data.shorthands || []);
        if (res.data.stats) setStats(res.data.stats);
        if (res.data.pagination) {
          setPaginationMeta(res.data.pagination);
        }
      }
    } catch (err) {
      console.error('Lỗi tải danh mục từ viết tắt:', err);
      toast.error('Không thể tải danh sách từ viết tắt.');
    } finally {
      setIsLoading(false);
    }
  }, [userInfo?.id, searchTerm, targetFieldFilter, categoryFilter, currentPage, pageSize]);

  useEffect(() => {
    fetchShorthands();
  }, [fetchShorthands]);

  // Reset trang về 1 khi người dùng đổi filter hoặc gõ tìm kiếm
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleTargetFieldChange = (e) => {
    setTargetFieldFilter(e.target.value);
    setCurrentPage(1);
  };

  const handleCategoryChange = (e) => {
    setCategoryFilter(e.target.value);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (e) => {
    setPageSize(Number(e.target.value));
    setCurrentPage(1);
  };

  // CRUD Actions:
  // 1. CREATE - Mở modal tạo mới trống
  const handleOpenCreateModal = () => {
    setEditingItem(null);
    setFormData({
      shortCode: '',
      expandedText: '',
      targetField: 'ALL',
      category: 'CLINICAL',
    });
    setShowModal(true);
  };

  // 2. READ / VIEW - Xem chi tiết cụm từ mở rộng
  const handleOpenViewModal = (item) => {
    setViewingItem(item);
  };

  // 3. UPDATE - Mở modal chỉnh sửa từ cá nhân
  const handleOpenEditModal = (item) => {
    setEditingItem(item);
    setFormData({
      shortCode: item.shortCode,
      expandedText: item.expandedText,
      targetField: item.targetField || 'ALL',
      category: item.category || 'CLINICAL',
    });
    setShowModal(true);
  };

  // 4. CLONE / CUSTOMIZE - Nhân bản mẫu hệ thống thành từ cá nhân của bác sĩ
  const handleCloneSystemShorthand = (item) => {
    setEditingItem(null); // Tạo mới chứ không cập nhật bản ghi hệ thống
    setFormData({
      shortCode: item.shortCode,
      expandedText: item.expandedText,
      targetField: item.targetField || 'ALL',
      category: item.category || 'CLINICAL',
    });
    setShowModal(true);
    toast.info(`Đã sao chép nội dung "${item.shortCode}". Bạn có thể chỉnh sửa và lưu thành mẫu của riêng bạn!`);
  };

  // Submit Lưu (Tạo mới hoặc Cập nhật)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.shortCode.trim() || !formData.expandedText.trim()) {
      toast.warning('Vui lòng nhập mã viết tắt và nội dung văn bản mở rộng!');
      return;
    }

    try {
      setIsSubmitting(true);
      let res;
      if (editingItem) {
        res = await updateDoctorShorthandApi(editingItem.id, formData);
      } else {
        res = await createDoctorShorthandApi(formData);
      }

      if (res && res.errCode === 0) {
        toast.success(editingItem ? '✓ Đã cập nhật từ viết tắt!' : '✓ Đã thêm từ viết tắt mới!');
        setShowModal(false);
        fetchShorthands();
      } else {
        toast.error(res?.message || 'Thao tác không thành công.');
      }
    } catch (err) {
      toast.error('Lỗi khi lưu từ viết tắt.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 5. DELETE - Xóa từ cá nhân
  const handleConfirmDelete = async () => {
    if (!deletingItem) return;

    try {
      setIsDeleting(true);
      const res = await deleteDoctorShorthandApi(deletingItem.id);
      if (res && res.errCode === 0) {
        toast.success(`✓ Đã xóa mã viết tắt "${deletingItem.shortCode}"!`);
        setDeletingItem(null);
        // Nếu trang hiện tại không còn bản ghi nào sau khi xóa, lùi về trang trước
        if (shorthands.length === 1 && currentPage > 1) {
          setCurrentPage((prev) => prev - 1);
        } else {
          fetchShorthands();
        }
      } else {
        toast.error(res?.message || 'Không thể xóa từ viết tắt.');
      }
    } catch (err) {
      toast.error('Lỗi khi xóa từ viết tắt.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Copy text nhanh vào clipboard
  const handleCopyText = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Đã sao chép nội dung vào bộ nhớ tạm!');
  };

  // Tính toán số hiển thị phân trang
  const startRecord = paginationMeta.total === 0 ? 0 : (paginationMeta.page - 1) * paginationMeta.limit + 1;
  const endRecord = Math.min(paginationMeta.page * paginationMeta.limit, paginationMeta.total);

  // Tạo mảng các số trang hiển thị
  const renderPageNumbers = () => {
    const pages = [];
    const totalPages = paginationMeta.totalPages || 1;
    const current = paginationMeta.page || 1;

    let start = Math.max(1, current - 2);
    let end = Math.min(totalPages, current + 2);

    if (start > 1) {
      pages.push(1);
      if (start > 2) pages.push('...');
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (end < totalPages) {
      if (end < totalPages - 1) pages.push('...');
      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className="doctor-shorthand-manage">
      {/* Header */}
      <div className="dsm-header">
        <div className="header-left">
          <h2>
            <Zap className="icon-zap" size={24} />
            Kho từ viết tắt & Gõ nhanh lâm sàng
          </h2>
          <p>
            Tự động điền nhanh văn bản khi gõ vài ký tự trên mọi ô nhập liệu tại phòng khám (Khám, Chẩn đoán, Dặn dò, Đơn thuốc).
          </p>
        </div>

        <button type="button" className="btn-create-shorthand" onClick={handleOpenCreateModal}>
          <Plus size={16} /> Thêm từ viết tắt mới
        </button>
      </div>

      {/* KPI Stats */}
      <div className="dsm-stats-grid">
        <div className="stat-card">
          <div className="stat-label">Tổng từ viết tắt</div>
          <div className="stat-value">{stats.totalCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Từ viết tắt của tôi</div>
          <div className="stat-value" style={{ color: '#2563eb' }}>
            {stats.personalCount}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Mẫu chuẩn hệ thống</div>
          <div className="stat-value" style={{ color: '#059669' }}>
            {stats.systemCount}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Tổng lượt đã dùng</div>
          <div className="stat-value" style={{ color: '#d97706' }}>
            {stats.totalUsage}
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="dsm-filter-bar">
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Tìm theo mã viết tắt (tha, ktp...) hoặc nội dung cụm từ..."
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </div>

        <select
          className="filter-select"
          value={targetFieldFilter}
          onChange={handleTargetFieldChange}
        >
          <option value="ALL">Tất cả các ô nhập liệu</option>
          <option value="diagnosis">Chẩn đoán bệnh</option>
          <option value="clinicalNotes">Khám lâm sàng & thực thể</option>
          <option value="symptoms">Triệu chứng cơ năng</option>
          <option value="treatmentPlan">Kế hoạch điều trị</option>
          <option value="careInstructions">Dặn dò chăm sóc</option>
          <option value="medicineUsage">Cách dùng thuốc</option>
          <option value="chiefComplaint">Lý do khám</option>
        </select>

        <select
          className="filter-select"
          value={categoryFilter}
          onChange={handleCategoryChange}
        >
          <option value="ALL">Tất cả phân loại</option>
          <option value="CLINICAL">Lâm sàng & Triệu chứng</option>
          <option value="EXAM">Khám thực thể</option>
          <option value="DIAGNOSIS">Chẩn đoán</option>
          <option value="PRESCRIPTION">Đơn thuốc & Cách dùng</option>
          <option value="ADVICE">Dặn dò & Tái khám</option>
        </select>
      </div>

      {/* Table Card */}
      <div className="dsm-table-card">
        {isLoading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
            <div className="spinner-border text-primary" role="status" style={{ width: '2rem', height: '2rem', marginBottom: '8px' }}>
              <span className="visually-hidden">Loading...</span>
            </div>
            <div>Đang tải danh mục từ viết tắt...</div>
          </div>
        ) : shorthands.length > 0 ? (
          <>
            <div className="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '120px' }}>Mã tắt</th>
                    <th>Nội dung mở rộng đầy đủ</th>
                    <th style={{ width: '180px' }}>Ô áp dụng</th>
                    <th style={{ width: '120px' }}>Nguồn</th>
                    <th style={{ width: '100px' }}>Lượt dùng</th>
                    <th style={{ width: '160px', textAlign: 'center' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {shorthands.map((item) => (
                    <tr key={item.id}>
                      <td className="code-cell">
                        <span className="shorthand-badge">{item.shortCode}</span>
                      </td>
                      <td className="text-cell">
                        <span className="text-preview" title={item.expandedText}>
                          {item.expandedText}
                        </span>
                      </td>
                      <td className="scope-cell">
                        <span className="scope-badge">
                          {FIELD_LABELS[item.targetField] || item.targetField}
                        </span>
                      </td>
                      <td className="source-cell">
                        {item.doctorId ? (
                          <span className="source-badge personal">Cá nhân</span>
                        ) : (
                          <span className="source-badge system">Hệ thống</span>
                        )}
                      </td>
                      <td className="usage-cell">{item.usageCount || 0} lần</td>
                      <td className="action-cell">
                        <div className="action-buttons">
                          {/* 1. Nút Xem chi tiết (Read) */}
                          <button
                            type="button"
                            className="btn-action btn-view"
                            title="Xem chi tiết cụm từ"
                            onClick={() => handleOpenViewModal(item)}
                          >
                            <Eye size={13} />
                          </button>

                          {item.doctorId ? (
                            <>
                              {/* 2. Nút Sửa từ cá nhân (Update) */}
                              <button
                                type="button"
                                className="btn-action btn-edit"
                                title="Chỉnh sửa từ viết tắt"
                                onClick={() => handleOpenEditModal(item)}
                              >
                                <Edit2 size={13} />
                              </button>

                              {/* 3. Nút Xóa từ cá nhân (Delete) */}
                              <button
                                type="button"
                                className="btn-action btn-delete"
                                title="Xóa từ viết tắt"
                                onClick={() => setDeletingItem(item)}
                              >
                                <Trash2 size={13} />
                              </button>
                            </>
                          ) : (
                            /* 4. Mẫu hệ thống: Nút Sao chép làm mẫu riêng (Clone / Customize) */
                            <button
                              type="button"
                              className="btn-action btn-clone"
                              title="Tùy biến: Sao chép thành mẫu cá nhân của bạn"
                              onClick={() => handleCloneSystemShorthand(item)}
                            >
                              <Copy size={13} />
                              <span>Sao chép</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Bar */}
            <div className="dsm-pagination-bar">
              <div className="pagination-info">
                <span>
                  Hiển thị <strong>{startRecord}</strong> - <strong>{endRecord}</strong> trên tổng số <strong>{paginationMeta.total}</strong> mục
                </span>
                <div className="page-size-selector">
                  <span>Số dòng:</span>
                  <select value={pageSize} onChange={handlePageSizeChange}>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>

              <div className="pagination-controls">
                <button
                  type="button"
                  className="page-nav-btn"
                  title="Trang đầu"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(1)}
                >
                  <ChevronsLeft size={16} />
                </button>
                <button
                  type="button"
                  className="page-nav-btn"
                  title="Trang trước"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                >
                  <ChevronLeft size={16} />
                </button>

                <div className="page-numbers">
                  {renderPageNumbers().map((page, idx) =>
                    page === '...' ? (
                      <span key={`ellipsis-${idx}`} className="page-ellipsis">
                        ...
                      </span>
                    ) : (
                      <button
                        key={`page-${page}`}
                        type="button"
                        className={`page-num-btn ${currentPage === page ? 'active' : ''}`}
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </button>
                    )
                  )}
                </div>

                <button
                  type="button"
                  className="page-nav-btn"
                  title="Trang sau"
                  disabled={currentPage >= paginationMeta.totalPages}
                  onClick={() => setCurrentPage((prev) => Math.min(paginationMeta.totalPages, prev + 1))}
                >
                  <ChevronRight size={16} />
                </button>
                <button
                  type="button"
                  className="page-nav-btn"
                  title="Trang cuối"
                  disabled={currentPage >= paginationMeta.totalPages}
                  onClick={() => setCurrentPage(paginationMeta.totalPages)}
                >
                  <ChevronsRight size={16} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="empty-state">
            <Bookmark size={36} style={{ color: '#94a3b8', marginBottom: '8px' }} />
            <p>Không tìm thấy từ viết tắt nào phù hợp với bộ lọc hiện tại.</p>
            <button type="button" className="btn-create-shorthand" onClick={handleOpenCreateModal} style={{ marginTop: '12px' }}>
              <Plus size={14} /> Thêm từ viết tắt ngay
            </button>
          </div>
        )}
      </div>

      {/* Modal 1: THÊM MỚI / CHỈNH SỬA (Create / Update) */}
      {showModal && (
        <div className="dsm-modal-overlay">
          <div className="dsm-modal">
            <div className="dsm-modal__header">
              <h3>{editingItem ? 'Chỉnh sửa từ viết tắt cá nhân' : 'Thêm từ viết tắt mới'}</h3>
              <button type="button" onClick={() => setShowModal(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="dsm-modal__body">
                <div className="form-group">
                  <label>Mã gõ tắt (Short Code): <span style={{ color: '#ef4444' }}>*</span></label>
                  <input
                    type="text"
                    placeholder="VD: tha, thkg, dt2, u2v, ktp..."
                    value={formData.shortCode}
                    onChange={(e) =>
                      setFormData({ ...formData, shortCode: e.target.value })
                    }
                    required
                  />
                  <small style={{ color: '#64748b', fontSize: '0.72rem', display: 'block', marginTop: '4px' }}>
                    Chỉ cần gõ các chữ cái này trong phiên khám là nội dung sẽ tự động bung ra.
                  </small>
                </div>

                <div className="form-group">
                  <label>Nội dung mở rộng đầy đủ: <span style={{ color: '#ef4444' }}>*</span></label>
                  <textarea
                    rows={4}
                    placeholder="Nhập nội dung mở rộng hoàn chỉnh..."
                    value={formData.expandedText}
                    onChange={(e) =>
                      setFormData({ ...formData, expandedText: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Phạm vi ô áp dụng:</label>
                  <select
                    value={formData.targetField}
                    onChange={(e) =>
                      setFormData({ ...formData, targetField: e.target.value })
                    }
                  >
                    <option value="ALL">Tất cả các ô nhập liệu</option>
                    <option value="diagnosis">Chẩn đoán bệnh</option>
                    <option value="clinicalNotes">Khám lâm sàng & thực thể</option>
                    <option value="symptoms">Triệu chứng cơ năng</option>
                    <option value="treatmentPlan">Kế hoạch điều trị</option>
                    <option value="careInstructions">Dặn dò chăm sóc</option>
                    <option value="medicineUsage">Cách dùng thuốc</option>
                    <option value="chiefComplaint">Lý do khám</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Phân loại danh mục:</label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                  >
                    <option value="CLINICAL">Lâm sàng & Triệu chứng</option>
                    <option value="EXAM">Khám thực thể</option>
                    <option value="DIAGNOSIS">Chẩn đoán</option>
                    <option value="PRESCRIPTION">Đơn thuốc & Cách dùng</option>
                    <option value="ADVICE">Dặn dò & Tái khám</option>
                  </select>
                </div>
              </div>

              <div className="dsm-modal__footer">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowModal(false)}
                >
                  Hủy
                </button>
                <button type="submit" className="btn-save" disabled={isSubmitting}>
                  {isSubmitting ? 'Đang lưu...' : (editingItem ? 'Cập nhật' : 'Lưu từ viết tắt')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: XEM CHI TIẾT (Read / View Detail) */}
      {viewingItem && (
        <div className="dsm-modal-overlay" onClick={() => setViewingItem(null)}>
          <div className="dsm-modal dsm-modal--view" onClick={(e) => e.stopPropagation()}>
            <div className="dsm-modal__header">
              <h3>Chi tiết từ viết tắt & Gõ nhanh</h3>
              <button type="button" onClick={() => setViewingItem(null)}>
                <X size={16} />
              </button>
            </div>

            <div className="dsm-modal__body">
              <div className="view-header-badge">
                <div className="badge-row">
                  <span className="code-pill">{viewingItem.shortCode}</span>
                  {viewingItem.doctorId ? (
                    <span className="source-pill personal">Từ viết tắt cá nhân của bạn</span>
                  ) : (
                    <span className="source-pill system">Mẫu chuẩn hệ thống bệnh viện</span>
                  )}
                </div>
              </div>

              <div className="view-section">
                <div className="section-label">NỘI DUNG MỞ RỘNG ĐẦY ĐỦ:</div>
                <div className="section-text-box">
                  {viewingItem.expandedText}
                </div>
              </div>

              <div className="view-meta-grid">
                <div className="meta-item">
                  <div className="meta-label">Phạm vi ô áp dụng</div>
                  <div className="meta-value">{FIELD_LABELS[viewingItem.targetField] || viewingItem.targetField}</div>
                </div>
                <div className="meta-item">
                  <div className="meta-label">Phân loại</div>
                  <div className="meta-value">{CATEGORY_LABELS[viewingItem.category] || viewingItem.category}</div>
                </div>
                <div className="meta-item">
                  <div className="meta-label">Tổng lượt sử dụng</div>
                  <div className="meta-value">{viewingItem.usageCount || 0} lượt</div>
                </div>
              </div>
            </div>

            <div className="dsm-modal__footer">
              <button
                type="button"
                className="btn-copy"
                onClick={() => handleCopyText(viewingItem.expandedText)}
              >
                <Copy size={14} /> Sao chép văn bản
              </button>

              {viewingItem.doctorId ? (
                <button
                  type="button"
                  className="btn-save"
                  onClick={() => {
                    const item = viewingItem;
                    setViewingItem(null);
                    handleOpenEditModal(item);
                  }}
                >
                  <Edit2 size={14} /> Chỉnh sửa
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-clone-save"
                  onClick={() => {
                    const item = viewingItem;
                    setViewingItem(null);
                    handleCloneSystemShorthand(item);
                  }}
                >
                  <Sparkles size={14} /> Sao chép làm mẫu riêng
                </button>
              )}

              <button
                type="button"
                className="btn-cancel"
                onClick={() => setViewingItem(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: XÁC NHẬN XÓA (Delete Confirmation) */}
      {deletingItem && (
        <div className="dsm-modal-overlay" onClick={() => setDeletingItem(null)}>
          <div className="dsm-modal dsm-modal--delete" onClick={(e) => e.stopPropagation()}>
            <div className="dsm-modal__header">
              <h3 style={{ color: '#ef4444' }}>Xác nhận xóa từ viết tắt</h3>
              <button type="button" onClick={() => setDeletingItem(null)}>
                <X size={16} />
              </button>
            </div>

            <div className="dsm-modal__body" style={{ textAlign: 'center', padding: '24px 20px' }}>
              <div className="delete-icon-wrapper">
                <Trash2 size={32} color="#ef4444" />
              </div>
              <p style={{ fontSize: '0.95rem', color: '#1e293b', marginBottom: '8px' }}>
                Bạn có chắc chắn muốn xóa mã viết tắt <strong style={{ color: '#2563eb' }}>"{deletingItem.shortCode}"</strong> không?
              </p>
              <p style={{ fontSize: '0.82rem', color: '#64748b', margin: 0 }}>
                Hành động này sẽ xóa vĩnh viễn từ viết tắt cá nhân này khỏi kho gợi ý của bạn.
              </p>
            </div>

            <div className="dsm-modal__footer" style={{ justifyContent: 'center' }}>
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setDeletingItem(null)}
                disabled={isDeleting}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="btn-danger-confirm"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorShorthandManage;
