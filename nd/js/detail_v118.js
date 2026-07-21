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
    function closeSimulatorPreviewForThumb(){
        if(typeof window.ND_OPTION_SIMULATOR_HIDE_PREVIEW === "function"){
            window.ND_OPTION_SIMULATOR_HIDE_PREVIEW();
            return;
        }
        var event;
        if(typeof window.CustomEvent === "function"){
            event = new CustomEvent("nd:simulator:hidePreview", { bubbles: true });
        } else {
            event = document.createEvent("Event");
            event.initEvent("nd:simulator:hidePreview", true, true);
        }
        document.dispatchEvent(event);
    }
    function getThumbSlideIndex(slide){
        if(!slide) return -1;
        var swiperSlides = slide_box_thumbs && slide_box_thumbs.slides ? slide_box_thumbs.slides : [];
        for(var i = 0; i < swiperSlides.length; i++){
            if(swiperSlides[i] === slide) return i;
        }
        var siblings = slide.parentNode ? slide.parentNode.children : [];
        for(var j = 0; j < siblings.length; j++){
            if(siblings[j] === slide) return j;
        }
        return -1;
    }
    function activateThumbImage(clickedIndex){
        clickedIndex = parseInt(clickedIndex, 10);
        if (isNaN(clickedIndex) || clickedIndex < 0) return;
        closeSimulatorPreviewForThumb();
        if(slide_box_viewer && typeof slide_box_viewer.update === "function"){
            slide_box_viewer.update();
        }
        if(slide_box_thumbs && typeof slide_box_thumbs.update === "function"){
            slide_box_thumbs.update();
        }
        slide_box_viewer.slideTo(clickedIndex, 0);
        slide_box_thumbs.slideTo(clickedIndex, 0);
        slide_box_thumbs.slides.removeClass('swiper-slide-thumb-active');
        slide_box_thumbs.slides.eq(clickedIndex).addClass('swiper-slide-thumb-active');
    }
    $(".prd_img_wrap .thumbs .swiper-slide-active").addClass("swiper-slide-thumb-active");
    slide_box_thumbs.on('click', function(swiper, e){
        activateThumbImage(swiper.clickedIndex);
    });
    $(".prd_img_wrap .thumbs").on("click", ".swiper-slide", function(event){
        event.preventDefault();
        var clickedIndex = getThumbSlideIndex(this);
        activateThumbImage(clickedIndex);
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

    function getFirstProductItemCode(){
        var data = window.option_stock_data;
        if(typeof data == "string"){
            try {
                data = JSON.parse(data);
            } catch(e) {
                data = null;
            }
        }
        if(!data || typeof data != "object") return "";
        for(var code in data){
            if(Object.prototype.hasOwnProperty.call(data, code)) return code;
        }
        return "";
    }

    function getCurrentProductNo(){
        var productNo = window.iProductNo || "";
        if(!productNo && window.URLSearchParams){
            productNo = new URLSearchParams(window.location.search).get("product_no") || "";
        }
        return String(productNo || "").replace(/[^\d]/g, "");
    }

    function getCalculatorUrl(){
        var origin = window.location.origin || (window.location.protocol + "//" + window.location.host);
        var prefix = window.location.pathname.indexOf("/skin-skin16/") === 0 ? "/skin-skin16" : "";
        return (origin + prefix + "/exec/front/shop/CalculatorProduct").replace(/\/skin-skin16\/skin-skin16\//g, "/skin-skin16/");
    }

    function getBulkBenefitQuantity(text){
        var match = String(text || "").match(/(\d+)\s*(?:개|세트|ea|EA)?\s*이상/);
        return match ? Math.max(parseInt(match[1], 10) || 0, 1) : 0;
    }

    function extractSerializedBulkBenefitName(text){
        var match = String(text || "").match(/sBulkbuy_name";s:\d+:"([^"]+)"/);
        return match ? $.trim(match[1]).replace(/\s+/g, " ") : "";
    }

    function extractBulkBenefitName(response){
        var item = null;
        $.each(response || {}, function(_, value){
            item = value;
            return false;
        });
        if(!item) return "";

        var addSale = Number(item.benefit_add_sale || item.add_sale || item.total_unit_add_sale || item.iTotalAddSalePrice || 0);
        var hasBulkSale = item.sale_calc_param && item.sale_calc_param.BulkSale;
        if(!addSale || !hasBulkSale) return "";

        return extractSerializedBulkBenefitName(item.bp_prd_extra);
    }

    function hideBulkBenefitRow($row, reason){
        $row.hide()
            .attr("data-nd-hidden-reason", reason || "no-bulk-benefit")
            .removeAttr("data-nd-benefit-visible data-nd-benefit-pending");
    }

    function syncActualBulkBenefit($row){
        var $td = $row.children("td");
        var text = $.trim($td.text() || "").replace(/\s+/g, " ");
        var emptyLike = /^(|[-–—]|없음|미등록|등록된\s*혜택이\s*없습니다\.?)$/;
        if(emptyLike.test(text) || /\{\$|\$\{/.test(text)){
            hideBulkBenefitRow($row);
            return;
        }

        var benefitNameMatch = text.match(/^혜택명\s*[:：]\s*(.+)$/);
        if(benefitNameMatch && $.trim(benefitNameMatch[1])){
            $td.text($.trim(benefitNameMatch[1]).replace(/\s+/g, " "));
            $row.show().attr("data-nd-benefit-visible", "true").removeAttr("data-nd-hidden-reason data-nd-benefit-pending");
            return;
        }

        var quantity = getBulkBenefitQuantity(text);
        var productNo = getCurrentProductNo();
        var itemCode = getFirstProductItemCode();

        $row.hide().attr("data-nd-benefit-pending", "true");
        if(!quantity || !productNo || !itemCode){
            hideBulkBenefitRow($row, "missing-bulk-benefit-data");
            return;
        }

        var requestData = {
            product_no: productNo,
            is_subscription: "F"
        };
        requestData["product[" + itemCode + "]"] = quantity;

        $.ajax({
            url: getCalculatorUrl(),
            data: requestData,
            dataType: "json",
            cache: false
        }).done(function(response){
            var benefitName = extractBulkBenefitName(response);
            if(!benefitName){
                hideBulkBenefitRow($row);
                return;
            }
            $td.text(benefitName);
            $row.show()
                .attr("data-nd-benefit-visible", "true")
                .removeAttr("data-nd-hidden-reason data-nd-benefit-pending");
        }).fail(function(){
            hideBulkBenefitRow($row, "bulk-benefit-request-failed");
        });
    }

    // 기존 항목 비노출
    $(".prd_info tr").each(function(){   
        var tit_text = normalizeInfoTitle($(this).children("th").text());
        if(tit_text == "대량구매혜택"){
            syncActualBulkBenefit($(this));
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

        function hasRenderableChoices($row){
            var $buttons = $row.find(".nd-option-buttons").first();
            if($buttons.children(".nd-option-button").length > 0) return true;

            var $select = $row.find("select.nd-option-native, select").first();
            var hasChoice = false;
            $select.children("option").each(function(){
                var label = $.trim($(this).text());
                if(this.value && this.value !== "*" && label && !isDividerOption(label)){
                    hasChoice = true;
                    return false;
                }
            });
            return hasChoice;
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
                var hasChoices = hasRenderableChoices($row);
                var show = hasChoices && (index === 0 || canShow);
                $row.toggleClass("nd-option-row-empty", !hasChoices);
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
        setTimeout(restore, 300);
    }

    function syncDeliveryChoice(){
        var $checked = $(".ndDeliveryChoice input:checked");
        if(!$checked.length) return;
        $(".ndDeliveryChoice label").removeClass("is-checked");
        $checked.closest("label").addClass("is-checked");
	        var method = $checked.val();
	        var fee = $checked.data("fee") || "";
	        var desc = $checked.data("desc") || "";
	        var label = method + (fee ? " / " + fee : "");
	        // [추가] 택배(선불): 상품 배송비(개당)를 읽어 표시·저장. 실제 합계 계산은 카페24가 장바구니/주문서에서 수행.
	        var ndUnitFee = (function(){
	            var t = $(".delivery").not(".displaynone").text() || "";
	            var m = t.match(/배송\s*비용[^0-9]*([0-9,]+)\s*원/);
	            return m ? parseInt(m[1].replace(/,/g, ""), 10) : 0;
	        })();
	        try { localStorage.setItem("ndDeliveryUnitFee", ndUnitFee ? String(ndUnitFee) : ""); } catch(e) {}
	        if(method.indexOf("택배") > -1 && ndUnitFee > 0){
	            desc = "택배 배송비(선불): 개당 " + ndUnitFee.toLocaleString("ko-KR") + "원 × 구매수량 (최종 금액은 장바구니·주문서에 표시됩니다)";
	        }
	        $(".ndDeliveryChoice__desc").text(desc).toggle(!!desc);
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
    $(document).on("touchstart mousedown", ".ndDeliveryChoice label, .ndDeliveryChoice input", function(e){
        e.stopPropagation();
        $(this).closest(".ndDeliveryChoice").data("ndScrollPosition", getDeliveryScrollPosition());
    });
    // [수정 2026-06-10] 모바일에서 배송비 버튼 탭 시 하단 상세로 점프하는 문제:
    // 라벨 기본동작(라디오 활성화→포커스 스크롤)을 차단하고 JS로 직접 선택한다.
    $(document).on("click", ".ndDeliveryChoice label", function(e){
        e.preventDefault();
        e.stopPropagation();
        var input = this.querySelector("input[type='radio']");
        if(!input) return;
        var $choice = $(this).closest(".ndDeliveryChoice");
        var position = $choice.data("ndScrollPosition") || getDeliveryScrollPosition();
        $choice.data("ndScrollPosition", position);
        if(!input.checked){
            input.checked = true;
            $(input).trigger("change");
        }
        restoreDeliveryScrollPosition(position);
    });
    $(".ndDeliveryChoice input").on("change", function(e){
        e.stopPropagation();
        var $choice = $(this).closest(".ndDeliveryChoice");
        var position = $choice.data("ndScrollPosition") || getDeliveryScrollPosition();
        syncDeliveryChoice();
        restoreDeliveryScrollPosition(position);
    });
    syncDeliveryChoice();

    /* [추가 2026-06-11] 택배배송(선불) 조건부 노출 (가꿈 규칙)
       - 상판 가로 ≤ 600(=600x400)인 옵션을 고른 경우에만 택배 노출
       - 640·650·700·740·800… 등 600 초과 = 택배 숨김 → 화물/방문수령만
       - 상판 사이즈 옵션이 없는 상품(의자/체어) = 택배 노출
       - 표시 전용. 카페24 옵션 select·제출값·청구 로직은 건드리지 않음. */
    /* [추가 2026-06-17] 개별설정-착불(택배 불가) 상품 감지 — 가꿈 요청(1006類, PPT 유형③)
       카페24 배송정보의 "배송 비용 :" 표시가 착불이면 택배 불가 상품 → 사이즈와 무관하게 택배 숨김.
       대조 확인: 1006(착불)="배송 비용 : 착불 30,000원" / 1017(선결제착불)="배송 비용 : 27,500원 ~ 55,000원".
       → "배송 비용:" 줄에 "착불"이 있으면 true. (긴 화물 안내 배너는 "배송 비용:" 형식이 아니라 미매칭) */
    function ndIsChakbulOnlyProduct(){
        var els = document.querySelectorAll("li, td, dd, p");
        for(var i = 0; i < els.length; i++){
            var t = (els[i].textContent || "").replace(/\s+/g, " ");
            if(t.length < 50 && /배송\s*비용\s*:/.test(t) && /착불/.test(t)){
                return true;
            }
        }
        return false;
    }
    function ndDeskSize(){
        var res = { hasSizeOpt: false, selected: false, width: null };
        var selects = $("select[id^='product_option_id']").toArray();
        for(var i = 0; i < selects.length; i++){
            var sel = selects[i];
            var label = ($(sel).closest("tr").find("th").text() || "");
            var selText = (sel.options && sel.options[sel.selectedIndex]) ? sel.options[sel.selectedIndex].text : "";
            // 상판 사이즈 옵션 판정: 라벨에 사이즈/크기, 또는 값이 NNN x NNN(중간 W/D/H 문자 허용) 패턴
            var looksSize = /사이즈|크기|size/i.test(label) || /\d{3}\s*[x×]\s*[A-Za-z]?\d{3}/.test(selText);
            if(!looksSize) continue;
            res.hasSizeOpt = true;
            var v = sel.value;
            if(v && v !== "*" && v !== "**"){
                res.selected = true;
                var m = selText.match(/(\d{3,4})/); // 첫 3~4자리 = 가로(mm)
                if(m) res.width = parseInt(m[1], 10);
            }
            break; // 첫 사이즈 옵션만 사용
        }
        return res;
    }
    function ndParcelAllowed(){
        if(ndIsChakbulOnlyProduct()) return false; // [추가] 개별설정 착불 = 택배 불가 → 사이즈 무관 숨김
        var d = ndDeskSize();
        if(!d.hasSizeOpt) return true;   // 상판 없음(의자/체어) → 택배 가능
        if(!d.selected) return false;    // 사이즈 미선택 → 택배 보류(숨김)
        return d.width != null && d.width <= 600; // 600x400만 택배
    }
    function ndApplyParcelEligibility(){
        var $parcel = $(".ndDeliveryChoice input[value*='택배']");
        if(!$parcel.length) return;
        var $label = $parcel.closest("label");
        if(ndParcelAllowed()){
            $label.css("display", "");
        } else {
            $label.css("display", "none");
            if($parcel.prop("checked")){
                // 택배가 선택돼 있었으면 화물배송(착불)로 자동 전환
                var $freight = $(".ndDeliveryChoice input[value*='화물'], .ndDeliveryChoice input[value*='착불']").first();
                if($freight.length && !$freight.prop("checked")){
                    $freight.prop("checked", true);
                    syncDeliveryChoice();
                }
            }
        }
    }
    ndApplyParcelEligibility();
    $(document).on("change", "select[id^='product_option_id'], select.nd-option-native", function(){
        window.setTimeout(ndApplyParcelEligibility, 80);
    });
    $(document).on("click", ".nd-option-button", function(){
        window.setTimeout(ndApplyParcelEligibility, 160);
    });

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

/* ===== [추가 2026-06-10] 모바일 옵션 단일 조합 유지 (피드백 슬라이드2) =====
 * 카페24 모바일 옵션 JS는 마지막 옵션을 바꿀 때마다 선택 조합 행(tr.option_product)을
 * "누적 추가"한다(PC는 교체). 고객 의도와 다르게 여러 조합이 담기는 문제를 막기 위해,
 * 같은 상품(target-key)의 조합 행이 2개 이상이면 최신 1개만 남기고 이전 행을
 * 카페24 자체 삭제 버튼(a.delete) 클릭으로 제거한다.
 *  - 카페24 공식 삭제 플로우를 그대로 사용 → 합계/제출 데이터 정합 유지(결제 안전)
 *  - 추가구성상품은 target-key가 달라 서로 영향 없음(각 1개씩 유지)
 *  - PC는 원래 교체 동작이라 이 가드는 사실상 no-op
 */
$(function(){
    var ndDedupeBusy = false;

    function ndDedupeOptionRows(){
        if(ndDedupeBusy) return;
        var $tbodies = $("tbody.option_products");
        if(!$tbodies.length) return;
        ndDedupeBusy = true;
        try {
            $tbodies.each(function(){
                var groups = {};
                $(this).find("tr.option_product").each(function(){
                    var key = $(this).attr("target-key") || "_";
                    (groups[key] = groups[key] || []).push(this);
                });
                Object.keys(groups).forEach(function(key){
                    var rows = groups[key];
                    for(var i = 0; i < rows.length - 1; i += 1){
                        var $del = $(rows[i]).find("a.delete").first();
                        if($del.length){
                            $del[0].click();
                        }
                    }
                });
            });
        } finally {
            setTimeout(function(){ ndDedupeBusy = false; }, 60);
        }
    }

    if(window.MutationObserver){
        var ndDedupeTimer = null;
        new MutationObserver(function(mutations){
            var relevant = mutations.some(function(m){
                var t = m.target;
                if(!t) return false;
                if(t.classList && t.classList.contains("option_products")) return true;
                return !!(t.closest && t.closest("tbody.option_products"));
            });
            if(!relevant) return;
            clearTimeout(ndDedupeTimer);
            ndDedupeTimer = setTimeout(ndDedupeOptionRows, 120);
        }).observe(document.body, { childList: true, subtree: true });
    }

    ndDedupeOptionRows();
});
