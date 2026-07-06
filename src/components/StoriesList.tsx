import React, { useRef, useState } from 'react';
import { User, Story } from '../types';
import { Plus, Camera, Image, X, Type, Palette } from 'lucide-react';

interface StoriesListProps {
  currentUser: User;
  stories: Story[];
  onStoryClick: (index: number) => void;
  onStoryCreated: (newStory: Story) => void;
}

export default function StoriesList({
  currentUser,
  stories,
  onStoryClick,
  onStoryCreated,
}: StoriesListProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [previewStory, setPreviewStory] = useState<string | null>(null);
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTextStoryCreator, setShowTextStoryCreator] = useState(false);
  const [storyText, setStoryText] = useState('');
  const [selectedGradient, setSelectedGradient] = useState('cosmic');
  const [selectedFont, setSelectedFont] = useState('sans');

  // Group stories by user so that user stories are consolidated
  const uniqueUserStories: { [key: string]: Story } = {};
  stories.forEach((story) => {
    // Keep the first story of each user as the thumbnail/entry point
    if (!uniqueUserStories[story.userId]) {
      uniqueUserStories[story.userId] = story;
    }
  });

  const uniqueStoriesList = Object.values(uniqueUserStories);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewStory(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const generateCanvasDataUrl = (text: string, gradient: string, font: string) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    if (gradient === 'sunset') {
      grad.addColorStop(0, '#f43f5e'); // rose-500
      grad.addColorStop(1, '#fb923c'); // orange-400
    } else if (gradient === 'oceanic') {
      grad.addColorStop(0, '#06b6d4'); // cyan-500
      grad.addColorStop(1, '#3b82f6'); // blue-500
    } else if (gradient === 'cosmic') {
      grad.addColorStop(0, '#6366f1'); // indigo-500
      grad.addColorStop(1, '#a855f7'); // purple-500
    } else if (gradient === 'emerald') {
      grad.addColorStop(0, '#10b981'); // emerald-500
      grad.addColorStop(1, '#14b8a6'); // teal-500
    } else if (gradient === 'midnight') {
      grad.addColorStop(0, '#1e293b'); // slate-800
      grad.addColorStop(1, '#0f172a'); // slate-900
    } else {
      grad.addColorStop(0, '#ec4899');
      grad.addColorStop(1, '#8b5cf6');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    let fontStyle = 'Inter, sans-serif';
    if (font === 'serif') fontStyle = 'Playfair Display, Georgia, serif';
    else if (font === 'mono') fontStyle = 'JetBrains Mono, monospace';

    ctx.font = `bold 64px ${fontStyle}`;

    const words = text.split(' ');
    const lines = [];
    let currentLine = '';
    const maxWidth = 900;

    for (let n = 0; n < words.length; n++) {
      const testLine = currentLine + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        lines.push(currentLine);
        currentLine = words[n] + ' ';
      } else {
        currentLine = testLine;
      }
    }
    lines.push(currentLine);

    const lineHeight = 95;
    const totalHeight = lines.length * lineHeight;
    let startY = (canvas.height - totalHeight) / 2;

    lines.forEach((line) => {
      ctx.fillText(line.trim(), canvas.width / 2, startY);
      startY += lineHeight;
    });

    return canvas.toDataURL('image/jpeg', 0.95);
  };

  const handleCreateTextStory = async () => {
    if (!storyText.trim()) return;
    setUploading(true);

    try {
      const dataUrl = generateCanvasDataUrl(storyText, selectedGradient, selectedFont);
      if (!dataUrl) throw new Error('Failed to generate story image');

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileData: dataUrl,
          fileName: 'story_text.jpg',
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

      const newStory = await storyRes.json();
      if (!storyRes.ok) throw new Error(newStory.error || 'Failed to create story');

      onStoryCreated(newStory);
      setStoryText('');
      setShowTextStoryCreator(false);
    } catch (err) {
      console.error('Error creating text story:', err);
      alert('Failed to share text story. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const submitStory = async () => {
    if (!previewStory) return;
    setUploading(true);

    try {
      // 1. Upload mock file to return dataURL
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileData: previewStory,
          fileName: 'story.jpg',
          fileType: 'image/jpeg',
        }),
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error || 'Upload failed');

      // 2. Create Story record
      const storyRes = await fetch('/api/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          image: uploadData.fileUrl,
        }),
      });

      const newStory = await storyRes.json();
      if (!storyRes.ok) throw new Error(newStory.error || 'Failed to create story');

      onStoryCreated(newStory);
      setPreviewStory(null);
    } catch (err) {
      console.error('Error creating story:', err);
      alert('Failed to upload story. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex space-x-4 overflow-x-auto pb-2 scrollbar-none">
      {/* Create Story Button */}
      <div className="flex flex-col items-center shrink-0">
        <button
          onClick={() => setShowCreateModal(true)}
          className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition border border-gray-200 dark:border-gray-700 group cursor-pointer"
        >
          <img
            src={currentUser.avatar}
            alt="My Avatar"
            className="h-14 w-14 rounded-full object-cover group-hover:opacity-75 transition"
          />
          <div className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white border-2 border-white dark:border-gray-900 shadow-md">
            <Plus className="h-3 w-3" />
          </div>
        </button>
        <span className="mt-1.5 text-[11px] font-semibold text-gray-500 dark:text-gray-400">Add Story</span>
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Story Bubbles */}
      {uniqueStoriesList.map((story, index) => {
        const isSelf = story.userId === currentUser.id;
        return (
          <div
            key={story.id}
            onClick={() => onStoryClick(index)}
            className="flex flex-col items-center shrink-0 cursor-pointer group"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-transparent bg-gradient-to-tr from-amber-500 via-pink-600 to-indigo-600 p-[2px] transition-all group-hover:scale-105 active:scale-95">
              <div className="h-full w-full rounded-full border-2 border-white bg-white p-[1px] dark:border-gray-950 dark:bg-gray-950">
                <img
                  src={story.userAvatar}
                  alt={story.username}
                  className="h-full w-full rounded-full object-cover"
                />
              </div>
            </div>
            <span className="mt-1.5 max-w-[70px] truncate text-[11px] font-semibold text-gray-700 dark:text-gray-300">
              {isSelf ? 'Your Story' : story.username}
            </span>
          </div>
        );
      })}

      {/* Choose Story Type Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute right-4 top-4 rounded-full p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800"
            >
              <X className="h-4.5 w-4.5" />
            </button>
            <h3 className="mb-4 text-base font-bold text-gray-900 dark:text-white">Create Story</h3>
            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  fileInputRef.current?.click();
                }}
                className="flex w-full items-center space-x-3.5 rounded-xl border border-gray-100 p-3.5 text-left hover:bg-gray-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50 transition cursor-pointer"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 shrink-0">
                  <Image className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-900 dark:text-white">Photo Story</h4>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">Upload a photo from your device</p>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setShowTextStoryCreator(true);
                }}
                className="flex w-full items-center space-x-3.5 rounded-xl border border-gray-100 p-3.5 text-left hover:bg-gray-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50 transition cursor-pointer"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 shrink-0">
                  <Type className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-900 dark:text-white">Text Story</h4>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">Write thoughts over colorful gradients</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Text Story Creator Fullscreen Modal */}
      {showTextStoryCreator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/95 backdrop-blur-md p-4 overflow-y-auto">
          <div className="flex w-full max-w-4xl flex-col md:flex-row gap-6 bg-white dark:bg-zinc-900 rounded-2xl p-5 shadow-2xl border border-gray-100 dark:border-zinc-800 max-h-[95vh]">
            {/* Live Preview Column */}
            <div className="flex-1 flex flex-col items-center">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Live Preview</span>
              <div
                className={`relative w-full max-w-[270px] aspect-[9/16] rounded-xl overflow-hidden shadow-lg flex flex-col justify-between p-4 ${
                  selectedGradient === 'sunset'
                    ? 'bg-gradient-to-tr from-rose-500 to-orange-400'
                    : selectedGradient === 'oceanic'
                    ? 'bg-gradient-to-tr from-cyan-500 to-blue-500'
                    : selectedGradient === 'emerald'
                    ? 'bg-gradient-to-tr from-emerald-500 to-teal-500'
                    : selectedGradient === 'midnight'
                    ? 'bg-gradient-to-tr from-slate-800 to-slate-950'
                    : 'bg-gradient-to-tr from-indigo-500 to-purple-500'
                }`}
              >
                {/* Header preview */}
                <div className="flex items-center space-x-2">
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.username}
                    className="h-7 w-7 rounded-full object-cover border border-white/20"
                  />
                  <div>
                    <h5 className="text-[10px] font-bold text-white">{currentUser.username}</h5>
                    <span className="text-[8px] text-white/70">Just now</span>
                  </div>
                </div>

                {/* Text centered */}
                <div className="flex-1 flex items-center justify-center p-2 text-center text-white break-words select-none">
                  <p
                    className={`text-sm font-bold leading-relaxed max-w-full truncate-lines-10 ${
                      selectedFont === 'serif' ? 'font-serif' : selectedFont === 'mono' ? 'font-mono' : 'font-sans'
                    }`}
                  >
                    {storyText || 'Type something...'}
                  </p>
                </div>

                {/* Bottom decorative preview */}
                <div className="text-center text-[8px] text-white/40">Story System Sharing</div>
              </div>
            </div>

            {/* Editing Controls Column */}
            <div className="w-full md:w-[360px] flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-zinc-800 pb-3 mb-4">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center space-x-1.5">
                    <Type className="h-4 w-4 text-indigo-500" />
                    <span>Create Text Story</span>
                  </h3>
                  <button
                    onClick={() => {
                      setShowTextStoryCreator(false);
                      setStoryText('');
                    }}
                    className="rounded-full p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Content text */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">What's on your mind?</label>
                  <textarea
                    rows={4}
                    maxLength={150}
                    value={storyText}
                    onChange={(e) => setStoryText(e.target.value)}
                    placeholder="Type your story message here (max 150 chars)..."
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs outline-none focus:border-indigo-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-800/40 dark:text-white dark:focus:border-indigo-500 dark:focus:bg-zinc-900 resize-none"
                  />
                  <div className="text-right text-[10px] text-gray-400">
                    {storyText.length}/150
                  </div>
                </div>

                {/* Gradient Background circles */}
                <div className="space-y-2 mt-4">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Background Theme</label>
                  <div className="flex items-center space-x-2">
                    {[
                      { id: 'cosmic', style: 'bg-gradient-to-tr from-indigo-500 to-purple-500', name: 'Cosmic' },
                      { id: 'sunset', style: 'bg-gradient-to-tr from-rose-500 to-orange-400', name: 'Sunset' },
                      { id: 'oceanic', style: 'bg-gradient-to-tr from-cyan-500 to-blue-500', name: 'Oceanic' },
                      { id: 'emerald', style: 'bg-gradient-to-tr from-emerald-500 to-teal-500', name: 'Emerald' },
                      { id: 'midnight', style: 'bg-gradient-to-tr from-slate-800 to-slate-950', name: 'Midnight' },
                    ].map((grad) => (
                      <button
                        key={grad.id}
                        onClick={() => setSelectedGradient(grad.id)}
                        title={grad.name}
                        className={`h-7 w-7 rounded-full ${grad.style} transition border-2 cursor-pointer shrink-0 ${
                          selectedGradient === grad.id ? 'border-indigo-500 scale-110 shadow-md' : 'border-transparent'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Font Choices */}
                <div className="space-y-2 mt-4">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Font Style</label>
                  <div className="flex bg-gray-50 dark:bg-zinc-800/50 p-1 rounded-xl border border-gray-100 dark:border-zinc-800">
                    {[
                      { id: 'sans', label: 'Sans', fontClass: 'font-sans' },
                      { id: 'serif', label: 'Serif', fontClass: 'font-serif' },
                      { id: 'mono', label: 'Mono', fontClass: 'font-mono' },
                    ].map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setSelectedFont(f.id)}
                        className={`flex-1 text-center py-1.5 rounded-lg text-xs font-semibold transition ${
                          selectedFont === f.id
                            ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                            : 'text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white'
                        }`}
                      >
                        <span className={f.fontClass}>{f.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Share actions */}
              <div className="flex items-center space-x-2 pt-3 border-t border-gray-100 dark:border-zinc-800">
                <button
                  onClick={() => {
                    setShowTextStoryCreator(false);
                    setStoryText('');
                  }}
                  className="flex-1 rounded-xl border border-gray-200 dark:border-zinc-800 py-2.5 text-xs font-semibold text-gray-500 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateTextStory}
                  disabled={uploading || !storyText.trim()}
                  className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition"
                >
                  {uploading ? 'Sharing...' : 'Share to Story'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Story Modal overlay */}
      {previewStory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
          <div className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 p-4 dark:border-gray-800">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center space-x-2">
                <Camera className="h-4 w-4 text-blue-500" />
                <span>Story Preview</span>
              </h3>
              <button
                onClick={() => setPreviewStory(null)}
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Content Preview */}
            <div className="relative aspect-[9/16] bg-gray-950">
              <img
                src={previewStory}
                alt="Story draft preview"
                className="h-full w-full object-contain"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-2 border-t border-gray-100 p-4 dark:border-gray-800">
              <button
                onClick={() => setPreviewStory(null)}
                className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={submitStory}
                disabled={uploading}
                className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                {uploading ? 'Sharing...' : 'Share to Story'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
