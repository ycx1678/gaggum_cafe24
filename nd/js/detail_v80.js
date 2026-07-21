$(function(){

    // 대표썸네일 롤링
    var detail_thumb_length = $(".prd_img_wrap .thumbs ul li").length;
    const slide_box_thumbs = new Swiper('.prd_img_wrap .thumbs', {
        slidesPerView: 5,
        spaceBetween: 4,
        loop: false,
        navigation: {
            nextEl: '.thumbs .swiper-button-next',
            prevEl: '.thumbs .swiper-button-prev'
        },
        observer: true,
        observeParents: true
    });
    const slide_box_viewer = new Swiper('.prd_img_wrap .viewer', {
        spaceBetween: 0,
        speed: 1000,
        loop: false,
        watchOverflow: true,
        thumbs: {
            swiper: slide_box_thumbs
        },
        pagination: {
            el: '.viewer .swiper-pagination',
            clickable: true
        }
    });
    $(".prd_img_wrap .thumbs .swiper-slide-active").addClass("swiper-slide-thumb-active");
    slide_box_thumbs.on('click', function(swiper, e){
        const clickedIndex = swiper.clickedIndex;
        if (typeof clickedIndex !== 'undefined') {
            slide_box_viewer.slideTo(clickedIndex);
        }
    });
    slide_box_viewer.on('slideChange', function(){
        const activeIndex = slide_box_viewer.activeIndex;
        slide_box_thumbs.slideTo(activeIndex);
        slide_box_thumbs.slides.removeClass('swiper-slide-thumb-active');
        slide_box_thumbs.slides.eq(activeIndex).addClass('swiper-slide-thumb-active');
    });
    
    if(detail_thumb_length < 2){
        $(".prd_img_wrap .thumbs").hide();
    }

    /* vertical thumbs */
    /*
    var slide_gap = 10; // 썸네일 목록 간격(px)
    var detail_tahumb_length = $(".prd_img_wrap .thumbs .list li").length;
    if(detail_tahumb_length > 1){
        $(".nd .prd_img_wrap").addClass("thumbs_on");
        $(".nd .prd_img_wrap .thumbs").fadeIn();
        $(".prd_img_wrap .thumbs .list a").each(function(index){
            $(this).attr("data-slide-index", index);
        });
        $(".prd_img_wrap .thumbs .list").bxSlider({
            //slideWidth: 120,
            mode: 'vertical',
            minSlides: 5,
            moveSlides: 1,
            slideMargin: slide_gap,
            pager: false,
            infiniteLoop: false,
            controls: true,
            prevText: '<i class=xi-angle-up-thin></i>',
            nextText: '<i class=xi-angle-down-thin></i>',
        });
        $(".prd_img_wrap .viewer .list").bxSlider({
            pagerCustom: '.prd_img_wrap .thumbs .list',
            controls: false,
            mode: 'fade',
            auto: false,
            pause: 4000,
            touchEnabled: true,
            preventDefaultSwipeY: false, // 세로 스크롤 허용
            swipeThreshold: 120,         // 임계값 크게 (기본 50)
            oneToOneTouch: false            
        });
        setTimeout(function(){
            var viewer_w = $(".prd_img_wrap .viewer").width();
            $(".prd_img_wrap .viewer .list li").css("width", viewer_w+"px");
            var viewer_h = $(".prd_img_wrap .viewer .list li img").height();
            $(".prd_img_wrap .viewer .bx-viewport").css("height", viewer_h+"px");
        }, 300);
    } else {
        $(".prd_img_wrap .viewer .list").bxSlider({
            pagerCustom: '.prd_img_wrap .thumbs .list',
            controls: false,
            mode: 'fade',
            auto: false,
            pause: 4000,
            touchEnabled: true,
            preventDefaultSwipeY: false, // 세로 스크롤 허용
            swipeThreshold: 120,         // 임계값 크게 (기본 50)
            oneToOneTouch: false            
        });
    }
    // 방향 감지 스크립트 추가
    (function() {
        var startX, startY, isVertical;
        const el = document.querySelector('.prd_img_wrap .viewer'); // 슬라이더 래퍼 선택

        el.addEventListener('touchstart', function(e) {
            const t = e.touches[0];
            startX = t.clientX;
            startY = t.clientY;
            isVertical = null;
        }, { passive: true });

        el.addEventListener('touchmove', function(e) {
            const t = e.touches[0];
            const dx = Math.abs(t.clientX - startX);
            const dy = Math.abs(t.clientY - startY);

            if (isVertical === null) {
                isVertical = dy > dx;
            }
            if (isVertical) {
                return;
            } else {
            }
        }, { passive: false });
    })();

    
    function mobile_thumb_remove(){
        var winW = $(window).width();
        if(winW <= 1024){
            $(".nd .prd_img_wrap").removeClass("thumbs_on");
            $(".nd .prd_img_wrap .thumbs").hide();
        }
    }
    mobile_thumb_remove();
    function debounce(func, delay) {
        var timer;
        return function() {
            var context = this, args = arguments;
            clearTimeout(timer);
            timer = setTimeout(function() {
                func.apply(context, args);
            }, delay);
        };
    }
    $(window).resize(debounce(function(){
        mobile_thumb_remove();
    }, 200));
    */

    /* =========================
   추가구성상품 토글 (addBoxTitle 버전)
   ========================= */
    $(".productSet.additional").each(function(){
        var $wrap = $(this);
        $wrap.removeClass("is-open");
        $wrap.children(".product").hide();
    });

    $(document).on("click", ".productSet.additional .addBoxTitle, .productSet.additional .addBoxToggle", function(e){
        e.preventDefault();

        var $wrap = $(this).closest(".productSet.additional");
        var $product = $wrap.children(".product");
        var $icon = $wrap.find(".addBoxToggle i");

        if($wrap.hasClass("is-open")){
            $wrap.removeClass("is-open");
            $product.stop(true,true).slideUp(200);
            $icon.css("transform","rotate(0deg)");
        } else {
            $wrap.addClass("is-open");
            $product.stop(true,true).slideDown(200);
            $icon.css("transform","rotate(180deg)");
        }
    });


    // 이미지꾸미기 인식
    var ico_img = $("#prdDetailImg > span").html();
    $(".viewer ul > li:first-child").append(ico_img);

    function normalizeInfoTitle(text){
        return $.trim(text || "").replace(/\s+/g, "");
    }

    function hasActualBulkBenefit($row){
        var $td = $row.children("td");
        var text = $.trim($td.text() || "").replace(/\s+/g, " ");
        if($td.find("[data-benefit-name], .benefitName, .benefit_name, .ec-benefit, [class*='benefit']").length > 0){
            return true;
        }
        if(/^혜택명\s*[:：]\s*\S+/.test(text)){
            return true;
        }
        return false;
    }

    // 기존 항목 비노출
    $(".prd_info tr").each(function(){   
        var tit_text = normalizeInfoTitle($(this).children("th").text());
        if(tit_text == "대량구매혜택"){
            if(!hasActualBulkBenefit($(this))){
                $(this).hide().attr("data-nd-hidden-reason", "no-bulk-benefit");
            }
            return;
        }
        if(tit_text == "소비자가" || tit_text == "판매가" || tit_text == "할인판매가" || tit_text == "상품간략설명" || tit_text == "할인기간"){
            $(this).hide();
        }    
        if(tit_text == "소비자가"){
            var add_custom = $(this).children("td").find("#span_product_price_custom").text();
            $(".detail_top_price .custom").text(add_custom);
        }
        if(tit_text == "판매가"){
            var add_price = $(this).children("td").find("#span_product_price_text").text();
            $(".detail_top_price .price").text(add_price);
        }
        if(tit_text == "할인판매가"){
            var add_sale = $(this).children("td").find("#span_product_price_sale").text();
            if($(this).children("td").find("#span_product_price_sale").children("span").length > 0){
                $(this).children("td").find("#span_product_price_sale").children("span").remove();
                var add_sale_filter = $(this).children("td").find("#span_product_price_sale").text();
            } else {
                var add_sale_filter = add_sale;
            }
            $(".detail_top_price .sale").text(add_sale_filter);
        }
    });

    var custom = $(".detail_top_price .custom").text();
    var price = $(".detail_top_price .price").text();
    var sale = $(".detail_top_price .sale").text();

    var discount_type = 0;
    if(custom == price || custom == ""){
        $(".detail_top_price .custom").hide();
    } else {
        discount_type = 1;
    }
    if(sale != ""){
        $(".detail_top_price .custom").hide();
        $(".detail_top_price .price").addClass("strike");
        discount_type = 2;
    }
    // 할인율
    var prd_custom = custom.replace(/[^0-9]/g,'');
    var prd_price = price.replace(/[^0-9]/g,'');
    var prd_sale = sale.replace(/[^0-9]/g,'');
    var discount_price;
    if(discount_type == 1){
        discount_price = Math.round((prd_custom-prd_price)/prd_custom*100);
        $(".detail_top_price .price").after($("<p class=price_discount>"+discount_price+"%</p>"));
    } else if(discount_type == 2){
        discount_price = Math.round((prd_price-prd_sale)/prd_price*100);
        $(".detail_top_price .sale").after($("<p class=price_discount>"+discount_price+"%</p>"));
    }
    //console.log("할인타입 "+discount_type, "소비자가 "+prd_custom, "판매가 "+prd_price, "할인판매가 "+prd_sale);

    // 구매정보안내 탭
    $(".detail_tab_wrap li").click(function(){
        var tab_id = $(this).attr("data-tab");
        $(".detail_tab_wrap li").removeClass("on");
        $(".tab_con").removeClass("on");

        $(this).addClass("on");
        $("#"+tab_id).addClass("on");
    });

    // 세트상품 있을때 옵션결과 넓이 조정
    if($(".productSet .product").length > 0){
        $("#totalProducts").addClass("set_on");
    }

    function initOptionButtons(){
        function isDividerOption(label){
            var text = $.trim(label || "").replace(/\s/g, "");
            return /^[-–—─]{3,}$/.test(text);
        }

        function getOptionStepRows(){
            return $(".xans-product-detail table.xans-product-option tbody > tr").filter(function(){
                return $(this).find("select.nd-option-native, select").length > 0;
            });
        }

        function hasValidSelection($select){
            var option = $select.children("option:selected")[0];
            if(!option) return false;
            var value = option.value;
            var label = $.trim($(option).text());
            return !!(value && value !== "*" && label && !isDividerOption(label) && !option.disabled);
        }

        function resetFollowingOptions($current){
            var $rows = getOptionStepRows();
            var index = $rows.index($current.closest("tr"));
            if(index < 0) return;
            $rows.slice(index + 1).each(function(){
                var $select = $(this).find("select.nd-option-native, select").first();
                if(!$select.length) return;
                var $fallback = $select.children("option").filter(function(){
                    var label = $.trim($(this).text());
                    return !this.value || this.value === "*" || isDividerOption(label);
                }).first();
                if($fallback.length){
                    $select.val($fallback.val());
                } else {
                    $select.prop("selectedIndex", 0);
                }
                $select.trigger("change");
            });
        }

        function revealOptionSteps(){
            var canShow = true;
            getOptionStepRows().addClass("nd-option-step").each(function(index){
                var $row = $(this);
                var $select = $row.find("select.nd-option-native, select").first();
                var show = index === 0 || canShow;
                $row.toggle(show);
                canShow = show && hasValidSelection($select);
            });
        }

        $(".xans-product-detail table.xans-product-option select").each(function(){
            var $select = $(this);
            if($select.data("ndOptionReady")) return;
            $select.data("ndOptionReady", true).addClass("nd-option-native");

            var $buttons = $('<div class="nd-option-buttons" />');
            $select.after($buttons);

            function render(){
                $buttons.empty();
                $select.children("option").each(function(){
                    var option = this;
                    var value = option.value;
                    var label = $.trim($(option).text());
                    if(!value || value === "*" || label === "" || isDividerOption(label)) return;

                    var $button = $('<button type="button" class="nd-option-button" />').text(label);
                    if(option.disabled) $button.addClass("is-disabled").prop("disabled", true);
                    if($select.val() === value) $button.addClass("is-selected");
                    $button.on("click", function(){
                        if($(this).hasClass("is-disabled")) return;
                        resetFollowingOptions($select);
                        $select.val(value).trigger("change");
                        render();
                        setTimeout(function(){
                            resetFollowingOptions($select);
                            initOptionButtons();
                            revealOptionSteps();
                            scrollNextOption($select);
                        }, 120);
                    });
                    $buttons.append($button);
                });
                $buttons.toggle($buttons.children().length > 0);
                revealOptionSteps();
            }

            function scrollNextOption($current){
                var $rows = $(".xans-product-detail table.xans-product-option tbody > tr:visible");
                var index = $rows.index($current.closest("tr"));
                var $next = $rows.slice(index + 1).filter(function(){
                    return $(this).find("select, input[type='text'], textarea, .nd-option-buttons:visible").length > 0;
                }).first();
                if($next.length){
                    var $mobileScroller = $(".detailArea.nd-mobile-option-panel .info_inner").first();
                    if($mobileScroller.length){
                        var scroller = $mobileScroller[0];
                        var scrollerRect = scroller.getBoundingClientRect();
                        var nextRect = $next[0].getBoundingClientRect();
                        scroller.scrollTo({
                            top: scroller.scrollTop + nextRect.top - scrollerRect.top - 18,
                            behavior: "smooth"
                        });
                    } else {
                        $next[0].scrollIntoView({ behavior: "smooth", block: "center" });
                    }
                }
            }

            render();
            $select.on("change", render);

            if(window.MutationObserver){
                new MutationObserver(render).observe($select[0], {
                    childList: true,
                    subtree: true,
                    attributes: true,
                    attributeFilter: ["disabled", "selected"]
                });
            }
        });
        revealOptionSteps();
    }
    initOptionButtons();

    function getDeliveryScrollPosition(){
        var $panel = $(".detailArea.nd-mobile-option-panel .info_inner").first();
        return {
            windowTop: $(window).scrollTop(),
            panelTop: $panel.length ? $panel.scrollTop() : 0
        };
    }

    function restoreDeliveryScrollPosition(position){
        if(!position || $(window).width() > 1024) return;
        var restore = function(){
            window.scrollTo(0, position.windowTop);
            var $panel = $(".detailArea.nd-mobile-option-panel .info_inner").first();
            if($panel.length){
                $panel.scrollTop(position.panelTop);
            }
        };
        setTimeout(restore, 0);
        setTimeout(restore, 80);
    }

    function syncDeliveryChoice(){
        var $checked = $(".ndDeliveryChoice input:checked");
        if(!$checked.length) return;
        $(".ndDeliveryChoice label").removeClass("is-checked");
        $checked.closest("label").addClass("is-checked");
        var method = $checked.val();
        var fee = $checked.data("fee") || "";
        var label = method + (fee ? " / " + fee : "");
        try {
            localStorage.setItem("ndDeliveryMethod", method);
            localStorage.setItem("ndDeliveryFee", fee);
        } catch(e) {}

        $(".xans-product-addoption").each(function(){
            var rowText = $(this).text();
            if(rowText.indexOf("배송") > -1){
                $(this).find("input[type='text'], textarea").val(label).trigger("change");
            }
        });
    }
    $(document).on("touchstart mousedown click", ".ndDeliveryChoice label, .ndDeliveryChoice input", function(e){
        e.stopPropagation();
        $(this).closest(".ndDeliveryChoice").data("ndScrollPosition", getDeliveryScrollPosition());
    });
    $(".ndDeliveryChoice input").on("change", function(e){
        e.stopPropagation();
        var $choice = $(this).closest(".ndDeliveryChoice");
        var position = $choice.data("ndScrollPosition") || getDeliveryScrollPosition();
        syncDeliveryChoice();
        restoreDeliveryScrollPosition(position);
    });
    syncDeliveryChoice();
    
    
    
    function updateMobileDetailPanel(){
        var $win = $(window);
        var $detailArea = $(".xans-product-detail .detailArea").first();
        var $imgArea = $detailArea.find(".imgArea").first();

        if(!$detailArea.length || !$imgArea.length){
            return;
        }

        if($win.width() > 1024){
            $detailArea.removeClass("nd-mobile-option-panel");
            if($detailArea[0] && $detailArea[0].style){
                $detailArea[0].style.removeProperty("--nd-mobile-detail-height");
                $detailArea[0].style.removeProperty("--nd-mobile-thumb-height");
            }
            return;
        }

        var winHeight = window.innerHeight || $win.height();
        var headerHeight = $("header").outerHeight() || $("#header").outerHeight() || 0;
        var availableHeight = Math.max(winHeight - Math.min(headerHeight, 70), 520);
        var measuredImageHeight = $imgArea.outerHeight() || Math.round(winHeight * 0.44);
        var thumbHeight = Math.min(Math.max(measuredImageHeight, 220), Math.round(winHeight * 0.48));

        $detailArea.addClass("nd-mobile-option-panel");
        if($detailArea[0] && $detailArea[0].style){
            $detailArea[0].style.setProperty("--nd-mobile-detail-height", availableHeight + "px");
            $detailArea[0].style.setProperty("--nd-mobile-thumb-height", thumbHeight + "px");
        }
    }

    updateMobileDetailPanel();
    $(window).on("load", updateMobileDetailPanel);
    $(".prd_img_wrap .viewer img").on("load", updateMobileDetailPanel);

    function getMobileOptionScroller(){
        if($(window).width() > 1024) return null;
        var detailArea = document.querySelector(".detailArea.nd-mobile-option-panel");
        if(!detailArea) return null;
        var scroller = detailArea.querySelector(".infoArea .info_inner");
        if(!scroller) return null;
        if(scroller.scrollHeight <= scroller.clientHeight + 1) return null;
        return scroller;
    }

    function moveMobileOptionScroller(deltaY){
        var scroller = getMobileOptionScroller();
        if(!scroller || !deltaY) return false;

        var maxTop = scroller.scrollHeight - scroller.clientHeight;
        var currentTop = scroller.scrollTop;
        var canMoveDown = deltaY > 0 && currentTop < maxTop - 1;
        var canMoveUp = deltaY < 0 && currentTop > 1;

        if(!canMoveDown && !canMoveUp) return false;

        scroller.scrollTop = Math.max(0, Math.min(maxTop, currentTop + deltaY));
        return true;
    }

    function bindMobileImageScrollProxy(){
        var imageArea = document.querySelector(".xans-product-detail .imgArea");
        if(!imageArea || imageArea.__ndMobileImageScrollProxy) return;
        imageArea.__ndMobileImageScrollProxy = true;

        var touchState = {
            active: false,
            startX: 0,
            startY: 0,
            lastY: 0,
            mode: ""
        };

        imageArea.addEventListener("touchstart", function(e){
            if($(window).width() > 1024 || e.touches.length !== 1){
                touchState.active = false;
                return;
            }
            var touch = e.touches[0];
            touchState.active = true;
            touchState.startX = touch.clientX;
            touchState.startY = touch.clientY;
            touchState.lastY = touch.clientY;
            touchState.mode = "";
        }, { passive: true });

        imageArea.addEventListener("touchmove", function(e){
            if(!touchState.active || $(window).width() > 1024 || e.touches.length !== 1) return;

            var touch = e.touches[0];
            var diffX = touch.clientX - touchState.startX;
            var diffY = touch.clientY - touchState.startY;

            if(!touchState.mode){
                if(Math.max(Math.abs(diffX), Math.abs(diffY)) < 8) return;
                touchState.mode = Math.abs(diffY) > Math.abs(diffX) ? "vertical" : "horizontal";
            }

            if(touchState.mode !== "vertical") return;

            var deltaY = touchState.lastY - touch.clientY;
            touchState.lastY = touch.clientY;

            if(moveMobileOptionScroller(deltaY)){
                e.preventDefault();
                e.stopPropagation();
            }
        }, { passive: false });

        imageArea.addEventListener("touchend", function(){
            touchState.active = false;
            touchState.mode = "";
        }, { passive: true });

    }

    bindMobileImageScrollProxy();

    // 상세 이미지 구간에서도 옵션 선택 영역을 우측에 유지
    function resetFloatingDetailContent(){
        $(".xans-product-additional.section").first().css({
            width: "",
            maxWidth: "",
            marginLeft: "",
            marginRight: "",
            paddingRight: ""
        });
    }

    function clearFloatingOption(){
        $("body").removeClass("nd-option-floating-active");
        resetFloatingDetailContent();
        if(document.body && document.body.style){
            document.body.style.removeProperty("--nd-detail-floating-width");
        }
        $(".xans-product-detail .infoArea")
            .removeClass("fixed nd-detail-floating")
            .css({
                left: "",
                right: "",
                top: "",
                width: "",
                bottom: "",
                maxHeight: ""
            })
            .each(function(){
                if(this && this.style){
                    this.style.removeProperty("--nd-detail-floating-max-height");
                }
            });
    }

    function updateFloatingOption(){
        $(".fix_btn").hide();

        var $win = $(window);
        var $info = $(".xans-product-detail .infoArea").first();
        var $detailArea = $(".xans-product-detail .detailArea").first();
        var $detailStart = $("#detail1").first();
        var $floatingStart = $("#detail2").first();
        var $detailEnd = $(".xans-product-additional .detail_section[id^='detail']").last();
        var $additional = $(".xans-product-additional.section").first();

        if(!$info.length || !$detailArea.length || $win.width() <= 1024){
            clearFloatingOption();
            return;
        }

        var headerHeight = $("header").outerHeight() || 80;
        var $detailBtnTab = $("#detail_btnTab");
        var detailBtnTabHeight = ($detailBtnTab.length && $detailBtnTab.hasClass("fixed"))
            ? ($detailBtnTab.outerHeight() || 0)
            : 0;
        var top = headerHeight + detailBtnTabHeight + 12;
        var scrollTop = $win.scrollTop();
        var startPoint = $floatingStart.length
            ? $floatingStart.offset().top
            : ($detailStart.length ? $detailStart.offset().top + $detailStart.outerHeight() : $detailArea.offset().top + $detailArea.outerHeight());
        var start = startPoint - top;
        var end = ($detailEnd.length ? $detailEnd.offset().top + $detailEnd.outerHeight() : $(document).height()) - (headerHeight + 16) - 80;

        if(scrollTop < start || scrollTop > end){
            clearFloatingOption();
            return;
        }

        // 묶음(컨텐츠 + 플로팅)을 viewport 가운데에 배치 — 좌우 동일 여백
        // 단, 우측 퀵메뉴 영역(80px) 미만으로 줄어들지 않도록 보장
        var minSideOffset = 80;
        var panelWidth = Math.min(Math.max($info.outerWidth() || 540, 520), 560);
        panelWidth = Math.min(panelWidth, Math.max($win.width() - (minSideOffset * 2), 360));
        var panelMaxHeight = Math.min(Math.round($win.height() * 0.78), Math.max($win.height() - top - 24, 420));
        var gap = 20; // 컨텐츠와 플로팅 옵션 사이 여백
        var preferredContentWidth = 700;
        var contentWidth = Math.min(preferredContentWidth, $win.width() - (minSideOffset * 2) - panelWidth - gap);
        contentWidth = Math.max(contentWidth, 420);
        // bundle을 가운데 정렬: 좌측 여백 = 우측 여백 = (viewport - bundle) / 2
        var bundleWidth = contentWidth + gap + panelWidth;
        var centeredOffset = Math.max(Math.floor(($win.width() - bundleWidth) / 2), minSideOffset);
        var panelLeft = $win.width() - centeredOffset - panelWidth;

        // 자연 오프셋 측정
        var naturalLeft = 0;
        if($additional.length && $additional[0].getBoundingClientRect){
            var prevMargin = $additional[0].style.marginLeft;
            $additional[0].style.marginLeft = "0px";
            naturalLeft = Math.max($additional[0].getBoundingClientRect().left, 0);
            $additional[0].style.marginLeft = prevMargin;
        }
        var contentMarginLeft = Math.max(centeredOffset - naturalLeft, 0);
        $("body").addClass("nd-option-floating-active");
        if(document.body && document.body.style){
            document.body.style.setProperty("--nd-detail-floating-width", panelWidth + "px");
        }
        if($additional.length && contentWidth > 420){
            $additional.css({
                width: contentWidth + "px",
                maxWidth: contentWidth + "px",
                marginLeft: contentMarginLeft + "px",
                marginRight: "auto",
                paddingRight: "0"
            });
        }

        if(!$info.hasClass("nd-detail-floating")){
            $info
                .addClass("nd-detail-floating")
                .css({
                    left: "auto",
                    right: centeredOffset + "px",
                    width: panelWidth + "px"
                });
        }

        $info.css({
            left: "auto",
            right: centeredOffset + "px",
            top: top + "px",
            maxHeight: panelMaxHeight + "px"
        });
        if($info[0] && $info[0].style){
            $info[0].style.setProperty("--nd-detail-floating-max-height", panelMaxHeight + "px");
        }
    }

    updateFloatingOption();
    $(window).on("scroll", updateFloatingOption);

    let resizeTimer;
    $(window).on("resize", function(){
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function(){
            clearFloatingOption();
            updateMobileDetailPanel();
            updateFloatingOption();
        }, 100);
    });
    $(".fix_btn").on("click", function(){
        $(".infoArea.fixed").css("bottom","0");
    });
    $(".close_btn").on("click", function(){
        $(".infoArea.fixed").css("bottom","-100%");
    });


    // 관련상품 롤링
	    var rel_prd = new Swiper('.relation .swiper-container', {
	        slidesPerView: 5,
	        spaceBetween: 20,
	        speed: 1000,
	        loop: false,
	        simulateTouch: false,
        autoplay: {
            delay: 4000,
            disableOnInteraction: false,
        },
        observer: true,
        observeParents: true,
	        scrollbar: {
	            el: '.relation .swiper-scrollbar',
	            draggable: false,
	        },
        breakpoints: {
            1024: {
                slidesPerView: 2,
                spaceBetween: 8,
            },
        }
    });

    var $head_h = $("header").outerHeight();

    // 게시판 클릭 후 위치
    var de_link = document.location.href;
    var tab_name = de_link.split("#");
    var tab_name_str = tab_name[1];

    if(tab_name_str == "use_review"){
        $("html, body").animate({
            scrollTop : $("#detail5").offset().top - $head_h
        }, 0);
    }

    if(tab_name_str == "use_qna"){
        $("html, body").animate({
            scrollTop : $("#detail5").offset().top - $head_h
        }, 0);
    }
    // pay sample img
    /*
    var presidentName = $(".paySampleCheck").attr("data-name");
    if(presidentName == "어썸디" || presidentName == "AWESOMED" || presidentName == "AWESOME:D"){
        var ndSkinPrefix = window.location.pathname.indexOf('/skin-skin16') === 0 ? '/skin-skin16' : '';
        $("#NaverChk_Button").append("<img src='" + ndSkinPrefix + "/nd/images/pay_sample_naver.jpg' />");
        $("#appPaymentButtonBox").append("<img src='" + ndSkinPrefix + "/nd/images/pay_sample_kakao.jpg' />");
        $("#NaverChk_Button img, #appPaymentButtonBox img").css("cursor", "pointer");
        $("#NaverChk_Button img, #appPaymentButtonBox img").click(function(){
            alert("페이 서비스는 쇼핑몰 관리자의 설정이 필요합니다.");
        });
    }
    */

    $(function () {
        var $sets = $('.productSet.additional');
        if ($sets.length > 1) {
            $sets.not(':first').find('.addBoxTitle').hide();
        }
    });

    $(function () {
        var $sets = $('.productSet.additional');
        if ($sets.length < 2) return;

        var $firstSet = $sets.first();
        var $firstProduct = $firstSet.find('.product');

        $sets.not(':first').each(function () {
            $(this).find('.product > li').appendTo($firstProduct);
            $(this).remove();
        });
    });

    $(window).on("load", function () {

        var $addSet = $(".productSet.additional");

        // 혹시 중복 남아있으면 제거
        $addSet.not(":first").remove();

        // 정상 노출
        $(".productSet.additional").css({
            opacity: 1,
            height: "auto",
            overflow: "visible"
        });

    });

});
