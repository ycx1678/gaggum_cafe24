$(function(){
    if($("#detail_btnTab").length){
        var $tab = $("#detail_btnTab");
        var $tabs = $tab.find('.detail_tab > li');
        var headerH = 0;
        var detail_tab_top = 0;
        var detail_fixed_start = 0;
        var detail_btnTabH = 0;
        function calc(){
            headerH = $("header").outerHeight();
            detail_tab_top = $tab.offset().top;
            detail_fixed_start = detail_tab_top - headerH;
            detail_btnTabH = $tab.outerHeight();
        }
        function syncLayout(){
            if($tab.hasClass("fixed")){
                $tab.css("top", headerH + "px");
                $("#detail1").css("padding-top", detail_btnTabH + "px");
            }
        }
        function updateFixed(){
            var scrollTop = $(window).scrollTop();

            if(scrollTop >= detail_fixed_start){
                if(!$tab.hasClass("fixed")){
                    $tab.addClass("fixed");
                }
                syncLayout();
            } else {
                $tab.removeClass("fixed").css("top", "0");
                $("#detail1").css("padding-top", "0");
            }
        }
        function updateActive(){
            var offsetLine = headerH + detail_btnTabH + 10;
            $tabs.each(function(index){
                var targetId = $(this).attr("data-target") || ("detail" + (index + 1));
                var $section = $('#' + targetId);
                if(!$section.length) return;

                var rect = $section[0].getBoundingClientRect();

                if(rect.top <= offsetLine && rect.bottom > offsetLine){
                    $tabs.removeClass('on');
                    $(this).addClass('on');
                }
            });
        }
        function updateAll(){
            updateFixed();
            updateActive();
        }
        $(window).on('load', function(){
            calc();
            setTimeout(function(){
                calc();
                updateAll();
            }, 300);
        });
        var resizeTimer;
        $(window).on('resize', function(){
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function(){
                calc();
                syncLayout();
                updateAll();
            }, 150);
        });
        var observer = new ResizeObserver(function(){
            calc();
            syncLayout();
            updateAll();
        });
        observer.observe(document.querySelector('#detail1'));
        $(window).on('scroll', function(){
            updateAll();
        });
        $tabs.on('click', function(e){
            e.preventDefault();
            e.stopPropagation();
            var targetId = $(this).attr("data-target") || ("detail" + ($(this).index() + 1));
            var $target = $('#' + targetId);
            if(!$target.length) return;
            var offset = headerH + detail_btnTabH;
            $('html, body').animate({
                scrollTop: $(window).scrollTop() + $target[0].getBoundingClientRect().top - offset
            }, 400);
        });
    }
});
