/* 대량견적 요청 모달 로직 (교차①). vanilla IIFE — jQuery 1.12.4(noConflict) 비의존.
   백오피스 공개 수신 API 로 구조화 전송. DOM 생성은 createElement/textContent 만(innerHTML 미사용).
   안전: 결제/주문/옵션폼 미터치. 신규 표시·전송만. */
(function () {
  "use strict";

  // 백오피스 수신 도메인. HTTPS 스킨에서 mixed-content 차단이 나지 않도록 code.flashstudio.kr 프록시를 사용한다.
  var BACKEND = "https://code.flashstudio.kr";
  var PHONE_RE = /^010-\d{3,4}-\d{4}$/;

  function ready(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  function makeItemRow(name, qty) {
    var row = document.createElement("div");
    row.className = "ndBq_item";

    var n = document.createElement("input");
    n.type = "text";
    n.className = "ndBq_itemName";
    n.placeholder = "상품명 / 옵션";
    if (name) n.value = name;

    var q = document.createElement("input");
    q.type = "number";
    q.className = "ndBq_itemQty";
    q.min = "1";
    q.value = qty && qty > 0 ? String(qty) : "1";

    var del = document.createElement("button");
    del.type = "button";
    del.className = "ndBq_itemDel";
    del.textContent = "삭제";
    del.addEventListener("click", function () {
      if (row.parentNode) row.parentNode.removeChild(row);
    });

    row.appendChild(n);
    row.appendChild(q);
    row.appendChild(del);
    return row;
  }

  // 상품 상세에서 열렸으면 현재 상품명을 첫 품목으로 프리필(best-effort).
  function currentProductName() {
    var sels = [
      ".detailArea .headingArea .name",
      ".detailArea .infoArea .headingArea h2",
      ".xans-product-detail .headingArea .name",
      ".headingArea .name",
    ];
    for (var i = 0; i < sels.length; i++) {
      var el = document.querySelector(sels[i]);
      if (el && el.textContent && el.textContent.trim()) {
        return el.textContent.trim().replace(/\s+/g, " ");
      }
    }
    return "";
  }

  function cleanText(text) {
    return String(text || "").replace(/\s+/g, " ").trim();
  }

  function parseQty(text) {
    var m = String(text || "").match(/(\d+)\s*개/);
    if (m) return parseInt(m[1], 10) || 1;
    var n = parseInt(String(text || "").replace(/[^0-9]/g, ""), 10);
    return n > 0 ? n : 1;
  }

  function isVisible(el) {
    if (!el) return false;
    if (el.offsetParent === null && window.getComputedStyle(el).position !== "fixed") return false;
    return window.getComputedStyle(el).display !== "none";
  }

  function readCartItems() {
    var rows = document.querySelectorAll(
      ".xans-order-basketpackage .ec-base-prdInfo.gCheck",
    );
    var items = [];
    Array.prototype.forEach.call(rows, function (row) {
      if (!isVisible(row)) return;
      var nameEl = row.querySelector(".prdName");
      var name = cleanText(nameEl ? nameEl.textContent : "");
      if (!name || name.indexOf("{$") >= 0) return;

      var qty = 1;
      var qtyInput = row.querySelector(
        ".quantity input[type='text'], .quantity input[type='number'], input[name*='quantity']",
      );
      if (qtyInput && qtyInput.value) {
        qty = parseQty(qtyInput.value);
      } else {
        qty = parseQty(row.querySelector(".quantity") ? row.querySelector(".quantity").textContent : "");
      }

      var optionTexts = [];
      Array.prototype.forEach.call(row.querySelectorAll(".optionGroup .name"), function (opt) {
        if (!isVisible(opt)) return;
        var txt = cleanText(opt.textContent).replace(/옵션변경/g, "").trim();
        if (txt && txt.indexOf("{$") < 0 && optionTexts.indexOf(txt) < 0) optionTexts.push(txt);
      });

      items.push({
        productName: optionTexts.length ? name + " / " + optionTexts.join(" / ") : name,
        qty: qty,
      });
    });
    return items.slice(0, 50);
  }

  ready(function () {
    var modal = document.getElementById("ndBulkQuote");
    if (!modal) return;
    var form = document.getElementById("ndBqForm");
    var itemsWrap = document.getElementById("ndBqItems");
    var addBtn = document.getElementById("ndBqAddItem");
    var submitBtn = document.getElementById("ndBqSubmit");
    var msg = document.getElementById("ndBqMsg");
    var memberIdInput = document.getElementById("ndBqMemberId");
    var memberNotice = document.getElementById("ndBqMemberNotice");
    var cartPreview = document.getElementById("ndBqCartPreview");
    var guestFields = document.getElementById("ndBqGuestFields");
    var manualItems = document.getElementById("ndBqManualItems");

    function setMsg(text, kind) {
      msg.textContent = text || "";
      msg.className = "ndBq_msg" + (kind ? " is-" + kind : "");
    }

    function resetItems(prefillName) {
      while (itemsWrap.firstChild) itemsWrap.removeChild(itemsWrap.firstChild);
      itemsWrap.appendChild(makeItemRow(prefillName || "", 1));
    }

    function renderCartPreview() {
      if (!cartPreview) return;
      while (cartPreview.firstChild) cartPreview.removeChild(cartPreview.firstChild);
      var items = readCartItems();
      if (!items.length) {
        var p = document.createElement("p");
        p.textContent = "서버가 Cafe24 회원 장바구니를 직접 조회해 견적 품목을 생성합니다.";
        cartPreview.appendChild(p);
        return;
      }
      var ul = document.createElement("ul");
      Array.prototype.forEach.call(items.slice(0, 5), function (item) {
        var li = document.createElement("li");
        li.textContent = item.productName + " / " + item.qty + "개";
        ul.appendChild(li);
      });
      cartPreview.appendChild(ul);
      if (items.length > 5) {
        var more = document.createElement("p");
        more.textContent = "외 " + (items.length - 5) + "개 품목";
        cartPreview.appendChild(more);
      }
    }

    function updateMemberMode() {
      var isMember = !!memberIdInput.value;
      if (guestFields) guestFields.style.display = isMember ? "none" : "";
      if (manualItems) manualItems.style.display = isMember ? "none" : "";
      if (memberNotice) memberNotice.hidden = !isMember;
      if (form.managerName) form.managerName.required = !isMember;
      if (form.phone) form.phone.required = !isMember;
      if (isMember) renderCartPreview();
    }

    function openModal() {
      setMsg("");
      updateMemberMode();
      // 장바구니에서 열렸으면 장바구니 상품을 자동으로 채운다(상품 재입력 방지 = "자동견적").
      // member_id 취득 여부와 무관하게 스킨이 장바구니 DOM 을 읽어 품목을 미리 채운다.
      var cartItems = readCartItems();
      if (cartItems.length) {
        while (itemsWrap.firstChild) itemsWrap.removeChild(itemsWrap.firstChild);
        for (var ci = 0; ci < cartItems.length; ci++) {
          itemsWrap.appendChild(makeItemRow(cartItems[ci].productName, cartItems[ci].qty));
        }
      } else if (itemsWrap.children.length === 0) {
        resetItems(currentProductName());
      }
      modal.classList.add("ndBq-open");
      modal.setAttribute("aria-hidden", "false");
    }
    function closeModal() {
      modal.classList.remove("ndBq-open");
      modal.setAttribute("aria-hidden", "true");
    }

    // 열기 버튼(어디서든 .ndBulkQuoteOpen)
    Array.prototype.forEach.call(
      document.querySelectorAll(".ndBulkQuoteOpen"),
      function (btn) {
        btn.addEventListener("click", function (e) {
          e.preventDefault();
          openModal();
        });
      },
    );

    // 동적 삽입 버튼(장바구니 진입점 등)에서 호출할 전역 오픈 함수.
    window.ndBulkQuote = { open: openModal, close: closeModal };

    // 닫기(딤/×)
    Array.prototype.forEach.call(
      modal.querySelectorAll("[data-bq-close]"),
      function (el) {
        el.addEventListener("click", closeModal);
      },
    );
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && modal.classList.contains("ndBq-open")) closeModal();
    });

    addBtn.addEventListener("click", function () {
      itemsWrap.appendChild(makeItemRow("", 1));
    });

    // 회원/member_id: Cafe24 서버 렌더 신호(앱 SDK CAFE24API 미의존 — 스토어프론트엔 없음).
    //  - #ndBqStateOn(또는 .xans-layout-statelogon) 존재 = 로그인.
    //  - data-mid({$member_id})는 회원모듈 스코프에서만 해석 → {$ 잔존 시 무시(게스트 폴백).
    try {
      var ndStateEl =
        document.getElementById("ndBqStateOn") ||
        document.querySelector(".xans-layout-statelogon");
      if (ndStateEl) {
        var ndMidEl = document.getElementById("ndBqStateOn");
        var ndMid = ndMidEl ? (ndMidEl.getAttribute("data-mid") || "").trim() : "";
        if (ndMid.indexOf("{$") >= 0) ndMid = "";
        if (ndMid) memberIdInput.value = ndMid;
      }
      updateMemberMode();
    } catch (err) {
      /* 판정 실패 시 게스트로 접수 */
    }

    resetItems(currentProductName());

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var items = [];
      Array.prototype.forEach.call(
        itemsWrap.querySelectorAll(".ndBq_item"),
        function (row) {
          var nameEl = row.querySelector(".ndBq_itemName");
          var qtyEl = row.querySelector(".ndBq_itemQty");
          var nm = nameEl ? nameEl.value.trim() : "";
          var qt = qtyEl ? parseInt(qtyEl.value, 10) : 1;
          if (nm) items.push({ productName: nm, qty: qt > 0 ? qt : 1 });
        },
      );

      // 회원은 서버가 카페24 장바구니를 자동으로 가져오므로 상품 재입력 불필요.
      // 비회원(폴백)만 수기 상품이 필요.
      var memberId = memberIdInput.value || null;
      if (!memberId) {
        var managerName = form.managerName.value.trim();
        var phone = form.phone.value.trim();
        if (!managerName) {
          setMsg("담당자명을 입력해주세요.", "error");
          return;
        }
        if (!PHONE_RE.test(phone)) {
          setMsg("연락처를 010-1234-5678 형식으로 입력해주세요.", "error");
          return;
        }
      }
      if (!memberId && items.length === 0) {
        setMsg("견적 받을 상품을 1개 이상 입력해주세요.", "error");
        return;
      }

      var payload = {
        memberId: memberId,
        companyName: form.companyName.value.trim() || null,
        memo: form.memo.value.trim() || null,
        website: form.website.value,
      };
      if (!memberId) {
        payload.managerName = form.managerName.value.trim();
        payload.phone = form.phone.value.trim();
        payload.email = form.email.value.trim() || null;
        payload.items = items;
      } else {
        var cartItems = readCartItems();
        if (cartItems.length > 0) payload.items = cartItems;
      }

      submitBtn.disabled = true;
      setMsg("보내는 중...");

      fetch(BACKEND + "/api/quote-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
        .then(function (r) {
          return r
            .json()
            .catch(function () {
              return {};
            })
            .then(function (j) {
              return { ok: r.ok, body: j };
            });
        })
        .then(function (res) {
          if (res.ok && res.body && res.body.ok) {
            setMsg(
              "견적 요청이 접수되었습니다. 담당자가 확인 후 연락드리겠습니다.",
              "ok",
            );
            var savedMemberId = memberIdInput.value;
            form.reset();
            memberIdInput.value = savedMemberId;
            resetItems("");
            updateMemberMode();
          } else {
            var m =
              (res.body && res.body.error && res.body.error.message) ||
              "요청 접수에 실패했습니다. 잠시 후 다시 시도해주세요.";
            setMsg(m, "error");
          }
        })
        .catch(function () {
          setMsg("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.", "error");
        })
        .then(function () {
          submitBtn.disabled = false;
        });
    });
  });
})();
