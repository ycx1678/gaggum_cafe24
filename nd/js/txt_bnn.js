$(function(){ 
    
    // 이미지 배경화
    function txt_img(){
        var txtBnnH = $(window).height();
        var txt_src = $(".txt_bnn .img_area img").attr("src");
        $(".txt_bnn .img_area a").css({"background-image":"url(" + txt_src +")","height":txtBnnH+"px"});
        $(".txt_bnn .img_area img").hide();
        if($(window).width() <= 1024){
        	$(".txt_bnn .img_area a, .txt_bnn .txt_box").css("height",txtBnnH/2+"px");
        }
    }
    txt_img();

    $(window).resize(function(){
        txt_img();
    });

});
