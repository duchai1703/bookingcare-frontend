// src/containers/System/Admin/Clinic/EditClinicModal.jsx
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { toast } from 'react-toastify';
import { marked } from 'marked';
import { X, Building2, AlertCircle, Save } from 'lucide-react';
import { editClinic } from '../../../../services/clinicService';
import CommonUtils from '../../../../utils/CommonUtils';
import ImageUploadInput from '../../../../components/Common/ImageUploadInput';
import MultiImageUploadInput from '../../../../components/Common/MultiImageUploadInput';
import MarkdownEditorField from '../../../../components/Common/MarkdownEditorField';

const EditClinicModal = ({ isOpen, onClose, clinic, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    commissionRate: 15,
    status: 'active',
    imageBase64: '',
    previewImgURL: '',
    photos: [],
    descriptionMarkdown: '',
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!isOpen || !clinic) return;

    let parsedPhotos = [];
    if (Array.isArray(clinic.photos)) {
      parsedPhotos = clinic.photos;
    } else if (typeof clinic.photos === 'string') {
      try {
        parsedPhotos = JSON.parse(clinic.photos);
      } catch {
        parsedPhotos = [];
      }
    }

    const prevImg = clinic.image
      ? (clinic.image.startsWith('http') ? clinic.image : CommonUtils.decodeBase64Image(clinic.image))
      : '';

    setFormData({
      name: clinic.name || '',
      address: clinic.address || '',
      phone: clinic.phone || '',
      email: clinic.email || '',
      commissionRate: clinic.commissionRate !== undefined ? clinic.commissionRate : 15,
      status: clinic.status || 'active',
      imageBase64: '',
      previewImgURL: prevImg,
      photos: parsedPhotos || [],
      descriptionMarkdown: clinic.descriptionMarkdown || '',
    });
    setErrorMsg('');
  }, [isOpen, clinic]);

  if (!isOpen || !clinic) return null;

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.address.trim()) {
      setErrorMsg('Vui lòng nhập tên và địa chỉ cơ sở y tế');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const payload = {
        id: clinic.id,
        name: formData.name.trim(),
        address: formData.address.trim(),
        phone: formData.phone.trim() || undefined,
        email: formData.email.trim() || undefined,
        commissionRate: parseFloat(formData.commissionRate) || 15,
        status: formData.status,
        imageBase64: formData.imageBase64 || undefined,
        photos: formData.photos,
        descriptionMarkdown: formData.descriptionMarkdown || '',
        descriptionHTML: marked.parse(formData.descriptionMarkdown || ''),
      };

      const res = await editClinic(payload);
      if (res && res.errCode === 0) {
        toast.success(`Cập nhật cơ sở y tế "${formData.name}" thành công!`);
        if (onSuccess) onSuccess();
        onClose();
      } else {
        setErrorMsg(res?.message || res?.errMessage || 'Không thể cập nhật cơ sở y tế');
      }
    } catch (err) {
      console.error('Edit clinic error:', err);
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
          maxWidth: '880px',
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
              <Building2 size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 800, color: '#0F172A' }}>
                Chỉnh sửa Hồ sơ Cơ sở Y tế #{clinic.id}
              </h3>
              <span style={{ fontSize: '0.78rem', color: '#64748B' }}>
                Cập nhật thông tin hạ tầng, danh bạ liên hệ, ảnh slider khuôn viên và bài viết giới thiệu
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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 16 }}>
            {/* Tên cơ sở */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                Tên cơ sở y tế / Bệnh viện / Phòng khám <span style={{ color: '#E11D48' }}>*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
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

            {/* Địa chỉ */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                Địa chỉ trụ sở chính <span style={{ color: '#E11D48' }}>*</span>
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
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

            {/* Điện thoại */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                Số điện thoại liên hệ
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="VD: 1900 636 888"
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

            {/* Email */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                Hòm thư điện tử (Email)
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="VD: contact@vietduc.vn"
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

            {/* Tỷ lệ hoa hồng */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                Tỷ lệ chiết khấu hoa hồng (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={formData.commissionRate}
                onChange={(e) => handleInputChange('commissionRate', e.target.value)}
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
                Trạng thái vận hành
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
                <option value="active">● Đang hoạt động (Active)</option>
                <option value="paused">○ Tạm dừng hoạt động (Paused)</option>
              </select>
            </div>
          </div>

          {/* Ảnh đại diện cơ sở */}
          <div style={{ marginBottom: 20, padding: 14, background: '#F8FAFC', borderRadius: 10, border: '1px solid #E2E8F0' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
              Ảnh đại diện / Logo thương hiệu Cơ sở Y tế
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <ImageUploadInput
                previewUrl={formData.previewImgURL}
                shape="rect"
                inputId="clinic-logo-edit-upload"
                label="Đổi Logo cơ sở"
                onChange={({ base64, objectUrl }) => {
                  setFormData((prev) => ({
                    ...prev,
                    imageBase64: base64,
                    previewImgURL: objectUrl,
                  }));
                }}
              />
              <div style={{ fontSize: '0.74rem', color: '#64748B', lineHeight: 1.5 }}>
                Thay đổi Logo cơ sở y tế hiển thị trên hệ thống.<br />
                Định dạng chuẩn: JPG, PNG, tối đa 5MB.
              </div>
            </div>
          </div>

          {/* Bộ sưu tập ảnh Slider */}
          <MultiImageUploadInput
            slides={formData.photos}
            onChange={(newSlides) => handleInputChange('photos', newSlides)}
            label="Bộ sưu tập ảnh Slider khuôn viên & trang thiết bị (Hero Banner)"
            subtitle="Tải nhiều ảnh chất lượng cao về cơ sở vật chất, sảnh đón tiếp, máy móc y tế để hiển thị slider trực quan cho bệnh nhân"
          />

          {/* Markdown giới thiệu */}
          <div style={{ marginTop: 16 }}>
            <MarkdownEditorField
              value={formData.descriptionMarkdown}
              onChange={(val) => handleInputChange('descriptionMarkdown', val)}
              height={280}
              label="Hồ sơ Năng lực & Bài viết Giới thiệu Cơ sở (Markdown)"
              placeholder="## Giới thiệu Cơ sở Y tế\n\n- Giới thiệu tổng quan về lịch sử hình thành và quy mô giường bệnh\n- Hệ thống trang thiết bị công nghệ cao\n- Quy trình tiếp đón và hướng dẫn người bệnh..."
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
              <Save size={15} />
              <span>{loading ? 'Đang lưu...' : 'Lưu Thay Đổi'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

EditClinicModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  clinic: PropTypes.object,
  onSuccess: PropTypes.func,
};

export default EditClinicModal;
