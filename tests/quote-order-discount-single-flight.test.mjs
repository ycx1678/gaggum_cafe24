import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runtimePath = path.join(root, "nd/js/quote_order_v204.js");

test("a slow Cafe24 discount application is submitted only once", async () => {
  const source = readFileSync(runtimePath, "utf8");
  const hook = "    function waitForStableOrderTotal() {";
  const instrumented = source.replace(
    hook,
    "    window.__testApplyQuoteDiscountCode = applyQuoteDiscountCode;\n\n" + hook,
  );
  assert.notEqual(instrumented, source, "discount function test hook was inserted");

  let now = 0;
  let timerId = 0;
  let applyClicks = 0;
  let applied = false;
  let nativeApplyBlocked = false;
  let visibleTotal = 8_290_000;
  const timers = [];

  function fakeSetTimeout(callback, delay = 0) {
    const timer = { id: ++timerId, at: now + Number(delay || 0), callback, cancelled: false };
    timers.push(timer);
    return timer.id;
  }

  function fakeClearTimeout(id) {
    const timer = timers.find((entry) => entry.id === id);
    if (timer) timer.cancelled = true;
  }

  const visible = {};
  const input = {
    value: "",
    get offsetParent() { return applied ? null : visible; },
    dispatchEvent() {},
  };
  const button = {
    get offsetParent() { return applied ? null : visible; },
    click() {
      applyClicks += 1;
      if (applyClicks > 1) {
        nativeApplyBlocked = true;
        return;
      }
      fakeSetTimeout(() => {
        if (nativeApplyBlocked) return;
        applied = true;
        visibleTotal = 8_044_300;
      }, 1_200);
    },
  };
  const selectArea = { get offsetParent() { return applied ? null : visible; } };
  const modifyArea = { get offsetParent() { return applied ? visible : null; } };
  const clearButton = { get offsetParent() { return applied ? visible : null; } };
  const totalNode = {
    get offsetParent() { return visible; },
    get textContent() { return `${visibleTotal.toLocaleString("ko-KR")}원`; },
  };
  const discountNode = {
    get offsetParent() { return applied ? visible : null; },
    get textContent() { return applied ? "245,700원" : "0원"; },
  };

  const document = {
    readyState: "loading",
    addEventListener() {},
    querySelector(selector) {
      if (selector === "input[name='ec_discountcode']") return input;
      if (selector === "#ec_discountcode") return button;
      if (selector === ".mDiscountcodeSelect") return selectArea;
      if (selector === ".mDiscountcodeModify") return modifyArea;
      if (selector === "#ec_discountcode_clear") return clearButton;
      return null;
    },
    querySelectorAll(selector) {
      if (/total_order|paymentPrice/.test(selector)) return [totalNode];
      if (/discountcode_price/.test(selector)) return [discountNode];
      return [];
    },
  };
  class FakeDate extends Date {
    static now() { return now; }
  }
  const window = {
    __ndQuoteOrderLoaded: false,
    document,
    location: { pathname: "/noop", search: "", hash: "" },
    setTimeout: fakeSetTimeout,
    clearTimeout: fakeClearTimeout,
  };
  window.window = window;

  vm.runInNewContext(instrumented, {
    window,
    document,
    Date: FakeDate,
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
    setTimeout: fakeSetTimeout,
    clearTimeout: fakeClearTimeout,
  });

  let settled = false;
  let rejected = null;
  window.__testApplyQuoteDiscountCode({
    discountCode: "TEST-CODE",
    expected: { totalAmount: 8_044_300 },
  }).then(
    () => { settled = true; },
    (error) => { settled = true; rejected = error; },
  );

  for (let step = 0; step < 1_000 && !settled; step += 1) {
    await Promise.resolve();
    timers.sort((left, right) => left.at - right.at || left.id - right.id);
    const timer = timers.shift();
    if (!timer) break;
    if (timer.cancelled) continue;
    now = timer.at;
    timer.callback();
  }
  await Promise.resolve();

  assert.equal(rejected, null);
  assert.equal(settled, true, "discount application settled");
  assert.equal(applyClicks, 1);
  assert.equal(visibleTotal, 8_044_300);
});
