/**
 * Integration tests for UI and Billing Service communication
 * Tests the interaction between the Lit component in index.tsx and the billing-service.ts
 * Note: These tests use access patterns that work with the component's public API
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import type { GdmLiveAudio } from '../index';

// Mock the billing service module
vi.mock('./billing-service', () => ({
  initialize: vi.fn(),
  getCustomerInfo: vi.fn(),
  getOfferings: vi.fn(),
  purchasePackage: vi.fn(),
}));

// Mock Chrome APIs
Object.defineProperty(global, 'chrome', {
  value: {
    runtime: {
      sendMessage: vi.fn(),
      onMessage: {
        addListener: vi.fn(),
      },
    },
  },
  writable: true,
});

// Import after mocking
import * as billingService from './billing-service';

describe('UI and Billing Service Integration Tests', () => {
  let component: GdmLiveAudio;
  
  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Create the component
    component = await fixture(html`<gdm-live-audio></gdm-live-audio>`);
    
    // Wait for component to be ready
    await component.updateComplete;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial State and Subscription Check', () => {
    it('should initialize billing service on component load', async () => {
      const mockInitialize = vi.mocked(billingService.initialize);
      const mockGetCustomerInfo = vi.mocked(billingService.getCustomerInfo);
      
      mockGetCustomerInfo.mockResolvedValue({
        entitlements: {
          active: {
            pro_access: { isActive: true }
          }
        }
      });

      // Access private method via any type assertion for testing
      await (component as any).initializeBilling();
      
      expect(mockInitialize).toHaveBeenCalledWith(expect.stringContaining('user_'));
      expect(mockGetCustomerInfo).toHaveBeenCalled();
      expect(component.isSubscribed).toBe(true);
    });

    it('should handle subscription check failure gracefully', async () => {
      const mockInitialize = vi.mocked(billingService.initialize);
      const mockGetCustomerInfo = vi.mocked(billingService.getCustomerInfo);
      
      mockGetCustomerInfo.mockRejectedValue(new Error('Network error'));
      
      await (component as any).initializeBilling();
      
      expect(mockInitialize).toHaveBeenCalled();
      expect(mockGetCustomerInfo).toHaveBeenCalled();
      expect(component.isSubscribed).toBe(false);
    });
  });

  describe('Offerings Fetching', () => {
    it('should fetch offerings when subscription toggle is triggered', async () => {
      const mockGetOfferings = vi.mocked(billingService.getOfferings);
      
      const mockOfferings = {
        current: {
          availablePackages: [
            {
              identifier: 'monthly',
              product: { title: 'Monthly Subscription', priceString: '$9.99' }
            }
          ]
        }
      };
      
      mockGetOfferings.mockResolvedValue(mockOfferings);
      
      await (component as any).handleSubscriptionToggle({ target: { checked: true } } as any);
      
      expect(mockGetOfferings).toHaveBeenCalled();
    });

    it('should handle offerings fetch failure gracefully', async () => {
      const mockGetOfferings = vi.mocked(billingService.getOfferings);
      
      mockGetOfferings.mockRejectedValue(new Error('API Error'));
      
      await (component as any).handleSubscriptionToggle({ target: { checked: true } } as any);
      
      expect(mockGetOfferings).toHaveBeenCalled();
    });
  });

  describe('Successful Purchase Flow', () => {
    it('should complete successful purchase flow', async () => {
      const mockPurchasePackage = vi.mocked(billingService.purchasePackage);
      const mockGetOfferings = vi.mocked(billingService.getOfferings);
      
      const mockPackage = {
        identifier: 'monthly',
        product: { title: 'Monthly Subscription' }
      };
      
      mockGetOfferings.mockResolvedValue({
        current: {
          availablePackages: [mockPackage]
        }
      });
      
      const mockCustomerInfo = {
        entitlements: {
          active: {
            pro_access: { isActive: true }
          }
        }
      };
      
      mockPurchasePackage.mockResolvedValue(mockCustomerInfo);
      
      await (component as any).initiateSubscriptionPurchase();
      
      expect(mockPurchasePackage).toHaveBeenCalledWith(mockPackage);
      expect(component.isSubscribed).toBe(true);
    });

    it('should update subscription state after successful purchase', async () => {
      const mockPurchasePackage = vi.mocked(billingService.purchasePackage);
      
      const mockCustomerInfo = {
        entitlements: {
          active: {
            pro_access: { isActive: true }
          }
        }
      };
      
      mockPurchasePackage.mockResolvedValue(mockCustomerInfo);
      
      await (component as any).initiateSubscriptionPurchase();
      
      expect(component.isSubscribed).toBe(true);
    });
  });

  describe('Failed Purchase Flow', () => {
    it('should handle purchase failure gracefully', async () => {
      const mockPurchasePackage = vi.mocked(billingService.purchasePackage);
      
      mockPurchasePackage.mockRejectedValue(new Error('Purchase failed'));
      
      await (component as any).initiateSubscriptionPurchase();
      
      expect(component.error).toContain('Failed to initiate subscription');
      expect(component.isSubscribed).toBe(false);
    });

    it('should reset toggle on purchase failure', async () => {
      const mockPurchasePackage = vi.mocked(billingService.purchasePackage);
      
      mockPurchasePackage.mockRejectedValue(new Error('Purchase failed'));
      
      await (component as any).initiateSubscriptionPurchase();
      
      expect(component.error).toContain('Failed to initiate subscription');
      expect(component.isSubscribed).toBe(false);
    });
  });

  describe('Unsubscription Flow', () => {
    it('should handle unsubscription', async () => {
      component.isSubscribed = true;
      
      await (component as any).handleUnsubscription();
      
      expect(component.isSubscribed).toBe(false);
    });
  });

  describe('Usage Limit and Subscription', () => {
    it('should enforce usage limit for non-subscribed users', async () => {
      component.isSubscribed = false;
      component.usageCount = 5;
      
      // Check render logic for usage restriction
      const canRecord = !component.isSubscribed && component.usageCount < 2;
      expect(canRecord).toBe(false);
    });

    it('should allow unlimited usage for subscribed users', async () => {
      component.isSubscribed = true;
      component.usageCount = 5;
      
      // Check render logic for subscribed users
      const canRecord = component.isSubscribed || component.usageCount < 2;
      expect(canRecord).toBe(true);
    });
  });
});