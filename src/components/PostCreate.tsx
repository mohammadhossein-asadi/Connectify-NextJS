import React, { useRef, useState, useEffect } from 'react';
import { User, Post } from '../types';
import MediaGallery from './post/MediaGallery';
import { 
  Image, 
  Film, 
  Sparkles, 
  Send, 
  X, 
  AlertCircle, 
  AtSign, 
  Users, 
  Search, 
  Check, 
  Smile,
  ChevronLeft,
  ChevronRight,
  Clock,
  BarChart2,
  Globe,
  Lock,
  ChevronDown
} from 'lucide-react';

interface PostCreateProps {
  currentUser: User;
  onPostCreated: (newPost: Post) => void;
}

interface CompactUser {
  id: string;
  username: string;
  avatar: string;
  verified: boolean;
}

interface MediaItem {
  id: string;
  data: string;
  type: 'image' | 'video';
}

export default function PostCreate({ currentUser, onPostCreated }: PostCreateProps) {
  const [content, setContent] = useState('');
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [galleryActiveIndex, setGalleryActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [aiTopic, setAiTopic] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const [visibility, setVisibility] = useState<'public' | 'followers' | 'private'>('public');
  const [showVisibilityDropdown, setShowVisibilityDropdown] = useState(false);

  // Users and Mentions States
  const [allUsers, setAllUsers] = useState<CompactUser[]>([]);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [showPersonPicker, setShowPersonPicker] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');

  const [showScheduler, setShowScheduler] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Local storage auto-save draft feature
  useEffect(() => {
    const key = `connectify_draft_post_${currentUser.id}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const { draftContent, draftMedia } = JSON.parse(saved);
        if (draftContent !== undefined) setContent(draftContent);
        if (draftMedia !== undefined) setMediaItems(draftMedia);
      } catch (e) {
        console.error('Failed to load draft:', e);
      }
    }
  }, [currentUser.id]);

  useEffect(() => {
    const key = `connectify_draft_post_${currentUser.id}`;
    if (content || mediaItems.length > 0) {
      localStorage.setItem(key, JSON.stringify({ draftContent: content, draftMedia: mediaItems }));
    } else {
      localStorage.removeItem(key);
    }
  }, [content, mediaItems, currentUser.id]);

  // Fetch all users on mount for mentions autocompletion
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch('/api/users');
        if (res.ok) {
          const data = await res.json();
          setAllUsers(data);
        }
      } catch (err) {
        console.error('Error fetching users for mentions:', err);
      }
    };
    fetchUsers();
  }, []);

  // Filter users based on autocomplete query
  const filteredAutocompleteUsers = allUsers.filter(u => 
    u.username.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  // Filter users in the Person Picker Modal
  const filteredPickerUsers = allUsers.filter(u => 
    u.username.toLowerCase().includes(pickerSearch.toLowerCase())
  );

  // Convert uploaded files to base64
  const processFiles = (files: FileList) => {
    setError('');
    setProgress(10);

    const promises = Array.from(files).map((file) => {
      return new Promise<MediaItem | null>((resolve) => {
        if (file.size > 15 * 1024 * 1024) {
          setError('Some files were ignored because they exceed the 15MB limit.');
          resolve(null);
          return;
        }
        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');
        if (!isImage && !isVideo) {
          setError('Unsupported file format. Please upload an image or video.');
          resolve(null);
          return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
          resolve({
            id: 'media-' + Math.random().toString(36).substring(2, 9),
            data: reader.result as string,
            type: isImage ? 'image' : 'video',
          });
        };
        reader.readAsDataURL(file);
      });
    });

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(timer);
          return 90;
        }
        return prev + 15;
      });
    }, 100);

    Promise.all(promises).then((results) => {
      clearInterval(timer);
      setProgress(100);
      const validResults = results.filter((item): item is MediaItem => item !== null);
      if (validResults.length > 0) {
        setMediaItems((prev) => {
          const newItems = [...prev, ...validResults];
          return newItems;
        });
      }
      setTimeout(() => setProgress(0), 1000);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (val.length > 2200) return; // Connectify limit
    setContent(val);

    // Auto-detect typing @mention
    const selectionStart = e.target.selectionStart;
    const textBeforeCursor = val.substring(0, selectionStart);
    const lastAtIdx = textBeforeCursor.lastIndexOf('@');

    if (lastAtIdx !== -1 && lastAtIdx >= textBeforeCursor.lastIndexOf(' ')) {
      const query = textBeforeCursor.substring(lastAtIdx + 1);
      if (!query.includes(' ') && !query.includes('\n')) {
        setMentionQuery(query);
        setMentionStartIndex(lastAtIdx);
        setShowMentionDropdown(true);
        return;
      }
    }
    setShowMentionDropdown(false);
  };

  // Direct complete of typed mention
  const selectMention = (username: string) => {
    if (mentionStartIndex !== -1) {
      const beforeAt = content.substring(0, mentionStartIndex);
      const afterCursor = content.substring(textareaRef.current?.selectionStart || content.length);
      const updated = `${beforeAt}@${username} ${afterCursor}`;
      setContent(updated);
    } else {
      setContent(prev => `${prev}@${username} `);
    }
    setShowMentionDropdown(false);
    textareaRef.current?.focus();
  };

  // Toggle quick tag/mention from companion picker
  const togglePickerMention = (username: string) => {
    const tag = `@${username}`;
    if (content.toLowerCase().includes(tag.toLowerCase())) {
      // Remove mention
      const regex = new RegExp(`\\s*${tag}\\s*`, 'gi');
      setContent(prev => prev.replace(regex, ' ').trim());
    } else {
      // Add mention
      setContent(prev => prev.trim() ? `${prev} ${tag}` : tag);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
  };

  // Submit Post
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && mediaItems.length === 0 && !showPollCreator) return;

    setLoading(true);
    setError('');

    if (showPollCreator) {
      if (!pollQuestion.trim()) {
        setError('Poll question cannot be empty.');
        setLoading(false);
        return;
      }
      const validOptions = pollOptions.filter(o => o.trim());
      if (validOptions.length < 2) {
        setError('Poll must have at least 2 options.');
        setLoading(false);
        return;
      }
    }

    try {
      const uploadedMedia: { url: string; type: 'image' | 'video' }[] = [];
      const imageFiles: string[] = [];
      let firstVideoUrl = '';

      for (let i = 0; i < mediaItems.length; i++) {
        const item = mediaItems[i];
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileData: item.data,
            fileName: item.type === 'image' ? `post_image_${i}.jpg` : `post_video_${i}.mp4`,
            fileType: item.type === 'image' ? 'image/jpeg' : 'video/mp4',
          }),
        });

        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.error || `Media upload failed at item ${i+1}`);
        
        uploadedMedia.push({ url: uploadData.fileUrl, type: item.type });
        if (item.type === 'image') {
          imageFiles.push(uploadData.fileUrl);
        } else if (!firstVideoUrl) {
          firstVideoUrl = uploadData.fileUrl;
        }
      }

      const postRes = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          content,
          image: imageFiles[0] || undefined,
          video: firstVideoUrl || undefined,
          images: imageFiles,
          media: uploadedMedia,
          scheduledAt: scheduledDate ? new Date(scheduledDate).toISOString() : undefined,
          visibility,
          poll: showPollCreator ? {
            question: pollQuestion.trim(),
            options: pollOptions.filter(o => o.trim()).map((o, idx) => ({
              id: `opt-${idx + 1}-${Math.random().toString(36).substring(2, 6)}`,
              text: o.trim(),
              votes: []
            }))
          } : undefined
        }),
      });

      const newPost = await postRes.json();
      if (!postRes.ok) throw new Error(newPost.error || 'Failed to publish post');

      onPostCreated(newPost);
      setContent('');
      setMediaItems([]);
      setGalleryActiveIndex(0);
      setAiTopic('');
      setScheduledDate('');
      setShowScheduler(false);
      setPollQuestion('');
      setPollOptions(['', '']);
      setShowPollCreator(false);
      setVisibility('public');
    } catch (err: any) {
      setError(err.message || 'Something went wrong while publishing.');
    } finally {
      setLoading(false);
    }
  };

  // OpenRouter/AI Draft Generator
  const handleGenerateAiDraft = async () => {
    if (!aiTopic.trim()) {
      setError('Please enter a topic first for the AI to draft!');
      return;
    }

    setAiGenerating(true);
    setError('');

    try {
      const res = await fetch('/api/gemini/generate-post-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: aiTopic }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI generation failed');

      setContent(data.draft);
    } catch (err: any) {
      setError(err.message || 'AI assistant was unable to generate. Try again.');
    } finally {
      setAiGenerating(false);
    }
  };

  return (
    <div 
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="relative rounded-2xl border border-gray-100 bg-white p-4.5 shadow-sm dark:border-gray-800 dark:bg-gray-900 transition hover:shadow-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-center space-x-2 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-600 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-100 dark:border-rose-900/40">
            <AlertCircle className="h-4.5 w-4.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Top profile and visibility select row */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-800/80">
          <div className="flex items-center space-x-3">
            <img
              src={currentUser.avatar}
              alt={currentUser.username}
              className="h-10 w-10 rounded-full object-cover border border-gray-100 dark:border-gray-800 shrink-0 shadow-xs"
            />
            <div className="flex flex-col items-start">
              <span className="text-xs font-bold text-gray-950 dark:text-white">@{currentUser.username}</span>
              
              {/* Visibility Dropdown Selector */}
              <div className="relative mt-1">
                <button
                  type="button"
                  onClick={() => setShowVisibilityDropdown(!showVisibilityDropdown)}
                  className="inline-flex items-center space-x-1.5 rounded-full border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-zinc-900 px-2.5 py-0.5 text-[10px] font-bold text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                >
                  {visibility === 'public' && (
                    <>
                      <Globe className="h-3 w-3 text-blue-500" />
                      <span>Public</span>
                    </>
                  )}
                  {visibility === 'followers' && (
                    <>
                      <Users className="h-3 w-3 text-emerald-500" />
                      <span>Followers Only</span>
                    </>
                  )}
                  {visibility === 'private' && (
                    <>
                      <Lock className="h-3 w-3 text-amber-500" />
                      <span>Private</span>
                    </>
                  )}
                  <ChevronDown className="h-2.5 w-2.5 text-gray-400" />
                </button>

                {showVisibilityDropdown && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowVisibilityDropdown(false)} 
                    />
                    <div className="absolute left-0 mt-1.5 w-56 rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl dark:border-zinc-800 dark:bg-zinc-950 z-50 animate-fade-in text-left">
                      <div className="px-2.5 py-1 text-[9px] font-extrabold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">
                        Post Visibility
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => {
                          setVisibility('public');
                          setShowVisibilityDropdown(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition cursor-pointer ${
                          visibility === 'public' 
                            ? 'bg-blue-50/50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400 font-bold' 
                            : 'text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-900'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <Globe className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                          <div className="leading-tight">
                            <div className="font-semibold text-[11px]">Public</div>
                            <div className="text-[9px] text-gray-400 dark:text-zinc-500 font-normal">Anyone can view this post</div>
                          </div>
                        </div>
                        {visibility === 'public' && <Check className="h-3 w-3 text-blue-500" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setVisibility('followers');
                          setShowVisibilityDropdown(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition cursor-pointer ${
                          visibility === 'followers' 
                            ? 'bg-emerald-50/50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 font-bold' 
                            : 'text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-900'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <Users className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          <div className="leading-tight">
                            <div className="font-semibold text-[11px]">Followers Only</div>
                            <div className="text-[9px] text-gray-400 dark:text-zinc-500 font-normal">Only followers can view</div>
                          </div>
                        </div>
                        {visibility === 'followers' && <Check className="h-3 w-3 text-emerald-500" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setVisibility('private');
                          setShowVisibilityDropdown(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition cursor-pointer ${
                          visibility === 'private' 
                            ? 'bg-amber-50/50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400 font-bold' 
                            : 'text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-900'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <Lock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                          <div className="leading-tight">
                            <div className="font-semibold text-[11px]">Private</div>
                            <div className="text-[9px] text-gray-400 dark:text-zinc-500 font-normal">Only you can view</div>
                          </div>
                        </div>
                        {visibility === 'private' && <Check className="h-3 w-3 text-amber-500" />}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Text Input Area */}
        <div className="relative">
          <textarea
            ref={textareaRef}
            placeholder={`Share what is on your mind... Mention friends using @ or tag them!`}
            value={content}
            onChange={handleContentChange}
            rows={3}
            className="w-full resize-none border-0 bg-transparent py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-0 dark:text-white dark:placeholder-gray-500 leading-relaxed"
          />

          {/* Live Inline Autocomplete Dropdown */}
          {showMentionDropdown && filteredAutocompleteUsers.length > 0 && (
            <div className="absolute left-0 top-full z-30 mt-2 max-h-48 w-60 overflow-y-auto rounded-xl border border-zinc-200 bg-white p-1.5 shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
              <p className="px-2.5 py-1 text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">
                Select User to Tag
              </p>
              {filteredAutocompleteUsers.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => selectMention(u.username)}
                  className="flex w-full items-center space-x-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-gray-700 hover:bg-indigo-50 dark:text-zinc-300 dark:hover:bg-zinc-900/80 transition cursor-pointer"
                >
                  <img src={u.avatar} alt={u.username} className="h-5 w-5 rounded-full object-cover" />
                  <span className="font-bold truncate">@{u.username}</span>
                  {u.verified && (
                    <span className="flex h-3 w-3 items-center justify-center rounded-full bg-blue-500 text-[8px] font-bold text-white">✓</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Poll Creator Form */}
        {showPollCreator && (
          <div className="rounded-2xl border border-pink-100 bg-pink-50/15 p-4.5 dark:border-pink-950/20 dark:bg-pink-950/5 space-y-3">
            <div className="flex items-center justify-between border-b border-pink-100/50 pb-2 dark:border-pink-950/20">
              <span className="text-xs font-bold text-pink-600 dark:text-pink-400 flex items-center gap-1.5">
                <BarChart2 className="h-4 w-4" /> Create a Poll
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowPollCreator(false);
                  setPollQuestion('');
                  setPollOptions(['', '']);
                }}
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-850 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2.5">
              <input
                type="text"
                placeholder="Ask a question..."
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
                className="w-full text-xs font-medium rounded-xl border border-zinc-200 dark:border-zinc-850 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-gray-900 dark:text-white placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition"
              />

              <div className="space-y-2">
                {pollOptions.map((option, idx) => (
                  <div key={idx} className="flex items-center space-x-2">
                    <input
                      type="text"
                      placeholder={`Option ${idx + 1}`}
                      value={option}
                      onChange={(e) => {
                        const newOpts = [...pollOptions];
                        newOpts[idx] = e.target.value;
                        setPollOptions(newOpts);
                      }}
                      className="flex-1 text-xs font-medium rounded-xl border border-zinc-200 dark:border-zinc-850 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-gray-900 dark:text-white placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition"
                    />
                    {pollOptions.length > 2 && (
                      <button
                        type="button"
                        onClick={() => {
                          setPollOptions(pollOptions.filter((_, i) => i !== idx));
                        }}
                        className="rounded-xl p-2.5 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-950/70 transition cursor-pointer"
                        title="Remove option"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {pollOptions.length < 6 && (
                <button
                  type="button"
                  onClick={() => setPollOptions([...pollOptions, ''])}
                  className="w-full rounded-xl border border-dashed border-pink-200 hover:border-pink-400 bg-white dark:bg-zinc-900/40 dark:border-zinc-800 dark:hover:border-zinc-700/80 py-2.5 text-center text-xs font-bold text-pink-600 dark:text-pink-400 hover:bg-pink-50/20 transition cursor-pointer"
                >
                  + Add Option
                </button>
              )}
            </div>
          </div>
        )}

        {/* Media Gallery Carousel Preview */}
        <MediaGallery
          items={mediaItems}
          setItems={setMediaItems}
          activeIndex={galleryActiveIndex}
          setActiveIndex={setGalleryActiveIndex}
        />

        {/* Progress bar for upload simulation */}
        {progress > 0 && (
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
            <div 
              className="h-full bg-indigo-600 transition-all duration-300" 
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* Connectify Metadata Tags Indicator Bar */}
        {allUsers.some(u => content.toLowerCase().includes(`@${u.username.toLowerCase()}`)) && (
          <div className="flex flex-wrap gap-1.5 items-center pt-2">
            <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase flex items-center gap-1">
              <AtSign className="h-3 w-3 text-indigo-500" /> Mentions:
            </span>
            {allUsers
              .filter(u => content.toLowerCase().includes(`@${u.username.toLowerCase()}`))
              .map(u => (
                <span 
                  key={u.id}
                  className="inline-flex items-center space-x-1 rounded-full bg-zinc-100 dark:bg-zinc-800 px-2.5 py-0.5 text-[10px] font-bold text-zinc-700 dark:text-zinc-300"
                >
                  <img src={u.avatar} alt={u.username} className="h-3.5 w-3.5 rounded-full object-cover" />
                  <span>@{u.username}</span>
                  <button 
                    type="button" 
                    onClick={() => togglePickerMention(u.username)}
                    className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 ml-1"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
          </div>
        )}

        {/* Post Scheduler panel */}
        {showScheduler && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/60 dark:border-indigo-900/40 text-xs animate-fade-in">
            <div className="flex items-center space-x-2 text-indigo-700 dark:text-indigo-300 font-semibold">
              <Clock className="h-4 w-4 text-indigo-500" />
              <span>Schedule Publication:</span>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="datetime-local"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                className="rounded-lg border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-zinc-900 px-2.5 py-1 text-xs text-gray-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              {scheduledDate && (
                <button
                  type="button"
                  onClick={() => setScheduledDate('')}
                  className="rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-950/70 p-1.5 transition"
                  title="Clear scheduling"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Responsive Control Actions Panel */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-gray-100 pt-3 dark:border-gray-800">
          
          {/* Media & Tag buttons - Mobile fluid layout */}
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Photo Upload */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center space-x-1 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-zinc-800/60 transition cursor-pointer"
              title="Upload Image"
            >
              <Image className="h-4 w-4 text-indigo-500" />
              <span>Photo</span>
            </button>
            <input
              type="file"
              accept="image/*"
              multiple
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Video Upload */}
            <button
              type="button"
              onClick={() => videoInputRef.current?.click()}
              className="flex items-center space-x-1 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-zinc-800/60 transition cursor-pointer"
              title="Upload Video"
            >
              <Film className="h-4 w-4 text-emerald-500" />
              <span>Video</span>
            </button>
            <input
              type="file"
              accept="video/*"
              multiple
              ref={videoInputRef}
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Connectify Tag People Companion Button */}
            <button
              type="button"
              onClick={() => setShowPersonPicker(!showPersonPicker)}
              className={`flex items-center space-x-1 rounded-xl px-2.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
                showPersonPicker 
                  ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400' 
                  : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-zinc-800/60'
              }`}
              title="Mention Friends"
            >
              <Users className="h-4 w-4 text-violet-500" />
              <span>Tag Friends</span>
            </button>

            {/* Post Scheduling Toggle Button */}
            <button
              type="button"
              onClick={() => {
                setShowScheduler(!showScheduler);
                if (!showScheduler && !scheduledDate) {
                  // Set a default of 1 hour from now
                  const defaultTime = new Date(Date.now() + 60 * 60 * 1000);
                  const tzOffset = defaultTime.getTimezoneOffset() * 60000;
                  const localISODate = new Date(defaultTime.getTime() - tzOffset).toISOString().slice(0, 16);
                  setScheduledDate(localISODate);
                }
              }}
              className={`flex items-center space-x-1 rounded-xl px-2.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
                showScheduler 
                  ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400' 
                  : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-zinc-800/60'
              }`}
              title="Schedule post publication"
            >
              <Clock className="h-4 w-4 text-amber-500" />
              <span>{scheduledDate ? 'Scheduled' : 'Schedule'}</span>
            </button>

            {/* Poll Creation Toggle Button */}
            <button
              type="button"
              onClick={() => {
                setShowPollCreator(!showPollCreator);
              }}
              className={`flex items-center space-x-1 rounded-xl px-2.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
                showPollCreator 
                  ? 'bg-pink-50 text-pink-600 dark:bg-pink-950/40 dark:text-pink-400' 
                  : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-zinc-800/60'
              }`}
              title="Add a Poll"
            >
              <BarChart2 className="h-4 w-4 text-pink-500" />
              <span>Poll</span>
            </button>
          </div>

          {/* AI prompt generator & Publish button */}
          <div className="flex items-center gap-2 justify-between sm:justify-end w-full sm:w-auto">
            {/* Gemini prompt search box */}
            <div className="relative flex items-center flex-1 sm:flex-initial">
              <input
                type="text"
                placeholder="AI post idea prompt..."
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value)}
                className="w-full sm:w-48 md:w-56 rounded-xl border border-gray-100 bg-gray-50 px-3 py-1.5 text-xs text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-gray-800 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
              />
              <button
                type="button"
                onClick={handleGenerateAiDraft}
                disabled={aiGenerating}
                className="absolute right-1 top-1/2 -translate-y-1/2 rounded-lg bg-indigo-50 p-1 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-400 dark:hover:bg-indigo-950/75 transition cursor-pointer"
                title="Generate AI Draft"
              >
                <Sparkles className={`h-3.5 w-3.5 ${aiGenerating ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Publish Submit Button */}
            <button
              type="submit"
              disabled={loading || (!content.trim() && mediaItems.length === 0 && (!showPollCreator || !pollQuestion.trim()))}
              className="flex items-center space-x-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-100 dark:disabled:bg-zinc-800 disabled:text-gray-400 dark:disabled:text-zinc-500 px-4.5 py-2 text-xs font-bold text-white shadow-xs transition shrink-0 cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" />
              <span>{loading ? 'Posting...' : 'Post'}</span>
            </button>
          </div>
        </div>
      </form>

      {/* Connectify Companion Tag/Mention Drawer Modal */}
      {showPersonPicker && (
        <div className="absolute left-0 right-0 top-full z-40 mt-3 p-4 rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-1.5">
              <AtSign className="h-4 w-4 text-indigo-500" />
              <h4 className="text-xs font-bold text-gray-900 dark:text-white">Connectify Mention Picker</h4>
            </div>
            <button 
              type="button" 
              onClick={() => setShowPersonPicker(false)}
              className="rounded-full p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <p className="text-[10px] text-gray-400 dark:text-zinc-500 mb-3">
            Tap on profiles to instantly mention them inside your draft content. Real notifications will be dispatched to their inbox!
          </p>

          {/* Picker Search */}
          <div className="relative mb-3.5">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search user profiles..."
              value={pickerSearch}
              onChange={(e) => setPickerSearch(e.target.value)}
              className="w-full rounded-xl border border-gray-100 bg-gray-50 py-1.5 pl-8.5 pr-4 text-xs focus:bg-white dark:border-gray-800 dark:bg-gray-900 dark:text-white"
            />
          </div>

          {/* User selection list */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
            {filteredPickerUsers.length === 0 ? (
              <p className="col-span-full text-center py-4 text-xs text-gray-400">No active users found.</p>
            ) : (
              filteredPickerUsers.map((u) => {
                const isTagged = content.toLowerCase().includes(`@${u.username.toLowerCase()}`);
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => togglePickerMention(u.username)}
                    className={`flex items-center justify-between space-x-2 rounded-xl p-2 border text-left transition ${
                      isTagged
                        ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20 dark:border-indigo-500'
                        : 'border-zinc-100 bg-zinc-50/50 hover:bg-zinc-100/50 dark:border-zinc-800 dark:bg-zinc-900/40 dark:hover:bg-zinc-800/80'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5 overflow-hidden">
                      <img src={u.avatar} alt={u.username} className="h-6 w-6 rounded-full object-cover shrink-0" />
                      <span className="text-[10px] font-bold text-gray-800 dark:text-zinc-200 truncate">@{u.username}</span>
                    </div>
                    {isTagged && (
                      <Check className="h-3 w-3 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
