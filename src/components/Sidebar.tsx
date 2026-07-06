import React from 'react';
import { User, Notification, Message } from '../types';
import { 
  Home, 
  Compass, 
  MessageCircle, 
  Bell, 
  Bookmark, 
  BarChart3, 
  Settings, 
  LogOut,
  Sparkles,
  ShieldCheck,
  CircleUser
} from 'lucide-react';

interface SidebarProps {
  currentUser: User;
  notifications: Notification[];
  messages: Message[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
}

export default function Sidebar({
  currentUser,
  notifications,
  messages,
  activeTab,
  setActiveTab,
  onLogout,
}: SidebarProps) {
  const unreadNotifsCount = notifications.filter((n) => !n.read).length;
  const unreadMessagesCount = messages.filter(
    (m) => m.recipientId === currentUser.id && !m.read
  ).length;

  const menuItems = [
    {
      id: 'feed',
      label: 'Home Feed',
      icon: Home,
      badge: null,
    },
    {
      id: 'explore',
      label: 'Explore',
      icon: Compass,
      badge: null,
    },
    {
      id: 'messages',
      label: 'Messages',
      icon: MessageCircle,
      badge: unreadMessagesCount > 0 ? unreadMessagesCount : null,
      badgeColor: 'bg-blue-500',
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: Bell,
      badge: unreadNotifsCount > 0 ? unreadNotifsCount : null,
      badgeColor: 'bg-rose-500',
    },
    {
      id: 'bookmarks',
      label: 'Bookmarks',
      icon: Bookmark,
      badge: currentUser.bookmarks.length > 0 ? currentUser.bookmarks.length : null,
      badgeColor: 'bg-slate-400 dark:bg-slate-700',
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: BarChart3,
      badge: null,
    },
    {
      id: 'profile',
      label: 'My Profile',
      icon: CircleUser,
      badge: null,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      badge: null,
    },
  ];

  return (
    <div className="flex h-full flex-col justify-between p-4">
      {/* Upper Navigation Links */}
      <div className="space-y-1.5">
        {menuItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/15'
                  : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-900'
              }`}
            >
              <div className="flex items-center space-x-3.5">
                <IconComponent className={`h-5 w-5 ${isActive ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`} />
                <span>{item.label}</span>
              </div>
              
              {item.badge !== null && (
                <span className={`flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-white ring-2 ring-white dark:ring-gray-950 ${
                  isActive ? 'bg-white text-blue-600' : item.badgeColor
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Logged in User Badge Card */}
      <div className="mt-8 space-y-4">
        {/* Verification Status Card */}
        {!currentUser.verified && (
          <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3.5 dark:border-blue-900/40 dark:bg-blue-950/20">
            <div className="flex items-start space-x-2.5">
              <ShieldCheck className="h-4.5 w-4.5 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-blue-950 dark:text-blue-200">Get Verified Badge</h4>
                <p className="mt-0.5 text-[11px] leading-relaxed text-blue-700/80 dark:text-blue-400/80">
                  Submit a verification request in Settings to get the official checkmark.
                </p>
                <button 
                  onClick={() => setActiveTab('settings')}
                  className="mt-2 text-[11px] font-bold text-blue-600 hover:underline dark:text-blue-400"
                >
                  Verify Now →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* User Card */}
        <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <img
                src={currentUser.avatar}
                alt={currentUser.username}
                className="h-10 w-10 rounded-full object-cover border border-gray-100 dark:border-gray-800"
              />
              {currentUser.verified && (
                <span className="absolute -bottom-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-blue-500 text-[9px] text-white font-bold border-2 border-white dark:border-gray-950">
                  ✓
                </span>
              )}
            </div>
            <div className="overflow-hidden">
              <h5 className="truncate text-sm font-bold text-gray-900 dark:text-white">
                {currentUser.username}
              </h5>
              <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                {currentUser.email}
              </p>
            </div>
          </div>
          
          <button
            onClick={onLogout}
            className="rounded-lg p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
            title="Sign Out"
          >
            <LogOut className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
