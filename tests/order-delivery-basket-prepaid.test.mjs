import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const basketPath = path.join(root, "order/basket.html");
const deliveryRuntimePath = path.join(root, "nd/js/order_delivery_v7.js");
const prepaidRuntimePath = path.join(root, "nd/js/order_delivery_prepaid_v1.js");

test("skin16 basket loads the prepaid display cleanup after its delivery runtime", () => {
  const basket = readFileSync(basketPath, "utf8");
  const deliveryIndex = basket.indexOf("order_delivery_v7.js?v=20260907v213");
  const cleanupIndex = basket.indexOf("order_delivery_prepaid_v1.js?v=20260907v214");

  assert.ok(deliveryIndex >= 0, "basket delivery runtime is present");
  assert.ok(cleanupIndex > deliveryIndex, "prepaid cleanup loads after the delivery runtime");
});

function fixture(deliveryRuntime, prepaidRuntime, method, fee) {
  return `<!doctype html>
<html lang="ko">
<body>
  <div class="xans-order-basketpackage">
    <div class="ec-base-prdInfo service-item">
      <div class="description">
        <strong>견적 배송/납품비 서비스 (10,000원 단위)</strong>
        <ul class="info">
          <li class="native-shipping">배송 : <span>무료</span> [무료] / 개별배송</li>
        </ul>
      </div>
    </div>
    <div class="ec-base-prdInfo product-item">
      <div class="description">
        <strong>공간활용 스터디카페 바테이블</strong>
        <ul class="info">
          <li class="native-shipping">배송 : <span>1,500,000원</span> [비례/착불] / 개별배송</li>
        </ul>
      </div>
    </div>
    <div class="totalSummary">
      <div class="totalSummary__item">
        <h4>총 배송비</h4>
        <strong id="normal_individual_ship_fee"><span class="notranslate">0 (착불 배송비 별도)</span></strong>
      </div>
      <p class="collect-notice ec-base-help">착불 상품이 포함되어 있습니다.</p>
    </div>
  </div>
  <pre id="result"></pre>
  <script>
    localStorage.setItem("ndDeliveryMethod", ${JSON.stringify(method)});
    localStorage.setItem("ndDeliveryFee", ${JSON.stringify(fee)});
  </script>
  <script>${deliveryRuntime.replace(/<\/script/gi, "<\\/script")}</script>
  <script>${prepaidRuntime.replace(/<\/script/gi, "<\\/script")}</script>
  <script>
    setTimeout(function () {
      var packageEl = document.querySelector(".xans-order-basketpackage");
      var visibleText = Array.from(packageEl.querySelectorAll("*"))
        .filter(function (node) { return node.children.length === 0 && node.offsetParent !== null; })
        .map(function (node) { return node.textContent.trim(); })
        .join(" ");
      document.getElementById("result").textContent = JSON.stringify({
        nativeDisplays: Array.from(document.querySelectorAll(".native-shipping")).map(function (node) {
          return getComputedStyle(node).display;
        }),
        noticeDisplay: getComputedStyle(document.querySelector(".collect-notice")).display,
        nativeFee: document.getElementById("normal_individual_ship_fee").textContent.trim(),
        selectedMethods: Array.from(document.querySelectorAll(".ndSelectedShipping")).map(function (node) {
          return node.textContent.replace(/\\s+/g, " ").trim();
        }),
        totalMethod: (document.querySelector(".ndTotalShippingMethod") || {}).textContent || "",
        visibleText: visibleText
      });
    }, 700);
  </script>
</body>
</html>`;
}

async function runFixture(method, fee = "") {
  const deliveryRuntime = readFileSync(deliveryRuntimePath, "utf8");
  const prepaidRuntime = readFileSync(prepaidRuntimePath, "utf8");
  const server = http.createServer((request, response) => {
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end(fixture(deliveryRuntime, prepaidRuntime, method, fee));
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
        "--virtual-time-budget=1200",
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

test("prepaid quote basket hides Cafe24 collect-only shipping metadata", async () => {
  const result = await runFixture("화물배송(선불)", "175,000원");

  assert.deepEqual(result.nativeDisplays, ["none", "none"]);
  assert.equal(result.noticeDisplay, "none");
  assert.equal(result.nativeFee, "0원");
  assert.deepEqual(result.selectedMethods, [
    "배송조건 : 화물배송(선불)",
    "배송조건 : 화물배송(선불)",
  ]);
  assert.match(result.totalMethod, /화물배송\(선불\)/);
  assert.match(result.totalMethod, /175,000원/);
  assert.doesNotMatch(result.visibleText, /착불/);
});

test("collect quote basket keeps Cafe24 collect shipping metadata", async () => {
  const result = await runFixture("화물배송(착불)");

  assert.deepEqual(result.nativeDisplays, ["list-item", "list-item"]);
  assert.equal(result.noticeDisplay, "block");
  assert.match(result.nativeFee, /착불/);
  assert.match(result.visibleText, /착불/);
});

test("pickup quote basket does not apply prepaid freight cleanup", async () => {
  const result = await runFixture("방문수령");

  assert.deepEqual(result.nativeDisplays, ["list-item", "list-item"]);
  assert.equal(result.noticeDisplay, "block");
});
