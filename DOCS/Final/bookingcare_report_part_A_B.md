# BÁO CÁO ĐỒ ÁN 1 – BOOKINGCARE
# PHẦN A & B

---

# ═══════════════════════════════════════════════
# PHẦN A – THÔNG TIN TRANG BÌA & MỞ ĐẦU
# ═══════════════════════════════════════════════

## A1. TÊN ĐỀ TÀI

- **Tên tiếng Việt:** Xây dựng hệ thống đặt lịch khám bệnh trực tuyến BookingCare
- **Tên tiếng Anh:** BookingCare – Online Medical Appointment Booking System

## A2. THÔNG TIN NHÓM

> [!IMPORTANT]
> [CẦN BỔ SUNG THỦ CÔNG] — Thông tin dưới đây cần bạn điền chính xác.

| Mục | Thông tin |
|-----|-----------|
| Tên thành viên 1 | [CẦN BỔ SUNG THỦ CÔNG – Họ tên, MSSV] |
| Tên thành viên 2 | [CẦN BỔ SUNG THỦ CÔNG – Họ tên, MSSV (nếu có)] |
| Giảng viên hướng dẫn | [CẦN BỔ SUNG THỦ CÔNG] |
| Môn học | Đồ án 1 (SE104) |
| Khoa | Công nghệ Phần mềm |
| Trường | Đại học Công nghệ Thông tin – ĐHQG TP.HCM (UIT) |
| Học kỳ | [CẦN BỔ SUNG THỦ CÔNG – VD: Học kỳ 2, năm học 2025–2026] |

## A3. LỜI MỞ ĐẦU

**Đoạn 1 – Lời cảm ơn:**
Lời đầu tiên, nhóm tác giả xin gửi lời cảm ơn chân thành đến Ban Giám hiệu Trường Đại học Công nghệ Thông tin – Đại học Quốc gia Thành phố Hồ Chí Minh (UIT), đặc biệt là Khoa Công nghệ Phần mềm đã tạo điều kiện thuận lợi cho sinh viên thực hiện đồ án. Nhóm xin bày tỏ sự biết ơn sâu sắc đến Thầy/Cô [CẦN BỔ SUNG THỦ CÔNG] – giảng viên hướng dẫn – đã tận tình chỉ dạy, định hướng và góp ý trong suốt quá trình thực hiện đề tài.

**Đoạn 2 – Bối cảnh thực tế:**
Trong bối cảnh chuyển đổi số ngành y tế đang được Chính phủ Việt Nam thúc đẩy mạnh mẽ, việc ứng dụng công nghệ thông tin vào lĩnh vực chăm sóc sức khỏe trở nên vô cùng cấp thiết. Theo thống kê, mỗi năm Việt Nam có hàng trăm triệu lượt khám chữa bệnh, tuy nhiên quy trình đặt lịch khám tại phần lớn các cơ sở y tế vẫn còn thủ công, gây ra tình trạng quá tải, chờ đợi lâu và bất tiện cho người bệnh. Đặc biệt tại các bệnh viện tuyến trên như Chợ Rẫy, Bạch Mai, Việt Đức, tình trạng xếp hàng từ sáng sớm để lấy số thứ tự vẫn diễn ra phổ biến.

**Đoạn 3 – Hạn chế giải pháp hiện có:**
Hiện nay, một số nền tảng đặt lịch khám trực tuyến đã ra đời tại Việt Nam, tuy nhiên phần lớn còn nhiều hạn chế: giao diện chưa thân thiện với đa dạng đối tượng người dùng, thiếu tính năng thanh toán trực tuyến tích hợp, chưa hỗ trợ đa ngôn ngữ, và quy trình xác nhận lịch hẹn chưa được tự động hóa hoàn toàn. Bên cạnh đó, nhiều hệ thống chưa đảm bảo tính bảo mật thông tin y tế của bệnh nhân theo các tiêu chuẩn an toàn thông tin.

**Đoạn 4 – Lý do chọn đề tài:**
Xuất phát từ thực trạng trên, nhóm quyết định thực hiện đề tài "Xây dựng hệ thống đặt lịch khám bệnh trực tuyến BookingCare" nhằm xây dựng một nền tảng web hoàn chỉnh, cho phép bệnh nhân dễ dàng tìm kiếm bác sĩ theo chuyên khoa, đặt lịch hẹn, thanh toán trực tuyến qua VNPay, và quản lý lịch sử khám bệnh. Đồng thời, hệ thống cũng cung cấp các công cụ quản lý toàn diện cho quản trị viên và bác sĩ, hướng tới mục tiêu số hóa quy trình khám chữa bệnh một cách hiệu quả.

---

# ═══════════════════════════════════════════════
# PHẦN B – TÓM TẮT ĐỒ ÁN
# ═══════════════════════════════════════════════

## B1. ĐẶT VẤN ĐỀ

Ngành y tế Việt Nam đang đối mặt với bài toán quá tải tại các cơ sở khám chữa bệnh, đặc biệt ở các bệnh viện tuyến trên. Quy trình đăng ký khám bệnh truyền thống yêu cầu bệnh nhân phải đến trực tiếp xếp hàng, gây lãng phí thời gian và gia tăng nguy cơ lây nhiễm chéo, nhất là trong bối cảnh hậu đại dịch COVID-19.

Mặc dù một số giải pháp đặt lịch khám trực tuyến đã xuất hiện, nhưng phần lớn chưa đáp ứng đầy đủ nhu cầu của người dùng: thiếu tích hợp thanh toán, giao diện phức tạp, không hỗ trợ đa ngôn ngữ, và quy trình xác nhận lịch hẹn chưa được tối ưu.

Đề tài BookingCare ra đời nhằm giải quyết những vấn đề trên bằng cách xây dựng một hệ thống web toàn diện, tích hợp đầy đủ các chức năng từ tìm kiếm bác sĩ, đặt lịch, thanh toán VNPay, đến quản lý phòng khám, chuyên khoa và thống kê dữ liệu.

## B2. VẤN ĐỀ NGHIÊN CỨU

- Làm thế nào để xây dựng quy trình đặt lịch khám bệnh trực tuyến hoàn chỉnh, từ tìm kiếm bác sĩ đến xác nhận lịch hẹn qua email và thanh toán trực tuyến?
- Làm thế nào để thiết kế kiến trúc hệ thống đảm bảo bảo mật thông tin y tế, phân quyền chặt chẽ (Admin, Bác sĩ, Bệnh nhân), và chống các lỗ hổng phổ biến?
- Làm thế nào để tích hợp cổng thanh toán VNPay vào hệ thống đặt lịch với cơ chế idempotency, reconciliation và xử lý đồng thời (concurrency)?
- Làm thế nào để xây dựng giao diện người dùng thân thiện, hỗ trợ đa ngôn ngữ (Tiếng Việt/Tiếng Anh), responsive trên nhiều thiết bị?

## B3. NỘI DUNG TỪNG CHƯƠNG

| Chương | Nội dung |
|--------|----------|
| Chương 1 | Giới thiệu tổng quan về đề tài, lý do chọn đề tài, mục tiêu, phạm vi và công nghệ sử dụng. |
| Chương 2 | Trình bày cơ sở lý thuyết về các công nghệ và framework chính được sử dụng trong dự án. |
| Chương 3 | Phân tích yêu cầu, thiết kế hệ thống bao gồm use case, cơ sở dữ liệu, kiến trúc và giao diện. |
| Chương 4 | Triển khai ứng dụng, mô tả các màn hình chính và quy trình deploy. |
| Chương 5 | Kết luận, đánh giá kết quả đạt được, ưu nhược điểm và hướng phát triển tương lai. |

## B4. KẾT QUẢ ĐẠT ĐƯỢC

- Hoàn thành hệ thống web đặt lịch khám bệnh trực tuyến với đầy đủ 3 vai trò: Quản trị viên (Admin), Bác sĩ (Doctor), Bệnh nhân (Patient).
- Xây dựng 8 chuyên khoa, 6 phòng khám, 10 bác sĩ mẫu với dữ liệu seed đầy đủ.
- Tích hợp cổng thanh toán VNPay (sandbox) với luồng xử lý IPN, idempotency, reconciliation.
- Hệ thống xác thực JWT với token version revocation, rate limiting, CORS, XSS prevention.
- Giao diện responsive, hỗ trợ đa ngôn ngữ Việt–Anh (react-intl).
- Dashboard thống kê cho Admin với biểu đồ Recharts (Line, Pie, Bar chart).
- Portal bệnh nhân: quản lý hồ sơ, lịch sử khám, đánh giá bác sĩ.
- Hệ thống email tự động: xác nhận lịch hẹn, gửi kết quả khám, đặt lại mật khẩu.
