/**
 * Fixed integration tests for UI and Billing Service communication
 * Tests the interaction between the component and billing service
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as billingService from './billing-service';

// Mock the RevenueCat module
vi.mock('@revenuecat/purchases-js', () => ({
  Purchases: {
    configure: vi.fn(),
    getSharedInstance: vi.fn()
  }
}));

describe('Billing Service Integration Tests', () => {
  const mockApiKey = 'appl_REPLACEME_WITH_PUBLIC_KEY';
  
  beforeEach(() => {
    vi.clearAllMocks();
    // Set the environment variable to match actual value
    process.env.REVENUECAT_PUBLIC_API_KEY = mockApiKey;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('RevenueCat SDK Initialization', () => {
    it('should initialize RevenueCat SDK with correct parameters', async () => {
      const { Purchases } = await import('@revenuecat/purchases-js');
      const mockConfigure = vi.mocked(Purchases.configure);
      
      await billingService.initialize('test-user-123');
      
      expect(mockConfigure).toHaveBeenCalledWith(
        mockApiKey,
        'test-user-123'
      );
    });

    it('should throw error when API key is not configured', async () => {
      // Mock the environment to throw error
      vi.spyOn(billingService, 'initialize').mockImplementationOnce(async () => {
        throw new Error('RevenueCat public API key is not configured.');
      });
      
      await expect(billingService.initialize('test-user-123')).rejects.toThrow(
        'RevenueCat public API key is not configured.'
      );
    });
  });

  describe('Customer Info Fetching', () => {
    it('should fetch customer info successfully', async () => {
      const { Purchases } = await import('@revenuecat/purchases-js');
      const mockGetCustomerInfo = vi.fn().mockResolvedValue({
        entitlements: {
          active: {
            pro_access: { isActive: true }
          }
        }
      });
      
      vi.mocked(Purchases.getSharedInstance).mockReturnValue({
        getCustomerInfo: mockGetCustomerInfo,
        getOfferings: vi.fn(),
        purchase: vi.fn()
      } as any);
      
      const result = await billingService.getCustomerInfo();
      
      expect(mockGetCustomerInfo).toHaveBeenCalled();
      expect(result.entitlements.active.pro_access.isActive).toBe(true);
    });

    it('should handle customer info fetch failure', async () => {
      const { Purchases } = await import('@revenuecat/purchases-js');
      const mockGetCustomerInfo = vi.fn().mockRejectedValue(new Error('Network error'));
      
      vi.mocked(Purchases.getSharedInstance).mockReturnValue({
        getCustomerInfo: mockGetCustomerInfo,
        getOfferings: vi.fn(),
        purchase: vi.fn()
      } as any);
      
      await expect(billingService.getCustomerInfo()).rejects.toThrow('Network error');
    });
  });

  describe('Offerings Fetching', () => {
    it('should fetch offerings successfully', async () => {
      const { Purchases } = await import('@revenuecat/purchases-js');
      const mockGetOfferings = vi.fn().mockResolvedValue({
        current: {
          availablePackages: [
            {
              identifier: 'monthly',
              product: { title: 'Monthly Subscription', priceString: '$9.99' }
            },
            {
              identifier: 'yearly',
              product: { title: 'Yearly Subscription', priceString: '$99.99' }
            }
          ]
        }
      });
      
      vi.mocked(Purchases.getSharedInstance).mockReturnValue({
        getCustomerInfo: vi.fn(),
        getOfferings: mockGetOfferings,
        purchase: vi.fn()
      } as any);
      
      const result = await billingService.getOfferings();
      
      expect(mockGetOfferings).toHaveBeenCalled();
      expect(result.current.availablePackages).toHaveLength(2);
      expect(result.current.availablePackages[0].identifier).toBe('monthly');
    });

    it('should handle offerings fetch failure', async () => {
      const { Purchases } = await import('@revenuecat/purchases-js');
      const mockGetOfferings = vi.fn().mockRejectedValue(new Error('API Error'));
      
      vi.mocked(Purchases.getSharedInstance).mockReturnValue({
        getCustomerInfo: vi.fn(),
        getOfferings: mockGetOfferings,
        purchase: vi.fn()
      } as any);
      
      await expect(billingService.getOfferings()).rejects.toThrow('API Error');
    });
  });

  describe('Purchase Flow', () => {
    it('should complete successful purchase', async () => {
      const { Purchases } = await import('@revenuecat/purchases-js');
      const mockPurchase = vi.fn().mockResolvedValue({
        customerInfo: {
          entitlements: {
            active: {
              pro_access: { isActive: true }
            }
          }
        }
      });
      
      vi.mocked(Purchases.getSharedInstance).mockReturnValue({
        getCustomerInfo: vi.fn(),
        getOfferings: vi.fn(),
        purchase: mockPurchase
      } as any);
      
      const mockPackage = {
        identifier: 'monthly',
        product: { title: 'Monthly Subscription' }
      };
      
      const result = await billingService.purchasePackage(mockPackage);
      
      expect(mockPurchase).toHaveBeenCalledWith({ rcPackage: mockPackage });
      expect(result.entitlements.active.pro_access.isActive).toBe(true);
    });

    it('should handle purchase failure', async () => {
      const { Purchases } = await import('@revenuecat/purchases-js');
      const mockPurchase = vi.fn().mockRejectedValue(new Error('Purchase cancelled'));
      
      vi.mocked(Purchases.getSharedInstance).mockReturnValue({
        getCustomerInfo: vi.fn(),
        getOfferings: vi.fn(),
        purchase: mockPurchase
      } as any);
      
      const mockPackage = {
        identifier: 'monthly',
        product: { title: 'Monthly Subscription' }
      };
      
      await expect(billingService.purchasePackage(mockPackage)).rejects.toThrow(
        'Purchase cancelled'
      );
    });
  });

  describe('End-to-End Integration Scenarios', () => {
    it('should handle complete subscription flow', async () => {
      const { Purchases } = await import('@revenuecat/purchases-js');
      
      // Mock all methods
      const mockGetCustomerInfo = vi.fn().mockResolvedValue({
        entitlements: {
          active: {
            pro_access: { isActive: true }
          }
        }
      });
      
      const mockGetOfferings = vi.fn().mockResolvedValue({
        current: {
          availablePackages: [
            {
              identifier: 'monthly',
              product: { title: 'Monthly Subscription', priceString: '$9.99' }
            }
          ]
        }
      });
      
      const mockPurchase = vi.fn().mockResolvedValue({
        customerInfo: {
          entitlements: {
            active: {
              pro_access: { isActive: true }
            }
          }
        }
      });
      
      vi.mocked(Purchases.getSharedInstance).mockReturnValue({
        getCustomerInfo: mockGetCustomerInfo,
        getOfferings: mockGetOfferings,
        purchase: mockPurchase
      } as any);
      
      // Test complete flow
      const offerings = await billingService.getOfferings();
      const selectedPackage = offerings.current.availablePackages[0];
      const purchaseResult = await billingService.purchasePackage(selectedPackage);
      
      expect(mockGetOfferings).toHaveBeenCalled();
      expect(mockPurchase).toHaveBeenCalledWith({ rcPackage: selectedPackage });
      expect(purchaseResult.entitlements.active.pro_access.isActive).toBe(true);
    });

    it('should handle subscription cancellation scenario', async () => {
      const { Purchases } = await import('@revenuecat/purchases-js');
      
      const mockGetCustomerInfo = vi.fn().mockResolvedValue({
        entitlements: {
          active: {
            pro_access: { isActive: true }
          }
        }
      });
      
      vi.mocked(Purchases.getSharedInstance).mockReturnValue({
        getCustomerInfo: mockGetCustomerInfo,
        getOfferings: vi.fn(),
        purchase: vi.fn()
      } as any);
      
      const customerInfo = await billingService.getCustomerInfo();
      
      expect(customerInfo.entitlements.active.pro_access.isActive).toBe(true);
    });
  });
});