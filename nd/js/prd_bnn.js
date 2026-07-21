$(function(){ 
    
    // 슬라이드
	    var main_prd_slide2 = new Swiper('.main_prd_slide2 .swiper-container', {
	        spaceBetween: 0,
	        slidesPerView: 1,
	        loop: false,
	        autoHeight: true,
	        simulateTouch: false,
	        scrollbar: {
	            el: '.main_prd_slide2 .swiper-scrollbar',
	            hide: false,
	            draggable: false,
	        },
        navigation: {
            nextEl: '.main_prd_slide2 .swiper-button-next',
            prevEl: '.main_prd_slide2 .swiper-button-prev'
        },
        autoplay: {
            delay: 4000,
            disableOnInteraction: false,
        }
    });

});
