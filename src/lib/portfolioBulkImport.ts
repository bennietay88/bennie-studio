/** Filename mapping and a bounded ZIP reader for portfolio screenshot imports.
 * The importer only accepts named image slots in known portfolio entries.
 * ZIP parsing uses the central directory; no JavaScript ZIP dependency is required.
 */
export type PortfolioImageSlot = "coverImage" | "desktopImage" | "mobileImage";

export function portfolioFilenameSlot(filename: string): { slug: string; slot: PortfolioImageSlot } | null {
  const name = filename.replace(/\\/g, "/").split("/").pop() || "";
  const match = /^([a-z0-9]+(?:-[a-z0-9]+)*)-(cover|desktop|mobile)\.(webp|avif|png|jpe?g)$/i.exec(name);
  if (!match) return null;
  return {
    slug: match[1].toLowerCase(),
    slot: ({ cover: "coverImage", desktop: "desktopImage", mobile: "mobileImage" } as const)[match[2].toLowerCase() as "cover" | "desktop" | "mobile"],
  };
}

export function portfolioImageMime(name: string): string | null {
  const ext = name.split(".").pop()?.toLowerCase();
  return ({ webp: "image/webp", avif: "image/avif", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg" } as Record<string,string>)[ext || ""] || null;
}

const ZIP_EOCD = 0x06054b50;
const ZIP_CENTRAL = 0x02014b50;
const ZIP_LOCAL = 0x04034b50;
const MAX_ARCHIVE_BYTES = 30 * 1024 * 1024;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_UNPACKED_BYTES = 90 * 1024 * 1024;

/** Extract only named portfolio screenshot images; ignore ZIP metadata, folders and manifest. */
export async function extractPortfolioImages(archive: File): Promise<File[]> {
  if (archive.size < 22 || archive.size > MAX_ARCHIVE_BYTES) throw new Error("The ZIP must be between 22 bytes and 30 MB.");
  const data = await archive.arrayBuffer();
  const view = new DataView(data);
  let endRecord = -1;
  for (let i = data.byteLength - 22; i >= Math.max(0, data.byteLength - 65557); i--) {
    if (view.getUint32(i, true) === ZIP_EOCD) { endRecord = i; break; }
  }
  if (endRecord < 0) throw new Error("This is not a supported ZIP archive.");
  const entries = view.getUint16(endRecord + 10, true);
  const directorySize = view.getUint32(endRecord + 12, true);
  let pointer = view.getUint32(endRecord + 16, true);
  if (entries === 0 || entries > 240 || pointer + directorySize > endRecord) throw new Error("ZIP archive directory is invalid or too large.");
  const images: File[] = [];
  let unpacked = 0;
  const decoder = new TextDecoder("utf-8");
  for (let i = 0; i < entries; i++) {
    if (pointer + 46 > data.byteLength || view.getUint32(pointer, true) !== ZIP_CENTRAL) throw new Error("ZIP directory contains an invalid entry.");
    const flags = view.getUint16(pointer + 8, true);
    const method = view.getUint16(pointer + 10, true);
    const compressedSize = view.getUint32(pointer + 20, true);
    const uncompressedSize = view.getUint32(pointer + 24, true);
    const nameLength = view.getUint16(pointer + 28, true);
    const extraLength = view.getUint16(pointer + 30, true);
    const commentLength = view.getUint16(pointer + 32, true);
    const offset = view.getUint32(pointer + 42, true);
    const end = pointer + 46 + nameLength + extraLength + commentLength;
    if (end > data.byteLength) throw new Error("ZIP entry metadata is incomplete.");
    const name = decoder.decode(new Uint8Array(data, pointer + 46, nameLength));
    pointer = end;
    if (!portfolioFilenameSlot(name)) continue;
    if (flags & 1 || (method !== 0 && method !== 8)) throw new Error(`Unsupported ZIP encoding for ${name}.`);
    if (!uncompressedSize || uncompressedSize > MAX_IMAGE_BYTES || compressedSize > MAX_ARCHIVE_BYTES) {
      throw new Error(`Image ${name} exceeds the 5 MB limit or is empty.`);
    }
    unpacked += uncompressedSize;
    if (unpacked > MAX_UNPACKED_BYTES || images.length >= 180) throw new Error("Too many or oversized images in the ZIP.");
    if (offset + 30 > data.byteLength || view.getUint32(offset, true) !== ZIP_LOCAL) throw new Error(`Image ${name} has an invalid ZIP offset.`);
    const localNameSize = view.getUint16(offset + 26, true);
    const localExtraSize = view.getUint16(offset + 28, true);
    const start = offset + 30 + localNameSize + localExtraSize;
    if (start + compressedSize > data.byteLength) throw new Error(`Image ${name} is incomplete.`);
    const compressed = data.slice(start, start + compressedSize);
    let bytes = compressed;
    if (method === 8) {
      if (typeof DecompressionStream === "undefined") throw new Error("Your browser cannot extract this ZIP. Unzip it locally and select all images instead.");
      try {
        const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
        bytes = await new Response(stream).arrayBuffer();
      } catch {
        throw new Error("Unable to decompress this ZIP in your browser. Extract it first, then select all WebP images.");
      }
    }
    if (bytes.byteLength !== uncompressedSize) throw new Error(`Image ${name} failed the ZIP size check.`);
    const basename = name.replace(/\\/g, "/").split("/").pop() || name;
    images.push(new File([bytes], basename, { type: portfolioImageMime(basename) || "application/octet-stream" }));
  }
  if (!images.length) throw new Error("No valid <slug>-cover/-desktop/-mobile image files found.");
  return images;
}
