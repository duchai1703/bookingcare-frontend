// src/containers/System/Doctor/DoctorRevenue.jsx
// [Doctor Income Workspace] Mini Financial Workspace — Bóc tách tài chính Master - Detail
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getDoctorIncomeWorkspace } from '../../../services/doctorService';
import {
  getDoctorWallet,
  getDoctorWalletTransactions,
  requestDoctorWithdrawal,
  getDoctorWithdrawalRequests,
  cancelDoctorWithdrawalRequest,
  getDoctorSettlementStatement,
} from '../../../services/walletService';
import './DoctorRevenue.scss';

// Helper format VND
const formatVND = (amount) => {
  if (amount == null || isNaN(amount)) return '0 ₫';
  return Number(amount).toLocaleString('vi-VN') + ' ₫';
};

// Helper tính khoảng ngày theo preset
const getPresetRange = (preset) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const date = now.getDate();

  const toDateStr = (d) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  switch (preset) {
    case 'today': {
      const todayStr = toDateStr(now);
      return { startDate: todayStr, endDate: todayStr };
    }
    case '7days': {
      const past7 = new Date(now);
      past7.setDate(date - 6);
      return { startDate: toDateStr(past7), endDate: toDateStr(now) };
    }
    case 'this_month': {
      const startM = new Date(year, month, 1);
      const endM = new Date(year, month + 1, 0);
      return { startDate: toDateStr(startM), endDate: toDateStr(endM) };
    }
    case 'this_quarter': {
      const qMonth = Math.floor(month / 3) * 3;
      const startQ = new Date(year, qMonth, 1);
      const endQ = new Date(year, qMonth + 3, 0);
      return { startDate: toDateStr(startQ), endDate: toDateStr(endQ) };
    }
    case 'this_year': {
      return { startDate: `${year}-01-01`, endDate: `${year}-12-31` };
    }
    default:
      return { startDate: '', endDate: '' };
  }
};

const DoctorRevenue = () => {
  const intl = useIntl();
  const outletCtx = useOutletContext();
  const outletClinicId = outletCtx?.selectedClinicId;
  const [searchParams, setSearchParams] = useSearchParams();

  // State Tabs: 'overview' | 'payouts' | 'wallet'
  const [activeMainTab, setActiveMainTab] = useState(() => {
    return searchParams.get('tab') || 'overview';
  });

  // [Doctor Wallet & Ledger] State
  const [doctorWallet, setDoctorWallet] = useState(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletSubTab, setWalletSubTab] = useState('ledger'); // 'ledger' | 'withdrawals'

  // Sổ cái sao kê
  const [doctorTransactions, setDoctorTransactions] = useState([]);
  const [walletTxTotal, setWalletTxTotal] = useState(0);
  const [walletTxPage, setWalletTxPage] = useState(1);
  const [walletTxLimit] = useState(10);
  const [walletTxType, setWalletTxType] = useState('ALL');
  const [isWalletTxLoading, setIsWalletTxLoading] = useState(false);

  // Yêu cầu rút tiền
  const [doctorWithdrawals, setDoctorWithdrawals] = useState([]);
  const [withdrawalsTotal, setWithdrawalsTotal] = useState(0);
  const [withdrawalsPage, setWithdrawalsPage] = useState(1);
  const [withdrawalsLimit] = useState(10);
  const [withdrawalsStatusFilter, setWithdrawalsStatusFilter] = useState('ALL');
  const [isWithdrawalsLoading, setIsWithdrawalsLoading] = useState(false);

  // Modal Rút tiền
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState(500000);
  const [withdrawAmountStr, setWithdrawAmountStr] = useState('500,000');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [userNote, setUserNote] = useState('');
  const [isSubmittingWithdraw, setIsSubmittingWithdraw] = useState(false);

  // [Doctor Settlement Statement] Bảng kê ca khám T+24h
  const [settlementItems, setSettlementItems] = useState([]);
  const [settlementSummary, setSettlementSummary] = useState(null);
  const [settlementTotal, setSettlementTotal] = useState(0);
  const [settlementPage, setSettlementPage] = useState(1);
  const [settlementLimit] = useState(10);
  const [settlementStatus, setSettlementStatus] = useState('ALL');
  const [isSettlementsLoading, setIsSettlementsLoading] = useState(false);

  // Filter state
  const [rangePreset, setRangePreset] = useState('this_year');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedFacility, setSelectedFacility] = useState(() => outletClinicId || 'all');
  const [selectedSpecialty, setSelectedSpecialty] = useState('all');

  // [Multi-Facility] Đồng bộ khi Practice Context Selector ở topbar thay đổi
  useEffect(() => {
    if (outletClinicId && outletClinicId !== selectedFacility) {
      setSelectedFacility(outletClinicId);
    }
  }, [outletClinicId]);

  // Fetch thù lao chi tiết theo ca khám
  const fetchSettlementStatement = useCallback(async () => {
    setIsSettlementsLoading(true);
    try {
      const res = await getDoctorSettlementStatement({
        page: settlementPage,
        limit: settlementLimit,
        status: settlementStatus,
        startDate,
        endDate,
      });
      if (res && res.errCode === 0) {
        const rows = Array.isArray(res.data) ? res.data : (res.data?.items || []);
        setSettlementItems(rows);
        setSettlementSummary(res.summary || res.data?.summary || null);
        setSettlementTotal(res.pagination?.total || res.data?.pagination?.total || rows.length);
      }
    } catch (e) {
      console.error('Error fetching settlement statement:', e);
    } finally {
      setIsSettlementsLoading(false);
    }
  }, [settlementPage, settlementLimit, settlementStatus, startDate, endDate]);

  useEffect(() => {
    if (activeMainTab === 'settlements') {
      fetchSettlementStatement();
    }
  }, [activeMainTab, fetchSettlementStatement]);
  const [statusTab, setStatusTab] = useState('all'); // 'all' | 'paid' | 'pending' | 'refunded'
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('newest'); // 'newest' | 'oldest' | 'income_desc' | 'income_asc'

  // Chart Metric Toggle: 'income' | 'count'
  const [chartMetric, setChartMetric] = useState('income');

  // Data state
  const [loading, setLoading] = useState(false);
  const [workspaceData, setWorkspaceData] = useState({
    kpi: {
      totalIncome: 0,
      paidIncome: 0,
      pendingIncome: 0,
      refundedIncome: 0,
      totalConsultations: 0,
      paidRatio: 0,
      pendingRatio: 0,
    },
    counts: { all: 0, paid: 0, pending: 0, refunded: 0 },
    timeline: [],
    facilityDistribution: [],
    transactions: [],
    settlements: [],
    facilities: [],
    specialties: [],
    doctorProfile: {},
  });

  // Selected Transaction for Drawer Detail
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showJsonSnapshot, setShowJsonSnapshot] = useState(false);

  // Selected Settlement for Payout Drawer
  const [selectedSettlement, setSelectedSettlement] = useState(null);

  // Khởi tạo date range theo preset
  useEffect(() => {
    const range = getPresetRange(rangePreset);
    setStartDate(range.startDate);
    setEndDate(range.endDate);
  }, [rangePreset]);

  // Fetch API khi các filter thay đổi
  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        facilityId: selectedFacility !== 'all' ? selectedFacility : undefined,
        specialtyId: selectedSpecialty !== 'all' ? selectedSpecialty : undefined,
        status: statusTab !== 'all' ? statusTab : undefined,
      };
      const res = await getDoctorIncomeWorkspace(params);
      if (res?.data?.errCode === 0 && res?.data?.data) {
        setWorkspaceData(res.data.data);
      } else if (res?.errCode === 0 && res?.data) {
        setWorkspaceData(res.data);
      }
    } catch (err) {
      console.error('Error fetching doctor income workspace:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate, selectedFacility, selectedSpecialty, statusTab]);

  // Client-side search and sort on transactions
  const displayedTransactions = useMemo(() => {
    let list = [...(workspaceData.transactions || [])];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (t) =>
          (t.bookingCode && t.bookingCode.toLowerCase().includes(q)) ||
          (t.patientName && t.patientName.toLowerCase().includes(q)) ||
          (t.patientPhoneNumber && t.patientPhoneNumber.includes(q))
      );
    }

    list.sort((a, b) => {
      if (sortOrder === 'newest') return (b.date || '').localeCompare(a.date || '') || b.id - a.id;
      if (sortOrder === 'oldest') return (a.date || '').localeCompare(b.date || '') || a.id - b.id;
      if (sortOrder === 'income_desc') return (b.doctorShare || 0) - (a.doctorShare || 0);
      if (sortOrder === 'income_asc') return (a.doctorShare || 0) - (b.doctorShare || 0);
      return 0;
    });

    return list;
  }, [workspaceData.transactions, searchQuery, sortOrder]);

  // ── [Doctor Wallet & Ledger] API Handlers ──
  const fetchDoctorWallet = useCallback(async () => {
    try {
      setWalletLoading(true);
      const res = await getDoctorWallet();
      if (res && res.errCode === 0 && res.data) {
        setDoctorWallet(res.data);
      }
    } catch (err) {
      console.error('Error fetching doctor wallet:', err);
    } finally {
      setWalletLoading(false);
    }
  }, []);

  const fetchWalletTransactions = useCallback(async () => {
    try {
      setIsWalletTxLoading(true);
      const params = {
        page: walletTxPage,
        limit: walletTxLimit,
        type: walletTxType !== 'ALL' ? walletTxType : undefined,
      };
      const res = await getDoctorWalletTransactions(params);
      if (res && res.errCode === 0 && res.data) {
        setDoctorTransactions(res.data.transactions || []);
        setWalletTxTotal(res.data.total || 0);
      }
    } catch (err) {
      console.error('Error fetching doctor wallet transactions:', err);
    } finally {
      setIsWalletTxLoading(false);
    }
  }, [walletTxPage, walletTxLimit, walletTxType]);

  const fetchWithdrawals = useCallback(async () => {
    try {
      setIsWithdrawalsLoading(true);
      const params = {
        page: withdrawalsPage,
        limit: withdrawalsLimit,
        status: withdrawalsStatusFilter !== 'ALL' ? withdrawalsStatusFilter : undefined,
      };
      const res = await getDoctorWithdrawalRequests(params);
      if (res && res.errCode === 0 && res.data) {
        setDoctorWithdrawals(res.data.requests || []);
        setWithdrawalsTotal(res.data.total || 0);
      }
    } catch (err) {
      console.error('Error fetching doctor withdrawals:', err);
    } finally {
      setIsWithdrawalsLoading(false);
    }
  }, [withdrawalsPage, withdrawalsLimit, withdrawalsStatusFilter]);

  // Đồng bộ searchParams khi thay đổi URL
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'wallet') {
      setActiveMainTab('wallet');
    } else if (tabParam === 'payouts') {
      setActiveMainTab('payouts');
    } else if (tabParam === 'overview') {
      setActiveMainTab('overview');
    }

    if (searchParams.get('action') === 'withdraw') {
      setShowWithdrawModal(true);
    }
  }, [searchParams]);

  // Tải dữ liệu khi mở tab Ví Bác sĩ
  useEffect(() => {
    if (activeMainTab === 'wallet') {
      fetchDoctorWallet();
      if (walletSubTab === 'ledger') {
        fetchWalletTransactions();
      } else {
        fetchWithdrawals();
      }
    }
  }, [activeMainTab, walletSubTab, fetchDoctorWallet, fetchWalletTransactions, fetchWithdrawals]);

  // Tải thông tin ví ngay lúc đầu để hiển thị badge số dư trên tab
  useEffect(() => {
    fetchDoctorWallet();
  }, [fetchDoctorWallet]);

  // Tự động điền tài khoản ngân hàng từ hồ sơ bác sĩ
  useEffect(() => {
    if (showWithdrawModal && workspaceData?.doctorProfile) {
      const p = workspaceData.doctorProfile;
      if (!bankName && p.bankName) setBankName(p.bankName);
      if (!accountNumber && p.bankAccountNumber) setAccountNumber(p.bankAccountNumber);
      if (!accountHolderName) setAccountHolderName(p.bankAccountName || p.name || '');
    }
  }, [showWithdrawModal, workspaceData?.doctorProfile, bankName, accountNumber, accountHolderName]);

  const handleCancelWithdrawal = async (reqId) => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy yêu cầu rút tiền này? Số tiền tạm giữ sẽ được hoàn lại vào số dư khả dụng.')) {
      return;
    }
    try {
      const res = await cancelDoctorWithdrawalRequest(reqId);
      if (res && res.errCode === 0) {
        toast.success('Hủy yêu cầu rút tiền thành công!');
        fetchDoctorWallet();
        fetchWithdrawals();
      } else {
        toast.error(res?.errMessage || 'Không thể hủy yêu cầu rút tiền');
      }
    } catch (err) {
      toast.error('Lỗi khi hủy yêu cầu rút tiền');
    }
  };

  const handleAmountChange = (e) => {
    const rawVal = e.target.value.replace(/[^0-9]/g, '');
    const numVal = parseInt(rawVal, 10) || 0;
    setWithdrawAmount(numVal);
    setWithdrawAmountStr(numVal > 0 ? numVal.toLocaleString('vi-VN') : '');
  };

  const handleSelectPreset = (presetVal) => {
    const avail = Number(doctorWallet?.availableBalance || 0);
    let finalVal = presetVal;
    if (presetVal === 'ALL') {
      finalVal = avail;
    } else if (presetVal === '50%') {
      finalVal = Math.round(avail * 0.5);
    }
    setWithdrawAmount(finalVal);
    setWithdrawAmountStr(finalVal > 0 ? finalVal.toLocaleString('vi-VN') : '');
  };

  const handleWithdrawSubmit = async (e) => {
    e.preventDefault();
    const avail = Number(doctorWallet?.availableBalance || 0);
    if (withdrawAmount < 50000) {
      toast.warning('Hạn mức rút tiền tối thiểu là 50.000 VNĐ');
      return;
    }
    if (withdrawAmount > avail) {
      toast.warning(`Số tiền rút vượt quá số dư khả dụng (${formatVND(avail)})`);
      return;
    }
    if (!bankName.trim() || !accountNumber.trim() || !accountHolderName.trim()) {
      toast.warning('Vui lòng điền đầy đủ thông tin tài khoản ngân hàng thụ hưởng');
      return;
    }

    setIsSubmittingWithdraw(true);
    try {
      const res = await requestDoctorWithdrawal({
        amount: withdrawAmount,
        bankInfo: {
          bankName: bankName.trim(),
          accountNumber: accountNumber.trim(),
          accountHolderName: accountHolderName.trim().toUpperCase(),
        },
        userNote: userNote.trim() || undefined,
      });

      if (res && res.errCode === 0) {
        toast.success('Gửi yêu cầu rút tiền thành công! Admin sẽ duyệt chi và giải ngân theo SLA.');
        setShowWithdrawModal(false);
        fetchDoctorWallet();
        fetchWithdrawals();
        setWalletSubTab('withdrawals');
      } else {
        toast.error(res?.errMessage || 'Không thể tạo yêu cầu rút tiền');
      }
    } catch (err) {
      toast.error('Lỗi kết nối khi gửi yêu cầu rút tiền');
    } finally {
      setIsSubmittingWithdraw(false);
    }
  };

  // Export to CSV Function
  const handleExportCSV = () => {
    const list = displayedTransactions;
    if (!list || list.length === 0) {
      alert('Không có dữ liệu để xuất báo cáo!');
      return;
    }

    const headers = [
      'Mã phiên khám',
      'Ngày khám',
      'Khung giờ',
      'Bệnh nhân',
      'Số điện thoại',
      'Cơ sở y tế',
      'Chuyên khoa',
      'Giá dịch vụ (VND)',
      'Phí nền tảng (VND)',
      'Thu nhập BS (VND)',
      'BN thanh toán App',
      'App thanh toán BS',
      'Mã đợt đối soát',
      'Mã GD chuyển khoản',
      'Ngày chuyển khoản',
      'Chính sách áp dụng',
    ];

    const rows = list.map((t) => [
      t.bookingCode,
      t.date,
      `"${t.timeTypeText || t.timeType}"`,
      `"${t.patientName}"`,
      `"${t.patientPhoneNumber}"`,
      `"${t.facility?.name || ''}"`,
      `"${t.specialty?.name || ''}"`,
      t.grossPrice || 0,
      t.platformFee || 0,
      t.doctorShare || 0,
      t.patientPaymentStatus === 'paid' ? 'Đã thanh toán' : t.isRefunded ? 'Đã hoàn tiền' : 'Chưa thanh toán',
      t.appPayoutStatus === 'paid' ? 'Đã chuyển' : t.appPayoutStatus === 'pending' ? 'Chờ thanh toán' : 'Chưa phát sinh',
      t.settlement?.code || 'Chưa đối soát',
      t.settlement?.transactionRef || '',
      t.settlement?.paidAt ? new Date(t.settlement.paidAt).toLocaleDateString('vi-VN') : '',
      `"${t.policySnapshot?.revenuePolicy?.name || 'Mặc định'}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `Bao_cao_thu_nhap_bac_si_${startDate || 'all'}_den_${endDate || 'all'}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper render status badges
  const renderPatientBadge = (status) => {
    if (status === 'paid') {
      return <span className="status-pill status-pill--success"><i className="fas fa-check-circle"></i> Đã TT</span>;
    }
    if (status === 'refunded') {
      return <span className="status-pill status-pill--refund"><i className="fas fa-undo"></i> Đã hoàn</span>;
    }
    return <span className="status-pill status-pill--warning"><i className="fas fa-clock"></i> Chưa TT</span>;
  };

  const renderPayoutBadge = (status) => {
    if (status === 'paid') {
      return <span className="status-pill status-pill--success"><i className="fas fa-check-double"></i> Đã chuyển</span>;
    }
    if (status === 'pending') {
      return <span className="status-pill status-pill--pending"><i className="fas fa-hourglass-half"></i> Chờ payout</span>;
    }
    if (status === 'refunded') {
      return <span className="status-pill status-pill--neutral"><i className="fas fa-ban"></i> Hủy / Hoàn</span>;
    }
    return <span className="status-pill status-pill--neutral"><i className="fas fa-minus"></i> Chưa phát sinh</span>;
  };

  // Max value in timeline chart
  const maxChartVal = useMemo(() => {
    const vals = (workspaceData.timeline || []).map((p) =>
      chartMetric === 'income' ? p.income : p.count
    );
    return Math.max(...vals, 1);
  }, [workspaceData.timeline, chartMetric]);

  const kpi = workspaceData.kpi || {};

  return (
    <div className="doctor-revenue-page">
      {/* ── 1. Top Header & Primary Controls ── */}
      <div className="workspace-header">
        <div className="header-title-block">
          <h2>💰 Thu nhập & Thanh toán</h2>
          <p className="subtitle">
            Không gian tài chính bác sĩ: theo dõi thu nhập ca khám, đợt quyết toán, số dư ví và rút tiền về ngân hàng
          </p>
        </div>

        <div className="header-actions">
          <button
            type="button"
            className="btn-export-report"
            onClick={handleExportCSV}
            title="Xuất bảng đối soát ra file CSV/Excel"
          >
            <i className="fas fa-file-excel"></i> Xuất báo cáo ↓
          </button>
        </div>
      </div>

      {/* ── 2. Navigation Tabs (Overview vs Payouts vs Wallet vs Settlements) ── */}
      <div className="workspace-tabs-nav">
        <button
          type="button"
          className={`tab-item ${activeMainTab === 'overview' ? 'tab-item--active' : ''}`}
          onClick={() => setActiveMainTab('overview')}
        >
          <i className="fas fa-chart-pie"></i> Tổng quan
        </button>
        <button
          type="button"
          className={`tab-item ${activeMainTab === 'payouts' ? 'tab-item--active' : ''}`}
          onClick={() => setActiveMainTab('payouts')}
        >
          <i className="fas fa-money-check-alt"></i> Đợt thanh toán
          {workspaceData.settlements?.length > 0 && (
            <span className="tab-badge">{workspaceData.settlements.length}</span>
          )}
        </button>
        <button
          type="button"
          className={`tab-item tab-item--wallet ${activeMainTab === 'wallet' ? 'tab-item--active' : ''}`}
          onClick={() => setActiveMainTab('wallet')}
        >
          <i className="fas fa-wallet"></i> Ví & Rút tiền
          {doctorWallet && (
            <span className="tab-badge tab-badge--wallet">
              {formatVND(doctorWallet.balance)}
            </span>
          )}
        </button>
        <button
          type="button"
          className={`tab-item ${activeMainTab === 'settlements' ? 'tab-item--active' : ''}`}
          onClick={() => setActiveMainTab('settlements')}
        >
          <i className="fas fa-receipt"></i> Bảng kê ca khám
          {settlementSummary?.availableCount > 0 && (
            <span className="tab-badge" style={{ background: '#ecfdf5', color: '#047857' }}>
              {settlementSummary.availableCount} khả dụng
            </span>
          )}
        </button>
      </div>

      {/* ── 3. Filters Toolbar (Presets & Custom Dates & Dimensions) ── */}
      {activeMainTab !== 'wallet' && (
        <div className="filters-card">
          <div className="filter-presets">
            <span className="preset-label">Khoảng thời gian:</span>
            {[
              { key: 'today', label: 'Hôm nay' },
              { key: '7days', label: '7 ngày' },
              { key: 'this_month', label: 'Tháng này' },
              { key: 'this_quarter', label: 'Quý này' },
              { key: 'this_year', label: 'Năm nay' },
              { key: 'custom', label: 'Tùy chọn' },
            ].map((preset) => (
              <button
                key={preset.key}
                type="button"
                className={`btn-preset ${rangePreset === preset.key ? 'btn-preset--active' : ''}`}
                onClick={() => setRangePreset(preset.key)}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="filter-inputs-row">
            <div className="date-picker-group">
              <span className="input-label">Từ ngày:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setRangePreset('custom');
                }}
                className="form-control-date"
              />
            </div>

            <div className="date-picker-group">
              <span className="input-label">Đến ngày:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setRangePreset('custom');
                }}
                className="form-control-date"
              />
            </div>

            <div className="select-group">
              <span className="input-label">Cơ sở:</span>
              <select
                value={selectedFacility}
                onChange={(e) => setSelectedFacility(e.target.value)}
                className="form-control-select"
              >
                <option value="all">Tất cả cơ sở</option>
                {(workspaceData.facilities || []).map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="select-group">
              <span className="input-label">Chuyên khoa:</span>
              <select
                value={selectedSpecialty}
                onChange={(e) => setSelectedSpecialty(e.target.value)}
                className="form-control-select"
              >
                <option value="all">Tất cả chuyên khoa</option>
                {(workspaceData.specialties || []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              className="btn-refresh-filter"
              onClick={fetchData}
              title="Tải lại dữ liệu"
            >
              <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`}></i> Làm mới
            </button>
          </div>
        </div>
      )}

      {/* ── TAB 1: TỔNG QUAN & GIAO DỊCH ── */}
      {activeMainTab === 'overview' && (
        <>
          {/* ── 4. Four Core Financial KPI Stat Cards ── */}
          <div className="kpi-grid">
            <div className="kpi-card kpi-card--income">
              <div className="kpi-header">
                <span className="kpi-label">Thu nhập ca khám</span>
                <span className="kpi-badge kpi-badge--primary">Trong kỳ</span>
              </div>
              <div className="kpi-value">{formatVND(kpi.totalIncome)}</div>
              <div className="kpi-subtext">
                <i className="fas fa-stethoscope"></i> Tổng thu nhập thực nhận từ các ca khám
              </div>
            </div>

            <div className="kpi-card kpi-card--paid">
              <div className="kpi-header">
                <span className="kpi-label">Đã kết chuyển vào ví</span>
                <span className="kpi-badge kpi-badge--success">Đã đối soát</span>
              </div>
              <div className="kpi-value">{formatVND(settlementSummary?.paidAmount ?? kpi.paidIncome ?? 0)}</div>
              <div className="kpi-subtext">
                <i className="fas fa-check-circle"></i> Đã hạch toán vào số dư ví bác sĩ
              </div>
            </div>

            <div className="kpi-card kpi-card--pending">
              <div className="kpi-header">
                <span className="kpi-label">Đang tạm giữ đối soát (T+24h)</span>
                <span className="kpi-badge kpi-badge--warning">Bảo lưu</span>
              </div>
              <div className="kpi-value">{formatVND(settlementSummary?.earnedAmount ?? kpi.pendingIncome ?? 0)}</div>
              <div className="kpi-subtext">
                <i className="fas fa-hourglass-half"></i> Trong thời hạn 24h chờ mở khóa khả dụng
              </div>
            </div>

            <div className="kpi-card kpi-card--count">
              <div className="kpi-header">
                <span className="kpi-label">Số dư ví khả dụng</span>
                <span className="kpi-badge kpi-badge--neutral">Có thể rút</span>
              </div>
              <div className="kpi-value">{formatVND(doctorWallet?.balance || 0)}</div>
              <div className="kpi-subtext">
                <i className="fas fa-wallet"></i> Tiền thực tế sẵn sàng rút về ngân hàng
              </div>
            </div>
          </div>

          {/* ── 5. Analytics Row (Income Timeline Chart & Distribution Progress) ── */}
          <div className="analytics-row">
            {/* Chart: Thu nhập theo thời gian */}
            <div className="analytics-box analytics-box--chart">
              <div className="analytics-box-header">
                <div>
                  <h4 className="box-title">Thu nhập theo thời gian</h4>
                  <span className="box-subtitle">Diễn biến phát sinh thu nhập các ngày</span>
                </div>
                <div className="chart-toggle-buttons">
                  <button
                    type="button"
                    className={`btn-toggle-metric ${chartMetric === 'income' ? 'active' : ''}`}
                    onClick={() => setChartMetric('income')}
                  >
                    Thu nhập
                  </button>
                  <button
                    type="button"
                    className={`btn-toggle-metric ${chartMetric === 'count' ? 'active' : ''}`}
                    onClick={() => setChartMetric('count')}
                  >
                    Lượt khám
                  </button>
                </div>
              </div>

              {workspaceData.timeline?.length === 0 ? (
                <div className="empty-chart-state">
                  <i className="fas fa-chart-line"></i>
                  <p>Chưa có dữ liệu phát sinh trong khoảng thời gian này</p>
                </div>
              ) : (
                <div className="custom-chart-wrapper">
                  <div className="bars-container">
                    {workspaceData.timeline.map((point, idx) => {
                      const val = chartMetric === 'income' ? point.income : point.count;
                      const pct = maxChartVal > 0 ? (val / maxChartVal) * 100 : 0;
                      return (
                        <div key={idx} className="bar-column">
                          <div className="bar-hover-tooltip">
                            <strong>{point.date}</strong>
                            <span>Thu nhập: {formatVND(point.income)}</span>
                            <span>{point.count} lượt khám</span>
                          </div>
                          <div className="bar-track">
                            <div
                              className={`bar-fill ${val > 0 ? 'bar-fill--active' : ''}`}
                              style={{ height: `${Math.max(pct, val > 0 ? 6 : 0)}%` }}
                            />
                          </div>
                          <span className="bar-label">
                            {point.date.length >= 10 ? point.date.slice(5) : point.date}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Cash Flow Distribution: Tiền đang ở đâu */}
            <div className="analytics-box analytics-box--distribution">
              <div className="analytics-box-header">
                <div>
                  <h4 className="box-title">Phân bổ thu nhập</h4>
                  <span className="box-subtitle">Trạng thái dòng tiền & nơi làm việc</span>
                </div>
              </div>

              <div className="flow-distribution-content">
                <div className="distribution-item">
                  <div className="dist-label-row">
                    <span className="dist-title">
                      <span className="color-dot color-dot--paid"></span> Đã thanh toán (App → BS)
                    </span>
                    <span className="dist-amount">{formatVND(kpi.paidIncome)} ({kpi.paidRatio}%)</span>
                  </div>
                  <div className="dist-progress-track">
                    <div
                      className="dist-progress-fill dist-progress-fill--paid"
                      style={{ width: `${kpi.paidRatio}%` }}
                    ></div>
                  </div>
                </div>

                <div className="distribution-item">
                  <div className="dist-label-row">
                    <span className="dist-title">
                      <span className="color-dot color-dot--pending"></span> Đang chờ đối soát chi trả
                    </span>
                    <span className="dist-amount">{formatVND(kpi.pendingIncome)} ({kpi.pendingRatio}%)</span>
                  </div>
                  <div className="dist-progress-track">
                    <div
                      className="dist-progress-fill dist-progress-fill--pending"
                      style={{ width: `${kpi.pendingRatio}%` }}
                    ></div>
                  </div>
                </div>

                {kpi.refundedIncome > 0 && (
                  <div className="distribution-item">
                    <div className="dist-label-row">
                      <span className="dist-title">
                        <span className="color-dot color-dot--refund"></span> Đã hoàn tiền cho bệnh nhân
                      </span>
                      <span className="dist-amount">{formatVND(kpi.refundedIncome)}</span>
                    </div>
                  </div>
                )}

                {/* Phân bổ theo cơ sở y tế */}
                <div className="facilities-breakdown">
                  <div className="breakdown-title">
                    <i className="fas fa-hospital"></i> Thu nhập theo cơ sở
                  </div>
                  {(workspaceData.facilityDistribution || []).map((fac, idx) => (
                    <div key={idx} className="facility-item">
                      <span className="facility-name">{fac.name}</span>
                      <span className="facility-val">
                        <strong>{formatVND(fac.income)}</strong> ({fac.count} lượt)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── 6. Master Transactions List ("Chi tiết thu nhập") ── */}
          <div className="master-transactions-card">
            <div className="master-card-header">
              <div className="master-tabs">
                <button
                  type="button"
                  className={`status-tab ${statusTab === 'all' ? 'status-tab--active' : ''}`}
                  onClick={() => setStatusTab('all')}
                >
                  Tất cả ({workspaceData.counts?.all || 0})
                </button>
                <button
                  type="button"
                  className={`status-tab ${statusTab === 'paid' ? 'status-tab--active' : ''}`}
                  onClick={() => setStatusTab('paid')}
                >
                  Đã thanh toán ({workspaceData.counts?.paid || 0})
                </button>
                <button
                  type="button"
                  className={`status-tab ${statusTab === 'pending' ? 'status-tab--active' : ''}`}
                  onClick={() => setStatusTab('pending')}
                >
                  Chờ thanh toán ({workspaceData.counts?.pending || 0})
                </button>
                <button
                  type="button"
                  className={`status-tab ${statusTab === 'refunded' ? 'status-tab--active' : ''}`}
                  onClick={() => setStatusTab('refunded')}
                >
                  Đã hoàn tiền ({workspaceData.counts?.refunded || 0})
                </button>
              </div>

              <div className="master-controls">
                <div className="search-box">
                  <i className="fas fa-search search-icon"></i>
                  <input
                    type="text"
                    placeholder="Tìm mã khám, tên bệnh nhân, SĐT..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="search-input"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      className="btn-clear-search"
                      onClick={() => setSearchQuery('')}
                    >
                      ×
                    </button>
                  )}
                </div>

                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="sort-select"
                >
                  <option value="newest">Sắp xếp: Mới nhất</option>
                  <option value="oldest">Sắp xếp: Cũ nhất</option>
                  <option value="income_desc">Thu nhập: Cao nhất</option>
                  <option value="income_asc">Thu nhập: Thấp nhất</option>
                </select>
              </div>
            </div>

            {/* Master Table */}
            <div className="transactions-table-wrap">
              {loading ? (
                <div className="loading-state">
                  <i className="fas fa-spinner fa-spin"></i> Đang tải danh sách giao dịch thu nhập...
                </div>
              ) : displayedTransactions.length === 0 ? (
                <div className="empty-transactions-state">
                  <i className="fas fa-receipt"></i>
                  <h4>Không tìm thấy giao dịch nào</h4>
                  <p>Hãy thử thay đổi khoảng ngày hoặc bộ lọc trạng thái</p>
                </div>
              ) : (
                <table className="transactions-table">
                  <thead>
                    <tr>
                      <th>Ngày & Giờ</th>
                      <th>Mã khám</th>
                      <th>Bệnh nhân</th>
                      <th>Cơ sở & Chuyên khoa</th>
                      <th className="text-right">Giá dịch vụ</th>
                      <th className="text-right">Thu nhập BS</th>
                      <th>BN → App</th>
                      <th>App → BS</th>
                      <th className="text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedTransactions.map((t) => {
                      const isSelected = selectedTransaction?.id === t.id;
                      return (
                        <tr
                          key={t.id}
                          className={`transaction-row ${isSelected ? 'transaction-row--selected' : ''}`}
                          onClick={() => {
                            setSelectedTransaction(t);
                            setShowJsonSnapshot(false);
                          }}
                        >
                          <td className="col-date">
                            <span className="date-main">{t.date}</span>
                            <span className="time-sub">{t.timeTypeText}</span>
                          </td>
                          <td className="col-code">
                            <span className="booking-code-pill">{t.bookingCode}</span>
                          </td>
                          <td className="col-patient">
                            <span className="patient-name">{t.patientName}</span>
                            <span className="patient-phone">{t.patientPhoneNumber || '---'}</span>
                          </td>
                          <td className="col-facility">
                            <span className="facility-title">{t.facility?.name}</span>
                            <span className="specialty-sub">{t.specialty?.name}</span>
                          </td>
                          <td className="col-gross text-right">
                            {formatVND(t.grossPrice)}
                          </td>
                          <td className="col-income text-right">
                            <strong className="income-highlight">
                              {formatVND(t.doctorShare)}
                            </strong>
                          </td>
                          <td className="col-status-bn">
                            {renderPatientBadge(t.patientPaymentStatus)}
                          </td>
                          <td className="col-status-app">
                            {renderPayoutBadge(t.appPayoutStatus)}
                          </td>
                          <td className="col-actions text-center">
                            <button
                              type="button"
                              className="btn-view-detail"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTransaction(t);
                                setShowJsonSnapshot(false);
                              }}
                              title="Xem bóc tách dòng tiền & chính sách"
                            >
                              Chi tiết <i className="fas fa-chevron-right"></i>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── TAB 2: ĐỢT THANH TOÁN (PAYOUTS) ── */}
      {activeMainTab === 'payouts' && (
        <div className="payouts-card">
          <div className="payouts-card-header">
            <div>
              <h3 className="card-title">Các đợt đối soát thanh toán (Doctor Payouts)</h3>
              <p className="card-subtitle">
                Danh sách các lần nền tảng BookingCare kết chuyển tiền thu nhập vào tài khoản ngân hàng của bạn
              </p>
            </div>
            {workspaceData.doctorProfile?.bankAccountNumber && (
              <div className="doctor-bank-badge">
                <i className="fas fa-university"></i>
                <span>
                  {workspaceData.doctorProfile.bankName} - {workspaceData.doctorProfile.bankAccountNumber} (
                  {workspaceData.doctorProfile.bankAccountName})
                </span>
              </div>
            )}
          </div>

          <div className="payouts-table-wrap">
            {workspaceData.settlements?.length === 0 ? (
              <div className="empty-payouts-state">
                <i className="fas fa-hand-holding-usd"></i>
                <h4>Chưa có đợt thanh toán nào</h4>
                <p>Nền tảng sẽ tự động tạo đợt quyết toán chi trả theo kỳ đối soát hợp đồng</p>
              </div>
            ) : (
              <table className="payouts-table">
                <thead>
                  <tr>
                    <th>Mã đợt</th>
                    <th>Kỳ đối soát</th>
                    <th>Số phiên</th>
                    <th className="text-right">Tổng doanh thu</th>
                    <th className="text-right">Phí nền tảng</th>
                    <th className="text-right">Thực nhận</th>
                    <th>Trạng thái</th>
                    <th>Mã giao dịch</th>
                    <th>Ngày chuyển</th>
                    <th className="text-center">Chi tiết</th>
                  </tr>
                </thead>
                <tbody>
                  {workspaceData.settlements.map((s) => (
                    <tr key={s.id} className="payout-row">
                      <td>
                        <span className="payout-code-tag">{s.code}</span>
                      </td>
                      <td>
                        <span className="period-dates">
                          {s.periodFrom ? new Date(s.periodFrom).toLocaleDateString('vi-VN') : ''} →{' '}
                          {s.periodTo ? new Date(s.periodTo).toLocaleDateString('vi-VN') : ''}
                        </span>
                      </td>
                      <td>
                        <span className="badge-sessions">{s.sessionsCount} phiên</span>
                      </td>
                      <td className="text-right">{formatVND(s.grossRevenue)}</td>
                      <td className="text-right text-muted">{formatVND(s.platformFee)}</td>
                      <td className="text-right font-bold text-success">
                        {formatVND(s.netPayout)}
                      </td>
                      <td>
                        {s.payoutStatus === 'paid' ? (
                          <span className="status-pill status-pill--success">
                            <i className="fas fa-check-circle"></i> Đã chuyển
                          </span>
                        ) : (
                          <span className="status-pill status-pill--pending">
                            <i className="fas fa-clock"></i> Đang xử lý
                          </span>
                        )}
                      </td>
                      <td>
                        <span className="tx-ref">{s.transactionRef}</span>
                      </td>
                      <td>
                        {s.paidAt ? new Date(s.paidAt).toLocaleDateString('vi-VN') : '---'}
                      </td>
                      <td className="text-center">
                        <button
                          type="button"
                          className="btn-payout-view"
                          onClick={() => setSelectedSettlement(s)}
                          title="Xem các phiên khám trong đợt này"
                        >
                          <i className="fas fa-list"></i> Xem phiên
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 3: VÍ BÁC SĨ & RÚT TIỀN (DOCTOR WALLET & LEDGER) ── */}
      {activeMainTab === 'wallet' && (
        <div className="doctor-wallet-container">
          {/* Executive Digital Wallet Card & Side Panel */}
          <div className="dw-digital-card-wrapper">
            {/* The BookingCare Digital Card (Left) */}
            <div className="dw-digital-card">
              <div className="dw-card-top-row">
                <div className="dw-card-brand">
                  <span className="dw-card-pulse-dot"></span>
                  <span>BookingCare Wallet</span>
                </div>
                <div className="dw-card-chips">
                  <i className="fas fa-microchip dw-chip-icon" title="Ví chuyên gia mã hóa an toàn"></i>
                  <i className="fas fa-wifi dw-wave-icon" title="Giao dịch đối soát an toàn"></i>
                </div>
              </div>

              <div className="dw-card-balance-block">
                <span className="dw-card-balance-label">SỐ DƯ KHẢ DỤNG</span>
                <div className="dw-card-balance-val">
                  {walletLoading ? (
                    <span className="dw-skeleton">Đang tải...</span>
                  ) : (
                    formatVND(doctorWallet?.balance || 0)
                  )}
                </div>
              </div>

              <div className="dw-card-bottom-row">
                <div className="dw-card-meta-col">
                  <span className="dw-card-meta-label">CHỦ TÀI KHOẢN VÍ</span>
                  <span className="dw-card-meta-val">
                    {(
                      workspaceData.doctorProfile?.bankAccountName ||
                      (doctorWallet?.owner ? `${doctorWallet.owner.lastName || ''} ${doctorWallet.owner.firstName || ''}` : '') ||
                      'ĐẶNG NGỌC TRƯỜNG GIANG'
                    ).toUpperCase()}
                  </span>
                </div>
                <div className="dw-card-meta-col" style={{ textAlign: 'right', alignItems: 'flex-end' }}>
                  <span className="dw-card-meta-label">MÃ ĐỊNH DANH VÍ</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="dw-card-meta-val" style={{ fontFamily: 'monospace' }}>
                      WAL-{String(doctorWallet?.id || 1).padStart(7, '0')}
                    </span>
                    <span className="dw-card-status-chip">
                      <span className="dw-chip-bullet"></span>
                      <span>ACTIVE</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Side Panel: Breakdown & Bank Details & Actions (Right) */}
            <div className="dw-side-panel">
              <div className="dw-balance-sub-grid">
                <div className="dw-sub-card dw-sub-card--hold">
                  <span className="dw-sub-label">Đang tạm giữ (T+24h)</span>
                  <span className="dw-sub-val text-amber">
                    {formatVND(settlementSummary?.earnedAmount || 0)}
                  </span>
                  <span className="dw-sub-hint">
                    {settlementSummary?.earnedCount || 0} ca mới khám, đối soát 24h
                  </span>
                </div>

                <div className="dw-sub-card dw-sub-card--pending">
                  <span className="dw-sub-label">Đang chờ rút (Hold)</span>
                  <span className="dw-sub-val text-blue">
                    {formatVND(doctorWallet?.holdBalance || 0)}
                  </span>
                  <span className="dw-sub-hint">Khóa chờ ngân hàng duyệt chi</span>
                </div>

                <div className="dw-sub-card dw-sub-card--withdrawn">
                  <span className="dw-sub-label">Đã rút về ngân hàng</span>
                  <span className="dw-sub-val">
                    {formatVND(
                      doctorWithdrawals
                        .filter((w) => w.status === 'APPROVED' || w.status === 'COMPLETED')
                        .reduce((acc, w) => acc + Number(w.amount || 0), 0)
                    )}
                  </span>
                  <span className="dw-sub-hint">Tổng tiền giải ngân thành công</span>
                </div>
              </div>

              <div className="dw-bank-action-row">
                <div className="dw-bank-info-box">
                  <div className="dw-bank-icon-wrap">
                    <i className="fas fa-university"></i>
                  </div>
                  <div className="dw-bank-details">
                    <div className="dw-bank-name-line">
                      {workspaceData.doctorProfile?.bankName || 'MB Bank'}
                    </div>
                    <div className="dw-bank-acc-line">
                      Số TK: {workspaceData.doctorProfile?.bankAccountNumber
                        ? `···· ${String(workspaceData.doctorProfile.bankAccountNumber).slice(-4)}`
                        : '···· 0031'}{' '}
                      • {workspaceData.doctorProfile?.bankAccountName || 'BS. Huỳnh Minh Minh'}
                    </div>
                  </div>
                </div>

                <div className="dw-cta-buttons">
                  <button
                    type="button"
                    className="btn-withdraw-main"
                    onClick={() => setShowWithdrawModal(true)}
                    disabled={(doctorWallet?.balance || 0) < 50000}
                  >
                    <i className="fas fa-arrow-down"></i> Rút tiền
                  </button>
                  <button
                    type="button"
                    className="btn-refresh-wallet"
                    onClick={() => {
                      fetchDoctorWallet();
                      if (walletSubTab === 'ledger') fetchWalletTransactions();
                      else fetchWithdrawals();
                    }}
                    title="Làm mới số dư và lịch sử"
                  >
                    <i className={`fas fa-sync-alt ${(walletLoading || isWalletTxLoading || isWithdrawalsLoading) ? 'fa-spin' : ''}`}></i>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Subtabs: Ledger vs Withdrawals */}
          <div className="dw-subtabs-nav">
            <button
              type="button"
              className={`dw-subtab-btn ${walletSubTab === 'ledger' ? 'dw-subtab-btn--active' : ''}`}
              onClick={() => setWalletSubTab('ledger')}
            >
              <i className="fas fa-list-alt"></i> Sổ cái biến động số dư (Ledger Audit)
              {walletTxTotal > 0 && <span className="dw-tab-count">{walletTxTotal}</span>}
            </button>
            <button
              type="button"
              className={`dw-subtab-btn ${walletSubTab === 'withdrawals' ? 'dw-subtab-btn--active' : ''}`}
              onClick={() => setWalletSubTab('withdrawals')}
            >
              <i className="fas fa-history"></i> Theo dõi yêu cầu rút tiền (Withdrawals Tracker)
              {withdrawalsTotal > 0 && <span className="dw-tab-count">{withdrawalsTotal}</span>}
            </button>
          </div>

          {/* Subtab 1: Ledger Table */}
          {walletSubTab === 'ledger' && (
            <div className="dw-table-card">
              <div className="dw-table-toolbar">
                <div className="dw-filter-group">
                  <label>Loại giao dịch:</label>
                  <select
                    value={walletTxType}
                    onChange={(e) => {
                      setWalletTxType(e.target.value);
                      setWalletTxPage(1);
                    }}
                    className="dw-select-filter"
                  >
                    <option value="ALL">Tất cả giao dịch</option>
                    <option value="DOCTOR_PAYOUT">Quyết toán thu nhập (Payout)</option>
                    <option value="WITHDRAWAL">Rút tiền (Withdrawal)</option>
                    <option value="REFUND">Hoàn tiền (Refund)</option>
                    <option value="ADJUSTMENT">Điều chỉnh (Adjustment)</option>
                  </select>
                </div>
                <div className="dw-toolbar-info">
                  Hiển thị <strong>{doctorTransactions.length}</strong> / <strong>{walletTxTotal}</strong> bản ghi
                </div>
              </div>

              <div className="dw-table-responsive">
                {isWalletTxLoading ? (
                  <div className="dw-loading-state">
                    <i className="fas fa-spinner fa-spin"></i> Đang tải sổ cái giao dịch...
                  </div>
                ) : doctorTransactions.length === 0 ? (
                  <div className="dw-empty-state">
                    <i className="fas fa-book-open"></i>
                    <h4>Chưa có giao dịch nào trong sổ cái</h4>
                    <p>Mọi biến động nạp, rút tiền hoặc quyết toán thu nhập sẽ được ghi vết bất biến tại đây</p>
                  </div>
                ) : (
                  <table className="dw-data-table">
                    <thead>
                      <tr>
                        <th>Thời gian</th>
                        <th>Mã giao dịch</th>
                        <th>Phân loại</th>
                        <th>Mô tả / Tham chiếu</th>
                        <th className="text-right">Biến động</th>
                        <th className="text-right">Số dư sau GD</th>
                      </tr>
                    </thead>
                    <tbody>
                      {doctorTransactions.map((tx) => {
                        const isCredit = tx.direction === 'CREDIT' || tx.type === 'DOCTOR_PAYOUT' || tx.type === 'TOP_UP';
                        return (
                          <tr key={tx.id}>
                            <td className="dw-cell-date">
                              <span className="dw-date-main">
                                {new Date(tx.createdAt).toLocaleDateString('vi-VN')}
                              </span>
                              <span className="dw-time-sub">
                                {new Date(tx.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </td>
                            <td className="dw-cell-code">
                              <code>{tx.transactionCode || tx.id}</code>
                            </td>
                            <td>
                              <span className={`dw-type-tag dw-type-tag--${(tx.type || '').toLowerCase()}`}>
                                {tx.type === 'DOCTOR_PAYOUT' ? 'Quyết toán' :
                                 tx.type === 'WITHDRAWAL' ? 'Rút tiền' :
                                 tx.type === 'REFUND' ? 'Hoàn phí' :
                                 tx.type === 'ADJUSTMENT' ? 'Điều chỉnh' : tx.type}
                              </span>
                            </td>
                            <td className="dw-cell-desc">
                              <div className="dw-desc-text">{tx.description || 'Giao dịch ví'}</div>
                              {tx.referenceId && (
                                <div className="dw-ref-sub">Tham chiếu: #{tx.referenceId}</div>
                              )}
                            </td>
                            <td className="text-right">
                              <span className={`dw-amount-flow ${isCredit ? 'dw-amount-flow--in' : 'dw-amount-flow--out'}`}>
                                {isCredit ? '+' : '-'}{formatVND(tx.amount)}
                              </span>
                            </td>
                            <td className="text-right dw-cell-balance-after">
                              {formatVND(tx.balanceAfter)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {walletTxTotal > walletTxLimit && (
                <div className="dw-pagination">
                  <button
                    type="button"
                    className="dw-page-btn"
                    disabled={walletTxPage <= 1}
                    onClick={() => setWalletTxPage((p) => Math.max(p - 1, 1))}
                  >
                    <i className="fas fa-chevron-left"></i> Trang trước
                  </button>
                  <span className="dw-page-indicator">
                    Trang {walletTxPage} / {Math.ceil(walletTxTotal / walletTxLimit)}
                  </span>
                  <button
                    type="button"
                    className="dw-page-btn"
                    disabled={walletTxPage >= Math.ceil(walletTxTotal / walletTxLimit)}
                    onClick={() => setWalletTxPage((p) => p + 1)}
                  >
                    Trang sau <i className="fas fa-chevron-right"></i>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Subtab 2: Withdrawals Tracker */}
          {walletSubTab === 'withdrawals' && (
            <div className="dw-table-card">
              <div className="dw-table-toolbar">
                <div className="dw-filter-group">
                  <label>Trạng thái yêu cầu:</label>
                  <select
                    value={withdrawalsStatusFilter}
                    onChange={(e) => {
                      setWithdrawalsStatusFilter(e.target.value);
                      setWithdrawalsPage(1);
                    }}
                    className="dw-select-filter"
                  >
                    <option value="ALL">Tất cả trạng thái</option>
                    <option value="PENDING">Đang chờ xử lý (Pending)</option>
                    <option value="PROCESSING">Đang chuyển khoản (Processing)</option>
                    <option value="UNKNOWN">Cần kiểm tra (Needs Review)</option>
                    <option value="APPROVED">Đã chuyển (Transferred)</option>
                    <option value="REJECTED">Bị từ chối (Rejected)</option>
                    <option value="CANCELLED">Đã hủy (Cancelled)</option>
                  </select>
                </div>
                <button
                  type="button"
                  className="dw-btn-mini-withdraw"
                  onClick={() => setShowWithdrawModal(true)}
                  disabled={(doctorWallet?.balance || 0) < 50000}
                >
                  <i className="fas fa-plus"></i> Tạo yêu cầu rút tiền
                </button>
              </div>

              <div className="dw-table-responsive">
                {isWithdrawalsLoading ? (
                  <div className="dw-loading-state">
                    <i className="fas fa-spinner fa-spin"></i> Đang tải danh sách rút tiền...
                  </div>
                ) : doctorWithdrawals.length === 0 ? (
                  <div className="dw-empty-state">
                    <i className="fas fa-hand-holding-usd"></i>
                    <h4>Chưa có yêu cầu rút tiền nào</h4>
                    <p>Bác sĩ có thể rút tiền về tài khoản ngân hàng bất kỳ lúc nào khi số dư khả dụng từ 50.000 ₫</p>
                  </div>
                ) : (
                  <table className="dw-data-table">
                    <thead>
                      <tr>
                        <th>Mã yêu cầu</th>
                        <th>Ngày tạo</th>
                        <th className="text-right">Số tiền rút</th>
                        <th>Tài khoản nhận</th>
                        <th>Cam kết SLA</th>
                        <th>Trạng thái</th>
                        <th>Mã GD / Chứng từ</th>
                        <th className="text-center">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {doctorWithdrawals.map((req) => {
                        const statusClass = (req.status || '').toLowerCase();
                        return (
                          <tr key={req.id}>
                            <td className="dw-cell-code">
                              <code>{req.requestCode || `#WDR-${req.id}`}</code>
                            </td>
                            <td className="dw-cell-date">
                              <span className="dw-date-main">
                                {new Date(req.createdAt).toLocaleDateString('vi-VN')}
                              </span>
                              <span className="dw-time-sub">
                                {new Date(req.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </td>
                            <td className="text-right">
                              <span className="dw-amount-flow dw-amount-flow--out font-bold">
                                {formatVND(req.amount)}
                              </span>
                            </td>
                            <td>
                              <div className="dw-bank-line-main font-semibold">
                                {req.bankName} - {req.accountNumber}
                              </div>
                              <div className="dw-bank-line-sub">{req.accountHolderName}</div>
                            </td>
                            <td>
                              <span className="dw-sla-chip">
                                <i className="fas fa-clock"></i>{' '}
                                {req.promisedTransferDate
                                  ? new Date(req.promisedTransferDate).toLocaleDateString('vi-VN')
                                  : '1 ngày LV'}
                              </span>
                            </td>
                            <td>
                              <span className={`dw-status-badge dw-status-badge--${statusClass}`}>
                                {req.status === 'PENDING' ? 'Đang chờ xử lý' :
                                 req.status === 'PROCESSING' ? 'Đang chuyển khoản' :
                                 req.status === 'UNKNOWN' ? 'Cần kiểm tra' :
                                 (req.status === 'APPROVED' || req.status === 'COMPLETED') ? 'Đã chuyển' :
                                 req.status === 'REJECTED' ? 'Bị từ chối' :
                                 req.status === 'CANCELLED' ? 'Đã hủy' : req.status}
                              </span>
                              {req.rejectReason && (
                                <div className="dw-reject-reason" title={req.rejectReason}>
                                  Lý do: {req.rejectReason}
                                </div>
                              )}
                            </td>
                            <td>
                              {req.bankTransactionCode ? (
                                <div className="dw-bank-ref">
                                  <code>{req.bankTransactionCode}</code>
                                </div>
                              ) : (
                                <span className="dw-ref-sub">Đang xử lý</span>
                              )}
                            </td>
                            <td className="text-center">
                              {req.status === 'PENDING' ? (
                                <button
                                  type="button"
                                  className="dw-btn-cancel-req"
                                  onClick={() => handleCancelWithdrawal(req.id)}
                                  title="Hủy yêu cầu và hoàn lại tiền khả dụng"
                                >
                                  <i className="fas fa-times"></i> Hủy
                                </button>
                              ) : (
                                <span className="dw-no-action">---</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {withdrawalsTotal > withdrawalsLimit && (
                <div className="dw-pagination">
                  <button
                    type="button"
                    className="dw-page-btn"
                    disabled={withdrawalsPage <= 1}
                    onClick={() => setWithdrawalsPage((p) => Math.max(p - 1, 1))}
                  >
                    <i className="fas fa-chevron-left"></i> Trang trước
                  </button>
                  <span className="dw-page-indicator">
                    Trang {withdrawalsPage} / {Math.ceil(withdrawalsTotal / withdrawalsLimit)}
                  </span>
                  <button
                    type="button"
                    className="dw-page-btn"
                    disabled={withdrawalsPage >= Math.ceil(withdrawalsTotal / withdrawalsLimit)}
                    onClick={() => setWithdrawalsPage((p) => p + 1)}
                  >
                    Trang sau <i className="fas fa-chevron-right"></i>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 4: BẢNG KÊ THÙ LAO TỪNG CA KHÁM (Doctor Itemized Statement) ── */}
      {activeMainTab === 'settlements' && (
        <div className="settlements-tab-content tw-space-y-6 tw-mt-6">
          {/* KPI 3 Trạng thái Tiền Bác sĩ */}
          <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-4 tw-gap-4">
            <div className="tw-bg-white tw-p-5 tw-rounded-2xl tw-border tw-border-amber-200 tw-shadow-sm">
              <span className="tw-text-xs tw-font-bold tw-text-amber-700 tw-uppercase">
                1. Tạm tính (Giữ T+24h)
              </span>
              <div className="tw-text-2xl tw-font-black tw-text-amber-700 tw-mt-1">
                {formatVND(settlementSummary?.earnedAmount)}
              </div>
              <div className="tw-text-xs tw-text-amber-600 tw-mt-1">
                {settlementSummary?.earnedCount || 0} ca vừa khám xong, giữ 24h đối soát
              </div>
            </div>

            <div className="tw-bg-white tw-p-5 tw-rounded-2xl tw-border tw-border-emerald-200 tw-shadow-sm">
              <span className="tw-text-xs tw-font-bold tw-text-emerald-700 tw-uppercase">
                2. Khả dụng (Chờ chuyển ví)
              </span>
              <div className="tw-text-2xl tw-font-black tw-text-emerald-700 tw-mt-1">
                {formatVND(settlementSummary?.availableAmount)}
              </div>
              <div className="tw-text-xs tw-text-emerald-600 tw-mt-1">
                {settlementSummary?.availableCount || 0} ca đã qua 24h, đủ điều kiện trả ví
              </div>
            </div>

            <div className="tw-bg-white tw-p-5 tw-rounded-2xl tw-border tw-border-indigo-200 tw-shadow-sm">
              <span className="tw-text-xs tw-font-bold tw-text-indigo-700 tw-uppercase">
                3. Đã chi trả vào Ví
              </span>
              <div className="tw-text-2xl tw-font-black tw-text-indigo-700 tw-mt-1">
                {formatVND(settlementSummary?.paidAmount)}
              </div>
              <div className="tw-text-xs tw-text-indigo-600 tw-mt-1">
                {settlementSummary?.paidCount || 0} ca đã kết chuyển vào ví bác sĩ
              </div>
            </div>

            <div className="tw-bg-white tw-p-5 tw-rounded-2xl tw-border tw-border-slate-200 tw-shadow-sm">
              <span className="tw-text-xs tw-font-bold tw-text-slate-500 tw-uppercase">
                Chiết khấu sàn
              </span>
              <div className="tw-text-2xl tw-font-black tw-text-slate-800 tw-mt-1">
                {formatVND(settlementSummary?.totalPlatformFee)}
              </div>
              <div className="tw-text-xs tw-text-slate-500 tw-mt-1">
                Phí sàn thu theo chính sách đóng băng lúc đặt
              </div>
            </div>
          </div>

          {/* Bảng chi tiết */}
          <div className="tw-bg-white tw-rounded-2xl tw-border tw-border-slate-200 tw-shadow-sm tw-overflow-hidden">
            <div className="tw-p-4 tw-border-b tw-border-slate-200 tw-flex tw-justify-between tw-items-center">
              <div className="tw-flex tw-items-center tw-gap-3">
                <span className="tw-font-bold tw-text-sm tw-text-slate-800">
                  Danh sách ca khám & thù lao chi tiết:
                </span>
                <select
                  value={settlementStatus}
                  onChange={(e) => {
                    setSettlementStatus(e.target.value);
                    setSettlementPage(1);
                  }}
                  className="tw-px-3 tw-py-1.5 tw-text-xs tw-border tw-border-slate-200 tw-rounded-lg tw-bg-white"
                >
                  <option value="ALL">Tất cả trạng thái</option>
                  <option value="AVAILABLE">Khả dụng (Chờ chi)</option>
                  <option value="EARNED">Tạm tính (Giữ T+24h)</option>
                  <option value="PAID">Đã chi trả</option>
                  <option value="HELD">Tạm giữ</option>
                </select>
              </div>

              <button
                type="button"
                className="tw-px-3 tw-py-1.5 tw-text-xs tw-font-semibold tw-text-indigo-600 hover:tw-bg-indigo-50 tw-rounded-lg tw-border tw-border-indigo-200 tw-bg-transparent tw-cursor-pointer"
                onClick={fetchSettlementStatement}
                disabled={isSettlementsLoading}
              >
                <i className={`fas fa-sync-alt ${isSettlementsLoading ? 'fa-spin' : ''}`}></i> Làm mới
              </button>
            </div>

            <div className="tw-overflow-x-auto">
              <table className="tw-w-full tw-text-left tw-border-collapse">
                <thead>
                  <tr className="tw-bg-slate-50 tw-border-b tw-border-slate-200 tw-text-slate-600 tw-text-xs tw-uppercase tw-font-bold">
                    <th className="tw-p-3.5">Mã Ca Khám</th>
                    <th className="tw-p-3.5">Ngày Khám & Hoàn Tất</th>
                    <th className="tw-p-3.5 tw-text-right">Doanh Thu Gốc</th>
                    <th className="tw-p-3.5 tw-text-center">Chiết Khấu Sàn</th>
                    <th className="tw-p-3.5 tw-text-right">Thù Lao Thực Nhận</th>
                    <th className="tw-p-3.5 tw-text-center">Trạng Thái Tiền</th>
                    <th className="tw-p-3.5 tw-text-right">Thời Gian Mở Khóa / Chi Trả</th>
                  </tr>
                </thead>
                <tbody className="tw-divide-y tw-divide-slate-100 tw-text-sm">
                  {isSettlementsLoading ? (
                    <tr>
                      <td colSpan="7" className="tw-p-6 tw-text-center tw-text-slate-400">
                        <i className="fas fa-spinner fa-spin tw-mr-2"></i> Đang tải bảng kê...
                      </td>
                    </tr>
                  ) : settlementItems.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="tw-p-6 tw-text-center tw-text-slate-400">
                        Chưa có dữ liệu quyết toán ca khám nào.
                      </td>
                    </tr>
                  ) : (
                    settlementItems.map((item) => {
                      const isEarned = item.status === 'EARNED';
                      const isAvail = item.status === 'AVAILABLE';
                      const isPaid = item.status === 'PAID';

                      let countdown = null;
                      if (isEarned && item.availableAt) {
                        const diff = new Date(item.availableAt).getTime() - Date.now();
                        if (diff > 0) {
                          const h = Math.ceil(diff / (1000 * 3600));
                          countdown = `Mở sau ~${h}h`;
                        } else {
                          countdown = 'Đủ điều kiện mở';
                        }
                      }

                      return (
                        <tr key={item.id} className="hover:tw-bg-slate-50/70 tw-transition">
                          <td className="tw-p-3.5">
                            <span className="tw-font-mono tw-font-bold tw-text-indigo-600">
                              #{item.bookingId}
                            </span>
                            <div className="tw-text-2xs tw-text-slate-400">
                              ID: #SETTLE-{item.id}
                            </div>
                          </td>

                          <td className="tw-p-3.5">
                            <div className="tw-text-xs tw-font-semibold tw-text-slate-800">
                              {item.appointmentDate ? new Date(item.appointmentDate).toLocaleDateString('vi-VN') : '—'}
                            </div>
                            <div className="tw-text-2xs tw-text-slate-400">
                              Xong: {item.earnedAt ? new Date(item.earnedAt).toLocaleDateString('vi-VN') : '—'}
                            </div>
                          </td>

                          <td className="tw-p-3.5 tw-text-right tw-font-medium tw-text-slate-700">
                            {formatVND(item.grossAmount)}
                          </td>

                          <td className="tw-p-3.5 tw-text-center">
                            <span className="tw-font-bold tw-text-xs tw-text-slate-700">
                              {item.platformFeeRate}%
                            </span>
                            <div className="tw-text-2xs tw-text-slate-400">
                              -{formatVND(item.platformFee)}
                            </div>
                          </td>

                          <td className="tw-p-3.5 tw-text-right">
                            <div className="tw-font-black tw-text-emerald-700 tw-text-base">
                              {formatVND(item.netAmount)}
                            </div>
                          </td>

                          <td className="tw-p-3.5 tw-text-center">
                            {isEarned && (
                              <span className="tw-inline-block tw-px-2.5 tw-py-1 tw-rounded-full tw-text-xs tw-font-bold tw-bg-amber-50 tw-text-amber-700 tw-border tw-border-amber-200">
                                🟡 Giữ T+24h
                              </span>
                            )}
                            {isAvail && (
                              <span className="tw-inline-block tw-px-2.5 tw-py-1 tw-rounded-full tw-text-xs tw-font-bold tw-bg-emerald-50 tw-text-emerald-700 tw-border tw-border-emerald-200">
                                🟢 Khả dụng
                              </span>
                            )}
                            {isPaid && (
                              <span className="tw-inline-block tw-px-2.5 tw-py-1 tw-rounded-full tw-text-xs tw-font-bold tw-bg-blue-50 tw-text-blue-700 tw-border tw-border-blue-200">
                                🔵 Đã trả vào ví
                              </span>
                            )}
                            {!isEarned && !isAvail && !isPaid && (
                              <span className="tw-inline-block tw-px-2.5 tw-py-1 tw-rounded-full tw-text-xs tw-font-bold tw-bg-slate-100 tw-text-slate-600">
                                {item.status}
                              </span>
                            )}
                          </td>

                          <td className="tw-p-3.5 tw-text-right">
                            {isEarned && countdown && (
                              <span className="tw-text-xs tw-font-semibold tw-text-amber-600">
                                {countdown}
                              </span>
                            )}
                            {isAvail && (
                              <span className="tw-text-xs tw-font-semibold tw-text-emerald-600">
                                Sẵn sàng thanh toán
                              </span>
                            )}
                            {isPaid && item.paidAt && (
                              <span className="tw-text-xs tw-text-slate-500">
                                {new Date(item.paidAt).toLocaleDateString('vi-VN')}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {Math.ceil(settlementTotal / settlementLimit) > 1 && (
              <div className="tw-p-4 tw-border-t tw-border-slate-200 tw-flex tw-justify-between tw-items-center">
                <span className="tw-text-xs tw-text-slate-500">
                  Hiển thị {settlementItems.length} / {settlementTotal} ca khám
                </span>
                <div className="tw-flex tw-gap-1">
                  <button
                    type="button"
                    className="tw-px-3 tw-py-1.5 tw-text-xs tw-font-semibold tw-border tw-border-slate-200 tw-rounded-lg tw-bg-white hover:tw-bg-slate-50 disabled:tw-opacity-50"
                    disabled={settlementPage <= 1}
                    onClick={() => setSettlementPage((p) => p - 1)}
                  >
                    Trước
                  </button>
                  <button
                    type="button"
                    className="tw-px-3 tw-py-1.5 tw-text-xs tw-font-semibold tw-border tw-border-slate-200 tw-rounded-lg tw-bg-white hover:tw-bg-slate-50 disabled:tw-opacity-50"
                    disabled={settlementPage >= Math.ceil(settlementTotal / settlementLimit)}
                    onClick={() => setSettlementPage((p) => p + 1)}
                  >
                    Sau
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 7. SLIDE-OVER DETAIL DRAWER (Bóc tách chi tiết dòng tiền & Snapshot) ── */}
      {selectedTransaction && (
        <div className="drawer-overlay" onClick={() => setSelectedTransaction(null)}>
          <div
            className="drawer-panel"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="drawer-header">
              <div className="drawer-header-left">
                <div className="drawer-code-title">
                  <h3>{selectedTransaction.bookingCode}</h3>
                  <span className="booking-status-tag">
                    {selectedTransaction.statusText}
                  </span>
                </div>
                <div className="drawer-badges-row">
                  <span className="drawer-flow-tag">
                    BN → App: {renderPatientBadge(selectedTransaction.patientPaymentStatus)}
                  </span>
                  <span className="drawer-flow-tag">
                    App → BS: {renderPayoutBadge(selectedTransaction.appPayoutStatus)}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="btn-close-drawer"
                onClick={() => setSelectedTransaction(null)}
                title="Đóng chi tiết"
              >
                ×
              </button>
            </div>

            {/* Drawer Body */}
            <div className="drawer-body">
              {/* Section: Thông tin phiên khám */}
              <div className="drawer-section">
                <h5 className="section-title">
                  <i className="fas fa-info-circle"></i> Thông tin phiên khám
                </h5>
                <div className="info-grid">
                  <div className="info-row">
                    <span className="info-label">Thời gian khám:</span>
                    <span className="info-val">
                      {selectedTransaction.date} · {selectedTransaction.timeTypeText}
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Bệnh nhân:</span>
                    <span className="info-val font-semibold">
                      {selectedTransaction.patientName}
                    </span>
                  </div>
                  {selectedTransaction.patientPhoneNumber && (
                    <div className="info-row">
                      <span className="info-label">Số điện thoại:</span>
                      <span className="info-val">
                        {selectedTransaction.patientPhoneNumber}
                      </span>
                    </div>
                  )}
                  {selectedTransaction.patientAddress && (
                    <div className="info-row">
                      <span className="info-label">Địa chỉ:</span>
                      <span className="info-val">
                        {selectedTransaction.patientAddress}
                      </span>
                    </div>
                  )}
                  <div className="info-row">
                    <span className="info-label">Cơ sở khám:</span>
                    <span className="info-val">
                      {selectedTransaction.facility?.name}
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Dịch vụ:</span>
                    <span className="info-val">
                      {selectedTransaction.serviceName}
                    </span>
                  </div>
                </div>
              </div>

              {/* Section: BÓC TÁCH CHI TIẾT THANH TOÁN (Breakdown) */}
              <div className="drawer-section drawer-section--finance">
                <h5 className="section-title">
                  <i className="fas fa-calculator"></i> Bóc tách tài chính
                </h5>
                <div className="finance-breakdown-box">
                  <div className="breakdown-row">
                    <span className="row-label">Giá dịch vụ niêm yết:</span>
                    <span className="row-val">{formatVND(selectedTransaction.grossPrice)}</span>
                  </div>

                  <div className="breakdown-row breakdown-row--sub">
                    <span className="row-label">
                      Phần nền tảng thu (Platform fee):
                    </span>
                    <span className="row-val text-danger">
                      - {formatVND(selectedTransaction.platformFee)}
                    </span>
                  </div>

                  {selectedTransaction.clinicShare > 0 && (
                    <div className="breakdown-row breakdown-row--sub">
                      <span className="row-label">Phần cơ sở y tế nhận:</span>
                      <span className="row-val text-muted">
                        - {formatVND(selectedTransaction.clinicShare)}
                      </span>
                    </div>
                  )}

                  <div className="breakdown-divider"></div>

                  <div className="breakdown-row breakdown-row--net">
                    <span className="row-label font-bold">
                      Thu nhập bác sĩ thực nhận:
                    </span>
                    <span className="row-val font-bold text-success text-xl">
                      {formatVND(selectedTransaction.doctorShare)}
                    </span>
                  </div>
                </div>

                {/* Hoàn tiền nếu hủy */}
                {selectedTransaction.isRefunded && (
                  <div className="refund-alert-box">
                    <div className="refund-alert-header">
                      <i className="fas fa-exclamation-triangle"></i>
                      <span>Phiên khám đã hủy & áp dụng chính sách hoàn tiền</span>
                    </div>
                    <div className="refund-alert-details">
                      <div>Hoàn tiền bệnh nhân: <strong>{formatVND(selectedTransaction.refundAmount)}</strong></div>
                      <div>Thu nhập bác sĩ: <strong>0 ₫</strong></div>
                      {selectedTransaction.refundStatus && (
                        <div>Trạng thái hoàn: {selectedTransaction.refundStatus}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Section: DÒNG TIỀN & LỊCH SỬ THANH TOÁN (Cash Flow Timeline) */}
              <div className="drawer-section">
                <h5 className="section-title">
                  <i className="fas fa-stream"></i> Dòng tiền thanh toán
                </h5>
                <div className="cashflow-timeline">
                  {/* Chặng 1: BN -> App */}
                  <div className="timeline-step">
                    <div
                      className={`timeline-icon ${
                        selectedTransaction.patientPaymentStatus === 'paid'
                          ? 'timeline-icon--success'
                          : selectedTransaction.isRefunded
                          ? 'timeline-icon--refund'
                          : 'timeline-icon--pending'
                      }`}
                    >
                      <i className="fas fa-user-check"></i>
                    </div>
                    <div className="timeline-content">
                      <span className="timeline-title">Bệnh nhân thanh toán</span>
                      <span className="timeline-desc">
                        {selectedTransaction.patientPaymentStatus === 'paid' ? (
                          <>
                            ✓ Đã thanh toán thành công {formatVND(selectedTransaction.grossPrice)}
                            {selectedTransaction.vnpayTransactionNo && (
                              <div className="timeline-meta">
                                VNPay Ref: {selectedTransaction.vnpayTransactionNo}
                              </div>
                            )}
                          </>
                        ) : selectedTransaction.isRefunded ? (
                          <>Đã thực hiện hoàn tiền cho bệnh nhân</>
                        ) : (
                          <>Đang chờ bệnh nhân thanh toán</>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Chặng 2: Phiên khám */}
                  <div className="timeline-step">
                    <div
                      className={`timeline-icon ${
                        selectedTransaction.statusId === 'S3'
                          ? 'timeline-icon--success'
                          : 'timeline-icon--info'
                      }`}
                    >
                      <i className="fas fa-notes-medical"></i>
                    </div>
                    <div className="timeline-content">
                      <span className="timeline-title">Khám bệnh</span>
                      <span className="timeline-desc">
                        Trạng thái: {selectedTransaction.statusText}
                      </span>
                    </div>
                  </div>

                  {/* Chặng 3: App -> BS */}
                  <div className="timeline-step">
                    <div
                      className={`timeline-icon ${
                        selectedTransaction.appPayoutStatus === 'paid'
                          ? 'timeline-icon--success'
                          : selectedTransaction.appPayoutStatus === 'pending'
                          ? 'timeline-icon--pending'
                          : 'timeline-icon--neutral'
                      }`}
                    >
                      <i className="fas fa-university"></i>
                    </div>
                    <div className="timeline-content">
                      <span className="timeline-title">Nền tảng chi trả (App → Bác sĩ)</span>
                      <span className="timeline-desc">
                        {selectedTransaction.appPayoutStatus === 'paid' ? (
                          <>
                            ✓ Đã thanh toán thành công <strong>{formatVND(selectedTransaction.doctorShare)}</strong>
                            {selectedTransaction.settlement && (
                              <div className="timeline-payout-box">
                                <div>Mã đợt: <strong>{selectedTransaction.settlement.code}</strong></div>
                                <div>Mã GD ngân hàng: <strong>{selectedTransaction.settlement.transactionRef}</strong></div>
                                <div>
                                  Ngày chuyển:{' '}
                                  {selectedTransaction.settlement.paidAt
                                    ? new Date(selectedTransaction.settlement.paidAt).toLocaleDateString('vi-VN')
                                    : '---'}
                                </div>
                              </div>
                            )}
                          </>
                        ) : selectedTransaction.appPayoutStatus === 'pending' ? (
                          <>
                            ⏳ Thu nhập đã ghi nhận ({formatVND(selectedTransaction.doctorShare)}), đang chờ kết chuyển trong kỳ đối soát kế tiếp.
                          </>
                        ) : (
                          <>Chưa phát sinh điều kiện thanh toán</>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section: CHÍNH SÁCH ÁP DỤNG (Frozen Policy Snapshot) */}
              <div className="drawer-section">
                <div className="section-title-between">
                  <h5 className="section-title">
                    <i className="fas fa-lock"></i> Chính sách áp dụng (Đóng băng lúc đặt)
                  </h5>
                  <button
                    type="button"
                    className="btn-toggle-json"
                    onClick={() => setShowJsonSnapshot(!showJsonSnapshot)}
                  >
                    {showJsonSnapshot ? 'Ẩn chi tiết' : 'Xem JSON Snapshot'}
                  </button>
                </div>

                <div className="policy-info-box">
                  <div className="policy-name-row">
                    <span className="badge-immutable">Bất biến</span>
                    <strong className="policy-name">
                      {selectedTransaction.policySnapshot?.revenuePolicy?.name ||
                        'Chính sách phân bổ doanh thu tiêu chuẩn'}
                    </strong>
                    {selectedTransaction.policySnapshot?.revenuePolicy?.version && (
                      <span className="version-pill">
                        v{selectedTransaction.policySnapshot.revenuePolicy.version}
                      </span>
                    )}
                  </div>

                  <div className="policy-rate-split">
                    <div className="rate-item">
                      <span className="rate-label">Bác sĩ</span>
                      <span className="rate-val text-success">
                        {selectedTransaction.policySnapshot?.revenuePolicy?.rules?.doctorSharePercent || 85}%
                      </span>
                    </div>
                    <div className="rate-item">
                      <span className="rate-label">Nền tảng</span>
                      <span className="rate-val text-info">
                        {selectedTransaction.policySnapshot?.revenuePolicy?.rules?.platformFeePercent || 15}%
                      </span>
                    </div>
                    <div className="rate-item">
                      <span className="rate-label">Cơ sở</span>
                      <span className="rate-val text-muted">
                        {selectedTransaction.policySnapshot?.revenuePolicy?.rules?.clinicSharePercent || 0}%
                      </span>
                    </div>
                  </div>

                  {selectedTransaction.policySnapshot?.revenuePolicy?.rules?.note && (
                    <div className="policy-note">
                      <i className="fas fa-comment-dots"></i> {selectedTransaction.policySnapshot.revenuePolicy.rules.note}
                    </div>
                  )}

                  {showJsonSnapshot && (
                    <div className="raw-json-container">
                      <pre>
                        {JSON.stringify(
                          selectedTransaction.policySnapshot || { message: 'Chưa có snapshot JSON lưu trữ' },
                          null,
                          2
                        )}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="drawer-footer">
              <button
                type="button"
                className="btn-drawer-close"
                onClick={() => setSelectedTransaction(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 8. MODAL XEM PHIÊN KHÁM CỦA ĐỢT QUYẾT TOÁN (SETTLEMENT MODAL) ── */}
      {selectedSettlement && (
        <div className="modal-overlay" onClick={() => setSelectedSettlement(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Đợt thanh toán {selectedSettlement.code}</h3>
                <p className="modal-subtitle">
                  Mã giao dịch: <strong>{selectedSettlement.transactionRef}</strong> · Thực nhận:{' '}
                  <strong>{formatVND(selectedSettlement.netPayout)}</strong>
                </p>
              </div>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setSelectedSettlement(null)}
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <h5 className="list-title">Danh sách phiên khám được đối soát trong đợt:</h5>
              {selectedSettlement.bookings?.length === 0 ? (
                <div className="empty-sub-list">
                  Không tìm thấy phiên khám cụ thể trong đợt này.
                </div>
              ) : (
                <div className="sub-table-wrap">
                  <table className="sub-table">
                    <thead>
                      <tr>
                        <th>Mã khám</th>
                        <th>Bệnh nhân</th>
                        <th>Ngày khám</th>
                        <th className="text-right">Giá DV</th>
                        <th className="text-right">Thu nhập BS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSettlement.bookings.map((cb, idx) => (
                        <tr key={idx}>
                          <td><strong>{cb.bookingCode}</strong></td>
                          <td>{cb.patientName}</td>
                          <td>{cb.date}</td>
                          <td className="text-right">{formatVND(cb.grossPrice)}</td>
                          <td className="text-right text-success font-bold">
                            {formatVND(cb.doctorShare)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-primary"
                onClick={() => setSelectedSettlement(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 9. MODAL RÚT TIỀN TỪ VÍ BÁC SĨ (WITHDRAW MODAL) ── */}
      {showWithdrawModal && (
        <div className="dw-modal-backdrop" onClick={() => setShowWithdrawModal(false)}>
          <div className="dw-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="dw-modal-header">
              <div className="dw-modal-header-title">
                <i className="fas fa-university"></i>
                <h3>Yêu cầu rút tiền từ Ví Bác sĩ</h3>
              </div>
              <button
                type="button"
                className="dw-btn-modal-close"
                onClick={() => setShowWithdrawModal(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleWithdrawSubmit} className="dw-modal-form">
              <div className="dw-modal-body">
                {/* Available Balance Callout */}
                <div className="dw-available-banner">
                  <div className="dw-available-info">
                    <span className="dw-avail-label">Số dư khả dụng hiện tại:</span>
                    <strong className="dw-avail-amount">{formatVND(doctorWallet?.balance || 0)}</strong>
                  </div>
                  <span className="dw-min-notice">Tối thiểu: 50.000 ₫ · Miễn phí rút</span>
                </div>

                {/* Amount input */}
                <div className="dw-form-group">
                  <label className="dw-form-label">
                    Số tiền cần rút (VNĐ) <span className="text-danger">*</span>
                  </label>
                  <div className="dw-input-money-wrap">
                    <input
                      type="text"
                      className="dw-money-input"
                      value={withdrawAmountStr}
                      onChange={handleAmountChange}
                      placeholder="Nhập số tiền..."
                      required
                    />
                    <span className="dw-money-suffix">₫</span>
                  </div>

                  {/* Presets */}
                  <div className="dw-preset-pills">
                    {[100000, 500000, 2000000, 5000000].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        className="dw-preset-btn"
                        onClick={() => handleSelectPreset(preset)}
                      >
                        {formatVND(preset)}
                      </button>
                    ))}
                    <button
                      key="all"
                      type="button"
                      className="dw-preset-btn dw-preset-btn--highlight"
                      onClick={() => handleSelectPreset('ALL')}
                    >
                      Tất cả ({formatVND(doctorWallet?.balance || 0)})
                    </button>
                  </div>
                </div>

                {/* Bank Information */}
                <div className="dw-form-section-title">
                  <i className="fas fa-credit-card"></i> Thông tin tài khoản thụ hưởng
                </div>

                <div className="dw-form-grid">
                  <div className="dw-form-group">
                    <label className="dw-form-label">
                      Ngân hàng <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="dw-form-input"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="VD: Vietcombank, Techcombank, MB Bank..."
                      required
                    />
                  </div>
                  <div className="dw-form-group">
                    <label className="dw-form-label">
                      Số tài khoản <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="dw-form-input font-mono"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder="Số tài khoản ngân hàng"
                      required
                    />
                  </div>
                </div>

                <div className="dw-form-group">
                  <label className="dw-form-label">
                    Tên chủ tài khoản (In hoa không dấu) <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className="dw-form-input font-bold"
                    value={accountHolderName}
                    onChange={(e) => setAccountHolderName(e.target.value.toUpperCase())}
                    placeholder="VD: NGUYEN VAN A"
                    required
                  />
                </div>

                <div className="dw-form-group">
                  <label className="dw-form-label">Ghi chú (Tùy chọn)</label>
                  <input
                    type="text"
                    className="dw-form-input"
                    value={userNote}
                    onChange={(e) => setUserNote(e.target.value)}
                    placeholder="Ghi chú thêm nếu cần..."
                  />
                </div>

                {/* SLA Guarantee Note */}
                <div className="dw-sla-callout">
                  <i className="fas fa-shield-alt"></i>
                  <div>
                    <strong>Cam kết SLA:</strong> Tiền sẽ được đối soát và chuyển vào tài khoản trong vòng{' '}
                    <strong>1 ngày làm việc</strong> theo chính sách thanh khoản của hệ thống.
                  </div>
                </div>
              </div>

              <div className="dw-modal-footer">
                <button
                  type="button"
                  className="dw-btn-secondary"
                  onClick={() => setShowWithdrawModal(false)}
                  disabled={isSubmittingWithdraw}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="dw-btn-primary"
                  disabled={isSubmittingWithdraw || withdrawAmount < 50000 || withdrawAmount > (doctorWallet?.balance || 0)}
                >
                  {isSubmittingWithdraw ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i> Đang gửi yêu cầu...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-paper-plane"></i> Xác nhận rút {formatVND(withdrawAmount)}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorRevenue;
