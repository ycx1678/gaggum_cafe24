(function () {
    "use strict";

    function init() {
        var navigation = document.querySelector(".nd-mega-gnb");
        if (!navigation) return;

        var list = navigation.querySelector(".nd-mega-gnb__list");
        var panel = navigation.querySelector(".nd-mega-gnb__panel");
        if (!list || !panel) return;

        function alignPanel() {
            panel.style.top = Math.round(list.getBoundingClientRect().bottom) + "px";
        }

        navigation.querySelectorAll("[data-nd-mega-parent]").forEach(function (item) {
            item.addEventListener("mouseenter", alignPanel);
            item.querySelector("a").addEventListener("focus", alignPanel);
        });
        navigation.addEventListener("mouseenter", alignPanel);
        window.addEventListener("resize", alignPanel);
        window.addEventListener("scroll", function () {
            if (navigation.classList.contains("is-open")) alignPanel();
        }, { passive: true });

        alignPanel();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
}());
