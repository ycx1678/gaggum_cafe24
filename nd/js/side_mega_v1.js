(function () {
    "use strict";

    function skinPrefix() {
        var match = window.location.pathname.match(/^\/skin-skin\d+(?:\/|$)/);
        return match ? match[0].replace(/\/$/, "") : "";
    }

    function categoryUrl(categoryNo) {
        return skinPrefix() + "/product/list.html?cate_no=" + encodeURIComponent(categoryNo);
    }

    function removeSubmenu(item) {
        var list = item.querySelector("ul");
        if (list) list.remove();
        Array.prototype.forEach.call(item.children, function (child) {
            if (child.classList && child.classList.contains("side_more")) child.remove();
        });
    }

    function renderSubmenu(item, categories) {
        var parentId = item.getAttribute("data-nd-mobile-mega-parent");
        var children = categories.filter(function (category) {
            return String(category.parent_cate_no) === parentId;
        });
        var list = item.querySelector("ul");

        if (!children.length || !list) {
            removeSubmenu(item);
            return;
        }

        list.innerHTML = "";
        children.forEach(function (child) {
            var row = document.createElement("li");
            var link = document.createElement("a");
            link.href = categoryUrl(child.cate_no);
            link.textContent = child.name;
            row.appendChild(link);
            list.appendChild(row);
        });
    }

    function init() {
        var menuItems = Array.prototype.slice.call(document.querySelectorAll("[data-nd-mobile-mega-parent]"));
        if (!menuItems.length) return;
        if (!window.fetch) {
            menuItems.forEach(removeSubmenu);
            return;
        }

        window.fetch("/exec/front/Product/SubCategory", { credentials: "same-origin" })
            .then(function (response) {
                if (!response.ok) throw new Error("Unable to load category data");
                return response.json();
            })
            .then(function (categories) {
                if (!Array.isArray(categories)) throw new Error("Invalid category data");
                menuItems.forEach(function (item) { renderSubmenu(item, categories); });
            })
            .catch(function () {
                menuItems.forEach(removeSubmenu);
            });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
}());
