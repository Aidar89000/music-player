import React, { useRef, useEffect, useState } from 'react';
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
  Radio,
  Heart,
  ListMusic,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { Track, RepeatMode } from '../types/music';
import { formatTime } from '../utils/musicLogic';

interface TurntablePlayerProps {
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
  onSeek: (seconds: number) => void;
  onSeekPercent: (percent: number) => void;
  onChangeVolume: (vol: number) => void;
  onToggleMute: () => void;
  onToggleShuffle: () => void;
  onCycleRepeat: () => void;
  onToggleCrackle: () => void;
  onToggleFavorite: (trackId: string) => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  isQueueOpen?: boolean;
  onToggleQueue?: () => void;
}

export const TurntablePlayer: React.FC<TurntablePlayerProps> = ({
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
  onSeekPercent,
  onChangeVolume,
  onToggleMute,
  onToggleShuffle,
  onCycleRepeat,
  onToggleCrackle,
  onToggleFavorite,
  isExpanded = false,
  onToggleExpand,
  isQueueOpen = false,
  onToggleQueue,
}) => {
  // Continuous rotation angle in degrees using ref for zero-react-render 120Hz/100fps performance
  const rotationAngleRef = useRef(0);
  const currentSpeedRef = useRef(isPlaying ? 180 : 0);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  const [isScratching, setIsScratching] = useState(false);
  const isScratchingRef = useRef(false);
  const discRef = useRef<HTMLDivElement>(null);
  const lastDragAngle = useRef<number>(0);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Tonearm tracking calculation:
  // Rest position: ~ -28 deg (away from record)
  // Outer groove start (0% progress): ~ 18 deg
  // Inner lead-out groove end (100% progress): ~ 36 deg
  const tonearmAngle = isPlaying
    ? 18 + (progressPercent / 100) * 18
    : -28;

  // Ultra-fluid 120Hz/100fps hardware-composited animation loop
  // Rotation speed reduced by 10%: 180 deg/s (~30 RPM)
  useEffect(() => {
    let active = true;

    const updateRotation = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const delta = Math.min((timestamp - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = timestamp;

      if (!isScratchingRef.current) {
        // Target speed: 180 deg/sec (10% slower than 200 deg/sec)
        const targetSpeed = isPlayingRef.current ? 180 : 0;

        // Frame-rate independent exponential smoothing for natural turntable inertia
        const smoothing = 1 - Math.exp(-7 * delta);
        currentSpeedRef.current += (targetSpeed - currentSpeedRef.current) * smoothing;

        if (Math.abs(currentSpeedRef.current) > 0.05) {
          rotationAngleRef.current = (rotationAngleRef.current + currentSpeedRef.current * delta) % 360;
          if (discRef.current) {
            discRef.current.style.transform = `rotate3d(0, 0, 1, ${rotationAngleRef.current.toFixed(3)}deg) translateZ(0)`;
          }
        }
      }

      if (active) {
        animFrameRef.current = requestAnimationFrame(updateRotation);
      }
    };

    animFrameRef.current = requestAnimationFrame(updateRotation);

    return () => {
      active = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      lastTimeRef.current = null;
    };
  }, []);

  // Handle scratch / manual vinyl drag with sub-millisecond 120Hz pointer response
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!discRef.current) return;
    setIsScratching(true);
    isScratchingRef.current = true;
    currentSpeedRef.current = 0;
    const rect = discRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const rad = Math.atan2(e.clientY - centerY, e.clientX - centerX);
    lastDragAngle.current = rad * (180 / Math.PI);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isScratchingRef.current || !discRef.current) return;
    const rect = discRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const rad = Math.atan2(e.clientY - centerY, e.clientX - centerX);
    const currentAngle = rad * (180 / Math.PI);
    let delta = currentAngle - lastDragAngle.current;

    // Normalize delta across -180..180 boundary
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;

    lastDragAngle.current = currentAngle;
    rotationAngleRef.current = (rotationAngleRef.current + delta) % 360;
    discRef.current.style.transform = `rotate3d(0, 0, 1, ${rotationAngleRef.current.toFixed(3)}deg) translateZ(0)`;

    // Scratch seeking: ~360 deg scrub = +/- 5% track seek
    const seekChange = (delta / 360) * 5;
    const newPercent = Math.min(100, Math.max(0, progressPercent + seekChange));
    onSeekPercent(newPercent);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isScratchingRef.current) {
      setIsScratching(false);
      isScratchingRef.current = false;
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

  const remainingSeconds = Math.max(0, duration - currentTime);

  return (
    <div
      className={`relative flex flex-col items-center justify-between rounded-3xl transition-all duration-300 w-full ${
        isExpanded
          ? 'max-w-4xl p-5 sm:p-8 bg-zinc-900/90 border border-zinc-800 shadow-2xl backdrop-blur-xl'
          : 'max-w-md mx-auto p-4 sm:p-5 bg-gradient-to-b from-zinc-900/95 via-zinc-900/90 to-zinc-950/95 border border-zinc-800/80 shadow-2xl backdrop-blur-lg'
      }`}
    >
      {/* Top Scrubber & Time (Mobile First Reference: image_9323c18c.png) */}
      <div className="w-full px-1 sm:px-2 pt-1 mb-2">
        <div className="flex items-center justify-between text-xs font-mono text-zinc-400 mb-1.5 px-0.5">
          <span>{formatTime(currentTime)}</span>
          <div className="flex items-center gap-2">
            {onToggleExpand && (
              <button
                onClick={onToggleExpand}
                className="p-1 text-zinc-500 hover:text-zinc-300 transition"
                aria-label={isExpanded ? 'Свернуть плеер' : 'Развернуть плеер'}
              >
                {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
            )}
            <span>{duration > 0 ? `-${formatTime(remainingSeconds)}` : '0:00'}</span>
          </div>
        </div>
        <div className="relative w-full flex items-center group">
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={e => onSeek(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-zinc-800/90 rounded-lg appearance-none cursor-pointer accent-amber-500 focus:outline-none"
            aria-label="Прокрутка аудио"
          />
        </div>
      </div>

      {/* Main Turntable Platter Deck with Rotating Picture Disc */}
      <div className="relative w-full aspect-square max-w-[280px] xs:max-w-[310px] sm:max-w-[340px] md:max-w-[360px] rounded-full p-2.5 sm:p-3 my-2 flex items-center justify-center select-none bg-gradient-to-br from-zinc-800/60 via-zinc-900/90 to-zinc-950 shadow-[inset_0_2px_10px_rgba(255,255,255,0.06),0_15px_35px_rgba(0,0,0,0.8)] border border-zinc-700/40">
        {/* Platter outer metallic bevel */}
        <div className="absolute inset-2 sm:inset-3 rounded-full border border-zinc-700/30 bg-zinc-950/80 shadow-[inset_0_4px_12px_rgba(0,0,0,0.9)]" />

        {/* ROTATING PICTURE DISC (Sole Theme: Full-bleed Cover Picture on Vinyl) */}
        <div
          ref={discRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{
            transform: `rotate3d(0, 0, 1, ${rotationAngleRef.current}deg) translateZ(0)`,
            cursor: isScratching ? 'grabbing' : 'grab',
            willChange: 'transform',
            transformOrigin: '50% 50%',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
          }}
          className={`relative w-[86%] h-[86%] rounded-full shadow-2xl flex items-center justify-center overflow-hidden transition-shadow select-none ${
            isScratching ? 'ring-2 ring-amber-400/50' : ''
          }`}
        >
          <div className="absolute inset-0 rounded-full bg-zinc-950 flex items-center justify-center overflow-hidden">
            {/* Song cover image spanning full picture disc */}
            {currentTrack?.coverUrl ? (
              <img
                src={currentTrack.coverUrl}
                alt={currentTrack.title}
                className="w-full h-full object-cover select-none pointer-events-none transition-transform"
                style={{
                  objectPosition: currentTrack.coverUrl.includes('image_9323c18c')
                    ? '50% 28%'
                    : 'center center',
                  transform: currentTrack.coverUrl.includes('image_9323c18c')
                    ? 'scale(1.28)'
                    : 'none',
                }}
                draggable={false}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-tr from-zinc-800 via-zinc-900 to-black" />
            )}

            {/* Micro vinyl grooves etched onto the picture disc */}
            <div
              className="absolute inset-0 rounded-full opacity-45 pointer-events-none"
              style={{
                background: `
                  repeating-radial-gradient(
                    circle at center,
                    transparent 0px,
                    transparent 2px,
                    rgba(0,0,0,0.45) 2.5px,
                    rgba(255,255,255,0.18) 3px
                  )
                `,
              }}
            />

            {/* Light reflection sheen that turns with the record */}
            <div
              className="absolute inset-0 rounded-full pointer-events-none opacity-35 mix-blend-screen"
              style={{
                background: `
                  conic-gradient(
                    from 0deg at 50% 50%,
                    transparent 0deg,
                    rgba(255, 255, 255, 0.2) 45deg,
                    transparent 90deg,
                    transparent 180deg,
                    rgba(255, 255, 255, 0.2) 225deg,
                    transparent 270deg,
                    transparent 360deg
                  )
                `,
              }}
            />

            {/* Center Spindle Hole */}
            <div className="relative w-6 h-6 rounded-full bg-zinc-300 border-2 border-zinc-800 flex items-center justify-center shadow-lg">
              <div className="w-2.5 h-2.5 rounded-full bg-black shadow-[inset_0_1px_2px_rgba(0,0,0,1)]" />
            </div>
          </div>
        </div>

        {/* Center Platter Spindle Pin (Hardware axis) */}
        <div className="absolute w-3.5 h-3.5 rounded-full bg-gradient-to-tr from-zinc-400 via-zinc-100 to-zinc-500 shadow-md border border-zinc-600 pointer-events-none" />

        {/* TONEARM ASSEMBLY (vintage pivot + arm + headshell + needle) */}
        <div
          className="absolute top-1 right-2 sm:top-2 sm:right-3 w-28 h-64 sm:w-32 sm:h-72 pointer-events-none transition-transform z-20"
          style={{
            transformOrigin: '76% 12%',
            transform: `rotate(${tonearmAngle}deg) translateZ(0)`,
            transitionDuration: isPlaying ? '1.2s' : '0.8s',
            transitionTimingFunction: 'cubic-bezier(0.25, 1, 0.5, 1)',
            willChange: 'transform',
          }}
        >
          {/* Base Pivot mount */}
          <div className="absolute top-0 right-3 w-10 h-10 rounded-full bg-gradient-to-b from-zinc-300 via-zinc-600 to-zinc-900 border-2 border-zinc-500 shadow-xl flex items-center justify-center">
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-zinc-700 via-zinc-300 to-zinc-800 border border-zinc-400 shadow-inner flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-zinc-900 border border-zinc-600" />
            </div>
          </div>

          {/* Tonearm Metal Tube */}
          <svg
            className="absolute top-6 right-6 w-24 h-56 overflow-visible drop-shadow-[2px_4px_6px_rgba(0,0,0,0.7)]"
            viewBox="0 0 100 220"
          >
            <defs>
              <linearGradient id="armMetal" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="35%" stopColor="#d4d4d8" />
                <stop offset="70%" stopColor="#71717a" />
                <stop offset="100%" stopColor="#27272a" />
              </linearGradient>
            </defs>
            <path
              d="M 80 10 Q 75 90, 50 140 T 26 195"
              fill="none"
              stroke="url(#armMetal)"
              strokeWidth="4.5"
              strokeLinecap="round"
            />
          </svg>

          {/* Headshell & Stylus Cartridge (Minimal without diodes) */}
          <div className="absolute bottom-2 left-0 sm:left-1 w-7 h-12 bg-gradient-to-b from-zinc-300 via-zinc-100 to-zinc-400 rounded-sm shadow-xl border border-zinc-500 flex flex-col items-center justify-between p-0.5 transform -rotate-12">
            <div className="w-5 h-2 bg-zinc-800 rounded-xs" />
            <div className="w-4 h-4 bg-zinc-900 rounded-xs border border-zinc-700 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
            </div>
            <div className="w-1 h-2 bg-gradient-to-b from-zinc-400 to-zinc-100 rounded-full" />
          </div>
        </div>
      </div>

      {/* Track Info (Title & Artist) */}
      <div className="w-full mt-2 text-center px-4">
        <h2 className="text-base sm:text-lg font-bold text-zinc-100 truncate">
          {currentTrack?.title || 'Выберите песню'}
        </h2>
        <p className="text-xs sm:text-sm text-zinc-400 truncate mt-0.5">
          {currentTrack?.artist || '—'} {currentTrack?.album ? `• ${currentTrack.album}` : ''}
        </p>
      </div>

      {/* Mobile Playback Controls (Matching reference: Shuffle, Prev, Play/Pause, Next, Repeat) */}
      <div className="w-full flex items-center justify-center gap-3 xs:gap-4 sm:gap-5 mt-4">
        {/* Shuffle */}
        <button
          onClick={onToggleShuffle}
          className={`p-2.5 rounded-full transition ${
            isShuffle
              ? 'text-amber-400 bg-amber-500/15'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
          title="Случайный порядок"
          aria-label="Случайный порядок"
        >
          <Shuffle className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        {/* Previous Track */}
        <button
          onClick={onPrevTrack}
          className="w-11 h-11 xs:w-12 xs:h-12 rounded-full bg-zinc-800/90 hover:bg-zinc-700 text-zinc-200 hover:text-white flex items-center justify-center shadow-md active:scale-95 transition"
          aria-label="Предыдущий трек"
        >
          <SkipBack className="w-5 h-5 fill-current" />
        </button>

        {/* Play/Pause Primary Round Button */}
        <button
          onClick={onTogglePlay}
          className="w-14 h-14 xs:w-16 xs:h-16 rounded-full bg-gradient-to-tr from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-black flex items-center justify-center shadow-xl hover:shadow-amber-500/30 active:scale-95 transition"
          aria-label={isPlaying ? 'Пауза' : 'Воспроизвести'}
        >
          {isPlaying ? (
            <Pause className="w-6 h-6 xs:w-7 xs:h-7 fill-current" />
          ) : (
            <Play className="w-6 h-6 xs:w-7 xs:h-7 fill-current ml-0.5" />
          )}
        </button>

        {/* Next Track */}
        <button
          onClick={onNextTrack}
          className="w-11 h-11 xs:w-12 xs:h-12 rounded-full bg-zinc-800/90 hover:bg-zinc-700 text-zinc-200 hover:text-white flex items-center justify-center shadow-md active:scale-95 transition"
          aria-label="Следующий трек"
        >
          <SkipForward className="w-5 h-5 fill-current" />
        </button>

        {/* Repeat Mode */}
        <button
          onClick={onCycleRepeat}
          className={`p-2.5 rounded-full transition ${
            repeatMode !== 'off'
              ? 'text-amber-400 bg-amber-500/15'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
          title={`Повтор: ${repeatMode === 'off' ? 'Выкл' : repeatMode === 'all' ? 'Все' : 'Один трек'}`}
          aria-label="Повтор"
        >
          {repeatMode === 'one' ? (
            <Repeat1 className="w-4 h-4 sm:w-5 sm:h-5" />
          ) : (
            <Repeat className="w-4 h-4 sm:w-5 sm:h-5" />
          )}
        </button>
      </div>

      {/* Bottom Utility Row: Volume & Crackle & Favorite & Queue */}
      <div className="w-full flex items-center justify-between gap-2 xs:gap-3 mt-4 pt-3 border-t border-zinc-800/60 px-1">
        {/* Volume Control */}
        <div className="flex items-center gap-1.5 flex-1 max-w-[130px] sm:max-w-[150px]">
          <button
            onClick={onToggleMute}
            className="p-1 text-zinc-400 hover:text-zinc-200 transition"
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
            className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            aria-label="Громкость"
          />
        </div>

        {/* Crackle Toggle */}
        <button
          onClick={onToggleCrackle}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition border ${
            crackleActive
              ? 'bg-amber-950/40 border-amber-600/40 text-amber-300'
              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
          }`}
          title="Эффект треска винила"
        >
          <Radio className="w-3 h-3 text-amber-400" />
          <span className="hidden xs:inline">Треск</span>
        </button>

        {/* Favorite */}
        {currentTrack && (
          <button
            onClick={() => onToggleFavorite(currentTrack.id)}
            className={`p-1.5 rounded-lg transition ${
              currentTrack.favorite ? 'text-pink-500' : 'text-zinc-500 hover:text-zinc-300'
            }`}
            title={currentTrack.favorite ? 'В избранном' : 'Добавить в избранное'}
            aria-label="В избранное"
          >
            <Heart className={`w-4 h-4 ${currentTrack.favorite ? 'fill-current' : ''}`} />
          </button>
        )}

        {/* Queue Toggle */}
        {onToggleQueue && (
          <button
            onClick={onToggleQueue}
            className={`p-1.5 rounded-lg transition ${
              isQueueOpen ? 'text-amber-400 bg-amber-500/15' : 'text-zinc-500 hover:text-zinc-300'
            }`}
            title="Очередь воспроизведения"
            aria-label="Очередь"
          >
            <ListMusic className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
