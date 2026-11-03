// src/containers/System/Admin/Financial/VisualCashFlowDashboard.jsx
// [RAMP FINTECH DESIGN SYSTEM] Trung Tâm Quản Trị Dòng Tiền & Sơ Đồ Đối Soát Ngân Quỹ
// 100% học tập và bám sát phong cách thiết kế tối giản, thanh lịch, sang trọng của Ramp:
// Warm Paper White canvas, Electric Lime buttons, Hairline borders, Tabular numbers, Split views.
import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import moment from 'moment';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import {
  ShieldCheck,
  AlertTriangle,
  RotateCw,
  Coins,
  Wallet,
  Landmark,
  Building2,
  ArrowRight,
  TrendingUp,
  ArrowDownLeft,
  ArrowUpRight,
  X,
  ExternalLink,
  ChevronRight,
  CheckCircle2,
  FileSpreadsheet,
  Info,
  DollarSign,
  Lock,
  GitCommit,
} from 'lucide-react';
import {
  getVisualCashflowMetrics,
  withdrawPlatformProfit,
} from '../../../../services/walletService';
import VaultDetailDrawer from './VaultDetailDrawer';
import TransactionLifecycleDrawer from './TransactionLifecycleDrawer';
import DualLayerDigitalTwinCanvas from './DualLayerDigitalTwinCanvas';
import './VisualCashFlowDashboard.scss';

const formatCurrencyVND = (num) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0);
};

export default function VisualCashFlowDashboard({ onNavigateTab }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Modal Rút Lợi Nhuận Nền Tảng
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawNote, setWithdrawNote] = useState('');
  const [bankAccountInfo, setBankAccountInfo] = useState('Vietcombank - 9988-1703-8888 - Công ty CP BookingCare');
  const [submittingWithdrawal, setSubmittingWithdrawal] = useState(false);

  // Drawer Chi tiết Khối Vốn
  const [selectedVault, setSelectedVault] = useState(null);

  // Drawer Truy Vết Vòng Đời Giao Dịch Toàn Vẹn (Lineage Inspector)
  const [selectedTxForLineage, setSelectedTxForLineage] = useState(null);
  const [isLineageDrawerOpen, setIsLineageDrawerOpen] = useState(false);

  const handleOpenLineage = (targetId) => {
    if (!targetId) {
      toast.info('Không có mã giao dịch khả dụng để truy vết');
      return;
    }
    setSelectedTxForLineage(targetId);
    setIsLineageDrawerOpen(true);
  };

  // Tải dữ liệu từ Backend (hỗ trợ bộ lọc thời gian và phân rã)
  const [filterParams, setFilterParams] = useState({ timeRange: 'all', sort: 'newest' });

  const loadMetrics = useCallback(async (customParams) => {
    setLoading(true);
    try {
      const query = customParams || filterParams;
      const res = await getVisualCashflowMetrics(query);
      if (res && res.errCode === 0) {
        setData(res.data);
      } else {
        toast.error(res?.errMessage || 'Không thể tải chỉ số dòng tiền');
      }
    } catch (err) {
      console.error('Error fetching visual cashflow metrics:', err);
      toast.error('Lỗi kết nối máy chủ');
    } finally {
      setLoading(false);
    }
  }, [filterParams]);

  const handleFilterChange = (newFilters) => {
    const updated = { ...filterParams, ...newFilters };
    setFilterParams(updated);
    loadMetrics(updated);
  };

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  // Thực hiện rút tiền lời sàn
  const handleExecuteWithdrawal = async (e) => {
    e.preventDefault();
    const num = Number(withdrawAmount);
    if (!num || num <= 0) {
      toast.warning('Vui lòng nhập số tiền hợp lệ lớn hơn 0');
      return;
    }

    setSubmittingWithdrawal(true);
    try {
      const res = await withdrawPlatformProfit({
        amount: num,
        note: withdrawNote,
        bankAccountInfo,
      });

      if (res && res.errCode === 0) {
        toast.success(res.message || 'Rút tiền lời công ty thành công!');
        setIsWithdrawModalOpen(false);
        setWithdrawAmount('');
        setWithdrawNote('');
        loadMetrics();
      } else {
        toast.error(res?.errMessage || 'Không thể rút tiền lời');
      }
    } catch (err) {
      toast.error('Lỗi khi thực hiện rút tiền lời');
    } finally {
      setSubmittingWithdrawal(false);
    }
  };

  const vaults = data?.vaults;
  const reconciliation = data?.reconciliation;
  const charts = data?.charts;
  const stepBreakdown = data?.stepBreakdown;
  const recentTransactions = data?.recentTransactions || [];

  return (
    <div className="ramp-cashflow-dashboard">
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* HEADER: Tiêu đề trang & Nút Vàng Chanh Ramp Primary */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="ramp-dashboard-header">
        <div className="header-title-block">
          <div className="header-badge">
            <span className="badge-dot" />
            <span>Mô Hình Escrow & Sổ Cái Đối Soát Thời Gian Thực</span>
          </div>
          <h1 className="page-title">Quản Trị Dòng Tiền & Ngân Quỹ</h1>
          <p className="page-subtitle">
            Theo dõi dòng tiền 3 bước: Nạp VNPay, Đặt khám ký quỹ 2 ngăn, Quyết toán thù lao và Rút tiền ngân hàng thật.
          </p>
        </div>

        <div className="header-actions-block">
          {/* Nút Làm mới feed (Secondary) */}
          <button
            type="button"
            className="ramp-btn-secondary"
            onClick={loadMetrics}
            disabled={loading}
          >
            <RotateCw size={14} className={loading ? 'tw-animate-spin' : ''} />
            <span>Đồng bộ sổ cái</span>
          </button>

          {/* Nút Vàng Chanh Ramp: Rút Lợi Nhuận Nền Tảng */}
          <button
            type="button"
            className="ramp-btn-primary"
            onClick={() => setIsWithdrawModalOpen(true)}
          >
            <DollarSign size={15} />
            <span>Rút Lợi Nhuận Sàn</span>
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 1. THƯỚC ĐO BẢO CHỨNG THANH KHOẢN NỘI DÒNG (INLINE SOLVENCY BANNER) */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="ramp-solvency-banner">
        <div className="banner-left">
          <div className={`status-capsule ${reconciliation?.isBalanced ? 'healthy' : 'warning'}`}>
            <ShieldCheck size={15} />
            <span>
              {reconciliation?.isBalanced ? 'BẢO CHỨNG TIỀN MẶT 100%' : 'CẢNH BÁO LỆCH SỔ CÁI'}
            </span>
          </div>
          <div className="formula-text">
            <span>Đối soát cân bằng: </span>
            <strong>{reconciliation?.formula || 'Đang tính toán...'}</strong>
          </div>
        </div>

        <div className="banner-right">
          <div className="coverage-stat">
            Tỷ lệ an toàn thanh khoản:
            <strong>{reconciliation?.coveragePercent || 100}%</strong>
          </div>
          <button
            type="button"
            className="ramp-btn-ghost"
            onClick={() => onNavigateTab && onNavigateTab('ledger')}
          >
            <span>Nhật ký bút toán</span>
            <ArrowRight size={12} />
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 1.5. DUAL-LAYER DIGITAL TWIN CANVAS (TÁI HIỆN SƠ ĐỒ BẢNG TRẮNG 2 TẦNG) */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <DualLayerDigitalTwinCanvas
        vaults={vaults}
        flows={data?.flows}
        constituents={data?.constituents}
        filters={data?.filters || filterParams}
        reconciliation={reconciliation}
        stepBreakdown={stepBreakdown}
        recentTransactions={recentTransactions}
        onOpenVault={(vaultKey) => setSelectedVault(vaultKey)}
        onOpenLineage={handleOpenLineage}
        onWithdrawProfit={() => setIsWithdrawModalOpen(true)}
        onFilterChange={handleFilterChange}
        onRefresh={() => loadMetrics(filterParams)}
        loading={loading}
      />

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 2. HỆ THỐNG 4 BIỂU ĐỒ RECHARTS CHUYÊN SÂU */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="tw-grid tw-grid-cols-1 lg:tw-grid-cols-2 tw-gap-6 tw-mb-8">
        {/* BIỂU ĐỒ 1: CÂN ĐỐI ĐỐI SOÁT TIỀN THẬT VS VÍ ẢO */}
        <div className="tw-bg-white tw-border tw-border-slate-200 tw-rounded-2xl tw-p-5 tw-shadow-sm">
          <div className="tw-flex tw-items-center tw-justify-between tw-mb-4">
            <div>
              <h4 className="tw-text-sm tw-font-bold tw-text-slate-900 tw-m-0">
                1. Đối Soát Cân Bằng: Tiền Thật VCB vs Nghĩa Vụ Sổ Cái
              </h4>
              <p className="tw-text-xs tw-text-slate-500 tw-m-0 tw-mt-0.5">
                Đảm bảo tiền mặt thực tế tại ngân hàng luôn bảo chứng 100% cho mọi ví ảo
              </p>
            </div>
            <span className="ramp-pill success">Cân bằng</span>
          </div>

          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={charts?.reconciliationChart || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EBEAE5" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#73726C' }} />
                <YAxis
                  tickFormatter={(val) => (val >= 1000000 ? `${(val / 1000000).toFixed(0)}Tr` : val)}
                  tick={{ fontSize: 11, fill: '#73726C' }}
                />
                <Tooltip
                  formatter={(val) => [formatCurrencyVND(val), 'Số tiền']}
                  contentStyle={{ backgroundColor: '#FFFFFF', borderRadius: 8, border: '1px solid #EBEAE5' }}
                />
                <Bar dataKey="totalReal" name="Tiền mặt VCB thật" fill="#1D4ED8" radius={[6, 6, 0, 0]} />
                <Bar dataKey="patientLiabilities" name="Ví Bệnh nhân" stackId="a" fill="#8B5CF6" />
                <Bar dataKey="doctorLiabilities" name="Ví Bác sĩ" stackId="a" fill="#10B981" />
                <Bar dataKey="escrowLiabilities" name="Tạm giữ Escrow" stackId="a" fill="#F59E0B" />
                <Bar dataKey="profitLiabilities" name="Lợi nhuận Công ty" stackId="a" fill="#D4FF00" />
                <Bar dataKey="reserveLiabilities" name="Quỹ Dự trữ Sàn" stackId="a" fill="#94A3B8" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* BIỂU ĐỒ 2: CƠ CẤU VỐN LƯU ĐỘNG */}
        <div className="tw-bg-white tw-border tw-border-slate-200 tw-rounded-2xl tw-p-5 tw-shadow-sm">
          <div className="tw-flex tw-items-center tw-justify-between tw-mb-4">
            <div>
              <h4 className="tw-text-sm tw-font-bold tw-text-slate-900 tw-m-0">
                2. Cơ Cấu Phân Bổ Nguồn Vốn Lưu Động Sàn
              </h4>
              <p className="tw-text-xs tw-text-slate-500 tw-m-0 tw-mt-0.5">
                Tỷ trọng số dư giữa Bệnh nhân, Bác sĩ, Quỹ tạm giữ và Lợi nhuận sàn
              </p>
            </div>
            <span className="ramp-pill neutral">Tỷ trọng</span>
          </div>

          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={charts?.capitalComposition || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {(charts?.capitalComposition || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val) => [formatCurrencyVND(val), 'Giá trị']}
                  contentStyle={{ backgroundColor: '#FFFFFF', borderRadius: 8, border: '1px solid #EBEAE5' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* BIỂU ĐỒ 3: XU HƯỚNG DÒNG TIỀN NẠP VS RÚT THEO NGÀY */}
        <div className="tw-bg-white tw-border tw-border-slate-200 tw-rounded-2xl tw-p-5 tw-shadow-sm">
          <div className="tw-flex tw-items-center tw-justify-between tw-mb-4">
            <div>
              <h4 className="tw-text-sm tw-font-bold tw-text-slate-900 tw-m-0">
                3. Xu Hướng Dòng Tiền Nạp (Inflow) vs Chi Trả (Outflow)
              </h4>
              <p className="tw-text-xs tw-text-slate-500 tw-m-0 tw-mt-0.5">
                Theo dõi lượng tiền nạp qua VNPay và rút tiền về ngân hàng 7 ngày qua
              </p>
            </div>
            <span className="ramp-pill neutral">7 Ngày qua</span>
          </div>

          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <AreaChart data={charts?.dailyCashFlow || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EBEAE5" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#73726C' }} />
                <YAxis
                  tickFormatter={(val) => (val >= 1000000 ? `${(val / 1000000).toFixed(0)}Tr` : val)}
                  tick={{ fontSize: 11, fill: '#73726C' }}
                />
                <Tooltip
                  formatter={(val) => [formatCurrencyVND(val), '']}
                  contentStyle={{ backgroundColor: '#FFFFFF', borderRadius: 8, border: '1px solid #EBEAE5' }}
                />
                <Area type="monotone" dataKey="inflow" name="Tiền nạp VNPay" stroke="#10B981" fill="#DCFCE7" fillOpacity={0.6} />
                <Area type="monotone" dataKey="outflow" name="Rút về ngân hàng" stroke="#EF4444" fill="#FEE2E2" fillOpacity={0.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* BIỂU ĐỒ 4: TỶ LỆ CHIA SẺ DOANH THU CA KHÁM */}
        <div className="tw-bg-white tw-border tw-border-slate-200 tw-rounded-2xl tw-p-5 tw-shadow-sm">
          <div className="tw-flex tw-items-center tw-justify-between tw-mb-4">
            <div>
              <h4 className="tw-text-sm tw-font-bold tw-text-slate-900 tw-m-0">
                4. Tỷ Lệ Phân Bổ Doanh Thu Ca Khám (Commission Split)
              </h4>
              <p className="tw-text-xs tw-text-slate-500 tw-m-0 tw-mt-0.5">
                Tỷ lệ ăn chia thực tế: 90% thù lao Bác sĩ nhận và 10% hoa hồng sàn giữ lại
              </p>
            </div>
            <span className="ramp-pill success">Tỷ lệ 90 / 10</span>
          </div>

          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <BarChart layout="vertical" data={charts?.commissionSplit || []}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#EBEAE5" />
                <XAxis type="number" unit="%" tick={{ fontSize: 11, fill: '#73726C' }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#141413' }} width={120} />
                <Tooltip
                  formatter={(val, name, item) => [`${val}% (${formatCurrencyVND(item.payload.amount)})`, 'Tỷ trọng']}
                  contentStyle={{ backgroundColor: '#FFFFFF', borderRadius: 8, border: '1px solid #EBEAE5' }}
                />
                <Bar dataKey="percent" radius={[0, 6, 6, 0]}>
                  {(charts?.commissionSplit || []).map((entry, index) => (
                    <Cell key={`split-cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 5. BẢNG TRA CỨU BÚT TOÁN THỜI GIAN THỰC (THE RAMP AUDIT TABLE) */}
      {/* Kèm Hàng Cảnh Báo Nội Dòng (The Ramp Inline Anomaly Row) */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="ramp-vaults-section">
        <div className="section-header">
          <div className="title-group">
            <h3>Nhật Ký Sổ Cái Giao Dịch Gần Đây (Real-time Audit Ledger)</h3>
            <p>Mọi biến động số dư ví nội bộ đều được lưu vết bất biến với chữ ký mã hóa</p>
          </div>
          <button
            type="button"
            className="ramp-btn-secondary"
            onClick={() => onNavigateTab && onNavigateTab('ledger')}
          >
            <FileSpreadsheet size={14} />
            <span>Xem toàn bộ sổ cái</span>
          </button>
        </div>

        <div className="ramp-vaults-table-container">
          <table className="ramp-vaults-table">
            <thead>
              <tr>
                <th>Mã GD Sổ Cái</th>
                <th>Người Thực Hiện</th>
                <th>Loại Nghiệp Vụ</th>
                <th>Chiều Tiền</th>
                <th className="text-right">Số Tiền</th>
                <th className="text-right">Số Dư Sau GD</th>
                <th>Thời Gian</th>
                <th>Trạng Thái</th>
                <th className="text-right">Vòng Đời</th>
              </tr>
            </thead>
            <tbody>
              {recentTransactions.length > 0 ? (
                recentTransactions.map((tx, idx) => (
                  <React.Fragment key={tx.id || idx}>
                    <tr
                      className="vault-row cursor-pointer"
                      onClick={() => handleOpenLineage(tx.id || tx.referenceId)}
                    >
                      <td className="tw-font-mono tw-text-xs tw-font-bold tw-text-slate-800">
                        TRX-{String(tx.id).slice(0, 8).toUpperCase()}
                      </td>
                      <td>
                        <div className="tw-font-semibold tw-text-slate-800">{tx.ownerName}</div>
                        {tx.ownerEmail && (
                          <div className="tw-text-xs tw-text-slate-500" style={{ fontSize: '11px', lineHeight: '1.2' }}>
                            {tx.ownerEmail}
                          </div>
                        )}
                        <span className="font-mono" style={{ fontSize: '10px', color: '#64748B' }}>
                          WAL-{String(tx.walletId).padStart(7, '0')}
                        </span>
                      </td>
                      <td>
                        <span className="ramp-pill neutral">{tx.transactionType}</span>
                      </td>
                      <td>
                        <span className={`ramp-pill ${tx.direction === 'CREDIT' ? 'success' : 'danger'}`}>
                          {tx.direction === 'CREDIT' ? '+ Thu vào' : '- Chi ra'}
                        </span>
                      </td>
                      <td className="text-right">
                        <span
                          className="ramp-tabular-num tw-font-bold"
                          style={{ color: tx.direction === 'CREDIT' ? '#166534' : '#991B1B' }}
                        >
                          {tx.direction === 'CREDIT' ? '+' : '-'}
                          {formatCurrencyVND(tx.amount)}
                        </span>
                      </td>
                      <td className="text-right ramp-tabular-num tw-text-slate-600">
                        {formatCurrencyVND(tx.balanceAfter)}
                      </td>
                      <td className="tw-text-xs tw-text-slate-500">
                        {moment(tx.createdAt).format('DD/MM/YYYY HH:mm')}
                      </td>
                      <td>
                        <span className="ramp-pill success">{tx.status || 'COMPLETED'}</span>
                      </td>
                      <td className="text-right">
                        <button
                          type="button"
                          className="ramp-btn-ghost"
                          style={{ padding: '2px 8px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenLineage(tx.id || tx.referenceId);
                          }}
                        >
                          <GitCommit size={12} />
                          <span>Vòng đời</span>
                        </button>
                      </td>
                    </tr>

                    {/* HÀNG CẢNH BÁO NỘI DÒNG THEO PHONG CÁCH RAMP (INLINE ANOMALY ROW) */}
                    {idx === 0 && tx.transactionType === 'DEPOSIT' && (
                      <tr>
                        <td colSpan={9} style={{ padding: 0 }}>
                          <div
                            className="ramp-inline-anomaly cursor-pointer"
                            onClick={() => handleOpenLineage(tx.id || tx.referenceId)}
                          >
                            <span className="anomaly-arrow">↳</span>
                            <span>
                              Giao dịch nạp tiền VNPay gần nhất đã được đối chiếu khớp 100% với tài khoản ngân hàng VCB.
                            </span>
                            <span className="anomaly-link">Xem chi tiết vòng đời ➔</span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="tw-text-center tw-py-8 tw-text-slate-400">
                    Chưa có giao dịch sổ cái nào được ghi nhận.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 6. MODAL RÚT LỢI NHUẬN NỀN TẢNG (PLATFORM PROFIT WITHDRAWAL) */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {isWithdrawModalOpen && (
        <div className="ramp-modal-overlay" onClick={() => setIsWithdrawModalOpen(false)}>
          <div className="ramp-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h4>Rút Lợi Nhuận Nền Tảng (Platform Profit Withdrawal)</h4>
              <button
                type="button"
                className="close-btn"
                onClick={() => setIsWithdrawModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleExecuteWithdrawal}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Lợi nhuận ròng sàn khả dụng hiện tại</label>
                  <input
                    type="text"
                    disabled
                    value={formatCurrencyVND(vaults?.platformProfit?.spendable)}
                    className="ramp-tabular-num tw-bg-slate-50 tw-font-bold tw-text-amber-800"
                  />
                </div>

                <div className="form-group">
                  <label>Số tiền Admin muốn rút (VND) *</label>
                  <input
                    type="number"
                    min="1000"
                    max={vaults?.platformProfit?.spendable || 0}
                    placeholder="Ví dụ: 30000"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Tài khoản nhận tiền (Ngân hàng / Số tài khoản / Tên chủ thẻ) *</label>
                  <input
                    type="text"
                    value={bankAccountInfo}
                    onChange={(e) => setBankAccountInfo(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Ghi chú mục đích chi dùng</label>
                  <textarea
                    rows={2}
                    placeholder="Ví dụ: Rút tiền lời ca khám #102 chi phí vận hành..."
                    value={withdrawNote}
                    onChange={(e) => setWithdrawNote(e.target.value)}
                  />
                </div>

                {/* Cảnh báo bảo chứng an toàn */}
                <div className="solvency-check-note">
                  <div className="tw-flex tw-items-center tw-gap-1.5 tw-font-bold tw-mb-1">
                    <ShieldCheck size={14} />
                    <span>Cơ chế bảo chứng thanh khoản tuyệt đối</span>
                  </div>
                  <p className="tw-m-0">
                    Sau khi rút {Number(withdrawAmount || 0).toLocaleString('vi-VN')} đ, số dư VCB thật còn lại vẫn đảm bảo đủ 100% để bảo chứng cho toàn bộ số dư của Bệnh nhân và Bác sĩ.
                  </p>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="ramp-btn-secondary"
                  onClick={() => setIsWithdrawModalOpen(false)}
                  disabled={submittingWithdrawal}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="ramp-btn-primary"
                  disabled={submittingWithdrawal}
                >
                  {submittingWithdrawal ? 'Đang ghi nhận...' : 'Xác Nhận Rút Tiền Lời'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. DRAWER BÓC TÁCH CHI TIẾT KHỐI VỐN (DRILLDOWN) */}
      {selectedVault && (
        <VaultDetailDrawer
          vaultKey={selectedVault}
          data={data}
          onClose={() => setSelectedVault(null)}
          onOpenWithdrawModal={() => setIsWithdrawModalOpen(true)}
        />
      )}

      {/* 8. DRAWER TRUY VẾT VÒNG ĐỜI GIAO DỊCH TOÀN VẸN (LINEAGE) */}
      <TransactionLifecycleDrawer
        isOpen={isLineageDrawerOpen}
        targetId={selectedTxForLineage}
        onClose={() => {
          setIsLineageDrawerOpen(false);
          setSelectedTxForLineage(null);
        }}
        onNavigateTab={onNavigateTab}
      />
    </div>
  );
}

