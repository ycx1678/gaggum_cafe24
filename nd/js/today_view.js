$(function(){
    // Math.random() * [최대값 - 최소값] + [최소값]
    var max_view = 98, // 최대값 
        min_view = 15;  // 최소값
    
    var randomNum = Math.floor(Math.random() * (max_view - min_view) + min_view);
    
    $('.infoArea .headingArea .today_view span').html(randomNum+"명");
    function today_buy_ani(){
        $(".infoArea .headingArea .today_view").animate({
            top: "3px"
        }, function(){
            $(this).animate({
                top: "6px"
            });
        })
    }
    z = setInterval(today_buy_ani, 1000);
});