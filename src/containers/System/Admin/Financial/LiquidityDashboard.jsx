// src/containers/System/Admin/Financial/LiquidityDashboard.jsx
// Trung tâm Quản trị Tài chính & Giám sát Thanh khoản Hệ thống (Executive Liquidity & Solvency Center)
import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import moment from 'moment';
import {
  ShieldAlert,
  ShieldCheck,
  RotateCw,
  Coins,
  Lock,
  Unlock,
  Search,
  Scale,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  AlertOctagon,
  CheckCircle2,
  Wallet,
  Building2,
  Sliders,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  Copy
} from 'lucide-react';
import {
  getAdminLiquidityMetrics,
  recalibrateLedgerBaseline,
  getAdminWalletTransactions,
  getAdminWalletsList,
  toggleWalletStatus,
  getAdminWithdrawalRequests,
  processAdminWithdrawal
} from '../../../../services/walletService';
import WithdrawalPolicyAuditTab from './WithdrawalPolicyAuditTab';
import './LiquidityDashboard.scss';

const LiquidityDashboard = () => {
  // Tabs: 'solvency' | 'ledger' | 'wallets' | 'withdrawals'
  const [activeTab, setActiveTab] = useState('solvency');

  // Solvency Metrics State
  const [reserveRatio, setReserveRatio] = useState(40);
  const [metrics, setMetrics] = useState(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);

  // Ledger Explorer State
  const [transactions, setTransactions] = useState([]);
  const [txTotal, setTxTotal] = useState(0);
  const [txPage, setTxPage] = useState(1);
  const [txLimit] = useState(15);
  const [txType, setTxType] = useState('ALL');
  const [txDirection, setTxDirection] = useState('ALL');
  const [txSearch, setTxSearch] = useState('');
  const [loadingTx, setLoadingTx] = useState(false);

  // Wallets Management State
  const [wallets, setWallets] = useState([]);
  const [walletsTotal, setWalletsTotal] = useState(0);
  const [walletsPage, setWalletsPage] = useState(1);
  const [walletsLimit] = useState(15);
  const [walletStatusFilter, setWalletStatusFilter] = useState('ALL');
  const [walletSearch, setWalletSearch] = useState('');
  const [loadingWallets, setLoadingWallets] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // [PHASE 3] Withdrawals Center State
  const [withdrawals, setWithdrawals] = useState([]);
  const [withdrawalStats, setWithdrawalStats] = useState(null);
  const [withdrawalsTotal, setWithdrawalsTotal] = useState(0);
  const [withdrawalsPage, setWithdrawalsPage] = useState(1);
  const [withdrawalsLimit] = useState(15);
  const [withdrawalStatusFilter, setWithdrawalStatusFilter] = useState('ALL');
  const [withdrawalSearch, setWithdrawalSearch] = useState('');
  const [loadingWithdrawals, setLoadingWithdrawals] = useState(false);

  // Modal xử lý rút tiền
  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
  const [processAction, setProcessAction] = useState('TRANSFER'); // 'TRANSFER' | 'REJECT'
  const [adminProcessNote, setAdminProcessNote] = useState('');
  const [bankTxnRef, setBankTxnRef] = useState('');
  const [receiptImg, setReceiptImg] = useState('');
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [recalibrating, setRecalibrating] = useState(false);

  // Format currency
  const formatMoney = (amount) => {
    return (Number(amount) || 0).toLocaleString('vi-VN') + ' ₫';
  };

  const handleRecalibrateLedger = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn chạy công cụ Hiệu chuẩn Sổ cái để tạo bút toán đối ứng cho các số dư ví ban đầu chưa có vết kế toán không?')) {
      return;
    }
    setRecalibrating(true);
    try {
      const res = await recalibrateLedgerBaseline();
      if (res && res.errCode === 0) {
        toast.success(res.message || 'Hiệu chuẩn Sổ cái thành công!');
        loadMetrics();
      } else {
        toast.error(res?.errMessage || 'Không thể hiệu chuẩn sổ cái');
      }
    } catch (err) {
      toast.error('Lỗi khi gọi API hiệu chuẩn: ' + err.message);
    } finally {
      setRecalibrating(false);
    }
  };

  // Load Liquidity Metrics
  const loadMetrics = useCallback(async (ratioVal = reserveRatio) => {
    setLoadingMetrics(true);
    try {
      const res = await getAdminLiquidityMetrics({ reserveRatio: ratioVal });
      if (res && res.errCode === 0 && res.data) {
        setMetrics(res.data);
      } else {
        toast.error(res?.errMessage || 'Không thể tải chỉ số thanh khoản');
      }
    } catch (err) {
      toast.error('Lỗi khi kết nối máy chủ quản trị tài chính');
    } finally {
      setLoadingMetrics(false);
    }
  }, [reserveRatio]);

  // Load Ledger Transactions
  const loadTransactions = useCallback(async () => {
    setLoadingTx(true);
    try {
      const res = await getAdminWalletTransactions({
        page: txPage,
        limit: txLimit,
        type: txType !== 'ALL' ? txType : undefined,
        direction: txDirection !== 'ALL' ? txDirection : undefined,
        search: txSearch.trim() || undefined,
      });
      if (res && res.errCode === 0 && res.data) {
        setTransactions(res.data.transactions || []);
        setTxTotal(res.data.total || 0);
      }
    } catch (err) {
      toast.error('Lỗi khi tải lịch sử giao dịch sổ cái');
    } finally {
      setLoadingTx(false);
    }
  }, [txPage, txLimit, txType, txDirection, txSearch]);

  // Load Wallets List
  const loadWallets = useCallback(async () => {
    setLoadingWallets(true);
    try {
      const res = await getAdminWalletsList({
        page: walletsPage,
        limit: walletsLimit,
        status: walletStatusFilter !== 'ALL' ? walletStatusFilter : undefined,
        search: walletSearch.trim() || undefined,
      });
      if (res && res.errCode === 0 && res.data) {
        setWallets(res.data.wallets || []);
        setWalletsTotal(res.data.total || 0);
      }
    } catch (err) {
      toast.error('Lỗi khi tải danh sách ví người dùng');
    } finally {
      setLoadingWallets(false);
    }
  }, [walletsPage, walletsLimit, walletStatusFilter, walletSearch]);

  // [PHASE 3] Load Withdrawals List
  const loadWithdrawals = useCallback(async () => {
    setLoadingWithdrawals(true);
    try {
      const res = await getAdminWithdrawalRequests({
        page: withdrawalsPage,
        limit: withdrawalsLimit,
        status: withdrawalStatusFilter !== 'ALL' ? withdrawalStatusFilter : undefined,
        search: withdrawalSearch.trim() || undefined,
      });
      if (res && res.errCode === 0 && res.data) {
        setWithdrawals(res.data.requests || []);
        setWithdrawalsTotal(res.data.total || 0);
        setWithdrawalStats(res.data.stats || {});
      }
    } catch (err) {
      toast.error('Lỗi khi tải danh sách yêu cầu rút tiền');
    } finally {
      setLoadingWithdrawals(false);
    }
  }, [withdrawalsPage, withdrawalsLimit, withdrawalStatusFilter, withdrawalSearch]);

  // Initial load
  useEffect(() => {
    loadMetrics();
    loadWithdrawals(); // tải sớm để lấy badge pending count
  }, [loadMetrics, loadWithdrawals]);

  useEffect(() => {
    if (activeTab === 'ledger') {
      loadTransactions();
    } else if (activeTab === 'wallets') {
      loadWallets();
    } else if (activeTab === 'withdrawals') {
      loadWithdrawals();
    }
  }, [activeTab, loadTransactions, loadWallets, loadWithdrawals]);

  // Handle Slider Change
  const handleReserveRatioChange = (e) => {
    const val = parseInt(e.target.value, 10);
    setReserveRatio(val);
    loadMetrics(val);
  };

  // Toggle Wallet Status (Lock / Unlock)
  const handleToggleStatus = async (wallet) => {
    const targetStatus = wallet.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE';
    const actionLabel = targetStatus === 'LOCKED' ? 'khóa' : 'mở khóa';

    if (!window.confirm(`Bạn có chắc chắn muốn ${actionLabel} ví của người dùng này?`)) {
      return;
    }

    setActionLoadingId(wallet.id);
    try {
      const res = await toggleWalletStatus(wallet.id, {
        targetStatus,
        adminNote: `Admin ${actionLabel} ví từ Executive Dashboard`,
      });
      if (res && res.errCode === 0) {
        toast.success(`Đã ${actionLabel} ví thành công!`);
        loadWallets();
      } else {
        toast.error(res?.errMessage || `Không thể ${actionLabel} ví`);
      }
    } catch (err) {
      toast.error('Lỗi hệ thống khi cập nhật trạng thái ví');
    } finally {
      setActionLoadingId(null);
    }
  };

  // [PHASE 3] Modal Handlers for Processing Withdrawal
  const handleOpenProcessModal = (reqItem) => {
    setSelectedWithdrawal(reqItem);
    setProcessAction('TRANSFER');
    setBankTxnRef(`NAPAS247-${Date.now().toString().slice(-6)}`);
    setAdminProcessNote('');
    setReceiptImg('');
  };

  const handleCopyAccountNumber = (accNum) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(accNum);
      toast.info(`Đã sao chép số tài khoản: ${accNum}`);
    }
  };

  const handleProcessWithdrawalSubmit = async (e) => {
    e.preventDefault();
    if (!selectedWithdrawal) return;

    if (processAction === 'TRANSFER' && !bankTxnRef.trim()) {
      toast.warning('Vui lòng nhập Mã giao dịch ngân hàng / Ủy nhiệm chi.');
      return;
    }

    if (processAction === 'REJECT' && !adminProcessNote.trim()) {
      toast.warning('Vui lòng nhập lý do từ chối yêu cầu rút tiền.');
      return;
    }

    setIsProcessingAction(true);
    try {
      const res = await processAdminWithdrawal(selectedWithdrawal.id, {
        action: processAction,
        adminNote: adminProcessNote.trim(),
        bankTransactionRef: bankTxnRef.trim(),
        receiptImage: receiptImg || null,
      });

      if (res && res.errCode === 0) {
        toast.success(res.errMessage || 'Đã xử lý yêu cầu rút tiền thành công!');
        setSelectedWithdrawal(null);
        loadWithdrawals();
        loadMetrics();
      } else {
        toast.error(res?.errMessage || 'Không thể xử lý yêu cầu rút tiền');
      }
    } catch (err) {
      toast.error('Lỗi khi xử lý yêu cầu rút tiền');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const summary = metrics?.summary || {};
  const solvency = metrics?.solvency || {};
  const rec = metrics?.reconciliation || {};

  return (
    <div className="liquidity-dashboard-page">
      {/* ===== HEADER BAR ===== */}
      <div className="ld-header-bar">
        <div className="ld-title-group">
          <div className="ld-badge-sub">
            <Scale size={13} />
            <span>Financial Governance & Solvency Guard</span>
          </div>
          <h2>Giám Sát Thanh Khoản & Sổ Cái Toàn Sàn</h2>
          <p>Bảo chứng khả năng hoàn tiền tức thì, kiểm soát rủi ro thanh khoản và quản trị dòng tiền đầu tư.</p>
        </div>

        <div className="ld-header-actions">
          {solvency.solvencyRatio && (
            <div className="solvency-badge">
              <div
                className="solvency-pulse"
                style={{ background: solvency.solvencyColor || '#10b981' }}
              />
              <div className="solvency-info">
                <span
                  className="solvency-ratio-num"
                  style={{ color: solvency.solvencyColor || '#10b981' }}
                >
                  Hệ số Bảo chứng: {solvency.solvencyRatio}x
                </span>
                <span className="solvency-ratio-desc">{solvency.solvencyLabel}</span>
              </div>
            </div>
          )}

          <button
            type="button"
            className="btn-refresh"
            onClick={() => {
              loadMetrics();
              if (activeTab === 'withdrawals') loadWithdrawals();
              if (activeTab === 'ledger') loadTransactions();
              if (activeTab === 'wallets') loadWallets();
            }}
            disabled={loadingMetrics}
          >
            <RotateCw size={14} className={loadingMetrics ? 'tw-animate-spin' : ''} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* ===== ALERT BANNER THANH KHOẢN ===== */}
      {solvency.solvencyStatus && (
        <div className={`ld-alert-banner ld-alert-banner--${solvency.solvencyStatus.toLowerCase()}`}>
          <div className="alert-icon-box">
            {solvency.solvencyStatus === 'OPTIMAL' || solvency.solvencyStatus === 'HEALTHY' ? (
              <ShieldCheck size={24} />
            ) : (
              <ShieldAlert size={24} />
            )}
          </div>
          <div className="alert-content">
            <h4>{solvency.solvencyLabel}</h4>
            <p>
              {solvency.solvencyStatus === 'OPTIMAL' &&
                'Dòng tiền mặt nạp vào hệ thống hoàn toàn vượt trội so với tổng nghĩa vụ nợ của bệnh nhân và bác sĩ. Hệ thống hoạt động an toàn tuyệt đối với rủi ro thanh khoản bằng 0.'}
              {solvency.solvencyStatus === 'HEALTHY' &&
                'Hệ thống duy trì đủ tiền mặt bảo chứng trên 110% cho mọi khoản tiền gửi khả dụng và tiền cọc. Mọi yêu cầu hủy lịch đều được hoàn tiền tự động 100% trong tích tắc.'}
              {solvency.solvencyStatus === 'WARNING' &&
                'Lượng tiền mặt thực tế đang tiệm cận mức an toàn tối thiểu. Đề nghị chủ sàn tạm dừng rút thêm vốn đầu tư ra khỏi tài khoản thanh toán cho đến khi có thêm dòng tiền nạp mới.'}
              {solvency.solvencyStatus === 'CRITICAL' &&
                'CẢNH BÁO NGUY HIỂM: Tổng nợ nghĩa vụ hoàn tiền cao hơn lượng tiền mặt thực tế trong hệ thống. NGHIÊM CẤM rút vốn ra khỏi sàn để tránh rủi ro vỡ nợ thanh khoản khi bệnh nhân hủy lịch!'}
            </p>
          </div>
        </div>
      )}

      {/* ===== 4 EXECUTIVE KPI CARDS ===== */}
      <div className="ld-kpi-grid">
        {/* KPI 1: Tổng Nợ Nghĩa Vụ */}
        <div className="kpi-card kpi-card--liability">
          <div className="kpi-card-header">
            <span className="kpi-title">Tổng Nghĩa Vụ Phải Trả</span>
            <div className="kpi-icon-wrap tw-bg-amber-50 tw-text-amber-600">
              <Coins size={18} />
            </div>
          </div>
          <div className="kpi-value">{formatMoney(summary.totalLiabilities)}</div>
          <div className="kpi-breakdown">
            <div className="breakdown-item">
              <span>Ví bệnh nhân:</span>
              <strong>{formatMoney(summary.patientAvailableLiability)}</strong>
            </div>
            <div className="breakdown-item">
              <span>Ví Bác sĩ:</span>
              <strong>{formatMoney(summary.doctorWalletLiability || 0)}</strong>
            </div>
            <div className="breakdown-item">
              <span>Ký quỹ giữ chỗ (Hold):</span>
              <strong>{formatMoney(summary.escrowActiveHolds)}</strong>
            </div>
            <div className="breakdown-item">
              <span>Thù lao chờ duyệt chi:</span>
              <strong>{formatMoney(summary.doctorPayables)}</strong>
            </div>
          </div>
        </div>

        {/* KPI 2: Dòng tiền thực tế nạp */}
        <div className="kpi-card kpi-card--inflow">
          <div className="kpi-card-header">
            <span className="kpi-title">Dòng Tiền Thực Tế Nạp Vào</span>
            <div className="kpi-icon-wrap tw-bg-emerald-50 tw-text-emerald-600">
              <ArrowDownLeft size={18} />
            </div>
          </div>
          <div className="kpi-value">{formatMoney(summary.totalCashInflow)}</div>
          <div className="kpi-meta">
            <span>Tổng cộng <strong>{summary.totalDepositCount || 0}</strong> lượt nạp qua VNPay</span>
            <span className="kpi-subtext">
              Đã chi/rút: <strong style={{ color: '#E11D48' }}>{formatMoney(summary.totalCashOutflow || 0)}</strong> • Két tồn: <strong style={{ color: '#059669' }}>{formatMoney(summary.realNetCashInTreasury !== undefined ? summary.realNetCashInTreasury : summary.totalCashInflow)}</strong>
            </span>
          </div>
        </div>

        {/* KPI 3: Quỹ dự trữ bắt buộc */}
        <div className="kpi-card kpi-card--reserve">
          <div className="kpi-card-header">
            <span className="kpi-title">Quỹ Dự Trữ Thanh Khoản ({reserveRatio}%)</span>
            <div className="kpi-icon-wrap tw-bg-sky-50 tw-text-sky-600">
              <Lock size={18} />
            </div>
          </div>
          <div className="kpi-value">{formatMoney(solvency.mandatoryReserveCash)}</div>
          <div className="kpi-meta">
            <span className="tw-text-amber-600 tw-font-semibold">
              Khóa cứng bảo chứng hoàn tiền — Không được rút
            </span>
            <div className="reserve-slider-wrap tw-mt-2">
              <div className="tw-flex tw-justify-between tw-text-xs tw-text-slate-500 tw-mb-1">
                <span>Tỷ lệ dự trữ:</span>
                <span className="tw-font-bold tw-text-slate-800">{reserveRatio}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="80"
                step="5"
                value={reserveRatio}
                onChange={handleReserveRatioChange}
                className="tw-w-full tw-h-1.5 tw-bg-slate-200 tw-rounded-lg tw-appearance-none tw-cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* KPI 4: Tiền được phép rút đi đầu tư */}
        <div className="kpi-card kpi-card--withdrawable">
          <div className="kpi-card-header">
            <span className="kpi-title">Vốn Khả Dụng Rút Đầu Tư</span>
            <div className="kpi-icon-wrap tw-bg-indigo-50 tw-text-indigo-600">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="kpi-value tw-text-indigo-600">
            {formatMoney(solvency.netWithdrawableLiquidity)}
          </div>
          <div className="kpi-meta">
            <span>Chủ sàn được phép điều phối vốn mà không làm ảnh hưởng thanh khoản</span>
            <span className="tw-text-emerald-600 tw-font-medium">
              Đảm bảo 100% khả năng hoàn tiền tức thì khi hủy lịch
            </span>
          </div>
        </div>
      </div>

      {/* ===== NAVIGATION TABS ===== */}
      <div className="ld-tabs-container tw-mt-6">
        <div className="ld-tabs-nav">
          <button
            type="button"
            className={`tab-btn ${activeTab === 'solvency' ? 'active' : ''}`}
            onClick={() => setActiveTab('solvency')}
          >
            <Scale size={15} />
            <span>Phân Bổ Vốn & Đối Soát Kế Toán Kép</span>
          </button>

          <button
            type="button"
            className={`tab-btn ${activeTab === 'withdrawals' ? 'active' : ''}`}
            onClick={() => setActiveTab('withdrawals')}
          >
            <ArrowUpRight size={15} />
            <span>Trung Tâm Duyệt Rút Tiền</span>
            {withdrawalStats?.pendingCount > 0 && (
              <span className="tab-badge" style={{ background: '#fee2e2', color: '#b91c1c' }}>
                {withdrawalStats.pendingCount} chờ duyệt
              </span>
            )}
          </button>

          <button
            type="button"
            className={`tab-btn ${activeTab === 'ledger' ? 'active' : ''}`}
            onClick={() => setActiveTab('ledger')}
          >
            <FileSpreadsheet size={15} />
            <span>Sổ Cái Giao Dịch Toàn Sàn (Audit Trail)</span>
            <span className="tab-badge">{txTotal}</span>
          </button>

          <button
            type="button"
            className={`tab-btn ${activeTab === 'wallets' ? 'active' : ''}`}
            onClick={() => setActiveTab('wallets')}
          >
            <Wallet size={15} />
            <span>Danh Sách Ví Bệnh Nhân</span>
            <span className="tab-badge">{walletsTotal}</span>
          </button>

          <button
            type="button"
            className={`tab-btn ${activeTab === 'withdrawal-policy' ? 'active' : ''}`}
            onClick={() => setActiveTab('withdrawal-policy')}
          >
            <Clock size={15} />
            <span>Chính Sách Hoàn Tiền / SLA & Kiểm Toán</span>
            <span className="tab-badge" style={{ background: '#e0e7ff', color: '#3730a3' }}>Linh hoạt</span>
          </button>
        </div>

        <div className="ld-tab-body">
          {/* ══════════════ TAB 1: SOLVENCY & RECONCILIATION ══════════════ */}
          {activeTab === 'solvency' && (
            <div className="tab-solvency-layout">
              {/* Cột 1: Phân tách chi tiết nghĩa vụ nợ */}
              <div className="solvency-box">
                <div className="box-head">
                  <h3>
                    <Building2 size={16} />
                    <span>Cấu Trúc Nghĩa Vụ Nợ Hệ Thống (Liability Breakdown)</span>
                  </h3>
                  <span className="box-tag">Thời gian thực</span>
                </div>

                <div className="liability-breakdown-list">
                  <div className="breakdown-row">
                    <div className="row-left">
                      <div className="bullet tw-bg-emerald-500" />
                      <div>
                        <div className="row-title">Tiền gửi khả dụng trong ví bệnh nhân</div>
                        <div className="row-hint">Bệnh nhân có thể dùng đặt khám hoặc rút về ngân hàng bất kỳ lúc nào</div>
                      </div>
                    </div>
                    <div className="row-right">
                      <div className="row-val">{formatMoney(summary.patientAvailableLiability)}</div>
                      <div className="row-percent">
                        {summary.totalLiabilities > 0
                          ? ((summary.patientAvailableLiability / summary.totalLiabilities) * 100).toFixed(1)
                          : 0}
                        %
                      </div>
                    </div>
                  </div>

                  <div className="breakdown-row">
                    <div className="row-left">
                      <div className="bullet tw-bg-indigo-500" />
                      <div>
                        <div className="row-title">Số dư lưu ký trong Ví Bác sĩ (Doctor Wallets)</div>
                        <div className="row-hint">Thù lao của {summary.totalDoctorWallets || 0} bác sĩ đã đối soát vào ví nội bộ chờ rút</div>
                      </div>
                    </div>
                    <div className="row-right">
                      <div className="row-val">{formatMoney(summary.doctorWalletLiability || 0)}</div>
                      <div className="row-percent">
                        {summary.totalLiabilities > 0
                          ? (((summary.doctorWalletLiability || 0) / summary.totalLiabilities) * 100).toFixed(1)
                          : 0}
                        %
                      </div>
                    </div>
                  </div>

                  <div className="breakdown-row">
                    <div className="row-left">
                      <div className="bullet tw-bg-amber-500" />
                      <div>
                        <div className="row-title">Tiền ký quỹ giữ chỗ ca khám (Escrow Holds)</div>
                        <div className="row-hint">
                          Đang tạm giữ cho {summary.activeHoldCount || 0} ca khám chờ thực hiện (S2)
                        </div>
                      </div>
                    </div>
                    <div className="row-right">
                      <div className="row-val">{formatMoney(summary.escrowActiveHolds)}</div>
                      <div className="row-percent">
                        {summary.totalLiabilities > 0
                          ? ((summary.escrowActiveHolds / summary.totalLiabilities) * 100).toFixed(1)
                          : 0}
                        %
                      </div>
                    </div>
                  </div>

                  <div className="breakdown-row">
                    <div className="row-left">
                      <div className="bullet tw-bg-sky-500" />
                      <div>
                        <div className="row-title">Thù lao chờ thanh toán Bác sĩ / Cơ sở y tế</div>
                        <div className="row-hint">Khoản quyết toán thù lao ca khám đã hoàn thành đang chờ duyệt chi</div>
                      </div>
                    </div>
                    <div className="row-right">
                      <div className="row-val">{formatMoney(summary.doctorPayables)}</div>
                      <div className="row-percent">
                        {summary.totalLiabilities > 0
                          ? ((summary.doctorPayables / summary.totalLiabilities) * 100).toFixed(1)
                          : 0}
                        %
                      </div>
                    </div>
                  </div>
                </div>

                {/* Khối giải thích công thức */}
                <div className="tw-mt-4 tw-p-3 tw-bg-slate-50 tw-rounded-lg tw-border tw-border-slate-200 tw-text-xs tw-text-slate-600">
                  <div className="tw-font-bold tw-text-slate-800 tw-mb-1">Công thức quản trị vốn đầu tư an toàn:</div>
                  <code>Vốn được rút = Max(0, Dòng tiền nạp - Quỹ dự trữ {reserveRatio}% - Tiền giữ cọc)</code>
                  <p className="tw-mt-1 tw-mb-0">
                    Nguyên tắc bất biến: Chủ hệ thống chỉ được rút thặng dư tiền mặt sau khi đã cô lập hoàn toàn nguồn tiền bảo chứng hoàn trả cho bệnh nhân.
                  </p>
                </div>
              </div>

              {/* Cột 2: Đối soát Kế toán kép (Double-Entry Reconciliation) */}
              <div className="solvency-box">
                <div className="box-head">
                  <h3>
                    <Scale size={16} />
                    <span>Đối Soát Sổ Cái Kép (Ledger Balance)</span>
                  </h3>
                  <span className="box-tag">Tự động</span>
                </div>

                <div className="reconciliation-card">
                  <div className="reconciliation-status">
                    {rec.isLedgerBalanced ? (
                      <div className="status-badge-rec status-badge-rec--ok">
                        <CheckCircle2 size={16} />
                        <span>Sổ Cái Cân Bằng Hoàn Hảo (Zero Discrepancy)</span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div className="status-badge-rec status-badge-rec--error">
                          <AlertOctagon size={16} />
                          <span>Phát hiện Lệch Sổ Cái: {formatMoney(rec.discrepancy)}</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleRecalibrateLedger}
                          disabled={recalibrating}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                            padding: '8px 14px',
                            background: '#087F8C',
                            color: '#FFFFFF',
                            borderRadius: 6,
                            border: 'none',
                            fontWeight: 600,
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            boxShadow: '0 2px 4px rgba(8, 127, 140, 0.2)'
                          }}
                        >
                          <RotateCw size={14} className={recalibrating ? 'tw-animate-spin' : ''} />
                          <span>{recalibrating ? 'Đang hiệu chuẩn Sổ cái...' : 'Hiệu chuẩn Số dư ban đầu (Ledger Baseline Calibration)'}</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="rec-table tw-mt-4">
                    <div className="rec-row">
                      <span>Tổng phát sinh Có (CREDIT - Nạp & Hoàn):</span>
                      <strong className="tw-text-emerald-600">+{formatMoney(rec.ledgerCredits)}</strong>
                    </div>
                    <div className="rec-row">
                      <span>Tổng phát sinh Nợ (DEBIT - Chi tiêu & Rút):</span>
                      <strong className="tw-text-rose-600">-{formatMoney(rec.ledgerDebits)}</strong>
                    </div>
                    <div className="rec-divider" />
                    <div className="rec-row tw-font-bold">
                      <span>Biến động số dư Sổ cái ròng (Net Ledger):</span>
                      <span>{formatMoney(rec.netLedgerBalance)}</span>
                    </div>
                    <div className="rec-row tw-font-bold">
                      <span>Tổng số dư ghi nhận trên bảng Wallets:</span>
                      <span>{formatMoney(rec.sumWalletsBalance)}</span>
                    </div>
                  </div>

                  <div className="tw-mt-4 tw-p-3 tw-bg-emerald-50 tw-rounded-lg tw-border tw-border-emerald-200 tw-text-xs tw-text-emerald-800">
                    <div className="tw-font-bold tw-mb-1">Tính bất biến của Sổ cái (Ledger Immutability):</div>
                    Bảng <code>Wallet_Transactions</code> thiết lập <code>updatedAt: false</code> và cấm lệnh DELETE/UPDATE. Mọi biến động tài sản đều được ký snapshot <code>balanceAfter</code> và ràng buộc khóa duy nhất <code>idempotencyKey</code>.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════ TAB 2: [PHASE 3] TRUNG TÂM DUYỆT RÚT TIỀN ══════════════ */}
          {activeTab === 'withdrawals' && (
            <div className="tab-withdrawals-layout">
              {/* Thống kê nhanh */}
              <div className="tw-grid tw-grid-cols-5 tw-gap-3.5 tw-mb-5">
                <div className="tw-bg-slate-50 tw-p-3 tw-rounded-xl tw-border tw-border-slate-200">
                  <div className="tw-text-xs tw-text-slate-500 tw-font-semibold">Tổng yêu cầu rút</div>
                  <div className="tw-text-xl tw-font-extrabold tw-text-slate-800 tw-mt-1">
                    {withdrawalStats?.totalRequests || 0}
                  </div>
                </div>

                <div className="tw-bg-amber-50 tw-p-3 tw-rounded-xl tw-border tw-border-amber-200">
                  <div className="tw-text-xs tw-text-amber-700 tw-font-semibold">Đang chờ xử lý</div>
                  <div className="tw-text-xl tw-font-extrabold tw-text-amber-800 tw-mt-1">
                    {withdrawalStats?.pendingCount || 0} ca
                    <span className="tw-text-xs tw-font-bold tw-text-amber-600 tw-ml-1">
                      ({formatMoney(withdrawalStats?.pendingAmount)})
                    </span>
                  </div>
                </div>

                <div className="tw-bg-emerald-50 tw-p-3 tw-rounded-xl tw-border tw-border-emerald-200">
                  <div className="tw-text-xs tw-text-emerald-700 tw-font-semibold">Đã chuyển khoản</div>
                  <div className="tw-text-xl tw-font-extrabold tw-text-emerald-800 tw-mt-1">
                    {withdrawalStats?.transferredCount || 0} ca
                  </div>
                </div>

                <div className="tw-bg-rose-50 tw-p-3 tw-rounded-xl tw-border tw-border-rose-200">
                  <div className="tw-text-xs tw-text-rose-700 tw-font-semibold">Bị từ chối</div>
                  <div className="tw-text-xl tw-font-extrabold tw-text-rose-800 tw-mt-1">
                    {withdrawalStats?.rejectedCount || 0} ca
                  </div>
                </div>

                <div className={`tw-p-3 tw-rounded-xl tw-border ${
                  withdrawalStats?.overdueCount > 0
                    ? 'tw-bg-rose-100/90 tw-border-rose-300'
                    : 'tw-bg-slate-50 tw-border-slate-200'
                }`}>
                  <div className={`tw-text-xs tw-font-semibold ${
                    withdrawalStats?.overdueCount > 0 ? 'tw-text-rose-800' : 'tw-text-slate-500'
                  }`}>
                    Quá hạn cam kết (SLA)
                  </div>
                  <div className={`tw-text-xl tw-font-extrabold tw-mt-1 ${
                    withdrawalStats?.overdueCount > 0 ? 'tw-text-rose-700' : 'tw-text-slate-700'
                  }`}>
                    {withdrawalStats?.overdueCount || 0} ca
                  </div>
                </div>
              </div>

              {/* Bộ lọc & Tìm kiếm */}
              <div className="ld-filters-bar">
                <div className="ld-search-box">
                  <Search size={14} />
                  <input
                    type="text"
                    placeholder="Tìm theo Tên, Email, SĐT, STK, Ngân hàng, Mã GD..."
                    value={withdrawalSearch}
                    onChange={(e) => {
                      setWithdrawalSearch(e.target.value);
                      setWithdrawalsPage(1);
                    }}
                  />
                </div>

                <div className="ld-filter-selects">
                  <select
                    value={withdrawalStatusFilter}
                    onChange={(e) => {
                      setWithdrawalStatusFilter(e.target.value);
                      setWithdrawalsPage(1);
                    }}
                  >
                    <option value="ALL">Tất cả trạng thái</option>
                    <option value="PENDING">Chờ xử lý (PENDING)</option>
                    <option value="TRANSFERRED">Đã chuyển khoản (TRANSFERRED)</option>
                    <option value="REJECTED">Bị từ chối (REJECTED)</option>
                    <option value="CANCELLED">Đã hủy (CANCELLED)</option>
                  </select>
                </div>
              </div>

              {/* Bảng danh sách yêu cầu rút tiền */}
              <div className="ld-table-wrapper tw-mt-4">
                <table className="ld-data-table">
                  <thead>
                    <tr>
                      <th>Mã & Ngày gửi</th>
                      <th>Người yêu cầu</th>
                      <th>Tài khoản nhận tiền</th>
                      <th>Số tiền rút</th>
                      <th>Hạn chót cam kết (SLA)</th>
                      <th>Trạng thái</th>
                      <th>Thông tin xử lý</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingWithdrawals ? (
                      <tr>
                        <td colSpan="8" className="tw-text-center tw-py-8 tw-text-slate-400">
                          <RotateCw size={18} className="tw-animate-spin tw-inline tw-mr-2" />
                          Đang tải danh sách yêu cầu rút tiền...
                        </td>
                      </tr>
                    ) : withdrawals.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="tw-text-center tw-py-8 tw-text-slate-400">
                          Không tìm thấy yêu cầu rút tiền nào phù hợp
                        </td>
                      </tr>
                    ) : (
                      withdrawals.map((req) => {
                        const owner = req.wallet?.owner;
                        const isDoctor = req.wallet?.walletType === 'DOCTOR';
                        return (
                          <tr key={req.id}>
                            <td>
                              <div className="tw-font-bold tw-text-slate-800">#WTH-{req.id}</div>
                              <div className="tw-text-xs tw-text-slate-400">
                                {moment(req.createdAt).format('DD/MM/YYYY HH:mm')}
                              </div>
                            </td>
                            <td>
                              <div className="tw-font-semibold tw-text-slate-800">
                                {owner?.lastName} {owner?.firstName}
                                {isDoctor && (
                                  <span className="tw-ml-1.5 tw-px-1.5 tw-py-0.5 tw-bg-indigo-100 tw-text-indigo-700 tw-rounded tw-text-2xs tw-font-bold">
                                    BÁC SĨ
                                  </span>
                                )}
                              </div>
                              <div className="tw-text-xs tw-text-slate-500">{owner?.email}</div>
                              <div className="tw-text-xs tw-text-slate-400">{owner?.phoneNumber}</div>
                            </td>
                            <td>
                              <div className="tw-font-semibold tw-text-slate-800 tw-flex tw-items-center tw-gap-1">
                                {req.bankName}
                              </div>
                              <div className="tw-text-xs tw-text-slate-700 tw-font-mono tw-flex tw-items-center tw-gap-1.5">
                                STK: <strong>{req.accountNumber}</strong>
                                <button
                                  type="button"
                                  className="tw-text-slate-400 hover:tw-text-slate-600"
                                  onClick={() => handleCopyAccountNumber(req.accountNumber)}
                                  title="Sao chép STK"
                                >
                                  <Copy size={11} />
                                </button>
                              </div>
                              <div className="tw-text-xs tw-text-slate-500">Chủ TK: {req.accountHolderName}</div>
                            </td>
                            <td>
                              <span className="tw-font-bold tw-text-rose-600 tw-text-sm">
                                {formatMoney(req.amount)}
                              </span>
                            </td>
                            <td>
                              <div className="tw-font-bold tw-text-teal-700 tw-text-xs">
                                {req.appliedSlaDays ? `${req.appliedSlaDays} ngày` : 'Mặc định'}
                              </div>
                              <div className={`tw-text-2xs ${req.isOverdue ? 'tw-text-rose-600 tw-font-bold' : 'tw-text-slate-500'}`}>
                                Hạn: {req.promisedPayoutDate ? moment(req.promisedPayoutDate).format('DD/MM/YYYY') : '---'}
                              </div>
                              {req.isOverdue && (
                                <span className="tw-px-1.5 tw-py-0.5 tw-bg-rose-100 tw-text-rose-700 tw-rounded tw-text-3xs tw-font-bold tw-inline-block tw-mt-0.5">
                                  Quá hạn SLA
                                </span>
                              )}
                            </td>
                            <td>
                              {req.status === 'PENDING' && (
                                <span className="badge-tag" style={{ background: '#fef3c7', color: '#b45309' }}>
                                  <Clock size={10} className="tw-inline tw-mr-1" /> Chờ duyệt
                                </span>
                              )}
                              {req.status === 'TRANSFERRED' && (
                                <span className="badge-tag" style={{ background: '#dcfce7', color: '#15803d' }}>
                                  <CheckCircle size={10} className="tw-inline tw-mr-1" /> Đã chuyển
                                </span>
                              )}
                              {req.status === 'REJECTED' && (
                                <span className="badge-tag" style={{ background: '#fee2e2', color: '#b91c1c' }}>
                                  <XCircle size={10} className="tw-inline tw-mr-1" /> Bị từ chối
                                </span>
                              )}
                              {req.status === 'CANCELLED' && (
                                <span className="badge-tag" style={{ background: '#f1f5f9', color: '#64748b' }}>
                                  Đã hủy
                                </span>
                              )}
                            </td>
                            <td>
                              {req.bankTransactionRef && (
                                <div className="tw-text-xs tw-text-emerald-700 tw-font-semibold">
                                  GD: {req.bankTransactionRef}
                                </div>
                              )}
                              {req.adminNote && (
                                <div className="tw-text-xs tw-text-slate-600 tw-max-w-xs tw-truncate" title={req.adminNote}>
                                  {req.adminNote}
                                </div>
                              )}
                              {req.admin && (
                                <div className="tw-text-2xs tw-text-slate-400">
                                  Duyệt bởi: {req.admin.lastName} {req.admin.firstName}
                                </div>
                              )}
                              {req.userNote && (
                                <div className="tw-text-2xs tw-text-slate-400 tw-italic">
                                  Lời nhắn: "{req.userNote}"
                                </div>
                              )}
                            </td>
                            <td>
                              {req.status === 'PENDING' ? (
                                <button
                                  type="button"
                                  className="tw-px-3 tw-py-1.5 tw-bg-teal-600 hover:tw-bg-teal-700 tw-text-white tw-rounded-lg tw-text-xs tw-font-bold tw-flex tw-items-center tw-gap-1 tw-shadow-sm"
                                  onClick={() => handleOpenProcessModal(req)}
                                >
                                  <ArrowUpRight size={13} />
                                  <span>Xử lý</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="tw-px-2.5 tw-py-1 tw-bg-slate-100 hover:tw-bg-slate-200 tw-text-slate-600 tw-rounded tw-text-xs tw-font-medium"
                                  onClick={() => handleOpenProcessModal(req)}
                                >
                                  Xem chi tiết
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Phân trang */}
              <div className="ld-pagination">
                <span>
                  Hiển thị {(withdrawalsPage - 1) * withdrawalsLimit + 1} - {Math.min(withdrawalsPage * withdrawalsLimit, withdrawalsTotal)} trong tổng số {withdrawalsTotal} yêu cầu
                </span>
                <div className="tw-flex tw-gap-2">
                  <button
                    type="button"
                    className="btn-page"
                    disabled={withdrawalsPage <= 1}
                    onClick={() => setWithdrawalsPage((p) => Math.max(1, p - 1))}
                  >
                    Trang trước
                  </button>
                  <button
                    type="button"
                    className="btn-page"
                    disabled={withdrawalsPage * withdrawalsLimit >= withdrawalsTotal}
                    onClick={() => setWithdrawalsPage((p) => p + 1)}
                  >
                    Trang sau
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════ TAB 3: SỔ CÁI GIAO DỊCH TOÀN SÀN (LEDGER) ══════════════ */}
          {activeTab === 'ledger' && (
            <div className="tab-ledger-layout">
              {/* Filters */}
              <div className="ld-filters-bar">
                <div className="ld-search-box">
                  <Search size={14} />
                  <input
                    type="text"
                    placeholder="Tìm theo Idempotency Key, Reference ID, Diễn giải..."
                    value={txSearch}
                    onChange={(e) => {
                      setTxSearch(e.target.value);
                      setTxPage(1);
                    }}
                  />
                </div>

                <div className="ld-filter-selects">
                  <select
                    value={txType}
                    onChange={(e) => {
                      setTxType(e.target.value);
                      setTxPage(1);
                    }}
                  >
                    <option value="ALL">Tất cả loại giao dịch</option>
                    <option value="DEPOSIT">DEPOSIT (Nạp VNPay)</option>
                    <option value="BOOKING_PAYMENT">BOOKING_PAYMENT (Thanh toán)</option>
                    <option value="REFUND">REFUND (Hoàn tiền)</option>
                    <option value="WITHDRAWAL">WITHDRAWAL (Rút tiền)</option>
                    <option value="DOCTOR_SHARE">DOCTOR_SHARE (Thù lao bác sĩ)</option>
                  </select>

                  <select
                    value={txDirection}
                    onChange={(e) => {
                      setTxDirection(e.target.value);
                      setTxPage(1);
                    }}
                  >
                    <option value="ALL">Tất cả chiều tiền</option>
                    <option value="CREDIT">Phát sinh Có (CREDIT +)</option>
                    <option value="DEBIT">Phát sinh Nợ (DEBIT -)</option>
                  </select>
                </div>
              </div>

              {/* Data Table */}
              <div className="ld-table-wrapper tw-mt-4">
                <table className="ld-data-table">
                  <thead>
                    <tr>
                      <th>Thời gian</th>
                      <th>Chủ ví (Owner)</th>
                      <th>Loại giao dịch</th>
                      <th>Chiều</th>
                      <th>Số tiền</th>
                      <th>Số dư sau GD</th>
                      <th>Diễn giải & Idempotency Key</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingTx ? (
                      <tr>
                        <td colSpan="7" className="tw-text-center tw-py-8 tw-text-slate-400">
                          <RotateCw size={18} className="tw-animate-spin tw-inline tw-mr-2" />
                          Đang tải sổ cái...
                        </td>
                      </tr>
                    ) : transactions.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="tw-text-center tw-py-8 tw-text-slate-400">
                          Không tìm thấy bản ghi sổ cái nào phù hợp
                        </td>
                      </tr>
                    ) : (
                      transactions.map((tx) => {
                        const isCredit = tx.direction === 'CREDIT';
                        const owner = tx.wallet?.owner;
                        return (
                          <tr key={tx.id}>
                            <td>
                              <div className="tw-font-medium tw-text-slate-700">
                                {moment(tx.createdAt).format('DD/MM/YYYY')}
                              </div>
                              <div className="tw-text-xs tw-text-slate-400">
                                {moment(tx.createdAt).format('HH:mm:ss')}
                              </div>
                            </td>
                            <td>
                              <div className="tw-font-semibold tw-text-slate-800">
                                {owner?.lastName} {owner?.firstName}
                              </div>
                              <div className="tw-text-xs tw-text-slate-500">{owner?.email}</div>
                              <span className="code-text">WAL-{String(tx.walletId).padStart(7, '0')}</span>
                            </td>
                            <td>
                              <span className="tw-font-semibold tw-text-xs tw-text-slate-700">
                                {tx.transactionType}
                              </span>
                            </td>
                            <td>
                              <span
                                className={`badge-tag ${
                                  isCredit ? 'badge-tag--credit' : 'badge-tag--debit'
                                }`}
                              >
                                {tx.direction}
                              </span>
                            </td>
                            <td>
                              <span
                                className={`tw-font-bold tw-text-sm ${
                                  isCredit ? 'tw-text-emerald-600' : 'tw-text-rose-600'
                                }`}
                              >
                                {isCredit ? '+' : '-'}
                                {formatMoney(tx.amount)}
                              </span>
                            </td>
                            <td>
                              <span className="tw-font-semibold tw-text-slate-700">
                                {formatMoney(tx.balanceAfter)}
                              </span>
                            </td>
                            <td>
                              <div className="tw-text-xs tw-text-slate-800 tw-font-medium">
                                {tx.description}
                              </div>
                              <div
                                className="tw-text-2xs tw-text-slate-400 tw-font-mono tw-truncate tw-max-w-xs"
                                title={tx.idempotencyKey}
                              >
                                IDEM: {tx.idempotencyKey}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="ld-pagination">
                <span>
                  Hiển thị {(txPage - 1) * txLimit + 1} - {Math.min(txPage * txLimit, txTotal)} trong tổng số {txTotal} giao dịch
                </span>
                <div className="tw-flex tw-gap-2">
                  <button
                    type="button"
                    className="btn-page"
                    disabled={txPage <= 1}
                    onClick={() => setTxPage((p) => Math.max(1, p - 1))}
                  >
                    Trang trước
                  </button>
                  <button
                    type="button"
                    className="btn-page"
                    disabled={txPage * txLimit >= txTotal}
                    onClick={() => setTxPage((p) => p + 1)}
                  >
                    Trang sau
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════ TAB 4: DANH SÁCH VÍ BỆNH NHÂN (WALLETS) ══════════════ */}
          {activeTab === 'wallets' && (
            <div className="tab-wallets-layout">
              {/* Filters */}
              <div className="ld-filters-bar">
                <div className="ld-search-box">
                  <Search size={14} />
                  <input
                    type="text"
                    placeholder="Tìm theo Tên, Email, Số điện thoại..."
                    value={walletSearch}
                    onChange={(e) => {
                      setWalletSearch(e.target.value);
                      setWalletsPage(1);
                    }}
                  />
                </div>

                <div className="ld-filter-selects">
                  <select
                    value={walletStatusFilter}
                    onChange={(e) => {
                      setWalletStatusFilter(e.target.value);
                      setWalletsPage(1);
                    }}
                  >
                    <option value="ALL">Tất cả trạng thái</option>
                    <option value="ACTIVE">Hoạt động (ACTIVE)</option>
                    <option value="LOCKED">Đang khóa (LOCKED)</option>
                    <option value="SUSPENDED">Đình chỉ (SUSPENDED)</option>
                  </select>
                </div>
              </div>

              {/* Data Table */}
              <div className="ld-table-wrapper tw-mt-4">
                <table className="ld-data-table">
                  <thead>
                    <tr>
                      <th>Mã Ví</th>
                      <th>Chủ tài khoản</th>
                      <th>Số dư khả dụng</th>
                      <th>Tiền tạm giữ (Hold)</th>
                      <th>Tổng tài sản</th>
                      <th>Trạng thái</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingWallets ? (
                      <tr>
                        <td colSpan="7" className="tw-text-center tw-py-8 tw-text-slate-400">
                          <RotateCw size={18} className="tw-animate-spin tw-inline tw-mr-2" />
                          Đang tải danh sách ví...
                        </td>
                      </tr>
                    ) : wallets.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="tw-text-center tw-py-8 tw-text-slate-400">
                          Không tìm thấy ví nào phù hợp
                        </td>
                      </tr>
                    ) : (
                      wallets.map((w) => {
                        const owner = w.owner;
                        const avail = Number(w.availableBalance) || 0;
                        const resv = Number(w.reservedBalance) || 0;
                        const isActionLoading = actionLoadingId === w.id;

                        return (
                          <tr key={w.id}>
                            <td>
                              <span className="code-text">WAL-{String(w.id).padStart(7, '0')}</span>
                            </td>
                            <td>
                              <div className="tw-font-semibold tw-text-slate-800">
                                {owner?.lastName} {owner?.firstName}
                              </div>
                              <div className="tw-text-xs tw-text-slate-500">{owner?.email}</div>
                              <div className="tw-text-xs tw-text-slate-400">{owner?.phoneNumber}</div>
                            </td>
                            <td>
                              <strong className="tw-text-emerald-700">{formatMoney(avail)}</strong>
                            </td>
                            <td>
                              <span className="tw-text-amber-700 tw-font-semibold">{formatMoney(resv)}</span>
                            </td>
                            <td>
                              <strong className="tw-text-slate-900">{formatMoney(avail + resv)}</strong>
                            </td>
                            <td>
                              <span
                                className={`badge-tag ${
                                  w.status === 'ACTIVE' ? 'badge-tag--active' : 'badge-tag--locked'
                                }`}
                              >
                                {w.status}
                              </span>
                            </td>
                            <td>
                              <button
                                type="button"
                                className={`btn-action-lock ${w.status === 'ACTIVE' ? 'btn-lock' : 'btn-unlock'}`}
                                onClick={() => handleToggleStatus(w)}
                                disabled={isActionLoading}
                              >
                                {isActionLoading ? (
                                  <RotateCw size={12} className="tw-animate-spin" />
                                ) : w.status === 'ACTIVE' ? (
                                  <>
                                    <Lock size={12} /> Khóa ví
                                  </>
                                ) : (
                                  <>
                                    <Unlock size={12} /> Mở khóa
                                  </>
                                )}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="ld-pagination">
                <span>
                  Hiển thị {(walletsPage - 1) * walletsLimit + 1} - {Math.min(walletsPage * walletsLimit, walletsTotal)} trong tổng số {walletsTotal} ví
                </span>
                <div className="tw-flex tw-gap-2">
                  <button
                    type="button"
                    className="btn-page"
                    disabled={walletsPage <= 1}
                    onClick={() => setWalletsPage((p) => Math.max(1, p - 1))}
                  >
                    Trang trước
                  </button>
                  <button
                    type="button"
                    className="btn-page"
                    disabled={walletsPage * walletsLimit >= walletsTotal}
                    onClick={() => setWalletsPage((p) => p + 1)}
                  >
                    Trang sau
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════ TAB 5: CHÍNH SÁCH SLA & KIỂM TOÁN BẤT BIẾN ══════════════ */}
          {activeTab === 'withdrawal-policy' && (
            <WithdrawalPolicyAuditTab />
          )}
        </div>
      </div>

      {/* ===== MODAL: [PHASE 3] DUYỆT RÚT TIỀN / TỪ CHỐI ===== */}
      {selectedWithdrawal && (
        <div
          className="ops-modal-backdrop"
          onClick={() => !isProcessingAction && setSelectedWithdrawal(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <div
            className="tw-bg-white tw-rounded-2xl tw-shadow-2xl tw-w-full tw-max-w-lg tw-overflow-hidden tw-border tw-border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div className="tw-px-6 tw-py-4 tw-border-b tw-border-slate-100 tw-flex tw-justify-between tw-items-center tw-bg-slate-50">
              <div className="tw-flex tw-items-center tw-gap-2">
                <ArrowUpRight size={18} className="tw-text-teal-600" />
                <h3 className="tw-font-bold tw-text-slate-800 tw-m-0 tw-text-base">
                  Xử lý Yêu cầu Rút tiền #WTH-{selectedWithdrawal.id}
                </h3>
              </div>
              <button
                type="button"
                className="tw-text-slate-400 hover:tw-text-slate-600 tw-text-xl tw-border-none tw-bg-transparent tw-cursor-pointer"
                onClick={() => !isProcessingAction && setSelectedWithdrawal(null)}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleProcessWithdrawalSubmit} className="tw-p-6">
              {/* Thẻ thông tin thụ hưởng */}
              <div className="tw-bg-slate-50 tw-p-4 tw-rounded-xl tw-border tw-border-slate-200 tw-mb-4">
                <div className="tw-flex tw-justify-between tw-items-center tw-mb-2">
                  <span className="tw-text-xs tw-text-slate-500 tw-font-semibold">Tài khoản thụ hưởng:</span>
                  <button
                    type="button"
                    className="tw-text-xs tw-text-teal-600 hover:tw-underline tw-font-semibold tw-border-none tw-bg-transparent tw-cursor-pointer tw-flex tw-items-center tw-gap-1"
                    onClick={() => handleCopyAccountNumber(selectedWithdrawal.accountNumber)}
                  >
                    <Copy size={12} /> Sao chép STK
                  </button>
                </div>

                <div className="tw-text-sm tw-font-bold tw-text-slate-900">{selectedWithdrawal.bankName}</div>
                <div className="tw-text-base tw-font-mono tw-font-bold tw-text-indigo-700 tw-mt-0.5">
                  STK: {selectedWithdrawal.accountNumber}
                </div>
                <div className="tw-text-xs tw-text-slate-600 tw-mt-0.5">
                  Chủ TK: <strong>{selectedWithdrawal.accountHolderName}</strong>
                </div>

                <div className="tw-border-t tw-border-slate-200 tw-mt-3 tw-pt-2 tw-flex tw-justify-between tw-items-center">
                  <span className="tw-text-xs tw-text-slate-500">Số tiền cần chuyển khoản:</span>
                  <span className="tw-text-lg tw-font-black tw-text-rose-600">
                    {formatMoney(selectedWithdrawal.amount)}
                  </span>
                </div>
              </div>

              {selectedWithdrawal.status !== 'PENDING' ? (
                <div className="tw-p-3 tw-bg-slate-100 tw-rounded-xl tw-text-xs tw-text-slate-700">
                  <div className="tw-font-bold tw-mb-1">Yêu cầu này đã được xử lý:</div>
                  <div>Trạng thái: <strong>{selectedWithdrawal.status}</strong></div>
                  {selectedWithdrawal.bankTransactionRef && <div>Mã GD: <strong>{selectedWithdrawal.bankTransactionRef}</strong></div>}
                  {selectedWithdrawal.adminNote && <div>Ghi chú: {selectedWithdrawal.adminNote}</div>}
                  {selectedWithdrawal.transferredAt && <div>Thời gian: {moment(selectedWithdrawal.transferredAt).format('DD/MM/YYYY HH:mm')}</div>}
                </div>
              ) : (
                <>
                  {/* Hành động */}
                  <div className="tw-mb-4">
                    <label className="tw-block tw-text-xs tw-font-bold tw-text-slate-700 tw-mb-2">
                      Chọn hành động phê duyệt:
                    </label>
                    <div className="tw-grid tw-grid-cols-2 tw-gap-3">
                      <label
                        className={`tw-border tw-rounded-xl tw-p-3 tw-cursor-pointer tw-flex tw-items-center tw-gap-2.5 tw-transition ${
                          processAction === 'TRANSFER'
                            ? 'tw-border-emerald-500 tw-bg-emerald-50 tw-text-emerald-900 tw-font-bold'
                            : 'tw-border-slate-200 tw-text-slate-600'
                        }`}
                      >
                        <input
                          type="radio"
                          name="procAction"
                          value="TRANSFER"
                          checked={processAction === 'TRANSFER'}
                          onChange={() => setProcessAction('TRANSFER')}
                        />
                        <span>Đã chuyển khoản (Duyệt)</span>
                      </label>

                      <label
                        className={`tw-border tw-rounded-xl tw-p-3 tw-cursor-pointer tw-flex tw-items-center tw-gap-2.5 tw-transition ${
                          processAction === 'REJECT'
                            ? 'tw-border-rose-500 tw-bg-rose-50 tw-text-rose-900 tw-font-bold'
                            : 'tw-border-slate-200 tw-text-slate-600'
                        }`}
                      >
                        <input
                          type="radio"
                          name="procAction"
                          value="REJECT"
                          checked={processAction === 'REJECT'}
                          onChange={() => setProcessAction('REJECT')}
                        />
                        <span>Từ chối yêu cầu (Hoàn tiền)</span>
                      </label>
                    </div>
                  </div>

                  {processAction === 'TRANSFER' ? (
                    <div className="tw-mb-4">
                      <label className="tw-block tw-text-xs tw-font-bold tw-text-slate-700 tw-mb-1">
                        Mã tham chiếu GD ngân hàng / Ủy nhiệm chi *:
                      </label>
                      <input
                        type="text"
                        className="tw-w-full tw-p-2.5 tw-border tw-border-slate-300 tw-rounded-lg tw-text-sm tw-font-mono"
                        placeholder="VD: FT26091800192, NAPAS247-992..."
                        value={bankTxnRef}
                        onChange={(e) => setBankTxnRef(e.target.value)}
                        required
                      />
                      <small className="tw-text-2xs tw-text-slate-400 tw-mt-1 tw-block">
                        Mã này sẽ được lưu cố định vào Sổ cái bất biến để đối soát kế toán.
                      </small>
                    </div>
                  ) : (
                    <div className="tw-mb-4">
                      <label className="tw-block tw-text-xs tw-font-bold tw-text-slate-700 tw-mb-1">
                        Lý do từ chối yêu cầu rút tiền *:
                      </label>
                      <textarea
                        rows={2}
                        className="tw-w-full tw-p-2.5 tw-border tw-border-rose-300 tw-rounded-lg tw-text-sm"
                        placeholder="VD: Thông tin tên chủ thẻ không trùng khớp với hồ sơ bệnh nhân..."
                        value={adminProcessNote}
                        onChange={(e) => setAdminProcessNote(e.target.value)}
                        required
                      />
                      <small className="tw-text-2xs tw-text-rose-500 tw-mt-1 tw-block">
                        Lý do này sẽ hiển thị trực tiếp cho người dùng. Số tiền tạm giữ sẽ được hoàn lại số dư khả dụng ngay lập tức.
                      </small>
                    </div>
                  )}

                  <div className="tw-mb-4">
                    <label className="tw-block tw-text-xs tw-font-bold tw-text-slate-700 tw-mb-1">
                      Ghi chú nội bộ Admin (Tùy chọn):
                    </label>
                    <input
                      type="text"
                      className="tw-w-full tw-p-2 tw-border tw-border-slate-300 tw-rounded-lg tw-text-xs"
                      placeholder="Ghi chú thêm về ca đối soát này..."
                      value={processAction === 'TRANSFER' ? adminProcessNote : ''}
                      onChange={(e) => processAction === 'TRANSFER' && setAdminProcessNote(e.target.value)}
                    />
                  </div>
                </>
              )}

              {/* Nút hành động */}
              <div className="tw-flex tw-justify-end tw-gap-2 tw-mt-5">
                <button
                  type="button"
                  className="tw-px-4 tw-py-2 tw-bg-slate-100 hover:tw-bg-slate-200 tw-text-slate-700 tw-rounded-lg tw-text-sm tw-font-semibold tw-border-none tw-cursor-pointer"
                  onClick={() => setSelectedWithdrawal(null)}
                  disabled={isProcessingAction}
                >
                  Đóng
                </button>

                {selectedWithdrawal.status === 'PENDING' && (
                  <button
                    type="submit"
                    className={`tw-px-5 tw-py-2 tw-text-white tw-rounded-lg tw-text-sm tw-font-bold tw-border-none tw-cursor-pointer tw-flex tw-items-center tw-gap-1.5 tw-shadow-sm ${
                      processAction === 'TRANSFER'
                        ? 'tw-bg-emerald-600 hover:tw-bg-emerald-700'
                        : 'tw-bg-rose-600 hover:tw-bg-rose-700'
                    }`}
                    disabled={isProcessingAction}
                  >
                    {isProcessingAction ? (
                      <>
                        <RotateCw size={14} className="tw-animate-spin" />
                        <span>Đang xử lý...</span>
                      </>
                    ) : processAction === 'TRANSFER' ? (
                      <>
                        <CheckCircle2 size={14} />
                        <span>Xác nhận Đã chuyển khoản</span>
                      </>
                    ) : (
                      <>
                        <XCircle size={14} />
                        <span>Xác nhận Từ chối</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiquidityDashboard;
