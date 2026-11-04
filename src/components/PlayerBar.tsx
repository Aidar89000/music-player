import React from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  Heart,
  Disc,
  Maximize2,
  Radio,
} from 'lucide-react';
import { Track, RepeatMode } from '../types/music';
import { formatTime } from '../utils/musicLogic';

interface PlayerBarProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isShuffle: boolean;
  repeatMode: RepeatMode;
  crackleActive: boolean;
  onTogglePlay: () => void;
  onNextTrack: () => void;
  onPrevTrack: () => void;
  onSeek: (time: number) => void;
  onChangeVolume: (vol: number) => void;
  onToggleMute: () => void;
  onToggleShuffle: () => void;
  onCycleRepeat: () => void;
  onToggleCrackle: () => void;
  onToggleFavorite: (trackId: string) => void;
  onOpenTurntable: () => void;
}

export const PlayerBar: React.FC<PlayerBarProps> = ({
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  volume,
  isMuted,
  isShuffle,
  repeatMode,
  crackleActive,
  onTogglePlay,
  onNextTrack,
  onPrevTrack,
  onSeek,
  onChangeVolume,
  onToggleMute,
  onToggleShuffle,
  onCycleRepeat,
  onToggleCrackle,
  onToggleFavorite,
  onOpenTurntable,
}) => {
  if (!currentTrack) return null;

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 backdrop-blur-xl border-t border-zinc-800/80 px-4 py-3 shadow-[0_-10px_30px_rgba(0,0,0,0.8)]">
      {/* Top Seek Progress Bar */}
      <div className="absolute -top-1 left-0 right-0 group cursor-pointer h-2 flex items-center">
        <div className="w-full bg-zinc-800 h-1 group-hover:h-2 transition-all relative overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-amber-400 group-hover:from-amber-400 group-hover:to-pink-500 transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <input
          type="range"
          min={0}
          max={duration || 100}
          step={0.1}
          value={currentTime}
          onChange={e => onSeek(parseFloat(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
        />
      </div>

      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Left: Track Info & Mini Spinning Vinyl */}
        <div className="flex items-center gap-3 min-w-0 w-1/4">
          <button
            onClick={onOpenTurntable}
            className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0 bg-zinc-900 border border-zinc-700 shadow-md group hover:scale-105 transition-transform"
            title="Открыть проигрыватель"
          >
            {/* Spinning mini vinyl */}
            <div
              className={`w-full h-full rounded-full flex items-center justify-center ${
                isPlaying ? 'animate-spin' : ''
              }`}
              style={{ animationDuration: '4s' }}
            >
              {currentTrack.coverUrl ? (
                <img
                  src={currentTrack.coverUrl}
                  alt={currentTrack.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Disc className="w-6 h-6 text-amber-400" />
              )}
            </div>
            {/* Vinyl spindle hole */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-3 h-3 rounded-full bg-zinc-950 border border-zinc-400" />
            </div>
          </button>

          <div className="min-w-0">
            <h4
              onClick={onOpenTurntable}
              className="text-sm font-semibold text-zinc-100 truncate hover:text-amber-400 cursor-pointer transition"
            >
              {currentTrack.title}
            </h4>
            <p className="text-xs text-zinc-400 truncate mt-0.5">{currentTrack.artist}</p>
          </div>

          <button
            onClick={() => onToggleFavorite(currentTrack.id)}
            className={`p-1.5 rounded-lg transition ml-1 flex-shrink-0 ${
              currentTrack.favorite
                ? 'text-pink-500 hover:text-pink-400'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
            aria-label={currentTrack.favorite ? 'Удалить из избранного' : 'Добавить в избранное'}
          >
            <Heart className={`w-4 h-4 ${currentTrack.favorite ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Center: Controls & Time */}
        <div className="flex flex-col items-center gap-1.5 flex-1 max-w-lg">
          <div className="flex items-center gap-3 sm:gap-5">
            {/* Shuffle */}
            <button
              onClick={onToggleShuffle}
              className={`p-1.5 rounded-lg transition ${
                isShuffle ? 'text-amber-400 bg-amber-500/10' : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Перемешать (Случайный порядок)"
              aria-label="Перемешать"
            >
              <Shuffle className="w-4 h-4" />
            </button>

            {/* Prev Track */}
            <button
              onClick={onPrevTrack}
              className="p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800 transition"
              title="Предыдущий трек"
              aria-label="Предыдущий трек"
            >
              <SkipBack className="w-5 h-5 fill-current" />
            </button>

            {/* Play/Pause Main Button */}
            <button
              onClick={onTogglePlay}
              className="p-3 rounded-full bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/30 transition transform active:scale-95"
              aria-label={isPlaying ? 'Пауза' : 'Воспроизвести'}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5" />
              )}
            </button>

            {/* Next Track */}
            <button
              onClick={onNextTrack}
              className="p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800 transition"
              title="Следующий трек"
              aria-label="Следующий трек"
            >
              <SkipForward className="w-5 h-5 fill-current" />
            </button>

            {/* Repeat Mode */}
            <button
              onClick={onCycleRepeat}
              className={`p-1.5 rounded-lg transition ${
                repeatMode !== 'off'
                  ? 'text-amber-400 bg-amber-500/10'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title={`Повтор: ${
                repeatMode === 'off' ? 'Выкл' : repeatMode === 'all' ? 'Все' : 'Один трек'
              }`}
              aria-label="Повтор"
            >
              {repeatMode === 'one' ? (
                <Repeat1 className="w-4 h-4" />
              ) : (
                <Repeat className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Time indicators */}
          <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-400">
            <span>{formatTime(currentTime)}</span>
            <span>/</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Right: Crackle, Volume & Expand */}
        <div className="flex items-center justify-end gap-3 w-1/4">
          {/* Vinyl Crackle Button */}
          <button
            onClick={onToggleCrackle}
            className={`hidden sm:flex items-center gap-1 p-1.5 rounded-lg text-xs transition ${
              crackleActive
                ? 'text-amber-400 bg-amber-500/10'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
            title="Треск винила"
          >
            <Radio className="w-4 h-4" />
          </button>

          {/* Volume Control */}
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleMute}
              className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 transition"
              aria-label={isMuted ? 'Включить звук' : 'Выключить звук'}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-red-400" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={isMuted ? 0 : volume}
              onChange={e => onChangeVolume(parseFloat(e.target.value))}
              className="w-16 sm:w-20 accent-amber-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
              title={`Громкость: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
            />
          </div>

          {/* Full Turntable Toggle */}
          <button
            onClick={onOpenTurntable}
            className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition"
            title="Открыть проигрыватель с диском"
            aria-label="Проигрыватель"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
