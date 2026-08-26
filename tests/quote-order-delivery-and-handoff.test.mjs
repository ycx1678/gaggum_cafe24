import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const script = readFileSync(path.join(root, "nd/js/quote_order_v198.js"), "utf8");
const directScript = /<script src="\/skin-skin16\/nd\/js\/quote_order_v198\.js\?v=20260826v201"><\/script>/;

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

test("quote service item and Cafe24 native shipping fee are never charged together", () => {
  assert.match(
    script,
    /var checkoutShippingAmount = Number\(expected && expected\.checkoutShippingAmount\);/,
  );
  assert.match(
    script,
    /checkoutShippingAmount > 0 \? money\(checkoutShippingAmount\) : ""/,
  );
  assert.match(script, /서비스 품목 합계/);
});
