$(function(){ 
    $(".list_top .prdList > li").each(function(){
        var child_num = $(this).index()+1;
        var parent_li = $(this).parent().parent().prev("li");
        if(parent_li.length < 1){
            $(this).attr("name", child_num);
        } else {
            var prev_idx_length = $(this).prev("li").length;
            $(this).attr("name", prev_idx_length);
            if(prev_idx_length == 0){
                var prev_idx = parent_li.children().children("li:last-child").attr("name")*1;
                $(this).attr("name", prev_idx+1);
            } else {
                var prev_idx_child = $(this).prev("li").attr("name")*1;
                $(this).attr("name", prev_idx_child+1);
            }
        }
    });
    $(".list_top.xans-product-listrecommend .prdList > li").each(function(){
        var prd_num = $(this).attr("name");
        $(this).find(".thumbnail").append($("<span class='list_top_lable'>"+"BEST "+ "<strong>" + prd_num + "</strong>" + "</span>"));
    });
    $(".list_top.xans-product-listnew .prdList > li").each(function(){
        var prd_num = $(this).attr("name");
        $(this).find(".thumbnail").append($("<span class='list_top_lable'>"+"NEW "+ "<strong>" + prd_num + "</strong>" + "</span>"));
    });
    
    var list_top = new Swiper('.list_top .swiper-container', {
        slidesPerView: 5,
        spaceBetween: 12,
        scrollbar: {
            el: '.list_top .swiper-scrollbar',
        },
        autoplay : {
            delay : 4000,
            disableOnInteraction: false
        },
        breakpoints: {
            1024: {
                slidesPerView: 2,
            },
            1540: {
            	slidesPerView: 4,
            }
        },
        observer: true,
        observeParents: true,
    });
    $(".list_top").show();
    
    // 상품 리스트 배열 변경
    $(".btn_list_tab a").click(function(){
        var tab_num = $(this).index()+1;
        $(this).addClass("on");
        $(this).siblings().removeClass("on");
        console.log(tab_num);
        $(".ec-base-product .prdList").attr("id", "m_grid"+tab_num);
    });
});