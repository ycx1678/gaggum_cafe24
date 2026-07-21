(function(){
    /* =====================================================================
     * order_delivery_v3 (2026-06-10) — 배송방법별 표기 체계 (피드백 슬라이드 5·6·7)
     *  - 화물배송(착불): 금액 0원으로 표시되는 부분 모두 제거(착불로 대체), 방법명만 출력
     *  - 택배배송(선불): 카페24가 계산한 개당배송비×수량 금액을 그대로 출력(선불)
     *  - 방문수령     : "방문수령" 텍스트만, 배송비 금액 표기 제거
     * 원칙: 전부 "표시 전용". input/select/제출값/카페24 청구 로직은 절대 건드리지 않는다.
     *       DOM 삽입은 createElement/textContent만 사용(innerHTML 미사용).
     * ===================================================================== */

    function storageGet(key, fallback){
        try {
            return localStorage.getItem(key) || fallback;
        } catch(e) {
            return fallback;
        }
    }

    // 구(舊) 라벨 → 현행 라벨 정규화 (라이브 detail.html 라벨 기준)
    function normalizeMethod(name){
        name = (name || "").replace(/\s+/g, "");
        if(!name) return "";
        if(name.indexOf("택배") > -1) return "택배배송(선불)";
        if(name.indexOf("방문수령") > -1 || name.indexOf("픽업") > -1) return "방문수령";
        if(name.indexOf("화물") > -1 || name.indexOf("착불") > -1) return "화물배송(착불)";
        return "";
    }

    // 표시 규칙 분기용: parcel(택배/선불) · pickup(방문수령) · freight(화물/착불)
    function methodKind(method){
        if((method || "").indexOf("택배") > -1) return "parcel";
        if((method || "").indexOf("방문수령") > -1 || (method || "").indexOf("픽업") > -1) return "pickup";
        return "freight";
    }

    function detectMethod(text){
        text = text || "";
        // 고객이 상세에서 선택한 배송방법(localStorage) 최우선 — 상품설명 텍스트 오인식 방지
        var ndStored = normalizeMethod(storageGet("ndDeliveryMethod", ""));
        if(ndStored){
            return { method: ndStored, fee: storageGet("ndDeliveryFee", "") };
        }
        var byText = normalizeMethod(
            (text.match(/택배\s*배송\s*\(선불\)|택배\s*\(선불\)|선불\s*택배|택배\s*선불/) ||
             text.match(/방문\s*수령|직접\s*픽업|스토어\s*픽업|매장\s*픽업/) ||
             text.match(/화물\s*배송\s*\(착불\)|화물\s*\(착불\)|착불\s*화물|화물\s*착불/) || [""])[0]
        );
        if(byText){
            return { method: byText, fee: byText === "화물배송(착불)" ? "착불" : "" };
        }
        return { method: "화물배송(착불)", fee: "착불" };
    }

    function trimText(value){
        return (value || "").replace(/\s+/g, " ").trim();
    }

    // 장바구니/주문서 항목의 카페24 계산 배송비("배송 : N원") 파싱 — 스킨은 계산하지 않고 카페24 값을 그대로 사용
    function ndItemFeeText(scope){
        var m = ((scope && scope.textContent) || "").match(/배송\s*:\s*([0-9,]+)\s*원/);
        return m ? m[1] : "";
    }

    function getMethodAliases(method){
        var kind = methodKind(method);
        if(kind === "pickup"){
            return ["방문수령", "방문 수령", "직접픽업", "직접 픽업", "스토어픽업", "스토어 픽업", "매장픽업", "매장 픽업"];
        }
        if(kind === "parcel"){
            return ["택배배송(선불)", "택배(선불)", "택배 선불", "선불 택배", "택배", "선불"];
        }
        return ["화물배송(착불)", "화물(착불)", "화물 착불", "착불 화물", "화물", "착불"];
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

    // DOM 헬퍼 — innerHTML 대신 안전한 생성만 사용
    function el(tag, className, text){
        var node = document.createElement(tag);
        if(className) node.className = className;
        if(text != null) node.textContent = text;
        return node;
    }

    /* ---------------------------------------------------------------
     * "0원" 표기 제거 (표시 전용)
     *  - 배송비 문맥의 잎(leaf) 요소에서 "0원"을 방법별 문구로 대체
     *  - 할인/적립/쿠폰 등 다른 0원에는 손대지 않도록 문맥 가드
     *  - 폼 요소(input/select/...)는 절대 건드리지 않음
     * --------------------------------------------------------------- */
    function ndCleanZeroFee(rootEl, kind){
        if(!rootEl || kind === "parcel") return; // 택배(선불)는 금액을 그대로 보여준다
        var replacement = kind === "pickup" ? "방문수령" : "착불";
        var nodes = rootEl.querySelectorAll("span, strong, em, b, td, dd, p, li, div, a");
        Array.prototype.forEach.call(nodes, function(node){
            if(node.children.length > 0) return;                      // 잎 요소만
            var t = trimText(node.textContent);
            if(!t || t.length > 40) return;
            var ctx = node.closest("tr, li, dl, .totalSummary__item, .ndOrderShippingSummary__row, p, div");
            var ctxText = ctx ? trimText(ctx.textContent) : "";
            if(/할인|적립|쿠폰|마일리지|포인트|예치금/.test(ctxText)) return; // 다른 0원 보호
            if(!/배송/.test(ctxText)) return;                                  // 배송 문맥만
            if(/^0\s*원$/.test(t)){
                node.textContent = replacement;
            } else if(/^0\s*\(착불\s*배송비\s*별도\)\s*원?$/.test(t)){
                node.textContent = replacement;
            } else if(/^배송비\s*:?\s*0\s*원$/.test(t)){
                node.textContent = kind === "pickup" ? "" : "배송비 : 착불";
            } else if(/^배송\s*:\s*0\s*원$/.test(t)){
                node.textContent = "배송 : " + replacement;
            }
        });
        // "배송비 0원 (자세히)" + 배송비 할인/이벤트 안내 줄 숨김 (장바구니 하단, 슬라이드5 '제거' 표기 대상)
        Array.prototype.forEach.call(rootEl.querySelectorAll("p, li, div, a, span"), function(node){
            if(node.querySelector("input, select, textarea")) return;
            var t = trimText(node.textContent);
            if(!t || t.length > 140) return;
            if(/배송비\s*0\s*원\s*\(?\s*자세히/.test(t) || (/배송비\s*할인/.test(t) && /이벤트|혜택/.test(t))){
                node.style.display = "none";
            }
        });
    }

    /* [추가 2026-06-11] 택배 선불 업체명 "천일택배" → "택배배송(선불)" 표기 변경 (피드백 슬라이드)
       - 카페24 배송방법(택배 선불)을 천일택배로 설정 → 고객 화면엔 "택배배송(선불)"로 보이게.
       - 표시 전용: 잎(leaf) 텍스트/텍스트노드만 치환. input/select 값·name·제출은 절대 불변. */
    function ndRenameCarrier(scope){
        if(!scope) return;
        var nodes = scope.querySelectorAll("span, em, strong, b, td, dd, p, a, label, option");
        Array.prototype.forEach.call(nodes, function(node){
            if(node.tagName === "OPTION") return; // select 옵션값은 제출에 쓰이므로 미변경
            if(node.children.length > 0) return;                       // 잎 요소만
            if(node.querySelector && node.querySelector("input, select, textarea")) return;
            var t = node.textContent;
            if(t && t.indexOf("천일택배") > -1 && t.length < 40){
                node.textContent = t.replace(/천일택배/g, "택배배송(선불)");
            }
        });
        // label이 텍스트노드로 직접 들고 있는 경우(label > input + "천일택배")
        Array.prototype.forEach.call(scope.querySelectorAll("label"), function(lab){
            Array.prototype.forEach.call(lab.childNodes, function(n){
                if(n.nodeType === 3 && n.nodeValue && n.nodeValue.indexOf("천일택배") > -1){
                    n.nodeValue = n.nodeValue.replace(/천일택배/g, "택배배송(선불)");
                }
            });
        });
    }

    function enhanceBasket(){
        var packageEl = document.querySelector(".xans-order-basketpackage");
        if(!packageEl) return;

        var detectedAll = detectMethod(packageEl.textContent);
        var kindAll = methodKind(detectedAll.method);

        packageEl.querySelectorAll(".ec-base-prdInfo").forEach(function(item){
            var detected = detectMethod(item.textContent);
            var kind = methodKind(detected.method);

            if(!item.querySelector(".ndSelectedShipping")){
                var info = item.querySelector(".description .info");
                if(info){
                    var shippingLi = Array.prototype.filter.call(info.querySelectorAll("li"), function(li){
                        return li.textContent.indexOf("배송") > -1;
                    })[0];
                    var li = el("li", "ndSelectedShipping");
                    li.appendChild(document.createTextNode("배송조건 : "));
                    li.appendChild(el("strong", null, detected.method));
                    if(kind === "parcel"){
                        var sf = ndItemFeeText(item);
                        if(sf){
                            li.appendChild(document.createTextNode(" "));
                            li.appendChild(el("span", null, "(배송비 " + sf + "원 · 선불)"));
                        }
                    }
                    if(shippingLi && shippingLi.nextSibling){
                        info.insertBefore(li, shippingLi.nextSibling);
                    } else {
                        info.appendChild(li);
                    }
                }
            }
            ndCleanZeroFee(item, kind);
        });

        packageEl.querySelectorAll(".totalSummary").forEach(function(summary){
            if(!summary.querySelector(".ndTotalShippingMethod")){
                var shippingItem = Array.prototype.filter.call(summary.querySelectorAll(".totalSummary__item"), function(item){
                    return item.textContent.indexOf("총 배송비") > -1;
                })[0];
                var box = el("div", "ndTotalShippingMethod");
                var row1 = el("div", "item");
                row1.appendChild(el("h5", "title", "선택 배송조건"));
                row1.appendChild(el("div", "data", detectedAll.method));
                box.appendChild(row1);
                if(kindAll === "parcel"){
                    var ndSum = 0;
                    packageEl.querySelectorAll(".ec-base-prdInfo").forEach(function(it){
                        var n = parseInt((ndItemFeeText(it) || "0").replace(/,/g, ""), 10);
                        if(n) ndSum += n;
                    });
                    if(ndSum > 0){
                        var row2 = el("div", "item");
                        row2.appendChild(el("h5", "title", "배송비(선불)"));
                        row2.appendChild(el("div", "data", ndSum.toLocaleString("ko-KR") + "원"));
                        box.appendChild(row2);
                    }
                }
                if(shippingItem && shippingItem.parentNode){
                    shippingItem.parentNode.insertBefore(box, shippingItem.nextSibling);
                } else {
                    summary.appendChild(box);
                }
            }
            ndCleanZeroFee(summary, kindAll);
        });

        ndCleanZeroFee(packageEl, kindAll);
        ndRenameCarrier(packageEl);
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
            var normalized = normalizeMethod(text);
            if(normalized && textMatchesMethod(text, normalized)){
                return { method: normalized, fee: "" };
            }
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
            box = el("div", "ndOrderShippingSummary");
            target.insertBefore(box, target.firstChild);
        }

        function render(){
            var detected = selectedShippingFromForm();
            var kind = methodKind(detected.method);
            var fee = "";
            if(kind === "parcel"){
                var paymentText = trimText((order.querySelector(".rightGroup") || order).textContent);
                var feeMatch = paymentText.match(/배송비\s*([0-9,]+)\s*원/);
                if(feeMatch && parseInt(feeMatch[1].replace(/,/g, ""), 10) > 0){
                    fee = feeMatch[1] + "원";
                } else {
                    var ndBm = paymentText.match(/배송\s*:\s*([0-9,]+)\s*원/);
                    if(ndBm && parseInt(ndBm[1].replace(/,/g, ""), 10) > 0) fee = ndBm[1] + "원";
                }
            }
            var sig = detected.method + "|" + fee;
            if(box.getAttribute("data-nd-sig") !== sig){
                box.setAttribute("data-nd-sig", sig);
                while(box.firstChild) box.removeChild(box.firstChild);
                box.appendChild(el("strong", "ndOrderShippingSummary__title", "배송"));
                var row1 = el("div", "ndOrderShippingSummary__row");
                row1.appendChild(el("span", null, "배송조건"));
                row1.appendChild(el("span", null, detected.method));
                box.appendChild(row1);
                if(fee){
                    var row2 = el("div", "ndOrderShippingSummary__row");
                    row2.appendChild(el("span", null, "배송비(선불)"));
                    row2.appendChild(el("span", null, fee));
                    box.appendChild(row2);
                }
            }
            ndCleanZeroFee(order, kind);
            ndRenameCarrier(order);
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
            var t = event.target;
            if(t && (t.tagName === "SELECT" || t.type === "radio")){
                window.setTimeout(render, 80);
            }
        });
        return true;
    }

    function boot(){
        enhanceBasket();
        if(window.MutationObserver){
            var basketEl = document.querySelector(".xans-order-basketpackage");
            if(basketEl){
                var basketTimer = null;
                new MutationObserver(function(){
                    window.clearTimeout(basketTimer);
                    basketTimer = window.setTimeout(enhanceBasket, 150);
                }).observe(basketEl, { childList: true, subtree: true });
            }
        }
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
