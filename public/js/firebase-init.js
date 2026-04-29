/**
 * Firebase Initialization Module
 * Using Modular Firebase SDK v12.12.1
 * Configuration: pcdscampuslostandfound project
 */

// ========== FIREBASE CONFIGURATION ==========
const firebaseConfig = {
    apiKey: "AIzaSyBf81niwlq0GPvyBdbrpik0JN1DySxbCXI",
    authDomain: "pcdscampuslostandfound.firebaseapp.com",
    projectId: "pcdscampuslostandfound",
    storageBucket: "pcdscampuslostandfound.firebasestorage.app",
    messagingSenderId: "393004849566",
    appId: "1:393004849566:web:977b2b8efb56eb01521e8f",
    measurementId: "G-1TWW3PG8S5"
};

if (typeof appConfig !== 'undefined' && appConfig.app_debug) {
    console.log('Firebase Config:', {
        projectId: firebaseConfig.projectId,
        authDomain: firebaseConfig.authDomain,
        storageBucket: firebaseConfig.storageBucket
    });
}

// ========== GLOBAL FIREBASE REFERENCES ==========
let firebaseApp = null;
let firebaseAuth = null;
let firebaseDB = null;
let firebaseStorage = null;
let firebaseAnalytics = null;
let isFirebaseInitialized = false;

// ========== INITIALIZATION FUNCTION ==========
async function initializeFirebase() {
    try {
        if (typeof appConfig !== 'undefined' && appConfig.app_debug) console.log('Starting Firebase initialization...');

        // Wrap SDK imports in error handling
        let initializeApp, getAuth, getFirestore, getStorage, getAnalytics;
        try {
            const appModule = await import("https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js");
            initializeApp = appModule.initializeApp;
        } catch (e) {
            console.error('Firebase app module failed to load:', e);
            throw e;
        }

        try {
            const authModule = await import("https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js");
            getAuth = authModule.getAuth;
        } catch (e) {
            console.error('Firebase auth module failed to load:', e);
            throw e;
        }

        try {
            const fsModule = await import("https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js");
            getFirestore = fsModule.getFirestore;
        } catch (e) {
            console.error('Firebase Firestore module failed to load:', e);
            throw e;
        }

        try {
            const storageModule = await import("https://www.gstatic.com/firebasejs/12.12.1/firebase-storage.js");
            getStorage = storageModule.getStorage;
        } catch (e) {
            console.error('Firebase storage module failed to load:', e);
            throw e;
        }

        try {
            const analyticsModule = await import("https://www.gstatic.com/firebasejs/12.12.1/firebase-analytics.js");
            getAnalytics = analyticsModule.getAnalytics;
        } catch (e) {
            console.warn('Firebase analytics module failed to load (non-critical):', e);
            getAnalytics = null;
        }

        // Initialize Firebase app
        firebaseApp = initializeApp(firebaseConfig);

        // Initialize services
        firebaseAuth = getAuth(firebaseApp);
        firebaseDB = getFirestore(firebaseApp);
        firebaseStorage = getStorage(firebaseApp);

        if (getAnalytics) {
            try {
                firebaseAnalytics = getAnalytics(firebaseApp);
            } catch (e) {
                if (typeof appConfig !== 'undefined' && appConfig.app_debug) {
                    console.warn('Firebase Analytics initialization warning:', e.message);
                }
            }
        }

        // Enable offline persistence for Firestore (non-critical)
        try {
            const { enableIndexedDbPersistence } = await import("https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js");
            await enableIndexedDbPersistence(firebaseDB);
            if (typeof appConfig !== 'undefined' && appConfig.app_debug) console.log('Firestore Offline Persistence Enabled');
        } catch (err) {
            if (err.code === 'failed-precondition') {
                console.warn('⚠️ Offline persistence failed - multiple tabs open');
            } else if (err.code === 'unimplemented') {
                console.warn('⚠️ Offline persistence not supported in this browser');
            } else {
                console.warn('⚠️ Offline persistence warning:', err.message);
            }
        }

        isFirebaseInitialized = true;
        if (typeof appConfig !== 'undefined' && appConfig.app_debug) console.log('Firebase Initialization Complete!');

        // Initialize module cache for optimization
        if (typeof initializeFirebaseModuleCache === 'function') {
            if (typeof appConfig !== 'undefined' && appConfig.app_debug) console.log('Initializing Firebase module cache...');
            const cacheInitialized = await initializeFirebaseModuleCache();
            if (cacheInitialized) {
                if (typeof appConfig !== 'undefined' && appConfig.app_debug) console.log('Firebase module cache initialized');
            } else {
                console.warn('Module cache initialization failed, falling back to standard imports');
            }
        }

        return true;

    } catch (error) {
        console.error('Firebase initialization error:', error);
        if (typeof appConfig !== 'undefined' && appConfig.app_debug) {
            console.error('Error code:', error.code);
            console.error('Error message:', error.message);
        }
        isFirebaseInitialized = false;
        return false;
    }
}

// ========== FIREBASE SERVICE FUNCTIONS ==========

/**
 * Login user with email and password
 */
async function firebaseLogin(email, password) {
    try {
        if (!isFirebaseInitialized) {
            throw new Error('Firebase not initialized');
        }

        const { signInWithEmailAndPassword } = await import("https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js");
        const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js");

        const userCredential = await signInWithEmailAndPassword(firebaseAuth, email, password);
        const user = userCredential.user;
        const idToken = await user.getIdToken();

        if (typeof appConfig !== 'undefined' && appConfig.app_debug) console.log('Login successful:', user.email);

        // Fetch full user data from Firestore
        let userData = {
            uid: user.uid,
            email: user.email,
            name: user.displayName || email.split('@')[0],
            phone: '',
            role: 'user',
            avatar: user.photoURL || ''
        };

        try {
            const userRef = doc(firebaseDB, 'users', user.uid);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
                const firestoreData = userSnap.data();
                // Merge Firestore data with auth data, preferring Firestore values
                userData = {
                    uid: user.uid,
                    email: user.email,
                    name: firestoreData.name || user.displayName || email.split('@')[0],
                    phone: firestoreData.phone || '',
                    role: firestoreData.role || 'user',
                    avatar: firestoreData.avatar || user.photoURL || ''
                };
                if (typeof appConfig !== 'undefined' && appConfig.app_debug) console.log('User data fetched from Firestore');
            } else {
                if (typeof appConfig !== 'undefined' && appConfig.app_debug) console.warn('User data not found in Firestore, using defaults');
            }
        } catch (firestoreError) {
            if (typeof appConfig !== 'undefined' && appConfig.app_debug) {
                console.warn('Could not fetch full user data from Firestore:', firestoreError.message);
            }
            // Continue with minimal data if Firestore fetch fails
        }

        // Automatically grant admin role to admin@campus.edu
        if (email.toLowerCase() === 'admin@campus.edu') {
            userData.role = 'admin';
            if (typeof appConfig !== 'undefined' && appConfig.app_debug) console.log('Admin account detected (admin@campus.edu), role set to admin');
        }

        return {
            success: true,
            data: userData,
            token: idToken
        };
    } catch (error) {
        console.error('Login error:', error.message);
        return {
            success: false,
            error: getFirebaseErrorMessage(error.code)
        };
    }
}

/**
 * Sign up new user
 */
async function firebaseSignup(name, email, phone, password, role = 'student') {
    try {
        if (!isFirebaseInitialized) {
            throw new Error('Firebase not initialized');
        }

        const { createUserWithEmailAndPassword, updateProfile } = await import("https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js");
        const { doc, setDoc, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js");

        // Create user account
        const userCredential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
        const user = userCredential.user;

        // Update profile
        await updateProfile(user, {
            displayName: name
        });

        // Save user data to Firestore
        const userRef = doc(firebaseDB, 'users', user.uid);
        await setDoc(userRef, {
            uid: user.uid,
            name: name,
            email: email,
            phone: phone,
            role: role,
            avatar: '',
            createdAt: serverTimestamp(),
            status: 'active'
        });

        if (typeof appConfig !== 'undefined' && appConfig.app_debug) console.log('Signup successful:', email);

        return {
            success: true,
            data: {
                uid: user.uid,
                email: user.email,
                name: name,
                phone: phone,
                role: role,
                avatar: ''
            }
        };
    } catch (error) {
        console.error('Signup error:', error.message);
        return {
            success: false,
            error: getFirebaseErrorMessage(error.code)
        };
    }
}

/**
 * Logout current user
 */
async function firebaseLogout() {
    try {
        if (!isFirebaseInitialized) {
            throw new Error('Firebase not initialized');
        }

        const { signOut } = await import("https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js");

        await signOut(firebaseAuth);
        if (typeof appConfig !== 'undefined' && appConfig.app_debug) console.log('Logout successful');

        return {
            success: true
        };
    } catch (error) {
        console.error('❌ Logout error:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Get current authenticated user
 */
function firebaseGetCurrentUser() {
    if (!isFirebaseInitialized || !firebaseAuth) {
        return null;
    }
    return firebaseAuth.currentUser;
}

/**
 * Add authentication state listener
 */
function firebaseOnAuthStateChanged(callback) {
    if (!isFirebaseInitialized || !firebaseAuth) {
        console.warn('⚠️ Firebase not initialized');
        callback(null);
        return;
    }

    const { onAuthStateChanged } = import("https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js").then(module => {
        module.onAuthStateChanged(firebaseAuth, callback);
    }).catch(err => {
        console.error('❌ Auth state listener error:', err);
        callback(null);
    });
}

/**
 * Helper: Convert Firebase error codes to user-friendly messages
 */
function getFirebaseErrorMessage(code) {
    const errorMessages = {
        'auth/email-already-in-use': 'This email is already registered',
        'auth/invalid-email': 'Invalid email address',
        'auth/weak-password': 'Password is too weak (min 6 characters)',
        'auth/user-not-found': 'User not found',
        'auth/wrong-password': 'Invalid password',
        'auth/too-many-requests': 'Too many attempts. Try again later',
        'auth/network-request-failed': 'Network error. Check your connection',
        'firestore/permission-denied': 'Permission denied. Check Firestore rules',
        'storage/unauthorized': 'Storage access denied'
    };
    return errorMessages[code] || error.message || 'An error occurred';
}

/**
 * Check if Firebase is ready
 */
function isFirebaseReady() {
    return isFirebaseInitialized && firebaseAuth && firebaseDB && firebaseStorage;
}

/**
 * Get Firebase references (for advanced usage)
 */
function getFirebaseServices() {
    return {
        app: firebaseApp,
        auth: firebaseAuth,
        db: firebaseDB,
        storage: firebaseStorage,
        analytics: firebaseAnalytics,
        isInitialized: isFirebaseInitialized
    };
}

// ========== EXPORT FOR MODULE USAGE ==========
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initializeFirebase,
        firebaseLogin,
        firebaseSignup,
        firebaseLogout,
        firebaseGetCurrentUser,
        firebaseOnAuthStateChanged,
        isFirebaseReady,
        getFirebaseServices
    };
}

// Firebase Init Module ready
