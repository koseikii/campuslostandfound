// ========== MAIN INITIALIZATION & SETUP ==========

// Global Configuration
let appConfig = {
    app_url: window.location.origin,
    app_env: 'production',
    app_debug: false,
    useFirebase: true
};

// Global State Variables
let users = [];
let items = [];
let notifications = [];
let messages = [];
let deletedItems = [];
let currentUser = null;
let currentTab = 'lost';
let currentReportType = 'lost';

// ========== EMAILJS INITIALIZATION ==========
if (typeof emailjs !== 'undefined') {
    const emailjsKey = localStorage.getItem('emailjs_public_key');
    if (emailjsKey && emailjsKey !== 'YOUR_EMAILJS_PUBLIC_KEY') {
        try {
            emailjs.init(emailjsKey);
        } catch (e) {
            console.warn('EmailJS initialization failed');
        }
    }
}

// ========== PERFORMANCE MONITORING ==========
const performanceMetrics = {
    startTime: performance.now(),
    logs: []
};

function logPerformance(label) {
    const now = performance.now();
    const elapsed = now - performanceMetrics.startTime;
    performanceMetrics.logs.push({ label, time: elapsed });
    return elapsed;
}

function getPerformanceReport() {
    if (appConfig.app_debug) {
        console.table(performanceMetrics.logs);
        const totalTime = performanceMetrics.logs[performanceMetrics.logs.length - 1].time;
        console.log(`Total initialization time: ${totalTime.toFixed(2)}ms`);
    }
}

// ========== GLOBAL ERROR HANDLER ==========
let errorCount = 0;
const MAX_SILENT_ERRORS = 3; // Allow up to 3 errors before showing toast

window.addEventListener('error', (event) => {
    errorCount++;
    console.error('❌ Global Error:', event.error);
    console.error('   Stack:', event.error.stack);

    // Only show toast for critical errors (after several errors or specific error types)
    if (errorCount > MAX_SILENT_ERRORS || event.error?.message?.includes('Firebase')) {
        // Debounce error toasts (don't show multiple error toasts in rapid succession)
        if (!window.lastErrorToast || Date.now() - window.lastErrorToast > 5000) {
            showToast('An error occurred. Please refresh the page.', 'error');
            window.lastErrorToast = Date.now();
        }
    }
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('❌ Unhandled Promise Rejection:', event.reason);
    event.preventDefault();

    // Only show warning if it's a network error
    if (event.reason?.message?.includes('Network')) {
        if (!window.lastNetworkError || Date.now() - window.lastNetworkError > 10000) {
            console.warn('⚠️ Network error detected - some features may not work offline');
            window.lastNetworkError = Date.now();
        }
    }
});

// Initialize on DOM Content Loaded
document.addEventListener('DOMContentLoaded', async () => {
    if (appConfig.app_debug) {
        console.log('App Starting with Firebase Backend...');
        console.log('Browser:', navigator.userAgent.substring(0, 50) + '...');
    }

    try {
        // Initialize Firebase directly first
        let firebaseInitialized = false;

        if (typeof initializeFirebase === 'function') {
            firebaseInitialized = await initializeFirebase();
            if (appConfig.app_debug) console.log(`Firebase Direct Init: ${firebaseInitialized ? 'Success' : 'Failed'}`);
        }

        // Initialize Firebase services (wrapper)
        if (appConfig.app_debug) console.log('Initializing Firebase Services...');
        const firebaseReady = await initializeFirebaseServices();
        logPerformance('Firebase Initialized');

        if (!firebaseReady) {
            console.warn('Firebase not fully ready. App will work with localStorage only.');
        } else {
            if (appConfig.app_debug) console.log('Firebase services ready');

            // Initialize default collections
            if (typeof initializeDefaultCollections === 'function') {
                if (appConfig.app_debug) console.log('Initializing default collections...');
                await initializeDefaultCollections();
                logPerformance('Default Collections Initialized');
            }
        }

        // Load data from localStorage
        loadMockData();
        logPerformance('Data Loaded');
        if (appConfig.app_debug) console.log(`Data loaded. Items: ${items.length}, Users: ${users.length}`);

        // Check auth and show appropriate page
        try {
            checkAuth();
            logPerformance('Auth Checked');
        } catch (err) {
            console.error('❌ Auth error:', err);
            // Don't show error toast - just continue with mock data
        }

        // Setup event listeners
        try {
            setupEventListeners();
            logPerformance('Event Listeners Setup');
        } catch (err) {
            console.error('❌ Event listener setup error:', err);
        }

        // Force re-render after everything is ready
        setTimeout(() => {
            if (currentUser && currentTab === 'lost' && document.getElementById('itemsGrid')) {
                if (appConfig.app_debug) console.log(`Rendering items for tab: ${currentTab}`);
                // Only render if the grid is visible (main page is shown)
                const mainContent = document.querySelector('main.main-content');
                if (mainContent && mainContent.offsetParent !== null) {
                    renderItems();
                    logPerformance('Items Rendered');
                }
            }
        }, 300);

        // Final status
        setTimeout(() => {
            if (appConfig.app_debug) {
                console.log('APP FULLY LOADED');
                console.log(`Items in system: ${items.length}`);
                console.log(`Current user: ${currentUser ? currentUser.name + ' (' + currentUser.role + ')' : 'None'}`);
                console.log(`Firebase ready: ${isFirebaseReady() ? 'YES' : 'NO'}`);
            }
            logPerformance('App Fully Ready');
        }, 200);
    } catch (error) {
        console.error('App initialization error:', error);
        showToast('Failed to initialize app. Please refresh the page.', 'error');
    }
});

// Load Data from LocalStorage
function loadMockData() {
    // Load users from localStorage
    users = JSON.parse(localStorage.getItem('users')) || [];

    // Initialize login tracking for loaded users
    users = users.map(u => ({
        ...u,
        loginHistory: u.loginHistory || [],
        lastLogin: u.lastLogin || null
    }));

    // Load items from localStorage
    let storedItems = localStorage.getItem('items');
    if (storedItems) {
        try {
            items = JSON.parse(storedItems);
            // Ensure it's a valid array
            if (!Array.isArray(items)) {
                items = [];
            }
        } catch (e) {
            console.error('Error parsing items from localStorage:', e);
            items = [];
        }
    } else {
        items = [];
    }

    messages = JSON.parse(localStorage.getItem('messages')) || [];
    notifications = JSON.parse(localStorage.getItem('notifications')) || [];
    deletedItems = JSON.parse(localStorage.getItem('deletedItems')) || [];

    // Save complete data to localStorage
    localStorage.setItem('users', JSON.stringify(users));
    localStorage.setItem('items', JSON.stringify(items));
    localStorage.setItem('notifications', JSON.stringify(notifications));
    localStorage.setItem('messages', JSON.stringify(messages));
    localStorage.setItem('deletedItems', JSON.stringify(deletedItems));
}

// Setup Event Listeners
function setupEventListeners() {
    // Login form
    const loginFormEl = document.getElementById('loginForm');
    if (loginFormEl) loginFormEl.addEventListener('submit', handleLogin);

    // Signup form
    const signupFormEl = document.getElementById('signupForm');
    if (signupFormEl) signupFormEl.addEventListener('submit', handleSignup);

    // Report form
    const reportFormEl = document.getElementById('reportForm');
    if (reportFormEl) reportFormEl.addEventListener('submit', handleReportSubmit);

    // Edit form
    const editFormEl = document.getElementById('editForm');
    if (editFormEl) editFormEl.addEventListener('submit', handleEditSubmit);

    // Search with debouncing (prevents excessive re-renders on every keystroke)
    const searchInputEl = document.getElementById('searchInput');
    if (searchInputEl) {
        // Use 150ms debounce for faster, more responsive search
        searchInputEl.addEventListener('input', () => {
            console.log('🔍 Search input detected, triggering render...');
            debouncedRender(150);
        });
    }

    // Photo preview
    const itemPhotoEl = document.getElementById('itemPhoto');
    if (itemPhotoEl) itemPhotoEl.addEventListener('change', handlePhotoPreview);

    // Edit Profile Form
    const editProfileFormEl = document.getElementById('editProfileForm');
    if (editProfileFormEl) {
        editProfileFormEl.addEventListener('submit', handleEditProfileSubmit);
    }

    // Change Password Form - HANDLED VIA HTML ONSUBMIT (don't duplicate listener)
    // Form element: <form id="changePasswordForm" onsubmit="handleChangePassword(event)">
    // Password input listener for real-time strength display
    const newPasswordEl = document.getElementById('newPassword');
    if (newPasswordEl) {
        newPasswordEl.addEventListener('input', updatePasswordStrength);
    }

    // Admin resolved items search and filter
    const adminResolvedSearchEl = document.getElementById('adminResolvedSearch');
    if (adminResolvedSearchEl) adminResolvedSearchEl.addEventListener('input', loadAdminResolvedItems);

    const adminResolvedStatusFilterEl = document.getElementById('adminResolvedStatusFilter');
    if (adminResolvedStatusFilterEl) adminResolvedStatusFilterEl.addEventListener('change', loadAdminResolvedItems);

    // Admin items search and filter
    const adminItemSearchEl = document.getElementById('adminItemSearch');
    if (adminItemSearchEl) adminItemSearchEl.addEventListener('input', loadAdminItems);

    const adminItemStatusFilterEl = document.getElementById('adminItemStatusFilter');
    if (adminItemStatusFilterEl) adminItemStatusFilterEl.addEventListener('change', loadAdminItems);

    const adminItemResolvedFilterEl = document.getElementById('adminItemResolvedFilter');
    if (adminItemResolvedFilterEl) adminItemResolvedFilterEl.addEventListener('change', loadAdminItems);

    // Support form
    const supportFormEl = document.getElementById('supportForm');
    if (supportFormEl) supportFormEl.addEventListener('submit', handleSupportSubmit);

    // Close modals on outside click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                modal.classList.remove('active');
            }
        });
    });

    // Initialize calendar and notifications
    if (typeof initializeCalendar === 'function') {
        try {
            initializeCalendar();
        } catch (e) {
            if (appConfig.app_debug) console.warn('Calendar initialization warning:', e.message);
        }
    }

    // Request notification permissions
    if (typeof requestNotificationPermission === 'function') {
        setTimeout(() => {
            try {
                requestNotificationPermission();
            } catch (e) {
                if (appConfig.app_debug) console.warn('Notification permission request failed');
            }
        }, 3000);
    }
}

// DEVELOPMENT UTILITY: Reset system to factory defaults
function resetSystem() {
    if (!confirm('Are you sure you want to reset the system? This cannot be undone.')) {
        return;
    }
    try {
        localStorage.clear();
        sessionStorage.clear();
        if (appConfig.app_debug) console.log('System reset complete');
        location.reload();
    } catch (e) {
        console.error('Error resetting system:', e.message);
        showToast('Failed to reset system. Please clear browser storage manually.', 'error');
    }
}
