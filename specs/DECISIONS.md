# Storefront decisions

## S-001 (2026-10-02): quote checkout receipt choice and editable address detail

The operator requires quote orders paid by bank deposit to choose either a cash receipt or a tax invoice. Removing the “신청안함” option alone left both application choices unselected.

- Quote checkout defaults to the available cash receipt application through Cafe24's native click handler after bank deposit is selected. An existing tax invoice choice and subsequent customer changes are preserved. Submission is blocked when neither application is available or selected.
- Customers can enter or correct the delivery address detail. Quote postcode and base address continue to be applied; recalculation and replacement of the detail input preserve the most recent entered detail rather than resetting it to the quote's original, potentially empty value.
- Cafe24 renders a payment method's label and its `wrappingClone_<method>` detail panel as siblings. Both are hidden for non-bank methods on quote checkout. Bank deposit remains a deliberate customer selection; the script does not automatically click the payment method.
- Normal checkout retains its existing payment and receipt behavior. Amount matching, discount preparation, cart matching, and order completion linking remain enforced.
