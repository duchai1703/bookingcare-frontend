// src/components/Common/HeroBannerSlider.jsx
// [UX 6.1] Hero Banner Carousel cho Chuyên khoa & Cơ sở y tế
import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import './HeroBannerSlider.scss';

const HeroBannerSlider = ({
  slides = [],
  title = '',
  address = '',
  description = '',
  stats = [],
  autoPlayInterval = 5500,
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const autoPlayRef = useRef(null);

  const totalSlides = slides.length;

  useEffect(() => {
    if (totalSlides <= 1 || isHovered) {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
      return;
    }

    autoPlayRef.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % totalSlides);
    }, autoPlayInterval);

    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [totalSlides, isHovered, autoPlayInterval]);

  const handlePrev = (e) => {
    e.stopPropagation();
    setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
  };

  const handleNext = (e) => {
    e.stopPropagation();
    setCurrentSlide((prev) => (prev + 1) % totalSlides);
  };

  const goToSlide = (idx) => {
    setCurrentSlide(idx);
  };

  if (!slides || slides.length === 0) return null;

  return (
    <div
      className="hero-banner-slider"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Slides Container */}
      <div className="hero-banner-slider__track">
        {slides.map((slide, index) => {
          const isActive = index === currentSlide;
          const bgUrl = typeof slide === 'string' ? slide : slide.image;
          const slideCaption = typeof slide === 'object' ? slide.caption : null;

          return (
            <div
              key={index}
              className={`hero-banner-slider__slide ${isActive ? 'is-active' : ''}`}
              style={{ backgroundImage: `url(${bgUrl})` }}
            >
              <div className="hero-banner-slider__overlay">
                <div className="hero-banner-slider__content">
                  {slideCaption && (
                    <span className="hero-banner-slider__caption-tag">
                      <i className="fas fa-camera" /> {slideCaption}
                    </span>
                  )}
                  <h1 className="hero-banner-slider__title">{title}</h1>

                  {address && (
                    <p className="hero-banner-slider__address">
                      <i className="fas fa-map-marker-alt" /> {address}
                    </p>
                  )}

                  {description && (
                    <p className="hero-banner-slider__desc">{description}</p>
                  )}

                  {stats && stats.length > 0 && (
                    <div className="hero-banner-slider__stats">
                      {stats.map((st, sIdx) => (
                        <span key={sIdx} className="hero-stat-pill">
                          {st.icon && <i className={st.icon} />}
                          <span>{st.label}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Navigation Arrows */}
      {totalSlides > 1 && (
        <>
          <button
            type="button"
            className="hero-banner-slider__nav hero-banner-slider__nav--prev"
            onClick={handlePrev}
            aria-label="Slide trước"
          >
            <i className="fas fa-chevron-left" />
          </button>
          <button
            type="button"
            className="hero-banner-slider__nav hero-banner-slider__nav--next"
            onClick={handleNext}
            aria-label="Slide tiếp theo"
          >
            <i className="fas fa-chevron-right" />
          </button>
        </>
      )}

      {/* Dots Indicator */}
      {totalSlides > 1 && (
        <div className="hero-banner-slider__dots">
          {slides.map((_, dotIdx) => (
            <button
              key={dotIdx}
              type="button"
              className={`hero-banner-slider__dot ${dotIdx === currentSlide ? 'is-active' : ''}`}
              onClick={() => goToSlide(dotIdx)}
              aria-label={`Đi tới slide ${dotIdx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

HeroBannerSlider.propTypes = {
  slides: PropTypes.array.isRequired,
  title: PropTypes.string,
  address: PropTypes.string,
  description: PropTypes.string,
  stats: PropTypes.arrayOf(
    PropTypes.shape({
      icon: PropTypes.string,
      label: PropTypes.node,
    })
  ),
  autoPlayInterval: PropTypes.number,
};

export default HeroBannerSlider;
