import React from 'react';
import { User, Notification, Message } from '../types';
import { Home, Compass, MessageSquare, Bell, User as UserIcon } from 'lucide-react';

interface MobileNavProps {
  currentUser: User;
  notifications: Notification[];
  messages: Message[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function MobileNav({
  currentUser,
  notifications,
  messages,
  activeTab,
  setActiveTab,
}: MobileNavProps) {
  const unreadNotifs = notifications.filter((n) => !n.read).length;
  const unreadMsgs = messages.filter(
    (m) => m.recipientId === currentUser.id && !m.read
  ).length;

  const items = [
    { id: 'feed', icon: Home, label: 'Home' },
    { id: 'explore', icon: Compass, label: 'Explore' },
    { id: 'messages', icon: MessageSquare, label: 'Messages', badge: unreadMsgs },
    { id: 'notifications', icon: Bell, label: 'Alerts', badge: unreadNotifs },
    { id: 'profile', icon: UserIcon, label: 'Profile' },
  ];

  return (
    <nav
      role="navigation"
      aria-label="Mobile navigation"
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden border-t border-gray-100 bg-white/95 backdrop-blur-md dark:border-gray-800 dark:bg-gray-950/95"
    >
      <div className="flex items-center justify-around px-2 py-1.5">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex flex-col items-center justify-center px-3 py-1.5 rounded-xl transition ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-400 dark:text-gray-500'
              }`}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {item.badge && item.badge > 0 ? (
                  <span className="absolute -top-1.5 -right-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[8px] font-bold text-white">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                ) : null}
              </div>
              <span className={`mt-0.5 text-[9px] font-semibold ${isActive ? 'font-bold' : ''}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
