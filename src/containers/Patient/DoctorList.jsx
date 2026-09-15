// src/containers/Patient/DoctorList.jsx
// Trang tổng hợp danh sách Bác sĩ nổi bật & Bảng giá khám bệnh minh bạch
// ✅ Tích hợp Bảng chi phí khám, bộ lọc giá và chuyển đổi chế độ xem (Thẻ / Bảng giá)
// ✅ Hỗ trợ Breadcrumb chuẩn hóa navigation

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { FormattedMessage, useIntl } from 'react-intl';
import { getTopDoctors } from '../../services/doctorService';
import { getAllSpecialty } from '../../services/specialtyService';
import { fetchAllcodeByType } from '../../redux/slices/appSlice';
import { LANGUAGES, ALLCODE_TYPES } from '../../utils/constants';
import CommonUtils from '../../utils/CommonUtils';
import Breadcrumb from '../../components/Common/Breadcrumb';
import './DoctorList.scss';

// Parse price helper
const parsePrice = (priceStr) => {
  if (!priceStr) return 0;
  return parseInt(priceStr.replace(/\D/g, ''), 10) || 0;
};

const DoctorList = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const dispatch = useDispatch();
  const intl = useIntl();
  const language = useSelector((state) => state.app.language);
  const provinces = useSelector((state) => state.app.provinces);

  // View mode: 'grid' (thẻ) hoặc 'table' (bảng giá)
  const initialView = searchParams.get('view') === 'fee' ? 'table' : 'grid';
  const [viewMode, setViewMode] = useState(initialView);

  const [doctors, setDoctors] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('ALL');
  const [selectedProvince, setSelectedProvince] = useState('ALL');
  const [selectedPriceRange, setSelectedPriceRange] = useState('ALL');

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
        console.error('Error fetching doctors:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Display doctor name by language
  const getDoctorName = (doctor) => {
    if (language === LANGUAGES.VI) {
      return `${doctor.positionData?.valueVi || ''} ${doctor.lastName || ''} ${doctor.firstName || ''}`.trim();
    }
    return `${doctor.positionData?.valueEn || ''} ${doctor.firstName || ''} ${doctor.lastName || ''}`.trim();
  };

  const getPriceLabel = (doc) => {
    const pd = doc.doctorInfoData?.priceData;
    if (!pd) return '—';
    return language === LANGUAGES.VI ? (pd.valueVi || '—') : (pd.valueEn || '—');
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
      matchProvince = doc.doctorInfoData?.provinceId === selectedProvince;
    }

    let matchPrice = true;
    if (selectedPriceRange !== 'ALL') {
      const priceVi = doc.doctorInfoData?.priceData?.valueVi || '';
      const priceNum = parsePrice(priceVi);
      if (selectedPriceRange === 'LOW' && priceNum >= 300000) matchPrice = false;
      if (selectedPriceRange === 'HIGH' && priceNum < 300000) matchPrice = false;
    }

    return matchSearch && matchSpecialty && matchProvince && matchPrice;
  });

  // Switch view handler
  const handleViewChange = (mode) => {
    setViewMode(mode);
    if (mode === 'table') {
      setSearchParams({ view: 'fee' });
    } else {
      setSearchParams({});
    }
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
      {/* ====== BREADCRUMB ====== */}
      <Breadcrumb
        items={[
          {
            label: language === LANGUAGES.VI ? 'Bác sĩ & Bảng giá khám' : 'Doctors & Consultation Fees',
          },
        ]}
      />

      {/* ====== HERO ====== */}
      <div className="doctor-list-page__hero">
        <div className="doctor-list-page__hero-container">
          <div className="doctor-list-page__hero-badge">
            <i className="fas fa-stethoscope" />{' '}
            {language === LANGUAGES.VI ? 'Đặt lịch trực tuyến & Bảng giá công khai' : 'Online Booking & Transparent Pricing'}
          </div>
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
                  title="Xóa tìm kiếm"
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

            {/* Price filter */}
            <div className="doctor-list-page__filter-select-wrapper">
              <select
                className="doctor-list-page__filter-select"
                value={selectedPriceRange}
                onChange={(e) => setSelectedPriceRange(e.target.value)}
                id="doctor-price-filter"
              >
                <option value="ALL">
                  {language === LANGUAGES.VI ? 'Tất cả mức giá' : 'All Price Ranges'}
                </option>
                <option value="LOW">
                  {language === LANGUAGES.VI ? 'Dưới 300.000đ' : 'Under 300,000 VND'}
                </option>
                <option value="HIGH">
                  {language === LANGUAGES.VI ? 'Từ 300.000đ trở lên' : '300,000 VND & Above'}
                </option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ====== BODY & CONTROLS ====== */}
      <div className="doctor-list-page__body">
        <div className="doctor-list-page__container">
          {/* Controls row: Result count + View switch */}
          <div className="doctor-list-page__controls-row">
            <div className="doctor-list-page__results-info">
              <FormattedMessage
                id="list-page.results-count"
                values={{ count: filteredDoctors.length, total: doctors.length }}
              />
            </div>

            <div className="doctor-list-page__view-switch">
              <button
                className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => handleViewChange('grid')}
                title="Dạng thẻ"
              >
                <i className="fas fa-th-large" />{' '}
                <span>{language === LANGUAGES.VI ? 'Dạng thẻ' : 'Cards'}</span>
              </button>
              <button
                className={`view-btn ${viewMode === 'table' ? 'active' : ''}`}
                onClick={() => handleViewChange('table')}
                title="Bảng chi phí khám"
              >
                <i className="fas fa-table" />{' '}
                <span>{language === LANGUAGES.VI ? 'Bảng giá khám' : 'Fee Table'}</span>
              </button>
            </div>
          </div>

          {filteredDoctors.length > 0 ? (
            viewMode === 'grid' ? (
              /* ===== VIEW 1: GRID THẺ BÁC SĨ ===== */
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

                      {doctor.doctorInfoData?.specialtyData?.name && (
                        <p className="doctor-list-page__card-specialty">
                          <i className="fas fa-stethoscope" />{' '}
                          {doctor.doctorInfoData.specialtyData.name}
                        </p>
                      )}

                      {doctor.doctorInfoData?.clinicData?.name && (
                        <p className="doctor-list-page__card-clinic">
                          <i className="fas fa-hospital" />{' '}
                          <Link to={`/clinics/${doctor.doctorInfoData.clinicId}`}>
                            {doctor.doctorInfoData.clinicData.name}
                          </Link>
                        </p>
                      )}

                      {/* Consultation Fee Badge */}
                      <div className="doctor-list-page__card-price">
                        <span className="price-tag">
                          💰 {language === LANGUAGES.VI ? 'Phí khám: ' : 'Fee: '}
                          <strong>{getPriceLabel(doctor)}</strong>
                        </span>
                      </div>

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
              /* ===== VIEW 2: BẢNG GIÁ KHÁM BỆNH CÔNG KHAI ===== */
              <div className="doctor-list-page__table-wrapper">
                <table className="doctor-fee-table">
                  <thead>
                    <tr>
                      <th>{language === LANGUAGES.VI ? 'Bác sĩ' : 'Doctor'}</th>
                      <th>{language === LANGUAGES.VI ? 'Chuyên khoa' : 'Specialty'}</th>
                      <th>{language === LANGUAGES.VI ? 'Cơ sở y tế' : 'Clinic'}</th>
                      <th className="text-right">{language === LANGUAGES.VI ? 'Phí khám' : 'Fee'}</th>
                      <th className="text-center">{language === LANGUAGES.VI ? 'Thao tác' : 'Action'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDoctors.map((doc) => (
                      <tr key={doc.id}>
                        <td>
                          <div className="table-doctor-cell">
                            <img
                              src={doc.image ? CommonUtils.decodeBase64Image(doc.image) : ''}
                              alt={getDoctorName(doc)}
                              className="table-avatar"
                            />
                            <div>
                              <div
                                className="table-doctor-name"
                                onClick={() => navigate(`/doctor/${doc.id}`)}
                              >
                                {getDoctorName(doc)}
                              </div>
                              <span className="table-doctor-province">
                                📍 {language === LANGUAGES.VI
                                  ? doc.doctorInfoData?.provinceData?.valueVi || 'Toàn quốc'
                                  : doc.doctorInfoData?.provinceData?.valueEn || 'National'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="table-badge-specialty">
                            {doc.doctorInfoData?.specialtyData?.name || '—'}
                          </span>
                        </td>
                        <td>
                          {doc.doctorInfoData?.clinicData?.name ? (
                            <Link
                              to={`/clinics/${doc.doctorInfoData.clinicId}`}
                              className="table-clinic-link"
                            >
                              🏥 {doc.doctorInfoData.clinicData.name}
                            </Link>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="text-right">
                          <span className="table-price-highlight">
                            {getPriceLabel(doc)}
                          </span>
                        </td>
                        <td className="text-center">
                          <button
                            className="table-btn-book"
                            onClick={() => navigate(`/doctor/${doc.id}`)}
                          >
                            <i className="fas fa-calendar-alt" />{' '}
                            {language === LANGUAGES.VI ? 'Đặt khám' : 'Book'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
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
