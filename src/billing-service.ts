// src/billing-service.ts
// RevenueCat integration service for handling billing and subscriptions.

import { Purchases } from '@revenuecat/purchases-js';

// RevenueCat configuration - Replace with your actual public API key and environment
// This should be your PUBLIC API key (starts with 'appl_'), not the secret key.
// For testing, use the sandbox environment.
const REVENUECAT_PUBLIC_API_KEY = 'appl_REPLACEME_WITH_PUBLIC_KEY'; // Replace with actual public key from RevenueCat dashboard
const REVENUECAT_ENVIRONMENT = 'production'; // or 'sandbox' for testing

/**
 * Initializes the RevenueCat SDK with the provided user ID.
 * @param appUserId The unique identifier for the user.
 * @returns The configured Purchases instance.
 */
export async function initialize(appUserId: string): Promise<Purchases> {
  if (!REVENUECAT_PUBLIC_API_KEY) {
    throw new Error('RevenueCat public API key is not configured.');
  }

  try {
    const purchases = Purchases.configure(REVENUECAT_PUBLIC_API_KEY, appUserId);
    console.log('RevenueCat SDK initialized for user:', appUserId);
    return purchases;
  } catch (error) {
    console.error('Error initializing RevenueCat SDK:', error);
    throw error;
  }
}

/**
 * Fetches the current user's subscription status and entitlements.
 * @returns Customer information including entitlements and subscription status.
 */
export async function getCustomerInfo(): Promise<any> {
  try {
    const customerInfo = await Purchases.getSharedInstance().getCustomerInfo();
    console.log('Customer Info:', customerInfo);
    return customerInfo;
  } catch (error) {
    console.error('Error fetching customer info:', error);
    throw error;
  }
}

/**
 * Retrieves the list of available subscription packages (offerings).
 * @returns Available offerings and packages.
 */
export async function getOfferings(): Promise<any> {
  try {
    const offerings = await Purchases.getSharedInstance().getOfferings();
    console.log('Offerings:', offerings);
    return offerings;
  } catch (error) {
    console.error('Error fetching offerings:', error);
    throw error;
  }
}

/**
 * Initiates the purchase flow for a selected package.
 * @param packageToPurchase The package object to purchase.
 * @returns The result of the purchase, including customer info.
 */
export async function purchasePackage(packageToPurchase: any): Promise<any> {
  try {
    const { customerInfo } = await Purchases.getSharedInstance().purchase({
      rcPackage: packageToPurchase,
    });
    console.log('Purchase successful:', customerInfo);
    return customerInfo;
  } catch (error) {
    console.error('Error during purchase:', error);
    throw error;
  }
}

// Example usage (for testing purposes)
// initialize('test_user_123').then(() => {
//   console.log('RevenueCat SDK initialized');
// });