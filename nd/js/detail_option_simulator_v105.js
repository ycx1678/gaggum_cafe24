(function(){
    "use strict";

    var ASSET_VERSION = "20260518v105";
    var mobileScrollY = 0;

    function onReady(callback){
        if(document.readyState === "loading"){
            document.addEventListener("DOMContentLoaded", callback);
            return;
        }
        callback();
    }

    function toArray(list){
        return Array.prototype.slice.call(list || []);
    }

    function cleanText(text){
        return String(text || "")
            .replace(/^\uFEFF/, "")
            .replace(/\[[^\]]*\]/g, "")
            .replace(/\([^)]*\)/g, "")
            .replace(/\s+/g, "")
            .toLowerCase();
    }

    function trimText(text){
        return String(text || "").replace(/^\uFEFF/, "").replace(/^\s+|\s+$/g, "");
    }

    function splitTokens(text){
        return trimText(text).split("|").map(trimText).filter(Boolean);
    }

    function isTruthy(text){
        var value = cleanText(text);
        return value === "y" || value === "yes" || value === "true" || value === "1" || value === "기본" || value === "사용";
    }

    function slugify(text, fallback){
        var value = cleanText(text).replace(/[^a-z0-9가-힣_-]/g, "");
        return value || fallback || "item";
    }

    function getProductNo(){
        var knownGlobals = ["iProductNo", "product_no", "productNo"];
        for(var i = 0; i < knownGlobals.length; i += 1){
            if(window[knownGlobals[i]]) return String(window[knownGlobals[i]]);
        }

        if(window.EC_FRONT_JS_CONFIG_MANAGE && window.EC_FRONT_JS_CONFIG_MANAGE.sProductNo){
            return String(window.EC_FRONT_JS_CONFIG_MANAGE.sProductNo);
        }

        var queryMatch = window.location.search.match(/[?&]product_no=([^&]+)/);
        if(queryMatch) return decodeURIComponent(queryMatch[1]);

        var pathMatch = window.location.pathname.match(/\/product\/[^/]+\/(\d+)\//);
        return pathMatch ? pathMatch[1] : "";
    }

    function getProductName(){
        var title = document.querySelector(".xans-product-detail .headingArea h1");
        return title ? title.textContent : "";
    }

    function hasDemoFlag(){
        return /(?:\?|&)nd_simulator_demo=1(?:&|$)/.test(window.location.search);
    }

    function getBackofficeApiBase(){
        var value = window.ND_OPTION_SIMULATOR_API_BASE ||
            (window.ND_OPTION_SIMULATOR && window.ND_OPTION_SIMULATOR.apiBase) ||
            "";
        return trimText(value).replace(/\/+$/, "");
    }

    function getBackofficeApiUrl(){
        var base = getBackofficeApiBase();
        var productNo = getProductNo();
        if(!base || !productNo) return "";
        return base + "/api/simulators/" + encodeURIComponent(productNo);
    }

    function allowsLegacyFallbackWithApi(){
        return window.ND_OPTION_SIMULATOR_ALLOW_LEGACY_FALLBACK === true;
    }

    function fetchJson(url, callback){
        if(!url || typeof window.fetch !== "function"){
            callback(null, false);
            return;
        }
        window.fetch(url, { cache: "no-store", credentials: "omit" }).then(function(response){
            if(!response || !response.ok){
                callback(null, false);
                return null;
            }
            return response.json();
        }).then(function(json){
            if(json === null || json === undefined) return;
            callback(json, true);
        }).catch(function(){
            callback(null, false);
        });
    }

    function isDisabledApiConfig(payload){
        if(!payload) return false;
        if(payload.enabled === false) return true;
        if(payload.enabled !== undefined && payload.enabled !== null && payload.enabled !== ""){
            var value = cleanText(payload.enabled);
            return value === "n" || value === "no" || value === "false" || value === "0" || value === "미사용";
        }
        return false;
    }

    function lockMobilePageScroll(){
        if(!document.body || ((window.innerWidth || document.documentElement.clientWidth || 0) > 1024) || document.body.classList.contains("nd-mobile-scroll-locked")) return;
        mobileScrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
        document.body.style.top = (-mobileScrollY) + "px";
        document.body.classList.add("nd-mobile-scroll-locked");
    }

    function unlockMobilePageScroll(){
        if(!document.body || !document.body.classList.contains("nd-mobile-scroll-locked")) return;
        var restoreY = mobileScrollY || Math.abs(parseInt(document.body.style.top || "0", 10)) || 0;
        document.body.classList.remove("nd-mobile-scroll-locked");
        document.body.style.top = "";
        window.scrollTo(0, restoreY);
    }

    function unwrapApiPayload(payload){
        if(payload && payload.data && typeof payload.data === "object"){
            return payload.data;
        }
        return payload;
    }

    function normalizeApiOption(groupKey, item){
        var raw = item && typeof item === "object" ? item : { label: item };
        var label = trimText(raw.label || raw.name || raw.value || raw.text);
        if(!label) return null;
        return {
            value: String(raw.value || raw.key || slugify(label, groupKey + "_option")),
            label: label,
            matchLabels: [label].concat(raw.matchLabels || raw.aliases || []),
            image: raw.image || raw.imageUrl || raw.src || "",
            swatch: raw.swatch || raw.color || ""
        };
    }

    function normalizeApiGroup(group, index){
        if(!group) return null;
        var label = trimText(group.label || group.name || group.key);
        if(!label) return null;
        var key = trimText(group.key || slugify(label, "group_" + index));
        var rawOptions = group.options || group.values || group.items || [];
        var options = toArray(rawOptions).map(function(item){
            return normalizeApiOption(key, item);
        }).filter(Boolean);
        if(!options.length) return null;
        return {
            key: key,
            label: label,
            aliases: [key].concat(group.aliases || group.names || []),
            optionIndex: typeof group.optionIndex === "number" ? group.optionIndex : index,
            order: typeof group.order === "number" ? group.order : index,
            defaultValue: trimText(group.defaultValue || group.default || (options[0] && options[0].value)),
            options: options
        };
    }

    function buildApiGroupLookup(groups){
        var lookup = {};
        groups.forEach(function(group){
            [group.key, group.label].concat(group.aliases || []).forEach(function(name){
                var token = cleanText(name);
                if(token) lookup[token] = group;
            });
        });
        return lookup;
    }

    function normalizeApiConditionValues(value){
        if(value === undefined || value === null || value === "") return [];
        if(Object.prototype.toString.call(value) === "[object Array]"){
            return value.map(function(item){
                return trimText(item && typeof item === "object" ? (item.label || item.value || item.name) : item);
            }).filter(Boolean);
        }
        return splitTokens(String(value).replace(/\n/g, "|"));
    }

    function normalizeApiRule(rule, index, groupLookup){
        if(!rule) return null;
        var image = trimText(rule.image || rule.imageUrl || rule.url || rule.src);
        if(!image) return null;
        var rawConditions = rule.when || rule.conditions || rule.match || {};
        var conditions = {};

        Object.keys(rawConditions).forEach(function(name){
            var group = groupLookup[cleanText(name)];
            if(!group) return;
            var values = normalizeApiConditionValues(rawConditions[name]);
            if(!values.length) return;
            conditions[group.key] = values.map(function(value){
                return {
                    label: value,
                    token: cleanText(value)
                };
            }).filter(function(value){
                return !!value.token;
            });
        });

        return {
            key: trimText(rule.layer || rule.layerKey || rule.key || "api-composite"),
            order: typeof rule.order === "number" ? rule.order : index,
            image: image,
            conditions: conditions
        };
    }

    function normalizeApiConfig(payload){
        payload = unwrapApiPayload(payload);
        if(!payload || typeof payload !== "object") return null;
        if(isDisabledApiConfig(payload)){
            return { disabled: true };
        }

        var groups = toArray(payload.groups || payload.optionGroups || []).map(normalizeApiGroup).filter(Boolean);
        if(!groups.length) return null;

        var groupLookup = buildApiGroupLookup(groups);
        var rules = toArray(payload.rules || payload.images || payload.combinations || []).map(function(rule, index){
            return normalizeApiRule(rule, index, groupLookup);
        }).filter(Boolean);

        return {
            productFamily: "backoffice",
            apiManaged: true,
            productNo: trimText(payload.productNo || payload.product_no || getProductNo()),
            showOnLoad: false,
            skipAssetCheck: payload.skipAssetCheck === true,
            baseImage: trimText(payload.baseImage || ""),
            defaultImage: trimText(payload.defaultImage || payload.fallbackImage || ""),
            groups: groups,
            csvRules: rules
        };
    }

    function parseCsvRows(text){
        var rows = [];
        var row = [];
        var field = "";
        var insideQuotes = false;
        var source = String(text || "").replace(/^\uFEFF/, "");

        for(var i = 0; i < source.length; i += 1){
            var char = source.charAt(i);
            var next = source.charAt(i + 1);

            if(char === '"'){
                if(insideQuotes && next === '"'){
                    field += '"';
                    i += 1;
                } else {
                    insideQuotes = !insideQuotes;
                }
                continue;
            }

            if(char === "," && !insideQuotes){
                row.push(field);
                field = "";
                continue;
            }

            if((char === "\n" || char === "\r") && !insideQuotes){
                if(char === "\r" && next === "\n"){
                    i += 1;
                }
                row.push(field);
                if(row.some(function(value){ return trimText(value); })){
                    rows.push(row);
                }
                row = [];
                field = "";
                continue;
            }

            field += char;
        }

        row.push(field);
        if(row.some(function(value){ return trimText(value); })){
            rows.push(row);
        }
        return rows;
    }

    function csvOptionValue(label){
        return "csv_" + slugify(label, "option");
    }

    function getProductCsvPaths(){
        var productNo = getProductNo();
        if(!productNo) return [];
        return [
            "/web/upload/simulator/" + productNo + "/simulator.csv",
            "/web/upload/simulator/products/" + productNo + "/simulator.csv",
            "/nd/images/simulator/products/" + productNo + "/simulator.csv"
        ];
    }

    function normalizeCsvImagePath(path, csvBasePath){
        var image = trimText(path);
        var productNo = getProductNo();
        var basePath = csvBasePath || (productNo ? "/nd/images/simulator/products/" + productNo + "/" : "/nd/images/simulator/products/");
        if(!image) return "";
        if(image.indexOf("http") === 0 || image.indexOf("//") === 0 || image.charAt(0) === "/"){
            return image;
        }
        return basePath + image.replace(/^\/+/, "");
    }

    function getCsvBasePath(src){
        src = trimText(src).split("#")[0].split("?")[0];
        if(!src) return "";
        return src.slice(0, src.lastIndexOf("/") + 1);
    }

    function parseProductCsvConfig(text, csvBasePath){
        var rows = parseCsvRows(text);
        if(rows.length < 2) return null;

        var headers = rows[0].map(trimText);
        var fixed = {};
        var optionColumns = [];
        var fixedHeaderNames = {
            layer: ["layer", "레이어"],
            order: ["order", "순서", "zindex", "z-index"],
            image: ["image", "imagepath", "이미지", "이미지경로", "파일", "파일명"],
            defaultValue: ["default", "기본", "기본값", "defaultvalue"],
            enabled: ["enabled", "사용", "활성"]
        };

        headers.forEach(function(header, index){
            var token = cleanText(header);
            var matchedKey = "";
            Object.keys(fixedHeaderNames).some(function(key){
                if(fixedHeaderNames[key].map(cleanText).indexOf(token) > -1){
                    matchedKey = key;
                    return true;
                }
                return false;
            });
            if(matchedKey){
                fixed[matchedKey] = index;
            } else if(header){
                optionColumns.push({ index: index, header: header });
            }
        });

        if(fixed.layer === undefined || fixed.image === undefined || !optionColumns.length){
            return null;
        }

        var groupMap = {};
        var groups = optionColumns.map(function(column, index){
            var aliases = splitTokens(column.header);
            var label = aliases.shift() || column.header;
            var key = "csv_" + index + "_" + slugify(label, "group");
            var group = {
                key: key,
                label: label,
                aliases: [label].concat(aliases),
                order: index,
                options: [],
                defaultValue: ""
            };
            groupMap[column.index] = group;
            return group;
        });

        var optionSeen = {};
        var defaultRows = [];
        var rules = [];

        rows.slice(1).forEach(function(row, rowIndex){
            var isEnabled = fixed.enabled === undefined || !trimText(row[fixed.enabled]) || isTruthy(row[fixed.enabled]);
            var layer = trimText(row[fixed.layer]);
            var image = normalizeCsvImagePath(row[fixed.image], csvBasePath);
            if(!isEnabled || !layer || !image) return;

            var rule = {
                key: layer,
                order: fixed.order !== undefined && trimText(row[fixed.order]) ? parseInt(row[fixed.order], 10) || 0 : rowIndex,
                image: image,
                conditions: {},
                isDefault: fixed.defaultValue !== undefined && isTruthy(row[fixed.defaultValue])
            };

            optionColumns.forEach(function(column){
                var group = groupMap[column.index];
                var values = splitTokens(row[column.index]);
                if(!values.length) return;

                rule.conditions[group.key] = values.map(function(value){
                    return {
                        label: value,
                        token: cleanText(value)
                    };
                }).filter(function(value){
                    return !!value.token;
                });

                values.forEach(function(value){
                    var optionKey = group.key + "::" + cleanText(value);
                    if(!cleanText(value) || optionSeen[optionKey]) return;
                    optionSeen[optionKey] = true;
                    group.options.push({
                        value: csvOptionValue(value),
                        label: value,
                        matchLabels: [value]
                    });
                });
            });

            if(rule.isDefault){
                defaultRows.push(rule);
            }
            rules.push(rule);
        });

        groups.forEach(function(group){
            var defaultRule = defaultRows.filter(function(rule){
                return rule.conditions[group.key] && rule.conditions[group.key].length;
            })[0];
            if(defaultRule){
                group.defaultValue = csvOptionValue(defaultRule.conditions[group.key][0].label);
            } else if(group.options[0]){
                group.defaultValue = group.options[0].value;
            }
        });

        rules = rules.filter(function(rule){
            return Object.keys(rule.conditions).length > 0;
        });

        if(!rules.length || !groups.some(function(group){ return group.options.length; })){
            return null;
        }

        return {
            productFamily: "csv",
            csvManaged: true,
            showOnLoad: false,
            skipAssetCheck: false,
            groups: groups,
            csvRules: rules
        };
    }

    function getFetchCandidates(src){
        return getAssetCandidates(src);
    }

    function fetchTextCandidates(candidates, callback){
        var index = 0;

        function next(){
            var src = candidates[index];
            if(!src || typeof window.fetch !== "function"){
                callback(null);
                return;
            }

            window.fetch(src, { cache: "no-store", credentials: "same-origin" }).then(function(response){
                if(!response || !response.ok){
                    index += 1;
                    next();
                    return null;
                }
                return response.text();
            }).then(function(text){
                if(text === null || text === undefined) return;
                callback(text, src);
            }).catch(function(){
                index += 1;
                next();
            });
        }

        if(!candidates || !candidates.length){
            callback(null);
            return;
        }
        next();
    }

    function resolveLegacyConfigAsync(callback){
        var csvPaths = getProductCsvPaths();
        if(!csvPaths.length || typeof window.fetch !== "function"){
            callback(resolveConfig());
            return;
        }

        var candidates = [];
        csvPaths.forEach(function(csvPath){
            candidates = candidates.concat(getFetchCandidates(csvPath));
        });

        fetchTextCandidates(candidates, function(text, src){
            var csvConfig = text ? parseProductCsvConfig(text, getCsvBasePath(src)) : null;
            callback(csvConfig || resolveConfig());
        });
    }

    function resolveConfigAsync(callback){
        var apiUrl = getBackofficeApiUrl();
        if(apiUrl){
            fetchJson(apiUrl, function(payload, ok){
                var apiConfig = ok ? normalizeApiConfig(payload) : null;
                if(apiConfig && apiConfig.disabled){
                    if(allowsLegacyFallbackWithApi()){
                        resolveLegacyConfigAsync(callback);
                        return;
                    }
                    callback(null);
                    return;
                }
                if(apiConfig){
                    callback(apiConfig);
                    return;
                }
                // The simulator must not disappear when the external backoffice
                // API is temporarily blocked by CORS/network policy. Keep the
                // Cafe24 page usable by falling back to the bundled/CSV config.
                resolveLegacyConfigAsync(callback);
            });
            return;
        }
        resolveLegacyConfigAsync(callback);
    }

    function resolveConfig(){
        var data = window.ND_OPTION_SIMULATOR || {};
        var productNo = getProductNo();
        if(productNo && data.products && data.products[productNo]){
            return data.products[productNo];
        }

        var productName = cleanText(getProductName());
        var productNameRules = toArray(data.productNameRules);
        for(var i = 0; i < productNameRules.length; i += 1){
            var rule = productNameRules[i] || {};
            var keywordGroups = toArray(rule.keywordGroups);
            if(!keywordGroups.length && rule.keywords){
                keywordGroups = [rule.keywords];
            }
            var isMatched = keywordGroups.some(function(group){
                var keywords = toArray(group).map(cleanText).filter(Boolean);
                return keywords.length > 0 && keywords.every(function(keyword){
                    return productName.indexOf(keyword) > -1;
                });
            });
            var isExcluded = toArray(rule.excludeKeywords).map(cleanText).filter(Boolean).some(function(keyword){
                return productName.indexOf(keyword) > -1;
            });
            if(isExcluded){
                isMatched = false;
            }
            if(isMatched){
                return rule.config || rule;
            }
        }

        if(hasDemoFlag() && window.ND_OPTION_SIMULATOR_DEMO){
            return window.ND_OPTION_SIMULATOR_DEMO;
        }
        return null;
    }

    function normalizeGroups(groups){
        return toArray(groups).filter(function(group){
            return group && group.key && group.label && group.options && group.options.length;
        }).map(function(group, index){
            group.order = typeof group.order === "number" ? group.order : index;
            group.options = toArray(group.options);
            return group;
        });
    }

    function getDefaultValue(group){
        var defaultValue = group.defaultValue || (group.options[0] && group.options[0].value);
        return defaultValue ? String(defaultValue) : "";
    }

    function findOptionByValue(group, value){
        var target = String(value || "");
        for(var i = 0; i < group.options.length; i += 1){
            if(String(group.options[i].value) === target) return group.options[i];
        }
        return group.options[0] || null;
    }

    function getGroupAliases(group){
        return [group.label].concat(group.aliases || []).map(cleanText).filter(Boolean);
    }

    function getOptionRows(){
        return toArray(document.querySelectorAll(
            ".xans-product-detail table.xans-product-option tbody > tr, " +
            ".xans-product-detail table[module='product_option'] tbody > tr"
        ));
    }

    function getOptionSelects(){
        return toArray(document.querySelectorAll(
            ".xans-product-detail table.xans-product-option select, " +
            ".xans-product-detail table[module='product_option'] select"
        ));
    }

    function findRowForGroup(group){
        var rows = getOptionRows();
        var aliases = getGroupAliases(group);

        for(var i = 0; i < rows.length; i += 1){
            var th = rows[i].querySelector("th");
            if(!th) continue;
            var rowLabel = cleanText(th.textContent);
            for(var a = 0; a < aliases.length; a += 1){
                if(rowLabel && aliases[a] && (rowLabel.indexOf(aliases[a]) > -1 || aliases[a].indexOf(rowLabel) > -1)){
                    return rows[i];
                }
            }
        }
        return null;
    }

    function findSelectForGroup(group){
        var row = findRowForGroup(group);
        if(row){
            return row.querySelector("select");
        }

        var selects = getOptionSelects();
        if(typeof group.optionIndex === "number" && selects[group.optionIndex]){
            return selects[group.optionIndex];
        }
        return null;
    }

    function getSelectedChoice(group){
        var row = findRowForGroup(group);
        var select = row ? row.querySelector("select") : findSelectForGroup(group);
        if(!select || select.selectedIndex < 0) return "";
        var option = select.options[select.selectedIndex];
        if(!option || !option.value || option.value === "*" || option.disabled) return "";
        var label = option.textContent || "";
        if(/[-–—─]{3,}/.test(label.replace(/\s/g, ""))) return "";
        return { label: label, value: option.value };
    }

    function getChoiceFromNativeControls(group){
        var row = findRowForGroup(group);
        if(!row) return getSelectedChoice(group);

        var selectedChoice = getSelectedChoice(group);
        if(selectedChoice) return selectedChoice;

        var checked = row.querySelector("input[type='radio']:checked, input[type='checkbox']:checked");
        if(checked){
            var labelNode = checked.closest ? checked.closest("label") : null;
            return {
                label: labelNode ? labelNode.textContent : (checked.getAttribute("title") || checked.value),
                value: checked.value || ""
            };
        }

        var selected = row.querySelector(".ec-product-selected, .selected, .on, .active");
        if(selected){
            return {
                label: selected.textContent || selected.getAttribute("title") || "",
                value: selected.getAttribute("option_value") ||
                    selected.getAttribute("data-value") ||
                    selected.getAttribute("value") ||
                    ""
            };
        }

        return "";
    }

    function matchOption(group, label, value){
        var labelToken = cleanText(label);
        var valueToken = cleanText(value);
        if(!labelToken && !valueToken) return null;

        for(var i = 0; i < group.options.length; i += 1){
            var option = group.options[i];
            var candidates = [option.value, option.label].concat(option.matchLabels || []).map(cleanText).filter(Boolean);
            for(var c = 0; c < candidates.length; c += 1){
                if(candidates[c] === valueToken || candidates[c] === labelToken) return option;
                if(labelToken && candidates[c] && (labelToken.indexOf(candidates[c]) > -1 || candidates[c].indexOf(labelToken) > -1)){
                    return option;
                }
            }
        }
        return null;
    }

    function dispatchNativeChange(select){
        if(!select) return;
        if(typeof Event === "function"){
            select.dispatchEvent(new Event("change", { bubbles: true }));
            return;
        }
        var event = document.createEvent("HTMLEvents");
        event.initEvent("change", true, false);
        select.dispatchEvent(event);
    }

    function getSkinPrefix(){
        var match = window.location.pathname.match(/^\/skin-[^/]+/);
        return match ? match[0] : "";
    }

    function getAssetCandidates(src){
        if(!src || src.indexOf("http") === 0 || src.indexOf("//") === 0){
            return src ? [src] : [];
        }

        var prefix = getSkinPrefix();
        if(src.indexOf("/web/upload/simulator/") === 0){
            var mappedSrc = src.replace("/web/upload/simulator/", "/nd/images/simulator/products/");
            var mappedCandidates = [];
            if(prefix){
                mappedCandidates.push(addAssetVersion(prefix + mappedSrc));
            }
            mappedCandidates.push(addAssetVersion(mappedSrc));
            mappedCandidates.push(addAssetVersion(src));
            return mappedCandidates;
        }
        if(prefix && src.indexOf("/nd/") === 0){
            var previewSrc = addAssetVersion(prefix + src);
            return [previewSrc, addRetryVersion(previewSrc), addAssetVersion(src)];
        }
        if(!prefix && src.indexOf("/nd/") === 0){
            return [src, "/skin-skin16" + src].map(addAssetVersion);
        }
        return [src].map(addAssetVersion);
    }

    function addAssetVersion(src){
        if(!src || src.indexOf("/nd/images/simulator/") === -1){
            return src;
        }
        if(/[?&]v=/.test(src)){
            return src;
        }
        return src + (src.indexOf("?") > -1 ? "&" : "?") + "v=" + ASSET_VERSION;
    }

    function addRetryVersion(src){
        if(!src || /[?&]retry=/.test(src)){
            return src;
        }
        return src + (src.indexOf("?") > -1 ? "&" : "?") + "retry=1";
    }

    function setImageWithFallback(image, src){
        var candidates = getAssetCandidates(src);
        var index = 0;
        if(!image || !candidates.length) return;

        image.onload = function(){
            image.hidden = false;
            image.style.display = "";
            image.removeAttribute("data-load-failed");
        };
        image.onerror = function(){
            index += 1;
            if(index < candidates.length){
                image.src = candidates[index];
                return;
            }
            image.hidden = true;
            image.style.display = "none";
            image.setAttribute("data-load-failed", "true");
        };
        image.src = candidates[0];
    }

    function applyNativeSelection(group, option){
        var select = findSelectForGroup(group);
        if(!select || !option) return false;

        var matchedValue = "";
        for(var i = 0; i < select.options.length; i += 1){
            var item = select.options[i];
            if(!item || !item.value || item.value === "*" || item.disabled) continue;
            if(matchOption(group, item.textContent, item.value) === option){
                matchedValue = item.value;
                break;
            }
        }

        if(!matchedValue) return false;
        select.value = matchedValue;
        dispatchNativeChange(select);
        return true;
    }

    onReady(function(){
        var root = document.querySelector("[data-nd-simulator]");
        var infoArea = document.querySelector(".xans-product-detail .infoArea");
        var infoInner = document.querySelector(".xans-product-detail .infoArea .info_inner");
        var imageWrap = root && root.closest ? root.closest(".prd_img_wrap") : null;
        var imageHost = imageWrap ? (imageWrap.querySelector(".viewer") || imageWrap) : null;

        if(!root || !infoArea || !infoInner) return;

        resolveConfigAsync(function(config){
        if(!config) return;

        var groups = normalizeGroups(config.groups);
        if(!groups.length) return;

        var state = {};
        var dock = null;
        var toggleButton = null;
        var panel = null;
        var previewStage = null;
        var previewCaption = null;
        var imagePreview = null;
        var imagePreviewStage = null;
        var imagePreviewCaption = null;
        var mobileBar = null;
        var detailArea = document.querySelector(".xans-product-detail .detailArea");

        groups.forEach(function(group){
            state[group.key] = getDefaultValue(group);
        });

        function getOptionTable(){
            return document.querySelector(".xans-product-detail table.xans-product-option, .xans-product-detail table[module='product_option']");
        }

        function isMobile(){
            return window.matchMedia && window.matchMedia("(max-width: 1024px)").matches;
        }

        function isMobileOptionLayerOpen(){
            return !!(document.body && document.body.classList.contains("nd-mobile-option-layer-active"));
        }

        function isFloatingOptionActive(){
            return !!(document.body && document.body.classList.contains("nd-option-floating-active") && infoArea && infoArea.classList.contains("nd-detail-floating"));
        }

        function shouldUseDockPanel(){
            return isFloatingOptionActive() || isMobileOptionLayerOpen();
        }

        function createDock(){
            dock = document.createElement("div");
            dock.className = "ndSimulatorDock";
            dock.hidden = true;
            dock.setAttribute("aria-live", "polite");
            dock.innerHTML = [
                '<button type="button" class="ndSimulatorDock__toggle" aria-expanded="false">',
                '<span>옵션 시뮬레이터 보기</span>',
                '<i class="xi-angle-right-thin" aria-hidden="true"></i>',
                '</button>',
                '<div class="ndSimulatorPanel" hidden>',
                '<button type="button" class="ndSimulatorPanel__close" aria-label="옵션 시뮬레이터 닫기"><i class="xi-close" aria-hidden="true"></i></button>',
                '<div class="ndSimulatorPanel__stage"></div>',
                '<p class="ndSimulatorPanel__caption"></p>',
                '</div>'
            ].join("");

            var optionTable = getOptionTable();
            if(infoArea && infoInner && infoInner.parentNode === infoArea){
                infoArea.insertBefore(dock, infoInner);
            } else if(optionTable && optionTable.parentNode === infoInner){
                infoInner.insertBefore(dock, optionTable);
            } else {
                var heading = infoInner.querySelector(".headingArea");
                if(heading && heading.nextSibling){
                    infoInner.insertBefore(dock, heading.nextSibling);
                } else {
                    infoInner.insertBefore(dock, infoInner.firstChild);
                }
            }

            toggleButton = dock.querySelector(".ndSimulatorDock__toggle");
            panel = dock.querySelector(".ndSimulatorPanel");
            previewStage = dock.querySelector(".ndSimulatorPanel__stage");
            previewCaption = dock.querySelector(".ndSimulatorPanel__caption");

            toggleButton.addEventListener("click", function(){
                if(toggleButton.__ndSwipeClosed){
                    toggleButton.__ndSwipeClosed = false;
                    return;
                }
                if(panel && !panel.hidden){
                    hidePreview();
                    return;
                }
                if(isMobile() && !isMobileOptionLayerOpen()){
                    openMobileOptionLayerWithPreview();
                    return;
                }
                syncFromNative();
                renderAll(true);
            });
            dock.querySelector(".ndSimulatorPanel__close").addEventListener("click", function(){
                hidePreview();
            });
            dock.hidden = false;
        }

        function createImagePreview(){
            if(!imageHost) return;
            imagePreview = document.createElement("div");
            imagePreview.className = "ndSimulatorPreview";
            imagePreview.hidden = true;
            imagePreview.innerHTML = [
                '<button type="button" class="ndSimulatorPreview__close" aria-label="옵션 시뮬레이터 닫기"><i class="xi-close" aria-hidden="true"></i></button>',
                '<div class="ndSimulatorPreview__stage"></div>',
                '<p class="ndSimulatorPreview__caption"></p>'
            ].join("");
            imageHost.appendChild(imagePreview);
            imagePreviewStage = imagePreview.querySelector(".ndSimulatorPreview__stage");
            imagePreviewCaption = imagePreview.querySelector(".ndSimulatorPreview__caption");
            imagePreview.querySelector(".ndSimulatorPreview__close").addEventListener("click", function(){
                hideImagePreview();
            });
        }

        function createMobileBar(){
            mobileBar = document.createElement("div");
            mobileBar.className = "ndSimulatorMobileBar";
            mobileBar.hidden = true;
            mobileBar.innerHTML = [
                '<button type="button" class="ndSimulatorMobileBar__button" aria-expanded="false">',
                '<span>옵션 시뮬레이터 보기</span>',
                '<i class="xi-angle-up" aria-hidden="true"></i>',
                '</button>'
            ].join("");
            document.body.appendChild(mobileBar);
            mobileBar.querySelector(".ndSimulatorMobileBar__button").addEventListener("click", function(event){
                event.preventDefault();
                event.stopPropagation();
                if(event.stopImmediatePropagation){
                    event.stopImmediatePropagation();
                }
                openMobileOptionLayerWithPreview();
            });
        }

        function updateMobileBarVisibility(){
            if(!mobileBar || !document.body){
                return;
            }
            var shouldShow = false;
            if(isMobile() && detailArea && !isMobileOptionLayerOpen()){
                var rect = detailArea.getBoundingClientRect();
                var pageTop = window.pageYOffset || document.documentElement.scrollTop || 0;
                var detailBottom = rect.bottom + pageTop;
                var threshold = detailBottom - Math.min((window.innerHeight || 0) * 0.35, 220);
                shouldShow = pageTop > threshold;
            }
            mobileBar.hidden = !shouldShow;
            document.body.classList.toggle("nd-simulator-mobile-bar-visible", shouldShow);
        }

        function openMobileOptionLayer(shouldShowPreview){
            if(!document.body) return;
            lockMobilePageScroll();
            document.body.classList.add("nd-mobile-option-layer-active");
            updateMobileBarVisibility();
            syncFromNative();
            if(shouldShowPreview){
                renderAll(true);
            } else {
                hidePreview();
            }
            window.setTimeout(function(){
                if(infoInner){
                    infoInner.scrollTop = 0;
                }
            }, 0);
        }

        function openMobileOptionLayerWithPreview(){
            if(!isMobile()){
                syncFromNative();
                renderAll(true);
                return;
            }
            openMobileOptionLayer(false);

            window.setTimeout(function(){
                if(!isMobileOptionLayerOpen()){
                    openMobileOptionLayer(false);
                }
                syncFromNative();
                showPanelPreview();
                if(infoInner){
                    infoInner.scrollTop = 0;
                }
            }, 40);
        }

        function closeMobileOptionLayer(){
            if(!document.body) return;
            document.body.classList.remove("nd-mobile-option-layer-active");
            document.body.classList.remove("nd-simulator-preview-open");
            hidePreview();
            updateMobileBarVisibility();
            unlockMobilePageScroll();
        }

        function bindMobileDragClose(){
            if(!dock || dock.__ndDragCloseReady) return;
            dock.__ndDragCloseReady = true;

            var startX = 0;
            var startY = 0;
            var isTracking = false;

            dock.addEventListener("touchstart", function(event){
                if(!isMobileOptionLayerOpen() || !event.touches || event.touches.length !== 1){
                    isTracking = false;
                    return;
                }
                startX = event.touches[0].clientX;
                startY = event.touches[0].clientY;
                isTracking = true;
            }, { passive: true });

            dock.addEventListener("touchmove", function(event){
                if(!isTracking || !event.touches || event.touches.length !== 1) return;
                event.preventDefault();
                event.stopPropagation();
                var diffX = event.touches[0].clientX - startX;
                var diffY = event.touches[0].clientY - startY;
                if(diffY > 56 && Math.abs(diffY) > Math.abs(diffX) * 1.25){
                    isTracking = false;
                    if(toggleButton){
                        toggleButton.__ndSwipeClosed = true;
                    }
                    closeMobileOptionLayer();
                }
            }, { passive: false });

            dock.addEventListener("touchend", function(){
                isTracking = false;
            }, { passive: true });
        }

        function createLayer(option, group){
            var layer;
            if(option && option.image){
                layer = document.createElement("img");
                setImageWithFallback(layer, option.image);
                layer.alt = "";
                layer.className = "ndSimulatorLayer ndSimulatorLayer--image";
            } else {
                layer = document.createElement("span");
                layer.className = "ndSimulatorLayer ndSimulatorLayer--demo";
                layer.style.setProperty("--nd-simulator-color", (option && (option.color || option.swatch)) || "#ddd");
            }
            layer.setAttribute("data-layer", group.layer || group.key);
            layer.style.zIndex = String(group.order + 1);
            return layer;
        }

        function resolveLayerValue(layer, key){
            if(key === "productNo" || key === "product_no"){
                return getProductNo();
            }
            var value = state[key];
            if(value === undefined || value === null || value === "") return "";
            value = String(value);
            if(layer.valueMap && layer.valueMap[key] && layer.valueMap[key][value]){
                return layer.valueMap[key][value];
            }
            return value;
        }

        function resolveLayerImage(layer){
            if(layer.image) return layer.image;
            if(!layer.imageTemplate) return "";
            return layer.imageTemplate.replace(/\{([^}]+)\}/g, function(match, key){
                return resolveLayerValue(layer, key) || match;
            });
        }

        function createConfiguredLayer(layer, index){
            var src = resolveLayerImage(layer);
            if(!src || src.indexOf("{") > -1) return null;
            var image = document.createElement("img");
            setImageWithFallback(image, src);
            image.alt = "";
            image.className = "ndSimulatorLayer ndSimulatorLayer--image";
            image.setAttribute("data-layer", layer.key || ("layer-" + index));
            image.style.zIndex = String((typeof layer.order === "number" ? layer.order : index) + 1);
            return image;
        }

        function getConfiguredLayers(){
            return toArray(config.layers).filter(function(layer){
                return layer && (layer.image || layer.imageTemplate);
            }).sort(function(a, b){
                var aOrder = typeof a.order === "number" ? a.order : 0;
                var bOrder = typeof b.order === "number" ? b.order : 0;
                return aOrder - bOrder;
            });
        }

        function getCsvRules(){
            return toArray(config.csvRules).filter(function(rule){
                return rule && rule.key && rule.image;
            });
        }

        function conditionMatches(group, conditions){
            if(!conditions || !conditions.length) return true;
            var option = findOptionByValue(group, state[group.key]);
            if(!option) return false;

            var selectedTokens = [option.value, option.label].concat(option.matchLabels || []).map(cleanText).filter(Boolean);
            return conditions.some(function(condition){
                var conditionToken = condition && condition.token;
                if(!conditionToken) return false;
                return selectedTokens.some(function(selectedToken){
                    return selectedToken === conditionToken ||
                        selectedToken.indexOf(conditionToken) > -1 ||
                        conditionToken.indexOf(selectedToken) > -1;
                });
            });
        }

        function getMatchingCsvRules(){
            var chosen = {};
            getCsvRules().forEach(function(rule, index){
                var score = 0;
                var matches = groups.every(function(group){
                    var conditions = rule.conditions && rule.conditions[group.key];
                    if(conditions && conditions.length){
                        score += 1;
                    }
                    return conditionMatches(group, conditions);
                });

                if(!matches) return;

                var current = chosen[rule.key];
                if(!current || score > current.score || (score === current.score && index < current.index)){
                    chosen[rule.key] = {
                        rule: rule,
                        score: score,
                        index: index
                    };
                }
            });

            var matchedRules = Object.keys(chosen).map(function(key){
                return chosen[key].rule;
            }).sort(function(a, b){
                var aOrder = typeof a.order === "number" ? a.order : 0;
                var bOrder = typeof b.order === "number" ? b.order : 0;
                return aOrder - bOrder;
            });

            if(!matchedRules.length && config.defaultImage){
                matchedRules.push({
                    key: "api-default",
                    order: 0,
                    image: config.defaultImage,
                    conditions: {}
                });
            }
            return matchedRules;
        }

        function getResolvedLayerImages(){
            var csvRules = getCsvRules();
            if(csvRules.length){
                return getMatchingCsvRules().map(function(rule){
                    return rule.image;
                }).filter(Boolean);
            }
            if(config.defaultImage){
                return [config.defaultImage];
            }

            return getConfiguredLayers().map(function(layer){
                return resolveLayerImage(layer);
            }).filter(function(src){
                return src && src.indexOf("{") === -1;
            });
        }

        function checkImageSource(src, callback){
            var candidates = getAssetCandidates(src);
            var index = 0;
            var image;

            function tryNext(){
                if(index >= candidates.length){
                    callback(false);
                    return;
                }
                image = new Image();
                image.onload = function(){
                    callback(true);
                };
                image.onerror = function(){
                    index += 1;
                    tryNext();
                };
                image.src = candidates[index];
            }

            if(!candidates.length){
                callback(false);
                return;
            }
            tryNext();
        }

        function ensureInitialAssets(callback){
            var sources = getResolvedLayerImages();
            var remaining = sources.length;
            var isAvailable = true;

            if(config.skipAssetCheck || !sources.length){
                callback(true);
                return;
            }

            sources.forEach(function(src){
                checkImageSource(src, function(exists){
                    if(!exists){
                        isAvailable = false;
                    }
                    remaining -= 1;
                    if(remaining <= 0){
                        callback(isAvailable);
                    }
                });
            });
        }

        function renderStage(stage){
            if(!stage) return;
            stage.innerHTML = "";

            if(config.baseImage){
                var base = document.createElement("img");
                setImageWithFallback(base, config.baseImage);
                base.alt = "";
                base.className = "ndSimulatorLayer ndSimulatorLayer--base";
                stage.appendChild(base);
            }

            var csvRules = getCsvRules();
            if(csvRules.length){
                getMatchingCsvRules().forEach(function(rule, index){
                    var image = document.createElement("img");
                    setImageWithFallback(image, rule.image);
                    image.alt = "";
                    image.className = "ndSimulatorLayer ndSimulatorLayer--image";
                    image.setAttribute("data-layer", rule.key || ("csv-layer-" + index));
                    image.style.zIndex = String((typeof rule.order === "number" ? rule.order : index) + 1);
                    stage.appendChild(image);
                });
                return;
            }

            if(config.defaultImage){
                var fallback = document.createElement("img");
                setImageWithFallback(fallback, config.defaultImage);
                fallback.alt = "";
                fallback.className = "ndSimulatorLayer ndSimulatorLayer--image";
                fallback.setAttribute("data-layer", "api-default");
                fallback.style.zIndex = "1";
                stage.appendChild(fallback);
                return;
            }

            var configuredLayers = getConfiguredLayers();
            if(configuredLayers.length){
                configuredLayers.forEach(function(layer, index){
                    var item = createConfiguredLayer(layer, index);
                    if(item) stage.appendChild(item);
                });
                return;
            }

            groups.forEach(function(group){
                var option = findOptionByValue(group, state[group.key]);
                if(!option) return;
                stage.appendChild(createLayer(option, group));
            });
        }

        function getSelectionText(){
            return groups.map(function(group){
                var option = findOptionByValue(group, state[group.key]);
                return group.label + " " + (option ? option.label : "-");
            }).join(" / ");
        }

        function renderAll(shouldShowPreview){
            var selectionText = getSelectionText();
            if(previewCaption) previewCaption.textContent = selectionText;
            if(imagePreviewCaption) imagePreviewCaption.textContent = selectionText;

            if(shouldUseDockPanel()){
                if(shouldShowPreview || (panel && !panel.hidden)){
                    renderStage(previewStage);
                }
                if(shouldShowPreview) showPanelPreview();
                return;
            }

            if(shouldShowPreview || (imagePreview && !imagePreview.hidden)){
                renderStage(imagePreviewStage);
            }
            if(shouldShowPreview) showImagePreview();
        }

        function showPanelPreview(){
            if(!panel) return;
            hideImagePreview();
            renderStage(previewStage);
            panel.hidden = false;
            dock.classList.add("is-open");
            if(document.body && isMobileOptionLayerOpen()){
                document.body.classList.add("nd-simulator-preview-open");
            }
            if(toggleButton) toggleButton.setAttribute("aria-expanded", "true");
        }

        function hidePanelPreview(){
            if(!panel) return;
            panel.hidden = true;
            dock.classList.remove("is-open");
            if(document.body){
                document.body.classList.remove("nd-simulator-preview-open");
            }
            if(toggleButton) toggleButton.setAttribute("aria-expanded", "false");
        }

        function showImagePreview(){
            if(!imagePreview) return;
            hidePanelPreview();
            renderStage(imagePreviewStage);
            imagePreview.hidden = false;
        }

        function hideImagePreview(){
            if(!imagePreview) return;
            imagePreview.hidden = true;
        }

        function hidePreview(){
            hidePanelPreview();
            hideImagePreview();
        }

        function syncPreviewMode(){
            if(shouldUseDockPanel()){
                hideImagePreview();
                return;
            }
            hidePanelPreview();
        }

        function syncFromNative(){
            var didMatch = false;
            groups.forEach(function(group){
                var choice = getChoiceFromNativeControls(group);
                var matched = choice ? matchOption(group, choice.label, choice.value) : null;
                if(matched){
                    state[group.key] = String(matched.value);
                    didMatch = true;
                }
            });
            return didMatch;
        }

        function initializeSimulator(){
            createDock();
            bindMobileDragClose();
            createImagePreview();
            createMobileBar();
            syncFromNative();
            root.hidden = true;
            root.classList.add("is-ready");
            root.setAttribute("data-ready", "true");
            root.setAttribute("data-product-no", getProductNo());
            if(config.apiManaged){
                root.setAttribute("data-config-source", "api");
            } else if(config.csvManaged){
                root.setAttribute("data-config-source", "csv");
            }
            renderAll(!!config.showOnLoad);
            updateMobileBarVisibility();

            function isOptionEventTarget(target){
                return !!(target && target.closest && target.closest(".xans-product-detail table.xans-product-option, .xans-product-detail table[module='product_option']"));
            }

            function shouldOpenFromOptionEvent(event){
                return !!(event && event.isTrusted !== false);
            }

            function isMeaningfulNativeOption(option){
                if(!option || option.disabled) return false;
                var value = option.value;
                var label = trimText(option.textContent || "");
                return !!(value && value !== "*" && label && !/[-–—─]{3,}/.test(label.replace(/\s/g, "")));
            }

            function hasRequiredNativeOptionsSelected(){
                var selects = getOptionSelects().filter(function(select){
                    if(!select || select.disabled) return false;
                    return toArray(select.options).some(isMeaningfulNativeOption);
                });
                if(!selects.length) return true;
                return selects.every(function(select){
                    return isMeaningfulNativeOption(select.options[select.selectedIndex]);
                });
            }

            function showRequiredOptionMessage(){
                window.alert("필수 옵션을 선택해주세요");
            }

            var syncTimer = null;
            var pendingPreviewOpen = false;
            var pendingOptionFocusTarget = null;

            function getEventOptionRow(target){
                return target && target.closest ? target.closest(".xans-product-detail table.xans-product-option tbody > tr, .xans-product-detail table[module='product_option'] tbody > tr") : null;
            }

            function hasMeaningfulOptions(select){
                return !!(select && toArray(select.options).some(isMeaningfulNativeOption));
            }

            function getNextRequiredOptionRow(sourceTarget){
                var sourceRow = getEventOptionRow(sourceTarget);
                if(!sourceRow) return null;

                var rows = getOptionRows();
                var startIndex = rows.indexOf(sourceRow);
                if(startIndex < 0) return null;

                for(var i = startIndex + 1; i < rows.length; i += 1){
                    var select = rows[i].querySelector("select");
                    if(hasMeaningfulOptions(select) && !isMeaningfulNativeOption(select.options[select.selectedIndex])){
                        return rows[i];
                    }
                }
                return sourceRow;
            }

            function scrollMobileOptionRowIntoView(sourceTarget){
                if(!isMobileOptionLayerOpen() || !infoInner) return;
                var row = getNextRequiredOptionRow(sourceTarget);
                if(!row) return;

                var top = row.offsetTop;
                if(typeof top !== "number") return;
                top = Math.max(0, top - 8);
                if(typeof infoInner.scrollTo === "function"){
                    infoInner.scrollTo({
                        top: top,
                        behavior: "smooth"
                    });
                } else {
                    infoInner.scrollTop = top;
                }
            }

            function scheduleMobileOptionFocus(sourceTarget){
                if(!sourceTarget || !isMobile()) return;
                window.setTimeout(function(){
                    scrollMobileOptionRowIntoView(sourceTarget);
                }, 160);
                window.setTimeout(function(){
                    scrollMobileOptionRowIntoView(sourceTarget);
                }, 380);
            }

            function scheduleSyncFromNative(shouldShowPreview, sourceTarget){
                pendingPreviewOpen = pendingPreviewOpen || !!shouldShowPreview;
                if(sourceTarget){
                    pendingOptionFocusTarget = sourceTarget;
                }
                if(syncTimer) window.clearTimeout(syncTimer);
                syncTimer = window.setTimeout(function(){
                    var shouldOpen = pendingPreviewOpen;
                    var focusTarget = pendingOptionFocusTarget;
                    pendingPreviewOpen = false;
                    pendingOptionFocusTarget = null;
                    syncFromNative();
                    if(shouldOpen){
                        renderAll(true);
                        scheduleMobileOptionFocus(focusTarget);
                        return;
                    }
                    if((panel && !panel.hidden) || (imagePreview && !imagePreview.hidden)){
                        renderAll(false);
                    } else if(previewCaption) {
                        previewCaption.textContent = getSelectionText();
                        if(imagePreviewCaption){
                            imagePreviewCaption.textContent = getSelectionText();
                        }
                    }
                }, 90);
            }

            document.addEventListener("change", function(event){
                if(!isOptionEventTarget(event.target)) return;
                scheduleSyncFromNative(shouldOpenFromOptionEvent(event), event.target);
            }, true);

            document.addEventListener("click", function(event){
                if(!isOptionEventTarget(event.target)) return;
                scheduleSyncFromNative(shouldOpenFromOptionEvent(event), event.target);
            }, true);

            document.addEventListener("click", function(event){
                var target = event.target;
                if(!target || !target.closest || !isMobile()) return;
                var fixedActionButton = target.closest("#orderFixArea .btnSubmit, #orderFixArea .actionCart");
                if(!fixedActionButton) return;
                if(isMobileOptionLayerOpen()){
                    if(!hasRequiredNativeOptionsSelected()){
                        event.preventDefault();
                        event.stopPropagation();
                        if(event.stopImmediatePropagation){
                            event.stopImmediatePropagation();
                        }
                        showRequiredOptionMessage();
                    }
                    return;
                }
                event.preventDefault();
                event.stopPropagation();
                if(event.stopImmediatePropagation){
                    event.stopImmediatePropagation();
                }
                openMobileOptionLayer(false);
            }, true);

            document.addEventListener("click", function(event){
                if(!isMobileOptionLayerOpen()) return;
                var target = event.target;
                if(target && target.closest && target.closest(".xans-product-detail .infoArea .close_btn")){
                    event.preventDefault();
                    closeMobileOptionLayer();
                }
            });

            window.addEventListener("scroll", updateMobileBarVisibility);
            window.addEventListener("scroll", syncPreviewMode);
            window.addEventListener("resize", updateMobileBarVisibility);
            window.addEventListener("resize", syncPreviewMode);

            var optionTable = getOptionTable();
            if(optionTable && window.MutationObserver){
                new MutationObserver(function(){
                    scheduleSyncFromNative(false, pendingOptionFocusTarget);
                }).observe(optionTable, {
                    childList: true,
                    subtree: true,
                    attributes: true,
                    attributeFilter: ["class", "checked", "selected", "value"]
                });
            }
        }

        ensureInitialAssets(function(isAvailable){
            if(!isAvailable){
                root.hidden = true;
                root.setAttribute("data-assets-missing", "true");
                root.setAttribute("data-product-no", getProductNo());
                return;
            }
            initializeSimulator();
        });
        });
    });
})();
