// src/containers/System/Admin/Analytics/PatientAnalytics.jsx
// Detail Analytics: Patient Demographics, Retention & Frequent Visitors
import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import moment from 'moment';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend
} from 'recharts';
import {
  Users,
  ArrowLeft,
  RotateCw,
  UserCheck,
  UserPlus,
  HeartHandshake
} from 'lucide-react';
import { getPatientAnalytics } from '../../../../services/statisticService';
import { path } from '../../../../utils/constants';
import './AnalyticsShared.scss';

const COHORT_COLORS = ['#087F8C', '#F59E0B'];
const GENDER_COLORS = ['#3B82F6', '#EC4899', '#94A3B8'];

const formatCurrencyVND = (num) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0);
};

const PatientAnalytics = () => {
  const language = useSelector((state) => state.app.language);
  const [activePreset, setActivePreset] = useState('30d');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchPatients = useCallback(async (signal) => {
    setLoading(true);
    setError('');
    try {
      const days = activePreset === '7d' ? 7 : activePreset === '90d' ? 90 : 30;
      const to = moment().endOf('day').valueOf();
      const from = moment().subtract(days, 'days').startOf('day').valueOf();

      const res = await getPatientAnalytics(from, to, { signal });
      if (res && res.errCode === 0) {
        setData(res.data);
      } else {
        setError(res?.errMessage || 'Không thể tải dữ liệu bệnh nhân');
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
    fetchPatients(controller.signal);
    return () => controller.abort();
  }, [fetchPatients]);

  const summary = data?.summary || { totalPatients: 0, newPatients: 0, returningPatients: 0, returningRate: 0 };
  const genderDistribution = data?.genderDistribution || [];
  const topPatients = data?.topPatients || [];

  const cohortData = [
    { name: language === 'vi' ? 'Bệnh nhân mới' : 'New Patients', value: summary.newPatients },
    { name: language === 'vi' ? 'Bệnh nhân tái khám' : 'Returning Patients', value: summary.returningPatients },
  ];

  return (
    <div className="analytics-detail-page">
      {/* Breadcrumb */}
      <div className="analytics-breadcrumb">
        <Link to={path.DASHBOARD}>
          <ArrowLeft size={14} />
          <span>{language === 'vi' ? 'Tổng quan điều hành' : 'Executive Master'}</span>
        </Link>
        <span className="bc-separator">/</span>
        <span className="bc-current">{language === 'vi' ? 'Hành vi Bệnh nhân' : 'Patient Intelligence'}</span>
      </div>

      {/* Header */}
      <header className="analytics-header">
        <div className="header-left">
          <div className="header-badge">
            <Users size={13} strokeWidth={2.5} />
            <span>Patient Intelligence & Cohorts</span>
          </div>
          <h1 className="page-title">
            {language === 'vi' ? 'Phân tích Hành vi & Nhân khẩu học Bệnh nhân' : 'Patient Demographics & Retention Analytics'}
          </h1>
          <p className="page-subtitle">
            {language === 'vi'
              ? 'Đánh giá tỷ lệ giữ chân bệnh nhân, cơ cấu nhân khẩu học và các bệnh nhân thân thiết'
              : 'Assess patient retention rates, demographic distribution and top frequent healthcare visitors'}
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
            onClick={() => fetchPatients()}
          >
            <RotateCw size={14} className={loading ? 'fa-spin' : ''} />
            <span>{language === 'vi' ? 'Làm mới' : 'Refresh'}</span>
          </button>
        </div>
      </header>

      {/* KPI Strip */}
      <div className="detail-kpi-strip">
        <div className="detail-kpi-card">
          <div className="kpi-title">{language === 'vi' ? 'Tổng số bệnh nhân' : 'Total Patients'}</div>
          <div className="kpi-num">{summary.totalPatients.toLocaleString()}</div>
          <div className="kpi-desc">{language === 'vi' ? 'Phát sinh ca khám trong kỳ' : 'With bookings in period'}</div>
        </div>

        <div className="detail-kpi-card">
          <div className="kpi-title">{language === 'vi' ? 'Bệnh nhân mới lần đầu' : 'New Patients'}</div>
          <div className="kpi-num" style={{ color: '#087F8C' }}>
            {summary.newPatients.toLocaleString()}
          </div>
          <div className="kpi-desc">{language === 'vi' ? 'Lần đầu sử dụng nền tảng' : 'First-time users'}</div>
        </div>

        <div className="detail-kpi-card">
          <div className="kpi-title">{language === 'vi' ? 'Bệnh nhân quay lại' : 'Returning Patients'}</div>
          <div className="kpi-num" style={{ color: '#059669' }}>
            {summary.returningPatients.toLocaleString()}
          </div>
          <div className="kpi-desc">{language === 'vi' ? 'Có lịch sử khám trước đó' : 'Prior appointments'}</div>
        </div>

        <div className="detail-kpi-card">
          <div className="kpi-title">{language === 'vi' ? 'Tỷ lệ quay lại (Retention)' : 'Retention Rate'}</div>
          <div className="kpi-num" style={{ color: '#059669' }}>
            {summary.returningRate}%
          </div>
          <div className="kpi-desc">{language === 'vi' ? 'Chỉ số trung thành bệnh nhân' : 'Patient loyalty indicator'}</div>
        </div>
      </div>

      {/* Charts 2-col */}
      <div className="analytics-grid-2col">
        {/* Cohort: New vs Returning */}
        <div className="analytics-card">
          <div className="card-title-row">
            <h2 className="card-title">{language === 'vi' ? 'Tỷ lệ Khách mới vs Quay lại' : 'New vs Returning Cohort'}</h2>
            <span className="card-meta">{summary.totalPatients} {language === 'vi' ? 'người' : 'patients'}</span>
          </div>

          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={cohortData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={4}
                >
                  {cohortData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COHORT_COLORS[index % COHORT_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gender Demographics */}
        <div className="analytics-card">
          <div className="card-title-row">
            <h2 className="card-title">{language === 'vi' ? 'Cơ cấu Giới tính Bệnh nhân' : 'Gender Distribution'}</h2>
            <span className="card-meta">{language === 'vi' ? 'Nam / Nữ / Khác' : 'Demographics'}</span>
          </div>

          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={genderDistribution}
                  dataKey="count"
                  nameKey="gender"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={4}
                >
                  {genderDistribution.map((entry, index) => (
                    <Cell key={`gender-${index}`} fill={GENDER_COLORS[index % GENDER_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Table: Frequent Patients */}
      <div className="analytics-card">
        <div className="card-title-row">
          <h2 className="card-title">
            {language === 'vi' ? 'Bệnh nhân Đặt khám Thường xuyên' : 'Top Frequent Healthcare Patients'}
          </h2>
          <span className="card-meta">
            {topPatients.length} {language === 'vi' ? 'bệnh nhân tiêu biểu' : 'frequent patients'}
          </span>
        </div>

        {topPatients && topPatients.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="analytics-table">
              <thead>
                <tr>
                  <th>Mã BN</th>
                  <th>Họ tên</th>
                  <th>Email</th>
                  <th>Số điện thoại</th>
                  <th>Tổng lượt đặt</th>
                  <th>Khám hoàn tất</th>
                  <th>Tổng chi tiêu</th>
                  <th style={{ textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {topPatients.map((p) => (
                  <tr key={p.patientId}>
                    <td style={{ fontWeight: 700 }}>#{p.patientId}</td>
                    <td style={{ fontWeight: 600 }}>{p.patientName}</td>
                    <td>{p.email}</td>
                    <td>{p.phoneNumber || '—'}</td>
                    <td style={{ fontWeight: 600 }}>{p.totalBookings || p.bookingCount || 0} ca</td>
                    <td style={{ color: '#059669', fontWeight: 600 }}>{p.completedBookings || 0} ca</td>
                    <td style={{ fontWeight: 700 }}>{formatCurrencyVND(p.totalSpent)}</td>
                    <td style={{ textAlign: 'center' }}>
                      <Link
                        to={`/system/patients/${p.patientId}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '4px 8px',
                          background: '#F0FDFA',
                          border: '1px solid #99F6E4',
                          borderRadius: 6,
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          color: '#0F766E',
                          textDecoration: 'none'
                        }}
                      >
                        <span>Hồ sơ BN</span>
                        <span>→</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '30px 20px', color: '#64748B' }}>
            {language === 'vi' ? 'Không có dữ liệu bệnh nhân thường xuyên' : 'No frequent patients data'}
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientAnalytics;
