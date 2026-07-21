$(function(){
    
    $(window).scroll(function(){
        var scroll = $(window).scrollTop();
        if (scroll > 100) {
            $('.rightQuick').fadeIn();
        } else {
            $('.rightQuick').fadeOut();
        }
    });

    //사이드 팝업
    $(".rightQuick > ul > li > a").click(function(){
        var box_view = $(this).next("div").css("display");
        if(box_view == "none"){
            $(".rightQuick > ul > li > div").fadeOut();
            $(this).next("div").fadeIn();
            $(".rightQuick > ul > li > a").removeClass("on");
            $(this).addClass("on");
            // 검색어 롤링

        } else {
            $(this).removeClass("on");
        }

        // iframe check
        var iframe_leng = $(this).next("div").find("iframe").length;
        if(iframe_leng > 0){
            var this_iframe = $(this).next("div").find("iframe");
            var item_height = this_iframe.contents().find(".xans-myshop-wishlistitem").outerHeight();
            this_iframe.css("height", item_height+"px");
        }
    });

    $(".rightQuick .tit > i").click(function(){
        $(".rightQuick > ul > li > div").fadeOut();
        $(".rightQuick > ul > li > a").removeClass("on");
    });


    //위아래버튼
    $(".go_top").click(function(){
        $("html, body").animate({scrollTop: 0}, 1000);
    });    
    $(".go_down").click(function(){
        $("html, body").animate({scrollTop: ($('#JD-Footer').offset().top)}, 1000)
    });
    
    // 최근본 상품 가격 필터
    $(".xans-product .xans-product-listitem .xans-record-").each(function(){
        var $item_list = $(this).find(".product");
        var $strike_length = $item_list.children(".strike").length;
        $item_list.attr("data-length", $strike_length);
        if($strike_length > 1){
            $item_list.children(".price_custom").hide();
        }
        
    });



});