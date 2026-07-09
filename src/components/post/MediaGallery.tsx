import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, X, GripVertical, Image as ImageIcon, Film, Sparkles } from 'lucide-react';
import ImageEditorModal from '../ImageEditorModal';

export interface MediaItem {
  id: string;
  data: string;
  type: 'image' | 'video';
}

interface MediaGalleryProps {
  items: MediaItem[];
  setItems: React.Dispatch<React.SetStateAction<MediaItem[]>>;
  activeIndex: number;
  setActiveIndex: (index: number) => void;
}

export default function MediaGallery({
  items,
  setItems,
  activeIndex,
  setActiveIndex,
}: MediaGalleryProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [showEditor, setShowEditor] = useState(false);

  if (items.length === 0) return null;

  // Carousel navigation
  const handlePrev = () => {
    setActiveIndex(activeIndex === 0 ? items.length - 1 : activeIndex - 1);
  };

  const handleNext = () => {
    setActiveIndex(activeIndex === items.length - 1 ? 0 : activeIndex + 1);
  };

  // Drag and Drop reordering
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    // Setting effectAllowed to move
    e.dataTransfer.effectAllowed = 'move';
    // Store index in dataTransfer for safety
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const sourceIndexStr = e.dataTransfer.getData('text/plain');
    const sourceIndex = sourceIndexStr ? parseInt(sourceIndexStr, 10) : draggedIndex;

    if (sourceIndex === null || isNaN(sourceIndex) || sourceIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const updatedItems = [...items];
    const [draggedItem] = updatedItems.splice(sourceIndex, 1);
    updatedItems.splice(targetIndex, 0, draggedItem);

    setItems(updatedItems);

    // Update active index appropriately to match the item we were viewing
    if (activeIndex === sourceIndex) {
      setActiveIndex(targetIndex);
    } else if (activeIndex > sourceIndex && activeIndex <= targetIndex) {
      setActiveIndex(activeIndex - 1);
    } else if (activeIndex < sourceIndex && activeIndex >= targetIndex) {
      setActiveIndex(activeIndex + 1);
    }

    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Remove active item
  const handleRemove = (indexToRemove: number) => {
    const filtered = items.filter((_, idx) => idx !== indexToRemove);
    setItems(filtered);

    // Readjust active index
    if (filtered.length === 0) {
      setActiveIndex(0);
    } else if (activeIndex >= filtered.length) {
      setActiveIndex(filtered.length - 1);
    } else if (activeIndex > indexToRemove) {
      setActiveIndex(activeIndex - 1);
    }
  };

  // Move item manually (Accessibility & Precise reordering)
  const moveItem = (index: number, direction: 'left' | 'right') => {
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const updated = [...items];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    setItems(updated);
    if (activeIndex === index) {
      setActiveIndex(targetIndex);
    } else if (activeIndex === targetIndex) {
      setActiveIndex(index);
    }
  };

  const currentItem = items[activeIndex] || items[0];

  return (
    <div id="media-gallery-container" className="relative mt-3.5 overflow-hidden rounded-xl border border-gray-100 bg-gray-50/50 dark:border-zinc-800 dark:bg-zinc-950/40 p-3 transition-colors duration-300">
      
      {/* Gallery Header with Info */}
      <div className="flex items-center justify-between mb-2 px-1 text-xs text-gray-500 dark:text-gray-400">
        <span className="font-bold flex items-center gap-1">
          <ImageIcon className="h-3.5 w-3.5 text-indigo-500" />
          <span>Upload Gallery ({items.length} {items.length === 1 ? 'item' : 'items'})</span>
        </span>
        <span className="bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full text-[10px] font-extrabold text-zinc-600 dark:text-zinc-300">
          Viewing {activeIndex + 1} of {items.length}
        </span>
      </div>

      {/* Main Large Asset Preview (Carousel style) */}
      <div className="relative aspect-video sm:aspect-3/2 w-full overflow-hidden rounded-lg bg-zinc-900 flex items-center justify-center group border border-zinc-200/20 dark:border-zinc-800/30">
        {currentItem.type === 'image' ? (
          <img
            src={currentItem.data}
            alt={`Preview asset ${activeIndex}`}
            className="h-full w-full object-contain select-none"
            referrerPolicy="no-referrer"
          />
        ) : (
          <video
            src={currentItem.data}
            controls
            className="h-full w-full object-contain"
          />
        )}

        {/* Carousel Navigation Arrows */}
        {items.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white backdrop-blur-xs hover:bg-black/75 hover:scale-105 active:scale-95 transition cursor-pointer"
              title="Previous item"
            >
              <ChevronLeft className="h-4.5 w-4.5" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white backdrop-blur-xs hover:bg-black/75 hover:scale-105 active:scale-95 transition cursor-pointer"
              title="Next item"
            >
              <ChevronRight className="h-4.5 w-4.5" />
            </button>
          </>
        )}

        {/* Remove and Reorder Action Toolbar top-right */}
        <div className="absolute top-2.5 right-2.5 flex items-center space-x-1 bg-black/55 backdrop-blur-md p-1.5 rounded-lg border border-white/10 shadow-lg">
          {/* Reorder Left */}
          {items.length > 1 && (
            <button
              type="button"
              onClick={() => moveItem(activeIndex, 'left')}
              disabled={activeIndex === 0}
              className="rounded-md p-1 text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-35 disabled:hover:bg-transparent transition cursor-pointer"
              title="Move left (reorder)"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}

          {/* Reorder Right */}
          {items.length > 1 && (
            <button
              type="button"
              onClick={() => moveItem(activeIndex, 'right')}
              disabled={activeIndex === items.length - 1}
              className="rounded-md p-1 text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-35 disabled:hover:bg-transparent transition cursor-pointer"
              title="Move right (reorder)"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          )}

          {items.length > 1 && <div className="h-4 w-[1px] bg-white/20 mx-1" />}

          {/* Edit current image */}
          {currentItem && currentItem.type === 'image' && (
            <>
              <button
                type="button"
                onClick={() => setShowEditor(true)}
                className="rounded-md p-1 text-indigo-300 hover:text-white hover:bg-indigo-500/20 transition cursor-pointer"
                title="Edit image effects & typography"
              >
                <Sparkles className="h-4 w-4" />
              </button>
              <div className="h-4 w-[1px] bg-white/20 mx-1" />
            </>
          )}

          {/* Remove current item */}
          <button
            type="button"
            onClick={() => handleRemove(activeIndex)}
            className="rounded-md p-1 text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 transition cursor-pointer"
            title="Remove item from post"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Thumbnails list with Drag & Drop reordering support */}
      {items.length > 1 && (
        <div className="mt-3">
          <p className="text-[10px] text-gray-400 dark:text-zinc-500 font-medium mb-1.5 px-0.5 select-none">
            Drag & drop thumbnails to reorder media, or click to view:
          </p>
          <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
            {items.map((item, idx) => {
              const isActive = idx === activeIndex;
              const isBeingDragged = idx === draggedIndex;
              const isHoveredOver = idx === dragOverIndex;

              return (
                <div
                  key={item.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, idx)}
                  onDragEnd={handleDragEnd}
                  className={`relative h-14 w-14 rounded-lg overflow-hidden shrink-0 border-2 bg-zinc-900 transition-all duration-200 cursor-grab active:cursor-grabbing select-none ${
                    isActive 
                      ? 'border-indigo-500 scale-102 ring-2 ring-indigo-500/20 shadow-md shadow-indigo-500/10' 
                      : 'border-transparent opacity-75 hover:opacity-100'
                  } ${isBeingDragged ? 'opacity-30 border-dashed border-indigo-400' : ''} ${
                    isHoveredOver ? 'border-dashed border-indigo-500 scale-105 bg-indigo-950/20' : ''
                  }`}
                  title="Drag to reorder / Click to view"
                >
                  <button
                    type="button"
                    onClick={() => setActiveIndex(idx)}
                    className="absolute inset-0 h-full w-full"
                  >
                    {item.type === 'image' ? (
                      <img src={item.data} alt="" className="h-full w-full object-cover pointer-events-none" />
                    ) : (
                      <div className="h-full w-full flex flex-col items-center justify-center bg-zinc-900/90 text-white gap-0.5">
                        <Film className="h-4 w-4 text-emerald-400 pointer-events-none" />
                        <span className="text-[8px] font-bold tracking-wider opacity-85 select-none">VIDEO</span>
                      </div>
                    )}
                  </button>

                  {/* Grip Handle visual hint */}
                  <div className="absolute top-0.5 left-0.5 bg-black/45 backdrop-blur-xs p-0.5 rounded-sm opacity-0 group-hover:opacity-100 pointer-events-none">
                    <GripVertical className="h-2 w-2 text-white/70" />
                  </div>

                  {/* Delete button on individual thumbnails */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(idx);
                    }}
                    className="absolute top-0.5 right-0.5 bg-black/60 hover:bg-rose-600 p-0.5 rounded-md text-white/90 hover:text-white transition"
                    title="Remove item"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {showEditor && currentItem && currentItem.type === 'image' && (
        <ImageEditorModal
          imageSrc={currentItem.data}
          onSave={(editedDataUrl) => {
            setItems((prev) =>
              prev.map((item, idx) =>
                idx === activeIndex ? { ...item, data: editedDataUrl } : item
              )
            );
            setShowEditor(false);
          }}
          onClose={() => setShowEditor(false)}
          title="Edit Post Photo"
        />
      )}
    </div>
  );
}
