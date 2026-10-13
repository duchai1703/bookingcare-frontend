// src/containers/System/Admin/Financial/MasterTreasuryConsole.jsx
// Trung Tâm Chỉ Huy Ngân Quỹ & Điều Phối Dòng Tiền Tự Động Toàn Sàn (Financial Master Hub / Executive Treasury Console)
// Thiết kế chuẩn Enterprise FinTech: Sắc nét, Dense, Tabular-nums, Modal xác nhận đa giai đoạn (Tuyệt đối không dùng window.confirm).
import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import moment from 'moment';
import {
  Eye,
  RotateCw,
  Zap,
  ShieldCheck,
  CheckCircle2,
  Coins,
  Wallet,
  Building2,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Play,
  FileSpreadsheet,
  Clock,
  Sparkles,
  Layers,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  ExternalLink,
  ChevronRight,
  Database
} from 'lucide-react';
import {
  getMasterTreasuryOverview,
  runMasterAutomationCycle
} from '../../../../services/walletService';

export default function MasterTreasuryConsole({ onNavigateTab }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Master Automation Modal State
  const [isMasterModalOpen, setIsMasterModalOpen] = useState(false);
  const [isRunningMaster, setIsRunningMaster] = useState(false);
  const [masterReport, setMasterReport] = useState(null);
  

  // Real-time Feed Pagination, Filter & Traceability State
  const [feedPage, setFeedPage] = useState(1);
  const [feedLimit, setFeedLimit] = useState(8);
  const [feedFilter, setFeedFilter] = useState('ALL');
  const [selectedTxDetail, setSelectedTxDetail] = useState(null);

  const formatMoney = (val) => (Number(val) || 0).toLocaleString('vi-VN') + ' ₫';

  const loadOverview = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMasterTreasuryOverview();
      if (res && res.errCode === 0) {
        setData(res.data);
      } else {
        toast.error(res?.errMessage || 'Không thể tải tổng quan ngân quỹ');
      }
    } catch (err) {
      console.error('Error fetching master overview:', err);
      toast.error('Lỗi khi tải tổng quan ngân quỹ toàn sàn');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  // Kích hoạt chu trình tài chính toàn diện
  const handleExecuteMasterCycle = async () => {
    setIsRunningMaster(true);
    try {
      const res = await runMasterAutomationCycle();
      if (res && res.errCode === 0) {
        toast.success(res.message || 'Chu trình toàn diện hoàn tất!');
        setMasterReport(res.data);
        await loadOverview();
      } else {
        toast.warn(res?.message || res?.errMessage || 'Không thể thực thi chu trình toàn diện');
      }
    } catch (err) {
      toast.error(err.response?.data?.errMessage || err.message || 'Lỗi khi kích hoạt chu trình toàn diện');
    } finally {
      setIsRunningMaster(false);
    }
  };

  

  const treasury = data?.treasury || {};
  // Ẩn thẻ hàng đợi ngoại lệ theo yêu cầu, chỉ hiển thị 3 nhánh nghiệp vụ thực tế
  const matrix = (data?.readinessMatrix || []).filter((item) => item.id !== 'exceptions');
  const engine = data?.automationEngine || {};

  const recentFlow = data?.recentCashFlow || [];

  return (
    <div className="master-treasury-console tw-space-y-6">
      {/* ── 1. THANH ĐIỀU PHỐI & THANH QUYẾT TOÁN NGÂN QUỸ (ENTERPRISE TREASURY CONTROLLER) ── */}
      <div className="tw-bg-white tw-rounded-2xl tw-p-5 tw-border tw-border-slate-200/90 tw-shadow-sm tw-flex tw-flex-col lg:tw-flex-row lg:tw-items-center lg:tw-justify-between tw-gap-4">
        <div className="tw-space-y-1.5">
          <div className="tw-flex tw-items-center tw-gap-3">
            <div className="tw-w-10 tw-h-10 tw-rounded-xl tw-bg-slate-100 tw-text-slate-800 tw-flex tw-items-center tw-justify-center tw-border tw-border-slate-200/60">
              <Layers size={20} />
            </div>
            <div>
              <div className="tw-flex tw-items-center tw-gap-2.5">
                <h2 className="tw-font-bold tw-text-base tw-text-slate-900 tw-m-0 tw-tracking-tight">
                  Điều Phối & Quyết Toán Dòng Tiền Toàn Sàn
                </h2>
                <span className="tw-inline-flex tw-items-center tw-gap-1.5 tw-px-2.5 tw-py-0.5 tw-bg-emerald-50 tw-border tw-border-emerald-200 tw-text-emerald-700 tw-text-3xs tw-font-semibold tw-rounded-full">
                  <span className="tw-w-1.5 tw-h-1.5 tw-rounded-full tw-bg-emerald-500 tw-animate-pulse" />
                  Hệ thống sẵn sàng T+0
                </span>
              </div>
              <p className="tw-text-xs tw-text-slate-500 tw-m-0 tw-mt-0.5">
                Quy trình tự động hóa liên hoàn: Quyết toán thù lao bác sĩ, phê duyệt giải ngân rút tiền và xử lý hồ sơ hoàn tiền theo SLA.
              </p>
            </div>
          </div>
        </div>

        <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-2.5">
          {/* Nút Làm Mới */}
          <button
            type="button"
            className="tw-px-3.5 tw-py-2.5 tw-bg-white hover:tw-bg-slate-50 tw-text-slate-700 tw-rounded-xl tw-text-xs tw-font-semibold tw-border tw-border-slate-200 tw-flex tw-items-center tw-gap-1.5 tw-cursor-pointer tw-transition hover:tw-border-slate-300"
            onClick={loadOverview}
            disabled={loading}
          >
            <RotateCw size={14} className={loading ? 'tw-animate-spin' : ''} />
            <span>Đồng bộ số liệu</span>
          </button>

          {/* Nút Thực thi Chu trình */}
          <button
            type="button"
            className="tw-px-4 tw-py-2.5 tw-bg-slate-900 hover:tw-bg-slate-800 active:tw-scale-[0.99] tw-text-white tw-rounded-xl tw-text-xs tw-font-semibold tw-border tw-border-slate-800 tw-flex tw-items-center tw-gap-2 tw-shadow-sm tw-cursor-pointer tw-transition disabled:tw-opacity-50"
            disabled={isRunningMaster || loading}
            onClick={() => {
              setMasterReport(null);
              setIsMasterModalOpen(true);
            }}
          >
            <Play size={13} className="tw-fill-white" />
            <span>Thực Thi Chu Trình Thanh Quyết Toán</span>
          </button>
        </div>
      </div>


      {/* ── 2. MA TRẬN SẴN SÀNG XỬ LÝ 3 NHÁNH NGHIỆP VỤ (PROCESSING READINESS MATRIX) ── */}
      <div className="tw-bg-white tw-rounded-3xl tw-p-6 tw-border tw-border-slate-200 tw-shadow-sm">

        <div className="tw-flex tw-flex-col sm:tw-flex-row sm:tw-items-center sm:tw-justify-between tw-gap-2 tw-mb-4 tw-border-b tw-border-slate-100 tw-pb-4">
          <div>
            <h3 className="tw-font-bold tw-text-base tw-text-slate-900 tw-m-0">
              Ma Trận Sẵn Sàng Xử Lý Các Nhánh Nghiệp Vụ
            </h3>
            <p className="tw-text-xs tw-text-slate-500 tw-m-0 tw-mt-0.5">
              Theo dõi khối lượng công việc đang chờ ở từng phân hệ và thực hiện điều hướng nhanh hoặc tự động hóa.
            </p>
          </div>
          <span className="tw-text-xs tw-text-slate-500">
            Trạng thái tự động: <strong className="tw-text-emerald-700">T+0 Sẵn Sàng</strong>
          </span>
        </div>

        <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-3 lg:tw-grid-cols-3 tw-gap-4">
          {matrix.map((row) => (
            <div
              key={row.id}
              className="tw-p-4 tw-rounded-2xl tw-border tw-border-slate-200 hover:tw-border-slate-300 tw-transition tw-bg-slate-50/50 tw-flex tw-flex-col tw-justify-between"
            >
              <div>
                <div className="tw-flex tw-justify-between tw-items-start tw-mb-2">
                  <span
                    className={`tw-px-2 tw-py-0.5 tw-rounded-md tw-text-3xs tw-font-bold tw-uppercase tw-border ${
                      row.badgeColor === 'emerald'
                        ? 'tw-bg-emerald-50 tw-text-emerald-700 tw-border-emerald-200'
                        : row.badgeColor === 'blue'
                        ? 'tw-bg-blue-50 tw-text-blue-700 tw-border-blue-200'
                        : row.badgeColor === 'purple'
                        ? 'tw-bg-purple-50 tw-text-purple-700 tw-border-purple-200'
                        : row.badgeColor === 'rose'
                        ? 'tw-bg-rose-50 tw-text-rose-700 tw-border-rose-200'
                        : 'tw-bg-slate-100 tw-text-slate-600 tw-border-slate-200'
                    }`}
                  >
                    {row.badge}
                  </span>
                  <span className="tw-font-mono tw-font-bold tw-text-sm tw-text-slate-800">
                    {row.pendingCount} việc
                  </span>
                </div>

                <h4 className="tw-font-bold tw-text-sm tw-text-slate-900 tw-m-0">
                  {row.name}
                </h4>
                <p className="tw-text-2xs tw-text-slate-500 tw-mt-1 tw-mb-3">
                  {row.desc}
                </p>

                {row.pendingAmount > 0 && (
                  <div className="tw-p-2.5 tw-bg-white tw-rounded-xl tw-border tw-border-slate-100 tw-mb-3">
                    <span className="tw-text-3xs tw-text-slate-400 tw-block">Giá trị chờ xử lý:</span>
                    <strong className="tw-text-sm tw-font-mono tw-text-slate-900" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {formatMoney(row.pendingAmount)}
                    </strong>
                  </div>
                )}
              </div>

              <div className="tw-pt-2 tw-border-t tw-border-slate-200/60">
                <button
                  type="button"
                  className="tw-w-full tw-py-2 tw-px-3 tw-bg-white hover:tw-bg-slate-100 tw-text-slate-700 hover:tw-text-indigo-600 tw-rounded-xl tw-text-xs tw-font-semibold tw-border tw-border-slate-200 tw-cursor-pointer tw-flex tw-items-center tw-justify-between tw-transition"
                  onClick={() => {
                    let dest = row.targetTab;
                    if (dest === 'settlements') dest = 'doctor-settlements';
                    if (dest === 'refunds') dest = 'refund-cases';
                    if (dest === 'overview') dest = 'solvency';
                    if (onNavigateTab) onNavigateTab(dest);
                  }}
                >
                  <span>Mở phân hệ chi tiết</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 4. SỔ CÁI & DÒNG TIỀN THỜI GIAN THỰC GẦN NHẤT (GLOBAL CASH FLOW FEED) ── */}
      <div className="tw-bg-white tw-rounded-3xl tw-p-6 tw-border tw-border-slate-200 tw-shadow-sm tw-space-y-4">
        <div className="tw-flex tw-flex-col sm:tw-flex-row sm:tw-items-center sm:tw-justify-between tw-gap-3 tw-border-b tw-border-slate-100 tw-pb-4">
          <div className="tw-flex tw-items-center tw-gap-2.5">
            <div className="tw-w-8 tw-h-8 tw-rounded-xl tw-bg-indigo-50 tw-text-indigo-600 tw-flex tw-items-center tw-justify-center">
              <FileSpreadsheet size={18} />
            </div>
            <div>
              <h3 className="tw-font-bold tw-text-base tw-text-slate-900 tw-m-0">
                Biến Động Dòng Tiền & Bút Toán Kép Thời Gian Thực
              </h3>
              <p className="tw-text-2xs tw-text-slate-500 tw-m-0 tw-mt-0.5">
                Nhật ký sổ cái bất biến ghi nhận mọi giao dịch luân chuyển vốn toàn sàn
              </p>
            </div>
          </div>

          <div className="tw-flex tw-items-center tw-gap-2">
            <button
              type="button"
              className="tw-px-3 tw-py-1.5 tw-bg-slate-100 hover:tw-bg-slate-200 tw-text-slate-700 tw-rounded-xl tw-text-xs tw-font-semibold tw-border tw-border-slate-200 tw-flex tw-items-center tw-gap-1.5 tw-cursor-pointer tw-transition"
              onClick={loadOverview}
              disabled={loading}
              title="Cập nhật dòng tiền mới nhất"
            >
              <RotateCw size={13} className={loading ? 'tw-animate-spin' : ''} />
              <span>Làm mới feed</span>
            </button>

            <button
              type="button"
              className="tw-px-3 tw-py-1.5 tw-text-xs tw-font-bold tw-text-indigo-600 hover:tw-text-indigo-800 tw-bg-indigo-50 hover:tw-bg-indigo-100 tw-rounded-xl tw-border tw-border-indigo-200 tw-flex tw-items-center tw-gap-1 tw-cursor-pointer tw-transition"
              onClick={() => onNavigateTab && onNavigateTab('ledger')}
            >
              <span>Toàn bộ Sổ Cái</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-2 tw-pt-1">
          <div className="tw-flex tw-flex-wrap tw-gap-1.5">
            {[
              { id: 'ALL', label: 'Tất cả nghiệp vụ' },
              { id: 'DOCTOR_SETTLEMENT', label: 'Quyết toán BS' },
              { id: 'REFUND', label: 'Hoàn tiền' },
              { id: 'WITHDRAWAL', label: 'Rút tiền' },
              { id: 'INITIAL_BALANCE', label: 'Số dư chuẩn hóa' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                className={`tw-px-3 tw-py-1 tw-rounded-xl tw-text-xs tw-font-semibold tw-border tw-transition tw-cursor-pointer ${
                  feedFilter === f.id
                    ? 'tw-bg-indigo-600 tw-text-white tw-border-indigo-600 tw-shadow-sm'
                    : 'tw-bg-slate-50 tw-text-slate-600 tw-border-slate-200 hover:tw-bg-slate-100'
                }`}
                onClick={() => {
                  setFeedFilter(f.id);
                  setFeedPage(1);
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="tw-flex tw-items-center tw-gap-2">
            <span className="tw-text-2xs tw-text-slate-500">Hiển thị:</span>
            <select
              className="tw-px-2 tw-py-1 tw-text-xs tw-border tw-border-slate-200 tw-rounded-lg tw-bg-white"
              value={feedLimit}
              onChange={(e) => {
                setFeedLimit(Number(e.target.value));
                setFeedPage(1);
              }}
            >
              <option value={5}>5 dòng</option>
              <option value={8}>8 dòng</option>
              <option value={15}>15 dòng</option>
              <option value={30}>30 dòng</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        {(() => {
          const filtered = recentFlow.filter((tx) => {
            if (feedFilter === 'ALL') return true;
            return (tx.transactionType || '').toUpperCase().includes(feedFilter);
          });
          const totalPages = Math.max(1, Math.ceil(filtered.length / feedLimit));
          const paginated = filtered.slice((feedPage - 1) * feedLimit, feedPage * feedLimit);

          if (filtered.length === 0) {
            return (
              <div className="tw-text-center tw-py-10 tw-text-slate-400 tw-text-xs">
                Không tìm thấy giao dịch nào phù hợp với bộ lọc.
              </div>
            );
          }

          return (
            <div>
              <div className="tw-overflow-x-auto tw-rounded-2xl tw-border tw-border-slate-100">
                <table className="tw-w-full tw-text-left tw-border-collapse">
                  <thead>
                    <tr className="tw-bg-slate-50 tw-border-b tw-border-slate-200 tw-text-slate-500 tw-text-xs tw-uppercase tw-font-bold">
                      <th className="tw-p-3">Thời Gian</th>
                      <th className="tw-p-3">Mã Bút Toán / ID</th>
                      <th className="tw-p-3">Tài Khoản / Chủ Thể</th>
                      <th className="tw-p-3">Nghiệp Vụ</th>
                      <th className="tw-p-3">Nội Dung Bút Toán</th>
                      <th className="tw-p-3 tw-text-right">Biến Động</th>
                      <th className="tw-p-3 tw-text-right">Số Dư Sau</th>
                      <th className="tw-p-3 tw-text-center">Truy Xuất</th>
                    </tr>
                  </thead>
                  <tbody className="tw-divide-y tw-divide-slate-100 tw-text-xs">
                    {paginated.map((tx) => (
                      <tr key={tx.id} className="hover:tw-bg-slate-50/80 tw-transition">
                        <td className="tw-p-3 tw-text-slate-500 tw-font-mono">
                          {moment(tx.createdAt).format('HH:mm:ss DD/MM/YYYY')}
                        </td>
                        <td className="tw-p-3">
                          <span className="tw-font-mono tw-font-bold tw-text-indigo-600">
                            #TX-{String(tx.id).padStart(6, '0')}
                          </span>
                        </td>
                        <td className="tw-p-3">
                          <div className="tw-font-semibold tw-text-slate-800">{tx.ownerName}</div>
                          <div className="tw-text-3xs tw-text-slate-400">Ví: {tx.walletType} (#{tx.walletId})</div>
                        </td>
                        <td className="tw-p-3">
                          <span
                            className={`tw-px-2 tw-py-0.5 tw-rounded-md tw-font-mono tw-text-3xs tw-font-bold tw-border ${
                              tx.transactionType === 'DOCTOR_SETTLEMENT'
                                ? 'tw-bg-emerald-50 tw-text-emerald-700 tw-border-emerald-200'
                                : tx.transactionType === 'REFUND'
                                ? 'tw-bg-purple-50 tw-text-purple-700 tw-border-purple-200'
                                : tx.transactionType === 'WITHDRAWAL'
                                ? 'tw-bg-blue-50 tw-text-blue-700 tw-border-blue-200'
                                : 'tw-bg-slate-100 tw-text-slate-700 tw-border-slate-200'
                            }`}
                          >
                            {tx.transactionType}
                          </span>
                        </td>
                        <td className="tw-p-3 tw-text-slate-600 tw-max-w-xs tw-truncate" title={tx.description}>
                          {tx.description}
                        </td>
                        <td className="tw-p-3 tw-text-right tw-font-mono tw-font-bold">
                          <span className={tx.direction === 'CREDIT' ? 'tw-text-emerald-600' : 'tw-text-rose-600'}>
                            {tx.direction === 'CREDIT' ? '+' : '-'}{formatMoney(tx.amount)}
                          </span>
                        </td>
                        <td className="tw-p-3 tw-text-right tw-font-mono tw-text-slate-700" style={{ fontVariantNumeric: 'tabular-nums' }}>
                          {formatMoney(tx.balanceAfter)}
                        </td>
                        <td className="tw-p-3 tw-text-center">
                          <button
                            type="button"
                            className="tw-p-1.5 tw-text-indigo-600 hover:tw-text-indigo-800 hover:tw-bg-indigo-50 tw-rounded-lg tw-border-none tw-bg-transparent tw-cursor-pointer tw-transition"
                            onClick={() => setSelectedTxDetail(tx)}
                            title="Truy xuất nguồn gốc bút toán"
                          >
                            <Eye size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              <div className="tw-pt-3 tw-flex tw-flex-col sm:tw-flex-row sm:tw-items-center sm:tw-justify-between tw-gap-2">
                <span className="tw-text-2xs tw-text-slate-500">
                  Hiển thị {(feedPage - 1) * feedLimit + 1} - {Math.min(feedPage * feedLimit, filtered.length)} trên tổng số {filtered.length} bút toán (Trang {feedPage} / {totalPages})
                </span>

                <div className="tw-flex tw-items-center tw-gap-1">
                  <button
                    type="button"
                    className="tw-px-3 tw-py-1 tw-text-xs tw-font-semibold tw-border tw-border-slate-200 tw-rounded-lg tw-bg-white hover:tw-bg-slate-50 disabled:tw-opacity-40 tw-cursor-pointer"
                    disabled={feedPage <= 1}
                    onClick={() => setFeedPage(feedPage - 1)}
                  >
                    Trước
                  </button>
                  <span className="tw-px-3 tw-py-1 tw-text-xs tw-font-mono tw-font-bold tw-text-slate-700 tw-bg-slate-100 tw-rounded-lg">
                    {feedPage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    className="tw-px-3 tw-py-1 tw-text-xs tw-font-semibold tw-border tw-border-slate-200 tw-rounded-lg tw-bg-white hover:tw-bg-slate-50 disabled:tw-opacity-40 tw-cursor-pointer"
                    disabled={feedPage >= totalPages}
                    onClick={() => setFeedPage(feedPage + 1)}
                  >
                    Sau
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* ── MODAL TRUY XUẤT NGUỒN GỐC BÚT TOÁN (TRANSACTION ORIGIN MODAL) ── */}
      {selectedTxDetail && (
        <div
          className="tw-fixed tw-inset-0 tw-bg-slate-900/60 tw-backdrop-blur-sm tw-z-50 tw-flex tw-items-center tw-justify-center tw-p-4 tw-animate-in tw-fade-in"
          onClick={() => setSelectedTxDetail(null)}
        >
          <div
            className="tw-bg-white tw-rounded-3xl tw-shadow-2xl tw-w-full tw-max-w-lg tw-overflow-hidden tw-border tw-border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="tw-p-5 tw-bg-slate-900 tw-text-white tw-flex tw-items-center tw-justify-between">
              <div className="tw-flex tw-items-center tw-gap-2.5">
                <div className="tw-w-8 tw-h-8 tw-rounded-xl tw-bg-indigo-500/20 tw-text-indigo-400 tw-flex tw-items-center tw-justify-center">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h4 className="tw-font-bold tw-text-sm tw-text-white tw-m-0">
                    Truy Xuất Nguồn Gốc Bút Toán Sổ Cái
                  </h4>
                  <div className="tw-text-2xs tw-text-slate-400 tw-font-mono">
                    #TX-{String(selectedTxDetail.id).padStart(6, '0')}
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="tw-text-slate-400 hover:tw-text-white tw-bg-transparent tw-border-none tw-cursor-pointer"
                onClick={() => setSelectedTxDetail(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="tw-p-6 tw-space-y-4 tw-text-xs">
              {/* Highlight Amount */}
              <div className="tw-p-4 tw-bg-slate-50 tw-rounded-2xl tw-border tw-border-slate-200/80 tw-flex tw-items-center tw-justify-between">
                <div>
                  <div className="tw-text-2xs tw-text-slate-400 tw-uppercase tw-font-bold">Biến Động Số Dư</div>
                  <div className={`tw-text-2xl tw-font-black tw-font-mono tw-mt-0.5 ${
                    selectedTxDetail.direction === 'CREDIT' ? 'tw-text-emerald-600' : 'tw-text-rose-600'
                  }`}>
                    {selectedTxDetail.direction === 'CREDIT' ? '+' : '-'}{formatMoney(selectedTxDetail.amount)}
                  </div>
                </div>
                <div className="tw-text-right">
                  <div className="tw-text-2xs tw-text-slate-400 tw-uppercase tw-font-bold">Số Dư Sau GD</div>
                  <div className="tw-text-base tw-font-black tw-font-mono tw-text-slate-800 tw-mt-0.5">
                    {formatMoney(selectedTxDetail.balanceAfter)}
                  </div>
                </div>
              </div>

              {/* Data Grid */}
              <div className="tw-space-y-2.5 tw-font-mono tw-text-2xs">
                <div className="tw-flex tw-justify-between tw-py-1.5 tw-border-b tw-border-slate-100">
                  <span className="tw-text-slate-400">Thời gian ghi nhận:</span>
                  <span className="tw-font-bold tw-text-slate-800">{moment(selectedTxDetail.createdAt).format('HH:mm:ss DD/MM/YYYY')}</span>
                </div>
                <div className="tw-flex tw-justify-between tw-py-1.5 tw-border-b tw-border-slate-100">
                  <span className="tw-text-slate-400">Chủ thể / Tài khoản:</span>
                  <span className="tw-font-bold tw-text-slate-800">{selectedTxDetail.ownerName} ({selectedTxDetail.walletType})</span>
                </div>
                <div className="tw-flex tw-justify-between tw-py-1.5 tw-border-b tw-border-slate-100">
                  <span className="tw-text-slate-400">Ví thụ hưởng ID:</span>
                  <span className="tw-font-bold tw-text-indigo-600">WAL-#{selectedTxDetail.walletId}</span>
                </div>
                <div className="tw-flex tw-justify-between tw-py-1.5 tw-border-b tw-border-slate-100">
                  <span className="tw-text-slate-400">Mã Nghiệp vụ:</span>
                  <span className="tw-font-bold tw-text-slate-800">{selectedTxDetail.transactionType}</span>
                </div>
                {selectedTxDetail.idempotencyKey && (
                  <div className="tw-flex tw-justify-between tw-py-1.5 tw-border-b tw-border-slate-100">
                    <span className="tw-text-slate-400">Mã Idempotency Chống Lặp:</span>
                    <span className="tw-font-bold tw-text-emerald-700 tw-truncate tw-max-w-[240px]">{selectedTxDetail.idempotencyKey}</span>
                  </div>
                )}
                {selectedTxDetail.referenceType && (
                  <div className="tw-flex tw-justify-between tw-py-1.5 tw-border-b tw-border-slate-100">
                    <span className="tw-text-slate-400">Loại tham chiếu đối soát:</span>
                    <span className="tw-font-bold tw-text-slate-800">{selectedTxDetail.referenceType}</span>
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="tw-p-3 tw-bg-indigo-50/50 tw-rounded-xl tw-border tw-border-indigo-100">
                <div className="tw-text-2xs tw-font-bold tw-text-indigo-900 tw-mb-1">Diễn Giải Hạch Toán Kế Toán:</div>
                <div className="tw-text-xs tw-text-slate-700">{selectedTxDetail.description}</div>
              </div>
            </div>

            <div className="tw-p-4 tw-bg-slate-50 tw-border-t tw-border-slate-100 tw-flex tw-justify-end">
              <button
                type="button"
                className="tw-px-4 tw-py-2 tw-bg-slate-800 hover:tw-bg-slate-900 tw-text-white tw-rounded-xl tw-text-xs tw-font-bold tw-border-none tw-cursor-pointer"
                onClick={() => setSelectedTxDetail(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CUSTOM MASTER AUTOMATION EXECUTION MODAL (KHÔNG WINDOW.CONFIRM) ── */}
      {isMasterModalOpen && (
        <div
          className="tw-fixed tw-inset-0 tw-bg-slate-900/60 tw-backdrop-blur-sm tw-z-50 tw-flex tw-items-center tw-justify-center tw-p-4"
          onClick={() => !isRunningMaster && setIsMasterModalOpen(false)}
        >
          <div
            className="tw-bg-white tw-rounded-3xl tw-shadow-2xl tw-w-full tw-max-w-xl tw-overflow-hidden tw-border tw-border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="tw-p-6 tw-bg-slate-900 tw-text-white tw-flex tw-items-center tw-justify-between">
              <div className="tw-flex tw-items-center tw-gap-3">
                <div className="tw-w-10 tw-h-10 tw-rounded-xl tw-bg-slate-800 tw-text-emerald-400 tw-flex tw-items-center tw-justify-center tw-border tw-border-slate-700">
                  <Layers size={20} />
                </div>
                <div>
                  <h3 className="tw-font-bold tw-text-base tw-text-white tw-m-0">
                    Xác Nhận Thực Thi Chu Trình Thanh Quyết Toán
                  </h3>
                  <div className="tw-text-xs tw-text-slate-400">
                    Quy trình rà soát và giải ngân tự động liên hoàn 3 nhánh nghiệp vụ
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="tw-text-slate-400 hover:tw-text-white tw-border-none tw-bg-transparent tw-p-1 tw-cursor-pointer"
                onClick={() => !isRunningMaster && setIsMasterModalOpen(false)}
              >
                <X size={20} />
              </button>

            </div>

            {/* Body */}
            <div className="tw-p-6 tw-space-y-4">
              {masterReport ? (
                /* Báo cáo kết quả sau khi chạy */
                <div className="tw-space-y-3">
                  <div className="tw-p-4 tw-bg-emerald-50 tw-border tw-border-emerald-200 tw-rounded-2xl tw-space-y-2">
                    <div className="tw-flex tw-items-center tw-gap-2 tw-text-emerald-800 tw-font-bold tw-text-sm">
                      <CheckCircle2 size={18} className="tw-text-emerald-600" />
                      <span>Chu Trình Toàn Diện Hoàn Tất Thành Công!</span>
                    </div>
                    <div className="tw-text-xs tw-text-emerald-700">
                      Thời gian thực thi: <strong>{masterReport.executionTimeMs}ms</strong> • Tổng nghiệp vụ: <strong>{masterReport.grandTotalItems}</strong>
                    </div>
                    <div className="tw-text-xl tw-font-black tw-text-emerald-700 tw-font-mono">
                      Tổng tiền luân chuyển: {formatMoney(masterReport.grandTotalAmount)}
                    </div>
                  </div>

                  {masterReport.messages && masterReport.messages.length > 0 && (
                    <div className="tw-p-3.5 tw-bg-slate-50 tw-rounded-2xl tw-border tw-border-slate-100 tw-space-y-1.5 tw-text-xs tw-text-slate-700">
                      <div className="tw-font-bold tw-text-2xs tw-text-slate-400 tw-uppercase">Chi tiết các giai đoạn:</div>
                      {masterReport.messages.map((m, idx) => (
                        <div key={idx} className="tw-flex tw-items-start tw-gap-2">
                          <span className="tw-text-emerald-600 tw-font-bold">✓</span>
                          <span>{m}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* Xác nhận trước khi chạy */
                <div className="tw-space-y-3.5">
                  <p className="tw-text-xs tw-text-slate-600 tw-m-0">
                    Khi khởi chạy, hệ thống sẽ tự động quét và thực thi tuần tự 3 giai đoạn đối soát:
                  </p>

                  <div className="tw-p-4 tw-bg-slate-50 tw-rounded-2xl tw-border tw-border-slate-100 tw-space-y-3 tw-text-xs">
                    <div className="tw-flex tw-items-start tw-gap-2.5">
                      <span className="tw-w-5 tw-h-5 tw-rounded-full tw-bg-emerald-100 tw-text-emerald-700 tw-flex tw-items-center tw-justify-center tw-font-bold tw-text-2xs tw-shrink-0">
                        1
                      </span>
                      <div>
                        <strong className="tw-text-slate-900">Quyết toán Thù Lao Bác Sĩ (T+0):</strong>
                        <div className="tw-text-slate-500 tw-text-2xs">
                          Quét toàn bộ ca khám AVAILABLE, trích hoa hồng sàn và kết chuyển ngay vào Ví Bác sĩ.
                        </div>
                      </div>
                    </div>

                    <div className="tw-flex tw-items-start tw-gap-2.5">
                      <span className="tw-w-5 tw-h-5 tw-rounded-full tw-bg-purple-100 tw-text-purple-700 tw-flex tw-items-center tw-justify-center tw-font-bold tw-text-2xs tw-shrink-0">
                        2
                      </span>
                      <div>
                        <strong className="tw-text-slate-900">Hoàn Tiền Ca Hủy Sạch:</strong>
                        <div className="tw-text-slate-500 tw-text-2xs">
                          Tự động hoàn tiền 100% cho bệnh nhân các ca do Bác sĩ hủy hoặc đúng cam kết SLA.
                        </div>
                      </div>
                    </div>

                    <div className="tw-flex tw-items-start tw-gap-2.5">
                      <span className="tw-w-5 tw-h-5 tw-rounded-full tw-bg-blue-100 tw-text-blue-700 tw-flex tw-items-center tw-justify-center tw-font-bold tw-text-2xs tw-shrink-0">
                        3
                      </span>
                      <div>
                        <strong className="tw-text-slate-900">Duyệt Rút Tiền Hạn Mức An Toàn:</strong>
                        <div className="tw-text-slate-500 tw-text-2xs">
                          Phê duyệt giải ngân các lệnh rút tiền hợp lệ dưới 5.000.000 ₫ từ ví hợp lệ.
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="tw-text-2xs tw-text-slate-500">
                    * Mọi biến động đều được lưu vết bất biến vào Sổ Nhật Ký Kiểm Toán (Audit Trail) và Sổ Cái kép.
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="tw-p-4 tw-bg-slate-50 tw-border-t tw-border-slate-100 tw-flex tw-justify-end tw-gap-2">
              <button
                type="button"
                className="tw-px-4 tw-py-2 tw-bg-slate-100 hover:tw-bg-slate-200 tw-text-slate-700 tw-rounded-xl tw-text-xs tw-font-semibold tw-border-none tw-cursor-pointer"
                onClick={() => {
                  setIsMasterModalOpen(false);
                  setMasterReport(null);
                  loadOverview();
                }}
                disabled={isRunningMaster}
              >
                {masterReport ? 'Đóng' : 'Hủy bỏ'}
              </button>

              {!masterReport && (
                <button
                  type="button"
                  className="tw-px-5 tw-py-2.5 tw-bg-slate-900 hover:tw-bg-slate-800 tw-text-white tw-rounded-xl tw-text-xs tw-font-semibold tw-border tw-border-slate-800 tw-cursor-pointer tw-flex tw-items-center tw-gap-2 tw-shadow-sm tw-transition"
                  onClick={handleExecuteMasterCycle}
                  disabled={isRunningMaster}
                >
                  <Play size={13} className={isRunningMaster ? 'tw-animate-spin' : 'tw-fill-white'} />
                  <span>{isRunningMaster ? 'Hệ thống đang thực thi...' : 'Thực Thi Chu Trình Ngay'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
