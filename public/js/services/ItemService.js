/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ITEM SERVICE - Item Business Logic
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * High-level item operations
 * Integrates: Firestore + Storage + Validators + Sync
 */

console.log('🎯 Item Service Loading...');

// ============================================================================
// CREATE ITEM
// ============================================================================

/**
 * Create a new lost or found item
 * 
 * @param {object} itemData - { name, description, category, status, location, date, images }
 * @param {File[]} imageFiles - Image files to upload (optional)
 * @param {function} onProgress - Progress callback
 * @returns {Promise<object>} - { success, itemId, error }
 */
async function itemServiceCreateItem(itemData, imageFiles = [], onProgress) {
    try {
        console.log('📝 Creating item...');

        // Get current user
        const state = window.SyncService.getState();
        if (!state.currentUser?.id) {
            return { success: false, error: 'User not authenticated' };
        }

        // Normalize data
        const normalized = window.Validators.normalizeItem({
            ...itemData,
            userId: state.currentUser.id
        });

        // Validate
        const validation = window.Validators.validateItem(normalized);
        if (!validation.valid) {
            return { success: false, error: validation.errors.join('; ') };
        }

        // Upload images first
        let imageUrls = [];
        if (imageFiles.length > 0) {
            // Create temporary item ID for image folder
            const tempId = Math.random().toString(36).substr(2, 9);
            const uploadResult = await window.StorageService.uploadImages(
                imageFiles,
                tempId,
                onProgress
            );

            if (uploadResult.success) {
                imageUrls = uploadResult.urls;
            } else {
                console.warn('⚠️ Image upload failed:', uploadResult.error);
            }
        }

        // Create item in Firestore
        const itemToCreate = {
            ...normalized,
            images: imageUrls,
            userId: state.currentUser.id
        };

        const result = await window.FirestoreService.createItem(itemToCreate);

        if (result.success) {
            // Update app state
            const createdItem = { id: result.itemId, ...itemToCreate };
            window.SyncService.syncAddItem(createdItem);

            console.log('✅ Item created successfully');
            return { success: true, itemId: result.itemId };
        } else {
            return { success: false, error: result.error };
        }

    } catch (error) {
        console.error('❌ Error creating item:', error);
        return { success: false, error: error.message };
    }
}

// ============================================================================
// UPDATE ITEM
// ============================================================================

/**
 * Update item details
 * 
 * @param {string} itemId - Item ID
 * @param {string} status - 'lost' or 'found'
 * @param {object} updates - Fields to update
 * @returns {Promise<object>} - { success, error }
 */
async function itemServiceUpdateItem(itemId, status, updates) {
    try {
        console.log('✏️ Updating item:', itemId);

        // Get current user
        const state = window.SyncService.getState();
        const item = state.items.find(i => i.id === itemId);

        if (!item) {
            return { success: false, error: 'Item not found' };
        }

        // Verify ownership
        if (item.userId !== state.currentUser?.id) {
            return { success: false, error: 'Not authorized to update this item' };
        }

        // Validate updates
        const normalized = window.Validators.normalizeItem({ ...item, ...updates });
        const validation = window.Validators.validateItem(normalized);

        if (!validation.valid) {
            return { success: false, error: validation.errors.join('; ') };
        }

        // Update in Firestore
        const result = await window.FirestoreService.updateItem(itemId, status, updates);

        if (result.success) {
            window.SyncService.syncUpdateItem(itemId, updates);
            console.log('✅ Item updated');
            return { success: true };
        } else {
            return { success: false, error: result.error };
        }

    } catch (error) {
        console.error('❌ Error updating item:', error);
        return { success: false, error: error.message };
    }
}

// ============================================================================
// DELETE ITEM
// ============================================================================

/**
 * Delete an item
 * 
 * @param {string} itemId - Item ID
 * @param {string} status - 'lost' or 'found'
 * @returns {Promise<object>} - { success, error }
 */
async function itemServiceDeleteItem(itemId, status) {
    try {
        console.log('🗑️ Deleting item:', itemId);

        // Get current user
        const state = window.SyncService.getState();
        const item = state.items.find(i => i.id === itemId);

        if (!item) {
            return { success: false, error: 'Item not found' };
        }

        // Verify ownership or admin
        if (item.userId !== state.currentUser?.id && state.currentUser?.role !== 'admin') {
            return { success: false, error: 'Not authorized' };
        }

        // Delete images from Storage
        if (item.images && item.images.length > 0) {
            for (const imageUrl of item.images) {
                await window.StorageService.deleteImage(imageUrl);
            }
        }

        // Delete from Firestore
        const result = await window.FirestoreService.deleteItem(itemId, status);

        if (result.success) {
            window.SyncService.syncRemoveItem(itemId);
            console.log('✅ Item deleted');
            return { success: true };
        } else {
            return { success: false, error: result.error };
        }

    } catch (error) {
        console.error('❌ Error deleting item:', error);
        return { success: false, error: error.message };
    }
}

// ============================================================================
// GET ITEMS
// ============================================================================

/**
 * Get items from app state (cached)
 * 
 * @param {string} filter - 'all', 'lost', 'found', 'my'
 * @returns {Array}
 */
function itemServiceGetItems(filter = 'all') {
    try {
        const state = window.SyncService.getState();
        let filtered = state.items || [];

        if (filter === 'lost') {
            filtered = filtered.filter(i => i.status === 'lost');
        } else if (filter === 'found') {
            filtered = filtered.filter(i => i.status === 'found');
        } else if (filter === 'my') {
            filtered = filtered.filter(i => i.userId === state.currentUser?.id);
        }

        return filtered;
    } catch (error) {
        console.error('❌ Error getting items:', error);
        return [];
    }
}

/**
 * Search items
 * 
 * @param {string} searchTerm - Search text
 * @param {object} filters - { status, category, resolved }
 * @returns {Array}
 */
function itemServiceSearchItems(searchTerm = '', filters = {}) {
    try {
        let items = itemServiceGetItems('all');

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            items = items.filter(item =>
                item.name?.toLowerCase().includes(term) ||
                item.description?.toLowerCase().includes(term) ||
                item.location?.toLowerCase().includes(term)
            );
        }

        if (filters.status) {
            items = items.filter(i => i.status === filters.status);
        }

        if (filters.category) {
            items = items.filter(i => i.category === filters.category);
        }

        if (filters.resolved !== undefined) {
            items = items.filter(i => i.resolved === filters.resolved);
        }

        return items;
    } catch (error) {
        console.error('❌ Error searching items:', error);
        return [];
    }
}

// ============================================================================
// MARK ITEM AS RESOLVED
// ============================================================================

/**
 * Mark item as resolved/found
 * 
 * @param {string} itemId - Item ID
 * @param {string} status - 'lost' or 'found'
 * @returns {Promise<object>} - { success, error }
 */
async function itemServiceResolveItem(itemId, status) {
    try {
        console.log('✅ Marking item as resolved:', itemId);

        return await itemServiceUpdateItem(itemId, status, { resolved: true });

    } catch (error) {
        console.error('❌ Error resolving item:', error);
        return { success: false, error: error.message };
    }
}

// ============================================================================
// EXPORTS
// ============================================================================

window.ItemService = {
    createItem: itemServiceCreateItem,
    updateItem: itemServiceUpdateItem,
    deleteItem: itemServiceDeleteItem,
    getItems: itemServiceGetItems,
    searchItems: itemServiceSearchItems,
    resolveItem: itemServiceResolveItem
};

console.log('✅ Item Service Loaded');
