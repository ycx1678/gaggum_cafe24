(function () {
  "use strict";

  var STORAGE_KEY = "gaggum_quote_parent_groups_v183";
  var MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
  var RECENT_CAPTURE_MS = 5000;
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
    return {
      productNo: productNoFromRow(row),
      productName: text.name,
      productOptions: text.options,
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
    if (leftNo && rightNo) return leftNo === rightNo;
    return normalizeKey(left && left.productName) === normalizeKey(right && right.productName);
  }

  function captureSelection() {
    var totalProducts = document.getElementById("totalProducts");
    if (!totalProducts) return;
    var mainRows = totalProducts.querySelectorAll("tbody.option_products > tr.option_product");
    var additionalRows = totalProducts.querySelectorAll("tbody.add_products > tr.add_product");
    if (mainRows.length !== 1 || additionalRows.length === 0) return;

    var main = readSelectedRow(mainRows[0], false);
    if (!main.productName) return;
    var additions = [];
    Array.prototype.forEach.call(additionalRows, function (row) {
      var item = readSelectedRow(row, true);
      if (item.productName) additions.push(item);
    });
    if (!additions.length) return;

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
        });
      });
      if (!groupAllocations.length) return;
      usedMains[mainIndex] = true;
      allocations[mainIndex] = groupAllocations;
    });

    var result = [];
    items.forEach(function (item, index) {
      if (item.isAdditional) return;
      var parentSortOrder = result.length;
      result.push(item);
      (allocations[index] || []).forEach(function (allocation) {
        var source = items[allocation.itemIndex];
        var split = {};
        Object.keys(source).forEach(function (key) {
          split[key] = source[key];
        });
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
      if (!payload || !Array.isArray(payload.items) || !groups.length) {
        return originalFetch.apply(window, arguments);
      }
      payload.items = reconcileItems(payload.items, groups);
      var next = requestWithBody(input, init, JSON.stringify(payload));
      return originalFetch.call(window, next.input, next.init).then(function (response) {
        if (response && response.ok) saveGroups([]);
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
