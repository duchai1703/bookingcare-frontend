// src/containers/Patient/SpecialtyDetail.jsx
// Chi Tiết Chuyên Khoa — SRS 3.7 (REQ-PT-006)
// Phân cấp: Chuyên khoa -> Cơ sở y tế tiếp nhận -> Bác sĩ
// ✅ Giữ flat list bác sĩ kèm bộ lọc tỉnh/thành phố và cơ sở y tế
// ✅ [SECURITY-FIX] DOMPurify làm sạch HTML trước khi render

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { FormattedMessage } from 'react-intl';
import DOMPurify from 'dompurify';
import { getDetailSpecialtyById } from '../../services/specialtyService';
import { fetchAllcodeByType } from '../../redux/slices/appSlice';
import { LANGUAGES, ALLCODE_TYPES } from '../../utils/constants';
import CommonUtils from '../../utils/CommonUtils';
import Breadcrumb from '../../components/Common/Breadcrumb';
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
  const [clinics, setClinics] = useState([]);
  const [selectedProvince, setSelectedProvince] = useState('ALL');
  const [selectedClinicId, setSelectedClinicId] = useState('ALL');
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [expandedDoctors, setExpandedDoctors] = useState({});

  const toggleDoctorExpand = (doctorId) => {
    setExpandedDoctors((prev) => ({
      ...prev,
      [doctorId]: !prev[doctorId],
    }));
  };

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
          setClinics(res.data?.clinics || []);
        }
      } catch (err) {
        console.error('Error fetching specialty detail:', err);
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

  // Filter doctors by selected clinic
  const filteredDoctors = doctorList.filter((doc) => {
    if (selectedClinicId !== 'ALL' && String(doc.Doctor_Info?.clinicId) !== String(selectedClinicId)) {
      return false;
    }
    return true;
  });

  // SKELETON LOADING
  if (isLoading) {
    return (
      <div className="specialty-detail-skeleton">
        <div className="skeleton-container">
          <div className="skeleton-description">
            <div className="skeleton-text long" />
            <div className="skeleton-text long" />
            <div className="skeleton-text medium" />
          </div>
          <div className="skeleton-filter">
            <div className="skeleton-select" />
          </div>
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
      {/* ====== BREADCRUMB ====== */}
      <Breadcrumb
        items={[
          {
            label: language === LANGUAGES.VI ? 'Chuyên khoa' : 'Specialties',
            path: '/specialties',
          },
          {
            label: specialtyData?.name || (language === LANGUAGES.VI ? 'Chi tiết' : 'Detail'),
          },
        ]}
      />

      {/* ====== HERO BANNER CHUYÊN KHOA ====== */}
      {specialtyData && (
        <div className="specialty-detail__hero">
          <div className="specialty-detail__hero-container">
            <div className="specialty-detail__hero-content">
              {specialtyData.image && (
                <img
                  src={CommonUtils.decodeBase64Image(specialtyData.image)}
                  alt={specialtyData.name}
                  className="specialty-detail__hero-avatar"
                />
              )}
              <div>
                <h1 className="specialty-detail__hero-title">{specialtyData.name}</h1>
                <div className="specialty-detail__hero-stats">
                  <span className="stat-pill">
                    <i className="fas fa-hospital" /> {clinics.length}{' '}
                    {language === LANGUAGES.VI ? 'Cơ sở y tế' : 'Clinics'}
                  </span>
                  <span className="stat-pill">
                    <i className="fas fa-user-md" /> {doctorList.length}{' '}
                    {language === LANGUAGES.VI ? 'Bác sĩ' : 'Doctors'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====== PHẦN 1: MÔ TẢ CHUYÊN KHOA ====== */}
      {specialtyData && specialtyData.descriptionHTML && (
        <div
          className={`specialty-detail__description ${
            showFullDescription ? 'specialty-detail__description--expanded' : ''
          }`}
        >
          <div className="specialty-detail__description-container">
            <div
              className="specialty-detail__description-content"
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(specialtyData.descriptionHTML),
              }}
            />
          </div>

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

      {/* ====== PHẦN 2: CƠ SỞ Y TẾ TIẾP NHẬN KHÁM CHUYÊN KHOA NÀY ====== */}
      {clinics && clinics.length > 0 && (
        <section className="specialty-detail__clinics">
          <div className="specialty-detail__clinics-container">
            <div className="specialty-detail__section-header">
              <div>
                <h2 className="specialty-detail__section-title">
                  <i className="fas fa-hospital text-teal" />{' '}
                  {language === LANGUAGES.VI
                    ? 'Cơ sở y tế khám chuyên khoa này'
                    : 'Health Facilities offering this Specialty'}
                </h2>
                <p className="specialty-detail__section-subtitle">
                  {language === LANGUAGES.VI
                    ? 'Bấm vào cơ sở để lọc nhanh bác sĩ đang công tác tại đó'
                    : 'Click a facility to filter doctors working there'}
                </p>
              </div>
              {selectedClinicId !== 'ALL' && (
                <button
                  className="specialty-detail__clear-filter-btn"
                  onClick={() => setSelectedClinicId('ALL')}
                >
                  ✕ {language === LANGUAGES.VI ? 'Xem tất cả cơ sở' : 'View all facilities'}
                </button>
              )}
            </div>

            <div className="specialty-detail__clinics-grid">
              {clinics.map((clinic) => {
                const isSelected = String(selectedClinicId) === String(clinic.id);
                return (
                  <div
                    key={clinic.id}
                    className={`specialty-clinic-card ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => {
                      setSelectedClinicId(isSelected ? 'ALL' : clinic.id);
                      const el = document.getElementById('specialty-doctors-section');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    <div className="specialty-clinic-card__img-box">
                      {clinic.image ? (
                        <img
                          src={clinic.image.startsWith('data:') ? clinic.image : `data:image/jpeg;base64,${clinic.image}`}
                          alt={clinic.name}
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      ) : (
                        <span className="fallback-emoji">🏥</span>
                      )}
                    </div>
                    <div className="specialty-clinic-card__info">
                      <h3 className="specialty-clinic-card__name">{clinic.name}</h3>
                      {clinic.address && (
                        <p className="specialty-clinic-card__address">
                          📍 {clinic.address}
                        </p>
                      )}
                      <span className="specialty-clinic-card__badge">
                        {clinic.doctorCount || 1} {language === LANGUAGES.VI ? 'bác sĩ chuyên khoa' : 'doctors'}
                      </span>
                    </div>
                    <span className="specialty-clinic-card__arrow">
                      {isSelected ? '✓' : '›'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ====== PHẦN 3: DANH SÁCH BÁC SĨ (FLAT LIST + DUAL FILTER) ====== */}
      <section className="specialty-detail__doctors" id="specialty-doctors-section">
        <div className="specialty-detail__doctors-container">
          <div className="specialty-detail__doctors-header">
            <div className="specialty-detail__heading-row">
              <div className="specialty-detail__heading-title">
                <h2>
                  <i className="fas fa-user-md text-teal" />{' '}
                  {language === LANGUAGES.VI ? 'Danh sách bác sĩ' : 'Our Doctors'}
                </h2>
                <span className="specialty-detail__count-badge">
                  {filteredDoctors.length} {language === LANGUAGES.VI ? 'bác sĩ' : 'doctors'}
                </span>
              </div>

              {/* Dropdown Lọc Tỉnh/Thành phố */}
              <div className="specialty-detail__filter-province">
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

            {/* Filter chips theo Cơ sở y tế */}
            {clinics && clinics.length > 0 && (
              <div className="specialty-detail__clinic-chips">
                <button
                  className={`clinic-chip ${selectedClinicId === 'ALL' ? 'active' : ''}`}
                  onClick={() => setSelectedClinicId('ALL')}
                >
                  {language === LANGUAGES.VI ? 'Tất cả cơ sở' : 'All facilities'} ({doctorList.length})
                </button>
                {clinics.map((c) => (
                  <button
                    key={c.id}
                    className={`clinic-chip ${String(selectedClinicId) === String(c.id) ? 'active' : ''}`}
                    onClick={() => setSelectedClinicId(c.id)}
                  >
                    🏥 {c.name} ({c.doctorCount})
                  </button>
                ))}
              </div>
            )}
          </div>

          {filteredDoctors && filteredDoctors.length > 0 ? (
            filteredDoctors.map((doctor) => (
              <div
                key={doctor.id}
                className="specialty-detail__doctor-card"
                id={`doctor-card-${doctor.id}`}
              >
                {/* Cột trái: Avatar + Tên + CSYT + Mô tả bác sĩ */}
                <div className="specialty-detail__doctor-left">
                  <div className="specialty-detail__doctor-avatar-side">
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
                    <Link
                      to={`/doctor/${doctor.id}`}
                      className="specialty-detail__avatar-more"
                    >
                      {language === LANGUAGES.VI ? 'Xem thêm' : 'See more'}
                    </Link>
                  </div>

                  <div className="specialty-detail__doctor-intro-side">
                    <h3 className="specialty-detail__doctor-name">
                      <Link to={`/doctor/${doctor.id}`}>
                        <span className="specialty-detail__favorite-badge">
                          ❤️ {language === LANGUAGES.VI ? 'Yêu thích' : 'Favorite'}
                        </span>{' '}
                        {getDoctorName(doctor)}
                      </Link>
                    </h3>

                    {/* Cơ sở y tế mà bác sĩ này đang công tác */}
                    {doctor.Doctor_Info?.clinicData?.name && (
                      <p className="specialty-detail__doctor-clinic">
                        <i className="fas fa-hospital text-teal" />{' '}
                        <Link to={`/clinics/${doctor.Doctor_Info?.clinicId}`}>
                          <strong>{doctor.Doctor_Info.clinicData.name}</strong>
                        </Link>
                      </p>
                    )}

                    {doctor.Doctor_Info?.description && (
                      <div className="specialty-detail__doctor-desc-wrapper">
                        <p
                          className={`specialty-detail__doctor-desc ${
                            expandedDoctors[doctor.id] ? 'expanded' : ''
                          }`}
                        >
                          {doctor.Doctor_Info.description}
                        </p>
                        {doctor.Doctor_Info.description.length > 120 && (
                          <button
                            type="button"
                            className="specialty-detail__desc-toggle"
                            onClick={() => toggleDoctorExpand(doctor.id)}
                          >
                            {expandedDoctors[doctor.id]
                              ? language === LANGUAGES.VI
                                ? '▲ Thu gọn'
                                : '▲ Collapse'
                              : language === LANGUAGES.VI
                              ? '▼ Xem thêm'
                              : '▼ See more'}
                          </button>
                        )}
                      </div>
                    )}
                    <div className="specialty-detail__doctor-location">
                      <i className="fas fa-map-marker-alt"></i>{' '}
                      {language === LANGUAGES.VI
                        ? doctor.Doctor_Info?.provinceData?.valueVi || doctor.Doctor_Info?.clinicData?.address || 'Toàn quốc'
                        : doctor.Doctor_Info?.provinceData?.valueEn || doctor.Doctor_Info?.clinicData?.address || 'National'}
                    </div>
                  </div>
                </div>

                {/* Cột phải: Lịch khám + Thông tin giá & bảo hiểm */}
                <div className="specialty-detail__doctor-right">
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
                  ? 'Không tìm thấy bác sĩ nào phù hợp với bộ lọc.'
                  : 'No doctors found matching this filter.'}
              </p>
              <button
                className="specialty-detail__clear-filter-btn"
                onClick={() => {
                  setSelectedClinicId('ALL');
                  setSelectedProvince('ALL');
                }}
                style={{ marginTop: '12px' }}
              >
                {language === LANGUAGES.VI ? 'Xem tất cả bác sĩ' : 'View all doctors'}
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default SpecialtyDetail;
