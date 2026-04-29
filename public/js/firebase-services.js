/**
 * Firebase Services Initialization
 * Handles async initialization of all Firebase services
 */

console.log('🔥 Firebase Services Loading...');

/**
 * Initialize all Firebase services
 * Called during app startup in main.js
 */
async function initializeFirebaseServices() {
    try {
        console.log('🚀 Initializing Firebase Services...');

        // Check if Firebase initialization function exists
        if (typeof initializeFirebase !== 'function') {
            console.warn('⚠️ initializeFirebase function not found - continuing with mock data');
            return false;
        }

        // Call the main Firebase initialization
        let initialized = false;
        try {
            initialized = await initializeFirebase();
        } catch (e) {
            console.error('Firebase init threw error:', e);
            initialized = false;
        }

        if (initialized && isFirebaseReady && typeof isFirebaseReady === 'function' && isFirebaseReady()) {
            console.log('✅ Firebase Services Initialized Successfully');

            // Setup auth state listener (non-critical)
            try {
                if (typeof firebaseOnAuthStateChanged === 'function') {
                    firebaseOnAuthStateChanged((user) => {
                        if (user) {
                            console.log('✅ User authenticated:', user.email);
                        } else {
                            console.log('ℹ️ No authenticated user');
                        }
                    });
                }
            } catch (e) {
                console.warn('⚠️ Auth state listener setup failed (non-critical):', e);
            }

            return true;
        } else {
            console.warn('⚠️ Firebase services not fully initialized, using mock data');
            return false;
        }
    } catch (error) {
        console.error('❌ Error initializing Firebase Services:', error);
        console.warn('💡 App will continue with mock/local data storage');
        return false;
    }
}

/**
 * Helper: Check if Firebase is ready for operations
 */
function isFirebaseInitializedAndReady() {
    return typeof isFirebaseReady === 'function' && isFirebaseReady();
}

/**
 * Helper: Get current user safely
 */
function getCurrentUser() {
    try {
        if (typeof firebaseGetCurrentUser === 'function') {
            return firebaseGetCurrentUser();
        }
        return null;
    } catch (error) {
        console.error('Error getting current user:', error);
        return null;
    }
}

/**
 * Helper: Perform login and update UI
 */
async function performLogin(email, password) {
    try {
        if (!isFirebaseInitializedAndReady()) {
            throw new Error('Firebase not initialized');
        }

        if (typeof firebaseLogin !== 'function') {
            throw new Error('firebaseLogin function not found');
        }

        const result = await firebaseLogin(email, password);
        return result;
    } catch (error) {
        console.error('Login error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Helper: Perform signup
 */
async function performSignup(name, email, phone, password, role) {
    try {
        if (!isFirebaseInitializedAndReady()) {
            throw new Error('Firebase not initialized');
        }

        if (typeof firebaseSignup !== 'function') {
            throw new Error('firebaseSignup function not found');
        }

        const result = await firebaseSignup(name, email, phone, password, role);
        return result;
    } catch (error) {
        console.error('Signup error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Helper: Perform logout
 */
async function performLogout() {
    try {
        if (typeof firebaseLogout !== 'function') {
            throw new Error('firebaseLogout function not found');
        }

        const result = await firebaseLogout();
        return result;
    } catch (error) {
        console.error('Logout error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

console.log('✅ Firebase Services Module Loaded');
