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
  FileSpreadsheet
} from 'lucide-react';
import {
  getAdminLiquidityMetrics,
  getAdminWalletTransactions,
  getAdminWalletsList,
  toggleWalletStatus
} from '../../../../services/walletService';
import './LiquidityDashboard.scss';

const LiquidityDashboard = () => {
  // Tabs: 'solvency' | 'ledger' | 'wallets'
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

  // Format currency
  const formatMoney = (amount) => {
    return (Number(amount) || 0).toLocaleString('vi-VN') + ' ₫';
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

  // Initial load
  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  useEffect(() => {
    if (activeTab === 'ledger') {
      loadTransactions();
    } else if (activeTab === 'wallets') {
      loadWallets();
    }
  }, [activeTab, loadTransactions, loadWallets]);

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
            onClick={() => loadMetrics()}
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
        {/* Thẻ 1: Tổng tiền nạp cổng */}
        <div className="kpi-card">
          <div className="kpi-top-row">
            <span className="kpi-title">Dòng tiền nạp thực tế</span>
            <div className="kpi-icon-wrap blue">
              <Coins size={18} />
            </div>
          </div>
          <div className="kpi-value">{formatMoney(summary.totalCashInflow)}</div>
          <div className="kpi-subtitle">
            <span>Tổng cộng:</span>
            <span className="highlight-text">{summary.totalDepositCount || 0} giao dịch VNPay thành công</span>
          </div>
        </div>

        {/* Thẻ 2: Tổng nghĩa vụ nợ */}
        <div className="kpi-card kpi-card--liabilities">
          <div className="kpi-top-row">
            <span className="kpi-title">Tổng nghĩa vụ nợ</span>
            <div className="kpi-icon-wrap amber">
              <AlertOctagon size={18} />
            </div>
          </div>
          <div className="kpi-value">{formatMoney(summary.totalLiabilities)}</div>
          <div className="kpi-subtitle">
            <span>Khả dụng ví:</span>
            <span className="highlight-text">{formatMoney(summary.patientAvailableLiability)}</span>
          </div>
        </div>

        {/* Thẻ 3: Dự trữ bắt buộc */}
        <div className="kpi-card">
          <div className="kpi-top-row">
            <span className="kpi-title">Quỹ dự trữ bắt buộc</span>
            <div className="kpi-icon-wrap purple">
              <Sliders size={18} />
            </div>
          </div>
          <div className="kpi-value">{formatMoney(solvency.mandatoryReserveCash)}</div>
          <div className="reserve-slider-control">
            <div className="slider-label">
              <span>Hệ số an toàn:</span>
              <strong className="text-teal-700">{reserveRatio}%</strong>
            </div>
            <input
              type="range"
              min="10"
              max="80"
              step="5"
              value={reserveRatio}
              onChange={handleReserveRatioChange}
              title="Kéo thanh trượt để thử nghiệm tỷ lệ dự trữ"
            />
          </div>
        </div>

        {/* Thẻ 4: Vốn được phép rút đầu tư */}
        <div className="kpi-card kpi-card--withdrawable">
          <div className="kpi-top-row">
            <span className="kpi-title">Vốn an toàn rút đầu tư</span>
            <div className="kpi-icon-wrap green">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="kpi-value">{formatMoney(solvency.netWithdrawableLiquidity)}</div>
          <div className="kpi-subtitle">
            <CheckCircle2 size={13} className="text-emerald-600" />
            <span className="text-emerald-700 font-semibold">Bảo chứng 100% không mất thanh khoản</span>
          </div>
        </div>
      </div>

      {/* ===== TABS CONTAINER ===== */}
      <div className="ld-tabs-container">
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

                <div className={`reconciliation-status-card ${!rec.isLedgerBalanced ? 'reconciliation-status-card--warn' : ''}`}>
                  <div className="rec-head">
                    {rec.isLedgerBalanced ? (
                      <>
                        <CheckCircle2 size={16} />
                        <span>SỔ CÁI BẤT BIẾN CÂN ĐỐI TUYỆT ĐỐI (100%)</span>
                      </>
                    ) : (
                      <>
                        <AlertOctagon size={16} className="text-amber-600" />
                        <span className="text-amber-800">PHÁT HIỆN ĐỘ LỆCH SỐ DƯ VỚI SỔ CÁI</span>
                      </>
                    )}
                  </div>
                  <p className="rec-desc">
                    Đối chiếu so sánh giữa tổng số dư lưu hành trên các bảng Ví với tổng bút toán phát sinh trong Sổ cái giao dịch bất biến (`Wallet_Transactions`).
                  </p>

                  <div className="rec-metrics">
                    <div className="rec-item">
                      <span>Tổng số dư trên các Ví:</span>
                      <strong>{formatMoney(rec.sumWalletsBalance)}</strong>
                    </div>
                    <div className="rec-item">
                      <span>Biến động ròng Sổ cái:</span>
                      <strong>{formatMoney(rec.netLedgerBalance)}</strong>
                    </div>
                    <div className="rec-item">
                      <span>Tổng bút toán CREDIT:</span>
                      <strong className="text-emerald-600">+{formatMoney(rec.ledgerCredits)}</strong>
                    </div>
                    <div className="rec-item">
                      <span>Tổng bút toán DEBIT:</span>
                      <strong className="text-rose-600">-{formatMoney(rec.ledgerDebits)}</strong>
                    </div>
                  </div>
                </div>

                <div className="tw-mt-4 tw-p-3 tw-bg-emerald-50 tw-rounded-lg tw-border tw-border-emerald-200 tw-text-xs tw-text-emerald-800">
                  <div className="tw-font-bold tw-flex tw-items-center tw-gap-1.5 tw-mb-1">
                    <CheckCircle2 size={14} /> Zero-Admin Automatic Protection
                  </div>
                  Mọi giao dịch hoàn tiền tự động (Instant Refund) hoặc đặt lịch đều được ghi nhận song song vào Sổ cái bất biến với mã khóa `idempotencyKey`, ngăn chặn triệt để tình trạng double-spend hoặc mất mát tiền tệ.
                </div>
              </div>
            </div>
          )}

          {/* ══════════════ TAB 2: AUDIT TRAIL & LEDGER EXPLORER ══════════════ */}
          {activeTab === 'ledger' && (
            <div>
              {/* Filter bar */}
              <div className="ld-filter-bar">
                <div className="search-box">
                  <Search size={14} />
                  <input
                    type="text"
                    placeholder="Tìm theo Idempotency Key, Mã ca khám, Mô tả..."
                    value={txSearch}
                    onChange={(e) => {
                      setTxSearch(e.target.value);
                      setTxPage(1);
                    }}
                  />
                </div>

                <select
                  value={txType}
                  onChange={(e) => {
                    setTxType(e.target.value);
                    setTxPage(1);
                  }}
                >
                  <option value="ALL">Tất cả loại giao dịch</option>
                  <option value="DEPOSIT">DEPOSIT (Nạp tiền VNPay)</option>
                  <option value="BOOKING_PAYMENT">BOOKING_PAYMENT (Thanh toán lịch)</option>
                  <option value="REFUND">REFUND (Hoàn tiền hủy khám)</option>
                  <option value="WITHDRAWAL">WITHDRAWAL (Rút tiền về NH)</option>
                </select>

                <select
                  value={txDirection}
                  onChange={(e) => {
                    setTxDirection(e.target.value);
                    setTxPage(1);
                  }}
                >
                  <option value="ALL">Tất cả hướng tiền</option>
                  <option value="CREDIT">CREDIT (+ Tiền vào ví)</option>
                  <option value="DEBIT">DEBIT (- Tiền ra khỏi ví)</option>
                </select>
              </div>

              {/* Table */}
              <div className="ld-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Thời gian</th>
                      <th>Bệnh nhân / Chủ ví</th>
                      <th>Loại giao dịch</th>
                      <th>Hướng</th>
                      <th>Số tiền</th>
                      <th>Số dư sau GD</th>
                      <th>Khóa Idempotency</th>
                      <th>Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingTx ? (
                      <tr>
                        <td colSpan="8" className="tw-text-center tw-py-8 tw-text-slate-400">
                          <RotateCw size={18} className="tw-animate-spin tw-inline tw-mr-2" /> Đang tra cứu sổ cái...
                        </td>
                      </tr>
                    ) : transactions.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="tw-text-center tw-py-8 tw-text-slate-400">
                          Không tìm thấy giao dịch nào phù hợp với bộ lọc.
                        </td>
                      </tr>
                    ) : (
                      transactions.map((tx) => (
                        <tr key={tx.id}>
                          <td>{moment(tx.createdAt).format('DD/MM/YYYY HH:mm:ss')}</td>
                          <td>
                            <div className="tw-font-semibold tw-text-slate-900">
                              {[tx.wallet?.owner?.lastName, tx.wallet?.owner?.firstName].filter(Boolean).join(' ') || 'Chưa đặt tên'}
                            </div>
                            <div className="tw-text-xs tw-text-slate-500">{tx.wallet?.owner?.email}</div>
                          </td>
                          <td>
                            <span className="tw-font-bold tw-text-xs tw-text-slate-700">{tx.transactionType}</span>
                          </td>
                          <td>
                            <span className={`badge-tag badge-tag--${tx.direction?.toLowerCase()}`}>
                              {tx.direction === 'CREDIT' ? '+ CREDIT' : '- DEBIT'}
                            </span>
                          </td>
                          <td>
                            <span className={`tw-font-bold ${tx.direction === 'CREDIT' ? 'tw-text-emerald-600' : 'tw-text-rose-600'}`}>
                              {tx.direction === 'CREDIT' ? '+' : '-'}{formatMoney(tx.amount)}
                            </span>
                          </td>
                          <td className="tw-font-medium">{formatMoney(tx.balanceAfter)}</td>
                          <td>
                            <span className="code-text" title={tx.idempotencyKey}>
                              {tx.idempotencyKey ? `${tx.idempotencyKey.slice(0, 24)}...` : '—'}
                            </span>
                          </td>
                          <td className="tw-text-xs tw-text-slate-500">{tx.description || '—'}</td>
                        </tr>
                      ))
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

          {/* ══════════════ TAB 3: USER WALLETS CONTROL ══════════════ */}
          {activeTab === 'wallets' && (
            <div>
              {/* Filter bar */}
              <div className="ld-filter-bar">
                <div className="search-box">
                  <Search size={14} />
                  <input
                    type="text"
                    placeholder="Tìm theo Tên bệnh nhân, Email, Số điện thoại..."
                    value={walletSearch}
                    onChange={(e) => {
                      setWalletSearch(e.target.value);
                      setWalletsPage(1);
                    }}
                  />
                </div>

                <select
                  value={walletStatusFilter}
                  onChange={(e) => {
                    setWalletStatusFilter(e.target.value);
                    setWalletsPage(1);
                  }}
                >
                  <option value="ALL">Tất cả trạng thái ví</option>
                  <option value="ACTIVE">ACTIVE (Đang hoạt động)</option>
                  <option value="LOCKED">LOCKED (Đang bị khóa)</option>
                </select>
              </div>

              {/* Table */}
              <div className="ld-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Mã Ví</th>
                      <th>Chủ sở hữu (Bệnh nhân)</th>
                      <th>Email / SĐT</th>
                      <th>Số dư khả dụng</th>
                      <th>Số dư giữ cọc (Hold)</th>
                      <th>Tổng số dư</th>
                      <th>Trạng thái ví</th>
                      <th>Thao tác quản trị</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingWallets ? (
                      <tr>
                        <td colSpan="8" className="tw-text-center tw-py-8 tw-text-slate-400">
                          <RotateCw size={18} className="tw-animate-spin tw-inline tw-mr-2" /> Đang tải danh sách ví...
                        </td>
                      </tr>
                    ) : wallets.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="tw-text-center tw-py-8 tw-text-slate-400">
                          Không tìm thấy ví người dùng nào.
                        </td>
                      </tr>
                    ) : (
                      wallets.map((w) => {
                        const avail = Number(w.availableBalance) || 0;
                        const reserved = Number(w.reservedBalance) || 0;
                        const total = avail + reserved;
                        const isActionLoading = actionLoadingId === w.id;

                        return (
                          <tr key={w.id}>
                            <td className="tw-font-bold tw-text-slate-800">#WAL-{w.id}</td>
                            <td>
                              <div className="tw-font-semibold tw-text-slate-900">
                                {[w.owner?.lastName, w.owner?.firstName].filter(Boolean).join(' ') || 'Bệnh nhân'}
                              </div>
                            </td>
                            <td>
                              <div>{w.owner?.email || '—'}</div>
                              <div className="tw-text-xs tw-text-slate-500">{w.owner?.phoneNumber || '—'}</div>
                            </td>
                            <td>
                              <span className="tw-font-bold tw-text-emerald-700">{formatMoney(avail)}</span>
                            </td>
                            <td>
                              <span className="tw-font-semibold tw-text-amber-700">{formatMoney(reserved)}</span>
                            </td>
                            <td className="tw-font-bold tw-text-slate-900">{formatMoney(total)}</td>
                            <td>
                              <span className={`badge-tag badge-tag--${w.status?.toLowerCase()}`}>
                                {w.status === 'ACTIVE' ? 'Đang hoạt động' : 'Đã khóa'}
                              </span>
                            </td>
                            <td>
                              <button
                                type="button"
                                className={`tw-inline-flex tw-items-center tw-gap-1.5 tw-px-3 tw-py-1.5 tw-rounded-lg tw-text-xs tw-font-bold tw-transition-all ${
                                  w.status === 'ACTIVE'
                                    ? 'tw-bg-rose-50 tw-text-rose-700 hover:tw-bg-rose-100'
                                    : 'tw-bg-emerald-50 tw-text-emerald-700 hover:tw-bg-emerald-100'
                                }`}
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
        </div>
      </div>
    </div>
  );
};

export default LiquidityDashboard;
