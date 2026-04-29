/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLAIM SERVICE - Item Claim/Verification Logic
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Manages item claims, verification, and resolution
 */

console.log('📋 Claim Service Loading...');

// ============================================================================
// CREATE CLAIM
// ============================================================================

/**
 * Create a claim on an item
 * User claims they found or lost an item
 * 
 * @param {string} itemId - Item to claim
 * @param {string} message - Claim message/description
 * @returns {Promise<object>} - { success, claimId, error }
 */
async function claimServiceCreateClaim(itemId, message = '') {
    try {
        const currentUser = window.UserService.getCurrentUser();
        if (!currentUser?.id) {
            return { success: false, error: 'User not authenticated' };
        }

        // Find the item
        const state = window.SyncService.getState();
        const item = state.items.find(i => i.id === itemId);

        if (!item) {
            return { success: false, error: 'Item not found' };
        }

        // Cannot claim own item
        if (item.userId === currentUser.id) {
            return { success: false, error: 'Cannot claim your own item' };
        }

        // Validate claim data
        const claimData = {
            itemId: itemId,
            claimantId: currentUser.id,
            itemOwnerId: item.userId,
            message: message
        };

        const validation = window.Validators.validateClaim(claimData);
        if (!validation.valid) {
            return { success: false, error: validation.errors.join('; ') };
        }

        console.log('📝 Creating claim for item:', itemId);

        // Create in Firestore
        const result = await window.FirestoreService.createClaim(claimData);

        if (result.success) {
            const claim = { id: result.claimId, ...claimData, status: 'pending' };
            window.SyncService.syncAddClaim(claim);
            console.log('✅ Claim created');
            return { success: true, claimId: result.claimId };
        } else {
            return { success: false, error: result.error };
        }

    } catch (error) {
        console.error('❌ Error creating claim:', error);
        return { success: false, error: error.message };
    }
}

// ============================================================================
// GET CLAIMS
// ============================================================================

/**
 * Get claims made by current user (user claimed items)
 * 
 * @returns {Promise<object>} - { success, data, error }
 */
async function claimServiceGetMyClaimsCreated() {
    try {
        const currentUser = window.UserService.getCurrentUser();
        if (!currentUser?.id) {
            return { success: false, error: 'User not authenticated', data: [] };
        }

        console.log('📥 Fetching claims made by user');

        const result = await window.FirestoreService.getClaims(currentUser.id, 'made');

        if (result.success) {
            console.log(`✅ Retrieved ${result.data.length} claims created by user`);
        }

        return result;

    } catch (error) {
        console.error('❌ Error getting created claims:', error);
        return { success: false, error: error.message, data: [] };
    }
}

/**
 * Get claims received by current user (claims on user's items)
 * 
 * @returns {Array}
 */
function claimServiceGetMyClaimsReceived() {
    try {
        const state = window.SyncService.getState();
        return state.claims || [];
    } catch (error) {
        console.error('❌ Error getting received claims:', error);
        return [];
    }
}

/**
 * Get all claims for an item
 * 
 * @param {string} itemId - Item ID
 * @returns {Array}
 */
function claimServiceGetClaimsForItem(itemId) {
    try {
        const state = window.SyncService.getState();
        return (state.claims || []).filter(c => c.itemId === itemId);
    } catch (error) {
        console.error('❌ Error getting item claims:', error);
        return [];
    }
}

// ============================================================================
// APPROVE/REJECT CLAIMS
// ============================================================================

/**
 * Approve a claim
 * Item owner approves that claimant found/lost their item
 * 
 * @param {string} claimId - Claim ID
 * @returns {Promise<object>} - { success, error }
 */
async function claimServiceApproveClaim(claimId) {
    try {
        // Verify ownership
        const claim = claimServiceGetMyClaimsReceived().find(c => c.id === claimId);
        if (!claim) {
            return { success: false, error: 'Claim not found' };
        }

        const currentUser = window.UserService.getCurrentUser();
        if (claim.itemOwnerId !== currentUser?.id) {
            return { success: false, error: 'Not authorized to approve this claim' };
        }

        console.log('✅ Approving claim:', claimId);

        const result = await window.FirestoreService.updateClaimStatus(claimId, 'approved');

        if (result.success) {
            window.SyncService.syncUpdateClaim(claimId, { status: 'approved' });

            // Mark item as resolved
            const state = window.SyncService.getState();
            const item = state.items.find(i => i.id === claim.itemId);
            if (item) {
                await window.ItemService.resolveItem(item.id, item.status);
            }
        }

        return result;

    } catch (error) {
        console.error('❌ Error approving claim:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Reject a claim
 * 
 * @param {string} claimId - Claim ID
 * @returns {Promise<object>} - { success, error }
 */
async function claimServiceRejectClaim(claimId) {
    try {
        // Verify ownership
        const claim = claimServiceGetMyClaimsReceived().find(c => c.id === claimId);
        if (!claim) {
            return { success: false, error: 'Claim not found' };
        }

        const currentUser = window.UserService.getCurrentUser();
        if (claim.itemOwnerId !== currentUser?.id) {
            return { success: false, error: 'Not authorized to reject this claim' };
        }

        console.log('❌ Rejecting claim:', claimId);

        const result = await window.FirestoreService.updateClaimStatus(claimId, 'rejected');

        if (result.success) {
            window.SyncService.syncUpdateClaim(claimId, { status: 'rejected' });
        }

        return result;

    } catch (error) {
        console.error('❌ Error rejecting claim:', error);
        return { success: false, error: error.message };
    }
}

// ============================================================================
// CLAIM STATISTICS
// ============================================================================

/**
 * Get claim statistics
 * 
 * @returns {object}
 */
function claimServiceGetStats() {
    try {
        const myClaimsCreated = window.SyncService.getState().items.reduce((sum, item) => {
            const claims = claimServiceGetClaimsForItem(item.id);
            return sum + claims.length;
        }, 0);

        const myClaimsReceived = claimServiceGetMyClaimsReceived();
        const pendingClaims = myClaimsReceived.filter(c => c.status === 'pending').length;
        const approvedClaims = myClaimsReceived.filter(c => c.status === 'approved').length;

        return {
            totalClaimsMade: myClaimsCreated,
            totalClaimsReceived: myClaimsReceived.length,
            pendingClaims,
            approvedClaims
        };

    } catch (error) {
        console.error('❌ Error getting claim stats:', error);
        return {
            totalClaimsMade: 0,
            totalClaimsReceived: 0,
            pendingClaims: 0,
            approvedClaims: 0
        };
    }
}

// ============================================================================
// ADMIN OPERATIONS
// ============================================================================

/**
 * Manually resolve a claim (admin only)
 * 
 * @param {string} claimId - Claim ID
 * @param {string} action - 'approve' or 'reject'
 * @returns {Promise<object>} - { success, error }
 */
async function claimServiceAdminResolveClaim(claimId, action) {
    try {
        const currentUser = window.UserService.getCurrentUser();
        if (currentUser?.role !== 'admin') {
            return { success: false, error: 'Admin access required' };
        }

        if (!['approve', 'reject'].includes(action)) {
            return { success: false, error: 'Invalid action' };
        }

        const status = action === 'approve' ? 'approved' : 'rejected';
        return await window.FirestoreService.updateClaimStatus(claimId, status);

    } catch (error) {
        console.error('❌ Admin resolve error:', error);
        return { success: false, error: error.message };
    }
}

// ============================================================================
// EXPORTS
// ============================================================================

window.ClaimService = {
    createClaim: claimServiceCreateClaim,
    getMyClaimsCreated: claimServiceGetMyClaimsCreated,
    getMyClaimsReceived: claimServiceGetMyClaimsReceived,
    getClaimsForItem: claimServiceGetClaimsForItem,
    approveClaim: claimServiceApproveClaim,
    rejectClaim: claimServiceRejectClaim,
    getStats: claimServiceGetStats,
    adminResolveClaim: claimServiceAdminResolveClaim
};

console.log('✅ Claim Service Loaded');
