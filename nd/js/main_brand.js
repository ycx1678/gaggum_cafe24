$(function(){
    var $brand = $('.main_brand');
    var $wrapper = $brand.find('.swiper-wrapper');

    if(!$brand.length || !$wrapper.length){
        return;
    }

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

    function readSmartBanner(device){
        var items = [];
        var $root = $('[data-type="brand_bnn"][data-class="' + device + '"] .xans-smart-banner-admin');
        var $links = $root.find('.smart-banner-bxslider li a');

        if(!$links.length){
            $links = $root.children('a');
        }

        $links.each(function(){
            var $link = $(this);
            var $img = $link.find('img').first();
            var src = $.trim($img.attr('src') || '');

            if(!src || src.indexOf('{$') > -1){
                return;
            }

            items.push({
                image: src,
                href: $link.attr('href') || '#',
                target: $link.attr('target') || '',
                onclick: $link.attr('onclick') || ''
            });
        });

        return items;
    }

    function readSmartBannerDelay(){
        var $wrapper = $('[data-type="brand_bnn"] .xans-smart-banner-admin .smart-banner-wrapper').first();
        var delay = parseInt($wrapper.attr('data-pause'), 10);

        return delay > 0 ? delay : 4000;
    }

    var textSet = [
        {
            sub: '#GAGGUM BRAND STORY',
            title: '오래 쓰는 학습공간을 위한<br>가구의 기준',
            text: '학원과 교육공간에 맞는 구조와 소재를 고민해<br>안전하고 편안한 책걸상을 제안합니다.'
        },
        {
            sub: '#READING STUDY TABLE SET SEASON2',
            title: '공간의 여유, 집중력의 차이<br>독서대 학원 책상 세트 시즌2',
            text: '드라이버만 있으면 독서대 부분을 분리하여<br>일반 책상처럼 사용할 수 있는 하이브리드 학원책상입니다.'
        },
        {
            sub: '#GAGGUM PORTFOLIO',
            title: '학습공간에 맞춘<br>가구 솔루션',
            text: '교육공간의 규모와 목적에 맞춰<br>책상, 의자, 수납 구성을 제안합니다.'
        }
    ];

    var pcSlides = readSmartBanner('pc');
    var mobileSlides = readSmartBanner('mobile');
    var slides = [];
    var smartSlideLength = Math.max(pcSlides.length, mobileSlides.length);
    var brandDelay = readSmartBannerDelay();
    var fallbackImages = [
        {
            pc: pcSlides[0] ? pcSlides[0].image : routeUrl('/nd/images/main_bnn_visual01.jpg'),
            mobile: mobileSlides[0] ? mobileSlides[0].image : routeUrl('/nd/images/m_main_bnn_visual01.jpg'),
            href: pcSlides[0] ? pcSlides[0].href : '#',
            target: pcSlides[0] ? pcSlides[0].target : '',
            onclick: pcSlides[0] ? pcSlides[0].onclick : ''
        },
        {
            pc: routeUrl('/nd/images/main_bnn_visual02.jpg'),
            mobile: routeUrl('/nd/images/m_main_bnn_visual02.jpg'),
            href: '#',
            target: '',
            onclick: ''
        },
        {
            pc: routeUrl('/nd/images/main_bnn_visual03.jpg'),
            mobile: routeUrl('/nd/images/m_main_bnn_visual03.jpg'),
            href: '#',
            target: '',
            onclick: ''
        }
    ];

    for(var index = 0; index < smartSlideLength; index += 1){
        var item = pcSlides[index] || mobileSlides[index];
        var mobileItem = mobileSlides[index] || item;

        if(!item){
            continue;
        }

        slides.push({
            pc: item.image,
            mobile: mobileItem ? mobileItem.image : item.image,
            href: item.href,
            target: item.target,
            onclick: item.onclick
        });
    }

    // CMS에 등록된 슬라이드가 1개라도 있으면 그것만 사용, 0개일 때만 fallback 적용
    if(slides.length < 1){
        slides = fallbackImages;
    }

    $.each(slides, function(index, slide){
        var text = textSet[index] || textSet[textSet.length - 1];
        var href = routeUrl(slide.href || '#');
        var targetAttr = slide.target ? ' target="' + slide.target + '"' : '';
        var onclickAttr = slide.onclick ? ' onclick="' + slide.onclick.replace(/"/g, '&quot;') + '"' : '';
        var pcImage = routeUrl(slide.pc);
        var mobileImage = routeUrl(slide.mobile || slide.pc);

        $wrapper.append(
            '<div class="swiper-slide">' +
                '<a href="' + href + '"' + targetAttr + onclickAttr + ' style="background-image:url(' + pcImage + ')">' +
                    '<img class="pc_ver" src="' + pcImage + '" alt="">' +
                    '<img class="m_ver" src="' + mobileImage + '" alt="">' +
                    '<div class="txt_box">' +
                        '<div class="inner">' +
                            '<p class="tit_sub">' + text.sub + '</p>' +
                            '<p class="tit">' + text.title + '</p>' +
                            '<p class="txt">' + text.text + '</p>' +
                            '<span class="btn_link">자세히 보기<i class="xi-plus"></i></span>' +
                        '</div>' +
                    '</div>' +
                '</a>' +
            '</div>'
        );
    });

    function syncMobileBackground(){
        if($(window).width() <= 1024){
            $brand.find('.swiper-slide > a').each(function(){
                var mobile = $(this).find('.m_ver').attr('src');
                if(mobile){
                    $(this).css('background-image', 'url(' + mobile + ')');
                }
            });
        } else {
            $brand.find('.swiper-slide > a').each(function(){
                var pc = $(this).find('.pc_ver').attr('src');
                if(pc){
                    $(this).css('background-image', 'url(' + pc + ')');
                }
            });
        }
    }

    syncMobileBackground();
    $(window).on('resize', syncMobileBackground);

    var brandSwiper = new Swiper('.main_brand .brand_swiper', {
        slidesPerView: 1,
        spaceBetween: 0,
        speed: 700,
        loop: slides.length > 1,
        watchOverflow: true,
        nested: true,
        simulateTouch: false,
        touchStartPreventDefault: false,
        autoplay: {
            delay: brandDelay,
            disableOnInteraction: false
        },
        pagination: {
            el: '.main_brand .swiper-pagination',
            type: 'fraction'
        },
        navigation: {
            nextEl: '.main_brand .swiper-button-next',
            prevEl: '.main_brand .swiper-button-prev'
        }
    });

    $brand.find('.swiper-button-pause').on('click', function(e){
        e.preventDefault();
        if(brandSwiper.autoplay){
            brandSwiper.autoplay.stop();
        }
        $brand.find('.swiper-button-pause').hide();
        $brand.find('.swiper-button-play').show();
    });

    $brand.find('.swiper-button-play').on('click', function(e){
        e.preventDefault();
        if(brandSwiper.autoplay){
            brandSwiper.autoplay.start();
        }
        $brand.find('.swiper-button-play').hide();
        $brand.find('.swiper-button-pause').show();
    });

});
