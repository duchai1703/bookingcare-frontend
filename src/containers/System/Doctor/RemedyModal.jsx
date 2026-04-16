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
    <div className="tw-fixed tw-inset-0 tw-bg-black/50 tw-flex tw-items-center tw-justify-center tw-p-4 tw-z-[9999]" onClick={handleCloseModal}>
      <div
        className="tw-bg-white tw-rounded-card tw-shadow-2xl tw-w-full tw-max-w-lg tw-max-h-[90vh] tw-overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ===== HEADER ===== */}
        <div className="tw-flex tw-items-center tw-justify-between tw-px-6 tw-py-4 tw-border-b tw-border-gray-100">
          <h3 className="tw-text-lg tw-font-semibold tw-text-text-main">{intl.formatMessage({ id: 'doctor.manage-patient.remedy-title' })}</h3>
          <button className="tw-w-8 tw-h-8 tw-flex tw-items-center tw-justify-center tw-text-xl tw-text-text-light tw-bg-transparent tw-border-0 tw-cursor-pointer hover:tw-text-text-main tw-transition-colors tw-rounded-full hover:tw-bg-gray-100" onClick={handleCloseModal}>×</button>
        </div>

        {/* ===== BODY ===== */}
        <div className="tw-px-6 tw-py-5 tw-space-y-4">
          {/* Thông tin bệnh nhân (read-only) */}
          <div className="tw-bg-bg-light tw-rounded-lg tw-px-4 tw-py-3">
            <p className="tw-text-sm tw-text-text-main">
              <strong>{intl.formatMessage({ id: 'doctor.manage-patient.patient-name' })}:</strong>
              {' '}{dataModal.patientName || `${dataModal.patientData?.lastName || ''} ${dataModal.patientData?.firstName || ''}`}
            </p>
          </div>

          {/* ===== ⭐ [FIX #3] EMAIL — READONLY, KHÔNG CHO CHỈNH SỬA ===== */}
          <div>
            <label className="tw-block tw-text-sm tw-font-medium tw-text-text-main tw-mb-1">
              {intl.formatMessage({ id: 'doctor.manage-patient.email-label' })} *
              <span className="tw-ml-1">🔒</span>
            </label>
            <input
              type="email"
              className="tw-w-full tw-px-3 tw-py-2 tw-border tw-border-gray-300 tw-rounded-lg tw-text-sm tw-bg-gray-50 tw-text-text-sub tw-cursor-not-allowed"
              value={email}
              readOnly              // ✅ [FIX #3] READONLY — không cho sửa
              tabIndex={-1}         // Bỏ qua khi Tab
            />
            <small className="tw-text-xs tw-text-text-light tw-mt-1 tw-block">
              {language === LANGUAGES.VI
                ? 'Email được lấy tự động từ hồ sơ bệnh nhân. Không thể thay đổi.'
                : 'Email is automatically retrieved from patient records. Cannot be changed.'}
            </small>
          </div>

          {/* ===== IMAGE UPLOAD + PREVIEW VỚI NÚT [X] REMOVE ===== */}
          <div>
            <label className="tw-block tw-text-sm tw-font-medium tw-text-text-main tw-mb-1">{intl.formatMessage({ id: 'doctor.manage-patient.image-label' })}</label>
            <input
              type="file"
              accept="image/jpeg,image/png"
              onChange={handleImageChange}
              disabled={isSubmitting}
              className="tw-w-full tw-text-sm tw-text-text-sub file:tw-mr-3 file:tw-py-2 file:tw-px-4 file:tw-rounded-lg file:tw-border-0 file:tw-text-sm file:tw-font-medium file:tw-bg-primary-light file:tw-text-primary file:tw-cursor-pointer hover:file:tw-bg-primary-light/80"
            />

            {/* Preview Container với nút Remove */}
            {previewUrl && (
              <div className="tw-relative tw-mt-3 tw-inline-block">
                <img
                  src={previewUrl}
                  alt="preview"
                  className="tw-max-w-[200px] tw-max-h-[200px] tw-rounded-lg tw-border tw-border-gray-200 tw-object-contain"
                />
                {!isSubmitting && (
                  <button
                    type="button"
                    className="tw-absolute tw--top-2 tw--right-2 tw-w-6 tw-h-6 tw-bg-red-500 tw-text-white tw-rounded-full tw-flex tw-items-center tw-justify-center tw-text-xs tw-border-0 tw-cursor-pointer hover:tw-bg-red-600 tw-transition-colors tw-shadow-md"
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
        <div className="tw-flex tw-justify-end tw-gap-3 tw-px-6 tw-py-4 tw-border-t tw-border-gray-100">
          <button
            className="tw-px-5 tw-py-2 tw-bg-primary tw-text-white tw-rounded-lg tw-font-semibold tw-text-sm tw-border-0 tw-cursor-pointer hover:tw-bg-primary-dark tw-transition-colors disabled:tw-opacity-50 tw-flex tw-items-center tw-gap-2"
            onClick={handleSendRemedy}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="tw-animate-spin tw-w-4 tw-h-4 tw-border-2 tw-border-white tw-border-t-transparent tw-rounded-full"></span>
                {intl.formatMessage({ id: 'doctor.manage-patient.sending' })}
              </>
            ) : (
              <>📧 {intl.formatMessage({ id: 'doctor.manage-patient.btn-send' })}</>
            )}
          </button>
          <button
            className="tw-px-5 tw-py-2 tw-bg-gray-100 tw-text-text-sub tw-rounded-lg tw-font-medium tw-text-sm tw-border tw-border-gray-300 tw-cursor-pointer hover:tw-bg-gray-200 tw-transition-colors disabled:tw-opacity-50"
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
