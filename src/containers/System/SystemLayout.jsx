// src/containers/System/SystemLayout.jsx
// Layout wrapper cho admin & doctor dashboard 
// Placeholder — sẽ hoàn thiện ở Giai đoạn 6
import React from 'react';
import { Outlet } from 'react-router-dom';

const SystemLayout = () => {
  return (
    <div className="system-container" style={{ padding: '20px' }}>
      <h2>Dashboard Quản trị</h2>
      <p>Module quản trị — sẽ hoàn thiện ở Giai đoạn 6 (Admin Module)</p>
      <hr />
      <Outlet />
    </div>
  );
};

export default SystemLayout;
