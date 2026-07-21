$(function(){

	// 메인 일정 섹션 컬러 변경
    function head_w(){
        if($(".section.active").hasClass("section_white")){
            $("header, #fp-nav").addClass("on");
        } else {
            $("header, #fp-nav").removeClass("on");
        }
    }
    head_w();

    if($(".nd#main").length > 0){
        $(".nd#main #fp-nav ul li").click(function(){
            setTimeout(head_w,300);
        });
        $(window).on('mousewheel', function(e){
            head_w();
        });
        $(window).on('touchmove', function() {
            $(window).trigger('mousewheel');
        });
    }
    
    // 상단 여백
    var top_bnn_height = 0;
    var head_h = 0;
    var head_top = 0;
    if($(".top_line_bnn").length > 0){
        top_bnn_height = $(".top_line_bnn").outerHeight();
    }
    if($("header").length > 0){
        head_h = $("header").outerHeight();
        head_top = $("header").offset().top;
    }
    $(window).scroll(function(){
        var winScrollTop = $(window).scrollTop();
        if(winScrollTop >= top_bnn_height){
            $("header").addClass("fixed");
            if(!$("header").hasClass("transparent")) $("#container").css("padding-top", head_h + "px");
        } else {
            $("header").removeClass("fixed");
            if(!$("header").hasClass("transparent")) $("#container").css("padding-top", "0");
        }
    });
    if($("header").hasClass("transparent") && $("body#main").length == 0) $("#container").css("padding-top", head_h + "px");
    
    
    // 검색팝업 활성화
    $(".search_btn").click(function(){
    	$(".search_wrap").fadeIn();
        $(this).children("a").addClass("on");
        
        var recent_keyword_length = $(".xans-search-recentkeyword li").length;
        if(recent_keyword_length > 0){
            $(".xans-search-recentkeyword").show();
            $(".xans-search-recentkeyword ul").prepend("<li class='tit'><span>최근검색어</span></li>");
        }
    });
    $(".close_btn").click(function(){
    	$(".search_wrap").fadeOut();
        $(".search_ico > a").removeClass("on");
    });
    
    $("header .search_wrap .search_input > input").attr("placeholder","상품을 검색해보세요");
    // 최근검색어 활성화
    
    
    
    
});