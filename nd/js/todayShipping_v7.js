$(function(){

    /************************************************
    ★ 오늘발송 노출 조건 ★ (MUST HAVE 아이콘 기준 — 기본 OFF)
    - NEW 배지 기준은 폐기: 카페24 '신제품' 자동 진열이 NEW를 자동 부착해
      가꿈이 선택하지 않은 상품(예: 1054)에도 타이머가 켜졌음 (2026-06-10 피드백).
    - 현재 기준(아래 중 하나면 노출):
      1) 카페24 제공 "MUST HAVE" 아이콘(icon_global_14.gif) 부착  ← 가꿈 사용 중(1033 확인)
         ※ 이 아이콘은 alt가 빈값이라 파일명으로 인식함 (ndTodayShipIconSrc)
      2) 아이콘 이름(alt)에 musthave / "오늘출발" / "오늘발송" 포함
      3) 아이콘 이미지 파일명에 musthave 포함
    - 사용법: [상품 수정 → 아이콘 설정]에서 MUST HAVE 아이콘을 대상 상품에
      부착(표시기간 유효해야 출력됨) → 그 상품에만 타이머 자동 노출.
    - 아이콘 없는 상품은 타이머 숨김(기본 OFF).
    ************************************************/
    var ndTodayShipIconSrc = "icon_global_14.gif"; // 카페24 제공 MUST HAVE 아이콘(alt 빈값이라 파일명으로 인식)
    var ndHasTodayShipIcon = $(".icon img, img.icon_img").toArray().some(function(img){
        var alt = (img.getAttribute("alt") || "").toLowerCase().replace(/\s+/g, "");
        var src = (img.getAttribute("src") || "").toLowerCase();
        if(ndTodayShipIconSrc && src.indexOf(ndTodayShipIconSrc.toLowerCase()) > -1) return true;
        if(alt.indexOf("musthave") > -1 || /must[-_]?have/.test(src)) return true;
        return alt.indexOf("오늘출발") > -1 || alt.indexOf("오늘발송") > -1;
    });
    if (!ndHasTodayShipIcon) {
        $("#todayShipping_countdown").hide();
        return;
    }

    /************************************************
    ★ 오늘 발송 ★ 주문 마감 시간 설정
    - 아래 순서대로 시간 / 분 / 초 입력
    - 24시 방식으로 입력해 주세요.
    예시) 오후 5:00 의 경우 : 17 / 00 / 00 입력
    ************************************************/
    const TARGET_HOUR = 16;    // 시
    const TARGET_MINUTE = 00;  // 분
    const TARGET_SECOND = 00;  // 초


    /************************************************
    ★ 주말 미발송 설정 ★
    - 토, 일 무관하게 모두 발송 : "0"
    - 일요일 미발송 : "1"
    - 토, 일 모두 미발송 : "2"
    ************************************************/
    const WEEKDAY_TYPE = "0";


	/************************************************
    ★ 공휴일 미발송 설정 ★
    - 신정, 명절, 크리스마드 등 공휴일 미발송 시 설정
    - 아래 지정한 공휴일을 추가 계산합니다.
    - 설정된 문법 "YYYY-MM-DD", 에 맞게 입력
    ************************************************/
    const HOLIDAYS = [
        "2025-01-01",
        "2025-03-01",
        "2025-05-05",
        "2025-06-06",
        "2025-08-15",
        "2025-10-03",
        "2025-10-09",
        "2025-12-25",
    ];


	/**********************************************************
    ★ 아래 소스 수정 금지 ★ 수정 시 오류가 발생할 수 있습니다.
    ***********************************************************/
    function getNextBusinessDay(date) {
        let next = new Date(date);
        while (true) {
            const day = next.getDay(); // 0=일, 6=토
            const y = next.getFullYear();
            const m = String(next.getMonth() + 1).padStart(2, "0");
            const d = String(next.getDate()).padStart(2, "0");
            const formatted = `${y}-${m}-${d}`;
            let isWeekend = false;
            if (WEEKDAY_TYPE === "1" && day === 0) {
                isWeekend = true;
            } else if (WEEKDAY_TYPE === "2" && (day === 0 || day === 6)) {
                isWeekend = true;
            }
            const isHoliday = HOLIDAYS.includes(formatted);
            if (!isWeekend && !isHoliday) {
                return next;
            }
            next.setDate(next.getDate() + 1);
        }
    }
    function updateShippingStatus(now) {
        let target = new Date(now);
        target.setHours(TARGET_HOUR);
        target.setMinutes(TARGET_MINUTE);
        target.setSeconds(TARGET_SECOND);
        target.setMilliseconds(0);
        if (now > target) {
            let tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const shippingDate = getNextBusinessDay(tomorrow);
            const y = shippingDate.getFullYear();
            const m = String(shippingDate.getMonth() + 1).padStart(2, "0");
            const d = String(shippingDate.getDate()).padStart(2, "0");
            $("#todayShipping_countdown .shipping_tit").text("발송마감");
            $("#todayShipping_countdown .ment1 .txt").text("오늘 출고 마감.");
            $("#todayShipping_countdown .ment1 .timer").text("");
            $("#todayShipping_countdown .ment2").html(
                `지금 주문하시면 <span class=date>(${m}월${d}일)</span> 발송됩니다.`
            );
            return;
        }
        const diff = target - now;
        const totalSeconds = Math.floor(diff / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        const hh = String(hours).padStart(2, "0");
        const mm = String(minutes).padStart(2, "0");
        const ss = String(seconds).padStart(2, "0");
        $("#todayShipping_countdown .shipping_tit").text("오늘발송");
        $("#todayShipping_countdown .ment1 .txt").text("오늘 발송 남은 시간 : ");
        $("#todayShipping_countdown .ment1 .timer").text(`${hh} : ${mm} : ${ss}`);
        $("#todayShipping_countdown .ment2").html("지금 주문하시면 오늘 발송됩니다.");
    }
    updateShippingStatus(new Date());
    setInterval(() => {
        updateShippingStatus(new Date());
    }, 1000);
});
