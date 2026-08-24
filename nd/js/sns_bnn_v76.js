$(function(){
var sns_icon = {
    1: "인스타그램",
    2: "유튜브",
    3: "비메오",
    4: "네이버",
    5: "블로그",
    6: "카카오톡",
    7: "카카오스토리",
    8: "페이스북",
    9: "트위터",
    10: "트위치",
    11: "텔레그램",
    12: "인스타그램"
};

var classMap = {
    "인스타그램": "xi-instagram",
    "유튜브": "xi-youtube-play",
    "비메오": "xi-vimeo",
    "네이버": "xi-naver",
    "블로그": "xi-blogger",
    "카카오톡": "xi-kakaotalk",
    "카카오스토리": "xi-kakaostory",
    "페이스북": "xi-facebook",
    "트위터": "xi-twitter",
    "트위치": "xi-twich",
    "텔레그램": "xi-telegram"
};
if ($(".sns_bnn .gridWrap li").length > 0) {
    $(".sns_bnn .gridWrap li").each(function(index){
        var snsName = sns_icon[index + 1];
        var iconClass = classMap[snsName];
        if (snsName && iconClass) {
            $(this).children("a").append("<i class='" + iconClass + "'></i>");
        }
    });
}
});
