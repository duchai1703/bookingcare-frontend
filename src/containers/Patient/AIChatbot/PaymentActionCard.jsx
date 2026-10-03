// ═══════════════════════════════════════════════════════════════════════
// [Phase 06D — REAL PAYMENT FLOW] PaymentActionCard.jsx
// Displays Real VNPay Payment Initiation with Authoritative Amount & URL
// STRICT: NO FAKE SUCCESS, links to real VNPay payment gateway
// ═══════════════════════════════════════════════════════════════════════

import React, { memo } from 'react';
import { CreditCard, ExternalLink, Calendar, Clock, Stethoscope, ShieldCheck } from 'lucide-react';

const PaymentActionCard = memo(({ paymentData }) => {
  if (!paymentData || typeof paymentData !== 'object') return null;

  const data = paymentData.data || paymentData;
  const bookingCode = data.bookingCode || `#BK-${data.bookingId}`;
  const amount = Number(data.amount) || Number(data.bookingPrice) || 0;
  const formattedAmount = data.formattedAmount || `${amount.toLocaleString('vi-VN')} VNĐ`;
  const paymentUrl = data.paymentUrl;
  const doctorName = data.doctorName;
  const date = data.date;
  const timeLabel = data.timeLabel;

  return (
    <div className="ai-payment-action-card" role="region" aria-label="Thẻ thanh toán lịch khám">
      <div className="payment-card-header">
        <div className="payment-header-title">
          <CreditCard size={18} className="payment-header-icon" />
          <span>Thanh toán lịch khám VNPay</span>
        </div>
        <span className="payment-badge">{bookingCode}</span>
      </div>

      <div className="payment-card-body">
        {doctorName && (
          <div className="payment-row">
            <Stethoscope size={14} className="row-icon" />
            <span className="row-text">{doctorName}</span>
          </div>
        )}

        {date && (
          <div className="payment-row">
            <Calendar size={14} className="row-icon" />
            <span className="row-text">{date}</span>
            {timeLabel && (
              <span className="time-badge">
                <Clock size={12} />
                {timeLabel}
              </span>
            )}
          </div>
        )}

        <div className="payment-amount-box">
          <span className="amount-label">Số tiền thanh toán:</span>
          <span className="amount-val">{formattedAmount}</span>
        </div>

        <div className="payment-security-note">
          <ShieldCheck size={14} className="shield-icon" />
          <span>Giao dịch được bảo mật an toàn qua Cổng thanh toán Quốc gia VNPay.</span>
        </div>
      </div>

      {paymentUrl && (
        <div className="payment-card-actions">
          <a
            href={paymentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="payment-vnpay-btn"
            title="Mở cổng thanh toán VNPay"
          >
            <span>Thanh toán ngay qua VNPay</span>
            <ExternalLink size={15} />
          </a>
        </div>
      )}
    </div>
  );
});

PaymentActionCard.displayName = 'PaymentActionCard';

export default PaymentActionCard;
