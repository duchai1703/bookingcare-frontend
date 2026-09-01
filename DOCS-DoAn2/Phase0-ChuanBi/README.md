# 📋 ĐỀ CƯƠNG & KẾ HOẠCH THỰC HIỆN – ĐỒ ÁN 2 BOOKINGCARE
## Mục lục tài liệu Phase 0 (Chuẩn bị)

> **Đề tài:** Phát triển và mở rộng hệ thống đặt lịch khám bệnh trực tuyến BookingCare – Tích hợp ứng dụng di động, Telemedicine và AI nâng cao
>
> **Thời gian:** 07/09/2026 – 26/12/2026 (16 tuần, 8 sprints)
>
> **Nhóm:** 2 thành viên (Đặng Ngọc Trường Giang + Trần Đức Hải)

---

## 📁 Danh sách tài liệu

| # | File | Nội dung | Ước tính |
|---|------|---------|---------|
| 0 | [prompt_do_an_2.md](./prompt_do_an_2.md) | Prompt gốc chứa toàn bộ context dự án và yêu cầu | Input |
| 1 | [01_DeCuong_ChiTiet.md](./01_DeCuong_ChiTiet.md) | **Đề cương chi tiết** – Mục lục 5 chương, đánh số đến cấp 3, mô tả nội dung từng mục | ~120 trang |
| 2 | [02_KeHoach_Gantt.md](./02_KeHoach_Gantt.md) | **Kế hoạch Gantt** – 16 tuần chi tiết, task theo tuần, Mermaid Gantt chart, dependency graph | 8 sprints |
| 3 | [03_PhanCong_NhiemVu.md](./03_PhanCong_NhiemVu.md) | **Phân công nhiệm vụ** – Bảng task theo sprint, Owner/Reviewer, effort, cân bằng 51/49 | ~158 task-days |
| 4 | [04_Milestones_Deliverables.md](./04_Milestones_Deliverables.md) | **Milestones & Deliverables** – 9 mốc (M0-M8), tiêu chí, sản phẩm, scope MVP vs Full | 9 milestones |
| 5 | [05_PhanTich_RuiRo.md](./05_PhanTich_RuiRo.md) | **Phân tích rủi ro** – 10 rủi ro kỹ thuật, phương án dự phòng, ma trận rủi ro | 10 risks |
| 6 | [06_KeHoach_ChuyenDoi_PostgreSQL.md](./06_KeHoach_ChuyenDoi_PostgreSQL.md) | **Kế hoạch chuyển đổi DB** – MySQL 8.0 sang PostgreSQL 16 chi tiết | 11 phần |
| 7 | [07_KeHoach_ThietKe_ManHinh_Mobile.md](./07_KeHoach_ThietKe_ManHinh_Mobile.md) | **Thiết kế Mobile App** – Chi tiết 14 màn hình React Native (iOS & Android) | 14 screens |

---

## 🚀 7 Hướng phát triển

| # | Hướng | Sprint chính | Scope |
|---|-------|-------------|-------|
| 1 | 🧪 Unit Test & Integration Test (Jest, Supertest) | S1-S2 (W1-W4) | MVP: BE ≥ 60%, FE ≥ 40% |
| 2 | ⚙️ CI/CD Pipeline (GitHub Actions) | S1-S2 (W2-W4) | MVP: Lint → Test → Build → Deploy |
| 3 | 🌐 Deploy Production | S2 (W3-W4) | MVP: VPS + Docker + Domain + SSL |
| 4 | 💬 Chat BS-BN (Socket.IO) | S3-S4 (W5-W8) | MVP: Text + Image + Typing + Read |
| 5 | 📱 Mobile App (React Native) | S2-S7 (W3-W14) | MVP: Patient 12 screens |
| 6 | 🎥 Telemedicine (WebRTC) | S5-S6 (W9-W12) | MVP: 1-1 Video Call + Doctor Notes |
| 7 | 🤖 AI Chatbot nâng cao (Multimodal + RAG) | S6-S7 (W11-W14) | MVP: Image analysis + Disclaimer |

---

## 📅 Timeline tổng quan

```
W1-W2   ████████ Testing + CI/CD setup
W3-W4   ████████ Testing + Deploy + Mobile start
W5-W6   ████████ Chat Backend + Web UI + Mobile core
W7-W8   ████████ Chat Mobile + Push Notif + Mobile advanced
W9-W10  ████████ Telemedicine (WebRTC) + Mobile video
W11-W12 ████████ AI Multimodal + RAG + Polish
W13-W14 ████████ Integration + E2E Testing + Bug fixes
W15-W16 ████████ Báo cáo + Demo preparation
```
