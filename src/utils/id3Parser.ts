/**
 * Lightweight binary ID3v2 parser for reading Title, Artist, Album, and APIC embedded artwork
 */

export interface ParsedID3 {
  title?: string;
  artist?: string;
  album?: string;
  coverBlob?: Blob;
  coverUrl?: string;
}

export async function parseAudioMetadata(file: File): Promise<ParsedID3> {
  const result: ParsedID3 = {};

  try {
    // Read the first 512KB which contains ID3v2 header & tags (including embedded album art)
    const headerSlice = file.slice(0, Math.min(file.size, 512 * 1024));
    const buffer = await headerSlice.arrayBuffer();
    const view = new DataView(buffer);

    // Check for "ID3" tag
    if (
      buffer.byteLength >= 10 &&
      view.getUint8(0) === 0x49 && // 'I'
      view.getUint8(1) === 0x44 && // 'D'
      view.getUint8(2) === 0x33    // '3'
    ) {
      const version = view.getUint8(3); // e.g. 3 for ID3v2.3, 4 for ID3v2.4
      // Read tag size (synchsafe integer: 4 bytes, 7 bits each)
      const tagSize =
        ((view.getUint8(6) & 0x7f) << 21) |
        ((view.getUint8(7) & 0x7f) << 14) |
        ((view.getUint8(8) & 0x7f) << 7) |
        (view.getUint8(9) & 0x7f);

      const maxOffset = Math.min(buffer.byteLength, 10 + tagSize);
      let offset = 10;

      while (offset + 10 < maxOffset) {
        // Frame ID (4 bytes)
        const frameId = String.fromCharCode(
          view.getUint8(offset),
          view.getUint8(offset + 1),
          view.getUint8(offset + 2),
          view.getUint8(offset + 3)
        );

        if (!/^[A-Z0-9]{4}$/.test(frameId)) {
          // Reached padding/zeros
          break;
        }

        // Frame size (in ID3v2.4 it's synchsafe, in 2.3 it's standard 32-bit int)
        let frameSize = 0;
        if (version === 4) {
          frameSize =
            ((view.getUint8(offset + 4) & 0x7f) << 21) |
            ((view.getUint8(offset + 5) & 0x7f) << 14) |
            ((view.getUint8(offset + 6) & 0x7f) << 7) |
            (view.getUint8(offset + 7) & 0x7f);
        } else {
          frameSize = view.getUint32(offset + 4, false);
        }

        offset += 10;
        if (frameSize <= 0 || offset + frameSize > buffer.byteLength) {
          break;
        }

        const frameData = new Uint8Array(buffer, offset, frameSize);

        if (frameId === 'TIT2') {
          result.title = decodeTextFrame(frameData);
        } else if (frameId === 'TPE1') {
          result.artist = decodeTextFrame(frameData);
        } else if (frameId === 'TALB') {
          result.album = decodeTextFrame(frameData);
        } else if (frameId === 'APIC' && !result.coverBlob) {
          const pic = extractApicPicture(frameData);
          if (pic) {
            result.coverBlob = pic;
            result.coverUrl = URL.createObjectURL(pic);
          }
        }

        offset += frameSize;
      }
    }
  } catch (err) {
    console.warn('ID3 parsing skipped or failed:', err);
  }

  return result;
}

function decodeTextFrame(bytes: Uint8Array): string {
  if (bytes.length < 2) return '';
  const encoding = bytes[0];
  const payload = bytes.subarray(1);

  try {
    if (encoding === 0) {
      // ISO-8859-1 / ASCII
      return new TextDecoder('latin1').decode(payload).replace(/\0+$/, '').trim();
    } else if (encoding === 1) {
      // UTF-16 with BOM
      return new TextDecoder('utf-16').decode(payload).replace(/\0+$/, '').trim();
    } else if (encoding === 2) {
      // UTF-16BE
      return new TextDecoder('utf-16be').decode(payload).replace(/\0+$/, '').trim();
    } else if (encoding === 3) {
      // UTF-8
      return new TextDecoder('utf-8').decode(payload).replace(/\0+$/, '').trim();
    }
  } catch {
    // Fallback
    return new TextDecoder('utf-8', { fatal: false }).decode(payload).replace(/\0+$/, '').trim();
  }
  return '';
}

function extractApicPicture(bytes: Uint8Array): Blob | null {
  try {
    if (bytes.length < 10) return null;
    const encoding = bytes[0];
    let offset = 1;

    // MIME type (terminated by 0x00)
    let mime = '';
    while (offset < bytes.length && bytes[offset] !== 0) {
      mime += String.fromCharCode(bytes[offset]);
      offset++;
    }
    offset++; // Skip 0x00 delimiter

    if (!mime || mime === '-->') {
      mime = 'image/jpeg';
    }

    // Picture type (1 byte)
    // const pictureType = bytes[offset];
    offset++;

    // Description (terminated by 0x00 or 0x00 0x00 depending on encoding)
    if (encoding === 1 || encoding === 2) {
      // 2-byte terminator
      while (offset + 1 < bytes.length && !(bytes[offset] === 0 && bytes[offset + 1] === 0)) {
        offset += 2;
      }
      offset += 2;
    } else {
      while (offset < bytes.length && bytes[offset] !== 0) {
        offset++;
      }
      offset++;
    }

    if (offset < bytes.length) {
      const imageBytes = bytes.slice(offset);
      return new Blob([imageBytes], { type: mime });
    }
  } catch (err) {
    console.warn('Error extracting APIC picture:', err);
  }
  return null;
}

/**
 * Generate a procedural aesthetic vinyl/CD cover SVG Data URL if track has no album art
 */
export function generateFallbackCover(title: string, artist: string, seed: string = ''): string {
  // Deterministic colors based on track title & artist
  const str = `${title}-${artist}-${seed}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }

  const hue1 = Math.abs(hash) % 360;
  const hue2 = (hue1 + 45 + (Math.abs(hash >> 3) % 90)) % 360;
  const c1 = `hsl(${hue1}, 75%, 45%)`;
  const c2 = `hsl(${hue2}, 85%, 20%)`;
  const c3 = `hsl(${(hue1 + 180) % 360}, 65%, 60%)`;

  const initials = (title.slice(0, 1) + (artist !== 'Неизвестный исполнитель' ? artist.slice(0, 1) : '')).toUpperCase() || '♪';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${c1}" />
        <stop offset="60%" stop-color="${c2}" />
        <stop offset="100%" stop-color="#0a0a0f" />
      </linearGradient>
      <radialGradient id="ring" cx="50%" cy="50%" r="50%">
        <stop offset="70%" stop-color="transparent" />
        <stop offset="95%" stop-color="rgba(255,255,255,0.15)" />
        <stop offset="100%" stop-color="transparent" />
      </radialGradient>
    </defs>
    <rect width="400" height="400" fill="url(#g)" />
    <circle cx="200" cy="200" r="170" fill="none" stroke="${c3}" stroke-width="2" opacity="0.3" stroke-dasharray="8 6"/>
    <circle cx="200" cy="200" r="140" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="1.5" />
    <circle cx="200" cy="200" r="90" fill="url(#ring)" />
    <circle cx="200" cy="200" r="45" fill="rgba(0,0,0,0.4)" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>
    <text x="200" y="212" font-family="system-ui, sans-serif" font-weight="bold" font-size="34" fill="#ffffff" text-anchor="middle" letter-spacing="2">${initials}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
