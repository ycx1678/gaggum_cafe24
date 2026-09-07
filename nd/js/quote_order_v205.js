(function () {
    "use strict";

    // v205 carries the quote-request delivery address into Cafe24 checkout,
    // submits Cafe24 discount codes only once while their recalculation runs,
    // and coalesces Cafe24's reentrant payment-method change events.
    // It also recovers from Cafe24 member discounts that exceed the quote
    // discount, and deletes service items using Cafe24's required option_id
    // rather than the distinct variant_code.
    // Cafe24's optimizer can evaluate the same skin asset more than once.
    // A second initializer would open a duplicate dialog and race an
    // emptyCart/addCart sequence, so the page owns exactly one instance.
    if (window.__ndQuoteOrderLoaded) return;
    window.__ndQuoteOrderLoaded = true;

    var BACKEND = window.ND_BULK_QUOTE_API_BASE || "https://backoffice.gaggum.kr";
    var CONTEXT_KEY = "gaggum_quote_order_context_v177";
    var TOKEN_RE = /^[A-Za-z0-9]{24}$/;
    var ORDER_FORM_HANDOFF_MS = 3600000;
    var ORDER_RESULT_LINK_MS = 600000;
    var COMPLETE_RETRY_LIMIT = 5;
    var CART_ADJUSTMENT_RETRY_LIMIT = 4;
    var CART_MATCH_RETRY_LIMIT = 2;
    var CART_MATCH_RETRY_MS = 400;
    var CART_COUNT_TIMEOUT_MS = 2000;
    var MEMBER_ID_RETRY_LIMIT = 12;
    var MEMBER_ID_RETRY_MS = 250;
    var MEMBER_ID_TIMEOUT_MS = 4000;
    var DISCOUNT_APPLY_TIMEOUT_MS = 15000;
    var ORDER_TOTAL_PREPARE_TIMEOUT_MS = 20000;
    var ORDER_TOTAL_MIN_WAIT_MS = 3000;
    var ORDER_TOTAL_STABLE_MS = 1500;
    var DELIVERY_METHOD_KEY = "ndDeliveryMethod";
    var DELIVERY_FEE_KEY = "ndDeliveryFee";
    var QUOTE_SERVICE_PRODUCT_NOS = [1090, 1115];
    var normalCartCleanupPending = false;

    function QuoteOrderError(message, code, status) {
        this.name = "QuoteOrderError";
        this.message = message || "견적 주문 처리에 실패했습니다.";
        this.code = code || "QUOTE_ORDER_FAILED";
        this.status = Number(status || 0);
        if (Error.captureStackTrace) Error.captureStackTrace(this, QuoteOrderError);
    }
    QuoteOrderError.prototype = Object.create(Error.prototype);
    QuoteOrderError.prototype.constructor = QuoteOrderError;

    function ready(fn) {
        if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
        else fn();
    }

    function money(value) {
        return Number(value || 0).toLocaleString("ko-KR") + "원";
    }

    function api() {
        return window.CAFE24API || null;
    }

    function skinPrefix() {
        var matched = window.location.pathname.match(/^(\/skin-skin\d+)(?:\/|$)/);
        return matched ? matched[1] : "";
    }

    function skinPath(path) {
        return skinPrefix() + String.fromCharCode(47) + path;
    }

    function quoteBasketUrl(token) {
        return skinPath("order/basket.html") + "?quote=" + encodeURIComponent(token);
    }

    function quoteAdjustmentBasketUrl(token) {
        return skinPath("order/basket.html") + "?quote_adjust=" + encodeURIComponent(token);
    }

    function quoteViewUrl(token) {
        return BACKEND + "/quote/" + encodeURIComponent(token);
    }

    function loginUrl(token) {
        var target = quoteBasketUrl(token);
        return skinPath("member/login.html") + "?returnUrl=" + encodeURIComponent(target);
    }

    function switchAccountUrl(token) {
        return skinPath("exec/front/Member/logout/") + "?returnUrl=" + encodeURIComponent(loginUrl(token));
    }

    function apiCall(method, args) {
        return new Promise(function (resolve, reject) {
            var sdk = api();
            if (!sdk || typeof sdk[method] !== "function") {
                reject(new QuoteOrderError("Cafe24 주문 기능을 불러오지 못했습니다.", "CAFE24_SDK_UNAVAILABLE"));
                return;
            }
            var timer = window.setTimeout(function () {
                reject(new QuoteOrderError("Cafe24 응답 시간이 초과되었습니다.", "CAFE24_API_TIMEOUT"));
            }, 15000);
            sdk[method].apply(sdk, args.concat(function (err, response) {
                window.clearTimeout(timer);
                if (err) {
                    var message = response && response.error && response.error.message;
                    reject(new QuoteOrderError(message || "Cafe24 주문 처리에 실패했습니다.", "CAFE24_API_FAILED"));
                    return;
                }
                resolve(response || {});
            }));
        });
    }

    function normalizedCartCount(value) {
        if (value === null || value === undefined || String(value).trim() === "") return null;
        var count = Number(value);
        if (!isFinite(count) || count < 0) return null;
        return Math.floor(count);
    }

    function cartCountFromCookie() {
        var matched = document.cookie.match(/(?:^|;\s*)basketcount_1=([^;]*)/);
        if (!matched) return null;
        try {
            return normalizedCartCount(decodeURIComponent(matched[1]));
        } catch {
            return normalizedCartCount(matched[1]);
        }
    }

    function renderCartCount(count) {
        var normalized = normalizedCartCount(count);
        if (normalized === null) return false;
        document.querySelectorAll(".xans_myshop_main_basket_cnt").forEach(function (node) {
            node.textContent = String(normalized);
        });
        return true;
    }

    function refreshCartCount() {
        return new Promise(function (resolve) {
            var sdk = api();
            var finished = false;
            var timer = null;

            function finish(count) {
                if (finished) return;
                finished = true;
                if (timer) window.clearTimeout(timer);
                if (!renderCartCount(count)) renderCartCount(cartCountFromCookie());
                resolve();
            }

            if (!sdk || typeof sdk.getCartCount !== "function") {
                finish(cartCountFromCookie());
                return;
            }

            timer = window.setTimeout(function () {
                finish(cartCountFromCookie());
            }, CART_COUNT_TIMEOUT_MS);

            try {
                sdk.getCartCount(function (error, response) {
                    // Some Cafe24 SDK builds pass only the response object.
                    if (arguments.length === 1 && error && typeof error === "object" && "count" in error) {
                        response = error;
                        error = null;
                    }
                    finish(!error && response ? response.count : cartCountFromCookie());
                });
            } catch {
                finish(cartCountFromCookie());
            }
        });
    }

    function quoteServiceCartItems(response) {
        return (response && response.carts || []).filter(function (item) {
            return QUOTE_SERVICE_PRODUCT_NOS.indexOf(Number(item && item.product_no || 0)) >= 0;
        });
    }

    function confirmOrphanQuoteServiceItemsRemoved(attempt) {
        return apiCall("getCartList", []).then(function (response) {
            if (!quoteServiceCartItems(response).length) return true;
            if (attempt >= 3) return false;
            return new Promise(function (resolve) {
                window.setTimeout(function () {
                    resolve(confirmOrphanQuoteServiceItemsRemoved(attempt + 1));
                }, 300);
            });
        });
    }

    function removeOrphanQuoteServiceItems() {
        normalCartCleanupPending = true;
        var sdk = api();
        if (!sdk || typeof sdk.getCartList !== "function" || typeof sdk.deleteCartItems !== "function") {
            actionableBanner(
                "견적 배송비 상품을 확인하지 못해 일반 장바구니 주문을 잠시 중단했습니다.",
                "다시 확인",
                removeOrphanQuoteServiceItems,
                true
            );
            return;
        }
        apiCall("getCartList", []).then(function (response) {
            var orphanedItems = quoteServiceCartItems(response);
            if (!orphanedItems.length) {
                normalCartCleanupPending = false;
                return null;
            }
            var serviceItems = orphanedItems.map(function (item) {
                return {
                    product_no: Number(item.product_no || 0),
                    option_id: String(item.option_id || "").trim(),
                    basket_product_no: Number(item.basket_product_no || 0)
                };
            }).filter(function (item) {
                return item.option_id && item.basket_product_no > 0;
            });
            if (serviceItems.length !== orphanedItems.length) {
                throw new QuoteOrderError(
                    "이전 견적의 배송비 상품 식별 정보를 확인하지 못했습니다.",
                    "QUOTE_SERVICE_ITEM_IDENTIFIER_MISSING"
                );
            }
            return apiCall("deleteCartItems", ["A", serviceItems])
                .then(function () { return confirmOrphanQuoteServiceItemsRemoved(0); })
                .then(function (removed) {
                    if (!removed) {
                        throw new QuoteOrderError(
                            "이전 견적의 배송비 상품을 일반 장바구니에서 정리하지 못했습니다.",
                            "QUOTE_SERVICE_ITEM_DELETE_NOT_CONFIRMED"
                        );
                    }
                    normalCartCleanupPending = false;
                    return refreshCartCount().then(function () { window.location.reload(); });
                });
        }).catch(function () {
            actionableBanner(
                "이전 견적의 배송비 상품을 일반 장바구니에서 정리하지 못했습니다.",
                "다시 정리",
                removeOrphanQuoteServiceItems,
                true
            );
        });
    }

    function guardNormalCartOrder(event) {
        if (!normalCartCleanupPending) return;
        var target = event.target && event.target.closest
            ? event.target.closest("a, button, input[type='submit']")
            : null;
        if (!target) return;
        var action = String(target.getAttribute && target.getAttribute("onclick") || "");
        var label = String(target.textContent || target.value || "");
        if (!/Basket\.order|상품\s*주문|주문하기|결제하기/.test(action + " " + label)) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        window.alert("견적 배송비 상품을 일반 장바구니에서 정리한 뒤 주문할 수 있습니다.");
    }

    function getMemberId() {
        return new Promise(function (resolve, reject) {
            var sdk = api();
            if (!sdk || typeof sdk.getMemberID !== "function") {
                reject(new QuoteOrderError(
                    "Cafe24 회원 확인 기능을 불러오지 못했습니다.",
                    "CAFE24_SDK_UNAVAILABLE"
                ));
                return;
            }
            var finished = false;
            var attempt = 0;
            var retryTimer = null;
            var timer = window.setTimeout(function () {
                if (finished) return;
                finished = true;
                if (retryTimer) window.clearTimeout(retryTimer);
                reject(new QuoteOrderError(
                    "Cafe24 회원 확인 응답 시간이 초과되었습니다.",
                    "CAFE24_MEMBER_TIMEOUT"
                ));
            }, MEMBER_ID_TIMEOUT_MS);
            function finish(memberId) {
                if (finished) return;
                finished = true;
                window.clearTimeout(timer);
                if (retryTimer) window.clearTimeout(retryTimer);
                resolve(typeof memberId === "string" && memberId ? memberId : null);
            }
            function readMemberId() {
                if (finished) return;
                attempt += 1;
                try {
                    sdk.getMemberID(function (memberId) {
                        if (finished) return;
                        if (typeof memberId === "string" && memberId) {
                            finish(memberId);
                            return;
                        }
                        if (attempt >= MEMBER_ID_RETRY_LIMIT) {
                            finish(null);
                            return;
                        }
                        retryTimer = window.setTimeout(readMemberId, MEMBER_ID_RETRY_MS);
                    });
                } catch (error) {
                    if (finished) return;
                    finished = true;
                    window.clearTimeout(timer);
                    if (retryTimer) window.clearTimeout(retryTimer);
                    reject(error);
                }
            }
            readMemberId();
        });
    }

    function cafe24ReportsLogin() {
        try {
            return Boolean(window.CAPP_ASYNC_METHODS && window.CAPP_ASYNC_METHODS.IS_LOGIN);
        } catch {
            return false;
        }
    }

    function panel() {
        var wrap = document.createElement("div");
        wrap.className = "ndQuoteOrderPanel";
        wrap.innerHTML =
            '<div class="ndQuoteOrderPanelInner" role="dialog" aria-modal="true" aria-labelledby="ndQuoteOrderTitle">' +
            '<h2 id="ndQuoteOrderTitle">견적 상품으로 주문하기</h2>' +
            '<p>견적 상품을 확인한 뒤 Cafe24 주문서로 바로 이동합니다.</p>' +
            '<p class="ndQuoteOrderStatus" role="status"></p>' +
            '<div class="ndQuoteOrderActions">' +
            '<button type="button" data-quote-cancel>취소</button>' +
            '<button type="button" class="is-primary" data-quote-start hidden>다시 시도</button>' +
            "</div></div>";
        document.body.appendChild(wrap);
        return wrap;
    }

    function setStatus(root, text, error) {
        var status = root.querySelector(".ndQuoteOrderStatus");
        if (!status) return;
        status.textContent = text || "";
        status.className = "ndQuoteOrderStatus" + (error ? " is-error" : "");
    }

    function removePanelAction(root, name) {
        var current = root.querySelector("[data-quote-recovery='" + name + "']");
        if (current) current.parentNode.removeChild(current);
    }

    function addPanelAction(root, name, label, handler) {
        removePanelAction(root, name);
        var actions = root.querySelector(".ndQuoteOrderActions");
        var button = document.createElement("button");
        button.type = "button";
        button.className = "is-primary";
        button.setAttribute("data-quote-recovery", name);
        button.textContent = label;
        button.addEventListener("click", handler);
        actions.appendChild(button);
        return button;
    }

    function fetchPayload(token, memberId, adjustmentContext) {
        var requestBody = { memberId: memberId };
        if (adjustmentContext && adjustmentContext.serviceAdjustmentAmount) {
            requestBody.serviceAdjustmentAmount = adjustmentContext.serviceAdjustmentAmount;
            requestBody.serviceAdjustmentProof = adjustmentContext.serviceAdjustmentProof;
        }
        return fetch(BACKEND + "/api/quotes/" + encodeURIComponent(token) + "/order-payload", {
            method: "POST",
            mode: "cors",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody)
        }).then(function (response) {
            return response.json().catch(function () { return {}; }).then(function (body) {
                if (!response.ok || !body.ok) {
                    throw new QuoteOrderError(
                        body && body.error && body.error.message || "견적 주문 정보를 불러오지 못했습니다.",
                        body && body.error && body.error.code || "QUOTE_PAYLOAD_FAILED",
                        response.status
                    );
                }
                return body.data;
            });
        });
    }

    function chunk(items, size) {
        var result = [];
        for (var i = 0; i < items.length; i += size) result.push(items.slice(i, i + size));
        return result;
    }

    function cafe24CartItems(items) {
        return (items || []).map(function (item) {
            var cartItem = {
                product_no: item.product_no,
                variants_code: item.variants_code,
                quantity: item.quantity
            };
            if (Array.isArray(item.options) && item.options.length) cartItem.options = item.options;
            return cartItem;
        });
    }

    function addItems(payload) {
        var groups = chunk(cafe24CartItems(payload.items), 10);
        var chain = Promise.resolve();
        groups.forEach(function (items) {
            chain = chain.then(function () {
                return apiCall("addCart", [payload.basketType, payload.prepaidShippingFee, items]);
            }).then(function (response) {
                if (response.errors && response.errors.length) {
                    throw new Error(response.errors[0].message || "일부 상품을 장바구니에 담지 못했습니다.");
                }
            });
        });
        return chain;
    }

    function normalizedItems(items, fromCart) {
        var grouped = {};
        (items || []).forEach(function (item) {
            var productNo = Number(item.product_no || 0);
            var variantCode = String((fromCart ? item.variant_code : item.variants_code) || "").trim().toUpperCase();
            var quantity = Number(item.quantity || 0);
            var options = Array.isArray(item.options) ? item.options.map(function (option) {
                var optionCode = String(option && (option.option_code || option.optionCode) || "").trim().toUpperCase();
                var valueNo = Number(option && (option.value_no || option.valueNo) || 0);
                return optionCode && valueNo > 0 ? optionCode + ":" + valueNo : "";
            }).filter(Boolean).sort().join(",") : "";
            var key = productNo + ":" + variantCode + ":" + options;
            if (!productNo || !variantCode || quantity < 1) return;
            grouped[key] = (grouped[key] || 0) + quantity;
        });
        return Object.keys(grouped).sort().map(function (key) {
            var separator = key.indexOf(":");
            var optionSeparator = key.indexOf(":", separator + 1);
            return {
                productNo: Number(key.slice(0, separator)),
                variantCode: key.slice(separator + 1, optionSeparator),
                options: key.slice(optionSeparator + 1),
                quantity: grouped[key]
            };
        });
    }

    function sameItems(expected, actual) {
        var left = normalizedItems(expected, false);
        var right = normalizedItems(actual, true);
        if (left.length !== right.length) return false;
        for (var i = 0; i < left.length; i += 1) {
            if (left[i].productNo !== right[i].productNo ||
                left[i].variantCode !== right[i].variantCode ||
                // Cafe24's cart SDK omits linked-selection options even though
                // addCart accepted them and the cart UI renders their values.
                // Compare those values whenever the SDK provides them, but do
                // not reject a verified linked product for an absent field.
                (right[i].options && left[i].options !== right[i].options) ||
                left[i].quantity !== right[i].quantity) return false;
        }
        return true;
    }

    function checkoutShippingAmount(expected) {
        var amount = Number(expected && expected.checkoutShippingAmount);
        if (!isFinite(amount) || amount < 0) return 0;
        return amount;
    }

    function hasSeparateFreightShipping(expected) {
        if (!expected || expected.shippingMethod === "pickup") return false;
        return expected.shippingPaymentMethod === "cod";
    }

    function quoteDeliveryMethod(expected) {
        if (expected && expected.shippingMethod === "pickup") return "방문수령";
        if (hasSeparateFreightShipping(expected)) return "화물배송(착불)";
        if (expected && expected.shippingPaymentMethod === "prepaid") return "화물배송(선불)";
        return "화물배송(착불)";
    }

    function applyQuoteShipping(expected) {
        var state = {
            applied: false,
            previousMethod: null,
            previousFee: null
        };
        try {
            state.previousMethod = window.localStorage.getItem(DELIVERY_METHOD_KEY);
            state.previousFee = window.localStorage.getItem(DELIVERY_FEE_KEY);
            // 선불 화물/납품·조립비는 모두 견적 서비스 상품으로 담는다. 이 값을
            // ndDeliveryFee에도 넣으면 Cafe24 배송비가 한 번 더 더해진다.
            var shippingAmount = checkoutShippingAmount(expected);
            var method = quoteDeliveryMethod(expected);
            state.applied = true;
            window.localStorage.setItem(DELIVERY_METHOD_KEY, method);
            window.localStorage.setItem(
                DELIVERY_FEE_KEY,
                method === "화물배송(착불)"
                    ? "착불"
                    : (shippingAmount > 0 ? money(shippingAmount) : "")
            );
        } catch {
            restoreQuoteShipping({
                quoteDeliveryApplied: state.applied,
                previousDeliveryMethod: state.previousMethod,
                previousDeliveryFee: state.previousFee
            });
            state.applied = false;
        }
        return state;
    }

    function restoreQuoteShipping(context) {
        if (!context || !context.quoteDeliveryApplied) return;
        try {
            if (context.previousDeliveryMethod == null) window.localStorage.removeItem(DELIVERY_METHOD_KEY);
            else window.localStorage.setItem(DELIVERY_METHOD_KEY, context.previousDeliveryMethod);
            if (context.previousDeliveryFee == null) window.localStorage.removeItem(DELIVERY_FEE_KEY);
            else window.localStorage.setItem(DELIVERY_FEE_KEY, context.previousDeliveryFee);
        } catch {
            // The order context can still be cleared when storage is unavailable.
        }
    }

    function storeContext(token, payload, adjustmentContext) {
        clearContext();
        var shippingState = applyQuoteShipping(payload.expected || {});
        if (!shippingState.applied) {
            throw new QuoteOrderError(
                "견적 배송방법을 저장하지 못해 주문을 시작할 수 없습니다.",
                "STORAGE_UNAVAILABLE"
            );
        }
        try {
            window.sessionStorage.setItem(CONTEXT_KEY, JSON.stringify({
                token: token,
                quoteNo: payload.quoteNo,
                items: payload.items,
                pricingMode: payload.pricingMode === "snapshot_only" ? "snapshot_only" : "verified",
                completionProof: payload.completionProof || null,
                discountCode: payload.discountCode || null,
                serviceAdjustmentAmount: Number(payload.expected && payload.expected.serviceAdjustmentAmount || 0),
                serviceAdjustmentProof: adjustmentContext && adjustmentContext.serviceAdjustmentProof || null,
                adjustmentAttempts: Number(adjustmentContext && adjustmentContext.adjustmentAttempts || 0),
                expected: payload.expected,
                deliveryRequestMessage: String(payload.deliveryRequestMessage || "").trim(),
                deliveryAddress: payload.deliveryAddress || null,
                quoteDeliveryApplied: shippingState.applied,
                previousDeliveryMethod: shippingState.previousMethod,
                previousDeliveryFee: shippingState.previousFee,
                createdAt: Date.now(),
                orderFormHandoffAt: 0,
                orderFormEnteredAt: 0,
                orderFormHandoffNonce: null,
                orderSubmittedAt: 0
            }));
        } catch {
            restoreQuoteShipping({
                quoteDeliveryApplied: shippingState.applied,
                previousDeliveryMethod: shippingState.previousMethod,
                previousDeliveryFee: shippingState.previousFee
            });
            throw new QuoteOrderError(
                "브라우저 저장공간을 사용할 수 없어 견적 주문을 시작하지 못했습니다.",
                "STORAGE_UNAVAILABLE"
            );
        }
    }

    function clearContext() {
        try {
            restoreQuoteShipping(JSON.parse(window.sessionStorage.getItem(CONTEXT_KEY) || "null"));
        } catch {
            // Invalid legacy context is discarded below.
        }
        try {
            window.sessionStorage.removeItem(CONTEXT_KEY);
        } catch {
            // Private browsing can deny storage access; there is no context to retain.
        }
    }

    function handoffNonce() {
        if (window.crypto && typeof window.crypto.getRandomValues === "function") {
            var bytes = new Uint32Array(3);
            window.crypto.getRandomValues(bytes);
            return Array.prototype.map.call(bytes, function (value) {
                return Number(value).toString(36);
            }).join("");
        }
        return Date.now().toString(36) + Math.random().toString(36).slice(2);
    }

    function markOrderFormHandoff(context) {
        context.orderFormHandoffAt = Date.now();
        context.orderFormEnteredAt = 0;
        context.orderFormHandoffNonce = handoffNonce();
        try {
            window.sessionStorage.setItem(CONTEXT_KEY, JSON.stringify(context));
        } catch {
            throw new QuoteOrderError(
                "주문 단계 정보를 저장하지 못했습니다. 브라우저 설정을 확인한 뒤 다시 시도해주세요.",
                "STORAGE_UNAVAILABLE"
            );
        }
    }

    function claimOrderFormContext(context) {
        var handoffAge = context
            ? Date.now() - Number(context.orderFormHandoffAt || 0)
            : Infinity;
        if (!context || handoffAge < 0 || handoffAge > ORDER_FORM_HANDOFF_MS) return false;

        var params = new URLSearchParams(window.location.search);
        var urlNonce = params.get("gaggum_quote_handoff");
        var contextNonce = String(context.orderFormHandoffNonce || "");
        if (context.orderFormEnteredAt) {
            // Cafe24 can reload the same order form without preserving this
            // client-only query value. Keep the active handoff context, then
            // let verifyOrderFormCart release it unless the live cart still
            // matches the quote snapshot.
            return Boolean(contextNonce && (!urlNonce || urlNonce === contextNonce));
        }
        if (urlNonce && contextNonce && urlNonce !== contextNonce) return false;

        if (!contextNonce) {
            contextNonce = handoffNonce();
            context.orderFormHandoffNonce = contextNonce;
        }
        context.orderFormEnteredAt = Date.now();
        try {
            window.sessionStorage.setItem(CONTEXT_KEY, JSON.stringify(context));
            if (urlNonce !== contextNonce) {
                params.set("gaggum_quote_handoff", contextNonce);
                var query = params.toString();
                window.history.replaceState(
                    null,
                    "",
                    window.location.pathname + (query ? "?" + query : "") + window.location.hash
                );
            }
        } catch {
            return false;
        }
        return true;
    }

    function markOrderSubmitted(context) {
        context.orderSubmittedAt = Date.now();
        try {
            window.sessionStorage.setItem(CONTEXT_KEY, JSON.stringify(context));
        } catch {
            throw new QuoteOrderError(
                "주문 연결 정보를 저장하지 못해 결제를 진행할 수 없습니다.",
                "STORAGE_UNAVAILABLE"
            );
        }
    }

    function readContext() {
        try {
            var context = JSON.parse(window.sessionStorage.getItem(CONTEXT_KEY) || "null");
            if (!context) return null;
            if (Date.now() - Number(context.createdAt || 0) > 3600000) {
                clearContext();
                return null;
            }
            return context;
        } catch {
            return null;
        }
    }

    function setBannerSemantics(node, error) {
        node.setAttribute("role", error ? "alert" : "status");
        node.setAttribute("aria-live", error ? "assertive" : "polite");
        node.setAttribute("aria-atomic", "true");
    }

    function banner(text, error) {
        var current = document.querySelector(".ndQuoteOrderBanner");
        if (!current) {
            current = document.createElement("div");
            document.body.insertBefore(current, document.body.firstChild);
        }
        current.className = "ndQuoteOrderBanner" + (error ? " is-error" : "");
        setBannerSemantics(current, error);
        current.textContent = text;
        return current;
    }

    function actionableBanner(text, label, handler, error) {
        var root = banner(text, error);
        var button = document.createElement("button");
        button.type = "button";
        button.className = "ndQuoteOrderBannerAction";
        button.textContent = label;
        button.addEventListener("click", handler);
        root.appendChild(document.createElement("br"));
        root.appendChild(button);
        return root;
    }

    function returnToQuote(context) {
        if (!context || !context.token) return;
        window.location.href = quoteViewUrl(context.token);
    }

    function restartQuote(context) {
        if (!context || !context.token) return;
        var token = context.token;
        clearContext();
        window.location.replace(quoteBasketUrl(token));
    }

    function resultOrderId() {
        var node = document.querySelector(".orderNumber");
        var text = String(node && node.textContent || "");
        var exact = text.match(/\b\d{8}-[0-9A-Za-z-]{5,}\b/);
        if (exact) return exact[0];
        var tail = text.split(":").pop().trim();
        return /^[0-9A-Za-z][0-9A-Za-z_-]{5,63}$/.test(tail) ? tail : null;
    }

    function retryComplete(context, orderId, attempt, message) {
        if (attempt >= COMPLETE_RETRY_LIMIT) {
            actionableBanner(message + " 견적 주문 연결 버튼을 눌러 다시 확인해주세요.", "견적 주문 연결 다시 확인", function (event) {
                event.currentTarget.disabled = true;
                completeQuoteOrder(context, orderId, 0);
            }, true);
            return;
        }
        banner(message + " 잠시 후 자동으로 다시 확인합니다.", true);
        window.setTimeout(function () {
            completeQuoteOrder(context, orderId, attempt + 1);
        }, 1500 * (attempt + 1));
    }

    function completeQuoteOrder(context, orderId, attempt) {
        banner("Cafe24 주문과 견적 내용을 대조하고 있습니다.", false);
        fetch(BACKEND + "/api/quotes/" + encodeURIComponent(context.token) + "/order-complete", {
            method: "POST",
            mode: "cors",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                orderId: orderId,
                completionProof: context.completionProof || undefined
            })
        }).then(function (response) {
            return response.json().catch(function () { return {}; }).then(function (body) {
                if (!response.ok || !body.ok) {
                    var message = body && body.error && body.error.message || "견적 주문 연결에 실패했습니다.";
                    if (response.status === 404 || response.status === 502 || response.status === 503) {
                        retryComplete(context, orderId, attempt, message);
                        return;
                    }
                    actionableBanner(message, "견적서 확인", function () {
                        returnToQuote(context);
                    }, true);
                    return;
                }
                clearContext();
                var linked = banner(
                    "대량견적 주문 연결이 완료되었습니다. 견적번호 " + (body.data.quoteNo || context.quoteNo || "-") +
                    ", Cafe24 주문번호 " + orderId,
                    false
                );
                if (!body.data.labelApplied && body.data.verificationMode !== "storefront_result") {
                    linked.className = "ndQuoteOrderBanner is-warning";
                    setBannerSemantics(linked, false);
                    linked.textContent += " " + (body.data.labelWarning || "관리자 주문 라벨 등록을 확인해주세요.");
                }
            });
        }).catch(function () {
            retryComplete(context, orderId, attempt, "네트워크 문제로 견적 주문 연결을 확인하지 못했습니다.");
        });
    }

    function orderAll() {
        var attempts = 0;
        function run() {
            attempts += 1;
            var buttons = document.querySelectorAll("a[onclick*='Basket.orderAll']");
            var button = null;
            for (var i = 0; i < buttons.length; i += 1) {
                if (buttons[i].offsetParent !== null) { button = buttons[i]; break; }
            }
            if (button && window.Basket && typeof window.Basket._callOrderAjax === "function") {
                var context = readContext();
                if (!context) {
                    banner("견적 주문 정보가 만료되었습니다. 견적서에서 다시 주문해주세요.", true);
                    return;
                }
                try {
                    markOrderFormHandoff(context);
                    window.Basket._callOrderAjax({ basket_type: "all_buy" }, button);
                } catch (error) {
                    actionableBanner(
                        error.message || "Cafe24 주문서 이동을 시작하지 못했습니다.",
                        "다시 시도",
                        orderAll,
                        true
                    );
                }
                return;
            }
            if (attempts < 60) window.setTimeout(run, 100);
            else actionableBanner(
                "Cafe24 주문 버튼을 찾지 못했습니다.",
                "주문 버튼 다시 찾기",
                orderAll,
                true
            );
        }
        run();
    }

    function continueGuestOrder(context) {
        var attempts = 0;
        function run() {
            attempts += 1;
            var controls = document.querySelectorAll(
                "a, button, input[type='button'], input[type='submit']"
            );
            for (var i = 0; i < controls.length; i += 1) {
                var label = String(controls[i].textContent || controls[i].value || "")
                    .replace(/\s+/g, " ")
                    .trim();
                if (/^비회원\s*(?:구매|주문)$/.test(label) && controls[i].offsetParent !== null) {
                    controls[i].click();
                    return;
                }
            }
            if (attempts < 60) {
                window.setTimeout(run, 100);
                return;
            }
            actionableBanner(
                "비회원 주문 버튼을 찾지 못했습니다.",
                "견적서로 돌아가기",
                function () { returnToQuote(context); },
                true
            );
        }
        run();
    }

    function verifyReadyCart(context, attempt) {
        var checkAttempt = Number(attempt || 0);
        banner("견적 상품 구성을 확인하고 있습니다.", false);
        apiCall("getCartList", []).then(function (response) {
            var carts = response && response.carts || [];
            if (!sameItems(context.items, carts)) {
                if (checkAttempt < CART_MATCH_RETRY_LIMIT) {
                    banner("장바구니 상품 구성을 다시 확인하고 있습니다.", false);
                    window.setTimeout(function () {
                        verifyReadyCart(context, checkAttempt + 1);
                    }, CART_MATCH_RETRY_MS);
                    return;
                }
                throw new QuoteOrderError(
                    "장바구니 상품 구성이 견적서와 일치하지 않아 주문서 이동을 중단했습니다.",
                    "CART_MISMATCH"
                );
            }
            return refreshCartCount().then(function () {
                banner("견적 상품 구성이 확인되었습니다. Cafe24 주문서로 이동합니다.", false);
                window.setTimeout(orderAll, 500);
            });
        }).catch(function (error) {
            if (error && error.code === "CART_MISMATCH") {
                actionableBanner(error.message, "견적 장바구니 다시 구성", function () {
                    restartQuote(context);
                }, true);
                return;
            }
            actionableBanner(
                error.message || "장바구니 검증에 실패했습니다.",
                "장바구니 다시 확인",
                function () { verifyReadyCart(context); },
                true
            );
        });
    }

    function isOrderControl(target) {
        var control = target && target.closest
            ? target.closest("a, button, input[type='submit']")
            : null;
        if (!control) return false;
        var action = String(control.getAttribute && control.getAttribute("onclick") || "");
        var label = String(control.textContent || control.value || "");
        return /Basket\.order|상품\s*주문|주문하기|결제하기/.test(action + " " + label);
    }

    function blockUnverifiedQuoteOrder(context, message) {
        actionableBanner(
            message || "견적 상품 구성을 확인하지 못해 결제를 진행할 수 없습니다.",
            "견적서로 돌아가기",
            function () { returnToQuote(context); },
            true
        );
        document.addEventListener("click", function (event) {
            if (!isOrderControl(event.target)) return;
            event.preventDefault();
            event.stopImmediatePropagation();
        }, true);
        document.addEventListener("submit", function (event) {
            event.preventDefault();
            event.stopImmediatePropagation();
        }, true);
    }

    function verifyOrderFormCart(context) {
        apiCall("getCartList", []).then(function (response) {
            var carts = response && response.carts || [];
            if (!sameItems(context.items, carts)) {
                // A normal buy-now order may be opened while an old quote
                // handoff is still in sessionStorage.  Never apply quote-only
                // pricing or payment restrictions unless the actual cart is
                // exactly the snapshot that was just verified for the quote.
                clearContext();
                return;
            }
            enforceOrderForm(context);
        }).catch(function () {
            // For an actual quote handoff it is safer to stop than to allow a
            // payment whose cart composition cannot be proven.  A normal cart
            // is released above when it does not match the quote snapshot.
            blockUnverifiedQuoteOrder(
                context,
                "견적 장바구니 구성을 확인하지 못해 결제를 진행할 수 없습니다."
            );
        });
    }

    function startBasketQuote(token, adjustmentContext) {
        var root = panel();
        var cancel = root.querySelector("[data-quote-cancel]");
        var start = root.querySelector("[data-quote-start]");
        var cartMutationStarted = false;
        var quoteCartCommitted = false;
        cancel.addEventListener("click", function () {
            clearContext();
            window.location.replace(window.location.pathname);
        });
        function runStart() {
            removePanelAction(root, "switch-account");
            cancel.disabled = true;
            start.disabled = true;
            start.hidden = true;
            start.textContent = "다시 시도";
            cartMutationStarted = false;
            quoteCartCommitted = false;
            setStatus(root, "견적 주문 정보를 확인하고 있습니다.", false);
            getMemberId()
                .then(function (memberId) { return fetchPayload(token, memberId, adjustmentContext); })
                .then(function (payload) {
                    setStatus(root, "기존 국내배송 장바구니를 정리하고 있습니다.", false);
                    return apiCall("emptyCart", ["A"]).then(function () {
                        cartMutationStarted = true;
                        return payload;
                    });
                })
                .then(function (payload) {
                    setStatus(root, "견적 상품을 장바구니에 담고 있습니다.", false);
                    return addItems(payload)
                        .then(refreshCartCount)
                        .then(function () { return payload; });
                })
                .then(function (payload) {
                    storeContext(token, payload, adjustmentContext);
                    quoteCartCommitted = true;
                    window.location.replace(window.location.pathname + "?quote_ready=" + encodeURIComponent(token));
                })
                .catch(function (error) {
                    if (error && error.code === "LOGIN_REQUIRED") {
                        if (cafe24ReportsLogin()) {
                            cancel.disabled = false;
                            start.disabled = false;
                            start.hidden = false;
                            start.textContent = "로그인 상태 다시 확인";
                            setStatus(root, "로그인은 완료됐지만 회원 정보를 아직 확인하지 못했습니다.", true);
                            return;
                        }
                        window.location.replace(loginUrl(token));
                        return;
                    }
                    var cleanup = cartMutationStarted && !quoteCartCommitted
                        ? apiCall("emptyCart", ["A"]).catch(function () { return null; })
                        : Promise.resolve();
                    cleanup.then(function () {
                        cancel.disabled = false;
                        start.disabled = false;
                        start.hidden = false;
                        start.textContent = "다시 시도";
                        setStatus(root, error.message || "견적 주문 준비에 실패했습니다.", true);
                        if (error && error.code === "MEMBER_MISMATCH") {
                            addPanelAction(root, "switch-account", "다른 계정으로 로그인", function () {
                                window.location.href = switchAccountUrl(token);
                            });
                        } else if (error && /^(QUOTE_EXPIRED|QUOTE_NOT_CONFIRMED|QUOTE_VARIANT_REQUIRED|QUOTE_NOT_FOUND)$/.test(error.code || "")) {
                            addPanelAction(root, "view-quote", "견적서 확인", function () {
                                window.location.href = quoteViewUrl(token);
                            });
                        }
                    });
                });
        }
        start.addEventListener("click", runStart);
        window.setTimeout(runStart, 0);
    }

    function parseMoney(text) {
        var value = parseInt(String(text || "").replace(/[^0-9]/g, ""), 10);
        return value > 0 ? value : 0;
    }

    var PAYMENT_METHOD_SELECTOR = [
        "input[type='radio'][name*='paymethod']",
        "input[type='radio'][id*='paymethod']",
        "button[name*='paymethod']",
        "button[id*='paymethod']",
        "[role='radio'][name*='paymethod']",
        "[role='radio'][id*='paymethod']",
        "button[data-paymethod]",
        "[role='button'][data-paymethod]",
        "[role='radio'][data-paymethod]",
        "button[data-payment-method]",
        "[role='button'][data-payment-method]",
        "[role='radio'][data-payment-method]"
    ].join(", ");

    function paymentText(control) {
        var label = control.id ? document.querySelector("label[for='" + control.id + "']") : null;
        var holder = control.closest("li, label, .ec-base-label, .payMethod, .method");
        return String((label && label.textContent) || (holder && holder.textContent) || control.textContent || control.value || "").trim();
    }

    function paymentIdentity(control) {
        return [
            paymentText(control),
            control.id,
            control.value,
            control.getAttribute("data-paymethod"),
            control.getAttribute("data-payment-method"),
            control.getAttribute("aria-label")
        ].join(" ");
    }

    function isBankDepositControl(control) {
        return /무통장|bank|cash/i.test(paymentIdentity(control));
    }

    function isSelectedPaymentControl(control) {
        return Boolean(control.checked) ||
            control.getAttribute("aria-checked") === "true" ||
            control.getAttribute("aria-pressed") === "true" ||
            /(?:^|\s)(?:selected|active|on)(?:\s|$)/i.test(control.className || "");
    }

    function forceBankDeposit() {
        var roots = document.querySelectorAll("#ec-jigsaw-area-paymethod, [id*='paymethod']");
        var controls = document.querySelectorAll(PAYMENT_METHOD_SELECTOR);
        var bankControl = null;
        for (var i = 0; i < controls.length; i += 1) {
            var isBank = isBankDepositControl(controls[i]);
            var holder = controls[i].closest("li, label, .ec-base-label, [data-paymethod], [data-payment-method]");
            var label = controls[i].id ? document.querySelector("label[for='" + controls[i].id + "']") : null;
            if (isBank && !bankControl) {
                bankControl = controls[i];
                controls[i].disabled = false;
                controls[i].removeAttribute("aria-disabled");
                controls[i].removeAttribute("tabindex");
                if (holder) {
                    holder.classList.remove("ndQuoteOrderPaymentBlocked");
                    holder.removeAttribute("aria-hidden");
                }
                if (label) {
                    label.classList.remove("ndQuoteOrderPaymentBlocked");
                    label.removeAttribute("aria-hidden");
                }
            } else if (!isBank) {
                if ("checked" in controls[i]) controls[i].checked = false;
                controls[i].disabled = true;
                controls[i].setAttribute("aria-disabled", "true");
                controls[i].setAttribute("tabindex", "-1");
                controls[i].classList.add("ndQuoteOrderPaymentBlocked");
                if (holder) {
                    holder.classList.add("ndQuoteOrderPaymentBlocked");
                    holder.setAttribute("aria-hidden", "true");
                }
                if (label) {
                    label.classList.add("ndQuoteOrderPaymentBlocked");
                    label.setAttribute("aria-hidden", "true");
                }
            }
        }
        for (var j = 0; j < roots.length; j += 1) roots[j].setAttribute("data-quote-bank-only", "true");
        controls = document.querySelectorAll(PAYMENT_METHOD_SELECTOR);
        for (var k = 0; k < controls.length; k += 1) {
            if (isBankDepositControl(controls[k]) && isSelectedPaymentControl(controls[k])) {
                return controls[k];
            }
        }
        return null;
    }

    var bankDepositSyncScheduled = false;

    function scheduleBankDepositSync() {
        if (bankDepositSyncScheduled) return;
        bankDepositSyncScheduled = true;
        window.setTimeout(function () {
            try {
                forceBankDeposit();
            } finally {
                bankDepositSyncScheduled = false;
            }
        }, 0);
    }

    function shippingPaymentLabel(expected) {
        if (!expected || expected.shippingMethod === "pickup") return "방문수령";
        return hasSeparateFreightShipping(expected) ? "착불 배송비 별도" : "선결제";
    }

    function enforceNativeCollectShippingFeeLabel() {
        var scheduled = null;

        function selectedDeliveryLabel() {
            var selected = document.querySelector("input[name='delivcompany']:checked");
            if (!selected) return "";
            var labels = document.getElementsByTagName("label");
            for (var i = 0; i < labels.length; i += 1) {
                if (labels[i].htmlFor === selected.id) return String(labels[i].textContent || "");
            }
            return String(selected.value || "");
        }

        function sync() {
            var deliveryLabel = selectedDeliveryLabel().replace(/\s+/g, "");
            var collect = /화물.*착불|착불.*화물/.test(deliveryLabel);
            var candidates = document.querySelectorAll(
                "tr, li, dl, [class*='shipping'], [class*='delivery'], [id*='shipping'], [id*='delivery'], div"
            );
            for (var i = 0; i < candidates.length; i += 1) {
                var node = candidates[i];
                var text = String(node.textContent || "").replace(/\s+/g, "");
                if (collect && /^배송비0\(무료\)원$/.test(text)) {
                    node.textContent = "배송비 0 (착불 배송비 별도)원";
                } else if (!collect && /^배송비0\(착불배송비별도\)원$/.test(text)) {
                    node.textContent = "배송비 0 (무료)원";
                }
            }
        }

        function scheduleSync() {
            window.clearTimeout(scheduled);
            scheduled = window.setTimeout(sync, 80);
        }

        sync();
        document.addEventListener("change", function (event) {
            var target = event.target;
            if (target && target.matches && target.matches("input[name='delivcompany']")) {
                scheduleSync();
            }
        });
        if (window.MutationObserver && document.body) {
            new MutationObserver(scheduleSync).observe(document.body, {
                childList: true,
                characterData: true,
                subtree: true
            });
        }
    }

    function hideRedundantNativeShippingRows(expected) {
        var collect = hasSeparateFreightShipping(expected);
        var candidates = document.querySelectorAll(
            "tr, li, dl, [class*='shipping'], [class*='delivery'], [id*='shipping'], [id*='delivery'], div"
        );
        for (var i = 0; i < candidates.length; i += 1) {
            var node = candidates[i];
            if (node.classList.contains("ndQuoteOrderShippingPayment")) continue;
            var text = String(node.textContent || "").replace(/\s+/g, "");
            var productShippingFree = /^배송비0\(무료\)원$/.test(text);
            if (collect && productShippingFree) {
                node.textContent = "배송비 0 (착불 배송비 별도)원";
                node.classList.add("ndQuoteOrderNativeShippingReplaced");
                continue;
            }
            var productShipping = /^배송비(?:0(?:원)?\(착불배송비별도\)원?|0원\(착불배송비별도\))$/.test(text);
            var paymentShipping = /^배송비\(착불상품포함\)0원$/.test(text);
            if (!productShipping && !paymentShipping) continue;
            node.hidden = true;
            node.setAttribute("aria-hidden", "true");
            node.classList.add("ndQuoteOrderNativeShippingHidden");
        }
    }

    function ensureShippingPaymentSummary(context) {
        var expected = context && context.expected || {};
        var current = document.querySelector(".ndQuoteOrderShippingPayment");
        if (expected.shippingMethod === "pickup") {
            if (current && current.parentNode) current.parentNode.removeChild(current);
            return;
        }
        if (!current) {
            current = document.createElement("fieldset");
            current.className = "ndQuoteOrderShippingPayment";
            current.innerHTML =
                '<legend>배송비 결제방법</legend>' +
                '<label><input type="radio" name="ndQuoteShippingPayment" value="cod" disabled> 착불 배송비 별도</label>' +
                '<label><input type="radio" name="ndQuoteShippingPayment" value="prepaid" disabled> 선결제</label>' +
                '<p class="ndQuoteOrderShippingPaymentNote"></p>';
            var anchor = document.querySelector("#ec-jigsaw-area-paymethod, [id*='paymethod']");
            var form = document.querySelector("form");
            if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(current, anchor);
            else if (form) form.insertBefore(current, form.firstChild);
            else document.body.insertBefore(current, document.body.firstChild);
        }
        var method = hasSeparateFreightShipping(expected) ? "cod" : "prepaid";
        var radios = current.querySelectorAll("input[type='radio']");
        for (var i = 0; i < radios.length; i += 1) {
            radios[i].checked = radios[i].value === method;
        }
        var note = current.querySelector(".ndQuoteOrderShippingPaymentNote");
        if (note) {
            var amount = Number(expected.displayShippingAmount || expected.shippingAmount || 0);
            var assemblyAmount = Number(expected.assemblyFeeAmount || 0);
            var serviceFeeAmount = Number(expected.serviceFeeAmount || 0);
            var adjustmentAmount = Number(expected.serviceAdjustmentAmount || 0);
            var paymentLabel = shippingPaymentLabel(expected);
            var paymentPrefix = paymentLabel === "착불 배송비 별도"
                ? "Cafe24 주문서 배송 표기는 착불 배송비 별도이며, 견적서에 반영된"
                : "견적서에서 선택한 " + paymentLabel;
            var noteText = paymentPrefix +
                (amount > 0 ? " 배송비 " + money(amount) : " 배송비") +
                (assemblyAmount > 0 ? " + 조립서비스 " + money(assemblyAmount) : "") +
                (serviceFeeAmount > 0 ? " (서비스 품목 합계 " + money(serviceFeeAmount) + ")" : "") +
                " 기준으로 주문서가 구성되었습니다." +
                (adjustmentAmount > 0
                    ? " Cafe24 기본할인 보정을 위해 임시 서비스 금액 " + money(adjustmentAmount) +
                        "이 함께 표시되지만, 할인코드로 같은 금액이 상쇄되어 최종 견적금액에는 추가되지 않습니다."
                    : "");
            // Avoid retriggering the order-form MutationObserver with identical text.
            if (note.textContent !== noteText) note.textContent = noteText;
        }
    }

    function visibleOrderTotal() {
        var selectors = [
            "#payment_total_order_sale_price_view",
            "#total_order_sale_price_view",
            "#total_order_price_view",
            "#payment_total_order_price",
            ".totalPay.paymentPrice .txtStrong",
            ".totalPay .price",
            ".paymentPrice .price"
        ];
        for (var i = 0; i < selectors.length; i += 1) {
            var nodes = document.querySelectorAll(selectors[i]);
            for (var j = 0; j < nodes.length; j += 1) {
                if (nodes[j].offsetParent === null) continue;
                var amount = parseMoney(nodes[j].textContent || nodes[j].value);
                if (amount > 0) return amount;
            }
        }
        return 0;
    }

    function visibleDiscountCodeAmount() {
        var selectors = [
            "#ec_discountcode_price",
            "#ec-shop-payment_discountcode_price_view"
        ];
        for (var i = 0; i < selectors.length; i += 1) {
            var nodes = document.querySelectorAll(selectors[i]);
            for (var j = 0; j < nodes.length; j += 1) {
                if (nodes[j].offsetParent === null) continue;
                var amount = parseMoney(nodes[j].textContent || nodes[j].value);
                if (amount > 0) return amount;
            }
        }
        return 0;
    }

    function discountCodeAppliedUi() {
        var input = document.querySelector("input[name='ec_discountcode']");
        var selectArea = document.querySelector(".mDiscountcodeSelect");
        var modifyArea = document.querySelector(".mDiscountcodeModify");
        var clearButton = document.querySelector("#ec_discountcode_clear");
        var resultVisible = Boolean(
            (modifyArea && modifyArea.offsetParent !== null) ||
            (clearButton && clearButton.offsetParent !== null)
        );
        var entryHidden = Boolean(
            !input || input.offsetParent === null ||
            (selectArea && selectArea.offsetParent === null)
        );
        return resultVisible && entryHidden;
    }

    function applyQuoteDiscountCode(context) {
        var code = String(context && context.discountCode || "").trim();
        if (!code) return Promise.resolve();
        var expectedTotal = Number(context.expected && context.expected.totalAmount || 0);

        return new Promise(function (resolve, reject) {
            var startedAt = Date.now();
            var submitted = false;
            function run() {
                if (
                    discountCodeAppliedUi() &&
                    visibleDiscountCodeAmount() > 0 &&
                    visibleOrderTotal() === expectedTotal
                ) {
                    resolve();
                    return;
                }
                if (Date.now() - startedAt >= DISCOUNT_APPLY_TIMEOUT_MS) {
                    reject(new QuoteOrderError(
                        "견적 할인코드를 Cafe24 주문서에 적용하지 못했습니다.",
                        "DISCOUNT_CODE_APPLY_FAILED"
                    ));
                    return;
                }
                var input = document.querySelector("input[name='ec_discountcode']");
                var button = document.querySelector("#ec_discountcode");
                if (
                    !submitted &&
                    input && button &&
                    input.offsetParent !== null && button.offsetParent !== null &&
                    Date.now() - startedAt >= 750
                ) {
                    submitted = true;
                    input.value = code;
                    input.dispatchEvent(new Event("input", { bubbles: true }));
                    input.dispatchEvent(new Event("change", { bubbles: true }));
                    button.click();
                }
                window.setTimeout(run, 100);
            }
            run();
        });
    }

    function waitForStableOrderTotal() {
        return new Promise(function (resolve, reject) {
            var startedAt = Date.now();
            var lastAmount = 0;
            var stableSince = 0;
            function run() {
                var now = Date.now();
                var amount = visibleOrderTotal();
                if (amount > 0 && amount !== lastAmount) {
                    lastAmount = amount;
                    stableSince = now;
                }
                if (
                    lastAmount > 0 &&
                    now - startedAt >= ORDER_TOTAL_MIN_WAIT_MS &&
                    now - stableSince >= ORDER_TOTAL_STABLE_MS
                ) {
                    resolve(lastAmount);
                    return;
                }
                if (now - startedAt >= ORDER_TOTAL_PREPARE_TIMEOUT_MS) {
                    reject(new QuoteOrderError(
                        "Cafe24 결제예정금액을 확인하지 못했습니다.",
                        "ORDER_TOTAL_NOT_READY"
                    ));
                    return;
                }
                window.setTimeout(run, 100);
            }
            run();
        });
    }

    function prepareQuoteDiscount(context) {
        return waitForStableOrderTotal().then(function (observedTotalAmount) {
            return fetch(BACKEND + "/api/quotes/" + encodeURIComponent(context.token) + "/order-discount", {
                method: "POST",
                mode: "cors",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    completionProof: context.completionProof || undefined,
                    observedTotalAmount: observedTotalAmount,
                    serviceAdjustmentAmount: context.serviceAdjustmentAmount || undefined,
                    serviceAdjustmentProof: context.serviceAdjustmentProof || undefined
                })
            });
        }).then(function (response) {
            return response.json().catch(function () { return {}; }).then(function (body) {
                if (!response.ok || !body.ok) {
                    throw new QuoteOrderError(
                        body && body.error && body.error.message || "견적 할인금액을 준비하지 못했습니다.",
                        body && body.error && body.error.code || "QUOTE_DISCOUNT_PREPARE_FAILED",
                        response.status
                    );
                }
                if (body.data && body.data.cartAdjustment) {
                    var attempts = Number(context.adjustmentAttempts || 0) + 1;
                    if (attempts > CART_ADJUSTMENT_RETRY_LIMIT) {
                        throw new QuoteOrderError(
                            "Cafe24 자동할인 보정을 반복했지만 견적금액을 확정하지 못했습니다.",
                            "QUOTE_CART_ADJUSTMENT_LIMIT"
                        );
                    }
                    context.serviceAdjustmentAmount = Number(body.data.cartAdjustment.amount || 0);
                    context.serviceAdjustmentProof = body.data.cartAdjustment.proof || null;
                    context.adjustmentAttempts = attempts;
                    context.orderFormHandoffAt = 0;
                    try {
                        window.sessionStorage.setItem(CONTEXT_KEY, JSON.stringify(context));
                    } catch {
                        throw new QuoteOrderError(
                            "견적 결제금액 보정 정보를 저장하지 못했습니다.",
                            "STORAGE_UNAVAILABLE"
                        );
                    }
                    window.location.replace(quoteAdjustmentBasketUrl(context.token));
                    return new Promise(function () {});
                }
                var preparedDiscountCode = String(body.data && body.data.discountCode || "").trim();
                if (preparedDiscountCode) context.discountCode = preparedDiscountCode;
                context.preparedDiscountAmount = Number(body.data && body.data.discountAmount || 0);
                try {
                    window.sessionStorage.setItem(CONTEXT_KEY, JSON.stringify(context));
                } catch {
                    throw new QuoteOrderError(
                        "견적 할인 정보를 저장하지 못했습니다.",
                        "STORAGE_UNAVAILABLE"
                    );
                }
                return context;
            });
        });
    }

    function enforceOrderForm(context) {
        var notice = banner(
            "Cafe24 기본할인과 견적 최종금액을 확인하고 있습니다.",
            false
        );
        var deliveryAddressRequired = Boolean(
            context.deliveryAddress &&
            !(context.expected && context.expected.shippingMethod === "pickup")
        );
        var state = {
            bank: false,
            total: false,
            address: !deliveryAddressRequired,
            amount: 0,
            pricingReady: false,
            pricingError: false
        };
        var deliveryRequestApplied = false;
        var deliveryAddressApplied = false;
        var directAddressTabRequested = false;
        function findShippingField(selectors) {
            var root = document.querySelector("#ec-jigsaw-area-shippingInfo") || document;
            for (var i = 0; i < selectors.length; i += 1) {
                var field = root.querySelector(selectors[i]);
                if (field && !field.disabled) return field;
            }
            return null;
        }
        function setShippingField(field, value) {
            if (!field) return;
            field.value = value;
            field.dispatchEvent(new Event("input", { bubbles: true }));
            field.dispatchEvent(new Event("change", { bubbles: true }));
        }
        function applyDeliveryAddress() {
            if (
                !context.deliveryAddress ||
                context.expected && context.expected.shippingMethod === "pickup"
            ) return;

            var directTab = document.getElementById("ec-jigsaw-tab-shippingInfo-newAddress");
            if (
                directTab &&
                !directTab.classList.contains("selected") &&
                directTab.offsetParent !== null
            ) {
                if (!directAddressTabRequested) {
                    var directLink = directTab.querySelector("a, button");
                    if (directLink) {
                        directAddressTabRequested = true;
                        directLink.click();
                        window.setTimeout(function () {
                            directAddressTabRequested = false;
                            verify();
                        }, 300);
                    }
                }
                return;
            }

            var postcode = findShippingField([
                "#rzipcode1",
                "#rzipcode",
                "input[name='rzipcode1']",
                "input[name='rzipcode']",
                "input[name='zipcode']",
                "input[fw-label*='배송지 우편번호']",
                "input[placeholder='우편번호']"
            ]);
            var address1 = findShippingField([
                "#raddr1",
                "input[name='raddr1']",
                "input[name='r_addr1']",
                "input[fw-label*='배송지 기본주소']",
                "input[placeholder='기본주소']"
            ]);
            var address2 = findShippingField([
                "#raddr2",
                "input[name='raddr2']",
                "input[name='r_addr2']",
                "input[fw-label*='배송지 나머지 주소']",
                "input[placeholder*='나머지 주소']"
            ]);
            if (!postcode || !address1) return;

            var expectedPostcode = String(context.deliveryAddress.postcode || "");
            var expectedAddress1 = String(context.deliveryAddress.address1 || "");
            var expectedAddress2 = String(context.deliveryAddress.address2 || "");
            if (postcode.value !== expectedPostcode) {
                setShippingField(postcode, expectedPostcode);
            }
            if (address1.value !== expectedAddress1) {
                setShippingField(address1, expectedAddress1);
            }
            if (address2 && address2.value !== expectedAddress2) {
                setShippingField(address2, expectedAddress2);
            }
            deliveryAddressApplied =
                postcode.value === expectedPostcode &&
                address1.value === expectedAddress1 &&
                (!address2 || address2.value === expectedAddress2);
        }
        function selectDirectDeliveryRequest() {
            var selects = document.querySelectorAll(
                "select#omessage, select[name='omessage'], select[name='rmessage'], select[id*='message'], select[name*='message']"
            );
            for (var i = 0; i < selects.length; i += 1) {
                var select = selects[i];
                var directOption = null;
                for (var optionIndex = 0; optionIndex < select.options.length; optionIndex += 1) {
                    var option = select.options[optionIndex];
                    var optionText = String(option.textContent || option.label || option.value || "")
                        .replace(/\s+/g, "");
                    if (optionText === "직접입력") {
                        directOption = option;
                        break;
                    }
                }
                if (!directOption) continue;
                if (select.value !== directOption.value) {
                    select.value = directOption.value;
                    select.dispatchEvent(new Event("input", { bubbles: true }));
                    select.dispatchEvent(new Event("change", { bubbles: true }));
                }
                return;
            }
        }
        function applyDeliveryRequestMessage() {
            if (deliveryRequestApplied || !context.deliveryRequestMessage) return;
            selectDirectDeliveryRequest();
            var input = document.querySelector("#omessage, textarea[name='omessage'], textarea[name='rmessage'], textarea[name*='message']");
            if (!input) return;
            input.value = context.deliveryRequestMessage;
            input.dispatchEvent(new Event("input", { bubbles: true }));
            input.dispatchEvent(new Event("change", { bubbles: true }));
            deliveryRequestApplied = true;
        }
        function hideTaxInvoiceNoneOption() {
            var controls = document.querySelectorAll("input[type='radio'], input[type='checkbox']");
            for (var i = 0; i < controls.length; i += 1) {
                var control = controls[i];
                var label = control.id ? document.querySelector("label[for='" + control.id + "']") : null;
                var holder = control.closest("label, li, .ec-base-label, tr, div");
                var text = String((label && label.textContent) || (holder && holder.textContent) || "")
                    .replace(/\s+/g, " ")
                    .trim();
                if (!/신청안함/.test(text)) continue;
                if (!/세금계산서|증빙|영수증|tax|cash/i.test(
                    [control.name, control.id, holder && holder.textContent].join(" ")
                )) continue;
                if (label) label.hidden = true;
                else if (holder && holder !== document.body) holder.hidden = true;
                control.hidden = true;
                control.checked = false;
                control.disabled = true;
            }
        }
        function setNotice(text, error) {
            var className = "ndQuoteOrderBanner" + (error ? " is-error" : "");
            if (notice.className !== className) notice.className = className;
            setBannerSemantics(notice, error);
            if (notice.textContent !== text) notice.textContent = text;
        }
        function verify() {
            hideRedundantNativeShippingRows(context.expected);
            ensureShippingPaymentSummary(context);
            applyDeliveryAddress();
            applyDeliveryRequestMessage();
            hideTaxInvoiceNoneOption();
            var bank = forceBankDeposit();
            var amount = visibleOrderTotal();
            state.bank = Boolean(bank);
            state.address = !deliveryAddressRequired || deliveryAddressApplied;
            state.amount = amount;
            state.total = state.pricingReady && amount > 0 && amount === Number(context.expected.totalAmount || 0);
            if (state.pricingError) return;
            if (!state.pricingReady) {
                setNotice("Cafe24 기본할인과 견적 최종금액을 확인하고 있습니다.", false);
                return;
            }
            if (!state.address) {
                setNotice("견적 요청 배송지를 주문서에 입력하고 있습니다. 잠시 후 다시 확인해주세요.", true);
                return;
            }
            if (!state.total && amount > 0) {
                setNotice("견적 최종금액 " + money(context.expected.totalAmount) +
                    "과 Cafe24 결제예정금액 " + money(amount) +
                    "이 일치하지 않아 결제를 차단했습니다. 견적 기준: 할인 후 상품 " +
                    money(context.expected.itemAmount) + " + 견적 배송·서비스비 " +
                    money(context.expected.serviceFeeAmount) + ".", true);
            } else if (state.total && !state.bank) {
                setNotice("견적 주문은 무통장 입금 결제수단을 직접 선택한 뒤 진행해주세요.", false);
            } else if (state.total && state.bank) {
                setNotice("견적 상품·최종금액 확인 완료. 결제수단은 무통장 입금만 가능합니다.", false);
            }
        }
        verify();
        var verifyQueued = false;
        var observer = new MutationObserver(function () {
            if (verifyQueued) return;
            verifyQueued = true;
            window.setTimeout(function () {
                verifyQueued = false;
                verify();
            }, 50);
        });
        observer.observe(document.body, { childList: true, subtree: true, characterData: true });
        var preparePricing = context.discountCode
            ? applyQuoteDiscountCode(context).catch(function () {
                return prepareQuoteDiscount(context).then(function () {
                    return applyQuoteDiscountCode(context);
                });
            })
            : prepareQuoteDiscount(context).then(function () {
                return applyQuoteDiscountCode(context);
            });
        preparePricing
            .then(function () {
                state.pricingReady = true;
                verify();
            }).catch(function (error) {
                state.pricingError = true;
                state.pricingReady = false;
                state.total = false;
                actionableBanner(
                    error.message || "견적 최종금액 확인에 실패했습니다.",
                    "견적 금액 다시 확인",
                    function () { window.location.reload(); },
                    true
                );
            });
        function guardOrderAttempt(event) {
            verify();
            if (!state.pricingReady || !state.address || !state.bank || !state.total) {
                event.preventDefault();
                event.stopImmediatePropagation();
                window.alert(
                    !state.pricingReady
                        ? "견적 최종금액 확인을 완료하지 못했습니다."
                        : (!state.address
                            ? "견적 요청 배송지를 주문서에 입력하지 못했습니다. 새로고침 후 다시 확인해주세요."
                            : !state.bank
                            ? "무통장 입금 결제수단을 확인하지 못했습니다."
                            : "견적 금액과 Cafe24 결제금액이 일치하지 않습니다.")
                );
            } else {
                try {
                    markOrderSubmitted(context);
                } catch (error) {
                    event.preventDefault();
                    event.stopImmediatePropagation();
                    actionableBanner(error.message, "견적서 확인", function () {
                        returnToQuote(context);
                    }, true);
                }
            }
        }
        document.addEventListener("click", function (event) {
            var target = event.target && event.target.closest
                ? event.target.closest("#ec-jigsaw-area-orderProduct .btnDelete, .xans-order-form .ec-base-prdInfo .btnDelete")
                : null;
            if (!target) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            window.alert("견적구매상품은 변경이 불가능합니다");
        }, true);
        document.addEventListener("click", function (event) {
            var target = event.target && event.target.closest ? event.target.closest("a, button, input[type='submit']") : null;
            if (!target || !/결제하기|주문하기/.test(target.textContent || target.value || "")) return;
            guardOrderAttempt(event);
        }, true);
        document.addEventListener("submit", function (event) {
            var submitter = event.submitter;
            var submitText = submitter ? String(submitter.textContent || submitter.value || "") : "";
            if (submitText && !/결제하기|주문하기/.test(submitText)) return;
            guardOrderAttempt(event);
        }, true);
        document.addEventListener("change", function (event) {
            var target = event.target;
            if (!target || !target.matches || !target.matches(PAYMENT_METHOD_SELECTOR)) return;
            scheduleBankDepositSync();
        }, true);
        document.addEventListener("click", function (event) {
            var target = event.target && event.target.closest
                ? event.target.closest(PAYMENT_METHOD_SELECTOR)
                : null;
            if (!target) return;
            scheduleBankDepositSync();
        }, true);
    }

    function connectResultOrder(context, attempt) {
        var orderId = resultOrderId();
        if (orderId) {
            completeQuoteOrder(context, orderId, 0);
            return;
        }
        if (attempt < 60) {
            window.setTimeout(function () { connectResultOrder(context, attempt + 1); }, 100);
            return;
        }
        actionableBanner(
            "Cafe24 주문번호를 확인하지 못해 견적 주문을 연결하지 못했습니다.",
            "주문번호 다시 확인",
            function () { connectResultOrder(context, 0); },
            true
        );
    }

    ready(function () {
        var path = window.location.pathname;
        var params = new URLSearchParams(window.location.search);
        if (/\/order\/basket\.html$/.test(path)) {
            var token = params.get("quote");
            var adjustmentToken = params.get("quote_adjust");
            var readyToken = params.get("quote_ready");
            if (token && TOKEN_RE.test(token)) startBasketQuote(token);
            else if (adjustmentToken && TOKEN_RE.test(adjustmentToken)) {
                var adjustmentContext = readContext();
                if (
                    !adjustmentContext ||
                    adjustmentContext.token !== adjustmentToken ||
                    !adjustmentContext.serviceAdjustmentAmount ||
                    !adjustmentContext.serviceAdjustmentProof
                ) {
                    actionableBanner(
                        "견적 결제금액 보정 정보가 만료되었습니다.",
                        "견적서로 돌아가기",
                        function () { window.location.href = quoteViewUrl(adjustmentToken); },
                        true
                    );
                } else {
                    startBasketQuote(adjustmentToken, adjustmentContext);
                }
            }
            else if (readyToken && TOKEN_RE.test(readyToken)) {
                var context = readContext();
                if (!context || context.token !== readyToken) actionableBanner(
                    "견적 주문 정보가 만료되었습니다. 견적서에서 다시 주문해주세요.",
                    "견적서로 돌아가기",
                    function () { window.location.href = quoteViewUrl(readyToken); },
                    true
                );
                else verifyReadyCart(context);
            } else {
                // A plain cart is an explicit return to normal shopping. Discard
                // any previous quote handoff so a later buy-now order form can
                // never inherit quote-only amount/payment guards.
                clearContext();
                document.addEventListener("click", guardNormalCartOrder, true);
                removeOrphanQuoteServiceItems();
            }
        } else if (/\/member\/login\.html$/.test(path)) {
            var guestContext = readContext();
            var guestHandoffAge = guestContext
                ? Date.now() - Number(guestContext.orderFormHandoffAt || 0)
                : Infinity;
            if (guestContext && guestHandoffAge >= 0 && guestHandoffAge <= ORDER_FORM_HANDOFF_MS) {
                continueGuestOrder(guestContext);
            }
        } else if (/\/order\/orderform\.html$/.test(path)) {
            var orderContext = readContext();
            if (claimOrderFormContext(orderContext)) {
                verifyOrderFormCart(orderContext);
            } else {
                enforceNativeCollectShippingFeeLabel();
                if (orderContext) {
                    var previouslyEntered = Boolean(orderContext.orderFormEnteredAt);
                    clearContext();
                    if (!previouslyEntered) {
                        actionableBanner(
                            "견적 주문 정보가 만료되어 결제를 진행할 수 없습니다.",
                            "견적서로 돌아가기",
                            function () { returnToQuote(orderContext); },
                            true
                        );
                    }
                }
            }
        } else if (/\/order\/order_result\.html$/.test(path)) {
            var resultContext = readContext();
            var submittedAge = resultContext ? Date.now() - Number(resultContext.orderSubmittedAt || 0) : Infinity;
            if (resultContext && submittedAge >= 0 && submittedAge <= ORDER_RESULT_LINK_MS) {
                connectResultOrder(resultContext, 0);
            } else if (resultContext) {
                clearContext();
                actionableBanner(
                    "주문 완료 후 견적 연결 가능 시간이 지나 자동 연결하지 못했습니다.",
                    "견적서 확인",
                    function () { returnToQuote(resultContext); },
                    true
                );
            }
        }
    });
})();
