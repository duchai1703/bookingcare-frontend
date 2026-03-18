// src/containers/HomePage/Sections/TopDoctor.jsx
// Bác sĩ nổi bật carousel — SRS REQ-PT-003
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { FormattedMessage } from 'react-intl';
import Slider from 'react-slick';
import { fetchTopDoctors } from '../../../redux/slices/adminSlice';
import { LANGUAGES } from '../../../utils/constants';
import CommonUtils from '../../../utils/CommonUtils';
import './TopDoctor.scss';

const TopDoctor = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const language = useSelector((state) => state.app.language);
  const { topDoctors } = useSelector((state) => state.admin);

  // Fetch top 10 doctors từ Redux thunk
  useEffect(() => {
    dispatch(fetchTopDoctors(10));
  }, [dispatch]);

  const settings = {
    dots: false,
    infinite: topDoctors.length > 4,
    speed: 500,
    slidesToShow: 4,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 4000,
    responsive: [
      { breakpoint: 1200, settings: { slidesToShow: 3 } },
      { breakpoint: 768,  settings: { slidesToShow: 2 } },
      { breakpoint: 480,  settings: { slidesToShow: 1 } },
    ],
  };

  // Hiển thị tên theo ngôn ngữ
  const getNameByLanguage = (doctor) => {
    if (language === LANGUAGES.VI) {
      return `${doctor.positionData?.valueVi || ''} ${doctor.lastName} ${doctor.firstName}`;
    }
    return `${doctor.positionData?.valueEn || ''} ${doctor.firstName} ${doctor.lastName}`;
  };

  return (
    <div className="section-top-doctor">
      <div className="section-content">
        <div className="section-header">
          <h2 className="section-title">
            <FormattedMessage id="homepage.outstanding-doctor" />
          </h2>
          <button className="see-more-btn">
            <FormattedMessage id="homepage.see-more" />
          </button>
        </div>

        <Slider {...settings}>
          {topDoctors && topDoctors.length > 0 &&
            topDoctors.map((doctor) => (
              <div
                key={doctor.id}
                className="doctor-card"
                onClick={() => navigate(`/doctor/${doctor.id}`)}
              >
                <div className="card-avatar">
                  <img
                    src={
                      doctor.image
                        ? CommonUtils.decodeBase64Image(doctor.image)
                        : ''
                    }
                    alt={doctor.firstName}
                  />
                </div>
                <div className="card-info">
                  <h3 className="doctor-name">{getNameByLanguage(doctor)}</h3>
                  <p className="doctor-specialty">
                    {doctor.Doctor_Info?.specialtyData?.name || ''}
                  </p>
                </div>
              </div>
            ))}
        </Slider>
      </div>
    </div>
  );
};

export default TopDoctor;
