# PHASE 12 — AI CHATBOT INTEGRATION

## Tài liệu Kiến trúc Tích hợp AI — BookingCare

> **Version:** 1.0 | **Ngày:** 2026-05-11
> **Tổng Guards:** 71+ (29 Backend + 42 Frontend)
> **Tổng Parts:** 5 | **Tổng DB Rules:** 12 | **Tổng Test Cases:** 12

---

> [!CAUTION]
> Tài liệu này KHÔNG sinh code Nginx/Dockerfile. Mọi chỉ thị hạ tầng được BÀN GIAO sang Phase 13.

## Mục lục

| Part | Nội dung | File |
|---|---|---|
| **Part 1** | Mục tiêu, Cài đặt, Kill-Switch, HOOK cho Phase 13 (Nginx SSE + tcp_nodelay) | [Part1](Phase12-AIChatbot-Integration-Part1.md) |
| **Part 2** | Bộ não AI: Gemini SDK, System Prompt, History Sliding Window 2500 chars, Function Calling Declaration + DB Handlers (6 hàm Read-Only), PII Masking, 12 quy tắc bảo mật DB | [Part2](Phase12-AIChatbot-Integration-Part2.md) |
| **Part 3** | Backend SSE Controller: `aiController.js` — 29 guards (Kill-Switch, Max 15 Streams, Hard Timeout 60s, 403/400 Hard Stop, Heartbeat 15s, Backpressure drain, removeAllListeners...) | [Part3](Phase12-AIChatbot-Integration-Part3.md) |
| **Part 4** | Frontend React: `<AIChatbot>` Root — 42 guards (Functional State Update, onMouseDown Mobile Fix, localForage + In-memory fallback, React.memo, DOMPurify, IME Tiếng Việt, Cross-Tab Logout, Bfcache Reset, visualViewport...) | [Part4](Phase12-AIChatbot-Integration-Part4.md) |
| **Part 5** | Final Audit Checklist: 4 BẢO ĐẢM tests + 8 Core tests + Cross-Reference Matrix Phase 1–13 | [Part5](Phase12-AIChatbot-Integration-Part5.md) |

## 4 BẢO ĐẢM Trọng Tâm

| # | BẢO ĐẢM | Vấn đề | Giải pháp |
|---|---|---|---|
| 1 | **TCP Nagle Delay** | Nginx gom gói TCP nhỏ → delay 200ms | `tcp_nodelay on;` (Phase 13 Hook) |
| 2 | **React Concurrent Tearing** | Mất chữ do Stale State khi nối chunk SSE | `setText(prev => prev + chunk)` — Functional Update |
| 3 | **Mobile Blur Scroll Jump** | Bàn phím ảo giật khi bấm Gửi | `onMouseDown={e => e.preventDefault()}` trên nút Submit |
| 4 | **403/400 Billing Loop** | Backend gọi đệ quy khi API Key hết hạn | Hard Stop — chém đứt luồng, trả "Bảo trì" |

## Liên kết hệ sinh thái

```
Phase 1–9  → Models (User, Booking, Schedule, Doctor_Info, Allcode, Clinic, Specialty)
Phase 10   → Tailwind 3.4, Timezone +07:00, Dashboard
Phase 11   → VNPay Integration, 64 Guards, Payment State Machine
Phase 12   → AI Chatbot Integration (TÀI LIỆU NÀY)
Phase 13   → Docker, Nginx, PostgreSQL Migration (NHẬN HOOK từ Phase 12)
```
