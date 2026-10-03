// src/containers/System/Admin/Financial/DoctorSettlementsTab.jsx
// Phân hệ Quản trị Quyết toán Thù lao Bác sĩ theo Ca khám (Doctor Settlement Governance)
import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import moment from 'moment';
import {
  RotateCw,
  Search,
  CheckCircle2,
  Clock,
  Coins,
  ShieldCheck,
  User,
  ArrowRight,
  Send,
  Sparkles,
  Calendar,
  AlertCircle,
  FileCheck,
  CheckSquare,
  Square,
  Eye,
  Unlock,
  X
} from 'lucide-react';
import {
  getAdminDoctorSettlements,
  payoutDoctorSettlements,
  releaseEligibleDoctorSettlements,
  unlockSingleDoctorSettlement
} from '../../../../services/walletService';

const STATUS_CONFIG = {
  EARNED: {
    label: 'Tạm tính (Giữ T+24h)',
    desc: 'Đang giữ 24h chờ đối soát khiếu nại',
    bg: '#fffbeb',
    color: '#b45309',
    border: '#fde68a',
  },
  AVAILABLE: {
    label: 'Khả dụng (Chờ chi)',
    desc: 'Đã đủ điều kiện chi trả vào ví bác sĩ',
    bg: '#ecfdf5',
    color: '#047857',
    border: '#a7f3d0',
  },
  PAID: {
    label: 'Đã chi trả',
    desc: 'Đã kết chuyển thành công vào ví bác sĩ',
    bg: '#eff6ff',
    color: '#1d4ed8',
    border: '#bfdbfe',
  },
  HELD: {
    label: 'Đang tạm giữ',
    desc: 'Có khiếu nại ca khám phát sinh',
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
  const [releasing, setReleasing] = useState(false);

  // Selection state for batch payout
  const [selectedIds, setSelectedIds] = useState([]);
  const [payoutModalOpen, setPayoutModalOpen] = useState(false);
  const [payoutTargetDoctor, setPayoutTargetDoctor] = useState(null);
  const [payoutNote, setPayoutNote] = useState('');
  const [submittingPayout, setSubmittingPayout] = useState(false);

  // Detail & Single Unlock Modal State
  const [selectedDetailItem, setSelectedDetailItem] = useState(null);
  const [unlockingId, setUnlockingId] = useState(null);

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

  // Quét và mở khóa T+24h
  const handleReleaseEligible = async () => {
    setReleasing(true);
    try {
      const res = await releaseEligibleDoctorSettlements();
      if (res && res.errCode === 0) {
        toast.success(res.message || 'Quét và mở khóa thù lao thành công!');
        loadSettlements();
      } else {
        toast.error(res?.errMessage || 'Không thể quét mở khóa thù lao');
      }
    } catch (err) {
      toast.error('Lỗi kết nối khi quét mở khóa thù lao');
    } finally {
      setReleasing(false);
    }
  };

  // Mở khóa sớm đơn lẻ 1 ca khám (Bypass T+24h)
  const handleUnlockSingle = async (itemId) => {
    if (!window.confirm(`Xác nhận mở khóa sớm thù lao ca khám #${itemId} sang trạng thái Khả dụng (AVAILABLE)?`)) {
      return;
    }
    setUnlockingId(itemId);
    try {
      const res = await unlockSingleDoctorSettlement(itemId);
      if (res && res.errCode === 0) {
        toast.success(res.message || 'Mở khóa thù lao thành công!');
        loadSettlements();
      } else {
        toast.error(res?.errMessage || 'Không thể mở khóa thù lao');
      }
    } catch (err) {
      toast.error('Lỗi kết nối khi mở khóa thù lao');
    } finally {
      setUnlockingId(null);
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
    const availableIds = items.filter((x) => x.status === 'AVAILABLE').map((x) => x.id);
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

  return (
    <div className="doctor-settlements-tab tw-space-y-6">
      {/* ── 1. KPI Cards: 3 Trạng thái Tiền Bác sĩ ── */}
      <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-4 tw-gap-4">
        {/* Card 1: EARNED T+24h */}
        <div className="tw-bg-white tw-p-5 tw-rounded-2xl tw-border tw-border-amber-200 tw-shadow-sm">
          <div className="tw-flex tw-justify-between tw-items-center">
            <span className="tw-text-xs tw-font-bold tw-text-amber-700 tw-uppercase tw-tracking-wider">
              1. Tạm Tính (Giữ T+24h)
            </span>
            <div className="tw-w-8 tw-h-8 tw-rounded-lg tw-bg-amber-50 tw-text-amber-600 tw-flex tw-items-center tw-justify-center">
              <Clock size={18} />
            </div>
          </div>
          <div className="tw-text-2xl tw-font-black tw-text-amber-700 tw-mt-2">
            {formatMoney(summary?.earnedAmount)}
          </div>
          <div className="tw-text-xs tw-text-amber-600 tw-mt-1">
            {summary?.earnedCount || 0} ca vừa khám xong, giữ 24h chống khiếu nại
          </div>
        </div>

        {/* Card 2: AVAILABLE */}
        <div className="tw-bg-white tw-p-5 tw-rounded-2xl tw-border tw-border-emerald-200 tw-shadow-sm">
          <div className="tw-flex tw-justify-between tw-items-center">
            <span className="tw-text-xs tw-font-bold tw-text-emerald-700 tw-uppercase tw-tracking-wider">
              2. Khả Dụng (Sẵn Sàng Chi)
            </span>
            <div className="tw-w-8 tw-h-8 tw-rounded-lg tw-bg-emerald-50 tw-text-emerald-600 tw-flex tw-items-center tw-justify-center">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="tw-text-2xl tw-font-black tw-text-emerald-700 tw-mt-2">
            {formatMoney(summary?.availableAmount)}
          </div>
          <div className="tw-text-xs tw-text-emerald-600 tw-mt-1">
            {summary?.availableCount || 0} ca đã qua 24h, đủ điều kiện trả ví
          </div>
        </div>

        {/* Card 3: PAID */}
        <div className="tw-bg-white tw-p-5 tw-rounded-2xl tw-border tw-border-indigo-200 tw-shadow-sm">
          <div className="tw-flex tw-justify-between tw-items-center">
            <span className="tw-text-xs tw-font-bold tw-text-indigo-700 tw-uppercase tw-tracking-wider">
              3. Đã Chi Trả Vào Ví
            </span>
            <div className="tw-w-8 tw-h-8 tw-rounded-lg tw-bg-indigo-50 tw-text-indigo-600 tw-flex tw-items-center tw-justify-center">
              <Coins size={18} />
            </div>
          </div>
          <div className="tw-text-2xl tw-font-black tw-text-indigo-700 tw-mt-2">
            {formatMoney(summary?.paidAmount)}
          </div>
          <div className="tw-text-xs tw-text-indigo-600 tw-mt-1">
            {summary?.paidCount || 0} ca đã hạch toán kết chuyển vào ví
          </div>
        </div>

        {/* Card 4: Platform Fee Kept */}
        <div className="tw-bg-white tw-p-5 tw-rounded-2xl tw-border tw-border-slate-200 tw-shadow-sm">
          <div className="tw-flex tw-justify-between tw-items-center">
            <span className="tw-text-xs tw-font-bold tw-text-slate-500 tw-uppercase tw-tracking-wider">
              Phí Dịch Vụ Sàn Thu
            </span>
            <div className="tw-w-8 tw-h-8 tw-rounded-lg tw-bg-slate-50 tw-text-slate-600 tw-flex tw-items-center tw-justify-center">
              <ShieldCheck size={18} />
            </div>
          </div>
          <div className="tw-text-2xl tw-font-black tw-text-slate-800 tw-mt-2">
            {formatMoney(summary?.totalPlatformFee)}
          </div>
          <div className="tw-text-xs tw-text-slate-500 tw-mt-1">
            Chiết khấu sàn từ tổng {formatMoney(summary?.totalGross)}
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
            <option value="EARNED">Tạm tính (Đang giữ T+24h)</option>
            <option value="PAID">Đã chi trả</option>
            <option value="HELD">Đang tạm giữ khiếu nại</option>
          </select>
        </div>

        <div className="tw-flex tw-items-center tw-gap-2">
          {/* Nút quét mở khóa T+24h */}
          <button
            type="button"
            className="tw-px-3.5 tw-py-2 tw-text-sm tw-font-semibold tw-text-amber-800 hover:tw-text-amber-900 tw-bg-amber-50 hover:tw-bg-amber-100 tw-rounded-xl tw-border tw-border-amber-200 tw-flex tw-items-center tw-gap-1.5 tw-transition"
            onClick={handleReleaseEligible}
            disabled={releasing}
            title="Tự động kiểm tra và chuyển các ca khám đã quá 24h từ EARNED sang AVAILABLE"
          >
            <Sparkles size={14} className={releasing ? 'tw-animate-spin' : ''} />
            <span>{releasing ? 'Đang mở khóa...' : 'Quét Mở Khóa T+24h'}</span>
          </button>

          {/* Nút chi trả hàng loạt */}
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
            className="tw-px-3.5 tw-py-2 tw-text-sm tw-font-semibold tw-text-slate-600 hover:tw-text-indigo-600 tw-bg-slate-50 hover:tw-bg-indigo-50 tw-rounded-xl tw-border tw-border-slate-200 tw-flex tw-items-center tw-gap-1.5 tw-transition"
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
                  const statusInfo = STATUS_CONFIG[item.status] || STATUS_CONFIG.EARNED;
                  const isAvailable = item.status === 'AVAILABLE';
                  const isSelected = selectedIds.includes(item.id);

                  // Tính thời gian mở khóa khả dụng nếu đang EARNED
                  let countdownText = null;
                  if (item.status === 'EARNED' && item.availableAt) {
                    const diffMs = new Date(item.availableAt).getTime() - Date.now();
                    if (diffMs > 0) {
                      const hoursLeft = Math.ceil(diffMs / (1000 * 60 * 60));
                      countdownText = `Mở sau ~${hoursLeft}h`;
                    } else {
                      countdownText = 'Đã đủ điều kiện mở';
                    }
                  }

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

                      <td className="tw-p-4 tw-text-right tw-font-medium tw-text-slate-700">
                        {formatMoney(item.grossAmount)}
                      </td>

                      <td className="tw-p-4 tw-text-center">
                        <div className="tw-text-xs tw-font-bold tw-text-slate-700">
                          {item.platformFeeRate}%
                        </div>
                        <div className="tw-text-2xs tw-text-slate-400">
                          -{formatMoney(item.platformFee)}
                        </div>
                      </td>

                      <td className="tw-p-4 tw-text-right">
                        <div className="tw-font-black tw-text-emerald-700 tw-text-base">
                          {formatMoney(item.netAmount)}
                        </div>
                      </td>

                      <td className="tw-p-4 tw-text-center">
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
                        {countdownText && (
                          <div className="tw-text-2xs tw-text-amber-600 tw-mt-0.5 tw-font-semibold">
                            {countdownText}
                          </div>
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
                              title="Chi trả thù lao vào ví bác sĩ"
                            >
                              <Send size={12} />
                              <span>Chi trả</span>
                            </button>
                          )}

                          {item.status === 'EARNED' && (
                            <button
                              type="button"
                              disabled={unlockingId === item.id}
                              className="tw-px-2.5 tw-py-1.5 tw-bg-amber-500 hover:tw-bg-amber-600 tw-text-white tw-rounded-xl tw-text-xs tw-font-semibold tw-border-none tw-cursor-pointer tw-flex tw-items-center tw-gap-1 tw-shadow-sm tw-transition disabled:tw-opacity-50"
                              onClick={() => handleUnlockSingle(item.id)}
                              title="Mở khóa sớm thù lao (Bypass T+24h)"
                            >
                              {unlockingId === item.id ? (
                                <RotateCw size={12} className="tw-animate-spin" />
                              ) : (
                                <Unlock size={12} />
                              )}
                              <span>Mở khóa</span>
                            </button>
                          )}

                          {item.status === 'PAID' && item.walletTransactionId && (
                            <span className="tw-text-2xs tw-font-mono tw-text-slate-400 tw-px-1.5 tw-py-0.5 tw-bg-slate-50 tw-rounded tw-border tw-border-slate-200">
                              TX #{item.walletTransactionId}
                            </span>
                          )}

                          <button
                            type="button"
                            className="tw-p-1.5 tw-bg-slate-100 hover:tw-bg-slate-200 tw-text-slate-600 hover:tw-text-slate-900 tw-rounded-xl tw-border-none tw-cursor-pointer tw-transition"
                            onClick={() => setSelectedDetailItem(item)}
                            title="Xem chi tiết ca khám & thù lao"
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
        {totalPages > 1 && (
          <div className="tw-p-4 tw-border-t tw-border-slate-200 tw-flex tw-justify-between tw-items-center">
            <span className="tw-text-xs tw-text-slate-500">
              Hiển thị {items.length} / {total} khoản quyết toán (Trang {page} / {totalPages})
            </span>
            <div className="tw-flex tw-gap-1">
              <button
                type="button"
                className="tw-px-3 tw-py-1.5 tw-text-xs tw-font-semibold tw-border tw-border-slate-200 tw-rounded-lg tw-bg-white hover:tw-bg-slate-50 disabled:tw-opacity-50"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Trước
              </button>
              <button
                type="button"
                className="tw-px-3 tw-py-1.5 tw-text-xs tw-font-semibold tw-border tw-border-slate-200 tw-rounded-lg tw-bg-white hover:tw-bg-slate-50 disabled:tw-opacity-50"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL: XÁC NHẬN CHI TRẢ THÙ LAO VÀO VÍ BÁC SĨ ── */}
      {payoutModalOpen && (
        <div
          className="tw-fixed tw-inset-0 tw-bg-black/50 tw-z-50 tw-flex tw-items-center tw-justify-center tw-p-4 tw-backdrop-blur-sm"
          onClick={() => !submittingPayout && setPayoutModalOpen(false)}
        >
          <div
            className="tw-bg-white tw-rounded-3xl tw-shadow-2xl tw-w-full tw-max-w-md tw-overflow-hidden tw-border tw-border-slate-200"
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
                  <div className="tw-text-2xl tw-font-black tw-text-emerald-700 tw-mt-0.5">
                    {formatMoney(
                      items
                        .filter((x) => selectedIds.includes(x.id))
                        .reduce((sum, item) => sum + Number(item.netAmount || 0), 0)
                    )}
                  </div>
                </div>
                <div className="tw-text-2xs tw-text-emerald-600 tw-border-t tw-border-emerald-200 tw-pt-2">
                  Khoản tiền này sẽ được cộng trực tiếp vào số dư khả dụng ví của Bác sĩ và ghi nhận bút toán kép Sổ cái.
                </div>
              </div>

              <div>
                <label className="tw-block tw-text-xs tw-font-bold tw-text-slate-700 tw-mb-1">
                  Ghi chú đợt quyết toán (Tùy chọn):
                </label>
                <input
                  type="text"
                  className="tw-w-full tw-p-2.5 tw-border tw-border-slate-300 tw-rounded-xl tw-text-sm"
                  placeholder="VD: Quyết toán tuần 1 tháng 10..."
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
          className="tw-fixed tw-inset-0 tw-bg-black/50 tw-z-50 tw-flex tw-items-center tw-justify-center tw-p-4 tw-backdrop-blur-sm"
          onClick={() => setSelectedDetailItem(null)}
        >
          <div
            className="tw-bg-white tw-rounded-3xl tw-shadow-2xl tw-w-full tw-max-w-lg tw-overflow-hidden tw-border tw-border-slate-200 tw-animate-in tw-fade-in tw-zoom-in-95 tw-duration-150"
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
                {selectedDetailItem.status === 'EARNED' && (
                  <button
                    type="button"
                    disabled={unlockingId === selectedDetailItem.id}
                    className="tw-px-3 tw-py-1.5 tw-bg-amber-600 hover:tw-bg-amber-700 tw-text-white tw-rounded-xl tw-text-xs tw-font-bold tw-border-none tw-cursor-pointer tw-flex tw-items-center tw-gap-1 tw-shadow-sm"
                    onClick={async () => {
                      await handleUnlockSingle(selectedDetailItem.id);
                      setSelectedDetailItem(null);
                    }}
                  >
                    <Unlock size={12} />
                    <span>Mở khóa sớm</span>
                  </button>
                )}
                {selectedDetailItem.status === 'AVAILABLE' && (
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
                  <span className="tw-font-semibold tw-text-slate-200">
                    {formatMoney(selectedDetailItem.originalAmount || selectedDetailItem.grossAmount)}
                  </span>
                </div>
                <div className="tw-flex tw-justify-between tw-text-xs">
                  <span className="tw-text-rose-300">
                    Chiết khấu sàn thu ({Number(selectedDetailItem.platformFeeRate || 0)}%):
                  </span>
                  <span className="tw-font-semibold tw-text-rose-400">
                    -{formatMoney(selectedDetailItem.platformFee)}
                  </span>
                </div>
                {Number(selectedDetailItem.clinicShare || 0) > 0 && (
                  <div className="tw-flex tw-justify-between tw-text-xs">
                    <span className="tw-text-amber-300">Phần trích cơ sở y tế:</span>
                    <span className="tw-font-semibold tw-text-amber-400">
                      -{formatMoney(selectedDetailItem.clinicShare)}
                    </span>
                  </div>
                )}
                <div className="tw-border-t tw-border-slate-800 tw-pt-2 tw-flex tw-justify-between tw-items-center">
                  <span className="tw-text-xs tw-font-bold tw-text-emerald-400">
                    Thù lao Bác sĩ thực nhận (Net):
                  </span>
                  <span className="tw-text-lg tw-font-black tw-text-emerald-400">
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
                  <span className="tw-text-slate-500">Mở khóa T+24h dự kiến:</span>
                  <span className="tw-font-medium tw-text-amber-700">
                    {selectedDetailItem.availableAt
                      ? moment(selectedDetailItem.availableAt).format('DD/MM/YYYY HH:mm:ss')
                      : 'N/A'}
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
    </div>
  );
}
