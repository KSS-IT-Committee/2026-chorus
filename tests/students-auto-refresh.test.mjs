import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

for (const intervalMs of [undefined, 3_000]) {
  test(`refreshes visible pages at ${intervalMs ?? 10_000} ms and on return`, () => {
    let refreshes = 0;
    let tick;
    let onVisibilityChange;
    let cleanup;
    let cleared = false;
    const document = {
      visibilityState: "visible",
      addEventListener: (_event, callback) => {
        onVisibilityChange = callback;
      },
      removeEventListener: (_event, callback) => {
        assert.equal(callback, onVisibilityChange);
        onVisibilityChange = null;
      },
    };
    const modules = {
      "next/navigation": {
        useRouter: () => ({
          refresh: () => {
            refreshes++;
          },
        }),
      },
      react: {
        useEffect: (effect) => {
          cleanup = effect();
        },
      },
    };
    const code = ts.transpileModule(
      fs.readFileSync(
        new URL(
          "../src/app/dashboard/students/AutoRefresh.tsx",
          import.meta.url,
        ),
        "utf8",
      ),
      { compilerOptions: { module: ts.ModuleKind.CommonJS } },
    ).outputText;
    const exports = {};
    vm.runInNewContext(code, {
      exports,
      require: (id) => modules[id],
      document,
      window: {
        setInterval: (callback, delay) => {
          assert.equal(delay, intervalMs ?? 10_000);
          tick = callback;
          return 1;
        },
        clearInterval: (id) => {
          assert.equal(id, 1);
          cleared = true;
        },
      },
    });
    exports.AutoRefresh({ intervalMs });
    tick();
    assert.equal(refreshes, 1);
    document.visibilityState = "hidden";
    tick();
    onVisibilityChange();
    assert.equal(refreshes, 1);
    document.visibilityState = "visible";
    onVisibilityChange();
    assert.equal(refreshes, 2);
    cleanup();
    assert.equal(cleared, true);
    assert.equal(onVisibilityChange, null);
  });
}
