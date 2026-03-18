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
  static decodeBase64Image(base64String) {
    if (!base64String) return '';
    // Nếu đã có prefix data:image → trả luôn
    if (base64String.startsWith('data:image')) return base64String;
    // Buffer từ backend → thêm prefix
    return `data:image/jpeg;base64,${base64String}`;
  }
}

export default CommonUtils;
