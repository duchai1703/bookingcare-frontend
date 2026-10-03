// ═══════════════════════════════════════════════════════════════════════
// [Phase 04 — DOCTOR DISCOVERY] DoctorCard
// Renders Structured Doctor Card from Real Backend Data (SSOT)
// Strict rules: No fake rankings, no fabricated badges, no booking transaction
// ═══════════════════════════════════════════════════════════════════════

import React, { memo, useState } from 'react';
import {
  User,
  MapPin,
  Calendar,
  Star,
  Tag,
  Stethoscope,
  Building2,
  ChevronRight,
} from 'lucide-react';

const DoctorCard = memo(({ doctor, onSelectDoctor, isSelected = false }) => {
  const [imgError, setImgError] = useState(false);

  if (!doctor || typeof doctor !== 'object') return null;

  const {
    doctorId,
    name = 'Bác sĩ',
    position,
    specialtyName,
    clinicName,
    clinicAddress,
    avatarUrl,
    price,
    rating,
    reviewCount,
    description,
  } = doctor;

  // Initials for avatar fallback
  const getInitials = (fullName) => {
    if (!fullName) return 'BS';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const handleViewSchedule = (e) => {
    e.preventDefault();
    if (onSelectDoctor) {
      onSelectDoctor(doctor);
    }
  };

  return (
    <div
      className={`ai-doctor-card ${isSelected ? 'selected' : ''}`}
      data-doctor-id={doctorId}
    >
      <div className="doctor-card-body">
        {/* Avatar Section */}
        <div className="doctor-avatar-wrapper">
          {avatarUrl && !imgError ? (
            <img
              src={avatarUrl}
              alt={name}
              className="doctor-avatar-img"
              onError={() => setImgError(true)}
              loading="lazy"
            />
          ) : (
            <div className="doctor-avatar-fallback">
              <span className="avatar-initials">{getInitials(name)}</span>
            </div>
          )}
          {specialtyName && (
            <span className="doctor-specialty-badge" title={specialtyName}>
              <Stethoscope size={11} className="badge-icon" />
              <span>{specialtyName}</span>
            </span>
          )}
        </div>

        {/* Doctor Info Section */}
        <div className="doctor-info-content">
          <div className="doctor-header-row">
            {position && <span className="doctor-position-label">{position}</span>}
            <h4 className="doctor-full-name">{name}</h4>
          </div>

          {/* Rating (Chỉ hiển thị khi có dữ liệu thật từ bảng Review) */}
          {typeof rating === 'number' && rating > 0 && (
            <div className="doctor-rating-row">
              <div className="rating-stars">
                <Star size={13} className="star-icon filled" />
                <span className="rating-value">{rating.toFixed(1)}</span>
              </div>
              {typeof reviewCount === 'number' && reviewCount > 0 && (
                <span className="review-count">({reviewCount} đánh giá)</span>
              )}
            </div>
          )}

          {/* Clinic & Address */}
          {(clinicName || clinicAddress) && (
            <div className="doctor-clinic-row">
              {clinicName && (
                <div className="clinic-name-line">
                  <Building2 size={13} className="clinic-icon" />
                  <span className="clinic-text">{clinicName}</span>
                </div>
              )}
              {clinicAddress && (
                <div className="clinic-address-line">
                  <MapPin size={12} className="address-icon" />
                  <span className="address-text">{clinicAddress}</span>
                </div>
              )}
            </div>
          )}

          {/* Price (Chỉ hiển thị giá thực tế từ Allcode/Doctor_Info) */}
          {price && (
            <div className="doctor-price-row">
              <Tag size={13} className="price-icon" />
              <span className="price-label">Giá khám:</span>
              <span className="price-value">{price}</span>
            </div>
          )}

          {/* Short Description */}
          {description && (
            <p className="doctor-short-desc" title={description}>
              {description}
            </p>
          )}
        </div>
      </div>

      {/* Action Footer: Xem lịch khám */}
      <div className="doctor-card-footer">
        <button
          type="button"
          className="btn-view-schedule"
          onClick={handleViewSchedule}
          title={`Xem lịch khám của bác sĩ ${name}`}
        >
          <Calendar size={14} className="btn-icon" />
          <span>Xem lịch khám</span>
          <ChevronRight size={14} className="arrow-icon" />
        </button>
      </div>
    </div>
  );
});

DoctorCard.displayName = 'DoctorCard';

export default DoctorCard;
