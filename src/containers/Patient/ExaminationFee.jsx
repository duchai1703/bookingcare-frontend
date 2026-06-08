// src/containers/Patient/ExaminationFee.jsx
// Trang Bảng Giá Dịch Vụ Khám Bệnh — Public
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { FormattedMessage, useIntl } from 'react-intl';
import { getTopDoctors } from '../../services/doctorService';
import { getAllSpecialty } from '../../services/specialtyService';
import { LANGUAGES } from '../../utils/constants';
import CommonUtils from '../../utils/CommonUtils';
import './ExaminationFee.scss';

// ─── Helpers ──────────────────────────────────────────────────────────────────
// Extract a comparable integer from Vietnamese price strings like "200.000đ"
const parsePrice = (priceStr) => {
  if (!priceStr) return 0;
  return parseInt(priceStr.replace(/\D/g, ''), 10) || 0;
};

// Price-range thresholds (match filter option values)
const PRICE_LOW  = 'LOW';   // < 300 000
const PRICE_HIGH = 'HIGH';  // >= 300 000

// ─── Skeleton rows ─────────────────────────────────────────────────────────────
const SkeletonRow = () => (
  <div className="fee-page__skeleton-row">
    <div className="fee-page__skeleton-avatar" />
    <div className="fee-page__skeleton-info">
      <div className="fee-page__skeleton-text fee-page__skeleton-text--long"   />
      <div className="fee-page__skeleton-text fee-page__skeleton-text--medium" />
    </div>
    <div className="fee-page__skeleton-text fee-page__skeleton-text--short"  />
    <div className="fee-page__skeleton-text fee-page__skeleton-text--short"  />
    <div className="fee-page__skeleton-price" />
    <div className="fee-page__skeleton-btn"   />
  </div>
);

// ─── Main component ────────────────────────────────────────────────────────────
const ExaminationFee = () => {
  const navigate  = useNavigate();
  const intl      = useIntl();
  const language  = useSelector((state) => state.app.language);

  const [doctors,     setDoctors]     = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [isLoading,   setIsLoading]   = useState(true);

  // Filters
  const [searchTerm,         setSearchTerm]         = useState('');
  const [selectedSpecialty,  setSelectedSpecialty]  = useState('ALL');
  const [selectedPriceRange, setSelectedPriceRange] = useState('ALL');

  // ── Fetch data ────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [docRes, specRes] = await Promise.all([
          getTopDoctors(50),
          getAllSpecialty(),
        ]);
        if (docRes?.errCode === 0 && docRes.data)    setDoctors(docRes.data);
        if (specRes?.errCode === 0 && specRes.data)  setSpecialties(specRes.data);
      } catch (_) { /* silent */ }
      finally     { setIsLoading(false); }
    };
    fetchData();
  }, []);

  // ── Derived helpers ───────────────────────────────────────────────────────
  const getDoctorName = (doc) => {
    const pos = doc.positionData;
    if (language === LANGUAGES.VI) {
      return `${pos?.valueVi || ''} ${doc.lastName || ''} ${doc.firstName || ''}`.trim();
    }
    return `${pos?.valueEn || ''} ${doc.firstName || ''} ${doc.lastName || ''}`.trim();
  };

  const getPriceLabel = (doc) => {
    const pd = doc.doctorInfoData?.priceData;
    if (!pd) return '—';
    return language === LANGUAGES.VI ? (pd.valueVi || '—') : (pd.valueEn || '—');
  };

  // ── Client-side filtering ─────────────────────────────────────────────────
  const filtered = doctors.filter((doc) => {
    const name = getDoctorName(doc).toLowerCase();
    if (!name.includes(searchTerm.toLowerCase())) return false;

    if (selectedSpecialty !== 'ALL') {
      if (String(doc.doctorInfoData?.specialtyId) !== String(selectedSpecialty)) return false;
    }

    if (selectedPriceRange !== 'ALL') {
      const priceVi  = doc.doctorInfoData?.priceData?.valueVi || '';
      const priceNum = parsePrice(priceVi);
      if (selectedPriceRange === PRICE_LOW  && priceNum >= 300000) return false;
      if (selectedPriceRange === PRICE_HIGH && priceNum  < 300000) return false;
    }

    return true;
  });

  // ── Render skeleton ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="fee-page">
        {/* Hero */}
        <div className="fee-page__hero">
          <div className="fee-page__hero-inner">
            <h1 className="fee-page__hero-title">
              <FormattedMessage id="list-page.fee.title" />
            </h1>
            <p className="fee-page__hero-subtitle">
              <FormattedMessage id="list-page.fee.subtitle" />
            </p>
          </div>
        </div>

        {/* Skeleton body */}
        <div className="fee-page__body">
          <div className="fee-page__container">
            <div className="fee-page__table-wrap">
              {[1,2,3,4,5,6].map(i => <SkeletonRow key={i} />)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <div className="fee-page">

      {/* ====== HERO ====== */}
      <div className="fee-page__hero">
        <div className="fee-page__hero-inner">
          <div className="fee-page__hero-badge">
            <i className="fas fa-coins" />
            <span><FormattedMessage id="header.fee" /></span>
          </div>
          <h1 className="fee-page__hero-title">
            <FormattedMessage id="list-page.fee.title" />
          </h1>
          <p className="fee-page__hero-subtitle">
            <FormattedMessage id="list-page.fee.subtitle" />
          </p>

          {/* Stats strip */}
          <div className="fee-page__hero-stats">
            <div className="fee-page__stat">
              <span className="fee-page__stat-num">{doctors.length}+</span>
              <span className="fee-page__stat-lbl">
                {language === LANGUAGES.VI ? 'Bác sĩ' : 'Doctors'}
              </span>
            </div>
            <div className="fee-page__stat-divider" />
            <div className="fee-page__stat">
              <span className="fee-page__stat-num">{specialties.length}</span>
              <span className="fee-page__stat-lbl">
                {language === LANGUAGES.VI ? 'Chuyên khoa' : 'Specialties'}
              </span>
            </div>
            <div className="fee-page__stat-divider" />
            <div className="fee-page__stat">
              <span className="fee-page__stat-num">100%</span>
              <span className="fee-page__stat-lbl">
                {language === LANGUAGES.VI ? 'Công khai' : 'Transparent'}
              </span>
            </div>
          </div>
        </div>

        {/* Decorative blobs */}
        <div className="fee-page__hero-blob fee-page__hero-blob--1" />
        <div className="fee-page__hero-blob fee-page__hero-blob--2" />
        <div className="fee-page__hero-blob fee-page__hero-blob--3" />
      </div>

      {/* ====== FILTER BAR ====== */}
      <div className="fee-page__filters">
        <div className="fee-page__container">
          <div className="fee-page__filter-row">

            {/* Search */}
            <div className="fee-page__search-wrap">
              <i className="fas fa-search fee-page__search-icon" />
              <input
                id="fee-search-input"
                type="text"
                className="fee-page__search-input"
                placeholder={intl.formatMessage({ id: 'list-page.fee.search-placeholder' })}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button className="fee-page__search-clear" onClick={() => setSearchTerm('')}>
                  <i className="fas fa-times" />
                </button>
              )}
            </div>

            {/* Specialty filter */}
            <div className="fee-page__select-wrap">
              <i className="fas fa-stethoscope fee-page__select-icon" />
              <select
                id="fee-specialty-filter"
                className="fee-page__select"
                value={selectedSpecialty}
                onChange={(e) => setSelectedSpecialty(e.target.value)}
              >
                <option value="ALL">
                  {intl.formatMessage({ id: 'list-page.filter-all-specialties' })}
                </option>
                {specialties.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Price range filter */}
            <div className="fee-page__select-wrap">
              <i className="fas fa-tag fee-page__select-icon" />
              <select
                id="fee-price-filter"
                className="fee-page__select"
                value={selectedPriceRange}
                onChange={(e) => setSelectedPriceRange(e.target.value)}
              >
                <option value="ALL">
                  {intl.formatMessage({ id: 'list-page.fee.filter-price-all' })}
                </option>
                <option value={PRICE_LOW}>
                  {intl.formatMessage({ id: 'list-page.fee.filter-price-low' })}
                </option>
                <option value={PRICE_HIGH}>
                  {intl.formatMessage({ id: 'list-page.fee.filter-price-high' })}
                </option>
              </select>
            </div>

          </div>

          {/* Result count */}
          <div className="fee-page__result-count">
            <i className="fas fa-list-ul" />
            <FormattedMessage
              id="list-page.results-count"
              values={{ count: filtered.length, total: doctors.length }}
            />
          </div>
        </div>
      </div>

      {/* ====== TABLE BODY ====== */}
      <div className="fee-page__body">
        <div className="fee-page__container">
          {filtered.length > 0 ? (
            <div className="fee-page__table-wrap">

              {/* Table header */}
              <div className="fee-page__table-head">
                <div className="fee-page__th fee-page__th--doctor">
                  <FormattedMessage id="list-page.fee.table-doctor" />
                </div>
                <div className="fee-page__th fee-page__th--specialty">
                  <FormattedMessage id="list-page.fee.table-specialty" />
                </div>
                <div className="fee-page__th fee-page__th--clinic">
                  <FormattedMessage id="list-page.fee.table-clinic" />
                </div>
                <div className="fee-page__th fee-page__th--price">
                  <FormattedMessage id="list-page.fee.table-price" />
                </div>
                <div className="fee-page__th fee-page__th--action">
                  <FormattedMessage id="list-page.fee.table-action" />
                </div>
              </div>

              {/* Rows */}
              {filtered.map((doc) => {
                const priceLabel = getPriceLabel(doc);
                const priceNum   = parsePrice(doc.doctorInfoData?.priceData?.valueVi || '');
                const priceTier  = priceNum >= 300000 ? 'high' : (priceNum > 0 ? 'mid' : 'none');

                return (
                  <div
                    key={doc.id}
                    id={`fee-row-doctor-${doc.id}`}
                    className="fee-page__row"
                    onClick={() => navigate(`/doctor/${doc.id}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && navigate(`/doctor/${doc.id}`)}
                  >
                    {/* Doctor cell */}
                    <div className="fee-page__cell fee-page__cell--doctor">
                      <div className="fee-page__avatar-wrap">
                        <img
                          className="fee-page__avatar"
                          src={doc.image ? CommonUtils.decodeBase64Image(doc.image) : ''}
                          alt={getDoctorName(doc)}
                        />
                        <div className="fee-page__avatar-ring" />
                      </div>
                      <div className="fee-page__doctor-meta">
                        <span className="fee-page__doctor-name">{getDoctorName(doc)}</span>
                        {doc.positionData?.valueVi && (
                          <span className="fee-page__doctor-position">
                            {language === LANGUAGES.VI
                              ? doc.positionData.valueVi
                              : doc.positionData.valueEn}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Specialty cell */}
                    <div className="fee-page__cell fee-page__cell--specialty">
                      <span className="fee-page__specialty-pill">
                        {doc.doctorInfoData?.specialtyData?.name || '—'}
                      </span>
                    </div>

                    {/* Clinic cell */}
                    <div className="fee-page__cell fee-page__cell--clinic">
                      {doc.doctorInfoData?.clinicData?.name ? (
                        <>
                          <i className="fas fa-hospital-alt fee-page__clinic-icon" />
                          <span>{doc.doctorInfoData.clinicData.name}</span>
                        </>
                      ) : (
                        <span className="fee-page__dash">—</span>
                      )}
                    </div>

                    {/* Price cell */}
                    <div className="fee-page__cell fee-page__cell--price">
                      <div className={`fee-page__price-badge fee-page__price-badge--${priceTier}`}>
                        <i className="fas fa-coins" />
                        <span>{priceLabel}</span>
                      </div>
                    </div>

                    {/* Action cell */}
                    <div className="fee-page__cell fee-page__cell--action">
                      <button
                        className="fee-page__book-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/doctor/${doc.id}`);
                        }}
                      >
                        <i className="fas fa-calendar-check" />
                        <span><FormattedMessage id="list-page.fee.book-now" /></span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="fee-page__empty">
              <div className="fee-page__empty-icon">💊</div>
              <p><FormattedMessage id="list-page.fee.no-results" /></p>
              <button
                className="fee-page__reset-btn"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedSpecialty('ALL');
                  setSelectedPriceRange('ALL');
                }}
              >
                <i className="fas fa-redo" />
                {language === LANGUAGES.VI ? ' Xoá bộ lọc' : ' Clear filters'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExaminationFee;
