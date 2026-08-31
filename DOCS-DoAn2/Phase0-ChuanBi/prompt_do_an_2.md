# PROMPT TẠO ĐỀ CƯƠNG CHI TIẾT & KẾ HOẠCH THỰC HIỆN – ĐỒ ÁN 2 BOOKINGCARE

> **Hướng dẫn sử dụng:** Copy toàn bộ nội dung prompt này và gửi cho AI (ChatGPT, Gemini, Claude, v.v.) để AI tạo đề cương chi tiết và kế hoạch thực hiện cho Đồ án 2.

---

## 🎯 YÊU CẦU CHO AI

Bạn là một chuyên gia tư vấn phát triển phần mềm và hướng dẫn đồ án tốt nghiệp ngành Công nghệ Phần mềm. Hãy tạo **đề cương chi tiết** (mục lục chương/mục) và **kế hoạch thực hiện Gantt** cho Đồ án 2 của nhóm sinh viên dựa trên toàn bộ thông tin context dưới đây.

**Output yêu cầu gồm 5 phần:**

1. **Đề cương chi tiết** (mục lục chương/mục theo chuẩn báo cáo đồ án đại học, đánh số đến cấp 3: 1.1.1)
2. **Kế hoạch thực hiện dạng Gantt** (chia theo tuần, từ 07/09/2026 đến 26/12/2026 = 16 tuần)
3. **Bảng phân công nhiệm vụ** (2 thành viên, mỗi người 50%, phân rõ ai làm gì theo từng sprint/tuần)
4. **Danh sách Milestone & Deliverables** (mốc quan trọng, sản phẩm bàn giao theo từng giai đoạn)
5. **Phân tích rủi ro & Phương án dự phòng** (ít nhất 5 rủi ro kỹ thuật quan trọng)

---

## 📋 THÔNG TIN CHUNG

| Mục | Thông tin |
|-----|-----------|
| **Tên đề tài** | Phát triển và mở rộng hệ thống đặt lịch khám bệnh trực tuyến BookingCare – Tích hợp ứng dụng di động, Telemedicine và AI nâng cao |
| **Tên tiếng Anh** | BookingCare Phase 2 – Mobile App, Telemedicine & Advanced AI Integration for Online Medical Appointment System |
| **Môn học** | Đồ án 2 |
| **Trường** | Đại học Công nghệ Thông tin – ĐHQG TP.HCM (UIT) |
| **Khoa** | Công nghệ Phần mềm |
| **Số thành viên** | 2 người |
| **Thời gian thực hiện** | 07/09/2026 – 26/12/2026 (16 tuần) |
| **Nền tảng đồ án 1** | Hệ thống BookingCare đã hoàn thành (web fullstack + AI Chatbot + VNPay + Docker) |

---

## 📦 CONTEXT: DỰ ÁN HIỆN TẠI (ĐỒ ÁN 1 ĐÃ HOÀN THÀNH)

### Kiến trúc hệ thống hiện tại

```
Frontend (React 18.3.1 + Vite 6.0 + Redux Toolkit 2.11.2) → Port 3000
    ↓ HTTP/Axios
Backend (Express.js 5.2.1 + Node.js) → Port 8080
    ↓ Sequelize ORM 6.37.7
Database (MySQL / PostgreSQL 16 khi Docker) → 9 bảng

External Services:
├── VNPay Sandbox (Thanh toán trực tuyến)
├── Gmail SMTP via Nodemailer (Email tự động)
├── Google Gemini 2.0 Flash (AI Chatbot)
└── Docker Compose V2 (4 containers: Nginx, Node.js, PostgreSQL, Redis)
```

### Tech Stack Frontend hiện tại
- React 18.3.1, Vite 6.0, React Router DOM 6.30.3
- Redux Toolkit 2.11.2 + Redux Persist 6.0
- React Bootstrap 2.10.10 + TailwindCSS 3.4.17 + SASS 1.98
- React Intl 10.0 (đa ngôn ngữ Việt–Anh)
- Recharts 2.15.3 (biểu đồ dashboard)
- Axios 1.13.6, SweetAlert2, React Toastify, React DatePicker
- React Slick (carousel), Lucide React (icons)
- DOMPurify, React Markdown, React MD Editor
- Moment.js, Lodash, localForage (IndexedDB cho AI chat history)

### Tech Stack Backend hiện tại
- Express.js 5.2.1, Sequelize 6.37.7, mysql2 3.19.1
- jsonwebtoken 9.0.3 + bcryptjs 3.0.3 (JWT + password hashing)
- Nodemailer 8.0.1 (email), express-rate-limit 8.3.2
- sanitize-html, validator, moment-timezone
- qs 6.15.1 (VNPay), uuid 13.0, dotenv 17.3.1
- @google/generative-ai (Gemini SDK)

### Database Schema (9 bảng Sequelize)

#### Bảng Users
- id (PK), email (UNIQUE), password (bcrypt), firstName, lastName
- address, phoneNumber, gender (FK→Allcode), roleId (R1/R2/R3)
- image (BLOB base64), positionId (FK→Allcode), tokenVersion (JWT revocation)

#### Bảng Bookings
- id (PK), statusId (S1/S1.5/S2/S3/S4), doctorId, patientId (FK→Users)
- date (timestamp UTC), timeType (T1-T8), token (email verify)
- reason (TEXT), patientName, patientPhoneNumber, patientAddress, patientGender, patientBirthday
- paymentToken (UNIQUE), paymentStatus (unpaid/paid/failed/expired), bookingPrice (VND)
- vnpayTransactionNo, vnp_PayDate, publicReceiptToken (UNIQUE)
- receiptExpiredAt, reconcileFirstSeenAt, lastQuerydrCode

#### Bảng Schedules
- id (PK), doctorId (FK→Users), date, timeType (T1-T8)
- maxNumber (DEFAULT 10), currentNumber (DEFAULT 0)
- UNIQUE(doctorId, date, timeType)

#### Bảng Doctor_Infos
- id (PK), doctorId (FK→Users), specialtyId (FK→Specialties), clinicId (FK→Clinics)
- priceId, provinceId, paymentId (FK→Allcode)
- contentHTML, contentMarkdown, description, note, count

#### Bảng Specialties
- id (PK), name, image (BLOB), descriptionHTML, descriptionMarkdown

#### Bảng Clinics
- id (PK), name, address, image (BLOB), descriptionHTML, descriptionMarkdown

#### Bảng Allcodes (Bảng tra cứu mã chung)
- id (PK), type (ROLE/GENDER/TIME/STATUS/POSITION/PRICE/PAYMENT/PROVINCE)
- keyMap (UNIQUE: R1, G1, T1, S1...), valueVi, valueEn

#### Bảng Reviews
- id (PK), doctorId, patientId (FK→Users), bookingId (UNIQUE FK→Bookings)
- rating (1-5), comment (TEXT)

#### Bảng Tokens
- id (PK), tokenHash (SHA256 UNIQUE), userId (FK→Users)
- type (RESET_PW/VERIFY_EMAIL), isUsed, expiredAt

### 4 Vai trò người dùng hiện tại

**Guest (10 chức năng):** Xem trang chủ, tìm kiếm, xem chi tiết BS/CK/PK, đăng nhập/đăng ký, quên/đặt lại MK, xem đánh giá, chuyển ngôn ngữ.

**Patient – R3 (14 chức năng gồm AI):** Đặt lịch khám, thanh toán VNPay, quản lý hồ sơ, đổi MK, xem lịch sử, hủy lịch, đánh giá BS, AI Chatbot (hỏi đáp, tra cứu BS/PK/lịch/booking/thanh toán).

**Doctor – R2 (5 chức năng):** Xem danh sách BN theo ngày, gửi kết quả khám (email+ảnh), hủy lịch, xem lịch sử BN, quản lý lịch khám.

**Admin – R1 (8 chức năng):** Dashboard (4 KPI + 4 biểu đồ Recharts), CRUD người dùng/bác sĩ/chuyên khoa/phòng khám/lịch khám.

### Booking State Machine hiện tại
```
S1 (Mới) → [Email verify + manual click Anti-Bot] → S1.5 (Chờ TT)
S1.5 → [VNPay success] → S2 (Đã xác nhận)
S1.5 → [VNPay fail / timeout 20 phút] → S4 (Đã hủy)
S2 → [Doctor gửi kết quả] → S3 (Hoàn thành)
S1/S2 → [Patient/Doctor hủy] → S4 (Đã hủy)
```

### Business Rules hiện tại (12 rules)
- BR01: Email UNIQUE
- BR02: Password ≥ 6 ký tự, bcrypt hash
- BR03: 1 BN chỉ 1 booking/BS/ngày/giờ (chưa hủy)
- BR04: Booking State Machine S1→S1.5→S2→S3/S4
- BR05: maxNumber = 10 BN/slot
- BR06: Reset PW token dùng 1 lần, hạn 15 phút
- BR07: Review chỉ khi S3, UNIQUE bookingId
- BR08: Rating 1-5
- BR09: Auto-cancel S1/S1.5 sau 20 phút (cronjob)
- BR10: Doctor IDOR prevention
- BR11: VNPay HMAC-SHA512, timingSafeEqual
- BR12: UNIQUE(doctorId, date, timeType)

### Bảo mật hiện tại
- JWT + tokenVersion revocation, bcrypt hashing
- Rate limiting: 100 req/15min auth, 10000 req/15min API
- CORS (specific origin), XSS prevention (DOMPurify + sanitize-html)
- Input validation, URI length guard
- Anti-Bot email verification

### API hiện tại
- 48 RESTful endpoints, versioning `/api/v1/`
- Modules: Auth, Doctor, Patient, Payment (VNPay), Review, Specialty, Clinic, Statistics, AI, Search

### AI Chatbot hiện tại
- Model: Gemini 2.0 Flash, SSE streaming
- 6 Function Calling read-only handlers: searchDoctorsBySpecialty, getAvailableSchedules, getClinicInfo, getDoctorDetail, getMyBookings, getMyPaymentStatus
- 29 security guards, concurrent limit 15, timeout 60s
- Client: localForage (IndexedDB), max 50 messages, sliding window 2500 chars
- PII masking, Kill-Switch, maxOutputTokens 500

### Docker hiện tại
- Docker Compose V2, 4 containers trên bridge network (MTU 1450)
- app-frontend: Nginx Unprivileged 1.27-alpine (256MB)
- app-backend: Node.js 18-bookworm-slim (768MB)
- db-postgres: PostgreSQL 16-alpine (512MB)
- redis-cache: Redis 7-alpine (384MB)
- 3 volumes: postgres_data, redis_data, backend_uploads
- Health checks, cgroups memory limits, dependency ordering
- Chưa có CI/CD pipeline

### 22+ Routes/Screens hiện tại
**Public:** `/`, `/login`, `/register`, `/forgot-password`, `/reset-password`, `/doctor/:id`, `/specialty/:id`, `/clinic/:id`, `/verify-booking`, `/payment-result`
**Patient Portal:** `/patient/profile`, `/patient/history`
**Doctor Dashboard:** `/doctor-dashboard/manage-patient`, `/doctor-dashboard/manage-schedule`
**Admin System:** `/system/dashboard`, `/system/user-manage`, `/system/doctor-manage`, `/system/specialty-manage`, `/system/clinic-manage`, `/system/schedule-manage`

---

## 🚀 7 HƯỚNG PHÁT TRIỂN MỚI CHO ĐỒ ÁN 2

### Hướng 1: Phát triển ứng dụng Mobile (React Native)

**Yêu cầu:**
- Xây dựng ứng dụng mobile đa nền tảng (iOS + Android) bằng **React Native** (hoặc Flutter nếu phân tích thấy phù hợp hơn, cần đánh giá ưu nhược điểm).
- Tái sử dụng tối đa API backend hiện tại (`/api/v1/`). Không viết lại backend.
- Ưu tiên các chức năng cho **Patient (R3):** Trang chủ, tìm kiếm, xem chi tiết BS/CK/PK, đặt lịch, thanh toán VNPay (deep link hoặc WebView), xem lịch sử, hủy lịch, đánh giá BS, quản lý hồ sơ, AI Chatbot, Chat với BS.
- Xem xét bổ sung chức năng cho **Doctor (R2):** Xem danh sách BN, gửi kết quả, quản lý lịch, nhận push notification, Telemedicine.
- Push Notification (Firebase Cloud Messaging) khi có booking mới, thay đổi trạng thái, tin nhắn mới.
- Responsive UI, hỗ trợ đa ngôn ngữ (Việt–Anh) reuse translation files hiện tại.
- Deep linking để mở app từ email xác nhận.
- Lưu JWT token an toàn (SecureStore/Keychain).

**Công nghệ gợi ý:** React Native CLI hoặc Expo, React Navigation, Redux Toolkit (tái sử dụng slices), Axios, react-native-webview (VNPay), Firebase (push notification), AsyncStorage hoặc expo-secure-store.

### Hướng 2: Thiết lập CI/CD Pipeline (GitHub Actions)

**Yêu cầu:**
- Thiết lập GitHub Actions workflow cho cả Frontend, Backend và Mobile.
- Pipeline stages: Lint → Test → Build → Push Docker Image → Deploy.
- Chạy unit test và integration test tự động trên mỗi PR/push.
- Build và push Docker images lên Docker Hub hoặc GitHub Container Registry.
- Auto-deploy khi merge vào branch `main` hoặc `production`.
- Cấu hình environment secrets (DB credentials, JWT secret, VNPay keys, Gemini API key).
- Caching dependencies (node_modules) để tăng tốc pipeline.
- Branch protection rules: require PR review, require CI pass.

**Công nghệ gợi ý:** GitHub Actions, Docker Hub / GHCR, SSH deploy hoặc Cloudflare Tunnels, Dependabot.

### Hướng 3: Tích hợp Telemedicine (Video Call – WebRTC)

**Yêu cầu:**
- Tích hợp video call real-time giữa Bác sĩ (R2) và Bệnh nhân (R3) cho tái khám.
- Sử dụng **WebRTC** cho peer-to-peer video/audio call.
- Signaling server sử dụng **Socket.IO** (tích hợp vào backend Express.js hiện tại hoặc tách service riêng).
- Luồng: BS mở phòng khám video → BN nhận notification/link → Tham gia call → Kết thúc → Cập nhật booking.
- Bổ sung trạng thái booking mới: **S5 (Tái khám online)** hoặc mở rộng S2 với flag `isTelemedicine`.
- Ghi chú/tóm tắt sau cuộc gọi (doctor notes).
- TURN/STUN server cho NAT traversal (có thể dùng free STUN servers hoặc Twilio TURN).
- Hỗ trợ trên cả Web (React) và Mobile (React Native).
- Screen sharing (tùy chọn), chat text trong phòng call.

**Công nghệ gợi ý:** WebRTC API, Socket.IO, simple-peer hoặc PeerJS, STUN/TURN servers, MediaStream API, react-native-webrtc.

### Hướng 4: Bổ sung Unit Test & Integration Test (Jest, Supertest)

**Yêu cầu:**
- Viết **unit test** cho Backend services (business logic, validation, helpers).
- Viết **integration test** cho Backend API endpoints (Supertest + test database).
- Viết **unit test** cho Frontend components (Jest + React Testing Library).
- Đạt **code coverage tối thiểu 60%** cho Backend services, 40% cho Frontend components.
- Test database riêng (SQLite in-memory hoặc test MySQL) để không ảnh hưởng production data.
- Mock external services: VNPay, Nodemailer, Gemini API.
- Test cases quan trọng cần có:
  - Auth: đăng nhập đúng/sai, đăng ký trùng email, quên MK flow
  - Booking: đặt lịch → verify → thanh toán → hoàn thành, race condition (double booking)
  - VNPay: tạo URL, IPN callback valid/invalid, idempotency
  - RBAC: phân quyền R1/R2/R3, IDOR prevention
  - AI Chatbot: function calling, rate limit, kill-switch
- Tích hợp test vào CI/CD pipeline (chạy tự động trên mỗi PR).

**Công nghệ gợi ý:** Jest, Supertest, React Testing Library, @testing-library/jest-dom, MSW (Mock Service Worker), nyc/istanbul (coverage), Faker.js (test data).

### Hướng 5: Mở rộng AI Chatbot – Chẩn đoán hình ảnh & Tư vấn chuyên sâu

**Yêu cầu:**
- **Phân tích hình ảnh y tế:** BN upload ảnh (da liễu, X-ray, xét nghiệm) → AI phân tích và tư vấn sơ bộ (KHÔNG chẩn đoán chính thức, luôn khuyên đi khám BS).
- Sử dụng **Gemini multimodal** (hỗ trợ text + image) thay vì chỉ text.
- **RAG (Retrieval-Augmented Generation):** Tích hợp knowledge base y tế (bệnh phổ biến, triệu chứng, chuyên khoa tương ứng) để AI trả lời chính xác hơn.
- **Conversation Context nâng cao:** Nâng sliding window hoặc sử dụng vector database (Pinecone/ChromaDB) để lưu trữ và truy xuất context dài hạn.
- **Tư vấn theo chuyên khoa:** AI gợi ý chuyên khoa dựa trên phân tích triệu chứng + hình ảnh, link trực tiếp đến trang đặt lịch.
- **Bổ sung Function Calling mới:** createBookingDraft (tạo nháp booking từ chat), getSpecialtyRecommendation.
- **Disclaimer y tế** rõ ràng: "Đây chỉ là tham khảo, không thay thế tư vấn y khoa chuyên nghiệp."
- Giới hạn kích thước ảnh upload (≤ 5MB), validate MIME type.
- Rate limit riêng cho multimodal requests (tốn token hơn text).

**Công nghệ gợi ý:** Gemini 2.0 Flash (multimodal), LangChain.js, ChromaDB hoặc Pinecone (vector DB), PDF/image parsing libraries.

### Hướng 6: Chat tin nhắn giữa Bác sĩ và Bệnh nhân (Real-time Messaging)

**Yêu cầu:**
- Hệ thống nhắn tin real-time giữa BS (R2) và BN (R3).
- **Real-time:** Sử dụng **Socket.IO** (WebSocket) cho giao tiếp 2 chiều.
- **Persist messages:** Lưu tin nhắn vào database (bảng mới: Messages/Conversations).
- **Conversation model:** Mỗi booking/relationship BS-BN tạo 1 conversation. BN chỉ chat được với BS đã đặt lịch.
- **Tính năng:** Gửi text, gửi ảnh (base64 hoặc file upload), đánh dấu đã đọc (read receipts), typing indicator, lịch sử chat (phân trang), thông báo tin nhắn mới (push notification trên mobile).
- **Bảo mật:** Chỉ participant trong conversation mới đọc/gửi được, JWT authentication cho WebSocket connection, message encryption (tùy chọn).
- **UI:** Chat sidebar/drawer trên web, full-screen chat trên mobile, badge unread count.
- Tích hợp vào cả Web (React) và Mobile (React Native).

**Schema gợi ý cho bảng mới:**
```
Conversations: id, doctorId, patientId, bookingId (nullable), lastMessageAt, createdAt
Messages: id, conversationId, senderId, senderRole, content, messageType (text/image), isRead, createdAt
```

**Công nghệ gợi ý:** Socket.IO (backend + client), Redis Pub/Sub (nếu scale), Firebase Cloud Messaging (push notification).

### Hướng 7: Deploy Backend và Frontend lên Production

**Yêu cầu:**
- Deploy **Backend** (Express.js + PostgreSQL + Redis) lên cloud server.
- Deploy **Frontend** (React build) lên CDN hoặc static hosting.
- Sử dụng Docker Compose hiện tại (đã chuẩn bị sẵn ở Đồ án 1).
- Cấu hình domain, SSL/TLS (Let's Encrypt hoặc Cloudflare).
- Thiết lập monitoring cơ bản (health check, uptime).
- Database backup strategy.
- Environment separation: staging vs production.
- Logging (production-grade: PM2 logs hoặc Winston).

**Công nghệ gợi ý:** VPS (DigitalOcean/Vultr/Hetzner 2-4GB RAM), Cloudflare (DNS + SSL + Tunnels), Vercel hoặc Netlify (Frontend), Docker Compose, PM2, Let's Encrypt, pgBackRest hoặc pg_dump (DB backup).

---

## ⚙️ RÀNG BUỘC & YÊU CẦU BỔ SUNG

### Ràng buộc nhóm
- **2 thành viên**, mỗi người đóng góp **50%**.
- Thành viên 1 (Đặng Ngọc Trường Giang – Tech Lead Fullstack): Thiên về backend, hạ tầng, bảo mật.
- Thành viên 2 (Trần Đức Hải): Thiên về frontend, mobile, tích hợp UI.
- Phối hợp qua Git/GitHub, code review lẫn nhau.

### Ràng buộc thời gian
- **16 tuần** (07/09/2026 – 26/12/2026).
- Tuần 1-2: Setup, planning, research.
- Tuần 15-16: Testing cuối, viết báo cáo, chuẩn bị demo.
- Sprint 2 tuần/sprint (8 sprints tổng cộng).
- Có thể có 1-2 tuần nghỉ lễ/thi giữa kỳ (cần tính toán).

### Ràng buộc kỹ thuật
- **KHÔNG** viết lại backend từ đầu. Mở rộng API hiện tại.
- **KHÔNG** thay đổi database schema hiện tại (chỉ thêm bảng/cột mới).
- Tương thích ngược: Web app hiện tại phải tiếp tục hoạt động bình thường.
- Mobile app phải sử dụng chung API backend.
- Tất cả tính năng mới phải có đa ngôn ngữ (Việt–Anh).
- Phải có seed data cho các tính năng mới.

### Yêu cầu báo cáo
- Đề cương theo chuẩn báo cáo đồ án UIT.
- Mỗi tính năng mới cần: Use Case, đặc tả UC, thiết kế DB bổ sung, thiết kế API, thiết kế UI.
- Có biểu đồ: Use Case Diagram cập nhật, Sequence Diagram cho các luồng mới, Class Diagram cập nhật, ER Diagram cập nhật.
- So sánh trước/sau (Đồ án 1 vs Đồ án 2).

---

## 📝 YÊU CẦU OUTPUT CỤ THỂ

### Phần 1: Đề cương chi tiết
- Tạo mục lục chương đánh số đến cấp 3 (ví dụ: 3.2.1).
- Mỗi mục ghi rõ nội dung sẽ viết (1-2 câu mô tả).
- Ước lượng số trang cho mỗi chương.
- Tổng báo cáo ước tính: 80-120 trang.

### Phần 2: Kế hoạch Gantt
- Chia theo 16 tuần, mỗi tuần ghi rõ task chính.
- Đánh dấu dependencies giữa các task.
- Ghi rõ milestones (★) tại các mốc quan trọng.
- Format bảng markdown hoặc mermaid gantt.

### Phần 3: Phân công nhiệm vụ
- Bảng phân công theo sprint (mỗi sprint = 2 tuần).
- Mỗi task ghi rõ: Tên task, Người phụ trách, Người review, Ước lượng effort (ngày).
- Đảm bảo cân bằng 50-50.

### Phần 4: Milestones & Deliverables
- Danh sách milestone theo thời gian.
- Mỗi milestone ghi rõ: deliverable (sản phẩm bàn giao), criteria (tiêu chí hoàn thành).

### Phần 5: Phân tích rủi ro
- Ít nhất 5 rủi ro kỹ thuật.
- Mỗi rủi ro: mô tả, xác suất (Cao/TB/Thấp), tác động, phương án dự phòng.

---

## 🔑 LƯU Ý QUAN TRỌNG CHO AI

1. **Ưu tiên tính khả thi:** 16 tuần cho 2 người là thời gian hạn chế. Hãy sắp xếp thứ tự ưu tiên hợp lý. Nếu cần, đề xuất các tính năng MVP (Minimum Viable Product) trước, tính năng nâng cao sau.

2. **Thứ tự phát triển gợi ý:** Testing + CI/CD → Deploy → Chat BS-BN (Socket.IO) → Mobile App (song song) → Telemedicine (WebRTC dựa trên Socket.IO đã có) → AI nâng cao. Tuy nhiên AI có thể đề xuất thứ tự khác nếu hợp lý hơn.

3. **Tái sử dụng tối đa:** Mobile app nên share logic (Redux slices, API calls, validation) với web app. Socket.IO cho Chat cũng phục vụ cho Telemedicine signaling.

4. **Không phải tất cả 7 hướng đều cần hoàn thành 100%.** Một số hướng có thể ở mức MVP. Hãy ghi rõ scope cho từng hướng (MVP vs Full).

5. **Dữ liệu demo:** Cần có seeder cho tất cả tính năng mới để demo trơn tru.

6. **Đề cương phải bao gồm cả phần tài liệu Đồ án 1 (tóm tắt) + phần mới Đồ án 2** vì đây là báo cáo hoàn chỉnh.
