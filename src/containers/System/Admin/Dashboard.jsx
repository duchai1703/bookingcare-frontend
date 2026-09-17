// src/containers/System/Admin/Dashboard.jsx
// Executive Master Dashboard — Clinical Operations & Intelligence Nerve Center
import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useIntl } from 'react-intl';
import { useNavigate, Link } from 'react-router-dom';
import moment from 'moment';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import {
  Activity,
  CalendarCheck,
  CircleDollarSign,
  UserCheck,
  Users,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  RotateCw,
  SlidersHorizontal,
  ChevronRight,
  Clock,
  Layers,
  Building2,
  CalendarDays,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ExternalLink
} from 'lucide-react';
import {
  getExecutiveMaster,
  getBookingAnalyticsDetail,
} from '../../../services/statisticService';
import { path } from '../../../utils/constants';
import './Dashboard.scss';

const FILTER_PRESETS = [
  { key: '7d', labelVi: '7 ngày qua', labelEn: 'Last 7 days', days: 7 },
  { key: '30d', labelVi: '30 ngày qua', labelEn: 'Last 30 days', days: 30 },
  { key: '90d', labelVi: 'Quý này (90d)', labelEn: 'Quarter (90d)', days: 90 },
  { key: 'custom', labelVi: 'Tùy chọn', labelEn: 'Custom', days: null },
];

const TIME_SLOT_LABELS = {
  T1: '08:00 - 09:00',
  T2: '09:00 - 10:00',
  T3: '10:00 - 11:00',
  T4: '11:00 - 12:00',
  T5: '13:00 - 14:00',
  T6: '14:00 - 15:00',
  T7: '15:00 - 16:00',
  T8: '16:00 - 17:00',
};

const DAY_OF_WEEK_NAMES = [
  { dow: 1, nameVi: 'Thứ 2', nameEn: 'Mon' },
  { dow: 2, nameVi: 'Thứ 3', nameEn: 'Tue' },
  { dow: 3, nameVi: 'Thứ 4', nameEn: 'Wed' },
  { dow: 4, nameVi: 'Thứ 5', nameEn: 'Thu' },
  { dow: 5, nameVi: 'Thứ 6', nameEn: 'Fri' },
  { dow: 6, nameVi: 'Thứ 7', nameEn: 'Sat' },
  { dow: 0, nameVi: 'Chủ nhật', nameEn: 'Sun' },
];

const formatCurrencyVND = (num) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0);
};

const Dashboard = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const language = useSelector((state) => state.app.language);

  // Mode: 'executive' (Tổng quan chiến lược) vs 'daily' (Điều phối trong ngày)
  const [viewMode, setViewMode] = useState('executive');

  // Filter state
  const [activePreset, setActivePreset] = useState('30d');
  const [showCustomRange, setShowCustomRange] = useState(false);
  const [customFrom, setCustomFrom] = useState(moment().subtract(30, 'days').format('YYYY-MM-DD'));
  const [customTo, setCustomTo] = useState(moment().format('YYYY-MM-DD'));

  // Data state
  const [masterData, setMasterData] = useState(null);
  const [dailyBookings, setDailyBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Calculate timestamp range
  const getTimeRange = useCallback(() => {
    if (activePreset === 'custom') {
      const from = moment(customFrom).startOf('day').valueOf();
      const to = moment(customTo).endOf('day').valueOf();
      const duration = to - from;
      return {
        from,
        to,
        cmpFrom: from - duration,
        cmpTo: from,
      };
    }
    const preset = FILTER_PRESETS.find((p) => p.key === activePreset) || FILTER_PRESETS[1];
    const to = moment().endOf('day').valueOf();
    const from = moment().subtract(preset.days, 'days').startOf('day').valueOf();
    const duration = to - from;
    return {
      from,
      to,
      cmpFrom: from - duration,
      cmpTo: from,
    };
  }, [activePreset, customFrom, customTo]);

  // Fetch Executive Master Data
  const fetchData = useCallback(async (signal) => {
    setLoading(true);
    setError('');
    try {
      const { from, to, cmpFrom, cmpTo } = getTimeRange();
      const res = await getExecutiveMaster(from, to, cmpFrom, cmpTo, { signal });
      if (res && res.errCode === 0) {
        setMasterData(res.data);
      } else {
        setError(res?.errMessage || 'Không thể tải dữ liệu điều hành');
      }

      // Fetch today's operational queue for daily mode
      const todayStart = moment().startOf('day').valueOf();
      const todayEnd = moment().endOf('day').valueOf();
      const todayRes = await getBookingAnalyticsDetail(todayStart, todayEnd, { signal });
      if (todayRes && todayRes.errCode === 0) {
        setDailyBookings(todayRes.data?.cancellations?.recentList || []);
      }
    } catch (err) {
      if (err.name !== 'CanceledError' && err.name !== 'AbortError') {
        console.error('>>> Fetch Executive Master Error:', err);
        setError('Có lỗi xảy ra khi kết nối máy chủ thống kê');
      }
    } finally {
      setLoading(false);
    }
  }, [getTimeRange]);

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, [fetchData, language]);

  const handlePresetSelect = (presetKey) => {
    setActivePreset(presetKey);
    if (presetKey === 'custom') {
      setShowCustomRange(true);
    } else {
      setShowCustomRange(false);
    }
  };

  const getNum = (v, defaultVal = 0) => {
    if (typeof v === 'number' && !isNaN(v)) return v;
    if (v && typeof v === 'object' && typeof v.value === 'number' && !isNaN(v.value)) return v.value;
    return defaultVal;
  };

  const rawKpis = masterData?.kpis || {};
  const kpis = {
    totalBookings: getNum(rawKpis.totalBookings),
    totalBookingsDelta: getNum(rawKpis.totalBookingsDelta ?? rawKpis.totalBookings?.diff),
    completedBookings: getNum(rawKpis.completedBookings ?? rawKpis.completionRate?.completedCount),
    completionRate: getNum(rawKpis.completionRate),
    cancelledBookings: getNum(rawKpis.cancelledBookings ?? rawKpis.cancellationRate?.cancelledCount),
    cancellationRate: getNum(rawKpis.cancellationRate),
    grossRevenue: getNum(rawKpis.grossRevenue ?? rawKpis.netRevenue?.gross),
    refundAmount: getNum(rawKpis.refundAmount ?? rawKpis.netRevenue?.refund),
    netRevenue: getNum(rawKpis.netRevenue),
    netRevenueDelta: getNum(rawKpis.netRevenueDelta ?? rawKpis.netRevenue?.diff),
    utilizationRate: getNum(rawKpis.utilizationRate ?? rawKpis.capacity?.utilizationRate),
    totalOccupiedSlots: getNum(rawKpis.totalOccupiedSlots ?? rawKpis.capacity?.occupiedSlots),
    totalCapacitySlots: getNum(rawKpis.totalCapacitySlots ?? rawKpis.capacity?.totalSlots),
    activeDoctors: getNum(rawKpis.activeDoctors),
    totalPatients: getNum(rawKpis.totalPatients ?? rawKpis.patients?.total),
    newPatients: getNum(rawKpis.newPatients ?? rawKpis.patients?.new),
    returningPatients: getNum(rawKpis.returningPatients ?? rawKpis.patients?.returning),
    returningRate: getNum(rawKpis.returningRate),
  };

  const funnel = Array.isArray(masterData?.funnel) ? masterData.funnel : [];
  const alerts = Array.isArray(masterData?.attentionAlerts) ? masterData.attentionAlerts : [];
  const heatmapRows = Array.isArray(masterData?.heatmap) ? masterData.heatmap : [];
  const dailyTrend = Array.isArray(masterData?.dailyTrend) ? masterData.dailyTrend : [];
  const topSpecialties = Array.isArray(masterData?.topSpecialties)
    ? masterData.topSpecialties
    : Array.isArray(masterData?.revenueBySpecialty)
      ? masterData.revenueBySpecialty
      : [];

  // Build heatmap lookup map: key = `${dow}_${timeType}` -> count
  const heatmapMap = {};
  let maxHeatCount = 1;
  heatmapRows.forEach((row) => {
    const key = `${row.dayOfWeek}_${row.timeType}`;
    const c = parseInt(row.count, 10) || 0;
    heatmapMap[key] = c;
    if (c > maxHeatCount) maxHeatCount = c;
  });

  const getHeatmapClass = (count) => {
    if (!count || count === 0) return 'lvl-0';
    const ratio = count / maxHeatCount;
    if (ratio < 0.25) return 'lvl-1';
    if (ratio < 0.5) return 'lvl-2';
    if (ratio < 0.75) return 'lvl-3';
    return 'lvl-4';
  };

  return (
    <div className="clinical-dashboard-container">
      {/* ===== HEADER ===== */}
      <header className="dashboard-header">
        <div className="header-left">
          <div className="badge-system">
            <Activity size={13} strokeWidth={2.5} />
            <span>BookingCare Operations Intelligence</span>
          </div>
          <h1 className="dashboard-title">
            {language === 'vi' ? 'Trung tâm Điều hành & Phân tích Đặt khám' : 'Clinical Operations & Intelligence Nerve Center'}
          </h1>
          <p className="dashboard-subtitle">
            {language === 'vi'
              ? 'Hệ thống giám sát chỉ số tăng trưởng, công suất phục vụ bác sĩ & chất lượng ca khám'
              : 'Enterprise monitoring of patient booking velocity, doctor utilization & clinical throughput'}
          </p>
        </div>

        <div className="header-controls">
          {/* Dual Mode Switcher */}
          <div className="mode-switcher">
            <button
              className={`btn-mode ${viewMode === 'executive' ? 'active' : ''}`}
              onClick={() => setViewMode('executive')}
            >
              <Activity size={15} />
              <span>{language === 'vi' ? 'Chiến lược' : 'Executive'}</span>
            </button>
            <button
              className={`btn-mode ${viewMode === 'daily' ? 'active' : ''}`}
              onClick={() => setViewMode('daily')}
            >
              <Clock size={15} />
              <span>{language === 'vi' ? 'Vận hành ngày' : 'Daily Live'}</span>
            </button>
          </div>

          {/* Time Presets */}
          <div className="filter-presets">
            {FILTER_PRESETS.map((p) => (
              <button
                key={p.key}
                className={`btn-preset ${activePreset === p.key ? 'active' : ''}`}
                onClick={() => handlePresetSelect(p.key)}
              >
                {language === 'vi' ? p.labelVi : p.labelEn}
              </button>
            ))}
          </div>

          {/* Refresh button */}
          <button
            className={`btn-refresh ${loading ? 'loading' : ''}`}
            onClick={() => fetchData()}
            title="Làm mới dữ liệu"
          >
            <RotateCw size={15} className={loading ? 'fa-spin' : ''} />
            <span>{loading ? (language === 'vi' ? 'Đang tải...' : 'Syncing...') : (language === 'vi' ? 'Cập nhật' : 'Sync')}</span>
          </button>
        </div>
      </header>

      {/* ===== CUSTOM DATE RIBBON ===== */}
      {showCustomRange && (
        <div className="custom-date-ribbon">
          <div className="date-input-group">
            <label>{language === 'vi' ? 'Từ ngày:' : 'From:'}</label>
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
            />
          </div>
          <div className="date-input-group">
            <label>{language === 'vi' ? 'Đến ngày:' : 'To:'}</label>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
            />
          </div>
          <button className="btn-apply-custom" onClick={() => fetchData()}>
            {language === 'vi' ? 'Áp dụng bộ lọc' : 'Apply Range'}
          </button>
        </div>
      )}

      {/* ===== ATTENTION ENGINE: OPERATIONAL ALERTS ===== */}
      {alerts && alerts.length > 0 && (
        <section className="attention-engine-section">
          {alerts.map((alert) => (
            <div key={alert.id} className={`attention-card ${alert.type}`}>
              <div className="alert-body">
                <AlertTriangle size={18} className="alert-icon" />
                <div>
                  <div className="alert-title">{alert.title}</div>
                  <div className="alert-desc">{alert.description}</div>
                </div>
              </div>
              {alert.actionUrl && (
                <Link to={alert.actionUrl} className="btn-action">
                  <span>{alert.actionText || 'Xử lý ngay'}</span>
                  <ExternalLink size={14} />
                </Link>
              )}
            </div>
          ))}
        </section>
      )}

      {/* ===== MODE 1: EXECUTIVE STRATEGY VIEW ===== */}
      {viewMode === 'executive' && (
        <>
          {/* TIER 1: 4 EXECUTIVE KPI CARDS */}
          <section className="kpi-grid">
            {/* Card 1: Total Bookings */}
            <div className="kpi-card interactive" onClick={() => navigate(path.ANALYTICS_BOOKINGS)}>
              <div className="kpi-top">
                <span className="kpi-label">{language === 'vi' ? 'Tổng lượt đặt khám' : 'Total Bookings'}</span>
                <div className="kpi-icon-wrap">
                  <CalendarCheck size={18} />
                </div>
              </div>
              <div className="kpi-value-row">
                <span className="kpi-value">{kpis.totalBookings.toLocaleString()}</span>
                <span className={`kpi-delta ${kpis.totalBookingsDelta >= 0 ? 'positive' : 'negative'}`}>
                  {kpis.totalBookingsDelta >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                  {Math.abs(kpis.totalBookingsDelta)}%
                </span>
              </div>
              <div className="kpi-subtext">
                <span>{language === 'vi' ? 'Hoàn thành khám (S3):' : 'Completed:'}</span>
                <strong>{kpis.completedBookings} ({kpis.completionRate}%)</strong>
              </div>
              <div className="kpi-action-link">
                <span>{language === 'vi' ? 'Xem chi tiết lưu lượng đặt khám' : 'View booking breakdown'}</span>
                <ChevronRight size={14} />
              </div>
            </div>

            {/* Card 2: Net Revenue */}
            <div className="kpi-card interactive" onClick={() => navigate(path.ANALYTICS_REVENUE)}>
              <div className="kpi-top">
                <span className="kpi-label">{language === 'vi' ? 'Doanh thu thực nhận' : 'Net Revenue'}</span>
                <div className="kpi-icon-wrap">
                  <CircleDollarSign size={18} />
                </div>
              </div>
              <div className="kpi-value-row">
                <span className="kpi-value">{formatCurrencyVND(kpis.netRevenue)}</span>
                <span className={`kpi-delta ${kpis.netRevenueDelta >= 0 ? 'positive' : 'negative'}`}>
                  {kpis.netRevenueDelta >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                  {Math.abs(kpis.netRevenueDelta)}%
                </span>
              </div>
              <div className="kpi-subtext">
                <span>{language === 'vi' ? 'Tổng hoàn tiền (S4):' : 'Refunds:'}</span>
                <strong>{formatCurrencyVND(kpis.refundAmount)}</strong>
              </div>
              <div className="kpi-action-link">
                <span>{language === 'vi' ? 'Xem chi tiết dòng tiền & hoàn tiền' : 'View cashflow & refunds'}</span>
                <ChevronRight size={14} />
              </div>
            </div>

            {/* Card 3: Doctor Capacity Utilization */}
            <div className="kpi-card interactive" onClick={() => navigate(path.ANALYTICS_DOCTORS)}>
              <div className="kpi-top">
                <span className="kpi-label">{language === 'vi' ? 'Công suất Bác sĩ' : 'Doctor Utilization'}</span>
                <div className="kpi-icon-wrap">
                  <UserCheck size={18} />
                </div>
              </div>
              <div className="kpi-value-row">
                <span className="kpi-value">{kpis.utilizationRate}%</span>
                <span className={`kpi-delta ${kpis.utilizationRate >= 60 ? 'positive' : 'neutral'}`}>
                  {kpis.activeDoctors} {language === 'vi' ? 'bác sĩ mở ca' : 'active'}
                </span>
              </div>
              <div className="kpi-subtext">
                <span>{language === 'vi' ? 'Slot đã đặt / Tổng mở:' : 'Slots Booked / Total:'}</span>
                <strong>{kpis.totalOccupiedSlots} / {kpis.totalCapacitySlots}</strong>
              </div>
              <div className="kpi-action-link">
                <span>{language === 'vi' ? 'Xem chi tiết công suất bác sĩ' : 'View doctor capacity'}</span>
                <ChevronRight size={14} />
              </div>
            </div>

            {/* Card 4: Patient Cohort (Returning Rate) */}
            <div className="kpi-card interactive" onClick={() => navigate(path.ANALYTICS_PATIENTS)}>
              <div className="kpi-top">
                <span className="kpi-label">{language === 'vi' ? 'Bệnh nhân tái khám' : 'Returning Patients'}</span>
                <div className="kpi-icon-wrap">
                  <Users size={18} />
                </div>
              </div>
              <div className="kpi-value-row">
                <span className="kpi-value">{kpis.returningRate}%</span>
                <span className="kpi-delta positive">
                  {kpis.returningPatients} {language === 'vi' ? 'tái khám' : 'returning'}
                </span>
              </div>
              <div className="kpi-subtext">
                <span>{language === 'vi' ? 'Bệnh nhân mới lần đầu:' : 'New Patients:'}</span>
                <strong>{kpis.newPatients} / {kpis.totalPatients}</strong>
              </div>
              <div className="kpi-action-link">
                <span>{language === 'vi' ? 'Xem chi tiết hành vi bệnh nhân' : 'View patient cohorts'}</span>
                <ChevronRight size={14} />
              </div>
            </div>
          </section>

          {/* TIER 2: TREND CHART & BOOKING FUNNEL */}
          <div className="dashboard-grid-2col">
            {/* Left: Trend Line/Area Chart */}
            <div className="ops-card">
              <div className="card-header-clean">
                <div className="card-title-group">
                  <Activity size={17} className="text-teal" />
                  <h2 className="card-title">
                    {language === 'vi' ? 'Xu hướng Lượt khám & Doanh thu theo Ngày' : 'Daily Booking & Revenue Trend'}
                  </h2>
                </div>
                <Link to={path.ANALYTICS_BOOKINGS} className="card-drilldown-link">
                  <span>{language === 'vi' ? 'Xem chi tiết' : 'Drill-down'}</span>
                  <ChevronRight size={14} />
                </Link>
              </div>

              <div style={{ width: '100%', height: 280 }}>
                {dailyTrend && dailyTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dailyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#087F8C" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#087F8C" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis
                        dataKey="dateStr"
                        tick={{ fontSize: 11, fill: '#64748B' }}
                        tickLine={false}
                        axisLine={{ stroke: '#E2E8F0' }}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#64748B' }}
                        tickLine={false}
                        axisLine={{ stroke: '#E2E8F0' }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0F172A',
                          border: 'none',
                          borderRadius: '6px',
                          color: '#FFFFFF',
                          fontSize: '12px',
                        }}
                        formatter={(val, name) => [
                          name === 'bookings' ? `${val} ca hẹn` : formatCurrencyVND(val),
                          name === 'bookings' ? 'Số ca đặt' : 'Doanh thu',
                        ]}
                      />
                      <Area
                        type="monotone"
                        dataKey="bookings"
                        stroke="#087F8C"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#colorBookings)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="tw-h-full tw-flex tw-items-center tw-justify-center tw-text-slate-400 tw-text-sm">
                    {language === 'vi' ? 'Chưa có dữ liệu đặt lịch theo ngày trong khoảng này' : 'No daily trend data'}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Booking Conversion Funnel */}
            <div className="ops-card">
              <div className="card-header-clean">
                <div className="card-title-group">
                  <Layers size={17} className="text-teal" />
                  <h2 className="card-title">
                    {language === 'vi' ? 'Phễu Chuyển đổi Đặt khám' : 'Booking Conversion Funnel'}
                  </h2>
                </div>
                <Link to={path.ANALYTICS_BOOKINGS} className="card-drilldown-link">
                  <span>{language === 'vi' ? 'Tỷ lệ rớt' : 'Dropoff'}</span>
                  <ChevronRight size={14} />
                </Link>
              </div>

              <div className="funnel-container">
                {funnel.map((item, idx) => (
                  <div
                    key={item.step}
                    className={`funnel-step ${item.step === 'S4_CANCELLED' ? 'step-cancelled' : ''}`}
                  >
                    <div
                      className="funnel-progress-fill"
                      style={{ width: `${Math.min(item.percentage, 100)}%` }}
                    />
                    <div className="funnel-step-content">
                      <div className={`step-info ${item.step === 'S4_CANCELLED' ? 'cancelled' : ''}`}>
                        <div className="step-badge">{idx + 1}</div>
                        <span className="step-name">{item.label}</span>
                      </div>
                      <div className="step-stats">
                        <span className="step-count">{item.count.toLocaleString()}</span>
                        <span className="step-pct"> ({item.percentage}%)</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* TIER 3: TOP SPECIALTIES & BOOKING HEATMAP */}
          <div className="dashboard-grid-2col">
            {/* Left: Top Revenue Specialties */}
            <div className="ops-card">
              <div className="card-header-clean">
                <div className="card-title-group">
                  <Building2 size={17} className="text-teal" />
                  <h2 className="card-title">
                    {language === 'vi' ? 'Top Chuyên khoa theo Doanh thu' : 'Top Specialties by Revenue'}
                  </h2>
                </div>
                <Link to={path.ANALYTICS_SPECIALTIES} className="card-drilldown-link">
                  <span>{language === 'vi' ? 'Xem tất cả' : 'View all'}</span>
                  <ChevronRight size={14} />
                </Link>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {topSpecialties && topSpecialties.length > 0 ? (
                  topSpecialties.map((spec, i) => (
                    <div key={spec.specialtyId || i} style={{ fontSize: '0.85rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 600, color: '#334155' }}>
                          {i + 1}. {spec.specialtyName}
                        </span>
                        <span style={{ fontWeight: 700, color: '#0F172A' }}>
                          {formatCurrencyVND(spec.revenue)} ({spec.count} ca)
                        </span>
                      </div>
                      <div style={{ height: 6, background: '#F1F5F9', borderRadius: 3, overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            background: '#087F8C',
                            width: `${topSpecialties[0]?.revenue > 0 ? (spec.revenue / topSpecialties[0].revenue) * 100 : 0}%`,
                            borderRadius: 3,
                          }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="tw-text-center tw-text-slate-400 tw-py-8">
                    {language === 'vi' ? 'Không có dữ liệu chuyên khoa' : 'No specialty data'}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Booking Heatmap (Day of week x Time slot) */}
            <div className="ops-card heatmap-section">
              <div className="card-header-clean">
                <div className="card-title-group">
                  <CalendarDays size={17} className="text-teal" />
                  <h2 className="card-title">
                    {language === 'vi' ? 'Bản đồ Nhiệt Giờ Cao điểm' : 'Booking Heatmap'}
                  </h2>
                </div>
                <Link to={path.ANALYTICS_BOOKINGS} className="card-drilldown-link">
                  <span>{language === 'vi' ? 'Xem phân bổ khung giờ' : 'View slot volume'}</span>
                  <ChevronRight size={14} />
                </Link>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="heatmap-grid-table">
                  <thead>
                    <tr>
                      <th className="th-slot">{language === 'vi' ? 'Khung giờ' : 'Slot'}</th>
                      {DAY_OF_WEEK_NAMES.map((d) => (
                        <th key={d.dow}>{language === 'vi' ? d.nameVi : d.nameEn}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8'].map((slotKey) => (
                      <tr key={slotKey}>
                        <td className="td-slot-label">{TIME_SLOT_LABELS[slotKey]}</td>
                        {DAY_OF_WEEK_NAMES.map((d) => {
                          const cellKey = `${d.dow}_${slotKey}`;
                          const count = heatmapMap[cellKey] || 0;
                          return (
                            <td key={d.dow}>
                              <div
                                className={`heat-cell ${getHeatmapClass(count)}`}
                                title={`${d.nameVi} (${TIME_SLOT_LABELS[slotKey]}): ${count} ca khám`}
                              >
                                {count > 0 ? count : '·'}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="heatmap-legend">
                <span>{language === 'vi' ? 'Mức độ tải:' : 'Intensity:'}</span>
                <div className="legend-swatches">
                  <span style={{ background: '#f8fafc', border: '1px solid #cbd5e1' }} title="0 ca" />
                  <span style={{ background: '#e0f2fe' }} title="Thấp" />
                  <span style={{ background: '#bae6fd' }} title="Bình thường" />
                  <span style={{ background: '#38bdf8' }} title="Cao" />
                  <span style={{ background: '#0284c7' }} title="Cao điểm" />
                </div>
                <span style={{ marginLeft: 'auto', fontSize: '0.74rem' }}>
                  {language === 'vi' ? 'Đậm màu = Giờ cao điểm' : 'Darker = Higher volume'}
                </span>
              </div>
            </div>
          </div>

          {/* TIER 4: PROGRESSIVE DISCLOSURE DRILL-DOWN HUB */}
          <section className="drilldown-hub">
            <Link to={path.ANALYTICS_BOOKINGS} className="drilldown-card">
              <div className="hub-icon">
                <CalendarCheck size={20} />
              </div>
              <div className="hub-text">
                <div className="hub-title">{language === 'vi' ? 'Báo cáo Đặt lịch' : 'Booking Reports'}</div>
                <div className="hub-desc">{language === 'vi' ? 'Tỷ lệ hoàn thành, hủy lịch & lý do hoàn tiền' : 'Throughput & cancellation breakdown'}</div>
              </div>
            </Link>

            <Link to={path.ANALYTICS_REVENUE} className="drilldown-card">
              <div className="hub-icon">
                <CircleDollarSign size={20} />
              </div>
              <div className="hub-text">
                <div className="hub-title">{language === 'vi' ? 'Phân tích Doanh thu' : 'Revenue Analytics'}</div>
                <div className="hub-desc">{language === 'vi' ? 'Dòng tiền theo Bác sĩ, Cơ sở & Chuyên khoa' : 'Cashflow by Doctor & Clinic'}</div>
              </div>
            </Link>

            <Link to={path.ANALYTICS_DOCTORS} className="drilldown-card">
              <div className="hub-icon">
                <UserCheck size={20} />
              </div>
              <div className="hub-text">
                <div className="hub-title">{language === 'vi' ? 'Công suất Bác sĩ' : 'Doctor Capacity'}</div>
                <div className="hub-desc">{language === 'vi' ? 'Tỷ lệ lấp đầy slot & bác sĩ hiệu suất thấp' : 'Utilization rates & roster load'}</div>
              </div>
            </Link>

            <Link to={path.ANALYTICS_PATIENTS} className="drilldown-card">
              <div className="hub-icon">
                <Users size={20} />
              </div>
              <div className="hub-text">
                <div className="hub-title">{language === 'vi' ? 'Hành vi Bệnh nhân' : 'Patient Intelligence'}</div>
                <div className="hub-desc">{language === 'vi' ? 'Tỷ lệ quay lại, giới tính & khách hàng thân thiết' : 'Retention & top frequent visitors'}</div>
              </div>
            </Link>

            <Link to={path.ANALYTICS_SPECIALTIES} className="drilldown-card">
              <div className="hub-icon">
                <Building2 size={20} />
              </div>
              <div className="hub-text">
                <div className="hub-title">{language === 'vi' ? 'Chuyên khoa & Cơ sở' : 'Specialties & Clinics'}</div>
                <div className="hub-desc">{language === 'vi' ? 'Xếp hạng đóng góp doanh thu & quy mô cơ sở' : 'Contribution by Medical Field'}</div>
              </div>
            </Link>
          </section>
        </>
      )}

      {/* ===== MODE 2: DAILY LIVE OPERATIONS VIEW ===== */}
      {viewMode === 'daily' && (
        <section className="daily-ops-board">
          <div className="ops-live-banner">
            <div className="live-indicator">
              <span className="live-pulse" />
              <span>
                {language === 'vi'
                  ? `Bảng Điều phối Ca khám Trực tiếp — Hôm nay, ${moment().format('DD/MM/YYYY')}`
                  : `Live Clinical Operations Board — Today, ${moment().format('YYYY-MM-DD')}`}
              </span>
            </div>
            <div style={{ fontSize: '0.82rem', color: '#64748B' }}>
              {language === 'vi' ? 'Tự động đồng bộ theo thời gian thực' : 'Real-time synchronization'}
            </div>
          </div>

          <div className="ops-card">
            <div className="card-header-clean">
              <div className="card-title-group">
                <Clock size={17} className="text-teal" />
                <h2 className="card-title">
                  {language === 'vi' ? 'Ca Khám Cần Giám sát / Đối soát Trong Ngày' : 'Today Critical Action Queue'}
                </h2>
              </div>
              <Link to={path.SCHEDULE_MANAGE} className="card-drilldown-link">
                <span>{language === 'vi' ? 'Mở lịch khám tổng thể' : 'Open Roster'}</span>
                <ChevronRight size={14} />
              </Link>
            </div>

            {dailyBookings && dailyBookings.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table className="ops-table">
                  <thead>
                    <tr>
                      <th>Mã ca</th>
                      <th>Bệnh nhân</th>
                      <th>Bác sĩ</th>
                      <th>Trạng thái</th>
                      <th>Giá khám</th>
                      <th>Hoàn tiền</th>
                      <th>Thời gian hủy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyBookings.map((b) => (
                      <tr key={b.id}>
                        <td style={{ fontWeight: 700 }}>#{b.id}</td>
                        <td>{b.patientName || 'Bệnh nhân'}</td>
                        <td>{b.doctorName || 'Bác sĩ'}</td>
                        <td>
                          <span className={`status-pill ${b.statusId?.toLowerCase()}`}>
                            {b.statusId === 'S1' && 'Chờ duyệt'}
                            {b.statusId === 'S2' && 'Đã duyệt'}
                            {b.statusId === 'S3' && 'Hoàn thành'}
                            {b.statusId === 'S4' && 'Đã hủy'}
                          </span>
                        </td>
                        <td>{formatCurrencyVND(b.bookingPrice)}</td>
                        <td style={{ color: b.refundAmount > 0 ? '#E11D48' : '#64748B', fontWeight: 600 }}>
                          {formatCurrencyVND(b.refundAmount)}
                        </td>
                        <td style={{ fontSize: '0.8rem', color: '#64748B' }}>
                          {b.cancelledAt ? moment(b.cancelledAt).format('HH:mm DD/MM') : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748B' }}>
                <CheckCircle2 size={36} color="#059669" style={{ margin: '0 auto 10px auto' }} />
                <div style={{ fontWeight: 600, color: '#334155' }}>
                  {language === 'vi' ? 'Không có ca hủy đột xuất trong hôm nay' : 'No critical incidents today'}
                </div>
                <div style={{ fontSize: '0.82rem', marginTop: 4 }}>
                  {language === 'vi' ? 'Tất cả các ca khám đang diễn ra theo đúng lịch trình' : 'All appointments progressing normally'}
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
};

export default Dashboard;
