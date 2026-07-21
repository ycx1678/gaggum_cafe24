$(function(){
    $(".coupon_set .btn_coupon").click(function(){
        $(".coupon_set .coupon_layer,.coupon_set .coupon_popupbg").show();
    });
    $(".coupon_set .btn_close_layer, .coupon_popupbg").click(function(){
		$(".coupon_set .coupon_layer, .coupon_set .coupon_popupbg").hide();        
    });
});