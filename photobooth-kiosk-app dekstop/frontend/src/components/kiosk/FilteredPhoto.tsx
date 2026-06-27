"use client";

import React, { useEffect, useState } from "react";
import {
  applyFilterToImage,
  getCssFilterFallback,
} from "@/lib/kiosk/filters";

interface FilteredPhotoProps {
  src: string;
  filterId: string;
  className?: string;
  style?: React.CSSProperties;
  mirrored?: boolean;
  alt?: string;
  /** Live video: pakai CSS fallback agar tetap ringan */
  isVideo?: boolean;
  videoProps?: React.VideoHTMLAttributes<HTMLVideoElement>;
}

export const FilteredPhoto: React.FC<FilteredPhotoProps> = ({
  src,
  filterId,
  className,
  style,
  mirrored,
  alt,
  isVideo = false,
  videoProps,
}) => {
  const [previewSrc, setPreviewSrc] = useState(src);

  useEffect(() => {
    if (isVideo || filterId === "original") {
      setPreviewSrc(src);
      return;
    }

    let cancelled = false;
    applyFilterToImage(src, filterId).then((url) => {
      if (!cancelled) setPreviewSrc(url);
    });

    return () => {
      cancelled = true;
    };
  }, [src, filterId, isVideo]);

  const mirrorStyle: React.CSSProperties = mirrored
    ? { transform: "scaleX(-1)" }
    : {};

  if (isVideo) {
    return (
      <video
        {...videoProps}
        src={src}
        className={className}
        style={{
          ...style,
          ...mirrorStyle,
          filter: getCssFilterFallback(filterId),
        }}
      />
    );
  }

  return (
    <img
      src={previewSrc}
      alt={alt}
      className={className}
      style={{ ...style, ...mirrorStyle }}
    />
  );
};
