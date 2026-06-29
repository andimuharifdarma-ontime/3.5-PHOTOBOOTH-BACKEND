"use client";

import React, { type CSSProperties, type ReactNode } from "react";
import { getPresetCardStyle, type KioskTheme } from "@/lib/kiosk/theme";

interface KioskPresetCardProps {
  theme: KioskTheme;
  isActive: boolean;
  children: ReactNode;
  label?: string;
  className?: string;
  onClick?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: () => void;
  onDrop?: (e: React.DragEvent) => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
}

export function KioskPresetCard({
  theme,
  isActive,
  children,
  label,
  className = "",
  onClick,
  onDragOver,
  onDragLeave,
  onDrop,
  draggable,
  onDragStart,
}: KioskPresetCardProps) {
  const card = getPresetCardStyle(theme, isActive);

  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") onClick();
            }
          : undefined
      }
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      draggable={draggable}
      onDragStart={onDragStart}
      className={`cursor-pointer ${card.className} ${className}`}
      style={card.style as CSSProperties}
    >
      {children}
      {label ? (
        <span className={`text-[10px] text-center ${card.fontClass}`}>{label}</span>
      ) : null}
    </div>
  );
}
