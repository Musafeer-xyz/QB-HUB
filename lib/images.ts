import fs from "node:fs";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "data");
const IMAGE_DIR = path.join(DATA_DIR, "images");

export const IMAGE_BUCKET = "qb-images";

/**
 * Get the public URL for a question image.
 * This is a client-safe function that returns a URL string.
 */
export function questionImageUrl(filename: string | null): string | null {
  if (!filename) return null;
  // In production, this would be a Supabase Storage URL
  // For now, return a relative path that works with the image proxy
  return `/api/images/${filename}`;
}

/** Image dimension cache to avoid repeated file reads. */
const DIMENSION_CACHE = new Map<string, { width: number; height: number } | null>();

/**
 * Get the intrinsic dimensions of an image file.
 * Returns null if the file doesn't exist or dimensions can't be read.
 * This is a simple implementation that reads the file header for common formats.
 * For production, consider using a proper image processing library like sharp.
 */
export function getImageDimensions(filename: string | null): { width: number; height: number } | null {
  if (!filename) return null;

  // Check cache first
  const cached = DIMENSION_CACHE.get(filename);
  if (cached !== undefined) return cached;

  try {
    const imagePath = path.join(IMAGE_DIR, filename);
    if (!fs.existsSync(imagePath)) {
      DIMENSION_CACHE.set(filename, null);
      return null;
    }

    const buffer = fs.readFileSync(imagePath);

    // Simple PNG dimension extraction
    if (buffer.length > 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
      const width = buffer.readUInt32BE(16);
      const height = buffer.readUInt32BE(20);
      const dims = { width, height };
      DIMENSION_CACHE.set(filename, dims);
      return dims;
    }

    // Simple JPEG dimension extraction
    if (buffer.length > 2 && buffer[0] === 0xff && buffer[1] === 0xd8) {
      let i = 2;
      while (i < buffer.length) {
        if (buffer[i] !== 0xff) break;
        const marker = buffer[i + 1];
        if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
          const height = buffer.readUInt16BE(i + 5);
          const width = buffer.readUInt16BE(i + 7);
          const dims = { width, height };
          DIMENSION_CACHE.set(filename, dims);
          return dims;
        }
        i += 2 + buffer.readUInt16BE(i + 2);
      }
    }

    // If we can't parse, return null but cache it to avoid re-reading
    DIMENSION_CACHE.set(filename, null);
    return null;
  } catch {
    DIMENSION_CACHE.set(filename, null);
    return null;
  }
}

/** Clear the dimension cache (useful for testing). */
export function clearDimensionCache(): void {
  DIMENSION_CACHE.clear();
}
