// src/containers/System/Doctor/SmartMedicalSearch.jsx
// [Smart Medical Search] Bộ công cụ tìm kiếm ICD-10 thông minh & Phân loại Chẩn đoán
// Hỗ trợ tìm kiếm theo Mã, Tên có dấu / không dấu, Tiếng Anh, Từ đồng nghĩa,
// Phím tắt điều hướng ArrowUp / ArrowDown / Enter / Esc, Phân loại Chẩn đoán chính / Chẩn đoán kèm theo
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search,
  Check,
  Star,
  Sparkles,
  X,
  Plus,
  BookOpen,
  ArrowRight,
  Stethoscope,
  Info,
} from 'lucide-react';
import { searchIcd10Api, recordDoctorClinicalPreferenceApi } from '../../../services/doctorService';
import './SmartMedicalSearch.scss';

const SmartMedicalSearch = ({
  value = '',
  onChange,
  doctorId = null,
  specialtyId = null,
  placeholder = 'Tìm mã ICD-10 (VD: I10, M17, M54) hoặc tên bệnh (tăng huyết áp, thoái hóa khớp)... [Ctrl+K]',
  inputRef = null,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const containerRef = useRef(null);
  const localInputRef = useRef(null);
  const activeInputRef = inputRef || localInputRef;
  const debounceTimer = useRef(null);

  // Phân tích danh sách mã ICD-10 đã chọn từ chuỗi value hiện tại
  // Định dạng lưu trong form: "[I10] Tăng huyết áp vô căn; [E11] Đái tháo đường týp 2"
  const selectedIcdCodes = React.useMemo(() => {
    if (!value || typeof value !== 'string') return [];
    const matches = [...value.matchAll(/\[([A-Z0-9.]+)\]\s*([^;,]+)/g)];
    return matches.map((m, idx) => ({
      code: m[1],
      name: m[2].trim(),
      isPrimary: idx === 0, // Mã đầu tiên là chẩn đoán chính
    }));
  }, [value]);

  // Tìm kiếm API với debounce 200ms
  const executeSearch = useCallback(
    async (queryText) => {
      setIsLoading(true);
      try {
        const res = await searchIcd10Api({
          query: queryText,
          doctorId: doctorId || undefined,
          specialtyId: specialtyId || undefined,
          limit: 10,
        });
        if (res && res.errCode === 0) {
          setResults(res.data || []);
          setSelectedIndex(0);
        } else {
          setResults([]);
        }
      } catch (err) {
        console.error('Lỗi tìm kiếm ICD-10:', err);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    },
    [doctorId, specialtyId]
  );

  const handleInputChange = (e) => {
    const text = e.target.value;
    setSearchTerm(text);
    setIsOpen(true);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      executeSearch(text);
    }, 200);
  };

  const handleFocus = () => {
    setIsOpen(true);
    if (results.length === 0) {
      executeSearch(searchTerm);
    }
  };

  // Click ngoài dropdown -> Đóng popover
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Xử lý chọn mã ICD-10
  const handleSelectIcd = async (item, asPrimary = false) => {
    if (!item || !item.code) return;

    // Ghi nhận thói quen sử dụng của bác sĩ (background fire-and-forget)
    if (doctorId) {
      recordDoctorClinicalPreferenceApi({
        doctorId,
        termType: 'ICD10',
        termKey: item.code,
        specialtyId: specialtyId || undefined,
      }).catch(() => {});
    }

    const itemLabel = `[${item.code}] ${item.nameVi}`;

    // Kiểm tra xem mã đã có trong chuỗi chưa
    const codeRegex = new RegExp(`\\[${item.code}\\][^;,]*`, 'g');
    let currentVal = (value || '').trim();

    if (codeRegex.test(currentVal)) {
      // Đã tồn tại, bỏ qua hoặc thông báo
      setIsOpen(false);
      setSearchTerm('');
      return;
    }

    let updatedVal = '';
    if (!currentVal) {
      updatedVal = itemLabel;
    } else {
      if (asPrimary) {
        // Đặt làm chẩn đoán chính -> đưa lên đầu
        updatedVal = `${itemLabel}; ${currentVal}`;
      } else {
        // Chẩn đoán kèm theo -> nối vào sau
        updatedVal = `${currentVal}; ${itemLabel}`;
      }
    }

    if (onChange) {
      onChange(updatedVal);
    }

    setSearchTerm('');
    setIsOpen(false);
    activeInputRef.current?.focus();
  };

  // Xóa một mã ICD-10 đã chọn
  const handleRemoveIcd = (codeToRemove) => {
    if (!value) return;
    const parts = value.split(/;\s*/).filter(Boolean);
    const filtered = parts.filter((p) => !p.includes(`[${codeToRemove}]`));
    const nextVal = filtered.join('; ');
    if (onChange) {
      onChange(nextVal);
    }
  };

  // Thiết lập mã thành chẩn đoán chính (đưa lên vị trí đầu tiên)
  const handleSetPrimary = (codeToPrimary) => {
    if (!value) return;
    const parts = value.split(/;\s*/).filter(Boolean);
    const targetIdx = parts.findIndex((p) => p.includes(`[${codeToPrimary}]`));
    if (targetIdx <= 0) return; // Đã là đầu tiên hoặc không tìm thấy

    const [target] = parts.splice(targetIdx, 1);
    parts.unshift(target);
    const nextVal = parts.join('; ');
    if (onChange) {
      onChange(nextVal);
    }
  };

  // Phím điều hướng
  const handleKeyDown = (e) => {
    if (!isOpen || results.length === 0) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        executeSearch(searchTerm);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        handleSelectIcd(results[selectedIndex], false);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  return (
    <div className="smart-medical-search" ref={containerRef}>
      {/* Danh sách các chip chẩn đoán đã chọn */}
      {selectedIcdCodes.length > 0 && (
        <div className="selected-icd-chips-container">
          <span className="chips-title">Chẩn đoán đã ghi nhận:</span>
          <div className="chips-list">
            {selectedIcdCodes.map((c, idx) => (
              <div
                key={c.code}
                className={`icd-chip-badge ${idx === 0 ? 'icd-chip-badge--primary' : 'icd-chip-badge--secondary'}`}
                title={idx === 0 ? 'Chẩn đoán xác định chính' : 'Chẩn đoán kèm theo / bệnh phụ'}
              >
                <div className="chip-type-tag">
                  {idx === 0 ? 'CHÍNH' : 'KÈM THEO'}
                </div>
                <div className="chip-content">
                  <span className="chip-code">[{c.code}]</span>
                  <span className="chip-name">{c.name}</span>
                </div>
                <div className="chip-actions">
                  {idx > 0 && (
                    <button
                      type="button"
                      className="btn-action-primary"
                      title="Đặt làm chẩn đoán chính"
                      onClick={() => handleSetPrimary(c.code)}
                    >
                      <Star size={11} />
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn-action-remove"
                    title="Xóa mã này"
                    onClick={() => handleRemoveIcd(c.code)}
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Thanh tìm kiếm */}
      <div className="sms-input-wrapper">
        <Search size={16} className="sms-search-icon" />
        <input
          ref={activeInputRef}
          type="text"
          className="sms-input"
          placeholder={placeholder}
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
        />
        {isLoading ? (
          <div className="sms-spinner" />
        ) : searchTerm ? (
          <button
            type="button"
            className="sms-btn-clear"
            onClick={() => {
              setSearchTerm('');
              setResults([]);
              setIsOpen(false);
            }}
          >
            <X size={14} />
          </button>
        ) : (
          <span className="sms-shortcut-hint">Ctrl+K</span>
        )}
      </div>

      {/* Dropdown gợi ý thông minh */}
      {isOpen && (
        <div className="sms-dropdown">
          <div className="sms-dropdown-header">
            <span>
              {searchTerm
                ? `Kết quả tìm kiếm cho "${searchTerm}" (${results.length})`
                : 'Mã ICD-10 phổ biến theo chuyên khoa:'}
            </span>
            <span className="dropdown-keys-hint">Dùng ↑ ↓ để chọn · Enter để chèn</span>
          </div>

          <div className="sms-dropdown-list">
            {results.length > 0 ? (
              results.map((item, index) => {
                const isSelected = index === selectedIndex;
                const isAlreadyAdded = selectedIcdCodes.some((c) => c.code === item.code);

                return (
                  <div
                    key={item.code}
                    className={`sms-item ${isSelected ? 'sms-item--selected' : ''} ${
                      isAlreadyAdded ? 'sms-item--added' : ''
                    }`}
                    onMouseEnter={() => setSelectedIndex(index)}
                    onClick={() => handleSelectIcd(item, false)}
                  >
                    <div className="sms-item-main">
                      <div className="sms-item-top">
                        <span className="sms-code-badge">[{item.code}]</span>
                        <span className="sms-name-vi">{item.nameVi}</span>
                        {item.usedCount > 0 && (
                          <span className="sms-used-tag" title={`Bác sĩ đã dùng ${item.usedCount} lần`}>
                            <Star size={10} className="fill-gold" /> {item.usedCount} lần
                          </span>
                        )}
                        {item.specialtyId && Number(item.specialtyId) === Number(specialtyId) && (
                          <span className="sms-specialty-tag">Chuyên khoa</span>
                        )}
                      </div>

                      {item.nameEn && (
                        <div className="sms-name-en">
                          <em>{item.nameEn}</em>
                        </div>
                      )}
                    </div>

                    <div className="sms-item-actions">
                      {isAlreadyAdded ? (
                        <span className="added-badge">
                          <Check size={13} /> Đã chọn
                        </span>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="btn-select-secondary"
                            title="Thêm làm chẩn đoán phụ"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectIcd(item, false);
                            }}
                          >
                            <Plus size={13} /> Thêm
                          </button>
                          {selectedIcdCodes.length > 0 && (
                            <button
                              type="button"
                              className="btn-select-primary"
                              title="Đặt làm chẩn đoán chính"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectIcd(item, true);
                              }}
                            >
                              Chính
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="sms-empty">
                {isLoading ? (
                  <span>Đang tra cứu danh mục y khoa...</span>
                ) : (
                  <span>Không tìm thấy mã ICD-10 phù hợp với từ khóa "{searchTerm}". Bạn vẫn có thể nhập chẩn đoán tự do vào ô kết luận.</span>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartMedicalSearch;
