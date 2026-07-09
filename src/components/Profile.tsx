import React, { useState, useEffect, useRef } from 'react';
import { User, Post, Comment } from '../types';
import { 
  Grid as GridIcon, 
  Settings as SettingsIcon, 
  MapPin, 
  Link as LinkIcon, 
  ShieldCheck, 
  Heart, 
  MessageCircle, 
  Trash2, 
  X, 
  Calendar, 
  Camera, 
  Users, 
  UserCheck, 
  Globe, 
  Send,
  Sparkles,
  Play,
  FileText,
  ChevronLeft,
  ChevronRight,
  Clock
} from 'lucide-react';
import Settings from './Settings';

interface ProfileProps {
  currentUser: User;
  setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
  posts: Post[];
  setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
  setActiveTab: (tab: string) => void;
  onMessageUser?: (userId: string) => void;
}

interface CompactUser {
  id: string;
  username: string;
  avatar: string;
  verified: boolean;
  bio?: string;
}

function ProfilePostMedia({ post }: { post: Post }) {
  const [index, setIndex] = useState(0);

  const media = post.media && post.media.length > 0
    ? post.media
    : [
        ...(post.video ? [{ url: post.video, type: 'video' as const }] : []),
        ...(post.images ? post.images.map(img => ({ url: img, type: 'image' as const })) : []),
        ...(post.image && (!post.images || !post.images.includes(post.image)) ? [{ url: post.image, type: 'image' as const }] : [])
      ];

  if (media.length === 0) {
    return (
      <div className="h-full w-full p-8 flex items-center justify-center bg-zinc-900/60 text-center text-zinc-400">
        <div className="space-y-2 max-w-xs">
          <FileText className="h-10 w-10 text-zinc-500 mx-auto" />
          <p className="text-xs italic">Text-based update publish</p>
        </div>
      </div>
    );
  }

  if (media.length === 1) {
    const item = media[0];
    if (item.type === 'video') {
      return (
        <video 
          src={item.url} 
          controls 
          className="h-full w-full object-contain max-h-[40vh] md:max-h-full"
        />
      );
    }
    return (
      <img 
        src={item.url} 
        alt="Post content preview" 
        className="h-full w-full object-contain max-h-[40vh] md:max-h-full"
      />
    );
  }

  const activeItem = media[index] || media[0];

  return (
    <div className="relative h-full w-full flex items-center justify-center bg-zinc-950">
      {activeItem.type === 'video' ? (
        <video 
          src={activeItem.url} 
          controls 
          className="h-full w-full object-contain max-h-[40vh] md:max-h-full"
        />
      ) : (
        <img 
          src={activeItem.url} 
          alt={`Post Content preview ${index + 1}`} 
          className="h-full w-full object-contain max-h-[40vh] md:max-h-full"
        />
      )}

      <button
        onClick={() => setIndex(prev => (prev === 0 ? media.length - 1 : prev - 1))}
        className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/75 transition cursor-pointer z-10"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button
        onClick={() => setIndex(prev => (prev === media.length - 1 ? 0 : prev + 1))}
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/75 transition cursor-pointer z-10"
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      <div className="absolute top-3 right-3 rounded-md bg-black/60 px-2 py-0.5 text-[10px] text-white">
        {index + 1} / {media.length}
      </div>
    </div>
  );
}

export default function Profile({
  currentUser,
  setCurrentUser,
  posts,
  setPosts,
  setActiveTab,
  onMessageUser
}: ProfileProps) {
  const [activeSubTab, setActiveSubTab] = useState<'posts' | 'edit'>('posts');
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [commentText, setCommentText] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  
  const [profileViewTab, setProfileViewTab] = useState<'published' | 'scheduled'>('published');
  const [scheduledPosts, setScheduledPosts] = useState<Post[]>([]);

  const fetchScheduledPosts = async () => {
    try {
      const res = await fetch(`/api/posts?userId=${currentUser.id}&scheduledOnly=true`);
      if (res.ok) {
        const data = await res.json();
        setScheduledPosts(data);
      }
    } catch (err) {
      console.error('Error fetching scheduled posts:', err);
    }
  };

  useEffect(() => {
    fetchScheduledPosts();
  }, [posts, currentUser.id]);

  // Follower / Following Lists Modal States
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [allUsers, setAllUsers] = useState<CompactUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Fetch all users to display profiles of followers & following
  useEffect(() => {
    const fetchAllUsers = async () => {
      setLoadingUsers(true);
      try {
        const res = await fetch('/api/users');
        if (res.ok) {
          const data = await res.json();
          setAllUsers(data);
        }
      } catch (err) {
        console.error('Error fetching users:', err);
      } finally {
        setLoadingUsers(false);
      }
    };
    fetchAllUsers();
  }, [currentUser]);

  // Sync user's own posts from global posts
  useEffect(() => {
    const userPosts = posts.filter(p => p.userId === currentUser.id);
    // Sort by latest
    const sorted = [...userPosts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setMyPosts(sorted);
  }, [posts, currentUser.id]);

  // Like / Unlike own post in Modal
  const handleLikePost = async (postId: string) => {
    try {
      const res = await fetch(`/api/posts/${postId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id }),
      });
      if (res.ok) {
        const updatedPost = await res.json();
        // Update both local and parent posts state
        setPosts(prev => prev.map(p => p.id === postId ? updatedPost : p));
        if (selectedPost && selectedPost.id === postId) {
          setSelectedPost(updatedPost);
        }
      }
    } catch (err) {
      console.error('Error liking post:', err);
    }
  };

  // Submit comment in detailed post modal
  const handleAddComment = async (e: React.FormEvent, postId: string) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setCommentLoading(true);
    try {
      const res = await fetch(`/api/posts/${postId}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          username: currentUser.username,
          userAvatar: currentUser.avatar,
          content: commentText
        }),
      });

      if (res.ok) {
        const updatedPost = await res.json();
        setPosts(prev => prev.map(p => p.id === postId ? updatedPost : p));
        if (selectedPost && selectedPost.id === postId) {
          setSelectedPost(updatedPost);
        }
        setCommentText('');
      }
    } catch (err) {
      console.error('Error adding comment:', err);
    } finally {
      setCommentLoading(false);
    }
  };

  // Delete post
  const handleDeletePost = async (postId: string) => {
    if (!window.confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return;
    }

    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id })
      });

      if (res.ok) {
        setPosts(prev => prev.filter(p => p.id !== postId));
        setSelectedPost(null);
      } else {
        alert('Failed to delete post.');
      }
    } catch (err) {
      console.error('Error deleting post:', err);
    }
  };

  // Find users in following list
  const followingUsersList = allUsers.filter(u => currentUser.following.includes(u.id));
  const followersUsersList = allUsers.filter(u => currentUser.followers.includes(u.id));

  // Toggle follow/unfollow from lists
  const handleFollowToggle = async (targetId: string) => {
    try {
      const res = await fetch(`/api/users/${targetId}/follow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id }),
      });

      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
      }
    } catch (err) {
      console.error('Error toggling follow:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upper Profile Hero Header Panel */}
      <div className="relative rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
        {/* Banner cover Image */}
        <div className="relative h-44 sm:h-56 bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-950/40 dark:to-indigo-950/40">
          {currentUser.cover ? (
            <img 
              src={currentUser.cover} 
              alt="Cover header" 
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-blue-300 dark:text-blue-900 font-mono text-xs select-none">
              Default Banner Cover
            </div>
          )}
          
          <button 
            onClick={() => setActiveSubTab('edit')}
            className="absolute top-4 right-4 flex items-center space-x-1 rounded-full bg-black/60 hover:bg-black/85 text-white px-3.5 py-1.5 text-xs font-semibold backdrop-blur-xs transition shadow-md"
          >
            <Camera className="h-3.5 w-3.5" />
            <span>Customize Banner</span>
          </button>
        </div>

        {/* Profile Info Row with avatar overflow */}
        <div className="px-6 pb-6 pt-3 relative flex flex-col md:flex-row md:items-end justify-between gap-4">
          
          {/* Avatar and Info group */}
          <div className="flex flex-col sm:flex-row sm:items-end space-y-4 sm:space-y-0 sm:space-x-5 -mt-14 sm:-mt-16 z-10">
            {/* Circle bordered Avatar */}
            <div className="relative h-28 w-28 sm:h-32 sm:w-32 rounded-full border-4 border-white bg-gray-50 dark:border-gray-900 shadow-lg overflow-hidden shrink-0">
              <img 
                src={currentUser.avatar} 
                alt={currentUser.username} 
                className="h-full w-full object-cover"
              />
            </div>

            {/* Profile Info Texts */}
            <div className="space-y-1.5 pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
                  @{currentUser.username}
                </h1>
                {currentUser.verified && (
                  <span 
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-[10px] text-white font-bold shadow-xs border border-white dark:border-gray-900"
                    title="Verified Professional badge"
                  >
                    ✓
                  </span>
                )}
                <span className="rounded-full bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold px-2.5 py-0.5 border border-indigo-100/50 dark:border-indigo-950/50">
                  Connectify Member
                </span>
              </div>

              {/* Bio block */}
              {currentUser.bio ? (
                <p className="text-xs text-gray-700 dark:text-gray-300 max-w-lg leading-relaxed font-sans whitespace-pre-wrap">
                  {currentUser.bio}
                </p>
              ) : (
                <p className="text-xs italic text-gray-400 dark:text-zinc-500 font-sans">
                  No bio written yet. Fill it out in the Edit tab!
                </p>
              )}

              {/* Links and Metadata */}
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-2 text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                {currentUser.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-rose-500" />
                    <span>{currentUser.location}</span>
                  </span>
                )}
                {currentUser.website && (
                  <a 
                    href={currentUser.website.startsWith('http') ? currentUser.website : `https://${currentUser.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline transition"
                  >
                    <LinkIcon className="h-3.5 w-3.5" />
                    <span>{currentUser.website.replace(/(^\w+:|^)\/\//, '')}</span>
                  </a>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                  <span>Joined {new Date(currentUser.createdAt || Date.now()).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Action Row - Edit & Stats panel */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            {/* Followers / Following clickable Stats blocks */}
            <div className="flex items-center justify-around sm:justify-start gap-4 rounded-xl border border-gray-100 bg-gray-50/50 p-2.5 dark:border-gray-800 dark:bg-zinc-950/30 px-4">
              <div className="text-center sm:text-left">
                <span className="block text-sm font-black text-gray-900 dark:text-white">{myPosts.length}</span>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Posts</span>
              </div>
              <button 
                onClick={() => setShowFollowersModal(true)}
                className="text-center sm:text-left hover:opacity-80 transition"
              >
                <span className="block text-sm font-black text-gray-900 dark:text-white">{currentUser.followers.length}</span>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider hover:underline">Followers</span>
              </button>
              <button 
                onClick={() => setShowFollowingModal(true)}
                className="text-center sm:text-left hover:opacity-80 transition"
              >
                <span className="block text-sm font-black text-gray-900 dark:text-white">{currentUser.following.length}</span>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider hover:underline">Following</span>
              </button>
            </div>

            <button
              onClick={() => setActiveSubTab(activeSubTab === 'posts' ? 'edit' : 'posts')}
              className={`flex items-center justify-center space-x-1.5 rounded-xl px-4 py-2.5 text-xs font-bold transition shadow-xs border cursor-pointer ${
                activeSubTab === 'edit'
                  ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-zinc-950 dark:border-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-200 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-800 dark:hover:bg-zinc-800'
              }`}
            >
              <SettingsIcon className="h-4 w-4 animate-spin-slow" />
              <span>{activeSubTab === 'edit' ? 'View My Feed' : 'Edit Profile Center'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Profile Content Panel */}
      {activeSubTab === 'posts' ? (
        <div className="space-y-4">
          {/* Sub Tab Navigation */}
          <div className="flex space-x-2 border-b border-gray-100 dark:border-gray-800 pb-1.5">
            <button
              onClick={() => setProfileViewTab('published')}
              className={`flex items-center space-x-1.5 pb-2 border-b-2 px-4 text-xs font-bold transition cursor-pointer ${
                profileViewTab === 'published'
                  ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                  : 'border-transparent text-gray-400 hover:text-gray-700 dark:text-zinc-500 dark:hover:text-zinc-300'
              }`}
            >
              <GridIcon className="h-4 w-4" />
              <span>Published ({myPosts.length})</span>
            </button>
            <button
              onClick={() => setProfileViewTab('scheduled')}
              className={`flex items-center space-x-1.5 pb-2 border-b-2 px-4 text-xs font-bold transition cursor-pointer ${
                profileViewTab === 'scheduled'
                  ? 'border-amber-500 text-amber-600 dark:border-amber-400 dark:text-amber-400'
                  : 'border-transparent text-gray-400 hover:text-gray-700 dark:text-zinc-500 dark:hover:text-zinc-300'
              }`}
            >
              <Clock className="h-4 w-4" />
              <span>Scheduled Queue ({scheduledPosts.length})</span>
            </button>
          </div>

          {profileViewTab === 'published' ? (
            myPosts.length === 0 ? (
              <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center dark:border-gray-800 dark:bg-gray-900 shadow-xs">
                <GridIcon className="mx-auto h-12 w-12 text-zinc-300 dark:text-zinc-700 mb-3" />
                <h4 className="text-sm font-bold text-gray-800 dark:text-zinc-200">You haven't posted anything yet</h4>
                <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1 max-w-xs mx-auto">
                  Share what is on your mind, upload photos or videos, and interact with the coder community!
                </p>
                <button
                  onClick={() => setActiveTab('feed')}
                  className="mt-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 transition shadow-md cursor-pointer"
                >
                  Compose My First Post
                </button>
              </div>
            ) : (
              /* Posts Grid (3 Columns Connectify Grid format) */
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
                {myPosts.map((post) => {
                  const hasMedia = post.image || post.video || (post.images && post.images.length > 0) || (post.media && post.media.length > 0);
                  const displayImage = post.media?.find(m => m.type === 'image')?.url || post.images?.[0] || post.image;
                  return (
                    <div
                      key={post.id}
                      onClick={() => setSelectedPost(post)}
                      className="group relative aspect-square rounded-2xl bg-zinc-100 dark:bg-zinc-850 overflow-hidden cursor-pointer border border-zinc-200/40 dark:border-zinc-800/40 shadow-xs hover:shadow-md transition duration-300"
                    >
                      {/* Visual Preview */}
                      {displayImage && (
                        <img 
                          src={displayImage} 
                          alt="Post media" 
                          className="h-full w-full object-cover group-hover:scale-105 transition duration-500"
                        />
                      )}

                      {post.video && (
                        <div className="relative h-full w-full">
                          <video 
                            src={post.video} 
                            className="h-full w-full object-cover group-hover:scale-105 transition duration-500"
                            muted
                            playsInline
                          />
                          <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
                            <Play className="h-8 w-8 text-white opacity-85 fill-white" />
                          </div>
                        </div>
                      )}

                      {!hasMedia && (
                        <div className="h-full w-full p-4 flex flex-col justify-between bg-white dark:bg-gray-900 group-hover:bg-zinc-50 dark:group-hover:bg-zinc-850 transition duration-300">
                          <p className="text-xs text-gray-700 dark:text-gray-300 font-sans line-clamp-4 leading-relaxed font-medium">
                            {post.content}
                          </p>
                          <div className="flex items-center space-x-1.5 text-[9px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider">
                            <FileText className="h-3 w-3 text-indigo-500" />
                            <span>Text Post</span>
                          </div>
                        </div>
                      )}

                      {/* Quick overlay indicator on media */}
                      {hasMedia && (
                        <div className="absolute top-2.5 right-2.5 bg-black/50 backdrop-blur-md p-1.5 rounded-full text-white transition group-hover:opacity-0">
                          {post.video ? <Play className="h-3 w-3 fill-white" /> : <GridIcon className="h-3 w-3" />}
                        </div>
                      )}

                      {/* Hover Engagement Glass Overlay */}
                      <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center space-x-5 text-white backdrop-blur-xs">
                        <div className="flex items-center space-x-1">
                          <Heart className="h-4.5 w-4.5 fill-white text-white scale-90 group-hover:scale-100 transition duration-300" />
                          <span className="text-xs font-bold">{post.likes.length}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <MessageCircle className="h-4.5 w-4.5 fill-white text-white scale-90 group-hover:scale-100 transition duration-300" />
                          <span className="text-xs font-bold">{post.comments.length}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            /* Render scheduled posts queue list */
            <div className="space-y-4">
              {scheduledPosts.length === 0 ? (
                <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center dark:border-gray-800 dark:bg-gray-900 shadow-xs">
                  <Clock className="mx-auto h-12 w-12 text-zinc-300 dark:text-zinc-700 mb-3 animate-pulse" />
                  <h4 className="text-sm font-bold text-gray-800 dark:text-zinc-200">Your scheduled queue is empty</h4>
                  <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1 max-w-xs mx-auto">
                    Compose a post and use the scheduling clock to schedule it for future publication.
                  </p>
                  <button
                    onClick={() => setActiveTab('feed')}
                    className="mt-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-4 py-2.5 transition shadow-md cursor-pointer animate-bounce"
                  >
                    Schedule a Post Now
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {scheduledPosts.map((post) => {
                    const scheduledDate = new Date(post.scheduledAt || post.createdAt);
                    const timeLeftMs = scheduledDate.getTime() - Date.now();
                    let timeLeftStr = '';
                    if (timeLeftMs > 0) {
                      const mins = Math.floor(timeLeftMs / 60000);
                      const hrs = Math.floor(mins / 60);
                      const days = Math.floor(hrs / 24);
                      if (days > 0) timeLeftStr = `in ${days} day${days > 1 ? 's' : ''}`;
                      else if (hrs > 0) timeLeftStr = `in ${hrs} hour${hrs > 1 ? 's' : ''}`;
                      else timeLeftStr = `in ${mins} minute${mins > 1 ? 's' : ''}`;
                    } else {
                      timeLeftStr = 'due now';
                    }

                    return (
                      <div key={post.id} className="rounded-2xl border border-gray-100 bg-white p-4.5 dark:border-gray-800 dark:bg-gray-900 shadow-xs flex flex-col md:flex-row justify-between gap-4 animate-fade-in hover:border-gray-200 dark:hover:border-gray-700 transition">
                        <div className="space-y-3 flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="flex h-5 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950/30 text-[10px] font-bold text-amber-600 dark:text-amber-400 border border-amber-100/50 px-2">
                              🕒 Scheduled {timeLeftStr}
                            </span>
                            <span className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">
                              {scheduledDate.toLocaleString()}
                            </span>
                          </div>
                          
                          <p className="text-xs text-gray-800 dark:text-gray-200 leading-relaxed font-sans whitespace-pre-wrap break-words">
                            {post.content || <span className="italic text-gray-400">Media only post</span>}
                          </p>

                          {/* Mini Gallery/Media Preview */}
                          {(post.media || post.images || post.image || post.video) && (
                            <div className="flex gap-2 overflow-x-auto py-1">
                              {post.media?.map((m, idx) => (
                                <div key={idx} className="h-14 w-14 rounded-lg bg-gray-50 dark:bg-gray-800 overflow-hidden shrink-0 border border-gray-100 dark:border-gray-800">
                                  {m.type === 'video' ? (
                                    <div className="h-full w-full bg-black flex items-center justify-center">
                                      <Play className="h-4 w-4 text-white fill-white" />
                                    </div>
                                  ) : (
                                    <img src={m.url} className="h-full w-full object-cover" />
                                  )}
                                </div>
                              ))}
                              {!post.media && post.images?.map((img, idx) => (
                                <div key={idx} className="h-14 w-14 rounded-lg bg-gray-50 dark:bg-gray-800 overflow-hidden shrink-0 border border-gray-100 dark:border-gray-800">
                                  <img src={img} className="h-full w-full object-cover" />
                                </div>
                              ))}
                              {!post.media && !post.images && post.image && (
                                <div className="h-14 w-14 rounded-lg bg-gray-50 dark:bg-gray-800 overflow-hidden shrink-0 border border-gray-100 dark:border-gray-800">
                                  <img src={post.image} className="h-full w-full object-cover" />
                                </div>
                              )}
                              {!post.media && !post.images && post.video && (
                                <div className="h-14 w-14 rounded-lg bg-gray-50 dark:bg-gray-800 overflow-hidden shrink-0 border border-gray-100 dark:border-gray-800">
                                  <div className="h-full w-full bg-black flex items-center justify-center">
                                    <Play className="h-4 w-4 text-white fill-white" />
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex items-start justify-end gap-2 shrink-0">
                          <button
                            onClick={() => handleDeletePost(post.id)}
                            className="flex items-center space-x-1 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-950/70 text-xs font-bold px-3 py-1.5 transition shrink-0 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Cancel Post</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Edit Profile Center Integrated Tab */
        <div className="bg-transparent rounded-2xl">
          <Settings
            currentUser={currentUser}
            setCurrentUser={setCurrentUser}
            onProfileUpdated={(updated) => {
              setCurrentUser(updated);
              setActiveSubTab('posts');
            }}
          />
        </div>
      )}

      {/* DETAILED POST OVERLAY DIALOG */}
      {selectedPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          {/* Backdrop closer */}
          <div className="absolute inset-0 cursor-default" onClick={() => setSelectedPost(null)} />

          <div className="relative w-full max-w-5xl bg-white dark:bg-[#121214] rounded-3xl overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800/80 z-10 flex flex-col md:grid md:grid-cols-2 h-[85vh] md:h-[580px] max-h-[90vh] transition-all duration-300">
            {/* Close button */}
            <button
              onClick={() => setSelectedPost(null)}
              className="absolute top-4 right-4 md:hidden bg-black/60 backdrop-blur-md text-white p-2 rounded-full hover:bg-black/80 z-20 transition"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Left Col: Media Visual Showcase */}
            <div className="relative bg-zinc-950 flex items-center justify-center h-48 md:h-full shrink-0 border-r border-zinc-100 dark:border-zinc-800/60">
              <ProfilePostMedia post={selectedPost} />
            </div>

            {/* Right Col: Interactive Detail Feed */}
            <div className="flex flex-col h-full overflow-hidden bg-white dark:bg-[#121214]">
              {/* Header Profile details */}
              <div className="p-4 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between shrink-0">
                <div className="flex items-center space-x-3">
                  <img 
                    src={currentUser.avatar} 
                    alt={currentUser.username} 
                    className="h-9 w-9 rounded-full object-cover border border-zinc-100 dark:border-zinc-800"
                  />
                  <div>
                    <div className="flex items-center space-x-1">
                      <span className="text-xs font-black text-gray-950 dark:text-white">
                        @{currentUser.username}
                      </span>
                      {currentUser.verified && (
                        <span className="bg-blue-500 text-white rounded-full h-3 w-3 flex items-center justify-center text-[7px] font-bold">✓</span>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-400">Author</p>
                  </div>
                </div>

                {/* Self delete option */}
                <button
                  onClick={() => handleDeletePost(selectedPost.id)}
                  className="rounded-xl bg-rose-50 p-2 text-rose-500 hover:bg-rose-100 dark:bg-rose-950/25 dark:text-rose-400 dark:hover:bg-rose-950/50 transition cursor-pointer"
                  title="Delete My Post"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {/* Middle Section: Comments & Post content scroll */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Post Body text */}
                <div className="bg-zinc-50/50 dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-800/40 rounded-2xl p-3.5 space-y-1.5">
                  <p className="text-xs text-gray-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap font-sans">
                    {selectedPost.content}
                  </p>
                  <p className="text-[9px] text-gray-400 dark:text-zinc-500 font-medium">
                    Posted on {new Date(selectedPost.createdAt).toLocaleString()}
                  </p>
                </div>

                {/* Comments Header */}
                <div className="flex items-center space-x-1.5 text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">
                  <MessageCircle className="h-3.5 w-3.5 text-indigo-500" />
                  <span>Comments ({selectedPost.comments.length})</span>
                </div>

                {/* List of comments */}
                <div className="space-y-3">
                  {selectedPost.comments.length === 0 ? (
                    <p className="text-xs text-gray-400 italic text-center py-6">No comments on this post yet.</p>
                  ) : (
                    selectedPost.comments.map((comment: Comment) => (
                      <div key={comment.id} className="flex items-start space-x-3 text-xs">
                        <img 
                          src={comment.userAvatar} 
                          alt={comment.username} 
                          className="h-7 w-7 rounded-full object-cover border border-zinc-100 dark:border-zinc-800 mt-0.5 shrink-0"
                        />
                        <div className="flex-1 bg-zinc-50 dark:bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-800/40">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-gray-900 dark:text-zinc-200">@{comment.username}</span>
                            <span className="text-[9px] text-gray-400">
                              {new Date(comment.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="mt-1 text-gray-700 dark:text-zinc-300 leading-relaxed font-sans">{comment.content}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Bottom Actions Row & New Comment Input form */}
              <div className="p-4 border-t border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/30 dark:bg-zinc-950/10 shrink-0">
                {/* engagement summary */}
                <div className="flex items-center justify-between mb-3.5">
                  <div className="flex items-center space-x-3.5">
                    <button 
                      onClick={() => handleLikePost(selectedPost.id)}
                      className="group flex items-center space-x-1 text-gray-500 hover:text-rose-500 transition"
                    >
                      <Heart 
                        className={`h-4.5 w-4.5 transition duration-300 scale-95 group-hover:scale-110 ${
                          selectedPost.likes.includes(currentUser.id) 
                            ? 'fill-rose-500 text-rose-500' 
                            : 'text-gray-400 hover:text-rose-500'
                        }`} 
                      />
                      <span className="text-xs font-bold text-gray-700 dark:text-zinc-300">
                        {selectedPost.likes.length} Likes
                      </span>
                    </button>
                    <div className="flex items-center space-x-1 text-gray-500">
                      <MessageCircle className="h-4.5 w-4.5 text-zinc-400" />
                      <span className="text-xs font-bold text-gray-700 dark:text-zinc-300">
                        {selectedPost.comments.length} Comments
                      </span>
                    </div>
                  </div>
                </div>

                {/* Comment composer */}
                <form onSubmit={(e) => handleAddComment(e, selectedPost.id)} className="flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder="Write a comment..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    disabled={commentLoading}
                    className="flex-1 rounded-xl border border-zinc-200 bg-white py-2 px-3.5 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                  />
                  <button
                    type="submit"
                    disabled={commentLoading || !commentText.trim()}
                    className="rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 p-2 text-white transition shrink-0 cursor-pointer"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </div>
            </div>

            {/* Desktop Close trigger */}
            <button
              onClick={() => setSelectedPost(null)}
              className="absolute -top-12 right-0 hidden md:flex text-zinc-400 hover:text-white transition items-center space-x-1 text-xs"
            >
              <X className="h-4.5 w-4.5" />
              <span className="font-bold uppercase tracking-wider">Close</span>
            </button>
          </div>
        </div>
      )}

      {/* FOLLOWERS LISTS DIALOG */}
      {showFollowersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-fade-in">
          <div className="absolute inset-0 cursor-default" onClick={() => setShowFollowersModal(false)} />
          <div className="relative w-full max-w-sm bg-white dark:bg-[#121214] rounded-2xl p-5 border border-zinc-100 dark:border-zinc-800 shadow-xl z-10 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-2.5">
              <h3 className="text-xs font-extrabold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Users className="h-4 w-4 text-indigo-500" />
                <span>Followers ({currentUser.followers.length})</span>
              </h3>
              <button onClick={() => setShowFollowersModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-64 overflow-y-auto space-y-3">
              {followersUsersList.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">No followers yet. Publish rich content to gain visibility!</p>
              ) : (
                followersUsersList.map((user) => {
                  const isFollowingBack = currentUser.following.includes(user.id);
                  return (
                    <div key={user.id} className="flex items-center justify-between p-1 rounded-lg">
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <img src={user.avatar} alt={user.username} className="h-8.5 w-8.5 rounded-full object-cover border border-zinc-100 dark:border-zinc-800" />
                        <div className="min-w-0">
                          <div className="flex items-center space-x-1">
                            <span className="text-xs font-bold text-gray-900 dark:text-white truncate">@{user.username}</span>
                            {user.verified && <span className="bg-blue-500 text-white rounded-full h-2.5 w-2.5 flex items-center justify-center text-[6px]">✓</span>}
                          </div>
                          <p className="text-[9px] text-gray-400 truncate max-w-[150px]">{user.bio || 'Wandering explorer'}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1.5 shrink-0">
                        {onMessageUser && (
                          <button
                            onClick={() => {
                              setShowFollowersModal(false);
                              onMessageUser(user.id);
                            }}
                            className="rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-950/60 p-1.5 text-indigo-600 dark:text-indigo-400 transition"
                            title="Direct Message"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleFollowToggle(user.id)}
                          className={`rounded-lg px-2.5 py-1 text-[9px] font-bold transition shrink-0 ${
                            isFollowingBack
                              ? 'border border-zinc-200 text-gray-500 dark:border-zinc-800 dark:text-zinc-400'
                              : 'bg-indigo-600 text-white hover:bg-indigo-700'
                          }`}
                        >
                          {isFollowingBack ? 'Mutual' : 'Follow Back'}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* FOLLOWING LISTS DIALOG */}
      {showFollowingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-fade-in">
          <div className="absolute inset-0 cursor-default" onClick={() => setShowFollowingModal(false)} />
          <div className="relative w-full max-w-sm bg-white dark:bg-[#121214] rounded-2xl p-5 border border-zinc-100 dark:border-zinc-800 shadow-xl z-10 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-2.5">
              <h3 className="text-xs font-extrabold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <UserCheck className="h-4 w-4 text-emerald-500" />
                <span>Following ({currentUser.following.length})</span>
              </h3>
              <button onClick={() => setShowFollowingModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-64 overflow-y-auto space-y-3">
              {followingUsersList.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">You aren't following anyone yet. Head to Explore to discover accounts!</p>
              ) : (
                followingUsersList.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-1 rounded-lg">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <img src={user.avatar} alt={user.username} className="h-8.5 w-8.5 rounded-full object-cover border border-zinc-100 dark:border-zinc-800" />
                      <div className="min-w-0">
                        <div className="flex items-center space-x-1">
                          <span className="text-xs font-bold text-gray-900 dark:text-white truncate">@{user.username}</span>
                          {user.verified && <span className="bg-blue-500 text-white rounded-full h-2.5 w-2.5 flex items-center justify-center text-[6px]">✓</span>}
                        </div>
                        <p className="text-[9px] text-gray-400 truncate max-w-[150px]">{user.bio || 'Wandering explorer'}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5 shrink-0">
                      {onMessageUser && (
                        <button
                          onClick={() => {
                            setShowFollowingModal(false);
                            onMessageUser(user.id);
                          }}
                          className="rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-950/60 p-1.5 text-indigo-600 dark:text-indigo-400 transition"
                          title="Direct Message"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleFollowToggle(user.id)}
                        className="rounded-lg border border-rose-100 hover:bg-rose-50 text-rose-500 hover:text-rose-600 dark:border-rose-950/20 dark:hover:bg-rose-950/30 px-2.5 py-1 text-[9px] font-bold transition shrink-0"
                      >
                        Unfollow
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
