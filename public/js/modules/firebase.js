/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FIREBASE MODULE - CORE INITIALIZATION
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * SINGLE SOURCE OF TRUTH for Firebase initialization
 * Replaces: firebase-init.js, firebase-impl.js, firebase-services.js
 * 
 * Features:
 * - One-time initialization
 * - Error recovery
 * - Service ready checks
 * - Global references (safe)
 */

console.log('🔥 Firebase Core Module Initializing...');

// ============================================================================
// FIREBASE CONFIGURATION
// ============================================================================

const FIREBASE_CONFIG = {
    apiKey: "AIzaSyBf81niwlq0GPvyBdbrpik0JN1DySxbCXI",
    authDomain: "pcdscampuslostandfound.firebaseapp.com",
    projectId: "pcdscampuslostandfound",
    storageBucket: "pcdscampuslostandfound.firebasestorage.app",
    messagingSenderId: "393004849566",
    appId: "1:393004849566:web:977b2b8efb56eb01521e8f",
    measurementId: "G-1TWW3PG8S5"
};

// ============================================================================
// GLOBAL REFERENCES (INITIALIZED ONCE)
// ============================================================================

let firebaseApp = null;
let firebaseAuth = null;
let firebaseDB = null;
let firebaseStorage = null;

let isInitializing = false;
let initializePromise = null;

// ============================================================================
// INITIALIZATION FUNCTION
// ============================================================================

/**
 * Initialize Firebase Services (ONE TIME ONLY)
 * Safe to call multiple times - returns existing instance if already initialized
 * 
 * @returns {Promise<boolean>} - Success status
 */
async function initializeFirebase() {
    try {
        // Prevent multiple simultaneous initializations
        if (isInitializing) {
            console.log('⏳ Firebase initialization in progress, waiting...');
            return await initializePromise;
        }

        // Return if already initialized
        if (firebaseApp && firebaseAuth && firebaseDB && firebaseStorage) {
            console.log('✅ Firebase already initialized');
            return true;
        }

        isInitializing = true;
        initializePromise = _performInitialization();

        const result = await initializePromise;
        isInitializing = false;
        return result;

    } catch (error) {
        console.error('❌ Firebase initialization error:', error);
        isInitializing = false;
        return false;
    }
}

/**
 * Perform actual initialization (internal)
 */
async function _performInitialization() {
    try {
        console.log('🚀 Starting Firebase initialization...');

        // Import Firebase modules
        const { initializeApp } = await import("https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js");
        const { getAuth } = await import("https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js");
        const { getFirestore } = await import("https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js");
        const { getStorage } = await import("https://www.gstatic.com/firebasejs/12.12.1/firebase-storage.js");

        // Initialize Firebase
        firebaseApp = initializeApp(FIREBASE_CONFIG);
        console.log('✅ Firebase App initialized');

        // Initialize Auth
        firebaseAuth = getAuth(firebaseApp);
        console.log('✅ Firebase Auth initialized');

        // Initialize Firestore
        firebaseDB = getFirestore(firebaseApp);
        console.log('✅ Firestore initialized');

        // Initialize Storage
        firebaseStorage = getStorage(firebaseApp);
        console.log('✅ Firebase Storage initialized');

        // Setup Auth state listener
        setupAuthStateListener();

        console.log('🎉 Firebase fully initialized!');
        return true;

    } catch (error) {
        console.error('❌ Initialization failed:', error);
        return false;
    }
}

// ============================================================================
// AUTH STATE LISTENER
// ============================================================================

/**
 * Setup global auth state listener
 * Called once during initialization
 */
function setupAuthStateListener() {
    try {
        const { onAuthStateChanged } = require_firebase_module('auth');

        onAuthStateChanged(firebaseAuth, (user) => {
            if (user) {
                console.log('👤 User logged in:', user.uid);
                // Fire custom event for app to handle
                window.dispatchEvent(new CustomEvent('firebase-user-changed', { detail: user }));
            } else {
                console.log('👤 User logged out');
                window.dispatchEvent(new CustomEvent('firebase-user-changed', { detail: null }));
            }
        });
    } catch (error) {
        console.warn('⚠️ Auth state listener setup warning:', error);
    }
}

// ============================================================================
// SERVICE READY CHECKS
// ============================================================================

/**
 * Check if Firebase is fully initialized
 * @returns {boolean}
 */
function isFirebaseReady() {
    return !!(firebaseApp && firebaseAuth && firebaseDB && firebaseStorage);
}

/**
 * Check if Firebase Auth is ready
 * @returns {boolean}
 */
function isFirebaseAuthReady() {
    return !!firebaseAuth;
}

/**
 * Check if Firestore is ready
 * @returns {boolean}
 */
function isFirestoreReady() {
    return !!firebaseDB;
}

/**
 * Check if Storage is ready
 * @returns {boolean}
 */
function isFirebaseStorageReady() {
    return !!firebaseStorage;
}

// ============================================================================
// SAFE MODULE IMPORTS (with error handling)
// ============================================================================

/**
 * Safely import Firebase module
 * @param {string} moduleName - 'auth', 'firestore', 'storage'
 * @returns {object} - Module exports
 */
async function require_firebase_module(moduleName) {
    try {
        const modules = {
            'auth': "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js",
            'firestore': "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js",
            'storage': "https://www.gstatic.com/firebasejs/12.12.1/firebase-storage.js"
        };

        const url = modules[moduleName];
        if (!url) throw new Error(`Unknown module: ${moduleName}`);

        return await import(url);
    } catch (error) {
        console.error(`❌ Failed to load Firebase module: ${moduleName}`, error);
        throw error;
    }
}

// ============================================================================
// EXPORTS FOR OTHER MODULES
// ============================================================================

// Make available globally for other modules
window.FirebaseCore = {
    initializeFirebase,
    getAuth: () => firebaseAuth,
    getFirestore: () => firebaseDB,
    getStorage: () => firebaseStorage,
    isFirebaseReady,
    isFirebaseAuthReady,
    isFirestoreReady,
    isFirebaseStorageReady,
    require_firebase_module
};

console.log('✅ Firebase Core Module Loaded');
