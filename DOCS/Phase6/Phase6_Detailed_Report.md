# 📊 BÁO CÁO CHI TIẾT GIAI ĐOẠN 6: GIAO DIỆN & CHỨC NĂNG ADMIN MODULE

> **Dự án:** BookingCare — Hệ thống đặt lịch khám bệnh trực tuyến
> **Giai đoạn:** 6 — Xây dựng màn hình Admin & Doctor (Frontend Dashboard)
> **Mục tiêu:** Cung cấp tài liệu miêu tả chi tiết UI/UX của từng màn hình (Screen) được xây dựng trong Giai đoạn 6, kèm theo phương pháp nghiệm thu (proof) rõ ràng.

---

## 1. MÀN HÌNH TỔNG QUAN HỆ THỐNG (SYSTEM LAYOUT & SIDEBAR)
**Đường dẫn truy cập:** `http://localhost:3000/system/*`

### 1.1 Miêu tả giao diện (UI/UX)
Màn hình này bọc bên ngoài toàn bộ các trang quản lý bên trong, chia làm 2 phần chính:
*   **Sidebar Navigation (Thanh điều hướng bên trái):** 
    *   Sử dụng màu nền Dark Navy (`#1a1a2e`). Cố định (Fixed) bên trái với chiều rộng `250px`.
    *   Trên cùng là Logo `🏥 BookingCare | Admin Panel` màu trắng nổi bật.
    *   Danh sách Menu được render động tùy thuộc vào vai trò (Role):
        *   **Nếu đăng nhập Admin:** Sẽ có menu *Quản lý người dùng, Quản lý bác sĩ, Quản lý phòng khám, Quản lý chuyên khoa*.
        *   **Nếu đăng nhập Bác sĩ:** Chỉ thấy menu *Quản lý kế hoạch khám bệnh* và *Quản lý bệnh nhân*.
    *   Menu đang được chọn (Active) sẽ có viền dọc và đổi màu chữ sang màu xanh ngọc Teal (`#45c3d2`).
*   **Header (Thanh tiêu đề bên trên):**
    *   Cố định phía trên (Sticky top), màu nền trắng, có đổ bóng nhẹ (box-shadow).
    *   Góc phải hiển thị dòng chữ chào mừng `Xin chào, [Tên người dùng]`.
    *   Nút "Đăng xuất" màu đỏ nổi bật (`#dc3545`) góc ngoài cùng bên phải.
*   **Content Area (Khu vực nội dung giữa):** Vùng trống rộng rãi dùng cơ chế `<Outlet>` để render các màn hình chức năng.

### 1.2 Cách chứng minh / Nghiệm thu
1.  **Thử thách Role (Phân quyền UI):**
    *   Đăng nhập bằng tài khoản Bác sĩ -> Quan sát Sidebar. Chứng minh không tồn tại menu "Quản lý người dùng", bảo vệ dữ liệu tuyệt đối. 
2.  **Khóa tuyến đường (Route Guard):**
    *   Mở trình duyệt ẩn danh, gõ thẳng `http://localhost:3000/system/user-manage`.
    *   Hệ thống sẽ không chớp màn hình Admin mà bẻ lái (Redirect) ngay lập tức về trang Đăng nhập `/login`.

---

## 2. MÀN HÌNH QUẢN LÝ NGƯỜI DÙNG (USER MANAGE)
**Đường dẫn truy cập:** `/system/user-manage`

### 2.1 Miêu tả giao diện (UI/UX)
Đây là màn hình CRUD tiêu chuẩn, chia làm 2 nửa trên dưới:
*   **Nửa trên (Form Nhập liệu):**
    *   Gồm 9 trường dữ liệu được xếp thành 2-3 cột gọn gàng (Bootstrap Form Grid).
    *   Các input textbox bình thường cho: *Email, Password, First Name, Last Name, Address, Phone*.
    *   Các thẻ `<select>` dropdown cho: *Gender, Role* (Dữ liệu Role, Gender gọi từ bảng Allcode dưới DB lên không cứng nhắc).
    *   Khu vực Upload ẢNH ĐẠI DIỆN (`Avatar`): Có nút *Chọn ảnh* (ẩn input file đi) và khung xem trước (Preview) ảnh Bo tròn.
    *   Nút Action: Nút "Lưu người dùng" màu xanh dương nổi bật.
*   **Nửa dưới (Danh sách Table):**
    *   Bảng dữ liệu sọc ngang (Striped table) viền xám nhạt hiện đại.
    *   Các cột: *Email, First Name, Last Name, Address, Cột Action*.
    *   Cột Action có 2 nút Icon: Sửa (Màu vàng cam `warning`), Xóa (Màu đỏ `danger`).

### 2.2 Cách chứng minh / Nghiệm thu
1.  **Kiểm tra tính năng Bóc tách Base64 của Ảnh:**
    *   Bấm chọn 1 ảnh Avatar -> Ảnh hiện lên khung bo tròn nhỏ nỏ góc bên cạnh.
    *   Điền form lưu lại -> Kiểm tra Network XHR, Payload gửi về Backend là một chuỗi siêu dài bắt đầu từ `/9j/4AAQSk...`, không có dính tiền tố `data:image/jpeg;base64,` (Giúp giảm tải bộ nhớ DB).
2.  **Kiểm tra tính năng Bảo vệ Password khi Edit:**
    *   Bấm nút Sửa (màu vàng) trên 1 user. Notice: 2 ô *Email* và *Password* sẽ bị **khóa đen (Disabled)**, không cho click. Nút xanh đổi tên thành "Lưu thay đổi".
    *   Bấm Lưu -> Mật khẩu cũ tại MySQL không bị Reset, user vẫn dùng pass cũ bình thường.
3.  **Xóa bằng SweetAlert2:**
    *   Bấm icon Xóa thùng rác -> Lập tức tối màu nền màn hình, hiện 1 popup đẹp mắt ở giữa "Are you sure? Bạn có muốn xóa không?". Bấm OK -> Bản ghi biến mất (State cập nhật không cần F5).

---

## 3. MÀN HÌNH QUẢN LÝ THÔNG TIN BÁC SĨ (DOCTOR MANAGE)
**Đường dẫn truy cập:** `/system/doctor-manage`

### 3.1 Miêu tả giao diện (UI/UX)
Màn hình phức tạp nhất, thiên về viết mô tả và nối bảng, không có khung Table list.
*   **Khu vực 1 - Cột chọn Bác sĩ & Miêu tả ngắn:**
    *   Khung `react-select` (Dropdown có search text) "Chọn Bác Sĩ" dán nhãn lấy từ Database (List này chỉ lặp ra những user có RoleId = R2).
    *   Bên cạnh là khung `textarea` "Miêu tả giới thiệu": Nơi nhập tiểu sử 2-4 dòng để hiện lên ngoài trang giới thiệu (VD: Bác sĩ trưởng khoa vi phẫu...).
*   **Khu vực 2 - Các cấu hình (Allcode 6 nhóm):**
    *   Có 6 cái dropdown list (`react-select` cao cấp): Chọn Giá Khám (300k, 500k), Chọn Phương thức thanh toán (Tiền mặt, ATM), Chọn Tỉnh/Thành (Hà Nội, HCM), Chọn Phòng khám, Chọn Chuyên khoa.
*   **Khu vực 3 - Trình soạn thảo văn bản (Markdown Editor):**
    *   Giao diện Editor chiếm trọn màn hình bên dưới (Tích hợp package `@uiw/react-md-editor`).
    *   Chia làm 2 nửa: Cột trái để viết thẻ Markdown (`# Heading`, `**Bold**`), cột phải hiển thị (Live Preview) ngay lập tức văn bản sau khi render HTML. Chữ to chuẩn màu sáng.
*   **Khu vực 4 - Nút Action Động:** Nút lưu màu xanh sẽ thay đổi nhãn mác (Tạo thông tin / Lưu thay đổi) tùy state.

### 3.2 Cách chứng minh / Nghiệm thu
1.  **Chứng minh Logic Upsert (Khôi phục Data vào Editor):**
    *   Trỏ dropdown "Chọn bác sĩ" vào dòng *Bác sĩ Nguyễn Văn A* (Người đã từng được điền thông tin).
    *   Màn hình lập tức tự "Chớp" 1 cái -> Đổ toàn bộ dữ liệu (Giá khám, Phòng khám, Đoạn văn bản dài thòong loòng) ngược trở lại vào các ô lưới tương ứng. Khung editor markdown load lại y xì nội dung cũ. Nút dưới cùng biến thành chữ `Lưu thay đổi`.
2.  **Chứng minh Code An toàn khi lưu:**
    *   Gõ thẻ `<script>alert('hack')</script>` vào Markdown.
    *   Báo cáo: Trình render sẽ tự động mã hóa Text, đảm bảo Backend và Database (`markdowns` table) chỉ nhận chuỗi String Text chứ không bị dính mã độc XSS. Nguồn lưu là `contentHTML` và `contentMarkdown` riêng biệt.

---

## 4. MÀN HÌNH QUẢN LÝ PHÒNG KHÁM & CHUYÊN KHOA
*(2 màn hình này dùng chung triết lý thiết kế (Design Pattern), khác URL)*
**Đường dẫn truy cập:** `/system/clinic-manage` và `/system/specialty-manage`

### 4.1 Miêu tả giao diện (UI/UX)
Hai màn hình chia làm 2 khúc (Form tạo phía trên và Danh sách hiển thị phía dưới).
*   **Phần Thêm mới:**
    *   Form có Input Tên (Tên phòng khám / Chuyên khoa).
    *   Khu vực Upload Ảnh Logo / Icon đại diện. Khung xem trước sẽ hiển thị hình **Chữ Nhật (Thay vì hình Tròn như Avatar Bác sĩ)** do đặc thù nhận diện thương hiệu.
    *   *(Riêng Phòng khám có thêm Địa chỉ nhà cụ thể).*
    *   Trường Markdown Editor để viết bài giới thiệu bài bản về Chuyên khoa / Thiết bị phòng khám.
*   **Phần Hiển thị (Read Component):**
    *   Không dùng Table khô khan. Thay bằng **CSS Grid List (Các khối hộp thẻ Card)**.
    *   Mỗi chuyên khoa/phòng khám đổ xuống thành 1 cái hộp (Card). Có ảnh nền trên, tên in đậm bên dưới. Góc nhỏ cái thẻ có 2 nút Edit / Delete (Icon màu vàng cam và đỏ).
    *   Bố cục màn hình rộng sẽ dàn 4 Card 1 hàng, thu nhỏ lại còn 2 Card 1 hàng (Responsive Flex).

### 4.2 Cách chứng minh / Nghiệm thu
1.  **Kiểm tra tính năng Card Layout:**
    *   Tạo "Chuyên khoa Xương Khớp" -> Bấm lưu -> Component bên dưới lập tức mọc thêm 1 ô vuông hình ảnh Xương Khớp (Kéo data từ DB buffer ra ảnh nét). Không cần F5. Không bị vỡ Grid.
2.  **Chứng minh tính toàn vẹn dữ liệu lúc xoá:**
    *   Bấm thùng rác trỏ vào Phòng khám.
    *   MySQL truy vấn bảng `clinics` thấy mất. Ảnh hưởng lớn: Nếu có bác sĩ đang làm ở PK này, liên kết logic khoá ngoại hoặc query sẽ null ở màn hình Booking sau này (Trực quan database checking).

---

## 5. MÀN HÌNH QUẢN LÝ KẾ HOẠCH KHÁM BỆNH (SCHEDULE MANAGE)
**Đường dẫn truy cập:** `/system/schedule-manage`

### 5.1 Miêu tả giao diện (UI/UX)
Đây là màn hình bấm Click & Choose (Chọn nhanh) tối ưu UX cho Bác sĩ thiết lập ca làm việc, không cần gõ chữ.
*   **Khu vực Cấu hình đầu vào:**
    *   Dropdown chọn Bác sĩ (Nếu login là bác sĩ thì có thể ô này bị Disable đi, tự gán bản thân).
    *   Khung Chọn Ngày (Date Picker - Lịch tích hợp thư viện Flatpickr / React Datepicker) định dạng hiển thị `dd/MM/yyyy`. Không cho phép chọn ngày Qúa Khứ.
*   **Khu vực Ca làm việc (Time Slots):**
    *   Hiển thị 8 khối nút bấm hình chữ nhật bo tròn (Pill Outline button). VD: `08:00 - 09:00`, `09:00 - 10:00`,... `16:00 - 17:00`.
    *   Các nút mang tính chất **Toggle (Bật/Tắt)**. Bấm vào chuyển màu Vàng Cam (Đang dánh dấu chọn `Active`), bấm phát nữa tắt màu xám.
*   **Khu vực Quản lý Lịch Cũ:**
    *   Một dòng Table text/block hiển thị những Khung Giờ ĐÃ ĐƯỢC TẠO tước đó ở dưới, kèm cái dấu `(x)` để huỷ giờ đó nếu bác sĩ muốn off (xoá 1 record).

### 5.2 Cách chứng minh / Nghiệm thu
1.  **Chứng minh chống Nhấn chéo Ngày:**
    *   Chọn "Bác sĩ A" và Ngày `01/01/2030`. Bấm chọn giờ 8h-9h (Ca số 1).
    *   Nếu chọn lại Ngày `02/01/2030`, hệ thống tự reset khung giờ, làm mờ đi ca số 1, đảm bảo không lưu nhầm giờ của ngày 1 sang ngày 2.
2.  **Chứng minh Payload (Bulk Create):**
    *   Bấm 4 Nút (Tạo 4 ca làm việc). Bấm Lưu.
    *   Kiểm tra Console Network -> Xem mảng dữ liệu bắn đi (Request Payload): `{ arrSchedule: [ {doctorId, date: timestamp_ngay, timeType: 'T1'}, {..., timeType: 'T2'},... ] }`. Điều này chứng minh Bulk Insert hoạt động, tiết kiệm 4 lần gọi API lẻ.
3.  **Chứng minh Load Data Có Sẵn:**
    *   F5 trang web cất đi. Quay lại chọn đúng Bác sĩ G và Ngày M.
    *   Lập tức những nút T1, T2 bác sĩ đã chọn màu vàng từ Database được lấy lên và đổ màu Vàng Trở lại / Bị vô hiệu hoá nút không cho thêm đè. Tránh lỗi Backend quăng exception `Duplicate Entry`. 

---
> Kết thúc tài liệu. Bộ hướng dẫn cung cấp cấu trúc chi tiết UX/UI của hệ thống Admin từ màu sắc tới bố cục, kèm công đoạn verify (chứng minh) rất rõ ràng giúp đối tác công nghệ review dự án Phase 6 hiệu quả tuyệt đối.
