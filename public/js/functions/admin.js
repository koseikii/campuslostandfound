// ========== ADMIN FUNCTIONS ==========

async function showAdminPanel() {
    try {
        document.getElementById('loginPage').classList.remove('active');
        document.getElementById('appPage').classList.remove('active');
        document.getElementById('adminPage').classList.add('active');

        // Set admin user info
        if (currentUser) {
            const nameElement = document.getElementById('adminUserName');
            const avatarElement = document.getElementById('adminUserAvatar');
            if (nameElement) nameElement.textContent = currentUser.name;
            if (avatarElement) avatarElement.textContent = currentUser.name[0].toUpperCase();
        }

        // ✅ FIX: Sync Firebase data before showing admin panel
        console.log('🔄 Admin panel loading - syncing data from Firebase...');

        if (isFirebaseReady() && typeof syncUsersFromFirebase === 'function') {
            try {
                await syncUsersFromFirebase();
                console.log(`✅ Users synced from Firebase: ${users.length} users`);
            } catch (error) {
                console.warn('⚠️ User sync failed:', error);
            }
        }

        if (isFirebaseReady() && typeof syncDeletedItemsFromFirebase === 'function') {
            try {
                await syncDeletedItemsFromFirebase();
                console.log(`✅ Deleted items synced from Firebase: ${deletedItems.length} items`);
            } catch (error) {
                console.warn('⚠️ Deleted items sync failed:', error);
            }
        }

        await updateAdminDashboard();
    } catch (error) {
        console.error('❌ Error showing admin panel:', error);
        showToast('Error loading admin panel: ' + error.message, 'error');
    }
}

async function updateAdminDashboard() {
    try {
        console.log('📊 Updating admin dashboard...');

        // Calculate statistics
        const totalLost = items.filter(i => i.status === 'lost').length;
        const totalFound = items.filter(i => i.status === 'found').length;
        const totalResolved = items.filter(i => i.resolved).length;
        const totalMatched = items.filter(i => i.matched).length;
        const totalUsers = users.filter(u => u.role !== 'admin').length;

        // Update dashboard elements
        const elements = {
            'adminTotalLost': totalLost,
            'adminTotalFound': totalFound,
            'adminTotalResolved': totalResolved,
            'adminTotalMatched': totalMatched,
            'adminTotalUsers': totalUsers,
            'adminTotalItems': items.length
        };

        Object.entries(elements).forEach(([id, value]) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        });

        console.log(`✅ Dashboard updated: ${totalLost} lost, ${totalFound} found, ${totalUsers} users`);

        // Load and display data
        loadAdminItems();
        loadAdminUsers();
    } catch (error) {
        console.error('❌ Error updating dashboard:', error);
        showToast('Error updating dashboard: ' + error.message, 'error');
    }
}

// Global selection tracking
let selectedAdminItems = [];
let selectedResolvedItems = [];
let selectedAdminUsers = [];

function loadAdminItems() {
    const searchTerm = document.getElementById('adminItemSearch') ? document.getElementById('adminItemSearch').value.toLowerCase() : '';
    const statusFilter = document.getElementById('adminItemStatusFilter') ? document.getElementById('adminItemStatusFilter').value : '';
    const resolvedFilter = document.getElementById('adminItemResolvedFilter') ? document.getElementById('adminItemResolvedFilter').value : '';

    let filteredItems = items.filter(item => {
        const matchesSearch = !searchTerm ||
            item.title.toLowerCase().includes(searchTerm) ||
            item.location.toLowerCase().includes(searchTerm) ||
            item.category.toLowerCase().includes(searchTerm);
        const matchesStatus = !statusFilter || item.status === statusFilter;
        const isUnresolved = !item.resolved;

        return matchesSearch && matchesStatus && isUnresolved;
    });

    filteredItems.sort((a, b) => {
        const dateA = new Date(a.date || 0).getTime();
        const dateB = new Date(b.date || 0).getTime();
        return dateB - dateA;
    });

    const grid = document.getElementById('adminItemsTable');
    if (!grid) return;

    if (filteredItems.length === 0) {
        grid.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 20px;">No items found</td></tr>';
        return;
    }

    selectedAdminItems = [];

    grid.innerHTML = filteredItems.map(item => {
        // ✅ FIX: Fallback to stored userName if user lookup fails
        const user = users.find(u => u.id === item.userId);
        const userName = user ? user.name : (item.userName || 'Unknown');
        return `
            <tr>
                <td style="text-align: center; width: 50px;">
                    <input type="checkbox" class="admin-item-checkbox" data-item-id="${item.id}" 
                        style="width: 18px; height: 18px; cursor: pointer;"
                        onchange="toggleAdminItemSelection(${item.id}, this.checked)">
                </td>
                <td><button onclick="viewAdminItemDetail(${item.id})" style="background: none; border: none; color: var(--primary); cursor: pointer; text-decoration: underline;"><strong>${item.title}</strong></button></td>
                <td>${item.category}</td>
                <td><span class="badge badge-${item.status}">${item.status}</span></td>
                <td>${userName}</td>
                <td>${item.date || 'N/A'}</td>
                <td>${item.resolved ? '<span class="badge badge-resolved">Resolved</span>' : '<span style="color: var(--text-muted);">Pending</span>'}</td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="adminDeleteItem(${item.id})">Delete</button>
                </td>
            </tr>
        `;
    }).join('');
}

function toggleAdminItemSelection(itemId, isChecked) {
    if (isChecked) {
        if (!selectedAdminItems.includes(itemId)) {
            selectedAdminItems.push(itemId);
        }
    } else {
        selectedAdminItems = selectedAdminItems.filter(id => id !== itemId);
        const selectAllCheckbox = document.querySelector('thead input[type="checkbox"]');
        if (selectAllCheckbox) selectAllCheckbox.checked = false;
    }
    updateAdminItemsCount();
}

function toggleSelectAllAdminItems(isChecked) {
    const checkboxes = document.querySelectorAll('.admin-item-checkbox');
    const table = document.getElementById('adminItemsTable');
    const itemsInTable = Array.from(table.querySelectorAll('input[data-item-id]')).map(cb => parseInt(cb.dataset.itemId));

    if (isChecked) {
        selectedAdminItems = [...new Set([...selectedAdminItems, ...itemsInTable])];
        checkboxes.forEach(cb => cb.checked = true);
    } else {
        selectedAdminItems = selectedAdminItems.filter(id => !itemsInTable.includes(id));
        checkboxes.forEach(cb => cb.checked = false);
    }
    updateAdminItemsCount();
}

function updateAdminItemsCount() {
    const countDisplay = document.getElementById('adminItemsCountDisplay');
    const deleteBtn = document.querySelector('button[onclick="deleteSelectedAdminItems()"]');

    if (countDisplay) countDisplay.textContent = selectedAdminItems.length;
    if (deleteBtn) {
        if (selectedAdminItems.length > 0) {
            deleteBtn.style.opacity = '1';
            deleteBtn.disabled = false;
        } else {
            deleteBtn.style.opacity = '0.5';
            deleteBtn.disabled = true;
        }
    }
}

async function deleteSelectedAdminItems() {
    if (selectedAdminItems.length === 0) {
        showToast('Please select items to delete', 'warning');
        return;
    }

    if (confirm(`Are you sure you want to delete ${selectedAdminItems.length} item(s)?`)) {
        showToast('Deleting items...', 'info');

        // Delete each item from Firebase
        for (const itemId of selectedAdminItems) {
            try {
                // Delete from local array
                const index = items.findIndex(i => i.id === itemId);
                if (index !== -1) {
                    const item = items[index];
                    items.splice(index, 1);

                    // Delete from Firestore if item has Firebase ID
                    if (item.firebaseId) {
                        await firebaseDeleteDocument('items', item.firebaseId);
                    }

                    console.log('✅ Item deleted:', itemId);
                }
            } catch (error) {
                console.error('Error deleting item:', error);
            }
        }

        // Save and refresh
        saveData();
        showToast(`✅ ${selectedAdminItems.length} item(s) deleted successfully`, 'success');
        selectedAdminItems = [];
        loadAdminItems();
        updateAdminDashboard();
    }
}

// User Management Functions
function loadAdminUsers() {
    try {
        const searchTerm = document.getElementById('adminUserSearch') ? document.getElementById('adminUserSearch').value.toLowerCase() : '';
        const list = document.getElementById('adminUsersList');
        if (!list) {
            console.warn('⚠️ Admin users list container not found');
            return;
        }

        // ✅ FIX: Filter out admins and ensure we have users
        let filteredUsers = users.filter(u => {
            if (!u || !u.role) return false; // Skip invalid users
            if (u.role === 'admin') return false; // Skip admins

            const matchesSearch = !searchTerm ||
                (u.name && u.name.toLowerCase().includes(searchTerm)) ||
                (u.email && u.email.toLowerCase().includes(searchTerm)) ||
                (u.phone && u.phone && u.phone.includes(searchTerm));
            return matchesSearch;
        });

        console.log(`📋 Loading admin users: Found ${filteredUsers.length} non-admin users (${users.length} total users)`);

        if (filteredUsers.length === 0) {
            list.innerHTML = '<p style="text-align: center; padding: 20px; color: var(--text-secondary);">No users found</p>';
            return;
        }

        selectedAdminUsers = [];

        const usersList = filteredUsers.map(user => {
            const userItems = items.filter(i => i.userId === user.id);
            const lastLogin = user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never logged in';
            const loginCount = user.loginHistory ? user.loginHistory.length : 0;

            return `
                <div style="background: var(--bg-secondary); padding: 15px; border-radius: 8px; margin-bottom: 12px; display: flex; gap: 15px; align-items: flex-start;">
                    <div style="display: flex; align-items: center; margin-top: 5px;">
                        <input type="checkbox" class="admin-user-checkbox" data-user-id="${user.id}" 
                            style="width: 18px; height: 18px; cursor: pointer;"
                            onchange="toggleAdminUserSelection('${user.id}', this.checked)">
                    </div>
                    <div style="cursor: pointer; flex: 1;" onclick="viewAdminUserDetail('${user.id}')">
                        <div style="font-weight: 600; margin-bottom: 5px; color: var(--primary);">${user.name || 'N/A'}</div>
                        <div style="font-size: 13px; color: var(--text-muted);">
                            <strong>Email:</strong> ${user.email || 'N/A'} | <strong>Phone:</strong> ${user.phone || 'N/A'}
                        </div>
                        <div style="font-size: 13px; color: var(--text-muted);">
                            <strong>Role:</strong> ${user.role || 'N/A'} | <strong>Items:</strong> ${userItems.length}
                        </div>
                        <div style="font-size: 12px; color: var(--primary); margin-top: 8px;"><strong>Last Login:</strong> ${lastLogin} | <strong>Total Logins:</strong> ${loginCount}</div>
                    </div>
                    <div style="display: flex; gap: 8px; flex-shrink: 0;">
                        <button class="btn btn-info btn-sm" onclick="viewAdminUserLoginHistory('${user.id}')" title="View login history"><i class="fas fa-history"></i> History</button>
                        <button class="btn btn-danger btn-sm" onclick="adminDeleteUser('${user.id}')">Delete</button>
                    </div>
                </div>
            `;
        }).join('');

        const hasSelection = selectedAdminUsers.length > 0;
        const bulkActions = `
            <div style="margin-bottom: 20px; display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                    <input type="checkbox" id="selectAllUsersCheckbox" 
                        style="width: 18px; height: 18px; cursor: pointer;"
                        onchange="toggleSelectAllAdminUsers(this.checked)">
                    <span style="color: var(--text-secondary); font-size: 14px;">Select All (${filteredUsers.length})</span>
                </label>
                <div style="display: flex; gap: 10px; align-items: center;">
                    <p style="margin: 0; color: var(--text-secondary); font-size: 14px;">
                        Selected: <strong id="adminUsersCountDisplay">0</strong>
                    </p>
                    <button onclick="deleteSelectedAdminUsers()" class="btn btn-danger" ${!hasSelection ? 'style="opacity: 0.5; cursor: not-allowed;" disabled' : ''} title="Delete all selected users">
                        <i class="fas fa-trash"></i> Delete Selected
                    </button>
                </div>
            </div>
        `;

        list.innerHTML = bulkActions + usersList;
    } catch (error) {
        console.error('❌ Error loading admin users:', error);
        const list = document.getElementById('adminUsersList');
        if (list) {
            list.innerHTML = '<p style="text-align: center; padding: 20px; color: red;">Error loading users: ' + error.message + '</p>';
        }
    }
}

function toggleAdminUserSelection(userId, isChecked) {
    try {
        // ✅ FIX: Ensure userId is properly converted
        const id = typeof userId === 'string' ? userId : String(userId);

        if (isChecked) {
            if (!selectedAdminUsers.includes(id)) {
                selectedAdminUsers.push(id);
            }
        } else {
            selectedAdminUsers = selectedAdminUsers.filter(uid => uid !== id);
            const selectAllCheckbox = document.getElementById('selectAllUsersCheckbox');
            if (selectAllCheckbox) selectAllCheckbox.checked = false;
        }
        updateAdminUsersCount();
    } catch (error) {
        console.error('❌ Error toggling user selection:', error);
    }
}

function toggleSelectAllAdminUsers(isChecked) {
    const checkboxes = document.querySelectorAll('.admin-user-checkbox');
    const usersInList = Array.from(checkboxes).map(cb => parseInt(cb.dataset.userId));

    if (isChecked) {
        selectedAdminUsers = [...new Set([...selectedAdminUsers, ...usersInList])];
        checkboxes.forEach(cb => cb.checked = true);
    } else {
        selectedAdminUsers = selectedAdminUsers.filter(id => !usersInList.includes(id));
        checkboxes.forEach(cb => cb.checked = false);
    }
    updateAdminUsersCount();
}

function updateAdminUsersCount() {
    const countDisplay = document.getElementById('adminUsersCountDisplay');
    const deleteBtn = document.querySelector('button[onclick="deleteSelectedAdminUsers()"]');

    if (countDisplay) countDisplay.textContent = selectedAdminUsers.length;
    if (deleteBtn) {
        if (selectedAdminUsers.length > 0) {
            deleteBtn.style.opacity = '1';
            deleteBtn.disabled = false;
        } else {
            deleteBtn.style.opacity = '0.5';
            deleteBtn.disabled = true;
        }
    }
}

async function deleteSelectedAdminUsers() {
    try {
        if (selectedAdminUsers.length === 0) {
            showToast('Please select users to delete', 'warning');
            return;
        }

        const confirmDelete = confirm(`Are you sure you want to delete ${selectedAdminUsers.length} user(s) and all their items? This action cannot be undone.`);
        if (!confirmDelete) return;

        showToast('Deleting users...', 'info');

        // Delete each user
        for (const userId of selectedAdminUsers) {
            try {
                // Delete user's items first
                const userItems = items.filter(i => i.userId === userId);
                items = items.filter(i => i.userId !== userId);

                // Delete user
                users = users.filter(u => u.id !== userId && u.uid !== userId);

                // Delete from Firebase if Firebase is ready
                if (isFirebaseReady()) {
                    // Delete user's items from Firebase
                    for (const item of userItems) {
                        if (item.firebaseId) {
                            try {
                                await firebaseDeleteDocument('items', item.firebaseId);
                            } catch (err) {
                                console.warn('Could not delete item from Firebase:', err);
                            }
                        }
                    }

                    // Delete user from Firebase
                    try {
                        await firebaseDeleteDocument('users', userId);
                    } catch (err) {
                        console.warn('Could not delete user from Firebase:', err);
                    }
                }

                console.log(`✅ Deleted user: ${userId}`);
            } catch (error) {
                console.error(`Error deleting user ${userId}:`, error);
            }
        }

        // Save and refresh
        saveData();
        showToast(`✅ ${selectedAdminUsers.length} user(s) deleted successfully`, 'success');
        selectedAdminUsers = [];
        loadAdminUsers();
        updateAdminDashboard();
    } catch (error) {
        console.error('❌ Error deleting users:', error);
        showToast('Error deleting users: ' + error.message, 'error');
    }
}

async function adminDeleteItem(itemId) {
    if (confirm('Are you sure you want to delete this item?')) {
        try {
            // Delete from local array
            const index = items.findIndex(i => i.id === itemId);
            if (index !== -1) {
                const item = items[index];
                items.splice(index, 1);

                // Delete from Firestore if item has Firebase ID
                if (item.firebaseId) {
                    await firebaseDeleteDocument('items', item.firebaseId);
                }

                // Save and refresh
                saveData();
                showToast('✅ Item deleted successfully', 'success');
                loadAdminItems();
                updateAdminDashboard();
            } else {
                showToast('❌ Item not found', 'error');
            }
        } catch (error) {
            console.error('Error deleting item:', error);
            showToast('❌ Error deleting item: ' + error.message, 'error');
        }
    }
}

async function adminDeleteUser(userId) {
    try {
        const user = users.find(u => u.id === userId || u.uid === userId);
        if (!user) {
            showToast('User not found', 'error');
            return;
        }

        const confirmDelete = confirm(`Are you sure you want to delete user "${user.name}"? All their items will be deleted too.`);
        if (!confirmDelete) return;

        showToast('Deleting user...', 'info');

        // Get user's items
        const userItems = items.filter(i => i.userId === userId);

        // Delete items from local array
        items = items.filter(i => i.userId !== userId);

        // Delete user from local array
        users = users.filter(u => u.id !== userId && u.uid !== userId);

        // Delete from Firebase if available
        if (isFirebaseReady()) {
            // Delete user's items from Firebase
            for (const item of userItems) {
                if (item.firebaseId) {
                    try {
                        await firebaseDeleteDocument('items', item.firebaseId);
                    } catch (err) {
                        console.warn('Could not delete item from Firebase:', err);
                    }
                }
            }

            // Delete user from Firebase
            try {
                await firebaseDeleteDocument('users', userId);
            } catch (err) {
                console.warn('Could not delete user from Firebase:', err);
            }
        }

        // Save changes
        saveData();
        showToast('User and their items deleted successfully!', 'success');
        loadAdminUsers();
        updateAdminDashboard();
    } catch (error) {
        console.error('❌ Error deleting user:', error);
        showToast('Error deleting user: ' + error.message, 'error');
    }
}

function switchAdminTab(tabName) {
    document.getElementById('adminDashboard').style.display = 'none';
    document.getElementById('adminItemsSection').style.display = 'none';
    document.getElementById('adminResolvedSection').style.display = 'none';
    document.getElementById('adminUsersSection').style.display = 'none';
    document.getElementById('adminReportsSection').style.display = 'none';

    document.querySelectorAll('.admin-nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    if (event && event.target) {
        event.target.classList.add('active');
    }

    if (tabName === 'dashboard') {
        document.getElementById('adminDashboard').style.display = 'block';
        // Display advanced analytics
        if (typeof displayAdvancedAnalytics === 'function') {
            setTimeout(() => displayAdvancedAnalytics(), 100);
        }
    } else if (tabName === 'items') {
        document.getElementById('adminItemsSection').style.display = 'block';
        loadAdminItems();
    } else if (tabName === 'resolved') {
        document.getElementById('adminResolvedSection').style.display = 'block';
        loadAdminResolvedItems();
    } else if (tabName === 'users') {
        document.getElementById('adminUsersSection').style.display = 'block';
    } else if (tabName === 'reports') {
        document.getElementById('adminReportsSection').style.display = 'block';
        // Display audit logs
        if (typeof displayAuditLogs === 'function') {
            setTimeout(() => displayAuditLogs(), 100);
        }
        loadAdminReports();
    }
}

function viewAdminUserLoginHistory(userId) {
    try {
        // ✅ FIX: Properly find user by ID (handle both string and number IDs)
        const user = users.find(u => u.id === userId || u.uid === userId || String(u.id) === String(userId));
        if (!user) {
            showToast('User not found', 'error');
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content modal-large">
                <div class="modal-header">
                    <h2><i class="fas fa-history"></i> ${user.name} - Login History</h2>
                    <button class="close-btn" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div style="padding: 20px;">
                    <div style="margin-bottom: 20px; padding: 15px; background: var(--bg-card); border-radius: 6px; display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div>
                            <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 5px;"><i class="fas fa-sign-in-alt"></i> Total Logins</div>
                            <div style="font-size: 28px; font-weight: bold; color: var(--primary);">${user.loginHistory ? user.loginHistory.length : 0}</div>
                        </div>
                        <div>
                            <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 5px;"><i class="fas fa-clock"></i> Last Login</div>
                            <div style="font-size: 14px; color: var(--primary);">${user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}</div>
                        </div>
                    </div>
                    ${user.loginHistory && user.loginHistory.length > 0 ? `
                        <div style="max-height: 500px; overflow-y: auto; border: 1px solid var(--border); border-radius: 6px;">
                            <table style="width: 100%; border-collapse: collapse;">
                                <thead style="background: var(--bg-secondary); position: sticky; top: 0;">
                                    <tr>
                                        <th style="padding: 12px; text-align: left; border-bottom: 1px solid var(--border);">#</th>
                                        <th style="padding: 12px; text-align: left; border-bottom: 1px solid var(--border);">Date & Time</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${[...user.loginHistory].reverse().map((login, index) => `
                                        <tr style="border-bottom: 1px solid var(--border);">
                                            <td style="padding: 12px;"><strong>${user.loginHistory.length - index}</strong></td>
                                            <td style="padding: 12px;">${typeof login === 'string' ? login : new Date(login).toLocaleString()}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    ` : '<p style="text-align: center; color: var(--text-muted); padding: 40px 20px;"><i class="fas fa-info-circle"></i> No login history available</p>'}
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    } catch (error) {
        console.error('❌ Error viewing login history:', error);
        showToast('Error loading login history: ' + error.message, 'error');
    }
}

function viewAdminItemDetail(itemId) {
    const item = items.find(i => i.id === itemId);
    const user = users.find(u => u.id === item.userId);
    // ✅ FIX: Fallback to stored item data if user lookup fails
    const reporterName = user ? user.name : (item.userName || 'Unknown User');
    const reporterEmail = user ? user.email : (item.userEmail || 'not provided');
    const reporterPhone = user ? user.phone : (item.userPhone || 'not provided');
    const reporterRole = user ? user.role : (item.userRole || 'user');

    if (!item) return;

    const socialMediaHTML = item.socialMedia && (item.socialMedia.facebook || item.socialMedia.twitter || item.socialMedia.instagram || item.socialMedia.linkedin || item.socialMedia.whatsapp) ? `
        <div style="border-top: 1px solid var(--border); padding-top: 15px; margin-top: 15px;">
            <strong>Social Media Information:</strong>
            <div style="margin-top: 10px; font-size: 14px;">
                ${item.socialMedia.facebook ? `<div style="margin-bottom: 8px;"><strong>Facebook:</strong> ${item.socialMedia.facebook}</div>` : ''}
                ${item.socialMedia.twitter ? `<div style="margin-bottom: 8px;"><strong>Twitter:</strong> ${item.socialMedia.twitter}</div>` : ''}
                ${item.socialMedia.instagram ? `<div style="margin-bottom: 8px;"><strong>Instagram:</strong> ${item.socialMedia.instagram}</div>` : ''}
                ${item.socialMedia.linkedin ? `<div style="margin-bottom: 8px;"><strong>LinkedIn:</strong> ${item.socialMedia.linkedin}</div>` : ''}
                ${item.socialMedia.whatsapp ? `<div style="margin-bottom: 8px;"><strong>WhatsApp:</strong> ${item.socialMedia.whatsapp}</div>` : ''}
            </div>
        </div>
    ` : '';

    document.getElementById('adminItemDetailContent').innerHTML = `
        <div style="margin-bottom: 20px;">
            <img src="${getItemImage(item)}" alt="${item.title}" style="width: 100%; height: 300px; object-fit: cover; border-radius: 8px;" onerror="this.src='../assets/lost-found/placeholder.svg'">
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
            <div>
                <h3 style="margin-bottom: 10px;">Item Information</h3>
                <div style="background: var(--bg-secondary); padding: 15px; border-radius: 8px;">
                    <div style="margin-bottom: 12px;">
                        <strong>Title:</strong>
                        <p>${item.title}</p>
                    </div>
                    <div style="margin-bottom: 12px;">
                        <strong>Category:</strong>
                        <p>${item.category}</p>
                    </div>
                    <div style="margin-bottom: 12px;">
                        <strong>Status:</strong>
                        <p><span class="badge badge-${item.status}">${item.status === 'lost' ? 'Lost' : 'Found'}</span></p>
                    </div>
                    <div style="margin-bottom: 12px;">
                        <strong>Location:</strong>
                        <p>${item.location}</p>
                    </div>
                    <div style="margin-bottom: 12px;">
                        <strong>Date:</strong>
                        <p>${formatDate(item.date)}</p>
                    </div>
                </div>
            </div>
            <div>
                <h3 style="margin-bottom: 10px;">Reporter Information</h3>
                <div style="background: var(--bg-secondary); padding: 15px; border-radius: 8px;">
                    <div style="margin-bottom: 12px;">
                        <strong>Name:</strong>
                        <p>${reporterName}</p>
                    </div>
                    <div style="margin-bottom: 12px;">
                        <strong>Email:</strong>
                        <p><a href="mailto:${reporterEmail}">${reporterEmail}</a></p>
                    </div>
                    <div style="margin-bottom: 12px;">
                        <strong>Phone:</strong>
                        <p><a href="tel:${reporterPhone}">${reporterPhone}</a></p>
                    </div>
                    <div style="margin-bottom: 12px;">
                        <strong>Role:</strong>
                        <p style="text-transform: capitalize;">${reporterRole}</p>
                    </div>
                </div>
            </div>
        </div>
        
        <div style="background: var(--bg-secondary); padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="margin-bottom: 10px;">Description</h3>
            <p>${item.description}</p>
        </div>
        
        ${socialMediaHTML}
    `;

    document.getElementById('adminItemDetailModal').classList.add('active');
}

function closeAdminItemDetail() {
    document.getElementById('adminItemDetailModal').classList.remove('active');
}

function viewAdminUserDetail(userId) {
    try {
        // ✅ FIX: Properly find user by ID (handle both string and number IDs)
        const user = users.find(u => u.id === userId || u.uid === userId || String(u.id) === String(userId));
        const userItems = items.filter(i => i.userId === userId || String(i.userId) === String(userId));
        const lostItems = userItems.filter(i => i.status === 'lost');
        const foundItems = userItems.filter(i => i.status === 'found');
        const resolvedItems = userItems.filter(i => i.resolved);

        if (!user) {
            showToast('User not found', 'error');
            return;
        }

        const itemsListHTML = userItems.length === 0 ?
            '<p style="color: var(--text-muted);">No items reported</p>' :
            userItems.map(item => `
                <div style="background: var(--bg-secondary); padding: 10px; margin-bottom: 8px; border-radius: 6px; cursor: pointer;" onclick="viewAdminItemDetail(${item.id})">
                    <strong style="color: var(--primary);">${item.title}</strong>
                    <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">
                        <span class="badge badge-${item.status}" style="margin-right: 5px;">${item.status}</span>
                        ${item.resolved ? '<span class="badge badge-resolved">Resolved</span>' : ''}
                    </div>
                </div>
            `).join('');

        document.getElementById('adminUserDetailContent').innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                <div>
                    <h3 style="margin-bottom: 10px;">User Information</h3>
                    <div style="background: var(--bg-secondary); padding: 15px; border-radius: 8px;">
                        <div style="margin-bottom: 12px;">
                            <strong>Name:</strong>
                            <p>${user.name || 'N/A'}</p>
                        </div>
                        <div style="margin-bottom: 12px;">
                            <strong>Email:</strong>
                            <p><a href="mailto:${user.email}">${user.email || 'N/A'}</a></p>
                        </div>
                        <div style="margin-bottom: 12px;">
                            <strong>Phone:</strong>
                            <p><a href="tel:${user.phone}">${user.phone || 'N/A'}</a></p>
                        </div>
                        <div style="margin-bottom: 12px;">
                            <strong>Role:</strong>
                            <p style="text-transform: capitalize;">${user.role || 'N/A'}</p>
                        </div>
                    </div>
                </div>
                <div>
                    <h3 style="margin-bottom: 10px;">Activity Statistics</h3>
                    <div style="background: var(--bg-secondary); padding: 15px; border-radius: 8px;">
                        <div style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
                            <strong>Total Items:</strong>
                            <span style="background: var(--primary); color: white; padding: 5px 10px; border-radius: 20px; font-size: 14px;">${userItems.length}</span>
                        </div>
                        <div style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
                            <strong>Lost Items:</strong>
                            <span style="background: #ef4444; color: white; padding: 5px 10px; border-radius: 20px; font-size: 14px;">${lostItems.length}</span>
                        </div>
                        <div style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
                            <strong>Found Items:</strong>
                            <span style="background: #10b981; color: white; padding: 5px 10px; border-radius: 20px; font-size: 14px;">${foundItems.length}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <strong>Resolved Items:</strong>
                            <span style="background: #3b82f6; color: white; padding: 5px 10px; border-radius: 20px; font-size: 14px;">${resolvedItems.length}</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <h3 style="margin-bottom: 10px;">Items Reported by ${user.name}</h3>
            <div>
                ${itemsListHTML}
            </div>
        `;

        document.getElementById('adminUserDetailModal').classList.add('active');
    } catch (error) {
        console.error('❌ Error viewing user details:', error);
        showToast('Error loading user details: ' + error.message, 'error');
    }
}

function closeAdminUserDetail() {
    document.getElementById('adminUserDetailModal').classList.remove('active');
}

// Admin Export Functions
function exportUsersAsCSV() {
    let csv = 'ID,Name,Email,Phone,Role,Total Items\n';

    users.filter(u => u.role !== 'admin').forEach(user => {
        const userItems = items.filter(i => i.userId === user.id);
        csv += `${user.id},"${user.name}","${user.email}","${user.phone}","${user.role}",${userItems.length}\n`;
    });

    downloadFile(csv, 'users_export.csv', 'text/csv');
}

function exportAnalyticsReport() {
    let report = 'CAMPUS LOST & FOUND - ANALYTICS REPORT\n';
    report += `Generated: ${new Date().toLocaleString()}\n\n`;

    const lostItems = items.filter(i => i.status === 'lost');
    const foundItems = items.filter(i => i.status === 'found');
    const resolvedItems = items.filter(i => i.resolved);
    const matchedItems = items.filter(i => i.matched);

    report += '=== SYSTEM STATISTICS ===\n';
    report += `Total Lost Items: ${lostItems.length}\n`;
    report += `Total Found Items: ${foundItems.length}\n`;
    report += `Total Resolved: ${resolvedItems.length}\n`;
    report += `Total Matched: ${matchedItems.length}\n`;
    report += `Total Users: ${users.filter(u => u.role !== 'admin').length}\n`;
    report += `Total Items: ${items.length}\n\n`;

    report += '=== ITEMS BY CATEGORY ===\n';
    const categories = [...new Set(items.map(i => i.category))];
    categories.forEach(cat => {
        const count = items.filter(i => i.category === cat).length;
        report += `${cat}: ${count}\n`;
    });

    report += '\n=== TOP REPORTERS ===\n';
    const userReports = {};
    users.forEach(user => {
        const count = items.filter(i => i.userId === user.id).length;
        if (count > 0) userReports[user.name] = count;
    });
    Object.entries(userReports).sort((a, b) => b[1] - a[1]).slice(0, 10).forEach(([name, count]) => {
        report += `${name}: ${count} items\n`;
    });

    downloadFile(report, 'analytics_report.txt', 'text/plain');
}

// Missing function - exports all active items to CSV
function exportItemsAsCSV() {
    if (items.length === 0) {
        showToast('No items to export', 'warning');
        return;
    }

    let csv = 'Title,Category,Type,Posted By,Date Posted,Location,Status,Description\n';

    items.forEach(item => {
        const type = item.status === 'lost' ? 'Lost' : 'Found';
        const user = users.find(u => u.id === item.userId);
        // ✅ FIX: Fallback to stored userName if user lookup fails
        const userName = user ? user.name : (item.userName || 'Unknown');
        const datePosted = new Date(item.date).toLocaleDateString();

        csv += `"${item.title}","${item.category}","${type}","${userName}","${datePosted}","${item.location}","${item.resolved ? 'Resolved' : 'Active'}","${item.description}"\n`;
    });

    downloadFile(csv, 'items_export.csv', 'text/csv');
}

function logoutAdmin() {
    try {
        console.log('🚪 Admin logout initiated');

        // Clear all auth data
        currentUser = null;
        localStorage.removeItem('currentUser');
        localStorage.removeItem('authToken');
        localStorage.removeItem('authUser');

        // Clear any other auth-related storage
        Object.keys(localStorage).forEach(key => {
            if (key.includes('auth') || key.includes('user') || key.includes('token')) {
                localStorage.removeItem(key);
            }
        });

        // Clear session storage
        sessionStorage.clear();

        // Hide admin page and show login
        const adminPage = document.getElementById('adminPage');
        const appPage = document.getElementById('appPage');
        if (adminPage) adminPage.classList.remove('active');
        if (appPage) appPage.classList.remove('active');

        if (typeof showLogin === 'function') {
            showLogin();
        }

        if (typeof showToast === 'function') {
            showToast('Admin logged out successfully', 'success');
        }

        console.log('✅ Admin logout complete');
    } catch (error) {
        console.error('❌ Admin logout error:', error);
        if (typeof showToast === 'function') {
            showToast('Error during logout: ' + error.message, 'error');
        }
    }
}

function toggleAdminUserDropdown() {
    document.getElementById('adminUserDropdown').classList.toggle('active');
}

// ========== RESOLVED ITEMS FUNCTIONS ==========

/**
 * Loads and displays resolved items in admin panel
 */
function loadAdminResolvedItems() {
    const searchTerm = document.getElementById('adminResolvedSearch') ? document.getElementById('adminResolvedSearch').value.toLowerCase() : '';
    const statusFilter = document.getElementById('adminResolvedStatusFilter') ? document.getElementById('adminResolvedStatusFilter').value : '';

    let filteredItems = items.filter(item => {
        const matchesSearch = !searchTerm ||
            item.title.toLowerCase().includes(searchTerm) ||
            item.location.toLowerCase().includes(searchTerm) ||
            item.category.toLowerCase().includes(searchTerm);
        const matchesStatus = !statusFilter || item.status === statusFilter;
        const isResolved = item.resolved;

        return matchesSearch && matchesStatus && isResolved;
    });

    const tbody = document.getElementById('adminResolvedTable');
    if (!tbody) return;

    if (filteredItems.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 20px; color: var(--text-secondary);">No resolved items found</td></tr>';
        return;
    }

    tbody.innerHTML = filteredItems.map(item => {
        const datePosted = new Date(item.datePosted).toLocaleDateString();
        const resolvedDate = item.resolvedDate ? new Date(item.resolvedDate).toLocaleDateString() : 'N/A';
        const isSelected = selectedResolvedItems.includes(item.id);

        return `
            <tr style="border-bottom: 1px solid var(--border);">
                <td style="padding: 15px; text-align: center;">
                    <input type="checkbox" class="resolvedItemCheckbox" value="${item.id}" ${isSelected ? 'checked' : ''}
                        onchange="updateResolvedItemsSelection()">
                </td>
                <td style="padding: 15px;">${item.title}</td>
                <td style="padding: 15px;">${item.category}</td>
                <td style="padding: 15px;">
                    <span style="background: ${item.status === 'lost' ? '#fef3c7' : '#d1fae5'}; color: ${item.status === 'lost' ? '#92400e' : '#065f46'}; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500;">
                        ${item.status === 'lost' ? 'Lost' : 'Found'}
                    </span>
                </td>
                <td style="padding: 15px;">${item.reportedBy || item.userName || 'Unknown'}</td>
                <td style="padding: 15px;">${datePosted}</td>
                <td style="padding: 15px;">${resolvedDate}</td>
                <td style="padding: 15px;">
                    <button onclick="viewAdminItemDetail(${item.id})" class="btn btn-primary" style="padding: 4px 8px; font-size: 12px;">
                        View
                    </button>
                </td>
                <td style="padding: 15px;">
                    <button onclick="deleteResolvedItem(${item.id})" class="btn btn-danger" style="padding: 4px 8px; font-size: 12px;">
                        Delete
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Updates the selection of resolved items and enables/disables bulk actions
 */
function updateResolvedItemsSelection() {
    selectedResolvedItems = [];
    document.querySelectorAll('.resolvedItemCheckbox:checked').forEach(checkbox => {
        selectedResolvedItems.push(parseInt(checkbox.value));
    });

    const count = selectedResolvedItems.length;
    document.getElementById('resolvedItemsCountDisplay').textContent = count;

    const unresolveBtn = document.querySelector('button[onclick="unresolveSelectedItems()"]');
    const deleteBtn = document.querySelector('button[onclick="deleteSelectedResolvedItems()"]');

    if (count > 0) {
        unresolveBtn.style.opacity = '1';
        unresolveBtn.style.cursor = 'pointer';
        unresolveBtn.disabled = false;
        deleteBtn.style.opacity = '1';
        deleteBtn.style.cursor = 'pointer';
        deleteBtn.disabled = false;
    } else {
        unresolveBtn.style.opacity = '0.5';
        unresolveBtn.style.cursor = 'not-allowed';
        unresolveBtn.disabled = true;
        deleteBtn.style.opacity = '0.5';
        deleteBtn.style.cursor = 'not-allowed';
        deleteBtn.disabled = true;
    }
}

/**
 * Toggles selection of all resolved items
 */
function toggleSelectAllResolvedItems(checked) {
    document.querySelectorAll('.resolvedItemCheckbox').forEach(checkbox => {
        checkbox.checked = checked;
    });
    updateResolvedItemsSelection();
}

/**
 * Marks selected resolved items as unresolved
 */
function unresolveSelectedItems() {
    try {
        if (selectedResolvedItems.length === 0) {
            showToast('Please select items to unresolved', 'warning');
            return;
        }

        if (confirm(`Are you sure you want to mark ${selectedResolvedItems.length} item(s) as unresolved?`)) {
            let unresolvedCount = 0;

            selectedResolvedItems.forEach(itemId => {
                const item = items.find(i => i.id === itemId);
                if (item) {
                    item.resolved = false;
                    item.resolvedDate = null;
                    unresolvedCount++;
                }
            });

            // Save to both localStorage and Firebase
            saveData();

            showToast(`✅ ${unresolvedCount} item(s) marked as unresolved`, 'success');
            selectedResolvedItems = [];
            loadAdminResolvedItems();
            updateAdminDashboard();
        }
    } catch (error) {
        console.error('❌ Error unresolving items:', error);
        showToast('Error unresolving items: ' + error.message, 'error');
    }
}

/**
 * Deletes selected resolved items
 */
async function deleteSelectedResolvedItems() {
    try {
        if (selectedResolvedItems.length === 0) {
            showToast('Please select items to delete', 'warning');
            return;
        }

        if (confirm(`Are you sure you want to delete ${selectedResolvedItems.length} resolved item(s)? This action cannot be undone.`)) {
            showToast('Deleting items...', 'info');

            // Delete each item
            for (const itemId of selectedResolvedItems) {
                try {
                    const item = items.find(i => i.id === itemId);
                    if (item) {
                        // Delete from Firebase if available
                        if (isFirebaseReady() && item.firebaseId) {
                            try {
                                await firebaseDeleteDocument('items', item.firebaseId);
                            } catch (err) {
                                console.warn('Could not delete item from Firebase:', err);
                            }
                        }
                    }
                } catch (error) {
                    console.error(`Error deleting item ${itemId}:`, error);
                }
            }

            // Remove from local array
            items = items.filter(item => !selectedResolvedItems.includes(item.id));

            // Save changes
            saveData();

            showToast(`✅ ${selectedResolvedItems.length} item(s) deleted successfully`, 'success');
            selectedResolvedItems = [];
            loadAdminResolvedItems();
            updateAdminDashboard();
        }
    } catch (error) {
        console.error('❌ Error deleting items:', error);
        showToast('Error deleting items: ' + error.message, 'error');
    }
}

/**
 * Deletes a single resolved item
 */
async function deleteResolvedItem(itemId) {
    try {
        if (!confirm('Are you sure you want to delete this resolved item?')) return;

        const item = items.find(i => i.id === itemId);
        if (!item) {
            showToast('Item not found', 'error');
            return;
        }

        showToast('Deleting item...', 'info');

        // Delete from Firebase if available
        if (isFirebaseReady() && item.firebaseId) {
            try {
                await firebaseDeleteDocument('items', item.firebaseId);
            } catch (err) {
                console.warn('Could not delete item from Firebase:', err);
            }
        }

        // Remove from local array
        items = items.filter(i => i.id !== itemId);

        // Save changes
        saveData();

        showToast('✅ Item deleted successfully', 'success');
        loadAdminResolvedItems();
        updateAdminDashboard();
    } catch (error) {
        console.error('❌ Error deleting item:', error);
        showToast('Error deleting item: ' + error.message, 'error');
    }
}

/**
 * Exports resolved items as CSV
 */
function exportResolvedItemsAsCSV() {
    const resolvedItems = items.filter(item => item.resolved);

    if (resolvedItems.length === 0) {
        showToast('No resolved items to export', 'warning');
        return;
    }

    let csv = 'Title,Category,Type,Posted By,Date Posted,Resolved Date,Location,Description\n';

    resolvedItems.forEach(item => {
        const datePosted = new Date(item.datePosted).toLocaleDateString();
        const resolvedDate = item.resolvedDate ? new Date(item.resolvedDate).toLocaleDateString() : 'N/A';
        const type = item.status === 'lost' ? 'Lost' : 'Found';
        // ✅ FIX: Fallback to stored userName if reportedBy is missing
        const userName = item.reportedBy || item.userName || 'Unknown';

        csv += `"${item.title}","${item.category}","${type}","${userName}","${datePosted}","${resolvedDate}","${item.location}","${item.description}"\n`;
    });

    downloadFile(csv, 'resolved_items.csv', 'text/csv');
}

// ========== ADMIN REPORTS FUNCTIONS ==========

/**
 * Loads and displays support feedback reports in admin panel
 */
function loadAdminReports() {
    const feedbackList = JSON.parse(localStorage.getItem('supportFeedback')) || [];
    const reportContainer = document.getElementById('adminReportsList');

    if (!reportContainer) return;

    if (feedbackList.length === 0) {
        reportContainer.innerHTML = '<p style="text-align: center; padding: 30px; color: var(--text-secondary);">No support feedback received yet</p>';
        return;
    }

    let html = '';
    feedbackList.forEach((feedback) => {
        const date = new Date(feedback.timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        const statusBadge = feedback.resolved
            ? '<span style="background: #4caf50; color: white; padding: 6px 12px; border-radius: 4px; font-size: 12px; font-weight: 500;">Resolved</span>'
            : '<span style="background: #ff9800; color: white; padding: 6px 12px; border-radius: 4px; font-size: 12px; font-weight: 500;">Pending</span>';

        html += `
            <div style="background: var(--card-bg); border: 1px solid var(--border); border-radius: 8px; padding: 16px; margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                    <div style="flex: 1;">
                        <h3 style="margin: 0 0 4px 0; color: var(--text-primary);">${feedback.subject}</h3>
                        <p style="margin: 0 0 4px 0; font-size: 13px; color: var(--text-secondary);">
                            <strong>${feedback.name}</strong> (${feedback.email})
                        </p>
                        <p style="margin: 0; font-size: 12px; color: var(--text-muted);">${date} • ${feedback.userRole}</p>
                    </div>
                    ${statusBadge}
                </div>
                <p style="margin: 12px 0; padding: 12px; background: var(--bg-secondary); border-left: 3px solid var(--primary); border-radius: 4px; color: var(--text-secondary); font-size: 14px; line-height: 1.6;">${feedback.message}</p>
                <div style="display: flex; gap: 8px; justify-content: flex-end;">
                    ${!feedback.resolved ? `<button onclick="markAdminFeedbackAsResolved(${feedback.id})" class="btn btn-success" style="padding: 6px 12px; font-size: 12px;">
                        Mark Resolved
                    </button>` : ''}
                    <button onclick="deleteAdminFeedback(${feedback.id})" class="btn btn-danger" style="padding: 6px 12px; font-size: 12px;">
                        Delete
                    </button>
                </div>
            </div>
        `;
    });

    reportContainer.innerHTML = html;
}

/**
 * Marks feedback as resolved from admin panel
 */
function markAdminFeedbackAsResolved(feedbackId) {
    let feedbackList = JSON.parse(localStorage.getItem('supportFeedback')) || [];
    const feedback = feedbackList.find(f => f.id === feedbackId);

    if (feedback) {
        feedback.resolved = true;
        localStorage.setItem('supportFeedback', JSON.stringify(feedbackList));
        showToast('Feedback marked as resolved', 'success');
        loadAdminReports();
    }
}

/**
 * Deletes feedback from admin panel
 */
function deleteAdminFeedback(feedbackId) {
    if (confirm('Are you sure you want to delete this feedback?')) {
        let feedbackList = JSON.parse(localStorage.getItem('supportFeedback')) || [];
        feedbackList = feedbackList.filter(f => f.id !== feedbackId);
        localStorage.setItem('supportFeedback', JSON.stringify(feedbackList));
        showToast('Feedback deleted successfully', 'success');
        loadAdminReports();
    }
}

// ========== DELETED ITEMS MANAGEMENT (ADMIN VIEW) ==========

/**
 * Show deleted items modal from admin panel
 * ✅ FIX: Call the deleted items function from user-panel.js or implement admin-specific version
 */
function showDeletedItems() {
    try {
        if (!deletedItems || !Array.isArray(deletedItems)) {
            console.error('❌ Deleted items array not available');
            showToast('Deleted items not available', 'error');
            return;
        }

        console.log(`📋 Loading ${deletedItems.length} deleted items for admin view`);

        const modal = document.getElementById('deletedItemsModal');
        const list = document.getElementById('deletedItemsList');

        if (!modal || !list) {
            console.error('❌ Deleted items modal elements not found in DOM');
            showToast('Deleted items UI not found', 'error');
            return;
        }

        selectedDeletedItems = [];

        if (deletedItems.length === 0) {
            list.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 20px;">No deleted items in trash</p>';
        } else {
            const itemsList = deletedItems.map(item => {
                const reportedBy = users.find(u => u.id === item.userId);
                // ✅ FIX: Fallback to stored userName if user lookup fails
                const reporterName = reportedBy ? reportedBy.name : (item.userName || 'Unknown User');

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
                                <p style="margin: 0 0 5px 0; font-size: 12px; color: var(--text-secondary);">
                                    <strong>Deleted:</strong> ${item.deletedAt ? new Date(item.deletedAt).toLocaleString() : 'Unknown'}
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
                        Total in trash: <strong>${deletedItems.length}</strong> items
                    </p>
                </div>
                ${itemsList}
            `;
        }

        modal.classList.add('active');
    } catch (error) {
        console.error('❌ Error showing deleted items:', error);
        showToast('Error loading deleted items: ' + error.message, 'error');
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
