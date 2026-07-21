$(function(){

    //게시글 내용 추출
    $(".review .cont").each(function(){
        var cont_txt = $(this).text();
        var txt_length = cont_txt.length;
        $(this).text(cont_txt);

        if(txt_length > 60){
            var this_txt = $(this).text().substr(0, 60)+"...";
            $(this).text(this_txt);
        }
    });


    //사진 여부 체크 후 처리
    function review_check(){
        $(".review_inner > li").each(function(){        

            // 평점 배치
            var prd_length = $(this).find(".item_img").children("img").length;

            if(prd_length == 0){
                $(this).find(".p_star").css("margin","0");
            }

            // 사진 여부 체크 후 처리
            var img_src = $(this).children(".thumb").find("img").attr("src");
            var prd_img = $(this).children(".description").find(".item_img").children("img").attr("src");

            if(img_src == "/nd/images/common/no_img.png"){
                $(this).children(".thumb").find("img").attr("src", prd_img);
            }
        });
    }

    review_check();
    
    setTimeout(review_check, 200);

    
    
});