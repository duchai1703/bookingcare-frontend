// src/containers/PatientPortal/PatientWallet.jsx
// [Financial Wallet & Ledger] Giao diện Quản lý Ví BookingCare & Sổ cái bất biến (Phase 1, 2 & 3)
import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import moment from 'moment';
import {
  getMyWallet,
  createDepositPaymentUrl,
  getMyWalletTransactions,
  verifyVNPayDepositReturn,
  requestWithdrawal,
  getMyWithdrawalRequests,
  cancelMyWithdrawalRequest,
} from '../../services/walletService';
import { getPatientBankAccounts } from '../../services/patientService';
import './PatientWallet.scss';

const PRESET_AMOUNTS = [100000, 200000, 500000, 1000000, 2000000, 5000000];

const BANK_OPTIONS = [
  { code: '', name: 'Cổng thanh toán VNPay (Tất cả ngân hàng / QR)' },
  { code: 'NCB', name: 'Ngân hàng NCB (Hỗ trợ thẻ test Sandbox)' },
  { code: 'VCB', name: 'Ngân hàng Vietcombank' },
  { code: 'VIETINBANK', name: 'Ngân hàng VietinBank' },
  { code: 'BIDV', name: 'Ngân hàng BIDV' },
  { code: 'MBBANK', name: 'Ngân hàng MB Bank' },
];

const PatientWallet = () => {
  const { userInfo } = useSelector((state) => state.user);
  const [searchParams, setSearchParams] = useSearchParams();

  // Navigation tab: 'ledger' | 'withdrawals'
  const [activeSubTab, setActiveSubTab] = useState('ledger');

  // State Ví & Sổ cái
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [totalTx, setTotalTx] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [filterType, setFilterType] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [isTxLoading, setIsTxLoading] = useState(false);

  // State Modal Nạp tiền
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState(200000);
  const [customAmountStr, setCustomAmountStr] = useState('200,000');
  const [selectedBank, setSelectedBank] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State Banner thông báo kết quả trả về từ VNPay
  const [returnNotice, setReturnNotice] = useState(null);

  // [PHASE 3] State Rút tiền & Lịch sử Yêu cầu Rút tiền
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState(50000);
  const [withdrawAmountStr, setWithdrawAmountStr] = useState('50,000');
  const [patientBankAccounts, setPatientBankAccounts] = useState([]);
  const [selectedBankAccountId, setSelectedBankAccountId] = useState('');
  const [userWithdrawNote, setUserWithdrawNote] = useState('');
  const [isWithdrawSubmitting, setIsWithdrawSubmitting] = useState(false);

  const [withdrawRequests, setWithdrawRequests] = useState([]);
  const [withdrawTotal, setWithdrawTotal] = useState(0);
  const [withdrawPage, setWithdrawPage] = useState(1);
  const [withdrawLimit] = useState(10);
  const [withdrawStatusFilter, setWithdrawStatusFilter] = useState('ALL');
  const [isWithdrawLoading, setIsWithdrawLoading] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);

  // Format tiền tệ VND
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(Number(amount) || 0);
  };

  // 1. Tải thông tin ví
  const fetchWallet = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await getMyWallet();
      if (res && res.errCode === 0) {
        setWallet(res.data);
      } else {
        toast.error(res?.errMessage || 'Không thể tải thông tin ví.');
      }
    } catch (err) {
      console.error('Fetch wallet error:', err);
      toast.error('Lỗi khi kết nối hệ thống ví.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 2. Tải lịch sử giao dịch (Sổ cái)
  const fetchTransactions = useCallback(async (targetPage = 1, type = filterType) => {
    try {
      setIsTxLoading(true);
      const params = {
        page: targetPage,
        limit,
        type: type === 'ALL' ? undefined : type,
      };
      const res = await getMyWalletTransactions(params);
      if (res && res.errCode === 0) {
        setTransactions(res.data.transactions || []);
        setTotalTx(res.data.total || 0);
        setPage(res.data.page || targetPage);
      }
    } catch (err) {
      console.error('Fetch transactions error:', err);
    } finally {
      setIsTxLoading(false);
    }
  }, [filterType, limit]);

  // 3. [PHASE 3] Tải lịch sử yêu cầu rút tiền
  const fetchWithdrawals = useCallback(async (targetPage = 1, status = withdrawStatusFilter) => {
    try {
      setIsWithdrawLoading(true);
      const params = {
        page: targetPage,
        limit: withdrawLimit,
        status: status === 'ALL' ? undefined : status,
      };
      const res = await getMyWithdrawalRequests(params);
      if (res && res.errCode === 0) {
        setWithdrawRequests(res.data.requests || []);
        setWithdrawTotal(res.data.total || 0);
        setWithdrawPage(res.data.page || targetPage);
      }
    } catch (err) {
      console.error('Fetch withdrawals error:', err);
    } finally {
      setIsWithdrawLoading(false);
    }
  }, [withdrawLimit, withdrawStatusFilter]);

  // 4. [PHASE 3] Tải danh sách tài khoản ngân hàng chính chủ của bệnh nhân
  const fetchBankAccounts = useCallback(async () => {
    try {
      const res = await getPatientBankAccounts();
      if (res && res.errCode === 0) {
        const accounts = res.data || [];
        setPatientBankAccounts(accounts);
        const primary = accounts.find((a) => a.isPrimary) || accounts[0];
        if (primary) {
          setSelectedBankAccountId(primary.id);
        }
      }
    } catch (err) {
      console.error('Fetch bank accounts error:', err);
    }
  }, []);

  // Khởi động
  useEffect(() => {
    fetchWallet();
    fetchTransactions(1, filterType);
    fetchWithdrawals(1, withdrawStatusFilter);
    fetchBankAccounts();
  }, [fetchWallet, fetchTransactions, fetchWithdrawals, fetchBankAccounts, filterType, withdrawStatusFilter]);

  // 5. Kiểm tra query param trả về từ VNPay
  useEffect(() => {
    const txnRef = searchParams.get('vnp_TxnRef') || searchParams.get('txnRef');
    const isVnpayReturn =
      (searchParams.has('vnp_SecureHash') || searchParams.has('vnp_ResponseCode')) &&
      txnRef &&
      (txnRef.startsWith('WAL_DEP_') || searchParams.get('type') === 'wallet_deposit');

    if (isVnpayReturn) {
      const allParams = Object.fromEntries(searchParams.entries());

      // Dọn dẹp query param ngay để URL sạch sẽ
      setSearchParams(new URLSearchParams(), { replace: true });

      // Xác thực chữ ký và kích hoạt cộng tiền tức thì
      verifyVNPayDepositReturn(allParams)
        .then((res) => {
          const resData = res?.data;
          const isSuccess = resData?.errCode === 0 && resData?.data?.isSuccess;

          setReturnNotice({
            isSuccess,
            txnRef,
            message: isSuccess
              ? 'Nạp tiền vào ví BookingCare thành công! Số dư khả dụng của bạn đã được cập nhật ngay lập tức.'
              : (resData?.data?.message || resData?.errMessage || 'Giao dịch nạp tiền qua VNPay không thành công hoặc đã bị hủy.'),
          });

          // Làm mới ví và sổ cái
          fetchWallet();
          fetchTransactions(1, filterType);
        })
        .catch((err) => {
          console.error('Verify deposit error:', err);
          setReturnNotice({
            isSuccess: false,
            txnRef,
            message: 'Không thể xác thực kết quả thanh toán. Vui lòng kiểm tra lại số dư ví sau ít phút.',
          });
        });
    }
  }, [searchParams, setSearchParams, fetchWallet, fetchTransactions, filterType]);

  // 6. Xử lý nạp tiền
  const handleSelectPreset = (amount) => {
    setDepositAmount(amount);
    setCustomAmountStr(amount.toLocaleString('vi-VN'));
  };

  const handleCustomAmountChange = (e) => {
    const rawVal = e.target.value.replace(/[^0-9]/g, '');
    const num = parseInt(rawVal, 10) || 0;
    setDepositAmount(num);
    setCustomAmountStr(num > 0 ? num.toLocaleString('vi-VN') : '');
  };

  const handleSubmitDeposit = async (e) => {
    e.preventDefault();
    if (depositAmount < 10000) {
      toast.warning('Số tiền nạp tối thiểu là 10.000 VNĐ.');
      return;
    }
    if (depositAmount > 100000000) {
      toast.warning('Số tiền nạp tối đa là 100.000.000 VNĐ cho mỗi giao dịch.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await createDepositPaymentUrl({
        amount: depositAmount,
        bankCode: selectedBank || undefined,
      });

      if (res && res.errCode === 0 && res.data?.paymentUrl) {
        window.location.href = res.data.paymentUrl;
      } else {
        toast.error(res?.errMessage || 'Không thể tạo liên kết thanh toán VNPay.');
        setIsSubmitting(false);
      }
    } catch (err) {
      console.error('Create deposit url error:', err);
      toast.error('Lỗi khi kết nối cổng thanh toán VNPay.');
      setIsSubmitting(false);
    }
  };

  // 7. [PHASE 3] Xử lý mở Modal Rút tiền
  const handleOpenWithdrawModal = () => {
    fetchBankAccounts();
    const available = Number(wallet?.availableBalance) || 0;
    const defaultAmount = available >= 50000 ? Math.min(500000, available) : 50000;
    setWithdrawAmount(defaultAmount);
    setWithdrawAmountStr(defaultAmount.toLocaleString('vi-VN'));
    setUserWithdrawNote('');
    setShowWithdrawModal(true);
  };

  const handleSelectWithdrawPreset = (amount) => {
    const available = Number(wallet?.availableBalance) || 0;
    const finalAmt = amount === 'ALL' ? available : amount;
    setWithdrawAmount(finalAmt);
    setWithdrawAmountStr(finalAmt > 0 ? finalAmt.toLocaleString('vi-VN') : '0');
  };

  const handleCustomWithdrawChange = (e) => {
    const rawVal = e.target.value.replace(/[^0-9]/g, '');
    const num = parseInt(rawVal, 10) || 0;
    setWithdrawAmount(num);
    setWithdrawAmountStr(num > 0 ? num.toLocaleString('vi-VN') : '');
  };

  const handleSubmitWithdrawal = async (e) => {
    e.preventDefault();
    const available = Number(wallet?.availableBalance) || 0;

    if (!selectedBankAccountId) {
      toast.warning('Vui lòng chọn tài khoản ngân hàng nhận tiền.');
      return;
    }

    if (withdrawAmount < 50000) {
      toast.warning('Hạn mức rút tiền tối thiểu là 50.000 VNĐ.');
      return;
    }

    if (withdrawAmount > available) {
      toast.error(`Số dư khả dụng không đủ (${formatCurrency(available)} < ${formatCurrency(withdrawAmount)}).`);
      return;
    }

    try {
      setIsWithdrawSubmitting(true);
      const res = await requestWithdrawal({
        amount: withdrawAmount,
        patientBankAccountId: Number(selectedBankAccountId),
        userNote: userWithdrawNote,
      });

      if (res && res.errCode === 0) {
        toast.success(res.errMessage || 'Đã gửi yêu cầu rút tiền thành công!');
        setShowWithdrawModal(false);
        setActiveSubTab('withdrawals');
        fetchWallet();
        fetchWithdrawals(1, withdrawStatusFilter);
      } else {
        toast.error(res?.errMessage || 'Không thể tạo yêu cầu rút tiền.');
      }
    } catch (err) {
      console.error('Request withdrawal error:', err);
      toast.error('Lỗi khi gửi yêu cầu rút tiền.');
    } finally {
      setIsWithdrawSubmitting(false);
    }
  };

  // 8. [PHASE 3] Bệnh nhân tự hủy yêu cầu rút tiền
  const handleCancelWithdrawal = async (requestId) => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy yêu cầu rút tiền này? Số tiền sẽ được hoàn trả lại ngay vào số dư khả dụng.')) {
      return;
    }

    setCancellingId(requestId);
    try {
      const res = await cancelMyWithdrawalRequest(requestId);
      if (res && res.errCode === 0) {
        toast.success(res.errMessage || 'Đã hủy yêu cầu rút tiền thành công!');
        fetchWallet();
        fetchWithdrawals(withdrawPage, withdrawStatusFilter);
      } else {
        toast.error(res?.errMessage || 'Không thể hủy yêu cầu rút tiền.');
      }
    } catch (err) {
      console.error('Cancel withdrawal error:', err);
      toast.error('Lỗi khi hủy yêu cầu rút tiền.');
    } finally {
      setCancellingId(null);
    }
  };

  // Format nhãn loại giao dịch
  const renderTxTypeBadge = (type) => {
    switch (type) {
      case 'DEPOSIT':
        return <span className="tx-badge tx-badge--deposit"><i className="fas fa-arrow-down" /> Nạp tiền VNPay</span>;
      case 'BOOKING_PAYMENT':
        return <span className="tx-badge tx-badge--booking"><i className="fas fa-calendar-check" /> Thanh toán khám</span>;
      case 'REFUND':
        return <span className="tx-badge tx-badge--refund"><i className="fas fa-undo-alt" /> Hoàn tiền hủy khám</span>;
      case 'WITHDRAWAL':
        return <span className="tx-badge tx-badge--withdraw"><i className="fas fa-university" /> Rút tiền về ngân hàng</span>;
      default:
        return <span className="tx-badge tx-badge--other">{type}</span>;
    }
  };

  // Format nhãn trạng thái yêu cầu rút tiền
  const renderWithdrawStatusBadge = (status) => {
    switch (status) {
      case 'PENDING':
        return <span className="status-badge status-pending"><i className="fas fa-clock" /> Đang chờ duyệt</span>;
      case 'TRANSFERRED':
        return <span className="status-badge status-success"><i className="fas fa-check-circle" /> Đã chuyển khoản</span>;
      case 'REJECTED':
        return <span className="status-badge status-danger"><i className="fas fa-times-circle" /> Bị từ chối</span>;
      case 'CANCELLED':
        return <span className="status-badge status-muted"><i className="fas fa-ban" /> Đã hủy</span>;
      default:
        return <span className="status-badge">{status}</span>;
    }
  };

  const totalPages = Math.ceil(totalTx / limit) || 1;
  const totalWithdrawPages = Math.ceil(withdrawTotal / withdrawLimit) || 1;

  return (
    <div className="patient-wallet-container">
      {/* 1. Header & Title */}
      <div className="wallet-header-box">
        <div>
          <h1 className="wallet-main-title">
            <i className="fas fa-wallet" /> Ví BookingCare & Sổ cái Tài chính
          </h1>
          <p className="wallet-subtitle">
            Quản trị tài sản trả trước, nạp tiền trực tuyến qua VNPay, thanh toán lịch khám 0 giây và rút tiền về ngân hàng chính chủ an toàn.
          </p>
        </div>
        <div className="wallet-header-actions">
          <button
            type="button"
            className="btn-withdraw-secondary"
            onClick={handleOpenWithdrawModal}
          >
            <i className="fas fa-university" /> Rút tiền về ngân hàng
          </button>
          <button
            type="button"
            className="btn-deposit-primary"
            onClick={() => setShowDepositModal(true)}
          >
            <i className="fas fa-plus-circle" /> Nạp tiền vào ví
          </button>
        </div>
      </div>

      {/* 2. Banner Thông báo Kết quả VNPay nếu có */}
      {returnNotice && (
        <div className={`wallet-return-banner ${returnNotice.isSuccess ? 'success' : 'danger'}`}>
          <div className="banner-icon">
            <i className={`fas ${returnNotice.isSuccess ? 'fa-check-circle' : 'fa-exclamation-triangle'}`} />
          </div>
          <div className="banner-content">
            <h4>{returnNotice.isSuccess ? 'Giao dịch nạp tiền thành công' : 'Giao dịch chưa hoàn tất'}</h4>
            <p>{returnNotice.message}</p>
            {returnNotice.txnRef && (
              <span className="banner-meta">Mã giao dịch: <strong>{returnNotice.txnRef}</strong></span>
            )}
          </div>
          <button
            type="button"
            className="banner-close-btn"
            onClick={() => setReturnNotice(null)}
          >
            &times;
          </button>
        </div>
      )}

      {/* 3. Thẻ Ví Điện Tử & Thống kê Tài sản */}
      <div className="wallet-overview-grid">
        {/* THẺ VÍ ẢO (VIRTUAL CARD) */}
        <div className="virtual-card-wrapper">
          <div className="virtual-card">
            <div className="card-top-row">
              <div className="card-brand">
                <span className="brand-dot" />
                <span className="brand-name">BookingCare Wallet</span>
              </div>
              <div className="card-chip">
                <i className="fas fa-microchip" />
                <i className="fas fa-wifi" />
              </div>
            </div>

            <div className="card-balance-block">
              <span className="balance-label">SỐ DƯ KHẢ DỤNG</span>
              <h2 className="balance-amount">
                {isLoading ? 'Đang tải...' : formatCurrency(wallet?.availableBalance)}
              </h2>
            </div>

            <div className="card-bottom-row">
              <div className="card-holder">
                <span className="holder-label">CHỦ TÀI KHOẢN VÍ</span>
                <span className="holder-name">
                  {userInfo?.lastName} {userInfo?.firstName}
                </span>
              </div>
              <div className="card-number">
                <span className="holder-label">MÃ ĐỊNH DANH VÍ</span>
                <span className="card-id-text">
                  WAL-{String(wallet?.walletId || 1).padStart(7, '0')}
                </span>
              </div>
              <div className="card-status-badge">
                <span className="status-dot-active" /> {wallet?.status || 'ACTIVE'}
              </div>
            </div>
          </div>
        </div>

        {/* THỐNG KÊ CHI TIẾT */}
        <div className="wallet-stats-column">
          <div className="stat-card">
            <div className="stat-icon-wrapper stat-icon--total">
              <i className="fas fa-coins" />
            </div>
            <div className="stat-info">
              <span className="stat-label">Tổng tài sản trong ví</span>
              <h3 className="stat-value">{formatCurrency(wallet?.totalBalance)}</h3>
              <span className="stat-hint">Số dư khả dụng + Tiền đang giữ chỗ</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrapper stat-icon--hold">
              <i className="fas fa-lock" />
            </div>
            <div className="stat-info">
              <span className="stat-label">Tiền đang giữ chỗ khám / Rút (Hold)</span>
              <h3 className="stat-value">{formatCurrency(wallet?.reservedBalance)}</h3>
              <span className="stat-hint">
                {wallet?.reservedBalance > 0
                  ? 'Đang tạm giữ cho các lịch hẹn chờ khám hoặc yêu cầu rút tiền đang chờ xử lý'
                  : 'Không có khoản tiền nào đang bị tạm giữ'}
              </span>
            </div>
          </div>

          <div className="stat-card stat-card--guarantee">
            <div className="stat-icon-wrapper stat-icon--shield">
              <i className="fas fa-shield-alt" />
            </div>
            <div className="stat-info">
              <span className="stat-label">Bảo chứng & An toàn tài chính</span>
              <p className="guarantee-text">
                Hệ thống tuân thủ mô hình Closed-loop Wallet. Bệnh nhân có quyền gửi yêu cầu rút tiền về đúng tài khoản ngân hàng chính chủ bất kỳ lúc nào.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Sub-Navigation Tabs */}
      <div className="wallet-subtabs-bar">
        <button
          type="button"
          className={`subtab-btn ${activeSubTab === 'ledger' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('ledger')}
        >
          <i className="fas fa-receipt" />
          <span>Sổ Cái Biến Động Số Dư</span>
          <span className="subtab-badge">{totalTx}</span>
        </button>

        <button
          type="button"
          className={`subtab-btn ${activeSubTab === 'withdrawals' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('withdrawals')}
        >
          <i className="fas fa-university" />
          <span>Lịch Sử Yêu Cầu Rút Tiền</span>
          <span className="subtab-badge">{withdrawTotal}</span>
        </button>
      </div>

      {/* ══════════════ TAB 1: SỔ CÁI BIẾN ĐỘNG SỐ DƯ (LEDGER) ══════════════ */}
      {activeSubTab === 'ledger' && (
        <div className="wallet-ledger-section">
          <div className="ledger-header">
            <div className="ledger-title-group">
              <h3 className="ledger-title">
                <i className="fas fa-history" /> Nhật Ký Giao Dịch Bất Biến (Immutable Ledger)
              </h3>
              <span className="ledger-count-pill">{totalTx} giao dịch</span>
            </div>

            {/* Bộ lọc loại giao dịch */}
            <div className="ledger-filters">
              <button
                type="button"
                className={`filter-chip ${filterType === 'ALL' ? 'active' : ''}`}
                onClick={() => setFilterType('ALL')}
              >
                Tất cả
              </button>
              <button
                type="button"
                className={`filter-chip ${filterType === 'DEPOSIT' ? 'active' : ''}`}
                onClick={() => setFilterType('DEPOSIT')}
              >
                Nạp tiền
              </button>
              <button
                type="button"
                className={`filter-chip ${filterType === 'BOOKING_PAYMENT' ? 'active' : ''}`}
                onClick={() => setFilterType('BOOKING_PAYMENT')}
              >
                Thanh toán
              </button>
              <button
                type="button"
                className={`filter-chip ${filterType === 'REFUND' ? 'active' : ''}`}
                onClick={() => setFilterType('REFUND')}
              >
                Hoàn tiền
              </button>
              <button
                type="button"
                className={`filter-chip ${filterType === 'WITHDRAWAL' ? 'active' : ''}`}
                onClick={() => setFilterType('WITHDRAWAL')}
              >
                Rút tiền
              </button>
            </div>
          </div>

          {/* Bảng sổ cái */}
          {isTxLoading ? (
            <div className="ledger-loading-state">
              <i className="fas fa-spinner fa-spin" />
              <span>Đang đối soát lịch sử sổ cái...</span>
            </div>
          ) : transactions.length === 0 ? (
            <div className="ledger-empty-state">
              <i className="fas fa-file-invoice-dollar" />
              <p>Chưa có giao dịch nào được ghi nhận trong sổ cái.</p>
              <button
                type="button"
                className="btn-empty-deposit"
                onClick={() => setShowDepositModal(true)}
              >
                Nạp tiền trải nghiệm ngay
              </button>
            </div>
          ) : (
            <div className="ledger-table-wrapper">
              <table className="ledger-table">
                <thead>
                  <tr>
                    <th>Thời gian</th>
                    <th>Loại giao dịch</th>
                    <th>Diễn giải chi tiết</th>
                    <th>Biến động số dư</th>
                    <th>Số dư sau GD</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => {
                    const isCredit = tx.direction === 'CREDIT';
                    return (
                      <tr key={tx.id}>
                        <td className="col-time">
                          <span className="time-date">
                            {moment(tx.createdAt).format('DD/MM/YYYY')}
                          </span>
                          <span className="time-hour">
                            {moment(tx.createdAt).format('HH:mm:ss')}
                          </span>
                        </td>
                        <td className="col-type">{renderTxTypeBadge(tx.transactionType)}</td>
                        <td className="col-desc">
                          <div className="desc-main">{tx.description || 'Giao dịch ví'}</div>
                          {tx.idempotencyKey && (
                            <small className="desc-key" title={tx.idempotencyKey}>
                              Khóa Idempotency: {tx.idempotencyKey.slice(0, 24)}...
                            </small>
                          )}
                        </td>
                        <td className={`col-amount ${isCredit ? 'credit' : 'debit'}`}>
                          <strong>
                            {isCredit ? '+' : '-'}
                            {formatCurrency(tx.amount)}
                          </strong>
                        </td>
                        <td className="col-balance-after">
                          <span>{formatCurrency(tx.balanceAfter)}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Phân trang */}
          {totalPages > 1 && (
            <div className="ledger-pagination">
              <button
                type="button"
                className="page-btn"
                disabled={page <= 1 || isTxLoading}
                onClick={() => fetchTransactions(page - 1, filterType)}
              >
                <i className="fas fa-chevron-left" /> Trước
              </button>
              <span className="page-indicator">
                Trang {page} / {totalPages}
              </span>
              <button
                type="button"
                className="page-btn"
                disabled={page >= totalPages || isTxLoading}
                onClick={() => fetchTransactions(page + 1, filterType)}
              >
                Sau <i className="fas fa-chevron-right" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ══════════════ TAB 2: YÊU CẦU RÚT TIỀN (WITHDRAWALS) ══════════════ */}
      {activeSubTab === 'withdrawals' && (
        <div className="wallet-ledger-section">
          <div className="ledger-header">
            <div className="ledger-title-group">
              <h3 className="ledger-title">
                <i className="fas fa-money-check-alt" /> Lịch Sử Yêu Cầu Rút Tiền Về Ngân Hàng
              </h3>
              <span className="ledger-count-pill">{withdrawTotal} yêu cầu</span>
            </div>

            {/* Bộ lọc trạng thái rút tiền */}
            <div className="ledger-filters">
              <button
                type="button"
                className={`filter-chip ${withdrawStatusFilter === 'ALL' ? 'active' : ''}`}
                onClick={() => setWithdrawStatusFilter('ALL')}
              >
                Tất cả
              </button>
              <button
                type="button"
                className={`filter-chip ${withdrawStatusFilter === 'PENDING' ? 'active' : ''}`}
                onClick={() => setWithdrawStatusFilter('PENDING')}
              >
                Chờ duyệt
              </button>
              <button
                type="button"
                className={`filter-chip ${withdrawStatusFilter === 'TRANSFERRED' ? 'active' : ''}`}
                onClick={() => setWithdrawStatusFilter('TRANSFERRED')}
              >
                Đã chuyển khoản
              </button>
              <button
                type="button"
                className={`filter-chip ${withdrawStatusFilter === 'REJECTED' ? 'active' : ''}`}
                onClick={() => setWithdrawStatusFilter('REJECTED')}
              >
                Bị từ chối
              </button>
              <button
                type="button"
                className={`filter-chip ${withdrawStatusFilter === 'CANCELLED' ? 'active' : ''}`}
                onClick={() => setWithdrawStatusFilter('CANCELLED')}
              >
                Đã hủy
              </button>
            </div>
          </div>

          {/* Bảng yêu cầu rút tiền */}
          {isWithdrawLoading ? (
            <div className="ledger-loading-state">
              <i className="fas fa-spinner fa-spin" />
              <span>Đang tải danh sách yêu cầu rút tiền...</span>
            </div>
          ) : withdrawRequests.length === 0 ? (
            <div className="ledger-empty-state">
              <i className="fas fa-hand-holding-usd" />
              <p>Bạn chưa gửi yêu cầu rút tiền nào.</p>
              <button
                type="button"
                className="btn-empty-deposit"
                onClick={handleOpenWithdrawModal}
              >
                Gửi yêu cầu rút tiền ngay
              </button>
            </div>
          ) : (
            <div className="ledger-table-wrapper">
              <table className="ledger-table">
                <thead>
                  <tr>
                    <th>Mã & Ngày gửi</th>
                    <th>Tài khoản nhận tiền</th>
                    <th>Số tiền rút</th>
                    <th>Trạng thái</th>
                    <th>Ghi chú / Mã giao dịch</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawRequests.map((req) => (
                    <tr key={req.id}>
                      <td className="col-time">
                        <strong className="tw-text-slate-800">#WTH-{req.id}</strong>
                        <span className="time-date">{moment(req.createdAt).format('DD/MM/YYYY HH:mm')}</span>
                      </td>
                      <td className="col-desc">
                        <div className="desc-main" style={{ fontWeight: 600 }}>
                          {req.bankName}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#475569' }}>
                          STK: <strong>{req.accountNumber}</strong>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#64748B' }}>
                          Chủ TK: {req.accountHolderName}
                        </div>
                      </td>
                      <td className="col-amount debit">
                        <strong>-{formatCurrency(req.amount)}</strong>
                      </td>
                      <td className="col-type">{renderWithdrawStatusBadge(req.status)}</td>
                      <td className="col-desc">
                        {req.bankTransactionRef && (
                          <div style={{ fontSize: '0.82rem', color: '#059669', fontWeight: 600 }}>
                            <i className="fas fa-receipt" /> Mã GD: {req.bankTransactionRef}
                          </div>
                        )}
                        {req.adminNote && (
                          <div style={{ fontSize: '0.8rem', color: req.status === 'REJECTED' ? '#dc2626' : '#475569' }}>
                            {req.status === 'REJECTED' ? 'Lý do từ chối: ' : 'Admin ghi chú: '}
                            {req.adminNote}
                          </div>
                        )}
                        {req.userNote && (
                          <div style={{ fontSize: '0.76rem', color: '#94a3b8' }}>
                            Ghi chú của bạn: {req.userNote}
                          </div>
                        )}
                      </td>
                      <td>
                        {req.status === 'PENDING' && (
                          <button
                            type="button"
                            className="btn-cancel-withdraw"
                            disabled={cancellingId === req.id}
                            onClick={() => handleCancelWithdrawal(req.id)}
                            title="Hủy yêu cầu rút tiền này và hoàn trả lại số dư khả dụng"
                          >
                            {cancellingId === req.id ? (
                              <i className="fas fa-spinner fa-spin" />
                            ) : (
                              <>
                                <i className="fas fa-times" /> Hủy yêu cầu
                              </>
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Phân trang */}
          {totalWithdrawPages > 1 && (
            <div className="ledger-pagination">
              <button
                type="button"
                className="page-btn"
                disabled={withdrawPage <= 1 || isWithdrawLoading}
                onClick={() => fetchWithdrawals(withdrawPage - 1, withdrawStatusFilter)}
              >
                <i className="fas fa-chevron-left" /> Trước
              </button>
              <span className="page-indicator">
                Trang {withdrawPage} / {totalWithdrawPages}
              </span>
              <button
                type="button"
                className="page-btn"
                disabled={withdrawPage >= totalWithdrawPages || isWithdrawLoading}
                onClick={() => fetchWithdrawals(withdrawPage + 1, withdrawStatusFilter)}
              >
                Sau <i className="fas fa-chevron-right" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ══════════════ MODAL 1: NẠP TIỀN VÀO VÍ VNPAY ══════════════ */}
      {showDepositModal && (
        <div className="deposit-modal-backdrop" onClick={() => setShowDepositModal(false)}>
          <div className="deposit-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <div className="modal-title-group">
                <i className="fas fa-wallet" />
                <h3>Nạp Tiền Vào Ví BookingCare</h3>
              </div>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setShowDepositModal(false)}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmitDeposit} className="deposit-form">
              {/* Chọn số tiền nhanh */}
              <div className="form-group">
                <label className="form-label">Chọn nhanh mệnh giá nạp:</label>
                <div className="preset-amounts-grid">
                  {PRESET_AMOUNTS.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      className={`preset-btn ${depositAmount === amt ? 'active' : ''}`}
                      onClick={() => handleSelectPreset(amt)}
                    >
                      {amt.toLocaleString('vi-VN')} đ
                    </button>
                  ))}
                </div>
              </div>

              {/* Nhập số tiền tùy chỉnh */}
              <div className="form-group">
                <label className="form-label" htmlFor="customAmountInput">
                  Hoặc nhập số tiền tùy chọn (VNĐ):
                </label>
                <div className="input-with-currency">
                  <input
                    id="customAmountInput"
                    type="text"
                    className="form-control-amount"
                    placeholder="VD: 500,000"
                    value={customAmountStr}
                    onChange={handleCustomAmountChange}
                  />
                  <span className="currency-suffix">VNĐ</span>
                </div>
                <small className="amount-hint">Số tiền tối thiểu: 10.000 VNĐ | Tối đa: 100.000.000 VNĐ</small>
              </div>

              {/* Chọn ngân hàng hoặc quét QR */}
              <div className="form-group">
                <label className="form-label" htmlFor="bankSelect">Phương thức thanh toán:</label>
                <select
                  id="bankSelect"
                  className="form-select-bank"
                  value={selectedBank}
                  onChange={(e) => setSelectedBank(e.target.value)}
                >
                  {BANK_OPTIONS.map((bank) => (
                    <option key={bank.code} value={bank.code}>
                      {bank.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tóm tắt thanh toán */}
              <div className="deposit-summary-box">
                <div className="summary-row">
                  <span>Số tiền nạp vào ví:</span>
                  <strong className="summary-amount">{formatCurrency(depositAmount)}</strong>
                </div>
                <div className="summary-row">
                  <span>Phí giao dịch:</span>
                  <strong className="text-free">Miễn phí (0đ)</strong>
                </div>
                <div className="summary-divider" />
                <div className="summary-row total">
                  <span>Tổng thanh toán VNPay:</span>
                  <strong className="summary-total">{formatCurrency(depositAmount)}</strong>
                </div>
              </div>

              {/* Nút xác nhận */}
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  disabled={isSubmitting}
                  onClick={() => setShowDepositModal(false)}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="btn-submit-deposit"
                  disabled={isSubmitting || depositAmount < 10000}
                >
                  {isSubmitting ? (
                    <>
                      <i className="fas fa-spinner fa-spin" /> Đang chuyển sang VNPay...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-lock" /> Xác nhận nạp {formatCurrency(depositAmount)}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════ MODAL 2: [PHASE 3] RÚT TIỀN VỀ NGÂN HÀNG CHÍNH CHỦ ══════════════ */}
      {showWithdrawModal && (
        <div className="deposit-modal-backdrop" onClick={() => setShowWithdrawModal(false)}>
          <div className="deposit-modal-content withdraw-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <div className="modal-title-group">
                <i className="fas fa-university" style={{ color: '#0f766e' }} />
                <h3>Yêu Cầu Rút Tiền Về Ngân Hàng</h3>
              </div>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setShowWithdrawModal(false)}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmitWithdrawal} className="deposit-form">
              {/* Thẻ số dư khả dụng */}
              <div className="withdraw-balance-banner">
                <span className="balance-hint">Số dư khả dụng hiện tại:</span>
                <strong className="balance-val">{formatCurrency(wallet?.availableBalance)}</strong>
              </div>

              {/* Chọn tài khoản ngân hàng chính chủ */}
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label className="form-label" style={{ margin: 0 }}>Tài khoản ngân hàng thụ hưởng (Chính chủ) *:</label>
                  <Link to="/patient/profile" className="tw-text-xs tw-text-teal-600 hover:tw-underline">
                    <i className="fas fa-cog" /> Quản lý tài khoản
                  </Link>
                </div>

                {patientBankAccounts.length === 0 ? (
                  <div className="bank-account-empty-alert">
                    <i className="fas fa-exclamation-circle" />
                    <span>Bạn chưa liên kết tài khoản ngân hàng nào. Vui lòng thêm tài khoản tại </span>
                    <Link to="/patient/profile" className="tw-font-bold tw-underline">Hồ sơ bệnh nhân</Link>
                    <span> trước khi rút tiền.</span>
                  </div>
                ) : (
                  <select
                    className="form-select-bank"
                    value={selectedBankAccountId}
                    onChange={(e) => setSelectedBankAccountId(e.target.value)}
                    required
                  >
                    {patientBankAccounts.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.bankName} - {b.accountNumber} ({b.accountHolderName}) {b.isPrimary ? '★ Mặc định' : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Chọn nhanh số tiền rút */}
              <div className="form-group">
                <label className="form-label">Chọn nhanh số tiền rút:</label>
                <div className="preset-amounts-grid">
                  <button
                    type="button"
                    className={`preset-btn ${withdrawAmount === Number(wallet?.availableBalance) ? 'active' : ''}`}
                    onClick={() => handleSelectWithdrawPreset('ALL')}
                  >
                    Toàn bộ số dư
                  </button>
                  <button
                    type="button"
                    className={`preset-btn ${withdrawAmount === 100000 ? 'active' : ''}`}
                    onClick={() => handleSelectWithdrawPreset(100000)}
                  >
                    100.000 đ
                  </button>
                  <button
                    type="button"
                    className={`preset-btn ${withdrawAmount === 200000 ? 'active' : ''}`}
                    onClick={() => handleSelectWithdrawPreset(200000)}
                  >
                    200.000 đ
                  </button>
                  <button
                    type="button"
                    className={`preset-btn ${withdrawAmount === 500000 ? 'active' : ''}`}
                    onClick={() => handleSelectWithdrawPreset(500000)}
                  >
                    500.000 đ
                  </button>
                  <button
                    type="button"
                    className={`preset-btn ${withdrawAmount === 1000000 ? 'active' : ''}`}
                    onClick={() => handleSelectWithdrawPreset(1000000)}
                  >
                    1.000.000 đ
                  </button>
                  <button
                    type="button"
                    className={`preset-btn ${withdrawAmount === 2000000 ? 'active' : ''}`}
                    onClick={() => handleSelectWithdrawPreset(2000000)}
                  >
                    2.000.000 đ
                  </button>
                </div>
              </div>

              {/* Nhập số tiền tùy chọn */}
              <div className="form-group">
                <label className="form-label" htmlFor="customWithdrawInput">
                  Số tiền muốn rút (VNĐ) *:
                </label>
                <div className="input-with-currency">
                  <input
                    id="customWithdrawInput"
                    type="text"
                    className="form-control-amount"
                    placeholder="VD: 200,000"
                    value={withdrawAmountStr}
                    onChange={handleCustomWithdrawChange}
                  />
                  <span className="currency-suffix">VNĐ</span>
                </div>
                <small className="amount-hint">Hạn mức rút: Tối thiểu 50.000 VNĐ | Tối đa bằng Số dư khả dụng</small>
              </div>

              {/* Ghi chú */}
              <div className="form-group">
                <label className="form-label" htmlFor="userNoteInput">Ghi chú cho Quản trị viên (Tùy chọn):</label>
                <input
                  id="userNoteInput"
                  type="text"
                  className="form-control-amount"
                  placeholder="VD: Rút tiền hoàn ca khám ngày 28/09"
                  value={userWithdrawNote}
                  onChange={(e) => setUserWithdrawNote(e.target.value)}
                />
              </div>

              {/* Tóm tắt rút tiền */}
              <div className="deposit-summary-box">
                <div className="summary-row">
                  <span>Số tiền rút khỏi ví:</span>
                  <strong className="summary-amount tw-text-rose-600">-{formatCurrency(withdrawAmount)}</strong>
                </div>
                <div className="summary-row">
                  <span>Phí dịch vụ rút tiền:</span>
                  <strong className="text-free">Miễn phí (0đ)</strong>
                </div>
                <div className="summary-row">
                  <span>Số dư khả dụng còn lại:</span>
                  <strong>{formatCurrency(Math.max(0, (Number(wallet?.availableBalance) || 0) - withdrawAmount))}</strong>
                </div>
                <div className="summary-divider" />
                <div className="summary-row total">
                  <span>Thực nhận về tài khoản ngân hàng:</span>
                  <strong className="summary-total tw-text-emerald-700">{formatCurrency(withdrawAmount)}</strong>
                </div>
              </div>

              <div className="tw-p-2 tw-bg-amber-50 tw-rounded-lg tw-border tw-border-amber-200 tw-text-xs tw-text-amber-800 tw-mt-2">
                <i className="fas fa-shield-alt" /> <strong>Quy định bảo chứng (AML):</strong> BookingCare chỉ chuyển khoản về đúng tài khoản ngân hàng chính chủ của bệnh nhân. Tiền sẽ được tạm giữ (Hold) an toàn trong khi Admin xử lý chuyển khoản (tối đa 24h làm việc).
              </div>

              {/* Nút xác nhận */}
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  disabled={isWithdrawSubmitting}
                  onClick={() => setShowWithdrawModal(false)}
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="btn-submit-deposit"
                  style={{ background: 'linear-gradient(135deg, #0f766e 0%, #115e59 100%)' }}
                  disabled={
                    isWithdrawSubmitting ||
                    patientBankAccounts.length === 0 ||
                    withdrawAmount < 50000 ||
                    withdrawAmount > (Number(wallet?.availableBalance) || 0)
                  }
                >
                  {isWithdrawSubmitting ? (
                    <>
                      <i className="fas fa-spinner fa-spin" /> Đang gửi yêu cầu...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-paper-plane" /> Xác nhận gửi yêu cầu rút tiền
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

export default PatientWallet;
