/**
 * ═══════════════════════════════════════════════════════════════════════════
 * VALIDATORS MODULE - Data Validation
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Features:
 * - Item validation
 * - User validation
 * - Claim validation
 * - Field normalization
 */

console.log('✓ Validators Module Loading...');

// ============================================================================
// ITEM VALIDATION
// ============================================================================

/**
 * Validate item data before saving
 * 
 * @param {object} itemData - Item data
 * @returns {object} - { valid: boolean, errors: string[] }
 */
function validateItem(itemData) {
    const errors = [];

    // Required fields
    if (!itemData.name || itemData.name.trim().length === 0) {
        errors.push('Item name is required');
    }

    if (!itemData.status || !['lost', 'found'].includes(itemData.status)) {
        errors.push('Status must be "lost" or "found"');
    }

    if (!itemData.userId || itemData.userId.trim().length === 0) {
        errors.push('User ID is required');
    }

    // Optional but validated fields
    if (itemData.location && itemData.location.trim().length === 0) {
        errors.push('Location cannot be empty if provided');
    }

    if (itemData.description && itemData.description.length > 1000) {
        errors.push('Description too long (max 1000 characters)');
    }

    // Validate images array
    if (itemData.images && !Array.isArray(itemData.images)) {
        errors.push('Images must be an array');
    }

    if (itemData.images) {
        for (const img of itemData.images) {
            if (typeof img !== 'string' || !img.startsWith('http')) {
                errors.push('Invalid image URL');
            }
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Normalize item data
 * Maps old field names to new structure
 * 
 * @param {object} itemData - Raw item data
 * @returns {object} - Normalized item
 */
function normalizeItem(itemData) {
    return {
        name: itemData.title || itemData.name || '',
        description: itemData.description || '',
        category: itemData.category || itemData.category_id || 'other',
        status: itemData.status || itemData.item_type || 'lost',
        location: itemData.location || itemData.location_description || 'Campus',
        images: Array.isArray(itemData.images) ? itemData.images : (itemData.image ? [itemData.image] : []),
        userId: itemData.userId || itemData.uid || '',
        date: itemData.date || itemData.found_on_date || new Date().toISOString().split('T')[0],
        resolved: itemData.resolved === true,
        matched: itemData.matched === true
    };
}

// ============================================================================
// USER VALIDATION
// ============================================================================

/**
 * Validate user data
 * 
 * @param {object} userData - User data
 * @returns {object} - { valid: boolean, errors: string[] }
 */
function validateUser(userData) {
    const errors = [];

    // Required fields
    if (!userData.email || !_isValidEmail(userData.email)) {
        errors.push('Valid email is required');
    }

    if (!userData.name || userData.name.trim().length < 2) {
        errors.push('Name must be at least 2 characters');
    }

    if (userData.password && userData.password.length < 6) {
        errors.push('Password must be at least 6 characters');
    }

    // Optional fields
    if (userData.phone && !_isValidPhone(userData.phone)) {
        errors.push('Invalid phone number');
    }

    if (userData.role && !['user', 'admin', 'moderator'].includes(userData.role)) {
        errors.push('Invalid role');
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Normalize user data
 * 
 * @param {object} userData - Raw user data
 * @returns {object} - Normalized user
 */
function normalizeUser(userData) {
    return {
        uid: userData.uid || '',
        email: userData.email?.toLowerCase() || '',
        name: userData.name?.trim() || '',
        phone: userData.phone?.trim() || '',
        role: userData.role || 'user',
        avatar: userData.avatar || '',
        bio: userData.bio || '',
        status: userData.status || 'active'
    };
}

// ============================================================================
// CLAIM VALIDATION
// ============================================================================

/**
 * Validate claim data
 * 
 * @param {object} claimData - Claim data
 * @returns {object} - { valid: boolean, errors: string[] }
 */
function validateClaim(claimData) {
    const errors = [];

    if (!claimData.itemId || claimData.itemId.trim().length === 0) {
        errors.push('Item ID is required');
    }

    if (!claimData.claimantId || claimData.claimantId.trim().length === 0) {
        errors.push('Claimant ID is required');
    }

    if (!claimData.itemOwnerId || claimData.itemOwnerId.trim().length === 0) {
        errors.push('Item owner ID is required');
    }

    if (claimData.message && claimData.message.length > 500) {
        errors.push('Message too long (max 500 characters)');
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Validate email format
 * 
 * @private
 * @param {string} email - Email to validate
 * @returns {boolean}
 */
function _isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate phone number (basic check)
 * 
 * @private
 * @param {string} phone - Phone to validate
 * @returns {boolean}
 */
function _isValidPhone(phone) {
    const phoneRegex = /^[\d+\-\s()]{7,}$/;
    return phoneRegex.test(phone);
}

/**
 * Sanitize string input
 * 
 * @param {string} str - String to sanitize
 * @returns {string} - Sanitized string
 */
function sanitizeString(str) {
    if (typeof str !== 'string') return '';
    return str
        .trim()
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\"/g, '&quot;')
        .slice(0, 1000);
}

// ============================================================================
// EXPORTS
// ============================================================================

window.Validators = {
    validateItem,
    normalizeItem,
    validateUser,
    normalizeUser,
    validateClaim,
    sanitizeString
};

console.log('✅ Validators Module Loaded');
