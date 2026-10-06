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
  ExternalLink,
  AlertTriangle,
  Info,
  CheckCircle2,
  X,
  Eye,
  Download,
  Copy,
  Check,
  ZoomIn,
} from 'lucide-react';
import { toast } from 'react-toastify';
import CommonUtils from '../../../utils/CommonUtils';
import { FEATURES } from '../../../config/features';
import './EncounterContextPanel.scss';

const EncounterContextPanel = ({ workspaceData, isLoading, onClose }) => {
  const [activeTab, setActiveTab] = useState('OVERVIEW'); // 'OVERVIEW' | 'PRESCRIPTION' | 'DOCS'
  const [previewFile, setPreviewFile] = useState(null);
  const [copiedPrescription, setCopiedPrescription] = useState(false);

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

  // Giải mã dữ liệu file (hỗ trợ cả Base64 fileData lẫn fileUrl)
  const getFileSrc = (att) => {
    if (!att) return null;
    if (att.fileUrl) return att.fileUrl;
    if (att.fileData) {
      if (typeof att.fileData === 'string' && (att.fileData.startsWith('data:') || att.fileData.startsWith('http'))) {
        return att.fileData;
      }
      const mime = att.fileType || 'image/png';
      return `data:${mime};base64,${att.fileData}`;
    }
    return null;
  };

  // Sao chép đơn thuốc vào clipboard để gửi tin nhắn
  const handleCopyPrescription = () => {
    if (!encounter?.medicines || encounter.medicines.length === 0) return;
    const lines = [
      `📋 ĐƠN THUỐC CA KHÁM #${encounter.bookingId || ''}:`,
      ...encounter.medicines.map((m, idx) => {
        let line = `${idx + 1}. ${m.name} - SL: ${m.quantity} ${m.unit || 'viên'}`;
        if (m.dosage) line += ` (Liều dùng: ${m.dosage})`;
        if (m.instructions) line += ` - ${m.instructions}`;
        return line;
      }),
      encounter.careInstructions ? `\n💡 Lời dặn: ${encounter.careInstructions}` : '',
      encounter.followUpDate ? `\n📅 Tái khám ngày: ${encounter.followUpDate}` : '',
    ].filter(Boolean);

    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedPrescription(true);
    toast.success('Đã sao chép đơn thuốc vào bộ nhớ tạm!');
    setTimeout(() => setCopiedPrescription(false), 2500);
  };

  const medicinesCount = encounter?.medicines?.length || 0;
  const attachmentsCount = encounter?.attachments?.length || 0;

  return (
    <aside className="encounter-context-panel">
      {/* ── 1. PANEL HEADER ────────────────────────────────────────── */}
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

      {/* ── 2. SEGMENTED TABS BAR ──────────────────────────────────── */}
      <div className="panel-segmented-tabs">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'OVERVIEW' ? 'active' : ''}`}
          onClick={() => setActiveTab('OVERVIEW')}
          id="tab-encounter-overview"
        >
          <Stethoscope size={14} />
          <span>Tổng quan</span>
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === 'PRESCRIPTION' ? 'active' : ''}`}
          onClick={() => setActiveTab('PRESCRIPTION')}
          id="tab-encounter-prescription"
        >
          <Pill size={14} />
          <span>Đơn thuốc</span>
          {medicinesCount > 0 && <span className="tab-pill-badge">{medicinesCount}</span>}
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === 'DOCS' ? 'active' : ''}`}
          onClick={() => setActiveTab('DOCS')}
          id="tab-encounter-docs"
        >
          <FileText size={14} />
          <span>Tài liệu & Ảnh</span>
          {attachmentsCount > 0 && <span className="tab-pill-badge">{attachmentsCount}</span>}
        </button>
      </div>

      {/* ── 3. TAB CONTENT CONTAINERS ──────────────────────────────── */}
      <div className="panel-scroll-content">
        {/* ═══════════════════════════════════════════════════════════ */}
        {/* TAB 1: TỔNG QUAN LÂM SÀNG                                  */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {activeTab === 'OVERVIEW' && (
          <div className="tab-pane active-tab-pane">
            {/* Identity Card */}
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
                <div className="guardian-banner">
                  <ShieldAlert size={14} className="banner-icon" />
                  <div className="guardian-text">
                    <span>Chủ tài khoản liên hệ:</span>
                    <strong>{accountOwner.name}</strong> ({accountOwner.relationship})
                    {accountOwner.phoneNumber && <span> • SĐT: {accountOwner.phoneNumber}</span>}
                  </div>
                </div>
              )}

              {/* Medical History */}
              <div className="patient-history-box">
                <span className="label">Tiền sử bệnh & dị ứng:</span>
                <p className="history-text">
                  {actualPatient?.medicalHistory || 'Chưa ghi nhận tiền sử bệnh đặc biệt.'}
                </p>
              </div>
            </section>

            {/* Follow-up Window Status */}
            <section className={`section-card followup-status-card ${encounter?.isFollowUpActive ? 'is-active' : 'is-expired'}`}>
              <div className="status-top">
                <div className="status-badge-wrap">
                  {encounter?.isFollowUpActive ? (
                    <span className="badge-status badge-active">
                      <CheckCircle2 size={13} /> Theo dõi sau khám: <strong>Còn {encounter?.remainingDays || 0} ngày</strong> ({encounter?.remainingHours || 0} giờ)
                    </span>
                  ) : (
                    <span className="badge-status badge-expired">
                      <AlertTriangle size={13} /> Đã hết hạn theo dõi sau khám (7 ngày)
                    </span>
                  )}
                </div>
              </div>
              <div className="status-detail-text">
                {encounter?.isFollowUpActive ? (
                  <span>
                    Hiệu lực đến <strong>{expiresAtStr}</strong> (hoàn tất lúc {completedAtStr})
                  </span>
                ) : (
                  <span>
                    Ca khám hoàn tất lúc {completedAtStr}. Hạn trao đổi kết thúc lúc {expiresAtStr}.
                  </span>
                )}
              </div>
            </section>

            {/* Encounter Details */}
            <section className="section-card encounter-detail-card">
              <div className="card-heading-row">
                <div className="heading-left">
                  <Calendar size={16} className="text-teal" />
                  <h5>Ca khám #{encounter?.bookingId} - {bookingDateStr}</h5>
                </div>
                <span className="encounter-status-tag">{encounter?.statusLabel || 'Đã hoàn tất'}</span>
              </div>

              {/* Location & Practice Info */}
              <div className="encounter-location-box">
                <div className="loc-item clinic">
                  <MapPin size={13} />
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

            {/* Telemedicine Call Logs (Feature Flag) */}
            {FEATURES.ENABLE_VIDEO_CALL && callHistory && callHistory.length > 0 && (
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
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* TAB 2: ĐƠN THUỐC ĐÃ KÊ                                     */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {activeTab === 'PRESCRIPTION' && (
          <div className="tab-pane active-tab-pane">
            <div className="tab-pane-header">
              <div className="tab-pane-title">
                <Pill size={16} className="text-teal" />
                <h5>Đơn thuốc đã kê ({medicinesCount})</h5>
              </div>
              {medicinesCount > 0 && (
                <button
                  type="button"
                  className="btn-copy-prescription"
                  onClick={handleCopyPrescription}
                  title="Sao chép toàn bộ đơn thuốc để dán vào tin nhắn"
                >
                  {copiedPrescription ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedPrescription ? 'Đã sao chép' : 'Sao chép đơn thuốc'}</span>
                </button>
              )}
            </div>

            {medicinesCount > 0 ? (
              <div className="prescription-cards-grid">
                {encounter.medicines.map((med, idx) => (
                  <div key={med.id || idx} className="prescription-med-card">
                    <div className="med-card-header">
                      <div className="med-card-title">
                        <span className="med-order">{idx + 1}</span>
                        <strong className="med-title-name">{med.name}</strong>
                      </div>
                      <span className="med-badge-qty">
                        SL: {med.quantity} {med.unit || 'viên'}
                      </span>
                    </div>

                    <div className="med-card-body">
                      {med.dosage && (
                        <div className="med-detail-line">
                          <span className="label">Liều lượng:</span>
                          <span className="value highlight-dosage">{med.dosage}</span>
                        </div>
                      )}
                      {med.instructions && (
                        <div className="med-detail-line">
                          <span className="label">Cách dùng:</span>
                          <span className="value">{med.instructions}</span>
                        </div>
                      )}
                      {med.frequency && (
                        <div className="med-detail-line">
                          <span className="label">Tần suất:</span>
                          <span className="value">{med.frequency}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Instructions recap */}
                {encounter?.careInstructions && (
                  <div className="prescription-advice-note">
                    <span className="note-title">
                      <Info size={14} className="me-1" /> Lời dặn kèm theo:
                    </span>
                    <p>{encounter.careInstructions}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="empty-tab-state">
                <Pill size={36} className="empty-tab-icon" />
                <p className="empty-tab-title">Không có đơn thuốc chỉ định</p>
                <span className="empty-tab-desc">Ca khám này không có thuốc tây được kê trong hệ thống.</span>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* TAB 3: TÀI LIỆU & HÌNH ẢNH Y TẾ                            */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {activeTab === 'DOCS' && (
          <div className="tab-pane active-tab-pane">
            <div className="tab-pane-header">
              <div className="tab-pane-title">
                <FileText size={16} className="text-indigo" />
                <h5>Kết quả & Tài liệu y tế ({attachmentsCount})</h5>
              </div>
            </div>

            {attachmentsCount > 0 ? (
              <div className="attachments-cards-grid">
                {encounter.attachments.map((att) => {
                  const fileSrc = getFileSrc(att);
                  const isImage = !att.fileType || att.fileType.startsWith('image/');
                  return (
                    <div
                      key={att.id}
                      className="attachment-showcase-card"
                      onClick={() => fileSrc && setPreviewFile(att)}
                    >
                      {/* Image Thumbnail or File Icon preview */}
                      <div className="att-preview-thumb">
                        {isImage && fileSrc ? (
                          <div className="thumb-img-wrap">
                            <img src={fileSrc} alt={att.fileName} />
                            <div className="thumb-hover-overlay">
                              <ZoomIn size={18} />
                              <span>Xem ảnh</span>
                            </div>
                          </div>
                        ) : (
                          <div className="thumb-icon-wrap">
                            <FileText size={32} />
                            <span>Tài liệu</span>
                          </div>
                        )}
                      </div>

                      {/* Attachment Meta */}
                      <div className="att-card-details">
                        <div className="att-card-name" title={att.fileName}>
                          {att.fileName}
                        </div>
                        <div className="att-card-meta-row">
                          {att.category && (
                            <span className="att-category-chip">{att.category.toUpperCase()}</span>
                          )}
                          <span className="att-card-date">
                            {att.note || moment(att.createdAt).format('DD/MM/YYYY')}
                          </span>
                        </div>
                      </div>

                      {/* Card Actions */}
                      <div className="att-card-actions">
                        {fileSrc && (
                          <button
                            type="button"
                            className="btn-att-action preview"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewFile(att);
                            }}
                            title="Xem chi tiết"
                          >
                            <Eye size={14} />
                            <span>Xem</span>
                          </button>
                        )}
                        {fileSrc && (
                          <a
                            href={fileSrc}
                            download={att.fileName || 'tai-lieu-y-te'}
                            className="btn-att-action download"
                            onClick={(e) => e.stopPropagation()}
                            title="Tải về"
                          >
                            <Download size={14} />
                            <span>Tải</span>
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-tab-state">
                <FileText size={36} className="empty-tab-icon" />
                <p className="empty-tab-title">Chưa có tài liệu đính kèm</p>
                <span className="empty-tab-desc">Chưa có kết quả xét nghiệm hoặc hình ảnh X-quang nào cho ca khám này.</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── 4. ATTACHMENT PREVIEW DIALOG ──────────────────────────── */}
      {previewFile && (
        <div className="att-preview-overlay" onClick={() => setPreviewFile(null)}>
          <div className="att-preview-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="att-preview-header">
              <div className="att-preview-title">
                <FileText size={16} className="text-teal" />
                <span title={previewFile.fileName}>{previewFile.fileName}</span>
              </div>
              <div className="att-preview-actions">
                {getFileSrc(previewFile) && (
                  <a
                    href={getFileSrc(previewFile)}
                    download={previewFile.fileName || 'tai-lieu-y-te'}
                    className="btn-preview-download"
                    title="Tải về máy"
                  >
                    <Download size={14} />
                    <span>Tải về</span>
                  </a>
                )}
                <button
                  type="button"
                  className="btn-preview-close"
                  onClick={() => setPreviewFile(null)}
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="att-preview-body">
              {getFileSrc(previewFile) ? (
                previewFile.fileType && !previewFile.fileType.startsWith('image/') ? (
                  <iframe
                    src={getFileSrc(previewFile)}
                    title={previewFile.fileName}
                    className="preview-iframe"
                  />
                ) : (
                  <img
                    src={getFileSrc(previewFile)}
                    alt={previewFile.fileName}
                    className="preview-img"
                  />
                )
              ) : (
                <div className="preview-fallback">Tài liệu không có định dạng xem trước trực tiếp.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};

export default EncounterContextPanel;
