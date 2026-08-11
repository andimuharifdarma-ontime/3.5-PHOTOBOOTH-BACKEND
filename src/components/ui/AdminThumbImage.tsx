'use client';

import { useState } from 'react';
import { getDisplayThumbUrl } from '@/lib/image-url';

type AdminThumbImageProps = {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
  thumbSrc?: string | null;
};

/** Admin thumbnails prefer small WebP variants for faster grid loads. */
export default function AdminThumbImage({
  src,
  alt,
  className = '',
  priority = false,
  thumbSrc,
}: AdminThumbImageProps) {
  const [imgSrc, setImgSrc] = useState(() => getDisplayThumbUrl(src, thumbSrc));

  if (!src) return null;

  return (
    <img
      src={imgSrc}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      fetchPriority={priority ? 'high' : 'auto'}
      onError={() => {
        if (imgSrc !== src) setImgSrc(src);
      }}
      className={`absolute inset-0 h-full w-full ${className}`}
    />
  );
}
