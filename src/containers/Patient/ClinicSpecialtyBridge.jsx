// src/containers/Patient/ClinicSpecialtyBridge.jsx
// [Phase D.1] Trang trung gian: Clinic → Specialty → Doctor
// URL: /clinics/:clinicId/specialties
import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Header from '../../components/Header/Header';
import { getDetailClinicById } from '../../services/clinicService';
import { getAllSpecialty } from '../../services/specialtyService';
import './ClinicSpecialtyBridge.scss';

const ClinicSpecialtyBridge = () => {
  const { clinicId } = useParams();
  const navigate     = useNavigate();
  const [clinic,    setClinic]    = useState(null);
  const [specialties,setSpecialties] = useState([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getDetailClinicById(clinicId),
      getAllSpecialty(),
    ])
      .then(([clinicRes, specialtyRes]) => {
        if (clinicRes?.data?.errCode === 0) setClinic(clinicRes.data.data);
        if (specialtyRes?.data?.errCode === 0) setSpecialties(specialtyRes.data.data || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [clinicId]);

  if (loading) return <div className="csb-loading"><div className="csb-spinner" />Đang tải...</div>;

  return (
    <div className="csb-page">
      {/* Breadcrumb */}
      <nav className="csb-breadcrumb" aria-label="breadcrumb">
        <Link to="/">Trang chủ</Link>
        <span>›</span>
        <Link to="/clinics">Cơ sở y tế</Link>
        <span>›</span>
        <span>{clinic?.name || `Phòng khám #${clinicId}`}</span>
      </nav>

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
        <p className="csb-subtitle">Tại {clinic?.name || 'cơ sở này'} có {specialties.length} chuyên khoa</p>

        {specialties.length === 0 ? (
          <div className="csb-empty">Chưa có chuyên khoa nào</div>
        ) : (
          <div className="csb-specialty-grid">
            {specialties.map(sp => (
              <button
                key={sp.id}
                className="csb-specialty-card"
                onClick={() => navigate(`/clinics/${clinicId}/specialties/${sp.id}/doctors`)}
              >
                {sp.image && (
                  <img
                    src={sp.image.startsWith('data:') ? sp.image : `data:image/jpeg;base64,${sp.image}`}
                    alt={sp.name}
                    className="csb-specialty-img"
                    onError={e => { e.currentTarget.style.display = 'none'; }}
                  />
                )}
                <span className="csb-specialty-icon">{!sp.image ? '🔬' : ''}</span>
                <span className="csb-specialty-name">{sp.name}</span>
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
