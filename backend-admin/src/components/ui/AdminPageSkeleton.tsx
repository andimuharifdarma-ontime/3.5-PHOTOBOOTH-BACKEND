'use client';

type AdminPageSkeletonProps = {
  variant?: 'default' | 'grid' | 'table';
};

export default function AdminPageSkeleton({ variant = 'default' }: AdminPageSkeletonProps) {
  if (variant === 'grid') {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-40 rounded-3xl bg-[#EAE1D3]/60" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 rounded-2xl bg-[#EAE1D3]/50" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-[4/5] rounded-2xl bg-[#EAE1D3]/40" />
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'table') {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-32 rounded-3xl bg-[#EAE1D3]/60" />
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-[#EAE1D3]/40" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-40 rounded-3xl bg-[#EAE1D3]/60" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="h-56 rounded-2xl bg-[#EAE1D3]/45" />
        <div className="h-56 rounded-2xl bg-[#EAE1D3]/45" />
      </div>
      <div className="h-72 rounded-2xl bg-[#EAE1D3]/35" />
    </div>
  );
}
