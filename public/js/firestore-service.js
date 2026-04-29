/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FIRESTORE SERVICE MODULE
 * Complete Firestore operations for Users, Items, and Data Management
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * FEATURES:
 * - User profile management with auto-creation
 * - Item CRUD operations with proper linking
 * - Real-time listeners for admin dashboard
 * - Account linking verification
 * - Error handling and logging
 */

console.log('📦 Firestore Service Module Loading...');

// ============================================================================
// SECTION 1: USER MANAGEMENT
// ============================================================================

/**
 * AUTO-CREATE USER DOCUMENT IN FIRESTORE
 * Called after Firebase Auth user creation to ensure Firestore sync
 * 
 * @param {string} uid - Firebase auth UID
 * @param {object} userData - User data to store
 * @returns {Promise<object>} - Result object
 */
async function firestoreAutoCreateUserDoc(uid, userData) {
    try {
        if (!uid || !firebaseDB) {
            console.error('❌ Invalid parameters for user doc creation');
            return { success: false, error: 'Invalid parameters' };
        }

        const { doc, getDoc, setDoc, serverTimestamp } = await import(
            "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js"
        );

        const userRef = doc(firebaseDB, 'users', uid);

        // Check if document already exists
        const existingDoc = await getDoc(userRef);

        if (existingDoc.exists()) {
            console.log('ℹ️ User document already exists:', uid);
            return { success: true, data: existingDoc.data(), alreadyExists: true };
        }

        // Create new user document with standardized structure
        const newUserData = {
            uid: uid,
            email: userData.email || '',
            name: userData.name || '',
            phone: userData.phone || '',
            role: userData.role || 'user',
            avatar: userData.avatar || '',
            bio: userData.bio || '',
            status: 'active',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            lastLogin: serverTimestamp(),

            // Statistics
            totalItems: 0,
            resolvedItems: 0,
            rating: 0,

            // Preferences
            notifications: {
                email: true,
                inApp: true
            }
        };

        await setDoc(userRef, newUserData);
        console.log('✅ User document created in Firestore:', uid, userData.email);

        return { success: true, data: newUserData };
    } catch (error) {
        console.error('❌ Error creating user document:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * GET USER PROFILE FROM FIRESTORE
 * Retrieve complete user data including role and status
 * 
 * @param {string} uid - Firebase UID
 * @returns {Promise<object>} - User data or null
 */
async function firestoreGetUserProfile(uid) {
    try {
        if (!uid || !firebaseDB) return null;

        const { doc, getDoc } = await import(
            "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js"
        );

        const userRef = doc(firebaseDB, 'users', uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            console.log('✅ User profile retrieved:', uid);
            return { success: true, data: { id: uid, ...userSnap.data() } };
        } else {
            console.warn('⚠️ User profile not found:', uid);
            return { success: false, error: 'User not found' };
        }
    } catch (error) {
        console.error('❌ Error getting user profile:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * UPDATE USER PROFILE
 * Securely update user information
 * 
 * @param {string} uid - Firebase UID
 * @param {object} updates - Fields to update
 * @returns {Promise<object>} - Result object
 */
async function firestoreUpdateUserProfile(uid, updates) {
    try {
        if (!uid || !firebaseDB) {
            return { success: false, error: 'Invalid parameters' };
        }

        const { doc, updateDoc, serverTimestamp } = await import(
            "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js"
        );

        // Only allow specific fields to be updated (prevent privilege escalation)
        const allowedFields = ['name', 'phone', 'bio', 'avatar', 'notifications'];
        const sanitizedUpdates = {};

        for (const field of allowedFields) {
            if (field in updates) {
                sanitizedUpdates[field] = updates[field];
            }
        }

        if (Object.keys(sanitizedUpdates).length === 0) {
            console.warn('⚠️ No valid fields to update');
            return { success: true, message: 'No changes made' };
        }

        sanitizedUpdates.updatedAt = serverTimestamp();

        const userRef = doc(firebaseDB, 'users', uid);
        await updateDoc(userRef, sanitizedUpdates);

        console.log('✅ User profile updated:', uid);
        return { success: true };
    } catch (error) {
        console.error('❌ Error updating user profile:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * VERIFY ACCOUNT LINKING
 * Check if Auth user and Firestore user are linked (same UID)
 * Auto-create missing Firestore document
 * 
 * @param {object} authUser - Firebase Auth user object
 * @returns {Promise<object>} - Verification result
 */
async function firestoreVerifyAccountLinking(authUser) {
    try {
        if (!authUser || !authUser.uid) {
            return { success: false, error: 'No auth user' };
        }

        console.log('🔗 Verifying account linking for:', authUser.uid);

        // Check if user doc exists
        const userResult = await firestoreGetUserProfile(authUser.uid);

        if (userResult.success) {
            console.log('✅ Account linking verified - documents match');
            return { success: true, linked: true, data: userResult.data };
        } else {
            // Auto-create missing Firestore document
            console.warn('⚠️ Missing Firestore document, auto-creating...');

            const createResult = await firestoreAutoCreateUserDoc(authUser.uid, {
                email: authUser.email,
                name: authUser.displayName || authUser.email.split('@')[0],
                phone: '',
                role: authUser.email === 'admin@campus.edu' ? 'admin' : 'user',
                avatar: authUser.photoURL || ''
            });

            if (createResult.success) {
                console.log('✅ Auto-created missing user document');
                return { success: true, linked: true, autoCreated: true, data: createResult.data };
            } else {
                console.error('❌ Failed to auto-create user document');
                return { success: false, error: 'Could not create user document' };
            }
        }
    } catch (error) {
        console.error('❌ Account linking verification error:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * GET ALL USERS (ADMIN ONLY)
 * Retrieve all user profiles with filtering options
 * 
 * @param {object} options - Query options
 * @returns {Promise<array>} - Array of users
 */
async function firestoreGetAllUsers(options = {}) {
    try {
        if (!firebaseDB) {
            return { success: false, error: 'Firestore not available', data: [] };
        }

        const { collection, getDocs, query, where, orderBy, limit: limitFn } = await import(
            "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js"
        );

        let usersRef = collection(firebaseDB, 'users');
        let conditions = [];

        // Optional: filter by role
        if (options.role) {
            conditions.push(where('role', '==', options.role));
        }

        // Optional: filter by status
        if (options.status) {
            conditions.push(where('status', '==', options.status));
        }

        // Apply conditions
        const q = conditions.length > 0
            ? query(usersRef, ...conditions, orderBy('createdAt', 'desc'), limitFn(options.limit || 100))
            : query(usersRef, orderBy('createdAt', 'desc'), limitFn(options.limit || 100));

        const snapshot = await getDocs(q);
        const users = [];

        snapshot.forEach(doc => {
            users.push({
                id: doc.id,
                uid: doc.id,
                ...doc.data()
            });
        });

        console.log(`✅ Retrieved ${users.length} users from Firestore`);
        return { success: true, data: users };
    } catch (error) {
        console.error('❌ Error getting users:', error.message);
        return { success: false, error: error.message, data: [] };
    }
}

/**
 * UPDATE USER ROLE (ADMIN ONLY)
 * Change user role with audit logging
 * 
 * @param {string} uid - Target user UID
 * @param {string} newRole - New role (user/admin/moderator)
 * @param {string} adminUid - Admin performing action
 * @returns {Promise<object>} - Result
 */
async function firestoreUpdateUserRole(uid, newRole, adminUid) {
    try {
        if (!uid || !newRole) {
            return { success: false, error: 'Invalid parameters' };
        }

        const { doc, updateDoc, serverTimestamp, arrayUnion } = await import(
            "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js"
        );

        const validRoles = ['user', 'admin', 'moderator'];
        if (!validRoles.includes(newRole)) {
            return { success: false, error: 'Invalid role' };
        }

        const userRef = doc(firebaseDB, 'users', uid);

        // Update role
        await updateDoc(userRef, {
            role: newRole,
            updatedAt: serverTimestamp()
        });

        // Log audit trail
        await firestoreLogAuditEvent('role_change', {
            targetUser: uid,
            newRole: newRole,
            performedBy: adminUid,
            timestamp: new Date().toISOString()
        });

        console.log(`✅ User role updated: ${uid} → ${newRole}`);
        return { success: true };
    } catch (error) {
        console.error('❌ Error updating user role:', error.message);
        return { success: false, error: error.message };
    }
}

// ============================================================================
// SECTION 2: ITEM MANAGEMENT
// ============================================================================

/**
 * CREATE ITEM IN FIRESTORE
 * Save item data with proper user linking
 * 
 * @param {object} itemData - Item information
 * @returns {Promise<object>} - Item ID and result
 */
async function firestoreCreateItem(itemData) {
    try {
        if (!firebaseDB) {
            return { success: false, error: 'Firestore not available' };
        }

        const { collection, addDoc, serverTimestamp } = await import(
            "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js"
        );

        // Get current user
        const currentUser = firebaseGetCurrentUser();
        if (!currentUser) {
            return { success: false, error: 'User not authenticated' };
        }

        // Validate required fields
        const required = ['title', 'description', 'status', 'category'];
        for (const field of required) {
            if (!itemData[field]) {
                return { success: false, error: `Missing required field: ${field}` };
            }
        }

        // Prepare item document
        const newItem = {
            // Basic info
            title: itemData.title.trim(),
            description: itemData.description.trim(),
            status: itemData.status, // 'lost' or 'found'
            category: itemData.category,
            location: itemData.location || 'Campus',

            // Images
            images: itemData.images || [],
            thumbnail: itemData.thumbnail || '',

            // Details
            color: itemData.color || '',
            brand: itemData.brand || '',
            itemCondition: itemData.itemCondition || 'normal',
            reward: itemData.reward || '',

            // Metadata
            userId: currentUser.uid,
            userEmail: currentUser.email,
            dateTime: itemData.dateTime || new Date().toISOString(),

            // Status tracking
            resolved: false,
            matched: false,
            matchedWith: null,

            // Timestamps
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),

            // Engagement
            views: 0,
            matches: []
        };

        // Add to Firestore
        const itemsRef = collection(firebaseDB, 'items');
        const docRef = await addDoc(itemsRef, newItem);

        console.log('✅ Item created in Firestore:', docRef.id);

        return {
            success: true,
            id: docRef.id,
            data: newItem
        };
    } catch (error) {
        console.error('❌ Error creating item:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * GET ITEM BY ID
 * Retrieve complete item data
 * 
 * @param {string} itemId - Firestore item document ID
 * @returns {Promise<object>} - Item data
 */
async function firestoreGetItem(itemId) {
    try {
        if (!firebaseDB || !itemId) return null;

        const { doc, getDoc } = await import(
            "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js"
        );

        const itemRef = doc(firebaseDB, 'items', itemId);
        const itemSnap = await getDoc(itemRef);

        if (itemSnap.exists()) {
            return {
                success: true,
                data: { id: itemId, ...itemSnap.data() }
            };
        }

        return { success: false, error: 'Item not found' };
    } catch (error) {
        console.error('❌ Error getting item:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * GET ALL ITEMS WITH FILTERS
 * Query items with multiple filter options
 * 
 * @param {object} options - Filter options
 * @returns {Promise<array>} - Filtered items
 */
async function firestoreGetItems(options = {}) {
    try {
        if (!firebaseDB) {
            return { success: false, error: 'Firestore not available', data: [] };
        }

        const { collection, getDocs, query, where, orderBy, limit: limitFn } = await import(
            "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js"
        );

        let conditions = [];

        // Filter by status
        if (options.status) {
            conditions.push(where('status', '==', options.status));
        }

        // Filter by category
        if (options.category) {
            conditions.push(where('category', '==', options.category));
        }

        // Filter by user
        if (options.userId) {
            conditions.push(where('userId', '==', options.userId));
        }

        // Filter by resolved status
        if (typeof options.resolved !== 'undefined') {
            conditions.push(where('resolved', '==', options.resolved));
        }

        // Build query
        const itemsRef = collection(firebaseDB, 'items');
        const q = conditions.length > 0
            ? query(itemsRef, ...conditions, orderBy('createdAt', 'desc'), limitFn(options.limit || 100))
            : query(itemsRef, orderBy('createdAt', 'desc'), limitFn(options.limit || 100));

        const snapshot = await getDocs(q);
        const items = [];

        snapshot.forEach(doc => {
            items.push({
                id: doc.id,
                ...doc.data()
            });
        });

        console.log(`✅ Retrieved ${items.length} items from Firestore`);
        return { success: true, data: items };
    } catch (error) {
        console.error('❌ Error getting items:', error.message);
        return { success: false, error: error.message, data: [] };
    }
}

/**
 * UPDATE ITEM
 * Modify item data (only by owner or admin)
 * 
 * @param {string} itemId - Item document ID
 * @param {object} updates - Fields to update
 * @returns {Promise<object>} - Result
 */
async function firestoreUpdateItem(itemId, updates) {
    try {
        if (!firebaseDB || !itemId) {
            return { success: false, error: 'Invalid parameters' };
        }

        const { doc, updateDoc, serverTimestamp } = await import(
            "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js"
        );

        // Get current user
        const currentUser = firebaseGetCurrentUser();
        if (!currentUser) {
            return { success: false, error: 'User not authenticated' };
        }

        // Get item to verify ownership
        const itemResult = await firestoreGetItem(itemId);
        if (!itemResult.success) {
            return { success: false, error: 'Item not found' };
        }

        const item = itemResult.data;

        // Verify ownership (unless admin)
        if (item.userId !== currentUser.uid && currentUser.uid !== 'admin') {
            return { success: false, error: 'Not authorized to update this item' };
        }

        // Allow only specific fields to be updated
        const allowedFields = ['title', 'description', 'location', 'color', 'brand', 'itemCondition', 'reward', 'resolved', 'matched', 'matchedWith'];
        const sanitizedUpdates = {};

        for (const field of allowedFields) {
            if (field in updates) {
                sanitizedUpdates[field] = updates[field];
            }
        }

        sanitizedUpdates.updatedAt = serverTimestamp();

        const itemRef = doc(firebaseDB, 'items', itemId);
        await updateDoc(itemRef, sanitizedUpdates);

        console.log('✅ Item updated:', itemId);
        return { success: true };
    } catch (error) {
        console.error('❌ Error updating item:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * DELETE ITEM
 * Remove item from Firestore (only by owner or admin)
 * 
 * @param {string} itemId - Item document ID
 * @returns {Promise<object>} - Result
 */
async function firestoreDeleteItem(itemId) {
    try {
        if (!firebaseDB || !itemId) {
            return { success: false, error: 'Invalid parameters' };
        }

        const { doc, deleteDoc } = await import(
            "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js"
        );

        // Get current user
        const currentUser = firebaseGetCurrentUser();
        if (!currentUser) {
            return { success: false, error: 'User not authenticated' };
        }

        // Get item to verify ownership
        const itemResult = await firestoreGetItem(itemId);
        if (!itemResult.success) {
            return { success: false, error: 'Item not found' };
        }

        const item = itemResult.data;

        // Verify ownership (unless admin)
        if (item.userId !== currentUser.uid && currentUser.uid !== 'admin') {
            return { success: false, error: 'Not authorized to delete this item' };
        }

        // Move to deleted items collection first (audit trail)
        const { collection, addDoc, serverTimestamp } = await import(
            "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js"
        );

        const deletedRef = collection(firebaseDB, 'deletedItems');
        await addDoc(deletedRef, {
            ...item,
            deletedAt: serverTimestamp(),
            deletedBy: currentUser.uid
        });

        // Then delete
        const itemRef = doc(firebaseDB, 'items', itemId);
        await deleteDoc(itemRef);

        console.log('✅ Item deleted:', itemId);
        return { success: true };
    } catch (error) {
        console.error('❌ Error deleting item:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * SEARCH ITEMS BY TEXT
 * Full-text search on items (title and description)
 * Note: For production, use Cloud Search or Algolia
 * 
 * @param {string} searchTerm - Search query
 * @param {object} options - Filter options
 * @returns {Promise<array>} - Matching items
 */
async function firestoreSearchItems(searchTerm, options = {}) {
    try {
        if (!searchTerm) {
            return { success: false, error: 'Search term required', data: [] };
        }

        // Get all items (or filter by category first if provided)
        const itemsResult = await firestoreGetItems(options);
        if (!itemsResult.success) {
            return itemsResult;
        }

        const term = searchTerm.toLowerCase();
        const results = itemsResult.data.filter(item =>
            item.title.toLowerCase().includes(term) ||
            item.description.toLowerCase().includes(term) ||
            item.category.toLowerCase().includes(term)
        );

        console.log(`✅ Search found ${results.length} matching items`);
        return { success: true, data: results };
    } catch (error) {
        console.error('❌ Search error:', error.message);
        return { success: false, error: error.message, data: [] };
    }
}

// ============================================================================
// SECTION 3: REAL-TIME LISTENERS (FOR ADMIN DASHBOARD)
// ============================================================================

const activeListeners = [];

/**
 * LISTEN TO USERS IN REAL-TIME
 * Set up real-time listener for admin dashboard
 * 
 * @param {function} callback - Called when data changes
 * @param {object} options - Filter options
 * @returns {function} - Unsubscribe function
 */
function firestoreListenToUsers(callback, options = {}) {
    try {
        if (!firebaseDB) {
            callback({ success: false, error: 'Firestore not available' });
            return () => { };
        }

        import("https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js").then(module => {
            const { collection, onSnapshot, query, where, orderBy } = module;

            let conditions = [];
            if (options.status) {
                conditions.push(where('status', '==', options.status));
            }

            const usersRef = collection(firebaseDB, 'users');
            const q = conditions.length > 0
                ? query(usersRef, ...conditions, orderBy('createdAt', 'desc'))
                : query(usersRef, orderBy('createdAt', 'desc'));

            const unsubscribe = onSnapshot(q, (snapshot) => {
                const users = [];
                snapshot.forEach(doc => {
                    users.push({ id: doc.id, ...doc.data() });
                });
                callback({ success: true, data: users });
            }, (error) => {
                console.error('❌ Listener error:', error);
                callback({ success: false, error: error.message });
            });

            activeListeners.push(unsubscribe);
        });

        return () => {
            const index = activeListeners.indexOf(unsubscribe);
            if (index > -1) activeListeners.splice(index, 1);
            unsubscribe?.();
        };
    } catch (error) {
        console.error('❌ Setup listener error:', error);
        callback({ success: false, error: error.message });
        return () => { };
    }
}

/**
 * LISTEN TO ITEMS IN REAL-TIME
 * Set up listener for items with filters
 * 
 * @param {function} callback - Called when data changes
 * @param {object} options - Filter options
 * @returns {function} - Unsubscribe function
 */
function firestoreListenToItems(callback, options = {}) {
    try {
        if (!firebaseDB) {
            callback({ success: false, error: 'Firestore not available' });
            return () => { };
        }

        import("https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js").then(module => {
            const { collection, onSnapshot, query, where, orderBy } = module;

            let conditions = [];
            if (options.status) conditions.push(where('status', '==', options.status));
            if (options.resolved) conditions.push(where('resolved', '==', options.resolved));

            const itemsRef = collection(firebaseDB, 'items');
            const q = conditions.length > 0
                ? query(itemsRef, ...conditions, orderBy('createdAt', 'desc'))
                : query(itemsRef, orderBy('createdAt', 'desc'));

            const unsubscribe = onSnapshot(q, (snapshot) => {
                const items = [];
                snapshot.forEach(doc => {
                    items.push({ id: doc.id, ...doc.data() });
                });
                callback({ success: true, data: items });
            }, (error) => {
                console.error('❌ Listener error:', error);
                callback({ success: false, error: error.message });
            });

            activeListeners.push(unsubscribe);
        });

        return () => {
            const index = activeListeners.indexOf(unsubscribe);
            if (index > -1) activeListeners.splice(index, 1);
            unsubscribe?.();
        };
    } catch (error) {
        console.error('❌ Setup listener error:', error);
        callback({ success: false, error: error.message });
        return () => { };
    }
}

/**
 * CLEANUP ALL LISTENERS
 * Unsubscribe from all active listeners
 */
function firestoreCleanupAllListeners() {
    console.log('🧹 Cleaning up all Firestore listeners...');
    activeListeners.forEach(unsubscribe => {
        try {
            unsubscribe();
        } catch (e) {
            console.warn('⚠️ Error unsubscribing:', e);
        }
    });
    activeListeners.length = 0;
    console.log('✅ All listeners cleaned up');
}

// ============================================================================
// SECTION 4: AUDIT LOGGING
// ============================================================================

/**
 * LOG AUDIT EVENT
 * Record admin actions for compliance
 * 
 * @param {string} eventType - Type of event
 * @param {object} eventData - Event details
 */
async function firestoreLogAuditEvent(eventType, eventData) {
    try {
        if (!firebaseDB) return;

        const { collection, addDoc, serverTimestamp } = await import(
            "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js"
        );

        const auditRef = collection(firebaseDB, 'auditLogs');
        await addDoc(auditRef, {
            eventType,
            ...eventData,
            timestamp: serverTimestamp()
        });

        console.log('📝 Audit event logged:', eventType);
    } catch (error) {
        console.warn('⚠️ Audit logging error:', error.message);
        // Don't throw - audit logging failures shouldn't break the app
    }
}

console.log('✅ Firestore Service Module Loaded');
