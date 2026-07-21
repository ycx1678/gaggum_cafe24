$(function(){
    var $event = $('.main_event');
    if(!$event.length){
        return;
    }

    var $container = $event.find('.swiper-container');
    var $boardWrapper = $event.find('.nd-event-board-list');
    var $fallbackWrapper = $event.find('.nd-event-fallback-list');
    var $wrapper = $boardWrapper.length ? $boardWrapper : $fallbackWrapper;

    function routeUrl(url){
        if(!url || url.indexOf('#') === 0 || url.indexOf('javascript:') === 0 || url.indexOf('//') === 0){
            return url;
        }
        var previewPrefix = window.location.pathname.indexOf('/skin-skin16') === 0 ? '/skin-skin16' : '';
        if(previewPrefix){
            var origin = window.location.origin;
            if(url.indexOf(origin + '/skin-skin') === 0){
                return origin + url.replace(origin, '').replace(/^\/skin-skin\d+/, previewPrefix);
            }
            if(url.indexOf(origin + '/') === 0){
                return origin + previewPrefix + url.replace(origin, '');
            }
            if(url.charAt(0) === '/' && url.indexOf(previewPrefix + '/') !== 0){
                return previewPrefix + url;
            }
        }
        if(url.indexOf('http') === 0){
            return url;
        }
        if(window.EC_ROUTE && typeof window.EC_ROUTE.getPrefixUrl === 'function'){
            return window.EC_ROUTE.getPrefixUrl(url);
        }
        return url;
    }

    var defaultSlides = [
        {
            image: '/nd/images/main_bnn_visual01.jpg',
            title: '공간에 맞춘 가구 제안',
            text: '학원과 교육공간에 필요한 책상, 의자, 수납 구성을 확인해보세요.',
            href: '/product/list.html?cate_no=1'
        },
        {
            image: '/nd/images/main_bnn_visual02.jpg',
            title: '맞춤 상담 안내',
            text: '공간 규모와 사용 목적에 맞춰 필요한 구성을 상담해드립니다.',
            href: '/board/urgency/urgency.html'
        },
        {
            image: '/nd/images/main_bnn_visual03.jpg',
            title: '맞춤 상담 안내',
            text: '가구 배치와 공간 구성에 필요한 내용을 상담해드립니다.',
            href: '/board/urgency/urgency.html'
        }
    ];

    function appendEventSlide(slide, className){
        var image = routeUrl(slide.image);
        var href = routeUrl(slide.href || '#');
        var target = slide.target ? ' target="' + slide.target + '"' : '';
        var onclick = slide.onclick ? ' onclick="' + slide.onclick + '"' : '';

        $wrapper.append(
            '<li class="swiper-slide ' + className + '">' +
                '<a href="' + href + '"' + target + onclick + ' class="thumb"><img src="' + image + '" alt=""></a>' +
                '<div class="description">' +
                    '<a href="' + href + '"' + target + onclick + ' class="gall_tit">' + slide.title + '</a>' +
                    '<div class="gall_txt">' + slide.text + '</div>' +
                    '<a href="' + href + '"' + target + onclick + ' class="gall_more"><i class="xi-plus"></i></a>' +
                '</div>' +
            '</li>'
        );
    }

    function appendSmartBannerSlides(){
        var device = $(window).width() > 1024 ? 'pc' : 'mobile';
        var $smartRoot = $('#setting_banner [data-type="event_bnn"][data-class="' + device + '"] .xans-smart-banner-admin');
        var $smartItems = $smartRoot.find('.smart-banner-bxslider li');

        if(!$smartRoot.length){
            return false;
        }

        if(!$smartItems.length){
            $smartItems = $smartRoot.children('a');
        }

        $smartItems.each(function(index){
            var $item = $(this);
            var $link = $item.is('a') ? $item : $item.children('a').first();
            var $img = $link.find('img').first();
            var copy = defaultSlides[index] || defaultSlides[defaultSlides.length - 1];
            var src = $.trim($img.attr('src') || '');

            if(!src || src.indexOf('{$') > -1){
                return;
            }

            appendEventSlide({
                image: src,
                title: copy.title,
                text: copy.text,
                href: $link.attr('href') || copy.href,
                target: $link.attr('target'),
                onclick: $link.attr('onclick')
            }, 'nd-event-smart');
        });

        return $wrapper.children('li').length > 0;
    }

    $boardWrapper.children('li').each(function(){
        var $item = $(this);
        var src = $.trim($item.find('img').attr('src') || '');
        var title = $.trim($item.find('.gall_tit').text() || '');

        if(src === '' || src === '/' || src.indexOf('{$') > -1 || title.indexOf('{$') > -1){
            $item.remove();
        }
    });

    if($boardWrapper.length && $boardWrapper.children('li').length > 0){
        $fallbackWrapper.remove();
        $wrapper = $boardWrapper;
    } else {
        $boardWrapper.remove();
        $wrapper = $fallbackWrapper;
    }

    if($wrapper.children('li').length === 0){
        if(!appendSmartBannerSlides()){
            $.each(defaultSlides, function(_, slide){
                appendEventSlide(slide, 'nd-event-fallback');
            });
        }
    }

    if($wrapper.children('li').length === 0){
        $event.remove();
        return;
    }

    $wrapper.find('.thumb img').each(function(){
        var $img = $(this);
        var src = $.trim($img.attr('src') || '');

        if(src && src.indexOf('{$') === -1){
            $img.closest('.thumb').css('background-image', 'url("' + src + '")');
        }
    });

    // 슬라이드
    var main_event = new Swiper($container[0], {
        spaceBetween: 0,
        slidesPerView: 1,
        loop: false,
        autoHeight: false,
        watchOverflow: true,
        observer: true,
        observeParents: true,
        nested: true,
        simulateTouch: false,
        touchStartPreventDefault: false,
        scrollbar: {
            el: $event.find('.swiper-scrollbar')[0],
            hide: false,
            draggable: false,
        },
        navigation: {
            nextEl: $event.find('.swiper-button-next')[0],
            prevEl: $event.find('.swiper-button-prev')[0]
        },
        autoplay: {
            delay: 4000,
            disableOnInteraction: false,
        }, 
        breakpoints: {
            1024: {
                spaceBetween: 0,
                slidesPerView: 1
            },
        }
    });

});
