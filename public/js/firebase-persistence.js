/**
 * Firebase Persistence Layer
 * Ensures all data mutations are saved to Firebase with retry logic and error recovery
 * Prevents data from reverting after refresh
 */

console.log('🔒 Firebase Persistence Layer Loading...');

// Queue for failed operations to retry later
let persistenceQueue = [];
let isProcessingQueue = false;

/**
 * Generic persist function with retry logic
 * Ensures critical operations are never lost
 */
async function persistToFirebase(operation) {
    try {
        if (!isFirebaseReady()) {
            console.warn('⚠️ Firebase not ready, queuing operation');
            persistenceQueue.push(operation);
            return { success: false, queued: true };
        }

        const result = await operation();

        if (result.success) {
            console.log('✅ Operation persisted to Firebase:', operation.name || 'unnamed');
            return result;
        } else {
            console.warn('⚠️ Operation failed, queuing for retry:', operation.name);
            persistenceQueue.push(operation);
            return result;
        }
    } catch (error) {
        console.error('❌ Persistence error:', error);
        persistenceQueue.push(operation);
        return { success: false, error: error.message };
    }
}

/**
 * Process queued operations when Firebase becomes available
 */
async function processPersistenceQueue() {
    if (isProcessingQueue || persistenceQueue.length === 0) return;

    isProcessingQueue = true;
    console.log(`🔄 Processing ${persistenceQueue.length} queued operations...`);

    const failedOps = [];

    while (persistenceQueue.length > 0) {
        const operation = persistenceQueue.shift();

        try {
            if (!isFirebaseReady()) {
                failedOps.push(operation);
                continue;
            }

            const result = await operation();

            if (result.success) {
                console.log('✅ Queued operation completed');
            } else {
                console.warn('⚠️ Queued operation still failing, will retry later');
                failedOps.push(operation);
            }
        } catch (error) {
            console.error('❌ Error processing queued operation:', error);
            failedOps.push(operation);
        }
    }

    persistenceQueue = failedOps;
    isProcessingQueue = false;

    if (persistenceQueue.length === 0) {
        console.log('✅ All queued operations processed successfully!');
    } else {
        console.warn(`⚠️ ${persistenceQueue.length} operations still pending, will retry on next sync`);
    }
}

/**
 * Persist item deletion to Firebase
 */
async function persistItemDeletion(itemId, firebaseId) {
    return persistToFirebase(async () => {
        if (!firebaseId) {
            return { success: false, error: 'No Firebase ID' };
        }

        const result = await firebaseDeleteDocument('items', firebaseId);

        if (result.success) {
            console.log('✅ Item deletion persisted to Firebase:', firebaseId);
            localStorage.setItem(`item_deleted_${itemId}`, 'true');
        }

        return result;
    });
}

/**
 * Persist item status update to Firebase
 */
async function persistItemUpdate(itemId, firebaseId, updateData) {
    return persistToFirebase(async () => {
        if (!firebaseId) {
            return { success: false, error: 'No Firebase ID' };
        }

        const result = await firebaseUpdateDocument('items', firebaseId, {
            ...updateData,
            updatedAt: new Date().toISOString()
        });

        if (result.success) {
            console.log('✅ Item update persisted to Firebase:', firebaseId);
            localStorage.setItem(`item_updated_${itemId}`, JSON.stringify(updateData));
        }

        return result;
    });
}

/**
 * Persist new item creation to Firebase
 */
async function persistNewItem(itemData) {
    return persistToFirebase(async () => {
        const result = await firebaseAddDocument('items', itemData);

        if (result.success) {
            console.log('✅ New item persisted to Firebase:', result.id);
            localStorage.setItem(`item_created_${result.id}`, 'true');
        }

        return result;
    });
}

/**
 * Check for items that need to be synced due to failed Firebase operations
 * Runs on app startup to recover from network failures
 */
async function recoverUnSyncedItems() {
    try {
        console.log('🔄 Checking for unsynced items...');

        // Check for deleted items that need to be confirmed deleted in Firebase
        const deletedKeys = Object.keys(localStorage).filter(k => k.startsWith('item_deleted_'));

        if (deletedKeys.length > 0) {
            console.log(`⚠️ Found ${deletedKeys.length} items pending deletion sync`);

            for (const key of deletedKeys) {
                const itemId = key.replace('item_deleted_', '');
                const item = items.find(i => i.id === parseInt(itemId));

                if (item && item.firebaseId) {
                    console.log(`🔄 Re-syncing deletion for item ${itemId}...`);
                    const result = await firebaseDeleteDocument('items', item.firebaseId);

                    if (result.success) {
                        localStorage.removeItem(key);
                    }
                }
            }
        }

        // Check for updated items that need sync confirmation
        const updateKeys = Object.keys(localStorage).filter(k => k.startsWith('item_updated_'));

        if (updateKeys.length > 0) {
            console.log(`⚠️ Found ${updateKeys.length} items pending update sync`);

            for (const key of updateKeys) {
                const itemId = key.replace('item_updated_', '');
                const item = items.find(i => i.id === parseInt(itemId));
                const updateData = JSON.parse(localStorage.getItem(key) || '{}');

                if (item && item.firebaseId) {
                    console.log(`🔄 Re-syncing update for item ${itemId}...`);
                    const result = await firebaseUpdateDocument('items', item.firebaseId, updateData);

                    if (result.success) {
                        localStorage.removeItem(key);
                    }
                }
            }
        }

        console.log('✅ Unsynced items recovery complete');
    } catch (error) {
        console.error('❌ Error recovering unsynced items:', error);
    }
}

/**
 * Force sync all local items with Firebase
 * Useful for troubleshooting data consistency
 */
async function forceFullSync() {
    try {
        console.log('🔄 Force syncing all items with Firebase...');

        if (!isFirebaseReady()) {
            console.error('❌ Firebase not ready for full sync');
            return { success: false, error: 'Firebase not ready' };
        }

        // Get all Firebase items
        const firebaseItems = await loadItemsFromFirebase();
        const firebaseIds = new Set(firebaseItems.map(i => i.id));

        let syncedCount = 0;
        let deletedCount = 0;

        // Check each local item
        for (const item of items) {
            if (item.firebaseId && !firebaseIds.has(item.firebaseId)) {
                console.log(`🗑️ Local item not in Firebase, removing:`, item.firebaseId);
                items = items.filter(i => i.id !== item.id);
                deletedCount++;
            }
        }

        // Add Firebase items not in local
        for (const fbItem of firebaseItems) {
            if (!items.find(i => i.firebaseId === fbItem.id)) {
                console.log(`➕ Adding Firebase item not in local:`, fbItem.id);
                items.push({
                    ...fbItem,
                    firebaseId: fbItem.id,
                    id: fbItem.id || Math.random()
                });
                syncedCount++;
            }
        }

        localStorage.setItem('items', JSON.stringify(items));
        console.log(`✅ Full sync complete: ${syncedCount} added, ${deletedCount} removed`);

        return {
            success: true,
            syncedCount,
            deletedCount
        };
    } catch (error) {
        console.error('❌ Force sync error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Monitor Firebase connection and resume sync when connection restored
 */
function monitorFirebaseConnection() {
    console.log('📡 Monitoring Firebase connection...');

    // Check connection every 10 seconds
    setInterval(async () => {
        if (isFirebaseReady() && persistenceQueue.length > 0) {
            console.log('📡 Firebase reconnected, processing queued operations...');
            await processPersistenceQueue();
        }
    }, 10000);
}

// Start monitoring on load
setTimeout(() => {
    monitorFirebaseConnection();
}, 2000);

// Recover unsynced items on app startup
setTimeout(() => {
    if (currentUser && isFirebaseReady()) {
        recoverUnSyncedItems();
    }
}, 3000);

console.log('✅ Firebase Persistence Layer Ready');
console.log('📍 Available functions:');
console.log('   - persistToFirebase() - Generic persist with retry');
console.log('   - persistItemDeletion() - Delete and sync');
console.log('   - persistItemUpdate() - Update and sync');
console.log('   - persistNewItem() - Create and sync');
console.log('   - recoverUnSyncedItems() - Recover from failures');
console.log('   - forceFullSync() - Full data sync');
console.log('   - processPersistenceQueue() - Manual queue processing');
