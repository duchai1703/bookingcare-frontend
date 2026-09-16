// src/containers/System/Doctor/DoctorRevenue.jsx
// [Phase D.7] Dashboard doanh thu cá nhân bác sĩ
import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { getDoctorRevenue } from '../../../services/doctorService';
import './DoctorRevenue.scss';

const MONTHS = ['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12'];

const DoctorRevenue = () => {
  const currentYear = new Date().getFullYear();
  const [year, setYear]   = useState(currentYear);
  const [data, setData]   = useState({ monthly: [], total: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    getDoctorRevenue(year)
      .then(res => {
        const payload = res?.data?.data || res?.data;
        if (res?.errCode === 0 || res?.data?.errCode === 0) {
          if (payload) setData(payload);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [year]);

  const maxRevenue = Math.max(...(data.monthly || []).map(m => m.revenue), 1);
  const totalCount = (data.monthly || []).reduce((s, m) => s + m.count, 0);

  return (
    <div className="doctor-revenue-page">
      <div className="revenue-header">
        <div>
          <h2>💰 Doanh thu của tôi</h2>
          <p className="subtitle">Thống kê theo từng tháng</p>
        </div>
        <select
          className="year-select"
          value={year}
          onChange={e => setYear(Number(e.target.value))}
        >
          {[currentYear - 1, currentYear, currentYear + 1].map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* Summary cards */}
      <div className="revenue-cards">
        <div className="card card--total">
          <span className="card-label">Tổng doanh thu {year}</span>
          <span className="card-value">
            {(data.total || 0).toLocaleString('vi-VN')} <small>VNĐ</small>
          </span>
        </div>
        <div className="card card--count">
          <span className="card-label">Tổng lượt khám</span>
          <span className="card-value">{totalCount}</span>
        </div>
        <div className="card card--avg">
          <span className="card-label">TB / tháng</span>
          <span className="card-value">
            {totalCount > 0 ? Math.round((data.total || 0) / 12).toLocaleString('vi-VN') : 0} <small>VNĐ</small>
          </span>
        </div>
      </div>

      {/* Bar chart (CSS-based, không cần thư viện) */}
      {loading ? (
        <div className="loading-state">Đang tải dữ liệu...</div>
      ) : (
        <div className="revenue-chart">
          <div className="chart-bars">
            {(data.monthly || []).map((m, i) => {
              const pct = maxRevenue > 0 ? (m.revenue / maxRevenue) * 100 : 0;
              return (
                <div key={i} className="bar-col">
                  <div className="bar-tooltip">
                    <strong>{(m.revenue || 0).toLocaleString('vi-VN')} VNĐ</strong>
                    <span>{m.count} lượt khám</span>
                  </div>
                  <div className="bar-wrap">
                    <div
                      className={`bar${m.revenue > 0 ? ' bar--active' : ''}`}
                      style={{ height: `${Math.max(pct, m.revenue > 0 ? 4 : 0)}%` }}
                    />
                  </div>
                  <span className="bar-label">{MONTHS[i]}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Table chi tiết */}
      <div className="revenue-table-wrap">
        <table className="revenue-table">
          <thead>
            <tr>
              <th>Tháng</th>
              <th>Lượt khám</th>
              <th>Doanh thu (VNĐ)</th>
            </tr>
          </thead>
          <tbody>
            {(data.monthly || []).map((m, i) => (
              <tr key={i} className={m.revenue > 0 ? 'row--active' : ''}>
                <td>{MONTHS[i]} / {year}</td>
                <td>{m.count}</td>
                <td>{(m.revenue || 0).toLocaleString('vi-VN')}</td>
              </tr>
            ))}
            <tr className="row--total">
              <td><strong>Cộng</strong></td>
              <td><strong>{totalCount}</strong></td>
              <td><strong>{(data.total || 0).toLocaleString('vi-VN')}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DoctorRevenue;
