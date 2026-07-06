import React, { useEffect, useState } from 'react';
import { User, Post } from '../types';
import { Bookmark, AlertCircle, BookmarkCheck, Star } from 'lucide-react';

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
        <div className="rounded-2xl border border-dashed border-gray-200 p-12 text-center dark:border-gray-800">
          <BookmarkCheck className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-700 mb-2" />
          <h3 className="text-sm font-semibold text-gray-950 dark:text-white">Collection is empty</h3>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
            Click the save bookmark button under any post in the Home feed to save them to your private folder!
          </p>
          <button
            onClick={() => setActiveTab('feed')}
            className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition"
          >
            Explore Feed
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
                      src={post.userAvatar}
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
                      src={post.images?.[0] || post.image}
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
