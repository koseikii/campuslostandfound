// ========== USER PROFILE & SETTINGS FUNCTIONS ==========

// Global state for deleted items management
let selectedDeletedItems = [];

// ========== USER MENU ==========

function toggleUserDropdown() {
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) dropdown.classList.toggle('active');
}

// ========== PROFILE VIEW ==========

function viewProfile() {
    try {
        if (!currentUser) {
            console.warn('⚠️ No current user');
            return;
        }

        const myItems = items.filter(i => i.userId === currentUser.id);
        const profileContent = document.getElementById('profileContent');

        if (!profileContent) {
            console.error('❌ Profile content element not found');
            return;
        }

        // Format phone number - handle undefined/empty
        const phoneDisplay = currentUser.phone && currentUser.phone.trim()
            ? currentUser.phone
            : 'Not provided';

        // Format role - capitalize first letter
        const roleDisplay = currentUser.role
            ? currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)
            : 'User';

        profileContent.innerHTML = `
            <div class="profile-item">
                <strong><i class="fas fa-user"></i> Name</strong>
                <span>${currentUser.name || 'Unknown'}</span>
            </div>
            <div class="profile-item">
                <strong><i class="fas fa-envelope"></i> Email</strong>
                <span>${currentUser.email || 'Not provided'}</span>
            </div>
            <div class="profile-item">
                <strong><i class="fas fa-phone"></i> Phone</strong>
                <span>${phoneDisplay}</span>
            </div>
            <div class="profile-item">
                <strong><i class="fas fa-id-badge"></i> Role</strong>
                <span style="text-transform: capitalize;">${roleDisplay}</span>
            </div>
            <div class="profile-item">
                <strong><i class="fas fa-list"></i> Total Items</strong>
                <span>${myItems.length}</span>
            </div>
            <div class="profile-item">
                <strong><i class="fas fa-check-circle"></i> Resolved Items</strong>
                <span>${myItems.filter(i => i.resolved).length}</span>
            </div>
        `;

        const profileModal = document.getElementById('profileModal');
        if (profileModal) profileModal.classList.add('active');

        const userDropdown = document.getElementById('userDropdown');
        if (userDropdown) userDropdown.classList.remove('active');
    } catch (error) {
        console.error('❌ Error viewing profile:', error);
        if (typeof showToast === 'function') {
            showToast('Error loading profile: ' + error.message, 'error');
        }
    }
}

function closeProfileModal() {
    try {
        const modal = document.getElementById('profileModal');
        if (modal) modal.classList.remove('active');
    } catch (error) {
        console.error('❌ Error closing profile modal:', error);
    }
}

// ========== EDIT PROFILE ==========

function openEditProfileModal() {
    try {
        if (!currentUser) {
            console.warn('⚠️ Cannot open edit profile modal - no current user');
            return;
        }

        const editProfileName = document.getElementById('editProfileName');
        const editProfileEmail = document.getElementById('editProfileEmail');
        const editProfilePhone = document.getElementById('editProfilePhone');

        // Set values - handle undefined/null gracefully
        if (editProfileName) editProfileName.value = currentUser.name || '';
        if (editProfileEmail) editProfileEmail.value = currentUser.email || '';
        if (editProfilePhone) editProfilePhone.value = currentUser.phone || '';

        console.log('📝 Edit profile form loaded:', {
            name: currentUser.name,
            email: currentUser.email,
            phone: currentUser.phone || '(not set)'
        });

        const editProfileModal = document.getElementById('editProfileModal');
        if (!editProfileModal) {
            console.error('❌ Edit profile modal not found in DOM');
            return;
        }
        editProfileModal.classList.add('active');

        const userDropdown = document.getElementById('userDropdown');
        if (userDropdown) userDropdown.classList.remove('active');
    } catch (error) {
        console.error('❌ Error opening edit profile modal:', error);
    }
}

function closeEditProfileModal() {
    try {
        const modal = document.getElementById('editProfileModal');
        if (modal) modal.classList.remove('active');
    } catch (error) {
        console.error('❌ Error closing edit profile modal:', error);
    }
}

function handleEditProfileSubmit(e) {
    try {
        e.preventDefault();
        console.log('👤 Editing profile...');

        // Get form elements
        const nameEl = document.getElementById('editProfileName');
        const emailEl = document.getElementById('editProfileEmail');
        const phoneEl = document.getElementById('editProfilePhone');
        const emailNotifEl = document.getElementById('editProfileEmailNotifications');

        if (!nameEl || !emailEl || !phoneEl) {
            console.error('❌ Required profile form fields not found');
            if (typeof showToast === 'function') {
                showToast('Form fields not found. Please refresh the page.', 'error');
            }
            return;
        }

        const name = nameEl.value.trim();
        const email = emailEl.value.trim();
        const phone = phoneEl.value.trim();
        const emailNotifications = emailNotifEl ? emailNotifEl.checked : false;

        // Validate inputs
        if (!name || !email || !phone) {
            if (typeof showToast === 'function') {
                showToast('Please fill all fields', 'error');
            }
            return;
        }

        // Validate email format
        if (!email.includes('@')) {
            if (typeof showToast === 'function') {
                showToast('Please enter a valid email', 'error');
            }
            return;
        }

        // Check if current user exists
        if (!currentUser || !currentUser.id) {
            console.error('❌ Current user not found');
            if (typeof showToast === 'function') {
                showToast('User session lost. Please log in again.', 'error');
            }
            return;
        }

        // Check if email already exists (and is not current user's)
        if (typeof users !== 'undefined' && Array.isArray(users)) {
            const emailExists = users.some(u => u.email === email && u.id !== currentUser.id);
            if (emailExists) {
                if (typeof showToast === 'function') {
                    showToast('Email is already in use by another account', 'error');
                }
                return;
            }
        }

        // Update current user
        currentUser.name = name;
        currentUser.email = email;
        currentUser.phone = phone;
        currentUser.emailNotifications = emailNotifications;

        // Update in users array if available
        if (typeof users !== 'undefined' && Array.isArray(users)) {
            const userIndex = users.findIndex(u => u.id === currentUser.id);
            if (userIndex !== -1) {
                users[userIndex] = JSON.parse(JSON.stringify(currentUser));
                console.log('✓ User updated in array');
            }
        }

        // Save data
        try {
            if (typeof saveData === 'function') {
                saveData();
            }
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            console.log('✓ Profile saved');
        } catch (err) {
            console.error('❌ Error saving profile:', err);
            if (typeof showToast === 'function') {
                showToast('Error saving profile. Please try again.', 'error');
            }
            return;
        }

        if (typeof showToast === 'function') {
            showToast('Profile updated successfully!', 'success');
        }
        console.log('✅ Profile update complete');

        // Close modal
        closeEditProfileModal();

        // Update header info
        const userNameEl = document.getElementById('userName');
        const userRoleEl = document.getElementById('userRole');
        const userAvatarEl = document.getElementById('userAvatar');

        if (userNameEl) userNameEl.textContent = currentUser.name;
        if (userRoleEl) userRoleEl.textContent = currentUser.role;
        if (userAvatarEl) userAvatarEl.textContent = currentUser.name[0].toUpperCase();

    } catch (error) {
        console.error('❌ handleEditProfileSubmit error:', error);
        if (typeof showToast === 'function') {
            showToast('An error occurred while updating profile: ' + error.message, 'error');
        }
    }
}

// ========== MY ITEMS ==========

function viewMyItems() {
    try {
        if (!currentUser) {
            console.warn('⚠️ No current user');
            return;
        }

        const myItems = items.filter(i => i.userId === currentUser.id);
        const myItemsList = document.getElementById('myItemsList');

        if (!myItemsList) {
            console.error('❌ My items list element not found');
            return;
        }

        if (myItems.length === 0) {
            myItemsList.innerHTML = '<p style="text-align: center; color: var(--text-muted);">You haven\'t reported any items yet.</p>';
        } else {
            myItemsList.innerHTML = myItems.map(item => `
                <div class="my-item-card">
                    <div class="my-item-info">
                        <h4>${item.title}</h4>
                        <p>
                            <span class="badge badge-${item.status}">${item.status}</span>
                            ${item.matched ? '<span class="badge badge-matched"><i class="fas fa-star"></i> Matched</span>' : ''}
                            ${item.resolved ? '<span class="badge badge-resolved"><i class="fas fa-check-circle"></i> Resolved</span>' : ''}
                        </p>
                        <p>${item.location} • ${formatDate(item.date)}</p>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn btn-secondary btn-sm" onclick="editItem(${item.id}); closeMyItemsModal();">
                            <i class="fas fa-edit"></i>
                        </button>
                        ${!item.resolved ? `
                            <button class="btn btn-primary btn-sm" onclick="markResolved(${item.id}); viewMyItems();">
                                <i class="fas fa-check"></i>
                            </button>
                        ` : ''}
                        <button class="btn btn-danger btn-sm" onclick="deleteItem(${item.id}); viewMyItems();">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `).join('');
        }

        const myItemsModal = document.getElementById('myItemsModal');
        if (myItemsModal) myItemsModal.classList.add('active');
    } catch (error) {
        console.error('❌ Error viewing my items:', error);
        if (typeof showToast === 'function') {
            showToast('Error loading items: ' + error.message, 'error');
        }
    }
}

function closeMyItemsModal() {
    try {
        const modal = document.getElementById('myItemsModal');
        if (modal) modal.classList.remove('active');
    } catch (error) {
        console.error('❌ Error closing my items modal:', error);
    }
}

// ========== CONTACT ==========

function viewContact(userId, itemId) {
    try {
        if (!items || !Array.isArray(items)) {
            console.error('❌ Items array not available');
            return;
        }

        // Get the item first to get user info
        const item = items.find(i => i.id === itemId);
        if (!item) {
            console.error('❌ Item not found:', itemId);
            return;
        }

        // Try to find user in users array, fall back to item's userName
        let user = null;
        if (users && Array.isArray(users)) {
            user = users.find(u => u.id === userId);
        }

        if (!user && item.userName) {
            // Use the username stored with the item
            user = {
                id: item.userId,
                name: item.userName,
                email: item.userEmail || 'not provided',
                phone: item.userPhone || 'not provided',
                role: item.userRole || 'user'
            };
            console.log('✓ Using fallback user data from item:', user);
        } else if (!user) {
            console.error('❌ User not found and no fallback available for userId:', userId);
            if (typeof showToast === 'function') {
                showToast('User information not available', 'error');
            }
            return;
        }

        let socialMediaHTML = '';

        if (item && item.socialMedia && (item.socialMedia.facebook || item.socialMedia.twitter || item.socialMedia.instagram || item.socialMedia.linkedin || item.socialMedia.whatsapp)) {
            socialMediaHTML = `
                <div style="border-top: 1px solid var(--border-color); padding-top: 15px; margin-top: 15px;">
                    <strong><i class="fas fa-share-alt"></i> Social Media</strong>
                    <div style="margin-top: 10px; font-size: 14px;">
                        ${item.socialMedia.facebook ? `<div style="margin-bottom: 8px;"><strong>Facebook:</strong> <span style="color: var(--text-secondary);">${item.socialMedia.facebook}</span></div>` : ''}
                        ${item.socialMedia.twitter ? `<div style="margin-bottom: 8px;"><strong>Twitter:</strong> <span style="color: var(--text-secondary);">${item.socialMedia.twitter}</span></div>` : ''}
                        ${item.socialMedia.instagram ? `<div style="margin-bottom: 8px;"><strong>Instagram:</strong> <span style="color: var(--text-secondary);">${item.socialMedia.instagram}</span></div>` : ''}
                        ${item.socialMedia.linkedin ? `<div style="margin-bottom: 8px;"><strong>LinkedIn:</strong> <span style="color: var(--text-secondary);">${item.socialMedia.linkedin}</span></div>` : ''}
                        ${item.socialMedia.whatsapp ? `<div style="margin-bottom: 8px;"><strong>WhatsApp:</strong> <span style="color: var(--text-secondary);">${item.socialMedia.whatsapp}</span></div>` : ''}
                    </div>
                </div>
            `;
        }

        const contactInfo = document.getElementById('contactInfo');
        if (contactInfo) {
            contactInfo.innerHTML = `
                <div>
                    <strong><i class="fas fa-user"></i> Name</strong>
                    <p>${user.name}</p>
                </div>
                <div>
                    <strong><i class="fas fa-envelope"></i> Email</strong>
                    <p><a href="mailto:${user.email}">${user.email}</a></p>
                </div>
                <div>
                    <strong><i class="fas fa-phone"></i> Phone</strong>
                    <p><a href="tel:${user.phone}">${user.phone}</a></p>
                </div>
                <div>
                    <strong><i class="fas fa-id-badge"></i> Role</strong>
                    <p style="text-transform: capitalize;">${user.role}</p>
                </div>
                ${socialMediaHTML}
            `;
        }

        const contactModal = document.getElementById('contactModal');
        if (contactModal) contactModal.classList.add('active');
    } catch (error) {
        console.error('❌ Error viewing contact:', error);
        if (typeof showToast === 'function') {
            showToast('Error loading contact: ' + error.message, 'error');
        }
    }
}

function closeContactModal() {
    try {
        const modal = document.getElementById('contactModal');
        if (modal) modal.classList.remove('active');
    } catch (error) {
        console.error('❌ Error closing contact modal:', error);
    }
}

// ========== DELETED ITEMS MANAGEMENT ==========

function showDeletedItems() {
    try {
        if (!deletedItems || !Array.isArray(deletedItems)) {
            console.error('❌ Deleted items array not available');
            return;
        }

        const modal = document.getElementById('deletedItemsModal');
        const list = document.getElementById('deletedItemsList');

        if (!modal || !list) {
            console.error('❌ Deleted items modal elements not found');
            return;
        }

        selectedDeletedItems = [];

        if (deletedItems.length === 0) {
            list.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 20px;">No deleted items</p>';
        } else {
            const itemsList = deletedItems.map(item => {
                const reportedBy = users.find(u => u.id === item.userId);
                const reporterName = reportedBy ? reportedBy.name : 'Unknown User';

                return `
                    <div style="background: var(--bg-card); padding: 15px; border-radius: 8px; margin-bottom: 10px; border-left: 4px solid #ff6b6b; position: relative;">
                        <div style="display: flex; gap: 15px;">
                            <div style="display: flex; align-items: flex-start; padding-top: 5px;">
                                <input type="checkbox" class="deleted-item-checkbox" data-item-id="${item.id}" 
                                    style="width: 20px; height: 20px; cursor: pointer; margin-top: 5px;"
                                    onchange="toggleDeletedItemSelection(${item.id}, this.checked)">
                            </div>
                            <div style="flex-shrink: 0;">
                                ${item.image && item.image.startsWith('data:image/')
                        ? `<img src="${item.image}" alt="Item photo" style="width: 100px; height: 100px; object-fit: cover; border-radius: 6px; border: 1px solid var(--border);">`
                        : `<div style="width: 100px; height: 100px; background: var(--bg-secondary); border-radius: 6px; display: flex; align-items: center; justify-content: center; border: 1px solid var(--border);"><i class="fas fa-image" style="color: var(--text-muted); font-size: 30px;"></i></div>`}
                            </div>
                            <div style="flex: 1;">
                                <h4 style="margin: 0 0 8px 0; font-weight: 600;">${item.title}</h4>
                                <p style="margin: 0 0 5px 0; font-size: 12px; color: var(--text-secondary);">
                                    <strong>Category:</strong> ${item.category} | <strong>Status:</strong> ${item.status === 'lost' ? 'Lost' : 'Found'}
                                </p>
                                <p style="margin: 0 0 5px 0; font-size: 12px; color: var(--text-secondary);">
                                    <strong>Reported by:</strong> ${reporterName}
                                </p>
                                <p style="margin: 0; font-size: 12px; color: var(--text-secondary);">
                                    ${item.description.substring(0, 100)}${item.description.length > 100 ? '...' : ''}
                                </p>
                            </div>
                            <div style="display: flex; flex-direction: column; gap: 8px; flex-shrink: 0;">
                                <button onclick="recoverItem(${item.id})" class="btn btn-success btn-small" title="Recover this item">
                                    <i class="fas fa-undo"></i> Recover
                                </button>
                                <button onclick="permanentlyDeleteItem(${item.id})" class="btn btn-danger btn-small" title="Permanently delete this item">
                                    <i class="fas fa-trash"></i> Delete
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            const hasSelection = selectedDeletedItems.length > 0;
            const bulkActions = `
                <div style="margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                            <input type="checkbox" id="selectAllDeletedCheckbox" 
                                style="width: 18px; height: 18px; cursor: pointer;"
                                onchange="toggleSelectAllDeleted(this.checked)">
                            <span style="color: var(--text-secondary); font-size: 14px;">Select All (${deletedItems.length})</span>
                        </label>
                    </div>
                    <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                        <p style="margin: 0; color: var(--text-secondary); font-size: 14px;">
                            Selected: <strong id="selectedCountDisplay">0</strong>
                        </p>
                        <button onclick="recoverSelectedItems()" class="btn btn-success" ${!hasSelection ? 'style="opacity: 0.5; cursor: not-allowed;" disabled' : ''} title="Recover all selected items">
                            <i class="fas fa-undo"></i> Recover Selected
                        </button>
                        <button onclick="deleteSelectedItems()" class="btn btn-danger" ${!hasSelection ? 'style="opacity: 0.5; cursor: not-allowed;" disabled' : ''} title="Permanently delete all selected items">
                            <i class="fas fa-trash"></i> Delete Selected
                        </button>
                    </div>
                </div>
            `;

            list.innerHTML = `
                ${bulkActions}
                <div style="border-bottom: 1px solid var(--border); padding-bottom: 20px; margin-bottom: 20px;">
                    <p style="margin: 0; color: var(--text-secondary); font-size: 13px;">
                        Total deleted: <strong>${deletedItems.length}</strong> items
                    </p>
                </div>
                ${itemsList}
            `;
        }

        modal.classList.add('active');
    } catch (error) {
        console.error('❌ Error showing deleted items:', error);
        if (typeof showToast === 'function') {
            showToast('Error loading deleted items: ' + error.message, 'error');
        }
    }
}

function closeDeletedItemsModal() {
    try {
        const modal = document.getElementById('deletedItemsModal');
        if (modal) modal.classList.remove('active');
    } catch (error) {
        console.error('❌ Error closing deleted items modal:', error);
    }
}

function toggleDeletedItemSelection(itemId, isChecked) {
    try {
        if (isChecked) {
            if (!selectedDeletedItems.includes(itemId)) {
                selectedDeletedItems.push(itemId);
            }
        } else {
            selectedDeletedItems = selectedDeletedItems.filter(id => id !== itemId);
            const selectAllCheckbox = document.getElementById('selectAllDeletedCheckbox');
            if (selectAllCheckbox) selectAllCheckbox.checked = false;
        }
        updateSelectedDeletedCount();
    } catch (error) {
        console.error('❌ Error toggling deleted item selection:', error);
    }
}

function toggleSelectAllDeleted(isChecked) {
    try {
        const checkboxes = document.querySelectorAll('.deleted-item-checkbox');
        if (isChecked) {
            selectedDeletedItems = deletedItems.map(item => item.id);
            checkboxes.forEach(cb => cb.checked = true);
        } else {
            selectedDeletedItems = [];
            checkboxes.forEach(cb => cb.checked = false);
        }
        updateSelectedDeletedCount();
    } catch (error) {
        console.error('❌ Error toggling select all deleted:', error);
    }
}

function updateSelectedDeletedCount() {
    try {
        const countDisplay = document.getElementById('selectedCountDisplay');
        if (countDisplay) {
            countDisplay.textContent = selectedDeletedItems.length;
        }

        const recoverBtn = document.querySelector('button[onclick="recoverSelectedItems()"]');
        const deleteBtn = document.querySelector('button[onclick="deleteSelectedItems()"]');

        if (recoverBtn) {
            recoverBtn.style.opacity = selectedDeletedItems.length > 0 ? '1' : '0.5';
            recoverBtn.disabled = selectedDeletedItems.length === 0;
        }

        if (deleteBtn) {
            deleteBtn.style.opacity = selectedDeletedItems.length > 0 ? '1' : '0.5';
            deleteBtn.disabled = selectedDeletedItems.length === 0;
        }
    } catch (error) {
        console.error('❌ Error updating selected deleted count:', error);
    }
}

function recoverSelectedItems() {
    try {
        if (selectedDeletedItems.length === 0) {
            if (typeof showToast === 'function') {
                showToast('Please select items to recover', 'warning');
            }
            return;
        }

        if (confirm(`Are you sure you want to recover ${selectedDeletedItems.length} item(s)?`)) {
            selectedDeletedItems.forEach(itemId => {
                const itemIndex = deletedItems.findIndex(i => i.id === itemId);
                if (itemIndex !== -1) {
                    const item = deletedItems[itemIndex];
                    delete item.deletedAt;
                    delete item.deletedBy;
                    items.push(item);
                    deletedItems.splice(itemIndex, 1);
                }
            });
            if (typeof saveData === 'function') {
                saveData();
            }
            if (typeof showToast === 'function') {
                showToast(`${selectedDeletedItems.length} item(s) recovered successfully`, 'success');
            }
            selectedDeletedItems = [];
            showDeletedItems();
        }
    } catch (error) {
        console.error('❌ Error recovering selected items:', error);
        if (typeof showToast === 'function') {
            showToast('Error recovering items: ' + error.message, 'error');
        }
    }
}

function deleteSelectedItems() {
    try {
        if (selectedDeletedItems.length === 0) {
            if (typeof showToast === 'function') {
                showToast('Please select items to delete', 'warning');
            }
            return;
        }

        if (confirm(`Are you sure you want to permanently delete ${selectedDeletedItems.length} item(s)? This cannot be undone.`)) {
            selectedDeletedItems.forEach(itemId => {
                const itemIndex = deletedItems.findIndex(i => i.id === itemId);
                if (itemIndex !== -1) {
                    deletedItems.splice(itemIndex, 1);
                }
            });
            if (typeof saveData === 'function') {
                saveData();
            }
            if (typeof showToast === 'function') {
                showToast(`${selectedDeletedItems.length} item(s) permanently deleted`, 'success');
            }
            selectedDeletedItems = [];
            showDeletedItems();
        }
    } catch (error) {
        console.error('❌ Error deleting selected items:', error);
        if (typeof showToast === 'function') {
            showToast('Error deleting items: ' + error.message, 'error');
        }
    }
}

function recoverItem(itemId) {
    try {
        const parsedId = typeof itemId === 'string' ? parseInt(itemId) : itemId;
        const itemIndex = deletedItems.findIndex(i => i.id === parsedId);
        if (itemIndex !== -1) {
            const item = deletedItems[itemIndex];
            delete item.deletedAt;
            delete item.deletedBy;
            items.push(item);
            deletedItems.splice(itemIndex, 1);
            if (typeof saveData === 'function') {
                saveData();
            }
            if (typeof showToast === 'function') {
                showToast('Item recovered successfully', 'success');
            }
            showDeletedItems();
        } else {
            if (typeof showToast === 'function') {
                showToast('Item not found', 'error');
            }
        }
    } catch (error) {
        console.error('❌ Error recovering item:', error);
        if (typeof showToast === 'function') {
            showToast('Error recovering item: ' + error.message, 'error');
        }
    }
}

function permanentlyDeleteItem(itemId) {
    try {
        if (confirm('Are you sure you want to permanently delete this item? This cannot be undone.')) {
            const parsedId = typeof itemId === 'string' ? parseInt(itemId) : itemId;
            const itemIndex = deletedItems.findIndex(i => i.id === parsedId);
            if (itemIndex !== -1) {
                deletedItems.splice(itemIndex, 1);
                if (typeof saveData === 'function') {
                    saveData();
                }
                if (typeof showToast === 'function') {
                    showToast('Item permanently deleted', 'success');
                }
                showDeletedItems();
            } else {
                if (typeof showToast === 'function') {
                    showToast('Item not found', 'error');
                }
            }
        }
    } catch (error) {
        console.error('❌ Error permanently deleting item:', error);
        if (typeof showToast === 'function') {
            showToast('Error deleting item: ' + error.message, 'error');
        }
    }
}

// ========== FILTER UTILITIES ==========

function resetFilters() {
    try {
        const categoryFilter = document.getElementById('categoryFilter');
        const statusFilter = document.getElementById('statusFilter');
        const sortFilter = document.getElementById('sortFilter');
        const searchInput = document.getElementById('searchInput');

        if (categoryFilter) categoryFilter.value = 'all';
        if (statusFilter) statusFilter.value = 'active';
        if (sortFilter) sortFilter.value = 'newest';
        if (searchInput) searchInput.value = '';

        if (typeof filterItems === 'function') {
            filterItems();
        }
    } catch (error) {
        console.error('❌ Error resetting filters:', error);
    }
}
