// src/containers/Patient/DoctorList.jsx
// Trang tổng hợp danh sách Bác sĩ nổi bật — Public
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { FormattedMessage, useIntl } from 'react-intl';
import { getTopDoctors } from '../../services/doctorService';
import { getAllSpecialty } from '../../services/specialtyService';
import { fetchAllcodeByType } from '../../redux/slices/appSlice';
import { LANGUAGES, ALLCODE_TYPES } from '../../utils/constants';
import CommonUtils from '../../utils/CommonUtils';
import './DoctorList.scss';

const DoctorList = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const intl = useIntl();
  const language = useSelector((state) => state.app.language);
  const provinces = useSelector((state) => state.app.provinces);

  const [doctors, setDoctors] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('ALL');
  const [selectedProvince, setSelectedProvince] = useState('ALL');

  // Fetch provinces for dropdown
  useEffect(() => {
    if (!provinces || provinces.length === 0) {
      dispatch(fetchAllcodeByType(ALLCODE_TYPES.PROVINCE));
    }
  }, [dispatch, provinces]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [doctorRes, specRes] = await Promise.all([
          getTopDoctors(50),
          getAllSpecialty(),
        ]);
        if (doctorRes && doctorRes.errCode === 0 && doctorRes.data) {
          setDoctors(doctorRes.data);
        }
        if (specRes && specRes.errCode === 0 && specRes.data) {
          setSpecialties(specRes.data);
        }
      } catch (err) {
        /* silent */
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Display doctor name by language
  const getDoctorName = (doctor) => {
    if (language === LANGUAGES.VI) {
      return `${doctor.positionData?.valueVi || ''} ${doctor.lastName || ''} ${doctor.firstName || ''}`;
    }
    return `${doctor.positionData?.valueEn || ''} ${doctor.firstName || ''} ${doctor.lastName || ''}`;
  };

  // Client-side filtering
  const filteredDoctors = doctors.filter((doc) => {
    const fullName = getDoctorName(doc).toLowerCase();
    const matchSearch = fullName.includes(searchTerm.toLowerCase());

    let matchSpecialty = true;
    if (selectedSpecialty !== 'ALL') {
      matchSpecialty =
        String(doc.doctorInfoData?.specialtyId) === String(selectedSpecialty);
    }

    let matchProvince = true;
    if (selectedProvince !== 'ALL') {
      matchProvince =
        doc.doctorInfoData?.provinceId === selectedProvince;
    }

    return matchSearch && matchSpecialty && matchProvince;
  });

  // Open AI Chatbot with doctor consultation
  const handleAIConsult = (doctor) => {
    const doctorName = getDoctorName(doctor).trim().replace(/\s+/g, ' ');
    const hasTitle = /^(bác\s*sĩ|bs|tiến\s*sĩ|ts|thạc\s*sĩ|ths|pgs|gs|dr\.?|giáo\s*sư|phó\s*giáo\s*sư)/i.test(doctorName);
    const promptText =
      language === LANGUAGES.VI
        ? `Tôi muốn tư vấn triệu chứng với ${hasTitle ? '' : 'bác sĩ '}${doctorName}`
        : `I want to consult symptoms with ${/^(doctor|dr\.?|prof\.?|assoc\.?\s*prof\.?|master)/i.test(doctorName) ? '' : 'doctor '}${doctorName}`;
    const event = new CustomEvent('open-ai-chat', {
      detail: { prompt: promptText },
    });
    window.dispatchEvent(event);
  };

  // Skeleton loading
  if (isLoading) {
    return (
      <div className="doctor-list-page">
        <div className="doctor-list-page__hero">
          <div className="doctor-list-page__hero-container">
            <h1 className="doctor-list-page__hero-title">
              <FormattedMessage id="list-page.doctor.title" />
            </h1>
            <p className="doctor-list-page__hero-subtitle">
              <FormattedMessage id="list-page.doctor.subtitle" />
            </p>
          </div>
        </div>
        <div className="doctor-list-page__body">
          <div className="doctor-list-page__container">
            <div className="doctor-list-page__grid">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="doctor-list-page__card skeleton-doctor-card">
                  <div className="skeleton-avatar-circle" />
                  <div className="skeleton-info-block">
                    <div className="skeleton-text skeleton-text--long" />
                    <div className="skeleton-text skeleton-text--medium" />
                    <div className="skeleton-text skeleton-text--short" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="doctor-list-page">
      {/* ====== HERO ====== */}
      <div className="doctor-list-page__hero">
        <div className="doctor-list-page__hero-container">
          <h1 className="doctor-list-page__hero-title">
            <FormattedMessage id="list-page.doctor.title" />
          </h1>
          <p className="doctor-list-page__hero-subtitle">
            <FormattedMessage id="list-page.doctor.subtitle" />
          </p>
        </div>
      </div>

      {/* ====== FILTER BAR ====== */}
      <div className="doctor-list-page__filters">
        <div className="doctor-list-page__container">
          <div className="doctor-list-page__filter-row">
            {/* Search by name */}
            <div className="doctor-list-page__search-wrapper">
              <i className="fas fa-search doctor-list-page__search-icon" />
              <input
                type="text"
                className="doctor-list-page__search-input"
                placeholder={intl.formatMessage({ id: 'list-page.doctor.search-placeholder' })}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                id="doctor-search-input"
              />
              {searchTerm && (
                <button
                  className="doctor-list-page__search-clear"
                  onClick={() => setSearchTerm('')}
                >
                  <i className="fas fa-times" />
                </button>
              )}
            </div>

            {/* Specialty filter */}
            <div className="doctor-list-page__filter-select-wrapper">
              <select
                className="doctor-list-page__filter-select"
                value={selectedSpecialty}
                onChange={(e) => setSelectedSpecialty(e.target.value)}
                id="doctor-specialty-filter"
              >
                <option value="ALL">
                  {intl.formatMessage({ id: 'list-page.filter-all-specialties' })}
                </option>
                {specialties.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Province filter */}
            <div className="doctor-list-page__filter-select-wrapper">
              <select
                className="doctor-list-page__filter-select"
                value={selectedProvince}
                onChange={(e) => setSelectedProvince(e.target.value)}
                id="doctor-province-filter"
              >
                <option value="ALL">
                  {intl.formatMessage({ id: 'list-page.filter-all-provinces' })}
                </option>
                {provinces &&
                  provinces.map((p) => (
                    <option key={p.keyMap} value={p.keyMap}>
                      {language === LANGUAGES.VI ? p.valueVi : p.valueEn}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ====== GRID ====== */}
      <div className="doctor-list-page__body">
        <div className="doctor-list-page__container">
          <div className="doctor-list-page__results-info">
            <FormattedMessage
              id="list-page.results-count"
              values={{ count: filteredDoctors.length, total: doctors.length }}
            />
          </div>

          {filteredDoctors.length > 0 ? (
            <div className="doctor-list-page__grid">
              {filteredDoctors.map((doctor) => (
                <div
                  key={doctor.id}
                  className="doctor-list-page__card"
                  id={`doctor-list-card-${doctor.id}`}
                >
                  {/* Avatar section */}
                  <div className="doctor-list-page__card-avatar-section">
                    <div
                      className="doctor-list-page__card-avatar"
                      onClick={() => navigate(`/doctor/${doctor.id}`)}
                    >
                      <img
                        src={
                          doctor.image
                            ? CommonUtils.decodeBase64Image(doctor.image)
                            : ''
                        }
                        alt={getDoctorName(doctor)}
                      />
                    </div>
                  </div>

                  {/* Info section */}
                  <div className="doctor-list-page__card-info">
                    <h3
                      className="doctor-list-page__card-name"
                      onClick={() => navigate(`/doctor/${doctor.id}`)}
                    >
                      {getDoctorName(doctor)}
                    </h3>

                    <p className="doctor-list-page__card-specialty">
                      {doctor.doctorInfoData?.specialtyData?.name || ''}
                    </p>

                    {doctor.doctorInfoData?.clinicData?.name && (
                      <p className="doctor-list-page__card-clinic">
                        <i className="fas fa-hospital" />{' '}
                        {doctor.doctorInfoData.clinicData.name}
                      </p>
                    )}

                    {doctor.doctorInfoData?.description && (
                      <p className="doctor-list-page__card-desc">
                        {doctor.doctorInfoData.description}
                      </p>
                    )}

                    {/* Action buttons */}
                    <div className="doctor-list-page__card-actions">
                      <button
                        className="doctor-list-page__btn-detail"
                        onClick={() => navigate(`/doctor/${doctor.id}`)}
                      >
                        <i className="fas fa-calendar-check" />{' '}
                        <FormattedMessage id="list-page.doctor.btn-detail" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="doctor-list-page__empty">
              <div className="doctor-list-page__empty-icon">👨‍⚕️</div>
              <p>
                <FormattedMessage id="list-page.no-results" />
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DoctorList;
