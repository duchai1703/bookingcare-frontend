// src/containers/System/Admin/Analytics/BookingAnalytics.jsx
// Detail Analytics: Booking Throughput, Status Breakdown & Cancellation Audits
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import {
  CalendarCheck,
  ArrowLeft,
  RotateCw,
  AlertCircle,
  ExternalLink,
  User,
  AlertTriangle,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { getBookingAnalyticsDetail } from '../../../../services/statisticService';
import { path } from '../../../../utils/constants';
import './AnalyticsShared.scss';

const STATUS_COLORS = {
  S1: '#F59E0B',
  'S1.5': '#F97316',
  S2: '#3B82F6',
  S3: '#10B981',
  S4: '#EF4444',
};

const formatCurrencyVND = (num) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0);
};

const BookingAnalytics = () => {
  const language = useSelector((state) => state.app.language);
  const [searchParams] = useSearchParams();
  const isCancellationTab = searchParams.get('tab') === 'cancellation';
  const cancelSectionRef = useRef(null);

  const [activePreset, setActivePreset] = useState('30d');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Cancellation table search, filter, and sort
  const [cancelSearch, setCancelSearch] = useState('');
  const [refundFilter, setRefundFilter] = useState('ALL');
  const [cancelSort, setCancelSort] = useState('date_desc');

  const fetchAnalytics = useCallback(async (signal) => {
    setLoading(true);
    setError('');
    try {
      const days = activePreset === '7d' ? 7 : activePreset === '90d' ? 90 : 30;
      const to = moment().endOf('day').valueOf();
      const from = moment().subtract(days, 'days').startOf('day').valueOf();

      const res = await getBookingAnalyticsDetail(from, to, { signal });
      if (res && res.errCode === 0) {
        setData(res.data);
      } else {
        setError(res?.errMessage || 'Không thể tải dữ liệu');
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
    fetchAnalytics(controller.signal);
    return () => controller.abort();
  }, [fetchAnalytics]);

  // Auto-scroll to cancellation audit table if opened via alert link
  useEffect(() => {
    if (isCancellationTab && cancelSectionRef.current) {
      setTimeout(() => {
        cancelSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    }
  }, [isCancellationTab, data]);

  const statusBreakdown = data?.statusBreakdown || [];
  const timeDistribution = data?.timeDistribution || data?.timeTypeBreakdown || [];
  const cancellations = data?.cancellations || { count: 0, refundTotal: 0, avgRefundPct: 0, recentList: [] };

  const filteredCancellations = useMemo(() => {
    let list = [...(cancellations.recentList || [])];

    if (cancelSearch.trim()) {
      const q = cancelSearch.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.patientName?.toLowerCase().includes(q) ||
          c.doctorName?.toLowerCase().includes(q) ||
          String(c.id).includes(q)
      );
    }

    if (refundFilter === 'HAS_REFUND') {
      list = list.filter((c) => (c.refundAmount || 0) > 0);
    } else if (refundFilter === 'NO_REFUND') {
      list = list.filter((c) => (c.refundAmount || 0) === 0);
    }

    list.sort((a, b) => {
      switch (cancelSort) {
        case 'date_asc':
          return (a.cancelledAt ? new Date(a.cancelledAt).getTime() : 0) - (b.cancelledAt ? new Date(b.cancelledAt).getTime() : 0);
        case 'refund_desc':
          return (b.refundAmount || 0) - (a.refundAmount || 0);
        case 'price_desc':
          return (b.bookingPrice || 0) - (a.bookingPrice || 0);
        case 'date_desc':
        default:
          return (b.cancelledAt ? new Date(b.cancelledAt).getTime() : 0) - (a.cancelledAt ? new Date(a.cancelledAt).getTime() : 0);
      }
    });

    return list;
  }, [cancellations.recentList, cancelSearch, refundFilter, cancelSort]);

  const totalBookings = statusBreakdown.reduce((sum, item) => sum + (parseInt(item.count, 10) || 0), 0);
  const completedCount = statusBreakdown.find((s) => s.statusId === 'S3')?.count || 0;
  const completionRate = totalBookings > 0 ? ((completedCount / totalBookings) * 100).toFixed(1) : 0;

  return (
    <div className="analytics-detail-page">
      {/* Breadcrumb */}
      <div className="analytics-breadcrumb">
        <Link to={path.DASHBOARD}>
          <ArrowLeft size={14} />
          <span>{language === 'vi' ? 'Tổng quan điều hành' : 'Executive Master'}</span>
        </Link>
        <span className="bc-separator">/</span>
        <span className="bc-current">{language === 'vi' ? 'Báo cáo Đặt lịch' : 'Booking Reports'}</span>
      </div>

      {/* Header */}
      <header className="analytics-header">
        <div className="header-left">
          <div className="header-badge">
            <CalendarCheck size={13} strokeWidth={2.5} />
            <span>Operational Booking Throughput</span>
          </div>
          <h1 className="page-title">
            {language === 'vi' ? 'Báo cáo Đặt lịch & Đối soát Ca khám' : 'Booking Reports & Audit Analytics'}
          </h1>
          <p className="page-subtitle">
            {language === 'vi'
              ? 'Chi tiết lưu lượng đặt khám theo trạng thái, khung giờ cao điểm và thống kê hoàn tiền'
              : 'Detailed throughput breakdown, peak consultation hours, and cancellation audits'}
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
            onClick={() => fetchAnalytics()}
          >
            <RotateCw size={14} className={loading ? 'fa-spin' : ''} />
            <span>{language === 'vi' ? 'Làm mới' : 'Refresh'}</span>
          </button>
        </div>
      </header>

      {/* Cancellation Tab Banner Alert */}
      {isCancellationTab && (
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
              ? 'Đang tập trung xem: Nhật ký Hủy lịch & Đối soát Hoàn tiền theo cảnh báo điều hành'
              : 'Focused View: Cancellation & Refund Audit Log triggered from operational alert'}
          </span>
        </div>
      )}

      {/* KPI Strip */}
      <div className="detail-kpi-strip">
        <div className="detail-kpi-card">
          <div className="kpi-title">{language === 'vi' ? 'Tổng ca đặt khám' : 'Total Bookings'}</div>
          <div className="kpi-num">{totalBookings.toLocaleString()}</div>
          <div className="kpi-desc">{language === 'vi' ? 'Trong kỳ thống kê' : 'Selected range'}</div>
        </div>

        <div className="detail-kpi-card">
          <div className="kpi-title">{language === 'vi' ? 'Hoàn thành khám (S3)' : 'Completed (S3)'}</div>
          <div className="kpi-num" style={{ color: '#059669' }}>
            {completedCount.toLocaleString()} ({completionRate}%)
          </div>
          <div className="kpi-desc">{language === 'vi' ? 'Tỷ lệ ca khám thành công' : 'Successful consults'}</div>
        </div>

        <div className="detail-kpi-card">
          <div className="kpi-title">{language === 'vi' ? 'Ca hủy khám (S4)' : 'Cancelled (S4)'}</div>
          <div className="kpi-num" style={{ color: '#E11D48' }}>
            {cancellations.count.toLocaleString()}
          </div>
          <div className="kpi-desc">
            {totalBookings > 0 ? ((cancellations.count / totalBookings) * 100).toFixed(1) : 0}% {language === 'vi' ? 'tổng số ca' : 'of total'}
          </div>
        </div>

        <div className="detail-kpi-card">
          <div className="kpi-title">{language === 'vi' ? 'Tổng tiền hoàn trả' : 'Total Refunded'}</div>
          <div className="kpi-num" style={{ color: '#E11D48' }}>
            {formatCurrencyVND(cancellations.refundTotal)}
          </div>
          <div className="kpi-desc">{language === 'vi' ? `Tỷ lệ hoàn bình quân: ${cancellations.avgRefundPct}%` : `Avg refund rate: ${cancellations.avgRefundPct}%`}</div>
        </div>
      </div>

      {/* Charts 2-col */}
      <div className="analytics-grid-2col">
        {/* Status Distribution */}
        <div className="analytics-card">
          <div className="card-title-row">
            <h2 className="card-title">{language === 'vi' ? 'Cơ cấu Trạng thái Đặt lịch' : 'Status Distribution'}</h2>
            <span className="card-meta">{totalBookings} {language === 'vi' ? 'ca' : 'records'}</span>
          </div>

          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusBreakdown}
                  dataKey="count"
                  nameKey={language === 'vi' ? 'nameVi' : 'nameEn'}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={3}
                >
                  {statusBreakdown.map((entry) => (
                    <Cell key={entry.statusId} fill={STATUS_COLORS[entry.statusId] || '#64748B'} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val, name, item) => [
                    `${val} ca (${totalBookings > 0 ? ((val / totalBookings) * 100).toFixed(1) : 0}%)`,
                    item.payload.nameVi || item.payload.nameEn,
                  ]}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Time slot distribution */}
        <div className="analytics-card">
          <div className="card-title-row">
            <h2 className="card-title">{language === 'vi' ? 'Phân bố Khung giờ Khám' : 'Time Slot Volume'}</h2>
            <span className="card-meta">{language === 'vi' ? 'Khung giờ T1 - T8' : 'Slots T1 - T8'}</span>
          </div>

          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timeDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="timeType" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(val, name, item) => [
                    `${val} ca khám`,
                    item.payload.timeVi || item.payload.timeType,
                  ]}
                />
                <Bar dataKey="count" fill="#087F8C" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Table: Cancellation Audit & Refund Log */}
      <div
        ref={cancelSectionRef}
        id="cancellation-audit-section"
        className="analytics-card"
        style={isCancellationTab ? { border: '2px solid #F59E0B', boxShadow: '0 4px 16px rgba(245, 158, 11, 0.15)' } : {}}
      >
        <div className="card-title-row">
          <h2 className="card-title">
            {language === 'vi' ? 'Nhật ký Hủy Lịch & Đối soát Hoàn tiền' : 'Cancellation & Refund Audit Log'}
          </h2>
          <span className="card-meta">
            {filteredCancellations.length}/{cancellations.recentList?.length || 0} {language === 'vi' ? 'ca hủy' : 'cancellations'}
          </span>
        </div>

        {/* Toolbar: Search, Refund Filter, Sort */}
        <div className="table-toolbar">
          <div className="toolbar-left">
            <div className="search-input-wrapper">
              <Search size={14} className="search-icon" />
              <input
                type="text"
                placeholder={language === 'vi' ? 'Tìm theo tên BN, bác sĩ, mã ca...' : 'Search patient, doctor, booking ID...'}
                value={cancelSearch}
                onChange={(e) => setCancelSearch(e.target.value)}
              />
            </div>

            <select
              className="filter-select"
              value={refundFilter}
              onChange={(e) => setRefundFilter(e.target.value)}
            >
              <option value="ALL">{language === 'vi' ? 'Tất cả trạng thái hoàn' : 'All Refund Statuses'}</option>
              <option value="HAS_REFUND">{language === 'vi' ? 'Có hoàn tiền (> 0đ)' : 'Has Refund (> 0)'}</option>
              <option value="NO_REFUND">{language === 'vi' ? 'Không hoàn tiền (0đ)' : 'No Refund (0đ)'}</option>
            </select>
          </div>

          <div className="toolbar-right">
            <span style={{ fontSize: '0.8rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: 4 }}>
              <SlidersHorizontal size={13} />
              {language === 'vi' ? 'Sắp xếp:' : 'Sort:'}
            </span>
            <select
              className="filter-select"
              value={cancelSort}
              onChange={(e) => setCancelSort(e.target.value)}
            >
              <option value="date_desc">{language === 'vi' ? 'Thời gian hủy (Mới nhất)' : 'Cancelled Date (Newest)'}</option>
              <option value="date_asc">{language === 'vi' ? 'Thời gian hủy (Cũ nhất)' : 'Cancelled Date (Oldest)'}</option>
              <option value="refund_desc">{language === 'vi' ? 'Tiền hoàn lại cao nhất' : 'Highest Refund'}</option>
              <option value="price_desc">{language === 'vi' ? 'Giá khám cao nhất' : 'Highest Price'}</option>
            </select>
          </div>
        </div>

        {filteredCancellations && filteredCancellations.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="analytics-table">
              <thead>
                <tr>
                  <th>Mã ca</th>
                  <th>Bệnh nhân</th>
                  <th>Bác sĩ khám</th>
                  <th>Giá khám</th>
                  <th>Tỷ lệ hoàn</th>
                  <th>Tiền hoàn lại</th>
                  <th>Thời gian hủy</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredCancellations.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 700 }}>#{item.id}</td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#0F172A' }}>{item.patientName || 'Bệnh nhân'}</div>
                    </td>
                    <td>{item.doctorName || 'Bác sĩ'}</td>
                    <td>{formatCurrencyVND(item.bookingPrice)}</td>
                    <td>
                      <span className="table-progress">
                        <span
                          className="progress-bar"
                          style={{ width: `${item.refundPercentage || 0}%`, background: '#EF4444' }}
                        />
                      </span>
                      {item.refundPercentage || 0}%
                    </td>
                    <td style={{ fontWeight: 700, color: '#E11D48' }}>
                      {formatCurrencyVND(item.refundAmount)}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: '#64748B' }}>
                      {item.cancelledAt ? moment(item.cancelledAt).format('HH:mm DD/MM/YYYY') : '—'}
                    </td>
                    <td>
                      <Link
                        to={item.patientId ? `/system/patients/${item.patientId}` : path.PATIENT_MANAGE}
                        className="btn-table-action"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: '0.78rem',
                          color: '#087F8C',
                          fontWeight: 600,
                          textDecoration: 'none',
                          padding: '4px 8px',
                          background: '#E6FFFA',
                          borderRadius: 6,
                          border: '1px solid #B2F5EA'
                        }}
                      >
                        <User size={12} />
                        <span>Hồ sơ BN →</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '30px 20px', color: '#64748B' }}>
            {language === 'vi' ? 'Không có ca hủy lịch nào trong khoảng thời gian này' : 'No cancellations in this period'}
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingAnalytics;
