/**
 * Firebase User Profile Handler
 * Manages user profiles, avatars, and user data
 */

/**
 * Upload user avatar
 */
async function uploadUserAvatarFirebase(file) {
    try {
        if (!isUserLoggedIn()) {
            showToast('Please login first', 'error');
            return { success: false };
        }

        console.log('📤 Uploading avatar...');
        showToast('Uploading avatar...', 'info');

        const result = await firebaseUploadAvatar(file);

        if (result.success) {
            showToast('✅ Avatar updated', 'success');

            // Reload current user
            const user = firebaseGetCurrentUser();
            if (user) {
                currentUser = user;
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
            }

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
 * Update user profile information
 */
async function updateUserProfileInfoFirebase(profileData) {
    try {
        if (!isUserLoggedIn()) {
            showToast('Please login first', 'error');
            return { success: false };
        }

        const updates = {};

        // Validate and add fields
        if (profileData.name) updates.name = profileData.name;
        if (profileData.phone) updates.phone = profileData.phone;
        if (profileData.bio) updates.bio = profileData.bio;
        if (profileData.avatar) updates.avatar = profileData.avatar;

        if (Object.keys(updates).length === 0) {
            showToast('No changes to update', 'info');
            return { success: true };
        }

        showToast('Updating profile...', 'info');

        const result = await firebaseUpdateProfile(updates);

        if (result.success) {
            showToast('✅ Profile updated', 'success');

            // Update local storage
            const user = getCurrentUserProfile();
            if (user) {
                Object.assign(currentUser, updates);
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
            }
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
 * Get user's profile
 */
async function getUserProfileFirebase(userId) {
    try {
        const result = await firebaseDBService.getUserProfile(userId);
        return result.success ? result.data : null;
    } catch (error) {
        console.error('❌ Error:', error);
        return null;
    }
}

/**
 * Get all users (for admin)
 */
async function getAllUsersFirebase(limit = 50) {
    try {
        if (!isUserAdmin()) {
            showToast('Admin access required', 'error');
            return [];
        }

        const result = await firebaseDBService.getAllUsers(limit);
        return result.success ? result.data : [];
    } catch (error) {
        console.error('❌ Error:', error);
        return [];
    }
}

/**
 * Get user statistics
 */
function getUserStatistics(userProfile) {
    return {
        totalItems: userProfile?.totalItems || 0,
        resolvedItems: userProfile?.resolvedItems || 0,
        rating: userProfile?.rating || 0,
        status: userProfile?.status || 'active'
    };
}

/**
 * Update user status
 */
async function updateUserStatusFirebase(status) {
    try {
        const validStatuses = ['active', 'inactive', 'banned'];
        if (!validStatuses.includes(status)) {
            showToast('Invalid status', 'error');
            return { success: false };
        }

        return await firebaseUpdateProfile({ status: status });
    } catch (error) {
        console.error('❌ Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get user items count
 */
async function getUserItemsCountFirebase(userId) {
    try {
        const items = await firebaseDBService.getItems({ userId: userId });
        return items.success ? items.data.length : 0;
    } catch (error) {
        console.error('❌ Error:', error);
        return 0;
    }
}

/**
 * Get user resolved items count
 */
async function getUserResolvedItemsCountFirebase(userId) {
    try {
        const items = await firebaseDBService.getItems({ userId: userId, resolved: true });
        return items.success ? items.data.length : 0;
    } catch (error) {
        console.error('❌ Error:', error);
        return 0;
    }
}

/**
 * Update user rating
 */
async function updateUserRatingFirebase(rating) {
    try {
        if (rating < 0 || rating > 5) {
            showToast('Rating must be between 0 and 5', 'error');
            return { success: false };
        }

        return await firebaseDBService.incrementUserStat(
            firebaseGetCurrentUser().uid,
            'rating',
            rating
        );
    } catch (error) {
        console.error('❌ Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Format user profile for display
 */
function formatUserProfileForDisplay(profile) {
    return {
        uid: profile.uid,
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        avatar: profile.avatar || 'https://via.placeholder.com/100?text=User',
        role: profile.role,
        bio: profile.bio || '',
        totalItems: profile.totalItems || 0,
        resolvedItems: profile.resolvedItems || 0,
        rating: profile.rating || 0,
        status: profile.status || 'active',
        createdAt: profile.createdAt?.toDate?.() || new Date(profile.createdAt),
        joinDate: profile.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown'
    };
}

/**
 * Get user profile card HTML
 */
function getUserProfileCardHTML(profile) {
    const formatted = formatUserProfileForDisplay(profile);

    return `
        <div class="user-profile-card">
            <img src="${formatted.avatar}" alt="${formatted.name}" class="user-avatar">
            <h3>${formatted.name}</h3>
            <p class="user-email">${formatted.email}</p>
            <p class="user-bio">${formatted.bio}</p>
            
            <div class="user-stats">
                <div class="stat">
                    <span class="label">Total Items</span>
                    <span class="value">${formatted.totalItems}</span>
                </div>
                <div class="stat">
                    <span class="label">Resolved</span>
                    <span class="value">${formatted.resolvedItems}</span>
                </div>
                <div class="stat">
                    <span class="label">Rating</span>
                    <span class="value">⭐ ${formatted.rating.toFixed(1)}</span>
                </div>
            </div>
            
            <p class="user-joined">Joined ${formatted.joinDate}</p>
        </div>
    `;
}

/**
 * Search for users
 */
async function searchUsersFirebase(searchTerm) {
    try {
        if (!isUserAdmin()) {
            return [];
        }

        const users = await getAllUsersFirebase(100);
        const searchLower = searchTerm.toLowerCase();

        return users.filter(user =>
            user.name?.toLowerCase().includes(searchLower) ||
            user.email?.toLowerCase().includes(searchLower) ||
            user.phone?.includes(searchTerm)
        );
    } catch (error) {
        console.error('❌ Error:', error);
        return [];
    }
}

/**
 * Get user activity summary
 */
function getUserActivitySummary(profile) {
    const itemsPerMonth = profile.totalItems / Math.max(1, getDaysSinceJoin(profile));

    return {
        totalItems: profile.totalItems,
        resolvedItems: profile.resolvedItems,
        rating: profile.rating,
        successRate: profile.totalItems > 0
            ? Math.round((profile.resolvedItems / profile.totalItems) * 100)
            : 0,
        itemsPerMonth: itemsPerMonth.toFixed(1),
        status: profile.status
    };
}

/**
 * Calculate days since user joined
 */
function getDaysSinceJoin(profile) {
    const joinDate = profile.createdAt?.toDate?.() || new Date(profile.createdAt);
    const now = new Date();
    const diffMs = now - joinDate;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return Math.max(1, diffDays);
}
