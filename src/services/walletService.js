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
 * Hiệu chuẩn số dư đầu kỳ Sổ cái kép (Ledger Baseline Re-calibration)
 */
export const recalibrateLedgerBaseline = () => {
  return axiosInstance.post('/api/v1/admin/financial/recalibrate-ledger');
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

// ═══════════════════════════════════════════════════════════════════════
// [Phase 3] WITHDRAWAL FLOW & DOCTOR WALLET APIs
// ═══════════════════════════════════════════════════════════════════════

/**
 * Bệnh nhân gửi yêu cầu rút tiền về tài khoản ngân hàng
 * @param {Object} data { amount: number, patientBankAccountId?: number, bankInfo?: Object, userNote?: string }
 */
export const requestWithdrawal = (data) => {
  return axiosInstance.post('/api/v1/patient/wallet/withdrawal', data);
};

/**
 * Lấy lịch sử yêu cầu rút tiền của bệnh nhân
 * @param {Object} params { page?: number, limit?: number, status?: string }
 */
export const getMyWithdrawalRequests = (params) => {
  return axiosInstance.get('/api/v1/patient/wallet/withdrawals', { params });
};

/**
 * Bệnh nhân hủy yêu cầu rút tiền khi còn PENDING
 * @param {number} id ID của yêu cầu rút tiền
 */
export const cancelMyWithdrawalRequest = (id) => {
  return axiosInstance.post(`/api/v1/patient/wallet/withdrawals/${id}/cancel`);
};

/**
 * Lấy thông tin tổng quan Ví Bác sĩ
 */
export const getDoctorWallet = () => {
  return axiosInstance.get('/api/v1/doctor/wallet');
};

/**
 * Bác sĩ xem sao kê biến động số dư Sổ cái có phân trang & lọc
 * @param {Object} params { page?: number, limit?: number, type?: string }
 */
export const getDoctorWalletTransactions = (params) => {
  return axiosInstance.get('/api/v1/doctor/wallet/transactions', { params });
};

/**
 * Bác sĩ gửi yêu cầu rút tiền từ Ví Bác sĩ
 * @param {Object} data { amount: number, bankInfo?: Object, userNote?: string }
 */
export const requestDoctorWithdrawal = (data) => {
  return axiosInstance.post('/api/v1/doctor/wallet/withdrawal', data);
};

/**
 * Bác sĩ xem lịch sử yêu cầu rút tiền
 * @param {Object} params { page?: number, limit?: number, status?: string }
 */
export const getDoctorWithdrawalRequests = (params) => {
  return axiosInstance.get('/api/v1/doctor/wallet/withdrawals', { params });
};

/**
 * Bác sĩ hủy yêu cầu rút tiền khi còn PENDING
 * @param {string} id Mã yêu cầu rút tiền
 */
export const cancelDoctorWithdrawalRequest = (id) => {
  return axiosInstance.post(`/api/v1/doctor/wallet/withdrawals/${id}/cancel`);
};

/**
 * Admin lấy danh sách yêu cầu rút tiền toàn hệ thống kèm thống kê
 * @param {Object} params { page?: number, limit?: number, status?: string, search?: string, startDate?: string, endDate?: string }
 */
export const getAdminWithdrawalRequests = (params) => {
  return axiosInstance.get('/api/v1/admin/financial/withdrawals', { params });
};

/**
 * Admin phê duyệt chuyển khoản hoặc từ chối yêu cầu rút tiền
 * @param {number} id ID của yêu cầu rút tiền
 * @param {Object} data { action: 'TRANSFER' | 'REJECT', adminNote?: string, bankTransactionRef?: string, receiptImage?: string }
 */
export const processAdminWithdrawal = (id, data) => {
  return axiosInstance.post(`/api/v1/admin/financial/withdrawals/${id}/process`, data);
};

/**
 * Lấy chính sách SLA rút tiền đang active (Public / Patient / Admin)
 */
export const getActiveWithdrawalPolicy = () => {
  return axiosInstance.get('/api/v1/policies/withdrawal-sla');
};

/**
 * Tính toán nhanh hạn chót cam kết dựa trên số tiền rút (Dynamic Preview cho Modal)
 * @param {number} amount 
 */
export const calculateWithdrawalSlaPreview = (amount) => {
  return axiosInstance.get('/api/v1/policies/calculate-sla', { params: { amount } });
};

/**
 * Admin cập nhật chính sách SLA rút tiền linh hoạt (kèm bắt buộc reason để ghi Audit Log)
 * @param {Object} data 
 */
export const updateAdminWithdrawalPolicy = (data) => {
  return axiosInstance.put('/api/v1/admin/policies-withdrawal-sla', data);
};

/**
 * Admin tra cứu lịch sử các phiên bản chính sách SLA rút tiền
 */
export const getAdminWithdrawalPolicyVersions = () => {
  return axiosInstance.get('/api/v1/admin/policies-withdrawal-sla/versions');
};

/**
 * Admin tra cứu nhật ký kiểm toán chính sách bất biến (Audit Trail)
 * @param {Object} params { policyType?: string, page?: number, limit?: number, startDate?: string, endDate?: string }
 */
export const getAdminPolicyAuditLogs = (params) => {
  return axiosInstance.get('/api/v1/admin/policies-audit-logs', { params });
};

// ═══════════════════════════════════════════════════════════════════════
// [Phase 5] DYNAMIC FINANCIAL CONFIGS & CASH FLOWS
// ═══════════════════════════════════════════════════════════════════════

/**
 * Lấy tham số cấu hình tài chính & vốn bảo chứng sàn
 */
export const getFinancialConfigs = () => {
  return axiosInstance.get('/api/v1/admin/financial/configs');
};

/**
 * Cập nhật cấu hình tham số tài chính & vốn bảo chứng sàn
 * @param {Object} data { platformReserveFund?: number, reserveRatioTarget?: number, minWithdrawalAmount?: number, withdrawalSlaHours?: number }
 */
export const updateFinancialConfigs = (data) => {
  return axiosInstance.put('/api/v1/admin/financial/configs', data);
};

/**
 * Báo cáo chi tiết luồng tiền thu - chi hệ thống
 * @param {Object} params { page?: number, limit?: number, streamType?: 'ALL' | 'INFLOW' | 'OUTFLOW', startDate?: string, endDate?: string }
 */
export const getFinancialCashFlows = (params) => {
  return axiosInstance.get('/api/v1/admin/financial/cash-flows', { params });
};

// ═══════════════════════════════════════════════════════════════════════
// [Phase A] REFUND GOVERNANCE & DOCTOR SETTLEMENTS
// ═══════════════════════════════════════════════════════════════════════

/**
 * Danh sách hồ sơ hoàn tiền (Admin)
 * @param {Object} params { page, limit, status, reason, search }
 */
export const getAdminRefundCases = (params) => {
  return axiosInstance.get('/api/v1/admin/financial/refund-cases', { params });
};

/**
 * Chi tiết hồ sơ hoàn tiền kèm calculationSnapshot (Admin)
 * @param {string|number} id
 */
export const getRefundCaseDetail = (id) => {
  return axiosInstance.get(`/api/v1/admin/financial/refund-cases/${id}`);
};

/**
 * Thẩm định phê duyệt / từ chối hoàn tiền (Admin)
 * @param {string|number} id
 * @param {Object} data { decision: 'APPROVED' | 'REJECTED', adjustedRefundAmount?: number, reviewNote?: string }
 */
export const processAdminReviewRefund = (id, data) => {
  return axiosInstance.post(`/api/v1/admin/financial/refund-cases/${id}/review`, data);
};

/**
 * Bệnh nhân tra cứu chi tiết công thức và lý do hoàn tiền cho ca khám của mình
 * @param {string|number} bookingId
 */
export const getPatientRefundCase = (bookingId) => {
  return axiosInstance.get(`/api/v1/patient/refund-cases/${bookingId}`);
};

/**
 * Bảng kê quyết toán thù lao bác sĩ theo từng ca khám (Admin)
 * @param {Object} params { page, limit, status, doctorId, search, startDate, endDate }
 */
export const getAdminDoctorSettlements = (params) => {
  return axiosInstance.get('/api/v1/admin/financial/doctor-settlements', { params });
};

/**
 * Thực hiện chi trả thù lao vào ví bác sĩ (Admin)
 * @param {Object} data { doctorId, itemIds, payoutMethod, note }
 */
export const payoutDoctorSettlements = (data) => {
  return axiosInstance.post('/api/v1/admin/financial/doctor-settlements/payout', data);
};

/**
 * Quét và mở khóa EARNED -> AVAILABLE sau T+24h (Admin)
 */
export const releaseEligibleDoctorSettlements = () => {
  return axiosInstance.post('/api/v1/admin/financial/doctor-settlements/release-eligible');
};

/**
 * Admin mở khóa sớm thù lao ca khám đơn lẻ (Bypass T+24h)
 * @param {number|string} itemId
 */
export const unlockSingleDoctorSettlement = (itemId) => {
  return axiosInstance.post('/api/v1/admin/financial/doctor-settlements/unlock', { itemId });
};

/**
 * Bảng kê chi tiết thù lao ca khám dành riêng cho Bác sĩ (Doctor Portal)
 * @param {Object} params { page, limit, status, startDate, endDate }
 */
export const getDoctorSettlementStatement = (params) => {
  return axiosInstance.get('/api/v1/doctor/settlement-statement', { params });
};


