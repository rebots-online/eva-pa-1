import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as billingService from './billing-service';
import { Purchases } from '@revenuecat/purchases-js';

// Mock the @revenuecat/purchases-js module
vi.mock('@revenuecat/purchases-js', () => ({
  Purchases: {
    configure: vi.fn(),
    getSharedInstance: vi.fn(),
  },
}));

describe('Billing Service', () => {
  let mockPurchasesInstance: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPurchasesInstance = {
      getCustomerInfo: vi.fn(),
      getOfferings: vi.fn(),
      purchase: vi.fn(),
    };
    (Purchases.getSharedInstance as any).mockReturnValue(mockPurchasesInstance);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialize', () => {
    it('should initialize RevenueCat SDK with correct configuration', async () => {
      const mockConfigure = vi.mocked(Purchases.configure);
      const mockPurchases = {} as any; // Type assertion to avoid complex mocking
      mockConfigure.mockReturnValue(mockPurchases);

      const result = await billingService.initialize('test_user_123');

      expect(mockConfigure).toHaveBeenCalledWith(
        'appl_REPLACEME_WITH_PUBLIC_KEY',
        'test_user_123'
      );
      expect(result).toBe(mockPurchases);
    });

    it('should handle initialization errors gracefully', async () => {
      const mockConfigure = vi.mocked(Purchases.configure);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      mockConfigure.mockImplementation(() => {
        throw new Error('Failed to initialize');
      });

      await expect(billingService.initialize('test_user_123')).rejects.toThrow('Failed to initialize');
      expect(consoleSpy).toHaveBeenCalledWith('Error initializing RevenueCat SDK:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('getCustomerInfo', () => {
    it('should return customer info when user has active subscription', async () => {
      const mockCustomerInfo = {
        activeSubscriptions: ['premium_monthly'],
        allPurchaseDates: { premium_monthly: '2025-01-01' },
        allExpirationDates: { premium_monthly: '2025-02-01' },
        latestExpirationDate: '2025-02-01',
        entitlements: {
          active: {
            premium: {
              identifier: 'premium',
              isActive: true,
              willRenew: true,
            },
          },
        },
      };

      mockPurchasesInstance.getCustomerInfo.mockResolvedValue(mockCustomerInfo);

      const result = await billingService.getCustomerInfo();

      expect(result).toEqual(mockCustomerInfo);
      expect(mockPurchasesInstance.getCustomerInfo).toHaveBeenCalled();
    });

    it('should return customer info when user has no active subscription', async () => {
      const mockCustomerInfo = {
        activeSubscriptions: [],
        allPurchaseDates: {},
        allExpirationDates: {},
        latestExpirationDate: null,
        entitlements: {
          active: {},
        },
      };

      mockPurchasesInstance.getCustomerInfo.mockResolvedValue(mockCustomerInfo);

      const result = await billingService.getCustomerInfo();

      expect(result).toEqual(mockCustomerInfo);
    });

    it('should handle errors when fetching customer info', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      mockPurchasesInstance.getCustomerInfo.mockRejectedValue(new Error('Network error'));

      await expect(billingService.getCustomerInfo()).rejects.toThrow('Network error');
      expect(consoleSpy).toHaveBeenCalledWith('Error fetching customer info:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('getOfferings', () => {
    it('should return offerings data successfully', async () => {
      const mockOfferings = {
        current: {
          identifier: 'premium',
          serverDescription: 'Premium subscription',
          availablePackages: [
            {
              identifier: 'premium_monthly',
              packageType: 'MONTHLY',
              product: {
                identifier: 'com.example.premium.monthly',
                price: { amount: 9.99, currency: 'USD' },
              },
            },
            {
              identifier: 'premium_yearly',
              packageType: 'ANNUAL',
              product: {
                identifier: 'com.example.premium.yearly',
                price: { amount: 99.99, currency: 'USD' },
              },
            },
          ],
        },
        all: {
          premium: {
            identifier: 'premium',
            serverDescription: 'Premium subscription',
            availablePackages: [
              {
                identifier: 'premium_monthly',
                packageType: 'MONTHLY',
                product: {
                  identifier: 'com.example.premium.monthly',
                  price: { amount: 9.99, currency: 'USD' },
                },
              },
            ],
          },
        },
      };

      mockPurchasesInstance.getOfferings.mockResolvedValue(mockOfferings);

      const result = await billingService.getOfferings();

      expect(result).toEqual(mockOfferings);
      expect(mockPurchasesInstance.getOfferings).toHaveBeenCalled();
    });

    it('should handle errors when fetching offerings', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      mockPurchasesInstance.getOfferings.mockRejectedValue(new Error('API error'));

      await expect(billingService.getOfferings()).rejects.toThrow('API error');
      expect(consoleSpy).toHaveBeenCalledWith('Error fetching offerings:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('purchasePackage', () => {
    it('should successfully purchase a package', async () => {
      const mockPackage = {
        identifier: 'premium_monthly',
        packageType: 'MONTHLY',
        product: {
          identifier: 'com.example.premium.monthly',
        },
      };

      const mockPurchaseResult = {
        customerInfo: {
          activeSubscriptions: ['premium_monthly'],
          allPurchaseDates: { premium_monthly: '2025-01-01' },
          allExpirationDates: { premium_monthly: '2025-02-01' },
        },
        productIdentifier: 'com.example.premium.monthly',
      };

      mockPurchasesInstance.purchase.mockResolvedValue(mockPurchaseResult);

      const result = await billingService.purchasePackage(mockPackage);

      expect(result).toEqual(mockPurchaseResult.customerInfo);
      expect(mockPurchasesInstance.purchase).toHaveBeenCalledWith({
        rcPackage: mockPackage,
      });
    });

    it('should handle purchase cancellation', async () => {
      const mockPackage = { identifier: 'premium_monthly' };
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      mockPurchasesInstance.purchase.mockRejectedValue(new Error('User cancelled'));

      await expect(billingService.purchasePackage(mockPackage)).rejects.toThrow('User cancelled');
      expect(consoleSpy).toHaveBeenCalledWith('Error during purchase:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });

    it('should handle payment failure', async () => {
      const mockPackage = { identifier: 'premium_monthly' };
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      mockPurchasesInstance.purchase.mockRejectedValue(new Error('Payment declined'));

      await expect(billingService.purchasePackage(mockPackage)).rejects.toThrow('Payment declined');
      expect(consoleSpy).toHaveBeenCalledWith('Error during purchase:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });

    it('should handle network errors during purchase', async () => {
      const mockPackage = { identifier: 'premium_monthly' };
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      mockPurchasesInstance.purchase.mockRejectedValue(new Error('Network error'));

      await expect(billingService.purchasePackage(mockPackage)).rejects.toThrow('Network error');
      expect(consoleSpy).toHaveBeenCalledWith('Error during purchase:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });
});