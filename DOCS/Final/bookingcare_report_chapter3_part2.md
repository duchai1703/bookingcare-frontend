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

---

### UC03 – Quên mật khẩu

| Mục | Nội dung |
|-----|---------|
| **Use Case ID** | UC03 |
| **Use Case Name** | Quên mật khẩu |
| **Description** | Người dùng yêu cầu gửi email chứa link đặt lại mật khẩu |
| **Actor(s)** | AC01 (Guest), AC06 (Email System) |
| **Priority** | Cao |
| **Trigger** | Người dùng click "Quên mật khẩu?" tại trang /login |
| **Pre-condition(s)** | Người dùng có tài khoản với email đã đăng ký |
| **Post-condition(s)** | Token reset password được tạo (SHA256 hash, hạn 15 phút), email chứa link reset được gửi |
| **Basic Flow** | 1. Người dùng click "Quên mật khẩu?" → 2. Chuyển đến trang /forgot-password → 3. Nhập email đã đăng ký → 4. Bấm "Gửi link đặt lại mật khẩu" → 5. Backend tạo token ngẫu nhiên → 6. Hash token bằng SHA256 lưu vào bảng Tokens (type='RESET_PW', isUsed=false, expiredAt=15 phút) → 7. Gửi email chứa link /reset-password?token=xxx → 8. Frontend hiển thị thông báo "Nếu email tồn tại, bạn sẽ nhận được link đặt lại mật khẩu" |
| **Alternate Flow** | Email không tồn tại → Vẫn hiển thị thông báo thành công (chống enumeration attack) |
| **Exception Flow** | Rate limit vượt quá → HTTP 429; Server lỗi → Toast lỗi hệ thống |
| **Business Rules** | BR06 |
| **NFR** | NFR01 (Bảo mật – chống enumeration), NFR02 |

---

### UC03b – Đặt lại mật khẩu

| Mục | Nội dung |
|-----|---------|
| **Use Case ID** | UC03b |
| **Use Case Name** | Đặt lại mật khẩu từ link email |
| **Description** | Người dùng đặt mật khẩu mới thông qua link reset nhận từ email |
| **Actor(s)** | AC01 (Guest) |
| **Priority** | Cao |
| **Trigger** | Người dùng click link /reset-password?token=xxx từ email |
| **Pre-condition(s)** | Token hợp lệ (chưa hết hạn, isUsed=false) |
| **Post-condition(s)** | Mật khẩu mới được hash bcrypt và lưu; Token đánh dấu isUsed=true; tokenVersion tăng 1 (revoke session cũ) |
| **Basic Flow** | 1. Người dùng click link từ email → 2. Frontend hiển thị trang /reset-password với form nhập mật khẩu mới → 3. Nhập mật khẩu mới (≥ 6 ký tự) + xác nhận mật khẩu → 4. Bấm "Đặt lại mật khẩu" → 5. Backend verify token (SHA256 hash match, chưa hết hạn, isUsed=false) → 6. Hash mật khẩu mới bằng bcrypt → 7. Cập nhật User.password + tăng tokenVersion → 8. Đánh dấu Token.isUsed=true → 9. Thông báo thành công, redirect /login |
| **Exception Flow** | Token hết hạn hoặc đã dùng → Hiển thị "Link đã hết hạn"; Mật khẩu < 6 ký tự → Validate lỗi; Confirm không khớp → Toast lỗi |
| **Business Rules** | BR02, BR06 |
| **NFR** | NFR01 |

---

### UC04 – Tìm kiếm

| Mục | Nội dung |
|-----|---------|
| **Use Case ID** | UC04 |
| **Use Case Name** | Tìm kiếm bác sĩ, chuyên khoa, phòng khám |
| **Description** | Người dùng tìm kiếm tổng hợp trên thanh search tại trang chủ với kết quả phân nhóm |
| **Actor(s)** | AC01 (Guest) |
| **Priority** | Trung bình |
| **Trigger** | Người dùng nhập từ khóa vào thanh search trên Banner trang chủ |
| **Pre-condition(s)** | Không yêu cầu đăng nhập |
| **Post-condition(s)** | Hiển thị dropdown kết quả phân nhóm (Bác sĩ / Chuyên khoa / Phòng khám) |
| **Basic Flow** | 1. Người dùng nhập từ khóa vào ô search (≥ 2 ký tự) → 2. Debounce 300ms → 3. Frontend gọi GET /api/v1/search?keyword=xxx → 4. Backend tìm kiếm LIKE trên bảng Users (role R2), Specialties, Clinics → 5. Trả kết quả phân nhóm { doctors[], specialties[], clinics[] } → 6. Hiển thị dropdown với 3 nhóm (icon + tên) → 7. Người dùng click kết quả → Navigate đến /doctor/:id, /specialty/:id, hoặc /clinic/:id |
| **Alternate Flow** | Từ khóa < 2 ký tự → Đóng dropdown; Không có kết quả → Hiển thị "Không tìm thấy kết quả" |
| **Exception Flow** | API lỗi → Silent fail (không hiển thị lỗi, giữ UX mượt) |
| **Business Rules** | — |
| **NFR** | NFR02 (Hiệu suất – debounce 300ms), NFR03 (Dễ sử dụng) |

---

### UC05 – Xem chi tiết bác sĩ

| Mục | Nội dung |
|-----|---------|
| **Use Case ID** | UC05 |
| **Use Case Name** | Xem chi tiết bác sĩ |
| **Description** | Người dùng xem thông tin chi tiết bác sĩ bao gồm hồ sơ, lịch khám, giá khám và đánh giá |
| **Actor(s)** | AC01 (Guest) |
| **Priority** | Cao |
| **Trigger** | Người dùng truy cập /doctor/:id (từ trang chủ, tìm kiếm, hoặc danh sách chuyên khoa/phòng khám) |
| **Pre-condition(s)** | Bác sĩ tồn tại trong hệ thống với doctorInfoData |
| **Post-condition(s)** | Hiển thị đầy đủ thông tin bác sĩ; Người dùng có thể chọn lịch để đặt khám |
| **Basic Flow** | 1. Frontend gọi GET /api/v1/doctor/detail/:id → 2. Backend trả thông tin User + Doctor_Info (join Specialty, Clinic, Allcode cho price/province/payment/position) → 3. Hiển thị: ảnh đại diện, tên + chức vụ, mô tả ngắn, chuyên khoa, phòng khám → 4. Hiển thị lịch khám theo ngày (component DoctorSchedule) → 5. Hiển thị giá khám (component DoctorExtraInfo) → 6. Hiển thị mô tả chi tiết (contentHTML rendered từ Markdown) → 7. Hiển thị đánh giá (component DoctorReview – rating trung bình + danh sách comment phân trang) |
| **Alternate Flow** | Bác sĩ chưa có lịch khám → Hiển thị thông báo "Chưa có lịch khám"; Bác sĩ chưa có đánh giá → Hiển thị "Chưa có đánh giá" |
| **Exception Flow** | doctorId không tồn tại → Hiển thị trang lỗi / redirect về trang chủ |
| **Business Rules** | — |
| **NFR** | NFR02, NFR03, NFR05 |

---

### UC07 – Xác nhận lịch hẹn email

| Mục | Nội dung |
|-----|---------|
| **Use Case ID** | UC07 |
| **Use Case Name** | Xác nhận lịch hẹn qua email |
| **Description** | Bệnh nhân xác nhận booking bằng cách bấm nút thủ công trên trang xác thực (chống email bot tự scan link) |
| **Actor(s)** | AC02 (Patient), AC06 (Email System) |
| **Priority** | Cao |
| **Trigger** | Bệnh nhân click link /verify-booking?token=xxx&doctorId=yyy từ email xác nhận |
| **Pre-condition(s)** | Booking ở trạng thái S1 (Mới); Token hợp lệ |
| **Post-condition(s)** | Booking chuyển từ S1 → S1.5 (Chờ thanh toán); Hiển thị UI thanh toán VNPay |
| **Basic Flow** | 1. BN click link từ email → 2. Frontend hiển thị trang /verify-booking với trạng thái 'idle' → 3. BN bấm nút "Bấm vào đây để Xác nhận Lịch khám và Thanh toán" (Anti-Bot: KHÔNG tự động gọi API) → 4. Frontend gọi POST /api/v1/doctor/verify-booking { token, doctorId } → 5. Backend kiểm tra token hợp lệ, booking S1, slot chưa đầy → 6. Cập nhật booking S1 → S1.5, tạo paymentToken → 7. Trả về { bookingPrice, paymentToken } → 8. Frontend chuyển sang trạng thái 'verified', hiển thị phí khám + nút "Thanh toán bằng VNPay" → 9. BN bấm thanh toán → chuyển sang UC08 |
| **Alternate Flow** | Slot đầy (currentNumber ≥ maxNumber) → errCode 5, hiển thị "Khung giờ đã đầy"; Booking đã xác nhận rồi → errCode 3 |
| **Exception Flow** | Token không hợp lệ / thiếu → Hiển thị "Link xác nhận không hợp lệ"; Lỗi kết nối → "Lỗi kết nối, vui lòng thử lại sau" |
| **Business Rules** | BR04 (State Machine S1→S1.5), BR05, BR09 (auto-cancel 20 phút nếu không thanh toán) |
| **NFR** | NFR01 (Anti-Bot protection), NFR02 |

---

### UC09 – Quản lý hồ sơ

| Mục | Nội dung |
|-----|---------|
| **Use Case ID** | UC09 |
| **Use Case Name** | Quản lý hồ sơ cá nhân bệnh nhân |
| **Description** | Bệnh nhân xem và cập nhật thông tin cá nhân (họ tên, SĐT, địa chỉ, giới tính, ảnh đại diện) |
| **Actor(s)** | AC02 (Patient) |
| **Priority** | Trung bình |
| **Trigger** | Bệnh nhân truy cập /patient/profile |
| **Pre-condition(s)** | Đăng nhập với role R3 |
| **Post-condition(s)** | Thông tin cá nhân được cập nhật; Redux store đồng bộ (Header hiển thị tên/avatar mới ngay lập tức) |
| **Basic Flow** | 1. BN mở trang Hồ sơ → 2. Frontend gọi GET /api/v1/patient/profile → 3. Hiển thị form với dữ liệu hiện tại (email disabled, các trường khác editable) → 4. BN sửa thông tin (firstName, lastName, phoneNumber, address, gender) → 5. Upload ảnh đại diện mới (FileReader → Base64, ≤ 5MB, accept JPEG/PNG/WebP) → 6. Bấm "Lưu thay đổi" → 7. Frontend gọi PUT /api/v1/patient/profile { firstName, lastName, phoneNumber, address, gender, image } → 8. Backend cập nhật User → 9. Frontend dispatch(updateUserInfo) để đồng bộ Redux → 10. Toast thành công |
| **Alternate Flow** | Ảnh vượt 5MB → Toast lỗi "Ảnh vượt quá 5MB!", reset input file |
| **Exception Flow** | API lỗi → Toast "Cập nhật thất bại, vui lòng thử lại"; Unauthorized 401 → Redirect /login |
| **Business Rules** | — |
| **NFR** | NFR01, NFR03 |

---

### UC09b – Đổi mật khẩu (trong Portal)

| Mục | Nội dung |
|-----|---------|
| **Use Case ID** | UC09b |
| **Use Case Name** | Đổi mật khẩu trong Patient Portal |
| **Description** | Bệnh nhân đổi mật khẩu tài khoản, sau đó bắt buộc đăng nhập lại |
| **Actor(s)** | AC02 (Patient) |
| **Priority** | Trung bình |
| **Trigger** | BN điền form "Đổi mật khẩu" tại trang /patient/profile |
| **Pre-condition(s)** | Đăng nhập với role R3; Biết mật khẩu hiện tại |
| **Post-condition(s)** | Mật khẩu mới được hash bcrypt và lưu; tokenVersion tăng 1; Session hiện tại bị revoke → BẮT BUỘC logout |
| **Basic Flow** | 1. BN nhập mật khẩu hiện tại + mật khẩu mới (≥ 6 ký tự) + xác nhận mật khẩu mới → 2. Frontend validate (không rỗng, ≥ 6 ký tự, confirm khớp) → 3. Gọi PUT /api/v1/patient/change-password { oldPassword, newPassword } → 4. Backend verify mật khẩu cũ (bcrypt compare) → 5. Hash mật khẩu mới + tăng tokenVersion → 6. Trả thành công → 7. Frontend toast "Đổi mật khẩu thành công" → 8. Sau 1.5s: dispatch(processLogout) + persistor.flush() → 9. Navigate /login (replace) |
| **Exception Flow** | Mật khẩu cũ sai → Toast lỗi từ API; Mật khẩu mới < 6 ký tự → Validate lỗi; Confirm không khớp → Toast lỗi |
| **Business Rules** | BR02 |
| **NFR** | NFR01 (Token version revocation) |

---

### UC10 – Xem lịch sử khám

| Mục | Nội dung |
|-----|---------|
| **Use Case ID** | UC10 |
| **Use Case Name** | Xem lịch sử khám bệnh |
| **Description** | Bệnh nhân xem danh sách booking đã đặt, phân loại theo 3 tab trạng thái, có phân trang |
| **Actor(s)** | AC02 (Patient) |
| **Priority** | Trung bình |
| **Trigger** | BN truy cập /patient/history |
| **Pre-condition(s)** | Đăng nhập với role R3 |
| **Post-condition(s)** | Hiển thị danh sách booking theo tab đang chọn |
| **Basic Flow** | 1. BN mở trang Lịch sử khám → 2. Mặc định hiển thị tab "Sắp tới" (status S1,S2) → 3. Frontend gọi GET /api/v1/patient/bookings?status=S1,S2&page=1&limit=5 → 4. Backend trả danh sách bookings kèm include: doctorBookingData (tên BS), timeTypeBooking (khung giờ) → 5. Hiển thị bảng: STT, Bác sĩ, Ngày, Khung giờ, Lý do, Trạng thái, Hành động → 6. BN chuyển tab "Đã khám" (S3) hoặc "Đã hủy" (S4) → Reset page=1, fetch lại → 7. Pagination: Trang trước / Trang sau |
| **Alternate Flow** | Không có booking → Hiển thị empty state với icon 📭 và text "Không có dữ liệu" |
| **Exception Flow** | API lỗi → Hiển thị danh sách rỗng |
| **Business Rules** | BR04 |
| **NFR** | NFR02, NFR03 |

---

### UC11 – Hủy lịch hẹn (BN)

| Mục | Nội dung |
|-----|---------|
| **Use Case ID** | UC11 |
| **Use Case Name** | Hủy lịch hẹn bệnh nhân |
| **Description** | Bệnh nhân hủy booking chưa khám thông qua modal xác nhận |
| **Actor(s)** | AC02 (Patient) |
| **Priority** | Trung bình |
| **Trigger** | BN click nút "Hủy lịch" trên booking ở tab "Sắp tới" (S1 hoặc S2) |
| **Pre-condition(s)** | Booking statusId='S1' hoặc 'S2'; BN là chủ booking (patientId khớp) |
| **Post-condition(s)** | Booking chuyển sang S4 (Đã hủy); Danh sách booking được fetch lại |
| **Basic Flow** | 1. BN click nút "Hủy lịch" trên booking S1/S2 → 2. Mở Modal Confirm ("Bạn có chắc muốn hủy lịch hẹn này?") → 3. BN bấm "Đồng ý" → 4. Frontend gọi PUT /api/v1/patient/cancel-booking/:id → 5. Backend kiểm tra quyền sở hữu (patientId) + trạng thái hợp lệ → 6. Cập nhật statusId='S4' → 7. Toast "Hủy lịch hẹn thành công" → 8. Fetch lại danh sách bookings |
| **Alternate Flow** | BN bấm "Đóng" hoặc click ngoài modal → Đóng modal, không hủy |
| **Exception Flow** | Booking không thuộc BN → API từ chối (IDOR prevention); API lỗi → Toast lỗi hệ thống |
| **Business Rules** | BR04, BR10 |
| **NFR** | NFR01 (IDOR prevention) |

---

### UC13 – Xem bệnh nhân

| Mục | Nội dung |
|-----|---------|
| **Use Case ID** | UC13 |
| **Use Case Name** | Xem danh sách bệnh nhân (Bác sĩ) |
| **Description** | Bác sĩ xem danh sách bệnh nhân đã đặt lịch theo ngày và trạng thái, có thể hủy lịch hoặc gửi kết quả khám |
| **Actor(s)** | AC03 (Doctor) |
| **Priority** | Cao |
| **Trigger** | BS truy cập /doctor-dashboard/manage-patient |
| **Pre-condition(s)** | Đăng nhập với role R2 |
| **Post-condition(s)** | Hiển thị danh sách bệnh nhân theo ngày và trạng thái đã chọn |
| **Basic Flow** | 1. BS mở trang Quản lý bệnh nhân → 2. Mặc định: ngày hôm nay (UTC midnight), trạng thái S2 → 3. Frontend gọi GET /api/v1/doctor/list-patient?doctorId=xxx&date=timestamp&statusId=S2 → 4. Backend trả danh sách bookings (include: patientData, genderBookingData, timeTypeBooking) → 5. Hiển thị bảng: STT, Tên BN, SĐT, Địa chỉ, Giới tính, Khung giờ, Lý do, Hành động → 6. BS chọn ngày khác (DatePicker) hoặc đổi filter trạng thái (ALL/S1/S2/S3/S4) → 7. Tự động fetch lại danh sách |
| **Alternate Flow** | Không có BN → Hiển thị empty state 📭 "Không có bệnh nhân nào"; Trạng thái S3/S4 → Ẩn nút hành động, chỉ hiện badge trạng thái |
| **Exception Flow** | Session expired (401) → Toast lỗi + processLogout; API lỗi → Toast "Tải dữ liệu thất bại" |
| **Business Rules** | BR10 (Doctor chỉ xem BN của mình) |
| **NFR** | NFR01 (IDOR prevention), NFR02 |

---

### UC15 – Quản lý lịch khám (BS)

| Mục | Nội dung |
|-----|---------|
| **Use Case ID** | UC15 |
| **Use Case Name** | Quản lý lịch khám (Bác sĩ) |
| **Description** | Bác sĩ tạo, xem và xóa lịch khám của chính mình |
| **Actor(s)** | AC03 (Doctor) |
| **Priority** | Cao |
| **Trigger** | BS truy cập trang quản lý lịch khám trong Doctor Dashboard |
| **Pre-condition(s)** | Đăng nhập với role R2; doctorId tự động gán = userInfo.id |
| **Post-condition(s)** | Lịch khám của BS được cập nhật; Dropdown chọn BS bị ẨN (chỉ thao tác lịch của mình) |
| **Basic Flow** | 1. BS mở trang Quản lý lịch → 2. DoctorId tự động set = userInfo.id (ẨN dropdown chọn BS) → 3. Chọn ngày (≥ ngày hôm nay) → 4. Hiển thị 8 khung giờ (T1-T8): màu xanh = đã tạo, màu xám = chưa tạo → 5. Click chọn khung giờ mới (hiển thị màu xanh lá) → 6. Bấm "Lưu" → 7. Frontend gọi POST /api/v1/doctor/bulk-create-schedule { arrSchedule } → 8. Backend tạo hàng loạt (bỏ qua duplicate) → 9. Toast "Tạo thành công N khung giờ" → 10. Xem bảng lịch đã tạo (currentNumber/maxNumber progress bar) → 11. Xóa slot: bấm icon Trash → confirmDelete → DELETE /api/v1/doctor/delete-schedule |
| **Alternate Flow** | Schedule đã tồn tại → Bỏ qua (không lỗi); Không chọn khung giờ mới → Warning "Chưa có khung giờ mới" |
| **Exception Flow** | Server lỗi → showError; maxNumber sửa < currentNumber → Warning "Không thể giảm dưới số BN đã đặt" |
| **Business Rules** | BR05, BR10, BR12 |
| **NFR** | NFR01 (Doctor chỉ thao tác lịch của mình), NFR02 |

---

### UC18 – Quản lý bác sĩ

| Mục | Nội dung |
|-----|---------|
| **Use Case ID** | UC18 |
| **Use Case Name** | Quản lý thông tin bác sĩ (Admin) |
| **Description** | Admin thêm hoặc cập nhật hồ sơ chi tiết bác sĩ bao gồm chuyên khoa, phòng khám, giá khám, mô tả Markdown |
| **Actor(s)** | AC04 (Admin) |
| **Priority** | Cao |
| **Trigger** | Admin truy cập /system/doctor-manage |
| **Pre-condition(s)** | Đăng nhập với role R1; Bác sĩ đã tồn tại trong bảng Users (roleId='R2') |
| **Post-condition(s)** | Bảng Doctor_Infos được cập nhật (create hoặc update); Ảnh đại diện lưu base64 |
| **Basic Flow** | 1. Admin chọn bác sĩ từ dropdown (email + họ tên) → 2. Frontend gọi GET /api/v1/doctor/detail/:id → 3. Nếu đã có doctorInfoData → Load dữ liệu vào form + badge "Profile exists" → 4. Admin điền/sửa: chuyên khoa*, phòng khám*, giá khám*, tỉnh/thành, hình thức thanh toán, chức vụ, ghi chú, giới thiệu ngắn → 5. Upload ảnh đại diện (≤ 5MB) → 6. Viết mô tả chi tiết bằng Markdown Editor → 7. Bấm "Lưu" → 8. Frontend parse Markdown → HTML (marked.parse) → 9. Gọi POST /api/v1/doctor/save-info { doctorId, specialtyId, clinicId, priceId, ..., contentMarkdown, contentHTML, image } → 10. Backend upsert Doctor_Info → 11. Toast thành công |
| **Alternate Flow** | Bác sĩ chưa có hồ sơ → Form trống, tạo mới; Admin bấm "Xóa hồ sơ" → confirmDelete → DELETE /api/v1/doctor/delete-info/:id → Xóa Doctor_Info (không xóa User) |
| **Exception Flow** | Thiếu trường bắt buộc (chuyên khoa, phòng khám, giá) → showWarning; Chưa chọn bác sĩ → showWarning; Server lỗi → showError |
| **Business Rules** | — |
| **NFR** | NFR01, NFR03 |

---

### UC20 – Quản lý phòng khám

| Mục | Nội dung |
|-----|---------|
| **Use Case ID** | UC20 |
| **Use Case Name** | Quản lý phòng khám (CRUD) |
| **Description** | Admin tạo, xem, sửa, xóa phòng khám / bệnh viện |
| **Actor(s)** | AC04 (Admin) |
| **Priority** | Cao |
| **Trigger** | Admin truy cập /system/clinic-manage |
| **Pre-condition(s)** | Đăng nhập với role R1 |
| **Post-condition(s)** | Dữ liệu Clinic được cập nhật |
| **Basic Flow** | 1. Admin xem danh sách phòng khám (card view: ảnh, tên, địa chỉ + nút Edit/Delete) → 2. Tạo mới: bấm "Thêm phòng khám" → Mở form → Nhập tên*, địa chỉ*, upload ảnh, viết mô tả (Markdown Editor) → Bấm "Lưu" → Frontend parse Markdown → HTML (marked.parse) → POST /api/v1/clinic/create → 3. Sửa: bấm icon Edit → Load dữ liệu vào form → Sửa thông tin → PUT /api/v1/clinic/edit → 4. Xóa: bấm icon Delete → confirmDelete (SweetAlert2) → DELETE /api/v1/clinic/delete/:id |
| **Exception Flow** | Thiếu tên hoặc địa chỉ → showWarning "Vui lòng nhập đầy đủ thông tin"; Server lỗi → showError |
| **Business Rules** | — |
| **NFR** | NFR01, NFR03 |
