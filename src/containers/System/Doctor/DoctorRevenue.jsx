// src/containers/System/Doctor/DoctorRevenue.jsx
// [Doctor Income Workspace] Mini Financial Workspace — Bóc tách tài chính Master - Detail
import React, { useEffect, useState, useMemo } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { getDoctorIncomeWorkspace } from '../../../services/doctorService';
import './DoctorRevenue.scss';

// Helper format VND
const formatVND = (amount) => {
  if (amount == null || isNaN(amount)) return '0 ₫';
  return Number(amount).toLocaleString('vi-VN') + ' ₫';
};

// Helper tính khoảng ngày theo preset
const getPresetRange = (preset) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const date = now.getDate();

  const toDateStr = (d) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  switch (preset) {
    case 'today': {
      const todayStr = toDateStr(now);
      return { startDate: todayStr, endDate: todayStr };
    }
    case '7days': {
      const past7 = new Date(now);
      past7.setDate(date - 6);
      return { startDate: toDateStr(past7), endDate: toDateStr(now) };
    }
    case 'this_month': {
      const startM = new Date(year, month, 1);
      const endM = new Date(year, month + 1, 0);
      return { startDate: toDateStr(startM), endDate: toDateStr(endM) };
    }
    case 'this_quarter': {
      const qMonth = Math.floor(month / 3) * 3;
      const startQ = new Date(year, qMonth, 1);
      const endQ = new Date(year, qMonth + 3, 0);
      return { startDate: toDateStr(startQ), endDate: toDateStr(endQ) };
    }
    case 'this_year': {
      return { startDate: `${year}-01-01`, endDate: `${year}-12-31` };
    }
    default:
      return { startDate: '', endDate: '' };
  }
};

const DoctorRevenue = () => {
  const intl = useIntl();

  // State Tabs: 'overview' | 'payouts'
  const [activeMainTab, setActiveMainTab] = useState('overview');

  // Filter state
  const [rangePreset, setRangePreset] = useState('this_year');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedFacility, setSelectedFacility] = useState('all');
  const [selectedSpecialty, setSelectedSpecialty] = useState('all');
  const [statusTab, setStatusTab] = useState('all'); // 'all' | 'paid' | 'pending' | 'refunded'
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('newest'); // 'newest' | 'oldest' | 'income_desc' | 'income_asc'

  // Chart Metric Toggle: 'income' | 'count'
  const [chartMetric, setChartMetric] = useState('income');

  // Data state
  const [loading, setLoading] = useState(false);
  const [workspaceData, setWorkspaceData] = useState({
    kpi: {
      totalIncome: 0,
      paidIncome: 0,
      pendingIncome: 0,
      refundedIncome: 0,
      totalConsultations: 0,
      paidRatio: 0,
      pendingRatio: 0,
    },
    counts: { all: 0, paid: 0, pending: 0, refunded: 0 },
    timeline: [],
    facilityDistribution: [],
    transactions: [],
    settlements: [],
    facilities: [],
    specialties: [],
    doctorProfile: {},
  });

  // Selected Transaction for Drawer Detail
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showJsonSnapshot, setShowJsonSnapshot] = useState(false);

  // Selected Settlement for Payout Drawer
  const [selectedSettlement, setSelectedSettlement] = useState(null);

  // Khởi tạo date range theo preset
  useEffect(() => {
    const range = getPresetRange(rangePreset);
    setStartDate(range.startDate);
    setEndDate(range.endDate);
  }, [rangePreset]);

  // Fetch API khi các filter thay đổi
  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        facilityId: selectedFacility !== 'all' ? selectedFacility : undefined,
        specialtyId: selectedSpecialty !== 'all' ? selectedSpecialty : undefined,
        status: statusTab !== 'all' ? statusTab : undefined,
      };
      const res = await getDoctorIncomeWorkspace(params);
      if (res?.data?.errCode === 0 && res?.data?.data) {
        setWorkspaceData(res.data.data);
      } else if (res?.errCode === 0 && res?.data) {
        setWorkspaceData(res.data);
      }
    } catch (err) {
      console.error('Error fetching doctor income workspace:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate, selectedFacility, selectedSpecialty, statusTab]);

  // Client-side search and sort on transactions
  const displayedTransactions = useMemo(() => {
    let list = [...(workspaceData.transactions || [])];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (t) =>
          (t.bookingCode && t.bookingCode.toLowerCase().includes(q)) ||
          (t.patientName && t.patientName.toLowerCase().includes(q)) ||
          (t.patientPhoneNumber && t.patientPhoneNumber.includes(q))
      );
    }

    list.sort((a, b) => {
      if (sortOrder === 'newest') return (b.date || '').localeCompare(a.date || '') || b.id - a.id;
      if (sortOrder === 'oldest') return (a.date || '').localeCompare(b.date || '') || a.id - b.id;
      if (sortOrder === 'income_desc') return (b.doctorShare || 0) - (a.doctorShare || 0);
      if (sortOrder === 'income_asc') return (a.doctorShare || 0) - (b.doctorShare || 0);
      return 0;
    });

    return list;
  }, [workspaceData.transactions, searchQuery, sortOrder]);

  // Export to CSV Function
  const handleExportCSV = () => {
    const list = displayedTransactions;
    if (!list || list.length === 0) {
      alert('Không có dữ liệu để xuất báo cáo!');
      return;
    }

    const headers = [
      'Mã phiên khám',
      'Ngày khám',
      'Khung giờ',
      'Bệnh nhân',
      'Số điện thoại',
      'Cơ sở y tế',
      'Chuyên khoa',
      'Giá dịch vụ (VND)',
      'Phí nền tảng (VND)',
      'Thu nhập BS (VND)',
      'BN thanh toán App',
      'App thanh toán BS',
      'Mã đợt đối soát',
      'Mã GD chuyển khoản',
      'Ngày chuyển khoản',
      'Chính sách áp dụng',
    ];

    const rows = list.map((t) => [
      t.bookingCode,
      t.date,
      `"${t.timeTypeText || t.timeType}"`,
      `"${t.patientName}"`,
      `"${t.patientPhoneNumber}"`,
      `"${t.facility?.name || ''}"`,
      `"${t.specialty?.name || ''}"`,
      t.grossPrice || 0,
      t.platformFee || 0,
      t.doctorShare || 0,
      t.patientPaymentStatus === 'paid' ? 'Đã thanh toán' : t.isRefunded ? 'Đã hoàn tiền' : 'Chưa thanh toán',
      t.appPayoutStatus === 'paid' ? 'Đã chuyển' : t.appPayoutStatus === 'pending' ? 'Chờ thanh toán' : 'Chưa phát sinh',
      t.settlement?.code || 'Chưa đối soát',
      t.settlement?.transactionRef || '',
      t.settlement?.paidAt ? new Date(t.settlement.paidAt).toLocaleDateString('vi-VN') : '',
      `"${t.policySnapshot?.revenuePolicy?.name || 'Mặc định'}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `Bao_cao_thu_nhap_bac_si_${startDate || 'all'}_den_${endDate || 'all'}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper render status badges
  const renderPatientBadge = (status) => {
    if (status === 'paid') {
      return <span className="status-pill status-pill--success"><i className="fas fa-check-circle"></i> Đã TT</span>;
    }
    if (status === 'refunded') {
      return <span className="status-pill status-pill--refund"><i className="fas fa-undo"></i> Đã hoàn</span>;
    }
    return <span className="status-pill status-pill--warning"><i className="fas fa-clock"></i> Chưa TT</span>;
  };

  const renderPayoutBadge = (status) => {
    if (status === 'paid') {
      return <span className="status-pill status-pill--success"><i className="fas fa-check-double"></i> Đã chuyển</span>;
    }
    if (status === 'pending') {
      return <span className="status-pill status-pill--pending"><i className="fas fa-hourglass-half"></i> Chờ payout</span>;
    }
    if (status === 'refunded') {
      return <span className="status-pill status-pill--neutral"><i className="fas fa-ban"></i> Hủy / Hoàn</span>;
    }
    return <span className="status-pill status-pill--neutral"><i className="fas fa-minus"></i> Chưa phát sinh</span>;
  };

  // Max value in timeline chart
  const maxChartVal = useMemo(() => {
    const vals = (workspaceData.timeline || []).map((p) =>
      chartMetric === 'income' ? p.income : p.count
    );
    return Math.max(...vals, 1);
  }, [workspaceData.timeline, chartMetric]);

  const kpi = workspaceData.kpi || {};

  return (
    <div className="doctor-revenue-page">
      {/* ── 1. Top Header & Primary Controls ── */}
      <div className="workspace-header">
        <div className="header-title-block">
          <h2>💰 Thu nhập & thanh toán của tôi</h2>
          <p className="subtitle">
            Theo dõi chi tiết nguồn thu, trạng thái thanh toán và đợt đối soát theo từng phiên khám
          </p>
        </div>

        <div className="header-actions">
          <button
            type="button"
            className="btn-export-report"
            onClick={handleExportCSV}
            title="Xuất bảng đối soát ra file CSV/Excel"
          >
            <i className="fas fa-file-excel"></i> Xuất báo cáo ↓
          </button>
        </div>
      </div>

      {/* ── 2. Navigation Tabs (Overview vs Payouts) ── */}
      <div className="workspace-tabs-nav">
        <button
          type="button"
          className={`tab-item ${activeMainTab === 'overview' ? 'tab-item--active' : ''}`}
          onClick={() => setActiveMainTab('overview')}
        >
          <i className="fas fa-chart-pie"></i> Tổng quan & Giao dịch
        </button>
        <button
          type="button"
          className={`tab-item ${activeMainTab === 'payouts' ? 'tab-item--active' : ''}`}
          onClick={() => setActiveMainTab('payouts')}
        >
          <i className="fas fa-money-check-alt"></i> Đợt thanh toán (Payouts)
          {workspaceData.settlements?.length > 0 && (
            <span className="tab-badge">{workspaceData.settlements.length}</span>
          )}
        </button>
      </div>

      {/* ── 3. Filters Toolbar (Presets & Custom Dates & Dimensions) ── */}
      <div className="filters-card">
        <div className="filter-presets">
          <span className="preset-label">Khoảng thời gian:</span>
          {[
            { key: 'today', label: 'Hôm nay' },
            { key: '7days', label: '7 ngày' },
            { key: 'this_month', label: 'Tháng này' },
            { key: 'this_quarter', label: 'Quý này' },
            { key: 'this_year', label: 'Năm nay' },
            { key: 'custom', label: 'Tùy chọn' },
          ].map((preset) => (
            <button
              key={preset.key}
              type="button"
              className={`btn-preset ${rangePreset === preset.key ? 'btn-preset--active' : ''}`}
              onClick={() => setRangePreset(preset.key)}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="filter-inputs-row">
          <div className="date-picker-group">
            <span className="input-label">Từ ngày:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setRangePreset('custom');
              }}
              className="form-control-date"
            />
          </div>

          <div className="date-picker-group">
            <span className="input-label">Đến ngày:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setRangePreset('custom');
              }}
              className="form-control-date"
            />
          </div>

          <div className="select-group">
            <span className="input-label">Cơ sở:</span>
            <select
              value={selectedFacility}
              onChange={(e) => setSelectedFacility(e.target.value)}
              className="form-control-select"
            >
              <option value="all">Tất cả cơ sở</option>
              {(workspaceData.facilities || []).map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          <div className="select-group">
            <span className="input-label">Chuyên khoa:</span>
            <select
              value={selectedSpecialty}
              onChange={(e) => setSelectedSpecialty(e.target.value)}
              className="form-control-select"
            >
              <option value="all">Tất cả chuyên khoa</option>
              {(workspaceData.specialties || []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className="btn-refresh-filter"
            onClick={fetchData}
            title="Tải lại dữ liệu"
          >
            <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`}></i> Làm mới
          </button>
        </div>
      </div>

      {/* ── TAB 1: TỔNG QUAN & GIAO DỊCH ── */}
      {activeMainTab === 'overview' && (
        <>
          {/* ── 4. Four Core Financial KPI Stat Cards ── */}
          <div className="kpi-grid">
            <div className="kpi-card kpi-card--income">
              <div className="kpi-header">
                <span className="kpi-label">Thu nhập của tôi</span>
                <span className="kpi-badge kpi-badge--primary">Thực nhận</span>
              </div>
              <div className="kpi-value">{formatVND(kpi.totalIncome)}</div>
              <div className="kpi-subtext">
                <i className="fas fa-stethoscope"></i> Theo các phiên khám hợp lệ
              </div>
            </div>

            <div className="kpi-card kpi-card--paid">
              <div className="kpi-header">
                <span className="kpi-label">Đã thanh toán</span>
                <span className="kpi-badge kpi-badge--success">{kpi.paidRatio}% tổng thu</span>
              </div>
              <div className="kpi-value">{formatVND(kpi.paidIncome)}</div>
              <div className="kpi-subtext">
                <i className="fas fa-check-circle"></i> App đã quyết toán cho bác sĩ
              </div>
            </div>

            <div className="kpi-card kpi-card--pending">
              <div className="kpi-header">
                <span className="kpi-label">Đang chờ thanh toán</span>
                <span className="kpi-badge kpi-badge--warning">{kpi.pendingRatio}% tổng thu</span>
              </div>
              <div className="kpi-value">{formatVND(kpi.pendingIncome)}</div>
              <div className="kpi-subtext">
                <i className="fas fa-hourglass-half"></i> Đang chờ kỳ đối soát chi trả
              </div>
            </div>

            <div className="kpi-card kpi-card--count">
              <div className="kpi-header">
                <span className="kpi-label">Lượt khám</span>
                <span className="kpi-badge kpi-badge--neutral">Phiên</span>
              </div>
              <div className="kpi-value">{kpi.totalConsultations} <small>lượt</small></div>
              <div className="kpi-subtext">
                <i className="fas fa-calendar-check"></i> Đã hoàn tất hoặc đã thu tiền
              </div>
            </div>
          </div>

          {/* ── 5. Analytics Row (Income Timeline Chart & Distribution Progress) ── */}
          <div className="analytics-row">
            {/* Chart: Thu nhập theo thời gian */}
            <div className="analytics-box analytics-box--chart">
              <div className="analytics-box-header">
                <div>
                  <h4 className="box-title">Thu nhập theo thời gian</h4>
                  <span className="box-subtitle">Diễn biến phát sinh thu nhập các ngày</span>
                </div>
                <div className="chart-toggle-buttons">
                  <button
                    type="button"
                    className={`btn-toggle-metric ${chartMetric === 'income' ? 'active' : ''}`}
                    onClick={() => setChartMetric('income')}
                  >
                    Thu nhập
                  </button>
                  <button
                    type="button"
                    className={`btn-toggle-metric ${chartMetric === 'count' ? 'active' : ''}`}
                    onClick={() => setChartMetric('count')}
                  >
                    Lượt khám
                  </button>
                </div>
              </div>

              {workspaceData.timeline?.length === 0 ? (
                <div className="empty-chart-state">
                  <i className="fas fa-chart-line"></i>
                  <p>Chưa có dữ liệu phát sinh trong khoảng thời gian này</p>
                </div>
              ) : (
                <div className="custom-chart-wrapper">
                  <div className="bars-container">
                    {workspaceData.timeline.map((point, idx) => {
                      const val = chartMetric === 'income' ? point.income : point.count;
                      const pct = maxChartVal > 0 ? (val / maxChartVal) * 100 : 0;
                      return (
                        <div key={idx} className="bar-column">
                          <div className="bar-hover-tooltip">
                            <strong>{point.date}</strong>
                            <span>Thu nhập: {formatVND(point.income)}</span>
                            <span>{point.count} lượt khám</span>
                          </div>
                          <div className="bar-track">
                            <div
                              className={`bar-fill ${val > 0 ? 'bar-fill--active' : ''}`}
                              style={{ height: `${Math.max(pct, val > 0 ? 6 : 0)}%` }}
                            />
                          </div>
                          <span className="bar-label">
                            {point.date.length >= 10 ? point.date.slice(5) : point.date}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Cash Flow Distribution: Tiền đang ở đâu */}
            <div className="analytics-box analytics-box--distribution">
              <div className="analytics-box-header">
                <div>
                  <h4 className="box-title">Phân bổ thu nhập</h4>
                  <span className="box-subtitle">Trạng thái dòng tiền & nơi làm việc</span>
                </div>
              </div>

              <div className="flow-distribution-content">
                <div className="distribution-item">
                  <div className="dist-label-row">
                    <span className="dist-title">
                      <span className="color-dot color-dot--paid"></span> Đã thanh toán (App → BS)
                    </span>
                    <span className="dist-amount">{formatVND(kpi.paidIncome)} ({kpi.paidRatio}%)</span>
                  </div>
                  <div className="dist-progress-track">
                    <div
                      className="dist-progress-fill dist-progress-fill--paid"
                      style={{ width: `${kpi.paidRatio}%` }}
                    ></div>
                  </div>
                </div>

                <div className="distribution-item">
                  <div className="dist-label-row">
                    <span className="dist-title">
                      <span className="color-dot color-dot--pending"></span> Đang chờ đối soát chi trả
                    </span>
                    <span className="dist-amount">{formatVND(kpi.pendingIncome)} ({kpi.pendingRatio}%)</span>
                  </div>
                  <div className="dist-progress-track">
                    <div
                      className="dist-progress-fill dist-progress-fill--pending"
                      style={{ width: `${kpi.pendingRatio}%` }}
                    ></div>
                  </div>
                </div>

                {kpi.refundedIncome > 0 && (
                  <div className="distribution-item">
                    <div className="dist-label-row">
                      <span className="dist-title">
                        <span className="color-dot color-dot--refund"></span> Đã hoàn tiền cho bệnh nhân
                      </span>
                      <span className="dist-amount">{formatVND(kpi.refundedIncome)}</span>
                    </div>
                  </div>
                )}

                {/* Phân bổ theo cơ sở y tế */}
                <div className="facilities-breakdown">
                  <div className="breakdown-title">
                    <i className="fas fa-hospital"></i> Thu nhập theo cơ sở
                  </div>
                  {(workspaceData.facilityDistribution || []).map((fac, idx) => (
                    <div key={idx} className="facility-item">
                      <span className="facility-name">{fac.name}</span>
                      <span className="facility-val">
                        <strong>{formatVND(fac.income)}</strong> ({fac.count} lượt)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── 6. Master Transactions List ("Chi tiết thu nhập") ── */}
          <div className="master-transactions-card">
            <div className="master-card-header">
              <div className="master-tabs">
                <button
                  type="button"
                  className={`status-tab ${statusTab === 'all' ? 'status-tab--active' : ''}`}
                  onClick={() => setStatusTab('all')}
                >
                  Tất cả ({workspaceData.counts?.all || 0})
                </button>
                <button
                  type="button"
                  className={`status-tab ${statusTab === 'paid' ? 'status-tab--active' : ''}`}
                  onClick={() => setStatusTab('paid')}
                >
                  Đã thanh toán ({workspaceData.counts?.paid || 0})
                </button>
                <button
                  type="button"
                  className={`status-tab ${statusTab === 'pending' ? 'status-tab--active' : ''}`}
                  onClick={() => setStatusTab('pending')}
                >
                  Chờ thanh toán ({workspaceData.counts?.pending || 0})
                </button>
                <button
                  type="button"
                  className={`status-tab ${statusTab === 'refunded' ? 'status-tab--active' : ''}`}
                  onClick={() => setStatusTab('refunded')}
                >
                  Đã hoàn tiền ({workspaceData.counts?.refunded || 0})
                </button>
              </div>

              <div className="master-controls">
                <div className="search-box">
                  <i className="fas fa-search search-icon"></i>
                  <input
                    type="text"
                    placeholder="Tìm mã khám, tên bệnh nhân, SĐT..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="search-input"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      className="btn-clear-search"
                      onClick={() => setSearchQuery('')}
                    >
                      ×
                    </button>
                  )}
                </div>

                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="sort-select"
                >
                  <option value="newest">Sắp xếp: Mới nhất</option>
                  <option value="oldest">Sắp xếp: Cũ nhất</option>
                  <option value="income_desc">Thu nhập: Cao nhất</option>
                  <option value="income_asc">Thu nhập: Thấp nhất</option>
                </select>
              </div>
            </div>

            {/* Master Table */}
            <div className="transactions-table-wrap">
              {loading ? (
                <div className="loading-state">
                  <i className="fas fa-spinner fa-spin"></i> Đang tải danh sách giao dịch thu nhập...
                </div>
              ) : displayedTransactions.length === 0 ? (
                <div className="empty-transactions-state">
                  <i className="fas fa-receipt"></i>
                  <h4>Không tìm thấy giao dịch nào</h4>
                  <p>Hãy thử thay đổi khoảng ngày hoặc bộ lọc trạng thái</p>
                </div>
              ) : (
                <table className="transactions-table">
                  <thead>
                    <tr>
                      <th>Ngày & Giờ</th>
                      <th>Mã khám</th>
                      <th>Bệnh nhân</th>
                      <th>Cơ sở & Chuyên khoa</th>
                      <th className="text-right">Giá dịch vụ</th>
                      <th className="text-right">Thu nhập BS</th>
                      <th>BN → App</th>
                      <th>App → BS</th>
                      <th className="text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedTransactions.map((t) => {
                      const isSelected = selectedTransaction?.id === t.id;
                      return (
                        <tr
                          key={t.id}
                          className={`transaction-row ${isSelected ? 'transaction-row--selected' : ''}`}
                          onClick={() => {
                            setSelectedTransaction(t);
                            setShowJsonSnapshot(false);
                          }}
                        >
                          <td className="col-date">
                            <span className="date-main">{t.date}</span>
                            <span className="time-sub">{t.timeTypeText}</span>
                          </td>
                          <td className="col-code">
                            <span className="booking-code-pill">{t.bookingCode}</span>
                          </td>
                          <td className="col-patient">
                            <span className="patient-name">{t.patientName}</span>
                            <span className="patient-phone">{t.patientPhoneNumber || '---'}</span>
                          </td>
                          <td className="col-facility">
                            <span className="facility-title">{t.facility?.name}</span>
                            <span className="specialty-sub">{t.specialty?.name}</span>
                          </td>
                          <td className="col-gross text-right">
                            {formatVND(t.grossPrice)}
                          </td>
                          <td className="col-income text-right">
                            <strong className="income-highlight">
                              {formatVND(t.doctorShare)}
                            </strong>
                          </td>
                          <td className="col-status-bn">
                            {renderPatientBadge(t.patientPaymentStatus)}
                          </td>
                          <td className="col-status-app">
                            {renderPayoutBadge(t.appPayoutStatus)}
                          </td>
                          <td className="col-actions text-center">
                            <button
                              type="button"
                              className="btn-view-detail"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTransaction(t);
                                setShowJsonSnapshot(false);
                              }}
                              title="Xem bóc tách dòng tiền & chính sách"
                            >
                              Chi tiết <i className="fas fa-chevron-right"></i>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── TAB 2: ĐỢT THANH TOÁN (PAYOUTS) ── */}
      {activeMainTab === 'payouts' && (
        <div className="payouts-card">
          <div className="payouts-card-header">
            <div>
              <h3 className="card-title">Các đợt đối soát thanh toán (Doctor Payouts)</h3>
              <p className="card-subtitle">
                Danh sách các lần nền tảng BookingCare kết chuyển tiền thu nhập vào tài khoản ngân hàng của bạn
              </p>
            </div>
            {workspaceData.doctorProfile?.bankAccountNumber && (
              <div className="doctor-bank-badge">
                <i className="fas fa-university"></i>
                <span>
                  {workspaceData.doctorProfile.bankName} - {workspaceData.doctorProfile.bankAccountNumber} (
                  {workspaceData.doctorProfile.bankAccountName})
                </span>
              </div>
            )}
          </div>

          <div className="payouts-table-wrap">
            {workspaceData.settlements?.length === 0 ? (
              <div className="empty-payouts-state">
                <i className="fas fa-hand-holding-usd"></i>
                <h4>Chưa có đợt thanh toán nào</h4>
                <p>Nền tảng sẽ tự động tạo đợt quyết toán chi trả theo kỳ đối soát hợp đồng</p>
              </div>
            ) : (
              <table className="payouts-table">
                <thead>
                  <tr>
                    <th>Mã đợt</th>
                    <th>Kỳ đối soát</th>
                    <th>Số phiên</th>
                    <th className="text-right">Tổng doanh thu</th>
                    <th className="text-right">Phí nền tảng</th>
                    <th className="text-right">Thực nhận</th>
                    <th>Trạng thái</th>
                    <th>Mã giao dịch</th>
                    <th>Ngày chuyển</th>
                    <th className="text-center">Chi tiết</th>
                  </tr>
                </thead>
                <tbody>
                  {workspaceData.settlements.map((s) => (
                    <tr key={s.id} className="payout-row">
                      <td>
                        <span className="payout-code-tag">{s.code}</span>
                      </td>
                      <td>
                        <span className="period-dates">
                          {s.periodFrom ? new Date(s.periodFrom).toLocaleDateString('vi-VN') : ''} →{' '}
                          {s.periodTo ? new Date(s.periodTo).toLocaleDateString('vi-VN') : ''}
                        </span>
                      </td>
                      <td>
                        <span className="badge-sessions">{s.sessionsCount} phiên</span>
                      </td>
                      <td className="text-right">{formatVND(s.grossRevenue)}</td>
                      <td className="text-right text-muted">{formatVND(s.platformFee)}</td>
                      <td className="text-right font-bold text-success">
                        {formatVND(s.netPayout)}
                      </td>
                      <td>
                        {s.payoutStatus === 'paid' ? (
                          <span className="status-pill status-pill--success">
                            <i className="fas fa-check-circle"></i> Đã chuyển
                          </span>
                        ) : (
                          <span className="status-pill status-pill--pending">
                            <i className="fas fa-clock"></i> Đang xử lý
                          </span>
                        )}
                      </td>
                      <td>
                        <span className="tx-ref">{s.transactionRef}</span>
                      </td>
                      <td>
                        {s.paidAt ? new Date(s.paidAt).toLocaleDateString('vi-VN') : '---'}
                      </td>
                      <td className="text-center">
                        <button
                          type="button"
                          className="btn-payout-view"
                          onClick={() => setSelectedSettlement(s)}
                          title="Xem các phiên khám trong đợt này"
                        >
                          <i className="fas fa-list"></i> Xem phiên
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── 7. SLIDE-OVER DETAIL DRAWER (Bóc tách chi tiết dòng tiền & Snapshot) ── */}
      {selectedTransaction && (
        <div className="drawer-overlay" onClick={() => setSelectedTransaction(null)}>
          <div
            className="drawer-panel"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="drawer-header">
              <div className="drawer-header-left">
                <div className="drawer-code-title">
                  <h3>{selectedTransaction.bookingCode}</h3>
                  <span className="booking-status-tag">
                    {selectedTransaction.statusText}
                  </span>
                </div>
                <div className="drawer-badges-row">
                  <span className="drawer-flow-tag">
                    BN → App: {renderPatientBadge(selectedTransaction.patientPaymentStatus)}
                  </span>
                  <span className="drawer-flow-tag">
                    App → BS: {renderPayoutBadge(selectedTransaction.appPayoutStatus)}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="btn-close-drawer"
                onClick={() => setSelectedTransaction(null)}
                title="Đóng chi tiết"
              >
                ×
              </button>
            </div>

            {/* Drawer Body */}
            <div className="drawer-body">
              {/* Section: Thông tin phiên khám */}
              <div className="drawer-section">
                <h5 className="section-title">
                  <i className="fas fa-info-circle"></i> Thông tin phiên khám
                </h5>
                <div className="info-grid">
                  <div className="info-row">
                    <span className="info-label">Thời gian khám:</span>
                    <span className="info-val">
                      {selectedTransaction.date} · {selectedTransaction.timeTypeText}
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Bệnh nhân:</span>
                    <span className="info-val font-semibold">
                      {selectedTransaction.patientName}
                    </span>
                  </div>
                  {selectedTransaction.patientPhoneNumber && (
                    <div className="info-row">
                      <span className="info-label">Số điện thoại:</span>
                      <span className="info-val">
                        {selectedTransaction.patientPhoneNumber}
                      </span>
                    </div>
                  )}
                  {selectedTransaction.patientAddress && (
                    <div className="info-row">
                      <span className="info-label">Địa chỉ:</span>
                      <span className="info-val">
                        {selectedTransaction.patientAddress}
                      </span>
                    </div>
                  )}
                  <div className="info-row">
                    <span className="info-label">Cơ sở khám:</span>
                    <span className="info-val">
                      {selectedTransaction.facility?.name}
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Dịch vụ:</span>
                    <span className="info-val">
                      {selectedTransaction.serviceName}
                    </span>
                  </div>
                </div>
              </div>

              {/* Section: BÓC TÁCH CHI TIẾT THANH TOÁN (Breakdown) */}
              <div className="drawer-section drawer-section--finance">
                <h5 className="section-title">
                  <i className="fas fa-calculator"></i> Bóc tách tài chính
                </h5>
                <div className="finance-breakdown-box">
                  <div className="breakdown-row">
                    <span className="row-label">Giá dịch vụ niêm yết:</span>
                    <span className="row-val">{formatVND(selectedTransaction.grossPrice)}</span>
                  </div>

                  <div className="breakdown-row breakdown-row--sub">
                    <span className="row-label">
                      Phần nền tảng thu (Platform fee):
                    </span>
                    <span className="row-val text-danger">
                      - {formatVND(selectedTransaction.platformFee)}
                    </span>
                  </div>

                  {selectedTransaction.clinicShare > 0 && (
                    <div className="breakdown-row breakdown-row--sub">
                      <span className="row-label">Phần cơ sở y tế nhận:</span>
                      <span className="row-val text-muted">
                        - {formatVND(selectedTransaction.clinicShare)}
                      </span>
                    </div>
                  )}

                  <div className="breakdown-divider"></div>

                  <div className="breakdown-row breakdown-row--net">
                    <span className="row-label font-bold">
                      Thu nhập bác sĩ thực nhận:
                    </span>
                    <span className="row-val font-bold text-success text-xl">
                      {formatVND(selectedTransaction.doctorShare)}
                    </span>
                  </div>
                </div>

                {/* Hoàn tiền nếu hủy */}
                {selectedTransaction.isRefunded && (
                  <div className="refund-alert-box">
                    <div className="refund-alert-header">
                      <i className="fas fa-exclamation-triangle"></i>
                      <span>Phiên khám đã hủy & áp dụng chính sách hoàn tiền</span>
                    </div>
                    <div className="refund-alert-details">
                      <div>Hoàn tiền bệnh nhân: <strong>{formatVND(selectedTransaction.refundAmount)}</strong></div>
                      <div>Thu nhập bác sĩ: <strong>0 ₫</strong></div>
                      {selectedTransaction.refundStatus && (
                        <div>Trạng thái hoàn: {selectedTransaction.refundStatus}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Section: DÒNG TIỀN & LỊCH SỬ THANH TOÁN (Cash Flow Timeline) */}
              <div className="drawer-section">
                <h5 className="section-title">
                  <i className="fas fa-stream"></i> Dòng tiền thanh toán
                </h5>
                <div className="cashflow-timeline">
                  {/* Chặng 1: BN -> App */}
                  <div className="timeline-step">
                    <div
                      className={`timeline-icon ${
                        selectedTransaction.patientPaymentStatus === 'paid'
                          ? 'timeline-icon--success'
                          : selectedTransaction.isRefunded
                          ? 'timeline-icon--refund'
                          : 'timeline-icon--pending'
                      }`}
                    >
                      <i className="fas fa-user-check"></i>
                    </div>
                    <div className="timeline-content">
                      <span className="timeline-title">Bệnh nhân thanh toán</span>
                      <span className="timeline-desc">
                        {selectedTransaction.patientPaymentStatus === 'paid' ? (
                          <>
                            ✓ Đã thanh toán thành công {formatVND(selectedTransaction.grossPrice)}
                            {selectedTransaction.vnpayTransactionNo && (
                              <div className="timeline-meta">
                                VNPay Ref: {selectedTransaction.vnpayTransactionNo}
                              </div>
                            )}
                          </>
                        ) : selectedTransaction.isRefunded ? (
                          <>Đã thực hiện hoàn tiền cho bệnh nhân</>
                        ) : (
                          <>Đang chờ bệnh nhân thanh toán</>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Chặng 2: Phiên khám */}
                  <div className="timeline-step">
                    <div
                      className={`timeline-icon ${
                        selectedTransaction.statusId === 'S3'
                          ? 'timeline-icon--success'
                          : 'timeline-icon--info'
                      }`}
                    >
                      <i className="fas fa-notes-medical"></i>
                    </div>
                    <div className="timeline-content">
                      <span className="timeline-title">Khám bệnh</span>
                      <span className="timeline-desc">
                        Trạng thái: {selectedTransaction.statusText}
                      </span>
                    </div>
                  </div>

                  {/* Chặng 3: App -> BS */}
                  <div className="timeline-step">
                    <div
                      className={`timeline-icon ${
                        selectedTransaction.appPayoutStatus === 'paid'
                          ? 'timeline-icon--success'
                          : selectedTransaction.appPayoutStatus === 'pending'
                          ? 'timeline-icon--pending'
                          : 'timeline-icon--neutral'
                      }`}
                    >
                      <i className="fas fa-university"></i>
                    </div>
                    <div className="timeline-content">
                      <span className="timeline-title">Nền tảng chi trả (App → Bác sĩ)</span>
                      <span className="timeline-desc">
                        {selectedTransaction.appPayoutStatus === 'paid' ? (
                          <>
                            ✓ Đã thanh toán thành công <strong>{formatVND(selectedTransaction.doctorShare)}</strong>
                            {selectedTransaction.settlement && (
                              <div className="timeline-payout-box">
                                <div>Mã đợt: <strong>{selectedTransaction.settlement.code}</strong></div>
                                <div>Mã GD ngân hàng: <strong>{selectedTransaction.settlement.transactionRef}</strong></div>
                                <div>
                                  Ngày chuyển:{' '}
                                  {selectedTransaction.settlement.paidAt
                                    ? new Date(selectedTransaction.settlement.paidAt).toLocaleDateString('vi-VN')
                                    : '---'}
                                </div>
                              </div>
                            )}
                          </>
                        ) : selectedTransaction.appPayoutStatus === 'pending' ? (
                          <>
                            ⏳ Thu nhập đã ghi nhận ({formatVND(selectedTransaction.doctorShare)}), đang chờ kết chuyển trong kỳ đối soát kế tiếp.
                          </>
                        ) : (
                          <>Chưa phát sinh điều kiện thanh toán</>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section: CHÍNH SÁCH ÁP DỤNG (Frozen Policy Snapshot) */}
              <div className="drawer-section">
                <div className="section-title-between">
                  <h5 className="section-title">
                    <i className="fas fa-lock"></i> Chính sách áp dụng (Đóng băng lúc đặt)
                  </h5>
                  <button
                    type="button"
                    className="btn-toggle-json"
                    onClick={() => setShowJsonSnapshot(!showJsonSnapshot)}
                  >
                    {showJsonSnapshot ? 'Ẩn chi tiết' : 'Xem JSON Snapshot'}
                  </button>
                </div>

                <div className="policy-info-box">
                  <div className="policy-name-row">
                    <span className="badge-immutable">Bất biến</span>
                    <strong className="policy-name">
                      {selectedTransaction.policySnapshot?.revenuePolicy?.name ||
                        'Chính sách phân bổ doanh thu tiêu chuẩn'}
                    </strong>
                    {selectedTransaction.policySnapshot?.revenuePolicy?.version && (
                      <span className="version-pill">
                        v{selectedTransaction.policySnapshot.revenuePolicy.version}
                      </span>
                    )}
                  </div>

                  <div className="policy-rate-split">
                    <div className="rate-item">
                      <span className="rate-label">Bác sĩ</span>
                      <span className="rate-val text-success">
                        {selectedTransaction.policySnapshot?.revenuePolicy?.rules?.doctorSharePercent || 85}%
                      </span>
                    </div>
                    <div className="rate-item">
                      <span className="rate-label">Nền tảng</span>
                      <span className="rate-val text-info">
                        {selectedTransaction.policySnapshot?.revenuePolicy?.rules?.platformFeePercent || 15}%
                      </span>
                    </div>
                    <div className="rate-item">
                      <span className="rate-label">Cơ sở</span>
                      <span className="rate-val text-muted">
                        {selectedTransaction.policySnapshot?.revenuePolicy?.rules?.clinicSharePercent || 0}%
                      </span>
                    </div>
                  </div>

                  {selectedTransaction.policySnapshot?.revenuePolicy?.rules?.note && (
                    <div className="policy-note">
                      <i className="fas fa-comment-dots"></i> {selectedTransaction.policySnapshot.revenuePolicy.rules.note}
                    </div>
                  )}

                  {showJsonSnapshot && (
                    <div className="raw-json-container">
                      <pre>
                        {JSON.stringify(
                          selectedTransaction.policySnapshot || { message: 'Chưa có snapshot JSON lưu trữ' },
                          null,
                          2
                        )}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="drawer-footer">
              <button
                type="button"
                className="btn-drawer-close"
                onClick={() => setSelectedTransaction(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 8. MODAL XEM PHIÊN KHÁM CỦA ĐỢT QUYẾT TOÁN (SETTLEMENT MODAL) ── */}
      {selectedSettlement && (
        <div className="modal-overlay" onClick={() => setSelectedSettlement(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Đợt thanh toán {selectedSettlement.code}</h3>
                <p className="modal-subtitle">
                  Mã giao dịch: <strong>{selectedSettlement.transactionRef}</strong> · Thực nhận:{' '}
                  <strong>{formatVND(selectedSettlement.netPayout)}</strong>
                </p>
              </div>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setSelectedSettlement(null)}
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <h5 className="list-title">Danh sách phiên khám được đối soát trong đợt:</h5>
              {selectedSettlement.bookings?.length === 0 ? (
                <div className="empty-sub-list">
                  Không tìm thấy phiên khám cụ thể trong đợt này.
                </div>
              ) : (
                <div className="sub-table-wrap">
                  <table className="sub-table">
                    <thead>
                      <tr>
                        <th>Mã khám</th>
                        <th>Bệnh nhân</th>
                        <th>Ngày khám</th>
                        <th className="text-right">Giá DV</th>
                        <th className="text-right">Thu nhập BS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSettlement.bookings.map((cb, idx) => (
                        <tr key={idx}>
                          <td><strong>{cb.bookingCode}</strong></td>
                          <td>{cb.patientName}</td>
                          <td>{cb.date}</td>
                          <td className="text-right">{formatVND(cb.grossPrice)}</td>
                          <td className="text-right text-success font-bold">
                            {formatVND(cb.doctorShare)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-primary"
                onClick={() => setSelectedSettlement(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorRevenue;
