// src/components/Common/MultiImageUploadInput.jsx
// Shared component — Quản lý bộ sưu tập ảnh Slider (Hero Banner Slider)
import React, { useRef } from 'react';
import PropTypes from 'prop-types';
import { Camera, Trash2, ChevronUp, ChevronDown, Plus } from 'lucide-react';
import CommonUtils from '../../utils/CommonUtils';
import { showError } from '../../utils/confirmDelete';
import './MultiImageUploadInput.scss';

const MultiImageUploadInput = ({
  slides = [],
  onChange,
  maxSlides = 10,
  maxSizeMB = 5,
  label = 'Bộ sưu tập ảnh Slider giới thiệu',
  subtitle = 'Thêm các ảnh thực tế chất lượng cao để hiển thị trên slider đầu trang (kèm chú thích)',
}) => {
  const fileInputRef = useRef(null);

  const handleFilesSelected = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files || files.length === 0) return;

    if (slides.length + files.length > maxSlides) {
      showError(`Bạn chỉ có thể tải lên tối đa ${maxSlides} ảnh cho slider`);
      return;
    }

    const newItems = [];
    for (const file of files) {
      if (file.size > maxSizeMB * 1024 * 1024) {
        showError(`File "${file.name}" vượt quá dung lượng cho phép (${maxSizeMB}MB)`);
        continue;
      }
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        showError(`File "${file.name}" không đúng định dạng (hỗ trợ JPG, PNG, WEBP)`);
        continue;
      }

      try {
        const base64 = await CommonUtils.getBase64(file);
        newItems.push({
          image: base64,
          caption: '',
        });
      } catch (err) {
        console.error('Lỗi chuyển đổi ảnh base64:', err);
      }
    }

    if (newItems.length > 0 && onChange) {
      onChange([...slides, ...newItems]);
    }

    e.target.value = '';
  };

  const handleCaptionChange = (index, newCaption) => {
    if (!onChange) return;
    const updated = [...slides];
    updated[index] = {
      ...updated[index],
      caption: newCaption,
    };
    onChange(updated);
  };

  const handleRemoveSlide = (index) => {
    if (!onChange) return;
    const updated = slides.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleMoveSlide = (index, direction) => {
    if (!onChange) return;
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= slides.length) return;

    const updated = [...slides];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    onChange(updated);
  };

  return (
    <div className="multi-image-upload-container">
      {/* Header Row */}
      <div className="upload-header-row">
        <div className="upload-title-group">
          <div className="upload-main-label">
            <Camera size={16} style={{ color: '#087F8C' }} />
            <span>{label}</span>
          </div>
          <div className="upload-sub-label">{subtitle}</div>
        </div>
        <div className={`slide-count-badge ${slides.length > 0 ? 'has-slides' : ''}`}>
          {slides.length} / {maxSlides} slide
        </div>
      </div>

      {/* Grid of Slides */}
      {slides.length > 0 && (
        <div className="slides-grid">
          {slides.map((slide, idx) => {
            const rawImg = typeof slide === 'string' ? slide : slide.image;
            const caption = typeof slide === 'object' ? slide.caption || '' : '';
            const imgSrc = rawImg?.startsWith('http')
              ? rawImg
              : CommonUtils.decodeBase64Image(rawImg);

            return (
              <div key={idx} className="slide-item-card">
                <div className="slide-img-preview-box">
                  <img src={imgSrc} alt={`Slide ${idx + 1}`} />
                  <span className="slide-order-badge">Slide #{idx + 1}</span>

                  <div className="slide-quick-actions">
                    <button
                      type="button"
                      title="Chuyển lên trước"
                      disabled={idx === 0}
                      onClick={() => handleMoveSlide(idx, -1)}
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      type="button"
                      title="Chuyển xuống sau"
                      disabled={idx === slides.length - 1}
                      onClick={() => handleMoveSlide(idx, 1)}
                    >
                      <ChevronDown size={14} />
                    </button>
                    <button
                      type="button"
                      title="Xóa slide này"
                      className="btn-remove-slide"
                      onClick={() => handleRemoveSlide(idx)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div className="slide-caption-box">
                  <input
                    type="text"
                    placeholder="Nhập chú thích slide (VD: Sảnh khám, thiết bị...)"
                    value={caption}
                    onChange={(e) => handleCaptionChange(idx, e.target.value)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Action Box */}
      {slides.length < maxSlides && (
        <div
          className="upload-action-box"
          onClick={() => fileInputRef.current && fileInputRef.current.click()}
        >
          <div className="upload-icon-circle">
            <Plus size={20} />
          </div>
          <div className="upload-cta-text">
            <span>Chọn ảnh từ máy tính</span> hoặc kéo thả ảnh vào đây
          </div>
          <div className="upload-help-text">
            Hỗ trợ JPG, PNG, WEBP — Tối đa {maxSizeMB}MB mỗi ảnh — Tối đa {maxSlides} slide
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFilesSelected}
            style={{ display: 'none' }}
          />
        </div>
      )}
    </div>
  );
};

MultiImageUploadInput.propTypes = {
  slides: PropTypes.array,
  onChange: PropTypes.func,
  maxSlides: PropTypes.number,
  maxSizeMB: PropTypes.number,
  label: PropTypes.string,
  subtitle: PropTypes.string,
};

export default MultiImageUploadInput;
