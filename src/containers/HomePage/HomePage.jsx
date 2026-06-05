// src/containers/HomePage/HomePage.jsx
// Trang chủ — 4 sections: Banner, Specialty, MedicalFacility, TopDoctor
import React, { useEffect } from 'react';
import Banner from './Sections/Banner';
import Specialty from './Sections/Specialty';
import MedicalFacility from './Sections/MedicalFacility';
import TopDoctor from './Sections/TopDoctor';
import './HomePage.scss';

const HomePage = () => {
  useEffect(() => {
    if (window.location.hash) {
      const id = window.location.hash.substring(1);
      const element = document.getElementById(id);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 300); // Wait 300ms for child carousels/API data to finish rendering
      }
    }
  }, []);

  return (
    <div className="homepage-container">
      {/* Section 1: Banner + Search — SRS REQ-PT-001, 002 */}
      <Banner />

      {/* Section 2: Chuyên khoa phổ biến — SRS REQ-PT-005 */}
      <Specialty />

      {/* Section 3: Cơ sở y tế nổi bật — SRS REQ-PT-004 */}
      <MedicalFacility />

      {/* Section 4: Bác sĩ nổi bật — SRS REQ-PT-003 */}
      <TopDoctor />
    </div>
  );
};

export default HomePage;
