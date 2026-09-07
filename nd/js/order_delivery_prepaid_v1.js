(function () {
    "use strict";

    // Cafe24's product shipping configuration is collect-only, even when a
    // quote has already charged freight through a prepaid service product.
    // Preserve Cafe24's DOM and form values while hiding only collect-only
    // display metadata for an active prepaid freight quote.
    if (window.__ndOrderDeliveryPrepaidV1Loaded) return;
    window.__ndOrderDeliveryPrepaidV1Loaded = true;

    function compact(value) {
        return String(value || "").replace(/\s+/g, "");
    }

    function storedMethod() {
        try {
            return window.localStorage.getItem("ndDeliveryMethod") || "";
        } catch (error) {
            return "";
        }
    }

    function isPrepaidFreightQuote(root) {
        var method = compact(storedMethod());
        if (method.indexOf("화물") < 0 || method.indexOf("선불") < 0) return false;
        return /견적.*(?:배송|납품|조립).*서비스/.test(compact(root.textContent));
    }

    function hide(node) {
        if (node && node.style.display !== "none") node.style.display = "none";
    }

    function cleanBasket() {
        var root = document.querySelector(".xans-order-basketpackage");
        if (!root || !isPrepaidFreightQuote(root)) return;

        Array.prototype.forEach.call(
            root.querySelectorAll(".ec-base-prdInfo .description .info > li"),
            function (node) {
                if (node.classList.contains("ndSelectedShipping")) return;
                if (/^배송:/.test(compact(node.textContent))) hide(node);
            }
        );

        Array.prototype.forEach.call(root.querySelectorAll("strong[id$='_ship_fee']"), function (node) {
            if (/^0(?:원)?\(착불배송비별도\)(?:원)?$/.test(compact(node.textContent))) {
                node.textContent = "0원";
            }
        });

        Array.prototype.forEach.call(
            root.querySelectorAll(".totalSummary .ec-base-help, .totalSummary p"),
            function (node) {
                if (/^착불상품이포함되어있습니다[.]?$/.test(compact(node.textContent))) hide(node);
            }
        );
    }

    function cleanOrderForm() {
        var root = document.getElementById("mCafe24Order");
        if (!root || !isPrepaidFreightQuote(root)) return;
        Array.prototype.forEach.call(
            root.querySelectorAll(".ec-base-table th > span.info"),
            function (node) {
                if (/^\(?착불상품포함\)?$/.test(compact(node.textContent))) hide(node);
            }
        );
    }

    function clean() {
        cleanBasket();
        cleanOrderForm();
    }

    function boot() {
        clean();
        var root = document.querySelector(".xans-order-basketpackage") || document.getElementById("mCafe24Order");
        if (window.MutationObserver && root) {
            new MutationObserver(clean).observe(root, {
                childList: true,
                characterData: true,
                subtree: true
            });
        }
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();
})();
