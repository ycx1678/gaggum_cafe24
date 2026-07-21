$(function(){
    
    // 무료배송 게이지
    var $freeShipping = $(".delv_price_B").clone().children("strong").remove().end().text();
    var $freeShippingPrice = $freeShipping.replace(/[^0-9]/g,'');
    var $freeShipping_print = $freeShippingPrice.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "원";
    $(".delv_price_B").attr("data-txt", $freeShippingPrice);
    
    var $totalPrice = 0;
    var origin_tit = $(".freeShip_gauge .tit_gauge").html();
    function total_price_reset(){
        $totalPrice = Number($(".totalPrice .total strong").text().replace(/[^0-9]/g,''));
        if($totalPrice > 0){
            $(".freeShip_gauge").show();
        } else {
            $(".freeShip_gauge").hide();
        }
        //console.log($totalPrice);
        var $freeRate = Math.round(100 - (($freeShippingPrice - $totalPrice) / $freeShippingPrice * 100));
        var $freeLeft = $freeShippingPrice - $totalPrice;
        if($freeLeft < 0){
            $freeLeft = 0;
        }
        var $freeLeft_print = $freeLeft.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        
        if($totalPrice >= $freeShippingPrice){
            $freeRate = 100;
            $(".freeShip_gauge .tit_gauge").addClass("free").html("🚛 무료배송");
        } else {
            $(".freeShip_gauge .tit_gauge").removeClass("free").html(origin_tit);
        }
        $(".freeShip_gauge .price_range .end").text($freeShipping_print);
        $(".freeShip_gauge .tit_gauge .pricePay").text($freeLeft_print);
        if($freeRate >= 100){
            $freeRate = 100; 
        }
        $(".freeShip_gauge .gauge_wrap .gauge_bar").animate({
            width : $freeRate + "%"
        });
    }
    $(".xans-product-option, #totalProducts").click(function(){
        setTimeout(total_price_reset, 800);
    });
    
});