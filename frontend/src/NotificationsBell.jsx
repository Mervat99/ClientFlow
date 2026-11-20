import { useEffect, useState } from 'react';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  X,
  RefreshCw,
  BellRing,
} from 'lucide-react';

import {
  getNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from './notificationsApi';

function formatDate(date) {
  if (!date) return '';

  return new Date(date).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function NotificationsBell({ onNavigate }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadNotifications = async () => {
    setLoading(true);
    setError('');

    try {
      const [items, count] = await Promise.all([
        getNotifications(),
        getUnreadCount(),
      ]);

      setNotifications(Array.isArray(items) ? items : []);
      setUnreadCount(Number(count) || 0);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Could not load notifications.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleToggle = () => {
    const nextOpen = !open;
    setOpen(nextOpen);

    if (nextOpen) {
      loadNotifications();
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await markNotificationAsRead(id);
      await loadNotifications();
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Could not update notification.'
      );
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      await loadNotifications();
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Could not update notifications.'
      );
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteNotification(id);
      await loadNotifications();
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Could not delete notification.'
      );
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.isRead) {
      await handleMarkRead(notification.id);
    }

    if (notification.link === '/documents') {
      onNavigate?.('Documents');
    } else if (notification.link === '/requests') {
      onNavigate?.('Requests');
    }

    setOpen(false);
  };

  return (
    <div className="notification-wrapper">
      <button
        type="button"
        className="icon-button notification-button"
        onClick={handleToggle}
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="notification-count">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            className="notification-dismiss-layer"
            aria-label="Close notifications"
            onClick={() => setOpen(false)}
          />

          <div className="notification-dropdown">
            <div className="notification-dropdown-header">
              <div>
                <h3>Notifications</h3>
                <span>
                  {unreadCount} unread
                </span>
              </div>

              <div className="notification-header-actions">
                <button
                  type="button"
                  title="Refresh"
                  onClick={loadNotifications}
                  disabled={loading}
                >
                  <RefreshCw size={15} />
                </button>

                <button
                  type="button"
                  title="Close"
                  onClick={() => setOpen(false)}
                >
                  <X size={17} />
                </button>
              </div>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                className="notification-mark-all"
                onClick={handleMarkAllRead}
              >
                <CheckCheck size={15} />
                Mark all as read
              </button>
            )}

            {error && (
              <div className="notification-error">
                {error}
              </div>
            )}

            <div className="notification-list">
              {loading ? (
                <div className="notification-empty">
                  <RefreshCw size={20} className="requests-spin" />
                  <span>Loading notifications...</span>
                </div>
              ) : notifications.length === 0 ? (
                <div className="notification-empty">
                  <BellRing size={24} />
                  <strong>No notifications</strong>
                  <span>You're all caught up.</span>
                </div>
              ) : (
                notifications.map((item) => (
                  <div
                    key={item.id}
                    className={`notification-item ${
                      item.isRead ? '' : 'notification-unread'
                    }`}
                  >
                    <button
                      type="button"
                      className="notification-item-content"
                      onClick={() => handleNotificationClick(item)}
                    >
                      <span className="notification-item-icon">
                        <Bell size={16} />
                      </span>

                      <span className="notification-item-text">
                        <strong>{item.title}</strong>
                        <span>{item.message}</span>
                        <small>{formatDate(item.createdAt)}</small>
                      </span>
                    </button>

                    <div className="notification-item-actions">
                      {!item.isRead && (
                        <button
                          type="button"
                          title="Mark as read"
                          onClick={() => handleMarkRead(item.id)}
                        >
                          <Check size={15} />
                        </button>
                      )}

                      <button
                        type="button"
                        title="Delete"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}