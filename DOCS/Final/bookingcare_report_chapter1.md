# BÁO CÁO ĐỒ ÁN 1 – BOOKINGCARE
# CHƯƠNG 1 – GIỚI THIỆU ĐỀ TÀI

---

## C1.1. LÍ DO CHỌN ĐỀ TÀI

**Bối cảnh và nhu cầu thực tế:**
Trong thời đại chuyển đổi số, ngành y tế Việt Nam đang chứng kiến sự chuyển dịch mạnh mẽ từ mô hình khám chữa bệnh truyền thống sang ứng dụng công nghệ thông tin. Với dân số gần 100 triệu người và nhu cầu khám chữa bệnh ngày càng tăng, áp lực quá tải lên các cơ sở y tế ngày càng lớn. Bệnh nhân phải xếp hàng từ sáng sớm, chờ đợi hàng giờ để được khám, đặc biệt tại các bệnh viện lớn như Chợ Rẫy, Bạch Mai, Việt Đức. Nhu cầu về một nền tảng đặt lịch khám trực tuyến hiện đại, tiện lợi và an toàn trở nên vô cùng cấp thiết.

**Hạn chế của giải pháp hiện tại:**
Mặc dù đã có một số ứng dụng đặt lịch khám bệnh trực tuyến tại Việt Nam, phần lớn còn tồn tại nhiều hạn chế: (1) Giao diện chưa thân thiện, trải nghiệm người dùng chưa tối ưu; (2) Thiếu tích hợp cổng thanh toán trực tuyến, bệnh nhân vẫn phải thanh toán tại quầy; (3) Chưa hỗ trợ đa ngôn ngữ phục vụ người nước ngoài; (4) Hệ thống xác nhận lịch hẹn chưa tự động hóa, dễ xảy ra trùng lịch; (5) Thiếu tính năng đánh giá bác sĩ để bệnh nhân tham khảo.

**Lý do cụ thể nhóm chọn đề tài:**
Từ những phân tích trên, nhóm chọn xây dựng hệ thống BookingCare với mong muốn tạo ra một nền tảng đặt lịch khám bệnh toàn diện, giải quyết triệt để các hạn chế của giải pháp hiện có. Hệ thống được thiết kế với kiến trúc Client-Server hiện đại, tích hợp thanh toán VNPay, hỗ trợ đa ngôn ngữ, xác nhận lịch hẹn qua email tự động, và đảm bảo bảo mật thông tin y tế. Đây cũng là cơ hội để nhóm ứng dụng kiến thức chuyên ngành Công nghệ Phần mềm vào thực tiễn.

---

## C1.2. MỤC TIÊU ĐỀ TÀI

- Xây dựng hệ thống web cho phép bệnh nhân tìm kiếm bác sĩ theo chuyên khoa, phòng khám và đặt lịch khám trực tuyến.
- Tích hợp cổng thanh toán VNPay để bệnh nhân có thể thanh toán phí khám bệnh trực tuyến.
- Xây dựng hệ thống xác nhận lịch hẹn qua email tự động với cơ chế token bảo mật.
- Phát triển trang quản trị (Admin Dashboard) với thống kê dữ liệu trực quan bằng biểu đồ.
- Xây dựng portal bệnh nhân cho phép quản lý hồ sơ cá nhân, xem lịch sử khám và đánh giá bác sĩ.
- Xây dựng trang quản lý cho bác sĩ: xem danh sách bệnh nhân, gửi kết quả khám, quản lý lịch khám.
- Đảm bảo hệ thống bảo mật với JWT authentication, phân quyền RBAC (3 role), rate limiting và XSS prevention.

---

## C1.3. PHẠM VI ĐỀ TÀI

### Nền tảng hỗ trợ
- **Web Application** (Responsive design – tương thích Desktop, Tablet, Mobile)
- Frontend: React.js (Vite) chạy trên port 3000
- Backend: Express.js (Node.js) chạy trên port 8080

### Danh sách chức năng phân loại theo vai trò

#### Vai trò: Khách (Guest – chưa đăng nhập)
| STT | Chức năng |
|-----|-----------|
| 1 | Xem trang chủ (banner, chuyên khoa nổi bật, bác sĩ nổi bật, cơ sở y tế) |
| 2 | Tìm kiếm bác sĩ, chuyên khoa, phòng khám |
| 3 | Xem chi tiết bác sĩ (thông tin, lịch khám, giá, đánh giá) |
| 4 | Xem chi tiết chuyên khoa (mô tả, danh sách bác sĩ) |
| 5 | Xem chi tiết phòng khám (mô tả, danh sách bác sĩ) |
| 6 | Đăng nhập / Đăng ký tài khoản bệnh nhân |
| 7 | Quên mật khẩu / Đặt lại mật khẩu qua email |
| 8 | Xác thực lịch hẹn qua link email |
| 9 | Xem đánh giá bác sĩ |
| 10 | Chuyển đổi ngôn ngữ Việt – Anh |

#### Vai trò: Bệnh nhân (Patient – R3)
| STT | Chức năng |
|-----|-----------|
| 1 | Đặt lịch khám bệnh trực tuyến |
| 2 | Thanh toán phí khám qua VNPay |
| 3 | Xem kết quả thanh toán |
| 4 | Quản lý hồ sơ cá nhân (xem, sửa) |
| 5 | Đổi mật khẩu |
| 6 | Xem lịch sử lịch hẹn (lọc theo trạng thái) |
| 7 | Hủy lịch hẹn |
| 8 | Đánh giá bác sĩ sau khám (1–5 sao + comment) |

#### Vai trò: Bác sĩ (Doctor – R2)
| STT | Chức năng |
|-----|-----------|
| 1 | Xem danh sách bệnh nhân theo ngày (với thống kê KPI) |
| 2 | Xác nhận hoàn thành khám + Gửi kết quả khám qua email (đính kèm ảnh) |
| 3 | Hủy lịch hẹn bệnh nhân |
| 4 | Xem lịch sử khám của bệnh nhân |
| 5 | Quản lý lịch khám (xem, tạo, sửa, xóa) |

#### Vai trò: Quản trị viên (Admin – R1)
| STT | Chức năng |
|-----|-----------|
| 1 | Dashboard thống kê (Tổng booking, bác sĩ, bệnh nhân, booking hoàn thành) |
| 2 | Biểu đồ: Lịch hẹn theo ngày (Line chart), theo trạng thái (Pie chart) |
| 3 | Biểu đồ: Top chuyên khoa (Bar chart), Top bác sĩ (Bar chart) |
| 4 | Quản lý người dùng (CRUD – tạo, xem, sửa, xóa) |
| 5 | Quản lý bác sĩ (thêm thông tin chi tiết, phân công chuyên khoa/phòng khám) |
| 6 | Quản lý chuyên khoa (CRUD) |
| 7 | Quản lý phòng khám (CRUD) |
| 8 | Quản lý lịch khám (tạo hàng loạt, sửa, xóa) |

---

## C1.4. ĐỐI TƯỢNG SỬ DỤNG

| STT | Đối tượng | Mô tả | Quyền hạn |
|-----|-----------|-------|-----------|
| 1 | **Khách (Guest)** | Người dùng chưa đăng nhập, truy cập trang công khai | Xem thông tin, tìm kiếm, đăng ký/đăng nhập |
| 2 | **Bệnh nhân (Patient – R3)** | Người dùng đã đăng ký tài khoản với vai trò bệnh nhân | Đặt lịch, thanh toán, quản lý hồ sơ, xem lịch sử, đánh giá bác sĩ |
| 3 | **Bác sĩ (Doctor – R2)** | Bác sĩ được quản trị viên tạo tài khoản | Xem bệnh nhân, gửi kết quả, quản lý lịch khám |
| 4 | **Quản trị viên (Admin – R1)** | Người quản lý toàn bộ hệ thống | Toàn quyền CRUD trên người dùng, bác sĩ, chuyên khoa, phòng khám, lịch khám, xem thống kê |

---

## C1.5. PHƯƠNG PHÁP THỰC HIỆN

| Giai đoạn | Mô tả | Công cụ |
|-----------|-------|---------|
| 1. Tìm hiểu công nghệ | Nghiên cứu React, Express.js, Sequelize, VNPay, JWT | Tài liệu chính thức, YouTube, Udemy |
| 2. Phân tích yêu cầu | Xác định yêu cầu chức năng, phi chức năng, nghiệp vụ | SRS Document (Markdown) |
| 3. Thiết kế hệ thống | Thiết kế kiến trúc, database, API, giao diện | [CẦN BỔ SUNG – Figma/draw.io nếu có] |
| 4. Cài đặt (Backend) | Xây dựng API RESTful, models, services, middleware | VS Code, Node.js, MySQL, Postman |
| 5. Cài đặt (Frontend) | Xây dựng giao diện React, kết nối API | VS Code, Vite, React DevTools |
| 6. Kiểm thử | Kiểm thử chức năng, API, bảo mật | Postman, Manual Testing |
| 7. Hoàn thiện & Báo cáo | Viết báo cáo, chuẩn bị demo | Microsoft Word, Git |

**Công cụ quản lý phiên bản:** Git (GitHub)

---

## C1.6. CÔNG NGHỆ SỬ DỤNG

### Ngôn ngữ lập trình
| Công nghệ | Mô tả |
|-----------|-------|
| JavaScript (ES6+) | Ngôn ngữ lập trình chính cho cả Frontend và Backend |
| HTML5 / CSS3 / SCSS | Xây dựng giao diện web |
| SQL | Truy vấn cơ sở dữ liệu MySQL |

### Framework Frontend
| Công nghệ | Phiên bản | Mô tả |
|-----------|-----------|-------|
| React.js | 18.3.1 | Thư viện xây dựng giao diện người dùng |
| Vite | 6.0.0 | Build tool siêu nhanh cho React |
| React Router DOM | 6.30.3 | Quản lý điều hướng (routing) |
| Redux Toolkit | 2.11.2 | Quản lý state toàn cục |
| Redux Persist | 6.0.0 | Lưu trữ state vào localStorage |
| React Bootstrap | 2.10.10 | Thư viện UI component |
| TailwindCSS | 3.4.17 | CSS utility framework |
| SASS | 1.98.0 | CSS preprocessor |
| React Intl | 10.0.0 | Hỗ trợ đa ngôn ngữ (i18n) |
| Recharts | 2.15.3 | Thư viện biểu đồ (charts) |
| Axios | 1.13.6 | HTTP client gọi API |
| SweetAlert2 | 11.26.23 | Thông báo popup đẹp |
| React Toastify | 11.0.5 | Thông báo toast |
| React DatePicker | 9.1.0 | Chọn ngày tháng |
| React Slick | 0.31.0 | Carousel/slider component |
| Lucide React | 0.469.0 | Bộ icon SVG |
| DOMPurify | 3.3.3 | Sanitize HTML (chống XSS) |
| Marked | 17.0.5 | Parse Markdown sang HTML |
| React Markdown | 10.1.0 | Hiển thị Markdown |
| React MD Editor | 4.0.11 | Editor Markdown |
| Moment.js | 2.30.1 | Xử lý ngày tháng |
| Lodash | 4.17.23 | Utility functions |

### Framework Backend
| Công nghệ | Phiên bản | Mô tả |
|-----------|-----------|-------|
| Node.js | (runtime) | Môi trường chạy JavaScript phía server |
| Express.js | 5.2.1 | Framework web cho Node.js |
| Sequelize | 6.37.7 | ORM cho SQL databases |
| JSON Web Token | 9.0.3 | Xác thực người dùng (JWT) |
| bcryptjs | 3.0.3 | Mã hóa mật khẩu |
| Nodemailer | 8.0.1 | Gửi email tự động |
| express-rate-limit | 8.3.2 | Giới hạn số request (chống spam) |
| sanitize-html | 2.17.2 | Lọc HTML input (chống XSS) |
| validator | 13.15.35 | Validate input data |
| moment-timezone | 0.6.2 | Xử lý timezone |
| qs | 6.15.1 | Parse/stringify query string (VNPay) |
| uuid | 13.0.0 | Tạo unique ID |
| dotenv | 17.3.1 | Quản lý biến môi trường |
| mysql2 | 3.19.1 | MySQL driver cho Node.js |

### Cơ sở dữ liệu
| Công nghệ | Mô tả |
|-----------|-------|
| MySQL | Hệ quản trị CSDL quan hệ, lưu trữ toàn bộ dữ liệu hệ thống |

### Công cụ phát triển
| Công nghệ | Mô tả |
|-----------|-------|
| Visual Studio Code | IDE chính |
| Git / GitHub | Quản lý phiên bản |
| Postman | Kiểm thử API |
| Nodemon | Auto-restart server khi code thay đổi |

### Thanh toán trực tuyến
| Công nghệ | Mô tả |
|-----------|-------|
| VNPay Sandbox | Cổng thanh toán trực tuyến (môi trường test) |

---

## C1.7. KẾT QUẢ MONG ĐỢI

- Hệ thống web hoàn chỉnh cho phép bệnh nhân đặt lịch khám bệnh trực tuyến với trải nghiệm mượt mà, thuận tiện.
- Tích hợp thanh toán VNPay hoạt động ổn định với cơ chế bảo mật và đối soát giao dịch.
- Giao diện thân thiện, hỗ trợ đa ngôn ngữ (Việt–Anh), responsive trên nhiều thiết bị.
- Dashboard Admin cung cấp thống kê trực quan, hỗ trợ quản lý hiệu quả.
- Hệ thống bảo mật đạt chuẩn: JWT authentication, phân quyền RBAC, rate limiting, XSS/injection prevention.

---

## C1.8. HƯỚNG PHÁT TRIỂN

- Tích hợp AI Chatbot hỗ trợ bệnh nhân tư vấn triệu chứng và đặt lịch (thư mục AIChatbot đã được tạo nhưng chưa triển khai).
- Phát triển ứng dụng mobile (React Native / Flutter) để mở rộng đối tượng người dùng.
- Tích hợp thêm cổng thanh toán (MoMo, ZaloPay) bên cạnh VNPay.
- Triển khai hệ thống thông báo real-time (WebSocket/Socket.IO) khi có lịch hẹn mới hoặc thay đổi.
- Containerize bằng Docker và triển khai CI/CD pipeline cho production (tài liệu Phase 13 đã được chuẩn bị).
- Tích hợp lịch khám vào Google Calendar / Apple Calendar để nhắc nhở bệnh nhân.
