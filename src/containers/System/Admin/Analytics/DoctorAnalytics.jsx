// src/containers/System/Admin/Analytics/DoctorAnalytics.jsx
// Detail Analytics: Doctor Capacity, Utilization Rates & Roster Load
import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { Link, useSearchParams } from 'react-router-dom';
import moment from 'moment';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import {
  UserCheck,
  ArrowLeft,
  RotateCw,
  Search,
  SlidersHorizontal,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Filter
} from 'lucide-react';
import { getDoctorCapacityDetail } from '../../../../services/statisticService';
import { path } from '../../../../utils/constants';
import './AnalyticsShared.scss';

const DoctorAnalytics = () => {
  const language = useSelector((state) => state.app.language);
  const [searchParams] = useSearchParams();
  const initialFilter = searchParams.get('filter') === 'low_capacity' ? 'low' : 'all';

  const [activePreset, setActivePreset] = useState('30d');
  const [filterType, setFilterType] = useState(initialFilter);
  const [searchTerm, setSearchTerm] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchCapacity = useCallback(async (signal) => {
    setLoading(true);
    setError('');
    try {
      const days = activePreset === '7d' ? 7 : activePreset === '90d' ? 90 : 30;
      const to = moment().endOf('day').valueOf();
      const from = moment().subtract(days, 'days').startOf('day').valueOf();

      const res = await getDoctorCapacityDetail(from, to, { signal });
      if (res && res.errCode === 0) {
        setData(res.data);
      } else {
        setError(res?.errMessage || 'Không thể tải dữ liệu công suất');
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
    fetchCapacity(controller.signal);
    return () => controller.abort();
  }, [fetchCapacity]);

  const summary = data?.summary || { totalDoctors: 0, totalSlots: 0, occupiedSlots: 0, avgUtilization: 0 };
  const doctors = data?.doctors || [];

  const filteredDoctors = doctors.filter((doc) => {
    const matchesSearch =
      doc.doctorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.specialtyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.clinicName?.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;
    if (filterType === 'low') return doc.utilizationRate < 40;
    if (filterType === 'high') return doc.utilizationRate >= 85;
    return true;
  });

  return (
    <div className="analytics-detail-page">
      {/* Breadcrumb */}
      <div className="analytics-breadcrumb">
        <Link to={path.DASHBOARD}>
          <ArrowLeft size={14} />
          <span>{language === 'vi' ? 'Tổng quan điều hành' : 'Executive Master'}</span>
        </Link>
        <span className="bc-separator">/</span>
        <span className="bc-current">{language === 'vi' ? 'Công suất & Bác sĩ' : 'Doctor Capacity'}</span>
      </div>

      {/* Header */}
      <header className="analytics-header">
        <div className="header-left">
          <div className="header-badge">
            <UserCheck size={13} strokeWidth={2.5} />
            <span>Clinical Workforce & Capacity Analytics</span>
          </div>
          <h1 className="page-title">
            {language === 'vi' ? 'Báo cáo Công suất & Hiệu suất Phục vụ Bác sĩ' : 'Doctor Workforce & Capacity Utilization'}
          </h1>
          <p className="page-subtitle">
            {language === 'vi'
              ? 'Giám sát tỷ lệ lấp đầy lịch khám, phát hiện bác sĩ quá tải hoặc thiếu lượt đặt để cân bằng phân bổ'
              : 'Monitor appointment fill rates, detect roster bottlenecks and balance clinical scheduling capacity'}
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
            onClick={() => fetchCapacity()}
          >
            <RotateCw size={14} className={loading ? 'fa-spin' : ''} />
            <span>{language === 'vi' ? 'Làm mới' : 'Refresh'}</span>
          </button>
        </div>
      </header>

      {/* Low Capacity Alert Banner */}
      {searchParams.get('filter') === 'low_capacity' && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 16px',
          background: '#FFFBEB',
          border: '1px solid #FDE68A',
          borderRadius: 8,
          marginBottom: 20,
          color: '#92400E',
          fontSize: '0.88rem',
          fontWeight: 600
        }}>
          <AlertTriangle size={18} color="#D97706" />
          <span>
            {language === 'vi'
              ? 'Đang lọc danh sách: Bác sĩ có công suất phục vụ dưới 40% cần điều phối thêm ca hoặc điều chỉnh lịch mở'
              : 'Filtered View: Doctors with utilization below 40% requiring schedule rebalancing'}
          </span>
        </div>
      )}

      {/* KPI Strip */}
      <div className="detail-kpi-strip">
        <div className="detail-kpi-card">
          <div className="kpi-title">{language === 'vi' ? 'Bác sĩ hoạt động' : 'Active Doctors'}</div>
          <div className="kpi-num">{summary.totalDoctors}</div>
          <div className="kpi-desc">{language === 'vi' ? 'Có mở lịch trong kỳ' : 'With scheduled slots'}</div>
        </div>

        <div className="detail-kpi-card">
          <div className="kpi-title">{language === 'vi' ? 'Tổng số slot mở' : 'Available Slots'}</div>
          <div className="kpi-num">{summary.totalSlots.toLocaleString()}</div>
          <div className="kpi-desc">{language === 'vi' ? 'Tổng công suất tối đa' : 'Total capacity pool'}</div>
        </div>

        <div className="detail-kpi-card">
          <div className="kpi-title">{language === 'vi' ? 'Số slot đã có bệnh nhân' : 'Occupied Slots'}</div>
          <div className="kpi-num" style={{ color: '#087F8C' }}>
            {summary.occupiedSlots.toLocaleString()}
          </div>
          <div className="kpi-desc">{language === 'vi' ? 'Lượt khám đã book' : 'Booked appointments'}</div>
        </div>

        <div className="detail-kpi-card">
          <div className="kpi-title">{language === 'vi' ? 'Công suất bình quân' : 'Average Utilization'}</div>
          <div className="kpi-num" style={{ color: summary.avgUtilization >= 60 ? '#059669' : '#D97706' }}>
            {summary.avgUtilization}%
          </div>
          <div className="kpi-desc">{language === 'vi' ? 'Tỷ lệ lấp đầy toàn viện' : 'System fill rate'}</div>
        </div>
      </div>

      {/* Doctor Capacity Roster Table */}
      <div className="analytics-card">
        <div className="card-title-row" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 className="card-title">
              {language === 'vi' ? 'Bảng Thống kê Công suất Khám Chi tiết' : 'Doctor Utilization Roster'}
            </h2>
            <span className="card-meta">
              {filteredDoctors.length} / {doctors.length} {language === 'vi' ? 'bác sĩ thỏa điều kiện' : 'doctors matching filter'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* Filter buttons */}
            <div style={{ display: 'flex', background: '#F1F5F9', padding: 2, borderRadius: 6 }}>
              <button
                style={{
                  border: 'none',
                  background: filterType === 'all' ? '#fff' : 'transparent',
                  padding: '4px 10px',
                  borderRadius: 4,
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  color: filterType === 'all' ? '#0F172A' : '#64748B',
                }}
                onClick={() => setFilterType('all')}
              >
                {language === 'vi' ? 'Tất cả' : 'All'}
              </button>
              <button
                style={{
                  border: 'none',
                  background: filterType === 'low' ? '#fff' : 'transparent',
                  padding: '4px 10px',
                  borderRadius: 4,
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  color: filterType === 'low' ? '#D97706' : '#64748B',
                }}
                onClick={() => setFilterType('low')}
              >
                {language === 'vi' ? 'Hiệu suất thấp (< 40%)' : 'Low (< 40%)'}
              </button>
              <button
                style={{
                  border: 'none',
                  background: filterType === 'high' ? '#fff' : 'transparent',
                  padding: '4px 10px',
                  borderRadius: 4,
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  color: filterType === 'high' ? '#059669' : '#64748B',
                }}
                onClick={() => setFilterType('high')}
              >
                {language === 'vi' ? 'Cao điểm (> 85%)' : 'High (> 85%)'}
              </button>
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder={language === 'vi' ? 'Tìm bác sĩ, khoa...' : 'Search doctor, specialty...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  border: '1px solid #CBD5E1',
                  borderRadius: 6,
                  padding: '5px 10px 5px 28px',
                  fontSize: '0.82rem',
                  width: 180,
                }}
              />
              <Search size={14} style={{ position: 'absolute', left: 8, top: 8, color: '#94A3B8' }} />
            </div>
          </div>
        </div>

        {filteredDoctors.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="analytics-table">
              <thead>
                <tr>
                  <th>Mã BS</th>
                  <th>Bác sĩ</th>
                  <th>Chuyên khoa</th>
                  <th>Cơ sở y tế</th>
                  <th>Tổng slot mở</th>
                  <th>Slot đã book</th>
                  <th>Công suất phục vụ</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredDoctors.map((doc) => {
                  const isLow = doc.utilizationRate < 40;
                  const isHigh = doc.utilizationRate >= 85;
                  const progressColor = isHigh ? '#059669' : isLow ? '#D97706' : '#087F8C';

                  return (
                    <tr key={doc.doctorId}>
                      <td style={{ fontWeight: 700 }}>#{doc.doctorId}</td>
                      <td style={{ fontWeight: 600 }}>{doc.doctorName}</td>
                      <td>{doc.specialtyName || '—'}</td>
                      <td>{doc.clinicName || '—'}</td>
                      <td>{doc.totalSlots} slot</td>
                      <td style={{ fontWeight: 600 }}>{doc.bookedSlots} slot</td>
                      <td>
                        <span className="table-progress">
                          <span
                            className="progress-bar"
                            style={{
                              width: `${Math.min(doc.utilizationRate, 100)}%`,
                              background: progressColor,
                            }}
                          />
                        </span>
                        <strong style={{ color: progressColor }}>{doc.utilizationRate}%</strong>
                      </td>
                      <td>
                        <Link
                          to={path.SCHEDULE_MANAGE}
                          style={{
                            fontSize: '0.78rem',
                            color: '#087F8C',
                            textDecoration: 'none',
                            fontWeight: 600,
                          }}
                        >
                          {language === 'vi' ? 'Điều chỉnh lịch' : 'Adjust'}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '30px 20px', color: '#64748B' }}>
            {language === 'vi' ? 'Không có bác sĩ nào thỏa điều kiện lọc' : 'No doctors matching criteria'}
          </div>
        )}
      </div>
    </div>
  );
};

export default DoctorAnalytics;
