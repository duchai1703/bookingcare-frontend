// src/services/walletService.js
// Dịch vụ API Phân hệ Ví điện tử & Sổ cái BookingCare
import axiosInstance from './axiosConfig';

/**
 * Lấy thông tin tổng quan ví bệnh nhân
 */
export const getMyWallet = () => {
  return axiosInstance.get('/api/v1/patient/wallet');
};

/**
 * Tạo liên kết thanh toán VNPay để nạp tiền vào ví
 * @param {Object} data { amount: number, bankCode?: string }
 */
export const createDepositPaymentUrl = (data) => {
  return axiosInstance.post('/api/v1/patient/wallet/deposit', data);
};

/**
 * Lấy lịch sử giao dịch sổ cái ví có phân trang & lọc
 * @param {Object} params { page: number, limit: number, type?: string }
 */
export const getMyWalletTransactions = (params) => {
  return axiosInstance.get('/api/v1/patient/wallet/transactions', { params });
};

/**
 * Xác thực trạng thái nạp tiền sau khi VNPay redirect về
 * @param {Object} params query params từ VNPay
 */
export const verifyVNPayDepositReturn = (params) => {
  return axiosInstance.get('/api/v1/payment/vnpay-wallet-return', { params });
};

// ═══════════════════════════════════════════════════════════════════════
// [Phase 4] ADMIN LIQUIDITY & EXECUTIVE LEDGER CONSOLE APIs
// ═══════════════════════════════════════════════════════════════════════

/**
 * Lấy các chỉ số thanh khoản, nợ phải trả, bảo chứng quỹ và đối soát sổ cái
 * @param {Object} params { reserveRatio?: number }
 */
export const getAdminLiquidityMetrics = (params) => {
  return axiosInstance.get('/api/v1/admin/financial/liquidity-metrics', { params });
};

/**
 * Tra cứu Sổ cái Giao dịch Toàn sàn (Audit Trail & Ledger Explorer)
 * @param {Object} params { page?: number, limit?: number, type?: string, direction?: string, search?: string, startDate?: string, endDate?: string }
 */
export const getAdminWalletTransactions = (params) => {
  return axiosInstance.get('/api/v1/admin/financial/ledger-transactions', { params });
};

/**
 * Lấy danh sách ví người dùng trên toàn hệ thống
 * @param {Object} params { page?: number, limit?: number, status?: string, walletType?: string, search?: string }
 */
export const getAdminWalletsList = (params) => {
  return axiosInstance.get('/api/v1/admin/financial/wallets', { params });
};

/**
 * Khóa hoặc mở khóa ví người dùng
 * @param {number} walletId
 * @param {Object} data { targetStatus: 'ACTIVE' | 'LOCKED' | 'SUSPENDED', adminNote?: string }
 */
export const toggleWalletStatus = (walletId, data) => {
  return axiosInstance.post(`/api/v1/admin/financial/wallets/${walletId}/toggle-status`, data);
};

