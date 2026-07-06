import React, { useState } from 'react';
import { User, Notification, Message } from '../types';
import { Search, Bell, MessageSquare, Sun, Moon, LogOut, CheckCheck, Compass, Sparkles, Monitor } from 'lucide-react';

interface NavbarProps {
  currentUser: User;
  notifications: Notification[];
  messages: Message[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  onLogout: () => void;
}

export default function Navbar({
  currentUser,
  notifications,
  messages,
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery,
  theme,
  setTheme,
  onLogout,
}: NavbarProps) {
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  // Count unread notifications
  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;

  // Count unread messages from other users
  const unreadMessagesCount = messages.filter(
    (m) => m.recipientId === currentUser.id && !m.read
  ).length;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-100 bg-white/80 backdrop-blur-md dark:border-gray-800 dark:bg-gray-950/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Logo and Brand */}
        <div 
          onClick={() => { setActiveTab('feed'); setSearchQuery(''); }} 
          className="flex cursor-pointer items-center space-x-2 transition hover:opacity-90"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-md shadow-blue-500/20 text-white">
            <Sparkles className="h-5 w-5 fill-white/10" />
          </div>
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-indigo-400">
            Connectify
          </span>
        </div>

        {/* Search Bar */}
        <div className="hidden max-w-sm flex-1 px-4 sm:block md:px-8">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Search posts, tags, users..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (activeTab !== 'feed' && activeTab !== 'explore') {
                  setActiveTab('feed');
                }
              }}
              className="w-full rounded-full border border-gray-100 bg-gray-50 py-2 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500 dark:focus:border-blue-500 dark:focus:bg-gray-950"
            />
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* Theme Toggle Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowThemeMenu(!showThemeMenu)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-50 text-gray-600 hover:bg-gray-100 dark:bg-gray-900/50 dark:text-gray-300 dark:hover:bg-gray-800 border border-transparent dark:border-zinc-800/40"
              title="Change Theme"
            >
              {theme === 'light' && <Sun className="h-4.5 w-4.5 text-amber-500" />}
              {theme === 'dark' && <Moon className="h-4.5 w-4.5 text-indigo-400" />}
              {theme === 'system' && <Monitor className="h-4.5 w-4.5 text-emerald-400" />}
            </button>

            {showThemeMenu && (
              <>
                {/* Backdrop to close the menu */}
                <div 
                  className="fixed inset-0 z-50 cursor-default" 
                  onClick={() => setShowThemeMenu(false)} 
                />
                
                {/* Dropdown Options */}
                <div className="absolute right-0 mt-2 w-36 origin-top-right rounded-xl bg-white p-1.5 shadow-lg border border-zinc-200 dark:border-zinc-800 dark:bg-[#121214] z-55">
                  <button
                    onClick={() => {
                      setTheme('light');
                      setShowThemeMenu(false);
                    }}
                    className={`flex w-full items-center space-x-2.5 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium transition ${
                      theme === 'light'
                        ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400'
                        : 'text-gray-600 hover:bg-gray-50 dark:text-zinc-400 dark:hover:bg-zinc-800/50'
                    }`}
                  >
                    <Sun className="h-3.5 w-3.5 text-amber-500" />
                    <span>Light</span>
                  </button>
                  <button
                    onClick={() => {
                      setTheme('dark');
                      setShowThemeMenu(false);
                    }}
                    className={`flex w-full items-center space-x-2.5 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium transition ${
                      theme === 'dark'
                        ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400'
                        : 'text-gray-600 hover:bg-gray-50 dark:text-zinc-400 dark:hover:bg-zinc-800/50'
                    }`}
                  >
                    <Moon className="h-3.5 w-3.5 text-indigo-400" />
                    <span>Dark</span>
                  </button>
                  <button
                    onClick={() => {
                      setTheme('system');
                      setShowThemeMenu(false);
                    }}
                    className={`flex w-full items-center space-x-2.5 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium transition ${
                      theme === 'system'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400'
                        : 'text-gray-600 hover:bg-gray-50 dark:text-zinc-400 dark:hover:bg-zinc-800/50'
                    }`}
                  >
                    <Monitor className="h-3.5 w-3.5 text-emerald-400" />
                    <span>System</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Explore shortcut */}
          <button
            onClick={() => setActiveTab('explore')}
            className={`flex h-9 w-9 items-center justify-center rounded-full transition ${
              activeTab === 'explore'
                ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800'
            }`}
            title="Explore discovery"
          >
            <Compass className="h-4.5 w-4.5" />
          </button>

          {/* Notifications Trigger */}
          <button
            onClick={() => setActiveTab('notifications')}
            className={`relative flex h-9 w-9 items-center justify-center rounded-full transition ${
              activeTab === 'notifications'
                ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800'
            }`}
            title="Notifications list"
          >
            <Bell className="h-4.5 w-4.5" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-white dark:ring-gray-950">
                {unreadNotificationsCount}
              </span>
            )}
          </button>

          {/* Messages Trigger */}
          <button
            onClick={() => setActiveTab('messages')}
            className={`relative flex h-9 w-9 items-center justify-center rounded-full transition ${
              activeTab === 'messages'
                ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800'
            }`}
            title="Direct messages"
          >
            <MessageSquare className="h-4.5 w-4.5" />
            {unreadMessagesCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] font-bold text-white ring-2 ring-white dark:ring-gray-950">
                {unreadMessagesCount}
              </span>
            )}
          </button>

          {/* User Profile Mini Selection */}
          <div 
            onClick={() => setActiveTab('profile')} 
            className="flex cursor-pointer items-center space-x-2 rounded-full p-1 pl-1 pr-2 transition hover:bg-gray-100 dark:hover:bg-gray-900"
          >
            <div className="relative">
              <img
                src={currentUser.avatar}
                alt={currentUser.username}
                className="h-8 w-8 rounded-full object-cover ring-2 ring-blue-500/20"
              />
              {currentUser.verified && (
                <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[8px] text-white">
                  ✓
                </span>
              )}
            </div>
            <span className="hidden text-xs font-semibold text-gray-700 dark:text-gray-300 md:block">
              {currentUser.username}
            </span>
          </div>

          {/* Logout Button */}
          <button
            onClick={onLogout}
            className="hidden h-9 w-9 items-center justify-center rounded-full bg-rose-50/50 text-rose-500 transition hover:bg-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:hover:bg-rose-950/50 lg:flex"
            title="Logout"
          >
            <LogOut className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>
    </header>
  );
}
