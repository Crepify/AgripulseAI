// IndexedDB Storage Layer for Offline-First PWA Execution

import { openDB } from 'idb';

const DB_NAME = 'agripulse_db';
const DB_VERSION = 1;

export async function initOfflineDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Store for offline leaf scans
      if (!db.objectStoreNames.contains('scans')) {
        const scanStore = db.createObjectStore('scans', { keyPath: 'id', autoIncrement: true });
        scanStore.createIndex('timestamp', 'timestamp');
        scanStore.createIndex('synced', 'synced');
      }

      // Store for offline queued sync actions
      if (!db.objectStoreNames.contains('syncQueue')) {
        db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
      }

      // Store for cached mandi prices
      if (!db.objectStoreNames.contains('mandiCache')) {
        db.createObjectStore('mandiCache', { keyPath: 'crop' });
      }

      // Store for offline certified dealers
      if (!db.objectStoreNames.contains('dealersCache')) {
        db.createObjectStore('dealersCache', { keyPath: 'id' });
      }
    },
  });
}

// Save a scan locally in IndexedDB
export async function saveLocalScan(scanData) {
  try {
    const db = await initOfflineDB();
    const scanRecord = {
      ...scanData,
      timestamp: Date.now(),
      synced: false,
    };
    const id = await db.add('scans', scanRecord);
    
    // Also push to syncQueue if offline
    await db.add('syncQueue', {
      type: 'LEAF_SCAN_SYNC',
      scanId: id,
      payload: scanRecord,
      timestamp: Date.now(),
    });

    return id;
  } catch (err) {
    console.error('Failed to save scan to IndexedDB:', err);
    return null;
  }
}

// Retrieve all local scans from IndexedDB
export async function getLocalScans() {
  try {
    const db = await initOfflineDB();
    return await db.getAllFromIndex('scans', 'timestamp');
  } catch (err) {
    console.error('Failed to get scans from IndexedDB:', err);
    return [];
  }
}

// Get pending sync count
export async function getPendingSyncCount() {
  try {
    const db = await initOfflineDB();
    const queue = await db.getAll('syncQueue');
    return queue.length;
  } catch (err) {
    return 0;
  }
}

// Clear sync queue (simulating cloud synchronization)
export async function flushSyncQueue() {
  try {
    const db = await initOfflineDB();
    const tx = db.transaction(['syncQueue', 'scans'], 'readwrite');
    const queueStore = tx.objectStore('syncQueue');
    const scanStore = tx.objectStore('scans');

    const queue = await queueStore.getAll();
    for (const item of queue) {
      if (item.scanId) {
        const scan = await scanStore.get(item.scanId);
        if (scan) {
          scan.synced = true;
          await scanStore.put(scan);
        }
      }
    }
    await queueStore.clear();
    await tx.done;
    return true;
  } catch (err) {
    console.error('Error flushing sync queue:', err);
    return false;
  }
}
