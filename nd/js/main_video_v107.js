$(function(){
    // PC / 모바일(세로) 유튜브 영상 분기 출력
    var pcId = $.trim($(".main_video .video_id").text());
    var mId  = $.trim($(".main_video .video_id_m").text());
    var MOBILE = "(max-width:1060px)"; // main_video_v106.css 모바일 블록과 동일 기준

    function currentId(){
        var isMobile = window.matchMedia && window.matchMedia(MOBILE).matches;
        return (isMobile && mId) ? mId : pcId;
    }
    function applySrc(){
        var id = currentId();
        if(!id) return;
        var src = "https://www.youtube.com/embed/" + id +
            "?loop=1&vq=hd1080&controls=0&showinfo=0&rel=0&autoplay=1&playlist=" + id +
            "&mute=1&enablejsapi=1&playsinline=1";
        var $f = $(".main_video iframe");
        if($f.attr("src") !== src){ $f.attr("src", src); }
    }

    applySrc();

    // PC↔모바일 경계를 넘을 때만 영상 교체(불필요한 재로딩 방지)
    var wasMobile = window.matchMedia && window.matchMedia(MOBILE).matches;
    $(window).on("resize.mainVideo", function(){
        var isMobile = window.matchMedia && window.matchMedia(MOBILE).matches;
        if(isMobile !== wasMobile){ wasMobile = isMobile; applySrc(); }
    });
});
