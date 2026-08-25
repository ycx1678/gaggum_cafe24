import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const script = readFileSync(path.join(root, "nd/js/quote_order_v198.js"), "utf8");
const directScript = /<script src="\/skin-skin16\/nd\/js\/quote_order_v198\.js\?v=20260826v199"><\/script>/;

test("quote checkout runtime is directly loaded on every basket-to-result page", () => {
  for (const page of [
    "layout/basic/layout.html",
    "order/orderform.html",
    "order/order_result.html",
  ]) {
    assert.match(readFileSync(path.join(root, page), "utf8"), directScript, page);
  }
});

test("quote checkout hands verified carts to Cafe24 without the native all-cart confirmation", () => {
  assert.doesNotMatch(script, /window\.Basket\.orderAll\(button\)/);
  assert.match(script, /window\.Basket\._callOrderAjax\(\{ basket_type: "all_buy" \}, button\)/);
});
