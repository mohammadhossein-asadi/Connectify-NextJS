import React from 'react';

interface VerifiedBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-3 w-3 text-[6px]',
  md: 'h-4 w-4 text-[8px]',
  lg: 'h-5 w-5 text-[10px]',
};

export default function VerifiedBadge({ size = 'md', className = '' }: VerifiedBadgeProps) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-blue-500 text-white font-bold shrink-0 ${sizeClasses[size]} ${className}`}
      title="Verified"
    >
      ✓
    </span>
  );
}

// AI Bot badge component
interface AIBadgeProps {
  className?: string;
}

export function AIBadge({ className = '' }: AIBadgeProps) {
  return (
    <span className={`inline-flex items-center space-x-0.5 rounded-full bg-indigo-50 px-1.5 py-0.5 text-[8px] font-bold text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 ${className}`}>
      <span>AI</span>
    </span>
  );
}