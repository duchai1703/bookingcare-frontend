# BÁO CÁO ĐỒ ÁN 1 – BOOKINGCARE
# CHƯƠNG 2 – CƠ SỞ LÝ THUYẾT

---

## 2.1. JavaScript (ES6+)

**Giới thiệu:** JavaScript là ngôn ngữ lập trình kịch bản (scripting) được phát triển bởi Brendan Eich tại Netscape năm 1995. Với sự ra đời của Node.js, JavaScript có thể chạy phía server, cho phép sử dụng một ngôn ngữ duy nhất cho cả Frontend và Backend. Trong dự án BookingCare, JavaScript ES6+ được sử dụng xuyên suốt cả hai tầng.

**Ưu điểm:**
- Fullstack: sử dụng chung một ngôn ngữ cho cả client và server, giảm chi phí học tập
- Hệ sinh thái npm khổng lồ với hàng triệu package hỗ trợ
- Hỗ trợ bất đồng bộ (async/await, Promise) giúp xử lý I/O hiệu quả

**Nhược điểm:**
- Là ngôn ngữ dynamic typing, dễ phát sinh lỗi runtime khó debug
- Single-threaded, không phù hợp cho tác vụ tính toán CPU-intensive
- Quản lý kiểu dữ liệu lỏng lẻo, cần bổ sung validator bên ngoài

---

## 2.2. React.js

**Giới thiệu:** React.js là thư viện JavaScript mã nguồn mở do Meta (Facebook) phát triển, dùng để xây dựng giao diện người dùng (UI) dạng Single Page Application (SPA). Trong BookingCare, React 18.3.1 được sử dụng để xây dựng toàn bộ giao diện frontend với component-based architecture.

**Ưu điểm:**
- Virtual DOM giúp cập nhật giao diện nhanh chóng, tối ưu hiệu suất rendering
- Component-based architecture tái sử dụng code hiệu quả
- Cộng đồng lớn, tài liệu phong phú, nhiều thư viện hỗ trợ (React Router, Redux, v.v.)

**Nhược điểm:**
- Chỉ là thư viện UI, cần kết hợp nhiều thư viện bên ngoài cho routing, state management
- Curve learning dốc cho người mới, đặc biệt với hooks, context, và state management
- JSX là syntax riêng, khác biệt với HTML thuần túy

---

## 2.3. Vite

**Giới thiệu:** Vite là build tool thế hệ mới do Evan You (tác giả Vue.js) phát triển, sử dụng ES modules native để cung cấp tốc độ khởi động và hot module replacement (HMR) cực nhanh. BookingCare sử dụng Vite 6.0 thay thế Create React App truyền thống.

**Ưu điểm:**
- Khởi động dev server gần như tức thì nhờ ES modules native
- Hot Module Replacement (HMR) cực nhanh, cải thiện trải nghiệm phát triển
- Hỗ trợ TypeScript, JSX, CSS Modules, SCSS out-of-the-box

**Nhược điểm:**
- Ecosystem chưa lớn bằng Webpack
- Một số plugin cũ của Webpack chưa có tương đương cho Vite

---

## 2.4. Express.js

**Giới thiệu:** Express.js là framework web tối giản (minimalist) cho Node.js, được phát triển bởi TJ Holowaychuk. Đây là framework phổ biến nhất trong hệ sinh thái Node.js để xây dựng RESTful API. BookingCare sử dụng Express 5.2.1 cho toàn bộ tầng Backend API.

**Ưu điểm:**
- Nhẹ, linh hoạt, cho phép tùy chỉnh middleware theo nhu cầu
- Routing mạnh mẽ, hỗ trợ RESTful API dễ dàng
- Cộng đồng lớn nhất trong các Node.js framework, nhiều middleware có sẵn

**Nhược điểm:**
- Không có cấu trúc project chuẩn, dễ dẫn đến code thiếu tổ chức nếu dự án lớn
- Xử lý lỗi bất đồng bộ cần cẩn thận, dễ gây crash server nếu thiếu try/catch
- Thiếu built-in validation, cần thêm thư viện bên ngoài

---

## 2.5. MySQL

**Giới thiệu:** MySQL là hệ quản trị cơ sở dữ liệu quan hệ (RDBMS) mã nguồn mở phổ biến nhất thế giới, được phát triển ban đầu bởi MySQL AB, hiện thuộc Oracle Corporation. BookingCare sử dụng MySQL để lưu trữ toàn bộ dữ liệu: người dùng, bác sĩ, lịch khám, booking, thanh toán.

**Ưu điểm:**
- Hiệu suất cao, ổn định, phù hợp với ứng dụng web quy mô vừa và lớn
- Hỗ trợ ACID transactions đảm bảo tính toàn vẹn dữ liệu (quan trọng cho dữ liệu y tế và thanh toán)
- Miễn phí, cộng đồng lớn, tài liệu phong phú

**Nhược điểm:**
- Khó scale ngang (horizontal scaling) so với NoSQL
- Thiếu một số tính năng nâng cao so với PostgreSQL (JSON operations, full-text search)
- Quản lý schema phức tạp khi dự án lớn

---

## 2.6. Sequelize ORM

**Giới thiệu:** Sequelize là Object-Relational Mapping (ORM) cho Node.js, hỗ trợ MySQL, PostgreSQL, SQLite, MSSQL. Trong BookingCare, Sequelize 6.37.7 được sử dụng để định nghĩa models, thiết lập associations, và thực hiện các truy vấn database thay cho SQL thuần.

**Ưu điểm:**
- Cho phép thao tác database bằng JavaScript objects, giảm viết SQL thủ công
- Hỗ trợ migrations, seeders, associations giúp quản lý schema dễ dàng
- Hỗ trợ transactions, locking mechanisms đảm bảo data consistency

**Nhược điểm:**
- Hiệu suất thấp hơn raw SQL cho các truy vấn phức tạp
- Học curve cho các tính năng nâng cao (scopes, hooks, transactions)
- N+1 query problem nếu không sử dụng eager loading đúng cách

---

## 2.7. JSON Web Token (JWT)

**Giới thiệu:** JWT là một tiêu chuẩn mở (RFC 7519) cho việc truyền tải thông tin an toàn giữa các bên dưới dạng JSON object được ký số. BookingCare sử dụng JWT (thư viện jsonwebtoken 9.0.3) cho cơ chế xác thực stateless, kết hợp với tokenVersion để hỗ trợ session revocation khi đổi mật khẩu.

**Ưu điểm:**
- Stateless authentication, server không cần lưu session, dễ scale
- Chứa payload tùy chỉnh (id, email, roleId, tokenVersion)
- Hỗ trợ nhiều thuật toán ký: HMAC, RSA, ECDSA

**Nhược điểm:**
- Không thể thu hồi (revoke) token dễ dàng khi đã phát hành (BookingCare giải quyết bằng tokenVersion)
- Kích thước lớn hơn session ID, tăng bandwidth
- Nếu secret key bị lộ, toàn bộ token bị compromise

---

## 2.8. VNPay Payment Gateway

**Giới thiệu:** VNPay (Vietnam Payment Solution) là cổng thanh toán trực tuyến hàng đầu tại Việt Nam, hỗ trợ thanh toán qua thẻ ATM nội địa, thẻ quốc tế, ví điện tử và QR code. BookingCare tích hợp VNPay sandbox để bệnh nhân thanh toán phí khám bệnh trực tuyến, sử dụng giao thức SHA512 HMAC cho bảo mật.

**Ưu điểm:**
- Hỗ trợ đa dạng phương thức thanh toán phổ biến tại Việt Nam
- Cung cấp sandbox environment cho testing, tài liệu API chi tiết
- Bảo mật cao với cơ chế chữ ký HMAC-SHA512 và IPN callback

**Nhược điểm:**
- Tích hợp phức tạp, cần xử lý nhiều edge case (timeout, duplicate IPN, reconciliation)
- Sandbox đôi khi không ổn định, gây khó khăn cho testing
- Chỉ hoạt động tại thị trường Việt Nam

---

## 2.9. Redux Toolkit

**Giới thiệu:** Redux Toolkit (RTK) là bộ công cụ chính thức của Redux, do Dan Abramov phát triển, giúp đơn giản hóa việc quản lý global state trong ứng dụng React. BookingCare sử dụng RTK 2.11.2 kết hợp Redux Persist để quản lý state xác thực (auth), ngôn ngữ, và dữ liệu chia sẻ.

**Ưu điểm:**
- Giảm boilerplate code so với Redux thuần (createSlice, createAsyncThunk)
- Tích hợp Immer cho immutable state updates, giảm lỗi mutation
- DevTools integration giúp debug state changes trực quan

**Nhược điểm:**
- Overhead không cần thiết cho ứng dụng nhỏ
- Học curve cho người mới tiếp cận Redux pattern

---

## 2.10. Kiến trúc Client-Server

**Giới thiệu:** Kiến trúc Client-Server là mô hình kiến trúc phần mềm phân tách hệ thống thành 2 thành phần: Client (trình duyệt web chạy React) gửi request đến Server (Express.js API) xử lý logic nghiệp vụ và truy xuất database. BookingCare tuân theo mô hình này với RESTful API, versioning `/api/v1/`.

**Ưu điểm:**
- Phân tách rõ ràng giữa giao diện và logic nghiệp vụ, dễ bảo trì
- Frontend và Backend có thể phát triển, triển khai và scale độc lập
- Hỗ trợ nhiều loại client (web, mobile) truy cập cùng API

**Nhược điểm:**
- Tăng độ phức tạp so với monolithic (SSR)
- Phụ thuộc network, latency giữa client và server
- Cần quản lý CORS, authentication cho cross-origin requests
