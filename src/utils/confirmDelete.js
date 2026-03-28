// src/utils/confirmDelete.js
// Helper nhất quán cho tất cả confirm delete dialogs — GĐ6 Admin
import Swal from 'sweetalert2';

/**
 * Hiển thị modal xác nhận xóa — BookingCare admin style
 * @param {string} itemName   — Tên item cần xóa
 * @param {string} extraText  — Nội dung bổ sung (optional)
 * @returns {Promise<boolean>} — true nếu user nhấn Xóa
 */
export const confirmDelete = async (itemName, extraText = '') => {
  const result = await Swal.fire({
    title: 'Xác nhận xóa?',
    text:
      extraText ||
      `Bạn có chắc muốn xóa "${itemName}"? Hành động này không thể khôi phục.`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#dc3545',
    cancelButtonColor: '#6c757d',
    confirmButtonText: '🗑️ Xóa',
    cancelButtonText: 'Huỷ',
    reverseButtons: true,
  });
  return result.isConfirmed;
};

/**
 * Thông báo thành công với auto-close
 * @param {string} message
 */
export const showSuccess = (message) => {
  return Swal.fire({
    icon: 'success',
    title: 'Thành công!',
    text: message,
    timer: 1800,
    showConfirmButton: false,
  });
};

/**
 * Thông báo lỗi
 * @param {string} message
 */
export const showError = (message) => {
  return Swal.fire({
    icon: 'error',
    title: 'Lỗi!',
    text: message,
  });
};

/**
 * Thông báo warning / validation
 * @param {string} title
 * @param {string} message
 */
export const showWarning = (title, message) => {
  return Swal.fire({
    icon: 'warning',
    title,
    text: message,
  });
};
