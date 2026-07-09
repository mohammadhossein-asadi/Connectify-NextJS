import React, { useState, useEffect, useMemo } from 'react';
import { User, Post, Comment, HashtagTrend } from '../types';
import { 
  Search, 
  Compass, 
  TrendingUp, 
  UserPlus, 
  UserCheck, 
  RefreshCw, 
  Sparkles, 
  Heart, 
  MessageCircle, 
  Bookmark, 
  Play, 
  X, 
  Send, 
  Check, 
  Flame, 
  Grid, 
  Image as ImageIcon,
  Tv,
  Hash,
  FileText
} from 'lucide-react';

interface ExploreProps {
  currentUser: User;
  setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
  setActiveTab: (tab: string) => void;
  setSearchQuery: (query: string) => void;
  posts: Post[];
  setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
  onMessageUser?: (userId: string) => void;
}

type CategoryType = 'for-you' | 'trending' | 'photography' | 'travel' | 'tech' | 'art' | 'ai';

export default function Explore({
  currentUser,
  setCurrentUser,
  setActiveTab,
  setSearchQuery,
  posts,
  setPosts,
  onMessageUser,
}: ExploreProps) {
  const [trends, setTrends] = useState<HashtagTrend[]>([]);
  const [recommendations, setRecommendations] = useState<User[]>([]);
  const [loadingTrends, setLoadingTrends] = useState(false);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [followLoading, setFollowLoading] = useState<string | null>(null);
  
  // Explore states
  const [activeCategory, setActiveCategory] = useState<CategoryType>('trending');
  const [localSearch, setLocalSearch] = useState('');
  const [searchTab, setSearchTab] = useState<'posts' | 'people' | 'hashtags'>('posts');
  const [allUsers, setAllUsers] = useState<User[]>([]);

  // Fetch all users on mount for real-time people search
  useEffect(() => {
    const fetchAllUsers = async () => {
      try {
        const res = await fetch('/api/users');
        if (res.ok) {
          const data = await res.json();
          setAllUsers(data);
        }
      } catch (err) {
        console.error('Error fetching all users for explore search:', err);
      }
    };
    fetchAllUsers();
  }, []);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [commentInput, setCommentInput] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);

  // Fetch Trends
  const fetchTrends = async () => {
    setLoadingTrends(true);
    try {
      const res = await fetch('/api/hashtags/trending');
      if (res.ok) {
        const data = await res.json();
        setTrends(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTrends(false);
    }
  };

  // Fetch profile recommendations
  const fetchRecommendations = async () => {
    setLoadingRecs(true);
    try {
      const res = await fetch(`/api/users/recommendations?userId=${currentUser.id}`);
      if (res.ok) {
        const data = await res.json();
        setRecommendations(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRecs(false);
    }
  };

  useEffect(() => {
    fetchTrends();
    fetchRecommendations();
  }, [currentUser.id]);

  // Sync selected post details when posts state updates in parent
  const activeSelectedPost = useMemo(() => {
    if (!selectedPost) return null;
    return posts.find(p => p.id === selectedPost.id) || selectedPost;
  }, [posts, selectedPost]);

  // Handle following from Explore suggestions
  const handleFollowUser = async (targetUserId: string) => {
    setFollowLoading(targetUserId);
    try {
      const res = await fetch(`/api/users/${targetUserId}/follow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id }),
      });

      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
        fetchRecommendations();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFollowLoading(null);
    }
  };

  // Click on hashtag trend
  const handleTrendingTagClick = (tag: string) => {
    setSearchQuery(`#${tag}`);
    setActiveTab('feed');
  };

  // Like action from detail modal
  const handleLikePost = async (postId: string) => {
    try {
      const res = await fetch(`/api/posts/${postId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id }),
      });
      if (res.ok) {
        const updatedPost = await res.json();
        setPosts(prev => prev.map(p => p.id === postId ? updatedPost : p));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Add Comment from detailed modal
  const handleAddComment = async (postId: string) => {
    if (!commentInput.trim() || commentLoading) return;
    setCommentLoading(true);
    try {
      const res = await fetch(`/api/posts/${postId}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: currentUser.id, 
          content: commentInput 
        }),
      });
      if (res.ok) {
        const updatedPost = await res.json();
        setPosts(prev => prev.map(p => p.id === postId ? updatedPost : p));
        setCommentInput('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCommentLoading(false);
    }
  };

  // Bookmark toggle action from modal
  const handleBookmarkPost = async (postId: string) => {
    try {
      const res = await fetch(`/api/posts/${postId}/bookmark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id }),
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(prev => prev ? { ...prev, bookmarks: data.bookmarks } : null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Helper to calculate Connectify Explore Engagement Score
  // Algorithm: Likes * 1 + Comments * 2 + Shares * 3 + verified bonus (5) - freshness penalty
  const calculateScore = (post: Post) => {
    const likeWeight = post.likes.length * 1.5;
    const commentWeight = post.comments.length * 2.5;
    const shareWeight = (post.shares || 0) * 3;
    const verifiedBonus = post.userVerified ? 5 : 0;
    
    // Time penalty
    const postDate = new Date(post.createdAt).getTime();
    const hoursAgo = (Date.now() - postDate) / (1000 * 60 * 60);
    const timeDecay = Math.max(0.1, 10 / (hoursAgo + 1));

    return (likeWeight + commentWeight + shareWeight + verifiedBonus) * timeDecay;
  };

  // Filter and rank posts dynamically using our Scoring Algorithm
  const filteredExplorePosts = useMemo(() => {
    let list = [...posts];

    // 1. Apply Search query filter if present
    if (localSearch.trim()) {
      const query = localSearch.toLowerCase();
      list = list.filter(p => 
        p.content.toLowerCase().includes(query) ||
        p.username.toLowerCase().includes(query) ||
        p.hashtags.some(h => h.toLowerCase().includes(query))
      );
    }

    // 2. Filter list based on selected category tags
    switch (activeCategory) {
      case 'trending':
        // Sort explicitly by engagement score
        list.sort((a, b) => calculateScore(b) - calculateScore(a));
        break;
      case 'for-you':
        // Show recommended: prioritize posts from people the user doesn't follow yet, then sort by score
        list = list.filter(p => p.userId !== currentUser.id);
        list.sort((a, b) => {
          const aFollow = currentUser.following.includes(a.userId) ? 0 : 1;
          const bFollow = currentUser.following.includes(b.userId) ? 0 : 1;
          if (aFollow !== bFollow) return bFollow - aFollow;
          return calculateScore(b) - calculateScore(a);
        });
        break;
      case 'photography':
        list = list.filter(p => 
          p.image || 
          p.hashtags.some(h => ['photography', 'kyoto', 'artisan', 'garden', 'photo', 'shot', 'vibe'].includes(h.toLowerCase())) ||
          /photo|shot|camera|lens|capture/i.test(p.content)
        );
        break;
      case 'travel':
        list = list.filter(p => 
          p.hashtags.some(h => ['travel', 'kyoto', 'traveldiary', 'trip', 'adventure', 'japan', 'nature'].includes(h.toLowerCase())) ||
          /travel|visit|japan|trip|explore|landed|flight/i.test(p.content)
        );
        break;
      case 'tech':
        list = list.filter(p => 
          p.hashtags.some(h => ['coding', 'webdev', 'tailwindcss', 'react', 'javascript', 'html', 'node', 'developer'].includes(h.toLowerCase())) ||
          /coding|dev|code|react|tailwind|software|build|program|template/i.test(p.content)
        );
        break;
      case 'art':
        list = list.filter(p => 
          p.hashtags.some(h => ['art', 'design', 'inspiration', 'uidesign', 'sketch', 'illustration'].includes(h.toLowerCase())) ||
          /art|design|designer|aesthetic|curate|mockup|sketch|creative/i.test(p.content)
        );
        break;
      case 'ai':
        list = list.filter(p => 
          p.userId === 'gemini-bot' || 
          /gemini|bot|ai|intelligence|robot|chatgpt|model|assistant/i.test(p.content)
        );
        break;
    }

    return list;
  }, [posts, activeCategory, localSearch, currentUser.id, currentUser.following]);

  // Dynamically extract and tally all hashtags from existing posts for real-time tag search
  const allHashtags = useMemo(() => {
    const counts: { [key: string]: number } = {};
    posts.forEach(p => {
      if (p.hashtags) {
        p.hashtags.forEach(h => {
          const formatted = h.startsWith('#') ? h : `#${h}`;
          counts[formatted] = (counts[formatted] || 0) + 1;
        });
      }
    });
    return Object.entries(counts).map(([hashtag, count]) => ({ hashtag, count }));
  }, [posts]);

  // Real-time matched posts
  const filteredSearchPosts = useMemo(() => {
    if (!localSearch.trim()) return [];
    const query = localSearch.toLowerCase();
    return posts.filter(p => 
      p.content.toLowerCase().includes(query) ||
      p.username.toLowerCase().includes(query) ||
      p.hashtags.some(h => h.toLowerCase().includes(query))
    );
  }, [posts, localSearch]);

  // Real-time matched users
  const filteredSearchPeople = useMemo(() => {
    if (!localSearch.trim()) return [];
    const query = localSearch.toLowerCase();
    return allUsers.filter(u => 
      u.username.toLowerCase().includes(query) ||
      (u.bio || '').toLowerCase().includes(query)
    );
  }, [allUsers, localSearch]);

  // Real-time matched hashtags
  const filteredSearchHashtags = useMemo(() => {
    if (!localSearch.trim()) return [];
    const query = localSearch.toLowerCase().replace('#', '');
    return allHashtags.filter(h => 
      h.hashtag.toLowerCase().includes(query)
    );
  }, [allHashtags, localSearch]);

  // Aesthetic backgrounds for text-only posts in the Explore grid
  const textGradients = [
    'from-indigo-500 via-purple-500 to-pink-500',
    'from-pink-500 via-rose-500 to-amber-500',
    'from-teal-400 via-emerald-500 to-indigo-600',
    'from-blue-600 to-indigo-700',
    'from-fuchsia-600 to-purple-800',
    'from-cyan-500 to-blue-500'
  ];

  return (
    <div className="space-y-6">
      {/* Search Header and Introduction */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-gray-900 dark:text-white flex items-center space-x-2">
            <Compass className="h-6 w-6 text-indigo-600 dark:text-indigo-400 animate-spin-slow" />
            <span>Explore Discovery</span>
          </h2>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
            Discover trending topics, highly rated community feeds, and popular profiles curated by our algorithm.
          </p>
        </div>

        {/* Dynamic Search Box */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-zinc-500" />
          <input
            type="text"
            placeholder="Search tags, users, or topics..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="w-full text-xs font-medium rounded-full py-2.5 pl-10 pr-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-gray-900 dark:text-zinc-100 shadow-sm transition focus:ring-2 focus:ring-indigo-500/20"
          />
          {localSearch && (
            <button 
              onClick={() => setLocalSearch('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 bg-gray-100 dark:bg-zinc-800 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Category Selection Carousel or Search Tabs */}
      {localSearch.trim() ? (
        <div className="flex border-b border-zinc-150 dark:border-zinc-800 pb-1.5 space-x-1 sm:space-x-2">
          {[
            { id: 'posts', label: 'Posts', icon: FileText, count: filteredSearchPosts.length },
            { id: 'people', label: 'People', icon: UserCheck, count: filteredSearchPeople.length },
            { id: 'hashtags', label: 'Hashtags', icon: Hash, count: filteredSearchHashtags.length }
          ].map((tab) => {
            const isActive = searchTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setSearchTab(tab.id as 'posts' | 'people' | 'hashtags')}
                className={`flex-1 flex items-center justify-center space-x-1.5 pb-3 text-center text-xs font-bold border-b-2 transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-zinc-400'
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span>{tab.label}</span>
                <span className="px-1.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-[10px] text-gray-500 dark:text-zinc-400 font-mono">
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        /* Category Selection Carousel (Connectify pills) */
        <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none -mx-2 px-2">
          {[
            { id: 'trending', label: 'Trending', icon: Flame, color: 'text-amber-500 bg-amber-500/10' },
            { id: 'for-you', label: 'For You', icon: Sparkles, color: 'text-indigo-500 bg-indigo-500/10' },
            { id: 'photography', label: 'Photography', icon: ImageIcon, color: 'text-emerald-500 bg-emerald-500/10' },
            { id: 'travel', label: 'Travel', icon: Compass, color: 'text-sky-500 bg-sky-500/10' },
            { id: 'tech', label: 'Coding & Tech', icon: Tv, color: 'text-blue-500 bg-blue-500/10' },
            { id: 'art', label: 'Art & Design', icon: Grid, color: 'text-rose-500 bg-rose-500/10' },
            { id: 'ai', label: 'Gemini AI', icon: Sparkles, color: 'text-fuchsia-500 bg-fuchsia-500/10' },
          ].map((cat) => {
            const isActive = activeCategory === cat.id;
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id as CategoryType)}
                className={`flex items-center space-x-1.5 shrink-0 rounded-full px-4 py-2 text-xs font-semibold tracking-wide transition duration-150 border cursor-pointer ${
                  isActive
                    ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-zinc-950 dark:border-white shadow'
                    : 'bg-white dark:bg-zinc-900 text-gray-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800/80 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-current' : cat.color.split(' ')[0]}`} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Main Discover Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Columns - Connectify Asymmetric Media Grid or Search Results */}
        <div className="lg:col-span-2 space-y-4">
          {localSearch.trim() ? (
            <div className="space-y-4">
              {searchTab === 'posts' && (
                filteredSearchPosts.length === 0 ? (
                  <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-12 text-center shadow-sm">
                    <Compass className="mx-auto h-12 w-12 text-zinc-400 dark:text-zinc-600 mb-3 animate-pulse" />
                    <h4 className="text-sm font-bold text-gray-800 dark:text-zinc-200">No matching posts found</h4>
                    <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1 max-w-sm mx-auto">
                      Try searching for other words, tags, or topics.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 md:gap-4 auto-rows-[190px]">
                    {filteredSearchPosts.map((post, index) => {
                      const isSpotlight = index % 9 === 1 || index === 0;
                      const hasMedia = post.image || post.video;
                      const gradientIdx = index % textGradients.length;
                      
                      return (
                        <div
                          key={post.id}
                          onClick={() => setSelectedPost(post)}
                          className={`group relative rounded-2xl overflow-hidden cursor-pointer shadow-sm border border-zinc-200/50 dark:border-zinc-800/50 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 ${
                            isSpotlight 
                              ? 'col-span-2 row-span-2 h-full' 
                              : 'col-span-1 h-full'
                          }`}
                        >
                          {/* Media File or Gradient Placeholder */}
                          {post.image ? (
                            <img
                              src={post.image}
                              alt={post.username}
                              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                              referrerPolicy="no-referrer"
                            />
                          ) : post.video ? (
                            <div className="relative h-full w-full bg-zinc-950">
                              <video
                                src={post.video}
                                className="h-full w-full object-cover"
                                muted
                                loop
                                playsInline
                              />
                              <div className="absolute top-2.5 right-2.5 bg-black/60 backdrop-blur-md p-1.5 rounded-full text-white">
                                <Play className="h-3 w-3 fill-white" />
                              </div>
                            </div>
                          ) : (
                            // Text-only Aesthetic Gradient Card
                            <div className={`h-full w-full bg-gradient-to-br ${textGradients[gradientIdx]} p-4 flex flex-col justify-between text-white transition duration-500 group-hover:brightness-95`}>
                              <div className="flex items-center space-x-1.5 opacity-90">
                                <img
                                  src={post.userAvatar}
                                  alt={post.username}
                                  className="h-5 w-5 rounded-full object-cover border border-white/20"
                                />
                                <span className="text-[10px] font-bold truncate">@{post.username}</span>
                              </div>
                              <p className={`line-clamp-4 font-display font-semibold leading-relaxed tracking-wide text-left ${
                                isSpotlight ? 'text-sm' : 'text-[10px]'
                              }`}>
                                {post.content}
                              </p>
                              <div className="text-[9px] opacity-75 font-mono">
                                {post.hashtags.length > 0 ? `#${post.hashtags[0]}` : '#Connectify'}
                              </div>
                            </div>
                          )}

                          {/* Quick Media Indicators */}
                          {hasMedia && (
                            <div className="absolute top-2.5 right-2.5 bg-black/50 backdrop-blur-md p-1.5 rounded-full text-white transition opacity-100 group-hover:opacity-0">
                              {post.video ? <Play className="h-3.5 w-3.5 fill-white" /> : <ImageIcon className="h-3.5 w-3.5" />}
                            </div>
                          )}

                          {/* Connectify Glassmorphic Hover Overlay */}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center space-x-6 text-white backdrop-blur-xs">
                            <div className="flex items-center space-x-1.5">
                              <Heart className="h-5 w-5 fill-white text-white scale-90 group-hover:scale-100 transition duration-300" />
                              <span className="text-xs font-bold">{post.likes.length}</span>
                            </div>
                            <div className="flex items-center space-x-1.5">
                              <MessageCircle className="h-5 w-5 fill-white text-white scale-90 group-hover:scale-100 transition duration-300" />
                              <span className="text-xs font-bold">{post.comments.length}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              )}

              {searchTab === 'people' && (
                <div className="space-y-3.5">
                  {filteredSearchPeople.length === 0 ? (
                    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-12 text-center shadow-sm">
                      <Compass className="mx-auto h-12 w-12 text-zinc-400 dark:text-zinc-600 mb-3 animate-pulse" />
                      <h4 className="text-sm font-bold text-gray-800 dark:text-zinc-200">No matching profiles found</h4>
                      <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1 max-w-sm mx-auto">
                        We couldn't find any users matching your query.
                      </p>
                    </div>
                  ) : (
                    filteredSearchPeople.map((u) => {
                      const isFollowing = currentUser.following.includes(u.id);
                      const isMe = u.id === currentUser.id;
                      return (
                        <div key={u.id} className="flex items-center justify-between p-4.5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-150 dark:border-zinc-800 shadow-xs animate-fade-in hover:border-zinc-250 dark:hover:border-zinc-700 transition">
                          <div className="flex items-center space-x-3.5 overflow-hidden">
                            <img src={u.avatar} alt={u.username} className="h-11 w-11 rounded-full object-cover shrink-0 border border-zinc-100 dark:border-zinc-800 shadow-xs" />
                            <div className="overflow-hidden">
                              <div className="flex items-center space-x-1.5">
                                <span className="text-xs font-bold text-gray-950 dark:text-white truncate">@{u.username}</span>
                                {u.verified && <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-blue-500 text-[8px] font-bold text-white shrink-0">✓</span>}
                              </div>
                              {u.bio && <p className="text-[10px] text-gray-500 dark:text-zinc-400 truncate max-w-xs sm:max-w-md mt-0.5">{u.bio}</p>}
                            </div>
                          </div>
                          {!isMe && (
                            <button
                              disabled={followLoading === u.id}
                              onClick={() => handleFollowUser(u.id)}
                              className={`rounded-full px-4.5 py-2 text-xs font-bold transition flex items-center space-x-1 shrink-0 cursor-pointer ${
                                isFollowing
                                  ? 'bg-zinc-100 text-gray-700 hover:bg-zinc-200 dark:bg-zinc-800/80 dark:text-zinc-300 dark:hover:bg-zinc-800'
                                  : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs'
                              }`}
                            >
                              {isFollowing ? (
                                <>
                                  <UserCheck className="h-3 w-3" />
                                  <span>Following</span>
                                </>
                              ) : (
                                <>
                                  <UserPlus className="h-3 w-3" />
                                  <span>Follow</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {searchTab === 'hashtags' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {filteredSearchHashtags.length === 0 ? (
                    <div className="col-span-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-12 text-center shadow-sm">
                      <Compass className="mx-auto h-12 w-12 text-zinc-400 dark:text-zinc-600 mb-3 animate-pulse" />
                      <h4 className="text-sm font-bold text-gray-800 dark:text-zinc-200">No matching hashtags found</h4>
                      <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1 max-w-sm mx-auto">
                        No active hashtags match your search query.
                      </p>
                    </div>
                  ) : (
                    filteredSearchHashtags.map((h) => (
                      <button
                        key={h.hashtag}
                        onClick={() => {
                          setLocalSearch(h.hashtag);
                          setSearchTab('posts');
                        }}
                        className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-150 dark:border-zinc-800 shadow-xs hover:border-pink-300 dark:hover:border-pink-900 transition text-left cursor-pointer animate-fade-in"
                      >
                        <div className="flex items-center space-x-2.5">
                          <div className="p-2.5 rounded-xl bg-pink-50 dark:bg-pink-950/30 text-pink-500">
                            <span className="text-sm font-bold">#</span>
                          </div>
                          <div>
                            <span className="text-xs font-bold text-gray-900 dark:text-white">{h.hashtag}</span>
                            <p className="text-[10px] text-gray-400 dark:text-zinc-500">Popular discover topic</p>
                          </div>
                        </div>
                        <span className="text-xs font-bold bg-pink-100/50 text-pink-600 dark:bg-pink-950/50 dark:text-pink-400 px-2.5 py-1 rounded-full font-mono">
                          {h.count} {h.count === 1 ? 'post' : 'posts'}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          ) : (
            filteredExplorePosts.length === 0 ? (
              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-12 text-center shadow-sm">
                <Compass className="mx-auto h-12 w-12 text-zinc-400 dark:text-zinc-600 mb-3 animate-pulse" />
                <h4 className="text-sm font-bold text-gray-800 dark:text-zinc-200">No content matches this category</h4>
                <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1 max-w-sm mx-auto">
                  Be the first to create posts with tags or descriptions related to {activeCategory.replace('-', ' ')}!
                </p>
                <button
                  onClick={() => { setActiveCategory('trending'); setLocalSearch(''); }}
                  className="mt-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 shadow transition"
                >
                  Reset Filter
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 md:gap-4 auto-rows-[190px]">
                {filteredExplorePosts.map((post, index) => {
                  const isSpotlight = index % 9 === 1 || index === 0;
                  const hasMedia = post.image || post.video;
                  const gradientIdx = index % textGradients.length;
                  
                  return (
                    <div
                      key={post.id}
                      onClick={() => setSelectedPost(post)}
                      className={`group relative rounded-2xl overflow-hidden cursor-pointer shadow-sm border border-zinc-200/50 dark:border-zinc-800/50 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 ${
                        isSpotlight 
                          ? 'col-span-2 row-span-2 h-full' 
                          : 'col-span-1 h-full'
                      }`}
                    >
                      {/* Media File or Gradient Placeholder */}
                      {post.image ? (
                        <img
                          src={post.image}
                          alt={post.username}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                          referrerPolicy="no-referrer"
                        />
                      ) : post.video ? (
                        <div className="relative h-full w-full bg-zinc-950">
                          <video
                            src={post.video}
                            className="h-full w-full object-cover"
                            muted
                            loop
                            playsInline
                          />
                          <div className="absolute top-2.5 right-2.5 bg-black/60 backdrop-blur-md p-1.5 rounded-full text-white">
                            <Play className="h-3 w-3 fill-white" />
                          </div>
                        </div>
                      ) : (
                        // Text-only Aesthetic Gradient Card
                        <div className={`h-full w-full bg-gradient-to-br ${textGradients[gradientIdx]} p-4 flex flex-col justify-between text-white transition duration-500 group-hover:brightness-95`}>
                          <div className="flex items-center space-x-1.5 opacity-90">
                            <img
                              src={post.userAvatar}
                              alt={post.username}
                              className="h-5 w-5 rounded-full object-cover border border-white/20"
                            />
                            <span className="text-[10px] font-bold truncate">@{post.username}</span>
                          </div>
                          <p className={`line-clamp-4 font-display font-semibold leading-relaxed tracking-wide text-left ${
                            isSpotlight ? 'text-sm' : 'text-[10px]'
                          }`}>
                            {post.content}
                          </p>
                          <div className="text-[9px] opacity-75 font-mono">
                            {post.hashtags.length > 0 ? `#${post.hashtags[0]}` : '#Connectify'}
                          </div>
                        </div>
                      )}

                      {/* Quick Media Indicators */}
                      {hasMedia && (
                        <div className="absolute top-2.5 right-2.5 bg-black/50 backdrop-blur-md p-1.5 rounded-full text-white transition opacity-100 group-hover:opacity-0">
                          {post.video ? <Play className="h-3.5 w-3.5 fill-white" /> : <ImageIcon className="h-3.5 w-3.5" />}
                        </div>
                      )}

                      {/* Connectify Glassmorphic Hover Overlay */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center space-x-6 text-white backdrop-blur-xs">
                        <div className="flex items-center space-x-1.5">
                          <Heart className="h-5 w-5 fill-white text-white scale-90 group-hover:scale-100 transition duration-300" />
                          <span className="text-xs font-bold">{post.likes.length}</span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <MessageCircle className="h-5 w-5 fill-white text-white scale-90 group-hover:scale-100 transition duration-300" />
                          <span className="text-xs font-bold">{post.comments.length}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>

        {/* Right Columns - Trending Hashtags and Suggestions */}
        <div className="space-y-6">
          
          {/* 1. Dynamic Trending Hashtags Widget */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-100 dark:border-zinc-800/80">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center space-x-2">
                <TrendingUp className="h-4.5 w-4.5 text-indigo-500" />
                <span>Trending Hashtags</span>
              </h3>
              <button 
                onClick={fetchTrends} 
                disabled={loadingTrends}
                className="rounded-lg p-1.5 hover:bg-gray-50 text-gray-400 dark:hover:bg-zinc-800 disabled:opacity-40"
                title="Refresh Trends"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loadingTrends ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {loadingTrends ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-11 w-full animate-pulse rounded-xl bg-gray-50 dark:bg-zinc-800" />
                ))}
              </div>
            ) : trends.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6">No trending topics active currently.</p>
            ) : (
              <div className="space-y-2.5">
                {trends.slice(0, 6).map((item) => (
                  <div
                    key={item.tag}
                    onClick={() => handleTrendingTagClick(item.tag)}
                    className="group flex items-center justify-between rounded-xl border border-zinc-100 p-3 cursor-pointer hover:bg-indigo-50/50 dark:border-zinc-800/50 dark:hover:bg-zinc-800/40 transition"
                  >
                    <div>
                      <span className="text-xs font-bold text-gray-800 dark:text-zinc-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                        #{item.tag}
                      </span>
                      <p className="text-[10px] text-gray-400 dark:text-zinc-500 mt-0.5">Highly engaging content topic</p>
                    </div>
                    <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[10px] font-bold text-gray-500 dark:bg-zinc-800 dark:text-zinc-400 group-hover:bg-indigo-100 group-hover:text-indigo-700 dark:group-hover:bg-indigo-950/40 dark:group-hover:text-indigo-400 transition">
                      {item.count} posts
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. Personalized User Recommendations Widget */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-100 dark:border-zinc-800/80">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center space-x-2">
                <Sparkles className="h-4.5 w-4.5 text-violet-500" />
                <span>Recommended For You</span>
              </h3>
              <button 
                onClick={fetchRecommendations} 
                disabled={loadingRecs}
                className="rounded-lg p-1.5 hover:bg-gray-50 text-gray-400 dark:hover:bg-zinc-800 disabled:opacity-40"
                title="Refresh Recommendations"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loadingRecs ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {loadingRecs ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex space-x-3 items-center animate-pulse">
                    <div className="h-9 w-9 rounded-full bg-gray-100 dark:bg-zinc-800" />
                    <div className="flex-1 space-y-1">
                      <div className="h-3 w-1/3 bg-gray-100 dark:bg-zinc-800 rounded" />
                      <div className="h-2 w-2/3 bg-gray-100 dark:bg-zinc-800 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recommendations.length === 0 ? (
              <div className="text-center py-6">
                <Check className="mx-auto h-8 w-8 text-emerald-500 mb-2" />
                <h5 className="text-xs font-bold text-gray-700 dark:text-zinc-300">You are all connected!</h5>
                <p className="text-[10px] text-gray-400 dark:text-zinc-500 mt-1">Following suggestions will show up when new profiles register.</p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {recommendations.slice(0, 5).map((user) => {
                  const isFollowing = currentUser.following.includes(user.id);
                  const isBot = user.id === 'gemini-bot';

                  return (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-1.5 rounded-xl transition hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30"
                    >
                      <div className="flex items-center space-x-3 overflow-hidden">
                        <div className="relative shrink-0">
                          <img
                            src={user.avatar}
                            alt={user.username}
                            className="h-9.5 w-9.5 rounded-full object-cover border border-zinc-100 dark:border-zinc-800"
                          />
                          {isBot && (
                            <span className="absolute -bottom-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-indigo-600 text-[8px] text-white font-bold border border-white dark:border-zinc-900">
                              AI
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center space-x-1">
                            <span className="text-xs font-bold text-gray-900 dark:text-white truncate">
                              {user.username}
                            </span>
                            {user.verified && (
                              <span className="bg-blue-500 text-white rounded-full h-3 w-3 flex items-center justify-center text-[7px] font-bold">✓</span>
                            )}
                          </div>
                          <p className="text-[10px] text-gray-400 dark:text-zinc-500 truncate mt-0.5">
                            {isBot ? 'Helpful AI Agent' : user.bio || 'Wandering explorer'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {onMessageUser && (
                          <button
                            onClick={() => onMessageUser(user.id)}
                            className="flex h-7 w-7 items-center justify-center rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 transition dark:bg-indigo-950/40 dark:hover:bg-indigo-950/60 dark:text-indigo-400"
                            title={`Message @${user.username}`}
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleFollowUser(user.id)}
                          disabled={followLoading === user.id}
                          className={`flex items-center space-x-1 rounded-xl px-3 py-1.5 text-[10px] font-bold transition shrink-0 ${
                            isFollowing
                              ? 'border border-zinc-200 text-gray-500 hover:bg-gray-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800'
                              : 'bg-indigo-600 text-white hover:bg-indigo-700'
                          }`}
                        >
                          {isFollowing ? 'Following' : 'Follow'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CONNECTIFY SPLIT-SCREEN POST DETAIL MODAL */}
      {activeSelectedPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          {/* Backdrop click closer */}
          <div className="absolute inset-0 cursor-default" onClick={() => setSelectedPost(null)} />
          
          <div className="relative w-full max-w-5xl bg-white dark:bg-[#121214] rounded-3xl overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800/85 z-10 flex flex-col md:grid md:grid-cols-2 h-[90vh] md:h-[600px] max-h-[90vh] transition-all duration-300">
            
            {/* Close Button Mobile/Desktop */}
            <button
              onClick={() => setSelectedPost(null)}
              className="absolute top-4 right-4 md:hidden bg-black/65 backdrop-blur-md text-white p-2 rounded-full hover:bg-black/85 z-20"
            >
              <X className="h-4.5 w-4.5" />
            </button>

            {/* Left Column: Visual Media Pane */}
            <div className="relative bg-zinc-950 flex items-center justify-center h-48 md:h-full shrink-0 border-r border-zinc-100 dark:border-zinc-800/60">
              {activeSelectedPost.image ? (
                <img
                  src={activeSelectedPost.image}
                  alt={activeSelectedPost.username}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : activeSelectedPost.video ? (
                <video
                  src={activeSelectedPost.video}
                  className="w-full h-full object-cover"
                  controls
                  autoPlay
                  loop
                  playsInline
                />
              ) : (
                // Adaptive visual placeholder for text-only posts
                <div className={`w-full h-full bg-gradient-to-br ${textGradients[posts.indexOf(activeSelectedPost) % textGradients.length]} p-8 flex flex-col justify-between text-white`}>
                  <div className="flex items-center space-x-2">
                    <img
                      src={activeSelectedPost.userAvatar}
                      alt={activeSelectedPost.username}
                      className="h-8 w-8 rounded-full object-cover border border-white/20"
                    />
                    <span className="text-sm font-bold">@{activeSelectedPost.username}</span>
                  </div>
                  <p className="text-lg font-display font-semibold leading-relaxed tracking-wide text-left py-4 overflow-y-auto max-h-[70%]">
                    {activeSelectedPost.content}
                  </p>
                  <span className="text-xs opacity-75 font-mono">Connectify Post Showcase</span>
                </div>
              )}
            </div>

            {/* Right Column: Interaction Sidebar */}
            <div className="flex flex-col flex-1 h-full min-h-0 bg-white dark:bg-[#121214]">
              
              {/* Header: User Profile Details */}
              <div className="flex items-center justify-between p-4 border-b border-zinc-100 dark:border-zinc-800/80">
                <div className="flex items-center space-x-3 min-w-0">
                  <img
                    src={activeSelectedPost.userAvatar}
                    alt={activeSelectedPost.username}
                    className="h-9.5 w-9.5 rounded-full object-cover border border-zinc-200 dark:border-zinc-800"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center space-x-1">
                      <span className="text-xs font-bold text-gray-900 dark:text-white truncate">
                        {activeSelectedPost.username}
                      </span>
                      {activeSelectedPost.userVerified && (
                        <span className="bg-blue-500 text-white rounded-full h-3.5 w-3.5 flex items-center justify-center text-[8px] font-bold shrink-0">✓</span>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-400 dark:text-zinc-500 block">
                      Posted {new Date(activeSelectedPost.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Direct Follow Switch */}
                {activeSelectedPost.userId !== currentUser.id && (
                  <button
                    onClick={() => handleFollowUser(activeSelectedPost.userId)}
                    disabled={followLoading === activeSelectedPost.userId}
                    className={`text-xs font-bold px-3 py-1.5 rounded-xl transition ${
                      currentUser.following.includes(activeSelectedPost.userId)
                        ? 'border border-zinc-200 dark:border-zinc-800 text-gray-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                        : 'text-indigo-600 hover:text-indigo-700 dark:text-indigo-400'
                    }`}
                  >
                    {currentUser.following.includes(activeSelectedPost.userId) ? 'Following' : 'Follow'}
                  </button>
                )}

                {/* Close Button Desktop */}
                <button
                  onClick={() => setSelectedPost(null)}
                  className="hidden md:flex items-center justify-center p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Scrollable: Caption and Comments List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-none">
                {/* Caption / Description */}
                <div className="flex items-start space-x-3 pb-3 border-b border-zinc-100 dark:border-zinc-800/50">
                  <img
                    src={activeSelectedPost.userAvatar}
                    alt={activeSelectedPost.username}
                    className="h-8.5 w-8.5 rounded-full object-cover shrink-0"
                  />
                  <div>
                    <p className="text-xs text-gray-900 dark:text-zinc-100 leading-relaxed">
                      <span className="font-bold mr-1.5">{activeSelectedPost.username}</span>
                      {activeSelectedPost.content}
                    </p>
                    {activeSelectedPost.hashtags.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {activeSelectedPost.hashtags.map((tag) => (
                          <span
                            key={tag}
                            onClick={() => {
                              setSearchQuery(`#${tag}`);
                              setActiveTab('feed');
                              setSelectedPost(null);
                            }}
                            className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Comments Stream */}
                <div className="space-y-3.5">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Comments ({activeSelectedPost.comments.length})</h4>
                  {activeSelectedPost.comments.length === 0 ? (
                    <div className="py-6 text-center text-xs text-gray-400 dark:text-zinc-500">
                      No comments yet. Be the first to spark the conversation!
                    </div>
                  ) : (
                    activeSelectedPost.comments.map((comment) => (
                      <div key={comment.id} className="flex items-start space-x-2.5 text-xs">
                        <img
                          src={comment.userAvatar}
                          alt={comment.username}
                          className="h-7 w-7 rounded-full object-cover shrink-0 border border-zinc-100 dark:border-zinc-800"
                        />
                        <div className="bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl p-2.5 flex-1 text-left">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-gray-900 dark:text-white text-[11px]">{comment.username}</span>
                            <span className="text-[9px] text-gray-400">{new Date(comment.createdAt).toLocaleDateString()}</span>
                          </div>
                          <p className="text-gray-700 dark:text-zinc-300 mt-1 leading-relaxed text-[11px]">
                            {comment.content}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Action Area: Buttons and Comment Box */}
              <div className="p-4 border-t border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30">
                
                {/* Icons bar */}
                <div className="flex items-center justify-between mb-3.5">
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => handleLikePost(activeSelectedPost.id)}
                      className="group flex items-center text-gray-500 hover:text-rose-600 dark:text-zinc-400 dark:hover:text-rose-500 cursor-pointer"
                    >
                      <Heart 
                        className={`h-5 w-5 transition duration-200 group-hover:scale-110 ${
                          activeSelectedPost.likes.includes(currentUser.id)
                            ? 'text-rose-500 fill-rose-500'
                            : ''
                        }`}
                      />
                      <span className="ml-1.5 text-xs font-bold text-gray-700 dark:text-zinc-300">
                        {activeSelectedPost.likes.length}
                      </span>
                    </button>

                    <div className="flex items-center text-gray-500 dark:text-zinc-400">
                      <MessageCircle className="h-5 w-5" />
                      <span className="ml-1.5 text-xs font-bold text-gray-700 dark:text-zinc-300">
                        {activeSelectedPost.comments.length}
                      </span>
                    </div>
                  </div>

                  {/* Bookmark Button */}
                  <button
                    onClick={() => handleBookmarkPost(activeSelectedPost.id)}
                    className="text-gray-500 hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-indigo-400 cursor-pointer"
                    title="Bookmark post"
                  >
                    <Bookmark 
                      className={`h-5 w-5 ${
                        currentUser.bookmarks.includes(activeSelectedPost.id)
                          ? 'text-indigo-600 fill-indigo-600 dark:text-indigo-400 dark:fill-indigo-400'
                          : ''
                      }`}
                    />
                  </button>
                </div>

                {/* Comment Input Box */}
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder="Add an engaging comment..."
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddComment(activeSelectedPost.id);
                    }}
                    className="flex-1 text-xs rounded-xl py-2 px-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-gray-900 dark:text-white"
                  />
                  <button
                    onClick={() => handleAddComment(activeSelectedPost.id)}
                    disabled={!commentInput.trim() || commentLoading}
                    className="bg-indigo-600 text-white rounded-xl p-2 hover:bg-indigo-700 disabled:opacity-40 shadow transition cursor-pointer flex items-center justify-center"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
