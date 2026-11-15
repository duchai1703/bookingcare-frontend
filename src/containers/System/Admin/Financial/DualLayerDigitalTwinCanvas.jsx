// src/containers/System/Admin/Financial/DualLayerDigitalTwinCanvas.jsx
// [DUAL-LAYER DIGITAL TWIN CANVAS — RAMP FINTECH ENGINE]
// Tái hiện chính xác sơ đồ bảng trắng: Đối chiếu dòng số dư nội bộ (App Ledger) và tiền mặt thật tại ngân hàng (Fiat/Bank)
// 100% Số liệu thực tế từ DB, Tích hợp Bộ lọc thời gian & Bảng mổ xẻ cấu tạo minh chứng rõ ràng cho TỪNG MỤC
import React, { useState, useMemo, useEffect } from 'react';
import moment from 'moment';
import {
  Landmark,
  Wallet,
  Lock,
  Coins,
  DollarSign,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  AlertTriangle,
  Activity,
  Layers,
  ArrowRight,
  CheckCircle2,
  X,
  CreditCard,
  Building,
  User,
  GitCommit,
  Info,
  Calendar,
  Filter,
  Search,
  ArrowUpDown,
  RotateCw,
  Eye,
  ExternalLink,
  SlidersHorizontal,
  ChevronDown,
  Clock,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Phone,
  Mail,
  Receipt
} from 'lucide-react';
import './DualLayerDigitalTwinCanvas.scss';

const formatVND = (num) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0);
};

export default function DualLayerDigitalTwinCanvas({
  vaults,
  flows,
  constituents = {},
  filters = {},
  reconciliation,
  stepBreakdown,
  recentTransactions = [],
  onOpenVault,
  onOpenLineage,
  onWithdrawProfit,
  onFilterChange,
  onRefresh,
  loading = false,
}) {
  // Bộ lọc sự kiện nghiệp vụ bảng trắng: 'ALL' | 'DEPOSIT' | 'HOLD' | 'SETTLEMENT' | 'WITHDRAW'
  const [activeWorkflow, setActiveWorkflow] = useState('ALL');

  // Node đang được chọn để mổ xẻ cấu tạo: 'BN_APP' | 'ESCROW' | 'DOCTOR_APP' | 'PROFIT_APP' | 'VCB_MASTER' | 'BN_BANK' | 'DOCTOR_BANK' | 'CORP_EXPENSE'
  const [selectedConstituentNode, setSelectedConstituentNode] = useState('ESCROW');

  // State bộ lọc thời gian cục bộ
  const [timePreset, setTimePreset] = useState(filters?.timeRange || 'all');
  const [customFromDate, setCustomFromDate] = useState(filters?.fromDate || '');
  const [customToDate, setCustomToDate] = useState(filters?.toDate || '');
  const [sortOrder, setSortOrder] = useState(filters?.sort || 'newest');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    if (filters?.timeRange) setTimePreset(filters.timeRange);
    if (filters?.sort) setSortOrder(filters.sort);
    if (filters?.timeRange !== 'custom') {
      setCustomFromDate('');
      setCustomToDate('');
    } else {
      setCustomFromDate(filters?.fromDate || '');
      setCustomToDate(filters?.toDate || '');
    }
  }, [filters?.timeRange, filters?.fromDate, filters?.toDate, filters?.sort]);

  // Số liệu tài chính thực tế từ Database (KHÔNG hardcode fallback)
  const realBankTotal = Number(vaults?.realBank?.currentBalance ?? 0);
  const realBankReserveFund = Number(vaults?.realBank?.platformReserveFund ?? 0);
  const realBankSurplus = Number(vaults?.realBank?.reserveSurplus ?? reconciliation?.reserveSurplus ?? 0);
  const realBankAccountLabel = vaults?.realBank?.accountNumber
    ? `STK: ${vaults.realBank.accountNumber} • ${vaults.realBank.bankName || 'Vietcombank'}`
    : 'Tài khoản doanh nghiệp';

  const patientTotal = Number(vaults?.patientWallets?.total ?? 0);
  const patientAvailable = Number(vaults?.patientWallets?.available ?? 0);
  const patientReserved = Number(vaults?.patientWallets?.reserved ?? 0);
  const patientWalletCount = Number(vaults?.patientWallets?.count ?? constituents?.patientWalletsList?.length ?? 0);

  const escrowTotal = Number(vaults?.escrowPool?.total ?? 0);
  const escrowWalletHoldTotal = Number(vaults?.escrowPool?.walletHoldTotal ?? escrowTotal);
  const escrowWalletHoldCount = Number(vaults?.escrowPool?.walletHoldCount ?? 0);
  const escrowDirectVnpayTotal = Number(vaults?.escrowPool?.directVnpayTotal ?? 0);
  const escrowDirectVnpayCount = Number(vaults?.escrowPool?.directVnpayCount ?? 0);
  const escrowDoctor = Number(vaults?.escrowPool?.doctorShare ?? 0);
  const escrowPlatform = Number(vaults?.escrowPool?.platformShare ?? 0);
  const escrowDoctorPercent = Number(vaults?.escrowPool?.doctorSharePercent ?? 85);
  const escrowPlatformPercent = Number(vaults?.escrowPool?.platformSharePercent ?? 15);
  const escrowActiveCount = Number(vaults?.escrowPool?.activeCount ?? 0);

  const doctorTotal = Number(vaults?.doctorWallets?.total ?? 0);
  const doctorAvailable = Number(vaults?.doctorWallets?.available ?? 0);
  const doctorWalletCount = Number(vaults?.doctorWallets?.count ?? constituents?.doctorWalletsList?.length ?? 0);
  const doctorPendingSettlement = Number(vaults?.doctorWallets?.pendingSettlementTotal ?? flows?.doctorSettledPendingPayout ?? 0);

  const platformProfit = Number(vaults?.platformProfit?.spendable ?? 0);
  const platformWithdrawn = Number(vaults?.platformProfit?.withdrawnByAdmin ?? 0);
  const platformTotalEarned = Number(vaults?.platformProfit?.totalEarned ?? 0);
  const totalSystemLiabilities = Number(
    reconciliation?.totalSystemLiabilities ?? (patientAvailable + escrowTotal + doctorTotal + platformProfit)
  );
  const coveragePercent = Number(reconciliation?.coveragePercent ?? 100);

  // Số liệu lưu lượng dòng tiền (Flows) thực tế trong kỳ lọc (dùng ?? 0 để giữ nguyên giá trị 0)
  const flowDepositInflow = Number(flows?.depositInflow ?? 0);
  const flowDirectBookingInflow = Number(flows?.directBookingInflow ?? 0);
  const flowTotalVnpayInflow = Number(flows?.totalVnpayInflow ?? (flowDepositInflow + flowDirectBookingInflow));
  const flowHeldBooking = Number(flows?.heldBooking ?? 0);
  const flowHeldCount = Number(flows?.heldCount ?? 0);
  const flowHeldWalletBooking = Number(flows?.heldWalletBooking ?? 0);
  const flowHeldWalletCount = Number(flows?.heldWalletCount ?? 0);
  const flowHeldDirectVnpayBooking = Number(flows?.heldDirectVnpayBooking ?? 0);
  const flowHeldDirectVnpayCount = Number(flows?.heldDirectVnpayCount ?? 0);
  const flowDoctorSettled = Number(flows?.doctorSettled ?? 0);
  const flowPlatformCommission = Number(flows?.platformCommission ?? 0);
  const flowDoctorSharePercent = Number(flows?.doctorSharePercent ?? escrowDoctorPercent);
  const flowPlatformSharePercent = Number(flows?.platformSharePercent ?? escrowPlatformPercent);
  const flowBankTransferred = Number(flows?.bankTransferred ?? 0);
  const flowDoctorBankTransferred = Number(flows?.doctorBankTransferred ?? flowBankTransferred);
  const flowProfitWithdrawn = Number(flows?.profitWithdrawn ?? 0);
  const pendingWithdrawalsCount = Number(flows?.pendingWithdrawalsCount ?? 0);
  const pendingWithdrawalsAmount = Number(flows?.pendingWithdrawalsAmount ?? 0);

  // Danh sách các thành phần cấu tạo thực tế từ Backend
  const escrowBookings = constituents?.escrowBookings ?? [];
  const patientWalletsList = constituents?.patientWalletsList ?? [];
  const doctorWalletsList = constituents?.doctorWalletsList ?? [];
  const platformFeeItemsList = constituents?.platformFeeItemsList ?? [];
  const doctorPayoutsList = constituents?.doctorPayoutsList ?? [];
  const recentDeposits = constituents?.recentDeposits ?? [];
  const vnpayInflowsList = constituents?.vnpayInflowsList ?? recentDeposits;
  const recentSettlements = constituents?.recentSettlements ?? [];
  const companyWithdrawalsList = constituents?.companyWithdrawalsList ?? [];

  // Ca khám tiêu biểu nhất trong kỳ để truy vết nhanh
  const featuredBookingId = escrowBookings[0]?.bookingId || recentSettlements[0]?.bookingId || stepBreakdown?.step2?.bookingId || null;

  // Xử lý thay đổi preset thời gian
  const handleSelectTimePreset = (preset) => {
    setTimePreset(preset);
    setCurrentPage(1);
    if (preset !== 'custom') {
      setCustomFromDate('');
      setCustomToDate('');
      onFilterChange && onFilterChange({ timeRange: preset, fromDate: null, toDate: null, sort: sortOrder });
    }
  };

  // Áp dụng khoảng ngày tùy chọn
  const handleApplyCustomDates = () => {
    if (!customFromDate && !customToDate) return;
    setCurrentPage(1);
    onFilterChange && onFilterChange({
      timeRange: 'custom',
      fromDate: customFromDate || null,
      toDate: customToDate || null,
      sort: sortOrder,
    });
  };

  // Thay đổi sắp xếp
  const handleSortChange = (e) => {
    const newSort = e.target.value;
    setSortOrder(newSort);
    setCurrentPage(1);
    onFilterChange && onFilterChange({
      timeRange: timePreset,
      fromDate: timePreset === 'custom' ? (customFromDate || null) : null,
      toDate: timePreset === 'custom' ? (customToDate || null) : null,
      sort: newSort,
    });
  };

  // Chuyển đổi Node chọn -> reset về trang 1
  const handleSelectNode = (nodeId) => {
    setSelectedConstituentNode(nodeId);
    setCurrentPage(1);
    setSearchTerm('');
  };

  // Kiểm tra node có bị mờ do workflow filter không
  const isNodeDimmed = (nodeId) => {
    if (activeWorkflow === 'ALL') return false;
    if (activeWorkflow === 'DEPOSIT') {
      return !['BN_APP', 'BN_BANK', 'VCB_MASTER'].includes(nodeId);
    }
    if (activeWorkflow === 'HOLD') {
      return !['BN_APP', 'ESCROW', 'VCB_MASTER'].includes(nodeId);
    }
    if (activeWorkflow === 'SETTLEMENT') {
      return !['ESCROW', 'DOCTOR_APP', 'PROFIT_APP'].includes(nodeId);
    }
    if (activeWorkflow === 'WITHDRAW') {
      return !['DOCTOR_APP', 'DOCTOR_BANK', 'VCB_MASTER', 'PROFIT_APP', 'CORP_EXPENSE'].includes(nodeId);
    }
    return false;
  };

  // Lọc dữ liệu theo Search Term & Node hiện tại
  const currentList = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();

    if (selectedConstituentNode === 'BN_APP') {
      if (!term) return patientWalletsList;
      return patientWalletsList.filter(
        w => String(w.walletId).includes(term) ||
             w.ownerName?.toLowerCase().includes(term) ||
             w.phone?.includes(term) ||
             w.email?.toLowerCase().includes(term)
      );
    }

    if (selectedConstituentNode === 'DOCTOR_APP') {
      if (!term) return doctorWalletsList;
      return doctorWalletsList.filter(
        w => String(w.walletId).includes(term) ||
             w.doctorName?.toLowerCase().includes(term) ||
             w.phone?.includes(term) ||
             w.email?.toLowerCase().includes(term)
      );
    }

    if (selectedConstituentNode === 'ESCROW' || selectedConstituentNode === 'FLOW_HOLD') {
      if (!term) return escrowBookings;
      return escrowBookings.filter(
        b => String(b.bookingId).includes(term) ||
             b.patientName?.toLowerCase().includes(term) ||
             b.doctorName?.toLowerCase().includes(term) ||
             b.paymentSourceLabel?.toLowerCase().includes(term) ||
             b.paymentSource?.toLowerCase().includes(term)
      );
    }

    if (selectedConstituentNode === 'SETTLEMENT') {
      if (!term) return recentSettlements;
      return recentSettlements.filter(
        s => String(s.bookingId).includes(term) ||
             s.doctorName?.toLowerCase().includes(term) ||
             s.note?.toLowerCase().includes(term) ||
             s.status?.toLowerCase().includes(term)
      );
    }

    if (selectedConstituentNode === 'PROFIT_APP') {
      if (!term) return platformFeeItemsList;
      return platformFeeItemsList.filter(
        f => String(f.bookingId).includes(term) ||
             f.doctorName?.toLowerCase().includes(term) ||
             f.note?.toLowerCase().includes(term)
      );
    }

    if (selectedConstituentNode === 'BN_BANK') {
      if (!term) return vnpayInflowsList;
      return vnpayInflowsList.filter(
        d => String(d.id).includes(term) ||
             String(d.bookingId || '').includes(term) ||
             d.patientName?.toLowerCase().includes(term) ||
             d.txnRef?.toLowerCase().includes(term) ||
             d.inflowTypeLabel?.toLowerCase().includes(term)
      );
    }

    if (selectedConstituentNode === 'DOCTOR_BANK') {
      if (!term) return doctorPayoutsList;
      return doctorPayoutsList.filter(
        p => String(p.id).includes(term) ||
             p.accountHolderName?.toLowerCase().includes(term) ||
             p.bankName?.toLowerCase().includes(term) ||
             p.bankTransactionRef?.toLowerCase().includes(term)
      );
    }

    if (selectedConstituentNode === 'CORP_EXPENSE') {
      if (!term) return companyWithdrawalsList;
      return companyWithdrawalsList.filter(
        c => String(c.id).includes(term) ||
             c.recipient?.toLowerCase().includes(term) ||
             c.reason?.toLowerCase().includes(term)
      );
    }

    return [];
  }, [
    selectedConstituentNode,
    searchTerm,
    patientWalletsList,
    doctorWalletsList,
    escrowBookings,
    recentSettlements,
    platformFeeItemsList,
    vnpayInflowsList,
    doctorPayoutsList,
    companyWithdrawalsList,
  ]);

  // Phân trang danh sách
  const totalPages = Math.ceil(currentList.length / pageSize) || 1;
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return currentList.slice(start, start + pageSize);
  }, [currentList, currentPage]);

  return (
    <div className="dual-layer-twin-canvas">
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 1. THANH ĐIỀU HÀNH & BỘ LỌC THỜI GIAN CHUẨN RAMP FINTECH            */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="twin-header-bar">
        <div className="header-left">
          <div className="brand-twin-pill">
            <Layers size={14} className="text-cyan" />
            <span>DUAL-LAYER DIGITAL TWIN</span>
          </div>
          <div className="title-block">
            <h3 className="main-title">Mô Hình Dòng Tiền Hai Tầng (App Ledger ↔ Fiat / Bank)</h3>
            <p className="sub-title">
              100% Số liệu thực tế từ cơ sở dữ liệu: Đối chiếu dòng số dư ứng dụng và tài khoản ngân hàng bảo chứng
            </p>
          </div>
        </div>

        {/* Thanh công cụ Bộ lọc Thời gian & Sắp xếp */}
        <div className="time-filter-controls">
          <div className="filter-presets-group">
            <button
              type="button"
              className={`btn-time-pill ${timePreset === 'all' ? 'active' : ''}`}
              onClick={() => handleSelectTimePreset('all')}
            >
              Toàn thời gian
            </button>
            <button
              type="button"
              className={`btn-time-pill ${timePreset === 'today' ? 'active' : ''}`}
              onClick={() => handleSelectTimePreset('today')}
            >
              Hôm nay
            </button>
            <button
              type="button"
              className={`btn-time-pill ${timePreset === '7d' ? 'active' : ''}`}
              onClick={() => handleSelectTimePreset('7d')}
            >
              7 ngày qua
            </button>
            <button
              type="button"
              className={`btn-time-pill ${timePreset === 'mtd' ? 'active' : ''}`}
              onClick={() => handleSelectTimePreset('mtd')}
            >
              Tháng này
            </button>
          </div>

          <div className="date-range-picker-inline">
            <Calendar size={13} className="text-slate-400" />
            <input
              type="date"
              className="input-date-subtle"
              value={customFromDate}
              onChange={(e) => {
                setCustomFromDate(e.target.value);
                setTimePreset('custom');
              }}
              title="Từ ngày"
            />
            <span className="date-sep">➔</span>
            <input
              type="date"
              className="input-date-subtle"
              value={customToDate}
              onChange={(e) => {
                setCustomToDate(e.target.value);
                setTimePreset('custom');
              }}
              title="Đến ngày"
            />
            {timePreset === 'custom' && (
              <button type="button" className="btn-apply-dates" onClick={handleApplyCustomDates}>
                Lọc
              </button>
            )}
          </div>

          <div className="sort-dropdown-wrapper">
            <ArrowUpDown size={12} className="text-slate-400" />
            <select className="select-sort-subtle" value={sortOrder} onChange={handleSortChange}>
              <option value="newest">Mới nhất</option>
              <option value="oldest">Cũ nhất</option>
              <option value="highest">Giá trị cao nhất</option>
              <option value="lowest">Giá trị thấp nhất</option>
            </select>
          </div>

          <button
            type="button"
            className="btn-refresh-metrics"
            onClick={onRefresh}
            title="Làm mới dữ liệu từ Database"
            disabled={loading}
          >
            <RotateCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 1.1 THANH ĐIỀU HƯỚNG LUỒNG NGHIỆP VỤ BẢNG TRẮNG                     */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="workflow-sub-bar">
        <span className="workflow-label">
          <Filter size={12} />
          <span>Luồng nghiệp vụ bảng trắng:</span>
        </span>
        <div className="workflow-pills">
          <button
            type="button"
            className={`btn-wf-pill ${activeWorkflow === 'ALL' ? 'active' : ''}`}
            onClick={() => setActiveWorkflow('ALL')}
          >
            ● Toàn cảnh lưu chuyển
          </button>
          <button
            type="button"
            className={`btn-wf-pill ${activeWorkflow === 'DEPOSIT' ? 'active' : ''}`}
            onClick={() => setActiveWorkflow('DEPOSIT')}
            title={`Nạp ví VNPay: +${formatVND(flowDepositInflow)} | Đặt khám VNPay trực tiếp: +${formatVND(flowDirectBookingInflow)}`}
          >
            1. Tiền vào VNPay (+{formatVND(flowTotalVnpayInflow)})
          </button>
          <button
            type="button"
            className={`btn-wf-pill ${activeWorkflow === 'HOLD' ? 'active' : ''}`}
            onClick={() => setActiveWorkflow('HOLD')}
            title={`Từ Ví BN: ${formatVND(flowHeldWalletBooking)} (${flowHeldWalletCount} ca) | VNPay trả trước chờ khám: ${formatVND(flowHeldDirectVnpayBooking)} (${flowHeldDirectVnpayCount} ca)`}
          >
            2. Đặt khám chờ khám ({flowHeldCount} ca • {formatVND(flowHeldBooking)})
          </button>
          <button
            type="button"
            className={`btn-wf-pill ${activeWorkflow === 'SETTLEMENT' ? 'active' : ''}`}
            onClick={() => setActiveWorkflow('SETTLEMENT')}
            title={`Thù lao BS: +${formatVND(flowDoctorSettled)} (${flowDoctorSharePercent}%) | Phí sàn: +${formatVND(flowPlatformCommission)} (${flowPlatformSharePercent}%)`}
          >
            3. Khám xong (BS {flowDoctorSharePercent}% / Sàn {flowPlatformSharePercent}%)
          </button>
          <button
            type="button"
            className={`btn-wf-pill ${activeWorkflow === 'WITHDRAW' ? 'active' : ''}`}
            onClick={() => setActiveWorkflow('WITHDRAW')}
          >
            4. Rút tiền ({formatVND(flowBankTransferred)}) & Chi tiêu ({formatVND(flowProfitWithdrawn)})
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 2. KHÔNG GIAN DÒNG TIỀN HAI TẦNG (DUAL-LAYER CANVAS)                 */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="twin-canvas-viewport">

        {/* ─── TẦNG 1: SỔ CÁI ỨNG DỤNG (APP LEDGER / SỐ DƯ ẢO NỘI BỘ) ─── */}
        <div className="layer-block layer-app">
          <div className="layer-label-tag">
            <div className="label-left">
              <span className="layer-index">TẦNG 1</span>
              <span className="layer-name">SỔ CÁI NỘI BỘ (APP LEDGER)</span>
            </div>
            <span className="layer-nature virtual">SỐ DƯ ẢO NỘI BỘ</span>
          </div>

          <div className="layer-nodes-row">
            {/* NODE 1: VÍ BỆNH NHÂN */}
            <div
              className={`twin-node node-patient ${selectedConstituentNode === 'BN_APP' ? 'is-selected' : ''} ${isNodeDimmed('BN_APP') ? 'is-dimmed' : ''}`}
              onClick={() => handleSelectNode('BN_APP')}
              title={`Nhấp để hiển thị danh sách ${patientWalletCount} ví bệnh nhân cấu thành ${formatVND(patientTotal)}`}
            >
              <div className="node-head">
                <div className="node-icon bg-purple">
                  <User size={16} />
                </div>
                <div className="node-meta">
                  <span className="node-tag">TÀI KHOẢN VÍ BN ({patientWalletCount} ví)</span>
                  <h4 className="node-title">Ví Bệnh Nhân (BN App)</h4>
                </div>
              </div>

              <div className="node-body">
                <div className="node-primary-val text-purple">
                  {formatVND(patientAvailable)}
                </div>
                <div className="node-sub-stat">
                  <span>Khả dụng rảnh • Tổng ví: <strong>{formatVND(patientTotal)}</strong></span>
                </div>
                <div className="node-breakdown-mini">
                  <span>Đã khóa sang Escrow: <strong className="text-amber">{formatVND(patientReserved)}</strong></span>
                </div>
              </div>

              <div className="node-action-bar">
                <button
                  type="button"
                  className="btn-node-subtle"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectNode('BN_APP');
                  }}
                >
                  <span>Mổ xẻ {patientWalletCount} Ví BN</span>
                  <ChevronDown size={11} />
                </button>
                <button
                  type="button"
                  className="btn-node-ghost-link"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenVault && onOpenVault('patientWallets');
                  }}
                  title="Mở sổ cái chi tiết ví Bệnh nhân"
                >
                  <ExternalLink size={11} />
                </button>
              </div>
            </div>

            {/* MŨI TÊN DÒNG CHẢY 1: ĐẶT KHÁM GIỮ CỌC (FLOW_HOLD) */}
            <div
              className={`flow-connector conn-hold ${selectedConstituentNode === 'ESCROW' ? 'is-selected' : ''} ${isNodeDimmed('ESCROW') ? 'is-dimmed' : ''}`}
              onClick={() => handleSelectNode('ESCROW')}
              title={`Trong kỳ: Từ Ví BN -${formatVND(flowHeldWalletBooking)} (${flowHeldWalletCount} ca) | VNPay trả trước ${formatVND(flowHeldDirectVnpayBooking)} (${flowHeldDirectVnpayCount} ca)`}
            >
              <div className="flow-path-line animate-dash-purple" />
              <div className="flow-label-badge purple-badge">
                <span className="badge-subtitle">Ký quỹ ({flowHeldCount} ca)</span>
                <strong className="badge-value">{formatVND(flowHeldBooking)}</strong>
              </div>
            </div>

            {/* NODE 2: ESCROW POOL (2 NGĂN TÁCH BIỆT THEO POLICY SNAPSHOT) */}
            <div
              className={`twin-node node-escrow ${selectedConstituentNode === 'ESCROW' ? 'is-selected' : ''} ${isNodeDimmed('ESCROW') ? 'is-dimmed' : ''}`}
              onClick={() => handleSelectNode('ESCROW')}
              title="Nhấp để mổ xẻ danh sách ca khám đang tạm giữ trong Escrow (gồm cả Ví BN HELD và VNPay trả trước chưa khám)"
            >
              <div className="node-head">
                <div className="node-icon bg-amber">
                  <Lock size={16} />
                </div>
                <div className="node-meta">
                  <span className="node-tag">KHOANG KÝ QUỸ TẠM GIỮ</span>
                  <h4 className="node-title">Escrow Pool (Hai Ngăn)</h4>
                </div>
                <span className="count-pill amber-pill">{escrowActiveCount} ca</span>
              </div>

              <div className="node-body">
                <div className="node-primary-val text-amber">
                  {formatVND(escrowTotal)}
                </div>
                <div className="node-sub-stat">
                  <span>Ví BN: <strong>{formatVND(escrowWalletHoldTotal)}</strong> ({escrowWalletHoldCount}) • VNPay: <strong>{formatVND(escrowDirectVnpayTotal)}</strong> ({escrowDirectVnpayCount})</span>
                </div>

                {/* 2 Ngăn bóc tách theo Policy Snapshot thực tế trên Booking */}
                <div className="escrow-two-compartments">
                  <div className="comp-item comp-doc">
                    <span className="comp-name">Ngăn BS ({escrowDoctorPercent}%)</span>
                    <strong className="comp-num text-emerald">{formatVND(escrowDoctor)}</strong>
                  </div>
                  <div className="comp-sep" />
                  <div className="comp-item comp-platform">
                    <span className="comp-name">Ngăn Sàn ({escrowPlatformPercent}%)</span>
                    <strong className="comp-num text-gold">{formatVND(escrowPlatform)}</strong>
                  </div>
                </div>
              </div>

              <div className="node-action-bar">
                <button
                  type="button"
                  className="btn-node-subtle"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectNode('ESCROW');
                  }}
                >
                  <span>Chi tiết cọc ({flowHeldCount} ca)</span>
                  <ChevronDown size={11} />
                </button>
                <button
                  type="button"
                  className="btn-node-ghost-link"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenVault && onOpenVault('escrowPool');
                  }}
                  title="Mở sổ cái Escrow Pool"
                >
                  <ExternalLink size={11} />
                </button>
              </div>
            </div>

            {/* MŨI TÊN DÒNG CHẢY 2: PHÂN TÁCH KHI KHÁM XONG (FLOW_SPLIT) */}
            <div
              className={`flow-connector conn-split ${selectedConstituentNode === 'SETTLEMENT' ? 'is-selected' : ''} ${isNodeDimmed('DOCTOR_APP') ? 'is-dimmed' : ''}`}
              onClick={() => handleSelectNode('SETTLEMENT')}
              title="Nhấp để xem chi tiết từng ca khám đã quyết toán phân bổ thù lao & hoa hồng"
            >
              <div className="split-upper-line">
                <div className="flow-path-line animate-dash-gold" />
                <span className="split-badge gold-badge">
                  Phí sàn {flowPlatformSharePercent}% (+{formatVND(flowPlatformCommission)})
                </span>
              </div>
              <div className="split-lower-line">
                <div className="flow-path-line animate-dash-emerald" />
                <span className="split-badge emerald-badge">
                  Thù lao {flowDoctorSharePercent}% (+{formatVND(flowDoctorSettled)})
                </span>
              </div>
            </div>

            {/* CỘT ĐÍCH TẦNG 1: VÍ BS & PHÍ NỀN TẢNG */}
            <div className="destination-stack-col">
              {/* PHÍ NỀN TẢNG */}
              <div
                className={`twin-node node-profit ${selectedConstituentNode === 'PROFIT_APP' ? 'is-selected' : ''} ${isNodeDimmed('PROFIT_APP') ? 'is-dimmed' : ''}`}
                onClick={() => handleSelectNode('PROFIT_APP')}
                title="Nhấp để xem từng khoản phí sàn thu được từ các ca khám"
              >
                <div className="node-head">
                  <div className="node-icon bg-gold">
                    <DollarSign size={15} />
                  </div>
                  <div className="node-meta">
                    <span className="node-tag">DOANH THU HOA HỒNG</span>
                    <h4 className="node-title">Phí Nền Tảng Sàn</h4>
                  </div>
                </div>
                <div className="node-body">
                  <div className="node-primary-val text-gold">
                    {formatVND(platformProfit)}
                  </div>
                  <div className="node-sub-stat">
                    <span>Lũy kế thu: <strong>{formatVND(platformTotalEarned)}</strong> • Đã rút: <strong>{formatVND(platformWithdrawn)}</strong></span>
                  </div>
                </div>

                <div className="node-action-bar">
                  <button
                    type="button"
                    className="btn-node-primary-ramp"
                    onClick={(e) => {
                      e.stopPropagation();
                      onWithdrawProfit && onWithdrawProfit();
                    }}
                    title="Mở form rút lợi nhuận nền tảng về tài khoản công ty"
                  >
                    <DollarSign size={11} />
                    <span>Rút tiền lời</span>
                  </button>
                  <button
                    type="button"
                    className="btn-node-subtle"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectNode('PROFIT_APP');
                    }}
                  >
                    <span>Hoa hồng</span>
                    <ChevronDown size={11} />
                  </button>
                </div>
              </div>

              {/* VÍ BÁC SĨ */}
              <div
                className={`twin-node node-doctor ${selectedConstituentNode === 'DOCTOR_APP' ? 'is-selected' : ''} ${isNodeDimmed('DOCTOR_APP') ? 'is-dimmed' : ''}`}
                onClick={() => handleSelectNode('DOCTOR_APP')}
                title={`Nhấp để hiển thị danh sách ${doctorWalletCount} ví bác sĩ cấu thành ${formatVND(doctorTotal)}`}
              >
                <div className="node-head">
                  <div className="node-icon bg-emerald">
                    <Coins size={15} />
                  </div>
                  <div className="node-meta">
                    <span className="node-tag">THÙ LAO BÁC SĨ ({doctorWalletCount} ví)</span>
                    <h4 className="node-title">Ví Bác Sĩ (BS App)</h4>
                  </div>
                </div>
                <div className="node-body">
                  <div className="node-primary-val text-emerald">
                    {formatVND(doctorTotal)}
                  </div>
                  <div className="node-sub-stat">
                    <span>Khả dụng rút: <strong>{formatVND(doctorAvailable)}</strong></span>
                  </div>
                  {doctorPendingSettlement > 0 && (
                    <div className="node-breakdown-mini">
                      <span>Chờ quyết toán vào ví: <strong className="text-amber">{formatVND(doctorPendingSettlement)}</strong></span>
                    </div>
                  )}
                </div>

                <div className="node-action-bar">
                  <button
                    type="button"
                    className="btn-node-subtle"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectNode('DOCTOR_APP');
                    }}
                  >
                    <span>Mổ xẻ {doctorWalletCount} Ví BS</span>
                    <ChevronDown size={11} />
                  </button>
                  <button
                    type="button"
                    className="btn-node-ghost-link"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenVault && onOpenVault('doctorWallets');
                    }}
                    title="Mở sổ cái chi tiết ví Bác sĩ"
                  >
                    <ExternalLink size={11} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── LỚP GIỮA: CẦU NỐI ĐỐI CHIẾU DỌC (RECONCILIATION BRIDGES) ─── */}
        <div className="reconciliation-bridge-zone">
          <div className="bridge-zone-header">
            <span className="bridge-zone-title">
              ▼ CẦU NỐI ĐỐI CHIẾU THỜI GIAN THỰC (RECONCILIATION BRIDGES — DÒNG DÓNG LIÊN KẾT 2 TẦNG)
            </span>
            <div className="bridge-legend-inline">
              <span className="dot dot-green" /> Đã đối chiếu 1:1
              <span className="dot dot-blue" /> Bảo chứng ngân hàng thật
            </div>
          </div>

          <div className="bridges-grid">
            {/* CẦU NỐI 1 (CỘT 1): BN NẠP / THANH TOÁN VNPAY */}
            <div className={`vertical-bridge bridge-deposit ${isNodeDimmed('BN_APP') ? 'is-dimmed' : ''}`}>
              <div className="bridge-line-track">
                <div className="bridge-flow-particle animate-flow-down" />
              </div>
              <div className="bridge-pill-tag tag-blue" onClick={() => handleSelectNode('BN_BANK')}>
                <CheckCircle2 size={11} />
                <span>Khớp Cổng VNPay (+{formatVND(flowTotalVnpayInflow)})</span>
              </div>
            </div>

            {/* CẦU NỐI 2 (CỘT 3): BẢO CHỨNG ESCROW TRONG VCB */}
            <div className={`vertical-bridge bridge-escrow ${isNodeDimmed('ESCROW') ? 'is-dimmed' : ''}`}>
              <div className="bridge-line-track">
                <div className="bridge-flow-particle animate-pulse-bidirectional" />
              </div>
              <div className="bridge-pill-tag tag-amber" onClick={() => handleSelectNode('ESCROW')}>
                <Lock size={11} />
                <span>Bảo chứng Escrow: {formatVND(escrowTotal)}</span>
              </div>
            </div>

            {/* CẦU NỐI 3 (CỘT 5): BÁC SĨ RÚT TIỀN VỀ VCB CÁ NHÂN */}
            <div className={`vertical-bridge bridge-payout ${isNodeDimmed('DOCTOR_APP') ? 'is-dimmed' : ''}`}>
              <div className="bridge-line-track">
                <div className="bridge-flow-particle animate-flow-down" />
              </div>
              <div className="bridge-pill-tag tag-emerald" onClick={() => handleSelectNode('DOCTOR_BANK')}>
                <ArrowUpRight size={11} />
                <span>Ủy Nhiệm Chi VCB (-{formatVND(flowBankTransferred)})</span>
              </div>
            </div>
          </div>
        </div>

        {/* ─── TẦNG 2: NGÂN HÀNG THỰC TẾ (FIAT / BANK / TIỀN MẶT THẬT) ─── */}
        <div className="layer-block layer-bank">
          <div className="layer-label-tag">
            <div className="label-left">
              <span className="layer-index">TẦNG 2</span>
              <span className="layer-name">NGÂN HÀNG THỰC TẾ (FIAT / BANK)</span>
            </div>
            <span className="layer-nature real">TIỀN MẶT THẬT ({coveragePercent}% BẢO CHỨNG)</span>
          </div>

          <div className="layer-nodes-row">
            {/* NODE 1: TÀI KHOẢN CÁ NHÂN BỆNH NHÂN */}
            <div
              className={`twin-node node-bn-bank ${selectedConstituentNode === 'BN_BANK' ? 'is-selected' : ''} ${isNodeDimmed('BN_BANK') ? 'is-dimmed' : ''}`}
              onClick={() => handleSelectNode('BN_BANK')}
              title="Nhấp để xem danh sách giao dịch nạp tiền VNPay của bệnh nhân"
            >
              <div className="node-head">
                <div className="node-icon bg-slate">
                  <CreditCard size={16} />
                </div>
                <div className="node-meta">
                  <span className="node-tag">TÀI KHOẢN CÁ NHÂN BN</span>
                  <h4 className="node-title">Ngân Hàng Người Bệnh</h4>
                </div>
              </div>

              <div className="node-body">
                <div className="node-primary-val text-slate">
                  -{formatVND(flowTotalVnpayInflow)}
                </div>
                <div className="node-sub-stat">
                  <span>Nạp ví: <strong>{formatVND(flowDepositInflow)}</strong> • Đặt khám VNPay: <strong>{formatVND(flowDirectBookingInflow)}</strong></span>
                </div>
              </div>

              <div className="node-action-bar">
                <button
                  type="button"
                  className="btn-node-subtle"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectNode('BN_BANK');
                  }}
                >
                  <span>Xem nạp VNPay</span>
                  <ChevronDown size={11} />
                </button>
              </div>
            </div>

            {/* MŨI TÊN TIỀN THẬT 1: NẠP VÀO VCB CTY */}
            <div className={`flow-connector conn-bank-inflow ${isNodeDimmed('BN_BANK') ? 'is-dimmed' : ''}`}>
              <div className="flow-path-line animate-dash-blue" />
              <div className="flow-label-badge blue-badge">
                <span className="badge-subtitle">Cổng VNPay vào VCB</span>
                <strong className="badge-value">+{formatVND(flowTotalVnpayInflow)}</strong>
              </div>
            </div>

            {/* NODE 2: TÀI KHOẢN VCB CÔNG TY (TRUNG TÂM BẢO CHỨNG) */}
            <div
              className={`twin-node node-vcb-master ${selectedConstituentNode === 'VCB_MASTER' ? 'is-selected' : ''} ${isNodeDimmed('VCB_MASTER') ? 'is-dimmed' : ''}`}
              onClick={() => handleSelectNode('VCB_MASTER')}
              title="Nhấp để xem chi tiết cơ cấu bảo chứng tài khoản Vietcombank Công ty"
            >
              <div className="node-head">
                <div className="node-icon bg-vcb">
                  <Landmark size={18} />
                </div>
                <div className="node-meta">
                  <span className="node-tag badge-vcb">NEO BẢO CHỨNG (VCB CTY)</span>
                  <h4 className="node-title">Tài Khoản VCB Công Ty</h4>
                </div>
              </div>

              <div className="node-body">
                <div className="node-primary-val text-vcb">
                  {formatVND(realBankTotal)}
                </div>
                <div className="node-sub-stat">
                  <span>{realBankAccountLabel}</span>
                </div>

                <div className="vcb-holding-note">
                  <span>Bảo chứng Sổ cái ({formatVND(totalSystemLiabilities)}) + Dự trữ ({formatVND(realBankSurplus)}):</span>
                  <div className="vcb-breakdown-tags">
                    <span className="tag-remain">Ví BN rảnh: {formatVND(patientAvailable)}</span>
                    <span className="tag-escrow">Escrow: {formatVND(escrowTotal)}</span>
                    <span className="tag-remain">Ví BS: {formatVND(doctorTotal)}</span>
                    <span className="tag-escrow">Sàn: {formatVND(platformProfit)}</span>
                  </div>
                </div>
              </div>

              <div className="node-action-bar">
                <button
                  type="button"
                  className="btn-node-secondary-ramp"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenVault && onOpenVault('realBank');
                  }}
                  title="Mở sao kê biến động tài khoản ngân hàng thật Vietcombank"
                >
                  <Landmark size={12} />
                  <span>Sao kê VCB</span>
                </button>
                <button
                  type="button"
                  className="btn-node-subtle"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectNode('VCB_MASTER');
                  }}
                >
                  <span>Bảo chứng</span>
                  <ChevronDown size={11} />
                </button>
              </div>
            </div>

            {/* MŨI TÊN TIỀN THẬT 2: CHI TRẢ UNC SANG BS & CHI PHÍ SÀN */}
            <div className={`flow-connector conn-bank-outflow ${isNodeDimmed('DOCTOR_BANK') ? 'is-dimmed' : ''}`}>
              <div className="split-upper-line">
                <div className="flow-path-line animate-dash-rose" />
                <span className="split-badge rose-badge" onClick={() => handleSelectNode('CORP_EXPENSE')}>
                  Rút lợi nhuận: -{formatVND(flowProfitWithdrawn)}
                </span>
              </div>
              <div className="split-lower-line">
                <div className="flow-path-line animate-dash-blue" />
                <span className="split-badge blue-badge" onClick={() => handleSelectNode('DOCTOR_BANK')}>
                  UNC Bác sĩ: -{formatVND(flowDoctorBankTransferred)}
                </span>
              </div>
            </div>

            {/* CỘT ĐÍCH TẦNG 2: TK BÁC SĨ & CHI PHÍ CÔNG TY */}
            <div className="destination-stack-col">
              {/* CHI PHÍ CÔNG TY / XÀI */}
              <div
                className={`twin-node node-expense ${selectedConstituentNode === 'CORP_EXPENSE' ? 'is-selected' : ''} ${isNodeDimmed('CORP_EXPENSE') ? 'is-dimmed' : ''}`}
                onClick={() => handleSelectNode('CORP_EXPENSE')}
                title="Nhấp để xem lịch sử rút lợi nhuận công ty"
              >
                <div className="node-head">
                  <div className="node-icon bg-rose">
                    <ArrowUpRight size={15} />
                  </div>
                  <div className="node-meta">
                    <span className="node-tag">RÚT LỢI NHUẬN / CHI TIÊU</span>
                    <h4 className="node-title">Chi Phí Công Ty</h4>
                  </div>
                </div>
                <div className="node-body">
                  <div className="node-primary-val text-rose">
                    -{formatVND(flowProfitWithdrawn)}
                  </div>
                  <div className="node-sub-stat">
                    <span>Trong kỳ • Lũy kế đã rút: <strong>{formatVND(platformWithdrawn)}</strong></span>
                  </div>
                </div>

                <div className="node-action-bar">
                  <button
                    type="button"
                    className="btn-node-subtle"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectNode('CORP_EXPENSE');
                    }}
                  >
                    <span>Lịch sử rút ({companyWithdrawalsList.length})</span>
                    <ChevronDown size={11} />
                  </button>
                </div>
              </div>

              {/* TÀI KHOẢN VCB BÁC SĨ */}
              <div
                className={`twin-node node-doctor-bank ${selectedConstituentNode === 'DOCTOR_BANK' ? 'is-selected' : ''} ${isNodeDimmed('DOCTOR_BANK') ? 'is-dimmed' : ''}`}
                onClick={() => handleSelectNode('DOCTOR_BANK')}
                title="Nhấp để xem danh sách các lệnh Ủy Nhiệm Chi (UNC VCB) đã giải ngân cho bác sĩ"
              >
                <div className="node-head">
                  <div className="node-icon bg-blue">
                    <Building size={15} />
                  </div>
                  <div className="node-meta">
                    <span className="node-tag">NGÂN HÀNG BÁC SĨ (UNC)</span>
                    <h4 className="node-title">TK VCB Bác Sĩ</h4>
                  </div>
                </div>
                <div className="node-body">
                  <div className="node-primary-val text-blue">
                    +{formatVND(flowDoctorBankTransferred)}
                  </div>
                  <div className="node-sub-stat">
                    <span>Đã giải ngân trong kỳ ({doctorPayoutsList.length} lệnh)</span>
                  </div>
                  {pendingWithdrawalsCount > 0 && (
                    <div className="node-breakdown-mini">
                      <span>Chờ duyệt chi: <strong className="text-amber">{pendingWithdrawalsCount} lệnh ({formatVND(pendingWithdrawalsAmount)})</strong></span>
                    </div>
                  )}
                </div>

                <div className="node-action-bar">
                  <button
                    type="button"
                    className="btn-node-subtle"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectNode('DOCTOR_BANK');
                    }}
                  >
                    <span>Lệnh UNC ({doctorPayoutsList.length})</span>
                    <ChevronDown size={11} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 3. BẢNG MỔ XẺ THÀNH PHẦN CẤU TẠO TẠI CHỖ & TRUY VẾT VÒNG ĐỜI        */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="twin-constituent-inspector">
        <div className="inspector-header">
          <div className="inspector-title-group">
            <div className="inspector-badge">
              <Sparkles size={13} className="text-cyan" />
              <span>MINH CHỨNG THÀNH PHẦN CẤU TẠO THỰC TẾ (SUB-LEDGER BREAKDOWN)</span>
            </div>
            <h4 className="inspector-title">
              {selectedConstituentNode === 'BN_APP' && (
                <>Danh Sách Ví Bệnh Nhân Cấu Thành Số Dư — {formatVND(patientTotal)} ({patientWalletCount} ví người bệnh)</>
              )}
              {selectedConstituentNode === 'DOCTOR_APP' && (
                <>Danh Sách Ví Bác Sĩ Cấu Thành Thù Lao — {formatVND(doctorTotal)} ({doctorWalletCount} ví bác sĩ)</>
              )}
              {selectedConstituentNode === 'ESCROW' && (
                <>Khoang Ký Quỹ Escrow — Đang giữ {formatVND(escrowTotal)} ({escrowBookings.length} ca trong kỳ: {flowHeldWalletCount} Ví + {flowHeldDirectVnpayCount} VNPay)</>
              )}
              {selectedConstituentNode === 'SETTLEMENT' && (
                <>Quyết Toán Ca Khám Đã Chia Tỷ Lệ — {recentSettlements.length} ca trong kỳ: Thù lao BS +{formatVND(flowDoctorSettled)} ({flowDoctorSharePercent}%) • Phí sàn +{formatVND(flowPlatformCommission)} ({flowPlatformSharePercent}%)</>
              )}
              {selectedConstituentNode === 'PROFIT_APP' && (
                <>Chi Tiết Doanh Thu Phí Sàn Thu Được — Khả dụng {formatVND(platformProfit)} ({platformFeeItemsList.length} ca đóng góp trong kỳ lọc)</>
              )}
              {selectedConstituentNode === 'VCB_MASTER' && (
                <>Tài Khoản VCB Công Ty — Tiền mặt thực tế {formatVND(realBankTotal)} (Bảo chứng {coveragePercent}%)</>
              )}
              {selectedConstituentNode === 'BN_BANK' && (
                <>Cổng Thanh Toán VNPay — Tổng vào {formatVND(flowTotalVnpayInflow)} (Nạp ví {formatVND(flowDepositInflow)} + Đặt khám {formatVND(flowDirectBookingInflow)} • hiển thị {vnpayInflowsList.length} GD)</>
              )}
              {selectedConstituentNode === 'DOCTOR_BANK' && (
                <>Ủy Nhiệm Chi Vietcombank (UNC) — Đã giải ngân cho bác sĩ trong kỳ: {formatVND(flowDoctorBankTransferred)} ({doctorPayoutsList.length} lệnh)</>
              )}
              {selectedConstituentNode === 'CORP_EXPENSE' && (
                <>Lịch Sử Rút Doanh Thu Hoa Hồng Sàn Chi Tiêu Công Ty — Trong kỳ: -{formatVND(flowProfitWithdrawn)} ({companyWithdrawalsList.length} lệnh)</>
              )}
            </h4>
          </div>

          <div className="inspector-actions">
            <div className="search-box-subtle">
              <Search size={13} className="text-slate-400" />
              <input
                type="text"
                placeholder={
                  selectedConstituentNode === 'BN_APP' ? 'Tìm tên BN, SĐT, Email, Ví #...' :
                  selectedConstituentNode === 'DOCTOR_APP' ? 'Tìm tên BS, SĐT, Email, Ví #...' :
                  selectedConstituentNode === 'ESCROW' ? 'Tìm mã ca #BK-xxx, BN, BS...' :
                  selectedConstituentNode === 'SETTLEMENT' ? 'Tìm mã ca, Bác sĩ, trạng thái...' :
                  selectedConstituentNode === 'PROFIT_APP' ? 'Tìm mã ca, BS, ghi chú...' :
                  selectedConstituentNode === 'BN_BANK' ? 'Tìm mã GD, tên BN, nguồn VNPay...' :
                  'Tìm kiếm theo từ khóa...'
                }
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
              {searchTerm && (
                <button type="button" className="btn-clear-search" onClick={() => setSearchTerm('')}>
                  <X size={12} />
                </button>
              )}
            </div>

            {featuredBookingId && (
              <button
                type="button"
                className="btn-quick-trace-featured"
                onClick={() => onOpenLineage && onOpenLineage(featuredBookingId)}
                title="1-Click mở ngay Drawer Vòng Đời Dòng Tiền 4 Bước"
              >
                <GitCommit size={13} />
                <span>1-Click Vòng Đời Ca #{featuredBookingId}</span>
              </button>
            )}
          </div>
        </div>

        {/* Nội dung chi tiết theo Node được chọn */}
        <div className="inspector-body">

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* MỤC 1: VÍ BỆNH NHÂN (BN_APP) — DANH SÁCH 121 VÍ BỆNH NHÂN THỰC TẾ */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {selectedConstituentNode === 'BN_APP' && (
            <div className="table-responsive-wrapper">
              {loading ? (
                <div className="empty-constituent-state">
                  <RotateCw size={24} className="animate-spin text-cyan" />
                  <p>Đang tải dữ liệu minh chứng sổ cái từ máy chủ...</p>
                </div>
              ) : paginatedList.length > 0 ? (
                <table className="constituent-table">
                  <thead>
                    <tr>
                      <th>MÃ VÍ</th>
                      <th>CHỦ TÀI KHOẢN (BỆNH NHÂN)</th>
                      <th>SỐ ĐIỆN THOẠI</th>
                      <th>EMAIL</th>
                      <th className="text-right">SỐ DƯ KHẢ DỤNG</th>
                      <th className="text-right">ĐANG KÝ QUỸ (ESCROW)</th>
                      <th className="text-right">TỔNG SỐ DƯ VÍ</th>
                      <th>CẬP NHẬT GẦN NHẤT</th>
                      <th className="text-right">MINH CHỨNG & TRUY VẾT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedList.map((w) => (
                      <tr key={w.walletId}>
                        <td>
                          <span className="code-pill">#WALLET-{w.walletId}</span>
                        </td>
                        <td>
                          <div className="cell-patient">
                            <User size={13} className="text-purple-500" />
                            <strong>{w.ownerName}</strong>
                          </div>
                        </td>
                        <td>
                          <span className="text-slate-600 font-mono text-xs">{w.phone}</span>
                        </td>
                        <td>
                          <span className="text-slate-500 text-xs">{w.email}</span>
                        </td>
                        <td className="text-right">
                          <span className="text-emerald font-semibold">{formatVND(w.availableBalance)}</span>
                        </td>
                        <td className="text-right">
                          {w.reservedBalance > 0 ? (
                            <strong className="text-amber">{formatVND(w.reservedBalance)} (Đang cọc)</strong>
                          ) : (
                            <span className="text-slate-400">0 ₫</span>
                          )}
                        </td>
                        <td className="text-right">
                          <strong className="text-purple">{formatVND(w.totalBalance)}</strong>
                        </td>
                        <td>
                          <span className="text-slate-400 text-xs">{moment(w.updatedAt).format('DD/MM/YYYY HH:mm')}</span>
                        </td>
                        <td className="text-right">
                          {w.reservedBalance > 0 && featuredBookingId ? (
                            <button
                              type="button"
                              className="btn-lineage-trigger"
                              onClick={() => onOpenLineage && onOpenLineage(featuredBookingId)}
                              title="Truy vết ca khám đang ký quỹ từ ví này"
                            >
                              <GitCommit size={13} />
                              <span>Vòng đời ca #{featuredBookingId} ➔</span>
                            </button>
                          ) : w.reservedBalance > 0 ? (
                            <button
                              type="button"
                              className="btn-lineage-trigger"
                              onClick={() => onOpenLineage && onOpenLineage(w.walletId)}
                              title="Truy vết giao dịch gần nhất của ví này"
                            >
                              <GitCommit size={13} />
                              <span>Truy vết ví #{w.walletId} ➔</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn-view-wallet-subtle"
                              onClick={() => onOpenVault && onOpenVault('patientWallets')}
                            >
                              <Eye size={12} />
                              <span>Sổ cái ví</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="empty-constituent-state">
                  <Info size={24} className="text-slate-400" />
                  <p>Không tìm thấy ví bệnh nhân nào phù hợp với từ khóa "{searchTerm}"</p>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* MỤC 2: VÍ BÁC SĨ (DOCTOR_APP) — DANH SÁCH 50 VÍ BÁC SĨ THỰC TẾ   */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {selectedConstituentNode === 'DOCTOR_APP' && (
            <div className="table-responsive-wrapper">
              {paginatedList.length > 0 ? (
                <table className="constituent-table">
                  <thead>
                    <tr>
                      <th>MÃ VÍ</th>
                      <th>BÁC SĨ THỤ HƯỞNG</th>
                      <th>SỐ ĐIỆN THOẠI</th>
                      <th>EMAIL LIÊN HỆ</th>
                      <th className="text-right">THÙ LAO KHẢ DỤNG</th>
                      <th className="text-right">TỔNG SỐ DƯ VÍ</th>
                      <th>TRẠNG THÁI QUYẾT TOÁN</th>
                      <th>CẬP NHẬT LÚC</th>
                      <th className="text-right">THAO TÁC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedList.map((w) => (
                      <tr key={w.walletId}>
                        <td>
                          <span className="code-pill">#WALLET-{w.walletId}</span>
                        </td>
                        <td>
                          <div className="cell-doctor">
                            <Building size={13} className="text-emerald-500" />
                            <strong>{w.doctorName}</strong>
                          </div>
                        </td>
                        <td>
                          <span className="text-slate-600 font-mono text-xs">{w.phone}</span>
                        </td>
                        <td>
                          <span className="text-slate-500 text-xs">{w.email}</span>
                        </td>
                        <td className="text-right">
                          <strong className="text-emerald">{formatVND(w.availableBalance)}</strong>
                        </td>
                        <td className="text-right">
                          <strong className="text-emerald">{formatVND(w.totalBalance)}</strong>
                        </td>
                        <td>
                          <span className="status-badge s2">Sẵn sàng chi trả</span>
                        </td>
                        <td>
                          <span className="text-slate-400 text-xs">{moment(w.updatedAt).format('DD/MM/YYYY HH:mm')}</span>
                        </td>
                        <td className="text-right">
                          <button
                            type="button"
                            className="btn-lineage-trigger"
                            onClick={() => onOpenVault && onOpenVault('doctorWallets')}
                            title="Xem lịch sử quyết toán của bác sĩ này"
                          >
                            <Eye size={12} />
                            <span>Sổ thù lao ➔</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="empty-constituent-state">
                  <Info size={24} className="text-slate-400" />
                  <p>Không tìm thấy ví bác sĩ nào phù hợp với từ khóa "{searchTerm}"</p>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* MỤC 3: ESCROW POOL — DANH SÁCH CA KHÁM THỰC TẾ ĐANG GIỮ CỌC     */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {(selectedConstituentNode === 'ESCROW' || selectedConstituentNode === 'FLOW_HOLD') && (
            <div className="table-responsive-wrapper">
              {paginatedList.length > 0 ? (
                <table className="constituent-table">
                  <thead>
                    <tr>
                      <th>MÃ CA KHÁM</th>
                      <th>BỆNH NHÂN ĐẶT</th>
                      <th>BÁC SĨ TIẾP NHẬN</th>
                      <th>GIÁ KHÁM</th>
                      <th>NGĂN BS</th>
                      <th>NGĂN SÀN</th>
                      <th>LỊCH HẸN / TẠO LÚC</th>
                      <th>NGUỒN / TRẠNG THÁI</th>
                      <th className="text-right">TRUY VẾT VÒNG ĐỜI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedList.map((item) => (
                      <tr key={item.holdId || item.bookingId}>
                        <td>
                          <span className="code-pill">#BK-{item.bookingId}</span>
                        </td>
                        <td>
                          <div className="cell-patient">
                            <User size={13} className="text-purple-500" />
                            <strong>{item.patientName}</strong>
                          </div>
                        </td>
                        <td>
                          <div className="cell-doctor">
                            <Building size={13} className="text-emerald-500" />
                            <span>{item.doctorName}</span>
                          </div>
                        </td>
                        <td>
                          <strong className="text-amber">{formatVND(item.bookingPrice)}</strong>
                        </td>
                        <td>
                          <span className="text-emerald font-semibold">
                            {formatVND(item.doctorShare)} ({item.doctorSharePercent ?? escrowDoctorPercent}%)
                          </span>
                        </td>
                        <td>
                          <span className="text-gold font-semibold">
                            {formatVND(item.platformShare)} ({item.platformSharePercent ?? escrowPlatformPercent}%)
                          </span>
                        </td>
                        <td>
                          <div className="cell-time">
                            <Clock size={12} className="text-slate-400" />
                            <span>{moment(item.createdAt).format('DD/MM/YYYY HH:mm')}</span>
                          </div>
                        </td>
                        <td>
                          <span className={`status-badge ${item.paymentSource === 'WALLET' ? 's2' : 'info'}`}>
                            {item.paymentSourceLabel || (item.paymentSource === 'WALLET' ? 'Ví nội bộ (HELD)' : 'VNPay trực tiếp')}
                          </span>
                        </td>
                        <td className="text-right">
                          <button
                            type="button"
                            className="btn-lineage-trigger"
                            onClick={() => onOpenLineage && onOpenLineage(item.bookingId)}
                            title="Truy vết toàn vẹn vòng đời dòng tiền ca này"
                          >
                            <GitCommit size={13} />
                            <span>Xem Vòng Đời GD ➔</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="empty-constituent-state">
                  <Info size={24} className="text-slate-400" />
                  <p>Không có ca khám ký quỹ nào phù hợp</p>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* MỤC 3B: QUYẾT TOÁN ĐÃ CHIA TỶ LỆ (SETTLEMENT)                  */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {selectedConstituentNode === 'SETTLEMENT' && (
            <div className="table-responsive-wrapper">
              {paginatedList.length > 0 ? (
                <table className="constituent-table">
                  <thead>
                    <tr>
                      <th>MÃ QUYẾT TOÁN</th>
                      <th>MÃ CA KHÁM</th>
                      <th>BÁC SĨ THỤ HƯỞNG</th>
                      <th>DOANH THU GỘP</th>
                      <th>THÙ LAO BÁC SĨ</th>
                      <th>PHÍ SÀN TRÍCH</th>
                      <th>TRẠNG THÁI</th>
                      <th>NGÀY QUYẾT TOÁN</th>
                      <th className="text-right">TRUY VẾT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedList.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <span className="code-pill">#SET-{item.id}</span>
                        </td>
                        <td>
                          <span className="code-pill">#BK-{item.bookingId}</span>
                        </td>
                        <td>
                          <div className="cell-doctor">
                            <Building size={13} className="text-emerald-500" />
                            <strong>{item.doctorName}</strong>
                          </div>
                        </td>
                        <td>
                          <strong>{formatVND(item.grossAmount)}</strong>
                        </td>
                        <td>
                          <strong className="text-emerald">
                            +{formatVND(item.netAmount)} ({Math.max(0, 100 - Number(item.platformFeeRate || 15))}%)
                          </strong>
                        </td>
                        <td>
                          <span className="text-gold font-semibold">
                            +{formatVND(item.platformFee)} ({item.platformFeeRate ?? 15}%)
                          </span>
                        </td>
                        <td>
                          <span className={`status-badge ${item.status === 'PAID' ? 'success' : 's2'}`}>
                            {item.status === 'PAID' ? 'Đã vào Ví BS' : item.status === 'AVAILABLE' ? 'Chờ kết chuyển ví' : item.status}
                          </span>
                        </td>
                        <td>
                          <span className="text-slate-400 text-xs">{moment(item.earnedAt).format('DD/MM/YYYY HH:mm')}</span>
                        </td>
                        <td className="text-right">
                          <button
                            type="button"
                            className="btn-lineage-trigger"
                            onClick={() => onOpenLineage && onOpenLineage(item.bookingId)}
                            title="Truy vết vòng đời ca khám quyết toán này"
                          >
                            <GitCommit size={13} />
                            <span>Vòng đời ca #{item.bookingId} ➔</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="empty-constituent-state">
                  <Info size={24} className="text-slate-400" />
                  <p>Không có khoản quyết toán nào trong kỳ lọc</p>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* MỤC 4: PHÍ NỀN TẢNG SÀN (PROFIT_APP) — CÁC KHOẢN HOA HỒNG THU VỀ */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {selectedConstituentNode === 'PROFIT_APP' && (
            <div className="table-responsive-wrapper">
              {paginatedList.length > 0 ? (
                <table className="constituent-table">
                  <thead>
                    <tr>
                      <th>MÃ BÚT TOÁN</th>
                      <th>MÃ CA KHÁM</th>
                      <th>BÁC SĨ KHÁM</th>
                      <th>DOANH THU GỘP</th>
                      <th>TỶ LỆ PHÍ</th>
                      <th>PHÍ SÀN THU ĐƯỢC</th>
                      <th>THỜI ĐIỂM THU</th>
                      <th>GHI CHÚ DOANH THU</th>
                      <th className="text-right">TRUY VẾT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedList.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <span className="code-pill">#FEE-{item.id}</span>
                        </td>
                        <td>
                          <span className="code-pill">#BK-{item.bookingId}</span>
                        </td>
                        <td>
                          <strong>{item.doctorName}</strong>
                        </td>
                        <td>{formatVND(item.grossAmount)}</td>
                        <td>
                          <span className="text-slate-600 font-semibold">{item.platformFeeRate}%</span>
                        </td>
                        <td>
                          <strong className="text-gold">+{formatVND(item.platformFee)}</strong>
                        </td>
                        <td>
                          <span className="text-slate-400 text-xs">{moment(item.earnedAt).format('DD/MM/YYYY HH:mm')}</span>
                        </td>
                        <td>
                          <span className="note-text" title={item.note}>{item.note || 'Hoa hồng dịch vụ khám'}</span>
                        </td>
                        <td className="text-right">
                          <button
                            type="button"
                            className="btn-lineage-trigger"
                            onClick={() => onOpenLineage && onOpenLineage(item.bookingId)}
                            title="Truy vết ca khám đã đóng góp doanh thu hoa hồng này"
                          >
                            <GitCommit size={13} />
                            <span>Vòng đời ca #{item.bookingId} ➔</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="empty-constituent-state">
                  <Info size={24} className="text-slate-400" />
                  <p>Không tìm thấy khoản phí sàn nào</p>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* MỤC 5: TÀI KHOẢN VCB CÔNG TY — BẢO CHỨNG BỐN NGĂN VỐN THỰC TẾ   */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {selectedConstituentNode === 'VCB_MASTER' && (
            <div className="vcb-solvency-matrix">
              <div className="matrix-cards-grid">
                <div className="matrix-card card-purple" onClick={() => handleSelectNode('BN_APP')} style={{ cursor: 'pointer' }}>
                  <span className="card-lbl">1. VÍ BN KHẢ DỤNG (Nhấp để xem)</span>
                  <strong className="card-val text-purple">{formatVND(patientAvailable)}</strong>
                  <span className="card-sub">Tổng ví {formatVND(patientTotal)} (đã trừ {formatVND(patientReserved)} Escrow)</span>
                </div>
                <div className="matrix-card card-amber" onClick={() => handleSelectNode('ESCROW')} style={{ cursor: 'pointer' }}>
                  <span className="card-lbl">2. QUỸ KÝ QUỸ ESCROW (Nhấp để xem)</span>
                  <strong className="card-val text-amber">{formatVND(escrowTotal)}</strong>
                  <span className="card-sub">{escrowActiveCount} ca ({escrowWalletHoldCount} Ví + {escrowDirectVnpayCount} VNPay)</span>
                </div>
                <div className="matrix-card card-emerald" onClick={() => handleSelectNode('DOCTOR_APP')} style={{ cursor: 'pointer' }}>
                  <span className="card-lbl">3. NGHĨA VỤ VÍ BÁC SĨ (Nhấp để xem)</span>
                  <strong className="card-val text-emerald">{formatVND(doctorTotal)}</strong>
                  <span className="card-sub">{doctorWalletCount} tài khoản ví bác sĩ</span>
                </div>
                <div className="matrix-card card-gold" onClick={() => handleSelectNode('PROFIT_APP')} style={{ cursor: 'pointer' }}>
                  <span className="card-lbl">4. LỢI NHUẬN THUẦN SÀN (Nhấp để xem)</span>
                  <strong className="card-val text-gold">{formatVND(platformProfit)}</strong>
                  <span className="card-sub">Khả dụng chi tiêu hoặc rút tiền mặt</span>
                </div>
              </div>

              <div className="solvency-conclusion-bar">
                <div className="conclusion-left">
                  <CheckCircle2 size={18} className="text-emerald" />
                  <span>
                    Tổng nghĩa vụ sổ cái: <strong>{formatVND(totalSystemLiabilities)}</strong> + Dự trữ VCB: <strong>{formatVND(realBankSurplus)}</strong> (Vốn đối ứng sàn: {formatVND(realBankReserveFund)}) = Số dư VCB Thật: <strong>{formatVND(realBankTotal)}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  className="btn-open-vault-detail"
                  onClick={() => onOpenVault && onOpenVault('realBank')}
                >
                  <Eye size={13} />
                  <span>Xem Chi Tiết Sổ Cái VCB ➔</span>
                </button>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* MỤC 6: CỔNG THANH TOÁN VNPAY (BN_BANK) — DANH SÁCH NẠP TIỀN THẬT */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {selectedConstituentNode === 'BN_BANK' && (
            <div className="table-responsive-wrapper">
              {paginatedList.length > 0 ? (
                <table className="constituent-table">
                  <thead>
                    <tr>
                      <th>MÃ GIAO DỊCH</th>
                      <th>LOẠI DÒNG TIỀN</th>
                      <th>NGƯỜI BỆNH THANH TOÁN</th>
                      <th>CỔNG THANH TOÁN</th>
                      <th>SỐ TIỀN VÀO VCB</th>
                      <th>MÃ THAM CHIẾU (TXN REF)</th>
                      <th>TRẠNG THÁI</th>
                      <th>THỜI GIAN GIAO DỊCH</th>
                      <th className="text-right">TRUY VẾT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedList.map((item) => {
                      const isDirect = item.inflowType === 'DIRECT_BOOKING';
                      return (
                        <tr key={item.recordKey || `${item.inflowType || 'PAY'}-${item.id}`}>
                          <td>
                            <span className="code-pill">{isDirect ? `#BK-${item.bookingId || item.id}` : `#PAY-${item.id}`}</span>
                          </td>
                          <td>
                            <span className={`status-badge ${isDirect ? 'info' : 's2'}`}>
                              {item.inflowTypeLabel || (isDirect ? 'Đặt khám VNPay trực tiếp' : 'Nạp ví VNPay')}
                            </span>
                          </td>
                          <td>
                            <strong>{item.patientName}</strong>
                          </td>
                          <td>
                            <span className="status-badge s2">{item.paymentMethod || 'VNPAY'}</span>
                          </td>
                          <td>
                            <strong className="text-emerald">+{formatVND(item.amount)}</strong>
                          </td>
                          <td>
                            <span className="font-mono text-xs text-slate-600">{item.txnRef}</span>
                          </td>
                          <td>
                            <span className="status-badge success">{isDirect ? 'Đã thu VNPay' : 'Nạp thành công'}</span>
                          </td>
                          <td>
                            <span className="text-slate-400 text-xs">{moment(item.createdAt).format('DD/MM/YYYY HH:mm')}</span>
                          </td>
                          <td className="text-right">
                            <button
                              type="button"
                              className="btn-lineage-trigger"
                              onClick={() => onOpenLineage && onOpenLineage(isDirect ? (item.bookingId || item.id) : (item.id ? `PAY-${item.id}` : item.txnRef))}
                              title="Truy vết giao dịch VNPay này"
                            >
                              <GitCommit size={13} />
                              <span>{isDirect ? `Vòng đời ca #${item.bookingId || item.id} ➔` : 'Vòng đời nạp ➔'}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="empty-constituent-state">
                  <Info size={24} className="text-slate-400" />
                  <p>Không tìm thấy giao dịch VNPay nào</p>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* MỤC 7: TK VCB BÁC SĨ (UNC VCB) — DANH SÁCH ỦY NHIỆM CHI THỰC TẾ  */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {selectedConstituentNode === 'DOCTOR_BANK' && (
            <div className="table-responsive-wrapper">
              {paginatedList.length > 0 ? (
                <table className="constituent-table">
                  <thead>
                    <tr>
                      <th>MÃ LỆNH CHI</th>
                      <th>BÁC SĨ THỤ HƯỞNG</th>
                      <th>NGÂN HÀNG THỤ HƯỞNG</th>
                      <th>SỐ TÀI KHOẢN NHẬN</th>
                      <th>SỐ TIỀN CHI TRẢ</th>
                      <th>MÃ GIAO DỊCH VCB (REF)</th>
                      <th>TRẠNG THÁI</th>
                      <th>NGÀY GIẢI NGÂN</th>
                      <th className="text-right">MINH CHỨNG</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedList.map((item) => (
                      <tr key={item.recordKey || item.id}>
                        <td>
                          <span className="code-pill">{String(item.id).startsWith('DS-') ? `#${item.id}` : `#UNC-${item.id}`}</span>
                        </td>
                        <td>
                          <strong>{item.accountHolderName}</strong>
                        </td>
                        <td>
                          <div className="cell-doctor">
                            <Landmark size={13} className="text-blue-500" />
                            <span>{item.bankName || '--'}</span>
                          </div>
                        </td>
                        <td>
                          <span className="font-mono text-xs">{item.accountNumber || item.bankAccountNumber || '--'}</span>
                        </td>
                        <td>
                          <strong className="text-blue">{formatVND(item.amount)}</strong>
                        </td>
                        <td>
                          <span className="code-pill">{item.bankTransactionRef || '--'}</span>
                        </td>
                        <td>
                          <span className="status-badge success">
                            {item.status === 'TRANSFERRED' ? 'Đã giải ngân UNC' : item.status}
                          </span>
                        </td>
                        <td>
                          <span className="text-slate-400 text-xs">{moment(item.transferredAt || item.createdAt).format('DD/MM/YYYY HH:mm')}</span>
                        </td>
                        <td className="text-right">
                          <button
                            type="button"
                            className="btn-lineage-trigger"
                            onClick={() => onOpenVault && onOpenVault('realBank')}
                          >
                            <Receipt size={12} />
                            <span>Sao kê VCB ➔</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="empty-constituent-state">
                  <Info size={24} className="text-slate-400" />
                  <p>Không tìm thấy lệnh chi UNC Vietcombank nào</p>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* MỤC 8: CHI PHÍ CÔNG TY (RÚT LỢI NHUẬN) — LỊCH SỬ RÚT TIỀN THẬT  */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {selectedConstituentNode === 'CORP_EXPENSE' && (
            <div className="table-responsive-wrapper">
              {paginatedList.length > 0 ? (
                <table className="constituent-table">
                  <thead>
                    <tr>
                      <th>MÃ LỆNH</th>
                      <th>ĐƠN VỊ / TÀI KHOẢN NHẬN</th>
                      <th>NGÂN HÀNG</th>
                      <th>SỐ TIỀN RÚT</th>
                      <th>MỤC ĐÍCH CHI DÙNG</th>
                      <th>TRẠNG THÁI</th>
                      <th>THỜI GIAN RÚT</th>
                      <th className="text-right">MINH CHỨNG</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedList.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <span className="code-pill">{item.batchCode || `#EXPENSE-${item.id}`}</span>
                        </td>
                        <td>
                          <strong>{item.recipient}</strong>
                        </td>
                        <td>
                          <span className="font-mono text-xs">{item.accountNumber || item.bankName}</span>
                        </td>
                        <td>
                          <strong className="text-rose">-{formatVND(item.amount)}</strong>
                        </td>
                        <td>
                          <span className="text-slate-600 text-xs">{item.reason}</span>
                        </td>
                        <td>
                          <span className="status-badge success">Hoàn tất</span>
                        </td>
                        <td>
                          <span className="text-slate-400 text-xs">{moment(item.transferredAt).format('DD/MM/YYYY HH:mm')}</span>
                        </td>
                        <td className="text-right">
                          <button
                            type="button"
                            className="btn-lineage-trigger"
                            onClick={() => onOpenVault && onOpenVault('platformProfit')}
                          >
                            <Eye size={12} />
                            <span>Sổ lợi nhuận ➔</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="empty-constituent-state">
                  <Info size={24} className="text-slate-400" />
                  <p>Không có lệnh rút lợi nhuận sàn nào trong kỳ lọc</p>
                </div>
              )}
            </div>
          )}

          {/* THANH ĐIỀU HƯỚNG PHÂN TRANG (PAGINATION CONTROLS) */}
          {totalPages > 1 && (
            <div className="constituent-pagination-bar">
              <span className="pagination-info">
                Hiển thị {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, currentList.length)} trong tổng số <strong>{currentList.length}</strong> bản ghi
              </span>
              <div className="pagination-buttons">
                <button
                  type="button"
                  className="btn-page-nav"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                >
                  <ChevronLeft size={13} />
                  <span>Trước</span>
                </button>
                <span className="page-current-indicator">
                  Trang {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  className="btn-page-nav"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                >
                  <span>Sau</span>
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 4. THANH ĐỐI SOÁT CÂN BẰNG BẤT BIẾN CFO (REAL-TIME SOLVENCY FOOTER)   */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="twin-solvency-footer">
        <div className={`solvency-status-badge ${reconciliation?.isBalanced !== false ? 'success' : 'warning'}`}>
          <ShieldCheck size={16} />
          <span>
            {reconciliation?.isBalanced !== false
              ? `ĐỐI SOÁT THANH KHOẢN: BẢO CHỨNG ${coveragePercent}%`
              : 'CẢNH BÁO THIẾU HỤT THANH KHOẢN VCB'}
          </span>
        </div>

        <div className="solvency-formula">
          <span className="term-vcb">VCB Thật ({formatVND(realBankTotal)})</span>
          <span className="op">=</span>
          <span className="term-app">Ví BN rảnh ({formatVND(patientAvailable)})</span>
          <span className="op">+</span>
          <span className="term-app">Escrow ({formatVND(escrowTotal)})</span>
          <span className="op">+</span>
          <span className="term-app">Ví BS ({formatVND(doctorTotal)})</span>
          <span className="op">+</span>
          <span className="term-app">Lợi nhuận ({formatVND(platformProfit)})</span>
          <span className="op">+</span>
          <span className="term-app">Dự trữ ({formatVND(realBankSurplus)})</span>
        </div>

        <div className="solvency-audit-action">
          <span className="diff-zero">
            {realBankSurplus > 0
              ? `Dự trữ thanh khoản: +${formatVND(realBankSurplus)}`
              : `Chênh lệch: ${formatVND(reconciliation?.discrepancyAmount ?? 0)}`}
          </span>
          {featuredBookingId && (
            <button
              type="button"
              className="btn-trace-lineage"
              onClick={() => onOpenLineage && onOpenLineage(featuredBookingId)}
              title={`Truy vết toàn vẹn vòng đời dòng tiền ca khám #${featuredBookingId}`}
            >
              <GitCommit size={13} />
              <span>Truy vết ca khám #{featuredBookingId}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
