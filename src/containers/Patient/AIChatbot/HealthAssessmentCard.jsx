// ═══════════════════════════════════════════════════════════════════
// [Phase 03 — HEALTH ASSESSMENT] HealthAssessmentCard
// Renders Structured Preliminary Health Assessment with Strict Safety Boundaries
// ═══════════════════════════════════════════════════════════════════

import React, { memo } from 'react';
import {
  Activity,
  AlertTriangle,
  HelpCircle,
  Stethoscope,
  Info,
  ShieldAlert,
  ArrowRight,
  Eye,
  CheckCircle2,
} from 'lucide-react';

const RISK_CONFIG = {
  INFORMATIONAL: {
    label: 'Thông tin tham khảo',
    className: 'risk-informational',
    icon: Info,
    color: '#0284c7',
  },
  ROUTINE: {
    label: 'Theo dõi thông thường',
    className: 'risk-routine',
    icon: CheckCircle2,
    color: '#059669',
  },
  URGENT: {
    label: 'Cần khám sớm',
    className: 'risk-urgent',
    icon: AlertTriangle,
    color: '#d97706',
  },
  EMERGENCY: {
    label: 'Khẩn cấp y tế',
    className: 'risk-emergency',
    icon: AlertTriangle,
    color: '#dc2626',
  },
};

const HealthAssessmentCard = memo(({ assessment, onQuestionClick, onSpecialtyClick }) => {
  if (!assessment || typeof assessment !== 'object') return null;

  const data = assessment.data || assessment;
  const riskKey = (data.riskLevel || 'INFORMATIONAL').toUpperCase();
  const riskMeta = RISK_CONFIG[riskKey] || RISK_CONFIG.INFORMATIONAL;
  const RiskIcon = riskMeta.icon;

  const basedOn = data.basedOn || {};

  return (
    <div className={`health-assessment-card ${riskMeta.className}`}>
      {/* Header with Risk Level Badge */}
      <div className="assessment-card-header">
        <div className="header-left">
          <Activity size={18} className="assessment-header-icon" />
          <span className="assessment-header-title">Đánh giá sức khỏe sơ bộ</span>
        </div>
        <div className={`risk-badge ${riskMeta.className}`}>
          <RiskIcon size={14} className="risk-icon" />
          <span>{riskMeta.label}</span>
        </div>
      </div>

      {/* Context Source Badges */}
      <div className="assessment-based-on">
        <span className="based-on-label">Căn cứ:</span>
        {basedOn.image && <span className="source-tag">📷 Hình ảnh</span>}
        {basedOn.symptoms && <span className="source-tag">🩺 Triệu chứng</span>}
        {basedOn.conversationContext && <span className="source-tag">💬 Ngữ cảnh trao đổi</span>}
      </div>

      {/* 1. Summary */}
      {data.summary && (
        <div className="assessment-section assessment-summary">
          <div className="section-title">
            <Info size={14} /> Tóm tắt nhận định
          </div>
          <p className="summary-text">{data.summary}</p>
        </div>
      )}

      {/* 2. Observations */}
      {Array.isArray(data.observations) && data.observations.length > 0 && (
        <div className="assessment-section">
          <div className="section-title">
            <Eye size={14} /> Dữ kiện quan sát & ghi nhận
          </div>
          <ul className="assessment-list">
            {data.observations.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 3. Possible Explanations */}
      {Array.isArray(data.possibleExplanations) && data.possibleExplanations.length > 0 && (
        <div className="assessment-section">
          <div className="section-title">
            <Stethoscope size={14} /> Có thể liên quan đến
          </div>
          <ul className="assessment-list possible-list">
            {data.possibleExplanations.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 4. Uncertainty */}
      {data.uncertainty && (
        <div className="assessment-section assessment-uncertainty">
          <div className="section-title">
            <HelpCircle size={14} /> Giới hạn & Mức độ không chắc chắn
          </div>
          <p className="uncertainty-text">{data.uncertainty}</p>
        </div>
      )}

      {/* 5. Red Flags */}
      {Array.isArray(data.redFlags) && data.redFlags.length > 0 && (
        <div className="assessment-section assessment-red-flags">
          <div className="section-title text-danger">
            <AlertTriangle size={14} /> Dấu hiệu cảnh báo cần lưu ý
          </div>
          <ul className="red-flag-list">
            {data.redFlags.map((flag, idx) => (
              <li key={idx}>{flag}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 6. Follow-up Questions */}
      {Array.isArray(data.followUpQuestions) && data.followUpQuestions.length > 0 && (
        <div className="assessment-section assessment-follow-up">
          <div className="section-title">
            <HelpCircle size={14} /> Bạn có thể trao đổi thêm để làm rõ:
          </div>
          <div className="follow-up-chips">
            {data.followUpQuestions.map((q, idx) => (
              <button
                key={idx}
                type="button"
                className="follow-up-chip"
                onClick={() => onQuestionClick && onQuestionClick(q)}
                title="Bấm để gửi câu trả lời hoặc thảo luận"
              >
                <span>{q}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 7. Recommended Next Step */}
      {data.recommendedNextStep && (
        <div className="assessment-section assessment-next-step">
          <div className="section-title">
            <ArrowRight size={14} /> Bước tiếp theo khuyến nghị
          </div>
          <p className="next-step-text">{data.recommendedNextStep}</p>
        </div>
      )}

      {/* 8. Suggested Specialties (Phase 04 Interactive Discovery) */}
      {Array.isArray(data.suggestedSpecialties) && data.suggestedSpecialties.length > 0 && (
        <div className="assessment-section assessment-specialties">
          <div className="section-title">
            <Stethoscope size={14} /> Gợi ý chuyên khoa phù hợp (Bấm để tìm bác sĩ)
          </div>
          <div className="specialty-chips">
            {data.suggestedSpecialties.map((sp, idx) => {
              const name = typeof sp === 'string' ? sp : sp?.name;
              const reason = typeof sp === 'object' ? sp?.reason : '';
              return (
                <button
                  key={idx}
                  type="button"
                  className="specialty-chip interactive-chip"
                  onClick={() => onSpecialtyClick && onSpecialtyClick(name)}
                  title={`Bấm để tìm danh sách bác sĩ chuyên khoa ${name}`}
                >
                  <span className="specialty-name">{name}</span>
                  {reason && <span className="specialty-reason"> — {reason}</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 9. Safety Notice */}
      {data.safetyNotice && (
        <div className="assessment-safety-notice">
          <ShieldAlert size={14} className="safety-icon" />
          <span>{data.safetyNotice}</span>
        </div>
      )}
    </div>
  );
});

HealthAssessmentCard.displayName = 'HealthAssessmentCard';
export default HealthAssessmentCard;
