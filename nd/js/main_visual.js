$(function(){
    // Smart banner injects hero images and owns the main visual Swiper.
    if($('#setting_banner [data-type="main_visual"]').length) return;

    // 메인 롤링배너
    $('.main_visual .swiper-container').each(function(){
        if(this.swiper) return;

        var $container = $(this);
        var main_visual = new Swiper(this, {
            direction: 'horizontal',
            slidesPerView: 1,
            spaceBetween: 0,
            speed: 850,
            loop: true,
            loopAdditionalSlides: 1,
            simulateTouch: false,
            touchAngle: 35,
            threshold: 8,
            touchMoveStopPropagation: false,
            preventInteractionOnTransition: true,
            autoplay: {
                delay: 4000,
                disableOnInteraction: false
            },
            pagination: {
                el: $container.find('.swiper-pagination')[0],
                clickable: true
            },
            navigation: {
                nextEl: $container.find('.swiper-button-next')[0],
                prevEl: $container.find('.swiper-button-prev')[0]
            },
            nested: true,
            touchStartPreventDefault: false,
            observer: true,
            observeParents: true
        });

        $container.find('.swiper-button-pause').on('click', function(){
            if(main_visual.autoplay) main_visual.autoplay.stop();
        });

        $container.find('.swiper-button-play').on('click', function(){
            if(main_visual.autoplay) main_visual.autoplay.start();
        });
    });
});
