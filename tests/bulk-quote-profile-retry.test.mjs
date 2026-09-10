import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const { chromium, expect } = require(process.env.CAFE24_PLAYWRIGHT_MODULE || "@playwright/test");
const scriptPath = process.env.SKIN16_BULK_QUOTE_SCRIPT
  || path.join(root, "nd/js/bulk_quote_v211.js");

for (const firstResponse of ["forbidden", "empty profile"]) {
  test(`customer can retry after profile lookup returns ${firstResponse}, without duplicate or automatic requests`, async () => {
    const browser = await chromium.launch({ headless: true,
      ...(process.env.CAFE24_BROWSER_EXECUTABLE
        ? { executablePath: process.env.CAFE24_BROWSER_EXECUTABLE } : {}),
    });
    let releaseFirst;
    const firstBlocked = new Promise(resolve => { releaseFirst = resolve; });
    let firstReceived;
    const received = new Promise(resolve => { firstReceived = resolve; });
    try {
      const page = await browser.newPage();
      const requests = [];
      const markup = fs.readFileSync(path.join(root, "nd/bulk_quote.html"), "utf8")
        .replace(/<script[\s\S]*?<\/script>/g, "")
        .replaceAll("{$id}", "profile-retry-fixture")
        .replaceAll("{$name}", "검증 담당자");
      const cart = `<div class="xans-order-basketpackage"><div class="ec-base-prdInfo gCheck">
        <div class="prdName"><a href="/product/detail.html?product_no=1033">검증 상품</a></div>
        <div class="quantity"><input type="number" value="35"></div>
        <div class="sumPrice">3500000</div></div></div>`;
      await page.route("**/*", async route => {
        const url = new URL(route.request().url());
        if (url.pathname === "/api/quote-requests/member-profile") {
          requests.push(route.request().postDataJSON());
          if (requests.length === 1) {
            firstReceived();
            await firstBlocked;
            return route.fulfill({ status: firstResponse === "forbidden" ? 403 : 200,
              contentType: "application/json", body: JSON.stringify(firstResponse === "forbidden"
                ? { ok: false, error: { code: "MEMBER_PROFILE_NOT_VERIFIED" } }
                : { ok: true, data: { profile: null } }),
            });
          }
          return route.fulfill({ status: 200, contentType: "application/json",
            body: JSON.stringify({ ok: true, data: { profile: {
              name: "검증 담당자", phone: "010-1234-5678", email: "fixture@example.com",
            } } }),
          });
        }
        assert.equal(route.request().method(), "GET", "no quote creation or other mutation occurs");
        return route.fulfill({ status: 200, contentType: "text/html",
          body: url.pathname.endsWith("/order/basket.html") ? markup + cart : "<!doctype html><title>Fixture</title>",
        });
      });
      await page.goto("https://gaggum.co.kr/skin-skin16/order/basket.html");
      await page.addScriptTag({ path: scriptPath });
      await page.evaluate(() => window.ndBulkQuote.open());
      await received;
      await page.evaluate(() => {
        window.ndBulkQuote.close();
        window.ndBulkQuote.open();
        window.ndBulkQuote.open();
      });
      await page.waitForTimeout(100);
      assert.equal(requests.length, 1, "concurrent opens share the pending profile request");
      releaseFirst();
      await expect(page.locator("#ndBqProfileStatus")).toContainText("자동으로 불러오지 못했습니다");
      await page.waitForTimeout(150);
      assert.equal(requests.length, 1, "failure does not start an automatic retry loop");
      await page.evaluate(() => { window.ndBulkQuote.close(); window.ndBulkQuote.open(); });
      await expect(page.locator("#ndBqPhone")).toHaveValue("010-1234-5678", { timeout: 3000 });
      assert.equal(requests.length, 2, "manual reopen retries exactly once");
      assert.deepEqual(requests, [
        { memberId: "profile-retry-fixture", items: [{ productNo: 1033, qty: 35 }] },
        { memberId: "profile-retry-fixture", items: [{ productNo: 1033, qty: 35 }] },
      ], "cart ownership proof is unchanged on retry");
      await page.evaluate(() => {
        window.ndBulkQuote.close();
        document.querySelector("#ndBqForm").reset();
        window.ndBulkQuote.open();
      });
      await expect(page.locator("#ndBqPhone")).toHaveValue("010-1234-5678");
      assert.equal(requests.length, 2, "successful profile remains cached after reopening");
    } finally {
      releaseFirst();
      await browser.close();
    }
  });
}
