// src/containers/Patient/ClinicList.jsx
// Trang tổng hợp danh sách Cơ sở y tế — Public
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { FormattedMessage, useIntl } from 'react-intl';
import { getAllClinic } from '../../services/clinicService';
import { fetchAllcodeByType } from '../../redux/slices/appSlice';
import { LANGUAGES, ALLCODE_TYPES } from '../../utils/constants';
import CommonUtils from '../../utils/CommonUtils';
import './ClinicList.scss';

const ClinicList = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const intl = useIntl();
  const language = useSelector((state) => state.app.language);
  const provinces = useSelector((state) => state.app.provinces);

  const [clinics, setClinics] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
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
        const res = await getAllClinic();
        if (res && res.errCode === 0 && res.data) {
          setClinics(res.data);
        }
      } catch (err) {
        /* silent */
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Client-side filtering by search term and province
  const filteredClinics = clinics.filter((item) => {
    const matchSearch =
      item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.address?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Province filter — match by address containing province name or common abbreviations
    let matchProvince = true;
    if (selectedProvince !== 'ALL' && provinces?.length > 0) {
      const province = provinces.find((p) => p.keyMap === selectedProvince);
      if (province) {
        const addr = (item.address || '').toLowerCase();
        if (selectedProvince === 'PRO1') { // Hà Nội
          matchProvince = addr.includes('hà nội') || addr.includes('hanoi');
        } else if (selectedProvince === 'PRO2') { // TP. Hồ Chí Minh
          matchProvince = addr.includes('hồ chí minh') || addr.includes('ho chi minh') || addr.includes('hcm') || addr.includes('sài gòn') || addr.includes('saigon');
        } else if (selectedProvince === 'PRO3') { // Đà Nẵng
          matchProvince = addr.includes('đà nẵng') || addr.includes('da nang');
        } else if (selectedProvince === 'PRO4') { // Cần Thơ
          matchProvince = addr.includes('cần thơ') || addr.includes('can tho');
        } else if (selectedProvince === 'PRO5') { // Hải Phòng
          matchProvince = addr.includes('hải phòng') || addr.includes('hai phong');
        } else if (selectedProvince === 'PRO6') { // Huế
          matchProvince = addr.includes('huế') || addr.includes('hue');
        } else {
          const provName = language === LANGUAGES.VI ? province.valueVi : province.valueEn;
          matchProvince = addr.includes(provName.toLowerCase());
        }
      }
    }
    return matchSearch && matchProvince;
  });

  // Skeleton loading
  if (isLoading) {
    return (
      <div className="clinic-list-page">
        <div className="clinic-list-page__hero">
          <div className="clinic-list-page__hero-container">
            <h1 className="clinic-list-page__hero-title">
              <FormattedMessage id="list-page.clinic.title" />
            </h1>
            <p className="clinic-list-page__hero-subtitle">
              <FormattedMessage id="list-page.clinic.subtitle" />
            </p>
          </div>
        </div>
        <div className="clinic-list-page__body">
          <div className="clinic-list-page__container">
            <div className="clinic-list-page__grid">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="clinic-list-page__card skeleton-card">
                  <div className="skeleton-image" />
                  <div className="skeleton-info">
                    <div className="skeleton-text skeleton-text--long" />
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
    <div className="clinic-list-page">
      {/* ====== HERO SECTION ====== */}
      <div className="clinic-list-page__hero">
        <div className="clinic-list-page__hero-container">
          <h1 className="clinic-list-page__hero-title">
            <FormattedMessage id="list-page.clinic.title" />
          </h1>
          <p className="clinic-list-page__hero-subtitle">
            <FormattedMessage id="list-page.clinic.subtitle" />
          </p>
        </div>
      </div>

      {/* ====== FILTER BAR ====== */}
      <div className="clinic-list-page__filters">
        <div className="clinic-list-page__container">
          <div className="clinic-list-page__filter-row">
            {/* Search input */}
            <div className="clinic-list-page__search-wrapper">
              <i className="fas fa-search clinic-list-page__search-icon" />
              <input
                type="text"
                className="clinic-list-page__search-input"
                placeholder={intl.formatMessage({ id: 'list-page.clinic.search-placeholder' })}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                id="clinic-search-input"
              />
              {searchTerm && (
                <button
                  className="clinic-list-page__search-clear"
                  onClick={() => setSearchTerm('')}
                >
                  <i className="fas fa-times" />
                </button>
              )}
            </div>

            {/* Province dropdown */}
            <div className="clinic-list-page__filter-select-wrapper">
              <i className="fas fa-map-marker-alt clinic-list-page__filter-icon" />
              <select
                className="clinic-list-page__filter-select"
                value={selectedProvince}
                onChange={(e) => setSelectedProvince(e.target.value)}
                id="clinic-province-filter"
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

      {/* ====== GRID BODY ====== */}
      <div className="clinic-list-page__body">
        <div className="clinic-list-page__container">
          <div className="clinic-list-page__results-info">
            <FormattedMessage
              id="list-page.results-count"
              values={{ count: filteredClinics.length, total: clinics.length }}
            />
          </div>

          {filteredClinics.length > 0 ? (
            <div className="clinic-list-page__grid">
              {filteredClinics.map((item) => (
                <div
                  key={item.id}
                  className="clinic-list-page__card"
                  onClick={() => navigate(`/clinic/${item.id}`)}
                  id={`clinic-card-${item.id}`}
                >
                  <div className="clinic-list-page__card-image-wrapper">
                    <div
                      className="clinic-list-page__card-image"
                      style={{
                        backgroundImage: `url(${
                          item.image
                            ? CommonUtils.decodeBase64Image(item.image)
                            : ''
                        })`,
                      }}
                    />
                  </div>
                  <div className="clinic-list-page__card-info">
                    <h3 className="clinic-list-page__card-name">{item.name}</h3>
                    {item.address && (
                      <p className="clinic-list-page__card-address">
                        <i className="fas fa-map-marker-alt" /> {item.address}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="clinic-list-page__empty">
              <div className="clinic-list-page__empty-icon">🏥</div>
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

export default ClinicList;
