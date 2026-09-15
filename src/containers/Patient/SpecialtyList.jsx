// src/containers/Patient/SpecialtyList.jsx
// Trang tổng hợp danh sách Chuyên khoa — Public
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { FormattedMessage, useIntl } from 'react-intl';
import { getAllSpecialty } from '../../services/specialtyService';
import { LANGUAGES } from '../../utils/constants';
import CommonUtils from '../../utils/CommonUtils';
import Breadcrumb from '../../components/Common/Breadcrumb';
import './SpecialtyList.scss';

const SpecialtyList = () => {
  const navigate = useNavigate();
  const intl = useIntl();
  const language = useSelector((state) => state.app.language);

  const [specialties, setSpecialties] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const res = await getAllSpecialty();
        if (res && res.errCode === 0 && res.data) {
          setSpecialties(res.data);
        }
      } catch (err) {
        /* silent */
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Client-side search filter
  const filteredSpecialties = specialties.filter((item) =>
    item.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Skeleton loading
  if (isLoading) {
    return (
      <div className="specialty-list-page">
        <div className="specialty-list-page__hero">
          <div className="specialty-list-page__hero-container">
            <h1 className="specialty-list-page__hero-title">
              <FormattedMessage id="list-page.specialty.title" />
            </h1>
            <p className="specialty-list-page__hero-subtitle">
              <FormattedMessage id="list-page.specialty.subtitle" />
            </p>
          </div>
        </div>
        <div className="specialty-list-page__body">
          <div className="specialty-list-page__container">
            <div className="specialty-list-page__grid">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="specialty-list-page__card skeleton-card">
                  <div className="skeleton-image" />
                  <div className="skeleton-text" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="specialty-list-page">
      {/* ====== BREADCRUMB ====== */}
      <Breadcrumb
        items={[
          {
            label: language === LANGUAGES.VI ? 'Danh sách chuyên khoa' : 'Specialties',
          },
        ]}
      />

      {/* ====== HERO SECTION ====== */}
      <div className="specialty-list-page__hero">
        <div className="specialty-list-page__hero-container">
          <h1 className="specialty-list-page__hero-title">
            <FormattedMessage id="list-page.specialty.title" />
          </h1>
          <p className="specialty-list-page__hero-subtitle">
            <FormattedMessage id="list-page.specialty.subtitle" />
          </p>
          {/* Search Bar */}
          <div className="specialty-list-page__search-wrapper">
            <i className="fas fa-search specialty-list-page__search-icon" />
            <input
              type="text"
              className="specialty-list-page__search-input"
              placeholder={intl.formatMessage({ id: 'list-page.specialty.search-placeholder' })}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              id="specialty-search-input"
            />
            {searchTerm && (
              <button
                className="specialty-list-page__search-clear"
                onClick={() => setSearchTerm('')}
                title="Clear"
              >
                <i className="fas fa-times" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ====== GRID BODY ====== */}
      <div className="specialty-list-page__body">
        <div className="specialty-list-page__container">
          {/* Results count */}
          <div className="specialty-list-page__results-info">
            <span>
              <FormattedMessage
                id="list-page.results-count"
                values={{ count: filteredSpecialties.length, total: specialties.length }}
              />
            </span>
          </div>

          {filteredSpecialties.length > 0 ? (
            <div className="specialty-list-page__grid">
              {filteredSpecialties.map((item) => (
                <div
                  key={item.id}
                  className="specialty-list-page__card"
                  onClick={() => navigate(`/specialty/${item.id}`)}
                  id={`specialty-card-${item.id}`}
                >
                  <div className="specialty-list-page__card-image-wrapper">
                    <div
                      className="specialty-list-page__card-image"
                      style={{
                        backgroundImage: `url(${
                          item.image
                            ? CommonUtils.decodeBase64Image(item.image)
                            : ''
                        })`,
                      }}
                    />
                  </div>
                  <div className="specialty-list-page__card-info">
                    <h3 className="specialty-list-page__card-name">{item.name}</h3>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="specialty-list-page__empty">
              <div className="specialty-list-page__empty-icon">🔍</div>
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

export default SpecialtyList;
