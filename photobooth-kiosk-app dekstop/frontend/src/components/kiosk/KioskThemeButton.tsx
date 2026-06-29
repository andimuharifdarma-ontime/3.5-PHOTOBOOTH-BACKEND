"use client";

import React from "react";
import { Camera, ChevronRight, FileText, Mail, Monitor, Rocket } from "lucide-react";
import { useKioskTheme } from "./KioskThemeProvider";
import { primaryButtonStyle } from "@/lib/kiosk/theme";

const PRESET_BUTTON_THEMES = new Set([
  "pop_art",
  "post_card",
  "established",
  "global",
  "pixel",
]);

function resolveButtonThemeId(preset: string): string {
  return PRESET_BUTTON_THEMES.has(preset) ? preset : "default";
}

export interface KioskThemeButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  text?: string;
  isSmall?: boolean;
  icon?: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  fullWidth?: boolean;
}

export function KioskThemeButton({
  text,
  isSmall = false,
  icon: CustomIcon,
  fullWidth = true,
  className = "",
  style,
  children,
  ...props
}: KioskThemeButtonProps) {
  const theme = useKioskTheme();
  const themeId = resolveButtonThemeId(theme.preset);
  const py = isSmall ? "py-2.5" : "py-4 md:py-5";
  const textSz = isSmall ? "text-[10px]" : "text-xs sm:text-sm";
  const iconSz = isSmall ? "w-3.5 h-3.5" : "w-5 h-5";
  const gap = isSmall ? "gap-2" : "gap-3";
  const widthClass = fullWidth ? "w-full" : "";
  const colorStyle = { ...primaryButtonStyle(theme), fontFamily: theme.fontFamily, ...style };
  const label = children ?? text;

  const content = (
    <>
      {CustomIcon ? (
        <CustomIcon className={iconSz} style={{ color: theme.buttonTextColor }} />
      ) : null}
      {label ? <span style={{ color: theme.buttonTextColor }}>{label}</span> : null}
    </>
  );

  switch (themeId) {
    case "pop_art":
      return (
        <button
          {...props}
          className={`${widthClass} ${py} rounded-xl flex items-center justify-center ${gap} font-black ${textSz} tracking-wider transition-all duration-300 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] border-[3px] border-black italic hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-2 active:shadow-none cursor-pointer disabled:opacity-40 disabled:pointer-events-none ${className}`}
          style={colorStyle}
        >
          {CustomIcon ? <CustomIcon className={iconSz} /> : <Rocket className={iconSz} />}
          <span style={{ color: theme.buttonTextColor }}>{label || "PLAY NOW"}</span>
        </button>
      );
    case "post_card":
      return (
        <button
          {...props}
          className={`${widthClass} ${py} rounded-none flex items-center justify-center ${gap} font-bold ${textSz} tracking-[0.2em] transition-all duration-300 border-[3px] border-dashed hover:opacity-90 cursor-pointer disabled:opacity-40 disabled:pointer-events-none ${className}`}
          style={{
            ...colorStyle,
            borderColor: theme.textColorHex,
          }}
        >
          {CustomIcon ? <CustomIcon className={iconSz} /> : <Mail className={iconSz} />}
          <span style={{ color: theme.buttonTextColor }}>{label || "POST CARD"}</span>
        </button>
      );
    case "established":
      return (
        <button
          {...props}
          className={`${widthClass} ${py} rounded-none flex items-center justify-center ${gap} font-bold ${textSz} tracking-[0.2em] transition-all duration-300 border-2 outline outline-1 outline-offset-2 hover:opacity-90 cursor-pointer disabled:opacity-40 disabled:pointer-events-none ${className}`}
          style={{
            ...colorStyle,
            borderColor: theme.accent,
            outlineColor: theme.buttonColor,
          }}
        >
          {CustomIcon ? <CustomIcon className={iconSz} /> : <FileText className={iconSz} />}
          <span style={{ color: theme.buttonTextColor }}>{label || "ESTABLISHED 1890"}</span>
        </button>
      );
    case "global":
      return (
        <div className={`relative ${fullWidth ? "w-full" : ""}`}>
          {!isSmall && (
            <>
              <svg
                className="absolute -inset-4 pointer-events-none opacity-50 overflow-hidden rounded-full w-[calc(100%+2rem)] h-[calc(100%+2rem)]"
                viewBox="0 0 200 60"
                preserveAspectRatio="none"
              >
                <path
                  d="M 0,30 Q 50,0 100,15 T 200,30 Q 150,60 100,45 T 0,30"
                  className="fill-transparent stroke-[1.5px]"
                  style={{ stroke: theme.accent }}
                />
              </svg>
            </>
          )}
          <button
            {...props}
            className={`${widthClass} ${py} rounded-full flex items-center justify-center ${gap} font-black italic ${textSz} tracking-[0.1em] transition-all duration-300 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] border-[3px] border-white hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-2 active:shadow-none relative z-20 cursor-pointer disabled:opacity-40 disabled:pointer-events-none ${className}`}
            style={colorStyle}
          >
            {content || <span style={{ color: theme.buttonTextColor }}>GLOBAL</span>}
          </button>
        </div>
      );
    case "pixel":
      return (
        <button
          {...props}
          className={`${widthClass} ${py} rounded-none flex items-center justify-center ${gap} font-mono font-bold ${textSz} uppercase tracking-widest transition-all duration-300 border-[2px] hover:brightness-95 active:translate-y-[3px] active:translate-x-[3px] active:shadow-none relative cursor-pointer disabled:opacity-40 disabled:pointer-events-none ${className}`}
          style={{
            ...colorStyle,
            borderColor: theme.textColorHex,
            boxShadow: `3px 3px 0px 0px ${theme.textColorHex}`,
          }}
        >
          <div className="absolute inset-0 border-t-2 border-l-2 border-white/40 pointer-events-none" />
          {CustomIcon ? <CustomIcon className={`${iconSz} relative z-10`} /> : <Monitor className={`${iconSz} relative z-10`} />}
          <span className="relative z-10" style={{ color: theme.buttonTextColor }}>
            {label || "START"}
          </span>
        </button>
      );
    default:
      return (
        <button
          {...props}
          className={`${widthClass} ${py} rounded-2xl flex items-center justify-center ${gap} font-black ${textSz} tracking-[0.15em] uppercase transition-all duration-300 shadow-lg hover:scale-[1.02] active:scale-[0.98] border border-white/20 cursor-pointer disabled:opacity-40 disabled:pointer-events-none ${className}`}
          style={colorStyle}
        >
          {content || (
            <>
              <span style={{ color: theme.buttonTextColor }}>MULAI SESI</span>
              <ChevronRight className={iconSz} style={{ color: theme.buttonTextColor }} />
            </>
          )}
        </button>
      );
  }
}
