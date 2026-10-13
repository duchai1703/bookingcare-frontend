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
  Calendar,
  Layers,
  TableProperties,
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
  ArrowLeft,
  ArrowRight
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
  getFinancialCashFlows,
  getAdminExceptionQueue,
  allocateFloatCapital,
  getPeriodicTreasuryCycles,
  reimburseFloatCapital,
  runFinancialAutomationCycle
} from '../../../../services/walletService';
import WithdrawalPolicyAuditTab from './WithdrawalPolicyAuditTab';
import RefundCasesTab from './RefundCasesTab';
import DoctorSettlementsTab from './DoctorSettlementsTab';
import FinancialExceptionHub from './FinancialExceptionHub';
import MasterTreasuryConsole from './MasterTreasuryConsole';
import './LiquidityDashboard.scss';

const TAB_ROUTES = {
  solvency: '/system/financial/overview',
  overview: '/system/financial/overview',
  exceptions: '/system/financial/exceptions',
  inflows: '/system/financial/inflows',
  withdrawals: '/system/financial/withdrawals',
  'refund-cases': '/system/financial/refund-cases',
  'doctor-settlements': '/system/financial/doctor-settlements',
  ledger: '/system/financial/ledger',
  wallets: '/system/financial/wallets',
  settings: '/system/financial/settings',
  'withdrawal-policy': '/system/financial/settings',
  refunds: '/system/financial/refund-cases',
  settlements: '/system/financial/doctor-settlements',
};

const normalizeTabKey = (key) => {
  if (!key) return 'solvency';
  if (key === 'settlements') return 'doctor-settlements';
  if (key === 'refunds') return 'refund-cases';
  if (key === 'overview') return 'solvency';
  return key;
};

const SUBPAGE_METADATA = {
  solvency: {
    title: 'Trung Tâm Ngân Quỹ & Điều Phối Dòng Tiền (Master Treasury Console)',
    tag: 'Chỉ Huy Tài Chính Toàn Sàn',
    description: 'Bảng điều khiển tổng hợp dòng tiền 3 nhánh: Quyết toán bác sĩ, Duyệt chi rút tiền, Hoàn tiền hủy lịch và Chu trình tự động hóa toàn diện.',
    icon: Scale,
    color: '#10b981'
  },
  exceptions: {
    title: 'Trung Tâm Xử Lý Ngoại Lệ Tài Chính (Financial Exception Hub)',
    tag: 'Hàng Đợi Xử Lý Tập Trung',
    description: 'Tập trung toàn bộ các giao dịch cần can thiệp: Rút tiền quá hạn mức, khiếu nại hoàn tiền, thù lao tạm giữ và cảnh báo vi phạm SLA.',
    icon: AlertOctagon,
    color: '#f43f5e'
  },
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
    description: 'Bảng kê đối soát thù lao từng ca khám (T+0), tự động trích quỹ đối soát và phân bổ vào ví bác sĩ.',
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

  // Tabs: 'exceptions' (Mission Control) | 'solvency' | 'inflows' | 'withdrawals' | 'ledger' | 'wallets' | 'settings'
  const [activeTab, setActiveTab] = useState(defaultTab || 'exceptions');

  // Synchronize activeTab when defaultTab prop or location changes
  useEffect(() => {
    let foundTab = Object.keys(TAB_ROUTES).find(key => TAB_ROUTES[key] === location.pathname);
    foundTab = normalizeTabKey(foundTab);
    if (foundTab && foundTab !== activeTab) {
      setActiveTab(foundTab);
    } else if (defaultTab && normalizeTabKey(defaultTab) !== activeTab) {
      setActiveTab(normalizeTabKey(defaultTab));
    }
  }, [location.pathname, defaultTab]);

  const handleSwitchTab = (tabKey) => {
    const resolvedTab = normalizeTabKey(tabKey);
    setActiveTab(resolvedTab);
    const targetRoute = TAB_ROUTES[resolvedTab] || TAB_ROUTES[tabKey];
    if (targetRoute && location.pathname !== targetRoute) {
      navigate(targetRoute);
    }
  };

  const isOverview = activeTab === 'solvency';
  const currentSubpage = SUBPAGE_METADATA[activeTab] || SUBPAGE_METADATA.inflows;
  const CurrentSubpageIcon = currentSubpage?.icon || Scale;

  // Solvency Metrics State
  const [reserveRatio, setReserveRatio] = useState(null);
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
  const [inputSettlementHoldHours, setInputSettlementHoldHours] = useState(24);
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

  // ── [PHASE 7] PERIODIC TREASURY CYCLES & DRILLDOWN STATE ──
  const [isPeriodicModalOpen, setIsPeriodicModalOpen] = useState(false);
  const [periodicData, setPeriodicData] = useState(null);
  const [loadingPeriodic, setLoadingPeriodic] = useState(false);
  const [activeCycleDrilldown, setActiveCycleDrilldown] = useState(null);

  const loadPeriodicData = useCallback(async () => {
    setLoadingPeriodic(true);
    try {
      const res = await getPeriodicTreasuryCycles({ months: 12 });
      if (res && res.errCode === 0 && res.data) {
        setPeriodicData(res.data);
      } else {
        toast.error(res?.errMessage || 'Không thể tải chu kỳ ngân quỹ');
      }
    } catch (err) {
      toast.error('Lỗi khi tải bảng đối soát chu kỳ');
    } finally {
      setLoadingPeriodic(false);
    }
  }, []);

  const openPeriodicModal = () => {
    loadPeriodicData();
    setIsPeriodicModalOpen(true);
  };

  // ── [PHASE 6] TREASURY FLOAT & INVESTMENT ALLOCATION STATE ──
  const [isFloatModalOpen, setIsFloatModalOpen] = useState(false);
  const [floatTab, setFloatTab] = useState('ALLOCATE'); // 'ALLOCATE' | 'REIMBURSE'
  const [floatAmount, setFloatAmount] = useState(0);
  const [floatAmountStr, setFloatAmountStr] = useState('');
  const [floatNote, setFloatNote] = useState('');
  const [floatDueDate, setFloatDueDate] = useState('');
  const [floatOverrideConfirm, setFloatOverrideConfirm] = useState(false);
  const [isSubmittingFloat, setIsSubmittingFloat] = useState(false);

  // Format currency
  const formatMoney = (amount) => {
    return (Number(amount) || 0).toLocaleString('vi-VN') + ' ₫';
  };

  // Exception Queue State (for badges and overview quick alert)
  const [exceptionSummary, setExceptionSummary] = useState({
    totalCount: 0,
    criticalCount: 0,
    highCount: 0,
    circuitBreakerActive: false,
    lcrCurrent: 100,
  });
  const [runningAutomation, setRunningAutomation] = useState(false);

  const loadExceptionSummary = useCallback(async () => {
    try {
      const res = await getAdminExceptionQueue();
      if (res && res.errCode === 0 && res.data?.summary) {
        setExceptionSummary(res.data.summary);
      }
    } catch (err) {
      console.error('Error fetching exception summary:', err);
    }
  }, []);

  const handleRunQuickCycle = async () => {
    setRunningAutomation(true);
    try {
      const res = await runFinancialAutomationCycle();
      if (res && res.errCode === 0) {
        toast.success(res.message || 'Chu trình tự động hoàn tất!');
        loadExceptionSummary();
        loadMetrics();
      } else {
        toast.error(res?.errMessage || 'Chu trình tự động thất bại');
      }
    } catch (err) {
      toast.error('Lỗi khi kích hoạt chu trình tự động');
    } finally {
      setRunningAutomation(false);
    }
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
      const params = ratioVal != null ? { reserveRatio: ratioVal } : {};
      const res = await getAdminLiquidityMetrics(params);
      if (res && res.errCode === 0 && res.data?.solvency?.reserveRatio) {
        setReserveRatio(res.data.solvency.reserveRatio);
      }
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
        setInputSettlementHoldHours(res.data.settlementHoldHours !== undefined ? res.data.settlementHoldHours : 24);
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
        settlementHoldHours: inputSettlementHoldHours,
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
    loadExceptionSummary(); // tải số lượng ngoại lệ cho badge và quick alert
  }, [loadMetrics, loadWithdrawals, loadConfigs, loadExceptionSummary]);

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

    // Confirmed by admin action

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

  // ── [PHASE 6] Float Handlers ──
  const handleAllocateFloat = async (e) => {
    e.preventDefault();
    if (floatAmount <= 0) {
      toast.warning('Vui lòng nhập số tiền cần trích lớn hơn 0');
      return;
    }
    setIsSubmittingFloat(true);
    try {
      const res = await allocateFloatCapital({
        amount: floatAmount,
        note: floatNote,
        dueDate: floatDueDate,
        overrideConfirm: floatOverrideConfirm,
      });
      if (res && res.errCode === 0) {
        toast.success(res.message || 'Trích vốn đầu tư thành công!');
        setIsFloatModalOpen(false);
        setFloatAmount(0);
        setFloatAmountStr('');
        setFloatNote('');
        setFloatOverrideConfirm(false);
        await loadMetrics();
      } else if (res && res.errCode === 2) {
        toast.error(res.errMessage);
      } else {
        toast.error(res?.errMessage || 'Không thể trích vốn');
      }
    } catch (err) {
      toast.error(err.response?.data?.errMessage || 'Lỗi khi thực hiện trích vốn');
    } finally {
      setIsSubmittingFloat(false);
    }
  };

  const handleReimburseFloat = async (e) => {
    e.preventDefault();
    if (floatAmount <= 0) {
      toast.warning('Vui lòng nhập số tiền bù hoàn lớn hơn 0');
      return;
    }
    setIsSubmittingFloat(true);
    try {
      const res = await reimburseFloatCapital({
        amount: floatAmount,
        note: floatNote,
      });
      if (res && res.errCode === 0) {
        toast.success(res.message || 'Bù hoàn vốn về két thành công!');
        setIsFloatModalOpen(false);
        setFloatAmount(0);
        setFloatAmountStr('');
        setFloatNote('');
        await loadMetrics();
      } else {
        toast.error(res?.errMessage || 'Không thể bù hoàn vốn');
      }
    } catch (err) {
      toast.error(err.response?.data?.errMessage || 'Lỗi khi thực hiện bù vốn');
    } finally {
      setIsSubmittingFloat(false);
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

              {/* Nút Bảng Đối Soát Chu Kỳ Drilldown */}
              <button
                type="button"
                className="tw-px-3.5 tw-py-2 tw-rounded-xl tw-text-xs tw-font-bold tw-flex tw-items-center tw-gap-1.5 tw-transition tw-border tw-cursor-pointer tw-shadow-sm tw-bg-indigo-50 hover:tw-bg-indigo-100 tw-text-indigo-700 tw-border-indigo-200"
                onClick={openPeriodicModal}
                title="Bóc tách dòng tiền vào - ra, số dư két và đối soát chi tiết theo từng chu kỳ & tổng lũy kế"
              >
                <Calendar size={14} />
                <span>Bảng Chu Kỳ Đối Soát</span>
              </button>

              {/* Nút Điều Chuyển Vốn Float */}
              <button
                type="button"
                className="tw-px-3.5 tw-py-2 tw-rounded-xl tw-text-xs tw-font-bold tw-flex tw-items-center tw-gap-1.5 tw-transition tw-border tw-cursor-pointer tw-shadow-sm hover:tw-opacity-90"
                style={{
                  background: (summary.floatAllocatedAmount > 0) ? '#fdf2f8' : '#eff6ff',
                  color: (summary.floatAllocatedAmount > 0) ? '#be185d' : '#1d4ed8',
                  borderColor: (summary.floatAllocatedAmount > 0) ? '#fbcfe8' : '#bfdbfe',
                }}
                onClick={() => {
                  setFloatAmount(0);
                  setFloatAmountStr('');
                  setFloatNote('');
                  setFloatTab((summary.floatAllocatedAmount > 0) ? 'REIMBURSE' : 'ALLOCATE');
                  setIsFloatModalOpen(true);
                }}
                title="Trích rút vốn nhàn rỗi đi đầu tư hoặc bù hoàn vốn về két"
              >
                <TrendingUp size={14} />
                <span>Điều Chuyển Vốn (Float)</span>
                {summary.floatAllocatedAmount > 0 && (
                  <span className="tw-px-2 tw-py-0.5 tw-rounded-full tw-text-3xs tw-font-bold tw-bg-pink-600 tw-text-white tw-ml-1">
                    Đang trích {formatMoney(summary.floatAllocatedAmount)}
                  </span>
                )}
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
                {summary.floatAllocatedAmount > 0 && (
                  <div className="breakdown-item tw-bg-pink-50 tw-p-1.5 tw-rounded-md">
                    <span className="tw-text-pink-800 tw-font-bold">Đang trích đầu tư ngoài sàn:</span>
                    <strong className="tw-text-pink-700 tw-font-black">
                      -{formatMoney(summary.floatAllocatedAmount)}
                    </strong>
                  </div>
                )}
                <div className="tw-pt-2 tw-mt-2 tw-border-t tw-border-slate-100 tw-flex tw-justify-between tw-items-center">
                  <span className="tw-text-2xs tw-text-slate-400">Điều phối vốn két sàn:</span>
                  <button
                    type="button"
                    className="tw-text-2xs tw-font-bold tw-text-indigo-600 hover:tw-text-indigo-800 tw-border-none tw-bg-transparent tw-p-0 tw-cursor-pointer tw-flex tw-items-center tw-gap-1"
                    onClick={() => {
                      setFloatAmount(0);
                      setFloatAmountStr('');
                      setFloatNote('');
                      setFloatTab(summary.floatAllocatedAmount > 0 ? 'REIMBURSE' : 'ALLOCATE');
                      setIsFloatModalOpen(true);
                    }}
                  >
                    <span>{summary.floatAllocatedAmount > 0 ? 'Quản lý bù hoàn' : 'Trích vốn đầu tư'}</span>
                    <ChevronRight size={12} />
                  </button>
                </div>
              </div>
            </div>

            {/* KPI 3: Nghĩa vụ đến hạn 7 ngày (LCR 7D) */}
            <div className="kpi-card kpi-card--due7d tw-cursor-pointer hover:tw-shadow-md tw-transition" onClick={openPeriodicModal} title="Nhấp để mở bảng đối soát toàn bộ chu kỳ">
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
            <div className="kpi-card kpi-card--surplus tw-cursor-pointer hover:tw-shadow-md tw-transition" onClick={openPeriodicModal} title="Nhấp để mở bảng đối soát toàn bộ chu kỳ">
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
                  <span>Mức dự trữ kịch bản ({(solvency.reserveRatio || liquidityRisk.reserveRatio || reserveRatio || 40)}%):</span>
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

            {/* Nút Điều Chuyển Vốn Float */}
              <button
                type="button"
                className="tw-px-3.5 tw-py-2 tw-rounded-xl tw-text-xs tw-font-bold tw-flex tw-items-center tw-gap-1.5 tw-transition tw-border tw-cursor-pointer tw-shadow-sm hover:tw-opacity-90"
                style={{
                  background: (summary.floatAllocatedAmount > 0) ? '#fdf2f8' : '#eff6ff',
                  color: (summary.floatAllocatedAmount > 0) ? '#be185d' : '#1d4ed8',
                  borderColor: (summary.floatAllocatedAmount > 0) ? '#fbcfe8' : '#bfdbfe',
                }}
                onClick={() => {
                  setFloatAmount(0);
                  setFloatAmountStr('');
                  setFloatNote('');
                  setFloatTab((summary.floatAllocatedAmount > 0) ? 'REIMBURSE' : 'ALLOCATE');
                  setIsFloatModalOpen(true);
                }}
                title="Trích rút vốn nhàn rỗi đi đầu tư hoặc bù hoàn vốn về két"
              >
                <TrendingUp size={14} />
                <span>Điều Chuyển Vốn (Float)</span>
                {summary.floatAllocatedAmount > 0 && (
                  <span className="tw-px-2 tw-py-0.5 tw-rounded-full tw-text-3xs tw-font-bold tw-bg-pink-600 tw-text-white tw-ml-1">
                    Đang trích {formatMoney(summary.floatAllocatedAmount)}
                  </span>
                )}
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
              className={`tab-btn ${(activeTab === 'refund-cases' || activeTab === 'refunds') ? 'active' : ''}`}
              onClick={() => handleSwitchTab('refund-cases')}
            >
              <ShieldAlert size={15} />
              <span>5. Quản trị hoàn tiền</span>
            </button>

            <button
              type="button"
              className={`tab-btn ${(activeTab === 'doctor-settlements' || activeTab === 'settlements') ? 'active' : ''}`}
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
          {/* ══════════════ TAB 1: MASTER TREASURY & LIQUIDITY CONSOLE ══════════════ */}
          {(activeTab === 'solvency' || activeTab === 'overview') && (
            <MasterTreasuryConsole onNavigateTab={handleSwitchTab} />
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

                    {/* Cấu hình 5: Thời gian giữ thù lao Bác sĩ (T+0 / T+24h) */}
                    <div className="form-field-group tw-mt-5">
                      <div className="tw-flex tw-justify-between tw-items-center">
                        <label className="field-label">
                          5. Thời Gian Tạm Giữ Thù Lao Bác Sĩ (T+0h / T+24h) *
                        </label>
                        <span className={`tw-px-2.5 tw-py-0.5 tw-rounded-full tw-text-xs tw-font-bold ${
                          inputSettlementHoldHours === 0
                            ? 'tw-bg-purple-100 tw-text-purple-800'
                            : 'tw-bg-amber-100 tw-text-amber-800'
                        }`}>
                          {inputSettlementHoldHours === 0 ? 'T+0 (Khả dụng ngay tức thì)' : `T+${inputSettlementHoldHours} Giờ`}
                        </span>
                      </div>
                      <p className="field-hint">
                        Thời hạn tạm giữ thù lao sau khi ca khám hoàn tất để phòng ngừa khiếu nại chất lượng dịch vụ. Thiết lập <strong>0 giờ (T+0)</strong> để mở khóa khả dụng tức thì phục vụ Demo / Thanh toán nhanh.
                      </p>
                      <div className="preset-btn-group tw-mt-2">
                        {[
                          { label: '⚡ T+0 (Demo Tức Thì)', value: 0 },
                          { label: 'T+1 Giờ', value: 1 },
                          { label: 'T+12 Giờ', value: 12 },
                          { label: 'T+24 Giờ (Chuẩn)', value: 24 },
                          { label: 'T+48 Giờ', value: 48 },
                        ].map((preset) => (
                          <button
                            key={preset.value}
                            type="button"
                            className={`preset-btn ${Number(inputSettlementHoldHours) === preset.value ? 'active' : ''}`}
                            onClick={() => setInputSettlementHoldHours(preset.value)}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                      <div className="tw-mt-2.5">
                        <input
                          type="number"
                          min="0"
                          max="720"
                          className="custom-number-input"
                          value={inputSettlementHoldHours}
                          onChange={(e) => setInputSettlementHoldHours(Math.max(0, Number(e.target.value) || 0))}
                          required
                        />
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
                    const simOutflow = Number(summary.totalCashOutflow) || 0;
                    const simFloat = Number(summary.floatAllocatedAmount) || 0;
                    const simTreasuryCash = Math.max(0, simInflow - simOutflow - simFloat);
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
          {(activeTab === 'refund-cases' || activeTab === 'refunds') && (
            <RefundCasesTab />
          )}

          {/* ══════════════ TAB 5: QUYẾT TOÁN THÙ LAO BÁC SĨ ══════════════ */}
          {(activeTab === 'doctor-settlements' || activeTab === 'settlements') && (
            <DoctorSettlementsTab />
          )}

          {/* ══════════════ TAB 0: TRUNG TÂM XỬ LÝ NGOẠI LỆ TÀI CHÍNH ══════════════ */}
          {activeTab === 'exceptions' && (
            <FinancialExceptionHub onNavigateTab={handleSwitchTab} />
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

      {/* ══════════════ MODAL: QUẢN TRỊ VỐN ĐẦU TƯ NGOÀI SÀN & BÙ HOÀN QUỸ (FLOAT) ══════════════ */}
      {isFloatModalOpen && (
        <div
          className="tw-fixed tw-inset-0 tw-bg-slate-900/60 tw-backdrop-blur-sm tw-z-50 tw-flex tw-items-center tw-justify-center tw-p-4 tw-animate-in tw-fade-in"
          onClick={() => !isSubmittingFloat && setIsFloatModalOpen(false)}
        >
          <div
            className="tw-bg-white tw-rounded-3xl tw-shadow-2xl tw-w-full tw-max-w-2xl tw-overflow-hidden tw-border tw-border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="tw-p-6 tw-bg-slate-900 tw-text-white tw-flex tw-items-center tw-justify-between">
              <div className="tw-flex tw-items-center tw-gap-3">
                <div className="tw-w-10 tw-h-10 tw-rounded-2xl tw-bg-indigo-500/20 tw-text-indigo-400 tw-flex tw-items-center tw-justify-center">
                  <TrendingUp size={20} />
                </div>
                <div>
                  <h3 className="tw-font-bold tw-text-base tw-text-white tw-m-0">
                    Điều Phối Vốn Đầu Tư Ngoài Sàn & Bù Hoàn Quỹ
                  </h3>
                  <div className="tw-text-xs tw-text-slate-400">
                    Treasury Capital Allocation • Trích rút vốn nhàn rỗi & Bù hoàn linh hoạt
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="tw-text-slate-400 hover:tw-text-white tw-border-none tw-bg-transparent tw-p-1 tw-cursor-pointer tw-text-xl"
                onClick={() => !isSubmittingFloat && setIsFloatModalOpen(false)}
              >
                &times;
              </button>
            </div>

            {/* Tab Selector */}
            <div className="tw-flex tw-border-b tw-border-slate-200 tw-bg-slate-50 tw-p-2 tw-gap-2">
              <button
                type="button"
                className={`tw-flex-1 tw-py-2.5 tw-rounded-xl tw-text-xs tw-font-bold tw-border-none tw-cursor-pointer tw-transition ${
                  floatTab === 'ALLOCATE'
                    ? 'tw-bg-white tw-text-indigo-700 tw-shadow-sm'
                    : 'tw-bg-transparent tw-text-slate-500 hover:tw-text-slate-800'
                }`}
                onClick={() => {
                  setFloatTab('ALLOCATE');
                  setFloatAmount(0);
                  setFloatAmountStr('');
                }}
              >
                1. Trích Rút Vốn Đi Đầu Tư / Việc Khác
              </button>
              <button
                type="button"
                className={`tw-flex-1 tw-py-2.5 tw-rounded-xl tw-text-xs tw-font-bold tw-border-none tw-cursor-pointer tw-transition ${
                  floatTab === 'REIMBURSE'
                    ? 'tw-bg-white tw-text-emerald-700 tw-shadow-sm'
                    : 'tw-bg-transparent tw-text-slate-500 hover:tw-text-slate-800'
                }`}
                onClick={() => {
                  setFloatTab('REIMBURSE');
                  setFloatAmount(summary.floatAllocatedAmount || 0);
                  setFloatAmountStr((summary.floatAllocatedAmount || 0) > 0 ? (summary.floatAllocatedAmount).toLocaleString('vi-VN') : '');
                }}
              >
                2. Bù Hoàn Vốn Về Két Sàn {summary.floatAllocatedAmount > 0 && `(${formatMoney(summary.floatAllocatedAmount)})`}
              </button>
            </div>

            {/* Modal Body */}
            {floatTab === 'ALLOCATE' ? (
              <form onSubmit={handleAllocateFloat} className="tw-p-6 tw-space-y-4">
                {/* Stats Bar */}
                {(() => {
                  const netCash = Number(summary.realNetCashInTreasury || 0);
                  const due7d = Number(liquidityRisk.totalDue7Days || 0);
                  const mandReserve = Number(solvency.mandatoryReserveCash || 0);
                  const maxSafe = Math.max(0, netCash - due7d - mandReserve);
                  const simRemainingCash = Math.max(0, netCash - floatAmount);
                  const isOverSafe = floatAmount > maxSafe;

                  return (
                    <>
                      <div className="tw-grid tw-grid-cols-2 tw-gap-3 tw-p-4 tw-bg-indigo-50/50 tw-rounded-2xl tw-border tw-border-indigo-100 tw-text-xs">
                        <div>
                          <span className="tw-text-slate-500">Tiền mặt khả dụng két hiện tại:</span>
                          <div className="tw-text-base tw-font-black tw-text-slate-900 tw-font-mono tw-mt-0.5">
                            {formatMoney(netCash)}
                          </div>
                        </div>
                        <div>
                          <span className="tw-text-slate-500">Mức tối đa khuyến nghị an toàn:</span>
                          <div className="tw-text-base tw-font-black tw-text-emerald-700 tw-font-mono tw-mt-0.5">
                            {formatMoney(maxSafe)}
                          </div>
                        </div>
                      </div>

                      {/* Input Số Tiền */}
                      <div>
                        <div className="tw-flex tw-justify-between tw-items-center tw-mb-1">
                          <label className="tw-text-xs tw-font-bold tw-text-slate-700">
                            Số tiền trích đi đầu tư (VNĐ) *:
                          </label>
                          <span className="tw-text-xs tw-font-bold tw-text-indigo-600 tw-font-mono">
                            {formatMoney(floatAmount)}
                          </span>
                        </div>
                        <input
                          type="text"
                          className="tw-w-full tw-p-3 tw-border tw-border-slate-300 tw-rounded-xl tw-text-sm tw-font-mono tw-font-bold focus:tw-outline-none focus:tw-border-indigo-600"
                          placeholder="Nhập số tiền tùy ý... (VD: 200,000,000)"
                          value={floatAmountStr}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/[^0-9]/g, '');
                            const num = parseInt(raw, 10) || 0;
                            setFloatAmount(num);
                            setFloatAmountStr(num > 0 ? num.toLocaleString('vi-VN') : '');
                          }}
                          required
                        />

                        {/* Presets */}
                        <div className="tw-flex tw-items-center tw-gap-2 tw-mt-2">
                          <span className="tw-text-2xs tw-text-slate-400">Chọn nhanh:</span>
                          {[
                            { label: '25% Khả dụng', val: Math.round(maxSafe * 0.25) },
                            { label: '50% Khả dụng', val: Math.round(maxSafe * 0.5) },
                            { label: '75% Khả dụng', val: Math.round(maxSafe * 0.75) },
                            { label: '100% An toàn', val: maxSafe },
                          ].map((p, idx) => (
                            <button
                              key={idx}
                              type="button"
                              className="tw-px-2.5 tw-py-1 tw-bg-slate-100 hover:tw-bg-slate-200 tw-text-slate-700 tw-rounded-lg tw-text-2xs tw-font-semibold tw-border-none tw-cursor-pointer"
                              onClick={() => {
                                setFloatAmount(p.val);
                                setFloatAmountStr(p.val > 0 ? p.val.toLocaleString('vi-VN') : '');
                              }}
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Ghi chú & Ngày bù */}
                      <div className="tw-grid tw-grid-cols-1 sm:tw-grid-cols-2 tw-gap-3">
                        <div>
                          <label className="tw-text-xs tw-font-bold tw-text-slate-700 tw-mb-1 tw-block">
                            Mục đích trích vốn:
                          </label>
                          <input
                            type="text"
                            className="tw-w-full tw-p-2.5 tw-border tw-border-slate-300 tw-rounded-xl tw-text-xs"
                            placeholder="VD: Gửi tiết kiệm kỳ hạn ngắn 1 tháng..."
                            value={floatNote}
                            onChange={(e) => setFloatNote(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="tw-text-xs tw-font-bold tw-text-slate-700 tw-mb-1 tw-block">
                            Hạn dự kiến bù hoàn vốn:
                          </label>
                          <input
                            type="date"
                            className="tw-w-full tw-p-2.5 tw-border tw-border-slate-300 tw-rounded-xl tw-text-xs"
                            value={floatDueDate}
                            onChange={(e) => setFloatDueDate(e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Live Simulation Box */}
                      <div className="tw-p-3.5 tw-bg-slate-50 tw-rounded-2xl tw-border tw-border-slate-200 tw-space-y-1.5 tw-text-xs">
                        <div className="tw-font-bold tw-text-2xs tw-text-slate-500 tw-uppercase">
                          Dự báo sau khi trích:
                        </div>
                        <div className="tw-flex tw-justify-between">
                          <span className="tw-text-slate-600">Tiền két sàn còn lại:</span>
                          <strong className={simRemainingCash > 0 ? 'tw-text-slate-900 tw-font-mono' : 'tw-text-rose-600 tw-font-mono'}>
                            {formatMoney(simRemainingCash)}
                          </strong>
                        </div>
                        <div className="tw-flex tw-justify-between">
                          <span className="tw-text-slate-600">Trạng thái thanh khoản dự báo:</span>
                          <strong className={isOverSafe ? 'tw-text-rose-600' : 'tw-text-emerald-600'}>
                            {isOverSafe ? 'CẢNH BÁO: Rút vượt ngưỡng an toàn' : 'Tối ưu an toàn'}
                          </strong>
                        </div>
                      </div>

                      {/* Warning & Override Checkbox */}
                      {isOverSafe && (
                        <div className="tw-p-3.5 tw-bg-rose-50 tw-rounded-2xl tw-border tw-border-rose-200 tw-space-y-2">
                          <div className="tw-text-xs tw-font-bold tw-text-rose-800">
                            Cảnh báo: Khoản tiền này vượt mức an toàn ({formatMoney(maxSafe)}).
                          </div>
                          <label className="tw-flex tw-items-start tw-gap-2 tw-text-2xs tw-text-rose-700 tw-cursor-pointer">
                            <input
                              type="checkbox"
                              className="tw-mt-0.5"
                              checked={floatOverrideConfirm}
                              onChange={(e) => setFloatOverrideConfirm(e.target.checked)}
                            />
                            <span>
                              Tôi hiểu việc rút vượt hạn mức có thể ảnh hưởng đến khả năng giải ngân tức thì và cam kết bù lại đúng hạn.
                            </span>
                          </label>
                        </div>
                      )}

                      {/* Submit Buttons */}
                      <div className="tw-flex tw-justify-end tw-gap-2 tw-pt-3 tw-border-t tw-border-slate-100">
                        <button
                          type="button"
                          className="tw-px-4 tw-py-2 tw-bg-slate-100 hover:tw-bg-slate-200 tw-text-slate-700 tw-rounded-xl tw-text-xs tw-font-semibold tw-border-none tw-cursor-pointer"
                          onClick={() => setIsFloatModalOpen(false)}
                          disabled={isSubmittingFloat}
                        >
                          Hủy bỏ
                        </button>
                        <button
                          type="submit"
                          className="tw-px-5 tw-py-2 tw-bg-indigo-600 hover:tw-bg-indigo-700 tw-text-white tw-rounded-xl tw-text-xs tw-font-bold tw-border-none tw-cursor-pointer tw-flex tw-items-center tw-gap-1.5 tw-shadow-sm disabled:tw-opacity-50"
                          disabled={isSubmittingFloat || floatAmount <= 0 || (isOverSafe && !floatOverrideConfirm)}
                        >
                          <TrendingUp size={14} />
                          <span>{isSubmittingFloat ? 'Đang điều chuyển...' : 'Xác Nhận Trích Vốn'}</span>
                        </button>
                      </div>
                    </>
                  );
                })()}
              </form>
            ) : (
              <form onSubmit={handleReimburseFloat} className="tw-p-6 tw-space-y-4">
                {/* Stats Bar */}
                <div className="tw-p-4 tw-bg-pink-50 tw-rounded-2xl tw-border tw-border-pink-200 tw-space-y-1">
                  <span className="tw-text-xs tw-text-pink-800">Tổng vốn đang trích nợ ngoài sàn:</span>
                  <div className="tw-text-2xl tw-font-black tw-text-pink-700 tw-font-mono">
                    {formatMoney(summary.floatAllocatedAmount || 0)}
                  </div>
                  {summary.floatAllocatedNote && (
                    <div className="tw-text-2xs tw-text-pink-600 tw-italic">
                      Mục đích: "{summary.floatAllocatedNote}"
                    </div>
                  )}
                  {summary.floatAllocatedDueDate && (
                    <div className="tw-text-2xs tw-text-pink-600">
                      Hạn bù vốn: <strong>{moment(summary.floatAllocatedDueDate).format('DD/MM/YYYY')}</strong>
                    </div>
                  )}
                </div>

                {/* Input Bù Vốn */}
                <div>
                  <div className="tw-flex tw-justify-between tw-items-center tw-mb-1">
                    <label className="tw-text-xs tw-font-bold tw-text-slate-700">
                      Số tiền nạp bù về két (VNĐ) *:
                    </label>
                    <button
                      type="button"
                      className="tw-text-xs tw-text-emerald-600 hover:tw-underline tw-font-bold tw-border-none tw-bg-transparent tw-cursor-pointer"
                      onClick={() => {
                        const totalDebt = summary.floatAllocatedAmount || 0;
                        setFloatAmount(totalDebt);
                        setFloatAmountStr(totalDebt.toLocaleString('vi-VN'));
                      }}
                    >
                      Bù toàn bộ số còn lại
                    </button>
                  </div>
                  <input
                    type="text"
                    className="tw-w-full tw-p-3 tw-border tw-border-slate-300 tw-rounded-xl tw-text-sm tw-font-mono tw-font-bold focus:tw-outline-none focus:tw-border-emerald-600"
                    placeholder="Nhập số tiền bù... (Có thể bù từng phần)"
                    value={floatAmountStr}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9]/g, '');
                      const num = parseInt(raw, 10) || 0;
                      setFloatAmount(num);
                      setFloatAmountStr(num > 0 ? num.toLocaleString('vi-VN') : '');
                    }}
                    required
                  />
                  <small className="tw-text-2xs tw-text-slate-400 tw-mt-1 tw-block">
                    Hệ thống cho phép bù linh hoạt nhiều lần theo đợt thu hồi dòng tiền.
                  </small>
                </div>

                <div>
                  <label className="tw-text-xs tw-font-bold tw-text-slate-700 tw-mb-1 tw-block">
                    Ghi chú nạp bù:
                  </label>
                  <input
                    type="text"
                    className="tw-w-full tw-p-2.5 tw-border tw-border-slate-300 tw-rounded-xl tw-text-xs"
                    placeholder="VD: Thu hồi tiền gửi ngân hàng đợt 1..."
                    value={floatNote}
                    onChange={(e) => setFloatNote(e.target.value)}
                  />
                </div>

                {/* Submit Buttons */}
                <div className="tw-flex tw-justify-end tw-gap-2 tw-pt-3 tw-border-t tw-border-slate-100">
                  <button
                    type="button"
                    className="tw-px-4 tw-py-2 tw-bg-slate-100 hover:tw-bg-slate-200 tw-text-slate-700 tw-rounded-xl tw-text-xs tw-font-semibold tw-border-none tw-cursor-pointer"
                    onClick={() => setIsFloatModalOpen(false)}
                    disabled={isSubmittingFloat}
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className="tw-px-5 tw-py-2 tw-bg-emerald-600 hover:tw-bg-emerald-700 tw-text-white tw-rounded-xl tw-text-xs tw-font-bold tw-border-none tw-cursor-pointer tw-flex tw-items-center tw-gap-1.5 tw-shadow-sm disabled:tw-opacity-50"
                    disabled={isSubmittingFloat || floatAmount <= 0}
                  >
                    <CheckCircle2 size={14} />
                    <span>{isSubmittingFloat ? 'Đang bù vốn...' : 'Xác Nhận Nạp Bù Về Két'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

{/* ══════════════ MODAL: BẢNG ĐỐI SOÁT NGÂN QUỸ THEO CHU KỲ & TỔNG LŨY KẾ ══════════════ */}
      {isPeriodicModalOpen && (
        <div
          className="tw-fixed tw-inset-0 tw-bg-slate-900/60 tw-backdrop-blur-sm tw-z-50 tw-flex tw-items-center tw-justify-center tw-p-4 tw-animate-in tw-fade-in"
          onClick={() => setIsPeriodicModalOpen(false)}
        >
          <div
            className="tw-bg-white tw-rounded-3xl tw-shadow-2xl tw-w-full tw-max-w-6xl tw-max-h-[92vh] tw-flex tw-flex-col tw-overflow-hidden tw-border tw-border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="tw-p-6 tw-bg-slate-900 tw-text-white tw-flex tw-items-center tw-justify-between tw-flex-shrink-0">
              <div className="tw-flex tw-items-center tw-gap-3.5">
                <div className="tw-w-11 tw-h-11 tw-rounded-2xl tw-bg-indigo-500/20 tw-text-indigo-400 tw-flex tw-items-center tw-justify-center">
                  <Calendar size={22} />
                </div>
                <div>
                  <div className="tw-flex tw-items-center tw-gap-2">
                    <h3 className="tw-font-bold tw-text-base tw-text-white tw-m-0">
                      Bảng Đối Soát Ngân Quỹ Theo Chu Kỳ & Tổng Lũy Kế
                    </h3>
                    <span className="tw-px-2 tw-py-0.5 tw-bg-emerald-500/20 tw-text-emerald-400 tw-text-3xs tw-font-bold tw-rounded-full tw-border tw-border-emerald-500/30">
                      ĐỐI SOÁT SỔ KÉP TOÀN DIỆN
                    </span>
                  </div>
                  <div className="tw-text-xs tw-text-slate-400 tw-mt-0.5">
                    Periodic Treasury Statement • Bóc tách dòng tiền vào/ra, vị thế két thực tế & nghĩa vụ đối soát từng tháng
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="tw-text-slate-400 hover:tw-text-white tw-border-none tw-bg-transparent tw-p-1 tw-cursor-pointer tw-text-2xl"
                onClick={() => setIsPeriodicModalOpen(false)}
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div className="tw-p-6 tw-overflow-y-auto tw-space-y-5 tw-flex-1">
              {/* 4 Mini KPI Summary Pills */}
              {periodicData?.allTimeSummary && (
                <div className="tw-grid tw-grid-cols-2 md:tw-grid-cols-4 tw-gap-3">
                  <div className="tw-p-3.5 tw-bg-slate-50 tw-rounded-2xl tw-border tw-border-slate-200">
                    <span className="tw-text-2xs tw-text-slate-500 tw-font-semibold tw-block">Vốn bảo chứng khởi tạo</span>
                    <strong className="tw-text-sm tw-font-mono tw-text-slate-800">
                      {formatMoney(periodicData.allTimeSummary.platformReserveFund)}
                    </strong>
                  </div>
                  <div className="tw-p-3.5 tw-bg-emerald-50/60 tw-rounded-2xl tw-border tw-border-emerald-100">
                    <span className="tw-text-2xs tw-text-emerald-700 tw-font-semibold tw-block">Tổng thu toàn thời gian</span>
                    <strong className="tw-text-sm tw-font-mono tw-text-emerald-700">
                      +{formatMoney(periodicData.allTimeSummary.allTimeInflows)}
                    </strong>
                  </div>
                  <div className="tw-p-3.5 tw-bg-rose-50/60 tw-rounded-2xl tw-border tw-border-rose-100">
                    <span className="tw-text-2xs tw-text-rose-700 tw-font-semibold tw-block">Tổng chi toàn thời gian</span>
                    <strong className="tw-text-sm tw-font-mono tw-text-rose-700">
                      -{formatMoney(periodicData.allTimeSummary.allTimeOutflows)}
                    </strong>
                  </div>
                  <div className="tw-p-3.5 tw-bg-indigo-50/60 tw-rounded-2xl tw-border tw-border-indigo-100">
                    <span className="tw-text-2xs tw-text-indigo-700 tw-font-semibold tw-block">Tiền két thực tế hiện tại</span>
                    <strong className="tw-text-sm tw-font-mono tw-text-indigo-800">
                      {formatMoney(periodicData.allTimeSummary.currentTreasuryCash)}
                    </strong>
                  </div>
                </div>
              )}

              {/* Bảng Chu Kỳ */}
              <div className="tw-border tw-border-slate-200 tw-rounded-2xl tw-overflow-hidden tw-shadow-sm">
                <table className="tw-w-full tw-text-xs tw-border-collapse">
                  <thead className="tw-bg-slate-100 tw-text-slate-700 tw-font-bold tw-text-2xs tw-uppercase">
                    <tr>
                      <th className="tw-p-3 tw-text-left">Chu Kỳ (Tháng)</th>
                      <th className="tw-p-3 tw-text-right">Tiền Đầu Kỳ</th>
                      <th className="tw-p-3 tw-text-right tw-text-emerald-700">Dòng Tiền Vào</th>
                      <th className="tw-p-3 tw-text-right tw-text-rose-700">Dòng Tiền Ra</th>
                      <th className="tw-p-3 tw-text-right">Dòng Tiền Thuần (Net)</th>
                      <th className="tw-p-3 tw-text-right">Thù Lao BS Phát Sinh</th>
                      <th className="tw-p-3 tw-text-right">Đã Trả Bác Sĩ</th>
                      <th className="tw-p-3 tw-text-right tw-font-black">Tiền Cuối Kỳ</th>
                      <th className="tw-p-3 tw-text-center">Trạng Thái</th>
                    </tr>
                  </thead>
                  <tbody className="tw-divide-y tw-divide-slate-200 tw-bg-white">
                    {loadingPeriodic ? (
                      <tr>
                        <td colSpan={9} className="tw-p-8 tw-text-center tw-text-slate-400">
                          <RotateCw size={20} className="tw-animate-spin tw-inline tw-mr-2" />
                          Đang tổng hợp dữ liệu chu kỳ...
                        </td>
                      </tr>
                    ) : periodicData?.cycles?.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="tw-p-8 tw-text-center tw-text-slate-400">
                          Chưa có chu kỳ giao dịch phát sinh.
                        </td>
                      </tr>
                    ) : (
                      periodicData?.cycles?.map((c) => (
                        <tr
                          key={c.periodCode}
                          className={`hover:tw-bg-slate-50/80 tw-transition ${c.isCurrentMonth ? 'tw-bg-indigo-50/30' : ''}`}
                        >
                          <td className="tw-p-3">
                            <div className="tw-font-bold tw-text-slate-900">{c.periodName}</div>
                            <div className="tw-text-3xs tw-text-slate-400 font-mono">
                              {moment(c.startDate).format('DD/MM')} - {moment(c.endDate).format('DD/MM/YYYY')}
                            </div>
                          </td>
                          <td className="tw-p-3 tw-text-right tw-font-mono tw-text-slate-600">
                            {formatMoney(c.openingCash)}
                          </td>
                          <td className="tw-p-3 tw-text-right tw-font-mono tw-text-emerald-700 tw-font-bold">
                            +{formatMoney(c.totalInflows)}
                          </td>
                          <td className="tw-p-3 tw-text-right tw-font-mono tw-text-rose-600 tw-font-bold">
                            {c.totalOutflows > 0 ? `-${formatMoney(c.totalOutflows)}` : '0 ₫'}
                          </td>
                          <td className="tw-p-3 tw-text-right tw-font-mono tw-font-black">
                            <span className={c.netCashFlow >= 0 ? 'tw-text-emerald-700' : 'tw-text-rose-700'}>
                              {c.netCashFlow > 0 ? '+' : ''}{formatMoney(c.netCashFlow)}
                            </span>
                          </td>
                          <td className="tw-p-3 tw-text-right tw-font-mono tw-text-slate-600">
                            {formatMoney(c.doctorPayableCreated)}
                          </td>
                          <td className="tw-p-3 tw-text-right tw-font-mono tw-text-teal-700">
                            {formatMoney(c.doctorPayoutSettled)}
                          </td>
                          <td className="tw-p-3 tw-text-right tw-font-mono tw-font-black tw-text-slate-900 tw-bg-slate-50/50">
                            {formatMoney(c.closingCash)}
                          </td>
                          <td className="tw-p-3 tw-text-center">
                            {c.isCurrentMonth ? (
                              <span className="tw-px-2 tw-py-0.5 tw-rounded-full tw-text-3xs tw-font-bold tw-bg-indigo-100 tw-text-indigo-700">
                                Hiện tại
                              </span>
                            ) : (
                              <span className="tw-px-2 tw-py-0.5 tw-rounded-full tw-text-3xs tw-font-bold tw-bg-slate-100 tw-text-slate-600">
                                Đã chốt
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {/* HÀNG TỔNG CỘNG LŨY KẾ TOÀN BỘ */}
                  {periodicData?.allTimeSummary && (
                    <tfoot className="tw-bg-slate-900 tw-text-white tw-font-bold">
                      <tr>
                        <td className="tw-p-3 tw-text-amber-400">
                          TỔNG CỘNG LŨY KẾ
                        </td>
                        <td className="tw-p-3 tw-text-right tw-font-mono tw-text-slate-400">
                          —
                        </td>
                        <td className="tw-p-3 tw-text-right tw-font-mono tw-text-emerald-400 tw-font-black">
                          +{formatMoney(periodicData.allTimeSummary.allTimeInflows)}
                        </td>
                        <td className="tw-p-3 tw-text-right tw-font-mono tw-text-rose-400 tw-font-black">
                          -{formatMoney(periodicData.allTimeSummary.allTimeOutflows)}
                        </td>
                        <td className="tw-p-3 tw-text-right tw-font-mono tw-text-teal-300 tw-font-black">
                          +{formatMoney(periodicData.allTimeSummary.allTimeNetCash)}
                        </td>
                        <td className="tw-p-3 tw-text-right tw-font-mono tw-text-slate-300">
                          {formatMoney(periodicData.allTimeSummary.allTimeDoctorPayable)}
                        </td>
                        <td className="tw-p-3 tw-text-right tw-font-mono tw-text-emerald-300">
                          {formatMoney(periodicData.allTimeSummary.allTimeDoctorSettled)}
                        </td>
                        <td className="tw-p-3 tw-text-right tw-font-mono tw-text-emerald-400 tw-font-black tw-text-sm">
                          {formatMoney(periodicData.allTimeSummary.currentTreasuryCash)}
                        </td>
                        <td className="tw-p-3 tw-text-center tw-text-3xs tw-text-emerald-400">
                          KHỚP SỔ KÉP
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              {/* Giải thích ghi chú */}
              <div className="tw-p-3.5 tw-bg-slate-50 tw-rounded-2xl tw-border tw-border-slate-200 tw-text-2xs tw-text-slate-500 tw-flex tw-items-center tw-gap-2">
                <Info size={15} className="tw-text-indigo-600 tw-flex-shrink-0" />
                <span>
                  <strong>Quy tắc đối soát ngân quỹ:</strong> Số dư cuối kỳ = Số dư đầu kỳ + Dòng tiền thuần (Thu - Chi). Tiền cuối kỳ của chu kỳ hiện tại luôn khớp chính xác 100% với số dư két thực tế trên Thẻ 2 Dashboard.
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="tw-p-4 tw-bg-slate-50 tw-border-t tw-border-slate-200 tw-flex tw-justify-between tw-items-center tw-flex-shrink-0">
              <span className="tw-text-xs tw-text-slate-500">
                Hiển thị <strong>{periodicData?.cycles?.length || 0}</strong> chu kỳ hoạt động gần nhất
              </span>
              <button
                type="button"
                className="tw-px-5 tw-py-2 tw-bg-slate-900 hover:tw-bg-slate-800 tw-text-white tw-rounded-xl tw-text-xs tw-font-bold tw-border-none tw-cursor-pointer"
                onClick={() => setIsPeriodicModalOpen(false)}
              >
                Đóng Bảng Đối Soát
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiquidityDashboard;
