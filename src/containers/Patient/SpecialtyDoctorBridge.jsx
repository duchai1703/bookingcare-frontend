// src/containers/Patient/SpecialtyDoctorBridge.jsx
// [Phase D.1] Trang phân cấp: Cơ sở y tế → Chuyên khoa → Bác sĩ
// URL: /clinics/:clinicId/specialties/:specialtyId/doctors
import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { getDetailClinicById } from '../../services/clinicService';
import { getDetailSpecialtyById } from '../../services/specialtyService';
import { getAllDoctors } from '../../services/doctorService';
import { LANGUAGES } from '../../utils/constants';
import CommonUtils from '../../utils/CommonUtils';
import DoctorSchedule from './DoctorSchedule';
import DoctorExtraInfo from './DoctorExtraInfo';
import './SpecialtyDoctorBridge.scss';

const SpecialtyDoctorBridge = () => {
  const { clinicId, specialtyId } = useParams();
  const navigate = useNavigate();
  const language = useSelector((state) => state.app.language);

  const [clinic, setClinic] = useState(null);
  const [specialty, setSpecialty] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getDetailClinicById(clinicId),
      getDetailSpecialtyById(specialtyId),
      getAllDoctors({ clinicId, specialtyId, limit: 50 }),
    ])
      .then(([clinicRes, specialtyRes, doctorsRes]) => {
        if (clinicRes?.errCode === 0) setClinic(clinicRes.data?.clinic || clinicRes.data);
        if (specialtyRes?.errCode === 0) setSpecialty(specialtyRes.data?.specialty || specialtyRes.data);
        if (doctorsRes?.errCode === 0) {
          setDoctors(doctorsRes.data || []);
        }
      })
      .catch((err) => console.error('Error fetching bridge data:', err))
      .finally(() => setLoading(false));
  }, [clinicId, specialtyId]);

  const getDoctorName = (doctor) => {
    const pos = language === LANGUAGES.VI ? doctor.positionData?.valueVi : doctor.positionData?.valueEn;
    const first = doctor.firstName || '';
    const last = doctor.lastName || '';
    return `${pos ? pos + ' ' : ''}${last} ${first}`.trim();
  };

  if (loading) {
    return (
      <div className="sdb-loading">
        <div className="sdb-spinner" />
        <p>Đang tải danh sách bác sĩ...</p>
      </div>
    );
  }

  return (
    <div className="sdb-page">
      {/* Breadcrumb phân cấp */}
      <nav className="sdb-breadcrumb" aria-label="breadcrumb">
        <Link to="/">Trang chủ</Link>
        <span>›</span>
        <Link to="/clinics">Cơ sở y tế</Link>
        <span>›</span>
        <Link to={`/clinics/${clinicId}/specialties`}>
          {clinic?.name || `Cơ sở y tế #${clinicId}`}
        </Link>
        <span>›</span>
        <span className="current">{specialty?.name || `Chuyên khoa #${specialtyId}`}</span>
      </nav>

      {/* Header tóm tắt Cơ sở y tế & Chuyên khoa */}
      <div className="sdb-header-card">
        <div className="sdb-header-meta">
          <span className="sdb-badge-clinic">🏥 {clinic?.name || 'Cơ sở y tế'}</span>
          <span className="sdb-badge-specialty">🔬 Chuyên khoa: {specialty?.name || 'Đang cập nhật'}</span>
        </div>
        <h1 className="sdb-title">
          Danh sách bác sĩ chuyên khoa {specialty?.name}
        </h1>
        {clinic?.address && (
          <p className="sdb-address">
            <i className="fas fa-map-marker-alt" /> Địa chỉ khám: <strong>{clinic.address}</strong>
          </p>
        )}
      </div>

      {/* Danh sách bác sĩ */}
      <div className="sdb-doctors-list">
        {doctors.length === 0 ? (
          <div className="sdb-empty">
            <div className="sdb-empty-icon">🩺</div>
            <h3>Chưa có bác sĩ thuộc chuyên khoa này tại cơ sở</h3>
            <p>Hiện chưa có lịch bác sĩ thuộc chuyên khoa {specialty?.name} tại {clinic?.name}.</p>
            <div className="sdb-empty-actions">
              <button
                className="sdb-btn-back"
                onClick={() => navigate(`/clinics/${clinicId}/specialties`)}
              >
                ← Chọn chuyên khoa khác
              </button>
              <Link to="/doctors" className="sdb-btn-all">
                Xem tất cả bác sĩ
              </Link>
            </div>
          </div>
        ) : (
          doctors.map((doctor) => {
            const doctorImg = doctor.image
              ? CommonUtils.decodeBase64Image(doctor.image)
              : '';
            const doctorDesc = doctor.doctorInfoData?.description || '';

            return (
              <div key={doctor.id} className="sdb-doctor-card">
                <div className="sdb-doctor-left">
                  <div className="sdb-avatar-wrapper">
                    <img
                      src={doctorImg || '/placeholder-avatar.png'}
                      alt={getDoctorName(doctor)}
                      className="sdb-doctor-avatar"
                      onError={(e) => { e.currentTarget.src = 'https://placehold.co/120x120?text=Doctor'; }}
                    />
                    <Link to={`/doctor/${doctor.id}`} className="sdb-link-more">
                      Xem chi tiết hồ sơ
                    </Link>
                  </div>
                  <div className="sdb-doctor-info">
                    <h3 className="sdb-doctor-name">
                      <Link to={`/doctor/${doctor.id}`}>{getDoctorName(doctor)}</Link>
                    </h3>
                    {doctorDesc && <p className="sdb-doctor-desc">{doctorDesc}</p>}
                    <div className="sdb-doctor-tags">
                      <span className="sdb-tag">📍 {doctor.doctorInfoData?.provinceData?.valueVi || 'Toàn quốc'}</span>
                      <span className="sdb-tag">🏥 {clinic?.name}</span>
                    </div>
                  </div>
                </div>

                <div className="sdb-doctor-right">
                  <div className="sdb-schedule-box">
                    <DoctorSchedule doctorIdFromParent={doctor.id} />
                  </div>
                  <div className="sdb-extra-box">
                    <DoctorExtraInfo doctorIdFromParent={doctor.id} />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default SpecialtyDoctorBridge;
