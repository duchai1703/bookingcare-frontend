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
  calculateWithdrawalSlaPreview,
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
  const [slaPreview, setSlaPreview] = useState(null);
  const [isLoadingSla, setIsLoadingSla] = useState(false);

  const [withdrawRequests, setWithdrawRequests] = useState([]);
  const [withdrawTotal, setWithdrawTotal] = useState(0);
  const [withdrawPage, setWithdrawPage] = useState(1);
  const [withdrawLimit] = useState(10);
  const [withdrawStatusFilter, setWithdrawStatusFilter] = useState('ALL');
  const [isWithdrawLoading, setIsWithdrawLoading] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);
  const [showExplainerModal, setShowExplainerModal] = useState(false);

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

  // [SLA Dynamic Preview] Tính toán thời hạn cam kết khi mở modal hoặc đổi số tiền rút
  useEffect(() => {
    if (!showWithdrawModal) return;
    let isMounted = true;
    setIsLoadingSla(true);
    calculateWithdrawalSlaPreview(withdrawAmount)
      .then((res) => {
        if (isMounted && res && res.errCode === 0) {
          setSlaPreview(res.data);
        }
      })
      .catch((err) => console.error('Lỗi khi tính SLA:', err))
      .finally(() => {
        if (isMounted) setIsLoadingSla(false);
      });
    return () => {
      isMounted = false;
    };
  }, [showWithdrawModal, withdrawAmount]);

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
          // axiosConfig interceptor returns response.data directly
          // We support both direct payload and wrapped { data: ... }
          const actualErrCode = res?.errCode !== undefined ? res.errCode : res?.data?.errCode;
          const innerData = res?.data?.data !== undefined ? res.data.data : (res?.data || res);
          const isSuccess =
            actualErrCode === 0 &&
            (innerData?.isSuccess === true ||
              innerData?.paymentStatus === 'SUCCESS' ||
              res?.errMessage === 'Xác thực thanh toán VNPay thành công.');

          setReturnNotice({
            isSuccess,
            txnRef,
            message: isSuccess
              ? 'Nạp tiền vào ví BookingCare thành công! Số dư khả dụng của bạn đã được cập nhật ngay lập tức.'
              : (innerData?.message || res?.errMessage || res?.data?.errMessage || 'Giao dịch nạp tiền qua VNPay không thành công hoặc đã bị hủy.'),
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

  // [Fintech UX] Chuẩn hóa diễn giải giao dịch rõ ràng, lược bỏ các chuỗi kỹ thuật backend
  const formatTransactionDescription = (tx) => {
    if (!tx) return { title: 'Giao dịch ví', sub: '' };
    const desc = tx.description || '';

    // 1. Hoàn tiền
    if (tx.transactionType === 'REFUND') {
      const matchBooking = desc.match(/#(\d+)/);
      const bookingCode = matchBooking ? `#${matchBooking[1]}` : '';
      let sub = 'Hoàn tiền vào số dư khả dụng';
      if (desc.includes('bác sĩ bận') || desc.includes('Bác Sĩ bận') || desc.includes('phẫu thuật') || desc.includes('cấp cứu')) {
        sub = 'Bác sĩ bận ca phẫu thuật / cấp cứu đột xuất';
      } else if (desc.includes('hủy') || desc.includes('Hủy')) {
        sub = 'Hủy lịch hẹn theo chính sách hoàn tiền';
      }
      return {
        title: `Hoàn tiền ca khám ${bookingCode}`.trim(),
        sub,
      };
    }

    // 2. Thanh toán ca khám
    if (tx.transactionType === 'BOOKING_PAYMENT') {
      const matchBooking = desc.match(/#(\d+)/);
      const bookingCode = matchBooking ? `#${matchBooking[1]}` : '';
      return {
        title: `Thanh toán ca khám ${bookingCode}`.trim(),
        sub: 'Thanh toán giữ chỗ lịch hẹn trực tuyến',
      };
    }

    // 3. Nạp tiền ví
    if (tx.transactionType === 'DEPOSIT') {
      let sub = 'Cổng thanh toán điện tử VNPay';
      const matchBank = desc.match(/Ngân hàng:\s*([A-Za-z0-9]+)/i);
      const matchTx = desc.match(/Mã GD:\s*([0-9]+)/i);
      if (matchBank || matchTx) {
        sub = `${matchBank ? `Ngân hàng ${matchBank[1]}` : 'VNPay'}${matchTx ? ` • GD: ${matchTx[1]}` : ''}`;
      }
      return {
        title: 'Nạp tiền vào ví',
        sub,
      };
    }

    // 4. Rút tiền về ngân hàng
    if (tx.transactionType === 'WITHDRAWAL') {
      let sub = 'Chuyển khoản về tài khoản ngân hàng';
      const matchBank = desc.match(/ngân hàng\s+([A-Za-z0-9]+)/i);
      const matchStk = desc.match(/STK\s+([0-9]+)/i);
      if (matchBank || matchStk) {
        sub = `${matchBank ? matchBank[1].toUpperCase() : 'Ngân hàng'}${matchStk ? ` • STK: ${matchStk[1]}` : ''}`;
      }
      return {
        title: 'Rút tiền về tài khoản ngân hàng',
        sub,
      };
    }

    return {
      title: desc.split('.')[0] || 'Biến động số dư',
      sub: '',
    };
  };

  // Format nhãn loại giao dịch theo phong cách Fintech hiện đại
  const renderTxTypeBadge = (type) => {
    switch (type) {
      case 'DEPOSIT':
        return (
          <span className="fintech-type-pill type-deposit">
            <span className="dot" />
            <span>Nạp tiền</span>
          </span>
        );
      case 'BOOKING_PAYMENT':
        return (
          <span className="fintech-type-pill type-payment">
            <span className="dot" />
            <span>Thanh toán</span>
          </span>
        );
      case 'REFUND':
        return (
          <span className="fintech-type-pill type-refund">
            <span className="dot" />
            <span>Hoàn tiền</span>
          </span>
        );
      case 'WITHDRAWAL':
        return (
          <span className="fintech-type-pill type-withdraw">
            <span className="dot" />
            <span>Rút tiền</span>
          </span>
        );
      default:
        return (
          <span className="fintech-type-pill type-default">
            <span className="dot" />
            <span>{type}</span>
          </span>
        );
    }
  };

  // Format nhãn trạng thái yêu cầu rút tiền tinh tế
  const renderWithdrawStatusBadge = (status) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="fintech-status-pill status-pending">
            <span className="dot" />
            <span>Chờ duyệt</span>
          </span>
        );
      case 'TRANSFERRED':
        return (
          <span className="fintech-status-pill status-success">
            <span className="dot" />
            <span>Đã chuyển tiền</span>
          </span>
        );
      case 'REJECTED':
        return (
          <span className="fintech-status-pill status-danger">
            <span className="dot" />
            <span>Bị từ chối</span>
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="fintech-status-pill status-muted">
            <span className="dot" />
            <span>Đã hủy</span>
          </span>
        );
      default:
        return (
          <span className="fintech-status-pill">
            <span className="dot" />
            <span>{status}</span>
          </span>
        );
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
            className="btn-explainer-outline"
            onClick={() => setShowExplainerModal(true)}
            title="Bấm để xem giải thích chi tiết về Tổng tài sản, Số dư khả dụng và Tiền giữ chỗ (Hold)"
          >
            <i className="fas fa-question-circle" /> Giải thích cơ chế ví
          </button>
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
              <div className="balance-label-row">
                <span className="balance-label">SỐ DƯ KHẢ DỤNG</span>
                <button
                  type="button"
                  className="balance-info-btn"
                  onClick={() => setShowExplainerModal(true)}
                  title="Số dư sẵn sàng dùng để đặt khám mới hoặc rút về ngân hàng"
                >
                  <i className="fas fa-question-circle" />
                </button>
              </div>
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
              <div className="stat-label-row">
                <span className="stat-label">Tổng tài sản trong ví</span>
                <button
                  type="button"
                  className="stat-info-trigger"
                  onClick={() => setShowExplainerModal(true)}
                  title="Tổng giá trị tài sản bạn sở hữu = Khả dụng + Tiền đang giữ chỗ"
                >
                  <i className="fas fa-info-circle" />
                </button>
              </div>
              <h3 className="stat-value">{formatCurrency(wallet?.totalBalance)}</h3>
              <span className="stat-hint">
                = Số dư khả dụng ({formatCurrency(wallet?.availableBalance)}) + Đang giữ chỗ ({formatCurrency(wallet?.reservedBalance)})
              </span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrapper stat-icon--hold">
              <i className="fas fa-lock" />
            </div>
            <div className="stat-info">
              <div className="stat-label-row">
                <span className="stat-label">Tiền đang giữ chỗ khám / Rút (Hold)</span>
                <button
                  type="button"
                  className="stat-info-trigger"
                  onClick={() => setShowExplainerModal(true)}
                  title="Tiền bảo chứng cho ca khám sắp tới hoặc lệnh rút đang duyệt. Vẫn thuộc sở hữu của bạn!"
                >
                  <i className="fas fa-info-circle" />
                </button>
              </div>
              <h3 className="stat-value">{formatCurrency(wallet?.reservedBalance)}</h3>
              <span className="stat-hint">
                {wallet?.reservedBalance > 0
                  ? 'Đang tạm giữ bảo chứng cho lịch khám chờ thực hiện hoặc yêu cầu rút tiền đang duyệt. Nếu hủy hợp lệ, tiền hoàn về số dư khả dụng.'
                  : 'Không có khoản tiền nào đang bị tạm khóa (Bảo chứng 0đ).'}
              </span>
            </div>
          </div>

          <div className="stat-card stat-card--guarantee">
            <div className="stat-icon-wrapper stat-icon--shield">
              <i className="fas fa-shield-alt" />
            </div>
            <div className="stat-info">
              <span className="stat-label">Bảo chứng & Ký quỹ minh bạch</span>
              <p className="guarantee-text">
                Tiền tạm giữ (Hold) là ký quỹ an toàn, <strong>vẫn thuộc quyền sở hữu của bạn</strong>. Bạn có quyền hủy yêu cầu rút tiền hoặc hủy khám theo quy định để tiền hoàn trả tức thì vào số dư khả dụng.
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

      {/* ══════════════ TAB 1: BIẾN ĐỘNG SỐ DƯ (LEDGER) ══════════════ */}
      {activeSubTab === 'ledger' && (
        <div className="fintech-card-container">
          <div className="fintech-card-header">
            <div className="header-meta">
              <h3 className="section-title">
                Lịch sử biến động số dư
              </h3>
              <span className="fintech-counter-badge">{totalTx} giao dịch</span>
            </div>

            {/* Bộ lọc Segmented Control */}
            <div className="fintech-segmented-group">
              <button
                type="button"
                className={`segmented-item ${filterType === 'ALL' ? 'active' : ''}`}
                onClick={() => setFilterType('ALL')}
              >
                Tất cả
              </button>
              <button
                type="button"
                className={`segmented-item ${filterType === 'DEPOSIT' ? 'active' : ''}`}
                onClick={() => setFilterType('DEPOSIT')}
              >
                Nạp tiền
              </button>
              <button
                type="button"
                className={`segmented-item ${filterType === 'BOOKING_PAYMENT' ? 'active' : ''}`}
                onClick={() => setFilterType('BOOKING_PAYMENT')}
              >
                Thanh toán
              </button>
              <button
                type="button"
                className={`segmented-item ${filterType === 'REFUND' ? 'active' : ''}`}
                onClick={() => setFilterType('REFUND')}
              >
                Hoàn tiền
              </button>
              <button
                type="button"
                className={`segmented-item ${filterType === 'WITHDRAWAL' ? 'active' : ''}`}
                onClick={() => setFilterType('WITHDRAWAL')}
              >
                Rút tiền
              </button>
            </div>
          </div>

          {/* Bảng sổ cái */}
          {isTxLoading ? (
            <div className="fintech-loading-state">
              <i className="fas fa-circle-notch fa-spin" />
              <span>Đang tải lịch sử giao dịch...</span>
            </div>
          ) : transactions.length === 0 ? (
            <div className="fintech-empty-state">
              <div className="empty-icon-wrap">
                <i className="fas fa-receipt" />
              </div>
              <p className="empty-title">Chưa có biến động số dư nào</p>
              <p className="empty-sub">Các khoản nạp tiền, hoàn tiền hoặc thanh toán lịch khám sẽ được hiển thị tại đây.</p>
              <button
                type="button"
                className="btn-empty-action"
                onClick={() => setShowDepositModal(true)}
              >
                <i className="fas fa-plus" /> Nạp tiền vào ví
              </button>
            </div>
          ) : (
            <div className="fintech-table-scroll">
              <table className="fintech-modern-table">
                <thead>
                  <tr>
                    <th style={{ width: '135px' }}>Thời gian</th>
                    <th style={{ width: '135px' }}>Phân loại</th>
                    <th>Nội dung giao dịch</th>
                    <th style={{ width: '160px' }}>Biến động</th>
                    <th style={{ width: '160px' }}>Số dư ví</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => {
                    const isCredit = tx.direction === 'CREDIT';
                    const txInfo = formatTransactionDescription(tx);
                    return (
                      <tr key={tx.id}>
                        <td className="cell-datetime">
                          <div className="date-text">
                            {moment(tx.createdAt).format('DD/MM/YYYY')}
                          </div>
                          <div className="time-text">
                            {moment(tx.createdAt).format('HH:mm:ss')}
                          </div>
                        </td>
                        <td className="cell-type">
                          {renderTxTypeBadge(tx.transactionType)}
                        </td>
                        <td className="cell-description">
                          <div className="desc-primary">{txInfo.title}</div>
                          {txInfo.sub && (
                            <div className="desc-secondary">{txInfo.sub}</div>
                          )}
                        </td>
                        <td className={`cell-amount ${isCredit ? 'is-credit' : 'is-debit'}`}>
                          <span>
                            {isCredit ? '+' : '-'}{formatCurrency(tx.amount)}
                          </span>
                        </td>
                        <td className="cell-balance-after">
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
            <div className="fintech-pagination-bar">
              <button
                type="button"
                className="btn-page-nav"
                disabled={page <= 1 || isTxLoading}
                onClick={() => fetchTransactions(page - 1, filterType)}
              >
                <i className="fas fa-chevron-left" /> Trước
              </button>
              <span className="page-current-info">
                Trang <strong>{page}</strong> / {totalPages}
              </span>
              <button
                type="button"
                className="btn-page-nav"
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
        <div className="fintech-card-container">
          <div className="fintech-card-header">
            <div className="header-meta">
              <h3 className="section-title">
                Lịch sử yêu cầu rút tiền
              </h3>
              <span className="fintech-counter-badge">{withdrawTotal} yêu cầu</span>
            </div>

            {/* Bộ lọc Segmented Control */}
            <div className="fintech-segmented-group">
              <button
                type="button"
                className={`segmented-item ${withdrawStatusFilter === 'ALL' ? 'active' : ''}`}
                onClick={() => setWithdrawStatusFilter('ALL')}
              >
                Tất cả
              </button>
              <button
                type="button"
                className={`segmented-item ${withdrawStatusFilter === 'PENDING' ? 'active' : ''}`}
                onClick={() => setWithdrawStatusFilter('PENDING')}
              >
                Chờ duyệt
              </button>
              <button
                type="button"
                className={`segmented-item ${withdrawStatusFilter === 'TRANSFERRED' ? 'active' : ''}`}
                onClick={() => setWithdrawStatusFilter('TRANSFERRED')}
              >
                Đã chuyển khoản
              </button>
              <button
                type="button"
                className={`segmented-item ${withdrawStatusFilter === 'REJECTED' ? 'active' : ''}`}
                onClick={() => setWithdrawStatusFilter('REJECTED')}
              >
                Bị từ chối
              </button>
              <button
                type="button"
                className={`segmented-item ${withdrawStatusFilter === 'CANCELLED' ? 'active' : ''}`}
                onClick={() => setWithdrawStatusFilter('CANCELLED')}
              >
                Đã hủy
              </button>
            </div>
          </div>

          {/* Bảng yêu cầu rút tiền */}
          {isWithdrawLoading ? (
            <div className="fintech-loading-state">
              <i className="fas fa-circle-notch fa-spin" />
              <span>Đang tải danh sách yêu cầu rút tiền...</span>
            </div>
          ) : withdrawRequests.length === 0 ? (
            <div className="fintech-empty-state">
              <div className="empty-icon-wrap">
                <i className="fas fa-university" />
              </div>
              <p className="empty-title">Chưa có yêu cầu rút tiền nào</p>
              <p className="empty-sub">Bạn có thể gửi yêu cầu rút số dư khả dụng về tài khoản ngân hàng bất cứ lúc nào.</p>
              <button
                type="button"
                className="btn-empty-action"
                onClick={handleOpenWithdrawModal}
              >
                <i className="fas fa-arrow-up" /> Rút tiền về ngân hàng
              </button>
            </div>
          ) : (
            <div className="fintech-table-scroll">
              <table className="fintech-modern-table">
                <thead>
                  <tr>
                    <th style={{ width: '145px' }}>Mã & Thời gian</th>
                    <th style={{ width: '220px' }}>Tài khoản nhận</th>
                    <th style={{ width: '135px', textAlign: 'right' }}>Số tiền</th>
                    <th style={{ width: '165px' }}>Thời gian dự kiến</th>
                    <th style={{ width: '135px' }}>Trạng thái</th>
                    <th>Thông tin đối soát</th>
                    <th style={{ width: '100px', textAlign: 'center' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawRequests.map((req) => {
                    const isOverdue = Boolean(
                      req.status === 'PENDING' &&
                      req.promisedPayoutDate &&
                      moment().isAfter(moment(req.promisedPayoutDate))
                    );
                    return (
                      <tr key={req.id}>
                        <td className="cell-datetime">
                          <div className="req-code-badge">
                            #WTH-{String(req.id).padStart(3, '0')}
                          </div>
                          <div className="time-text">
                            {moment(req.createdAt).format('DD/MM/YYYY • HH:mm')}
                          </div>
                        </td>
                        <td className="cell-bank-info">
                          <div className="bank-name-badge">
                            <i className="fas fa-university" />
                            <span>{req.bankName}</span>
                          </div>
                          <div className="bank-account-num">
                            STK: <strong>{req.accountNumber}</strong>
                          </div>
                          <div className="bank-holder-name">
                            {req.accountHolderName}
                          </div>
                        </td>
                        <td className="cell-amount is-debit">
                          <span>-{formatCurrency(req.amount)}</span>
                        </td>
                        <td className="cell-sla">
                          <div className="sla-duration">
                            <i className="far fa-clock" />
                            <span>{req.appliedSlaDays ? `Tối đa ${req.appliedSlaDays} ngày` : 'Trong ngày'}</span>
                          </div>
                          <div className="sla-deadline">
                            Hạn: {req.promisedPayoutDate ? moment(req.promisedPayoutDate).format('DD/MM/YYYY') : 'Đang xử lý'}
                          </div>
                          {isOverdue && (
                            <span className="overdue-tag">
                              Cần hỗ trợ
                            </span>
                          )}
                        </td>
                        <td className="cell-type">
                          {renderWithdrawStatusBadge(req.status)}
                        </td>
                        <td className="cell-reconciliation">
                          {req.bankTransactionRef && (
                            <div className="reconciliation-ref">
                              <span className="ref-label">Mã GD:</span>
                              <code>{req.bankTransactionRef}</code>
                            </div>
                          )}
                          {req.adminNote && (
                            <div className={`reconciliation-note ${req.status === 'REJECTED' ? 'is-rejected' : ''}`}>
                              <span className="note-label">
                                {req.status === 'REJECTED' ? 'Lý do từ chối:' : 'Ghi chú:'}
                              </span>
                              <span className="note-text">{req.adminNote}</span>
                            </div>
                          )}
                          {req.userNote && (
                            <div className="reconciliation-user-note">
                              <span>Ghi chú của bạn: {req.userNote}</span>
                            </div>
                          )}
                          {!req.bankTransactionRef && !req.adminNote && !req.userNote && (
                            <span className="text-muted-dash">—</span>
                          )}
                        </td>
                        <td className="cell-actions" style={{ textAlign: 'center' }}>
                          {req.status === 'PENDING' ? (
                            <button
                              type="button"
                              className="btn-cancel-req"
                              disabled={cancellingId === req.id}
                              onClick={() => handleCancelWithdrawal(req.id)}
                              title="Hủy yêu cầu và hoàn lại số dư"
                            >
                              {cancellingId === req.id ? (
                                <i className="fas fa-spinner fa-spin" />
                              ) : (
                                <span>Hủy</span>
                              )}
                            </button>
                          ) : req.status === 'TRANSFERRED' ? (
                            <span className="completed-check" title="Giao dịch thành công">
                              <i className="fas fa-check" />
                            </span>
                          ) : (
                            <span className="text-muted-dash">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Phân trang */}
          {totalWithdrawPages > 1 && (
            <div className="fintech-pagination-bar">
              <button
                type="button"
                className="btn-page-nav"
                disabled={withdrawPage <= 1 || isWithdrawLoading}
                onClick={() => fetchWithdrawals(withdrawPage - 1, withdrawStatusFilter)}
              >
                <i className="fas fa-chevron-left" /> Trước
              </button>
              <span className="page-current-info">
                Trang <strong>{withdrawPage}</strong> / {totalWithdrawPages}
              </span>
              <button
                type="button"
                className="btn-page-nav"
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

              {/* Thẻ Cam kết Thời hạn Giải ngân Linh hoạt (SLA & Audit) */}
              <div className="tw-p-3.5 tw-bg-teal-50/80 tw-rounded-xl tw-border tw-border-teal-200 tw-text-xs tw-mt-2">
                <div className="tw-flex tw-items-center tw-justify-between tw-mb-1">
                  <span className="tw-font-bold tw-text-teal-900 tw-flex tw-items-center tw-gap-1.5">
                    <i className="fas fa-business-time tw-text-teal-600" /> Cam kết giải ngân (SLA):
                  </span>
                  <span className="tw-px-2 tw-py-0.5 tw-bg-teal-700 tw-text-white tw-text-2xs tw-font-bold tw-rounded-full">
                    {isLoadingSla ? 'Đang tính...' : `${slaPreview?.appliedSlaDays || 7} ngày làm việc`}
                  </span>
                </div>
                <div className="tw-text-xs tw-text-teal-800">
                  Dự kiến tiền về tài khoản trước ngày:{' '}
                  <strong className="tw-text-teal-950">
                    {slaPreview?.promisedPayoutDate
                      ? moment(slaPreview.promisedPayoutDate).format('DD/MM/YYYY')
                      : moment().add(7, 'days').format('DD/MM/YYYY')}
                  </strong>
                </div>
                {slaPreview?.matchedTier?.label && (
                  <div className="tw-text-2xs tw-text-teal-700 tw-mt-1 tw-font-medium">
                    <i className="fas fa-check-circle tw-mr-1" />
                    Áp dụng: {slaPreview.matchedTier.label}
                  </div>
                )}
                {slaPreview?.policyNoticeVi && (
                  <div className="tw-text-2xs tw-text-slate-600 tw-mt-1.5 tw-pt-1.5 tw-border-t tw-border-teal-200/60">
                    <i className="fas fa-info-circle tw-mr-1" /> {slaPreview.policyNoticeVi}
                  </div>
                )}
              </div>

              <div className="tw-p-2 tw-bg-amber-50 tw-rounded-lg tw-border tw-border-amber-200 tw-text-xs tw-text-amber-800 tw-mt-2">
                <i className="fas fa-shield-alt" /> <strong>Quy định bảo chứng (AML):</strong> BookingCare chỉ chuyển khoản về đúng tài khoản ngân hàng chính chủ của bệnh nhân. Tiền sẽ được tạm giữ (Hold) an toàn trong khi Admin xử lý chuyển khoản theo cam kết SLA.
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

      {/* 8. MODAL GIẢI THÍCH CHI TIẾT CƠ CHẾ VÍ & KÝ QUỸ (ESCROW) */}
      {showExplainerModal && (
        <div className="wallet-modal-overlay" onClick={() => setShowExplainerModal(false)}>
          <div className="wallet-modal-content wallet-explainer-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <div className="modal-icon-badge" style={{ background: '#ecfdf5', color: '#0d9488' }}>
                  <i className="fas fa-shield-alt" />
                </div>
                <div>
                  <h3 className="modal-title">Cơ Chế Quản Lý Số Dư & Ký Quỹ An Toàn</h3>
                  <p className="modal-subtitle">Giải thích chi tiết về Tổng tài sản, Số dư khả dụng và Tiền đang giữ chỗ (Hold)</p>
                </div>
              </div>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setShowExplainerModal(false)}
              >
                &times;
              </button>
            </div>

            <div className="explainer-modal-body">
              {/* Formula Card */}
              <div className="explainer-formula-card">
                <div className="formula-header">
                  <i className="fas fa-calculator me-2" />
                  <span>Công thức cân bằng tài chính minh bạch:</span>
                </div>
                <div className="formula-equation">
                  <div className="equation-item total">
                    <span className="eq-label">Tổng tài sản trong ví</span>
                    <span className="eq-value">{formatCurrency(wallet?.totalBalance)}</span>
                  </div>
                  <span className="eq-operator">=</span>
                  <div className="equation-item avail">
                    <span className="eq-label">Số dư khả dụng</span>
                    <span className="eq-value">{formatCurrency(wallet?.availableBalance)}</span>
                  </div>
                  <span className="eq-operator">+</span>
                  <div className="equation-item hold">
                    <span className="eq-label">Tiền đang giữ chỗ (Hold)</span>
                    <span className="eq-value">{formatCurrency(wallet?.reservedBalance)}</span>
                  </div>
                </div>
              </div>

              {/* Detail Blocks */}
              <div className="explainer-blocks">
                <div className="explainer-block block-available">
                  <div className="block-head">
                    <div className="block-icon">
                      <i className="fas fa-wallet" />
                    </div>
                    <div>
                      <h4 className="block-title">1. Số dư khả dụng (Available Balance)</h4>
                      <span className="block-tag">Sẵn sàng sử dụng 100%</span>
                    </div>
                  </div>
                  <p className="block-desc">
                    Là số tiền tự do trong tài khoản ví của bạn. Bạn có thể sử dụng ngay để <strong>thanh toán các lịch hẹn khám bệnh mới</strong> hoặc <strong>yêu cầu rút tiền về tài khoản ngân hàng chính chủ</strong> của bạn bất kỳ lúc nào.
                  </p>
                </div>

                <div className="explainer-block block-hold">
                  <div className="block-head">
                    <div className="block-icon">
                      <i className="fas fa-lock" />
                    </div>
                    <div>
                      <h4 className="block-title">2. Tiền đang giữ chỗ khám / Rút (Reserved / Hold)</h4>
                      <span className="block-tag tag-hold">Ký quỹ bảo chứng an toàn</span>
                    </div>
                  </div>
                  <p className="block-desc">
                    <strong>Đây KHÔNG PHẢI là chi phí bị trừ mất</strong>. Toàn bộ số tiền này <strong>vẫn thuộc quyền sở hữu của bạn</strong>, chỉ tạm thời được khóa bảo chứng (Escrow) trong 2 trường hợp:
                  </p>
                  <ul className="block-list">
                    <li>
                      <strong>Giữ chỗ lịch khám:</strong> Khi bạn đặt một lịch khám bệnh mới, tiền khám được khóa bảo đảm chỗ cho bạn với bác sĩ. Khi bác sĩ khám xong, tiền mới thanh toán. Nếu bạn hủy hẹn hợp lệ theo chính sách, <strong>toàn bộ tiền giữ chỗ sẽ được hoàn trả ngay lập tức vào Số dư khả dụng</strong>.
                    </li>
                    <li>
                      <strong>Lệnh rút tiền đang duyệt:</strong> Khi bạn tạo yêu cầu rút tiền về ngân hàng, số tiền rút sẽ tạm khóa để tránh bị chi tiêu trùng lặp trong thời gian bộ phận tài chính thực hiện lệnh chuyển khoản ngân hàng. Nếu bạn bấm <em>"Hủy yêu cầu"</em>, tiền sẽ quay về số dư khả dụng ngay tức thì.
                    </li>
                  </ul>
                </div>

                <div className="explainer-block block-total">
                  <div className="block-head">
                    <div className="block-icon">
                      <i className="fas fa-coins" />
                    </div>
                    <div>
                      <h4 className="block-title">3. Tổng tài sản trong ví (Total Balance)</h4>
                      <span className="block-tag tag-total">Tổng giá trị bạn sở hữu</span>
                    </div>
                  </div>
                  <p className="block-desc">
                    Phản ánh tổng giá trị tiền tệ thực tế bạn đang có trên BookingCare (bao gồm cả tiền tự do dùng được ngay và tiền đang ký quỹ bảo lãnh cho các ca khám / lệnh rút sắp tới).
                  </p>
                </div>
              </div>

              {/* Example box */}
              <div className="explainer-example-box">
                <div className="example-title">
                  <i className="fas fa-lightbulb text-warning me-2" />
                  <strong>Ví dụ thực tế dễ hiểu:</strong>
                </div>
                <p className="example-text">
                  Ví bạn có <strong>500.000đ</strong> khả dụng. Bạn đặt 1 lịch khám giá <strong>300.000đ</strong>:
                </p>
                <div className="example-steps">
                  <div className="step-item">
                    <span className="step-dot" />
                    <span>Số dư khả dụng còn: <strong>200.000đ</strong> (bạn có thể rút hoặc đặt thêm ca khác).</span>
                  </div>
                  <div className="step-item">
                    <span className="step-dot" />
                    <span>Tiền giữ chỗ (Hold) tăng: <strong>300.000đ</strong> (tạm bảo chứng ca khám).</span>
                  </div>
                  <div className="step-item">
                    <span className="step-dot" />
                    <span>Tổng tài sản ví: vẫn là <strong>500.000đ</strong> (tài sản của bạn không hề bị hao hụt).</span>
                  </div>
                  <div className="step-item">
                    <span className="step-dot" />
                    <span>Nếu bạn hủy lịch hẹn đúng hạn: <strong>300.000đ</strong> lập tức được mở khóa quay lại Số dư khả dụng = <strong>500.000đ</strong>!</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-actions" style={{ justifyContent: 'flex-end', marginTop: '16px' }}>
              <button
                type="button"
                className="btn-deposit-primary"
                onClick={() => setShowExplainerModal(false)}
              >
                <i className="fas fa-check me-1" /> Tôi đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientWallet;
