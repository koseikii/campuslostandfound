// ========== DATABASE SYNC ==========
const API_URL = '../../database/api.php';

// Save to MySQL via API (primary storage)
function saveData() {
    // Data is saved directly to MySQL via API calls
    // This function is now primarily for syncing with MySQL
    syncWithMySQL();
}

// Sync data with MySQL database via API
async function syncWithMySQL() {
    try {
        if (!currentUser) return; // Don't sync if no user logged in

        // Items are saved individually via createItem/updateItem API calls
        // Users are saved via createUser/updateUser API calls
        // This is now handled by the specific action handlers
    } catch (error) {
        console.error('MySQL sync error:', error);
    }
}

// API call wrapper - now just passes to APIService
async function apiCall(action, method = 'GET', data = null) {
    console.warn('apiCall is deprecated, use APIService instead');
    return null;
}

// User API functions
async function updateUserMySQL(user) {
    try {
        const api = new APIService();
        const result = await api.updateUser(user.id, {
            name: user.name,
            email: user.email,
            phone: user.phone
        });
        return result.success;
    } catch (error) {
        console.error('Error updating user:', error);
        return false;
    }
}

async function createUserMySQL(user) {
    try {
        const api = new APIService();
        const result = await api.signup(user.name, user.email, user.phone, user.password, user.role);
        if (result.success && result.data) {
            user.id = result.data.id;
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error creating user:', error);
        return false;
    }
}

// Item API functions
async function createItemMySQL(item) {
    try {
        const api = new APIService();
        const result = await api.createItem(
            item.title,
            item.description,
            item.category,
            item.status,
            item.location,
            item.image
        );
        if (result.success && result.data) {
            item.id = result.data.id;
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error creating item:', error);
        return false;
    }
}

async function updateItemMySQL(item) {
    try {
        const api = new APIService();
        const result = await api.updateItem(item.id, {
            title: item.title,
            description: item.description,
            status: item.status,
            resolved: item.resolved
        });
        return result.success;
    } catch (error) {
        console.error('Error updating item:', error);
        return false;
    }
}

async function deleteItemMySQL(itemId) {
    try {
        const api = new APIService();
        const result = await api.deleteItem(itemId);
        return result.success;
    } catch (error) {
        console.error('Error deleting item:', error);
        return false;
    }
}

// Initialize database on page load
async function initializeDatabase() {
    try {
        // Create API service instance
        const api = new APIService();

        // Load categories from API
        const categoriesResult = await api.getCategories();
        if (categoriesResult.success && categoriesResult.data) {
            window.categories = categoriesResult.data;
            console.log(`✅ Loaded ${categoriesResult.data.length} categories from MySQL`);
        }

        // Load locations from API
        const locationsResult = await api.getLocations();
        if (locationsResult.success && locationsResult.data) {
            window.locations = locationsResult.data;
            console.log(`✅ Loaded ${locationsResult.data.length} locations from MySQL`);
        }

        // Try to load items from MySQL first via API
        const itemsResult = await api.getItems();
        if (itemsResult.success && itemsResult.data) {
            items = itemsResult.data;
            console.log(`✅ Loaded ${items.length} items from MySQL`);
            return true;
        }

        console.log('Database initialized from MySQL');
        return true;
    } catch (error) {
        console.error('❌ Database initialization error:', error);
        // Fall back to mock data
        console.log('Using fallback mock data...');
        return false;
    }
}

// Soft Delete Function
function softDeleteItem(itemId) {
    const itemIndex = items.findIndex(i => i.id === itemId);
    if (itemIndex !== -1) {
        const item = items[itemIndex];

        // Log audit action for item deletion
        if (typeof logAuditAction === 'function' && currentUser) {
            logAuditAction('ITEM_DELETED', currentUser.id, {
                itemId: item.id,
                title: item.title,
                status: item.status,
                deletedDate: new Date().toISOString()
            });
        }

        deletedItems.push({
            ...item,
            deletedAt: new Date().toISOString(),
            deletedBy: currentUser.id
        });
        items.splice(itemIndex, 1);
        saveData();

        // Delete from MySQL (background)
        deleteItemMySQL(itemId).then(success => {
            if (success) {
                console.log('Item deleted from MySQL');
            }
        });

        showToast('Item deleted successfully', 'success');
    }
}
