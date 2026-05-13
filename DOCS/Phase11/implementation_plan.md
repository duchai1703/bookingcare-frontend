# Kế hoạch Triển Khai Luồng: Xác thực Email -> Thanh toán VNPay

Mục tiêu: Đảm bảo bệnh nhân phải xác thực email trước, sau đó hệ thống mới cho phép thanh toán VNPay. Luồng này giúp đảm bảo 100% email là thật trước khi phát sinh giao dịch.

## User Review Required

Bạn vui lòng đọc kỹ các thay đổi dưới đây. Nếu bạn đồng ý với luồng logic này, hãy nhấn **Approve** (Chấp nhận) để mình tiến hành viết code trực tiếp vào các file của bạn nhé!

## Proposed Changes

---

### Backend: Database & Allcodes

Cần thêm một trạng thái trung gian `S1.5` để phân biệt giữa "Mới đặt" (S1) và "Đã xác thực email, chờ thanh toán" (S1.5).

#### [MODIFY] [Cơ sở dữ liệu (Database)](file:///DB_Placeholder)
- Chạy script SQL (hoặc tạo Seeder) để thêm vào bảng `Allcodes`:
  - `type`: `STATUS`
  - `keyMap`: `S1.5`
  - `valueEn`: `Pending Payment`
  - `valueVi`: `Chờ thanh toán`

---

### Backend: Core Logic (Xử lý Race Condition & Slot)

**QUAN TRỌNG:** Để tránh trường hợp 2 bệnh nhân cùng thanh toán cho 1 slot cuối cùng (dẫn đến việc đã trả tiền nhưng hết chỗ), chúng ta **BẮT BUỘC PHẢI GIỮ CHỖ (Tăng slot)** ngay tại thời điểm họ xác thực email (S1.5), và giữ chỗ đó trong 20 phút để họ thanh toán. Nếu không thanh toán, Cronjob sẽ huỷ và nhả slot ra.

#### [MODIFY] [patientService.js](file:///c:/Users/USER/Documents/DOAN1/bookingcare-backend/src/services/patientService.js)
- **Hàm `postBookAppointment` (Lỗi 11, 14, 15 & Lỗi sập cục bộ 26):**
  - **Lỗi 11 (Crash VNPay):** Phải tạo mã `crypto.randomUUID()` lưu vào `paymentToken` ngay lúc tạo S1.
  - **Lỗi 14 (Null Pointer Exception):** Khi fetch giá khám (`Doctor_Infor`), nếu bác sĩ quên cấu hình giá, hệ thống sẽ văng lỗi 500 Crash Server. Bắt buộc phải có cờ kiểm tra `if (!doctorInfor)`.
  - **Lỗi 15 (Forex Leak - MẤT 99% DOANH THU):** Nếu bệnh nhân dùng UI Tiếng Anh (USD), VNPay sẽ thu đúng 25 USD * 100 = 2,500 VNĐ. Cột `bookingPrice` **BẮT BUỘC phải lưu `valueVi` (VND)** bất kể ngôn ngữ.
  - **Lỗi 26 (Synchronous SMTP Coupling - Sập hệ thống đặt khám):** Hiện tại hàm này đang gọi `sendEmailBooking` bên TRONG Transaction. Nếu Gmail bị sập hoặc phòng khám đạt giới hạn gửi 500 email/ngày (Rate Limit), hàm gửi mail văng lỗi sẽ Kéo theo lệnh Rollback toàn bộ DB! Nghĩa là không ai đặt được lịch khám chỉ vì... lỗi gửi mail! **Cách vá:** Phải `commit()` Transaction lưu DB xong xuôi, sau đó mới gọi hàm gửi Email. Nếu email lỗi, chỉ in ra Log cảnh báo chứ TUYỆT ĐỐI không huỷ lịch của khách.
- **Hàm `postVerifyBookAppointment` (Cực kỳ quan trọng - Lỗi Double Click & Lỗ hổng DoS):**
  - Đổi logic cập nhật trạng thái: `booking.statusId = 'S1.5'` (thay vì `'S2'`).
  - **VẪN GIỮ NGUYÊN** đoạn code `schedule.increment('currentNumber')` để "giữ chỗ".
  - **Bổ sung Idempotency & Chống DoS:** Nếu tìm thấy booking đã là `S1.5`, **tuyệt đối KHÔNG gọi `booking.save()`**. Phải trả về `errCode: 0` ngay lập tức. Nếu gọi `save()`, Sequelize sẽ cập nhật lại `updatedAt = NOW()`, kẻ gian có thể viết script F5 API liên tục mỗi 15 phút để gia hạn bộ đếm 20 phút của Cronjob, từ đó **chiếm dụng vĩnh viễn ghế của bác sĩ mà không thèm trả tiền!** (Denial of Service).
- **Hàm `cancelBooking` (Lỗ hổng Ghost Booking & Trách nhiệm tài chính):**
  - Sửa mảng kiểm tra điều kiện huỷ: `['S1', 'S1.5', 'S2'].includes(booking.statusId)`.
  - Logic trả slot (decrement): Trả slot nếu `oldStatus === 'S2'` HOẶC `oldStatus === 'S1.5'`.
  - **Lỗ hổng Ghost Booking:** Nếu huỷ lịch `S1.5`, phải gán thêm `booking.paymentStatus = 'cancelled'`. Nếu không gán, IPN sẽ thấy `unpaid` và báo thành công (`S2`) nhưng **không tăng lại slot**, tạo ra "Lịch ma".
  - **Lỗ hổng Trách nhiệm tài chính (Lỗi số 12):** Nếu bệnh nhân huỷ lịch `S2` (Đã thanh toán), họ sẽ bị mất tiền oan vì hệ thống chưa tích hợp API hoàn tiền VNPay tự động! **Cách vá:** Nếu `oldStatus === 'S2'`, bắt buộc đổi `paymentStatus = 'refund_pending'` (Chờ hoàn tiền) để Admin biết và hoàn tiền thủ công qua Cổng Merchant VNPay, tránh bị khách kiện cáo.

#### [MODIFY] [paymentController.js](file:///c:/Users/USER/Documents/DOAN1/bookingcare-backend/src/controllers/paymentController.js)
- **Hàm `buildVnpayUrl` & `vnpayQuerydr` (Lỗi Mismatch Date & Dead Zone):**
  - **Lỗi Mismatch Date:** Sửa `buildVnpayUrl` để nhận tham số `createDateString`. Cả 2 hàm ĐỀU PHẢI dùng `moment(booking.updatedAt)` để format thành chuỗi `YYYYMMDDHHmmss`.
  - **Lỗi 27 (Vùng Chết "Dead Zone" - Lãng phí Slot):** Hiện tại Cronjob dọn dẹp cho khách 20 phút (`updatedAt + 20m`). Nhưng biến `vnp_ExpireDate` gửi cho VNPay lại là `15m`. Nếu phút 16 khách bấm thanh toán, VNPay lập tức từ chối vì quá 15p. NHƯNG hệ thống của ta vẫn ngâm cái slot đó thêm 4 phút nữa một cách vô ích! **Cách vá:** Bắt buộc phải đồng bộ 2 con số này. `vnp_ExpireDate` phải được sửa thành `updatedAt + 20 phút` để khớp hoàn toàn với Cronjob.
- **THÊM MỚI Hàm `createPaymentUrlByToken` (Bẫy giá 0 đồng - Lỗi số 8 & 18):**
  - Bệnh nhân bấm từ email có thể chưa đăng nhập, nên không thể dùng `req.user.id`. Cần viết một hàm mới nhận `token` từ email để tìm Booking (phải ở trạng thái `S1.5`).
  - **Lỗi 8 (VNPay Crash):** Nếu `booking.bookingPrice === 0` (Khám miễn phí/Tái khám), VNPay sẽ văng lỗi. Lập tức cập nhật `statusId = 'S2'`, `paymentStatus = 'paid'` và bỏ qua bước tạo URL VNPay.
  - **Lỗi 18 (Frontend Contract Crash):** Nếu bỏ qua VNPay, KHÔNG ĐƯỢC dùng lệnh `res.redirect` hoặc trả về chuỗi rỗng. API phải trả về JSON format: `{ errCode: 0, bypassVnpay: true, redirectUrl: '/payment-result?vnp_ResponseCode=00...' }`. Nếu không, mã Frontend đang gán `window.location.href = response.data.data` sẽ bị văng lỗi trắng màn hình!
- **Hàm `vnpayIpn` (Lỗi 17, 20, 30, 31 & 32 - Chuẩn Fintech):**
  - **Lỗi 31 (Missing Amount Validation - Rớt Audit VNPay):** Tài liệu VNPay bắt buộc Merchant phải kiểm tra biến `vnp_Amount` khớp 100% với giá trị trong DB. Nếu Backend không có dòng `if (vnp_Amount != booking.bookingPrice * 100) return {RspCode: '04'}`, hệ thống sẽ rớt bài kiểm tra Audit (Nghiệm thu) của VNPay!
  - Khi VNPay trả về `00` (Thành công): Cập nhật `booking.statusId = 'S2'`, `paymentStatus = 'paid'`. **Không cần tăng slot nữa**.
  - **Lỗi 32 (Mất Transaction ID - Liệt chức năng Hoàn tiền):** Khi thanh toán thành công, VNPay trả về biến `vnp_TransactionNo`. Nếu không lưu biến này vào DB, sau này Admin sẽ **KHÔNG THỂ** sử dụng tính năng Hoàn tiền tự động của VNPay (vì API hoàn tiền bắt buộc phải truyền mã này vào). **Cách vá:** Bắt buộc viết Migration thêm cột `vnpayTransactionNo` vào bảng `Bookings` và lưu nó lại trong IPN.
  - Khi thất bại (hủy thanh toán): Chuyển về `'S4'` và **BẮT BUỘC DECREMENT SLOT**.
- **Hàm `bookingByToken` (Lỗ hổng Đua lệnh / Race Condition giữa Return URL & IPN)**:
  - Sửa điều kiện thành: `paymentStatus: { [Op.in]: ['paid', 'failed', 'expired', 'unpaid', 'paid_but_expired', 'refund_pending'] }`. 
  - **Lỗi 22 (Vỡ màn hình Frontend - UI Crash):** Vì BE trả về cờ `refund_pending` và `paid_but_expired`, nếu Frontend (Component `PaymentBadge`) không có dictionary để map màu sắc cho 2 cờ này, UI sẽ văng lỗi `undefined` và sập toàn bộ trang Dashboard! **Cách vá:** Phải cập nhật thư viện Component ở Frontend để hiển thị màu Cam (Chờ hoàn tiền) và màu Tím (Cần xử lý gấp) cho 2 cờ này.
- **Hàm `cleanupS1` (Lỗi 13, 16, 25 & Lỗi 33 - Trùng lặp Request ID):**
  - Cập nhật luồng dọn dẹp: Quét `statusId: 'S1'` (dựa trên `createdAt`) -> `S4`, không nhả slot. Quét `statusId: 'S1.5'` (dựa trên **`updatedAt`**) -> `S4`, BẮT BUỘC nhả slot.
  - **LỖ HỔNG CHẾT NGƯỜI 16 (CONNECTION POOL EXHAUSTION):** Tuyệt đối KHÔNG ĐƯỢC mở Database Transaction (`t`) rồi mới gọi HTTP Request sang VNPay (`vnpayQuerydr`)! Phải gọi `vnpayQuerydr` TRƯỚC, đợi kết quả xong mới mở Transaction siêu ngắn để lưu vào DB.
  - **LỖ HỔNG 25 (DATA OVERWRITE - Tác dụng phụ của Lỗi 16):** Khi đưa `vnpayQuerydr` ra ngoài Transaction, ta đã tạo ra 1 lỗ hổng Race Condition mới! Giả sử `vnpayQuerydr` báo khách CHƯA trả tiền. Nhưng ngay lúc Cronjob chuẩn bị ghi `S4` vào DB, khách hàng bấm thanh toán và IPN của VNPay báo `S2` về DB trước! Cronjob sau đó sẽ **Ghi đè** `S4` lên `S2`, phá huỷ lịch khám đã thanh toán của khách! **Cách vá:** Trong Transaction siêu ngắn của Cronjob, trước khi ghi `S4`, BẮT BUỘC phải check lại DB: `if (booking.paymentStatus === 'paid') { return; // Bỏ qua, IPN đã ghi nhận thành công! }`.
  - **Lỗi 33 (QueryDR Collision - Huỷ nhầm hàng loạt):** Cronjob xử lý song song 5 giao dịch cùng lúc (`Promise.all`). Nếu hàm `vnpayQuerydr` tạo biến `vnp_RequestId` dựa trên thời gian (`HHmmss`), cả 5 request gửi sang VNPay sẽ có CHUNG 1 ID! VNPay sẽ đánh rớt 4 request với mã lỗi 94 (Duplicate). Cronjob thấy lỗi 94 tưởng khách chưa trả tiền nên sẽ **Huỷ toàn bộ lịch khám (S4)** một cách oan uổng! **Cách vá:** `vnp_RequestId` bắt buộc phải là `crypto.randomUUID()` để không bao giờ trùng lặp khi chạy đa luồng.

## Yêu cầu Vận hành & Frontend (Ops & UI/UX) - Lỗi 19, 21, 23, 28, 29, 34
- **Lỗi 19 (Server Clock Drift Reject):** Bắt buộc System Admin phải cài đặt đồng bộ NTP (Network Time Protocol) trên Server DB và Backend để đồng hồ không lệch quá 1 giây so với VNPay, tránh bị VNPay từ chối mã `vnp_CreateDate`.
- **Lỗi 21 (VNPay IPv6 Block):** Các nhà mạng 5G đang dùng IPv6. VNPay CẤM IPv6. Backend BẮT BUỘC phải có logic gạt bỏ IPv6 (chuyển về IPv4 hoặc 127.0.0.1) khi gửi biến `vnp_IpAddr` sang VNPay, nếu không giao dịch từ điện thoại sẽ sập 100%.
- **Lỗi 23 (Bot Scan Email "Cướp" Lịch - CỰC ĐỘC):** Các hệ thống như Gmail, Zalo có Bot tự động "bấm" vào link trong tin nhắn để quét mã độc. Nếu trang `VerifyEmail.jsx` gọi API xác nhận tự động bằng `useEffect`, con Bot sẽ xác nhận thay người dùng! Bộ đếm 20 phút bắt đầu chạy, slot bị trừ. Nửa tiếng sau người dùng thật mới mở email ra thì đã bị Cronjob xoá mất tiêu vì "Hết hạn"! **Cách vá:** Trang `VerifyEmail.jsx` TUYỆT ĐỐI KHÔNG tự gọi API. Phải làm một nút to đùng: **"Bấm vào đây để Xác nhận Lịch khám và Thanh toán"**. Khách bấm bằng tay thì mới bắt đầu trừ slot và chạy đếm ngược 20 phút!
- **Lỗi 28 (Bẫy múi giờ Cloud - The GMT Trap):** VNPay bắt buộc mọi mốc thời gian phải là `Asia/Ho_Chi_Minh` (GMT+7). Nếu ta deploy Node.js lên server AWS/GCP (mặc định là múi giờ UTC), lệnh `moment().format()` sẽ tạo ra thời gian bị lùi 7 tiếng! VNPay sẽ từ chối 100% giao dịch. **Cách vá:** Bắt buộc phải dùng thư viện `moment-timezone` và ép kiểu `.tz('Asia/Ho_Chi_Minh')` khi tạo `vnp_CreateDate` và `vnp_ExpireDate`.
- **Lỗi 29 (Vỡ màn hình hoảng loạn khi F5 trang kết quả):** Frontend `PaymentResult.jsx` hiện tại đang làm sạch URL và xoá luôn `sessionStorage` ngay sau khi load xong để bảo mật. NHƯNG nếu khách hàng có thói quen bấm **F5 (Refresh)** để xem lại kết quả, dữ liệu bốc hơi hết! Màn hình sẽ hiện lỗi đỏ chót "Không có dữ liệu". Khách hàng vừa bị trừ 500k, nhìn thấy màn hình báo lỗi sẽ hoảng loạn tột độ và gọi cháy máy phòng khám! **Cách vá:** Giữ nguyên `sessionStorage`, cho phép F5 thoải mái để load lại lịch sử thanh toán.
- **Lỗi 34 (Rò rỉ Dữ liệu Y tế qua HTTP Referer Header):** Trang Kết quả có chứa `token` trên URL. Nếu trang này load một hình ảnh từ server ngoài hoặc bệnh nhân bấm share link, trình duyệt sẽ tuồn nguyên cái URL này sang Server của kẻ thứ 3 qua `Referer Header`! Hacker nhặt được token, gọi API `bookingByToken` và đánh cắp thông tin đặt khám của bệnh nhân (Lộ lọt dữ liệu y tế). **Cách vá:** Bắt buộc chèn thẻ `<meta name="referrer" content="no-referrer">` vào Frontend để bịt kín lỗ hổng bảo mật rò rỉ URL này!
- **Lỗi 24 (Full Table Scan sập Database I/O):** Cronjob `cleanupS1` chạy mỗi phút một lần, tìm kiếm các bản ghi có `statusId` là S1/S1.5 và `paymentStatus` là unpaid. Nếu bảng Bookings có hàng triệu bản ghi mà không được đánh Index, MySQL sẽ phải quét toàn bộ bảng (Full Table Scan) mỗi phút một lần! Điều này sẽ nướng chín CPU và I/O của Database Server. **Cách vá:** Bắt buộc viết Migration tạo Composite Index cho 2 cột `(statusId, paymentStatus)` trên bảng Bookings.

#### [MODIFY] [web.js](file:///c:/Users/USER/Documents/DOAN1/bookingcare-backend/src/routes/web.js)
- Đăng ký các API thanh toán vào file routes chính (dành cho public, không có verifyToken):
  - `POST /api/v1/payment/create-payment-url-by-token` -> `paymentController.createPaymentUrlByToken`
  - `GET /api/v1/payment/vnpay-ipn` -> `paymentController.vnpayIpn`

---

### Frontend: Giao diện Xác thực Email

Trang `VerifyEmail.jsx` cần được nâng cấp. Sau khi API trả về thành công (S1.5), thay vì chỉ hiện dòng chữ "Thành công", trang sẽ hiện giao diện hoá đơn tóm tắt và nút "Thanh toán VNPay".

#### [MODIFY] [VerifyEmail.jsx](file:///c:/Users/USER/Documents/DOAN1/bookingcare-frontend/src/containers/Patient/VerifyEmail.jsx)
- **State mới**: Thêm biến để lưu thông tin lịch hẹn (giá tiền, bác sĩ) để hiển thị. (Có thể Backend cần trả về kèm data khi verify thành công).
- **UI Mới**: Nếu `status === true` (Verify thành công), hiển thị một thẻ Card có nội dung:
  > "Email của bạn đã được xác thực! Vui lòng thanh toán phí khám để hoàn tất việc đặt lịch. Ghế của bạn sẽ được giữ trong 20 phút."
  > **[ Nút: Thanh toán bằng VNPay ]**
- **Sự kiện OnClick**: Khi bấm nút, gọi API mới `POST /api/v1/payment/create-payment-url-by-token` (truyền `token` lấy từ URL). Sau đó lấy `paymentUrl` trả về và chuyển hướng sang VNPay.

#### [MODIFY] [doctorSlice.js](file:///c:/Users/USER/Documents/DOAN1/bookingcare-frontend/src/redux/slices/doctorSlice.js)
- Sửa response của thunk `verifyBooking` để lấy data (nếu backend trả về) và thêm Thunk mới `createPaymentByToken` để gọi API lấy URL thanh toán.

#### [MODIFY] [PatientBookings.jsx](file:///c:/Users/USER/Documents/DOAN1/bookingcare-frontend/src/containers/PatientPortal/PatientBookings.jsx) & [vi.json] (Rò rỉ UX)
- **Lịch sử khám (Dashboard Bệnh nhân):** Cập nhật API query params (nếu có) để lấy cả trạng thái `S1.5` vào tab "Lịch hẹn sắp tới".
- Bổ sung translation cho Allcode `S1.5` -> "Chờ thanh toán" để bệnh nhân nhận biết được lịch hẹn nào họ chưa thanh toán. (Có thể thêm nút thanh toán luôn ở đây nếu cần).

## Verification Plan

### Manual Verification
1. Dùng tài khoản bệnh nhân đặt lịch -> Nhận được Email (S1).
2. Click link trong Email -> Mở ra trang web hiển thị Nút to: **"Bấm vào đây để Xác nhận Lịch khám và Thanh toán"** (Tuyệt đối CHƯA gọi API, DB vẫn là S1).
3. Bệnh nhân tự tay click vào Nút Xác nhận -> Giao diện tải xong báo "Đã xác thực" và hiện Nút "Thanh toán VNPay".
4. Kiểm tra Database: `Booking.statusId` là `S1.5` và `Schedule.currentNumber` **ĐÃ TĂNG THÊM 1** (Hệ thống đã giữ chỗ thành công cho bệnh nhân trong 20 phút).
5. Bấm "Thanh toán VNPay" -> Quẹt thẻ test của VNPay -> VNPay redirect về web.
6. Kiểm tra Database: `Booking.statusId` chuyển thành `S2`, `paymentStatus` là `paid`, và `Schedule.currentNumber` **KHÔNG TĂNG NỮA** (vì đã tăng từ lúc S1.5).
