/* [2026-06-22] 모바일 상세 대표이미지 풀폭(detail_v85.css) 후속 보정.
   문제: 패널(nd-mobile-option-panel)이 뷰어를 화면 풀폭으로 넓히는 시점과
         swiper 초기화 순서가 로드마다 달라(레이스), swiper 슬라이드 폭이
         옛 폭(≈366)으로 남는 경우 풀폭 뷰어 안에서 다음 슬라이드가 옆으로
         삐져나오는 "이격"이 생김(어떤 로드는 정상, 어떤 로드는 이격).
   해결: 패널이 붙는 즉시 + 폴백 타이머로 viewer swiper.update()를 호출해
         슬라이드 폭을 항상 풀폭으로 재계산(멱등 — 이미 풀폭이면 그대로).
   안전: 모바일(≤1024)에서만, 표시(레이아웃) 재계산만. 결제/제출/옵션값 미터치. */
(function () {
  if (!(window.matchMedia && window.matchMedia('(max-width:1024px)').matches)) return;

  function tryUpdate() {
    var viewer = document.querySelector('.prd_img_wrap .viewer');
    var panel = document.querySelector('.detailArea.nd-mobile-option-panel');
    if (!viewer || !viewer.swiper || !panel) return false;
    try {
      viewer.swiper.update();
      if (typeof viewer.swiper.slideTo === 'function') {
        viewer.swiper.slideTo(viewer.swiper.activeIndex || 0, 0);
      }
    } catch (e) { /* noop */ }
    return true;
  }

  // 패널 클래스가 .detailArea에 붙는 즉시 보정(플래시 최소화) — 대상 한정 옵저버
  var detailArea = document.querySelector('.detailArea');
  if (detailArea && typeof MutationObserver !== 'undefined') {
    var obs = new MutationObserver(function () {
      if (detailArea.classList.contains('nd-mobile-option-panel')) { tryUpdate(); }
    });
    try { obs.observe(detailArea, { attributes: true, attributeFilter: ['class'] }); } catch (e) {}
    setTimeout(function () { try { obs.disconnect(); } catch (e) {} }, 6000);
  }

  // 폴백 타이머(옵저버가 못 잡거나 패널이 이미 붙은 경우)
  [80, 250, 600, 1200, 2200].forEach(function (t) { setTimeout(tryUpdate, t); });

  // 회전/리사이즈 시 재보정
  var rt;
  window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(tryUpdate, 250); });
  window.addEventListener('orientationchange', function () { setTimeout(tryUpdate, 400); });
})();
