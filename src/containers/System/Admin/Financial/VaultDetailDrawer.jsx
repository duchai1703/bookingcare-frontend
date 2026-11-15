// src/containers/System/Admin/Financial/VaultDetailDrawer.jsx
// [RAMP FINTECH DESIGN SYSTEM] Cửa Sổ Bóc Tách Chi Tiết Khối Vốn (Vault Detail Drawer)
import React from 'react';
import moment from 'moment';
import {
  X,
  Landmark,
  Wallet,
  Lock,
  Coins,
  DollarSign,
  ShieldCheck,
  ArrowRight,
  ExternalLink,
  Copy,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'react-toastify';
import './VaultDetailDrawer.scss';

const formatCurrencyVND = (num) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0);
};

export default function VaultDetailDrawer({ vaultKey, data, onClose, onOpenWithdrawModal }) {
  if (!vaultKey || !data) return null;

  const vaults = data?.vaults;
  const recentTransactions = data?.recentTransactions || [];

  const handleCopyText = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`Đã sao chép ${label || 'nội dung'} vào bộ nhớ tạm!`);
  };

  const renderContent = () => {
    switch (vaultKey) {
      case 'realBank': {
        const item = vaults?.realBank;
        return (
          <>
            <div className="kpi-summary-box">
              <div className="summary-label">Số Dư Tiền Mặt Thực Tế (VCB Công Ty)</div>
              <div className="summary-value" style={{ color: '#1D4ED8' }}>
                {formatCurrencyVND(item?.currentBalance)}
              </div>
              <div className="summary-subtext">
                Ngân hàng: <strong>{item?.bankName}</strong> • STK: <strong>{item?.accountNumber}</strong>
              </div>
            </div>

            <div className="drawer-section-title">
              <span>Bóc tách dòng tiền vào/ra tài khoản</span>
            </div>
            <div className="meta-data-list">
              <div className="meta-data-item">
                <span className="item-label">Tổng nạp tiền vào từ VNPay (Inflow):</span>
                <span className="item-value" style={{ color: '#10B981' }}>
                  +{formatCurrencyVND(item?.totalInflowVNPay)}
                </span>
              </div>
              <div className="meta-data-item">
                <span className="item-label">Tổng chuyển khoản chi trả Bác sĩ (Lệnh UNC):</span>
                <span className="item-value" style={{ color: '#DC2626' }}>
                  -{formatCurrencyVND(item?.doctorPayouts)}
                </span>
              </div>
              {(item?.legacyDoctorPayouts || 0) > 0 && (
                <div className="meta-data-item">
                  <span className="item-label">Đã chuyển khoản Bác sĩ (Đợt đối soát cũ):</span>
                  <span className="item-value" style={{ color: '#DC2626' }}>
                    -{formatCurrencyVND(item?.legacyDoctorPayouts)}
                  </span>
                </div>
              )}
              <div className="meta-data-item">
                <span className="item-label">Tổng chuyển khoản hoàn/rút Bệnh nhân:</span>
                <span className="item-value" style={{ color: '#DC2626' }}>
                  -{formatCurrencyVND(item?.patientPayouts)}
                </span>
              </div>
              <div className="meta-data-item">
                <span className="item-label">Lợi nhuận nền tảng đã kết chuyển / rút:</span>
                <span className="item-value" style={{ color: '#854D0E' }}>
                  -{formatCurrencyVND(item?.adminProfitWithdrawn)}
                </span>
              </div>
              {(item?.floatAllocatedAmount || 0) > 0 && (
                <div className="meta-data-item">
                  <span className="item-label">Vốn nhàn rỗi đang điều chuyển (Float):</span>
                  <span className="item-value" style={{ color: '#4338CA' }}>
                    -{formatCurrencyVND(item?.floatAllocatedAmount)}
                  </span>
                </div>
              )}
              {item?.platformReserveFund > 0 && (
                <div className="meta-data-item">
                  <span className="item-label">Vốn đối ứng bảo chứng sàn:</span>
                  <span className="item-value">
                    +{formatCurrencyVND(item?.platformReserveFund)}
                  </span>
                </div>
              )}
            </div>
          </>
        );
      }

      case 'patientWallets': {
        const item = vaults?.patientWallets;
        return (
          <>
            <div className="kpi-summary-box">
              <div className="summary-label">Tổng Số Dư Ví Ảo Bệnh Nhân</div>
              <div className="summary-value" style={{ color: '#6D28D9' }}>
                {formatCurrencyVND(item?.total)}
              </div>
              <div className="summary-subtext">
                Đang quản lý <strong>{item?.count || 0} tài khoản ví bệnh nhân</strong> trên ứng dụng.
              </div>
            </div>

            <div className="drawer-section-title">
              <span>Phân bổ trạng thái số dư</span>
            </div>
            <div className="meta-data-list">
              <div className="meta-data-item">
                <span className="item-label">Số dư khả dụng (Có thể đặt khám/rút):</span>
                <span className="item-value" style={{ color: '#166534' }}>
                  {formatCurrencyVND(item?.available)}
                </span>
              </div>
              <div className="meta-data-item">
                <span className="item-label">Số dư đóng băng (Đang chờ duyệt rút tiền):</span>
                <span className="item-value" style={{ color: '#991B1B' }}>
                  {formatCurrencyVND(item?.reserved)}
                </span>
              </div>
              <div className="meta-data-item">
                <span className="item-label">Mức độ bảo chứng tiền mặt:</span>
                <span className="item-value" style={{ color: '#166534' }}>
                  100% bằng tiền thật tại VCB
                </span>
              </div>
            </div>
          </>
        );
      }

      case 'escrowPool': {
        const item = vaults?.escrowPool;
        return (
          <>
            <div className="kpi-summary-box">
              <div className="summary-label">Quỹ Tạm Giữ Trung Gian (Escrow Pool)</div>
              <div className="summary-value" style={{ color: '#B45309' }}>
                {formatCurrencyVND(item?.total)}
              </div>
              <div className="summary-subtext">
                Gồm <strong>{item?.activeCount || 0} ca khám</strong> đang giữ chỗ chờ khám ({item?.walletHoldCount ?? 0} ca Ví BN + {item?.directVnpayCount ?? 0} ca VNPay trả trước).
              </div>
            </div>

            <div className="drawer-section-title">
              <span>Cơ cấu nguồn tiền & Bóc tách 2 ngăn</span>
            </div>
            <div className="meta-data-list">
              <div className="meta-data-item">
                <span className="item-label">Nguồn 1 - Ký quỹ từ Ví Bệnh nhân (Wallet Hold):</span>
                <span className="item-value" style={{ color: '#6D28D9' }}>
                  {formatCurrencyVND(item?.walletHoldTotal)} ({item?.walletHoldCount ?? 0} ca)
                </span>
              </div>
              <div className="meta-data-item">
                <span className="item-label">Nguồn 2 - Thanh toán VNPay trực tiếp chờ khám:</span>
                <span className="item-value" style={{ color: '#0369A1' }}>
                  {formatCurrencyVND(item?.directVnpayTotal)} ({item?.directVnpayCount ?? 0} ca)
                </span>
              </div>
              <div className="meta-data-item">
                <span className="item-label">Ngăn 1 - Thù lao Bác sĩ ({item?.doctorSharePercent ?? 85}%):</span>
                <span className="item-value" style={{ color: '#047857' }}>
                  {formatCurrencyVND(item?.doctorShare)} ({item?.doctorSharePercent ?? 85}%)
                </span>
              </div>
              <div className="meta-data-item">
                <span className="item-label">Ngăn 2 - Phí dịch vụ sàn ({item?.platformSharePercent ?? 15}%):</span>
                <span className="item-value" style={{ color: '#854D0E' }}>
                  {formatCurrencyVND(item?.platformShare)} ({item?.platformSharePercent ?? 15}%)
                </span>
              </div>
              <div className="meta-data-item">
                <span className="item-label">Thời điểm giải ngân vào ví Bác sĩ:</span>
                <span className="item-value">Khi hoàn tất khám (S3) & chạy kỳ quyết toán (PAID)</span>
              </div>
            </div>
          </>
        );
      }

      case 'doctorWallets': {
        const item = vaults?.doctorWallets;
        return (
          <>
            <div className="kpi-summary-box">
              <div className="summary-label">Tổng Ví Ảo Bác Sĩ (Thù Lao Nhận Được)</div>
              <div className="summary-value" style={{ color: '#047857' }}>
                {formatCurrencyVND(item?.total)}
              </div>
              <div className="summary-subtext">
                Đang quản lý <strong>{item?.count || 0} ví thù lao bác sĩ</strong>.
              </div>
            </div>

            <div className="drawer-section-title">
              <span>Chi tiết số dư thù lao</span>
            </div>
            <div className="meta-data-list">
              <div className="meta-data-item">
                <span className="item-label">Thù lao khả dụng (Bác sĩ có thể rút):</span>
                <span className="item-value" style={{ color: '#166534' }}>
                  {formatCurrencyVND(item?.available)}
                </span>
              </div>
              <div className="meta-data-item">
                <span className="item-label">Thù lao đang chờ Admin duyệt chuyển khoản:</span>
                <span className="item-value" style={{ color: '#991B1B' }}>
                  {formatCurrencyVND(item?.reserved)}
                </span>
              </div>
              <div className="meta-data-item">
                <span className="item-label">Quy trình rút tiền:</span>
                <span className="item-value">BS tạo lệnh ➔ Admin duyệt & chuyển khoản ngân hàng</span>
              </div>
            </div>
          </>
        );
      }

      case 'platformProfit': {
        const item = vaults?.platformProfit;
        return (
          <>
            <div className="kpi-summary-box">
              <div className="summary-label">Lợi Nhuận Nền Tảng Khả Dụng</div>
              <div className="summary-value" style={{ color: '#854D0E' }}>
                {formatCurrencyVND(item?.spendable)}
              </div>
              <div className="summary-subtext">
                Doanh thu ròng từ phí dịch vụ nền tảng trên các ca khám đã ghi nhận.
              </div>
            </div>

            <div className="drawer-section-title">
              <span>Theo dõi doanh thu & chi dùng</span>
            </div>
            <div className="meta-data-list">
              <div className="meta-data-item">
                <span className="item-label">Tổng hoa hồng sàn tích lũy từ trước đến nay:</span>
                <span className="item-value" style={{ color: '#166534' }}>
                  {formatCurrencyVND(item?.totalEarned)}
                </span>
              </div>
              <div className="meta-data-item">
                <span className="item-label">Số tiền Admin đã rút ra chi dùng:</span>
                <span className="item-value" style={{ color: '#DC2626' }}>
                  -{formatCurrencyVND(item?.withdrawnByAdmin)}
                </span>
              </div>
              <div className="meta-data-item">
                <span className="item-label">Tỷ lệ tiền lời còn lại khả dụng:</span>
                <span className="item-value" style={{ color: '#854D0E' }}>
                  {item?.spendablePercent ?? 100}%
                </span>
              </div>
            </div>
          </>
        );
      }

      default:
        return null;
    }
  };

  const getVaultTitle = () => {
    switch (vaultKey) {
      case 'realBank': return 'Tài Khoản Thật (VCB Công Ty)';
      case 'patientWallets': return 'Tổng Ví Ảo Bệnh Nhân';
      case 'escrowPool': return 'Quỹ Tạm Giữ Trung Gian (Escrow)';
      case 'doctorWallets': return 'Tổng Ví Ảo Bác Sĩ';
      case 'platformProfit': return 'Tiền Lời Công Ty (Platform Profit)';
      default: return 'Chi Tiết Ngăn Tiền';
    }
  };

  const getVaultIcon = () => {
    switch (vaultKey) {
      case 'realBank': return <Landmark size={20} />;
      case 'patientWallets': return <Wallet size={20} />;
      case 'escrowPool': return <Lock size={20} />;
      case 'doctorWallets': return <Coins size={20} />;
      case 'platformProfit': return <DollarSign size={20} />;
      default: return <ShieldCheck size={20} />;
    }
  };

  return (
    <div className="ramp-vault-drawer-overlay" onClick={onClose}>
      <div className="ramp-vault-drawer-panel" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <div className="header-title-box">
            <div className="drawer-icon-box">{getVaultIcon()}</div>
            <div>
              <h3>{getVaultTitle()}</h3>
              <p>Hệ thống sổ cái đối soát bảo chứng tiền mặt 100%</p>
            </div>
          </div>
          <button type="button" className="close-drawer-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="drawer-body">{renderContent()}</div>

        <div className="drawer-footer">
          <button type="button" className="ramp-btn-secondary" onClick={onClose}>
            Đóng
          </button>
          {vaultKey === 'platformProfit' && (
            <button
              type="button"
              className="ramp-btn-primary"
              onClick={() => {
                onClose();
                if (onOpenWithdrawModal) onOpenWithdrawModal();
              }}
            >
              <DollarSign size={14} />
              <span>Rút Tiền Lời Ngay</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

