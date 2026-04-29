/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SYNC MODULE - Frontend-Firebase Synchronization
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Features:
 * - Real-time listeners
 * - State management
 * - Conflict resolution
 * - Change notifications
 */

console.log('🔄 Sync Module Loading...');

// ============================================================================
// GLOBAL APP STATE (Single source of truth)
// ============================================================================

let appState = {
    currentUser: null,
    items: [],
    users: [],
    claims: [],
    isLoading: false,
    lastSync: null,
    listeners: []
};

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

/**
 * Get current app state
 * 
 * @returns {object} - Current state
 */
function getAppState() {
    return { ...appState };
}

/**
 * Update app state
 * 
 * @param {object} updates - State updates
 * @param {string} source - Source of update (for logging)
 */
function updateAppState(updates, source = 'unknown') {
    appState = {
        ...appState,
        ...updates,
        lastSync: new Date().toISOString()
    };

    console.log(`🔄 App state updated by ${source}:`, Object.keys(updates));
    _notifyListeners('state-updated', { updates, source });
}

/**
 * Register state change listener
 * 
 * @param {function} callback - Callback function
 */
function onStateChange(callback) {
    if (typeof callback === 'function') {
        appState.listeners.push(callback);
    }
}

/**
 * Notify all listeners of state changes
 * 
 * @private
 */
function _notifyListeners(eventType, data) {
    appState.listeners.forEach(listener => {
        try {
            listener(eventType, data);
        } catch (error) {
            console.error('❌ Listener error:', error);
        }
    });
}

// ============================================================================
// INITIAL SYNC
// ============================================================================

/**
 * Perform initial sync when user logs in
 * Load all user data from Firestore
 * 
 * @param {object} user - Firebase auth user
 * @returns {Promise<object>} - { success, error }
 */
async function performInitialSync(user) {
    try {
        if (!user?.uid) {
            return { success: false, error: 'No user' };
        }

        console.log('🔄 Starting initial sync for user:', user.uid);
        updateAppState({ isLoading: true }, 'initial-sync');

        // Load user profile
        const userResult = await window.FirestoreService.getUserProfile(user.uid);
        if (userResult.success) {
            updateAppState({ currentUser: userResult.data }, 'user-profile');
        }

        // Load items
        const itemsResult = await window.FirestoreService.getItems('all');
        if (itemsResult.success) {
            updateAppState({ items: itemsResult.data }, 'items-load');
        }

        // Load users (for admin)
        const usersResult = await window.FirestoreService.getAllUsers();
        if (usersResult.success) {
            updateAppState({ users: usersResult.data }, 'users-load');
        }

        // Load claims
        const claimsResult = await window.FirestoreService.getClaims(user.uid, 'received');
        if (claimsResult.success) {
            updateAppState({ claims: claimsResult.data }, 'claims-load');
        }

        updateAppState({ isLoading: false }, 'initial-sync-complete');
        console.log('✅ Initial sync complete');

        return { success: true };

    } catch (error) {
        console.error('❌ Initial sync error:', error);
        updateAppState({ isLoading: false }, 'initial-sync-error');
        return { success: false, error: error.message };
    }
}

// ============================================================================
// ITEM SYNC
// ============================================================================

/**
 * Add item to app state (after creation)
 * 
 * @param {object} item - Item data
 */
function syncAddItem(item) {
    const currentItems = appState.items || [];
    const updated = [item, ...currentItems];
    updateAppState({ items: updated }, 'item-added');
}

/**
 * Update item in app state
 * 
 * @param {string} itemId - Item ID
 * @param {object} updates - Updated fields
 */
function syncUpdateItem(itemId, updates) {
    const updated = appState.items.map(item =>
        item.id === itemId ? { ...item, ...updates } : item
    );
    updateAppState({ items: updated }, 'item-updated');
}

/**
 * Remove item from app state (after deletion)
 * 
 * @param {string} itemId - Item ID
 */
function syncRemoveItem(itemId) {
    const updated = appState.items.filter(item => item.id !== itemId);
    updateAppState({ items: updated }, 'item-removed');
}

/**
 * Refresh items from Firestore
 * 
 * @returns {Promise<object>} - { success, error }
 */
async function syncRefreshItems() {
    try {
        const result = await window.FirestoreService.getItems('all');
        if (result.success) {
            updateAppState({ items: result.data }, 'items-refreshed');
            return { success: true };
        }
        return result;
    } catch (error) {
        console.error('❌ Refresh items error:', error);
        return { success: false, error: error.message };
    }
}

// ============================================================================
// USER SYNC
// ============================================================================

/**
 * Update current user in state
 * 
 * @param {object} userData - Updated user data
 */
function syncUpdateCurrentUser(userData) {
    const updated = { ...appState.currentUser, ...userData };
    updateAppState({ currentUser: updated }, 'user-updated');
}

/**
 * Refresh current user from Firestore
 * 
 * @returns {Promise<object>} - { success, error }
 */
async function syncRefreshCurrentUser() {
    try {
        const user = appState.currentUser;
        if (!user?.id) return { success: false, error: 'No current user' };

        const result = await window.FirestoreService.getUserProfile(user.id);
        if (result.success) {
            updateAppState({ currentUser: result.data }, 'user-refreshed');
            return { success: true };
        }
        return result;
    } catch (error) {
        console.error('❌ Refresh user error:', error);
        return { success: false, error: error.message };
    }
}

// ============================================================================
// CLAIM SYNC
// ============================================================================

/**
 * Add claim to state
 * 
 * @param {object} claim - Claim data
 */
function syncAddClaim(claim) {
    const updated = [claim, ...(appState.claims || [])];
    updateAppState({ claims: updated }, 'claim-added');
}

/**
 * Update claim in state
 * 
 * @param {string} claimId - Claim ID
 * @param {object} updates - Updates
 */
function syncUpdateClaim(claimId, updates) {
    const updated = (appState.claims || []).map(claim =>
        claim.id === claimId ? { ...claim, ...updates } : claim
    );
    updateAppState({ claims: updated }, 'claim-updated');
}

/**
 * Refresh claims from Firestore
 * 
 * @returns {Promise<object>} - { success, error }
 */
async function syncRefreshClaims() {
    try {
        const user = appState.currentUser;
        if (!user?.id) return { success: false, error: 'No current user' };

        const result = await window.FirestoreService.getClaims(user.id, 'received');
        if (result.success) {
            updateAppState({ claims: result.data }, 'claims-refreshed');
            return { success: true };
        }
        return result;
    } catch (error) {
        console.error('❌ Refresh claims error:', error);
        return { success: false, error: error.message };
    }
}

// ============================================================================
// LOGOUT SYNC
// ============================================================================

/**
 * Clear all state on logout
 */
function syncLogout() {
    updateAppState({
        currentUser: null,
        items: [],
        users: [],
        claims: []
    }, 'logout');
}

// ============================================================================
// CONFLICT RESOLUTION
// ============================================================================

/**
 * Resolve conflict between local and Firebase data
 * Strategy: Firebase version is authoritative
 * 
 * @param {object} localData - Local item
 * @param {object} firebaseData - Firebase item
 * @returns {object} - Resolved item
 */
function resolveConflict(localData, firebaseData) {
    // Firebase is always authoritative
    // But preserve local fields that might not exist in Firebase
    return {
        ...localData,
        ...firebaseData,
        resolvedAt: new Date().toISOString()
    };
}

// ============================================================================
// EXPORTS
// ============================================================================

window.SyncService = {
    // State
    getState: getAppState,
    updateState: updateAppState,
    onStateChange,

    // Initial sync
    performInitialSync,

    // Item sync
    syncAddItem,
    syncUpdateItem,
    syncRemoveItem,
    syncRefreshItems,

    // User sync
    syncUpdateCurrentUser,
    syncRefreshCurrentUser,

    // Claim sync
    syncAddClaim,
    syncUpdateClaim,
    syncRefreshClaims,

    // Logout
    syncLogout,

    // Conflict resolution
    resolveConflict
};

console.log('✅ Sync Module Loaded');
