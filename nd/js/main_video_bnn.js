$(function(){

	// 상품 없을 때
    if($(".bnn_box .prdList").length == "0"){
    	$(".bnn_box").hide();
        $(".video_box").addClass("full");
    }
    
    // 아이콘
    $(".prdList.typ2 .btn_wrap img").wrap("<span class='ico'><em></em></span>");

});