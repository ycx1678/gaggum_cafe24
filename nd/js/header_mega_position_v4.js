(function () {
    "use strict";

    function init() {
        var navigation = document.querySelector(".nd-mega-gnb");
        if (!navigation) return;

        var list = navigation.querySelector(".nd-mega-gnb__list");
        var panel = navigation.querySelector(".nd-mega-gnb__panel");
        var panelInner = navigation.querySelector(".nd-mega-gnb__panel-inner");
        if (!list || !panel || !panelInner) return;

        function setColumnsShift(columns, shift) {
            columns.style.setProperty("--nd-mega-gnb-columns-shift", shift + "px");
        }

        function alignColumns() {
            var activeLink = navigation.querySelector("[data-nd-mega-parent] > a[aria-expanded=\"true\"]");
            var columns = panelInner.querySelector(".nd-mega-gnb__columns");
            if (!activeLink || !columns) return;

            setColumnsShift(columns, 0);
            if (columns.children.length >= 6) return setColumnsShift(columns, 0);

            var activeLinkBox = activeLink.getBoundingClientRect();
            var firstColumnBox = columns.firstElementChild.getBoundingClientRect();
            var lastColumnBox = columns.lastElementChild.getBoundingClientRect();
            var panelBox = panel.getBoundingClientRect();
            var panelStyle = window.getComputedStyle(panel);
            var safeLeft = panelBox.left + (parseFloat(panelStyle.paddingLeft) || 0);
            var safeRight = panelBox.right - (parseFloat(panelStyle.paddingRight) || 0);
            var desiredShift = activeLinkBox.left - firstColumnBox.left;
            var minimumShift = safeLeft - firstColumnBox.left;
            var maximumShift = safeRight - lastColumnBox.right;
            var boundedShift = Math.min(maximumShift, Math.max(minimumShift, desiredShift));

            setColumnsShift(columns, Math.round(boundedShift));
        }

        function alignPanel() {
            var navigationBox = navigation.getBoundingClientRect();
            var listBox = list.getBoundingClientRect();
            panel.style.top = Math.round(listBox.top - navigationBox.top) + "px";
            panel.style.setProperty("--nd-mega-gnb-height", Math.ceil(listBox.height) + "px");
            alignColumns();
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

        new MutationObserver(function () {
            if (navigation.classList.contains("is-open")) alignPanel();
        }).observe(panelInner, { childList: true });

        alignPanel();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
}());
