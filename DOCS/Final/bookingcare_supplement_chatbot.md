# BÁO CÁO ĐỒ ÁN 1 – BOOKINGCARE
# BỔ SUNG PHẦN 1: AI CHATBOT

---

## [BỔ SUNG C1.3 – PHẠM VI: CHỨC NĂNG AI CHATBOT]

### Vai trò: Bệnh nhân (Patient – R3) – Bổ sung AI Chatbot

| STT | Chức năng |
|-----|-----------|
| 9 | Hỏi đáp AI Chatbot: tư vấn triệu chứng, gợi ý chuyên khoa phù hợp |
| 10 | Tra cứu bác sĩ qua AI: tìm bác sĩ theo chuyên khoa, xem giá khám |
| 11 | Xem lịch khám còn trống qua AI: hỏi khung giờ trống của bác sĩ |
| 12 | Tra cứu phòng khám qua AI: hỏi thông tin, địa chỉ phòng khám |
| 13 | Xem trạng thái lịch hẹn qua AI: hỏi trạng thái booking, thanh toán |
| 14 | Hướng dẫn sử dụng hệ thống qua AI: đặt lịch, thanh toán VNPay |

### Vai trò: Khách (Guest) – Bổ sung

| STT | Chức năng |
|-----|-----------|
| 11 | Xem widget Chatbot (yêu cầu đăng nhập để sử dụng) |

---

## [BỔ SUNG C1.6 – CÔNG NGHỆ SỬ DỤNG: AI/ML]

### AI / Machine Learning

| Công nghệ | Phiên bản | Mô tả |
|-----------|-----------|-------|
| Google Gemini API | gemini-2.0-flash | Mô hình ngôn ngữ lớn (LLM) của Google DeepMind, dùng làm bộ não AI Chatbot |
| @google/generative-ai | (npm SDK) | SDK chính thức của Google để tích hợp Gemini API vào Node.js |
| localForage | (npm) | Thư viện lưu trữ chat history phía client qua IndexedDB (cấm localStorage) |
| DOMPurify | 3.3.3 | Sanitize HTML output từ Markdown AI response (chống XSS) |
| react-markdown | 10.1.0 | Render Markdown response từ AI thành React component |
| remark-gfm | (npm) | Plugin GitHub Flavored Markdown cho react-markdown |
| @tailwindcss/typography | (devDep) | Plugin prose class cho styling Markdown output |

### Phương pháp triển khai AI Chatbot

| Hạng mục | Giá trị |
|----------|---------|
| Kiến trúc giao tiếp | SSE (Server-Sent Events) qua `fetch()` — streaming response real-time |
| Function Calling | 6 hàm Read-Only (Gemini tự gọi DB qua Sequelize) — 4 Public + 2 Authenticated |
| History Management | Sliding Window 2500 ký tự — cắt tin cũ, giữ tin mới |
| Bảo mật | PII Masking (che email, SĐT), Kill-Switch, Max 15 concurrent streams, Hard Timeout 60s |
| maxOutputTokens | 500 tokens (~250-350 từ tiếng Việt) — chống Token Inflation |
| Lưu trữ client | localForage (IndexedDB only) + In-memory fallback cho Safari Private Mode |

---

## [BỔ SUNG CƠ SỞ LÝ THUYẾT – CHƯƠNG 2: AI CHATBOT]

### 2.11. Google Gemini API

**Giới thiệu:** Google Gemini là mô hình ngôn ngữ lớn (Large Language Model – LLM) thế hệ mới do Google DeepMind phát triển, kế thừa và vượt trội hơn Google Bard/PaLM. Gemini hỗ trợ đa phương thức (text, image, audio, video) và có nhiều phiên bản phù hợp cho các nhu cầu khác nhau. Trong BookingCare, phiên bản `gemini-2.0-flash` được sử dụng để xây dựng AI Chatbot hỗ trợ bệnh nhân tra cứu thông tin y tế, tìm kiếm bác sĩ, và hướng dẫn sử dụng hệ thống.

**Ưu điểm:**
- Hỗ trợ Function Calling tích hợp, cho phép AI tự động gọi hàm truy vấn database để trả lời chính xác dựa trên dữ liệu thực
- Phiên bản `flash` có tốc độ phản hồi nhanh, chi phí thấp, phù hợp cho ứng dụng chatbot real-time
- Hỗ trợ streaming response qua SDK, cho phép hiển thị câu trả lời từng phần (typewriter effect) trên giao diện

**Nhược điểm:**
- Phụ thuộc vào dịch vụ cloud của Google, cần kết nối internet ổn định
- Tiếng Việt tiêu hao token gấp 1.5-2x so với tiếng Anh do Unicode và dấu, cần giới hạn maxOutputTokens cẩn thận
- Có nguy cơ hallucination (bịa thông tin), cần System Prompt chặt chẽ và Function Calling để kiểm soát

### 2.12. Server-Sent Events (SSE)

**Giới thiệu:** Server-Sent Events (SSE) là cơ chế giao tiếp một chiều từ server đến client qua HTTP, cho phép server đẩy dữ liệu real-time mà client không cần liên tục gửi request (polling). Trong BookingCare, SSE được sử dụng để stream phản hồi AI Chatbot từ backend đến frontend, tạo hiệu ứng "gõ chữ" tự nhiên (typewriter effect) khi AI trả lời.

**Ưu điểm:**
- Đơn giản hơn WebSocket, chỉ cần HTTP/1.1, không cần protocol upgrade
- Tự động reconnect khi mất kết nối (built-in browser behavior)
- Phù hợp cho luồng dữ liệu một chiều (server → client) như streaming AI response

**Nhược điểm:**
- Chỉ hỗ trợ giao tiếp một chiều (server → client), không phù hợp cho giao tiếp hai chiều
- Cần cấu hình Nginx cẩn thận (tắt proxy_buffering, tcp_nodelay) để tránh delay
- Giới hạn số lượng kết nối đồng thời trên mỗi domain (6 connections/domain trên HTTP/1.1)

### 2.13. Function Calling (AI Tool Use)

**Giới thiệu:** Function Calling là tính năng của các LLM hiện đại cho phép AI tự động nhận diện khi nào cần gọi hàm bên ngoài để lấy dữ liệu thực, thay vì tự bịa câu trả lời. Trong BookingCare, 6 hàm Function Calling (read-only) được khai báo cho Gemini: tìm bác sĩ theo chuyên khoa, xem lịch khám trống, xem thông tin phòng khám, xem chi tiết bác sĩ, xem lịch hẹn cá nhân, và xem trạng thái thanh toán.

**Ưu điểm:**
- Chống hallucination hiệu quả: AI trả lời dựa trên dữ liệu thực từ database, không bịa
- Tích hợp tự nhiên với hệ thống hiện có: sử dụng trực tiếp Sequelize models đã có
- Linh hoạt: AI tự quyết định khi nào cần gọi hàm nào dựa trên câu hỏi người dùng

**Nhược điểm:**
- Tăng độ trễ phản hồi: mỗi Function Call thêm 1 vòng lặp AI → DB → AI
- Cần thiết kế bảo mật cẩn thận: tất cả hàm phải Read-Only, có PII Masking, giới hạn LIMIT 5

---

## [BỔ SUNG D3.5.1 – YÊU CẦU CHỨC NĂNG: AI CHATBOT]

| STT | Mã YC | Chức năng | Actor | Mô tả |
|-----|-------|-----------|-------|-------|
| 32 | FR32 | Hỏi đáp AI Chatbot | Patient | Gửi câu hỏi tự nhiên, nhận trả lời streaming từ AI Gemini |
| 33 | FR33 | Tra cứu bác sĩ qua AI | Patient | AI tự động gọi Function Calling tìm bác sĩ theo chuyên khoa |
| 34 | FR34 | Xem lịch khám trống qua AI | Patient | AI tra cứu schedule còn slot trống theo bác sĩ và ngày |
| 35 | FR35 | Tra cứu phòng khám qua AI | Patient | AI tìm thông tin phòng khám theo tên |
| 36 | FR36 | Xem lịch hẹn cá nhân qua AI | Patient | AI truy vấn booking của bệnh nhân đang đăng nhập (authenticated) |
| 37 | FR37 | Xem trạng thái thanh toán qua AI | Patient | AI kiểm tra paymentStatus của booking gần nhất |
| 38 | FR38 | Lưu lịch sử chat | Patient | Chat history lưu vào IndexedDB (localForage), tối đa 50 tin nhắn |

---

## [BỔ SUNG D3.6 – USE CASE AI CHATBOT]

### a) Danh sách Use Case mới

| STT | Mã UC | Tên Use Case | Mã Actor | Mô tả |
|-----|-------|-------------|----------|-------|
| 22 | UC22 | Hỏi đáp AI Chatbot | AC02 | BN gửi câu hỏi, AI trả lời streaming với Function Calling |
| 23 | UC23 | Tra cứu bác sĩ qua AI | AC02 | BN hỏi AI về bác sĩ chuyên khoa, AI gọi DB trả kết quả |
| 24 | UC24 | Xem lịch hẹn qua AI | AC02 | BN hỏi trạng thái booking, AI tra cứu DB cá nhân |

### b) Đặc tả Use Case chi tiết

#### UC22 – Hỏi đáp AI Chatbot

| Mục | Nội dung |
|-----|---------|
| **Use Case ID** | UC22 |
| **Use Case Name** | Hỏi đáp AI Chatbot |
| **Description** | Bệnh nhân gửi câu hỏi tự nhiên, AI Chatbot trả lời real-time qua SSE streaming |
| **Actor(s)** | AC02 (Patient) |
| **Priority** | Trung bình |
| **Trigger** | BN click icon Chatbot ở góc phải màn hình, mở widget chat |
| **Pre-condition(s)** | BN đã đăng nhập (role R3); AI_CHATBOT_ENABLED=true; Server có slot (<15 concurrent streams) |
| **Post-condition(s)** | Câu trả lời hiển thị streaming trên widget; Chat history lưu vào IndexedDB |
| **Basic Flow** | 1. BN mở widget Chatbot → 2. Nhập câu hỏi → 3. Frontend gửi POST /api/v1/ai/chat (SSE) → 4. Backend kiểm tra Kill-Switch, concurrent limit, auth → 5. Cắt message 2500 ký tự, làm sạch Zalgo → 6. Gửi đến Gemini API với System Prompt + History → 7. Nếu Gemini yêu cầu Function Call → gọi DB handler → trả kết quả cho Gemini → 8. Stream response chunks qua SSE → 9. Frontend render Markdown real-time → 10. Khi stream kết thúc ([DONE]) → lưu vào IndexedDB |
| **Alternate Flow** | Câu hỏi ngoài phạm vi → AI từ chối lịch sự; Gemini gọi Function Call (tối đa 3 lần/câu hỏi) |
| **Exception Flow** | Kill-Switch tắt → HTTP 503; Server quá tải (≥15 streams) → HTTP 503; Timeout 60s → [TIMEOUT]; Gemini rate limit (429) → "AI đang quá tải"; API Key invalid (403) → Hard Stop "Đang bảo trì" |
| **Business Rules** | Cấm chẩn đoán y khoa; Cấm bịa thông tin; Che PII (email, SĐT); Function Calling read-only |
| **NFR** | NFR01 (Bảo mật), NFR02 (Hiệu suất) |

#### UC23 – Tra cứu bác sĩ qua AI

| Mục | Nội dung |
|-----|---------|
| **Use Case ID** | UC23 |
| **Use Case Name** | Tra cứu bác sĩ theo chuyên khoa qua AI |
| **Description** | BN hỏi AI về bác sĩ chuyên khoa, AI tự động gọi Function Calling truy vấn DB |
| **Actor(s)** | AC02 (Patient) |
| **Priority** | Trung bình |
| **Trigger** | BN nhập câu hỏi như "Tìm bác sĩ tim mạch" trong widget Chatbot |
| **Pre-condition(s)** | BN đã đăng nhập; Chatbot đang hoạt động |
| **Post-condition(s)** | AI trả về danh sách bác sĩ (tên, chức vụ, phòng khám, giá) từ DB thực |
| **Basic Flow** | 1. BN hỏi "Có bác sĩ chuyên khoa tim mạch nào không?" → 2. Gemini nhận diện cần Function Call `searchDoctorsBySpecialty` → 3. Backend gọi handler: sanitize tên CK, LIKE query, LIMIT 5 → 4. Trả kết quả bọc delimiter `---DB_RESULT---` → 5. Gemini tổng hợp và trả lời tự nhiên bằng Markdown → 6. Frontend render danh sách bác sĩ |
| **Exception Flow** | Không tìm thấy chuyên khoa → AI nói "Không tìm thấy"; DB lỗi → "Lỗi truy vấn dữ liệu" |
| **Business Rules** | LIMIT 5 bác sĩ/query; Không trả image BLOB; Sanitize SQL wildcard (%_); Truncate 3000 chars |
| **NFR** | NFR01, NFR02 |

---

## [BỔ SUNG D3.7.1 – KIẾN TRÚC: AI CHATBOT]

AI Chatbot tích hợp ở **cả Frontend và Backend**:

```
┌─────────────────────────────────────────────────────────────┐
│  FRONTEND (React)                                            │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  <AIChatbot> Widget (góc phải dưới màn hình)          │  │
│  │  ├── ChatInput.jsx — Input + Submit (onMouseDown)     │  │
│  │  ├── MessageItem.jsx — Markdown render (React.memo)   │  │
│  │  └── useChatStorage.js — localForage (IndexedDB)      │  │
│  └──────────────────┬─────────────────────────────────────┘  │
│                     │ POST /api/v1/ai/chat (SSE fetch)       │
└─────────────────────┼───────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  BACKEND (Express.js)                                        │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  aiController.js — SSE Controller (29 guards)          │  │
│  │  ├── Kill-Switch check                                │  │
│  │  ├── Concurrent stream limit (15)                     │  │
│  │  ├── Hard Timeout (60s)                               │  │
│  │  ├── Heartbeat (15s)                                  │  │
│  │  └── Function Calling Loop (max 3 rounds)             │  │
│  └──────────────────┬─────────────────────────────────────┘  │
│                     │                                        │
│  ┌──────────────────▼─────────────────────────────────────┐  │
│  │  aiFunctionHandlers.js — 6 DB Handlers (Read-Only)     │  │
│  │  ├── searchDoctorsBySpecialty (Specialty → Doctor_Info) │  │
│  │  ├── getAvailableSchedules (Schedule → Allcode)        │  │
│  │  ├── getClinicInfo (Clinic)                            │  │
│  │  ├── getDoctorDetail (User → Doctor_Info → Allcode)    │  │
│  │  ├── getMyBookings (Booking — authenticated)           │  │
│  │  └── getMyPaymentStatus (Booking — authenticated)      │  │
│  └──────────────────┬─────────────────────────────────────┘  │
│                     │                                        │
│  ┌──────────────────▼─────────────────────────────────────┐  │
│  │  aiService.js — Gemini SDK Initialization              │  │
│  │  Model: gemini-2.0-flash | maxTokens: 500 | temp: 0.7 │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────┬──────────────────────────────────────────┘
                   │ HTTPS
                   ▼
┌──────────────────────────┐
│  Google Gemini API       │
│  (External Cloud Service)│
└──────────────────────────┘
```

---

## [BỔ SUNG D3.7.2 – BẢNG THÀNH PHẦN: AI CHATBOT]

| STT | Thành phần | Mô tả |
|-----|-----------|-------|
| 14 | AI Chatbot Widget (FE) | React component `<AIChatbot>` — widget overlay góc phải, SSE client, Markdown render, IndexedDB storage |
| 15 | AI Controller (BE) | `aiController.js` — SSE streaming controller với 29 guards bảo mật |
| 16 | AI Function Handlers (BE) | `aiFunctionHandlers.js` — 6 hàm Read-Only truy vấn DB cho Function Calling |
| 17 | AI Service (BE) | `aiService.js` — Khởi tạo Gemini SDK, System Prompt, History utils |
| 18 | Google Gemini API | Dịch vụ AI bên ngoài (cloud), model gemini-2.0-flash |

---

## [BỔ SUNG D3.8 – THIẾT KẾ DỮ LIỆU: AI CHATBOT]

**Chatbot KHÔNG lưu lịch sử vào Database (Stateless backend).**

**Lý do thiết kế:**
- Lịch sử chat chỉ lưu **phía client** bằng `localForage` (IndexedDB), tối đa 50 tin nhắn per user.
- Backend không lưu conversation log vào MySQL để tránh tăng kích thước database và bảo vệ quyền riêng tư bệnh nhân.
- Khi đăng xuất hoặc xóa browser data, lịch sử chat bị xóa (by design — không giữ dữ liệu nhạy cảm).
- History được gửi kèm mỗi request (Sliding Window 2500 ký tự) để Gemini duy trì ngữ cảnh hội thoại.

**Fallback:** Nếu IndexedDB không khả dụng (Safari Private Mode), tự động lùi về In-memory Storage — lịch sử mất khi đóng tab.

---

## [BỔ SUNG D3.9.1 – MÀN HÌNH: AI CHATBOT]

| STT | Tên màn hình | Route | Mô tả |
|-----|-------------|-------|-------|
| 23 | AI Chatbot Widget | Widget overlay (góc phải dưới) | Nút tròn mở widget chat. Khi mở: khung chat với header, vùng tin nhắn (scroll), ô nhập text + nút gửi. Tin nhắn AI render Markdown (bold, bullet, link). Hiệu ứng streaming (typewriter). Responsive trên mobile (visualViewport API). |

---

## [BỔ SUNG E4 – TRIỂN KHAI: AI CHATBOT]

### Cấu hình AI API

- **API Key:** Biến môi trường `GEMINI_API_KEY` trong file `.env` backend. Không hard-code trong source code.
- **Kill-Switch:** Biến `AI_CHATBOT_ENABLED=true/false` — tắt hoàn toàn chatbot mà không cần deploy lại.

### Rate Limiting và bảo vệ

- **Concurrent Streams:** Tối đa 15 stream đồng thời per server instance. Khi đạt giới hạn → HTTP 503.
- **Hard Timeout:** 60 giây per request. Sau 60s → AbortController hủy stream.
- **Function Call Limit:** Tối đa 3 lần gọi DB per câu hỏi (chống loop vô hạn).
- **Message Limit:** Input cắt tối đa 2500 ký tự. Body limit riêng 10KB cho endpoint AI.
- **Heartbeat:** SSE heartbeat mỗi 15 giây giữ kết nối sống, tránh Nginx/proxy cắt.

### Streaming Response

- **Backend:** Sử dụng `res.write()` với SSE format (`data: {...}\n\n`). Xử lý backpressure (await drain). Gửi `[DONE]` khi kết thúc.
- **Frontend:** Sử dụng `fetch()` với `ReadableStream` (cấm `EventSource` vì không hỗ trợ POST + custom headers). Functional state update (`setText(prev => prev + chunk)`) chống React Concurrent Tearing.

### Giao diện Chatbot

Widget AI Chatbot hiển thị dưới dạng nút tròn ở góc phải dưới màn hình. Khi click, mở khung chat overlay với header (tiêu đề + nút đóng), vùng hiển thị tin nhắn có scroll tự động, và ô nhập text phía dưới. Tin nhắn AI được render dưới dạng Markdown (hỗ trợ bold, italic, bullet list, link) với hiệu ứng streaming typewriter. Trên mobile, widget tự điều chỉnh theo bàn phím ảo nhờ `visualViewport` API.
