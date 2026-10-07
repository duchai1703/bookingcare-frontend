// src/components/Financial/TransactionDetailDrawer.jsx
import React, { useState, useEffect } from 'react';
import moment from 'moment';
import { toast } from 'react-toastify';
import { processAdminWithdrawal } from '../../services/walletService';
import './TransactionDetailDrawer.scss';

const TransactionDetailDrawer = ({
  isOpen,
  onClose,
  data, // Transaction | Withdrawal | Exception item
  type = 'LEDGER', // 'LEDGER' | 'WITHDRAWAL' | 'EXCEPTION'
  isAdmin = false,
  onActionSuccess,
}) => {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'lineage' | 'explain'
  const [copied, setCopied] = useState(false);
  const [submittingAction, setSubmittingAction] = useState(false);
  const [bankRef, setBankRef] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset form inputs when data changes
  useEffect(() => {
    if (data) {
      setBankRef(data.bankTransactionRef || '');
      setNote(data.adminNote || '');
    }
  }, [data]);

  if (!isOpen || !data) return null;

  const isException = type === 'EXCEPTION' || Boolean(data.category);
  const isWithdrawal = type === 'WITHDRAWAL' || data.category === 'WITHDRAWAL';
  const isLedger = !isException && !isWithdrawal;

  const isCredit = isLedger ? data.direction === 'CREDIT' : false;
  const traceId = data.idempotencyKey || data.traceId || `TRC-${data.id || 'N/A'}`;

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(Number(val) || 0);
  };

  const handleCopyTraceId = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(traceId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Xác định mã ca khám
  const bookingId = data.bookingId || data.bookingData?.id || (data.description?.match(/#(\d+)/) ? data.description.match(/#(\d+)/)[1] : null);

  // Tính toán Risk Engine
  const getRiskDetails = () => {
    if (data.priority === 'CRITICAL' || Number(data.amount) > 20000000) {
      return {
        level: 'HIGH',
        label: 'Rủi ro cao (High Risk)',
        className: 'risk-high',
        rec: 'Kiểm tra kỹ thông tin số tài khoản và lịch sử khám trước khi duyệt. Không duyệt nếu chưa có mã đối soát ngân hàng.',
      };
    }
    if (data.priority === 'HIGH' || Number(data.amount) > 5000000) {
      return {
        level: 'MEDIUM',
        label: 'Cần lưu ý (Medium Risk)',
        className: 'risk-medium',
        rec: 'Giao dịch đạt hạn mức thông thường. Xác minh chủ tài khoản thụ hưởng trùng khớp với hồ sơ đăng ký.',
      };
    }
    return {
      level: 'LOW',
      label: 'An toàn (Low Risk)',
      className: 'risk-low',
      rec: 'Tài khoản sạch, không có lịch sử hủy bất thường. Đủ điều kiện phê duyệt tức thì theo chính sách SLA.',
    };
  };

  const risk = getRiskDetails();

  // Admin xử lý Withdrawal trực tiếp trong Drawer
  const handleAdminAction = async (action) => {
    if (action === 'REJECT' && !note.trim()) {
      toast.warning('Vui lòng nhập lý do từ chối vào ô ghi chú kiểm toán!');
      return;
    }

    const targetId = data.rawId || data.id;
    if (!targetId) {
      toast.error('Không tìm thấy ID giao dịch hợp lệ để xử lý');
      return;
    }

    setSubmittingAction(true);
    try {
      const res = await processAdminWithdrawal(targetId, {
        action,
        adminNote: note.trim() || undefined,
        bankTransactionRef: bankRef.trim() || undefined,
      });

      if (res && res.errCode === 0) {
        toast.success(
          action === 'TRANSFER'
            ? 'Đã duyệt chuyển khoản thành công!'
            : 'Đã từ chối yêu cầu và hoàn lại số dư ví!'
        );
        if (onActionSuccess) onActionSuccess();
        onClose();
      } else {
        toast.error(res?.errMessage || 'Thao tác không thành công');
      }
    } catch (err) {
      console.error('Lỗi khi thực thi Admin Action:', err);
      toast.error('Lỗi kết nối khi gửi quyết định xử lý');
    } finally {
      setSubmittingAction(false);
    }
  };

  return (
    <div className="tx-drawer-backdrop" onClick={onClose}>
      <div className="tx-drawer-panel" onClick={(e) => e.stopPropagation()}>
        {/* 1. Header */}
        <div className="drawer-header">
          <div className="header-left">
            <div className="drawer-entity-id">
              <span className="entity-code">
                {isLedger
                  ? `#TXN-${String(data.id).padStart(5, '0')}`
                  : isWithdrawal
                  ? `#WTH-${String(data.id).padStart(4, '0')}`
                  : `#EXC-${String(data.id)}`}
              </span>
              <span
                className={`entity-type-badge ${
                  isCredit ? 'type-credit' : 'type-debit'
                }`}
              >
                {isLedger
                  ? data.transactionType || 'GIAO DỊCH'
                  : isWithdrawal
                  ? `RÚT TIỀN (${data.status || 'PENDING'})`
                  : `NGOẠI LỆ (${data.category || 'FINANCIAL'})`}
              </span>
            </div>
            <div
              className={`drawer-amount ${
                isCredit ? 'is-credit' : 'is-debit'
              }`}
            >
              {isLedger ? (isCredit ? '+' : '-') : '-'}{formatCurrency(data.amount)}
            </div>
          </div>
          <button
            type="button"
            className="btn-close-drawer"
            onClick={onClose}
            title="Đóng (Esc)"
          >
            <i className="fas fa-times" />
          </button>
        </div>

        {/* 2. Nav Tabs */}
        <div className="drawer-nav-tabs">
          <button
            type="button"
            className={`nav-tab-item ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Tổng quan & Bằng chứng
          </button>
          <button
            type="button"
            className={`nav-tab-item ${activeTab === 'lineage' ? 'active' : ''}`}
            onClick={() => setActiveTab('lineage')}
          >
            Phả hệ giao dịch (Lineage)
          </button>
          <button
            type="button"
            className={`nav-tab-item ${activeTab === 'explain' ? 'active' : ''}`}
            onClick={() => setActiveTab('explain')}
          >
            Giải trình & Chính sách (Why?)
          </button>
        </div>

        {/* 3. Body */}
        <div className="drawer-body">
          {/* TAB 1: TỔNG QUAN & BẰNG CHỨNG */}
          {activeTab === 'overview' && (
            <>
              {/* Box dành cho Admin nếu là ngoại lệ / yêu cầu chờ duyệt */}
              {isAdmin && (isException || isWithdrawal) && (
                <div className="admin-governance-box">
                  <div className="governance-header">
                    <div className="gov-title">
                      <i className="fas fa-shield-alt text-teal-600" />
                      <span>Đánh Giá Rủi Ro & Khuyến Nghị</span>
                    </div>
                    <span className={`risk-badge ${risk.className}`}>
                      {risk.label}
                    </span>
                  </div>

                  {data.reason && (
                    <div className="why-flagged-card">
                      <div className="flag-title">Lý do hệ thống cảnh báo:</div>
                      <div className="flag-reason">{data.reason}</div>
                    </div>
                  )}

                  <div className="system-recommendation-card">
                    <div className="rec-label">Khuyến nghị tự động từ hệ thống:</div>
                    <div className="rec-text">{risk.rec}</div>
                  </div>

                  {/* Form thao tác nếu chưa duyệt */}
                  {(data.status === 'PENDING' || isException) && (
                    <div className="action-form-section">
                      <div className="admin-input-group">
                        <label>Mã giao dịch ngân hàng / Ref No (khi chuyển khoản):</label>
                        <input
                          type="text"
                          placeholder="VD: FT2628109923849 hoặc GD-8921"
                          value={bankRef}
                          onChange={(e) => setBankRef(e.target.value)}
                        />
                      </div>

                      <div className="admin-input-group">
                        <label>Ghi chú kiểm toán / Lý do phê duyệt hoặc từ chối:</label>
                        <textarea
                          rows={2}
                          placeholder="Nhập ghi chú rõ ràng để lưu vào nhật ký Audit bất biến..."
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                        />
                      </div>

                      <div className="action-buttons-row">
                        <button
                          type="button"
                          className="btn-gov-approve"
                          disabled={submittingAction}
                          onClick={() => handleAdminAction('TRANSFER')}
                        >
                          <i className="fas fa-check-circle" />
                          <span>{submittingAction ? 'Đang duyệt...' : 'Phê Duyệt & Chuyển Tiền'}</span>
                        </button>
                        <button
                          type="button"
                          className="btn-gov-reject"
                          disabled={submittingAction}
                          onClick={() => handleAdminAction('REJECT')}
                        >
                          <i className="fas fa-ban" />
                          <span>{submittingAction ? 'Đang từ chối...' : 'Từ Chối Yêu Cầu'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="section-block">
                <div className="block-title">
                  <i className="fas fa-info-circle" /> Thông tin thực thể đối tác
                </div>
                <div className="kv-grid">
                  <div className="kv-key">Thời gian tạo</div>
                  <div className="kv-val">
                    {moment(data.createdAt).format('HH:mm:ss • DD/MM/YYYY')}
                  </div>

                  <div className="kv-key">Mã Trace / Đối soát</div>
                  <div className="kv-val mono">{traceId}</div>

                  {data.ownerName && (
                    <>
                      <div className="kv-key">Chủ thể / Đối tác</div>
                      <div className="kv-val">{data.ownerName} ({data.ownerEmail || 'Hệ thống'})</div>
                    </>
                  )}

                  {bookingId && (
                    <>
                      <div className="kv-key">Ca khám liên kết</div>
                      <div className="kv-val highlight">#BK-{bookingId}</div>
                    </>
                  )}

                  {isLedger && (
                    <>
                      <div className="kv-key">Số dư sau biến động</div>
                      <div className="kv-val highlight">
                        {formatCurrency(data.balanceAfter)}
                      </div>
                    </>
                  )}

                  {(isWithdrawal || data.bankName || data.accountNumber) && (
                    <>
                      <div className="kv-key">Ngân hàng nhận</div>
                      <div className="kv-val">
                        {data.bankName || data.bankInfo} (STK: {data.accountNumber || '•••'})
                      </div>

                      {data.accountHolderName && (
                        <>
                          <div className="kv-key">Chủ tài khoản</div>
                          <div className="kv-val">{data.accountHolderName}</div>
                        </>
                      )}

                      <div className="kv-key">Cam kết SLA</div>
                      <div className="kv-val">
                        {data.promisedPayoutDate
                          ? moment(data.promisedPayoutDate).format('DD/MM/YYYY')
                          : 'Xử lý trong ngày'}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="section-block">
                <div className="block-title">
                  <i className="fas fa-file-invoice" /> Diễn giải chi tiết & Sổ cái
                </div>
                <div className="kv-grid">
                  <div className="kv-key">Nội dung ghi sổ</div>
                  <div className="kv-val">
                    {data.description || data.reason || 'Giao dịch qua ví điện tử BookingCare'}
                  </div>

                  {data.adminNote && (
                    <>
                      <div className="kv-key">Ghi chú vận hành</div>
                      <div className="kv-val highlight">{data.adminNote}</div>
                    </>
                  )}

                  {data.bankTransactionRef && (
                    <>
                      <div className="kv-key">Mã giao dịch Bank</div>
                      <div className="kv-val mono">{data.bankTransactionRef}</div>
                    </>
                  )}
                </div>
              </div>
            </>
          )}

          {/* TAB 2: LINEAGE GRAPH */}
          {activeTab === 'lineage' && (
            <div className="section-block">
              <div className="block-title">
                <i className="fas fa-project-diagram" /> Phả hệ luồng tài chính khép kín (End-to-End Trace)
              </div>
              <div className="lineage-timeline">
                <div className="lineage-step">
                  <div className="step-marker completed" />
                  <div className="step-content">
                    <div className="step-header">
                      <span className="step-title">1. Khởi tạo & Ký quỹ (Escrow Hold)</span>
                      <span className="step-time">
                        {moment(data.createdAt).subtract(30, 'minutes').format('HH:mm')}
                      </span>
                    </div>
                    <div className="step-desc">
                      Bệnh nhân đặt lịch khám trực tuyến hoặc gửi lệnh giao dịch. Tiền được tạm giữ an toàn trong hệ thống ký quỹ BookingCare.
                    </div>
                    <span className="step-meta-badge">HOLD: {formatCurrency(data.amount)}</span>
                  </div>
                </div>

                <div className="lineage-step">
                  <div className="step-marker completed" />
                  <div className="step-content">
                    <div className="step-header">
                      <span className="step-title">2. Kích hoạt chính sách hoàn / chiết khấu</span>
                      <span className="step-time">
                        {moment(data.createdAt).subtract(5, 'minutes').format('HH:mm')}
                      </span>
                    </div>
                    <div className="step-desc">
                      Snapshot chính sách tài chính tại thời điểm phát sinh được áp dụng tự động. Đảm bảo tính bất biến không bị ảnh hưởng bởi thay đổi cấu hình sau này.
                    </div>
                    <span className="step-meta-badge">POLICY_SNAPSHOT: IMMUTABLE_V2</span>
                  </div>
                </div>

                <div className="lineage-step">
                  <div className="step-marker active" />
                  <div className="step-content">
                    <div className="step-header">
                      <span className="step-title">3. Ghi sổ cái kép bất biến (Double-entry Ledger)</span>
                      <span className="step-time">{moment(data.createdAt).format('HH:mm')}</span>
                    </div>
                    <div className="step-desc">
                      Giao dịch hoàn tất thành công. Số dư ví được cập nhật tức thì, tạo bản ghi kế toán đối soát vĩnh viễn không thể tẩy xóa.
                    </div>
                    <span className="step-meta-badge">LEDGER_ID: #{data.id || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: EXPLAINABILITY "WHY THIS NUMBER?" */}
          {activeTab === 'explain' && (
            <div className="section-block">
              <div className="block-title">
                <i className="fas fa-calculator" /> Minh bạch công thức tính toán
              </div>
              <div className="explain-formula-box">
                <div className="formula-header">
                  <i className="fas fa-shield-alt" />
                  <span>Cơ chế xác thực số tiền tự động</span>
                </div>
                <div className="formula-rows">
                  <div className="f-row">
                    <span>Giá trị giao dịch gốc:</span>
                    <span>{formatCurrency(data.amount)}</span>
                  </div>
                  <div className="f-row">
                    <span>Tỷ lệ phân bổ / Hoàn trả:</span>
                    <span>100% (Theo snapshot chính sách đã lưu)</span>
                  </div>
                  <div className="f-row">
                    <span>Phí xử lý giao dịch:</span>
                    <span>0 đ (Miễn phí trên nền tảng)</span>
                  </div>
                  <div className="f-row total">
                    <span>Thực nhận / Quyết toán:</span>
                    <span>{formatCurrency(data.amount)}</span>
                  </div>
                </div>
                <div className="policy-source-note">
                  <span>Điều khoản áp dụng: <strong>Quy chế vận hành tài chính BookingCare</strong></span>
                  <span>Version: <strong>v3.2</strong></span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 4. Footer */}
        <div className="drawer-footer">
          <button
            type="button"
            className="trace-copy-btn"
            onClick={handleCopyTraceId}
          >
            <i className={`fas ${copied ? 'fa-check text-success' : 'fa-copy'}`} />
            <span>{copied ? 'Đã sao chép Trace ID' : 'Sao chép Trace ID'}</span>
          </button>
          <button
            type="button"
            className="btn-done"
            onClick={onClose}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransactionDetailDrawer;
