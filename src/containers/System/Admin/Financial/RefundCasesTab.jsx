// src/containers/System/Admin/Financial/RefundCasesTab.jsx
// Phân hệ Quản trị Hoàn tiền Bệnh nhân Độc lập (Enterprise Refund Governance Console)
import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import moment from 'moment';
import {
  RotateCw,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  FileText,
  ShieldCheck,
  Percent,
  Coins,
  Calendar,
  User,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Calculator,
  HelpCircle,
  Filter
} from 'lucide-react';
import {
  getAdminRefundCases,
  getRefundCaseDetail,
  processAdminReviewRefund
} from '../../../../services/walletService';

const REASON_LABELS = {
  DOCTOR_UNAVAILABLE: { label: 'Bác sĩ bận đột xuất / Không tiếp nhận', color: 'rose', force100: true },
  CLINIC_FORCE_MAJEURE: { label: 'Cơ sở y tế đóng cửa / Sự cố bất khả kháng', color: 'amber', force100: true },
  SYSTEM_DUPLICATE_PAYMENT: { label: 'Lỗi hệ thống / Thanh toán trùng lặp', color: 'purple', force100: true },
  PATIENT_ON_TIME: { label: 'Bệnh nhân hủy đúng hạn (>= 24h)', color: 'emerald', force100: false },
  PATIENT_LATE: { label: 'Bệnh nhân hủy cận giờ (< 24h)', color: 'amber', force100: false },
  PATIENT_NO_SHOW: { label: 'Bệnh nhân vắng mặt (No-show)', color: 'slate', force100: false },
  ADMIN_DISPUTE_RESOLUTION: { label: 'Khiếu nại / Phân xử Admin', color: 'indigo', force100: false },
  OTHER: { label: 'Lý do khác', color: 'slate', force100: false },
};

const STATUS_BADGES = {
  COMPLETED: { label: 'Đã hoàn tiền', bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' },
  APPROVED: { label: 'Đã duyệt', bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
  PENDING: { label: 'Chờ thẩm định', bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
  REJECTED: { label: 'Từ chối', bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
  DISPUTED: { label: 'Đang khiếu nại', bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe' },
};

export default function RefundCasesTab() {
  const [cases, setCases] = useState([]);
  const [stats, setStats] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [reasonFilter, setReasonFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  // Modal State
  const [selectedCase, setSelectedCase] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewDecision, setReviewDecision] = useState('APPROVED');
  const [adjustedAmount, setAdjustedAmount] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const formatMoney = (val) => (Number(val) || 0).toLocaleString('vi-VN') + ' ₫';

  const loadCases = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdminRefundCases({
        page,
        limit,
        status: statusFilter,
        reason: reasonFilter,
        search,
      });
      if (res && res.errCode === 0) {
        const rows = Array.isArray(res.data) ? res.data : (res.data?.cases || []);
        setCases(rows);
        setStats(res.stats || res.data?.stats || null);
        setTotal(res.pagination?.total || res.data?.pagination?.total || rows.length);
      } else {
        toast.error(res?.errMessage || 'Không thể tải danh sách hồ sơ hoàn tiền');
      }
    } catch (err) {
      console.error('Error fetching refund cases:', err);
      toast.error('Lỗi kết nối khi tải danh sách hoàn tiền');
    } finally {
      setLoading(false);
    }
  }, [page, limit, statusFilter, reasonFilter, search]);

  useEffect(() => {
    loadCases();
  }, [loadCases]);

  const handleOpenDetail = async (item) => {
    setDetailLoading(true);
    try {
      const res = await getRefundCaseDetail(item.id);
      if (res && res.errCode === 0) {
        setSelectedCase(res.data);
      } else {
        setSelectedCase(item);
      }
    } catch (e) {
      setSelectedCase(item);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleOpenReview = (item) => {
    setSelectedCase(item);
    setReviewDecision('APPROVED');
    setAdjustedAmount(item.refundAmount || 0);
    setReviewNote('');
    setReviewModalOpen(true);
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!selectedCase) return;
    setSubmittingReview(true);
    try {
      const res = await processAdminReviewRefund(selectedCase.id, {
        decision: reviewDecision,
        adjustedRefundAmount: reviewDecision === 'APPROVED' ? Number(adjustedAmount) : 0,
        reviewNote,
      });
      if (res && res.errCode === 0) {
        toast.success(res.message || 'Thẩm định hoàn tiền thành công!');
        setReviewModalOpen(false);
        setSelectedCase(null);
        loadCases();
      } else {
        toast.error(res?.errMessage || 'Xử lý thất bại');
      }
    } catch (err) {
      toast.error(err.response?.data?.errMessage || 'Lỗi khi gửi thẩm định');
    } finally {
      setSubmittingReview(false);
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="refund-cases-tab tw-space-y-6">
      {/* ── 1. KPI Stats Cards ── */}
      <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-4 tw-gap-4">
        <div className="tw-bg-white tw-p-5 tw-rounded-2xl tw-border tw-border-slate-200 tw-shadow-sm">
          <div className="tw-flex tw-justify-between tw-items-center">
            <span className="tw-text-xs tw-font-bold tw-text-slate-500 tw-uppercase tw-tracking-wider">Tổng Hồ Sơ Hoàn</span>
            <div className="tw-w-8 tw-h-8 tw-rounded-lg tw-bg-indigo-50 tw-text-indigo-600 tw-flex tw-items-center tw-justify-center">
              <FileText size={18} />
            </div>
          </div>
          <div className="tw-text-2xl tw-font-black tw-text-slate-900 tw-mt-2">
            {stats?.totalCases || total}
          </div>
          <div className="tw-text-xs tw-text-slate-500 tw-mt-1">Tất cả các ca yêu cầu hoàn tiền</div>
        </div>

        <div className="tw-bg-white tw-p-5 tw-rounded-2xl tw-border tw-border-emerald-200 tw-shadow-sm">
          <div className="tw-flex tw-justify-between tw-items-center">
            <span className="tw-text-xs tw-font-bold tw-text-emerald-700 tw-uppercase tw-tracking-wider">Đã Hoàn Thành Công</span>
            <div className="tw-w-8 tw-h-8 tw-rounded-lg tw-bg-emerald-50 tw-text-emerald-600 tw-flex tw-items-center tw-justify-center">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="tw-text-2xl tw-font-black tw-text-emerald-700 tw-mt-2">
            {formatMoney(stats?.totalRefundedAmount)}
          </div>
          <div className="tw-text-xs tw-text-emerald-600 tw-mt-1">
            {stats?.completedCases || 0} ca đã hoàn tiền vào ví/tài khoản
          </div>
        </div>

        <div className="tw-bg-white tw-p-5 tw-rounded-2xl tw-border tw-border-amber-200 tw-shadow-sm">
          <div className="tw-flex tw-justify-between tw-items-center">
            <span className="tw-text-xs tw-font-bold tw-text-amber-700 tw-uppercase tw-tracking-wider">Chờ Admin Thẩm Định</span>
            <div className="tw-w-8 tw-h-8 tw-rounded-lg tw-bg-amber-50 tw-text-amber-600 tw-flex tw-items-center tw-justify-center">
              <Clock size={18} />
            </div>
          </div>
          <div className="tw-text-2xl tw-font-black tw-text-amber-700 tw-mt-2">
            {stats?.pendingCases || 0} ca
          </div>
          <div className="tw-text-xs tw-text-amber-600 tw-mt-1">Ca tranh chấp hoặc thanh toán VNPay/Ngân hàng</div>
        </div>

        <div className="tw-bg-white tw-p-5 tw-rounded-2xl tw-border tw-border-slate-200 tw-shadow-sm">
          <div className="tw-flex tw-justify-between tw-items-center">
            <span className="tw-text-xs tw-font-bold tw-text-slate-500 tw-uppercase tw-tracking-wider">Số Tiền Giữ Lại (Phạt)</span>
            <div className="tw-w-8 tw-h-8 tw-rounded-lg tw-bg-slate-50 tw-text-slate-600 tw-flex tw-items-center tw-justify-center">
              <Coins size={18} />
            </div>
          </div>
          <div className="tw-text-2xl tw-font-black tw-text-slate-800 tw-mt-2">
            {formatMoney(stats?.totalNonRefundableAmount)}
          </div>
          <div className="tw-text-xs tw-text-slate-500 tw-mt-1">Không hoàn do hủy cận giờ / No-show</div>
        </div>
      </div>

      {/* ── 2. Filters & Search Bar ── */}
      <div className="tw-bg-white tw-p-4 tw-rounded-2xl tw-border tw-border-slate-200 tw-shadow-sm tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-3">
        <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-2.5 tw-flex-1">
          <div className="tw-relative tw-min-w-[240px]">
            <Search size={15} className="tw-absolute tw-left-3 tw-top-1/2 -tw-translate-y-1/2 tw-text-slate-400" />
            <input
              type="text"
              className="tw-w-full tw-pl-9 tw-pr-3 tw-py-2 tw-text-sm tw-border tw-border-slate-200 tw-rounded-xl focus:tw-outline-none focus:tw-border-indigo-500"
              placeholder="Tìm theo Mã ca khám (#ID), Tên bệnh nhân..."
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
            <option value="ALL">Tất cả trạng thái</option>
            <option value="PENDING">Chờ thẩm định</option>
            <option value="COMPLETED">Đã hoàn tiền</option>
            <option value="REJECTED">Đã từ chối</option>
          </select>

          <select
            className="tw-px-3 tw-py-2 tw-text-sm tw-border tw-border-slate-200 tw-rounded-xl tw-bg-white focus:tw-outline-none focus:tw-border-indigo-500"
            value={reasonFilter}
            onChange={(e) => {
              setReasonFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="ALL">Tất cả lý do hủy</option>
            <option value="PATIENT_ON_TIME">Bệnh nhân hủy đúng hạn (trên 24h)</option>
            <option value="PATIENT_LATE">Bệnh nhân hủy cận giờ (dưới 24h)</option>
            <option value="PATIENT_NO_SHOW">Bệnh nhân vắng mặt (No-show)</option>
            <option value="DOCTOR_UNAVAILABLE">Bác sĩ bận / Không tiếp nhận</option>
            <option value="CLINIC_FORCE_MAJEURE">Cơ sở y tế đóng cửa / Sự cố</option>
            <option value="ADMIN_DISPUTE_RESOLUTION">Phân xử khiếu nại (Admin)</option>
          </select>
        </div>

        <button
          type="button"
          className="tw-px-3.5 tw-py-2 tw-text-sm tw-font-semibold tw-text-slate-600 hover:tw-text-indigo-600 tw-bg-slate-50 hover:tw-bg-indigo-50 tw-rounded-xl tw-border tw-border-slate-200 tw-flex tw-items-center tw-gap-1.5 tw-transition"
          onClick={loadCases}
          disabled={loading}
        >
          <RotateCw size={14} className={loading ? 'tw-animate-spin' : ''} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* ── 3. Table of Refund Cases ── */}
      <div className="tw-bg-white tw-rounded-2xl tw-border tw-border-slate-200 tw-shadow-sm tw-overflow-hidden">
        <div className="tw-overflow-x-auto">
          <table className="tw-w-full tw-text-left tw-border-collapse">
            <thead>
              <tr className="tw-bg-slate-50 tw-border-b tw-border-slate-200 tw-text-slate-600 tw-text-xs tw-uppercase tw-font-bold tw-tracking-wider">
                <th className="tw-p-4">Mã Hồ Sơ / Ca Khám</th>
                <th className="tw-p-4">Bệnh Nhân & Bác Sĩ</th>
                <th className="tw-p-4">Lý Do Hủy & Người Hủy</th>
                <th className="tw-p-4">Thời Điểm Hủy</th>
                <th className="tw-p-4 tw-text-right">Số Tiền Khám</th>
                <th className="tw-p-4 tw-text-center">Tỷ Lệ Hoàn</th>
                <th className="tw-p-4 tw-text-right">Tiền Hoàn Lại</th>
                <th className="tw-p-4 tw-text-center">Trạng Thái</th>
                <th className="tw-p-4 tw-text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="tw-divide-y tw-divide-slate-100 tw-text-sm">
              {loading ? (
                <tr>
                  <td colSpan="9" className="tw-p-8 tw-text-center tw-text-slate-400">
                    <RotateCw size={24} className="tw-animate-spin tw-mx-auto tw-mb-2 tw-text-indigo-500" />
                    Đang tải dữ liệu hồ sơ hoàn tiền...
                  </td>
                </tr>
              ) : cases.length === 0 ? (
                <tr>
                  <td colSpan="9" className="tw-p-8 tw-text-center tw-text-slate-400">
                    Không tìm thấy hồ sơ hoàn tiền nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                cases.map((item) => {
                  const reasonInfo = REASON_LABELS[item.cancellationReason] || REASON_LABELS.OTHER;
                  const statusInfo = STATUS_BADGES[item.status] || STATUS_BADGES.PENDING;
                  return (
                    <tr key={item.id} className="hover:tw-bg-slate-50/80 tw-transition">
                      <td className="tw-p-4">
                        <div className="tw-font-mono tw-font-bold tw-text-indigo-600">
                          #REF-{item.id}
                        </div>
                        <div className="tw-text-xs tw-text-slate-500 tw-mt-0.5">
                          Ca khám: <strong className="tw-text-slate-700">#{item.bookingId}</strong>
                        </div>
                      </td>

                      <td className="tw-p-4">
                        <div className="tw-font-semibold tw-text-slate-800">
                          {item.patient ? `${item.patient.firstName || ''} ${item.patient.lastName || ''}` : 'Bệnh nhân'}
                        </div>
                        <div className="tw-text-xs tw-text-slate-500">
                          BS: {item.doctor ? `${item.doctor.firstName || ''} ${item.doctor.lastName || ''}` : `#${item.doctorId}`}
                        </div>
                      </td>

                      <td className="tw-p-4">
                        <div className="tw-inline-flex tw-items-center tw-gap-1 tw-px-2.5 tw-py-1 tw-rounded-lg tw-text-xs tw-font-bold tw-bg-slate-100 tw-text-slate-800">
                          {reasonInfo.label}
                        </div>
                        <div className="tw-text-xs tw-text-slate-500 tw-mt-1">
                          Hủy bởi: <span className="tw-font-semibold tw-text-slate-700">{item.cancelledByRole}</span>
                          {item.cancellationNote && ` — "${item.cancellationNote}"`}
                        </div>
                      </td>

                      <td className="tw-p-4">
                        <div className="tw-text-xs tw-font-medium tw-text-slate-700">
                          {item.cancelledAt ? moment(item.cancelledAt).format('DD/MM/YYYY HH:mm') : '—'}
                        </div>
                        <div className="tw-text-2xs tw-text-slate-400 tw-mt-0.5">
                          {item.hoursBeforeAppointment != null ? `Cách giờ khám: ${item.hoursBeforeAppointment}h` : ''}
                        </div>
                      </td>

                      <td className="tw-p-4 tw-text-right tw-font-medium tw-text-slate-700">
                        {formatMoney(item.paidAmount)}
                      </td>

                      <td className="tw-p-4 tw-text-center">
                        <span className={`tw-inline-block tw-px-2 tw-py-0.5 tw-rounded-md tw-text-xs tw-font-bold ${
                          item.refundRate === 100
                            ? 'tw-bg-emerald-100 tw-text-emerald-800'
                            : item.refundRate > 0
                            ? 'tw-bg-amber-100 tw-text-amber-800'
                            : 'tw-bg-rose-100 tw-text-rose-800'
                        }`}>
                          {item.refundRate}%
                        </span>
                      </td>

                      <td className="tw-p-4 tw-text-right">
                        <div className="tw-font-bold tw-text-emerald-600">
                          {formatMoney(item.refundAmount)}
                        </div>
                        {item.nonRefundableAmount > 0 && (
                          <div className="tw-text-2xs tw-text-slate-400">
                            Giữ: {formatMoney(item.nonRefundableAmount)}
                          </div>
                        )}
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
                      </td>

                      <td className="tw-p-4 tw-text-right">
                        <div className="tw-flex tw-items-center tw-justify-end tw-gap-1.5">
                          <button
                            type="button"
                            className="tw-p-1.5 tw-text-indigo-600 hover:tw-bg-indigo-50 tw-rounded-lg tw-border-none tw-bg-transparent tw-cursor-pointer tw-transition"
                            title="Xem chi tiết công thức tính toán"
                            onClick={() => handleOpenDetail(item)}
                          >
                            <Calculator size={16} />
                          </button>

                          {item.status === 'PENDING' && (
                            <button
                              type="button"
                              className="tw-px-2.5 tw-py-1 tw-bg-amber-600 hover:tw-bg-amber-700 tw-text-white tw-rounded-lg tw-text-xs tw-font-bold tw-border-none tw-cursor-pointer tw-transition"
                              onClick={() => handleOpenReview(item)}
                            >
                              Thẩm định
                            </button>
                          )}
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
              Hiển thị {cases.length} / {total} hồ sơ (Trang {page} / {totalPages})
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

      {/* ── MODAL 1: BẢNG KÊ CÔNG THỨC CHI TIẾT (Calculation Snapshot) ── */}
      {selectedCase && !reviewModalOpen && (
        <div
          className="tw-fixed tw-inset-0 tw-bg-black/50 tw-z-50 tw-flex tw-items-center tw-justify-center tw-p-4 tw-backdrop-blur-sm"
          onClick={() => setSelectedCase(null)}
        >
          <div
            className="tw-bg-white tw-rounded-3xl tw-shadow-2xl tw-w-full tw-max-w-2xl tw-overflow-hidden tw-border tw-border-slate-200 tw-animate-in tw-fade-in tw-zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="tw-px-6 tw-py-4 tw-bg-gradient-to-r tw-from-indigo-600 tw-to-violet-700 tw-text-white tw-flex tw-justify-between tw-items-center">
              <div className="tw-flex tw-items-center tw-gap-2.5">
                <Calculator size={20} />
                <h3 className="tw-font-bold tw-text-base tw-m-0">
                  Hồ Sơ Hoàn Tiền #REF-{selectedCase.id}
                </h3>
              </div>
              <button
                type="button"
                className="tw-text-white/80 hover:tw-text-white tw-border-none tw-bg-transparent tw-text-xl tw-cursor-pointer"
                onClick={() => setSelectedCase(null)}
              >
                &times;
              </button>
            </div>

            <div className="tw-p-6 tw-space-y-5 tw-max-h-[80vh] tw-overflow-y-auto">
              {/* Thông tin ca khám */}
              <div className="tw-grid tw-grid-cols-2 tw-gap-4 tw-bg-slate-50 tw-p-4 tw-rounded-2xl tw-border tw-border-slate-200">
                <div>
                  <span className="tw-text-xs tw-text-slate-500">Mã ca khám liên kết:</span>
                  <div className="tw-font-bold tw-text-slate-800 tw-text-base">#{selectedCase.bookingId}</div>
                  <div className="tw-text-xs tw-text-slate-500 tw-mt-1">
                    Bác sĩ: <strong>{selectedCase.doctor ? `${selectedCase.doctor.firstName} ${selectedCase.doctor.lastName}` : `#${selectedCase.doctorId}`}</strong>
                  </div>
                </div>
                <div>
                  <span className="tw-text-xs tw-text-slate-500">Bệnh nhân thụ hưởng:</span>
                  <div className="tw-font-bold tw-text-slate-800 tw-text-base">
                    {selectedCase.patient ? `${selectedCase.patient.firstName} ${selectedCase.patient.lastName}` : `#${selectedCase.patientId}`}
                  </div>
                  <div className="tw-text-xs tw-text-slate-500 tw-mt-1">
                    Email: {selectedCase.patient?.email || '—'}
                  </div>
                </div>
              </div>

              {/* Nguyên nhân & Quy chuẩn áp dụng */}
              <div className="tw-border tw-border-indigo-100 tw-bg-indigo-50/50 tw-p-4 tw-rounded-2xl">
                <div className="tw-flex tw-items-center tw-gap-2 tw-text-indigo-900 tw-font-bold tw-text-sm tw-mb-2">
                  <ShieldCheck size={18} className="tw-text-indigo-600" />
                  Căn Cứ Pháp Lý & Nguyên Nhân Hủy
                </div>
                <div className="tw-text-xs tw-text-slate-700 tw-space-y-1">
                  <div>
                    Lý do ghi nhận: <strong>{(REASON_LABELS[selectedCase.cancellationReason] || {}).label}</strong>
                  </div>
                  <div>
                    Người thực hiện thao tác hủy: <strong className="tw-text-indigo-700">{selectedCase.cancelledByRole}</strong>
                    {selectedCase.cancellationNote && ` (${selectedCase.cancellationNote})`}
                  </div>
                  <div>
                    Thời điểm hủy: <strong>{moment(selectedCase.cancelledAt).format('DD/MM/YYYY HH:mm:ss')}</strong>
                  </div>
                  <div>
                    Khoảng cách tới giờ hẹn khám: <strong>{selectedCase.hoursBeforeAppointment ?? 'N/A'} giờ</strong>
                  </div>
                </div>
              </div>

              {/* Phép tính toán chi tiết (Calculation Snapshot) */}
              <div className="tw-border tw-border-slate-200 tw-rounded-2xl tw-overflow-hidden">
                <div className="tw-bg-slate-100 tw-px-4 tw-py-2.5 tw-font-bold tw-text-slate-700 tw-text-xs tw-uppercase tw-tracking-wider">
                  Bảng Tính Chi Tiết Đóng Băng (Frozen Math Snapshot)
                </div>
                <div className="tw-p-4 tw-space-y-3">
                  <div className="tw-flex tw-justify-between tw-items-center tw-text-sm">
                    <span className="tw-text-slate-600">Số tiền bệnh nhân đã thanh toán (A):</span>
                    <span className="tw-font-bold tw-text-slate-800">{formatMoney(selectedCase.paidAmount)}</span>
                  </div>
                  <div className="tw-flex tw-justify-between tw-items-center tw-text-sm">
                    <span className="tw-text-slate-600">Tỷ lệ hoàn tiền theo chính sách áp dụng (B):</span>
                    <span className="tw-font-bold tw-text-indigo-600 tw-bg-indigo-50 tw-px-2 tw-py-0.5 tw-rounded">
                      {selectedCase.refundRate}%
                    </span>
                  </div>
                  <div className="tw-border-t tw-border-dashed tw-border-slate-200 tw-pt-3 tw-flex tw-justify-between tw-items-center tw-text-base">
                    <span className="tw-font-bold tw-text-emerald-700">Số tiền hoàn vào ví (A x B):</span>
                    <span className="tw-font-black tw-text-emerald-600 tw-text-lg">
                      {formatMoney(selectedCase.refundAmount)}
                    </span>
                  </div>
                  {selectedCase.nonRefundableAmount > 0 && (
                    <div className="tw-flex tw-justify-between tw-items-center tw-text-xs tw-text-slate-500">
                      <span>Khoản khấu trừ không hoàn (Phạt vi phạm quy định hủy):</span>
                      <span className="tw-font-semibold tw-text-rose-600">
                        {formatMoney(selectedCase.nonRefundableAmount)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Bút toán sổ cái kế toán kép */}
              {selectedCase.walletTransactionId && (
                <div className="tw-bg-emerald-50 tw-border tw-border-emerald-200 tw-p-3.5 tw-rounded-2xl tw-text-xs tw-text-emerald-900 tw-flex tw-items-center tw-justify-between">
                  <div>
                    <div className="tw-font-bold">Đã hạch toán vào Sổ cái bất biến</div>
                    <div className="tw-text-emerald-700 tw-mt-0.5">
                      Mã bút toán: <strong className="tw-font-mono">#TX-{selectedCase.walletTransactionId}</strong>
                    </div>
                  </div>
                  <span className="tw-bg-emerald-600 tw-text-white tw-px-2.5 tw-py-1 tw-rounded-lg tw-font-bold">
                    Hoàn tất
                  </span>
                </div>
              )}
            </div>

            <div className="tw-px-6 tw-py-4 tw-bg-slate-50 tw-border-t tw-border-slate-100 tw-flex tw-justify-end tw-gap-2">
              <button
                type="button"
                className="tw-px-4 tw-py-2 tw-bg-slate-200 hover:tw-bg-slate-300 tw-text-slate-700 tw-rounded-xl tw-text-sm tw-font-semibold tw-border-none tw-cursor-pointer"
                onClick={() => setSelectedCase(null)}
              >
                Đóng
              </button>
              {selectedCase.status === 'PENDING' && (
                <button
                  type="button"
                  className="tw-px-5 tw-py-2 tw-bg-indigo-600 hover:tw-bg-indigo-700 tw-text-white tw-rounded-xl tw-text-sm tw-font-bold tw-border-none tw-cursor-pointer tw-shadow-sm"
                  onClick={() => handleOpenReview(selectedCase)}
                >
                  Thẩm định hồ sơ này
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: THẨM ĐỊNH PHÊ DUYỆT HOÀN TIỀN (Admin Review) ── */}
      {reviewModalOpen && selectedCase && (
        <div
          className="tw-fixed tw-inset-0 tw-bg-black/50 tw-z-50 tw-flex tw-items-center tw-justify-center tw-p-4 tw-backdrop-blur-sm"
          onClick={() => !submittingReview && setReviewModalOpen(false)}
        >
          <div
            className="tw-bg-white tw-rounded-3xl tw-shadow-2xl tw-w-full tw-max-w-lg tw-overflow-hidden tw-border tw-border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="tw-px-6 tw-py-4 tw-bg-slate-50 tw-border-b tw-border-slate-200 tw-flex tw-justify-between tw-items-center">
              <h3 className="tw-font-bold tw-text-slate-800 tw-text-base tw-m-0">
                Thẩm Định Hoàn Tiền #REF-{selectedCase.id}
              </h3>
              <button
                type="button"
                className="tw-text-slate-400 hover:tw-text-slate-600 tw-border-none tw-bg-transparent tw-text-xl tw-cursor-pointer"
                onClick={() => !submittingReview && setReviewModalOpen(false)}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmitReview} className="tw-p-6 tw-space-y-4">
              <div className="tw-bg-slate-50 tw-p-3.5 tw-rounded-xl tw-text-xs tw-text-slate-700 tw-space-y-1">
                <div>Ca khám: <strong>#{selectedCase.bookingId}</strong></div>
                <div>Bệnh nhân: <strong>{selectedCase.patient?.firstName} {selectedCase.patient?.lastName}</strong></div>
                <div>Số tiền gốc: <strong>{formatMoney(selectedCase.paidAmount)}</strong></div>
                <div>Số tiền đề xuất theo hệ thống: <strong className="tw-text-indigo-600">{formatMoney(selectedCase.refundAmount)}</strong></div>
              </div>

              <div>
                <label className="tw-block tw-text-xs tw-font-bold tw-text-slate-700 tw-mb-2">
                  Quyết định của Admin:
                </label>
                <div className="tw-grid tw-grid-cols-2 tw-gap-3">
                  <label
                    className={`tw-border tw-rounded-xl tw-p-3 tw-cursor-pointer tw-flex tw-items-center tw-gap-2 ${
                      reviewDecision === 'APPROVED'
                        ? 'tw-border-emerald-500 tw-bg-emerald-50 tw-text-emerald-900 tw-font-bold'
                        : 'tw-border-slate-200 tw-text-slate-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="decision"
                      value="APPROVED"
                      checked={reviewDecision === 'APPROVED'}
                      onChange={() => setReviewDecision('APPROVED')}
                    />
                    <span>Chấp thuận hoàn tiền</span>
                  </label>

                  <label
                    className={`tw-border tw-rounded-xl tw-p-3 tw-cursor-pointer tw-flex tw-items-center tw-gap-2 ${
                      reviewDecision === 'REJECTED'
                        ? 'tw-border-rose-500 tw-bg-rose-50 tw-text-rose-900 tw-font-bold'
                        : 'tw-border-slate-200 tw-text-slate-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="decision"
                      value="REJECTED"
                      checked={reviewDecision === 'REJECTED'}
                      onChange={() => setReviewDecision('REJECTED')}
                    />
                    <span>Bác bỏ / Từ chối</span>
                  </label>
                </div>
              </div>

              {reviewDecision === 'APPROVED' && (
                <div>
                  <label className="tw-block tw-text-xs tw-font-bold tw-text-slate-700 tw-mb-1">
                    Số tiền hoàn thực tế (VNĐ) *:
                  </label>
                  <input
                    type="number"
                    className="tw-w-full tw-p-2.5 tw-border tw-border-slate-300 tw-rounded-xl tw-text-sm tw-font-bold tw-text-emerald-600"
                    value={adjustedAmount}
                    onChange={(e) => setAdjustedAmount(e.target.value)}
                    max={selectedCase.paidAmount}
                    min={0}
                    required
                  />
                  <small className="tw-text-2xs tw-text-slate-400 tw-mt-1 tw-block">
                    Tối đa {formatMoney(selectedCase.paidAmount)}. Tiền sẽ được cộng trực tiếp vào ví của bệnh nhân.
                  </small>
                </div>
              )}

              <div>
                <label className="tw-block tw-text-xs tw-font-bold tw-text-slate-700 tw-mb-1">
                  Ghi chú thẩm định / Lý do phê duyệt hoặc từ chối *:
                </label>
                <textarea
                  rows={3}
                  className="tw-w-full tw-p-2.5 tw-border tw-border-slate-300 tw-rounded-xl tw-text-sm"
                  placeholder="Ghi rõ lý do căn cứ thẩm định..."
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  required
                />
              </div>

              <div className="tw-flex tw-justify-end tw-gap-2 tw-pt-2">
                <button
                  type="button"
                  className="tw-px-4 tw-py-2 tw-bg-slate-100 hover:tw-bg-slate-200 tw-text-slate-700 tw-rounded-xl tw-text-sm tw-font-semibold tw-border-none tw-cursor-pointer"
                  onClick={() => setReviewModalOpen(false)}
                  disabled={submittingReview}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className={`tw-px-5 tw-py-2 tw-text-white tw-rounded-xl tw-text-sm tw-font-bold tw-border-none tw-cursor-pointer ${
                    reviewDecision === 'APPROVED' ? 'tw-bg-emerald-600 hover:tw-bg-emerald-700' : 'tw-bg-rose-600 hover:tw-bg-rose-700'
                  }`}
                  disabled={submittingReview}
                >
                  {submittingReview ? 'Đang thẩm định...' : 'Xác nhận Thẩm định'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
