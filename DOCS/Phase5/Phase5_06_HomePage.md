# 🏠 BƯỚC 6 — TRANG CHỦ (HOMEPAGE)

> **Mục tiêu:** Xây dựng trang chủ hoàn chỉnh: Banner + Search, Chuyên khoa, Phòng khám, Bác sĩ nổi bật  
> **Thời gian:** Ngày 5-8  
> **SRS liên quan:** REQ-PT-001 (carousel), REQ-PT-002 (search), REQ-PT-003 (top doctor), REQ-PT-004 (clinic), REQ-PT-005 (specialty)

---

## 6.1 HomePage Container — `src/containers/HomePage/HomePage.jsx`

```jsx
// src/containers/HomePage/HomePage.jsx
import React from 'react';
import Header from '../../components/Header/Header';
import Footer from '../../components/Footer/Footer';
import Banner from './Sections/Banner';
import Specialty from './Sections/Specialty';
import MedicalFacility from './Sections/MedicalFacility';
import TopDoctor from './Sections/TopDoctor';
import './HomePage.scss';

const HomePage = () => {
  return (
    <div className="homepage-container">
      <Header />

      {/* Section 1: Banner + Search */}
      <Banner />

      {/* Section 2: Chuyên khoa phổ biến — REQ-PT-005 */}
      <Specialty />

      {/* Section 3: Cơ sở y tế nổi bật — REQ-PT-004 */}
      <MedicalFacility />

      {/* Section 4: Bác sĩ nổi bật — REQ-PT-003 */}
      <TopDoctor />

      <Footer />
    </div>
  );
};

export default HomePage;
```

```scss
// src/containers/HomePage/HomePage.scss
.homepage-container {
  width: 100%;
}
```

---

## 6.2 Banner + Search — `src/containers/HomePage/Sections/Banner.jsx`

```jsx
// src/containers/HomePage/Sections/Banner.jsx
// REQ-PT-001: Carousel/banner, REQ-PT-002: Thanh tìm kiếm
import React, { useState } from 'react';
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';
import { searchApi } from '../../../services/userService';
import { useSelector } from 'react-redux';
import { LANGUAGE } from '../../../utils/constants';
import { debounce } from 'lodash';
import './Banner.scss';

const Banner = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const language = useSelector((state) => state.app.language);
  const [searchResults, setSearchResults] = useState(null);
  const [showResults, setShowResults] = useState(false);

  // Debounce search (chờ 300ms sau khi user ngừng gõ mới gọi API)
  const handleSearch = debounce(async (keyword) => {
    if (!keyword || keyword.trim().length < 2) {
      setSearchResults(null);
      setShowResults(false);
      return;
    }
    try {
      const res = await searchApi(keyword);
      if (res && res.errCode === 0) {
        setSearchResults(res.data);
        setShowResults(true);
      }
    } catch (err) {
      console.error('Search error:', err);
    }
  }, 300);

  // Click vào kết quả tìm kiếm
  const handleClickResult = (type, id) => {
    setShowResults(false);
    if (type === 'doctor') navigate(`/doctor/${id}`);
    if (type === 'specialty') navigate(`/specialty/${id}`);
    if (type === 'clinic') navigate(`/clinic/${id}`);
  };

  return (
    <div className="banner-container">
      <div className="banner-overlay">
        <div className="banner-content">
          <h1 className="banner-title">
            {intl.formatMessage({ id: 'banner.title1' })}
            <br />
            <span>{intl.formatMessage({ id: 'banner.title2' })}</span>
          </h1>

          {/* Thanh tìm kiếm — REQ-PT-002 */}
          <div className="search-wrapper">
            <div className="search-box">
              <i className="fas fa-search search-icon"></i>
              <input
                type="text"
                className="search-input"
                placeholder={intl.formatMessage({ id: 'banner.search-placeholder' })}
                onChange={(e) => handleSearch(e.target.value)}
                onFocus={() => searchResults && setShowResults(true)}
                onBlur={() => setTimeout(() => setShowResults(false), 200)}
              />
            </div>

            {/* Dropdown kết quả tìm kiếm */}
            {showResults && searchResults && (
              <div className="search-results">
                {/* Bác sĩ */}
                {searchResults.doctors?.length > 0 && (
                  <div className="result-group">
                    <h4>Bác sĩ</h4>
                    {searchResults.doctors.map((doc) => (
                      <div
                        key={doc.id}
                        className="result-item"
                        onMouseDown={() => handleClickResult('doctor', doc.id)}
                      >
                        <span>{doc.lastName} {doc.firstName}</span>
                        <small>
                          {language === LANGUAGE.VI
                            ? doc.positionData?.valueVi
                            : doc.positionData?.valueEn}
                        </small>
                      </div>
                    ))}
                  </div>
                )}
                {/* Chuyên khoa */}
                {searchResults.specialties?.length > 0 && (
                  <div className="result-group">
                    <h4>Chuyên khoa</h4>
                    {searchResults.specialties.map((sp) => (
                      <div
                        key={sp.id}
                        className="result-item"
                        onMouseDown={() => handleClickResult('specialty', sp.id)}
                      >
                        {sp.name}
                      </div>
                    ))}
                  </div>
                )}
                {/* Phòng khám */}
                {searchResults.clinics?.length > 0 && (
                  <div className="result-group">
                    <h4>Phòng khám</h4>
                    {searchResults.clinics.map((cl) => (
                      <div
                        key={cl.id}
                        className="result-item"
                        onMouseDown={() => handleClickResult('clinic', cl.id)}
                      >
                        <span>{cl.name}</span>
                        <small>{cl.address}</small>
                      </div>
                    ))}
                  </div>
                )}
                {/* Không có kết quả */}
                {searchResults.doctors?.length === 0 &&
                 searchResults.specialties?.length === 0 &&
                 searchResults.clinics?.length === 0 && (
                  <div className="no-result">Không tìm thấy kết quả</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Banner;
```

```scss
// src/containers/HomePage/Sections/Banner.scss
.banner-container {
  background: linear-gradient(135deg, $primary 0%, $primary-dark 50%, #1a6e7e 100%);
  min-height: 400px;
  position: relative;

  @include mobile {
    min-height: 300px;
  }

  .banner-overlay {
    width: 100%;
    height: 100%;
    @include flex-center;
    padding: $spacing-xl $spacing-md;
  }

  .banner-content {
    text-align: center;
    max-width: 700px;
    width: 100%;
  }

  .banner-title {
    color: $text-white;
    font-size: 2rem;
    font-weight: 700;
    margin-bottom: $spacing-lg;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);

    span {
      font-size: 1.3rem;
      font-weight: 400;
      opacity: 0.9;
    }

    @include mobile {
      font-size: 1.5rem;
      span { font-size: 1rem; }
    }
  }

  .search-wrapper {
    position: relative;
    max-width: 500px;
    margin: 0 auto;
  }

  .search-box {
    display: flex;
    align-items: center;
    background: $bg-white;
    border-radius: 30px;
    padding: 8px 20px;
    box-shadow: $shadow-lg;

    .search-icon {
      color: $primary;
      font-size: 1.1rem;
      margin-right: $spacing-sm;
    }

    .search-input {
      flex: 1;
      border: none;
      outline: none;
      font-size: $font-size-lg;
      padding: 8px 0;

      &::placeholder {
        color: $text-light;
      }
    }
  }

  .search-results {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: $bg-white;
    border-radius: $radius-md;
    box-shadow: $shadow-lg;
    margin-top: $spacing-sm;
    max-height: 400px;
    overflow-y: auto;
    z-index: 100;

    .result-group {
      padding: $spacing-sm $spacing-md;
      border-bottom: 1px solid $border-color;
      h4 {
        font-size: $font-size-sm;
        color: $text-light;
        text-transform: uppercase;
        margin-bottom: $spacing-xs;
      }
    }

    .result-item {
      padding: $spacing-sm;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-radius: $radius-sm;

      &:hover {
        background-color: $primary-light;
      }

      small {
        color: $text-light;
        font-size: $font-size-sm;
      }
    }

    .no-result {
      padding: $spacing-md;
      text-align: center;
      color: $text-light;
    }
  }
}
```

---

## 6.3 Chuyên Khoa — `src/containers/HomePage/Sections/Specialty.jsx`

```jsx
// src/containers/HomePage/Sections/Specialty.jsx
// REQ-PT-005: Danh sách chuyên khoa
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';
import Slider from 'react-slick';
import { getAllSpecialty } from '../../../services/specialtyService';
import './Specialty.scss';

const Specialty = () => {
  const navigate = useNavigate();
  const [specialties, setSpecialties] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const res = await getAllSpecialty();
      if (res && res.errCode === 0) {
        setSpecialties(res.data || []);
      }
    };
    fetchData();
  }, []);

  // Cấu hình carousel react-slick
  const settings = {
    dots: false,
    infinite: specialties.length > 4,
    speed: 500,
    slidesToShow: 4,
    slidesToScroll: 1,
    responsive: [
      { breakpoint: 1024, settings: { slidesToShow: 3 } },
      { breakpoint: 768, settings: { slidesToShow: 2 } },
      { breakpoint: 480, settings: { slidesToShow: 1 } },
    ],
  };

  return (
    <div className="section-container section-specialty">
      <div className="section-header">
        <h2 className="section-title">
          <FormattedMessage id="homepage.specialty-popular" />
        </h2>
        <button className="btn-see-more">
          <FormattedMessage id="homepage.see-more" />
        </button>
      </div>

      <Slider {...settings}>
        {specialties.map((item) => (
          <div key={item.id} className="specialty-card"
               onClick={() => navigate(`/specialty/${item.id}`)}>
            <div className="specialty-image"
                 style={{ backgroundImage: `url(${item.image})` }}
            />
            <div className="specialty-name">{item.name}</div>
          </div>
        ))}
      </Slider>
    </div>
  );
};

export default Specialty;
```

```scss
// src/containers/HomePage/Sections/Specialty.scss
.section-specialty {
  @include section-padding;
  background-color: $secondary;

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: $spacing-lg;
    padding: 0 $spacing-md;
  }

  .btn-see-more {
    padding: 6px 16px;
    background-color: $primary-light;
    color: $primary;
    border: 1px solid $primary;
    border-radius: $radius-md;
    cursor: pointer;
    font-weight: 500;
    &:hover { background-color: $primary; color: $text-white; }
  }

  .specialty-card {
    padding: 0 $spacing-sm;
    cursor: pointer;

    .specialty-image {
      width: 100%;
      height: 150px;
      background-size: cover;
      background-position: center;
      border-radius: $radius-md $radius-md 0 0;
    }

    .specialty-name {
      background: $bg-white;
      padding: $spacing-sm $spacing-md;
      font-weight: 500;
      text-align: center;
      border-radius: 0 0 $radius-md $radius-md;
      box-shadow: $shadow-sm;
      @include text-ellipsis;
    }

    &:hover {
      .specialty-name { color: $primary; }
    }
  }
}
```

---

## 6.4 Cơ Sở Y Tế (Phòng Khám) — `src/containers/HomePage/Sections/MedicalFacility.jsx`

```jsx
// src/containers/HomePage/Sections/MedicalFacility.jsx
// REQ-PT-004: Danh sách phòng khám
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';
import Slider from 'react-slick';
import { getAllClinic } from '../../../services/clinicService';
import './MedicalFacility.scss';

const MedicalFacility = () => {
  const navigate = useNavigate();
  const [clinics, setClinics] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const res = await getAllClinic();
      if (res && res.errCode === 0) {
        setClinics(res.data || []);
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
    responsive: [
      { breakpoint: 1024, settings: { slidesToShow: 3 } },
      { breakpoint: 768, settings: { slidesToShow: 2 } },
      { breakpoint: 480, settings: { slidesToShow: 1 } },
    ],
  };

  return (
    <div className="section-container section-facility">
      <div className="section-header">
        <h2 className="section-title">
          <FormattedMessage id="homepage.medical-facility" />
        </h2>
        <button className="btn-see-more">
          <FormattedMessage id="homepage.see-more" />
        </button>
      </div>

      <Slider {...settings}>
        {clinics.map((item) => (
          <div key={item.id} className="facility-card"
               onClick={() => navigate(`/clinic/${item.id}`)}>
            <div className="facility-image"
                 style={{ backgroundImage: `url(${item.image})` }}
            />
            <div className="facility-name">{item.name}</div>
          </div>
        ))}
      </Slider>
    </div>
  );
};

export default MedicalFacility;
```

```scss
// src/containers/HomePage/Sections/MedicalFacility.scss
.section-facility {
  @include section-padding;
  background-color: $bg-white;

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: $spacing-lg;
    padding: 0 $spacing-md;
  }

  .btn-see-more {
    padding: 6px 16px;
    background-color: $primary-light;
    color: $primary;
    border: 1px solid $primary;
    border-radius: $radius-md;
    cursor: pointer;
    font-weight: 500;
    &:hover { background-color: $primary; color: $text-white; }
  }

  .facility-card {
    padding: 0 $spacing-sm;
    cursor: pointer;

    .facility-image {
      width: 100%;
      height: 150px;
      background-size: cover;
      background-position: center;
      border-radius: $radius-md;
      border: 1px solid $border-color;
    }

    .facility-name {
      padding: $spacing-sm 0;
      font-weight: 500;
      text-align: center;
      @include text-ellipsis;
    }

    &:hover {
      .facility-name { color: $primary; }
    }
  }
}
```

---

## 6.5 Bác Sĩ Nổi Bật — `src/containers/HomePage/Sections/TopDoctor.jsx`

```jsx
// src/containers/HomePage/Sections/TopDoctor.jsx
// REQ-PT-003: Top bác sĩ nổi bật
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';
import { useSelector, useDispatch } from 'react-redux';
import Slider from 'react-slick';
import { fetchTopDoctors } from '../../../redux/slices/adminSlice';
import { LANGUAGE } from '../../../utils/constants';
import './TopDoctor.scss';

const TopDoctor = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const language = useSelector((state) => state.app.language);
  const topDoctors = useSelector((state) => state.admin.topDoctors);

  useEffect(() => {
    dispatch(fetchTopDoctors(10));
  }, [dispatch]);

  const settings = {
    dots: false,
    infinite: topDoctors.length > 4,
    speed: 500,
    slidesToShow: 4,
    slidesToScroll: 1,
    responsive: [
      { breakpoint: 1024, settings: { slidesToShow: 3 } },
      { breakpoint: 768, settings: { slidesToShow: 2 } },
      { breakpoint: 480, settings: { slidesToShow: 1 } },
    ],
  };

  return (
    <div className="section-container section-top-doctor">
      <div className="section-header">
        <h2 className="section-title">
          <FormattedMessage id="homepage.outstanding-doctor" />
        </h2>
        <button className="btn-see-more">
          <FormattedMessage id="homepage.see-more" />
        </button>
      </div>

      <Slider {...settings}>
        {topDoctors.map((doc) => {
          // Hiển thị position theo ngôn ngữ
          const position = language === LANGUAGE.VI
            ? doc.positionData?.valueVi
            : doc.positionData?.valueEn;

          return (
            <div key={doc.id} className="doctor-card"
                 onClick={() => navigate(`/doctor/${doc.id}`)}>
              <div className="doctor-avatar">
                {doc.image ? (
                  <img src={doc.image} alt={doc.firstName} />
                ) : (
                  <div className="avatar-placeholder">
                    {doc.firstName?.charAt(0)}
                  </div>
                )}
              </div>
              <div className="doctor-info">
                <div className="doctor-position">{position}</div>
                <div className="doctor-name">
                  {doc.lastName} {doc.firstName}
                </div>
              </div>
            </div>
          );
        })}
      </Slider>
    </div>
  );
};

export default TopDoctor;
```

```scss
// src/containers/HomePage/Sections/TopDoctor.scss
.section-top-doctor {
  @include section-padding;
  background-color: $secondary;

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: $spacing-lg;
    padding: 0 $spacing-md;
  }

  .btn-see-more {
    padding: 6px 16px;
    background-color: $primary-light;
    color: $primary;
    border: 1px solid $primary;
    border-radius: $radius-md;
    cursor: pointer;
    font-weight: 500;
    &:hover { background-color: $primary; color: $text-white; }
  }

  .doctor-card {
    padding: 0 $spacing-sm;
    cursor: pointer;
    text-align: center;

    .doctor-avatar {
      width: 120px;
      height: 120px;
      margin: 0 auto $spacing-sm;
      border-radius: $radius-round;
      overflow: hidden;
      border: 3px solid $primary-light;
      transition: border-color 0.3s;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .avatar-placeholder {
        width: 100%;
        height: 100%;
        @include flex-center;
        background-color: $primary;
        color: $text-white;
        font-size: 2.5rem;
        font-weight: 700;
      }
    }

    .doctor-info {
      .doctor-position {
        font-size: $font-size-sm;
        color: $text-light;
      }
      .doctor-name {
        font-weight: 600;
        color: $text-primary;
        margin-top: $spacing-xs;
      }
    }

    &:hover {
      .doctor-avatar {
        border-color: $primary;
      }
      .doctor-name {
        color: $primary;
      }
    }
  }
}
```

---

## ✅ Checklist Bước 6

- [ ] `HomePage.jsx` — Container layout (Header → Banner → Specialty → Clinic → TopDoctor → Footer)
- [ ] `Banner.jsx` — Gradient background + search bar + dropdown kết quả (debounce 300ms)
- [ ] `Specialty.jsx` — Carousel chuyên khoa từ API
- [ ] `MedicalFacility.jsx` — Carousel phòng khám từ API
- [ ] `TopDoctor.jsx` — Carousel bác sĩ nổi bật từ Redux
- [ ] Tất cả text đa ngôn ngữ (FormattedMessage)
- [ ] Carousel responsive (4 → 3 → 2 → 1 slides)
- [ ] Click vào card → navigate đến trang chi tiết

---

> 📖 **Tiếp theo:** Mở file [Phase5_07_Login_Auth.md](Phase5_07_Login_Auth.md) để xây dựng trang đăng nhập.
