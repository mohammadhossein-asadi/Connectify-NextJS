import React, { useState, useEffect } from 'react';
import { User, Post, Story, Notification, Message } from './types';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Feed from './components/Feed';
import Explore from './components/Explore';
import Messages from './components/Messages';
import Notifications from './components/Notifications';
import Bookmarks from './components/Bookmarks';
import Analytics from './components/Analytics';
import Settings from './components/Settings';
import Profile from './components/Profile';
import AuthModal from './components/AuthModal';
import StoriesModal from './components/StoriesModal';
import { 
  Sparkles, 
  Compass, 
  UserPlus, 
  Heart, 
  HelpCircle, 
  AlertCircle, 
  CheckCheck, 
  ChevronRight,
  TrendingUp
} from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('connectify_token'));
  const [activeTab, setActiveTab] = useState<string>('feed');
  const [posts, setPosts] = useState<Post[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedChatUser, setSelectedChatUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => {
    const saved = localStorage.getItem('connectify_theme');
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      return saved as 'light' | 'dark' | 'system';
    }
    return 'system'; // Default to system theme
  });

  // Dynamic recommendations for right widget panel
  const [rightRecommendations, setRightRecommendations] = useState<User[]>([]);

  // 1. Session restoration on startup
  useEffect(() => {
    const restoreSession = async () => {
      if (!token) return;
      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok && res.headers.get("content-type")?.includes("application/json")) {
          const data = await res.json();
          setCurrentUser(data.user);
        } else if (res.ok) {
          // Response is ok but not JSON (likely HTML during startup/restart)
          // Do nothing and wait for the next render/session check rather than wiping token
        } else {
          // Token expired or invalid
          localStorage.removeItem('connectify_token');
          setToken(null);
        }
      } catch (err) {
        console.error('Session restore failed:', err);
      }
    };

    restoreSession();
  }, [token]);

  // 2. Fetch notifications, stories and global messages
  const fetchPeriodicData = async () => {
    if (!currentUser) return;
    try {
      // Fetch Notifications
      const notifRes = await fetch(`/api/notifications?userId=${currentUser.id}`);
      if (notifRes.ok) {
        const notifData = notifRes.headers.get("content-type")?.includes("application/json") ? await notifRes.json() : null;
        if (notifData) setNotifications(notifData);
      }

      // Fetch Stories
      const storyRes = await fetch('/api/stories');
      if (storyRes.ok) {
        const storyData = storyRes.headers.get("content-type")?.includes("application/json") ? await storyRes.json() : null;
        if (storyData) setStories(storyData);
      }

      // Fetch widget recommendations
      const recsRes = await fetch(`/api/users/recommendations?userId=${currentUser.id}`);
      if (recsRes.ok) {
        const recsData = recsRes.headers.get("content-type")?.includes("application/json") ? await recsRes.json() : null;
        if (recsData) setRightRecommendations(recsData.slice(0, 3));
      }
    } catch (err) {
      console.error('Periodic state sync failed:', err);
    }
  };

  useEffect(() => {
    if (!currentUser) return;
    fetchPeriodicData();
    // Refresh notifications, stories, and recommendations every 5 seconds
    const interval = setInterval(fetchPeriodicData, 5000);
    return () => clearInterval(interval);
  }, [currentUser]);

  // 3. Dynamic Theme System (Light, Dark, System) implementation
  useEffect(() => {
    const root = window.document.documentElement;
    localStorage.setItem('connectify_theme', theme);

    const applyTheme = () => {
      let resolvedTheme = theme;
      if (theme === 'system') {
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        resolvedTheme = systemPrefersDark ? 'dark' : 'light';
      }

      if (resolvedTheme === 'dark') {
        root.classList.add('dark');
        root.style.colorScheme = 'dark';
      } else {
        root.classList.remove('dark');
        root.style.colorScheme = 'light';
      }
    };

    applyTheme();

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = (e: MediaQueryListEvent) => {
        const rootNode = window.document.documentElement;
        if (e.matches) {
          rootNode.classList.add('dark');
          rootNode.style.colorScheme = 'dark';
        } else {
          rootNode.classList.remove('dark');
          rootNode.style.colorScheme = 'light';
        }
      };

      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, [theme]);

  const handleLoginSuccess = (user: User, userToken: string) => {
    localStorage.setItem('connectify_token', userToken);
    setToken(userToken);
    setCurrentUser(user);
    setActiveTab('feed');
  };

  const handleLogout = () => {
    localStorage.removeItem('connectify_token');
    setToken(null);
    setCurrentUser(null);
  };

  const handleFollowRightWidget = async (targetUserId: string) => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/users/${targetUserId}/follow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id }),
      });

      if (res.ok && res.headers.get("content-type")?.includes("application/json")) {
        const data = await res.json();
        setCurrentUser(data.user);
        // Refresh widget recommendations
        fetchPeriodicData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMessageUserById = async (userId: string) => {
    try {
      const res = await fetch(`/api/users/${userId}`);
      if (res.ok && res.headers.get("content-type")?.includes("application/json")) {
        const targetUser = await res.json();
        setSelectedChatUser(targetUser);
        setActiveTab('messages');
      } else {
        // Fallback or bot handling
        if (userId === 'gemini-bot') {
          const botRes = await fetch('/api/users/gemini-bot');
          const botUser = botRes.ok && botRes.headers.get("content-type")?.includes("application/json") ? await botRes.json() : {
            id: 'gemini-bot',
            email: 'bot@gemini.ai',
            username: 'GeminiBot',
            bio: 'Official AI Assistant',
            avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
            cover: '',
            followers: [],
            following: [],
            verified: true,
            bookmarks: [],
            createdAt: '',
          };
          setSelectedChatUser(botUser);
          setActiveTab('messages');
        }
      }
    } catch (err) {
      console.error('Failed to initiate DM conversation:', err);
    }
  };

  // If user is not authenticated, show Auth Screen directly
  if (!currentUser) {
    return <AuthModal onLoginSuccess={handleLoginSuccess} />;
  }

  // Define tab renders
  const renderTabContent = () => {
    switch (activeTab) {
      case 'feed':
        return (
          <Feed
            currentUser={currentUser}
            posts={posts}
            stories={stories}
            setPosts={setPosts}
            onStoryClick={(idx) => setActiveStoryIndex(idx)}
            onStoryCreated={(story) => setStories((prev) => [story, ...prev])}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            setActiveTab={setActiveTab}
            onMessageUser={handleMessageUserById}
          />
        );
      case 'explore':
        return (
          <Explore
            currentUser={currentUser}
            setCurrentUser={setCurrentUser}
            setActiveTab={setActiveTab}
            setSearchQuery={setSearchQuery}
            posts={posts}
            setPosts={setPosts}
            onMessageUser={handleMessageUserById}
          />
        );
      case 'messages':
        return (
          <Messages
            currentUser={currentUser}
            messages={messages}
            setMessages={setMessages}
            selectedChatUser={selectedChatUser}
            setSelectedChatUser={setSelectedChatUser}
          />
        );
      case 'notifications':
        return (
          <Notifications
            currentUser={currentUser}
            notifications={notifications}
            setNotifications={setNotifications}
            setActiveTab={setActiveTab}
            onMessageUser={handleMessageUserById}
          />
        );
      case 'bookmarks':
        return (
          <Bookmarks
            currentUser={currentUser}
            posts={posts}
            setPosts={setPosts}
            setActiveTab={setActiveTab}
          />
        );
      case 'analytics':
        return <Analytics currentUser={currentUser} />;
      case 'profile':
        return (
          <Profile
            currentUser={currentUser}
            setCurrentUser={setCurrentUser}
            posts={posts}
            setPosts={setPosts}
            setActiveTab={setActiveTab}
            onMessageUser={handleMessageUserById}
          />
        );
      case 'settings':
        return (
          <Settings
            currentUser={currentUser}
            setCurrentUser={setCurrentUser}
            onProfileUpdated={(user) => setCurrentUser(user)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
      {/* Top Brand Navbar */}
      <Navbar
        currentUser={currentUser}
        notifications={notifications}
        messages={messages}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        theme={theme}
        setTheme={setTheme}
        onLogout={handleLogout}
      />

      {/* Main Structural Layout Grid */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          {/* 1. Left Navigation Sidebar Panel (desktop only) */}
          <div className="hidden lg:block h-[fit-content] sticky top-22">
            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
              <Sidebar
                currentUser={currentUser}
                notifications={notifications}
                messages={messages}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                onLogout={handleLogout}
              />
            </div>
          </div>

          {/* 2. Central Active View Pane */}
          <div className="lg:col-span-2 space-y-6">
            {renderTabContent()}
          </div>

          {/* 3. Right Sidebar Widgets Panel (desktop only) */}
          <div className="hidden lg:block space-y-6 h-[fit-content] sticky top-22">
            {/* Quick Suggestions widget */}
            {rightRecommendations.length > 0 && (
              <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Who to Follow</h3>
                <div className="space-y-3.5">
                  {rightRecommendations.map((recUser) => {
                    const isBot = recUser.id === 'gemini-bot';
                    return (
                      <div key={recUser.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2.5 overflow-hidden">
                          <div className="relative shrink-0">
                            <img
                              src={recUser.avatar}
                              alt={recUser.username}
                              className="h-8.5 w-8.5 rounded-full object-cover"
                            />
                            {isBot && (
                              <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[7px] text-white font-bold border border-white">
                                AI
                              </span>
                            )}
                          </div>
                          <div className="overflow-hidden">
                            <div className="flex items-center space-x-1">
                              <span className="text-xs font-bold text-gray-900 dark:text-white truncate">
                                {recUser.username}
                              </span>
                              {recUser.verified && (
                                <span className="bg-blue-500 text-white rounded-full h-3 w-3 flex items-center justify-center text-[7px] font-bold shrink-0">✓</span>
                              )}
                            </div>
                            <span className="text-[10px] text-gray-400 truncate block">
                              {isBot ? 'Official AI Assistant' : recUser.bio || 'Wandering explorer'}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleFollowRightWidget(recUser.id)}
                          className="text-[10px] font-bold text-blue-600 hover:underline dark:text-blue-400 shrink-0"
                        >
                          Follow
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Platform announcements / Gemini suggestions */}
            <div className="rounded-2xl border border-gray-100 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 p-4 dark:border-gray-800 dark:from-indigo-950/20 dark:to-purple-950/20">
              <div className="flex items-start space-x-2.5">
                <Sparkles className="h-5 w-5 text-indigo-500 mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-indigo-950 dark:text-indigo-200">Connectify AI Agent is Live</h4>
                  <p className="mt-1 text-[11px] leading-relaxed text-indigo-700/80 dark:text-indigo-300/80">
                    Draft perfect posts with AI or mention <span className="font-bold">@GeminiBot</span> in any post or DM to chat in real-time.
                  </p>
                  <button 
                    onClick={() => setActiveTab('messages')}
                    className="mt-2 text-[11px] font-bold text-indigo-600 hover:underline dark:text-indigo-400"
                  >
                    Start chat with AI Bot →
                  </button>
                </div>
              </div>
            </div>

            {/* Premium Credit line */}
            <div className="text-center text-[10px] text-gray-400">
              <p>© 2026 Connectify Inc.</p>
              <p className="mt-0.5">Crafted with Vite, React & Google Gemini</p>
            </div>
          </div>
        </div>
      </main>

      {/* Stories Viewer Overlay Modal */}
      {activeStoryIndex !== null && (
        <StoriesModal
          stories={stories}
          initialIndex={activeStoryIndex}
          currentUser={currentUser}
          setStories={setStories}
          onClose={() => setActiveStoryIndex(null)}
        />
      )}
    </div>
  );
}
