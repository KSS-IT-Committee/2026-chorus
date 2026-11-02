import sharp from "sharp";

export async function artworkExtension(data: Buffer): Promise<string> {
  if (data.length === 0 || data.length > 5 * 1024 * 1024) {
    throw new Error("Artwork must be between 1 byte and 5 MB");
  }

  const image = sharp(data, { failOn: "warning", limitInputPixels: 40_000_000 });
  const { format } = await image.metadata();
  const extensions: Record<string, string> = { jpeg: "jpg", png: "png", webp: "webp" };
  if (!format || !extensions[format]) throw new Error("Unsupported artwork format");
  await image.resize(1, 1, { fit: "inside" }).toBuffer();
  return extensions[format];
}
