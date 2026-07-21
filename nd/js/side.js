$(function(){
   
    // 사이드메뉴 오픈 작동
    $(".fold_btn").click(function(){
        $("#side").animate({
            "left" : "0"
        });
        $(".mask_side").fadeIn();
        $(".nd#common, .nd#wide").css("overflow", "auto");
        $(".nd#main").css("overflow", "hidden");
    });
    
    $("#side .btn_close_side, .mask_side").click(function(){
        $("#side").animate({
            "left" : "-100%"
        });
        $(".mask_side").fadeOut();
        $(".nd#common, .nd#wide").css("overflow", "auto");
        $(".nd#main").css("overflow", "hidden");
    });

    function toggleSideSub($li){
        var $sub = $li.children("ul").first();
        var $icon = $li.children(".side_more").children("i");
        if(!$sub.length) return;

        if($sub.css("display") == "none"){
            $sub.slideDown();
            $icon.attr("class","xi-angle-up");
        } else {
            $sub.slideUp();
            $icon.attr("class","xi-angle-down");
        }
    }

    function child_check(){
        $("#side #category_all li").each(function(){
            $("ul.noneSub ul").remove();
            if($(this).children("ul").length > 0 && $(this).children(".side_more").length < 1){
                $(this).append("<div class='side_more'><i class='xi-angle-down'></i></div>");
            }
        });
        $(".sideCate .side_more").click(function(){
            toggleSideSub($(this).parent("li"));
        });
        $(".sideCate #category_all li > a").click(function(e){
            var $li = $(this).parent("li");
            if($li.children("ul").length < 1) return;
            e.preventDefault();
            toggleSideSub($li);
        });
    }

    setTimeout(child_check,300);

    $(".mem_menu > li").click(function(){
        var sub_view2 = $(this).children("ul").css("display");
        if(sub_view2 == "none"){
            $(this).children("ul").slideDown();
            $(this).children().children("i").attr("class","xi-angle-up");
        } else {
        	$(this).children("ul").slideUp();
            $(this).children().children("i").attr("class","xi-angle-down");
        }
    });

});
