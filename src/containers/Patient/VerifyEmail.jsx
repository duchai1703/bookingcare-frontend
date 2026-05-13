// src/containers/Patient/VerifyEmail.jsx
// Trang Xác Nhận Email — SRS 3.10 (REQ-PT-019, 020)
// [NEW LOGIC VNPAY-MAIL]: Lỗi 23 — Anti-Bot: TUYỆT ĐỐI KHÔNG tự gọi API verify
// Bệnh nhân phải BẤM NÚT THỦ CÔNG để xác nhận → tránh Gmail/Zalo Bot scan link
// URL format: /verify-booking?token=xxx&doctorId=yyy

import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { verifyBooking } from '../../redux/slices/doctorSlice';
import { LANGUAGES } from '../../utils/constants';
import axios from 'axios';
import './VerifyEmail.scss';

const VerifyEmail = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const language = useSelector((state) => state.app.language);

  // [NEW LOGIC VNPAY-MAIL]: State Machine mở rộng:
  // 'idle' | 'loading' | 'verified' | 'paying' | 'error'
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  // [NEW LOGIC VNPAY-MAIL]: Dữ liệu trả về từ verify API (bookingPrice, paymentToken)
  const [verifyData, setVerifyData] = useState(null);

  // Lấy token và doctorId từ URL search params
  const params = new URLSearchParams(location.search);
  const token = params.get('token');
  const doctorId = params.get('doctorId');

  // ═══════════════════════════════════════════════════════════
  // [NEW LOGIC VNPAY-MAIL]: Lỗi 23 — Xác nhận THỦ CÔNG bằng nút bấm
  // KHÔNG dùng useEffect gọi API tự động → chống Bot scan email
  // ═══════════════════════════════════════════════════════════
  const handleVerify = async () => {
    if (!token || !doctorId) {
      setStatus('error');
      setMessage(
        language === LANGUAGES.VI
          ? 'Link xác nhận không hợp lệ! Thiếu thông tin token hoặc doctorId.'
          : 'Invalid confirmation link! Missing token or doctorId.'
      );
      return;
    }

    setStatus('loading');
    try {
      const result = await dispatch(verifyBooking({ token, doctorId })).unwrap();

      if (result.errCode === 0) {
        // [NEW LOGIC VNPAY-MAIL]: S1 → S1.5 thành công, hiển thị UI thanh toán
        setStatus('verified');
        setVerifyData(result.data || null);
      } else if (result.errCode === 3) {
        setStatus('error');
        setMessage(
          language === LANGUAGES.VI
            ? 'Link đã hết hạn hoặc lịch hẹn không tồn tại.'
            : 'The link has expired or the appointment does not exist.'
        );
      } else if (result.errCode === 5) {
        setStatus('error');
        setMessage(
          language === LANGUAGES.VI
            ? 'Khung giờ đã đầy! Không thể xác nhận lịch hẹn.'
            : 'Time slot is full! Cannot confirm appointment.'
        );
      } else {
        setStatus('error');
        setMessage(
          language === LANGUAGES.VI
            ? 'Xác nhận thất bại, vui lòng liên hệ hỗ trợ.'
            : 'Confirmation failed, please contact support.'
        );
      }
    } catch (err) {
      setStatus('error');
      setMessage(
        language === LANGUAGES.VI
          ? 'Lỗi kết nối, vui lòng thử lại sau.'
          : 'Connection error, please try again later.'
      );
    }
  };

  // ═══════════════════════════════════════════════════════════
  // [NEW LOGIC VNPAY-MAIL]: Bấm "Thanh toán VNPay"
  // Gọi API createPaymentUrlByToken → redirect sang VNPay
  // ═══════════════════════════════════════════════════════════
  const handlePayVnpay = async () => {
    if (!verifyData?.paymentToken) {
      setStatus('error');
      setMessage(
        language === LANGUAGES.VI
          ? 'Không có thông tin thanh toán! Vui lòng thử lại.'
          : 'No payment information! Please try again.'
      );
      return;
    }

    setStatus('paying');
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/v1/payment/create-payment-url-by-token`,
        { token: verifyData.paymentToken }
      );

      if (response.data.errCode === 0) {
        if (response.data.bypassVnpay) {
          // [NEW LOGIC VNPAY-MAIL]: Lỗi 8 — Giá 0 đồng, redirect về trang kết quả
          window.location.href = response.data.redirectUrl;
        } else {
          // Redirect sang cổng thanh toán VNPay
          window.location.href = response.data.paymentUrl;
        }
      } else {
        setStatus('error');
        setMessage(
          language === LANGUAGES.VI
            ? 'Không thể tạo liên kết thanh toán! Vui lòng thử lại.'
            : 'Cannot create payment link! Please try again.'
        );
      }
    } catch (err) {
      setStatus('error');
      setMessage(
        language === LANGUAGES.VI
          ? 'Lỗi kết nối đến cổng thanh toán, vui lòng thử lại sau.'
          : 'Payment gateway connection error, please try again later.'
      );
    }
  };

  // [NEW LOGIC VNPAY-MAIL]: Format giá tiền
  const formatPrice = (price) => {
    if (!price && price !== 0) return '---';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  // ===== RENDER theo State Machine =====
  return (
    <div className="verify-email" id="verify-email-page">
      <div className="verify-email__container">
        {/* ===== IDLE — Chưa bấm xác nhận (Anti-Bot) ===== */}
        {status === 'idle' && (
          <div className="verify-email__content verify-email__content--idle">
            <div className="verify-email__icon verify-email__icon--idle">
              📧
            </div>
            <h2 className="verify-email__title">
              {language === LANGUAGES.VI
                ? 'Xác nhận Lịch khám và Thanh toán'
                : 'Confirm Appointment & Payment'}
            </h2>
            <p className="verify-email__desc">
              {language === LANGUAGES.VI
                ? 'Vui lòng bấm nút bên dưới để xác nhận lịch hẹn khám bệnh của bạn. Sau khi xác nhận, ghế của bạn sẽ được giữ trong 20 phút để bạn thanh toán.'
                : 'Please click the button below to confirm your appointment. After confirmation, your seat will be held for 20 minutes for payment.'}
            </p>
            {/* [NEW LOGIC VNPAY-MAIL]: Lỗi 23 — NÚT XÁC NHẬN THỦ CÔNG */}
            <button
              className="verify-email__btn verify-email__btn--confirm"
              onClick={handleVerify}
              id="verify-confirm-btn"
            >
              {language === LANGUAGES.VI
                ? '✅ Bấm vào đây để Xác nhận Lịch khám và Thanh toán'
                : '✅ Click here to Confirm Appointment & Payment'}
            </button>
          </div>
        )}

        {/* ===== LOADING — Đang xác nhận ===== */}
        {status === 'loading' && (
          <div className="verify-email__content verify-email__content--loading">
            <div className="verify-email__spinner"></div>
            <h2 className="verify-email__title">
              {language === LANGUAGES.VI
                ? 'Đang xác nhận lịch hẹn...'
                : 'Confirming appointment...'}
            </h2>
            <p className="verify-email__desc">
              {language === LANGUAGES.VI
                ? 'Vui lòng chờ trong giây lát.'
                : 'Please wait a moment.'}
            </p>
          </div>
        )}

        {/* ===== VERIFIED — S1.5 thành công, hiện UI thanh toán ===== */}
        {status === 'verified' && (
          <div className="verify-email__content verify-email__content--success">
            <div className="verify-email__icon verify-email__icon--success">
              ✅
            </div>
            <h2 className="verify-email__title verify-email__title--success">
              {language === LANGUAGES.VI
                ? 'Email đã được xác thực thành công!'
                : 'Email verified successfully!'}
            </h2>
            <p className="verify-email__desc">
              {language === LANGUAGES.VI
                ? 'Vui lòng thanh toán phí khám để hoàn tất việc đặt lịch. Ghế của bạn sẽ được giữ trong 20 phút.'
                : 'Please pay the consultation fee to complete your booking. Your seat will be held for 20 minutes.'}
            </p>

            {/* [NEW LOGIC VNPAY-MAIL]: Tóm tắt đơn giá */}
            {verifyData && (
              <div className="verify-email__payment-summary">
                <div className="verify-email__price-row">
                  <span>{language === LANGUAGES.VI ? 'Phí khám:' : 'Consultation fee:'}</span>
                  <strong>{formatPrice(verifyData.bookingPrice)}</strong>
                </div>
              </div>
            )}

            {/* [NEW LOGIC VNPAY-MAIL]: NÚT THANH TOÁN VNPAY */}
            <button
              className="verify-email__btn verify-email__btn--vnpay"
              onClick={handlePayVnpay}
              id="vnpay-pay-btn"
            >
              {language === LANGUAGES.VI
                ? '💳 Thanh toán bằng VNPay'
                : '💳 Pay with VNPay'}
            </button>
          </div>
        )}

        {/* ===== PAYING — Đang chuyển hướng sang VNPay ===== */}
        {status === 'paying' && (
          <div className="verify-email__content verify-email__content--loading">
            <div className="verify-email__spinner"></div>
            <h2 className="verify-email__title">
              {language === LANGUAGES.VI
                ? 'Đang chuyển hướng sang VNPay...'
                : 'Redirecting to VNPay...'}
            </h2>
          </div>
        )}

        {/* ===== ERROR — Xác nhận thất bại ===== */}
        {status === 'error' && (
          <div className="verify-email__content verify-email__content--error">
            <div className="verify-email__icon verify-email__icon--error">
              ❌
            </div>
            <h2 className="verify-email__title verify-email__title--error">
              {language === LANGUAGES.VI
                ? 'Xác nhận thất bại!'
                : 'Confirmation failed!'}
            </h2>
            <p className="verify-email__desc verify-email__desc--error">
              {message}
            </p>
            <button
              className="verify-email__btn verify-email__btn--home"
              onClick={() => navigate('/')}
            >
              {language === LANGUAGES.VI ? '← Về trang chủ' : '← Go to homepage'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
