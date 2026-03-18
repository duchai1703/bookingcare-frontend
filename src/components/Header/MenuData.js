// src/components/Header/MenuData.js
// Menu items động theo role — SRS REQ-AU-005
import { path } from '../../utils/constants';

// ===== ADMIN MENU (R1) — 5 items =====
export const adminMenu = [
  {
    name: 'menu.admin.manage-user',    // i18n key
    link: path.USER_MANAGE,
  },
  {
    name: 'menu.admin.manage-doctor',
    link: '/system/doctor-manage',
  },
  {
    name: 'menu.admin.manage-schedule',
    link: '/system/schedule-manage',
  },
  {
    name: 'menu.admin.manage-specialty',
    link: '/system/specialty-manage',
  },
  {
    name: 'menu.admin.manage-clinic',
    link: '/system/clinic-manage',
  },
];

// ===== DOCTOR MENU (R2) — 1 item =====
export const doctorMenu = [
  {
    name: 'menu.doctor.manage-patient',
    link: path.MANAGE_PATIENT,
  },
];
