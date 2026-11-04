import React, { useState } from 'react';
import { Plus, FolderPlus, Disc, Heart, Music2, Sparkles, Trash2 } from 'lucide-react';
import { Playlist, Track } from '../types/music';
import { CDJewelCase } from './CDJewelCase';

interface PlaylistGridProps {
  playlists: Playlist[];
  allTracks: Track[];
  selectedPlaylistId: string | null;
  onSelectPlaylist: (playlistId: string | null) => void;
  onCreatePlaylist: (title: string, description: string, color: string) => void;
  onDeletePlaylist: (playlistId: string) => void;
  onPlayPlaylist: (playlistId: string | null) => void;
  currentTrackId?: string;
  isPlaying: boolean;
}

export const PlaylistGrid: React.FC<PlaylistGridProps> = ({
  playlists,
  allTracks,
  selectedPlaylistId,
  onSelectPlaylist,
  onCreatePlaylist,
  onDeletePlaylist,
  onPlayPlaylist,
  currentTrackId,
  isPlaying,
}) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newColor, setNewColor] = useState('#f59e0b');

  const colorOptions = [
    { name: 'Amber Gold', val: '#f59e0b' },
    { name: 'Neon Purple', val: '#a855f7' },
    { name: 'Cyan Blue', val: '#06b6d4' },
    { name: 'Rose Red', val: '#f43f5e' },
    { name: 'Emerald Green', val: '#10b981' },
    { name: 'Silver White', val: '#94a3b8' },
  ];

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onCreatePlaylist(newTitle.trim(), newDesc.trim(), newColor);
    setNewTitle('');
    setNewDesc('');
    setIsCreateModalOpen(false);
  };

  const favoritesCount = allTracks.filter(t => t.favorite).length;

  return (
    <div className="w-full space-y-6">
      {/* Navigation Header / Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onSelectPlaylist(null)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-2 ${
              selectedPlaylistId === null
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                : 'bg-zinc-800/60 text-zinc-300 hover:bg-zinc-800 hover:text-white'
            }`}
          >
            <Music2 className="w-4 h-4" />
            <span>Все треки ({allTracks.length})</span>
          </button>

          <button
            onClick={() => onSelectPlaylist('pl-favorites')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-2 ${
              selectedPlaylistId === 'pl-favorites'
                ? 'bg-pink-600 text-white shadow-lg shadow-pink-600/20'
                : 'bg-zinc-800/60 text-zinc-300 hover:bg-zinc-800 hover:text-white'
            }`}
          >
            <Heart className="w-4 h-4 text-pink-400 fill-pink-400" />
            <span>Избранное ({favoritesCount})</span>
          </button>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-medium border border-zinc-700 transition"
        >
          <FolderPlus className="w-4 h-4 text-amber-400" />
          <span>Создать плейлист</span>
        </button>
      </div>

      {/* Grid of CD Jewel Cases */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
        {/* Default 'All Tracks' CD case */}
        <div className={selectedPlaylistId === null ? 'ring-2 ring-amber-500 rounded-lg p-0.5' : ''}>
          <CDJewelCase
            title="Все треки"
            subtitle={`${allTracks.length} аудиофайлов`}
            coverUrl={allTracks[0]?.coverUrl}
            isPinned={true}
            onPlay={() => onPlayPlaylist(null)}
            onClick={() => onSelectPlaylist(null)}
            isCurrent={selectedPlaylistId === null}
            isPlaying={isPlaying && selectedPlaylistId === null}
          />
        </div>

        {/* User Playlists */}
        {playlists.map(pl => {
          const trackCount = pl.trackIds.length;
          // Find first track's cover in playlist
          const firstTrack = allTracks.find(t => pl.trackIds.includes(t.id));
          const cover = pl.coverUrl || firstTrack?.coverUrl;

          const isSelected = selectedPlaylistId === pl.id;

          return (
            <div
              key={pl.id}
              className={`relative group/item ${
                isSelected ? 'ring-2 ring-amber-500 rounded-lg p-0.5' : ''
              }`}
            >
              <CDJewelCase
                title={pl.title}
                subtitle={`${trackCount} треков`}
                coverUrl={cover}
                isPinned={pl.isSystem}
                onPlay={() => onPlayPlaylist(pl.id)}
                onClick={() => onSelectPlaylist(pl.id)}
                isCurrent={isSelected}
                isPlaying={isPlaying && isSelected}
              />

              {/* Delete button (non-system playlists) */}
              {!pl.isSystem && (
                <button
                  onClick={e => {
                    e.stopPropagation();
                    if (confirm(`Удалить плейлист "${pl.title}"? (Сами треки останутся в библиотеке)`)) {
                      onDeletePlaylist(pl.id);
                    }
                  }}
                  title="Удалить плейлист"
                  className="absolute top-2 right-2 z-30 p-1.5 rounded-full bg-black/70 hover:bg-red-600 text-zinc-300 hover:text-white opacity-0 group-hover/item:opacity-100 transition shadow-md"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Create Playlist Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl text-zinc-100">
            <h3 className="text-lg font-bold mb-1">Новый плейлист</h3>
            <p className="text-xs text-zinc-400 mb-4">
              Создайте CD-альбом для любимых треков
            </p>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Название плейлиста:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Например: Night Drive, Lo-Fi Chill..."
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Описание (необязательно):
                </label>
                <textarea
                  rows={2}
                  placeholder="Пара слов о настроении этого альбома"
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Цвет темы CD кейса:
                </label>
                <div className="flex items-center gap-2">
                  {colorOptions.map(c => (
                    <button
                      type="button"
                      key={c.val}
                      onClick={() => setNewColor(c.val)}
                      style={{ backgroundColor: c.val }}
                      className={`w-7 h-7 rounded-full transition transform ${
                        newColor === c.val ? 'ring-2 ring-white scale-110' : 'opacity-80 hover:opacity-100'
                      }`}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-400 hover:text-zinc-200"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm shadow-md"
                >
                  Создать
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
