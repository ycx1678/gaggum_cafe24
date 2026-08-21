(function () {
  "use strict";

  var STORAGE_KEY = "gaggum_quote_parent_groups_v183";
  var MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
  var RECENT_CAPTURE_MS = 5000;
  var VARIANT_CODE_RE = /^P[A-Z0-9]{11}$/;
  var PRODUCT_CODE_RE = /^P[A-Z0-9]{7}$/;
  var OPTION_CODE_RE = /^O[A-Z0-9]{7}$/;
  var originalFetch = window.fetch;
  var originalAlert = window.alert;
  var lastCapturedAt = 0;

  function cleanText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function normalizeKey(value) {
    return cleanText(value).toLowerCase().replace(/[^0-9a-z가-힣]/g, "");
  }

  function parsePositiveInt(value, fallback) {
    var parsed = parseInt(String(value || "").replace(/[^0-9]/g, ""), 10);
    return parsed > 0 ? parsed : fallback;
  }

  function parseMoney(value) {
    var matches = String(value || "").match(/-?\d[\d,]*/g);
    if (!matches || !matches.length) return 0;
    var parsed = parseInt(matches[matches.length - 1].replace(/,/g, ""), 10);
    return parsed > 0 ? parsed : 0;
  }

  function productNoFromRow(row) {
    var price = row.querySelector(".option_box_price, .add_product_option_box_price");
    var quantity = row.querySelector(
      ".quantity input[type='text'], .quantity input[type='number']",
    );
    return parsePositiveInt(
      (price && price.getAttribute("product-no")) ||
        (quantity && quantity.getAttribute("product-no")) ||
        row.getAttribute("target-key"),
      0,
    );
  }

  function rowNameAndOptions(row) {
    var product = row.querySelector(".product");
    var option = product ? product.querySelector("span") : null;
    var full = cleanText(product ? product.textContent : "");
    var optionText = cleanText(option ? option.textContent : "");
    var name = full;
    if (optionText) {
      var optionAt = full.lastIndexOf(optionText);
      if (optionAt >= 0) name = cleanText(full.slice(0, optionAt).replace(/\s*-\s*$/, ""));
    }
    return { name: name, options: optionText || null };
  }

  // Cafe24 장바구니 행은 사람이 읽는 옵션 문구만 남긴다. 주문에 필요한
  // variant code와 연동 옵션 번호는 상품 상세에서 옵션을 고르는 이 순간에만
  // 확정할 수 있으므로, 별도 API 호출 없이 동일 페이지의 Cafe24 옵션 메타데이터에서
  // 스냅샷으로 보관한다.
  function defaultVariantSnapshot(productCode) {
    var normalizedProductCode = cleanText(productCode).toUpperCase();
    var variantCode = normalizedProductCode + "000A";
    return PRODUCT_CODE_RE.test(normalizedProductCode) && VARIANT_CODE_RE.test(variantCode)
      ? { variantCode: variantCode, cafe24OptionValues: [] }
      : null;
  }

  function productVariantSnapshot(productNo, additional) {
    if (!productNo) return null;
    var productType = additional ? "addproduct_option" : "product_option";
    var selects = document.querySelectorAll(
      'select[product_type="' + productType + '"][option_product_no="' + productNo + '"]',
    );
    if (!selects.length) return additional ? null : defaultVariantSnapshot(window.sProductCode);

    var optionType = cleanText(selects[0].getAttribute("option_type")).toUpperCase();
    var selectedValues = [];
    var linkedOptionValues = [];
    for (var i = 0; i < selects.length; i += 1) {
      var select = selects[i];
      var rawValue = cleanText(select.value);
      var selected = select.options && select.selectedIndex >= 0
        ? select.options[select.selectedIndex]
        : null;
      var selectedValue = cleanText(selected ? selected.value : rawValue);
      if (!selectedValue || selectedValue === "*" || selectedValue === "**") return null;
      selectedValues.push(selectedValue);

      if (optionType === "E") {
        var optionCode = cleanText(select.getAttribute("option_code")).toUpperCase();
        var valueNo = parsePositiveInt(rawValue, 0);
        if (!OPTION_CODE_RE.test(optionCode) || !valueNo) return null;
        linkedOptionValues.push({ optionCode: optionCode, valueNo: valueNo });
      }
    }

    if (optionType === "E") {
      if (additional) return null;
      var linkedSnapshot = defaultVariantSnapshot(window.sProductCode);
      if (!linkedSnapshot) return null;
      linkedSnapshot.cafe24OptionValues = linkedOptionValues;
      return linkedSnapshot;
    }

    if (optionType !== "T") return null;
    if (selectedValues.length === 1 && VARIANT_CODE_RE.test(selectedValues[0].toUpperCase())) {
      return { variantCode: selectedValues[0].toUpperCase(), cafe24OptionValues: [] };
    }
    var mapper = window.option_value_mapper;
    if (typeof mapper === "string") {
      try {
        mapper = JSON.parse(mapper);
      } catch {
        return null;
      }
    }
    if (!mapper || typeof mapper !== "object") return null;
    var variantCode = cleanText(mapper[selectedValues.join("#$%")]).toUpperCase();
    return VARIANT_CODE_RE.test(variantCode)
      ? { variantCode: variantCode, cafe24OptionValues: [] }
      : null;
  }

  function optionTextKey(value) {
    return normalizeKey(
      cleanText(value).replace(/\(\+\s*[\d,]+\s*원?\)/g, ""),
    );
  }

  function selectedOptionTexts(productOptions) {
    var text = cleanText(productOptions);
    var bracket = text.match(/\[옵션\s*:\s*([^\]]+)\]/);
    if (bracket) text = bracket[1];
    return text.split("/").map(cleanText).filter(Boolean);
  }

  // 이미 담겨 있던 장바구니는 상품 상세에서 클릭한 이력이 없어 스냅샷이 없다.
  // 이 경우에도 공개 상품 화면에 있는 연동 옵션 코드/값 번호만 읽어 복원한다.
  // 관리자 API나 장바구니·주문 API는 호출하지 않으며, 하나라도 모호하면 비워 둔다.
  function skinPrefix() {
    var pathMatch = window.location.pathname.match(/^\/skin-skin\d+/);
    if (pathMatch) return pathMatch[0];

    var scripts = document.getElementsByTagName("script");
    for (var index = 0; index < scripts.length; index += 1) {
      var source = cleanText(scripts[index].src);
      var sourceMatch = source.match(/\/skin-skin\d+(?=\/)/);
      if (sourceMatch) return sourceMatch[0];
    }
    return null;
  }

  function parsePublicVariantMapper(html) {
    var mapperMatch = html.match(
      /\boption_value_mapper\s*=\s*(['"])((?:\\.|[\s\S])*?)\1\s*;/,
    );
    if (!mapperMatch) return null;
    try {
      var decoded = JSON.parse('"' + mapperMatch[2] + '"');
      var parsed = JSON.parse(decoded);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? parsed
        : null;
    } catch {
      return null;
    }
  }

  // 장바구니는 사람이 읽는 옵션 문구만 남기므로, 이전 장바구니에도 공개 상품
  // 페이지의 실제 Cafe24 메타데이터로 스냅샷을 복원한다. 하나라도 일치하지
  // 않으면 비워 둬 주문 대상을 추측하지 않는다.
  function publicProductSnapshot(productNo, productOptions) {
    var skin = skinPrefix();
    if (!productNo || !skin) return Promise.resolve(null);
    var productUrl = skin + "/product/detail.html?product_no=" + encodeURIComponent(productNo);

    return originalFetch.call(window, productUrl, {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
      headers: { Accept: "text/html" },
    }).then(function (response) {
      if (!response || !response.ok) return null;
      return response.text();
    }).then(function (html) {
      if (!html) return null;
      var productCodeMatch = html.match(/\bsProductCode\s*=\s*['"]([A-Za-z0-9]+)['"]/);
      var productCode = cleanText(productCodeMatch ? productCodeMatch[1] : "").toUpperCase();
      var defaultSnapshot = defaultVariantSnapshot(productCode);

      var doc = new window.DOMParser().parseFromString(html, "text/html");
      var selects = Array.prototype.slice.call(doc.querySelectorAll(
        'select[product_type="product_option"][option_product_no="' + productNo + '"]',
      )).sort(function (left, right) {
        return parsePositiveInt(left.getAttribute("option_sort_no"), 0) -
          parsePositiveInt(right.getAttribute("option_sort_no"), 0);
      });
      if (!selects.length) return defaultSnapshot;

      var selectedTexts = selectedOptionTexts(productOptions);
      if (selects.length !== selectedTexts.length) return null;
      var optionType = cleanText(selects[0].getAttribute("option_type")).toUpperCase();

      if (optionType === "E") {
        if (!defaultSnapshot) return null;
        var optionValues = [];
        for (var index = 0; index < selects.length; index += 1) {
          var select = selects[index];
          var optionCode = cleanText(select.getAttribute("option_code")).toUpperCase();
          var target = optionTextKey(selectedTexts[index]);
          var matches = [];
          Array.prototype.forEach.call(select.options || [], function (option) {
            if (optionTextKey(option.textContent) === target) matches.push(option);
          });
          if (!OPTION_CODE_RE.test(optionCode) || !target || matches.length !== 1) return null;
          var valueNo = parsePositiveInt(matches[0].value, 0);
          if (!valueNo) return null;
          optionValues.push({ optionCode: optionCode, valueNo: valueNo });
        }
        return {
          variantCode: defaultSnapshot.variantCode,
          cafe24OptionValues: optionValues,
        };
      }

      if (optionType !== "T") return null;
      var mapper = parsePublicVariantMapper(html);
      if (!mapper) return null;

      var normalizedSelections = selectedTexts.map(optionTextKey);
      var variantMatches = [];
      Object.keys(mapper).forEach(function (key) {
        var values = key.split("#$%");
        if (values.length !== normalizedSelections.length) return;
        for (var index = 0; index < values.length; index += 1) {
          if (optionTextKey(values[index]) !== normalizedSelections[index]) return;
        }
        var variantCode = cleanText(mapper[key]).toUpperCase();
        if (VARIANT_CODE_RE.test(variantCode)) variantMatches.push(variantCode);
      });
      return variantMatches.length === 1
        ? { variantCode: variantMatches[0], cafe24OptionValues: [] }
        : null;
    }).catch(function () {
      return null;
    });
  }

  function resolveMissingSnapshots(items) {
    if (!Array.isArray(items)) return Promise.resolve(items);
    return Promise.all(items.map(function (item) {
      if (
        !item ||
        VARIANT_CODE_RE.test(cleanText(item.variantCode).toUpperCase())
      ) {
        return item;
      }
      return publicProductSnapshot(parsePositiveInt(item.productNo, 0), item.productOptions)
        .then(function (snapshot) {
          return snapshot ? applyCapturedSnapshot(item, snapshot) : item;
        });
    }));
  }

  function readSelectedRow(row, additional) {
    var text = rowNameAndOptions(row);
    var quantity = row.querySelector(
      ".quantity input[type='text'], .quantity input[type='number']",
    );
    var price = row.querySelector(".option_box_price, .add_product_option_box_price");
    var unitPrice = parseMoney(price ? price.value : "");
    if (!unitPrice) {
      unitPrice = parseMoney(row.querySelector("td.right") ? row.querySelector("td.right").textContent : "");
    }
    var productNo = productNoFromRow(row);
    var snapshot = productVariantSnapshot(productNo, additional);
    return {
      productNo: productNo,
      productName: text.name,
      productOptions: text.options,
      variantCode: snapshot ? snapshot.variantCode : null,
      cafe24OptionValues: snapshot ? snapshot.cafe24OptionValues : [],
      qty: parsePositiveInt(quantity ? quantity.value : "", 1),
      unitPrice: unitPrice,
      isAdditional: additional,
    };
  }

  function loadGroups() {
    try {
      var parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
      if (!Array.isArray(parsed)) return [];
      var now = Date.now();
      return parsed.filter(function (group) {
        return group && now - Number(group.capturedAt || 0) <= MAX_AGE_MS;
      });
    } catch {
      return [];
    }
  }

  function saveGroups(groups) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(groups.slice(-50)));
    } catch {
      // Storage can be blocked in an embedded Cafe24 preview. The quote flow still works
      // without parent reconstruction, so do not interrupt the native basket action.
    }
  }

  function sameItem(left, right) {
    var leftNo = parsePositiveInt(left && left.productNo, 0);
    var rightNo = parsePositiveInt(right && right.productNo, 0);
    if (leftNo && rightNo) {
      if (leftNo !== rightNo) return false;
      var leftOptions = normalizeKey(left && left.productOptions);
      var rightOptions = normalizeKey(right && right.productOptions);
      return !leftOptions || !rightOptions || leftOptions === rightOptions;
    }
    return normalizeKey(left && left.productName) === normalizeKey(right && right.productName);
  }

  function copyItem(item) {
    var copy = {};
    Object.keys(item || {}).forEach(function (key) {
      copy[key] = item[key];
    });
    return copy;
  }

  function applyCapturedSnapshot(item, captured) {
    var next = copyItem(item);
    if (!captured || !VARIANT_CODE_RE.test(cleanText(captured.variantCode).toUpperCase())) {
      return next;
    }
    if (!VARIANT_CODE_RE.test(cleanText(next.variantCode).toUpperCase())) {
      next.variantCode = cleanText(captured.variantCode).toUpperCase();
    }
    if (
      (!Array.isArray(next.cafe24OptionValues) || next.cafe24OptionValues.length === 0) &&
      Array.isArray(captured.cafe24OptionValues) &&
      captured.cafe24OptionValues.length > 0
    ) {
      next.cafe24OptionValues = captured.cafe24OptionValues.map(function (option) {
        return { optionCode: option.optionCode, valueNo: option.valueNo };
      });
    }
    return next;
  }

  function captureSelection() {
    var totalProducts = document.getElementById("totalProducts");
    if (!totalProducts) return;
    var mainRows = totalProducts.querySelectorAll("tbody.option_products > tr.option_product");
    var additionalRows = totalProducts.querySelectorAll("tbody.add_products > tr.add_product");
    if (mainRows.length !== 1) return;

    var main = readSelectedRow(mainRows[0], false);
    if (!main.productName) return;
    var additions = [];
    Array.prototype.forEach.call(additionalRows, function (row) {
      var item = readSelectedRow(row, true);
      if (item.productName) additions.push(item);
    });

    var groups = loadGroups();
    groups.push({
      capturedAt: Date.now(),
      main: main,
      additions: additions,
    });
    saveGroups(groups);
    lastCapturedAt = Date.now();
  }

  function findUnusedMainIndex(items, group, used) {
    for (var index = 0; index < items.length; index += 1) {
      if (used[index] || items[index].isAdditional) continue;
      if (sameItem(items[index], group.main)) return index;
    }
    return -1;
  }

  function findAdditionalIndex(items, target) {
    for (var index = 0; index < items.length; index += 1) {
      if (!items[index].isAdditional) continue;
      if (sameItem(items[index], target)) return index;
    }
    return -1;
  }

  function reconcileItems(items, groups) {
    if (!Array.isArray(items) || !items.length || !Array.isArray(groups) || !groups.length) {
      return items;
    }

    var usedMains = {};
    var allocations = {};
    var capturedMains = {};
    var remaining = {};
    items.forEach(function (item, index) {
      if (item.isAdditional) remaining[index] = parsePositiveInt(item.qty, 1);
    });

    groups.forEach(function (group) {
      var mainIndex = findUnusedMainIndex(items, group, usedMains);
      if (mainIndex < 0) return;
      var groupAllocations = [];
      (group.additions || []).forEach(function (addition) {
        var additionalIndex = findAdditionalIndex(items, addition);
        if (additionalIndex < 0 || remaining[additionalIndex] <= 0) return;
        var requested = parsePositiveInt(addition.qty, 1);
        var allocated = Math.min(requested, remaining[additionalIndex]);
        if (allocated <= 0) return;
        remaining[additionalIndex] -= allocated;
        groupAllocations.push({
          itemIndex: additionalIndex,
          qty: allocated,
          captured: addition,
        });
      });
      usedMains[mainIndex] = true;
      capturedMains[mainIndex] = group.main;
      allocations[mainIndex] = groupAllocations;
    });

    var result = [];
    items.forEach(function (item, index) {
      if (item.isAdditional) return;
      var parentSortOrder = result.length;
      result.push(applyCapturedSnapshot(item, capturedMains[index]));
      (allocations[index] || []).forEach(function (allocation) {
        var source = items[allocation.itemIndex];
        var split = applyCapturedSnapshot(source, allocation.captured);
        split.qty = allocation.qty;
        split.parentSortOrder = parentSortOrder;
        result.push(split);
      });
    });

    items.forEach(function (item, index) {
      if (!item.isAdditional || remaining[index] <= 0) return;
      var leftover = {};
      Object.keys(item).forEach(function (key) {
        leftover[key] = item[key];
      });
      leftover.qty = remaining[index];
      leftover.parentSortOrder = null;
      result.push(leftover);
    });
    return result;
  }

  function isQuoteRequest(input, init) {
    var url = typeof input === "string" ? input : input && input.url;
    var method = cleanText((init && init.method) || (input && input.method) || "GET").toUpperCase();
    if (method !== "POST" || !url) return false;
    try {
      return new URL(url, window.location.href).pathname === "/api/quote-requests";
    } catch {
      return false;
    }
  }

  function requestWithBody(input, init, body) {
    var nextInit = {};
    Object.keys(init || {}).forEach(function (key) {
      nextInit[key] = init[key];
    });
    nextInit.body = body;
    return { input: input, init: nextInit };
  }

  document.addEventListener(
    "click",
    function (event) {
      var target = event.target && event.target.closest
        ? event.target.closest(".actionCart, #actionCart")
        : null;
      if (target) captureSelection();
    },
    true,
  );

  window.alert = function (message) {
    var text = cleanText(message);
    var duplicateNotice =
      /장바구니/.test(text) &&
      /(이미|동일|중복)/.test(text) &&
      /(상품|추가)/.test(text);
    if (duplicateNotice && Date.now() - lastCapturedAt <= RECENT_CAPTURE_MS) return;
    return originalAlert.apply(window, arguments);
  };

  window.fetch = function (input, init) {
    if (!isQuoteRequest(input, init) || !init || typeof init.body !== "string") {
      return originalFetch.apply(window, arguments);
    }
    try {
      var payload = JSON.parse(init.body);
      var groups = loadGroups();
      if (!payload || !Array.isArray(payload.items)) {
        return originalFetch.apply(window, arguments);
      }
      payload.items = reconcileItems(payload.items, groups);
      return resolveMissingSnapshots(payload.items).then(function (items) {
        payload.items = items;
        var next = requestWithBody(input, init, JSON.stringify(payload));
        return originalFetch.call(window, next.input, next.init);
      }).then(function (response) {
        if (response && response.ok && groups.length) saveGroups([]);
        return response;
      });
    } catch {
      return originalFetch.apply(window, arguments);
    }
  };

  window.ND_QUOTE_PARENT = {
    captureSelection: captureSelection,
    reconcileItems: reconcileItems,
    loadGroups: loadGroups,
    clear: function () {
      saveGroups([]);
    },
  };
})();

