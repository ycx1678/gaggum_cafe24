/* 대량견적 장바구니 진입점 (교차①).
   플로우차트: 장바구니 결제예정금액 >= 300만원 이면 주문버튼 옆에 "대량견적 문의" 버튼 노출.
     - 회원  → bulk_quote 모달 열기 (window.ndBulkQuote.open)
     - 비회원 → 로그인 안내 (회원 전용 메뉴)
     - 300만원 미만 → 버튼 숨김 (수량 변경 시 실시간 재평가)
   basket.html 에서 <!--@import(/nd/bulk_quote.html)--> + <!--@js(/nd/js/bulk_quote_cart.js)--> 로 로드.
   안전: 결제/주문 흐름 미터치 — 버튼 표시 + 모달 트리거만. vanilla IIFE. */
(function () {
  "use strict";

  var THRESHOLD = 3000000; // 300만원

  function ready(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  // "1,761,000원" 같은 표기 → 1761000 정수.
  function parseWon(text) {
    if (!text) return 0;
    var digits = String(text).replace(/[^0-9]/g, "");
    return digits ? parseInt(digits, 10) : 0;
  }

  // basket.html 결제예정금액: .total .paymentPrice strong (국내 + 해외 영역 모두 대비해 최대값 사용)
  function cartTotal() {
    var max = 0;
    Array.prototype.forEach.call(
      document.querySelectorAll(".total .paymentPrice strong"),
      function (el) {
        var v = parseWon(el.textContent);
        if (v > max) max = v;
      },
    );
    return max;
  }

  ready(function () {
    // 주문버튼 영역(#orderFixItem .ec-base-button)에만 붙는다 = 장바구니 페이지.
    var btnBox = document.querySelector("#orderFixItem .ec-base-button");
    if (!btnBox) return;

    // 로그인 여부: Cafe24 서버 렌더 신호(로그인 시에만 .xans-layout-statelogon / #ndBqStateOn 존재).
    // ⚠️ 기존엔 window.CAFE24API(앱 SDK)를 썼는데, 이는 스토어프론트 스킨엔 없어 항상 비회원 판정 →
    //    로그인 상태여도 "회원 전용" 팝업이 뜨는 버그였음. 서버 렌더 신호는 앱 SDK 미의존.
    function isLoggedIn() {
      // 로그인 확정: statelogon 요소 존재. 비로그인 확정: statelogoff 만 존재.
      if (document.querySelector(".xans-layout-statelogon")) return true;
      if (document.querySelector(".xans-layout-statelogoff")) return false;
      // 상태 모듈 신호가 아예 없으면(레이아웃 예외) 회원 차단 오류를 피하려 통과시킨다(모달이 게스트도 처리).
      return true;
    }

    var btn = document.createElement("a");
    btn.href = "#none";
    btn.className = "btnNormal gFull sizeL mrt10 ndBqCartBtn";
    btn.textContent = "대량견적 문의";
    btn.style.display = "none"; // 초기 숨김, 총액 평가 후 노출

    btn.addEventListener("click", function (e) {
      e.preventDefault();
      if (!isLoggedIn()) {
        if (
          window.confirm(
            "대량견적 문의는 회원 전용입니다. 로그인 페이지로 이동할까요?",
          )
        ) {
          location.href = "/member/login.html";
        }
        return;
      }
      if (window.ndBulkQuote && typeof window.ndBulkQuote.open === "function") {
        window.ndBulkQuote.open();
      }
    });

    btnBox.appendChild(btn);

    function evaluate() {
      btn.style.display = cartTotal() >= THRESHOLD ? "" : "none";
    }
    evaluate();

    // 수량 변경 등으로 결제예정금액이 갱신되면 재평가.
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
