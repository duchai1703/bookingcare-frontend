// src/components/Footer/Footer.jsx
// [Phase 9 Final] Full i18n — FormattedMessage
import React from 'react';
import { FormattedMessage } from 'react-intl';
import './Footer.scss';

const Footer = () => {
  return (
    <footer className="footer-container">
      <div className="footer-content">
        {/* Cột trái: Thông tin công ty */}
        <div className="footer-left">
          <h3 className="footer-logo"><FormattedMessage id="common.brand-name" /></h3>
          <p>
            <i className="fas fa-map-marker-alt" />{' '}
            <FormattedMessage id="footer.address" />
          </p>
          <p>
            <i className="fas fa-phone" />{' '}
            <FormattedMessage id="footer.phone" />
          </p>
          <p>
            <i className="fas fa-envelope" />{' '}
            <FormattedMessage id="footer.email" />
          </p>
        </div>

        {/* Cột phải: Links */}
        <div className="footer-right">
          <p><FormattedMessage id="footer.copyright" /></p>
          <p><FormattedMessage id="footer.university" /></p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
