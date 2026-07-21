/******************************************************************************
** ★ 아래 소스 수정 금지 ★ 수정 시 사이트 전체에 오류가 발생될 수 있습니다. **
******************************************************************************/
$(function(){
    
    // ★ 로고 로딩
    $("[data-type=logo]").each(function(){
        var $logo_class = $(this).attr("data-class");
        var $logo_img = $(this).find("img");
        if($logo_img.length > 0){
            $("h1[data-class=" + $logo_class + "] a").html($logo_img);
        }
    });
    
    // ★ 메인배너 로딩
    var $main_visual_delay = 4000;
    var main_visual_pc, main_visual_m;
    function main_visual_loading(){
        // PC
        var $main_visual_pc_length = $("[data-type='main_visual'][data-class='pc'] .xans-smart-banner-admin .smart-banner-bxslider").length;
        if($main_visual_pc_length > 0){
            // 슬라이드 버전 (2개 이상)
            $("[data-type='main_visual'][data-class='pc'] .xans-smart-banner-admin .smart-banner-bxslider li").each(function(){
                var $slide = $(this);
                var $slide_idx = $slide.index();
                var $slide_link = $slide.children("a");
                var $slide_href = $slide_link.attr("href");
                var $slide_target = $slide_link.attr("target");
                var $slide_onclick = $slide_link.attr("onclick");
                var $slide_img = $slide_link.children("img");
                $(".main_visual .pc_ver .swiper-wrapper .swiper-slide")
                    .eq($slide_idx)
                    .children("a")
                    .attr({
                    href: $slide_href,
                    ...( $slide_target ? { target: $slide_target } : {} ),
                    ...( $slide_onclick ? { onclick: $slide_onclick } : {} )
                });
                $(".main_visual .pc_ver .swiper-wrapper .swiper-slide").eq($slide_idx).find(".img_box").append($slide_img);
                // 속도(초) 리셋
                $main_visual_delay = $("[data-type='main_visual'][data-class='pc'] .xans-smart-banner-admin .smart-banner-wrapper").attr("data-pause");
            });
        } else {
            // 1개
            var $bnn_link = $("[data-type='main_visual'][data-class='pc'] .xans-smart-banner-admin").children("a");
            var $bnn_href = $bnn_link.attr("href");
            var $bnn_target = $bnn_link.attr("target");
            var $bnn_onclick = $bnn_link.attr("onclick");
            var $bnn_img = $bnn_link.children("img");
            $(".main_visual .pc_ver .swiper-wrapper .swiper-slide").eq(0).children("a").attr({
                href: $bnn_href,
                ...( $bnn_target ? { target: $bnn_target } : {} ),
                ...( $bnn_onclick ? { onclick: $bnn_onclick } : {} )
            });
            $(".main_visual .pc_ver .swiper-wrapper .swiper-slide").eq(0).find(".img_box").append($bnn_img);
            $(".main_visual .pc_ver .swiper-wrapper .swiper-slide:not(:first)").remove();
        }
        // Mobile
        var $main_visual_m_length = $("[data-type='main_visual'][data-class='mobile'] .xans-smart-banner-admin .smart-banner-bxslider").length;
        if($main_visual_m_length > 0){
            $("[data-type='main_visual'][data-class='mobile'] .xans-smart-banner-admin .smart-banner-bxslider li").each(function(){
                var $slide = $(this);
                var $slide_idx = $slide.index();
                var $slide_link = $slide.children("a");
                var $slide_href = $slide_link.attr("href");
                var $slide_target = $slide_link.attr("target");
                var $slide_onclick = $slide_link.attr("onclick");
                var $slide_img = $slide_link.children("img");
                $(".main_visual .m_ver .swiper-wrapper .swiper-slide").eq($slide_idx).children("a").attr({
                    href: $slide_href,
                    ...( $slide_target ? { target: $slide_target } : {} ),
                    ...( $slide_onclick ? { onclick: $slide_onclick } : {} )
                });
                $(".main_visual .m_ver .swiper-wrapper .swiper-slide").eq($slide_idx).find(".img_box").append($slide_img);
                // 속도(초) 리셋
                $main_visual_delay = $("[data-type='main_visual'][data-class='mobile'] .xans-smart-banner-admin .smart-banner-wrapper").attr("data-pause");
            });
        } else {
            var $bnn_link = $("[data-type='main_visual'][data-class='mobile'] .xans-smart-banner-admin").children("a");
            var $bnn_href = $bnn_link.attr("href");
            var $bnn_target = $bnn_link.attr("target");
            var $bnn_onclick = $bnn_link.attr("onclick");
            var $bnn_img = $bnn_link.children("img");
            $(".main_visual .m_ver .swiper-wrapper .swiper-slide").eq(0).children("a").attr({
                href: $bnn_href,
                ...( $bnn_target ? { target: $bnn_target } : {} ),
                ...( $bnn_onclick ? { onclick: $bnn_onclick } : {} )
            });
            $(".main_visual .m_ver .swiper-wrapper .swiper-slide").eq(0).find(".img_box").append($bnn_img);
            $(".main_visual .m_ver .swiper-wrapper .swiper-slide:not(:first)").remove();
        }
        // 메인 롤링
        main_visual_pc = new Swiper('.main_visual .pc_ver.swiper-container', {
            slidesPerView: 1,
            spaceBetween: 0,
            speed: 1000,
	            effect: "fade",
	            loop: true,
	            loopAdditionalSlides: 1,
	            simulateTouch: false,
            autoplay: {
                delay: $main_visual_delay,
                disableOnInteraction: false,
            },
            pagination: {
                el: '.pc_ver .swiper-pagination',
                type: "fraction",
            },
            navigation: {
                nextEl: '.pc_ver .swiper-button-next',
                prevEl: '.pc_ver .swiper-button-prev'
            },
            observer: true,
            observeParents: true,
            on: {
                slideChangeTransitionStart: function () {
                    white_slide()
                }
            }
        });
        main_visual_m = new Swiper('.main_visual .m_ver.swiper-container', {
            slidesPerView: 1,
            spaceBetween: 0,
            speed: 1000,
	            effect: "fade",
	            loop: true,
	            loopAdditionalSlides: 1,
	            simulateTouch: false,
            autoplay: {
                delay: $main_visual_delay,
                disableOnInteraction: false,
            },
            pagination: {
                el: '.m_ver .swiper-pagination',
                type: "fraction",
            },
            navigation: {
                nextEl: '.m_ver .swiper-button-next',
                prevEl: '.m_ver .swiper-button-prev'
            },
            observer: true,
            observeParents: true,
            on: {
                slideChangeTransitionStart: function () {
                    white_slide()
                }
            }
        });        
    }
	main_visual_loading();
    /*
    $(window).resize(function(){
        main_visual_loading();
    });
    */
    // 메인배너 화이트버전
    function white_slide(){
        if($('.main_visual').hasClass('active')){
            if( !$('.section.active').hasClass('white') && $('.swiper-container:visible .swiper-slide-active').hasClass('white')){
                $('header, #fp-nav').addClass('on');
                console.log($('.swiper-slide-active').attr('data-swiper-slide-index'))
            }else if( !$('.section.active').hasClass('white') && !$('.swiper-container:visible .swiper-slide-active').hasClass('white')){
                $('header, #fp-nav').removeClass('on');
            }
        }
    }
    $(window).on('touchmove', function() {
        white_slide()
    });
    $(window).on('mousewheel', function() {
        white_slide()
    });
    // 컨트롤 버튼
    $(".pc_ver .swiper-button-pause").click(function(){
        main_visual_pc.autoplay.stop();
        $(this).hide();
        $(".pc_ver .swiper-button-play").show();
    });    
    $(".pc_ver .swiper-button-play").click(function(){
        main_visual_pc.autoplay.start();
        $(this).hide();
        $(".pc_ver .swiper-button-pause").show();
    });
    $(".m_ver .swiper-button-pause").click(function(){
        main_visual_m.autoplay.stop();
        $(this).hide();
        $(".m_ver .swiper-button-play").show();
    });    
    $(".m_ver .swiper-button-play").click(function(){
        main_visual_m.autoplay.start();
        $(this).hide();
        $(".m_ver .swiper-button-pause").show();
    });
    // 이미지 배경화
    function main_img(){
        $(".main_visual .swiper-slide").each(function(){
            var img_src = $(this).find("img").attr("src");
            $(this).children("a").css("background-image", "url(" + img_src +")");
            $(this).find("img").hide();
        });
    }
    main_img();
    
    // ★ 메인 단컷 배너 페이지 로딩
    function main_bnn_loading(type, targetClass){
        if(targetClass === "main_brand" && $("."+targetClass+" .brand_swiper").length){
            return;
        }
        var $pc_link = $("[data-type='"+type+"'][data-class='pc'] .xans-smart-banner-admin").children("a");
        var $m_link  = $("[data-type='"+type+"'][data-class='mobile'] .xans-smart-banner-admin").children("a");
        var $href    = $pc_link.attr("href");
        var $target  = $pc_link.attr("target");
        var $onclick = $pc_link.attr("onclick");
        var $pc_img = $pc_link.children("img").clone();
        var $m_img  = $m_link.children("img").clone();
        $("."+targetClass).find("a").attr({
            href: $href,
            ...( $target ? { target: $target } : {} ),
            ...( $onclick ? { onclick: $onclick } : {} )
        });
        $("."+targetClass+" .img_box.pc_ver").html($pc_img);
        $("."+targetClass+" .img_box.m_ver").html($m_img);
        // 배경화
        var $winW   = $(window).width();
        var $bnnTxt = $("."+targetClass+" .txt_box .inner");
        if($winW > 1024){
            var $imgSrc = $("."+targetClass+" .pc_ver img").attr("src");
            $("."+targetClass+" a").css("background-image", "url("+$imgSrc+")");
            if($bnnTxt.hasClass("top")) $bnnTxt.removeClass("top").addClass("left");
        } else {
            var imgSrc = $("."+targetClass+" .m_ver img").attr("src");
            $("."+targetClass+" a").css("background-image", "url("+imgSrc+")");
            if($bnnTxt.hasClass("left")) $bnnTxt.removeClass("left").addClass("top");
        }
    }
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
    main_bnn_loading("brand_bnn", "main_brand");
    $(window).resize(debounce(function(){
        main_bnn_loading("brand_bnn", "main_brand");
    }, 200));

    // ★ 일반 단컷 배너 로딩 (.img_box용 / 이미지에만 링크가 적용된 경우) / (PC+M 통합)
    function normal_bnn_loading(type, targetClass){
        var $bnn_link   = $("[data-type='"+type+"'][data-class='all'] .xans-smart-banner-admin").children("a");
        var $bnn_href   = $bnn_link.attr("href");
        var $bnn_target = $bnn_link.attr("target");
        var $bnn_onclick= $bnn_link.attr("onclick");
        var $bnn_img    = $bnn_link.children("img").clone();
        $("."+targetClass+" a").not("li.xans-record- a").attr({
            href: $bnn_href,
            ...( $bnn_target ? { target: $bnn_target } : {} ),
            ...( $bnn_onclick ? { onclick: $bnn_onclick } : {} )
        });
        $("."+targetClass+" .img_box").html($bnn_img);
        // 배경화
        var box_imgSrc = $("."+targetClass+" .img_box img").attr("src");
        if($("."+targetClass+" .img_box img").parent("a").length < 1){
            $("."+targetClass+" .img_box img").wrap(
                "<a href='"+$bnn_href+"'"
                + ( $bnn_target ? " target='"+$bnn_target+"'" : "" )
                + ( $bnn_onclick ? " onclick='"+$bnn_onclick+"'" : "" )
                + " style='background-image:url(" + box_imgSrc + ")'></a>"
            );
        }
    }
    normal_bnn_loading("txt_bnn", "txt_bnn");
    normal_bnn_loading("prd_bnn", "prd_bnn");
    normal_bnn_loading("company_bnn", "brand_box");
    normal_bnn_loading("product_bnn", "product_box");
    
    // ★ 일반 배너 여러개(롤링) 로딩 (.img_box용) / (PC+M 통합)
    var $bnn2_delay = 4000;
    function normal_bnn2_loading(type, targetClass){
        var $bnn2_length = $("[data-type='"+type+"'][data-class='all'] .xans-smart-banner-admin .smart-banner-bxslider").length;
        if($bnn2_length > 0){
            $("[data-type='"+type+"'][data-class='all'] .xans-smart-banner-admin .smart-banner-bxslider li").each(function(){
                var $bnn2 = $(this);
                var $bnn2_idx = $bnn2.index();
                var $bnn2_link = $bnn2.children("a");
                var $bnn2_href = $bnn2_link.attr("href");
                var $bnn2_target = $bnn2_link.attr("target");
                var $bnn2_onclick = $bnn2_link.attr("onclick");
                var $bnn2_img = $bnn2_link.children("img").clone();
                $("."+targetClass+" .swiper-wrapper .swiper-slide").eq($bnn2_idx).children("a").attr({
                    href: $bnn2_href,
                    target: $bnn2_target,
                    onclick: $bnn2_onclick
                });
                $("."+targetClass+" .swiper-wrapper .swiper-slide").eq($bnn2_idx).find(".img_box").append($bnn2_img);
                // 속도(초) 리셋
                $bnn2_delay = $("[data-type='"+type+"'][data-class='all'] .xans-smart-banner-admin .smart-banner-wrapper").attr("data-pause");
            });
        }
        
    }
    //normal_bnn_loading("brand_bnn", "brand_box");
    
    // ★ 일반 배너 여러개(그리드) 로딩 / (PC+M 통합)
    function bnn_grid_loading(type, targetClass){
        var $bnn_grid_length = $("[data-type='"+type+"'][data-class='all'] .xans-smart-banner-admin .smart-banner-bxslider").length;
        if($bnn_grid_length > 0){
            $("[data-type='"+type+"'][data-class='all'] .xans-smart-banner-admin .smart-banner-bxslider li").each(function(){
                var $bnn_grid = $(this);
                $("."+targetClass+" .gridWrap").append($bnn_grid);
            });
        }
    }
    bnn_grid_loading("grid_bnn", "sns_bnn");
    
    
});
