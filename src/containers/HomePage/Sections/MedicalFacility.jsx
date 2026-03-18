// src/containers/HomePage/Sections/MedicalFacility.jsx
// Cơ sở y tế nổi bật carousel — SRS REQ-PT-004
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';
import Slider from 'react-slick';
import { getAllClinic } from '../../../services/clinicService';
import CommonUtils from '../../../utils/CommonUtils';
import './MedicalFacility.scss';

const MedicalFacility = () => {
  const navigate = useNavigate();
  const [clinics, setClinics] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await getAllClinic();
        if (res && res.errCode === 0 && res.data) {
          setClinics(res.data);
        }
      } catch (err) {
        console.error('Error fetching clinics:', err);
      }
    };
    fetchData();
  }, []);

  const settings = {
    dots: false,
    infinite: clinics.length > 4,
    speed: 500,
    slidesToShow: 4,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3500,
    responsive: [
      { breakpoint: 1200, settings: { slidesToShow: 3 } },
      { breakpoint: 768,  settings: { slidesToShow: 2 } },
      { breakpoint: 480,  settings: { slidesToShow: 1 } },
    ],
  };

  return (
    <div className="section-facility">
      <div className="section-content">
        <div className="section-header">
          <h2 className="section-title">
            <FormattedMessage id="homepage.medical-facility" />
          </h2>
          <button className="see-more-btn">
            <FormattedMessage id="homepage.see-more" />
          </button>
        </div>

        <Slider {...settings}>
          {clinics && clinics.length > 0 &&
            clinics.map((item) => (
              <div
                key={item.id}
                className="facility-card"
                onClick={() => navigate(`/clinic/${item.id}`)}
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

export default MedicalFacility;
