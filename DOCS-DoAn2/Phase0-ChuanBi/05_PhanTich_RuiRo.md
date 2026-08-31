# PHÂN TÍCH RỦI RO & PHƯƠNG ÁN DỰ PHÒNG – ĐỒ ÁN 2 BOOKINGCARE
## Phần 5/5: Rủi ro kỹ thuật & Chiến lược giảm thiểu

---

## BẢNG TỔNG HỢP RỦI RO

| # | Rủi ro | Xác suất | Tác động | Mức độ |
|---|--------|---------|---------|--------|
| R1 | WebRTC không kết nối được qua NAT (symmetric NAT) | Trung bình | Cao | 🔴 Nghiêm trọng |
| R2 | React Native performance kém / crash trên thiết bị cũ | Trung bình | Cao | 🔴 Nghiêm trọng |
| R3 | Gemini API rate limit / cost overrun khi multimodal | Cao | Trung bình | 🟡 Đáng kể |
| R4 | Socket.IO mất kết nối / message loss khi mạng yếu | Trung bình | Trung bình | 🟡 Đáng kể |
| R5 | VPS downtime / resource exhaustion khi chạy nhiều services | Trung bình | Cao | 🔴 Nghiêm trọng |
| R6 | Time constraint: 16 tuần không đủ cho 7 hướng phát triển | Cao | Cao | 🔴 Nghiêm trọng |
| R7 | Sequelize sync conflict khi thêm bảng/cột mới | Thấp | Trung bình | 🟢 Thấp |
| R8 | Firebase Cloud Messaging delivery không đáng tin cậy | Thấp | Trung bình | 🟢 Thấp |
| R9 | ChromaDB / Vector DB performance với dataset lớn | Thấp | Trung bình | 🟢 Thấp |
| R10 | GitHub Actions CI/CD pipeline chậm / timeout | Trung bình | Thấp | 🟢 Thấp |

---

## CHI TIẾT TỪNG RỦI RO

### 🔴 R1: WebRTC không kết nối qua NAT (Symmetric NAT)

**Mô tả:**
WebRTC sử dụng ICE framework để thiết lập kết nối P2P. Trong nhiều mạng doanh nghiệp, trường học, hoặc mạng di động 4G/5G, **Symmetric NAT** ngăn chặn kết nối P2P trực tiếp. Chỉ sử dụng STUN server miễn phí (Google) sẽ không đủ — cần TURN server để relay traffic.

**Xác suất:** Trung bình (30-40% người dùng có thể gặp vấn đề NAT)

**Tác động:** Cao — Video call không hoạt động cho một nhóm người dùng, chức năng Telemedicine bị ảnh hưởng nghiêm trọng.

**Phương án dự phòng:**
1. **TURN server self-hosted (coturn):** Cài đặt coturn trên VPS riêng hoặc cùng VPS production (nếu đủ RAM). Chi phí: ~$5/tháng cho VPS nhỏ.
2. **Twilio Network Traversal Service:** Dùng free tier của Twilio (100 TURN minutes/month miễn phí), đủ cho demo và testing.
3. **Fallback UI:** Nếu WebRTC P2P fail sau 10s timeout, hiển thị thông báo "Không thể kết nối video. Vui lòng thử lại hoặc sử dụng chat text." + Link hướng dẫn kiểm tra mạng.
4. **ICE restart:** Implement ICE restart mechanism khi connection bị ngắt.

**Action items:**
- [ ] Test WebRTC trên nhiều loại mạng: WiFi nhà, WiFi trường, 4G mobile
- [ ] Setup coturn TURN server sớm (Sprint 5, tuần 9)
- [ ] Implement connection quality indicator trên UI

---

### 🔴 R2: React Native performance / crash trên thiết bị cũ

**Mô tả:**
React Native app có thể gặp vấn đề performance (janky animations, slow list rendering, memory leak) trên các thiết bị Android giá rẻ (2-3GB RAM) hoặc iOS cũ (iPhone 7/8). Đặc biệt khi render danh sách dài (chat messages, booking history) hoặc chạy camera + WebRTC.

**Xác suất:** Trung bình (nhiều BN Việt Nam dùng điện thoại tầm trung)

**Tác động:** Cao — UX kém, crash = mất người dùng.

**Phương án dự phòng:**
1. **FlatList + Pagination:** Sử dụng `FlatList` với `initialNumToRender`, `maxToRenderPerBatch`, `windowSize` optimize. Chat messages phân trang (load 20 messages/page).
2. **Hermes Engine:** Đảm bảo Hermes JS engine được bật (mặc định với Expo SDK 50+), cải thiện startup time 30-50%.
3. **Image optimization:** Compress ảnh trước khi upload (react-native-image-resizer), cache ảnh (react-native-fast-image).
4. **Memory monitoring:** Sử dụng React Native Debugger + Performance Monitor trong dev, fix memory leaks.
5. **Minimum device target:** Đặt minimum Android API 24 (Android 7.0), iOS 14.

**Action items:**
- [ ] Test trên thiết bị thực (Android tầm trung + iPhone cũ), không chỉ emulator
- [ ] Profile performance với Flipper/React DevTools
- [ ] Optimize image handling sớm (Sprint 4)

---

### 🟡 R3: Gemini API rate limit / cost overrun với multimodal

**Mô tả:**
Gemini API có rate limits (RPM/TPM) và tính phí theo token usage. Multimodal requests (text + image) tiêu hao token **gấp 5-10x** so với text-only (ảnh 1MB ≈ 258 tokens). Tiếng Việt cũng tiêu hao gấp 1.5-2x so với tiếng Anh.

**Xác suất:** Cao (nếu nhiều người dùng upload ảnh cùng lúc)

**Tác động:** Trung bình — AI chatbot tạm thời không phản hồi (503), nhưng hệ thống khác vẫn hoạt động.

**Phương án dự phòng:**
1. **Rate limiting riêng cho multimodal:** Giới hạn 5 multimodal requests/user/15 phút (thay vì chung với text).
2. **Image resize trước khi gửi Gemini:** Frontend resize ảnh xuống max 1024×1024 pixel trước khi gửi, giảm 50-70% token usage.
3. **Caching frequent queries:** Cache kết quả Function Calling vào Redis (TTL 5 phút) để tránh gọi DB lặp lại.
4. **Fallback model:** Nếu Gemini 2.0 Flash rate limited, fallback xuống `gemini-1.5-flash` (rẻ hơn, chậm hơn).
5. **Kill-Switch enhanced:** Có thể tắt riêng multimodal mà vẫn giữ text chatbot hoạt động.
6. **Budget monitoring:** Set up Google Cloud billing alert khi chi phí vượt ngưỡng ($20/tháng cho sandbox).

**Action items:**
- [ ] Implement image resize middleware (Sprint 6)
- [ ] Setup billing alert trên Google Cloud Console
- [ ] Test với nhiều concurrent multimodal requests

---

### 🟡 R4: Socket.IO mất kết nối / message loss khi mạng yếu

**Mô tả:**
Socket.IO dựa trên WebSocket, nhạy cảm với mạng không ổn định (3G/4G kém, WiFi yếu, chuyển mạng). Messages có thể bị mất khi reconnect, typing indicator bị delay, read receipts không đồng bộ.

**Xác suất:** Trung bình (đặc biệt trên mobile khi di chuyển)

**Tác động:** Trung bình — Tin nhắn mất gây frustration, nhưng không ảnh hưởng booking/payment.

**Phương án dự phòng:**
1. **Message persistence first:** Luôn lưu message vào DB trước, rồi mới emit Socket event. Nếu socket fail, message vẫn tồn tại trong DB.
2. **REST fallback:** Nếu Socket.IO disconnect > 5s, frontend tự động switch sang REST API polling (GET messages every 3s) cho đến khi socket reconnect.
3. **Retry mechanism:** Implement message queue phía client — nếu send_message event không nhận ACK trong 3s, retry 3 lần.
4. **Reconnection config:** Socket.IO auto-reconnect với exponential backoff (1s, 2s, 4s, max 10s).
5. **Offline indicator:** Hiển thị "Đang kết nối lại..." banner khi socket disconnect.
6. **Message deduplication:** Sử dụng message UUID để tránh duplicate khi retry.

**Action items:**
- [ ] Implement REST fallback polling (Sprint 4)
- [ ] Test chat trên mạng 3G throttled (Chrome DevTools Network throttling)
- [ ] Implement offline queue cho messages

---

### 🔴 R5: VPS downtime / resource exhaustion

**Mô tả:**
VPS 2-4GB RAM chạy 4 Docker containers (Nginx, Node.js, PostgreSQL, Redis) + Socket.IO + WebRTC signaling + ChromaDB có thể bị cạn kiệt tài nguyên, gây OOM killer, swap thrashing, hoặc crash hoàn toàn.

**Xác suất:** Trung bình (đặc biệt khi có nhiều concurrent video calls + AI requests)

**Tác động:** Cao — Toàn bộ hệ thống down, không truy cập được.

**Phương án dự phòng:**
1. **Resource planning:**
   - Nginx: 256MB
   - Node.js (Express + Socket.IO): 768MB → Nâng lên 1GB (thêm Socket.IO + signaling)
   - PostgreSQL: 512MB
   - Redis: 384MB
   - ChromaDB: 256MB (nếu chạy container riêng) hoặc in-process
   - **Tổng:** ~2.5GB → VPS tối thiểu **4GB RAM** ($24/tháng DigitalOcean)
2. **Swap file:** Cấu hình 2GB swap file trên VPS phòng trường hợp OOM.
3. **Health check + auto-restart:** Docker `restart: unless-stopped` + PM2 auto-restart nếu crash.
4. **Resource monitoring:** Cài đặt `htop`, `docker stats`, uptime monitoring (UptimeRobot free tier).
5. **Graceful degradation:** Nếu server quá tải, tắt AI chatbot (kill-switch) để giải phóng RAM cho core features.
6. **Backup deploy plan:** Có backup docker-compose file + DB dump, có thể re-deploy trên VPS mới trong 30 phút.

**Action items:**
- [ ] Thuê VPS ít nhất 4GB RAM (Sprint 2)
- [ ] Setup swap file 2GB
- [ ] Setup UptimeRobot monitoring
- [ ] Document disaster recovery procedure

---

### 🔴 R6: Time constraint – 16 tuần không đủ cho 7 hướng

**Mô tả:**
7 hướng phát triển là tham vọng lớn cho 2 người trong 16 tuần. Nếu gặp unexpected issues (bugs phức tạp, learning curve công nghệ mới, conflict lịch học), có thể không kịp hoàn thành tất cả.

**Xác suất:** Cao

**Tác động:** Cao — Báo cáo thiếu nội dung, demo không hoàn chỉnh.

**Phương án dự phòng:**
1. **Ưu tiên theo MVP:** Đã phân rõ scope MVP vs Full (xem file 04). Luôn hoàn thành MVP trước, Full là bonus.
2. **Priority tiering:**
   - **P0 (Must have):** Testing, CI/CD, Deploy, Chat BS-BN — Đây là nền tảng
   - **P1 (Should have):** Mobile App (Patient), Telemedicine (WebRTC)
   - **P2 (Nice to have):** AI nâng cao (multimodal, RAG), Mobile Doctor screens
3. **Cut scope early:** Nếu đến Sprint 5 (W9) mà Mobile chưa có 8 screens, cắt Doctor mobile screens, focus Patient.
4. **Parallel work:** Giang (BE) và Hải (FE/Mobile) work song song tối đa, giảm blocking.
5. **Weekly standup:** Mỗi tuần review progress 15 phút, adjust plan nếu cần.
6. **Buffer time:** Sprint 7 (W13-14) là "Integration + Polish" = buffer tự nhiên cho catch-up.

**Action items:**
- [ ] Tuần 1: Cả hai thống nhất priority P0/P1/P2
- [ ] Mỗi sprint review: Nếu behind schedule, cut scope ngay
- [ ] Không perfectionism, ship MVP first

---

### 🟢 R7: Sequelize sync conflict khi thêm bảng/cột mới

**Mô tả:**
Hiện tại hệ thống dùng `sequelize.sync({ alter: true })` để auto-sync schema. Khi thêm bảng mới (Conversations, Messages, VideoSessions, DeviceTokens) hoặc thêm cột vào bảng cũ (Bookings.isTelemedicine), có thể gây conflict hoặc data loss nếu không cẩn thận.

**Xác suất:** Thấp (nếu dùng migrations đúng cách)

**Tác động:** Trung bình — Data loss hoặc schema corruption.

**Phương án dự phòng:**
1. **Sử dụng Sequelize Migrations:** Thay vì `sync({ alter: true })`, viết migration files cho mọi thay đổi schema. Đảm bảo reversible (up/down).
2. **Test migration trên staging trước:** Chạy migration trên test DB trước, verify schema đúng, rồi mới chạy trên production.
3. **Database backup trước mỗi migration:** `pg_dump` trước khi chạy `npx sequelize-cli db:migrate`.
4. **Giữ nguyên `sync({ alter: true })` cho development**, chỉ dùng migrations cho production.

---

### 🟢 R8: Firebase Cloud Messaging delivery không đáng tin cậy

**Mô tả:**
FCM không guarantee 100% delivery, đặc biệt trên Android (các OEM như Xiaomi, Huawei restrict background services) hoặc khi user tắt notification permission.

**Xác suất:** Thấp (cho demo/testing, FCM hoạt động tốt)

**Tác động:** Trung bình — User bỏ lỡ notification, nhưng vẫn thấy khi mở app.

**Phương án dự phòng:**
1. **In-app notification:** Ngoài push notification, có in-app notification center (unread badge). Mỗi notification lưu vào DB, hiển thị khi user mở app.
2. **Retry mechanism:** Nếu FCM trả lỗi, retry 3 lần với exponential backoff.
3. **Test trên thiết bị thực:** Không chỉ test trên emulator, test trên Xiaomi/Samsung/iPhone thật.

---

### 🟢 R9: ChromaDB performance với dataset lớn

**Mô tả:**
ChromaDB (vector database) có thể chậm nếu knowledge base y tế quá lớn (>10,000 documents). Embedding generation tốn thời gian và RAM.

**Xác suất:** Thấp (đồ án chỉ cần ~500-1000 documents)

**Tác động:** Trung bình — AI response chậm hơn bình thường.

**Phương án dự phòng:**
1. **Giới hạn KB size:** Chỉ seed ~500 documents (bệnh phổ biến, triệu chứng, chuyên khoa mapping). Đủ cho demo.
2. **Pre-compute embeddings:** Tạo embeddings offline (batch), lưu sẵn vào ChromaDB. Không generate embedding real-time.
3. **Fallback:** Nếu ChromaDB không kịp setup, fallback về JSON knowledge base + keyword search (đơn giản hơn RAG nhưng vẫn cải thiện accuracy).
4. **Cache RAG results:** Cache kết quả RAG query vào Redis (TTL 10 phút).

---

### 🟢 R10: GitHub Actions CI/CD pipeline chậm / timeout

**Mô tả:**
GitHub Actions free tier giới hạn 2000 minutes/month. Pipeline chạy lâu (npm install + test + build + docker push) có thể vượt quota hoặc timeout.

**Xác suất:** Trung bình

**Tác động:** Thấp — Delay deploy, nhưng có thể deploy thủ công.

**Phương án dự phòng:**
1. **Dependency caching:** Cache `node_modules` bằng `actions/cache` — giảm npm install từ 2 phút xuống 20 giây.
2. **Docker layer caching:** Sử dụng `docker/build-push-action` với `cache-from` để cache Docker layers.
3. **Parallel jobs:** Chạy lint, test BE, test FE, build song song (không sequential).
4. **Skip unnecessary:** Dùng path filters — nếu chỉ thay đổi docs, skip test+build.
5. **Manual deploy fallback:** Nếu CI hết minutes, deploy thủ công bằng SSH + `docker compose up --build`.

---

## MA TRẬN RỦI RO (Xác suất × Tác động)

```
Tác động ↑
Cao    │ R5(VPS)     R1(WebRTC)   R6(Time)
       │             R2(RN perf)
Trung  │ R7(DB)      R3(Gemini)
bình   │ R8(FCM)     R4(Socket)
       │ R9(ChromaDB)
Thấp   │             R10(CI/CD)
       └──────────────────────────────→ Xác suất
         Thấp      Trung bình     Cao
```

**Ưu tiên xử lý:** R6 (Time) → R1 (WebRTC) → R5 (VPS) → R2 (RN perf) → R3 (Gemini) → R4 (Socket) → còn lại.
