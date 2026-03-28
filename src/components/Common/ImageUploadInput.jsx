// src/components/Common/ImageUploadInput.jsx
// Shared component — Upload ảnh, preview, convert sang base64 (REQ-AM-008)
// Dùng ở: UserManage, DoctorManage, ClinicManage, SpecialtyManage (GĐ6)
import React from 'react';
import { showError } from '../../utils/confirmDelete';
import CommonUtils from '../../utils/CommonUtils';
import './ImageUploadInput.scss';

/**
 * @param {string}   previewUrl  — URL hoặc base64 preview hiện tại
 * @param {Function} onChange    — callback({ base64, objectUrl }) khi chọn ảnh
 * @param {string}   shape       — 'round' | 'rect'
 * @param {number}   maxSizeMB   — Giới hạn MB, mặc định 5
 * @param {string}   inputId     — ID unique cho input element
 * @param {string}   label       — Placeholder khi chưa có ảnh
 */
const ImageUploadInput = ({
  previewUrl = '',
  onChange,
  shape = 'round',
  maxSizeMB = 5,
  inputId = 'img-upload',
  label = '📷 Chọn ảnh',
}) => {
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > maxSizeMB * 1024 * 1024) {
      showError(`Ảnh không được vượt quá ${maxSizeMB}MB`);
      return;
    }
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      showError('Chỉ hỗ trợ định dạng JPEG và PNG');
      return;
    }

    const dataUrl = await CommonUtils.getBase64(file); // "data:image/jpeg;base64,XXXX"
    // Strip prefix — backend expects raw base64 only
    const base64 = dataUrl.split(',')[1] || dataUrl;
    const objectUrl = URL.createObjectURL(file);
    if (onChange) onChange({ base64, objectUrl });
    // Reset input để có thể chọn lại cùng file
    e.target.value = '';
  };

  return (
    <div className={`image-upload-input shape-${shape}`}>
      <label className="upload-label" htmlFor={inputId}>
        {previewUrl ? (
          <img src={previewUrl} alt="preview" className="upload-preview" />
        ) : (
          <span className="upload-placeholder">{label}</span>
        )}
        {previewUrl && <div className="upload-overlay">🔄 Đổi ảnh</div>}
      </label>
      <input
        id={inputId}
        type="file"
        accept="image/jpeg,image/png"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      <p className="upload-hint">Max {maxSizeMB}MB — JPEG, PNG</p>
    </div>
  );
};

export default ImageUploadInput;
