/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TROUBLESHOOTING & COMMON BUGS GUIDE
 * Root Causes and How to Fix Them
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ISSUE 1: USERS APPEAR IN AUTH BUT NOT IN ADMIN DASHBOARD
 * Root Cause: User doc not created in Firestore during signup
 * ═══════════════════════════════════════════════════════════════════════════
 */

/*
PROBLEM:
- User signs up successfully (no error message)
- Firebase Auth shows the user in Authentication tab
- Admin dashboard shows no users or fewer users than expected

ROOT CAUSE:
- Old signup code only created Auth user, not Firestore doc
- Or: Exception during Firestore doc creation was silently caught

DIAGNOSIS:
1. Check Firebase Console → Authentication → Users
   - See how many users exist?
2. Check Firebase Console → Firestore → users collection
   - See how many user documents exist?
3. If Auth has more users than Firestore, you found the problem!

FIX:
Step 1: Update form handler in index.html
  CHANGE: onsubmit="handleSignup(event)"
  TO:     onsubmit="handleCompleteSignup(event)"

Step 2: Use new authCompleteSignup() function that:
  - Creates Auth user
  - THEN creates Firestore doc
  - THEN returns success only if both succeeded

Step 3: For existing orphaned accounts:
  Option A: Manual fix in Firebase Console
    1. Go to Firestore → users collection
    2. Create new document with ID = user's UID (from Auth tab)
    3. Fill required fields: email, name, role, etc.
  
  Option B: Automatic fix via server-side script
    Use Firebase Admin SDK to iterate all Auth users and create missing docs

CODE TO TEST:
async function testUserCreation() {
    const result = await firestoreGetAllUsers();
    const authCount = "Check manually in Firebase Console";
    const firestoreCount = result.data.length;
    console.log(`Auth users: ?, Firestore users: ${firestoreCount}`);
    if (firestoreCount === 0) console.warn('❌ No users in Firestore!');
}
*/

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ISSUE 2: IMAGE UPLOAD FAILS OR RETURNS NO URL
 * Root Cause: Storage rules, compression error, or missing permissions
 * ═══════════════════════════════════════════════════════════════════════════
 */

/*
PROBLEM:
- User clicks "Post Item" with images
- Shows "Uploading..." but never completes
- No error message
- OR: Error message about storage permissions

ROOT CAUSES (in order of likelihood):
1. Firebase Storage rules are too restrictive
2. Browser doesn't have Canvas API (for compression)
3. File is corrupt or wrong format
4. Firebase Storage not initialized
5. Network timeout

DIAGNOSIS:
1. Open browser console (F12)
2. Look for errors mentioning:
   - "storage/unauthorized" → Rules issue
   - "canvas" → Browser issue
   - "not initialized" → Firebase init issue

FIX:

Fix 1: Update Firebase Storage Rules
  1. Go Firebase Console → Storage → Rules
  2. Paste rules from SECURITY_RULES_COMPLETE.txt
  3. Publish rules
  4. Wait 1-2 minutes for rules to propagate

Fix 2: Check Browser Compatibility
  - Canvas API needs: Chrome 20+, Firefox 20+, Safari 6+, Edge all versions
  - If old browser: disable compression, upload original file

Fix 3: Check File Size/Format
  - Max file: 5MB (configurable in IMAGE_CONFIG)
  - Allowed: image/jpeg, image/png, image/webp
  - Test with small JPEG first

Fix 4: Verify Storage Initialization
  - Check console for "✅ Firebase Storage Initialized"
  - If not there, Storage module import failed

CODE TO TEST:
async function testImageUpload() {
    // Test 1: Check if Storage ready
    if (!firebaseStorage) {
        console.error('❌ Storage not initialized');
        return;
    }
    console.log('✅ Storage ready');
    
    // Test 2: Create test image
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    canvas.toBlob(async (blob) => {
        // Test 3: Try upload
        const result = await storageUploadFile('test/test.jpg', blob);
        if (result.success) {
            console.log('✅ Upload worked:', result.url);
        } else {
            console.error('❌ Upload failed:', result.error);
        }
    });
}
testImageUpload();
*/

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ISSUE 3: CHANGE PASSWORD NOT WORKING / GIVING "PERMISSION DENIED"
 * Root Cause: User reauthentication failed or wrong Firebase modules
 * ═══════════════════════════════════════════════════════════════════════════
 */

/*
PROBLEM:
- User clicks "Change Password"
- Gets error: "Permission denied" or "Wrong password"
- But password is definitely correct

ROOT CAUSES:
1. Current password verification failed (typo, caps lock)
2. Firebase Auth module import failed
3. User session expired
4. Too many failed attempts (Firebase blocks after ~5 tries)

DIAGNOSIS:
1. Check browser console for specific error
2. Try changing password immediately after login
3. Verify password matches exactly (check caps lock!)

FIX:

Fix 1: Clear Failed Attempts
  - Wait 15-30 minutes (Firebase rate limiting)
  - OR delete account and recreate (for testing)

Fix 2: Check Current Password Entry
  - Verify caps lock is OFF
  - Copy/paste password instead of typing

Fix 3: Test With Simple Password
  - Use very simple password for testing (abc123)
  - Make sure current password field has CURRENT password

CODE TO TEST:
async function testPasswordChange() {
    const result = await authChangePassword('password123', 'newpass456');
    if (result.success) {
        console.log('✅ Password changed');
    } else {
        console.error('❌ Error:', result.error);
        // Common errors:
        // "Current password is incorrect" → wrong current password
        // "User not authenticated" → not logged in
        // "Failed to update password" → account issue
    }
}
*/

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ISSUE 4: ADMIN DASHBOARD USERS LIST EMPTY
 * Root Cause: No data in Firestore OR real-time listener not set up
 * ═══════════════════════════════════════════════════════════════════════════
 */

/*
PROBLEM:
- Admin logs in, goes to Users tab
- Shows "No users found"
- But users definitely exist in Firebase

ROOT CAUSES:
1. User doesn't have admin role
2. Query permissions denied (Firestore rules)
3. Listener not subscribed
4. Wrong collection name

DIAGNOSIS:
1. Verify user is admin:
   console.log('Is admin?', authIsCurrentUserAdmin());
   
2. Check browser console for errors
   - Look for: "Permission denied"
   - Look for: "Not authorized"

3. Verify Firestore has data:
   console.log('Testing query...');
   const result = await firestoreGetAllUsers();
   console.log('Users:', result);

FIX:

Fix 1: Ensure Admin Role
  Option A: In Firebase Console → Firestore → users
    - Find your user document
    - Edit "role" field to "admin"
    - Refresh page
  
  Option B: Use admin account
    - Login as: admin@campus.edu (if you set it up)
    - Check Firestore rules to verify this email gets admin access

Fix 2: Check Firestore Rules
  1. Firebase Console → Firestore → Rules
  2. Look for users collection rules
  3. Verify they allow admin to read all
  4. Should have: ...role == 'admin'...
  5. If missing, add rules from SECURITY_RULES_COMPLETE.txt

Fix 3: Initialize Real-Time Listener
  - Make sure setupRealtimeUserListener() is called
  - Should be in showAdminPanel() or initializeCompleteApp()
  - Check console for "🔄 Setting up real-time user listener..."

CODE TO TEST:
async function debugAdminUsers() {
    console.log('=== Admin Users Debug ===');
    
    // Test 1: Check role
    console.log('1. Is admin?', authIsCurrentUserAdmin());
    
    // Test 2: Get current user
    const user = firebaseGetCurrentUser();
    console.log('2. Current auth user:', user?.email);
    
    // Test 3: Query Firestore
    const result = await firestoreGetAllUsers();
    console.log('3. Firestore query result:', result);
    
    // Test 4: Listen to changes
    firestoreListenToUsers((data) => {
        console.log('4. Real-time update:', data);
    });
}
debugAdminUsers();
*/

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ISSUE 5: ITEMS NOT SAVING TO FIRESTORE
 * Root Cause: Firestore rules, userId mismatch, or missing fields
 * ═══════════════════════════════════════════════════════════════════════════
 */

/*
PROBLEM:
- User creates item
- No error message
- Item doesn't appear in admin dashboard
- Check Firestore → items collection: empty

ROOT CAUSES:
1. Firestore rules deny write (userId doesn't match auth)
2. Required fields missing
3. User not authenticated when posting
4. Firestore not initialized

DIAGNOSIS:
1. Check console for specific Firestore error
2. Verify required fields exist:
   - title, description, status, category
3. Check userId matches current user:
   console.log('Current user UID:', firebaseGetCurrentUser().uid);

FIX:

Fix 1: Verify Authentication
  - Make sure user is logged in before posting item
  - Test: console.log('Logged in?', authIsUserLoggedIn());

Fix 2: Check Required Fields
  - title: not empty
  - description: not empty
  - status: 'lost' or 'found'
  - category: valid category

Fix 3: Update Firestore Rules
  1. Firebase Console → Firestore → Rules
  2. Find items collection rules
  3. Verify userId check exists:
     ...request.resource.data.userId == request.auth.uid...
  4. If missing, add from SECURITY_RULES_COMPLETE.txt

CODE TO TEST:
async function testItemCreation() {
    const result = await firestoreCreateItem({
        title: 'Test Item',
        description: 'Test description',
        status: 'lost',
        category: 'electronics',
        location: 'Test Location'
    });
    
    if (result.success) {
        console.log('✅ Item created:', result.id);
    } else {
        console.error('❌ Error:', result.error);
        // Common errors:
        // "User not authenticated" → not logged in
        // "Missing required field" → fill all fields
        // "Permission denied" → check Firestore rules
    }
}
*/

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ISSUE 6: FIREBASE INITIALIZATION FAILS / "NOT INITIALIZED" ERRORS
 * Root Cause: Module import failed, network issue, or wrong config
 * ═══════════════════════════════════════════════════════════════════════════
 */

/*
PROBLEM:
- See console errors: "Firebase not initialized"
- Or: "isFirebaseReady() returns false"
- App doesn't work

ROOT CAUSES:
1. Internet connectivity issue
2. Firebase config wrong in firebase-init.js
3. Firebase modules failed to import (CDN issue)
4. initializeFirebase() not called

DIAGNOSIS:
1. Check browser console on page load
   - Should see: ✅ Firebase App Initialized
   - Should see: ✅ Firebase Auth Initialized
   - Should see: ✅ Firestore Initialized
   - Should see: ✅ Firebase Storage Initialized
   
2. If missing any, that's the problem

3. Check network tab
   - Look for failed requests to:
     gstatic.com/firebasejs/... (Firebase SDK)

FIX:

Fix 1: Check Internet Connection
  - Verify you're connected to internet
  - Try accessing google.com in new tab

Fix 2: Verify Firebase Config
  - Open firebase-init.js
  - Check firebaseConfig object
  - Verify projectId matches your project
  - Go Firebase Console → Project Settings → copy config
  - Paste new config into firebase-init.js

Fix 3: Check Script Loading Order
  - In index.html <head>, order should be:
    1. <script src="js/firebase-init.js"></script>
    2. <script src="js/firestore-service.js"></script>
    3. <script src="js/storage-service.js"></script>
    4. <script src="js/auth-service.js"></script>
    5. <script src="js/other files..."></script>
  - Wrong order = modules not loaded

Fix 4: Wait for Initialization
  - Add check before using Firebase:
    if (!isFirebaseReady()) {
        console.warn('Firebase not ready yet, waiting...');
        setTimeout(checkFunction, 1000); // Retry after 1 second
    }

CODE TO TEST:
function debugFirebaseInit() {
    console.log('=== Firebase Init Debug ===');
    console.log('1. App:', firebaseApp ? '✅' : '❌');
    console.log('2. Auth:', firebaseAuth ? '✅' : '❌');
    console.log('3. DB:', firebaseDB ? '✅' : '❌');
    console.log('4. Storage:', firebaseStorage ? '✅' : '❌');
    console.log('5. Ready:', isFirebaseReady() ? '✅' : '❌');
    
    if (!isFirebaseReady()) {
        console.error('❌ Firebase not ready!');
        console.log('Retrying initialization...');
        initializeFirebase().then(success => {
            console.log('Retry result:', success ? '✅' : '❌');
        });
    }
}
// Run on startup
setTimeout(debugFirebaseInit, 2000);
*/

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ISSUE 7: ACCOUNT LINKING BROKEN / USER HAS AUTH BUT NO FIRESTORE DOC
 * Root Cause: Old signup code or manual account creation
 * ═══════════════════════════════════════════════════════════════════════════
 */

/*
PROBLEM:
- Some users can login but profile shows blank/missing data
- Or: "Could not retrieve user profile" error on login
- Firebase Auth has the user, but no Firestore doc

ROOT CAUSE:
- Users signed up before account linking was implemented
- Firestore doc creation failed during signup (no error shown)
- Manual account creation in Firebase Console

FIX:

Fix 1: Auto-Fix on Next Login
  - New login function verifies account linking
  - If Firestore doc missing, creates it automatically
  - Users just need to login again

Fix 2: Manual Fix (Admin)
  1. Firebase Console → Authentication
  2. Find user
  3. Copy their UID
  4. Go to Firestore → users
  5. Create new document with ID = UID
  6. Fill fields: email, name, role, etc.

Fix 3: Bulk Fix via Script
  // Run in Firebase Console → Functions → Test Functions
  async function fixOrphanedAccounts() {
      const auth = admin.auth();
      const db = admin.firestore();
      
      const users = await auth.listUsers();
      for (const user of users.users) {
          const doc = await db.collection('users').doc(user.uid).get();
          if (!doc.exists) {
              console.log('Creating doc for:', user.email);
              await db.collection('users').doc(user.uid).set({
                  uid: user.uid,
                  email: user.email,
                  name: user.displayName || user.email.split('@')[0],
                  role: 'user',
                  createdAt: admin.firestore.FieldValue.serverTimestamp(),
                  status: 'active'
              });
          }
      }
  }

CODE TO TEST:
async function testAccountLinking() {
    const authUser = firebaseGetCurrentUser();
    if (!authUser) {
        console.warn('No logged in user');
        return;
    }
    
    console.log('Testing account linking for:', authUser.email);
    
    const result = await firestoreVerifyAccountLinking(authUser);
    console.log('Result:', result);
    
    if (result.autoCreated) {
        console.log('✅ Auto-created missing document!');
    } else if (result.success) {
        console.log('✅ Account properly linked');
    } else {
        console.error('❌ Linking failed:', result.error);
    }
}
*/

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * QUICK DEBUG COMMANDS
 * Copy/paste into browser console to test
 * ═══════════════════════════════════════════════════════════════════════════
 */

/*
// Check Firebase Status
console.log('🔥 Firebase Status:');
console.log('  App:', firebaseApp ? '✅' : '❌');
console.log('  Auth:', firebaseAuth ? '✅' : '❌');
console.log('  Firestore:', firebaseDB ? '✅' : '❌');
console.log('  Storage:', firebaseStorage ? '✅' : '❌');
console.log('  Ready:', isFirebaseReady() ? '✅' : '❌');

// Check Auth Status
console.log('👤 Auth Status:');
const user = firebaseGetCurrentUser();
console.log('  Logged in:', user ? '✅' : '❌');
if (user) console.log('  Email:', user.email);
if (user) console.log('  UID:', user.uid);

// Check App State
console.log('💾 App State:');
console.log('  currentUser:', currentUser);
console.log('  Role:', currentUser?.role);
console.log('  Is Admin:', authIsCurrentUserAdmin());

// Test Firestore Query
console.log('🔍 Firestore Tests:');
(async () => {
    const users = await firestoreGetAllUsers({ limit: 5 });
    console.log('  Users found:', users.data?.length || 0);
})();

// Test User Profile
console.log('📋 User Profile Tests:');
(async () => {
    const user = firebaseGetCurrentUser();
    if (user) {
        const profile = await firestoreGetUserProfile(user.uid);
        console.log('  Profile:', profile);
    }
})();

// Reset All Debugging Logs
localStorage.removeItem('currentUser');
localStorage.removeItem('authToken');
location.reload();
*/

console.log('✅ Troubleshooting Guide Loaded');
