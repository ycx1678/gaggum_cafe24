import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scriptPath = process.env.SKIN16_QUOTE_ORDER_SCRIPT
  ?? path.join(root, "nd/js/quote_order_v194.js");

function orderClickEvent() {
  return {
    target: {
      textContent: "전체상품 주문하기",
      closest() { return this; },
      getAttribute() { return "Basket.orderAll()"; },
    },
    prevented: false,
    stopped: false,
    preventDefault() { this.prevented = true; },
    stopImmediatePropagation() { this.stopped = true; },
  };
}

async function runNormalCart(carts) {
  let deleted = null;
  let reloaded = false;
  const listeners = new Map();
  const alerts = [];
  const document = {
    readyState: "complete",
    cookie: "",
    addEventListener(type, listener) { listeners.set(type, listener); },
    querySelectorAll() { return []; },
  };
  const window = {
    __ndQuoteOrderLoaded: false,
    document,
    location: {
      pathname: "/skin-skin16/order/basket.html",
      search: "",
      reload() { reloaded = true; },
    },
    alert(message) { alerts.push(message); },
    CAFE24API: {
      getCartList(callback) {
        callback(null, { carts });
      },
      deleteCartItems(shippingType, items, callback) {
        deleted = { shippingType, items };
        callback(null, { result: "success" });
      },
      getCartCount(callback) {
        callback(null, { count: 1 });
      },
    },
    setTimeout,
    clearTimeout,
  };
  window.window = window;

  vm.runInNewContext(fs.readFileSync(scriptPath, "utf8"), {
    window,
    document,
    URLSearchParams,
    Promise,
    Number,
    String,
    Object,
    Array,
    JSON,
    Math,
    Date,
    Error,
    isFinite,
    parseInt,
    setTimeout,
    clearTimeout,
  });
  const orderEvent = orderClickEvent();
  listeners.get("click")?.(orderEvent);
  await new Promise((resolve) => setTimeout(resolve, 0));

  return { alerts, clickListener: listeners.get("click"), deleted, orderEvent, reloaded };
}

test("normal cart removes only the orphaned quote shipping service item", async () => {
  const { alerts, deleted, orderEvent, reloaded } = await runNormalCart([
    {
      basket_product_no: 77,
      product_no: 1090,
      variant_code: "P0000BPY000A",
      quantity: 40,
    },
    {
      basket_product_no: 78,
      product_no: 18,
      variant_code: "P000000S000A",
      quantity: 1,
    },
  ]);

  assert.deepEqual(JSON.parse(JSON.stringify(deleted)), {
    shippingType: "A",
    items: [
      {
        product_no: 1090,
        option_id: "P0000BPY000A",
        basket_product_no: 77,
      },
    ],
  });
  assert.equal(orderEvent.prevented, true);
  assert.equal(orderEvent.stopped, true);
  assert.equal(alerts.length, 1);
  assert.equal(reloaded, true);
});

test("normal cart leaves ordinary products untouched", async () => {
  const { clickListener, deleted, reloaded } = await runNormalCart([
    {
      basket_product_no: 78,
      product_no: 18,
      variant_code: "P000000S000A",
      quantity: 1,
    },
  ]);

  assert.equal(deleted, null);
  assert.equal(reloaded, false);
  const eventAfterCheck = orderClickEvent();
  clickListener?.(eventAfterCheck);
  assert.equal(eventAfterCheck.prevented, false);
  assert.equal(eventAfterCheck.stopped, false);
});
