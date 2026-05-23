"use client";
import { motion } from 'framer-motion';
import { Camera, X, RotateCcw, GripVertical } from 'lucide-react';
import { PhotoData } from '@/store/usePhotoStore';
import Image from 'next/image';

interface PhotoSlotProps {
  photo?: PhotoData;
  index: number;
  onRemove?: (id: string) => void;
  onPreview?: (photoUrl: string) => void;
  onDragStart?: (index: number) => void;
  onDragOver?: (index: number) => void;
  onDrop?: (index: number) => void;
  onDragEnd?: () => void;
  isDragging?: boolean;
  isDragOver?: boolean;
  className?: string;
}

const PhotoSlot: React.FC<PhotoSlotProps> = ({
  photo,
  index,
  onRemove,
  onPreview,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragging = false,
  isDragOver = false,
  className = ''
}) => {
  const handleDragStart = (e: React.DragEvent) => {
    if (photo && onDragStart) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', index.toString());
      onDragStart(index);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (onDragOver) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      onDragOver(index);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (onDrop) {
      onDrop(index);
    }
  };

  const handleDragEnd = () => {
    if (onDragEnd) {
      onDragEnd();
    }
  };

  return (
    <div
      draggable={!!photo}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragEnd={handleDragEnd}
      className={`relative bg-white rounded-2xl border-4 overflow-hidden ${photo ? 'cursor-move' : ''} ${isDragOver
        ? 'border-primary-600 bg-primary-50 ring-2 ring-primary-300'
        : isDragging
          ? 'border-gray-400 opacity-50'
          : 'border-primary-200'
        } ${className}`}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{
          opacity: isDragging ? 0.5 : 1,
          scale: isDragOver ? 1.05 : 1
        }}
        transition={{ delay: index * 0.1 }}
        className="w-full h-full"
      >
        {photo ? (
          <>
            <img
              src={photo.dataUrl}
              alt={`Photo ${index + 1}`}
              className="w-full h-full object-cover rounded-lg cursor-move"
              onClick={() => onPreview && onPreview(photo.dataUrl)}
              draggable={false}
            />

            {/* Photo overlay with controls */}
            <motion.div
              initial={{ opacity: 0 }}
              whileHover={{ opacity: 1 }}
              onClick={() => onPreview && onPreview(photo.dataUrl)}
              className="absolute inset-0 bg-black/50 flex items-center justify-center gap-2 cursor-zoom-in pointer-events-none"
              style={{ pointerEvents: isDragging ? 'none' : 'auto' }}
            >
              {onRemove && (
                <button
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); onRemove(photo.id); }}
                  className="p-3 bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors pointer-events-auto"
                  title="Hapus Foto"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </motion.div>

            {/* Photo number badge */}
            <div className="absolute top-2 left-2 bg-primary-800 text-white text-xs font-bold px-2 py-1 rounded-full">
              {index + 1}
            </div>

            {/* Drag handle */}
            {photo && (
              <div
                className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white p-1.5 rounded-full cursor-grab active:cursor-grabbing transition-colors z-10"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <GripVertical className="w-4 h-4" />
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center relative overflow-hidden">
            {/* Subtle Gradient Background for empty slot */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#F5F1EA] to-[#EAE1D3]"></div>
            {/* Overlay untuk membuat teks lebih mudah dibaca */}
            <div className="absolute inset-0 bg-black/5"></div>

            <div className="text-center text-white relative z-10">
              <Camera className="w-12 h-12 mx-auto mb-2 drop-shadow-lg" />
              <p className="text-sm font-medium drop-shadow-lg">Foto {index + 1}</p>
              <p className="text-xs drop-shadow-lg">Kosong</p>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default PhotoSlot;