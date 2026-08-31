# KẾ HOẠCH CHUYỂN ĐỔI HỆ QUẢN TRỊ CƠ SỞ DỮ LIỆU: MySQL → PostgreSQL

> **Dự án:** BookingCare – Hệ thống đặt lịch khám bệnh trực tuyến  
> **Phiên bản:** 1.0 | **Ngày tạo:** 01/09/2026  
> **Tác giả:** Đặng Ngọc Trường Giang & Trần Đức Hải  
> **Phạm vi:** Backend (Express.js + Sequelize ORM) + Docker Compose Infrastructure  
> **Ước lượng thời gian:** 3–5 ngày làm việc (1 sprint phụ)

---

## MỤC LỤC

1. [Tổng quan & Lý do chuyển đổi](#1-tổng-quan--lý-do-chuyển-đổi)
2. [Phân tích hiện trạng MySQL](#2-phân-tích-hiện-trạng-mysql)
3. [So sánh MySQL vs PostgreSQL](#3-so-sánh-mysql-vs-postgresql)
4. [Chiến lược chuyển đổi](#4-chiến-lược-chuyển-đổi)
5. [Kế hoạch thực hiện chi tiết](#5-kế-hoạch-thực-hiện-chi-tiết)
6. [Mapping cú pháp MySQL → PostgreSQL](#6-mapping-cú-pháp-mysql--postgresql)
7. [Thay đổi từng file chi tiết](#7-thay-đổi-từng-file-chi-tiết)
8. [Kế hoạch kiểm thử](#8-kế-hoạch-kiểm-thử)
9. [Kế hoạch rollback](#9-kế-hoạch-rollback)
10. [Checklist hoàn thành](#10-checklist-hoàn-thành)
11. [Phụ lục](#11-phụ-lục)

---

## 1. TỔNG QUAN & LÝ DO CHUYỂN ĐỔI

### 1.1. Bối cảnh

Hệ thống BookingCare Đồ án 1 được phát triển ban đầu với MySQL 8.0 trong môi trường development (local) và đã có Docker Compose sử dụng MySQL. Tuy nhiên, trong Đồ án 2 với yêu cầu:

- **Deploy Production** trên VPS với Docker Compose
- **Tích hợp Telemedicine**, Chat real-time, AI nâng cao
- **Tương lai scale** và cần tính năng nâng cao (JSON operators, Full-text search tiếng Việt, Advanced indexing)

PostgreSQL là lựa chọn phù hợp hơn cho môi trường production.

### 1.2. Lý do chuyển đổi

| # | Lý do | Chi tiết |
|---|-------|----------|
| 1 | **ACID Compliance mạnh hơn** | PostgreSQL có MVCC (Multi-Version Concurrency Control) tốt hơn MySQL InnoDB cho concurrent transactions |
| 2 | **JSON/JSONB native** | Hỗ trợ lưu trữ và query JSON hiệu quả — phù hợp cho chat messages, AI responses, notification metadata |
| 3 | **Full-text search tiếng Việt** | PostgreSQL hỗ trợ tốt hơn với `tsvector` và custom dictionary |
| 4 | **Advanced Indexing** | GIN, GiST, BRIN indexes — tối ưu cho các truy vấn phức tạp |
| 5 | **Docker Compose đã có sẵn** | Đề cương Đồ án 2 đã đề cập PostgreSQL 16 trong kiến trúc Docker |
| 6 | **Open Source thuần túy** | PostgreSQL hoàn toàn miễn phí, không có dual licensing như MySQL (Oracle) |
| 7 | **Standards Compliance** | PostgreSQL tuân thủ chuẩn SQL ANSI/ISO tốt hơn — giảm vendor lock-in |
| 8 | **Tương lai Kubernetes** | PostgreSQL có hệ sinh thái cloud-native tốt hơn (CrunchyData, Zalando Operator) |

### 1.3. Đánh giá rủi ro tổng thể

| Rủi ro | Mức độ | Lý do |
|--------|--------|-------|
| **Mất dữ liệu** | 🟢 Thấp | Có backup + rollback plan |
| **Thay đổi code lớn** | 🟡 Trung bình | Sử dụng Sequelize ORM → phần lớn query trừu tượng hóa |
| **Downtime** | 🟢 Thấp | Chuyển đổi trong môi trường dev, chưa production |
| **Incompatibility** | 🟡 Trung bình | Một số raw SQL cần chuyển đổi thủ công |
| **Learning curve** | 🟢 Thấp | PostgreSQL syntax gần giống MySQL cho basic operations |

---

## 2. PHÂN TÍCH HIỆN TRẠNG MySQL

### 2.1. Cấu hình hiện tại

#### File: `.env` (Development)
```env
DB_HOST=localhost
DB_USERNAME=root
DB_PASSWORD=
DB_NAME=bookingcare
DB_PORT=3306
DB_DIALECT=mysql
```

#### File: `src/config/config.json` (Sequelize CLI)
```json
{
  "development": {
    "username": "root",
    "password": null,
    "database": "bookingcare",
    "host": "127.0.0.1",
    "dialect": "mysql",
    "logging": false
  }
}
```

#### File: `docker-compose.yml`
- Service: `db-mysql` → Image: `mysql:8.0`
- Volume: `mysql_data:/var/lib/mysql`
- Port: `3306:3306`
- Network: `backend-net`

### 2.2. Schema hiện tại (9 bảng Sequelize)

| # | Bảng | Cột đặc biệt | Ghi chú MySQL-specific |
|---|------|---------------|------------------------|
| 1 | **Users** | `image BLOB('long')` | LONGBLOB — cần chuyển sang BYTEA |
| 2 | **Bookings** | 29 cột, 5 indexes | `CAST(date AS UNSIGNED)` trong raw SQL |
| 3 | **Schedules** | Composite unique index | Tương thích |
| 4 | **Doctor_Infos** | FK đến Allcode qua keyMap | Tương thích |
| 5 | **Specialties** | `image BLOB('long')` | LONGBLOB → BYTEA |
| 6 | **Clinics** | `image BLOB('long')` | LONGBLOB → BYTEA |
| 7 | **Allcodes** | `keyMap UNIQUE` | Tương thích |
| 8 | **Reviews** | `bookingId UNIQUE FK` | Tương thích |
| 9 | **Tokens** | `tokenHash SHA256 UNIQUE` | Tương thích |

### 2.3. Dependencies MySQL-specific

| Package | Version | Vai trò | Hành động |
|---------|---------|---------|-----------|
| `mysql2` | ^3.19.1 | MySQL driver cho Sequelize | **XÓA** → thay bằng `pg` + `pg-hstore` |
| `sequelize` | ^6.37.7 | ORM (đa dialect) | **GIỮ NGUYÊN** — chuyển dialect |

### 2.4. Điểm MySQL-specific trong code (Critical Audit)

Sau khi rà soát toàn bộ codebase, các điểm cần chuyển đổi:

#### 🔴 Mức độ Critical (Raw SQL chứa cú pháp MySQL riêng)

| # | File | Dòng | Code MySQL | Tương đương PostgreSQL |
|---|------|------|-----------|----------------------|
| 1 | `src/models/index.js` L45 | `SET time_zone = '+07:00'` (afterConnect hook) | `SET timezone TO 'Asia/Ho_Chi_Minh'` |
| 2 | `src/models/index.js` L30-34 | `dialectOptions: { useUTC: false, dateStrings: true, typeCast: true }` | Xóa hoặc thay bằng PG options |
| 3 | `src/server.js` L95 | `SELECT @@session.time_zone AS tz` | `SHOW timezone` hoặc `SELECT current_setting('TIMEZONE')` |
| 4 | `src/server.js` L158 | `SELECT RELEASE_LOCK('cron_cleanup_s1')` | `SELECT pg_advisory_unlock(hashtext('cron_cleanup_s1'))` |
| 5 | `src/controllers/paymentController.js` L172 | `SET SESSION innodb_lock_wait_timeout=5` | `SET LOCAL lock_timeout = '5s'` |
| 6 | `src/controllers/paymentController.js` L222 | `DATE_SUB(NOW(), INTERVAL 20 MINUTE)` | `NOW() - INTERVAL '20 minutes'` |
| 7 | `src/controllers/paymentController.js` L407-408 | `DATE_ADD(NOW(), INTERVAL 24 HOUR)` | `NOW() + INTERVAL '24 hours'` |
| 8 | `src/controllers/paymentController.js` L597 | `SELECT GET_LOCK('cron_cleanup_s1', 30) AS acquired` | `SELECT pg_try_advisory_lock(hashtext('cron_cleanup_s1')) AS acquired` |
| 9 | `src/controllers/paymentController.js` L617,628 | `DATE_SUB(NOW(), INTERVAL 20 MINUTE)` literal | `NOW() - INTERVAL '20 minutes'` |
| 10 | `src/controllers/paymentController.js` L700 | `DATE_SUB(NOW(), INTERVAL 10 MINUTE)` | `NOW() - INTERVAL '10 minutes'` |
| 11 | `src/controllers/paymentController.js` L738-739 | `DATE_ADD(NOW(), INTERVAL 24 HOUR)` literal | `NOW() + INTERVAL '24 hours'` |
| 12 | `src/controllers/paymentController.js` L767 | `DATE_SUB(NOW(), INTERVAL 24 HOUR)` | `NOW() - INTERVAL '24 hours'` |
| 13 | `src/controllers/paymentController.js` L785 | Deadlock errno check: `[1213, 1205]` | PG error codes: `['40P01', '55P03']` |
| 14 | `src/services/statisticService.js` L16+ | `CAST(date AS UNSIGNED)` | `CAST(date AS BIGINT)` |
| 15 | `src/services/statisticService.js` L57 | `DATE(FROM_UNIXTIME(CAST(date AS UNSIGNED) / 1000))` | `DATE(TO_TIMESTAMP(CAST(date AS BIGINT) / 1000))` |

#### 🟡 Mức độ Medium (Model definitions)

| # | File | Chi tiết | Hành động |
|---|------|----------|-----------|
| 1 | `src/models/user.js` L13 | `BLOB('long')` | Sequelize tự map sang `BYTEA` khi dialect = postgres |
| 2 | `src/models/specialty.js` L6 | `BLOB('long')` | Tương tự — Sequelize handle |
| 3 | `src/models/clinic.js` L7 | `BLOB('long')` | Tương tự — Sequelize handle |

> **Lưu ý:** Sequelize ORM tự động map `DataTypes.BLOB('long')` sang `BYTEA` khi dialect = `postgres`. **KHÔNG CẦN** sửa model definitions.

#### 🟢 Mức độ Low (Comments & Log messages)

| # | File | Chi tiết | Hành động |
|---|------|----------|-----------|
| 1 | `src/models/index.js` | Comments nhắc "MySQL" | Cập nhật comments |
| 2 | `src/server.js` | Log messages nhắc "MySQL" | Cập nhật messages |
| 3 | `src/utils/convertBlobToBase64.js` | JSDoc nhắc "MySQL BLOB" | Cập nhật JSDoc |
| 4 | `src/utils/stripBase64Prefix.js` | Comment nhắc "MySQL BLOB" | Cập nhật comment |

---

## 3. SO SÁNH MySQL vs PostgreSQL

### 3.1. So sánh tổng thể

| Tiêu chí | MySQL 8.0 | PostgreSQL 16 | Lợi thế |
|----------|-----------|---------------|---------|
| **ACID Compliance** | InnoDB only | Toàn bộ engine | 🐘 PG |
| **Concurrency** | Row-level locking | MVCC nâng cao | 🐘 PG |
| **JSON Support** | JSON type | JSONB (binary, indexable) | 🐘 PG |
| **Full-text Search** | FULLTEXT index | tsvector + GIN | 🐘 PG |
| **Window Functions** | Hỗ trợ | Hỗ trợ tốt hơn | 🐘 PG |
| **CTE (WITH clause)** | Hỗ trợ | Recursive CTE tốt hơn | 🐘 PG |
| **Partitioning** | Range, List, Hash | + Declarative partitioning | 🐘 PG |
| **Advisory Locks** | `GET_LOCK()` | `pg_advisory_lock()` | Tương đương |
| **Replication** | Group Replication | Logical + Streaming | 🐘 PG |
| **Docker Image Size** | ~500MB | ~200MB (alpine) | 🐘 PG |
| **RAM Usage** | Cao hơn | Thấp hơn | 🐘 PG |
| **Sequelize Support** | ✅ Tốt | ✅ Tốt | Tương đương |
| **Community** | Oracle-backed | Community-driven | 🐘 PG |

### 3.2. Bảng ánh xạ kiểu dữ liệu

| MySQL | PostgreSQL | Sequelize DataTypes | Ghi chú |
|-------|-----------|-------------------|---------|
| `INT` | `INTEGER` | `DataTypes.INTEGER` | Tương đương |
| `BIGINT` | `BIGINT` | `DataTypes.BIGINT` | Tương đương |
| `VARCHAR(n)` | `VARCHAR(n)` | `DataTypes.STRING(n)` | Tương đương |
| `TEXT` | `TEXT` | `DataTypes.TEXT` | Tương đương |
| `LONGBLOB` | `BYTEA` | `DataTypes.BLOB('long')` | Sequelize tự map |
| `TINYINT(1)` | `BOOLEAN` | `DataTypes.BOOLEAN` | Sequelize tự map |
| `DATETIME` | `TIMESTAMP` | `DataTypes.DATE` | Sequelize tự map |
| `DOUBLE` | `DOUBLE PRECISION` | `DataTypes.DOUBLE` | Sequelize tự map |
| `JSON` | `JSONB` | `DataTypes.JSONB` | PG dùng JSONB (nhanh hơn) |
| `ENUM(...)` | `VARCHAR` + CHECK | `DataTypes.ENUM(...)` | PG dùng CREATE TYPE |

### 3.3. Bảng ánh xạ cú pháp SQL

| Chức năng | MySQL | PostgreSQL |
|-----------|-------|-----------|
| Auto increment | `AUTO_INCREMENT` | `SERIAL` / `GENERATED ALWAYS AS IDENTITY` |
| Current datetime | `NOW()` | `NOW()` ✅ Giống |
| Date subtraction | `DATE_SUB(NOW(), INTERVAL 20 MINUTE)` | `NOW() - INTERVAL '20 minutes'` |
| Date addition | `DATE_ADD(NOW(), INTERVAL 24 HOUR)` | `NOW() + INTERVAL '24 hours'` |
| Unix timestamp → Date | `FROM_UNIXTIME(ts)` | `TO_TIMESTAMP(ts)` |
| Cast to unsigned int | `CAST(x AS UNSIGNED)` | `CAST(x AS BIGINT)` |
| String concat | `CONCAT(a, ' ', b)` | `a \|\| ' ' \|\| b` hoặc `CONCAT()` ✅ |
| Get lock | `GET_LOCK('name', timeout)` | `pg_try_advisory_lock(key)` |
| Release lock | `RELEASE_LOCK('name')` | `pg_advisory_unlock(key)` |
| Session timezone | `@@session.time_zone` | `current_setting('TIMEZONE')` |
| Set timezone | `SET time_zone = '+07:00'` | `SET timezone TO 'Asia/Ho_Chi_Minh'` |
| Lock timeout | `SET SESSION innodb_lock_wait_timeout=5` | `SET LOCAL lock_timeout = '5s'` |
| Deadlock errno | `1213` (ER_LOCK_DEADLOCK) | `40P01` (deadlock_detected) |
| Lock timeout errno | `1205` (ER_LOCK_WAIT_TIMEOUT) | `55P03` (lock_not_available) |
| Limit | `LIMIT n` | `LIMIT n` ✅ Giống |
| Case-sensitive compare | Depends on collation | Always case-sensitive |
| Boolean values | `0` / `1` | `false` / `true` |
| IF function | `IF(cond, a, b)` | `CASE WHEN cond THEN a ELSE b END` |
| IFNULL | `IFNULL(a, b)` | `COALESCE(a, b)` |
| Health check | `mysqladmin ping` | `pg_isready` |

---

## 4. CHIẾN LƯỢC CHUYỂN ĐỔI

### 4.1. Phương pháp: "Switch-Over" (Chuyển đổi trực tiếp)

Do hệ thống **chưa deploy production** và đang trong giai đoạn development, ta áp dụng phương pháp **Switch-Over** — thay thế trực tiếp MySQL bằng PostgreSQL:

```
┌─────────────────────────────────────────────────────────────────┐
│                    CHIẾN LƯỢC CHUYỂN ĐỔI                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Phase 1: CHUẨN BỊ (0.5 ngày)                                 │
│  ├── Backup toàn bộ MySQL data                                 │
│  ├── Tạo branch git mới: feature/migrate-postgresql            │
│  └── Cài đặt PostgreSQL local + tools                          │
│                                                                 │
│  Phase 2: CHUYỂN ĐỔI CODE (1.5 ngày)                          │
│  ├── Thay đổi dependencies (mysql2 → pg + pg-hstore)           │
│  ├── Cập nhật cấu hình (.env, config.json)                     │
│  ├── Sửa raw SQL queries (14 điểm critical)                    │
│  ├── Cập nhật Sequelize connection (models/index.js)            │
│  └── Cập nhật Docker Compose                                   │
│                                                                 │
│  Phase 3: DI TRÚ DỮ LIỆU (0.5 ngày)                          │
│  ├── Export MySQL data → SQL/CSV                                │
│  ├── Tạo database PostgreSQL                                    │
│  ├── Sequelize sync tạo schema                                  │
│  └── Import data (seeder hoặc pgloader)                         │
│                                                                 │
│  Phase 4: KIỂM THỬ (1 ngày)                                   │
│  ├── Smoke test toàn bộ API endpoints (48 endpoints)            │
│  ├── Test Booking State Machine (S1→S1.5→S2→S3/S4)             │
│  ├── Test VNPay payment flow                                    │
│  ├── Test AI Chatbot                                            │
│  ├── Test Docker Compose                                        │
│  └── Regression test giao diện                                  │
│                                                                 │
│  Phase 5: HOÀN THIỆN (0.5 ngày)                                │
│  ├── Cập nhật documentation                                     │
│  ├── Merge branch vào develop                                   │
│  └── Cleanup MySQL artifacts                                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2. Nguyên tắc chuyển đổi

1. **Sequelize ORM là lớp trừu tượng chính** — Phần lớn code sử dụng Sequelize methods (`findOne`, `findAll`, `create`, `update`, `destroy`) → **KHÔNG CẦN SỬA**.

2. **Chỉ sửa raw SQL** — Tập trung vào 14 điểm critical đã audit ở mục 2.4.

3. **Không thay đổi business logic** — Chỉ thay đổi tầng data access, KHÔNG sửa logic nghiệp vụ.

4. **Backward compatibility** — Giữ nguyên API contract (request/response format), frontend KHÔNG cần sửa.

5. **Git branch isolation** — Toàn bộ thay đổi trên branch riêng, có thể rollback bất cứ lúc nào.

---

## 5. KẾ HOẠCH THỰC HIỆN CHI TIẾT

### Phase 1: Chuẩn bị (0.5 ngày)

#### Task 1.1: Backup dữ liệu MySQL hiện tại

```bash
# Export toàn bộ database MySQL
mysqldump -u root bookingcare > backup_mysql_$(date +%Y%m%d).sql

# Hoặc nếu dùng Docker
docker exec db-mysql mysqldump -u root -pStrongRootP@ss2026 bookingcare > backup_mysql.sql
```

#### Task 1.2: Tạo branch Git

```bash
# Tạo branch mới từ develop
git checkout develop
git checkout -b feature/migrate-postgresql

# Commit message convention
# feat(db): migrate from MySQL to PostgreSQL
```

#### Task 1.3: Cài đặt PostgreSQL local (Development)

**Option A: Cài trực tiếp trên Windows**
```powershell
# Download PostgreSQL 16 từ https://www.postgresql.org/download/windows/
# Cài đặt với pgAdmin 4
# Default port: 5432
```

**Option B: Sử dụng Docker (Khuyến nghị)**
```bash
docker run -d \
  --name pg-bookingcare-dev \
  -e POSTGRES_DB=bookingcare \
  -e POSTGRES_USER=bookingcare_user \
  -e POSTGRES_PASSWORD=StrongPgP@ss2026 \
  -p 5432:5432 \
  postgres:16-alpine
```

---

### Phase 2: Chuyển đổi Code (1.5 ngày)

#### Task 2.1: Cập nhật Dependencies

```bash
cd bookingcare-backend

# Gỡ MySQL driver
npm uninstall mysql2

# Cài PostgreSQL driver cho Sequelize
npm install pg pg-hstore
```

**Kết quả `package.json`:**
```diff
  "dependencies": {
-   "mysql2": "^3.19.1",
+   "pg": "^8.13.1",
+   "pg-hstore": "^2.3.4",
    "sequelize": "^6.37.7",
    ...
  }
```

#### Task 2.2: Cập nhật file `.env`

```diff
  # Database
  DB_HOST=localhost
- DB_USERNAME=root
- DB_PASSWORD=
+ DB_USERNAME=bookingcare_user
+ DB_PASSWORD=StrongPgP@ss2026
  DB_NAME=bookingcare
- DB_PORT=3306
- DB_DIALECT=mysql
+ DB_PORT=5432
+ DB_DIALECT=postgres
```

#### Task 2.3: Cập nhật file `src/config/config.json`

```diff
  {
    "development": {
-     "username": "root",
-     "password": null,
+     "username": "bookingcare_user",
+     "password": "StrongPgP@ss2026",
      "database": "bookingcare",
      "host": "127.0.0.1",
-     "dialect": "mysql",
+     "dialect": "postgres",
      "logging": false
    },
    "test": {
-     "username": "root",
-     "password": null,
+     "username": "bookingcare_user",
+     "password": "StrongPgP@ss2026",
      "database": "bookingcare_test",
      "host": "127.0.0.1",
-     "dialect": "mysql"
+     "dialect": "postgres"
    },
    "production": {
-     "username": "root",
-     "password": null,
+     "username": "bookingcare_user",
+     "password": null,
      "database": "bookingcare_production",
      "host": "127.0.0.1",
-     "dialect": "mysql"
+     "dialect": "postgres"
    }
  }
```

#### Task 2.4: Cập nhật `src/models/index.js` — Sequelize Connection

**Thay đổi chi tiết:**

```diff
  const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USERNAME,
    process.env.DB_PASSWORD,
    {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      dialect: process.env.DB_DIALECT,
      logging: false,

-     // [Phase 13 — Blueprint PK8.4] Enterprise Connection Pool Hardening
-     // Công thức: Sequelize_Max_Pool = (MySQL_Max_Connections - 30) / Total_Backend_Instances
-     // Trị số cứng: (150 - 30) / 1 = 120 kết nối tối đa
+     // [Phase 13 — Blueprint PK8.4] Enterprise Connection Pool Hardening
+     // PostgreSQL default max_connections = 100
+     // Công thức: Sequelize_Max_Pool = (PG_Max_Connections - 10) / Total_Backend_Instances
+     // Trị số cứng: (100 - 10) / 1 = 90 kết nối tối đa
      pool: {
-       max: 120,
+       max: 90,
        min: 10,
        idle: 10000,
        acquire: 5000
      },

-     // [Phase 10 — Zero Trust Timezone Lock] Khóa timezone tầng Sequelize
      timezone: '+07:00',
-     dialectOptions: {
-       connectTimeout: 5000,
-       useUTC: false,      // CHỐNG tự động convert về UTC
-       dateStrings: true,  // Trả date dạng string, không auto-parse
-       typeCast: true,
-     },
+     // [PostgreSQL Migration] Dialect options cho pg driver
+     dialectOptions: {
+       connectTimeout: 5000,
+       // SSL cho production (uncomment khi deploy)
+       // ssl: { rejectUnauthorized: false },
+     },

-     // [🔒 TZ-POOL-001 v2.0] Khóa timezone cho TẤT CẢ kết nối bằng Manual Promise
-     // ⚠️ KHÔNG dùng `async/await connection.query()` vì driver mysql2
-     //   sử dụng cơ chế Callback — `await` có thể resolve TRƯỚC KHI query thực sự hoàn tất.
-     // ✅ Dùng hooks.afterConnect + new Promise() — đảm bảo connection CHỈ được trả về pool
-     //   SAU KHI MySQL xác nhận SET time_zone thành công (callback được gọi).
+     // [🔒 TZ-POOL-001 v3.0 PostgreSQL] Khóa timezone cho TẤT CẢ kết nối
+     // PostgreSQL driver (pg) hỗ trợ async/await natively — dùng await trực tiếp.
      hooks: {
-       afterConnect: (connection) => {
-         return new Promise((resolve, reject) => {
-           connection.query("SET time_zone = '+07:00';", (err) => {
-             if (err) {
-               console.error('❌ [FATAL] Timezone Hook Failed:', err);
-               return reject(err);
-             }
-             resolve();
-           });
-         });
-       },
+       afterConnect: async (connection) => {
+         try {
+           await connection.query("SET timezone TO 'Asia/Ho_Chi_Minh';");
+         } catch (err) {
+           console.error('❌ [FATAL] Timezone Hook Failed:', err);
+           throw err; // Connection bị từ chối — không đưa vào pool
+         }
+       },
      },
    }
  );
```

#### Task 2.5: Cập nhật `src/server.js` — Boot Guard & Graceful Shutdown

**Thay đổi 1: Boot-Time Timezone Guard (L90-117)**

```diff
  async function checkSystemTimezoneEnforcement() {
    try {
-     console.log('[DEVSECOPS INIT] Launching boot-time database timezone verification now.');
+     console.log('[DEVSECOPS INIT] Launching boot-time PostgreSQL timezone verification now.');

      const results = await db.sequelize.query(
-       "SELECT @@session.time_zone AS tz;",
+       "SELECT current_setting('TIMEZONE') AS tz;",
        { type: db.Sequelize.QueryTypes.SELECT }
      );

      if (!results || results.length === 0) {
-       console.error('[FATAL ERROR] Unable to retrieve session timezone information from MySQL server during boot.');
+       console.error('[FATAL ERROR] Unable to retrieve session timezone information from PostgreSQL server during boot.');
        process.exit(1);
      }

      const systemTimezone = results[0].tz;

-     if (systemTimezone !== '+07:00') {
-       console.error(`[FATAL CRITICAL ERROR] Hardened Timezone Mismatch detected! MySQL Session TZ is '${systemTimezone}', expected '+07:00'. Halting system initialization immediately to prevent booking FSM data desync state between database layer and backend app engine.`);
+     if (systemTimezone !== 'Asia/Ho_Chi_Minh') {
+       console.error(`[FATAL CRITICAL ERROR] Hardened Timezone Mismatch detected! PostgreSQL Session TZ is '${systemTimezone}', expected 'Asia/Ho_Chi_Minh'. Halting system initialization immediately to prevent booking FSM data desync state between database layer and backend app engine.`);
        process.exit(1);
      }

-     console.log('[DEVSECOPS SUCCESS] MySQL Native Timezone Alignment confirmed at +07:00. System initialization approved.');
+     console.log('[DEVSECOPS SUCCESS] PostgreSQL Timezone Alignment confirmed at Asia/Ho_Chi_Minh (UTC+07). System initialization approved.');
    } catch (error) {
      console.error('[FATAL ERROR] Critical database handshake failure during boot timezone check validation loop:', error);
      process.exit(1);
    }
  }
```

**Thay đổi 2: Graceful Shutdown — Advisory Lock Release (L155-162)**

```diff
-     // Bước 5: Quét sạch rác khóa phân tán Advisory Lock đang mở ngầm tầng DB
-     console.log('[SHUTDOWN STEP 5] Releasing Advisory Lock cron_cleanup_s1 from MySQL engine.');
+     // Bước 5: Quét sạch rác khóa phân tán Advisory Lock đang mở ngầm tầng DB
+     console.log('[SHUTDOWN STEP 5] Releasing Advisory Lock cron_cleanup_s1 from PostgreSQL engine.');
      try {
-       await db.sequelize.query("SELECT RELEASE_LOCK('cron_cleanup_s1');");
+       await db.sequelize.query("SELECT pg_advisory_unlock(hashtext('cron_cleanup_s1'));");
        console.log('[SHUTDOWN STEP 5 SUCCESS] Advisory lock cron_cleanup_s1 successfully released.');
      } catch (lockErr) {
        console.log('[SHUTDOWN STEP 5 INFO] Advisory lock release skipped:', lockErr.message);
      }
```

#### Task 2.6: Cập nhật `src/controllers/paymentController.js`

**Thay đổi 1: InnoDB Lock Timeout → PostgreSQL Lock Timeout (L172)**

```diff
-     await db.sequelize.query('SET SESSION innodb_lock_wait_timeout=5', {
+     await db.sequelize.query("SET LOCAL lock_timeout = '5s'", {
        transaction: t,
      });
```

**Thay đổi 2: DATE_SUB với cutoff query (L221-230)**

```diff
        const cutoff = await db.sequelize.query(
-         `SELECT (createdAt<DATE_SUB(NOW(),INTERVAL 20 MINUTE)) AS isExpired
+         `SELECT (createdAt < NOW() - INTERVAL '20 minutes') AS "isExpired"
           FROM Bookings WHERE id=:id`,
          {
            replacements: { id: existing.id },
            type: Sequelize.QueryTypes.SELECT,
            plain: true,
            transaction: t,
          },
        );
-       if (!cutoff.isExpired) {
+       if (!cutoff.isExpired) {
```

> **Lưu ý:** PostgreSQL phân biệt chữ hoa/thường cho alias. Dùng `AS "isExpired"` (có dấu ngoặc kép) để giữ nguyên camelCase.

**Thay đổi 3: DATE_ADD cho receiptExpiredAt (L407-409)**

```diff
        booking.receiptExpiredAt = db.sequelize.literal(
-         'DATE_ADD(NOW(),INTERVAL 24 HOUR)',
+         "NOW() + INTERVAL '24 hours'",
        );
```

**Thay đổi 4: GET_LOCK cho Cronjob (L596-604)**

```diff
      const lockResult = await db.sequelize.query(
-       "SELECT GET_LOCK('cron_cleanup_s1', 30) AS acquired",
+       "SELECT pg_try_advisory_lock(hashtext('cron_cleanup_s1')) AS acquired",
        {
          type: Sequelize.QueryTypes.SELECT,
          plain: true,
-         options: { type: 'write' },
        },
      );
-     lockAcquired = lockResult.acquired === 1;
+     lockAcquired = lockResult.acquired === true;
```

**Thay đổi 5: DATE_SUB literal trong Sequelize where (L617, L628)**

```diff
        createdAt: {
-         [Op.lt]: db.sequelize.literal('DATE_SUB(NOW(), INTERVAL 20 MINUTE)'),
+         [Op.lt]: db.sequelize.literal("NOW() - INTERVAL '20 minutes'"),
        },
```

```diff
        updatedAt: {
-         [Op.lt]: db.sequelize.literal('DATE_SUB(NOW(), INTERVAL 20 MINUTE)'),
+         [Op.lt]: db.sequelize.literal("NOW() - INTERVAL '20 minutes'"),
        },
```

**Thay đổi 6: Reconcile matured check (L699-707)**

```diff
              const m = await db.sequelize.query(
-               `SELECT (reconcileFirstSeenAt < DATE_SUB(NOW(), INTERVAL 10 MINUTE)) AS ok
-              FROM Bookings WHERE id=:id`,
+               `SELECT (reconcileFirstSeenAt < NOW() - INTERVAL '10 minutes') AS ok
+                FROM "Bookings" WHERE id=:id`,
                {
                  replacements: { id: booking.id },
                  type: Sequelize.QueryTypes.SELECT,
                  plain: true,
                },
              );
```

**Thay đổi 7: DATE_ADD literal trong reconcile (L738-739)**

```diff
                  freshBooking.receiptExpiredAt = db.sequelize.literal(
-                   'DATE_ADD(NOW(), INTERVAL 24 HOUR)',
+                   "NOW() + INTERVAL '24 hours'",
                  );
```

**Thay đổi 8: Zombie check (L766-774)**

```diff
                const z = await db.sequelize.query(
-                 `SELECT (createdAt<DATE_SUB(NOW(),INTERVAL 24 HOUR)) AS isZ FROM Bookings WHERE id=:id`,
+                 `SELECT (createdAt < NOW() - INTERVAL '24 hours') AS "isZ" FROM "Bookings" WHERE id=:id`,
                  {
                    replacements: { id: freshBooking.id },
                    type: Sequelize.QueryTypes.SELECT,
                    plain: true,
                    transaction: t,
                  },
                );
-               if (z.isZ) zombies++;
+               if (z.isZ) zombies++;
```

**Thay đổi 9: Deadlock error codes (L785)**

```diff
-             if ([1213, 1205].includes(err.parent?.errno) && retries < 2) {
+             if (['40P01', '55P03'].includes(err.parent?.code) && retries < 2) {
```

> **Giải thích:** MySQL dùng numeric `errno` (1213 = deadlock, 1205 = lock wait timeout), PostgreSQL dùng string `code` theo SQLSTATE (40P01 = deadlock_detected, 55P03 = lock_not_available).

**Thay đổi 10: RELEASE_LOCK cuối cleanupS1 (L798-801)**

```diff
      if (lockAcquired)
        await db.sequelize
-         .query("SELECT RELEASE_LOCK('cron_cleanup_s1')")
+         .query("SELECT pg_advisory_unlock(hashtext('cron_cleanup_s1'))")
          .catch(() => {});
```

#### Task 2.7: Cập nhật `src/services/statisticService.js`

**Toàn bộ file cần cập nhật raw SQL:**

```diff
  // [CODEX AUDIT FIX] Sequelize đã set timezone: '+07:00' trong models/index.js
- // => MySQL session tự hiểu +07:00 => KHÔNG CẦN CONVERT_TZ trong Raw Query.
- // => Chỉ cần FROM_UNIXTIME đơn giản.
+ // => PostgreSQL session timezone = 'Asia/Ho_Chi_Minh' (UTC+07).
+ // => Dùng TO_TIMESTAMP thay FROM_UNIXTIME.
```

**1. getOverviewStatistics — CAST(date AS UNSIGNED) → CAST(date AS BIGINT)**

```diff
    const [bookingResult] = await db.sequelize.query(
-     `SELECT COUNT(*) AS totalBookings FROM Bookings
-      WHERE CAST(date AS UNSIGNED) >= :from AND CAST(date AS UNSIGNED) <= :to`,
+     `SELECT COUNT(*) AS "totalBookings" FROM "Bookings"
+      WHERE CAST(date AS BIGINT) >= :from AND CAST(date AS BIGINT) <= :to`,
      { replacements: { from: fromStr, to: toStr }, type: db.sequelize.QueryTypes.SELECT }
    );

    const [doctorResult] = await db.sequelize.query(
-     `SELECT COUNT(DISTINCT doctorId) AS totalDoctors FROM Schedules
-      WHERE CAST(date AS UNSIGNED) >= :from AND CAST(date AS UNSIGNED) <= :to`,
+     `SELECT COUNT(DISTINCT "doctorId") AS "totalDoctors" FROM "Schedules"
+      WHERE CAST(date AS BIGINT) >= :from AND CAST(date AS BIGINT) <= :to`,
      { replacements: { from: fromStr, to: toStr }, type: db.sequelize.QueryTypes.SELECT }
    );

    const [patientResult] = await db.sequelize.query(
-     `SELECT COUNT(DISTINCT patientId) AS totalPatients FROM Bookings
-      WHERE CAST(date AS UNSIGNED) >= :from AND CAST(date AS UNSIGNED) <= :to`,
+     `SELECT COUNT(DISTINCT "patientId") AS "totalPatients" FROM "Bookings"
+      WHERE CAST(date AS BIGINT) >= :from AND CAST(date AS BIGINT) <= :to`,
      { replacements: { from: fromStr, to: toStr }, type: db.sequelize.QueryTypes.SELECT }
    );

    const [revenueResult] = await db.sequelize.query(
-     `SELECT COUNT(*) AS completedBookings FROM Bookings
-      WHERE statusId = 'S3'
-        AND CAST(date AS UNSIGNED) >= :from AND CAST(date AS UNSIGNED) <= :to`,
+     `SELECT COUNT(*) AS "completedBookings" FROM "Bookings"
+      WHERE "statusId" = 'S3'
+        AND CAST(date AS BIGINT) >= :from AND CAST(date AS BIGINT) <= :to`,
      { replacements: { from: fromStr, to: toStr }, type: db.sequelize.QueryTypes.SELECT }
    );
```

**2. getBookingsByDay — FROM_UNIXTIME → TO_TIMESTAMP**

```diff
    const results = await db.sequelize.query(
      `SELECT
-        DATE(FROM_UNIXTIME(CAST(date AS UNSIGNED) / 1000)) AS bookingDate,
+        DATE(TO_TIMESTAMP(CAST(date AS BIGINT) / 1000)) AS "bookingDate",
         COUNT(*) AS count
-      FROM Bookings
-      WHERE CAST(date AS UNSIGNED) >= :from AND CAST(date AS UNSIGNED) <= :to
-      GROUP BY bookingDate
-      ORDER BY bookingDate ASC`,
+      FROM "Bookings"
+      WHERE CAST(date AS BIGINT) >= :from AND CAST(date AS BIGINT) <= :to
+      GROUP BY "bookingDate"
+      ORDER BY "bookingDate" ASC`,
      { replacements: { from: fromStr, to: toStr }, type: db.sequelize.QueryTypes.SELECT }
    );
```

**3. getBookingsByStatus**

```diff
    const results = await db.sequelize.query(
-     `SELECT b.statusId, a.valueVi AS statusNameVi, a.valueEn AS statusNameEn, COUNT(*) AS count
-      FROM Bookings b
-      LEFT JOIN Allcodes a ON b.statusId = a.keyMap AND a.type = 'STATUS'
-      WHERE CAST(b.date AS UNSIGNED) >= :from AND CAST(b.date AS UNSIGNED) <= :to
-      GROUP BY b.statusId, a.valueVi, a.valueEn
+     `SELECT b."statusId", a."valueVi" AS "statusNameVi", a."valueEn" AS "statusNameEn", COUNT(*) AS count
+      FROM "Bookings" b
+      LEFT JOIN "Allcodes" a ON b."statusId" = a."keyMap" AND a.type = 'STATUS'
+      WHERE CAST(b.date AS BIGINT) >= :from AND CAST(b.date AS BIGINT) <= :to
+      GROUP BY b."statusId", a."valueVi", a."valueEn"
       ORDER BY count DESC`,
      { replacements: { from: fromStr, to: toStr }, type: db.sequelize.QueryTypes.SELECT }
    );
```

**4. getTopSpecialties**

```diff
    const results = await db.sequelize.query(
-     `SELECT s.name AS specialtyName, COUNT(*) AS count
-      FROM Bookings b
-      INNER JOIN Doctor_Infos di ON b.doctorId = di.doctorId
-      INNER JOIN Specialties s ON di.specialtyId = s.id
-      WHERE CAST(b.date AS UNSIGNED) >= :from AND CAST(b.date AS UNSIGNED) <= :to
+     `SELECT s.name AS "specialtyName", COUNT(*) AS count
+      FROM "Bookings" b
+      INNER JOIN "Doctor_Infos" di ON b."doctorId" = di."doctorId"
+      INNER JOIN "Specialties" s ON di."specialtyId" = s.id
+      WHERE CAST(b.date AS BIGINT) >= :from AND CAST(b.date AS BIGINT) <= :to
       GROUP BY s.id, s.name
       ORDER BY count DESC
       LIMIT :limit`,
      { replacements: { from: fromStr, to: toStr, limit }, type: db.sequelize.QueryTypes.SELECT }
    );
```

**5. getTopDoctors**

```diff
    const results = await db.sequelize.query(
-     `SELECT u.id AS doctorId, CONCAT(u.lastName, ' ', u.firstName) AS doctorName, COUNT(*) AS count
-      FROM Bookings b
-      INNER JOIN Users u ON b.doctorId = u.id
-      WHERE CAST(b.date AS UNSIGNED) >= :from AND CAST(b.date AS UNSIGNED) <= :to
-      GROUP BY u.id, u.lastName, u.firstName
+     `SELECT u.id AS "doctorId", CONCAT(u."lastName", ' ', u."firstName") AS "doctorName", COUNT(*) AS count
+      FROM "Bookings" b
+      INNER JOIN "Users" u ON b."doctorId" = u.id
+      WHERE CAST(b.date AS BIGINT) >= :from AND CAST(b.date AS BIGINT) <= :to
+      GROUP BY u.id, u."lastName", u."firstName"
       ORDER BY count DESC
       LIMIT :limit`,
      { replacements: { from: fromStr, to: toStr, limit }, type: db.sequelize.QueryTypes.SELECT }
    );
```

> **Lưu ý quan trọng:** PostgreSQL phân biệt chữ hoa/thường cho tên bảng và cột. Sequelize tạo tên bảng với chữ hoa đầu (ví dụ: `Bookings`, `Users`). Trong raw SQL cần bọc bằng dấu ngoặc kép `"Bookings"` để PostgreSQL không tự chuyển sang lowercase.

#### Task 2.8: Cập nhật `src/utils/convertBlobToBase64.js`

```diff
- // ✅ [FIX-IMAGE v2] Utility: Convert MySQL BLOB → base64 string an toàn
+ // ✅ [FIX-IMAGE v3] Utility: Convert PostgreSQL BYTEA → base64 string an toàn
  ...
- * Convert BLOB/Buffer từ MySQL → pure base64 string.
+ * Convert BYTEA/Buffer từ PostgreSQL → pure base64 string.
```

#### Task 2.9: Cập nhật `src/utils/stripBase64Prefix.js`

```diff
- // trước khi lưu vào MySQL BLOB — tránh Double-Encoding bug
+ // trước khi lưu vào PostgreSQL BYTEA — tránh Double-Encoding bug
```

#### Task 2.10: Cập nhật `docker-compose.yml`

```diff
  volumes:
-   mysql_data:
+   postgres_data:
      driver: local
    redis_data:
      driver: local
    backend_uploads:
      driver: local

  services:
-   # TẦNG DỮ LIỆU: Hệ quản trị cơ sở dữ liệu MySQL 8.0 Core
-   db-mysql:
-     image: mysql:8.0
-     container_name: db-mysql
+   # TẦNG DỮ LIỆU: Hệ quản trị cơ sở dữ liệu PostgreSQL 16
+   db-postgres:
+     image: postgres:16-alpine
+     container_name: db-postgres
      restart: always
      environment:
-       TZ: UTC
-       MYSQL_DATABASE: bookingcare
-       MYSQL_USER: bookingcare_user
-       MYSQL_ROOT_PASSWORD: StrongRootP@ss2026
-       MYSQL_PASSWORD: StrongRootP@ss2026
-     env_file:
-       - .env
-     command: >
-       --default-authentication-plugin=mysql_native_password
-       --default-time-zone=+00:00
-       --table_open_cache=2000
-       --table_definition_cache=2000
-       --max_connections=150
-       --innodb_buffer_pool_size=256M
-       --lower-case-table-names=0
-       --character-set-server=utf8mb4
-       --collation-server=utf8mb4_unicode_ci
+       TZ: Asia/Ho_Chi_Minh
+       POSTGRES_DB: bookingcare
+       POSTGRES_USER: bookingcare_user
+       POSTGRES_PASSWORD: StrongPgP@ss2026
+       PGTZ: Asia/Ho_Chi_Minh
+     command: >
+       postgres
+       -c max_connections=100
+       -c shared_buffers=256MB
+       -c effective_cache_size=512MB
+       -c work_mem=4MB
+       -c maintenance_work_mem=64MB
+       -c timezone=Asia/Ho_Chi_Minh
+       -c log_timezone=Asia/Ho_Chi_Minh
+       -c lc_messages=en_US.UTF-8
      volumes:
-       - mysql_data:/var/lib/mysql
-       - /dev/urandom:/dev/urandom:ro
+       - postgres_data:/var/lib/postgresql/data
      networks:
        - backend-net
      ports:
-       - "3306:3306"
+       - "5432:5432"
      deploy:
        resources:
          limits:
            cpus: '1.0'
            memory: 1024M
-     ulimits:
-       nofile:
-         soft: 65536
-         hard: 65536
      logging:
        driver: "json-file"
        options:
          max-size: "10m"
          max-file: "3"
      healthcheck:
-       test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "root", "-p$$MYSQL_ROOT_PASSWORD"]
+       test: ["CMD-SHELL", "pg_isready -U bookingcare_user -d bookingcare"]
        interval: 10s
        timeout: 5s
        retries: 3

    # app-backend service
    app-backend:
      ...
      environment:
        TZ: Asia/Ho_Chi_Minh
        NODE_OPTIONS: "--max-old-space-size=1024"
-       DB_HOST: db-mysql
+       DB_HOST: db-postgres
+       DB_DIALECT: postgres
+       DB_PORT: 5432
+       DB_USERNAME: bookingcare_user
+       DB_PASSWORD: StrongPgP@ss2026
        REDIS_HOST: redis-cache
        ...
      depends_on:
-       db-mysql:
+       db-postgres:
          condition: service_healthy
        redis-cache:
          condition: service_healthy
```

---

### Phase 3: Di trú dữ liệu (0.5 ngày)

#### Task 3.1: Sử dụng Sequelize sync (Khuyến nghị cho Development)

Vì hệ thống dùng `sequelize.sync({ alter: true })`, chỉ cần:

1. Tạo database PostgreSQL trống
2. Khởi động backend → Sequelize tự tạo schema
3. Chạy seeder để nạp dữ liệu mẫu

```bash
# 1. Tạo database (nếu chưa tạo bằng Docker env vars)
psql -U bookingcare_user -h localhost -c "CREATE DATABASE bookingcare;"

# 2. Khởi động backend
npm run dev
# → Sequelize auto-sync tạo toàn bộ 9 bảng

# 3. Chạy seeder
npm run seed
```

#### Task 3.2: Di trú dữ liệu hiện có (Nếu cần giữ data)

**Option A: Sử dụng pgloader (Tự động)**

```bash
# Cài pgloader
sudo apt install pgloader

# Tạo file migration.load
cat > migration.load << 'EOF'
LOAD DATABASE
  FROM mysql://root@localhost/bookingcare
  INTO postgresql://bookingcare_user:StrongPgP@ss2026@localhost/bookingcare

WITH include drop, create tables, create indexes, reset sequences,
     workers = 4, concurrency = 2

SET maintenance_work_mem to '128MB',
    work_mem to '12MB'

CAST type datetime to timestamp using zero-dates-to-null,
     type date to date using zero-dates-to-null,
     type tinyint to boolean using tinyint-to-boolean,
     type longblob to bytea

ALTER SCHEMA 'bookingcare' RENAME TO 'public';
EOF

# Chạy migration
pgloader migration.load
```

**Option B: Export/Import thủ công (CSV)**

```bash
# Export từ MySQL
mysql -u root bookingcare -e "SELECT * FROM Users" > users.csv
mysql -u root bookingcare -e "SELECT * FROM Allcodes" > allcodes.csv
# ... lặp lại cho mỗi bảng

# Import vào PostgreSQL
psql -U bookingcare_user -d bookingcare -c "\COPY \"Users\" FROM 'users.csv' WITH CSV HEADER"
psql -U bookingcare_user -d bookingcare -c "\COPY \"Allcodes\" FROM 'allcodes.csv' WITH CSV HEADER"
# ... lặp lại cho mỗi bảng
```

**Option C: Sequelize Seeder (Khuyến nghị — đã có sẵn)**

```bash
# Sử dụng seeder hiện tại
npm run seed
# → Nạp lại Allcodes + dữ liệu mẫu
```

#### Task 3.3: Verify schema sau di trú

```sql
-- Kiểm tra danh sách bảng
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- Kiểm tra cấu trúc bảng Users
\d "Users"

-- Kiểm tra indexes
SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = 'public';

-- Kiểm tra sequences (auto-increment)
SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public';

-- Đếm records
SELECT
  (SELECT COUNT(*) FROM "Users") AS users_count,
  (SELECT COUNT(*) FROM "Allcodes") AS allcodes_count,
  (SELECT COUNT(*) FROM "Specialties") AS specialties_count,
  (SELECT COUNT(*) FROM "Clinics") AS clinics_count;
```

---

### Phase 4: Kiểm thử (1 ngày)

> Xem chi tiết tại [Mục 8: Kế hoạch kiểm thử](#8-kế-hoạch-kiểm-thử)

---

### Phase 5: Hoàn thiện (0.5 ngày)

#### Task 5.1: Cập nhật README & Documentation

- Cập nhật `README.md` (Tech Stack: MySQL → PostgreSQL)
- Cập nhật `.env.example`
- Cập nhật hướng dẫn cài đặt

#### Task 5.2: Cleanup

```bash
# Xóa MySQL data volume (nếu dùng Docker)
docker volume rm mysql_data

# Verify package.json không còn mysql2
npm ls mysql2  # Should return "empty"
```

#### Task 5.3: Git commit & merge

```bash
git add -A
git commit -m "feat(db): migrate from MySQL 8.0 to PostgreSQL 16

- Replace mysql2 driver with pg + pg-hstore
- Update Sequelize dialect and connection config
- Convert 14 MySQL-specific raw SQL queries to PostgreSQL syntax
- Update Docker Compose: db-mysql → db-postgres (alpine)
- Convert advisory locks: GET_LOCK → pg_advisory_lock
- Convert timezone handling: SET time_zone → SET timezone
- Convert date functions: FROM_UNIXTIME → TO_TIMESTAMP
- Convert deadlock error codes: errno 1213/1205 → SQLSTATE 40P01/55P03
- Update all comments and log messages
- Tested: All 48 API endpoints pass
- Tested: Booking State Machine (S1→S1.5→S2→S3/S4)
- Tested: Docker Compose full stack"

git push origin feature/migrate-postgresql
# → Tạo Pull Request → Code Review → Merge
```

---

## 6. MAPPING CÚ PHÁP MySQL → PostgreSQL

### 6.1. Tổng hợp tất cả thay đổi raw SQL

| # | Vị trí | MySQL (Trước) | PostgreSQL (Sau) | Loại |
|---|--------|---------------|------------------|------|
| 1 | models/index.js | `SET time_zone = '+07:00'` | `SET timezone TO 'Asia/Ho_Chi_Minh'` | DDL |
| 2 | models/index.js | `dialectOptions: { useUTC, dateStrings, typeCast }` | `dialectOptions: { connectTimeout }` | Config |
| 3 | server.js | `SELECT @@session.time_zone AS tz` | `SELECT current_setting('TIMEZONE') AS tz` | Query |
| 4 | server.js | `RELEASE_LOCK('x')` | `pg_advisory_unlock(hashtext('x'))` | Function |
| 5 | paymentController.js | `SET SESSION innodb_lock_wait_timeout=5` | `SET LOCAL lock_timeout = '5s'` | DDL |
| 6 | paymentController.js ×5 | `DATE_SUB(NOW(), INTERVAL n UNIT)` | `NOW() - INTERVAL 'n units'` | Function |
| 7 | paymentController.js ×2 | `DATE_ADD(NOW(), INTERVAL n UNIT)` | `NOW() + INTERVAL 'n units'` | Function |
| 8 | paymentController.js | `GET_LOCK('x', 30)` | `pg_try_advisory_lock(hashtext('x'))` | Function |
| 9 | paymentController.js | `RELEASE_LOCK('x')` | `pg_advisory_unlock(hashtext('x'))` | Function |
| 10 | paymentController.js | `errno 1213/1205` | `code '40P01'/'55P03'` | Error |
| 11 | statisticService.js ×7 | `CAST(date AS UNSIGNED)` | `CAST(date AS BIGINT)` | Cast |
| 12 | statisticService.js | `FROM_UNIXTIME(ts / 1000)` | `TO_TIMESTAMP(ts / 1000)` | Function |
| 13 | statisticService.js | Unquoted table/column names | Quoted `"TableName"."columnName"` | Syntax |

### 6.2. Cheatsheet nhanh

```
╔═══════════════════════════════════════════════════════════════════╗
║               MYSQL → POSTGRESQL CHEATSHEET                      ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  DATETIME FUNCTIONS:                                              ║
║  ─────────────────────────────────────────────────────────────── ║
║  NOW()                    → NOW()                    (giống)     ║
║  DATE_SUB(x, INTERVAL n) → x - INTERVAL 'n'                     ║
║  DATE_ADD(x, INTERVAL n) → x + INTERVAL 'n'                     ║
║  FROM_UNIXTIME(ts)        → TO_TIMESTAMP(ts)                     ║
║  UNIX_TIMESTAMP(d)        → EXTRACT(EPOCH FROM d)                ║
║                                                                   ║
║  TYPE CASTING:                                                    ║
║  ─────────────────────────────────────────────────────────────── ║
║  CAST(x AS UNSIGNED)      → CAST(x AS BIGINT)                   ║
║  CAST(x AS SIGNED)        → CAST(x AS INTEGER)                  ║
║  BLOB('long')             → BYTEA  (Sequelize tự map)           ║
║                                                                   ║
║  ADVISORY LOCKS:                                                  ║
║  ─────────────────────────────────────────────────────────────── ║
║  GET_LOCK('n', t)         → pg_try_advisory_lock(hashtext('n')) ║
║  RELEASE_LOCK('n')        → pg_advisory_unlock(hashtext('n'))   ║
║                                                                   ║
║  SESSION VARIABLES:                                               ║
║  ─────────────────────────────────────────────────────────────── ║
║  @@session.time_zone      → current_setting('TIMEZONE')          ║
║  SET time_zone = x        → SET timezone TO x                    ║
║  innodb_lock_wait_timeout → lock_timeout                         ║
║                                                                   ║
║  ERROR CODES:                                                     ║
║  ─────────────────────────────────────────────────────────────── ║
║  errno 1213 (deadlock)    → SQLSTATE '40P01'                     ║
║  errno 1205 (lock wait)   → SQLSTATE '55P03'                    ║
║                                                                   ║
║  NAMING CONVENTION:                                               ║
║  ─────────────────────────────────────────────────────────────── ║
║  MySQL: case-insensitive  → PG: case-sensitive                   ║
║  Table: Bookings          → "Bookings" (phải có dấu ngoặc kép)  ║
║  Column: statusId         → "statusId" (trong raw SQL)           ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
```

---

## 7. THAY ĐỔI TỪNG FILE CHI TIẾT

### 7.1. Tổng hợp files cần thay đổi

| # | File | Số thay đổi | Mức độ | Loại |
|---|------|-------------|--------|------|
| 1 | `package.json` | 3 (remove mysql2, add pg, pg-hstore) | 🟢 Đơn giản | Dependencies |
| 2 | `.env` | 4 (host, port, dialect, credentials) | 🟢 Đơn giản | Config |
| 3 | `.env.example` | 4 | 🟢 Đơn giản | Config |
| 4 | `src/config/config.json` | 9 (3 environments × 3 fields) | 🟢 Đơn giản | Config |
| 5 | `src/models/index.js` | 5 (pool, dialectOptions, hooks, comments) | 🟡 Trung bình | Connection |
| 6 | `src/server.js` | 4 (timezone check, advisory lock, logs) | 🟡 Trung bình | Boot/Shutdown |
| 7 | `src/controllers/paymentController.js` | 12 (raw SQL, error codes, locks) | 🔴 Phức tạp | Business logic |
| 8 | `src/services/statisticService.js` | 8 (raw SQL queries) | 🔴 Phức tạp | Raw SQL |
| 9 | `src/utils/convertBlobToBase64.js` | 2 (comments only) | 🟢 Đơn giản | Comments |
| 10 | `src/utils/stripBase64Prefix.js` | 1 (comment only) | 🟢 Đơn giản | Comments |
| 11 | `docker-compose.yml` | 20+ (service, volumes, env, healthcheck) | 🟡 Trung bình | Infrastructure |

**Tổng: 11 files, ~70 điểm thay đổi**

### 7.2. Files KHÔNG cần thay đổi

| # | File/Folder | Lý do |
|---|-------------|-------|
| 1 | `src/models/user.js` | Sequelize ORM tự map types |
| 2 | `src/models/booking.js` | Sequelize ORM tự map types |
| 3 | `src/models/schedule.js` | Sequelize ORM tự map types |
| 4 | `src/models/allcode.js` | Sequelize ORM tự map types |
| 5 | `src/models/doctor_info.js` | Sequelize ORM tự map types |
| 6 | `src/models/specialty.js` | Sequelize ORM tự map types |
| 7 | `src/models/clinic.js` | Sequelize ORM tự map types |
| 8 | `src/models/review.js` | Sequelize ORM tự map types |
| 9 | `src/models/token.js` | Sequelize ORM tự map types |
| 10 | `src/routes/web.js` | Không có MySQL-specific code |
| 11 | `src/controllers/*.js` (trừ paymentController) | Sử dụng Sequelize methods |
| 12 | `src/services/*.js` (trừ statisticService) | Sử dụng Sequelize methods |
| 13 | `src/middleware/*.js` | Không có MySQL-specific code |
| 14 | `src/seeders/*.js` | Sử dụng Sequelize methods |
| 15 | **Toàn bộ Frontend** | Không kết nối trực tiếp DB |

> **Lợi thế lớn nhất của Sequelize ORM:** 15/26 source files (58%) **KHÔNG CẦN SỬA** vì ORM trừu tượng hóa tầng database.

---

## 8. KẾ HOẠCH KIỂM THỬ

### 8.1. Smoke Test — API Endpoints (48 endpoints)

#### 8.1.1. Auth Module (5 endpoints)

| # | Method | Endpoint | Test case | Expected |
|---|--------|----------|-----------|----------|
| 1 | POST | `/api/v1/login` | Đăng nhập đúng email/password | 200 + JWT token |
| 2 | POST | `/api/v1/register` | Đăng ký user mới | 200 + tạo user |
| 3 | POST | `/api/v1/forgot-password` | Gửi email reset password | 200 + email sent |
| 4 | POST | `/api/v1/reset-password` | Đặt lại mật khẩu | 200 + password changed |
| 5 | POST | `/api/v1/change-password` | Đổi mật khẩu | 200 + tokenVersion++ |

#### 8.1.2. Booking Module (Critical — nhiều raw SQL)

| # | Method | Endpoint | Test case | Expected |
|---|--------|----------|-----------|----------|
| 1 | POST | `/api/v1/patient/booking` | Tạo booking mới | S1 → gửi email verify |
| 2 | POST | `/api/v1/verify-booking` | Verify booking email | S1 → S1.5 |
| 3 | POST | `/api/v1/payment/create-payment-url` | Tạo VNPay URL | 200 + vnpay URL |
| 4 | GET | `/api/v1/payment/vnpay-ipn` | VNPay IPN callback (success) | S1.5 → S2 |
| 5 | GET | `/api/v1/payment/vnpay-ipn` | VNPay IPN callback (fail) | S1.5 → S4 |
| 6 | POST | `/api/v1/cron/cleanup-s1` | Cronjob cleanup S1 expired | Advisory lock + process |

#### 8.1.3. Statistics Module (Critical — tất cả raw SQL)

| # | Method | Endpoint | Test case | Expected |
|---|--------|----------|-----------|----------|
| 1 | GET | `/api/v1/statistics/overview` | Overview KPI | 4 numbers |
| 2 | GET | `/api/v1/statistics/bookings-by-day` | Bookings theo ngày | Array of {date, count} |
| 3 | GET | `/api/v1/statistics/bookings-by-status` | Bookings theo status | Array of {status, count} |
| 4 | GET | `/api/v1/statistics/top-specialties` | Top chuyên khoa | Array of {name, count} |
| 5 | GET | `/api/v1/statistics/top-doctors` | Top bác sĩ | Array of {name, count} |

#### 8.1.4. Các module khác (dùng Sequelize ORM — rủi ro thấp)

- Doctor, Patient, Specialty, Clinic, Schedule, Search, AI, Review — Verify hoạt động bình thường

### 8.2. Integration Test — Booking State Machine

```
Test Flow 1: Happy Path
S1 (Mới) → Email Verify → S1.5 (Chờ TT) → VNPay Success → S2 (Xác nhận) → Doctor gửi KQ → S3 (Hoàn thành)

Test Flow 2: Payment Failure
S1 → S1.5 → VNPay Fail → S4 (Đã hủy) + nhả slot

Test Flow 3: Auto-cancel (Cronjob)
S1 (tạo >20 phút) → cleanupS1 → S4 (Đã hủy)
S1.5 (verify >20 phút, chưa thanh toán) → cleanupS1 → S4 + nhả slot

Test Flow 4: Concurrent booking (Race condition)
2 request đồng thời đặt cùng slot → 1 thành công, 1 bị reject
```

### 8.3. Docker Compose Test

```bash
# Build và khởi động toàn bộ stack
docker compose build --no-cache
docker compose up -d

# Verify health checks
docker compose ps
# Tất cả 4 services phải ở trạng thái "healthy"

# Verify kết nối database
docker exec app-backend node -e "
  const db = require('./src/models');
  db.sequelize.authenticate()
    .then(() => console.log('✅ PostgreSQL connected'))
    .catch(err => console.error('❌ Connection failed:', err));
"

# Verify timezone
docker exec db-postgres psql -U bookingcare_user -d bookingcare -c "SHOW timezone;"
# Expected: Asia/Ho_Chi_Minh

# Verify tables
docker exec db-postgres psql -U bookingcare_user -d bookingcare -c "\dt"
# Expected: 9 tables (Users, Bookings, Schedules, ...)
```

### 8.4. Regression Test — Frontend

| # | Trang | Test case | Ghi chú |
|---|-------|-----------|---------|
| 1 | Trang chủ | Hiển thị Carousel BS/CK/PK | Data từ API |
| 2 | Chi tiết BS | Hiển thị thông tin + lịch | Ảnh từ BYTEA |
| 3 | Đặt lịch | Flow đặt lịch + VNPay | Full state machine |
| 4 | Dashboard Admin | 4 KPI + 4 biểu đồ | Raw SQL statistics |
| 5 | AI Chatbot | Hỏi đáp + Function Calling | API endpoints |
| 6 | Đăng nhập/Đăng ký | Auth flow | JWT + bcrypt |

---

## 9. KẾ HOẠCH ROLLBACK

### 9.1. Điều kiện rollback

Rollback nếu xảy ra BẤT KỲ tình huống nào:

- ❌ >5% API endpoints fail sau chuyển đổi
- ❌ Booking State Machine không hoạt động đúng
- ❌ Mất dữ liệu (data inconsistency)
- ❌ Performance tệ hơn MySQL >50%
- ❌ Docker Compose không khởi động được

### 9.2. Quy trình rollback

```
Bước 1: Revert Git
─────────────────
git checkout develop
git branch -D feature/migrate-postgresql
# Hoặc: git revert <merge-commit> nếu đã merge

Bước 2: Khôi phục Dependencies
─────────────────────────────
npm uninstall pg pg-hstore
npm install mysql2@^3.19.1

Bước 3: Khôi phục Database
──────────────────────────
# Import backup MySQL
mysql -u root bookingcare < backup_mysql_YYYYMMDD.sql

# Hoặc nếu dùng Docker
docker compose up -d db-mysql
docker exec -i db-mysql mysql -u root -pStrongRootP@ss2026 bookingcare < backup_mysql.sql

Bước 4: Khôi phục Docker Compose
────────────────────────────────
git checkout develop -- docker-compose.yml
docker compose down
docker compose up -d --build

Bước 5: Verify
──────────────
# Chạy smoke test lại toàn bộ 48 endpoints
```

### 9.3. Thời gian rollback ước tính

| Bước | Thời gian |
|------|-----------|
| Git revert | 1 phút |
| npm install | 2 phút |
| Khôi phục DB | 5 phút |
| Docker rebuild | 10 phút |
| Verify | 15 phút |
| **Tổng** | **~30 phút** |

---

## 10. CHECKLIST HOÀN THÀNH

### 10.1. Pre-Migration Checklist

- [ ] Backup MySQL data đầy đủ (`mysqldump`)
- [ ] Tạo branch `feature/migrate-postgresql`
- [ ] Cài đặt PostgreSQL 16 local hoặc Docker
- [ ] Verify PostgreSQL accessible (port 5432)
- [ ] Đọc hiểu toàn bộ kế hoạch này

### 10.2. Code Migration Checklist

- [ ] **package.json**: Xóa `mysql2`, thêm `pg` + `pg-hstore`
- [ ] **npm install** thành công
- [ ] **.env**: Cập nhật DB_PORT, DB_DIALECT, credentials
- [ ] **config.json**: Cập nhật dialect = "postgres" cho 3 environments
- [ ] **models/index.js**: Cập nhật pool, dialectOptions, hooks (afterConnect)
- [ ] **server.js**: Cập nhật timezone check (`@@session.time_zone` → `current_setting`)
- [ ] **server.js**: Cập nhật advisory lock release (`RELEASE_LOCK` → `pg_advisory_unlock`)
- [ ] **server.js**: Cập nhật log messages (MySQL → PostgreSQL)
- [ ] **paymentController.js**: Cập nhật `innodb_lock_wait_timeout` → `lock_timeout`
- [ ] **paymentController.js**: Cập nhật 5× `DATE_SUB` → `NOW() - INTERVAL`
- [ ] **paymentController.js**: Cập nhật 2× `DATE_ADD` → `NOW() + INTERVAL`
- [ ] **paymentController.js**: Cập nhật `GET_LOCK` → `pg_try_advisory_lock`
- [ ] **paymentController.js**: Cập nhật `RELEASE_LOCK` → `pg_advisory_unlock`
- [ ] **paymentController.js**: Cập nhật deadlock errno `[1213, 1205]` → `['40P01', '55P03']`
- [ ] **statisticService.js**: Cập nhật 7× `CAST(date AS UNSIGNED)` → `CAST(date AS BIGINT)`
- [ ] **statisticService.js**: Cập nhật `FROM_UNIXTIME` → `TO_TIMESTAMP`
- [ ] **statisticService.js**: Thêm dấu ngoặc kép cho tên bảng/cột trong raw SQL
- [ ] **convertBlobToBase64.js**: Cập nhật comments (MySQL BLOB → PostgreSQL BYTEA)
- [ ] **stripBase64Prefix.js**: Cập nhật comment
- [ ] **docker-compose.yml**: Thay `db-mysql` → `db-postgres`
- [ ] **docker-compose.yml**: Cập nhật image, env, volumes, healthcheck, ports

### 10.3. Data Migration Checklist

- [ ] PostgreSQL database `bookingcare` đã được tạo
- [ ] Sequelize sync tạo schema thành công (9 bảng)
- [ ] Seeder chạy thành công (Allcodes + sample data)
- [ ] Verify schema: `\dt` hiển thị 9 bảng
- [ ] Verify indexes: `pg_indexes` hiển thị đủ indexes
- [ ] Verify data: `SELECT COUNT(*)` khớp với MySQL

### 10.4. Testing Checklist

- [ ] Backend khởi động thành công (timezone check pass)
- [ ] Sequelize authenticate + sync thành công
- [ ] Auth: Đăng nhập/Đăng ký hoạt động
- [ ] Booking: Tạo booking → verify → thanh toán
- [ ] VNPay: Tạo payment URL + IPN callback
- [ ] Cronjob: `cleanupS1` hoạt động (advisory lock + DATE operations)
- [ ] Statistics: 5 API trả dữ liệu đúng
- [ ] AI Chatbot: Hỏi đáp hoạt động
- [ ] CRUD Admin: User, Doctor, Specialty, Clinic, Schedule
- [ ] Image: BYTEA lưu/đọc ảnh base64 đúng
- [ ] Docker Compose: 4 services healthy
- [ ] Frontend: Trang chủ, chi tiết BS, đặt lịch, dashboard

### 10.5. Post-Migration Checklist

- [ ] Cập nhật README.md
- [ ] Cập nhật .env.example
- [ ] Git commit với message chi tiết
- [ ] Code review (PR)
- [ ] Merge vào develop
- [ ] Xóa MySQL artifacts (nếu không cần)
- [ ] Cập nhật tài liệu đề cương Đồ án 2

---

## 11. PHỤ LỤC

### 11.1. PostgreSQL vs MySQL — Performance Benchmark (Tham khảo)

| Metric | MySQL 8.0 | PostgreSQL 16 | Ghi chú |
|--------|-----------|---------------|---------|
| Simple SELECT | ~0.5ms | ~0.5ms | Tương đương |
| Complex JOIN | ~2ms | ~1.5ms | PG tốt hơn |
| Concurrent Writes | ~5ms | ~3ms | PG MVCC tốt hơn |
| BLOB/BYTEA Read | ~1ms | ~1ms | Tương đương |
| JSON Query | ~2ms | ~0.5ms (JSONB) | PG JSONB vượt trội |
| Full-text Search | ~5ms | ~2ms | PG tsvector tốt hơn |
| Advisory Lock | ~0.1ms | ~0.1ms | Tương đương |

### 11.2. PostgreSQL Useful Commands

```sql
-- Kiểm tra version
SELECT version();

-- Kiểm tra timezone
SHOW timezone;

-- Kiểm tra active connections
SELECT count(*) FROM pg_stat_activity;

-- Kiểm tra database size
SELECT pg_size_pretty(pg_database_size('bookingcare'));

-- Kiểm tra table sizes
SELECT relname AS table_name,
       pg_size_pretty(pg_total_relation_size(relid)) AS total_size
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC;

-- Backup database
pg_dump -U bookingcare_user -d bookingcare -F c -f backup.dump

-- Restore database
pg_restore -U bookingcare_user -d bookingcare backup.dump
```

### 11.3. Tài liệu tham khảo

1. [PostgreSQL 16 Documentation](https://www.postgresql.org/docs/16/)
2. [Sequelize v6 — PostgreSQL Dialect](https://sequelize.org/docs/v6/other-topics/dialect-specific-things/#postgresql)
3. [pgloader — MySQL to PostgreSQL Migration](https://pgloader.io/)
4. [PostgreSQL vs MySQL: A Comprehensive Comparison](https://www.postgresql.org/about/)
5. [Node.js pg driver](https://node-postgres.com/)
6. [Docker PostgreSQL Image](https://hub.docker.com/_/postgres)

### 11.4. Sơ đồ kiến trúc sau chuyển đổi

```
┌─────────────────────────────────────────────────────────────┐
│                    KIẾN TRÚC SAU CHUYỂN ĐỔI                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────┐    ┌──────────────────────┐          │
│  │  Frontend (Web)   │    │  Mobile App (RN)     │          │
│  │  React + Vite     │    │  React Native        │          │
│  │  Port 80 (Nginx)  │    │  iOS / Android       │          │
│  └────────┬─────────┘    └──────────┬───────────┘          │
│           │  HTTP/Axios              │  HTTP/Axios          │
│           └──────────┬───────────────┘                      │
│                      │                                      │
│           ┌──────────▼───────────┐                          │
│           │  Backend (Express.js) │                         │
│           │  Node.js + Sequelize  │                         │
│           │  Port 8080            │                         │
│           │  ┌─────────────────┐  │                         │
│           │  │ Sequelize ORM   │  │                         │
│           │  │ dialect: postgres│  │                         │
│           │  │ pg + pg-hstore  │  │                         │
│           │  └────────┬────────┘  │                         │
│           └───────────┼───────────┘                         │
│                       │                                      │
│           ┌───────────▼──────────┐  ┌──────────────────┐   │
│           │  PostgreSQL 16       │  │  Redis 7         │   │
│           │  (alpine)            │  │  (alpine)        │   │
│           │  Port 5432           │  │  Port 6379       │   │
│           │  ┌────────────────┐  │  │  AI Chat Cache   │   │
│           │  │ 9 Tables       │  │  │  Idempotency     │   │
│           │  │ + Indexes      │  │  └──────────────────┘   │
│           │  │ + Sequences    │  │                          │
│           │  │ + Advisory Lock│  │                          │
│           │  └────────────────┘  │                          │
│           └──────────────────────┘                          │
│                                                             │
│  External Services:                                         │
│  ├── VNPay Sandbox (Payment)                                │
│  ├── Gmail SMTP (Email)                                     │
│  ├── Google Gemini 2.0 Flash (AI)                          │
│  └── Firebase Cloud Messaging (Push Notification)           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

> **Tài liệu này là living document** — được cập nhật trong quá trình chuyển đổi.  
> **Phiên bản:** 1.0 | **Cập nhật lần cuối:** 01/09/2026  
> **Trạng thái:** ⏳ Chờ triển khai
