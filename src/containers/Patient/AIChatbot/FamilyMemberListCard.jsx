// ═══════════════════════════════════════════════════════════════════════
// [Phase 06E — AI PATIENT ASSISTANT] FamilyMemberListCard.jsx
// Displays Real Family Members List from getFamilyMembers
// Interactive Quick Actions: Book for Member & View Medical History
// ═══════════════════════════════════════════════════════════════════════

import React, { memo } from 'react';
import {
  Users,
  User,
  Phone,
  Calendar,
  HeartPulse,
  CalendarPlus,
  History,
  AlertCircle,
} from 'lucide-react';

const RELATION_MAP = {
  CHILD: 'Con',
  PARENT: 'Bố / Mẹ',
  SPOUSE: 'Vợ / Chồng',
  OTHER: 'Người thân khác',
};

const GENDER_MAP = {
  G1: 'Nam',
  G2: 'Nữ',
  G3: 'Khác',
  M: 'Nam',
  F: 'Nữ',
  MALE: 'Nam',
  FEMALE: 'Nữ',
};

const FamilyMemberListCard = memo(({ familyList, onSelectMember, onBookForMember, onViewHistory }) => {
  if (!familyList || typeof familyList !== 'object') return null;

  const data = familyList.data || familyList;
  const members = Array.isArray(data.familyMembers)
    ? data.familyMembers
    : (Array.isArray(data) ? data : (Array.isArray(data.members) ? data.members : []));
  const total = typeof data.count === 'number' ? data.count : members.length;

  return (
    <div className="ai-family-member-list-card" role="region" aria-label="Danh sách người thân">
      {/* Header */}
      <div className="family-list-header">
        <div className="family-list-title">
          <Users size={18} className="header-icon" />
          <span>Sổ y bạ gia đình</span>
          <span className="count-badge">{total} thành viên</span>
        </div>
      </div>

      {/* Body */}
      <div className="family-list-body">
        {members.length === 0 ? (
          <div className="family-empty-state">
            <AlertCircle size={22} className="empty-icon" />
            <p className="empty-text">Bạn hiện chưa có hồ sơ người thân nào trong sổ y bạ.</p>
          </div>
        ) : (
          <div className="family-items-grid">
            {members.map((member) => {
              const memberId = member.id || member.memberId;
              const fullName = member.fullName || member.name || 'Người thân';
              const relation = RELATION_MAP[member.relationship] || member.relationshipLabel || member.relationship || 'Người thân';
              const genderLabel = GENDER_MAP[member.gender] || member.gender || '—';
              const birthday = member.birthday || member.dateOfBirth;

              return (
                <div key={memberId || fullName} className="family-member-item-card">
                  <div className="member-card-top">
                    <div className="member-avatar-wrap">
                      <User size={16} className="avatar-icon" />
                    </div>
                    <div className="member-title-box">
                      <span className="member-fullname font-semibold">{fullName}</span>
                      <span className="relation-tag">{relation}</span>
                    </div>
                  </div>

                  <div className="member-details-grid">
                    {member.phoneNumber && (
                      <div className="detail-row">
                        <Phone size={12} className="row-icon" />
                        <span>{member.phoneNumber}</span>
                      </div>
                    )}
                    {birthday && (
                      <div className="detail-row">
                        <Calendar size={12} className="row-icon" />
                        <span>{birthday}</span>
                      </div>
                    )}
                    <div className="detail-row">
                      <User size={12} className="row-icon" />
                      <span>{genderLabel}</span>
                    </div>
                    {member.medicalHistory && (
                      <div className="detail-row medical-history-row">
                        <HeartPulse size={12} className="row-icon" />
                        <span className="medical-text">{member.medicalHistory}</span>
                      </div>
                    )}
                  </div>

                  {/* Quick Action Buttons */}
                  <div className="member-card-actions">
                    <button
                      type="button"
                      className="btn-family-action btn-book-for"
                      onClick={() => onBookForMember && onBookForMember(fullName)}
                      title={`Đặt lịch khám cho ${fullName}`}
                    >
                      <CalendarPlus size={13} />
                      <span>Đặt lịch khám</span>
                    </button>
                    <button
                      type="button"
                      className="btn-family-action btn-history-for"
                      onClick={() => onViewHistory && onViewHistory(fullName)}
                      title={`Xem lịch sử khám của ${fullName}`}
                    >
                      <History size={13} />
                      <span>Lịch sử khám</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
});

FamilyMemberListCard.displayName = 'FamilyMemberListCard';
export default FamilyMemberListCard;
