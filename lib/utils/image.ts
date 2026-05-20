import sharp from "sharp";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB pre-compress cap
const OUTPUT_WIDTH = 1200;
const HERO_WIDTH = 1600;
const WEBP_QUALITY = 80;

export class ImageTooLargeError extends Error {
  constructor() {
    super("Image must be under 5 MB before compression.");
    this.name = "ImageTooLargeError";
  }
}

export interface CompressResult {
  buffer: Buffer;
  width: number;
  height: number;
  sizeBytes: number;
}

export async function compressToWebP(
  input: Buffer,
  options: { maxWidth?: number } = {}
): Promise<CompressResult> {
  if (input.byteLength > MAX_BYTES) throw new ImageTooLargeError();

  const maxWidth = options.maxWidth ?? OUTPUT_WIDTH;

  const { data, info } = await sharp(input)
    .rotate() // auto-orient from EXIF, then strips EXIF
    .resize(maxWidth, undefined, { withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer({ resolveWithObject: true });

  return {
    buffer: data,
    width: info.width,
    height: info.height,
    sizeBytes: info.size,
  };
}

export async function compressHeroToWebP(input: Buffer): Promise<CompressResult> {
  return compressToWebP(input, { maxWidth: HERO_WIDTH });
}
