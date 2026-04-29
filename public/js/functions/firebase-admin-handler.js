/**
 * Firebase Admin Handler
 * Manages admin functions for items and users with Firebase integration
 */

/**
 * Sync users from Firebase to global app state
 * Called when admin panel loads to get all users from Firestore
 */
async function syncUsersFromFirebase() {
    try {
        console.log('🔄 Syncing users from Firebase...');

        if (!isFirebaseReady()) {
            console.warn('⚠️ Firebase not ready, using local users only');
            return users;
        }

        // Get all users from Firestore
        const result = await firebaseGetCollection('users');

        if (result.data && result.data.length > 0) {
            // Map Firebase users to app format
            const firebaseUsers = result.data.map(doc => ({
                id: doc.id,
                uid: doc.id,
                ...doc.data(),
                loginHistory: doc.data().loginHistory || [],
                lastLogin: doc.data().lastLogin || null
            }));

            // Merge with existing local users but prioritize Firebase data
            const mergedUsers = firebaseUsers.map(fUser => {
                const localUser = users.find(u => u.uid === fUser.uid || u.id === fUser.id);
                return {
                    ...localUser,
                    ...fUser
                };
            });

            // Keep any local users that don't exist in Firebase
            const newLocalUsers = users.filter(u =>
                !mergedUsers.find(mu => mu.uid === u.uid || mu.id === u.id)
            );

            users = [...mergedUsers, ...newLocalUsers];
            localStorage.setItem('users', JSON.stringify(users));

            console.log(`✅ Synced ${users.length} users from Firebase`);
            return users;
        } else {
            console.warn('⚠️ No users found in Firebase, using local users');
            return users;
        }
    } catch (error) {
        console.error('❌ Firebase sync error:', error);
        console.log('Continuing with local users...');
        return users;
    }
}

/**
 * Sync deleted items from Firebase to global app state
 */
async function syncDeletedItemsFromFirebase() {
    try {
        console.log('🔄 Syncing deleted items from Firebase...');

        if (!isFirebaseReady()) {
            console.warn('⚠️ Firebase not ready, using local deleted items only');
            return deletedItems;
        }

        // Get deleted items collection from Firestore
        const result = await firebaseGetCollection('deletedItems');

        if (result.data && result.data.length > 0) {
            deletedItems = result.data.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            localStorage.setItem('deletedItems', JSON.stringify(deletedItems));
            console.log(`✅ Synced ${deletedItems.length} deleted items from Firebase`);
            return deletedItems;
        } else {
            console.warn('⚠️ No deleted items found in Firebase');
            return deletedItems;
        }
    } catch (error) {
        console.error('❌ Firebase sync error:', error);
        return deletedItems;
    }
}

/**
 * Load admin items from Firebase (unresolved items)
 */
async function loadAdminItemsFromFirebase() {
    try {
        console.log('📥 Loading unresolved items from Firebase...');

        if (!isFirebaseReady()) {
            console.warn('⚠️ Firebase not ready, using local items only');
            return items;
        }

        // Get items from Firebase
        const result = await firebaseGetCollection('items');

        if (result.data && result.data.length > 0) {
            const firebaseItems = result.data.map(doc => ({
                id: doc.id,
                firebaseId: doc.id,
                ...doc.data()
            }));

            // Filter for unresolved items
            const unresolvedItems = firebaseItems.filter(item => !item.resolved);

            console.log(`✅ Loaded ${unresolvedItems.length} unresolved items from Firebase`);
            return unresolvedItems;
        } else {
            console.warn('⚠️ No items found in Firebase');
            return [];
        }
    } catch (error) {
        console.error('❌ Firebase load error:', error);
        return [];
    }
}

/**
 * Load resolved items from Firebase
 */
async function loadResolvedItemsFromFirebase() {
    try {
        console.log('📥 Loading resolved items from Firebase...');

        if (!isFirebaseReady()) {
            console.warn('⚠️ Firebase not ready, using local items only');
            return [];
        }

        // Get items from Firebase
        const result = await firebaseGetCollection('items');

        if (result.data && result.data.length > 0) {
            const firebaseItems = result.data.map(doc => ({
                id: doc.id,
                firebaseId: doc.id,
                ...doc.data()
            }));

            // Filter for resolved items
            const resolvedItems = firebaseItems.filter(item => item.resolved);

            console.log(`✅ Loaded ${resolvedItems.length} resolved items from Firebase`);
            return resolvedItems;
        } else {
            console.warn('⚠️ No items found in Firebase');
            return [];
        }
    } catch (error) {
        console.error('❌ Firebase load error:', error);
        return [];
    }
}

/**
 * Delete item from Firebase and local storage
 */
async function deleteItemFromAdmin(itemId) {
    try {
        console.log('🗑️ Deleting item:', itemId);

        // Find item
        const index = items.findIndex(i => i.id === itemId);
        if (index === -1) {
            console.error('❌ Item not found');
            return { success: false, error: 'Item not found' };
        }

        const item = items[index];

        // Delete from local array
        items.splice(index, 1);

        // Delete from Firestore if it has Firebase ID
        if (item.firebaseId && isFirebaseReady()) {
            try {
                await firebaseDeleteDocument('items', item.firebaseId);
                console.log('✅ Item deleted from Firebase');
            } catch (error) {
                console.error('⚠️ Error deleting from Firebase:', error);
                // Continue even if Firebase delete fails
            }
        }

        // Save to localStorage
        localStorage.setItem('items', JSON.stringify(items));

        console.log('✅ Item deleted successfully');
        return { success: true };
    } catch (error) {
        console.error('❌ Delete error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Delete user from Firebase and local storage
 */
async function deleteUserFromAdmin(userId) {
    try {
        console.log('🗑️ Deleting user:', userId);

        // Find user
        const userIndex = users.findIndex(u => u.id === userId);
        if (userIndex === -1) {
            console.error('❌ User not found');
            return { success: false, error: 'User not found' };
        }

        const user = users[userIndex];

        // Delete user's items
        const userItemIds = items.filter(i => i.userId === userId).map(i => i.id);
        for (const itemId of userItemIds) {
            await deleteItemFromAdmin(itemId);
        }

        // Delete user from local array
        users.splice(userIndex, 1);

        // Delete from Firestore if available
        if (user.uid && isFirebaseReady()) {
            try {
                await firebaseDeleteDocument('users', user.uid);
                console.log('✅ User deleted from Firebase');
            } catch (error) {
                console.error('⚠️ Error deleting from Firebase:', error);
                // Continue even if Firebase delete fails
            }
        }

        // Save to localStorage
        localStorage.setItem('users', JSON.stringify(users));
        localStorage.setItem('items', JSON.stringify(items));

        console.log('✅ User deleted successfully');
        return { success: true };
    } catch (error) {
        console.error('❌ Delete error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Mark item as resolved
 */
async function markItemAsResolvedFromAdmin(itemId) {
    try {
        const item = items.find(i => i.id === itemId);
        if (!item) {
            return { success: false, error: 'Item not found' };
        }

        item.resolved = true;
        item.resolvedDate = new Date().toISOString();

        // Update in Firestore if available
        if (item.firebaseId && isFirebaseReady()) {
            try {
                await firebaseUpdateDocument('items', item.firebaseId, {
                    resolved: true,
                    resolvedDate: item.resolvedDate
                });
                console.log('✅ Item marked as resolved in Firebase');
            } catch (error) {
                console.error('⚠️ Error updating Firebase:', error);
            }
        }

        // Save to localStorage
        localStorage.setItem('items', JSON.stringify(items));

        return { success: true };
    } catch (error) {
        console.error('❌ Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Mark item as unresolved
 */
async function markItemAsUnresolvedFromAdmin(itemId) {
    try {
        const item = items.find(i => i.id === itemId);
        if (!item) {
            return { success: false, error: 'Item not found' };
        }

        item.resolved = false;
        item.resolvedDate = null;

        // Update in Firestore if available
        if (item.firebaseId && isFirebaseReady()) {
            try {
                await firebaseUpdateDocument('items', item.firebaseId, {
                    resolved: false,
                    resolvedDate: null
                });
                console.log('✅ Item marked as unresolved in Firebase');
            } catch (error) {
                console.error('⚠️ Error updating Firebase:', error);
            }
        }

        // Save to localStorage
        localStorage.setItem('items', JSON.stringify(items));

        return { success: true };
    } catch (error) {
        console.error('❌ Error:', error);
        return { success: false, error: error.message };
    }
}
