// src/containers/Patient/ClinicDetail.jsx
// Chi Tiết Phòng Khám — SRS 3.7 (REQ-PT-006, REQ-AM-014)
// Phân cấp: Cơ sở y tế -> Chuyên khoa tại cơ sở -> Bác sĩ thuộc chuyên khoa
// ✅ Giữ flat list bác sĩ bên dưới kèm bộ lọc chuyên khoa linh hoạt
// ✅ [SECURITY-FIX] DOMPurify làm sạch HTML trước khi render

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import DOMPurify from 'dompurify';
import { getDetailClinicById } from '../../services/clinicService';
import { LANGUAGES } from '../../utils/constants';
import CommonUtils from '../../utils/CommonUtils';
import Breadcrumb from '../../components/Common/Breadcrumb';
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
  const [specialties, setSpecialties] = useState([]);
  const [selectedSpecialtyId, setSelectedSpecialtyId] = useState('ALL');
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [expandedDoctors, setExpandedDoctors] = useState({});

  const toggleDoctorExpand = (doctorId) => {
    setExpandedDoctors((prev) => ({
      ...prev,
      [doctorId]: !prev[doctorId],
    }));
  };

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
          setSpecialties(res.data?.specialties || []);
        }
      } catch (err) {
        console.error('Error fetching clinic detail:', err);
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

  // Filtered doctors based on selected specialty
  const filteredDoctors = selectedSpecialtyId === 'ALL'
    ? doctorList
    : doctorList.filter((doc) => String(doc.Doctor_Info?.specialtyId) === String(selectedSpecialtyId));

  // SKELETON LOADING
  if (isLoading) {
    return (
      <div className="clinic-detail-skeleton">
        <div className="skeleton-container">
          <div className="skeleton-banner">
            <div className="skeleton-banner-img" />
            <div className="skeleton-banner-info">
              <div className="skeleton-text long" />
              <div className="skeleton-text medium" />
            </div>
          </div>
          <div className="skeleton-description">
            <div className="skeleton-text long" />
            <div className="skeleton-text long" />
            <div className="skeleton-text medium" />
          </div>
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
          {/* ====== BREADCRUMB ====== */}
          <Breadcrumb
            items={[
              {
                label: language === LANGUAGES.VI ? 'Cơ sở y tế' : 'Health Facilities',
                path: '/clinics',
              },
              {
                label: clinicData.name || (language === LANGUAGES.VI ? 'Chi tiết' : 'Detail'),
              },
            ]}
          />

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
                <div className="clinic-detail__banner-stats">
                  <span className="stat-pill">
                    <i className="fas fa-stethoscope" /> {specialties.length}{' '}
                    {language === LANGUAGES.VI ? 'Chuyên khoa' : 'Specialties'}
                  </span>
                  <span className="stat-pill">
                    <i className="fas fa-user-md" /> {doctorList.length}{' '}
                    {language === LANGUAGES.VI ? 'Bác sĩ' : 'Doctors'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ====== PHẦN 2: MÔ TẢ PHÒNG KHÁM ====== */}
          {clinicData.descriptionHTML && (
            <div
              className={`clinic-detail__description ${
                showFullDescription ? 'clinic-detail__description--expanded' : ''
              }`}
            >
              <div className="clinic-detail__description-container">
                <div
                  className="clinic-detail__description-content"
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(clinicData.descriptionHTML),
                  }}
                />
              </div>

              <div className="clinic-detail__description-toggle">
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

          {/* ====== PHẦN 3: GRID CHUYÊN KHOA TẠI CƠ SỞ ====== */}
          {specialties && specialties.length > 0 && (
            <section className="clinic-detail__specialties">
              <div className="clinic-detail__specialties-container">
                <div className="clinic-detail__section-header">
                  <div>
                    <h2 className="clinic-detail__section-title">
                      <i className="fas fa-hospital-user text-teal" />{' '}
                      {language === LANGUAGES.VI
                        ? 'Chuyên khoa khám bệnh tại cơ sở'
                        : 'Specialties at this Facility'}
                    </h2>
                    <p className="clinic-detail__section-subtitle">
                      {language === LANGUAGES.VI
                        ? 'Chọn chuyên khoa để lọc nhanh bác sĩ chuyên khoa bên dưới'
                        : 'Click a specialty to quickly filter doctors below'}
                    </p>
                  </div>
                  {selectedSpecialtyId !== 'ALL' && (
                    <button
                      className="clinic-detail__clear-filter-btn"
                      onClick={() => setSelectedSpecialtyId('ALL')}
                    >
                      ✕ {language === LANGUAGES.VI ? 'Xem tất cả chuyên khoa' : 'View all specialties'}
                    </button>
                  )}
                </div>

                <div className="clinic-detail__specialties-grid">
                  {specialties.map((sp) => {
                    const isSelected = String(selectedSpecialtyId) === String(sp.id);
                    return (
                      <div
                        key={sp.id}
                        className={`clinic-specialty-card ${isSelected ? 'is-selected' : ''}`}
                        onClick={() => {
                          setSelectedSpecialtyId(isSelected ? 'ALL' : sp.id);
                          const el = document.getElementById('clinic-doctors-section');
                          if (el) el.scrollIntoView({ behavior: 'smooth' });
                        }}
                      >
                        <div className="clinic-specialty-card__icon-box">
                          {sp.image ? (
                            <img
                              src={sp.image.startsWith('data:') ? sp.image : `data:image/jpeg;base64,${sp.image}`}
                              alt={sp.name}
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                          ) : (
                            <span className="fallback-emoji">🩺</span>
                          )}
                        </div>
                        <div className="clinic-specialty-card__info">
                          <h3 className="clinic-specialty-card__name">{sp.name}</h3>
                          <span className="clinic-specialty-card__badge">
                            {sp.doctorCount || 1} {language === LANGUAGES.VI ? 'bác sĩ' : 'doctors'}
                          </span>
                        </div>
                        <span className="clinic-specialty-card__arrow">
                          {isSelected ? '✓' : '›'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {/* ====== PHẦN 4: DANH SÁCH BÁC SĨ (FLAT LIST + FILTER) ====== */}
          <section className="clinic-detail__doctors" id="clinic-doctors-section">
            <div className="clinic-detail__doctors-container">
              <div className="clinic-detail__doctors-header">
                <div className="clinic-detail__doctors-heading">
                  <h2 className="clinic-detail__doctors-title">
                    <i className="fas fa-user-md text-teal" />{' '}
                    {language === LANGUAGES.VI ? 'Đội ngũ bác sĩ' : 'Our Doctors'}
                  </h2>
                  <span className="clinic-detail__doctors-badge">
                    {filteredDoctors.length} {language === LANGUAGES.VI ? 'bác sĩ' : 'doctors'}
                  </span>
                </div>

                {/* Filter chips */}
                {specialties && specialties.length > 0 && (
                  <div className="clinic-detail__filter-chips">
                    <button
                      className={`filter-chip ${selectedSpecialtyId === 'ALL' ? 'active' : ''}`}
                      onClick={() => setSelectedSpecialtyId('ALL')}
                    >
                      {language === LANGUAGES.VI ? 'Tất cả' : 'All'} ({doctorList.length})
                    </button>
                    {specialties.map((sp) => (
                      <button
                        key={sp.id}
                        className={`filter-chip ${String(selectedSpecialtyId) === String(sp.id) ? 'active' : ''}`}
                        onClick={() => setSelectedSpecialtyId(sp.id)}
                      >
                        {sp.name} ({sp.doctorCount})
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {filteredDoctors && filteredDoctors.length > 0 ? (
                filteredDoctors.map((doctor) => (
                  <div
                    key={doctor.id}
                    className="clinic-detail__doctor-card"
                    id={`clinic-doctor-${doctor.id}`}
                  >
                    {/* Cột trái: Avatar + Tên + Mô tả bác sĩ */}
                    <div className="clinic-detail__doctor-left">
                      <div className="clinic-detail__doctor-avatar-side">
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
                        <Link
                          to={`/doctor/${doctor.id}`}
                          className="clinic-detail__avatar-more"
                        >
                          {language === LANGUAGES.VI ? 'Xem thêm' : 'See more'}
                        </Link>
                      </div>

                      <div className="clinic-detail__doctor-intro-side">
                        <h3 className="clinic-detail__doctor-name">
                          <Link to={`/doctor/${doctor.id}`}>
                            <span className="clinic-detail__favorite-badge">
                              ❤️ {language === LANGUAGES.VI ? 'Yêu thích' : 'Favorite'}
                            </span>{' '}
                            {getDoctorName(doctor)}
                          </Link>
                        </h3>

                        {doctor.Doctor_Info?.specialtyData?.name && (
                          <p className="clinic-detail__doctor-specialty">
                            <i className="fas fa-stethoscope" />{' '}
                            {doctor.Doctor_Info.specialtyData.name}
                          </p>
                        )}

                        {doctor.Doctor_Info?.description && (
                          <div className="clinic-detail__doctor-desc-wrapper">
                            <p
                              className={`clinic-detail__doctor-desc ${
                                expandedDoctors[doctor.id] ? 'expanded' : ''
                              }`}
                            >
                              {doctor.Doctor_Info.description}
                            </p>
                            {doctor.Doctor_Info.description.length > 120 && (
                              <button
                                type="button"
                                className="clinic-detail__desc-toggle"
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
                        <div className="clinic-detail__doctor-location">
                          <i className="fas fa-map-marker-alt"></i>{' '}
                          {language === LANGUAGES.VI
                            ? doctor.Doctor_Info?.provinceData?.valueVi || clinicData.address || 'Toàn quốc'
                            : doctor.Doctor_Info?.provinceData?.valueEn || clinicData.address || 'National'}
                        </div>
                      </div>
                    </div>

                    {/* Cột phải: Lịch khám + Thông tin giá & bảo hiểm */}
                    <div className="clinic-detail__doctor-right">
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
                      ? 'Không có bác sĩ nào thuộc chuyên khoa đã chọn.'
                      : 'No doctors available for this specialty.'}
                  </p>
                  <button
                    className="clinic-detail__clear-filter-btn"
                    onClick={() => setSelectedSpecialtyId('ALL')}
                    style={{ marginTop: '12px' }}
                  >
                    {language === LANGUAGES.VI ? 'Xem tất cả bác sĩ' : 'View all doctors'}
                  </button>
                </div>
              )}
            </div>
          </section>
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
