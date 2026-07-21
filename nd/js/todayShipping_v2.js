$(function(){

    /************************************************
    ★ 오늘발송 노출 조건 ★ (카페24 '오늘출발' 연동)
    - 상품관리에서 '오늘출발'로 설정한 상품에만 타이머를 노출합니다.
    - 감지는 detail.html의 #ndTodayArrivalFlag 안에 {$today_arrival_icon}이
      img로 렌더되는지로 판별합니다.
    - 미설정 상품이면 타이머를 숨기고 종료합니다.
    ************************************************/
    var $ndArrivalFlag = $("#ndTodayArrivalFlag");
    if (!($ndArrivalFlag.length && $ndArrivalFlag.find("img").length)) {
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
