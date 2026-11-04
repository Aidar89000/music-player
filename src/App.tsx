import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Disc,
  Disc3,
  Upload,
  ListMusic,
  Search,
} from 'lucide-react';
import { Track, Playlist, RepeatMode } from './types/music';
import { TurntablePlayer } from './components/TurntablePlayer';
import { NowPlayingCover } from './components/NowPlayingCover';
import { PlaylistGrid } from './components/PlaylistGrid';
import { TrackList } from './components/TrackList';
import { PlayerBar } from './components/PlayerBar';
import { UploadModal } from './components/UploadModal';
import {
  saveTrackToDB,
  loadTracksFromDB,
  deleteTrackFromDB,
  savePlaylistsToDB,
  loadPlaylistsFromDB,
} from './utils/audioStorage';
import { createInitialLibrary } from './utils/demoTracks';
import {
  getNextTrackIndex,
  getPrevTrackIndex,
  shuffleQueue,
  filterTracks,
} from './utils/musicLogic';
import { VinylCrackleEffect } from './utils/vinylCrackle';

export default function App() {
  // Library state
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'turntable' | 'playlists' | 'library'>('turntable');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Playback state
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(0.85);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('all');
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [shuffledTrackIds, setShuffledTrackIds] = useState<string[]>([]);

  // Player customization
  const [crackleActive, setCrackleActive] = useState<boolean>(false);
  const [isTurntableExpanded, setIsTurntableExpanded] = useState<boolean>(false);
  const [isQueueOpen, setIsQueueOpen] = useState<boolean>(true);

  // Modals
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [isDraggingOverWindow, setIsDraggingOverWindow] = useState<boolean>(false);

  // Audio references
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const crackleEffectRef = useRef<VinylCrackleEffect>(new VinylCrackleEffect());

  // Determine current active playlist tracks
  const currentPlaylistTracks = React.useMemo(() => {
    if (!selectedPlaylistId) return tracks;
    if (selectedPlaylistId === 'pl-favorites') {
      return tracks.filter(t => t.favorite);
    }
    const pl = playlists.find(p => p.id === selectedPlaylistId);
    if (!pl) return tracks;
    return tracks.filter(t => pl.trackIds.includes(t.id));
  }, [tracks, playlists, selectedPlaylistId]);

  // Current playing queue (normal or shuffled)
  const playbackQueue = React.useMemo(() => {
    if (!isShuffle || shuffledTrackIds.length === 0) {
      return currentPlaylistTracks;
    }
    // Reorder based on shuffledTrackIds
    const map = new Map(currentPlaylistTracks.map(t => [t.id, t]));
    const list: Track[] = [];
    for (const id of shuffledTrackIds) {
      const t = map.get(id);
      if (t) list.push(t);
    }
    // Add any remaining
    for (const t of currentPlaylistTracks) {
      if (!list.some(item => item.id === t.id)) {
        list.push(t);
      }
    }
    return list;
  }, [currentPlaylistTracks, isShuffle, shuffledTrackIds]);

  const currentTrack: Track | null = playbackQueue[currentTrackIndex] || null;

  // Initialize DB and Load Library
  useEffect(() => {
    async function init() {
      try {
        const [storedTracks, storedPlaylists] = await Promise.all([
          loadTracksFromDB(),
          loadPlaylistsFromDB(),
        ]);

        if (storedTracks.length > 0) {
          setTracks(storedTracks);
          setPlaylists(storedPlaylists);
        } else {
          // First time launch: populate starter library
          const initial = await createInitialLibrary();
          setTracks(initial.tracks);
          setPlaylists(initial.playlists);

          // Save to DB
          for (const t of initial.tracks) {
            await saveTrackToDB(t);
          }
          await savePlaylistsToDB(initial.playlists);
        }
      } catch (err) {
        console.error('Failed to initialize local library:', err);
      }
    }
    init();
  }, []);

  // Web Audio Context initialization on first interaction
  const ensureAudioContext = useCallback(() => {
    if (!audioContextRef.current && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        audioContextRef.current = ctx;

        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;
        analyserRef.current = analyser;

        if (audioRef.current && !sourceNodeRef.current) {
          try {
            const source = ctx.createMediaElementSource(audioRef.current);
            source.connect(analyser);
            analyser.connect(ctx.destination);
            sourceNodeRef.current = source;
          } catch (e) {
            console.warn('MediaElementSource creation warning:', e);
          }
        }
      }
    } else if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
  }, []);

  // Handle Crackle Audio
  useEffect(() => {
    if (crackleActive && isPlaying) {
      ensureAudioContext();
      if (audioContextRef.current) {
        crackleEffectRef.current.start(audioContextRef.current);
      }
    } else {
      crackleEffectRef.current.stop();
    }
  }, [crackleActive, isPlaying, ensureAudioContext]);

  // Handle Play/Pause
  const togglePlay = useCallback(() => {
    if (!currentTrack) return;
    ensureAudioContext();

    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        ?.play()
        .then(() => setIsPlaying(true))
        .catch(err => {
          console.warn('Audio playback error (user interaction needed):', err);
        });
    }
  }, [currentTrack, isPlaying, ensureAudioContext]);

  // Play Specific Track
  const handlePlayTrack = useCallback(
    (track: Track) => {
      ensureAudioContext();
      const idx = playbackQueue.findIndex(t => t.id === track.id);
      if (idx !== -1) {
        setCurrentTrackIndex(idx);
        setCurrentTime(0);
        setTimeout(() => {
          audioRef.current
            ?.play()
            .then(() => setIsPlaying(true))
            .catch(console.warn);
        }, 50);
      }
    },
    [playbackQueue, ensureAudioContext]
  );

  // Next Track
  const handleNextTrack = useCallback(() => {
    const nextIdx = getNextTrackIndex(currentTrackIndex, playbackQueue.length, repeatMode);
    if (nextIdx !== -1) {
      setCurrentTrackIndex(nextIdx);
      setCurrentTime(0);
      setTimeout(() => {
        if (isPlaying) {
          audioRef.current?.play().catch(console.warn);
        }
      }, 50);
    } else {
      setIsPlaying(false);
    }
  }, [currentTrackIndex, playbackQueue.length, repeatMode, isPlaying]);

  // Prev Track
  const handlePrevTrack = useCallback(() => {
    const prevIdx = getPrevTrackIndex(currentTrackIndex, playbackQueue.length, currentTime);
    if (prevIdx === currentTrackIndex) {
      // Restart current song
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        setCurrentTime(0);
      }
    } else {
      setCurrentTrackIndex(prevIdx);
      setCurrentTime(0);
      setTimeout(() => {
        if (isPlaying) {
          audioRef.current?.play().catch(console.warn);
        }
      }, 50);
    }
  }, [currentTrackIndex, playbackQueue.length, currentTime, isPlaying]);

  // Seek
  const handleSeek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleSeekPercent = (percent: number) => {
    if (duration > 0) {
      handleSeek((percent / 100) * duration);
    }
  };

  // Volume
  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    if (audioRef.current) {
      audioRef.current.volume = newVol;
    }
    if (isMuted && newVol > 0) {
      setIsMuted(false);
    }
  };

  const handleToggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
    }
    setIsMuted(!isMuted);
  };

  // Shuffle Toggle
  const handleToggleShuffle = () => {
    if (!isShuffle) {
      const shuffled = shuffleQueue(currentPlaylistTracks, currentTrack?.id);
      setShuffledTrackIds(shuffled.map(t => t.id));
      setIsShuffle(true);
      setCurrentTrackIndex(0);
    } else {
      setIsShuffle(false);
      setShuffledTrackIds([]);
      if (currentTrack) {
        const origIdx = currentPlaylistTracks.findIndex(t => t.id === currentTrack.id);
        setCurrentTrackIndex(origIdx !== -1 ? origIdx : 0);
      }
    }
  };

  // Repeat Mode Cycle
  const handleCycleRepeat = () => {
    const modes: RepeatMode[] = ['off', 'all', 'one'];
    const current = modes.indexOf(repeatMode);
    const next = modes[(current + 1) % modes.length];
    setRepeatMode(next);
  };

  // Favorite toggle
  const handleToggleFavorite = async (trackId: string) => {
    const updated = tracks.map(t => (t.id === trackId ? { ...t, favorite: !t.favorite } : t));
    setTracks(updated);
    const target = updated.find(t => t.id === trackId);
    if (target) {
      await saveTrackToDB(target);
    }
  };

  // Delete track
  const handleDeleteTrack = async (trackId: string) => {
    const updated = tracks.filter(t => t.id !== trackId);
    setTracks(updated);
    // Remove from playlists too
    const updatedPlaylists = playlists.map(pl => ({
      ...pl,
      trackIds: pl.trackIds.filter(id => id !== trackId),
    }));
    setPlaylists(updatedPlaylists);

    await deleteTrackFromDB(trackId);
    await savePlaylistsToDB(updatedPlaylists);

    // If current was deleted, move to next
    if (currentTrack?.id === trackId) {
      handleNextTrack();
    }
  };

  // Update track cover image
  const handleUpdateTrackCover = async (trackId: string, newCoverUrl: string, newCoverBlob?: Blob) => {
    const updated = tracks.map(t =>
      t.id === trackId
        ? { ...t, coverUrl: newCoverUrl, coverBlob: newCoverBlob || t.coverBlob }
        : t
    );
    setTracks(updated);
    const target = updated.find(t => t.id === trackId);
    if (target) {
      await saveTrackToDB(target);
    }
  };

  // Create Playlist
  const handleCreatePlaylist = async (title: string, description: string, color: string) => {
    const newPl: Playlist = {
      id: `pl-${Date.now()}`,
      title,
      description,
      themeColor: color,
      trackIds: [],
      createdAt: Date.now(),
      isSystem: false,
    };
    const nextList = [...playlists, newPl];
    setPlaylists(nextList);
    await savePlaylistsToDB(nextList);
    setSelectedPlaylistId(newPl.id);
  };

  // Delete Playlist
  const handleDeletePlaylist = async (playlistId: string) => {
    const nextList = playlists.filter(p => p.id !== playlistId);
    setPlaylists(nextList);
    if (selectedPlaylistId === playlistId) {
      setSelectedPlaylistId(null);
    }
    await savePlaylistsToDB(nextList);
  };

  // Add Track to Playlist
  const handleAddTrackToPlaylist = async (trackId: string, playlistId: string) => {
    const nextList = playlists.map(pl => {
      if (pl.id === playlistId && !pl.trackIds.includes(trackId)) {
        return { ...pl, trackIds: [...pl.trackIds, trackId] };
      }
      return pl;
    });
    setPlaylists(nextList);
    await savePlaylistsToDB(nextList);
  };

  // Remove Track from Playlist
  const handleRemoveTrackFromPlaylist = async (trackId: string, playlistId: string) => {
    const nextList = playlists.map(pl => {
      if (pl.id === playlistId) {
        return { ...pl, trackIds: pl.trackIds.filter(id => id !== trackId) };
      }
      return pl;
    });
    setPlaylists(nextList);
    await savePlaylistsToDB(nextList);
  };

  // Play whole playlist from beginning
  const handlePlayPlaylist = (playlistId: string | null) => {
    setSelectedPlaylistId(playlistId);
    setCurrentTrackIndex(0);
    setCurrentTime(0);
    setTimeout(() => {
      ensureAudioContext();
      audioRef.current
        ?.play()
        .then(() => setIsPlaying(true))
        .catch(console.warn);
    }, 50);
  };

  // Tracks uploaded from UploadModal or Drag&Drop
  const handleTracksUploaded = async (newTracks: Track[], targetPlaylistId?: string) => {
    const merged = [...tracks, ...newTracks];
    setTracks(merged);

    for (const t of newTracks) {
      await saveTrackToDB(t);
    }

    if (targetPlaylistId) {
      const idsToAdd = newTracks.map(t => t.id);
      const nextPlaylists = playlists.map(pl => {
        if (pl.id === targetPlaylistId) {
          return { ...pl, trackIds: Array.from(new Set([...pl.trackIds, ...idsToAdd])) };
        }
        return pl;
      });
      setPlaylists(nextPlaylists);
      await savePlaylistsToDB(nextPlaylists);
    }

    // Auto-select and play the first uploaded track
    if (newTracks.length > 0) {
      handlePlayTrack(newTracks[0]);
    }
  };

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't hijack if user is typing in input or textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleSeek(Math.min(duration, currentTime + 5));
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handleSeek(Math.max(0, currentTime - 5));
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        handleVolumeChange(Math.min(1, volume + 0.05));
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        handleVolumeChange(Math.max(0, volume - 0.05));
      } else if (e.code === 'KeyM') {
        handleToggleMute();
      } else if (e.code === 'KeyN') {
        handleNextTrack();
      } else if (e.code === 'KeyP') {
        handlePrevTrack();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, handleSeek, duration, currentTime, handleVolumeChange, volume, handleToggleMute, handleNextTrack, handlePrevTrack]);

  // Window drag-and-drop listener for audio files
  const handleWindowDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOverWindow(true);
  };
  const handleWindowDragLeave = (e: React.DragEvent) => {
    if (e.relatedTarget === null) {
      setIsDraggingOverWindow(false);
    }
  };
  const handleWindowDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOverWindow(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setIsUploadOpen(true);
    }
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Active playlist title for display
  const activePlaylistTitle = selectedPlaylistId
    ? selectedPlaylistId === 'pl-favorites'
      ? 'Избранное'
      : playlists.find(p => p.id === selectedPlaylistId)?.title || 'Плейлист'
    : 'Все треки';

  return (
    <div
      onDragOver={handleWindowDragOver}
      onDragLeave={handleWindowDragLeave}
      onDrop={handleWindowDrop}
      className="min-h-screen bg-[#09090c] text-zinc-100 flex flex-col pb-28 selection:bg-amber-500 selection:text-black"
    >
      {/* Hidden Native Audio Element */}
      <audio
        ref={audioRef}
        src={currentTrack?.audioUrl}
        onTimeUpdate={() => {
          if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
          }
        }}
        onLoadedMetadata={() => {
          if (audioRef.current) {
            setDuration(audioRef.current.duration || currentTrack?.duration || 0);
          }
        }}
        onEnded={handleNextTrack}
        onError={e => {
          console.warn('Audio tag event error:', e);
        }}
      />

      {/* Drag Over Window Visual Banner */}
      {isDraggingOverWindow && (
        <div className="fixed inset-0 z-50 bg-amber-500/20 backdrop-blur-md border-4 border-dashed border-amber-400 flex items-center justify-center pointer-events-none">
          <div className="bg-zinc-900/90 p-8 rounded-3xl border border-amber-400 shadow-2xl flex flex-col items-center text-center">
            <Upload className="w-12 h-12 text-amber-400 animate-bounce mb-3" />
            <h2 className="text-xl font-bold text-white">Отпустите аудиофайлы здесь</h2>
            <p className="text-sm text-zinc-300 mt-1">Они мгновенно добавятся в плеер и плейлист!</p>
          </div>
        </div>
      )}

      {/* TOP NAVIGATION BAR */}
      {/* TOP NAVIGATION BAR - MOBILE FIRST MINIMALIST */}
      <header className="sticky top-0 z-30 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/60 px-3 sm:px-6 py-2.5">
        <div className="max-w-4xl lg:max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-3">
          {/* Navigation Switcher: Вертушка & Плейлисты */}
          <div className="flex items-center gap-1 bg-zinc-900/90 p-1 rounded-xl border border-zinc-800 flex-shrink-0">
            <button
              onClick={() => setActiveTab('turntable')}
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'turntable'
                  ? 'bg-amber-500 text-black shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Disc className="w-3.5 h-3.5" />
              <span>Вертушка</span>
            </button>

            <button
              onClick={() => setActiveTab('playlists')}
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'playlists'
                  ? 'bg-amber-500 text-black shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Disc3 className="w-3.5 h-3.5" />
              <span>Плейлисты</span>
            </button>
          </div>

          {/* Real-time Global Song Search Input */}
          <div className="relative flex-1 min-w-[110px] max-w-xs sm:max-w-sm">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Поиск песен..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900/80 border border-zinc-800/80 rounded-xl pl-7 sm:pl-8 pr-6 sm:pr-7 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white text-xs p-0.5"
                aria-label="Очистить поиск"
              >
                ✕
              </button>
            )}
          </div>

          {/* Аккуратная кнопка "Загрузить песню" */}
          <button
            onClick={() => setIsUploadOpen(true)}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white text-xs font-medium border border-zinc-700/80 hover:border-amber-400/60 transition shadow-sm active:scale-95 flex-shrink-0"
            title="Загрузить песню"
          >
            <Upload className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden xs:inline">Загрузить</span>
          </button>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 max-w-4xl lg:max-w-7xl w-full mx-auto p-3 sm:p-6">
        {activeTab === 'turntable' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
            {/* Turntable Platter Deck with Rotating Picture Disc */}
            <div
              className={`flex flex-col items-center w-full ${
                isTurntableExpanded ? 'lg:col-span-12' : 'lg:col-span-7'
              }`}
            >
              <TurntablePlayer
                currentTrack={currentTrack}
                isPlaying={isPlaying}
                currentTime={currentTime}
                duration={duration}
                volume={volume}
                isMuted={isMuted}
                isShuffle={isShuffle}
                repeatMode={repeatMode}
                crackleActive={crackleActive}
                onTogglePlay={togglePlay}
                onNextTrack={handleNextTrack}
                onPrevTrack={handlePrevTrack}
                onSeek={handleSeek}
                onSeekPercent={handleSeekPercent}
                onChangeVolume={handleVolumeChange}
                onToggleMute={handleToggleMute}
                onToggleShuffle={handleToggleShuffle}
                onCycleRepeat={handleCycleRepeat}
                onToggleCrackle={() => setCrackleActive(!crackleActive)}
                onToggleFavorite={handleToggleFavorite}
                isExpanded={isTurntableExpanded}
                onToggleExpand={() => setIsTurntableExpanded(!isTurntableExpanded)}
                isQueueOpen={isQueueOpen}
                onToggleQueue={() => setIsQueueOpen(!isQueueOpen)}
              />
            </div>

            {/* Current Song Cover Showcase & Queue (Cols 8-12) */}
            {!isTurntableExpanded && (
              <div
                className={`lg:col-span-5 space-y-4 w-full ${
                  isQueueOpen ? 'block' : 'hidden lg:block'
                }`}
              >
                {/* PROMINENT ALBUM COVER SHOWCASE FOR CURRENT SONG */}
                <NowPlayingCover
                  currentTrack={currentTrack}
                  isPlaying={isPlaying}
                  onToggleFavorite={handleToggleFavorite}
                  onUpdateTrackCover={handleUpdateTrackCover}
                />

                {/* Queue Header & Real-time Filter */}
                <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-3.5 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                    <h3 className="font-bold text-sm text-zinc-200 flex items-center gap-2">
                      <ListMusic className="w-4 h-4 text-amber-400" />
                      <span>Очередь: {activePlaylistTitle}</span>
                      {searchQuery && (
                        <span className="text-[11px] font-normal text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                          {filterTracks(playbackQueue, searchQuery).length} из {playbackQueue.length}
                        </span>
                      )}
                    </h3>
                    <button
                      onClick={() => setActiveTab('playlists')}
                      className="text-xs text-amber-400 hover:underline"
                    >
                      Сменить плейлист
                    </button>
                  </div>

                  {/* Search input in queue */}
                  <div className="relative flex items-center">
                    <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Фильтровать песни в очереди..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-7 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Compact Queue List */}
                  <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                    {filterTracks(playbackQueue, searchQuery).length === 0 ? (
                      <div className="text-center py-6 text-zinc-500 text-xs">
                        По запросу «{searchQuery}» песен не найдено
                      </div>
                    ) : (
                      filterTracks(playbackQueue, searchQuery).map(track => {
                        const isCurrent = track.id === currentTrack?.id;
                        return (
                          <div
                            key={track.id}
                            onClick={() => handlePlayTrack(track)}
                            className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition ${
                              isCurrent
                                ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300 shadow-sm'
                                : 'bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800/60 text-zinc-300'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              {/* Track Album Cover with spinning indicator */}
                              <div
                                className={`w-9 h-9 rounded-full overflow-hidden bg-zinc-950 border border-zinc-700 flex-shrink-0 relative ${
                                  isCurrent && isPlaying ? 'animate-spin' : ''
                                }`}
                                style={{ animationDuration: '4s' }}
                              >
                                <img
                                  src={track.coverUrl}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                                {isCurrent && (
                                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                    <div className="w-2 h-2 rounded-full bg-amber-400" />
                                  </div>
                                )}
                              </div>

                              <div className="min-w-0">
                                <p className={`text-xs font-semibold truncate ${
                                  isCurrent ? 'text-amber-400' : 'text-zinc-100'
                                }`}>
                                  {track.title}
                                </p>
                                <p className="text-[11px] text-zinc-400 truncate">
                                  {track.artist}
                                </p>
                              </div>
                            </div>

                            <span className="text-[11px] font-mono text-zinc-400 ml-2">
                              {track.duration > 0
                                ? `${Math.floor(track.duration / 60)}:${Math.floor(
                                    track.duration % 60
                                  )
                                    .toString()
                                    .padStart(2, '0')}`
                                : '0:00'}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'playlists' && (
          <PlaylistGrid
            playlists={playlists}
            allTracks={tracks}
            selectedPlaylistId={selectedPlaylistId}
            onSelectPlaylist={id => {
              setSelectedPlaylistId(id);
              setActiveTab('library');
            }}
            onCreatePlaylist={handleCreatePlaylist}
            onDeletePlaylist={handleDeletePlaylist}
            onPlayPlaylist={handlePlayPlaylist}
            currentTrackId={currentTrack?.id}
            isPlaying={isPlaying}
          />
        )}

        {activeTab === 'library' && (
          <TrackList
            tracks={currentPlaylistTracks}
            currentTrackId={currentTrack?.id}
            isPlaying={isPlaying}
            onPlayTrack={handlePlayTrack}
            onToggleFavorite={handleToggleFavorite}
            onDeleteTrack={handleDeleteTrack}
            playlists={playlists}
            onAddTrackToPlaylist={handleAddTrackToPlaylist}
            onRemoveTrackFromPlaylist={handleRemoveTrackFromPlaylist}
            onUpdateTrackCover={handleUpdateTrackCover}
            activePlaylistId={selectedPlaylistId}
            activePlaylistTitle={activePlaylistTitle}
            onOpenUpload={() => setIsUploadOpen(true)}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
          />
        )}
      </main>

      {/* PERSISTENT BOTTOM PLAYER BAR (Shown on playlists tab or on desktop) */}
      <div className={activeTab === 'turntable' ? 'hidden lg:block' : 'block'}>
        <PlayerBar
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          volume={volume}
          isMuted={isMuted}
          isShuffle={isShuffle}
          repeatMode={repeatMode}
          crackleActive={crackleActive}
          onTogglePlay={togglePlay}
          onNextTrack={handleNextTrack}
          onPrevTrack={handlePrevTrack}
          onSeek={handleSeek}
          onChangeVolume={handleVolumeChange}
          onToggleMute={handleToggleMute}
          onToggleShuffle={handleToggleShuffle}
          onCycleRepeat={handleCycleRepeat}
          onToggleCrackle={() => setCrackleActive(!crackleActive)}
          onToggleFavorite={handleToggleFavorite}
          onOpenTurntable={() => setActiveTab('turntable')}
        />
      </div>

      {/* UPLOAD MODAL */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        playlists={playlists}
        onTracksUploaded={handleTracksUploaded}
      />
    </div>
  );
}
