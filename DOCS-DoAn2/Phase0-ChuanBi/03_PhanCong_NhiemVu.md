# BẢNG PHÂN CÔNG NHIỆM VỤ – ĐỒ ÁN 2 BOOKINGCARE
## Phần 3/5: Phân công chi tiết theo Sprint (2 thành viên, 50-50)

---

## THÔNG TIN THÀNH VIÊN

| Thành viên | Vai trò | Thế mạnh | Ký hiệu |
|-----------|--------|----------|---------|
| **Đặng Ngọc Trường Giang** | Tech Lead – Fullstack | Backend, hạ tầng, bảo mật, DevOps, DB, Testing BE | **Giang** |
| **Trần Đức Hải** | Fullstack Developer | Frontend, Mobile, UI/UX, tích hợp, Testing FE | **Hải** |

**Quy tắc:** Mỗi task có 1 người phụ trách chính (Owner) + 1 người review (Reviewer). Tất cả code phải qua Pull Request review trước khi merge.

---

## SPRINT 1 (W1-W2: 07/09 – 20/09) — Setup + Testing Foundation

| # | Task | Owner | Reviewer | Effort | Output |
|---|------|-------|----------|--------|--------|
| 1.1 | Setup Jest + Supertest cho Backend (test env, test DB config) | Giang | Hải | 2d | `jest.config.js`, test DB |
| 1.2 | Unit test Auth services (login, register, forgot-pw, reset-pw) | Giang | Hải | 3d | 15+ test cases |
| 1.3 | Unit test Booking services (create, verify, cancel, state machine) | Giang | Hải | 3d | 20+ test cases |
| 1.4 | Setup Jest + React Testing Library cho Frontend (Vite config) | Hải | Giang | 2d | `vitest.config.js` |
| 1.5 | Unit test FE components (Header, Login, Register, HomePage) | Hải | Giang | 3d | 10+ test cases |
| 1.6 | Unit test FE components (DoctorDetail, BookingModal, Schedule) | Hải | Giang | 2d | 8+ test cases |
| 1.7 | Setup GitHub Actions workflow (lint + test on PR) | Giang | Hải | 1d | `.github/workflows/ci.yml` |
| 1.8 | Research React Native (Expo vs CLI, PoC hello world) | Hải | Giang | 2d | Research report + PoC |
| 1.9 | Setup code coverage reporting (nyc/istanbul) | Giang | Hải | 1d | Coverage thresholds |
| 1.10 | Khởi tạo project React Native (Expo) | Hải | Giang | 1d | Project skeleton |

**Effort Sprint 1:** Giang = 10d | Hải = 10d ✅ **Balanced**

---

## SPRINT 2 (W3-W4: 21/09 – 04/10) — Testing hoàn thiện + Deploy

| # | Task | Owner | Reviewer | Effort | Output |
|---|------|-------|----------|--------|--------|
| 2.1 | Integration test Auth API (Supertest) | Giang | Hải | 2d | 12+ integration tests |
| 2.2 | Integration test Booking + Payment API (mock VNPay) | Giang | Hải | 3d | 15+ integration tests |
| 2.3 | Integration test Doctor/Patient API (RBAC, IDOR) | Giang | Hải | 2d | 10+ integration tests |
| 2.4 | Unit test AI Chatbot service (mock Gemini) | Giang | Hải | 1d | 5+ test cases |
| 2.5 | Thuê VPS + Setup server (Ubuntu, Docker, UFW, SSH) | Giang | Hải | 1d | VPS ready |
| 2.6 | Deploy Docker Compose + Cloudflare (DNS, SSL) | Giang | Hải | 2d | Production URL live |
| 2.7 | PM2 + monitoring + DB backup cronjob | Giang | Hải | 1d | Monitoring setup |
| 2.8 | CI/CD: Build Docker + Push GHCR + Auto-deploy | Giang | Hải | 2d | Full pipeline |
| 2.9 | Mobile: Login + Register screens + React Navigation | Hải | Giang | 3d | Auth flow mobile |
| 2.10 | Mobile: Redux store (reuse slices) + Axios config | Hải | Giang | 1d | State management |
| 2.11 | Mobile: Home screen (CK, BS, PK carousels) | Hải | Giang | 2d | Home UI |
| 2.12 | Mobile: Search screen | Hải | Giang | 1d | Search UI |
| 2.13 | Mobile: Secure token storage (expo-secure-store) | Hải | Giang | 1d | JWT storage |

**Effort Sprint 2:** Giang = 14d | Hải = 8d → Giang nặng hơn do Deploy, bù lại Sprint 3-4 Hải nặng hơn.

---

## SPRINT 3 (W5-W6: 05/10 – 18/10) — Chat + Mobile Foundation

| # | Task | Owner | Reviewer | Effort | Output |
|---|------|-------|----------|--------|--------|
| 3.1 | Backend: Tích hợp Socket.IO vào Express (JWT auth WS) | Giang | Hải | 2d | Socket server |
| 3.2 | Backend: Sequelize models (Conversations, Messages) + migration | Giang | Hải | 1d | DB schema |
| 3.3 | Backend: Chat REST API (6 endpoints) + services | Giang | Hải | 3d | CRUD API |
| 3.4 | Backend: Socket.IO events /chat namespace | Giang | Hải | 2d | Real-time events |
| 3.5 | Backend: Chat bảo mật (IDOR, sanitize, rate limit) | Giang | Hải | 1d | Security |
| 3.6 | Backend: Chat seed data (sample conversations) | Giang | Hải | 0.5d | Seed |
| 3.7 | Frontend Web: Chat sidebar/drawer component | Hải | Giang | 2d | Chat UI |
| 3.8 | Frontend Web: Message bubbles + Socket.IO client | Hải | Giang | 2d | Real-time chat |
| 3.9 | Frontend Web: Typing indicator + read receipts + image upload | Hải | Giang | 2d | Advanced features |
| 3.10 | Mobile: Doctor Detail + Schedule picker | Hải | Giang | 2d | Doctor screen |
| 3.11 | Mobile: Booking modal + VNPay WebView | Hải | Giang | 2d | Booking flow |
| 3.12 | Mobile: History screen (3 tabs: upcoming/done/cancelled) | Hải | Giang | 1.5d | History UI |

**Effort Sprint 3:** Giang = 9.5d | Hải = 11.5d ✅ **Bù lại Sprint 2**

---

## SPRINT 4 (W7-W8: 19/10 – 01/11) — Chat hoàn thiện + Mobile Core

| # | Task | Owner | Reviewer | Effort | Output |
|---|------|-------|----------|--------|--------|
| 4.1 | Backend: FCM service (Firebase Admin SDK setup) | Giang | Hải | 2d | Push notification |
| 4.2 | Backend: DeviceTokens model + API (3 endpoints) | Giang | Hải | 1d | Token management |
| 4.3 | Backend: Trigger notifications (new msg, booking change) | Giang | Hải | 2d | Event triggers |
| 4.4 | Backend: Chat tests (unit + integration) | Giang | Hải | 2d | Test coverage |
| 4.5 | Frontend Web: Chat trong Doctor Dashboard (BS-side) | Giang | Hải | 2d | Doctor chat view |
| 4.6 | Mobile: Chat List screen (conversations) | Hải | Giang | 1.5d | Chat list |
| 4.7 | Mobile: Chat Room screen (Socket.IO real-time) | Hải | Giang | 2d | Chat room |
| 4.8 | Mobile: Image picker (camera/gallery) cho chat | Hải | Giang | 1d | Media upload |
| 4.9 | Mobile: Push notification handling (FCM foreground/bg) | Hải | Giang | 2d | Notifications |
| 4.10 | Mobile: Profile screen + Change password | Hải | Giang | 1.5d | Profile |
| 4.11 | Mobile: AI Chatbot screen (text only, SSE) | Hải | Giang | 2d | AI on mobile |
| 4.12 | Mobile: Deep linking (email verify → app) | Hải | Giang | 1d | Deep links |

**Effort Sprint 4:** Giang = 9d | Hải = 11d ✅ **Balanced (tổng 2 sprint = balanced)**

---

## SPRINT 5 (W9-W10: 02/11 – 15/11) — Telemedicine

| # | Task | Owner | Reviewer | Effort | Output |
|---|------|-------|----------|--------|--------|
| 5.1 | Backend: Socket.IO /video namespace (signaling server) | Giang | Hải | 3d | WebRTC signaling |
| 5.2 | Backend: VideoSessions model + API (5 endpoints) | Giang | Hải | 2d | Video API |
| 5.3 | Backend: STUN/TURN configuration | Giang | Hải | 1d | NAT traversal |
| 5.4 | Backend: Booking state S5 + Allcode migration | Giang | Hải | 1d | State machine update |
| 5.5 | Backend: FCM notification khi tạo video room | Giang | Hải | 1d | Push video invite |
| 5.6 | Backend: Tests cho Telemedicine (unit + integration) | Giang | Hải | 2d | Test coverage |
| 5.7 | Frontend Web: Video Call UI (camera, mic, controls) | Hải | Giang | 3d | Video call page |
| 5.8 | Frontend Web: Incoming call notification modal | Hải | Giang | 1d | Call notification |
| 5.9 | Frontend Web: Doctor notes form sau video call | Hải | Giang | 1d | Notes UI |
| 5.10 | Frontend Web: Screen sharing (optional) | Hải | Giang | 1d | getDisplayMedia |
| 5.11 | Mobile: Video Call screen (react-native-webrtc) | Hải | Giang | 3d | Mobile video |
| 5.12 | Deploy: Cập nhật production với Chat + Video features | Giang | Hải | 1d | Prod update |

**Effort Sprint 5:** Giang = 11d | Hải = 9d ✅ **Balanced**

---

## SPRINT 6 (W11-W12: 16/11 – 29/11) — AI nâng cao

| # | Task | Owner | Reviewer | Effort | Output |
|---|------|-------|----------|--------|--------|
| 6.1 | Backend: Gemini multimodal integration (text + image) | Giang | Hải | 3d | Multimodal AI |
| 6.2 | Backend: Image validation (5MB, MIME) + rate limit multimodal | Giang | Hải | 1d | Security |
| 6.3 | Backend: Medical disclaimer system | Giang | Hải | 0.5d | Auto-disclaimer |
| 6.4 | Backend: RAG pipeline (ChromaDB + LangChain.js) | Giang | Hải | 3d | RAG setup |
| 6.5 | Backend: Seed medical knowledge data (bệnh, triệu chứng, CK) | Giang | Hải | 1d | Knowledge base |
| 6.6 | Backend: Function Calling mới (getSpecialtyRecommendation) | Giang | Hải | 1.5d | New FC handler |
| 6.7 | Frontend Web: AI Chat upload ảnh UI (drag-drop, preview) | Hải | Giang | 2d | Image upload |
| 6.8 | Frontend Web: AI response + specialty suggestion links | Hải | Giang | 1d | Smart suggestions |
| 6.9 | Mobile: AI Chat upload ảnh (camera/gallery → multimodal) | Hải | Giang | 2d | Mobile AI image |
| 6.10 | Mobile: Video call polish (reconnect, edge cases, UI) | Hải | Giang | 2d | UX polish |
| 6.11 | Mobile: Notification center screen | Hải | Giang | 1d | Notification list |
| 6.12 | Mobile: Settings (language, notification preferences) | Hải | Giang | 1d | Settings screen |

**Effort Sprint 6:** Giang = 10d | Hải = 9d ✅ **Balanced**

---

## SPRINT 7 (W13-W14: 30/11 – 13/12) — Integration + Polish

| # | Task | Owner | Reviewer | Effort | Output |
|---|------|-------|----------|--------|--------|
| 7.1 | Backend: Seed data toàn bộ tính năng mới | Giang | Hải | 2d | Complete seed |
| 7.2 | Backend: createBookingDraft Function Calling | Giang | Hải | 2d | Draft booking from chat |
| 7.3 | Backend: Security audit toàn hệ thống | Giang | Hải | 2d | Security report |
| 7.4 | Backend: Cập nhật tests cho tính năng mới | Giang | Hải | 2d | Coverage maintained |
| 7.5 | Frontend Web: UI polish toàn bộ (responsive, i18n, animation) | Hải | Giang | 3d | Polished Web UI |
| 7.6 | Mobile: UI polish (loading states, error handling, animation) | Hải | Giang | 3d | Polished Mobile UI |
| 7.7 | Mobile: Đa ngôn ngữ hoàn thiện (vi.json, en.json) | Hải | Giang | 1d | i18n complete |
| 7.8 | E2E testing Web (manual checklist tất cả luồng) | Cả hai | — | 2d | Test report |
| 7.9 | E2E testing Mobile (emulator + device) | Cả hai | — | 2d | Test report |
| 7.10 | Fix bugs (Critical → High priority) | Cả hai | — | 2d | Bug fixes |
| 7.11 | Deploy final production + Build APK release | Giang+Hải | — | 1d | Final deploy + APK |

**Effort Sprint 7:** Giang = 10d | Hải = 10d ✅ **Balanced**

---

## SPRINT 8 (W15-W16: 14/12 – 26/12) — Báo cáo + Demo

| # | Task | Owner | Reviewer | Effort | Output |
|---|------|-------|----------|--------|--------|
| 8.1 | Viết báo cáo Chương 1 (Giới thiệu) | Hải | Giang | 2d | ~8 trang |
| 8.2 | Viết báo cáo Chương 2 (Cơ sở lý thuyết) | Hải | Giang | 2d | ~12 trang |
| 8.3 | Viết báo cáo Chương 3 (Phân tích & Thiết kế) | Giang | Hải | 4d | ~35 trang |
| 8.4 | Vẽ biểu đồ UML (Use Case, Sequence, ER, Class) | Giang | Hải | 2d | Diagrams |
| 8.5 | Chụp screenshots tất cả màn hình Web + Mobile | Hải | Giang | 1d | Screenshots |
| 8.6 | Viết báo cáo Chương 4 (Triển khai) | Hải | Giang | 3d | ~30 trang |
| 8.7 | Viết báo cáo Chương 5 (Kết luận) | Giang | Hải | 1d | ~6 trang |
| 8.8 | Viết Phụ lục (Setup guide, API docs, coverage report) | Cả hai | — | 1d | ~5 trang |
| 8.9 | Tài liệu tham khảo + Format báo cáo | Cả hai | — | 0.5d | Final format |
| 8.10 | Soạn kịch bản demo (20-25 phút) | Cả hai | — | 1d | Demo script |
| 8.11 | Dry-run demo (ít nhất 2 lần) | Cả hai | — | 1d | Rehearsal |
| 8.12 | Review + Fix báo cáo cuối cùng | Cả hai | — | 0.5d | Final review |

**Effort Sprint 8:** Giang = 7.5d (focus: Ch3, Ch5, diagrams) | Hải = 8.5d (focus: Ch1, Ch2, Ch4, screenshots) ✅ **Balanced**

---

## TỔNG KẾT PHÂN CÔNG

| Sprint | Giang (days) | Hải (days) | Cân bằng |
|--------|-------------|-----------|----------|
| Sprint 1 | 10 | 10 | ✅ |
| Sprint 2 | 14 | 8 | ⚠️ Giang nặng (Deploy) |
| Sprint 3 | 9.5 | 11.5 | ⚠️ Hải nặng (bù Sprint 2) |
| Sprint 4 | 9 | 11 | ✅ |
| Sprint 5 | 11 | 9 | ✅ |
| Sprint 6 | 10 | 9 | ✅ |
| Sprint 7 | 10 | 10 | ✅ |
| Sprint 8 | 7.5 | 8.5 | ✅ |
| **TỔNG** | **81d** | **77d** | ✅ ~51% / 49% |

> **Kết luận:** Phân công cân bằng tổng thể với tỷ lệ ~51/49. Các sprint có lệch nhẹ (Sprint 2, 3) được bù trừ lẫn nhau. Giang tập trung Backend + DevOps, Hải tập trung Frontend + Mobile.
