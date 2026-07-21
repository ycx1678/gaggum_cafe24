/* [2026-06-24] 모바일 상세 대표이미지 풀폭 — 강화판(v2).
   실기기(Note20 Ultra 등)에서 이미지가 화면폭을 못 채우고 좌우 여백이 남는 문제.
   에뮬레이션에선 재현이 안 돼(항상 풀폭), 실기기 늦은 재계산/리셋을 대비해
   15초간 주기적으로 "슬라이드폭 != 뷰어폭"이면 swiper 재계산을 반복(멱등).
   + ?nddiag=1 진단 모드: 실기기 실제 수치(뷰어/슬라이드/이미지 폭, object-fit)를 화면에 표시.
   안전: 모바일(≤1024) 표시 재계산만. 결제/제출/옵션값 미터치. */
(function () {
  if (!(window.matchMedia && window.matchMedia('(max-width:1024px)').matches)) return;

  function viewerEl() { return document.querySelector('.prd_img_wrap .viewer'); }

  function enforce() {
    var v = viewerEl();
    var panel = document.querySelector('.detailArea.nd-mobile-option-panel');
    if (!v || !panel) return;
    var slide = v.querySelector('.swiper-slide');
    var vw = Math.round(v.getBoundingClientRect().width);
    var sw = slide ? Math.round(slide.getBoundingClientRect().width) : vw;
    if (Math.abs(sw - vw) <= 1) return; // 이미 풀폭 → 종료
    if (v.swiper) {
      try {
        v.swiper.update();
        if (typeof v.swiper.slideTo === 'function') v.swiper.slideTo(v.swiper.activeIndex || 0, 0);
      } catch (e) {}
    }
  }

  function start() {
    var v = viewerEl();
    // 뷰어 폭 변화 즉시 보정
    if (v && typeof ResizeObserver !== 'undefined') {
      var ro = new ResizeObserver(function () { enforce(); });
      try { ro.observe(v); } catch (e) {}
      setTimeout(function () { try { ro.disconnect(); } catch (e) {} }, 16000);
    }
    // 패널 클래스 부착 즉시 보정
    var da = document.querySelector('.detailArea');
    if (da && typeof MutationObserver !== 'undefined') {
      var mo = new MutationObserver(function () { if (da.classList.contains('nd-mobile-option-panel')) enforce(); });
      try { mo.observe(da, { attributes: true, attributeFilter: ['class'] }); } catch (e) {}
      setTimeout(function () { try { mo.disconnect(); } catch (e) {} }, 16000);
    }
    // 이미지 로드 시점 보정
    if (v) Array.prototype.forEach.call(v.querySelectorAll('img'), function (im) {
      im.addEventListener('load', function () { setTimeout(enforce, 60); });
    });
    // 실기기 늦은 리셋 대비: 15초간 0.5초마다 재보정(맞으면 no-op)
    var n = 0, iv = setInterval(function () { enforce(); if (++n >= 30) clearInterval(iv); }, 500);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();

  var rt;
  window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(enforce, 250); });
  window.addEventListener('orientationchange', function () { setTimeout(enforce, 400); });

  /* ---- 진단 모드: ?nddiag=1 일 때만, 실기기 실제 수치를 화면 상단에 표시 ---- */
  if (location.search.indexOf('nddiag') > -1) {
    setTimeout(function () {
      var v = viewerEl();
      var slide = v ? v.querySelector('.swiper-slide') : null;
      var img = v ? v.querySelector('.swiper-slide img') : null;
      function w(e) { return e ? Math.round(e.getBoundingClientRect().width) : '-'; }
      function h(e) { return e ? Math.round(e.getBoundingClientRect().height) : '-'; }
      var fit = img ? getComputedStyle(img).objectFit : '-';
      var imgFit = '-';
      if (img && img.naturalWidth) {
        var bw = w(img), bh = h(img), ar = img.naturalWidth / img.naturalHeight, br = bw / bh;
        imgFit = (fit === 'contain') ? (br > ar ? Math.round(bh * ar) : bw) : bw;
      }
      var box = document.createElement('div');
      box.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:2147483647;background:#000;color:#0f0;font:11px/1.5 monospace;padding:8px;word-break:break-all';
      box.textContent =
        'vp=' + window.innerWidth +
        ' | viewer=' + w(v) +
        ' | slide=' + w(slide) +
        ' | imgEl=' + w(img) + 'x' + h(img) +
        ' | imgFit~' + imgFit +
        ' | nat=' + (img ? img.naturalWidth + 'x' + img.naturalHeight : '-') +
        ' | objfit=' + fit +
        ' | panel=' + (document.querySelector('.detailArea.nd-mobile-option-panel') ? 'Y' : 'N') +
        ' | swiper=' + (v && v.swiper ? 'Y' : 'N');
      document.body.appendChild(box);
    }, 3500);
  }
})();
