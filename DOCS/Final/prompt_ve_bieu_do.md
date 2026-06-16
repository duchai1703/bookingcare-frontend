# TÀI LIỆU HƯỚNG DẪN & PROMPT CHUẨN CHỈNH ĐỂ VẼ SEQUENCE VÀ CLASS DIAGRAMS CHO ĐỒ ÁN BOOKINGCARE

Tài liệu này cung cấp một **Prompt chi tiết, đầy đủ ngữ cảnh hệ thống** (System Context) để bạn sao chép và gửi cho các AI (như Gemini, ChatGPT, Claude) nhằm sinh ra mã nguồn biểu đồ dạng **PlantUML** hoặc **Mermaid** một cách chuẩn chỉnh và tối ưu nhất cho đồ án BookingCare.

---

## PHẦN 1: HƯỚNG DẪN SỬ DỤNG
1. **Bước 1**: Mở tệp [prompt_ve_bieu_do.md](file:///d:/1_Hoc_Tap/1_1_Dai_Hoc/Tai_lieu_ki_2_nam_3/duchai1703/bookingcare-frontend/DOCS/Final/prompt_ve_bieu_do.md) hoặc sao chép toàn bộ nội dung trong khung **"PROMPT COPY-PASTE"** ở Phần 2.
2. **Bước 2**: Dán vào AI (Gemini 1.5 Pro / Advanced hoặc ChatGPT-4o / Claude 3.5 Sonnet) để AI sinh mã nguồn biểu đồ.
3. **Bước 3**: Sao chép mã nguồn biểu đồ sinh ra (PlantUML hoặc Mermaid) và dán vào các công cụ hiển thị trực quan:
   - Với **Mermaid**: Dán trực tiếp vào [Mermaid Live Editor](https://mermaid.live).
   - Với **PlantUML**: Dán vào [PlantText](https://www.planttext.com) hoặc [PlantUML Web Server](http://www.plantuml.com/plantuml).

---

## PHẦN 2: NỘI DUNG PROMPT COPY-PASTE (DÙNG CHO AI)

*Hãy sao chép phần văn bản bên dưới đường kẻ này để gửi cho AI:*

---

**Bối cảnh hệ thống đồ án:**
Tôi đang làm đồ án tốt nghiệp/môn học xây dựng ứng dụng đặt lịch khám bệnh trực tuyến **BookingCare** (được clone và phát triển thêm từ bookingcare.vn). Hệ thống được xây dựng trên mô hình Client-Server với các công nghệ:
- **Frontend (Client):** ReactJS (Vite, Redux Toolkit quản lý state, Axios gọi API, React Router).
- **Backend (Server):** NodeJS (Express framework, kiến trúc phân tầng Layered Architecture: Routes -> Middlewares -> Controllers -> Services -> Models).
- **Database:** MySQL, tương tác qua Sequelize ORM (9 bảng quan hệ).
- **External Services:** Cổng thanh toán VNPay (xử lý qua IPN và redirect URL), Email service (Nodemailer gửi mã xác thực, kết quả khám và link reset mật khẩu).

### 1. KIẾN TRÚC VÀ CÁC THÀNH PHẦN CHI TIẾT
- **Frontend (ReactJS):** Gồm các trang/components: `Login`, `Register`, `PatientProfile`, `PatientHistory`, `DoctorDetail`, `VerifyBooking` (Trang xác thực), `DoctorDashboard`, `AdminDashboard` (Dashboard thống kê), `RemedyModal` (Modal gửi hóa đơn/kết quả), `ReviewModal` (Modal đánh giá bác sĩ).
- **Routes / Middlewares:** Định tuyến API `/api/v1/...` và middleware bảo mật như `authMiddleware` (kiểm tra JWT token & tokenVersion để tránh session reuse), `rateLimiter`, `CORS`.
- **Controllers (Backend):** `userController.js`, `doctorController.js`, `patientController.js`, `paymentController.js`, `reviewController.js`, `statisticController.js`, `clinicController.js`, `specialtyController.js`.
- **Services (Backend):** `userService.js`, `doctorService.js`, `patientService.js`, `paymentService.js`, `reviewService.js`, `statisticService.js`, `emailService.js`.
- **Models (Sequelize ORM):**
  1. `User` (id, email, password, firstName, lastName, address, phoneNumber, gender, roleId, image, positionId, tokenVersion)
  2. `Booking` (id, statusId, doctorId, patientId, date, timeType, token, reason, patientName, patientPhoneNumber, patientAddress, patientGender, patientBirthday, paymentToken, paymentStatus, bookingPrice, vnpayTransactionNo, vnp_PayDate)
  3. `Schedule` (id, doctorId, date, timeType, maxNumber, currentNumber) [Composite key: doctorId + date + timeType]
  4. `Doctor_Info` (id, doctorId, specialtyId, clinicId, priceId, provinceId, paymentId, contentHTML, contentMarkdown, description, note, count)
  5. `Specialty` (id, name, image, descriptionHTML, descriptionMarkdown)
  6. `Clinic` (id, name, address, image, descriptionHTML, descriptionMarkdown)
  7. `Allcode` (id, type, keyMap, valueVi, valueEn) - Dùng tra cứu tham chiếu chung.
  8. `Review` (id, doctorId, patientId, bookingId [UNIQUE], rating [1-5], comment)
  9. `Token` (id, tokenHash, userId, type [RESET_PW/VERIFY_EMAIL], isUsed, expiredAt)

---

### YÊU CẦU NHIỆM VỤ:
Bạn hãy đóng vai trò là Kiến trúc sư Phần mềm / Business Analyst (BA) chuyên nghiệp. Dựa trên bối cảnh trên, hãy viết mã nguồn sơ đồ mô tả chi tiết bằng **[CHỌN: PlantUML hoặc Mermaid]** cho các biểu đồ sau đây:

#### Yêu cầu 1: Vẽ Sơ đồ Lớp (Class Diagram) hệ thống Backend
Biểu đồ lớp cần thể hiện rõ cấu trúc phân lớp **Controller - Service - Model** của NodeJS Express, cách chúng liên kết với nhau, cùng các thuộc tính và phương thức chính của từng lớp.
- **Nhóm Controller:** Thể hiện các phương thức nhận request, kiểm tra validation, gọi Service và trả về JSON Response.
- **Nhóm Service:** Chứa Business Logic (ví dụ: `userService.createUser()`, `patientService.postBookAppointment()`, `paymentService.vnpayIPN()`).
- **Nhóm Model:** Các Model Sequelize tương ứng với database ở trên.
- **Thể hiện các mối quan hệ (Relationships):**
  - Dependency / Association từ Controller sang Service (Controller gọi Service).
  - Dependency / Association từ Service sang Model (Service CRUD qua Model).
  - Quan hệ giữa các Model (ví dụ: `User (1) -- (1) Doctor_Info`, `User (1) -- (N) Booking`, `Booking (1) -- (1) Review`, v.v.).

#### Yêu cầu 2: Vẽ các Sơ đồ Tuần tự (Sequence Diagram) cho 5 luồng nghiệp vụ cốt lõi sau:

##### Luồng 1: Xác thực & Đăng nhập (UC01 - Login Flow)
- **Tác nhân:** Patient/Doctor/Admin (User), Frontend UI, AuthMiddleware, UserController, UserService, Model User, Database.
- **Kịch bản:** User nhập email/password -> Client gửi request -> AuthMiddleware (nếu có) -> UserController validate -> UserService tìm User, so sánh bcrypt mật khẩu -> Nếu khớp, tạo JWT Token chứa `tokenVersion` (lấy từ DB) -> Trả về Client -> Client lưu Redux và chuyển hướng theo `roleId` (R1: Admin, R2: Doctor, R3: Patient).

##### Luồng 2: Đặt lịch khám & Xác thực email (UC06 + UC07 - Appointment Booking & Verification Flow)
- **Tác nhân:** Patient (User), Frontend UI, PatientController, PatientService, Booking Model, Schedule Model, EmailService (Nodemailer), Email Server.
- **Kịch bản:**
  1. Patient chọn bác sĩ, ngày, khung giờ -> Frontend gọi API tạo lịch hẹn -> PatientService kiểm tra slot trống (`Schedule.currentNumber < maxNumber`) và kiểm tra lịch trùng -> Tạo Booking trạng thái `S1` (Mới), sinh ngẫu nhiên một `token` -> Tăng `Schedule.currentNumber` thêm 1 -> Gửi email xác thực chứa link `/verify-booking?token=xxx&doctorId=yyy` đến email Patient.
  2. Patient mở email, click link -> Mở trang Verify trên Frontend -> Patient phải bấm nút xác nhận thủ công (chống Bot tự scan link) -> Frontend gửi API verify -> PatientService kiểm tra token hợp lệ, cập nhật trạng thái Booking từ `S1` sang `S1.5` (Chờ thanh toán) -> Trả về phí khám và thông tin để chuyển sang luồng thanh toán.

##### Luồng 3: Tích hợp thanh toán trực tuyến qua VNPay (UC08 - VNPay Payment Integration Flow)
- **Tác nhân:** Patient (User), Frontend UI, PaymentController, PaymentService, VNPay Payment Gateway, Booking Model, Database.
- **Kịch bản:**
  1. Sau khi verify thành công, Patient bấm nút "Thanh toán qua VNPay" -> Frontend gọi API lấy link thanh toán -> PaymentService tạo mã hash HMAC-SHA512 với chữ ký bí mật của VNPay -> Sinh ra URL thanh toán VNPay -> Trả về Client redirect sang trang VNPay.
  2. Patient nhập thông tin thẻ/ứng dụng ngân hàng -> VNPay xử lý -> VNPay gửi IPN Callback ngầm đến Backend (`/api/v1/payment/vnpay-ipn`) -> PaymentController nhận IPN -> PaymentService verify chữ ký bí mật (chống giả mạo), kiểm tra số tiền khớp -> Nếu hợp lệ, cập nhật Booking sang `S2` (Đã xác nhận/Đã thanh toán) và cập nhật `paymentStatus = 'paid'` -> Trả về kết quả cho VNPay.
  3. VNPay redirect Patient về trang `/payment-result` của Frontend -> Frontend hiển thị kết quả thành công/thất bại cho Patient.

##### Luồng 4: Bác sĩ khám và gửi kết quả y tế (UC14 - Send Remedy Result Flow)
- **Tác nhân:** Doctor (User), Frontend UI (RemedyModal), DoctorController, DoctorService, Booking Model, EmailService, Nodemailer, Database.
- **Kịch bản:** Bác sĩ chọn bệnh nhân đã khám trong danh sách -> Mở Modal gửi kết quả -> Upload ảnh hóa đơn/kết quả (Base64) -> Bấm Gửi -> Frontend gửi API -> DoctorController nhận request -> DoctorService kiểm tra trạng thái booking hiện tại phải là `S2` (Đã xác nhận) -> Cập nhật trạng thái Booking sang `S3` (Hoàn thành) -> Gọi EmailService gửi kết quả đính kèm file ảnh kết quả qua email cho bệnh nhân -> Báo thành công về Client.

##### Luồng 5: Bệnh nhân đánh giá bác sĩ sau khi khám (UC12 - Review Doctor Flow)
- **Tác nhân:** Patient (User), Frontend UI (ReviewModal), ReviewController, ReviewService, Review Model, Booking Model, Database.
- **Kịch bản:** Patient mở lịch sử khám -> Tìm booking có trạng thái `S3` (Đã hoàn thành) -> Bấm nút "Đánh giá" -> Hiển thị Modal nhập số sao (1-5) và bình luận -> Bấm gửi -> Frontend gửi API -> ReviewController nhận request -> ReviewService kiểm tra: booking phải ở trạng thái `S3`, chưa từng được đánh giá (đảm bảo tính duy nhất `UNIQUE bookingId`), patientId khớp chủ sở hữu -> Thỏa mãn thì lưu thông tin vào bảng `Reviews` -> Trả về thông báo thành công cho Client.

---

### YÊU CẦU ĐẦU RA (OUTPUT STANDARDS):
1. **Định dạng:** Hãy viết mã nguồn biểu đồ chi tiết (Mermaid hoặc PlantUML). Cần ghi chú rõ cách tổ chức mã nguồn để dễ dàng copy.
2. **Ngôn ngữ trong biểu đồ:** Dùng tiếng Việt cho các nhãn, actor, mô tả tin nhắn/luồng và phương thức để đồng nhất với báo cáo đồ án.
3. **Mức độ chi tiết:**
   - Đối với **Sequence Diagram**: Thể hiện rõ các API endpoints cụ thể (ví dụ: `POST /api/v1/user/login`), các phương thức service (ví dụ: `userService.login()`), và các truy vấn DB cơ bản (ví dụ: `findOne()`, `update()`).
   - Đối với **Class Diagram**: Định nghĩa rõ các kiểu dữ liệu của biến, kiểu trả về của phương thức (ví dụ: `+ login(req, res): Promise<Response>`), và các ký hiệu liên kết UML chuẩn xác (ví dụ: `-->`, `<|--`, `o--`, `*--`).
4. **Trực quan:** Thiết kế biểu đồ khoa học, các đường đi rõ ràng, sử dụng group, alt/else, opt, loop, par thích hợp để xử lý các exception (sai mật khẩu, hết hạn token, lỗi thanh toán...).

---
*(Hết nội dung Prompt sao chép)*
