(function(){
    /* =====================================================================
     * order_period_v1 (2026-06-15) — 주문서 배송소요기간 강제 "별도 안내" (가꿈 요청 1번)
     *  - 카페24 상품수령 영역의 배송소요기간(#deliv_company_period_custom_type, 예: "3일 ~ 7일 이내")을
     *    배송업체(택배/화물/방문) 무관하게 "별도 안내"로 고정 표시.
     *  - 카페24가 배송업체 변경 시 값을 다시 써넣으므로 MutationObserver + 초기 재시도로 유지.
     *  - 원칙: 표시 전용. textContent만 변경(input/select/제출/청구 무관). innerHTML 미사용.
     * ===================================================================== */
    var TEXT = "별도 안내";
    // 배송소요기간 관련 span id 목록(상품수령 영역). 존재하는 것만 처리.
    var IDS = ["deliv_company_period_custom_type"];

    function apply(){
        for(var i = 0; i < IDS.length; i += 1){
            var node = document.getElementById(IDS[i]);
            if(node && node.textContent !== TEXT){
                node.textContent = TEXT;   // 이미 TEXT면 건너뜀 → 옵저버 무한루프 방지
            }
        }
    }

    function init(){
        var order = document.getElementById("mCafe24Order");
        if(!order) return;                 // 주문서가 아니면 아무 것도 안 함
        apply();

        // 초기 렌더 지연(AJAX) 대비 재시도
        var attempts = 0;
        var timer = window.setInterval(function(){
            apply();
            attempts += 1;
            if(attempts >= 20){ window.clearInterval(timer); }
        }, 300);

        // 배송업체 변경 시 카페24가 값을 갱신 → 다시 "별도 안내"로 유지
        if(window.MutationObserver){
            var deb = null;
            new MutationObserver(function(){
                window.clearTimeout(deb);
                deb = window.setTimeout(apply, 100);
            }).observe(order, { childList: true, subtree: true, characterData: true });
        }
    }

    if(document.readyState === "loading"){
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
