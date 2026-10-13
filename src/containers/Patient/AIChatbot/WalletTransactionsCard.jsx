// ═══════════════════════════════════════════════════════════════════════
// [Phase 06E — AI PATIENT ASSISTANT] WalletTransactionsCard.jsx
// Displays Real Wallet Balance and Authoritative Transaction History
// Parity with PatientWallet.jsx
// ═══════════════════════════════════════════════════════════════════════

import React, { memo } from 'react';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  History,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

const WalletTransactionsCard = memo(({ walletTransactions }) => {
  if (!walletTransactions || typeof walletTransactions !== 'object') return null;

  const data = walletTransactions.data || walletTransactions;
  const balance = data.balance !== undefined ? data.balance : (data.summary?.balance || 0);
  const formattedBalance = data.summary?.balanceFormatted || `${Number(balance).toLocaleString('vi-VN')} ₫`;
  const transactions = Array.isArray(data.transactions) ? data.transactions : [];
  const totalCount = data.totalTransactions || transactions.length;

  return (
    <div className="ai-wallet-transactions-card" role="region" aria-label="Lịch sử giao dịch ví BookingCare">
      {/* Header */}
      <div className="wallet-card-header">
        <div className="wallet-header-title">
          <Wallet size={18} className="header-icon" />
          <span>Ví điện tử BookingCare</span>
        </div>
        <div className="wallet-balance-badge">
          <span className="balance-label">Số dư hiện tại:</span>
          <span className="balance-value">{formattedBalance}</span>
        </div>
      </div>

      <div className="wallet-card-body">
        <div className="transactions-list-title">
          <History size={14} />
          <span>Lịch sử giao dịch gần nhất ({totalCount} giao dịch)</span>
        </div>

        {transactions.length === 0 ? (
          <div className="empty-transactions-box">
            <span>Chưa có giao dịch nào được ghi nhận.</span>
          </div>
        ) : (
          <div className="transactions-list">
            {transactions.map((tx, idx) => {
              const isCredit = tx.direction === 'IN' || tx.type === 'REFUND' || tx.type === 'TOPUP';
              return (
                <div key={tx.id || idx} className="transaction-item">
                  <div className={`tx-icon-wrap ${isCredit ? 'credit' : 'debit'}`}>
                    {tx.type === 'REFUND' ? (
                      <RotateCcw size={14} />
                    ) : isCredit ? (
                      <ArrowDownLeft size={14} />
                    ) : (
                      <ArrowUpRight size={14} />
                    )}
                  </div>

                  <div className="tx-info">
                    <div className="tx-type-row">
                      <span className="tx-type-name">{tx.typeLabel || tx.type}</span>
                      <span className={`tx-amount ${isCredit ? 'credit' : 'debit'}`}>
                        {isCredit ? '+' : '-'}{tx.formattedAmount || `${Number(tx.amount).toLocaleString('vi-VN')} ₫`}
                      </span>
                    </div>

                    {tx.description && (
                      <p className="tx-description">{tx.description}</p>
                    )}

                    <div className="tx-meta-row">
                      <span className="tx-time">
                        <Clock size={11} className="inline-icon" />
                        {tx.createdAt ? new Date(tx.createdAt).toLocaleString('vi-VN') : '—'}
                      </span>
                      {tx.balanceAfter !== undefined && (
                        <span className="tx-balance-after">
                          Số dư sau GD: {Number(tx.balanceAfter).toLocaleString('vi-VN')} ₫
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
});

WalletTransactionsCard.displayName = 'WalletTransactionsCard';

export default WalletTransactionsCard;
