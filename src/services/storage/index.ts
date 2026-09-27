/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IStorageService } from './IStorageService';
import { IndexedDBAdapter } from './IndexedDBAdapter';
import { RealmStorageAdapter } from './RealmStorageAdapter';

// Storage driver selector: 'indexeddb' | 'realm'
const ACTIVE_STORAGE_DRIVER: 'indexeddb' | 'realm' = 'indexeddb';

function createStorageAdapter(): IStorageService {
  if (ACTIVE_STORAGE_DRIVER === 'realm') {
    return new RealmStorageAdapter();
  }
  return new IndexedDBAdapter();
}

export const storageService: IStorageService = createStorageAdapter();
export * from './IStorageService';
export * from './IndexedDBAdapter';
export * from './RealmStorageAdapter';
