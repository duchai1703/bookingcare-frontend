// src/routes/PrivateRoute.jsx
// Bảo vệ route — kiểm tra login và role — SRS REQ-AU-008
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';

const PrivateRoute = ({ allowedRoles }) => {
  const { isLoggedIn, userInfo } = useSelector((state) => state.user);

  // Chưa đăng nhập → redirect về /login
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  // Nếu có yêu cầu role cụ thể → kiểm tra
  if (allowedRoles && !allowedRoles.includes(userInfo?.roleId)) {
    // Có đăng nhập nhưng sai role → redirect về trang chủ
    return <Navigate to="/" replace />;
  }

  // OK → render component con
  return <Outlet />;
};

export default PrivateRoute;
