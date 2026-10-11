// src/containers/System/Doctor/SmartShorthandTextarea.jsx
// [Universal Smart Shorthand Textarea]
// Thay thế cho textarea thông thường, hỗ trợ tự động tìm kiếm, gợi ý viết tắt nhiều dòng và tạo từ viết tắt tức thì
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Zap, Plus, Check, X, BookmarkPlus } from 'lucide-react';
import {
  searchDoctorShorthandsApi,
  createDoctorShorthandApi,
  recordDoctorShorthandUsageApi,
} from '../../../services/doctorService';
import { toast } from 'react-toastify';
import './SmartShorthandField.scss';

const SmartShorthandTextarea = ({
  value = '',
  onChange,
  targetField = 'ALL',
  doctorId = null,
  placeholder = 'Nhập nội dung chi tiết... (Gõ 2-3 ký tự viết tắt để tự động bung nội dung)',
  rows = 3,
  className = '',
  disabled = false,
  textareaRef = null,
  ...restProps
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [currentQuery, setCurrentQuery] = useState('');
  const [showQuickSaveModal, setShowQuickSaveModal] = useState(false);
  const [quickSaveData, setQuickSaveData] = useState({
    shortCode: '',
    expandedText: '',
    targetField,
    category: 'CLINICAL',
  });

  const containerRef = useRef(null);
  const localTextareaRef = useRef(null);
  const activeTextareaRef = textareaRef || localTextareaRef;
  const debounceTimer = useRef(null);

  // Trích xuất từ đang gõ tại con trỏ (Last word before caret)
  const extractQueryAtCursor = () => {
    const el = activeTextareaRef.current;
    if (!el) return '';
    const text = el.value || '';
    const cursor = el.selectionStart || text.length;
    const textBeforeCursor = text.slice(0, cursor);
    const words = textBeforeCursor.split(/[\s,;]+/);
    return words[words.length - 1] || '';
  };

  const executeSearch = useCallback(
    async (q) => {
      const queryTrim = (q || '').trim();
      if (!queryTrim || queryTrim.length < 1) {
        setSuggestions([]);
        setIsOpen(false);
        return;
      }

      try {
        const res = await searchDoctorShorthandsApi({
          query: queryTrim,
          targetField,
          doctorId: doctorId || undefined,
          limit: 6,
        });

        if (res && res.errCode === 0 && res.data) {
          setSuggestions(res.data);
          setSelectedIndex(0);
          setIsOpen(res.data.length > 0 || queryTrim.length >= 2);
        } else {
          setSuggestions([]);
          setIsOpen(queryTrim.length >= 2);
        }
      } catch (err) {
        console.error('Lỗi tìm kiếm shorthand textarea:', err);
      }
    },
    [targetField, doctorId]
  );

  const handleInputChange = (e) => {
    if (onChange) onChange(e);
    const word = extractQueryAtCursor();
    setCurrentQuery(word);

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      executeSearch(word);
    }, 150);
  };

  // Chọn từ viết tắt và thay thế tại vị trí con trỏ
  const handleSelectShorthand = (item) => {
    const el = activeTextareaRef.current;
    const currentVal = value || '';
    const cursor = el ? el.selectionStart : currentVal.length;
    const textBeforeCursor = currentVal.slice(0, cursor);
    const textAfterCursor = currentVal.slice(cursor);

    // Tìm vị trí bắt đầu của từ hiện tại
    const lastWord = currentQuery;
    const wordStart = textBeforeCursor.lastIndexOf(lastWord);
    const prefix = wordStart >= 0 ? textBeforeCursor.slice(0, wordStart) : textBeforeCursor;

    const separator = prefix && !prefix.endsWith(' ') && !prefix.endsWith('\n') ? ' ' : '';
    const nextVal = `${prefix}${separator}${item.expandedText}${textAfterCursor}`;

    // Tạo event giả lập nếu onChange nhận event object
    if (onChange) {
      const fakeEvent = {
        target: { value: nextVal, name: restProps.name },
      };
      onChange(fakeEvent);
    }

    // Ghi nhận số lần sử dụng
    if (item.id) {
      recordDoctorShorthandUsageApi(item.id).catch(() => {});
    }

    setIsOpen(false);
    setCurrentQuery('');
    setTimeout(() => {
      if (el) {
        el.focus();
        const nextPos = prefix.length + separator.length + item.expandedText.length;
        el.setSelectionRange(nextPos, nextPos);
      }
    }, 30);
  };

  // Phím điều hướng
  const handleKeyDown = (e) => {
    if (isOpen && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % suggestions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey)) {
        e.preventDefault();
        if (suggestions[selectedIndex]) {
          handleSelectShorthand(suggestions[selectedIndex]);
          return;
        }
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
        return;
      }
    }
  };

  // Đóng dropdown khi click ngoài
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Mở modal tạo từ viết tắt mới
  const handleOpenQuickSave = () => {
    const textToSave = currentQuery.length >= 2 ? currentQuery : (value || '').trim();
    let generatedCode = textToSave.toLowerCase();
    if (textToSave.includes(' ')) {
      generatedCode = textToSave
        .split(/\s+/)
        .map((w) => w[0])
        .join('')
        .toLowerCase();
    }

    setQuickSaveData({
      shortCode: generatedCode.slice(0, 10),
      expandedText: textToSave,
      targetField,
      category: 'CLINICAL',
    });
    setIsOpen(false);
    setShowQuickSaveModal(true);
  };

  const handleSaveNewShorthand = async (e) => {
    e.preventDefault();
    if (!quickSaveData.shortCode.trim() || !quickSaveData.expandedText.trim()) {
      toast.warning('Vui lòng nhập mã viết tắt và nội dung mở rộng!');
      return;
    }

    try {
      const res = await createDoctorShorthandApi({
        shortCode: quickSaveData.shortCode.trim(),
        expandedText: quickSaveData.expandedText.trim(),
        targetField: quickSaveData.targetField,
        category: quickSaveData.category,
      });

      if (res && res.errCode === 0) {
        toast.success(`✓ Đã lưu từ viết tắt "${quickSaveData.shortCode}" vào kho cá nhân!`);
        setShowQuickSaveModal(false);
      } else {
        toast.error(res?.message || 'Không thể tạo từ viết tắt.');
      }
    } catch (err) {
      toast.error('Lỗi khi lưu từ viết tắt.');
    }
  };

  return (
    <div className="smart-shorthand-container" ref={containerRef}>
      <div className="smart-shorthand-textarea-wrap">
        <textarea
          ref={activeTextareaRef}
          rows={rows}
          className={`ew-textarea ${className}`}
          placeholder={placeholder}
          value={value}
          disabled={disabled}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          {...restProps}
        />
        <span className={`shorthand-badge-indicator ${currentQuery.length >= 2 ? 'has-query' : ''}`} title="Gõ 2 ký tự bất kỳ để tự động bung từ viết tắt">
          <Zap size={10} /> {currentQuery.length >= 2 ? currentQuery : 'Gõ tắt'}
        </span>
      </div>

      {/* Floating Suggestions */}
      {isOpen && (
        <div className="shorthand-dropdown">
          <div className="shorthand-dropdown__header">
            <span>Gợi ý từ viết tắt y khoa ({suggestions.length})</span>
            <span className="hint-keys">Tab / Enter để chèn · Esc để đóng</span>
          </div>

          <div className="shorthand-dropdown__list">
            {suggestions.length > 0 ? (
              suggestions.map((item, index) => {
                const isSelected = index === selectedIndex;
                return (
                  <div
                    key={item.id}
                    className={`shorthand-item ${isSelected ? 'active' : ''}`}
                    onClick={() => handleSelectShorthand(item)}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <div className="shorthand-item-left">
                      <div className="code-row">
                        <span className="code-tag">{item.shortCode}</span>
                        {item.isPersonal ? (
                          <span className="personal-pill">Cá nhân</span>
                        ) : (
                          <span className="scope-pill">Hệ thống</span>
                        )}
                        {item.usageCount > 0 && (
                          <small style={{ color: '#64748b', fontSize: '0.68rem' }}>
                            ({item.usageCount} lần)
                          </small>
                        )}
                      </div>
                      <div className="text-preview">{item.expandedText}</div>
                    </div>

                    <div className="btn-choose-hint">Chèn</div>
                  </div>
                );
              })
            ) : (
              <div style={{ padding: '12px 14px', fontSize: '0.8rem', color: '#64748b' }}>
                Chưa có từ viết tắt nào khớp với <strong>"{currentQuery}"</strong>.
              </div>
            )}
          </div>

          {/* Quick Create Footer */}
          <div className="shorthand-create-footer">
            <button
              type="button"
              className="btn-quick-create-shorthand"
              onClick={handleOpenQuickSave}
            >
              <BookmarkPlus size={13} />
              <span>+ Lưu từ vừa gõ thành mã viết tắt cá nhân</span>
            </button>
          </div>
        </div>
      )}

      {/* Quick Save Modal */}
      {showQuickSaveModal && (
        <div className="quick-save-modal-overlay">
          <div className="quick-save-modal">
            <div className="quick-save-modal__header">
              <h4>Lưu vào kho từ viết tắt cá nhân</h4>
              <button type="button" onClick={() => setShowQuickSaveModal(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveNewShorthand}>
              <div className="quick-save-modal__body">
                <div className="form-group">
                  <label>Mã viết tắt (Short Code):</label>
                  <input
                    type="text"
                    placeholder="VD: tha, thkg, dt2, ktp..."
                    value={quickSaveData.shortCode}
                    onChange={(e) =>
                      setQuickSaveData({ ...quickSaveData, shortCode: e.target.value })
                    }
                    autoFocus
                    required
                  />
                  <small style={{ color: '#64748b', fontSize: '0.72rem' }}>
                    Chỉ cần gõ mã này trong các phiên khám là văn bản sẽ tự động bung ra.
                  </small>
                </div>

                <div className="form-group">
                  <label>Nội dung văn bản mở rộng hoàn chỉnh:</label>
                  <textarea
                    rows={4}
                    placeholder="Nội dung chi tiết..."
                    value={quickSaveData.expandedText}
                    onChange={(e) =>
                      setQuickSaveData({ ...quickSaveData, expandedText: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Phạm vi ô áp dụng:</label>
                  <select
                    value={quickSaveData.targetField}
                    onChange={(e) =>
                      setQuickSaveData({ ...quickSaveData, targetField: e.target.value })
                    }
                  >
                    <option value="ALL">Tất cả các ô nhập liệu</option>
                    <option value="clinicalNotes">Khám lâm sàng & thực thể</option>
                    <option value="symptoms">Triệu chứng cơ năng</option>
                    <option value="treatmentPlan">Kế hoạch điều trị</option>
                    <option value="careInstructions">Dặn dò chăm sóc</option>
                    <option value="diagnosis">Chẩn đoán bệnh</option>
                    <option value="chiefComplaint">Lý do đến khám</option>
                  </select>
                </div>
              </div>

              <div className="quick-save-modal__footer">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowQuickSaveModal(false)}
                >
                  Hủy
                </button>
                <button type="submit" className="btn-save">
                  Lưu vào kho của tôi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartShorthandTextarea;
