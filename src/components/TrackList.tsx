import React, { useState, useRef } from 'react';
import {
  Play,
  Pause,
  Heart,
  MoreVertical,
  Trash2,
  Plus,
  Search,
  Disc,
  Clock,
  Music,
  FolderPlus,
  Check,
  Image as ImageIcon,
} from 'lucide-react';
import { Track, Playlist } from '../types/music';
import { formatTime, filterTracks } from '../utils/musicLogic';

interface TrackListProps {
  tracks: Track[];
  currentTrackId?: string;
  isPlaying: boolean;
  onPlayTrack: (track: Track) => void;
  onToggleFavorite: (trackId: string) => void;
  onDeleteTrack: (trackId: string) => void;
  playlists: Playlist[];
  onAddTrackToPlaylist: (trackId: string, playlistId: string) => void;
  onRemoveTrackFromPlaylist?: (trackId: string, playlistId: string) => void;
  onUpdateTrackCover?: (trackId: string, newCoverUrl: string, newCoverBlob?: Blob) => void;
  activePlaylistId: string | null;
  activePlaylistTitle: string;
  onOpenUpload: () => void;
  searchQuery?: string;
  onSearchQueryChange?: (query: string) => void;
}

export const TrackList: React.FC<TrackListProps> = ({
  tracks,
  currentTrackId,
  isPlaying,
  onPlayTrack,
  onToggleFavorite,
  onDeleteTrack,
  playlists,
  onAddTrackToPlaylist,
  onRemoveTrackFromPlaylist,
  onUpdateTrackCover,
  activePlaylistId,
  activePlaylistTitle,
  onOpenUpload,
  searchQuery: externalSearchQuery,
  onSearchQueryChange,
}) => {
  const [internalSearchQuery, setInternalSearchQuery] = useState('');
  const [activeMenuTrackId, setActiveMenuTrackId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedTrackForCover, setSelectedTrackForCover] = useState<string | null>(null);

  const searchQuery = externalSearchQuery !== undefined ? externalSearchQuery : internalSearchQuery;
  const setSearchQuery = onSearchQueryChange || setInternalSearchQuery;

  const filteredTracks = filterTracks(tracks, searchQuery);

  return (
    <div className="w-full flex flex-col space-y-4">
      {/* Top Header & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <span>{activePlaylistTitle}</span>
            <span className="text-xs font-normal text-zinc-400 bg-zinc-800/80 px-2.5 py-0.5 rounded-full">
              {filteredTracks.length} треков
            </span>
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {/* Search box */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Поиск по названию или артисту..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Upload Button */}
          <button
            onClick={onOpenUpload}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs transition shadow-md shadow-amber-500/20 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Загрузить музыку</span>
          </button>
        </div>
      </div>

      {/* Tracks Table */}
      {filteredTracks.length === 0 ? (
        <div className="border border-dashed border-zinc-800 rounded-2xl p-10 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-full bg-zinc-800/80 flex items-center justify-center text-zinc-400 mb-3">
            <Music className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-zinc-200 text-sm">В этом списке пока нет треков</h3>
          <p className="text-xs text-zinc-500 max-w-sm mt-1 mb-4">
            {searchQuery
              ? 'По запросу ничего не найдено. Попробуйте изменить ключевые слова.'
              : 'Загрузите аудиофайлы с вашего компьютера, чтобы слушать их прямо в браузере!'}
          </p>
          <button
            onClick={onOpenUpload}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700 transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>Добавить первый трек</span>
          </button>
        </div>
      ) : (
        <div className="w-full overflow-x-auto rounded-2xl border border-zinc-800/80 bg-zinc-900/40 backdrop-blur-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800/80 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                <th className="py-3 px-3 w-12 text-center">#</th>
                <th className="py-3 px-3">Название</th>
                <th className="py-3 px-3 hidden md:table-cell">Альбом</th>
                <th className="py-3 px-3 hidden sm:table-cell w-20 text-center">
                  <Clock className="w-3.5 h-3.5 inline" />
                </th>
                <th className="py-3 px-3 w-28 text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/40 text-sm">
              {filteredTracks.map((track, idx) => {
                const isCurrent = track.id === currentTrackId;
                const isTrackPlaying = isCurrent && isPlaying;

                return (
                  <tr
                    key={track.id}
                    onDoubleClick={() => onPlayTrack(track)}
                    className={`group transition-colors ${
                      isCurrent
                        ? 'bg-amber-500/10 text-zinc-100'
                        : 'hover:bg-zinc-800/50 text-zinc-300'
                    }`}
                  >
                    {/* Number / Play Trigger / Animated Mini Vinyl */}
                    <td className="py-3 px-3 text-center">
                      <div className="relative flex items-center justify-center w-7 h-7 mx-auto">
                        {isCurrent ? (
                          <button
                            onClick={() => onPlayTrack(track)}
                            className="relative flex items-center justify-center"
                            aria-label={isTrackPlaying ? 'Пауза' : 'Воспроизвести'}
                          >
                            {/* Miniature spinning vinyl disc */}
                            <div
                              className={`w-6 h-6 rounded-full bg-zinc-950 border border-zinc-700 flex items-center justify-center overflow-hidden shadow-sm ${
                                isTrackPlaying ? 'animate-spin' : ''
                              }`}
                            >
                              {track.coverUrl ? (
                                <img
                                  src={track.coverUrl}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Disc className="w-3.5 h-3.5 text-amber-400" />
                              )}
                            </div>
                            <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                              {isTrackPlaying ? (
                                <Pause className="w-3.5 h-3.5 text-amber-400 fill-current" />
                              ) : (
                                <Play className="w-3.5 h-3.5 text-amber-400 fill-current ml-0.5" />
                              )}
                            </div>
                          </button>
                        ) : (
                          <>
                            <span className="text-xs text-zinc-500 group-hover:hidden">
                              {idx + 1}
                            </span>
                            <button
                              onClick={() => onPlayTrack(track)}
                              className="hidden group-hover:flex items-center justify-center w-7 h-7 rounded-full bg-amber-500 text-black shadow-md transition active:scale-95"
                              aria-label={`Воспроизвести ${track.title}`}
                            >
                              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>

                    {/* Title & Artist with Album Art */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-zinc-800 border border-zinc-700 flex-shrink-0 shadow-sm relative group-hover:scale-105 transition-transform">
                          <img
                            src={track.coverUrl}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p
                            className={`font-semibold text-sm truncate ${
                              isCurrent ? 'text-amber-400' : 'text-zinc-100'
                            }`}
                          >
                            {track.title}
                          </p>
                          <p className="text-xs text-zinc-400 truncate mt-0.5">
                            {track.artist}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Album Name */}
                    <td className="py-3 px-3 hidden md:table-cell text-xs text-zinc-400 truncate max-w-[200px]">
                      {track.album || '—'}
                    </td>

                    {/* Duration */}
                    <td className="py-3 px-3 hidden sm:table-cell text-xs text-zinc-400 text-center font-mono">
                      {formatTime(track.duration)}
                    </td>

                    {/* Actions: Favorite, Playlist Dropdown, Delete */}
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5 relative">
                        {/* Heart Favorite */}
                        <button
                          onClick={() => onToggleFavorite(track.id)}
                          className={`p-1.5 rounded-lg transition ${
                            track.favorite
                              ? 'text-pink-500 hover:text-pink-400'
                              : 'text-zinc-500 hover:text-zinc-300 opacity-60 group-hover:opacity-100'
                          }`}
                          aria-label={track.favorite ? 'Удалить из избранного' : 'Добавить в избранное'}
                        >
                          <Heart
                            className={`w-4 h-4 ${track.favorite ? 'fill-current' : ''}`}
                          />
                        </button>

                        {/* Dropdown Menu Trigger for Playlist Add / Remove */}
                        <div className="relative">
                          <button
                            onClick={() =>
                              setActiveMenuTrackId(
                                activeMenuTrackId === track.id ? null : track.id
                              )
                            }
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition"
                            aria-label="Опции трека"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {activeMenuTrackId === track.id && (
                            <div className="absolute right-0 top-full mt-1 w-52 bg-zinc-950 border border-zinc-800 rounded-2xl p-2 shadow-2xl z-40 text-left animate-in fade-in zoom-in-95">
                              <p className="text-[10px] font-bold text-zinc-500 uppercase px-2 py-1">
                                Добавить в плейлист:
                              </p>
                              <div className="max-h-40 overflow-y-auto space-y-0.5">
                                {playlists.map(pl => {
                                  const isInPl = pl.trackIds.includes(track.id);
                                  return (
                                    <button
                                      key={pl.id}
                                      onClick={() => {
                                        if (isInPl && onRemoveTrackFromPlaylist) {
                                          onRemoveTrackFromPlaylist(track.id, pl.id);
                                        } else {
                                          onAddTrackToPlaylist(track.id, pl.id);
                                        }
                                        setActiveMenuTrackId(null);
                                      }}
                                      className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs text-zinc-300 hover:bg-zinc-800/80 transition"
                                    >
                                      <span className="truncate">{pl.title}</span>
                                      {isInPl && (
                                        <Check className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                                      )}
                                    </button>
                                  );
                                })}
                              </div>

                              <div className="my-1 border-t border-zinc-800/80" />

                              {/* Remove from current playlist if viewing a custom playlist */}
                              {activePlaylistId && onRemoveTrackFromPlaylist && (
                                <button
                                  onClick={() => {
                                    onRemoveTrackFromPlaylist(track.id, activePlaylistId);
                                    setActiveMenuTrackId(null);
                                  }}
                                  className="w-full text-left px-2 py-1.5 rounded-lg text-xs text-amber-400 hover:bg-zinc-800/80 transition"
                                >
                                  Убрать из этого плейлиста
                                </button>
                              )}

                              {/* Change track cover */}
                              {onUpdateTrackCover && (
                                <button
                                  onClick={() => {
                                    setSelectedTrackForCover(track.id);
                                    fileInputRef.current?.click();
                                    setActiveMenuTrackId(null);
                                  }}
                                  className="w-full flex items-center gap-1.5 text-left px-2 py-1.5 rounded-lg text-xs text-zinc-300 hover:bg-zinc-800/80 transition"
                                >
                                  <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                                  <span>Сменить обложку</span>
                                </button>
                              )}

                              {/* Delete track from library */}
                              <button
                                onClick={() => {
                                  if (confirm(`Удалить "${track.title}" из фонотеки?`)) {
                                    onDeleteTrack(track.id);
                                  }
                                  setActiveMenuTrackId(null);
                                }}
                                className="w-full flex items-center gap-1.5 text-left px-2 py-1.5 rounded-lg text-xs text-red-400 hover:bg-red-500/10 transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Удалить трек</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Hidden file input for changing cover */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0];
              if (file && selectedTrackForCover && onUpdateTrackCover) {
                const url = URL.createObjectURL(file);
                onUpdateTrackCover(selectedTrackForCover, url, file);
                setSelectedTrackForCover(null);
              }
            }}
          />
        </div>
      )}
    </div>
  );
};
