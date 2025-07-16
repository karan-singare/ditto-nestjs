import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { HttpApiService } from '../../http-api/http-api.service';
import { DittoService } from './ditto.service';
import { SubscriptionsService } from './subscriptions.service';
import { DITTO_COLLECTIONS } from '../../constants';
import { Subscription } from 'rxjs';

@Injectable()
export class SyncService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SyncService.name);
  private dittoSubscription: Subscription;

  constructor(
    private readonly httpApiService: HttpApiService,
    private readonly dittoService: DittoService,
    private readonly subscriptionsService: SubscriptionsService
  ) {}

  async onModuleInit() {
    this.logger.log('SyncService initialized, checking for subscriptions registration...');
    
    // Check if subscriptions are already registered
    const currentValue = this.dittoService.subscriptionsRegistered$.value;
    if (currentValue) {
      this.logger.log('Subscriptions already registered, initializing sync immediately...');
      try {
        await this.initSync();
      } catch (error) {
        this.logger.error('Failed to initialize sync:', error);
      }
    } else {
      this.logger.log('Waiting for subscriptions to be registered...');
      
      // Subscribe to DittoService events
      this.dittoSubscription = this.dittoService.subscriptionsRegistered$.subscribe({
        next: async (registered) => {
          if (registered) {
            this.logger.log('Received subscriptions registered event, initializing sync...');
            try {
              await this.initSync();
            } catch (error) {
              this.logger.error('Failed to initialize sync after event:', error);
            }
          }
        },
        error: (error) => {
          this.logger.error('Error in subscriptions registered subscription:', error);
        }
      });
    }
  }

  async onModuleDestroy() {
    if (this.dittoSubscription) {
      this.dittoSubscription.unsubscribe();
      this.logger.log('Unsubscribed from DittoService events');
    }
  }

  /**
   * Initialize sync process after subscriptions are registered
   * This method should be called from DittoService after registering subscriptions
   */
  async initSync(): Promise<void> {
    try {
      this.logger.log('Initializing sync process...');
      const collectionCounts = await this.getAllCollectionCount();

      // Sync all collections with their records
      await this.syncAllCollections(collectionCounts);
      
      this.logger.log('Sync initialization completed successfully');
    } catch (error) {
      this.logger.error('Failed to initialize sync:', error);
      throw error;
    }
  }



  /**
   * Utility method to create a delay
   * @param ms - Milliseconds to delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Sync all collections by polling and fetching all records
   * @param collectionCounts - Record of collection names and their counts
   */
  async syncAllCollections(collectionCounts: Record<string, number>): Promise<void> {
    try {
      this.logger.log('Starting to sync all collections...');
      
      // Create promises for each collection sync
      const syncPromises = Object.entries(collectionCounts).map(async ([collectionName, count]) => {
        if (count > 0) {
          this.logger.log(`Syncing collection: ${collectionName} (${count} documents)`);
          return await this.syncCollection(collectionName, count);
        } else {
          this.logger.log(`Skipping collection: ${collectionName} (no documents)`);
          return { collection: collectionName, synced: 0, skipped: true };
        }
      });

      // Execute all sync operations in parallel
      const results = await Promise.all(syncPromises);

      // Log sync summary
      this.logger.log('=== Sync Summary ===');
      results.forEach((result) => {
        if (result.skipped) {
          this.logger.log(`${result.collection}: Skipped (no documents)`);
        } else {
          this.logger.log(`${result.collection}: ${result.synced} documents synced`);
        }
      });
      this.logger.log('=== End Sync Summary ===');

      const totalSynced = results.reduce((sum, result) => sum + (result.synced || 0), 0);
      this.logger.log(`Total documents synced across all collections: ${totalSynced}`);
    } catch (error) {
      this.logger.error('Failed to sync all collections:', error);
      throw error;
    }
  }

  /**
   * Sync a single collection by polling and fetching all records
   * @param collectionName - Name of the collection to sync
   * @param totalCount - Total number of documents in the collection
   * @returns Promise with sync result
   */
  async syncCollection(collectionName: string, totalCount: number): Promise<{ collection: string; synced: number; skipped?: boolean }> {
    try {
      this.logger.log(`Starting sync for collection: ${collectionName} (${totalCount} total documents)`);
      
      const batchSize = 10000;
      const batchInterval = 1000; // 1 second interval between batches
      let syncedCount = 0;
      let offset = 0;

      // Poll until we get all records
      while (syncedCount < totalCount) {
        this.logger.log(`Fetching batch for ${collectionName}: offset=${offset}, limit=${batchSize}`);
        
        // Register subscription for this specific batch query
        const batchQuery = `SELECT * FROM ${collectionName} WHERE status == 1 LIMIT ${batchSize} OFFSET ${offset}`;
        const subscriptionKey = `${collectionName}_batch_${offset}_${batchSize}`;
        this.subscriptionsService.registerSubscriptionByQuery(
          this.dittoService.getDitto(),
          batchQuery,
          subscriptionKey
        );
        this.logger.log(`Registered subscription for batch: ${subscriptionKey}`);
        
        // Keep trying this batch until we get data
        let batchRetryCount = 0;
        let batchData: any[] | null = null;
        
        while (!batchData) {
          try {
            // Get batch of records from Ditto store
            const batch = await this.getCollectionBatch(collectionName, offset, batchSize);
            
            if (batch && batch.length > 0) {
              batchData = batch;
              this.logger.log(`Successfully fetched ${batch.length} records from ${collectionName} at offset ${offset} (attempt ${batchRetryCount + 1})`);
            } else {
              batchRetryCount++;
              this.logger.log(`No data available for ${collectionName} at offset ${offset} (attempt ${batchRetryCount}), retrying in ${batchInterval}ms...`);
              await this.delay(batchInterval);
            }
          } catch (error) {
            batchRetryCount++;
            this.logger.error(`Failed to fetch batch for ${collectionName} at offset ${offset} (attempt ${batchRetryCount}):`, error);
            this.logger.log(`Retrying in ${batchInterval}ms...`);
            await this.delay(batchInterval);
          }
        }
        
        if (batchData) {
          syncedCount += batchData.length;
          offset += batchSize;
          
          this.logger.log(`Fetched ${batchData.length} records from ${collectionName}. Total synced: ${syncedCount}/${totalCount}`);
          
          // Add 1-second delay before next batch (except for the last batch)
          if (syncedCount < totalCount) {
            this.logger.log(`Waiting ${batchInterval}ms before next batch...`);
            await this.delay(batchInterval);
          }
        } else {
          this.logger.log(`No more records found for ${collectionName} at offset ${offset} after retries`);
          break;
        }
      }

      this.logger.log(`Completed sync for ${collectionName}: ${syncedCount} documents synced`);
      
      return {
        collection: collectionName,
        synced: syncedCount
      };
    } catch (error) {
      this.logger.error(`Failed to sync collection ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Get count for all collections in parallel using HTTP API
   * @returns Promise with collection counts
   */
  async getAllCollectionCount(): Promise<Record<string, number>> {
    try {
      const countPromises = DITTO_COLLECTIONS.map(async (collectionName) => {
        try {
          const result = await this.httpApiService.getDocumentCounts('status == 1', collectionName);
          return {
            collection: collectionName,
            count: result?.count || 0,
            success: true
          };
        } catch (error) {
          this.logger.error(`Failed to get count for collection ${collectionName}:`, error);
          return {
            collection: collectionName,
            count: 0,
            success: false,
            error: error.message
          };
        }
      });

      // Execute all promises in parallel
      const results = await Promise.all(countPromises);

      // Convert results to a record object
      const collectionCounts: Record<string, number> = {};
      const summary: Record<string, any> = {};

      results.forEach((result) => {
        collectionCounts[result.collection] = result.count;
        summary[result.collection] = {
          count: result.count,
          success: result.success,
          ...(result.error && { error: result.error })
        };
      });

      // Log the summary
      this.logger.log('=== Collection Counts Summary ===');
      Object.entries(summary).forEach(([collection, data]) => {
        if (data.success) {
          this.logger.log(`${collection}: ${data.count} documents`);
        } else {
          this.logger.error(`${collection}: Failed - ${data.error}`);
        }
      });
      this.logger.log('=== End Summary ===');

      // Log total count
      const totalCount = Object.values(collectionCounts).reduce((sum, count) => sum + count, 0);
      this.logger.log(`Total documents across all collections: ${totalCount}`);

      return collectionCounts;
    } catch (error) {
      this.logger.error('Failed to get collection counts:', error);
      throw error;
    }
  }

  /**
   * Get a batch of records from a collection using Ditto store
   * @param collectionName - Name of the collection
   * @param offset - Offset for pagination
   * @param limit - Number of records to fetch
   * @returns Promise with batch of records
   */
  private async getCollectionBatch(collectionName: string, offset: number, limit: number): Promise<any[]> {
    try {
      // Use Ditto store execute method with SQL query
      const query = `SELECT * FROM ${collectionName} WHERE status == 1 LIMIT ${limit} OFFSET ${offset}`;
      this.logger.log(`Executing query: ${query}`);
      
      const result = await this.dittoService.getDitto().store.execute(query);

      // Handle the correct response format: { items: [] }
      if (result && result.items && Array.isArray(result.items)) {
        return result.items;
      } else {
        this.logger.warn(`Unexpected query result format for ${collectionName}:`, result);
        return [];
      }
    } catch (error) {
      this.logger.error(`Failed to execute query for ${collectionName}:`, error);
      throw error;
    }
  }
} 