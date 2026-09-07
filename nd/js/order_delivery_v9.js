(function () {
    "use strict";

    // v9 keeps Cafe24's delivery carrier selection while preserving the
    // prepaid/collect payment mode selected for the quote.
    if (window.__ndOrderDeliveryV9Loaded) return;
    window.__ndOrderDeliveryV9Loaded = true;

    var METHOD_KEY = "ndDeliveryMethod";
    var FEE_KEY = "ndDeliveryFee";
    var scheduled = null;

    function compact(value) {
        return String(value || "").replace(/\s+/g, "");
    }

    function storedValue(key) {
        try {
            return window.localStorage.getItem(key) || "";
        } catch (error) {
            return "";
        }
    }

    function methodState(value) {
        var text = compact(value);
        if (text.indexOf("택배") > -1 || text.indexOf("납품서비스") > -1) {
            return { kind: "parcel", payment: "prepaid", label: "택배배송(선불)" };
        }
        if (text.indexOf("방문수령") > -1 || text.indexOf("픽업") > -1) {
            return { kind: "pickup", payment: "none", label: "방문수령" };
        }
        if (text.indexOf("화물") > -1 || text.indexOf("착불") > -1) {
            var prepaid = text.indexOf("선불") > -1;
            return {
                kind: "freight",
                payment: prepaid ? "prepaid" : "cod",
                label: prepaid ? "화물배송(선불)" : "화물배송(착불)"
            };
        }
        return { kind: "", payment: "", label: "" };
    }

    function radioLabel(radio) {
        return radio && radio.id ? document.querySelector("label[for='" + radio.id + "']") : null;
    }

    function shippingRadios(order) {
        var radios = order.querySelectorAll("input[name='delivcompany']");
        return Array.prototype.map.call(radios, function (radio) {
            var label = radioLabel(radio);
            var state = methodState((label && label.textContent) || radio.value);
            return {
                radio: radio,
                label: label,
                holder: radio.closest ? (radio.closest(".ec-base-label") || radio.parentNode) : radio.parentNode,
                state: state
            };
        });
    }

    function selectedItem(items) {
        for (var i = 0; i < items.length; i += 1) {
            if (items[i].radio.checked) return items[i];
        }
        return null;
    }

    function lockSelectedMethod(order) {
        var items = shippingRadios(order);
        if (!items.length) return null;

        var requested = methodState(storedValue(METHOD_KEY));
        var target = null;
        for (var i = 0; i < items.length; i += 1) {
            if (requested.kind && items[i].state.kind === requested.kind) {
                target = items[i];
                break;
            }
        }

        if (target) {
            if (!target.radio.checked && typeof target.radio.click === "function") target.radio.click();
            for (var j = 0; j < items.length; j += 1) {
                if (items[j].holder && items[j].holder.style) {
                    items[j].holder.style.display = items[j] === target ? "" : "none";
                }
            }
        }

        target = target || selectedItem(items);
        if (!target) return null;
        var current = requested.kind === target.state.kind ? requested : target.state;
        if (!current.kind) current = { kind: target.state.kind, payment: "", label: "" };
        if (target.label && current.label && target.label.textContent !== current.label) {
            target.label.textContent = current.label;
        }
        return {
            kind: current.kind,
            payment: current.payment,
            label: current.label || (target.label && target.label.textContent) || ""
        };
    }

    function quoteServiceRow(node) {
        var row = node && node.closest
            ? node.closest(".ec-base-prdInfo, [class*='orderProduct'], [class*='productInfo']")
            : null;
        return Boolean(row && /견적.*(?:배송|납품|조립).*서비스/.test(compact(row.textContent)));
    }

    function rewriteZeroShippingFees(root, current) {
        if (!root || !current || current.kind !== "freight" || current.payment !== "cod") return;
        var nodes = root.querySelectorAll(
            "span, strong, em, b, td, dd, p, li, div, [class*='shipping'], [class*='delivery']"
        );
        Array.prototype.forEach.call(nodes, function (node) {
            if (node.querySelector && node.querySelector("input, select, textarea")) return;
            if (quoteServiceRow(node)) return;
            var text = compact(node.textContent);
            if (!text || text.length > 80) return;

            var shippingContext = node.closest
                ? node.closest("tr, li, dl, [class*='shipping'], [class*='delivery'], p, div")
                : null;
            var contextText = compact((shippingContext && shippingContext.textContent) || "");
            if (/(할인|적립|쿠폰|마일리지|포인트|예치금)/.test(contextText)) return;

            if (/^배송비(?:\(착불상품포함\))?:?0(?:원)?(?:\(무료\))?원?$/.test(text)) {
                node.textContent = "배송비 0 (착불 배송비 별도)원";
                return;
            }
            if (/^0(?:원)?(?:\(무료\))원?$/.test(text) && /배송비/.test(contextText)) {
                node.textContent = "0 (착불 배송비 별도)원";
            }
        });
    }

    function paidParcelFee(order) {
        var text = compact(order.textContent);
        var match = text.match(/배송비(?:\(선불\))?:?([1-9][0-9,]*)원/);
        return match ? match[1] + "원" : "";
    }

    function renderSummary(order, current) {
        if (!current) return;
        var target = order.querySelector(".rightGroup .stickyTop") || order.querySelector(".rightGroup");
        if (!target) return;

        var box = order.querySelector(".ndOrderShippingSummary");
        if (!box) {
            box = document.createElement("div");
            box.className = "ndOrderShippingSummary";
            target.insertBefore(box, target.firstChild);
        }

        var displayMethod = current.label;
        var fee = current.kind === "parcel"
            ? paidParcelFee(order)
            : (current.kind === "freight" && current.payment === "prepaid" ? storedValue(FEE_KEY) : "");
        var signature = displayMethod + "|" + fee;
        if (box.getAttribute("data-nd-signature") === signature) return;
        box.setAttribute("data-nd-signature", signature);
        box.textContent = "";

        var title = document.createElement("strong");
        title.className = "ndOrderShippingSummary__title";
        title.textContent = "배송";
        box.appendChild(title);

        function appendRow(label, value) {
            var row = document.createElement("div");
            row.className = "ndOrderShippingSummary__row";
            var left = document.createElement("span");
            var right = document.createElement("span");
            left.textContent = label;
            right.textContent = value;
            row.appendChild(left);
            row.appendChild(right);
            box.appendChild(row);
        }

        appendRow("배송조건", displayMethod);
        if (fee) appendRow("배송비(선불)", fee);
    }

    function setText(node, value) {
        if (node && node.textContent !== value) node.textContent = value;
    }

    function renderFreightNotice(order, current) {
        if (!current || current.kind !== "freight") return;
        var fee = order.querySelector("#deliv_company_price_custom_type");
        var info = order.querySelector("#deliv_company_shipping_info");
        if (current.payment === "prepaid") {
            setText(fee, "선불 (견적금액 포함)");
            setText(info, "배송비는 견적금액에 포함되어 있습니다.");
            return;
        }
        setText(fee, "착불 (배송비 별도)");
        setText(
            info,
            "현재 결제금액에는 배송비가 포함되어 있지 않습니다. 배송비 및 배송일정은 지역, 수량, 배송 상황에 따라 달라질 수 있으며, 주문 후 해피콜을 통해 별도 안내해 드립니다."
        );
    }

    function sync() {
        var order = document.getElementById("mCafe24Order");
        if (!order) return;
        var current = lockSelectedMethod(order);
        rewriteZeroShippingFees(order, current);
        renderSummary(order, current);
        renderFreightNotice(order, current);
    }

    function scheduleSync() {
        window.clearTimeout(scheduled);
        scheduled = window.setTimeout(sync, 80);
    }

    function boot() {
        sync();
        document.addEventListener("change", function (event) {
            if (event.target && event.target.matches && event.target.matches("input[name='delivcompany']")) {
                scheduleSync();
            }
        });
        var order = document.getElementById("mCafe24Order");
        if (window.MutationObserver && order) {
            new MutationObserver(scheduleSync).observe(order, {
                childList: true,
                characterData: true,
                subtree: true
            });
        }
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();
})();
