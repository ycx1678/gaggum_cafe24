(function () {
  "use strict";

  var BACKEND = window.ND_BULK_QUOTE_API_BASE ||
    (window.location.pathname.indexOf("/skin-skin17/") === 0
      ? "https://gaggum.flashstudio.kr"
      : "https://warranty.gaggum.kr");
  var TOKEN_KEY = "gaggum_quote_request_tokens";
  var STATUS = {
    draft: "접수 준비",
    pending: "견적 접수",
    quoted: "견적 작성 완료",
    sent: "견적서 발송 완료",
    ordered: "주문 완료",
    paid: "결제 완료",
    rejected: "종료",
    expired: "유효기간 만료",
  };

  function ready(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  }

  function text(tag, className, value) {
    var node = document.createElement(tag);
    node.className = className;
    node.textContent = value || "";
    return node;
  }

  function tokens() {
    try {
      var value = JSON.parse(window.localStorage.getItem(TOKEN_KEY) || "[]");
      return Array.isArray(value)
        ? value.filter(function (token) { return /^[A-Za-z0-9]{24}$/.test(token); }).slice(0, 20)
        : [];
    } catch (error) {
      return [];
    }
  }

  function renderEmpty(root, message) {
    while (root.firstChild) root.removeChild(root.firstChild);
    root.appendChild(text("p", "ndQuoteListEmpty", message));
  }

  function render(root, items) {
    while (root.firstChild) root.removeChild(root.firstChild);
    if (!items.length) {
      renderEmpty(root, "접수된 견적 요청이 없습니다.");
      return;
    }
    items.forEach(function (item) {
      var card = document.createElement("article");
      card.className = "ndQuoteCard";
      var head = document.createElement("div");
      head.className = "ndQuoteCardHead";
      head.appendChild(text("strong", "ndQuoteCardTitle", item.first_product_name || item.company_name || "대량견적"));
      head.appendChild(text("span", "ndQuoteCardStatus", STATUS[item.status] || item.status));
      card.appendChild(head);
      card.appendChild(text("p", "ndQuoteCardDate", String(item.created_at || "").replace("T", " ").slice(0, 16)));
      if (item.quote_no) card.appendChild(text("p", "ndQuoteCardMeta", "견적번호 " + item.quote_no));
      if (item.total_amount > 0) {
        card.appendChild(text("p", "ndQuoteCardAmount", Number(item.total_amount).toLocaleString("ko-KR") + "원"));
      }
      var details = document.createElement("div");
      details.className = "ndQuoteCardDetails";
      details.hidden = true;
      var detailItems = Array.isArray(item.items) ? item.items : [];
      detailItems.forEach(function (quoteItem) {
        var row = document.createElement("div");
        row.className = "ndQuoteCardItem" + (quoteItem.is_additional ? " is-additional" : "");
        var label = (quoteItem.is_additional ? "추가상품 · " : "") + quoteItem.product_name;
        if (quoteItem.product_options) label += " / " + quoteItem.product_options;
        row.appendChild(text("span", "ndQuoteCardItemName", label));
        row.appendChild(text("span", "ndQuoteCardItemQty", Number(quoteItem.qty || 0) + "개"));
        details.appendChild(row);
      });
      var detailButton = document.createElement("button");
      detailButton.type = "button";
      detailButton.className = "ndQuoteCardToggle";
      detailButton.textContent = "요청내용 보기";
      detailButton.setAttribute("aria-expanded", "false");
      detailButton.addEventListener("click", function () {
        details.hidden = !details.hidden;
        detailButton.setAttribute("aria-expanded", details.hidden ? "false" : "true");
        detailButton.textContent = details.hidden ? "요청내용 보기" : "요청내용 닫기";
      });
      card.appendChild(detailButton);
      card.appendChild(details);
      if (item.viewUrl) {
        var link = document.createElement("a");
        link.className = "btnNormal sizeM ndQuoteCardLink";
        link.href = item.viewUrl;
        link.textContent = "견적서 확인";
        card.appendChild(link);
      }
      root.appendChild(card);
    });
  }

  ready(function () {
    var root = document.getElementById("ndQuoteRequestList");
    if (!root) return;
    var saved = tokens();
    if (!saved.length) {
      renderEmpty(root, "이 브라우저에서 접수된 견적 요청이 없습니다.");
      return;
    }
    fetch(BACKEND + "/api/quote-requests/list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tokens: saved }),
    })
      .then(function (response) {
        return response.json().then(function (body) { return { ok: response.ok, body: body }; });
      })
      .then(function (result) {
        if (!result.ok || !result.body.ok) throw new Error("load");
        render(root, result.body.data.items || []);
      })
      .catch(function () {
        renderEmpty(root, "견적 요청 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
      });
  });
})();
