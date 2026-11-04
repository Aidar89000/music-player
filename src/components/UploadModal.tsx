import React, { useState, useRef } from 'react';
import { Upload, X, Music, Check, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { Track, Playlist } from '../types/music';
import { parseAudioMetadata, generateFallbackCover } from '../utils/id3Parser';
import { parseFileNameToMetadata } from '../utils/musicLogic';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlists: Playlist[];
  onTracksUploaded: (newTracks: Track[], targetPlaylistId?: string) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  playlists,
  onTracksUploaded,
}) => {
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>('');
  const [customCoverUrl, setCustomCoverUrl] = useState<string>('');
  const [customCoverBlob, setCustomCoverBlob] = useState<Blob | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');

  const audioInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleCustomImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCustomCoverBlob(file);
      setCustomCoverUrl(URL.createObjectURL(file));
    }
  };

  const processFiles = async (files: FileList | File[]) => {
    const audioFiles = Array.from(files).filter(f =>
      f.type.startsWith('audio/') ||
      /\.(mp3|wav|ogg|flac|m4a|aac)$/i.test(f.name)
    );

    if (audioFiles.length === 0) {
      setStatusMessage('Пожалуйста, выберите аудиофайлы (MP3, WAV, FLAC, OGG, M4A).');
      return;
    }

    setIsProcessing(true);
    const newTracks: Track[] = [];

    for (let i = 0; i < audioFiles.length; i++) {
      const file = audioFiles[i];
      setStatusMessage(`Обработка ${i + 1} из ${audioFiles.length}: ${file.name}...`);

      try {
        // Read ID3 metadata
        const id3 = await parseAudioMetadata(file);
        const nameMeta = parseFileNameToMetadata(file.name);

        const title = id3.title || nameMeta.title;
        const artist = id3.artist || nameMeta.artist;
        const album = id3.album || 'Локальный альбом';

        // Read duration via temporary Audio element
        const audioUrl = URL.createObjectURL(file);
        const duration = await getAudioDuration(audioUrl);

        // Determine cover
        let coverBlob = customCoverBlob || id3.coverBlob;
        let coverUrl = customCoverUrl || id3.coverUrl;

        if (!coverUrl) {
          coverUrl = generateFallbackCover(title, artist, file.name);
        }

        const track: Track = {
          id: `track-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          title,
          artist,
          album,
          duration: duration || 180,
          coverUrl,
          coverBlob: coverBlob || undefined,
          audioBlob: file,
          audioUrl,
          dateAdded: Date.now(),
          favorite: false,
          fileType: file.type || 'audio/mpeg',
          fileName: file.name,
          sizeBytes: file.size,
        };

        newTracks.push(track);
      } catch (err) {
        console.error('Error processing audio file:', file.name, err);
      }
    }

    setIsProcessing(false);
    if (newTracks.length > 0) {
      onTracksUploaded(newTracks, selectedPlaylistId || undefined);
      onClose();
    } else {
      setStatusMessage('Не удалось обработать выбранные файлы.');
    }
  };

  const getAudioDuration = (url: string): Promise<number> => {
    return new Promise(resolve => {
      const audio = new Audio();
      audio.preload = 'metadata';
      audio.src = url;
      audio.onloadedmetadata = () => {
        resolve(audio.duration || 0);
      };
      audio.onerror = () => {
        resolve(0);
      };
      // Timeout fallback
      setTimeout(() => resolve(0), 2000);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl text-zinc-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg">Загрузка локальной музыки</h2>
              <p className="text-xs text-zinc-400">
                Песни воспроизводятся прямо в браузере и сохраняются в плейлисты
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drag & Drop Area */}
        <div
          onDragOver={e => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => audioInputRef.current?.click()}
          className={`mt-5 border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-amber-400 bg-amber-500/10 scale-[1.01]'
              : 'border-zinc-700 hover:border-zinc-500 bg-zinc-950/40 hover:bg-zinc-950/80'
          }`}
        >
          <input
            ref={audioInputRef}
            type="file"
            multiple
            accept="audio/*,.mp3,.wav,.ogg,.flac,.m4a"
            className="hidden"
            onChange={e => e.target.files && processFiles(e.target.files)}
          />

          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mb-3 group-hover:scale-110 transition">
            <Music className="w-7 h-7" />
          </div>

          <p className="font-semibold text-sm text-zinc-200">
            Перетащите аудиофайлы сюда или{' '}
            <span className="text-amber-400 underline underline-offset-4">выберите с диска</span>
          </p>
          <p className="text-xs text-zinc-400 mt-1">
            Поддерживаются MP3, WAV, FLAC, OGG, M4A (можно выбрать сразу несколько)
          </p>
        </div>

        {/* Extra Options: Playlist selection & Custom Album Art */}
        <div className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Добавить сразу в плейлист:
            </label>
            <select
              value={selectedPlaylistId}
              onChange={e => setSelectedPlaylistId(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-amber-500"
            >
              <option value="">Все треки (без отдельного плейлиста)</option>
              {playlists.map(pl => (
                <option key={pl.id} value={pl.id}>
                  {pl.title}
                </option>
              ))}
            </select>
          </div>

          {/* Optional Custom Cover Image */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Своя обложка для диска (необязательно, иначе возьмется из тегов или создастся стиль):
            </label>
            <div className="flex items-center gap-3">
              {customCoverUrl ? (
                <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-zinc-700 flex-shrink-0">
                  <img src={customCoverUrl} alt="Cover preview" className="w-full h-full object-cover" />
                  <button
                    onClick={() => {
                      setCustomCoverUrl('');
                      setCustomCoverBlob(null);
                    }}
                    className="absolute top-0.5 right-0.5 p-0.5 bg-black/70 rounded-full text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-xs text-zinc-300 flex items-center gap-2 transition"
                >
                  <ImageIcon className="w-4 h-4 text-amber-400" />
                  <span>Выбрать картинку...</span>
                </button>
              )}
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleCustomImageChange}
              />
              <span className="text-xs text-zinc-500">
                Эта картинка будет вращаться в центре диска
              </span>
            </div>
          </div>
        </div>

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2 animate-pulse">
            <div className="w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            <span>{statusMessage}</span>
          </div>
        )}

        {statusMessage && !isProcessing && (
          <div className="mt-4 p-3 rounded-xl bg-zinc-800/80 text-zinc-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition"
          >
            Отмена
          </button>
          <button
            onClick={() => audioInputRef.current?.click()}
            disabled={isProcessing}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm shadow-lg hover:shadow-amber-500/25 transition disabled:opacity-50"
          >
            Выбрать файлы
          </button>
        </div>
      </div>
    </div>
  );
};
