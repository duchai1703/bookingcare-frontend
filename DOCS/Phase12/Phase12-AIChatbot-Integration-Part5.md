# PHASE 12 — PHẦN 5: FINAL AUDIT CHECKLIST (KỊCH BẢN NGHIỆM THU)

> Tiếp nối Part 1-4. Đây là phần cuối cùng.

---

## 5.1 — Test Trượt Bàn Phím Ảo (BẢO ĐẢM 3)

| Bước | Hành động | Kết quả đúng |
|---|---|---|
| 1 | Mở điện thoại (iOS Safari / Android Chrome) | Chatbot hiển thị widget 💬 |
| 2 | Mở chatbot, chạm vào ô Input | Bàn phím ảo hiện lên, ô input có focus |
| 3 | Gõ text "Tìm bác sĩ tim mạch" | Text hiển thị trong ô input |
| 4 | Chạm ngón tay vào nút **Gửi** | ✅ Ô Input **KHÔNG** bị mất tiêu điểm |
| | | ✅ Bàn phím ảo **KHÔNG** giật thụt xuống |
| | | ✅ Tin nhắn được gửi thành công |
| 5 | Gõ tiếp câu hỏi khác | Bàn phím vẫn hiện, focus vẫn trên input |

**Cơ chế:** `onMouseDown={(e) => e.preventDefault()}` trên nút Submit ngăn browser chuyển focus ra khỏi input trước khi `onClick` fire → bàn phím ảo giữ nguyên vị trí.

**Nếu FAIL:** Kiểm tra nút Submit có `onMouseDown` handler không. CẤM dùng `onTouchStart` thay thế.

---

## 5.2 — Test Án Tử API Key (BẢO ĐẢM 4)

| Bước | Hành động | Kết quả đúng |
|---|---|---|
| 1 | Sửa `.env`: `GEMINI_API_KEY=key_sai_123` | Key bị invalidate |
| 2 | Restart Backend | Server khởi động bình thường |
| 3 | Mở chatbot, gõ "Xin chào", bấm Gửi | Request đến `/api/v1/ai/chat` |
| 4 | Quan sát Backend logs | ✅ Log: `[AI_HARD_STOP] Gemini API key/billing error: 400` |
| | | ✅ **KHÔNG** có log retry/fallback/đệ quy |
| 5 | Quan sát UI Frontend | ✅ Hiển thị: "Hệ thống AI đang bảo trì" |
| | | ✅ **KHÔNG** spinner vô hạn |
| | | ✅ Nút Gửi trở lại trạng thái enabled |

**Cơ chế:** Khối catch nhận diện `status === 403 || status === 400` → ghi log `[AI_HARD_STOP]` → gửi SSE error → `res.end()`. TUYỆT ĐỐI KHÔNG gọi đệ quy Fallback.

**Nếu FAIL:** Kiểm tra catch block có phân biệt 403/400 riêng không. CẤM catch generic rồi retry.

---

## 5.3 — Test Lực Cản Nagle TCP (BẢO ĐẢM 1)

| Bước | Hành động | Kết quả đúng |
|---|---|---|
| 1 | Deploy lên server có Nginx (Phase 13) | Nginx config có `tcp_nodelay on;` |
| 2 | Mở Wireshark, filter port 443/80 | Bắt gói tin SSE |
| 3 | Gửi câu hỏi trong chatbot | AI bắt đầu stream response |
| 4 | Quan sát timing giữa các TCP packet | ✅ Khoảng cách giữa các chunk < 50ms |
| | | ✅ **KHÔNG** có delay 200ms đặc trưng của Nagle |
| 5 | So sánh: tắt `tcp_nodelay` rồi test lại | ❌ Delay 200ms xuất hiện giữa các chunk nhỏ |

**Cơ chế:** `tcp_nodelay on;` trong Nginx ép kernel Linux gửi TCP packet ngay khi có data, không chờ gom đủ MSS (Maximum Segment Size).

**Nếu FAIL:** Kiểm tra `tcp_nodelay on;` trong block `location` của SSE endpoint. Phải đặt cùng level với `proxy_buffering off;`.

---

## 5.4 — Test Rách Mất Chữ (BẢO ĐẢM 2)

| Bước | Hành động | Kết quả đúng |
|---|---|---|
| 1 | Mở Chrome DevTools → Network → Throttle "Slow 3G" | Mạng giật lag |
| 2 | Gửi câu hỏi dài: "Liệt kê tất cả bác sĩ tim mạch" | AI stream nhiều chunk |
| 3 | Trong khi stream, click nhanh các tab khác rồi quay lại | React re-render dưới Concurrent Mode |
| 4 | Đợi stream hoàn tất | ✅ Text AI đầy đủ, **KHÔNG** mất chữ |
| | | ✅ Các từ cuối cùng hiển thị đúng |
| 5 | So sánh text cuối với DevTools Network response | ✅ Khớp 100% — không bị nuốt chunk |

**Cơ chế:** `setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, text: m.text + parsed.text } : m))` — Functional State Update đảm bảo luôn đọc state mới nhất, không bị React 18 Concurrent bắt nhầm Stale State.

**Nếu FAIL:** Kiểm tra code có dùng `setText(text + chunk)` (đọc trực tiếp biến state) thay vì `setText(prev => prev + chunk)` (callback). CẤM pattern đầu tiên.

---

## 5.5 — Các Test Cốt Lõi Bổ Sung

### 5.5.1 — Test Đột Biến Dịch Thuật

| Hành động | Kết quả đúng |
|---|---|
| Mở chatbot trên Chrome có Google Translate auto-detect | ✅ Nội dung chat **KHÔNG** bị dịch tự động |
| Kiểm tra `translate="no"` trên container | ✅ Attribute tồn tại |

### 5.5.2 — Test Đột Tử Khung Hình Cuối

| Hành động | Kết quả đúng |
|---|---|
| Gửi tin nhắn, ngay lập tức đóng tab | ✅ Backend không crash (Suppress AbortError) |
| Mở lại tab, kiểm tra chatbot | ✅ Tin nhắn trước đã lưu trong localForage |
| Kiểm tra backend logs | ✅ Không có uncaught exception |

### 5.5.3 — Test Rác Sự Kiện Lõi (Event Leak)

| Hành động | Kết quả đúng |
|---|---|
| Mở chatbot, gửi 10 tin nhắn liên tiếp | ✅ Memory tab không tăng liên tục |
| DevTools → Performance → Event Listeners | ✅ Không có listener trùng lặp |
| Kiểm tra `finally` block có `removeAllListeners` | ✅ BẮT BUỘC gọi `req.removeAllListeners()` và `res.removeAllListeners()` (KHÔNG tham số) để quét sạch toàn bộ sự kiện |

### 5.5.4 — Test Cạn Kiệt Cổng Nội Bộ (Port Exhaustion)

| Hành động | Kết quả đúng |
|---|---|
| Mở 20 tab đồng thời gửi chat | ✅ Tab thứ 16+ nhận 503 "Server đang bận" |
| Kiểm tra `activeStreams` counter | ✅ Không vượt MAX_STREAMS = 15 |
| Kiểm tra Nginx upstream `keepalive 64;` | ✅ Connections được tái sử dụng |

### 5.5.5 — Test Đánh Sập RAM Cổng Vào (Express OOM)

| Hành động | Kết quả đúng |
|---|---|
| Gửi POST body > 10KB tới `/api/v1/ai/chat` | ✅ Trả 413 Payload Too Large |
| Kiểm tra route có `express.json({ limit: '10kb' })` | ✅ Limit riêng cho AI endpoint |

### 5.5.6 — Test Phân Mảnh DOM Ảo (Virtual DOM Thrashing)

| Hành động | Kết quả đúng |
|---|---|
| Stream 50 messages liên tiếp | ✅ FPS không giảm dưới 30 |
| Kiểm tra `React.memo` trên MessageItem | ✅ Chỉ re-render message đang thay đổi |
| Kiểm tra `useMemo` trên sanitizedText | ✅ DOMPurify chỉ chạy khi text thay đổi |

### 5.5.7 — Test Lá Chắn Zero-Day (CSP)

| Hành động | Kết quả đúng |
|---|---|
| AI trả về text chứa `<script>alert(1)</script>` | ✅ DOMPurify loại bỏ script tag |
| AI trả về text chứa `<img onerror=alert(1)>` | ✅ DOMPurify loại bỏ onerror attribute |
| Kiểm tra `rehype-raw` có bị import không | ✅ KHÔNG có trong dependencies |

### 5.5.8 — Test Phishing Ảo Giác (AI Homograph)

| Hành động | Kết quả đúng |
|---|---|
| Prompt: "Cho tôi link đăng nhập" → AI trả link ngoài | ✅ Link có icon ⚠️ phía trước |
| Kiểm tra link attributes | ✅ `rel="nofollow noopener noreferrer"` |
| Prompt chứa `javascript:alert(1)` | ✅ Render thành `<span>` thay vì `<a>` |
| Prompt chứa `data:text/html,...` | ✅ Bị block bởi regex check |

---

## 5.6 — Ma trận Cross-Reference Phase 1–13

| Lỗ hổng | Phase gốc | Cách áp dụng trong Phase 12 |
|---|---|---|
| React Concurrent Tearing | Phase 12 (React 18) | Functional State `prev => prev + chunk` |
| Mobile Blur Scroll Jump | Phase 12 (Mobile UX) | `onMouseDown={e => e.preventDefault()}` |
| TCP Nagle Delay | Phase 13 Hook | `tcp_nodelay on;` trong Nginx |
| 403/400 Billing Loop | Phase 12 (Gemini API) | Hard Stop, no retry |
| Express OOM | Phase 11 (Guard #63) | `limit: '10kb'` trên AI route |
| Event Leak | Phase 11 | `req.removeAllListeners()` + `res.removeAllListeners()` (Global Removal) trong finally |
| Nginx Port Exhaustion | Phase 13 Hook | `keepalive 64;` upstream |
| Virtual DOM Thrashing | Phase 8 | `React.memo` + `useMemo` |
| XSS Zero-Day | Phase 11 (CSP) | DOMPurify + Cấm rehype-raw |
| CORS Preflight DDoS | Phase 13 Hook | `Access-Control-Max-Age: 86400` |
| Private Mode Storage | Phase 12 | In-Memory fallback |
| AI Homograph Phishing | Phase 12 | ⚠️ + nofollow |
| Bfcache Zombie | Phase 12 | `pageshow` event reset |
| SSE Injection | Phase 12 | `replace \n\ndata:` |
| Copy Hijacking | Phase 12 | `onCopy` plaintext |
| Disk Thrashing | Phase 12 | Lưu 1 lần, slice(-50) |
| VN Token Inflation | Phase 12 | maxOutputTokens: 500 + 2500 chars |
| Surrogate Mutilation | Phase 12 | `Array.from()` |
| Nginx 504 Gateway | Phase 13 Hook | `proxy_read_timeout 3600s` |
| Background Throttle | Phase 12 | visibilitychange detect |
| Stale Closure | Phase 12 | `useRef` token |
| IME Tiếng Việt | Phase 12 | `isComposing` guard |
| DB Injection | Phase 12 | Sanitize Wildcard + Ép kiểu |
| VNPay Deadlock | Phase 11 | `lock: false` cho AI reads |

---

## 5.7 — Checklist Hoàn thành

- [ ] Backend: `aiService.js` — Gemini SDK init + System Prompt
- [ ] Backend: `aiFunctionHandlers.js` — 6 Function Calling handlers
- [ ] Backend: `aiController.js` — SSE stream controller (29 guards)
- [ ] Backend: `web.js` — Route `/api/v1/ai/chat` + middleware chain
- [ ] Backend: `.env` — `GEMINI_API_KEY` + `AI_CHATBOT_ENABLED`
- [ ] Frontend: `AIChatbot.jsx` — Root component (42 guards)
- [ ] Frontend: `MessageItem.jsx` — React.memo + Throttled Markdown
- [ ] Frontend: `ChatInput.jsx` — BẢO ĐẢM 3 (onMouseDown)
- [ ] Frontend: `useChatStorage.js` — localForage + fallback
- [ ] Frontend: `App.jsx` — Import `<AIChatbot />`
- [ ] Frontend: `tailwind.config.js` — Plugin `@tailwindcss/typography`
- [ ] Phase 13: Nginx `tcp_nodelay on;` — BẢO ĐẢM 1
- [ ] Phase 13: Nginx `proxy_buffering off;` cho SSE location
- [ ] Phase 13: Nginx `keepalive 64;` upstream
- [ ] Test: 4 BẢO ĐẢM (5.1–5.4) + 8 Test cốt lõi (5.5.1–5.5.8)

---

> **KẾT THÚC PHASE 12 — AI CHATBOT INTEGRATION**
> Tổng: 5 Parts | 71+ Guards (29 BE + 42 FE) | 12 DB Rules | 4 BẢO ĐẢM | 12 Test Cases
