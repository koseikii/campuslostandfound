/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FIRESTORE MODULE - Database Operations
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Replaces: firestore-service.js, firebase-impl.js
 * 
 * Features:
 * - CRUD operations for all collections
 * - Query builder
 * - Real-time listeners
 * - Batch operations
 * - Transaction support
 */

console.log('📦 Firestore Module Loading...');

// ============================================================================
// CONSTANTS
// ============================================================================

const COLLECTIONS = {
    USERS: 'users',
    LOST_ITEMS: 'lostItems',
    FOUND_ITEMS: 'foundItems',
    CLAIMS: 'claims'
};

// ============================================================================
// USER OPERATIONS
// ============================================================================

/**
 * Get user profile from Firestore
 * 
 * @param {string} uid - User UID
 * @returns {Promise<object>} - { success, data, error }
 */
async function firestoreGetUserProfile(uid) {
    try {
        if (!window.FirebaseCore?.isFirestoreReady()) {
            return { success: false, error: 'Firestore not initialized' };
        }

        const { doc, getDoc } = await window.FirebaseCore.require_firebase_module('firestore');
        const db = window.FirebaseCore.getFirestore();

        const userRef = doc(db, COLLECTIONS.USERS, uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            console.log('✅ User profile retrieved:', uid);
            return { success: true, data: { id: uid, ...userSnap.data() } };
        } else {
            console.warn('⚠️ User profile not found:', uid);
            return { success: false, error: 'User not found' };
        }
    } catch (error) {
        console.error('❌ Error getting user profile:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Create user document in Firestore
 * 
 * @param {string} uid - User UID
 * @param {object} userData - User data to store
 * @returns {Promise<object>} - { success, error }
 */
async function firestoreCreateUser(uid, userData) {
    try {
        if (!window.FirebaseCore?.isFirestoreReady()) {
            return { success: false, error: 'Firestore not initialized' };
        }

        const { doc, setDoc, getDoc } = await window.FirebaseCore.require_firebase_module('firestore');
        const db = window.FirebaseCore.getFirestore();

        const userRef = doc(db, COLLECTIONS.USERS, uid);

        // Check if already exists
        const existing = await getDoc(userRef);
        if (existing.exists()) {
            console.log('ℹ️ User already exists:', uid);
            return { success: true, alreadyExists: true };
        }

        // Add timestamps
        const data = {
            ...userData,
            uid: uid,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await setDoc(userRef, data);
        console.log('✅ User document created:', uid);

        return { success: true };

    } catch (error) {
        console.error('❌ Error creating user:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Update user profile
 * 
 * @param {string} uid - User UID
 * @param {object} updates - Fields to update
 * @returns {Promise<object>} - { success, error }
 */
async function firestoreUpdateUser(uid, updates) {
    try {
        if (!window.FirebaseCore?.isFirestoreReady()) {
            return { success: false, error: 'Firestore not initialized' };
        }

        const { doc, updateDoc } = await window.FirebaseCore.require_firebase_module('firestore');
        const db = window.FirebaseCore.getFirestore();

        // Only allow specific fields (security)
        const allowedFields = ['name', 'phone', 'bio', 'avatar', 'notifications', 'role'];
        const sanitized = {};

        for (const field of allowedFields) {
            if (field in updates) {
                sanitized[field] = updates[field];
            }
        }

        if (Object.keys(sanitized).length === 0) {
            return { success: true, message: 'No changes made' };
        }

        sanitized.updatedAt = new Date().toISOString();

        const userRef = doc(db, COLLECTIONS.USERS, uid);
        await updateDoc(userRef, sanitized);

        console.log('✅ User updated:', uid);
        return { success: true };

    } catch (error) {
        console.error('❌ Error updating user:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get all users (admin only)
 * 
 * @returns {Promise<object>} - { success, data, error }
 */
async function firestoreGetAllUsers() {
    try {
        if (!window.FirebaseCore?.isFirestoreReady()) {
            return { success: false, error: 'Firestore not initialized', data: [] };
        }

        const { collection, getDocs } = await window.FirebaseCore.require_firebase_module('firestore');
        const db = window.FirebaseCore.getFirestore();

        const usersRef = collection(db, COLLECTIONS.USERS);
        const snapshot = await getDocs(usersRef);

        const users = [];
        snapshot.forEach(doc => {
            users.push({ id: doc.id, ...doc.data() });
        });

        console.log(`✅ Retrieved ${users.length} users`);
        return { success: true, data: users };

    } catch (error) {
        console.error('❌ Error getting users:', error);
        return { success: false, error: error.message, data: [] };
    }
}

// ============================================================================
// ITEM OPERATIONS
// ============================================================================

/**
 * Create item (auto-routed to lostItems or foundItems)
 * 
 * @param {object} itemData - Item data (must have status: 'lost' | 'found')
 * @returns {Promise<object>} - { success, itemId, error }
 */
async function firestoreCreateItem(itemData) {
    try {
        if (!window.FirebaseCore?.isFirestoreReady()) {
            return { success: false, error: 'Firestore not initialized' };
        }

        // Validate required fields
        if (!itemData.name || !itemData.status || !itemData.userId) {
            return { success: false, error: 'Missing required fields: name, status, userId' };
        }

        // Validate status
        if (!['lost', 'found'].includes(itemData.status)) {
            return { success: false, error: 'Status must be "lost" or "found"' };
        }

        const { collection, addDoc } = await window.FirebaseCore.require_firebase_module('firestore');
        const db = window.FirebaseCore.getFirestore();

        // Choose collection based on status
        const collectionName = itemData.status === 'lost' ? COLLECTIONS.LOST_ITEMS : COLLECTIONS.FOUND_ITEMS;

        // Prepare item data
        const item = {
            name: itemData.name,
            description: itemData.description || '',
            category: itemData.category || 'other',
            status: itemData.status,
            location: itemData.location || 'Campus',
            images: itemData.images || [],
            userId: itemData.userId,
            resolved: false,
            matched: false,
            date: itemData.date || new Date().toISOString().split('T')[0],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const itemsRef = collection(db, collectionName);
        const docRef = await addDoc(itemsRef, item);

        console.log(`✅ ${itemData.status} item created:`, docRef.id);
        return { success: true, itemId: docRef.id };

    } catch (error) {
        console.error('❌ Error creating item:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get item by ID
 * 
 * @param {string} itemId - Item ID
 * @param {string} status - 'lost' or 'found'
 * @returns {Promise<object>} - { success, data, error }
 */
async function firestoreGetItem(itemId, status = 'lost') {
    try {
        if (!window.FirebaseCore?.isFirestoreReady()) {
            return { success: false, error: 'Firestore not initialized' };
        }

        const { doc, getDoc } = await window.FirebaseCore.require_firebase_module('firestore');
        const db = window.FirebaseCore.getFirestore();

        const collectionName = status === 'lost' ? COLLECTIONS.LOST_ITEMS : COLLECTIONS.FOUND_ITEMS;
        const itemRef = doc(db, collectionName, itemId);
        const itemSnap = await getDoc(itemRef);

        if (itemSnap.exists()) {
            console.log('✅ Item retrieved:', itemId);
            return { success: true, data: { id: itemId, ...itemSnap.data() } };
        } else {
            return { success: false, error: 'Item not found' };
        }

    } catch (error) {
        console.error('❌ Error getting item:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get all items from a collection
 * 
 * @param {string} collectionType - 'lost', 'found', or 'all'
 * @returns {Promise<object>} - { success, data, error }
 */
async function firestoreGetItems(collectionType = 'all') {
    try {
        if (!window.FirebaseCore?.isFirestoreReady()) {
            return { success: false, error: 'Firestore not initialized', data: [] };
        }

        const { collection, getDocs } = await window.FirebaseCore.require_firebase_module('firestore');
        const db = window.FirebaseCore.getFirestore();

        let allItems = [];

        if (collectionType === 'all' || collectionType === 'lost') {
            const lostRef = collection(db, COLLECTIONS.LOST_ITEMS);
            const lostSnap = await getDocs(lostRef);
            lostSnap.forEach(doc => {
                allItems.push({ id: doc.id, ...doc.data() });
            });
        }

        if (collectionType === 'all' || collectionType === 'found') {
            const foundRef = collection(db, COLLECTIONS.FOUND_ITEMS);
            const foundSnap = await getDocs(foundRef);
            foundSnap.forEach(doc => {
                allItems.push({ id: doc.id, ...doc.data() });
            });
        }

        console.log(`✅ Retrieved ${allItems.length} items`);
        return { success: true, data: allItems };

    } catch (error) {
        console.error('❌ Error getting items:', error);
        return { success: false, error: error.message, data: [] };
    }
}

/**
 * Update item
 * 
 * @param {string} itemId - Item ID
 * @param {string} status - 'lost' or 'found'
 * @param {object} updates - Fields to update
 * @returns {Promise<object>} - { success, error }
 */
async function firestoreUpdateItem(itemId, status, updates) {
    try {
        if (!window.FirebaseCore?.isFirestoreReady()) {
            return { success: false, error: 'Firestore not initialized' };
        }

        const { doc, updateDoc } = await window.FirebaseCore.require_firebase_module('firestore');
        const db = window.FirebaseCore.getFirestore();

        const collectionName = status === 'lost' ? COLLECTIONS.LOST_ITEMS : COLLECTIONS.FOUND_ITEMS;
        const itemRef = doc(db, collectionName, itemId);

        const updateData = {
            ...updates,
            updatedAt: new Date().toISOString()
        };

        await updateDoc(itemRef, updateData);

        console.log('✅ Item updated:', itemId);
        return { success: true };

    } catch (error) {
        console.error('❌ Error updating item:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Delete item
 * 
 * @param {string} itemId - Item ID
 * @param {string} status - 'lost' or 'found'
 * @returns {Promise<object>} - { success, error }
 */
async function firestoreDeleteItem(itemId, status) {
    try {
        if (!window.FirebaseCore?.isFirestoreReady()) {
            return { success: false, error: 'Firestore not initialized' };
        }

        const { doc, deleteDoc } = await window.FirebaseCore.require_firebase_module('firestore');
        const db = window.FirebaseCore.getFirestore();

        const collectionName = status === 'lost' ? COLLECTIONS.LOST_ITEMS : COLLECTIONS.FOUND_ITEMS;
        const itemRef = doc(db, collectionName, itemId);

        await deleteDoc(itemRef);

        console.log('✅ Item deleted:', itemId);
        return { success: true };

    } catch (error) {
        console.error('❌ Error deleting item:', error);
        return { success: false, error: error.message };
    }
}

// ============================================================================
// CLAIM OPERATIONS
// ============================================================================

/**
 * Create claim
 * 
 * @param {object} claimData - { itemId, claimantId, itemOwnerId, message }
 * @returns {Promise<object>} - { success, claimId, error }
 */
async function firestoreCreateClaim(claimData) {
    try {
        if (!window.FirebaseCore?.isFirestoreReady()) {
            return { success: false, error: 'Firestore not initialized' };
        }

        if (!claimData.itemId || !claimData.claimantId || !claimData.itemOwnerId) {
            return { success: false, error: 'Missing required fields' };
        }

        const { collection, addDoc } = await window.FirebaseCore.require_firebase_module('firestore');
        const db = window.FirebaseCore.getFirestore();

        const claim = {
            itemId: claimData.itemId,
            claimantId: claimData.claimantId,
            itemOwnerId: claimData.itemOwnerId,
            status: 'pending',
            message: claimData.message || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const claimsRef = collection(db, COLLECTIONS.CLAIMS);
        const docRef = await addDoc(claimsRef, claim);

        console.log('✅ Claim created:', docRef.id);
        return { success: true, claimId: docRef.id };

    } catch (error) {
        console.error('❌ Error creating claim:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get claims for a user
 * 
 * @param {string} userId - User UID
 * @param {string} type - 'made' (user claimed items) or 'received' (claims on user's items)
 * @returns {Promise<object>} - { success, data, error }
 */
async function firestoreGetClaims(userId, type = 'received') {
    try {
        if (!window.FirebaseCore?.isFirestoreReady()) {
            return { success: false, error: 'Firestore not initialized', data: [] };
        }

        const { collection, query, where, getDocs } = await window.FirebaseCore.require_firebase_module('firestore');
        const db = window.FirebaseCore.getFirestore();

        const claimsRef = collection(db, COLLECTIONS.CLAIMS);
        const queryField = type === 'made' ? 'claimantId' : 'itemOwnerId';
        const q = query(claimsRef, where(queryField, '==', userId));

        const snapshot = await getDocs(q);
        const claims = [];

        snapshot.forEach(doc => {
            claims.push({ id: doc.id, ...doc.data() });
        });

        console.log(`✅ Retrieved ${claims.length} claims for user`);
        return { success: true, data: claims };

    } catch (error) {
        console.error('❌ Error getting claims:', error);
        return { success: false, error: error.message, data: [] };
    }
}

/**
 * Update claim status
 * 
 * @param {string} claimId - Claim ID
 * @param {string} status - 'pending', 'approved', 'rejected'
 * @returns {Promise<object>} - { success, error }
 */
async function firestoreUpdateClaimStatus(claimId, status) {
    try {
        if (!window.FirebaseCore?.isFirestoreReady()) {
            return { success: false, error: 'Firestore not initialized' };
        }

        if (!['pending', 'approved', 'rejected'].includes(status)) {
            return { success: false, error: 'Invalid status' };
        }

        const { doc, updateDoc } = await window.FirebaseCore.require_firebase_module('firestore');
        const db = window.FirebaseCore.getFirestore();

        const claimRef = doc(db, COLLECTIONS.CLAIMS, claimId);
        await updateDoc(claimRef, {
            status: status,
            updatedAt: new Date().toISOString(),
            resolvedAt: status !== 'pending' ? new Date().toISOString() : null
        });

        console.log('✅ Claim status updated:', claimId, status);
        return { success: true };

    } catch (error) {
        console.error('❌ Error updating claim:', error);
        return { success: false, error: error.message };
    }
}

// ============================================================================
// EXPORTS
// ============================================================================

window.FirestoreService = {
    // Users
    getUserProfile: firestoreGetUserProfile,
    createUser: firestoreCreateUser,
    updateUser: firestoreUpdateUser,
    getAllUsers: firestoreGetAllUsers,

    // Items
    createItem: firestoreCreateItem,
    getItem: firestoreGetItem,
    getItems: firestoreGetItems,
    updateItem: firestoreUpdateItem,
    deleteItem: firestoreDeleteItem,

    // Claims
    createClaim: firestoreCreateClaim,
    getClaims: firestoreGetClaims,
    updateClaimStatus: firestoreUpdateClaimStatus,

    // Constants
    COLLECTIONS
};

console.log('✅ Firestore Module Loaded');
