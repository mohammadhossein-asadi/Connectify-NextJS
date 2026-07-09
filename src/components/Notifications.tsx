import React, { useState } from 'react';
import { User, Notification } from '../types';
import { Heart, MessageSquare, UserPlus, Info, Check, Trash2, Sparkles, CheckCircle, BellRing, BellOff, AtSign } from 'lucide-react';

interface NotificationsProps {
  currentUser: User;
  notifications: Notification[];
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
  setActiveTab: (tab: string) => void;
  onMessageUser?: (userId: string) => void;
}

export default function Notifications({
  currentUser,
  notifications,
  setNotifications,
  setActiveTab,
  onMessageUser,
}: NotificationsProps) {
  const [loading, setLoading] = useState(false);

  // Mark all notifications as read
  const handleMarkAllRead = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id }),
      });

      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Clear all notifications
  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to delete all notifications?')) return;
    setLoading(true);
    try {
      const res = await fetch('/api/notifications/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id }),
      });

      if (res.ok) {
        setNotifications([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Individual notification marker
  const handleMarkOneRead = async (id: string) => {
    try {
      const res = await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, notificationId: id }),
      });

      if (res.ok) {
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Helper to format creation times
  const formatNotifTime = (isoString: string) => {
    const elapsed = Date.now() - new Date(isoString).getTime();
    const mins = Math.round(elapsed / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(isoString).toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Group icons by notification type
  const getNotifIconAndColor = (type: Notification['type']) => {
    switch (type) {
      case 'like':
        return {
          icon: Heart,
          bgColor: 'bg-rose-50 text-rose-500 dark:bg-rose-950/30 dark:text-rose-400',
        };
      case 'comment':
        return {
          icon: MessageSquare,
          bgColor: 'bg-blue-50 text-blue-500 dark:bg-blue-950/30 dark:text-blue-400',
        };
      case 'follow':
        return {
          icon: UserPlus,
          bgColor: 'bg-emerald-50 text-emerald-500 dark:bg-emerald-950/30 dark:text-emerald-400',
        };
      case 'verify':
        return {
          icon: CheckCircle,
          bgColor: 'bg-indigo-50 text-indigo-500 dark:bg-indigo-950/30 dark:text-indigo-400',
        };
      case 'message':
        return {
          icon: Sparkles,
          bgColor: 'bg-amber-50 text-amber-500 dark:bg-amber-950/30 dark:text-amber-400',
        };
      case 'mention':
        return {
          icon: AtSign,
          bgColor: 'bg-violet-50 text-violet-500 dark:bg-violet-950/30 dark:text-violet-400',
        };
      default:
        return {
          icon: Info,
          bgColor: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Title block with operations */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center space-x-2">
            <BellRing className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <span>Notification Hub</span>
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">Stay updated on your organic posts growth and discussions.</p>
        </div>

        {notifications.length > 0 && (
          <div className="flex items-center space-x-2">
            <button
              onClick={handleMarkAllRead}
              disabled={loading || !notifications.some((n) => !n.read)}
              className="flex items-center space-x-1 rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 disabled:opacity-40"
            >
              <Check className="h-3.5 w-3.5" />
              <span>Mark all read</span>
            </button>
            <button
              onClick={handleClearAll}
              disabled={loading}
              className="flex items-center space-x-1 rounded-xl bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-100 dark:bg-rose-950/20 dark:text-rose-400 disabled:opacity-40"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear all</span>
            </button>
          </div>
        )}
      </div>

      {/* List Container */}
      {notifications.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 p-12 text-center dark:border-gray-800 bg-gray-50/30 dark:bg-gray-900/10">
          {/* Decorative Illustration */}
          <div className="relative mx-auto w-36 h-36 flex items-center justify-center mb-6">
            {/* Background Glow */}
            <div className="absolute inset-0 bg-indigo-100/40 dark:bg-indigo-950/20 rounded-full blur-2xl animate-pulse" />
            <div className="absolute w-28 h-28 rounded-full border border-indigo-100/60 dark:border-indigo-900/40 animate-spin" style={{ animationDuration: '25s' }} />
            <div className="absolute w-22 h-22 rounded-full border border-dashed border-blue-100/80 dark:border-blue-900/30" />

            {/* Main Styled Bell icon floating */}
            <div className="relative flex items-center justify-center w-16 h-16 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700 z-10 animate-bounce" style={{ animationDuration: '3s' }}>
              <BellRing className="h-8 w-8 text-blue-600 dark:text-blue-400 animate-pulse" />
              
              {/* Floating Little Red Badge */}
              <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-extrabold text-white ring-2 ring-white dark:ring-gray-900 animate-ping" />
              <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-extrabold text-white ring-2 ring-white dark:ring-gray-900">
                0
              </span>
            </div>

            {/* Small floating activity badges */}
            <div className="absolute top-3 left-4 flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-500 shadow-md border border-rose-100 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/30 -rotate-12 translate-y-2 opacity-80">
              <Heart className="h-4 w-4 fill-current" />
            </div>

            <div className="absolute bottom-3 right-4 flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-500 shadow-md border border-blue-100 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/30 rotate-12 -translate-y-2 opacity-80">
              <MessageSquare className="h-4 w-4" />
            </div>

            <div className="absolute bottom-12 left-2 flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-500 shadow-sm border border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/30 -rotate-6 opacity-75">
              <UserPlus className="h-3.5 w-3.5" />
            </div>
          </div>

          <h3 className="text-base font-bold text-gray-950 dark:text-white">All caught up!</h3>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto leading-relaxed">
            No active alerts or interactions yet. Once people view, like, comment, or mention you, we'll keep you posted right here!
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 rounded-2xl border border-gray-100 bg-white shadow-sm dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
          {notifications.map((notif) => {
            const { icon: IconComponent, bgColor } = getNotifIconAndColor(notif.type);

            return (
              <div
                key={notif.id}
                onClick={() => {
                  handleMarkOneRead(notif.id);
                  if (notif.type === 'message' && notif.relatedUserId && onMessageUser) {
                    onMessageUser(notif.relatedUserId);
                  }
                }}
                className={`flex items-start justify-between p-4 transition cursor-pointer hover:bg-gray-50/50 dark:hover:bg-gray-800/40 ${
                  !notif.read ? 'bg-blue-50/20 dark:bg-blue-950/10' : ''
                }`}
              >
                <div className="flex items-start space-x-3.5 flex-1">
                  {/* Visual Indicator of type */}
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ${bgColor}`}>
                    <IconComponent className="h-5 w-5" />
                  </div>

                  {/* Body description */}
                  <div className="space-y-0.5">
                    <p className="text-xs text-gray-800 dark:text-gray-300 font-sans">
                      {notif.relatedUsername ? (
                        <span 
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveTab('explore');
                          }}
                          className="font-bold text-gray-950 hover:underline dark:text-white mr-1"
                        >
                          @{notif.relatedUsername}
                        </span>
                      ) : null}
                      <span>{notif.content}</span>
                    </p>
                    <span className="text-[10px] text-gray-400">{formatNotifTime(notif.createdAt)}</span>
                  </div>
                </div>

                {/* Operations column */}
                <div className="flex items-center space-x-2 ml-4 shrink-0">
                  {!notif.read && (
                    <span 
                      className="h-2 w-2 rounded-full bg-blue-600"
                      title="Unread Notification" 
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
