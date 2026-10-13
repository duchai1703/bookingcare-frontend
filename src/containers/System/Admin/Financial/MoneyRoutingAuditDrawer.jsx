// src/containers/System/Admin/Financial/MoneyRoutingAuditDrawer.jsx
// Ngăn Kéo Kiểm Toán & Truy Vết Luồng Tiền Tự Động Hóa (Money Routing Trace Drawer)
// Thiết kế chuẩn Enterprise FinTech: Sắc nét, Dense, Tabular-nums, Tuyệt đối không màu mè AI.
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import moment from 'moment';
import {
  X,
  RotateCw,
  Zap,
  ArrowRight,
  ArrowDownRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Layers,
  ChevronRight,
  Wallet,
  FileSpreadsheet,
  Building2,
  Copy,
  ExternalLink
} from 'lucide-react';
import {
  getFinancialAutomationLogs,
  getFinancialAutomationLogDetail,
  runAutoDoctorPayoutCycle
} from '../../../../services/walletService';

export default function MoneyRoutingAuditDrawer({ isOpen, onClose, onRefreshParent }) {
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Selected Log Detail State
  const [selectedLogId, setSelectedLogId] = useState(null);
  const [logDetail, setLogDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Auto-run trigger
  const [isRunningCycle, setIsRunningCycle] = useState(false);

  const formatMoney = (val) => (Number(val) || 0).toLocaleString('vi-VN') + ' ₫';

  const loadLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await getFinancialAutomationLogs({ page, limit: 12 });
      if (res && res.errCode === 0) {
        setLogs(res.data || []);
        setTotal(res.pagination?.total || 0);
      }
    } catch (err) {
      console.error('Error loading automation logs:', err);
      toast.error('Không thể tải nhật ký tự động hóa');
    } finally {
      setLoadingLogs(false);
    }
  };

  const loadDetail = async (id) => {
    setSelectedLogId(id);
    setLoadingDetail(true);
    try {
      const res = await getFinancialAutomationLogDetail(id);
      if (res && res.errCode === 0) {
        setLogDetail(res.data);
      } else {
        toast.error(res?.errMessage || 'Không thể tải chi tiết phiên chạy');
      }
    } catch (err) {
      console.error('Error loading log detail:', err);
      toast.error('Lỗi khi tải chi tiết luồng tiền');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleTriggerAutoCycle = async () => {
    if (!window.confirm('Xác nhận kích hoạt Chu trình Quyết toán Tự động toàn sàn? Toàn bộ ca khám đủ điều kiện (AVAILABLE) sẽ được kết chuyển ngay vào ví Bác sĩ và ghi nhận log truy vết luồng tiền.')) {
      return;
    }
    setIsRunningCycle(true);
    try {
      const res = await runAutoDoctorPayoutCycle();
      if (res && res.errCode === 0) {
        toast.success(res.message || 'Chu trình tự động hoàn tất!');
        loadLogs();
        if (onRefreshParent) onRefreshParent();
      } else {
        toast.error(res?.errMessage || 'Không thể thực hiện chu trình tự động');
      }
    } catch (err) {
      toast.error('Lỗi khi kích hoạt chu trình tự động');
    } finally {
      setIsRunningCycle(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadLogs();
    } else {
      setSelectedLogId(null);
      setLogDetail(null);
    }
  }, [isOpen, page]);

  if (!isOpen) return null;

  return (
    <div
      className="gl-drawer-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(3px)',
        zIndex: 99999,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
    >
      <div
        className="money-trace-drawer-panel tw-w-full tw-max-w-3xl tw-h-screen tw-bg-white tw-shadow-2xl tw-flex tw-flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{
          borderLeft: '1px solid #cbd5e1',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        {/* ── HEADER ── */}
        <div className="tw-px-6 tw-py-4 tw-border-b tw-border-slate-200 tw-bg-slate-50 tw-flex tw-justify-between tw-items-center">
          <div className="tw-flex tw-items-center tw-gap-3">
            <div className="tw-w-9 tw-h-9 tw-rounded-lg tw-bg-slate-900 tw-text-white tw-flex tw-items-center tw-justify-center">
              <Zap size={18} />
            </div>
            <div>
              <div className="tw-flex tw-items-center tw-gap-2">
                <h3 className="tw-font-bold tw-text-slate-900 tw-text-base tw-m-0">
                  Nhật Ký Tự Động Hóa & Truy Vết Luồng Tiền
                </h3>
                <span className="tw-px-2 tw-py-0.5 tw-bg-emerald-50 tw-text-emerald-700 tw-border tw-border-emerald-200 tw-text-2xs tw-font-bold tw-rounded">
                  T+0 Live
                </span>
              </div>
              <p className="tw-text-xs tw-text-slate-500 tw-m-0 tw-mt-0.5">
                Kiểm toán từng khoản tiền: Nguồn trích xuất ➔ Phí sàn thu ➔ Ví bác sĩ thụ hưởng.
              </p>
            </div>
          </div>

          <div className="tw-flex tw-items-center tw-gap-2">
            <button
              type="button"
              className="tw-px-3 tw-py-1.5 tw-bg-teal-600 hover:tw-bg-teal-700 tw-text-white tw-rounded-lg tw-text-xs tw-font-bold tw-border-none tw-cursor-pointer tw-flex tw-items-center tw-gap-1.5 tw-transition"
              onClick={handleTriggerAutoCycle}
              disabled={isRunningCycle}
            >
              <Zap size={13} className={isRunningCycle ? 'tw-animate-spin' : ''} />
              <span>{isRunningCycle ? 'Đang chạy...' : 'Kích Hoạt Chu Trình'}</span>
            </button>
            <button
              type="button"
              className="tw-w-8 tw-h-8 tw-rounded-lg tw-border tw-border-slate-200 tw-bg-white hover:tw-bg-slate-100 tw-text-slate-500 hover:tw-text-slate-800 tw-flex tw-items-center tw-justify-center tw-cursor-pointer"
              onClick={onClose}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── BODY ── */}
        <div className="tw-flex-1 tw-overflow-y-auto tw-p-6 tw-bg-slate-50/50">
          {selectedLogId && logDetail ? (
            /* ══ VIEW CHI TIẾT 1 PHIÊN: BÓC TÁCH LUỒNG TIỀN (MONEY ROUTING MAP) ══ */
            <div className="tw-space-y-4">
              <button
                type="button"
                className="tw-text-xs tw-font-bold tw-text-indigo-600 hover:tw-text-indigo-800 tw-bg-transparent tw-border-none tw-cursor-pointer tw-flex tw-items-center tw-gap-1.5 tw-mb-3 tw-p-0"
                onClick={() => {
                  setSelectedLogId(null);
                  setLogDetail(null);
                }}
              >
                ← Quay lại danh sách các phiên chạy
              </button>

              {/* Box Tóm tắt Phiên chạy */}
              <div className="tw-bg-white tw-rounded-xl tw-p-4 tw-border tw-border-slate-200 tw-shadow-sm">
                <div className="tw-flex tw-justify-between tw-items-start">
                  <div>
                    <span className="tw-text-2xs tw-font-mono tw-text-slate-400 tw-uppercase tw-tracking-wider">
                      Mã phiên tự động hóa
                    </span>
                    <h4 className="tw-font-mono tw-font-bold tw-text-slate-900 tw-text-sm tw-m-0 tw-mt-0.5">
                      {logDetail.batchCode}
                    </h4>
                  </div>
                  <span className="tw-px-2.5 tw-py-1 tw-bg-emerald-50 tw-text-emerald-700 tw-border tw-border-emerald-200 tw-text-xs tw-font-bold tw-rounded-md">
                    ✓ {logDetail.status}
                  </span>
                </div>

                <div className="tw-grid tw-grid-cols-3 tw-gap-3 tw-mt-4 tw-pt-3 tw-border-t tw-border-slate-100 tw-text-xs">
                  <div>
                    <span className="tw-text-slate-400 tw-block tw-text-2xs">Thời gian thực thi:</span>
                    <span className="tw-font-medium tw-text-slate-700">
                      {moment(logDetail.createdAt).format('HH:mm:ss DD/MM/YYYY')}
                    </span>
                  </div>
                  <div>
                    <span className="tw-text-slate-400 tw-block tw-text-2xs">Số ca khám quyết toán:</span>
                    <strong className="tw-text-slate-900">{logDetail.totalItems} ca</strong>
                  </div>
                  <div>
                    <span className="tw-text-slate-400 tw-block tw-text-2xs">Tổng dòng tiền dịch chuyển:</span>
                    <strong className="tw-text-emerald-700 tw-font-mono tw-text-sm" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {formatMoney(logDetail.totalAmount)}
                    </strong>
                  </div>
                </div>
              </div>

              {/* BẢNG BÓC TÁCH TỪNG CA KHÁM (MONEY TRACE ITEMS) */}
              <div>
                <div className="tw-flex tw-justify-between tw-items-center tw-mb-2">
                  <h5 className="tw-text-xs tw-font-bold tw-text-slate-700 tw-uppercase tw-tracking-wider tw-m-0">
                    Sơ Đồ Phân Phối Dòng Tiền Từng Ca Khám ({logDetail.moneyTraceItems?.length || 0})
                  </h5>
                  <span className="tw-text-2xs tw-text-slate-400">
                    Rót tiền vào ví theo Bút toán kép
                  </span>
                </div>

                <div className="tw-space-y-3">
                  {logDetail.moneyTraceItems?.map((item, idx) => (
                    <div
                      key={item.bookingId || idx}
                      className="tw-bg-white tw-rounded-xl tw-p-4 tw-border tw-border-slate-200 tw-shadow-sm hover:tw-border-slate-300 tw-transition"
                    >
                      {/* Tiêu đề ca khám */}
                      <div className="tw-flex tw-justify-between tw-items-center tw-mb-3 tw-pb-2.5 tw-border-b tw-border-slate-100">
                        <div className="tw-flex tw-items-center tw-gap-2">
                          <span className="tw-font-mono tw-font-bold tw-text-xs tw-text-indigo-700">
                            {item.bookingCode}
                          </span>
                          <span className="tw-text-slate-300">|</span>
                          <span className="tw-text-xs tw-text-slate-700 tw-font-medium">
                            BN: <strong>{item.patientName}</strong>
                          </span>
                        </div>
                        <div className="tw-text-right">
                          <span className="tw-text-xs tw-font-bold tw-text-slate-900 tw-font-mono" style={{ fontVariantNumeric: 'tabular-nums' }}>
                            Giá gốc: {formatMoney(item.grossAmount)}
                          </span>
                        </div>
                      </div>

                      {/* SƠ ĐỒ 3 CHẶNG TIỀN (FLOW DIAGRAM) */}
                      <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-3 tw-gap-3 tw-p-3 tw-bg-slate-50 tw-rounded-lg tw-border tw-border-slate-200/80 tw-text-xs">
                        {/* Cột 1: NGUỒN TIỀN (FROM) */}
                        <div className="tw-space-y-1">
                          <div className="tw-flex tw-items-center tw-gap-1 tw-text-rose-700 tw-font-bold tw-text-2xs tw-uppercase">
                            <span className="tw-w-1.5 tw-h-1.5 tw-rounded-full tw-bg-rose-500"></span>
                            <span>1. Nguồn tiền trích ra (From)</span>
                          </div>
                          <div className="tw-text-2xs tw-text-slate-600 tw-font-medium">
                            Quỹ Tạm Giữ Escrow Sàn
                          </div>
                          <div className="tw-text-xs tw-font-mono tw-font-bold tw-text-rose-600" style={{ fontVariantNumeric: 'tabular-nums' }}>
                            -{formatMoney(item.grossAmount)}
                          </div>
                          <div className="tw-text-3xs tw-text-slate-400">Tài khoản Kế toán: TK 3388</div>
                        </div>

                        {/* Cột 2: PHÍ HOA HỒNG SÀN (PLATFORM FEE) */}
                        <div className="tw-space-y-1 tw-border-l tw-border-slate-200 tw-pl-3">
                          <div className="tw-flex tw-items-center tw-gap-1 tw-text-slate-700 tw-font-bold tw-text-2xs tw-uppercase">
                            <span className="tw-w-1.5 tw-h-1.5 tw-rounded-full tw-bg-slate-500"></span>
                            <span>2. Chiết khấu Sàn ({item.platformFeeRate}%)</span>
                          </div>
                          <div className="tw-text-2xs tw-text-slate-600 tw-font-medium">
                            Doanh thu Dịch vụ BookingCare
                          </div>
                          <div className="tw-text-xs tw-font-mono tw-font-bold tw-text-slate-800" style={{ fontVariantNumeric: 'tabular-nums' }}>
                            +{formatMoney(item.platformFee)}
                          </div>
                          <div className="tw-text-3xs tw-text-slate-400">Tài khoản Kế toán: TK 511</div>
                        </div>

                        {/* Cột 3: VÍ BÁC SĨ (TO DOCTOR WALLET) */}
                        <div className="tw-space-y-1 tw-border-l tw-border-slate-200 tw-pl-3">
                          <div className="tw-flex tw-items-center tw-gap-1 tw-text-emerald-700 tw-font-bold tw-text-2xs tw-uppercase">
                            <span className="tw-w-1.5 tw-h-1.5 tw-rounded-full tw-bg-emerald-500"></span>
                            <span>3. Rót vào Ví Bác sĩ (To)</span>
                          </div>
                          <div className="tw-text-2xs tw-text-slate-800 tw-font-semibold tw-truncate" title={item.doctorName}>
                            {item.doctorName}
                          </div>
                          <div className="tw-text-xs tw-font-mono tw-font-bold tw-text-emerald-700" style={{ fontVariantNumeric: 'tabular-nums' }}>
                            +{formatMoney(item.doctorShare)}
                          </div>
                          <div className="tw-text-3xs tw-text-emerald-600 tw-font-semibold">
                            Tài khoản: {item.toWalletId || 'Ví Nội Bộ'} (TK 3381)
                          </div>
                        </div>
                      </div>

                      {/* BIẾN ĐỘNG SỐ DƯ VÍ & IDEMPOTENCY KEY */}
                      <div className="tw-mt-2.5 tw-pt-2 tw-border-t tw-border-dashed tw-border-slate-200 tw-flex tw-flex-wrap tw-justify-between tw-items-center tw-text-2xs tw-text-slate-500">
                        <div className="tw-flex tw-items-center tw-gap-2">
                          <span>Biến động số dư ví BS:</span>
                          <strong className="tw-font-mono tw-text-slate-700" style={{ fontVariantNumeric: 'tabular-nums' }}>
                            {formatMoney(item.walletBalanceBefore)}
                          </strong>
                          <ArrowRight size={11} className="tw-text-slate-400" />
                          <strong className="tw-font-mono tw-text-emerald-700" style={{ fontVariantNumeric: 'tabular-nums' }}>
                            {formatMoney(item.walletBalanceAfter)}
                          </strong>
                        </div>

                        {item.walletTransactionId && (
                          <div className="tw-font-mono tw-text-3xs tw-text-slate-400">
                            Bút toán Sổ cái: #{item.walletTransactionId}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* ══ VIEW DANH SÁCH CÁC PHIÊN CHẠY (LOGS LIST) ══ */
            <div>
              <div className="tw-flex tw-justify-between tw-items-center tw-mb-3">
                <span className="tw-text-xs tw-font-semibold tw-text-slate-600">
                  Tổng số: <strong>{total}</strong> phiên quyết toán tự động đã lưu vết
                </span>
                <button
                  type="button"
                  className="tw-text-xs tw-text-slate-600 hover:tw-text-slate-900 tw-bg-transparent tw-border-none tw-cursor-pointer tw-flex tw-items-center tw-gap-1"
                  onClick={loadLogs}
                  disabled={loadingLogs}
                >
                  <RotateCw size={12} className={loadingLogs ? 'tw-animate-spin' : ''} />
                  <span>Làm mới</span>
                </button>
              </div>

              {loadingLogs ? (
                <div className="tw-text-center tw-py-12 tw-text-slate-400 tw-text-xs">
                  <RotateCw size={18} className="tw-animate-spin tw-inline tw-mr-2" />
                  Đang tải nhật ký tự động hóa...
                </div>
              ) : logs.length === 0 ? (
                <div className="tw-bg-white tw-rounded-xl tw-p-8 tw-text-center tw-border tw-border-slate-200">
                  <FileSpreadsheet size={28} className="tw-text-slate-300 tw-mx-auto tw-mb-2" />
                  <div className="tw-text-xs tw-font-bold tw-text-slate-700">Chưa có phiên tự động nào</div>
                  <p className="tw-text-2xs tw-text-slate-500 tw-mt-1 tw-mb-3">
                    Khi bạn bấm "Kích Hoạt Chu Trình" hoặc khi hệ thống tự động chạy, toàn bộ vết chuyển tiền sẽ được lưu tại đây.
                  </p>
                  <button
                    type="button"
                    className="tw-px-3 tw-py-1.5 tw-bg-teal-600 hover:tw-bg-teal-700 tw-text-white tw-rounded-lg tw-text-xs tw-font-bold tw-border-none tw-cursor-pointer"
                    onClick={handleTriggerAutoCycle}
                    disabled={isRunningCycle}
                  >
                    Chạy chu trình ngay bây giờ
                  </button>
                </div>
              ) : (
                <div className="tw-space-y-2.5">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="tw-bg-white tw-rounded-xl tw-p-4 tw-border tw-border-slate-200 hover:tw-border-indigo-300 hover:tw-shadow-sm tw-transition tw-cursor-pointer"
                      onClick={() => loadDetail(log.id)}
                    >
                      <div className="tw-flex tw-justify-between tw-items-center">
                        <div className="tw-flex tw-items-center tw-gap-2.5">
                          <div className="tw-w-7 tw-h-7 tw-rounded-lg tw-bg-emerald-50 tw-text-emerald-700 tw-flex tw-items-center tw-justify-center">
                            <CheckCircle2 size={15} />
                          </div>
                          <div>
                            <span className="tw-font-mono tw-font-bold tw-text-xs tw-text-slate-900">
                              {log.batchCode}
                            </span>
                            <div className="tw-text-2xs tw-text-slate-400 tw-mt-0.5">
                              {moment(log.createdAt).format('HH:mm:ss DD/MM/YYYY')} • {log.triggeredBy === 'ADMIN_MANUAL' ? 'Admin kích hoạt' : 'Hệ thống tự động'}
                            </div>
                          </div>
                        </div>

                        <div className="tw-flex tw-items-center tw-gap-4">
                          <div className="tw-text-right">
                            <div className="tw-text-xs tw-font-mono tw-font-bold tw-text-emerald-700" style={{ fontVariantNumeric: 'tabular-nums' }}>
                              {formatMoney(log.totalAmount)}
                            </div>
                            <div className="tw-text-2xs tw-text-slate-500">
                              {log.totalItems} ca quyết toán
                            </div>
                          </div>

                          <span className="tw-text-slate-400 hover:tw-text-indigo-600">
                            <ChevronRight size={16} />
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── FOOTER ── */}
        <div className="tw-px-6 tw-py-3.5 tw-border-t tw-border-slate-200 tw-bg-slate-50 tw-flex tw-justify-between tw-items-center">
          <div className="tw-text-2xs tw-text-slate-500">
            Nguyên tắc Bất biến: Nhật ký giao dịch không thể sửa hoặc xóa sau khi ghi nhận.
          </div>
          <button
            type="button"
            className="tw-px-4 tw-py-2 tw-bg-slate-200 hover:tw-bg-slate-300 tw-text-slate-700 tw-rounded-lg tw-text-xs tw-font-semibold tw-border-none tw-cursor-pointer"
            onClick={onClose}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
