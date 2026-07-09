import React, { useEffect, useState } from 'react';
import { Story, User } from '../types';
import { X, ChevronLeft, ChevronRight, Clock, Eye, Trash2, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface StoriesModalProps {
  stories: Story[];
  initialIndex: number;
  currentUser: User;
  setStories: React.Dispatch<React.SetStateAction<Story[]>>;
  onClose: () => void;
}

export default function StoriesModal({
  stories,
  initialIndex,
  currentUser,
  setStories,
  onClose,
}: StoriesModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [replySuccess, setReplySuccess] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [floatingEmojis, setFloatingEmojis] = useState<{ id: string; emoji: string; x: number }[]>([]);

  const currentStory = stories[currentIndex];

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  // Handle automatic progress tick
  useEffect(() => {
    if (isFocused) return; // Pause story when typing a reply

    setProgress(0);
    const duration = 5000; // 5 seconds per story
    const intervalTime = 50; // tick every 50ms
    const increment = (intervalTime / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          handleNext();
          return 100;
        }
        return prev + increment;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [currentIndex, isFocused, stories.length]);

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleDeleteStory = async () => {
    if (!currentStory) return;
    if (!window.confirm('Are you sure you want to delete this story?')) return;

    try {
      const res = await fetch(`/api/stories/${currentStory.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id }),
      });

      if (res.ok) {
        setStories((prev) => prev.filter((s) => s.id !== currentStory.id));
        // Go to next story or close if last or none left
        if (stories.length <= 1) {
          onClose();
        } else {
          // If we are on the last index, go back, else stay on current index (which is now the next story)
          if (currentIndex >= stories.length - 1) {
            setCurrentIndex((prev) => Math.max(0, prev - 1));
          }
        }
      }
    } catch (err) {
      console.error('Failed to delete story:', err);
    }
  };

  const handleSendReply = async (textToSend?: string) => {
    if (!currentStory) return;
    const finalContent = textToSend || replyText;
    if (!finalContent.trim()) return;

    setSendingReply(true);
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: currentUser.id,
          recipientId: currentStory.userId,
          content: `Replied to your story: "${finalContent}"`,
        }),
      });

      if (res.ok) {
        setReplyText('');
        setReplySuccess(true);
        setTimeout(() => setReplySuccess(false), 2000);
      }
    } catch (err) {
      console.error('Failed to send story reply:', err);
    } finally {
      setSendingReply(false);
    }
  };

  const triggerFloatingEmoji = (emoji: string) => {
    const id = Math.random().toString();
    const x = Math.random() * 60 + 20; // x coordinate percentage
    setFloatingEmojis((prev) => [...prev, { id, emoji, x }]);
    setTimeout(() => {
      setFloatingEmojis((prev) => prev.filter((item) => item.id !== id));
    }, 1500);
  };

  const handleStoryReact = async (emoji: string) => {
    if (!currentStory) return;
    triggerFloatingEmoji(emoji);

    try {
      setStories((prevStories) =>
        prevStories.map((s) => {
          if (s.id === currentStory.id) {
            const nextReactions = s.reactions ? [...s.reactions] : [];
            const existingIdx = nextReactions.findIndex(
              (r) => r.userId === currentUser.id && r.emoji === emoji
            );
            if (existingIdx !== -1) {
              nextReactions.splice(existingIdx, 1);
            } else {
              nextReactions.push({
                id: 'temp-' + Math.random().toString(),
                emoji,
                userId: currentUser.id,
                username: currentUser.username,
              });
            }
            return { ...s, reactions: nextReactions };
          }
          return s;
        })
      );

      const res = await fetch(`/api/stories/${currentStory.id}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, emoji }),
      });

      if (!res.ok) throw new Error('Failed to react to story');
      const updatedStory = await res.json();

      setStories((prevStories) =>
        prevStories.map((s) => (s.id === currentStory.id ? updatedStory : s))
      );
    } catch (err) {
      console.error('Failed to react to story:', err);
    }
  };

  if (!currentStory) return null;

  // Format creation time relative to now
  const formatStoryTime = (isoString: string) => {
    const mins = Math.round((Date.now() - new Date(isoString).getTime()) / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.round(mins / 60);
    return `${hours}h ago`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/95 backdrop-blur-md p-0 sm:p-4 select-none">
      <div className="relative flex h-full w-full max-w-lg flex-col bg-black text-white sm:h-[85vh] sm:rounded-2xl sm:border sm:border-gray-800 overflow-hidden shadow-2xl">
        {/* Progress Bars Indicator */}
        <div className="absolute top-3 left-0 right-0 z-20 flex space-x-1 px-4">
          {stories.map((_, i) => (
            <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full bg-white transition-all ease-linear"
                style={{
                  width: i === currentIndex ? `${progress}%` : i < currentIndex ? '100%' : '0%',
                }}
              />
            </div>
          ))}
        </div>

        {/* Story Header */}
        <div className="absolute top-6 left-0 right-0 z-20 flex items-center justify-between px-4 bg-gradient-to-b from-black/60 to-transparent pb-8">
          <div className="flex items-center space-x-3">
            <img
              src={currentStory.userAvatar}
              alt={currentStory.username}
              className="h-9 w-9 rounded-full object-cover border border-white/20"
            />
            <div>
              <h4 className="text-xs font-bold">{currentStory.username}</h4>
              <p className="flex items-center text-[10px] text-white/70">
                <Clock className="mr-1 h-3 w-3" />
                {formatStoryTime(currentStory.createdAt)}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {currentStory.userId === currentUser.id && (
              <button
                onClick={handleDeleteStory}
                className="rounded-full bg-black/40 p-2 text-rose-400 hover:bg-black/60 hover:text-rose-500 transition"
                title="Delete Story"
              >
                <Trash2 className="h-4.5 w-4.5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-full bg-black/40 p-2 text-white/90 hover:bg-black/60 transition"
              title="Close Viewer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Left/Right Tapping Areas */}
        <div className="absolute inset-y-0 left-0 right-0 z-10 flex">
          <div onClick={handlePrev} className="w-1/3 h-full cursor-w-resize" />
          <div onClick={handleNext} className="w-2/3 h-full cursor-e-resize" />
        </div>

        {/* Floating Emojis */}
        <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
          <AnimatePresence>
            {floatingEmojis.map((item) => (
              <motion.div
                key={item.id}
                initial={{ y: '100%', x: `${item.x}%`, scale: 0.5, opacity: 0 }}
                animate={{
                  y: ['90%', '15%', '-10%'],
                  x: [
                    `${item.x}%`,
                    `${item.x + (Math.random() * 20 - 10)}%`,
                    `${item.x + (Math.random() * 40 - 20)}%`
                  ],
                  scale: [0.8, 1.4, 1],
                  opacity: [0, 1, 1, 0],
                }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
                exit={{ opacity: 0 }}
                className="absolute text-4xl select-none"
                style={{ bottom: 0 }}
              >
                {item.emoji}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Story Media */}
        <div className="flex-1 flex items-center justify-center bg-zinc-950 relative">
          <img
            src={currentStory.image}
            alt="Active user story image"
            className="max-h-full max-w-full object-contain"
          />

          {/* Active Reactions Pill Tally */}
          {currentStory.reactions && currentStory.reactions.length > 0 && (
            <div className="absolute bottom-28 left-4 z-20 flex flex-wrap gap-1.5 max-w-[80%] pointer-events-auto">
              {Object.entries(
                currentStory.reactions.reduce((acc, curr) => {
                  acc[curr.emoji] = (acc[curr.emoji] || []).concat(curr.username);
                  return acc;
                }, {} as Record<string, string[]>)
              ).map(([emoji, usernames]) => {
                const userHasReacted = currentStory.reactions?.some(
                  (r) => r.userId === currentUser.id && r.emoji === emoji
                );
                return (
                  <button
                    key={emoji}
                    onClick={() => handleStoryReact(emoji)}
                    className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold backdrop-blur-md transition-all border duration-150 cursor-pointer ${
                      userHasReacted
                        ? 'bg-indigo-600/85 text-white border-indigo-400/50 shadow-md'
                        : 'bg-black/50 text-white/95 border-white/10 hover:bg-black/70'
                    }`}
                    title={`Reacted by: ${usernames.join(', ')}`}
                  >
                    <span className="text-sm">{emoji}</span>
                    <span className="text-[10px] font-mono font-medium">{usernames.length}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Desktop Controls (Arrows) */}
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-20 hidden sm:flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white/80 hover:bg-black/80 disabled:opacity-30 disabled:pointer-events-none transition border border-white/10"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <button
          onClick={handleNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-20 hidden sm:flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white/80 hover:bg-black/80 transition border border-white/10"
        >
          <ChevronRight className="h-6 w-6" />
        </button>

        {/* Interactive Reply and Reaction Footer */}
        <div
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black via-black/85 to-transparent pt-12 pb-6 px-4"
        >
          {currentStory.userId !== currentUser.id ? (
            <div className="space-y-3.5">
              {/* Quick Reaction Emojis */}
              <div className="flex justify-center space-x-4">
                {['❤️', '😂', '😮', '😢', '🔥', '👏'].map((emoji) => {
                  const hasReacted = currentStory.reactions?.some(
                    (r) => r.userId === currentUser.id && r.emoji === emoji
                  );
                  return (
                    <button
                      key={emoji}
                      onClick={() => handleStoryReact(emoji)}
                      className={`text-2xl transition hover:scale-130 active:scale-90 cursor-pointer duration-150 ${
                        hasReacted 
                          ? 'scale-115 filter drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]' 
                          : 'opacity-80 hover:opacity-100'
                      }`}
                      title={`React with ${emoji}`}
                    >
                      {emoji}
                    </button>
                  );
                })}
              </div>

              {/* Reply Input Bar */}
              <div className="flex items-center space-x-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSendReply();
                    }}
                    placeholder={`Reply to @${currentStory.username}...`}
                    className="w-full rounded-full border border-white/15 bg-white/10 py-2.5 pl-4 pr-12 text-xs text-white outline-none focus:border-white/30 focus:bg-white/15 transition placeholder:text-white/40"
                  />
                  {replySuccess && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-green-500 px-2 py-0.5 text-[9px] font-bold text-white shadow">
                      Sent!
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleSendReply()}
                  disabled={sendingReply || !replyText.trim()}
                  className="rounded-full bg-white p-2.5 text-black hover:bg-gray-100 transition disabled:opacity-50 shrink-0 cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <p className="flex items-center justify-center text-white/50 text-[10px]">
              <Eye className="mr-1.5 h-3.5 w-3.5 text-blue-400" />
              <span>This is your active story - expires in 24 hours</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
