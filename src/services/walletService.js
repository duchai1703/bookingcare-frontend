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
