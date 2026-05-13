// src/services/paymentService.js
// [Phase 11 — GĐ 11.4] Payment Service — Retry logic + API calls
// Exponential Backoff + Jitter cho 503/409
import axiosInstance from './axiosConfig';

// ═══════════════════════════════════════════════════════════════════════
// callWithRetry — Retry với Exponential Backoff + Jitter
// MAX_RETRY: Số lần thử lại tối đa
// MAX_DELAY_MS: Giới hạn delay tối đa (ms)
// ═══════════════════════════════════════════════════════════════════════
const MAX_RETRY = 5,
  MAX_DELAY_MS = 15000;

export async function callWithRetry(fn, { onRetry, signal } = {}, attempt = 0) {
  try {
    return await fn(signal);
  } catch (err) {
    if (signal?.aborted) throw err;
    if (err.response?.status === 503 && attempt < MAX_RETRY) {
      const hint = parseInt(err.response.headers['retry-after'], 10) || 2;
      const expDelay = Math.min(
        hint * 1000 * Math.pow(2, attempt),
        MAX_DELAY_MS,
      );
      const finalDelay = Math.random() * expDelay;
      if (onRetry) onRetry(attempt + 1, Math.round(finalDelay));
      await new Promise((r) => setTimeout(r, finalDelay));
      return callWithRetry(fn, { onRetry, signal }, attempt + 1);
    }
    if (err.response?.status === 409 && attempt < MAX_RETRY) {
      const w = Math.min(
        err.response.data?.suggestedWaitMs || 3000,
        MAX_DELAY_MS,
      );
      if (onRetry) onRetry(attempt + 1, w);
      await new Promise((r) => setTimeout(r, w));
      return callWithRetry(fn, { onRetry, signal }, attempt + 1);
    }
    throw err;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// createPaymentUrl — Gọi API tạo URL thanh toán VNPay
// Truyền idempotencyKey qua header, signal qua axios config
// ═══════════════════════════════════════════════════════════════════════
export const createPaymentUrl = (data, token, idempotencyKey, signal) => {
  return axiosInstance.post('/api/v1/payment/create-payment-url', data, {
    headers: {
      'x-idempotency-key': idempotencyKey,
    },
    signal,
  });
};
