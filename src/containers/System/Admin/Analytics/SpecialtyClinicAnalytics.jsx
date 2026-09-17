// src/containers/System/Admin/Analytics/SpecialtyClinicAnalytics.jsx
// Detail Analytics: Specialty & Facility Ranking, Market Share & Contribution
import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import moment from 'moment';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import {
  Building2,
  Layers,
  ArrowLeft,
  RotateCw,
  TrendingUp,
} from 'lucide-react';
import { getRevenueAnalyticsDetail } from '../../../../services/statisticService';
import { path } from '../../../../utils/constants';
import './AnalyticsShared.scss';

const formatCurrencyVND = (num) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0);
};

const SpecialtyClinicAnalytics = () => {
  const language = useSelector((state) => state.app.language);
  const [activePreset, setActivePreset] = useState('30d');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(async (signal) => {
    setLoading(true);
    setError('');
    try {
      const days = activePreset === '7d' ? 7 : activePreset === '90d' ? 90 : 30;
      const to = moment().endOf('day').valueOf();
      const from = moment().subtract(days, 'days').startOf('day').valueOf();

      const res = await getRevenueAnalyticsDetail(from, to, { signal });
      if (res && res.errCode === 0) {
        setData(res.data);
      } else {
        setError(res?.errMessage || 'Không thể tải dữ liệu chuyên khoa & cơ sở');
      }
    } catch (err) {
      if (err.name !== 'CanceledError' && err.name !== 'AbortError') {
        setError('Lỗi kết nối máy chủ');
      }
    } finally {
      setLoading(false);
    }
  }, [activePreset]);

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, [fetchData]);

  const bySpecialty = data?.bySpecialty || [];
  const byClinic = data?.byClinic || [];

  const totalSpecialtyRev = bySpecialty.reduce((sum, s) => sum + s.revenue, 0);
  const totalClinicRev = byClinic.reduce((sum, c) => sum + c.revenue, 0);

  const topSpecialty = bySpecialty[0];
  const topClinic = byClinic[0];

  return (
    <div className="analytics-detail-page">
      {/* Breadcrumb */}
      <div className="analytics-breadcrumb">
        <Link to={path.DASHBOARD}>
          <ArrowLeft size={14} />
          <span>{language === 'vi' ? 'Tổng quan điều hành' : 'Executive Master'}</span>
        </Link>
        <span className="bc-separator">/</span>
        <span className="bc-current">{language === 'vi' ? 'Chuyên khoa & Cơ sở y tế' : 'Specialties & Clinics'}</span>
      </div>

      {/* Header */}
      <header className="analytics-header">
        <div className="header-left">
          <div className="header-badge">
            <Building2 size={13} strokeWidth={2.5} />
            <span>Healthcare Market Share & Vertical Analytics</span>
          </div>
          <h1 className="page-title">
            {language === 'vi' ? 'Báo cáo Hiệu quả Chuyên khoa & Cơ sở Y tế' : 'Specialty & Health Facility Analytics'}
          </h1>
          <p className="page-subtitle">
            {language === 'vi'
              ? 'Xếp hạng đóng góp doanh thu, tỷ trọng thị phần khám bệnh giữa các khoa và bệnh viện liên kết'
              : 'Revenue ranking, market share contribution across clinical verticals and partner hospitals'}
          </p>
        </div>

        <div className="header-filters">
          <div className="filter-btn-group">
            {['7d', '30d', '90d'].map((preset) => (
              <button
                key={preset}
                className={`btn-filter-preset ${activePreset === preset ? 'active' : ''}`}
                onClick={() => setActivePreset(preset)}
              >
                {preset === '7d' ? (language === 'vi' ? '7 ngày' : '7d') : preset === '30d' ? (language === 'vi' ? '30 ngày' : '30d') : (language === 'vi' ? '90 ngày' : '90d')}
              </button>
            ))}
          </div>

          <button
            className="btn-filter-preset"
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', border: '1px solid #cbd5e1', borderRadius: 8, padding: '6px 12px' }}
            onClick={() => fetchData()}
          >
            <RotateCw size={14} className={loading ? 'fa-spin' : ''} />
            <span>{language === 'vi' ? 'Làm mới' : 'Refresh'}</span>
          </button>
        </div>
      </header>

      {/* KPI Strip */}
      <div className="detail-kpi-strip">
        <div className="detail-kpi-card">
          <div className="kpi-title">{language === 'vi' ? 'Chuyên khoa phát sinh ca' : 'Active Specialties'}</div>
          <div className="kpi-num">{bySpecialty.length}</div>
          <div className="kpi-desc">{language === 'vi' ? 'Có lịch khám hoàn tất' : 'With completed visits'}</div>
        </div>

        <div className="detail-kpi-card">
          <div className="kpi-title">{language === 'vi' ? 'Cơ sở y tế phát sinh ca' : 'Active Facilities'}</div>
          <div className="kpi-num">{byClinic.length}</div>
          <div className="kpi-desc">{language === 'vi' ? 'Phòng khám & Bệnh viện' : 'Clinics & Hospitals'}</div>
        </div>

        <div className="detail-kpi-card">
          <div className="kpi-title">{language === 'vi' ? 'Chuyên khoa dẫn đầu' : 'Top Specialty'}</div>
          <div className="kpi-num" style={{ fontSize: '1.25rem', color: '#087F8C' }}>
            {topSpecialty?.specialtyName || '—'}
          </div>
          <div className="kpi-desc">{formatCurrencyVND(topSpecialty?.revenue)}</div>
        </div>

        <div className="detail-kpi-card">
          <div className="kpi-title">{language === 'vi' ? 'Cơ sở dẫn đầu' : 'Top Facility'}</div>
          <div className="kpi-num" style={{ fontSize: '1.25rem', color: '#059669' }}>
            {topClinic?.clinicName || '—'}
          </div>
          <div className="kpi-desc">{formatCurrencyVND(topClinic?.revenue)}</div>
        </div>
      </div>

      {/* 2-col tables: Specialties vs Clinics */}
      <div className="analytics-grid-2col">
        {/* Specialty Table */}
        <div className="analytics-card">
          <div className="card-title-row">
            <h2 className="card-title">{language === 'vi' ? 'Xếp hạng Chuyên khoa' : 'Specialty Ranking'}</h2>
            <span className="card-meta">{formatCurrencyVND(totalSpecialtyRev)}</span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="analytics-table">
              <thead>
                <tr>
                  <th>Hạng</th>
                  <th>Chuyên khoa</th>
                  <th>Lượt khám</th>
                  <th>Doanh thu</th>
                  <th>Tỷ trọng</th>
                </tr>
              </thead>
              <tbody>
                {bySpecialty.map((item, idx) => {
                  const share = totalSpecialtyRev > 0 ? ((item.revenue / totalSpecialtyRev) * 100).toFixed(1) : 0;
                  return (
                    <tr key={item.specialtyId || idx}>
                      <td style={{ fontWeight: 700, color: idx < 3 ? '#087F8C' : '#64748B' }}>
                        #{idx + 1}
                      </td>
                      <td style={{ fontWeight: 600 }}>{item.specialtyName}</td>
                      <td>{item.count} ca</td>
                      <td style={{ fontWeight: 700 }}>{formatCurrencyVND(item.revenue)}</td>
                      <td>
                        <span className="table-progress">
                          <span className="progress-bar" style={{ width: `${share}%` }} />
                        </span>
                        {share}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Clinic Table */}
        <div className="analytics-card">
          <div className="card-title-row">
            <h2 className="card-title">{language === 'vi' ? 'Xếp hạng Cơ sở Y tế' : 'Facility Ranking'}</h2>
            <span className="card-meta">{formatCurrencyVND(totalClinicRev)}</span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="analytics-table">
              <thead>
                <tr>
                  <th>Hạng</th>
                  <th>Cơ sở y tế</th>
                  <th>Lượt khám</th>
                  <th>Doanh thu</th>
                  <th>Tỷ trọng</th>
                </tr>
              </thead>
              <tbody>
                {byClinic.map((item, idx) => {
                  const share = totalClinicRev > 0 ? ((item.revenue / totalClinicRev) * 100).toFixed(1) : 0;
                  return (
                    <tr key={item.clinicId || idx}>
                      <td style={{ fontWeight: 700, color: idx < 3 ? '#059669' : '#64748B' }}>
                        #{idx + 1}
                      </td>
                      <td style={{ fontWeight: 600 }}>{item.clinicName}</td>
                      <td>{item.count} ca</td>
                      <td style={{ fontWeight: 700 }}>{formatCurrencyVND(item.revenue)}</td>
                      <td>
                        <span className="table-progress">
                          <span className="progress-bar" style={{ width: `${share}%`, background: '#059669' }} />
                        </span>
                        {share}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpecialtyClinicAnalytics;
