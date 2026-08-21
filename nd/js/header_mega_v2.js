(function () {
    "use strict";

    function skinPrefix() {
        var match = window.location.pathname.match(/^\/skin-skin\d+(?:\/|$)/);
        return match ? match[0].replace(/\/$/, "") : "";
    }

    function categoryUrl(categoryNo) {
        return skinPrefix() + "/product/list.html?cate_no=" + encodeURIComponent(categoryNo);
    }

    function requestCategories() {
        return window.fetch("/exec/front/Product/SubCategory", { credentials: "same-origin" })
            .then(function (response) {
                if (!response.ok) throw new Error("Unable to load category data");
                return response.json();
            });
    }

    function makeIndex(categories) {
        var byParent = {};

        categories.forEach(function (category) {
            var parentId = String(category.parent_cate_no);
            if (!byParent[parentId]) byParent[parentId] = [];
            byParent[parentId].push(category);
        });

        return { byParent: byParent };
    }

    function makeLink(text, href, className) {
        var link = document.createElement("a");
        link.href = href;
        link.textContent = text;
        if (className) link.className = className;
        return link;
    }

    function renderPanel(panel, parentId, categoryIndex) {
        var children = categoryIndex.byParent[parentId] || [];
        var content = document.createDocumentFragment();
        var columns = document.createElement("div");

        panel.innerHTML = "";
        columns.className = "nd-mega-gnb__columns";
        children.forEach(function (child) {
            var column = document.createElement("section");
            var list = document.createElement("ul");
            var grandChildren = categoryIndex.byParent[String(child.cate_no)] || [];

            column.className = "nd-mega-gnb__column";
            column.appendChild(makeLink(child.name, categoryUrl(child.cate_no), "nd-mega-gnb__column-title"));
            list.className = "nd-mega-gnb__column-list";

            grandChildren.forEach(function (grandChild) {
                var item = document.createElement("li");
                item.appendChild(makeLink(grandChild.name, categoryUrl(grandChild.cate_no)));
                list.appendChild(item);
            });

            if (grandChildren.length) column.appendChild(list);
            columns.appendChild(column);
        });

        if (children.length) {
            content.appendChild(columns);
        } else {
            var empty = document.createElement("p");
            empty.className = "nd-mega-gnb__loading";
            empty.textContent = "등록된 하위 카테고리가 없습니다.";
            content.appendChild(empty);
        }

        panel.appendChild(content);
    }

    function init() {
        var navigation = document.querySelector(".nd-mega-gnb");
        if (!navigation || !window.fetch) return;

        var panel = navigation.querySelector(".nd-mega-gnb__panel");
        var panelInner = navigation.querySelector(".nd-mega-gnb__panel-inner");
        var activeParentId = null;
        var index = null;
        var closeTimer = null;

        function cancelClose() {
            clearTimeout(closeTimer);
            closeTimer = null;
        }

        function close() {
            activeParentId = null;
            navigation.classList.remove("is-open");
            panel.setAttribute("aria-hidden", "true");
            navigation.querySelectorAll("[data-nd-mega-parent] > a").forEach(function (link) {
                link.setAttribute("aria-expanded", "false");
            });
        }

        function open(parentId) {
            cancelClose();
            activeParentId = String(parentId);
            navigation.classList.add("is-open");
            panel.setAttribute("aria-hidden", "false");
            navigation.querySelectorAll("[data-nd-mega-parent] > a").forEach(function (link) {
                link.setAttribute("aria-expanded", link.parentNode.getAttribute("data-nd-mega-parent") === activeParentId ? "true" : "false");
            });

            if (index) {
                renderPanel(panelInner, activeParentId, index);
            } else {
                panelInner.innerHTML = '<p class="nd-mega-gnb__loading">카테고리를 불러오는 중입니다.</p>';
            }
        }

        function scheduleClose(event) {
            if (event && event.relatedTarget && navigation.contains(event.relatedTarget)) return;
            cancelClose();
            closeTimer = setTimeout(close, 240);
        }

        navigation.querySelectorAll("[data-nd-mega-parent]").forEach(function (item) {
            var parentId = item.getAttribute("data-nd-mega-parent");
            var link = item.querySelector("a");
            link.href = categoryUrl(parentId);
            item.addEventListener("mouseenter", function () { open(parentId); });
            item.addEventListener("mouseleave", scheduleClose);
            link.addEventListener("focus", function () { open(parentId); });
        });

        navigation.addEventListener("mouseenter", cancelClose);
        navigation.addEventListener("mouseleave", scheduleClose);
        panel.addEventListener("mouseenter", cancelClose);
        panel.addEventListener("mouseleave", scheduleClose);
        navigation.addEventListener("focusout", function () {
            setTimeout(function () {
                if (!navigation.contains(document.activeElement)) close();
            }, 0);
        });
        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape" && activeParentId) close();
        });

        requestCategories().then(function (categories) {
            if (!Array.isArray(categories)) throw new Error("Invalid category data");
            index = makeIndex(categories);
            if (activeParentId) renderPanel(panelInner, activeParentId, index);
        }).catch(function () {
            if (activeParentId) {
                panelInner.innerHTML = '<p class="nd-mega-gnb__loading">카테고리를 불러오지 못했습니다. 메뉴를 선택해 이동해주세요.</p>';
            }
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
}());
