'use client';

import Image from 'next/image';

type AdminThumbImageProps = {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
};

export default function AdminThumbImage({
  src,
  alt,
  className = '',
  sizes = '(max-width: 768px) 50vw, 280px',
  priority = false,
}: AdminThumbImageProps) {
  if (!src) return null;

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={className}
    />
  );
}
