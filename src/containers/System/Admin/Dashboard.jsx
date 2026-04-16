// src/containers/System/Admin/Dashboard.jsx
// [Phase 10] Analytics Dashboard — Recharts + Tailwind CSS (tw-* prefix)
// AbortController + language dependency + null-safety normalization
import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useIntl } from 'react-intl';
import moment from 'moment';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  CalendarCheck, Users, UserPlus, Activity,
} from 'lucide-react';
import {
  getOverviewStatistics,
  getBookingsByDay,
  getBookingsByStatus,
  getTopSpecialties,
  getTopDoctors,
} from '../../../services/statisticService';

// Màu biểu đồ
const PIE_COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#F43F5E', '#8B5CF6', '#06B6D4'];
const BAR_COLORS = { specialty: '#4F46E5', doctor: '#10B981' };

// Preset filter ranges
const FILTER_PRESETS = [
  { key: '7d', days: 7 },
  { key: '30d', days: 30 },
  { key: '90d', days: 90 },
];

const Dashboard = () => {
  const intl = useIntl();
  const language = useSelector((state) => state.app.language);

  // Filter state
  const [activePreset, setActivePreset] = useState('30d');
  const [isCustom, setIsCustom] = useState(false);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  // Data state — normalize to safe defaults
  const [overview, setOverview] = useState({ totalBookings: 0, totalDoctors: 0, totalPatients: 0, completedBookings: 0 });
  const [bookingsByDay, setBookingsByDay] = useState([]);
  const [bookingsByStatus, setBookingsByStatus] = useState([]);
  const [topSpecialties, setTopSpecialties] = useState([]);
  const [topDoctors, setTopDoctors] = useState([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Tính timestamp range từ preset hoặc custom
  const getTimeRange = useCallback(() => {
    if (isCustom && customFrom && customTo) {
      return {
        from: moment.utc(customFrom).startOf('day').valueOf(),
        to: moment.utc(customTo).endOf('day').valueOf(),
      };
    }
    const preset = FILTER_PRESETS.find((p) => p.key === activePreset) || FILTER_PRESETS[1];
    return {
      from: moment.utc().subtract(preset.days, 'days').startOf('day').valueOf(),
      to: moment.utc().endOf('day').valueOf(),
    };
  }, [activePreset, isCustom, customFrom, customTo]);

  // Fetch all data — AbortController + null-safety
  const fetchDashboardData = useCallback(async (signal) => {
    setLoading(true);
    setError('');
    try {
      const { from, to } = getTimeRange();
      const opts = { signal };

      const [overviewRes, byDayRes, byStatusRes, specialtiesRes, doctorsRes] = await Promise.all([
        getOverviewStatistics(from, to, opts),
        getBookingsByDay(from, to, opts),
        getBookingsByStatus(from, to, opts),
        getTopSpecialties(from, to, 5, opts),
        getTopDoctors(from, to, 5, opts),
      ]);

      // Null-safety normalization — res.data || safe default
      setOverview(overviewRes.data || { totalBookings: 0, totalDoctors: 0, totalPatients: 0, completedBookings: 0 });
      setBookingsByDay(overviewRes.errCode === 0 ? (byDayRes.data || []) : []);
      setBookingsByStatus(byStatusRes.errCode === 0 ? (byStatusRes.data || []) : []);
      setTopSpecialties(specialtiesRes.errCode === 0 ? (specialtiesRes.data || []) : []);
      setTopDoctors(doctorsRes.errCode === 0 ? (doctorsRes.data || []) : []);
    } catch (err) {
      if (err.name !== 'CanceledError' && err.name !== 'AbortError') {
        console.error('>>> Dashboard fetch error:', err);
        setError(intl.formatMessage({ id: 'dashboard.error' }));
      }
    } finally {
      setLoading(false);
    }
  }, [getTimeRange, intl]);

  // useEffect — AbortController cleanup + language dependency
  useEffect(() => {
    const controller = new AbortController();
    fetchDashboardData(controller.signal);
    return () => controller.abort();
  }, [fetchDashboardData, language]);

  // Handle preset click
  const handlePresetClick = (key) => {
    setIsCustom(false);
    setActivePreset(key);
  };

  // Handle custom apply
  const handleCustomApply = () => {
    if (customFrom && customTo) {
      setIsCustom(true);
      // Trigger re-fetch via dependency change
      setActivePreset('custom');
    }
  };

  // KPI card config
  const kpiCards = [
    {
      key: 'totalBookings',
      icon: CalendarCheck,
      color: 'tw-text-chart-blue',
      bgColor: 'tw-bg-indigo-50',
      value: overview.totalBookings,
      labelId: 'dashboard.stat-total-bookings',
    },
    {
      key: 'totalDoctors',
      icon: Users,
      color: 'tw-text-chart-green',
      bgColor: 'tw-bg-emerald-50',
      value: overview.totalDoctors,
      labelId: 'dashboard.stat-total-doctors',
    },
    {
      key: 'totalPatients',
      icon: UserPlus,
      color: 'tw-text-chart-amber',
      bgColor: 'tw-bg-amber-50',
      value: overview.totalPatients,
      labelId: 'dashboard.stat-total-patients',
    },
    {
      key: 'completedBookings',
      icon: Activity,
      color: 'tw-text-chart-rose',
      bgColor: 'tw-bg-rose-50',
      value: overview.completedBookings,
      labelId: 'dashboard.stat-revenue',
    },
  ];

  // Status name based on language
  const getStatusName = (item) => (language === 'vi' ? item.statusNameVi : item.statusNameEn) || item.statusId;

  return (
    <div className="tw-p-2">
      {/* ===== TITLE ===== */}
      <h1 className="tw-text-2xl tw-font-bold tw-text-text-main tw-mb-4">
        {intl.formatMessage({ id: 'dashboard.title' })}
      </h1>

      {/* ===== FILTER BAR ===== */}
      <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-3 tw-mb-6 tw-p-4 tw-bg-white tw-rounded-2xl tw-shadow-card">
        <span className="tw-text-sm tw-font-semibold tw-text-text-sub tw-mr-2">
          {intl.formatMessage({ id: 'dashboard.filter-range' })}:
        </span>
        {FILTER_PRESETS.map((p) => (
          <button
            key={p.key}
            onClick={() => handlePresetClick(p.key)}
            className={`tw-px-4 tw-py-1.5 tw-rounded-badge tw-text-sm tw-font-medium tw-border tw-transition-all tw-cursor-pointer
              ${activePreset === p.key && !isCustom
                ? 'tw-bg-primary tw-text-white tw-border-primary'
                : 'tw-bg-white tw-text-text-sub tw-border-gray-300 hover:tw-border-primary hover:tw-text-primary'
              }`}
          >
            {intl.formatMessage({ id: `dashboard.filter-${p.key}` })}
          </button>
        ))}

        {/* Custom range */}
        <div className="tw-flex tw-items-center tw-gap-2 tw-ml-2">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="tw-border tw-border-gray-300 tw-rounded-md tw-px-2 tw-py-1 tw-text-sm"
            placeholder={intl.formatMessage({ id: 'dashboard.filter-from' })}
          />
          <span className="tw-text-text-light tw-text-sm">→</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="tw-border tw-border-gray-300 tw-rounded-md tw-px-2 tw-py-1 tw-text-sm"
            placeholder={intl.formatMessage({ id: 'dashboard.filter-to' })}
          />
          <button
            onClick={handleCustomApply}
            className="tw-px-3 tw-py-1.5 tw-bg-primary tw-text-white tw-rounded-md tw-text-sm tw-font-medium tw-cursor-pointer hover:tw-bg-primary-dark tw-transition-colors tw-border-0"
          >
            {intl.formatMessage({ id: 'dashboard.filter-apply' })}
          </button>
        </div>
      </div>

      {/* ===== LOADING / ERROR ===== */}
      {loading && (
        <div className="tw-text-center tw-py-8 tw-text-text-sub">
          <div className="tw-animate-spin tw-inline-block tw-w-8 tw-h-8 tw-border-4 tw-border-primary tw-border-t-transparent tw-rounded-full tw-mb-3"></div>
          <p>{intl.formatMessage({ id: 'dashboard.loading' })}</p>
        </div>
      )}

      {error && (
        <div className="tw-bg-red-50 tw-border tw-border-red-200 tw-text-danger tw-px-4 tw-py-3 tw-rounded-2xl tw-mb-4">
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          {/* ===== KPI CARDS ===== */}
          <div className="tw-grid tw-grid-cols-1 sm:tw-grid-cols-2 lg:tw-grid-cols-4 tw-gap-4 tw-mb-6">
            {kpiCards.map((card) => {
              const IconComponent = card.icon;
              return (
                <div
                  key={card.key}
                  className="tw-bg-white tw-rounded-2xl tw-shadow-card tw-p-5 tw-flex tw-items-center tw-gap-4 hover:tw-shadow-card-hover tw-transition-shadow"
                >
                  <div className={`tw-p-3 tw-rounded-xl ${card.bgColor}`}>
                    <IconComponent className={`tw-w-7 tw-h-7 ${card.color}`} />
                  </div>
                  <div>
                    <p className="tw-text-3xl tw-font-bold tw-text-text-main tw-leading-none tw-mb-1">
                      {card.value.toLocaleString()}
                    </p>
                    <p className="tw-text-sm tw-text-text-sub">
                      {intl.formatMessage({ id: card.labelId })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ===== CHARTS — ROW 1: Line + Pie ===== */}
          <div className="tw-grid tw-grid-cols-1 lg:tw-grid-cols-2 tw-gap-4 tw-mb-6">
            {/* Line Chart — Bookings by Day */}
            <div className="tw-bg-white tw-rounded-2xl tw-shadow-card tw-p-5">
              <h3 className="tw-text-base tw-font-semibold tw-text-text-main tw-mb-4">
                {intl.formatMessage({ id: 'dashboard.chart-bookings-by-day' })}
              </h3>
              {bookingsByDay.length > 0 ? (
                <ResponsiveContainer width="100%" height={300} minWidth={0}>
                  <LineChart data={bookingsByDay}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="bookingDate" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#4F46E5"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                      name={intl.formatMessage({ id: 'dashboard.stat-total-bookings' })}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="tw-text-center tw-text-text-light tw-py-12">
                  {intl.formatMessage({ id: 'dashboard.no-data' })}
                </p>
              )}
            </div>

            {/* Pie Chart — Bookings by Status */}
            <div className="tw-bg-white tw-rounded-2xl tw-shadow-card tw-p-5">
              <h3 className="tw-text-base tw-font-semibold tw-text-text-main tw-mb-4">
                {intl.formatMessage({ id: 'dashboard.chart-bookings-by-status' })}
              </h3>
              {bookingsByStatus.length > 0 ? (
                <ResponsiveContainer width="100%" height={300} minWidth={0}>
                  <PieChart>
                    <Pie
                      data={bookingsByStatus}
                      dataKey="count"
                      nameKey="statusId"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ name, percent }) =>
                        `${name} (${(percent * 100).toFixed(0)}%)`
                      }
                    >
                      {bookingsByStatus.map((_, index) => (
                        <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name, props) => [
                        value,
                        getStatusName(props.payload),
                      ]}
                    />
                    <Legend
                      formatter={(value, entry) => getStatusName(entry.payload)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="tw-text-center tw-text-text-light tw-py-12">
                  {intl.formatMessage({ id: 'dashboard.no-data' })}
                </p>
              )}
            </div>
          </div>

          {/* ===== CHARTS — ROW 2: Bar (Specialties) + Bar (Doctors) ===== */}
          <div className="tw-grid tw-grid-cols-1 lg:tw-grid-cols-2 tw-gap-4">
            {/* Bar Chart — Top Specialties */}
            <div className="tw-bg-white tw-rounded-2xl tw-shadow-card tw-p-5">
              <h3 className="tw-text-base tw-font-semibold tw-text-text-main tw-mb-4">
                {intl.formatMessage({ id: 'dashboard.chart-bookings-by-specialty' })}
              </h3>
              {topSpecialties.length > 0 ? (
                <ResponsiveContainer width="100%" height={300} minWidth={0}>
                  <BarChart data={topSpecialties} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                    <YAxis
                      type="category"
                      dataKey="specialtyName"
                      width={120}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip />
                    <Bar
                      dataKey="count"
                      fill={BAR_COLORS.specialty}
                      radius={[0, 4, 4, 0]}
                      name={intl.formatMessage({ id: 'dashboard.stat-total-bookings' })}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="tw-text-center tw-text-text-light tw-py-12">
                  {intl.formatMessage({ id: 'dashboard.no-data' })}
                </p>
              )}
            </div>

            {/* Bar Chart — Top Doctors */}
            <div className="tw-bg-white tw-rounded-2xl tw-shadow-card tw-p-5">
              <h3 className="tw-text-base tw-font-semibold tw-text-text-main tw-mb-4">
                {intl.formatMessage({ id: 'dashboard.chart-bookings-by-doctor' })}
              </h3>
              {topDoctors.length > 0 ? (
                <ResponsiveContainer width="100%" height={300} minWidth={0}>
                  <BarChart data={topDoctors} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                    <YAxis
                      type="category"
                      dataKey="doctorName"
                      width={140}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip />
                    <Bar
                      dataKey="count"
                      fill={BAR_COLORS.doctor}
                      radius={[0, 4, 4, 0]}
                      name={intl.formatMessage({ id: 'dashboard.stat-total-bookings' })}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="tw-text-center tw-text-text-light tw-py-12">
                  {intl.formatMessage({ id: 'dashboard.no-data' })}
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
