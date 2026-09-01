# ĐỀ CƯƠNG CHI TIẾT – ĐỒ ÁN 2 BOOKINGCARE
## Phần 1/5: Mục lục chương & Nội dung chi tiết

> **Tổng ước tính:** 100–120 trang
> **Thời gian thực hiện:** 07/09/2026 – 26/12/2026 (16 tuần)

---

## PHẦN MỞ ĐẦU (~4 trang)

- **Lời cảm ơn** — Cảm ơn giảng viên hướng dẫn, khoa CNPM, nhà trường UIT.
- **Tóm tắt đồ án** — Tóm tắt ngắn gọn mục tiêu, phạm vi và kết quả Đồ án 2 (tiếng Việt + tiếng Anh).
- **Mục lục** — Tự động sinh từ các heading.
- **Danh mục hình ảnh** — Danh sách hình minh họa, biểu đồ, ảnh chụp màn hình.
- **Danh mục bảng biểu** — Danh sách bảng dữ liệu, bảng so sánh.
- **Danh mục từ viết tắt** — Giải thích: WebRTC, SSE, JWT, ORM, RBAC, CI/CD, FCM, STUN/TURN, RAG, PII, v.v.

---

## CHƯƠNG 1 – GIỚI THIỆU ĐỀ TÀI (~8 trang)

### 1.1. Tổng quan Đồ án 1 (Tóm tắt kết quả đã đạt được)
Trình bày ngắn gọn thành quả Đồ án 1: hệ thống web fullstack hoàn chỉnh gồm 4 vai trò (Guest, Patient, Doctor, Admin), 38 chức năng, tích hợp VNPay, AI Chatbot, Docker, 48 API endpoints.

### 1.2. Lý do mở rộng và phát triển Đồ án 2
Phân tích các hạn chế của Đồ án 1 (chưa có mobile app, chưa deploy production, thiếu testing, chưa có chat/video call) và xu hướng telemedicine, AI y tế trên thế giới và Việt Nam. Nêu rõ tại sao cần mở rộng.

### 1.3. Mục tiêu Đồ án 2
Liệt kê 7 mục tiêu cụ thể tương ứng 7 hướng phát triển: Mobile App, CI/CD, Telemedicine, Testing, AI nâng cao, Chat BS-BN, Deploy Production.

### 1.4. Phạm vi đề tài

#### 1.4.1. Các chức năng kế thừa từ Đồ án 1
Bảng liệt kê toàn bộ chức năng Đồ án 1 theo role (Guest 10, Patient 14, Doctor 5, Admin 8) — giữ nguyên và tương thích ngược.

#### 1.4.2. Các chức năng mới của Đồ án 2
Bảng liệt kê tất cả chức năng mới theo role, phân biệt rõ [MỚI] cho từng tính năng:

| Role | Chức năng mới |
|------|--------------|
| Patient (R3) | Chat tin nhắn với BS, Tham gia Video Call tái khám, Upload ảnh cho AI chẩn đoán, Sử dụng Mobile App, Nhận push notification |
| Doctor (R2) | Chat tin nhắn với BN, Mở phòng khám video (Telemedicine), Ghi chú sau video call, Sử dụng Mobile App, Nhận push notification |
| Admin (R1) | Quản lý cấu hình hệ thống (kill-switch AI, toggle features) |
| System | CI/CD pipeline tự động, Production deployment, Unit/Integration testing |

#### 1.4.3. Phân biệt scope MVP vs Full cho mỗi hướng
Bảng ghi rõ tính năng nào ở mức MVP (cần hoàn thành), tính năng nào ở mức Full/Nice-to-have.

### 1.5. Đối tượng sử dụng
Cập nhật bảng 4 vai trò (thêm mô tả các quyền mới: chat, video call, mobile access).

### 1.6. Phương pháp thực hiện
Mô tả quy trình Agile/Scrum (8 sprints × 2 tuần), công cụ quản lý (GitHub Projects/Issues), git workflow (feature branches, PR review).

### 1.7. Công nghệ sử dụng bổ sung

#### 1.7.1. Công nghệ Mobile
React Native / Expo, React Navigation, expo-secure-store, react-native-webview, react-native-webrtc, Firebase Cloud Messaging.

#### 1.7.2. Công nghệ Real-time
Socket.IO (WebSocket), WebRTC API, simple-peer / PeerJS, STUN/TURN servers.

#### 1.7.3. Công nghệ AI nâng cao
Gemini 2.0 Flash multimodal (text + image), LangChain.js (RAG pipeline), ChromaDB / Pinecone (vector database).

#### 1.7.4. Công nghệ Testing
Jest, Supertest, React Testing Library, MSW (Mock Service Worker), nyc/istanbul (coverage), Faker.js.

#### 1.7.5. Công nghệ DevOps & Deployment
GitHub Actions (CI/CD), Docker Hub / GHCR, VPS (DigitalOcean/Vultr/Hetzner), Cloudflare (DNS + SSL + Tunnels), PM2, Winston (logging).

### 1.8. Kết quả mong đợi
Danh sách sản phẩm cuối cùng: Mobile App (APK/IPA), Web app nâng cấp, CI/CD pipeline, Production URL, Báo cáo test coverage, Demo video.

---

## CHƯƠNG 2 – CƠ SỞ LÝ THUYẾT (~12 trang)

### 2.1. Tổng quan công nghệ đã sử dụng (Đồ án 1) – Tóm tắt
Tóm tắt ngắn gọn (mỗi mục 3-5 dòng) các công nghệ Đồ án 1: React.js, Express.js, MySQL, Sequelize, JWT, VNPay, Redux Toolkit, Vite, Gemini API, Docker, SSE.

### 2.2. React Native
Giới thiệu framework mobile cross-platform của Meta. So sánh React Native vs Flutter (bảng ưu/nhược). Giải thích tại sao chọn React Native (cùng hệ sinh thái React, tái sử dụng code).

### 2.3. WebRTC (Web Real-Time Communication)
Giới thiệu giao thức P2P cho video/audio call. Mô tả các thành phần: MediaStream, RTCPeerConnection, RTCDataChannel. Giải thích Signaling, ICE, STUN/TURN.

### 2.4. Socket.IO (WebSocket)
Giới thiệu thư viện real-time bidirectional communication. So sánh Socket.IO vs raw WebSocket. Ứng dụng trong chat và WebRTC signaling.

### 2.5. Kiểm thử phần mềm (Software Testing)

#### 2.5.1. Unit Testing
Định nghĩa, mục đích, phương pháp (AAA pattern: Arrange-Act-Assert). Giới thiệu Jest.

#### 2.5.2. Integration Testing
Định nghĩa, mục đích, sự khác biệt với unit test. Giới thiệu Supertest cho API testing.

#### 2.5.3. Code Coverage
Các metric: Statement, Branch, Function, Line coverage. Ngưỡng chấp nhận (60% BE, 40% FE).

### 2.6. CI/CD (Continuous Integration / Continuous Deployment)
Giải thích khái niệm CI/CD pipeline. Giới thiệu GitHub Actions (workflow, jobs, steps, runners). Lợi ích: tự động hóa, giảm lỗi con người, deploy nhanh.

### 2.7. AI Multimodal và RAG

#### 2.7.1. Gemini Multimodal (Text + Image)
Mô tả khả năng xử lý đa phương thức của Gemini 2.0. Ứng dụng: phân tích ảnh y tế sơ bộ, tư vấn triệu chứng qua hình ảnh.

#### 2.7.2. RAG (Retrieval-Augmented Generation)
Giải thích kiến trúc RAG: Retrieval (tìm kiếm trong knowledge base) → Augment (bổ sung context) → Generate (AI tạo câu trả lời). Ứng dụng: knowledge base y tế cho chatbot.

#### 2.7.3. Vector Database
Giới thiệu ChromaDB / Pinecone. Giải thích embedding, similarity search, cosine distance.

### 2.8. Firebase Cloud Messaging (FCM)
Giới thiệu dịch vụ push notification của Google. Luồng hoạt động: Server → FCM → Device. Hỗ trợ cả iOS và Android.

### 2.9. Cloud Deployment & Infrastructure

#### 2.9.1. VPS và Cloud Server
So sánh các nhà cung cấp (DigitalOcean, Vultr, Hetzner). Tiêu chí lựa chọn: RAM, CPU, giá, vị trí datacenter.

#### 2.9.2. Cloudflare
DNS management, SSL/TLS tự động, DDoS protection, Cloudflare Tunnels (alternative to public IP).

#### 2.9.3. Monitoring và Logging
PM2 process manager, Winston logging, health check endpoints, uptime monitoring.

---

## CHƯƠNG 3 – PHÂN TÍCH VÀ THIẾT KẾ HỆ THỐNG (~35 trang)

### 3.1. Phân tích yêu cầu bổ sung

#### 3.1.1. Yêu cầu chức năng mới (FR33 – FR55+)
Bảng liệt kê tất cả yêu cầu chức năng mới (đánh số tiếp theo từ FR33 Đồ án 1), phân loại theo module:

| Module | Yêu cầu chức năng mới |
|--------|----------------------|
| Chat (6 FR) | Tạo conversation, gửi text, gửi ảnh, đánh dấu đã đọc, typing indicator, lịch sử chat phân trang |
| Telemedicine (5 FR) | Tạo phòng video, tham gia call, kết thúc call, ghi chú sau call, screen sharing |
| AI nâng cao (4 FR) | Upload ảnh phân tích, RAG query, createBookingDraft, getSpecialtyRecommendation |
| Mobile (3 FR) | Push notification, Deep linking, Secure token storage |
| Testing (2 FR) | Chạy test suite, Generate coverage report |
| CI/CD (2 FR) | Auto build/test on PR, Auto deploy on merge |
| Deploy (2 FR) | Production hosting, SSL/domain configuration |

#### 3.1.2. Yêu cầu phi chức năng bổ sung (NFR06 – NFR10+)
- NFR06: Latency video call < 300ms (P2P WebRTC)
- NFR07: Message delivery < 500ms (Socket.IO)
- NFR08: Push notification delivery < 5s
- NFR09: CI/CD pipeline complete < 10 phút
- NFR10: Uptime production ≥ 99% (health check monitoring)

#### 3.1.3. Business Rules mới (BR13 – BR20+)
- BR13: BN chỉ chat được với BS đã có booking (S2/S3)
- BR14: Video call chỉ khi booking ở trạng thái S2 hoặc S5
- BR15: AI disclaimer bắt buộc kèm mọi phân tích hình ảnh y tế
- BR16: Ảnh upload cho AI ≤ 5MB, chỉ JPEG/PNG/WebP
- BR17: Chat history lưu vĩnh viễn trong DB (khác AI chat chỉ lưu client)
- BR18: Doctor notes sau video call là bắt buộc
- BR19: Push notification opt-in/opt-out per user
- BR20: Production secrets phải nằm trong GitHub Secrets, không hard-code

### 3.2. Mô hình hóa yêu cầu

#### 3.2.1. Use Case Diagram tổng thể (cập nhật)
Vẽ lại Use Case Diagram bao gồm tất cả UC cũ (UC01-UC24) + UC mới (UC25+). Thêm actor: Socket.IO Server, FCM Service, WebRTC Peer.

#### 3.2.2. Đặc tả Use Case mới

##### UC25 – Chat tin nhắn (BS ↔ BN)
Đặc tả chi tiết: trigger, pre/post conditions, basic flow, alternate/exception flow, business rules.

##### UC26 – Tạo phòng khám video (Telemedicine)
BS tạo phòng → BN nhận notification → Tham gia → Video/Audio P2P → Kết thúc → Doctor notes.

##### UC27 – Tham gia Video Call (BN)
BN click link/notification → Join room → WebRTC handshake → Video call → Kết thúc.

##### UC28 – AI phân tích hình ảnh y tế
BN upload ảnh trong chatbot → Backend nhận multimodal request → Gemini phân tích → Streaming response + disclaimer.

##### UC29 – Push Notification
Hệ thống gửi FCM notification khi: booking mới, trạng thái thay đổi, tin nhắn mới, video call invitation.

##### UC30 – Sử dụng Mobile App (Patient)
BN tải app → Đăng nhập → Trang chủ → Tìm kiếm → Đặt lịch → Thanh toán → Lịch sử → Chat → Video Call.

### 3.3. Thiết kế kiến trúc hệ thống mở rộng

#### 3.3.1. Sơ đồ kiến trúc tổng thể (cập nhật)
Vẽ lại sơ đồ kiến trúc bao gồm: Web Client, Mobile Client, Express.js API, Socket.IO Server, WebRTC Signaling, PostgreSQL, Redis, Gemini API, FCM, VNPay, ChromaDB, Nginx, Docker.

#### 3.3.2. Kiến trúc Socket.IO Server
Mô tả cách tích hợp Socket.IO vào Express.js hiện tại. Namespace: `/chat`, `/video`. Room management. JWT authentication cho WebSocket.

#### 3.3.3. Kiến trúc WebRTC
Mô tả luồng signaling (offer/answer/ICE candidates qua Socket.IO), STUN/TURN configuration, MediaStream handling.

#### 3.3.4. Kiến trúc Mobile App
Cấu trúc project React Native. Tái sử dụng Redux slices, API services. Navigation structure. Platform-specific code.

#### 3.3.5. Kiến trúc CI/CD Pipeline
Sơ đồ flow: Push → GitHub Actions → Lint → Test → Build → Docker Image → Deploy. Branch strategy (main, develop, feature/*).

#### 3.3.6. Kiến trúc RAG cho AI Chatbot
Sơ đồ: User query → Embedding → Vector Search (ChromaDB) → Augmented Prompt → Gemini API → Streaming Response.

### 3.4. Thiết kế cơ sở dữ liệu bổ sung

#### 3.4.1. ER Diagram cập nhật
Vẽ lại ER Diagram bao gồm 9 bảng cũ + bảng mới (Conversations, Messages, VideoSessions, DeviceTokens, MedicalKnowledge).

#### 3.4.2. Mô tả bảng mới

##### Bảng Conversations
| Thuộc tính | Kiểu | Mô tả |
|-----------|------|-------|
| id | INTEGER PK AI | Mã cuộc hội thoại |
| doctorId | INTEGER FK→Users NOT NULL | Bác sĩ tham gia |
| patientId | INTEGER FK→Users NOT NULL | Bệnh nhân tham gia |
| bookingId | INTEGER FK→Bookings NULL | Booking liên quan (nullable) |
| lastMessageAt | DATE | Thời điểm tin nhắn cuối |
| status | STRING DEFAULT 'active' | active/archived |
| createdAt, updatedAt | DATE | Timestamps |
> UNIQUE(doctorId, patientId)

##### Bảng Messages
| Thuộc tính | Kiểu | Mô tả |
|-----------|------|-------|
| id | INTEGER PK AI | Mã tin nhắn |
| conversationId | INTEGER FK→Conversations NOT NULL | Cuộc hội thoại |
| senderId | INTEGER FK→Users NOT NULL | Người gửi |
| senderRole | STRING NOT NULL | R2 hoặc R3 |
| content | TEXT NOT NULL | Nội dung text hoặc base64 image URL |
| messageType | STRING DEFAULT 'text' | text/image/system |
| isRead | BOOLEAN DEFAULT false | Đã đọc chưa |
| createdAt | DATE | Thời điểm gửi |
> INDEX(conversationId, createdAt)

##### Bảng VideoSessions
| Thuộc tính | Kiểu | Mô tả |
|-----------|------|-------|
| id | INTEGER PK AI | Mã phiên video |
| bookingId | INTEGER FK→Bookings NOT NULL | Booking tái khám |
| doctorId | INTEGER FK→Users NOT NULL | Bác sĩ |
| patientId | INTEGER FK→Users NOT NULL | Bệnh nhân |
| roomId | STRING UNIQUE NOT NULL | Mã phòng (UUID) |
| status | STRING DEFAULT 'waiting' | waiting/active/ended |
| startedAt | DATE NULL | Bắt đầu cuộc gọi |
| endedAt | DATE NULL | Kết thúc cuộc gọi |
| doctorNotes | TEXT NULL | Ghi chú sau cuộc gọi |
| duration | INTEGER NULL | Thời lượng (giây) |

##### Bảng DeviceTokens
| Thuộc tính | Kiểu | Mô tả |
|-----------|------|-------|
| id | INTEGER PK AI | |
| userId | INTEGER FK→Users NOT NULL | |
| token | STRING NOT NULL | FCM device token |
| platform | STRING NOT NULL | ios/android/web |
| isActive | BOOLEAN DEFAULT true | |
| createdAt, updatedAt | DATE | |
> INDEX(userId, isActive)

#### 3.4.3. Cột mới bổ sung vào bảng hiện tại
- **Bookings:** thêm `isTelemedicine` (BOOLEAN DEFAULT false), `videoSessionId` (FK→VideoSessions NULL)
- **Users:** thêm `fcmToken` (STRING NULL) — hoặc tách ra bảng DeviceTokens nếu multi-device
- **Allcodes:** thêm keyMap `S5` (Tái khám online) vào type STATUS

### 3.5. Thiết kế API mới

#### 3.5.1. API Chat (6 endpoints)
```
POST   /api/v1/chat/conversations          — Tạo/lấy conversation với BS
GET    /api/v1/chat/conversations           — Danh sách conversations
GET    /api/v1/chat/conversations/:id/messages — Lấy messages (phân trang)
POST   /api/v1/chat/conversations/:id/messages — Gửi message (REST fallback)
PUT    /api/v1/chat/messages/:id/read       — Đánh dấu đã đọc
GET    /api/v1/chat/unread-count            — Đếm tin nhắn chưa đọc
```

#### 3.5.2. API Telemedicine (5 endpoints)
```
POST   /api/v1/telemedicine/create-room     — BS tạo phòng video
GET    /api/v1/telemedicine/room/:roomId    — Lấy thông tin phòng
PUT    /api/v1/telemedicine/room/:roomId/join    — Tham gia phòng
PUT    /api/v1/telemedicine/room/:roomId/end     — Kết thúc cuộc gọi
PUT    /api/v1/telemedicine/room/:roomId/notes   — Lưu doctor notes
```

#### 3.5.3. API AI nâng cao (2 endpoints mới)
```
POST   /api/v1/ai/chat-multimodal          — Chat AI kèm ảnh (SSE)
POST   /api/v1/ai/analyze-image            — Phân tích ảnh y tế riêng
```

#### 3.5.4. API Notification (3 endpoints)
```
POST   /api/v1/notification/register-device — Đăng ký FCM token
DELETE /api/v1/notification/unregister-device — Hủy đăng ký
PUT    /api/v1/notification/preferences     — Cài đặt notification
```

#### 3.5.5. Socket.IO Events
```
Chat Namespace (/chat):
  → join_conversation, send_message, typing_start, typing_stop
  ← new_message, message_read, user_typing, user_stop_typing

Video Namespace (/video):
  → join_room, leave_room, offer, answer, ice_candidate
  ← room_joined, room_left, offer_received, answer_received, ice_candidate_received, call_ended
```

### 3.6. Thiết kế giao diện mới

#### 3.6.1. Danh sách màn hình mới (Web)
| STT | Tên | Route | Mô tả |
|-----|-----|-------|-------|
| 1 | Chat List | `/patient/chat` hoặc `/doctor-dashboard/chat` | Danh sách conversations |
| 2 | Chat Room | `/chat/:conversationId` | Giao diện chat 1-1 |
| 3 | Video Call Room | `/video-call/:roomId` | Giao diện video call |
| 4 | Video Call Waiting | (modal overlay) | Chờ đối phương tham gia |

#### 3.6.2. Danh sách màn hình Mobile App
| STT | Tên | Screen | Mô tả |
|-----|-----|--------|-------|
| 1 | Splash Screen | SplashScreen | Logo + loading |
| 2 | Login | LoginScreen | Đăng nhập email/MK |
| 3 | Register | RegisterScreen | Đăng ký BN |
| 4 | Home | HomeScreen (Tab) | Trang chủ: CK, BS, PK |
| 5 | Search | SearchScreen | Tìm kiếm tổng hợp |
| 6 | Doctor Detail | DoctorDetailScreen | Chi tiết BS + lịch |
| 7 | Booking Modal | BookingModal | Form đặt lịch |
| 8 | Payment WebView | PaymentScreen | VNPay WebView |
| 9 | History | HistoryScreen (Tab) | Lịch sử khám |
| 10 | Profile | ProfileScreen (Tab) | Hồ sơ cá nhân |
| 11 | Chat List | ChatListScreen (Tab) | Danh sách chat |
| 12 | Chat Room | ChatRoomScreen | Chat 1-1 với BS |
| 13 | Video Call | VideoCallScreen | Video call toàn màn hình |
| 14 | AI Chatbot | AIChatScreen | AI chatbot + upload ảnh |
| 15 | Notifications | NotificationsScreen | Danh sách thông báo |
| 16 | Settings | SettingsScreen | Cài đặt ngôn ngữ, notification |

#### 3.6.3. Wireframe / Mockup
Mô tả layout chính cho: Chat UI (bubble message, input bar, attachment button), Video Call UI (2 video streams, controls bar, end call button), Mobile Navigation (bottom tab bar, stack navigator).

### 3.7. Sequence Diagrams cho luồng mới

#### 3.7.1. Sequence Diagram – Chat BS ↔ BN
Patient → Frontend → Socket.IO → Backend → DB → Socket.IO → Doctor Frontend.

#### 3.7.2. Sequence Diagram – Video Call (Telemedicine)
Doctor → Create Room → Socket.IO Signaling → Patient Join → WebRTC Offer/Answer → ICE Candidates → P2P Video → End Call → Doctor Notes → Update Booking.

#### 3.7.3. Sequence Diagram – AI Multimodal (Image Analysis)
Patient → Upload Image → Backend → Gemini Multimodal API → RAG Lookup (ChromaDB) → Streaming SSE → Frontend Render + Disclaimer.

#### 3.7.4. Sequence Diagram – Push Notification
Backend Event → Notification Service → FCM API → Device (iOS/Android) → User Tap → Deep Link → App Screen.

#### 3.7.5. Sequence Diagram – CI/CD Pipeline
Developer Push → GitHub Actions Trigger → Lint → Unit Test → Build → Docker Push → SSH Deploy → Health Check → Notification.

---

## CHƯƠNG 4 – TRIỂN KHAI ỨNG DỤNG (~30 trang)

### 4.1. Thiết lập Testing & CI/CD (Sprint 1-2)

#### 4.1.1. Cấu hình Jest + Supertest cho Backend
Setup test environment, test database (SQLite in-memory), mock services (VNPay, Nodemailer, Gemini).

#### 4.1.2. Kết quả Unit Test Backend
Bảng test suites và test cases, code coverage report (target ≥ 60%).

#### 4.1.3. Kết quả Integration Test Backend
Bảng test API endpoints (Auth, Booking, Payment, Doctor, Patient, AI, Search).

#### 4.1.4. Cấu hình Jest + React Testing Library cho Frontend
Setup test environment cho Vite + React, mock Redux store.

#### 4.1.5. Kết quả Unit Test Frontend
Bảng test components, code coverage report (target ≥ 40%).

#### 4.1.6. Thiết lập GitHub Actions CI/CD
Mô tả workflow files (.github/workflows/), stages, secrets, caching strategy.

#### 4.1.7. Demo CI/CD Pipeline
Screenshots pipeline chạy thành công: lint pass, test pass, build pass, deploy pass.

### 4.2. Deploy Production (Sprint 2-3)

#### 4.2.1. Cấu hình VPS Server
Mô tả server specs, OS setup (Ubuntu), Docker installation, firewall (UFW).

#### 4.2.2. Deploy bằng Docker Compose
Sử dụng docker-compose.yml đã chuẩn bị từ Đồ án 1. Cấu hình environment variables production.

#### 4.2.3. Cấu hình Domain + SSL
Setup Cloudflare DNS, SSL certificates, Nginx reverse proxy configuration.

#### 4.2.4. Monitoring & Backup
PM2 process manager, health check endpoints, database backup cronjob (pg_dump).

#### 4.2.5. Demo Production URL
Screenshots hệ thống chạy trên production URL thực tế.

### 4.3. Chat tin nhắn BS ↔ BN (Sprint 3-4)

#### 4.3.1. Backend: Socket.IO Server Setup
Tích hợp Socket.IO vào Express.js. JWT authentication middleware cho WebSocket. Namespace /chat.

#### 4.3.2. Backend: Chat API & Message Service
Sequelize models (Conversations, Messages), CRUD services, pagination, unread count.

#### 4.3.3. Frontend Web: Chat UI Component
Chat sidebar/drawer, message bubble, typing indicator, image upload, real-time updates.

#### 4.3.4. Bảo mật Chat
Chỉ participants truy cập conversation (IDOR prevention), rate limiting messages, content sanitization.

#### 4.3.5. Demo chức năng Chat
Screenshots giao diện chat, luồng gửi/nhận tin nhắn real-time.

### 4.4. Ứng dụng Mobile (Sprint 3-6)

#### 4.4.1. Khởi tạo Project React Native
Setup Expo/CLI, cấu trúc thư mục, cài đặt dependencies.

#### 4.4.2. Navigation & Authentication
React Navigation (Stack + Bottom Tab), login flow, JWT secure storage.

#### 4.4.3. Trang chủ & Tìm kiếm
Home screen (carousels: CK, BS, PK), search screen.

#### 4.4.4. Chi tiết BS & Đặt lịch
Doctor detail screen, schedule picker, booking modal, VNPay WebView.

#### 4.4.5. Patient Portal (Hồ sơ, Lịch sử, Đánh giá)
Profile screen, history screen (tabs), review modal.

#### 4.4.6. Chat trên Mobile
Chat list screen, chat room screen (reuse Socket.IO events).

#### 4.4.7. AI Chatbot trên Mobile
AI chat screen, image picker (camera/gallery), streaming response display.

#### 4.4.8. Push Notification
Firebase Cloud Messaging setup, token registration, notification handling (foreground/background).

#### 4.4.9. Deep Linking
Cấu hình app links (Android) / universal links (iOS) cho email verification.

#### 4.4.10. Đa ngôn ngữ Mobile
Reuse translation files (vi.json, en.json), react-native-localize.

#### 4.4.11. Demo ứng dụng Mobile
Screenshots từng màn hình chính trên iOS/Android emulator hoặc thiết bị thật.

### 4.5. Telemedicine – Video Call (Sprint 5-6)

#### 4.5.1. Backend: WebRTC Signaling Server
Socket.IO namespace /video, room management, offer/answer/ICE forwarding.

#### 4.5.2. Backend: VideoSession Service
Sequelize model, create room, join, end, save doctor notes.

#### 4.5.3. Frontend Web: Video Call UI
Camera/mic permission, local/remote video streams, controls (mute, camera off, end call, screen share).

#### 4.5.4. Mobile: Video Call UI
react-native-webrtc integration, full-screen video, floating controls.

#### 4.5.5. STUN/TURN Configuration
Free STUN servers (Google), TURN server setup (nếu cần, Twilio hoặc self-hosted coturn).

#### 4.5.6. Booking State Machine cập nhật
Thêm trạng thái S5 (Tái khám online). Sơ đồ state machine cập nhật.

#### 4.5.7. Demo Video Call
Screenshots/video capture luồng video call từ BS tạo phòng → BN tham gia → Cuộc gọi → Kết thúc → Doctor notes.

### 4.6. AI Chatbot nâng cao (Sprint 6-7)

#### 4.6.1. Gemini Multimodal Integration
Cập nhật aiController.js hỗ trợ image input. Base64 image processing, MIME validation, size limit.

#### 4.6.2. RAG Pipeline Setup
Knowledge base y tế (JSON/CSV → Embeddings → ChromaDB). LangChain.js retrieval chain.

#### 4.6.3. Function Calling mới
createBookingDraft, getSpecialtyRecommendation. Mô tả handler implementation.

#### 4.6.4. Medical Disclaimer System
Auto-append disclaimer, severity detection, emergency redirect.

#### 4.6.5. Demo AI nâng cao
Screenshots: BN upload ảnh da liễu → AI phân tích → Gợi ý chuyên khoa → Link đặt lịch.

### 4.7. Mô tả các màn hình sau triển khai
Screenshots tổng hợp tất cả màn hình mới (Web + Mobile) với mô tả ngắn.

---

## CHƯƠNG 5 – KẾT LUẬN (~6 trang)

### 5.1. Kết quả đạt được

#### 5.1.1. So sánh Đồ án 1 vs Đồ án 2
Bảng so sánh trước/sau: số chức năng, số API, số bảng DB, nền tảng (web only → web + mobile), test coverage, deployment status.

#### 5.1.2. Thống kê kỹ thuật
Tổng số: dòng code, test cases, API endpoints, database tables, Docker containers, CI/CD workflows.

### 5.2. Kiến thức thu hoạch được

#### 5.2.1. Về lý thuyết
WebRTC, real-time communication, CI/CD, software testing methodology, cloud deployment.

#### 5.2.2. Về công nghệ
React Native, Socket.IO, WebRTC API, Jest/Supertest, GitHub Actions, Docker production deployment, AI multimodal, RAG.

#### 5.2.3. Về AI
Gemini multimodal, RAG pipeline, prompt engineering cho y tế, responsible AI (disclaimer, bias awareness).

### 5.3. Ưu điểm
Liệt kê ưu điểm nổi bật của hệ thống sau Đồ án 2.

### 5.4. Hạn chế
Các hạn chế còn tồn tại (nếu có): tính năng chưa hoàn thiện, performance chưa tối ưu, v.v.

### 5.5. Hướng phát triển tương lai
- Horizontal scaling (Kubernetes)
- Tích hợp BHYT (bảo hiểm y tế)
- Tích hợp Google Calendar / Apple Calendar
- E-prescription (đơn thuốc điện tử)
- Multi-tenant cho nhiều bệnh viện/phòng khám

---

## TÀI LIỆU THAM KHẢO (~2 trang)
Danh sách tài liệu tham khảo (kế thừa 23 ref từ Đồ án 1 + bổ sung ~10 ref mới cho WebRTC, Socket.IO, React Native, Jest, GitHub Actions, Cloudflare, v.v.)

---

## PHỤ LỤC (~5 trang)

### Phụ lục A: Bảng phân công nhiệm vụ (chi tiết)
### Phụ lục B: Kế hoạch Gantt chi tiết
### Phụ lục C: Hướng dẫn cài đặt và chạy dự án (Setup Guide)
### Phụ lục D: Kết quả test coverage report
### Phụ lục E: API Documentation (Swagger/Postman collection)
