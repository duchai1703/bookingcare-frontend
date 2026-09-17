// src/containers/System/Admin/Policy/PolicyMaster.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  Percent,
  Clock,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Lock,
  Unlock,
  Sparkles,
  History,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Building,
  User,
  Globe,
  Sliders,
  ExternalLink,
  ChevronRight,
  Info
} from 'lucide-react';
import {
  getAdminPoliciesList,
  getAdminPolicyDetail,
  seedDefaultAdminPolicies
} from '../../../../services/policyService';
import CreatePolicyModal from './CreatePolicyModal';
import './PolicyMaster.scss';

const PolicyMaster = () => {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [total, setTotal] = useState(0);

  // Filters
  const [policyType, setPolicyType] = useState('ALL');
  const [scopeType, setScopeType] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('CREATE'); // 'CREATE' | 'NEW_VERSION'
  const [selectedPolicy, setSelectedPolicy] = useState(null);

  // History Drawer / Modal
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyDetail, setHistoryDetail] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchPolicies = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getAdminPoliciesList({
        policyType,
        scopeType,
        status: statusFilter,
        search,
        limit: 50,
      });
      if (res && res.errCode === 0) {
        setPolicies(res.data || []);
        setTotal(res.total || 0);
      } else {
        setError(res?.message || 'Không thể tải danh sách chính sách');
      }
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Lỗi khi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }, [policyType, scopeType, statusFilter, search]);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  // Seed default if empty
  const handleSeedDefaults = async () => {
    try {
      setLoading(true);
      await seedDefaultAdminPolicies();
      await fetchPolicies();
    } catch (err) {
      console.error('Error seeding defaults:', err);
    } finally {
      setLoading(false);
    }
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setSelectedPolicy(null);
    setModalMode('CREATE');
    setIsModalOpen(true);
  };

  // Open New Version Modal
  const handleOpenNewVersion = (policy) => {
    setSelectedPolicy(policy);
    setModalMode('NEW_VERSION');
    setIsModalOpen(true);
  };

  // Open History
  const handleOpenHistory = async (policyId) => {
    setIsHistoryOpen(true);
    setHistoryLoading(true);
    try {
      const res = await getAdminPolicyDetail(policyId);
      if (res && res.errCode === 0) {
        setHistoryDetail(res.data);
      }
    } catch (err) {
      console.error('Error fetching policy history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Compute KPI summaries
  const activeRevPolicy = policies.find((p) => p.policyType === 'REVENUE_SHARE' && p.status === 'ACTIVE' && p.scopeType === 'GLOBAL');
  const activeRefundPolicy = policies.find((p) => p.policyType === 'REFUND_RULE' && p.status === 'ACTIVE' && p.scopeType === 'GLOBAL');
  const totalLocked = policies.filter((p) => p.isLocked).length;

  return (
    <div className="policy-master-page">
      {/* ===== HEADER BAR ===== */}
      <div className="policy-master-header">
        <div className="header-left">
          <div className="page-icon-wrapper">
            <ShieldCheck size={26} className="page-icon" />
          </div>
          <div>
            <h1 className="page-title">Quản trị Chính sách Phí & Hoàn tiền</h1>
            <p className="page-subtitle">
              Kiến trúc Bất biến (Immutable Ledger): Đóng băng snapshot chính sách tại thời điểm đặt lịch, bảo toàn
              100% lịch sử kế toán và đối soát.
            </p>
          </div>
        </div>

        <div className="header-actions">
          <button
            className="btn-secondary-action"
            onClick={handleSeedDefaults}
            title="Khởi tạo chính sách mặc định nếu chưa có"
          >
            <RefreshCw size={15} /> Khôi phục Mặc định
          </button>
          <button
            className="btn-primary-action"
            onClick={handleOpenCreate}
          >
            <Plus size={16} /> Ban hành Chính sách Mới
          </button>
        </div>
      </div>

      {/* ===== KPI METRICS CARDS ===== */}
      <div className="kpi-metrics-grid">
        {/* Card 1: Active Revenue Policy */}
        <div className="kpi-card revenue-card">
          <div className="kpi-header">
            <span className="kpi-title">Chính sách Phân bổ Doanh thu Hiện hành</span>
            <div className="kpi-badge active-badge">ACTIVE v{activeRevPolicy?.version || 1}</div>
          </div>
          <div className="kpi-body">
            {activeRevPolicy ? (
              <>
                <div className="split-numbers">
                  <div className="split-item text-teal-700">
                    <span className="split-label">Sàn:</span>
                    <strong className="split-value">{activeRevPolicy.parsedRules?.platformFeePercent || 15}%</strong>
                  </div>
                  <div className="split-divider">/</div>
                  <div className="split-item text-emerald-700">
                    <span className="split-label">Bác sĩ:</span>
                    <strong className="split-value">{activeRevPolicy.parsedRules?.doctorSharePercent || 85}%</strong>
                  </div>
                  {activeRevPolicy.parsedRules?.clinicSharePercent > 0 && (
                    <>
                      <div className="split-divider">/</div>
                      <div className="split-item text-blue-700">
                        <span className="split-label">Viện:</span>
                        <strong className="split-value">{activeRevPolicy.parsedRules.clinicSharePercent}%</strong>
                      </div>
                    </>
                  )}
                </div>
                <div className="kpi-desc text-xs text-gray-500 mt-2 truncate" title={activeRevPolicy.name}>
                  {activeRevPolicy.name}
                </div>
              </>
            ) : (
              <span className="text-sm text-gray-400">Chưa có chính sách active</span>
            )}
          </div>
        </div>

        {/* Card 2: Active Refund Policy */}
        <div className="kpi-card refund-card">
          <div className="kpi-header">
            <span className="kpi-title">Quy định Hoàn phí Hiện hành</span>
            <div className="kpi-badge active-badge">ACTIVE v{activeRefundPolicy?.version || 1}</div>
          </div>
          <div className="kpi-body">
            {activeRefundPolicy ? (
              <>
                <div className="refund-tiers-summary">
                  {Array.isArray(activeRefundPolicy.parsedRules?.tiers) ? (
                    activeRefundPolicy.parsedRules.tiers.map((t, idx) => (
                      <span key={idx} className="tier-tag">
                        &gt;{t.minHoursBefore}h: <strong>{t.refundPercent}%</strong>
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-gray-500">Mặc định 24h: 100% | 12h: 75% | &lt;12h: 50%</span>
                  )}
                </div>
                <div className="kpi-desc text-xs text-gray-500 mt-2 truncate" title={activeRefundPolicy.name}>
                  {activeRefundPolicy.name}
                </div>
              </>
            ) : (
              <span className="text-sm text-gray-400">Chưa có quy định active</span>
            )}
          </div>
        </div>

        {/* Card 3: Total Policy Records */}
        <div className="kpi-card stats-card">
          <div className="kpi-header">
            <span className="kpi-title">Bản ghi Chính sách (Audit Ledger)</span>
            <FileSpreadsheet size={18} className="text-gray-400" />
          </div>
          <div className="kpi-body">
            <div className="kpi-number">{total}</div>
            <div className="kpi-desc text-xs text-gray-500 mt-1">
              Bao gồm tất cả phiên bản hiện hành, tiền nhiệm & bản thảo
            </div>
          </div>
        </div>

        {/* Card 4: Locked Immutable Policies */}
        <div className="kpi-card locked-card">
          <div className="kpi-header">
            <span className="kpi-title">Chính sách đã Khóa Bất biến</span>
            <Lock size={18} className="text-amber-500" />
          </div>
          <div className="kpi-body">
            <div className="kpi-number text-amber-700">{totalLocked}</div>
            <div className="kpi-desc text-xs text-gray-500 mt-1">
              Đã phát sinh booking thực tế — cấm sửa đè, chỉ cho phép nâng version
            </div>
          </div>
        </div>
      </div>

      {/* ===== TOOLBAR & FILTERS ===== */}
      <div className="policy-toolbar">
        <div className="toolbar-left">
          {/* Policy Type Filter Tabs */}
          <div className="filter-tabs">
            <button
              className={`filter-tab ${policyType === 'ALL' ? 'active' : ''}`}
              onClick={() => setPolicyType('ALL')}
            >
              Tất cả loại
            </button>
            <button
              className={`filter-tab ${policyType === 'REVENUE_SHARE' ? 'active' : ''}`}
              onClick={() => setPolicyType('REVENUE_SHARE')}
            >
              <Percent size={14} /> Phân bổ Doanh thu
            </button>
            <button
              className={`filter-tab ${policyType === 'REFUND_RULE' ? 'active' : ''}`}
              onClick={() => setPolicyType('REFUND_RULE')}
            >
              <Clock size={14} /> Quy định Hoàn tiền
            </button>
          </div>

          {/* Scope Select */}
          <div className="filter-dropdown">
            <label>Phạm vi:</label>
            <select
              value={scopeType}
              onChange={(e) => setScopeType(e.target.value)}
            >
              <option value="ALL">Tất cả phạm vi</option>
              <option value="GLOBAL">Toàn sàn (GLOBAL)</option>
              <option value="CLINIC">Cơ sở y tế (CLINIC)</option>
              <option value="DOCTOR">Bác sĩ (DOCTOR)</option>
            </select>
          </div>

          {/* Status Select */}
          <div className="filter-dropdown">
            <label>Trạng thái:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang áp dụng (ACTIVE)</option>
              <option value="SUPERSEDED">Đã thay thế (SUPERSEDED)</option>
              <option value="DRAFT">Bản thảo (DRAFT)</option>
            </select>
          </div>
        </div>

        {/* Search */}
        <div className="toolbar-right">
          <div className="search-input-wrapper">
            <Search size={15} className="search-icon" />
            <input
              type="text"
              placeholder="Tìm theo tên hoặc mã chính sách..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ===== MASTER TABLE ===== */}
      <div className="policy-table-container">
        {loading ? (
          <div className="loading-state">
            <RefreshCw size={24} className="animate-spin text-teal-600 mb-2" />
            <span>Đang tải dữ liệu chính sách...</span>
          </div>
        ) : error ? (
          <div className="error-state">
            <AlertTriangle size={24} className="text-red-500 mb-2" />
            <span>{error}</span>
          </div>
        ) : policies.length === 0 ? (
          <div className="empty-state">
            <ShieldCheck size={36} className="text-gray-300 mb-3" />
            <p className="empty-title">Chưa có chính sách nào phù hợp bộ lọc</p>
            <p className="empty-desc">Nhấn "Ban hành Chính sách Mới" hoặc "Khôi phục Mặc định" để thiết lập.</p>
          </div>
        ) : (
          <table className="policy-table">
            <thead>
              <tr>
                <th>Mã & Phiên bản</th>
                <th>Tên Chính sách & Mô tả</th>
                <th>Phạm vi (Scope)</th>
                <th>Tóm tắt Tỷ lệ / Quy định</th>
                <th>Thời gian hiệu lực</th>
                <th>Trạng thái</th>
                <th>Bất biến</th>
                <th className="text-right">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {policies.map((p) => {
                const isRevenue = p.policyType === 'REVENUE_SHARE';
                const rules = p.parsedRules || {};

                return (
                  <tr key={p.id} className={p.status === 'ACTIVE' ? 'active-row' : ''}>
                    {/* Code & Version */}
                    <td>
                      <div className="code-cell">
                        <span className="policy-code font-mono">{p.code}</span>
                        <span className={`version-tag ${p.status === 'ACTIVE' ? 'v-active' : ''}`}>
                          v{p.version}
                        </span>
                      </div>
                      <div className="type-subtext">
                        {isRevenue ? 'Phân bổ Doanh thu' : 'Quy định Hoàn tiền'}
                      </div>
                    </td>

                    {/* Name & Description */}
                    <td>
                      <div className="policy-name font-medium text-gray-900">{p.name}</div>
                      {p.description && (
                        <div className="policy-desc text-xs text-gray-500 truncate" style={{ maxWidth: 280 }}>
                          {p.description}
                        </div>
                      )}
                    </td>

                    {/* Scope */}
                    <td>
                      <div className="scope-cell">
                        {p.scopeType === 'GLOBAL' && (
                          <span className="scope-badge scope-global">
                            <Globe size={13} /> Toàn sàn
                          </span>
                        )}
                        {p.scopeType === 'CLINIC' && (
                          <span className="scope-badge scope-clinic">
                            <Building size={13} /> Cơ sở #{p.scopeId}
                          </span>
                        )}
                        {p.scopeType === 'DOCTOR' && (
                          <span className="scope-badge scope-doctor">
                            <User size={13} /> Bác sĩ #{p.scopeId}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Rules Summary */}
                    <td>
                      {isRevenue ? (
                        <div className="rules-summary-rev">
                          <span className="rate-chip chip-teal" title="Phí Sàn BookingCare">
                            Sàn: <strong>{rules.platformFeePercent || 0}%</strong>
                          </span>
                          <span className="rate-chip chip-emerald" title="Bác sĩ thụ hưởng">
                            Bác sĩ: <strong>{rules.doctorSharePercent || 0}%</strong>
                          </span>
                          {rules.clinicSharePercent > 0 && (
                            <span className="rate-chip chip-blue" title="Cơ sở y tế">
                              Viện: <strong>{rules.clinicSharePercent}%</strong>
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="rules-summary-refund">
                          {Array.isArray(rules.tiers) && rules.tiers.slice(0, 2).map((t, i) => (
                            <span key={i} className="rate-chip chip-amber">
                              &gt;{t.minHoursBefore}h: <strong>{t.refundPercent}%</strong>
                            </span>
                          ))}
                          {Array.isArray(rules.tiers) && rules.tiers.length > 2 && (
                            <span className="more-chip">+{rules.tiers.length - 2} mốc</span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Effective Dates */}
                    <td>
                      <div className="dates-cell text-xs">
                        <div>
                          <span className="text-gray-400">Từ:</span>{' '}
                          {p.effectiveFrom ? new Date(p.effectiveFrom).toLocaleDateString('vi-VN') : '—'}
                        </div>
                        <div>
                          <span className="text-gray-400">Đến:</span>{' '}
                          {p.effectiveTo ? new Date(p.effectiveTo).toLocaleDateString('vi-VN') : 'Vô thời hạn'}
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td>
                      <span className={`status-pill status-${p.status?.toLowerCase()}`}>
                        {p.status === 'ACTIVE' && <CheckCircle2 size={12} />}
                        {p.status === 'SUPERSEDED' && <History size={12} />}
                        {p.status}
                      </span>
                    </td>

                    {/* Immutable Lock */}
                    <td>
                      <div className="lock-cell" title={p.isLocked ? `Đã khóa bất biến (${p.linkedBookingCount} ca khám)` : 'Chưa phát sinh ca khám'}>
                        {p.isLocked ? (
                          <span className="lock-badge locked">
                            <Lock size={13} /> Khóa ({p.linkedBookingCount})
                          </span>
                        ) : (
                          <span className="lock-badge unlocked">
                            <Unlock size={13} /> Mở
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="text-right">
                      <div className="action-buttons-group">
                        <button
                          type="button"
                          className="btn-action-icon btn-upgrade"
                          onClick={() => handleOpenNewVersion(p)}
                          title={`Nâng cấp lên phiên bản v${p.version + 1}`}
                        >
                          <Sparkles size={14} /> Nâng v{p.version + 1}
                        </button>
                        <button
                          type="button"
                          className="btn-action-icon btn-history"
                          onClick={() => handleOpenHistory(p.id)}
                          title="Xem lịch sử các phiên bản"
                        >
                          <History size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ===== CREATE / NEW VERSION MODAL ===== */}
      <CreatePolicyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        existingPolicy={selectedPolicy}
        isNewVersion={modalMode === 'NEW_VERSION'}
        onSuccess={() => {
          fetchPolicies();
        }}
      />

      {/* ===== VERSION HISTORY DRAWER / MODAL ===== */}
      {isHistoryOpen && (
        <div className="history-modal-backdrop" onClick={() => setIsHistoryOpen(false)}>
          <div className="history-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="history-header">
              <div className="flex items-center gap-2">
                <History size={20} className="text-teal-600" />
                <h3 className="text-lg font-bold text-gray-800">
                  Lịch sử Các Phiên bản của Mã [{historyDetail?.code || '...'}]
                </h3>
              </div>
              <button
                className="btn-close-modal"
                onClick={() => setIsHistoryOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="history-body">
              {historyLoading ? (
                <div className="loading-state">Đang tải lịch sử phiên bản...</div>
              ) : (
                <div className="version-timeline">
                  {historyDetail?.versionHistory?.map((v, idx) => (
                    <div key={v.id} className={`timeline-node ${v.status === 'ACTIVE' ? 'is-current' : ''}`}>
                      <div className="node-marker">
                        <div className="marker-dot" />
                        {idx !== (historyDetail.versionHistory.length - 1) && <div className="marker-line" />}
                      </div>
                      <div className="node-content">
                        <div className="node-title-row">
                          <span className="font-bold text-gray-900">Phiên bản v{v.version}</span>
                          <span className={`status-pill status-${v.status?.toLowerCase()}`}>{v.status}</span>
                          {v.isLocked && (
                            <span className="text-xs text-amber-600 flex items-center gap-1">
                              <Lock size={12} /> Bất biến
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-700 mt-1">{v.name}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          Hiệu lực:{' '}
                          {v.effectiveFrom ? new Date(v.effectiveFrom).toLocaleDateString('vi-VN') : '—'}
                          {' → '}
                          {v.effectiveTo ? new Date(v.effectiveTo).toLocaleDateString('vi-VN') : 'Hiện tại'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PolicyMaster;
