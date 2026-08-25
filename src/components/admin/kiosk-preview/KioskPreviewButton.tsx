"use client";

import React from "react";
import { Rocket, Mail, FileText, Monitor } from "lucide-react";
import { useKioskPreviewTheme } from "./KioskPreviewThemeProvider";

const PRESET_BUTTON_THEMES = new Set(["pop_art", "post_card", "established", "global", "pixel"]);

interface KioskPreviewButtonProps {
  text?: string;
  isSmall?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
  fullWidth?: boolean;
  disabled?: boolean;
  className?: string;
}

export function KioskPreviewButton({
  text = "Lanjut",
  isSmall = false,
  icon: CustomIcon,
  fullWidth = true,
  disabled = false,
  className = "",
}: KioskPreviewButtonProps) {
  const theme = useKioskPreviewTheme();
  const themeId = PRESET_BUTTON_THEMES.has(theme.preset) ? theme.preset : "default";
  const py = isSmall ? "py-2" : "py-3 md:py-4";
  const textSz = isSmall ? "text-[9px]" : "text-[10px] sm:text-xs";
  const gap = isSmall ? "gap-1.5" : "gap-2";
  const widthClass = fullWidth ? "w-full" : "";
  const colorStyle = { backgroundColor: theme.buttonColor, color: theme.buttonTextColor, fontFamily: theme.fontFamily };
  const baseClass = `${widthClass} ${py} flex items-center justify-center ${gap} ${textSz} transition-all duration-300 ${disabled ? "opacity-40 pointer-events-none" : ""} ${className}`;
  const label = text;

  switch (themeId) {
    case "pop_art":
      return (
        <div className={`${widthClass} ${py} rounded-xl flex items-center justify-center ${gap} font-black ${textSz} tracking-wider shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] border-[3px] border-black italic ${disabled ? "opacity-40" : ""} ${className}`} style={colorStyle}>
          {CustomIcon ? <CustomIcon className="w-3.5 h-3.5" /> : <Rocket className="w-3.5 h-3.5" />}
          <span style={{ color: theme.buttonTextColor }}>{label}</span>
        </div>
      );
    case "post_card":
      return (
        <div className={`${baseClass} rounded-none font-bold tracking-[0.2em] border-[3px] border-dashed`} style={{ ...colorStyle, borderColor: theme.textColorHex }}>
          {CustomIcon ? <CustomIcon className="w-3.5 h-3.5" /> : <Mail className="w-3.5 h-3.5" />}
          <span style={{ color: theme.buttonTextColor }}>{label}</span>
        </div>
      );
    case "established":
      return (
        <div className={`${baseClass} rounded-none font-bold tracking-[0.2em] border-2 outline outline-1 outline-offset-2`} style={{ ...colorStyle, borderColor: theme.accent, outlineColor: theme.buttonColor }}>
          {CustomIcon ? <CustomIcon className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
          <span style={{ color: theme.buttonTextColor }}>{label}</span>
        </div>
      );
    case "global":
      return (
        <div className={`${baseClass} rounded-full font-black italic tracking-[0.1em] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] border-[3px] border-white`} style={colorStyle}>
          {CustomIcon ? <CustomIcon className="w-3.5 h-3.5" /> : <Monitor className="w-3.5 h-3.5" />}
          <span style={{ color: theme.buttonTextColor }}>{label}</span>
        </div>
      );
    case "pixel":
      return (
        <div className={`${baseClass} rounded-none font-mono font-bold tracking-wider border-[2px] shadow-[2px_2px_0px_0px_rgba(0,0,0,0.6)]`} style={{ ...colorStyle, borderColor: theme.textColorHex }}>
          {CustomIcon ? <CustomIcon className="w-3.5 h-3.5" /> : null}
          <span style={{ color: theme.buttonTextColor }}>[{label}]</span>
        </div>
      );
    default:
      return (
        <div className={`${baseClass} rounded-full font-black tracking-wider shadow-lg`} style={colorStyle}>
          {CustomIcon ? <CustomIcon className="w-3.5 h-3.5" /> : null}
          <span style={{ color: theme.buttonTextColor }}>{label}</span>
        </div>
      );
  }
}
