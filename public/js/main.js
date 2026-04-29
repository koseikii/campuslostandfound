// ========== MAIN INITIALIZATION & SETUP ==========

// Global Configuration
let appConfig = {
    app_url: window.location.origin,
    app_env: 'development',
    app_debug: true,
    useFirebase: true
};

console.log('🚀 App initializing with Firebase backend...');

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
    try {
        emailjs.init('YOUR_EMAILJS_PUBLIC_KEY');
    } catch (e) {
        console.log('EmailJS initialization skipped - configure YOUR_EMAILJS_PUBLIC_KEY to enable email sending');
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
    console.table(performanceMetrics.logs);
    const totalTime = performanceMetrics.logs[performanceMetrics.logs.length - 1].time;
    console.log(`⏱️ Total initialization time: ${totalTime.toFixed(2)}ms`);
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
    console.log('🔄 App Starting with Firebase Backend...');
    console.log('📱 Browser:', navigator.userAgent.substring(0, 50) + '...');
    console.log('⏰ Timestamp:', new Date().toLocaleString());

    try {
        // Initialize Firebase directly first
        console.log('🔐 Starting Firebase initialization...');
        let firebaseInitialized = false;

        if (typeof initializeFirebase === 'function') {
            firebaseInitialized = await initializeFirebase();
            console.log(`   Firebase Direct Init: ${firebaseInitialized ? '✅ Success' : '❌ Failed'}`);
        }

        // Initialize Firebase services (wrapper)
        console.log('🔐 Initializing Firebase Services...');
        const firebaseReady = await initializeFirebaseServices();
        logPerformance('Firebase Initialized');

        if (!firebaseReady) {
            console.warn('⚠️ Firebase not fully ready. App will work with mock data.');
            console.warn('💡 To enable real Firebase: Create Firestore Database and Cloud Storage in Firebase Console, then reload.');
        } else {
            console.log('✅ Firebase services ready');

            // Initialize default collections
            if (typeof initializeDefaultCollections === 'function') {
                console.log('📦 Initializing default collections...');
                await initializeDefaultCollections();
                logPerformance('Default Collections Initialized');
            }
        }

        // Load mock data as fallback (always load for testing)
        loadMockData();
        logPerformance('Mock Data Loaded');
        console.log(`✅ Fallback mock data loaded. Items: ${items.length}, Users: ${users.length}`);

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
                console.log(`🔂 Rendering items for tab: ${currentTab}`);
                // Only render if the grid is visible (main page is shown)
                const mainContent = document.querySelector('main.main-content');
                if (mainContent && mainContent.offsetParent !== null) {
                    renderItems();
                    logPerformance('Items Rendered');
                } else {
                    console.log('⏸️ Items not rendered - page not visible');
                }
            }
        }, 300);

        // Final status
        setTimeout(() => {
            console.log('✨ ========== APP FULLY LOADED ==========');
            console.log(`   Items in system: ${items.length}`);
            console.log(`   Current user: ${currentUser ? currentUser.name + ' (' + currentUser.role + ')' : 'None'}`);
            console.log(`   Current tab: ${currentTab}`);
            console.log(`   Firebase ready: ${isFirebaseReady() ? 'YES ✅' : 'NO ❌'}`);
            console.log('✨ =====================================');
            logPerformance('App Fully Ready');
        }, 200);
    } catch (error) {
        console.error('❌ App initialization error:', error);
        showToast('Failed to initialize app. Please refresh the page.', 'error');
    }
});

// Load Mock Data - ENSURES ITEMS ARE ALWAYS AVAILABLE
function loadMockData() {
    console.log('📦 loadMockData started...');

    // Default items array (always have backup items)
    const defaultItems = [
        {
            id: 1,
            title: "Black iPhone 13 Pro",
            category: "electronics",
            description: "Lost near the library on the second floor. Black case with a small scratch on the back.",
            location: "Main Library - 2nd Floor",
            date: "2026-03-28",
            status: "lost",
            image: "https://images.unsplash.com/photo-1632661674596-df8be070a5c5?w=400",
            userId: 1,
            userName: "John Student",
            matched: false,
            resolved: false,
            createdAt: new Date("2026-03-28").getTime()
        },
        {
            id: 2,
            title: "Red North Face Jacket",
            category: "clothing",
            description: "Lost my red North Face jacket in the gym locker room. Size M.",
            location: "Sports Complex - Locker Room",
            date: "2026-03-25",
            status: "lost",
            image: "https://images.unsplash.com/photo-1551028719-00167b16ebc5?w=400",
            userId: 2,
            userName: "Joana Reyes",
            matched: false,
            resolved: false,
            createdAt: new Date("2026-03-25").getTime()
        },
        {
            id: 3,
            title: "Blue Backpack with Notebooks",
            category: "bags",
            description: "Found a blue Nike backpack near the student cafeteria. Contains class notes and books.",
            location: "Student Cafeteria",
            date: "2026-03-29",
            status: "found",
            image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400",
            userId: 3,
            userName: "Dianne Guiritan",
            matched: false,
            resolved: false,
            createdAt: new Date("2026-03-29").getTime()
        },
        {
            id: 4,
            title: "Set of Dorm Keys",
            category: "keys",
            description: "Lost a keychain with 3 keys and a small teddy bear charm.",
            location: "Basketball Court",
            date: "2026-03-30",
            status: "lost",
            image: "https://images.unsplash.com/photo-1612528443702-f6741f271a1f?w=400",
            userId: 4,
            userName: "Nilou jay Fernandez",
            matched: false,
            resolved: false,
            createdAt: new Date("2026-03-30").getTime()
        },
        {
            id: 5,
            title: "Silver Wristwatch",
            category: "accessories",
            description: "Lost my silver wristwatch near the biology lab. It's a Timex with black leather strap.",
            location: "Science Building - Biology Lab",
            date: "2026-03-24",
            status: "lost",
            image: "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=400",
            userId: 5,
            userName: "Christopher Villahermosa",
            matched: false,
            resolved: false,
            createdAt: new Date("2026-03-24").getTime()
        },

        {
            id: 6,
            title: "Black Wireless Earbuds",
            category: "electronics",
            description: "Lost my black Sony earbuds in the parking lot. Comes with charging case.",
            location: "Campus Parking Lot",
            date: "2026-03-26",
            status: "lost",
            image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400",
            userId: 1,
            userName: "John Student",
            matched: false,
            resolved: false,
            createdAt: new Date("2026-03-26").getTime()
        },
        {
            id: 7,
            title: "Red Lip Tint Palette",
            category: "accessories",
            description: "Found a makeup lip tint palette near the entrance of the student center.",
            location: "Student Center - Main Entrance",
            date: "2026-04-01",
            status: "found",
            image: "https://images.unsplash.com/photo-1586965013613-d2e5edb95a6e?w=400",
            userId: 5,
            userName: "Christopher Villahermosa",
            matched: false,
            resolved: false,
            createdAt: new Date("2026-04-01").getTime()
        },
        {
            id: 8,
            title: "Medical Anatomy Journal",
            category: "books",
            description: "Lost my medical anatomy journal notes near the health center. Important for midterm.",
            location: "Health Center",
            date: "2026-03-27",
            status: "lost",
            image: "https://images.unsplash.com/photo-1507842217343-583f7270bfba?w=400",
            userId: 3,
            userName: "Dianne Guiritan",
            matched: false,
            resolved: false,
            createdAt: new Date("2026-03-27").getTime()
        },
        {
            id: 9,
            title: "Brown Leather Wallet",
            category: "accessories",
            description: "Found a brown leather wallet with student ID near the bus stop.",
            location: "Bus Stop - Campus Gate",
            date: "2026-04-02",
            status: "found",
            image: "https://images.unsplash.com/photo-1612778149891-81a44d3b88ca?w=400",
            userId: 4,
            userName: "Nilou jay Fernandez",
            matched: false,
            resolved: false,
            createdAt: new Date("2026-04-02").getTime()
        },
        {
            id: 10,
            title: "Green Canvas Laptop Bag",
            category: "bags",
            description: "Lost my green canvas laptop bag with multiple pockets. Has important class notes inside.",
            location: "Student Library - Study Area",
            date: "2026-03-31",
            status: "lost",
            image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400",
            userId: 2,
            userName: "Joana Reyes",
            matched: false,
            resolved: false,
            createdAt: new Date("2026-03-31").getTime()
        }
    ];

    // Load users
    users = JSON.parse(localStorage.getItem('users')) || [
        { id: 0, name: "Admin", email: "admin@campus.edu", password: "admin123", role: "admin", phone: "555-0000", emailNotifications: true, loginHistory: [], lastLogin: null },
        { id: 1, name: "John Student", email: "student@campus.edu", password: "student123", role: "student", phone: "555-0101", emailNotifications: true, loginHistory: [], lastLogin: null },
        { id: 2, name: "Joana Reyes", email: "joana@campus.edu", password: "teacher123", role: "teacher", phone: "555-0102", emailNotifications: true, loginHistory: [], lastLogin: null },
        { id: 3, name: "Dianne Guiritan", email: "dianne@campus.edu", password: "teacher123", role: "teacher", phone: "555-0103", emailNotifications: true, loginHistory: [], lastLogin: null },
        { id: 4, name: "Nilou jay Fernandez", email: "nilou@campus.edu", password: "teacher123", role: "teacher", phone: "555-0104", emailNotifications: true, loginHistory: [], lastLogin: null },
        { id: 5, name: "Christopher Villahermosa", email: "christopher@campus.edu", password: "teacher123", role: "teacher", phone: "555-0105", emailNotifications: true, loginHistory: [], lastLogin: null }
    ];

    messages = JSON.parse(localStorage.getItem('messages')) || [];

    // Ensure admin account exists
    if (!users.find(u => u.role === 'admin')) {
        users.unshift({ id: 0, name: "Admin", email: "admin@campus.edu", password: "admin123", role: "admin", phone: "555-0000", emailNotifications: true, loginHistory: [], lastLogin: null });
    }

    // Initialize login tracking
    users = users.map(u => ({
        ...u,
        loginHistory: u.loginHistory || [],
        lastLogin: u.lastLogin || null
    }));

    // Load items - ALWAYS use default items if localStorage is empty or invalid
    let storedItems = localStorage.getItem('items');
    if (storedItems) {
        try {
            items = JSON.parse(storedItems);
            // Validate items array
            if (!Array.isArray(items) || items.length === 0) {
                items = defaultItems;
            }
        } catch (e) {
            console.error('Error parsing items from localStorage:', e);
            items = defaultItems;
        }
    } else {
        items = defaultItems;
    }

    notifications = JSON.parse(localStorage.getItem('notifications')) || [];
    deletedItems = JSON.parse(localStorage.getItem('deletedItems')) || [];

    // Always save complete data to localStorage
    localStorage.setItem('users', JSON.stringify(users));
    localStorage.setItem('items', JSON.stringify(items));
    localStorage.setItem('notifications', JSON.stringify(notifications));
    localStorage.setItem('messages', JSON.stringify(messages));
    localStorage.setItem('deletedItems', JSON.stringify(deletedItems));

    console.log(`✅ loadMockData complete:`);
    console.log(`   📦 Items loaded: ${items.length}`);
    console.log(`   👥 Users loaded: ${users.length}`);
    console.log(`   First item: ${items[0] ? items[0].title : 'NONE'}`);
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
        initializeCalendar();
    }

    // Request notification permissions
    if (typeof requestNotificationPermission === 'function') {
        setTimeout(() => requestNotificationPermission(), 3000);
    }

    console.log('✅ All event listeners attached');
}

// DEVELOPMENT UTILITY: Reset system to factory defaults
function resetSystem() {
    console.log('🔄 Resetting system to factory defaults...');
    localStorage.clear();
    sessionStorage.clear();
    console.log('✅ LocalStorage cleared');
    location.reload();
}
