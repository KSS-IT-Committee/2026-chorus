import assert from "node:assert/strict";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { registerHooks } from "node:module";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import sharp from "sharp";

const dir = await mkdtemp(path.join(os.tmpdir(), "chorus-artwork-"));
process.env.UPLOADS_DIR = dir;
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only")
      return { url: "data:text/javascript,", shortCircuit: true };
    if (specifier === "@/lib/db")
      return {
        url: "data:text/javascript,export const db = globalThis.artworkTestDb",
        shortCircuit: true,
      };
    if (specifier.startsWith("@/"))
      return nextResolve(
        new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url).href,
        context,
      );
    return nextResolve(specifier, context);
  },
});

let mode;
globalThis.artworkTestDb = {
  async transaction(callback) {
    const tx = {
      select: () => ({
        from: () => ({
          where: () => ({
            for: async () =>
              mode === "missing" ? [] : [{ artworkFilename: null }],
          }),
        }),
      }),
      update: () => ({
        set: () => ({
          where: async () => {
            if (mode === "update") throw new Error("update failed");
          },
        }),
      }),
    };
    const result = await callback(tx);
    if (mode === "commit") throw new Error("commit outcome unknown");
    return result;
  },
};
const { saveSongArtwork } = await import("../src/lib/artwork.ts");
const image = await sharp({
  create: { width: 2, height: 2, channels: 3, background: "red" },
})
  .png()
  .toBuffer();

test("failed writes clean up only when the transaction cannot have committed", async () => {
  try {
    mode = "missing";
    await assert.rejects(saveSongArtwork(1, image), /Song not found/);
    await assert.rejects(readdir(path.join(dir, "artwork")), {
      code: "ENOENT",
    });

    mode = "update";
    await assert.rejects(saveSongArtwork(1, image), /update failed/);
    assert.deepEqual(await readdir(path.join(dir, "artwork")), []);

    mode = "commit";
    await assert.rejects(saveSongArtwork(1, image), /commit outcome unknown/);
    assert.equal((await readdir(path.join(dir, "artwork"))).length, 1);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
