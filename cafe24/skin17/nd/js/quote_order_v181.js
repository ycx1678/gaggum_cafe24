(function () {
    "use strict";

    var BACKEND = "https://gaggum.flashstudio.kr";
    var CONTEXT_KEY = "gaggum_quote_order_context_v177";
    var TOKEN_RE = /^[A-Za-z0-9]{24}$/;
    var ORDER_FORM_HANDOFF_MS = 3600000;
    var ORDER_RESULT_LINK_MS = 600000;
    var COMPLETE_RETRY_LIMIT = 5;
    var DELIVERY_METHOD_KEY = "ndDeliveryMethod";
    var DELIVERY_FEE_KEY = "ndDeliveryFee";

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

    function apiCall(method, args) {
        return new Promise(function (resolve, reject) {
            var sdk = api();
            if (!sdk || typeof sdk[method] !== "function") {
                reject(new Error("Cafe24 주문 기능을 불러오지 못했습니다."));
                return;
            }
            var timer = window.setTimeout(function () {
                reject(new Error("Cafe24 응답 시간이 초과되었습니다."));
            }, 15000);
            sdk[method].apply(sdk, args.concat(function (err, response) {
                window.clearTimeout(timer);
                if (err) {
                    var message = response && response.error && response.error.message;
                    reject(new Error(message || "Cafe24 주문 처리에 실패했습니다."));
                    return;
                }
                resolve(response || {});
            }));
        });
    }

    function getMemberId() {
        return new Promise(function (resolve) {
            var sdk = api();
            if (!sdk || typeof sdk.getMemberID !== "function") {
                resolve(null);
                return;
            }
            var finished = false;
            var timer = window.setTimeout(function () {
                if (finished) return;
                finished = true;
                resolve(null);
            }, 3000);
            sdk.getMemberID(function (memberId) {
                if (finished) return;
                finished = true;
                window.clearTimeout(timer);
                resolve(typeof memberId === "string" && memberId ? memberId : null);
            });
        });
    }

    function panel() {
        var wrap = document.createElement("div");
        wrap.className = "ndQuoteOrderPanel";
        wrap.innerHTML =
            '<div class="ndQuoteOrderPanelInner" role="dialog" aria-modal="true" aria-labelledby="ndQuoteOrderTitle">' +
            '<h2 id="ndQuoteOrderTitle">견적 상품으로 주문하기</h2>' +
            '<p>견적서와 동일한 상품 구성을 보장하기 위해 현재 국내배송 장바구니를 비운 뒤 견적 상품으로 다시 구성합니다.</p>' +
            '<p class="ndQuoteOrderStatus" role="status"></p>' +
            '<div class="ndQuoteOrderActions">' +
            '<button type="button" data-quote-cancel>취소</button>' +
            '<button type="button" class="is-primary" data-quote-start>계속</button>' +
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

    function fetchPayload(token, memberId) {
        return fetch(BACKEND + "/api/quotes/" + encodeURIComponent(token) + "/order-payload", {
            method: "POST",
            mode: "cors",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ memberId: memberId })
        }).then(function (response) {
            return response.json().catch(function () { return {}; }).then(function (body) {
                if (!response.ok || !body.ok) {
                    throw new Error(body && body.error && body.error.message || "견적 주문 정보를 불러오지 못했습니다.");
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

    function addItems(payload) {
        var groups = chunk(payload.items, 10);
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
            var variantCode = String((fromCart ? item.variant_code : item.variants_code) || "");
            var quantity = Number(item.quantity || 0);
            var key = productNo + ":" + variantCode;
            if (!productNo || !variantCode || quantity < 1) return;
            grouped[key] = (grouped[key] || 0) + quantity;
        });
        return Object.keys(grouped).sort().map(function (key) {
            var separator = key.indexOf(":");
            return {
                productNo: Number(key.slice(0, separator)),
                variantCode: key.slice(separator + 1),
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
                left[i].quantity !== right[i].quantity) return false;
        }
        return true;
    }

    function quoteDeliveryMethod(shippingMethod) {
        if (shippingMethod === "pickup") return "방문수령";
        if (shippingMethod === "delivery_svc") return "택배배송(선불)";
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
            var method = quoteDeliveryMethod(expected && expected.shippingMethod);
            var fee = Number(expected && expected.totalAmount || 0) -
                Number(expected && expected.subtotal || 0) +
                Number(expected && expected.discountTotal || 0);
            window.localStorage.setItem(DELIVERY_METHOD_KEY, method);
            window.localStorage.setItem(
                DELIVERY_FEE_KEY,
                method === "화물배송(착불)" ? "착불" : (fee > 0 ? money(fee) : "")
            );
            state.applied = true;
        } catch (error) {
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
        } catch (error) {
            // The order context can still be cleared when storage is unavailable.
        }
    }

    function storeContext(token, payload) {
        clearContext();
        var shippingState = applyQuoteShipping(payload.expected || {});
        window.sessionStorage.setItem(CONTEXT_KEY, JSON.stringify({
            token: token,
            quoteNo: payload.quoteNo,
            items: payload.items,
            expected: payload.expected,
            quoteDeliveryApplied: shippingState.applied,
            previousDeliveryMethod: shippingState.previousMethod,
            previousDeliveryFee: shippingState.previousFee,
            createdAt: Date.now(),
            orderFormHandoffAt: 0,
            orderSubmittedAt: 0
        }));
    }

    function clearContext() {
        try {
            restoreQuoteShipping(JSON.parse(window.sessionStorage.getItem(CONTEXT_KEY) || "null"));
        } catch (error) {
            // Invalid legacy context is discarded below.
        }
        window.sessionStorage.removeItem(CONTEXT_KEY);
    }

    function markOrderFormHandoff(context) {
        context.orderFormHandoffAt = Date.now();
        window.sessionStorage.setItem(CONTEXT_KEY, JSON.stringify(context));
    }

    function markOrderSubmitted(context) {
        context.orderSubmittedAt = Date.now();
        window.sessionStorage.setItem(CONTEXT_KEY, JSON.stringify(context));
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
        } catch (error) {
            return null;
        }
    }

    function banner(text, error) {
        var current = document.querySelector(".ndQuoteOrderBanner");
        if (!current) {
            current = document.createElement("div");
            document.body.insertBefore(current, document.body.firstChild);
        }
        current.className = "ndQuoteOrderBanner" + (error ? " is-error" : "");
        current.textContent = text;
        return current;
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
            var root = banner(message + " 견적 주문 연결 버튼을 눌러 다시 확인해주세요.", true);
            var button = document.createElement("button");
            button.type = "button";
            button.textContent = "견적 주문 연결 다시 확인";
            button.addEventListener("click", function () {
                button.disabled = true;
                completeQuoteOrder(context, orderId, 0);
            });
            root.appendChild(document.createElement("br"));
            root.appendChild(button);
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
            body: JSON.stringify({ orderId: orderId })
        }).then(function (response) {
            return response.json().catch(function () { return {}; }).then(function (body) {
                if (!response.ok || !body.ok) {
                    var message = body && body.error && body.error.message || "견적 주문 연결에 실패했습니다.";
                    if (response.status === 404 || response.status === 502) {
                        retryComplete(context, orderId, attempt, message);
                        return;
                    }
                    if (response.status === 400 || response.status === 403 || response.status === 409) {
                        clearContext();
                    }
                    banner(message, true);
                    return;
                }
                clearContext();
                var linked = banner(
                    "대량견적 주문 연결이 완료되었습니다. 견적번호 " + (body.data.quoteNo || context.quoteNo || "-") +
                    ", Cafe24 주문번호 " + orderId,
                    false
                );
                if (!body.data.labelApplied) {
                    linked.className = "ndQuoteOrderBanner is-warning";
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
            if (button && window.Basket && typeof window.Basket.orderAll === "function") {
                var context = readContext();
                if (!context) {
                    banner("견적 주문 정보가 만료되었습니다. 견적서에서 다시 주문해주세요.", true);
                    return;
                }
                markOrderFormHandoff(context);
                window.Basket.orderAll(button);
                return;
            }
            if (attempts < 60) window.setTimeout(run, 100);
            else banner("Cafe24 주문 버튼을 찾지 못했습니다. 페이지를 새로고침한 뒤 전체상품주문을 눌러주세요.", true);
        }
        run();
    }

    function verifyReadyCart(context) {
        banner("견적 상품 구성을 확인하고 있습니다.", false);
        apiCall("getCartList", []).then(function (response) {
            var carts = response && response.carts || [];
            if (!sameItems(context.items, carts)) {
                clearContext();
                throw new Error("장바구니 상품 구성이 견적서와 일치하지 않아 주문서 이동을 중단했습니다.");
            }
            banner("견적 상품 구성이 확인되었습니다. Cafe24 주문서로 이동합니다.", false);
            window.setTimeout(orderAll, 500);
        }).catch(function (error) {
            banner(error.message || "장바구니 검증에 실패했습니다.", true);
        });
    }

    function startBasketQuote(token) {
        var root = panel();
        var cancel = root.querySelector("[data-quote-cancel]");
        var start = root.querySelector("[data-quote-start]");
        cancel.addEventListener("click", function () {
            clearContext();
            window.location.replace(window.location.pathname);
        });
        start.addEventListener("click", function () {
            cancel.disabled = true;
            start.disabled = true;
            setStatus(root, "견적 주문 정보를 확인하고 있습니다.", false);
            getMemberId()
                .then(function (memberId) { return fetchPayload(token, memberId); })
                .then(function (payload) {
                    setStatus(root, "기존 국내배송 장바구니를 정리하고 있습니다.", false);
                    return apiCall("emptyCart", ["A"]).then(function () { return payload; });
                })
                .then(function (payload) {
                    setStatus(root, "견적 상품을 장바구니에 담고 있습니다.", false);
                    return addItems(payload).then(function () { return payload; });
                })
                .then(function (payload) {
                    storeContext(token, payload);
                    window.location.replace(window.location.pathname + "?quote_ready=" + encodeURIComponent(token));
                })
                .catch(function (error) {
                    cancel.disabled = false;
                    start.disabled = false;
                    setStatus(root, error.message || "견적 주문 준비에 실패했습니다.", true);
                });
        });
    }

    function parseMoney(text) {
        var value = parseInt(String(text || "").replace(/[^0-9]/g, ""), 10);
        return value > 0 ? value : 0;
    }

    function paymentText(input) {
        var label = input.id ? document.querySelector("label[for='" + input.id + "']") : null;
        var holder = input.closest("li, label, .ec-base-label, .payMethod, .method");
        return String((label && label.textContent) || (holder && holder.textContent) || input.value || "").trim();
    }

    function forceBankDeposit() {
        var roots = document.querySelectorAll("#ec-jigsaw-area-paymethod, [id*='paymethod']");
        var inputs = document.querySelectorAll("input[type='radio'][name*='paymethod'], input[type='radio'][id*='paymethod']");
        var bankInput = null;
        for (var i = 0; i < inputs.length; i += 1) {
            var text = paymentText(inputs[i]);
            var isBank = /무통장|bank|cash/i.test(text + " " + inputs[i].id + " " + inputs[i].value);
            var holder = inputs[i].closest("li, label, .ec-base-label");
            if (isBank && !bankInput) bankInput = inputs[i];
            else if (!isBank && holder) holder.classList.add("ndQuoteOrderPaymentBlocked");
        }
        if (bankInput && !bankInput.checked) bankInput.click();
        for (var j = 0; j < roots.length; j += 1) roots[j].setAttribute("data-quote-bank-only", "true");
        return bankInput;
    }

    function visibleOrderTotal() {
        var selectors = [
            "#payment_total_order_sale_price_view",
            "#total_order_sale_price_view",
            "#total_order_price_view",
            "#payment_total_order_price",
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

    function enforceOrderForm(context) {
        var notice = banner("견적 주문: 무통장 입금만 가능합니다. 최종 결제금액을 확인하고 있습니다.", false);
        var state = { bank: false, total: false, amount: 0 };
        function setNotice(text, error) {
            var className = "ndQuoteOrderBanner" + (error ? " is-error" : "");
            if (notice.className !== className) notice.className = className;
            if (notice.textContent !== text) notice.textContent = text;
        }
        function verify() {
            var bank = forceBankDeposit();
            var amount = visibleOrderTotal();
            state.bank = Boolean(bank && bank.checked);
            state.amount = amount;
            state.total = amount > 0 && amount === Number(context.expected.totalAmount || 0);
            if (!state.total && amount > 0) {
                setNotice("견적 최종금액 " + money(context.expected.totalAmount) +
                    "과 Cafe24 결제예정금액 " + money(amount) +
                    "이 일치하지 않아 결제를 차단했습니다.", true);
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
        document.addEventListener("click", function (event) {
            var target = event.target && event.target.closest ? event.target.closest("a, button, input[type='submit']") : null;
            if (!target || !/결제하기|주문하기/.test(target.textContent || target.value || "")) return;
            verify();
            if (!state.bank || !state.total) {
                event.preventDefault();
                event.stopImmediatePropagation();
                window.alert(!state.bank ? "무통장 입금 결제수단을 확인하지 못했습니다." : "견적 금액과 Cafe24 결제금액이 일치하지 않습니다.");
            } else {
                markOrderSubmitted(context);
            }
        }, true);
    }

    ready(function () {
        var path = window.location.pathname;
        var params = new URLSearchParams(window.location.search);
        if (/\/order\/basket\.html$/.test(path)) {
            var token = params.get("quote");
            var readyToken = params.get("quote_ready");
            if (token && TOKEN_RE.test(token)) startBasketQuote(token);
            else if (readyToken && TOKEN_RE.test(readyToken)) {
                var context = readContext();
                if (!context || context.token !== readyToken) banner("견적 주문 정보가 만료되었습니다. 견적서에서 다시 주문해주세요.", true);
                else verifyReadyCart(context);
            }
        } else if (/\/order\/orderform\.html$/.test(path)) {
            var orderContext = readContext();
            var handoffAge = orderContext ? Date.now() - Number(orderContext.orderFormHandoffAt || 0) : Infinity;
            if (orderContext && handoffAge >= 0 && handoffAge <= ORDER_FORM_HANDOFF_MS) {
                enforceOrderForm(orderContext);
            } else if (orderContext) {
                clearContext();
            }
        } else if (/\/order\/order_result\.html$/.test(path)) {
            var resultContext = readContext();
            var submittedAge = resultContext ? Date.now() - Number(resultContext.orderSubmittedAt || 0) : Infinity;
            if (resultContext && submittedAge >= 0 && submittedAge <= ORDER_RESULT_LINK_MS) {
                var orderId = resultOrderId();
                if (orderId) completeQuoteOrder(resultContext, orderId, 0);
                else banner("Cafe24 주문번호를 확인하지 못해 견적 주문을 연결하지 못했습니다.", true);
            } else if (resultContext) {
                clearContext();
            }
        }
    });
})();
