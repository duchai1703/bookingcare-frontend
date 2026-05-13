// src/containers/PatientPortal/PaymentResult.jsx
// [Phase 11 — GĐ 11.4] Trang kết quả thanh toán VNPay
// 100% JSX, CẤM dangerouslySetInnerHTML
// PaymentBadge defined TRƯỚC PaymentResult (self-contained)
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';

// ═══════════════════════════════════════════════════════════════════════
// ✅ [v20.2 FIX-B] PaymentBadge — Tự chứa, định nghĩa TRƯỚC PaymentResult
// ═══════════════════════════════════════════════════════════════════════
function PaymentBadge({ status }) {
  const config = {
    paid: { label: '✅ Đã TT', cls: 'tw-bg-emerald-100 tw-text-emerald-800' },
    unpaid: { label: '⏳ Chờ TT', cls: 'tw-bg-amber-100 tw-text-amber-800' },
    failed: { label: '❌ Thất bại', cls: 'tw-bg-red-100 tw-text-red-800' },
    expired: { label: '🕐 Hết hạn', cls: 'tw-bg-gray-100 tw-text-gray-800' },
    refunded: { label: '🔄 Hoàn tiền', cls: 'tw-bg-blue-100 tw-text-blue-800' },
    // [NEW LOGIC VNPAY-MAIL]: Lỗi 22 — Thêm badge cho 2 trạng thái mới
    refund_pending: { label: '🟠 Chờ hoàn tiền', cls: 'tw-bg-orange-100 tw-text-orange-800' },
    paid_but_expired: { label: '🟣 Cần xử lý', cls: 'tw-bg-purple-100 tw-text-purple-800' },
  };
  const c = config[status] || config.unpaid;
  return (
    <span
      className={`tw-px-2 tw-py-1 tw-rounded tw-text-xs tw-font-medium ${c.cls}`}
    >
      {c.label}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// GLOBAL_SNAPSHOT — giữ dữ liệu thanh toán qua navigation/reload
// ✅ [v20.0 F6] Xóa biến amount — KHÔNG lưu amount trong snapshot
// ═══════════════════════════════════════════════════════════════════════
let GLOBAL_SNAPSHOT = null;

function PaymentResult() {
  const [searchParams] = useSearchParams();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // [NEW LOGIC VNPAY-MAIL]: Lỗi 34 — Chèn meta no-referrer chống rò rỉ token y tế
    let metaReferrer = document.querySelector('meta[name="referrer"]');
    if (!metaReferrer) {
      metaReferrer = document.createElement('meta');
      metaReferrer.name = 'referrer';
      document.head.appendChild(metaReferrer);
    }
    metaReferrer.content = 'no-referrer';

    let isCancelled = false;

    async function process() {
      // Bước 1: Đọc URL hoặc fallback
      // ✅ [v20.0 F6] Xóa biến amount — không dùng
      const txnRef = searchParams.get('vnp_TxnRef');
      const respCode = searchParams.get('vnp_ResponseCode');

      if (txnRef && respCode) {
        // ✅ [v20.0 F6] Xóa amount thừa — dữ liệu lấy từ API booking-by-token
        GLOBAL_SNAPSHOT = { txnRef, respCode, snapshotKey: txnRef };
        sessionStorage.setItem(
          'paymentSnapshot',
          JSON.stringify(GLOBAL_SNAPSHOT),
        );
      } else if (!GLOBAL_SNAPSHOT) {
        const stored = sessionStorage.getItem('paymentSnapshot');
        if (stored) GLOBAL_SNAPSHOT = JSON.parse(stored);
      }

      if (!GLOBAL_SNAPSHOT) {
        if (!isCancelled) {
          setResult({ error: 'Không có dữ liệu' });
          setLoading(false);
        }
        return;
      }

      // Bước 2: Cross-validate snapshotKey
      const currentRef =
        searchParams.get('vnp_TxnRef') || GLOBAL_SNAPSHOT.txnRef;
      if (GLOBAL_SNAPSHOT.snapshotKey !== currentRef) {
        GLOBAL_SNAPSHOT = null;
        // ✅ [AUDIT FIX] KHÔNG xóa sessionStorage — giữ nguyên để F5 không mất dữ liệu
        // sessionStorage.removeItem('paymentSnapshot');
        if (!isCancelled) {
          setResult({ error: 'Dữ liệu không khớp' });
          setLoading(false);
        }
        return;
      }

      // Bước 3: Gọi API (x-mute-toast)
      try {
        const resp = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/api/v1/payment/booking-by-token?token=${GLOBAL_SNAPSHOT.txnRef}`,
          { headers: { 'x-mute-toast': 'true' } },
        );
        if (!isCancelled) setResult(resp.data);
      } catch (err) {
        if (!isCancelled) setResult({ error: 'Lỗi kết nối server' });
      }

      // Bước 4: Clean URL
      window.history.replaceState({}, '', '/payment-result');

      // [NEW LOGIC VNPAY-MAIL]: Lỗi 29 — GIỮ NGUYÊN sessionStorage để F5 không mất dữ liệu
      // KHÔNG xóa sessionStorage — cho phép bệnh nhân F5 thoải mái
      if (!isCancelled) setLoading(false);
    }

    process();
    return () => {
      isCancelled = true;
    };
  }, []);

  if (loading)
    return <div className="tw-text-center tw-py-20">Đang xử lý kết quả...</div>;
  if (result?.error)
    return <div className="tw-text-center tw-text-red-500 tw-py-20">{result.error}</div>;

  // CẤM dangerouslySetInnerHTML. TEXT thuần.
  const data = result?.data || {};
  return (
    <div className="tw-max-w-lg tw-mx-auto tw-p-6 tw-bg-white tw-rounded tw-shadow tw-mt-10">
      <h2 className="tw-text-xl tw-font-bold tw-mb-4">Kết quả thanh toán</h2>
      <p>Bệnh nhân: {data.patientNameMasked}</p>
      <p>Bác sĩ: {data.doctorName}</p>
      <p>Ngày khám: {data.date}</p>
      <p>Giờ khám: {data.timeType}</p>
      <p>Số tiền: {data.bookingPrice?.toLocaleString()} VNĐ</p>
      <p>Mã GD: {data.vnpayTransactionNo}</p>
      <div className="tw-mt-3">
        <PaymentBadge status={data.paymentStatus} />
      </div>
    </div>
  );
}

export default PaymentResult;
