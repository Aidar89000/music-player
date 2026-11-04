import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatTime,
  parseFileNameToMetadata,
  getNextTrackIndex,
  getPrevTrackIndex,
  shuffleQueue,
  filterTracks,
} from './musicLogic';
import { Track } from '../types/music';

test('formatTime formats seconds properly', () => {
  assert.equal(formatTime(0), '0:00');
  assert.equal(formatTime(24), '0:24');
  assert.equal(formatTime(65), '1:05');
  assert.equal(formatTime(3599), '59:59');
  assert.equal(formatTime(3665), '1:01:05');
  assert.equal(formatTime(-5), '0:00');
});

test('parseFileNameToMetadata handles various audio file name conventions', () => {
  const t1 = parseFileNameToMetadata('Queen - Bohemian Rhapsody.mp3');
  assert.equal(t1.artist, 'Queen');
  assert.equal(t1.title, 'Bohemian Rhapsody');

  const t2 = parseFileNameToMetadata('04. Daft Punk - Get Lucky.flac');
  assert.equal(t2.artist, '04. Daft Punk');
  assert.equal(t2.title, 'Get Lucky');

  const t3 = parseFileNameToMetadata('Midnight City.wav');
  assert.equal(t3.artist, 'Неизвестный исполнитель');
  assert.equal(t3.title, 'Midnight City');
});

test('getNextTrackIndex respects boundaries and repeat modes', () => {
  // Normal flow
  assert.equal(getNextTrackIndex(0, 3, 'off'), 1);
  assert.equal(getNextTrackIndex(1, 3, 'off'), 2);
  assert.equal(getNextTrackIndex(2, 3, 'off'), -1); // End reached

  // Repeat All
  assert.equal(getNextTrackIndex(2, 3, 'all'), 0); // Loops back

  // Repeat One
  assert.equal(getNextTrackIndex(1, 3, 'one'), 1);
});

test('getPrevTrackIndex restarts if song played > 3 seconds, or goes to previous', () => {
  // If > 3 seconds, stay on current track (restart)
  assert.equal(getPrevTrackIndex(2, 5, 10), 2);

  // If <= 3 seconds, go to previous
  assert.equal(getPrevTrackIndex(2, 5, 1), 1);
  assert.equal(getPrevTrackIndex(0, 5, 0), 4); // wrap to last track
});

test('shuffleQueue preserves current track at front', () => {
  const tracks: Track[] = [
    { id: '1', title: 'T1', artist: 'A', album: 'B', duration: 100, coverUrl: '', audioUrl: '', dateAdded: 1, favorite: false, fileType: 'audio/mp3' },
    { id: '2', title: 'T2', artist: 'A', album: 'B', duration: 100, coverUrl: '', audioUrl: '', dateAdded: 1, favorite: false, fileType: 'audio/mp3' },
    { id: '3', title: 'T3', artist: 'A', album: 'B', duration: 100, coverUrl: '', audioUrl: '', dateAdded: 1, favorite: false, fileType: 'audio/mp3' },
    { id: '4', title: 'T4', artist: 'A', album: 'B', duration: 100, coverUrl: '', audioUrl: '', dateAdded: 1, favorite: false, fileType: 'audio/mp3' },
  ];

  const shuffled = shuffleQueue(tracks, '3');
  assert.equal(shuffled.length, 4);
  assert.equal(shuffled[0].id, '3'); // pinned to front
});

test('filterTracks filters by title, artist, or album', () => {
  const tracks: Track[] = [
    { id: '1', title: 'Sunset Lover', artist: 'Petit Biscuit', album: 'Presence', duration: 200, coverUrl: '', audioUrl: '', dateAdded: 1, favorite: false, fileType: 'audio/mp3' },
    { id: '2', title: 'Starboy', artist: 'The Weeknd', album: 'Starboy', duration: 230, coverUrl: '', audioUrl: '', dateAdded: 1, favorite: false, fileType: 'audio/mp3' },
    { id: '3', title: 'Midnight Tokyo Lo-Fi', artist: 'Komorebi Sound', album: 'Rainy Tape Vol. 1', duration: 180, coverUrl: '', audioUrl: '', dateAdded: 1, favorite: false, fileType: 'audio/wav' },
  ];

  assert.equal(filterTracks(tracks, 'biscuit').length, 1);
  assert.equal(filterTracks(tracks, 'starboy').length, 1);
  assert.equal(filterTracks(tracks, 'presence').length, 1); // album match
  assert.equal(filterTracks(tracks, 'midnight lo-fi').length, 1); // multi-term match
  assert.equal(filterTracks(tracks, 'rainy tape').length, 1); // album multi-term
  assert.equal(filterTracks(tracks, 'xyz').length, 0);
  assert.equal(filterTracks(tracks, '').length, 3);
});
