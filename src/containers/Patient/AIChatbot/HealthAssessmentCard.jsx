// ═══════════════════════════════════════════════════════════════════
// [Phase 03 — HEALTH ASSESSMENT] HealthAssessmentCard
// Renders Structured Preliminary Health Assessment with Strict Safety Boundaries
// ═══════════════════════════════════════════════════════════════════

import React, { memo, useState } from 'react';
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

const HealthAssessmentCard = memo(({ assessment, onQuestionClick, onOptionSelect, onSpecialtyClick }) => {
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [openTextValues, setOpenTextValues] = useState({});
  const [submittingQuestionId, setSubmittingQuestionId] = useState(null);

  if (!assessment || typeof assessment !== 'object') return null;

  const data = assessment.data || assessment;
  const riskKey = (data.riskLevel || 'INFORMATIONAL').toUpperCase();
  const riskMeta = RISK_CONFIG[riskKey] || RISK_CONFIG.INFORMATIONAL;
  const RiskIcon = riskMeta.icon;

  const basedOn = data.basedOn || {};

  const handleChoiceSelect = (q, opt) => {
    const qId = q.questionId || q.id;
    const optId = opt.optionId || opt.label;
    const optLabel = opt.label || opt.text || '';
    const optVal = opt.value !== undefined ? opt.value : optLabel;

    setSelectedAnswers((prev) => ({ ...prev, [qId]: optId }));
    setSubmittingQuestionId(qId);

    const payload = {
      isFollowUp: true,
      assessmentId: data.assessmentId,
      questionId: qId,
      optionId: optId,
      value: optVal,
      text: opt.text || optLabel,
      label: optLabel,
    };

    if (onOptionSelect) {
      onOptionSelect(payload);
    } else if (onQuestionClick) {
      onQuestionClick(payload);
    }
  };

  const handleOpenTextSubmit = (qId, qText) => {
    const val = (openTextValues[qId] || '').trim();
    if (!val || submittingQuestionId === qId) return;

    setSelectedAnswers((prev) => ({ ...prev, [qId]: val }));
    setSubmittingQuestionId(qId);

    const payload = {
      isFollowUp: true,
      assessmentId: data.assessmentId,
      questionId: qId,
      value: val,
      text: val,
      label: val,
    };

    if (onOptionSelect) {
      onOptionSelect(payload);
    } else if (onQuestionClick) {
      onQuestionClick(payload);
    }
  };

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

      {/* 6. Follow-up Questions & Clarification Chips */}
      {Array.isArray(data.followUpQuestions) && data.followUpQuestions.length > 0 && (
        <div className="assessment-section assessment-follow-up">
          <div className="section-title">
            <HelpCircle size={14} /> Bạn có thể trao đổi thêm để làm rõ:
          </div>
          <div className="follow-up-questions-list">
            {data.followUpQuestions.map((q, idx) => {
              const qText = typeof q === 'string' ? q : (q.text || q.question || '');
              const qId = (typeof q === 'object' && (q.questionId || q.id)) ? (q.questionId || q.id) : `q_${idx}`;
              const qType = (typeof q === 'object' && q.type) ? q.type : (q.options ? 'SINGLE_CHOICE' : 'OPEN_TEXT');
              const options = (typeof q === 'object' && Array.isArray(q?.options)) ? q.options : [];
              const groupSelectedValue = selectedAnswers[qId];

              // Open-Text Question (e.g. painLocation)
              if (qType === 'OPEN_TEXT' || (!options.length && qType !== 'BINARY' && qType !== 'SINGLE_CHOICE')) {
                return (
                  <div key={qId} className="follow-up-open-text-group">
                    <div className="follow-up-question-text">{qText}</div>
                    <div className="open-text-input-row">
                      <input
                        type="text"
                        className="follow-up-text-input"
                        placeholder={q.placeholder || 'Nhập vị trí đau hoặc mô tả cụ thể...'}
                        value={openTextValues[qId] || ''}
                        onChange={(e) => setOpenTextValues((prev) => ({ ...prev, [qId]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleOpenTextSubmit(qId, qText);
                        }}
                        disabled={submittingQuestionId === qId}
                      />
                      <button
                        type="button"
                        className="btn-submit-open-text"
                        onClick={() => handleOpenTextSubmit(qId, qText)}
                        disabled={!openTextValues[qId]?.trim() || submittingQuestionId === qId}
                      >
                        Gửi
                      </button>
                    </div>
                  </div>
                );
              }

              // Choice Options (SINGLE_CHOICE / BINARY)
              if (options.length > 0) {
                return (
                  <div key={qId} className="follow-up-structured-group">
                    <div className="follow-up-question-text">{qText}</div>
                    <div className="choice-chips-container">
                      {options.map((opt, optIdx) => {
                        const optId = opt.optionId || `opt_${optIdx}`;
                        const optLabel = typeof opt === 'string' ? opt : (opt.label || opt.text || '');
                        const optValue = typeof opt === 'string' ? opt : (opt.value !== undefined ? opt.value : optLabel);
                        const isSelected = groupSelectedValue === optId || groupSelectedValue === optLabel;
                        const isDimmed = Boolean(groupSelectedValue) && !isSelected;

                        return (
                          <button
                            key={optId}
                            type="button"
                            disabled={submittingQuestionId === qId}
                            className={`choice-chip-btn ${isSelected ? 'is-selected' : ''} ${isDimmed ? 'is-dimmed' : ''}`}
                            onClick={() => handleChoiceSelect(q, opt)}
                            title={`Gửi phản hồi: ${optLabel}`}
                          >
                            <span>{isSelected ? `✓ ${optLabel}` : optLabel}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              }

              // Fallback simple chip
              const isChipSelected = selectedAnswers[qId] === qText;
              return (
                <button
                  key={qId}
                  type="button"
                  disabled={submittingQuestionId === qId}
                  className={`follow-up-chip ${isChipSelected ? 'is-selected' : ''}`}
                  onClick={() => handleChoiceSelect(q, { optionId: qId, label: qText, text: qText, value: qText })}
                  title="Bấm để gửi câu hỏi hoặc thảo luận"
                >
                  <span>{isChipSelected ? `✓ ${qText}` : qText}</span>
                </button>
              );
            })}
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
      {Array.isArray(data.suggestedSpecialties) && data.suggestedSpecialties.length > 0 ? (
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
                  onClick={() => onSpecialtyClick && onSpecialtyClick(name, sp?.id)}
                  title={`Bấm để tìm danh sách bác sĩ chuyên khoa ${name}`}
                >
                  <span className="specialty-name">{name}</span>
                  {reason && <span className="specialty-reason"> — {reason}</span>}
                </button>
              );
            })}
          </div>
        </div>
      ) : data.specialtyNotice ? (
        <div className="assessment-section assessment-specialty-notice">
          <div className="section-title">
            <Stethoscope size={14} /> Chuyên khoa phù hợp
          </div>
          <p className="specialty-notice-text text-amber-700 bg-amber-50 p-2 rounded text-xs">{data.specialtyNotice}</p>
        </div>
      ) : null}

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
