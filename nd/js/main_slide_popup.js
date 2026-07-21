(function(){

    document.addEventListener('DOMContentLoaded', function(){

        const popup = document.querySelector('.ndPromoPopup');
        if(!popup) return;

        /* 하루 동안 보지 않기 쿠키 체크 */
        if(document.cookie.indexOf('ndPromoPopupHide=1') > -1){
            return;
        }

        popup.style.display = 'flex';

        const slides   = popup.querySelectorAll('.ndPromoPopup__slide');
        const dots     = popup.querySelectorAll('.ndPromoPopup__dot');
        const btnClose = popup.querySelector('.ndPromoPopup__btn--close');
        const btnToday = popup.querySelector('.ndPromoPopup__btn--today');
        const btnPrev  = popup.querySelector('.ndPromoPopup__arrow--prev');
        const btnNext  = popup.querySelector('.ndPromoPopup__arrow--next');

        if(slides.length === 0) return;

        let idx = 0;
        let timer = null;
        const DELAY = 5000;

        /* ===============================
           슬라이드 이동
        =============================== */
        function goTo(i){
            slides[idx].classList.remove('is-active');
            dots[idx] && dots[idx].classList.remove('is-active');

            idx = i;

            slides[idx].classList.add('is-active');
            dots[idx] && dots[idx].classList.add('is-active');
        }

        function next(){
            let nextIdx = idx + 1;
            if(nextIdx >= slides.length) nextIdx = 0;
            goTo(nextIdx);
        }

        function prev(){
            let prevIdx = idx - 1;
            if(prevIdx < 0) prevIdx = slides.length - 1;
            goTo(prevIdx);
        }

        /* ===============================
           자동 롤링
        =============================== */
        function start(){
            stop();
            timer = setInterval(next, DELAY);
        }

        function stop(){
            if(timer){
                clearInterval(timer);
                timer = null;
            }
        }

        start();

        /* ===============================
           DOT 클릭
        =============================== */
        dots.forEach((dot, i)=>{
            dot.addEventListener('click', function(){
                goTo(i);
                start();
            });
        });

        /* ===============================
           화살표 클릭
        =============================== */
        if(btnPrev){
            btnPrev.addEventListener('click', function(){
                prev();
                start();
            });
        }

        if(btnNext){
            btnNext.addEventListener('click', function(){
                next();
                start();
            });
        }

        /* ===============================
           닫기
        =============================== */
        if(btnClose){
            btnClose.addEventListener('click', function(){
                stop();
                popup.style.display = 'none';
            });
        }

        /* ===============================
           하루 동안 보지 않기
        =============================== */
        if(btnToday){
            btnToday.addEventListener('click', function(){
                const d = new Date();
                d.setDate(d.getDate() + 1);
                document.cookie =
                    "ndPromoPopupHide=1; path=/; expires=" + d.toUTCString();
                stop();
                popup.style.display = 'none';
            });
        }

    });

})();
