// src/containers/HomePage/Sections/Banner.jsx
// Banner section — Gradient + Search bar with debounce — SRS REQ-PT-001, 002
import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { FormattedMessage } from 'react-intl';
import { debounce } from 'lodash';
import { searchApi } from '../../../services/userService';
import { LANGUAGES } from '../../../utils/constants';
import './Banner.scss';

const Banner = () => {
  const navigate = useNavigate();
  const language = useSelector((state) => state.app.language);

  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Debounce search — 300ms
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSearch = useCallback(
    debounce(async (keyword) => {
      if (!keyword || keyword.trim().length < 2) {
        setSearchResults(null);
        setShowDropdown(false);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      try {
        const res = await searchApi(keyword);
        if (res && res.errCode === 0) {
          setSearchResults(res.data);
          setShowDropdown(true);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300),
    []
  );

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    debouncedSearch(value);
  };

  // Đóng dropdown khi click ra ngoài
  const handleBlur = () => {
    setTimeout(() => setShowDropdown(false), 200);
  };

  return (
    <div className="banner-container">
      <div className="banner-overlay" />
      <div className="banner-content">
        {/* Title */}
        <h1 className="banner-title">
          <FormattedMessage id="banner.title-line1" />
          <br />
          <FormattedMessage id="banner.title-line2" />
        </h1>

        {/* Search bar */}
        <div className="search-wrapper">
          <div className="search-box">
            <i className="fas fa-search search-icon" />
            <FormattedMessage id="banner.search-placeholder">
              {(placeholder) => (
                <input
                  type="text"
                  className="search-input"
                  placeholder={placeholder}
                  value={searchTerm}
                  onChange={handleSearchChange}
                  onBlur={handleBlur}
                  onFocus={() => searchResults && setShowDropdown(true)}
                />
              )}
            </FormattedMessage>
            {isSearching && <i className="fas fa-spinner fa-spin search-spinner" />}
          </div>

          {/* Search dropdown results */}
          {showDropdown && searchResults && (
            <div className="search-dropdown">
              {/* Bác sĩ */}
              {searchResults.doctors && searchResults.doctors.length > 0 && (
                <div className="search-group">
                  <h4 className="group-title">
                    <i className="fas fa-user-md" /> Bác sĩ
                  </h4>
                  {searchResults.doctors.map((item) => (
                    <div
                      key={`doc-${item.id}`}
                      className="search-item"
                      onClick={() => navigate(`/doctor/${item.id}`)}
                    >
                      {language === LANGUAGES.VI
                        ? `${item.lastName} ${item.firstName}`
                        : `${item.firstName} ${item.lastName}`}
                    </div>
                  ))}
                </div>
              )}

              {/* Chuyên khoa */}
              {searchResults.specialties && searchResults.specialties.length > 0 && (
                <div className="search-group">
                  <h4 className="group-title">
                    <i className="fas fa-stethoscope" /> Chuyên khoa
                  </h4>
                  {searchResults.specialties.map((item) => (
                    <div
                      key={`spec-${item.id}`}
                      className="search-item"
                      onClick={() => navigate(`/specialty/${item.id}`)}
                    >
                      {item.name}
                    </div>
                  ))}
                </div>
              )}

              {/* Phòng khám */}
              {searchResults.clinics && searchResults.clinics.length > 0 && (
                <div className="search-group">
                  <h4 className="group-title">
                    <i className="fas fa-hospital" /> Phòng khám
                  </h4>
                  {searchResults.clinics.map((item) => (
                    <div
                      key={`cli-${item.id}`}
                      className="search-item"
                      onClick={() => navigate(`/clinic/${item.id}`)}
                    >
                      {item.name}
                    </div>
                  ))}
                </div>
              )}

              {/* No results */}
              {(!searchResults.doctors || searchResults.doctors.length === 0) &&
                (!searchResults.specialties || searchResults.specialties.length === 0) &&
                (!searchResults.clinics || searchResults.clinics.length === 0) && (
                  <div className="no-results">Không tìm thấy kết quả</div>
                )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Banner;
