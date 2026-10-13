// src/containers/System/Admin/Financial/DoctorSettlementsTab.jsx
// Phân hệ Quản trị Quyết toán Thù lao Bác sĩ theo Ca khám (Doctor Settlement Governance)
// Chuẩn Enterprise FinTech: Cơ chế T+0 (Khám xong thù lao khả dụng ngay), Modal xác nhận riêng biệt (Tuyệt đối không dùng window.confirm).
import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import moment from 'moment';
import {
  RotateCw,
  Search,
  CheckCircle2,
  Coins,
  ShieldCheck,
  Send,
  Sparkles,
  FileCheck,
  CheckSquare,
  Square,
  Eye,
  X,
  FileSpreadsheet,
  Layers,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Play,
  Database,
  ArrowDownRight,
  Wallet
} from 'lucide-react';
import {
  getAdminDoctorSettlements,
  payoutDoctorSettlements,
  runAutoDoctorPayoutCycle
} from '../../../../services/walletService';
import MoneyRoutingAuditDrawer from './MoneyRoutingAuditDrawer';

const STATUS_CONFIG = {
  AVAILABLE: {
    label: 'Khả dụng (Chờ chi)',
    desc: 'Đã hoàn tất khám (T+0), sẵn sàng kết chuyển vào ví',
    bg: '#ecfdf5',
    color: '#047857',
    border: '#a7f3d0',
  },
  PAID: {
    label: 'Đã chi trả',
    desc: 'Đã kết chuyển thành công vào ví bác sĩ kèm mã bút toán',
    bg: '#eff6ff',
    color: '#1d4ed8',
    border: '#bfdbfe',
  },
  HELD: {
    label: 'Đang tạm giữ',
    desc: 'Có khiếu nại ca khám phát sinh cần can thiệp',
    bg: '#fef2f2',
    color: '#b91c1c',
    border: '#fecaca',
  },
  CANCELLED: {
    label: 'Đã hủy',
    desc: 'Ca khám bị hủy',
    bg: '#f8fafc',
    color: '#64748b',
    border: '#cbd5e1',
  },
  EARNED: {
    label: 'Khả dụng (T+0)',
    desc: 'Đã hoàn tất khám, sẵn sàng thanh toán',
    bg: '#ecfdf5',
    color: '#047857',
    border: '#a7f3d0',
  }
};

export default function DoctorSettlementsTab() {
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  // Selection state for batch payout
  const [selectedIds, setSelectedIds] = useState([]);
  const [payoutModalOpen, setPayoutModalOpen] = useState(false);
  const [payoutTargetDoctor, setPayoutTargetDoctor] = useState(null);
  const [payoutNote, setPayoutNote] = useState('');
  const [submittingPayout, setSubmittingPayout] = useState(false);

  // Detail Modal State
  const [selectedDetailItem, setSelectedDetailItem] = useState(null);

  // Liquidity Budget Allocation Controls (Thác nước thanh khoản)
  const [budgetMode, setBudgetMode] = useState('UNLIMITED'); // 'UNLIMITED' | 'CUSTOM'
  const [customBudgetAmount, setCustomBudgetAmount] = useState(5000000);
  const [customBudgetStr, setCustomBudgetStr] = useState('5,000,000');

  // Custom Execution Confirmation Modal (thay thế hoàn toàn window.confirm)
  const [confirmRunModalOpen, setConfirmRunModalOpen] = useState(false);
  const [isRunningAutoCycle, setIsRunningAutoCycle] = useState(false);
  

  // Money Routing Audit Drawer
  const [isAuditDrawerOpen, setIsAuditDrawerOpen] = useState(false);

  const formatMoney = (val) => (Number(val) || 0).toLocaleString('vi-VN') + ' ₫';

  const loadSettlements = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdminDoctorSettlements({
        page,
        limit,
        status: statusFilter,
        search,
      });
      if (res && res.errCode === 0) {
        const rows = Array.isArray(res.data) ? res.data : (res.data?.items || []);
        setItems(rows);
        setSummary(res.summary || res.data?.summary || null);
        setTotal(res.pagination?.total || res.data?.pagination?.total || rows.length);
      } else {
        toast.error(res?.errMessage || 'Không thể tải bảng kê quyết toán');
      }
    } catch (err) {
      console.error('Error fetching settlements:', err);
      toast.error('Lỗi khi tải bảng kê quyết toán bác sĩ');
    } finally {
      setLoading(false);
    }
  }, [page, limit, statusFilter, search]);

  useEffect(() => {
    loadSettlements();
  }, [loadSettlements]);

  // Kích hoạt chu trình quyết toán tự động toàn sàn
  const handleExecuteAutoPayout = async () => {
    setIsRunningAutoCycle(true);
    try {
      const payload = {};
      if (budgetMode === 'CUSTOM' && customBudgetAmount > 0) {
        payload.liquidityBudgetLimit = customBudgetAmount;
      }
      const res = await runAutoDoctorPayoutCycle(payload);
      if (res && res.errCode === 0) {
        toast.success(res.message || 'Chu trình tự động hoàn tất!');
        setConfirmRunModalOpen(false);
        loadSettlements();
        // Mở drawer kiểm toán ngay để admin xem nhật ký và luồng tiền
        setIsAuditDrawerOpen(true);
      } else {
        toast.warn(res?.message || res?.errMessage || 'Không thể chạy chu trình tự động');
      }
    } catch (err) {
      toast.error(err.response?.data?.errMessage || err.message || 'Lỗi khi kích hoạt chu trình tự động');
    } finally {
      setIsRunningAutoCycle(false);
    }
  };

  

  // Chọn checkbox
  const handleToggleSelect = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((x) => x !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleSelectAllAvailable = () => {
    const availableIds = items.filter((x) => x.status === 'AVAILABLE' || x.status === 'EARNED').map((x) => x.id);
    if (selectedIds.length === availableIds.length && availableIds.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(availableIds);
    }
  };

  const handleOpenPayout = (doctor = null) => {
    setPayoutTargetDoctor(doctor);
    setPayoutNote('');
    setPayoutModalOpen(true);
  };

  const handleSubmitPayout = async (e) => {
    e.preventDefault();
    if (!payoutTargetDoctor && selectedIds.length === 0) {
      toast.warn('Vui lòng chọn ít nhất 1 ca khám để chi trả');
      return;
    }

    setSubmittingPayout(true);
    try {
      const res = await payoutDoctorSettlements({
        doctorId: payoutTargetDoctor ? payoutTargetDoctor.id : items.find((x) => selectedIds.includes(x.id))?.doctorId,
        itemIds: payoutTargetDoctor ? null : selectedIds,
        payoutMethod: 'WALLET',
        note: payoutNote,
      });

      if (res && res.errCode === 0) {
        toast.success(res.message || 'Chi trả thù lao thành công!');
        setPayoutModalOpen(false);
        setSelectedIds([]);
        loadSettlements();
      } else {
        toast.error(res?.errMessage || 'Chi trả thất bại');
      }
    } catch (err) {
      toast.error(err.response?.data?.errMessage || 'Lỗi khi thực hiện chi trả');
    } finally {
      setSubmittingPayout(false);
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  // Tính thù lao khả dụng tổng cộng
  const availableAmountTotal = (Number(summary?.availableAmount) || 0) + (Number(summary?.earnedAmount) || 0);
  const availableCountTotal = (Number(summary?.availableCount) || 0) + (Number(summary?.earnedCount) || 0);

  return (
    <div className="doctor-settlements-tab tw-space-y-6">
      {/* ── 1. KPI Cards: Tổng quan Dòng tiền Quyết toán ── */}
      <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-4 tw-gap-4">
        {/* Card 1: Khả dụng (Sẵn sàng chi T+0) */}
        <div className="tw-bg-white tw-p-5 tw-rounded-2xl tw-border tw-border-emerald-200 tw-shadow-sm">
          <div className="tw-flex tw-justify-between tw-items-center">
            <span className="tw-text-xs tw-font-bold tw-text-emerald-700 tw-uppercase tw-tracking-wider">
              1. Thù Lao Khả Dụng (T+0)
            </span>
            <div className="tw-w-8 tw-h-8 tw-rounded-lg tw-bg-emerald-50 tw-text-emerald-600 tw-flex tw-items-center tw-justify-center">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="tw-text-2xl tw-font-black tw-text-emerald-700 tw-mt-2 tw-font-mono">
            {formatMoney(availableAmountTotal)}
          </div>
          <div className="tw-text-xs tw-text-emerald-600 tw-mt-1">
            {availableCountTotal} ca khám hoàn tất, sẵn sàng kết chuyển vào ví
          </div>
        </div>

        {/* Card 2: Đã Chi Trả Vào Ví */}
        <div className="tw-bg-white tw-p-5 tw-rounded-2xl tw-border tw-border-indigo-200 tw-shadow-sm">
          <div className="tw-flex tw-justify-between tw-items-center">
            <span className="tw-text-xs tw-font-bold tw-text-indigo-700 tw-uppercase tw-tracking-wider">
              2. Đã Chi Trả Vào Ví
            </span>
            <div className="tw-w-8 tw-h-8 tw-rounded-lg tw-bg-indigo-50 tw-text-indigo-600 tw-flex tw-items-center tw-justify-center">
              <Coins size={18} />
            </div>
          </div>
          <div className="tw-text-2xl tw-font-black tw-text-indigo-700 tw-mt-2 tw-font-mono">
            {formatMoney(summary?.paidAmount)}
          </div>
          <div className="tw-text-xs tw-text-indigo-600 tw-mt-1">
            {summary?.paidCount || 0} ca đã hạch toán kết chuyển vào ví bác sĩ
          </div>
        </div>

        {/* Card 3: Phí Dịch Vụ Sàn Thu */}
        <div className="tw-bg-white tw-p-5 tw-rounded-2xl tw-border tw-border-slate-200 tw-shadow-sm">
          <div className="tw-flex tw-justify-between tw-items-center">
            <span className="tw-text-xs tw-font-bold tw-text-slate-600 tw-uppercase tw-tracking-wider">
              3. Doanh Thu Sàn Giữ Lại
            </span>
            <div className="tw-w-8 tw-h-8 tw-rounded-lg tw-bg-slate-50 tw-text-slate-600 tw-flex tw-items-center tw-justify-center">
              <ShieldCheck size={18} />
            </div>
          </div>
          <div className="tw-text-2xl tw-font-black tw-text-slate-800 tw-mt-2 tw-font-mono">
            {formatMoney(summary?.totalPlatformFee)}
          </div>
          <div className="tw-text-xs tw-text-slate-500 tw-mt-1">
            Phí hoa hồng nền tảng từ toàn bộ các ca khám
          </div>
        </div>

        {/* Card 4: Tổng Doanh Thu Ca Khám (Gross Volume) */}
        <div className="tw-bg-white tw-p-5 tw-rounded-2xl tw-border tw-border-slate-200 tw-shadow-sm">
          <div className="tw-flex tw-justify-between tw-items-center">
            <span className="tw-text-xs tw-font-bold tw-text-slate-600 tw-uppercase tw-tracking-wider">
              4. Tổng Doanh Thu Ca Khám
            </span>
            <div className="tw-w-8 tw-h-8 tw-rounded-lg tw-bg-slate-50 tw-text-slate-600 tw-flex tw-items-center tw-justify-center">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="tw-text-2xl tw-font-black tw-text-slate-800 tw-mt-2 tw-font-mono">
            {formatMoney(summary?.totalGross)}
          </div>
          <div className="tw-text-xs tw-text-slate-500 tw-mt-1">
            Tổng giá trị dịch vụ bệnh nhân đã thanh toán
          </div>
        </div>
      </div>

      {/* ── 2. Action Bar & Filters ── */}
      <div className="tw-bg-white tw-p-4 tw-rounded-2xl tw-border tw-border-slate-200 tw-shadow-sm tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-3">
        <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-2.5 tw-flex-1">
          <div className="tw-relative tw-min-w-[240px]">
            <Search size={15} className="tw-absolute tw-left-3 tw-top-1/2 -tw-translate-y-1/2 tw-text-slate-400" />
            <input
              type="text"
              className="tw-w-full tw-pl-9 tw-pr-3 tw-py-2 tw-text-sm tw-border tw-border-slate-200 tw-rounded-xl focus:tw-outline-none focus:tw-border-indigo-500"
              placeholder="Tìm theo Mã ca khám (#ID), Tên bác sĩ..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <select
            className="tw-px-3 tw-py-2 tw-text-sm tw-border tw-border-slate-200 tw-rounded-xl tw-bg-white focus:tw-outline-none focus:tw-border-indigo-500"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="ALL">Tất cả trạng thái thù lao</option>
            <option value="AVAILABLE">Khả dụng (Sẵn sàng chi trả)</option>
            <option value="PAID">Đã chi trả vào ví</option>
            <option value="HELD">Đang tạm giữ khiếu nại</option>
          </select>
        </div>

        <div className="tw-flex tw-items-center tw-gap-2">
          

          {/* Nút Xem Nhật Ký Tự Động & Sơ Đồ Luồng Tiền */}
          <button
            type="button"
            className="tw-px-3.5 tw-py-2 tw-text-sm tw-font-bold tw-text-indigo-700 hover:tw-text-indigo-800 tw-bg-indigo-50 hover:tw-bg-indigo-100 tw-rounded-xl tw-border tw-border-indigo-200 tw-flex tw-items-center tw-gap-1.5 tw-transition tw-cursor-pointer"
            onClick={() => setIsAuditDrawerOpen(true)}
            title="Mở nhật ký phiên chạy tự động và bóc tách sơ đồ dòng tiền từng ca khám"
          >
            <Layers size={15} className="tw-text-indigo-600" />
            <span>Sổ Nhật Ký & Luồng Tiền Tự Động</span>
          </button>

          {/* Nút Quyết Toán Tự Động Toàn Sàn - Mở Modal UI đẹp, không popup đen */}
          <button
            type="button"
            className="tw-px-3.5 tw-py-2 tw-text-sm tw-font-bold tw-text-emerald-800 hover:tw-text-emerald-900 tw-bg-emerald-50 hover:tw-bg-emerald-100 tw-rounded-xl tw-border tw-border-emerald-300 tw-flex tw-items-center tw-gap-1.5 tw-transition tw-cursor-pointer"
            onClick={() => setConfirmRunModalOpen(true)}
            title="Quét toàn bộ ca khám Khả dụng, phân bổ vào từng ví Bác sĩ và ghi nhận sổ cái"
          >
            <Sparkles size={15} className="tw-text-emerald-600" />
            <span>Chạy Quyết Toán Toàn Sàn</span>
          </button>

          {/* Nút chi trả hàng loạt đã tick */}
          {selectedIds.length > 0 && (
            <button
              type="button"
              className="tw-px-4 tw-py-2 tw-text-sm tw-font-bold tw-text-white tw-bg-emerald-600 hover:tw-bg-emerald-700 tw-rounded-xl tw-border-none tw-cursor-pointer tw-flex tw-items-center tw-gap-1.5 tw-shadow-sm tw-transition"
              onClick={() => handleOpenPayout(null)}
            >
              <Send size={14} />
              <span>Chi Trả ({selectedIds.length} ca đã chọn)</span>
            </button>
          )}

          <button
            type="button"
            className="tw-px-3.5 tw-py-2 tw-text-sm tw-font-semibold tw-text-slate-600 hover:tw-text-indigo-600 tw-bg-slate-50 hover:tw-bg-indigo-50 tw-rounded-xl tw-border tw-border-slate-200 tw-flex tw-items-center tw-gap-1.5 tw-transition tw-cursor-pointer"
            onClick={loadSettlements}
            disabled={loading}
          >
            <RotateCw size={14} className={loading ? 'tw-animate-spin' : ''} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* ── 3. Table of Settlement Items ── */}
      <div className="tw-bg-white tw-rounded-2xl tw-border tw-border-slate-200 tw-shadow-sm tw-overflow-hidden">
        <div className="tw-overflow-x-auto">
          <table className="tw-w-full tw-text-left tw-border-collapse">
            <thead>
              <tr className="tw-bg-slate-50 tw-border-b tw-border-slate-200 tw-text-slate-600 tw-text-xs tw-uppercase tw-font-bold tw-tracking-wider">
                <th className="tw-p-4 tw-w-10">
                  <button
                    type="button"
                    className="tw-border-none tw-bg-transparent tw-cursor-pointer tw-text-slate-500 hover:tw-text-indigo-600"
                    onClick={handleSelectAllAvailable}
                    title="Chọn tất cả ca khám Khả dụng"
                  >
                    <CheckSquare size={16} />
                  </button>
                </th>
                <th className="tw-p-4">Ca Khám / Mã Quyết Toán</th>
                <th className="tw-p-4">Bác Sĩ Thụ Hưởng</th>
                <th className="tw-p-4">Ngày Khám & Hoàn Tất</th>
                <th className="tw-p-4 tw-text-right">Doanh Thu Gốc</th>
                <th className="tw-p-4 tw-text-center">Chiết Khấu Sàn</th>
                <th className="tw-p-4 tw-text-right">Thù Lao Thực Nhận</th>
                <th className="tw-p-4 tw-text-center">Trạng Thái Tiền</th>
                <th className="tw-p-4 tw-text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="tw-divide-y tw-divide-slate-100 tw-text-sm">
              {loading ? (
                <tr>
                  <td colSpan="9" className="tw-p-8 tw-text-center tw-text-slate-400">
                    <RotateCw size={24} className="tw-animate-spin tw-mx-auto tw-mb-2 tw-text-indigo-500" />
                    Đang tải dữ liệu quyết toán thù lao...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan="9" className="tw-p-8 tw-text-center tw-text-slate-400">
                    Không tìm thấy khoản quyết toán nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const statusInfo = STATUS_CONFIG[item.status] || STATUS_CONFIG.AVAILABLE;
                  const isAvailable = item.status === 'AVAILABLE' || item.status === 'EARNED';
                  const isSelected = selectedIds.includes(item.id);

                  return (
                    <tr
                      key={item.id}
                      className={`hover:tw-bg-slate-50/80 tw-transition ${
                        isSelected ? 'tw-bg-emerald-50/50' : ''
                      }`}
                    >
                      <td className="tw-p-4">
                        {isAvailable ? (
                          <button
                            type="button"
                            className="tw-border-none tw-bg-transparent tw-cursor-pointer tw-text-emerald-600"
                            onClick={() => handleToggleSelect(item.id)}
                          >
                            {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                          </button>
                        ) : (
                          <span className="tw-text-slate-300">
                            <Square size={16} />
                          </span>
                        )}
                      </td>

                      <td className="tw-p-4">
                        <div className="tw-font-mono tw-font-bold tw-text-indigo-600">
                          #SETTLE-{item.id}
                        </div>
                        <div className="tw-text-xs tw-text-slate-500 tw-mt-0.5">
                          Ca khám: <strong className="tw-text-slate-700">#{item.bookingId}</strong>
                        </div>
                      </td>

                      <td className="tw-p-4">
                        <div className="tw-font-semibold tw-text-slate-800">
                          {item.doctor ? `${item.doctor.firstName} ${item.doctor.lastName}` : `#${item.doctorId}`}
                        </div>
                        <div className="tw-text-xs tw-text-slate-500">
                          Email: {item.doctor?.email || '—'}
                        </div>
                      </td>

                      <td className="tw-p-4">
                        <div className="tw-text-xs tw-font-medium tw-text-slate-700">
                          Khám: {item.appointmentDate ? moment(item.appointmentDate).format('DD/MM/YYYY') : '—'}
                        </div>
                        <div className="tw-text-2xs tw-text-slate-400 tw-mt-0.5">
                          Hoàn tất: {item.earnedAt ? moment(item.earnedAt).format('DD/MM HH:mm') : '—'}
                        </div>
                      </td>

                      <td className="tw-p-4 tw-text-right tw-font-medium tw-text-slate-700 tw-font-mono">
                        {formatMoney(item.grossAmount)}
                      </td>

                      <td className="tw-p-4 tw-text-center">
                        <div className="tw-text-xs tw-font-bold tw-text-slate-700">
                          {item.platformFeeRate}%
                        </div>
                        <div className="tw-text-2xs tw-text-slate-400 tw-font-mono">
                          -{formatMoney(item.platformFee)}
                        </div>
                      </td>

                      <td className="tw-p-4 tw-text-right">
                        <div className="tw-font-black tw-text-emerald-700 tw-text-base tw-font-mono">
                          {formatMoney(item.netAmount)}
                        </div>
                      </td>

                      <td className="tw-p-4 tw-text-center">
                        {item.status === 'AVAILABLE' && item.note && item.note.includes('DEFERRED_LIQUIDITY_LIMIT') ? (
                          <div>
                            <span
                              className="tw-inline-block tw-px-2.5 tw-py-1 tw-rounded-full tw-text-xs tw-font-bold tw-border tw-bg-amber-50 tw-text-amber-800 tw-border-amber-300"
                              title={item.note}
                            >
                              ⏳ Xếp Hàng Đợt Sau (FIFO)
                            </span>
                            <div className="tw-text-2xs tw-text-amber-700 tw-mt-0.5">
                              Chưa đủ hạn mức đợt này
                            </div>
                          </div>
                        ) : (
                          <span
                            className="tw-inline-block tw-px-2.5 tw-py-1 tw-rounded-full tw-text-xs tw-font-bold tw-border"
                            style={{
                              backgroundColor: statusInfo.bg,
                              color: statusInfo.color,
                              borderColor: statusInfo.border,
                            }}
                          >
                            {statusInfo.label}
                          </span>
                        )}
                        {item.paidAt && (
                          <div className="tw-text-2xs tw-text-slate-400 tw-mt-0.5">
                            {moment(item.paidAt).format('DD/MM/YYYY HH:mm')}
                          </div>
                        )}
                      </td>

                      <td className="tw-p-4 tw-text-right">
                        <div className="tw-flex tw-items-center tw-justify-end tw-gap-1.5">
                          {isAvailable && (
                            <button
                              type="button"
                              className="tw-px-3 tw-py-1.5 tw-bg-emerald-600 hover:tw-bg-emerald-700 tw-text-white tw-rounded-xl tw-text-xs tw-font-bold tw-border-none tw-cursor-pointer tw-flex tw-items-center tw-gap-1 tw-shadow-sm tw-transition"
                              onClick={() => {
                                setSelectedIds([item.id]);
                                handleOpenPayout(null);
                              }}
                              title="Chi trả thù lao vào ví bác sĩ ngay"
                            >
                              <Send size={12} />
                              <span>Chi trả</span>
                            </button>
                          )}

                          {item.status === 'PAID' && item.walletTransactionId && (
                            <span className="tw-text-2xs tw-font-mono tw-text-slate-600 tw-px-1.5 tw-py-0.5 tw-bg-slate-100 tw-rounded tw-border tw-border-slate-200">
                              TX #{item.walletTransactionId.substring(0, 8)}
                            </span>
                          )}

                          <button
                            type="button"
                            className="tw-p-1.5 tw-bg-slate-100 hover:tw-bg-slate-200 tw-text-slate-600 hover:tw-text-slate-900 tw-rounded-xl tw-border-none tw-cursor-pointer tw-transition"
                            onClick={() => setSelectedDetailItem(item)}
                            title="Xem chi tiết phân tích tài chính ca khám"
                          >
                            <Eye size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > 0 && (
          <div className="tw-p-4 tw-border-t tw-border-slate-200 tw-flex tw-flex-col sm:tw-flex-row sm:tw-items-center sm:tw-justify-between tw-gap-3 tw-bg-slate-50/50">
            <div className="tw-flex tw-items-center tw-gap-3">
              <span className="tw-text-xs tw-text-slate-600 tw-font-medium">
                Hiển thị <strong className="tw-text-slate-900">{items.length}</strong> / <strong className="tw-text-slate-900">{total}</strong> khoản quyết toán
              </span>
              <span className="tw-text-2xs tw-text-slate-400">|</span>
              <div className="tw-flex tw-items-center tw-gap-1.5 tw-text-xs tw-text-slate-500">
                <span>Số dòng:</span>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                  className="tw-px-2 tw-py-1 tw-text-xs tw-border tw-border-slate-200 tw-rounded-lg tw-bg-white tw-font-semibold tw-text-slate-700"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            <div className="tw-flex tw-items-center tw-gap-1.5">
              <button
                type="button"
                className="tw-px-3 tw-py-1.5 tw-text-xs tw-font-semibold tw-border tw-border-slate-200 tw-rounded-lg tw-bg-white hover:tw-bg-slate-50 disabled:tw-opacity-40 tw-cursor-pointer disabled:tw-cursor-not-allowed tw-transition"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Trước
              </button>
              <span className="tw-px-3 tw-py-1.5 tw-text-xs tw-font-mono tw-font-bold tw-text-slate-700 tw-bg-white tw-border tw-border-slate-200 tw-rounded-lg">
                Trang {page} / {Math.max(1, totalPages)}
              </span>
              <button
                type="button"
                className="tw-px-3 tw-py-1.5 tw-text-xs tw-font-semibold tw-border tw-border-slate-200 tw-rounded-lg tw-bg-white hover:tw-bg-slate-50 disabled:tw-opacity-40 tw-cursor-pointer disabled:tw-cursor-not-allowed tw-transition"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL XÁC NHẬN CHẠY QUYẾT TOÁN TỰ ĐỘNG (THAY THẾ WINDOW.CONFIRM) ── */}
      {confirmRunModalOpen && (
        <div
          className="tw-fixed tw-inset-0 tw-bg-slate-900/60 tw-backdrop-blur-sm tw-z-50 tw-flex tw-items-center tw-justify-center tw-p-4 tw-animate-in tw-fade-in tw-duration-150"
          onClick={() => !isRunningAutoCycle && setConfirmRunModalOpen(false)}
        >
          <div
            className="tw-bg-white tw-rounded-3xl tw-shadow-2xl tw-w-full tw-max-w-lg tw-overflow-hidden tw-border tw-border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="tw-p-6 tw-bg-slate-50 tw-border-b tw-border-slate-100 tw-flex tw-items-center tw-justify-between">
              <div className="tw-flex tw-items-center tw-gap-3">
                <div className="tw-w-10 tw-h-10 tw-rounded-2xl tw-bg-emerald-100 tw-text-emerald-700 tw-flex tw-items-center tw-justify-center">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="tw-font-bold tw-text-base tw-text-slate-900 tw-m-0">
                    Kích Hoạt Chu Trình Quyết Toán Tự Động
                  </h3>
                  <div className="tw-text-xs tw-text-slate-500">
                    Cơ chế T+0 • Phân bổ thù lao trực tiếp vào Ví Bác sĩ
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="tw-text-slate-400 hover:tw-text-slate-600 tw-border-none tw-bg-transparent tw-p-1 tw-cursor-pointer"
                onClick={() => !isRunningAutoCycle && setConfirmRunModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="tw-p-6 tw-space-y-4">
              {/* Thống kê ca khám sẵn sàng */}
              <div className="tw-grid tw-grid-cols-2 tw-gap-3">
                <div className="tw-p-4 tw-bg-emerald-50/60 tw-border tw-border-emerald-200 tw-rounded-2xl">
                  <div className="tw-text-2xs tw-font-bold tw-text-emerald-800 tw-uppercase tw-tracking-wider">
                    Ca Khám Chờ Chi Trả
                  </div>
                  <div className="tw-text-2xl tw-font-black tw-text-emerald-700 tw-mt-1 tw-font-mono">
                    {availableCountTotal} ca
                  </div>
                  <div className="tw-text-2xs tw-text-emerald-600 tw-mt-0.5">
                    Trạng thái: AVAILABLE (T+0)
                  </div>
                </div>

                <div className="tw-p-4 tw-bg-indigo-50/60 tw-border tw-border-indigo-200 tw-rounded-2xl">
                  <div className="tw-text-2xs tw-font-bold tw-text-indigo-800 tw-uppercase tw-tracking-wider">
                    Tổng Thù Lao Dự Kiến
                  </div>
                  <div className="tw-text-xl tw-font-black tw-text-indigo-700 tw-mt-1 tw-font-mono">
                    {formatMoney(availableAmountTotal)}
                  </div>
                  <div className="tw-text-2xs tw-text-indigo-600 tw-mt-0.5">
                    Hạch toán vào Ví bác sĩ
                  </div>
                </div>
              </div>

              {/* Sơ đồ luồng tiền đối soát */}
              <div className="tw-p-4 tw-bg-slate-900 tw-text-white tw-rounded-2xl tw-space-y-2.5">
                <div className="tw-text-xs tw-font-bold tw-text-slate-300">
                  Quy Trình Tự Động Hóa Vận Hành
                </div>
                <div className="tw-text-2xs tw-text-slate-300 tw-space-y-1.5 tw-font-mono">
                  <div className="tw-flex tw-items-center tw-gap-2">
                    <span className="tw-w-2 tw-h-2 tw-rounded-full tw-bg-emerald-400"></span>
                    <span>1. Quét toàn bộ ca khám đã hoàn tất (AVAILABLE)</span>
                  </div>
                  <div className="tw-flex tw-items-center tw-gap-2">
                    <span className="tw-w-2 tw-h-2 tw-rounded-full tw-bg-blue-400"></span>
                    <span>2. Gom nhóm theo từng Bác sĩ & trích từ Quỹ Escrow sàn</span>
                  </div>
                  <div className="tw-flex tw-items-center tw-gap-2">
                    <span className="tw-w-2 tw-h-2 tw-rounded-full tw-bg-purple-400"></span>
                    <span>3. Cộng số dư khả dụng vào Ví Bác sĩ & ghi nhận Bút toán kép</span>
                  </div>
                  <div className="tw-flex tw-items-center tw-gap-2">
                    <span className="tw-w-2 tw-h-2 tw-rounded-full tw-bg-amber-400"></span>
                    <span>4. Lưu vết Sơ đồ dòng tiền vào Sổ Nhật Ký Kiểm Toán</span>
                  </div>
                </div>
              </div>

              {/* ── ĐIỀU PHỐI HẠN MỨC THANH KHOẢN (LIQUIDITY BUDGET WATERFALL) ── */}
              {availableCountTotal > 0 && (
                <div className="tw-p-4 tw-bg-slate-50 tw-border tw-border-slate-200 tw-rounded-2xl tw-space-y-3">
                  <div className="tw-flex tw-items-center tw-justify-between">
                    <div>
                      <span className="tw-text-xs tw-font-bold tw-text-slate-900 tw-block">
                        Hạn Mức Ngân Quỹ Giải Ngân (Liquidity Budget Cap)
                      </span>
                      <span className="tw-text-2xs tw-text-slate-500">
                        Kiểm soát lượng tiền mặt thực chi đợt này khi sàn có vốn đầu tư bên ngoài
                      </span>
                    </div>
                  </div>

                  {/* Mode selector */}
                  <div className="tw-grid tw-grid-cols-2 tw-gap-2">
                    <button
                      type="button"
                      className={`tw-py-2 tw-px-3 tw-text-xs tw-font-bold tw-rounded-xl tw-border tw-transition tw-cursor-pointer ${
                        budgetMode === 'UNLIMITED'
                          ? 'tw-bg-emerald-600 tw-text-white tw-border-emerald-600 tw-shadow-sm'
                          : 'tw-bg-white tw-text-slate-700 tw-border-slate-200 hover:tw-bg-slate-100'
                      }`}
                      onClick={() => setBudgetMode('UNLIMITED')}
                    >
                      100% Khả dụng (Không giới hạn)
                    </button>
                    <button
                      type="button"
                      className={`tw-py-2 tw-px-3 tw-text-xs tw-font-bold tw-rounded-xl tw-border tw-transition tw-cursor-pointer ${
                        budgetMode === 'CUSTOM'
                          ? 'tw-bg-indigo-600 tw-text-white tw-border-indigo-600 tw-shadow-sm'
                          : 'tw-bg-white tw-text-slate-700 tw-border-slate-200 hover:tw-bg-slate-100'
                      }`}
                      onClick={() => setBudgetMode('CUSTOM')}
                    >
                      Giới hạn Hạn mức (Custom Cap)
                    </button>
                  </div>

                  {/* Custom input */}
                  {budgetMode === 'CUSTOM' && (
                    <div className="tw-pt-2 tw-border-t tw-border-slate-200 tw-space-y-2">
                      <div className="tw-flex tw-items-center tw-gap-2">
                        <div className="tw-relative tw-flex-1">
                          <input
                            type="text"
                            className="tw-w-full tw-pl-3 tw-pr-8 tw-py-2 tw-text-sm tw-font-mono tw-font-bold tw-border tw-border-slate-300 tw-rounded-xl focus:tw-outline-none focus:tw-border-indigo-500"
                            placeholder="Nhập số tiền tối đa (₫)..."
                            value={customBudgetStr}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/[^0-9]/g, '');
                              const num = parseInt(raw, 10) || 0;
                              setCustomBudgetAmount(num);
                              setCustomBudgetStr(num > 0 ? num.toLocaleString('vi-VN') : '');
                            }}
                          />
                          <span className="tw-absolute tw-right-3 tw-top-1/2 -tw-translate-y-1/2 tw-text-xs tw-font-bold tw-text-slate-400">
                            ₫
                          </span>
                        </div>

                        {/* Quick Presets */}
                        <div className="tw-flex tw-gap-1">
                          {[
                            { label: '30%', ratio: 0.3 },
                            { label: '50%', ratio: 0.5 },
                            { label: '70%', ratio: 0.7 },
                          ].map((p) => (
                            <button
                              key={p.label}
                              type="button"
                              className="tw-px-2 tw-py-1.5 tw-text-2xs tw-font-bold tw-text-slate-600 hover:tw-text-indigo-600 tw-bg-white tw-border tw-border-slate-200 tw-rounded-lg tw-cursor-pointer hover:tw-bg-indigo-50"
                              onClick={() => {
                                const val = Math.round(availableAmountTotal * p.ratio);
                                setCustomBudgetAmount(val);
                                setCustomBudgetStr(val > 0 ? val.toLocaleString('vi-VN') : '');
                              }}
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Simulation info */}
                      <div className="tw-p-2.5 tw-bg-indigo-50/70 tw-border tw-border-indigo-100 tw-rounded-xl tw-text-2xs tw-text-indigo-900 tw-space-y-1">
                        <div className="tw-flex tw-justify-between">
                          <span>Ngân sách giải ngân đợt này:</span>
                          <strong className="tw-font-mono">{formatMoney(customBudgetAmount)}</strong>
                        </div>
                        <div className="tw-flex tw-justify-between">
                          <span>Dự kiến hoãn chi sang đợt tiếp (FIFO):</span>
                          <strong className="tw-font-mono tw-text-amber-700">
                            {formatMoney(Math.max(0, availableAmountTotal - customBudgetAmount))}
                          </strong>
                        </div>
                        <div className="tw-text-2xs tw-text-slate-500 tw-italic tw-pt-0.5">
                          * Các ca khám hoàn thành trước sẽ được ưu tiên giải ngân trước (FIFO). Ca khám chưa đủ hạn mức sẽ giữ nguyên để dời sang đợt kế tiếp.
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {availableCountTotal === 0 && (
                <div className="tw-p-3.5 tw-bg-amber-50 tw-border tw-border-amber-200 tw-rounded-2xl tw-flex tw-items-start tw-gap-2.5">
                  <AlertCircle size={18} className="tw-text-amber-600 tw-shrink-0 tw-mt-0.5" />
                  <div className="tw-text-xs tw-text-amber-800">
                    <strong>Hiện không có ca khám nào ở trạng thái Khả Dụng</strong>. Bạn có thể bấm nút{' '}
                    <button
                      type="button"
                      className="tw-font-bold tw-underline tw-text-amber-900 hover:tw-text-amber-950 tw-bg-transparent tw-border-none tw-cursor-pointer tw-p-0"
                      onClick={handleSeedTestData}
                    >
                      "Nạp 20 Ca Mẫu"
                    </button>{' '}
                    để tạo dữ liệu đối soát thử nghiệm.
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="tw-p-4 tw-bg-slate-50 tw-border-t tw-border-slate-100 tw-flex tw-items-center tw-justify-between">
              <button
                type="button"
                className="tw-px-4 tw-py-2 tw-text-xs tw-font-semibold tw-text-slate-600 hover:tw-text-slate-800 tw-bg-transparent tw-border-none tw-cursor-pointer"
                onClick={() => setConfirmRunModalOpen(false)}
                disabled={isRunningAutoCycle}
              >
                Hủy bỏ
              </button>

              <div className="tw-flex tw-items-center tw-gap-2">
                {availableCountTotal === 0 ? (
                  <button
                    type="button"
                    className="tw-px-5 tw-py-2.5 tw-bg-slate-800 hover:tw-bg-slate-900 tw-text-white tw-rounded-xl tw-text-xs tw-font-bold tw-border-none tw-cursor-pointer tw-flex tw-items-center tw-gap-1.5 tw-transition"
                    onClick={handleSeedTestData}
                    disabled={seedingData}
                  >
                    <Database size={14} className={seedingData ? 'tw-animate-spin' : ''} />
                    <span>{seedingData ? 'Đang nạp...' : 'Nạp 20 Ca Mẫu Trước'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="tw-px-5 tw-py-2.5 tw-bg-emerald-600 hover:tw-bg-emerald-700 tw-text-white tw-rounded-xl tw-text-xs tw-font-bold tw-border-none tw-cursor-pointer tw-flex tw-items-center tw-gap-1.5 tw-shadow-sm tw-transition"
                    onClick={handleExecuteAutoPayout}
                    disabled={isRunningAutoCycle}
                  >
                    <Play size={14} className={isRunningAutoCycle ? 'tw-animate-spin' : ''} />
                    <span>{isRunningAutoCycle ? 'Hệ thống đang đối soát...' : 'Xác Nhận & Khởi Chạy Ngay'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: XÁC NHẬN CHI TRẢ THÙ LAO VÀO VÍ BÁC SĨ (THỦ CÔNG) ── */}
      {payoutModalOpen && (
        <div
          className="tw-fixed tw-inset-0 tw-bg-slate-900/60 tw-backdrop-blur-sm tw-z-50 tw-flex tw-items-center tw-justify-center tw-p-4"
          onClick={() => !submittingPayout && setPayoutModalOpen(false)}
        >
          <div
            className="tw-bg-white tw-rounded-3xl tw-shadow-2xl tw-w-full tw-max-w-md tw-overflow-hidden tw-border tw-border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="tw-px-6 tw-py-4 tw-bg-emerald-600 tw-text-white tw-flex tw-justify-between tw-items-center">
              <div className="tw-flex tw-items-center tw-gap-2">
                <Send size={18} />
                <h3 className="tw-font-bold tw-text-base tw-m-0">Xác Nhận Chi Trả Thù Lao</h3>
              </div>
              <button
                type="button"
                className="tw-text-white/80 hover:tw-text-white tw-border-none tw-bg-transparent tw-text-xl tw-cursor-pointer"
                onClick={() => !submittingPayout && setPayoutModalOpen(false)}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmitPayout} className="tw-p-6 tw-space-y-4">
              <div className="tw-bg-emerald-50 tw-border tw-border-emerald-200 tw-p-4 tw-rounded-2xl tw-space-y-2">
                <div className="tw-text-xs tw-text-emerald-800">
                  Tổng số ca khám được chi trả: <strong>{selectedIds.length} ca</strong>
                </div>
                <div className="tw-text-xs tw-text-emerald-800">
                  Tổng thù lao thực nhận:
                  <div className="tw-text-2xl tw-font-black tw-text-emerald-700 tw-mt-0.5 tw-font-mono">
                    {formatMoney(
                      items
                        .filter((x) => selectedIds.includes(x.id))
                        .reduce((sum, item) => sum + Number(item.netAmount || 0), 0)
                    )}
                  </div>
                </div>
                <div className="tw-text-2xs tw-text-emerald-600 tw-border-t tw-border-emerald-200 tw-pt-2">
                  Khoản tiền này sẽ được cộng trực tiếp vào số dư khả dụng ví của Bác sĩ và ghi nhận bút toán kép Sổ cái kèm mã truy vết.
                </div>
              </div>

              <div>
                <label className="tw-block tw-text-xs tw-font-bold tw-text-slate-700 tw-mb-1">
                  Ghi chú đợt quyết toán (Tùy chọn):
                </label>
                <input
                  type="text"
                  className="tw-w-full tw-p-2.5 tw-border tw-border-slate-300 tw-rounded-xl tw-text-sm"
                  placeholder="VD: Quyết toán ca khám hoàn tất..."
                  value={payoutNote}
                  onChange={(e) => setPayoutNote(e.target.value)}
                />
              </div>

              <div className="tw-flex tw-justify-end tw-gap-2 tw-pt-2">
                <button
                  type="button"
                  className="tw-px-4 tw-py-2 tw-bg-slate-100 hover:tw-bg-slate-200 tw-text-slate-700 tw-rounded-xl tw-text-sm tw-font-semibold tw-border-none tw-cursor-pointer"
                  onClick={() => setPayoutModalOpen(false)}
                  disabled={submittingPayout}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="tw-px-5 tw-py-2 tw-bg-emerald-600 hover:tw-bg-emerald-700 tw-text-white tw-rounded-xl tw-text-sm tw-font-bold tw-border-none tw-cursor-pointer tw-flex tw-items-center tw-gap-1.5"
                  disabled={submittingPayout}
                >
                  {submittingPayout ? 'Đang chi trả...' : 'Xác nhận Kết chuyển vào Ví'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: CHI TIẾT CA KHÁM & QUYẾT TOÁN THÙ LAO ── */}
      {selectedDetailItem && (
        <div
          className="tw-fixed tw-inset-0 tw-bg-slate-900/60 tw-backdrop-blur-sm tw-z-50 tw-flex tw-items-center tw-justify-center tw-p-4"
          onClick={() => setSelectedDetailItem(null)}
        >
          <div
            className="tw-bg-white tw-rounded-3xl tw-shadow-2xl tw-w-full tw-max-w-lg tw-overflow-hidden tw-border tw-border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="tw-px-6 tw-py-4 tw-bg-slate-900 tw-text-white tw-flex tw-justify-between tw-items-center">
              <div className="tw-flex tw-items-center tw-gap-2.5">
                <FileCheck size={18} className="tw-text-emerald-400" />
                <div>
                  <h3 className="tw-font-bold tw-text-base tw-m-0">
                    Bảng Kê Ca Khám #{selectedDetailItem.id}
                  </h3>
                  <div className="tw-text-2xs tw-text-slate-400">
                    Mã đối soát: #SETTLE-{selectedDetailItem.id} • Ca khám: #{selectedDetailItem.bookingId}
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="tw-text-slate-400 hover:tw-text-white tw-border-none tw-bg-transparent tw-p-1 tw-cursor-pointer"
                onClick={() => setSelectedDetailItem(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="tw-p-6 tw-space-y-4 tw-max-h-[75vh] tw-overflow-y-auto">
              {/* Status Banner */}
              <div
                className="tw-p-3.5 tw-rounded-2xl tw-border tw-flex tw-items-center tw-justify-between"
                style={{
                  backgroundColor: STATUS_CONFIG[selectedDetailItem.status]?.bg || '#f8fafc',
                  borderColor: STATUS_CONFIG[selectedDetailItem.status]?.border || '#cbd5e1',
                  color: STATUS_CONFIG[selectedDetailItem.status]?.color || '#334155',
                }}
              >
                <div>
                  <div className="tw-text-xs tw-font-bold">
                    {STATUS_CONFIG[selectedDetailItem.status]?.label || selectedDetailItem.status}
                  </div>
                  <div className="tw-text-2xs tw-opacity-80">
                    {STATUS_CONFIG[selectedDetailItem.status]?.desc || ''}
                  </div>
                </div>
                {(selectedDetailItem.status === 'AVAILABLE' || selectedDetailItem.status === 'EARNED') && (
                  <button
                    type="button"
                    className="tw-px-3 tw-py-1.5 tw-bg-emerald-600 hover:tw-bg-emerald-700 tw-text-white tw-rounded-xl tw-text-xs tw-font-bold tw-border-none tw-cursor-pointer tw-flex tw-items-center tw-gap-1 tw-shadow-sm"
                    onClick={() => {
                      const item = selectedDetailItem;
                      setSelectedDetailItem(null);
                      setSelectedIds([item.id]);
                      handleOpenPayout(null);
                    }}
                  >
                    <Send size={12} />
                    <span>Chi trả ví ngay</span>
                  </button>
                )}
              </div>

              {/* Bác sĩ & Bệnh nhân */}
              <div className="tw-grid tw-grid-cols-2 tw-gap-3">
                <div className="tw-p-3.5 tw-bg-slate-50 tw-rounded-2xl tw-border tw-border-slate-100">
                  <div className="tw-text-2xs tw-font-bold tw-text-slate-400 tw-uppercase tw-tracking-wider tw-mb-1">
                    Bác Sĩ Thụ Hưởng
                  </div>
                  <div className="tw-font-bold tw-text-xs tw-text-slate-900">
                    {selectedDetailItem.doctor
                      ? `${selectedDetailItem.doctor.lastName || ''} ${selectedDetailItem.doctor.firstName || ''}`
                      : `BS #${selectedDetailItem.doctorId}`}
                  </div>
                  <div className="tw-text-2xs tw-text-slate-500 tw-truncate">
                    {selectedDetailItem.doctor?.email || `ID: #${selectedDetailItem.doctorId}`}
                  </div>
                </div>

                <div className="tw-p-3.5 tw-bg-slate-50 tw-rounded-2xl tw-border tw-border-slate-100">
                  <div className="tw-text-2xs tw-font-bold tw-text-slate-400 tw-uppercase tw-tracking-wider tw-mb-1">
                    Bệnh Nhân / Khách Hàng
                  </div>
                  <div className="tw-font-bold tw-text-xs tw-text-slate-900">
                    {selectedDetailItem.booking?.patientName || 'Bệnh nhân'}
                  </div>
                  <div className="tw-text-2xs tw-text-slate-500">
                    {selectedDetailItem.booking?.patientPhoneNumber || 'N/A'}
                  </div>
                </div>
              </div>

              {/* Chi tiết phân chia tài chính */}
              <div className="tw-p-4 tw-bg-slate-900 tw-text-white tw-rounded-2xl tw-space-y-3">
                <div className="tw-text-xs tw-font-bold tw-text-slate-300 tw-border-b tw-border-slate-800 tw-pb-2">
                  Phân Tích Bóc Tách Tài Chính Ca Khám
                </div>
                <div className="tw-flex tw-justify-between tw-text-xs">
                  <span className="tw-text-slate-400">Doanh thu gốc bệnh nhân trả:</span>
                  <span className="tw-font-semibold tw-text-slate-200 tw-font-mono">
                    {formatMoney(selectedDetailItem.originalAmount || selectedDetailItem.grossAmount)}
                  </span>
                </div>
                <div className="tw-flex tw-justify-between tw-text-xs">
                  <span className="tw-text-rose-300">
                    Chiết khấu sàn thu ({Number(selectedDetailItem.platformFeeRate || 0)}%):
                  </span>
                  <span className="tw-font-semibold tw-text-rose-400 tw-font-mono">
                    -{formatMoney(selectedDetailItem.platformFee)}
                  </span>
                </div>
                {Number(selectedDetailItem.clinicShare || 0) > 0 && (
                  <div className="tw-flex tw-justify-between tw-text-xs">
                    <span className="tw-text-amber-300">Phần trích cơ sở y tế:</span>
                    <span className="tw-font-semibold tw-text-amber-400 tw-font-mono">
                      -{formatMoney(selectedDetailItem.clinicShare)}
                    </span>
                  </div>
                )}
                <div className="tw-border-t tw-border-slate-800 tw-pt-2 tw-flex tw-justify-between tw-items-center">
                  <span className="tw-text-xs tw-font-bold tw-text-emerald-400">
                    Thù lao Bác sĩ thực nhận (Net):
                  </span>
                  <span className="tw-text-lg tw-font-black tw-text-emerald-400 tw-font-mono">
                    {formatMoney(selectedDetailItem.netAmount)}
                  </span>
                </div>
              </div>

              {/* Mốc thời gian */}
              <div className="tw-bg-slate-50 tw-rounded-2xl tw-p-3.5 tw-border tw-border-slate-100 tw-space-y-2 tw-text-2xs">
                <div className="tw-flex tw-justify-between">
                  <span className="tw-text-slate-500">Thời điểm ca khám hoàn tất:</span>
                  <span className="tw-font-medium tw-text-slate-700">
                    {selectedDetailItem.earnedAt
                      ? moment(selectedDetailItem.earnedAt).format('DD/MM/YYYY HH:mm:ss')
                      : 'N/A'}
                  </span>
                </div>
                <div className="tw-flex tw-justify-between">
                  <span className="tw-text-slate-500">Tính chất chu trình:</span>
                  <span className="tw-font-semibold tw-text-emerald-700">
                    T+0 (Khả dụng thanh toán ngay)
                  </span>
                </div>
                {selectedDetailItem.paidAt && (
                  <div className="tw-flex tw-justify-between">
                    <span className="tw-text-slate-500">Thời điểm chi trả ví:</span>
                    <span className="tw-font-medium tw-text-blue-700">
                      {moment(selectedDetailItem.paidAt).format('DD/MM/YYYY HH:mm:ss')}
                    </span>
                  </div>
                )}
                {selectedDetailItem.walletTransactionId && (
                  <div className="tw-flex tw-justify-between">
                    <span className="tw-text-slate-500">Mã bút toán ví liên kết:</span>
                    <span className="tw-font-mono tw-font-semibold tw-text-slate-800">
                      #TXN-{selectedDetailItem.walletTransactionId}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="tw-p-4 tw-bg-slate-100 tw-border-t tw-border-slate-200 tw-flex tw-justify-end">
              <button
                type="button"
                className="tw-px-4 tw-py-2 tw-bg-white hover:tw-bg-slate-200 tw-text-slate-700 tw-rounded-xl tw-text-xs tw-font-semibold tw-border tw-border-slate-300 tw-cursor-pointer"
                onClick={() => setSelectedDetailItem(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DRAWER: SỔ NHẬT KÝ TỰ ĐỘNG & SƠ ĐỒ TRUY VẾT LUỒNG TIỀN (MONEY ROUTING AUDIT) ── */}
      <MoneyRoutingAuditDrawer
        isOpen={isAuditDrawerOpen}
        onClose={() => setIsAuditDrawerOpen(false)}
        onRefreshParent={loadSettlements}
      />
    </div>
  );
}
