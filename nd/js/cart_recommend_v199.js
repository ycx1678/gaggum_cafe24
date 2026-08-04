(function () {
    "use strict";

    var ROOT_ID = "ndCartRecommendRoot";
    var PENDING_MS = 15000;
    var SUCCESS_SUPPRESS_MS = 5000;
    var pending = null;
    var countTimer = 0;
    var closeTimer = 0;
    var suppressSuccessUntil = 0;
    var lastTrigger = null;
    var nativeAlert = window.alert;
    var dragResetTimer = 0;
    var priceCache = {};
    var PRICE_CONCURRENCY = 2;
    var PRICE_RETRY_LIMIT = 2;

    function matches(element, selector) {
        var fn;
        if (!element || element.nodeType !== 1) return false;
        fn = element.matches || element.msMatchesSelector || element.webkitMatchesSelector;
        return fn ? fn.call(element, selector) : false;
    }

    function closest(element, selector) {
        var node = element;
        while (node && node !== document) {
            if (matches(node, selector)) return node;
            node = node.parentNode;
        }
        return null;
    }

    function basketUrl() {
        var existing = document.querySelector('.member_wrap a[href*="basket.html"]');
        var skin = window.location.pathname.match(/^\/skin-skin\d+/);
        if (existing && existing.href) return existing.href;
        return window.location.origin + (skin ? skin[0] : "") + "/" + ["order", "basket.html"].join("/");
    }

    function readBasketCount() {
        var icon = document.querySelector('.member_wrap a[href*="/order/basket.html"] .bi-bag');
        var match;
        if (!icon) return null;
        match = String(icon.textContent || "").match(/\d+/);
        return match ? parseInt(match[0], 10) : null;
    }

    function relationItems() {
        var source = document.querySelector(".xans-product-relationlist .prdList");
        if (!source) return [];
        return Array.prototype.slice.call(source.children || []).filter(function (item) {
            return !!item.querySelector(".prdList__item .thumbnail a img") &&
                !!item.querySelector(".prdList__item .name a");
        });
    }

    function isSuccessMessage(message) {
        var text = String(message || "").replace(/\s+/g, " ");
        return text.indexOf("장바구니") !== -1 &&
            (text.indexOf("담") !== -1 || text.indexOf("추가") !== -1 || text.indexOf("완료") !== -1);
    }

    function customLayerVisible() {
        var root = document.getElementById(ROOT_ID);
        return !!root && !root.hidden && root.getAttribute("aria-hidden") === "false";
    }

    function removeSuccessConfirmLayer() {
        var confirmLayer = document.getElementById("confirmLayer");
        if (!confirmLayer || !isSuccessMessage(confirmLayer.textContent)) return false;
        if (confirmLayer.parentNode) confirmLayer.parentNode.removeChild(confirmLayer);
        return true;
    }

    function cleanText(node) {
        return node ? String(node.textContent || "").replace(/\s+/g, " ").trim() : "";
    }

    function priceNumber(node) {
        var digits = cleanText(node).replace(/[^0-9]/g, "");
        return digits ? parseInt(digits, 10) : 0;
    }

    function normalizedPriceText(node) {
        var textValue = cleanText(node);
        var match = textValue.match(/[0-9][0-9,]*\s*원/);
        return match ? match[0].replace(/\s+/g, "") : "";
    }

    function priceTextNumber(textValue) {
        var digits = String(textValue || "").replace(/[^0-9]/g, "");
        return digits ? parseInt(digits, 10) : 0;
    }

    function renderPriceGroup(price, originalText, currentText) {
        var originalValue = priceTextNumber(originalText);
        var currentValue = priceTextNumber(currentText);
        var hasDiscount = !!originalValue && !!currentValue && currentValue < originalValue;
        var original;
        var current;
        var discount;

        price.innerHTML = "";
        if (hasDiscount) {
            original = document.createElement("span");
            original.className = "nd-cart-recommend__price-original";
            original.textContent = originalText;
            price.appendChild(original);
        }

        current = document.createElement("span");
        current.className = "nd-cart-recommend__price-current";
        current.textContent = currentText || originalText;
        price.appendChild(current);

        if (hasDiscount) {
            discount = document.createElement("span");
            discount.className = "nd-cart-recommend__discount";
            discount.textContent = Math.round((originalValue - currentValue) / originalValue * 100) + "%";
            price.appendChild(discount);
        }
    }

    function detailPriceInfo(doc) {
        var customText = normalizedPriceText(doc.querySelector("#span_product_price_custom"));
        var productText = normalizedPriceText(doc.querySelector("#span_product_price_text"));
        var saleText = normalizedPriceText(doc.querySelector("#span_product_price_sale"));
        var customValue = priceTextNumber(customText);
        var productValue = priceTextNumber(productText);
        var saleValue = priceTextNumber(saleText);

        if (saleValue && productValue && saleValue < productValue) {
            return { original: productText, current: saleText };
        }
        if (customValue && productValue && productValue < customValue) {
            return { original: customText, current: productText };
        }
        if (customValue && saleValue && saleValue < customValue) {
            return { original: customText, current: saleText };
        }
        if (saleValue) return { original: "", current: saleText };
        if (productValue) return { original: "", current: productText };
        if (customValue) return { original: "", current: customText };
        return null;
    }

    function fetchPriceInfo(href) {
        var url;
        if (!window.fetch || !window.DOMParser || !href) return Promise.resolve(null);
        try {
            url = new URL(href, window.location.href);
        } catch {
            return Promise.resolve(null);
        }
        if (url.origin !== window.location.origin) return Promise.resolve(null);
        url.hash = "";
        if (priceCache[url.href]) return priceCache[url.href];

        function request(attempt) {
            return window.fetch(url.href, { credentials: "same-origin" })
                .then(function (response) {
                    var retryable = response.status === 403 || response.status === 429 || response.status >= 500;
                    if (!response.ok && retryable && attempt < PRICE_RETRY_LIMIT) {
                        return new Promise(function (resolve) {
                            window.setTimeout(resolve, 500 * (attempt + 1));
                        }).then(function () {
                            return request(attempt + 1);
                        });
                    }
                    if (!response.ok) throw new Error("price source " + response.status);
                    return response.text();
                })
                .then(function (html) {
                    if (typeof html !== "string") return html;
                    return detailPriceInfo(new window.DOMParser().parseFromString(html, "text/html"));
                });
        }

        priceCache[url.href] = request(0).catch(function () {
            return null;
        });
        return priceCache[url.href];
    }

    function enrichCardPrices(root) {
        var cards = Array.prototype.slice.call(root.querySelectorAll(".nd-cart-recommend__item[data-nd-product-href]"));
        var nextIndex = 0;

        function enrichNext() {
            var item;
            var price;
            if (nextIndex >= cards.length) return Promise.resolve();
            item = cards[nextIndex];
            nextIndex += 1;
            price = item.querySelector(".nd-cart-recommend__price");
            return fetchPriceInfo(item.getAttribute("data-nd-product-href")).then(function (info) {
                if (info && price && item.parentNode) renderPriceGroup(price, info.original, info.current);
            }).then(function () {
                return enrichNext();
            });
        }

        for (var worker = 0; worker < Math.min(PRICE_CONCURRENCY, cards.length); worker += 1) enrichNext();
    }

    function resetPanelDrag(panel) {
        if (!panel) return;
        panel.classList.remove("is-dragging");
        panel.style.removeProperty("--nd-cart-drag-y");
    }

    function installDragToClose(root) {
        var panel = root.querySelector(".nd-cart-recommend__panel");
        var handle = root.querySelector(".nd-cart-recommend__handle");
        var drag = null;

        if (!panel || !handle || !window.PointerEvent) return;

        handle.addEventListener("pointerdown", function (event) {
            if (window.matchMedia && !window.matchMedia("(max-width: 1024px)").matches) return;
            if (event.pointerType === "mouse" && event.button !== 0) return;
            if (dragResetTimer) {
                window.clearTimeout(dragResetTimer);
                dragResetTimer = 0;
            }
            drag = {
                pointerId: event.pointerId,
                startY: event.clientY,
                lastY: event.clientY,
                startedAt: Date.now()
            };
            panel.classList.add("is-dragging");
            if (handle.setPointerCapture) handle.setPointerCapture(event.pointerId);
            event.preventDefault();
        });

        handle.addEventListener("pointermove", function (event) {
            var distance;
            if (!drag || event.pointerId !== drag.pointerId) return;
            distance = Math.max(0, event.clientY - drag.startY);
            drag.lastY = event.clientY;
            panel.style.setProperty("--nd-cart-drag-y", distance + "px");
            event.preventDefault();
        });

        function finishDrag(event, cancelled) {
            var distance;
            var elapsed;
            var velocity;
            var shouldClose;
            if (!drag || event.pointerId !== drag.pointerId) return;
            distance = Math.max(0, drag.lastY - drag.startY);
            elapsed = Math.max(1, Date.now() - drag.startedAt);
            velocity = distance / elapsed;
            shouldClose = !cancelled && (distance >= 88 || (distance >= 24 && velocity >= 0.55));
            drag = null;
            panel.classList.remove("is-dragging");
            if (shouldClose) {
                closeLayer();
                return;
            }
            panel.style.setProperty("--nd-cart-drag-y", "0px");
            dragResetTimer = window.setTimeout(function () {
                panel.style.removeProperty("--nd-cart-drag-y");
                dragResetTimer = 0;
            }, 280);
        }

        handle.addEventListener("pointerup", function (event) {
            finishDrag(event, false);
        });
        handle.addEventListener("pointercancel", function (event) {
            finishDrag(event, true);
        });
    }

    function createRoot() {
        var root = document.getElementById(ROOT_ID);
        if (root) return root;

        root = document.createElement("div");
        root.id = ROOT_ID;
        root.hidden = true;
        root.setAttribute("aria-hidden", "true");
        root.innerHTML = [
            '<div class="nd-cart-recommend__backdrop" data-nd-cart-close></div>',
            '<section class="nd-cart-recommend__panel" role="dialog" aria-modal="true" aria-labelledby="ndCartRecommendTitle">',
                '<button type="button" class="nd-cart-recommend__handle" aria-label="아래로 끌어 추천상품 레이어 닫기"></button>',
                '<header class="nd-cart-recommend__header">',
                    '<div class="nd-cart-recommend__heading">',
                        '<h2 class="nd-cart-recommend__title" id="ndCartRecommendTitle">함께사면 좋은 제품</h2>',
                        '<p class="nd-cart-recommend__subtitle">방금 담은 상품과 함께 구매하면 좋아요</p>',
                    '</div>',
                    '<div class="nd-cart-recommend__actions">',
                        '<a class="nd-cart-recommend__cart" data-nd-cart-link aria-label="장바구니로 이동"><i class="bi bi-bag" aria-hidden="true"></i><span class="nd-cart-recommend__cart-label">장바구니</span></a>',
                    '</div>',
                    '<button type="button" class="nd-cart-recommend__close" data-nd-cart-close aria-label="추천상품 레이어 닫기"><i class="bi bi-x-lg" aria-hidden="true"></i></button>',
                '</header>',
                '<div class="nd-cart-recommend__body">',
                    '<ul class="nd-cart-recommend__list" data-nd-cart-list></ul>',
                '</div>',
            '</section>'
        ].join("");

        installDragToClose(root);

        root.addEventListener("click", function (event) {
            if (closest(event.target, "[data-nd-cart-link]")) {
                event.preventDefault();
                window.location.href = basketUrl();
                return;
            }
            if (closest(event.target, "[data-nd-cart-close]")) closeLayer();
        });
        document.body.appendChild(root);
        root.querySelector("[data-nd-cart-link]").setAttribute("href", basketUrl());
        return root;
    }

    function createCard(sourceItem) {
        var sourceThumb = sourceItem.querySelector(".thumbnail a");
        var sourceImage = sourceItem.querySelector(".thumbnail img");
        var sourceName = sourceItem.querySelector(".name a");
        var sourcePrice = sourceItem.querySelector(".rel_price");
        var sourceOriginal = sourcePrice ? sourcePrice.querySelector(".prdPrice") : null;
        var sourceSale = sourcePrice ? sourcePrice.querySelector(".salePrice") : null;
        var originalValue = priceNumber(sourceOriginal);
        var saleValue = priceNumber(sourceSale);
        var hasSale = !!sourceSale && !!saleValue && !!originalValue && saleValue < originalValue;
        var item = document.createElement("li");
        var thumb = document.createElement("a");
        var image = document.createElement("img");
        var name = document.createElement("a");
        var price = document.createElement("div");

        item.className = "nd-cart-recommend__item";
        item.setAttribute("data-nd-product-href", sourceName.href || sourceThumb.href || "");
        thumb.className = "nd-cart-recommend__thumb";
        thumb.href = sourceThumb.getAttribute("href") || sourceName.getAttribute("href") || "#";
        image.src = sourceImage.currentSrc || sourceImage.getAttribute("src") || "";
        image.alt = sourceImage.getAttribute("alt") || String(sourceName.textContent || "").trim();
        image.loading = "lazy";
        thumb.appendChild(image);

        name.className = "nd-cart-recommend__name";
        name.href = sourceName.getAttribute("href") || thumb.href;
        name.textContent = String(sourceName.textContent || "").trim();

        price.className = "nd-cart-recommend__price";
        renderPriceGroup(
            price,
            hasSale ? cleanText(sourceOriginal) : "",
            cleanText(hasSale ? sourceSale : (sourceOriginal || sourceSale))
        );

        item.appendChild(thumb);
        item.appendChild(name);
        item.appendChild(price);
        return item;
    }

    function populate(root) {
        var list = root.querySelector("[data-nd-cart-list]");
        var items = relationItems();
        var fragment = document.createDocumentFragment();
        var i;
        list.innerHTML = "";
        for (i = 0; i < items.length; i += 1) fragment.appendChild(createCard(items[i]));
        list.appendChild(fragment);
        return items.length;
    }

    function openLayer() {
        var root = createRoot();
        var count = populate(root);
        if (!count) return false;

        if (closeTimer) {
            window.clearTimeout(closeTimer);
            closeTimer = 0;
        }
        root.hidden = false;
        resetPanelDrag(root.querySelector(".nd-cart-recommend__panel"));
        enrichCardPrices(root);
        root.setAttribute("aria-hidden", "false");
        document.body.classList.remove("nd-cart-recommend-pending");
        document.body.classList.add("nd-cart-recommend-open");
        removeSuccessConfirmLayer();
        window.requestAnimationFrame(function () {
            root.classList.add("is-open");
        });
        suppressSuccessUntil = Date.now() + SUCCESS_SUPPRESS_MS;
        return true;
    }

    function closeLayer() {
        var root = document.getElementById(ROOT_ID);
        if (!root || root.hidden) return;
        removeSuccessConfirmLayer();
        root.classList.remove("is-open");
        root.setAttribute("aria-hidden", "true");
        document.body.classList.remove("nd-cart-recommend-open");
        closeTimer = window.setTimeout(function () {
            resetPanelDrag(root.querySelector(".nd-cart-recommend__panel"));
            root.hidden = true;
            if (lastTrigger && typeof lastTrigger.focus === "function") lastTrigger.focus();
        }, 270);
    }

    function clearPending() {
        pending = null;
        document.body.classList.remove("nd-cart-recommend-pending");
        if (countTimer) {
            window.clearInterval(countTimer);
            countTimer = 0;
        }
    }

    function startCountWatch() {
        if (countTimer) window.clearInterval(countTimer);
        countTimer = window.setInterval(function () {
            var count;
            if (!pending || Date.now() > pending.expires) {
                clearPending();
                return;
            }
            count = readBasketCount();
            if (count !== null && pending.count !== null && count > pending.count) {
                if (openLayer()) clearPending();
            }
        }, 200);
    }

    function armCart(trigger) {
        lastTrigger = trigger;
        pending = {
            count: readBasketCount(),
            expires: Date.now() + PENDING_MS
        };
        document.body.classList.add("nd-cart-recommend-pending");
        startCountWatch();
    }

    function restoreResponseFlag(data, key, hadOwn, value) {
        if (hadOwn) data[key] = value;
        else delete data[key];
    }

    function installBasketResultHook() {
        var nativeResult = window.basket_result_action;
        var attempts = 0;
        var timer;

        function install() {
            var wrapped;
            if (typeof nativeResult !== "function") nativeResult = window.basket_result_action;
            if (typeof nativeResult !== "function") return false;
            if (nativeResult.__ndCartRecommendWrapped) return true;

            wrapped = function (type, group, data) {
                var shouldShow = pending && Date.now() <= pending.expires &&
                    String(type) === "2" && group === "detail" && data &&
                    Number(data.result) >= 0 && relationItems().length > 0;
                var hasDisplay;
                var hasLayer;
                var hasPopup;
                var displayValue;
                var layerValue;
                var popupValue;

                if (!shouldShow) return nativeResult.apply(this, arguments);

                hasDisplay = Object.prototype.hasOwnProperty.call(data, "isDisplayBasket");
                hasLayer = Object.prototype.hasOwnProperty.call(data, "isDisplayLayerBasket");
                hasPopup = Object.prototype.hasOwnProperty.call(data, "isBasketPopup");
                displayValue = data.isDisplayBasket;
                layerValue = data.isDisplayLayerBasket;
                popupValue = data.isBasketPopup;

                data.isDisplayBasket = "T";
                data.isDisplayLayerBasket = "F";
                data.isBasketPopup = "F";

                try {
                    return nativeResult.apply(this, arguments);
                } finally {
                    restoreResponseFlag(data, "isDisplayBasket", hasDisplay, displayValue);
                    restoreResponseFlag(data, "isDisplayLayerBasket", hasLayer, layerValue);
                    restoreResponseFlag(data, "isBasketPopup", hasPopup, popupValue);
                }
            };

            wrapped.__ndCartRecommendWrapped = true;
            window.basket_result_action = wrapped;
            return true;
        }

        if (install()) return;
        timer = window.setInterval(function () {
            attempts += 1;
            if (install() || attempts >= 50) window.clearInterval(timer);
        }, 100);
    }

    installBasketResultHook();

    function installBasketAjaxHook() {
        var ec = window.EC$;
        var nativeAjax;
        var attempts = 0;
        var timer;

        function install() {
            var wrappedAjax;
            if (!ec || typeof ec.ajax !== "function") ec = window.EC$;
            if (!ec || typeof ec.ajax !== "function") return false;
            nativeAjax = ec.ajax;
            if (nativeAjax.__ndCartRecommendWrapped) return true;

            wrappedAjax = function (options) {
                var shouldWatch = pending && Date.now() <= pending.expires &&
                    options && typeof options === "object" &&
                    String(options.type || "GET").toUpperCase() === "POST" &&
                    String(options.url || "").indexOf("/exec/front/order/basket/") !== -1 &&
                    String(options.data || "").indexOf("command=add") !== -1 &&
                    typeof options.success === "function";
                var wrappedOptions;
                var originalSuccess;
                var key;

                if (!shouldWatch) return nativeAjax.apply(this, arguments);

                wrappedOptions = {};
                for (key in options) {
                    if (Object.prototype.hasOwnProperty.call(options, key)) wrappedOptions[key] = options[key];
                }
                originalSuccess = options.success;
                wrappedOptions.success = function (data) {
                    var shouldShow = data && Number(data.result) >= 0 && relationItems().length > 0;
                    var hasDisplay;
                    var hasLayer;
                    var hasPopup;
                    var displayValue;
                    var layerValue;
                    var popupValue;

                    if (!shouldShow) return originalSuccess.apply(this, arguments);

                    hasDisplay = Object.prototype.hasOwnProperty.call(data, "isDisplayBasket");
                    hasLayer = Object.prototype.hasOwnProperty.call(data, "isDisplayLayerBasket");
                    hasPopup = Object.prototype.hasOwnProperty.call(data, "isBasketPopup");
                    displayValue = data.isDisplayBasket;
                    layerValue = data.isDisplayLayerBasket;
                    popupValue = data.isBasketPopup;

                    data.isDisplayBasket = "T";
                    data.isDisplayLayerBasket = "F";
                    data.isBasketPopup = "F";

                    try {
                        return originalSuccess.apply(this, arguments);
                    } finally {
                        restoreResponseFlag(data, "isDisplayBasket", hasDisplay, displayValue);
                        restoreResponseFlag(data, "isDisplayLayerBasket", hasLayer, layerValue);
                        restoreResponseFlag(data, "isBasketPopup", hasPopup, popupValue);
                    }
                };

                arguments[0] = wrappedOptions;
                return nativeAjax.apply(this, arguments);
            };

            wrappedAjax.__ndCartRecommendWrapped = true;
            ec.ajax = wrappedAjax;
            return true;
        }

        if (install()) return;
        timer = window.setInterval(function () {
            attempts += 1;
            if (install() || attempts >= 50) window.clearInterval(timer);
        }, 100);
    }

    installBasketAjaxHook();

    document.addEventListener("click", function (event) {
        var cart = closest(event.target, ".actionCart");
        if (cart) armCart(cart);
    }, true);

    window.alert = function (message) {
        var shouldHandle = (pending || Date.now() < suppressSuccessUntil) && isSuccessMessage(message);
        if (shouldHandle && openLayer()) {
            clearPending();
            return;
        }
        if (pending && isSuccessMessage(message)) clearPending();
        return nativeAlert.apply(window, arguments);
    };

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") closeLayer();
    });

    if (window.MutationObserver) {
        new MutationObserver(function () {
            var confirmLayer;
            var text;
            var layerVisible = customLayerVisible();
            if (!pending && !layerVisible) return;
            confirmLayer = document.getElementById("confirmLayer");
            if (!confirmLayer) return;
            text = String(confirmLayer.textContent || "");
            if (!isSuccessMessage(text)) return;
            if (layerVisible) {
                removeSuccessConfirmLayer();
                return;
            }
            if (!openLayer()) {
                clearPending();
                return;
            }
            removeSuccessConfirmLayer();
            clearPending();
        }).observe(document.documentElement, { childList: true, subtree: true });
    }
}());
