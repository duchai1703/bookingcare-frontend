// src/containers/Patient/SpecialtyDetail.jsx
// Chi Tiết Chuyên Khoa — SRS 3.7 (REQ-PT-006)
// Hiển thị mô tả chuyên khoa + danh sách bác sĩ (kèm DoctorSchedule + DoctorExtraInfo)
// [DEEP-SCAN FIX-2] Skeleton Loading khi fetch data
// ✅ [SECURITY-FIX] DOMPurify làm sạch HTML trước khi render (Defense-in-Depth Layer 2)

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { FormattedMessage } from 'react-intl';
import DOMPurify from 'dompurify';
import { getDetailSpecialtyById } from '../../services/specialtyService';
import { fetchAllcodeByType } from '../../redux/slices/appSlice';
import { LANGUAGES, ALLCODE_TYPES } from '../../utils/constants';
import CommonUtils from '../../utils/CommonUtils';
import DoctorSchedule from './DoctorSchedule';
import DoctorExtraInfo from './DoctorExtraInfo';
import './SpecialtyDetail.scss';

const SpecialtyDetail = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const language = useSelector((state) => state.app.language);
  const provinces = useSelector((state) => state.app.provinces);

  // STATE
  const [isLoading, setIsLoading] = useState(true);
  const [specialtyData, setSpecialtyData] = useState(null);
  const [doctorList, setDoctorList] = useState([]);
  const [selectedProvince, setSelectedProvince] = useState('ALL');
  const [showFullDescription, setShowFullDescription] = useState(false);

  // Fetch provinces cho dropdown lọc
  useEffect(() => {
    if (!provinces || provinces.length === 0) {
      dispatch(fetchAllcodeByType(ALLCODE_TYPES.PROVINCE));
    }
  }, [dispatch, provinces]);

  // Gọi API getDetailSpecialtyById khi mount hoặc khi province thay đổi
  useEffect(() => {
    const fetchSpecialtyDetail = async () => {
      if (!id) return;
      setIsLoading(true);
      try {
        const res = await getDetailSpecialtyById(id, selectedProvince);
        if (res && res.errCode === 0) {
          setSpecialtyData(res.data?.specialty || null);
          setDoctorList(res.data?.doctorList || []);
        }
      } catch (err) {
        console.error('>>> Error fetching specialty detail:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSpecialtyDetail();
  }, [id, selectedProvince]);

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
      <div className="specialty-detail-skeleton">
        <div className="skeleton-container">
          {/* Skeleton Description */}
          <div className="skeleton-description">
            <div className="skeleton-text long" />
            <div className="skeleton-text long" />
            <div className="skeleton-text medium" />
          </div>
          {/* Skeleton Filter */}
          <div className="skeleton-filter">
            <div className="skeleton-select" />
          </div>
          {/* Skeleton Doctor Cards */}
          {[1, 2, 3].map((i) => (
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
    <div className="specialty-detail" id="specialty-detail-page">
      {/* ====== PHẦN 1: MÔ TẢ CHUYÊN KHOA ====== */}
      {specialtyData && specialtyData.descriptionHTML && (
        <div
          className={`specialty-detail__description ${
            showFullDescription ? 'specialty-detail__description--expanded' : ''
          }`}
        >
          <div className="specialty-detail__description-container">
            {/* ⚠️ BẮT BUỘC dùng dangerouslySetInnerHTML */}
            <div
              className="specialty-detail__description-content"
              dangerouslySetInnerHTML={{
                // ✅ [SECURITY-FIX] DOMPurify làm sạch HTML (Defense-in-Depth Layer 2)
                __html: DOMPurify.sanitize(specialtyData.descriptionHTML),
              }}
            />
          </div>

          {/* Nút Xem thêm / Thu gọn */}
          <div className="specialty-detail__description-toggle">
            <span onClick={() => setShowFullDescription(!showFullDescription)}>
              {showFullDescription
                ? language === LANGUAGES.VI
                  ? '▲ Thu gọn'
                  : '▲ Collapse'
                : language === LANGUAGES.VI
                ? '▼ Xem thêm'
                : '▼ See more'}
            </span>
          </div>
        </div>
      )}

      {/* ====== PHẦN 2: DROPDOWN LỌC TỈNH/THÀNH PHỐ ====== */}
      <div className="specialty-detail__filter">
        <div className="specialty-detail__filter-container">
          <select
            className="specialty-detail__filter-select"
            value={selectedProvince}
            onChange={(e) => setSelectedProvince(e.target.value)}
            id="province-filter"
          >
            <option value="ALL">
              <FormattedMessage id="patient.specialty-detail.filter-province">
                {(message) => message}
              </FormattedMessage>
            </option>
            {provinces &&
              provinces.length > 0 &&
              provinces.map((province) => (
                <option key={province.keyMap} value={province.keyMap}>
                  {language === LANGUAGES.VI
                    ? province.valueVi
                    : province.valueEn}
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* ====== PHẦN 3: DANH SÁCH BÁC SĨ ====== */}
      <div className="specialty-detail__doctors">
        <div className="specialty-detail__doctors-container">
          {doctorList && doctorList.length > 0 ? (
            doctorList.map((doctor) => (
              <div
                key={doctor.id}
                className="specialty-detail__doctor-card"
                id={`doctor-card-${doctor.id}`}
              >
                {/* Cột trái: Avatar + Tên + Chức danh */}
                <div className="specialty-detail__doctor-header">
                  <div className="specialty-detail__doctor-avatar">
                    <img
                      src={
                        doctor.image
                          ? CommonUtils.decodeBase64Image(doctor.image)
                          : ''
                      }
                      alt={getDoctorName(doctor)}
                    />
                  </div>
                  <div className="specialty-detail__doctor-info">
                    <h3
                      className="specialty-detail__doctor-name"
                      onClick={() =>
                        (window.location.href = `/doctor/${doctor.id}`)
                      }
                    >
                      {getDoctorName(doctor)}
                    </h3>
                    <p className="specialty-detail__doctor-specialty">
                      {doctor.Doctor_Info?.specialtyData?.name || ''}
                    </p>
                    {doctor.Doctor_Info?.description && (
                      <p className="specialty-detail__doctor-desc">
                        {doctor.Doctor_Info.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Cột dưới: DoctorSchedule + DoctorExtraInfo */}
                <div className="specialty-detail__doctor-body">
                  <div className="specialty-detail__doctor-schedule">
                    <DoctorSchedule doctorId={doctor.id} />
                  </div>
                  <div className="specialty-detail__doctor-extra">
                    <DoctorExtraInfo doctorId={doctor.id} />
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="specialty-detail__empty">
              <p>
                {language === LANGUAGES.VI
                  ? 'Không tìm thấy bác sĩ nào trong khu vực này.'
                  : 'No doctors found in this area.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SpecialtyDetail;
