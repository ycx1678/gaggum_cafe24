(function () {
    "use strict";

    var parentCategoryIds = { "162": true, "163": true, "164": true };

    function skinPrefix() {
        var match = window.location.pathname.match(/^\/skin-skin\d+(?:\/|$)/);
        return match ? match[0].replace(/\/$/, "") : "";
    }

    function categoryUrl(categoryNo) {
        return skinPrefix() + "/product/list.html?cate_no=" + encodeURIComponent(categoryNo);
    }

    function currentCategoryId() {
        var match = window.location.search.match(/[?&]cate_no=(\d+)/);
        return match ? match[1] : null;
    }

    function requestCategories() {
        return window.fetch("/exec/front/Product/SubCategory", { credentials: "same-origin" })
            .then(function (response) {
                if (!response.ok) throw new Error("Unable to load category data");
                return response.json();
            });
    }

    function fetchDocument(categoryNo) {
        return window.fetch(categoryUrl(categoryNo), { credentials: "same-origin" })
            .then(function (response) {
                if (!response.ok) throw new Error("Unable to load category products");
                return response.text();
            })
            .then(function (html) {
                return new DOMParser().parseFromString(html, "text/html");
            });
    }

    function makeIndex(categories) {
        var byId = {};
        var byParent = {};

        categories.forEach(function (category) {
            var id = String(category.cate_no);
            var parentId = String(category.parent_cate_no);
            byId[id] = category;
            if (!byParent[parentId]) byParent[parentId] = [];
            byParent[parentId].push(category);
        });

        return { byId: byId, byParent: byParent };
    }

    function subtreeCategoryIds(categoryId, byParent) {
        var ids = [String(categoryId)];
        (byParent[String(categoryId)] || []).forEach(function (child) {
            ids = ids.concat(subtreeCategoryIds(child.cate_no, byParent));
        });
        return ids;
    }

    function productKey(card) {
        if (card.id) return card.id;
        var productLink = card.querySelector('a[href*="product_no="]');
        return productLink ? productLink.getAttribute("href") : "";
    }

    function keepPreviewProductLinks(card) {
        var prefix = skinPrefix();
        if (!prefix) return;

        card.querySelectorAll("a[href]").forEach(function (link) {
            var href = link.getAttribute("href");
            if (!href || href.charAt(0) === "#" || href.indexOf("javascript:") === 0) return;

            try {
                var url = new URL(href, window.location.origin);
                if (url.pathname.indexOf("/product/") === 0) {
                    link.setAttribute("href", prefix + url.pathname + url.search + url.hash);
                }
            } catch (error) {
                return;
            }
        });
    }

    function makeGroup(title, href, cards) {
        var section = document.createElement("section");
        var heading = document.createElement("h3");
        var link = document.createElement("a");
        var list = document.createElement("ul");

        section.className = "nd-parent-category-aggregate__group";
        heading.className = "nd-parent-category-aggregate__heading";
        link.href = href;
        link.textContent = title;
        heading.appendChild(link);
        list.className = "prdList grid4";

        cards.forEach(function (card) {
            keepPreviewProductLinks(card);
            list.appendChild(card);
        });

        section.appendChild(heading);
        section.appendChild(list);
        return section;
    }

    function init() {
        var categoryId = currentCategoryId();
        if (!categoryId || !parentCategoryIds[categoryId] || !window.fetch) return;

        var originalPackage = document.querySelector(".normalpackage_box");
        if (!originalPackage || document.querySelector(".nd-parent-category-aggregate")) return;

        requestCategories().then(function (categories) {
            if (!Array.isArray(categories)) throw new Error("Invalid category data");
            var index = makeIndex(categories);
            var parent = index.byId[categoryId];
            var directChildren = index.byParent[categoryId] || [];
            var groups = directChildren.map(function (child) {
                return {
                    category: child,
                    categoryIds: subtreeCategoryIds(child.cate_no, index.byParent)
                };
            });

            return Promise.all(groups.map(function (group) {
                return Promise.all(group.categoryIds.map(function (childCategoryId) {
                    return fetchDocument(childCategoryId).catch(function () { return null; });
                })).then(function (documents) {
                    var cards = [];
                    documents.forEach(function (documentNode) {
                        if (!documentNode) return;
                        documentNode.querySelectorAll("#m_grid2 > li").forEach(function (card) {
                            cards.push(document.importNode(card, true));
                        });
                    });
                    return { category: group.category, cards: cards };
                });
            })).then(function (resolvedGroups) {
                var seenProducts = {};
                var aggregate = document.createElement("section");
                var title = document.createElement("h2");
                var visibleGroupCount = 0;

                aggregate.className = "nd-parent-category-aggregate";
                title.className = "nd-parent-category-aggregate__title";
                title.textContent = parent ? parent.name : "카테고리";
                aggregate.appendChild(title);

                resolvedGroups.forEach(function (group) {
                    var uniqueCards = group.cards.filter(function (card) {
                        var key = productKey(card);
                        if (!key || seenProducts[key]) return false;
                        seenProducts[key] = true;
                        return true;
                    });
                    if (!uniqueCards.length) return;
                    visibleGroupCount += 1;
                    aggregate.appendChild(makeGroup(group.category.name, categoryUrl(group.category.cate_no), uniqueCards));
                });

                if (!visibleGroupCount) return;
                originalPackage.style.display = "none";
                originalPackage.insertAdjacentElement("afterend", aggregate);
            });
        }).catch(function () {
            return;
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
}());
