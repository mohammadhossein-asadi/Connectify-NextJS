import React, { useState, useEffect } from 'react';
import { formatRelativeTime } from '../lib/utils';
import { User, Post, Story, Comment } from '../types';
import StoriesList from './StoriesList';
import PostCreate from './PostCreate';
import { formatRelativeTime } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { formatRelativeTime } from '../lib/utils';
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Bookmark, 
  Trash2, 
  Clock, 
  TrendingUp, 
  Compass, 
  CornerDownRight, 
  Sparkles,
  AlertCircle,
  CheckCircle2,
  BookmarkCheck,
  Copy,
  Send,
  X,
  ChevronRight,
  ChevronLeft,
  Users,
  BarChart3,
  Globe,
  Lock
} from 'lucide-react';

interface FeedProps {
  currentUser: User;
  posts: Post[];
  stories: Story[];
  setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
  onStoryClick: (index: number) => void;
  onStoryCreated: (newStory: Story) => void;
  searchQuery: string;
  setSearchQuery?: (query: string) => void;
  setActiveTab?: (tab: string) => void;
  onMessageUser?: (userId: string) => void;
}

const generatePostStoryImage = (post: Post, authorAvatarUrl: string, postImageUrl?: string) => {
  return new Promise<string>((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      resolve('');
      return;
    }

    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, '#4f46e5');
    grad.addColorStop(1, '#7c3aed');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cardWidth = 900;
    const cardHeight = postImageUrl ? 1100 : 700;
    const cardX = (canvas.width - cardWidth) / 2;
    const cardY = (canvas.height - cardHeight) / 2;
    const radius = 32;

    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    ctx.shadowBlur = 40;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 15;

    ctx.beginPath();
    ctx.moveTo(cardX + radius, cardY);
    ctx.lineTo(cardX + cardWidth - radius, cardY);
    ctx.quadraticCurveTo(cardX + cardWidth, cardY, cardX + cardWidth, cardY + radius);
    ctx.lineTo(cardX + cardWidth, cardY + cardHeight - radius);
    ctx.quadraticCurveTo(cardX + cardWidth, cardY + cardHeight, cardX + cardWidth - radius, cardY + cardHeight);
    ctx.lineTo(cardX + radius, cardY + cardHeight);
    ctx.quadraticCurveTo(cardX, cardY + cardHeight, cardX, cardY + cardHeight - radius);
    ctx.lineTo(cardX, cardY + radius);
    ctx.quadraticCurveTo(cardX, cardY, cardX + radius, cardY);
    ctx.closePath();
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    const loadAndDrawImages = async () => {
      ctx.fillStyle = '#1e293b';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 36px Inter, sans-serif';

      try {
        const avatarImg = new Image();
        avatarImg.crossOrigin = 'anonymous';
        await new Promise((res, rej) => {
          avatarImg.onload = res;
          avatarImg.onerror = rej;
          avatarImg.src = authorAvatarUrl;
        });
        
        ctx.save();
        ctx.beginPath();
        ctx.arc(cardX + 80, cardY + 80, 40, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(avatarImg, cardX + 40, cardY + 40, 80, 80);
        ctx.restore();
      } catch (e) {
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.arc(cardX + 80, cardY + 80, 40, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = '#0f172a';
      ctx.fillText(post.username || 'User', cardX + 140, cardY + 70);

      ctx.fillStyle = '#64748b';
      ctx.font = '500 24px Inter, sans-serif';
      ctx.fillText('Shared a post', cardX + 140, cardY + 105);

      ctx.fillStyle = '#334155';
      ctx.font = '30px Inter, sans-serif';
      ctx.textBaseline = 'top';

      const textX = cardX + 50;
      let textY = cardY + 170;
      const textWidthMax = cardWidth - 100;

      const words = post.content.split(' ');
      const lines = [];
      let currentLine = '';

      for (let n = 0; n < words.length; n++) {
        const testLine = currentLine + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > textWidthMax && n > 0) {
          lines.push(currentLine);
          currentLine = words[n] + ' ';
        } else {
          currentLine = testLine;
        }
      }
      lines.push(currentLine);

      const maxLines = postImageUrl ? 4 : 8;
      const linesToDraw = lines.slice(0, maxLines);
      linesToDraw.forEach((line) => {
        ctx.fillText(line.trim(), textX, textY);
        textY += 45;
      });

      if (lines.length > maxLines) {
        ctx.fillText('...', textX, textY);
        textY += 45;
      }

      if (postImageUrl) {
        try {
          const postImg = new Image();
          postImg.crossOrigin = 'anonymous';
          await new Promise((res, rej) => {
            postImg.onload = res;
            postImg.onerror = rej;
            postImg.src = postImageUrl;
          });

          const imgX = cardX + 50;
          const imgY = cardY + 450;
          const imgW = cardWidth - 100;
          const imgH = 550;

          ctx.save();
          ctx.beginPath();
          const r = 16;
          ctx.moveTo(imgX + r, imgY);
          ctx.lineTo(imgX + imgW - r, imgY);
          ctx.quadraticCurveTo(imgX + imgW, imgY, imgX + imgW, imgY + r);
          ctx.lineTo(imgX + imgW, imgY + imgH - r);
          ctx.quadraticCurveTo(imgX + imgW, imgY + imgH, imgX + imgW - r, imgY + imgH);
          ctx.lineTo(imgX + r, imgY + imgH);
          ctx.quadraticCurveTo(imgX, imgY + imgH, imgX, imgY + imgH - r);
          ctx.lineTo(imgX, imgY + r);
          ctx.quadraticCurveTo(imgX, imgY, imgX + r, imgY);
          ctx.closePath();
          ctx.clip();

          const imgRatio = postImg.width / postImg.height;
          const targetRatio = imgW / imgH;
          let drawW = postImg.width;
          let drawH = postImg.height;
          let srcX = 0;
          let srcY = 0;

          if (imgRatio > targetRatio) {
            drawW = postImg.height * targetRatio;
            srcX = (postImg.width - drawW) / 2;
          } else {
            drawH = postImg.width / targetRatio;
            srcY = (postImg.height - drawH) / 2;
          }

          ctx.drawImage(postImg, srcX, srcY, drawW, drawH, imgX, imgY, imgW, imgH);
          ctx.restore();
        } catch (e) {
          ctx.fillStyle = '#f1f5f9';
          ctx.fillRect(cardX + 50, cardY + 450, cardWidth - 100, 500);
        }
      }

      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = 'bold 30px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Shared via Connectify', canvas.width / 2, canvas.height - 150);

      resolve(canvas.toDataURL('image/jpeg', 0.95));
    };

    loadAndDrawImages();
  });
};

interface PostMediaProps {
  post: Post;
}

function PostMedia({ post }: PostMediaProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const media = post.media && post.media.length > 0 
    ? post.media 
    : [
        ...(post.video ? [{ url: post.video, type: 'video' as const }] : []),
        ...(post.images ? post.images.map(img => ({ url: img, type: 'image' as const })) : []),
        ...(post.image && (!post.images || !post.images.includes(post.image)) ? [{ url: post.image, type: 'image' as const }] : [])
      ];

  if (media.length === 0) return null;

  if (media.length === 1) {
    const item = media[0];
    return (
      <div className="relative border-y border-gray-50 bg-gray-50 dark:border-gray-800 dark:bg-gray-950">
        {item.type === 'video' ? (
          <video
            src={item.url}
            controls
            className="max-h-96 w-full object-cover"
          />
        ) : (
          <img
            loading="lazy" src={item.url}
            alt="Post content"
            className="max-h-96 w-full object-cover"
          />
        )}
      </div>
    );
  }

  const activeItem = media[activeIndex] || media[0];

  return (
    <div className="relative border-y border-gray-100 bg-zinc-950 dark:border-zinc-800">
      {/* Main Image/Video Slider */}
      <div className="relative aspect-video sm:aspect-3/2 max-h-96 w-full overflow-hidden flex items-center justify-center bg-black">
        {activeItem.type === 'video' ? (
          <video
            src={activeItem.url}
            controls
            className="h-full w-full object-contain"
          />
        ) : (
          <img
            loading="lazy" src={activeItem.url}
            alt={`Post media ${activeIndex + 1}`}
            className="h-full w-full object-contain"
          />
        )}

        {/* Carousel controls */}
        <button
          onClick={() => setActiveIndex(prev => (prev === 0 ? media.length - 1 : prev - 1))}
          className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-1.5 text-white backdrop-blur-xs hover:bg-black/60 transition cursor-pointer z-10"
          title="Previous Media"
        >
          <ChevronLeft className="h-4.5 w-4.5" />
        </button>
        <button
          onClick={() => setActiveIndex(prev => (prev === media.length - 1 ? 0 : prev + 1))}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-1.5 text-white backdrop-blur-xs hover:bg-black/60 transition cursor-pointer z-10"
          title="Next Media"
        >
          <ChevronRight className="h-4.5 w-4.5" />
        </button>

        {/* Counter Badge */}
        <div className="absolute top-3 right-3 rounded-md bg-black/55 px-2 py-0.5 text-[10px] font-extrabold text-white tracking-wider uppercase">
          {activeIndex + 1} / {media.length}
        </div>
      </div>

      {/* Thumbnail Indicators */}
      <div className="flex justify-center gap-1.5 py-2 bg-gray-50/50 dark:bg-zinc-950/20 border-t border-gray-100 dark:border-zinc-800/40">
        {media.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setActiveIndex(idx)}
            className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
              idx === activeIndex ? 'w-4 bg-indigo-600' : 'w-1.5 bg-gray-300 dark:bg-zinc-700 hover:bg-gray-400'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

const feedContainerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const feedItemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 15,
    },
  },
};

export default function Feed({
  currentUser,
  posts,
  stories,
  setPosts,
  onStoryClick,
  onStoryCreated,
  searchQuery,
  setSearchQuery,
  setActiveTab,
  onMessageUser,
}: FeedProps) {
  const [filter, setFilter] = useState<'latest' | 'trending' | 'oldest' | 'popular' | 'following'>('latest');
  const [activeCommentsPostId, setActiveCommentsPostId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [copiedPostId, setCopiedPostId] = useState<string | null>(null);
  const [commentLoading, setCommentLoading] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'info'>('success');

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setToastMessage(message);
    setToastType(type);
  };

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const [sharingPost, setSharingPost] = useState<Post | null>(null);
  const [sharingToStory, setSharingToStory] = useState(false);
  const [shareStep, setShareStep] = useState<'options' | 'dm'>('options');
  const [networkUsers, setNetworkUsers] = useState<User[]>([]);
  const [dmSearchQuery, setDmSearchQuery] = useState('');
  const [sendingDmPostId, setSendingDmPostId] = useState<string | null>(null);

  // Helper to highlight mentions and hashtags in post body
  const renderPostContent = (content: string) => {
    if (!content) return null;
    const parts = content.split(/(\s+)/);
    return parts.map((part, index) => {
      if (part.startsWith('#') && part.length > 1) {
        const cleanTag = part.substring(1).replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
        return (
          <span
            key={index}
            onClick={() => {
              if (setSearchQuery) {
                setSearchQuery(`#${cleanTag}`);
              }
            }}
            className="text-indigo-600 dark:text-indigo-400 font-semibold cursor-pointer hover:underline"
          >
            {part}
          </span>
        );
      } else if (part.startsWith('@') && part.length > 1) {
        const cleanMention = part.substring(1).replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
        return (
          <span
            key={index}
            onClick={() => {
              if (setSearchQuery) {
                setSearchQuery(`@${cleanMention}`);
              }
            }}
            className="text-blue-600 dark:text-blue-400 font-bold cursor-pointer hover:underline"
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  // Fetch posts from API when filter or searchQuery changes
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        let url = `/api/posts?filter=${filter}&currentUserId=${currentUser.id}`;
        if (searchQuery) {
          url += `&search=${encodeURIComponent(searchQuery)}`;
        }
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setPosts(data);
        }
      } catch (err) {
        console.error('Error fetching posts:', err);
      }
    };

    fetchPosts();
  }, [filter, searchQuery, setPosts, currentUser.id]);

  const handlePostCreated = (newPost: Post) => {
    // Add new post to start of state
    setPosts((prev) => [newPost, ...prev]);
  };

  const handleLikePost = async (postId: string) => {
    try {
      // Optimistic Update
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id === postId) {
            const isLiked = p.likes.includes(currentUser.id);
            const nextLikes = isLiked
              ? p.likes.filter((id) => id !== currentUser.id)
              : [...p.likes, currentUser.id];
            return { ...p, likes: nextLikes };
          }
          return p;
        })
      );

      const res = await fetch(`/api/posts/${postId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id }),
      });

      if (!res.ok) throw new Error('Failed to like post');
      const updatedPost = await res.json();

      // Sync backend state exactly
      setPosts((prev) => prev.map((p) => (p.id === postId ? updatedPost : p)));
    } catch (err) {
      console.error('Like request failed:', err);
    }
  };

  const handleReactPost = async (postId: string, reactionType: 'like' | 'heart' | 'fire' | 'laugh') => {
    try {
      // Optimistic Update
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id === postId) {
            const currentReactions = p.reactions || { like: [], heart: [], fire: [], laugh: [] };
            const rList = currentReactions[reactionType] || [];
            const hasReacted = rList.includes(currentUser.id);
            const nextList = hasReacted
              ? rList.filter((id) => id !== currentUser.id)
              : [...rList, currentUser.id];
            
            const updatedReactions = {
              ...currentReactions,
              [reactionType]: nextList
            };

            // Sync likes array if reactionType is 'like'
            let nextLikes = p.likes;
            if (reactionType === 'like') {
              nextLikes = nextList;
            }

            return { 
              ...p, 
              reactions: updatedReactions,
              likes: nextLikes
            };
          }
          return p;
        })
      );

      const res = await fetch(`/api/posts/${postId}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, reactionType }),
      });

      if (!res.ok) throw new Error('Failed to react to post');
      const updatedPost = await res.json();

      // Sync backend state exactly
      setPosts((prev) => prev.map((p) => (p.id === postId ? updatedPost : p)));
    } catch (err) {
      console.error('React request failed:', err);
    }
  };

  const handleVotePoll = async (postId: string, optionId: string) => {
    try {
      // Optimistic Update
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id === postId && p.poll) {
            const nextOptions = p.poll.options.map((opt) => {
              // Filter out this user's ID from existing option votes
              let votes = (opt.votes || []).filter((id) => id !== currentUser.id);
              if (opt.id === optionId) {
                // If it's the selected option, add user ID
                votes = [...votes, currentUser.id];
              }
              return { ...opt, votes };
            });
            return {
              ...p,
              poll: {
                ...p.poll,
                options: nextOptions,
              },
            };
          }
          return p;
        })
      );

      const res = await fetch(`/api/posts/${postId}/poll/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, optionId }),
      });

      if (!res.ok) throw new Error('Failed to vote');
      const updatedPost = await res.json();

      // Sync backend state exactly
      setPosts((prev) => prev.map((p) => (p.id === postId ? updatedPost : p)));
    } catch (err) {
      console.error('Vote poll failed:', err);
    }
  };

  const handleAddComment = async (postId: string) => {
    if (!commentText.trim()) return;
    setCommentLoading(true);

    try {
      const res = await fetch(`/api/posts/${postId}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          content: commentText,
        }),
      });

      if (!res.ok) throw new Error('Comment failed');
      const updatedPost = await res.json();

      setPosts((prev) => prev.map((p) => (p.id === postId ? updatedPost : p)));
      setCommentText('');
    } catch (err) {
      console.error('Error adding comment:', err);
    } finally {
      setCommentLoading(false);
    }
  };

  const handleSharePost = (postId: string) => {
    const postToShare = posts.find(p => p.id === postId);
    if (postToShare) {
      setSharingPost(postToShare);
      setShareStep('options');
    }
  };

  const handleCopyLinkOnly = async (post: Post) => {
    try {
      const res = await fetch(`/api/posts/${post.id}/share`, { method: 'POST' });
      if (res.ok) {
        const updatedPost = await res.json();
        setPosts((prev) => prev.map((p) => (p.id === post.id ? updatedPost : p)));
      }

      const mockPostLink = `${window.location.origin}/post/${post.id}`;
      await navigator.clipboard.writeText(mockPostLink);
      setCopiedPostId(post.id);
      setTimeout(() => setCopiedPostId(null), 2500);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const openShareToDm = async () => {
    setShareStep('dm');
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setNetworkUsers(data.filter((u: User) => u.id !== currentUser.id));
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  const handleSendPostAsDm = async (recipientId: string) => {
    if (!sharingPost) return;
    setSendingDmPostId(recipientId);

    try {
      const postLink = `${window.location.origin}/post/${sharingPost.id}`;
      const msgContent = `Check out this post by @${sharingPost.username}: "${sharingPost.content.substring(0, 60)}${sharingPost.content.length > 60 ? '...' : ''}"\nLink: ${postLink}`;

      const dmRes = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: currentUser.id,
          recipientId,
          content: msgContent,
        }),
      });

      if (dmRes.ok) {
        await fetch(`/api/posts/${sharingPost.id}/share`, { method: 'POST' });
        setPosts((prev) =>
          prev.map((p) => (p.id === sharingPost.id ? { ...p, shares: (p.shares || 0) + 1 } : p))
        );

        alert(`Post successfully shared via direct message!`);
        setSharingPost(null);
      }
    } catch (err) {
      console.error('Error sharing post to DM:', err);
    } finally {
      setSendingDmPostId(null);
    }
  };

  const handleSharePostToStory = async () => {
    if (!sharingPost) return;
    setSharingToStory(true);

    try {
      const authorRes = await fetch(`/api/users/${sharingPost.userId}`);
      let authorAvatar = sharingPost.userAvatar || '';
      if (authorRes.ok) {
        const authorData = await authorRes.json();
        authorAvatar = authorData.avatar || authorAvatar;
      }

      const dataUrl = await generatePostStoryImage(sharingPost, authorAvatar, sharingPost.image);
      if (!dataUrl) throw new Error('Could not generate story image');

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileData: dataUrl,
          fileName: 'shared_post_story.jpg',
          fileType: 'image/jpeg',
        }),
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error || 'Upload failed');

      const storyRes = await fetch('/api/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          image: uploadData.fileUrl,
        }),
      });

      if (storyRes.ok) {
        const newStory = await storyRes.json();
        onStoryCreated(newStory);

        await fetch(`/api/posts/${sharingPost.id}/share`, { method: 'POST' });
        setPosts((prev) =>
          prev.map((p) => (p.id === sharingPost.id ? { ...p, shares: (p.shares || 0) + 1 } : p))
        );

        alert('Successfully shared this post to your Story!');
        setSharingPost(null);
      }
    } catch (err) {
      console.error('Failed to share post to story:', err);
      alert('Failed to share post to story. Please try again.');
    } finally {
      setSharingToStory(false);
    }
  };

  const handleBookmarkPost = async (postId: string) => {
    try {
      const res = await fetch(`/api/posts/${postId}/bookmark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id }),
      });

      if (res.ok) {
        const data = await res.json();
        const isAdded = data.bookmarks.includes(postId);
        
        // Update current user bookmarks array directly
        currentUser.bookmarks = data.bookmarks;
        // Trigger visual state update by forcing posts redraw
        setPosts((prev) => [...prev]);

        if (isAdded) {
          showToast('Saved to your bookmarks!', 'success');
        } else {
          showToast('Removed from your bookmarks.', 'info');
        }
      }
    } catch (err) {
      console.error('Failed to bookmark post:', err);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;

    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id }),
      });

      if (res.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== postId));
      }
    } catch (err) {
      console.error('Failed to delete post:', err);
    }
  };

  // Format creation time relative to now
  const formatPostTime = (isoString: string) => {
    const elapsed = Date.now() - new Date(isoString).getTime();
    const mins = Math.round(elapsed / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.round(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="space-y-6">
      {/* Stories Segment */}
      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Stories</h3>
        <StoriesList
          currentUser={currentUser}
          stories={stories}
          onStoryClick={onStoryClick}
          onStoryCreated={onStoryCreated}
        />
      </div>

      {/* Write Post Box */}
      <PostCreate currentUser={currentUser} onPostCreated={handlePostCreated} />

      {/* Timeline Header and Sorters */}
      <div className="flex items-center justify-between">
        <h2 className="text-md font-bold text-gray-900 dark:text-white flex items-center space-x-2">
          <span>{searchQuery ? `Search results for "${searchQuery}"` : 'Home Timeline'}</span>
          <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
            {posts.length} posts
          </span>
        </h2>

        {/* Filter Buttons */}
        <div className="flex items-center space-x-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
          <button
            onClick={() => setFilter('latest')}
            className={`flex items-center space-x-1 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              filter === 'latest'
                ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-900 dark:text-white'
                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Recent</span>
          </button>
          <button
            onClick={() => setFilter('popular')}
            className={`flex items-center space-x-1 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              filter === 'popular' || filter === 'trending'
                ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-900 dark:text-white'
                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            <span>Popular</span>
          </button>
          <button
            onClick={() => setFilter('following')}
            className={`flex items-center space-x-1 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              filter === 'following'
                ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-900 dark:text-white'
                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Following Only</span>
          </button>
          <button
            onClick={() => setFilter('oldest')}
            className={`flex items-center space-x-1 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              filter === 'oldest'
                ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-900 dark:text-white'
                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            <Compass className="h-3.5 w-3.5" />
            <span>Oldest</span>
          </button>
        </div>
      </div>

      {/* Posts List */}
      {posts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 p-12 text-center dark:border-gray-800">
          <AlertCircle className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />
          <h3 className="mt-4 text-sm font-semibold text-gray-950 dark:text-white">No posts found</h3>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Be the first to create an amazing post or adjust your filters!
          </p>
        </div>
      ) : (
        <motion.div
          variants={feedContainerVariants}
          initial="hidden"
          animate="show"
          className="space-y-4"
        >
          {posts.map((post) => {
            const postReactions = post.reactions || { like: [], heart: [], fire: [], laugh: [] };
            const hasReactedLike = (postReactions.like || []).includes(currentUser.id);
            const hasReactedHeart = (postReactions.heart || []).includes(currentUser.id);
            const hasReactedFire = (postReactions.fire || []).includes(currentUser.id);
            const hasReactedLaugh = (postReactions.laugh || []).includes(currentUser.id);

            const totalReactions = 
              (postReactions.like || []).length +
              (postReactions.heart || []).length +
              (postReactions.fire || []).length +
              (postReactions.laugh || []).length;

            const activeEmojis = [];
            if ((postReactions.like || []).length > 0) activeEmojis.push("Ã°Å¸â€˜Â");
            if ((postReactions.heart || []).length > 0) activeEmojis.push("Ã¢ÂÂ¤Ã¯Â¸Â");
            if ((postReactions.fire || []).length > 0) activeEmojis.push("Ã°Å¸â€Â¥");
            if ((postReactions.laugh || []).length > 0) activeEmojis.push("Ã°Å¸Ëœâ€š");

            const hasLiked = post.likes.includes(currentUser.id);
            const isBookmarked = currentUser.bookmarks.includes(post.id);
            const isOwner = post.userId === currentUser.id;
            const isCommentsActive = activeCommentsPostId === post.id;

            return (
              <motion.div
                key={post.id}
                variants={feedItemVariants}
                className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 transition hover:border-gray-200 dark:hover:border-gray-800/80"
              >
                {/* Author Metadata Header */}
                <div className="flex items-center justify-between p-4 pb-3">
                  <div className="flex items-center space-x-3">
                    <img
                      loading="lazy" src={post.userAvatar}
                      alt={post.username}
                      className="h-10 w-10 rounded-full object-cover border border-gray-100 dark:border-gray-800"
                    />
                    <div>
                      <div className="flex items-center space-x-1">
                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                          {post.username}
                        </span>
                        {post.userVerified && (
                          <span 
                            className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[9px] font-bold text-white"
                            title="Verified Creator Badge"
                          >
                            Ã¢Å“â€œ
                          </span>
                        )}
                        {post.userId === 'gemini-bot' && (
                          <span className="flex items-center space-x-0.5 rounded-full bg-indigo-50 px-1.5 py-0.5 text-[8px] font-bold text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                            <Sparkles className="h-2 w-2" />
                            <span>AI BOT</span>
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-1.5 text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                        <span>{formatRelativeTime(post.createdAt)}</span>
                        <span>Ã¢â‚¬Â¢</span>
                        {(!post.visibility || post.visibility === 'public') && (
                          <span className="flex items-center space-x-0.5" title="Public: Anyone can view">
                            <Globe className="h-3 w-3 text-gray-400 dark:text-gray-500" />
                            <span className="text-[9px] font-medium">Public</span>
                          </span>
                        )}
                        {post.visibility === 'followers' && (
                          <span className="flex items-center space-x-0.5" title="Followers Only: Only your followers can view">
                            <Users className="h-3 w-3 text-emerald-500 shrink-0" />
                            <span className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">Followers</span>
                          </span>
                        )}
                        {post.visibility === 'private' && (
                          <span className="flex items-center space-x-0.5" title="Private: Only you can view">
                            <Lock className="h-3 w-3 text-amber-500 shrink-0" />
                            <span className="text-[9px] font-semibold text-amber-600 dark:text-amber-400">Private</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {isOwner ? (
                    <button
                      onClick={() => handleDeletePost(post.id)}
                      className="rounded-lg p-2 text-gray-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-950/20"
                      title="Delete Post"
                    >
                      <Trash2 className="h-4.5 w-4.5" />
                    </button>
                  ) : (
                    onMessageUser && (
                      <button
                        onClick={() => onMessageUser(post.userId)}
                        className="rounded-lg p-2 text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/20"
                        title={`Message @${post.username}`}
                      >
                        <MessageCircle className="h-4.5 w-4.5" />
                      </button>
                    )
                  )}
                </div>

                {/* Post Body Text Content */}
                <div className="px-4 pb-3">
                  <p className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200 leading-relaxed font-sans">
                    {renderPostContent(post.content)}
                  </p>
                </div>

                {/* Poll Component */}
                {post.poll && (
                  <div className="px-4 pb-4 pt-1 animate-fade-in">
                    <div className="rounded-2xl border border-pink-100/60 bg-pink-50/10 p-4 dark:border-pink-950/20 dark:bg-pink-950/5 space-y-3.5">
                      <div className="flex items-center space-x-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-pink-100 text-pink-600 dark:bg-pink-950/50 dark:text-pink-400">
                          <BarChart3 className="h-3.5 w-3.5" />
                        </span>
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
                          {post.poll.question}
                        </h4>
                      </div>

                      {/* Options List */}
                      <div className="space-y-2.5">
                        {(() => {
                          const totalVotes = post.poll.options.reduce((acc, opt) => acc + (opt.votes || []).length, 0);
                          const hasVoted = post.poll.options.some(opt => (opt.votes || []).includes(currentUser.id));

                          return post.poll.options.map((opt) => {
                            const optionVotes = (opt.votes || []).length;
                            const isUserSelection = (opt.votes || []).includes(currentUser.id);
                            const percent = totalVotes > 0 ? Math.round((optionVotes / totalVotes) * 100) : 0;

                            return (
                              <button
                                key={opt.id}
                                onClick={() => handleVotePoll(post.id, opt.id)}
                                className="relative w-full overflow-hidden rounded-xl border border-zinc-150 bg-white p-3.5 text-left transition hover:border-indigo-500/50 dark:border-zinc-800/85 dark:bg-zinc-900 text-xs font-semibold group cursor-pointer"
                              >
                                {/* Animated Visual Progress Bar Layer */}
                                <div 
                                  className={`absolute left-0 top-0 bottom-0 transition-all duration-500 ${
                                    isUserSelection 
                                      ? 'bg-indigo-500/10 dark:bg-indigo-500/15' 
                                      : 'bg-zinc-100 dark:bg-zinc-800/60'
                                  }`}
                                  style={{ width: `${percent}%` }}
                                />

                                {/* Option Label & Info */}
                                <div className="relative z-10 flex items-center justify-between space-x-2">
                                  <div className="flex items-center space-x-2">
                                    <div className={`flex h-4 w-4 items-center justify-center rounded-full border transition ${
                                      isUserSelection 
                                        ? 'border-indigo-600 bg-indigo-600 text-white' 
                                        : 'border-zinc-300 dark:border-zinc-750'
                                    }`}>
                                      {isUserSelection && (
                                        <svg className="h-2.5 w-2.5 stroke-white" fill="none" viewBox="0 0 24 24" strokeWidth="4">
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                        </svg>
                                      )}
                                    </div>
                                    <span className={`font-semibold ${
                                      isUserSelection 
                                        ? 'text-indigo-600 dark:text-indigo-400 font-bold' 
                                        : 'text-gray-800 dark:text-zinc-200'
                                    }`}>
                                      {opt.text}
                                    </span>
                                  </div>

                                  <div className="flex items-center space-x-2 text-right">
                                    <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono">
                                      {optionVotes} {optionVotes === 1 ? 'vote' : 'votes'}
                                    </span>
                                    <span className="font-bold text-gray-900 dark:text-white font-mono min-w-[28px]">
                                      {percent}%
                                    </span>
                                  </div>
                                </div>
                              </button>
                            );
                          });
                        })()}
                      </div>

                      {/* Poll Summary Footer */}
                      <div className="flex items-center justify-between text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                        <span>
                          {(() => {
                            const totalVotes = post.poll.options.reduce((acc, opt) => acc + (opt.votes || []).length, 0);
                            return `${totalVotes} ${totalVotes === 1 ? 'total vote' : 'total votes'}`;
                          })()}
                        </span>
                        <span className="flex items-center space-x-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>Interactive Poll</span>
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Custom Multi-Media Gallery Component */}
                <PostMedia post={post} />

                {/* Quick Interactive Statistics Row */}
                <div className="flex items-center justify-between px-4 py-2 text-[11px] text-gray-400 dark:text-gray-500 border-b border-gray-50 dark:border-gray-800/40">
                  <span className="hover:underline cursor-pointer flex items-center space-x-1">
                    {activeEmojis.length > 0 && (
                      <span className="flex items-center -space-x-1 text-[13px] mr-1">
                        {activeEmojis.map((emoji, idx) => (
                          <span key={idx} className="inline-block transform hover:scale-110 transition">{emoji}</span>
                        ))}
                      </span>
                    )}
                    <span>{totalReactions} {totalReactions === 1 ? 'reaction' : 'reactions'}</span>
                  </span>
                  <div className="flex space-x-3">
                    <span>{post.comments.length} comments</span>
                    <span>{post.shares} shares</span>
                  </div>
                </div>

                {/* Footer Operations Actions Bar */}
                <div className="flex items-center justify-between px-2 py-1.5 bg-gray-50/50 dark:bg-gray-900/40">
                  {/* Reactions Pill List */}
                  <div className="flex items-center space-x-1 sm:space-x-1.5">
                    {/* Like Ã°Å¸â€˜Â */}
                    <button
                      onClick={() => handleReactPost(post.id, 'like')}
                      className={`flex items-center space-x-1 rounded-xl px-2.5 py-1 text-xs font-semibold transition ${
                        hasReactedLike
                          ? 'bg-blue-100/80 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 font-bold'
                          : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                      }`}
                      title="Like"
                    >
                      <span className="text-sm">Ã°Å¸â€˜Â</span>
                      <span className="text-[10px]">{(postReactions.like || []).length}</span>
                    </button>

                    {/* Love Ã¢ÂÂ¤Ã¯Â¸Â */}
                    <button
                      onClick={() => handleReactPost(post.id, 'heart')}
                      className={`flex items-center space-x-1 rounded-xl px-2.5 py-1 text-xs font-semibold transition ${
                        hasReactedHeart
                          ? 'bg-rose-100/80 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 font-bold'
                          : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                      }`}
                      title="Love"
                    >
                      <span className="text-sm">Ã¢ÂÂ¤Ã¯Â¸Â</span>
                      <span className="text-[10px]">{(postReactions.heart || []).length}</span>
                    </button>

                    {/* Fire Ã°Å¸â€Â¥ */}
                    <button
                      onClick={() => handleReactPost(post.id, 'fire')}
                      className={`flex items-center space-x-1 rounded-xl px-2.5 py-1 text-xs font-semibold transition ${
                        hasReactedFire
                          ? 'bg-amber-100/80 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400 font-bold'
                          : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                      }`}
                      title="Fire"
                    >
                      <span className="text-sm">Ã°Å¸â€Â¥</span>
                      <span className="text-[10px]">{(postReactions.fire || []).length}</span>
                    </button>

                    {/* Laugh Ã°Å¸Ëœâ€š */}
                    <button
                      onClick={() => handleReactPost(post.id, 'laugh')}
                      className={`flex items-center space-x-1 rounded-xl px-2.5 py-1 text-xs font-semibold transition ${
                        hasReactedLaugh
                          ? 'bg-yellow-100/80 text-yellow-600 dark:bg-yellow-950/50 dark:text-yellow-400 font-bold'
                          : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                      }`}
                      title="Laugh"
                    >
                      <span className="text-sm">Ã°Å¸Ëœâ€š</span>
                      <span className="text-[10px]">{(postReactions.laugh || []).length}</span>
                    </button>
                  </div>

                  <button
                    onClick={() => setActiveCommentsPostId(isCommentsActive ? null : post.id)}
                    className={`flex items-center space-x-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                      isCommentsActive
                        ? 'text-blue-500 bg-blue-50/60 dark:bg-blue-950/20'
                        : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                    }`}
                  >
                    <MessageCircle className="h-4.5 w-4.5" />
                    <span className="hidden sm:inline">Comment</span>
                  </button>

                  <button
                    onClick={() => handleSharePost(post.id)}
                    className={`flex items-center space-x-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                      copiedPostId === post.id
                        ? 'text-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/20'
                        : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                    }`}
                  >
                    {copiedPostId === post.id ? (
                      <>
                        <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" />
                        <span className="text-emerald-500 font-bold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="h-4.5 w-4.5" />
                        <span className="hidden sm:inline">Share</span>
                      </>
                    )}
                  </button>

                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    whileHover={{ scale: 1.05 }}
                    onClick={() => handleBookmarkPost(post.id)}
                    className={`flex items-center space-x-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                      isBookmarked
                        ? 'text-blue-500 bg-blue-50/60 dark:bg-blue-950/20 shadow-sm'
                        : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                    }`}
                  >
                    {isBookmarked ? (
                      <>
                        <BookmarkCheck className="h-4.5 w-4.5 text-blue-500 fill-blue-500 animate-pulse" />
                        <span className="hidden sm:inline">Saved</span>
                      </>
                    ) : (
                      <>
                        <Bookmark className="h-4.5 w-4.5" />
                        <span className="hidden sm:inline">Save</span>
                      </>
                    )}
                  </motion.button>
                </div>

                {/* Expandable Comments Segment Drawer */}
                {isCommentsActive && (
                  <div className="border-t border-gray-100 p-4 bg-gray-50/30 dark:border-gray-800 dark:bg-gray-950/20">
                    <h4 className="mb-3 text-xs font-bold text-gray-500 dark:text-gray-400">Comments</h4>

                    {/* Comments list */}
                    {post.comments.length === 0 ? (
                      <p className="my-3 text-center text-xs text-gray-400">No comments yet. Share your thoughts first!</p>
                    ) : (
                      <div className="mb-4 space-y-3.5 max-h-64 overflow-y-auto pr-1">
                        {post.comments.map((comment) => (
                          <div key={comment.id} className="flex space-x-3 items-start">
                            <img
                              loading="lazy" src={comment.userAvatar}
                              alt={comment.username}
                              className="h-8 w-8 rounded-full object-cover mt-0.5 border border-gray-100 dark:border-gray-800"
                            />
                            <div className="flex-1 rounded-xl bg-gray-100 p-3 dark:bg-gray-900 text-xs">
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center space-x-1">
                                  <span className="font-bold text-gray-900 dark:text-white">{comment.username}</span>
                                  {comment.userId === 'gemini-bot' && (
                                    <span className="flex items-center space-x-0.5 rounded bg-indigo-50 px-1 py-0.2 text-[8px] font-bold text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                                      <Sparkles className="h-2 w-2" />
                                      <span>AI</span>
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-gray-400">{formatRelativeTime(comment.createdAt)}</span>
                              </div>
                              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{comment.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add Comment Input */}
                    <div className="flex space-x-3 items-center">
                      <img
                        loading="lazy" src={currentUser.avatar}
                        alt={currentUser.username}
                        className="h-8 w-8 rounded-full object-cover border border-gray-100 dark:border-gray-800"
                      />
                      <div className="flex-1 flex items-center relative bg-white rounded-xl border border-gray-200 dark:bg-gray-900 dark:border-gray-700 overflow-hidden">
                        <input
                          type="text"
                          placeholder="Write a supportive comment..."
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddComment(post.id);
                          }}
                          className="flex-1 py-2 px-3 text-xs bg-transparent border-0 focus:outline-none focus:ring-0 dark:text-white"
                        />
                        <button
                          onClick={() => handleAddComment(post.id)}
                          disabled={commentLoading || !commentText.trim()}
                          className="px-3.5 text-xs font-bold text-blue-600 hover:text-blue-700 disabled:opacity-40"
                        >
                          Send
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Post Share Options Dialog Modal */}
      {sharingPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900 border border-gray-100 dark:border-gray-800 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                {shareStep === 'options' ? 'Share Post' : 'Send via Message'}
              </h3>
              <button
                onClick={() => setSharingPost(null)}
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-500 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {shareStep === 'options' ? (
              <div className="space-y-3 mt-4">
                {/* Option 1: Share to My Story */}
                <button
                  onClick={handleSharePostToStory}
                  disabled={sharingToStory}
                  className="flex w-full items-center justify-between rounded-xl border border-indigo-100 bg-indigo-50/50 p-3.5 text-left text-xs font-semibold text-indigo-950 transition hover:bg-indigo-50 dark:border-indigo-950/40 dark:bg-indigo-950/20 dark:text-indigo-200 cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    <div className="rounded-lg bg-indigo-500 p-2 text-white">
                      <Sparkles className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <p className="font-bold">Share to My Story</p>
                      <p className="text-[10px] text-indigo-600/70 dark:text-indigo-400/70">
                        Create a gorgeous gradient preview card for your story
                      </p>
                    </div>
                  </div>
                  {sharingToStory ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-indigo-400" />
                  )}
                </button>

                {/* Option 2: Send via Direct Message */}
                <button
                  onClick={openShareToDm}
                  className="flex w-full items-center justify-between rounded-xl border border-gray-100 bg-gray-50/50 p-3.5 text-left text-xs font-semibold text-gray-800 transition hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-800/20 dark:text-gray-200 cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    <div className="rounded-lg bg-emerald-500 p-2 text-white">
                      <Send className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <p className="font-bold">Send via Message</p>
                      <p className="text-[10px] text-gray-500">
                        Direct message this post link to a friend
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </button>

                {/* Option 3: Copy shareable link */}
                <button
                  onClick={() => {
                    handleCopyLinkOnly(sharingPost);
                    setSharingPost(null);
                  }}
                  className="flex w-full items-center justify-between rounded-xl border border-gray-100 bg-gray-50/50 p-3.5 text-left text-xs font-semibold text-gray-800 transition hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-800/20 dark:text-gray-200 cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    <div className="rounded-lg bg-gray-500 p-2 text-white">
                      <Copy className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <p className="font-bold">Copy shareable link</p>
                      <p className="text-[10px] text-gray-500">
                        Copy link to system clipboard
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </button>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                {/* Back button */}
                <button
                  onClick={() => setShareStep('options')}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center cursor-pointer"
                >
                  Ã¢â€ Â Back to options
                </button>

                {/* Recipient Search */}
                <input
                  type="text"
                  placeholder="Search friends..."
                  value={dmSearchQuery}
                  onChange={(e) => setDmSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-xs text-gray-900 outline-none focus:border-indigo-500 focus:bg-white dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:bg-gray-900 transition"
                />

                {/* Recipient list */}
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {networkUsers
                    .filter(
                      (u) =>
                        u.username.toLowerCase().includes(dmSearchQuery.toLowerCase()) ||
                        u.name.toLowerCase().includes(dmSearchQuery.toLowerCase())
                    )
                    .map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between rounded-xl p-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                      >
                        <div className="flex items-center space-x-3">
                          <img
                            loading="lazy" src={user.avatar}
                            alt={user.username}
                            className="h-9 w-9 rounded-full object-cover border border-gray-100 dark:border-gray-800"
                          />
                          <div>
                            <p className="text-xs font-bold text-gray-900 dark:text-white">
                              {user.name}
                            </p>
                            <p className="text-[10px] text-gray-400">@{user.username}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleSendPostAsDm(user.id)}
                          disabled={sendingDmPostId === user.id}
                          className="rounded-full bg-indigo-600 px-3 py-1.5 text-[10px] font-bold text-white hover:bg-indigo-700 transition disabled:opacity-50 cursor-pointer"
                        >
                          {sendingDmPostId === user.id ? 'Sending...' : 'Send'}
                        </button>
                      </div>
                    ))}
                  {networkUsers.length === 0 && (
                    <p className="text-center text-xs text-gray-400 my-4">No active users found.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9, x: '-50%' }}
            animate={{ opacity: 1, y: 0, scale: 1, x: '-50%' }}
            exit={{ opacity: 0, y: 20, scale: 0.95, x: '-50%' }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className="fixed bottom-6 left-1/2 z-50 flex items-center space-x-2 rounded-full px-4.5 py-3 shadow-xl backdrop-blur-md bg-zinc-950/90 text-white border border-zinc-800/80 text-xs font-semibold"
          >
            {toastType === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 animate-bounce" />
            ) : (
              <Bookmark className="h-4 w-4 text-indigo-400 shrink-0" />
            )}
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
