'use client';

type AdminThumbImageProps = {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
};

/** Admin thumbnails load directly from Supabase — no Vercel Image Optimization. */
export default function AdminThumbImage({
  src,
  alt,
  className = '',
  priority = false,
}: AdminThumbImageProps) {
  if (!src) return null;

  return (
    <img
      src={src}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      className={`absolute inset-0 h-full w-full ${className}`}
    />
  );
}
