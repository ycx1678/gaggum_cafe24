/* detail_btnTab_v83 (2026-06-16)
 *  - v82에서 "섹션 없는 탭 자동 숨김" 로직 제거 — 가꿈 요청: "포트폴리오 타이틀(탭)은 그대로 둬주세요".
 *    → 포트폴리오 탭은 #detail1 섹션이 비활성화여도 노출 유지.
 *  - 단 #detail1이 없으면 그 탭 클릭은 무동작(아래 click 핸들러의 `if(!$target.length) return` 가드).
 *  - [유지] v82의 핵심 수정: observe(null) 가드 — 포트폴리오 비활성화로 #detail1 없을 때
 *    ResizeObserver.observe(null) 에러가 그 아래 탭 클릭 바인딩을 막던 버그를 막아줌.
 */
$(function(){
    if($("#detail_btnTab").length){
        var $tab = $("#detail_btnTab");
        var $tabs = $tab.find('.detail_tab > li');
        var headerH = 0;
        var detail_tab_top = 0;
        var detail_fixed_start = 0;
        var detail_btnTabH = 0;
        function calc(){
            headerH = $("header").outerHeight();
            detail_tab_top = $tab.offset().top;
            detail_fixed_start = detail_tab_top - headerH;
            detail_btnTabH = $tab.outerHeight();
        }
        function syncLayout(){
            if($tab.hasClass("fixed")){
                $tab.css("top", headerH + "px");
                $("#detail1").css("padding-top", detail_btnTabH + "px");
            }
        }
        function updateFixed(){
            var scrollTop = $(window).scrollTop();

            if(scrollTop >= detail_fixed_start){
                if(!$tab.hasClass("fixed")){
                    $tab.addClass("fixed");
                }
                syncLayout();
            } else {
                $tab.removeClass("fixed").css("top", "0");
                $("#detail1").css("padding-top", "0");
            }
        }
        function updateActive(){
            var offsetLine = headerH + detail_btnTabH + 10;
            $tabs.each(function(index){
                var targetId = $(this).attr("data-target") || ("detail" + (index + 1));
                var $section = $('#' + targetId);
                if(!$section.length) return;

                var rect = $section[0].getBoundingClientRect();

                if(rect.top <= offsetLine && rect.bottom > offsetLine){
                    $tabs.removeClass('on');
                    $(this).addClass('on');
                }
            });
        }
        function updateAll(){
            updateFixed();
            updateActive();
        }
        $(window).on('load', function(){
            calc();
            setTimeout(function(){
                calc();
                updateAll();
            }, 300);
        });
        var resizeTimer;
        $(window).on('resize', function(){
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function(){
                calc();
                syncLayout();
                updateAll();
            }, 150);
        });
        // [핵심 유지] #detail1(포트폴리오) 비활성화 시 querySelector('#detail1')=null →
        // observe(null)이 에러를 던져 "그 아래 탭 클릭 핸들러 바인딩"까지 막혀 탭이 죽었음.
        // → 존재하는 첫 섹션(없으면 detailArea, 그래도 없으면 탭바)을 관찰하고, ResizeObserver 미지원/대상 없음도 가드.
        var roTarget = document.querySelector('#detail1')
            || document.querySelector('.xans-product-detail .detailArea')
            || $tab[0];
        if(window.ResizeObserver && roTarget){
            var observer = new ResizeObserver(function(){
                calc();
                syncLayout();
                updateAll();
            });
            observer.observe(roTarget);
        }
        $(window).on('scroll', function(){
            updateAll();
        });
        $tabs.on('click', function(e){
            e.preventDefault();
            e.stopPropagation();
            var targetId = $(this).attr("data-target") || ("detail" + ($(this).index() + 1));
            var $target = $('#' + targetId);
            if(!$target.length) return;
            var offset = headerH + detail_btnTabH;
            // [수정] 상품이미지가 매우 긴 페이지(수만~십수만px)에서 $('html,body').animate가
            // 엉뚱하게 안착/되돌아오는 문제 → 즉시 이동(window.scrollTo)으로 정확히 안착시킴
            var targetY = $(window).scrollTop() + $target[0].getBoundingClientRect().top - offset;
            window.scrollTo(0, targetY);
            $tabs.removeClass('on');
            $(this).addClass('on');
        });
    }
});
