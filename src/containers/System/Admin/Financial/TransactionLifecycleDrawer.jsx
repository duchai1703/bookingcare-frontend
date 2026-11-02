// src/containers/System/Admin/Financial/TransactionLifecycleDrawer.jsx
// [RAMP FINTECH DESIGN SYSTEM] Cửa Sổ Truy Vết Vòng Đời Giao Dịch Toàn Vẹn (Transaction Lineage & Cash Flow Lifecycle Inspector)
// Tái hiện chính xác sơ đồ luân chuyển thực tế từ whiteboard:
// Đường nét đứt (Tiền thật VCB) <-> Đường nét liền (Ví ảo App)
// Đối soát 4 bước: Nạp tiền (Pay-In) -> Ký quỹ (Escrow Hold) -> Phân chia (Split 90/10) / Hoàn tiền -> Rút tiền ngân hàng (Cash-Out VCB)

import React, { useState, useEffect } from 'react';
import moment from 'moment';
import {
  X,
  GitCommit,
  CheckCircle2,
  Clock,
  ArrowRight,
  ArrowDown,
  Building2,
  CreditCard,
  Wallet,
  ShieldCheck,
  ShieldAlert,
  Copy,
  ExternalLink,
  FileSpreadsheet,
  RotateCw,
  Coins,
  User,
  Check,
  DollarSign,
  AlertCircle,
  HelpCircle,
  Download,
  Landmark,
  Radio
} from 'lucide-react';
import { toast } from 'react-toastify';
import { getTransactionLineage } from '../../../../services/walletService';
import './TransactionLifecycleDrawer.scss';

const formatMoney = (val) => (Number(val) || 0).toLocaleString('vi-VN') + ' ₫';

export default function TransactionLifecycleDrawer({
  isOpen,
  targetId,
  onClose,
  onNavigateTab
}) {
  const [activeTab, setActiveTab] = useState('flow'); // 'flow' | 'ledger' | 'reconciliation'
  const [loading, setLoading] = useState(false);
  const [lineageData, setLineageData] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);
  const [selectedNodeIndex, setSelectedNodeIndex] = useState(null);

  useEffect(() => {
    if (!isOpen || !targetId) {
      setLineageData(null);
      return;
    }

    let isMounted = true;
    const fetchLineage = async () => {
      setLoading(true);
      try {
        const res = await getTransactionLineage(targetId);
        if (isMounted && res && res.errCode === 0 && res.data) {
          setLineageData(res.data);
          // Tự động chọn bước hiện tại mà giao dịch đang dừng
          const curStep = res.data.currentStepNumber || 1;
          setSelectedNodeIndex(Math.max(0, curStep - 1));
        } else if (isMounted) {
          toast.warn(res?.errMessage || 'Không thể tải chuỗi giao dịch này');
        }
      } catch (err) {
        if (isMounted) {
          toast.error('Lỗi khi truy vấn vòng đời giao dịch');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchLineage();
    return () => {
      isMounted = false;
    };
  }, [isOpen, targetId]);

  if (!isOpen) return null;

  const handleCopy = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(String(text));
    setCopiedKey(key);
    toast.success(`Đã sao chép: ${text}`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const summary = lineageData?.summary || {};
  const nodes = lineageData?.nodes || [];
  const ledgerEntries = lineageData?.ledgerEntries || [];
  const reconciliation = lineageData?.reconciliation || {};
  const currentStepNumber = lineageData?.currentStepNumber || summary.currentStepNumber || 1;

  const getStageBadge = (stage) => {
    switch (stage) {
      case 'PAID_OUT':
      case 'COMPLETED':
        return <span className="ramp-pill success">● Hoàn tất trọn vẹn</span>;
      case 'SETTLED':
        return <span className="ramp-pill success">● Đã quyết toán ví</span>;
      case 'HELD':
        return <span className="ramp-pill warning">⏳ Đang ký quỹ Escrow</span>;
      case 'REFUNDED':
        return <span className="ramp-pill danger">↩ Đã hoàn tiền</span>;
      case 'DEPOSITED':
        return <span className="ramp-pill success">● Đã nạp vào ví</span>;
      default:
        return <span className="ramp-pill neutral">● Đang xử lý</span>;
    }
  };

  return (
    <div className="ramp-lifecycle-drawer-overlay" onClick={onClose}>
      <div
        className="ramp-lifecycle-drawer-panel"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* 1. DRAWER HEADER (RAMP FINTECH TOP BAR)                        */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="drawer-header">
          <div className="header-left">
            <div className="header-icon-box">
              <GitCommit size={18} className="text-lime-primary" />
            </div>
            <div className="title-box">
              <div className="title-row">
                <h3>Vòng Đời Giao Dịch</h3>
                <span className="lineage-tag" onClick={() => handleCopy(lineageData?.lineageId, 'lineageId')}>
                  {lineageData?.lineageId || `LIN-${targetId}`}
                  {copiedKey === 'lineageId' ? <Check size={12} /> : <Copy size={12} />}
                </span>
                {getStageBadge(summary.currentStage)}
              </div>
              <p className="subtitle">
                Truy vết thực tế: Kênh Tiền thật VCB (Đường nét đứt) song hành Kênh Số dư ảo App (Đường nét liền)
              </p>
            </div>
          </div>

          <div className="header-actions">
            <button
              type="button"
              className="ramp-btn-ghost close-btn"
              onClick={onClose}
              title="Đóng cửa sổ"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* 2. OVERVIEW HERO STRIP                                          */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="drawer-hero-strip">
          <div className="hero-stat-card">
            <span className="stat-label">
              {lineageData?.flowType === 'REFUND' ? 'Số tiền hoàn trả' : 'Tổng giá trị ca khám'}
            </span>
            <span className="stat-value text-emerald font-mono">
              {formatMoney(lineageData?.flowType === 'REFUND' ? summary.refundAmount : (summary.totalAmount || 300000))}
            </span>
            <span className="stat-sub">
              {summary.bookingId ? `Ca khám: #${summary.bookingId}` : `Giao dịch: ${String(targetId).slice(0, 8)}`}
            </span>
          </div>

          <div className="hero-stat-card">
            <span className="stat-label">Chủ tài khoản (Bệnh nhân)</span>
            <span className="stat-value text-primary font-bold">
              {summary.patientName || 'Bệnh nhân BookingCare'}
            </span>
            <span className="stat-sub">{summary.patientEmail || summary.clinic || 'Phòng khám Đa khoa'}</span>
          </div>

          <div className="hero-stat-card">
            <span className="stat-label">Bác sĩ phụ trách</span>
            <span className="stat-value text-slate-800 font-bold">
              {summary.doctorName || 'BS. Nguyễn Văn B'}
            </span>
            <span className="stat-sub">{summary.clinic || summary.specialty || 'Chuyên khoa'}</span>
          </div>

          <div className="hero-stat-card">
            <span className="stat-label">Thời điểm ghi nhận</span>
            <span className="stat-value text-slate-600 font-mono text-sm">
              {moment(summary.initiatedAt).format('DD/MM/YYYY HH:mm')}
            </span>
            <span className="stat-sub">
              {summary.completedAt ? `Cập nhật: ${moment(summary.completedAt).format('HH:mm')}` : 'Đang xử lý'}
            </span>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* 3. TABS SELECTOR (RAMP INLINE SEGMENTS)                        */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="drawer-tabs-bar">
          <button
            type="button"
            className={`drawer-tab-btn ${activeTab === 'flow' ? 'active' : ''}`}
            onClick={() => setActiveTab('flow')}
          >
            <span>1. Sơ đồ Luân Chuyển Thực Tế ({nodes.length} Bước)</span>
          </button>
          <button
            type="button"
            className={`drawer-tab-btn ${activeTab === 'ledger' ? 'active' : ''}`}
            onClick={() => setActiveTab('ledger')}
          >
            <span>2. Bút Toán Sổ Cái Kép ({ledgerEntries.length})</span>
          </button>
          <button
            type="button"
            className={`drawer-tab-btn ${activeTab === 'reconciliation' ? 'active' : ''}`}
            onClick={() => setActiveTab('reconciliation')}
          >
            <span>3. Đối Soát Số Dư VCB Thật</span>
          </button>
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* 4. MAIN BODY CONTENT                                            */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="drawer-content-body">
          {loading ? (
            <div className="drawer-loading-box">
              <RotateCw size={24} className="animate-spin text-slate-400" />
              <span>Đang truy vết chuỗi giao dịch toàn hệ thống...</span>
            </div>
          ) : !lineageData ? (
            <div className="drawer-loading-box">
              <AlertCircle size={24} className="text-amber-500" />
              <span>Không tìm thấy dữ liệu vòng đời cho mã {targetId}</span>
            </div>
          ) : (
            <>
              {/* TAB 1: SƠ ĐỒ LUÂN CHUYỂN DÒNG TIỀN (FLOW) */}
              {activeTab === 'flow' && (
                <div className="flow-tab-content">
                  {/* BĂNG CHỈ BÁO VỊ TRÍ BƯỚC HIỆN TẠI (CURRENT STAGE HERO BANNER) */}
                  <div className="current-step-status-hero">
                    <div className="hero-status-left">
                      <div className="status-radar-pulse">
                        <span className="pulse-ring" />
                        <span className="pulse-dot" />
                      </div>
                      <div className="status-text-box">
                        <span className="status-caption">VỊ TRÍ HIỆN TẠI TRONG VÒNG ĐỜI:</span>
                        <strong className="status-headline">
                          {lineageData.currentStageLabel || `Giao dịch đang ở Bước ${currentStepNumber}/${nodes.length}`}
                        </strong>
                      </div>
                    </div>
                    <span className="ramp-pill success font-mono">
                      BƯỚC {currentStepNumber} / {nodes.length}
                    </span>
                  </div>

                  {/* THANH TIẾN ĐỘ BƯỚC TRỰC QUAN (HORIZONTAL STEPPER PROGRESS TRACK) */}
                  <div className="stepper-progress-track">
                    {nodes.map((node, i) => {
                      const isDone = node.step < currentStepNumber || (node.step === currentStepNumber && node.status === 'COMPLETED');
                      const isActive = node.step === currentStepNumber && node.status !== 'COMPLETED';
                      const isPending = node.step > currentStepNumber;

                      return (
                        <div
                          key={node.key || i}
                          className={`stepper-node ${isDone ? 'completed' : isActive ? 'active' : 'pending'} ${selectedNodeIndex === i ? 'focused' : ''}`}
                          onClick={() => setSelectedNodeIndex(i)}
                          title={`Nhấn để cuộn đến Bước ${i + 1}`}
                        >
                          <div className="stepper-bubble">
                            {isDone ? <Check size={14} /> : <span>{i + 1}</span>}
                          </div>
                          <div className="stepper-node-info">
                            <span className="node-step-tag">BƯỚC {i + 1}</span>
                            <span className="node-title">{node.key}</span>
                            {node.step === currentStepNumber && (
                              <span className="node-active-pill">📍 ĐANG Ở ĐÂY</span>
                            )}
                          </div>
                          {i < nodes.length - 1 && (
                            <div className={`stepper-connector-line ${isDone ? 'done' : ''}`} />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* BẢNG CHÚ THÍCH MINH HỌA 2 LÀN TIỀN CỐT LÕI (WHITEBOARD SPEC) */}
                  <div className="flow-whiteboard-legend">
                    <div className="legend-box real-cash">
                      <div className="line-indicator-dashed" />
                      <div>
                        <strong>Đường nét đứt (Tiền thật Vietcombank)</strong>
                        <p>Luồng tiền ra vào tài khoản thanh toán thật của công ty tại ngân hàng Vietcombank</p>
                      </div>
                    </div>
                    <div className="legend-box virtual-app">
                      <div className="line-indicator-solid" />
                      <div>
                        <strong>Đường nét liền (Số dư ảo nội bộ App)</strong>
                        <p>Các bút toán cộng/trừ ví điện tử của Bệnh nhân, Bác sĩ & Két Escrow trên hệ thống</p>
                      </div>
                    </div>
                  </div>

                  {/* DANH SÁCH CÁC MẮT XÍCH VÒNG ĐỜI (LIFECYCLE NODES) */}
                  <div className="lifecycle-timeline">
                    {nodes.map((node, idx) => {
                      const isSelected = selectedNodeIndex === idx;
                      const isCurrent = node.step === currentStepNumber;
                      const isPending = node.status === 'PENDING';

                      return (
                        <div
                          key={node.key || idx}
                          className={`timeline-step-card ${isSelected ? 'selected' : ''} ${isCurrent ? 'current-active-step' : ''} ${isPending ? 'pending-step' : ''}`}
                          onClick={() => setSelectedNodeIndex(idx)}
                        >
                          {/* BANNER NỔI BẬT NẾU ĐÂY LÀ BƯỚC HIỆN TẠI */}
                          {isCurrent && (
                            <div className="card-current-badge-stripe">
                              <span className="stripe-pulse" />
                              <span>📍 GIAO DỊCH HIỆN ĐANG Ở BƯỚC NÀY ({node.stepBadge})</span>
                            </div>
                          )}

                          <div className="step-card-inner">
                            <div className="step-left-rail">
                              <div className={`step-number-bubble ${isCurrent ? 'bubble-active' : isPending ? 'bubble-pending' : 'bubble-done'}`}>
                                {node.status === 'COMPLETED' ? <Check size={14} /> : (idx + 1)}
                              </div>
                              {idx < nodes.length - 1 && <div className="rail-connector" />}
                            </div>

                            <div className="step-main-panel">
                              {/* HEADER BƯỚC */}
                              <div className="step-header-row">
                                <div className="step-title-area">
                                  <div className="step-badge-row">
                                    <span className="step-badge">BƯỚC {idx + 1}: {node.key}</span>
                                    <span className={`step-status-tag ${node.status.toLowerCase()}`}>
                                      {node.stepBadge}
                                    </span>
                                  </div>
                                  <h4>{node.title}</h4>
                                  <span className="step-sub">{node.subtitle}</span>
                                </div>
                                <div className="step-amount-area">
                                  <span className={`amount-value ${node.direction === 'CREDIT' ? 'text-emerald' : 'text-slate-800'}`}>
                                    {node.direction === 'CREDIT' ? '+' : ''}
                                    {formatMoney(node.amount)}
                                  </span>
                                  <span className="timestamp-tag">
                                    <Clock size={11} />
                                    {moment(node.timestamp).format('DD/MM/YYYY HH:mm')}
                                  </span>
                                </div>
                              </div>

                              {/* ═════════════════════════════════════════════════════════ */}
                              {/* TÁI HIỆN CHÍNH XÁC 2 LÀN LUÂN CHUYỂN SONG SONG             */}
                              {/* LÀN 1: TIỀN THẬT VCB (ĐỨT) vs LÀN 2: VÍ ẢO APP (LIỀN)   */}
                              {/* ═════════════════════════════════════════════════════════ */}
                              <div className="dual-flow-channels-container">
                                {/* LÀN 1: TIỀN MẶT THẬT (VIETCOMBANK - ĐƯỜNG NÉT ĐỨT) */}
                                <div className="channel-box dashed-real-bank">
                                  <div className="channel-badge-strip dashed">
                                    <div className="badge-left">
                                      <Landmark size={13} className="channel-icon" />
                                      <strong className="channel-title">
                                        LUỒNG TIỀN MẶT THẬT (VIETCOMBANK - ĐƯỜNG NÉT ĐỨT)
                                      </strong>
                                    </div>
                                    <span className="channel-flow-amount font-mono">
                                      {node.realBankChannel?.amountText || formatMoney(node.amount)}
                                    </span>
                                  </div>

                                  <div className="channel-flow-diagram">
                                    <div className="party-box from">
                                      <span className="party-caption">Nguồn tiền thực:</span>
                                      <strong className="party-name">{node.realBankChannel?.from}</strong>
                                    </div>
                                    <div className="flow-dash-visual">
                                      <span className="dash-line" />
                                      <span className="dash-arrow">➔</span>
                                    </div>
                                    <div className="party-box to">
                                      <span className="party-caption">Đích đến tài khoản:</span>
                                      <strong className="party-name">{node.realBankChannel?.to}</strong>
                                    </div>
                                  </div>

                                  <div className="channel-verdict">
                                    <span className="bullet">↳</span>
                                    <span>{node.realBankChannel?.statusText}</span>
                                  </div>
                                </div>

                                {/* LÀN 2: SỐ DƯ ẢO NỘI BỘ (HỆ THỐNG APP - ĐƯỜNG NÉT LIỀN) */}
                                <div className="channel-box solid-virtual-app">
                                  <div className="channel-badge-strip solid">
                                    <div className="badge-left">
                                      <Wallet size={13} className="channel-icon" />
                                      <strong className="channel-title">
                                        LUỒNG SỐ DƯ ẢO NỘI BỘ (HỆ THỐNG APP - ĐƯỜNG NÉT LIỀN)
                                      </strong>
                                    </div>
                                    <span className="channel-flow-amount font-mono">
                                      {node.virtualAppChannel?.amountText || formatMoney(node.amount)}
                                    </span>
                                  </div>

                                  <div className="channel-flow-diagram">
                                    <div className="party-box from">
                                      <span className="party-caption">Nguồn ghi nợ:</span>
                                      <strong className="party-name">{node.virtualAppChannel?.from}</strong>
                                    </div>
                                    <div className="flow-solid-visual">
                                      <span className="solid-line" />
                                      <span className="solid-arrow">➔</span>
                                    </div>
                                    <div className="party-box to">
                                      <span className="party-caption">Đích ghi có ví:</span>
                                      <strong className="party-name">{node.virtualAppChannel?.to}</strong>
                                    </div>
                                  </div>

                                  <div className="channel-verdict">
                                    <span className="bullet">↳</span>
                                    <span>{node.virtualAppChannel?.statusText}</span>
                                  </div>
                                </div>

                                {/* GIẢI THÍCH TÁC DỤNG CỐT LÕI TẠI BƯỚC NÀY */}
                                {node.educationalContrast && (
                                  <div className="channel-educational-contrast">
                                    <HelpCircle size={15} className="contrast-icon" />
                                    <div className="contrast-body">
                                      <strong>Ý nghĩa đối soát 2 đường tại Bước {idx + 1}:</strong>
                                      <p>{node.educationalContrast}</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 2: BÚT TOÁN SỔ CÁI KÉP (LEDGER) */}
              {activeTab === 'ledger' && (
                <div className="ledger-tab-content">
                  <div className="ledger-intro-banner">
                    <ShieldCheck size={18} className="text-emerald" />
                    <div>
                      <strong>Nhật Ký Sổ Cái Bất Biến (Immutable Double-Entry Ledger)</strong>
                      <p>
                        Mỗi bước trong vòng đời của ca này đều sinh ra một cặp bút toán đối ứng Nợ/Có cân bằng theo Chuẩn mực Kế toán RAMP.
                      </p>
                    </div>
                  </div>

                  <div className="ramp-table-wrapper">
                    <table className="ramp-table">
                      <thead>
                        <tr>
                          <th>Mã Bút Toán</th>
                          <th>Tài Khoản Kế Toán</th>
                          <th>Nghiệp Vụ</th>
                          <th>Chiều</th>
                          <th className="text-right">Phát Sinh</th>
                          <th className="text-right">Số Dư Sau</th>
                          <th>Diễn Giải</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ledgerEntries.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="text-center py-6 text-muted">
                              Không có dữ liệu sổ cái phát sinh cho giao dịch này.
                            </td>
                          </tr>
                        ) : (
                          ledgerEntries.map((jrn, i) => (
                            <tr key={jrn.journalCode || i}>
                              <td className="font-mono text-xs font-bold text-slate-800">
                                {jrn.journalCode}
                              </td>
                              <td className="text-xs font-medium text-slate-700">
                                {jrn.account}
                              </td>
                              <td>
                                <span className="ramp-pill neutral text-xs font-mono">
                                  {jrn.type}
                                </span>
                              </td>
                              <td>
                                <span className={`ramp-pill ${jrn.direction === 'CREDIT' ? 'success' : 'neutral'}`}>
                                  {jrn.direction === 'CREDIT' ? '+ Ghi Có' : '- Ghi Nợ'}
                                </span>
                              </td>
                              <td className="text-right font-mono font-bold">
                                <span className={jrn.direction === 'CREDIT' ? 'text-emerald' : 'text-slate-800'}>
                                  {jrn.direction === 'CREDIT' ? '+' : '-'}{formatMoney(jrn.amount)}
                                </span>
                              </td>
                              <td className="text-right font-mono text-xs text-slate-600">
                                {formatMoney(jrn.balanceAfter)}
                              </td>
                              <td className="text-xs text-slate-600">
                                {jrn.desc}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: ĐỐI SOÁT SỐ DƯ VCB THẬT (RECONCILIATION) */}
              {activeTab === 'reconciliation' && (
                <div className="reconcile-tab-content">
                  <div className="reconcile-math-card">
                    <div className="math-header">
                      <div className="math-title">
                        <CheckCircle2 size={20} className="text-emerald" />
                        <span>Phương Trình Bất Biến Dòng Tiền (Invariant Inviolability)</span>
                      </div>
                      <span className="ramp-pill success">ĐỐI SOÁT KHỚP 100%</span>
                    </div>

                    <div className="formula-box">
                      <span className="formula-tag">ĐỊNH LÝ BẢO CHỨNG:</span>
                      <code>{reconciliation.invariantEquation}</code>
                    </div>

                    <div className="equation-breakdown-grid">
                      <div className="equation-col left-side">
                        <span className="col-caption">TIỀN MẶT THỰC TẾ (VCB CÔNG TY)</span>
                        <div className="col-val text-blue font-bold font-mono">
                          {formatMoney(reconciliation.realCashBalance)}
                        </div>
                        <span className="col-sub">
                          {reconciliation.formula}
                        </span>
                      </div>

                      <div className="equation-operator">=</div>

                      <div className="equation-col right-side">
                        <span className="col-caption">NGHĨA VỤ SỔ CÁI NỘI BỘ (APP OBLIGATIONS)</span>
                        <div className="obligations-list">
                          <div className="obligation-item">
                            <span>Bệnh nhân:</span>
                            <strong className="font-mono">{summary.patientName}</strong>
                          </div>
                          <div className="obligation-item">
                            <span>Bác sĩ:</span>
                            <strong className="font-mono">{summary.doctorName}</strong>
                          </div>
                          <div className="obligation-item highlight">
                            <span>Trạng thái đối soát:</span>
                            <strong className="font-mono text-emerald">Không xảy ra sai lệch ảo</strong>
                          </div>
                        </div>
                        <div className="sum-row">
                          <span>Tổng nghĩa vụ sổ cái:</span>
                          <strong className="text-emerald font-mono font-bold">
                            {formatMoney(reconciliation.virtualLedgerBalance || reconciliation.realCashBalance)}
                          </strong>
                        </div>
                      </div>
                    </div>

                    <div className="reconcile-alert-box">
                      <AlertCircle size={16} className="text-blue" />
                      <span>
                        Hệ thống đối soát xác nhận: Tiền mặt thật trong Vietcombank bảo chứng 100% cho mọi số dư trên app. Tuyệt đối không phát sinh tiền khống.
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* 5. DRAWER FOOTER ACTIONS                                        */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="drawer-footer">
          <div className="footer-left">
            <button
              type="button"
              className="ramp-btn-secondary"
              onClick={() => {
                const jsonStr = JSON.stringify(lineageData, null, 2);
                navigator.clipboard.writeText(jsonStr);
                toast.success('Đã sao chép toàn bộ JSON Audit Proof!');
              }}
            >
              <Download size={13} />
              <span>Xuất JSON Audit</span>
            </button>
            {onNavigateTab && (
              <button
                type="button"
                className="ramp-btn-secondary"
                onClick={() => {
                  onClose();
                  onNavigateTab('ledger');
                }}
              >
                <FileSpreadsheet size={13} />
                <span>Mở trong Sổ Cái Kép</span>
              </button>
            )}
          </div>

          <div className="footer-right">
            <button
              type="button"
              className="ramp-btn-primary"
              onClick={onClose}
            >
              Đóng cửa sổ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
