import axios from './axiosConfig';

const clinicHierarchyService = {
  // 1. Lấy danh sách Chuyên khoa tại Cơ sở y tế
  getClinicSpecialties: (clinicId) => {
    return axios.get(`/api/v1/admin/clinics/${clinicId}/specialties`);
  },

  // 2. Gán Chuyên khoa vào Cơ sở y tế
  assignSpecialtyToClinic: (clinicId, data) => {
    return axios.post(`/api/v1/admin/clinics/${clinicId}/specialties/assign`, data);
  },

  // 3. Gỡ Chuyên khoa khỏi Cơ sở y tế
  unassignSpecialtyFromClinic: (clinicId, specialtyId) => {
    return axios.post(`/api/v1/admin/clinics/${clinicId}/specialties/unassign`, { specialtyId });
  },

  // 4. Lấy chi tiết Chuyên khoa tại Cơ sở y tế (Contextual Workspace)
  getClinicSpecialtyWorkspace: (clinicId, specialtyId) => {
    return axios.get(`/api/v1/admin/clinics/${clinicId}/specialties/${specialtyId}/workspace`);
  },

  // 5. Phân bổ Bác sĩ vào Chuyên khoa tại Cơ sở y tế
  assignDoctorToClinicSpecialty: (clinicId, specialtyId, data) => {
    return axios.post(`/api/v1/admin/clinics/${clinicId}/specialties/${specialtyId}/assign-doctor`, data);
  },

  // 6. Cập nhật Phân bổ Bác sĩ
  updateDoctorAssignment: (assignmentId, data) => {
    return axios.put(`/api/v1/admin/doctor-assignments/${assignmentId}`, data);
  },

  // 7. Rút Bác sĩ khỏi Chuyên khoa tại Cơ sở y tế
  unassignDoctorFromClinicSpecialty: (assignmentId) => {
    return axios.delete(`/api/v1/admin/doctor-assignments/${assignmentId}`);
  },

  // 8. Lấy toàn bộ phân bổ làm việc của một Bác sĩ
  getDoctorAssignments: (doctorId) => {
    return axios.get(`/api/v1/admin/doctors/${doctorId}/assignments`);
  },
};

export default clinicHierarchyService;
