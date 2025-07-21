# RevenueCat Integration Setup Guide

## Overview

This guide provides step-by-step instructions for setting up RevenueCat billing in the GDM Live Audio Assistant Chrome extension.

## Files Created/Modified

### New Files
- [`src/billing-service.ts`](src/billing-service.ts) - Complete RevenueCat integration module
- [`REVENUECAT_INTEGRATION_PLAN.md`](REVENUECAT_INTEGRATION_PLAN.md) - Initial integration plan

### Modified Files
- [`index.tsx`](index.tsx) - Added billing integration and subscription flow

## Prerequisites

1. **RevenueCat Account**: Sign up at [revenuecat.com](https://revenuecat.com)
2. **Chrome Extension Developer Account** (for publishing)
3. **Google Play Console Account** (for Android subscriptions)
4. **App Store Connect Account** (for iOS subscriptions)

## Step 1: RevenueCat Configuration

### 1.1 Get Your Public API Key
1. Log into your RevenueCat dashboard
2. Go to **Settings > API Keys**
3. Copy your **Public API Key** (starts with `appl_`)
4. Replace the placeholder in [`src/billing-service.ts`](src/billing-service.ts):

```typescript
const REVENUECAT_PUBLIC_API_KEY = 'appl_YOUR_ACTUAL_PUBLIC_KEY_HERE';
```

### 1.2 Create Products & Entitlements
1. Go to **Products** in RevenueCat dashboard
2. Create your subscription products:
   - **Identifier**: `pro_monthly` (or your preferred ID)
   - **Display Name**: "Pro Monthly"
   - **Duration**: Monthly
3. Create an **Entitlement**:
   - **Identifier**: `pro_access`
   - **Display Name**: "Pro Access"
   - **Attach to**: Your subscription product

### 1.3 Create Offerings
1. Go to **Offerings** in RevenueCat dashboard
2. Create a new offering:
   - **Identifier**: `default`
   - **Packages**: Add your subscription product as a package

## Step 2: Chrome Extension Setup

### 2.1 Install Dependencies
```bash
npm install @revenuecat/purchases-js
```

### 2.2 Update Manifest Permissions
Add these permissions to your `manifest.json`:
```json
{
  "permissions": [
    "storage",
    "identity"
  ],
  "content_security_policy": {
    "extension_pages": "script-src 'self' https://api.revenuecat.com; object-src 'self'"
  }
}
```

## Step 3: RevenueCat Web SDK Integration

The integration is already implemented in [`src/billing-service.ts`](src/billing-service.ts) with these key functions:

### 3.1 Available Functions
- `initialize(appUserId: string)`: Initializes RevenueCat SDK
- `getCustomerInfo()`: Gets current user's subscription status
- `getOfferings()`: Retrieves available subscription packages
- `purchasePackage(package)`: Initiates purchase flow

### 3.2 Usage in Application
The integration is automatically loaded in [`index.tsx`](index.tsx) with:
- Subscription status check on app load
- Purchase flow when user toggles subscription
- Proper error handling and user feedback

## Step 4: Testing

### 4.1 Test Environment Setup
1. Set `REVENUECAT_ENVIRONMENT = 'sandbox'` in [`src/billing-service.ts`](src/billing-service.ts)
2. Use RevenueCat's test cards: https://docs.revenuecat.com/docs/testing

### 4.2 Test Flow
1. Load the extension
2. Click the subscription toggle
3. Complete the purchase flow
4. Verify subscription status updates

## Step 5: Production Deployment

### 5.1 Switch to Production
1. Change `REVENUECAT_ENVIRONMENT = 'production'`
2. Update `REVENUECAT_PUBLIC_API_KEY` to production key
3. Test thoroughly

### 5.2 Deploy to Chrome Web Store
1. Build the extension
2. Upload to Chrome Web Store
3. Configure RevenueCat webhook for Chrome Web Store

## Configuration Checklist

- [ ] RevenueCat account created
- [ ] Public API key obtained and configured
- [ ] Products created in RevenueCat
- [ ] Entitlements configured
- [ ] Offerings created
- [ ] Dependencies installed
- [ ] Manifest permissions updated
- [ ] Test environment configured
- [ ] Production environment configured

## Troubleshooting

### Common Issues

1. **"RevenueCat public API key is not configured"**
   - Ensure the public key is set in [`src/billing-service.ts`](src/billing-service.ts)

2. **CORS errors**
   - Check content security policy in manifest.json

3. **Purchase not completing**
   - Verify product IDs match between RevenueCat and code
   - Check browser console for errors

### Debug Mode
Enable debug logging by adding:
```typescript
Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
```

## RevenueCat Resources

- [RevenueCat Web SDK Documentation](https://docs.revenuecat.com/docs/web-sdk)
- [Testing Guide](https://docs.revenuecat.com/docs/testing)
- [Web SDK Quickstart](https://docs.revenuecat.com/docs/web-sdk-quickstart)

## Support

For RevenueCat-specific issues:
- RevenueCat Documentation: https://docs.revenuecat.com
- RevenueCat Community: https://community.revenuecat.com
- RevenueCat Support: support@revenuecat.com