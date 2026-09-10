import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.CAFE24_PLAYWRIGHT_MODULE || "@playwright/test");
const scriptPath = process.env.SKIN16_QUOTE_PARENT_SCRIPT
  || path.join(root, "nd/js/quote_parent_v187.js");

function productHtml(productNo, mapper, optionCount = 3) {
  return Array.from({ length: optionCount }, (_, index) =>
    `<select product_type="product_option" option_product_no="${productNo}" option_type="T" option_sort_no="${index + 1}"></select>`,
  ).join("") + `<script>var option_value_mapper = ${JSON.stringify(JSON.stringify(mapper))};</script>`;
}

async function quotePayload(productNo, productOptions, html, mobile = false) {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.CAFE24_BROWSER_EXECUTABLE
      ? { executablePath: process.env.CAFE24_BROWSER_EXECUTABLE }
      : {}),
  });
  try {
    const page = await browser.newPage({ viewport: mobile
      ? { width: 390, height: 844 } : { width: 1440, height: 1000 } });
    let submitted;
    await page.route("**/*", async (route) => {
      const url = new URL(route.request().url());
      if (url.pathname === "/api/quote-requests") {
        submitted = route.request().postDataJSON();
        return route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' });
      }
      return route.fulfill({ status: 200, contentType: "text/html", body:
        url.pathname.endsWith("/product/detail.html") ? html : "<!doctype html><title>Basket fixture</title>" });
    });
    await page.goto("https://gaggum.co.kr/skin-skin16/order/basket.html");
    await page.addScriptTag({ path: scriptPath });
    await page.evaluate(async ({ productNo, productOptions }) => {
      await window.fetch("https://gaggum.co.kr/api/quote-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: [{ productNo, productOptions, qty: 20, variantCode: null }] }),
      });
    }, { productNo, productOptions });
    assert.ok(submitted, "quote request reached the external fetch boundary");
    return submitted.items[0];
  } finally {
    await browser.close();
  }
}

// Exact public Cafe24 tuple and variant observed for product 934 on 2026-09-10.
test("quote request resolves a table option containing a slash inside its value", async () => {
  const item = await quotePayload(934,
    "[옵션: 스퀘어/1200-600-720mm/상판-베이지 / 다리-화이트]",
    productHtml(934, {
      "스퀘어#$%1200-600-720mm#$%상판-베이지 / 다리-화이트": "P0000BJY0BRM",
      "스퀘어#$%1200-600-720mm#$%상판-베이지 / 다리-블랙": "P0000BJY0BRN",
    }));
  assert.equal(item.variantCode, "P0000BJY0BRM");
  assert.equal(item.qty, 20);
});

test("quote request still resolves the chair's ordinary three-option tuple", async () => {
  const item = await quotePayload(62, "[옵션: 그레이/화이트/선택 안함]",
    productHtml(62, {
      "그레이#$%화이트#$%선택 안함": "P00000CK00NV",
      "그레이#$%화이트#$%의자방석 동일색상": "P00000CK00NW",
    }), true);
  assert.equal(item.variantCode, "P00000CK00NV");
});

test("quote request does not guess a variant when the displayed tuple has no match", async () => {
  const item = await quotePayload(934, "[옵션: 스퀘어/1200-600-720mm/상판-베이지 / 다리-화이트]",
    productHtml(934, {
      "스퀘어#$%1200-600-720mm#$%상판-베이지 / 다리-블랙": "P0000BJY0BRN",
    }));
  assert.equal(item.variantCode, null);
});

test("quote request rejects distinct mapper tuples with the same slash-delimited display", async () => {
  const item = await quotePayload(934, "[옵션: A/B/C]",
    productHtml(934, {
      "A/B#$%C": "P0000BJY0BRM",
      "A#$%B/C": "P0000BJY0BRN",
    }, 2));
  assert.equal(item.variantCode, null);
});

test("quote request preserves slash boundaries instead of matching concatenated option names", async () => {
  const item = await quotePayload(934, "[옵션: AB/C]",
    productHtml(934, { "A#$%BC": "P0000BJY0BRM" }, 2));
  assert.equal(item.variantCode, null);
});

test("quote request preserves linked E-option value numbers", async () => {
  const item = await quotePayload(777, "[옵션: 화이트/1400mm (+5,000원)]", `
    <script>var sProductCode = "P0000ABC";</script>
    <select product_type="product_option" option_product_no="777" option_type="E" option_sort_no="1" option_code="O0000001">
      <option value="*">선택</option><option value="11">화이트</option>
    </select>
    <select product_type="product_option" option_product_no="777" option_type="E" option_sort_no="2" option_code="O0000002">
      <option value="*">선택</option><option value="22">1400mm</option>
    </select>`);
  assert.equal(item.variantCode, "P0000ABC000A");
  assert.deepEqual(item.cafe24OptionValues, [
    { optionCode: "O0000001", valueNo: 11 },
    { optionCode: "O0000002", valueNo: 22 },
  ]);
});

if (process.env.CAFE24_PUBLIC_FIXTURE_DIR) {
  for (const mobile of [false, true]) {
    test(`actual public product 934 HTML resolves the reported cart option (${mobile ? "mobile" : "desktop"})`, async () => {
      const html = fs.readFileSync(path.join(process.env.CAFE24_PUBLIC_FIXTURE_DIR, "product934.html"), "utf8");
      const item = await quotePayload(934,
        "[옵션: 스퀘어/1200-600-720mm/상판-베이지 / 다리-화이트]", html, mobile);
      assert.equal(item.variantCode, "P0000BJY0BRM");
    });
    test(`actual public product 62 HTML resolves the existing chair option (${mobile ? "mobile" : "desktop"})`, async () => {
      const html = fs.readFileSync(path.join(process.env.CAFE24_PUBLIC_FIXTURE_DIR, "product62.html"), "utf8");
      const item = await quotePayload(62, "[옵션: 그레이/화이트/선택 안함]", html, mobile);
      assert.equal(item.variantCode, "P00000CK00NV");
    });
  }
}
