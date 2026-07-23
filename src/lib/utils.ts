// Shared utility functions to eliminate duplication

// Format relative time (used in Feed, Notifications, Stories, Profile)
export function formatRelativeTime(isoString: string): string {
  const elapsed = Date.now() - new Date(isoString).getTime();
  const mins = Math.round(elapsed / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(isoString).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// Extract hashtags from post content
export function extractHashtags(content: string): string[] {
  if (!content) return [];
  const matches = content.match(/#(\w+)/g);
  if (!matches) return [];
  return [...new Set(matches.map(m => m.substring(1)))];
}

// Extract mentions from post content
export function extractMentions(content: string): string[] {
  if (!content) return [];
  const matches = content.match(/@(\w+)/g);
  if (!matches) return [];
  return [...new Set(matches.map(m => m.substring(1)))];
}

// Sanitize string for display (prevent XSS in rendered content)
export function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Debounce function for search inputs
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// Truncate text with ellipsis
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

// Generate consistent color from string (for avatars, etc.)
export function stringToColor(str: string): string {
  const colors = [
    'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500',
    'bg-amber-500', 'bg-cyan-500', 'bg-rose-500', 'bg-indigo-500'
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}