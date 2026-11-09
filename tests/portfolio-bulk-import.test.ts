import test from "node:test";
import assert from "node:assert/strict";
import { deflateRawSync } from "node:zlib";
import { extractPortfolioImages, portfolioFilenameSlot, portfolioImageMime } from "../src/lib/portfolioBulkImport.ts";

function makeZip(entries: Array<{ filename: string; content: Uint8Array }>): File {
  const local: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.filename, "utf8");
    const original = Buffer.from(entry.content);
    const compressed = deflateRawSync(original);
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(8, 8);
    header.writeUInt32LE(compressed.length, 18);
    header.writeUInt32LE(original.length, 22);
    header.writeUInt16LE(name.length, 26);
    local.push(header, name, compressed);
    const record = Buffer.alloc(46);
    record.writeUInt32LE(0x02014b50, 0);
    record.writeUInt16LE(20, 4);
    record.writeUInt16LE(20, 6);
    record.writeUInt16LE(8, 10);
    record.writeUInt32LE(compressed.length, 20);
    record.writeUInt32LE(original.length, 24);
    record.writeUInt16LE(name.length, 28);
    record.writeUInt32LE(offset, 42);
    central.push(record, name);
    offset += header.length + name.length + compressed.length;
  }
  const directory = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  const zip = Buffer.concat([...local, directory, end]);
  return new File([zip], "Bennie_Studio_Portfolio_18_Site_Images.zip", { type: "application/zip" });
}

test("portfolio filenames map exactly to existing slug and screenshot slots", () => {
  assert.deepEqual(portfolioFilenameSlot("images/physiotherapy-clinic-cover.webp"), { slug: "physiotherapy-clinic", slot: "coverImage" });
  assert.deepEqual(portfolioFilenameSlot("dental-clinic-desktop.webp"), { slug: "dental-clinic", slot: "desktopImage" });
  assert.deepEqual(portfolioFilenameSlot("business-consulting-mobile.webp"), { slug: "business-consulting", slot: "mobileImage" });
  assert.equal(portfolioFilenameSlot("upload_manifest.csv"), null);
  assert.equal(portfolioFilenameSlot("../../secret.txt"), null);
  assert.equal(portfolioFilenameSlot("dental-clinic-poster.svg"), null);
  assert.equal(portfolioImageMime("clinic-cover.webp"), "image/webp");
});

test("extracting a ZIP yields individual, typed images and ignores non-image manifest files", async () => {
  const image1 = Buffer.from("RIFF-not-real-image-just-zip-test");
  const image2 = Buffer.from("RIFF-second-image-data");
  const zip = makeZip([
    { filename: "images/physiotherapy-clinic-cover.webp", content: image1 },
    { filename: "upload_manifest.csv", content: Buffer.from("slug,title\n") },
    { filename: "images/physiotherapy-clinic-desktop.webp", content: image2 },
  ]);
  const images = await extractPortfolioImages(zip);
  assert.equal(images.length, 2);
  assert.equal(images[0].name, "physiotherapy-clinic-cover.webp");
  assert.equal(images[0].type, "image/webp");
  assert.deepEqual(Buffer.from(await images[0].arrayBuffer()), image1);
  assert.deepEqual(Buffer.from(await images[1].arrayBuffer()), image2);
});

test("ZIP input without matching portfolio artwork is rejected", async () => {
  const zip = makeZip([{ filename: "README.txt", content: Buffer.from("hello") }]);
  await assert.rejects(extractPortfolioImages(zip), /No valid/);
  await assert.rejects(extractPortfolioImages(new File(["wrong"], "broken.zip")), /ZIP/);
});
