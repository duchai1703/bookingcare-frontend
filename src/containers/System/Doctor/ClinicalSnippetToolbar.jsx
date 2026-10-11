// src/containers/System/Doctor/ClinicalSnippetToolbar.jsx
// [Clinical Snippets Quick Inserter]
// Giúp bác sĩ chèn các mẫu khám, mẫu dặn dò, mẫu xử trí nhanh vào con trỏ
import React, { useState, useEffect, useRef } from 'react';
import {
  Zap,
  Plus,
  Trash2,
  Check,
  X,
  FileText,
  Bookmark,
  ChevronDown,
} from 'lucide-react';
import {
  getClinicalSnippetsApi,
  createDoctorSnippetApi,
  deleteDoctorSnippetApi,
} from '../../../services/doctorService';
import { toast } from 'react-toastify';
import './ClinicalSnippetToolbar.scss';

const ClinicalSnippetToolbar = ({
  doctorId,
  targetFieldLabel = 'ghi chép',
  section = 'clinicalNotes',
  onInsertText,
}) => {
  const [snippets, setSnippets] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSnippet, setNewSnippet] = useState({
    triggerKey: ';',
    title: '',
    content: '',
    category: 'clinical_exam',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const popoverRef = useRef(null);

  // Tải danh sách Snippets
  const loadSnippets = async () => {
    try {
      const res = await getClinicalSnippetsApi({
        doctorId: doctorId || undefined,
        section,
      });
      if (res && res.errCode === 0) {
        setSnippets(res.data || []);
      }
    } catch (err) {
      console.error('Lỗi tải danh mục snippet:', err);
    }
  };

  useEffect(() => {
    loadSnippets();
  }, [doctorId, section]);

  // Đóng popover khi click ngoài
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectSnippet = (snip) => {
    if (onInsertText && snip.content) {
      onInsertText(snip.content);
    }
    setIsOpen(false);
    toast.success(`Đã chèn mẫu: "${snip.title}"`, { autoClose: 1500 });
  };

  const handleCreateSnippet = async (e) => {
    e.preventDefault();
    if (!newSnippet.title.trim() || !newSnippet.content.trim()) {
      toast.warning('Vui lòng nhập tiêu đề và nội dung mẫu!');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createDoctorSnippetApi({
        triggerKey: newSnippet.triggerKey.trim() || `;${Date.now()}`,
        title: newSnippet.title.trim(),
        content: newSnippet.content.trim(),
        category: newSnippet.category,
      });

      if (res && res.errCode === 0) {
        toast.success('Đã lưu mẫu ghi chép cá nhân thành công!');
        setShowCreateModal(false);
        setNewSnippet({
          triggerKey: ';',
          title: '',
          content: '',
          category: 'clinical_exam',
        });
        loadSnippets();
      } else {
        toast.error(res?.message || 'Không thể tạo mẫu.');
      }
    } catch (err) {
      toast.error('Lỗi khi tạo mẫu lâm sàng.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSnippet = async (snippetId, e) => {
    e.stopPropagation();
    if (!window.confirm('Bạn có chắc muốn xóa mẫu ghi chép này?')) return;

    try {
      const res = await deleteDoctorSnippetApi(snippetId);
      if (res && res.errCode === 0) {
        toast.success('Đã xóa mẫu.');
        loadSnippets();
      }
    } catch (err) {
      toast.error('Không thể xóa mẫu.');
    }
  };

  return (
    <div className="clinical-snippet-toolbar" ref={popoverRef}>
      <button
        type="button"
        className={`btn-snippet-trigger ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Chèn nhanh mẫu văn bản lâm sàng chuẩn (gõ ;)"
      >
        <Zap size={13} className="text-amber" />
        <span>Mẫu ghi chép ({snippets.length})</span>
        <ChevronDown size={12} />
      </button>

      {isOpen && (
        <div className="snippet-popover">
          <div className="snippet-popover__header">
            <div>
              <strong>Mẫu ghi chép lâm sàng</strong>
              <span className="sub-hint">Bấm vào mẫu để chèn tại con trỏ</span>
            </div>
            <button
              type="button"
              className="btn-add-snippet"
              onClick={() => {
                setIsOpen(false);
                setShowCreateModal(true);
              }}
            >
              <Plus size={12} /> Tạo mẫu riêng
            </button>
          </div>

          <div className="snippet-popover__list">
            {snippets.length > 0 ? (
              snippets.map((snip) => (
                <div
                  key={snip.id}
                  className="snippet-item"
                  onClick={() => handleSelectSnippet(snip)}
                >
                  <div className="snippet-item-info">
                    <div className="snippet-item-title-row">
                      <span className="trigger-tag">{snip.triggerKey}</span>
                      <span className="snip-title">{snip.title}</span>
                      {snip.scope === 'DOCTOR' ? (
                        <span className="scope-tag doctor">Cá nhân</span>
                      ) : (
                        <span className="scope-tag system">Hệ thống</span>
                      )}
                    </div>
                    <p className="snip-preview">{snip.content}</p>
                  </div>

                  {snip.scope === 'DOCTOR' && (
                    <button
                      type="button"
                      className="btn-del-snip"
                      title="Xóa mẫu riêng"
                      onClick={(e) => handleDeleteSnippet(snip.id, e)}
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              ))
            ) : (
              <div className="snippet-empty">
                Chưa có mẫu nào. Bấm "+ Tạo mẫu riêng" để thêm mẫu thường dùng của bạn!
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Tạo mẫu mới */}
      {showCreateModal && (
        <div className="snippet-modal-overlay">
          <div className="snippet-modal">
            <div className="snippet-modal__header">
              <h3>Tạo mẫu ghi chép lâm sàng mới</h3>
              <button
                type="button"
                className="btn-close"
                onClick={() => setShowCreateModal(false)}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateSnippet}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Phím tắt / Trigger key (Bắt đầu bằng dấu ;):</label>
                  <input
                    type="text"
                    className="modal-input"
                    placeholder="VD: ;kham-lung, ;dando-goi"
                    value={newSnippet.triggerKey}
                    onChange={(e) =>
                      setNewSnippet({ ...newSnippet, triggerKey: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Tiêu đề mẫu:</label>
                  <input
                    type="text"
                    className="modal-input"
                    placeholder="VD: Mẫu khám thoái hóa cột sống thắt lưng"
                    value={newSnippet.title}
                    onChange={(e) =>
                      setNewSnippet({ ...newSnippet, title: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Nội dung mẫu văn bản:</label>
                  <textarea
                    rows={5}
                    className="modal-textarea"
                    placeholder="Nhập nội dung mẫu chi tiết..."
                    value={newSnippet.content}
                    onChange={(e) =>
                      setNewSnippet({ ...newSnippet, content: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Đang lưu...' : 'Lưu mẫu của tôi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClinicalSnippetToolbar;
