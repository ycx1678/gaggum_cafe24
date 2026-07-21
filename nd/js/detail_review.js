$(function(){
    var $section = $('.detail_review');
    var $wrapper = $section.find('.swiper-wrapper');

    if($section.data('ndPortfolioInit')){
        return;
    }
    $section.data('ndPortfolioInit', true);

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
        if(window.EC_ROUTE && typeof EC_ROUTE.getPrefixUrl === "function"){
            return EC_ROUTE.getPrefixUrl(url);
        }
        return url;
    }

    function normalizeText(text){
        return $.trim(String(text || '').replace(/\s+/g, ' '));
    }

    function normalizeUrlKey(url){
        return String(url || '')
            .replace(/^https?:\/\/[^\/]+/, '')
            .replace(/^\/skin-skin\d+/, '')
            .replace(/[?#].*$/, '');
    }

    function getProductNo(value){
        var text = String(value || '');
        var match = text.match(/^\s*(\d+)\s*$/) ||
            text.match(/[?&]product_no=(\d+)/) ||
            text.match(/product_no[=\/](\d+)/) ||
            text.match(/\/product\/[^\/]+\/(\d+)\//) ||
            text.match(/상품\s*번호\s*[:：]\s*(\d+)/) ||
            text.match(/상품번호\s*[:：]\s*(\d+)/) ||
            text.match(/\[상품번호\s*[:：]\s*(\d+)\]/);
        return match ? match[1] : '';
    }

    function removeProductMarker(text){
        return String(text || '')
            .replace(/\[?\s*상품\s*번호\s*[:：]\s*\d+\s*\]?/g, '')
            .replace(/\[?\s*상품번호\s*[:：]\s*\d+\s*\]?/g, '');
    }

    function getCurrentProductNo(){
        var productNo = getProductNo(window.location.href);

        if(productNo){
            return productNo;
        }

        $('[product_no]').each(function(){
            productNo = getProductNo($(this).attr('product_no')) || normalizeText($(this).attr('product_no')).replace(/\D/g, '');
            return !productNo;
        });

        if(productNo){
            return productNo;
        }

        $('[data-param*="product_no"], [option_product_no]').each(function(){
            productNo = getProductNo($(this).attr('data-param')) || normalizeText($(this).attr('option_product_no')).replace(/\D/g, '');
            return !productNo;
        });

        return productNo;
    }

    function getItemProductNo($item){
        var productNo = getProductNo($item.find('.portfolioProduct__param').first().text());

        if(productNo){
            return productNo;
        }

        productNo = getProductNo($item.find('.portfolioProduct').first().attr('data-product-param'));
        if(productNo){
            return productNo;
        }

        $item.find('a[href*="product/detail"], a[href*="product_no"]').each(function(){
            productNo = getProductNo($(this).attr('href'));
            return !productNo;
        });

        if(productNo){
            return productNo;
        }

        productNo = getProductNo($item.text());

        return productNo;
    }

    function getCleanText($el){
        var $copy = $el.clone();
        $copy.find('.comment, input, script, style').remove();
        return normalizeText($copy.text());
    }

    function appendText($target, className, text){
        if(!text) return;
        $('<span>').addClass(className).text(text).appendTo($target);
    }

    function appendFallbackItems(){
        var fallbackItems = [
            {
                image: '/nd/images/main_bnn_visual01.jpg',
                title: '이쁜 학원책걸상 시즌2_슬래시타입',
                text: '상판컬러 : 하이그로시 화이트 / 라운드 상판 의자컬러 : WOO체어 오션네이비'
            },
            {
                image: '/nd/images/main_bnn_visual02.jpg',
                title: '래더 스터디카페테이블 세트',
                text: '상판컬러 : 메이플 / 화이트 책상 의자컬러 : WOO체어 베이지'
            },
            {
                image: '/nd/images/main_bnn_visual03.jpg',
                title: '독서대 학원책걸상',
                text: '상판컬러 : 매트 화이트 의자컬러 : WOO체어 딥그린'
            }
        ];

        $.each(fallbackItems, function(_, item){
            var $slide = $('<li>').addClass('swiper-slide detailPortfolio__item nd-portfolio-fallback');
            var $link = $('<a>').addClass('detailPortfolio__link').attr('href', '#none').appendTo($slide);
            var $thumb = $('<span>').addClass('detailPortfolio__thumb').appendTo($link);
            $('<img>').attr({ src: routeUrl(item.image), alt: item.title }).appendTo($thumb);

            var $desc = $('<span>').addClass('detailPortfolio__desc').appendTo($link);
            $('<strong>').addClass('detailPortfolio__subject').text(item.title).appendTo($desc);
            appendText($desc, 'detailPortfolio__content', item.text);

            $wrapper.append($slide);
        });
    }

    function hidePortfolioSection(){
        var $portfolioTab = $('#detail_btnTab .detail_tab > li').first();

        $section.remove();
        if($portfolioTab.length){
            $portfolioTab.hide().removeClass('on');
            $('#detail_btnTab .detail_tab > li:visible').first().addClass('on');
        }
    }

    function resolveBoardUrl(url){
        if(!url || url === '#none' || url.indexOf('javascript:') === 0 || url.indexOf('{$') > -1){
            return '';
        }
        if(url.charAt(0) === '?'){
            return routeUrl('/board/gallery/list.html' + url);
        }
        return routeUrl(url);
    }

    function getPortfolioItems(data){
        var $items = $(data).find('.xans-board-list-8 > ul > li');

        if(!$items.length){
            $items = $(data).find('[module="board_list_8"] > ul > li');
        }

        return $items;
    }

    var currentProductName = normalizeText($('.xans-product-detail .headingArea h1').text());
    var currentProductNo = getCurrentProductNo();
    var seenItems = {};

    if(!$section.length || !$wrapper.length || !currentProductName){
        $section.remove();
        return;
    }

    function appendPortfolioItems(data){
        getPortfolioItems(data).each(function(){
            var $item = $(this);
            var productName = normalizeText($item.find('.p_name').first().text());
            var productNo = getItemProductNo($item);

            if(currentProductNo && productNo){
                if(currentProductNo !== productNo){
                    return;
                }
            } else if(!productName || currentProductName !== productName){
                return;
            }

            var href = $item.find('a').first().attr('href') || '#none';
            var imageSrc = $item.find('.thumbnail img, .thumb img').first().attr('src') || '';
            var subject = getCleanText($item.find('.subject').first());
            var content = normalizeText(removeProductMarker($item.find('.portfolio_cont, .cont').first().text()));
            var itemKey = productNo + '|' + normalizeUrlKey(href) + '|' + imageSrc + '|' + subject;

            if(!imageSrc || !subject || seenItems[itemKey] || $wrapper.find('[data-portfolio-key="' + itemKey.replace(/"/g, '\\"') + '"]').length){
                return;
            }

            seenItems[itemKey] = true;

            var $slide = $('<li>').addClass('swiper-slide detailPortfolio__item').attr('data-portfolio-key', itemKey);
            var $link = $('<a>').addClass('detailPortfolio__link').attr('href', href).appendTo($slide);
            var $thumb = $('<span>').addClass('detailPortfolio__thumb').appendTo($link);
            $('<img>').attr({ src: imageSrc, alt: subject }).appendTo($thumb);

            var $desc = $('<span>').addClass('detailPortfolio__desc').appendTo($link);
            $('<strong>').addClass('detailPortfolio__subject').text(subject).appendTo($desc);
            appendText($desc, 'detailPortfolio__content', content);

            $wrapper.append($slide);
        });
    }

    function getPagingUrls(data){
        var urls = [];
        var seenUrls = {};

        $(data).find('.ec-base-paginate a, .xans-board-paging-8 a, [module="board_paging_8"] a').each(function(){
            var url = resolveBoardUrl($(this).attr('href'));

            if(!url || seenUrls[url]){
                return;
            }

            seenUrls[url] = true;
            urls.push(url);
        });

        return urls.slice(0, 9);
    }

    function initPortfolioSwiper(){
        if($wrapper.children('li').length === 0){
            hidePortfolioSection();
            return;
        }

	        new Swiper('.detail_review .swiper-container', {
	            slidesPerView: 4,
	            spaceBetween: 14,
	            watchOverflow: true,
	            simulateTouch: false,
	            scrollbar: {
	                el: '.detail_review .swiper-scrollbar',
	                hide: false,
	                draggable: false
	            },
            navigation: {
                nextEl: '.detail_review .swiper-button-next',
                prevEl: '.detail_review .swiper-button-prev'
            },
            autoplay: {
                delay: 4000,
                disableOnInteraction: false
            },
            breakpoints: {
                1024: {
                    slidesPerView: 1.2,
                    spaceBetween: 12
                }
            }
        });
    }

    $.ajax({
        type: 'GET',
        dataType: 'html',
        url: routeUrl('/board/gallery/list.html?board_no=8'),
        success: function(data) {
            appendPortfolioItems(data);

            var pagingUrls = getPagingUrls(data);
            if(!pagingUrls.length){
                initPortfolioSwiper();
                return;
            }

            $.when.apply($, $.map(pagingUrls, function(url){
                return $.ajax({
                    type: 'GET',
                    dataType: 'html',
                    url: url
                }).done(appendPortfolioItems);
            })).always(initPortfolioSwiper);
        },
        error: function(){
            initPortfolioSwiper();
        }
    });
});
