# 📋 Phase 8 – File 4: Backend API — Route, Controller, Service

> **Files:** `web.js`, `doctorController.js`, `doctorService.js`  
> **SRS Sections:** 3.11, 3.12, 3.13 | **REQ:** DR-001 → DR-011  
> **Phiên bản:** 3.0 (Enterprise Audit Fix — Row-Level Locking)  
> **Mục tiêu:** Backend bảo mật, Sequelize query kết bảng, transaction + pessimistic lock cho state change.

---

## CHANGELOG

| Version | Bug ID | Mô tả | Trạng thái |
|---------|--------|-------|-----------|
| v2.0 | BUG-001 | Query thiếu `id: bookingId` → cập nhật nhầm | ✅ FIXED |
| v2.0 | BUG-002 | cancelBooking thiếu transaction | ✅ FIXED |
| v2.0 | BUG-003 | Email từ req.body → rò rỉ data y tế | ✅ FIXED |
| **v3.0** | **BUG-008** | **Thiếu `lock: t.LOCK.UPDATE` → Double-Cancel / Double-Remedy race condition** | ✅ **FIXED** |

---

## ⚠️ [v3.0] Giải thích lỗi Concurrent Race Condition (BUG-008)

```
❌ TRƯỚC (v2.0) — CÓ RACE CONDITION:

  Kịch bản Double-Cancel:
  ────────────────────────
  Tab 1 (Bác sĩ)                    Tab 2 (Cùng bác sĩ, mở 2 tab)
  ─────────────────                  ─────────────────────
  14:00:00.000                       14:00:00.001
  cancelBooking(id=42)               cancelBooking(id=42)
       │                                  │
       ▼                                  ▼
  findOne({id:42, statusId:'S2'})    findOne({id:42, statusId:'S2'})
       │                                  │
       ▼                                  ▼
  → TÌM THẤY (status vẫn S2)        → TÌM THẤY (status vẫn S2)  ← ❌ BUG!
       │                                  │
       ▼                                  ▼
  booking.statusId = 'S4'            booking.statusId = 'S4'
  booking.save() ✅                   booking.save() ✅           ← Save lần 2!
       │                                  │
       ▼                                  ▼
  Schedule.decrement(-1) ✅           Schedule.decrement(-1) ✅   ← ❌ GIẢM 2 LẦN!
       │                                  │
       ▼                                  ▼
  currentNumber giảm 1               currentNumber giảm THÊM 1
                                     → currentNumber = -1 ← IMPOSSIBLE!

  KẾT QUẢ: Schedule.currentNumber bị GIẢM 2 LẦN cho 1 booking
           → Data inconsistency → Slot "ảo" xuất hiện!

✅ SAU (v3.0) — PESSIMISTIC LOCKING:

  Tab 1                              Tab 2
  ─────────────────                  ─────────────────────
  14:00:00.000                       14:00:00.001
  cancelBooking(id=42)               cancelBooking(id=42)
       │                                  │
       ▼                                  │
  findOne({                               │
    id: 42,                               │
    statusId: 'S2',                       │
    lock: t.LOCK.UPDATE  ← 🔒 KHÓA       │
  })                                      │
       │                                  ▼
       ▼                             findOne({
  → TÌM THẤY + KHÓA DÒNG ID=42       id: 42,
       │                               lock: t.LOCK.UPDATE
       ▼                             })
  booking.statusId = 'S4'                 │
  booking.save() ✅                       ▼
       │                             ⏳ CHỜ... (dòng bị khóa) ← Blocked!
       ▼                                  │
  Schedule.decrement(-1) ✅               │
       │                                  │
       ▼                                  │
  t.commit() → 🔓 MỞ KHÓA               │
                                          ▼
                                     findOne({id:42, statusId:'S2'})
                                          │
                                          ▼
                                     → NULL! (status đã là S4, không match S2)
                                          │
                                          ▼
                                     return { errCode: 3, message: 'Không tìm thấy' }
                                     → ĐÚNG! Từ chối request trùng lặp.
```

---

## 1. Kiến trúc bảo mật API (Defense-in-Depth)

```
Request từ Frontend
       │
       ▼
┌─────────────────────────────────────────┐
│  Lớp 1: verifyToken                     │
│  - JWT → req.user = {id, email, roleId}  │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  Lớp 2: checkDoctorRole                 │
│  - roleId === 'R2'                       │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  Lớp 3: Controller + Service Logic       │
│  - doctorId = req.user.id (JWT)          │
│  - bookingId = req.params.bookingId      │
│  - email = booking.patientData.email     │
│  - ❌ KHÔNG tin req.body.doctorId/email   │
│  - 🔒 t.LOCK.UPDATE trên findOne        │  ← [v3.0]
└─────────────────┬───────────────────────┘
                  │
                  ▼
         Service Layer (Sequelize + Transaction + Lock)
```

---

## 2. Code khai báo Route trong `web.js`

```javascript
// src/routes/web.js

const { verifyToken, checkAdminRole, checkDoctorRole } = require('../middleware/authMiddleware');

const routes = (app) => {
  // ===== DOCTOR ROUTES =====
  app.get(
    '/api/v1/doctors/:doctorId/patients',
    verifyToken, checkDoctorRole,
    doctorController.getListPatientForDoctor
  );

  app.post(
    '/api/v1/bookings/:bookingId/remedy',
    verifyToken, checkDoctorRole,
    doctorController.sendRemedy
  );

  app.patch(
    '/api/v1/bookings/:bookingId/cancel',
    verifyToken, checkDoctorRole,
    doctorController.cancelBooking
  );

  app.get(
    '/api/v1/patients/:patientId/bookings',
    verifyToken, checkDoctorRole,
    doctorController.getPatientBookingHistory
  );
};
```

---

## 3. Code Middleware `authMiddleware.js` (Đã có sẵn)

```javascript
// src/middleware/authMiddleware.js — ĐÃ CÓ SẴN

const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ errCode: -1, message: 'Chưa đăng nhập!' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ errCode: -1, message: 'Phiên đăng nhập đã hết hạn!' });
    }
    return res.status(403).json({ errCode: -1, message: 'Token không hợp lệ!' });
  }
};

const checkDoctorRole = (req, res, next) => {
  if (!req.user || req.user.roleId !== 'R2') {
    return res.status(403).json({ errCode: -1, message: 'Bạn không có quyền Bác sĩ!' });
  }
  next();
};
```

---

## 4. Code Controller `doctorController.js`

### 4.1 getListPatientForDoctor

```javascript
const getListPatientForDoctor = async (req, res) => {
  try {
    const doctorId = req.user.id;
    const { date, statusId } = req.query;

    if (!date) {
      return res.status(400).json({ errCode: 1, message: 'Thiếu tham số date!' });
    }

    const result = await doctorService.getListPatientForDoctor(doctorId, date, statusId);
    const httpStatus = result.errCode === 0 ? 200 : 500;
    return res.status(httpStatus).json(result);
  } catch (err) {
    console.error('>>> getListPatientForDoctor error:', err);
    return res.status(500).json({ errCode: -1, message: 'Lỗi server!' });
  }
};
```

### 4.2 sendRemedy — doctorId từ JWT, delete email

```javascript
const sendRemedy = async (req, res) => {
  try {
    const data = {
      ...req.body,
      bookingId: req.params.bookingId,
      doctorId: req.user.id,
    };
    delete data.email;  // Defense-in-depth: xóa email nếu client gửi

    const result = await doctorService.sendRemedy(data);
    const httpStatus = result.errCode === 0 ? 200 : 400;
    return res.status(httpStatus).json(result);
  } catch (err) {
    console.error('>>> sendRemedy error:', err);
    return res.status(500).json({ errCode: -1, message: 'Lỗi server!' });
  }
};
```

### 4.3 cancelBooking — bookingId từ URL, doctorId từ JWT

```javascript
const cancelBooking = async (req, res) => {
  try {
    const data = {
      ...req.body,
      bookingId: req.params.bookingId,
      doctorId: req.user.id,
    };
    const result = await doctorService.cancelBooking(data);
    const statusMap = { 0: 200, 1: 400, 3: 404 };
    const httpStatus = statusMap[result.errCode] || 500;
    return res.status(httpStatus).json(result);
  } catch (err) {
    console.error('>>> cancelBooking error:', err);
    return res.status(500).json({ errCode: -1, message: 'Lỗi server!' });
  }
};
```

---

## 5. Code Service `doctorService.js` — Sequelize Queries

### 5.1 getListPatientForDoctor — Kết bảng (không cần transaction/lock)

```javascript
const getListPatientForDoctor = async (doctorId, date, statusId) => {
  try {
    const whereClause = { doctorId, date };

    if (statusId && statusId !== 'ALL') {
      whereClause.statusId = statusId;
    } else if (!statusId) {
      whereClause.statusId = 'S2';
    }

    const patients = await db.Booking.findAll({
      where: whereClause,
      include: [
        {
          model: db.User,
          as: 'patientData',
          attributes: ['email', 'firstName', 'lastName', 'address', 'gender', 'phoneNumber'],
          include: [
            { model: db.Allcode, as: 'genderData', attributes: ['valueVi', 'valueEn'] },
          ],
        },
        { model: db.Allcode, as: 'timeTypeBooking', attributes: ['valueVi', 'valueEn'] },
      ],
      raw: false,
      nest: true,
    });

    return { errCode: 0, data: patients };
  } catch (err) {
    console.error('>>> getListPatientForDoctor error:', err);
    return { errCode: -1, message: 'Lỗi server!' };
  }
};
```

---

### 5.2 ⭐ [v3.0] sendRemedy — Transaction + `lock: t.LOCK.UPDATE`

```javascript
// ===== ⭐ [v3.0] sendRemedy — TRANSACTION + PESSIMISTIC LOCK =====
//
// v2.0 → v3.0 THAY ĐỔI:
//   Thêm `lock: t.LOCK.UPDATE` vào findOne
//   → Khóa dòng booking ở cấp database (SELECT ... FOR UPDATE)
//   → Ngăn chặn 2 request đồng thời cùng gửi remedy cho 1 booking
//
// KỊCH BẢN NGĂN CHẶN:
//   Bác sĩ mở 2 tab → nhấn "Gửi KQ" ở cả 2 tab đồng thời
//   → Tab 1 khóa dòng + update S2→S3 + gửi email
//   → Tab 2 bị block, khi được mở khóa thì statusId đã = S3 → findOne trả NULL
//   → Trả errCode: 3 cho tab 2 → chỉ gửi email 1 LẦN DUY NHẤT

const sendRemedy = async (data) => {
  const t = await db.sequelize.transaction();

  try {
    // ===== 1. VALIDATE INPUT =====
    if (!data.bookingId || !data.doctorId || !data.imageBase64) {
      await t.rollback();
      return { errCode: 1, message: 'Thiếu tham số bắt buộc!' };
    }

    // ===== 2. VALIDATE BASE64 IMAGE =====
    const imageValidation = validateBase64Image(data.imageBase64);
    if (!imageValidation.isValid) {
      await t.rollback();
      return { errCode: 4, message: imageValidation.error };
    }

    // ===== 3. ⭐ [v3.0] FIND BOOKING VỚI PESSIMISTIC LOCK =====
    //
    // lock: t.LOCK.UPDATE
    //   → Sequelize sinh ra: SELECT ... FROM Bookings WHERE ... FOR UPDATE
    //   → Database KHÓA dòng này cho transaction hiện tại
    //   → Các transaction khác phải ĐỢI cho đến khi t.commit() hoặc t.rollback()
    //   → NGĂN CHẶN double-read → double-update

    const booking = await db.Booking.findOne({
      where: {
        id: data.bookingId,          // Exact match
        doctorId: data.doctorId,     // IDOR prevention
        statusId: 'S2',             // State Machine gate
      },
      include: [
        {
          model: db.User,
          as: 'patientData',
          attributes: ['email', 'firstName', 'lastName'],
        },
      ],
      raw: false,
      nest: true,
      transaction: t,
      lock: t.LOCK.UPDATE,           // ✅ [v3.0] PESSIMISTIC LOCK
    });

    if (!booking) {
      await t.rollback();
      return { errCode: 3, message: 'Không tìm thấy lịch hẹn hoặc bạn không có quyền thao tác!' };
    }

    // ===== 4. LẤY EMAIL TỪ DATABASE =====
    const patientEmail = booking.patientData?.email;
    if (!patientEmail) {
      await t.rollback();
      return { errCode: 5, message: 'Không tìm thấy email bệnh nhân trong hệ thống!' };
    }

    // ===== 5. UPDATE STATUS S2 → S3 =====
    booking.statusId = 'S3';
    await booking.save({ transaction: t });

    // ===== 6. COMMIT =====
    await t.commit();
    // → 🔓 Dòng booking được MỞ KHÓA tại đây
    // → Transaction khác (nếu đang chờ) sẽ tiếp tục
    // → Nhưng findOne sẽ trả NULL vì statusId đã = S3, không match S2

    // ===== 7. GỬI EMAIL SAU COMMIT =====
    await emailService.sendEmailRemedy({
      email: patientEmail,
      imageBase64: data.imageBase64,
      doctorName: data.doctorName || 'Bác sĩ',
      language: data.language || 'vi',
    });

    return { errCode: 0, message: 'Gửi kết quả khám thành công!' };
  } catch (err) {
    await t.rollback();
    console.error('>>> sendRemedy error:', err);
    return { errCode: -1, message: 'Lỗi server!' };
  }
};
```

---

### 5.3 ⭐ [v3.0] cancelBooking — Transaction + `lock: t.LOCK.UPDATE`

```javascript
// ===== ⭐ [v3.0] cancelBooking — TRANSACTION + PESSIMISTIC LOCK =====
//
// KỊCH BẢN NGĂN CHẶN (Double-Cancel):
//   Request 1: cancelBooking(id=42) → khóa dòng → S2→S4 → decrement → commit
//   Request 2: cancelBooking(id=42) → findOne bị block → sau commit → NULL (S4≠S2)
//   → Schedule.currentNumber chỉ giảm 1 LẦN → DATA INTEGRITY ĐẢM BẢO

const cancelBooking = async (data) => {
  const t = await db.sequelize.transaction();

  try {
    if (!data.bookingId || !data.doctorId) {
      await t.rollback();
      return { errCode: 1, message: 'Thiếu tham số bookingId hoặc doctorId!' };
    }

    // ===== ⭐ [v3.0] FIND + LOCK DÒNG =====
    const booking = await db.Booking.findOne({
      where: {
        id: data.bookingId,          // Exact match
        doctorId: data.doctorId,     // IDOR prevention
        statusId: 'S2',             // State Machine gate
      },
      raw: false,
      transaction: t,
      lock: t.LOCK.UPDATE,           // ✅ [v3.0] PESSIMISTIC LOCK
    });

    if (!booking) {
      await t.rollback();
      return { errCode: 3, message: 'Không tìm thấy lịch hẹn hoặc bạn không có quyền hủy!' };
    }

    // ===== THAO TÁC 1: S2 → S4 =====
    booking.statusId = 'S4';
    await booking.save({ transaction: t });

    // ===== THAO TÁC 2: GIẢM currentNumber =====
    await db.Schedule.decrement('currentNumber', {
      by: 1,
      where: {
        doctorId: booking.doctorId,
        date: booking.date,
        timeType: booking.timeType,
      },
      transaction: t,
    });

    // ===== COMMIT — Cả 2 thành công → mở khóa =====
    await t.commit();

    return { errCode: 0, message: 'Hủy lịch hẹn thành công!' };
  } catch (err) {
    await t.rollback();
    console.error('>>> cancelBooking error:', err);
    return { errCode: -1, message: 'Lỗi server!' };
  }
};
```

---

## 6. Giải thích kỹ thuật `lock: t.LOCK.UPDATE`

### 6.1 SQL được Sequelize sinh ra

```sql
-- Không có lock (v2.0):
SELECT * FROM `Bookings`
WHERE `id` = 42 AND `doctorId` = 15 AND `statusId` = 'S2';

-- Có lock (v3.0):
SELECT * FROM `Bookings`
WHERE `id` = 42 AND `doctorId` = 15 AND `statusId` = 'S2'
FOR UPDATE;
-- ^^^^^^^^^^
-- FOR UPDATE = Pessimistic Lock
-- → Dòng id=42 bị KHÓA cho đến khi COMMIT hoặc ROLLBACK
```

### 6.2 Bảng so sánh Pessimistic Lock vs Optimistic Lock

| | Pessimistic Lock (`FOR UPDATE`) | Optimistic Lock (`version` field) |
|---|---|---|
| Cơ chế | Khóa dòng ở cấp DB, transaction khác phải chờ | Kiểm tra version khi save, retry nếu conflict |
| Phù hợp | Write-heavy, concurrent transactions | Read-heavy, ít conflict |
| Ưu điểm | Guarantee không conflict | Không khóa, performance tốt hơn |
| Nhược điểm | Có thể deadlock nếu thiết kế sai | Phải implement retry logic |
| **Dùng cho Phase 8** | ✅ **sendRemedy, cancelBooking** | Không dùng |

### 6.3 Tại sao không sợ Deadlock?

```
Q: Nếu 2 transaction cùng lock dòng khác nhau → deadlock?

A: KHÔNG xảy ra trong Phase 8 vì:
   1. Mỗi transaction chỉ lock ĐÚNG 1 DÒNG (1 booking ID cụ thể)
   2. Không có cross-table lock (Schedule.decrement KHÔNG dùng FOR UPDATE)
   3. Lock được giữ ngắn nhất có thể (chỉ findOne → save → commit)
   4. Deadlock chỉ xảy ra khi: TX1 lock A chờ B, TX2 lock B chờ A
      → Phase 8 không có pattern này
```

---

## 7. Model Associations (Tham khảo)

```javascript
// src/models/index.js

db.Booking.belongsTo(db.User, { foreignKey: 'patientId', as: 'patientData' });
db.Booking.belongsTo(db.User, { foreignKey: 'doctorId', as: 'doctorBookingData' });
db.Booking.belongsTo(db.Allcode, { foreignKey: 'timeType', targetKey: 'keyMap', as: 'timeTypeBooking' });
db.User.belongsTo(db.Allcode, { foreignKey: 'gender', targetKey: 'keyMap', as: 'genderData' });
```

---

## 8. Tóm tắt bảo mật API Doctor Dashboard (v3.0 Final)

| Lớp bảo mật | Chi tiết | HTTP Code |
|-------------|---------|-----------|
| JWT missing | `verifyToken` → 401 | 401 |
| JWT expired | `TokenExpiredError` → 401 | 401 |
| JWT invalid | Token giả → 403 | 403 |
| Not Doctor | `roleId ≠ 'R2'` → 403 | 403 |
| IDOR | `doctorId = req.user.id` | 404 |
| Booking nhầm | `id: data.bookingId` trong WHERE | 404 |
| Email spoofing | `booking.patientData.email` từ DB | N/A |
| Email in body | `delete data.email` | N/A |
| Status sai | `statusId: 'S2'` gate | 404 |
| Image invalid | `validateBase64Image()` | 400 |
| Race condition (Transaction) | `db.sequelize.transaction()` | 500 + rollback |
| **Double-Cancel/Remedy** | **`lock: t.LOCK.UPDATE`** | **404 (NULL after lock release)** |

---

## 9. Bảng tổng hợp Evolution v1.0 → v3.0

| Aspect | v1.0 | v2.0 | v3.0 |
|--------|------|------|------|
| WHERE clause | `{doctorId, patientId, statusId}` | `{id, doctorId, statusId}` | `{id, doctorId, statusId}` |
| Email source | `req.body.email` | `booking.patientData.email` | `booking.patientData.email` |
| Transaction (sendRemedy) | ✅ (DB only) | ✅ (DB only) | ✅ (DB only) |
| Transaction (cancelBooking) | ❌ | ✅ | ✅ |
| **Row-Level Lock** | ❌ | ❌ | ✅ `t.LOCK.UPDATE` |
| Concurrent safety | ❌ Double-write | ❌ Double-write | ✅ Serialized |

---

> **Tiếp theo:** [Phase8_04_EmailService.md](./Phase8_04_EmailService.md) — Template email + xử lý attachment
