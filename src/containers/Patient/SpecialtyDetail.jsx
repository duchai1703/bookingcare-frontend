// src/containers/Patient/SpecialtyDetail.jsx
// Placeholder — sẽ hoàn thiện ở Giai đoạn 7
import React from 'react';
import { useParams } from 'react-router-dom';

const SpecialtyDetail = () => {
  const { id } = useParams();
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h2>Chi tiết chuyên khoa #{id}</h2>
      <p>Trang chi tiết chuyên khoa — sẽ hoàn thiện ở Giai đoạn 7</p>
    </div>
  );
};

export default SpecialtyDetail;
