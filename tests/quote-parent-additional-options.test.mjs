import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.CAFE24_PLAYWRIGHT_MODULE || "@playwright/test");
const scriptPath = process.env.SKIN16_QUOTE_PARENT_SCRIPT || path.join(root, "nd/js/quote_parent_v188.js");
const wireOptions = "전선구멍 캡 (55파이) 양쪽 2개";
const tableOptions = "1200x600x720mm(전선구멍X)/상판 컬러 - 하이글로시 화이트/다리 컬러 - 블랙";
const wire = { productNo: 465, productName: "전선구멍 (55파이) 추가", productOptions: `[옵션: ${wireOptions}]`, qty: 3, unitPrice: 2000, variantCode: null, isAdditional: false };
const table = { productNo: 138, productName: "교무실책상 교사용책상 첨삭지도테이블 - 롬버스 테이블", productOptions: `[옵션: ${tableOptions}]`, qty: 3, unitPrice: 89900, variantCode: null, isAdditional: false };
const ladder = { productNo: 1034, productName: "래더 학원 책상 + ALO체어 세트", productOptions: "[옵션: 플러스 650X450mm/엣지 상판/하이글로시 화이트/블랙/블랙/추가 안함]", qty: 62, unitPrice: 53700, variantCode: "P0000BNU000A", isAdditional: false };
function declaration(name, value) {
  return `<script>var ${name} = ${JSON.stringify(JSON.stringify(value))};</script>`;
}
function tableHtml(additions = { 465: { product_code: "P00000RX", option_type: "T", option_value_mapper: JSON.stringify({ [wireOptions]: "P00000RX000A" }) } }) {
  return [1, 2, 3].map(i => `<select product_type="product_option" option_product_no="138" option_type="T" option_sort_no="${i}"></select>`).join("")
    + declaration("option_value_mapper", { "1200x600x720mm(전선구멍X)#$%상판 컬러 - 하이글로시 화이트#$%다리 컬러 - 블랙": "P00000FI0BHM" })
    + declaration("add_option_data", additions);
}

async function submit(items, pages, mobile = false, capture = false) {
  const browser = await chromium.launch({ headless: true, ...(process.env.CAFE24_BROWSER_EXECUTABLE ? { executablePath: process.env.CAFE24_BROWSER_EXECUTABLE } : {}) });
  try {
    const page = await browser.newPage({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 } });
    let submitted;
    await page.route("**/*", async route => {
      const req = route.request();
      const url = new URL(req.url());
      if (url.pathname === "/api/quote-requests") {
        submitted = req.postDataJSON();
        return route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' });
      }
      assert.equal(req.method(), "GET", "no external mutations");
      if (url.pathname.endsWith("/product/detail.html")) {
        const html = pages[Number(url.searchParams.get("product_no"))];
        return route.fulfill({ status: html ? 200 : 404, contentType: "text/html", body: html || "Not found" });
      }
      return route.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><title>Quote fixture</title>" });
    });
    await page.goto("https://gaggum.co.kr/skin-skin16/order/basket.html");
    await page.addScriptTag({ path: scriptPath });
    if (capture) {
      await page.evaluate(({ wireOptions, tableOptions }) => {
        const values = tableOptions.split("/");
        window.option_value_mapper = JSON.stringify({ [values.join("#$%")]: "P00000FI0BHM" });
        window.add_option_data = JSON.stringify({ 465: { product_code: "P00000RX", option_type: "T", option_value_mapper: JSON.stringify({ [wireOptions]: "P00000RX000A" }) } });
        document.body.innerHTML = values.map((v,i) => `<select product_type="product_option" option_product_no="138" option_type="T" option_sort_no="${i+1}"><option selected>${v}</option></select>`).join("")
          + `<select product_type="addproduct_option" option_product_no="465" option_type="T"><option selected>${wireOptions}</option></select>`
          + `<table id="totalProducts"><tbody class="option_products"><tr class="option_product"><td><p class="product">롬버스 테이블<span>${tableOptions}</span></p><input class="option_box_price" product-no="138" value="89900"><span class="quantity"><input type="text" value="3"></span></td></tr></tbody><tbody class="add_products"><tr class="add_product"><td><p class="product">전선구멍 (55파이) 추가<span>${wireOptions}</span></p><input class="add_product_option_box_price" product-no="465" value="2000"><span class="quantity"><input type="text" value="3"></span></td></tr></tbody></table><button class="actionCart">장바구니 담기</button>`;
      }, { wireOptions, tableOptions });
      await page.getByRole("button", { name: "장바구니 담기" }).click();
      await page.goto("https://gaggum.co.kr/skin-skin16/order/basket.html");
      await page.addScriptTag({ path: scriptPath });
    }
    await page.evaluate(items => fetch("https://warranty.gaggum.kr/api/quote-requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items }) }), items);
    assert.ok(submitted, "request reached the external POST boundary");
    return submitted.items;
  } finally { await browser.close(); }
}

test("existing cart resolves a hidden wire-hole add-on from its table without losing quantities or parent", async () => {
  const result = await submit([ladder, table, wire], { 138: tableHtml() });
  assert.deepEqual(result.map(i => [i.productNo, i.variantCode, i.qty]), [
    [1034, "P0000BNU000A", 62], [138, "P00000FI0BHM", 3], [465, "P00000RX000A", 3],
  ]);
  assert.equal(result[2].unitPrice, 2000);
  assert.equal(result[2].isAdditional, true);
  assert.equal(result[2].parentSortOrder, 1);
});

test("newly selected add-on keeps its own option snapshot across cart navigation", async () => {
  const result = await submit([
    { ...table, productOptions: tableOptions },
    { ...wire, productOptions: wireOptions, isAdditional: true },
  ], {}, false, true);
  assert.deepEqual(result.map(i => [i.productNo, i.variantCode, i.qty]), [
    [138, "P00000FI0BHM", 3], [465, "P00000RX000A", 3],
  ]);
  assert.equal(result[1].parentSortOrder, 0);
});

test("unmatched add-on text is not replaced with the parent's default option", async () => {
  const result = await submit([table, { ...wire, productOptions: "[옵션: 다른 전선구멍]" }], { 138: tableHtml() });
  assert.equal(result[1].variantCode, null);
});

test("an add-on without its parent in the cart remains unresolved", async () => {
  const result = await submit([ladder, wire], { 138: tableHtml() });
  assert.equal(result[1].variantCode, null);
});

test("multiple possible parents are not assigned arbitrarily", async () => {
  const result = await submit([table, { ...table, qty: 5 }, wire], { 138: tableHtml() });
  assert.equal(result[2].variantCode, null);
  assert.equal(result[2].qty, 3);
});

test("a verified existing parent association disambiguates the add-on", async () => {
  const result = await submit([table, { ...table, qty: 5 }, { ...wire, isAdditional: true, parentSortOrder: 1 }], { 138: tableHtml() });
  assert.equal(result[2].variantCode, "P00000RX000A");
  assert.equal(result[2].parentSortOrder, 1);
  assert.equal(result[2].qty, 3);
});

test("malformed metadata or another product's variant never supplies the add-on code", async () => {
  for (const metadata of ["not-json", { 465: { product_code: "P00000RX", option_type: "T", option_value_mapper: JSON.stringify({ [wireOptions]: "P00000FI0BHM" }) } }]) {
    const result = await submit([table, wire], { 138: tableHtml(metadata) });
    assert.equal(result[1].variantCode, null);
  }
});

if (process.env.CAFE24_ADDITIONAL_FIXTURE_DIR) {
  for (const mobile of [false, true]) {
    test(`actual three-product cart resolves the hidden add-on (${mobile ? "mobile" : "desktop"})`, async () => {
      const pages = Object.fromEntries([1034, 138].map(n => [n, fs.readFileSync(path.join(process.env.CAFE24_ADDITIONAL_FIXTURE_DIR, `product${n}.html`), "utf8")]));
      const result = await submit([{ ...ladder, variantCode: null }, table, wire], pages, mobile);
      assert.deepEqual(result.map(i => [i.productNo, i.variantCode, i.qty]), [
        [1034, "P0000BNU000A", 62], [138, "P00000FI0BHM", 3], [465, "P00000RX000A", 3],
      ]);
      assert.deepEqual(result[0].cafe24OptionValues, [
        { optionCode: "O0000BES", valueNo: 16504 }, { optionCode: "O0000BET", valueNo: 16509 },
        { optionCode: "O0000BDX", valueNo: 16346 }, { optionCode: "O0000BEV", valueNo: 16532 },
        { optionCode: "O0000BEQ", valueNo: 16487 }, { optionCode: "O0000BEY", valueNo: 16549 },
      ]);
      assert.equal(result[2].isAdditional, true);
      assert.equal(result[2].parentSortOrder, 1);
      assert.equal(result[2].unitPrice, 2000);
    });
  }
}
