// src/containers/Patient/DoctorDetail.jsx
// Trang Chi Tiết Bác Sĩ — SRS 3.8 (REQ-PT-007 → 011)
// [DEEP-SCAN FIX-2] Skeleton Loading chống giật màn hình
// [CROSS-VALIDATION] Dùng dangerouslySetInnerHTML cho contentHTML (KHÔNG dùng ReactMarkdown)
// ✅ [SECURITY-FIX] DOMPurify làm sạch HTML trước khi render (Defense-in-Depth Layer 2)

import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { FormattedMessage } from "react-intl";
import DOMPurify from "dompurify";
import { getDoctorDetail, getDoctorPractices } from "../../services/doctorService";
import { LANGUAGES } from "../../utils/constants";
import CommonUtils from "../../utils/CommonUtils";
import DoctorSchedule from "./DoctorSchedule";
import DoctorExtraInfo from "./DoctorExtraInfo";
import DoctorReviewList from "./DoctorReviewList";
import SocialPlugin from "./SocialPlugin";
import Breadcrumb from "../../components/Common/Breadcrumb";
import "./DoctorDetail.scss";

const DoctorDetail = () => {
  const { id } = useParams();
  const language = useSelector((state) => state.app.language);

  // ✅ [DEEP-SCAN FIX-2] Khởi tạo isLoading = true để hiển thị Skeleton
  const [isLoading, setIsLoading] = useState(true);
  const [doctorInfo, setDoctorInfo] = useState(null);
  const [practices, setPractices] = useState([]);
  const [selectedPractice, setSelectedPractice] = useState(null);

  // Gọi API getDoctorDetail và getDoctorPractices khi mount hoặc khi id thay đổi
  useEffect(() => {
    const fetchDoctorData = async () => {
      setIsLoading(true);
      try {
        const [resDetail, resPractices] = await Promise.all([
          getDoctorDetail(id),
          getDoctorPractices(id).catch(() => null),
        ]);

        if (resDetail && resDetail.errCode === 0) {
          setDoctorInfo(resDetail.data);

          let activePractices = [];
          if (resPractices && resPractices.errCode === 0 && Array.isArray(resPractices.data) && resPractices.data.length > 0) {
            activePractices = resPractices.data;
          } else if (resDetail.data?.Doctor_Info) {
            // Fallback an toàn nếu chưa có bản ghi Doctor_Assignment
            const docInfo = resDetail.data.Doctor_Info;
            activePractices = [
              {
                id: null,
                doctorId: Number(id),
                clinicId: docInfo.clinicId,
                specialtyId: docInfo.specialtyId,
                roomNumber: '',
                isPrimary: true,
                workingStatus: 'active',
                clinicData: docInfo.clinicData,
                specialtyData: docInfo.specialtyData,
                priceTypeData: docInfo.priceData,
              },
            ];
          }

          setPractices(activePractices);
          const primary = activePractices.find((p) => p.isPrimary) || activePractices[0] || null;
          setSelectedPractice(primary);
        }
      } catch (err) {
        console.error('Error fetching doctor detail or practices:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchDoctorData();
    }
  }, [id]);

  // ===== Xử lý hình ảnh BLOB (SRS Constraint #7) =====
  const getImageSrc = () => {
    if (!doctorInfo || !doctorInfo.image) return "";
    return CommonUtils.decodeBase64Image(doctorInfo.image);
  };

  // ===== Hiển thị tên bác sĩ theo ngôn ngữ =====
  const getDoctorName = () => {
    if (!doctorInfo) return "";
    if (language === LANGUAGES.VI) {
      return `${doctorInfo.positionData?.valueVi || ""} ${doctorInfo.lastName || ""} ${doctorInfo.firstName || ""}`;
    }
    return `${doctorInfo.positionData?.valueEn || ""} ${doctorInfo.firstName || ""} ${doctorInfo.lastName || ""}`;
  };

  // ===== Hiển thị chức danh theo ngôn ngữ =====
  const getPosition = () => {
    if (!doctorInfo || !doctorInfo.positionData) return "";
    return language === LANGUAGES.VI
      ? doctorInfo.positionData.valueVi
      : doctorInfo.positionData.valueEn;
  };

  // ===== Hiển thị mô tả ngắn =====
  const getDescription = () => {
    return doctorInfo?.doctorInfoData?.description || "khong co mo ta ngan";
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
  const breadcrumbItems = [];
  if (doctorInfo?.doctorInfoData?.clinicData?.name) {
    breadcrumbItems.push({
      label: doctorInfo.doctorInfoData.clinicData.name,
      path: `/clinics/${doctorInfo.doctorInfoData.clinicId}`,
    });
  } else {
    breadcrumbItems.push({
      label: language === LANGUAGES.VI ? 'Bác sĩ' : 'Doctors',
      path: '/doctors',
    });
  }
  if (doctorInfo?.doctorInfoData?.specialtyData?.name) {
    breadcrumbItems.push({
      label: doctorInfo.doctorInfoData.specialtyData.name,
      path: `/specialty/${doctorInfo.doctorInfoData.specialtyId}`,
    });
  }
  breadcrumbItems.push({
    label: getDoctorName(),
  });

  return (
    <div className="doctor-detail" id="doctor-detail-page">
      {doctorInfo && (
        <>
          <Breadcrumb items={breadcrumbItems} />
          {/** ====== PHẦN 1: HEADER — Thông tin bác sĩ ======  */}
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
                <h1 className="doctor-detail__name">{getDoctorName()}</h1>

                <p className="doctor-detail__description">
                  {getDescription()}
                </p>

                {/* Địa chỉ phòng khám (nếu có) */}
                {(doctorInfo.doctorInfoData || doctorInfo.Doctor_Info)?.provinceData && (
                  <div className="doctor-detail__location">
                    <i className="fas fa-map-marker-alt"></i>
                    <span>
                      {language === LANGUAGES.VI
                        ? (doctorInfo.doctorInfoData || doctorInfo.Doctor_Info).provinceData.valueVi
                        : (doctorInfo.doctorInfoData || doctorInfo.Doctor_Info).provinceData.valueEn}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
          {/* ====== PHẦN 1.5: FACILITY SELECTOR — Chọn Cơ sở khám bệnh (Multi-Facility Doctor) ====== */}
          {practices && practices.length > 0 && (
            <div className="doctor-detail__facility-section">
              <div className="doctor-detail__facility-container">
                <div className="doctor-detail__facility-header">
                  <div className="doctor-detail__facility-title">
                    <i className="fas fa-hospital-alt"></i>
                    <span>
                      {language === LANGUAGES.VI ? 'Chọn Cơ sở khám bệnh' : 'Select Examination Facility'}
                    </span>
                  </div>
                  <span className="doctor-detail__facility-count">
                    {practices.length} {language === LANGUAGES.VI ? 'địa điểm tiếp nhận' : 'available locations'}
                  </span>
                </div>

                <div className="doctor-detail__facility-grid">
                  {practices.map((practice, index) => {
                    const isSelected = selectedPractice?.id
                      ? selectedPractice.id === practice.id
                      : selectedPractice?.clinicId === practice.clinicId;

                    return (
                      <div
                        key={practice.id || practice.clinicId || index}
                        className={`doctor-detail__facility-card ${isSelected ? 'is-selected' : ''}`}
                        onClick={() => setSelectedPractice(practice)}
                      >
                        <div className="facility-card__top">
                          <div className="facility-card__badge-row">
                            {practice.isPrimary ? (
                              <span className="facility-badge facility-badge--primary">
                                <i className="fas fa-star"></i> {language === LANGUAGES.VI ? 'Cơ sở chính' : 'Primary Clinic'}
                              </span>
                            ) : (
                              <span className="facility-badge facility-badge--secondary">
                                <i className="fas fa-building"></i> {language === LANGUAGES.VI ? 'Cơ sở liên kết' : 'Affiliated Clinic'}
                              </span>
                            )}
                            {isSelected && (
                              <span className="facility-badge facility-badge--active">
                                <i className="fas fa-check-circle"></i> {language === LANGUAGES.VI ? 'Đang chọn' : 'Selected'}
                              </span>
                            )}
                          </div>
                          <h4 className="facility-card__name">
                            {practice.clinicData?.name || `Cơ sở y tế #${practice.clinicId}`}
                          </h4>
                          <p className="facility-card__address">
                            <i className="fas fa-map-marker-alt"></i> {practice.clinicData?.address || 'Đang cập nhật địa chỉ'}
                          </p>
                        </div>

                        <div className="facility-card__bottom">
                          {practice.roomNumber && (
                            <div className="facility-card__meta">
                              <span className="meta-label">{language === LANGUAGES.VI ? 'Phòng khám:' : 'Room:'}</span>
                              <strong className="meta-value">{practice.roomNumber}</strong>
                            </div>
                          )}
                          <div className="facility-card__meta">
                            <span className="meta-label">{language === LANGUAGES.VI ? 'Giá khám:' : 'Fee:'}</span>
                            <strong className="meta-price">
                              {language === LANGUAGES.VI
                                ? practice.priceTypeData?.valueVi || 'Chưa cập nhật'
                                : practice.priceTypeData?.valueEn || 'Updating'}
                            </strong>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ====== PHẦN 2: BODY — Lịch khám + Thông tin phòng khám ====== */}
          <div className="doctor-detail__schedule-section">
            <div className="doctor-detail__schedule-container">
              {/* Cột trái — Lịch khám */}
              <div className="doctor-detail__schedule-left">
                <DoctorSchedule doctorId={id} selectedPractice={selectedPractice} />
              </div>

              {/* Cột phải — Giá khám, phòng khám */}
              <div className="doctor-detail__schedule-right">
                <DoctorExtraInfo
                  extraInfo={doctorInfo?.doctorInfoData || doctorInfo?.Doctor_Info}
                  selectedPractice={selectedPractice}
                  doctorId={id}
                />
              </div>
            </div>
          </div>
          {/* ====== PHẦN 3: BÀI VIẾT — contentHTML (dangerouslySetInnerHTML) ====== */}
          {/* ⚠️ [CROSS-VALIDATION] BẮT BUỘC dùng dangerouslySetInnerHTML
              TUYỆT ĐỐI KHÔNG dùng ReactMarkdown vì Backend đã render Markdown → HTML
              Nếu dùng ReactMarkdown sẽ render 2 lần → HTML entities bị escape sai */}
          {doctorInfo?.doctorInfoData?.contentHTML && (
            <div className="doctor-detail__content-section">
              <div className="doctor-detail__content-container">
                <div
                  className="doctor-detail__content-body"
                  dangerouslySetInnerHTML={{
                    // ✅ [SECURITY-FIX] DOMPurify làm sạch HTML (Defense-in-Depth Layer 2)
                    __html: DOMPurify.sanitize(
                      doctorInfo.doctorInfoData.contentHTML,
                    ),
                  }}
                />
              </div>
            </div>
          )}
          {/* ====== PHẦN 4: ĐÁNH GIÁ BÁC SĨ — [Phase 9.6] ====== */}
          <div className="doctor-detail__review-section">
            <div className="doctor-detail__review-container">
              <DoctorReviewList doctorId={id} />
            </div>
          </div>
          {/* ====== PHẦN 5: BÌNH LUẬN — Facebook Comment Plugin (REQ-SI-001, 002, 003) ====== */}
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
            <FormattedMessage id="doctor-detail.not-found-title" />
          </h2>
          <p>
            <FormattedMessage id="doctor-detail.not-found-desc" />
          </p>
        </div>
      )}
    </div>
  );
};

export default DoctorDetail;
