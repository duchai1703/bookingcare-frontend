import React, { useState } from 'react';
import moment from 'moment';
import {
  User,
  ShieldAlert,
  Calendar,
  Clock,
  MapPin,
  Stethoscope,
  Pill,
  FileText,
  PhoneCall,
  Video,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  AlertTriangle,
  Info,
  CheckCircle2,
  X,
  Eye,
  Download,
} from 'lucide-react';
import CommonUtils from '../../../utils/CommonUtils';
import './EncounterContextPanel.scss';

const EncounterContextPanel = ({ workspaceData, isLoading, onClose }) => {
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'MEDS' | 'FILES'
  const [isMedsExpanded, setIsMedsExpanded] = useState(true);
  const [isDocsExpanded, setIsDocsExpanded] = useState(true);
  const [previewFile, setPreviewFile] = useState(null);

  if (isLoading) {
    return (
      <div className="encounter-context-panel is-loading">
        <div className="loading-spinner-wrap">
          <div className="spinner-border spinner-border-sm text-teal" />
          <span>Đang tải thông tin ca khám...</span>
        </div>
      </div>
    );
  }

  if (!workspaceData) {
    return (
      <div className="encounter-context-panel is-empty">
        <Info size={32} className="empty-icon" />
        <p>Chưa có dữ liệu ca khám cho cuộc trò chuyện này.</p>
      </div>
    );
  }

  const { patientIdentity, encounter, callHistory, conversation } = workspaceData;
  const { actualPatient, accountOwner, isFamilyMember } = patientIdentity || {};

  const bookingDateStr = encounter?.date
    ? moment(parseInt(encounter.date, 10)).format('DD/MM/YYYY')
    : '';

  const completedAtStr = encounter?.consultationCompletedAt
    ? moment(encounter.consultationCompletedAt).format('HH:mm DD/MM/YYYY')
    : '';

  const expiresAtStr = encounter?.followUpExpiresAt
    ? moment(encounter.followUpExpiresAt).format('HH:mm DD/MM/YYYY')
    : '';

  return (
    <aside className="encounter-context-panel">
      {/* ── PANEL HEADER ────────────────────────────────────────── */}
      <div className="panel-header">
        <div className="panel-title-group">
          <Stethoscope size={18} className="title-icon" />
          <h4>Hồ sơ ca khám lâm sàng</h4>
        </div>
        {onClose && (
          <button
            type="button"
            className="btn-panel-close"
            onClick={onClose}
            title="Đóng bảng ngữ cảnh ca khám"
            aria-label="Đóng bảng ngữ cảnh"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <div className="panel-scroll-content">
        {/* ── 1. PATIENT IDENTITY CARD ────────────────────────────── */}
        <section className="section-card identity-card">
          <div className="identity-header">
            <div className="patient-avatar-box">
              {actualPatient?.avatar ? (
                <img src={CommonUtils.decodeBase64Image(actualPatient.avatar)} alt={actualPatient?.name} />
              ) : (
                <div className={`avatar-fallback ${isFamilyMember ? 'family-avatar' : ''}`}>
                  <User size={22} />
                </div>
              )}
            </div>

            <div className="patient-main-info">
              <div className="name-badge-row">
                <h3 className="patient-name">{actualPatient?.name || 'Bệnh nhân'}</h3>
                {isFamilyMember ? (
                  <span className="badge-identity badge-family">
                    {actualPatient?.relationshipLabel || 'Người thân'} được khám
                  </span>
                ) : (
                  <span className="badge-identity badge-self">Chính chủ tài khoản</span>
                )}
              </div>

              <div className="patient-meta-row">
                {actualPatient?.gender && (
                  <span className="meta-chip">{actualPatient.gender}</span>
                )}
                {actualPatient?.age !== null && actualPatient?.age !== undefined && (
                  <span className="meta-chip">{actualPatient.age} tuổi</span>
                )}
                {actualPatient?.birthday && (
                  <span className="meta-chip">Sinh: {actualPatient.birthday}</span>
                )}
              </div>
            </div>
          </div>

          {/* Account Owner / Guardian Warning Banner if Family Member */}
          {isFamilyMember && accountOwner && (
            <div className="guardian-notice-box">
              <div className="notice-icon">
                <ShieldAlert size={16} />
              </div>
              <div className="notice-body">
                <div className="notice-title">
                  Người giám hộ / Đặt lịch: <strong>{accountOwner.name}</strong>
                </div>
                <div className="notice-sub">
                  Quan hệ: <strong>{accountOwner.relationshipLabel}</strong> • SĐT:{' '}
                  {accountOwner.phone || 'Chưa cập nhật'}
                </div>
                <div className="notice-desc">
                  ⚠️ Bác sĩ đang nhắn tin trực tiếp với người đại diện này.
                </div>
              </div>
            </div>
          )}

          {/* Medical History & Allergies */}
          {actualPatient?.medicalHistory && (
            <div className="patient-history-box">
              <span className="box-label">Tiền sử bệnh & dị ứng:</span>
              <p className="box-content">{actualPatient.medicalHistory}</p>
            </div>
          )}
        </section>

        {/* ── 2. FOLLOW-UP STATUS STRIP ───────────────────────────── */}
        <section className={`section-card followup-strip ${encounter?.isFollowUpActive ? 'is-active' : 'is-expired'}`}>
          <div className="followup-strip-header">
            <Clock size={16} />
            <div className="strip-title">
              {encounter?.isFollowUpActive ? (
                <>
                  Theo dõi sau khám: <strong>Còn {encounter?.remainingDays || 0} ngày</strong> ({encounter?.remainingHours || 0} giờ)
                </>
              ) : (
                <>Thời hạn 7 ngày sau khám đã kết thúc</>
              )}
            </div>
          </div>
          <div className="strip-sub">
            {encounter?.isFollowUpActive ? (
              <span>Hiệu lực đến {expiresAtStr} (hoàn tất lúc {completedAtStr})</span>
            ) : (
              <span>Cuộc trò chuyện đã chuyển sang chế độ chỉ đọc</span>
            )}
          </div>
        </section>

        {/* ── 3. ENCOUNTER SUMMARY ─────────────────────────────────── */}
        <section className="section-card encounter-card">
          <div className="card-heading-row">
            <div className="heading-left">
              <Calendar size={16} />
              <h5>Ca khám #{encounter?.bookingId} • {bookingDateStr}</h5>
            </div>
            <span className="badge-encounter-status">
              <CheckCircle2 size={13} /> {encounter?.statusLabel || 'Đã hoàn tất'}
            </span>
          </div>

          <div className="encounter-location-row">
            <div className="loc-item">
              <MapPin size={14} />
              <span>{encounter?.clinicName}</span>
            </div>
            {encounter?.roomNumber && (
              <div className="loc-item room">
                <span>{encounter.roomNumber}</span>
              </div>
            )}
            {encounter?.specialtyName && (
              <div className="loc-item specialty">
                <span>{encounter.specialtyName}</span>
              </div>
            )}
          </div>

          {/* Chief Complaint / Symptoms */}
          {encounter?.chiefComplaint && (
            <div className="encounter-detail-field">
              <span className="field-label">Lý do khám / Triệu chứng:</span>
              <p className="field-value highlight">{encounter.chiefComplaint}</p>
            </div>
          )}

          {/* Diagnosis */}
          <div className="encounter-detail-field diagnosis-box">
            <span className="field-label">Chẩn đoán của bác sĩ:</span>
            <p className="field-value diagnosis-text">{encounter?.diagnosis || 'Đang theo dõi sức khỏe tổng quát'}</p>
          </div>

          {/* Care Instructions / Advice */}
          {encounter?.careInstructions && (
            <div className="encounter-detail-field advice-box">
              <span className="field-label">Dặn dò & Hướng dẫn sau khám:</span>
              <p className="field-value advice-text">{encounter.careInstructions}</p>
            </div>
          )}

          {encounter?.followUpDate && (
            <div className="encounter-revisit-row">
              <Calendar size={14} />
              <span>Hẹn tái khám ngày: <strong>{encounter.followUpDate}</strong></span>
            </div>
          )}
        </section>

        {/* ── 4. PRESCRIPTION LIST ─────────────────────────────────── */}
        <section className="section-card accordion-card">
          <div
            className="accordion-header"
            onClick={() => setIsMedsExpanded(!isMedsExpanded)}
          >
            <div className="accordion-title">
              <Pill size={16} className="text-teal" />
              <h5>Đơn thuốc đã kê ({encounter?.medicines?.length || 0})</h5>
            </div>
            <button type="button" className="btn-toggle-accordion">
              {isMedsExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>

          {isMedsExpanded && (
            <div className="accordion-body">
              {encounter?.medicines && encounter.medicines.length > 0 ? (
                <div className="medicine-items-list">
                  {encounter.medicines.map((med, idx) => (
                    <div key={med.id || idx} className="medicine-item">
                      <div className="med-top">
                        <span className="med-idx">{idx + 1}.</span>
                        <strong className="med-name">{med.name}</strong>
                        <span className="med-qty">
                          SL: {med.quantity} {med.unit}
                        </span>
                      </div>
                      {(med.dosage || med.instructions) && (
                        <div className="med-instructions">
                          {med.dosage && <span>Liều dùng: {med.dosage}</span>}
                          {med.instructions && <span> • Cách dùng: {med.instructions}</span>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-subtext">Không có đơn thuốc chỉ định trong ca khám này.</div>
              )}
            </div>
          )}
        </section>

        {/* ── 5. ATTACHMENTS & LAB RESULTS ──────────────────────────── */}
        <section className="section-card accordion-card">
          <div
            className="accordion-header"
            onClick={() => setIsDocsExpanded(!isDocsExpanded)}
          >
            <div className="accordion-title">
              <FileText size={16} className="text-indigo" />
              <h5>Kết quả & Tài liệu y tế ({encounter?.attachments?.length || 0})</h5>
            </div>
            <button type="button" className="btn-toggle-accordion">
              {isDocsExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>

          {isDocsExpanded && (
            <div className="accordion-body">
              {encounter?.attachments && encounter.attachments.length > 0 ? (
                <div className="attachment-items-list">
                  {encounter.attachments.map((att) => (
                    <div key={att.id} className="attachment-item">
                      <div className="att-info">
                        <FileText size={16} className="att-icon" />
                        <div className="att-text">
                          <span className="att-name" title={att.fileName}>{att.fileName}</span>
                          <span className="att-date">{att.description || moment(att.createdAt).format('DD/MM/YYYY')}</span>
                        </div>
                      </div>
                      <div className="att-actions">
                        {att.fileUrl && (
                          <a
                            href={att.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-view-att"
                            title="Mở tài liệu"
                          >
                            <Eye size={14} />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-subtext">Chưa có kết quả xét nghiệm hoặc hình ảnh đính kèm.</div>
              )}
            </div>
          )}
        </section>

        {/* ── 6. TELEMEDICINE CALL LOGS ────────────────────────────── */}
        {callHistory && callHistory.length > 0 && (
          <section className="section-card call-logs-card">
            <div className="card-heading-row">
              <div className="heading-left">
                <Video size={16} className="text-purple" />
                <h5>Lịch sử cuộc gọi sau khám ({callHistory.length})</h5>
              </div>
            </div>

            <div className="call-logs-list">
              {callHistory.map((call) => (
                <div key={call.id} className="call-log-row">
                  <div className="call-type-badge">
                    {call.callType === 'VIDEO' ? <Video size={14} /> : <PhoneCall size={14} />}
                    <span>{call.callType === 'VIDEO' ? 'Cuộc gọi Video' : 'Cuộc gọi Thoại'}</span>
                  </div>
                  <div className="call-meta">
                    <span className="call-time">{moment(call.createdAt).format('HH:mm DD/MM')}</span>
                    {call.duration > 0 && (
                      <span className="call-duration">
                        {Math.floor(call.duration / 60)}p {call.duration % 60}s
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </aside>
  );
};

export default EncounterContextPanel;
