// src/components/Common/UserFintechCard.jsx
// [RAMP FINTECH DESIGN SYSTEM] Thẻ ATM Điện Tử Đa Dụng (Fintech Virtual Debit Card)
// Mô phỏng thẻ thanh toán vật lý chuẩn EMV Chip & Contactless sang trọng
// Hỗ trợ 2 theme: 'doctor' (Emerald Obsidian / Deep Teal) & 'patient' (Royal Sapphire / Deep Midnight Indigo)

import React, { useState } from 'react';
import { toast } from 'react-toastify';
import {
  CreditCard,
  Lock,
  Unlock,
  Copy,
  Check,
  Eye,
  EyeOff,
  Wifi,
  Sparkles,
  ShieldCheck,
  Building2,
  ExternalLink,
  Coins,
  ArrowUpRight,
  ArrowDownLeft
} from 'lucide-react';
import './UserFintechCard.scss';

const formatCurrencyVND = (amount) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(Number(amount) || 0);
};

export default function UserFintechCard({
  cardType = 'doctor', // 'doctor' | 'patient'
  wallet = {},
  holderName = '',
  holderCode = '',
  linkedBank = null,
  onToggleLock,
  isTogglingLock = false,
  onQuickAction,
  quickActionLabel,
  quickActionIcon: QuickActionIcon = ArrowUpRight
}) {
  const [showFullNumber, setShowFullNumber] = useState(false);
  const [copied, setCopied] = useState(false);

  const isDoctor = cardType === 'doctor';
  const availableBal = Number(wallet?.availableBalance) || 0;
  const reservedBal = Number(wallet?.reservedBalance) || 0;
  const isLocked = wallet?.status === 'LOCKED' || wallet?.status === 'FROZEN';

  // Định dạng mã thẻ ATM: 4 nhóm số dập nổi
  // Prefix 9820 (Thẻ thanh toán y tế BookingCare)
  const walletIdNum = Number(wallet?.id || wallet?.walletId || 1);
  const rawIdStr = String(walletIdNum).padStart(8, '0');
  const part1 = '9820';
  const part2 = rawIdStr.slice(0, 4);
  const part3 = '88' + rawIdStr.slice(4, 6);
  const part4 = rawIdStr.slice(6, 8) + String(walletIdNum).slice(-2).padStart(2, '0');

  const maskedCardNumber = showFullNumber
    ? `${part1}  ${part2}  ${part3}  ${part4}`
    : `${part1}  ••••  ••••  ${part4}`;

  const walletDisplayCode = isDoctor
    ? `WAL-DOC-${String(walletIdNum).padStart(6, '0')}`
    : `WAL-PAT-${String(walletIdNum).padStart(6, '0')}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(walletDisplayCode);
    setCopied(true);
    toast.success(`Đã sao chép mã ví: ${walletDisplayCode}`);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`fintech-card-container ${isDoctor ? 'theme-doctor' : 'theme-patient'}`}>
      {/* ═══════════════════════════════════════════════════════════ */}
      {/* KHỐI TRÁI: THẺ ATM 3D DẬP NỔI                              */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className={`atm-physical-card ${isLocked ? 'is-locked' : ''}`}>
        {/* Lớp nền Hologram & Hạt kim loại */}
        <div className="card-texture-overlay" />
        <div className="card-glass-specular" />

        {/* Dòng 1: Brand & Contactless + Chip */}
        <div className="card-row-top">
          <div className="card-brand-box">
            <div className="brand-symbol">
              <span className="dot dot-1" />
              <span className="dot dot-2" />
            </div>
            <div className="brand-text">
              <span className="brand-title">BookingCare</span>
              <span className="brand-badge">{isDoctor ? 'MEDICAL PAY' : 'CARE PASS'}</span>
            </div>
          </div>

          <div className="card-chip-cluster">
            <Wifi size={18} className="nfc-icon" />
            <div className="emv-gold-chip">
              <div className="chip-line line-1" />
              <div className="chip-line line-2" />
              <div className="chip-line line-3" />
            </div>
          </div>
        </div>

        {/* Dòng 2: Số dư khả dụng & Đơn vị tiền */}
        <div className="card-row-balance">
          <span className="balance-caption">
            {isDoctor ? 'SỐ DƯ THÙ LAO KHẢ DỤNG (RÚT VỀ STK)' : 'SỐ DƯ VÍ KHẢ DỤNG (ĐẶT KHÁM)'}
          </span>
          <div className="balance-num font-mono">
            {formatCurrencyVND(availableBal)}
          </div>
        </div>

        {/* Dòng 3: Số thẻ dập nổi dạng 16 chữ số */}
        <div className="card-row-number">
          <span className="card-digits font-mono">{maskedCardNumber}</span>
          <button
            type="button"
            className="btn-toggle-eye"
            onClick={() => setShowFullNumber(!showFullNumber)}
            title={showFullNumber ? 'Ẩn số thẻ' : 'Hiển thị đầy đủ số thẻ'}
          >
            {showFullNumber ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
        </div>

        {/* Dòng 4: Tên chủ thẻ, Mã ví & Trạng thái */}
        <div className="card-row-bottom">
          <div className="holder-col">
            <span className="meta-caption">CHỦ THẺ THỤ HƯỞNG</span>
            <strong className="holder-name font-mono uppercase">
              {holderName || (isDoctor ? 'BÁC SĨ BOOKINGCARE' : 'BỆNH NHÂN BOOKINGCARE')}
            </strong>
          </div>

          <div className="valid-col">
            <span className="meta-caption">MÃ VÍ</span>
            <div className="code-copy-pill" onClick={handleCopyCode} title="Bấm để sao chép mã ví">
              <span className="font-mono">{walletDisplayCode}</span>
              {copied ? <Check size={11} className="text-emerald" /> : <Copy size={11} />}
            </div>
          </div>

          <div className="status-col">
            <span className={`card-status-badge ${isLocked ? 'locked' : 'active'}`}>
              <span className="pulse-dot" />
              <span>{isLocked ? 'TẠM KHÓA' : 'HOẠT ĐỘNG'}</span>
            </span>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* KHỐI PHẢI: BẢNG CHỈ SỐ KÉT VỐN & THAO TÁC NHANH             */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="atm-meta-dashboard">
        <div className="meta-header">
          <div className="meta-title-group">
            <h4 className="meta-title">
              {isDoctor ? 'Quản Trị Ví Thù Lao & Ngân Quỹ Bác Sĩ' : 'Quản Trị Ví Viện Phí & Quỹ Tiền Khám'}
            </h4>
            <p className="meta-sub">
              {isDoctor
                ? 'Theo dõi số dư thù lao khám bệnh T+0, tiền đang giữ chỗ (Hold Escrow) và lịch sử giải ngân ngân hàng thật.'
                : 'Theo dõi số dư nạp trước qua VNPay, tiền ký quỹ giữ chỗ ca khám và dòng hoàn trả viện phí.'}
            </p>
          </div>

          <div className="meta-actions">
            {onQuickAction && (
              <button
                type="button"
                className="btn-quick-primary"
                onClick={onQuickAction}
              >
                <QuickActionIcon size={14} />
                <span>{quickActionLabel || (isDoctor ? 'Tạo lệnh chi trả' : 'Nạp ví')}</span>
              </button>
            )}

            {onToggleLock && (
              <button
                type="button"
                className={`btn-lock-toggle ${isLocked ? 'unlock' : 'lock'}`}
                onClick={onToggleLock}
                disabled={isTogglingLock}
                title={isLocked ? 'Mở khóa ví cho người dùng' : 'Tạm khóa ví ngăn chặn giao dịch'}
              >
                {isLocked ? <Unlock size={14} /> : <Lock size={14} />}
                <span>{isLocked ? 'Mở khóa ví' : 'Khóa ví'}</span>
              </button>
            )}
          </div>
        </div>

        {/* 3 Thẻ chỉ số két vốn */}
        <div className="meta-kpis-grid">
          <div className="kpi-mini-card">
            <span className="kpi-label">
              {isDoctor ? '1. Thù lao khả dụng' : '1. Số dư ví khả dụng'}
            </span>
            <div className="kpi-val text-emerald font-mono">
              {formatCurrencyVND(availableBal)}
            </div>
            <span className="kpi-desc">
              {isDoctor ? 'Bác sĩ có thể rút về ngân hàng bất kỳ lúc nào' : 'Sẵn sàng dùng để đặt khám 0 giây'}
            </span>
          </div>

          <div className="kpi-mini-card">
            <span className="kpi-label">
              {isDoctor ? '2. Tạm giữ ca chờ khám (Hold)' : '2. Đang ký quỹ Escrow (Hold)'}
            </span>
            <div className="kpi-val text-amber font-mono">
              {formatCurrencyVND(reservedBal)}
            </div>
            <span className="kpi-desc">
              {isDoctor ? 'Tiền giữ chỗ ca khám chưa hoàn tất (Bảo chứng)' : 'Tiền cọc giữ lịch đang khóa chờ khám'}
            </span>
          </div>

          <div className="kpi-mini-card">
            <span className="kpi-label">3. Tài khoản ngân hàng liên kết</span>
            <div className="kpi-bank-info">
              {linkedBank ? (
                <>
                  <div className="bank-name-text">
                    <Building2 size={13} className="text-blue" />
                    <strong>{linkedBank.bankName || 'Ngân hàng thụ hưởng'}</strong>
                  </div>
                  <div className="bank-acc-text font-mono">
                    STK: {linkedBank.accountNumber || '••••••••'} ({linkedBank.accountHolderName || holderName})
                  </div>
                </>
              ) : (
                <span className="text-slate-400 text-xs italic">
                  Chưa liên kết tài khoản ngân hàng thụ hưởng
                </span>
              )}
            </div>
            <span className="kpi-desc">
              {isDoctor ? 'Kênh nhận tiền mặt thật khi giải ngân VCB' : 'STK nhận tiền hoàn khi hủy ca khám'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

