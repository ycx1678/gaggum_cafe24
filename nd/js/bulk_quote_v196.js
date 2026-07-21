/* 대량견적 요청 모달 로직 (교차①). vanilla IIFE — jQuery 1.12.4(noConflict) 비의존.
   백오피스 공개 수신 API 로 구조화 전송. DOM 생성은 createElement/textContent 만(innerHTML 미사용).
   안전: 결제/주문/옵션폼 미터치. 신규 표시·전송만. */
(function () {
  "use strict";

  // 백오피스 수신 도메인(테스트 백오피스). HTTPS 스킨에서 mixed-content 차단이 나지 않도록 전용 vhost 를 사용한다.
  var BACKEND = window.ND_BULK_QUOTE_API_BASE ||
    (window.location.pathname.indexOf("/skin-skin17/") === 0
      ? "https://gaggum.flashstudio.kr"
      : "https://warranty.gaggum.kr");
  var PHONE_RE = /^010-\d{3,4}-\d{4}$/;

  function ready(fn) {
    var initialized = false;
    var attempts = 0;

    function runWhenMarkupExists() {
      if (initialized) return;
      if (!document.getElementById("ndBulkQuote") && attempts < 40) {
        attempts += 1;
        window.setTimeout(runWhenMarkupExists, 50);
        return;
      }
      initialized = true;
      fn();
    }

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", runWhenMarkupExists);
    } else {
      runWhenMarkupExists();
    }
  }

  function makeItemRow(name, qty, meta) {
    var row = document.createElement("div");
    row.className = "ndBq_item";
    meta = meta || {};
    if (meta.productNo) row.setAttribute("data-product-no", String(meta.productNo));
    if (meta.productOptions) row.setAttribute("data-product-options", meta.productOptions);
    if (meta.unitPrice) row.setAttribute("data-unit-price", String(meta.unitPrice));
    if (meta.imageUrl) row.setAttribute("data-image-url", meta.imageUrl);
    row.setAttribute("data-is-additional", meta.isAdditional ? "1" : "0");

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
      ".detailArea .infoArea .headingArea h1",
      ".infoArea .headingArea h1",
      ".xans-product-detail .headingArea h1",
      ".headingArea h1",
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

  function normalizePhone(text) {
    var digits = String(text || "").replace(/[^0-9]/g, "");
    if (digits.length === 11 && digits.indexOf("010") === 0) {
      return digits.slice(0, 3) + "-" + digits.slice(3, 7) + "-" + digits.slice(7);
    }
    if (digits.length === 10 && digits.indexOf("010") === 0) {
      return digits.slice(0, 3) + "-" + digits.slice(3, 6) + "-" + digits.slice(6);
    }
    return cleanText(text);
  }

  function addressBookRecord(row) {
    function value(selector) {
      var el = row.querySelector(selector);
      var text = cleanText(el ? el.textContent : "");
      return text.indexOf("{$") >= 0 ? "" : text;
    }

    var mobile = normalizePhone(value(".ndBqAddressMobile"));
    var phone = normalizePhone(value(".ndBqAddressPhone"));
    var zipcode = value(".ndBqAddressZip");
    var address = [value(".ndBqAddress1"), value(".ndBqAddress2")]
      .filter(function (part) { return !!part; })
      .join(" ");
    if (zipcode) address = "(" + zipcode + ") " + address;
    if (!address || (!PHONE_RE.test(mobile) && !PHONE_RE.test(phone))) return null;

    var defaultImage = row.querySelector('img[alt="기본"]');
    return {
      name: value(".ndBqAddressName"),
      phone: PHONE_RE.test(mobile) ? mobile : phone,
      address: address,
      isDefault: !!defaultImage && !defaultImage.classList.contains("displaynone"),
    };
  }

  function parseAddressBook(html) {
    var doc = new window.DOMParser().parseFromString(html, "text/html");
    var records = [];
    Array.prototype.forEach.call(
      doc.querySelectorAll(".ndBqAddressRecord"),
      function (row) {
        var record = addressBookRecord(row);
        if (record) records.push(record);
      },
    );
    for (var i = 0; i < records.length; i++) {
      if (records[i].isDefault) return records[i];
    }
    return records.length ? records[0] : null;
  }

  function profileControlValue(doc, selectors) {
    for (var i = 0; i < selectors.length; i++) {
      var control = doc.querySelector(selectors[i]);
      if (!control) continue;
      var value = cleanText(
        typeof control.value === "string"
          ? control.value
          : control.getAttribute("value") || "",
      );
      if (value && value.indexOf("{$") < 0) return value;
    }
    return "";
  }

  function joinedProfileValue(doc, selectorGroups, separator) {
    var parts = [];
    for (var i = 0; i < selectorGroups.length; i++) {
      var value = profileControlValue(doc, selectorGroups[i]);
      if (value) parts.push(value);
    }
    return parts.join(separator || "");
  }

  function parseMemberEditProfile(html) {
    var doc = new window.DOMParser().parseFromString(html, "text/html");
    if (!doc.querySelector(".xans-member-edit")) return null;

    var name = profileControlValue(doc, [
      "#name",
      'input[name="name"]',
      'input[name="member_name"]',
    ]);
    var mobile = profileControlValue(doc, [
      'input[name="cellphone"]',
      'input[name="mobile_no"]',
      "#mobile",
    ]);
    if (!PHONE_RE.test(normalizePhone(mobile))) {
      mobile = joinedProfileValue(
        doc,
        [
          ["#mobile1", 'select[name="mobile1"]', 'input[name="mobile1"]'],
          ["#mobile2", 'input[name="mobile2"]'],
          ["#mobile3", 'input[name="mobile3"]'],
        ],
        "-",
      );
    }
    mobile = normalizePhone(mobile);

    var email = profileControlValue(doc, [
      'input[type="email"]',
      'input[name="email"]',
      "#email",
    ]);
    if (email.indexOf("@") < 0) {
      var emailLocal = profileControlValue(doc, ["#email1", 'input[name="email1"]']);
      var emailDomain = profileControlValue(doc, [
        "#email2",
        'input[name="email2"]',
        "#email3",
        'select[name="email3"]',
      ]);
      email = emailLocal && emailDomain ? emailLocal + "@" + emailDomain : "";
    }

    var zipcode = joinedProfileValue(
      doc,
      [
        ["#postcode1", 'input[name="postcode1"]', "#zipcode", 'input[name="zipcode"]'],
        ["#postcode2", 'input[name="postcode2"]'],
      ],
      "-",
    );
    var address1 = profileControlValue(doc, [
      "#addr1",
      'input[name="addr1"]',
      'input[name="address1"]',
    ]);
    var address2 = profileControlValue(doc, [
      "#addr2",
      'input[name="addr2"]',
      'input[name="address2"]',
    ]);
    var address = [address1, address2]
      .filter(function (part) { return !!part; })
      .join(" ");
    if (zipcode && address) address = "(" + zipcode.replace(/-$/, "") + ") " + address;

    if (!name && !PHONE_RE.test(mobile) && !email && !address) return null;
    return {
      name: name,
      phone: PHONE_RE.test(mobile) ? mobile : "",
      email: email,
      address: address,
    };
  }

  function parseMoney(text) {
    var matches = String(text || "").match(/[0-9][0-9,]*/g) || [];
    for (var i = matches.length - 1; i >= 0; i--) {
      var value = parseInt(matches[i].replace(/,/g, ""), 10);
      if (value > 0) return value;
    }
    return 0;
  }

  function productNoFromUrl(href) {
    if (!href) return null;
    try {
      var url = new URL(href, window.location.href);
      var value = url.searchParams.get("product_no");
      var parsed = parseInt(value, 10);
      if (parsed > 0) return parsed;

      // Cafe24 SEO URL: /product/{slug}/{product_no}/category/{cate_no}/
      var pathMatch = url.pathname.match(
        /\/product\/(?:[^/?#]+\/)?(\d+)(?:\/|$)/,
      );
      return pathMatch ? parseInt(pathMatch[1], 10) : null;
    } catch (err) {
      var match = String(href).match(/[?&]product_no=(\d+)/);
      if (match) return parseInt(match[1], 10);
      var fallbackPath = String(href).match(
        /\/product\/(?:[^/?#]+\/)?(\d+)(?:\/|$)/,
      );
      return fallbackPath ? parseInt(fallbackPath[1], 10) : null;
    }
  }

  function absoluteImage(src) {
    if (!src || String(src).indexOf("{$") >= 0) return null;
    try {
      return new URL(src, window.location.href).href;
    } catch (err) {
      return null;
    }
  }

  function isAdditionalProduct(name) {
    return /^(?:추가(?:상품|구성상품)?\s*[:：-]|발\s*거치대|의자\s*방석|초등학생\s*높이|서랍\s*추가|고정형\s*발굽)/.test(
      cleanText(name),
    );
  }

  function currentProductItem() {
    var name = currentProductName();
    var image = document.querySelector(
      ".xans-product-image.imgArea img.bigImage, .imgArea img.bigImage, .xans-product-detail .keyImg img, .detailArea .keyImg img, .imgArea .keyImg img",
    );
    var price = document.querySelector(
      "#span_product_price_sale, #span_product_price_text, .xans-product-detail .price strong",
    );
    return {
      productName: name,
      productNo: productNoFromUrl(window.location.href),
      productOptions: null,
      qty: 1,
      unitPrice: parseMoney(price ? price.textContent : ""),
      imageUrl: absoluteImage(image ? image.getAttribute("src") : ""),
      isAdditional: false,
    };
  }

  function rowProductName(productEl, optionEl) {
    var full = cleanText(productEl ? productEl.textContent : "");
    var option = cleanText(optionEl ? optionEl.textContent : "");
    if (!option) return full;
    var optionAt = full.lastIndexOf(option);
    if (optionAt < 0) return full;
    return cleanText(full.slice(0, optionAt).replace(/\s*-\s*$/, ""));
  }

  function additionalProductImage(productNo, productName) {
    if (!productNo) return null;
    var select = document.querySelector(
      '.xans-product-addproduct select[option_product_no="' + String(productNo) + '"]',
    );
    var optionList = select ? select.closest("ul.option") : null;
    var card = optionList ? optionList.parentElement : null;
    var cardName = cleanText(card && card.querySelector("p.name")
      ? card.querySelector("p.name").textContent
      : "");
    if (!card || !cardName || cardName !== cleanText(productName)) return null;
    var image = card.querySelector(".thumbnail img");
    return absoluteImage(image ? image.getAttribute("src") : "");
  }

  function readDetailItems() {
    var root = document.getElementById("totalProducts");
    if (!root) return [];

    var mainImage = currentProductItem().imageUrl;
    var items = [];
    Array.prototype.forEach.call(
      root.querySelectorAll("tbody.option_products > tr.option_product, tbody.add_products > tr.add_product"),
      function (row) {
        var isAdditional = row.classList.contains("add_product");
        var productEl = row.querySelector(".product");
        var optionEl = productEl ? productEl.querySelector("span") : null;
        var priceInput = row.querySelector(
          ".option_box_price, .add_product_option_box_price",
        );
        var qtyInput = row.querySelector(
          ".quantity input[type='text'], .quantity input[type='number']",
        );
        var productName = rowProductName(productEl, optionEl);
        var productNo = parseInt(
          (priceInput && priceInput.getAttribute("product-no")) ||
            (qtyInput && qtyInput.getAttribute("product-no")) ||
            row.getAttribute("target-key"),
          10,
        );
        var unitPrice = parseMoney(
          priceInput ? priceInput.value : row.querySelector("td.right")
            ? row.querySelector("td.right").textContent
            : "",
        );
        if (!productName || !(productNo > 0) || !(unitPrice > 0)) return;

        items.push({
          productName: productName,
          productNo: productNo,
          productOptions: cleanText(optionEl ? optionEl.textContent : "") || null,
          qty: parseQty(qtyInput ? qtyInput.value : "1"),
          unitPrice: unitPrice,
          imageUrl: isAdditional
            ? additionalProductImage(productNo, productName)
            : mainImage,
          isAdditional: isAdditional,
        });
      },
    );
    return items.slice(0, 50);
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

      var link = row.querySelector(".prdName a, .thumbnail a");
      var image = row.querySelector(".thumbnail img");
      var sumPrice = row.querySelector(".sumPrice strong, .sumPrice");
      var lineTotal = parseMoney(sumPrice ? sumPrice.textContent : "");
      items.push({
        productName: name,
        productOptions: optionTexts.length ? optionTexts.join(" / ") : null,
        productNo: productNoFromUrl(link ? link.getAttribute("href") : ""),
        qty: qty,
        unitPrice: lineTotal > 0 ? Math.round(lineTotal / qty) : 0,
        imageUrl: absoluteImage(image ? image.getAttribute("src") : ""),
        isAdditional: isAdditionalProduct(name),
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
    var profileStatus = document.getElementById("ndBqProfileStatus");
    var cartPreview = document.getElementById("ndBqCartPreview");
    var guestFields = document.getElementById("ndBqGuestFields");
    var manualItems = document.getElementById("ndBqManualItems");
    var requestSource = "cart";
    var sourceOrderId = null;
    var cachedMemberProfile = null;
    var memberProfileRequest = null;
    var cachedAddressBookRecord = null;
    var addressBookRequest = null;

    function setMsg(text, kind) {
      msg.textContent = text || "";
      msg.className = "ndBq_msg" + (kind ? " is-" + kind : "");
    }

    function setProfileStatus(text) {
      if (profileStatus) profileStatus.textContent = text;
    }

    function applyAddressBookRecord(record) {
      if (!record) return false;
      if (form.managerName && !form.managerName.value.trim() && record.name) {
        form.managerName.value = record.name;
      }
      if (form.phone && !form.phone.value.trim()) form.phone.value = record.phone;
      if (form.address && !form.address.value.trim()) form.address.value = record.address;
      setProfileStatus("Cafe24 기본 배송지 정보를 불러왔습니다. 내용을 확인해주세요.");
      return true;
    }

    function applyMemberProfile(profile) {
      if (!profile) return false;
      if (form.managerName && !form.managerName.value.trim() && profile.name) {
        form.managerName.value = profile.name;
      }
      if (form.phone && !form.phone.value.trim() && profile.phone) {
        form.phone.value = profile.phone;
      }
      if (form.email && !form.email.value.trim() && profile.email) {
        form.email.value = profile.email;
      }
      if (form.address && !form.address.value.trim() && profile.address) {
        form.address.value = profile.address;
      }
      return true;
    }

    function hasCompleteContact() {
      return !!(
        form.managerName && form.managerName.value.trim() &&
        form.phone && PHONE_RE.test(normalizePhone(form.phone.value)) &&
        form.address && form.address.value.trim()
      );
    }

    function loadMemberAddressBook() {
      if (!memberIdInput.value) return Promise.resolve(null);
      if (cachedAddressBookRecord) {
        applyAddressBookRecord(cachedAddressBookRecord);
        return Promise.resolve(cachedAddressBookRecord);
      }
      if (!addressBookRequest) {
        var skinMatch = window.location.pathname.match(/^\/skin-skin\d+/);
        var addressBookUrl =
          (skinMatch ? skinMatch[0] : "") + "/" + ["myshop", "addr", "list.html"].join("/");
        setProfileStatus("Cafe24 배송주소록의 연락처와 주소를 불러오는 중입니다.");
        addressBookRequest = fetch(addressBookUrl, {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
          headers: { Accept: "text/html" },
        })
          .then(function (response) {
            if (!response.ok) throw new Error("ADDRESS_BOOK_HTTP_" + response.status);
            return response.text();
          })
          .then(parseAddressBook)
          .then(function (record) {
            cachedAddressBookRecord = record;
            return record;
          })
          .catch(function () {
            addressBookRequest = null;
            return null;
          });
      }
      return addressBookRequest.then(function (record) {
        if (!applyAddressBookRecord(record)) {
          setProfileStatus("저장된 배송지가 없어 연락처와 주소를 직접 입력해주세요.");
        }
        return record;
      });
    }

    function loadMemberContactProfile() {
      if (!memberIdInput.value) return Promise.resolve(null);
      if (cachedMemberProfile) {
        applyMemberProfile(cachedMemberProfile);
        if (hasCompleteContact()) {
          setProfileStatus("Cafe24 회원정보를 불러왔습니다. 내용을 확인해주세요.");
          return Promise.resolve(cachedMemberProfile);
        }
        return loadMemberAddressBook().then(function (addressRecord) {
          if (addressRecord) {
            setProfileStatus("Cafe24 회원정보와 기본 배송지 정보를 불러왔습니다. 내용을 확인해주세요.");
          }
          return cachedMemberProfile;
        });
      }

      if (!memberProfileRequest) {
        var skinMatch = window.location.pathname.match(/^\/skin-skin\d+/);
        var profileUrl =
          (skinMatch ? skinMatch[0] : "") +
          "/" +
          ["member", "modify.html"].join("/") +
          "?nd_bulk_quote_profile=1";
        setProfileStatus("Cafe24 회원정보를 불러오는 중입니다.");
        memberProfileRequest = fetch(profileUrl, {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
          headers: { Accept: "text/html" },
        })
          .then(function (response) {
            if (!response.ok) throw new Error("MEMBER_PROFILE_HTTP_" + response.status);
            return response.text();
          })
          .then(parseMemberEditProfile)
          .then(function (profile) {
            cachedMemberProfile = profile;
            return profile;
          })
          .catch(function () {
            memberProfileRequest = null;
            return null;
          });
      }

      return memberProfileRequest.then(function (profile) {
        applyMemberProfile(profile);
        if (hasCompleteContact()) {
          setProfileStatus("Cafe24 회원정보를 불러왔습니다. 내용을 확인해주세요.");
          return profile;
        }
        return loadMemberAddressBook().then(function (addressRecord) {
          if (profile && addressRecord) {
            setProfileStatus("Cafe24 회원정보와 기본 배송지 정보를 불러왔습니다. 내용을 확인해주세요.");
          } else if (!profile && !addressRecord) {
            setProfileStatus("회원정보를 자동으로 불러오지 못했습니다. 연락처와 주소를 직접 입력해주세요.");
          }
          return profile;
        });
      });
    }

    function resetItems(prefill) {
      while (itemsWrap.firstChild) itemsWrap.removeChild(itemsWrap.firstChild);
      var item = typeof prefill === "string" ? { productName: prefill, qty: 1 } : prefill || {};
      itemsWrap.appendChild(makeItemRow(item.productName || "", item.qty || 1, item));
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
      if (guestFields) guestFields.style.display = "";
      if (manualItems) manualItems.style.display = isMember ? "none" : "";
      if (memberNotice) memberNotice.hidden = !isMember;
      if (form.managerName) form.managerName.required = true;
      if (form.phone) form.phone.required = true;
      if (form.address) form.address.required = true;
      if (isMember) renderCartPreview();
    }

    function syncCafe24Member() {
      var ndStateEl =
        document.getElementById("ndBqStateOn") ||
        document.querySelector(".xans-layout-statelogon");
      if (!ndStateEl) {
        updateMemberMode();
        return true;
      }

      var ndMidTextEl = document.getElementById("ndBqMemberIdText");
      var ndNameTextEl = document.getElementById("ndBqMemberNameText");
      var ndMid = cleanText(ndMidTextEl ? ndMidTextEl.textContent : "");
      var ndMemberName = cleanText(ndNameTextEl ? ndNameTextEl.textContent : "");
      if (ndMid.indexOf("{$") >= 0 || !/^[A-Za-z0-9._@-]+$/.test(ndMid)) ndMid = "";
      if (ndMemberName.indexOf("{$") >= 0) ndMemberName = "";

      if (ndMid) memberIdInput.value = ndMid;
      if (ndMid && ndMemberName && form.managerName && !form.managerName.value.trim()) {
        form.managerName.value = ndMemberName;
      }
      updateMemberMode();
      return !!(ndMid && ndMemberName);
    }

    function openModal(prefillItems, source, orderId) {
      // detail.html places this partial inside a product stacking context.
      // Move the modal to body so fixed simulator controls cannot cover it.
      if (modal.parentNode !== document.body) document.body.appendChild(modal);
      setMsg("");
      syncCafe24Member();
      if (memberIdInput.value) loadMemberContactProfile();
      // 장바구니에서 열렸으면 장바구니 상품을 자동으로 채운다(상품 재입력 방지 = "자동견적").
      // member_id 취득 여부와 무관하게 스킨이 장바구니 DOM 을 읽어 품목을 미리 채운다.
      requestSource = source === "reorder" ? "reorder" : "cart";
      sourceOrderId = requestSource === "reorder" && orderId ? String(orderId) : null;
      var suppliedItems = Array.isArray(prefillItems) ? prefillItems : [];
      var cartItems = suppliedItems.length ? [] : readCartItems();
      var detailItems = suppliedItems.length || cartItems.length ? [] : readDetailItems();
      var automaticItems = suppliedItems.length ? suppliedItems : cartItems.length ? cartItems : detailItems;
      if (automaticItems.length) {
        while (itemsWrap.firstChild) itemsWrap.removeChild(itemsWrap.firstChild);
        for (var ci = 0; ci < automaticItems.length; ci++) {
          itemsWrap.appendChild(
            makeItemRow(
              automaticItems[ci].productName,
              automaticItems[ci].qty,
              automaticItems[ci],
            ),
          );
        }
      } else if (document.getElementById("totalProducts")) {
        resetItems(currentProductItem());
      } else if (itemsWrap.children.length === 0) {
        resetItems(currentProductItem());
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
      itemsWrap.appendChild(makeItemRow("", 1, null));
    });

    // 회원/member_id: Cafe24 서버 렌더 신호(앱 SDK CAFE24API 미의존 — 스토어프론트엔 없음).
    //  - #ndBqStateOn(또는 .xans-layout-statelogon) 존재 = 로그인.
    //  - {$id}/{$name}은 Cafe24가 HTML 조각으로 렌더할 수 있어 textContent로 읽는다.
    try {
      var memberSyncAttempts = 0;
      if (!syncCafe24Member()) {
        var memberSyncTimer = window.setInterval(function () {
          memberSyncAttempts += 1;
          if (syncCafe24Member() || memberSyncAttempts >= 40) {
            window.clearInterval(memberSyncTimer);
          }
        }, 100);
      }
    } catch (err) {
      updateMemberMode();
    }

    resetItems(currentProductItem());

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
          if (nm) {
            var productNo = parseInt(row.getAttribute("data-product-no"), 10);
            var unitPrice = parseInt(row.getAttribute("data-unit-price"), 10);
            items.push({
              productName: nm,
              productOptions: row.getAttribute("data-product-options") || null,
              productNo: productNo > 0 ? productNo : null,
              qty: qt > 0 ? qt : 1,
              unitPrice: unitPrice > 0 ? unitPrice : 0,
              imageUrl: row.getAttribute("data-image-url") || null,
              isAdditional: row.getAttribute("data-is-additional") === "1",
            });
          }
        },
      );

      var memberId = memberIdInput.value || null;
      var managerName = form.managerName.value.trim();
      var phone = normalizePhone(form.phone.value);
      var address = form.address.value.trim();
      if (!managerName) {
        setMsg("담당자명을 입력해주세요.", "error");
        return;
      }
      if (!PHONE_RE.test(phone)) {
        setMsg("연락처를 010-1234-5678 형식으로 입력해주세요.", "error");
        return;
      }
      if (!address) {
        setMsg("주소를 입력해주세요.", "error");
        return;
      }
      form.phone.value = phone;
      if (!memberId && items.length === 0) {
        setMsg("견적 받을 상품을 1개 이상 입력해주세요.", "error");
        return;
      }

      var payload = {
        memberId: memberId,
        source: requestSource,
        cafe24OrderId: sourceOrderId,
        managerName: managerName,
        phone: phone,
        email: form.email.value.trim() || null,
        address: address,
        companyName: form.companyName.value.trim() || null,
        memo: form.memo.value.trim() || null,
        website: form.website.value,
      };
      if (items.length > 0) payload.items = items;

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
            var requestToken =
              res.body.data && typeof res.body.data.requestToken === "string"
                ? res.body.data.requestToken
                : "";
            if (requestToken) {
              try {
                var tokenKey = "gaggum_quote_request_tokens";
                var storedTokens = JSON.parse(window.localStorage.getItem(tokenKey) || "[]");
                if (!Array.isArray(storedTokens)) storedTokens = [];
                storedTokens = storedTokens.filter(function (token) {
                  return typeof token === "string" && token !== requestToken;
                });
                storedTokens.unshift(requestToken);
                window.localStorage.setItem(tokenKey, JSON.stringify(storedTokens.slice(0, 20)));
              } catch (storageError) {
                /* 저장소 제한 환경에서도 견적 접수 자체는 성공 처리한다. */
              }
            }
            var savedMemberId = memberIdInput.value;
            form.reset();
            memberIdInput.value = savedMemberId;
            resetItems("");
            updateMemberMode();
            closeModal();
            window.alert(
              "견적 요청이 완료되었습니다.\n마이페이지 - 견적요청리스트 에서 요청내용을 확인하실 수 있습니다.",
            );
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
