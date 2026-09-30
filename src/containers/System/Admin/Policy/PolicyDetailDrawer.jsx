// src/containers/System/Admin/Policy/PolicyDetailDrawer.jsx
// Enterprise Policy Inspection Center & Audit Ledger Drawer
import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  Percent,
  Clock,
  Building,
  User,
  Globe,
  Sparkles,
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileText,
  DollarSign,
  TrendingUp,
  History,
  RotateCw,
  ExternalLink,
  Users,
} from 'lucide-react';
import { getAdminPolicyDetail } from '../../../../services/policyService';
import CommonUtils from '../../../../utils/CommonUtils';
import './PolicyDetailDrawer.scss';

const formatCurrencyVND = (amount) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount || 0);
};

const PolicyDetailDrawer = ({ isOpen, onClose, policyId, onUpgradeVersion }) => {
  const [loading, setLoading] = useState(false);
  const [policyData, setPolicyData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !policyId) {
      setPolicyData(null);
      return;
    }

    const fetchDetail = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await getAdminPolicyDetail(policyId);
        if (res && res.errCode === 0) {
          setPolicyData(res.data);
        } else {
          setError(res?.message || 'Không thể tải thông tin chi tiết chính sách');
        }
      } catch (err) {
        setError(err?.response?.data?.message || err.message || 'Lỗi khi kết nối máy chủ');
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [isOpen, policyId]);

  if (!isOpen) return null;

  const isRevenue = policyData?.policyType === 'REVENUE_SHARE';
  const rules = policyData?.parsedRules || {};
  const stats = policyData?.financialStats || {
    totalBookings: policyData?.linkedBookingCount || 0,
    totalGross: 0,
    totalPlatformFee: 0,
    totalDoctorShare: 0,
    totalRefundAmount: 0,
  };
  const scopeEntity = policyData?.scopeEntity;
  const bookings = policyData?.linkedBookings || [];
  const versions = policyData?.versionHistory || [];

  return (
    <div className="policy-drawer-backdrop" onClick={onClose}>
      <div className="policy-drawer-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="drawer-header">
          <div className="header-content">
            <div className="icon-box">
              <ShieldCheck size={24} />
            </div>
            <div className="title-group">
              <div className="badge-row">
                <span className="code-pill">{policyData?.code || 'POL_...'}</span>
                <span className="version-pill">Phiên bản v{policyData?.version || 1}</span>
                <span className={`status-badge ${policyData?.status?.toLowerCase() || 'active'}`}>
                  {policyData?.status === 'ACTIVE' ? 'Đang áp dụng' : policyData?.status}
                </span>
              </div>
              <h2 className="drawer-title">{policyData?.name || 'Chi tiết Chính sách'}</h2>
              {policyData?.description && (
                <div className="drawer-desc">{policyData.description}</div>
              )}
            </div>
          </div>
          <button className="btn-close-drawer" onClick={onClose} title="Đóng">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="drawer-body">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748B' }}>
              <RotateCw size={28} className="fa-spin" style={{ color: '#087F8C', marginBottom: 12 }} />
              <div>Đang tải sổ cái kiểm toán và các ca đặt khám...</div>
            </div>
          ) : error ? (
            <div className="alert alert-danger d-flex align-items-center gap-2">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          ) : policyData ? (
            <>
              {/* 1. KPIs Financial Ledger */}
              <div className="section-block">
                <div className="section-header">
                  <div className="section-title">
                    <TrendingUp size={16} style={{ color: '#087F8C' }} />
                    <span>Báo cáo Dòng tiền Lũy kế của Chính sách</span>
                  </div>
                  <span className="section-badge">{stats.totalBookings} ca khám đã ghi nhận</span>
                </div>

                <div className="kpi-ledger-grid">
                  <div className="kpi-mini-card primary">
                    <div className="kpi-mini-lbl">Ca khám áp dụng</div>
                    <div className="kpi-mini-val">{stats.totalBookings} ca</div>
                    <div className="kpi-mini-sub">{stats.completedBookings || 0} ca đã hoàn tất</div>
                  </div>

                  <div className="kpi-mini-card success">
                    <div className="kpi-mini-lbl">Tổng giá trị khám</div>
                    <div className="kpi-mini-val">{formatCurrencyVND(stats.totalGross)}</div>
                    <div className="kpi-mini-sub">Gross GMV toàn sàn</div>
                  </div>

                  <div className="kpi-mini-card teal">
                    <div className="kpi-mini-lbl">Doanh thu Sàn thu</div>
                    <div className="kpi-mini-val">{formatCurrencyVND(stats.totalPlatformFee)}</div>
                    <div className="kpi-mini-sub">
                      {isRevenue ? `Phí sàn ${rules.platformFeePercent || 15}%` : 'Hoa hồng sàn'}
                    </div>
                  </div>

                  <div className="kpi-mini-card danger">
                    <div className="kpi-mini-lbl">
                      {isRevenue ? 'Bác sĩ thụ hưởng' : 'Tiền hoàn bệnh nhân'}
                    </div>
                    <div className="kpi-mini-val">
                      {formatCurrencyVND(isRevenue ? stats.totalDoctorShare : stats.totalRefundAmount)}
                    </div>
                    <div className="kpi-mini-sub">
                      {isRevenue
                        ? `Thực nhận ${rules.doctorSharePercent || 85}%`
                        : `${stats.cancelledBookings || 0} ca đã hủy`}
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Target Audience / Scope Entity Card */}
              <div className="section-block">
                <div className="section-header">
                  <div className="section-title">
                    {policyData.targetDoctors && policyData.targetDoctors.length > 0 ? (
                      <Users size={16} style={{ color: '#087F8C' }} />
                    ) : policyData.scopeType === 'DOCTOR' ? (
                      <User size={16} style={{ color: '#059669' }} />
                    ) : policyData.scopeType === 'CLINIC' ? (
                      <Building size={16} style={{ color: '#2563EB' }} />
                    ) : (
                      <Globe size={16} style={{ color: '#0D9488' }} />
                    )}
                    <span>
                      Đối tượng Áp dụng
                      {policyData.targetDoctors && policyData.targetDoctors.length > 0
                        ? ` (${policyData.targetDoctors.length} Bác sĩ được chỉ định)`
                        : policyData.targetMode === 'ALL_DOCTORS' || policyData.scopeType === 'GLOBAL'
                        ? ' (Toàn bộ Bác sĩ - Toàn sàn)'
                        : ` (Phạm vi ${policyData.scopeType})`}
                    </span>
                  </div>
                </div>

                {policyData.targetDoctors && policyData.targetDoctors.length > 0 ? (
                  <div className="target-doctors-card">
                    <div className="target-doctors-grid">
                      {policyData.targetDoctors.map((doc) => (
                        <div key={doc.id} className="target-doctor-item">
                          <div className="item-avatar">
                            {doc.image ? (
                              <img src={CommonUtils.decodeBase64Image(doc.image)} alt={doc.doctorName} />
                            ) : (
                              <div className="avatar-fallback"><User size={12} /></div>
                            )}
                          </div>
                          <div className="item-details">
                            <div className="item-name">
                              {doc.positionVi ? `${doc.positionVi} ` : 'BS. '}{doc.doctorName}
                            </div>
                            <div className="item-sub">
                              <span className="clinic-badge">{doc.clinicName}</span>
                              <span className="spec-badge">• {doc.specialtyName}</span>
                              {doc.roomNumber && <span className="room-badge">• {doc.roomNumber}</span>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : scopeEntity?.type === 'DOCTOR' ? (
                  <div className="scope-entity-card">
                    {scopeEntity.image ? (
                      <img
                        src={CommonUtils.decodeBase64Image(scopeEntity.image)}
                        alt={scopeEntity.fullName}
                        className="entity-avatar"
                      />
                    ) : (
                      <div className="entity-avatar-placeholder">BS</div>
                    )}
                    <div className="entity-info">
                      <div className="entity-name">
                        {scopeEntity.positionVi ? `${scopeEntity.positionVi} ` : ''}{scopeEntity.fullName}
                      </div>
                      <div className="entity-meta">
                        Chuyên khoa: <strong>{scopeEntity.specialtyName}</strong> • {scopeEntity.clinicName}
                      </div>
                      <div className="entity-submeta">
                        📧 {scopeEntity.email} • 📞 {scopeEntity.phone || 'Chưa cập nhật'}
                      </div>
                    </div>
                  </div>
                ) : scopeEntity?.type === 'CLINIC' ? (
                  <div className="scope-entity-card clinic">
                    {scopeEntity.image ? (
                      <img
                        src={CommonUtils.decodeBase64Image(scopeEntity.image)}
                        alt={scopeEntity.name}
                        className="entity-avatar"
                      />
                    ) : (
                      <div className="entity-avatar-placeholder" style={{ background: '#2563EB' }}>CS</div>
                    )}
                    <div className="entity-info">
                      <div className="entity-name">{scopeEntity.name}</div>
                      <div className="entity-meta">📍 {scopeEntity.address || 'Hệ thống phòng khám'}</div>
                    </div>
                  </div>
                ) : (
                  <div className="scope-entity-card global">
                    <Globe size={28} style={{ color: '#0D9488', flexShrink: 0 }} />
                    <div className="entity-info">
                      <div className="entity-name">Chính sách Tiêu chuẩn Toàn hệ thống (Toàn sàn)</div>
                      <div className="entity-meta">
                        Áp dụng tự động cho tất cả các Bác sĩ đang hoạt động và bác sĩ mới gia nhập trong thời hạn chính sách.
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Rules & Terms */}
              <div className="section-block">
                <div className="section-header">
                  <div className="section-title">
                    <Percent size={16} style={{ color: '#F59E0B' }} />
                    <span>Quy tắc Định phí & Hiệu lực</span>
                  </div>
                  <span className="section-badge">
                    Hiệu lực: {policyData.effectiveFrom ? new Date(policyData.effectiveFrom).toLocaleDateString('vi-VN') : '—'}
                    {' → '}
                    {policyData.effectiveTo ? new Date(policyData.effectiveTo).toLocaleDateString('vi-VN') : 'Vô thời hạn'}
                  </span>
                </div>

                <div className="rules-summary-box">
                  {isRevenue ? (
                    <>
                      <div className="rule-tag-item platform">
                        <span>Phí Sàn BookingCare:</span>
                        <strong>{rules.platformFeePercent || 15}%</strong>
                      </div>
                      <div className="rule-tag-item doctor">
                        <span>Bác sĩ thực nhận:</span>
                        <strong>{rules.doctorSharePercent || 85}%</strong>
                      </div>
                    </>
                  ) : (
                    Array.isArray(rules.tiers) && rules.tiers.map((t, idx) => (
                      <div key={idx} className="rule-tag-item refund">
                        <span>Hủy &gt;{t.minHoursBefore}h:</span>
                        <strong>Hoàn {t.refundPercent}%</strong>
                        {t.label && <small style={{ color: '#92400E' }}>({t.label})</small>}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* 4. Linked Bookings Table */}
              <div className="section-block">
                <div className="section-header">
                  <div className="section-title">
                    <FileText size={16} style={{ color: '#3B82F6' }} />
                    <span>Sổ cái Ca khám Thực tế đã Áp dụng ({bookings.length} ca gần nhất)</span>
                  </div>
                </div>

                {bookings.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: '#94A3B8', fontSize: '0.85rem' }}>
                    Chưa phát sinh ca đặt khám nào theo chính sách này
                  </div>
                ) : (
                  <div className="drawer-table-wrapper">
                    <table className="drawer-table">
                      <thead>
                        <tr>
                          <th>Mã ca</th>
                          <th>Bệnh nhân</th>
                          <th>Bác sĩ</th>
                          <th>Tiền khám</th>
                          <th>Phí Sàn</th>
                          <th>Tiền Bác sĩ</th>
                          <th>Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bookings.map((b) => (
                          <tr key={b.id}>
                            <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>{b.bookingCode}</td>
                            <td>
                              <div style={{ fontWeight: 600 }}>{b.patientName}</div>
                              <small style={{ color: '#64748B' }}>{b.date ? new Date(Number(b.date)).toLocaleDateString('vi-VN') : '—'} [{b.timeSlot}]</small>
                            </td>
                            <td>
                              <div style={{ fontWeight: 600 }}>{b.doctorName}</div>
                              <small style={{ color: '#64748B' }}>{b.specialtyName}</small>
                            </td>
                            <td style={{ fontWeight: 700 }}>{formatCurrencyVND(b.bookingPrice)}</td>
                            <td style={{ color: '#0D9488', fontWeight: 600 }}>{formatCurrencyVND(b.platformFee)}</td>
                            <td style={{ color: '#059669', fontWeight: 700 }}>{formatCurrencyVND(b.doctorShare)}</td>
                            <td>
                              <span style={{
                                padding: '2px 6px',
                                borderRadius: 4,
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                background: b.statusId === 'S3' ? '#D1FAE5' : b.statusId === 'S4' ? '#FEE2E2' : '#EFF6FF',
                                color: b.statusId === 'S3' ? '#047857' : b.statusId === 'S4' ? '#B91C1C' : '#1D4ED8'
                              }}>
                                {b.statusLabel}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* 5. Version Genealogy */}
              {versions.length > 1 && (
                <div className="section-block">
                  <div className="section-header">
                    <div className="section-title">
                      <History size={16} style={{ color: '#8B5CF6' }} />
                      <span>Cây Phả hệ Phiên bản của Mã [{policyData.code}]</span>
                    </div>
                  </div>

                  <div className="version-timeline">
                    {versions.map((v) => (
                      <div
                        key={v.id}
                        className={`v-timeline-item ${v.id === policyData.id ? 'current' : ''}`}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span className="v-tag">v{v.version}</span>
                          <span style={{ fontWeight: 600 }}>{v.name}</span>
                          {v.id === policyData.id && (
                            <span style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 700 }}>
                              (Đang xem)
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#64748B' }}>
                          Trạng thái: <strong>{v.status}</strong> • Hiệu lực từ {new Date(v.effectiveFrom).toLocaleDateString('vi-VN')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="drawer-footer">
          <button className="btn btn-sm btn-outline-secondary" onClick={onClose}>
            Đóng ngăn kéo
          </button>
          {policyData && (
            <button
              className="btn-upgrade-drawer"
              onClick={() => {
                onUpgradeVersion(policyData);
                onClose();
              }}
            >
              <Sparkles size={15} />
              <span>Nâng cấp Phiên bản v{policyData.version + 1}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PolicyDetailDrawer;
