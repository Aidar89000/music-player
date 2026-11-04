import React from 'react';
import { Play, Disc3, Pin } from 'lucide-react';

interface CDJewelCaseProps {
  title: string;
  subtitle?: string;
  coverUrl?: string;
  isPlaying?: boolean;
  isCurrent?: boolean;
  onPlay?: () => void;
  onClick?: () => void;
  isPinned?: boolean;
  badge?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const CDJewelCase: React.FC<CDJewelCaseProps> = ({
  title,
  subtitle,
  coverUrl,
  isPlaying = false,
  isCurrent = false,
  onPlay,
  onClick,
  isPinned = false,
  badge,
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'w-28 sm:w-32',
    md: 'w-40 sm:w-44 md:w-48',
    lg: 'w-56 sm:w-64',
  }[size];

  return (
    <div
      onClick={onClick}
      className={`group flex flex-col cursor-pointer transition-transform duration-300 hover:-translate-y-1 ${sizeClasses}`}
    >
      {/* Acrylic Jewel Case Box */}
      <div className="relative aspect-square w-full rounded-md p-1.5 bg-gradient-to-br from-zinc-800/80 via-zinc-900/90 to-black border border-white/20 shadow-xl overflow-hidden backdrop-blur-md">
        {/* Left Hinge Bar with Plastic Ridge Lines (like real CD jewel cases!) */}
        <div className="absolute left-0 top-0 bottom-0 w-3 bg-gradient-to-r from-zinc-700/60 via-zinc-600/40 to-transparent border-r border-white/10 z-20 flex flex-col justify-between py-2 items-center">
          <div className="w-1 h-3 rounded-full bg-white/20" />
          <div className="w-1 h-3 rounded-full bg-white/20" />
          <div className="w-1 h-3 rounded-full bg-white/20" />
        </div>

        {/* Acrylic Glass Top Sheen & Light Glare */}
        <div
          className="absolute inset-0 pointer-events-none z-20 opacity-30 group-hover:opacity-40 transition-opacity"
          style={{
            background:
              'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.05) 40%, transparent 60%, rgba(255,255,255,0.15) 100%)',
          }}
        />

        {/* Outer Case Raised Ridges */}
        <div className="absolute inset-1 rounded-sm border border-white/10 pointer-events-none z-20" />

        {/* Disc Tray Interior & Spinning / Resting Disc */}
        <div className="relative w-full h-full rounded-sm bg-zinc-950/90 overflow-hidden flex items-center justify-center">
          {/* THE CD DISC */}
          <div
            className={`relative w-[92%] h-[92%] rounded-full shadow-lg flex items-center justify-center overflow-hidden transition-transform duration-700 ${
              isPlaying && isCurrent ? 'animate-[spin_4s_linear_infinite]' : 'group-hover:rotate-12'
            }`}
          >
            {/* CD Iridescent Surface */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-zinc-300 via-slate-100 to-zinc-400">
              {/* Rainbow Diffraction Colors */}
              <div
                className="absolute inset-0 rounded-full opacity-65 mix-blend-color-dodge"
                style={{
                  background: `
                    conic-gradient(
                      from 0deg at 50% 50%,
                      #ff0055 0deg,
                      #ff9900 45deg,
                      #ffee00 90deg,
                      #00ff66 135deg,
                      #00ccff 180deg,
                      #9900ff 225deg,
                      #ff0099 270deg,
                      #00ffff 315deg,
                      #ff0055 360deg
                    )
                  `,
                }}
              />

              {/* Album Art Layer on Disc Surface */}
              {coverUrl ? (
                <div className="absolute inset-0 rounded-full overflow-hidden opacity-85 mix-blend-multiply">
                  <img src={coverUrl} alt={title} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-900 via-purple-900 to-black opacity-80" />
              )}

              {/* Data Tracks Ring */}
              <div className="absolute inset-[4px] rounded-full border border-white/30" />
              <div className="absolute inset-[10px] rounded-full border border-white/20" />

              {/* Center Clear Hub */}
              <div className="absolute inset-[30%] rounded-full bg-white/30 backdrop-blur-sm border border-white/40 flex items-center justify-center shadow-inner">
                {/* Spindle hole teeth clamp */}
                <div className="w-5 h-5 rounded-full bg-zinc-950/80 border border-white/60 flex items-center justify-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-black" />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Play overlay button on hover */}
          {onPlay && (
            <button
              onClick={e => {
                e.stopPropagation();
                onPlay();
              }}
              className="absolute z-30 p-3 rounded-full bg-amber-500 text-black shadow-xl opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-200 hover:scale-110 active:scale-95"
              aria-label={`Воспроизвести ${title}`}
            >
              {isPlaying && isCurrent ? (
                <Disc3 className="w-5 h-5 animate-spin" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5" />
              )}
            </button>
          )}

          {/* Indicator dot if currently active */}
          {isCurrent && (
            <div className="absolute top-2 right-2 z-30 flex items-center gap-1 bg-amber-500/90 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-md">
              <span className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
              <span>{isPlaying ? 'Играет' : 'Активен'}</span>
            </div>
          )}
        </div>
      </div>

      {/* Playlist / Album Caption */}
      <div className="mt-2 text-left">
        <h4 className="font-semibold text-sm text-zinc-100 group-hover:text-amber-400 transition truncate">
          {title}
        </h4>
        <div className="flex items-center gap-1 text-xs text-zinc-400 mt-0.5">
          {isPinned && <Pin className="w-3 h-3 text-emerald-400 fill-emerald-400 rotate-45" />}
          <span className="truncate">{subtitle || badge || 'Плейлист'}</span>
        </div>
      </div>
    </div>
  );
};
