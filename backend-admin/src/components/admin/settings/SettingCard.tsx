import { ReactNode } from 'react';

interface SettingCardProps {
  title: string;
  description: string;
  icon: ReactNode;
  enabled: boolean;
  timer?: number;
  onToggle: () => void;
  onTimerChange?: (value: number) => void;
  children?: ReactNode;
}

export default function SettingCard({
  title,
  description,
  icon,
  enabled,
  timer,
  onToggle,
  onTimerChange,
  children,
}: SettingCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-[#EAE1D3] p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#FDFBF7] rounded-xl flex items-center justify-center text-2xl">
            {icon}
          </div>
          <div>
            <h3 className="font-bold text-lg text-[#4A3F35]">{title}</h3>
            <p className="text-sm text-[#8C7E6A]">{description}</p>
          </div>
        </div>
        <button
          onClick={onToggle}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            enabled ? 'bg-[#A68B67]' : 'bg-[#EAE1D3]'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
      {enabled && timer !== undefined && onTimerChange && (
        <div className="pt-4 border-t border-[#F5F1EA]">
          <label className="text-xs font-bold uppercase tracking-widest text-[#A68B67]">
            Timer (detik)
          </label>
          <input
            type="range"
            min="1"
            max="120"
            value={timer}
            onChange={(e) => onTimerChange(parseInt(e.target.value))}
            className="w-full mt-2 accent-[#A68B67]"
          />
          <div className="text-center text-sm font-bold text-[#4A3F35] mt-1">{timer}s</div>
        </div>
      )}
      {children}
    </div>
  );
}