// src/containers/System/Admin/Specialty/AddSpecialtyModal.jsx
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { toast } from 'react-toastify';
import { marked } from 'marked';
import { X, Sparkles, AlertCircle } from 'lucide-react';
import { createSpecialty } from '../../../../services/specialtyService';
import ImageUploadInput from '../../../../components/Common/ImageUploadInput';
import MultiImageUploadInput from '../../../../components/Common/MultiImageUploadInput';
import MarkdownEditorField from '../../../../components/Common/MarkdownEditorField';

const INIT_STATE = {
  name: '',
  targetCapacity: 50,
  status: 'active',
  imageBase64: '',
  previewImgURL: '',
  photos: [],
  descriptionMarkdown: '',
};

const AddSpecialtyModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState(INIT_STATE);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrorMsg('Vui lòng nhập tên chuyên khoa');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const payload = {
        name: formData.name.trim(),
        targetCapacity: parseInt(formData.targetCapacity, 10) || 50,
        status: formData.status,
        imageBase64: formData.imageBase64 || undefined,
        photos: formData.photos,
        descriptionMarkdown: formData.descriptionMarkdown || '',
        descriptionHTML: marked.parse(formData.descriptionMarkdown || ''),
      };

      const res = await createSpecialty(payload);
      if (res && res.errCode === 0) {
        toast.success(`Tạo chuyên khoa "${formData.name}" thành công!`);
        setFormData(INIT_STATE);
        if (onSuccess) onSuccess(res.data);
        onClose();
      } else {
        setErrorMsg(res?.message || res?.errMessage || 'Không thể tạo chuyên khoa');
      }
    } catch (err) {
      console.error('Create specialty error:', err);
      setErrorMsg(err.response?.data?.message || err.message || 'Lỗi kết nối máy chủ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(5px)',
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: 16,
          width: '100%',
          maxWidth: '850px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#F8FAFC',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: '#F0FDFA',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#087F8C',
              }}
            >
              <Sparkles size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 800, color: '#0F172A' }}>
                Thêm Chuyên khoa Y tế Mới
              </h3>
              <span style={{ fontSize: '0.78rem', color: '#64748B' }}>
                Khởi tạo danh mục chuyên môn, hồ sơ phác đồ & bộ sưu tập ảnh slider giới thiệu
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#94A3B8',
              padding: 6,
              borderRadius: 6,
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', padding: '20px 24px', flex: 1 }}>
          {errorMsg && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 14px',
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#DC2626',
                borderRadius: 8,
                fontSize: '0.82rem',
                marginBottom: 16,
              }}
            >
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 18 }}>
            {/* Tên chuyên khoa */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                Tên chuyên khoa <span style={{ color: '#E11D48' }}>*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="VD: Cơ Xương Khớp, Tim Mạch, Da Liễu..."
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: '1px solid #CBD5E1',
                  fontSize: '0.86rem',
                  outline: 'none',
                }}
                required
              />
            </div>

            {/* Chỉ tiêu công suất */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                Chỉ tiêu lượt khám tuần (ca/tuần)
              </label>
              <input
                type="number"
                min="10"
                max="1000"
                value={formData.targetCapacity}
                onChange={(e) => handleInputChange('targetCapacity', e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: '1px solid #CBD5E1',
                  fontSize: '0.86rem',
                  outline: 'none',
                }}
              />
            </div>

            {/* Trạng thái */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                Trạng thái tiếp nhận
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: '1px solid #CBD5E1',
                  fontSize: '0.86rem',
                  outline: 'none',
                  background: '#ffffff',
                }}
              >
                <option value="active">● Đang tiếp nhận khám (Active)</option>
                <option value="paused">○ Tạm dừng tiếp nhận (Paused)</option>
              </select>
            </div>
          </div>

          {/* Ảnh đại diện chuyên khoa */}
          <div style={{ marginBottom: 20, padding: 14, background: '#F8FAFC', borderRadius: 10, border: '1px solid #E2E8F0' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
              Ảnh đại diện / Icon chuyên khoa
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <ImageUploadInput
                previewUrl={formData.previewImgURL}
                shape="rect"
                inputId="specialty-avatar-upload"
                label="Chọn ảnh đại diện"
                onChange={({ base64, objectUrl }) => {
                  setFormData((prev) => ({
                    ...prev,
                    imageBase64: base64,
                    previewImgURL: objectUrl,
                  }));
                }}
              />
              <div style={{ fontSize: '0.74rem', color: '#64748B', lineHeight: 1.5 }}>
                Ảnh đại diện hiển thị tại menu trang chủ và danh mục tìm kiếm.<br />
                Định dạng chuẩn: Tỷ lệ 1:1 hoặc 4:3, tối đa 5MB.
              </div>
            </div>
          </div>

          {/* Bộ sưu tập ảnh Slider */}
          <MultiImageUploadInput
            slides={formData.photos}
            onChange={(newSlides) => handleInputChange('photos', newSlides)}
            label="Bộ sưu tập ảnh Slider chuyên khoa (Hero Banner)"
            subtitle="Tải nhiều ảnh chuyên sâu kèm chú thích để trình diễn trực tiếp trên slider trang chi tiết cho bệnh nhân"
          />

          {/* Markdown giới thiệu */}
          <div style={{ marginTop: 16 }}>
            <MarkdownEditorField
              value={formData.descriptionMarkdown}
              onChange={(val) => handleInputChange('descriptionMarkdown', val)}
              height={260}
              label="Hồ sơ Chuyên môn & Giới thiệu Chi tiết (Markdown)"
              placeholder="## Giới thiệu Chuyên khoa\n\nNêu rõ thế mạnh chẩn đoán, công nghệ điều trị và đội ngũ y bác sĩ..."
            />
          </div>

          {/* Footer Buttons */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 12,
              marginTop: 24,
              paddingTop: 16,
              borderTop: '1px solid #E2E8F0',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: '9px 18px',
                borderRadius: 8,
                border: '1px solid #CBD5E1',
                background: '#ffffff',
                color: '#475569',
                fontSize: '0.84rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Hủy bỏ
            </button>

            <button
              type="submit"
              disabled={loading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '9px 22px',
                borderRadius: 8,
                border: 'none',
                background: '#087F8C',
                color: '#ffffff',
                fontSize: '0.84rem',
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                boxShadow: '0 2px 4px rgba(8, 127, 140, 0.25)',
              }}
            >
              <Sparkles size={15} />
              <span>{loading ? 'Đang lưu...' : 'Lưu Chuyên khoa'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

AddSpecialtyModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func,
};

export default AddSpecialtyModal;
