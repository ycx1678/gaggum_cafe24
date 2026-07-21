$(function(){
    // 슬라이드
    var main_prd_slidel = new Swiper('.main_prd_slide .swiper-container', {
        spaceBetween: 16,
        slidesPerView: 5,
        loop: false,
        speed: 650,
        autoHeight: false,
        nested: true,
        simulateTouch: true,
        touchStartPreventDefault: false,
        observer: true,
        observeParents: true,
        scrollbar: {
            el: '.main_prd_slide .swiper-scrollbar',
            hide: false,
                draggable: true,
        },
        autoplay: {
            delay: 4000,
            disableOnInteraction: false,
        },
        breakpoints: {
            1024: {
                spaceBetween: 12,
                slidesPerView: 1.08
            },
            1450: {
                spaceBetween: 14,
                slidesPerView: 4
            },
        }
    });

});
