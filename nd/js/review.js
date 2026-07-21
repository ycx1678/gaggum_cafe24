$(function(){

 
    // 상품 이미지가 없을 때
    $(".review_list .cont_prd .img_box").each(function(){
        if($(this).find("img").length == "0"){
			$(this).hide();
        }
    });
    
    // 리뷰내용 노출
    $(".review_list ul > li").each(function(){
        var content = $(this).find(".cont").text();
        var cont_cut = $(this).find(".cont").text().length;
        $(this).find(".cont").html(content);
    });

    $(".img_load img").each(function(){
        var this_src = $(this).attr("src");
        var src_replace = this_src.replace("/gallery/", "//");
        $(this).attr("src", src_replace);
    });
    
    $(".review_list .swiper-container > ul > li").each(function(){        
        // 평점 위치 재배치
        var p_img = $(this).find(".p_img > img").length;

        if(p_img == 0){
            $(this).find(".product").addClass("img_off");
        }
        
        // 평점 텍스트 변경
        var point_name = $(this).find(".point").children("img").attr("alt");
        
        if(point_name == "5점"){
        	$(this).find(".point").append("<span>★★★★★</span>");
        }
        if(point_name == "4점"){
        	$(this).find(".point").append("<span>★★★★</span>");
        }
        if(point_name == "3점"){
        	$(this).find(".point").append("<span>★★★</span>");
        }
        if(point_name == "2점"){
        	$(this).find(".point").append("<span>★★</span>");
        }
        if(point_name == "1점"){
        	$(this).find(".point").append("<span>★</span>");
        }

        // 사진 여부 체크 후 처리
        var img_length = $(this).find(".img_load").children("img").attr("src");
        var img_slice = img_length.charAt(img_length.length-1);
        if(img_slice == "/"){
            $(this).remove();
        } else if(img_length == ""){
        	$(this).remove();
        }
    });
    
    $(".review ul > li:nth-child(n+16)").remove();
    
    // 리뷰롤링
	    var prd_visual = new Swiper('.main_review .swiper-container', {
	        slidesPerView: 5,
	        //freeModeSticky: true,
	        spaceBetween: 30,
	        simulateTouch: false,
	        scrollbar: {
	            el: '.main_review .swiper-scrollbar',
	            hide: false,
	            draggable: false,
	        },
		autoplay: {
            delay: 4000,
            disableOnInteraction: false,
        }, 
        navigation: {
            nextEl: '.main_review .swiper-button-next',
            prevEl: '.main_review .swiper-button-prev'
        },
        breakpoints: {
            1450: {
            	spaceBetween: 20,
        		slidesPerView: 4
            },
            1024: {
                spaceBetween: 10,
        		slidesPerView: 2
            },
        }
    });
    
	// 리뷰 없을 때
    if($(".review_list ul > li").length == "0"){
    	var review_idx = $(".main_review").index();
        $("#fp-nav ul > li:nth-child(" + review_idx +")").remove();
        $(".main_review").remove();
    }

});
