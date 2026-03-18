// src/containers/Patient/ClinicDetail.jsx
// Placeholder — sẽ hoàn thiện ở Giai đoạn 7
import React from 'react';
import { useParams } from 'react-router-dom';

const ClinicDetail = () => {
  const { id } = useParams();
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h2>Chi tiết phòng khám #{id}</h2>
      <p>Trang chi tiết phòng khám — sẽ hoàn thiện ở Giai đoạn 7</p>
    </div>
  );
};

export default ClinicDetail;
