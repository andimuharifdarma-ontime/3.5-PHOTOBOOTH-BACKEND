"use client";

import { ChevronRight, FileText, Mail, Monitor, Rocket, Star } from "lucide-react";

type RenderThemeButtonProps = {
  themeId: string;
  text?: string;
  isSmall?: boolean;
  style?: React.CSSProperties;
  icon?: React.ComponentType<{ className?: string }>;
};

export function RenderThemeButton({
  themeId,
  text,
  isSmall = false,
  style = {},
  icon: CustomIcon,
}: RenderThemeButtonProps) {
  const py = isSmall ? "py-2" : "py-4 md:py-5";
  const textSz = isSmall ? "text-[8px]" : "text-xs sm:text-sm";
  const iconSz = isSmall ? "w-3 h-3" : "w-5 h-5";
  const gap = isSmall ? "gap-1.5" : "gap-3";

  switch (themeId) {
    case "pop_art":
      return (
        <button
          className={`w-full ${py} rounded-xl flex items-center justify-center ${gap} font-black ${textSz} tracking-wider transition-all duration-300 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] border-[3px] border-black bg-[#FFB800] text-black italic hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-2 active:shadow-none`}
          style={style}
        >
          {CustomIcon ? <CustomIcon className={iconSz} /> : <Rocket className={iconSz} />}
          <span>{text || "PLAY NOW"}</span>
        </button>
      );
    case "post_card":
      return (
        <button
          className={`w-full ${py} rounded-none flex items-center justify-center ${gap} font-sans font-bold ${textSz} tracking-[0.2em] transition-all duration-300 border-[3px] border-dashed border-[#8B5A2B] bg-[#FDFBF7] text-[#8B5A2B] hover:bg-[#F5F0E6]`}
          style={style}
        >
          {CustomIcon ? <CustomIcon className={iconSz} /> : <Mail className={iconSz} />}
          <span>{text || "POST CARD"}</span>
        </button>
      );
    case "established":
      return (
        <button
          className={`w-full ${py} rounded-none flex items-center justify-center ${gap} font-sans font-bold ${textSz} tracking-[0.2em] transition-all duration-300 bg-[#3E2723] text-[#D4AF37] border-2 border-[#D4AF37] outline outline-1 outline-offset-2 outline-[#3E2723] hover:bg-[#2D1B18]`}
          style={style}
        >
          {CustomIcon ? <CustomIcon className={iconSz} /> : <FileText className={iconSz} />}
          <span>{text || "ESTABLISHED 1890"}</span>
        </button>
      );
    case "global":
      return (
        <div className="relative w-full">
          <div className="absolute -inset-4 pointer-events-none opacity-50 overflow-hidden rounded-full">
            <svg className="absolute w-full h-full stroke-[#0052CC] stroke-[1.5px] fill-transparent" viewBox="0 0 200 60" preserveAspectRatio="none">
              <path d="M 0,30 Q 50,0 100,15 T 200,30 Q 150,60 100,45 T 0,30" />
            </svg>
          </div>
          {!isSmall && (
            <>
              <Star className="absolute -top-3 right-4 w-6 h-6 text-[#0052CC] fill-[#0052CC] -rotate-12 z-10" />
              <Star className="absolute -bottom-2 left-2 w-4 h-4 text-[#0052CC] fill-[#0052CC] rotate-12 z-10" />
            </>
          )}
          {isSmall && <Star className="absolute -top-1 right-1 w-3 h-3 text-[#0052CC] fill-[#0052CC] -rotate-12 z-10" />}
          <button
            className={`w-full ${py} rounded-full flex items-center justify-center ${gap} font-black italic ${textSz} tracking-[0.1em] transition-all duration-300 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] border-[3px] border-white bg-[#0052CC] text-white hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-2 active:shadow-none relative z-20`}
            style={style}
          >
            {CustomIcon && <CustomIcon className={iconSz} />}<span>{text || "GLOBAL"}</span>
          </button>
        </div>
      );
    case "pixel":
      return (
        <button
          className={`w-full ${py} rounded-none flex items-center justify-center ${gap} font-mono font-bold ${textSz} transition-all duration-300 shadow-[3px_3px_0px_0px_#1F242A] border-[2px] border-[#1F242A] bg-[#E5A937] text-[#1F242A] hover:bg-[#D49826] active:translate-y-[3px] active:translate-x-[3px] active:shadow-none relative`}
          style={style}
        >
          <div className="absolute inset-0 border-t-2 border-l-2 border-white/40 pointer-events-none" />
          {CustomIcon ? <CustomIcon className={iconSz} /> : <Monitor className={iconSz} />}
          <span>{text || "START"}</span>
        </button>
      );
    default:
      return (
        <button
          className={`w-full ${py} rounded-2xl flex items-center justify-center ${gap} font-black ${textSz} tracking-[0.2em] transition-all duration-300 shadow-2xl relative overflow-hidden group hover:scale-105 active:scale-95 border-2 border-white/20 bg-black/50 text-white`}
          style={style}
        >
          <span>{text || "MULAI SESI"}</span>
          {CustomIcon ? <CustomIcon className={iconSz} /> : <ChevronRight className={iconSz} />}
        </button>
      );
  }
}
