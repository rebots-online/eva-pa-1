# Manual QA Plan: RevenueCat Sandbox Testing

## Overview

This document provides a step-by-step guide for manually testing the RevenueCat billing integration in the sandbox environment. This plan is designed for a non-developer to ensure the end-to-end purchasing flow works as expected before production release.

---

## Section 1: Sandbox Environment Setup

### 1.1 Prerequisites Checklist

Before you begin testing, please ensure you have completed the initial setup as documented in the [REVENUECAT_SETUP_GUIDE.md](REVENUECAT_SETUP_GUIDE.md).

- [ ] You have a RevenueCat account.
- [ ] You have created and configured a "pro_access" entitlement.
- [ ] You have created subscription products (e.g., `pro_monthly`) and attached them to the `pro_access` entitlement.
- [ ] You have created a `default` offering with the necessary packages.
- [ ] You have access to RevenueCat's sandbox test card information.
- [ ] The application is correctly configured to use the **sandbox** environment and your **sandbox API keys**.

### 1.2 Loading the Chrome Extension

To test the extension, you must load it into your Chrome browser in developer mode.

1.  Open Google Chrome.
2.  Navigate to `chrome://extensions`.
3.  Enable **"Developer mode"** using the toggle switch in the top-right corner.
4.  Click the **"Load unpacked"** button.
5.  Select the root directory of this project (`audio-eva-personal-asst-but-black-screen-20jul2025-07h04`).
6.  The extension should now appear in your list of installed extensions.

---

## Section 2: Testing Scenarios

### Test Case 1: Successful Purchase

**Objective:** Verify that a user can successfully purchase a subscription using a sandbox test card.

| Step | Action | Expected Result |
| :--- | :--- | :--- |
| 1 | Open the Chrome extension by clicking its icon in the browser toolbar. | The extension's popup UI opens successfully. |
| 2 | Navigate to the subscription or "Go Pro" section within the UI. | The subscription options (e.g., "Pro Monthly") are displayed with a purchase button. |
| 3 | Click the purchase button to initiate the subscription flow. | The RevenueCat purchase/checkout modal appears. |
| 4 | Enter the details for a **successful** sandbox test card provided by RevenueCat. | The payment form accepts the input. |
| 5 | Complete the purchase. | The purchase modal closes. The UI updates to show an active subscription (e.g., a "Pro" badge appears, unlock features). |
| 6 | Log in to the RevenueCat dashboard and navigate to the **Sandbox Customers** section. | A new test customer appears with an active `pro_access` entitlement and a successful transaction logged. |

### Test Case 2: Subscription State Persistence

**Objective:** Verify that the extension remembers the user's active subscription after being closed and reopened.

| Step | Action | Expected Result |
| :--- | :--- | :--- |
| 1 | After completing a successful purchase (Test Case 1), close the extension popup. | The popup closes. |
| 2 | Reopen the extension by clicking its icon in the browser toolbar again. | The UI immediately reflects the active subscription status without requiring the user to do anything. The user should not be prompted to purchase again. |

### Test Case 3: Error Handling (Optional)

**Objective:** Verify that the application displays a user-friendly error message if a payment fails.

| Step | Action | Expected Result |
| :--- | :--- | :--- |
| 1 | Open the Chrome extension and navigate to the subscription UI. | The purchase options are visible. |
| 2 | Initiate a purchase. | The RevenueCat purchase modal appears. |
| 3 | Use a sandbox card that is designed to **fail** the transaction (refer to RevenueCat's testing documentation for specific card numbers). | The purchase modal closes or displays an initial failure indicator. |
| 4 | Observe the extension's UI. | The UI displays a clear, user-friendly error message (e.g., "Payment failed. Please try again or use a different card."). The UI should **not** show an active subscription. |

---

**End of Test Plan.** If all test cases pass, the sandbox testing is considered successful.