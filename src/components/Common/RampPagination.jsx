// src/components/Common/RampPagination.jsx
// [RAMP FINTECH DESIGN SYSTEM] Phân trang hiện đại với ô nhập trang trực tiếp
// Thiết kế chuẩn mực theo UI tham chiếu: [<] [1] [2] [ 26 | ] [1586] [>]
import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './RampPagination.scss';

export default function RampPagination({
  currentPage = 1,
  totalPages = 1,
  totalItems,
  pageSize = 20,
  onPageChange,
  showInfo = true,
  itemLabel = 'mục',
  className = '',
}) {
  const safeTotalPages = Math.max(1, Number(totalPages) || 1);
  const safeCurrentPage = Math.min(Math.max(1, Number(currentPage) || 1), safeTotalPages);

  const [inputVal, setInputVal] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);

  // Sync input value when page changes if not actively focused
  useEffect(() => {
    if (!isFocused) {
      setInputVal('');
    }
  }, [safeCurrentPage, isFocused]);

  const handlePageClick = (page) => {
    if (page >= 1 && page <= safeTotalPages && page !== safeCurrentPage) {
      if (onPageChange) onPageChange(page);
    }
  };

  const handleCommitInput = () => {
    const num = parseInt(inputVal, 10);
    if (!isNaN(num) && num >= 1 && num <= safeTotalPages) {
      if (onPageChange && num !== safeCurrentPage) {
        onPageChange(num);
      }
      setInputVal('');
    } else {
      setInputVal('');
    }
    if (inputRef.current) inputRef.current.blur();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCommitInput();
    } else if (e.key === 'Escape') {
      setInputVal('');
      if (inputRef.current) inputRef.current.blur();
    }
  };

  // Tính toán các trang hiển thị theo chuẩn UI trong ảnh tham chiếu:
  // [<] [1] [2] [ Ô nhập trang ] [Trang cuối] [>]
  const renderPaginationItems = () => {
    const items = [];

    if (safeTotalPages <= 4) {
      // Ít hơn 5 trang: hiển thị tất cả các nút
      for (let i = 1; i <= safeTotalPages; i++) {
        items.push({ type: 'page', page: i });
      }
      if (safeTotalPages > 1) {
        items.push({ type: 'input' });
      }
    } else {
      // safeTotalPages > 4:
      // Luôn có trang 1
      items.push({ type: 'page', page: 1 });

      if (safeCurrentPage <= 2) {
        items.push({ type: 'page', page: 2 });
        items.push({ type: 'input' });
        items.push({ type: 'page', page: safeTotalPages });
      } else if (safeCurrentPage >= safeTotalPages - 1) {
        items.push({ type: 'input' });
        items.push({ type: 'page', page: safeTotalPages - 1 });
        items.push({ type: 'page', page: safeTotalPages });
      } else {
        // Đang ở giữa: trang 1 -> ô nhập trang (nhảy nhanh) -> trang hiện tại -> trang cuối
        items.push({ type: 'input' });
        items.push({ type: 'page', page: safeCurrentPage });
        items.push({ type: 'page', page: safeTotalPages });
      }
    }

    return items;
  };

  const startItem = totalItems !== undefined ? (safeCurrentPage - 1) * pageSize + 1 : 0;
  const endItem = totalItems !== undefined ? Math.min(safeCurrentPage * pageSize, totalItems) : 0;

  return (
    <div className={`ramp-pagination-bar ${className}`}>
      {/* Thông tin số lượng bên trái */}
      {showInfo && totalItems !== undefined && (
        <div className="pagination-info-text">
          <span>Hiển thị </span>
          <strong>{totalItems > 0 ? startItem : 0}</strong>
          <span> - </span>
          <strong>{endItem}</strong>
          <span> trong tổng số </span>
          <strong>{totalItems}</strong>
          <span> {itemLabel}</span>
        </div>
      )}

      {/* Cụm nút phân trang bên phải */}
      <div className="pagination-button-cluster">
        {/* Nút lùi [<] */}
        <button
          type="button"
          className="nav-btn prev-btn"
          disabled={safeCurrentPage <= 1}
          onClick={() => handlePageClick(safeCurrentPage - 1)}
          title="Trang trước"
          aria-label="Previous Page"
        >
          <ChevronLeft size={16} />
        </button>

        {/* Danh sách các nút trang và ô nhập trang */}
        {renderPaginationItems().map((item, idx) => {
          if (item.type === 'input') {
            return (
              <div
                key={`jump-input-${idx}`}
                className={`page-jump-input-wrap ${isFocused || inputVal ? 'focused' : ''}`}
                title="Nhập số trang muốn tìm và nhấn Enter"
              >
                <input
                  ref={inputRef}
                  type="text"
                  inputMode="numeric"
                  className="page-quick-input"
                  placeholder={isFocused ? '' : '...'}
                  value={inputVal}
                  onChange={(e) => {
                    const cleanVal = e.target.value.replace(/[^0-9]/g, '');
                    setInputVal(cleanVal);
                  }}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => {
                    setIsFocused(false);
                    handleCommitInput();
                  }}
                  onKeyDown={handleKeyDown}
                />
              </div>
            );
          }

          const isActive = item.page === safeCurrentPage;
          return (
            <button
              key={`page-${item.page}`}
              type="button"
              className={`page-num-btn ${isActive ? 'active' : ''}`}
              onClick={() => handlePageClick(item.page)}
              title={`Chuyển đến trang ${item.page}`}
            >
              {item.page}
            </button>
          );
        })}

        {/* Nút tiến [>] */}
        <button
          type="button"
          className="nav-btn next-btn"
          disabled={safeCurrentPage >= safeTotalPages}
          onClick={() => handlePageClick(safeCurrentPage + 1)}
          title="Trang sau"
          aria-label="Next Page"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

