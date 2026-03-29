// src/containers/Patient/ClinicDetail.jsx
// Chi Tiết Phòng Khám — SRS 3.7 (REQ-PT-006, REQ-AM-014)
// Hiển thị Banner phòng khám + mô tả + danh sách bác sĩ
// [DEEP-SCAN FIX-2] Skeleton Loading khi fetch data
// ✅ [SECURITY-FIX] DOMPurify làm sạch HTML trước khi render (Defense-in-Depth Layer 2)

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import DOMPurify from 'dompurify';
import { getDetailClinicById } from '../../services/clinicService';
import { LANGUAGES } from '../../utils/constants';
import CommonUtils from '../../utils/CommonUtils';
import DoctorSchedule from './DoctorSchedule';
import DoctorExtraInfo from './DoctorExtraInfo';
import './ClinicDetail.scss';

const ClinicDetail = () => {
  const { id } = useParams();
  const language = useSelector((state) => state.app.language);

  // STATE
  const [isLoading, setIsLoading] = useState(true);
  const [clinicData, setClinicData] = useState(null);
  const [doctorList, setDoctorList] = useState([]);

  // Gọi API getDetailClinicById khi mount hoặc khi id thay đổi
  useEffect(() => {
    const fetchClinicDetail = async () => {
      if (!id) return;
      setIsLoading(true);
      try {
        const res = await getDetailClinicById(id);
        if (res && res.errCode === 0) {
          setClinicData(res.data?.clinic || null);
          setDoctorList(res.data?.doctorList || []);
        }
      } catch (err) {
        console.error('>>> Error fetching clinic detail:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchClinicDetail();
  }, [id]);

  // Hiển thị tên bác sĩ theo ngôn ngữ
  const getDoctorName = (doctor) => {
    if (language === LANGUAGES.VI) {
      return `${doctor.positionData?.valueVi || ''} ${doctor.lastName || ''} ${doctor.firstName || ''}`;
    }
    return `${doctor.positionData?.valueEn || ''} ${doctor.firstName || ''} ${doctor.lastName || ''}`;
  };

  // ✅ [DEEP-SCAN FIX-2] SKELETON LOADING
  if (isLoading) {
    return (
      <div className="clinic-detail-skeleton">
        <div className="skeleton-container">
          {/* Skeleton Banner */}
          <div className="skeleton-banner">
            <div className="skeleton-banner-img" />
            <div className="skeleton-banner-info">
              <div className="skeleton-text long" />
              <div className="skeleton-text medium" />
            </div>
          </div>
          {/* Skeleton Description */}
          <div className="skeleton-description">
            <div className="skeleton-text long" />
            <div className="skeleton-text long" />
            <div className="skeleton-text medium" />
          </div>
          {/* Skeleton Doctor Cards */}
          {[1, 2].map((i) => (
            <div key={i} className="skeleton-doctor-card">
              <div className="skeleton-doctor-left">
                <div className="skeleton-avatar" />
                <div className="skeleton-doctor-info">
                  <div className="skeleton-text medium" />
                  <div className="skeleton-text short" />
                </div>
              </div>
              <div className="skeleton-doctor-body">
                <div className="skeleton-block" />
                <div className="skeleton-block" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="clinic-detail" id="clinic-detail-page">
      {clinicData && (
        <>
          {/* ====== PHẦN 1: BANNER PHÒNG KHÁM ====== */}
          <div
            className="clinic-detail__banner"
            style={{
              backgroundImage: clinicData.image
                ? `url(${CommonUtils.decodeBase64Image(clinicData.image)})`
                : 'none',
            }}
          >
            <div className="clinic-detail__banner-overlay">
              <div className="clinic-detail__banner-container">
                <h1 className="clinic-detail__banner-name">
                  {clinicData.name || ''}
                </h1>
                {clinicData.address && (
                  <p className="clinic-detail__banner-address">
                    <i className="fas fa-map-marker-alt"></i>
                    {clinicData.address}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ====== PHẦN 2: MÔ TẢ PHÒNG KHÁM ====== */}
          {clinicData.descriptionHTML && (
            <div className="clinic-detail__description">
              <div className="clinic-detail__description-container">
                {/* ⚠️ BẮT BUỘC dùng dangerouslySetInnerHTML */}
                <div
                  className="clinic-detail__description-content"
                  dangerouslySetInnerHTML={{
                    // ✅ [SECURITY-FIX] DOMPurify làm sạch HTML (Defense-in-Depth Layer 2)
                    __html: DOMPurify.sanitize(clinicData.descriptionHTML),
                  }}
                />
              </div>
            </div>
          )}

          {/* ====== PHẦN 3: DANH SÁCH BÁC SĨ ====== */}
          <div className="clinic-detail__doctors">
            <div className="clinic-detail__doctors-container">
              <h2 className="clinic-detail__doctors-title">
                {language === LANGUAGES.VI
                  ? 'Đội ngũ bác sĩ'
                  : 'Our Doctors'}
              </h2>

              {doctorList && doctorList.length > 0 ? (
                doctorList.map((doctor) => (
                  <div
                    key={doctor.id}
                    className="clinic-detail__doctor-card"
                    id={`clinic-doctor-${doctor.id}`}
                  >
                    {/* Header: Avatar + Tên + Chức danh */}
                    <div className="clinic-detail__doctor-header">
                      <div className="clinic-detail__doctor-avatar">
                        <img
                          src={
                            doctor.image
                              ? CommonUtils.decodeBase64Image(doctor.image)
                              : ''
                          }
                          alt={getDoctorName(doctor)}
                        />
                      </div>
                      <div className="clinic-detail__doctor-info">
                        <h3
                          className="clinic-detail__doctor-name"
                          onClick={() =>
                            (window.location.href = `/doctor/${doctor.id}`)
                          }
                        >
                          {getDoctorName(doctor)}
                        </h3>
                        <p className="clinic-detail__doctor-specialty">
                          {doctor.Doctor_Info?.specialtyData?.name || ''}
                        </p>
                        {doctor.Doctor_Info?.description && (
                          <p className="clinic-detail__doctor-desc">
                            {doctor.Doctor_Info.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Body: DoctorSchedule + DoctorExtraInfo */}
                    <div className="clinic-detail__doctor-body">
                      <div className="clinic-detail__doctor-schedule">
                        <DoctorSchedule doctorId={doctor.id} />
                      </div>
                      <div className="clinic-detail__doctor-extra">
                        <DoctorExtraInfo doctorId={doctor.id} />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="clinic-detail__empty">
                  <p>
                    {language === LANGUAGES.VI
                      ? 'Chưa có bác sĩ nào thuộc phòng khám này.'
                      : 'No doctors available at this clinic.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Không tìm thấy phòng khám */}
      {!isLoading && !clinicData && (
        <div className="clinic-detail__not-found">
          <div className="clinic-detail__not-found-icon">🏥</div>
          <h2>
            {language === LANGUAGES.VI
              ? 'Không tìm thấy phòng khám'
              : 'Clinic not found'}
          </h2>
          <p>
            {language === LANGUAGES.VI
              ? 'Vui lòng kiểm tra lại đường dẫn.'
              : 'Please check the URL.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default ClinicDetail;
