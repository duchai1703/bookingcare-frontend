# PHASE 12 — TÍCH HỢP AI CHATBOT THÔNG MINH

## Tài liệu Kiến trúc Tích hợp AI — BookingCare

> **Version:** 1.0 | **Ngày:** 2026-05-11 | **Tác giả:** CSA / CSO / Master Technical Writer
> **Dựa trên:** Phase 1–11 Full-Stack Legacy + Phase 13 Docker Infrastructure
> **Tiền đề:** React 18 Concurrent · Express 5.2 · Sequelize 6.37 · MySQL · Redux Toolkit + Persist · Vite · Tailwind 3.4

---

> [!CAUTION]
> **LỆNH CẤM TUYỆT ĐỐI:** Tài liệu này KHÔNG sinh code cấu hình Nginx, Dockerfile. Mọi chỉ thị hạ tầng reverse-proxy được **BÀN GIAO (HOOK)** sang Phase 13. Code trong tài liệu chỉ mang tính minh họa kiến trúc AI Chatbot.

---

# PHẦN 1: MỤC TIÊU & BÀN GIAO HẠ TẦNG (HOOKS)

## 1.1 — Mục tiêu

Tích hợp AI Chatbot sử dụng Google Gemini API vào hệ sinh thái BookingCare, cho phép bệnh nhân (R3) hỏi đáp về:

- Thông tin bác sĩ, chuyên khoa, phòng khám (tra cứu DB thực)
- Trạng thái lịch hẹn, lịch khám còn trống (Function Calling → Sequelize)
- Thông tin thanh toán VNPay (chỉ đọc, che PII)
- Hướng dẫn sử dụng hệ thống (i18n: Vi/En)

**Ràng buộc kiến trúc:**

| Hạng mục | Giá trị |
|---|---|
| Model AI | `gemini-2.0-flash` (hoặc `gemini-1.5-flash`) |
| maxOutputTokens | `500` |
| Giao tiếp FE ↔ BE | SSE (Server-Sent Events) qua `fetch()` — **CẤM `EventSource`** |
| Lưu trữ History FE | `localForage` + Custom Storage Wrapper (Fallback In-memory) |
| Kill-Switch | Biến `process.env.AI_CHATBOT_ENABLED` — tắt = trả `503` ngay |
| Max Concurrent Streams | `15` per server instance |
| Hard Timeout | `60s` per request |

## 1.2 — Cài đặt thư viện

### Backend

```bash
npm install @google/generative-ai uuid
```

- `@google/generative-ai` — Google Gemini SDK chính thức
- `uuid` — **ĐÃ CÓ SẴN** trong project (dùng ở `patientService.js` dòng 4: `const { v4: uuidv4 } = require('uuid');`)

### Frontend

```bash
npm install localforage dompurify react-markdown remark-gfm
npm install -D @tailwindcss/typography
```

- `localforage` — Quy tắc lưu trữ Chat History:
  - 🚫 **CẤM TUYỆT ĐỐI:** Sử dụng `localStorage` trực tiếp (gây block Main Thread).
  - ✅ **BẮT BUỘC:** Sử dụng thư viện `localForage` và ép `driver: [localforage.INDEXEDDB]`.
  - 🔄 **FALLBACK:** Phải bọc trong `try...catch` để tự động lùi về In-memory Storage nếu Safari Private Mode khóa Quota.
- `dompurify` — Sanitize HTML output từ Markdown renderer
- `react-markdown` + `remark-gfm` — Render Markdown AI response
- `@tailwindcss/typography` — Plugin `prose` class cho Markdown styling

### Biến môi trường (.env Backend)

```env
GEMINI_API_KEY=your-gemini-api-key
AI_CHATBOT_ENABLED=true
```

## 1.3 — Kill-Switch

```javascript
// Đặt ĐẦU TIÊN trong route handler AI
if (process.env.AI_CHATBOT_ENABLED !== 'true') {
  return res.status(503).json({
    errCode: -5,
    message: 'Tính năng AI Chatbot đang tạm ngưng.',
  });
}
```

> [!IMPORTANT]
> Kill-Switch kiểm tra **TRƯỚC** mọi logic khác. Khi `AI_CHATBOT_ENABLED=false`, toàn bộ endpoint AI trả `503` ngay lập tức mà KHÔNG khởi tạo Gemini SDK, KHÔNG mở SSE stream, KHÔNG truy vấn DB.

## 1.4 — HOOK BÀN GIAO CHO PHASE 13 (Nginx Configuration)

> [!WARNING]
> Các chỉ thị dưới đây **BẮT BUỘC** được cấu hình trong Nginx (Phase 13). Phase 12 chỉ **LIỆT KÊ YÊU CẦU**, không sinh file `nginx.conf`.

### 1.4.1 — Chỉ thị SSE bắt buộc

| Chỉ thị Nginx | Giá trị | Lý do |
|---|---|---|
| `proxy_buffering` | `off` | Tắt buffer Nginx, cho phép chunk SSE chảy real-time về client |
| `proxy_http_version` | `1.1` | Bắt buộc HTTP/1.1 cho SSE (HTTP/2 multiplexing gây lỗi) |
| `Connection` | `""` | Xóa header `Connection: close` mặc định của proxy |
| `tcp_nodelay` | `on` | **[BẢO ĐẢM 1]** Bẻ gãy thuật toán Nagle — ép tầng TCP Linux gửi từng gói tin SSE nhỏ ngay lập tức, không gom lại. Nếu thiếu → delay 200ms giữa các chunk |
| `proxy_read_timeout` | `3600s` | Giữ kết nối SSE tối đa 1 giờ (Nginx mặc định 60s sẽ cắt stream) |
| `proxy_send_timeout` | `3600s` | Đồng bộ timeout chiều gửi |

### 1.4.2 — Chỉ thị bảo mật bắt buộc

| Chỉ thị Nginx | Giá trị | Lý do |
|---|---|---|
| `large_client_header_buffers` | `4 32k` | Chống Nginx 400 khi header JWT + Cookie quá dài |
| `listen` | `443 ssl http2` | BẮT BUỘC dùng `listen 443 ssl http2;` cho toàn bộ server. Giao thức HTTP/2 Multiplexing là điều kiện tiên quyết để hỗ trợ hàng ngàn luồng SSE trên một kết nối TCP duy nhất, chống tắc nghẽn trình duyệt. Nginx tự động fallback HTTP/1.1 cho SSE khi cần thiết |
| `keepalive` (upstream) | `64` | Chống cạn kiệt cổng TCP nội bộ Docker (Port Exhaustion) |
| `Access-Control-Max-Age` | `86400` | Cache CORS Preflight 24h — chống DDoS Preflight |
| `Content-Security-Policy` | `default-src 'self'; script-src 'self'` | Lá chắn Zero-Day XSS |
| Anti IP-Spoofing | `set_real_ip_from` + `real_ip_header` | Lấy IP thật từ Cloudflare/Load Balancer |

### 1.4.3 — Lý giải kỹ thuật: tcp_nodelay vs proxy_buffering

```
┌─────────────────────────────────────────────────────────┐
│  [BẢO ĐẢM 1: TCP NAGLE'S ALGORITHM DELAY PREVENT]      │
│                                                          │
│  proxy_buffering off  → Tắt buffer ở tầng APPLICATION   │
│  tcp_nodelay on       → Tắt gom gói ở tầng TCP/KERNEL   │
│                                                          │
│  CHỈ tắt proxy_buffering là CHƯA ĐỦ!                    │
│  Kernel Linux vẫn áp dụng Nagle's Algorithm gom các      │
│  gói tin TCP nhỏ (<MSS) lại trước khi gửi.              │
│  → Gây delay ~200ms giữa các chunk SSE                   │
│  → Chữ AI không chảy real-time mà "nhảy cóc"            │
│                                                          │
│  tcp_nodelay on; BẮT BUỘC để ép TCP gửi ngay từng byte  │
└─────────────────────────────────────────────────────────┘
```

---

# PHẦN 2: THIẾT LẬP BỘ NÃO AI (GUARDRAILS, LIMITS & SYSTEM KNOWLEDGE)

## 2.1 — Khởi tạo Gemini SDK

```javascript
// src/services/aiService.js
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash',
  generationConfig: {
    maxOutputTokens: 500,   // Giới hạn cứng — chống Token Inflation tiếng Việt
    temperature: 0.7,       // Cân bằng sáng tạo vs chính xác cho y tế
  },
  // Safety settings giữ mặc định — Google đã chặn sẵn HARM categories
});
```

> [!IMPORTANT]
> **maxOutputTokens: 500** — Tiếng Việt tiêu hao token gấp ~1.5-2x tiếng Anh do dấu + Unicode. Giới hạn 500 tokens (~250-350 từ Việt) đủ cho câu trả lời y tế ngắn gọn mà không gây bill shock.

## 2.2 — System Prompt (Nghiệp vụ ĐỘC LẬP)

```javascript
const SYSTEM_PROMPT = `Bạn là trợ lý AI của hệ thống đặt lịch khám bệnh BookingCare.

NHIỆM VỤ:
- Trả lời câu hỏi về bác sĩ, chuyên khoa, phòng khám, lịch khám.
- Hướng dẫn đặt lịch, thanh toán VNPay, xem lịch sử khám.
- Hỗ trợ song ngữ Việt-Anh (trả lời theo ngôn ngữ người dùng hỏi).

QUY TẮC BẮT BUỘC:
1. CHỈ trả lời dựa trên dữ liệu hệ thống trả về qua Function Calling.
2. Nếu Function trả về mảng rỗng hoặc không có dữ liệu → nói rõ "Không tìm thấy" — TUYỆT ĐỐI CẤM bịa thông tin.
3. TUYỆT ĐỐI CẤM đưa ra chẩn đoán y khoa, kê đơn thuốc, hoặc thay thế bác sĩ.
4. Nếu câu hỏi ngoài phạm vi (chính trị, tôn giáo, bạo lực...) → từ chối lịch sự.
5. Giá khám hiển thị theo VND (valueVi) khi ngôn ngữ = 'vi', USD (valueEn) khi = 'en'.
6. Các thông tin thanh toán VNPay: CHỈ hiển thị trạng thái (paid/unpaid), TUYỆT ĐỐI CẤM hiển thị số thẻ, mã giao dịch gốc.
7. Trả lời ngắn gọn, có cấu trúc Markdown (bullet, bold). Tối đa 300 từ.
8. Khi hướng dẫn URL, CHỈ dùng đường dẫn nội bộ BookingCare (/doctor/:id, /specialty/:id).
   TUYỆT ĐỐI CẤM gợi ý URL ngoài hệ thống.`;
```

### Giải thích thiết kế System Prompt:

| Quy tắc | Liên kết Phase cũ | Lý do |
|---|---|---|
| Cấm bịa (nhận vơ) | Phase 12 Guardrail | Chống AI Hallucination — y tế không cho phép sai |
| Nạp VNPay context | Phase 11 (VNPay Integration) | AI biết giải thích trạng thái thanh toán |
| Nạp i18n | Phase 10 (`appSlice.js` → `language: 'vi'`) | Trả lời đúng ngôn ngữ user |
| Cấm nested > 2 | AST Depth Guard | Chống Markdown lồng nhau quá sâu gây DOM thrashing |
| Bọc Delimiter DB | DB Injection Prevention | Function Calling result bọc trong delimiter `---DB_RESULT---` |

## 2.3 — Nghiệp vụ History (Sliding Window 2500 ký tự)

```javascript
// Hàm chuẩn bị history cho Gemini API
function prepareHistory(rawHistory) {
  // 1. Lọc bỏ Function Call/Response messages (Gemini internal)
  let filtered = rawHistory.filter(msg =>
    msg.role === 'user' || msg.role === 'model'
  );

  // 2. Lọc bỏ tin nhắn có cờ isLocal (system messages, không gửi lên AI)
  filtered = filtered.filter(msg => !msg.isLocal);

  // 3. Sinh UUID cho mỗi message nếu chưa có (tracing)
  // UUID đã import sẵn: const { v4: uuidv4 } = require('uuid');
  filtered = filtered.map(msg => ({
    ...msg,
    id: msg.id || uuidv4(),
  }));

  // 4. Sliding Window: Giới hạn tổng ký tự history ≤ 2500
  //    Cắt từ đầu (tin cũ nhất) cho đến khi tổng ≤ 2500
  let totalChars = 0;
  const windowMessages = [];

  // Duyệt ngược từ tin mới nhất
  for (let i = filtered.length - 1; i >= 0; i--) {
    const msgText = typeof filtered[i].parts === 'string'
      ? filtered[i].parts
      : filtered[i].parts?.map(p => p.text || '').join('') || '';
    const charCount = Array.from(msgText).length; // Array.from: chống Surrogate Mutilation
    if (totalChars + charCount > 2500) break;
    totalChars += charCount;
    windowMessages.unshift(filtered[i]);
  }

  // 5. Đảm bảo history luôn bắt đầu bằng 'user' (Gemini API requirement)
  while (windowMessages.length > 0 && windowMessages[0].role !== 'user') {
    windowMessages.shift();
  }

  return windowMessages;
}
```

### Chi tiết kỹ thuật History:

| Bước | Kỹ thuật | Lý do |
|---|---|---|
| Lọc Function | Loại bỏ `functionCall`/`functionResponse` | Gemini API không nhận lại Function messages trong history |
| Lọc isLocal | Bỏ tin nhắn hệ thống (welcome, error) | Tránh nhiễu context AI |
| UUID | `uuidv4()` — đã có sẵn trong project | Tracing, dedup, cross-tab sync |
| 2500 chars | `Array.from(msgText).length` | **Chống Surrogate Mutilation** — `String.length` đếm sai emoji/tiếng Việt tổ hợp. `Array.from()` đếm đúng codepoint |
| User-first | Cắt `model` messages đầu tiên | Gemini API yêu cầu history bắt đầu bằng `user` role |

---
