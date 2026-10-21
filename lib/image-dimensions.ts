import fs from "node:fs";
import path from "node:path";

const IMAGE_DIR = path.join(process.cwd(), "data", "images");

const DIMENSION_CACHE = new Map<string, { width: number; height: number } | null>();

export function getImageDimensions(filename: string | null): { width: number; height: number } | null {
  if (!filename) return null;
  const cached = DIMENSION_CACHE.get(filename);
  if (cached !== undefined) return cached;

  try {
    const imagePath = path.join(IMAGE_DIR, filename);
    if (!fs.existsSync(imagePath)) {
      DIMENSION_CACHE.set(filename, null);
      return null;
    }
    const buffer = fs.readFileSync(imagePath);

    if (buffer.length > 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
      const dims = { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
      DIMENSION_CACHE.set(filename, dims);
      return dims;
    }

    if (buffer.length > 2 && buffer[0] === 0xff && buffer[1] === 0xd8) {
      let i = 2;
      while (i < buffer.length) {
        if (buffer[i] !== 0xff) break;
        const marker = buffer[i + 1];
        if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
          const dims = { width: buffer.readUInt16BE(i + 7), height: buffer.readUInt16BE(i + 5) };
          DIMENSION_CACHE.set(filename, dims);
          return dims;
        }
        i += 2 + buffer.readUInt16BE(i + 2);
      }
    }

    DIMENSION_CACHE.set(filename, null);
    return null;
  } catch {
    DIMENSION_CACHE.set(filename, null);
    return null;
  }
}

export function clearDimensionCache(): void {
  DIMENSION_CACHE.clear();
}