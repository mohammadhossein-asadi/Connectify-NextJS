import React, { useEffect, useState } from 'react';
import { User } from '../types';
import { BarChart3, TrendingUp, Users, Heart, MessageSquare, Share2, Award, Sparkles, RefreshCw } from 'lucide-react';

interface AnalyticsProps {
  currentUser: User;
}

interface AnalyticsData {
  postsCount: number;
  followersCount: number;
  followingCount: number;
  engagementScore: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  chartData: Array<{
    name: string;
    likes: number;
    comments: number;
  }>;
}

export default function Analytics({ currentUser }: AnalyticsProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics?userId=${currentUser.id}`);
      if (res.ok) {
        const stats = await res.json();
        setData(stats);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [currentUser.id]);

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-44 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 w-full animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
        <div className="h-64 w-full animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
      </div>
    );
  }

  // Find max value in chart to scale the bar heights dynamically
  const maxVal = Math.max(...data.chartData.map((d) => d.likes + d.comments), 1);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center space-x-2">
            <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <span>Profile Performance Analytics</span>
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">Real-time engagement breakdown and traffic overview.</p>
        </div>

        <button
          onClick={fetchAnalytics}
          className="rounded-xl border border-gray-100 bg-white p-2 text-gray-400 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800 transition"
          title="Refresh stats"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Stats Cards Bento Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Engagement Score */}
        <div className="rounded-2xl border border-gray-100 bg-gradient-to-tr from-blue-600 to-indigo-600 p-4 text-white shadow-md shadow-blue-500/10">
          <div className="flex items-center justify-between">
            <Award className="h-5 w-5 text-blue-100" />
            <span className="rounded bg-white/20 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-white">Score</span>
          </div>
          <p className="mt-3.5 text-3xl font-bold tracking-tight">{data.engagementScore}</p>
          <span className="text-[10px] text-blue-100 flex items-center mt-1">
            <TrendingUp className="h-3 w-3 mr-1" />
            <span>Engage Coefficient</span>
          </span>
        </div>

        {/* Total Likes */}
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between text-gray-400">
            <Heart className="h-5 w-5 text-rose-500" />
            <span className="text-[9px] font-semibold uppercase tracking-wider">Likes</span>
          </div>
          <p className="mt-3.5 text-3xl font-bold text-gray-950 dark:text-white tracking-tight">{data.totalLikes}</p>
          <span className="text-[10px] text-gray-400 mt-1 block">Total hearts received</span>
        </div>

        {/* Total Comments */}
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between text-gray-400">
            <MessageSquare className="h-5 w-5 text-blue-500" />
            <span className="text-[9px] font-semibold uppercase tracking-wider font-mono">Comments</span>
          </div>
          <p className="mt-3.5 text-3xl font-bold text-gray-950 dark:text-white tracking-tight">{data.totalComments}</p>
          <span className="text-[10px] text-gray-400 mt-1 block">Active user replies</span>
        </div>

        {/* Total Shares */}
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between text-gray-400">
            <Share2 className="h-5 w-5 text-emerald-500" />
            <span className="text-[9px] font-semibold uppercase tracking-wider">Shares</span>
          </div>
          <p className="mt-3.5 text-3xl font-bold text-gray-950 dark:text-white tracking-tight">{data.totalShares}</p>
          <span className="text-[10px] text-gray-400 mt-1 block">Link copies made</span>
        </div>
      </div>

      {/* Chart Panel */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-6">Weekly Activity Performance</h3>
        
        {/* Interactive Custom Bar chart */}
        <div className="flex h-56 items-end justify-between px-2 pb-2">
          {data.chartData.map((day) => {
            const likesHeight = (day.likes / maxVal) * 100;
            const commentsHeight = (day.comments / maxVal) * 100;

            return (
              <div key={day.name} className="flex flex-col items-center flex-1 group">
                {/* Hover stats tooltips */}
                <div className="opacity-0 group-hover:opacity-100 transition duration-200 pointer-events-none absolute -translate-y-24 bg-gray-950 text-white rounded-lg p-2 text-[10px] z-10 shadow-lg text-center font-sans space-y-0.5">
                  <p className="font-bold">{day.name}</p>
                  <p className="text-rose-400">♥ {day.likes} Likes</p>
                  <p className="text-blue-400">💬 {day.comments} Comments</p>
                </div>

                {/* Bars column */}
                <div className="w-8 flex items-end space-x-1 h-36">
                  {/* Likes bar */}
                  <div
                    className="w-1/2 rounded-t-md bg-rose-500 hover:bg-rose-600 transition-all duration-500"
                    style={{ height: `${Math.max(likesHeight, 5)}%` }}
                  />
                  {/* Comments bar */}
                  <div
                    className="w-1/2 rounded-t-md bg-blue-500 hover:bg-blue-600 transition-all duration-500"
                    style={{ height: `${Math.max(commentsHeight, 5)}%` }}
                  />
                </div>

                {/* X Axis Label */}
                <span className="mt-3 text-xs font-semibold text-gray-500 dark:text-gray-400 group-hover:text-blue-500 transition">{day.name}</span>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-6 flex items-center justify-center space-x-6 border-t border-gray-50 pt-4 dark:border-gray-800 text-[11px] text-gray-400">
          <div className="flex items-center space-x-1.5">
            <span className="h-3 w-3 rounded-md bg-rose-500" />
            <span>Likes Received</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="h-3 w-3 rounded-md bg-blue-500" />
            <span>Comments Received</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <Sparkles className="h-3.5 w-3.5 text-indigo-500 animate-pulse" />
            <span>Auto updated every minute</span>
          </div>
        </div>
      </div>
    </div>
  );
}
