import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Sparkles, 
  Type, 
  Sliders, 
  Undo2, 
  Check, 
  Plus, 
  Trash2, 
  ChevronRight, 
  Move,
  AlignCenter,
  AlignLeft,
  AlignRight
} from 'lucide-react';

interface TextOverlay {
  id: string;
  text: string;
  x: number; // percentage (0-100)
  y: number; // percentage (0-100)
  fontSize: number; // in pixels (for typical 400px wide preview)
  color: string;
  bgColor: string; // 'none', 'dark', 'light', 'solid'
  font: 'sans' | 'serif' | 'mono' | 'cursive';
  align: 'left' | 'center' | 'right';
}

interface ImageEditorModalProps {
  imageSrc: string;
  onSave: (editedDataUrl: string) => void;
  onClose: () => void;
  title?: string;
}

const FILTER_PRESETS = [
  { id: 'normal', name: 'Original', filterStr: 'none', brightness: 100, contrast: 100, saturation: 100 },
  { id: 'vintage', name: 'Vintage', filterStr: 'sepia(45%) contrast(105%) saturate(85%)', brightness: 95, contrast: 105, saturation: 85 },
  { id: 'noir', name: 'Noir', filterStr: 'grayscale(100%) contrast(125%)', brightness: 100, contrast: 125, saturation: 0 },
  { id: 'warm', name: 'Warm', filterStr: 'sepia(25%) saturate(120%) brightness(102%)', brightness: 102, contrast: 100, saturation: 120 },
  { id: 'cool', name: 'Cool', filterStr: 'saturate(110%) hue-rotate(15deg) brightness(98%)', brightness: 98, contrast: 100, saturation: 110 },
  { id: 'cyberpunk', name: 'Cyberpunk', filterStr: 'saturate(180%) contrast(130%) hue-rotate(-20deg)', brightness: 105, contrast: 130, saturation: 180 },
  { id: 'drama', name: 'Drama', filterStr: 'contrast(140%) saturate(75%) brightness(92%)', brightness: 92, contrast: 140, saturation: 75 },
];

const COLORS = [
  { value: '#ffffff', name: 'White' },
  { value: '#000000', name: 'Black' },
  { value: '#6366f1', name: 'Indigo' },
  { value: '#ec4899', name: 'Rose' },
  { value: '#eab308', name: 'Gold' },
  { value: '#10b981', name: 'Emerald' },
  { value: '#06b6d4', name: 'Cyan' },
];

export default function ImageEditorModal({
  imageSrc,
  onSave,
  onClose,
  title = 'Edit Photo',
}: ImageEditorModalProps) {
  const [activeTab, setActiveTab] = useState<'filters' | 'adjust' | 'text'>('filters');
  
  // Adjustment States
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [selectedFilter, setSelectedFilter] = useState('normal');

  // Text Overlays States
  const [overlays, setOverlays] = useState<TextOverlay[]>([]);
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);
  
  const [isRendering, setIsRendering] = useState(false);

  // Preview container ref for drag calculations
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const activeDragRef = useRef<{ id: string; startX: number; startY: number; startPosX: number; startPosY: number } | null>(null);

  // Apply quick filter preset
  const applyPreset = (preset: typeof FILTER_PRESETS[0]) => {
    setSelectedFilter(preset.id);
    setBrightness(preset.brightness);
    setContrast(preset.contrast);
    setSaturation(preset.saturation);
  };

  // Reset adjustments
  const resetAll = () => {
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setSelectedFilter('normal');
    setOverlays([]);
    setSelectedOverlayId(null);
  };

  // Add new text sticker
  const addTextOverlay = () => {
    const newOverlay: TextOverlay = {
      id: 'txt-' + Math.random().toString(36).substring(2, 9),
      text: 'Double tap to edit',
      x: 50,
      y: 40,
      fontSize: 24,
      color: '#ffffff',
      bgColor: 'dark',
      font: 'sans',
      align: 'center',
    };
    setOverlays((prev) => [...prev, newOverlay]);
    setSelectedOverlayId(newOverlay.id);
  };

  // Update specific overlay property
  const updateOverlay = (id: string, updates: Partial<TextOverlay>) => {
    setOverlays((prev) =>
      prev.map((o) => (o.id === id ? { ...o, ...updates } : o))
    );
  };

  // Delete specific overlay
  const deleteOverlay = (id: string) => {
    setOverlays((prev) => prev.filter((o) => o.id !== id));
    if (selectedOverlayId === id) setSelectedOverlayId(null);
  };

  // Drag overlay handling
  const handleOverlayMouseDown = (e: React.MouseEvent, overlay: TextOverlay) => {
    e.preventDefault();
    setSelectedOverlayId(overlay.id);

    if (!previewContainerRef.current) return;
    const rect = previewContainerRef.current.getBoundingClientRect();

    activeDragRef.current = {
      id: overlay.id,
      startX: e.clientX,
      startY: e.clientY,
      startPosX: (overlay.x / 100) * rect.width,
      startPosY: (overlay.y / 100) * rect.height,
    };

    document.addEventListener('mousemove', handleOverlayMouseMove);
    document.addEventListener('mouseup', handleOverlayMouseUp);
  };

  const handleOverlayMouseMove = (e: MouseEvent) => {
    if (!activeDragRef.current || !previewContainerRef.current) return;
    const drag = activeDragRef.current;
    const rect = previewContainerRef.current.getBoundingClientRect();

    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;

    let newX = drag.startPosX + dx;
    let newY = drag.startPosY + dy;

    // Convert back to percentages and constrain
    let xPct = Math.min(Math.max((newX / rect.width) * 100, 5), 95);
    let yPct = Math.min(Math.max((newY / rect.height) * 100, 5), 95);

    updateOverlay(drag.id, { x: xPct, y: yPct });
  };

  const handleOverlayMouseUp = () => {
    activeDragRef.current = null;
    document.removeEventListener('mousemove', handleOverlayMouseMove);
    document.removeEventListener('mouseup', handleOverlayMouseUp);
  };

  // Touch support for drag and drop
  const handleOverlayTouchStart = (e: React.TouchEvent, overlay: TextOverlay) => {
    setSelectedOverlayId(overlay.id);

    if (!previewContainerRef.current) return;
    const rect = previewContainerRef.current.getBoundingClientRect();
    const touch = e.touches[0];

    activeDragRef.current = {
      id: overlay.id,
      startX: touch.clientX,
      startY: touch.clientY,
      startPosX: (overlay.x / 100) * rect.width,
      startPosY: (overlay.y / 100) * rect.height,
    };

    document.addEventListener('touchmove', handleOverlayTouchMove, { passive: false });
    document.addEventListener('touchend', handleOverlayTouchEnd);
  };

  const handleOverlayTouchMove = (e: TouchEvent) => {
    if (!activeDragRef.current || !previewContainerRef.current) return;
    e.preventDefault(); // Prevent scrolling while dragging

    const drag = activeDragRef.current;
    const rect = previewContainerRef.current.getBoundingClientRect();
    const touch = e.touches[0];

    const dx = touch.clientX - drag.startX;
    const dy = touch.clientY - drag.startY;

    let newX = drag.startPosX + dx;
    let newY = drag.startPosY + dy;

    let xPct = Math.min(Math.max((newX / rect.width) * 100, 5), 95);
    let yPct = Math.min(Math.max((newY / rect.height) * 100, 5), 95);

    updateOverlay(drag.id, { x: xPct, y: yPct });
  };

  const handleOverlayTouchEnd = () => {
    activeDragRef.current = null;
    document.removeEventListener('touchmove', handleOverlayTouchMove);
    document.removeEventListener('touchend', handleOverlayTouchEnd);
  };

  // Generate Filter String
  const getFilterCSS = () => {
    let basePreset = FILTER_PRESETS.find((p) => p.id === selectedFilter);
    let filterStr = '';
    
    if (basePreset && basePreset.filterStr !== 'none') {
      filterStr += basePreset.filterStr + ' ';
    }

    // Add manual slider overrides (scaled relative to 100%)
    filterStr += `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
    return filterStr;
  };

  // Bake image on canvas
  const handleSave = () => {
    setIsRendering(true);
    
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageSrc;

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 1080;
        canvas.height = img.naturalHeight || 1920;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Could not get 2D context');
        }

        // 1. Apply CSS filters
        const finalFilterStr = getFilterCSS();
        ctx.filter = finalFilterStr;

        // 2. Draw base image
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Reset filter so text overlays are not filtered
        ctx.filter = 'none';

        // 3. Draw text overlays
        overlays.forEach((ov) => {
          // Calculate absolute coordinates
          const x = (ov.x / 100) * canvas.width;
          const y = (ov.y / 100) * canvas.height;

          // Scale font size according to image dimensions relative to 400px preview width
          const scaledFontSize = Math.round(ov.fontSize * (canvas.width / 400));
          
          let fontStyle = 'Inter, sans-serif';
          if (ov.font === 'serif') fontStyle = 'Playfair Display, Georgia, serif';
          else if (ov.font === 'mono') fontStyle = 'JetBrains Mono, Courier New, monospace';
          else if (ov.font === 'cursive') fontStyle = 'Pacifico, cursive, sans-serif';

          ctx.font = `bold ${scaledFontSize}px ${fontStyle}`;
          ctx.textAlign = ov.align;
          ctx.textBaseline = 'middle';

          // Word wrap calculation
          const maxWidth = canvas.width * 0.85;
          const words = ov.text.split(' ');
          const lines = [];
          let currentLine = '';

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
          lines.push(currentLine.trim());

          const lineHeight = scaledFontSize * 1.25;
          const totalHeight = lines.length * lineHeight;
          let startY = y - totalHeight / 2 + lineHeight / 2;

          // Draw background pill/box if set
          if (ov.bgColor !== 'none') {
            lines.forEach((line, index) => {
              const textMetrics = ctx.measureText(line);
              const textWidth = textMetrics.width;
              const boxHeight = lineHeight * 1.1;
              const boxWidth = textWidth + scaledFontSize * 0.8;
              const lineY = startY + index * lineHeight;

              let pillX = x;
              if (ov.align === 'center') pillX = x - boxWidth / 2;
              else if (ov.align === 'right') pillX = x - boxWidth;

              ctx.fillStyle = ov.bgColor === 'dark' 
                ? 'rgba(0, 0, 0, 0.65)' 
                : ov.bgColor === 'light' 
                ? 'rgba(255, 255, 255, 0.85)' 
                : ov.color === '#ffffff' ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.8)';
              
              // Draw rounded rect
              ctx.beginPath();
              ctx.roundRect(pillX, lineY - boxHeight / 2, boxWidth, boxHeight, scaledFontSize * 0.3);
              ctx.fill();
            });
          }

          // Draw the text lines
          ctx.fillStyle = ov.color;
          lines.forEach((line, index) => {
            ctx.fillText(line, x, startY + index * lineHeight);
          });
        });

        // Generate data URL
        const editedDataUrl = canvas.toDataURL('image/jpeg', 0.95);
        onSave(editedDataUrl);
      } catch (err) {
        console.error('Error drawing image edits to canvas:', err);
        // Fallback to original image if anything crashes
        onSave(imageSrc);
      } finally {
        setIsRendering(false);
      }
    };

    img.onerror = () => {
      console.error('Failed to load image in editor canvas');
      onSave(imageSrc);
      setIsRendering(false);
    };
  };

  // Click outside to deselect active overlay
  const handleContainerClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setSelectedOverlayId(null);
    }
  };

  const selectedOverlay = overlays.find((o) => o.id === selectedOverlayId);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 overflow-y-auto">
      <div className="flex w-full max-w-5xl flex-col lg:flex-row gap-6 bg-zinc-950 text-white rounded-3xl p-5 shadow-2xl border border-zinc-800 max-h-[95vh] overflow-hidden">
        
        {/* Left Column: Visual Sandbox Editor Canvas */}
        <div className="flex-1 flex flex-col items-center justify-center relative min-h-[300px] lg:min-h-[500px] bg-zinc-900/40 rounded-2xl p-4 border border-zinc-900 select-none">
          
          <div className="absolute top-4 left-4 z-10 flex items-center space-x-2">
            <span className="bg-indigo-600/90 text-white font-extrabold text-[9px] tracking-wider uppercase px-2.5 py-1 rounded-full backdrop-blur-md">
              Visual Editor Mode
            </span>
            {overlays.length > 0 && (
              <span className="bg-zinc-800 text-zinc-400 text-[9px] font-semibold px-2.5 py-1 rounded-full">
                Drag labels to adjust positions
              </span>
            )}
          </div>

          <div className="absolute top-4 right-4 z-10">
            <button
              onClick={resetAll}
              className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold cursor-pointer transition border border-zinc-700/50"
              title="Reset all filters and overlays"
            >
              <Undo2 className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>
          </div>

          {/* Core Interactive Preview Frame */}
          <div 
            ref={previewContainerRef}
            onClick={handleContainerClick}
            className="relative w-full max-w-[320px] sm:max-w-[340px] aspect-[9/16] bg-black rounded-2xl overflow-hidden shadow-2xl border border-zinc-800 flex items-center justify-center"
          >
            {/* Base Preview Image with CSS Filters applied */}
            <img
              src={imageSrc}
              alt="Preview editing sandbox"
              className="h-full w-full object-contain pointer-events-none select-none transition-all duration-75"
              style={{ filter: getFilterCSS() }}
            />

            {/* Overlays Canvas layer */}
            <div className="absolute inset-0 pointer-events-auto">
              {overlays.map((ov) => {
                const isSelected = ov.id === selectedOverlayId;
                
                let fontClass = 'font-sans';
                if (ov.font === 'serif') fontClass = 'font-serif';
                else if (ov.font === 'mono') fontClass = 'font-mono';
                else if (ov.font === 'cursive') fontClass = 'font-cursive font-bold';

                let alignClass = 'text-center';
                if (ov.align === 'left') alignClass = 'text-left';
                else if (ov.align === 'right') alignClass = 'text-right';

                return (
                  <div
                    key={ov.id}
                    onMouseDown={(e) => handleOverlayMouseDown(e, ov)}
                    onTouchStart={(e) => handleOverlayTouchStart(e, ov)}
                    style={{
                      left: `${ov.x}%`,
                      top: `${ov.y}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                    className={`absolute p-2 cursor-grab active:cursor-grabbing max-w-[85%] rounded-lg transition-shadow select-none group ${
                      isSelected 
                        ? 'ring-2 ring-indigo-500 shadow-lg bg-indigo-500/10 z-30' 
                        : 'hover:ring-1 hover:ring-zinc-500 z-20'
                    }`}
                  >
                    {/* Background pills */}
                    <div 
                      className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${fontClass} ${alignClass} break-words`}
                      style={{
                        fontSize: `${ov.fontSize}px`,
                        color: ov.color,
                        backgroundColor: ov.bgColor === 'dark' 
                          ? 'rgba(0, 0, 0, 0.7)' 
                          : ov.bgColor === 'light' 
                          ? 'rgba(255, 255, 255, 0.85)'
                          : 'transparent',
                      }}
                    >
                      {ov.text}
                    </div>

                    {/* Draggable indicator & Delete handle */}
                    {isSelected && (
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 flex items-center space-x-1.5 bg-indigo-600 px-2 py-0.5 rounded-full text-[9px] font-bold shadow-md z-40">
                        <Move className="h-2.5 w-2.5 text-white" />
                        <span>Move</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Editing Suite Controls */}
        <div className="w-full lg:w-[380px] flex flex-col justify-between overflow-y-auto max-h-[45vh] lg:max-h-full pr-1">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4 shrink-0">
              <h3 className="text-base font-extrabold text-white flex items-center space-x-2">
                <Sparkles className="h-5 w-5 text-indigo-400 animate-pulse" />
                <span>{title}</span>
              </h3>
              <button
                onClick={onClose}
                className="rounded-full p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Main Tabs */}
            <div className="flex bg-zinc-900/60 p-1.5 rounded-2xl border border-zinc-800 mb-5 shrink-0">
              <button
                onClick={() => setActiveTab('filters')}
                className={`flex-1 flex items-center justify-center space-x-1.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeTab === 'filters'
                    ? 'bg-zinc-800 text-white shadow-md border-t border-zinc-700/30'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                <span>Filters</span>
              </button>
              <button
                onClick={() => setActiveTab('adjust')}
                className={`flex-1 flex items-center justify-center space-x-1.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeTab === 'adjust'
                    ? 'bg-zinc-800 text-white shadow-md border-t border-zinc-700/30'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Sliders className="h-3.5 w-3.5 text-emerald-400" />
                <span>Adjust</span>
              </button>
              <button
                onClick={() => setActiveTab('text')}
                className={`flex-1 flex items-center justify-center space-x-1.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeTab === 'text'
                    ? 'bg-zinc-800 text-white shadow-md border-t border-zinc-700/30'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Type className="h-3.5 w-3.5 text-amber-400" />
                <span>Typography</span>
              </button>
            </div>

            {/* Tab Contents */}
            <div className="flex-1 space-y-5 overflow-y-auto min-h-[180px]">
              {/* FILTERS TAB */}
              {activeTab === 'filters' && (
                <div className="space-y-4 animate-fade-in">
                  <span className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest block">Preset Filters</span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {FILTER_PRESETS.map((preset) => {
                      const isActive = selectedFilter === preset.id;
                      return (
                        <button
                          key={preset.id}
                          onClick={() => applyPreset(preset)}
                          className={`flex flex-col items-center p-2 rounded-xl border transition-all text-center cursor-pointer ${
                            isActive
                              ? 'bg-indigo-600/25 border-indigo-500 text-white shadow-md scale-102 font-bold'
                              : 'bg-zinc-900/40 border-zinc-800 hover:bg-zinc-900/80 text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          {/* Mini Thumbnail Visualizing Filter */}
                          <div className="relative h-14 w-full rounded-lg overflow-hidden bg-zinc-950 mb-1.5">
                            <img
                              src={imageSrc}
                              alt=""
                              className="h-full w-full object-cover"
                              style={{
                                filter: preset.filterStr !== 'none' 
                                  ? `${preset.filterStr} brightness(${preset.brightness}%) contrast(${preset.contrast}%)`
                                  : 'none'
                              }}
                            />
                            {isActive && (
                              <div className="absolute inset-0 bg-indigo-600/30 flex items-center justify-center">
                                <Check className="h-4 w-4 text-white font-extrabold drop-shadow" />
                              </div>
                            )}
                          </div>
                          <span className="text-[10px] truncate max-w-full leading-tight">{preset.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ADJUST TAB */}
              {activeTab === 'adjust' && (
                <div className="space-y-5.5 animate-fade-in">
                  {/* Brightness slider */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-zinc-400 font-bold">
                      <span>Brightness</span>
                      <span className="font-mono text-zinc-300">{brightness}%</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="150"
                      value={brightness}
                      onChange={(e) => setBrightness(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>

                  {/* Contrast slider */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-zinc-400 font-bold">
                      <span>Contrast</span>
                      <span className="font-mono text-zinc-300">{contrast}%</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="150"
                      value={contrast}
                      onChange={(e) => setContrast(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>

                  {/* Saturation slider */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-zinc-400 font-bold">
                      <span>Saturation</span>
                      <span className="font-mono text-zinc-300">{saturation}%</span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="200"
                      value={saturation}
                      onChange={(e) => setSaturation(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>

                  <p className="text-[10px] text-zinc-500 leading-normal">
                    Adjust brightness, contrast, and saturation levels precisely to modify the original artwork's colors, shadow depth, and vibrance.
                  </p>
                </div>
              )}

              {/* TYPOGRAPHY TAB */}
              {activeTab === 'text' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest block">Text Stickers ({overlays.length})</span>
                    <button
                      onClick={addTextOverlay}
                      className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-extrabold transition cursor-pointer shadow-md"
                    >
                      <Plus className="h-3 w-3" />
                      <span>Add Text Label</span>
                    </button>
                  </div>

                  {overlays.length === 0 ? (
                    <div className="text-center py-6 border border-dashed border-zinc-850 bg-zinc-900/20 rounded-2xl p-4">
                      <p className="text-xs text-zinc-500 leading-normal mb-1">No custom typography stickers added yet.</p>
                      <p className="text-[10px] text-zinc-600 leading-normal">Click "+ Add Text Label" above to add stylish caption labels and drag them anywhere on the image!</p>
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      {/* Active Label Settings Editor */}
                      {selectedOverlay ? (
                        <div className="bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800 space-y-4 animate-scale-in">
                          <div className="flex items-center justify-between border-b border-zinc-800/60 pb-2.5">
                            <span className="text-[11px] font-bold text-indigo-400">Editing Sticker</span>
                            <button
                              onClick={() => deleteOverlay(selectedOverlay.id)}
                              className="text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 p-1.5 rounded-lg transition"
                              title="Delete sticker"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          {/* Text input */}
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-zinc-500 uppercase">Label Text</label>
                            <input
                              type="text"
                              value={selectedOverlay.text}
                              onChange={(e) => updateOverlay(selectedOverlay.id, { text: e.target.value })}
                              placeholder="Write caption here..."
                              className="w-full text-xs font-semibold rounded-xl bg-zinc-950 border border-zinc-850 px-3.5 py-2.5 outline-none focus:border-indigo-500 text-white"
                            />
                          </div>

                          {/* Font choices */}
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-bold text-zinc-500 uppercase block">Font Family</label>
                            <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-850">
                              {[
                                { id: 'sans', label: 'Sans', fontClass: 'font-sans' },
                                { id: 'serif', label: 'Serif', fontClass: 'font-serif' },
                                { id: 'mono', label: 'Mono', fontClass: 'font-mono' },
                                { id: 'cursive', label: 'Cursive', fontClass: 'font-cursive' },
                              ].map((f) => (
                                <button
                                  key={f.id}
                                  onClick={() => updateOverlay(selectedOverlay.id, { font: f.id as any })}
                                  className={`flex-1 text-center py-1.5 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                                    selectedOverlay.font === f.id
                                      ? 'bg-zinc-800 text-white shadow-sm'
                                      : 'text-zinc-500 hover:text-zinc-300'
                                  }`}
                                >
                                  <span className={f.fontClass}>{f.label}</span>
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Alignment & BG options */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <label className="text-[9px] font-bold text-zinc-500 uppercase block">Alignment</label>
                              <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-850">
                                {[
                                  { id: 'left', icon: AlignLeft },
                                  { id: 'center', icon: AlignCenter },
                                  { id: 'right', icon: AlignRight },
                                ].map((a) => {
                                  const Icon = a.icon;
                                  return (
                                    <button
                                      key={a.id}
                                      onClick={() => updateOverlay(selectedOverlay.id, { align: a.id as any })}
                                      className={`flex-1 flex items-center justify-center py-1.5 rounded-lg transition cursor-pointer ${
                                        selectedOverlay.align === a.id
                                          ? 'bg-zinc-800 text-white'
                                          : 'text-zinc-500 hover:text-zinc-300'
                                      }`}
                                    >
                                      <Icon className="h-3 w-3" />
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-[9px] font-bold text-zinc-500 uppercase block">Background Box</label>
                              <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-850">
                                {[
                                  { id: 'none', label: 'None' },
                                  { id: 'dark', label: 'Dark' },
                                  { id: 'light', label: 'Light' },
                                ].map((bg) => (
                                  <button
                                    key={bg.id}
                                    onClick={() => updateOverlay(selectedOverlay.id, { bgColor: bg.id as any })}
                                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                                      selectedOverlay.bgColor === bg.id
                                        ? 'bg-zinc-800 text-white'
                                        : 'text-zinc-500 hover:text-zinc-300'
                                    }`}
                                  >
                                    {bg.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Font Color picker circles */}
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-bold text-zinc-500 uppercase block">Font Color</label>
                            <div className="flex items-center space-x-2 bg-zinc-950 px-2 py-1.5 rounded-xl border border-zinc-850 overflow-x-auto">
                              {COLORS.map((c) => (
                                <button
                                  key={c.value}
                                  onClick={() => updateOverlay(selectedOverlay.id, { color: c.value })}
                                  title={c.name}
                                  className={`h-5 w-5 rounded-full border cursor-pointer shrink-0 transition-all ${
                                    selectedOverlay.color === c.value ? 'ring-2 ring-indigo-500 scale-110 border-white' : 'border-zinc-800 hover:scale-105'
                                  }`}
                                  style={{ backgroundColor: c.value }}
                                />
                              ))}
                            </div>
                          </div>

                          {/* Font Size slider */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[10px] text-zinc-400 font-bold">
                              <span>Font Size</span>
                              <span>{selectedOverlay.fontSize}px</span>
                            </div>
                            <input
                              type="range"
                              min="12"
                              max="48"
                              value={selectedOverlay.fontSize}
                              onChange={(e) => updateOverlay(selectedOverlay.id, { fontSize: parseInt(e.target.value) })}
                              className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">All Stickers List</p>
                          <div className="space-y-1.5 max-h-40 overflow-y-auto">
                            {overlays.map((ov) => (
                              <button
                                key={ov.id}
                                onClick={() => setSelectedOverlayId(ov.id)}
                                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-zinc-900 border border-zinc-850 hover:bg-zinc-800/80 text-left transition"
                              >
                                <span className="text-xs font-semibold truncate text-zinc-300 pr-4">"{ov.text}"</span>
                                <ChevronRight className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center space-x-2 pt-4 border-t border-zinc-800 mt-6 bg-zinc-950 z-10 shrink-0">
            <button
              onClick={onClose}
              disabled={isRendering}
              className="flex-1 rounded-2xl border border-zinc-800 hover:border-zinc-700 py-3 text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-900 transition cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isRendering}
              className="flex-1 rounded-2xl bg-indigo-600 hover:bg-indigo-700 py-3 text-xs font-bold text-white shadow-lg transition cursor-pointer flex items-center justify-center space-x-1.5 disabled:opacity-50"
            >
              {isRendering ? (
                <>
                  <div className="h-3.5 w-3.5 rounded-full border-2 border-white/35 border-t-white animate-spin" />
                  <span>Baking Image...</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>Apply Changes</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
