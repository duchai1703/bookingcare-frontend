// src/containers/PatientPortal/PatientWallet.jsx
// [Financial Wallet & Ledger] Giao diện Quản lý Ví BookingCare & Sổ cái bất biến
import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import moment from 'moment';
import {
  getMyWallet,
  createDepositPaymentUrl,
  getMyWalletTransactions,
  verifyVNPayDepositReturn,
} from '../../services/walletService';
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

  // Khởi động
  useEffect(() => {
    fetchWallet();
    fetchTransactions(1, filterType);
  }, [fetchWallet, fetchTransactions, filterType]);

  // 3. Kiểm tra query param trả về từ VNPay
  useEffect(() => {
    const txnRef = searchParams.get('vnp_TxnRef') || searchParams.get('txnRef');
    const isVnpayReturn =
      (searchParams.has('vnp_SecureHash') || searchParams.has('vnp_ResponseCode')) &&
      txnRef &&
      (txnRef.startsWith('WAL_DEP_') || searchParams.get('type') === 'wallet_deposit');

    if (isVnpayReturn) {
      const allParams = Object.fromEntries(searchParams.entries());

      // Dọn dẹp query param ngay để URL sạch sẽ và không bị gọi lặp lại khi render
      setSearchParams(new URLSearchParams(), { replace: true });

      // Xác thực chữ ký và kích hoạt cộng tiền tức thì (kể cả khi không chạy ngrok)
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

          fetchWallet();
          fetchTransactions(1, 'ALL');
        })
        .catch((err) => {
          console.error('Verify return error:', err);
          setReturnNotice({
            isSuccess: false,
            txnRef,
            message: 'Lỗi kết nối khi xác thực giao dịch với máy chủ.',
          });
          fetchWallet();
          fetchTransactions(1, 'ALL');
        });
    }
  }, [searchParams, setSearchParams, fetchWallet, fetchTransactions]);

  // Xử lý thay đổi số tiền nhập tay
  const handleCustomAmountChange = (e) => {
    const rawVal = e.target.value.replace(/\D/g, '');
    const num = Number(rawVal);
    setDepositAmount(num);
    setCustomAmountStr(num ? num.toLocaleString('en-US') : '');
  };

  // Chọn số tiền định sẵn
  const handleSelectPreset = (amt) => {
    setDepositAmount(amt);
    setCustomAmountStr(amt.toLocaleString('en-US'));
  };

  // Thực hiện nạp tiền (Gọi API tạo VNPay URL và chuyển hướng)
  const handleProceedDeposit = async (e) => {
    e.preventDefault();
    if (!depositAmount || depositAmount < 10000) {
      toast.warning('Số tiền nạp tối thiểu là 10.000 VNĐ');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await createDepositPaymentUrl({
        amount: depositAmount,
        bankCode: selectedBank || undefined,
      });

      if (res && res.errCode === 0 && res.data?.paymentUrl) {
        toast.info('Đang chuyển hướng tới cổng thanh toán VNPay...');
        window.location.href = res.data.paymentUrl;
      } else {
        toast.error(res?.errMessage || 'Không thể tạo phiên thanh toán VNPay.');
        setIsSubmitting(false);
      }
    } catch (err) {
      console.error('Deposit error:', err);
      toast.error('Lỗi khi khởi tạo phiên thanh toán.');
      setIsSubmitting(false);
    }
  };

  // Helper render Badge loại giao dịch
  const renderTxTypeBadge = (type) => {
    switch (type) {
      case 'DEPOSIT':
        return <span className="tx-badge tx-badge--deposit"><i className="fas fa-arrow-down" /> Nạp tiền</span>;
      case 'BOOKING_PAYMENT':
        return <span className="tx-badge tx-badge--payment"><i className="fas fa-calendar-check" /> Thanh toán khám</span>;
      case 'REFUND':
        return <span className="tx-badge tx-badge--refund"><i className="fas fa-undo-alt" /> Hoàn tiền hủy khám</span>;
      case 'WITHDRAWAL':
        return <span className="tx-badge tx-badge--withdraw"><i className="fas fa-university" /> Rút tiền về ngân hàng</span>;
      default:
        return <span className="tx-badge tx-badge--other">{type}</span>;
    }
  };

  const totalPages = Math.ceil(totalTx / limit) || 1;

  return (
    <div className="patient-wallet-container">
      {/* 1. Header & Title */}
      <div className="wallet-header-box">
        <div>
          <h1 className="wallet-main-title">
            <i className="fas fa-wallet" /> Ví BookingCare & Sổ cái Tài chính
          </h1>
          <p className="wallet-subtitle">
            Nạp tiền trực tuyến, thanh toán lịch khám 0 giây và tự động nhận hoàn tiền tức thì khi hủy lịch.
          </p>
        </div>
        <div className="wallet-header-actions">
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
              <span className="stat-label">Tiền đang giữ chỗ khám (Hold)</span>
              <h3 className="stat-value">{formatCurrency(wallet?.reservedBalance)}</h3>
              <span className="stat-hint">
                {wallet?.reservedBalance > 0
                  ? 'Đang tạm giữ cho các lịch hẹn chờ khám hoàn tất'
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
                Tiền trong ví được đối soát độc lập qua cổng VNPay. Mọi ca hủy lịch hợp lệ được <strong>hoàn tiền 100% tự động ngay tức thì</strong>.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Sổ cái Giao dịch Bất biến (Transaction Ledger) */}
      <div className="wallet-ledger-section">
        <div className="ledger-header">
          <div className="ledger-title-group">
            <h3 className="ledger-title">
              <i className="fas fa-receipt" /> Sổ cái Biến động Số dư
            </h3>
            <span className="ledger-count-pill">{totalTx} giao dịch</span>
          </div>

          {/* Bộ lọc loại giao dịch */}
          <div className="ledger-filter-tabs">
            <button
              type="button"
              className={`filter-tab-btn ${filterType === 'ALL' ? 'active' : ''}`}
              onClick={() => setFilterType('ALL')}
            >
              Tất cả
            </button>
            <button
              type="button"
              className={`filter-tab-btn ${filterType === 'DEPOSIT' ? 'active' : ''}`}
              onClick={() => setFilterType('DEPOSIT')}
            >
              Nạp tiền
            </button>
            <button
              type="button"
              className={`filter-tab-btn ${filterType === 'BOOKING_PAYMENT' ? 'active' : ''}`}
              onClick={() => setFilterType('BOOKING_PAYMENT')}
            >
              Thanh toán
            </button>
            <button
              type="button"
              className={`filter-tab-btn ${filterType === 'REFUND' ? 'active' : ''}`}
              onClick={() => setFilterType('REFUND')}
            >
              Hoàn tiền
            </button>
          </div>
        </div>

        {/* Bảng Sổ cái */}
        <div className="ledger-table-container">
          {isTxLoading ? (
            <div className="ledger-loading-state">
              <i className="fas fa-spinner fa-spin" /> Đang tải lịch sử sổ cái...
            </div>
          ) : transactions && transactions.length > 0 ? (
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Thời gian</th>
                  <th>Loại giao dịch</th>
                  <th>Diễn giải chi tiết</th>
                  <th>Biến động số dư</th>
                  <th>Số dư sau GD</th>
                  <th>Mã tham chiếu</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => {
                  const isCredit = tx.direction === 'CREDIT';
                  return (
                    <tr key={tx.id}>
                      <td className="tx-time-cell">
                        {moment(tx.createdAt).format('DD/MM/YYYY HH:mm:ss')}
                      </td>
                      <td>{renderTxTypeBadge(tx.transactionType)}</td>
                      <td className="tx-desc-cell">{tx.description || 'Giao dịch ví BookingCare'}</td>
                      <td className={`tx-amount-cell ${isCredit ? 'credit' : 'debit'}`}>
                        {isCredit ? '+' : '-'}{formatCurrency(tx.amount)}
                      </td>
                      <td className="tx-balance-after-cell">
                        {formatCurrency(tx.balanceAfter)}
                      </td>
                      <td className="tx-ref-cell">
                        <span className="ref-pill" title={tx.idempotencyKey || tx.id}>
                          {tx.id ? tx.id.slice(0, 8) + '...' : '---'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="ledger-empty-state">
              <div className="empty-icon"><i className="fas fa-wallet" /></div>
              <h4>Chưa có giao dịch nào được ghi nhận</h4>
              <p>Mọi biến động nạp tiền, đặt lịch hoặc hoàn tiền sẽ được ghi vào sổ cái bất biến tại đây.</p>
              <button
                type="button"
                className="btn-deposit-sm"
                onClick={() => setShowDepositModal(true)}
              >
                <i className="fas fa-plus-circle" /> Nạp tiền lần đầu
              </button>
            </div>
          )}
        </div>

        {/* Phân trang */}
        {totalPages > 1 && (
          <div className="ledger-pagination">
            <button
              type="button"
              className="page-nav-btn"
              disabled={page <= 1}
              onClick={() => fetchTransactions(page - 1, filterType)}
            >
              <i className="fas fa-chevron-left" /> Trước
            </button>
            <span className="page-indicator">
              Trang <strong>{page}</strong> / {totalPages}
            </span>
            <button
              type="button"
              className="page-nav-btn"
              disabled={page >= totalPages}
              onClick={() => fetchTransactions(page + 1, filterType)}
            >
              Sau <i className="fas fa-chevron-right" />
            </button>
          </div>
        )}
      </div>

      {/* 5. MODAL NẠP TIỀN QUA VNPAY */}
      {showDepositModal && (
        <div className="deposit-modal-backdrop" onClick={() => !isSubmitting && setShowDepositModal(false)}>
          <div className="deposit-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-box">
                <i className="fas fa-credit-card modal-icon" />
                <div>
                  <h3 className="modal-title">Nạp tiền vào Ví BookingCare</h3>
                  <span className="modal-subtitle">Thanh toán an toàn qua Cổng VNPAY (QR, Thẻ ATM, Visa)</span>
                </div>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                disabled={isSubmitting}
                onClick={() => setShowDepositModal(false)}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleProceedDeposit} className="modal-form">
              {/* Chọn mức nạp nhanh */}
              <div className="form-group">
                <label className="form-label">Chọn nhanh số tiền nạp:</label>
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
    </div>
  );
};

export default PatientWallet;
