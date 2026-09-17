import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import './ContextBreadcrumbs.scss';

/**
 * ContextBreadcrumbs - Thanh điều hướng ngữ cảnh phân cấp y tế
 * @param {Array} items - [{ label: 'Cơ sở y tế', path: '/system/clinics', icon: <Hospital /> }, ...]
 */
const ContextBreadcrumbs = ({ items = [] }) => {
  const navigate = useNavigate();

  return (
    <nav className="context-breadcrumbs" aria-label="breadcrumb">
      <div className="breadcrumb-pill">
        <button
          type="button"
          className="breadcrumb-item-btn home-btn"
          onClick={() => navigate('/system/clinics')}
          title="Về danh sách cơ sở y tế"
        >
          <Home size={15} className="breadcrumb-icon" />
          <span>Hệ thống</span>
        </button>

        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <React.Fragment key={idx}>
              <ChevronRight size={14} className="breadcrumb-separator" />
              {isLast ? (
                <span className="breadcrumb-current" aria-current="page">
                  {item.icon && <span className="item-icon">{item.icon}</span>}
                  <span className="item-label">{item.label}</span>
                  {item.badge && <span className="item-badge">{item.badge}</span>}
                </span>
              ) : (
                <button
                  type="button"
                  className="breadcrumb-item-btn"
                  onClick={() => item.path && navigate(item.path)}
                  disabled={!item.path}
                >
                  {item.icon && <span className="item-icon">{item.icon}</span>}
                  <span className="item-label">{item.label}</span>
                </button>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </nav>
  );
};

export default ContextBreadcrumbs;
