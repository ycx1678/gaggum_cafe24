const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "@playwright/test");

const root = path.resolve(__dirname, "..");
const runtime = process.env.QUOTE_PARENT_SCRIPT || path.join(root, "nd/js/quote_parent_v189.js");
const fixture = fs.readFileSync(path.join(__dirname, "fixtures/alumno-693-additional.html"), "utf8");

(async () => {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {}),
  });
  try {
    for (const mobile of [false, true]) {
      const context = await browser.newContext({
        viewport: mobile ? { width: 375, height: 667 } : { width: 1440, height: 900 },
        isMobile: mobile,
      });
      const page = await context.newPage();
      await page.route("**/*", route => route.fulfill({ body: "<!doctype html><html><body></body></html>", contentType: "text/html" }));
      await page.goto("https://gaggum.co.kr/skin-skin16/order/basket.html");
      await page.evaluate(html => {
        window.quoteRequests = [];
        window.parentHtml = html;
        window.fetch = async (input, init) => {
          if (String(input).includes("/api/quote-requests")) {
            window.quoteRequests.push(JSON.parse(init.body));
            return new Response(JSON.stringify({ ok: true }), { status: 200 });
          }
          return String(input).includes("product_no=693")
            ? new Response(window.parentHtml, { status: 200 })
            : new Response("", { status: 404 });
        };
      }, fixture);
      await page.addScriptTag({ path: runtime });

      const send = () => page.evaluate(async () => {
        const items = [
          { productNo: 693, productName: "알룸노체어 Ver.3", productOptions: "[옵션: 베이지]", qty: 20, unitPrice: 133800, isAdditional: false },
          { productNo: 691, productName: "헤드레스트 추가", productOptions: "[옵션: 헤드레스트 추가]", qty: 20, unitPrice: 10000, imageUrl: "https://gaggum.co.kr/headrest.jpg", isAdditional: false },
        ];
        await fetch("https://warranty.gaggum.kr/api/quote-requests", { method: "POST", body: JSON.stringify({ items }) });
        return window.quoteRequests.at(-1).items;
      });
      const items = await send();
      assert.equal(items[0].variantCode, "P0000BAR000Y");
      assert.deepEqual(items[1], {
        productNo: 691, productName: "헤드레스트 추가", productOptions: "[옵션: 헤드레스트 추가]",
        qty: 20, unitPrice: 10000, imageUrl: "https://gaggum.co.kr/headrest.jpg",
        isAdditional: true, variantCode: "P0000BAP000A", parentSortOrder: 0,
      });
      console.log(`PASS: ${mobile ? "mobile" : "desktop"} headrest quote request restores variant and parent`);

      for (const [label, from, to] of [
        ["wrong selection", "[옵션: 헤드레스트 추가]", "[옵션: 다른 옵션]"],
        ["hidden variant", '"is_display":"T"', '"is_display":"F"'],
        ["disabled variant", '"is_selling":"T"', '"is_selling":"F"'],
      ]) {
        if (label === "wrong selection") {
          const invalid = await page.evaluate(async options => {
            await fetch("https://warranty.gaggum.kr/api/quote-requests", { method: "POST", body: JSON.stringify({ items: [
              { productNo: 693, productName: "알룸노체어", productOptions: "[옵션: 베이지]", qty: 20, isAdditional: false },
              { productNo: 691, productName: "헤드레스트 추가", productOptions: options, qty: 20, isAdditional: false },
            ] }) });
            return window.quoteRequests.at(-1).items[1];
          }, to);
          assert.equal(invalid.variantCode, undefined);
        } else {
          // The public script contains JSON embedded inside two string layers.
          const escaped = text => text.replaceAll('"', String.fromCharCode(92).repeat(3) + '"');
          assert(fixture.includes(escaped(from)));
          await page.evaluate(html => { window.parentHtml = html; }, fixture.replaceAll(escaped(from), escaped(to)));
          const invalid = await send();
          assert.equal(invalid[1].variantCode, undefined);
          assert.equal(invalid[1].isAdditional, false);
        }
        console.log(`PASS: ${mobile ? "mobile" : "desktop"} ${label} stays unresolved`);
      }
      await context.close();
    }
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
