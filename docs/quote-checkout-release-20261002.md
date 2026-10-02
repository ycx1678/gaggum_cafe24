# Quote checkout v210

The operator reported three problems in quote checkout: the initially selected card's issuer form remained visible, neither required receipt application was selected after choosing bank deposit, and entered delivery address detail disappeared before payment. Quote #238 has an empty stored delivery address detail, which reproduced the address reset.

The current live v209 runtime was downloaded from both the public storefront and the authenticated Cafe24 file uploader. Both copies have SHA-256 `47a74b4644e6ce677ce2075f4172c617b003ce111ef46c55bac4aa05422abf7f`. It is recorded as an unchanged baseline in this branch; v210 contains the targeted fix. Policy is recorded in `specs/DECISIONS.md`.

## Deployment scope

Only Cafe24 `sde_design/skin16`:

- Add `nd/js/quote_order_v210.js`.
- In the currently downloaded `order/orderform.html`, replace exactly one `quote_order_v209.js?v=20260922v209` with `quote_order_v210.js?v=20261002v210`.
- In the currently downloaded `layout/basic/main.html`, replace exactly one `var version = '20260930v186';` with `var version = '20261002v187';`.

The repository's historical HTML differs from live. Deploy the single substitutions in the freshly backed-up live HTML, not the full repository HTML. Keep the layout's previously deployed quote parent v189 reference and all other live assets intact. No VPS deploy or production database change is required.

## Validation

- The new desktop/mobile regression covers the native card detail panel, native receipt click and tax selection, preservation of entered address detail across recalculation and input replacement, submission without receipt controls, and unchanged normal checkout. See `tests/README.md`.
- The broader quote state suite from back-office commit `d86a1a8` is run against v210. Its older quote checkout fixtures require adding the newly mandatory receipt control; production order forms already contain that control. Other expectations are retained.
- Live verification stops at the order form. Price preparation is intercepted for the browser UI check so it cannot issue a production discount code. No real order or payment is submitted.

## Recovery

Backups and staged/verified assets are retained at `/home/yhchoi/.local/share/gaggum-cafe24-deploy/20261002-checkout`. Upload the backed-up `order/orderform.html` and `layout/basic/main.html` to roll back, then re-download and compare both. The unreferenced v210 asset may remain.

Validation completed before deployment: 12 targeted desktop/mobile browser cases passed; all 66 broader quote flow cases passed with the mandatory receipt fixture addition. In the operator-provided customer account's real order form, the fix hid the previously visible card issuer panel, selected the cash receipt through Cafe24's handlers, preserved a subsequent tax invoice choice (including the native saved-information summary), and retained entered address detail after a DOM recalculation. No order or payment was submitted.

Runtime v210 SHA-256: `a305b98a7a9a80a8f494f40bfcbb01ff156df59917621dea4041b79f9230c9c2`.

## Completed live release

Source runtime commit: `ffaf7753cdb2d319cfa863dbef197ed27d867883`. Cafe24's native file uploader was used with the previously authorized operator login because this workspace has no FTP deployment secrets.

All three uploaded files were re-downloaded from Cafe24 and matched the staged bytes:

| File | SHA-256 |
| --- | --- |
| `nd/js/quote_order_v210.js` | `a305b98a7a9a80a8f494f40bfcbb01ff156df59917621dea4041b79f9230c9c2` |
| `order/orderform.html` | `9c776f457338d98d519a1e41985037736d7ac2a2d66bd153ebd57ec5b37b3802` |
| `layout/basic/main.html` | `9a017d4cfdb76b39593b19a6a7b4e19ab4de331fc04933d297c404aeb9144421` |

The public JS matched the same hash; the public order form referenced v210 exactly once with no v209 reference. The public main page contained `20261002v187`. The product/cart layout was also re-downloaded and matched its untouched backup, retaining quote parent v189.

After release, the provided customer account's native checkout loaded the deployed public v210 asset and passed card hiding, cash receipt activation, subsequent tax invoice selection, and detail-address preservation again. This UI verification intercepts the quote pricing request and cart comparison; it does not issue a production discount code or submit an order. A read-only check confirmed quote #238 remains `sent` without a linked Cafe24 order.
