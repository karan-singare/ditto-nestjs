/**
 * Ditto Collections Constants
 * 
 * This file contains all the collection names used in the Ditto database.
 * Add new collection names here to maintain consistency across the application.
 */

export const DITTO_COLLECTIONS = [
 'Asset',
 'ERPMasterData',
 'Issue',
 'Plant',
 'User',
] as const;

/**
 * Type for Ditto collection names
 * This provides type safety when using collection names
 */
export type DittoCollectionName = typeof DITTO_COLLECTIONS[number]; 