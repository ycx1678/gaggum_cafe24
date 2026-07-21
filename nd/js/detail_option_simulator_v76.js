(function(){
    "use strict";

    var ASSET_VERSION = "20260511v76";

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
            .replace(/\[[^\]]*\]/g, "")
            .replace(/\([^)]*\)/g, "")
            .replace(/\s+/g, "")
            .toLowerCase();
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
        var config = resolveConfig();
        var root = document.querySelector("[data-nd-simulator]");
        var infoArea = document.querySelector(".xans-product-detail .infoArea");
        var infoInner = document.querySelector(".xans-product-detail .infoArea .info_inner");
        var imageWrap = root && root.closest ? root.closest(".prd_img_wrap") : null;
        var imageHost = imageWrap ? (imageWrap.querySelector(".viewer") || imageWrap) : null;

        if(!config || !root || !infoArea || !infoInner) return;

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
                if(panel && !panel.hidden){
                    hidePreview();
                    return;
                }
                if(isMobile() && !isMobileOptionLayerOpen()){
                    openMobileOptionLayer(true);
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
            mobileBar.querySelector(".ndSimulatorMobileBar__button").addEventListener("click", function(){
                openMobileOptionLayer(true);
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

        function closeMobileOptionLayer(){
            if(!document.body) return;
            document.body.classList.remove("nd-mobile-option-layer-active");
            hidePreview();
            updateMobileBarVisibility();
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

        function getResolvedLayerImages(){
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
            if(toggleButton) toggleButton.setAttribute("aria-expanded", "true");
        }

        function hidePanelPreview(){
            if(!panel) return;
            panel.hidden = true;
            dock.classList.remove("is-open");
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
            createImagePreview();
            createMobileBar();
            syncFromNative();
            root.hidden = true;
            root.classList.add("is-ready");
            root.setAttribute("data-product-no", getProductNo());
            renderAll(!!config.showOnLoad);
            updateMobileBarVisibility();

            function isOptionEventTarget(target){
                return !!(target && target.closest && target.closest(".xans-product-detail table.xans-product-option, .xans-product-detail table[module='product_option']"));
            }

            function shouldOpenFromOptionEvent(event){
                return !!(event && event.isTrusted !== false);
            }

            var syncTimer = null;
            var pendingPreviewOpen = false;
            function scheduleSyncFromNative(shouldShowPreview){
                pendingPreviewOpen = pendingPreviewOpen || !!shouldShowPreview;
                if(syncTimer) window.clearTimeout(syncTimer);
                syncTimer = window.setTimeout(function(){
                    var shouldOpen = pendingPreviewOpen;
                    pendingPreviewOpen = false;
                    syncFromNative();
                    if(shouldOpen){
                        if(isMobile() && isMobileOptionLayerOpen()){
                            infoInner.scrollTop = 0;
                        }
                        renderAll(true);
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
                scheduleSyncFromNative(shouldOpenFromOptionEvent(event));
            }, true);

            document.addEventListener("click", function(event){
                if(!isOptionEventTarget(event.target)) return;
                scheduleSyncFromNative(shouldOpenFromOptionEvent(event));
            }, true);

            document.addEventListener("click", function(event){
                var target = event.target;
                if(!target || !target.closest || !isMobile()) return;
                var fixedActionButton = target.closest("#orderFixArea .btnSubmit, #orderFixArea .actionCart");
                if(!fixedActionButton || isMobileOptionLayerOpen()) return;
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
                    scheduleSyncFromNative(false);
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
})();
