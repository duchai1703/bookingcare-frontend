// src/services/reviewService.js
// [Phase 9.6] API calls cho Hệ thống Đánh giá — Protected bởi JWT Interceptor
// ⚠️ CỰC KỲ LƯU Ý: BẮT BUỘC export cả 2 hàm (Audit đã trừ điểm vì thiếu export)
import axiosInstance from './axiosConfig';

// ===== SUBMIT REVIEW =====
// Gửi đánh giá bác sĩ sau khi khám xong (statusId === S3, isReviewed === false)
// data = { bookingId, doctorId, rating (1-5), comment }
export const submitReview = (data) => {
  return axiosInstance.post('/api/v1/reviews', data);
};

// ===== GET DOCTOR REVIEWS =====
// [Fix Bug 9.6] Sửa URL khớp backend: /api/v1/doctors/:doctorId/reviews
// Trả về: { errCode, data: { reviews, pagination, averageRating } }
export const getDoctorReviews = (doctorId, page = 1, limit = 5) => {
  return axiosInstance.get(`/api/v1/doctors/${doctorId}/reviews?page=${page}&limit=${limit}`);
};
