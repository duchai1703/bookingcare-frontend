# BÁO CÁO ĐỒ ÁN 1 – BOOKINGCARE
# CHƯƠNG 3 – PHÂN TÍCH VÀ THIẾT KẾ HỆ THỐNG (Phần 1)

---

## D3.1. KHẢO SÁT HIỆN TRẠNG

**Thực trạng:**
Lĩnh vực đặt lịch khám bệnh tại Việt Nam đang trong giai đoạn chuyển đổi số. Phần lớn các bệnh viện công vẫn sử dụng quy trình đăng ký khám truyền thống (xếp hàng trực tiếp), trong khi một số bệnh viện tư và nền tảng trung gian đã bắt đầu triển khai đặt lịch online.

**Các vấn đề tồn tại:**
- Bệnh nhân phải đến trực tiếp cơ sở y tế để đăng ký, gây lãng phí thời gian và quá tải
- Thông tin bác sĩ, chuyên khoa phân tán trên nhiều nguồn, khó tra cứu và so sánh
- Thanh toán viện phí chủ yếu bằng tiền mặt tại quầy, chưa có nhiều lựa chọn online
- Thiếu hệ thống đánh giá bác sĩ minh bạch để bệnh nhân tham khảo trước khi chọn

**Định hướng giải pháp:**
BookingCare hướng đến xây dựng nền tảng web tập trung, tích hợp tất cả chức năng vào một hệ thống: tìm kiếm bác sĩ/chuyên khoa, đặt lịch online, thanh toán qua VNPay, xác nhận email tự động, đánh giá sau khám, dashboard quản lý cho admin và bác sĩ.

---

## D3.2. CÁC ỨNG DỤNG TƯƠNG TỰ

### 1. BookingCare.vn (nền tảng gốc)
**Ưu điểm:**
- Nền tảng đặt lịch khám hàng đầu Việt Nam, có thương hiệu uy tín
- Danh sách bác sĩ phong phú, thông tin chi tiết
- Hỗ trợ nhiều chuyên khoa và cơ sở y tế

**Nhược điểm:**
- Không tích hợp thanh toán trực tuyến trực tiếp trên nền tảng
- Chưa hỗ trợ đa ngôn ngữ (chỉ tiếng Việt)
- Thiếu dashboard thống kê cho quản trị viên

### 2. Docosan.com
**Ưu điểm:**
- Giao diện hiện đại, hỗ trợ ứng dụng mobile
- Tích hợp thanh toán trực tuyến
- Hỗ trợ telemedicine (khám từ xa)

**Nhược điểm:**
- Chủ yếu tập trung ở TP.HCM, ít phòng khám tại các tỉnh khác
- Chi phí dịch vụ cao cho cả bệnh nhân và phòng khám
- Giao diện quản lý phòng khám phức tạp

### 3. Medpro.vn
**Ưu điểm:**
- Liên kết trực tiếp với nhiều bệnh viện công lớn (Chợ Rẫy, Nhi Đồng)
- Hỗ trợ đặt lịch và thanh toán bảo hiểm y tế
- Quy trình đặt lịch đơn giản

**Nhược điểm:**
- Chỉ hỗ trợ một số bệnh viện hợp tác, không mở rộng cho phòng khám tư
- Giao diện cũ, trải nghiệm người dùng chưa tối ưu
- Không có tính năng đánh giá bác sĩ

---

## D3.3. BẢNG SO SÁNH CÁC ỨNG DỤNG VỚI ĐỀ TÀI

| Tiêu chí | BookingCare.vn | Docosan | Medpro | **BookingCare (Đề tài)** |
|----------|---------------|---------|--------|--------------------------|
| Đặt lịch khám online | ✓ | ✓ | ✓ | ✓ |
| Tìm kiếm bác sĩ theo chuyên khoa | ✓ | ✓ | ✗ | ✓ |
| Thanh toán trực tuyến (VNPay) | ✗ | ✓ | ✓ | ✓ |
| Xác nhận lịch hẹn qua email | ✓ | ✗ | ✗ | ✓ |
| Đánh giá bác sĩ (rating + comment) | ✗ | ✓ | ✗ | ✓ |
| Dashboard thống kê Admin | ✗ | ✗ | ✗ | ✓ |
| Hỗ trợ đa ngôn ngữ (Việt–Anh) | ✗ | ✗ | ✗ | ✓ |
| Gửi kết quả khám qua email | ✗ | ✗ | ✗ | ✓ |
| Portal bệnh nhân (hồ sơ, lịch sử) | ✗ | ✓ | ✓ | ✓ |
| Quên/Đặt lại mật khẩu qua email | ✗ | ✓ | ✗ | ✓ |
| Quản lý lịch khám cho bác sĩ | ✗ | ✓ | ✗ | ✓ |
| Mã nguồn mở | ✗ | ✗ | ✗ | ✓ |

---

## D3.4. NHỮNG VẤN ĐỀ TẬP TRUNG GIẢI QUYẾT

1. **Tự động hóa quy trình đặt lịch:** Bệnh nhân chọn bác sĩ → chọn lịch → xác nhận email → thanh toán → hoàn tất, không cần liên hệ trực tiếp.
2. **Tích hợp thanh toán trực tuyến an toàn:** Tích hợp VNPay với cơ chế bảo mật SHA512 HMAC, idempotency, reconciliation, xử lý concurrent transactions.
3. **Phân quyền và bảo mật:** RBAC với 3 vai trò (Admin/Doctor/Patient), JWT token version revocation, rate limiting, input sanitization.
4. **Minh bạch thông tin y tế:** Hệ thống đánh giá bác sĩ, hiển thị thông tin chi tiết (chuyên khoa, giá khám, lịch rảnh) giúp bệnh nhân đưa ra quyết định.
5. **Quản lý tập trung cho cơ sở y tế:** Dashboard Admin với biểu đồ thống kê, quản lý CRUD đầy đủ cho người dùng/bác sĩ/chuyên khoa/phòng khám/lịch khám.

---

## D3.5. XÁC ĐỊNH YÊU CẦU

### D3.5.1. YÊU CẦU CHỨC NĂNG

| STT | Mã YC | Chức năng | Actor | Mô tả |
|-----|-------|-----------|-------|-------|
| 1 | FR01 | Đăng nhập | Guest | Đăng nhập bằng email/password, nhận JWT token |
| 2 | FR02 | Đăng ký bệnh nhân | Guest | Đăng ký tài khoản mới với role Patient (R3) |
| 3 | FR03 | Quên mật khẩu | Guest | Gửi email chứa link đặt lại mật khẩu (token 15 phút) |
| 4 | FR04 | Đặt lại mật khẩu | Guest | Đặt mật khẩu mới từ link email |
| 5 | FR05 | Xem trang chủ | Guest | Xem banner, chuyên khoa nổi bật, bác sĩ nổi bật, phòng khám |
| 6 | FR06 | Tìm kiếm | Guest | Tìm bác sĩ, chuyên khoa, phòng khám |
| 7 | FR07 | Xem chi tiết bác sĩ | Guest | Xem thông tin, lịch khám, giá, đánh giá bác sĩ |
| 8 | FR08 | Xem chi tiết chuyên khoa | Guest | Xem mô tả chuyên khoa, danh sách bác sĩ |
| 9 | FR09 | Xem chi tiết phòng khám | Guest | Xem mô tả phòng khám, danh sách bác sĩ |
| 10 | FR10 | Xem đánh giá bác sĩ | Guest | Xem rating và comment (phân trang) |
| 11 | FR11 | Đặt lịch khám | Patient | Chọn bác sĩ, ngày, giờ, nhập thông tin bệnh nhân |
| 12 | FR12 | Xác nhận lịch hẹn qua email | Patient | Click link email để xác nhận (token) |
| 13 | FR13 | Thanh toán VNPay | Patient | Thanh toán phí khám qua cổng VNPay |
| 14 | FR14 | Xem kết quả thanh toán | Patient | Hiển thị kết quả sau khi VNPay redirect |
| 15 | FR15 | Quản lý hồ sơ | Patient | Xem/sửa thông tin cá nhân |
| 16 | FR16 | Đổi mật khẩu | Patient | Đổi mật khẩu trong portal |
| 17 | FR17 | Xem lịch sử khám | Patient | Xem danh sách booking, lọc theo trạng thái |
| 18 | FR18 | Hủy lịch hẹn | Patient | Hủy booking chưa khám |
| 19 | FR19 | Đánh giá bác sĩ | Patient | Rating 1-5 sao + comment sau khi khám xong (S3) |
| 20 | FR20 | Xem bệnh nhân | Doctor | Xem danh sách bệnh nhân theo ngày |
| 21 | FR21 | Gửi kết quả khám | Doctor | Upload ảnh kết quả + gửi email cho bệnh nhân |
| 22 | FR22 | Hủy lịch hẹn (BS) | Doctor | Hủy booking bệnh nhân |
| 23 | FR23 | Xem lịch sử bệnh nhân | Doctor | Xem booking history của bệnh nhân |
| 24 | FR24 | Quản lý lịch khám (BS) | Doctor | Tạo/sửa/xóa lịch khám |
| 25 | FR25 | Dashboard thống kê | Admin | Xem 4 KPI + 4 biểu đồ |
| 26 | FR26 | Quản lý người dùng | Admin | CRUD người dùng (Admin/Doctor/Patient) |
| 27 | FR27 | Quản lý bác sĩ | Admin | Thêm/sửa thông tin chi tiết bác sĩ |
| 28 | FR28 | Quản lý chuyên khoa | Admin | CRUD chuyên khoa |
| 29 | FR29 | Quản lý phòng khám | Admin | CRUD phòng khám |
| 30 | FR30 | Quản lý lịch khám (Admin) | Admin | Tạo hàng loạt/sửa/xóa lịch khám |
| 31 | FR31 | Chuyển đổi ngôn ngữ | All | Chuyển Việt ↔ Anh |

### D3.5.2. YÊU CẦU PHI CHỨC NĂNG

| STT | Mã YC | Tên yêu cầu | Mô tả |
|-----|-------|-------------|-------|
| 1 | NFR01 | Bảo mật | Mã hóa mật khẩu bcrypt, JWT authentication, token version revocation, XSS prevention (DOMPurify, sanitize-html), CORS policy, rate limiting (100 req/15 min auth, 10000 req/15 min API) |
| 2 | NFR02 | Hiệu suất | Response time < 2s cho các API thường, connection pool với acquire timeout 5s, database indexing (6 composite indexes) |
| 3 | NFR03 | Dễ sử dụng | Giao diện responsive (Desktop/Tablet/Mobile), hỗ trợ đa ngôn ngữ Việt-Anh, thông báo toast/sweetalert rõ ràng |
| 4 | NFR04 | Khả năng mở rộng | Kiến trúc Client-Server tách biệt, RESTful API versioning (/api/v1/), ORM Sequelize hỗ trợ đổi database engine |
| 5 | NFR05 | Tính tương thích | Hoạt động trên Chrome, Firefox, Safari, Edge; Responsive trên Desktop, Tablet, Mobile |

### D3.5.3. YÊU CẦU NGHIỆP VỤ (Business Rules)

| STT | Mã YC | Mô tả |
|-----|-------|-------|
| 1 | BR01 | Email đăng ký phải là duy nhất trong hệ thống (UNIQUE constraint) |
| 2 | BR02 | Mật khẩu phải tối thiểu 6 ký tự, được mã hóa bcrypt trước khi lưu |
| 3 | BR03 | Mỗi bệnh nhân chỉ được đặt 1 lịch khám cho cùng bác sĩ, cùng ngày, cùng khung giờ (nếu chưa hủy) |
| 4 | BR04 | Booking tuân theo State Machine: S1 (Mới) → S1.5 (Chờ TT) → S2 (Xác nhận) → S3 (Hoàn thành) / S4 (Hủy) |
| 5 | BR05 | Mỗi schedule slot có giới hạn maxNumber = 10 bệnh nhân, khi đầy không cho đặt thêm |
| 6 | BR06 | Token đặt lại mật khẩu chỉ dùng được 1 lần (isUsed flag) và hết hạn sau 15 phút |
| 7 | BR07 | Bệnh nhân chỉ được đánh giá bác sĩ khi booking ở trạng thái S3 (Đã khám xong), mỗi booking chỉ review 1 lần (UNIQUE bookingId) |
| 8 | BR08 | Rating phải nằm trong khoảng 1–5 (validate min:1, max:5) |
| 9 | BR09 | Booking S1/S1.5 chưa thanh toán sẽ tự động hủy (S4) sau 20 phút (cronjob cleanupS1) |
| 10 | BR10 | Doctor chỉ được thao tác lịch khám và bệnh nhân của chính mình (IDOR prevention) |
| 11 | BR11 | Thanh toán VNPay sử dụng chữ ký HMAC-SHA512, kiểm tra timingSafeEqual |
| 12 | BR12 | Mỗi bác sĩ chỉ có 1 slot cho mỗi (date, timeType) — composite unique constraint |

---

## D3.6. MÔ HÌNH HÓA YÊU CẦU

### D3.6.1. LƯỢC ĐỒ USE CASE

> [!IMPORTANT]
> [CẦN VẼ THỦ CÔNG] — Dưới đây là mô tả chi tiết để vẽ Use Case Diagram

**Actors:** Guest, Patient (R3), Doctor (R2), Admin (R1), VNPay System, Email System

**Mô tả sơ đồ:**
- Guest kết nối đến: Xem trang chủ, Tìm kiếm, Xem chi tiết (Bác sĩ/Chuyên khoa/Phòng khám), Đăng nhập, Đăng ký, Quên mật khẩu, Xem đánh giá
- Patient (extends Guest) kết nối đến: Đặt lịch khám, Thanh toán VNPay, Quản lý hồ sơ, Đổi mật khẩu, Xem lịch sử khám, Hủy lịch, Đánh giá bác sĩ
- Doctor kết nối đến: Xem bệnh nhân, Gửi kết quả khám, Hủy lịch, Xem lịch sử BN, Quản lý lịch
- Admin kết nối đến: Dashboard, CRUD Người dùng, CRUD Bác sĩ, CRUD Chuyên khoa, CRUD Phòng khám, CRUD Lịch khám
- VNPay System kết nối đến: Xử lý thanh toán (IPN callback)
- Email System kết nối đến: Gửi email xác nhận, Gửi kết quả khám, Gửi link reset mật khẩu

### D3.6.2. DANH SÁCH CHỨC NĂNG

| STT | Chức năng | Bao gồm | Mô tả |
|-----|-----------|---------|-------|
| 1 | Quản lý xác thực | Đăng nhập, Đăng ký, Quên/Đặt lại mật khẩu, Đăng xuất | Xử lý authentication và account recovery |
| 2 | Tìm kiếm & Khám phá | Tìm kiếm, Xem chuyên khoa, Xem phòng khám, Xem bác sĩ | Giúp bệnh nhân tìm thông tin y tế |
| 3 | Đặt lịch khám | Chọn lịch, Xác nhận email, Thanh toán, Xem kết quả | Toàn bộ flow đặt lịch end-to-end |
| 4 | Quản lý bệnh nhân (Portal) | Hồ sơ, Đổi MK, Lịch sử, Hủy lịch, Đánh giá | Portal cá nhân cho bệnh nhân |
| 5 | Quản lý khám bệnh (BS) | Xem BN, Gửi kết quả, Hủy, Lịch sử BN, Lịch khám | Công cụ cho bác sĩ |
| 6 | Quản trị hệ thống | Dashboard, CRUD Users/Doctors/Specialties/Clinics/Schedules | Công cụ cho admin |

### D3.6.3. DANH SÁCH TÁC NHÂN (Actor)

| STT | Mã Actor | Tên Actor | Mô tả |
|-----|----------|-----------|-------|
| 1 | AC01 | Guest | Người dùng chưa đăng nhập, truy cập trang công khai |
| 2 | AC02 | Patient (R3) | Bệnh nhân đã đăng nhập, đặt lịch và quản lý cá nhân |
| 3 | AC03 | Doctor (R2) | Bác sĩ đã đăng nhập, quản lý bệnh nhân và lịch khám |
| 4 | AC04 | Admin (R1) | Quản trị viên, quản lý toàn bộ hệ thống |
| 5 | AC05 | VNPay System | Hệ thống thanh toán bên ngoài (IPN callback) |
| 6 | AC06 | Email System | Dịch vụ gửi email (Gmail SMTP via Nodemailer) |

### D3.6.4. DANH SÁCH USE CASE

| STT | Mã UC | Tên Use Case | Mã Actor | Mô tả |
|-----|-------|-------------|----------|-------|
| 1 | UC01 | Đăng nhập | AC01 | Người dùng đăng nhập bằng email/password |
| 2 | UC02 | Đăng ký bệnh nhân | AC01 | Đăng ký tài khoản mới role Patient |
| 3 | UC03 | Quên mật khẩu | AC01 | Gửi email link đặt lại mật khẩu |
| 4 | UC04 | Tìm kiếm | AC01 | Tìm bác sĩ/chuyên khoa/phòng khám |
| 5 | UC05 | Xem chi tiết bác sĩ | AC01 | Xem thông tin, lịch, giá, review |
| 6 | UC06 | Đặt lịch khám | AC02 | Đặt lịch hẹn với bác sĩ |
| 7 | UC07 | Xác nhận lịch hẹn email | AC02, AC06 | Xác nhận booking qua link email |
| 8 | UC08 | Thanh toán VNPay | AC02, AC05 | Thanh toán phí khám online |
| 9 | UC09 | Quản lý hồ sơ | AC02 | Xem/sửa thông tin cá nhân |
| 10 | UC10 | Xem lịch sử khám | AC02 | Xem danh sách booking đã đặt |
| 11 | UC11 | Hủy lịch hẹn (BN) | AC02 | Bệnh nhân hủy booking |
| 12 | UC12 | Đánh giá bác sĩ | AC02 | Rating + comment sau khám |
| 13 | UC13 | Xem bệnh nhân | AC03 | BS xem danh sách BN theo ngày |
| 14 | UC14 | Gửi kết quả khám | AC03, AC06 | BS gửi kết quả email cho BN |
| 15 | UC15 | Quản lý lịch khám (BS) | AC03 | BS tạo/sửa/xóa lịch |
| 16 | UC16 | Dashboard thống kê | AC04 | Admin xem KPI và biểu đồ |
| 17 | UC17 | Quản lý người dùng | AC04 | Admin CRUD users |
| 18 | UC18 | Quản lý bác sĩ | AC04 | Admin thêm/sửa info bác sĩ |
| 19 | UC19 | Quản lý chuyên khoa | AC04 | Admin CRUD specialties |
| 20 | UC20 | Quản lý phòng khám | AC04 | Admin CRUD clinics |
| 21 | UC21 | Quản lý lịch khám (Admin) | AC04 | Admin tạo bulk/sửa/xóa schedules |
