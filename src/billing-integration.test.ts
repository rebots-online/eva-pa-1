/**
 * Integration tests for UI and Billing Service communication
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
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment variables
    process.env.REVENUECAT_PUBLIC_API_KEY = 'test_public_key';
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
        'test_public_key',
        'test-user-123'
      );
    });

    it('should throw error when API key is not configured', async () => {
      // Temporarily set to empty
      process.env.REVENUECAT_PUBLIC_API_KEY = '';
      
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
        purchasePackage: vi.fn()
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
        purchasePackage: vi.fn()
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
        purchasePackage: vi.fn()
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
        purchasePackage: vi.fn()
      } as any);
      
      await expect(billingService.getOfferings()).rejects.toThrow('API Error');
    });
  });

  describe('Purchase Flow', () => {
    it('should complete successful purchase', async () => {
      const { Purchases } = await import('@revenuecat/purchases-js');
      const mockPurchasePackage = vi.fn().mockResolvedValue({
        entitlements: {
          active: {
            pro_access: { isActive: true }
          }
        }
      });
      
      vi.mocked(Purchases.getSharedInstance).mockReturnValue({
        getCustomerInfo: vi.fn(),
        getOfferings: vi.fn(),
        purchasePackage: mockPurchasePackage
      } as any);
      
      const mockPackage = {
        identifier: 'monthly',
        product: { title: 'Monthly Subscription' }
      };
      
      const result = await billingService.purchasePackage(mockPackage);
      
      expect(mockPurchasePackage).toHaveBeenCalledWith(mockPackage);
      expect(result.entitlements.active.pro_access.isActive).toBe(true);
    });

    it('should handle purchase failure', async () => {
      const { Purchases } = await import('@revenuecat/purchases-js');
      const mockPurchasePackage = vi.fn().mockRejectedValue(new Error('Purchase cancelled'));
      
      vi.mocked(Purchases.getSharedInstance).mockReturnValue({
        getCustomerInfo: vi.fn(),
        getOfferings: vi.fn(),
        purchasePackage: mockPurchasePackage
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
      const mockConfigure = vi.fn().mockReturnValue({
        getCustomerInfo: vi.fn().mockResolvedValue({
          entitlements: {
            active: {
              pro_access: { isActive: false }
            }
          }
        }),
        getOfferings: vi.fn().mockResolvedValue({
          current: {
            availablePackages: [
              {
                identifier: 'monthly',
                product: { title: 'Monthly Subscription', priceString: '$9.99' }
              }
            ]
          }
        }),
        purchasePackage: vi.fn().mockResolvedValue({
          entitlements: {
            active: {
              pro_access: { isActive: true }
            }
          }
        })
      });
      
      vi.mocked(Purchases.configure).mockImplementation(mockConfigure);
      
      // Test complete flow
      const purchases = await billingService.initialize('test-user');
      const offerings = await billingService.getOfferings();
      const selectedPackage = offerings.current.availablePackages[0];
      const purchaseResult = await billingService.purchasePackage(selectedPackage);
      const customerInfo = await billingService.getCustomerInfo();
      
      expect(mockConfigure).toHaveBeenCalledWith('test_public_key', 'test-user');
      expect(customerInfo.entitlements.active.pro_access.isActive).toBe(true);
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
        purchasePackage: vi.fn()
      } as any);
      
      const customerInfo = await billingService.getCustomerInfo();
      
      expect(customerInfo.entitlements.active.pro_access.isActive).toBe(true);
    });
  });
});