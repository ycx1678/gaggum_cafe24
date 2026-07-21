$(function(){
    var $ = EC$;
    
    var $url = document.location.href;
    var str = $url.substr($url.length - 1, 1);
    
    var sort_cate = $("select#board_category").length;
    var sort_reply = $("select#reply_sort").length;
    
    // 카테고리 사용 + 답변보기 사용
    if(sort_cate > 0 && sort_reply > 0){
        $(".boardSort select#board_category option").each(function(){
            var options = $(this).text();
            $("<li><a>"+options+"</a></li>").appendTo(".board_tab ul");
        });
        $(".board_tab ul li").click(function(){
            var select_tab = $(this).index();
            if(select_tab > 0){
                $("#board_category").val(select_tab).trigger("change");
            } else {
                $("#board_category").val(0).trigger("change");
            }
        });
        // tab on
        var $selected = $("#board_category option:selected").val();
        if($selected > 0){
            $(".board_tab ul li").eq($selected).addClass("on");
            
        } else {
            $(".board_tab ul li").eq(0).addClass("on");
        }
        $(".boardSort").show();
        $(".boardSort .xans-board-category").hide();
    }
    
    // 카테고리 사용 + 답변보기 사용안함
    if(sort_cate > 0 && sort_reply < 1){
        $(".boardSort select#board_category option").each(function(){
            var options = $(this).text();
            $("<li><a>"+options+"</a></li>").appendTo(".board_tab ul");
        });
        $(".board_tab ul li").click(function(){
            var select_tab = $(this).index();
            if(select_tab > 0){
                $("#board_category").val(select_tab).trigger("change");
            } else {
                $("#board_category").val(0).trigger("change");
            }
        });
        // tab on
        var $selected = $("#board_category option:selected").val();
        if($selected > 0){
            $(".board_tab ul li").eq($selected).addClass("on");
        } else {
            $(".board_tab ul li").eq(0).addClass("on");
        }
        $(".boardSort").show();
        $(".boardSort .xans-board-category").hide();
    }
    
    // 카테고리 사용안함 + 답변보기 사용
    if(sort_cate < 1 && sort_reply > 0){
        $(".board_tab").hide();
        $(".boardSort").show();
    }    

    // no category
    var border_select = $(".boardSort select").length;
    if(border_select < 1){
        $(".board_tab").hide();
    }
    
    // read
    var lead_length = $(".xans-board-read").length;
    if(lead_length > 0){
        var list_url = $("#list_url").val();
        $(".board_tab ul li").each(function(){
            var $idx = $(this).index();
            //$(this).children("a").attr("href", $idx+"&category_no=1)
        });
    }//////////////////////////////////////////////////////////////////////
    
});