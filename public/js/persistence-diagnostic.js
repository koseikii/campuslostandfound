/**
 * Data Persistence Diagnostic & Quick Fix Tool
 * Use this to troubleshoot and verify delete functionality works correctly
 */

console.log('🔍 Data Persistence Diagnostic Tool Ready');

/**
 * Check if item was properly deleted from Firebase
 */
async function checkItemDeletion() {
    console.log('\n=== DELETION CHECK ===');

    if (!isFirebaseReady()) {
        console.error('❌ Firebase not ready');
        return;
    }

    // Get all items from Firebase
    const fbItems = await loadItemsFromFirebase();
    console.log(`📍 Firebase has ${fbItems ? fbItems.length : 0} items`);
    fbItems.forEach(item => {
        console.log(`  - ${item.id}: ${item.title || '(no title)'}`);
    });

    // Get local items
    console.log(`\n📱 Local app has ${items.length} items`);
    items.forEach(item => {
        console.log(`  - ${item.id}: ${item.title || '(no title)'} (firebaseId: ${item.firebaseId})`);
    });

    // Find mismatches
    const fbIds = new Set(fbItems.map(i => i.id));
    const localMissing = items.filter(i => !fbIds.has(i.firebaseId) && !fbIds.has(i.id));

    if (localMissing.length > 0) {
        console.warn(`\n⚠️ FOUND ${localMissing.length} items in app but NOT in Firebase:`);
        localMissing.forEach(item => {
            console.warn(`  - ${item.id}: "${item.title}"`);
        });
    } else {
        console.log('\n✅ All local items exist in Firebase');
    }
}

/**
 * Force sync from Firebase - discarding any local items not in Firebase
 */
async function forceCleanSync() {
    console.log('\n=== FORCING CLEAN SYNC ===');

    if (!isFirebaseReady()) {
        console.error('❌ Firebase not ready');
        return;
    }

    const fbItems = await loadItemsFromFirebase();
    console.log(`📥 Loading ${fbItems.length} items from Firebase`);

    // Replace all items with Firebase items
    items = fbItems.map(item => ({
        ...item,
        id: item.id,
        firebaseId: item.id,
        userId: item.userId || item.uid,
        status: item.status || 'lost',
        resolved: item.resolved || false,
        matched: item.matched || false
    }));

    // Save to localStorage
    localStorage.setItem('items', JSON.stringify(items));
    console.log(`✅ Synced ${items.length} items. Refreshing UI...`);

    // Refresh UI
    if (typeof renderItems === 'function') renderItems();
    if (typeof updateStats === 'function') updateStats();

    console.log('✅ Clean sync complete!');
}

/**
 * Clear all items locally and reload from Firebase
 */
async function hardReset() {
    console.log('\n=== HARD RESET ===');

    if (!confirm('This will clear all local items and reload from Firebase. Continue?')) {
        console.log('Cancelled');
        return;
    }

    // Clear localStorage
    localStorage.removeItem('items');
    items = [];
    console.log('🗑️ Cleared localStorage');

    // Reload from Firebase
    await forceCleanSync();
}

/**
 * Verify a specific item is deleted
 */
async function verifyItemDeleted(itemId) {
    console.log(`\n=== CHECKING ITEM ${itemId} ===`);

    // Check Firebase
    const fbItems = await loadItemsFromFirebase();
    const fbItem = fbItems.find(i => i.id === itemId);

    if (fbItem) {
        console.error(`❌ Item FOUND in Firebase (should be deleted):`);
        console.error(fbItem);
    } else {
        console.log(`✅ Item correctly deleted from Firebase`);
    }

    // Check local
    const localItem = items.find(i => i.id === itemId || i.firebaseId === itemId);
    if (localItem) {
        console.error(`⚠️ Item still in local app (will be cleaned on next sync):`);
        console.error(localItem);
    } else {
        console.log(`✅ Item not in local app`);
    }
}

/**
 * Show detailed item comparison
 */
function showItemComparison() {
    console.log('\n=== ITEM DETAILS ===');
    console.log('Local items with IDs:');
    items.forEach(item => {
        console.log(`  ID: ${item.id}`);
        console.log(`  Firebase ID: ${item.firebaseId}`);
        console.log(`  Title: ${item.title}`);
        console.log(`  Status: ${item.resolved ? 'RESOLVED' : 'ACTIVE'}`);
        console.log('  ---');
    });
}

console.log('\n✅ Diagnostic Tool Available');
console.log('Use these commands in browser console:');
console.log('  - checkItemDeletion() - Check what\'s in Firebase vs app');
console.log('  - forceCleanSync() - Reload all items from Firebase');
console.log('  - hardReset() - Clear local data and reload from Firebase');
console.log('  - verifyItemDeleted(id) - Check if specific item is deleted');
console.log('  - showItemComparison() - See all item details');
