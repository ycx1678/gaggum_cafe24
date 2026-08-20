/* 대량견적 장바구니 진입점.
   백오피스 공개 설정에서 임계금액을 읽고, 조회 실패 시 300만원을 사용한다. */
(function () {
  "use strict";

  var BACKEND = window.ND_BULK_QUOTE_API_BASE || "https://backoffice.gaggum.kr";
  var DEFAULT_THRESHOLD = 3000000;
  var threshold = DEFAULT_THRESHOLD;

  function ready(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  function parseWon(text) {
    if (!text) return 0;
    var digits = String(text).replace(/[^0-9]/g, "");
    return digits ? parseInt(digits, 10) : 0;
  }

  function cartTotal() {
    var max = 0;
    Array.prototype.forEach.call(
      document.querySelectorAll(".total .paymentPrice strong"),
      function (el) {
        var value = parseWon(el.textContent);
        if (value > max) max = value;
      },
    );
    return max;
  }

  function loadThreshold(done) {
    fetch(BACKEND + "/api/quote-settings", { method: "GET", mode: "cors" })
      .then(function (response) {
        if (!response.ok) throw new Error("settings");
        return response.json();
      })
      .then(function (body) {
        var value = body && body.data ? parseInt(body.data.threshold, 10) : 0;
        if (value > 0) threshold = value;
      })
      .catch(function () {
        threshold = DEFAULT_THRESHOLD;
      })
      .then(done);
  }

  ready(function () {
    var btnBox = document.querySelector("#orderFixItem .ec-base-button");
    if (!btnBox) return;

    function isLoggedIn() {
      if (document.querySelector(".xans-layout-statelogon")) return true;
      if (document.querySelector(".xans-layout-statelogoff")) return false;
      return true;
    }

    var btn = document.createElement("a");
    btn.href = "#none";
    btn.className = "btnNormal gFull sizeL mrt10 ndBqCartBtn";
    btn.setAttribute("data-nd-bq-cart-version", "172");
    btn.textContent = "대량견적 문의";
    btn.style.display = "none";

    function removeStaleButtons() {
      Array.prototype.forEach.call(document.querySelectorAll(".ndBqCartBtn"), function (node) {
        if (node !== btn && node.parentNode) node.parentNode.removeChild(node);
      });
    }

    // Cafe24 can retain the previous optimized @js bundle after the raw page
    // is saved. It can execute either before or after this direct cache-bypass
    // script, so remove both already-rendered and late legacy buttons.
    removeStaleButtons();

    btn.addEventListener("click", function (event) {
      event.preventDefault();
      if (!isLoggedIn()) {
        if (window.confirm("대량견적 문의는 회원 전용입니다. 로그인 페이지로 이동할까요?")) {
          location.href = "/member/login.html";
        }
        return;
      }
      if (window.ndBulkQuote && typeof window.ndBulkQuote.open === "function") {
        window.ndBulkQuote.open();
      }
    });

    btnBox.appendChild(btn);
    if (window.MutationObserver) {
      new MutationObserver(removeStaleButtons).observe(btnBox, {
        childList: true,
        subtree: true,
      });
    }

    function evaluate() {
      var eligible = cartTotal() >= threshold;
      btn.style.display = eligible ? "" : "none";
      btn.classList.toggle("ndBqCartBtn--eligible", eligible);
      btn.classList.toggle("ndBqCartBtn--attention", eligible);
    }

    loadThreshold(evaluate);
    evaluate();

    var totalArea = document.querySelector(".total .paymentPrice");
    if (totalArea && window.MutationObserver) {
      new MutationObserver(evaluate).observe(totalArea, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }
  });
})();
