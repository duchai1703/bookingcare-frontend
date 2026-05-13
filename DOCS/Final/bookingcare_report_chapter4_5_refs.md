# BÁO CÁO ĐỒ ÁN 1 – BOOKINGCARE
# CHƯƠNG 4, 5 & TÀI LIỆU THAM KHẢO

---

# ═══════════════════════════════════════════════
# CHƯƠNG 4 – TRIỂN KHAI ỨNG DỤNG
# ═══════════════════════════════════════════════

## E4.1. TRIỂN KHAI FRONTEND

> [!NOTE]
> Dựa trên tài liệu Phase 13 của dự án, hệ thống đã chuẩn bị tài liệu Docker hóa nhưng hiện tại đang chạy ở môi trường local development.

**Nền tảng triển khai:** Development Local (Vite Dev Server)

**Giới thiệu:**
Frontend BookingCare được xây dựng bằng React.js với Vite làm build tool. Vite cung cấp tốc độ khởi động cực nhanh nhờ ES modules native và Hot Module Replacement (HMR) tức thì, giúp quá trình phát triển hiệu quả.

**Quy trình triển khai (Development):**
1. Cài đặt Node.js (v18+) và npm
2. Clone repository từ GitHub
3. Chạy `npm install` để cài đặt dependencies
4. Cấu hình file `.env` (VITE_BACKEND_URL, VITE_APP_NAME)
5. Chạy `npm run dev` → Vite Dev Server khởi động trên port 3000
6. Build production: `npm run build` → output vào thư mục `/dist`

**Lợi ích:**
- Hot Module Replacement tức thì, không cần refresh toàn trang
- Build production nhanh và tối ưu (tree-shaking, code splitting)
- Hỗ trợ SCSS, PostCSS, TailwindCSS out-of-the-box

**Hướng triển khai production (tương lai):**
Triển khai lên Vercel hoặc Netlify với CI/CD tự động từ GitHub. Tài liệu Phase 13 đã chuẩn bị cấu hình Docker cho Nginx reverse proxy.

---

## E4.2. TRIỂN KHAI BACKEND

**Nền tảng triển khai:** Development Local (Node.js + Nodemon)

**Giới thiệu:**
Backend BookingCare chạy trên Node.js với Express.js framework. Nodemon được sử dụng trong môi trường development để tự động restart server khi code thay đổi.

**Quy trình triển khai (Development):**
1. Cài đặt Node.js (v18+) và MySQL Server
2. Tạo database `bookingcare` trong MySQL
3. Cấu hình file `.env` (DB_HOST, DB_USERNAME, DB_PASSWORD, DB_NAME, JWT_SECRET, VNPay keys, Email credentials)
4. Chạy `npm install` để cài đặt dependencies
5. Chạy `npm run seed` để seed dữ liệu mẫu (admin, doctors, patients, specialties, clinics, schedules, bookings)
6. Chạy `npm run dev` → Nodemon khởi động server trên port 8080
7. Server tự động: kết nối DB → sync tables (alter: true) → kiểm tra timezone → start listening

**Biến môi trường chính:**
- `PORT=8080` — Port server
- `DB_HOST, DB_USERNAME, DB_PASSWORD, DB_NAME, DB_PORT` — MySQL connection
- `JWT_SECRET` — Secret key cho JWT
- `EMAIL_APP_USERNAME, EMAIL_APP_PASSWORD` — Gmail SMTP credentials
- `VNP_TMN_CODE, VNP_HASH_SECRET, VNP_URL, VNP_RETURN_URL` — VNPay configuration
- `URL_REACT` — Frontend URL cho CORS và email links

**Hướng triển khai production (tương lai):**
Docker container + Nginx reverse proxy + Railway/Render. Tài liệu Phase 13 đã chuẩn bị Dockerfile cho Backend và cấu hình Docker Compose.

---

## E4.3. MÔ TẢ CÁC MÀN HÌNH SAU KHI TRIỂN KHAI

> [!TIP]
> Bạn tự chụp screenshot và chèn ảnh vào báo cáo. Dưới đây là mô tả từng màn hình.

### 1. Trang chủ (/)
Trang chủ hiển thị banner quảng cáo với thanh tìm kiếm ở giữa, bên dưới là 3 section: Chuyên khoa phổ biến (carousel slider hiển thị các chuyên khoa), Bác sĩ nổi bật (carousel hiển thị top bác sĩ với ảnh, tên, chức vụ, chuyên khoa), và Cơ sở y tế (carousel hiển thị phòng khám/bệnh viện). Header chứa logo, menu điều hướng, nút chuyển ngôn ngữ Việt/Anh, và nút đăng nhập.

### 2. Đăng nhập (/login)
Trang đăng nhập với thiết kế clean, chứa form nhập email và mật khẩu, nút đăng nhập, link "Quên mật khẩu?" và link "Đăng ký tài khoản mới". Có icon show/hide password. Sau khi đăng nhập thành công, hệ thống tự động chuyển hướng theo role.

### 3. Đăng ký (/register)
Form đăng ký bệnh nhân gồm các trường: email, mật khẩu, xác nhận mật khẩu, họ, tên. Có link quay lại trang đăng nhập. Validate real-time hiển thị lỗi bên dưới mỗi trường.

### 4. Chi tiết bác sĩ (/doctor/:id)
Trang hiển thị đầy đủ thông tin bác sĩ: ảnh đại diện, tên, chức vụ, mô tả chi tiết (render từ Markdown). Phần lịch khám hiển thị lịch theo ngày (chọn ngày bằng danh sách), các khung giờ khả dụng dạng nút bấm. Thông tin thêm: giá khám, phương thức thanh toán, phòng khám. Phần đánh giá hiển thị rating trung bình và danh sách comment có phân trang.

### 5. Modal đặt lịch
Modal overlay hiển thị form đặt lịch: thông tin bác sĩ đã chọn, khung giờ đã chọn, và form nhập thông tin bệnh nhân (tên, SĐT, email, giới tính, ngày sinh, địa chỉ, lý do khám). Nút xác nhận đặt lịch và nút hủy.

### 6. Xác thực lịch hẹn (/verify-booking)
Trang xác nhận lịch hẹn khi bệnh nhân click link từ email. Hiển thị thông tin booking và trạng thái xác thực (thành công/thất bại). Nếu thành công, hiển thị nút thanh toán VNPay.

### 7. Kết quả thanh toán (/payment-result)
Trang hiển thị kết quả thanh toán sau khi VNPay redirect: thông tin đơn hàng, số tiền, trạng thái thanh toán (thành công/thất bại), mã giao dịch. Có nút quay về trang chủ.

### 8. Dashboard Admin (/system/dashboard)
Dashboard với 4 KPI cards (Tổng lịch hẹn, Tổng bác sĩ, Tổng bệnh nhân, Lịch hẹn hoàn thành) và 4 biểu đồ Recharts: biểu đồ đường (booking theo ngày), biểu đồ tròn (booking theo trạng thái), biểu đồ cột (top chuyên khoa), biểu đồ cột (top bác sĩ). Có DatePicker để chọn khoảng thời gian.

### 9. Quản lý người dùng (/system/user-manage)
Trang quản lý với form tạo/sửa user phía trên (các trường: email, password, họ, tên, SĐT, địa chỉ, giới tính, vai trò, vị trí, ảnh) và bảng danh sách users phía dưới với nút Edit/Delete trên mỗi dòng.

### 10. Quản lý bác sĩ (/system/doctor-manage)
Trang cho phép admin chọn bác sĩ từ dropdown, sau đó nhập/sửa thông tin chi tiết: chuyên khoa, phòng khám, giá khám, tỉnh/thành, hình thức thanh toán, ghi chú, mô tả (Markdown editor hiển thị preview real-time).

### 11. Quản lý lịch khám (/system/schedule-manage)
Trang cho phép chọn bác sĩ, chọn ngày (DatePicker), chọn nhiều khung giờ (T1-T8 dạng checkbox grid), và tạo hàng loạt (bulk create). Phần dưới hiển thị danh sách lịch đã tạo với nút sửa/xóa.

### 12. Quản lý bệnh nhân – Bác sĩ (/doctor-dashboard/manage-patient)
Trang cho bác sĩ xem danh sách bệnh nhân theo ngày (chọn ngày bằng DatePicker). Hiển thị bảng gồm: tên BN, SĐT, giới tính, thời gian, lý do khám, trạng thái, và các nút action (Gửi kết quả/Hủy). Phía trên có KPI cards tóm tắt.

### 13. Portal bệnh nhân – Hồ sơ (/patient/profile)
Trang cho bệnh nhân xem và sửa thông tin cá nhân: email (readonly), họ, tên, SĐT, địa chỉ, giới tính, ảnh đại diện. Có form đổi mật khẩu riêng biệt (mật khẩu cũ, mật khẩu mới, xác nhận).

### 14. Portal bệnh nhân – Lịch sử (/patient/history)
Trang hiển thị danh sách lịch hẹn của bệnh nhân, có thể lọc theo trạng thái (tabs: Tất cả, Mới, Đã xác nhận, Hoàn thành, Đã hủy). Mỗi booking hiển thị: bác sĩ, ngày, giờ, trạng thái, và nút action (Hủy nếu chưa khám, Đánh giá nếu đã hoàn thành).

---

# ═══════════════════════════════════════════════
# CHƯƠNG 5 – KẾT LUẬN
# ═══════════════════════════════════════════════

## F5.1. KẾT QUẢ ĐỒ ÁN

Sau quá trình thực hiện đồ án, nhóm đã xây dựng thành công hệ thống BookingCare – nền tảng đặt lịch khám bệnh trực tuyến hoàn chỉnh với kiến trúc Client-Server hiện đại. Hệ thống bao gồm Frontend React.js (Vite) và Backend Express.js, kết nối cơ sở dữ liệu MySQL thông qua Sequelize ORM.

Hệ thống đã triển khai đầy đủ 31 chức năng chính phân bổ cho 4 nhóm người dùng: Guest (10 chức năng), Bệnh nhân (8 chức năng), Bác sĩ (5 chức năng), và Quản trị viên (8 chức năng). Toàn bộ API tuân theo chuẩn RESTful với versioning `/api/v1/`, có 48 endpoints được bảo vệ bởi middleware xác thực và phân quyền.

Điểm nổi bật của dự án là tích hợp thành công cổng thanh toán VNPay (sandbox) với luồng xử lý phức tạp: tạo URL thanh toán, IPN webhook callback, đối soát giao dịch (querydr), cronjob cleanup booking hết hạn, idempotency handling, và cơ chế chống timing attack (timingSafeEqual). Đây là một trong số ít dự án đồ án sinh viên có tích hợp thanh toán trực tuyến đầy đủ.

Hệ thống bảo mật được thiết kế với nhiều lớp: JWT authentication với token version revocation, bcrypt password hashing, rate limiting (auth: 100 req/15min, API: 10000 req/15min), CORS policy, XSS prevention (DOMPurify + sanitize-html), input validation, URI length guard, query parser protection, và timezone zero-trust boot check.

## F5.2. ƯU ĐIỂM VÀ HẠN CHẾ

### F5.2.1. Ưu điểm

- **Kiến trúc rõ ràng:** Phân tách Frontend/Backend, cấu trúc MVC (Controllers/Services/Models) giúp code dễ bảo trì và mở rộng.
- **Bảo mật đa lớp:** JWT + tokenVersion, bcrypt, rate limiting, CORS, XSS prevention, input sanitization, timezone lock – đảm bảo an toàn thông tin y tế.
- **Tích hợp thanh toán VNPay hoàn chỉnh:** Xử lý idempotency, IPN webhook, reconciliation, cronjob cleanup – production-ready payment flow.
- **Đa ngôn ngữ (i18n):** Hỗ trợ chuyển đổi Việt–Anh mượt mà bằng react-intl với 2 file translation (vi.json, en.json).
- **Dashboard thống kê trực quan:** 4 KPI cards + 4 loại biểu đồ Recharts giúp admin nắm bắt tình hình hoạt động.
- **Dữ liệu mẫu phong phú:** Seeder tự động tạo 8 chuyên khoa, 6 phòng khám, 10 bác sĩ, 5 bệnh nhân, lịch khám 7 ngày, bookings và reviews mẫu.

### F5.2.2. Hạn chế

- **Chưa triển khai production:** Hệ thống hiện chỉ chạy ở môi trường local development, chưa deploy lên cloud server.
- **Chưa có AI Chatbot:** Thư mục AIChatbot đã tạo nhưng chưa triển khai chức năng tư vấn tự động cho bệnh nhân.
- **Chưa có thông báo real-time:** Thiếu WebSocket/Socket.IO cho push notification khi có lịch hẹn mới hoặc thay đổi.
- **Testing chưa đầy đủ:** Chưa có unit test và integration test tự động, chỉ kiểm thử thủ công.

## F5.3. HƯỚNG PHÁT TRIỂN

- **Tích hợp AI Chatbot:** Xây dựng chatbot AI hỗ trợ bệnh nhân mô tả triệu chứng, gợi ý chuyên khoa và bác sĩ phù hợp.
- **Phát triển ứng dụng mobile:** Xây dựng app React Native hoặc Flutter để mở rộng tiếp cận người dùng di động.
- **Đa cổng thanh toán:** Tích hợp thêm MoMo, ZaloPay, và thẻ quốc tế (Visa/Mastercard).
- **Thông báo real-time:** WebSocket cho push notification lịch hẹn, nhắc lịch khám.
- **Docker & CI/CD:** Container hóa ứng dụng, thiết lập pipeline CI/CD tự động (tài liệu Phase 13 đã sẵn sàng).
- **Tính năng Telemedicine:** Tích hợp video call cho khám bệnh từ xa.

---

# ═══════════════════════════════════════════════
# TÀI LIỆU THAM KHẢO
# ═══════════════════════════════════════════════

[1] Meta Platforms, Inc., "React – A JavaScript library for building user interfaces," Truy cập ngày 13 tháng 5 năm 2026. [Online]. Có sẵn tại: https://react.dev/

[2] OpenJS Foundation, "Express – Fast, unopinionated, minimalist web framework for Node.js," Truy cập ngày 13 tháng 5 năm 2026. [Online]. Có sẵn tại: https://expressjs.com/

[3] Evan You, "Vite – Next Generation Frontend Tooling," Truy cập ngày 13 tháng 5 năm 2026. [Online]. Có sẵn tại: https://vitejs.dev/

[4] Sequelize Contributors, "Sequelize v6 – A promise-based Node.js ORM for SQL databases," Truy cập ngày 13 tháng 5 năm 2026. [Online]. Có sẵn tại: https://sequelize.org/

[5] Oracle Corporation, "MySQL 8.0 Reference Manual," Truy cập ngày 13 tháng 5 năm 2026. [Online]. Có sẵn tại: https://dev.mysql.com/doc/refman/8.0/en/

[6] Auth0 Inc., "JSON Web Tokens (JWT) – Introduction," Truy cập ngày 13 tháng 5 năm 2026. [Online]. Có sẵn tại: https://jwt.io/introduction

[7] VNPay, "Tài liệu tích hợp VNPay Payment Gateway," Truy cập ngày 13 tháng 5 năm 2026. [Online]. Có sẵn tại: https://sandbox.vnpayment.vn/apis/

[8] Redux Team, "Redux Toolkit – The official, opinionated, batteries-included toolset for efficient Redux development," Truy cập ngày 13 tháng 5 năm 2026. [Online]. Có sẵn tại: https://redux-toolkit.js.org/

[9] FormatJS Team, "React Intl – Internationalize your web apps on the client & server," Truy cập ngày 13 tháng 5 năm 2026. [Online]. Có sẵn tại: https://formatjs.io/docs/react-intl/

[10] Recharts Team, "Recharts – A composable charting library built on React components," Truy cập ngày 13 tháng 5 năm 2026. [Online]. Có sẵn tại: https://recharts.org/

[11] Nodemailer Contributors, "Nodemailer – Send emails from Node.js," Truy cập ngày 13 tháng 5 năm 2026. [Online]. Có sẵn tại: https://nodemailer.com/

[12] React Router Team, "React Router v6 – Declarative Routing for React.js," Truy cập ngày 13 tháng 5 năm 2026. [Online]. Có sẵn tại: https://reactrouter.com/

[13] bcrypt.js Contributors, "bcrypt.js – Optimized bcrypt in JavaScript," Truy cập ngày 13 tháng 5 năm 2026. [Online]. Có sẵn tại: https://github.com/dcodeIO/bcrypt.js

[14] Bootstrap Team, "Bootstrap 5 – The most popular HTML, CSS, and JS library," Truy cập ngày 13 tháng 5 năm 2026. [Online]. Có sẵn tại: https://getbootstrap.com/

[15] Tailwind Labs, "Tailwind CSS – A utility-first CSS framework," Truy cập ngày 13 tháng 5 năm 2026. [Online]. Có sẵn tại: https://tailwindcss.com/
