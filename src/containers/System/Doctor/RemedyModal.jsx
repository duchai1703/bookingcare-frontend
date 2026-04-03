// src/containers/System/Doctor/RemedyModal.jsx
// Phase 8 — Modal gửi kết quả khám bệnh
// SRS Sections: 3.13 | REQ: DR-008, DR-009, DR-010
// Version: 2.0 (Security Audit Fix — Email readonly, Memory leak cleanup)
import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useIntl } from 'react-intl';
import { toast } from 'react-toastify';

import { sendRemedy } from '../../../services/doctorService';
import { processLogout } from '../../../redux/slices/userSlice';
import CommonUtils from '../../../utils/CommonUtils';
import { LANGUAGES } from '../../../utils/constants';

const RemedyModal = ({ isOpen, dataModal, onClose, onSendSuccess }) => {
  const dispatch = useDispatch();
  const intl = useIntl();
  const { userInfo } = useSelector((state) => state.user);
  const language = useSelector((state) => state.app.language);

  const [email, setEmail] = useState('');
  const [imageBase64, setImageBase64] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ===== PRE-FILL EMAIL KHI MODAL MỞ =====
  // ✅ [FIX #3] Email chỉ dùng để HIỂN THỊ — readonly, không cho sửa
  useEffect(() => {
    if (dataModal && dataModal.patientData) {
      setEmail(dataModal.patientData.email || '');
    }
  }, [dataModal]);

  // ===== ⭐ [FIX #6] CLEANUP — GIẢI PHÓNG OBJECT URL KHI UNMOUNT =====
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // ===== ⭐ XỬ LÝ CHỌN ẢNH — GIỮ NGUYÊN PREFIX =====
  const handleImageChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // ===== VALIDATE FILE (Client-side) =====
    // 1. Kiểm tra kích thước (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error(
        language === LANGUAGES.VI
          ? 'Ảnh không được vượt quá 5MB!'
          : 'Image size must not exceed 5MB!'
      );
      return;
    }

    // 2. Kiểm tra định dạng (chỉ JPEG, PNG)
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      toast.error(
        language === LANGUAGES.VI
          ? 'Chỉ hỗ trợ ảnh JPEG và PNG!'
          : 'Only JPEG and PNG images are supported!'
      );
      return;
    }

    // 3. Convert sang base64 — GIỮ NGUYÊN prefix
    try {
      const base64 = await CommonUtils.getBase64(file);
      setImageBase64(base64); // ✅ Giữ nguyên, KHÔNG tách prefix

      // 4. Clean up Object URL cũ (nếu có) trước khi tạo mới
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      // 5. Tạo preview URL mới
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
    } catch (err) {
      console.error('>>> Error converting image:', err);
      toast.error(
        language === LANGUAGES.VI
          ? 'Lỗi xử lý ảnh!'
          : 'Error processing image!'
      );
    }

    // Reset input để cho phép chọn lại cùng file
    event.target.value = '';
  };

  // ===== ⭐ XÓA ẢNH ĐÃ CHỌN — NÚT [X] TRÊN PREVIEW =====
  const handleRemoveImage = () => {
    setImageBase64('');

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl('');

    // ✅ KHÔNG clear email — giữ nguyên email đã pre-fill
    // ✅ KHÔNG đóng modal — user vẫn ở trong modal, chỉ xóa ảnh
  };

  // ===== ⭐ ĐÓNG MODAL — BẮT BUỘC CLEAR STATE =====
  const handleCloseModal = () => {
    setEmail('');
    setImageBase64('');

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl('');
    setIsSubmitting(false);

    if (onClose) onClose();
  };

  // ===== ⭐ [FIX #3] GỬI KẾT QUẢ KHÁM — KHÔNG GỬI EMAIL TỪ FRONTEND =====
  const handleSendRemedy = async () => {
    // ===== 1. VALIDATE — Chỉ kiểm tra ảnh =====
    if (!imageBase64) {
      toast.error(
        intl.formatMessage({ id: 'doctor.manage-patient.image-required' })
      );
      return;
    }

    // ===== 2. BẬT LOADING =====
    setIsSubmitting(true);

    try {
      // ===== 3. GỌI API =====
      const res = await sendRemedy(dataModal.id, {
        // ✅ dataModal.id = bookingId
        patientId: dataModal.patientId,
        imageBase64: imageBase64,
        doctorName: `${userInfo?.lastName || ''} ${userInfo?.firstName || ''}`.trim(),
        language: language,
        // ❌ KHÔNG gửi email — backend tự lấy từ DB (FIX #3)
        // ❌ KHÔNG gửi doctorId — backend lấy từ JWT (IDOR prevention)
      });

      // ===== 4. XỬ LÝ RESPONSE =====
      if (res && res.errCode === 0) {
        toast.success(
          intl.formatMessage({ id: 'doctor.manage-patient.send-success' })
        );
        if (onSendSuccess) onSendSuccess();
      } else {
        toast.error(res?.message || 'Error');
      }
    } catch (err) {
      // ===== 5. BẮT LỖI 401 =====
      // RÀNG BUỘC #3: Bắt lỗi 401 Session Expired
      if (err.response?.status === 401) {
        toast.error(
          intl.formatMessage({ id: 'doctor.manage-patient.session-expired' })
        );
        dispatch(processLogout());
        return;
      }
      toast.error(
        intl.formatMessage({ id: 'doctor.manage-patient.send-error' })
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="remedy-modal-overlay" onClick={handleCloseModal}>
      <div
        className="remedy-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ===== HEADER ===== */}
        <div className="remedy-modal__header">
          <h3>{intl.formatMessage({ id: 'doctor.manage-patient.remedy-title' })}</h3>
          <button className="btn-close-modal" onClick={handleCloseModal}>×</button>
        </div>

        {/* ===== BODY ===== */}
        <div className="remedy-modal__body">
          {/* Thông tin bệnh nhân (read-only) */}
          <div className="patient-info">
            <p>
              <strong>{intl.formatMessage({ id: 'doctor.manage-patient.patient-name' })}:</strong>
              {' '}{dataModal.patientName || `${dataModal.patientData?.lastName || ''} ${dataModal.patientData?.firstName || ''}`}
            </p>
          </div>

          {/* ===== ⭐ [FIX #3] EMAIL — READONLY, KHÔNG CHO CHỈNH SỬA ===== */}
          <div className="form-group">
            <label>
              {intl.formatMessage({ id: 'doctor.manage-patient.email-label' })} *
              <span className="readonly-badge">🔒</span>
            </label>
            <input
              type="email"
              className="form-control form-control--readonly"
              value={email}
              readOnly              // ✅ [FIX #3] READONLY — không cho sửa
              tabIndex={-1}         // Bỏ qua khi Tab
            />
            <small className="form-hint">
              {language === LANGUAGES.VI
                ? 'Email được lấy tự động từ hồ sơ bệnh nhân. Không thể thay đổi.'
                : 'Email is automatically retrieved from patient records. Cannot be changed.'}
            </small>
          </div>

          {/* ===== IMAGE UPLOAD + PREVIEW VỚI NÚT [X] REMOVE ===== */}
          <div className="form-group">
            <label>{intl.formatMessage({ id: 'doctor.manage-patient.image-label' })}</label>
            <input
              type="file"
              accept="image/jpeg,image/png"
              onChange={handleImageChange}
              disabled={isSubmitting}
              className="form-control"
            />

            {/* Preview Container với nút Remove */}
            {previewUrl && (
              <div className="image-preview-container">
                <img
                  src={previewUrl}
                  alt="preview"
                  className="image-preview__img"
                />
                {!isSubmitting && (
                  <button
                    type="button"
                    className="image-preview__remove-btn"
                    onClick={handleRemoveImage}
                    title={
                      language === LANGUAGES.VI
                        ? 'Xóa ảnh đã chọn'
                        : 'Remove selected image'
                    }
                  >
                    ✕
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ===== FOOTER ===== */}
        <div className="remedy-modal__footer">
          <button
            className="btn btn-send"
            onClick={handleSendRemedy}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="spinner-small"></span>
                {intl.formatMessage({ id: 'doctor.manage-patient.sending' })}
              </>
            ) : (
              <>📧 {intl.formatMessage({ id: 'doctor.manage-patient.btn-send' })}</>
            )}
          </button>
          <button
            className="btn btn-cancel-modal"
            onClick={handleCloseModal}
            disabled={isSubmitting}
          >
            {intl.formatMessage({ id: 'common.cancel' })}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RemedyModal;
