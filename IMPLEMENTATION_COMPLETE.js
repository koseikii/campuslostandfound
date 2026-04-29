/**
 * ═══════════════════════════════════════════════════════════════════════════
 * COMPLETE IMPLEMENTATION GUIDE
 * Step-by-Step Guide to Fix All Issues and Implement Complete Solution
 * ═══════════════════════════════════════════════════════════════════════════
 */

console.log('📖 Implementation Guide Loaded');

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FIRESTORE DATABASE STRUCTURE
 * Create this structure in Firestore before deploying
 * ═══════════════════════════════════════════════════════════════════════════
 */

/*
FIRESTORE COLLECTIONS:

1. users/ (User profiles)
   ├── Document ID: Firebase Auth UID
   └── Fields:
       ├── uid: "abc123def456" (string)
       ├── email: "user@campus.edu" (string)
       ├── name: "John Doe" (string)
       ├── phone: "+639123456789" (string)
       ├── role: "student" | "teacher" | "staff" | "admin" (string)
       ├── avatar: "https://storage..." (string) [optional]
       ├── bio: "User bio" (string) [optional]
       ├── status: "active" | "inactive" | "banned" (string)
       ├── createdAt: Timestamp (server timestamp)
       ├── updatedAt: Timestamp (server timestamp)
       ├── lastLogin: Timestamp (server timestamp)
       ├── totalItems: 0 (number)
       ├── resolvedItems: 0 (number)
       ├── rating: 0 (number)
       └── notifications: { email: true, inApp: true } (object)

2. items/ (Lost and Found items)
   ├── Document ID: Auto-generated
   └── Fields:
       ├── title: "Lost iPhone 14" (string)
       ├── description: "Black iPhone 14 with..." (string)
       ├── status: "lost" | "found" (string)
       ├── category: "electronics" | "keys" | "etc" (string)
       ├── location: "Library" (string)
       ├── images: ["https://storage...", ...] (array)
       ├── thumbnail: "https://storage..." (string) [optional]
       ├── color: "black" (string) [optional]
       ├── brand: "Apple" (string) [optional]
       ├── itemCondition: "good" | "damaged" (string)
       ├── reward: "500 pesos" (string) [optional]
       ├── userId: "abc123def456" (string) - Reference to user
       ├── userEmail: "user@campus.edu" (string)
       ├── dateTime: "2024-01-15T10:30:00Z" (ISO string)
       ├── resolved: false (boolean)
       ├── matched: false (boolean)
       ├── matchedWith: null (string) [optional - itemId if matched]
       ├── createdAt: Timestamp (server timestamp)
       ├── updatedAt: Timestamp (server timestamp)
       ├── views: 0 (number)
       └── matches: ["item123", "item456"] (array) [matched item IDs]

3. deletedItems/ (Audit trail)
   ├── Document ID: Auto-generated
   └── Fields: [Same as items] plus:
       ├── deletedAt: Timestamp
       └── deletedBy: "userId"

4. auditLogs/ (Admin actions)
   ├── Document ID: Auto-generated
   └── Fields:
       ├── eventType: "login" | "role_change" | "password_change" (string)
       ├── userId: "abc123def456" (string)
       ├── email: "user@campus.edu" (string)
       ├── action: "description of action" (string)
       ├── changes: { from: "old", to: "new" } (object)
       ├── performedBy: "admin_id" (string)
       └── timestamp: Timestamp

5. notifications/ (User notifications)
   ├── Document ID: Auto-generated
   └── Fields:
       ├── userId: "abc123def456" (string)
       ├── title: "Item matched!" (string)
       ├── message: "Your lost item may have been found" (string)
       ├── type: "match" | "message" | "system" (string)
       ├── itemId: "item123" (string) [optional]
       ├── read: false (boolean)
       ├── createdAt: Timestamp
       └── expiresAt: Timestamp [30 days from creation]

6. messages/ (Direct messages between users)
   ├── Document ID: Auto-generated
   └── Fields:
       ├── senderId: "user_123" (string)
       ├── recipientId: "user_456" (string)
       ├── itemId: "item_123" (string) [context]
       ├── message: "I think I found your item!" (string)
       ├── createdAt: Timestamp
       └── read: false (boolean)
*/

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PART 1: SAVE ITEM WITH IMAGE - COMPLETE IMPLEMENTATION
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * HTML FORM STRUCTURE
 */
/*
<form id="createItemForm" onsubmit="handleCreateItemWithImages(event)">
    <input type="text" id="itemTitle" placeholder="Item title" required>
    <textarea id="itemDescription" placeholder="Description" required></textarea>
    
    <select id="itemStatus" required>
        <option value="lost">Lost</option>
        <option value="found">Found</option>
    </select>
    
    <select id="itemCategory" required>
        <option value="electronics">Electronics</option>
        <option value="keys">Keys</option>
        <option value="clothing">Clothing</option>
    </select>
    
    <input type="text" id="itemLocation" placeholder="Where?">
    <input type="file" id="itemImages" multiple accept="image/*" required>
    
    <button type="submit">Post Item</button>
</form>

<div id="uploadProgress" style="display:none;">
    <progress id="progressBar" max="100" value="0"></progress>
    <span id="progressText">0%</span>
</div>
*/

/**
 * JAVASCRIPT HANDLER
 */
async function handleCreateItemWithImages(event) {
    event.preventDefault();

    // Show loading
    showToast('📝 Creating item...', 'info');

    try {
        // 1. Get form data
        const itemData = {
            title: document.getElementById('itemTitle').value.trim(),
            description: document.getElementById('itemDescription').value.trim(),
            status: document.getElementById('itemStatus').value,
            category: document.getElementById('itemCategory').value,
            location: document.getElementById('itemLocation').value || 'Campus',
            dateTime: new Date().toISOString()
        };

        // 2. Validate
        if (!itemData.title || !itemData.description) {
            showToast('❌ Fill all required fields', 'error');
            return;
        }

        // 3. Create item in Firestore FIRST (get the itemId)
        console.log('📝 Creating item record...');
        const itemResult = await firestoreCreateItem(itemData);

        if (!itemResult.success) {
            showToast('❌ Failed to create item: ' + itemResult.error, 'error');
            return;
        }

        const itemId = itemResult.id;
        console.log('✅ Item created with ID:', itemId);

        // 4. Upload images to Storage
        const imageFiles = document.getElementById('itemImages').files;

        if (imageFiles && imageFiles.length > 0) {
            console.log('📤 Uploading images...');

            const uploadResult = await storageUploadItemImages(
                itemId,
                imageFiles,
                (progress) => {
                    // Update progress bar
                    const progressEl = document.getElementById('progressBar');
                    if (progressEl) {
                        progressEl.value = progress.percent;
                        document.getElementById('progressText').textContent = progress.percent + '%';
                    }
                }
            );

            if (uploadResult.success) {
                console.log('✅ Images uploaded:', uploadResult.urls);

                // 5. Update item with image URLs
                const updateResult = await firestoreUpdateItem(itemId, {
                    images: uploadResult.urls,
                    thumbnail: uploadResult.thumbnails[0] || uploadResult.urls[0]
                });

                if (updateResult.success) {
                    console.log('✅ Item updated with images');
                } else {
                    console.warn('⚠️ Could not update item with images');
                }
            } else {
                showToast('⚠️ Image upload failed: ' + uploadResult.message, 'warning');
            }
        }

        // 6. Success!
        showToast('✅ Item posted successfully!', 'success');

        // Clear form
        document.getElementById('createItemForm').reset();

        // Reload items list
        if (typeof loadAdminItems === 'function') {
            loadAdminItems();
        }

    } catch (error) {
        console.error('❌ Error:', error);
        showToast('❌ Error: ' + error.message, 'error');
    }
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PART 2: FIX USER ACCOUNT SYNC - AUTO-CREATE FIRESTORE DOCS
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * UPDATE index.html FORM HANDLERS TO USE NEW COMPLETE FUNCTIONS
 */
/*
CHANGE THIS:
<form id="signupForm" class="auth-form" onsubmit="handleSignup(event)">

TO THIS:
<form id="signupForm" class="auth-form" onsubmit="handleCompleteSignup(event)">

CHANGE THIS:
<form id="loginForm" class="auth-form active" onsubmit="handleLogin(event)">

TO THIS:
<form id="loginForm" class="auth-form active" onsubmit="handleCompleteLogin(event)">
*/

/**
 * NEW SIGNUP HANDLER
 */
async function handleCompleteSignup(event) {
    event.preventDefault();

    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const phone = document.getElementById('signupPhone').value.trim();
    const password = document.getElementById('signupPassword').value;
    const role = document.getElementById('signupRole')?.value || 'student';

    if (!name || !email || !phone || !password) {
        showToast('❌ Please fill all fields', 'error');
        return;
    }

    const btn = event.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';
    btn.disabled = true;

    try {
        // Use NEW complete signup that creates Firestore doc automatically
        const result = await authCompleteSignup(name, email, phone, password, role);

        btn.innerHTML = originalText;
        btn.disabled = false;

        if (result.success) {
            showToast('✅ Account created! Please login.', 'success');

            // Pre-fill login
            document.getElementById('loginEmail').value = email;
            document.getElementById('loginPassword').value = password;

            switchTab('login');
        } else {
            showToast('❌ ' + result.error, 'error');
        }
    } catch (error) {
        btn.innerHTML = originalText;
        btn.disabled = false;
        showToast('❌ Error: ' + error.message, 'error');
    }
}

/**
 * NEW LOGIN HANDLER WITH ACCOUNT LINKING VERIFICATION
 */
async function handleCompleteLogin(event) {
    event.preventDefault();

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
        showToast('❌ Email and password required', 'error');
        return;
    }

    const btn = event.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
    btn.disabled = true;

    try {
        // Use NEW complete login that verifies account linking
        const result = await authCompleteLogin(email, password);

        btn.innerHTML = originalText;
        btn.disabled = false;

        if (result.success) {
            currentUser = result.data;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));

            if (result.token) {
                localStorage.setItem('authToken', result.token);
            }

            showToast('✅ Login successful!', 'success');
            showApp();
        } else {
            showToast('❌ ' + result.error, 'error');
        }
    } catch (error) {
        btn.innerHTML = originalText;
        btn.disabled = false;
        showToast('❌ Error: ' + error.message, 'error');
    }
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PART 3: ADMIN DASHBOARD - FETCH AND DISPLAY ALL USERS
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * NEW HTML STRUCTURE FOR ADMIN USERS TABLE
 */
/*
<div id="adminUsersPanel">
    <h3>Registered Users</h3>
    
    <div class="search-filter">
        <input type="text" id="userSearchInput" placeholder="Search users..." 
               onkeyup="filterAdminUsers()">
        <select id="userRoleFilter" onchange="filterAdminUsers()">
            <option value="">All Roles</option>
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
        </select>
    </div>
    
    <table id="adminUsersTable" style="width:100%;">
        <thead>
            <tr>
                <th>Email</th>
                <th>Name</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created Date</th>
                <th>Items Posted</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody></tbody>
    </table>
    
    <div id="userLoadingSpinner" style="text-align:center; padding:20px; display:none;">
        <i class="fas fa-spinner fa-spin"></i> Loading users...
    </div>
</div>
*/

/**
 * LOAD ADMIN USERS - FETCH FROM FIRESTORE
 */
async function loadAdminUsers() {
    try {
        if (!authIsCurrentUserAdmin()) {
            console.warn('⚠️ Not admin, skipping user load');
            return;
        }

        console.log('📥 Loading users from Firestore...');

        const spinner = document.getElementById('userLoadingSpinner');
        if (spinner) spinner.style.display = 'block';

        // Fetch all users from Firestore
        const result = await firestoreGetAllUsers({ limit: 200 });

        if (spinner) spinner.style.display = 'none';

        if (result.success) {
            console.log(`✅ Loaded ${result.data.length} users`);
            renderAdminUsers(result.data);
        } else {
            console.error('❌ Failed to load users:', result.error);
            showToast('Failed to load users', 'error');
        }
    } catch (error) {
        console.error('❌ Error loading users:', error);
    }
}

/**
 * RENDER USERS IN ADMIN TABLE
 */
function renderAdminUsers(users) {
    const tbody = document.querySelector('#adminUsersTable tbody');
    if (!tbody) {
        console.warn('⚠️ Users table not found');
        return;
    }

    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:20px;">No users found</td></tr>';
        return;
    }

    tbody.innerHTML = users.map(user => `
        <tr>
            <td>${user.email}</td>
            <td>${user.name}</td>
            <td>
                <span class="badge badge-${user.role === 'admin' ? 'danger' : 'primary'}">
                    ${user.role}
                </span>
            </td>
            <td>
                <span class="badge badge-${user.status === 'active' ? 'success' : 'warning'}">
                    ${user.status}
                </span>
            </td>
            <td>${new Date(user.createdAt).toLocaleDateString()}</td>
            <td>${user.totalItems || 0}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="viewAdminUserProfile('${user.id}')">
                    View
                </button>
                ${authIsCurrentUserAdmin() ? `
                    <button class="btn btn-sm btn-warning" onclick="editAdminUser('${user.id}')">
                        Edit
                    </button>
                ` : ''}
            </td>
        </tr>
    `).join('');
}

/**
 * FILTER USERS BY SEARCH AND ROLE
 */
function filterAdminUsers() {
    const searchTerm = (document.getElementById('userSearchInput')?.value || '').toLowerCase();
    const roleFilter = document.getElementById('userRoleFilter')?.value || '';

    const rows = document.querySelectorAll('#adminUsersTable tbody tr');

    rows.forEach(row => {
        const email = row.cells[0].textContent.toLowerCase();
        const name = row.cells[1].textContent.toLowerCase();
        const role = row.cells[2].textContent.toLowerCase();

        const matchesSearch = !searchTerm || email.includes(searchTerm) || name.includes(searchTerm);
        const matchesRole = !roleFilter || role.includes(roleFilter);

        row.style.display = matchesSearch && matchesRole ? '' : 'none';
    });
}

/**
 * REAL-TIME LISTENER FOR ADMIN DASHBOARD
 * Updates users list automatically when changes occur
 */
let userListenerUnsubscribe = null;

function setupRealtimeUserListener() {
    if (!authIsCurrentUserAdmin()) return;

    console.log('🔄 Setting up real-time user listener...');

    userListenerUnsubscribe = firestoreListenToUsers((result) => {
        if (result.success) {
            console.log(`🔄 Users updated: ${result.data.length}`);
            renderAdminUsers(result.data);
        } else {
            console.error('❌ Listener error:', result.error);
        }
    });
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PART 4: CHANGE PASSWORD - SECURE IMPLEMENTATION
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * HTML FORM
 */
/*
<form id="changePasswordForm" onsubmit="handleChangePassword(event)">
    <div class="form-group">
        <label>Current Password</label>
        <input type="password" id="currentPassword" required>
    </div>
    
    <div class="form-group">
        <label>New Password</label>
        <input type="password" id="newPassword" required>
    </div>
    
    <div class="form-group">
        <label>Confirm Password</label>
        <input type="password" id="confirmPassword" required>
    </div>
    
    <button type="submit" class="btn btn-primary">Change Password</button>
</form>
*/

/**
 * HANDLER
 */
async function handleChangePassword(event) {
    event.preventDefault();

    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // Validate
    if (!currentPassword || !newPassword || !confirmPassword) {
        showToast('❌ All fields required', 'error');
        return;
    }

    if (newPassword !== confirmPassword) {
        showToast('❌ Passwords do not match', 'error');
        return;
    }

    if (newPassword.length < 6) {
        showToast('❌ New password must be at least 6 characters', 'error');
        return;
    }

    const btn = event.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
    btn.disabled = true;

    try {
        // Use secure password change function
        const result = await authChangePassword(currentPassword, newPassword);

        btn.innerHTML = originalText;
        btn.disabled = false;

        if (result.success) {
            showToast('✅ Password changed successfully!', 'success');
            document.getElementById('changePasswordForm').reset();
            // Optionally close modal
        } else {
            showToast('❌ ' + result.error, 'error');
        }
    } catch (error) {
        btn.innerHTML = originalText;
        btn.disabled = false;
        showToast('❌ Error: ' + error.message, 'error');
    }
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PART 5: ACCOUNT LINKING VERIFICATION
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * VERIFY ALL ACCOUNTS ON APP STARTUP
 * Fixes any orphaned users (Auth without Firestore docs)
 */
async function verifyAllAccountsOnStartup() {
    try {
        console.log('🔍 Verifying account linking on startup...');

        const authUser = firebaseGetCurrentUser();
        if (!authUser) {
            console.log('ℹ️ No logged in user to verify');
            return;
        }

        const result = await firestoreVerifyAccountLinking(authUser);

        if (result.success) {
            if (result.autoCreated) {
                showToast('✅ Your account profile was created', 'info');
                console.log('✅ Auto-created missing user document');
            } else {
                console.log('✅ Account linking verified');
            }
        } else {
            console.warn('⚠️ Account linking verification failed');
        }
    } catch (error) {
        console.error('❌ Verification error:', error);
    }
}

/**
 * ADMIN FUNCTION: FIX ORPHANED ACCOUNTS
 * Find users in Auth but not in Firestore
 */
async function adminFixOrphanedAccounts() {
    try {
        if (!authIsCurrentUserAdmin()) {
            showToast('❌ Admin only', 'error');
            return;
        }

        console.log('🔍 Scanning for orphaned accounts...');

        // Get all users from Firestore
        const firestoreUsers = await firestoreGetAllUsers({ limit: 1000 });

        if (!firestoreUsers.success) {
            showToast('❌ Failed to fetch users', 'error');
            return;
        }

        const firestoreUserIds = new Set(firestoreUsers.data.map(u => u.id));

        console.log(`📊 Firestore has ${firestoreUserIds.size} user documents`);
        console.log('⚠️ Note: Auth user list not available on client');
        console.log('💡 Use Firebase Admin SDK server-side to compare and fix');

        showToast('✅ Check console for recommendations', 'info');
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * INITIALIZATION & SETUP
 * Call these on app startup
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * UPDATED MAIN APP INITIALIZATION
 */
async function initializeCompleteApp() {
    try {
        console.log('🚀 Initializing Complete App...');

        // 1. Initialize Firebase
        console.log('📦 Step 1: Firebase initialization...');
        await initializeFirebase();

        if (!isFirebaseReady()) {
            console.error('❌ Firebase not ready');
            return;
        }

        // 2. Verify auth state
        console.log('📦 Step 2: Auth verification...');
        const authUser = firebaseGetCurrentUser();

        if (authUser) {
            console.log('✅ User logged in:', authUser.email);

            // 3. Verify account linking
            console.log('📦 Step 3: Account linking verification...');
            await verifyAllAccountsOnStartup();

            // 4. Load user data
            console.log('📦 Step 4: Loading user data...');
            const userData = await authGetCurrentUserWithData();
            if (userData) {
                currentUser = userData;
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
            }

            // 5. Setup real-time listeners (admin only)
            if (authIsCurrentUserAdmin()) {
                console.log('📦 Step 5: Setting up admin listeners...');
                setupRealtimeUserListener();
            }

            // Show app
            showApp();
        } else {
            // Not logged in, show login
            showLogin();
        }

        console.log('✅ App initialization complete');
    } catch (error) {
        console.error('❌ Initialization error:', error);
        showLogin();
    }
}

// Call on page load
document.addEventListener('DOMContentLoaded', initializeCompleteApp);

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DEPLOYMENT CHECKLIST
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * ✅ BEFORE DEPLOYING:
 *
 * 1. UPDATE index.html
 *    □ Add new script imports in <head>:
 *      <script src="js/firestore-service.js"></script>
 *      <script src="js/storage-service.js"></script>
 *      <script src="js/auth-service.js"></script>
 *      <script src="js/implementation-complete.js"></script>
 *
 * 2. UPDATE FIREBASE SECURITY RULES
 *    □ Go to Firebase Console → Firestore → Rules
 *    □ Copy rules from SECURITY_RULES_COMPLETE.txt
 *    □ Do the same for Cloud Storage → Rules
 *    □ Click Publish
 *
 * 3. ENABLE FIRESTORE INDEXES (if needed)
 *    □ Firebase automatically suggests indexes
 *    □ Create indexes for queries with multiple conditions
 *
 * 4. TEST THOROUGHLY
 *    □ Test signup with new account → check Firestore
 *    □ Test login → verify account linking
 *    □ Test image upload → check Storage
 *    □ Test admin panel → verify users display
 *    □ Test password change
 *    □ Test item creation with multiple images
 *
 * 5. MONITOR PRODUCTION
 *    □ Check Firebase Realtime Database Logs
 *    □ Monitor Storage usage
 *    □ Review Audit Logs regularly
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

console.log('✅ Implementation Guide Complete');
