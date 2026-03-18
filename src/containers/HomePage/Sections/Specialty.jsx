// src/containers/HomePage/Sections/Specialty.jsx
// Chuyên khoa phổ biến carousel — SRS REQ-PT-005
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';
import Slider from 'react-slick';
import { getAllSpecialty } from '../../../services/specialtyService';
import CommonUtils from '../../../utils/CommonUtils';
import './Specialty.scss';

const Specialty = () => {
  const navigate = useNavigate();
  const [specialties, setSpecialties] = useState([]);

  // Fetch chuyên khoa từ API
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await getAllSpecialty();
        if (res && res.errCode === 0 && res.data) {
          setSpecialties(res.data);
        }
      } catch (err) {
        console.error('Error fetching specialties:', err);
      }
    };
    fetchData();
  }, []);

  // Cấu hình react-slick — responsive 4 → 3 → 2 → 1
  const settings = {
    dots: false,
    infinite: specialties.length > 4,
    speed: 500,
    slidesToShow: 4,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3000,
    responsive: [
      { breakpoint: 1200, settings: { slidesToShow: 3 } },
      { breakpoint: 768,  settings: { slidesToShow: 2 } },
      { breakpoint: 480,  settings: { slidesToShow: 1 } },
    ],
  };

  return (
    <div className="section-specialty">
      <div className="section-content">
        {/* Title + See more */}
        <div className="section-header">
          <h2 className="section-title">
            <FormattedMessage id="homepage.specialty-popular" />
          </h2>
          <button className="see-more-btn">
            <FormattedMessage id="homepage.see-more" />
          </button>
        </div>

        {/* Carousel */}
        <Slider {...settings}>
          {specialties && specialties.length > 0 &&
            specialties.map((item) => (
              <div
                key={item.id}
                className="specialty-card"
                onClick={() => navigate(`/specialty/${item.id}`)}
              >
                <div
                  className="card-image"
                  style={{
                    backgroundImage: `url(${
                      item.image
                        ? CommonUtils.decodeBase64Image(item.image)
                        : ''
                    })`,
                  }}
                />
                <h3 className="card-name">{item.name}</h3>
              </div>
            ))}
        </Slider>
      </div>
    </div>
  );
};

export default Specialty;
