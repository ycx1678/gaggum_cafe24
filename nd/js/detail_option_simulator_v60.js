(function(){
    "use strict";

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

    function findRowForGroup(group){
        var rows = toArray(document.querySelectorAll(".xans-product-detail table.xans-product-option tbody > tr"));
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

        var selects = toArray(document.querySelectorAll(".xans-product-detail table.xans-product-option select"));
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
            return [prefix + src, src];
        }
        if(!prefix && src.indexOf("/nd/") === 0){
            return [src, "/skin-skin16" + src];
        }
        return [src];
    }

    function setImageWithFallback(image, src){
        var candidates = getAssetCandidates(src);
        var index = 0;
        if(!image || !candidates.length) return;

        image.onerror = function(){
            index += 1;
            if(index < candidates.length){
                image.src = candidates[index];
                return;
            }
            image.hidden = true;
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
        var imageWrap = document.querySelector(".prd_img_wrap");

        if(!config || !root || !imageWrap) return;

        var groups = normalizeGroups(config.groups);
        if(!groups.length) return;

        var state = {};
        var manuallyClosed = false;
        var preview = null;
        var previewHost = imageWrap.querySelector(".viewer") || imageWrap;
        var previewStage = null;
        var previewCaption = null;

        groups.forEach(function(group){
            state[group.key] = getDefaultValue(group);
        });

        function createPreview(){
            preview = document.createElement("div");
            preview.className = "ndSimulatorPreview";
            preview.hidden = true;
            preview.setAttribute("aria-live", "polite");
            preview.innerHTML = [
                '<button type="button" class="ndSimulatorPreview__close" aria-label="옵션 조합 이미지 닫기"><i class="xi-close"></i></button>',
                '<div class="ndSimulatorPreview__stage"></div>',
                '<p class="ndSimulatorPreview__caption"></p>'
            ].join("");
            previewHost.appendChild(preview);
            previewStage = preview.querySelector(".ndSimulatorPreview__stage");
            previewCaption = preview.querySelector(".ndSimulatorPreview__caption");
            preview.querySelector(".ndSimulatorPreview__close").addEventListener("click", function(){
                manuallyClosed = true;
                hidePreview();
            });
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

        function renderControls(){
            return;
            modalControls.innerHTML = "";

            groups.forEach(function(group){
                var current = findOptionByValue(group, state[group.key]);
                var section = document.createElement("section");
                section.className = "ndOptionSimulatorGroup";
                section.innerHTML = [
                    '<div class="ndOptionSimulatorGroup__head">',
                    '<strong class="ndOptionSimulatorGroup__label"></strong>',
                    '<span class="ndOptionSimulatorGroup__current"></span>',
                    '</div>',
                    '<div class="ndOptionSimulatorChoices"></div>'
                ].join("");
                section.querySelector(".ndOptionSimulatorGroup__label").textContent = group.label;
                section.querySelector(".ndOptionSimulatorGroup__current").textContent = current ? current.label : "";

                var choices = section.querySelector(".ndOptionSimulatorChoices");
                group.options.forEach(function(option){
                    var button = document.createElement("button");
                    button.type = "button";
                    button.className = "ndOptionSimulatorChoice";
                    if(String(option.value) === String(state[group.key])){
                        button.className += " is-selected";
                    }
                    button.style.setProperty("--nd-simulator-swatch", option.swatch || option.color || "#ddd");
                    button.innerHTML = '<span class="ndOptionSimulatorChoice__swatch"></span><span class="ndOptionSimulatorChoice__label"></span>';
                    button.querySelector(".ndOptionSimulatorChoice__label").textContent = option.label;
                    button.addEventListener("click", function(){
                        state[group.key] = String(option.value);
                        manuallyClosed = false;
                        applyNativeSelection(group, option);
                        renderAll(true);
                    });
                    choices.appendChild(button);
                });
                modalControls.appendChild(section);
            });
        }

        function renderAll(shouldShowPreview){
            if(shouldShowPreview || (preview && !preview.hidden)){
                renderStage(previewStage);
            }
            var selectionText = getSelectionText();
            if(previewCaption) previewCaption.textContent = selectionText;
            renderControls();
            if(shouldShowPreview && !manuallyClosed) showPreview();
        }

        function showPreview(){
            if(!preview) return;
            preview.hidden = false;
            imageWrap.classList.add("nd-simulator-preview-active");
        }

        function hidePreview(){
            if(!preview) return;
            preview.hidden = true;
            imageWrap.classList.remove("nd-simulator-preview-active");
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

        createPreview();
        syncFromNative();
        root.hidden = true;
        root.classList.add("is-ready");
        renderAll(false);

        function isOptionEventTarget(target){
            return !!(target && target.closest && target.closest(".xans-product-detail table.xans-product-option"));
        }

        var syncTimer = null;
        function scheduleSyncFromNative(shouldShowPreview){
            if(syncTimer) window.clearTimeout(syncTimer);
            syncTimer = window.setTimeout(function(){
                manuallyClosed = false;
                var didMatch = syncFromNative();
                renderAll(!!shouldShowPreview && didMatch);
            }, 60);
        }

        document.addEventListener("change", function(event){
            if(!isOptionEventTarget(event.target)) return;
            manuallyClosed = false;
            scheduleSyncFromNative(true);
        });

        document.addEventListener("click", function(event){
            if(!isOptionEventTarget(event.target)) return;
            scheduleSyncFromNative(true);
        });

        var optionTable = document.querySelector(".xans-product-detail table.xans-product-option");
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

        imageWrap.addEventListener("click", function(event){
            if(event.target.closest && event.target.closest(".ndSimulatorPreview")) return;
            if(event.target.closest && event.target.closest(".thumbs, .swiper-pagination, .viewer")) {
                manuallyClosed = true;
                hidePreview();
            }
        });
    });
})();
