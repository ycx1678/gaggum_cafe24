$(function(){
    $(".main_prd_slide .prdList.typ2 .swiper-wrapper li").addClass('swiper-slide');
	    var main_prd_slidel = new Swiper('.main_prd_slide .swiper-container', {
	        spaceBetween: 22,
	        slidesPerView: 5,
	        loop: false,
	        simulateTouch: false,
	        scrollbar: {
	            el: '.main_prd_slide .swiper-scrollbar',
	            hide: false,
	            draggable: false,
	        },
        /*
        autoplay: {
            delay: 4000,
            disableOnInteraction: false,
        },
        */
        breakpoints: {
            1430: {
                spaceBetween: 20,
        		slidesPerView: 3.4
            },
            1024: {
                spaceBetween: 8,
        		slidesPerView: 2
            },
        }
    });
});
