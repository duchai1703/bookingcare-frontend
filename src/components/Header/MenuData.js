// src/components/Header/MenuData.js
// [Phase C] Sidebar phân nhóm master-detail — SRS REQ-AU-005
// Thêm type: 'group' để Navigator.jsx render group label
import { path } from '../../utils/constants';

// ===== ADMIN MENU (R1) — phân nhóm 5 nhóm =====
export const adminMenu = [
  // ── Nhóm 1: Tổng quan & Báo cáo điều hành ──
  { type: 'group', label: 'Báo cáo & Phân tích' },
  { name: 'menu.admin.dashboard',             link: '/system/dashboard' },
  { name: 'menu.admin.analytics-bookings',    link: path.ANALYTICS_BOOKINGS },
  { name: 'menu.admin.analytics-revenue',     link: path.ANALYTICS_REVENUE },
  { name: 'menu.admin.analytics-doctors',     link: path.ANALYTICS_DOCTORS },
  { name: 'menu.admin.analytics-patients',    link: path.ANALYTICS_PATIENTS },
  { name: 'menu.admin.analytics-specialties', link: path.ANALYTICS_SPECIALTIES },

  // ── Nhóm 2: Quản trị Vận hành & Bệnh nhân ──
  { type: 'group', label: 'Vận hành Y tế' },
  { name: 'menu.admin.manage-patient',   link: path.PATIENT_MANAGE },
  { name: 'menu.admin.manage-doctor',    link: '/system/doctor-manage' },
  { name: 'menu.admin.manage-schedule',  link: path.SCHEDULE_MANAGE },

  // ── Nhóm 3: Cơ sở y tế & Chuyên khoa ──
  { type: 'group', label: 'Cơ sở & Chuyên môn' },
  { name: 'menu.admin.manage-clinic',    link: path.CLINIC_MANAGE },
  { name: 'menu.admin.manage-specialty', link: path.SPECIALTY_MANAGE },
  { name: 'menu.admin.medical-catalog',  link: path.MEDICAL_CATALOG_MANAGE },
  { name: 'menu.admin.medicine',         link: path.MEDICINE_MANAGE },

  // ── Nhóm 4: Cài đặt & Phân quyền ──
  { type: 'group', label: 'Hệ thống' },
  { name: 'menu.admin.manage-user',      link: path.USER_MANAGE },
  { name: 'menu.admin.system-settings',  link: path.SYSTEM_SETTINGS },
];

// ===== DOCTOR MENU (R2) — phân nhóm 3 nhóm =====
export const doctorMenu = [
  // ── Nhóm 1: Nghiệp vụ ──
  { type: 'group', label: 'Nghiệp vụ' },
  { name: 'menu.doctor.manage-patient',  link: path.MANAGE_PATIENT },
  { name: 'menu.doctor.manage-schedule', link: '/doctor-dashboard/manage-schedule' },

  // ── Nhóm 2: Báo cáo ──
  { type: 'group', label: 'Báo cáo' },
  { name: 'menu.doctor.revenue',         link: path.DOCTOR_REVENUE },

  // ── Nhóm 3: Cài đặt ──
  { type: 'group', label: 'Cài đặt' },
  { name: 'menu.doctor.profile',         link: path.DOCTOR_PROFILE },
];
