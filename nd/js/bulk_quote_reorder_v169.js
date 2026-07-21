(function () {
  "use strict";

  var BACKEND = window.ND_BULK_QUOTE_API_BASE ||
    (window.location.pathname.indexOf("/skin-skin17/") === 0
      ? "https://gaggum.flashstudio.kr"
      : "https://warranty.gaggum.kr");
  var threshold = 3000000;

  function ready(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  }

  function parseMoney(value) {
    var digits = String(value || "").replace(/[^0-9]/g, "");
    return digits ? parseInt(digits, 10) : 0;
  }

  function productNo(href) {
    var match = String(href || "").match(/[?&]product_no=(\d+)/);
    if (match) return parseInt(match[1], 10);
    match = String(href || "").match(/\/product\/(?:[^/?#]+\/)?(\d+)(?:\/|$)/);
    return match ? parseInt(match[1], 10) : null;
  }

  function rowItem(order) {
    var name = order.querySelector(".prdName");
    var option = order.querySelector(".optionGroup");
    var link = order.querySelector(".thumbnail a, .prdName a");
    var image = order.querySelector(".thumbnail img");
    var qty = order.querySelector(".ap-reorder-product__quantity input");
    var unitPrice = parseMoney(order.querySelector(".price .txtEm")
      ? order.querySelector(".price .txtEm").textContent
      : "");
    return {
      productName: name ? name.textContent.replace(/\s+/g, " ").trim() : "",
      productOptions: option ? option.textContent.replace(/\s+/g, " ").trim() : null,
      productNo: productNo(link ? link.getAttribute("href") : ""),
      qty: Math.max(1, parseInt(qty ? qty.value : "1", 10) || 1),
      unitPrice: unitPrice,
      imageUrl: image ? new URL(image.getAttribute("src"), window.location.href).href : null,
      isAdditional: false,
    };
  }

  function install(order) {
    var controls = order.querySelector(".ap-reorder-product");
    if (!controls || controls.querySelector(".ndReorderQuoteBtn")) return;
    var button = document.createElement("button");
    button.type = "button";
    button.className = "ndReorderQuoteBtn";
    button.textContent = "대량견적 문의";
    button.disabled = true;
    controls.appendChild(button);

    function evaluate() {
      var item = rowItem(order);
      button.disabled = !item.productName || item.unitPrice * item.qty < threshold;
      button.setAttribute(
        "aria-label",
        button.disabled
          ? "수량 합계가 " + threshold.toLocaleString("ko-KR") + "원 이상일 때 활성화됩니다."
          : "이 상품으로 대량견적 문의",
      );
    }

    var qty = controls.querySelector(".ap-reorder-product__quantity input");
    if (qty) {
      qty.addEventListener("input", evaluate);
      qty.addEventListener("change", evaluate);
    }
    button.addEventListener("click", function () {
      if (button.disabled) return;
      if (window.ndBulkQuote && typeof window.ndBulkQuote.open === "function") {
        var orderNumber = order.querySelector(".order__number .number");
        var orderId = orderNumber
          ? orderNumber.textContent.replace(/[()\s]/g, "")
          : "";
        window.ndBulkQuote.open([rowItem(order)], "reorder", orderId);
      }
    });
    evaluate();
  }

  function installAll() {
    Array.prototype.forEach.call(document.querySelectorAll(".orderList .order"), install);
  }

  ready(function () {
    installAll();
    fetch(BACKEND + "/api/quote-settings", { method: "GET", mode: "cors" })
      .then(function (response) { return response.ok ? response.json() : null; })
      .then(function (body) {
        var value = body && body.data ? parseInt(body.data.threshold, 10) : 0;
        if (value > 0) threshold = value;
        installAll();
        Array.prototype.forEach.call(document.querySelectorAll(".orderList .order"), function (order) {
          var input = order.querySelector(".ap-reorder-product__quantity input");
          if (input) input.dispatchEvent(new Event("change"));
        });
      })
      .catch(function () { /* 기본 300만원 기준 유지 */ });
  });
})();
