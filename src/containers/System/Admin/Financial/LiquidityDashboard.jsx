// src/containers/System/Admin/Financial/LiquidityDashboard.jsx
// Trung tâm Quản trị Tài chính & Giám sát Thanh khoản Hệ thống (Executive Liquidity & Solvency Center)
import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
  Copy,
  SlidersHorizontal,
  Save,
  Sparkles,
  Info,
  ChevronRight,
  ArrowLeft
} from 'lucide-react';
import {
  getAdminLiquidityMetrics,
  recalibrateLedgerBaseline,
  getAdminWalletTransactions,
  getAdminWalletsList,
  toggleWalletStatus,
  getAdminWithdrawalRequests,
  processAdminWithdrawal,
  getFinancialConfigs,
  updateFinancialConfigs,
  getFinancialCashFlows
} from '../../../../services/walletService';
import WithdrawalPolicyAuditTab from './WithdrawalPolicyAuditTab';
import RefundCasesTab from './RefundCasesTab';
import DoctorSettlementsTab from './DoctorSettlementsTab';
import './LiquidityDashboard.scss';

const TAB_ROUTES = {
  solvency: '/system/financial/overview',
  inflows: '/system/financial/inflows',
  withdrawals: '/system/financial/withdrawals',
  'refund-cases': '/system/financial/refund-cases',
  'doctor-settlements': '/system/financial/doctor-settlements',
  ledger: '/system/financial/ledger',
  wallets: '/system/financial/wallets',
  settings: '/system/financial/settings',
  'withdrawal-policy': '/system/financial/settings',
};

const SUBPAGE_METADATA = {
  inflows: {
    title: 'Dòng Tiền Thu Vào (Cash Inflows)',
    tag: 'Dòng Tiền Thực Nạp',
    description: 'Báo cáo chi tiết các nguồn tiền thực nạp vào tài khoản thanh toán sàn (VNPay, Nạp ví, Vốn bảo chứng).',
    icon: ArrowDownLeft,
    color: '#10b981'
  },
  withdrawals: {
    title: 'Duyệt Chi & Quản Lý Rút Tiền (Withdrawals)',
    tag: 'Dòng Tiền Chi Ra',
    description: 'Kiểm tra điều kiện thanh khoản, thẩm định yêu cầu rút tiền của bệnh nhân & bác sĩ theo SLA quy định.',
    icon: ArrowUpRight,
    color: '#ef4444'
  },
  'refund-cases': {
    title: 'Quản Trị Hoàn Tiền Bệnh Nhân (Refund Governance)',
    tag: 'Bảo Vệ Quyền Lợi',
    description: 'Thẩm định khiếu nại, hủy lịch khám và hoàn tiền minh bạch theo chính sách snapshot tại thời điểm đặt lịch.',
    icon: ShieldAlert,
    color: '#f59e0b'
  },
  'doctor-settlements': {
    title: 'Bảng Kê Quyết Toán Thù Lao Bác Sĩ (Doctor Settlements)',
    tag: 'Đối Soát Theo Ca',
    description: 'Bảng kê đối soát thù lao từng ca khám, tự động mở khóa sau T+24h chống khiếu nại và hạch toán vào ví bác sĩ.',
    icon: Coins,
    color: '#8b5cf6'
  },
  ledger: {
    title: 'Sổ Cái Kế Toán Kép (Double-Entry Ledger)',
    tag: 'Bất Biến & Toàn Vẹn',
    description: 'Nhật ký giao dịch bất biến (Immutable Journal), đối soát cân bằng phát sinh Debit/Credit và ký số snapshot.',
    icon: FileSpreadsheet,
    color: '#087f8c'
  },
  wallets: {
    title: 'Danh Bạ Tài Khoản Ví Hệ Thống (Wallets)',
    tag: 'Ví Người Dùng & Sàn',
    description: 'Quản lý số dư, kích hoạt, khóa tài khoản ví bệnh nhân, bác sĩ và tài khoản thanh toán trung gian sàn.',
    icon: Wallet,
    color: '#0284c7'
  },
  settings: {
    title: 'Cấu Hình Quỹ Dự Trữ & Hạn Mức Hệ Thống',
    tag: 'Tham Số Chính Sách',
    description: 'Thiết lập tỷ lệ dự trữ bắt buộc, hạn mức rút tiền tối đa, biểu phí giao dịch và cơ chế thanh khoản an toàn.',
    icon: SlidersHorizontal,
    color: '#475569'
  },
  'withdrawal-policy': {
    title: 'Chính Sách Rút Tiền SLA & Nhật Ký Kiểm Toán',
    tag: 'Kiểm Soát Tuân Thủ',
    description: 'Theo dõi chỉ số SLA xử lý giải ngân và nhật ký kiểm toán hành vi quản trị tài chính.',
    icon: Clock,
    color: '#6366f1'
  }
};

const LiquidityDashboard = ({ defaultTab }) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Tabs: 'solvency' | 'inflows' | 'withdrawals' | 'ledger' | 'wallets' | 'settings' | 'withdrawal-policy'
  const [activeTab, setActiveTab] = useState(defaultTab || 'solvency');

  // Synchronize activeTab when defaultTab prop or location changes
  useEffect(() => {
    const foundTab = Object.keys(TAB_ROUTES).find(key => TAB_ROUTES[key] === location.pathname);
    if (foundTab && foundTab !== activeTab) {
      setActiveTab(foundTab);
    } else if (defaultTab && defaultTab !== activeTab) {
      setActiveTab(defaultTab);
    }
  }, [location.pathname, defaultTab]);

  const handleSwitchTab = (tabKey) => {
    setActiveTab(tabKey);
    const targetRoute = TAB_ROUTES[tabKey];
    if (targetRoute && location.pathname !== targetRoute) {
      navigate(targetRoute);
    }
  };

  const isOverview = activeTab === 'solvency';
  const currentSubpage = SUBPAGE_METADATA[activeTab] || SUBPAGE_METADATA.inflows;
  const CurrentSubpageIcon = currentSubpage?.icon || Scale;

  // Solvency Metrics State
  const [reserveRatio, setReserveRatio] = useState(40);
  const [metrics, setMetrics] = useState(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);

  // [PHASE 5] Inflows / Cash Flows Stream State
  const [cashFlows, setCashFlows] = useState([]);
  const [cashFlowSummary, setCashFlowSummary] = useState(null);
  const [cashFlowTotal, setCashFlowTotal] = useState(0);
  const [cashFlowPage, setCashFlowPage] = useState(1);
  const [cashFlowLimit] = useState(15);
  const [cashFlowStreamType, setCashFlowStreamType] = useState('ALL');
  const [cashFlowDateRange, setCashFlowDateRange] = useState('ALL');
  const [loadingCashFlows, setLoadingCashFlows] = useState(false);

  // [PHASE 5] Financial Dynamic Configs & Reserve Fund State
  const [financialConfigs, setFinancialConfigs] = useState(null);
  const [inputReserveFund, setInputReserveFund] = useState(1000000000);
  const [inputReserveRatio, setInputReserveRatio] = useState(40);
  const [inputMinWithdraw, setInputMinWithdraw] = useState(50000);
  const [inputSlaHours, setInputSlaHours] = useState(24);
  const [isSavingConfigs, setIsSavingConfigs] = useState(false);
  const [loadingConfigs, setLoadingConfigs] = useState(false);

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

  // Format currency
  const formatMoney = (amount) => {
    return (Number(amount) || 0).toLocaleString('vi-VN') + ' ₫';
  };

  const formatTxType = (type) => {
    if (!type) return 'Giao dịch';
    const map = {
      DEPOSIT: 'Nạp tiền ví',
      BOOKING_PAYMENT: 'Thanh toán ca khám',
      REFUND: 'Hoàn tiền ca khám',
      DOCTOR_SETTLEMENT: 'Quyết toán thù lao',
      DOCTOR_SHARE: 'Thù lao ca khám',
      WITHDRAWAL: 'Rút tiền ví',
      WITHDRAW: 'Rút tiền ví',
      WITHDRAW_FEE: 'Phí rút tiền',
      INITIAL_BALANCE: 'Chuẩn hóa số dư ban đầu',
      BASELINE_CALIBRATION: 'Bút toán đối ứng',
      CALIBRATION: 'Bút toán đối ứng',
      ESCROW_HOLD: 'Ký quỹ giữ chỗ',
      ESCROW_RELEASE: 'Giải phóng ký quỹ',
      RESERVE_CAPITAL: 'Vốn bảo chứng sàn',
    };
    return map[type] || type.replace(/_/g, ' ');
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

  // [PHASE 5] Load Financial Dynamic Configs
  const loadConfigs = useCallback(async () => {
    setLoadingConfigs(true);
    try {
      const res = await getFinancialConfigs();
      if (res && res.errCode === 0 && res.data) {
        setFinancialConfigs(res.data);
        setInputReserveFund(res.data.platformReserveFund || 1000000000);
        setInputReserveRatio(res.data.reserveRatioTarget || 40);
        setInputMinWithdraw(res.data.minWithdrawalAmount || 50000);
        setInputSlaHours(res.data.withdrawalSlaHours || 24);
        setReserveRatio(res.data.reserveRatioTarget || 40);
      }
    } catch (err) {
      console.error('Lỗi khi tải cấu hình tài chính:', err);
    } finally {
      setLoadingConfigs(false);
    }
  }, []);

  // [PHASE 5] Save Financial Configs
  const handleSaveConfigs = async (e) => {
    if (e) e.preventDefault();
    setIsSavingConfigs(true);
    try {
      const res = await updateFinancialConfigs({
        platformReserveFund: inputReserveFund,
        reserveRatioTarget: inputReserveRatio,
        minWithdrawalAmount: inputMinWithdraw,
        withdrawalSlaHours: inputSlaHours,
      });
      if (res && res.errCode === 0) {
        toast.success('Cập nhật cấu hình quỹ & hạn mức tài chính sàn thành công!');
        setFinancialConfigs(res.data);
        setReserveRatio(inputReserveRatio);
        loadMetrics(inputReserveRatio);
      } else {
        toast.error(res?.errMessage || 'Không thể lưu cấu hình tài chính');
      }
    } catch (err) {
      toast.error('Lỗi khi kết nối máy chủ lưu cấu hình');
    } finally {
      setIsSavingConfigs(false);
    }
  };

  // [PHASE 5] Load Cash Flows Stream (Thu & Chi)
  const loadCashFlows = useCallback(async () => {
    setLoadingCashFlows(true);
    try {
      let startDate, endDate;
      if (cashFlowDateRange === 'TODAY') {
        startDate = moment().startOf('day').toISOString();
        endDate = moment().endOf('day').toISOString();
      } else if (cashFlowDateRange === '7DAYS') {
        startDate = moment().subtract(7, 'days').startOf('day').toISOString();
        endDate = moment().endOf('day').toISOString();
      } else if (cashFlowDateRange === '30DAYS') {
        startDate = moment().subtract(30, 'days').startOf('day').toISOString();
        endDate = moment().endOf('day').toISOString();
      }

      const res = await getFinancialCashFlows({
        page: cashFlowPage,
        limit: cashFlowLimit,
        streamType: cashFlowStreamType,
        startDate,
        endDate,
      });
      if (res && res.errCode === 0 && res.data) {
        setCashFlows(res.data.transactions || []);
        setCashFlowTotal(res.data.pagination?.total || 0);
        setCashFlowSummary(res.data.summary || {});
      }
    } catch (err) {
      toast.error('Lỗi khi tải dòng tiền thu chi');
    } finally {
      setLoadingCashFlows(false);
    }
  }, [cashFlowPage, cashFlowLimit, cashFlowStreamType, cashFlowDateRange]);

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
    loadConfigs();     // tải cấu hình quỹ bảo chứng và hạn mức
  }, [loadMetrics, loadWithdrawals, loadConfigs]);

  useEffect(() => {
    if (activeTab === 'inflows') {
      loadCashFlows();
    } else if (activeTab === 'ledger') {
      loadTransactions();
    } else if (activeTab === 'wallets') {
      loadWallets();
    } else if (activeTab === 'withdrawals') {
      loadWithdrawals();
    } else if (activeTab === 'settings') {
      loadConfigs();
    }
  }, [activeTab, loadCashFlows, loadTransactions, loadWallets, loadWithdrawals, loadConfigs]);

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
  const liquidityRisk = metrics?.liquidityRisk || {};
  const rec = metrics?.reconciliation || {};

  return (
    <div className="liquidity-dashboard-page">
      {/* ===== EXECUTIVE HEADER BAR & MACRO KPI GRID (CHỈ HIỂN THỊ TẠI TRANG TỔNG QUAN) ===== */}
      {isOverview ? (
        <>
          <div className="ld-header-bar">
            <div className="ld-title-group">
              <div className="ld-badge-sub">
                <Scale size={13} />
                <span>Real-World Liquidity & Solvency Governance</span>
              </div>
              <h2>Tổng Quan Điều Hành Thu Chi & Ngân Quỹ Sàn</h2>
              <p>Bảo chứng thanh khoản chi trả thực tế, giám sát nghĩa vụ đến hạn 7 ngày và quản trị an toàn ngân quỹ.</p>
            </div>

            <div className="ld-header-actions">
              {liquidityRisk.coverageRatio7d !== undefined ? (
                <div className="solvency-badge">
                  <div
                    className="solvency-pulse"
                    style={{ background: liquidityRisk.coverageColor || '#10b981' }}
                  />
                  <div className="solvency-info">
                    <span
                      className="solvency-ratio-num"
                      style={{ color: liquidityRisk.coverageColor || '#10b981' }}
                    >
                      LCR 7 Ngày: {liquidityRisk.coverageRatio7d}x
                    </span>
                    <span className="solvency-ratio-desc">{liquidityRisk.coverageLabel}</span>
                  </div>
                </div>
              ) : solvency.solvencyRatio ? (
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
              ) : null}

              <button
                type="button"
                className="btn-refresh"
                onClick={() => {
                  loadMetrics();
                  if (activeTab === 'inflows') loadCashFlows();
                  if (activeTab === 'withdrawals') loadWithdrawals();
                  if (activeTab === 'ledger') loadTransactions();
                  if (activeTab === 'wallets') loadWallets();
                  if (activeTab === 'settings') loadConfigs();
                }}
                disabled={loadingMetrics}
              >
                <RotateCw size={14} className={loadingMetrics ? 'tw-animate-spin' : ''} />
                <span>Làm mới</span>
              </button>
            </div>
          </div>

          {/* ===== ALERT BANNER THANH KHOẢN THỰC TẾ ===== */}
          {(liquidityRisk.coverageStatus || solvency.solvencyStatus) && (
            <div className={`ld-alert-banner ld-alert-banner--${(liquidityRisk.coverageStatus || solvency.solvencyStatus || 'optimal').toLowerCase()}`}>
              <div className="alert-icon-box">
                {(liquidityRisk.coverageStatus || solvency.solvencyStatus) === 'OPTIMAL' || (liquidityRisk.coverageStatus || solvency.solvencyStatus) === 'HEALTHY' ? (
                  <ShieldCheck size={24} />
                ) : (
                  <ShieldAlert size={24} />
                )}
              </div>
              <div className="alert-content">
                <h4>{liquidityRisk.coverageLabel || solvency.solvencyLabel}</h4>
                <p>
                  {(liquidityRisk.coverageStatus || solvency.solvencyStatus) === 'OPTIMAL' &&
                    'Dòng tiền mặt khả dụng tại két sàn hoàn toàn vượt trội so với nghĩa vụ đến hạn 7 ngày tới. Hệ thống vận hành với hệ số phủ thanh khoản cao, bảo chứng 100% việc hoàn tiền và chi trả đúng hẹn.'}
                  {(liquidityRisk.coverageStatus || solvency.solvencyStatus) === 'HEALTHY' &&
                    'Hệ thống duy trì đủ thanh khoản thực tế để đáp ứng toàn bộ lệnh rút tiền, hoàn tiền và quyết toán trong 7 ngày tới. Tiến độ giải ngân vận hành thông suốt.'}
                  {(liquidityRisk.coverageStatus || solvency.solvencyStatus) === 'WARNING' &&
                    'CẢNH BÁO THANH KHOẢN: Hệ số phủ 7 ngày đang ở ngưỡng tiệm cận. Khuyến nghị Ban Giám đốc tạm dừng các quyết định rút vốn đầu tư ra khỏi tài khoản thanh toán cho đến khi có thêm dòng tiền nạp đối ứng.'}
                  {(liquidityRisk.coverageStatus || solvency.solvencyStatus) === 'CRITICAL' &&
                    'BÁO ĐỘNG CỰC KỲ NGUY HIỂM: Nghĩa vụ tài chính đến hạn 7 ngày vượt quá tiền mặt khả dụng thực tế trong két. Đóng băng ngay lập tức mọi đề xuất rút vốn đầu tư để tập trung thanh khoản giải ngân cho bệnh nhân và bác sĩ!'}
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
                  <span>Thù lao chờ quyết toán:</span>
                  <strong>{formatMoney(summary.doctorPayables)}</strong>
                </div>
              </div>
            </div>

            {/* KPI 2: Dòng tiền thực tế két sàn */}
            <div className="kpi-card kpi-card--inflow">
              <div className="kpi-card-header">
                <span className="kpi-title">Tiền Mặt Khả Dụng Két Sàn</span>
                <div className="kpi-icon-wrap tw-bg-emerald-50 tw-text-emerald-600">
                  <ArrowDownLeft size={18} />
                </div>
              </div>
              <div className="kpi-value" style={{ color: '#059669' }}>
                {formatMoney(summary.realNetCashInTreasury !== undefined ? summary.realNetCashInTreasury : summary.totalCashInflow)}
              </div>
              <div className="kpi-breakdown">
                <div className="breakdown-item">
                  <span>Thu VNPay ca khám:</span>
                  <strong>{formatMoney(summary.bookingRevenueInflow || 0)}</strong>
                </div>
                <div className="breakdown-item">
                  <span>Nạp ví trực tiếp:</span>
                  <strong>{formatMoney(summary.walletDepositInflow || 0)}</strong>
                </div>
                <div className="breakdown-item">
                  <span>Vốn bảo chứng Sàn:</span>
                  <strong>{formatMoney(summary.platformReserveFund || 0)}</strong>
                </div>
                <div className="breakdown-item">
                  <span>Đã giải ngân ra ngoài:</span>
                  <strong style={{ color: '#e11d48' }}>
                    -{formatMoney(summary.totalCashOutflow || 0)}
                  </strong>
                </div>
              </div>
            </div>

            {/* KPI 3: Nghĩa vụ đến hạn 7 ngày (LCR 7D) */}
            <div className="kpi-card kpi-card--due7d">
              <div className="kpi-card-header">
                <span className="kpi-title">Nghĩa Vụ Đến Hạn 7 Ngày</span>
                <div className="kpi-icon-wrap tw-bg-rose-50 tw-text-rose-600">
                  <Clock size={18} />
                </div>
              </div>
              <div className="kpi-value tw-text-rose-600">
                {formatMoney(liquidityRisk.totalDue7Days || 0)}
              </div>
              <div className="kpi-breakdown">
                <div className="breakdown-item">
                  <span>Rút tiền chờ giải ngân:</span>
                  <strong>{formatMoney(liquidityRisk.dueWithdrawalsAmount || 0)} ({liquidityRisk.dueWithdrawalsCount || 0} lệnh)</strong>
                </div>
                <div className="breakdown-item">
                  <span>Hoàn tiền đang duyệt:</span>
                  <strong>{formatMoney(liquidityRisk.dueRefundsAmount || 0)} ({liquidityRisk.dueRefundsCount || 0} ca)</strong>
                </div>
                <div className="breakdown-item">
                  <span>Thù lao BS đã mở khóa:</span>
                  <strong>{formatMoney(liquidityRisk.dueSettlementsAmount || 0)}</strong>
                </div>
                <div className="breakdown-item">
                  <span>Khoản quá hạn (&gt;24h):</span>
                  {liquidityRisk.overdueCount > 0 ? (
                    <strong className="tw-text-rose-600">
                      {liquidityRisk.overdueCount} khoản ({formatMoney(liquidityRisk.overdueAmount)})
                    </strong>
                  ) : (
                    <strong className="tw-text-emerald-600">0 khoản</strong>
                  )}
                </div>
              </div>
            </div>

            {/* KPI 4: Thặng dư thanh khoản ước tính */}
            <div className="kpi-card kpi-card--surplus">
              <div className="kpi-card-header">
                <span className="kpi-title">Thặng Dư Thanh Khoản Ước Tính</span>
                <div className="kpi-icon-wrap tw-bg-indigo-50 tw-text-indigo-600">
                  <TrendingUp size={18} />
                </div>
              </div>
              <div className="kpi-value tw-text-indigo-600">
                {formatMoney(liquidityRisk.estimatedSurplusLiquidity !== undefined ? liquidityRisk.estimatedSurplusLiquidity : solvency.netWithdrawableLiquidity)}
              </div>
              <div className="kpi-breakdown">
                <div className="breakdown-item">
                  <span>Hệ số phủ 7 ngày (LCR):</span>
                  <strong className="tw-text-indigo-700">
                    {liquidityRisk.coverageRatio7d ? `${liquidityRisk.coverageRatio7d}x` : 'N/A'}
                  </strong>
                </div>
                <div className="breakdown-item">
                  <span>Mức dự trữ kịch bản ({reserveRatio}%):</span>
                  <strong>{formatMoney(solvency.mandatoryReserveCash)}</strong>
                </div>
                <div className="breakdown-item">
                  <span>Đánh giá thanh khoản:</span>
                  <strong style={{ color: liquidityRisk.coverageColor || '#10b981' }}>
                    {liquidityRisk.coverageLabel || 'Bình thường'}
                  </strong>
                </div>
                <div className="breakdown-item">
                  <span className="tw-text-[11px] tw-text-slate-400">
                    * Đã trừ nghĩa vụ 7 ngày & quỹ dự trữ tối thiểu
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* ===== COMPACT SUBPAGE HEADER (KHI VÀO TRANG CON NGHIỆP VỤ) ===== */
        <div className="ld-subpage-header">
          <div className="subpage-header-main">
            <nav className="subpage-breadcrumb">
              <button
                type="button"
                className="breadcrumb-item breadcrumb-home"
                onClick={() => handleSwitchTab('solvency')}
              >
                <Scale size={13} />
                <span>Thu chi & Ngân quỹ</span>
              </button>
              <ChevronRight size={13} className="breadcrumb-separator" />
              <span className="breadcrumb-current">{currentSubpage.title}</span>
            </nav>
            <div className="subpage-title-row">
              <div
                className="subpage-icon-badge"
                style={{
                  color: currentSubpage.color,
                  background: `${currentSubpage.color}15`
                }}
              >
                <CurrentSubpageIcon size={22} />
              </div>
              <div className="subpage-title-text">
                <div className="subpage-heading-wrap">
                  <h2>{currentSubpage.title}</h2>
                  <span className="subpage-tag">{currentSubpage.tag}</span>
                </div>
                <p>{currentSubpage.description}</p>
              </div>
            </div>
          </div>

          <div className="subpage-header-actions">
            <button
              type="button"
              className="btn-back-overview"
              onClick={() => handleSwitchTab('solvency')}
            >
              <ArrowLeft size={14} />
              <span>Về Trang Tổng Quan</span>
            </button>

            <button
              type="button"
              className="btn-refresh"
              onClick={() => {
                loadMetrics();
                if (activeTab === 'inflows') loadCashFlows();
                if (activeTab === 'withdrawals') loadWithdrawals();
                if (activeTab === 'ledger') loadTransactions();
                if (activeTab === 'wallets') loadWallets();
                if (activeTab === 'settings') loadConfigs();
              }}
              disabled={loadingMetrics}
            >
              <RotateCw size={14} className={loadingMetrics ? 'tw-animate-spin' : ''} />
              <span>Làm mới</span>
            </button>
          </div>
        </div>
      )}

      {/* ===== NAVIGATION TABS (PHÂN NHÓM 3 KHỐI NGHIỆP VỤ) ===== */}
      <div className="ld-tabs-container tw-mt-4">
        <div className="ld-tabs-nav">
          {/* Nhóm 1: ĐIỀU HÀNH */}
          <div className="tab-nav-group">
            <span className="tab-group-label">ĐIỀU HÀNH</span>
            <button
              type="button"
              className={`tab-btn ${activeTab === 'solvency' ? 'active' : ''}`}
              onClick={() => handleSwitchTab('solvency')}
            >
              <Scale size={15} />
              <span>1. Tổng quan & Cân đối quỹ</span>
            </button>

            <button
              type="button"
              className={`tab-btn ${activeTab === 'inflows' ? 'active' : ''}`}
              onClick={() => handleSwitchTab('inflows')}
            >
              <ArrowDownLeft size={15} />
              <span>2. Dòng tiền thu (Inflows)</span>
              {cashFlowSummary?.totalInflow > 0 && (
                <span className="tab-badge" style={{ background: '#ecfdf5', color: '#047857' }}>
                  Thu vào
                </span>
              )}
            </button>
          </div>

          <div className="tab-group-divider" />

          {/* Nhóm 2: NGHIỆP VỤ THANH TOÁN */}
          <div className="tab-nav-group">
            <span className="tab-group-label">NGHIỆP VỤ THANH TOÁN</span>
            <button
              type="button"
              className={`tab-btn ${activeTab === 'wallets' ? 'active' : ''}`}
              onClick={() => handleSwitchTab('wallets')}
            >
              <Wallet size={15} />
              <span>3. Danh bạ tài khoản ví</span>
              <span className="tab-badge">{walletsTotal}</span>
            </button>

            <button
              type="button"
              className={`tab-btn ${activeTab === 'withdrawals' ? 'active' : ''}`}
              onClick={() => handleSwitchTab('withdrawals')}
            >
              <ArrowUpRight size={15} />
              <span>4. Duyệt chi & Rút tiền</span>
              {withdrawalStats?.pendingCount > 0 && (
                <span className="tab-badge" style={{ background: '#fee2e2', color: '#b91c1c' }}>
                  {withdrawalStats.pendingCount} chờ duyệt
                </span>
              )}
            </button>

            <button
              type="button"
              className={`tab-btn ${activeTab === 'refund-cases' ? 'active' : ''}`}
              onClick={() => handleSwitchTab('refund-cases')}
            >
              <ShieldAlert size={15} />
              <span>5. Quản trị hoàn tiền</span>
            </button>

            <button
              type="button"
              className={`tab-btn ${activeTab === 'doctor-settlements' ? 'active' : ''}`}
              onClick={() => handleSwitchTab('doctor-settlements')}
            >
              <Coins size={15} />
              <span>6. Quyết toán bác sĩ</span>
            </button>
          </div>

          <div className="tab-group-divider" />

          {/* Nhóm 3: KIỂM SOÁT & CẤU HÌNH */}
          <div className="tab-nav-group">
            <span className="tab-group-label">KIỂM SOÁT & CẤU HÌNH</span>
            <button
              type="button"
              className={`tab-btn ${activeTab === 'ledger' ? 'active' : ''}`}
              onClick={() => handleSwitchTab('ledger')}
            >
              <FileSpreadsheet size={15} />
              <span>7. Sổ cái kế toán kép</span>
              <span className="tab-badge">{txTotal}</span>
            </button>

            <button
              type="button"
              className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => handleSwitchTab('settings')}
            >
              <SlidersHorizontal size={15} />
              <span>8. Cấu hình quỹ & Hạn mức</span>
            </button>

            <button
              type="button"
              className={`tab-btn ${activeTab === 'withdrawal-policy' ? 'active' : ''}`}
              onClick={() => handleSwitchTab('withdrawal-policy')}
            >
              <Clock size={15} />
              <span>Chính sách SLA & Kiểm toán</span>
            </button>
          </div>
        </div>

        <div className="ld-tab-body">
          {/* ══════════════ TAB 1: SOLVENCY & RECONCILIATION ══════════════ */}
          {activeTab === 'solvency' && (
            <>
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

                {/* Khối mô phỏng stress test thanh khoản */}
                <div className="stress-simulator-box tw-mt-4 tw-p-4 tw-bg-slate-50 tw-rounded-xl tw-border tw-border-slate-200">
                  <div className="tw-flex tw-justify-between tw-items-center tw-mb-2">
                    <div className="tw-flex tw-items-center tw-gap-2">
                      <SlidersHorizontal size={16} className="tw-text-indigo-600" />
                      <span className="tw-font-bold tw-text-slate-800 tw-text-sm">
                        Mô Phỏng Căng Thẳng Thanh Khoản (Stress Simulator)
                      </span>
                    </div>
                    <span className="tw-px-2 tw-py-0.5 tw-bg-indigo-100 tw-text-indigo-700 tw-text-xs tw-font-bold tw-rounded-md">
                      Kịch bản {reserveRatio}%
                    </span>
                  </div>
                  <p className="tw-text-xs tw-text-slate-500 tw-mb-3">
                    Giả lập trích lập tỷ lệ dự trữ bắt buộc trong phiên làm việc để kiểm tra sức chống chịu thanh khoản mà không tác động dữ liệu thực tế.
                  </p>
                  <div className="reserve-slider-wrap">
                    <div className="tw-flex tw-justify-between tw-text-xs tw-text-slate-600 tw-mb-1.5">
                      <span>Tỷ lệ dự trữ kịch bản:</span>
                      <strong className="tw-text-indigo-600 tw-text-sm">{reserveRatio}% ({formatMoney(solvency.mandatoryReserveCash)})</strong>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="80"
                      step="5"
                      value={reserveRatio}
                      onChange={handleReserveRatioChange}
                      className="tw-w-full tw-h-2 tw-bg-slate-200 tw-rounded-lg tw-appearance-none tw-cursor-pointer"
                    />
                    <div className="tw-flex tw-justify-between tw-text-[11px] tw-text-slate-400 tw-mt-1">
                      <span>10% (Lỏng)</span>
                      <span>40% (Chuẩn Basel III)</span>
                      <span>80% (Khủng hoảng cực đoan)</span>
                    </div>
                  </div>
                  <div className="tw-mt-3 tw-pt-3 tw-border-t tw-border-slate-200 tw-flex tw-justify-between tw-items-center tw-text-xs">
                    <span className="tw-text-slate-600">Thặng dư khả dụng mô phỏng:</span>
                    <strong className={(liquidityRisk.estimatedSurplusLiquidity || 0) >= 0 ? 'tw-text-emerald-600' : 'tw-text-rose-600'}>
                      {formatMoney(liquidityRisk.estimatedSurplusLiquidity !== undefined ? liquidityRisk.estimatedSurplusLiquidity : solvency.netWithdrawableLiquidity)}
                    </strong>
                  </div>
                  <div className="tw-mt-2 tw-text-[11px] tw-text-slate-400 tw-italic">
                    * Lưu ý: Cấu hình tỷ lệ dự trữ pháp lý chính thức được lưu trong tab "Cấu hình quỹ & Hạn mức".
                  </div>
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
                        <div className="tw-p-2.5 tw-bg-amber-50 tw-border tw-border-amber-200 tw-rounded-md tw-text-xs tw-text-amber-800">
                          <strong>Nguyên tắc Bất Biến & Kiểm Toán:</strong> Sổ cái kép là nhật ký tài chính bất biến (Immutable Ledger). Hệ thống cấm can thiệp hoặc ghi đè số dư từ giao diện điều hành. Mọi chênh lệch cần được bộ phận Kiểm toán kỹ thuật điều tra theo mã <code>idempotencyKey</code> và lập bút toán điều chỉnh chính thức.
                        </div>
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

            {/* ══════════════ PHÂN HỆ QUẢN TRỊ NGHIỆP VỤ (EXECUTIVE PORTALS HUB - 3 NHÓM) ══════════════ */}
            <div className="financial-portals-section tw-mt-8">
              <div className="portals-head">
                <div className="portals-title-group">
                  <div className="portals-icon-tag">
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <h3>Phân Hệ Quản Trị Nghiệp Vụ Chuyên Sâu</h3>
                    <p>Hệ thống 8 phân hệ chuyên biệt được chuẩn hóa thành 3 nhóm năng lực tài chính: Điều hành, Nghiệp vụ thanh toán và Kiểm soát.</p>
                  </div>
                </div>
              </div>

              {/* NHÓM 1: ĐIỀU HÀNH & DÒNG TIỀN */}
              <div className="portals-category-block">
                <div className="category-title-row">
                  <span className="category-badge">NHÓM 1</span>
                  <h4>ĐIỀU HÀNH & THEO DÕI DÒNG TIỀN (TREASURY OPERATIONS)</h4>
                </div>
                <div className="portals-grid">
                  {/* Portal 1: Dòng tiền thu */}
                  <div className="portal-card" onClick={() => handleSwitchTab('inflows')}>
                    <div className="portal-card-top">
                      <div className="portal-icon tw-bg-emerald-50 tw-text-emerald-600">
                        <ArrowDownLeft size={22} />
                      </div>
                      <span className="portal-badge portal-badge--emerald">Dòng Tiền Nạp</span>
                    </div>
                    <h4 className="portal-title">1. Dòng Tiền Thu Vào (Cash Inflows)</h4>
                    <p className="portal-desc">Theo dõi luồng tiền nạp ví VNPay, doanh thu đặt khám và vốn bảo chứng sàn.</p>
                    <div className="portal-stat">
                      <span className="portal-stat-label">Tổng nạp ghi nhận:</span>
                      <strong className="portal-stat-value tw-text-emerald-600">
                        {formatMoney(summary.totalCashInflow || 0)}
                      </strong>
                    </div>
                    <div className="portal-footer">
                      <span>Vào phân hệ Dòng tiền thu</span>
                      <ChevronRight size={16} />
                    </div>
                  </div>
                </div>
              </div>

              {/* NHÓM 2: NGHIỆP VỤ THANH TOÁN & CHI TRẢ */}
              <div className="portals-category-block tw-mt-6">
                <div className="category-title-row">
                  <span className="category-badge">NHÓM 2</span>
                  <h4>NGHIỆP VỤ THANH TOÁN & CHI TRẢ (PAYOUTS & SETTLEMENTS)</h4>
                </div>
                <div className="portals-grid">
                  {/* Portal 2: Danh bạ tài khoản ví */}
                  <div className="portal-card" onClick={() => handleSwitchTab('wallets')}>
                    <div className="portal-card-top">
                      <div className="portal-icon tw-bg-sky-50 tw-text-sky-600">
                        <Wallet size={22} />
                      </div>
                      <span className="portal-badge portal-badge--sky">Danh Bạ Ví Số</span>
                    </div>
                    <h4 className="portal-title">2. Danh Bạ Tài Khoản Ví (Wallets)</h4>
                    <p className="portal-desc">Tra cứu số dư khả dụng, hạn mức và trạng thái ví người bệnh, bác sĩ và tài khoản sàn.</p>
                    <div className="portal-stat">
                      <span className="portal-stat-label">Tổng tài khoản:</span>
                      <strong className="portal-stat-value tw-text-sky-700">
                        {walletsTotal} ví trên hệ thống
                      </strong>
                    </div>
                    <div className="portal-footer">
                      <span>Vào danh bạ tài khoản ví</span>
                      <ChevronRight size={16} />
                    </div>
                  </div>

                  {/* Portal 3: Duyệt chi & Rút tiền */}
                  <div className="portal-card" onClick={() => handleSwitchTab('withdrawals')}>
                    <div className="portal-card-top">
                      <div className="portal-icon tw-bg-rose-50 tw-text-rose-600">
                        <ArrowUpRight size={22} />
                      </div>
                      <span className="portal-badge portal-badge--rose">
                        {withdrawalStats?.pendingCount > 0 ? `${withdrawalStats.pendingCount} Chờ Duyệt` : 'Thanh Khoản Sẵn Sàng'}
                      </span>
                    </div>
                    <h4 className="portal-title">3. Duyệt Chi & Rút Tiền (Withdrawals)</h4>
                    <p className="portal-desc">Thẩm định yêu cầu rút tiền của bệnh nhân & bác sĩ theo hạn mức và bảo chứng SLA.</p>
                    <div className="portal-stat">
                      <span className="portal-stat-label">Chờ giải ngân:</span>
                      <strong className="portal-stat-value tw-text-rose-600">
                        {withdrawalStats?.pendingCount > 0
                          ? `${withdrawalStats.pendingCount} lệnh (${formatMoney(withdrawalStats.pendingAmount || 0)})`
                          : '0 lệnh chờ duyệt'}
                      </strong>
                    </div>
                    <div className="portal-footer">
                      <span>Vào duyệt chi & giải ngân</span>
                      <ChevronRight size={16} />
                    </div>
                  </div>

                  {/* Portal 4: Quản trị hoàn tiền */}
                  <div className="portal-card" onClick={() => handleSwitchTab('refund-cases')}>
                    <div className="portal-card-top">
                      <div className="portal-icon tw-bg-amber-50 tw-text-amber-600">
                        <ShieldAlert size={22} />
                      </div>
                      <span className="portal-badge portal-badge--amber">Minh Bạch Hoàn Tiền</span>
                    </div>
                    <h4 className="portal-title">4. Quản Trị Hoàn Tiền (Refunds)</h4>
                    <p className="portal-desc">Thẩm định ca hủy khám, bảo vệ quyền lợi người bệnh và hoàn tiền theo snapshot chính sách.</p>
                    <div className="portal-stat">
                      <span className="portal-stat-label">Cơ chế xử lý:</span>
                      <strong className="portal-stat-value tw-text-amber-600">
                        Hoàn tiền tức thì ví nội bộ
                      </strong>
                    </div>
                    <div className="portal-footer">
                      <span>Vào quản trị hoàn tiền</span>
                      <ChevronRight size={16} />
                    </div>
                  </div>

                  {/* Portal 5: Quyết toán bác sĩ */}
                  <div className="portal-card" onClick={() => handleSwitchTab('doctor-settlements')}>
                    <div className="portal-card-top">
                      <div className="portal-icon tw-bg-violet-50 tw-text-violet-600">
                        <Coins size={22} />
                      </div>
                      <span className="portal-badge portal-badge--violet">Mở Khóa T+24h</span>
                    </div>
                    <h4 className="portal-title">5. Quyết Toán Bác Sĩ (Settlements)</h4>
                    <p className="portal-desc">Bảng kê chi tiết thù lao từng ca khám, tự động mở khóa sau 24h và đối soát vào ví.</p>
                    <div className="portal-stat">
                      <span className="portal-stat-label">Thù lao chờ chi:</span>
                      <strong className="portal-stat-value tw-text-violet-600">
                        {formatMoney(summary.doctorPayables || 0)}
                      </strong>
                    </div>
                    <div className="portal-footer">
                      <span>Vào bảng kê quyết toán</span>
                      <ChevronRight size={16} />
                    </div>
                  </div>
                </div>
              </div>

              {/* NHÓM 3: KIỂM SOÁT, SỔ CÁI & CẤU HÌNH */}
              <div className="portals-category-block tw-mt-6">
                <div className="category-title-row">
                  <span className="category-badge">NHÓM 3</span>
                  <h4>KIỂM SOÁT, SỔ CÁI & CẤU HÌNH (AUDIT & COMPLIANCE)</h4>
                </div>
                <div className="portals-grid">
                  {/* Portal 6: Sổ cái kế toán kép */}
                  <div className="portal-card" onClick={() => handleSwitchTab('ledger')}>
                    <div className="portal-card-top">
                      <div className="portal-icon tw-bg-cyan-50 tw-text-cyan-600">
                        <FileSpreadsheet size={22} />
                      </div>
                      <span className="portal-badge portal-badge--cyan">Bất Biến & Đối Soát</span>
                    </div>
                    <h4 className="portal-title">6. Sổ Cái Kế Toán Kép (Ledger)</h4>
                    <p className="portal-desc">Nhật ký giao dịch bất biến (Immutable Ledger), kiểm soát dòng tiền Debit/Credit toàn sàn.</p>
                    <div className="portal-stat">
                      <span className="portal-stat-label">Tổng số bút toán:</span>
                      <strong className="portal-stat-value tw-text-cyan-700">
                        {txTotal} bút toán ghi sổ
                      </strong>
                    </div>
                    <div className="portal-footer">
                      <span>Tra cứu sổ cái kế toán</span>
                      <ChevronRight size={16} />
                    </div>
                  </div>

                  {/* Portal 7: Cấu hình quỹ & Hạn mức */}
                  <div className="portal-card" onClick={() => handleSwitchTab('settings')}>
                    <div className="portal-card-top">
                      <div className="portal-icon tw-bg-slate-100 tw-text-slate-700">
                        <SlidersHorizontal size={22} />
                      </div>
                      <span className="portal-badge portal-badge--slate">Tham Số Chính Sách</span>
                    </div>
                    <h4 className="portal-title">7. Cấu Hình Quỹ & Hạn Mức (Configs)</h4>
                    <p className="portal-desc">Thiết lập tỷ lệ dự trữ bắt buộc, hạn mức rút tiền tối đa, biểu phí và thời hạn SLA.</p>
                    <div className="portal-stat">
                      <span className="portal-stat-label">Tỷ lệ dự trữ:</span>
                      <strong className="portal-stat-value tw-text-slate-700">
                        {reserveRatio}% bảo chứng
                      </strong>
                    </div>
                    <div className="portal-footer">
                      <span>Vào thiết lập cấu hình</span>
                      <ChevronRight size={16} />
                    </div>
                  </div>

                  {/* Portal 8: Chính sách SLA & Kiểm toán */}
                  <div className="portal-card" onClick={() => handleSwitchTab('withdrawal-policy')}>
                    <div className="portal-card-top">
                      <div className="portal-icon tw-bg-indigo-50 tw-text-indigo-600">
                        <Clock size={22} />
                      </div>
                      <span className="portal-badge portal-badge--indigo">SLA & Tuân Thủ</span>
                    </div>
                    <h4 className="portal-title">8. Chính Sách SLA & Kiểm Toán</h4>
                    <p className="portal-desc">Theo dõi cam kết thời gian chi trả SLA, nhật ký kiểm toán hành vi quản trị dòng tiền.</p>
                    <div className="portal-stat">
                      <span className="portal-stat-label">Tiêu chuẩn cam kết:</span>
                      <strong className="portal-stat-value tw-text-indigo-600">
                        SLA 24 Giờ & Audit Trail
                      </strong>
                    </div>
                    <div className="portal-footer">
                      <span>Vào kiểm toán tuân thủ</span>
                      <ChevronRight size={16} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

          {/* ══════════════ TAB 2: INFLOWS STREAM (DÒNG TIỀN THU VÀO) ══════════════ */}
          {activeTab === 'inflows' && (
            <div className="tab-inflows-layout">
              {/* Summary KPI Cards */}
              <div className="inflows-summary-grid">
                <div className="summary-card inflow-card">
                  <div className="summary-icon tw-bg-emerald-50 tw-text-emerald-600">
                    <ArrowDownLeft size={20} />
                  </div>
                  <div className="summary-info">
                    <span className="summary-label">Tổng Dòng Tiền Thu Vào (Credit)</span>
                    <div className="summary-value tw-text-emerald-600">
                      {formatMoney(cashFlowSummary?.totalInflow || 0)}
                    </div>
                    <span className="summary-sub">Nạp ví bệnh nhân + Doanh thu khám trực tiếp</span>
                  </div>
                </div>

                <div className="summary-card outflow-card">
                  <div className="summary-icon tw-bg-rose-50 tw-text-rose-600">
                    <ArrowUpRight size={20} />
                  </div>
                  <div className="summary-info">
                    <span className="summary-label">Tổng Dòng Tiền Chi Ra (Debit)</span>
                    <div className="summary-value tw-text-rose-600">
                      {formatMoney(cashFlowSummary?.totalOutflow || 0)}
                    </div>
                    <span className="summary-sub">Thanh toán khám + Rút tiền đã giải ngân</span>
                  </div>
                </div>

                <div className="summary-card netflow-card">
                  <div className="summary-icon tw-bg-teal-50 tw-text-teal-600">
                    <Scale size={20} />
                  </div>
                  <div className="summary-info">
                    <span className="summary-label">Dòng Tiền Ròng Lưu Giữ (Net Flow)</span>
                    <div className={`summary-value ${(cashFlowSummary?.netFlow || 0) >= 0 ? 'tw-text-teal-700' : 'tw-text-rose-700'}`}>
                      {formatMoney(cashFlowSummary?.netFlow || 0)}
                    </div>
                    <span className="summary-sub">Dòng tiền thực thu trừ thực chi trong kỳ</span>
                  </div>
                </div>
              </div>

              {/* Filter Toolbar */}
              <div className="ld-filter-bar tw-mt-4">
                <div className="filter-group">
                  <label>Phân loại dòng tiền:</label>
                  <select
                    value={cashFlowStreamType}
                    onChange={(e) => {
                      setCashFlowStreamType(e.target.value);
                      setCashFlowPage(1);
                    }}
                    className="filter-select"
                  >
                    <option value="ALL">Toàn bộ dòng tiền (Thu & Chi)</option>
                    <option value="INFLOW">Chỉ dòng tiền Thu Vào (Credit / Inflows)</option>
                    <option value="OUTFLOW">Chỉ dòng tiền Chi Ra (Debit / Outflows)</option>
                  </select>
                </div>

                <div className="filter-group">
                  <label>Khoảng thời gian:</label>
                  <div className="quick-date-pills">
                    {[
                      { id: 'ALL', label: 'Tất cả' },
                      { id: 'TODAY', label: 'Hôm nay' },
                      { id: '7DAYS', label: '7 ngày qua' },
                      { id: '30DAYS', label: '30 ngày qua' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={`pill-btn ${cashFlowDateRange === item.id ? 'active' : ''}`}
                        onClick={() => {
                          setCashFlowDateRange(item.id);
                          setCashFlowPage(1);
                        }}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="ld-table-wrapper tw-mt-4">
                <table className="ld-data-table">
                  <thead>
                    <tr>
                      <th>Mã GD / ID</th>
                      <th>Loại Giao Dịch</th>
                      <th>Hướng Dòng Tiền</th>
                      <th>Ví Đối Ứng / Chủ Sở Hữu</th>
                      <th className="tw-text-right">Số Tiền</th>
                      <th className="tw-text-right">Số Dư Sau GD</th>
                      <th>Mô Tả / Tham Chiếu</th>
                      <th>Thời Gian</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingCashFlows ? (
                      <tr>
                        <td colSpan={8} className="tw-text-center tw-py-8 tw-text-slate-400">
                          <RotateCw size={20} className="tw-animate-spin tw-inline-block tw-mr-2" />
                          Đang tải dữ liệu dòng tiền...
                        </td>
                      </tr>
                    ) : cashFlows.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="tw-text-center tw-py-8 tw-text-slate-400">
                          Không tìm thấy bản ghi dòng tiền nào trong khoảng lọc
                        </td>
                      </tr>
                    ) : (
                      cashFlows.map((tx) => {
                        const isCredit = tx.direction === 'CREDIT';
                        return (
                          <tr key={tx.id}>
                            <td className="tw-font-mono tw-text-xs tw-font-bold">
                              #TXN-{tx.id}
                            </td>
                            <td>
                              <span className="badge-type">
                                {formatTxType(tx.transactionType || tx.type)}
                              </span>
                            </td>
                            <td>
                              <span className={`direction-badge ${isCredit ? 'credit' : 'debit'}`}>
                                {isCredit ? (
                                  <><ArrowDownLeft size={12} /> Tiền Vào (Credit)</>
                                ) : (
                                  <><ArrowUpRight size={12} /> Tiền Ra (Debit)</>
                                )}
                              </span>
                            </td>
                            <td>
                              <div className="tw-text-xs tw-font-semibold tw-text-slate-800">
                                {tx.wallet?.owner ? `${tx.wallet.owner.lastName || ''} ${tx.wallet.owner.firstName || ''}` : 'Hệ thống'}
                              </div>
                              <div className="tw-text-2xs tw-text-slate-400">
                                Ví #{tx.walletId} ({tx.wallet?.walletType || 'PATIENT'})
                              </div>
                            </td>
                            <td className={`tw-text-right tw-font-bold ${isCredit ? 'tw-text-emerald-600' : 'tw-text-rose-600'}`}>
                              {isCredit ? '+' : '-'}{formatMoney(tx.amount)}
                            </td>
                            <td className="tw-text-right tw-font-mono tw-text-xs tw-text-slate-600">
                              {formatMoney(tx.balanceAfter)}
                            </td>
                            <td className="tw-text-xs tw-text-slate-600 tw-max-w-xs tw-truncate">
                              {tx.description || tx.referenceType || '—'}
                            </td>
                            <td className="tw-text-2xs tw-text-slate-500">
                              {moment(tx.createdAt).format('DD/MM/YYYY HH:mm:ss')}
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
                  Hiển thị {cashFlows.length > 0 ? (cashFlowPage - 1) * cashFlowLimit + 1 : 0} - {Math.min(cashFlowPage * cashFlowLimit, cashFlowTotal)} trong tổng số {cashFlowTotal} giao dịch
                </span>
                <div className="tw-flex tw-gap-2">
                  <button
                    type="button"
                    className="btn-page"
                    disabled={cashFlowPage <= 1}
                    onClick={() => setCashFlowPage((p) => Math.max(1, p - 1))}
                  >
                    Trang trước
                  </button>
                  <button
                    type="button"
                    className="btn-page"
                    disabled={cashFlowPage * cashFlowLimit >= cashFlowTotal}
                    onClick={() => setCashFlowPage((p) => p + 1)}
                  >
                    Trang sau
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════ TAB 3: TRUNG TÂM DUYỆT RÚT TIỀN ══════════════ */}
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

          {/* ══════════════ TAB 6: CẤU HÌNH QUỸ BẢO CHỨNG & HẠN MỨC TOÀN SÀN ══════════════ */}
          {activeTab === 'settings' && (
            <div className="tab-settings-layout">
              <div className="settings-grid">
                {/* Cột trái: Form cấu hình */}
                <div className="settings-form-card">
                  <div className="card-header">
                    <div className="icon-wrap tw-bg-teal-50 tw-text-teal-600">
                      <SlidersHorizontal size={20} />
                    </div>
                    <div>
                      <h3>Cấu Hình Quỹ Bảo Chứng & Hạn Mức Toàn Sàn</h3>
                      <p>Quản trị linh hoạt vốn lưu động sàn và tỷ lệ dự trữ thanh khoản tức thì không cần can thiệp mã nguồn.</p>
                    </div>
                  </div>

                  <form onSubmit={handleSaveConfigs} className="settings-form-body">
                    {/* Cấu hình 1: Vốn bảo chứng sàn */}
                    <div className="form-field-group">
                      <div className="tw-flex tw-justify-between tw-items-center">
                        <label className="field-label">
                          1. Vốn Lưu Động Bảo Chứng Sàn (Platform Reserve Fund) *
                        </label>
                        <span className="field-current-value tw-font-bold tw-text-teal-700">
                          {formatMoney(inputReserveFund)}
                        </span>
                      </div>
                      <p className="field-hint">
                        Khoản vốn lưu động cam kết ký quỹ tại ngân hàng đối tác để đảm bảo thanh khoản 100% khi người dùng rút tiền hoặc hủy lịch đột biến. Không bị cố định 1 tỷ đồng.
                      </p>

                      {/* Quick preset buttons */}
                      <div className="preset-buttons-row">
                        <span className="preset-label">Mốc gợi ý nhanh:</span>
                        {[
                          { label: '500 Triệu', value: 500000000 },
                          { label: '1 Tỷ', value: 1000000000 },
                          { label: '2 Tỷ', value: 2000000000 },
                          { label: '5 Tỷ', value: 5000000000 },
                          { label: '10 Tỷ', value: 10000000000 },
                        ].map((preset) => (
                          <button
                            key={preset.value}
                            type="button"
                            className={`preset-btn ${Number(inputReserveFund) === preset.value ? 'active' : ''}`}
                            onClick={() => setInputReserveFund(preset.value)}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>

                      <div className="tw-mt-2.5">
                        <input
                          type="number"
                          step="50000000"
                          min="0"
                          className="custom-number-input"
                          value={inputReserveFund}
                          onChange={(e) => setInputReserveFund(Number(e.target.value) || 0)}
                          placeholder="Nhập số tiền VNĐ..."
                          required
                        />
                      </div>
                    </div>

                    {/* Cấu hình 2: Tỷ lệ dự trữ bắt buộc */}
                    <div className="form-field-group tw-mt-5">
                      <div className="tw-flex tw-justify-between tw-items-center">
                        <label className="field-label">
                          2. Tỷ Lệ Dự Trữ Thanh Khoản Tối Thiểu (Target Reserve Ratio) *
                        </label>
                        <span className="field-current-value tw-font-bold tw-text-indigo-600">
                          {inputReserveRatio}%
                        </span>
                      </div>
                      <p className="field-hint">
                        Tỷ lệ % tiền mặt sàn phải duy trì cố định trên tổng nghĩa vụ nợ (tiền gửi ví + tiền cọc giữ chỗ).
                      </p>
                      <div className="tw-flex tw-items-center tw-gap-4 tw-mt-2">
                        <input
                          type="range"
                          min="10"
                          max="100"
                          step="5"
                          value={inputReserveRatio}
                          onChange={(e) => setInputReserveRatio(Number(e.target.value))}
                          className="tw-flex-1 tw-h-2 tw-bg-slate-200 tw-rounded-lg tw-appearance-none tw-cursor-pointer"
                        />
                        <span className="tw-font-mono tw-font-bold tw-text-sm tw-w-12 tw-text-right">
                          {inputReserveRatio}%
                        </span>
                      </div>
                    </div>

                    {/* Cấu hình 3 & 4: Hạn mức rút tiền tối thiểu & SLA */}
                    <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 tw-gap-4 tw-mt-5">
                      <div className="form-field-group">
                        <label className="field-label">
                          3. Hạn Mức Rút Tiền Tối Thiểu (VNĐ)
                        </label>
                        <input
                          type="number"
                          step="10000"
                          min="10000"
                          className="custom-number-input tw-mt-1"
                          value={inputMinWithdraw}
                          onChange={(e) => setInputMinWithdraw(Number(e.target.value) || 0)}
                          required
                        />
                        <small className="tw-text-2xs tw-text-slate-400 tw-mt-1 tw-block">
                          Tương đương: {formatMoney(inputMinWithdraw)}
                        </small>
                      </div>

                      <div className="form-field-group">
                        <label className="field-label">
                          4. Cam Kết Thời Gian Xử Lý SLA (Giờ)
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="168"
                          className="custom-number-input tw-mt-1"
                          value={inputSlaHours}
                          onChange={(e) => setInputSlaHours(Number(e.target.value) || 24)}
                          required
                        />
                        <small className="tw-text-2xs tw-text-slate-400 tw-mt-1 tw-block">
                          Quy định thời hạn giải ngân tối đa cho người dùng.
                        </small>
                      </div>
                    </div>

                    {/* Nút lưu */}
                    <div className="tw-flex tw-justify-end tw-items-center tw-gap-3 tw-mt-6 tw-pt-4 tw-border-t tw-border-slate-100">
                      <button
                        type="button"
                        className="tw-px-4 tw-py-2.5 tw-bg-slate-100 hover:tw-bg-slate-200 tw-text-slate-700 tw-rounded-xl tw-text-sm tw-font-semibold tw-border-none tw-cursor-pointer"
                        onClick={loadConfigs}
                        disabled={isSavingConfigs || loadingConfigs}
                      >
                        Khôi phục ban đầu
                      </button>
                      <button
                        type="submit"
                        className="tw-px-6 tw-py-2.5 tw-bg-teal-600 hover:tw-bg-teal-700 tw-text-white tw-rounded-xl tw-text-sm tw-font-bold tw-border-none tw-cursor-pointer tw-flex tw-items-center tw-gap-2 tw-shadow-sm"
                        disabled={isSavingConfigs}
                      >
                        {isSavingConfigs ? (
                          <>
                            <RotateCw size={15} className="tw-animate-spin" />
                            <span>Đang lưu...</span>
                          </>
                        ) : (
                          <>
                            <Save size={15} />
                            <span>Lưu & Cập Nhật Toàn Sàn</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Cột phải: Live Solvency Simulator */}
                <div className="settings-simulator-card">
                  <div className="card-header">
                    <div className="icon-wrap tw-bg-indigo-50 tw-text-indigo-600">
                      <Sparkles size={20} />
                    </div>
                    <div>
                      <h3>Mô Phỏng Tác Động Tức Thì (Live Simulator)</h3>
                      <p>Dự báo trạng thái an toàn thanh khoản sàn theo các con số đang chọn bên trái.</p>
                    </div>
                  </div>

                  {(() => {
                    const simLiabilities = Number(summary.totalLiabilities) || 0;
                    const simInflow = (Number(summary.walletDepositInflow) || 0) + (Number(summary.bookingRevenueInflow) || 0) + Number(inputReserveFund);
                    const simTreasuryCash = simInflow - (Number(summary.settledWithdrawals) || 0);
                    const simMandatoryReserve = simLiabilities * (Number(inputReserveRatio) / 100);
                    const simWithdrawable = Math.max(0, simTreasuryCash - simMandatoryReserve);
                    const simRatio = simLiabilities > 0 ? (simTreasuryCash / simLiabilities).toFixed(2) : '99.99';
                    const isSafe = Number(simRatio) >= 1.2;
                    const isWarning = Number(simRatio) >= 1.0 && Number(simRatio) < 1.2;

                    return (
                      <div className="simulator-body">
                        <div className={`simulator-status-banner ${isSafe ? 'safe' : isWarning ? 'warning' : 'critical'}`}>
                          <div className="status-title">
                            {isSafe ? 'Hệ thống Thanh khoản Tối ưu' : isWarning ? 'Cảnh báo Tiệm cận An toàn' : 'Rủi ro Nguy hiểm Thanh khoản'}
                          </div>
                          <div className="status-ratio">
                            Hệ số bảo chứng ước tính: <strong>{simRatio}x</strong>
                          </div>
                        </div>

                        <div className="simulator-metric-list">
                          <div className="sim-row">
                            <span className="sim-label">Tổng nợ nghĩa vụ hoàn trả:</span>
                            <span className="sim-val tw-text-slate-800">{formatMoney(simLiabilities)}</span>
                          </div>
                          <div className="sim-row">
                            <span className="sim-label">Vốn bảo chứng cấu hình:</span>
                            <span className="sim-val tw-text-teal-700 tw-font-bold">{formatMoney(inputReserveFund)}</span>
                          </div>
                          <div className="sim-row">
                            <span className="sim-label">Tiền mặt thực tế trong két sàn:</span>
                            <span className="sim-val tw-text-emerald-700 tw-font-bold">{formatMoney(simTreasuryCash)}</span>
                          </div>
                          <div className="sim-row">
                            <span className="sim-label">Quỹ dự trữ bắt buộc ({inputReserveRatio}%):</span>
                            <span className="sim-val tw-text-amber-700 tw-font-bold">{formatMoney(simMandatoryReserve)}</span>
                          </div>
                          <div className="sim-row tw-border-t tw-border-slate-200 tw-pt-2 tw-mt-2">
                            <span className="sim-label tw-font-bold">Khả dụng rút đầu tư:</span>
                            <span className="sim-val tw-text-indigo-700 tw-font-black">{formatMoney(simWithdrawable)}</span>
                          </div>
                        </div>

                        <div className="simulator-note">
                          <Info size={14} />
                          <span>
                            Lưu ý: Thay đổi vốn bảo chứng sẽ ảnh hưởng trực tiếp đến chỉ số Solvency Ratio hiển thị trên thanh điều hành và quyết định hạn mức duyệt chi tự động.
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* ══════════════ TAB 7: CHÍNH SÁCH SLA & KIỂM TOÁN BẤT BIẾN ══════════════ */}
          {activeTab === 'withdrawal-policy' && (
            <WithdrawalPolicyAuditTab />
          )}

          {/* ══════════════ TAB 4: QUẢN TRỊ HOÀN TIỀN BỆNH NHÂN ══════════════ */}
          {activeTab === 'refund-cases' && (
            <RefundCasesTab />
          )}

          {/* ══════════════ TAB 5: QUYẾT TOÁN THÙ LAO BÁC SĨ ══════════════ */}
          {activeTab === 'doctor-settlements' && (
            <DoctorSettlementsTab />
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
