// src/containers/Patient/VerifyEmail.jsx
// Trang Xác Nhận Email — SRS 3.10 (REQ-PT-019, 020)
// [CTO-FIX-3] useRef guard chống React 18 Strict Mode double-invoke
// URL format: /verify-booking?token=xxx&doctorId=yyy

import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { verifyBooking } from '../../redux/slices/doctorSlice';
import { LANGUAGES } from '../../utils/constants';
import './VerifyEmail.scss';

const VerifyEmail = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const language = useSelector((state) => state.app.language);

  // State Machine: 'loading' | 'success' | 'error'
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');

  // ✅ [CTO-FIX-3] Guard chống React 18 Strict Mode double-invoke
  // React 18 Dev mode mount component 2 lần → nếu useEffect([]) gọi API 2 lần
  // → booking bị verify 2 lần → lần 2 trả errCode 3 → hiển thị lỗi dù đã thành công
  const hasCalled = useRef(false);

  useEffect(() => {
    // 1. Lấy token và doctorId từ URL search params
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    const doctorId = params.get('doctorId');

    // ⚠️ NẾU token hoặc doctorId null → hiển thị lỗi ngay, KHÔNG gọi API
    if (!token || !doctorId) {
      setStatus('error');
      setMessage(
        language === LANGUAGES.VI
          ? 'Link xác nhận không hợp lệ! Thiếu thông tin token hoặc doctorId.'
          : 'Invalid confirmation link! Missing token or doctorId.'
      );
      return;
    }

    // ✅ [CTO-FIX-3] BLOCK lần gọi thứ 2 trong Strict Mode Dev
    if (hasCalled.current) return;
    hasCalled.current = true; // ← Đánh dấu đã gọi

    // 2. Gọi API xác nhận: S1 → S2
    const verifyAppointment = async () => {
      setStatus('loading');
      try {
        const result = await dispatch(verifyBooking({ token, doctorId })).unwrap();

        if (result.errCode === 0) {
          // Xác nhận thành công — S1 → S2
          setStatus('success');
        } else if (result.errCode === 3) {
          // Link đã hết hạn hoặc lịch hẹn không tồn tại
          setStatus('error');
          setMessage(
            language === LANGUAGES.VI
              ? 'Link đã hết hạn hoặc lịch hẹn không tồn tại.'
              : 'The link has expired or the appointment does not exist.'
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
        console.error('>>> Error verifying booking:', err);
        setStatus('error');
        setMessage(
          language === LANGUAGES.VI
            ? 'Lỗi kết nối, vui lòng thử lại sau.'
            : 'Connection error, please try again later.'
        );
      }
      // Không cần finally vì status đã được set trong cả 2 nhánh
    };

    verifyAppointment();
  }, []); // ← dependency array rỗng, chỉ chạy 1 lần sau mount

  // ===== RENDER theo State Machine =====
  return (
    <div className="verify-email" id="verify-email-page">
      <div className="verify-email__container">
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

        {/* ===== SUCCESS — Xác nhận thành công ===== */}
        {status === 'success' && (
          <div className="verify-email__content verify-email__content--success">
            <div className="verify-email__icon verify-email__icon--success">
              ✅
            </div>
            <h2 className="verify-email__title verify-email__title--success">
              {language === LANGUAGES.VI
                ? 'Xác nhận lịch hẹn thành công!'
                : 'Appointment confirmed successfully!'}
            </h2>
            <p className="verify-email__desc">
              {language === LANGUAGES.VI
                ? 'Cảm ơn bạn đã xác nhận lịch hẹn khám bệnh. Vui lòng đến đúng giờ hẹn.'
                : 'Thank you for confirming your appointment. Please arrive on time.'}
            </p>
            <button
              className="verify-email__btn verify-email__btn--home"
              onClick={() => navigate('/')}
            >
              {language === LANGUAGES.VI ? '← Về trang chủ' : '← Go to homepage'}
            </button>
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
