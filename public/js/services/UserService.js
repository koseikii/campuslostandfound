/**
 * ═══════════════════════════════════════════════════════════════════════════
 * USER SERVICE - User Business Logic
 * ═══════════════════════════════════════════════════════════════════════════
 */

console.log('👤 User Service Loading...');

// ============================================================================
// AUTHENTICATION
// ============================================================================

/**
 * Register new user
 * 
 * @param {object} userData - { email, password, name, phone, role }
 * @returns {Promise<object>} - { success, userId, error }
 */
async function userServiceRegister(userData) {
    try {
        const validation = window.Validators.validateUser(userData);
        if (!validation.valid) {
            return { success: false, error: validation.errors.join('; ') };
        }

        const result = await window.AuthService.signUp(userData.email, userData.password, {
            name: userData.name,
            phone: userData.phone,
            role: userData.role || 'user'
        });

        if (result.success) {
            // Perform initial sync
            const user = await window.AuthService.getCurrentUser();
            if (user) {
                await window.SyncService.performInitialSync(user);
            }
        }

        return result;

    } catch (error) {
        console.error('❌ Registration error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Login user
 * 
 * @param {string} email - Email
 * @param {string} password - Password
 * @returns {Promise<object>} - { success, userId, error }
 */
async function userServiceLogin(email, password) {
    try {
        const result = await window.AuthService.signIn(email, password);

        if (result.success) {
            // Perform initial sync
            const user = await window.AuthService.getCurrentUser();
            if (user) {
                await window.SyncService.performInitialSync(user);
            }
        }

        return result;

    } catch (error) {
        console.error('❌ Login error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Logout user
 * 
 * @returns {Promise<object>} - { success, error }
 */
async function userServiceLogout() {
    try {
        window.SyncService.syncLogout();
        return await window.AuthService.signOut();

    } catch (error) {
        console.error('❌ Logout error:', error);
        return { success: false, error: error.message };
    }
}

// ============================================================================
// PROFILE MANAGEMENT
// ============================================================================

/**
 * Get current user profile
 * 
 * @returns {object|null}
 */
function userServiceGetCurrentUser() {
    const state = window.SyncService.getState();
    return state.currentUser || null;
}

/**
 * Update current user profile
 * 
 * @param {object} updates - { name, phone, bio, avatar }
 * @returns {Promise<object>} - { success, error }
 */
async function userServiceUpdateProfile(updates) {
    try {
        const currentUser = userServiceGetCurrentUser();
        if (!currentUser?.id) {
            return { success: false, error: 'User not authenticated' };
        }

        // Validate updates
        const validation = window.Validators.validateUser({
            email: currentUser.email,
            name: updates.name || currentUser.name,
            phone: updates.phone || currentUser.phone
        });

        if (!validation.valid) {
            return { success: false, error: validation.errors.join('; ') };
        }

        // Update in Firestore
        const result = await window.FirestoreService.updateUser(currentUser.id, updates);

        if (result.success) {
            window.SyncService.syncUpdateCurrentUser(updates);
            console.log('✅ Profile updated');
        }

        return result;

    } catch (error) {
        console.error('❌ Update profile error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get user profile by ID
 * 
 * @param {string} userId - User ID
 * @returns {Promise<object>} - { success, data, error }
 */
async function userServiceGetProfile(userId) {
    try {
        return await window.FirestoreService.getUserProfile(userId);
    } catch (error) {
        console.error('❌ Get profile error:', error);
        return { success: false, error: error.message };
    }
}

// ============================================================================
// USER STATISTICS
// ============================================================================

/**
 * Get user statistics
 * 
 * @param {string} userId - User ID
 * @returns {object}
 */
function userServiceGetStats(userId) {
    try {
        const state = window.SyncService.getState();
        const userItems = state.items.filter(i => i.userId === userId);

        return {
            totalItems: userItems.length,
            lostItems: userItems.filter(i => i.status === 'lost').length,
            foundItems: userItems.filter(i => i.status === 'found').length,
            resolvedItems: userItems.filter(i => i.resolved).length,
            successRate: userItems.length > 0
                ? Math.round((userItems.filter(i => i.resolved).length / userItems.length) * 100)
                : 0
        };

    } catch (error) {
        console.error('❌ Get stats error:', error);
        return {
            totalItems: 0,
            lostItems: 0,
            foundItems: 0,
            resolvedItems: 0,
            successRate: 0
        };
    }
}

// ============================================================================
// PASSWORD MANAGEMENT
// ============================================================================

/**
 * Reset password
 * 
 * @param {string} email - User email
 * @returns {Promise<object>} - { success, error }
 */
async function userServiceResetPassword(email) {
    try {
        return await window.AuthService.resetPassword(email);
    } catch (error) {
        console.error('❌ Reset password error:', error);
        return { success: false, error: error.message };
    }
}

// ============================================================================
// ADMIN OPERATIONS
// ============================================================================

/**
 * Get all users (admin only)
 * 
 * @returns {Promise<object>} - { success, data, error }
 */
async function userServiceGetAllUsers() {
    try {
        const currentUser = userServiceGetCurrentUser();
        if (currentUser?.role !== 'admin') {
            return { success: false, error: 'Admin access required' };
        }

        return await window.FirestoreService.getAllUsers();

    } catch (error) {
        console.error('❌ Get all users error:', error);
        return { success: false, error: error.message };
    }
}

// ============================================================================
// EXPORTS
// ============================================================================

window.UserService = {
    register: userServiceRegister,
    login: userServiceLogin,
    logout: userServiceLogout,
    getCurrentUser: userServiceGetCurrentUser,
    updateProfile: userServiceUpdateProfile,
    getProfile: userServiceGetProfile,
    getStats: userServiceGetStats,
    resetPassword: userServiceResetPassword,
    getAllUsers: userServiceGetAllUsers
};

console.log('✅ User Service Loaded');
