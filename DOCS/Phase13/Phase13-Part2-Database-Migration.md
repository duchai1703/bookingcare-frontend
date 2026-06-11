# PHASE 13 — PHẦN 3: ĐẠI PHẪU DATABASE (MYSQL ➔ POSTGRESQL)

> [!CAUTION]
> **DIALECT CLASH WARNING:** Toàn bộ raw SQL MySQL trong codebase SẼ LỖI khi chuyển sang PostgreSQL.
> Bắt buộc rà soát và thay thế TRƯỚC khi deploy.

---

## 3.1. Cấu hình Sequelize cho PostgreSQL

**File:** `bookingcare-backend/src/models/index.js` — THAY THẾ TOÀN BỘ:

```javascript
"use strict";

const fs = require("fs");
const path = require("path");
const { Sequelize, DataTypes } = require("sequelize");
require("dotenv").config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USERNAME,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: "postgres", // ← CHUYỂN TỪ mysql SANG postgres
    logging: false, // ← Production: CẤM logging

    pool: {
      max: 20,
      min: 2,
      acquire: 10000,
      idle: 10000,
      // [SEQUELIZE ZOMBIE DROP GUARD]: Tắt SSL cho internal Docker network
    },

    // [Phase 13] PostgreSQL Timezone — UTC enforcement
    timezone: "+07:00",
    dialectOptions: {
      // [SEQUELIZE ZOMBIE DROP GUARD]: Không cần SSL trong Docker internal
      ssl: false,
      // PostgreSQL trả date dạng string
      useUTC: false,
    },

    // [SEQUELIZE ZOMBIE DROP GUARD]: keepAlive cho long-running connections
    dialectOptions: {
      ssl: false,
      keepAlive: true,
    },

    // PostgreSQL KHÔNG cần afterConnect hook SET time_zone
    // vì timezone được cấu hình qua biến môi trường TZ=UTC
    // và Sequelize timezone option ở trên
  },
);

const db = {};

// Auto-load tất cả model files trong thư mục models/
fs.readdirSync(__dirname)
  .filter((file) => file !== "index.js" && file.endsWith(".js"))
  .forEach((file) => {
    const model = require(path.join(__dirname, file))(sequelize, DataTypes);
    db[model.name] = model;
  });

// ===== ASSOCIATIONS (giữ nguyên 100% từ Phase 11) =====
// ... [GIỮ NGUYÊN TOÀN BỘ ASSOCIATIONS TỪ FILE HIỆN TẠI] ...
// (Copy lại toàn bộ khối associations từ dòng 63-205 của index.js hiện tại)

db.sequelize = sequelize;
db.Sequelize = Sequelize;

// ✅ [Phase 13] sync policy — BỌC alter: { drop: false }
// [THE REPLICA SYNC DEADLOCK WARNING]: CHỈ CHẠY 1 CONTAINER BE
db.syncSchema = async () => {
  await sequelize.sync({ alter: { drop: false } });

  // [THE SYNC-SEED DEADLOCK GUARD]: Seed Data gọi trong sequelize.sync()
  const { Allcode } = db;
  const count = await Allcode.count();
  if (count === 0) {
    console.log(">>> Empty database detected — running seed...");
    require("../seeders/seedAllcode");
  }
};

module.exports = db;
```

---

## 3.2. Bảng chuyển đổi MySQL → PostgreSQL

| MySQL Syntax                             | PostgreSQL Syntax                      | File bị ảnh hưởng      |
| ---------------------------------------- | -------------------------------------- | ---------------------- |
| `TINYINT(1)`                             | `BOOLEAN`                              | Sequelize tự xử lý     |
| `DATE_SUB(NOW(), INTERVAL 20 MINUTE)`    | `NOW() - INTERVAL '20 minutes'`        | `paymentController.js` |
| `DATE_ADD(NOW(), INTERVAL 24 HOUR)`      | `NOW() + INTERVAL '24 hours'`          | `paymentController.js` |
| `GET_LOCK('name', 30)`                   | `pg_advisory_lock(hashtext('name'))`   | `paymentController.js` |
| `RELEASE_LOCK('name')`                   | `pg_advisory_unlock(hashtext('name'))` | `paymentController.js` |
| `SET SESSION innodb_lock_wait_timeout=5` | `SET LOCAL lock_timeout = '5s'`        | `paymentController.js` |
| `SELECT @@session.time_zone AS tz`       | `SHOW timezone`                        | `server.js`            |
| `UUID()` mặc định                        | `gen_random_uuid()`                    | Model definitions      |

---

## 3.3. Sửa paymentController.js — MySQL → PostgreSQL

**File:** `bookingcare-backend/src/controllers/paymentController.js`

### 3.3.1. `executeCreatePayment` — Lock timeout

```diff
-await db.sequelize.query('SET SESSION innodb_lock_wait_timeout=5', {
-  transaction: t,
-});
+await db.sequelize.query("SET LOCAL lock_timeout = '5s'", {
+  transaction: t,
+});
```

### 3.3.2. S1/Cutoff Logic — DATE_SUB

```diff
-const cutoff = await db.sequelize.query(
-  `SELECT (createdAt<DATE_SUB(NOW(),INTERVAL 20 MINUTE)) AS isExpired
-   FROM Bookings WHERE id=:id`,
+const cutoff = await db.sequelize.query(
+  `SELECT ("createdAt" < NOW() - INTERVAL '20 minutes') AS "isExpired"
+   FROM "Bookings" WHERE id=:id`,
```

### 3.3.3. IPN — `receiptExpiredAt` literal

```diff
-booking.receiptExpiredAt = db.sequelize.literal(
-  'DATE_ADD(NOW(),INTERVAL 24 HOUR)',
-);
+booking.receiptExpiredAt = db.sequelize.literal(
+  "NOW() + INTERVAL '24 hours'",
+);
```

### 3.3.4. `cleanupS1` — GET_LOCK

```diff
-const lockResult = await db.sequelize.query(
-  "SELECT GET_LOCK('cron_cleanup_s1', 30) AS acquired",
-  {
-    type: Sequelize.QueryTypes.SELECT,
-    plain: true,
-    options: { type: 'write' },
-  },
-);
-lockAcquired = lockResult.acquired === 1;
+const lockResult = await db.sequelize.query(
+  "SELECT pg_try_advisory_lock(hashtext('cron_cleanup_s1')) AS acquired",
+  {
+    type: Sequelize.QueryTypes.SELECT,
+    plain: true,
+  },
+);
+lockAcquired = lockResult.acquired === true;
```

### 3.3.5. `cleanupS1` — RELEASE_LOCK

```diff
-await db.sequelize
-  .query("SELECT RELEASE_LOCK('cron_cleanup_s1')")
-  .catch(() => {});
+await db.sequelize
+  .query("SELECT pg_advisory_unlock(hashtext('cron_cleanup_s1'))")
+  .catch(() => {});
```

### 3.3.6. `cleanupS1` — Matured check

```diff
-const m = await db.sequelize.query(
-  `SELECT (reconcileFirstSeenAt < DATE_SUB(NOW(), INTERVAL 10 MINUTE)) AS ok
-   FROM Bookings WHERE id=:id`,
+const m = await db.sequelize.query(
+  `SELECT ("reconcileFirstSeenAt" < NOW() - INTERVAL '10 minutes') AS ok
+   FROM "Bookings" WHERE id=:id`,
```

### 3.3.7. `cleanupS1` — Zombie check

```diff
-const z = await db.sequelize.query(
-  `SELECT (createdAt<DATE_SUB(NOW(),INTERVAL 24 HOUR)) AS isZ FROM Bookings WHERE id=:id`,
+const z = await db.sequelize.query(
+  `SELECT ("createdAt" < NOW() - INTERVAL '24 hours') AS "isZ" FROM "Bookings" WHERE id=:id`,
```

### 3.3.8. `cleanupS1` — Deadlock errno

```diff
-if ([1213, 1205].includes(err.parent?.errno) && retries < 2) {
+if (err.parent?.code === '40P01' && retries < 2) {
+// PostgreSQL deadlock error code: 40P01
```

---

## 3.4. Sửa server.js — Timezone Check

```diff
-const [tzResult] = await db.sequelize.query("SELECT @@session.time_zone AS tz");
-const sessionTz = tzResult[0]?.tz;
-if (sessionTz !== '+07:00') {
+const [tzResult] = await db.sequelize.query("SHOW timezone");
+const sessionTz = tzResult[0]?.TimeZone || tzResult[0]?.timezone;
+if (sessionTz !== 'UTC') {
   console.error(`\n❌ [FATAL — TIMEZONE MISMATCH]`);
-  console.error(`   Session timezone = '${sessionTz}', expected '+07:00'.`);
+  console.error(`   Session timezone = '${sessionTz}', expected 'UTC'.`);
```

---

## 3.5. .env — Đổi sang PostgreSQL

```env
# Database (Phase 13 — PostgreSQL)
DB_HOST=db-postgres
DB_USERNAME=bookingcare_user
DB_PASSWORD=StrongP@ssw0rd2026
DB_NAME=bookingcare
DB_PORT=5432
DB_DIALECT=postgres
```

---

## 3.6. package.json — Thêm driver PostgreSQL

```diff
 "dependencies": {
+  "pg": "^8.13.0",
+  "pg-hstore": "^2.3.4",
   "axios": "^1.15.2",
-  "mysql2": "^3.19.1",
```
