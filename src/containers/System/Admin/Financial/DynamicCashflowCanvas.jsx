// src/containers/System/Admin/Financial/DynamicCashflowCanvas.jsx
// [BREAKTHROUGH FINTECH UI] Cockpit Điều Hành Dòng Tiền Động & Bình Thông Nhau Thanh Khoản
import React, { useState, useEffect, useMemo } from 'react';
import {
  Landmark,
  Wallet,
  Lock,
  Coins,
  DollarSign,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  AlertTriangle,
  Activity,
  Layers,
  SlidersHorizontal,
  Droplets,
  GitCommit,
  ExternalLink,
  ChevronRight,
  CheckCircle2,
  Maximize2
} from 'lucide-react';
import './DynamicCashflowCanvas.scss';

const formatVND = (num) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0);
};

export default function DynamicCashflowCanvas({
  vaults,
  reconciliation,
  stepBreakdown,
  recentTransactions = [],
  onOpenVault,
  onOpenLineage,
}) {
  // Chế độ xem: 'PIPE_FLOW' (Sơ đồ ống dẫn Sankey động) | 'LIQUID_RESERVOIR' (Bình thông nhau)
  const [viewMode, setViewMode] = useState('PIPE_FLOW');
  // Tốc độ dòng chảy: 'NORMAL' (1x) | 'FAST' (2x) | 'TURBO' (3x)
  const [flowSpeed, setFlowSpeed] = useState('NORMAL');
  // Hover node highlight
  const [hoveredNode, setHoveredNode] = useState(null);

  // Số liệu tính toán
  const realBankTotal = Number(vaults?.realBank?.currentBalance || 0);
  const patientTotal = Number(vaults?.patientWallets?.total || 0);
  const escrowTotal = Number(vaults?.escrowPool?.total || 0);
  const escrowDoctor = Number(vaults?.escrowPool?.doctorShare || 0);
  const escrowPlatform = Number(vaults?.escrowPool?.platformShare || 0);
  const doctorTotal = Number(vaults?.doctorWallets?.total || 0);
  const platformProfit = Number(vaults?.platformProfit?.spendable || 0);
  const totalInflow = Number(vaults?.realBank?.totalInflowVNPay || 0);
  const totalOutflow = Number(vaults?.realBank?.totalOutflowBank || 0);

  // Tính tỷ trọng dung tích chất lỏng (cho Liquid Reservoir)
  const maxCapacity = Math.max(realBankTotal, patientTotal + doctorTotal + escrowTotal + platformProfit, 1000000);
  const getFillPercent = (val) => Math.min(100, Math.max(12, Math.round((Number(val || 0) / maxCapacity) * 100)));

  const speedClass = flowSpeed === 'TURBO' ? 'speed-turbo' : flowSpeed === 'FAST' ? 'speed-fast' : 'speed-normal';

  return (
    <div className={`dynamic-cashflow-cockpit ${speedClass}`}>
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 1. COCKPIT CONTROL TOOLBAR                                          */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="cockpit-toolbar">
        <div className="toolbar-left">
          <div className="pulse-indicator">
            <span className="pulse-ring" />
            <span className="pulse-dot" />
            <span className="live-tag">LIVE HYDRAULIC ENGINE</span>
          </div>
          <div className="cockpit-title-group">
            <h3 className="cockpit-title">Sơ Đồ Dòng Chảy & Áp Suất Thanh Khoản</h3>
            <span className="cockpit-sub">
              Mô phỏng động học 60 FPS luân chuyển vốn thực vs vốn sổ cái
            </span>
          </div>
        </div>

        <div className="toolbar-right">
          {/* Tốc độ dòng chảy */}
          <div className="speed-selector">
            <span className="selector-label">Lưu lượng:</span>
            <button
              type="button"
              className={`btn-speed ${flowSpeed === 'NORMAL' ? 'active' : ''}`}
              onClick={() => setFlowSpeed('NORMAL')}
            >
              1x
            </button>
            <button
              type="button"
              className={`btn-speed ${flowSpeed === 'FAST' ? 'active' : ''}`}
              onClick={() => setFlowSpeed('FAST')}
            >
              2x
            </button>
            <button
              type="button"
              className={`btn-speed ${flowSpeed === 'TURBO' ? 'active' : ''}`}
              onClick={() => setFlowSpeed('TURBO')}
            >
              ⚡ Max
            </button>
          </div>

          {/* Mode Switcher */}
          <div className="mode-toggle-group">
            <button
              type="button"
              className={`btn-mode-tab ${viewMode === 'PIPE_FLOW' ? 'active' : ''}`}
              onClick={() => setViewMode('PIPE_FLOW')}
            >
              <Activity size={14} />
              <span>Dòng Chảy Sankey</span>
            </button>
            <button
              type="button"
              className={`btn-mode-tab ${viewMode === 'LIQUID_RESERVOIR' ? 'active' : ''}`}
              onClick={() => setViewMode('LIQUID_RESERVOIR')}
            >
              <Droplets size={14} />
              <span>Bình Thông Nhau</span>
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 2. MAIN DISPLAY: MODE 1 (SANKEY PIPE FLOW)                          */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {viewMode === 'PIPE_FLOW' && (
        <div className="pipe-flow-canvas-wrapper">
          {/* Flow Legend Banner */}
          <div className="canvas-sub-legend">
            <div className="legend-item real-cash">
              <span className="legend-sample-line dashed-cyan" />
              <span>Luồng Tiền Thật VCB (Đường nét đứt điện tử)</span>
            </div>
            <div className="legend-item virtual-stream">
              <span className="legend-sample-line solid-emerald" />
              <span>Luồng Số Dư Ảo & Ký Quỹ Escrow (Đường nét liền)</span>
            </div>
            <div className="legend-spacer" />
            <div className="legend-item latency">
              <ShieldCheck size={13} className="text-emerald" />
              <span>Bảo chứng thanh toán T+0</span>
            </div>
          </div>

          {/* Sơ đồ cấu trúc mạng lưới dòng tiền */}
          <div className="pipe-network-grid">
            {/* CỘT 1: NGUỒN VÀO (INFLOW) */}
            <div className="network-column col-inflow">
              <div
                className={`flow-station-card station-gateway ${hoveredNode === 'vnpay' ? 'highlighted' : ''}`}
                onMouseEnter={() => setHoveredNode('vnpay')}
                onMouseLeave={() => setHoveredNode(null)}
              >
                <div className="station-badge">CỔNG VÀO (INFLOW)</div>
                <div className="station-icon-wrap bg-blue-subtle">
                  <ArrowDownLeft size={20} className="text-blue" />
                </div>
                <div className="station-name">Cổng Thanh Toán VNPay</div>
                <div className="station-sub">Bệnh nhân nạp tiền từ ATM / Thẻ QT</div>
                <div className="station-amount text-blue">
                  +{formatVND(totalInflow)}
                </div>
                <div className="station-status-pill success">
                  <span className="dot" />
                  Đang mở cổng
                </div>
              </div>
            </div>

            {/* DÒNG CHẢY 1: CỔNG -> VCB & VÍ BN */}
            <div className="network-pipeline-column pipe-col-1">
              <div className="pipe-connector-bundle">
                <div className="pipe-line pipe-dashed-blue animate-particles" title="Tiền mặt chảy trực tiếp vào VCB Công ty" />
                <div className="pipe-badge-tag blue-tag">Tiền Thật Vào VCB</div>
              </div>
            </div>

            {/* CỘT 2: KHỐI TRUNG TÂM (VCB THẬT & VÍ BN) */}
            <div className="network-column col-central">
              {/* TÀI KHOẢN THẬT VCB */}
              <div
                className={`flow-station-card station-vcb ${hoveredNode === 'vcb' ? 'highlighted' : ''}`}
                onClick={() => onOpenVault && onOpenVault('realBank')}
                onMouseEnter={() => setHoveredNode('vcb')}
                onMouseLeave={() => setHoveredNode(null)}
              >
                <div className="station-badge badge-vcb">NEO BẢO CHỨNG (100% TIỀN THẬT)</div>
                <div className="station-icon-wrap bg-vcb">
                  <Landmark size={20} className="text-vcb" />
                </div>
                <div className="station-name">Tài Khoản VCB Công Ty</div>
                <div className="station-sub">{vaults?.realBank?.bankName || 'Vietcombank'} • {vaults?.realBank?.accountNumber || '9988-1703-8888'}</div>
                <div className="station-amount text-vcb">
                  {formatVND(realBankTotal)}
                </div>
                <div className="station-footer-action">
                  <span>Xem sao kê ngân hàng</span>
                  <ChevronRight size={13} />
                </div>
              </div>

              {/* DÒNG BẢO CHỨNG 1:1 TỪ VCB XUỐNG VÍ BN */}
              <div className="vertical-backing-pipe">
                <div className="backing-line animate-pulse-vertical" />
                <span className="backing-label">Bảo chứng 1:1</span>
              </div>

              {/* TỔNG VÍ BỆNH NHÂN */}
              <div
                className={`flow-station-card station-patient ${hoveredNode === 'patient' ? 'highlighted' : ''}`}
                onClick={() => onOpenVault && onOpenVault('patientWallets')}
                onMouseEnter={() => setHoveredNode('patient')}
                onMouseLeave={() => setHoveredNode(null)}
              >
                <div className="station-badge badge-patient">SỐ DƯ KHẢ DỤNG KHÁCH HÀNG</div>
                <div className="station-icon-wrap bg-purple-subtle">
                  <Wallet size={20} className="text-purple" />
                </div>
                <div className="station-name">Tổng Ví Ảo Bệnh Nhân</div>
                <div className="station-sub">{vaults?.patientWallets?.count || 0} tài khoản ví BN sẵn sàng khám</div>
                <div className="station-amount text-purple">
                  {formatVND(patientTotal)}
                </div>
                <div className="station-footer-action">
                  <span>Chi tiết danh bạ ví</span>
                  <ChevronRight size={13} />
                </div>
              </div>
            </div>

            {/* DÒNG CHẢY 2: VÍ BN -> ESCROW 2 NGĂN */}
            <div className="network-pipeline-column pipe-col-2">
              <div className="pipe-connector-bundle">
                <div className="pipe-line pipe-solid-purple animate-particles" title="Ví BN trừ tiền đặt cọc giữ chỗ ca khám" />
                <div className="pipe-badge-tag purple-tag">Đặt Khám (Hold)</div>
              </div>
            </div>

            {/* CỘT 3: TRẠM KÝ QUỸ ESCROW 2 NGĂN */}
            <div className="network-column col-escrow">
              <div
                className={`flow-station-card station-escrow ${hoveredNode === 'escrow' ? 'highlighted' : ''}`}
                onClick={() => onOpenVault && onOpenVault('escrowPool')}
                onMouseEnter={() => setHoveredNode('escrow')}
                onMouseLeave={() => setHoveredNode(null)}
              >
                <div className="station-badge badge-escrow">KHOANG KÝ QUỸ TẠM KHÓA (ESCROW)</div>
                <div className="station-icon-wrap bg-amber-subtle">
                  <Lock size={20} className="text-amber" />
                </div>
                <div className="station-name">Quỹ Tạm Giữ Hai Ngăn</div>
                <div className="station-sub">
                  {vaults?.escrowPool?.activeCount || 0} ca khám đang giữ chỗ chờ bác sĩ tiếp nhận
                </div>
                <div className="station-amount text-amber">
                  {formatVND(escrowTotal)}
                </div>

                {/* Phân tách 2 ngăn nội bộ */}
                <div className="escrow-splitter-box">
                  <div className="split-branch branch-doctor">
                    <span className="split-label">Ngăn BS (90%)</span>
                    <strong className="split-val text-emerald">{formatVND(escrowDoctor)}</strong>
                  </div>
                  <div className="split-divider-v" />
                  <div className="split-branch branch-platform">
                    <span className="split-label">Ngăn Sàn (10%)</span>
                    <strong className="split-val text-gold">{formatVND(escrowPlatform)}</strong>
                  </div>
                </div>

                <div className="station-footer-action">
                  <span>Mở khoang cọc chi tiết</span>
                  <ChevronRight size={13} />
                </div>
              </div>
            </div>

            {/* DÒNG CHẢY 3: ESCROW TÁCH 2 NHÁNH -> VÍ BS & LỢI NHUẬN SÀN */}
            <div className="network-pipeline-column pipe-col-3">
              <div className="bifurcation-pipes">
                <div className="branch-upper">
                  <div className="pipe-line pipe-solid-gold animate-particles" title="10% hoa hồng chuyển vào lợi nhuận sàn" />
                  <span className="branch-label gold-tag">10% Hoa Hồng Sàn</span>
                </div>
                <div className="branch-lower">
                  <div className="pipe-line pipe-solid-emerald animate-particles" title="90% thù lao chuyển vào ví bác sĩ" />
                  <span className="branch-label emerald-tag">90% Thù Lao Bác Sĩ</span>
                </div>
              </div>
            </div>

            {/* CỘT 4: ĐÍCH ĐẾN (VÍ BS, LỢI NHUẬN, VÀ RÚT TIỀN THỰC) */}
            <div className="network-column col-destination">
              {/* LỢI NHUẬN SÀN */}
              <div
                className={`flow-station-card station-profit ${hoveredNode === 'profit' ? 'highlighted' : ''}`}
                onClick={() => onOpenVault && onOpenVault('platformProfit')}
                onMouseEnter={() => setHoveredNode('profit')}
                onMouseLeave={() => setHoveredNode(null)}
              >
                <div className="station-badge badge-profit">DOANH THU THUẦN SÀN</div>
                <div className="station-icon-wrap bg-gold-subtle">
                  <DollarSign size={18} className="text-gold" />
                </div>
                <div className="station-name">Tiền Lời Công Ty</div>
                <div className="station-amount text-gold">
                  {formatVND(platformProfit)}
                </div>
                <div className="station-sub">Khả dụng kết chuyển / rút</div>
              </div>

              {/* TỔNG VÍ BÁC SĨ */}
              <div
                className={`flow-station-card station-doctor ${hoveredNode === 'doctor' ? 'highlighted' : ''}`}
                onClick={() => onOpenVault && onOpenVault('doctorWallets')}
                onMouseEnter={() => setHoveredNode('doctor')}
                onMouseLeave={() => setHoveredNode(null)}
              >
                <div className="station-badge badge-doctor">THÙ LAO BÁC SĨ (CHỜ RÚT)</div>
                <div className="station-icon-wrap bg-emerald-subtle">
                  <Coins size={18} className="text-emerald" />
                </div>
                <div className="station-name">Tổng Ví Ảo Bác Sĩ</div>
                <div className="station-sub">{vaults?.doctorWallets?.count || 0} bác sĩ nhận thù lao</div>
                <div className="station-amount text-emerald">
                  {formatVND(doctorTotal)}
                </div>
              </div>

              {/* DÒNG RÚT TIỀN NGÂN HÀNG THỰC */}
              <div
                className="flow-station-card station-outflow"
                title="Lệnh ủy nhiệm chi VCB chuyển khoản cho bác sĩ"
              >
                <div className="station-badge badge-outflow">CHI TRẢ NGÂN HÀNG THỰC</div>
                <div className="station-icon-wrap bg-rose-subtle">
                  <ArrowUpRight size={18} className="text-rose" />
                </div>
                <div className="station-name">Ủy Nhiệm Chi VCB</div>
                <div className="station-amount text-rose">
                  -{formatVND(totalOutflow)}
                </div>
                <div className="station-sub">Tiền mặt thật chuyển về tài khoản cá nhân</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 3. MAIN DISPLAY: MODE 2 (LIQUID RESERVOIR & PRESSURE GAUGES)       */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {viewMode === 'LIQUID_RESERVOIR' && (
        <div className="liquid-reservoir-wrapper">
          <div className="reservoir-intro-bar">
            <div className="intro-left">
              <span className="reservoir-badge">MÔ HÌNH BÌNH THÔNG NHAU SCADA</span>
              <p>Mỗi ngăn vốn đóng vai trò như một bình chứa chất lỏng thanh khoản. Áp suất bảo chứng luôn giữ ở mức 100%.</p>
            </div>
            <div className="intro-right">
              <div className="reactor-status-box">
                <span className="status-title">Trạng thái Cân Bằng Thủy Lực:</span>
                <strong className="status-val text-emerald">100% HOÀN HẢO</strong>
              </div>
            </div>
          </div>

          <div className="reservoir-tanks-grid">
            {/* TANK 1: VCB REAL CASH MASTER TANK */}
            <div className="tank-card vcb-tank" onClick={() => onOpenVault && onOpenVault('realBank')}>
              <div className="tank-header">
                <div className="tank-title-group">
                  <span className="tank-label">BỂ TIỀN MẶT THẬT</span>
                  <h4 className="tank-name">VCB Master Vault</h4>
                </div>
                <span className="tank-type-pill real">Tiền Mặt</span>
              </div>

              <div className="tank-gauge-visual">
                <div className="gauge-fill-bg">
                  <div
                    className="liquid-wave liquid-blue"
                    style={{ height: `${getFillPercent(realBankTotal)}%` }}
                  >
                    <div className="wave wave-1" />
                    <div className="wave wave-2" />
                  </div>
                </div>
                <div className="tank-metric-overlay">
                  <span className="metric-pct">{getFillPercent(realBankTotal)}%</span>
                  <strong className="metric-amt">{formatVND(realBankTotal)}</strong>
                  <span className="metric-desc">Bảo chứng 100% mọi ví ảo</span>
                </div>
              </div>

              <div className="tank-footer">
                <div className="pressure-readout">
                  <span>Áp suất:</span>
                  <strong className="text-blue">1.00 ATM (Ổn định)</strong>
                </div>
              </div>
            </div>

            {/* TANK 2: PATIENT PRE-FUND TANK */}
            <div className="tank-card patient-tank" onClick={() => onOpenVault && onOpenVault('patientWallets')}>
              <div className="tank-header">
                <div className="tank-title-group">
                  <span className="tank-label">BỂ SỐ DƯ BỆNH NHÂN</span>
                  <h4 className="tank-name">Patient Wallets</h4>
                </div>
                <span className="tank-type-pill virtual">Ví Ảo BN</span>
              </div>

              <div className="tank-gauge-visual">
                <div className="gauge-fill-bg">
                  <div
                    className="liquid-wave liquid-purple"
                    style={{ height: `${getFillPercent(patientTotal)}%` }}
                  >
                    <div className="wave wave-1" />
                    <div className="wave wave-2" />
                  </div>
                </div>
                <div className="tank-metric-overlay">
                  <span className="metric-pct">{getFillPercent(patientTotal)}%</span>
                  <strong className="metric-amt">{formatVND(patientTotal)}</strong>
                  <span className="metric-desc">{vaults?.patientWallets?.count || 0} tài khoản</span>
                </div>
              </div>

              <div className="tank-footer">
                <div className="pressure-readout">
                  <span>Trạng thái:</span>
                  <strong className="text-purple">Khả dụng đặt khám</strong>
                </div>
              </div>
            </div>

            {/* TANK 3: ESCROW HOLDING TANK */}
            <div className="tank-card escrow-tank" onClick={() => onOpenVault && onOpenVault('escrowPool')}>
              <div className="tank-header">
                <div className="tank-title-group">
                  <span className="tank-label">KHOANG ÁP SUẤT KÝ QUỸ</span>
                  <h4 className="tank-name">Escrow Pool (2 Ngăn)</h4>
                </div>
                <span className="tank-type-pill locked">Tạm Giữ</span>
              </div>

              <div className="tank-gauge-visual">
                <div className="gauge-fill-bg">
                  <div
                    className="liquid-wave liquid-amber"
                    style={{ height: `${getFillPercent(escrowTotal)}%` }}
                  >
                    <div className="wave wave-1" />
                    <div className="wave wave-2" />
                  </div>
                </div>
                <div className="tank-metric-overlay">
                  <span className="metric-pct">{getFillPercent(escrowTotal)}%</span>
                  <strong className="metric-amt">{formatVND(escrowTotal)}</strong>
                  <span className="metric-desc">{vaults?.escrowPool?.activeCount || 0} ca chờ khám</span>
                </div>
              </div>

              <div className="tank-footer">
                <div className="pressure-readout">
                  <span>Tách nhánh:</span>
                  <strong className="text-amber">90% BS / 10% Sàn</strong>
                </div>
              </div>
            </div>

            {/* TANK 4: DOCTOR VAULT */}
            <div className="tank-card doctor-tank" onClick={() => onOpenVault && onOpenVault('doctorWallets')}>
              <div className="tank-header">
                <div className="tank-title-group">
                  <span className="tank-label">BỂ THÙ LAO BÁC SĨ</span>
                  <h4 className="tank-name">Doctor Vault</h4>
                </div>
                <span className="tank-type-pill virtual">Ví Ảo BS</span>
              </div>

              <div className="tank-gauge-visual">
                <div className="gauge-fill-bg">
                  <div
                    className="liquid-wave liquid-emerald"
                    style={{ height: `${getFillPercent(doctorTotal)}%` }}
                  >
                    <div className="wave wave-1" />
                    <div className="wave wave-2" />
                  </div>
                </div>
                <div className="tank-metric-overlay">
                  <span className="metric-pct">{getFillPercent(doctorTotal)}%</span>
                  <strong className="metric-amt">{formatVND(doctorTotal)}</strong>
                  <span className="metric-desc">{vaults?.doctorWallets?.count || 0} bác sĩ</span>
                </div>
              </div>

              <div className="tank-footer">
                <div className="pressure-readout">
                  <span>Trạng thái:</span>
                  <strong className="text-emerald">Đã quyết toán</strong>
                </div>
              </div>
            </div>

            {/* TANK 5: PLATFORM PROFIT */}
            <div className="tank-card profit-tank" onClick={() => onOpenVault && onOpenVault('platformProfit')}>
              <div className="tank-header">
                <div className="tank-title-group">
                  <span className="tank-label">BỂ LỢI NHUẬN SÀN</span>
                  <h4 className="tank-name">Platform Profit</h4>
                </div>
                <span className="tank-type-pill profit">Lợi Nhuận</span>
              </div>

              <div className="tank-gauge-visual">
                <div className="gauge-fill-bg">
                  <div
                    className="liquid-wave liquid-gold"
                    style={{ height: `${getFillPercent(platformProfit)}%` }}
                  >
                    <div className="wave wave-1" />
                    <div className="wave wave-2" />
                  </div>
                </div>
                <div className="tank-metric-overlay">
                  <span className="metric-pct">{getFillPercent(platformProfit)}%</span>
                  <strong className="metric-amt">{formatVND(platformProfit)}</strong>
                  <span className="metric-desc">Thuần có thể rút</span>
                </div>
              </div>

              <div className="tank-footer">
                <div className="pressure-readout">
                  <span>Trạng thái:</span>
                  <strong className="text-gold">Sẵn sàng chi tiêu</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 4. LIVE TRANSACTION TICKER (NHỊP ĐẬP SỔ CÁI REAL-TIME)              */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="cockpit-live-ticker">
        <div className="ticker-badge">
          <Activity size={13} className="text-emerald animate-pulse" />
          <span>NHỊP ĐẬP GIAO DỊCH (LIVE AUDIT TICKER)</span>
        </div>

        <div className="ticker-items-scroller">
          {recentTransactions && recentTransactions.length > 0 ? (
            recentTransactions.slice(0, 6).map((tx, idx) => {
              const isCredit = tx.direction === 'CREDIT';
              return (
                <div
                  key={tx.id || idx}
                  className="ticker-item-card"
                  onClick={() => onOpenLineage && onOpenLineage(tx.bookingId || tx.referenceId || tx.id)}
                  title="Nhấp để truy vết vòng đời dòng tiền ca này"
                >
                  <span className={`tx-dir-pill ${isCredit ? 'credit' : 'debit'}`}>
                    {isCredit ? '+' : '-'}
                  </span>
                  <span className="tx-owner-name">{tx.ownerName || 'Khách hàng'}</span>
                  <span className="tx-type-tag">{tx.transactionType || tx.type || 'GD'}</span>
                  <strong className={`tx-amt ${isCredit ? 'text-emerald' : 'text-slate'}`}>
                    {formatVND(tx.amount)}
                  </strong>
                  <span className="tx-time">
                    {tx.createdAt ? new Date(tx.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                  <GitCommit size={11} className="tx-lineage-icon" />
                </div>
              );
            })
          ) : (
            <div className="ticker-empty">
              <span>Hệ thống sẵn sàng ghi nhận các bút toán luân chuyển mới...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

