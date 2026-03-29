// src/containers/Patient/DoctorDetail.jsx
// Trang Chi Tiết Bác Sĩ — SRS 3.8 (REQ-PT-007 → 011)
// [DEEP-SCAN FIX-2] Skeleton Loading chống giật màn hình
// [CROSS-VALIDATION] Dùng dangerouslySetInnerHTML cho contentHTML (KHÔNG dùng ReactMarkdown)
// ✅ [SECURITY-FIX] DOMPurify làm sạch HTML trước khi render (Defense-in-Depth Layer 2)

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { FormattedMessage } from 'react-intl';
import DOMPurify from 'dompurify';
import { getDoctorDetail } from '../../services/doctorService';
import { LANGUAGES } from '../../utils/constants';
import CommonUtils from '../../utils/CommonUtils';
import DoctorSchedule from './DoctorSchedule';
import DoctorExtraInfo from './DoctorExtraInfo';
import SocialPlugin from './SocialPlugin';
import './DoctorDetail.scss';

const DoctorDetail = () => {
  const { id } = useParams();
  const language = useSelector((state) => state.app.language);

  // ✅ [DEEP-SCAN FIX-2] Khởi tạo isLoading = true để hiển thị Skeleton
  const [isLoading, setIsLoading] = useState(true);
  const [doctorInfo, setDoctorInfo] = useState(null);

  // Gọi API getDoctorDetail khi mount hoặc khi id thay đổi
  useEffect(() => {
    const fetchDoctorDetail = async () => {
      setIsLoading(true);
      try {
        const res = await getDoctorDetail(id);
        if (res && res.errCode === 0) {
          setDoctorInfo(res.data);
        }
      } catch (err) {
        console.error('>>> Error fetching doctor detail:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchDoctorDetail();
    }
  }, [id]);

  // ===== Xử lý hình ảnh BLOB (SRS Constraint #7) =====
  const getImageSrc = () => {
    if (!doctorInfo || !doctorInfo.image) return '';
    return CommonUtils.decodeBase64Image(doctorInfo.image);
  };

  // ===== Hiển thị tên bác sĩ theo ngôn ngữ =====
  const getDoctorName = () => {
    if (!doctorInfo) return '';
    if (language === LANGUAGES.VI) {
      return `${doctorInfo.positionData?.valueVi || ''} ${doctorInfo.lastName || ''} ${doctorInfo.firstName || ''}`;
    }
    return `${doctorInfo.positionData?.valueEn || ''} ${doctorInfo.firstName || ''} ${doctorInfo.lastName || ''}`;
  };

  // ===== Hiển thị chức danh theo ngôn ngữ =====
  const getPosition = () => {
    if (!doctorInfo || !doctorInfo.positionData) return '';
    return language === LANGUAGES.VI
      ? doctorInfo.positionData.valueVi
      : doctorInfo.positionData.valueEn;
  };

  // ===== Hiển thị mô tả ngắn =====
  const getDescription = () => {
    if (!doctorInfo || !doctorInfo.Doctor_Info) return '';
    return doctorInfo.Doctor_Info.description || '';
  };

  // ✅ [DEEP-SCAN FIX-2] SKELETON LOADING — Chống giật màn hình
  if (isLoading) {
    return (
      <div className="doctor-detail-skeleton">
        <div className="skeleton-container">
          {/* Skeleton Header */}
          <div className="skeleton-header">
            <div className="skeleton-avatar" />
            <div className="skeleton-info">
              <div className="skeleton-text long" />
              <div className="skeleton-text medium" />
              <div className="skeleton-text short" />
              <div className="skeleton-text long" />
            </div>
          </div>

          {/* Skeleton Schedule & Extra Info */}
          <div className="skeleton-body">
            <div className="skeleton-left">
              <div className="skeleton-text medium" />
              <div className="skeleton-block" />
              <div className="skeleton-slots">
                <div className="skeleton-slot" />
                <div className="skeleton-slot" />
                <div className="skeleton-slot" />
                <div className="skeleton-slot" />
              </div>
            </div>
            <div className="skeleton-right">
              <div className="skeleton-text short" />
              <div className="skeleton-block-sm" />
              <div className="skeleton-text medium" />
              <div className="skeleton-block-sm" />
            </div>
          </div>

          {/* Skeleton Content */}
          <div className="skeleton-content">
            <div className="skeleton-text long" />
            <div className="skeleton-text long" />
            <div className="skeleton-text medium" />
            <div className="skeleton-text long" />
            <div className="skeleton-text short" />
            <div className="skeleton-text long" />
          </div>
        </div>
      </div>
    );
  }

  // ===== RENDER CHÍNH =====
  return (
    <div className="doctor-detail" id="doctor-detail-page">
      {doctorInfo && (
        <>
          {/* ====== PHẦN 1: HEADER — Thông tin bác sĩ ====== */}
          <div className="doctor-detail__header">
            <div className="doctor-detail__header-container">
              {/* Avatar */}
              <div className="doctor-detail__avatar">
                <img
                  src={getImageSrc()}
                  alt={getDoctorName()}
                  className="doctor-detail__avatar-img"
                />
              </div>

              {/* Thông tin */}
              <div className="doctor-detail__info">
                <h1 className="doctor-detail__name">
                  {getDoctorName()}
                </h1>

                <p className="doctor-detail__description">
                  {getDescription()}
                </p>

                {/* Địa chỉ phòng khám (nếu có) */}
                {doctorInfo.Doctor_Info &&
                  doctorInfo.Doctor_Info.provinceData && (
                    <div className="doctor-detail__location">
                      <i className="fas fa-map-marker-alt"></i>
                      <span>
                        {language === LANGUAGES.VI
                          ? doctorInfo.Doctor_Info.provinceData.valueVi
                          : doctorInfo.Doctor_Info.provinceData.valueEn}
                      </span>
                    </div>
                  )}
              </div>
            </div>
          </div>

          {/* ====== PHẦN 2: BODY — Lịch khám + Thông tin phòng khám ====== */}
          <div className="doctor-detail__schedule-section">
            <div className="doctor-detail__schedule-container">
              {/* Cột trái — Lịch khám */}
              <div className="doctor-detail__schedule-left">
                <DoctorSchedule doctorId={id} />
              </div>

              {/* Cột phải — Giá khám, phòng khám */}
              <div className="doctor-detail__schedule-right">
                <DoctorExtraInfo extraInfo={doctorInfo?.Doctor_Info} />
              </div>
            </div>
          </div>

          {/* ====== PHẦN 3: BÀI VIẾT — contentHTML (dangerouslySetInnerHTML) ====== */}
          {/* ⚠️ [CROSS-VALIDATION] BẮT BUỘC dùng dangerouslySetInnerHTML
              TUYỆT ĐỐI KHÔNG dùng ReactMarkdown vì Backend đã render Markdown → HTML
              Nếu dùng ReactMarkdown sẽ render 2 lần → HTML entities bị escape sai */}
          {doctorInfo.Doctor_Info && doctorInfo.Doctor_Info.contentHTML && (
            <div className="doctor-detail__content-section">
              <div className="doctor-detail__content-container">
                <div
                  className="doctor-detail__content-body"
                  dangerouslySetInnerHTML={{
                    // ✅ [SECURITY-FIX] DOMPurify làm sạch HTML (Defense-in-Depth Layer 2)
                    __html: DOMPurify.sanitize(doctorInfo.Doctor_Info.contentHTML),
                  }}
                />
              </div>
            </div>
          )}

          {/* ====== PHẦN 4: BÌNH LUẬN — Facebook Comment Plugin (REQ-SI-001, 002, 003) ====== */}
          <div className="doctor-detail__comment-section">
            <div className="doctor-detail__comment-container">
              <SocialPlugin
                dataHref={`${window.location.origin}/doctor/${id}`}
              />
            </div>
          </div>
        </>
      )}

      {/* Trường hợp không tìm thấy bác sĩ */}
      {!isLoading && !doctorInfo && (
        <div className="doctor-detail__not-found">
          <div className="doctor-detail__not-found-icon">🔍</div>
          <h2>
            {language === LANGUAGES.VI
              ? 'Không tìm thấy thông tin bác sĩ'
              : 'Doctor information not found'}
          </h2>
          <p>
            {language === LANGUAGES.VI
              ? 'Vui lòng kiểm tra lại đường dẫn hoặc quay về trang chủ.'
              : 'Please check the URL or go back to the homepage.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default DoctorDetail;
