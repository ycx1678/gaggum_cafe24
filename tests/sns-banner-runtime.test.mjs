import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

test("SNS 배너는 캐시가 분리된 v76 스크립트에서 아이콘 설정을 실행한다", () => {
  const partial = readFileSync("nd/sns_bnn.html", "utf8");
  assert.match(partial, /\/nd\/js\/sns_bnn_v76\.js/);

  const source = readFileSync("nd/js/sns_bnn_v76.js", "utf8");
  let readyCallback;
  const $ = (value) => {
    if (typeof value === "function") {
      readyCallback = value;
      return;
    }
    return {
      length: 0,
      each() {},
    };
  };
  vm.runInNewContext(source, { $ });
  assert.equal(typeof readyCallback, "function");
  assert.doesNotThrow(() => readyCallback());
});
