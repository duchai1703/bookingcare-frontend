# PHASE 12 — PHẦN 3: KẾT NỐI DATABASE (CROSS-MODULE FUNCTION CALLING & PII MASKING)

> Tiếp nối Part 1. Đọc Part 1 trước để hiểu System Prompt & History.

---

## 3.1 — Function Calling Declaration (2 nhóm — READ ONLY)

> [!CAUTION]
> TẤT CẢ Function Calling đều là **READ ONLY** (`findAll`, `findOne`, `findByPk`). TUYỆT ĐỐI CẤM `create`, `update`, `destroy`, `save`, `increment`, `decrement` trong context AI. KHÔNG dùng Migration. Dùng trực tiếp Sequelize model đã có trong `db` (`models/index.js`).

### Nhóm 1: Tra cứu thông tin (Public)

```javascript
const aiFunctions = {
  // ═══ 1. Tìm bác sĩ theo chuyên khoa ═══
  searchDoctorsBySpecialty: {
    description: 'Tìm danh sách bác sĩ theo tên chuyên khoa. Trả về tên, vị trí, phòng khám, giá khám.',
    parameters: {
      type: 'object',
      properties: {
        specialtyName: { type: 'string', description: 'Tên chuyên khoa (VD: "Cơ xương khớp", "Tim mạch")' },
        language: { type: 'string', enum: ['vi', 'en'], description: 'Ngôn ngữ hiển thị giá' },
      },
      required: ['specialtyName'],
    },
  },

  // ═══ 2. Xem lịch khám còn trống ═══
  getAvailableSchedules: {
    description: 'Xem các khung giờ còn trống của bác sĩ theo ngày.',
    parameters: {
      type: 'object',
      properties: {
        doctorId: { type: 'number', description: 'ID bác sĩ' },
        date: { type: 'string', description: 'Ngày khám (timestamp string hoặc DD/MM/YYYY)' },
      },
      required: ['doctorId', 'date'],
    },
  },

  // ═══ 3. Xem thông tin phòng khám ═══
  getClinicInfo: {
    description: 'Lấy thông tin phòng khám theo tên.',
    parameters: {
      type: 'object',
      properties: {
        clinicName: { type: 'string', description: 'Tên phòng khám' },
      },
      required: ['clinicName'],
    },
  },

  // ═══ 4. Xem chi tiết bác sĩ ═══
  getDoctorDetail: {
    description: 'Lấy thông tin chi tiết một bác sĩ theo ID.',
    parameters: {
      type: 'object',
      properties: {
        doctorId: { type: 'number', description: 'ID bác sĩ' },
        language: { type: 'string', enum: ['vi', 'en'] },
      },
      required: ['doctorId'],
    },
  },
};
```

### Nhóm 2: Tra cứu cá nhân (Authenticated — cần `userId` từ JWT)

```javascript
const aiAuthFunctions = {
  // ═══ 5. Xem lịch hẹn của bệnh nhân ═══
  getMyBookings: {
    description: 'Xem lịch hẹn của bệnh nhân đang đăng nhập. Trả về trạng thái, bác sĩ, ngày giờ.',
    parameters: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'Lọc theo trạng thái: S1,S2 (sắp tới) | S3 (đã khám) | S4 (đã hủy)', enum: ['S1,S2', 'S3', 'S4'] },
      },
    },
  },

  // ═══ 6. Xem trạng thái thanh toán ═══
  getMyPaymentStatus: {
    description: 'Xem trạng thái thanh toán của lịch hẹn gần nhất.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
};
```

## 3.2 — Function Calling Handlers (Implementation)

```javascript
// src/services/aiFunctionHandlers.js
const db = require('../models');
const { Op } = require('sequelize');

// ═══════════════════════════════════════════════════════════════════════
// [VÁ LỖ HỔNG DB] Tất cả handler tuân thủ 12 quy tắc bảo mật
// ═══════════════════════════════════════════════════════════════════════

// --- Helper: Sanitize Wildcard ---
// Chống SQL Wildcard Injection: escape ký tự % và _ trong LIKE query
function sanitizeWildcard(input) {
  if (typeof input !== 'string') return '';
  return input.replace(/[%_]/g, '\\$&');
}

// --- Helper: PII Masker ---
// Che thông tin nhạy cảm trước khi trả về cho AI
function maskPII(obj) {
  if (!obj) return obj;
  const masked = { ...obj };
  // Che email: abc***@gmail.com
  if (masked.email) {
    const [local, domain] = masked.email.split('@');
    masked.email = local.slice(0, 3) + '***@' + domain;
  }
  // Che SĐT: ****567890
  if (masked.phoneNumber) {
    masked.phoneNumber = '****' + masked.phoneNumber.slice(-6);
  }
  // Xóa hoàn toàn các trường nhạy cảm
  delete masked.password;
  delete masked.tokenVersion;
  delete masked.vnpayTransactionNo;
  delete masked.paymentToken;
  delete masked.publicReceiptToken;
  delete masked.token;
  return masked;
}

// --- Helper: Truncate 3000 chars ---
function truncateResult(str, max = 3000) {
  const arr = Array.from(str || ''); // Array.from: chống Surrogate Mutilation
  if (arr.length <= max) return str;
  return arr.slice(0, max).join('') + '... [đã cắt bớt]';
}

// --- Helper: Safe JSON parse với Reviver ---
function safeJsonParse(str) {
  try {
    return JSON.parse(str, (key, value) => {
      // Reviver: Block __proto__, constructor pollution
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        return undefined;
      }
      return value;
    });
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Handler 1: searchDoctorsBySpecialty
// ═══════════════════════════════════════════════════════════════════════
async function handleSearchDoctorsBySpecialty(args, signal) {
  const { specialtyName, language = 'vi' } = args;

  // [Ép kiểu cứng]
  if (typeof specialtyName !== 'string' || !specialtyName.trim()) {
    return { error: 'Thiếu tên chuyên khoa' };
  }

  // [Sanitize Wildcard] + [Khóa 500 chars]
  const safeName = Array.from(sanitizeWildcard(specialtyName.trim()))
    .slice(0, 500).join('');

  // [Truyền AbortSignal] — không truyền trực tiếp vào Sequelize
  //   nhưng kiểm tra trước mỗi query
  if (signal?.aborted) return { error: 'Đã hủy' };

  const specialty = await db.Specialty.findOne({
    where: {
      name: { [Op.like]: `%${safeName}%` },
    },
    attributes: ['id', 'name'], // [LOẠI BỎ BASE64] — không trả image blob
  });

  if (!specialty) return { doctors: [], message: 'Không tìm thấy chuyên khoa' };

  if (signal?.aborted) return { error: 'Đã hủy' };

  const doctorInfos = await db.Doctor_Info.findAll({
    where: { specialtyId: specialty.id },
    attributes: ['doctorId', 'description'],
    // [LIMIT 5 + ORDER BY] — chống full table scan
    limit: 5,
    order: [['doctorId', 'ASC']],
    include: [
      {
        model: db.Allcode, as: 'priceData',
        attributes: ['valueVi', 'valueEn'],
      },
      {
        model: db.Clinic, as: 'clinicData',
        attributes: ['name', 'address'], // [LOẠI BỎ BASE64]
      },
      {
        model: db.User, as: 'doctorData',
        attributes: ['id', 'firstName', 'lastName'], // [LOẠI BỎ BASE64] — không trả image
        include: [
          { model: db.Allcode, as: 'positionData', attributes: ['valueVi', 'valueEn'] },
        ],
      },
    ],
  });

  // [Truncate 3000 chars] trên toàn bộ kết quả
  const result = doctorInfos.map(di => {
    const d = di.toJSON();
    return {
      doctorId: d.doctorData?.id,
      name: `${d.doctorData?.lastName || ''} ${d.doctorData?.firstName || ''}`.trim(),
      position: language === 'vi' ? d.doctorData?.positionData?.valueVi : d.doctorData?.positionData?.valueEn,
      price: language === 'vi' ? d.priceData?.valueVi : d.priceData?.valueEn,
      clinic: d.clinicData?.name,
      address: d.clinicData?.address,
      description: d.description ? Array.from(d.description).slice(0, 200).join('') : '',
    };
  });

  return { specialty: specialty.name, doctors: result };
}

// ═══════════════════════════════════════════════════════════════════════
// Handler 2: getAvailableSchedules
// [Include Schedules + UTC] — Trả timeTypeData (valueVi/valueEn)
// ═══════════════════════════════════════════════════════════════════════
async function handleGetAvailableSchedules(args, signal) {
  // [Ép kiểu cứng]
  const doctorId = parseInt(String(args.doctorId), 10);
  if (!Number.isFinite(doctorId) || doctorId <= 0) {
    return { error: 'doctorId không hợp lệ' };
  }

  const date = String(args.date || '').trim();
  if (!date) return { error: 'Thiếu ngày khám' };

  // [Limit UserID] — doctorId đã ép parseInt ở trên
  if (signal?.aborted) return { error: 'Đã hủy' };

  const schedules = await db.Schedule.findAll({
    where: { doctorId, date },
    attributes: ['id', 'timeType', 'maxNumber', 'currentNumber', 'date'],
    limit: 5,
    order: [['timeType', 'ASC']],
    include: [
      { model: db.Allcode, as: 'timeTypeData', attributes: ['valueVi', 'valueEn'] },
    ],
  });

  // Chỉ trả slot còn trống
  const available = schedules
    .filter(s => s.currentNumber < s.maxNumber)
    .map(s => ({
      scheduleId: s.id,
      timeType: s.timeType,
      timeLabel: s.timeTypeData?.valueVi,
      remaining: s.maxNumber - s.currentNumber,
    }));

  return { doctorId, date, availableSlots: available };
}

// ═══════════════════════════════════════════════════════════════════════
// Handler 3: getClinicInfo
// ═══════════════════════════════════════════════════════════════════════
async function handleGetClinicInfo(args, signal) {
  if (typeof args.clinicName !== 'string' || !args.clinicName.trim()) {
    return { error: 'Thiếu tên phòng khám' };
  }

  const safeName = Array.from(sanitizeWildcard(args.clinicName.trim()))
    .slice(0, 500).join('');

  if (signal?.aborted) return { error: 'Đã hủy' };

  const clinics = await db.Clinic.findAll({
    where: { name: { [Op.like]: `%${safeName}%` } },
    attributes: ['id', 'name', 'address', 'descriptionMarkdown'], // [LOẠI BỎ BASE64]
    limit: 5,
    order: [['name', 'ASC']],
  });

  return {
    clinics: clinics.map(c => ({
      id: c.id,
      name: c.name,
      address: c.address,
      description: c.descriptionMarkdown
        ? Array.from(c.descriptionMarkdown).slice(0, 500).join('')
        : '',
    })),
  };
}

// ═══════════════════════════════════════════════════════════════════════
// Handler 4: getDoctorDetail
// ═══════════════════════════════════════════════════════════════════════
async function handleGetDoctorDetail(args, signal) {
  const doctorId = parseInt(String(args.doctorId), 10);
  if (!Number.isFinite(doctorId) || doctorId <= 0) {
    return { error: 'doctorId không hợp lệ' };
  }

  if (signal?.aborted) return { error: 'Đã hủy' };

  const doctor = await db.User.findOne({
    where: { id: doctorId, roleId: 'R2' },
    attributes: ['id', 'firstName', 'lastName'], // [LOẠI BỎ BASE64]
    include: [
      { model: db.Allcode, as: 'positionData', attributes: ['valueVi', 'valueEn'] },
      {
        model: db.Doctor_Info, as: 'doctorInfoData',
        attributes: ['description', 'note'],
        include: [
          { model: db.Allcode, as: 'priceData', attributes: ['valueVi', 'valueEn'] },
          { model: db.Specialty, as: 'specialtyData', attributes: ['name'] },
          { model: db.Clinic, as: 'clinicData', attributes: ['name', 'address'] },
        ],
      },
    ],
  });

  if (!doctor) return { error: 'Không tìm thấy bác sĩ' };

  const d = doctor.toJSON();
  const lang = args.language || 'vi';

  return maskPII({
    doctorId: d.id,
    name: `${d.lastName || ''} ${d.firstName || ''}`.trim(),
    position: lang === 'vi' ? d.positionData?.valueVi : d.positionData?.valueEn,
    specialty: d.doctorInfoData?.specialtyData?.name,
    clinic: d.doctorInfoData?.clinicData?.name,
    clinicAddress: d.doctorInfoData?.clinicData?.address,
    price: lang === 'vi' ? d.doctorInfoData?.priceData?.valueVi : d.doctorInfoData?.priceData?.valueEn,
    description: d.doctorInfoData?.description
      ? Array.from(d.doctorInfoData.description).slice(0, 500).join('')
      : '',
  });
}

// ═══════════════════════════════════════════════════════════════════════
// Handler 5: getMyBookings (Authenticated)
// [Timestamp IPN] — Include paymentStatus cho context VNPay
// [Cấm Transaction LLM] — Chỉ READ, không wrap trong transaction
// [Bảo toàn Context] — Trả đủ thông tin để AI tổng hợp
// [lock: false] — Không dùng pessimistic lock cho read AI
// ═══════════════════════════════════════════════════════════════════════
async function handleGetMyBookings(args, userId, signal) {
  // [Limit UserID]
  const safeUserId = parseInt(String(userId), 10);
  if (!Number.isFinite(safeUserId) || safeUserId <= 0) {
    return { error: 'userId không hợp lệ' };
  }

  if (signal?.aborted) return { error: 'Đã hủy' };

  const whereClause = { patientId: safeUserId };
  if (args.status) {
    whereClause.statusId = { [Op.in]: String(args.status).split(',') };
  }

  const bookings = await db.Booking.findAll({
    where: whereClause,
    attributes: ['id', 'date', 'timeType', 'statusId', 'paymentStatus',
                 'bookingPrice', 'reason', 'patientName', 'createdAt'],
    limit: 5,
    order: [['createdAt', 'DESC']],
    include: [
      {
        model: db.User, as: 'doctorBookingData',
        attributes: ['firstName', 'lastName'], // [LOẠI BỎ BASE64]
      },
      { model: db.Allcode, as: 'statusData', attributes: ['valueVi', 'valueEn'] },
      { model: db.Allcode, as: 'timeTypeBooking', attributes: ['valueVi', 'valueEn'] },
    ],
  });

  return {
    bookings: bookings.map(b => {
      const j = b.toJSON();
      return maskPII({
        bookingId: j.id,
        doctor: `${j.doctorBookingData?.lastName || ''} ${j.doctorBookingData?.firstName || ''}`.trim(),
        date: j.date,
        time: j.timeTypeBooking?.valueVi,
        status: j.statusData?.valueVi,
        statusId: j.statusId,
        paymentStatus: j.paymentStatus,
        price: j.bookingPrice,
        reason: j.reason ? Array.from(j.reason).slice(0, 200).join('') : '',
      });
    }),
  };
}

// ═══════════════════════════════════════════════════════════════════════
// Handler 6: getMyPaymentStatus (Authenticated)
// [Che PII] — Chỉ trả paymentStatus, KHÔNG trả vnpayTransactionNo
// ═══════════════════════════════════════════════════════════════════════
async function handleGetMyPaymentStatus(args, userId, signal) {
  const safeUserId = parseInt(String(userId), 10);
  if (!Number.isFinite(safeUserId) || safeUserId <= 0) {
    return { error: 'userId không hợp lệ' };
  }

  if (signal?.aborted) return { error: 'Đã hủy' };

  const booking = await db.Booking.findOne({
    where: { patientId: safeUserId },
    attributes: ['id', 'paymentStatus', 'bookingPrice', 'statusId', 'date'],
    order: [['createdAt', 'DESC']],
    include: [
      { model: db.Allcode, as: 'statusData', attributes: ['valueVi'] },
    ],
  });

  if (!booking) return { message: 'Không tìm thấy lịch hẹn nào' };

  return {
    bookingId: booking.id,
    paymentStatus: booking.paymentStatus,
    price: booking.bookingPrice,
    bookingStatus: booking.statusData?.valueVi,
    date: booking.date,
  };
}

// ═══ Dispatcher ═══
async function executeFunctionCall(functionName, args, userId, signal) {
  // [try-catch JSON] với Reviver
  const safeArgs = typeof args === 'string' ? safeJsonParse(args) : args;
  if (!safeArgs && typeof args === 'string') {
    return { error: 'Invalid JSON arguments' };
  }

  const handlers = {
    searchDoctorsBySpecialty: () => handleSearchDoctorsBySpecialty(safeArgs, signal),
    getAvailableSchedules: () => handleGetAvailableSchedules(safeArgs, signal),
    getClinicInfo: () => handleGetClinicInfo(safeArgs, signal),
    getDoctorDetail: () => handleGetDoctorDetail(safeArgs, signal),
    getMyBookings: () => handleGetMyBookings(safeArgs, userId, signal),
    getMyPaymentStatus: () => handleGetMyPaymentStatus(safeArgs, userId, signal),
  };

  const handler = handlers[functionName];
  if (!handler) return { error: `Unknown function: ${functionName}` };

  // [Max 3 Calls AI] — Tracked by caller, not here
  const result = await handler();

  // [Truncate 3000 chars] — Bọc Delimiter DB
  const resultStr = JSON.stringify(result);
  const truncated = truncateResult(resultStr, 3000);

  return `---DB_RESULT---\n${truncated}\n---/DB_RESULT---`;
}

module.exports = { executeFunctionCall, aiFunctions, aiAuthFunctions };
```

## 3.3 — Bảng tổng hợp 12 quy tắc bảo mật DB cho AI

| # | Quy tắc | Cách áp dụng |
|---|---|---|
| 1 | Sanitize Wildcard | `sanitizeWildcard()` — escape `%` và `_` trong LIKE |
| 2 | Che PII | `maskPII()` — che email, SĐT, xóa password/token |
| 3 | LIMIT 5 + ORDER BY | Mọi `findAll` đều có `limit: 5, order: [...]` |
| 4 | Truyền AbortSignal | `if (signal?.aborted) return` trước mỗi query |
| 5 | LOẠI BỎ BASE64 | `attributes` exclude `image` — không bao giờ trả BLOB cho AI |
| 6 | try-catch JSON + Reviver | `safeJsonParse()` — block `__proto__` pollution |
| 7 | Ép kiểu cứng | `parseInt()` + `Number.isFinite()` cho ID |
| 8 | Truncate 3000 chars | `truncateResult()` — `Array.from()` chống Surrogate |
| 9 | Include Schedules + UTC | `timeTypeData` include, date dạng string (UTC+7 từ Phase 10) |
| 10 | Timestamp IPN | Include `paymentStatus` trong booking query |
| 11 | Cấm Transaction LLM | Không wrap read query trong `sequelize.transaction()` |
| 12 | lock: false | Không dùng `t.LOCK.UPDATE` cho AI read queries |

> [!WARNING]
> **Khóa 500 chars:** Mọi input string từ AI Function Calling đều bị cắt tối đa 500 ký tự bằng `Array.from(input).slice(0, 500).join('')`. Chống prompt injection qua tham số dài.

> [!CAUTION]
> **[UNICODE SECURITY — QUY TẮC CẮT CHUỖI 500 KÝ TỰ]:**
>
> - 🚫 **CẤM:** Dùng `String.prototype.slice()` hoặc `String.prototype.substring()`.
> - ✅ **BẮT BUỘC:** Dùng `Array.from(str).slice(0, 500).join('')`.
> - ⚠️ **LÝ DO:** Chống cắt đứt nửa chừng các Surrogate Pairs (Emoji, ký tự Unicode tiếng Việt) gây lỗi sập JSON Parser (`Unterminated string in JSON`) và hiển thị ký tự rác `�` trên giao diện.

---
