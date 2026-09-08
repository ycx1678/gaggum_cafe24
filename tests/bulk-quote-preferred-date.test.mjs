import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const markup = readFileSync(path.join(root, "nd/bulk_quote.html"), "utf8");

test("delivery preference is an optional date beside elevator access", () => {
  assert.match(markup, /<label for="ndBqPreferredDeliveryDate">배송 희망일 선택<\/label>/);
  const input = markup.match(/<input[^>]*id="ndBqPreferredDeliveryDate"[^>]*>/)?.[0];
  assert.ok(input);
  assert.match(input, /name="preferredDeliveryDate" type="date"/);
  assert.doesNotMatch(input, /required|value=/);
  assert.match(markup, /class="ndBq_row2 ndBq_deliveryRow">[\s\S]*?id="ndBqElevator"[\s\S]*?id="ndBqPreferredDeliveryDate"/);
});

// The static skin has no npm dependencies. Point this at an installed Playwright
// package to additionally exercise the real form, fetch boundary and layout.
const browserModule = process.env.CAFE24_PLAYWRIGHT_MODULE;
test("customer submits the selected date, then starts a request with no date", {
  skip: !browserModule && "set CAFE24_PLAYWRIGHT_MODULE to run Chromium coverage",
}, async () => {
  const { chromium } = createRequire(import.meta.url)(browserModule);
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
    await page.route("**/*", route => route.abort());
    await page.setContent(markup.replace(/<script[\s\S]*?<\/script>/g, ""));
    const cssPath = markup.match(/<!--@css\(([^)]+)\)-->/)[1];
    await page.addStyleTag({ content: readFileSync(path.join(root, cssPath), "utf8") });
    await page.evaluate(() => {
      document.querySelector(".ndBq_memberState").remove();
      window.requests = [];
      window.alert = () => {};
      window.fetch = async (url, options) => {
        if (!url.endsWith("/api/quote-requests")) throw new Error("Unexpected request: " + url);
        window.requests.push(JSON.parse(options.body));
        return { ok: true, json: async () => ({ ok: true, data: {} }) };
      };
      window.daum = { Postcode: class {
        constructor(options) { this.options = options; }
        open() { this.options.oncomplete({ zonecode: "06236", roadAddress: "서울 강남구 테헤란로 1" }); }
      } };
    });
    const jsPath = markup.match(/<script src="([^?]+)\?/)[1];
    await page.addScriptTag({ content: readFileSync(path.join(root, jsPath), "utf8") });
    await page.evaluate(() => window.ndBulkQuote.open([{ productName: "검증 의자", productNo: 123, qty: 2, unitPrice: 10000 }]));
    const date = page.locator("#ndBqPreferredDeliveryDate");
    assert.equal(await date.count(), 1);
    await date.fill("2026-09-30");
    const elevatorBox = await page.locator("#ndBqElevator").boundingBox();
    const dateBox = await date.boundingBox();
    assert.ok(dateBox.height >= 44 && elevatorBox.height >= 44, "delivery controls meet the 44px touch target");
    assert.ok(Math.abs(elevatorBox.y - dateBox.y) < 2, "desktop inputs share a row");
    assert.ok(dateBox.x > elevatorBox.x, "date follows elevator");
    if (process.env.CAFE24_SCREENSHOT_DIR) {
      await page.screenshot({ path: path.join(process.env.CAFE24_SCREENSHOT_DIR, "preferred-date-desktop.png") });
    }
    await page.setViewportSize({ width: 375, height: 812 });
    const mobileElevator = await page.locator("#ndBqElevator").boundingBox();
    const mobileDate = await date.boundingBox();
    assert.ok(mobileDate.height >= 44 && mobileElevator.height >= 44, "mobile delivery controls meet the 44px touch target");
    assert.ok(mobileDate.y >= mobileElevator.y + mobileElevator.height, "mobile delivery fields wrap");
    assert.ok(await page.locator(".ndBq_panel").evaluate(el => el.scrollWidth <= el.clientWidth), "no modal horizontal overflow");
    if (process.env.CAFE24_SCREENSHOT_DIR) {
      await page.screenshot({ path: path.join(process.env.CAFE24_SCREENSHOT_DIR, "preferred-date-mobile.png") });
    }
    for (const expectedDate of ["2026-09-30", null]) {
      await page.locator("#ndBqManager").fill("검증 담당자");
      await page.locator("#ndBqPhone").fill("010-1234-5678");
      await page.locator("#ndBqElevator").selectOption("elevator");
      await page.locator("#ndBqFindAddress").click();
      await page.locator("#ndBqAddress2").fill("2층");
      await page.locator("#ndBqSubmit").click();
      await page.waitForFunction(() => !document.querySelector("#ndBqSubmit").disabled);
      const payload = await page.evaluate(() => window.requests.at(-1));
      assert.equal(payload.preferredDeliveryDate, expectedDate);
      assert.equal(payload.elevatorAccess, "elevator");
      assert.equal(payload.postcode, "06236");
      assert.equal(payload.address2, "2층");
      assert.equal(payload.items[0].productNo, 123);
      assert.equal(payload.items[0].qty, 2);
      assert.equal(await date.inputValue(), "", "successful request resets date");
      await page.evaluate(() => window.ndBulkQuote.open([{ productName: "검증 의자", productNo: 123, qty: 2, unitPrice: 10000 }]));
    }
    assert.equal(await page.evaluate(() => window.requests.length), 2);
  } finally {
    await browser.close();
  }
});
