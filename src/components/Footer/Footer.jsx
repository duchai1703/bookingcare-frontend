// src/components/Footer/Footer.jsx
import React from 'react';
import './Footer.scss';

const Footer = () => {
  return (
    <footer className="footer-container">
      <div className="footer-content">
        {/* Cột trái: Thông tin công ty */}
        <div className="footer-left">
          <h3 className="footer-logo">BookingCare</h3>
          <p>
            <i className="fas fa-map-marker-alt" />{' '}
            28 Thành Thái, Phường 14, Quận 10, TP. Hồ Chí Minh
          </p>
          <p>
            <i className="fas fa-phone" />{' '}
            024-7300-6858
          </p>
          <p>
            <i className="fas fa-envelope" />{' '}
            support@bookingcare.vn
          </p>
        </div>

        {/* Cột phải: Links */}
        <div className="footer-right">
          <p>© 2026 BookingCare. All rights reserved.</p>
          <p>Đồ án 1 — Trường Đại học Công nghệ Thông tin (UIT)</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
