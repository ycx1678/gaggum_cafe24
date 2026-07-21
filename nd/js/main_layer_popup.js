document.addEventListener('DOMContentLoaded', function () {
    const popup = document.querySelector('.ndLp_wrap');
    const closeBtn = document.querySelector('.ndLp_close');
    const dim = document.querySelector('.ndLp_dim');

    if (!popup || !closeBtn || !dim) return;

    function closePopup() {
        popup.style.display = 'none';
    }

    closeBtn.addEventListener('click', closePopup);
    dim.addEventListener('click', closePopup);
});
