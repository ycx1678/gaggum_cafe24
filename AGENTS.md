# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## What this repo is

A Cafe24 storefront skin (skin number 16) for the Korean brand "가꿈" (Gaggum). It is **not** a JavaScript app — there is no `package.json`, no build step, no test suite. Files are static HTML/CSS/JS that Cafe24's server-side templating engine renders before serving.

The directory layout mirrors the Cafe24 skin spec exactly: `product/`, `member/`, `order/`, `board/`, `myshop/`, `layout/`, etc. are all conventional Cafe24 paths. `nd/` (custom main-page sections, modules, and assets) and `smart-banner/shop1/` (banner-app exports) are the project-specific additions.

`gaggum_cafe24_operation_manual.md` documents the operator-facing CMS workflow (which boards back which sections, banner sizing, etc.) — read it before changing anything that touches admin-managed content.

## Cafe24 templating directives

Files use Cafe24's template syntax, not standard HTML. Key forms:

- `<!--@layout(/layout/basic/main.html)-->` at the top of a page wraps the page in that layout (the layout uses `<!--@contents-->` as the slot).
- `<!--@import(/path/to/file.html)-->` server-side includes another partial.
- `<!--@css(/path.css)-->` / `<!--@js(/path.js)-->` register assets (deduped by Cafe24).
- `module="Layout_category"`, `module="Board_ListPackage_8"`, `module="product_listmain_1"`, `xans-record-`, etc. are Cafe24 module bindings — the server replaces `{$variable}` placeholders inside them with live data and repeats `xans-record-` rows. Treat unfamiliar `{$...}` tokens as Cafe24 variables, not bugs.

When editing a partial, follow the import chain (e.g. `index.html` → `/layout/basic/main.html` → `/nd/layout/header.html` → `/nd/setting_banner.html`) rather than guessing where markup ends up.

## Cache-busting on deploy

`/layout/basic/main.html` contains a `var version = '20260430vNN';` block that injects `?v=<version>` onto every CSS file via `document.write`. **Bump this string on every deploy** or browsers will serve stale CSS. The zip artifacts at the repo root (`gaggum_skin16_final_<date>_v<NN>_upload.zip`) follow the same `vNN` numbering — they are the upload bundles for Cafe24's skin uploader. Keep the version string and the next zip name in sync.

## Main-page architecture (fullPage.js sections)

`/index.html` is a thin orchestrator — it `@import`s a sequence of partials from `/nd/*.html`, each rendering as one fullPage.js section:

1. `main_visual.html` – top hero rolling banner
2. `main_video.html`
3. `main_prd.html` – BEST PRODUCT (Cafe24 module `product_listmain_1`)
4. `main_portfolio.html` – board_no=8
5. `prd_bnn.html` – mid banner
6. `main_brand.html` – brand fullscreen slide
7. `main_event.html`
8. `review.html` – board_no=4
9. `sns_bnn.html`

`/nd/fullpage_setting.html` initializes fullPage.js at the bottom of `index.html`. It also pins jQuery 1.12.4 via CDN and immediately calls `jQuery.noConflict(true)` — meaning any code that runs after that point sees the *outer* jQuery, not 1.12.4. Don't rely on jQuery 1.12.4 being `$` outside the fullPage init block.

## Smart-banner integration (critical mental model)

Operators upload images through a Cafe24 app called "스마트 배너 관리" (Smart Banner Admin). The app exports a per-banner HTML snippet to `/smart-banner/shop1/smart-banner-admin-{PC|MO}NNNNN.html`. These snippets are **not** rendered in place.

`/nd/setting_banner.html` declares "slots" with `data-type` / `data-class` attributes (e.g. `data-type="main_visual" data-class="pc"`) and `@import`s the snippet files into them. The block is hidden (`class="displaynone"`).

`/nd/js/setting_banner.js` then runs on DOM ready, reads images and links from those slots, and clones them into the actual on-page targets:

- `main_visual` (pc/mobile) → `.main_visual .pc_ver` / `.m_ver` swiper slides
- `brand_bnn` (pc/mobile) → `.main_brand` swiper
- `txt_bnn`, `prd_bnn`, `company_bnn`, `product_bnn` (all) → corresponding section's `.img_box`
- `grid_bnn` → `.sns_bnn .gridWrap`

Consequences when working on banners:

- The `data-type`/`data-class` attribute is the contract between the slot and the loader. Don't rename one without the other.
- If a smart-banner code regenerates with a different ID, update the `@import` path in `/nd/setting_banner.html` (the operation manual section 6 maps each banner to its current code).
- The script does **not** edit `setting_banner.js` — it is marked "수정 금지". Add new banner types by adding a new slot and a new loader call (`normal_bnn_loading`, `bnn_grid_loading`, etc.) following the existing patterns.

## Fallback / placeholder content

Sections that depend on operator-managed data (portfolio, events, brand slide) inject hard-coded fallback items when the corresponding board/banner is empty. See `appendFallbackItems()` in `/nd/js/main_portfolio.js` and the `textSet` array + `readSmartBanner()` in `/nd/js/main_brand.js`. These fallbacks reference temporary images under `/nd/images/` (listed in the operation manual section 3). When real CMS data exists, the Cafe24 server renders rows and the fallback path is skipped.

When designs change, decide deliberately: is the change in the Cafe24-rendered markup (the `xans-record-` template `<li>`), in the JS fallback data, or both? Mismatches between them are the most common source of "looks wrong when empty" bugs.

## Cafe24 board ↔ feature mapping

The skin is hard-coded to specific `board_no` values; do not generalize them without checking admin config.

| board_no | Use |
| --- | --- |
| 1 | 공지사항 |
| 2 | EVENT |
| 4 | 리뷰 (main `review.html`, product detail review) |
| 6 | 상품 Q&A |
| 8 | 포트폴리오 (main_portfolio, product detail portfolio, /board/gallery/) |
| 9 | 1:1 Q&A |

## Common edits and where to make them

- **Header / GNB / search** — `/nd/layout/header.html` (uses `Layout_category`, `Layout_SearchHeader`, `myshop_main` modules).
- **Footer** — `/nd/layout/footer.html`.
- **Mobile drawer / right quick menu** — `/nd/layout/side.html`, `/nd/layout/rightQuick.html`.
- **Add a new main-page section** — create `/nd/your_section.html` (with its own `@css`/`@js`), add a `@import` line in `/index.html`, and if it must scroll internally add the selector to the `normalScrollElements` list in `/nd/fullpage_setting.html`.
- **Product detail** — `/product/detail.html` (Cafe24 `product_detail` module). Avoid linking to other skin numbers; checklist item 8 in the operation manual flags this regression specifically.

## What to verify before declaring a change "done"

This is a static-asset project — type checkers and tests don't exist. Verification means loading the actual storefront. The layout file already includes a notice (`/layout/basic/main.html`) warning that the Cafe24 디자인센터 미리보기 does not render mobile correctly; a popup window button targets `https://ecudemo264489.cafe24.com/skin-skin12` for proper mobile preview. Use a real preview URL, not the in-admin iframe, for mobile QA.
