// src/containers/System/Admin/Financial/FinancialExceptionHub.jsx
// Trung Tâm Xử Lý Ngoại Lệ Tài Chính & Động Cơ Tự Động Hóa (Financial Exception & Automation Hub)
import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import moment from 'moment';
import {
  AlertOctagon,
  AlertTriangle,
  RotateCw,
  Search,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  Clock,
  ArrowRight,
  ArrowUpRight,
  Coins,
  Scale,
  CheckCircle2,
  ExternalLink,
  Zap,
  Info
} from 'lucide-react';
import {
  getAdminExceptionQueue,
  runFinancialAutomationCycle
} from '../../../../services/walletService';
import TransactionDetailDrawer from '../../../../components/Financial/TransactionDetailDrawer';

const PRIORITY_BADGE = {
  CRITICAL: {
    label: 'Khẩn Cấp',
    color: '#b91c1c',
    bg: '#fef2f2',
    border: '#fecaca',
    pulse: true,
  },
  HIGH: {
    label: 'Ưu Tiên Cao',
    color: '#b45309',
    bg: '#fffbeb',
    border: '#fde68a',
    pulse: false,
  },
  NORMAL: {
    label: 'Thông Thường',
    color: '#1d4ed8',
    bg: '#eff6ff',
    border: '#bfdbfe',
    pulse: false,
  },
};

const CATEGORY_CONFIG = {
  WITHDRAWAL: {
    label: 'Rút tiền',
    icon: ArrowUpRight,
    color: '#e11d48',
    bg: '#ffe4e6',
  },
  REFUND: {
    label: 'Hoàn tiền',
    icon: ShieldAlert,
    color: '#d97706',
    bg: '#fef3c7',
  },
  SETTLEMENT: {
    label: 'Thù lao BS',
    icon: Coins,
    color: '#7c3aed',
    bg: '#ede9fe',
  },
  LIQUIDITY: {
    label: 'Thanh khoản',
    icon: Scale,
    color: '#b91c1c',
    bg: '#fee2e2',
  },
};

export default function FinancialExceptionHub({ onNavigateTab }) {
  const [loading, setLoading] = useState(false);
  const [runningCycle, setRunningCycle] = useState(false);
  const [queueData, setQueueData] = useState({
    summary: {
      totalCount: 0,
      criticalCount: 0,
      highCount: 0,
      normalCount: 0,
      byCategory: {},
      circuitBreakerActive: false,
      lcrCurrent: 100,
    },
    items: [],
  });

  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [lastCycleReport, setLastCycleReport] = useState(null);
  const [selectedDrawerItem, setSelectedDrawerItem] = useState(null);

  const formatMoney = (val) => (Number(val) || 0).toLocaleString('vi-VN') + ' ₫';

  const loadQueue = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdminExceptionQueue();
      if (res && res.errCode === 0 && res.data) {
        setQueueData(res.data);
      } else {
        toast.error(res?.errMessage || 'Không thể tải hàng đợi ngoại lệ');
      }
    } catch (err) {
      console.error('Error fetching exception queue:', err);
      toast.error('Lỗi khi kết nối hàng đợi ngoại lệ');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  // Kích hoạt chu trình tự động hóa tài chính
  const handleTriggerCycle = async () => {
    setRunningCycle(true);
    try {
      const res = await runFinancialAutomationCycle();
      if (res && res.errCode === 0) {
        toast.success(res.message || 'Chu trình tự động hoàn tất thành công!');
        setLastCycleReport(res.data);
        await loadQueue();
      } else {
        toast.error(res?.errMessage || 'Chu trình tự động thất bại');
      }
    } catch (err) {
      toast.error('Lỗi khi kích hoạt chu trình tự động');
    } finally {
      setRunningCycle(false);
    }
  };

  // Lọc danh sách items
  const filteredItems = (queueData.items || []).filter((item) => {
    if (categoryFilter !== 'ALL' && item.category !== categoryFilter) return false;
    if (priorityFilter !== 'ALL' && item.priority !== priorityFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchId = (item.id || '').toLowerCase().includes(q);
      const matchReason = (item.reason || '').toLowerCase().includes(q);
      const matchOwner = (item.ownerName || '').toLowerCase().includes(q);
      const matchEmail = (item.ownerEmail || '').toLowerCase().includes(q);
      if (!matchId && !matchReason && !matchOwner && !matchEmail) return false;
    }
    return true;
  });

  const { summary } = queueData;

  return (
    <div className="tw-space-y-6 tw-animate-in tw-fade-in tw-duration-300">
      {/* ── TOP BANNER: TRẠNG THÁI AUTOMATION & CIRCUIT BREAKER ── */}
      <div
        className="tw-rounded-3xl tw-p-6 tw-shadow-xl tw-mb-6"
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
          border: '1.5px solid #334155',
          color: '#ffffff',
        }}
      >
        <div className="tw-flex tw-flex-col lg:tw-flex-row lg:tw-items-center lg:tw-justify-between tw-gap-4">
          <div className="tw-space-y-2">
            <div className="tw-flex tw-items-center tw-gap-2.5">
              <span
                className="tw-p-2 tw-rounded-xl tw-flex tw-items-center tw-justify-center"
                style={{
                  background: 'rgba(244, 63, 94, 0.2)',
                  color: '#fb7185',
                  border: '1px solid rgba(244, 63, 94, 0.35)',
                }}
              >
                <AlertOctagon size={20} />
              </span>
              <h2 style={{ color: '#ffffff', margin: 0, fontWeight: 900, fontSize: '20px', letterSpacing: '-0.02em' }}>
                Trung Tâm Xử Lý Ngoại Lệ Tài Chính (Financial Exception Hub)
              </h2>
            </div>
            <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0, maxWidth: '800px', lineHeight: 1.55 }}>
              Mô hình <strong style={{ color: '#e2e8f0' }}>Quản trị theo Ngoại lệ (Management by Exception)</strong>: Hệ thống tự động xử lý các giao dịch thông thường; 
              chỉ các giao dịch vượt hạn mức, khiếu nại ca khám, trễ hạn SLA hoặc rủi ro đối soát mới được chuyển về hàng đợi trung tâm này để Admin xử lý.
            </p>
          </div>

          <div className="tw-flex tw-items-center tw-gap-3">
            {/* Cầu chì LCR status */}
            <div
              className="tw-px-4 tw-py-2 tw-rounded-2xl tw-border tw-flex tw-items-center tw-gap-2 tw-text-xs tw-font-bold"
              style={{
                background: summary.circuitBreakerActive ? 'rgba(244, 63, 94, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                borderColor: summary.circuitBreakerActive ? 'rgba(244, 63, 94, 0.4)' : 'rgba(16, 185, 129, 0.4)',
                color: summary.circuitBreakerActive ? '#fb7185' : '#34d399',
              }}
            >
              {summary.circuitBreakerActive ? (
                <>
                  <ShieldAlert size={16} />
                  <span>Cầu chì kích hoạt (LCR {summary.lcrCurrent}%)</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={16} />
                  <span>Cầu chì an toàn (LCR {summary.lcrCurrent}%)</span>
                </>
              )}
            </div>

            {/* Nút chạy chu trình tự động */}
            <button
              type="button"
              disabled={runningCycle}
              onClick={handleTriggerCycle}
              className="tw-flex tw-items-center tw-gap-2"
              style={{
                background: 'linear-gradient(135deg, #059669 0%, #0d9488 100%)',
                color: '#ffffff',
                border: 'none',
                padding: '10px 22px',
                borderRadius: '16px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: runningCycle ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 16px rgba(16, 185, 129, 0.35)',
                opacity: runningCycle ? 0.6 : 1,
                transition: 'all 0.2s ease',
              }}
            >
              <Sparkles size={16} className={runningCycle ? 'tw-animate-spin' : ''} />
              <span>{runningCycle ? 'Đang thực thi...' : 'Chạy Chu Trình Tự Động'}</span>
            </button>
          </div>
        </div>

        {/* Báo cáo chu trình gần nhất (nếu vừa chạy) */}
        {lastCycleReport && (
          <div className="tw-mt-4 tw-p-3.5 tw-bg-slate-800/80 tw-rounded-2xl tw-border tw-border-slate-700 tw-text-2xs tw-space-y-1">
            <div className="tw-font-bold tw-text-emerald-400 tw-flex tw-items-center tw-gap-1.5">
              <Zap size={14} />
              <span>Kết quả chu trình tự động hóa gần nhất ({lastCycleReport.executionTimeMs}ms):</span>
            </div>
            <div className="tw-text-slate-300">
              • Đã mở khóa thù lao T+24h: <strong>{lastCycleReport.settlementsUnlocked} ca</strong> | 
              • Đã hoàn tiền sạch (BS hủy): <strong>{lastCycleReport.cleanRefundsProcessed} ca</strong> | 
              • Ngoại lệ còn tồn đọng: <strong>{lastCycleReport.remainingExceptions} ca</strong>
            </div>
          </div>
        )}
      </div>

      {/* ── 4 KPI CARDS: PHÂN CẤP MỨC ĐỘ NGOẠI LỆ ── */}
      <div className="tw-grid tw-grid-cols-1 sm:tw-grid-cols-2 lg:tw-grid-cols-4 tw-gap-4">
        {/* Card 1: Tổng số ngoại lệ */}
        <div
          onClick={() => setPriorityFilter('ALL')}
          className={`tw-p-5 tw-rounded-3xl tw-bg-white tw-border tw-transition tw-cursor-pointer hover:tw-shadow-md ${
            priorityFilter === 'ALL' ? 'tw-border-slate-800 tw-ring-2 tw-ring-slate-800/10' : 'tw-border-slate-200'
          }`}
        >
          <div className="tw-flex tw-items-center tw-justify-between tw-mb-2">
            <span className="tw-text-xs tw-font-bold tw-text-slate-500 tw-uppercase tw-tracking-wider">
              Tổng Ngoại Lệ Cần Xử Lý
            </span>
            <span className="tw-p-2 tw-rounded-xl tw-bg-slate-100 tw-text-slate-700">
              <AlertOctagon size={18} />
            </span>
          </div>
          <div className="tw-text-3xl tw-font-black tw-text-slate-900">
            {summary.totalCount || 0}
          </div>
          <div className="tw-text-2xs tw-text-slate-400 tw-mt-1">
            Gồm {summary.byCategory?.withdrawals || 0} lệnh rút, {summary.byCategory?.refunds || 0} ca hoàn, {summary.byCategory?.settlements || 0} thù lao
          </div>
        </div>

        {/* Card 2: Khẩn cấp */}
        <div
          onClick={() => setPriorityFilter('CRITICAL')}
          className={`tw-p-5 tw-rounded-3xl tw-bg-rose-50/50 tw-border tw-transition tw-cursor-pointer hover:tw-shadow-md ${
            priorityFilter === 'CRITICAL' ? 'tw-border-rose-600 tw-ring-2 tw-ring-rose-600/20' : 'tw-border-rose-200'
          }`}
        >
          <div className="tw-flex tw-items-center tw-justify-between tw-mb-2">
            <span className="tw-text-xs tw-font-bold tw-text-rose-700 tw-uppercase tw-tracking-wider">
              🔴 Khẩn Cấp (SLA / Tranh Chấp)
            </span>
            <span className="tw-p-2 tw-rounded-xl tw-bg-rose-100 tw-text-rose-700">
              <Clock size={18} />
            </span>
          </div>
          <div className="tw-text-3xl tw-font-black tw-text-rose-700">
            {summary.criticalCount || 0}
          </div>
          <div className="tw-text-2xs tw-text-rose-600 tw-mt-1">
            Sắp quá hạn cam kết SLA 24h hoặc có tranh chấp y tế
          </div>
        </div>

        {/* Card 3: Ưu tiên cao */}
        <div
          onClick={() => setPriorityFilter('HIGH')}
          className={`tw-p-5 tw-rounded-3xl tw-bg-amber-50/50 tw-border tw-transition tw-cursor-pointer hover:tw-shadow-md ${
            priorityFilter === 'HIGH' ? 'tw-border-amber-600 tw-ring-2 tw-ring-amber-600/20' : 'tw-border-amber-200'
          }`}
        >
          <div className="tw-flex tw-items-center tw-justify-between tw-mb-2">
            <span className="tw-text-xs tw-font-bold tw-text-amber-800 tw-uppercase tw-tracking-wider">
              🟡 Ưu Tiên Cao (&gt;5tr / Tồn Đọng)
            </span>
            <span className="tw-p-2 tw-rounded-xl tw-bg-amber-100 tw-text-amber-800">
              <AlertTriangle size={18} />
            </span>
          </div>
          <div className="tw-text-3xl tw-font-black tw-text-amber-800">
            {summary.highCount || 0}
          </div>
          <div className="tw-text-2xs tw-text-amber-700 tw-mt-1">
            Khoản tiền lớn vượt hạn mức tự động hoặc đọng quá 24h
          </div>
        </div>

        {/* Card 4: Thông thường */}
        <div
          onClick={() => setPriorityFilter('NORMAL')}
          className={`tw-p-5 tw-rounded-3xl tw-bg-blue-50/50 tw-border tw-transition tw-cursor-pointer hover:tw-shadow-md ${
            priorityFilter === 'NORMAL' ? 'tw-border-blue-600 tw-ring-2 tw-ring-blue-600/20' : 'tw-border-blue-200'
          }`}
        >
          <div className="tw-flex tw-items-center tw-justify-between tw-mb-2">
            <span className="tw-text-xs tw-font-bold tw-text-blue-700 tw-uppercase tw-tracking-wider">
              🟢 Thông Thường (Trong SLA)
            </span>
            <span className="tw-p-2 tw-rounded-xl tw-bg-blue-100 tw-text-blue-700">
              <CheckCircle2 size={18} />
            </span>
          </div>
          <div className="tw-text-3xl tw-font-black tw-text-blue-700">
            {summary.normalCount || 0}
          </div>
          <div className="tw-text-2xs tw-text-blue-600 tw-mt-1">
            Các giao dịch chuẩn đang trong khung thời gian đối soát
          </div>
        </div>
      </div>

      {/* ── TOOLBAR: BỘ LỌC & TÌM KIẾM ── */}
      <div className="tw-bg-white tw-p-4 tw-rounded-3xl tw-border tw-border-slate-200 tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-3 tw-shadow-sm">
        <div className="tw-flex tw-items-center tw-gap-2 tw-flex-wrap">
          <span className="tw-text-xs tw-font-bold tw-text-slate-500 tw-mr-1">Lọc phân loại:</span>
          {[
            { id: 'ALL', label: 'Tất cả' },
            { id: 'WITHDRAWAL', label: 'Rút tiền' },
            { id: 'REFUND', label: 'Hoàn tiền' },
            { id: 'SETTLEMENT', label: 'Thù lao BS' },
            { id: 'LIQUIDITY', label: 'Thanh khoản' },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`tw-px-3.5 tw-py-1.5 tw-rounded-xl tw-text-xs tw-font-bold tw-border tw-cursor-pointer tw-transition ${
                categoryFilter === cat.id
                  ? 'tw-bg-slate-900 tw-text-white tw-border-slate-900'
                  : 'tw-bg-slate-50 tw-text-slate-600 tw-border-slate-200 hover:tw-bg-slate-100'
              }`}
              onClick={() => setCategoryFilter(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="tw-flex tw-items-center tw-gap-2 tw-flex-1 tw-max-w-md">
          <div className="tw-relative tw-w-full">
            <Search size={15} className="tw-absolute tw-left-3 tw-top-1/2 tw-transform -tw-translate-y-1/2 tw-text-slate-400" />
            <input
              type="text"
              className="tw-w-full tw-pl-9 tw-pr-4 tw-py-2 tw-text-xs tw-border tw-border-slate-300 tw-rounded-xl focus:tw-outline-none focus:tw-ring-2 focus:tw-ring-slate-800"
              placeholder="Tìm theo Mã, Lý do, Tên bệnh nhân/bác sĩ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <button
            type="button"
            className="tw-p-2 tw-bg-slate-100 hover:tw-bg-slate-200 tw-text-slate-600 tw-rounded-xl tw-border-none tw-cursor-pointer tw-transition"
            title="Làm mới hàng đợi"
            onClick={loadQueue}
            disabled={loading}
          >
            <RotateCw size={15} className={loading ? 'tw-animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── BẢNG DỮ LIỆU HÀNG ĐỢI NGOẠI LỆ TẬP TRUNG ── */}
      <div className="tw-bg-white tw-rounded-3xl tw-border tw-border-slate-200 tw-overflow-hidden tw-shadow-sm">
        <div className="tw-overflow-x-auto">
          <table className="tw-w-full tw-text-left tw-border-collapse">
            <thead>
              <tr className="tw-border-b tw-border-slate-200 tw-bg-slate-50 tw-text-2xs tw-font-bold tw-text-slate-500 tw-uppercase tw-tracking-wider">
                <th className="tw-p-4">Mã / Phân loại</th>
                <th className="tw-p-4">Mức độ rủi ro</th>
                <th className="tw-p-4">Nguyên nhân hệ thống chặn lại</th>
                <th className="tw-p-4">Chủ thể / Đối tác</th>
                <th className="tw-p-4 tw-text-right">Số tiền</th>
                <th className="tw-p-4">Thời hạn / SLA</th>
                <th className="tw-p-4 tw-text-right">Thao tác xử lý</th>
              </tr>
            </thead>
            <tbody className="tw-divide-y tw-divide-slate-100 tw-text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="tw-p-8 tw-text-center tw-text-slate-400">
                    <RotateCw size={24} className="tw-animate-spin tw-inline-block tw-mr-2" />
                    Đang tải dữ liệu hàng đợi ngoại lệ...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="tw-p-12 tw-text-center tw-text-slate-400">
                    <CheckCircle2 size={36} className="tw-text-emerald-500 tw-inline-block tw-mb-2" />
                    <div className="tw-font-bold tw-text-slate-700 tw-text-sm">
                      Không có ngoại lệ tài chính nào cần can thiệp!
                    </div>
                    <div className="tw-text-2xs tw-text-slate-400 tw-mt-1">
                      Mọi giao dịch thông thường đang được Financial Automation Engine xử lý trơn tru.
                    </div>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const pCfg = PRIORITY_BADGE[item.priority] || PRIORITY_BADGE.NORMAL;
                  const cCfg = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.WITHDRAWAL;
                  const CategoryIcon = cCfg.icon;

                  return (
                    <tr
                      key={item.id}
                      className="hover:tw-bg-slate-50/80 tw-transition tw-cursor-pointer"
                      onClick={() => setSelectedDrawerItem(item)}
                      title="Click để mở phả hệ giao dịch và bảng điều khiển quyết định"
                    >
                      {/* Mã & Phân loại */}
                      <td className="tw-p-4">
                        <div className="tw-flex tw-items-center tw-gap-2">
                          <span
                            className="tw-p-1.5 tw-rounded-lg tw-flex tw-items-center tw-justify-center"
                            style={{ backgroundColor: cCfg.bg, color: cCfg.color }}
                          >
                            <CategoryIcon size={14} />
                          </span>
                          <div>
                            <div className="tw-font-mono tw-font-bold tw-text-slate-900">
                              #{item.id}
                            </div>
                            <div className="tw-text-2xs tw-text-slate-400">
                              {cCfg.label}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Mức độ rủi ro */}
                      <td className="tw-p-4">
                        <span
                          className="tw-px-2.5 tw-py-1 tw-rounded-full tw-text-2xs tw-font-bold tw-border tw-inline-flex tw-items-center tw-gap-1.5"
                          style={{
                            backgroundColor: pCfg.bg,
                            color: pCfg.color,
                            borderColor: pCfg.border,
                          }}
                        >
                          {pCfg.pulse && (
                            <span className="tw-w-1.5 tw-h-1.5 tw-rounded-full tw-bg-rose-600 tw-animate-ping" />
                          )}
                          {pCfg.label}
                        </span>
                      </td>

                      {/* Nguyên nhân hệ thống phát hiện */}
                      <td className="tw-p-4 tw-max-w-xs">
                        <div className="tw-font-semibold tw-text-slate-800">
                          {item.reason}
                        </div>
                        {item.bankInfo && (
                          <div className="tw-text-2xs tw-text-slate-400 tw-mt-0.5">
                            {item.bankInfo}
                          </div>
                        )}
                        {item.bookingId && (
                          <div className="tw-text-2xs tw-text-indigo-600 tw-mt-0.5 tw-font-semibold">
                            Ca khám: #{item.bookingId}
                          </div>
                        )}
                      </td>

                      {/* Chủ thể */}
                      <td className="tw-p-4">
                        <div className="tw-font-bold tw-text-slate-900">
                          {item.ownerName}
                        </div>
                        <div className="tw-text-2xs tw-text-slate-400">
                          {item.ownerEmail} ({item.walletType})
                        </div>
                      </td>

                      {/* Số tiền */}
                      <td className="tw-p-4 tw-text-right">
                        <div className="tw-font-black tw-text-slate-900">
                          {formatMoney(item.amount)}
                        </div>
                      </td>

                      {/* Thời hạn SLA */}
                      <td className="tw-p-4">
                        {item.hoursLeft !== undefined ? (
                          item.hoursLeft <= 0 ? (
                            <div className="tw-text-2xs tw-font-bold tw-text-rose-600">
                              Quá hạn {Math.abs(item.hoursLeft)}h
                            </div>
                          ) : item.hoursLeft <= 4 ? (
                            <div className="tw-text-2xs tw-font-bold tw-text-rose-600">
                              Còn {item.hoursLeft}h (Gấp)
                            </div>
                          ) : (
                            <div className="tw-text-2xs tw-text-slate-600">
                              Còn {item.hoursLeft}h
                            </div>
                          )
                        ) : item.hoursPending !== undefined ? (
                          <div className="tw-text-2xs tw-text-slate-500">
                            Đọng {item.hoursPending}h
                          </div>
                        ) : (
                          <div className="tw-text-2xs tw-text-slate-400">
                            {moment(item.createdAt).format('DD/MM HH:mm')}
                          </div>
                        )}
                      </td>

                      {/* Nút hành động */}
                      <td className="tw-p-4 tw-text-right">
                        <button
                          type="button"
                          className="tw-px-3.5 tw-py-1.5 tw-bg-slate-900 hover:tw-bg-slate-800 tw-text-white tw-rounded-xl tw-text-xs tw-font-bold tw-border-none tw-cursor-pointer tw-inline-flex tw-items-center tw-gap-1.5 tw-shadow-sm tw-transition"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDrawerItem(item);
                          }}
                        >
                          <span>Xử lý ngay</span>
                          <ArrowRight size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-over Transaction Detail & Exception Resolution Drawer */}
      <TransactionDetailDrawer
        isOpen={Boolean(selectedDrawerItem)}
        onClose={() => setSelectedDrawerItem(null)}
        data={selectedDrawerItem}
        type="EXCEPTION"
        isAdmin={true}
        onActionSuccess={loadQueue}
      />
    </div>
  );
}
