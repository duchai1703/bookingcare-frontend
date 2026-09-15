// src/containers/Patient/ClinicSpecialtyBridge.jsx
// [Phase D.1] Trang trung gian: Clinic → Specialty → Doctor
// URL: /clinics/:clinicId/specialties
import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getDetailClinicById, getClinicSpecialties } from '../../services/clinicService';
import Breadcrumb from '../../components/Common/Breadcrumb';
import './ClinicSpecialtyBridge.scss';

const ClinicSpecialtyBridge = () => {
  const { clinicId } = useParams();
  const navigate = useNavigate();
  const [clinic, setClinic] = useState(null);
  const [specialties, setSpecialties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getDetailClinicById(clinicId),
      getClinicSpecialties(clinicId),
    ])
      .then(([clinicRes, specialtyRes]) => {
        if (clinicRes?.errCode === 0) {
          setClinic(clinicRes.data?.clinic || clinicRes.data);
          // If getClinicSpecialties is empty or fallback to specialties from clinicRes:
          const sps = (specialtyRes?.errCode === 0 && specialtyRes.data) ? specialtyRes.data : (clinicRes.data?.specialties || []);
          setSpecialties(sps);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [clinicId]);

  if (loading) return <div className="csb-loading"><div className="csb-spinner" />Đang tải...</div>;

  return (
    <div className="csb-page">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'Cơ sở y tế', path: '/clinics' },
          { label: clinic?.name || `Phòng khám #${clinicId}`, path: `/clinics/${clinicId}` },
          { label: 'Chuyên khoa' },
        ]}
      />

      {/* Clinic header */}
      {clinic && (
        <div className="csb-clinic-header">
          {clinic.image && (
            <img
              src={clinic.image.startsWith('data:') ? clinic.image : `data:image/jpeg;base64,${clinic.image}`}
              alt={clinic.name}
              className="csb-clinic-logo"
            />
          )}
          <div>
            <h1 className="csb-clinic-name">{clinic.name}</h1>
            {clinic.address && <p className="csb-clinic-address">📍 {clinic.address}</p>}
          </div>
        </div>
      )}

      {/* Specialty selection */}
      <section className="csb-section">
        <h2>Chọn chuyên khoa để xem bác sĩ</h2>
        <p className="csb-subtitle">Tại {clinic?.name || 'cơ sở này'} có {specialties.length} chuyên khoa có bác sĩ tiếp nhận khám</p>

        {specialties.length === 0 ? (
          <div className="csb-empty">
            <p>Hiện chưa có bác sĩ nào được phân công chuyên khoa tại cơ sở này.</p>
            <Link to={`/clinics/${clinicId}`} className="csb-btn-back">
              Quay lại thông tin cơ sở y tế
            </Link>
          </div>
        ) : (
          <div className="csb-specialty-grid">
            {specialties.map((sp) => (
              <button
                key={sp.id}
                className="csb-specialty-card"
                onClick={() => navigate(`/clinics/${clinicId}/specialties/${sp.id}/doctors`)}
              >
                {sp.image ? (
                  <img
                    src={sp.image.startsWith('data:') ? sp.image : `data:image/jpeg;base64,${sp.image}`}
                    alt={sp.name}
                    className="csb-specialty-img"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                ) : (
                  <span className="csb-specialty-icon">🔬</span>
                )}
                <div className="csb-specialty-text">
                  <span className="csb-specialty-name">{sp.name}</span>
                  <span className="csb-specialty-count">{sp.doctorCount || 1} bác sĩ</span>
                </div>
                <span className="csb-specialty-arrow">›</span>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default ClinicSpecialtyBridge;
