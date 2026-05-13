# 📋 TÀI LIỆU KIẾN TRÚC TÍCH HỢP VNPAY — BOOKINGCARE

> **Version:** 20.6 (The Dashboard Integration) | **Ngày:** 25/04/2026
> **Môi trường:** Localhost + Ngrok | **Tổng Guards:** 64
> **Tác giả:** Kỹ sư Trần Đức Hải (MSSV 23520421)

---

## 🛡️ CHANGELOG

### v20.6 — The Dashboard Integration

| #     | Hạng mục                          | Bản vá                                                                                                              |
| ----- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| INT-1 | KPI Dashboard trong ManagePatient | Tích hợp hiển thị KPI Statistics (Tổng ca, Doanh thu, Hôm nay) vào giao diện ManagePatient.jsx — gọi API từ Mục 4.1 |
| INT-2 | fetchDoctorKpi + kpiData state    | Bổ sung hàm `fetchDoctorKpi`, state `kpiData`, helper `formatCurrency` — 3 Card dashboard trên bảng bệnh nhân       |
| INT-3 | Design System #45C3D2             | 3 thẻ KPI dùng tông chủ đạo `#45C3D2` cho border-top + icon, Tailwind chuẩn xác để code-ready                       |

### v20.5 — Source-Aligned

| #     | Hạng mục                      | Bản vá                                                                                                    |
| ----- | ----------------------------- | --------------------------------------------------------------------------------------------------------- |
| DOC-1 | ManagePatient.jsx sai thực tế | Viết lại Section 4.2 khớp source code: DatePicker, status filter, i18n, RemedyModal, 8 cột, axiosInstance |

### v20.4 — The Honest Guard

| #   | Hạng mục            | Bản vá                                                   |
| --- | ------------------- | -------------------------------------------------------- |
| DOC | Guard #48 mô tả sai | Cập nhật: `paymentStatus="paid"` thay `receiptExpiredAt` |

### v20.3 — The Complete Guard

| #     | Hạng mục                                                                                | Bản vá                                                 |
| ----- | --------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| FIX-1 | `getKpiStatistics` thiếu try/catch                                                      | Bọc toàn bộ trong try/catch → 500 (Guard #25)          |
| FIX-2 | `bookingByToken` query `publicReceiptToken` thay vì `paymentToken` → luôn trả errCode 2 | Đổi where sang `paymentToken` + `paymentStatus="paid"` |

### v20.2: bookingByToken try/catch, PaymentBadge define

### v20.1: Computed Property `["24"]`, IPN comment fix, 64 Guards bảng đúng

### v20.0: F1-F6 (createdAt null-check, IPN exception doc, cron comment, 64 guards, amount cleanup)

### v19.1: IPN lock reorder · v19.0: Canh giữa mx-auto, Sidebar Logout, xóa Badge

### v18.0: SQL cron, 100% JSX, Doctor code, batch+lock order · v17.0-v2.0: 64 guards

**Doctrines**: NTP Drift (Relative vs Absolute SQL `NOW()`). Redlock cho Multi-Master. CẤM `Date.now()` cho TTL.

---

# PHẦN 1: KIẾN TRÚC & DATABASE

## 1.1 — Package & .env

BE: `npm install qs moment-timezone axios validator` · FE: không thêm.

> **WORKSPACE AUDIT**: React 18.3, react-router-dom v6, Redux Toolkit + persist (`key:'root'`, `whitelist:['user','app']` → 1 key `persist:root`), Tailwind 3.4. Backend: Express 5.2, Sequelize 6.37, `sync({alter:true})`. Models: user/booking/schedule. Timezone `+07:00` hook.

```env
VNP_TMN_CODE=YOUR_TMN_CODE
VNP_HASH_SECRET=YOUR_HASH_SECRET
VNP_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNP_API_URL=https://sandbox.vnpayment.vn/merchant_webapi/api/transaction
VNP_RETURN_URL=http://localhost:3000/payment-result
VNP_IPN_URL=https://YOUR_NGROK.ngrok-free.app/api/v1/payment/vnpay-ipn
API_CRON_SECRET=your-cron-secret-key-here
RECEIPT_FALLBACK_SECRET=your-64-byte-minimum-secret-for-receipt-fallback
```

## 1.2 — `server.js`

```javascript
app.set("query parser", "simple");
app.set("trust proxy", 1);
app.use((req, res, next) => {
  if (req.originalUrl.length > 2048)
    return res.status(414).json({ RspCode: "99" });
  next();
});
app.use(
  cors({ origin: [process.env.URL_REACT, "https://sandbox.vnpayment.vn"] }),
);
```

`models/index.js`: `pool.acquire = 5000`. `sync({ alter: true })`.

## 1.3 — Booking Model (9 cột mới)

```javascript
paymentToken:         { type: DataTypes.STRING(255), allowNull: true, unique: true },
paymentStatus:        { type: DataTypes.STRING(10),  allowNull: true, defaultValue: 'unpaid' },
bookingPrice:         { type: DataTypes.INTEGER,     allowNull: true, defaultValue: 0 },
vnp_TransactionNo:    { type: DataTypes.STRING(50),  allowNull: true },
vnp_PayDate:          { type: DataTypes.STRING(20),  allowNull: true },
publicReceiptToken:   { type: DataTypes.STRING(100), allowNull: true, unique: true },
receiptExpiredAt:     { type: DataTypes.DATE,        allowNull: true },
reconcileFirstSeenAt: { type: DataTypes.DATE,        allowNull: true },
lastQuerydrCode:      { type: DataTypes.STRING(4),   allowNull: true },
```

| paymentStatus | Badge        | Màu     |
| ------------- | ------------ | ------- |
| `unpaid`      | ⏳ Chờ TT    | amber   |
| `paid`        | ✅ Đã TT     | emerald |
| `failed`      | ❌ Thất bại  | red     |
| `expired`     | 🕐 Hết hạn   | gray    |
| `refunded`    | 🔄 Hoàn tiền | blue    |

---

# PHẦN 2: API & LUỒNG THANH TOÁN

## 2.1 — Helpers

### `generateReceiptToken.js`

```javascript
async function generateReceiptToken(booking, transaction) {
  for (let i = 0; i < 3; i++) {
    try {
      const token = crypto.randomUUID();
      booking.publicReceiptToken = token;
      await booking.save({ transaction });
      return token;
    } catch (err) {
      if (err.name !== "SequelizeUniqueConstraintError") throw err;
      if (i === 2) break;
    }
  }
  let nonce;
  try {
    nonce = crypto.randomBytes(16).toString("hex");
  } catch (e) {
    throw new Error("ENTROPY_FAIL");
  }
  const payload = `${booking.id}:${booking.vnp_TransactionNo}:${Date.now()}:${nonce}`;
  const token = crypto
    .createHmac("sha256", process.env.RECEIPT_FALLBACK_SECRET)
    .update(payload)
    .digest("hex")
    .substring(0, 64);
  booking.publicReceiptToken = token;
  await booking.save({ transaction });
  return token;
}
```

### `idempotencyStore.js`

```javascript
const redis = require("./redisClient");
const idempotencyStore = {
  async setInProgress(key) {
    const result = await redis.set(key, "IN_PROGRESS", "EX", 30, "NX");
    return result === "OK";
  },
  async setDone(key, payload) {
    await redis.set(key, JSON.stringify(payload), "EX", 86400);
  },
  async get(key) {
    const raw = await redis.get(key);
    if (raw === null) return null;
    if (raw === "IN_PROGRESS") return "IN_PROGRESS";
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  },
  async delete(key) {
    try {
      await redis.del(key);
    } catch (e) {
      /* silent */
    }
  },
};
module.exports = idempotencyStore;
```

### `sanitizeLog.js` / `vnpayAllowedKeys.js` / `manualAuthGuard.js` — không đổi từ v17.0.

---

## 2.2 — `create_payment_url`

**Route:** `POST /api/v1/payment/create-payment-url`
**Middleware:** `backpressureGate` → `verifyToken` → `checkPatientRole`

```javascript
async function createPaymentUrl(req, res) {
  const idempotencyKey = req.headers["x-idempotency-key"];

  // ═══ IDEMPOTENCY GATE (Fail-Closed) ═══
  if (idempotencyKey) {
    let existing;
    try {
      existing = await idempotencyStore.get(idempotencyKey);
    } catch (e) {
      res.set("Retry-After", "5");
      return res.status(503).json({ errCode: -4 });
    }
    if (existing === "IN_PROGRESS")
      return res.status(409).json({ errCode: -2, suggestedWaitMs: 3000 });
    if (existing && existing !== "IN_PROGRESS") return res.json(existing);
    try {
      if (!(await idempotencyStore.setInProgress(idempotencyKey)))
        return res.status(409).json({ errCode: -2, suggestedWaitMs: 3000 });
    } catch (e) {
      res.set("Retry-After", "5");
      return res.status(503).json({ errCode: -4 });
    }
  }

  const ac = new AbortController();
  const signal = ac.signal;
  let isResponded = false;
  let timeoutHandle;

  // TCP Bridge: chỉ dọn khi client drop BẤT THƯỜNG
  req.on("close", () => {
    if (!res.writableEnded) {
      ac.abort();
      if (idempotencyKey)
        idempotencyStore.delete(idempotencyKey).catch(() => {});
    }
  });

  try {
    await Promise.race([
      executeCreatePayment(req, res, signal, idempotencyKey),
      new Promise((_, rej) => {
        timeoutHandle = setTimeout(() => {
          ac.abort();
          rej(new Error("TIMEOUT"));
        }, 8000);
      }),
    ]);
  } catch (err) {
    if (err.message === "TIMEOUT" && !isResponded) {
      isResponded = true;
      if (idempotencyKey)
        idempotencyStore.delete(idempotencyKey).catch(() => {});
      res.set("Retry-After", "3");
      return res.status(503).json({ errCode: -3 });
    }
    if (!isResponded) {
      isResponded = true;
      if (idempotencyKey)
        idempotencyStore.delete(idempotencyKey).catch(() => {});
      return res.status(500).json({ errCode: -1 });
    }
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }

  async function executeCreatePayment(req, res, signal, idempotencyKey) {
    let isResume = false,
      paymentTokenToUse = null,
      bookingPriceToUse = null;
    if (signal.aborted) return;
    const t = await db.sequelize.transaction({
      isolationLevel: READ_COMMITTED,
    });
    await db.sequelize.query("SET SESSION innodb_lock_wait_timeout=5", {
      transaction: t,
    });

    try {
      // ⚠️ LOCK ORDER: Schedule TRƯỚC → Booking SAU (Guard #37, #43)
      // Thứ tự này BẮT BUỘC nhất quán trong mọi transaction để ngăn Deadlock

      // A: Lock Schedule TRƯỚC
      if (signal.aborted) {
        await t.rollback();
        return;
      }
      const schedule = await db.Schedule.findOne({
        where: { doctorId, date, timeType },
        lock: t.LOCK.UPDATE,
        transaction: t,
      });
      if (!schedule) {
        await t.rollback();
        return writeResponse({ errCode: 3 });
      }
      if (schedule.currentNumber >= schedule.maxNumber) {
        await t.rollback();
        return writeResponse({ errCode: 4 });
      }

      // B: Booking SAU
      if (signal.aborted) {
        await t.rollback();
        return;
      }
      const existing = await db.Booking.findOne({
        where: {
          patientId: req.user.id,
          doctorId,
          date,
          timeType,
          statusId: { [Op.in]: ["S1", "S2", "S3"] },
        },
        transaction: t,
      });
      if (existing && ["S2", "S3"].includes(existing.statusId)) {
        await t.rollback();
        return writeResponse({ errCode: 2 });
      }
      if (existing?.statusId === "S1" && existing.paymentStatus === "unpaid") {
        const cutoff = await db.sequelize.query(
          `SELECT (createdAt<DATE_SUB(NOW(),INTERVAL 20 MINUTE)) AS isExpired
           FROM Bookings WHERE id=:id`,
          {
            replacements: { id: existing.id },
            type: Sequelize.QueryTypes.SELECT,
            plain: true,
            transaction: t,
          },
        );
        if (!cutoff.isExpired) {
          isResume = true;
          paymentTokenToUse = existing.paymentToken;
          bookingPriceToUse = existing.bookingPrice;
          await t.commit();
        } else {
          existing.statusId = "S4";
          existing.paymentStatus = "expired";
          await existing.save({ transaction: t });
          if (schedule.currentNumber > 0)
            await schedule.decrement("currentNumber", {
              by: 1,
              transaction: t,
            });
        }
      }

      // C: Tạo mới
      if (!isResume) {
        if (signal.aborted) {
          await t.rollback();
          return;
        }
        const nb = await db.Booking.create(
          {
            patientId: req.user.id,
            doctorId,
            date,
            timeType,
            statusId: "S1",
            paymentStatus: "unpaid",
            bookingPrice: price,
            paymentToken: crypto.randomUUID(),
            token: legacyToken,
          },
          { transaction: t },
        );
        await schedule.increment("currentNumber", { by: 1, transaction: t });
        if (signal.aborted) {
          await t.rollback();
          return;
        }
        await t.commit();
        paymentTokenToUse = nb.paymentToken;
        bookingPriceToUse = nb.bookingPrice;
      }

      // STEP_URL
      if (signal.aborted) return;
      const ipAddr =
        req.headers["x-forwarded-for"]?.split(",")[0] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.ip;
      const vnpUrl = buildVnpayUrl(
        paymentTokenToUse,
        bookingPriceToUse,
        ipAddr,
      );
      const payload = { errCode: 0, paymentUrl: vnpUrl, isResume };

      if (idempotencyKey) {
        try {
          await idempotencyStore.setDone(idempotencyKey, payload);
        } catch (e) {
          idempotencyStore.delete(idempotencyKey).catch(() => {});
        }
      }
      writeResponse(payload);
    } catch (err) {
      if (t && !t.finished) await t.rollback();
      if (idempotencyKey)
        idempotencyStore.delete(idempotencyKey).catch(() => {});
      writeResponse({ errCode: -1 }, 500);
    }
    function writeResponse(body, status = 200) {
      if (isResponded) return;
      isResponded = true;
      res.status(status).json(body);
    }
  }
}
```

### `buildVnpayUrl`

```javascript
function buildVnpayUrl(paymentToken, amount, ipAddr) {
  const cleanOrderInfo = `Thanh toan don hang ${paymentToken}`.replace(
    /[^a-zA-Z0-9 ]/g,
    "",
  );
  const params = {
    vnp_Version: "2.1.0",
    vnp_Command: "pay",
    vnp_TmnCode: VNP_TMN_CODE,
    vnp_Amount: amount * 100,
    vnp_CurrCode: "VND",
    vnp_TxnRef: paymentToken,
    vnp_OrderInfo: cleanOrderInfo,
    vnp_Locale: "vn",
    vnp_ReturnUrl: VNP_RETURN_URL,
    vnp_IpAddr: ipAddr,
    vnp_CreateDate: moment().tz("Asia/Ho_Chi_Minh").format("YYYYMMDDHHmmss"),
  };
  const sorted = {};
  Object.keys(params)
    .sort()
    .forEach((k) => (sorted[k] = params[k]));
  const signData = qs.stringify(sorted, { encode: false });
  const hash = crypto
    .createHmac("sha512", VNP_HASH_SECRET)
    .update(Buffer.from(signData, "utf-8"))
    .digest("hex");
  const urlQuery = qs.stringify(sorted, { encode: true });
  return `${VNP_URL}?${urlQuery}&vnp_SecureHashType=SHA512&vnp_SecureHash=${hash}`;
}
```

### PAY3: `paymentId === 'PAY3'` → `errCode: 6`.

---

## 2.3 — `vnpay_ipn`

```javascript
async function vnpayIpn(req, res) {
  try {
    const vnp_Params = Object.assign(Object.create(null), req.query);
    if (Object.keys(vnp_Params).length === 0)
      return res.status(200).json({ RspCode: "97" });
    for (const key of Object.keys(vnp_Params))
      if (!VNPAY_ALLOWED_KEYS.includes(key))
        return res.status(200).json({ RspCode: "97" });
    if (
      typeof vnp_Params["vnp_SecureHashType"] !== "string" ||
      vnp_Params["vnp_SecureHashType"] !== "SHA512"
    )
      return res.status(200).json({ RspCode: "97" });
    const receivedHash = vnp_Params["vnp_SecureHash"];
    if (
      typeof receivedHash !== "string" ||
      !/^[a-f0-9]{128}$/i.test(receivedHash)
    )
      return res.status(200).json({ RspCode: "97" });

    const params = Object.assign(Object.create(null), vnp_Params);
    delete params["vnp_SecureHash"];
    delete params["vnp_SecureHashType"];
    const sorted = Object.create(null);
    Object.keys(params)
      .sort()
      .forEach((k) => (sorted[k] = params[k]));
    const signData = qs.stringify(sorted, { encode: false });
    const expected = crypto
      .createHmac("sha512", VNP_HASH_SECRET)
      .update(Buffer.from(signData, "utf-8"))
      .digest("hex");
    if (
      !crypto.timingSafeEqual(
        Buffer.from(receivedHash, "utf-8"),
        Buffer.from(expected, "utf-8"),
      )
    )
      return res.status(200).json({ RspCode: "97" });

    const vnpAmount = parseInt(vnp_Params["vnp_Amount"], 10);
    if (!Number.isSafeInteger(vnpAmount))
      return res.status(200).json({ RspCode: "04" });
    const vnpTransNo = vnp_Params["vnp_TransactionNo"];
    if (typeof vnpTransNo !== "string" || !vnpTransNo.trim())
      return res.status(200).json({ RspCode: "97" });

    // ⚠️ [v20.1 FIX-2] IPN lock bắt đầu từ Booking (xem exception tại else branch bên dưới)
    const t = await db.sequelize.transaction();
    try {
      const booking = await db.Booking.findOne({
        where: { paymentToken: vnp_Params["vnp_TxnRef"] },
        lock: t.LOCK.UPDATE,
        transaction: t,
        include: [
          { model: db.User, as: "doctorBookingData" },
          { model: db.User, as: "patientData" },
          { model: db.Allcode, as: "timeTypeBooking" },
        ],
      });
      if (!booking) {
        await t.rollback();
        return res.status(200).json({ RspCode: "01" });
      }
      if (
        ["paid", "failed", "expired", "refunded"].includes(
          booking.paymentStatus,
        )
      ) {
        await t.rollback();
        return res.status(200).json({ RspCode: "02" });
      }
      if (
        !Number.isSafeInteger(booking.bookingPrice * 100) ||
        vnpAmount !== booking.bookingPrice * 100
      ) {
        await t.rollback();
        return res.status(200).json({ RspCode: "04" });
      }

      if (vnp_Params["vnp_ResponseCode"] === "00") {
        booking.statusId = "S2";
        booking.paymentStatus = "paid";
        booking.vnp_TransactionNo = vnpTransNo;
        booking.vnp_PayDate = vnp_Params["vnp_PayDate"];
        booking.receiptExpiredAt = db.sequelize.literal(
          "DATE_ADD(NOW(),INTERVAL 24 HOUR)",
        );
        booking.reconcileFirstSeenAt = null;
        booking.lastQuerydrCode = "00";
        await generateReceiptToken(booking, t); // save bên trong
        await t.commit();
        res.status(200).json({ RspCode: "00", Message: "Confirm Success" });
        sendBookingEmail(booking).catch((e) =>
          console.error("[EMAIL]", sanitizeLog(e, null)),
        );
      } else {
        // ✅ [v20.0 F3] LOCK ORDER EXCEPTION (IPN only):
        // IPN buộc phải lock Booking trước để lấy doctorId/date/timeType.
        // Thứ tự: Booking → Schedule (ngược với create_payment_url).
        // Deadlock risk được kiểm soát bởi Guard #38 (retry × 3, errno 1213/1205).
        // KHÔNG thay đổi thứ tự này — đây là ràng buộc phụ thuộc dữ liệu.
        booking.statusId = "S4";
        booking.paymentStatus = "failed";
        await booking.save({ transaction: t });
        const schedule = await db.Schedule.findOne({
          where: {
            doctorId: booking.doctorId,
            date: booking.date,
            timeType: booking.timeType,
          },
          lock: t.LOCK.UPDATE,
          transaction: t,
        });
        if (schedule?.currentNumber > 0)
          await schedule.decrement("currentNumber", { by: 1, transaction: t });
        await t.commit();
        res.status(200).json({ RspCode: "00", Message: "Confirm Success" });
      }
    } catch (err) {
      if (t && !t.finished) await t.rollback();
      res.status(200).json({ RspCode: "99" });
    }
  } catch (g) {
    res.status(200).json({ RspCode: "99" });
  }
}
```

---

## 2.4 — `vnpay_querydr` (T1: String keys)

```javascript
async function vnpayQuerydr(booking) {
  const params = {
    vnp_RequestId: crypto.randomUUID(),
    vnp_Version: "2.1.0",
    vnp_Command: "querydr",
    vnp_TmnCode: VNP_TMN_CODE,
    vnp_TxnRef: booking.paymentToken,
    vnp_OrderInfo: `Truy van don hang ${booking.paymentToken}`.replace(
      /[^a-zA-Z0-9 ]/g,
      "",
    ),
    // ✅ [v20.0 F2] Null-check createdAt trước moment()
    vnp_TransactionDate: booking.createdAt
      ? moment(booking.createdAt)
          .tz("Asia/Ho_Chi_Minh")
          .format("YYYYMMDDHHmmss")
      : "",
    vnp_CreateDate: moment().tz("Asia/Ho_Chi_Minh").format("YYYYMMDDHHmmss"),
    vnp_IpAddr: "127.0.0.1",
  };
  const sorted = {};
  Object.keys(params)
    .sort()
    .forEach((k) => (sorted[k] = params[k]));
  params.vnp_SecureHash = crypto
    .createHmac("sha512", VNP_HASH_SECRET)
    .update(Buffer.from(qs.stringify(sorted, { encode: false }), "utf-8"))
    .digest("hex");

  const resp = await axios.post(VNP_API_URL, params, { timeout: 10000 });
  const code = resp.data?.vnp_TransactionStatus;

  // ✅ [v20.1 FIX-1] Computed Property Name — ép string key, chống auto-format
  const WHITELIST = { "00": "paid", ["24"]: "cancelled", "02": "pending" };
  return WHITELIST[code]
    ? { status: WHITELIST[code], rawCode: code, data: resp.data }
    : { status: "transient", rawCode: code, data: resp.data };
}
```

---

## 2.5 — `cleanup-s1` (T2: SQL fix, T5: Batch + No double save)

```javascript
async function cleanupS1(req, res) {
  if (req.headers["x-cron-secret"] !== process.env.API_CRON_SECRET)
    return res.status(403).json({ errCode: -1 });

  let lockAcquired = false;
  try {
    const lockResult = await db.sequelize.query(
      "SELECT GET_LOCK('cron_cleanup_s1', 30) AS acquired",
      {
        type: Sequelize.QueryTypes.SELECT,
        plain: true,
        options: { type: "write" },
      },
    );
    lockAcquired = lockResult.acquired === 1;
    if (!lockAcquired) return res.json({ skipped: true });

    // ⚡ [v18.0 T2] SQL thực tế trong WHERE
    const staleBookings = await db.Booking.findAll({
      where: {
        statusId: "S1",
        paymentStatus: "unpaid",
        createdAt: {
          [Op.lt]: db.sequelize.literal("DATE_SUB(NOW(), INTERVAL 20 MINUTE)"),
        },
      },
    });

    let processed = 0,
      zombies = 0;

    // ⚡ [v18.0 T5] BATCH PROCESSING — CONCURRENCY=5
    const chunks = [];
    for (let i = 0; i < staleBookings.length; i += 5)
      chunks.push(staleBookings.slice(i, i + 5));

    for (const batch of chunks) {
      await Promise.all(
        batch.map(async (booking) => {
          let retries = 0;
          while (retries < 3) {
            const t = await db.sequelize.transaction();
            try {
              // Strike 1: Đánh dấu lần đầu
              if (!booking.reconcileFirstSeenAt) {
                booking.reconcileFirstSeenAt = db.sequelize.literal("NOW()");
                await booking.save({ transaction: t });
                await t.commit();
                break;
              }
              // Check matured (>10min)
              const m = await db.sequelize.query(
                `SELECT (reconcileFirstSeenAt < DATE_SUB(NOW(), INTERVAL 10 MINUTE)) AS ok
               FROM Bookings WHERE id=:id`,
                {
                  replacements: { id: booking.id },
                  type: Sequelize.QueryTypes.SELECT,
                  plain: true,
                  transaction: t,
                },
              );
              if (!m.ok) {
                await t.rollback();
                break;
              }

              // Strike 2: QueryDR cuối cùng
              const qdr = await vnpayQuerydr(booking);
              booking.lastQuerydrCode = qdr.rawCode;

              if (qdr.status === "paid") {
                booking.statusId = "S2";
                booking.paymentStatus = "paid";
                booking.receiptExpiredAt = db.sequelize.literal(
                  "DATE_ADD(NOW(), INTERVAL 24 HOUR)",
                );
                booking.reconcileFirstSeenAt = null;
                // ⚡ [v18.0 T5] generateReceiptToken GỌI save() bên trong
                // → KHÔNG cần booking.save() thêm lần nữa
                await generateReceiptToken(booking, t);
              } else {
                booking.statusId = "S4";
                booking.paymentStatus = "expired";
                booking.reconcileFirstSeenAt = null;
                await booking.save({ transaction: t });
                // ✅ [v20.0 F4] LOCK ORDER (cron): Booking.save() trước → Schedule lock sau.
                // Tương tự IPN exception: phụ thuộc dữ liệu, bảo vệ bởi Guard #38.
                const sch = await db.Schedule.findOne({
                  where: {
                    doctorId: booking.doctorId,
                    date: booking.date,
                    timeType: booking.timeType,
                  },
                  lock: t.LOCK.UPDATE,
                  transaction: t,
                });
                if (sch?.currentNumber > 0)
                  await sch.decrement("currentNumber", {
                    by: 1,
                    transaction: t,
                  });
              }

              // Zombie check (>24h)
              const z = await db.sequelize.query(
                `SELECT (createdAt<DATE_SUB(NOW(),INTERVAL 24 HOUR)) AS isZ FROM Bookings WHERE id=:id`,
                {
                  replacements: { id: booking.id },
                  type: Sequelize.QueryTypes.SELECT,
                  plain: true,
                  transaction: t,
                },
              );
              if (z.isZ) zombies++;

              await t.commit();
              processed++;
              break;
            } catch (err) {
              if (t && !t.finished) await t.rollback();
              if ([1213, 1205].includes(err.parent?.errno) && retries < 2) {
                retries++;
                continue;
              }
              console.error("[CRON_ERR]", sanitizeLog(err, null));
              break;
            }
          }
        }),
      );
    }
    res.json({ skipped: false, processed, zombies });
  } finally {
    if (lockAcquired)
      await db.sequelize
        .query("SELECT RELEASE_LOCK('cron_cleanup_s1')")
        .catch(() => {});
  }
}
```

> **Test Local**: Postman → `POST localhost:8080/api/v1/cron/cleanup-s1` → Header `x-cron-secret`.

---

## 2.6 — `booking-by-token`

```javascript
async function bookingByToken(req, res) {
  const token = req.query.token;
  if (!token || typeof token !== "string" || !token.trim())
    return res.status(400).json({ errCode: 1 });

  try {
    // ✅ [v20.2 FIX-A] Guard #25 — mọi catch BẮT BUỘC return response
    // ✅ [v20.3 FIX-2] Query theo paymentToken (= vnp_TxnRef từ return URL).
    // publicReceiptToken là internal token — frontend không bao giờ có.
    // Guard thay thế: paymentStatus = "paid" chặn truy cập booking chưa TT.
    const booking = await db.Booking.findOne({
      where: {
        paymentToken: token,
        paymentStatus: "paid",
      },
      include: [
        {
          model: db.User,
          as: "doctorBookingData",
          attributes: ["firstName", "lastName"],
        },
        {
          model: db.User,
          as: "patientData",
          attributes: ["firstName", "lastName"],
        },
        { model: db.Allcode, as: "timeTypeBooking", attributes: ["valueVi"] },
      ],
    });
    if (!booking) return res.status(404).json({ errCode: 2 });

    const safeName = String(
      (booking.patientData?.lastName || "") +
        " " +
        (booking.patientData?.firstName || ""),
    ).trim();
    const rawDoc = String(
      (booking.doctorBookingData?.lastName || "") +
        " " +
        (booking.doctorBookingData?.firstName || ""),
    ).trim();

    res.json({
      errCode: 0,
      data: {
        patientNameMasked: maskName(validator.escape(String(safeName || ""))),
        doctorName: validator.escape(String(rawDoc || "")),
        date: booking.date,
        timeType: booking.timeTypeBooking?.valueVi || "",
        paymentStatus: booking.paymentStatus,
        bookingPrice: booking.bookingPrice,
        vnp_TransactionNo: booking.vnp_TransactionNo,
        vnp_PayDate: booking.vnp_PayDate,
      },
    });
  } catch (err) {
    return res.status(500).json({ errCode: -1 });
  }
}
function maskName(n) {
  if (!n || n.length < 2) return "***";
  const p = n.split(" ").filter(Boolean);
  return p.length <= 1
    ? p[0][0] + "***"
    : p[0] +
        " " +
        p
          .slice(1)
          .map((x) => x[0] + "***")
          .join(" ");
}
```

---

# PHẦN 3: FRONTEND

## 3.1 — `paymentService.js`

```javascript
const MAX_RETRY = 5,
  MAX_DELAY_MS = 15000;
export async function callWithRetry(fn, { onRetry, signal } = {}, attempt = 0) {
  try {
    return await fn(signal);
  } catch (err) {
    if (signal?.aborted) throw err;
    if (err.response?.status === 503 && attempt < MAX_RETRY) {
      const hint = parseInt(err.response.headers["retry-after"], 10) || 2;
      const expDelay = Math.min(
        hint * 1000 * Math.pow(2, attempt),
        MAX_DELAY_MS,
      );
      const finalDelay = Math.random() * expDelay;
      if (onRetry) onRetry(attempt + 1, Math.round(finalDelay));
      await new Promise((r) => setTimeout(r, finalDelay));
      return callWithRetry(fn, { onRetry, signal }, attempt + 1);
    }
    if (err.response?.status === 409 && attempt < MAX_RETRY) {
      const w = Math.min(
        err.response.data?.suggestedWaitMs || 3000,
        MAX_DELAY_MS,
      );
      if (onRetry) onRetry(attempt + 1, w);
      await new Promise((r) => setTimeout(r, w));
      return callWithRetry(fn, { onRetry, signal }, attempt + 1);
    }
    throw err;
  }
}
```

## 3.2 — `BookingModal.jsx`

```jsx
function BookingModal({ doctorId, date, timeType, price }) {
  const [uiState, setUiState] = useState("idle");
  const [retryInfo, setRetryInfo] = useState(null);
  const abortRef = useRef(new AbortController());
  const handleSubmit = async () => {
    if (["loading", "retrying"].includes(uiState)) return;
    setUiState("loading");
    const idempotencyKey = uuidv4();
    try {
      const result = await callWithRetry(
        (signal) =>
          createPaymentUrl(
            { doctorId, date, timeType, price },
            token,
            idempotencyKey,
            signal,
          ),
        {
          onRetry: (a, d) => {
            setUiState("retrying");
            setRetryInfo({ attempt: a, delay: d, maxRetry: 5 });
          },
          signal: abortRef.current.signal,
        },
      );
      if (result.isResume) toast.info("Tiếp tục giao dịch trước đó...");
      window.location.href = result.paymentUrl;
    } catch (err) {
      setUiState(abortRef.current.signal.aborted ? "cancelled" : "failed");
      if (!abortRef.current.signal.aborted)
        toast.error("Không thể tạo giao dịch");
      setRetryInfo(null);
    }
  };
  const handleCancel = () => {
    abortRef.current.abort();
    abortRef.current = new AbortController();
    setUiState("cancelled");
    setRetryInfo(null);
  };
  return (
    <div>
      {uiState === "retrying" && retryInfo && (
        <div className="retry-overlay">
          <p>
            Đang thử lại giao dịch... (Lần {retryInfo.attempt}/
            {retryInfo.maxRetry})
          </p>
          <button onClick={handleCancel}>Hủy bỏ</button>
        </div>
      )}
      <button
        onClick={handleSubmit}
        disabled={["loading", "retrying"].includes(uiState)}
      >
        {uiState === "loading" ? "Đang xử lý..." : "Thanh toán VNPay"}
      </button>
    </div>
  );
}
```

## [v18.0 T3] 3.3 — `PaymentResult.jsx` (100% JSX)

```jsx
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";

// ✅ [v20.2 FIX-B] Define PaymentBadge tại chỗ để PaymentResult.jsx tự chứa
function PaymentBadge({ status }) {
  const config = {
    paid: { label: "✅ Đã TT", cls: "tw-bg-emerald-100 tw-text-emerald-800" },
    unpaid: { label: "⏳ Chờ TT", cls: "tw-bg-amber-100 tw-text-amber-800" },
    failed: { label: "❌ Thất bại", cls: "tw-bg-red-100 tw-text-red-800" },
    expired: { label: "🕐 Hết hạn", cls: "tw-bg-gray-100 tw-text-gray-800" },
    refunded: { label: "🔄 Hoàn tiền", cls: "tw-bg-blue-100 tw-text-blue-800" },
  };
  const c = config[status] || config.unpaid;
  return (
    <span
      className={`tw-px-2 tw-py-1 tw-rounded tw-text-xs tw-font-medium ${c.cls}`}
    >
      {c.label}
    </span>
  );
}

let GLOBAL_SNAPSHOT = null;

function PaymentResult() {
  const [searchParams] = useSearchParams();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    async function process() {
      // Bước 1: Đọc URL hoặc fallback
      // ✅ [v20.0 F6] Xóa biến amount — không dùng
      const txnRef = searchParams.get("vnp_TxnRef");
      const respCode = searchParams.get("vnp_ResponseCode");

      if (txnRef && respCode) {
        // ✅ [v20.0 F6] Xóa amount thừa — dữ liệu lấy từ API booking-by-token
        GLOBAL_SNAPSHOT = { txnRef, respCode, snapshotKey: txnRef };
        sessionStorage.setItem(
          "paymentSnapshot",
          JSON.stringify(GLOBAL_SNAPSHOT),
        );
      } else if (!GLOBAL_SNAPSHOT) {
        const stored = sessionStorage.getItem("paymentSnapshot");
        if (stored) GLOBAL_SNAPSHOT = JSON.parse(stored);
      }

      if (!GLOBAL_SNAPSHOT) {
        if (!isCancelled) {
          setResult({ error: "Không có dữ liệu" });
          setLoading(false);
        }
        return;
      }

      // Bước 2: Cross-validate snapshotKey
      const currentRef =
        searchParams.get("vnp_TxnRef") || GLOBAL_SNAPSHOT.txnRef;
      if (GLOBAL_SNAPSHOT.snapshotKey !== currentRef) {
        GLOBAL_SNAPSHOT = null;
        sessionStorage.removeItem("paymentSnapshot");
        if (!isCancelled) {
          setResult({ error: "Dữ liệu không khớp" });
          setLoading(false);
        }
        return;
      }

      // Bước 3: Gọi API (x-mute-toast)
      try {
        const resp = await axios.get(
          `${process.env.REACT_APP_BACKEND_URL}/api/v1/payment/booking-by-token?token=${GLOBAL_SNAPSHOT.txnRef}`,
          { headers: { "x-mute-toast": "true" } },
        );
        if (!isCancelled) setResult(resp.data);
      } catch (err) {
        if (!isCancelled) setResult({ error: "Lỗi kết nối server" });
      }

      // Bước 4: Clean URL
      window.history.replaceState({}, "", "/payment-result");

      // Bước 5: Xóa sessionStorage sau set state
      sessionStorage.removeItem("paymentSnapshot");
      if (!isCancelled) setLoading(false);
    }

    process();
    return () => {
      isCancelled = true;
    };
  }, []);

  if (loading)
    return <div className="tw-text-center tw-py-20">Đang xử lý kết quả...</div>;
  if (result?.error)
    return <div className="tw-text-center tw-text-red-500">{result.error}</div>;

  // CẤM dangerouslySetInnerHTML. TEXT thuần.
  const data = result?.data || {};
  return (
    <div className="tw-max-w-lg tw-mx-auto tw-p-6 tw-bg-white tw-rounded tw-shadow">
      <h2 className="tw-text-xl tw-font-bold tw-mb-4">Kết quả thanh toán</h2>
      <p>Bệnh nhân: {data.patientNameMasked}</p>
      <p>Bác sĩ: {data.doctorName}</p>
      <p>Ngày khám: {data.date}</p>
      <p>Giờ khám: {data.timeType}</p>
      <p>Số tiền: {data.bookingPrice?.toLocaleString()} VNĐ</p>
      <p>Mã GD: {data.vnp_TransactionNo}</p>
      <PaymentBadge status={data.paymentStatus} />
    </div>
  );
}
```

## 3.4 — Logout

```javascript
const handleLogout = async () => {
  dispatch(processLogout()); // Reset userSlice → initialState
  await persistor.flush(); // Ghi vào persist:root (app/language giữ nguyên)
  navigate("/login");
  // CẤM persistor.purge() — CẤM localStorage.removeItem('persist:user')
};
```

## 3.5 — `PatientProfile.jsx` + `PatientProfile.scss` (Thông tin + Đổi mật khẩu)

> **[v19.0 U1] Canh giữa**: File thực tế `PatientProfile.scss` có `.patient-profile { max-width: 800px }` nhưng **thiếu** `margin: 0 auto`. Bản vá: thêm `margin: 0 auto` để nội dung canh giữa `patient-body`.

```scss
// PatientProfile.scss — V19.0 Fix
.patient-profile {
  max-width: 800px;
  margin: 0 auto; // ⚡ [v19.0 U1] Canh giữa nội dung
}
```

File `PatientProfile.jsx` thực tế đã có sẵn đầy đủ 2 khối UI: **Thông tin cá nhân** (avatar + form 6 fields + nút "Lưu thay đổi") và **Đổi mật khẩu** (3 inputs + nút cam). Cấu trúc JSX (trích từ code thực tế):

```jsx
// PatientProfile.jsx — Đã có trong project, lược trích logic chính
import { processLogout, updateUserInfo } from "../../redux/slices/userSlice";
import {
  getPatientProfile,
  editPatientProfile,
  changePassword,
} from "../../services/patientService";

const PatientProfile = () => {
  // State: profile (6 fields), previewAvatar, pwdForm (3 fields)
  // Hooks: useDispatch, useNavigate, useIntl, useRef (fileInput)
  // useEffect: fetchAllcodeByType(GENDER) + loadProfile()

  // ═══ KHỐI 1: Thông tin cá nhân ═══
  // - Avatar: input[file] → FileReader → Base64 → GUARD 5MB
  // - Form: lastName, firstName, email (disabled), phone, address, gender (select)
  // - handleSaveProfile: editPatientProfile() → dispatch(updateUserInfo) đồng bộ Header

  // ═══ KHỐI 2: Đổi mật khẩu ═══
  // - Validate: required + minLength(6) + confirm match
  // - API: changePassword({ oldPassword, newPassword })
  // - Thành công → setTimeout 1.5s → processLogout() + navigate('/login')
  //   (vì backend revoke tokenVersion cũ → session hiện tại invalid)

  return (
    <div className="patient-profile tw-space-y-6">
      {/* KHỐI 1: Card trắng, shadow, avatar + form 2 cột */}
      <div className="tw-bg-white tw-rounded-card tw-shadow-card tw-p-6">
        <h2>⚡ Thông tin cá nhân</h2>
        {/* Avatar circle 112px + nút "Đổi ảnh đại diện" */}
        {/* Grid 2 cột: Họ/Tên, Email(disabled)/SĐT, Địa chỉ/Giới tính */}
        <button className="tw-bg-primary">💾 Lưu thay đổi</button>
      </div>

      {/* KHỐI 2: Card trắng, shadow */}
      <div className="tw-bg-white tw-rounded-card tw-shadow-card tw-p-6">
        <h2>🔑 Đổi mật khẩu</h2>
        <form onSubmit={handleChangePassword}>
          {/* Input: Mật khẩu hiện tại (full width) */}
          {/* Grid 2 cột: Mật khẩu mới / Xác nhận */}
          <button
            className="tw-bg-amber-500"
            type="submit"
            disabled={isChangingPwd}
          >
            🔒 Đổi mật khẩu
          </button>
        </form>
      </div>
    </div>
  );
};

// HOC Guard Role R3
export default withAuth(PatientProfile, ["R3"]);
```

> **Ghi chú triển khai**: Khi code, class `.patient-profile` đã có `max-width: 800px` kết hợp với `margin: 0 auto` mới thêm → nội dung cả 2 khối sẽ canh giữa trong `patient-body`.

## [v19.0 U2+U3] 3.7 — `PatientLayout.jsx` (Sidebar + Header)

> **File thực tế**: `src/containers/PatientPortal/PatientLayout.jsx` (78 dòng)
>
> **2 thay đổi bắt buộc**:
>
> 1. **Sidebar footer**: Đổi `<Link to="/">` (Trang chủ) → `<button onClick={handleLogout}>` (Đăng xuất)
> 2. **Header**: Xóa hoàn toàn `<span className="patient-badge">` (👤 Cổng bệnh nhân)

```jsx
// PatientLayout.jsx — V19.0 (chỉ hiển thị thay đổi)
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { processLogout } from "../../redux/slices/userSlice";
import { persistor } from "../../redux/store";

const PatientLayout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // ⚡ [v19.0 U2] Hàm logout thay thế Link "Trang chủ"
  const handleLogout = async () => {
    dispatch(processLogout());
    await persistor.flush();
    navigate("/login");
  };

  return (
    <div className="patient-layout">
      <aside className="patient-sidebar">
        {/* Logo: BookingCare */}
        <nav className="sidebar-nav">
          <NavLink to="/patient/profile">Thông tin cá nhân</NavLink>
          <NavLink to="/patient/history">Lịch sử khám</NavLink>
        </nav>

        {/* ⚡ [v19.0 U2] Nút Đăng xuất (thay "Trang chủ") */}
        <div className="sidebar-footer">
          <button
            onClick={handleLogout}
            className="sidebar-item sidebar-item--home"
          >
            <i className="fas fa-sign-out-alt" />
            <FormattedMessage id="patient-portal.sidebar.logout" />
          </button>
          {/* CẤM: <Link to="/">Trang chủ</Link> — đã thay thế */}
        </div>
      </aside>

      <main className="patient-content">
        <div className="patient-header">
          {/* ⚡ [v19.0 U3] XÓA: <span className="patient-badge">👤 Cổng bệnh nhân</span> */}
          <div className="header-left">{/* Trống — đã xóa badge */}</div>
          <div className="header-right">
            <span className="patient-name">
              {userInfo?.lastName} {userInfo?.firstName}
            </span>
          </div>
        </div>
        <div className="patient-body">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
```

> **i18n**: Thêm key `patient-portal.sidebar.logout` vào `vi.json` ("Đăng xuất") và `en.json` ("Logout").

---

# [v18.0 T4] PHẦN 4: BÁC SĨ — R2 (100% Code)

## 4.1 — `GET /api/v1/doctor/kpi-statistics`

```javascript
async function getKpiStatistics(req, res) {
  try {
    // ✅ [v20.3 FIX-1] Guard #25 — mọi catch BẮT BUỘC return response
    const doctorId = req.user.id; // IDOR-safe: KHÔNG nhận từ client

    const totalBookings = await db.Booking.count({
      where: { doctorId, statusId: { [Op.in]: ["S2", "S3"] } },
    });
    const totalRevenue =
      (await db.Booking.sum("bookingPrice", {
        where: { doctorId, paymentStatus: "paid" },
      })) || 0;
    const todayBookings = await db.Booking.count({
      where: {
        doctorId,
        date: moment().tz("Asia/Ho_Chi_Minh").format("YYYY-MM-DD"),
        statusId: { [Op.in]: ["S1", "S2"] },
      },
    });

    res.json({
      errCode: 0,
      data: { totalBookings, totalRevenue, todayBookings },
    });
  } catch (err) {
    return res.status(500).json({ errCode: -1 });
  }
}
```

## 4.2 — `ManagePatient.jsx` (v20.6 — Dashboard Integration)

> **File thực tế**: `src/containers/System/Doctor/ManagePatient.jsx`
>
> **[v20.6]** Tích hợp KPI Statistics Dashboard (gọi API Mục 4.1) trực tiếp vào ManagePatient.
> Component sử dụng: `DatePicker`, bộ lọc trạng thái (ALL/S1-S4), i18n (`useIntl`), `RemedyModal`, hủy lịch hẹn, loading/empty state.
> **KHÔNG** dùng `PaymentBadge` — thay bằng status badge inline theo `statusId`.

```jsx
// ManagePatient.jsx — v20.6 (Dashboard Integration)
import React, { useState, useEffect, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useIntl } from "react-intl";
import { toast } from "react-toastify";
import moment from "moment";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import {
  getListPatientForDoctor,
  cancelBooking,
} from "../../../services/doctorService";
import { processLogout } from "../../../redux/slices/userSlice";
import { LANGUAGES, BOOKING_STATUS } from "../../../utils/constants";
import axiosInstance from "../../../services/axiosConfig";
import RemedyModal from "./RemedyModal";
import "./ManagePatient.scss";

// ⚡ [v20.6] Helper format tiền VNĐ
const formatCurrency = (value) => {
  if (value == null || isNaN(value)) return "0 ₫";
  return Number(value).toLocaleString("vi-VN") + " ₫";
};

const ManagePatient = () => {
  const dispatch = useDispatch();
  const intl = useIntl();
  const { userInfo } = useSelector((state) => state.user);
  const language = useSelector((state) => state.app.language);

  // ⚡ [v3.0] Lazy initializer — UTC midnight timestamp
  // RÀNG BUỘC #1: 2-step: format string → moment.utc (CẮT timezone)
  const [currentDate, setCurrentDate] = useState(() => {
    return moment.utc(moment().format("YYYY-MM-DD")).valueOf();
  });

  // RÀNG BUỘC #2: Lọc trạng thái — mặc định S2 (Đã xác nhận)
  const [statusFilter, setStatusFilter] = useState("S2");
  const [dataPatient, setDataPatient] = useState([]);
  const [isOpenRemedyModal, setIsOpenRemedyModal] = useState(false);
  const [dataModal, setDataModal] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  // ⚡ [v20.6] KPI Dashboard State
  const [kpiData, setKpiData] = useState({
    totalBookings: 0,
    totalRevenue: 0,
    todayBookings: 0,
  });

  // ═══ [v20.6] FETCH KPI STATISTICS ═══
  // API: GET /api/v1/doctor/kpi-statistics (Mục 4.1)
  // Guard #17: IDOR-safe — backend dùng req.user.id, KHÔNG nhận doctorId từ client
  const fetchDoctorKpi = useCallback(async () => {
    try {
      const res = await axiosInstance.get("/api/v1/doctor/kpi-statistics");
      if (res && res.errCode === 0) {
        setKpiData(
          res.data || { totalBookings: 0, totalRevenue: 0, todayBookings: 0 },
        );
      }
    } catch (err) {
      // Silent fail — KPI là thông tin phụ, không block UI chính
      console.error("[KPI]", err?.message);
    }
  }, []);

  // ═══ GỌI API MỖI KHI currentDate HOẶC statusFilter THAY ĐỔI ═══
  useEffect(() => {
    if (userInfo?.id) {
      fetchPatientList(currentDate, statusFilter);
      fetchDoctorKpi(); // ⚡ [v20.6] Gọi KPI mỗi lần mount + đổi filter
    }
  }, [currentDate, statusFilter, userInfo?.id]);

  // ═══ FETCH PATIENT LIST ═══
  // API: GET /api/v1/doctors/:doctorId/patients?date=&statusId=
  // (qua axiosInstance — tự gắn Bearer token)
  const fetchPatientList = useCallback(
    async (date, statusId) => {
      setIsLoading(true);
      try {
        const res = await getListPatientForDoctor(userInfo.id, date, statusId);
        if (res && res.errCode === 0) {
          setDataPatient(res.data || []);
        } else {
          setDataPatient([]);
        }
      } catch (err) {
        // RÀNG BUỘC #3: Bắt 401 Session Expired → logout
        if (err.response?.status === 401) {
          toast.error(
            intl.formatMessage({ id: "doctor.manage-patient.session-expired" }),
          );
          dispatch(processLogout());
          return;
        }
        toast.error(
          intl.formatMessage({ id: "doctor.manage-patient.load-error" }),
        );
      } finally {
        setIsLoading(false);
      }
    },
    [userInfo?.id, intl, dispatch],
  );

  // ═══ DATE PICKER — CẮT TIMEZONE BẰNG STRING (v3.0) ═══
  const handleOnChangeDatePicker = (date) => {
    if (!date) return;
    const dateString = moment(date).format("YYYY-MM-DD"); // pure string
    const formattedDate = moment.utc(dateString).valueOf(); // UTC midnight
    setCurrentDate(formattedDate);
  };

  // ═══ HỦY LỊCH HẸN — S2 → S4 ═══
  // RÀNG BUỘC #4: Chỉ gửi bookingId, KHÔNG gửi doctorId (chống IDOR)
  const handleCancelBooking = async (booking) => {
    const isConfirm = window.confirm(
      language === LANGUAGES.VI
        ? `Bạn có chắc muốn hủy lịch hẹn của ${booking.patientName || "bệnh nhân"}?`
        : `Are you sure you want to cancel the appointment of ${booking.patientName || "patient"}?`,
    );
    if (!isConfirm) return;
    try {
      const res = await cancelBooking(booking.id, {});
      if (res && res.errCode === 0) {
        toast.success(
          intl.formatMessage({ id: "doctor.manage-patient.cancel-success" }),
        );
        await fetchPatientList(currentDate, statusFilter);
        await fetchDoctorKpi(); // ⚡ [v20.6] Refresh KPI sau khi hủy
      } else {
        toast.error(res?.message || "Error");
      }
    } catch (err) {
      if (err.response?.status === 401) {
        toast.error(
          intl.formatMessage({ id: "doctor.manage-patient.session-expired" }),
        );
        dispatch(processLogout());
        return;
      }
      toast.error(
        intl.formatMessage({ id: "doctor.manage-patient.cancel-error" }),
      );
    }
  };

  // ═══ REMEDY MODAL ═══
  const handleOpenRemedyModal = (booking) => {
    setDataModal(booking);
    setIsOpenRemedyModal(true);
  };
  const handleCloseRemedyModal = () => {
    setIsOpenRemedyModal(false);
    setDataModal({});
  };
  const handleSendRemedySuccess = () => {
    handleCloseRemedyModal();
    fetchPatientList(currentDate, statusFilter);
    fetchDoctorKpi(); // ⚡ [v20.6] Refresh KPI sau khi gửi kết quả (S2→S3)
  };

  // RÀNG BUỘC #5: Nút thao tác CHỈ HIỂN THỊ khi statusId === 'S2'
  const isActionable = (item) => item.statusId === BOOKING_STATUS.CONFIRMED;

  return (
    <div className="manage-patient-container">
      <h2 className="tw-text-xl tw-font-bold tw-text-text-main tw-mb-5">
        {intl.formatMessage({ id: "doctor.manage-patient.title" })}
      </h2>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* ⚡ [v20.6] KPI DASHBOARD — 3 CARD THỐNG KÊ NHANH              */}
      {/* Nằm TRÊN bộ lọc, dùng tông chủ đạo #45C3D2                   */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-3 tw-gap-5 tw-mb-6">
        {/* CARD 1: Tổng số ca khám */}
        <div className="tw-bg-white tw-rounded-xl tw-shadow-md tw-p-5 tw-border-t-4 tw-border-[#45C3D2] tw-flex tw-items-center tw-gap-4">
          <div className="tw-w-12 tw-h-12 tw-rounded-full tw-bg-[#45C3D2]/10 tw-flex tw-items-center tw-justify-center tw-flex-shrink-0">
            <span className="tw-text-2xl">📋</span>
          </div>
          <div>
            <p className="tw-text-sm tw-text-gray-500 tw-mb-0.5">
              {language === LANGUAGES.VI ? "Tổng số ca khám" : "Total Bookings"}
            </p>
            <p className="tw-text-2xl tw-font-bold tw-text-gray-800">
              {kpiData.totalBookings}
            </p>
          </div>
        </div>

        {/* CARD 2: Doanh thu */}
        <div className="tw-bg-white tw-rounded-xl tw-shadow-md tw-p-5 tw-border-t-4 tw-border-[#45C3D2] tw-flex tw-items-center tw-gap-4">
          <div className="tw-w-12 tw-h-12 tw-rounded-full tw-bg-[#45C3D2]/10 tw-flex tw-items-center tw-justify-center tw-flex-shrink-0">
            <span className="tw-text-2xl">💰</span>
          </div>
          <div>
            <p className="tw-text-sm tw-text-gray-500 tw-mb-0.5">
              {language === LANGUAGES.VI ? "Doanh thu" : "Revenue"}
            </p>
            <p className="tw-text-2xl tw-font-bold tw-text-gray-800">
              {formatCurrency(kpiData.totalRevenue)}
            </p>
          </div>
        </div>

        {/* CARD 3: Ca khám hôm nay */}
        <div className="tw-bg-white tw-rounded-xl tw-shadow-md tw-p-5 tw-border-t-4 tw-border-[#45C3D2] tw-flex tw-items-center tw-gap-4">
          <div className="tw-w-12 tw-h-12 tw-rounded-full tw-bg-[#45C3D2]/10 tw-flex tw-items-center tw-justify-center tw-flex-shrink-0">
            <span className="tw-text-2xl">📅</span>
          </div>
          <div>
            <p className="tw-text-sm tw-text-gray-500 tw-mb-0.5">
              {language === LANGUAGES.VI ? "Ca khám hôm nay" : "Today"}
            </p>
            <p className="tw-text-2xl tw-font-bold tw-text-gray-800">
              {kpiData.todayBookings}
            </p>
          </div>
        </div>
      </div>
      {/* ═══ END KPI DASHBOARD ═══ */}

      {/* ═══ BỘ LỌC: DatePicker + Status Filter ═══ */}
      <div className="tw-bg-white tw-rounded-card tw-shadow-card tw-p-5 tw-mb-5">
        <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 tw-gap-4">
          <div className="filter-date">
            <label className="tw-block tw-text-sm tw-font-medium tw-text-text-main tw-mb-1">
              {intl.formatMessage({ id: "doctor.manage-patient.select-date" })}
            </label>
            <DatePicker
              className="tw-w-full tw-px-3 tw-py-2 tw-border tw-border-gray-300 tw-rounded-lg tw-text-sm"
              selected={new Date(currentDate)}
              onChange={handleOnChangeDatePicker}
              dateFormat="dd/MM/yyyy"
            />
          </div>
          {/* RÀNG BUỘC #2: Status Filter — dropdown 5 giá trị */}
          <div className="filter-status">
            <label className="tw-block tw-text-sm tw-font-medium tw-text-text-main tw-mb-1">
              {intl.formatMessage({
                id: "doctor.manage-patient.filter-status",
              })}
            </label>
            <select
              className="tw-w-full tw-px-3 tw-py-2 tw-border tw-border-gray-300 tw-rounded-lg tw-text-sm tw-bg-white focus:tw-outline-none focus:tw-border-[#45C3D2]"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">
                {intl.formatMessage({ id: "doctor.manage-patient.status-all" })}
              </option>
              <option value="S1">
                {intl.formatMessage({ id: "doctor.manage-patient.status-new" })}
              </option>
              <option value="S2">
                {intl.formatMessage({
                  id: "doctor.manage-patient.status-confirmed",
                })}
              </option>
              <option value="S3">
                {intl.formatMessage({
                  id: "doctor.manage-patient.status-done",
                })}
              </option>
              <option value="S4">
                {intl.formatMessage({
                  id: "doctor.manage-patient.status-cancelled",
                })}
              </option>
            </select>
          </div>
        </div>
      </div>

      {/* ═══ TABLE — 8 CỘT ═══ */}
      {isLoading ? (
        <div className="tw-flex tw-items-center tw-justify-center tw-gap-3 tw-py-12 tw-text-text-sub">
          <div className="tw-animate-spin tw-w-6 tw-h-6 tw-border-3 tw-border-[#45C3D2] tw-border-t-transparent tw-rounded-full"></div>
          <span>{intl.formatMessage({ id: "common.loading" })}</span>
        </div>
      ) : dataPatient.length > 0 ? (
        <div className="tw-bg-white tw-rounded-card tw-shadow-card tw-overflow-x-auto">
          <table className="tw-w-full tw-text-sm">
            <thead>
              <tr className="tw-bg-bg-light tw-border-b tw-border-gray-200">
                <th className="tw-px-4 tw-py-3 tw-text-left tw-font-semibold tw-text-text-sub">
                  #
                </th>
                <th className="tw-px-4 tw-py-3 tw-text-left tw-font-semibold tw-text-text-sub">
                  {intl.formatMessage({ id: "doctor.manage-patient.col-name" })}
                </th>
                <th className="tw-px-4 tw-py-3 tw-text-left tw-font-semibold tw-text-text-sub">
                  {intl.formatMessage({
                    id: "doctor.manage-patient.col-phone",
                  })}
                </th>
                <th className="tw-px-4 tw-py-3 tw-text-left tw-font-semibold tw-text-text-sub">
                  {intl.formatMessage({
                    id: "doctor.manage-patient.col-address",
                  })}
                </th>
                <th className="tw-px-4 tw-py-3 tw-text-left tw-font-semibold tw-text-text-sub">
                  {intl.formatMessage({
                    id: "doctor.manage-patient.col-gender",
                  })}
                </th>
                <th className="tw-px-4 tw-py-3 tw-text-left tw-font-semibold tw-text-text-sub">
                  {intl.formatMessage({ id: "doctor.manage-patient.col-time" })}
                </th>
                <th className="tw-px-4 tw-py-3 tw-text-left tw-font-semibold tw-text-text-sub">
                  {intl.formatMessage({
                    id: "doctor.manage-patient.col-reason",
                  })}
                </th>
                <th className="tw-px-4 tw-py-3 tw-text-left tw-font-semibold tw-text-text-sub">
                  {intl.formatMessage({
                    id: "doctor.manage-patient.col-actions",
                  })}
                </th>
              </tr>
            </thead>
            <tbody>
              {dataPatient.map((item, index) => {
                const genderLabel =
                  language === LANGUAGES.VI
                    ? item.patientData?.genderData?.valueVi
                    : item.patientData?.genderData?.valueEn;
                const timeLabel =
                  language === LANGUAGES.VI
                    ? item.timeTypeBooking?.valueVi
                    : item.timeTypeBooking?.valueEn;
                return (
                  <tr
                    key={item.id || index}
                    className="tw-border-b tw-border-gray-100 hover:tw-bg-[#45C3D2]/5 tw-transition-colors"
                  >
                    <td className="tw-px-4 tw-py-3 tw-text-text-sub">
                      {index + 1}
                    </td>
                    <td className="tw-px-4 tw-py-3 tw-font-medium tw-text-text-main">
                      {item.patientName ||
                        `${item.patientData?.lastName} ${item.patientData?.firstName}`}
                    </td>
                    <td className="tw-px-4 tw-py-3 tw-text-text-sub">
                      {item.patientData?.phoneNumber || item.patientPhoneNumber}
                    </td>
                    <td className="tw-px-4 tw-py-3 tw-text-text-sub tw-max-w-[150px] tw-truncate">
                      {item.patientData?.address || item.patientAddress}
                    </td>
                    <td className="tw-px-4 tw-py-3 tw-text-text-sub">
                      {genderLabel || "—"}
                    </td>
                    <td className="tw-px-4 tw-py-3">
                      <span className="tw-px-2 tw-py-0.5 tw-bg-indigo-50 tw-text-indigo-700 tw-rounded-md tw-text-xs tw-font-medium">
                        {timeLabel || "—"}
                      </span>
                    </td>
                    <td className="tw-px-4 tw-py-3 tw-text-text-sub tw-max-w-[150px] tw-truncate">
                      {item.reason || "—"}
                    </td>
                    <td className="tw-px-4 tw-py-3">
                      {/* RÀNG BUỘC #5: Buttons chỉ khi S2 */}
                      {isActionable(item) ? (
                        <div className="tw-flex tw-gap-2">
                          <button
                            className="tw-px-3 tw-py-1.5 tw-bg-emerald-50 tw-text-emerald-700 tw-rounded-md tw-text-xs tw-font-medium tw-border tw-border-emerald-200 tw-cursor-pointer hover:tw-bg-emerald-100 tw-transition-colors"
                            onClick={() => handleOpenRemedyModal(item)}
                          >
                            📧{" "}
                            {intl.formatMessage({
                              id: "doctor.manage-patient.btn-send-remedy",
                            })}
                          </button>
                          <button
                            className="tw-px-3 tw-py-1.5 tw-bg-red-50 tw-text-red-600 tw-rounded-md tw-text-xs tw-font-medium tw-border tw-border-red-200 tw-cursor-pointer hover:tw-bg-red-100 tw-transition-colors"
                            onClick={() => handleCancelBooking(item)}
                          >
                            ❌{" "}
                            {intl.formatMessage({
                              id: "doctor.manage-patient.btn-cancel",
                            })}
                          </button>
                        </div>
                      ) : (
                        <span
                          className={`tw-px-2.5 tw-py-1 tw-rounded-badge tw-text-xs tw-font-semibold ${item.statusId === "S3" ? "tw-bg-emerald-100 tw-text-emerald-700" : item.statusId === "S4" ? "tw-bg-red-100 tw-text-red-700" : "tw-bg-amber-100 tw-text-amber-700"}`}
                        >
                          {item.statusId === "S3"
                            ? "✅ "
                            : item.statusId === "S4"
                              ? "🚫 "
                              : "⏳ "}
                          {item.statusId === "S3"
                            ? language === LANGUAGES.VI
                              ? "Đã khám"
                              : "Done"
                            : item.statusId === "S4"
                              ? language === LANGUAGES.VI
                                ? "Đã hủy"
                                : "Cancelled"
                              : language === LANGUAGES.VI
                                ? "Chờ xác nhận"
                                : "Pending"}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* RÀNG BUỘC #7: Empty State với Icon 📭 */
        <div className="tw-text-center tw-py-16 tw-bg-white tw-rounded-card tw-shadow-card">
          <div className="tw-text-5xl tw-mb-3">📭</div>
          <p className="tw-text-text-sub">
            {intl.formatMessage({ id: "doctor.manage-patient.no-patient" })}
          </p>
        </div>
      )}

      {/* ═══ REMEDY MODAL ═══ */}
      {isOpenRemedyModal && (
        <RemedyModal
          isOpen={isOpenRemedyModal}
          dataModal={dataModal}
          onClose={handleCloseRemedyModal}
          onSendSuccess={handleSendRemedySuccess}
        />
      )}
    </div>
  );
};

export default ManagePatient;
```

> **[v20.6] Tổng hợp thay đổi so với v20.5**:
>
> 1. **KPI Dashboard**: 3 Card thống kê nhanh (Tổng ca / Doanh thu / Hôm nay) nằm **TRÊN** bộ lọc
> 2. **`fetchDoctorKpi()`**: Gọi `GET /api/v1/doctor/kpi-statistics` qua `axiosInstance` — IDOR-safe (Guard #17)
> 3. **`kpiData` state**: `{ totalBookings, totalRevenue, todayBookings }` — cập nhật mỗi lần mount + filter
> 4. **`formatCurrency()`**: Helper format tiền VNĐ — `Number.toLocaleString('vi-VN') + ' ₫'`
> 5. **KPI Refresh**: Gọi `fetchDoctorKpi()` sau Cancel Booking và Send Remedy thành công
> 6. **Design**: `tw-border-t-4 tw-border-[#45C3D2]`, icon circle `tw-bg-[#45C3D2]/10`, hover row `tw-bg-[#45C3D2]/5`
> 7. **Spinner**: Dùng `tw-border-[#45C3D2]` thay `tw-border-primary` cho nhất quán
>
> **Giữ nguyên từ v20.5**:
>
> 1. DatePicker + Status Filter (ALL/S1-S4) + i18n + RemedyModal + Cancel Booking
> 2. 8 cột bảng: #, Bệnh nhân, SĐT, Địa chỉ, Giới tính, Giờ khám, Lý do, Thao tác
> 3. 401 Session Expired → `processLogout()`
> 4. API endpoint: `GET /api/v1/doctors/:doctorId/patients?date=&statusId=`

---

# ✅ [v20.1 FIX-3] PHẦN 5: CHECKLIST — 64 GUARDS (Tự chứa)

| #   | Guard                    | Mô tả                                                                                                                                        |
| --- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | DB Pool Leak             | `t.rollback()` trong mọi `catch`. CẤM quên return                                                                                            |
| 2   | Anti-Spam Duplicate      | Chặn S1/S2/S3 trùng lịch cho 1 bệnh nhân                                                                                                     |
| 3   | OrderInfo Sanitize       | Regex `/[^a-zA-Z0-9 ]/g` trước khi hash                                                                                                      |
| 4   | Legacy Token NOT NULL    | Giữ cột `token` cũ trong Booking                                                                                                             |
| 5   | RFC 3986 qs              | `qs.stringify` chuẩn URI                                                                                                                     |
| 6   | IPN Fast-Response        | `res.status(200)` TRƯỚC, email async SAU                                                                                                     |
| 7   | IPN Eager Load           | Include doctorData, patientData, timeType                                                                                                    |
| 8   | Snapshot bookingPrice    | Lưu giá tại thời điểm tạo booking                                                                                                            |
| 9   | Express Hash Decode Trap | `query parser: 'simple'`                                                                                                                     |
| 10  | Refund: TxnNo + PayDate  | Lưu đủ dữ liệu cho hoàn tiền                                                                                                                 |
| 11  | PAY3 Cash Guard          | `paymentId === 'PAY3'` → errCode 6                                                                                                           |
| 12  | Async Logout             | `await persistor.flush()` trước navigate                                                                                                     |
| 13  | PaymentResult Lifecycle  | Parse→State→Clean URL                                                                                                                        |
| 14  | Cron Secret .env         | `API_CRON_SECRET` + `manualAuthGuard`                                                                                                        |
| 15  | Batching CONCURRENCY=5   | Cursor + batch xử lý cron                                                                                                                    |
| 16  | QueryDR Whitelist        | Chỉ 00/24/02. Mã khác → transient giữ S1                                                                                                     |
| 17  | IDOR KPI                 | `req.user.id` — CẤM truyền doctorId từ client                                                                                                |
| 18  | Payment Taxonomy         | 5 giá trị: unpaid/paid/failed/expired/refunded                                                                                               |
| 19  | PII Mask                 | `maskName()` null-safe + `validator.escape()`                                                                                                |
| 20  | Trust Proxy 1            | `app.set('trust proxy', 1)`                                                                                                                  |
| 21  | Cron TZ SQL              | `NOW()` trong DB, CẤM `Date.now()`                                                                                                           |
| 22  | Receipt Rate-Limit       | 30 req / 15 phút                                                                                                                             |
| 23  | Axios Toast Suppress     | `x-mute-toast: true` cho biên lai                                                                                                            |
| 24  | Cronjob return           | Mỗi nhánh switch PHẢI return                                                                                                                 |
| 25  | catch return 500         | Mọi catch BẮT BUỘC return response                                                                                                           |
| 26  | manualAuthGuard          | 401/403 + 7 unit tests                                                                                                                       |
| 27  | Resume Cutoff SQL        | `DATE_SUB(NOW(), INTERVAL 20 MINUTE)`                                                                                                        |
| 28  | maskName Null-safe       | `String(value \|\| '')` trước escape                                                                                                         |
| 29  | Transient → Giữ S1       | Mã lạ QueryDR → không đổi trạng thái                                                                                                         |
| 30  | Logout F5 test           | Nhấn F5 sau logout → không giữ phiên                                                                                                         |
| 31  | IPN SETTLED → 02         | paid/failed/expired/refunded → RspCode 02                                                                                                    |
| 32  | Slot-Once                | Chỉ trừ slot khi unpaid→failed                                                                                                               |
| 33  | Integer Math             | `Number.isSafeInteger()` cho amount                                                                                                          |
| 34  | publicReceiptToken       | Sinh tại IPN thành công                                                                                                                      |
| 35  | Cursor hasMore           | Phân trang cron batch                                                                                                                        |
| 36  | GET_LOCK(30)             | Dedicated write conn + timeout 30s                                                                                                           |
| 37  | Lock order               | Schedule → Booking (`create_payment_url`, `cron`). **IPN/cron else exception**: Booking → Schedule (phụ thuộc dữ liệu). Bảo vệ bởi Guard #38 |
| 38  | Deadlock retry           | errno 1213/1205 × 3 lần                                                                                                                      |
| 39  | HMAC alphabetical        | `Object.keys().sort()` trước ký                                                                                                              |
| 40  | timingSafeEqual          | Chống timing attack so hash                                                                                                                  |
| 41  | receiptExpiredAt         | `DATE_ADD(NOW(), INTERVAL 24 HOUR)`                                                                                                          |
| 42  | READ_COMMITTED           | Isolation level đầu transaction                                                                                                              |
| 43  | Lock Schedule TRƯỚC      | Schedule → rồi mới Booking (áp dụng cho `create_payment_url` và `cron` paid branch)                                                          |
| 44  | Composite Index          | `(doctorId, date, timeType)` UNIQUE                                                                                                          |
| 45  | typeof hash SHA512       | `typeof === 'string'` + `=== 'SHA512'`                                                                                                       |
| 46  | regex hex 128            | `/^[a-f0-9]{128}$/i`                                                                                                                         |
| 47  | snapshotKey cleanup      | Cross-validate + useEffect return                                                                                                            |
| 48  | TOCTOU Guard             | `bookingByToken` chặn truy cập bằng `paymentStatus = "paid"` — CẤM dùng `publicReceiptToken` hoặc `receiptExpiredAt` làm guard chính         |
| 49  | Two-step query           | findOne trong txn, CẤM count ngoài                                                                                                           |
| 50  | vnp_Params null-proto    | `Object.assign(Object.create(null), req.query)`                                                                                              |
| 51  | isResume dynamic         | Biến động từ logic, không hardcode                                                                                                           |
| 52  | 2-Strike reconciliation  | `reconcileFirstSeenAt` + 10 phút matured                                                                                                     |
| 53  | innodb_lock_wait=5       | Relative Duration                                                                                                                            |
| 54  | pool.acquire ≤ 5000ms    | Timeout lấy connection                                                                                                                       |
| 55  | App timeout 8s           | `Promise.race` + `clearTimeout` finally                                                                                                      |
| 56  | Idempotency Atomic       | `setInProgress(NX EX 30)` / `setDone(EX 86400)` / `delete` on error                                                                          |
| 57  | UUID retry + HMAC        | 3x UUID, fallback `RECEIPT_FALLBACK_SECRET` + nonce                                                                                          |
| 58  | Snapshot cross-validate  | `snapshotKey === txnRef`                                                                                                                     |
| 59  | Resume → STEP_URL        | CẤM skip bước dựng URL VNPay                                                                                                                 |
| 60  | Force Expire GC          | S1 > 24h → QueryDR cuối → cứu hoặc ép S4                                                                                                     |
| 61  | sanitizeLog              | CẤM `console.error(err)` trần                                                                                                                |
| 62  | AbortController          | `signal.aborted` check ×5 + `isResponded` lock                                                                                               |
| 63  | Backpressure Gate        | `MAX_PENDING=50` → 503                                                                                                                       |
| 64  | URI + TCP Bridge         | `req.originalUrl > 2048` → 414. `req.on('close')` check `!res.writableEnded`                                                                 |

### Bổ sung nghiệp vụ (không đánh số guard)

| Hạng mục              | Mô tả                                                                                                             |
| --------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Redux Ghost Purge     | `dispatch(processLogout())` + `await persistor.flush()` — reset user slice, giữ app/language trong `persist:root` |
| HTTP Encode Protocol  | `signData` (`encode: false`) vs `urlQuery` (`encode: true`)                                                       |
| Hybrid IP             | `x-forwarded-for` → `remoteAddress` → `req.ip`                                                                    |
| Timezone GMT+7        | `moment().tz('Asia/Ho_Chi_Minh').format(...)` gửi VNPay                                                           |
| Empty Payload         | `Object.keys(vnp_Params).length === 0` → 97                                                                       |
| Exact Allowlist       | `VNPAY_ALLOWED_KEYS` — CẤM `startsWith`                                                                           |
| Retry-After + Backoff | 503 → header + Exp Backoff + Jitter, max 5, cap 15s                                                               |
| Entropy Fail-Closed   | `randomBytes` lỗi → throw, CẤM `Math.random`                                                                      |
| XSS Shield            | `validator.escape()` + CẤM `dangerouslySetInnerHTML` toàn FE                                                      |
| NTP Drift Doctrine    | Relative (setTimeout) vs Absolute (SQL `NOW()`)                                                                   |
| WHITELIST String Keys | `["24"]` Computed Property Name — ép string key, chống auto-format tool                                           |

---

# PHẦN 6: LỘ TRÌNH TRIỂN KHAI

## 📅 GĐ 11.1 — Backend Core

- [ ] `.env` (8 biến VNPay + secrets) + `server.js` (query parser, trust proxy, Guard 64 URI, CORS)
- [ ] `booking.js` 9 cột mới + indexes. `schedule.js` composite UNIQUE
- [ ] `middleware/backpressure.js` MAX_PENDING=50

## 📅 GĐ 11.2 — Security Helpers

- [ ] `generateReceiptToken.js`, `idempotencyStore.js`, `sanitizeLog.js`
- [ ] `manualAuthGuard.js` + 7 tests, `vnpayAllowedKeys.js`

## 📅 GĐ 11.3 — Payment Flow

- [ ] `create_payment_url` + `buildVnpayUrl` + `vnpay_ipn`
- [ ] Ngrok E2E test

## 📅 GĐ 11.4 — Frontend

- [ ] `paymentService.js` + `BookingModal.jsx` + `PaymentResult.jsx`
- [ ] `axiosConfig.js` (x-mute-toast + logout) + `PatientInfo.jsx`

## 📅 GĐ 11.5 — Admin & Doctor + Final

- [ ] `vnpay_querydr` + `cleanup-s1` + `booking-by-token`
- [x] Doctor ManagePatient (đã có — 296 dòng, DatePicker + status filter + RemedyModal + i18n)
- [ ] Doctor KPI API backend (`getKpiStatistics` — Mục 4.1)
- [ ] Tích hợp KPI Dashboard vào ManagePatient.jsx (v20.6 — `fetchDoctorKpi` + 3 Card)
- [ ] Final Audit: 64 guards checklist

---

> 🔒 **[V20.6 DASHBOARD INTEGRATION — ARCHITECTURE COMPLETE]** Toàn bộ hệ thống từ Backend KPI đến Frontend Dashboard đã được hợp nhất trong tài liệu. Kỹ sư Trần Đức Hải, bản vẽ đã hoàn hảo để khởi công!
