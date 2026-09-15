// src/components/Common/Breadcrumb.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import './Breadcrumb.scss';

const Breadcrumb = ({ items = [], className = '' }) => {
  if (!items || items.length === 0) return null;

  return (
    <nav className={`app-breadcrumb ${className}`} aria-label="breadcrumb">
      <div className="breadcrumb-container">
        <ol className="breadcrumb-list">
          <li className="breadcrumb-item">
            <Link to="/" className="breadcrumb-link home-link" title="Trang chủ">
              <i className="fas fa-home home-icon" />
              <span>Trang chủ</span>
            </Link>
          </li>

          {items.map((item, index) => {
            const isLast = index === items.length - 1;
            return (
              <React.Fragment key={index}>
                <li className="breadcrumb-separator" aria-hidden="true">
                  <i className="fas fa-chevron-right" />
                </li>
                <li className={`breadcrumb-item ${isLast ? 'active' : ''}`} aria-current={isLast ? 'page' : undefined}>
                  {isLast || !item.path ? (
                    <span className="breadcrumb-current" title={item.label}>
                      {item.label}
                    </span>
                  ) : (
                    <Link to={item.path} className="breadcrumb-link" title={item.label}>
                      {item.label}
                    </Link>
                  )}
                </li>
              </React.Fragment>
            );
          })}
        </ol>
      </div>
    </nav>
  );
};

Breadcrumb.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      path: PropTypes.string,
    })
  ).isRequired,
  className: PropTypes.string,
};

export default Breadcrumb;
