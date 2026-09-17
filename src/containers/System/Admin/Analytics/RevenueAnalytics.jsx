// src/containers/System/Admin/Analytics/RevenueAnalytics.jsx
// Detail Analytics: Revenue, Cashflow, Doctor Contribution & Clinic Breakdown
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
  CircleDollarSign,
  ArrowLeft,
  RotateCw,
  Building2,
  Stethoscope,
  TrendingUp,
  Wallet
} from 'lucide-react';
import { getRevenueAnalyticsDetail } from '../../../../services/statisticService';
import { path } from '../../../../utils/constants';
import './AnalyticsShared.scss';

const formatCurrencyVND = (num) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0);
};

const RevenueAnalytics = () => {
  const language = useSelector((state) => state.app.language);
  const [activePreset, setActivePreset] = useState('30d');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchRevenue = useCallback(async (signal) => {
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
        setError(res?.errMessage || 'Không thể tải dữ liệu doanh thu');
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
    fetchRevenue(controller.signal);
    return () => controller.abort();
  }, [fetchRevenue]);

  const summary = data?.summary || { grossRevenue: 0, refundAmount: 0, netRevenue: 0, paidBookingsCount: 0, avgOrderValue: 0 };
  const byDoctor = data?.byDoctor || [];
  const byClinic = data?.byClinic || [];
  const bySpecialty = data?.bySpecialty || [];

  return (
    <div className="analytics-detail-page">
      {/* Breadcrumb */}
      <div className="analytics-breadcrumb">
        <Link to={path.DASHBOARD}>
          <ArrowLeft size={14} />
          <span>{language === 'vi' ? 'Tổng quan điều hành' : 'Executive Master'}</span>
        </Link>
        <span className="bc-separator">/</span>
        <span className="bc-current">{language === 'vi' ? 'Phân tích Doanh thu' : 'Revenue Analytics'}</span>
      </div>

      {/* Header */}
      <header className="analytics-header">
        <div className="header-left">
          <div className="header-badge">
            <CircleDollarSign size={13} strokeWidth={2.5} />
            <span>Financial & Cashflow Intelligence</span>
          </div>
          <h1 className="page-title">
            {language === 'vi' ? 'Báo cáo Doanh thu & Dòng tiền Y tế' : 'Revenue & Financial Flow Analytics'}
          </h1>
          <p className="page-subtitle">
            {language === 'vi'
              ? 'Phân tích doanh thu thực nhận, đối soát hoàn trả và đóng góp dòng tiền theo Bác sĩ & Cơ sở'
              : 'Net revenue analysis, refund reconciliations and financial contribution by Doctor & Facility'}
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
            onClick={() => fetchRevenue()}
          >
            <RotateCw size={14} className={loading ? 'fa-spin' : ''} />
            <span>{language === 'vi' ? 'Làm mới' : 'Refresh'}</span>
          </button>
        </div>
      </header>

      {/* KPI Strip */}
      <div className="detail-kpi-strip">
        <div className="detail-kpi-card">
          <div className="kpi-title">{language === 'vi' ? 'Doanh thu gộp (Gross)' : 'Gross Revenue'}</div>
          <div className="kpi-num">{formatCurrencyVND(summary.grossRevenue)}</div>
          <div className="kpi-desc">{summary.paidBookingsCount} {language === 'vi' ? 'ca thanh toán thành công' : 'paid bookings'}</div>
        </div>

        <div className="detail-kpi-card">
          <div className="kpi-title">{language === 'vi' ? 'Tổng hoàn tiền (Refund)' : 'Total Refunds'}</div>
          <div className="kpi-num" style={{ color: '#E11D48' }}>
            {formatCurrencyVND(summary.refundAmount)}
          </div>
          <div className="kpi-desc">{language === 'vi' ? 'Từ các ca hủy hẹn' : 'From cancelled bookings'}</div>
        </div>

        <div className="detail-kpi-card">
          <div className="kpi-title">{language === 'vi' ? 'Doanh thu thực nhận (Net)' : 'Net Revenue'}</div>
          <div className="kpi-num" style={{ color: '#059669' }}>
            {formatCurrencyVND(summary.netRevenue)}
          </div>
          <div className="kpi-desc">{language === 'vi' ? 'Sau khi trừ hoàn tiền' : 'After refund deductions'}</div>
        </div>

        <div className="detail-kpi-card">
          <div className="kpi-title">{language === 'vi' ? 'Giá trị khám bình quân (AOV)' : 'Average Order Value'}</div>
          <div className="kpi-num">{formatCurrencyVND(summary.avgOrderValue)}</div>
          <div className="kpi-desc">{language === 'vi' ? 'Bình quân mỗi ca khám' : 'Per completed consultation'}</div>
        </div>
      </div>

      {/* 2-col Revenue Breakdown by Facility & Specialty */}
      <div className="analytics-grid-2col">
        {/* Revenue by Clinic */}
        <div className="analytics-card">
          <div className="card-title-row">
            <h2 className="card-title">{language === 'vi' ? 'Doanh thu theo Phòng khám / Bệnh viện' : 'Revenue by Health Facility'}</h2>
            <span className="card-meta">{byClinic.length} {language === 'vi' ? 'cơ sở' : 'facilities'}</span>
          </div>

          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byClinic.slice(0, 6)} layout="vertical" margin={{ top: 10, right: 20, left: 40, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis type="number" tickFormatter={(v) => `${(v / 1000000).toFixed(0)}Tr`} tick={{ fontSize: 11 }} />
                <YAxis dataKey="clinicName" type="category" width={110} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(val) => [formatCurrencyVND(val), 'Doanh thu']} />
                <Bar dataKey="revenue" fill="#087F8C" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue by Specialty */}
        <div className="analytics-card">
          <div className="card-title-row">
            <h2 className="card-title">{language === 'vi' ? 'Doanh thu theo Chuyên khoa' : 'Revenue by Specialty'}</h2>
            <span className="card-meta">{bySpecialty.length} {language === 'vi' ? 'chuyên khoa' : 'specialties'}</span>
          </div>

          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bySpecialty.slice(0, 6)} layout="vertical" margin={{ top: 10, right: 20, left: 40, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis type="number" tickFormatter={(v) => `${(v / 1000000).toFixed(0)}Tr`} tick={{ fontSize: 11 }} />
                <YAxis dataKey="specialtyName" type="category" width={110} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(val) => [formatCurrencyVND(val), 'Doanh thu']} />
                <Bar dataKey="revenue" fill="#0EA5E9" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Table: Top Doctor Revenue Contribution */}
      <div className="analytics-card">
        <div className="card-title-row">
          <h2 className="card-title">
            {language === 'vi' ? 'Bảng Xếp hạng Doanh thu theo Bác sĩ' : 'Top Doctor Revenue Contributions'}
          </h2>
          <span className="card-meta">
            {byDoctor.length} {language === 'vi' ? 'bác sĩ có doanh thu' : 'active doctors'}
          </span>
        </div>

        {byDoctor && byDoctor.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="analytics-table">
              <thead>
                <tr>
                  <th>Xếp hạng</th>
                  <th>Bác sĩ</th>
                  <th>Chuyên khoa</th>
                  <th>Cơ sở y tế</th>
                  <th>Số ca hoàn tất</th>
                  <th>Tổng doanh thu</th>
                </tr>
              </thead>
              <tbody>
                {byDoctor.map((doc, idx) => (
                  <tr key={doc.doctorId || idx}>
                    <td style={{ fontWeight: 700, color: idx < 3 ? '#087F8C' : '#64748B' }}>
                      #{idx + 1}
                    </td>
                    <td style={{ fontWeight: 600 }}>{doc.doctorName}</td>
                    <td>{doc.specialtyName || '—'}</td>
                    <td>{doc.clinicName || '—'}</td>
                    <td>{doc.count} ca</td>
                    <td style={{ fontWeight: 700, color: '#0F172A' }}>
                      {formatCurrencyVND(doc.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '30px 20px', color: '#64748B' }}>
            {language === 'vi' ? 'Chưa có dữ liệu doanh thu trong khoảng thời gian này' : 'No revenue records'}
          </div>
        )}
      </div>
    </div>
  );
};

export default RevenueAnalytics;
