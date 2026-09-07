import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runtimePath = path.join(root, "nd/js/order_delivery_v9.js");
const prepaidRuntimePath = path.join(root, "nd/js/order_delivery_prepaid_v2.js");
const orderFormPath = path.join(root, "order/orderform.html");
const basketPath = path.join(root, "order/basket.html");

test("skin16 order form loads the versioned payment-aware delivery runtime", () => {
  const orderForm = readFileSync(orderFormPath, "utf8");
  assert.match(orderForm, /@js\(\/nd\/js\/order_delivery_v9\.js\?v=20260907v213\)/);
  assert.match(orderForm, /\/nd\/js\/order_delivery_v9\.js\?v=20260907v213/g);
  assert.doesNotMatch(orderForm, /order_delivery_v[78]\.js/);
  assert.ok(
    orderForm.indexOf("order_delivery_prepaid_v2.js?v=20260907v215") >
      orderForm.indexOf("order_delivery_v9.js?v=20260907v213"),
    "prepaid display cleanup loads after the delivery runtime",
  );
});

test("skin16 basket loads the existing prepaid-aware delivery runtime", () => {
  const basket = readFileSync(basketPath, "utf8");
  assert.match(basket, /@js\(\/nd\/js\/order_delivery_v7\.js\?v=20260907v213\)/);
  assert.match(basket, /\/nd\/js\/order_delivery_v7\.js\?v=20260907v213/g);
  assert.doesNotMatch(basket, /order_delivery_v6\.js/);
});

function fixture(runtime, prepaidRuntime, method, fee) {
  return `<!doctype html>
<html lang="ko">
<body>
  <div id="mCafe24Order">
    <div class="rightGroup"><div class="stickyTop"></div></div>
    <div class="ec-base-label">
      <input type="radio" name="delivcompany" id="delivcompany-parcel">
      <label for="delivcompany-parcel">택배배송(선불)</label>
    </div>
    <div class="ec-base-label">
      <input type="radio" name="delivcompany" id="delivcompany-freight" checked>
      <label for="delivcompany-freight">화물배송(착불)</label>
    </div>
    <div class="ec-base-label">
      <input type="radio" name="delivcompany" id="delivcompany-pickup">
      <label for="delivcompany-pickup">방문수령</label>
    </div>
    <div class="ec-base-prdInfo">
      <span>견적 배송/납품비 서비스 (10,000원 단위)</span>
      <span class="service-shipping">배송비 0원</span>
    </div>
    <div id="deliv_company_price_custom_type">0원</div>
    <div id="deliv_company_shipping_info"></div>
    <table class="ec-base-table"><tr><th>배송비 <span class="info">(착불 상품 포함)</span></th><td></td></tr></table>
  </div>
  <pre id="result"></pre>
  <script>
    localStorage.setItem("ndDeliveryMethod", ${JSON.stringify(method)});
    localStorage.setItem("ndDeliveryFee", ${JSON.stringify(fee)});
  </script>
  <script>${runtime.replace(/<\/script/gi, "<\\/script")}</script>
  <script>${prepaidRuntime.replace(/<\/script/gi, "<\\/script")}</script>
  <script>
    setTimeout(function () {
      var selected = document.querySelector("input[name='delivcompany']:checked");
      var label = selected && document.querySelector("label[for='" + selected.id + "']");
      var rows = Array.from(document.querySelectorAll(".ndOrderShippingSummary__row"));
      document.getElementById("result").textContent = JSON.stringify({
        selectedLabel: label && label.textContent,
        summaryRows: rows.map(function (row) { return row.textContent.replace(/\\s+/g, " ").trim(); }),
        serviceShipping: document.querySelector(".service-shipping").textContent,
        footerFee: document.getElementById("deliv_company_price_custom_type").textContent,
        footerInfo: document.getElementById("deliv_company_shipping_info").textContent,
        collectInfoDisplay: getComputedStyle(document.querySelector("th .info")).display
      });
    }, 500);
  </script>
</body>
</html>`;
}

async function runFixture(method, fee = "") {
  const runtime = readFileSync(runtimePath, "utf8");
  const prepaidRuntime = readFileSync(prepaidRuntimePath, "utf8");
  const server = http.createServer((request, response) => {
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end(fixture(runtime, prepaidRuntime, method, fee));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();

  try {
    const html = await new Promise((resolve, reject) => {
      const chrome = spawn("/usr/bin/google-chrome", [
        "--headless=new",
        "--no-sandbox",
        "--disable-gpu",
        "--disable-dev-shm-usage",
        "--virtual-time-budget=1000",
        "--dump-dom",
        `http://127.0.0.1:${port}/`,
      ]);
      let stdout = "";
      let stderr = "";
      chrome.stdout.on("data", (chunk) => { stdout += chunk; });
      chrome.stderr.on("data", (chunk) => { stderr += chunk; });
      chrome.on("error", reject);
      chrome.on("close", (code) => {
        if (code === 0) resolve(stdout);
        else reject(new Error(`Chrome exited ${code}: ${stderr}`));
      });
    });
    const encoded = html.match(/<pre id="result">([^<]+)<\/pre>/)?.[1];
    assert.ok(encoded, "browser fixture emitted a result");
    return JSON.parse(encoded.replaceAll("&quot;", '"').replaceAll("&amp;", "&"));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("prepaid freight stays prepaid throughout the Cafe24 order form", async () => {
  const result = await runFixture("화물배송(선불)", "175,000원");

  assert.equal(result.selectedLabel, "화물배송(선불)");
  assert.deepEqual(result.summaryRows, ["배송조건화물배송(선불)", "배송비(선불)175,000원"]);
  assert.equal(result.serviceShipping, "배송비 0원");
  assert.doesNotMatch(result.footerFee, /착불/);
  assert.doesNotMatch(result.footerInfo, /별도 안내|결제금액에는 배송비가 포함되어 있지/);
  assert.equal(result.collectInfoDisplay, "none");
});

test("collect freight keeps the collect label and separate-payment notice", async () => {
  const result = await runFixture("화물배송(착불)");

  assert.equal(result.selectedLabel, "화물배송(착불)");
  assert.deepEqual(result.summaryRows, ["배송조건화물배송(착불)"]);
  assert.match(result.footerFee, /착불/);
  assert.match(result.footerInfo, /별도 안내/);
  assert.equal(result.collectInfoDisplay, "inline");
});

test("pickup stays pickup without a collect-payment notice", async () => {
  const result = await runFixture("방문수령");

  assert.equal(result.selectedLabel, "방문수령");
  assert.deepEqual(result.summaryRows, ["배송조건방문수령"]);
  assert.doesNotMatch(result.footerFee, /착불/);
  assert.doesNotMatch(result.footerInfo, /별도 안내/);
  assert.equal(result.collectInfoDisplay, "inline");
});
