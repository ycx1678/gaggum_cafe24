$(function(){
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
        if(window.EC_ROUTE && typeof window.EC_ROUTE.getPrefixUrl === "function"){
            return window.EC_ROUTE.getPrefixUrl(url);
        }
        return url;
    }

    function cleanText(text){
        return $.trim(String(text || '').replace(/\s+/g, ' '));
    }

    function getProductNo(value){
        var text = String(value || '');
        var match = text.match(/^\s*(\d+)\s*$/) ||
            text.match(/[?&]product_no=(\d+)/) ||
            text.match(/product_no[=\/](\d+)/) ||
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

    function getProductImage($doc){
        var src = $doc.find('.prd_img_wrap .viewer img, .keyImg img, .BigImage, .thumbnail img').first().attr('src') ||
            $doc.filter('meta[property="og:image"]').attr('content') ||
            $doc.find('meta[property="og:image"]').attr('content') ||
            '';

        return src;
    }

    function fillProductInfo($box, data){
        var $doc = $(data);
        var custom = cleanText($doc.find('#span_product_price_custom').first().text());
        var price = cleanText($doc.find('#span_product_price_text').first().text());
        var sale = cleanText($doc.find('#span_product_price_sale').first().clone().children().remove().end().text());
        var name = cleanText($doc.find('.xans-product-detail .headingArea h1').first().text());
        var image = getProductImage($doc);

        if(!price){
            price = cleanText($doc.find('#ec-product-price-info').attr('ec-data-price'));
        }

        $box.find('.p_desc').remove();
        if(name && name.indexOf('{$') === -1){
            $box.find('.p_name').text(name);
        }
        if(image && image.indexOf('{$') === -1 && $box.find('.img_box img').length === 0){
            $box.find('.img_box a').html('<img src="' + routeUrl(image) + '" alt="">');
        }
        if(custom && custom !== price && custom.indexOf('{$') === -1){
            $box.find('.p_custom').text(custom).addClass('is-active');
        }
        if(sale && sale.indexOf('{$') === -1){
            $box.find('.p_price').text(sale).addClass('is-active');
        } else if(price && price.indexOf('{$') === -1){
            $box.find('.p_price').text(price).addClass('is-active');
        }
    }

    function appendFallbackItems(){
        var $section = $(".main_portfolio").first();
        var $wrapper = $section.find(".swiper-wrapper").first();

        if($wrapper.children("li").length > 0){
            return;
        }

        if(!$wrapper.length){
            $wrapper = $('<ul class="swiper-wrapper nd-portfolio-fallback-wrapper"></ul>');
            $section.find(".swiper-container").prepend($wrapper);
        }

        var fallbackItems = [
            {
                image: "/nd/images/main_bnn_visual01.jpg",
                title: "이쁜 학원책걸상 시즌2_슬래시타입",
                text: "상판컬러 : 하이그로시 화이트 / 라운드 상판<br>의자컬러 : WOO체어 오션네이비",
                productImage: "/nd/images/main_bnn_right01.jpg",
                productName: "이쁜 학원책걸상 시즌2_슬래시타입",
                custom: "48,700원",
                price: "48,700원"
            },
            {
                image: "/nd/images/main_bnn_visual02.jpg",
                title: "래더 스터디카페테이블 세트",
                text: "상판컬러 : 메이플 / 화이트 책상<br>의자컬러 : WOO체어 베이지",
                productImage: "/nd/images/main_bnn_right02.jpg",
                productName: "이쁜 학원책걸상 시즌2_슬래시타입",
                custom: "48,700원",
                price: "48,700원"
            },
            {
                image: "/nd/images/main_bnn_visual03.jpg",
                title: "독서대 학원책걸상",
                text: "상판컬러 : 매트 화이트<br>의자컬러 : WOO체어 딥그린",
                productImage: "/nd/images/001.jpg",
                productName: "이쁜 학원책걸상 시즌2_슬래시타입",
                custom: "48,700원",
                price: "48,700원"
            },
            {
                image: "/nd/images/004.jpg",
                title: "맞춤 학원가구 포트폴리오",
                text: "상판컬러 : 화이트 / 책상 프레임<br>의자컬러 : WOO체어 블랙",
                productImage: "/nd/images/003.jpg",
                productName: "이쁜 학원책걸상 시즌2_슬래시타입",
                custom: "48,700원",
                price: "48,700원"
            }
        ];

        $.each(fallbackItems, function(_, item){
            $wrapper.append(
                '<li class="list swiper-slide nd-portfolio-fallback">' +
                    '<div class="thumb">' +
                        '<a href="#none"><span class="img_load"><img src="' + routeUrl(item.image) + '" alt=""></span></a>' +
                    '</div>' +
                    '<div class="cont_wrap">' +
                        '<div class="cont_info">' +
                            '<div class="subject">' + item.title + '</div>' +
                            '<div class="cont">' + item.text + '</div>' +
                        '</div>' +
                        '<div class="cont_prd ndFallbackProduct">' +
                            '<div class="img_box"><a href="' + routeUrl('/product/list.html?cate_no=1') + '"><img src="' + routeUrl(item.productImage) + '" alt=""></a></div>' +
                            '<div class="txt_box">' +
                                '<p class="p_name">' + item.productName + '</p>' +
                                '<p class="p_custom is-active">' + item.custom + '</p>' +
                                '<p class="p_price is-active">' + item.price + '</p>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                '</li>'
            );
        });
    }

    $(".main_portfolio .swiper-wrapper > li").each(function(){
        var $item = $(this);
        var $img = $item.find(".img_load img").first();
        var src = $img.attr("src") || "";

        if(src === "" || src === "/" || src.indexOf("{$") > -1 || $item.text().indexOf("{$") > -1){
            $item.remove();
            return;
        }

        $img.attr("src", src.replace("/gallery/", "//"));
    });

    $(".main_portfolio .cont").each(function(){
        var productNo = getProductNo($(this).text());

        if(productNo){
            $(this).closest("li").find(".cont_prd").first().attr("data-nd-product-no", productNo);
        }

        $(this).html(removeProductMarker($(this).text()));
    });

    $(".main_portfolio .swiper-wrapper > li").each(function(){
        var $item = $(this);
        var $product = $item.find(".cont_prd").first();
        var productNo = getProductNo($product.attr("data-product-param")) || $product.attr("data-nd-product-no") || getProductNo($item.text());

        if(!productNo || productNo.indexOf("{$") > -1 || !$product.length){
            return;
        }

        var productUrl = routeUrl("/product/detail.html?product_no=" + productNo);
        $product.attr("data-product-param", "?product_no=" + productNo).attr("data-nd-product-no", productNo);
        $product.find(".img_box a").attr("href", productUrl);
    });

    $(".main_portfolio .cont_prd .img_box").each(function(){
        if($(this).find("img").length === 0 && !$(this).closest(".cont_prd").attr("data-nd-product-no")){
            $(this).closest(".cont_prd").hide();
        }
    });

    appendFallbackItems();

    var productCache = {};
    $(".main_portfolio .cont_prd:visible").each(function(){
        var $box = $(this);
        var href = $box.find(".img_box a").attr("href") || "";

        if($box.hasClass("ndFallbackProduct")){
            return;
        }

        if(!href || href.indexOf("{$") > -1){
            return;
        }

        href = routeUrl(href);
        if(productCache[href]){
            productCache[href].done(function(data){
                fillProductInfo($box, data);
            });
            return;
        }

        productCache[href] = $.ajax({
            type: "GET",
            dataType: "html",
            url: href
        }).done(function(data){
            fillProductInfo($box, data);
        });
    });

    if($(".main_portfolio .swiper-wrapper > li").length === 0){
        $(".main_portfolio").remove();
        return;
    }

    var isMobilePortfolio = window.matchMedia && window.matchMedia("(max-width: 1024px)").matches;
    var portfolioSwiper = new Swiper(".main_portfolio .swiper-container", {
        slidesPerView: isMobilePortfolio ? 1 : 4,
        slidesPerGroup: 1,
        spaceBetween: isMobilePortfolio ? 8 : 14,
        centeredSlides: false,
        watchOverflow: true,
        observer: true,
        observeParents: true,
        nested: true,
        simulateTouch: false,
        touchStartPreventDefault: false,
        scrollbar: {
            el: ".main_portfolio .swiper-scrollbar",
            hide: false,
            draggable: false
        },
        navigation: {
            nextEl: ".main_portfolio .swiper-button-next",
            prevEl: ".main_portfolio .swiper-button-prev"
        },
        autoplay: {
            delay: 4000,
            disableOnInteraction: false
        },
        breakpoints: {
            1024: {
                slidesPerView: 1,
                slidesPerGroup: 1,
                spaceBetween: 8
            },
            640: {
                slidesPerView: 1,
                slidesPerGroup: 1,
                spaceBetween: 8
            }
        }
    });

});
