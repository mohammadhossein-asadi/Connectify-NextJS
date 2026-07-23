import React, { useEffect, useState } from 'react';
import { User, Post } from '../types';
import { Bookmark, AlertCircle, BookmarkCheck, Star, Sparkles } from 'lucide-react';

interface BookmarksProps {
  currentUser: User;
  posts: Post[];
  setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
  setActiveTab: (tab: string) => void;
}

export default function Bookmarks({
  currentUser,
  posts,
  setPosts,
  setActiveTab,
}: BookmarksProps) {
  const [bookmarkedPosts, setBookmarkedPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBookmarks = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/posts?bookmarkedBy=${currentUser.id}`);
        if (res.ok) {
          const data = await res.json();
          setBookmarkedPosts(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchBookmarks();
  }, [currentUser.bookmarks, posts]); // sync when user bookmarks list changes or main post action triggers

  const handleRemoveBookmark = async (e: React.MouseEvent, postId: string) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/posts/${postId}/bookmark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id }),
      });

      if (res.ok) {
        const data = await res.json();
        currentUser.bookmarks = data.bookmarks;
        setBookmarkedPosts((prev) => prev.filter((p) => p.id !== postId));
        // Force sync parent state too
        setPosts((prev) => [...prev]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center space-x-2">
          <Bookmark className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <span>Saved Bookmarks</span>
        </h2>
        <p className="text-xs text-gray-400 mt-0.5">Your private collection of saved content and inspiration.</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-44 w-full animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      ) : bookmarkedPosts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 p-12 text-center dark:border-gray-800 bg-gray-50/30 dark:bg-gray-900/10">
          {/* Decorative Illustration */}
          <div className="relative mx-auto w-36 h-36 flex items-center justify-center mb-6">
            {/* Background Glow & Pulsing Circles */}
            <div className="absolute inset-0 bg-blue-100/40 dark:bg-blue-950/20 rounded-full blur-2xl animate-pulse" />
            <div className="absolute w-28 h-28 rounded-full border border-blue-100/60 dark:border-blue-900/40 animate-spin" style={{ animationDuration: '20s' }} />
            <div className="absolute w-20 h-20 rounded-full border border-dashed border-indigo-100/80 dark:border-indigo-900/30" />
            
            {/* Staggered Floating Cards */}
            <div className="absolute w-14 h-16 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-100 dark:border-gray-750 -rotate-12 translate-x-[-12px] translate-y-[-4px] opacity-60 flex flex-col p-2 space-y-1.5">
              <div className="h-1.5 w-8 bg-gray-200 dark:bg-gray-700 rounded-full" />
              <div className="h-1.5 w-6 bg-gray-150 dark:bg-gray-750 rounded-full" />
              <div className="h-6 w-full bg-gray-50 dark:bg-gray-950/40 rounded-lg" />
            </div>

            <div className="absolute w-14 h-16 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-100 dark:border-gray-750 rotate-12 translate-x-[12px] translate-y-[-4px] opacity-60 flex flex-col p-2 space-y-1.5">
              <div className="h-1.5 w-7 bg-gray-200 dark:bg-gray-700 rounded-full" />
              <div className="h-1.5 w-5 bg-gray-150 dark:bg-gray-750 rounded-full" />
              <div className="h-6 w-full bg-gray-50 dark:bg-gray-950/40 rounded-lg" />
            </div>

            {/* Central Main Card with Bookmark Ribbon */}
            <div className="relative w-16 h-20 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200/50 dark:border-gray-700 flex flex-col justify-between p-2.5 z-10 hover:scale-105 transition-transform duration-300">
              <div className="flex items-start justify-between">
                <div className="space-y-1 w-2/3">
                  <div className="h-2 w-full bg-blue-500/80 rounded-full" />
                  <div className="h-1.5 w-3/4 bg-gray-200 dark:bg-gray-700 rounded-full" />
                </div>
                <Bookmark className="h-4 w-4 text-blue-500 fill-blue-500 shrink-0" />
              </div>
              <div className="h-8 w-full bg-gray-50 dark:bg-gray-900 rounded-lg flex items-center justify-center border border-gray-100/50 dark:border-gray-800">
                <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400 animate-pulse" />
              </div>
            </div>

            {/* Floating Accents */}
            <div className="absolute top-2 right-2 text-indigo-400/80 animate-bounce" style={{ animationDelay: '0.5s' }}>
              <Star className="h-3.5 w-3.5 fill-current" />
            </div>
            <div className="absolute bottom-2 left-2 text-emerald-400/80 animate-bounce" style={{ animationDelay: '1.2s' }}>
              <Sparkles className="h-4 w-4" />
            </div>
          </div>

          <h3 className="text-base font-bold text-gray-950 dark:text-white">Your library is waiting</h3>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto leading-relaxed">
            Click the save bookmark button under any post in the Home feed to save them to your private folder!
          </p>
          <button
            onClick={() => setActiveTab('feed')}
            className="mt-5 inline-flex items-center space-x-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Discover Inspiring Content</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {bookmarkedPosts.map((post) => (
            <div
              key={post.id}
              onClick={() => setActiveTab('feed')}
              className="group flex flex-col justify-between rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 cursor-pointer hover:border-blue-500 transition-all duration-200"
            >
              <div>
                {/* Author Metadata */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2.5">
                    <img
                      loading="lazy" src={post.userAvatar}
                      alt={post.username}
                      className="h-8 w-8 rounded-full object-cover border border-gray-100"
                    />
                    <div>
                      <span className="text-xs font-bold text-gray-950 dark:text-white block">
                        {post.username}
                      </span>
                      <span className="text-[9px] text-gray-400">Saved item</span>
                    </div>
                  </div>

                  <button
                    onClick={(e) => handleRemoveBookmark(e, post.id)}
                    className="rounded-full bg-rose-50 p-1.5 text-rose-500 hover:bg-rose-100 dark:bg-rose-950/20 dark:text-rose-400 transition"
                    title="Remove from saved bookmarks"
                  >
                    <Bookmark className="h-3.5 w-3.5 fill-rose-500 text-rose-500" />
                  </button>
                </div>

                {/* Content excerpt */}
                <p className="line-clamp-3 text-xs text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                  {post.content}
                </p>

                {/* Media Image if exists */}
                {(post.image || (post.images && post.images.length > 0)) && (
                  <div className="mb-3 overflow-hidden rounded-xl bg-gray-50 dark:bg-gray-950">
                    <img
                      loading="lazy" src={post.images?.[0] || post.image}
                      alt="Bookmarks preview"
                      className="h-28 w-full object-cover"
                    />
                  </div>
                )}
              </div>

              {/* Quick stats footer summary */}
              <div className="flex items-center justify-between border-t border-gray-50 pt-2.5 text-[10px] text-gray-400 dark:border-gray-800">
                <span className="flex items-center">
                  <Star className="mr-1 h-3 w-3 text-amber-400 fill-amber-400" />
                  <span>{post.likes.length} likes</span>
                </span>
                <span>{post.comments.length} comments</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
