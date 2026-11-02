// src/containers/System/Admin/Financial/UnifiedSettlementHub.jsx
// [RAMP FINTECH DESIGN SYSTEM - MASTER HUB 2]
// Trung Tâm Duyệt Chi & Quyết Toán Nghiệp Vụ Hợp Nhất (Disbursements & Settlements Operations Hub)
// Hợp nhất 4 phân hệ: Duyệt rút tiền, Quyết toán thù lao bác sĩ T+0, Quản trị hoàn tiền hủy khám, Hàng đợi ngoại lệ SLA.
// Tuân thủ 100% phong cách Ramp: Warm Paper, Electric Lime #D4FF00, Hairline borders, Inline Anomaly Rows, Split-View Workspace.

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import moment from 'moment';
import {
  RotateCw,
  Search,
  CheckCircle2,
  XCircle,
  Coins,
  ShieldAlert,
  ArrowUpRight,
  Clock,
  AlertTriangle,
  Play,
  FileSpreadsheet,
  Check,
  Copy,
  ExternalLink,
  ChevronRight,
  Filter,
  Layers,
  Building2,
  User,
  ShieldCheck,
  GitCommit
} from 'lucide-react';
import {
  getAdminWithdrawalRequests,
  processAdminWithdrawal,
  getAdminDoctorSettlements,
  payoutDoctorSettlements,
  getAdminRefundCases,
  processAdminReviewRefund,
  runMasterAutomationCycle
} from '../../../../services/walletService';
import WithdrawalSplitViewWorkspace from './WithdrawalSplitViewWorkspace';
import MoneyRoutingAuditDrawer from './MoneyRoutingAuditDrawer';
import TransactionLifecycleDrawer from './TransactionLifecycleDrawer';
import './UnifiedSettlementHub.scss';

const formatMoney = (val) => (Number(val) || 0).toLocaleString('vi-VN') + ' ₫';

export default function UnifiedSettlementHub() {
  // Operational Filter Pill: 'ALL' | 'WITHDRAWAL' | 'SETTLEMENT' | 'REFUND' | 'OVERDUE'
  const [activeSegment, setActiveSegment] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Data states
  const [withdrawals, setWithdrawals] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [refunds, setRefunds] = useState([]);

  // Stats
  const [withdrawalStats, setWithdrawalStats] = useState({ totalRequests: 0, pendingCount: 0, pendingAmount: 0, overdueCount: 0 });
  const [settlementStats, setSettlementStats] = useState({ totalAvailable: 0, count: 0 });
  const [refundStats, setRefundStats] = useState({ pendingCount: 0 });

  // Selected item for Split-View or Modal
  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
  const [isProcessingWithdrawal, setIsProcessingWithdrawal] = useState(false);

  // Settlement detail modal
  const [selectedSettlement, setSelectedSettlement] = useState(null);
  const [isProcessingSettlement, setIsProcessingSettlement] = useState(false);

  // Refund detail modal
  const [selectedRefund, setSelectedRefund] = useState(null);
  const [isProcessingRefund, setIsProcessingRefund] = useState(false);
  const [refundNote, setRefundNote] = useState('');

  // Master Automation Cycle state
  const [isRunningCycle, setIsRunningCycle] = useState(false);
  const [isAuditDrawerOpen, setIsAuditDrawerOpen] = useState(false);

  // Drawer Truy Vết Vòng Đời Giao Dịch Toàn Vẹn (Lineage Inspector)
  const [selectedTxForLineage, setSelectedTxForLineage] = useState(null);
  const [isLineageDrawerOpen, setIsLineageDrawerOpen] = useState(false);

  const handleOpenLineage = (targetId) => {
    setSelectedTxForLineage(targetId || 102);
    setIsLineageDrawerOpen(true);
  };

  // Tải dữ liệu toàn bộ 3 nguồn nghiệp vụ
  const loadAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [wRes, sRes, rRes] = await Promise.all([
        getAdminWithdrawalRequests({ page: 1, limit: 30 }),
        getAdminDoctorSettlements({ page: 1, limit: 30 }),
        getAdminRefundCases({ page: 1, limit: 30 })
      ]);

      if (wRes && wRes.errCode === 0) {
        setWithdrawals(wRes.data?.requests || []);
        setWithdrawalStats(wRes.data?.stats || {});
      }
      if (sRes && sRes.errCode === 0) {
        setSettlements(sRes.data?.settlements || []);
        setSettlementStats({
          totalAvailable: sRes.data?.totalAvailableAmount || 0,
          count: (sRes.data?.settlements || []).filter(s => s.status === 'AVAILABLE' || s.status === 'EARNED').length
        });
      }
      if (rRes && rRes.errCode === 0) {
        setRefunds(rRes.data?.refundCases || []);
        setRefundStats({
          pendingCount: (rRes.data?.refundCases || []).filter(r => r.status === 'PENDING').length
        });
      }
    } catch (err) {
      console.error('Error fetching unified settlements data:', err);
      toast.error('Lỗi khi tải dữ liệu quyết toán');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Thực thi Chu Trình T+0 Tự Động Hóa
  const handleExecuteCycle = async () => {
    setIsRunningCycle(true);
    try {
      const res = await runMasterAutomationCycle();
      if (res && res.errCode === 0) {
        toast.success(res.message || 'Chu trình T+0 thực thi thành công!');
        await loadAllData();
      } else {
        toast.warning(res?.errMessage || 'Không thể thực thi chu trình');
      }
    } catch (err) {
      toast.error('Lỗi hệ thống khi kích hoạt chu trình T+0');
    } finally {
      setIsRunningCycle(false);
    }
  };

  // Xử lý phê duyệt kết chuyển thù lao bác sĩ
  const handleConfirmSettlementPayout = async (settlement) => {
    setIsProcessingSettlement(true);
    try {
      const res = await payoutDoctorSettlements({
        settlementIds: [settlement.id],
        note: `Admin giải ngân thù lao ca khám #${settlement.bookingId}`
      });
      if (res && res.errCode === 0) {
        toast.success('Đã kết chuyển thù lao vào ví bác sĩ thành công!');
        setSelectedSettlement(null);
        await loadAllData();
      } else {
        toast.error(res?.errMessage || 'Không thể kết chuyển thù lao');
      }
    } catch (err) {
      toast.error('Lỗi khi giải ngân thù lao');
    } finally {
      setIsProcessingSettlement(false);
    }
  };

  // Xử lý thẩm định hoàn tiền bệnh nhân
  const handleConfirmRefundReview = async (decision) => {
    if (!selectedRefund) return;
    setIsProcessingRefund(true);
    try {
      const res = await processAdminReviewRefund(selectedRefund.id, {
        decision,
        adminNote: refundNote || `Admin ${decision === 'APPROVED' ? 'chấp thuận' : 'từ chối'} hoàn tiền`
      });
      if (res && res.errCode === 0) {
        toast.success(decision === 'APPROVED' ? 'Đã hoàn tiền vào ví bệnh nhân!' : 'Đã từ chối khiếu nại hoàn tiền');
        setSelectedRefund(null);
        setRefundNote('');
        await loadAllData();
      } else {
        toast.error(res?.errMessage || 'Không thể xử lý hoàn tiền');
      }
    } catch (err) {
      toast.error('Lỗi khi xử lý hồ sơ hoàn tiền');
    } finally {
      setIsProcessingRefund(false);
    }
  };

  // Hợp nhất dữ liệu thành danh sách tác vụ duy nhất
  const unifiedItems = [];

  // 1. Thêm các yêu cầu rút tiền
  withdrawals.forEach((w) => {
    unifiedItems.push({
      id: `WTH-${w.id}`,
      rawId: w.id,
      type: 'WITHDRAWAL',
      typeLabel: 'Rút tiền ngân hàng',
      typeBadge: 'withdrawal',
      beneficiary: w.wallet?.owner,
      beneficiaryRole: w.wallet?.walletType === 'DOCTOR' ? 'BÁC SĨ' : 'BỆNH NHÂN',
      amount: w.amount,
      reference: `${w.bankName} - STK: ${w.accountNumber}`,
      slaDate: w.promisedPayoutDate,
      slaText: w.appliedSlaDays ? `${w.appliedSlaDays} ngày` : '24h',
      isOverdue: Boolean(w.isOverdue),
      status: w.status,
      createdAt: w.createdAt,
      raw: w
    });
  });

  // 2. Thêm các khoản quyết toán bác sĩ
  settlements.forEach((s) => {
    unifiedItems.push({
      id: `SET-${s.id}`,
      rawId: s.id,
      type: 'SETTLEMENT',
      typeLabel: 'Quyết toán thù lao T+0',
      typeBadge: 'settlement',
      beneficiary: s.doctor,
      beneficiaryRole: 'BÁC SĨ',
      amount: s.netAmount || s.amount,
      reference: `Ca khám #${s.bookingId || s.appointmentId || s.id}`,
      slaDate: s.createdAt,
      slaText: 'T+0 Tức thì',
      isOverdue: false,
      status: s.status === 'AVAILABLE' || s.status === 'EARNED' ? 'PENDING' : s.status,
      createdAt: s.createdAt,
      raw: s
    });
  });

  // 3. Thêm các hồ sơ hoàn tiền
  refunds.forEach((r) => {
    unifiedItems.push({
      id: `RFD-${r.id}`,
      rawId: r.id,
      type: 'REFUND',
      typeLabel: 'Hoàn tiền hủy ca',
      typeBadge: 'refund',
      beneficiary: r.patient || r.user,
      beneficiaryRole: 'BỆNH NHÂN',
      amount: r.refundAmount || r.amount,
      reference: `Lý do: ${r.reason || 'Hủy lịch khám'}`,
      slaDate: r.createdAt,
      slaText: '24h làm việc',
      isOverdue: false,
      status: r.status,
      createdAt: r.createdAt,
      raw: r
    });
  });

  // Lọc theo Segment và Search
  const filteredItems = unifiedItems.filter((item) => {
    // Lọc theo segment
    if (activeSegment === 'WITHDRAWAL' && item.type !== 'WITHDRAWAL') return false;
    if (activeSegment === 'SETTLEMENT' && item.type !== 'SETTLEMENT') return false;
    if (activeSegment === 'REFUND' && item.type !== 'REFUND') return false;
    if (activeSegment === 'OVERDUE' && !item.isOverdue) return false;

    // Lọc theo từ khóa tìm kiếm
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const name = `${item.beneficiary?.lastName || ''} ${item.beneficiary?.firstName || ''}`.toLowerCase();
      const email = (item.beneficiary?.email || '').toLowerCase();
      const ref = (item.reference || '').toLowerCase();
      const id = (item.id || '').toLowerCase();
      return name.includes(q) || email.includes(q) || ref.includes(q) || id.includes(q);
    }
    return true;
  });

  // Đếm số lượng cho từng Pill
  const countAll = unifiedItems.length;
  const countWithdrawals = withdrawals.filter(w => w.status === 'PENDING').length;
  const countSettlements = settlements.filter(s => s.status === 'AVAILABLE' || s.status === 'EARNED').length;
  const countRefunds = refunds.filter(r => r.status === 'PENDING').length;
  const countOverdue = unifiedItems.filter(i => i.isOverdue).length;

  return (
    <div className="ramp-unified-settlement-hub">
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 1. HEADER: Tiêu đề & Nút Hành Động Chuẩn Ramp                      */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="ramp-hub-header">
        <div className="header-title-block">
          <div className="header-badge">
            <span className="badge-dot" />
            <span>Mặt Bằng Tác Nghiệp Duyệt Chi & Quyết Toán Tập Trung (Operations Queue)</span>
          </div>
          <h1 className="page-title">Trung Tâm Phê Duyệt & Quyết Toán</h1>
          <p className="page-subtitle">
            Quản trị luồng chi tiền: Thẩm định rút tiền ngân hàng thật, kết chuyển thù lao bác sĩ (T+0) và xử lý hồ sơ hoàn tiền bệnh nhân.
          </p>
        </div>

        <div className="header-actions-block">
          <button
            type="button"
            className="ramp-btn-secondary"
            onClick={loadAllData}
            disabled={loading}
          >
            <RotateCw size={14} className={loading ? 'tw-animate-spin' : ''} />
            <span>Đồng bộ</span>
          </button>

          <button
            type="button"
            className="ramp-btn-secondary"
            onClick={() => setIsAuditDrawerOpen(true)}
          >
            <FileSpreadsheet size={14} />
            <span>Nhật ký truy vết T+0</span>
          </button>

          {/* Nút Vàng Chanh Ramp Primary */}
          <button
            type="button"
            className="ramp-btn-primary"
            onClick={handleExecuteCycle}
            disabled={isRunningCycle || loading}
          >
            <Play size={13} className="tw-fill-black" />
            <span>{isRunningCycle ? 'Đang thực thi...' : 'Kích Hoạt Chu Trình T+0'}</span>
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 2. STAT STRIP: Thống kê nhanh nội dòng (1 dòng thanh mảnh)       */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="ramp-stat-strip">
        <div className="stat-pill">
          <span className="pill-dot amber" />
          <span className="pill-label">Rút tiền chờ duyệt:</span>
          <strong className="ramp-tabular-num">{countWithdrawals} ca ({formatMoney(withdrawalStats.pendingAmount)})</strong>
        </div>
        <div className="stat-divider">•</div>
        <div className="stat-pill">
          <span className="pill-dot emerald" />
          <span className="pill-label">Thù lao BS sẵn sàng chi (T+0):</span>
          <strong className="ramp-tabular-num">{countSettlements} ca ({formatMoney(settlementStats.totalAvailable)})</strong>
        </div>
        <div className="stat-divider">•</div>
        <div className="stat-pill">
          <span className="pill-dot teal" />
          <span className="pill-label">Hoàn tiền chờ duyệt:</span>
          <strong className="ramp-tabular-num">{countRefunds} hồ sơ</strong>
        </div>
        {countOverdue > 0 && (
          <>
            <div className="stat-divider">•</div>
            <div className="stat-pill warning">
              <span className="pill-dot rose" />
              <span className="pill-label text-rose">Cảnh báo vượt hạn SLA:</span>
              <strong className="ramp-tabular-num text-rose">{countOverdue} ca khẩn cấp</strong>
            </div>
          </>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 3. TOOLBAR: Tìm kiếm ⌘ K & Các chip Segment Pill chuẩn Ramp       */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="ramp-filter-toolbar">
        <div className="search-box-wrapper">
          <Search size={14} className="search-icon" />
          <input
            type="text"
            className="ramp-search-input"
            placeholder="⌘ K Tìm kiếm theo Tên, Email, STK, Mã GD, Mã ca khám..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="segment-pills-group">
          <button
            type="button"
            className={`pill-item ${activeSegment === 'ALL' ? 'active' : ''}`}
            onClick={() => setActiveSegment('ALL')}
          >
            <span>Tất cả tác vụ</span>
            <span className="count-badge">{countAll}</span>
          </button>

          <button
            type="button"
            className={`pill-item ${activeSegment === 'WITHDRAWAL' ? 'active' : ''}`}
            onClick={() => setActiveSegment('WITHDRAWAL')}
          >
            <span>Rút tiền</span>
            {countWithdrawals > 0 && <span className="count-badge alert">{countWithdrawals}</span>}
          </button>

          <button
            type="button"
            className={`pill-item ${activeSegment === 'SETTLEMENT' ? 'active' : ''}`}
            onClick={() => setActiveSegment('SETTLEMENT')}
          >
            <span>Quyết toán BS (T+0)</span>
            {countSettlements > 0 && <span className="count-badge">{countSettlements}</span>}
          </button>

          <button
            type="button"
            className={`pill-item ${activeSegment === 'REFUND' ? 'active' : ''}`}
            onClick={() => setActiveSegment('REFUND')}
          >
            <span>Hoàn tiền</span>
            {countRefunds > 0 && <span className="count-badge">{countRefunds}</span>}
          </button>

          {countOverdue > 0 && (
            <button
              type="button"
              className={`pill-item danger ${activeSegment === 'OVERDUE' ? 'active' : ''}`}
              onClick={() => setActiveSegment('OVERDUE')}
            >
              <AlertTriangle size={12} />
              <span>Quá hạn SLA</span>
              <span className="count-badge alert">{countOverdue}</span>
            </button>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 4. DATA TABLE: Bảng danh sách nghiệp vụ hợp nhất chuẩn Ramp       */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="ramp-table-wrapper">
        <table className="ramp-table">
          <thead>
            <tr>
              <th className="col-cb"><input type="checkbox" /></th>
              <th>Mã & Đối tượng thụ hưởng</th>
              <th>Loại nghiệp vụ</th>
              <th>Tham chiếu ca khám / Ngân hàng</th>
              <th className="text-right">Số tiền chi trả</th>
              <th>Cam kết SLA</th>
              <th>Trạng thái</th>
              <th className="text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="text-center py-8">
                  <RotateCw size={16} className="tw-animate-spin tw-inline tw-mr-2" />
                  Đang đồng bộ dữ liệu quyết toán...
                </td>
              </tr>
            ) : filteredItems.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-muted">
                  Không tìm thấy tác vụ quyết toán nào phù hợp với bộ lọc hiện tại.
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => (
                <React.Fragment key={item.id}>
                  <tr>
                    <td className="col-cb"><input type="checkbox" /></td>
                    <td>
                      <div className="entity-cell">
                        <div className="entity-avatar">
                          {item.beneficiaryRole === 'BÁC SĨ' ? <Coins size={14} /> : <User size={14} />}
                        </div>
                        <div className="entity-info">
                          <div className="entity-name">
                            {item.beneficiary?.lastName} {item.beneficiary?.firstName || 'Người dùng'}
                            <span className={`role-tag ${item.beneficiaryRole === 'BÁC SĨ' ? 'doctor' : 'patient'}`}>
                              {item.beneficiaryRole}
                            </span>
                          </div>
                          <div className="entity-sub">
                            {item.beneficiary?.email || item.beneficiary?.phoneNumber || item.id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`op-type-pill ${item.typeBadge}`}>
                        {item.typeLabel}
                      </span>
                    </td>
                    <td>
                      <div className="reference-cell font-mono">
                        {item.reference}
                      </div>
                      <div className="time-sub">
                        {moment(item.createdAt).format('DD/MM/YYYY HH:mm')}
                      </div>
                    </td>
                    <td className="text-right">
                      <span className="ramp-tabular-num font-bold text-red">
                        {formatMoney(item.amount)}
                      </span>
                    </td>
                    <td>
                      <div className="sla-cell">
                        <span className={`sla-badge ${item.isOverdue ? 'overdue' : ''}`}>
                          <Clock size={11} />
                          {item.slaText}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={`ramp-pill ${
                        item.status === 'PENDING' || item.status === 'AVAILABLE'
                          ? 'warning'
                          : item.status === 'TRANSFERRED' || item.status === 'PAID' || item.status === 'APPROVED' || item.status === 'COMPLETED'
                          ? 'success'
                          : 'danger'
                      }`}>
                        {item.status === 'PENDING' || item.status === 'AVAILABLE'
                          ? 'Chờ duyệt chi'
                          : item.status === 'TRANSFERRED' || item.status === 'PAID' || item.status === 'COMPLETED'
                          ? 'Đã giải ngân'
                          : item.status === 'APPROVED'
                          ? 'Đã duyệt'
                          : 'Từ chối'}
                      </span>
                    </td>
                    <td className="text-right">
                      <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="ramp-btn-ghost"
                          style={{ padding: '2px 8px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                          onClick={() => handleOpenLineage(item.raw?.bookingId || item.raw?.id || item.id)}
                          title="Xem toàn bộ chuỗi luân chuyển dòng tiền"
                        >
                          <GitCommit size={12} />
                          <span>Vòng đời</span>
                        </button>
                        {item.type === 'WITHDRAWAL' ? (
                          <button
                            type="button"
                            className={item.status === 'PENDING' ? 'ramp-btn-primary mini' : 'ramp-btn-ghost'}
                            onClick={() => setSelectedWithdrawal(item.raw)}
                          >
                            {item.status === 'PENDING' ? 'Duyệt chi ->' : 'Xem chứng từ'}
                          </button>
                        ) : item.type === 'SETTLEMENT' ? (
                          <button
                            type="button"
                            className={item.status === 'PENDING' ? 'ramp-btn-primary mini' : 'ramp-btn-ghost'}
                            onClick={() => setSelectedSettlement(item.raw)}
                          >
                            {item.status === 'PENDING' ? 'Kết chuyển ví ->' : 'Chi tiết ca'}
                          </button>
                        ) : (
                          <button
                            type="button"
                            className={item.status === 'PENDING' ? 'ramp-btn-primary mini' : 'ramp-btn-ghost'}
                            onClick={() => setSelectedRefund(item.raw)}
                          >
                            {item.status === 'PENDING' ? 'Thẩm định ->' : 'Xem hồ sơ'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Inline Anomaly Row nếu quá hạn SLA */}
                  {item.isOverdue && (
                    <tr className="ramp-anomaly-row">
                      <td colSpan={8}>
                        <div className="ramp-inline-anomaly">
                          <span className="anomaly-arrow">↳</span>
                          <AlertTriangle size={13} />
                          <span>
                            Yêu cầu này đã vượt cam kết SLA ({item.slaText}). Cần ưu tiên chuyển khoản VCB ngay lập tức!
                          </span>
                          <button
                            type="button"
                            className="anomaly-link"
                            onClick={() => setSelectedWithdrawal(item.raw)}
                          >
                            Mở ủy nhiệm chi & duyệt ngay →
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 5. CỬA SỔ LÀM VIỆC 2 CỘT SPLIT-VIEW DUYỆT RÚT TIỀN (ẢNH 3 & 4)    */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <WithdrawalSplitViewWorkspace
        isOpen={Boolean(selectedWithdrawal)}
        withdrawal={selectedWithdrawal}
        onClose={() => !isProcessingWithdrawal && setSelectedWithdrawal(null)}
        onSubmitAction={async ({ action, bankTxnRef, adminNote }) => {
          if (!selectedWithdrawal) return;
          setIsProcessingWithdrawal(true);
          try {
            const res = await processAdminWithdrawal(selectedWithdrawal.id, {
              action,
              adminNote,
              bankTransactionRef: bankTxnRef
            });
            if (res && res.errCode === 0) {
              toast.success('Đã giải ngân rút tiền thành công!');
              setSelectedWithdrawal(null);
              await loadAllData();
            } else {
              toast.error(res?.errMessage || 'Không thể xử lý yêu cầu rút tiền');
            }
          } catch (err) {
            toast.error('Lỗi khi phê duyệt rút tiền');
          } finally {
            setIsProcessingWithdrawal(false);
          }
        }}
        isProcessing={isProcessingWithdrawal}
      />

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 6. MODAL PHÊ DUYỆT QUYẾT TOÁN THÙ LAO BÁC SĨ (T+0 POPOVER)       */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {selectedSettlement && (
        <div className="ramp-popover-backdrop" onClick={() => !isProcessingSettlement && setSelectedSettlement(null)}>
          <div className="ramp-popover-window" onClick={(e) => e.stopPropagation()}>
            <div className="popover-header">
              <h3 className="popover-title">Kết Chuyển Thù Lao Ca Khám Bác Sĩ (T+0)</h3>
              <button
                type="button"
                className="popover-close-btn"
                onClick={() => !isProcessingSettlement && setSelectedSettlement(null)}
              >
                &times;
              </button>
            </div>

            <div className="popover-body">
              <div className="settlement-breakdown-card">
                <div className="card-item">
                  <span>Bác sĩ thụ hưởng:</span>
                  <strong>{selectedSettlement.doctor?.lastName} {selectedSettlement.doctor?.firstName}</strong>
                </div>
                <div className="card-item">
                  <span>Mã ca khám:</span>
                  <span className="font-mono">#{selectedSettlement.bookingId || selectedSettlement.id}</span>
                </div>
                <div className="card-item highlight-split">
                  <span>Thù lao bác sĩ nhận (90%):</span>
                  <strong className="text-emerald ramp-tabular-num">
                    {formatMoney(selectedSettlement.netAmount || selectedSettlement.amount)}
                  </strong>
                </div>
                <div className="card-item sub">
                  <span>Hoa hồng sàn giữ lại (10%):</span>
                  <span className="ramp-tabular-num">{formatMoney((selectedSettlement.amount || 0) * 0.1)}</span>
                </div>
              </div>

              <p className="popover-desc">
                Hệ thống sẽ kết chuyển số tiền trên từ ngăn <strong>Escrow Tạm giữ</strong> vào <strong>Ví điện tử khả dụng của Bác sĩ</strong>. Bác sĩ có thể bấm rút về Vietcombank bất kỳ lúc nào.
              </p>
            </div>

            <div className="popover-footer">
              <button
                type="button"
                className="ramp-btn-secondary"
                onClick={() => setSelectedSettlement(null)}
                disabled={isProcessingSettlement}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="ramp-btn-primary"
                onClick={() => handleConfirmSettlementPayout(selectedSettlement)}
                disabled={isProcessingSettlement}
              >
                <span>{isProcessingSettlement ? 'Đang kết chuyển...' : 'Xác nhận Kết chuyển ->'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 7. MODAL THẨM ĐỊNH HOÀN TIỀN BỆNH NHÂN                           */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {selectedRefund && (
        <div className="ramp-popover-backdrop" onClick={() => !isProcessingRefund && setSelectedRefund(null)}>
          <div className="ramp-popover-window" onClick={(e) => e.stopPropagation()}>
            <div className="popover-header">
              <h3 className="popover-title">Thẩm Định Hồ Sơ Hoàn Tiền Bệnh Nhân</h3>
              <button
                type="button"
                className="popover-close-btn"
                onClick={() => !isProcessingRefund && setSelectedRefund(null)}
              >
                &times;
              </button>
            </div>

            <div className="popover-body">
              <div className="settlement-breakdown-card">
                <div className="card-item">
                  <span>Bệnh nhân:</span>
                  <strong>{selectedRefund.patient?.lastName} {selectedRefund.patient?.firstName}</strong>
                </div>
                <div className="card-item">
                  <span>Số tiền hoàn trả:</span>
                  <strong className="text-red ramp-tabular-num">
                    {formatMoney(selectedRefund.refundAmount || selectedRefund.amount)}
                  </strong>
                </div>
                <div className="card-item sub">
                  <span>Lý do hủy lịch:</span>
                  <span>{selectedRefund.reason || 'Bệnh nhân hủy đúng quy định'}</span>
                </div>
              </div>

              <div className="form-group mt-3">
                <label className="form-label">Ghi chú phân xử của Admin:</label>
                <input
                  type="text"
                  className="ramp-input"
                  placeholder="Nhập ghi chú giải thích căn cứ phê duyệt hoặc từ chối..."
                  value={refundNote}
                  onChange={(e) => setRefundNote(e.target.value)}
                />
              </div>
            </div>

            <div className="popover-footer">
              <button
                type="button"
                className="ramp-btn-secondary text-red"
                onClick={() => handleConfirmRefundReview('REJECTED')}
                disabled={isProcessingRefund}
              >
                Từ chối hoàn
              </button>
              <button
                type="button"
                className="ramp-btn-primary"
                onClick={() => handleConfirmRefundReview('APPROVED')}
                disabled={isProcessingRefund}
              >
                <span>{isProcessingRefund ? 'Đang xử lý...' : 'Chấp thuận Hoàn tiền ->'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 8. DRAWER TRUY VẾT LUỒNG TIỀN KIỂM TOÁN T+0                       */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <MoneyRoutingAuditDrawer
        isOpen={isAuditDrawerOpen}
        onClose={() => setIsAuditDrawerOpen(false)}
        onRefreshParent={loadAllData}
      />

      {/* 9. DRAWER TRUY VẾT VÒNG ĐỜI GIAO DỊCH TOÀN VẸN (LINEAGE) */}
      <TransactionLifecycleDrawer
        isOpen={isLineageDrawerOpen}
        targetId={selectedTxForLineage}
        onClose={() => {
          setIsLineageDrawerOpen(false);
          setSelectedTxForLineage(null);
        }}
      />
    </div>
  );
}

