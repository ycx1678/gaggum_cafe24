$(function(){

    // 상품 롤오버 이미지는 유효한 대체 이미지가 있을 때만 작동시킨다.
    $(".nd .ec-base-product .prdList .prdImg > a").each(function(){
        var $link = $(this);
        var $base = $link.children("img:not(.on)").first();
        var $hover = $link.children("img.on").first();
        var baseSrc = $.trim($base.attr("src") || "");
        var hoverSrc = $.trim($hover.attr("src") || "");

        if(!$hover.length || !hoverSrc || hoverSrc === "/" || hoverSrc.indexOf("{$") > -1 || hoverSrc === baseSrc){
            $hover.remove();
            return;
        }

        $link.addClass("nd-has-hover-image");
        $link.closest("li").addClass("nd-has-hover-image");
    });

    // 갤러리게시판 공지체크
    var notice_length = $(".nd .xans-board-notice-8 li").children(".description").length;
    if(notice_length > 0){
        $(".nd .xans-board-listpackage-8 .notice").addClass("on");
    }
    
    // 포토리뷰로 강제이동
    $(".xans-layout-boardinfo > li").each(function(){
        var top_link = $(this).children("a").attr("href");
        var top_code = top_link.slice(-3, top_link.length);
        if(top_code == "/4/"){
            $(this).children("a").attr("href","/board/review/thumb/list.html?board_no=4");
        }  
    });
    
    // 비회원 주문조회 항목명 기입
	$(".nd .xans-myshop-orderhistorynologin dd:first-child > input").attr("placeholder","주문자명");
    $(".nd .xans-myshop-orderhistorynologin dd:nth-child(2) > input").attr("placeholder","주문번호 / 하이픈(-) 포함");
    $(".nd .xans-myshop-orderhistorynologin dd:last-child > input").attr("placeholder","비회원주문 비밀번호");

    
    // 상품목록 정렬 처리
    /*
    $(".prdList .spec > li").each(function(){
    	var prd_tit = $(this).children(".title").children("span").text();
        var discount = $(this).parent().parent().parent().find(".discount_rate");
        if(prd_tit == "판매가" || prd_tit == "소비자가"){
            $(this).css({"display":"inline-block", "margin-right":"5px"});
        }
        if(prd_tit == "판매가"){
        	$(this).append(discount);
        }
    });
    */
    var $priceName1 = "소비자가";
    var $priceName2 = "판매가";
    var $priceName3 = "할인판매가";
    var $specTitle = "할인 기간";
    var sale_type = 0;
    $(".prdList .xans-product-listitem > li, .prdList .xans-search-listitem > li").each(function(){
        var $li = $(this);
        var list_tit  = $li.find(".title").children("span").text();
        if(list_tit == $priceName1){
            $li.addClass("prdCustom").css("display", "inline-block").css("margin-right", "5px");;
            var $price1 = $li.find(".title").next("span").text();
            $li.attr("data-price", $price1.replace(/[^0-9]/g,''));
            sale_type = 1;
        }
        if(list_tit == $priceName2){
            $li.addClass("prdPrice").css("display", "inline-block").css("margin-right", "5px");;
            var $price2 = $li.find(".title").next("span").text();
            $li.attr("data-price", $price2.replace(/[^0-9]/g,''));
        }
        if(list_tit == $priceName3){
            $li.addClass("prdSale").css("display", "inline-block").css("margin-right", "5px");;
            var $price3 = $li.find(".title").next("span").text();
            $li.attr("data-price", $price3.replace(/[^0-9]/g,''));
            sale_type = 2;
        }
        $li.parent().attr("discount_type", sale_type);
        // 할인 기간 항목 가림처리
        if(list_tit == $specTitle){
            $li.hide();
        }
    });
    $(".ec-base-product .prdList li.xans-record-").each(function(){
        var $prd = $(this);
        var $discount_type = $prd.find(".xans-product-listitem, .xans-search-listitem").attr("discount_type");
        if($discount_type == 1){
            var $prdCustom = $prd.find(".prdCustom").attr("data-price");
            var $prdPrice = $prd.find(".prdPrice").attr("data-price");
            var $discount = Math.round(($prdCustom - $prdPrice) / $prdCustom * 100);
            if($discount > 0){
                $prd.find(".prdPrice").after($("<li class=price_discount>"+$discount+"%</li>"));
            }
        } else if($discount_type == 2){
            var $prdPrice = $prd.find(".prdPrice").attr("data-price");
            var $prdSale = $prd.find(".prdSale").attr("data-price");
            var $discount = Math.round(($prdPrice - $prdSale) / $prdPrice * 100);
            $prd.attr("data-discount", $discount);
            if($discount > 0){
                $prd.find(".prdSale").after($("<li class=price_discount>"+$discount+"%</li>"));
            }
            $prd.find(".prdCustom").hide();
            $prd.find(".prdPrice").addClass("small_price");
        }

        // 타임 세일
        $(this).find(".prdImg").prepend('<div class="time_box"><span><i class="xi-spin xi-spinner-4"></i>할인 남은 시간</span><div id="timer"></div></div>');
    });
    // detail page
    if($(".detailArea .prd_img_wrap").length > 0) $(".detailArea .prd_img_wrap .viewer").append('<div class="time_box"><span><i class="xi-spin xi-spinner-4"></i>할인 남은 시간</span><div id="timer"></div></div>');
    
    var saleTimer = setInterval(function(index) {
        $(".ec-base-product .prdList li.xans-record-, .xans-product-detail .xans-product-detaildesign .xans-record-").each(function(){
            var now = new Date().getTime();
            var date_txt = $(this).find(".layerDiscountPeriod .content > p:last-child").text().trim();
            if(!date_txt){ // 상세페이지용
                date_txt = $(this).find(".period").text().trim();
            }
            //var date_txt_re = date_txt.slice(-16);
            
            var parts = date_txt.split("~");
            if(parts.length < 2) return; // fail

            var startDateStr = parts[0].trim().replace(" ", "T") + ":00"; // ISO 포맷
            var endDateStr   = parts[1].trim().replace(" ", "T") + ":00";

            var startDate = new Date(startDateStr).getTime();
            var endDate   = new Date(endDateStr).getTime();
            if(now < startDate){
                // 시작 전
                //$(this).find("#timer").html("<p>타임세일 준비중</p>");
                //return;
            }
            if(now > endDate){
                // 종료
                //$(this).find("#timer").html("<p>타임세일 종료</p>");
                //return;
            }
            var distance = endDate - now;

            // Time calculations
            var days = Math.floor(distance / (1000 * 60 * 60 * 24)) + "일";
            var hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            var minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            var seconds = Math.floor((distance % (1000 * 60)) / 1000);

            // Display the result
            let res = timePart(String(days).padStart(2,"0"), "dd") 
                    + timePart(String(hours).padStart(2,"0"), "hh") 
                    + timePart(String(minutes).padStart(2,"0"), "mm")  
                    + timePart(String(seconds).padStart(2,"0"), "ss");
            
            if($(this).closest(".ec-base-product").length > 0){
                // 목록 페이지
                $(this).find("#timer").html(res);
            } else {
                // 상세 페이지
                $(".prd_img_wrap #timer").html(res);
            }
            function timePart(val, cls){
                return `<div class="timer ${cls}"><span>${val}</span></div>`;
            }
            var time_length = $("#timer .timer").length;

            // 품절 상품
            if($(this).find("img[alt='품절']").length > 0){
                //$(this).find(".time_box").show().html("<p>타임세일이 종료되었습니다.</p>");
            }
            // 타임 설정 유무
            if($(this).find(".layerDiscountPeriod").length > 0){
                $(this).find(".time_box").css('display','flex');
            } else if($(this).find(".period").length > 0){
                $(".prd_img_wrap .time_box").css('display','flex');
            } else {
                /*
                if(sale_type == "list"){
                    $(this).find(".time_box").show().html("<p>타임세일이 종료되었습니다.</p>");
                } else {
                    $(".prd_img_wrap .time_box").show().html("<p>타임세일이 종료되었습니다.</p>");
                }
                */
            }
        });
        
    }, 1000);

    
    
    // 상품분류 추천&신규 상품 넘버링
    $(function(){
        $(".prd_num").each(function(){
            var prd_num = $(this).parent().parent("li").index()+1;
            $(this).find(".num").text(prd_num);
        });
    });
    
    // 상품분류 중,소 분류 제어
    if($(".menuCategory").length > 0){
        $(".menuCategory li").each(function(){
            if($(this).children("ul").length > 0){
                $(this).addClass("typeChild");
                if($(this).children("ul").hasClass("subCategory")){
                    $(this).children("a").append("<i class='xi-angle-right-thin' style='font-size:10px;margin-top:-5px'></i>");
                } else {
                    $(this).children("a").append("<i class='xi-angle-down-thin'></i>");
                }
            }
        });
    }
    
    // 이용안내 탭, 기획전 중분류 이동
	var $headH = $("header").outerHeight();
    $('.xans-project-package .menuCategory > li > a, .xans-mall-faq .ec-base-tab .menu > li > a').click(function( e ){
        e.preventDefault();
    	$( 'html,body' ).animate( {
			scrollTop : $( this.hash ).offset().top - $headH - 10
		}, 200 );
    });
    
    // 인스타그램 가림처리
    function insta_check(){
        if($(".insta_widget iframe").length < 1){
            $(".insta_widget").hide();
        }
    }
    setTimeout(insta_check, 1000);
    
    // 우측 탑 버튼
    $(".go_top").click(function(){
        $("html, body").animate({scrollTop: 0}, 1000);
    });    
    $(".go_down").click(function(){
        $("html, body").animate({scrollTop: ($('#nd_footer').offset().top)}, 1000)
    });
    
    // 이펙트 효과
    function effect_action(){
        var winScroll = $(window).scrollTop() + $(window).height();
        $(".fade").each(function(){
            var obj_leng = $(this).offset().top + $(this).outerHeight();
            if(obj_leng > 0){
                var obj_top = $(this).offset().top;
                if(winScroll > obj_leng){
                    if($(this).hasClass("fade_left")){
                        $(this).animate({
                            "opacity" : "1",
                            "right" : "0",
                        }, 800);
                    }
                    if($(this).hasClass("fade_right")){
                        $(this).animate({
                            "opacity" : "1",
                            "left" : "0",
                        }, 800);
                    }
                }
            }
        });
    }
    effect_action();
    $(window).scroll(function(){
        effect_action();
    });

    // 푸터 레이아웃 조정
    function m_foot(){
        var win_width = $(window).outerWidth();
        if(win_width <= 1024){
            $("footer .foot_menu").prependTo("footer .inner");
        } else {
            $("footer .foot_menu").prependTo("footer .right_box");
        }
    }
	m_foot();
    
    // 메인 모바일 경고팝업
    var president_name = $(".idx_pop").attr("data-name");
    function sample_popup(){
        var $frame_width = $(window).width();
        if($frame_width < 1025){
            if(president_name == "어썸디" || president_name == "AWESOMED" || president_name == "AWESOME:D"){
                $(".idx_pop").show();
            }
        }
    }
	sample_popup();
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
        m_foot();
        sample_popup();
    }, 200));
    
    $(".idx_pop .close_btn").click(function(){
    	$(this).parent().hide();
    });
});
