import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runtimePath = path.join(root, "nd/js/quote_order_v204.js");

test("Cafe24 payment change storms schedule only one bank-policy sync", () => {
  const source = readFileSync(runtimePath, "utf8");
  assert.match(
    source,
    /document\.addEventListener\("change",[\s\S]*?scheduleBankDepositSync\(\);[\s\S]*?\}, true\);/,
    "payment change events use the coalescing scheduler",
  );
  assert.doesNotMatch(
    source,
    /window\.setTimeout\(forceBankDeposit, 0\)/,
    "payment clicks do not bypass the coalescing scheduler",
  );
  const callHook = "                forceBankDeposit();";
  const exportHook = "    function shippingPaymentLabel(expected) {";
  const instrumented = source
    .replace(callHook, "                (window.__testForceBankDeposit || forceBankDeposit)();")
    .replace(
      exportHook,
      "    window.__testScheduleBankDepositSync = scheduleBankDepositSync;\n\n" + exportHook,
    );

  assert.notEqual(instrumented, source, "payment scheduler test hooks were inserted");

  const timers = [];
  let calls = 0;
  const document = {
    readyState: "loading",
    addEventListener() {},
  };
  const window = {
    __ndQuoteOrderLoaded: false,
    document,
    location: { pathname: "/noop", search: "", hash: "" },
    setTimeout(callback) {
      timers.push(callback);
      return timers.length;
    },
    clearTimeout() {},
  };
  window.window = window;

  vm.runInNewContext(instrumented, {
    window,
    document,
    Date,
    Event,
    URLSearchParams,
    Promise,
    Number,
    String,
    Object,
    Array,
    JSON,
    Math,
    Error,
    isFinite,
    parseInt,
    setTimeout: window.setTimeout,
    clearTimeout: window.clearTimeout,
  });

  window.__testForceBankDeposit = () => {
    calls += 1;
    window.__testScheduleBankDepositSync();
  };

  for (let index = 0; index < 1_000; index += 1) {
    window.__testScheduleBankDepositSync();
  }
  assert.equal(timers.length, 1, "synchronous change storm is coalesced");

  timers.shift()();
  assert.equal(calls, 1, "reentrant change during policy sync is ignored");
  assert.equal(timers.length, 0, "reentrant change did not queue another sync");

  window.__testScheduleBankDepositSync();
  assert.equal(timers.length, 1, "scheduler is released after the sync finishes");
  timers.shift()();
  assert.equal(calls, 2);
});
