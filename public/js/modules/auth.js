/**
 * ═══════════════════════════════════════════════════════════════════════════
 * AUTH MODULE - Authentication Service
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Replaces: auth.js, auth-handler.js, firebase-auth-handler.js
 * 
 * Features:
 * - Sign up / Sign in / Sign out
 * - Password reset
 * - User profile auto-creation
 * - Session management
 */

console.log('🔐 Auth Module Loading...');

// ============================================================================
// CONSTANTS
// ============================================================================

const AUTH_ERRORS = {
    'auth/user-not-found': 'Email not found',
    'auth/wrong-password': 'Incorrect password',
    'auth/email-already-in-use': 'Email already registered',
    'auth/weak-password': 'Password must be at least 6 characters',
    'auth/invalid-email': 'Invalid email address',
    'auth/network-request-failed': 'Network error - check connection',
    'auth/too-many-requests': 'Too many login attempts. Try again later.'
};

// ============================================================================
// SIGN UP
// ============================================================================

/**
 * Register new user
 * 
 * @param {string} email - User email
 * @param {string} password - User password (min 6 chars)
 * @param {object} userData - { name, phone, role }
 * @returns {Promise<object>} - { success, userId, error }
 */
async function authSignUp(email, password, userData = {}) {
    try {
        if (!window.FirebaseCore?.isFirebaseAuthReady()) {
            throw new Error('Firebase Auth not initialized');
        }

        // Validate inputs
        if (!email || !password || !userData.name) {
            return { success: false, error: 'Missing required fields' };
        }

        if (password.length < 6) {
            return { success: false, error: 'Password must be at least 6 characters' };
        }

        console.log('📝 Creating user:', email);

        const { createUserWithEmailAndPassword, updateProfile } = await window.FirebaseCore.require_firebase_module('auth');
        const auth = window.FirebaseCore.getAuth();

        // Create Firebase Auth user
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const uid = userCredential.user.uid;

        console.log('✅ Auth user created:', uid);

        // Update auth profile
        await updateProfile(userCredential.user, {
            displayName: userData.name
        });

        console.log('✅ Auth profile updated');

        // Create Firestore user document
        const userDoc = {
            uid: uid,
            email: email,
            name: userData.name || '',
            phone: userData.phone || '',
            role: userData.role || 'user',
            avatar: '',
            bio: '',
            status: 'active',
            totalItems: 0,
            resolvedItems: 0,
            rating: 0,
            notifications: {
                email: true,
                inApp: true
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const result = await firestoreCreateUser(uid, userDoc);

        if (!result.success) {
            console.warn('⚠️ User Firestore doc creation failed, but auth user created');
        }

        return { success: true, userId: uid };

    } catch (error) {
        console.error('❌ Sign up error:', error);
        const errorMsg = AUTH_ERRORS[error.code] || error.message;
        return { success: false, error: errorMsg };
    }
}

// ============================================================================
// SIGN IN
// ============================================================================

/**
 * Sign in user
 * 
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<object>} - { success, userId, error }
 */
async function authSignIn(email, password) {
    try {
        if (!window.FirebaseCore?.isFirebaseAuthReady()) {
            throw new Error('Firebase Auth not initialized');
        }

        if (!email || !password) {
            return { success: false, error: 'Email and password required' };
        }

        console.log('🔑 Signing in user:', email);

        const { signInWithEmailAndPassword } = await window.FirebaseCore.require_firebase_module('auth');
        const auth = window.FirebaseCore.getAuth();

        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const uid = userCredential.user.uid;

        console.log('✅ User signed in:', uid);

        // Load user profile
        const userProfile = await firestoreGetUserProfile(uid);

        return { success: true, userId: uid, user: userProfile.data };

    } catch (error) {
        console.error('❌ Sign in error:', error);
        const errorMsg = AUTH_ERRORS[error.code] || error.message;
        return { success: false, error: errorMsg };
    }
}

// ============================================================================
// SIGN OUT
// ============================================================================

/**
 * Sign out current user
 * 
 * @returns {Promise<object>} - { success, error }
 */
async function authSignOut() {
    try {
        if (!window.FirebaseCore?.isFirebaseAuthReady()) {
            throw new Error('Firebase Auth not initialized');
        }

        const { signOut } = await window.FirebaseCore.require_firebase_module('auth');
        const auth = window.FirebaseCore.getAuth();

        await signOut(auth);
        console.log('✅ User signed out');

        return { success: true };

    } catch (error) {
        console.error('❌ Sign out error:', error);
        return { success: false, error: error.message };
    }
}

// ============================================================================
// CURRENT USER
// ============================================================================

/**
 * Get current logged-in user
 * 
 * @returns {Promise<object>} - Firebase user object or null
 */
async function authGetCurrentUser() {
    try {
        if (!window.FirebaseCore?.isFirebaseAuthReady()) {
            return null;
        }

        const auth = window.FirebaseCore.getAuth();
        return auth.currentUser || null;

    } catch (error) {
        console.error('❌ Error getting current user:', error);
        return null;
    }
}

/**
 * Wait for Firebase Auth to be ready and return current user
 * 
 * @returns {Promise<object>} - Firebase user object or null
 */
async function authWaitForUser() {
    return new Promise((resolve) => {
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds with 100ms checks

        const checkUser = async () => {
            const user = await authGetCurrentUser();
            if (user) {
                resolve(user);
            } else if (attempts++ < maxAttempts) {
                setTimeout(checkUser, 100);
            } else {
                resolve(null);
            }
        };

        checkUser();
    });
}

// ============================================================================
// PASSWORD RESET
// ============================================================================

/**
 * Send password reset email
 * 
 * @param {string} email - User email
 * @returns {Promise<object>} - { success, error }
 */
async function authResetPassword(email) {
    try {
        if (!window.FirebaseCore?.isFirebaseAuthReady()) {
            throw new Error('Firebase Auth not initialized');
        }

        if (!email) {
            return { success: false, error: 'Email required' };
        }

        const { sendPasswordResetEmail } = await window.FirebaseCore.require_firebase_module('auth');
        const auth = window.FirebaseCore.getAuth();

        await sendPasswordResetEmail(auth, email);
        console.log('✅ Password reset email sent to:', email);

        return { success: true, message: 'Check your email for password reset link' };

    } catch (error) {
        console.error('❌ Password reset error:', error);
        const errorMsg = AUTH_ERRORS[error.code] || error.message;
        return { success: false, error: errorMsg };
    }
}

// ============================================================================
// EXPORTS
// ============================================================================

window.AuthService = {
    signUp: authSignUp,
    signIn: authSignIn,
    signOut: authSignOut,
    getCurrentUser: authGetCurrentUser,
    waitForUser: authWaitForUser,
    resetPassword: authResetPassword
};

console.log('✅ Auth Module Loaded');
