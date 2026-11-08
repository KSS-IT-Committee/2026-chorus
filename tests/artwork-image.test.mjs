import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { artworkExtension } from "../src/lib/artwork-image.ts";

for (const [format, extension] of [
  ["jpeg", "jpg"],
  ["png", "png"],
  ["webp", "webp"],
]) {
  test(`accepts ${format}`, async () => {
    const image = await sharp({
      create: { width: 2, height: 2, channels: 3, background: "red" },
    })
      .toFormat(format)
      .toBuffer();
    assert.equal(await artworkExtension(image), extension);
    await assert.rejects(artworkExtension(image.subarray(0, 15)));
  });
}

test("rejects empty, oversized and unsupported data", async () => {
  await assert.rejects(artworkExtension(Buffer.alloc(0)));
  await assert.rejects(artworkExtension(Buffer.alloc(5 * 1024 * 1024 + 1)));
  await assert.rejects(artworkExtension(Buffer.from("not an image")));
  const gif = await sharp({
    create: { width: 2, height: 2, channels: 3, background: "red" },
  })
    .gif()
    .toBuffer();
  await assert.rejects(artworkExtension(gif));
});
