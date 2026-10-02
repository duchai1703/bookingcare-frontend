// src/containers/System/Admin/Financial/WithdrawalPolicyAuditTab.jsx
// Phân hệ Quản trị Chính sách Hoàn tiền / SLA Rút tiền Linh hoạt & Nhật ký Kiểm toán Bất biến (Audit Trail)
import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import moment from 'moment';
import {
  ShieldCheck,
  ShieldAlert,
  Clock,
  RotateCw,
  Plus,
  Trash2,
  FileText,
  History,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Lock,
  ArrowRight
} from 'lucide-react';
import {
  getActiveWithdrawalPolicy,
  updateAdminWithdrawalPolicy,
  getAdminWithdrawalPolicyVersions,
  getAdminPolicyAuditLogs,
} from '../../../../services/walletService';

const SLA_PRESETS = [1, 2, 3, 5, 7, 10, 14, 21, 30, 45, 60];

const WithdrawalPolicyAuditTab = () => {
  // Policy Config State
  const [activePolicy, setActivePolicy] = useState(null);
  const [policyVersions, setPolicyVersions] = useState([]);
  const [defaultSlaDays, setDefaultSlaDays] = useState(7);
  const [customSlaInput, setCustomSlaInput] = useState('7');
  const [isBusinessDaysOnly, setIsBusinessDaysOnly] = useState(false);
  const [allowCustomDays, setAllowCustomDays] = useState(true);
  const [minSlaDays, setMinSlaDays] = useState(1);
  const [maxSlaDays, setMaxSlaDays] = useState(60);
  const [tiers, setTiers] = useState([]);
  const [policyNoticeVi, setPolicyNoticeVi] = useState('');
  const [description, setDescription] = useState('');

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditPage, setAuditPage] = useState(1);
  const [auditLimit] = useState(10);
  const [selectedLogDiff, setSelectedLogDiff] = useState(null);

  // Loading States
  const [isLoadingPolicy, setIsLoadingPolicy] = useState(false);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal Bắt buộc nhập lý do giải trình
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [auditReason, setAuditReason] = useState('');

  // 1. Tải chính sách & các phiên bản
  const loadPolicy = useCallback(async () => {
    setIsLoadingPolicy(true);
    try {
      const [polRes, verRes] = await Promise.all([
        getActiveWithdrawalPolicy(),
        getAdminWithdrawalPolicyVersions(),
      ]);

      if (polRes && polRes.errCode === 0 && polRes.data) {
        const p = polRes.data;
        setActivePolicy(p);
        const rules = p.parsedRules || {};
        const days = rules.defaultSlaDays || 7;
        setDefaultSlaDays(days);
        setCustomSlaInput(String(days));
        setIsBusinessDaysOnly(Boolean(rules.isBusinessDaysOnly));
        setAllowCustomDays(rules.allowCustomDays !== undefined ? rules.allowCustomDays : true);
        setMinSlaDays(rules.minSlaDays || 1);
        setMaxSlaDays(rules.maxSlaDays || 60);
        setTiers(Array.isArray(rules.tiers) ? JSON.parse(JSON.stringify(rules.tiers)) : []);
        setPolicyNoticeVi(rules.policyNoticeVi || '');
        setDescription(p.description || '');
      }

      if (verRes && verRes.errCode === 0 && verRes.data) {
        setPolicyVersions(verRes.data);
      }
    } catch (err) {
      console.error('Lỗi khi tải chính sách:', err);
      toast.error('Không thể tải chính sách SLA rút tiền');
    } finally {
      setIsLoadingPolicy(false);
    }
  }, []);

  // 2. Tải danh sách Audit Logs
  const loadAuditLogs = useCallback(async (page = 1) => {
    setIsLoadingAudit(true);
    try {
      const res = await getAdminPolicyAuditLogs({
        policyType: 'WITHDRAWAL_SLA',
        page,
        limit: auditLimit,
      });
      if (res && res.errCode === 0) {
        setAuditLogs(res.data || []);
        setAuditTotal(res.total || 0);
        setAuditPage(page);
      }
    } catch (err) {
      console.error('Lỗi khi tải audit logs:', err);
      toast.error('Không thể tải nhật ký kiểm toán');
    } finally {
      setIsLoadingAudit(false);
    }
  }, [auditLimit]);

  useEffect(() => {
    loadPolicy();
    loadAuditLogs(1);
  }, [loadPolicy, loadAuditLogs]);

  // Chọn số ngày mặc định từ Presets
  const handleSelectPreset = (days) => {
    setDefaultSlaDays(days);
    setCustomSlaInput(String(days));
  };

  // Nhập số ngày tùy chỉnh
  const handleCustomSlaChange = (e) => {
    const val = e.target.value.replace(/\D/g, '');
    setCustomSlaInput(val);
    const num = parseInt(val, 10);
    if (num > 0) {
      setDefaultSlaDays(num);
    }
  };

  // Quản lý Tiers
  const handleTierChange = (index, field, value) => {
    const nextTiers = [...tiers];
    nextTiers[index][field] = value;
    setTiers(nextTiers);
  };

  const handleAddTier = () => {
    const lastTier = tiers[tiers.length - 1];
    const newMin = lastTier && lastTier.maxAmount ? Number(lastTier.maxAmount) + 1 : 20000000;
    setTiers([
      ...tiers,
      {
        minAmount: newMin,
        maxAmount: null,
        slaDays: defaultSlaDays,
        label: `Hạn mức trên ${(newMin / 1000000).toFixed(0)} triệu — Xử lý trong ${defaultSlaDays} ngày`,
      },
    ]);
  };

  const handleRemoveTier = (index) => {
    const nextTiers = tiers.filter((_, i) => i !== index);
    setTiers(nextTiers);
  };

  // Mở modal xác nhận kiểm toán
  const handleOpenConfirmModal = (e) => {
    e.preventDefault();
    if (defaultSlaDays < 1) {
      toast.warning('Số ngày hoàn tiền SLA mặc định phải ít nhất là 1 ngày.');
      return;
    }
    setAuditReason('');
    setShowConfirmModal(true);
  };

  // Xác nhận lưu chính sách và ghi Audit Log
  const handleConfirmSubmit = async (e) => {
    e.preventDefault();
    if (!auditReason.trim()) {
      toast.warning('Vui lòng nhập lý do giải trình (Bắt buộc theo chuẩn kiểm toán tài chính).');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        defaultSlaDays,
        allowCustomDays,
        minSlaDays,
        maxSlaDays,
        isBusinessDaysOnly,
        tiers,
        policyNoticeVi,
        description,
        reason: auditReason.trim(),
      };

      const res = await updateAdminWithdrawalPolicy(payload);
      if (res && res.errCode === 0) {
        toast.success(res.message || 'Cập nhật chính sách thành công!');
        setShowConfirmModal(false);
        setAuditReason('');
        loadPolicy();
        loadAuditLogs(1);
      } else {
        toast.error(res?.errMessage || 'Không thể cập nhật chính sách');
      }
    } catch (err) {
      console.error('Lỗi cập nhật chính sách:', err);
      toast.error('Lỗi máy chủ khi cập nhật chính sách.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalAuditPages = Math.ceil(auditTotal / auditLimit) || 1;

  return (
    <div className="tw-space-y-6">
      {/* ══════════════ 1. BANNER THÔNG TIN CHÍNH SÁCH HIỆN TẠI ══════════════ */}
      <div className="tw-bg-white tw-rounded-2xl tw-p-6 tw-shadow-sm tw-border tw-border-slate-200">
        <div className="tw-flex tw-justify-between tw-items-start tw-flex-wrap tw-gap-4">
          <div>
            <div className="tw-flex tw-items-center tw-gap-2.5 tw-mb-2">
              <span className="tw-px-3 tw-py-1 tw-bg-teal-100 tw-text-teal-800 tw-text-xs tw-font-extrabold tw-rounded-full tw-flex tw-items-center tw-gap-1.5">
                <ShieldCheck size={14} /> CHÍNH SÁCH ĐANG HIỆU LỰC: PHIÊN BẢN v{activePolicy?.version || 1}
              </span>
              <span className="tw-px-2.5 tw-py-0.5 tw-bg-emerald-50 tw-text-emerald-700 tw-border tw-border-emerald-200 tw-text-2xs tw-font-bold tw-rounded-md">
                ACTIVE
              </span>
              {isBusinessDaysOnly && (
                <span className="tw-px-2.5 tw-py-0.5 tw-bg-sky-50 tw-text-sky-700 tw-border tw-border-sky-200 tw-text-2xs tw-font-bold tw-rounded-md">
                  Chỉ tính ngày làm việc
                </span>
              )}
            </div>
            <h3 className="tw-text-xl tw-font-extrabold tw-text-slate-900 tw-m-0">
              {activePolicy?.name || 'Chính Sách Cam Kết Thời Hạn Hoàn Tiền / Rút Tiền Linh Hoạt'}
            </h3>
            <p className="tw-text-xs tw-text-slate-500 tw-mt-1 tw-mb-0">
              Mã chính sách: <code>{activePolicy?.code}</code> | Hiệu lực từ:{' '}
              <strong>{moment(activePolicy?.effectiveFrom).format('DD/MM/YYYY HH:mm')}</strong> | Ban hành bởi:{' '}
              <strong>{activePolicy?.creator?.email || 'Hệ thống Quản trị'}</strong>
            </p>
          </div>

          <div className="tw-flex tw-items-center tw-gap-2">
            <button
              type="button"
              className="tw-px-3 tw-py-2 tw-bg-slate-100 hover:tw-bg-slate-200 tw-text-slate-700 tw-rounded-xl tw-text-xs tw-font-bold tw-flex tw-items-center tw-gap-1.5 tw-border-none tw-cursor-pointer"
              onClick={() => {
                loadPolicy();
                loadAuditLogs(auditPage);
              }}
              disabled={isLoadingPolicy || isLoadingAudit}
            >
              <RotateCw size={13} className={isLoadingPolicy || isLoadingAudit ? 'tw-animate-spin' : ''} />
              <span>Đồng bộ</span>
            </button>
          </div>
        </div>

        {/* 4 Cards tóm tắt SLA */}
        <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-4 tw-gap-4 tw-mt-5 tw-pt-5 tw-border-t tw-border-slate-100">
          <div className="tw-p-3.5 tw-bg-slate-50 tw-rounded-xl tw-border tw-border-slate-200">
            <div className="tw-text-2xs tw-text-slate-500 tw-font-bold tw-uppercase">SLA Tiêu Chuẩn Mặc Định</div>
            <div className="tw-text-2xl tw-font-black tw-text-teal-700 tw-mt-1">
              {defaultSlaDays} <span className="tw-text-sm tw-font-bold">ngày {isBusinessDaysOnly ? 'làm việc' : ''}</span>
            </div>
            <div className="tw-text-2xs tw-text-slate-400 tw-mt-1">Áp dụng cho mọi yêu cầu rút không trùng bậc riêng</div>
          </div>

          <div className="tw-p-3.5 tw-bg-slate-50 tw-rounded-xl tw-border tw-border-slate-200">
            <div className="tw-text-2xs tw-text-slate-500 tw-font-bold tw-uppercase">Số Bậc Phân Tầng (Tiers)</div>
            <div className="tw-text-2xl tw-font-black tw-text-indigo-700 tw-mt-1">
              {tiers.length} <span className="tw-text-sm tw-font-bold">bậc hạn mức</span>
            </div>
            <div className="tw-text-2xs tw-text-slate-400 tw-mt-1">Cam kết rút nhanh hạn mức nhỏ, thẩm định hạn mức lớn</div>
          </div>

          <div className="tw-p-3.5 tw-bg-slate-50 tw-rounded-xl tw-border tw-border-slate-200">
            <div className="tw-text-2xs tw-text-slate-500 tw-font-bold tw-uppercase">Lịch Sử Phiên Bản</div>
            <div className="tw-text-2xl tw-font-black tw-text-slate-800 tw-mt-1">
              {policyVersions.length} <span className="tw-text-sm tw-font-bold">phiên bản</span>
            </div>
            <div className="tw-text-2xs tw-text-slate-400 tw-mt-1">Lưu trữ bất biến, không bị ghi đè dữ liệu cũ</div>
          </div>

          <div className="tw-p-3.5 tw-bg-slate-50 tw-rounded-xl tw-border tw-border-slate-200">
            <div className="tw-text-2xs tw-text-slate-500 tw-font-bold tw-uppercase">Tổng Nhật Ký Kiểm Toán</div>
            <div className="tw-text-2xl tw-font-black tw-text-amber-700 tw-mt-1">
              {auditTotal} <span className="tw-text-sm tw-font-bold">bản ghi</span>
            </div>
            <div className="tw-text-2xs tw-text-slate-400 tw-mt-1">Append-only audit trail lưu vết toàn bộ thay đổi</div>
          </div>
        </div>
      </div>

      {/* ══════════════ 2. FORM ĐIỀU CHỈNH CHÍNH SÁCH LINH HOẠT ══════════════ */}
      <form onSubmit={handleOpenConfirmModal} className="tw-bg-white tw-rounded-2xl tw-p-6 tw-shadow-sm tw-border tw-border-slate-200">
        <div className="tw-flex tw-items-center tw-justify-between tw-mb-4 tw-pb-3 tw-border-b tw-border-slate-100">
          <div>
            <h4 className="tw-text-base tw-font-extrabold tw-text-slate-800 tw-m-0 tw-flex tw-items-center tw-gap-2">
              <Clock size={18} className="tw-text-teal-600" />
              Thiết Lập Thời Hạn Hoàn Tiền / Rút Tiền Linh Hoạt ($N$ Ngày)
            </h4>
            <p className="tw-text-xs tw-text-slate-500 tw-m-0 tw-mt-0.5">
              Cho phép tùy chọn bất kỳ số ngày nào (1, 3, 7, 14, 30... ngày). Mọi điều chỉnh sẽ được ghi log bắt buộc kèm lý do giải trình.
            </p>
          </div>
          <span className="tw-text-2xs tw-text-amber-700 tw-bg-amber-50 tw-border tw-border-amber-200 tw-px-2.5 tw-py-1 tw-rounded-lg tw-font-semibold tw-flex tw-items-center tw-gap-1">
            <Lock size={11} /> Kiểm toán bảo mật
          </span>
        </div>

        {/* Cấu hình Số ngày mặc định */}
        <div className="tw-mb-5">
          <label className="tw-block tw-text-xs tw-font-bold tw-text-slate-700 tw-mb-2">
            1. Chọn nhanh số ngày cam kết giải ngân mặc định (SLA Days):
          </label>
          <div className="tw-flex tw-flex-wrap tw-gap-2 tw-mb-3">
            {SLA_PRESETS.map((d) => (
              <button
                key={d}
                type="button"
                className={`tw-px-3.5 tw-py-1.5 tw-rounded-xl tw-text-xs tw-font-bold tw-border tw-cursor-pointer tw-transition-all ${
                  defaultSlaDays === d
                    ? 'tw-bg-teal-600 tw-text-white tw-border-teal-600 tw-shadow-sm'
                    : 'tw-bg-slate-50 tw-text-slate-700 tw-border-slate-200 hover:tw-bg-slate-100'
                }`}
                onClick={() => handleSelectPreset(d)}
              >
                {d} ngày
              </button>
            ))}
          </div>

          <div className="tw-flex tw-items-center tw-gap-3">
            <div className="tw-flex-1 tw-max-w-xs">
              <label className="tw-block tw-text-2xs tw-text-slate-500 tw-font-semibold tw-mb-1">
                Hoặc nhập số ngày tùy chỉnh bất kỳ (từ 1 đến 365 ngày):
              </label>
              <div className="tw-relative">
                <input
                  type="text"
                  className="tw-w-full tw-p-2 tw-pr-12 tw-border tw-border-slate-300 tw-rounded-xl tw-text-sm tw-font-bold tw-text-slate-800"
                  value={customSlaInput}
                  onChange={handleCustomSlaChange}
                  placeholder="VD: 14"
                />
                <span className="tw-absolute tw-right-3 tw-top-2.5 tw-text-xs tw-text-slate-400 tw-font-semibold">
                  ngày
                </span>
              </div>
            </div>

            <div className="tw-flex-1 tw-mt-4">
              <label className="tw-flex tw-items-center tw-gap-2 tw-cursor-pointer tw-text-xs tw-font-bold tw-text-slate-700">
                <input
                  type="checkbox"
                  className="tw-w-4 tw-h-4 tw-rounded tw-text-teal-600"
                  checked={isBusinessDaysOnly}
                  onChange={(e) => setIsBusinessDaysOnly(e.target.checked)}
                />
                <span>Chỉ tính ngày làm việc (Loại trừ Thứ Bảy và Chủ Nhật khi tính thời hạn)</span>
              </label>
              <small className="tw-text-2xs tw-text-slate-400 tw-block tw-mt-0.5">
                Nếu bật, khi người dùng yêu cầu vào thứ Sáu, thời gian 3 ngày làm việc sẽ kết thúc vào thứ Tư tuần sau.
              </small>
            </div>
          </div>
        </div>

        {/* Cấu hình Phân tầng hạn mức (Tiers) */}
        <div className="tw-mb-5 tw-pt-4 tw-border-t tw-border-slate-100">
          <div className="tw-flex tw-justify-between tw-items-center tw-mb-2">
            <div>
              <label className="tw-block tw-text-xs tw-font-bold tw-text-slate-700">
                2. Phân tầng thời hạn cam kết theo hạn mức rút tiền (Tiered SLAs):
              </label>
              <small className="tw-text-2xs tw-text-slate-500">
                Cấu hình số ngày xử lý khác nhau tùy thuộc vào số tiền rút (Khoản nhỏ chuyển nhanh, khoản lớn đối soát kỹ)
              </small>
            </div>
            <button
              type="button"
              className="tw-px-3 tw-py-1.5 tw-bg-indigo-50 hover:tw-bg-indigo-100 tw-text-indigo-700 tw-rounded-xl tw-text-xs tw-font-bold tw-flex tw-items-center tw-gap-1 tw-border-none tw-cursor-pointer"
              onClick={handleAddTier}
            >
              <Plus size={14} /> Thêm bậc hạn mức
            </button>
          </div>

          {tiers.length === 0 ? (
            <div className="tw-p-4 tw-bg-slate-50 tw-rounded-xl tw-border tw-border-dashed tw-border-slate-200 tw-text-center tw-text-xs tw-text-slate-500">
              Chưa thiết lập bậc hạn mức riêng nào. Tất cả giao dịch sẽ áp dụng mức mặc định ({defaultSlaDays} ngày).
            </div>
          ) : (
            <div className="tw-space-y-2.5">
              {tiers.map((tier, idx) => (
                <div
                  key={idx}
                  className="tw-flex tw-items-center tw-gap-2 tw-p-3 tw-bg-slate-50 tw-rounded-xl tw-border tw-border-slate-200"
                >
                  <span className="tw-px-2 tw-py-1 tw-bg-slate-200 tw-text-slate-700 tw-rounded tw-text-2xs tw-font-bold">
                    Bậc #{idx + 1}
                  </span>

                  <div className="tw-flex-1 tw-grid tw-grid-cols-4 tw-gap-2">
                    <div>
                      <span className="tw-block tw-text-3xs tw-text-slate-400 tw-font-bold">TỪ (VNĐ):</span>
                      <input
                        type="number"
                        className="tw-w-full tw-p-1.5 tw-border tw-border-slate-300 tw-rounded-lg tw-text-xs tw-font-semibold"
                        value={tier.minAmount}
                        onChange={(e) => handleTierChange(idx, 'minAmount', e.target.value)}
                        placeholder="VD: 50000"
                      />
                    </div>
                    <div>
                      <span className="tw-block tw-text-3xs tw-text-slate-400 tw-font-bold">ĐẾN (VNĐ - Trống = Không giới hạn):</span>
                      <input
                        type="number"
                        className="tw-w-full tw-p-1.5 tw-border tw-border-slate-300 tw-rounded-lg tw-text-xs tw-font-semibold"
                        value={tier.maxAmount ?? ''}
                        onChange={(e) => handleTierChange(idx, 'maxAmount', e.target.value)}
                        placeholder="Để trống nếu là vô cực"
                      />
                    </div>
                    <div>
                      <span className="tw-block tw-text-3xs tw-text-slate-400 tw-font-bold">SLA (SỐ NGÀY):</span>
                      <input
                        type="number"
                        min="1"
                        max="365"
                        className="tw-w-full tw-p-1.5 tw-border tw-border-slate-300 tw-rounded-lg tw-text-xs tw-font-bold tw-text-teal-700"
                        value={tier.slaDays}
                        onChange={(e) => handleTierChange(idx, 'slaDays', e.target.value)}
                        placeholder="Số ngày"
                      />
                    </div>
                    <div>
                      <span className="tw-block tw-text-3xs tw-text-slate-400 tw-font-bold">TÊN HIỂN THỊ (LABEL):</span>
                      <input
                        type="text"
                        className="tw-w-full tw-p-1.5 tw-border tw-border-slate-300 tw-rounded-lg tw-text-xs"
                        value={tier.label || ''}
                        onChange={(e) => handleTierChange(idx, 'label', e.target.value)}
                        placeholder="VD: Khoản nhỏ - Duyệt nhanh trong 24h"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    className="tw-p-2 tw-text-rose-500 hover:tw-bg-rose-50 tw-rounded-lg tw-border-none tw-cursor-pointer tw-transition-all"
                    onClick={() => handleRemoveTier(idx)}
                    title="Xóa bậc này"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Thông báo chính sách tới bệnh nhân */}
        <div className="tw-mb-5 tw-pt-4 tw-border-t tw-border-slate-100">
          <label className="tw-block tw-text-xs tw-font-bold tw-text-slate-700 tw-mb-1">
            3. Thông báo quy định hiển thị tới người bệnh khi rút tiền:
          </label>
          <textarea
            rows="2"
            className="tw-w-full tw-p-2.5 tw-border tw-border-slate-300 tw-rounded-xl tw-text-xs tw-text-slate-800"
            value={policyNoticeVi}
            onChange={(e) => setPolicyNoticeVi(e.target.value)}
            placeholder="VD: Thời gian hoàn tất rút tiền từ 1 đến 14 ngày tùy thuộc vào hạn mức giao dịch và thời gian đối soát của ngân hàng..."
          />
        </div>

        {/* Nút hành động */}
        <div className="tw-flex tw-justify-end tw-items-center tw-gap-3 tw-pt-4 tw-border-t tw-border-slate-100">
          <button
            type="submit"
            className="tw-px-6 tw-py-2.5 tw-bg-teal-600 hover:tw-bg-teal-700 tw-text-white tw-rounded-xl tw-text-xs tw-font-bold tw-shadow-sm tw-flex tw-items-center tw-gap-2 tw-border-none tw-cursor-pointer"
          >
            <ShieldCheck size={16} /> Lưu Cập Nhật Chính Sách (Ghi Nhận Kiểm Toán)
          </button>
        </div>
      </form>

      {/* ══════════════ 3. BẢNG NHẬT KÝ KIỂM TOÁN BẤT BIẾN (AUDIT TRAIL) ══════════════ */}
      <div className="tw-bg-white tw-rounded-2xl tw-p-6 tw-shadow-sm tw-border tw-border-slate-200">
        <div className="tw-flex tw-justify-between tw-items-center tw-mb-4">
          <div>
            <h4 className="tw-text-base tw-font-extrabold tw-text-slate-800 tw-m-0 tw-flex tw-items-center tw-gap-2">
              <History size={18} className="tw-text-indigo-600" />
              Nhật Ký Kiểm Toán Thay Đổi Chính Sách Bất Biến (Immutable Audit Trail)
            </h4>
            <p className="tw-text-xs tw-text-slate-500 tw-m-0 tw-mt-0.5">
              Hệ thống lưu vết vĩnh viễn (Append-Only) mọi hành vi điều chỉnh chính sách, Quản trị viên thực hiện, lý do giải trình và IP máy trạm.
            </p>
          </div>
          <span className="tw-text-2xs tw-bg-indigo-50 tw-text-indigo-700 tw-border tw-border-indigo-200 tw-px-3 tw-py-1 tw-rounded-full tw-font-bold">
            Tổng cộng: {auditTotal} bản ghi
          </span>
        </div>

        {/* Bảng danh sách log */}
        <div className="tw-overflow-x-auto">
          <table className="tw-w-full tw-text-left tw-border-collapse">
            <thead>
              <tr className="tw-border-b tw-border-slate-200 tw-bg-slate-50">
                <th className="tw-p-3 tw-text-2xs tw-font-bold tw-text-slate-600 tw-uppercase">Thời Điểm</th>
                <th className="tw-p-3 tw-text-2xs tw-font-bold tw-text-slate-600 tw-uppercase">Quản Trị Viên</th>
                <th className="tw-p-3 tw-text-2xs tw-font-bold tw-text-slate-600 tw-uppercase">Hành Động</th>
                <th className="tw-p-3 tw-text-2xs tw-font-bold tw-text-slate-600 tw-uppercase">Lý Do Giải Trình (Bắt Buộc)</th>
                <th className="tw-p-3 tw-text-2xs tw-font-bold tw-text-slate-600 tw-uppercase">Địa Chỉ IP</th>
                <th className="tw-p-3 tw-text-2xs tw-font-bold tw-text-slate-600 tw-uppercase tw-text-center">Chi Tiết Diff</th>
              </tr>
            </thead>
            <tbody>
              {isLoadingAudit ? (
                <tr>
                  <td colSpan="6" className="tw-p-8 tw-text-center tw-text-slate-400">
                    <RotateCw size={18} className="tw-animate-spin tw-inline tw-mr-2" /> Đang tải dữ liệu kiểm toán...
                  </td>
                </tr>
              ) : auditLogs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="tw-p-8 tw-text-center tw-text-slate-400">
                    Chưa có bản ghi nhật ký kiểm toán nào được ghi nhận.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id} className="tw-border-b tw-border-slate-100 hover:tw-bg-slate-50/60">
                    <td className="tw-p-3 tw-text-xs">
                      <div className="tw-font-bold tw-text-slate-800">
                        {moment(log.createdAt).format('DD/MM/YYYY HH:mm:ss')}
                      </div>
                      <div className="tw-text-3xs tw-text-slate-400">#{log.id}</div>
                    </td>
                    <td className="tw-p-3 tw-text-xs">
                      <div className="tw-font-bold tw-text-slate-800">
                        {log.admin?.firstName} {log.admin?.lastName}
                      </div>
                      <div className="tw-text-2xs tw-text-slate-500">{log.admin?.email}</div>
                    </td>
                    <td className="tw-p-3 tw-text-xs">
                      <span className={`tw-px-2 tw-py-0.5 tw-rounded tw-text-2xs tw-font-bold ${
                        log.action === 'CREATE'
                          ? 'tw-bg-emerald-100 tw-text-emerald-800'
                          : 'tw-bg-indigo-100 tw-text-indigo-800'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="tw-p-3 tw-text-xs tw-max-w-md">
                      <div className="tw-p-2 tw-bg-amber-50/70 tw-rounded-lg tw-border tw-border-amber-200/60 tw-text-amber-900 tw-font-medium">
                        "{log.reason}"
                      </div>
                    </td>
                    <td className="tw-p-3 tw-text-xs tw-font-mono tw-text-slate-600">
                      {log.ipAddress || '127.0.0.1'}
                    </td>
                    <td className="tw-p-3 tw-text-center">
                      <button
                        type="button"
                        className="tw-px-2.5 tw-py-1 tw-bg-slate-100 hover:tw-bg-slate-200 tw-text-slate-700 tw-rounded-lg tw-text-2xs tw-font-bold tw-border-none tw-cursor-pointer"
                        onClick={() => setSelectedLogDiff(log)}
                      >
                        Xem Diff
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Phân trang Audit Logs */}
        {totalAuditPages > 1 && (
          <div className="tw-flex tw-justify-between tw-items-center tw-mt-4 tw-pt-3 tw-border-t tw-border-slate-100">
            <span className="tw-text-xs tw-text-slate-500">
              Trang {auditPage} / {totalAuditPages} ({auditTotal} bản ghi kiểm toán)
            </span>
            <div className="tw-flex tw-gap-2">
              <button
                type="button"
                className="tw-px-3 tw-py-1 tw-bg-slate-100 hover:tw-bg-slate-200 tw-text-slate-700 tw-rounded-lg tw-text-xs tw-font-bold tw-border-none tw-cursor-pointer"
                disabled={auditPage <= 1 || isLoadingAudit}
                onClick={() => loadAuditLogs(auditPage - 1)}
              >
                Trước
              </button>
              <button
                type="button"
                className="tw-px-3 tw-py-1 tw-bg-slate-100 hover:tw-bg-slate-200 tw-text-slate-700 tw-rounded-lg tw-text-xs tw-font-bold tw-border-none tw-cursor-pointer"
                disabled={auditPage >= totalAuditPages || isLoadingAudit}
                onClick={() => loadAuditLogs(auditPage + 1)}
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ══════════════ MODAL 1: BẮT BUỘC NHẬP LÝ DO GIẢI TRÌNH KIỂM TOÁN ══════════════ */}
      {showConfirmModal && (
        <div className="deposit-modal-backdrop" onClick={() => setShowConfirmModal(false)}>
          <div className="deposit-modal-content tw-max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <div className="modal-title-group">
                <ShieldCheck size={20} className="tw-text-teal-600" />
                <h3 className="tw-text-base tw-font-extrabold tw-text-slate-900 tw-m-0">
                  Xác Nhận Cập Nhật Chính Sách SLA (Kiểm Toán)
                </h3>
              </div>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setShowConfirmModal(false)}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleConfirmSubmit} className="tw-p-4 tw-space-y-4">
              <div className="tw-p-3 tw-bg-teal-50 tw-rounded-xl tw-border tw-border-teal-200 tw-text-xs tw-text-teal-900">
                <div className="tw-font-bold tw-mb-1 tw-flex tw-items-center tw-gap-1.5">
                  <AlertCircle size={15} /> Tóm tắt thay đổi phiên bản mới:
                </div>
                <div>• SLA Mặc định mới: <strong>{defaultSlaDays} ngày {isBusinessDaysOnly ? '(chỉ ngày làm việc)' : ''}</strong></div>
                <div>• Số bậc hạn mức: <strong>{tiers.length} bậc</strong></div>
              </div>

              <div>
                <label className="tw-block tw-text-xs tw-font-bold tw-text-slate-800 tw-mb-1">
                  Lý do giải trình thay đổi chính sách <span className="tw-text-rose-600">* (Bắt buộc)</span>:
                </label>
                <textarea
                  rows="3"
                  className="tw-w-full tw-p-2.5 tw-border tw-border-slate-300 tw-rounded-xl tw-text-xs tw-text-slate-800"
                  placeholder="VD: Điều chỉnh kéo dài thời gian xử lý lên 14 ngày do kỳ quyết toán kiểm toán cuối năm..."
                  value={auditReason}
                  onChange={(e) => setAuditReason(e.target.value)}
                  required
                />
                <small className="tw-text-2xs tw-text-slate-500 tw-mt-1 tw-block">
                  Lý do này sẽ được ghi vào Sổ cái kiểm toán bất biến <code>Policy_Audit_Logs</code> cùng với thông tin tài khoản Admin và IP thực hiện.
                </small>
              </div>

              <div className="tw-flex tw-justify-end tw-gap-2 tw-pt-3 tw-border-t tw-border-slate-100">
                <button
                  type="button"
                  className="tw-px-4 tw-py-2 tw-bg-slate-100 hover:tw-bg-slate-200 tw-text-slate-700 tw-rounded-xl tw-text-xs tw-font-bold tw-border-none tw-cursor-pointer"
                  onClick={() => setShowConfirmModal(false)}
                  disabled={isSubmitting}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="tw-px-5 tw-py-2 tw-bg-teal-600 hover:tw-bg-teal-700 tw-text-white tw-rounded-xl tw-text-xs tw-font-bold tw-flex tw-items-center tw-gap-1.5 tw-border-none tw-cursor-pointer"
                  disabled={isSubmitting || !auditReason.trim()}
                >
                  {isSubmitting ? (
                    <>
                      <RotateCw size={13} className="tw-animate-spin" /> Đang ghi nhận...
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={14} /> Ký Duyệt & Ban Hành
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════ MODAL 2: XEM CHI TIẾT DIFF KIỂM TOÁN ══════════════ */}
      {selectedLogDiff && (
        <div className="deposit-modal-backdrop" onClick={() => setSelectedLogDiff(null)}>
          <div className="deposit-modal-content tw-max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <div className="modal-title-group">
                <History size={18} className="tw-text-indigo-600" />
                <h3 className="tw-text-base tw-font-extrabold tw-text-slate-900 tw-m-0">
                  Chi Tiết Thay Đổi Kiểm Toán #{selectedLogDiff.id}
                </h3>
              </div>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setSelectedLogDiff(null)}
              >
                &times;
              </button>
            </div>

            <div className="tw-p-4 tw-space-y-4 tw-max-h-[70vh] tw-overflow-y-auto">
              <div className="tw-p-3 tw-bg-amber-50 tw-rounded-xl tw-border tw-border-amber-200 tw-text-xs tw-text-amber-900">
                <strong>Lý do giải trình:</strong> "{selectedLogDiff.reason}"
              </div>

              <div className="tw-grid tw-grid-cols-2 tw-gap-4">
                <div>
                  <div className="tw-text-xs tw-font-bold tw-text-slate-600 tw-mb-1 tw-flex tw-items-center tw-gap-1">
                    <span className="tw-w-2 tw-h-2 tw-rounded-full tw-bg-rose-500" /> Cấu hình trước khi đổi (Old Value):
                  </div>
                  <pre className="tw-p-3 tw-bg-slate-900 tw-text-emerald-400 tw-rounded-xl tw-text-3xs tw-font-mono tw-overflow-x-auto tw-max-h-60">
                    {JSON.stringify(selectedLogDiff.parsedOldValue, null, 2) || '(Khởi tạo mới)'}
                  </pre>
                </div>

                <div>
                  <div className="tw-text-xs tw-font-bold tw-text-slate-600 tw-mb-1 tw-flex tw-items-center tw-gap-1">
                    <span className="tw-w-2 tw-h-2 tw-rounded-full tw-bg-emerald-500" /> Cấu hình sau khi đổi (New Value):
                  </div>
                  <pre className="tw-p-3 tw-bg-slate-900 tw-text-emerald-400 tw-rounded-xl tw-text-3xs tw-font-mono tw-overflow-x-auto tw-max-h-60">
                    {JSON.stringify(selectedLogDiff.parsedNewValue, null, 2)}
                  </pre>
                </div>
              </div>

              <div className="tw-text-2xs tw-text-slate-400 tw-flex tw-justify-between tw-pt-2 tw-border-t tw-border-slate-100">
                <span>Quản trị viên: {selectedLogDiff.admin?.email}</span>
                <span>IP: {selectedLogDiff.ipAddress} | Thời điểm: {moment(selectedLogDiff.createdAt).format('DD/MM/YYYY HH:mm:ss')}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WithdrawalPolicyAuditTab;
