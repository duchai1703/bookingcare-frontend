# BÁO CÁO ĐỒ ÁN 1 – BOOKINGCARE
# CHƯƠNG 3 – PHÂN TÍCH VÀ THIẾT KẾ (Phần 2: Đặc tả Use Case)

---

## D3.6.5. ĐẶC TẢ USE CASE

### UC01 – Đăng nhập

| Mục | Nội dung |
|-----|---------|
| **Use Case ID** | UC01 |
| **Use Case Name** | Đăng nhập |
| **Description** | Người dùng đăng nhập hệ thống bằng email và mật khẩu |
| **Actor(s)** | AC01 (Guest) |
| **Priority** | Cao |
| **Trigger** | Người dùng truy cập trang đăng nhập (/login) |
| **Pre-condition(s)** | Người dùng đã có tài khoản trong hệ thống |
| **Post-condition(s)** | JWT token được lưu vào Redux store, chuyển hướng theo role |
| **Basic Flow** | 1. Người dùng nhập email và mật khẩu → 2. Hệ thống validate input → 3. Kiểm tra email tồn tại → 4. So sánh mật khẩu bcrypt → 5. Tạo JWT (id, email, roleId, tokenVersion) → 6. Trả token + userInfo → 7. Frontend lưu vào Redux, redirect theo role (R1→/system, R2→/doctor-dashboard, R3→/) |
| **Alternate Flow** | Người dùng chọn "Quên mật khẩu" → chuyển đến UC03 |
| **Exception Flow** | Email không tồn tại → errCode 1; Sai mật khẩu → errCode 2; Rate limit (100 req/15min) → HTTP 429 |
| **Business Rules** | BR02 |
| **NFR** | NFR01 (Bảo mật), NFR02 (Hiệu suất) |

---

### UC02 – Đăng ký bệnh nhân

| Mục | Nội dung |
|-----|---------|
| **Use Case ID** | UC02 |
| **Use Case Name** | Đăng ký tài khoản bệnh nhân |
| **Description** | Người dùng tạo tài khoản mới với vai trò bệnh nhân (R3) |
| **Actor(s)** | AC01 (Guest) |
| **Priority** | Cao |
| **Trigger** | Người dùng click "Đăng ký" tại trang /register |
| **Pre-condition(s)** | Người dùng chưa có tài khoản |
| **Post-condition(s)** | Tài khoản mới được tạo với roleId='R3', chuyển đến trang đăng nhập |
| **Basic Flow** | 1. Nhập email, mật khẩu, xác nhận mật khẩu, họ, tên → 2. Validate input (email format, password ≥ 6 ký tự, confirm match) → 3. Kiểm tra email chưa tồn tại → 4. Hash mật khẩu bcrypt → 5. Tạo User (roleId='R3') → 6. Thông báo thành công, redirect /login |
| **Exception Flow** | Email đã tồn tại → errCode 1; Input không hợp lệ → errCode 2 |
| **Business Rules** | BR01, BR02 |
| **NFR** | NFR01 |

---

### UC06 – Đặt lịch khám

| Mục | Nội dung |
|-----|---------|
| **Use Case ID** | UC06 |
| **Use Case Name** | Đặt lịch khám bệnh |
| **Description** | Bệnh nhân chọn bác sĩ, ngày, khung giờ và đặt lịch khám |
| **Actor(s)** | AC02 (Patient) |
| **Priority** | Cao |
| **Trigger** | Bệnh nhân click "Đặt lịch" trên trang chi tiết bác sĩ |
| **Pre-condition(s)** | Bệnh nhân đã đăng nhập (role R3); Bác sĩ có lịch khám khả dụng |
| **Post-condition(s)** | Booking mới được tạo (S1), email xác nhận được gửi, slot currentNumber tăng 1 |
| **Basic Flow** | 1. BN xem lịch khám bác sĩ → 2. Chọn khung giờ → 3. Hiển thị modal đặt lịch → 4. Nhập thông tin (tên, SĐT, email, giới tính, ngày sinh, địa chỉ, lý do) → 5. Bấm xác nhận → 6. Backend kiểm tra slot chưa đầy → 7. Kiểm tra chưa có booking trùng → 8. Tạo Booking (statusId='S1') → 9. Tăng Schedule.currentNumber → 10. Gửi email xác nhận → 11. Thông báo thành công |
| **Alternate Flow** | Slot đầy (currentNumber ≥ maxNumber) → Thông báo hết chỗ; Đã có booking trùng → Thông báo đã đặt |
| **Exception Flow** | Không tìm thấy schedule → errCode 3; Server lỗi → errCode -1 |
| **Business Rules** | BR03, BR04, BR05, BR09 |
| **NFR** | NFR01, NFR02 |

---

### UC08 – Thanh toán VNPay

| Mục | Nội dung |
|-----|---------|
| **Use Case ID** | UC08 |
| **Use Case Name** | Thanh toán phí khám qua VNPay |
| **Description** | Bệnh nhân thanh toán phí khám bệnh qua cổng VNPay |
| **Actor(s)** | AC02 (Patient), AC05 (VNPay System) |
| **Priority** | Cao |
| **Trigger** | Bệnh nhân xác nhận email → click link thanh toán |
| **Pre-condition(s)** | Booking ở trạng thái S1.5 (chờ thanh toán); paymentStatus='unpaid' |
| **Post-condition(s)** | Thành công: statusId='S2', paymentStatus='paid'; Thất bại: statusId='S4', paymentStatus='failed' |
| **Basic Flow** | 1. BN click link thanh toán từ email → 2. Frontend gọi POST create-payment-url-by-token → 3. Backend tạo VNPay URL (HMAC-SHA512) → 4. Redirect BN đến VNPay → 5. BN chọn phương thức thanh toán → 6. VNPay xử lý → 7. VNPay gửi IPN callback → 8. Backend verify chữ ký (timingSafeEqual) → 9. Cập nhật booking (S2/paid hoặc S4/failed) → 10. VNPay redirect BN về /payment-result → 11. Frontend hiển thị kết quả |
| **Alternate Flow** | Giá 0 đồng → Bypass VNPay, tự động chuyển S2/paid |
| **Exception Flow** | Chữ ký không hợp lệ → RspCode 97; Số tiền không khớp → RspCode 04; Timeout 8s → HTTP 503 |
| **Business Rules** | BR04, BR09, BR11 |
| **NFR** | NFR01, NFR02, NFR04 |

---

### UC12 – Đánh giá bác sĩ

| Mục | Nội dung |
|-----|---------|
| **Use Case ID** | UC12 |
| **Use Case Name** | Đánh giá bác sĩ sau khám |
| **Description** | Bệnh nhân đánh giá bác sĩ bằng rating (1-5 sao) và comment |
| **Actor(s)** | AC02 (Patient) |
| **Priority** | Trung bình |
| **Trigger** | BN click "Đánh giá" trên booking đã hoàn thành (S3) |
| **Pre-condition(s)** | Booking statusId='S3'; Chưa có review cho booking này |
| **Post-condition(s)** | Review mới được tạo, liên kết với booking (UNIQUE bookingId) |
| **Basic Flow** | 1. BN mở lịch sử khám → 2. Click "Đánh giá" trên booking S3 → 3. Modal rating xuất hiện → 4. Chọn sao (1-5) + nhập comment → 5. Bấm gửi → 6. Backend validate: booking S3, chưa review, patientId khớp → 7. Tạo Review → 8. Thông báo thành công |
| **Exception Flow** | Booking không phải S3 → errCode 3; Đã review rồi → errCode 4 |
| **Business Rules** | BR07, BR08 |
| **NFR** | NFR01 |

---

### UC14 – Gửi kết quả khám

| Mục | Nội dung |
|-----|---------|
| **Use Case ID** | UC14 |
| **Use Case Name** | Gửi kết quả khám bệnh |
| **Description** | Bác sĩ upload ảnh kết quả khám và gửi email cho bệnh nhân |
| **Actor(s)** | AC03 (Doctor), AC06 (Email System) |
| **Priority** | Cao |
| **Trigger** | BS click "Gửi kết quả" trên danh sách bệnh nhân |
| **Pre-condition(s)** | Booking statusId='S2' (Đã xác nhận) |
| **Post-condition(s)** | Booking chuyển sang S3 (Hoàn thành), email kết quả gửi cho BN |
| **Basic Flow** | 1. BS chọn BN trong danh sách → 2. Mở RemedyModal → 3. Upload ảnh kết quả (base64) → 4. Bấm gửi → 5. Backend validate image (≤5MB, MIME type) → 6. Cập nhật booking statusId='S3' → 7. Gửi email cho BN kèm file đính kèm → 8. Thông báo thành công |
| **Exception Flow** | File quá lớn (>5MB) → Lỗi; Booking không phải S2 → errCode |
| **Business Rules** | BR04, BR10 |
| **NFR** | NFR01, NFR02 |

---

### UC16 – Dashboard thống kê

| Mục | Nội dung |
|-----|---------|
| **Use Case ID** | UC16 |
| **Use Case Name** | Dashboard thống kê Admin |
| **Description** | Admin xem thống kê tổng quan và biểu đồ trực quan |
| **Actor(s)** | AC04 (Admin) |
| **Priority** | Trung bình |
| **Trigger** | Admin truy cập /system/dashboard |
| **Pre-condition(s)** | Đăng nhập với role R1 |
| **Post-condition(s)** | Hiển thị 4 KPI cards + 4 biểu đồ với dữ liệu theo khoảng thời gian |
| **Basic Flow** | 1. Admin mở Dashboard → 2. Chọn khoảng thời gian (DatePicker) → 3. Frontend gọi 5 API thống kê → 4. Hiển thị: Tổng booking, Tổng bác sĩ, Tổng bệnh nhân, Booking hoàn thành → 5. Hiển thị biểu đồ: Line (theo ngày), Pie (theo trạng thái), Bar (top chuyên khoa), Bar (top bác sĩ) |
| **Business Rules** | — |
| **NFR** | NFR02, NFR03 |

---

### UC17 – Quản lý người dùng

| Mục | Nội dung |
|-----|---------|
| **Use Case ID** | UC17 |
| **Use Case Name** | Quản lý người dùng (CRUD) |
| **Description** | Admin tạo, xem, sửa, xóa tài khoản người dùng |
| **Actor(s)** | AC04 (Admin) |
| **Priority** | Cao |
| **Trigger** | Admin truy cập /system/user-manage |
| **Pre-condition(s)** | Đăng nhập với role R1 |
| **Post-condition(s)** | Dữ liệu User được cập nhật |
| **Basic Flow** | 1. Admin xem danh sách users → 2. Tạo mới: nhập email, password, họ tên, role, giới tính, SĐT, địa chỉ, vị trí, ảnh → 3. Sửa: click edit, cập nhật thông tin → 4. Xóa: click delete, xác nhận SweetAlert2, xóa user |
| **Exception Flow** | Email trùng → errCode 1; User không tồn tại → errCode 2 |
| **Business Rules** | BR01, BR02 |
| **NFR** | NFR01, NFR03 |

---

### UC19 – Quản lý chuyên khoa

| Mục | Nội dung |
|-----|---------|
| **Use Case ID** | UC19 |
| **Use Case Name** | Quản lý chuyên khoa (CRUD) |
| **Description** | Admin tạo, xem, sửa, xóa chuyên khoa y tế |
| **Actor(s)** | AC04 (Admin) |
| **Priority** | Cao |
| **Trigger** | Admin truy cập /system/specialty-manage |
| **Pre-condition(s)** | Đăng nhập với role R1 |
| **Post-condition(s)** | Dữ liệu Specialty được cập nhật |
| **Basic Flow** | 1. Admin xem danh sách chuyên khoa → 2. Tạo mới: nhập tên, upload ảnh, viết mô tả (Markdown editor) → 3. Sửa: click edit, cập nhật → 4. Xóa: click delete, xác nhận |
| **Business Rules** | — |
| **NFR** | NFR01, NFR03 |

---

### UC21 – Quản lý lịch khám (Admin)

| Mục | Nội dung |
|-----|---------|
| **Use Case ID** | UC21 |
| **Use Case Name** | Quản lý lịch khám |
| **Description** | Admin/Doctor tạo lịch khám hàng loạt, sửa, xóa |
| **Actor(s)** | AC04 (Admin), AC03 (Doctor) |
| **Priority** | Cao |
| **Trigger** | Truy cập trang quản lý lịch khám |
| **Pre-condition(s)** | Đăng nhập với role R1 hoặc R2 |
| **Post-condition(s)** | Lịch khám được cập nhật; Doctor chỉ thao tác lịch của mình |
| **Basic Flow** | 1. Chọn bác sĩ (Admin chọn bất kỳ, Doctor mặc định chính mình) → 2. Chọn ngày → 3. Chọn các khung giờ (T1-T8) → 4. Bấm "Tạo lịch" (bulk create) → 5. Xem lịch đã tạo → 6. Sửa maxNumber hoặc xóa slot |
| **Alternate Flow** | Schedule đã tồn tại (duplicate doctorId+date+timeType) → Bỏ qua |
| **Business Rules** | BR05, BR10, BR12 |
| **NFR** | NFR01, NFR02 |
