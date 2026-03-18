// src/containers/Patient/DoctorDetail.jsx
// Placeholder — sẽ hoàn thiện ở Giai đoạn 7
import React from 'react';
import { useParams } from 'react-router-dom';

const DoctorDetail = () => {
  const { id } = useParams();
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h2>Chi tiết bác sĩ #{id}</h2>
      <p>Trang chi tiết bác sĩ — sẽ hoàn thiện ở Giai đoạn 7 (Module Bệnh nhân)</p>
    </div>
  );
};

export default DoctorDetail;
