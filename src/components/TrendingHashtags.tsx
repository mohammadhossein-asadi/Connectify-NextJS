import React, { useEffect, useState } from 'react';
import { Hash, TrendingUp, RefreshCw } from 'lucide-react';

interface HashtagTrend {
  tag: string;
  count: number;
}

interface TrendingHashtagsProps {
  onHashtagClick: (tag: string) => void;
  // Optional dependency to trigger re-fetch when posts change
  refreshTrigger?: number;
}

export default function TrendingHashtags({ onHashtagClick, refreshTrigger = 0 }: TrendingHashtagsProps) {
  const [trends, setTrends] = useState<HashtagTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrends = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/hashtags/trending');
      if (!res.ok) throw new Error('Failed to fetch trending hashtags');
      const data = await res.json();
      setTrends(data);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error loading trending hashtags');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrends();
  }, [refreshTrigger]);

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 transition-all duration-200 hover:shadow-md">
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center space-x-2">
          <TrendingUp className="h-4 w-4 text-rose-500 dark:text-rose-400" />
          <h3 className="text-xs font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
            Trending hashtags
          </h3>
        </div>
        <button
          onClick={fetchTrends}
          className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200 transition-colors"
          title="Refresh trends"
          disabled={loading}
        >
          <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading && trends.length === 0 ? (
        <div className="space-y-2.5 animate-pulse">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-7 w-full bg-gray-50 dark:bg-gray-800/60 rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <div className="text-[11px] text-rose-500 dark:text-rose-400 py-2">
          {error}
        </div>
      ) : trends.length === 0 ? (
        <div className="text-center text-xs text-gray-400 dark:text-gray-500 py-3 leading-relaxed">
          No tags found yet.<br />Use tags like <span className="font-medium text-gray-600 dark:text-gray-400">#explore</span> in your posts!
        </div>
      ) : (
        <div className="space-y-1.5">
          {trends.map((item) => (
            <button
              key={item.tag}
              onClick={() => onHashtagClick(item.tag)}
              className="w-full flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs text-left transition bg-gray-50/50 hover:bg-gray-100 dark:bg-gray-800/30 dark:hover:bg-gray-800/60 text-gray-700 dark:text-gray-300 group hover:translate-x-0.5 transform duration-150"
            >
              <div className="flex items-center space-x-1.5 min-w-0">
                <Hash className="h-3.5 w-3.5 text-gray-400 group-hover:text-rose-500 dark:group-hover:text-rose-400 shrink-0 transition-colors" />
                <span className="font-medium truncate group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                  {item.tag}
                </span>
              </div>
              <span className="text-[10px] bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500 px-1.5 py-0.5 rounded-md border border-gray-100 dark:border-gray-800 font-bold shrink-0">
                {item.count}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
