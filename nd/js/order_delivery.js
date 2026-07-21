(function(){
    function storageGet(key, fallback){
        try {
            return localStorage.getItem(key) || fallback;
        } catch(e) {
            return fallback;
        }
    }

    function detectMethod(text){
        text = text || "";
        if(text.indexOf("스토어픽업") > -1 || text.indexOf("스토어 픽업") > -1 || text.indexOf("매장픽업") > -1 || text.indexOf("매장 픽업") > -1) return { method: "직접픽업", fee: "0원" };
        if(text.indexOf("선불 택배") > -1 || text.indexOf("택배 선불") > -1) return { method: "택배(선불)", fee: "주문서 확인" };
        if(text.indexOf("착불 화물") > -1 || text.indexOf("화물 착불") > -1) return { method: "화물(착불)", fee: "착불" };
        if(text.indexOf("택배(선불)") > -1) return { method: "택배(선불)", fee: "주문서 확인" };
        if(text.indexOf("직접픽업") > -1) return { method: "직접픽업", fee: "0원" };
        if(text.indexOf("화물(착불)") > -1) return { method: "화물(착불)", fee: "착불" };
        return {
            method: storageGet("ndDeliveryMethod", "화물(착불)"),
            fee: storageGet("ndDeliveryFee", "착불")
        };
    }

    function trimText(value){
        return (value || "").replace(/\s+/g, " ").trim();
    }

    function getMethodAliases(method){
        if(method === "직접픽업"){
            return ["직접픽업", "직접 픽업", "스토어픽업", "스토어 픽업", "매장픽업", "매장 픽업"];
        }
        if(method === "택배(선불)"){
            return ["택배(선불)", "택배 선불", "선불 택배", "선불"];
        }
        return ["화물(착불)", "화물 착불", "착불 화물", "착불"];
    }

    function textMatchesMethod(text, method){
        var clean = trimText(text);
        var aliases = getMethodAliases(method);
        for(var i = 0; i < aliases.length; i += 1){
            if(clean.indexOf(aliases[i]) > -1) return true;
        }
        return false;
    }

    function triggerChange(field){
        var event;
        if(typeof Event === "function"){
            event = new Event("change", { bubbles: true });
        } else {
            event = document.createEvent("Event");
            event.initEvent("change", true, true);
        }
        field.dispatchEvent(event);
    }

    function isShippingField(field){
        var scope = field.closest ? field.closest("tr, li, dl, .ec-base-table, .ec-base-fold, .deliveryArea, .shippingArea") : null;
        var text = trimText(((scope && scope.textContent) || "") + " " + (field.name || "") + " " + (field.id || ""));
        return /배송|수령|픽업|화물|택배|착불|선불|shipping|delivery|pickup/i.test(text);
    }

    function enhanceBasket(){
        var packageEl = document.querySelector(".xans-order-basketpackage");
        if(!packageEl) return;

        packageEl.querySelectorAll(".ec-base-prdInfo").forEach(function(item){
            if(item.querySelector(".ndSelectedShipping")) return;
            var detected = detectMethod(item.textContent);
            var info = item.querySelector(".description .info");
            if(!info) return;
            var shippingLi = Array.prototype.filter.call(info.querySelectorAll("li"), function(li){
                return li.textContent.indexOf("배송") > -1;
            })[0];
            var li = document.createElement("li");
            li.className = "ndSelectedShipping";
            li.innerHTML = "배송조건 : <strong>" + detected.method + "</strong> <span>(" + detected.fee + ")</span>";
            if(shippingLi && shippingLi.nextSibling){
                info.insertBefore(li, shippingLi.nextSibling);
            } else {
                info.appendChild(li);
            }
        });

        packageEl.querySelectorAll(".totalSummary").forEach(function(summary){
            if(summary.querySelector(".ndTotalShippingMethod")) return;
            var detected = detectMethod(packageEl.textContent);
            var shippingItem = Array.prototype.filter.call(summary.querySelectorAll(".totalSummary__item"), function(item){
                return item.textContent.indexOf("총 배송비") > -1;
            })[0];
            var actualFee = shippingItem ? trimText((shippingItem.querySelector(".data") || shippingItem).textContent) : detected.fee;
            var box = document.createElement("div");
            box.className = "ndTotalShippingMethod";
            box.innerHTML = '<div class="item"><h5 class="title">선택 배송조건</h5><div class="data">' + detected.method + '</div></div>' +
                            '<div class="item"><h5 class="title">배송비 표기</h5><div class="data">' + actualFee + '</div></div>';
            if(shippingItem && shippingItem.parentNode){
                shippingItem.parentNode.insertBefore(box, shippingItem.nextSibling);
            } else {
                summary.appendChild(box);
            }
        });
    }

    function selectedShippingFromForm(){
        var fields = Array.prototype.slice.call(document.querySelectorAll("select, input[type='radio']:checked"));
        for(var i = 0; i < fields.length; i += 1){
            var field = fields[i];
            var text = "";
            if(field.tagName === "SELECT"){
                text = field.options[field.selectedIndex] ? field.options[field.selectedIndex].text : "";
            } else {
                var label = field.closest("label");
                text = label ? label.textContent : field.value;
            }
            var detected = detectMethod(text);
            if(textMatchesMethod(text, detected.method)) return detected;
        }
        return detectMethod(document.body.textContent);
    }

    function enhanceOrderForm(){
        var order = document.getElementById("mCafe24Order");
        if(!order) return false;
        var target = order.querySelector(".rightGroup .stickyTop") || order.querySelector(".rightGroup");
        if(!target) return false;

        if(order.getAttribute("data-nd-order-shipping-enhanced") === "1"){
            return true;
        }
        order.setAttribute("data-nd-order-shipping-enhanced", "1");

        var box = order.querySelector(".ndOrderShippingSummary");
        if(!box){
            box = document.createElement("div");
            box.className = "ndOrderShippingSummary";
            target.insertBefore(box, target.firstChild);
        }

        function render(){
            var detected = selectedShippingFromForm();
            var paymentText = trimText((order.querySelector(".rightGroup") || order).textContent);
            var feeMatch = paymentText.match(/배송비\s*([0-9,]+원|무료|착불)/);
            var fee = feeMatch ? feeMatch[1] : detected.fee;
            var html = '<strong class="ndOrderShippingSummary__title">배송비</strong>' +
                '<div class="ndOrderShippingSummary__row"><span>배송조건</span><span>' + detected.method + '</span></div>' +
                '<div class="ndOrderShippingSummary__row"><span>배송비 표기</span><span>' + fee + '</span></div>';
            if(box.innerHTML !== html){
                box.innerHTML = html;
            }
        }

        function applyStoredShipping(){
            var saved = detectMethod("");
            var applied = false;

            Array.prototype.forEach.call(order.querySelectorAll("select"), function(select){
                if(applied) return;
                if(!isShippingField(select)) return;
                for(var i = 0; i < select.options.length; i += 1){
                    var option = select.options[i];
                    if(textMatchesMethod(option.text, saved.method)){
                        select.selectedIndex = i;
                        triggerChange(select);
                        applied = true;
                        break;
                    }
                }
            });

            if(applied) return true;

            Array.prototype.forEach.call(order.querySelectorAll("input[type='radio']"), function(radio){
                if(applied) return;
                if(!isShippingField(radio)) return;
                var label = radio.closest ? radio.closest("label") : null;
                var text = (label ? label.textContent : "") + " " + (radio.value || "");
                if(textMatchesMethod(text, saved.method)){
                    if(!radio.checked && typeof radio.click === "function"){
                        radio.click();
                    } else {
                        radio.checked = true;
                        triggerChange(radio);
                    }
                    applied = true;
                }
            });

            return applied;
        }

        function sync(){
            var applied = applyStoredShipping();
            render();
            return applied;
        }

        sync();
        var attempts = 0;
        var retryTimer = window.setInterval(function(){
            attempts += 1;
            if(sync() || attempts >= 20){
                window.clearInterval(retryTimer);
            }
        }, 300);

        if(window.MutationObserver){
            var debounceTimer = null;
            new MutationObserver(function(){
                window.clearTimeout(debounceTimer);
                debounceTimer = window.setTimeout(sync, 120);
            }).observe(order, {
                childList: true,
                subtree: true
            });
        }

        render();
        order.addEventListener("change", function(event){
            var target = event.target;
            if(target && (target.tagName === "SELECT" || target.type === "radio")){
                window.setTimeout(render, 80);
            }
        });
        return true;
    }

    function boot(){
        enhanceBasket();
        var attempts = 0;
        var bootTimer = window.setInterval(function(){
            attempts += 1;
            if(enhanceOrderForm() || attempts >= 20){
                window.clearInterval(bootTimer);
            }
        }, 250);
    }

    if(document.readyState === "loading"){
        document.addEventListener("DOMContentLoaded", boot);
    } else {
        boot();
    }
})();
