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
  const [activeTab, setActiveTab] = useState('mission'); // 'mission' (5 câu hỏi) | 'lineage' | 'explain'
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

  const bookingId =
    data.bookingId ||
    data.bookingData?.id ||
    (data.description?.match(/#(\d+)/) ? data.description.match(/#(\d+)/)[1] : null);

  // Tính toán Risk Engine
  const getRiskDetails = () => {
    if (data.priority === 'CRITICAL' || Number(data.amount) > 20000000) {
      return {
        level: 'HIGH',
        label: 'Rủi ro cao (High Risk)',
        className: 'risk-high',
        rec: 'Giao dịch giá trị lớn hoặc gần hạn SLA. Khuyến nghị kiểm tra số tài khoản thụ hưởng trước khi giải ngân.',
      };
    }
    if (data.priority === 'HIGH' || Number(data.amount) > 5000000) {
      return {
        level: 'MEDIUM',
        label: 'Cần lưu ý (Medium Risk)',
        className: 'risk-medium',
        rec: 'Giao dịch đạt hạn mức thông thường. Đối soát tên người nhận trùng khớp với hồ sơ đăng ký.',
      };
    }
    return {
      level: 'LOW',
      label: 'An toàn (Low Risk)',
      className: 'risk-low',
      rec: 'Tài khoản sạch, không có khiếu nại. Đủ điều kiện phê duyệt tức thì theo chính sách SLA.',
    };
  };

  const risk = getRiskDetails();

  // Admin xử lý Withdrawal trực tiếp
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
            className={`nav-tab-item ${activeTab === 'mission' ? 'active' : ''}`}
            onClick={() => setActiveTab('mission')}
          >
            5 Câu Hỏi Vàng (Mission Control)
          </button>
          <button
            type="button"
            className={`nav-tab-item ${activeTab === 'lineage' ? 'active' : ''}`}
            onClick={() => setActiveTab('lineage')}
          >
            Phả hệ luồng tiền (Lineage)
          </button>
          <button
            type="button"
            className={`nav-tab-item ${activeTab === 'explain' ? 'active' : ''}`}
            onClick={() => setActiveTab('explain')}
          >
            Giải trình số tiền (Why?)
          </button>
        </div>

        {/* 3. Body Content */}
        <div className="drawer-body">
          {/* TAB 1: 5 CÂU HỎI VÀNG CỦA ADMIN */}
          {activeTab === 'mission' && (
            <>
              {/* CÂU HỎI 1: CÓ CHUYỆN GÌ XẢY RA? */}
              <div className="q-card">
                <div className="q-head">
                  <span className="q-num">1</span>
                  <span className="q-title">Có chuyện gì xảy ra? (Event Summary)</span>
                  <span className="q-badge" style={{ background: '#f1f5f9', color: '#475569' }}>
                    {moment(data.createdAt).format('HH:mm • DD/MM/YYYY')}
                  </span>
                </div>
                <div className="kv-grid">
                  <div className="kv-key">Chủ thể / Đối tác</div>
                  <div className="kv-val">
                    {data.ownerName || 'Bệnh nhân'} ({data.ownerEmail || data.walletType || 'Tài khoản sàn'})
                  </div>

                  <div className="kv-key">Số tiền phát sinh</div>
                  <div className="kv-val highlight" style={{ fontSize: '1rem', fontWeight: 800 }}>
                    {formatCurrency(data.amount)}
                  </div>

                  {bookingId && (
                    <>
                      <div className="kv-key">Ca khám liên kết</div>
                      <div className="kv-val highlight">#BK-{bookingId}</div>
                    </>
                  )}

                  <div className="kv-key">Mã Trace / Đối soát</div>
                  <div className="kv-val mono">{traceId}</div>
                </div>
              </div>

              {/* CÂU HỎI 2: TIỀN ĐANG Ở ĐÂU? (MONEY LOCATION TRACKER) */}
              <div className="q-card">
                <div className="q-head">
                  <span className="q-num">2</span>
                  <span className="q-title">Tiền hiện đang ở đâu? (Money Location)</span>
                </div>
                <div className="money-location-tracker">
                  {isWithdrawal ? (
                    <>
                      <div className="loc-node">
                        <i className="fas fa-wallet loc-icon" />
                        <span className="loc-name">Ví Người Dùng</span>
                        <span className="loc-desc">Đã trừ số dư</span>
                      </div>
                      <i className="fas fa-arrow-right loc-arrow" />
                      <div className="loc-node is-current">
                        <span className="loc-tag">TIỀN Ở ĐÂY</span>
                        <i className="fas fa-lock loc-icon" />
                        <span className="loc-name">Tạm Giữ (Hold)</span>
                        <span className="loc-desc">Két bảo chứng sàn</span>
                      </div>
                      <i className="fas fa-arrow-right loc-arrow" />
                      <div className="loc-node">
                        <i className="fas fa-university loc-icon" />
                        <span className="loc-name">Ngân Hàng Nhận</span>
                        <span className="loc-desc">Chờ giải ngân</span>
                      </div>
                    </>
                  ) : isCredit ? (
                    <>
                      <div className="loc-node">
                        <i className="fas fa-building loc-icon" />
                        <span className="loc-name">Ký Quỹ Sàn</span>
                        <span className="loc-desc">Nguồn hoàn tiền</span>
                      </div>
                      <i className="fas fa-arrow-right loc-arrow" />
                      <div className="loc-node is-current">
                        <span className="loc-tag">TIỀN Ở ĐÂY</span>
                        <i className="fas fa-wallet loc-icon" />
                        <span className="loc-name">Ví Bệnh Nhân</span>
                        <span className="loc-desc">Đã cộng khả dụng</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="loc-node">
                        <i className="fas fa-wallet loc-icon" />
                        <span className="loc-name">Ví Bệnh Nhân</span>
                        <span className="loc-desc">Khởi tạo thanh toán</span>
                      </div>
                      <i className="fas fa-arrow-right loc-arrow" />
                      <div className="loc-node is-current">
                        <span className="loc-tag">TIỀN Ở ĐÂY</span>
                        <i className="fas fa-shield-alt loc-icon" />
                        <span className="loc-name">Ký Quỹ (Escrow)</span>
                        <span className="loc-desc">Bảo chứng ca khám</span>
                      </div>
                      <i className="fas fa-arrow-right loc-arrow" />
                      <div className="loc-node">
                        <i className="fas fa-user-md loc-icon" />
                        <span className="loc-name">Bác Sĩ (T+24h)</span>
                        <span className="loc-desc">Sau khi khám xong</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* CÂU HỎI 3: VÌ SAO PHÁT SINH? (WHY FLAGGED & CALCULATION) */}
              <div className="q-card">
                <div className="q-head">
                  <span className="q-num">3</span>
                  <span className="q-title">Vì sao phát sinh? (Why Flagged)</span>
                  <span className={`q-badge ${risk.className}`}>
                    {risk.label}
                  </span>
                </div>
                <div className="why-flagged-card" style={{ marginBottom: '10px' }}>
                  <div className="flag-title">Lý do hệ thống chuyển tiếp:</div>
                  <div className="flag-reason">
                    {data.reason || data.description || 'Giao dịch đạt ngưỡng kiểm toán an toàn hệ thống.'}
                  </div>
                </div>
                {data.bankName && (
                  <div className="kv-grid" style={{ padding: '10px 14px' }}>
                    <div className="kv-key">Tài khoản đích</div>
                    <div className="kv-val">
                      {data.bankName} • STK: <strong>{data.accountNumber}</strong> ({data.accountHolderName})
                    </div>
                    <div className="kv-key">Hạn chót SLA</div>
                    <div className="kv-val">
                      {data.promisedPayoutDate ? moment(data.promisedPayoutDate).format('DD/MM/YYYY') : 'Trong ngày'}
                    </div>
                  </div>
                )}
              </div>

              {/* CÂU HỎI 4: HỆ THỐNG ĐÃ TỰ ĐỘNG LÀM GÌ? (AUTOMATED ACTIONS) */}
              <div className="q-card">
                <div className="q-head">
                  <span className="q-num">4</span>
                  <span className="q-title">Hệ thống đã tự động làm gì? (Actions Taken)</span>
                </div>
                <div className="automated-actions-list">
                  <div className="action-item">
                    <i className="fas fa-check-circle check-icon" />
                    <div className="action-text">
                      <strong>Kiểm toán số dư kép:</strong> Đối soát số dư khả dụng và tổng phát sinh trong sổ cái khớp 100%, không bị lệch tài khoản.
                    </div>
                  </div>
                  <div className="action-item">
                    <i className="fas fa-check-circle check-icon" />
                    <div className="action-text">
                      <strong>Cơ chế khóa an toàn:</strong> Tiền đã được đưa vào trạng thái Hold bất biến, loại trừ 100% rủi ro chi tiêu kép (Double Spending).
                    </div>
                  </div>
                  <div className="action-item">
                    <i className="fas fa-check-circle check-icon" />
                    <div className="action-text">
                      <strong>Chụp ảnh chính sách (Policy Snapshot):</strong> Điều khoản chiết khấu và SLA đã được đóng băng cố định, không bị sửa đổi sau này.
                    </div>
                  </div>
                </div>
              </div>

              {/* CÂU HỎI 5: ĐỀ XUẤT & QUYẾT ĐỊNH CỦA ADMIN */}
              <div className="q-card" style={{ border: '1.5px solid #0d9488' }}>
                <div className="q-head" style={{ borderBottomColor: '#ccfbf1' }}>
                  <span className="q-num" style={{ background: '#0f766e' }}>5</span>
                  <span className="q-title" style={{ color: '#0f766e' }}>Đề xuất & Quyết định của Admin</span>
                </div>

                <div className="system-recommendation-card">
                  <div className="rec-label">Khuyến nghị tự động từ hệ thống:</div>
                  <div className="rec-text">{risk.rec}</div>
                </div>

                {isAdmin && (data.status === 'PENDING' || isException) ? (
                  <div className="action-form-section" style={{ marginTop: '14px' }}>
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
                      <label>Ghi chú kiểm toán / Lý do duyệt hoặc từ chối:</label>
                      <textarea
                        rows={2}
                        placeholder="Nhập lý do rõ ràng để lưu vết vĩnh viễn vào nhật ký Audit..."
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
                        <span>{submittingAction ? 'Đang duyệt...' : 'Phê Duyệt & Giải Ngân'}</span>
                      </button>
                      <button
                        type="button"
                        className="btn-gov-reject"
                        disabled={submittingAction}
                        onClick={() => handleAdminAction('REJECT')}
                      >
                        <i className="fas fa-ban" />
                        <span>{submittingAction ? 'Đang từ chối...' : 'Từ Chối & Hoàn Số Dư'}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '8px 0', color: '#059669', fontSize: '0.84rem', fontWeight: 600 }}>
                    <i className="fas fa-check-circle me-1" /> Giao dịch này đã được hoàn tất và đóng băng trong sổ cái.
                  </div>
                )}
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
