import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const script = readFileSync(path.join(root, "nd/js/quote_order_v205.js"), "utf8");
const directScript = /<script src="\/skin-skin16\/nd\/js\/quote_order_v205\.js\?v=20260907v205"><\/script>/;

test("quote checkout runtime is directly loaded on every basket-to-result page", () => {
  for (const page of [
    "layout/basic/layout.html",
    "member/login.html",
    "order/basket.html",
    "order/orderform.html",
    "order/order_result.html",
  ]) {
    const source = readFileSync(path.join(root, page), "utf8");
    assert.match(source, directScript, page);
    assert.doesNotMatch(source, /quote_order_v204\.js/, page);
  }
});

test("skin16 layout loads the cart variant recovery runtime", () => {
  const layout = readFileSync(path.join(root, "layout/basic/layout.html"), "utf8");
  assert.match(layout, /quote_parent_v186\.js\?v=20260821v186/);
  assert.doesNotMatch(layout, /quote_parent_v184\.js/);
});

test("quote checkout hands verified carts to Cafe24 without the native all-cart confirmation", () => {
  assert.doesNotMatch(script, /window\.Basket\.orderAll\(button\)/);
  assert.match(script, /window\.Basket\._callOrderAjax\(\{ basket_type: "all_buy" \}, button\)/);
});

test("quote order form never changes Cafe24 payment selection programmatically", () => {
  const forceBankDeposit = script.match(
    /function forceBankDeposit\(\) \{[\s\S]*?\n    \}\n\n    function shippingPaymentLabel/,
  )?.[0];

  assert.ok(forceBankDeposit, "forceBankDeposit implementation is present");
  assert.doesNotMatch(forceBankDeposit, /\.click\(\)/);
});

test("quote service item and Cafe24 native shipping fee are never charged together", () => {
  assert.match(
    script,
    /function checkoutShippingAmount\(expected\) \{[\s\S]*?expected && expected\.checkoutShippingAmount/,
  );
  assert.match(
    script,
    /shippingAmount > 0 \? money\(shippingAmount\) : ""/,
  );
  assert.match(script, /서비스 품목 합계/);
});

test("quote request delivery address is carried into Cafe24 direct-entry fields", () => {
  assert.match(script, /deliveryAddress: payload\.deliveryAddress \|\| null/);
  assert.match(script, /function applyDeliveryAddress\(\)/);
  assert.match(script, /ec-jigsaw-tab-shippingInfo-newAddress/);
  assert.match(script, /input\[name='rzipcode1'\]/);
  assert.match(script, /input\[name='raddr1'\]/);
  assert.match(script, /input\[name='raddr2'\]/);
  assert.match(script, /state\.address = !deliveryAddressRequired \|\| deliveryAddressApplied/);
  assert.match(script, /!state\.pricingReady \|\| !state\.address \|\| !state\.bank \|\| !state\.total/);
});
