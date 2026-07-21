$(function(){

    // pay_intro
    $(".pay_intro div").each(function(){
        var president_name = $(this).attr("data-name");
        if(president_name == "어썸디" || president_name == "AWESOMED" || president_name == "awesomed" || president_name == "AWESOME:D"){
            $(this).css("display","inline-block");
            $(this).click(function(){
                alert("페이 서비스는 관리자페이지에서 설정 후 사용 가능합니다.");
            });
        }
    });
   
});