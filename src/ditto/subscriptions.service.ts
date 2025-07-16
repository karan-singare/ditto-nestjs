import { Injectable } from '@nestjs/common';
import { Ditto } from '@dittolive/ditto';
import { DITTO_COLLECTIONS } from '../constants';

@Injectable()
export class SubscriptionsService {
  private subscriptions: Map<string, any> = new Map();

  constructor() {}

  /**
   * Register sync subscriptions for all Ditto collections
   * This method should be called after Ditto sync is started
   * @param ditto - The Ditto instance to use for subscriptions
   */
  registerAllSubscriptions(ditto: Ditto): void {
    try {
      console.log('Registering sync subscriptions for all collections...');

      DITTO_COLLECTIONS.forEach(collectionName => {
        this.registerSubscription(ditto, collectionName);
      });

      console.log(`Successfully registered ${DITTO_COLLECTIONS.length} sync subscriptions`);
    } catch (error) {
      console.error('Failed to register sync subscriptions:', error);
      throw error;
    }
  }

  /**
   * Register a sync subscription for a specific collection
   * @param ditto - The Ditto instance to use for subscriptions
   * @param collectionName - The name of the collection to subscribe to
   */
  private registerSubscription(ditto: Ditto, collectionName: string): void {
    try {
      const subscription = ditto.sync.registerSubscription(`SELECT * FROM ${collectionName}`);
      this.subscriptions.set(collectionName, subscription);
      console.log(`Registered sync subscription for collection: ${collectionName}`);
    } catch (error) {
      console.error(`Failed to register subscription for collection ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Get all active subscriptions
   * @returns Map of collection names to their subscriptions
   */
  getSubscriptions(): Map<string, any> {
    return this.subscriptions;
  }

  /**
   * Get a specific subscription by collection name
   * @param collectionName - The name of the collection
   * @returns The subscription object or undefined if not found
   */
  getSubscription(collectionName: string): any | undefined {
    return this.subscriptions.get(collectionName);
  }

  /**
   * Cancel a specific subscription
   * @param collectionName - The name of the collection to unsubscribe from
   */
  cancelSubscription(collectionName: string): void {
    try {
      const subscription = this.subscriptions.get(collectionName);
      if (subscription) {
        subscription.cancel();
        this.subscriptions.delete(collectionName);
        console.log(`Cancelled subscription for collection: ${collectionName}`);
      } else {
        console.warn(`No subscription found for collection: ${collectionName}`);
      }
    } catch (error) {
      console.error(`Failed to cancel subscription for collection ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Cancel all subscriptions
   */
  cancelAllSubscriptions(): void {
    try {
      console.log('Cancelling all sync subscriptions...');
      
      this.subscriptions.forEach((subscription, collectionName) => {
        try {
          subscription.cancel();
          console.log(`Cancelled subscription for collection: ${collectionName}`);
        } catch (error) {
          console.error(`Failed to cancel subscription for collection ${collectionName}:`, error);
        }
      });

      this.subscriptions.clear();
      console.log('All subscriptions cancelled successfully');
    } catch (error) {
      console.error('Failed to cancel all subscriptions:', error);
      throw error;
    }
  }

  /**
   * Check if a subscription exists for a collection
   * @param collectionName - The name of the collection
   * @returns true if subscription exists, false otherwise
   */
  hasSubscription(collectionName: string): boolean {
    return this.subscriptions.has(collectionName);
  }

  /**
   * Get the number of active subscriptions
   * @returns The number of active subscriptions
   */
  getSubscriptionCount(): number {
    return this.subscriptions.size;
  }
} 