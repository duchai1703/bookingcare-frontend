// ═══════════════════════════════════════════════════════════════════════
// [Phase 06E — AI PATIENT ASSISTANT] FamilyCreatedCard.jsx
// Displays Real Family Member Creation Confirmation
// Parity with FamilyMembers.jsx
// ═══════════════════════════════════════════════════════════════════════

import React, { memo } from 'react';
import {
  Users,
  CheckCircle2,
  Phone,
  User,
  Calendar,
  Sparkles,
} from 'lucide-react';

const FamilyCreatedCard = memo(({ familyCreated }) => {
  if (!familyCreated || typeof familyCreated !== 'object') return null;

  const data = familyCreated.data || familyCreated;
  const fullName = data.fullName || data.name || 'Người thân';
  const relation = data.relationshipLabel || data.relationship || 'Người thân';

  return (
    <div className="ai-family-created-card" role="region" aria-label="Thêm hồ sơ người thân thành công">
      <div className="family-card-header">
        <div className="family-header-icon-wrap">
          <CheckCircle2 size={18} className="check-icon" />
        </div>
        <div className="family-header-text">
          <h4 className="card-title">Thêm hồ sơ người thân thành công!</h4>
          <span className="card-subtitle">Hồ sơ đã được lưu vào danh bạ y tế gia đình của bạn.</span>
        </div>
      </div>

      <div className="family-card-body">
        <div className="family-member-info-box">
          <div className="member-main-row">
            <span className="member-name font-semibold">{fullName}</span>
            <span className="relation-pill">{relation}</span>
          </div>

          <div className="member-meta-grid">
            {data.phoneNumber && (
              <div className="meta-item">
                <Phone size={12} className="meta-icon" />
                <span>{data.phoneNumber}</span>
              </div>
            )}
            {data.gender && (
              <div className="meta-item">
                <User size={12} className="meta-icon" />
                <span>{data.gender === 'M' || data.gender === 'MALE' ? 'Nam' : data.gender === 'F' || data.gender === 'FEMALE' ? 'Nữ' : data.gender}</span>
              </div>
            )}
            {data.birthday && (
              <div className="meta-item">
                <Calendar size={12} className="meta-icon" />
                <span>{data.birthday}</span>
              </div>
            )}
          </div>
        </div>

        <div className="family-card-hint">
          <Sparkles size={13} className="hint-icon" />
          <span>Bạn có thể yêu cầu trợ lý đặt lịch khám cho <strong>{fullName}</strong> bất kỳ lúc nào!</span>
        </div>
      </div>
    </div>
  );
});

FamilyCreatedCard.displayName = 'FamilyCreatedCard';

export default FamilyCreatedCard;
