// src/containers/System/Admin/Financial/UnifiedLedgerHub.jsx
// [RAMP FINTECH DESIGN SYSTEM - MASTER HUB 3]
// Sổ Cái Kế Toán & Quản Trị Hệ Thống Hợp Nhất (Ledger, Wallets & Compliance Hub)
// Hợp nhất 3 phân hệ: Sổ cái kép bất biến (Double-entry Journal), Danh bạ ví, Tham số chính sách & Quỹ dự trữ.
// Tuân thủ 100% chuẩn Ramp: Warm Paper, Electric Lime #D4FF00, Hairline borders, Tabular numbers, Drawer drilldown.

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import moment from 'moment';
import {
  FileSpreadsheet,
  Wallet,
  SlidersHorizontal,
  Search,
  RotateCw,
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ChevronRight,
  ShieldCheck,
  User,
  Building2,
  Copy,
  ExternalLink,
  Coins,
  Save,
  Clock,
  X,
  GitCommit
} from 'lucide-react';
import {
  getAdminWalletTransactions,
  getAdminWalletsList,
  toggleWalletStatus,
  getFinancialConfigs,
  updateFinancialConfigs
} from '../../../../services/walletService';
import TransactionLifecycleDrawer from './TransactionLifecycleDrawer';
import RampPagination from '../../../../components/Common/RampPagination';
import './UnifiedLedgerHub.scss';

const formatMoney = (val) => (Number(val) || 0).toLocaleString('vi-VN') + ' ₫';

export default function UnifiedLedgerHub() {
  // Segment: 'LEDGER' | 'WALLETS' | 'SETTINGS'
  const [activeSegment, setActiveSegment] = useState('LEDGER');

  // 1. Sổ cái kế toán kép state
  const [transactions, setTransactions] = useState([]);
  const [txTotal, setTxTotal] = useState(0);
  const [txPage, setTxPage] = useState(1);
  const [txLimit] = useState(20);
  const [txType, setTxType] = useState('ALL');
  const [txDirection, setTxDirection] = useState('ALL');
  const [txSearch, setTxSearch] = useState('');
  const [loadingTx, setLoadingTx] = useState(false);

  // 2. Danh bạ ví state
  const [wallets, setWallets] = useState([]);
  const [walletsTotal, setWalletsTotal] = useState(0);
  const [walletsPage, setWalletsPage] = useState(1);
  const [walletsLimit] = useState(20);
  const [walletStatusFilter, setWalletStatusFilter] = useState('ALL');
  const [walletTypeFilter, setWalletTypeFilter] = useState('ALL');
  const [walletSearch, setWalletSearch] = useState('');
  const [loadingWallets, setLoadingWallets] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Selected Wallet Drawer State
  const [selectedWallet, setSelectedWallet] = useState(null);

  // Drawer Truy Vết Vòng Đời Giao Dịch Toàn Vẹn (Lineage Inspector)
  const [selectedTxForLineage, setSelectedTxForLineage] = useState(null);
  const [isLineageDrawerOpen, setIsLineageDrawerOpen] = useState(false);

  const handleOpenLineage = (targetId) => {
    setSelectedTxForLineage(targetId || 102);
    setIsLineageDrawerOpen(true);
  };

  // 3. Cấu hình tham số state
  const [configs, setConfigs] = useState(null);
  const [inputReserveRatio, setInputReserveRatio] = useState(40);
  const [inputMinWithdraw, setInputMinWithdraw] = useState(50000);
  const [inputSlaHours, setInputSlaHours] = useState(24);
  const [inputDoctorShare, setInputDoctorShare] = useState(90);
  const [isSavingConfigs, setIsSavingConfigs] = useState(false);
  const [loadingConfigs, setLoadingConfigs] = useState(false);

  // Tải danh sách giao dịch sổ cái
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
      toast.error('Lỗi khi tải sổ cái kế toán');
    } finally {
      setLoadingTx(false);
    }
  }, [txPage, txLimit, txType, txDirection, txSearch]);

  // Tải danh bạ ví
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
      toast.error('Lỗi khi tải danh bạ ví');
    } finally {
      setLoadingWallets(false);
    }
  }, [walletsPage, walletsLimit, walletStatusFilter, walletSearch]);

  // Tải cấu hình tham số
  const loadConfigs = useCallback(async () => {
    setLoadingConfigs(true);
    try {
      const res = await getFinancialConfigs();
      if (res && res.errCode === 0 && res.data) {
        setConfigs(res.data);
        setInputReserveRatio(res.data.mandatoryReserveRatio || 40);
        setInputMinWithdraw(res.data.minWithdrawalAmount || 50000);
        setInputSlaHours(res.data.withdrawalSlaHours || 24);
        setInputDoctorShare(res.data.doctorRevenueSharePercent || 90);
      }
    } catch (err) {
      toast.error('Lỗi khi tải cấu hình tham số');
    } finally {
      setLoadingConfigs(false);
    }
  }, []);

  useEffect(() => {
    if (activeSegment === 'LEDGER') loadTransactions();
    if (activeSegment === 'WALLETS') loadWallets();
    if (activeSegment === 'SETTINGS') loadConfigs();
  }, [activeSegment, loadTransactions, loadWallets, loadConfigs]);

  // Khóa / Mở khóa ví
  const handleToggleWalletLock = async (wallet) => {
    const isLocking = wallet.status === 'ACTIVE';
    const targetStatus = isLocking ? 'LOCKED' : 'ACTIVE';
    setActionLoadingId(wallet.id);
    try {
      const res = await toggleWalletStatus(wallet.id, {
        targetStatus,
        adminNote: `Admin ${isLocking ? 'khóa' : 'mở khóa'} ví từ Hub Sổ Cái & Quản Trị`
      });
      if (res && res.errCode === 0) {
        toast.success(`Đã ${isLocking ? 'khóa' : 'mở khóa'} ví thành công!`);
        if (selectedWallet?.id === wallet.id) {
          setSelectedWallet({ ...selectedWallet, status: targetStatus });
        }
        await loadWallets();
      } else {
        toast.error(res?.errMessage || 'Không thể cập nhật trạng thái ví');
      }
    } catch (err) {
      toast.error('Lỗi khi cập nhật trạng thái ví');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Lưu cấu hình tham số
  const handleSaveConfigs = async (e) => {
    e.preventDefault();
    setIsSavingConfigs(true);
    try {
      const res = await updateFinancialConfigs({
        mandatoryReserveRatio: Number(inputReserveRatio),
        minWithdrawalAmount: Number(inputMinWithdraw),
        withdrawalSlaHours: Number(inputSlaHours),
        doctorRevenueSharePercent: Number(inputDoctorShare)
      });
      if (res && res.errCode === 0) {
        toast.success('Đã cập nhật cấu hình tham số chính sách thành công!');
        await loadConfigs();
      } else {
        toast.error(res?.errMessage || 'Không thể lưu cấu hình');
      }
    } catch (err) {
      toast.error('Lỗi khi lưu cấu hình tham số');
    } finally {
      setIsSavingConfigs(false);
    }
  };

  return (
    <div className="ramp-unified-ledger-hub">
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 1. HEADER & SEGMENT CONTROL CHUẨN RAMP                             */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="ramp-hub-header">
        <div className="header-title-block">
          <div className="header-badge">
            <span className="badge-dot" />
            <span>Sổ Cái Kế Toán Kép Bất Biến & Quản Trị Hệ Thống (Audit & Books)</span>
          </div>
          <h1 className="page-title">Sổ Cái Kế Toán & Quản Trị Danh Bạ Ví</h1>
          <p className="page-subtitle">
            Nhật ký giao dịch bất biến (Immutable Ledger), kiểm soát dòng vốn Nợ/Có (Debit/Credit), danh bạ tài khoản ví và chính sách thanh khoản.
          </p>
        </div>

        <div className="header-actions-block">
          <button
            type="button"
            className="ramp-btn-secondary"
            onClick={() => {
              if (activeSegment === 'LEDGER') loadTransactions();
              if (activeSegment === 'WALLETS') loadWallets();
              if (activeSegment === 'SETTINGS') loadConfigs();
            }}
          >
            <RotateCw size={14} className={(loadingTx || loadingWallets || loadingConfigs) ? 'tw-animate-spin' : ''} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 2. MINIMALIST UNDERLINE SEGMENT CONTROL CHUẨN RAMP                 */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="ramp-segment-tabs">
        <button
          type="button"
          className={`segment-btn ${activeSegment === 'LEDGER' ? 'active' : ''}`}
          onClick={() => setActiveSegment('LEDGER')}
        >
          <FileSpreadsheet size={15} />
          <span>1. Bút Toán Sổ Cái Kép (Journal)</span>
          <span className="segment-badge">{txTotal}</span>
        </button>

        <button
          type="button"
          className={`segment-btn ${activeSegment === 'WALLETS' ? 'active' : ''}`}
          onClick={() => setActiveSegment('WALLETS')}
        >
          <Wallet size={15} />
          <span>2. Danh Bạ Tài Khoản Ví (Wallets)</span>
          <span className="segment-badge">{walletsTotal}</span>
        </button>

        <button
          type="button"
          className={`segment-btn ${activeSegment === 'SETTINGS' ? 'active' : ''}`}
          onClick={() => setActiveSegment('SETTINGS')}
        >
          <SlidersHorizontal size={15} />
          <span>3. Tham Số Chính Sách & Dự Trữ</span>
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SEGMENT 1: BÚT TOÁN SỔ CÁI KÉP (DOUBLE-ENTRY JOURNAL)              */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeSegment === 'LEDGER' && (
        <div className="segment-content">
          <div className="ramp-filter-toolbar">
            <div className="search-box-wrapper">
              <Search size={14} className="search-icon" />
              <input
                type="text"
                className="ramp-search-input"
                placeholder="⌘ K Tìm kiếm theo Idempotency Key, Reference ID, Diễn giải..."
                value={txSearch}
                onChange={(e) => {
                  setTxSearch(e.target.value);
                  setTxPage(1);
                }}
              />
            </div>

            <div className="filters-right">
              <select
                className="ramp-select"
                value={txType}
                onChange={(e) => {
                  setTxType(e.target.value);
                  setTxPage(1);
                }}
              >
                <option value="ALL">Tất cả loại giao dịch</option>
                <option value="DEPOSIT">Nạp VNPay (DEPOSIT)</option>
                <option value="BOOKING_PAYMENT">Thanh toán khám (BOOKING_PAYMENT)</option>
                <option value="REFUND">Hoàn tiền (REFUND)</option>
                <option value="WITHDRAWAL">Rút tiền (WITHDRAWAL)</option>
                <option value="DOCTOR_SHARE">Thù lao bác sĩ (DOCTOR_SHARE)</option>
              </select>

              <select
                className="ramp-select"
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

          <div className="ramp-table-wrapper">
            <table className="ramp-table">
              <thead>
                <tr>
                  <th>Thời gian</th>
                  <th>Chủ tài khoản (Owner)</th>
                  <th>Loại nghiệp vụ</th>
                  <th>Chiều hạch toán</th>
                  <th className="text-right">Số tiền phát sinh</th>
                  <th className="text-right">Số dư sau GD</th>
                  <th>Diễn giải & Idempotency Key</th>
                  <th className="text-right">Vòng đời</th>
                </tr>
              </thead>
              <tbody>
                {loadingTx ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8">
                      <RotateCw size={16} className="tw-animate-spin tw-inline tw-mr-2" />
                      Đang đồng bộ sổ cái kế toán kép...
                    </td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-muted">
                      Không tìm thấy bút toán nào phù hợp với bộ lọc hiện tại.
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => (
                    <tr key={tx.id}>
                      <td className="time-sub">
                        {moment(tx.createdAt).format('DD/MM/YYYY HH:mm:ss')}
                      </td>
                      <td>
                        <div className="entity-cell">
                          <div className="entity-avatar">
                            {tx.wallet?.walletType === 'DOCTOR' ? <Coins size={14} /> : <User size={14} />}
                          </div>
                          <div className="entity-info">
                            <strong className="entity-name">
                              {[tx.wallet?.owner?.lastName, tx.wallet?.owner?.firstName].filter(Boolean).join(' ') || 'Hệ thống'}
                            </strong>
                            {tx.wallet?.owner?.email && (
                              <div className="entity-email" style={{ fontSize: '11px', color: '#64748B', lineHeight: '1.2', marginTop: '1px' }}>
                                {tx.wallet.owner.email}
                              </div>
                            )}
                            <div className="entity-sub" style={{ marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span className="font-mono" style={{ fontSize: '10px', background: '#F1F5F9', padding: '1px 5px', borderRadius: '4px', color: '#334155', fontWeight: 600 }}>
                                WAL-{String(tx.walletId).padStart(7, '0')}
                              </span>
                              <span style={{ fontSize: '10px', color: '#64748B' }}>
                                ({tx.wallet?.walletType === 'DOCTOR' ? 'BÁC SĨ' : tx.wallet?.walletType === 'PATIENT' ? 'BỆNH NHÂN' : tx.wallet?.walletType || 'VÍ'})
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="op-type-pill settlement">
                          {tx.transactionType || tx.type}
                        </span>
                      </td>
                      <td>
                        <span className={`ramp-pill ${tx.direction === 'CREDIT' ? 'success' : 'neutral'}`}>
                          {tx.direction === 'CREDIT' ? '+ Ghi Có (Credit)' : '- Ghi Nợ (Debit)'}
                        </span>
                      </td>
                      <td className="text-right">
                        <strong className={`ramp-tabular-num ${tx.direction === 'CREDIT' ? 'text-emerald' : 'text-body'}`}>
                          {tx.direction === 'CREDIT' ? '+' : '-'}{formatMoney(tx.amount)}
                        </strong>
                      </td>
                      <td className="text-right font-mono ramp-tabular-num">
                        {formatMoney(tx.balanceAfter)}
                      </td>
                      <td>
                        <div className="reference-cell">{tx.description || '—'}</div>
                        {tx.idempotencyKey && (
                          <div className="idempotency-key font-mono" title={tx.idempotencyKey}>
                            Key: {tx.idempotencyKey.slice(0, 16)}...
                          </div>
                        )}
                      </td>
                      <td className="text-right">
                        <button
                          type="button"
                          className="ramp-btn-ghost"
                          style={{ padding: '2px 8px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          onClick={() => handleOpenLineage(tx.id)}
                        >
                          <GitCommit size={12} />
                          <span>Vòng đời</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <RampPagination
            currentPage={txPage}
            totalPages={Math.ceil(txTotal / txLimit)}
            totalItems={txTotal}
            pageSize={txLimit}
            onPageChange={(p) => setTxPage(p)}
            itemLabel="bút toán"
          />
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SEGMENT 2: DANH BẠ TÀI KHOẢN VÍ (WALLETS)                           */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeSegment === 'WALLETS' && (
        <div className="segment-content">
          <div className="ramp-filter-toolbar">
            <div className="search-box-wrapper">
              <Search size={14} className="search-icon" />
              <input
                type="text"
                className="ramp-search-input"
                placeholder="⌘ K Tìm kiếm theo Tên, Email, SĐT, ID Ví..."
                value={walletSearch}
                onChange={(e) => {
                  setWalletSearch(e.target.value);
                  setWalletsPage(1);
                }}
              />
            </div>

            <div className="filters-right">
              <select
                className="ramp-select"
                value={walletStatusFilter}
                onChange={(e) => {
                  setWalletStatusFilter(e.target.value);
                  setWalletsPage(1);
                }}
              >
                <option value="ALL">Tất cả trạng thái ví</option>
                <option value="ACTIVE">Đang hoạt động (ACTIVE)</option>
                <option value="LOCKED">Đang bị khóa (LOCKED)</option>
              </select>
            </div>
          </div>

          <div className="ramp-table-wrapper">
            <table className="ramp-table">
              <thead>
                <tr>
                  <th>Mã Ví & Chủ sở hữu</th>
                  <th>Phân loại ví</th>
                  <th className="text-right">Số dư khả dụng</th>
                  <th className="text-right">Số dư đóng băng</th>
                  <th>Trạng thái</th>
                  <th>Ngày kích hoạt</th>
                  <th className="text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loadingWallets ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8">
                      <RotateCw size={16} className="tw-animate-spin tw-inline tw-mr-2" />
                      Đang đồng bộ danh bạ tài khoản ví...
                    </td>
                  </tr>
                ) : wallets.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-muted">
                      Không tìm thấy tài khoản ví nào phù hợp.
                    </td>
                  </tr>
                ) : (
                  wallets.map((w) => (
                    <tr key={w.id} className="cursor-pointer" onClick={() => setSelectedWallet(w)}>
                      <td>
                        <div className="entity-cell">
                          <div className="entity-avatar">
                            {w.walletType === 'DOCTOR' ? <Coins size={14} /> : <User size={14} />}
                          </div>
                          <div className="entity-info">
                            <strong className="entity-name">
                              {[w.owner?.lastName, w.owner?.firstName].filter(Boolean).join(' ') || 'Chưa cập nhật tên'}
                            </strong>
                            {w.owner?.email && (
                              <div className="entity-email" style={{ fontSize: '11px', color: '#64748B', lineHeight: '1.2', marginTop: '1px' }}>
                                {w.owner.email}
                              </div>
                            )}
                            <div className="entity-sub font-mono" style={{ fontSize: '10px', background: '#F1F5F9', padding: '1px 5px', borderRadius: '4px', color: '#334155', fontWeight: 600, display: 'inline-block', marginTop: '2px' }}>
                              WAL-{String(w.id).padStart(7, '0')}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`role-tag ${w.walletType === 'DOCTOR' ? 'doctor' : 'patient'}`}>
                          {w.walletType === 'DOCTOR' ? 'BÁC SĨ' : w.walletType === 'PATIENT' ? 'BỆNH NHÂN' : 'SÀN'}
                        </span>
                      </td>
                      <td className="text-right">
                        <strong className="ramp-tabular-num font-bold text-emerald">
                          {formatMoney(w.availableBalance)}
                        </strong>
                      </td>
                      <td className="text-right">
                        <span className="ramp-tabular-num font-mono text-muted">
                          {formatMoney(w.lockedBalance)}
                        </span>
                      </td>
                      <td>
                        <span className={`ramp-pill ${w.status === 'ACTIVE' ? 'success' : 'danger'}`}>
                          {w.status === 'ACTIVE' ? '● Đang hoạt động' : '🔒 Đã bị khóa'}
                        </span>
                      </td>
                      <td className="time-sub">
                        {moment(w.createdAt).format('DD/MM/YYYY')}
                      </td>
                      <td className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="actions-cell">
                          <button
                            type="button"
                            className="ramp-btn-ghost"
                            onClick={() => setSelectedWallet(w)}
                          >
                            Hồ sơ ví
                          </button>

                          <button
                            type="button"
                            className={`action-btn-lock ${w.status === 'ACTIVE' ? 'lock' : 'unlock'}`}
                            onClick={() => handleToggleWalletLock(w)}
                            disabled={actionLoadingId === w.id}
                            title={w.status === 'ACTIVE' ? 'Khóa ví người dùng' : 'Mở khóa ví'}
                          >
                            {w.status === 'ACTIVE' ? <Lock size={13} /> : <Unlock size={13} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <RampPagination
            currentPage={walletsPage}
            totalPages={Math.ceil(walletsTotal / walletsLimit)}
            totalItems={walletsTotal}
            pageSize={walletsLimit}
            onPageChange={(p) => setWalletsPage(p)}
            itemLabel="tài khoản ví"
          />
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SEGMENT 3: THAM SỐ CHÍNH SÁCH & DỰ TRỮ (SETTINGS)                 */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeSegment === 'SETTINGS' && (
        <div className="segment-content">
          <form onSubmit={handleSaveConfigs} className="settings-form-container">
            <div className="settings-grid">
              {/* Card 1: Quỹ dự trữ thanh khoản bắt buộc */}
              <div className="setting-card">
                <div className="card-header">
                  <ShieldCheck size={18} className="text-emerald" />
                  <div>
                    <h3 className="card-title">Tỷ Lệ Dự Trữ Thanh Khoản Bắt Buộc (LCR)</h3>
                    <p className="card-desc">
                      Tỷ lệ phần trăm tiền mặt bắt buộc phải giữ lại két tại mọi thời điểm để bảo chứng cho số dư khả dụng của bệnh nhân và thù lao bác sĩ.
                    </p>
                  </div>
                </div>
                <div className="card-input-row">
                  <input
                    type="number"
                    min="10"
                    max="100"
                    className="ramp-input"
                    value={inputReserveRatio}
                    onChange={(e) => setInputReserveRatio(e.target.value)}
                    required
                  />
                  <span className="unit-label">% Tiền mặt bảo chứng</span>
                </div>
              </div>

              {/* Card 2: Hạn mức rút tiền tối thiểu */}
              <div className="setting-card">
                <div className="card-header">
                  <Coins size={18} className="text-amber" />
                  <div>
                    <h3 className="card-title">Hạn Mức Rút Tiền Tối Thiểu (Min Payout)</h3>
                    <p className="card-desc">
                      Số tiền tối thiểu cho một lần tạo lệnh rút về Vietcombank nhằm hạn chế tình trạng spam lệnh rút nhỏ lẻ.
                    </p>
                  </div>
                </div>
                <div className="card-input-row">
                  <input
                    type="number"
                    min="10000"
                    step="10000"
                    className="ramp-input"
                    value={inputMinWithdraw}
                    onChange={(e) => setInputMinWithdraw(e.target.value)}
                    required
                  />
                  <span className="unit-label">VND / lượt</span>
                </div>
              </div>

              {/* Card 3: Thời hạn cam kết xử lý SLA */}
              <div className="setting-card">
                <div className="card-header">
                  <Clock size={18} className="text-indigo" />
                  <div>
                    <h3 className="card-title">Cam Kết Xử Lý Giải Ngân (SLA)</h3>
                    <p className="card-desc">
                      Thời hạn tối đa kể từ khi bác sĩ tạo lệnh rút tiền cho đến khi Admin phải hoàn tất chuyển khoản VCB.
                    </p>
                  </div>
                </div>
                <div className="card-input-row">
                  <input
                    type="number"
                    min="1"
                    max="72"
                    className="ramp-input"
                    value={inputSlaHours}
                    onChange={(e) => setInputSlaHours(e.target.value)}
                    required
                  />
                  <span className="unit-label">Giờ làm việc</span>
                </div>
              </div>

              {/* Card 4: Tỷ lệ phân bổ hoa hồng ca khám */}
              <div className="setting-card">
                <div className="card-header">
                  <Building2 size={18} className="text-teal" />
                  <div>
                    <h3 className="card-title">Tỷ Lệ Thù Lao Bác Sĩ (Platform Split)</h3>
                    <p className="card-desc">
                      Tỷ lệ phân chia mặc định khi ca khám hoàn tất (Hiện tại: 90% thù lao Bác sĩ / 10% Tiền lời sàn tích lũy).
                    </p>
                  </div>
                </div>
                <div className="card-input-row">
                  <input
                    type="number"
                    min="50"
                    max="99"
                    className="ramp-input"
                    value={inputDoctorShare}
                    onChange={(e) => setInputDoctorShare(e.target.value)}
                    required
                  />
                  <span className="unit-label">% Doanh thu ca khám</span>
                </div>
              </div>
            </div>

            <div className="settings-footer">
              <button
                type="submit"
                className="ramp-btn-primary"
                disabled={isSavingConfigs}
              >
                <Save size={14} />
                <span>{isSavingConfigs ? 'Đang lưu...' : 'Lưu Thay Đổi Chính Sách'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 4. DRAWER BÓC TÁCH HỒ SƠ TÀI KHOẢN VÍ (WALLET AUDIT DRAWER)       */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {selectedWallet && (
        <div className="ramp-drawer-backdrop" onClick={() => setSelectedWallet(null)}>
          <div className="ramp-drawer-panel" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div className="drawer-title-box">
                <h3 className="drawer-title">Hồ Sơ Tài Khoản Ví #{selectedWallet.id}</h3>
                <span className="drawer-sub">Chi tiết số dư, trạng thái và lịch sử biến động sổ cái</span>
              </div>
              <button
                type="button"
                className="drawer-close-btn"
                onClick={() => setSelectedWallet(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="drawer-body">
              {/* Thẻ người dùng */}
              <div className="wallet-user-card">
                <div className="user-avatar">
                  <User size={22} />
                </div>
                <div className="user-info">
                  <div className="user-name">
                    {selectedWallet.owner?.lastName} {selectedWallet.owner?.firstName}
                    <span className="role-tag doctor">{selectedWallet.walletType}</span>
                  </div>
                  <div className="user-email">{selectedWallet.owner?.email}</div>
                  <div className="user-phone">{selectedWallet.owner?.phoneNumber || 'Chưa cập nhật SĐT'}</div>
                </div>
              </div>

              {/* Khối số dư */}
              <div className="wallet-balances-grid">
                <div className="bal-box">
                  <span className="bal-label">Số dư khả dụng:</span>
                  <strong className="bal-val text-emerald ramp-tabular-num">
                    {formatMoney(selectedWallet.availableBalance)}
                  </strong>
                  <span className="bal-sub">Có thể dùng đặt lịch hoặc rút về VCB</span>
                </div>

                <div className="bal-box">
                  <span className="bal-label">Số dư đóng băng:</span>
                  <strong className="bal-val text-muted ramp-tabular-num">
                    {formatMoney(selectedWallet.lockedBalance)}
                  </strong>
                  <span className="bal-sub">Đang trong lệnh chờ Admin duyệt chi</span>
                </div>
              </div>

              {/* Trạng thái & nút khóa ví */}
              <div className="wallet-status-row">
                <div>
                  <div className="status-label">Trạng thái vận hành:</div>
                  <span className={`ramp-pill ${selectedWallet.status === 'ACTIVE' ? 'success' : 'danger'}`}>
                    {selectedWallet.status === 'ACTIVE' ? '● Đang hoạt động bình thường' : '🔒 Đã bị khóa bởi Admin'}
                  </span>
                </div>

                <button
                  type="button"
                  className={`ramp-btn-secondary ${selectedWallet.status === 'ACTIVE' ? 'text-red' : 'text-emerald'}`}
                  onClick={() => handleToggleWalletLock(selectedWallet)}
                  disabled={actionLoadingId === selectedWallet.id}
                >
                  {selectedWallet.status === 'ACTIVE' ? (
                    <>
                      <Lock size={13} />
                      <span>Khóa ví này</span>
                    </>
                  ) : (
                    <>
                      <Unlock size={13} />
                      <span>Mở khóa ví</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="drawer-footer">
              <button
                type="button"
                className="ramp-btn-primary"
                onClick={() => setSelectedWallet(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. DRAWER TRUY VẾT VÒNG ĐỜI GIAO DỊCH TOÀN VẸN (LINEAGE) */}
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

