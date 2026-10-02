import React from 'react';
import { useNavigate } from 'react-router-dom';
import moment from 'moment';
import 'moment/locale/vi';
import {
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  FileCheck,
  Wallet,
  Landmark,
  ArrowDownCircle,
  PhoneMissed,
  MessageSquare,
  Bell,
} from 'lucide-react';

/**
 * Maps notification types to corresponding visual attributes
 */
const getNotificationTypeConfig = (type) => {
  switch (type) {
    case 'BOOKING_CREATED':
      return {
        icon: Calendar,
        className: 'icon-booking-created',
      };
    case 'BOOKING_CONFIRMED':
      return {
        icon: CheckCircle,
        className: 'icon-booking-confirmed',
      };
    case 'BOOKING_CANCELLED':
      return {
        icon: XCircle,
        className: 'icon-booking-cancelled',
      };
    case 'BOOKING_RESCHEDULED':
      return {
        icon: Clock,
        className: 'icon-booking-rescheduled',
      };
    case 'CONSULTATION_COMPLETED':
      return {
        icon: FileCheck,
        className: 'icon-consultation-completed',
      };
    case 'PAYMENT_SUCCESS':
      return {
        icon: Wallet,
        className: 'icon-payment-success',
      };
    case 'WITHDRAWAL_REQUESTED':
    case 'WITHDRAWAL_PROCESSED':
      return {
        icon: Landmark,
        className: 'icon-withdrawal-processed',
      };
    case 'REFUND_COMPLETED':
      return {
        icon: ArrowDownCircle,
        className: 'icon-refund-completed',
      };
    case 'MISSED_CALL':
      return {
        icon: PhoneMissed,
        className: 'icon-missed-call',
      };
    case 'CONVERSATION_REOPENED':
      return {
        icon: MessageSquare,
        className: 'icon-conversation-reopened',
      };
    default:
      return {
        icon: Bell,
        className: 'icon-default',
      };
  }
};

/**
 * Resolves role-aware authorized deep link navigation target
 */
const resolveNavigationTarget = (notification, role) => {
  const type = notification.type;

  if (role === 'admin') {
    switch (type) {
      case 'WITHDRAWAL_REQUESTED':
      case 'WITHDRAWAL_PROCESSED':
      case 'PAYMENT_SUCCESS':
      case 'REFUND_COMPLETED':
        return '/system/financial-liquidity';
      case 'BOOKING_CANCELLED':
        return '/system/cancellation-center';
      case 'BOOKING_CREATED':
      case 'BOOKING_CONFIRMED':
      case 'BOOKING_RESCHEDULED':
        return '/system/analytics/bookings';
      default:
        return '/system/dashboard';
    }
  }

  if (role === 'doctor') {
    switch (type) {
      case 'BOOKING_CREATED':
      case 'BOOKING_CONFIRMED':
      case 'BOOKING_CANCELLED':
      case 'BOOKING_RESCHEDULED':
        return '/doctor-dashboard/manage-patient';
      case 'WITHDRAWAL_PROCESSED':
        return '/doctor-dashboard/doctor-revenue';
      case 'MISSED_CALL':
      case 'CONVERSATION_REOPENED':
        return '/doctor-dashboard/messages';
      default:
        return '/doctor-dashboard';
    }
  }

  // Patient / Default role navigation
  switch (type) {
    case 'BOOKING_CREATED':
    case 'BOOKING_CONFIRMED':
    case 'BOOKING_CANCELLED':
    case 'BOOKING_RESCHEDULED':
    case 'CONSULTATION_COMPLETED':
      return '/patient/history';
    case 'PAYMENT_SUCCESS':
    case 'REFUND_COMPLETED':
      return '/patient/wallet';
    case 'MISSED_CALL':
    case 'CONVERSATION_REOPENED':
      return '/patient/overview';
    default:
      return '/patient/overview';
  }
};

const NotificationItem = ({ notification, role = 'patient', onMarkAsRead, onCloseDropdown }) => {
  const navigate = useNavigate();
  const { icon: IconComponent, className: iconClass } = getNotificationTypeConfig(notification.type);

  const handleClick = (e) => {
    e.preventDefault();
    if (!notification.isRead && onMarkAsRead) {
      onMarkAsRead(notification.id);
    }
    if (onCloseDropdown) {
      onCloseDropdown();
    }
    const targetUrl = resolveNavigationTarget(notification, role);
    if (targetUrl) {
      navigate(targetUrl);
    }
  };

  const formattedTime = moment(notification.createdAt).fromNow();

  return (
    <li
      className={`notification-item ${notification.isRead ? 'read' : 'unread'}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleClick(e)}
    >
      <div className={`item-icon-wrapper ${iconClass}`}>
        <IconComponent size={18} />
      </div>

      <div className="item-content">
        <div className="item-title-row">
          <h4 className="item-title" title={notification.title}>
            {notification.title}
          </h4>
          <span className="item-time">{formattedTime}</span>
        </div>
        <p className="item-message" title={notification.message}>
          {notification.message}
        </p>
      </div>

      {!notification.isRead && <span className="item-unread-dot" />}
    </li>
  );
};

export default NotificationItem;
