import React, { useState, useRef } from 'react';
import { Disc, Image as ImageIcon, ZoomIn, Heart, Check, Music } from 'lucide-react';
import { Track } from '../types/music';

interface NowPlayingCoverProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  onToggleFavorite: (trackId: string) => void;
  onUpdateTrackCover?: (trackId: string, newCoverUrl: string, newCoverBlob?: Blob) => void;
}

export const NowPlayingCover: React.FC<NowPlayingCoverProps> = ({
  currentTrack,
  isPlaying,
  onToggleFavorite,
  onUpdateTrackCover,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!currentTrack) {
    return (
      <div className="w-full bg-zinc-900/60 border border-zinc-800 rounded-3xl p-5 flex items-center justify-center text-center">
        <div className="text-zinc-500 text-xs">Нет активного трека для воспроизведения</div>
      </div>
    );
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUpdateTrackCover) {
      const url = URL.createObjectURL(file);
      onUpdateTrackCover(currentTrack.id, url, file);
    }
  };

  return (
    <div className="relative w-full overflow-hidden rounded-3xl bg-gradient-to-b from-zinc-900/90 via-zinc-900/60 to-zinc-950 border border-zinc-800/80 p-5 shadow-2xl backdrop-blur-xl">
      {/* Ambient background glow from the album cover */}
      <div
        className="absolute -top-16 -left-16 w-48 h-48 rounded-full opacity-25 blur-3xl pointer-events-none transition-all duration-1000"
        style={{
          background: currentTrack.coverUrl ? 'radial-gradient(circle, #f59e0b, #ec4899)' : '#f59e0b',
        }}
      />

      <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-5">
        {/* Vinyl Sleeve & Sliding Disc Artwork Representation */}
        <div className="relative group cursor-pointer flex-shrink-0" onClick={() => setIsModalOpen(true)}>
          {/* Vinyl Record sliding out when playing */}
          <div
            className={`absolute top-1 right-0 w-32 h-32 sm:w-36 sm:h-36 rounded-full bg-black border border-zinc-700 shadow-2xl transition-all duration-700 ease-out flex items-center justify-center pointer-events-none ${
              isPlaying
                ? 'translate-x-8 sm:translate-x-10 rotate-45'
                : 'translate-x-2 rotate-0 group-hover:translate-x-5'
            }`}
          >
            {/* Vinyl record grooves & center sticker */}
            <div className="w-full h-full rounded-full opacity-60 bg-[radial-gradient(#222_1px,transparent_1px)] bg-[size:4px_4px]" />
            <div className="absolute w-12 h-12 rounded-full overflow-hidden border border-zinc-800">
              <img
                src={currentTrack.coverUrl}
                alt=""
                className="w-full h-full object-cover"
                style={{
                  objectPosition: currentTrack.coverUrl.includes('image_9323c18c')
                    ? '50% 28%'
                    : 'center center',
                }}
              />
            </div>
            <div className="absolute w-3 h-3 rounded-full bg-zinc-900 border border-zinc-400" />
          </div>

          {/* Cardboard Album Cover Jacket Sleeve */}
          <div className="relative z-10 w-32 h-32 sm:w-36 sm:h-36 rounded-2xl overflow-hidden shadow-2xl border border-white/20 bg-zinc-900 transition-transform duration-300 group-hover:scale-102">
            <img
              src={currentTrack.coverUrl}
              alt={currentTrack.title}
              className="w-full h-full object-cover select-none"
              style={{
                objectPosition: currentTrack.coverUrl.includes('image_9323c18c')
                  ? '50% 28%'
                  : 'center center',
              }}
            />

            {/* Sleeve gloss finish */}
            <div
              className="absolute inset-0 pointer-events-none opacity-30"
              style={{
                background:
                  'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 50%, rgba(0,0,0,0.5) 100%)',
              }}
            />

            {/* Hover zoom overlay */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
              <ZoomIn className="w-6 h-6 drop-shadow-md" />
            </div>
          </div>
        </div>

        {/* Track Details & Album Metadata */}
        <div className="flex-1 min-w-0 text-center sm:text-left flex flex-col justify-between h-full pt-1">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-zinc-100 tracking-tight truncate">
              {currentTrack.title}
            </h2>

            <p className="text-sm font-medium text-amber-400 truncate mt-0.5">
              {currentTrack.artist}
            </p>

            <p className="text-xs text-zinc-400 truncate mt-1">
              Альбом: <span className="text-zinc-300 font-medium">{currentTrack.album || 'Сингл'}</span>
            </p>
          </div>

          {/* Quick Actions (Favorite & Change Cover) */}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-4 pt-3 border-t border-zinc-800/60">
            <button
              onClick={() => onToggleFavorite(currentTrack.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                currentTrack.favorite
                  ? 'bg-pink-600/20 text-pink-300 border border-pink-500/30'
                  : 'bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${currentTrack.favorite ? 'fill-current text-pink-500' : ''}`} />
              <span>{currentTrack.favorite ? 'В избранном' : 'В избранное'}</span>
            </button>

            {onUpdateTrackCover && (
              <>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold transition border border-zinc-700"
                  title="Загрузить свою картинку для этой песни"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                  <span>Сменить обложку</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Full Size Cover Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
          onClick={() => setIsModalOpen(false)}
        >
          <div className="relative max-w-lg w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-4 shadow-2xl text-center" onClick={e => e.stopPropagation()}>
            <div className="relative aspect-square w-full rounded-2xl overflow-hidden shadow-2xl mb-4 border border-zinc-700">
              <img
                src={currentTrack.coverUrl}
                alt={currentTrack.title}
                className="w-full h-full object-cover"
              />
            </div>
            <h3 className="text-base font-bold text-zinc-100">{currentTrack.title}</h3>
            <p className="text-xs text-amber-400 mt-0.5">{currentTrack.artist}</p>
            <p className="text-xs text-zinc-400">{currentTrack.album}</p>
            <button
              onClick={() => setIsModalOpen(false)}
              className="mt-4 px-5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200"
            >
              Закрыть
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
