/**
 * Firebase Item Handler
 * Manages item creation, updates, and image uploads
 * Integrates with Firestore and Firebase Storage
 */

/**
 * Sync items from Firebase to global app state
 * Called on app startup to load all items from Firestore
 * ✅ FIXED: Now merges Firebase items with local items instead of overwriting
 * This prevents deleted items from reappearing after refresh
 */
async function syncItemsFromFirebase() {
    try {
        console.log('🔄 Syncing items from Firebase...');

        if (!isFirebaseReady()) {
            console.warn('⚠️ Firebase not ready, using local items only');
            return items;
        }

        const firebaseItems = await loadItemsFromFirebase();

        if (firebaseItems && firebaseItems.length > 0) {
            // Map Firebase items to app format
            const mappedFirebaseItems = firebaseItems.map(item => ({
                ...item,
                id: item.id || Math.random(),
                firebaseId: item.id,
                userId: item.userId || item.uid,
                status: item.status || item.item_type || 'lost',
                resolved: item.resolved || false,
                matched: item.matched || false,
                category: item.category || item.category_id,
                location: item.location || item.location_description || 'Campus',
                date: item.date || item.found_on_date || new Date().toISOString().split('T')[0]
            }));

            // Build set of Firebase IDs
            const firebaseIds = new Set(mappedFirebaseItems.map(item => item.firebaseId));
            console.log(`📍 Firebase has ${firebaseIds.size} items:`, Array.from(firebaseIds));

            // ✅ CRITICAL FIX: Keep ONLY items in Firebase
            // Remove ALL local items NOT in Firebase (they were deleted)
            let filteredItems = items.filter(localItem => {
                const existsInFirebase = firebaseIds.has(localItem.firebaseId) || firebaseIds.has(localItem.id);
                if (!existsInFirebase) {
                    console.log('🗑️ REMOVING deleted item (not in Firebase):', localItem.firebaseId || localItem.id);
                    return false;
                }
                return true;
            });

            // Replace with Firebase data
            const finalItems = mappedFirebaseItems.concat(
                filteredItems.filter(local => !mappedFirebaseItems.find(fb => fb.firebaseId === local.firebaseId))
            );

            items = finalItems;

            // Save to localStorage as well
            localStorage.setItem('items', JSON.stringify(items));
            console.log(`✅ Synced ${items.length} items from Firebase (merge mode)`);
            return items;
        } else {
            console.warn('⚠️ No items found in Firebase, using local items');
            return items;
        }
    } catch (error) {
        console.error('❌ Firebase sync error:', error);
        console.log('Continuing with local items...');
        return items;
    }
}

/**
 * Create a new item (Lost or Found)
 */
async function createItemWithFirebase(itemData) {
    try {
        if (!isUserLoggedIn()) {
            showToast('Please login first', 'error');
            return { success: false, error: 'User not authenticated' };
        }

        // Validate required fields
        if (!itemData.title || !itemData.description || !itemData.status || !itemData.category) {
            showToast('Please fill all required fields', 'error');
            return { success: false, error: 'Missing required fields' };
        }

        // Show loading state
        showToast('📝 Creating item...', 'info');

        // Create item in Firestore
        const result = await firebaseCreateItem({
            title: itemData.title,
            description: itemData.description,
            status: itemData.status, // 'lost' or 'found'
            category: itemData.category,
            location: itemData.location || 'Campus',
            images: itemData.images || [],
            dateTime: itemData.dateTime || new Date().toISOString(),
            color: itemData.color || '',
            brand: itemData.brand || '',
            reward: itemData.reward || '',
            itemCondition: itemData.itemCondition || 'normal'
        });

        if (result.success) {
            showToast('✅ Item posted successfully!', 'success');
            console.log('✅ Item created:', result.id);
            return { success: true, itemId: result.id };
        } else {
            showToast('❌ Failed to create item: ' + result.error, 'error');
            return result;
        }
    } catch (error) {
        console.error('❌ Create item error:', error);
        showToast('❌ Error: ' + error.message, 'error');
        return { success: false, error: error.message };
    }
}

/**
 * Upload item images to Firebase Storage
 */
async function uploadItemImagesToFirebase(itemId, files) {
    try {
        if (!files || files.length === 0) {
            console.warn('⚠️ No files selected');
            return { success: true, urls: [] };
        }

        console.log(`📤 Uploading ${files.length} image(s)...`);

        const result = await firebaseUploadMultipleImages(itemId, files);

        if (result.success) {
            showToast(`✅ ${result.urls.length} image(s) uploaded`, 'success');
            return result;
        } else {
            showToast('❌ Upload failed: ' + result.error, 'error');
            return result;
        }
    } catch (error) {
        console.error('❌ Upload error:', error);
        showToast('❌ Error: ' + error.message, 'error');
        return { success: false, error: error.message };
    }
}

/**
 * Post item with images
 */
async function postItemWithImages(itemData, imageFiles) {
    try {
        // Step 1: Create item
        const itemResult = await createItemWithFirebase(itemData);
        if (!itemResult.success) return itemResult;

        const itemId = itemResult.itemId;

        // Step 2: Upload images (if any)
        if (imageFiles && imageFiles.length > 0) {
            const uploadResult = await uploadItemImagesToFirebase(itemId, imageFiles);

            if (uploadResult.success && uploadResult.urls.length > 0) {
                // Update item with image URLs
                await firebaseUpdateItem(itemId, { images: uploadResult.urls });
            } else {
                console.warn('⚠️ Some images failed to upload');
            }
        }

        return { success: true, itemId: itemId };
    } catch (error) {
        console.error('❌ Post item error:', error);
        showToast('❌ Error: ' + error.message, 'error');
        return { success: false, error: error.message };
    }
}

/**
 * Get all items with filters
 */
async function loadItemsFromFirebase(filters = {}) {
    try {
        console.log('📥 Loading items from Firebase...', filters);

        const result = await firebaseGetItems(filters);

        if (result.success) {
            console.log(`✅ Loaded ${result.data.length} items`);
            return result.data;
        } else {
            console.error('❌ Load items error:', result.error);
            showToast('Error loading items: ' + result.error, 'error');
            return [];
        }
    } catch (error) {
        console.error('❌ Error:', error);
        return [];
    }
}

/**
 * Get single item details
 */
async function getItemDetailsFromFirebase(itemId) {
    try {
        const result = await firebaseGetItemById(itemId);

        if (result.success) {
            console.log('✅ Item loaded:', itemId);
            return result.data;
        } else {
            showToast('Item not found', 'error');
            return null;
        }
    } catch (error) {
        console.error('❌ Error:', error);
        return null;
    }
}

/**
 * Update item
 */
async function updateItemInFirebase(itemId, updates) {
    try {
        if (!isUserLoggedIn()) {
            showToast('Please login first', 'error');
            return { success: false };
        }

        showToast('Updating item...', 'info');

        const result = await firebaseUpdateItem(itemId, updates);

        if (result.success) {
            showToast('✅ Item updated successfully', 'success');
        } else {
            showToast('❌ Update failed: ' + result.error, 'error');
        }

        return result;
    } catch (error) {
        console.error('❌ Update error:', error);
        showToast('❌ Error: ' + error.message, 'error');
        return { success: false, error: error.message };
    }
}

/**
 * Mark item as resolved
 */
async function markItemResolvedFirebase(itemId) {
    return await updateItemInFirebase(itemId, { resolved: true });
}

/**
 * Mark items as matched
 */
async function markItemsMatchedFirebase(lostItemId, foundItemId) {
    try {
        await updateItemInFirebase(lostItemId, { matched: true });
        await updateItemInFirebase(foundItemId, { matched: true });

        showToast('✅ Items marked as matched', 'success');
        return { success: true };
    } catch (error) {
        console.error('❌ Match error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Delete item
 */
async function deleteItemFromFirebase(itemId) {
    try {
        if (!isUserLoggedIn()) {
            showToast('Please login first', 'error');
            return { success: false };
        }

        showConfirm('Are you sure you want to delete this item?', async () => {
            showToast('Deleting item...', 'info');

            const result = await firebaseDeleteItem(itemId);

            if (result.success) {
                showToast('✅ Item deleted successfully', 'success');
            } else {
                showToast('❌ Delete failed: ' + result.error, 'error');
            }
        });

        return { success: true };
    } catch (error) {
        console.error('❌ Delete error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Search items
 */
async function searchItemsFirebase(searchTerm) {
    try {
        if (!searchTerm || searchTerm.trim().length < 2) {
            return [];
        }

        console.log('🔍 Searching for:', searchTerm);

        const result = await firebaseSearchItems(searchTerm);

        if (result.success) {
            console.log(`✅ Found ${result.data.length} items`);
            return result.data;
        } else {
            console.error('❌ Search error:', result.error);
            return [];
        }
    } catch (error) {
        console.error('❌ Error:', error);
        return [];
    }
}

/**
 * Filter items by status
 */
async function getItemsByStatusFirebase(status) {
    return await loadItemsFromFirebase({ status: status });
}

/**
 * Filter items by category
 */
async function getItemsByCategoryFirebase(category) {
    return await loadItemsFromFirebase({ category: category });
}

/**
 * Get user's items
 */
async function getUserItemsFirebase(userId) {
    return await loadItemsFromFirebase({ userId: userId });
}

/**
 * Get trending/popular items
 */
async function getTrendingItemsFirebase(limit = 10) {
    return await loadItemsFromFirebase({
        sortBy: 'views',
        sortDirection: 'desc',
        limit: limit
    });
}

/**
 * Get recent items
 */
async function getRecentItemsFirebase(limit = 20) {
    return await loadItemsFromFirebase({
        sortBy: 'createdAt',
        sortDirection: 'desc',
        limit: limit
    });
}

/**
 * Get user's own items
 */
async function getMyItemsFirebase() {
    const user = getCurrentUserProfile();
    if (!user) return [];
    return await getUserItemsFirebase(user.uid);
}

/**
 * Get unresolved items
 */
async function getUnresolvedItemsFirebase(limit = 50) {
    const result = await firebaseGetItems({
        resolved: false,
        limit: limit,
        sortBy: 'createdAt',
        sortDirection: 'desc'
    });
    return result.success ? result.data : [];
}

/**
 * Get resolved items
 */
async function getResolvedItemsFirebase(limit = 50) {
    const result = await firebaseGetItems({
        resolved: true,
        limit: limit,
        sortBy: 'updatedAt',
        sortDirection: 'desc'
    });
    return result.success ? result.data : [];
}

/**
 * Format item data for display
 */
function formatItemForDisplay(item) {
    return {
        id: item.id,
        title: item.title,
        description: item.description,
        status: item.status,
        category: item.category,
        location: item.location,
        images: item.images || [],
        mainImage: item.images?.[0] || 'https://via.placeholder.com/300x200?text=No+Image',
        createdAt: item.createdAt?.toDate?.() || new Date(item.createdAt),
        resolved: item.resolved,
        matched: item.matched,
        views: item.views,
        userId: item.userId,
        userName: item.userName,
        userAvatar: item.userAvatar
    };
}

/**
 * Get items for display with pagination
 */
async function getItemsForDisplayFirebase(status = 'lost', page = 1, pageSize = 10) {
    const startIndex = (page - 1) * pageSize;
    const items = await getItemsByStatusFirebase(status);

    const paginatedItems = items.slice(startIndex, startIndex + pageSize);
    return paginatedItems.map(formatItemForDisplay);
}
