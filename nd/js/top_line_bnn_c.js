$(function(){

    // 띠배너 슬라이드
    var top_line_bnn = new Swiper('.top_line_bnn.swiper-container', {
        
        slidesPerView: 5, // 반복 슬라이드 갯수
        
        spaceBetween: 100,  // 반복 슬라이드 간격
        
        speed: 6000, // 이동속도 (높을수록 느리게 이동)
        
        freeMode: true,
        loop:  true,
        autoplay: {
            delay: 0,
            disableOnInteraction: false,
        },
    });
});