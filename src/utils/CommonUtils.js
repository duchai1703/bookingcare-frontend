// src/utils/CommonUtils.js
// Utility functions dùng chung

class CommonUtils {
  // Chuyển file ảnh thành base64 string — SRS REQ-AM-008
  static getBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  }

  // Decode base64 image để hiển thị (nếu cần)
  // ✅ [FIX-IMAGE] Cải thiện xử lý nhiều format: pure base64, data URI, Buffer object
  static decodeBase64Image(base64String) {
    if (!base64String) return '';
    // Nếu không phải string (Buffer object từ raw query) → không xử lý được
    if (typeof base64String !== 'string') return '';
    // Nếu đã có prefix data:image → trả luôn (trường hợp frontend tự tạo)
    if (base64String.startsWith('data:image')) return base64String;
    // Pure base64 từ backend (sau khi đã fix) → thêm prefix để browser render
    return `data:image/jpeg;base64,${base64String}`;
  }
}

export default CommonUtils;
