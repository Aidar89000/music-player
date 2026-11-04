import { Track, Playlist } from '../types/music';

/**
 * Encodes an AudioBuffer to a standard 16-bit PCM WAV Blob
 */
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;

  const length = buffer.length * blockAlign;
  const arrayBuffer = new ArrayBuffer(44 + length);
  const view = new DataView(arrayBuffer);

  // Helper to write ASCII string
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  /* RIFF identifier */
  writeString(0, 'RIFF');
  /* file length */
  view.setUint32(4, 36 + length, true);
  /* RIFF type */
  writeString(8, 'WAVE');
  /* format chunk identifier */
  writeString(12, 'fmt ');
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw) */
  view.setUint16(20, format, true);
  /* channel count */
  view.setUint16(22, numChannels, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  view.setUint32(28, sampleRate * blockAlign, true);
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, blockAlign, true);
  /* bits per sample */
  view.setUint16(34, bitDepth, true);
  /* data chunk identifier */
  writeString(36, 'data');
  /* data chunk length */
  view.setUint32(40, length, true);

  // Write interleaved PCM samples
  const channels: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) {
    channels.push(buffer.getChannelData(c));
  }

  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let c = 0; c < numChannels; c++) {
      const sample = Math.max(-1, Math.min(1, channels[c][i]));
      // Convert float [-1, 1] to 16-bit integer
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

/**
 * Synthesizes a lo-fi jazz chord progression with vinyl dust
 */
async function synthesizeLofiTrack(): Promise<Blob> {
  const sampleRate = 44100;
  const duration = 12; // 12-second loop
  const offlineCtx = new OfflineAudioContext(2, sampleRate * duration, sampleRate);

  // Chords: Dm9 -> G13 -> Cmaj9 -> A7b13
  const chords = [
    [293.66, 349.23, 440.0, 523.25, 659.25], // Dm9
    [196.0, 329.63, 392.0, 440.0, 587.33],   // G13
    [261.63, 329.63, 392.0, 493.88, 659.25], // Cmaj9
    [220.0, 329.63, 415.3, 523.25, 622.25],  // A7b13
  ];

  const chordDuration = 3;

  for (let i = 0; i < 4; i++) {
    const startTime = i * chordDuration;
    const chord = chords[i];

    chord.forEach((freq, noteIdx) => {
      const osc = offlineCtx.createOscillator();
      const gain = offlineCtx.createGain();
      const filter = offlineCtx.createBiquadFilter();

      // Warm mellow electric piano / rhodes tone
      osc.type = noteIdx === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      // Filter
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, startTime);
      filter.frequency.exponentialRampToValueAtTime(700, startTime + chordDuration);

      // Envelope
      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(0.12 / chord.length, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.005, startTime + chordDuration - 0.02);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(offlineCtx.destination);

      osc.start(startTime);
      osc.stop(startTime + chordDuration);
    });

    // Soft kick and snare pulse
    const kickOsc = offlineCtx.createOscillator();
    const kickGain = offlineCtx.createGain();
    kickOsc.frequency.setValueAtTime(120, startTime);
    kickOsc.frequency.exponentialRampToValueAtTime(45, startTime + 0.25);
    kickGain.gain.setValueAtTime(0.35, startTime);
    kickGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);
    kickOsc.connect(kickGain);
    kickGain.connect(offlineCtx.destination);
    kickOsc.start(startTime);
    kickOsc.stop(startTime + 0.35);

    // Snare / rimshot on beat 2 & 4
    for (const snareOffset of [1.5]) {
      const noiseBuffer = offlineCtx.createBuffer(1, sampleRate * 0.1, sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let s = 0; s < noiseBuffer.length; s++) {
        output[s] = Math.random() * 2 - 1;
      }
      const noise = offlineCtx.createBufferSource();
      noise.buffer = noiseBuffer;
      const snareFilter = offlineCtx.createBiquadFilter();
      snareFilter.type = 'bandpass';
      snareFilter.frequency.value = 2200;
      const snareGain = offlineCtx.createGain();
      snareGain.gain.setValueAtTime(0.09, startTime + snareOffset);
      snareGain.gain.exponentialRampToValueAtTime(0.001, startTime + snareOffset + 0.1);
      noise.connect(snareFilter);
      snareFilter.connect(snareGain);
      snareGain.connect(offlineCtx.destination);
      noise.start(startTime + snareOffset);
      noise.stop(startTime + snareOffset + 0.15);
    }
  }

  const rendered = await offlineCtx.startRendering();
  return audioBufferToWav(rendered);
}

/**
 * Synthesizes a Synthwave / Retro Cyber loop
 */
async function synthesizeSynthwaveTrack(): Promise<Blob> {
  const sampleRate = 44100;
  const duration = 10;
  const offlineCtx = new OfflineAudioContext(2, sampleRate * duration, sampleRate);

  // 120 BPM 16th note rolling synth bass in A minor
  const bassNotes = [110, 110, 110, 130.81, 110, 110, 146.83, 110];
  const stepTime = 0.25;
  const totalSteps = Math.floor(duration / stepTime);

  for (let s = 0; s < totalSteps; s++) {
    const time = s * stepTime;
    const freq = bassNotes[s % bassNotes.length];

    const osc = offlineCtx.createOscillator();
    const gain = offlineCtx.createGain();
    const filter = offlineCtx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1800, time);
    filter.frequency.exponentialRampToValueAtTime(350, time + stepTime);

    gain.gain.setValueAtTime(0.18, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + stepTime - 0.02);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(offlineCtx.destination);

    osc.start(time);
    osc.stop(time + stepTime);

    // Punchy electronic kick on beats 0, 2, 4, ...
    if (s % 2 === 0) {
      const kickOsc = offlineCtx.createOscillator();
      const kickGain = offlineCtx.createGain();
      kickOsc.frequency.setValueAtTime(150, time);
      kickOsc.frequency.exponentialRampToValueAtTime(40, time + 0.2);
      kickGain.gain.setValueAtTime(0.3, time);
      kickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
      kickOsc.connect(kickGain);
      kickGain.connect(offlineCtx.destination);
      kickOsc.start(time);
      kickOsc.stop(time + 0.22);
    }
  }

  // Dreamy pad chords on top
  const padChords = [
    [220, 261.63, 329.63, 392], // Am7
    [174.61, 220, 261.63, 329.63], // Fmaj7
  ];

  for (let i = 0; i < 2; i++) {
    const t = i * 5;
    padChords[i].forEach(f => {
      const osc = offlineCtx.createOscillator();
      const gain = offlineCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.03, t + 1.2);
      gain.gain.linearRampToValueAtTime(0.001, t + 4.9);
      osc.connect(gain);
      gain.connect(offlineCtx.destination);
      osc.start(t);
      osc.stop(t + 5);
    });
  }

  const rendered = await offlineCtx.startRendering();
  return audioBufferToWav(rendered);
}

/**
 * Synthesizes an ambient vinyl groove loop
 */
async function synthesizeVinylGrooveTrack(): Promise<Blob> {
  const sampleRate = 44100;
  const duration = 12;
  const offlineCtx = new OfflineAudioContext(2, sampleRate * duration, sampleRate);

  // Soft vinyl crackle noise layer
  const noiseBuffer = offlineCtx.createBuffer(2, sampleRate * duration, sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = noiseBuffer.getChannelData(ch);
    for (let i = 0; i < data.length; i++) {
      // Sporadic vinyl clicks and background air
      const isClick = Math.random() < 0.0008;
      data[i] = isClick ? (Math.random() - 0.5) * 0.4 : (Math.random() - 0.5) * 0.012;
    }
  }
  const noiseSource = offlineCtx.createBufferSource();
  noiseSource.buffer = noiseBuffer;
  const crackleFilter = offlineCtx.createBiquadFilter();
  crackleFilter.type = 'highpass';
  crackleFilter.frequency.value = 800;
  const noiseGain = offlineCtx.createGain();
  noiseGain.gain.value = 0.5;
  noiseSource.connect(crackleFilter);
  crackleFilter.connect(noiseGain);
  noiseGain.connect(offlineCtx.destination);
  noiseSource.start(0);

  // Warm kalimba / music box plucks
  const notes = [
    { time: 0.0, freq: 523.25 }, // C5
    { time: 0.75, freq: 587.33 }, // D5
    { time: 1.5, freq: 659.25 }, // E5
    { time: 2.25, freq: 783.99 }, // G5
    { time: 3.0, freq: 880.0 }, // A5
    { time: 4.5, freq: 659.25 },
    { time: 6.0, freq: 523.25 },
    { time: 7.5, freq: 440.0 },
    { time: 9.0, freq: 493.88 },
    { time: 10.5, freq: 523.25 },
  ];

  notes.forEach(n => {
    const osc = offlineCtx.createOscillator();
    const gain = offlineCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(n.freq, n.time);
    gain.gain.setValueAtTime(0.001, n.time);
    gain.gain.linearRampToValueAtTime(0.18, n.time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, n.time + 1.8);
    osc.connect(gain);
    gain.connect(offlineCtx.destination);
    osc.start(n.time);
    osc.stop(n.time + 1.9);
  });

  const rendered = await offlineCtx.startRendering();
  return audioBufferToWav(rendered);
}

/**
 * Create initial starter tracks and playlists
 */
export async function createInitialLibrary(): Promise<{ tracks: Track[]; playlists: Playlist[] }> {
  let blob1: Blob | undefined;
  let blob2: Blob | undefined;
  let blob3: Blob | undefined;

  try {
    [blob1, blob2, blob3] = await Promise.all([
      synthesizeLofiTrack(),
      synthesizeSynthwaveTrack(),
      synthesizeVinylGrooveTrack(),
    ]);
  } catch (err) {
    console.warn('Audio synthesis skipped, will use empty audio blobs:', err);
  }

  const tracks: Track[] = [
    {
      id: 'demo-1',
      title: 'Midnight Tokyo Lo-Fi',
      artist: 'Komorebi Sound',
      album: 'Rainy Tape Vol. 1',
      duration: 12,
      coverUrl: '/assets/aistudio/image_9323c18c.png',
      audioBlob: blob1,
      audioUrl: blob1 ? URL.createObjectURL(blob1) : '',
      dateAdded: Date.now() - 3600000 * 5,
      favorite: true,
      fileType: 'audio/wav',
      fileName: 'Komorebi - Midnight Tokyo.wav',
    },
    {
      id: 'demo-2',
      title: 'Cruel Neon Horizon',
      artist: 'Vestige Collective',
      album: 'Cruel 2026',
      duration: 10,
      coverUrl: '/assets/aistudio/image_b53ce576.png',
      audioBlob: blob2,
      audioUrl: blob2 ? URL.createObjectURL(blob2) : '',
      dateAdded: Date.now() - 3600000 * 3,
      favorite: false,
      fileType: 'audio/wav',
      fileName: 'Vestige - Cruel Neon Horizon.wav',
    },
    {
      id: 'demo-3',
      title: 'Warm Analog Dreams',
      artist: 'Velvet Needle',
      album: 'Vintage Sessions',
      duration: 12,
      coverUrl: '/assets/aistudio/image_b518c3c4.png',
      audioBlob: blob3,
      audioUrl: blob3 ? URL.createObjectURL(blob3) : '',
      dateAdded: Date.now() - 3600000 * 1,
      favorite: true,
      fileType: 'audio/wav',
      fileName: 'Velvet Needle - Warm Analog Dreams.wav',
    },
  ];

  const playlists: Playlist[] = [
    {
      id: 'pl-favorites',
      title: 'Избранное',
      description: 'Любимые треки с теплым ламповым звучанием',
      coverUrl: '/assets/aistudio/image_9323c18c.png',
      trackIds: ['demo-1', 'demo-3'],
      themeColor: '#ec4899',
      isSystem: true,
      createdAt: Date.now() - 86400000,
    },
    {
      id: 'pl-lofi',
      title: 'Lo-Fi & Chill',
      description: 'Мягкий ночной бит для работы и отдыха',
      coverUrl: '/assets/aistudio/image_b53ce576.png',
      trackIds: ['demo-1'],
      themeColor: '#8b5cf6',
      isSystem: false,
      createdAt: Date.now() - 43200000,
    },
    {
      id: 'pl-retrowave',
      title: 'Vinyl & Retro',
      description: 'Коллекция треков с виниловой эстетикой и CD кейсами',
      coverUrl: '/assets/aistudio/image_b518c3c4.png',
      trackIds: ['demo-1', 'demo-2', 'demo-3'],
      themeColor: '#06b6d4',
      isSystem: false,
      createdAt: Date.now() - 21600000,
    },
  ];

  return { tracks, playlists };
}
