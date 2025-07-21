# RevenueCat Integration Plan

This document outlines the plan for integrating the RevenueCat SDK to handle billing and subscriptions.

## Research Findings

*   **Recommended SDK:** The appropriate SDK is `@revenuecat/purchases-js`. This is RevenueCat's official web SDK, which integrates with Stripe for payment processing.
*   **Dependencies:** The primary dependency is a Stripe account, which must be connected to your RevenueCat project. The SDK itself will be added as a project dependency via `npm` or `yarn`.
*   **Service Worker Context:** The `@revenuecat/purchases-js` SDK is a standard JavaScript library. The purchase flow will be initiated from a page with DOM access, and the core logic can be called from the service worker via messaging.

## Proposed Integration Plan

### 1. Module Design: `billing-service.ts`

A new, self-contained module located at `src/billing-service.ts` will be created to handle all interactions with the RevenueCat SDK.

The `billing-service.ts` module will export functions to:
*   **`initialize(appUserId: string)`**: Configure and initialize the RevenueCat SDK with the user's ID.
*   **`getCustomerInfo()`**: Fetch the current user's subscription status and entitlements.
*   **`getOfferings()`**: Retrieve the list of available subscription packages.
*   **`purchasePackage(package)`**: Initiate the purchase flow for a selected package.

### 2. UI Interaction & State Management (`index.tsx`)

The main application component, `index.tsx`, will manage the application's subscription state and orchestrate the UI interactions with the `billing-service`.

*   **Initialization:** On application load, `index.tsx` will call `billingService.initialize()` and then `billingService.getCustomerInfo()` to fetch the user's initial subscription status and update the state.
*   **Purchase Flow:**
    1.  The subscription toggle in the UI will trigger a function in `index.tsx`.
    2.  This function will call `billingService.getOfferings()` to fetch available packages.
    3.  Upon selection, it will call `billingService.purchasePackage()`, passing the chosen package.
    4.  The RevenueCat SDK will handle displaying the Stripe checkout form.
    5.  `index.tsx` will await the result of the purchase and update the application state (`isSubscribed`, `usageCount`) and UI accordingly.

### 3. Architectural Diagram

```mermaid
graph TD
    subgraph Chrome Extension UI ([`index.tsx`](index.tsx:1))
        UI["Subscription Toggle / UI"]
    end

    subgraph Billing Module ([`billing-service.ts`])
        BS_Init["initialize()"]
        BS_Info["getCustomerInfo()"]
        BS_Offerings["getOfferings()"]
        BS_Purchase["purchasePackage()"]
    end

    subgraph RevenueCat SDK
        RC["@revenuecat/purchases-js"]
    end

    subgraph External Services
        Stripe["Stripe Checkout"]
        RC_API["RevenueCat API"]
    end

    UI -- 1. Triggers Purchase --> BS_Purchase
    BS_Purchase -- 2. Gets Offerings --> BS_Offerings
    BS_Offerings -- 3. Calls SDK --> RC
    BS_Purchase -- 4. Calls SDK to Purchase --> RC
    index.tsx -- On Load & Post-Purchase --> BS_Info
    BS_Info -- Fetches Status --> RC

    RC -- API Calls --> RC_API
    RC -- Renders --> Stripe