// src/containers/System/Admin/Cancellation/CancellationCenter.jsx
// Trung tâm Giám sát Hủy lịch Bác sĩ & Đối soát Hoàn tiền Ví 100% (Cancellation Center)
import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import moment from 'moment';
import {
  ShieldAlert,
  Search,
  Filter,
  Calendar,
  Clock,
  User,
  Building2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronRight,
  Eye,
  RefreshCw,
  Wallet,
  X,
  FileText,
  DollarSign,
  ChevronLeft,
} from 'lucide-react';
import {
  getDoctorCancellationHistory,
  getDoctorCancellationDetail,
} from '../../../../services/doctorCancellationService';
import './CancellationCenter.scss';

const CancellationCenter = () => {
  const [cancellations, setCancellations] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize] = useState(10);
  const [isLoading, setIsLoading] = useState(false);

  // Filters
  const [scopeFilter, setScopeFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Detail Drawer State
  const [selectedCancellationId, setSelectedCancellationId] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isOpenDrawer, setIsOpenDrawer] = useState(false);

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = {
        page: currentPage,
        limit: pageSize,
        scope: scopeFilter !== 'ALL' ? scopeFilter : undefined,
      };
      const res = await getDoctorCancellationHistory(params);
      if (res && res.errCode === 0 && res.data) {
        setCancellations(res.data.cancellations || []);
        setTotalCount(res.data.total || 0);
        setTotalPages(res.data.totalPages || 1);
      }
    } catch (err) {
      console.error('fetchHistory error:', err);
      toast.error('Lỗi khi tải danh sách các đợt hủy lịch!');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize, scopeFilter]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleOpenDetail = async (cancellationId) => {
    setSelectedCancellationId(cancellationId);
    setIsOpenDrawer(true);
    setIsLoadingDetail(true);
    try {
      const res = await getDoctorCancellationDetail(cancellationId);
      if (res && res.errCode === 0 && res.data) {
        setDetailData(res.data);
      } else {
        toast.error(res?.message || 'Không thể lấy thông tin chi tiết đợt hủy');
      }
    } catch (err) {
      console.error('getDetail error:', err);
      toast.error('Lỗi kết nối khi tải chi tiết đợt hủy');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleCloseDrawer = () => {
    setIsOpenDrawer(false);
    setSelectedCancellationId(null);
    setDetailData(null);
  };

  const getScopeBadge = (s) => {
    switch (s) {
      case 'DAY':
        return <span className="cc-scope-badge cc-scope-badge--day">Cả ngày</span>;
      case 'SLOT':
        return <span className="cc-scope-badge cc-scope-badge--slot">Khung giờ</span>;
      case 'BOOKING':
        return <span className="cc-scope-badge cc-scope-badge--booking">Một bệnh nhân</span>;
      case 'DATE_RANGE':
        return <span className="cc-scope-badge cc-scope-badge--range">Khoảng ngày</span>;
      default:
        return <span className="cc-scope-badge">{s}</span>;
    }
  };

  // Filter theo search tên bác sĩ
  const filteredCancellations = cancellations.filter((item) => {
    if (!searchTerm) return true;
    const docName = `${item.doctorData?.lastName || ''} ${item.doctorData?.firstName || ''}`.toLowerCase();
    const docEmail = (item.doctorData?.email || '').toLowerCase();
    const reasonText = (item.reason || '').toLowerCase();
    const q = searchTerm.toLowerCase();
    return docName.includes(q) || docEmail.includes(q) || reasonText.includes(q);
  });

  return (
    <div className="cancellation-center-page">
      {/* 1. Header Bar */}
      <div className="cc-header">
        <div className="cc-header__left">
          <div className="tw-flex tw-items-center tw-gap-3">
            <div className="cc-header__icon-box">
              <ShieldAlert className="tw-w-7 tw-h-7 tw-text-rose-600" />
            </div>
            <div>
              <h1 className="cc-header__title">Trung tâm Giám sát Hủy lịch Bác sĩ</h1>
              <p className="cc-header__subtitle">
                Kiểm toán các sự kiện bác sĩ báo bận, đóng slot và đối soát hoàn tiền 100% tự động vào Ví Bệnh nhân
              </p>
            </div>
          </div>
        </div>

        <div className="cc-header__actions">
          <button type="button" className="cc-btn cc-btn--refresh" onClick={fetchHistory} disabled={isLoading}>
            <RefreshCw className={`tw-w-4 tw-h-4 ${isLoading ? 'tw-animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* 2. Filter & Controls Bar */}
      <div className="cc-filter-bar">
        <div className="cc-search-box">
          <Search className="tw-w-4 tw-h-4 tw-text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo tên bác sĩ, email hoặc lý do hủy..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="cc-scope-tabs">
          {[
            { key: 'ALL', label: 'Tất cả phạm vi' },
            { key: 'SLOT', label: 'Theo khung giờ' },
            { key: 'DAY', label: 'Theo cả ngày' },
            { key: 'BOOKING', label: 'Theo bệnh nhân' },
            { key: 'DATE_RANGE', label: 'Khoảng ngày' },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`cc-scope-tab-btn ${scopeFilter === tab.key ? 'active' : ''}`}
              onClick={() => {
                setScopeFilter(tab.key);
                setCurrentPage(1);
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Master Table */}
      <div className="cc-table-card">
        <div className="table-responsive">
          <table className="cc-table">
            <thead>
              <tr>
                <th>Thời điểm hủy</th>
                <th>Bác sĩ xin nghỉ</th>
                <th>Phạm vi</th>
                <th>Lịch bị ảnh hưởng</th>
                <th className="tw-text-center">Số slot</th>
                <th className="tw-text-center">Số ca khám</th>
                <th className="tw-text-right">Tổng hoàn Ví (100%)</th>
                <th>Người thực hiện</th>
                <th>Lý do báo bận</th>
                <th className="tw-text-center">Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="text-center py-5">
                    <div className="tw-flex tw-items-center tw-justify-center tw-gap-2 tw-text-slate-500">
                      <RefreshCw className="tw-w-5 tw-h-5 tw-animate-spin tw-text-teal-600" />
                      <span>Đang tải danh sách đợt hủy lịch...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredCancellations.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-5">
                    <div className="tw-text-slate-400 tw-py-8">
                      <CheckCircle2 className="tw-w-10 tw-h-10 tw-mx-auto tw-text-slate-300 tw-mb-2" />
                      <p className="tw-text-sm tw-font-medium">Chưa có sự kiện bác sĩ hủy lịch nào trong hệ thống.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCancellations.map((item) => {
                  const doctorName =
                    `${item.doctorData?.lastName || ''} ${item.doctorData?.firstName || ''}`.trim() ||
                    `Bác sĩ #${item.doctorId}`;
                  const createdDateFormatted = moment(item.createdAt).format('HH:mm - DD/MM/YYYY');
                  const refundFormatted = (Number(item.totalRefundAmount) || 0).toLocaleString('vi-VN');

                  return (
                    <tr key={item.id}>
                      <td className="tw-font-mono tw-text-xs tw-text-slate-600">{createdDateFormatted}</td>
                      <td>
                        <div className="tw-font-semibold tw-text-slate-900 tw-text-xs">{doctorName}</div>
                        <div className="tw-text-[11px] tw-text-slate-500">{item.clinicData?.name || 'Cơ sở BookingCare'}</div>
                      </td>
                      <td>{getScopeBadge(item.scope)}</td>
                      <td>
                        <span className="tw-text-xs tw-text-slate-700">
                          {item.cancellationDate
                            ? moment(parseInt(item.cancellationDate, 10)).format('DD/MM/YYYY')
                            : '--'}
                        </span>
                      </td>
                      <td className="tw-text-center">
                        <span className="tw-font-bold tw-text-xs tw-text-slate-700">{item.affectedSlotsCount}</span>
                      </td>
                      <td className="tw-text-center">
                        <span className="tw-font-bold tw-text-xs tw-text-rose-600">{item.affectedBookingsCount}</span>
                      </td>
                      <td className="tw-text-right">
                        <span className="tw-font-extrabold tw-text-xs tw-text-teal-700">
                          +{refundFormatted} ₫
                        </span>
                      </td>
                      <td>
                        <span className={`cc-role-badge cc-role-badge--${item.cancelledByRole?.toLowerCase()}`}>
                          {item.cancelledByRole === 'ADMIN' ? 'Admin' : 'Bác sĩ'}
                        </span>
                      </td>
                      <td>
                        <div className="cc-reason-cell" title={item.reason}>
                          {item.reason}
                        </div>
                      </td>
                      <td className="tw-text-center">
                        <button
                          type="button"
                          className="cc-action-btn"
                          onClick={() => handleOpenDetail(item.id)}
                          title="Xem chi tiết các ca khám và bút toán hoàn tiền"
                        >
                          <Eye className="tw-w-4 tw-h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="cc-pagination">
            <span className="cc-pagination__info">
              Hiển thị {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, totalCount)} trên {totalCount} đợt hủy
            </span>
            <div className="cc-pagination__controls">
              <button
                type="button"
                className="cc-page-btn"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="tw-w-4 tw-h-4" /> Trước
              </button>
              <span className="cc-page-num">
                Trang {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                className="cc-page-btn"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Sau <ChevronRight className="tw-w-4 tw-h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. DETAIL DRAWER (MASTER-DETAIL AUDIT) */}
      {isOpenDrawer && (
        <div className="cc-drawer-overlay" onClick={handleCloseDrawer}>
          <div className="cc-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="cc-drawer__header">
              <div className="tw-flex tw-items-center tw-gap-3">
                <div className="cc-drawer__icon">
                  <FileText className="tw-w-5 tw-h-5 tw-text-teal-600" />
                </div>
                <div>
                  <h2 className="cc-drawer__title">Chi tiết Sự kiện Hủy Lịch & Đối soát</h2>
                  <p className="cc-drawer__subtitle">Mã sự kiện: {selectedCancellationId}</p>
                </div>
              </div>
              <button type="button" className="cc-drawer__close" onClick={handleCloseDrawer}>
                <X className="tw-w-5 tw-h-5" />
              </button>
            </div>

            <div className="cc-drawer__body">
              {isLoadingDetail ? (
                <div className="tw-py-20 tw-text-center tw-text-slate-500">
                  <RefreshCw className="tw-w-7 tw-h-7 tw-animate-spin tw-mx-auto tw-text-teal-600 tw-mb-2" />
                  <span>Đang tải chi tiết các đối tượng ảnh hưởng...</span>
                </div>
              ) : detailData ? (
                <div className="cc-detail-content">
                  {/* Summary Box */}
                  <div className="cc-detail-summary-card">
                    <div className="summary-row">
                      <span className="s-label">Bác sĩ xin nghỉ:</span>
                      <span className="s-val tw-font-bold tw-text-slate-900">
                        {detailData.doctorData?.lastName} {detailData.doctorData?.firstName}
                      </span>
                    </div>
                    <div className="summary-row">
                      <span className="s-label">Cơ sở y tế:</span>
                      <span className="s-val">{detailData.clinicData?.name || 'Toàn hệ thống'}</span>
                    </div>
                    <div className="summary-row">
                      <span className="s-label">Phạm vi hủy:</span>
                      <span className="s-val">{getScopeBadge(detailData.scope)}</span>
                    </div>
                    <div className="summary-row">
                      <span className="s-label">Người thực hiện:</span>
                      <span className="s-val">
                        {detailData.cancelledByUserData?.lastName} {detailData.cancelledByUserData?.firstName} ({detailData.cancelledByRole})
                      </span>
                    </div>
                    <div className="summary-row">
                      <span className="s-label">Thời gian thực hiện:</span>
                      <span className="s-val">{moment(detailData.createdAt).format('HH:mm - DD/MM/YYYY')}</span>
                    </div>
                    <div className="summary-row">
                      <span className="s-label">Lý do bác sĩ báo bận:</span>
                      <span className="s-val tw-text-rose-700 tw-font-medium">{detailData.reason}</span>
                    </div>
                  </div>

                  {/* Metrics Badge */}
                  <div className="cc-detail-metrics">
                    <div className="metric-box">
                      <span className="m-label">Số slot đóng</span>
                      <span className="m-val">{detailData.affectedSlotsCount}</span>
                    </div>
                    <div className="metric-box">
                      <span className="m-label">Bệnh nhân bị hủy</span>
                      <span className="m-val text-rose">{detailData.affectedBookingsCount}</span>
                    </div>
                    <div className="metric-box">
                      <span className="m-label">Tổng tiền hoàn 100%</span>
                      <span className="m-val text-teal">
                        {(Number(detailData.totalRefundAmount) || 0).toLocaleString('vi-VN')} ₫
                      </span>
                    </div>
                  </div>

                  {/* List of Affected Targets */}
                  <div className="cc-targets-section">
                    <h3 className="section-title">
                      Danh sách đối tượng bị ảnh hưởng & Bút toán hoàn tiền ({detailData.targets?.length || 0})
                    </h3>

                    <div className="targets-list">
                      {detailData.targets && detailData.targets.length > 0 ? (
                        detailData.targets.map((tgt) => (
                          <div key={tgt.id} className="target-item-card">
                            <div className="tw-flex tw-items-center tw-justify-between tw-mb-1.5">
                              <span className={`target-type-badge target-type-badge--${tgt.targetType.toLowerCase()}`}>
                                {tgt.targetType === 'BOOKING' ? 'Ca khám (Bệnh nhân)' : 'Khung giờ (Slot)'}
                              </span>
                              <span className="tw-text-[11px] tw-font-mono tw-text-slate-400">
                                #{tgt.targetType === 'BOOKING' ? `BK-${tgt.bookingId}` : `SCH-${tgt.scheduleId}`}
                              </span>
                            </div>

                            {tgt.targetType === 'BOOKING' ? (
                              <div className="tw-flex tw-items-center tw-justify-between">
                                <div>
                                  <div className="tw-text-xs tw-font-bold tw-text-slate-800">
                                    {tgt.bookingData?.patientName || `${tgt.patientData?.lastName || ''} ${tgt.patientData?.firstName || ''}`.trim()}
                                  </div>
                                  <div className="tw-text-[11px] tw-text-slate-500">
                                    SĐT: {tgt.bookingData?.patientPhoneNumber || tgt.patientData?.phoneNumber || '--'}
                                  </div>
                                </div>
                                <div className="tw-text-right">
                                  <div className="tw-text-xs tw-font-bold tw-text-teal-700">
                                    +{(Number(tgt.refundAmount) || 0).toLocaleString('vi-VN')} ₫
                                  </div>
                                  <div className="tw-text-[10px] tw-text-emerald-600 tw-flex tw-items-center tw-gap-1 tw-justify-end">
                                    <CheckCircle2 className="tw-w-3 tw-h-3" /> Hoàn vào Ví Bệnh nhân
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="tw-text-xs tw-text-slate-600">
                                <span>Khung giờ: <strong>{tgt.timeType}</strong> - Trạng thái: Đã đóng thành công</span>
                              </div>
                            )}

                            {tgt.note && (
                              <div className="tw-text-[11px] tw-text-slate-500 tw-mt-1 tw-italic">
                                {tgt.note}
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="tw-text-xs tw-text-slate-400 tw-italic">Không có đối tượng chi tiết.</div>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CancellationCenter;
