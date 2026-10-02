# Quote checkout regression

`quote-checkout.cjs` runs the complete storefront script against the native Cafe24 payment structure captured on 2026-10-02. The fixture keeps payment labels and detail panels as siblings and uses the actual receipt and address field names. Minimal platform click handlers represent the native payment and receipt form transitions.

Run using an existing Playwright installation (this static skin repository has no package manager setup):

```sh
PLAYWRIGHT_MODULE=/path/to/node_modules/@playwright/test node tests/quote-checkout.cjs
```

Optional overrides: `QUOTE_ORDER_SCRIPT` for the runtime under test and `CHROMIUM_EXECUTABLE` for an installed Chromium binary.

The six cases run in desktop and mobile viewports: hidden card panel before bank selection; default receipt and subsequent tax choice; address preservation through recalculation, input replacement and submission; editing a prefilled detail; blocking submission without receipt controls; normal checkout preservation. The live v209 baseline fails the first five cases in both viewports and passes normal checkout.

Actual checkout is separately verified using Cafe24's real handlers. No payment or order submission is performed during that verification.
